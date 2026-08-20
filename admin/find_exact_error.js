const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync('c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC Website/catalogo.html', 'utf8');

const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;

while ((match = regex.exec(html)) !== null) {
    const code = match[1];
    if (!code.trim()) continue;
    try {
        new vm.Script(code);
    } catch (e) {
        console.error("SYNTAX ERROR IN SCRIPT:");
        console.error(e);
        // Find line number of error in script
        const matchLine = e.stack.match(/<anonymous>:(\d+)/);
        if (matchLine) {
            const lineNo = parseInt(matchLine[1]);
            const lines = code.split('\n');
            console.error(`Error at line ${lineNo}:`);
            for (let i = Math.max(0, lineNo - 5); i < Math.min(lines.length, lineNo + 5); i++) {
                console.error(`${i + 1}: ${lines[i]}`);
            }
        }
    }
}
