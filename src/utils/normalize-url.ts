export function normalizedUrl(companyDomain: string): string {
  const domain = companyDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');

  return `https://${domain}`;
}
