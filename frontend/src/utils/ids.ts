export function newId(): string {
  const seq = newId._seq;
  newId._seq = seq + 1;
  return 'n' + Date.now().toString(36) + '_' + seq.toString(36);
}
newId._seq = 0;

export function escapeHtml(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stamp(): string {
  const t = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
}
