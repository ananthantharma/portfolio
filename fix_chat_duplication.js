
const fs = require('fs');
const filename = 'src/components/ChatInterface.tsx';

try {
    let content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n');

    // Lines to remove: 337 to 450 (1-based) -> 336 to 449 (0-based)
    // Let's verify line 337 (index 336) is empty and 338 (index 337) starts with '  for'

    const startLine = 337;
    const endLine = 450;

    // Removing the slice
    lines.splice(startLine - 1, endLine - startLine + 1);

    const newContent = lines.join('\n');
    fs.writeFileSync(filename, newContent);
    console.log('Removed lines ' + startLine + ' to ' + endLine);

} catch (e) {
    console.error(e);
}
