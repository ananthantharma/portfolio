
const preprocessMarkdown = (content) => {
    if (!content) return '';

    console.log('Original:', JSON.stringify(content));

    let processed = content;

    // 1. Ensure newlines before code blocks
    processed = processed.replace(/([^\n])\n(```)/g, '$1\n\n$2');

    // 2. Split text from start of table (e.g. "Table 1 | Header |")
    processed = processed.replace(/(^|\n)([^|\n]+)(\|)/g, '$1$2\n\n$3');

    // 3. Fix compressed tables: Replace "| |" with "|\n|" globally
    processed = processed.replace(/\| *(\| *[^ |])/g, '|\n$1');

    console.log('\nProcessed:', JSON.stringify(processed));
    console.log('\nProcessed (Raw):');
    console.log(processed);

    return processed;
};

const input = "| x | 1 | 2 | 3 | 4 | 5 | | :---: | :---: | :---: | :---: | :---: | :---: | | 1 | 1 | 2 | 3 | 4 | 5 | | 2 | 2 | 4 | 6 | 8 | 10 | | 3 | 3 | 6 | 9 | 12 | 15 | | 4 | 4 | 8 | 12 | 16 | 20 | | 5 | 5 | 10 | 15 | 20 | 25 |";

preprocessMarkdown(input);
