export function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function setHTML(element, html = '') {
  if (!element) return;
  // Audited HTML sink: callers must escape or whitelist dynamic fields first.
  if (typeof element.replaceChildren === 'function' && typeof element.insertAdjacentHTML === 'function') {
    element.replaceChildren();
    element.insertAdjacentHTML('afterbegin', String(html));
    return;
  }
  element.innerHTML = String(html);
}

export function clearElement(element) {
  if (element) element.replaceChildren();
}

export function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
