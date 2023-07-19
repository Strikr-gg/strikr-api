import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'

export interface Team {
  name: string
  players: Player[]
}

export interface Player {
  username: string
  playerId: string
  rating: number
  rank: number
}

function calculateAverageRating(players: Player[]): number {
  const totalRating = players.reduce((sum, player) => sum + player.rating, 0)
  return totalRating / players.length
}

@Injectable()
export class EsportsService {
  constructor(private prisma: PrismaService) {}

  seedTournament = (teams: Team[]): Team[][] => {
    // Sort teams based on the average rating of their players
    const sortedTeams = teams.sort((teamA, teamB) => {
      const averageRatingA = calculateAverageRating(teamA.players)
      const averageRatingB = calculateAverageRating(teamB.players)
      return averageRatingB - averageRatingA // Sort in descending order
    })

    // Generate the bracket by dividing teams into pairs
    const bracket: Team[][] = []
    for (let i = 0; i < sortedTeams.length; i += 2) {
      const pair: Team[] = [sortedTeams[i], sortedTeams[i + 1]]
      bracket.push(pair)
    }

    return bracket
  }
}
