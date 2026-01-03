const problematicString = `| Multiplier (x) | Result (5 $\times$ x) | |---|---| | 1 | 5 | | 2 | 10 | | 3 | 15 | | 4 | 20 | | 5 | 25 | | 6 | 30 | | 7 | 35 | | 8 | 40 | | 9 | 45 | | 10 | 50 | | 11 | 55 | | 12 | 60 |`;

console.log("Original:", problematicString);

// Attempt 1: Current Regex
const regex1 = /\| *(\|)/g;
const result1 = problematicString.replace(regex1, '|\n$1');
console.log("\n--- Regex 1 Output ---");
console.log(result1);

// Attempt 2: Flexible Whitespace
const regex2 = /\|\s+(\|)/g;
const result2 = problematicString.replace(regex2, '|\n$1');
console.log("\n--- Regex 2 Output ---");
console.log(result2);

// Attempt 3: Explicit Pipe-Space*-Pipe
const regex3 = /\|[ \t]*(\|)/g;
const result3 = problematicString.replace(regex3, '|\n$1');
console.log("\n--- Regex 3 Output ---");
console.log(result3);
