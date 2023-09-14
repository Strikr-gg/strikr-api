import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { prometheusService } from 'src/odyssey/prometheus/service'
import { Gamemode, PrismaClient } from '@prisma/client'
import { UtilsService } from 'src/utils/utils.service'
const prisma = new PrismaClient()

const leaderboardLogger = new Logger('Leaderboard')

type Regions =
  | 'Global'
  | 'NorthAmerica'
  | 'Europe'
  | 'Asia'
  | 'SouthAmerica'
  | 'Oceania'
  | 'JapaneseLanguageText'
@Injectable()
export class UpdateLearderboard {
  @Cron('0 */6 * * *')
  async handleCron() {
    await prisma.leaderboard.deleteMany()

    const updates: Promise<any>[] = []
    for (const region of [
      'Global',
      'NorthAmerica',
      'Europe',
      'Asia',
      'SouthAmerica',
      'Oceania',
      'JapaneseLanguageText',
    ]) {
      // Deleting all current players:
      updates.push(populateByBoardOffset(0, 25, region as Regions))
    }
    await Promise.all(updates)
  }
}

async function populateByBoardOffset(offset = 0, count = 25, region?: Regions) {
  leaderboardLogger.debug(
    `Updating leaderboard for ${region} with > Offset:${offset} Step: ${count}`,
  )
  const leaderboardPlayers = await prometheusService.ranked.leaderboard.players(
    offset,
    count,
    region === 'Global' ? undefined : region,
  )

  for (const player of leaderboardPlayers.players) {
    leaderboardLogger.debug(
      `Updating player ${player.playerId} #${player.rank} @ ${region}`,
    )
    try {
      await prisma.leaderboard.create({
        data: {
          playerId: player.playerId,
          region: region,
          losses: player.losses,
          rank: player.rank,
          rating: player.rating,
          topRole: player.topRole,
          wins: player.wins,
          emoticonId: player.emoticonId,
          masteryLevel: player.masteryLevel,
          socialUrl: player.socialUrl,
          tags: player.tags,
          titleId: player.titleId,
          username: player.username,
        },
      })

      const latestPlayerObject = await prisma.player.findUnique({
        where: {
          id: player.playerId,
        },
        select: {
          updatedAt: true,
          ratings: {
            select: {
              id: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      })

      if (!latestPlayerObject) {
        leaderboardLogger.debug(
          `Inserted player ${player.playerId} #${player.rank} @ ${region} - Does not have strikr ratings saved.`,
        )
      }

      const utilsService = new UtilsService()
      let operation: 'create' | 'update' = 'create'
      if (
        latestPlayerObject?.ratings?.[0] &&
        !utilsService.areDifferentDays(
          latestPlayerObject.ratings[0].createdAt.toISOString(),
          new Date().toISOString(),
        )
      ) {
        operation = 'update'
      }

      const characterStats = (
        await prometheusService.stats.player(player.playerId)
      ).characterStats

      const accountStats = await prometheusService.mastery.player(
        player.playerId,
      )

      leaderboardLogger.debug(
        `Inserted player ${player.playerId} #${player.rank} @ ${region} - Now updating on strikr`,
      )

      await prisma.player.update({
        where: {
          id: player.playerId,
        },
        data: {
          characterRatings: {
            createMany: {
              data: [
                ...characterStats.map((cs) => {
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
                ...characterStats.map((cs) => {
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
          currentXp: accountStats.currentLevelXp,
          socialUrl: player.socialUrl,
          emoticonId: player.emoticonId,
          logoId: player.logoId,
          nameplateId: player.nameplateId,
          ratings: {
            ...(operation === 'create'
              ? {
                  create: {
                    rating: player.rating,
                    rank: player.rank,
                    wins: player.wins,
                    losses: player.losses,
                    masteryLevel: player.masteryLevel,
                  },
                }
              : {
                  update: {
                    where: {
                      id: latestPlayerObject.ratings[0].id,
                    },
                    data: {
                      games: player.games,
                      losses: player.losses,
                      rank: player.rank,
                      rating: player.rating,
                      wins: player.wins,
                      masteryLevel: player.masteryLevel,
                    },
                  },
                }),
          },
        },
      })

      leaderboardLogger.debug(
        `Inserted player ${player.playerId} #${player.rank} @ ${region} - Updated on strikr!`,
      )
    } catch (e) {
      leaderboardLogger.error(
        `Error updating player ${player.playerId} #${player.rank} @ ${region}: ${e}`,
      )
    }
  }

  if (leaderboardPlayers.paging.totalItems > offset + count) {
    await populateByBoardOffset(offset + count, count, region)
  }
}
