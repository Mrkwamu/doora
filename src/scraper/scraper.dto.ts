import { CareerPageStatus } from './scraper.type';

type HomePageStatus = 'found' | 'not_found' | 'invalid_domain';

export interface CareerPageResult {
  status: CareerPageStatus;
  homepageUrl: string | null;
  method: 'axios' | 'playwright' | null;
}

export interface HomePageResult {
  status: HomePageStatus;
  homepageUrl: string | null;
  bestLink: {
    text: string | null;
    href: string;
    score: number;
  } | null;
}

export interface PlaywrightResult {
  status: HomePageStatus;
  homepageUrl: string;
  bestLink: {
    text: string | null;
    href: string;
    score: number;
  } | null;
}
