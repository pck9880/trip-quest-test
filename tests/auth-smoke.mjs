import fs from 'node:fs';
import assert from 'node:assert/strict';

const auth=fs.readFileSync('site-src/auth.js','utf8');
const index=fs.readFileSync('site-src/index.html','utf8');
const css=fs.readFileSync('site-src/auth.css','utf8');

assert.match(auth,/signInWithPassword/);
assert.match(auth,/auth\.signUp/);
assert.match(auth,/persistSession:true/);
assert.match(auth,/storageKey:'trip-quest-test-auth-v1'/);
assert.match(auth,/sb_publishable_/);
assert.doesNotMatch(auth,/service_role|sb_secret_/i);
assert.match(index,/id="authGate"/);
assert.match(index,/class="tq-auth-locked"/);
assert.match(index,/src="\.\/auth\.js/);
assert.doesNotMatch(index,/type="module" src="\.\/app\.js/);
assert.match(css,/body\.tq-auth-locked/);

console.log('TRIP QUEST TEST auth gate checks passed');
