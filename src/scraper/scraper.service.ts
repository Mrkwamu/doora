import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { PlaywrightService } from '../playwright/playwright.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { CareerPageResult } from './scraper.dto';

const CAREER_PATHS = [
  '/careers',
  '/career',
  '/jobs',
  '/careers/jobs',
  '/join-us',
  '/work-with-us',
  '/open-roles',
  '/openings',
  '/vacancies',
  '/hiring',
];

const DOMAIN_LEVEL_FAILURES = new Set(['ENOTFOUND', 'EAI_AGAIN']);

const TRANSIENT_FAILURES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNABORTED',
]);

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly userAgent: string;
  private readonly timeout: number;
  constructor(
    private readonly httpService: HttpService,
    private readonly playwrightService: PlaywrightService,
    private readonly configService: ConfigService,
  ) {
    this.userAgent = this.configService.getOrThrow<string>('USER_AGENT');
    this.timeout = Number(
      this.configService.getOrThrow<string>('REQUEST_TIMEOUT_MS'),
    );
  }

  async findcareerPage(company: string): Promise<CareerPageResult> {
    for (const path of CAREER_PATHS) {
      const url = `https://${company}${path}`;

      try {
        const response = await lastValueFrom(
          this.httpService.get(url, {
            timeout: this.timeout,
            headers: {
              'User-Agent': this.userAgent,
            },
          }),
        );

        if (response.status === 200) {
          this.logger.log(`Found via axios: ${url}`);
          return {
            status: 'found',
            url,
            method: 'axios',
          };
        }
      } catch (error) {
        const result = await this.handleRequestError(error, url);

        if (result === 'invalid_domain') {
          return { status: 'invalid_domain', url: null, method: null };
        }

        if (result) {
          // A URL string means Playwright succeeded.
          return { status: 'found', url: result, method: 'playwright' };
        }
      }
    }

    return { status: 'not_found', url: null, method: null };
  }

  private async handleRequestError(
    error: unknown,
    url: string,
  ): Promise<'invalid_domain' | string | null> {
    if (!axios.isAxiosError(error)) {
      this.logger.error(`Unexpected non-axios error on ${url}`, error);
      return null;
    }

    if (error.response) {
      const status = error.response.status;

      if (status === 403 || status === 401) {
        return this.tryPlaywright(url);
      }
      if (status === 404) {
        this.logger.debug(`${url} not found`);
      }
      if (status >= 500) {
        this.logger.warn(`${url} server error ${status}`);
        return null;
      }

      this.logger.debug(`${url} unhandled status ${status}`);
      return null;
    }

    const code = error.code;

    if (code && DOMAIN_LEVEL_FAILURES.has(code)) {
      this.logger.warn(`Domain unreachable (${code}) for ${url}`);
      return 'invalid_domain';
    }

    if (code && TRANSIENT_FAILURES.has(code)) {
      this.logger.warn(`Transient network error (${code}) on ${url}`);
      return null;
    }

    this.logger.error(`Unhandled axios error code on ${url}`, {
      code,
      message: error.message,
    });
    return null;
  }

  private async tryPlaywright(url: string): Promise<string | null> {
    const browser = this.playwrightService.getBrowser();
    const context = await browser.newContext({
      userAgent: this.userAgent,
    });

    try {
      const page = await context.newPage();
      const response = await page.goto(url, {
        timeout: this.timeout,
        waitUntil: 'domcontentloaded',
      });

      if (!response || !response.ok()) {
        this.logger.debug(
          `Playwright got non-ok response (${response?.status()}) for ${url}`,
        );
        return null;
      }

      this.logger.log(`Found via playwright: ${url} (${await page.title()})`);
      return url;
    } catch (err) {
      this.logger.error(`Playwright failed on ${url}`, err);
      return null;
    } finally {
      await context.close();
    }
  }
}
