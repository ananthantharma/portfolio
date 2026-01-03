
const fs = require('fs');
const filename = 'src/components/ChatInterface.tsx';

try {
    let content = fs.readFileSync(filename, 'utf8');
    const targetLine = "const outputType = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';";

    if (content.includes(targetLine)) {
        content = content.replace(targetLine, "// Using JPEG quality 0.6 for significant compression");
        fs.writeFileSync(filename, content);
        console.log('Removed unused outputType.');
    } else {
        console.log('Could not find target line.');
    }
} catch (e) {
    console.error(e);
}
