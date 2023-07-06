import { Module } from '@nestjs/common'
import { LeaderboardResolver } from './leaderboard.resolver'
import { PrismaService } from 'src/prisma.service'

@Module({
  providers: [LeaderboardResolver, PrismaService],
})
export class LeaderboardModule {}
