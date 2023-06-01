import { Field, InputType, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class AuthObjectType {
  @Field()
  id: number

  @Field()
  email: string

  @Field()
  token: string
}

@InputType()
export class AuthInputType {
  @Field({ nullable: true })
  email?: string

  @Field({ nullable: true })
  username?: string

  @Field()
  password: string
}
