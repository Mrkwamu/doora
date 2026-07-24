import { Module } from '@nestjs/common';
import { PageFetcherService } from './page-fetcher.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PlaywrightModule } from '../../playwright/playwright.module';

@Module({
  imports: [HttpModule, PlaywrightModule, ConfigModule],
  providers: [PageFetcherService],
  exports: [PageFetcherService],
})
export class PageFetcherModule {}
