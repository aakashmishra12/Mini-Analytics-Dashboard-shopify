const PALETTE = [
  ['#e4e4e7', '#a1a1aa'],
  ['#dbeafe', '#60a5fa'],
  ['#dcfce7', '#4ade80'],
  ['#fef3c7', '#fbbf24'],
  ['#fae8ff', '#c084fc'],
  ['#ffe4e6', '#fb7185'],
  ['#cffafe', '#22d3ee'],
];

const hash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const initials = (title) =>
  title
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w[0] ?? ''))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/**
 * Mock products need images that render without a network round-trip, so we
 * inline a deterministic SVG rather than pointing at a placeholder host.
 */
export function placeholderImage(title) {
  const [from, to] = PALETTE[hash(title) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/></linearGradient></defs><rect width="160" height="160" fill="url(#g)"/><text x="80" y="80" font-family="ui-sans-serif,system-ui,sans-serif" font-size="52" font-weight="600" fill="#18181b" fill-opacity="0.55" text-anchor="middle" dominant-baseline="central">${initials(title)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
