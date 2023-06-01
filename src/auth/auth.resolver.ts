import { Injectable } from '@nestjs/common'
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql'
import { AuthInputType, AuthObjectType } from './auth.types'
import { AuthService } from './auth.service'

@Resolver(() => AuthObjectType)
@Injectable()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // @Query(() => AuthObjectType)
  // async getAuth(
  //   @Args('id', { nullable: false })
  //   id: number,
  // ) {
  //   return await this.prisma.Auth.findUnique({
  //     where: {
  //       id,
  //     },
  //   })
  // }

  // @ResolveField()
  // async author(@Parent() Auth: Auth) {
  //   return await this.prisma.Auth
  //     .findUnique({
  //       where: { id: Auth.id },
  //     })
  //     .author()
  // }

  @Mutation(() => AuthObjectType)
  async login(
    @Args('loginInput', { nullable: false }) loginInput: AuthInputType,
  ) {
    return this.authService.loginUser(loginInput)
  }
}
