import { Injectable, Logger } from '@nestjs/common';
import { normalizeCompany } from '../../utils/normalize-url';
import { LinkExtractorService } from '../link-discovery/link-extractor.service';
import { LinkScorerService } from '../link-discovery/link-scorer.service';

import { ScoredLink } from '../link-discovery/link-discovery.dto';

import { HomePageResult } from './homepage.dto';
import { PageFetcherService } from '../page-fetcher/page-fetcher.service';

export const MIN_CONFIDENCE_SCORE = 30;

@Injectable()
export class HomepageService {
  private readonly logger = new Logger(HomepageService.name);

  constructor(
    private readonly pageFetcher: PageFetcherService,
    private readonly extractorService: LinkExtractorService,
    private readonly scorer: LinkScorerService,
  ) {}
  async fetchHomepage(company: string): Promise<HomePageResult> {
    const homepageUrl = normalizeCompany(company);

    const companyDomain = new URL(homepageUrl).hostname
      .replace(/^www\./, '')
      .toLowerCase();

    // Try Axios first
    let result = await this.pageFetcher.fetchWithAxios(homepageUrl);

    if (result.status === 'invalid_domain') {
      return {
        status: 'invalid_domain',
        homepageUrl: null,
        bestLink: null,
      };
    }

    if (result.status === 'found' && result.html) {
      const bestLink = this.findBestCareerLink(
        result.html,
        result.url,
        companyDomain,
      );

      if (bestLink) {
        this.logger.log(
          `Career page found via Axios: ${bestLink.link.href} (score: ${bestLink.score})`,
        );

        return {
          status: 'found',
          homepageUrl: result.url,
          bestLink: {
            text: bestLink.link.text,
            href: bestLink.link.href,
            score: bestLink.score,
          },
        };
      }

      this.logger.warn(
        `Axios found no confident career links. Falling back to Playwright.`,
      );
    }

    // Fall back to Playwright
    result = await this.pageFetcher.fetchWithPlaywright(homepageUrl);

    if (result.status !== 'found' || !result.html) {
      return {
        status: 'not_found',
        homepageUrl: result.url,
        bestLink: null,
      };
    }

    const bestLink = this.findBestCareerLink(
      result.html,
      result.url,
      companyDomain,
    );

    if (!bestLink) {
      this.logger.warn(
        `Playwright found no confident career links on ${result.url}`,
      );

      return {
        status: 'not_found',
        homepageUrl: result.url,
        bestLink: null,
      };
    }

    this.logger.log(
      `Career page found via Playwright: ${bestLink.link.href} (score: ${bestLink.score})`,
    );

    return {
      status: 'found',
      homepageUrl: result.url,
      bestLink: {
        text: bestLink.link.text,
        href: bestLink.link.href,
        score: bestLink.score,
      },
    };
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
