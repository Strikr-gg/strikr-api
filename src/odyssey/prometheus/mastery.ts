import { ODYSSEY } from '@types'
import httpservice from './httpservice'

export class prometheusMasteryService {
  /**
   * Get user carreer information from prometheus like
   * - level
   * - xp
   * @param id playerId
   */
  async getPlayerMastery(id: string) {
    const { data } = await httpservice.get<ODYSSEY.PROMETHEUS.PlayerMastery>(
      `/v1/mastery/${id}/player`,
    )
    return data
  }

  async getPlayerCharacterMastery(id: string) {
    const { data } =
      await httpservice.get<ODYSSEY.PROMETHEUS.PlayerCharacterMastery>(
        `/v1/mastery/${id}/characters`,
      )

    return data
  }
}

export default new prometheusMasteryService()
