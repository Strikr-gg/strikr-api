import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { GraphQLModule } from '@nestjs/graphql'
import { join } from 'path'
import { PrismaService } from 'src/prisma.service'
import { AuthService } from 'src/auth/auth.service'
import { ScheduleModule } from '@nestjs/schedule'
import { JwtModule } from '@nestjs/jwt'
import { PlayerModule } from 'src/players/player.module'
import { UtilsService } from 'src/utils/utils.service'
import { UpdateLearderboard } from 'src/cronjobs/leaderboard.cron'
import { FetchCorestrike } from 'src/cronjobs/corestrikr.cron'
import { LeaderboardModule } from 'src/leaderboard/leaderboard.module'
import { EsportsModule } from 'src/esports/esports.module'
import { ProxyModule } from 'src/proxy/proxy.module'
import { UserResolver } from 'src/users/user.resolver'
import { AuthResolver } from 'src/auth/auth.resolver'
import { ApolloServerErrorCode } from '@apollo/server/errors'
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      // playground: process.env.DEVELOPMENT === 'true',
      playground: true,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      allowBatchedHttpRequests: true,
      includeStacktraceInErrorResponses: false,
      formatError: (formattedError, error) => {
        return {
          message: formattedError.message,
        }
      },
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '3d',
      },
    }),
    PlayerModule,
    LeaderboardModule,
    EsportsModule,
    ScheduleModule.forRoot(),
    ProxyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    UtilsService,
    AuthService,
    UpdateLearderboard,
    FetchCorestrike,
    // GuideResolver,
    UserResolver,
    // PlayerResolver,
    AuthResolver,
  ],
})
export class AppModule {}
