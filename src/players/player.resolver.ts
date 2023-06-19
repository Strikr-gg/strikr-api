import {
  HttpException,
  HttpStatus,
  Injectable,
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
import prometheusRankedService from 'src/odyssey/prometheus/ranked'
import prometheusPlayerService from 'src/odyssey/prometheus/player'
import prometheusStatsService from 'src/odyssey/prometheus/stats'
import prometheusMasteryService from 'src/odyssey/prometheus/mastery'
import { StrikrGuard } from 'src/auth/auth.guard'
import dayjs from 'dayjs'
import { IpWhitelistGuard } from 'src/ip.guard'
import { PlayerService } from './player.service'
import { UtilsService } from 'src/utils/utils.service'
import player from 'src/odyssey/prometheus/player'

@Resolver(() => PlayerObjectType)
@Injectable()
export class PlayerResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly service: PlayerService,
    private readonly utils: UtilsService,
  ) {}

  // TODO: Whitelist Strikr website when it's available!
  // @UseGuards(IpWhitelistGuard)
  // @SetMetadata('ipWhitelist', [
  // '::ffff:172.245.142.218',
  //   '::ffff:127.0.0.1',
  //   '::ffff:179.106.175.51',
  //   '::ffff:96.92.68.150',
  // ])
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

  @UseGuards(IpWhitelistGuard)
  @SetMetadata('ipWhitelist', [
    '::ffff:172.245.142.218',
    '::ffff:127.0.0.1',
    '::ffff:179.106.175.51',
    '::ffff:96.92.68.150',
  ])
  @Query(() => [PlayerObjectType])
  async getPlayers() {
    return await this.prisma.player.findMany()
  }

  @UseGuards(IpWhitelistGuard)
  @SetMetadata('ipWhitelist', [
    '::ffff:172.245.142.218',
    '::ffff:127.0.0.1',
    '::ffff:179.106.175.51',
    '::ffff:96.92.68.150',
  ])
  @Query(() => PlayerObjectType)
  async getPlayerByName(
    @Args('name', { type: () => String, nullable: false })
    name: string,
  ) {
    return await this.prisma.player.findUnique({
      where: {
        username: name.toLocaleLowerCase(),
      },
    })
  }

  @UseGuards(IpWhitelistGuard)
  @SetMetadata('ipWhitelist', [
    '::ffff:172.245.142.218',
    '::ffff:127.0.0.1',
    '::ffff:179.106.175.51',
    '::ffff:96.92.68.150',
  ])
  @Query(() => PlayerObjectType, {
    description:
      'If the player already exists on database, calculates the ΔT of the latest snapshot and the current time. If the ΔT is from "yesterday",  strikr will create a new snapshot for "Today". ensure only one sample is stored per day.\nIf the player does not exists on database, it will create a new player allong with its ratings.',
  })
  async ensurePlayer(
    @Args('name', { type: () => String, nullable: false }) name: string,
    // If refresh is not set / set to false, we will return the cached player as is, making this function behaves exactly like getPlayerByName but with the ability to create a new player if none is found.
    @Args('refresh', {
      type: () => Boolean,
      nullable: true,
      description:
        'If refresh is not set, or set to false we will return the cached Player directly. Making this function work exactly like getPlayerByName / getPlayer but with the extra functionality of creating the player if it is missing on database',
    })
    refresh: boolean,
  ) {
    // We do get the cachedPlayer, but we do not return him by himself because we need to check if he needs to be updated.
    // If he needs to be updated, we will return the updated player based on the cachedPlayerData instead of making multiple odyssey requests.
    const cachedPlayer = await this.service.getPlayerByName(name.toLowerCase())
    const cachedPlayerRatings = await this.service.getPlayerRatings(
      cachedPlayer?.id,
    )
    const cachedPlayerCharacterRatings =
      await this.service.getLatestCharacterRatings(cachedPlayer?.id)

    if (!refresh && cachedPlayer) {
      return cachedPlayer
    }

    const odysseyPlayer = await prometheusPlayerService.queryPlayerByName(
      name.toLowerCase(),
    )

    const playerMastery = await prometheusMasteryService.getPlayerMastery(
      cachedPlayer?.id || odysseyPlayer.playerId,
    )

    const ignoreUpdates =
      cachedPlayer &&
      playerMastery.currentLevelXp === cachedPlayer.currentXp &&
      playerMastery.currentLevel === cachedPlayerRatings[0]?.masteryLevel

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

    if (ignoreUpdates) {
      // The player haven't played the game since the last snapshot.
      // We will update the last snapshot's createdAt date to today.
      // This will ensure the player is not updated again until he plays the game.
      cachedPlayerCharacterRatings.forEach(async (pcr) => {
        await this.prisma.playerCharacterRating.update({
          where: {
            id: pcr.id,
          },
          data: {
            createdAt: dayjs().toISOString(),
          },
        })
      })

      return this.prisma.player.update({
        data: {
          updatedAt: new Date(),
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
    }

    const ensuredRegion =
      await prometheusRankedService.ensurePlayerIsOnLeaderboard(
        odysseyPlayer.playerId,
        cachedPlayer?.region,
      )

    const playerStats = await prometheusStatsService.getPlayerStats(
      odysseyPlayer.playerId,
    )

    if (!cachedPlayer) {
      const createdPlayer = await this.prisma.player.create({
        data: {
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
              rating: ensuredRegion?.player.rating || 0,
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
      const odysseyPlayerMastery =
        await prometheusMasteryService.getPlayerMastery(odysseyPlayer.playerId)

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
          games: ensuredRegion.player.games,
          losses: ensuredRegion.player.losses,
          rank: ensuredRegion.player.rank,
          rating: ensuredRegion.player.rating,
          wins: ensuredRegion.player.wins,
          masteryLevel: ensuredRegion.player.masteryLevel,
        },
      })

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

    cachedPlayerCharacterRatings.forEach(async (pcr) => {
      await this.prisma.playerCharacterRating.update({
        where: {
          id: pcr.id,
        },
        data: {
          assists: pcr.assists,
          character: pcr.character,
          createdAt: dayjs().toISOString(),
          gamemode: pcr.gamemode,
          games: pcr.games,
          knockouts: pcr.knockouts,
          mvp: pcr.mvp,
          losses: pcr.losses,
          wins: pcr.wins,
          saves: pcr.saves,
          role: pcr.role,
          scores: pcr.scores,
        },
      })
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
      },
      where: {
        id: odysseyPlayer.playerId,
      },
    })
  }

  @Query(() => PilotAutocompleteObjectType)
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

  // @Query(() => )

  // @UseGuards(StrikrGuard)
  // @SetMetadata('ipWhitelist', ['127.0.0.1', '179.106.175.51'])
  // '::ffff:172.245.142.218',
  // @Query(() => PlayerMasteryObjectType)
  // async getPlayerMastery(@Args('PlayerId') playerId: string) {
  //   const playerMastery = await prometheusMasteryService.getPlayerMastery(
  //     playerId,
  //   )

  //   return playerMastery
  // }

  // @UseGuards(StrikrGuard)
  // @SetMetadata('ipWhitelist', ['127.0.0.1', '179.106.175.51'])
  // '::ffff:172.245.142.218',
  // @Query(() => PlayerCharacterMasteryObjectType)
  // async getPlayerCharacterMastery(@Args('PlayerId') playerId: string) {
  //   const playerMastery =
  //     await prometheusMasteryService.getPlayerCharacterMastery(playerId)

  //   return playerMastery
  // }

  @UseGuards(StrikrGuard)
  @SetMetadata('staffOnly', true)
  @Mutation(() => PlayerObjectType)
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

  @ResolveField(() => PlayerMasteryObjectType, { nullable: true })
  async mastery(@Parent() player: PlayerObjectType) {
    try {
      return await prometheusMasteryService.getPlayerMastery(player.id)
    } catch (e) {
      return {}
    }
  }

  @ResolveField(() => PlayerCharacterMasteryObjectType, { nullable: true })
  async characterMastery(@Parent() player: PlayerObjectType) {
    try {
      return await prometheusMasteryService.getPlayerCharacterMastery(player.id)
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

  @ResolveField(() => PlayerRatingObjectType, { nullable: true })
  async ratings(@Parent() player: PlayerObjectType) {
    return await this.prisma.player
      .findUnique({
        where: {
          id: player.id,
        },
      })
      .ratings({
        take: 20,
      })
  }

  @ResolveField(() => PlayerCharacterRatingObjectType, { nullable: true })
  async characterRatings(@Parent() player: PlayerObjectType) {
    return await this.prisma.player
      .findUnique({
        where: {
          id: player.id,
        },
      })
      .characterRatings({
        take: 100,
      })
  }
}
