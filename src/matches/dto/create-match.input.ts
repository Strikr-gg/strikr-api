import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateMatchInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
