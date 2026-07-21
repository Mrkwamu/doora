import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ExtractionResult } from './discovery.dto';
import { SOCIAL_DOMAINS, FILE_EXTENSIONS } from './dicovery.constants';

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
        href.startsWith('mailto') ||
        href.startsWith('tel:')
      ) {
        return;
      }

      try {
        const url = new URL(href, baseUrl);

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
        if (FILE_EXTENSIONS.some((domain) => url.pathname.endsWith(domain))) {
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
