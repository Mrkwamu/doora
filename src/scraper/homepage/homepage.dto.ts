type HomePageStatus = 'found' | 'not_found' | 'invalid_domain';

export interface HomePageResult {
  status: HomePageStatus;
  homepageUrl: string | null;
  bestLink: {
    text: string | null;
    href: string;
    score: number;
  } | null;
}

export interface HandleRequestResult {
  status: HomePageStatus;
  message: string | null;
  data: null;
}
