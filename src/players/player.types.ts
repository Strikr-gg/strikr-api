import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { UserObjectType } from 'src/users/user.types'

@ObjectType()
export class PlayerMasteryObjectType {
  @Field()
  createdAt: string

  @Field()
  playerId: string

  @Field()
  currentLevel: number

  @Field()
  currentLevelXp: number

  @Field()
  xpToNextLevel: number

  @Field()
  totalXp: number
}

@ObjectType()
export class PlayerCharacterMasteryItemObjectType {
  @Field()
  characterAssetName: string

  @Field()
  totalXp: number

  @Field()
  maxTier: number

  @Field()
  idxHighestTierCollected: number

  @Field()
  currentTier: number

  @Field()
  currentTierXp: number

  @Field()
  xpToNextTier: number
}

@ObjectType()
export class PlayerCharacterMasteryObjectType {
  @Field()
  createdAt: string

  @Field()
  playerId: string

  @Field(() => [PlayerCharacterMasteryItemObjectType])
  characterMasteries: PlayerCharacterMasteryItemObjectType[]
}

@ObjectType()
export class PlayerObjectType {
  @Field()
  id: string

  @Field({ nullable: true })
  userId?: number

  @Field()
  username: string

  @Field(() => UserObjectType, { nullable: true })
  user: UserObjectType

  @Field(() => [PlayerRatingObjectType], { nullable: true })
  ratings: PlayerRatingObjectType[]

  @Field(() => [PlayerCharacterRatingObjectType], { nullable: true })
  characterRatings: PlayerCharacterRatingObjectType[]

  // @Field(() => [MatchOnPlayerObjectType], { nullable: true })
  // matches: MatchOnPlayerObjectType[]

  @Field({ nullable: true })
  logoId?: string

  @Field({ nullable: true })
  nameplateId?: string

  @Field()
  emoticonId?: string

  @Field({ nullable: true })
  titleId?: string

  @Field({ nullable: true })
  createdAt?: Date

  @Field({ nullable: true })
  updatedAt?: Date

  @Field()
  region: string

  @Field(() => PlayerMasteryObjectType, { nullable: true })
  mastery: PlayerMasteryObjectType

  @Field(() => [String], { nullable: true })
  tags: string[]

  @Field(() => PlayerCharacterMasteryObjectType, { nullable: true })
  characterMastery: PlayerCharacterMasteryObjectType
}

@ObjectType()
export class PlayerRatingObjectType {
  @Field()
  id: number

  @Field()
  playerId: string

  @Field()
  rating: number

  @Field()
  masteryLevel: number

  @Field()
  games: number

  @Field()
  rank: number

  @Field()
  wins: number

  @Field()
  losses: number

  @Field({ nullable: true })
  createdAt?: Date
}

@ObjectType()
export class PilotAutocompleteObjectType {
  @Field()
  username: string

  @Field()
  emoticonId: string

  @Field()
  region: string

  @Field(() => [String])
  tags: string[]
}

// @ObjectType()
// export class MatchOnPlayerObjectType {
//   @Field()
//   id: number

//   @Field()
//   playerId: string

//   @Field()
//   matchId: string

//   @Field({ nullable: true })
//   createdAt?: Date

//   @Field(() => MatchObjectType)
//   match: MatchObjectType
// }

@ObjectType()
export class PlayerCharacterRatingObjectType {
  @Field()
  id: number

  @Field()
  playerId: string

  @Field(() => PlayerObjectType, { nullable: false })
  player: PlayerObjectType

  @Field()
  character: string

  @Field()
  role: 'Forward' | 'Goalie'

  @Field()
  games: number

  @Field()
  assists: number

  @Field()
  knockouts: number

  @Field()
  losses: number

  @Field()
  mvp: number

  @Field()
  saves: number

  @Field()
  scores: number

  @Field()
  wins: number

  @Field()
  gamemode: string

  @Field()
  createdAt: Date
}

@InputType()
export class PlayerInputType {
  @Field()
  userId?: number

  @Field()
  username: string

  @Field(() => [PlayerCharacterRatingInputType], { nullable: true })
  ratings: PlayerCharacterRatingInputType[]

  @Field({ nullable: true })
  logoId?: string

  @Field({ nullable: true })
  nameplareId?: string

  @Field({ nullable: true })
  emoticonId?: string

  @Field({ nullable: true })
  titleId?: string

  @Field({ nullable: true })
  nameplateId?: string
}

@InputType()
export class PlayerRatingInputType {
  @Field()
  playerId: string

  @Field()
  rating: number

  @Field()
  games: number

  @Field()
  rank: number

  @Field()
  wins: number

  @Field()
  losses: number

  @Field()
  masteryLevel: number
}

// @InputType()
// export class PlayerMatchInputType {
//   @Field()
//   playerId: string

//   @Field()
//   matchId: string
// }

@InputType()
export class PlayerCharacterRatingInputType {
  @Field()
  playerId: string

  @Field()
  character: string

  @Field()
  role: 'Forward' | 'Goalie'

  @Field()
  games: number

  @Field()
  assists: number

  @Field()
  knockouts: number

  @Field()
  losses: number

  @Field()
  mvp: number

  @Field()
  saves: number

  @Field()
  scores: number

  @Field()
  wins: number

  @Field()
  gamemode: string
}
