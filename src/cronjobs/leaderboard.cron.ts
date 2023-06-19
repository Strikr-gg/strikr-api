import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import prometheusRankedService from 'src/odyssey/prometheus/ranked'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const ledearboardLogger = new Logger('Leaderboard')

@Injectable()
export class UpdateLearderboard {
  @Cron('0 */12 * * *')
  async handleCron() {
    const updates: Promise<any>[] = []
    for (const region of [
      'Global',
      'NorthAmerica',
      'Europe',
      'Asia',
      'SouthAmerica',
      'Oceania',
    ]) {
      await prisma.leaderboard.deleteMany({ where: { region } })
      updates.push(populateByBoardOffset(0, 25, region))
    }

    // Deleting all current players:

    Promise.all(updates)
  }
}

async function populateByBoardOffset(
  offset = 0,
  count = 25,
  region = 'Global',
) {
  ledearboardLogger.debug(
    `Updating leaderboard for ${region} with > Offset:${offset} Step: ${count}`,
  )
  const leaderboardPlayers = await prometheusRankedService.getLeaderboard(
    region,
    offset,
    count,
  )

  for (const player of leaderboardPlayers.players) {
    ledearboardLogger.debug(
      `Updating player ${player.playerId} #${player.rank} @ ${region}`,
    )
    await prisma.leaderboard.create({
      data: {
        playerId: player.playerId,
        region: region,
        losses: player.losses,
        rank: player.rank,
        rating: player.rating,
        topRole: player.topRole,
        wins: player.wins,
        emoticonId: player.emoticonId,
        masteryLevel: player.masteryLevel,
        socialUrl: player.socialUrl,
        tags: player.tags,
        titleId: player.titleId,
        username: player.username,
      },
    })
  }

  if (leaderboardPlayers.paging.totalItems > offset + count) {
    await populateByBoardOffset(offset + count, count, region)
  }
}

prisma.leaderboard
  .count({
    where: {
      region: 'Global',
    },
  })
  .then((count) => {
    if (count < 9999) {
      populateByBoardOffset(count, 25, 'Global')
    }
  })
