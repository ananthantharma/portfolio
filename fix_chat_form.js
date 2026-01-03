
const fs = require('fs');
const path = 'src/components/ChatInterface.tsx';

try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split('\n');

    // Find the line with the input area container
    // <div className="p-4 bg-zinc-900 border-t border-zinc-800">

    let containerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('className="p-4 bg-zinc-900 border-t border-zinc-800"')) {
            containerIndex = i;
            break;
        }
    }

    if (containerIndex !== -1) {
        // Check if form tag is already there in the next few lines
        let hasForm = false;
        for (let i = containerIndex + 1; i < containerIndex + 5; i++) {
            if (lines[i] && lines[i].includes('<form')) {
                hasForm = true;
                break;
            }
        }

        if (!hasForm) {
            // Insert form tag after container div
            lines.splice(containerIndex + 1, 0, '          <form className="max-w-4xl mx-auto" onSubmit={handleSubmit}>');
            fs.writeFileSync(path, lines.join('\n'));
            console.log('Inserted <form> tag.');
        } else {
            console.log('<form> tag already present.');
        }
    } else {
        console.log('Could not find container div.');
    }
} catch (e) {
    console.error(e);
}
