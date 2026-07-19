import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';
import { HttpModule } from '@nestjs/axios';
import { PlaywrightModule } from '../playwright/playwright.module';
import { ConfigModule } from '@nestjs/config';
import { HomepageService } from './discovery/homepage/homepage.service';
import { LinkExtractorService } from './discovery/homepage/link-extractor.service';
import { CareerLinkMatcherService } from './discovery/homepage/link-scorer.service';

@Module({
  imports: [HttpModule, PlaywrightModule, ConfigModule],
  controllers: [ScraperController],
  providers: [
    ScraperService,
    HomepageService,
    LinkExtractorService,
    CareerLinkMatcherService,
  ],
})
export class ScraperModule {}
