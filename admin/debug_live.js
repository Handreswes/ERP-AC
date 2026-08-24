const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8099;
const root = 'c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC Website';

const server = http.createServer((req, res) => {
    let filePath = path.join(root, req.url.split('?')[0]);
    if (filePath.endsWith('/')) filePath = path.join(filePath, 'catalogo.html');

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        let contentType = 'text/html';
        if (ext === '.js') contentType = 'text/javascript';
        if (ext === '.json') contentType = 'application/json';
        if (ext === '.css') contentType = 'text/css';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fs.readFileSync(filePath));
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

server.listen(PORT, async () => {
    console.log(`Server running at http://localhost:${PORT}`);

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Test Retail Link
    const retailUrl = `http://localhost:${PORT}/catalogo.html?price=internet`;
    console.log('Navigating to Retail URL:', retailUrl);
    await page.goto(retailUrl, { waitUntil: 'networkidle2' });

    const selectDisplayRetail = await page.$eval('#select-price-type', el => window.getComputedStyle(el).display);
    const cardCountRetail = await page.$$eval('.product-card', cards => cards.length);
    console.log('--- RETAIL MODE TEST ---');
    console.log('Price Selector Display:', selectDisplayRetail);
    console.log('Cards rendered:', cardCountRetail);

    // Test Wholesale Link
    const wholesaleUrl = `http://localhost:${PORT}/catalogo.html?price=wholesale`;
    console.log('\nNavigating to Wholesale URL:', wholesaleUrl);
    await page.goto(wholesaleUrl, { waitUntil: 'networkidle2' });

    const selectDisplayWholesale = await page.$eval('#select-price-type', el => window.getComputedStyle(el).display);
    const cardCountWholesale = await page.$$eval('.product-card', cards => cards.length);
    console.log('--- WHOLESALE MODE TEST ---');
    console.log('Price Selector Display:', selectDisplayWholesale);
    console.log('Cards rendered:', cardCountWholesale);

    await browser.close();
    server.close();
});
