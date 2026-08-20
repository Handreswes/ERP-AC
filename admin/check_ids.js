const fs = require('fs');
const path = require('path');

const file = path.join('c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC Website/catalogo.html');
const html = fs.readFileSync(file, 'utf8');

const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
console.log("Checking all document.getElementById calls in catalogo.html:");
while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    const exists = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
    console.log(`- ID "${id}": ${exists ? 'EXISTS' : 'MISSING! <--- ERROR CAUSER'}`);
}
