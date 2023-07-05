import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
// Extend Day.js with the customParseFormat plugin
dayjs.extend(customParseFormat)

@Injectable()
export class PlayerService {
  constructor(private readonly prisma: PrismaService) {}

  getPlayer(id: string) {
    return this.prisma.player.findUnique({
      where: {
        id: id,
      },
    })
  }

  getPlayerByName(name: string) {
    return this.prisma.player.findUnique({
      where: {
        username: name,
      },
    })
  }

  getPlayerRatings(id: string, take = 7) {
    return this.prisma.playerRating.findMany({
      take,
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        playerId: id,
      },
    })
  }

  getLatestCharacterRatings(playerId: string, take = 57) {
    if (!playerId) {
      return
    }

    return this.prisma.playerCharacterRating.findMany({
      where: {
        playerId: playerId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['character', 'gamemode'],
      take,
    })
  }
}
