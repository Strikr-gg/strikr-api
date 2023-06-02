import { Injectable, SetMetadata, UseGuards } from '@nestjs/common'
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import {
  CreateUserInputType,
  UpdateUserInputType,
  UserObjectType,
} from './user.types'
import { PrismaService } from 'src/prisma.service'
import * as bcrypt from 'bcrypt'
import { PlayerObjectType } from 'src/players/player.types'
import { GuideObjectType } from 'src/guides/guide.types'
import { StrikrGuard } from 'src/auth/auth.guard'

export interface CreateUserInput {
  username: string
  password: string
  email: string
}

@Resolver(() => UserObjectType)
@Injectable()
export class UserResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => UserObjectType)
  async getUser(
    @Args('username', { nullable: false })
    username: string,
  ) {
    return this.prisma.user.findUnique({
      where: {
        username: username,
      },
    })
  }

  // TODO: query { me }

  @UseGuards(StrikrGuard)
  @SetMetadata('userOnly', true)
  @Query(() => UserObjectType)
  async me() {
    return await this.prisma.user.findUnique({
      where: {
        id: 1,
      },
    })
  }

  @Query(() => [UserObjectType])
  async getUsers() {
    return await this.prisma.user.findMany()
  }

  @Mutation(() => UserObjectType)
  async createUser(
    @Args('UserCreateInput', {
      type: () => CreateUserInputType,
      nullable: false,
    })
    createUserInput: CreateUserInput,
  ) {
    const password: string = await bcrypt.hash(createUserInput.password, 10)
    return await this.prisma.user.create({
      data: {
        ...createUserInput,
        password,
      },
    })
  }

  @UseGuards(StrikrGuard)
  @SetMetadata('staffOnly', true)
  @Mutation(() => UserObjectType)
  async deleteUser(
    @Args('username', { nullable: false })
    username: string,
  ) {
    return await this.prisma.user.delete({
      where: {
        username: username,
      },
    })
  }

  @Mutation(() => UserObjectType)
  async updateUser(
    @Args('id', { nullable: false })
    id: number,
    @Args('UserUpdateInput', {
      type: () => UpdateUserInputType,
      nullable: false,
    })
    updateUserInput: CreateUserInput,
  ) {
    return await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        email: updateUserInput.email,
        password: await bcrypt.hash(updateUserInput.password, 10),
        username: updateUserInput.username,
      },
    })
  }

  @ResolveField(() => PlayerObjectType, { nullable: true })
  async player(@Parent() user: UserObjectType) {
    return await this.prisma.user
      .findUnique({
        where: { id: user.id },
      })
      .player()
  }

  @ResolveField(() => [GuideObjectType], { nullable: true })
  async guides(@Parent() user: UserObjectType) {
    return await this.prisma.user
      .findUnique({
        where: { id: user.id },
      })
      .guides()
  }
}
