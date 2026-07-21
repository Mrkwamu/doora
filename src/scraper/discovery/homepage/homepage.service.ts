import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { HomePageResult, PlaywrightResult } from '../../scraper.dto';
import axios from 'axios';
import { PlaywrightService } from '../../../playwright/playwright.service';
import { LinkExtractorService } from './link-extractor.service';
import { CareerLinkMatcherService } from './link-scorer.service';

import { normalizedUrl } from '../../../utils/normalize-url';
import { ScoredLink } from './discovery.dto';

type HandleRequestResult = PlaywrightResult | 'invalid_domain' | null;

const DOMAIN_FAILURES = new Set(['ENOTFOUND', 'EAI_AGAIN']);

const TIMEOUT_FAILURE = new Set(['ECONNABORTED', 'ETIMEDOUT']);
const NETWORK_FAILURE = new Set(['ECONNREFUSED', 'ECONNRESET']);

export const MIN_CONFIDENCE_SCORE = 30;

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);
  private readonly userAgent: string;
  private readonly timeout: number;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly playwrightService: PlaywrightService,
    private readonly extractorService: LinkExtractorService,
    private readonly scorer: CareerLinkMatcherService,
  ) {
    this.userAgent = this.configService.getOrThrow<string>('USER_AGENT');
    this.timeout = Number(
      this.configService.getOrThrow<string>('REQUEST_TIMEOUT_MS'),
    );
  }

  async fetchHomepage(company: string): Promise<HomePageResult> {
    const url = normalizedUrl(company);
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    try {
      const response = await lastValueFrom(
        this.httpService.get<string>(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': this.userAgent,
          },
        }),
      );

      const request = response.request as {
        res?: {
          responseUrl?: string;
        };
      };

      const finalUrl = request.res?.responseUrl ?? url;

      if (response.status === 200) {
        const bestLink = this.findBestCareerLink(
          response.data,
          finalUrl,
          hostname,
        );

        if (!bestLink) {
          this.logger.warn(
            `Axios found no confident career links for ${finalUrl}. Falling back to Playwright.`,
          );

          return this.fetchWithPlaywright(finalUrl);
        }

        this.logger.log(`Homepage fetched successfully via Axios: ${finalUrl}`);
        return {
          status: 'found',
          homepageUrl: finalUrl,
          bestLink: {
            text: bestLink.link.text,
            href: bestLink.link.href,
            score: bestLink.score,
          },
        };
      }
    } catch (error) {
      const result = await this.handleRequestError(error, url);

      if (result === 'invalid_domain') {
        return {
          status: 'invalid_domain',
          homepageUrl: null,
          bestLink: null,
        };
      }

      if (result) {
        return {
          status: 'found',
          homepageUrl: result.homepageUrl,
          bestLink: result.bestLink,
        };
      }

      return {
        status: 'not_found',
        homepageUrl: null,
        bestLink: null,
      };
    }

    return { status: 'not_found', homepageUrl: null, bestLink: null };
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
          status: 'not_found',
          homepageUrl: page.url(),
          bestLink: null,
        };
      }

      this.logger.log(`Homepage fetched via Playwright: ${page.url()}`);

      const companyDomain = new URL(page.url()).hostname.replace(/^www\./, '');

      let html = await page.content();

      let bestLink = this.findBestCareerLink(html, page.url(), companyDomain);

      if (!bestLink) {
        this.logger.warn(
          `No confident links found. Scrolling and trying again...`,
        );

        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });

        await page.waitForTimeout(1000);

        html = await page.content();

        bestLink = this.findBestCareerLink(html, page.url(), companyDomain);

        if (!bestLink) {
          this.logger.warn(`Still no confident links after scrolling.`);

          return {
            status: 'not_found',
            homepageUrl: page.url(),
            bestLink: null,
          };
        }
      }

      return {
        status: 'found',
        homepageUrl: page.url(),
        bestLink: {
          text: bestLink.link.text,
          href: bestLink.link.href,
          score: bestLink.score,
        },
      };
    } catch (error) {
      this.logger.error(`Playwright failed on ${url}`, error);

      return {
        status: 'not_found',
        homepageUrl: url,
        bestLink: null,
      };
    } finally {
      await context.close();
    }
  }
  private findBestCareerLink(
    html: string,
    baseUrl: string,
    companyDomain: string,
  ): ScoredLink | null {
    const links = this.extractorService.extractHtml(html, baseUrl);

    if (links.length === 0) {
      return null;
    }

    const scoredLinks = this.scorer.scoreLinks(links, companyDomain);

    const bestLink = this.scorer.getBestLink(scoredLinks);

    if (!bestLink || bestLink.score < MIN_CONFIDENCE_SCORE) {
      return null;
    }

    return bestLink;
  }
}
