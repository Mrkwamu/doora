export type FetchStatus = 'found' | 'not_found' | 'invalid_domain';

export interface FetchResult {
  status: FetchStatus;
  url: string;
  html: string | null;
}

export interface FetchOptions {
  shouldRetry?: (html: string, finalUrl: string) => boolean;
}
