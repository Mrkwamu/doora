import { Injectable } from '@nestjs/common';
import { ExtractionResult, ScoredLink } from './discovery.dto';
import {
  CAREER_TEXT_KEYWORDS,
  CAREER_PATHS,
  ATS_DOMAINS,
  CAREER_HOST_SUFFIXES,
} from './dicovery.constants';
import { LINKSCORE } from './discovery.enum';

@Injectable()
export class CareerLinkMatcherService {
  scoreLinks(links: ExtractionResult[], companyDomain: string): ScoredLink[] {
    const scored: ScoredLink[] = [];

    for (const link of links) {
      let score = 0;
      const text = link.text?.toLowerCase() ?? '';
      const url = new URL(link.href);
      const pathname = url.pathname.toLowerCase();
      const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

      const hasTextKeyword = CAREER_TEXT_KEYWORDS.some((keyword) =>
        text?.includes(keyword),
      );
      if (hasTextKeyword) score += LINKSCORE.TEXT;

      const hasCareerPath = CAREER_PATHS.some((pathKeyword) =>
        pathname.includes(pathKeyword),
      );
      if (hasCareerPath) score += LINKSCORE.PATH;

      const hasCareerHostSuffix = CAREER_HOST_SUFFIXES.some((suffix) =>
        hostname.endsWith(suffix),
      );
      if (hasCareerHostSuffix) score += LINKSCORE.PATH;

      const isATS = ATS_DOMAINS.some((ats) => hostname.endsWith(ats));

      if (isATS) score += LINKSCORE.ATS;

      const isCompanyDomain =
        hostname === companyDomain || hostname.endsWith(`.${companyDomain}`);

      if (isCompanyDomain) {
        score += LINKSCORE.COMPANY;
      }

      scored.push({ link, score });
    }
    return scored;
  }
}
