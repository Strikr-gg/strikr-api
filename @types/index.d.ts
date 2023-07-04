export namespace PROMETHEUS {
  export namespace RAW {
    export type Regions =
      | 'NorthAmerica'
      | 'SouthAmerica'
      | 'Asia'
      | 'Oceania'
      | 'Europe'
      | 'JapaneseLanguageText'

    export type Content = {
      assetName: string
      ownedByDefault: boolean
    }

    export type Role = 'Forward' | 'Goalie'

    export type Player = {
      username: string
      playerId: string
      logoId: string
      title: string
      nameplateId: string
      emoticonId: string
      titleId: string
      tags: string[]
      platformIds: {
        [key: string]: unknown
      }
      masteryLevel: number
      organization: {
        organizationId: string
        logoId: string
        name: string
      }
      socialUrl: string
    }

    export type Paging = {
      pageSize: number
      totalItems: number
    }
  }

  export namespace API {
    export namespace LOGIN {
      export type Token = PROMETHEUS.RAW.Player & {
        currentPlatform: string
        displayNameStatus: string
        eulaNeeded: boolean
        tutorialProgress: {
          timestamp: string
          isTutorialComplete: boolean
          screensOpened: string[]
        }
        rookieRoadStatus: {
          complete: boolean
          active: boolean
        }
        matchmakingRegion: PROMETHEUS.RAW.Regions
        gameLiftRegionUrls: {
          region: string
          url: string
        }
        jwt: string
        refreshToken: string
      }
    }
    export namespace CONTENT {
      export type PowerUps = {
        powerUps: PROMETHEUS.RAW.Content[]
      }

      export type Emoticons = {
        timestamp: string
        emoticons: PROMETHEUS.RAW.Content[]
      }

      export type Characters = {
        characters: PROMETHEUS.RAW.Content[]
      }
    }
    export namespace RANKED {
      export namespace LEADERBOARD {
        export type Players = {
          players: Array<
            PROMETHEUS.RAW.Player & {
              rank: number
              wins: number
              losses: number
              games: number
              topRole: PROMETHEUS.RAW.Role
              rating: number
              mostPlayedCharacters: {
                characterId: string
                gamesPlayed: number
              }
              currentDivistionId: string
              progressToNext: number
            }
          >
          paging: PROMETHEUS.RAW.Paging & {
            startRank: number
          }
        }

        export type Search = {
          players: Array<
            PROMETHEUS.RAW.Player & {
              rank: number
              wins: number
              losses: number
              games: number
              topRole: PROMETHEUS.RAW.Role
              rating: number
              mostPlayedCharacters: {
                characterId: string
                gamesPlayed: number
              }
              currentDivistionId: string
              progressToNext: number
            }
          >
          paging: PROMETHEUS.RAW.Paging & {
            startRank: number
          }
        }

        export type Friends = PROMETHEUS.RAW.Player & {
          rank: number
          wins: number
          losses: number
          games: number
          rating: number
          mostPlayedCharacters: {
            characterId: string
            gamesPlayed: number
          }[]
          currentDivisionId: string
          progressToNext: number
        }

        export type CurrentSeason = {
          timestamp: string
          season: {
            id: string
            name: string
            description: string
            startTime: string
            endTime: string
            requireSoloQueueEloThreshold: number
            ratingTiers: {
              tierId: string
              tierName: string
              minRating: number
              band: number
              iconAssetId: string
            }[]
          }
        }

        export type Rating = {
          timestamp: string
          rating: number
        }
      }
    }
    export namespace MASTERY {
      export type Player = {
        timestamp: string
        playerId: string
        currentLevel: number
        currentLevelXp: number
        xpToNextLevel: number
        totalXp: number
      }

      export type Character = {
        timestamp: string
        playerId: string
        characterMasteries: {
          chracterAssetName: string
          totalXp: number
          maxTier: number
          idxHighestTierCollected: number
          currentTier: number
          currentTierXp: number
          xpToNextTier: number
        }[]
      }
    }
    export namespace PLAYER {
      export type Characters = {
        timestamp: string
        characterAssetName: string[]
      }

      export type Emoticons = {
        timestamp: string
        emoticonAssetIds: string[]
      }

      export type UsernameQuery = {
        matches: Array<
          Pick<
            PROMETHEUS.RAW.Player,
            | 'username'
            | 'playerId'
            | 'logoId'
            | 'title'
            | 'nameplateId'
            | 'emoticonId'
            | 'titleId'
            | 'tags'
            | 'platformIds'
            | 'masteryLevel'
            | 'organization'
            | 'socialUrl'
          >
        >
      }
    }

    export namespace STATS {
      export type Player = {
        timestamp: string
        playerId: string

        playerStats: {
          playerId: string
          ratingName: 'NormalInitial' | 'RankedInitial' | 'None'
          roleStats: {
            Forward: {
              assists: number
              games: number
              knockouts: number
              losses: number
              mvp: number
              saves: number
              scores: number
              wins: number
            }
            Goalie: {
              assists: number
              games: number
              knockouts: number
              losses: number
              mvp: number
              saves: number
              scores: number
              wins: number
            }
          }
        }[]
        characterStats: {
          playerId: string
          characterId: string
          ratingName: 'NormalInitial' | 'RankedInitial' | 'None'
          roleStats: {
            Forward: {
              assists: number
              games: number
              knockouts: number
              losses: number
              mvp: number
              saves: number
              scores: number
              wins: number
            }
            Goalie: {
              assists: number
              games: number
              knockouts: number
              losses: number
              mvp: number
              saves: number
              scores: number
              wins: number
            }
          }
        }[]
        paging: PROMETHEUS.RAW.Paging & {
          page: number
        }
      }
    }
  }
}
