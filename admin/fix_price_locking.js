const fs = require('fs');
const path = require('path');

const websiteCatalog = 'c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC Website/catalogo.html';
const erpCatalog = 'c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC/catalogo.html';

function updateCatalog(filePath) {
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');

    // 1. Update urlParams declaration
    html = html.replace(
        /const urlParams = new URLSearchParams\(window\.location\.search\);\s*const urlCompany = urlParams\.get\('company'\) \|\| 'all';\s*let urlPrice = urlParams\.get\('price'\) \|\| 'internet';/g,
        `const urlParams = new URLSearchParams(window.location.search);
        const urlCompany = urlParams.get('company') || 'all';
        const priceParam = urlParams.get('price');
        const isPriceLocked = urlParams.has('price');
        let urlPrice = priceParam || 'internet';`
    );

    // 2. Update priceSelect initialization in fallbackSupabaseLoad and init
    html = html.replace(
        /const priceSelect = document\.getElementById\('select-price-type'\);\s*if \(priceSelect\) priceSelect\.value = urlPrice;/g,
        `const priceSelect = document.getElementById('select-price-type');
                if (priceSelect) {
                    if (isPriceLocked) {
                        priceSelect.style.display = 'none';
                    } else {
                        priceSelect.value = urlPrice;
                    }
                }`
    );

    // 3. Update applyFilters logic
    html = html.replace(
        /function applyFilters\(\) \{\s*const priceSelect = document\.getElementById\('select-price-type'\);\s*if \(priceSelect\) urlPrice = priceSelect\.value;/g,
        `function applyFilters() {
            const priceSelect = document.getElementById('select-price-type');
            if (isPriceLocked) {
                urlPrice = priceParam;
                if (priceSelect) priceSelect.style.display = 'none';
            } else if (priceSelect) {
                urlPrice = priceSelect.value;
            }`
    );

    fs.writeFileSync(filePath, html, 'utf8');
    console.log("Updated security locking in:", filePath);
}

updateCatalog(websiteCatalog);
updateCatalog(erpCatalog);
