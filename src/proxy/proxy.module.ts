import { Module } from '@nestjs/common'
import { ProxyResolver } from './proxy.resolver'
@Module({
  controllers: [],
  providers: [ProxyResolver],
})
export class ProxyModule {}
