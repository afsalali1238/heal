/**
 * The credential check for `/preview`, kept out of `src/middleware.ts` so it can be
 * tested without an Astro runtime.
 *
 * This is the door a physiotherapist walks through to review content that has not
 * been published, so its failure modes matter more than its features. The version
 * this replaces was written for a Node server and had two defects that no gate in
 * this repo could see:
 *
 * 1. It decoded the header with `Buffer.from(...)`. The Vercel adapter ships
 *    middleware on the Edge runtime, where `Buffer` is not a global, so the first
 *    request that actually *supplied* credentials would have thrown. Because
 *    `PREVIEW_PASSWORD` is unset on the deployed preview, the code never reached
 *    that line and the build stayed green — an auth path that is only exercised
 *    once someone configures it is an auth path nobody has ever run.
 * 2. It compared the password with `!==`. String comparison short-circuits on the
 *    first differing character, which turns a secret into a timing signal. Not a
 *    practical attack over TLS on a staging door, and there is no reason to carry
 *    it in a product whose subject matter is someone's body.
 *
 * `atob` is the portable decode path: it is a global in Node 18+, in Deno and in
 * V8 isolates, so the same function works in `astro dev`, in tests and on the edge.
 */

/** The account name the preview door accepts. Single fixed user, by design. */
export const PREVIEW_USER = 'clinician';

export type PreviewVerdict =
  /** serve the page */
  | 'open'
  /** 401 with a challenge: no credentials, or credentials we cannot parse */
  | 'unauthenticated'
  /** 401 with a challenge: parsed fine, wrong secret */
  | 'denied'
  /** 503: the door is not configured, so nothing behind it exists to protect */
  | 'not-configured';

export interface PreviewAuthInput {
  /** the raw `authorization` header, if any */
  header: string | null;
  /** `PREVIEW_PASSWORD`, unset or empty meaning "not configured" */
  expectedPassword: string | undefined | null;
  /** hostname of the request, used only for the localhost convenience */
  hostname: string;
}

/** Hosts that may open the preview without a password: the local review loop. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function checkPreviewAuth({
  header,
  expectedPassword,
  hostname,
}: PreviewAuthInput): PreviewVerdict {
  const password = expectedPassword ?? '';

  if (!password) {
    // Unconfigured is not "open to the world": only a loopback request gets in,
    // so a missing env var can never expose a draft to a patient by accident.
    return LOCAL_HOSTS.has(hostname) ? 'open' : 'not-configured';
  }

  const credentials = parseBasic(header);
  if (!credentials) return 'unauthenticated';
  if (credentials.user !== PREVIEW_USER) return 'denied';
  return timingSafeEqualStr(credentials.password, password) ? 'open' : 'denied';
}

/**
 * `Authorization: Basic base64(user:pass)` → the two halves.
 *
 * Returns null for anything it cannot read, including a well-formed header whose
 * base64 decodes to text without a colon. `split(':')` is deliberately *not* used:
 * a password containing a colon is legal, and the previous implementation silently
 * truncated it at the second one.
 */
export function parseBasic(header: string | null): { user: string; password: string } | null {
  if (!header) return null;
  const [scheme, encoded] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return null;

  let decoded: string;
  try {
    // latin1 → bytes → utf-8. `atob` gives us the bytes back one char each.
    const binary = atob(encoded.trim());
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return null;
  }

  const split = decoded.indexOf(':');
  if (split < 0) return null;
  return { user: decoded.slice(0, split), password: decoded.slice(split + 1) };
}

/**
 * Length-independent-ish comparison: every byte is visited, so the position of the
 * first difference does not change how long the check takes. The length itself is
 * still visible from the packet size, which is not a secret worth this trouble.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}
