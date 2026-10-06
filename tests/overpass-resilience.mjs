import fs from 'node:fs';
import assert from 'node:assert/strict';

const live=fs.readFileSync('site-src/js/services/live-place-search.js','utf8');

assert.match(live,/overpass\.private\.coffee/);
assert.match(live,/overpass-api\.de/);
assert.match(live,/maps\.mail\.ru/);
assert.match(live,/OVERPASS_ENDPOINTS/);
assert.match(live,/AbortController/);
assert.match(live,/for\(const endpoint of OVERPASS_ENDPOINTS\)/);
assert.match(live,/Partial Overpass category failures/);
assert.match(live,/route"~"\^\(hiking\|walking\)\$/);
assert.doesNotMatch(live,/highway"="path/);

console.log('TRIP QUEST Overpass resilience checks passed');
