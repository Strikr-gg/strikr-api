import {
  HttpException,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common'
import { Args, Parent, ResolveField, Resolver, Query } from '@nestjs/graphql'
import { StrikrGuard } from 'src/auth/auth.guard'
import { prometheusService } from 'src/odyssey/prometheus/service'
import {
  ProxyPlayerCharacterRatingObjectType,
  ProxyPlayerMasteryObjectType,
  ProxyPlayerObjectType,
  ProxyPlayerRatingObjectType,
} from './proxy.types'

@Resolver(() => ProxyPlayerObjectType)
@Injectable()
export class ProxyResolver {
  constructor() {
    //@Query(() => PlayerObjectType)
  }

  @UseGuards(StrikrGuard)
  @SetMetadata('staffOnly', true)
  @Query(() => ProxyPlayerObjectType, {
    description:
      'Use the Strikr service to query data directly from the game. This is a proxy & transformer to the game data and should not be used if your intention is to display player statistics since it does not contain any of the data that is stored in the database, this endpoint wont generate snapshots either. (OBSERVATION: Not processed by StrikrSmartCache) (OBSERVATION: userID and other data gathered exclusively from strikr will be either null or hold default values since theres no database connection being made on this endpoint) (WARNING: This endpoint requires STAFF TOKEN)',
  })
  public async proxyPlayer(
    @Args('name', {
      type: () => String,
      description: 'The player name to query',
    })
    name: string,
    @Args('region', {
      type: () => String,
      nullable: true,
      description: 'Filter by region',
    })
    region: string,
  ) {
    const basePlayerData = await prometheusService.player.usernameQuery(name)

    return {
      id: basePlayerData.playerId,
      userId: 0,
      username: basePlayerData.username,
      createdAt: new Date(),
      logoId: basePlayerData.logoId,
      nameplateId: basePlayerData.nameplateId,
      emoticonId: basePlayerData.emoticonId,
      titleId: basePlayerData.titleId,
      region: region || 'Global',
    } as ProxyPlayerObjectType
  }

  @ResolveField(() => ProxyPlayerMasteryObjectType)
  public async mastery(@Parent() player: ProxyPlayerObjectType) {
    const masteryData = await prometheusService.mastery.player(player.id, 0, 0)

    return masteryData
  }

  @ResolveField(() => [ProxyPlayerCharacterRatingObjectType])
  public async characterRatings(@Parent() player: ProxyPlayerObjectType) {
    const statsQuery = await prometheusService.stats.player(player.id)
    const characterRatings: ProxyPlayerCharacterRatingObjectType[] = []
    statsQuery.characterStats.forEach((cs) => {
      characterRatings.push({
        id: 0,
        playerId: player.id,
        player: player,
        character: cs.characterId,
        role: 'Forward',
        games: cs.roleStats.Forward.games,
        assists: cs.roleStats.Forward.assists,
        knockouts: cs.roleStats.Forward.knockouts,
        losses: cs.roleStats.Forward.losses,
        mvp: cs.roleStats.Forward.mvp,
        wins: cs.roleStats.Forward.wins,
        saves: cs.roleStats.Forward.saves,
        scores: cs.roleStats.Forward.scores,
        gamemode: cs.ratingName,
        createdAt: new Date(),
      })
      characterRatings.push({
        id: 0,
        playerId: player.id,
        player: player,
        character: cs.characterId,
        role: 'Goalie',
        games: cs.roleStats.Goalie.games,
        assists: cs.roleStats.Goalie.assists,
        knockouts: cs.roleStats.Goalie.knockouts,
        losses: cs.roleStats.Goalie.losses,
        mvp: cs.roleStats.Goalie.mvp,
        wins: cs.roleStats.Goalie.wins,
        saves: cs.roleStats.Goalie.saves,
        scores: cs.roleStats.Goalie.scores,
        gamemode: cs.ratingName,
        createdAt: new Date(),
      })
    })

    return characterRatings
  }

  @ResolveField(() => [ProxyPlayerRatingObjectType])
  public async proxyRatings(@Parent() player: ProxyPlayerObjectType) {
    try {
      const playerRankedData =
        await prometheusService.ranked.leaderboard.search(
          player.id,
          0,
          0,
          player.region,
        )

      if (!playerRankedData.players[0]) return []

      return [
        {
          id: 0,
          playerId: player.id,
          games: playerRankedData.players[0].games,
          losses: playerRankedData.players[0].losses,
          rating: playerRankedData.players[0].rating,
          wins: playerRankedData.players[0].wins,
          masteryLevel: 0,
          rank: playerRankedData.players[0].rank,
          createdAt: new Date(),
        },
      ]
    } catch {
      throw new HttpException('Player not found on provided leaderboard', 404)
    }
  }
}
