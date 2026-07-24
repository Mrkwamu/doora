import { Module } from '@nestjs/common';
import { LinkDiscoveryModule } from '../link-discovery/link-discovery.module';
import { HomepageService } from './homepage.service';
import { PageFetcherModule } from '../page-fetcher/page-fetcher.module';

@Module({
  imports: [PageFetcherModule, LinkDiscoveryModule],
  providers: [HomepageService],
  exports: [HomepageService],
})
export class HomepageModule {}
