import { Module } from '@nestjs/common'
import { EsportsResolver } from './esports.resolver'
import { PrismaService } from 'src/prisma.service'
import { EsportsService } from './esports.service'

@Module({
  providers: [EsportsResolver, PrismaService, EsportsService],
})
export class EsportsModule {}
