import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRequest, sign, verifySignature } from "../lib/appcenter-protocol.ts";

const secret = "x".repeat(40);
const body = JSON.stringify({ op: "ping" });
const now = 1_800_000_000_000;
const ts = String(now);

test("giltig signatur godkänns", () => {
  assert.equal(verifySignature({ secrets: [secret], timestamp: ts, signature: sign(secret, ts, body), body, now }), true);
});
test("fel hemlighet, ändrad kropp eller saknad signatur nekas", () => {
  const sig = sign(secret, ts, body);
  assert.equal(verifySignature({ secrets: ["y".repeat(40)], timestamp: ts, signature: sig, body, now }), false);
  assert.equal(verifySignature({ secrets: [secret], timestamp: ts, signature: sig, body: body + " ", now }), false);
  assert.equal(verifySignature({ secrets: [secret], timestamp: ts, signature: null, body, now }), false);
  assert.equal(verifySignature({ secrets: [secret], timestamp: ts, signature: "zz", body, now }), false);
});
test("gammal tidsstämpel nekas (replay)", () => {
  const old = String(now - 10 * 60 * 1000);
  assert.equal(verifySignature({ secrets: [secret], timestamp: old, signature: sign(secret, old, body), body, now }), false);
});
test("för kort hemlighet godtas aldrig", () => {
  const weak = "abc";
  assert.equal(verifySignature({ secrets: [weak], timestamp: ts, signature: sign(weak, ts, body), body, now }), false);
  assert.equal(verifySignature({ secrets: [], timestamp: ts, signature: sign(weak, ts, body), body, now }), false);
});
test("nyckelrotation: föregående hemlighet fungerar parallellt", () => {
  const prev = "p".repeat(40);
  assert.equal(verifySignature({ secrets: [secret, prev], timestamp: ts, signature: sign(prev, ts, body), body, now }), true);
});
test("parseRequest validerar operationer och indata", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  assert.deepEqual(parseRequest({ op: "ping" }), { op: "ping" });
  assert.equal(parseRequest({ op: "drop_tables" }), null);
  assert.equal(parseRequest({ op: "get_customer", id: "1' or 1=1" }), null);
  assert.equal(parseRequest({ op: "list_customers", limit: 99999 }), null);
  assert.equal(parseRequest({ op: "set_access", id, change: { action: "extend_trial", days: -5 }, actor: "a@b.se" }), null);
  assert.equal(parseRequest({ op: "set_access", id, change: { action: "grant_free", until: "inte-datum" }, actor: "a@b.se" }), null);
  assert.equal(parseRequest({ op: "set_access", id, change: { action: "block" } }), null);
  assert.deepEqual(
    parseRequest({ op: "set_access", id, change: { action: "grant_free" }, actor: "a@b.se" }),
    { op: "set_access", id, change: { action: "grant_free", until: null }, actor: "a@b.se", reason: undefined }
  );
});
