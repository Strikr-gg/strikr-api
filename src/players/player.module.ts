import { Module } from '@nestjs/common'
import { PlayerResolver } from './player.resolver'
import { UtilsService } from 'src/utils/utils.service'
import { PrismaService } from 'src/prisma.service'
import { PlayerService } from './player.service'

@Module({
  providers: [PlayerResolver, PrismaService, PlayerService, UtilsService],
})
export class PlayerModule {}
