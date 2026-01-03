
const fs = require('fs');
const filename = 'src/components/ChatInterface.tsx';

try {
    let content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');
    const newLines = lines.filter(line => !line.includes('FileSpreadsheet') && !line.includes('ImageIcon'));

    if (lines.length !== newLines.length) {
        fs.writeFileSync(filename, newLines.join('\n'));
        console.log('Removed unused imports.');
    } else {
        console.log('No lines removed.');
    }
} catch (e) {
    console.error(e);
}
