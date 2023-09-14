import { Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { PlayerCharacterRating } from '@prisma/client'
@Injectable()
export class UtilsService {
  areDifferentDays(dateString1: string, dateString2: string) {
    const format = 'YYYY-MM-DD HH:mm'

    const date1 = dayjs(dateString1, format)
    const date2 = dayjs(dateString2, format)

    const isDifferentDays = !date1.isSame(date2, 'day')

    return isDifferentDays
  }

  // calculateRankingScore({ wins, losses }: { wins: number; losses: number }) {
  //   let totalPoints = 0

  //   totalPoints = wins * 2
  //   totalPoints -= losses

  //   return totalPoints
  // }

  weightedAverage(nums: number[], weights: number[]) {
    const [sum, weightSum] = weights.reduce(
      (acc, w, i) => {
        acc[0] = acc[0] + nums[i] * w
        acc[1] = acc[1] + w
        return acc
      },
      [0, 0],
    )
    return sum / weightSum
  }
}
