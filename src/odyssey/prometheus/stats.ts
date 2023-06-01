import { ODYSSEY } from '@types'
import httpservice from './httpservice'

export default {
  async getPlayerStats(id: string) {
    const { data } = await httpservice.get<ODYSSEY.PROMETHEUS.PlayerStats>(
      `/v1/stats/player-stats/${id}`,
    )

    return data
  },
}
