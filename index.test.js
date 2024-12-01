const puppeteer = require('puppeteer');

const EXTENSION_PATH = '.';
const EXTENSION_ID = 'lnkldhcgojaejhbakenmdhlnmenfnmfm';

let browser;

beforeEach(async () => {
    browser = await puppeteer.launch({
        headless: false,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`
        ]
    });
});

afterEach(async () => {
    await browser.close();
    browser = undefined;
});

test('dummy test', async () => {
    const page = await browser.newPage();
    await page.goto(`https://en.wikipedia.org/wiki/Main_Page`);
});
