import { Module } from '@nestjs/common'
import { PlayerResolver } from './proxy.resolver'
@Module({
  controllers: [],
  providers: [PlayerResolver],
})
export class ProxyModule {}
