import fs from 'node:fs';
import assert from 'node:assert/strict';

const auth=fs.readFileSync('site-src/auth.js','utf8');
const index=fs.readFileSync('site-src/index.html','utf8');
const css=fs.readFileSync('site-src/auth.css','utf8');
const sw=fs.readFileSync('site-src/sw.js','utf8');

assert.match(auth,/signInWithPassword/);
assert.match(auth,/auth\.signUp/);
assert.match(auth,/persistSession:true/);
assert.match(auth,/AUTH_STORAGE_KEY='trip-quest-test-auth-v2'/);
assert.match(auth,/REMEMBER_FLAG='trip-quest-test-auto-login-v2'/);
assert.match(auth,/sessionStorage/);
assert.match(auth,/localStorage/);
assert.match(auth,/sb_publishable_/);
assert.doesNotMatch(auth,/service_role|sb_secret_/i);

assert.match(index,/id="loginView"/);
assert.match(index,/id="signupView"/);
assert.match(index,/id="loginId"/);
assert.match(index,/id="loginPassword"/);
assert.match(index,/id="autoLogin"/);
assert.match(index,/id="signupEmail"/);
assert.match(index,/id="signupPasswordConfirm"/);
assert.doesNotMatch(index,/id="authLoginTab"|id="authSignupTab"/);
assert.match(index,/class="tq-auth-locked"/);
assert.match(index,/src="\.\/auth\.js\?v=20261006-auth2/);
assert.doesNotMatch(index,/type="module" src="\.\/app\.js/);

assert.match(css,/\.tq-auth-remember/);
assert.match(css,/body\.tq-auth-locked/);
assert.match(sw,/trip-quest-test-v1\.1\.2-fast-curated-search-20261006/);
assert.match(sw,/!html\.includes\('auth\.js'\)/);

console.log('TRIP QUEST TEST separated login/signup checks passed');
