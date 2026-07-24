import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import {
  FILE_EXTENSIONS,
  SOCIAL_DOMAINS,
} from './constants/link-discovery.constants';
import { ExtractionResult } from './link-discovery.dto';

@Injectable()
export class LinkExtractorService {
  private readonly logger = new Logger(LinkExtractorService.name);

  extractHtml(htmlContent: string, baseUrl: string): ExtractionResult[] {
    const $ = cheerio.load(htmlContent);
    const results: ExtractionResult[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, element) => {
      const text = $(element).text().trim().replace(/\s+/g, ' ') || null;
      const href = $(element).attr('href')?.trim() || null;

      if (
        !href ||
        href === '#' ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        return;
      }

      try {
        const url = new URL(href, baseUrl);
        const base = new URL(baseUrl);
        const isSamePageAnchor =
          url.hash !== '' &&
          url.origin === base.origin &&
          url.pathname === base.pathname &&
          url.search === base.search;

        if (isSamePageAnchor) {
          return;
        }

        const normalizedUrl = url.href;

        if (seen.has(normalizedUrl)) {
          return;
        }
        seen.add(normalizedUrl);

        const hostname = url.hostname;

        if (
          SOCIAL_DOMAINS.some(
            (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
          )
        ) {
          return;
        }
        if (FILE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))) {
          return;
        }

        results.push({
          text,
          href: normalizedUrl,
        });
      } catch (error) {
        this.logger.debug(
          `Failed to normalize href "${href}" from ${baseUrl}`,
          error,
        );
      }
    });

    return results;
  }
}
