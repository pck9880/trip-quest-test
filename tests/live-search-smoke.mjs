import fs from 'node:fs';
import assert from 'node:assert/strict';

const intent=fs.readFileSync('site-src/js/domain/intent-parser.js','utf8');
const travel=fs.readFileSync('site-src/js/services/travel-service.js','utf8');
const rec=fs.readFileSync('site-src/js/domain/recommendation.js','utf8');
const live=fs.readFileSync('site-src/js/services/live-place-search.js','utf8');
const html=fs.readFileSync('site-src/index.html','utf8');

assert.match(intent,/primaryPlaceType='카페'/);
assert.match(intent,/&&\s*!focus\)return \{mode:'local',intent:'clarify'/);
assert.match(intent,/exactRegion:!!focus/);
assert.match(rec,/body\.exactRegion/);
assert.match(rec,/recommendationRegion\(p\.name\).*===focus/);
assert.match(travel,/searchRegionPlaces/);
assert.match(travel,/openai:false,livePlaces:true/);
assert.match(travel,/mode='live_region'/);
assert.match(live,/overpass-api\.de\/api\/interpreter/);
assert.match(live,/3600000000\+boundary\.osmId/);
assert.match(live,/amenity"="cafe/);
assert.match(live,/OpenStreetMap\/Overpass/);
assert.match(html,/TRIP QUEST SEARCH/);
assert.doesNotMatch(html,/TRIP QUEST AI/);

console.log('TRIP QUEST TEST live regional search checks passed');
