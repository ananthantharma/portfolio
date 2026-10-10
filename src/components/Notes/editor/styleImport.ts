// Lexical's default HTML import only turns span styles into bold/italic/etc. and throws away the rest,
// so colours, highlights, fonts and sizes vanished every time a note was reopened.
// This import map keeps those inline styles on the text.
import {$isTextNode, DOMConversion, DOMConversionMap, DOMConversionOutput, TextNode} from 'lexical';

const KEEP = ['color', 'background-color', 'font-size', 'font-family'] as const;

function keptStyles(element: HTMLElement): string {
  const style = element.style;
  if (!style) return '';
  return KEEP.map(prop => {
    const value = style.getPropertyValue(prop);
    return value ? `${prop}: ${value};` : '';
  }).join('');
}

export function buildStyleImportMap(): DOMConversionMap {
  const map: DOMConversionMap = {};
  const base = TextNode.importDOM() || {};
  for (const [tag, fn] of Object.entries(base)) {
    map[tag] = (importNode: HTMLElement) => {
      const importer = (fn as (n: HTMLElement) => DOMConversion | null)(importNode);
      if (!importer) return null;
      return {
        ...importer,
        conversion: (element: HTMLElement): DOMConversionOutput | null => {
          const output = importer.conversion(element);
          if (!output || output.forChild === undefined || output.after !== undefined || output.node !== null) return output;
          const extra = keptStyles(element);
          if (!extra) return output;
          const {forChild} = output;
          return {
            ...output,
            forChild: (child, parent) => {
              const node = forChild(child, parent);
              if ($isTextNode(node)) node.setStyle(`${node.getStyle()}${extra}`);
              return node;
            },
          };
        },
      };
    };
  }
  return map;
}
