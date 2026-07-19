import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { HomePageResult, PlaywrightResult } from '../../scraper.dto';
import axios from 'axios';
import { PlaywrightService } from '../../../playwright/playwright.service';
import { LinkExtractorService } from './link-extractor.service';
import { CareerLinkMatcherService } from './link-scorer.service';

type HandleRequestResult = PlaywrightResult | 'invalid_domain' | null;

const DOMAIN_FAILURES = new Set(['ENOTFOUND', 'EAI_AGAIN']);

const TIMEOUT_FAILURE = new Set(['ECONNABORTED', 'ETIMEDOUT']);
const NETWORK_FAILURE = new Set(['ECONNREFUSED', 'ECONNRESET']);

// const TEST = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <title>Doora Link Extraction Test</title>
// </head>

// <body>

// <header>
//   <nav>
//     <!-- Internal -->
//     <a href="/">Home</a>
//     <a href="/about">About</a>
//     <a href="/pricing">Pricing</a>
//     <a href="/contact">Contact</a>

//     <!-- Career pages -->
//     <a href="/careers">Careers</a>
//     <a href="/jobs">Jobs</a>
//     <a href="/join-us">Join Us</a>
//     <a href="/work-with-us">Work With Us</a>

//     <!-- Duplicate -->
//     <a href="/careers">Careers Duplicate</a>

//     <!-- Relative -->
//     <a href="open-roles">Open Roles</a>

//     <!-- Absolute -->
//     <a href="https://company.com/vacancies">Vacancies</a>

//     <!-- Protocol Relative -->
//     <a href="//company.com/hiring">Hiring</a>

//     <!-- Query -->
//     <a href="/careers?department=engineering">
//       Engineering Careers
//     </a>

//     <!-- Fragment -->
//     <a href="/careers#backend">
//       Backend Team
//     </a>

//     <!-- Mixed case -->
//     <a href="/CAREERS">CAREERS</a>

//     <!-- Nested -->
//     <a href="/reports">
//         <span>Annual</span>
//         Report
//     </a>

//     <!-- ATS -->
//     <a href="https://boards.greenhouse.io/company">
//       Greenhouse
//     </a>

//     <a href="https://jobs.ashbyhq.com/company">
//       Ashby
//     </a>

//     <a href="https://jobs.lever.co/company">
//       Lever
//     </a>

//     <a href="https://apply.workable.com/company">
//       Workable
//     </a>

//     <!-- External -->
//     <a href="https://stripe.com">
//       Stripe
//     </a>

//     <a href="https://openai.com">
//       OpenAI
//     </a>

//     <!-- Social -->
//     <a href="https://linkedin.com/company/company">
//       LinkedIn
//     </a>

//     <a href="https://twitter.com/company">
//       Twitter
//     </a>

//     <a href="https://x.com/company">
//       X
//     </a>

//     <a href="https://facebook.com/company">
//       Facebook
//     </a>

//     <a href="https://instagram.com/company">
//       Instagram
//     </a>

//     <a href="https://youtube.com/company">
//       YouTube
//     </a>

//     <a href="https://tiktok.com/@company">
//       TikTok
//     </a>

//     <!-- Documents -->
//     <a href="/privacy.pdf">
//       Privacy PDF
//     </a>

//     <a href="/report.zip">
//       Download Report
//     </a>

//     <a href="/image.png">
//       Logo
//     </a>

//     <!-- Invalid -->
//     <a href="#">Hash</a>

//     <a href="">Empty</a>

//     <a>No href</a>

//     <a href="javascript:void(0)">
//       Javascript
//     </a>

//     <a href="mailto:hello@company.com">
//       Email
//     </a>

//     <a href="tel:+2348012345678">
//       Phone
//     </a>

//     <!-- Broken -->
//     <a href="::::invalid">
//       Invalid URL
//     </a>

//   </nav>
// </header>

// <main>
//   <h1>Welcome</h1>
// </main>

// <div id="footer"></div>

// <script>

// setTimeout(() => {

// document.getElementById('footer').innerHTML = \`

// <footer>

// <a href="/about">About</a>

// <a href="/careers">Careers</a>

// <a href="/blog">Blog</a>

// <a href="/faq">FAQ</a>

// <a href="/support">Support</a>

// </footer>

// \`;

// },1500);

// </script>

// </body>
// </html>
// `;

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
    const normalizedCompanyDomain = company.toLowerCase().trim();
    const url = `https://${normalizedCompanyDomain}`;
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
        this.logger.log(`Found via axios: ${finalUrl}`);
        return {
          status: 'found',
          url: finalUrl,
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

  async details(company: string) {
    const result = await this.fetchHomepage(company);
    if (!result.url) return;
    const baseUrl = result.url;

    const companyDomain = new URL(baseUrl).hostname
      .replace(/^www\./, '')
      .toLowerCase();

    const results = this.extractorService.extractHtml(result.data!, baseUrl);
    return this.scorer.scoreLinks(results, companyDomain);
  }
}
