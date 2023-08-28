import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import dayjs from 'dayjs'
import { prometheusService } from 'src/odyssey/prometheus/service'
const prisma = new PrismaClient()

const corestrikrLogger = new Logger('CoreStrikr')

type Regions =
  | 'Global'
  | 'NorthAmerica'
  | 'Europe'
  | 'Asia'
  | 'SouthAmerica'
  | 'Oceania'
  | 'JapaneseLanguageText'
export interface Root {
  rankedStats: RankedStats
  characterStats: CharacterStats
  overallStats: OverallStats
}

export interface RankedStats {
  username: string
  rating: number
  rating_display: string
  rank: number
  role: string
  wins: number
  losses: number
  winpercent: string
  toppercent: string
  verified: boolean
  is_ranked: boolean
  lp_history: number[][]
}

export interface CharacterStats {
  forwards: RoleData[]
  goalies: RoleData[]
}

export interface RoleData {
  name: string
  display_name: string
  wins: number
  losses: number
  assists: number
  mvp: number
  knockouts: number
  scores: number
  saves: number
}

export interface OverallStats {
  forwards: Forwards
  goalies: Goalies
}

export interface Forwards {
  name: string
  display_name: string
  wins: number
  losses: number
  assists: number
  mvp: number
  knockouts: number
  scores: number
  saves: number
}

export interface Goalies {
  name: string
  display_name: string
  wins: number
  losses: number
  assists: number
  mvp: number
  knockouts: number
  scores: number
  saves: number
}

const Regions = [
  // 'Global',
  'NorthAmerica',
  'SouthAmerica',
  'Europe',
  'Asia',
  'Oceania',
  'JapaneseLanguageText',
]

@Injectable()
export class FetchCorestrike {
  @Cron('0 */12 * * *', {
    disabled: false,
    name: 'FetchCorestrike',
  })
  async handleCron() {
    await populateByBoardOffset(0, 25, 'NorthAmerica')
    await populateByBoardOffset(0, 25, 'SouthAmerica')
    await populateByBoardOffset(0, 25, 'Europe')
    await populateByBoardOffset(0, 25, 'Asia')
    await populateByBoardOffset(0, 25, 'Oceania')
    await populateByBoardOffset(0, 25, 'JapaneseLanguageText')
    await deduplicatePlayerRatings()
  }
}

async function populateByBoardOffset(offset = 0, count = 25, region?: Regions) {
  if (!region || region === 'Global') {
    corestrikrLogger.debug(
      `Avoiding global region - ${region} - ${offset} - ${count}`,
    )
    return
  }

  const leaderboardPlayers = await prometheusService.ranked.leaderboard.players(
    offset,
    count,
    region,
  )

  for (const player of leaderboardPlayers.players) {
    try {
      // Look for this player on Strikr.gg

      const strikrPlayer = await prisma.player.findUnique({
        where: {
          id: player.playerId,
        },
        include: {
          ratings: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      })

      // IF OLDEST DATA IS OLDER THAN 2 MONTHS, SKIP
      if (
        strikrPlayer?.ratings?.[0] &&
        dayjs(strikrPlayer?.ratings?.[0].createdAt).isBefore(
          dayjs().subtract(2, 'month'),
        )
      ) {
        corestrikrLogger.debug(
          `Player ${player.playerId} has data older than 2 months, skipping`,
        )
        continue
      }

      // OBTAIN FROM CORESTRIKE
      const { data: playerInCorestrike } = await axios.get<Root>(
        `https://corestrike.gg/lookup/${player.username}`,
        {
          params: {
            region: region,
            json: true,
          },
        },
      )

      corestrikrLogger.debug(
        `Player ${player.username}#${player.playerId} @ ${region} found on corestrike - ${playerInCorestrike.rankedStats.lp_history.length} ratings [INSERTING]`,
      )

      // The player does not have any history, insert everything and return
      if (!strikrPlayer) {
        corestrikrLogger.debug(
          `Player ${player.playerId} does not exist on Strikr.gg`,
        )

        await prisma.player.create({
          data: {
            id: player.playerId,
            region: region,
            username: player.username,
            ratings: {
              createMany: {
                data: playerInCorestrike.rankedStats.lp_history.map((cst) => {
                  return {
                    rating: cst[1],
                    createdAt: dayjs(cst[0]).toISOString(),
                    games: 0,
                    wins: 0,
                    losses: 0,
                    masteryLevel: 0,
                    rank: 10_001,
                  }
                }),
              },
            },
          },
        })

        corestrikrLogger.verbose(
          `Created player ${player.playerId} corestrike -> strikr.gg entries`,
        )

        continue
      }

      const oldestStrikerData = strikrPlayer?.ratings?.[0] || {
        createdAt: dayjs(),
      }
      const oldestCorestrikeData = [
        ...playerInCorestrike.rankedStats.lp_history,
      ].sort((a, b) => (dayjs(b[1]).isBefore(dayjs(a[1])) ? 1 : -1))[0]

      corestrikrLogger.debug(
        `Oldest Strikr.gg data: ${dayjs(oldestStrikerData?.createdAt).format(
          'DD/MM/YYYY',
        )} | Oldest Corestrike data: ${dayjs(oldestCorestrikeData[0]).format(
          'DD/MM/YYYY',
        )}`,
      )

      const ratingsToInsert = playerInCorestrike.rankedStats.lp_history.filter(
        (cst) => {
          return dayjs(cst[0]).isBefore(dayjs(oldestStrikerData.createdAt))
        },
      )

      corestrikrLogger.debug(
        `Player ${player.username}#${player.playerId} has ${ratingsToInsert.length} ratings to insert`,
      )

      await prisma.playerRating.createMany({
        data: ratingsToInsert.map((cst) => {
          return {
            playerId: player.playerId,
            rating: cst[1],
            createdAt: dayjs(cst[0]).toISOString(),
            games: 0,
            wins: 0,
            losses: 0,
            masteryLevel: 0,
            rank: 10_001,
          }
        }),
      })

      continue
    } catch (e) {
      corestrikrLogger.error(
        `Error updating player ${player.playerId} #${player.rank} @ ${region}: ${e}`,
      )
    }
  }

  if (leaderboardPlayers.paging.totalItems > offset + count) {
    await populateByBoardOffset(offset + count, count, region)
  }
}

async function deduplicatePlayerRatings() {
  try {
    const allPlayerRatings = await prisma.playerRating.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    })

    corestrikrLogger.debug(
      `Analyzing ${allPlayerRatings.length} player ratings`,
    )

    const uniquePlayerRatings: Record<string, any> = {}

    for (const rating of allPlayerRatings) {
      const ratingDate = rating.createdAt.toISOString().split('T')[0]
      const key = `${rating.playerId}_${ratingDate}`
      if (
        !uniquePlayerRatings[key] ||
        rating.createdAt > uniquePlayerRatings[key].createdAt
      ) {
        uniquePlayerRatings[key] = rating
      } else {
        corestrikrLogger.debug(
          `Deleting rating ${rating.id} for ${rating.playerId}`,
        )
      }
    }

    const uniqueRatingsArray = Object.values(uniquePlayerRatings)

    // Delete existing ratings
    await prisma.playerRating.deleteMany()

    // Insert the deduplicated ratings
    await prisma.playerRating.createMany({
      data: uniqueRatingsArray,
      skipDuplicates: true,
    })

    corestrikrLogger.debug(
      `Deduplicated ratings, resulted in ${uniqueRatingsArray.length} ratings after cleanup`,
    )
  } catch (error) {
    console.error('Error deduplicating player ratings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deduplicatePlayerRatings()
