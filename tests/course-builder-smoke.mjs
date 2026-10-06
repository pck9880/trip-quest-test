import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('site-src/index.html','utf8');
const planner=fs.readFileSync('site-src/js/domain/course-planner.js','utf8');
const search=fs.readFileSync('site-src/js/controllers/search-controller.js','utf8');
const national=fs.readFileSync('site-src/js/services/national-place-store.js','utf8');
const manifest=JSON.parse(fs.readFileSync('site-src/data/national/runtime-manifest.json','utf8'));

for(const id of ['nearbyRadiusRange','nearbyRadiusValue','nearbyChoiceList','courseDepartTime','destinationStayMin','buildSelectedCourseBtn','courseTimeline'])assert.ok(html.includes('id="'+id+'"'),id+' missing');
assert.match(html,/min="1" max="20" step="0\.5"/);
assert.doesNotMatch(html,/A 도보 근거리 \/ B 드라이브|DRIVE · 주변 드라이브/);
assert.match(planner,/optimizeStops/);
assert.match(planner,/buildSelectedCourse/);
assert.match(planner,/endTime/);
assert.match(search,/selectedNearbyIds/);
assert.match(search,/최적 코스/);
assert.match(national,/DecompressionStream/);
assert.match(national,/TRIP QUEST 공식 DB/);
assert.equal(manifest.status,'ready');
assert.equal(manifest.total,20365);
assert.equal(manifest.parts.length,8);

console.log('TRIP QUEST selected-course and national DB checks passed');
