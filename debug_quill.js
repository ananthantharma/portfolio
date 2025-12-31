const ReactQuill = require('react-quill');
console.log('Keys in react-quill:', Object.keys(ReactQuill));
console.log('Quill on default?', ReactQuill.Quill ? 'Yes' : 'No');
console.log('Quill on default.default?', ReactQuill.default?.Quill ? 'Yes' : 'No');
