import { Injectable, SetMetadata, UseGuards } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { prometheusService } from 'src/odyssey/prometheus/service'

import { PrismaService } from 'src/prisma.service'
import {
  EsportsTournamentObjectType,
  EsportsTournamentInput,
  TeamInput,
  TeamObjectType,
  BracketPlayerObjectType,
} from './esports.types'
import { StrikrGuard } from 'src/auth/auth.guard'
import { EsportsService } from './esports.service'

@Resolver()
@Injectable()
export class EsportsResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly service: EsportsService,
  ) {}

  @Query(() => [EsportsTournamentObjectType])
  async getEsportsTournaments(
    @Args('limit', {
      type: () => Number,
      nullable: true,
      description: 'Amount to return (defaults to 10, max of 25)',
    })
    limit = 10,
    @Args('page', {
      type: () => Number,
      nullable: true,
      description: 'Page offset (defaults to 0)',
    })
    page = 0,
  ) {
    return await this.prisma.esport.findMany({
      take: limit,
      skip: page * limit,
    })
  }

  @UseGuards(StrikrGuard)
  @SetMetadata('staffOnly', true)
  @Mutation(() => EsportsTournamentObjectType)
  async createEsportsTournament(
    @Args('tournamentInput', { nullable: false })
    tournamentInput: EsportsTournamentInput,
  ) {
    return await this.prisma.esport.create({
      data: {
        ...tournamentInput,
      },
    })
  }

  @Mutation(() => [[BracketPlayerObjectType]])
  async seedTournament(
    @Args('teamsInput', { type: () => [TeamInput], nullable: false })
    teamsInput: TeamInput[],
  ) {
    const playerData = new Map<
      string,
      { username: string; playerId: string; rating: number; rank: number }
    >()
    const teamData = new Map<
      string,
      { username: string; playerId: string; rating: number; rank: number }[]
    >()

    for (const team of teamsInput) {
      teamData.set(team.name, [])

      for (const player of team.players) {
        try {
          const odysseyPlayer = await prometheusService.player.usernameQuery(
            player,
          )

          const playerOnLeaderboard =
            await prometheusService.ranked.leaderboard.ensureRegion(
              odysseyPlayer.playerId,
            )
          const playerInfo = {
            playerId: odysseyPlayer.playerId,
            rating: playerOnLeaderboard.player.rating,
            username: player,
            rank: playerOnLeaderboard.player.rank,
          }

          playerData.set(player, playerInfo)
          teamData.set(team.name, [...teamData.get(team.name), playerInfo])
        } catch {
          const playerInfo = {
            playerId: `(${player}) Not Found / Not on leaderboard`,
            rating: 0,
            username: player,
            rank: 10_001,
          }
          playerData.set(player, playerInfo)
          teamData.set(team.name, [...teamData.get(team.name), playerInfo])
        }
      }
    }

    const seedTeams: {
      name: string
      players: {
        username: string
        playerId: string
        rating: number
        rank: number
      }[]
    }[] = []

    for (const team of teamData) {
      seedTeams.push({
        name: team[0],
        players: team[1].map((player) => player),
      })
    }

    const seed = this.service.seedTournament(seedTeams)

    return seed
  }
}
