import { Args, Int, Query, Resolver } from '@nestjs/graphql'
import {
  leaderboardFilters,
  leaderboardResult,
  leaderboardRegions,
} from './leaderboard.types'
import { PrismaService } from 'src/prisma.service'

@Resolver()
export class LeaderboardResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => leaderboardResult, {
    description: 'Returns the whole snapshot of the leaderboard players.',
  })
  async getLeaderboard(
    @Args('region', {
      type: () => String,
      nullable: true,
      description:
        'The desired raw region id. Regions can be obtained with getLeadeboardRegions (Defaults to Global)',
    })
    region?: keyof typeof leaderboardRegions,
    @Args('filterBy', {
      type: () => leaderboardFilters,
      nullable: true,
      description:
        'Defines an object to use as sorter (Defaults to rank, accepts any numeric value from the leaderboardPlayerItem type)',
    })
    filterBy = leaderboardFilters['rank'],
    @Args('order', {
      type: () => String,
      nullable: true,
      description:
        'Defines the order of the leaderboard. Can be "asc" or "desc" (Defaults to asc)',
    })
    order?: string,
    @Args('limit', {
      type: () => Int,
      nullable: true,
      description:
        'Defines the limit of player per request (Defaults to 100, max of 1000)',
    })
    limit?: number,
    @Args('page', {
      type: () => Int,
      nullable: true,
      description: 'Defines the page of the leaderboard (Defaults to 0)',
    })
    page?: number,
    @Args('startrank', { type: () => Int, nullable: true })
    startrank?: number,
  ) {
    if (!order) {
      order = 'asc'
    }

    if (!region) {
      region = 'Global'
    }

    if (!limit) {
      limit = 100
    }

    if (limit > 1000) {
      limit = 1000
    }

    if (!page) {
      page = 0
    }

    let where: { [key: string]: any } = {
      region: region,
    }

    if (startrank) {
      where = {
        ...where,
        rating: {
          gte: startrank, // Adjust the range as needed
          lte: startrank + 99,
        },
      }
    }

    const result = await this.prisma.leaderboard.findMany({
      where,
      orderBy: {
        [leaderboardFilters[filterBy]]: order,
      },
      skip: limit * page,
    })

    return {
      players: result.slice(0, limit),
      total: result.length,
    }
  }

  @Query(() => [String])
  async getLeaderboardRegions() {
    return [
      'NorthAmerica',
      'Europe',
      'Asia',
      'SouthAmerica',
      'Oceania',
      'JapaneseLanguageText',
      'Global',
    ]
  }
}
