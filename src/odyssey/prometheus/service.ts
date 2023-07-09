import { PROMETHEUS } from '@types'
import axios, { AxiosInstance } from 'axios'

export default class PrometheusService {
  private _client: AxiosInstance
  private _token = process.env.ODYSSEY_TOKEN
  private _refreshToken = process.env.ODYSSEY_REFRESH_TOKEN

  constructor() {
    this._client = axios.create({
      baseURL: process.env.ODYSSEY_URL,
    })

    this._client.interceptors.request.use(
      (config) => {
        config.headers['X-Authorization'] = `Bearer ${this._token}`
        config.headers['X-Refresh-Token'] = this._refreshToken

        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    this._client.interceptors.response.use(
      (response) => {
        return response
      },
      async (error) => {
        console.log(error)
        if (
          error?.response?.status === 401 ||
          error?.response?.status === 403
        ) {
          this.refreshTokens()
          return
        }
        return Promise.reject(error)
      },
    )
  }

  private async refreshTokens() {
    console.log('Refreshing tokens...')
    const data = await this._client.post<PROMETHEUS.API.LOGIN.Token>(
      '/v1/login/token',
    )

    console.log(data)

    // this._token = data.jwt
    // this._refreshToken = data.refreshToken
  }

  public content = {
    powerUps: async () => {
      const { data } = await this._client.get<PROMETHEUS.API.CONTENT.PowerUps>(
        '/v1/content/power-ups',
      )

      return data
    },

    emoticons: async () => {
      const { data } = await this._client.get<PROMETHEUS.API.CONTENT.Emoticons>(
        '/v1/content/emoticons',
      )

      return data
    },

    characters: async () => {
      const { data } =
        await this._client.get<PROMETHEUS.API.CONTENT.Characters>(
          '/v1/content/characters',
        )

      return data
    },
  }

  public ranked = {
    leaderboard: {
      players: async (
        startRank = 0,
        pageSize = 25,
        region?: PROMETHEUS.RAW.Regions,
      ) => {
        const { data } =
          await this._client.get<PROMETHEUS.API.RANKED.LEADERBOARD.Players>(
            '/v1/ranked/leaderboard/players',
            {
              params: {
                startRank,
                pageSize,
                specificRegion: region,
              },
            },
          )

        return data
      },

      search: async (
        playerId: string,
        entriesBefore = 0,
        entriesAfter = 0,
        region?: string,
      ) => {
        const { data } =
          await this._client.get<PROMETHEUS.API.RANKED.LEADERBOARD.Search>(
            `v1/ranked/leaderboard/search/${playerId}`,
            {
              params: {
                entriesBefore,
                entriesAfter,
                specificRegion: region,
              },
            },
          )

        return data
      },

      friends: async (startRank = 1, pageSize = 25) => {
        const { data } =
          await this._client.get<PROMETHEUS.API.RANKED.LEADERBOARD.Players>(
            'v1/ranked/leaderboard/friends',
            {
              params: {
                startRank,
                pageSize,
              },
            },
          )

        return data
      },

      friendsMe: async (startRank = 1, pageSize = 25) => {
        const { data } =
          await this._client.get<PROMETHEUS.API.RANKED.LEADERBOARD.Friends>(
            'v1/ranked/leaderboard/friends/me',
            {
              params: {
                startRank,
                pageSize,
              },
            },
          )

        return data
      },

      season: {
        current: async () => {
          const { data } =
            await this._client.get<PROMETHEUS.API.RANKED.LEADERBOARD.CurrentSeason>(
              'v1/ranked/leaderboard/season/current',
            )

          return data
        },
      },

      rating: async () => {
        const { data } =
          await this._client.get<PROMETHEUS.API.RANKED.LEADERBOARD.Rating>(
            'v1/ranked/leaderboard/rating',
          )

        return data
      },

      ensureRegion: async (playerId: string, specificRegion?: string) => {
        console.log('Ensuring region...')
        for (const region of [
          ...(specificRegion === 'Global' || !specificRegion
            ? [
                'Global',
                'NorthAmerica',
                'SouthAmerica',
                'Europe',
                'Asia',
                'Oceania',
                'JapaneseLanguageText',
                undefined,
              ]
            : [specificRegion]),
        ]) {
          if (!region) {
            return
          }
          try {
            console.log(`Checking ${region}...`, playerId)
            const { players } = await this.ranked.leaderboard.search(
              playerId,
              0,
              0,
              region === 'Global' ? undefined : region,
            )
            // If you are below 100 in global, you are most likely wanting to see your regional first.
            if (region === 'Global' && players[0].rank > 100) {
              console.log('Not what the user expects')
              continue
            }

            if (players.length > 0) {
              return { player: players[0], region: region }
            }
          } catch {
            continue
          }
        }
      },
    },
  }

  public mastery = {
    player: async (playerId: string, entriesBefore = 0, entriesAfter = 0) => {
      const { data } = await this._client.get<PROMETHEUS.API.MASTERY.Player>(
        `v1/mastery/${playerId}/player`,
        {
          params: {
            entriesAfter,
            entriesBefore,
          },
        },
      )

      return data
    },

    character: async (playerId: string) => {
      const { data } = await this._client.get<PROMETHEUS.API.MASTERY.Character>(
        `v1/mastery/${playerId}/character`,
      )

      return data
    },

    characterV2: async (playerId: string) => {
      const { data } = await this._client.get<PROMETHEUS.API.MASTERY.Character>(
        `v2/mastery/${playerId}/character`,
      )

      return data
    },
  }

  public player = {
    chracters: async (playerId: string) => {
      const { data } = await this._client.get<PROMETHEUS.API.PLAYER.Characters>(
        `v1/players/${playerId}/characters`,
      )

      return data
    },

    emoticons: async (playerId: string) => {
      const { data } = await this._client.get<PROMETHEUS.API.PLAYER.Emoticons>(
        `v1/players/${playerId}/emoticons`,
      )

      return data
    },

    usernameQuery: async (
      username: string,
      entriesBefore = 0,
      entriesAfter = 0,
    ) => {
      const { data } =
        await this._client.get<PROMETHEUS.API.PLAYER.UsernameQuery>(
          'v1/players',
          {
            params: {
              usernameQuery: username,
              entriesBefore,
              entriesAfter,
            },
          },
        )

      const matchingPlayer = data.matches.find(
        (player) => player.username.toLowerCase() === username.toLowerCase(),
      )

      return matchingPlayer
    },
  }

  public stats = {
    player: async (playerId: string) => {
      const { data } = await this._client.get<PROMETHEUS.API.STATS.Player>(
        `v1/stats/player-stats/${playerId}`,
      )

      return data
    },
  }
}

export const prometheusService = new PrometheusService()
