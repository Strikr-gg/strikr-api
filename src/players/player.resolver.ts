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
import { IpWhitelistGuard } from 'src/ip.guard'

function compareObjects(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    const val1 = obj1[key]
    const val2 = obj2[key]
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      return compareObjects(val1, val2)
    }

    if (typeof val1 !== typeof val2) {
      return false
    }

    if (val1 !== val2) {
      return false
    }
  }

  return true
}

@Resolver(() => PlayerObjectType)
@Injectable()
export class PlayerResolver {
  constructor(private readonly prisma: PrismaService) {}

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
        username: name,
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
  @Query(() => PlayerObjectType)
  async ensurePlayer(
    @Args('name', { type: () => String, nullable: false }) name: string,
    @Args('refresh', { type: () => Boolean, nullable: true }) refresh: boolean,
  ) {
    const cachedPlayer = await this.prisma.player.findUnique({
      where: {
        username: name.toLowerCase(),
      },
    })

    if (!refresh && cachedPlayer) {
      console.debug(
        `Returning cached Player: ${name} @ ${cachedPlayer.region}} Reason: Refresh is false`,
      )
      return cachedPlayer
    }

    try {
      const player = await prometheusPlayerService.queryPlayerByName(name)
      const { playerId, masteryLevel: playerMasteryLevel } = player

      let playerGames = 0
      let rank = 10_001
      let region = 'Global'
      let playerWins = 0
      let playerLosses = 0
      let playerRating = 0

      await prometheusRankedService
        .ensurePlayerIsOnLeaderboard(
          playerId,
          cachedPlayer ? cachedPlayer.region : undefined,
        )
        .then((playerOnBoard) => {
          playerGames = playerOnBoard.player.games
          rank = playerOnBoard.player.rank
          region = playerOnBoard.region
          playerWins = playerOnBoard.player.wins
          playerLosses = playerOnBoard.player.losses
          playerRating = playerOnBoard.player.rating
        })
        .catch(() => {
          console.debug(
            `Attempted to search for stats from user below 10k: ${name}`,
          )
          // console.log(error)
        })

      const playerStatistics = await prometheusStatsService.getPlayerStats(
        playerId,
      )

      const playerRatings = {
        games: playerGames,
        masteryLevel: playerMasteryLevel,
        rank,
        wins: playerWins,
        losses: playerLosses,
        rating: playerRating,
      }

      if (cachedPlayer) {
        const latestCachedRating = await this.prisma.playerRating.findFirst({
          where: {
            playerId: cachedPlayer.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })

        if (
          compareObjects(
            {
              games: latestCachedRating.games,
              masteryLevel: latestCachedRating.masteryLevel,
              rank: latestCachedRating.rank,
              wins: latestCachedRating.wins,
              losses: latestCachedRating.losses,
              rating: latestCachedRating.rating,
            },
            playerRatings,
          )
        ) {
          await this.prisma.player.update({
            where: {
              id: cachedPlayer.id,
            },
            data: {
              updatedAt: new Date(),
              ratings: {
                update: {
                  where: {
                    id: latestCachedRating.id,
                  },
                  data: {
                    createdAt: new Date(),
                  },
                },
              },
            },
          })
          console.log(
            'Returning cached Player, Reason: No changes - updated last rating',
          )
          return cachedPlayer
        }
      }

      const createdPlayer = await this.prisma.player.upsert({
        where: {
          id: playerId,
        },
        create: {
          id: playerId,
          region,
          username: player.username.toLowerCase(),
          logoId: player.logoId,
          emoticonId: player.emoticonId,
          nameplateId: player.nameplateId,
          titleId: player.titleId,
          tags: player.tags || [],
          ratings: {
            create: playerRatings,
          },
          characterRatings: {
            createMany: {
              data: [
                ...playerStatistics.characterStats.map((characterStat) => {
                  return {
                    character: characterStat.characterId,
                    role: 'Forward',
                    games: characterStat.roleStats.Forward.games,
                    assists: characterStat.roleStats.Forward.assists,
                    knockouts: characterStat.roleStats.Forward.knockouts,
                    wins: characterStat.roleStats.Forward.wins,
                    losses: characterStat.roleStats.Forward.losses,
                    mvp: characterStat.roleStats.Forward.mvp,
                    saves: characterStat.roleStats.Forward.saves,
                    scores: characterStat.roleStats.Forward.scores,
                    gamemode: characterStat.ratingName as Gamemode,
                  }
                }),
                ...playerStatistics.characterStats.map((characterStat) => {
                  return {
                    character: characterStat.characterId,
                    role: 'Goalie',
                    games: characterStat.roleStats.Goalie.games,
                    assists: characterStat.roleStats.Goalie.assists,
                    knockouts: characterStat.roleStats.Goalie.knockouts,
                    wins: characterStat.roleStats.Goalie.wins,
                    losses: characterStat.roleStats.Goalie.losses,
                    mvp: characterStat.roleStats.Goalie.mvp,
                    saves: characterStat.roleStats.Goalie.saves,
                    scores: characterStat.roleStats.Goalie.scores,
                    gamemode: characterStat.ratingName as Gamemode,
                  }
                }),
              ],
            },
          },
        },
        update: {
          id: playerId,
          region,
          username: player.username.toLowerCase(),
          logoId: player.logoId,
          emoticonId: player.emoticonId,
          nameplateId: player.nameplateId,
          titleId: player.titleId,
          ratings: {
            create: {
              games: playerGames,
              masteryLevel: playerMasteryLevel,
              rank,
              wins: playerWins,
              losses: playerLosses,
              rating: playerRating,
            },
          },
          characterRatings: {
            createMany: {
              data: [
                ...playerStatistics.characterStats.map((characterStat) => {
                  return {
                    character: characterStat.characterId,
                    role: 'Forward',
                    games: characterStat.roleStats.Forward.games,
                    assists: characterStat.roleStats.Forward.assists,
                    knockouts: characterStat.roleStats.Forward.knockouts,
                    wins: characterStat.roleStats.Forward.wins,
                    losses: characterStat.roleStats.Forward.losses,
                    mvp: characterStat.roleStats.Forward.mvp,
                    saves: characterStat.roleStats.Forward.saves,
                    scores: characterStat.roleStats.Forward.scores,
                    gamemode: characterStat.ratingName as Gamemode,
                  }
                }),
                ...playerStatistics.characterStats.map((characterStat) => {
                  return {
                    character: characterStat.characterId,
                    role: 'Goalie',
                    games: characterStat.roleStats.Goalie.games,
                    assists: characterStat.roleStats.Goalie.assists,
                    knockouts: characterStat.roleStats.Goalie.knockouts,
                    wins: characterStat.roleStats.Goalie.wins,
                    losses: characterStat.roleStats.Goalie.losses,
                    mvp: characterStat.roleStats.Goalie.mvp,
                    saves: characterStat.roleStats.Goalie.saves,
                    scores: characterStat.roleStats.Goalie.scores,
                    gamemode: characterStat.ratingName as Gamemode,
                  }
                }),
              ],
            },
          },
        },
      })
      console.log('Returning upserted Player')
      return createdPlayer
    } catch (error) {
      console.log(error)
      return new HttpException('Player not found', HttpStatus.NOT_FOUND)
    }
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
        take: 17 * 4,
      })
  }
}
