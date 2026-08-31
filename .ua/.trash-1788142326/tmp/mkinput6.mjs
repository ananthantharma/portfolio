import fs from 'fs';
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const out = {
  projectRoot: 'C:/Users/anant/OneDrive/Desktop/Coding - Gemini/My-Portfolio-Website-main',
  batchFiles: d.files,
  batchImportData: d.batchImportData
};
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log('wrote', d.files.length, 'files');
