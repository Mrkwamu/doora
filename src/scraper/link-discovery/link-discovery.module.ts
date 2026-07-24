import { Module } from '@nestjs/common';
import { LinkExtractorService } from './link-extractor.service';
import { LinkScorerService } from './link-scorer.service';

@Module({
  providers: [LinkExtractorService, LinkScorerService],
  exports: [LinkExtractorService, LinkScorerService],
})
export class LinkDiscoveryModule {}
