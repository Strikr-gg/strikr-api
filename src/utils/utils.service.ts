import { Injectable } from '@nestjs/common'
import dayjs from 'dayjs'

@Injectable()
export class UtilsService {
  areDifferentDays(dateString1: string, dateString2: string) {
    const format = 'YYYY-MM-DD HH:mm'

    const date1 = dayjs(dateString1, format)
    const date2 = dayjs(dateString2, format)

    const isDifferentDays = !date1.isSame(date2, 'day')

    return isDifferentDays
  }
}
