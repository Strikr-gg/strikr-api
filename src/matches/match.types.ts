import { Field, InputType, Int, ObjectType } from '@nestjs/graphql'
import { PlayerObjectType } from 'src/players/player.types'

@ObjectType()
export class MatchObjectType {
  @Field()
  id: number

  @Field()
  map: string

  @Field()
  gamemode: string

  @Field()
  startTime: string

  @Field()
  endTime: string

  @Field(() => [PlayerObjectType])
  players: PlayerObjectType
}

@InputType()
export class MatchInputType {
  @Field()
  map: string

  @Field()
  gamemode: string

  @Field()
  startTime: string

  @Field()
  endTime: string

  @Field(() => [Int])
  players: number[]
}
