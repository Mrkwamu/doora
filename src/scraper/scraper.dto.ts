import { CareerPageStatus } from './scraper.type';

type HomePageStatus = 'found' | 'not_found' | 'invalid_domain';

export interface CareerPageResult {
  status: CareerPageStatus;
  url: string | null;
  method: 'axios' | 'playwright' | null;
}

export interface HomePageResult {
  status: HomePageStatus;
  url: string | null;
  data: string | null;
}

export interface PlaywrightResult {
  url: string;
  data: string | null;
}
