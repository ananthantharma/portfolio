const IconoirIcons = require('iconoir-react');
const React = require('react');

console.log("Total exports:", Object.keys(IconoirIcons).length);

const invalid = [];
Object.entries(IconoirIcons).forEach(([key, val]) => {
    // Check if it starts with uppercase (Component convention)
    if (/^[A-Z]/.test(key)) {
        // Check if it's NOT a function (React functional component) and NOT a forwardRef (object with $$typeof)
        const isFunction = typeof val === 'function';
        const isForwardRef = typeof val === 'object' && val !== null && val.$$typeof === Symbol.for('react.forward_ref');

        // In production/minified builds, forwardRef might look slightly different, but usually typeof val is object/function.

        if (!isFunction && !isForwardRef) {
            console.log(`Potential non-component export: ${key}`, typeof val);
            invalid.push(key);
        }
    }
});

console.log(`Found ${invalid.length} suspicious exports starting with Uppercase.`);
