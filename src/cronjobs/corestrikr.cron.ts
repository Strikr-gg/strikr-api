import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { prometheusService } from 'src/odyssey/prometheus/service'
import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import dayjs from 'dayjs'
const prisma = new PrismaClient()

const corestrikrLogger = new Logger('CoreStrikr')

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
  'Global',
  'NorthAmerica',
  'Europe',
  'Asia',
  'SouthAmerica',
  'Oceania',
  'JapaneseLanguageText',
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

@Injectable()
export class FetchCorestrike {
  @Cron('0 */6 * * *', {
    disabled: false,
    name: 'FetchCorestrike',
  })
  async handleCron() {
    fetchFromCorestrike()
  }
}

export async function fetchFromCorestrike() {
  corestrikrLogger.log('Initiating corestrike import')
  let requestCounter = 0
  // Query scorestrike for the LP history and set invalid values for the
  // missing data.
  // This endpoint will do nothing if we already have rating at the same timestamp
  // players ar not Dr.Who why the fuck odyssey timestamps their objects?
  // why does the endpoint called player has "matches" as only object
  // If we do, skip... past data cannot be modified. We are not Dr.Who
  for (const region of Regions) {
    corestrikrLogger.debug(`Mapping region: ${region}`)
    const regionPlayers = await prisma.leaderboard.findMany({
      where: {
        region,
      },
    })

    for (const player of regionPlayers) {
      corestrikrLogger.debug(
        `Processing player ${player.username} @ ${player.region}`,
      )

      if (requestCounter === 2) {
        requestCounter = 0
        await sleep(1000)
      }

      try {
        const { data: playerInCorestrike } = await axios.get<Root>(
          `https://corestrike.gg/lookup/${player.username}`,
          {
            params: {
              region: player.region,
              json: true,
            },
          },
        )

        requestCounter++
        corestrikrLogger.debug(`Found player ${player.username} @ corestrike`)

        // Get the oldest strikr snapsho, we will use strikr data whenever possible.
        const oldestStrikerData = await prisma.player
          .findUnique({
            where: {
              username: player.username.toLowerCase(),
            },
          })
          .characterRatings({
            orderBy: {
              createdAt: 'asc',
            },
            take: 1,
          })

        if (!oldestStrikerData || oldestStrikerData.length === 0) {
          corestrikrLogger.debug(
            `Player ${player.username} has no strikr data - ignoring.`,
          )
          continue
        }

        if (
          !playerInCorestrike.rankedStats.lp_history ||
          playerInCorestrike.rankedStats.lp_history.length === 0
        ) {
          corestrikrLogger.debug(
            `Player ${player.username} has no strikr data - importing everything.`,
          )
        }

        playerInCorestrike.rankedStats.lp_history.sort((a, b) => b[0] - a[0])

        if (
          dayjs(playerInCorestrike.rankedStats.lp_history[0][0]).isAfter(
            dayjs(oldestStrikerData?.[0].createdAt || new Date()),
          )
        ) {
          corestrikrLogger.debug(`Player ${player.username} has NO history.`)
          corestrikrLogger.debug(playerInCorestrike.rankedStats.lp_history[0])
          continue
        }

        const ratingsInsertion = playerInCorestrike.rankedStats.lp_history.map(
          (lp) => {
            return {
              playerId: player.playerId,
              rating: lp[1],
            }
          },
        )

        await prisma.playerRating.createMany({
          data: ratingsInsertion,
        })

        corestrikrLogger.debug(
          `Player ${player.username} : Created ${ratingsInsertion.length} ratings.`,
        )
        // Loop through the timestamps.
      } catch (e) {
        corestrikrLogger.error('Failed to import data from corestrike', e)
      }
    }
  }
}

fetchFromCorestrike()
