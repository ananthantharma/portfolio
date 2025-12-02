const { GoogleGenerativeAI } = require('@google/generative-ai');
console.log(GoogleGenerativeAI.toString());
try {
    const genAI = new GoogleGenerativeAI('test');
    console.log(genAI);
} catch (e) {
    console.log(e);
}
