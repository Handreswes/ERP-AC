const puppeteer = require('puppeteer');

async function debugPage() {
    console.log('Testing live page in Puppeteer with cache-busting...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

    try {
        const url = 'https://tucomprascol.com/catalogo.html?price=wholesale&company=all&t=' + Date.now();
        console.log('Navigating to:', url);
        const res = await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 15000
        });
        console.log('Response Status:', res.status());

        const loaderDisplay = await page.$eval('#loading-screen', el => window.getComputedStyle(el).display);
        const loaderOpacity = await page.$eval('#loading-screen', el => window.getComputedStyle(el).opacity);
        console.log('Loader computed display:', loaderDisplay, 'opacity:', loaderOpacity);

        const cardCount = await page.$$eval('.product-card', cards => cards.length);
        console.log('Product cards rendered in DOM:', cardCount);

    } catch (e) {
        console.error('Puppeteer navigation error:', e.message);
    } finally {
        await browser.close();
    }
}

debugPage();
