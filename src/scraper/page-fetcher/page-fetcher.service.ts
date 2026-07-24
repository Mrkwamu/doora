import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import axios from 'axios';

import { FetchResult } from './page-fetcher.dto';
import { PlaywrightService } from '../../playwright/playwright.service';
import {
  DOMAIN_FAILURES,
  TIMEOUT_FAILURE,
  NETWORK_FAILURE,
} from './page-fetcher.constants';

@Injectable()
export class PageFetcherService {
  private readonly logger = new Logger(PageFetcherService.name);
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

  async fetchWithAxios(url: string): Promise<FetchResult> {
    try {
      const response = await lastValueFrom(
        this.httpService.get<string>(url, {
          timeout: this.timeout,
          headers: { 'User-Agent': this.userAgent },
        }),
      );

      const request = response.request as {
        res?: { responseUrl?: string };
      };
      const finalUrl = request.res?.responseUrl ?? url;

      if (response.status === 200) {
        this.logger.log(`Fetched successfully via Axios: ${finalUrl}`);
        return { status: 'found', url: finalUrl, html: response.data };
      }

      return { status: 'not_found', url: finalUrl, html: null };
    } catch (error) {
      return this.handleAxiosError(error, url);
    }
  }

  private async handleAxiosError(
    error: unknown,
    url: string,
  ): Promise<FetchResult> {
    if (!axios.isAxiosError(error)) {
      this.logger.error(`Unexpected non-axios error on ${url}`, error);
      return { status: 'not_found', url, html: null };
    }

    if (error.response) {
      const status = error.response.status;

      if (status === 403 || status === 401) {
        this.logger.debug(`${url} is blocked, switching to Playwright`);
        return this.fetchWithPlaywright(url);
      }
      if (status === 404) {
        this.logger.debug(`${url} page not found`);
        return { status: 'not_found', url, html: null };
      }
      if (status >= 500) {
        this.logger.warn(`${url} server error ${status}`);
        return { status: 'not_found', url, html: null };
      }
    }

    const code = error.code;

    if (code && DOMAIN_FAILURES.has(code)) {
      this.logger.warn(`Domain unreachable (${code}) for ${url}`);
      return { status: 'invalid_domain', url, html: null };
    }
    if (code && TIMEOUT_FAILURE.has(code)) {
      this.logger.warn(`Timeout reached for ${url}`);
      return { status: 'not_found', url, html: null };
    }
    if (code && NETWORK_FAILURE.has(code)) {
      this.logger.warn(`Transient network error (${code}) on ${url}`);
      return { status: 'not_found', url, html: null };
    }

    return { status: 'not_found', url, html: null };
  }
  async fetchWithPlaywright(url: string): Promise<FetchResult> {
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
          status: 'not_found',
          url: page.url(),
          html: null,
        };
      }

      await page
        .waitForLoadState('networkidle', { timeout: this.timeout })
        .catch(() => {
          this.logger.debug(`networkidle timeout on ${url}, proceeding anyway`);
        });

      let html = await page.content();

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      await page.waitForTimeout(1000);
      html = await page.content();

      return {
        status: 'found',
        url: page.url(),
        html,
      };
    } catch (error) {
      this.logger.error(`Playwright failed on ${url}`, error);

      return {
        status: 'not_found',
        url,
        html: null,
      };
    } finally {
      await context.close();
    }
  }
}
