import { Args, Int, Query, Resolver } from '@nestjs/graphql'
import {
  leaderboardFilters,
  leaderboardPlayerItem,
  leaderboardRegions,
} from './leaderboard.types'
import { PrismaService } from 'src/prisma.service'
import { filter } from 'rxjs'

@Resolver()
export class LeaderboardResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => [leaderboardPlayerItem], {
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

    const result = await this.prisma.leaderboard.findMany({
      ...(region ? { where: { region } } : {}),
      orderBy: {
        [leaderboardFilters[filterBy]]: order,
      },
      take: limit ? 50 : limit,
      skip: limit * page,
    })

    return result
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
