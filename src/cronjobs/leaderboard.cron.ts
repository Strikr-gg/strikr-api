import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { prometheusService } from 'src/odyssey/prometheus/service'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const ledearboardLogger = new Logger('Leaderboard')

type Regions =
  | 'Global'
  | 'NorthAmerica'
  | 'Europe'
  | 'Asia'
  | 'SouthAmerica'
  | 'Oceania'
  | 'JapaneseLanguageText'
@Injectable()
export class UpdateLearderboard {
  @Cron('0 */6 * * *')
  async handleCron() {
    const updates: Promise<any>[] = []
    for (const region of [
      'Global',
      'NorthAmerica',
      'Europe',
      'Asia',
      'SouthAmerica',
      'Oceania',
      'JapaneseTextLanguage',
    ]) {
      // Deleting all current players:
      updates.push(populateByBoardOffset(0, 25, region as Regions))
    }
    await prisma.leaderboard.deleteMany()
    await Promise.all(updates)
  }
}

async function populateByBoardOffset(offset = 0, count = 25, region?: Regions) {
  ledearboardLogger.debug(
    `Updating leaderboard for ${region} with > Offset:${offset} Step: ${count}`,
  )
  const leaderboardPlayers = await prometheusService.ranked.leaderboard.players(
    offset,
    count,
    region === 'Global' ? undefined : region,
  )

  for (const player of leaderboardPlayers.players) {
    ledearboardLogger.debug(
      `Updating player ${player.playerId} #${player.rank} @ ${region}`,
    )
    try {
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
    } catch (e) {
      ledearboardLogger.error(
        `Error updating player ${player.playerId} #${player.rank} @ ${region}: ${e}`,
      )
    }
  }

  if (leaderboardPlayers.paging.totalItems > offset + count) {
    await populateByBoardOffset(offset + count, count, region)
  }
}

;(async () => {
  await prisma.leaderboard.deleteMany()
  populateByBoardOffset(0, 25, 'Global')
  populateByBoardOffset(0, 25, 'NorthAmerica')
  populateByBoardOffset(0, 25, 'SouthAmerica')
  populateByBoardOffset(0, 25, 'Europe')
  populateByBoardOffset(0, 25, 'Asia')
  populateByBoardOffset(0, 25, 'Oceania')
  populateByBoardOffset(0, 25, 'JapaneseLanguageText')
})()
