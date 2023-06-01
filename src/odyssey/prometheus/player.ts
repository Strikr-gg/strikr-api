import type { ODYSSEY } from '../../../@types/index.d.ts'
import httpservice from './httpservice.js'

export default {
  /**
   * Searchs for the user on Odyssey.Player
   *
   * The player doesn't need to be in a leaderboard, only the ranked service needs that
   * @param username
   * @returns Player
   */
  async queryPlayerByName(username: string) {
    const { data } = await httpservice.get<ODYSSEY.PROMETHEUS.PlayerQuery>(
      '/v1/players',
      {
        params: {
          usernameQuery: username,
        },
      },
    )

    return data.matches.find((match) => {
      return match.username.toLowerCase() === username.toLowerCase()
    })
  },

  async getPlayerEmoticons(id: string) {
    const { data } = await httpservice.get<ODYSSEY.PROMETHEUS.PlayerEmoticons>(
      `/v1/players/${id}/emoticons`,
    )

    return data
  },

  async getPlayerCharacters(id: string) {
    const { data } = await httpservice.get<ODYSSEY.PROMETHEUS.PlayerChracters>(
      `/v1/players/${id}/characters`,
    )

    return data
  },
}
