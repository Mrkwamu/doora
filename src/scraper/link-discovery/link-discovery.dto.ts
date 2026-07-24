export interface ExtractionResult {
  text: string | null;
  href: string;
}

export interface ScoredLink {
  link: ExtractionResult;
  score: number;
}
