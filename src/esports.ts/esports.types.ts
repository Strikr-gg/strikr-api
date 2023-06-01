import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { UserObjectType } from 'src/users/user.types'

@ObjectType()
export class GuideObjectType {
  @Field()
  id: number

  @Field()
  title: string

  @Field()
  content: string

  @Field()
  authorId: number

  @Field(() => UserObjectType, { nullable: false })
  author: UserObjectType

  @Field()
  role: 'Goalie' | 'Forward' | 'Flex'

  @Field(() => [String], { nullable: true })
  pref_awakenings?: string[]

  @Field(() => [String], { nullable: true })
  situ_awakenings?: string[]

  @Field(() => [String], { nullable: true })
  nogo_awakenings?: string[]

  @Field()
  createdAt: Date

  @Field()
  updatedAt: Date
}

@InputType()
export class GuideInputType {
  @Field()
  title: string

  @Field()
  content: string

  @Field()
  authorId: number

  @Field({ nullable: true })
  role?: 'Goalie' | 'Forward' | 'Flex'

  @Field({ nullable: true })
  character: string

  @Field(() => [String], { nullable: true })
  pref_awakenings?: string[]

  @Field(() => [String], { nullable: true })
  situ_awakenings?: string[]

  @Field(() => [String], { nullable: true })
  nogo_awakenings?: string[]
}
