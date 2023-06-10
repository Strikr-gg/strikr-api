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
import { sumRoleStatProperties } from './player'
import { create } from 'domain'

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
      where: { username: name.toLowerCase() },
    })
    let createNewRating = refresh

    if (!refresh && cachedPlayer) {
      console.debug(
        `Returning cached Player: ${name} @ ${cachedPlayer.region}} Reason: Refresh is false`,
      )
      return cachedPlayer
    }

    try {
      const odyCachedPlayer = await prometheusPlayerService.queryPlayerByName(
        name,
      )

      const playerMastery = await prometheusMasteryService.getPlayerMastery(
        cachedPlayer?.id || odyCachedPlayer.playerId,
      )

      const strikrLatestRating = await this.prisma.playerRating.findFirst({
        where: {
          AND: [
            {
              playerId: cachedPlayer?.id || odyCachedPlayer.playerId,
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      if (
        cachedPlayer &&
        playerMastery &&
        playerMastery.currentLevelXp === cachedPlayer.currentXp
      ) {
        console.debug(
          `Denying ratings creation: ${name} @ ${
            cachedPlayer?.region || 'Global'
          } Reason: (Have not played the game since last rating)`,
        )

        createNewRating = false

        if (strikrLatestRating) {
          console.log(
            `Found cached rating: ${strikrLatestRating.id} - updating to currentTime and returning cached value`,
          )

          await this.prisma.player.update({
            where: {
              id: cachedPlayer.id,
            },
            data: {
              ratings: {
                update: {
                  where: {
                    id: strikrLatestRating.id,
                  },
                  data: {
                    createdAt: new Date(),
                  },
                },
              },
              updatedAt: new Date(),
            },
          })

          return cachedPlayer
        }
      }

      const playerOnLeaderboardObj = {
        region: 'Global',
        games: 0,
        wins: 0,
        losses: 0,
        rank: 10_001,
        rating: 0,
      }

      await prometheusRankedService
        .ensurePlayerIsOnLeaderboard(
          cachedPlayer?.id || odyCachedPlayer.playerId,
        )
        .then(async (result) => {
          if (!result?.player) {
            return
          }

          playerOnLeaderboardObj.games = result.player.games
          playerOnLeaderboardObj.wins = result.player.wins
          playerOnLeaderboardObj.losses = result.player.losses
          playerOnLeaderboardObj.rank = result.player.rank
          playerOnLeaderboardObj.rating = result.player.rating
          playerOnLeaderboardObj.region = result.region

          if (
            strikrLatestRating &&
            result.player.rating === strikrLatestRating.rating
          ) {
            createNewRating = false
          }
        })
        .catch((e) => {
          console.error(e)
          console.debug(`The player ${name} is not on the leaderboard (10k).`)
        })

      const odyPlayerStats = await prometheusStatsService.getPlayerStats(
        cachedPlayer?.id || odyCachedPlayer.playerId,
      )

      console.log('Creating new ratings?', createNewRating)
      return await this.prisma.player.upsert({
        where: {
          id: cachedPlayer?.id || odyCachedPlayer.playerId,
        },
        create: {
          id: odyCachedPlayer.playerId,
          username: odyCachedPlayer.username.toLowerCase(),
          region: playerOnLeaderboardObj.region,
          currentXp: playerMastery.currentLevelXp,
          nameplateId: odyCachedPlayer.nameplateId,
          emoticonId: odyCachedPlayer.emoticonId,
          logoId: odyCachedPlayer.logoId,
          titleId: odyCachedPlayer.title,
          tags: odyCachedPlayer.tags,
          socialUrl: odyCachedPlayer?.socialUrl || '',
          ...(createNewRating && {
            characterRatings: {
              createMany: {
                data: [
                  ...odyPlayerStats.characterStats
                    .filter(
                      (stat) =>
                        stat.ratingName === 'RankedInitial' ||
                        stat.ratingName === 'NormalInitial',
                    )
                    .map((characterStat) => {
                      console.log(
                        'Creating characterRating for ',
                        characterStat.ratingName,
                      )
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
                        gamemode: characterStat.ratingName as 'RankedInitial',
                      }
                    }),
                  ...odyPlayerStats.characterStats.map((characterStat) => {
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
            ratings: {
              create: {
                rating: playerOnLeaderboardObj.rating,
                games: playerOnLeaderboardObj.games,
                wins: playerOnLeaderboardObj.wins,
                losses: playerOnLeaderboardObj.losses,
                rank: playerOnLeaderboardObj.rank,
              },
            },
          }),
        },
        update: {
          updatedAt: new Date(),
          region: playerOnLeaderboardObj.region,
          currentXp: playerMastery.currentLevelXp,
          nameplateId: odyCachedPlayer.nameplateId,
          emoticonId: odyCachedPlayer.emoticonId,
          logoId: odyCachedPlayer.logoId,
          titleId: odyCachedPlayer.title,
          tags: odyCachedPlayer.tags,
          socialUrl: odyCachedPlayer?.socialUrl || '',
          ...(createNewRating && {
            characterRatings: {
              createMany: {
                data: [
                  ...odyPlayerStats.characterStats
                    .filter(
                      (stat) =>
                        stat.ratingName === 'RankedInitial' ||
                        stat.ratingName === 'NormalInitial',
                    )
                    .map((characterStat) => {
                      console.log(
                        'Updating characterRating for ',
                        characterStat.ratingName,
                      )
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
                        gamemode: characterStat.ratingName as 'RankedInitial',
                      }
                    }),
                  ...odyPlayerStats.characterStats.map((characterStat) => {
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
            ratings: {
              create: {
                rating: playerOnLeaderboardObj.rating,
                games: playerOnLeaderboardObj.games,
                wins: playerOnLeaderboardObj.wins,
                losses: playerOnLeaderboardObj.losses,
                rank: playerOnLeaderboardObj.rank,
              },
            },
          }),
        },
      })
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
