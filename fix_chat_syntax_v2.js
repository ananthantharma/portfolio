
const fs = require('fs');
const path = 'src/components/ChatInterface.tsx';

try {
    const content = fs.readFileSync(path, 'utf8');
    // Trim trailing whitespace to be sure
    let trimmed = content.trim();

    // Check if it ends correctly
    if (trimmed.endsWith('</div>\n    </div>\n  </div>\n  );\n}')) {
        console.log('File already seems correct.');
    } else {
        // Look for the end sequence we see in the file view
        // 596:         </form>
        // 597:       </div>
        // 598:     </div>
        // 599:   );
        // 600: }

        const lines = content.split('\n');
        const lastLines = lines.slice(-10);
        console.log('Last lines:', lastLines);

        // We want to insert </div> before );
        // Find the index of );
        let closeParenIndex = -1;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes(');')) {
                closeParenIndex = i;
                break;
            }
        }

        if (closeParenIndex !== -1) {
            // Insert </div> before this line
            lines.splice(closeParenIndex, 0, '    </div>');
            fs.writeFileSync(path, lines.join('\n'));
            console.log('Inserted missing </div>.');
        } else {
            console.log('Could not find closure to fix.');
        }
    }
} catch (e) {
    console.error(e);
}
