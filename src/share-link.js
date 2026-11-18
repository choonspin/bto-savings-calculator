// A plan can travel inside a link, after the #. Browsers never send that part to the website,
// so the numbers go only to whoever opens the link.

const PREFIX = '#plan=';
const VERSION = '1';

export function planLink(baseUrl, plan) {
  const trips = plan.trips.map(({ name, month, budget }) => ({ name, month, budget }));
  return `${baseUrl}${PREFIX}${VERSION}.${toBase64Url(JSON.stringify({ ...plan, trips }))}`;
}

/** The plan carried by a link's hash, or null. It isn't validated: pass it through normalizePlan. */
export function planFromHash(hash) {
  if (!hash.startsWith(PREFIX)) return null;
  const [version, data] = hash.slice(PREFIX.length).split('.');
  if (version !== VERSION || !data) return null;
  try {
    return JSON.parse(fromBase64Url(data));
  } catch {
    return null;
  }
}

// base64url keeps the link free of characters that chat apps break links on
function toBase64Url(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data) {
  const binary = atob(data.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}
