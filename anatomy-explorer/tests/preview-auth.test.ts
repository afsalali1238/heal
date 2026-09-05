/**
 * Preview door — S0 verification.
 *
 * `/preview` holds unpublished clinical content, so the two interesting properties
 * are (a) a misconfigured deployment must not fall open, and (b) a correct credential
 * must actually get through on the runtime that ships. (b) is the one the repo could
 * not previously see: the check ran `Buffer.from` in code Vercel executes on the Edge
 * runtime, and the branch is only reached once a password is set.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  PREVIEW_USER,
  checkPreviewAuth,
  parseBasic,
  type PreviewVerdict,
} from '../src/lib/preview-auth';

const basic = (user: string, password: string) => {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return `Basic ${btoa(binary)}`;
};

const decide = (
  header: string | null,
  password: string | undefined,
  hostname = 'preview.example.app'
): PreviewVerdict => checkPreviewAuth({ header, expectedPassword: password, hostname });

describe('preview auth', () => {
  it('opens for the configured clinician credential', () => {
    assert.equal(decide(basic(PREVIEW_USER, 's3cret'), 's3cret'), 'open');
  });

  it('challenges a request with no credentials at all', () => {
    assert.equal(decide(null, 's3cret'), 'unauthenticated');
    assert.equal(decide('', 's3cret'), 'unauthenticated');
  });

  it('challenges a header that is not Basic or not decodable', () => {
    for (const header of [
      'Bearer abc',
      'Basic',
      'Basic not!!base64',
      `Basic ${btoa('no colon here')}`,
    ]) {
      assert.equal(decide(header, 's3cret'), 'unauthenticated', `must reject: ${header}`);
    }
  });

  it('denies a well-formed credential with the wrong secret or the wrong user', () => {
    assert.equal(decide(basic(PREVIEW_USER, 'wr0ng'), 's3cret'), 'denied');
    assert.equal(decide(basic(PREVIEW_USER, 's3cre'), 's3cret'), 'denied');
    assert.equal(decide(basic(PREVIEW_USER, 's3cret '), 's3cret'), 'denied');
    assert.equal(decide(basic('admin', 's3cret'), 's3cret'), 'denied');
  });

  it('does not fall open when the password is unset', () => {
    // The whole point: an unset env var on a public host is a 503, not a bypass.
    for (const empty of [undefined, '', null]) {
      assert.equal(
        checkPreviewAuth({
          header: basic(PREVIEW_USER, ''),
          expectedPassword: empty as string | undefined,
          hostname: 'heal-git-arena-vercel.app',
        }),
        'not-configured'
      );
    }
  });

  it('lets loopback through unconfigured, and only loopback', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      assert.equal(decide(null, undefined, host), 'open', host);
    }
    // A host that merely *looks* local must not be trusted by prefix.
    assert.equal(decide(null, undefined, 'evil-localhost.example.com'), 'not-configured');
    assert.equal(decide(null, undefined, '127.0.0.1.evil.com'), 'not-configured');
  });

  it('survives the characters that broke the previous decoder', () => {
    // A colon in the password is legal RFC 7617 territory; `split(':')` truncated it.
    assert.equal(decide(basic(PREVIEW_USER, 'a:b:c'), 'a:b:c'), 'open');
    assert.equal(decide(basic(PREVIEW_USER, 'a:b:c'), 'a:b'), 'denied');
    // Non-ASCII needs the byte round-trip; a latin1 read would corrupt it.
    assert.equal(decide(basic(PREVIEW_USER, 'cliniciän—2026'), 'cliniciän—2026'), 'open');
    assert.equal(decide(basic(PREVIEW_USER, '密码'), '密码'), 'open');
  });

  it('does not reach for Node-only globals that the edge runtime does not have', () => {
    // A regression guard, not a style rule: the shipped code path must survive a V8
    // isolate. Comments are stripped first, because the note above this file talks
    // about `Buffer` by name.
    const source = readFileSync(
      fileURLToPath(new URL('../src/lib/preview-auth.ts', import.meta.url)),
      'utf8'
    );
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.equal(/\bBuffer\b|\bprocess\./.test(code), false);
    assert.deepEqual(parseBasic(basic('clinician', 'pw')), { user: 'clinician', password: 'pw' });
    assert.equal(parseBasic('Basic Zm9v'), null);
  });
});
