import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();

  try {
    await page.goto('https://chowdeck.com', {
      waitUntil: 'domcontentloaded',
    });

    console.log('Navigation succeeded');
  } catch (error) {
    console.error(error);
  }

  console.log(page.url());
  console.log(await page.title());

  await browser.close();
}

main();
