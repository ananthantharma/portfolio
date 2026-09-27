// Structured meeting notes: the starting template and reading its sections back out.

export const MEETING_SECTIONS = ['Purpose / Agenda', 'Discussion Notes', 'Decisions', 'Action Items', 'Follow-Ups'] as const;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** HTML for a new meeting note. The user edits it freely afterwards. */
export function meetingNoteHtml(title: string, date: string) {
  const list = (hint: string) => `<ul><li>${hint}</li></ul>`;
  return [
    `<h1>${escapeHtml(title)}</h1>`,
    `<p><strong>Date:</strong> ${escapeHtml(date)}</p>`,
    `<h2>Purpose / Agenda</h2>`,
    list('Agenda item'),
    `<h2>Discussion Notes</h2>`,
    `<p>Key points discussed…</p>`,
    `<h2>Decisions</h2>`,
    list('Decision made'),
    `<h2>Action Items</h2>`,
    list('Action – owner – due date'),
    `<h2>Follow-Ups</h2>`,
    list('Follow-up'),
  ].join('');
}

// Placeholder lines from the template shouldn't be offered as tasks or decisions
const PLACEHOLDERS = new Set(['agenda item', 'decision made', 'action – owner – due date', 'follow-up', 'key points discussed…']);

const textOf = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim();

/**
 * Lines under a heading (e.g. "Action Items") up to the next heading: each list item,
 * or each paragraph when the section isn't a list. Works on the note's HTML.
 */
export function sectionItems(html: string, heading: string): string[] {
  if (typeof window === 'undefined' || !html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const target = heading.toLowerCase().replace(/[^a-z]/g, '');
  const headings = Array.from(doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p > strong:only-child, p > b:only-child'));
  const start = headings.find(h => textOf(h).toLowerCase().replace(/[^a-z]/g, '').startsWith(target));
  if (!start) return [];
  // A bold-only paragraph acts as a heading too; walk its paragraph's siblings
  let node: Element | null = start.tagName === 'STRONG' || start.tagName === 'B' ? start.parentElement : start;
  const items: string[] = [];
  while ((node = node?.nextElementSibling || null)) {
    if (/^H[1-6]$/.test(node.tagName)) break;
    if (node.tagName === 'P' && node.children.length === 1 && /^(STRONG|B)$/.test(node.children[0].tagName) && textOf(node) === textOf(node.children[0])) break;
    if (node.tagName === 'UL' || node.tagName === 'OL') node.querySelectorAll('li').forEach(li => items.push(textOf(li)));
    else items.push(textOf(node));
  }
  return items.filter(t => t && !PLACEHOLDERS.has(t.toLowerCase()));
}
