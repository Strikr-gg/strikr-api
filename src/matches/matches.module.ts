import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesResolver } from './matches.resolver';

@Module({
  providers: [MatchesResolver, MatchesService]
})
export class MatchesModule {}
