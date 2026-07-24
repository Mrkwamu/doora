import { Body, Controller, Get } from '@nestjs/common';

import { HomepageService } from './homepage/homepage.service';

@Controller('scrape')
export class ScraperController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get()
  FindCareerPage(@Body('company') body: string) {
    return this.homepageService.fetchHomepage(body);
  }
}
