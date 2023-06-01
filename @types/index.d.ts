export namespace ODYSSEY {
  export namespace RAW {
    export interface Player {
      username: string
      playerId: string
      logoId: string
      title: string
      nameplateId: string
      emoticonId: string
      titleId: string
      tags: any[]
      platformIds: PlatformIds
      masteryLevel: number
      organization: Organization
      rank: number
      wins: number
      losses: number
      games: number
      topRole: string
      rating: number
      mostPlayedCharacters: MostPlayedCharacter[]
      currentDivisionId: string
      progressToNext: number
    }

    export interface PlayerQueryMatch {
      username: string
      playerId: string
      logoId: string
      title: string
      nameplateId: string
      emoticonId: string
      titleId: string
      tags: any[]
      platformIds: PlatformIds
      masteryLevel: number
      organization: Organization
    }

    export interface MostPlayedCharacter {
      characterId: string
      gamesPlayed: number
    }

    export interface Paging {
      startRank: number
      pageSize: number
      totalItems: number
    }

    export interface Organization {
      organizationId: string
      logoId: string
      name: string
    }

    export type Regions =
      | 'NorthAmerica'
      | 'SouthAmerica'
      | 'Europe'
      | 'Asia'
      | 'Oceania'

    export interface Season {
      id: string
      name: string
      description: string
      startTime: string
      endTime: string
      ratingTiers: RatingTier[]
    }

    export interface RatingTier {
      tierId: string
      tierName: string
      minRating: number
      band: number
      iconAssetId: string
    }

    export interface PlayerStat {
      playerId: string
      ratingName: string
      roleStats: RoleStats
    }

    export interface RoleStat {
      assists: number
      games: number
      knockouts: number
      losses: number
      mvp: number
      saves: number
      scores: number
      wins: number
    }

    export interface RoleStats {
      Forward: RoleStat
      Goalie: RoleStat
    }

    export interface CharacterStat {
      playerId: string
      characterId: string
      ratingName: string
      roleStats: RoleStats
    }

    export interface PlayerMastery {
      timestamp: string
      playerId: string
      currentLevel: number
      currentLevelXp: number
      xpToNextLevel: number
      totalXp: number
    }

    export interface PlayerCharacterMastery {
      characterAssetName: string
      totalXp: number
      maxTier: number
      idxHighestTierCollected: number
      currentTier: number
      currentTierXp: number
      xpToNextTier: number
    }
  }

  export namespace PROMETHEUS {
    export interface LeaderboardSearch {
      players: ODYSSEY.RAW.Player[]
      paging: Paging
    }

    export interface LeaderboardPlayers {
      players: Player[]
      paging: ODYSSEY.RAW.Paging
      specificRegion: string
    }

    export interface CurrentSeason {
      timestamp: string
      season: ODYSSEY.RAW.Season
    }

    export interface PlayerStats {
      timestamp: string
      playerId: string
      playerStats: ODYSSEY.RAW.PlayerStat[]
      characterStats: ODYSSEY.RAW.CharacterStat[]
    }

    export interface PlayerEmoticons {
      timestamp: string
      emoticonAssetIds: string[]
    }

    export interface PlayerChracters {
      timestamp: string
      characterAssetNames: string[]
    }

    export interface PlayerQuery {
      matches: ODYSSEY.RAW.PlayerQueryMatch[]
      paging: ODYSSEY.RAW.Paging
    }

    export type PlayerMastery = ODYSSEY.RAW.PlayerMastery

    export interface PlayerCharacterMastery {
      timestamp: string
      playerId: string
      characterMasteries: ODYSSEY.RAW.PlayerCharacterMastery[]
    }
  }
}
