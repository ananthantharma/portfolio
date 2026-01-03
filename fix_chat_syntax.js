
const fs = require('fs');
const path = 'src/components/ChatInterface.tsx';

try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');

    // Find the line with the weird closing tag
    const fixedLines = lines.filter(line => !line.includes('</div >'));

    // If we removed more than we wanted, be careful. 
    // In this case, we know `</div >` is unique and bad.

    if (lines.length === fixedLines.length) {
        console.log('No bad line found.');
    } else {
        console.log(`Removed ${lines.length - fixedLines.length} bad lines.`);
        fs.writeFileSync(path, fixedLines.join('\n'));
        console.log('File updated.');
    }
} catch (e) {
    console.error(e);
}
