import { Field, InputType, ObjectType, ResolveField } from '@nestjs/graphql'
import { GuideObjectType } from 'src/guides/guide.types'
import { PlayerObjectType } from 'src/players/player.types'

@ObjectType()
export class UserObjectType {
  @Field()
  id: number

  @Field()
  username: string

  @Field()
  isStaff: boolean

  @Field(() => PlayerObjectType, { nullable: true })
  player?: PlayerObjectType

  @Field(() => [GuideObjectType], { nullable: true })
  guides?: GuideObjectType[]
}

@ObjectType()
export class MeObjectType {
  @Field()
  id: number

  @Field()
  username: string

  @Field()
  email: string

  @Field()
  isStaff: boolean

  @Field(() => PlayerObjectType, { nullable: true })
  player?: PlayerObjectType

  @Field(() => [GuideObjectType], { nullable: true })
  guides?: GuideObjectType[]
}

@InputType()
export class CreateUserInputType {
  @Field()
  username: string

  @Field()
  password: string

  @Field()
  email: string
}

@InputType()
export class UpdateUserInputType {
  @Field({ nullable: true })
  username?: string

  @Field({ nullable: true })
  password?: string

  @Field({ nullable: true })
  email?: string
}
