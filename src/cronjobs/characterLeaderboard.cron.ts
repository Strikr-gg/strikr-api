import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CharacterLeaderboard, PrismaClient } from '@prisma/client'
import { UtilsService } from 'src/utils/utils.service'
const prisma = new PrismaClient()

const CharacterLeaderboardLogger = new Logger('CharacterLeaderboard')

@Injectable()
export class UpdateCharacterLeaderboard {
  @Cron('0 */8 * * *')
  async handleCron() {
    //
  }
}

async function calculateCharacterLeaderboard(page = 0) {
  CharacterLeaderboardLogger.log('Updating Character Leaderboard')

  const ratings = await prisma.playerCharacterRating.findMany({
    where: {
      gamemode: 'RankedInitial',
      player: {
        ratings: {
          every: {
            rating: {
              gt: 2500,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      character: true,
      wins: true,
      losses: true,
      role: true,
      mvp: true,
      player: {
        select: {
          username: true,
          emoticonId: true,
          nameplateId: true,
          region: true,
          id: true,
          socialUrl: true,
          ratings: {
            select: {
              rating: true,
              rank: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      },
    },
    take: 50,
    skip: page * 50,
    distinct: ['character', 'playerId', 'role'],
  })

  const dataSets = []

  for (const rating of ratings) {
    CharacterLeaderboardLogger.debug(
      `Iterating over rating ${rating.player.username} with ${rating.character} @ ${rating.role}`,
    )

    if (!rating.player.ratings[0] || rating.player.ratings[0].rating === 0) {
      CharacterLeaderboardLogger.log(
        `No ratings for ${rating.player.username} | skipping`,
      )
      continue
    }

    if (rating.wins + rating.losses < 100) {
      continue
    }

    CharacterLeaderboardLogger.log(
      `W:${rating.wins} L:${rating.losses} WR:${
        (rating.wins / (rating.wins + rating.losses)) * 100
      } MVP:${rating.mvp} R:${rating.player.ratings[0].rating}`,
    )

    const weightedAverage = new UtilsService().weightedAverage(
      [rating.wins, rating.losses, rating.mvp, rating.player.ratings[0].rating],
      [0.16, -1, 2, 1],
    )

    dataSets.push({
      playerId: rating.player.id,
      character: rating.character,
      role: rating.role,
      wins: rating.wins,
      losses: rating.losses,
      leaderboardPoints: ~~weightedAverage,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CharacterLeaderboard)
  }

  await prisma.characterLeaderboard.createMany({
    data: [...dataSets],
  })

  if (ratings.length === 50) {
    await calculateCharacterLeaderboard(page + 1)
  }
}

calculateCharacterLeaderboard()
