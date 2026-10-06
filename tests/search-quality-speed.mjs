import fs from 'node:fs';
import assert from 'node:assert/strict';

const taxonomy=fs.readFileSync('site-src/js/data/selection-taxonomy.js','utf8');
const live=fs.readFileSync('site-src/js/services/live-place-search.js','utf8');
const travel=fs.readFileSync('site-src/js/services/travel-service.js','utf8');
const national=fs.readFileSync('site-src/js/services/national-place-store.js','utf8');
const app=fs.readFileSync('site-src/app.js','utf8');
const sw=fs.readFileSync('site-src/sw.js','utf8');

assert.doesNotMatch(taxonomy,/id:'대형마트'/);
assert.doesNotMatch(taxonomy,/id:'문화시설'/);
assert.doesNotMatch(taxonomy,/id:'체험'/);
assert.doesNotMatch(live,/\["historic"\]/);
assert.doesNotMatch(live,/\["craft"\]/);
assert.doesNotMatch(live,/shop"="supermarket/);
assert.match(live,/Promise\.allSettled\(tasks\)/);
assert.match(live,/visitorWorthy/);
assert.match(live,/BAD_NAME/);
assert.match(travel,/softDeadline/);
assert.match(travel,/6200/);
assert.match(travel,/official\.length>=12/);
assert.match(national,/destinationQuality/);
assert.match(national,/BAD_MARKET/);
assert.match(national,/GOOD_PARK/);
assert.match(app,/travelService\.preload\(\)/);
assert.match(sw,/national-v2\.part07\.bin/);
console.log('TRIP QUEST fast curated search checks passed');
