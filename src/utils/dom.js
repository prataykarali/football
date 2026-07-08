export function setHTML(element, html = '') {
  if (!element) return;
  // ponytail: one audited HTML sink; callers must escape untrusted fields.
  element.replaceChildren();
  element.insertAdjacentHTML('afterbegin', html);
}

export function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
