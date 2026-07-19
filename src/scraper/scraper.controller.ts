import { Body, Controller, Get } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { HomepageService } from './discovery/homepage/homepage.service';

@Controller('scrape')
export class ScraperController {
  constructor(
    private readonly service: ScraperService,
    private readonly homepageService: HomepageService,
  ) {}

  @Get()
  FindCareerPage(@Body('company') body: string) {
    return this.homepageService.details(body);
  }
}
