import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  SetMetadata,
  UseGuards,
} from '@nestjs/common'
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import {
  PilotAutocompleteObjectType,
  PlayerCharacterMasteryObjectType,
  PlayerCharacterRatingObjectType,
  PlayerInputType,
  PlayerMasteryObjectType,
  PlayerObjectType,
  PlayerRatingObjectType,
} from './player.types'
import { PrismaService } from 'src/prisma.service'
import { Gamemode, Player } from '@prisma/client'
import { UserObjectType } from 'src/users/user.types'
import { StrikrGuard } from 'src/auth/auth.guard'
import dayjs from 'dayjs'
import { PlayerService } from './player.service'
import { UtilsService } from 'src/utils/utils.service'
import { prometheusService } from 'src/odyssey/prometheus/service'
import { PROMETHEUS } from '@types'

@Resolver(() => PlayerObjectType)
@Injectable()
export class PlayerResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly service: PlayerService,
    private readonly utils: UtilsService,
  ) {}

  @Query(() => PlayerObjectType)
  async getPlayer(
    @Args('id', { type: () => String, nullable: false })
    id: string,
  ) {
    return await this.prisma.player.findUnique({
      where: {
        id,
      },
    })
  }

  @Query(() => [PlayerObjectType], {
    description:
      'Returns registered players from strikr. This means that got searched at least once in history.',
  })
  async getPlayers(
    @Args('region', {
      type: () => String,
      nullable: true,
      description: 'Filter by region',
    })
    region: string,
    @Args('page', {
      type: () => Number,
      nullable: true,
      description: 'Page number',
    })
    page: number,
    @Args('limit', {
      type: () => Number,
      nullable: true,
      description: 'Limit of players per page (max of 25, defaults to 10)',
    })
    limit = 10,
  ) {
    if (limit > 25) {
      limit = 25
    }
    return await this.prisma.player.findMany({
      ...(region ? { where: { region } } : {}),
      take: limit,
      skip: page ? (page - 1) * limit : 0,
    })
  }

  @Query(() => PlayerObjectType, {
    description:
      'Returns the playe based on its provided name. Creates a new player if none is found.',
  })
  async getPlayerByName(
    @Args('name', { type: () => String, nullable: true })
    name: string,
  ) {
    return await this.prisma.player.findUnique({
      where: {
        username: name.toLocaleLowerCase(),
      },
    })
  }

  @Query(() => PlayerObjectType, {
    description:
      'If the player already exists on database, calculates the ΔT of the latest snapshot and the current time. If the ΔT is from "yesterday",  strikr will create a new snapshot for "Today" otherwise it will just update today\'s snapshot. (ratings: limited to last 7) (CharacterRatings: limited to last 1 per character) WARNING: THIS ENDPOINT WILL BE PROTECTED UNDER TOKEN IN THE NEAR FUTURE, BUT FOR NOW IT IS OPEN TO THE PUBLIC - I WOULD BE GLAD TO HAND OUT KEYS WHEN THE AUTHENTICATION ROLLS OUT!.',
  })
  async ensurePlayer(
    @Args('name', { type: () => String, nullable: false }) name: string,

    @Args('refresh', {
      type: () => Boolean,
      nullable: true,
      description:
        'If refresh is not set, or set to false we will return the cached Player directly ensurePlayer returns only last 7 snapshots of rating & character Ratings. TL;DR: You want a lot of data? use getPlayerRatings & getPlayerCharacterRatings, you want small sample of data or need to update the player data? use ensurePlayer with refresh set to true. Do you want to display the same sample of data but having the latest data is not priority but querying WAY FASTER is good for you? use ensurePlayer with refresh set to false. (Even when set to false if a player is not found on database, strikr will create a new player and return it)',
    })
    refresh: boolean,
    @Args('region', {
      type: () => String,
      nullable: true,
      description:
        // eslint-disable-next-line prettier/prettier
        'Region overrider for the player. Strikr seeks for players on all regions and returns the first result on the first region it finds. Some players plays or played at more than one region. Providing the region overrider will force strikr to only look into the provided region. Giving overrider will make the player region be changed to the overriden one (unless the player can\'t be found on said region leaderboard)',
    })
    region: string,
  ) {
    const ensureLogger = new Logger('PlayerEnsuring')
    ensureLogger.debug(
      `Ensuring for player ${decodeURI(
        name.toLowerCase(),
      )} with refresh ${refresh} & region ${region}`,
    )
    // We do get the cachedPlayer, but we do not return him by himself because we need to check if he needs to be updated.
    // If he needs to be updated, we will return the updated player based on the cachedPlayerData instead of making multiple odyssey requests.
    const cachedPlayer = await this.prisma.player.findUnique({
      where: {
        username: decodeURI(name.toLowerCase()),
      },
      include: {
        characterRatings: {
          take: 300,
          orderBy: {
            createdAt: 'desc',
          },
        },
        ratings: {
          take: 30,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    ensureLogger.debug(
      `Found Cached player: ${cachedPlayer?.createdAt} (${decodeURI(
        cachedPlayer?.username,
      )}) with ${cachedPlayer.ratings.length} Rating snapshots`,
    )

    if (!refresh && cachedPlayer) {
      ensureLogger.log(
        'Returning cached player | Reason: refresh is false with existing cache',
      )
      return {
        ...cachedPlayer,
        ratings: null,
      }
    }

    const cachedPlayerRatings = cachedPlayer?.ratings

    const cachedPlayerCharacterRatings = cachedPlayer?.characterRatings

    const odysseyPlayer = await prometheusService.player.usernameQuery(
      decodeURI(name),
    )

    if (!odysseyPlayer) {
      throw new HttpException(
        'Player not found on odyssey.',
        HttpStatus.NOT_FOUND,
      )
    }

    const playerMastery = await prometheusService.mastery.player(
      cachedPlayer?.id || odysseyPlayer.playerId,
    )

    const ignoreUpdates =
      cachedPlayer &&
      playerMastery.currentLevelXp === cachedPlayer.currentXp &&
      playerMastery.currentLevel === cachedPlayerRatings[0]?.masteryLevel

    ensureLogger.debug(`Ignore updates? ${ignoreUpdates} (${name})`)
    // The odyssey API changed or returned unexpected player data.
    // The data now mismatches the cached player.
    // This should never happen, but if it does, we need to know about it.
    if (cachedPlayer && odysseyPlayer.playerId !== cachedPlayer.id) {
      throw new HttpException(
        'Player ID mismatch. Please contact an administrator.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

    // Check the chached player.
    // He must exist and have the folowing in order to create a new snapshop:
    // 1. Two character ratings.
    // 2. Two ratings.
    // 3. The last sample of rating must be from the previous day, even if midnight + 1 minute.

    const forceSnapshotCreation = cachedPlayer
      ? cachedPlayerRatings.length < 1 ||
        this.utils.areDifferentDays(
          dayjs(cachedPlayerRatings[0].createdAt).toISOString(),
          dayjs().toISOString(),
        )
      : false

    ensureLogger.debug(
      `Force snapshot creation? ${forceSnapshotCreation} (${name})`,
    )

    if (ignoreUpdates) {
      ensureLogger.log(
        'Ignoring updates | Reason: players XP is the same as the cached player (ingoreUpdates = true)',
      )
      // The player haven't played the game since the last snapshot.
      // We will update the last snapshot's createdAt date to today.
      // This will ensure the player is not updated again until he plays the game.

      this.prisma.playerCharacterRating.updateMany({
        where: {
          createdAt: cachedPlayerCharacterRatings[0].createdAt,
          playerId: cachedPlayer.id,
        },
        data: {
          createdAt: dayjs().toISOString(),
        },
      })

      await this.prisma.player.update({
        data: {
          updatedAt: new Date().toISOString(),
          ratings: {
            update: {
              data: {
                createdAt: dayjs().toISOString(),
              },
              where: {
                id: cachedPlayerRatings[0].id,
              },
            },
          },
        },
        where: {
          id: odysseyPlayer.playerId,
        },
      })

      return {
        ...cachedPlayer,
        ratings: undefined,
      }
    }

    const ensuredRegion =
      await prometheusService.ranked.leaderboard.ensureRegion(
        odysseyPlayer.playerId,
        region || (cachedPlayer?.region as PROMETHEUS.RAW.Regions) || undefined,
      )
    ensureLogger.debug(
      `Ensured region: ${ensuredRegion?.region} (${decodeURI(name)})`,
    )
    const playerStats = await prometheusService.stats.player(
      odysseyPlayer.playerId,
    )

    ensureLogger.debug(`Obtained player stats (${name})`)

    if (!cachedPlayer && !odysseyPlayer) {
      throw new HttpException(
        'Player not found on game. Please contact an administrator.',
        HttpStatus.NOT_FOUND,
      )
    }

    if (!cachedPlayer) {
      ensureLogger.debug(
        `Creating new player (${name}) (Did not exist) (Updates nickanme if changed)`,
      )
      const createdPlayer = await this.prisma.player.upsert({
        where: {
          id: odysseyPlayer.playerId,
        },
        update: {
          username: odysseyPlayer.username.toLocaleLowerCase(),
        },
        create: {
          id: odysseyPlayer.playerId,
          username: odysseyPlayer.username.toLocaleLowerCase(),
          region: ensuredRegion?.region || 'Global',
          emoticonId: odysseyPlayer.emoticonId,
          logoId: odysseyPlayer.logoId,
          titleId: odysseyPlayer.titleId,
          nameplateId: odysseyPlayer.nameplateId,
          socialUrl: odysseyPlayer.socialUrl,
          tags: odysseyPlayer.tags,
          characterRatings: {
            createMany: {
              data: [
                ...playerStats.characterStats.map((cs) => {
                  if (cs.ratingName === 'None') {
                    return
                  }
                  return {
                    character: cs.characterId,
                    wins: cs.roleStats.Forward.wins,
                    losses: cs.roleStats.Forward.losses,
                    knockouts: cs.roleStats.Forward.knockouts,
                    scores: cs.roleStats.Forward.scores,
                    mvp: cs.roleStats.Forward.mvp,
                    role: 'Forward',
                    saves: cs.roleStats.Forward.saves,
                    assists: cs.roleStats.Forward.assists,
                    games: cs.roleStats.Forward.games,
                    gamemode: cs.ratingName as Gamemode,
                  }
                }),
                ...playerStats.characterStats.map((cs) => {
                  if (cs.ratingName === 'None') {
                    return
                  }
                  return {
                    character: cs.characterId,
                    wins: cs.roleStats.Goalie.wins,
                    losses: cs.roleStats.Goalie.losses,
                    knockouts: cs.roleStats.Goalie.knockouts,
                    scores: cs.roleStats.Goalie.scores,
                    mvp: cs.roleStats.Goalie.mvp,
                    role: 'Goalie',
                    saves: cs.roleStats.Goalie.saves,
                    assists: cs.roleStats.Goalie.assists,
                    games: cs.roleStats.Goalie.games,
                    gamemode: cs.ratingName as Gamemode,
                  }
                }),
              ],
            },
          },
          ratings: {
            create: {
              games:
                ensuredRegion?.player.games ||
                playerStats?.playerStats
                  .filter((s) => s.ratingName === 'RankedInitial')
                  .map(
                    (s) => s.roleStats.Forward.games + s.roleStats.Goalie.games,
                  )
                  .reduce((a, b) => a + b, 0) ||
                0,
              losses:
                ensuredRegion?.player.losses ||
                playerStats?.playerStats
                  .filter((s) => s.ratingName === 'RankedInitial')
                  .map(
                    (s) =>
                      s.roleStats.Forward.losses + s.roleStats.Goalie.losses,
                  )
                  .reduce((a, b) => a + b, 0) ||
                0,
              rank: ensuredRegion?.player.rank || 10_001,
              rating: ensuredRegion?.player.rating,
              wins:
                ensuredRegion?.player.wins ||
                playerStats?.playerStats
                  .filter((s) => s.ratingName === 'RankedInitial')
                  .map(
                    (s) => s.roleStats.Forward.wins + s.roleStats.Goalie.wins,
                  )
                  .reduce((a, b) => a + b, 0) ||
                0,
              masteryLevel:
                ensuredRegion?.player.masteryLevel ||
                odysseyPlayer.masteryLevel ||
                0,
            },
          },
        },
      })

      return createdPlayer
    }

    if (forceSnapshotCreation) {
      ensureLogger.debug(`Creating new snapshot for player (${name}) (Forced)`)
      const odysseyPlayerMastery = await prometheusService.mastery.player(
        odysseyPlayer.playerId,
      )

      const updatedPlayer = await this.prisma.player.update({
        where: {
          id: cachedPlayer.id,
        },
        data: {
          currentXp: odysseyPlayerMastery.currentLevelXp,
          emoticonId: odysseyPlayer.emoticonId,
          logoId: odysseyPlayer.logoId,
          titleId: odysseyPlayer.titleId,
          nameplateId: odysseyPlayer.nameplateId,
          socialUrl: odysseyPlayer.socialUrl,
          tags: odysseyPlayer.tags,
        },
      })

      await this.prisma.playerRating.create({
        data: {
          player: {
            connect: {
              id: cachedPlayer.id,
            },
          },
          games: ensuredRegion?.player.games || 0,
          losses: ensuredRegion?.player.losses || 0,
          rank: ensuredRegion?.player.rank || 0,
          rating: ensuredRegion?.player.rating || 0,
          wins: ensuredRegion?.player.wins || 0,
          masteryLevel: ensuredRegion?.player.masteryLevel || 0,
        },
      })

      if (playerStats && playerStats.playerStats) {
        ensureLogger.debug(
          `Creating new player stats for player (${name}) (Forced)`,
        )
        await this.prisma.playerCharacterRating.createMany({
          data: [
            ...playerStats.characterStats.map((cs) => {
              return {
                character: cs.characterId,
                wins: cs.roleStats.Forward.wins,
                losses: cs.roleStats.Forward.losses,
                knockouts: cs.roleStats.Forward.knockouts,
                scores: cs.roleStats.Forward.scores,
                mvp: cs.roleStats.Forward.mvp,
                role: 'Forward',
                saves: cs.roleStats.Forward.saves,
                assists: cs.roleStats.Forward.assists,
                games: cs.roleStats.Forward.games,
                gamemode: cs.ratingName as Gamemode,
                playerId: odysseyPlayer.playerId,
              }
            }),
            ...playerStats.characterStats.map((cs) => {
              return {
                character: cs.characterId,
                wins: cs.roleStats.Goalie.wins,
                losses: cs.roleStats.Goalie.losses,
                knockouts: cs.roleStats.Goalie.knockouts,
                scores: cs.roleStats.Goalie.scores,
                mvp: cs.roleStats.Goalie.mvp,
                role: 'Goalie',
                saves: cs.roleStats.Goalie.saves,
                assists: cs.roleStats.Goalie.assists,
                games: cs.roleStats.Goalie.games,
                gamemode: cs.ratingName as Gamemode,
                playerId: odysseyPlayer.playerId,
              }
            }),
          ],
        })
      }

      return updatedPlayer
    }

    await this.prisma.playerRating.update({
      data: {
        games:
          ensuredRegion?.player.games ||
          playerStats?.playerStats
            .filter((s) => s.ratingName === 'RankedInitial')
            .map((s) => s.roleStats.Forward.games + s.roleStats.Goalie.games)
            .reduce((a, b) => a + b, 0) ||
          0,
        losses:
          ensuredRegion?.player.losses ||
          playerStats?.playerStats
            .filter((s) => s.ratingName === 'RankedInitial')
            .map((s) => s.roleStats.Forward.losses + s.roleStats.Goalie.losses)
            .reduce((a, b) => a + b, 0) ||
          0,
        rank: ensuredRegion?.player.rank || 10_001,
        rating: ensuredRegion?.player.rating || 0,
        wins:
          ensuredRegion?.player.wins ||
          playerStats?.playerStats
            .filter((s) => s.ratingName === 'RankedInitial')
            .map((s) => s.roleStats.Forward.wins + s.roleStats.Goalie.wins)
            .reduce((a, b) => a + b, 0) ||
          0,
        masteryLevel:
          ensuredRegion?.player.masteryLevel || odysseyPlayer.masteryLevel || 0,
        createdAt: dayjs().toISOString(),
      },
      where: {
        id: cachedPlayerRatings[0].id,
      },
    })

    const playerCharacterRatingsInsertionData = playerStats.characterStats.map(
      (characterStat) => {
        return {
          Forward: {
            createdAt: dayjs().toISOString(),
            games: characterStat.roleStats.Forward.games,
            losses: characterStat.roleStats.Forward.losses,
            assists: characterStat.roleStats.Forward.assists,
            character: characterStat.characterId,
            gamemode: characterStat.ratingName as Gamemode,
            knockouts: characterStat.roleStats.Forward.knockouts,
            mvp: characterStat.roleStats.Forward.mvp,
            role: 'Forward',
            saves: characterStat.roleStats.Forward.saves,
            scores: characterStat.roleStats.Forward.scores,
            wins: characterStat.roleStats.Forward.wins,
            playerId: odysseyPlayer.playerId,
          },
          Goalie: {
            createdAt: dayjs().toISOString(),
            games: characterStat.roleStats.Goalie.games,
            losses: characterStat.roleStats.Goalie.losses,
            assists: characterStat.roleStats.Goalie.assists,
            character: characterStat.characterId,
            gamemode: characterStat.ratingName as Gamemode,
            knockouts: characterStat.roleStats.Goalie.knockouts,
            mvp: characterStat.roleStats.Goalie.mvp,
            role: 'Goalie',
            saves: characterStat.roleStats.Goalie.saves,
            scores: characterStat.roleStats.Goalie.scores,
            wins: characterStat.roleStats.Goalie.wins,
            playerId: odysseyPlayer.playerId,
          },
        }
      },
    )

    ensureLogger.debug(
      `Updating player (${name}) character stats (Total of ${playerCharacterRatingsInsertionData.length} Entries)`,
    )

    await this.prisma.playerCharacterRating.createMany({
      data: [
        ...playerCharacterRatingsInsertionData.map((d) => d.Forward),
        ...playerCharacterRatingsInsertionData.map((d) => d.Goalie),
      ],
    })

    return await this.prisma.player.update({
      data: {
        tags: odysseyPlayer.tags,
        username: odysseyPlayer.username.toLocaleLowerCase(),
        emoticonId: odysseyPlayer.emoticonId,
        nameplateId: odysseyPlayer.nameplateId,
        socialUrl: odysseyPlayer.socialUrl,
        logoId: odysseyPlayer.logoId,
        region: ensuredRegion?.region || 'Global',
        titleId: odysseyPlayer.titleId,
        updatedAt: dayjs().toISOString(),
      },
      where: {
        id: odysseyPlayer.playerId,
      },
    })
  }

  @Query(() => PilotAutocompleteObjectType, {
    description:
      'Get a list of pilots for autocomplete. This searchs directly to the search engine instead of database.  This will be used for the search bar (BUG NOTICE: This endpoint relies on MeilliSearch which is not completely implemented yet. it should returns in up to 2ms with max amount on query) but might fail to returns at that time or return anything in reality).',
  })
  async getPilotsAutoComplete() {
    return await this.prisma.player.findMany({
      select: {
        emoticonId: true,
        tags: true,
        region: true,
        username: true,
      },
    })
  }

  @UseGuards(StrikrGuard)
  @SetMetadata('staffOnly', true)
  @Mutation(() => PlayerObjectType, {
    description: 'Create a new player [Requires StrikrToken @ Admin level]',
  })
  async createPlayer(
    @Args('PlayerCreateInput', {
      type: () => PlayerInputType,
      nullable: false,
    })
    playerCreateInput: Player,
  ) {
    return await this.prisma.player.create({
      data: {
        ...playerCreateInput,
      },
    })
  }

  @ResolveField(() => PlayerMasteryObjectType, {
    nullable: true,
    description:
      'Queries the player mastery from game data. We do not store snapshots of leveling [GAME PROXY WARNING: Endpoints proxying requests to game data will be using your IP. If you get rate limited there it is imposed by Odyssey itself and not by Strikr.]',
  })
  async mastery(@Parent() player: PlayerObjectType) {
    try {
      return await prometheusService.mastery.player(player.id)
    } catch (e) {
      return {}
    }
  }

  @ResolveField(() => PlayerCharacterMasteryObjectType, {
    nullable: true,
    description:
      'Returns character masteries from player directly from game data. we do not store leveling snapshots at all. Contact Nodge if you need masteries snapshots [GAME PROXY WARNING: Endpoints proxying requests to game data will be using your IP. If you get rate limited there it is imposed by Odyssey itself and not by Strikr.]',
  })
  async characterMastery(@Parent() player: PlayerObjectType) {
    try {
      return await prometheusService.mastery.character(player.id)
    } catch (e) {
      return {}
    }
  }

  @ResolveField(() => UserObjectType, { nullable: true })
  async user(@Parent() player: PlayerObjectType) {
    return await this.prisma.user.findUnique({
      where: {
        id: player.userId,
      },
    })
  }

  @ResolveField(() => PlayerRatingObjectType, {
    nullable: true,
    description:
      'Hard-coded to 30 snapshots. If you need mroe than that please contact Nodge for a solution.',
  })
  async ratings(@Parent() player: PlayerObjectType) {
    const ratings = await this.prisma.player
      .findUnique({
        where: {
          id: player.id,
        },
      })
      .ratings({
        take: 30,
      })

    console.log('Returning ratings', ratings)

    return ratings
  }

  @ResolveField(() => PlayerCharacterRatingObjectType, {
    nullable: true,
    description:
      'Hardcoded limit of 300. If you need more than that please contact Nodge for a solution.',
  })
  async characterRatings(@Parent() player: PlayerObjectType) {
    return await this.prisma.player
      .findUnique({
        where: {
          id: player.id,
        },
      })
      .characterRatings({
        orderBy: {
          createdAt: 'desc',
        },
        take: 300,
      })
  }
}
