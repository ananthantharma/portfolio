const problematicString = `| $\mathbf{\times}$ | $\mathbf{1}$ | $\mathbf{2}$ | $\mathbf{3}$ | $\mathbf{4}$ | $\mathbf{5}$ | | :---: | :---: | :---: | :---: | :---: | :---: | | $\mathbf{1}$ | 1 | 2 | 3 | 4 | 5 | | $\mathbf{2}$ | 2 | 4 | 6 | 8 | 10 | | $\mathbf{3}$ | 3 | 6 | 9 | 12 | 15 | | $\mathbf{4}$ | 4 | 8 | 12 | 16 | 20 | | $\mathbf{5}$ | 5 | 10 | 15 | 20 | 25 |`;

console.log("Original:", problematicString);

// Hypothesis: Split when we see "| |" followed by NON-space/pipe content
// This avoids splitting empty cells "||" or "|  |" but splits "| | Content"
const regex = /\| *(\| *[^ |])/g;
const result = problematicString.replace(regex, '|\n$1');

console.log("\n--- New Regex Output ---");
console.log(result);

if (result.includes('\n')) {
    console.log("\nSUCCESS: Newlines inserted.");
} else {
    console.log("\nFAILURE: No newlines inserted.");
}
