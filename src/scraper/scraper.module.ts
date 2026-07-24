import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { LinkDiscoveryModule } from './link-discovery/link-discovery.module';
import { HomepageModule } from './homepage/homepage.module';
import { PageFetcherModule } from './page-fetcher/page-fetcher.module';

@Module({
  imports: [PageFetcherModule, HomepageModule, LinkDiscoveryModule],
  controllers: [ScraperController],
})
export class ScraperModule {}
