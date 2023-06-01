import { Injectable, SetMetadata, UseGuards } from '@nestjs/common'
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { GuideInputType, GuideObjectType } from './guide.types'
import { PrismaService } from 'src/prisma.service'
import { Guide } from '@prisma/client'
import { StrikrGuard } from 'src/auth/auth.guard'

@Resolver(() => GuideObjectType)
@Injectable()
export class GuideResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => GuideObjectType)
  async getGuide(
    @Args('id', { nullable: false })
    id: number,
  ) {
    return await this.prisma.guide.findUnique({
      where: {
        id,
      },
    })
  }

  @ResolveField()
  async author(@Parent() guide: Guide) {
    return await this.prisma.guide
      .findUnique({
        where: { id: guide.id },
      })
      .author()
  }

  @Query(() => [GuideObjectType])
  async getGuides() {
    return await this.prisma.guide.findMany({
      include: {
        author: true,
      },
    })
  }

  @UseGuards(StrikrGuard)
  @SetMetadata('userOnly', true)
  @Mutation(() => GuideObjectType, {})
  async createGuide(
    @Args('GuideCreateInput', { type: () => GuideInputType, nullable: false })
    guideCreateInput: Guide,
  ): Promise<Guide> {
    return await this.prisma.guide.create({
      data: {
        ...guideCreateInput,
      },
    })
  }

  @UseGuards(StrikrGuard)
  @SetMetadata('userOnly', true)
  @Mutation(() => GuideObjectType, {})
  async updateGuide(
    @Args('GuideUpdateInput', { type: () => GuideInputType, nullable: false })
    guideUpdateInput: Guide,
  ) {
    return await this.prisma.guide.update({
      where: {
        id: guideUpdateInput.id,
      },
      data: {
        ...guideUpdateInput,
      },
    })
  }
}
