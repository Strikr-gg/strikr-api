import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { UserObjectType } from 'src/users/user.types'

@ObjectType()
export class ProxyPlayerMasteryObjectType {
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
export class ProxyPlayerCharacterMasteryItemObjectType {
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
export class ProxyPlayerCharacterMasteryObjectType {
  @Field()
  createdAt: string

  @Field()
  playerId: string

  @Field(() => [ProxyPlayerCharacterMasteryItemObjectType])
  characterMasteries: ProxyPlayerCharacterMasteryItemObjectType[]
}

@ObjectType()
export class ProxyPlayerObjectType {
  @Field()
  id: string

  @Field({ nullable: true })
  userId?: number

  @Field()
  username: string

  @Field(() => UserObjectType, { nullable: true })
  user?: UserObjectType

  @Field(() => [ProxyPlayerRatingObjectType], { nullable: true })
  proxyRatings?: ProxyPlayerRatingObjectType[]

  @Field(() => [ProxyPlayerCharacterRatingObjectType], { nullable: true })
  characterRatings?: ProxyPlayerCharacterRatingObjectType[]

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

  @Field(() => String, { nullable: false })
  region: string

  @Field(() => ProxyPlayerMasteryObjectType, { nullable: true })
  mastery?: ProxyPlayerMasteryObjectType

  @Field(() => [String], { nullable: true })
  tags?: string[]

  @Field(() => ProxyPlayerCharacterMasteryObjectType, { nullable: true })
  proxyCharacterMastery?: ProxyPlayerCharacterMasteryObjectType
}

@ObjectType()
export class ProxyPlayerRatingObjectType {
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
export class ProxyPilotAutocompleteObjectType {
  @Field()
  username: string

  @Field()
  emoticonId: string

  @Field()
  region: string

  @Field(() => [String])
  tags: string[]
}

@ObjectType()
export class ProxyPlayerCharacterRatingObjectType {
  @Field()
  id: number

  @Field()
  playerId: string

  @Field(() => ProxyPlayerObjectType, { nullable: false })
  player: ProxyPlayerObjectType

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
