import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'

export enum leaderboardRegions {
  'NorthAmerica',
  'Europe',
  'Asia',
  'SouthAmerica',
  'Oceania',
  'JapaneseLanguageText',
  'Global',
}

export enum leaderboardFilters {
  'rank',
  'wins',
  'losses',
  'rating',
  'masteryLevel',
  'toprole',
}

registerEnumType(leaderboardRegions, {
  name: 'leaderboardRegions',
  description: 'The available regions for the game leaderboard.',
})

registerEnumType(leaderboardFilters, {
  name: 'leaderboardFilters',
  description: 'The available filters for the game leaderboard.',
})

@ObjectType()
export class leaderboardPlayerItem {
  @Field(() => String)
  createdAt: string

  @Field(() => String)
  playerId: string

  @Field(() => String)
  region: string

  @Field({ nullable: true })
  emoticonId: string

  @Field({ nullable: true })
  titleId: string

  @Field(() => [String], { nullable: true })
  tags: string[]

  @Field(() => String, { nullable: true })
  socialUrl: string[]

  @Field(() => Number)
  rank: number

  @Field(() => Number)
  wins: number

  @Field(() => Number)
  losses: number

  @Field(() => Number)
  rating: number

  @Field(() => String)
  topRole: string

  @Field(() => String)
  username: string
}
