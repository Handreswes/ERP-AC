const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync('c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC Website/catalogo.html', 'utf8');

const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

while ((match = regex.exec(html)) !== null) {
    count++;
    const code = match[1];
    if (!code.trim()) continue;
    try {
        new vm.Script(code);
        console.log(`Script block #${count}: OK`);
    } catch (e) {
        console.error(`Script block #${count} SYNTAX ERROR:`, e.message);
        // Print snippet around error
        const lines = code.split('\n');
        lines.forEach((line, idx) => {
            console.log(`${idx + 1}: ${line}`);
        });
    }
}
