import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { GraphQLModule } from '@nestjs/graphql'
import { join } from 'path'
import { GuideResolver } from 'src/guides/guide.resolver'
import { UserResolver } from 'src/users/user.resolver'
import { PrismaService } from 'src/prisma.service'
import { PlayerResolver } from 'src/players/player.resolver'
import { AuthService } from 'src/auth/auth.service'
import { AuthResolver } from 'src/auth/auth.resolver'
import { JwtModule } from '@nestjs/jwt'

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: true,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '3d',
      },
    }),
  ],
  controllers: [AppController],
  providers: [
    PrismaService,
    AppService,
    AuthService,
    GuideResolver,
    UserResolver,
    PlayerResolver,
    AuthResolver,
  ],
})
export class AppModule {}
