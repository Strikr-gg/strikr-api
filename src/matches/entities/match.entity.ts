import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Match {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
