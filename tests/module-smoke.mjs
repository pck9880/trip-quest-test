import assert from 'node:assert/strict';

await import('../site-src/app.js');
assert.ok(true,'app module import failed');

console.log('TRIP QUEST TEST app module import passed');
