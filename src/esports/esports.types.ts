import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class EsportsTournamentObjectType {
  @Field(() => String)
  name: string

  @Field(() => String)
  detail: string

  @Field(() => String, { nullable: true })
  image?: string

  @Field(() => String)
  region: string

  @Field(() => String)
  stream: string

  @Field(() => String, { nullable: true })
  url?: string
}

@InputType()
export class EsportsTournamentInput {
  @Field(() => String)
  name: string

  @Field(() => String)
  detail: string

  @Field(() => String, { nullable: true })
  image: string

  @Field(() => String)
  region: string

  @Field(() => String)
  stream: string

  @Field(() => String, { nullable: true })
  url?: string
}

@ObjectType()
export class BracketPlayerObjectType {
  @Field(() => String)
  username: string
  @Field(() => String)
  playerId: string
  @Field(() => Int)
  rating: number
  @Field(() => Int)
  rank: number
}

@ObjectType()
export class TeamObjectType {
  @Field(() => String)
  name: string

  @Field(() => [String])
  players: string[]
}

@InputType()
export class TeamInput {
  @Field(() => String)
  name: string

  @Field(() => [String])
  players: string[]
}
