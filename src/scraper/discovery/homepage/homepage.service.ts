import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { HomePageResult, PlaywrightResult } from '../../scraper.dto';
import axios from 'axios';
import { PlaywrightService } from '../../../playwright/playwright.service';

type HandleRequestResult = PlaywrightResult | 'invalid_domain' | null;

const DOMAIN_FAILURES = new Set(['ENOTFOUND', 'EAI_AGAIN']);

const TIMEOUT_FAILURE = new Set(['ECONNABORTED', 'ETIMEDOUT']);
const NETWORK_FAILURE = new Set(['ECONNREFUSED', 'ECONNRESET']);

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);
  private readonly userAgent: string;
  private readonly timeout: number;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly playwrightService: PlaywrightService,
  ) {
    this.userAgent = this.configService.getOrThrow<string>('USER_AGENT');
    this.timeout = Number(
      this.configService.getOrThrow<string>('REQUEST_TIMEOUT_MS'),
    );
  }

  async fetchHomepage(company: string): Promise<HomePageResult> {
    const url = `https://${company}`;
    try {
      const response = await lastValueFrom(
        this.httpService.get<string>(url, {
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
          data: response.data,
        };
      }
    } catch (error) {
      const result = await this.handleRequestError(error, url);

      if (result === 'invalid_domain') {
        return {
          status: 'invalid_domain',
          url: null,
          data: null,
        };
      }

      if (result) {
        return {
          status: 'found',
          url: result.url,
          data: result.data,
        };
      }

      return {
        status: 'not_found',
        url: null,
        data: null,
      };
    }

    return { status: 'not_found', url: null, data: null };
  }

  private async handleRequestError(
    error: unknown,
    url: string,
  ): Promise<HandleRequestResult> {
    if (!axios.isAxiosError(error)) {
      this.logger.error(`Unexpected non-axios error on ${url}`, error);
      return null;
    }

    if (error.response) {
      const status = error.response.status;
      if (status === 403 || status === 401) {
        this.logger.debug(`${url} is blocked switching to playwright`);

        return this.fetchWithPlaywright(url);
      }
      if (status === 404) {
        this.logger.debug(`${url} page not found`);
        return null;
      }

      if (status >= 500) {
        this.logger.warn(`${url} server error ${status}`);
        return null;
      }
    }

    const code = error.code;

    if (code && DOMAIN_FAILURES.has(code)) {
      this.logger.warn(`Domain unreachable (${code}) for ${url}`);

      return 'invalid_domain';
    }

    if (code && TIMEOUT_FAILURE.has(code)) {
      this.logger.warn(`Timeout reached`);
      return null;
    }

    if (code && NETWORK_FAILURE.has(code)) {
      this.logger.warn(`Transient network error (${code}) on ${url}`);
      return null;
    }

    return null;
  }

  async fetchWithPlaywright(url: string): Promise<PlaywrightResult> {
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
        return {
          url: page.url(),
          data: null,
        };
      }

      this.logger.log(`Homepage gotten via playwright: ${url}`);
      const data = await page.content();
      return {
        url: page.url(),
        data,
      };
    } catch (error) {
      this.logger.error(`Playwright failed on ${url}`, error);
      return {
        url,
        data: null,
      };
    } finally {
      await context.close();
    }
  }
}
