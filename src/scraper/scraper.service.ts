import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightService } from '../playwright/playwright.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly playwrightService: PlaywrightService,
    private readonly configService: ConfigService,
  ) {}
}
