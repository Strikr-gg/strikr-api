import { ODYSSEY } from '@types'
import httpservice from './httpservice'

export class PrometheusRankedService {
  async getSeason() {
    const { data } = await httpservice.get<ODYSSEY.PROMETHEUS.CurrentSeason>(
      '/api/ranked/season/current',
    )
    return data
  }

  async getLeaderboard(
    specificRegion = 'Global',
    startRank = 0,
    pageSize = 100,
  ) {
    if (specificRegion === 'Global') {
      specificRegion = undefined
    }

    const { data } =
      await httpservice.get<ODYSSEY.PROMETHEUS.LeaderboardPlayers>(
        '/v1/ranked/leaderboard/players',
        {
          params: {
            startRank,
            pageSize,
            specificRegion,
          },
        },
      )
    return data
  }

  async getPlayerOnLeaderboard(
    id: string,
    specificRegion = 'Global',
    entriesBefore = 0,
    entriesAfter = 0,
  ) {
    const { data } =
      await httpservice.get<ODYSSEY.PROMETHEUS.LeaderboardSearch>(
        `/v1/ranked/leaderboard/search/${id}`,
        {
          params: {
            entriesBefore,
            entriesAfter,
            ...(specificRegion !== 'Global' && { specificRegion }),
          },
        },
      )
    return data
  }

  async ensurePlayerIsOnLeaderboard(id: string, specificRegion?: string) {
    for (const region of [
      ...(specificRegion
        ? [specificRegion]
        : [
            'NorthAmerica',
            'SouthAmerica',
            'Europe',
            'Asia',
            'Oceania',
            undefined,
          ]),
    ]) {
      try {
        const { players } = await this.getPlayerOnLeaderboard(id, region, 0, 0)
        if (players.length > 0) {
          return { player: players[0], region: region }
        }
      } catch {
        continue
      }
    }
  }
}

export default new PrometheusRankedService()
