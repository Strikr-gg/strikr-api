import { Injectable } from '@nestjs/common'
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql'
import { MatchInputType, MatchObjectType } from './match.types'
import { PrismaService } from 'src/prisma.service'
import { Match } from '@prisma/client'

@Resolver(() => MatchObjectType)
@Injectable()
export class MatchResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => MatchObjectType)
  async getMatch(
    @Args('id', { type: () => Int, nullable: false })
    id: number,
  ) {
    return this.prisma.match.findUnique({
      where: {
        id,
      },
    })
  }
}
