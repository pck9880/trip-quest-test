import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('site-src/index.html','utf8');
const store=fs.readFileSync('site-src/js/store/trip-store.js','utf8');
const live=fs.readFileSync('site-src/js/services/live-place-search.js','utf8');
const course=fs.readFileSync('site-src/js/domain/course-planner.js','utf8');
const controller=fs.readFileSync('site-src/js/controllers/app-controller.js','utf8');
const selectorCss=fs.readFileSync('site-src/selector.css','utf8');
const selector=fs.readFileSync('site-src/js/ui/quest-selector.js','utf8');

for(const id of ['regionLevel1','regionLevel2','regionLevel3','placeChoices','facilityChoices','selectionSummary','regionLoadBar','regionLoadPercent','regionContinueBtn'])assert.ok(html.includes('id="'+id+'"'),id+' missing');
assert.doesNotMatch(html,/id="aiInput"|id="aiSend"|distanceMinRange|directionChoices/);
assert.match(store,/regionBoundary/);
assert.match(store,/facilities/);
assert.match(live,/regionChildren/);
assert.match(live,/admin_level/);
assert.match(live,/OpenStreetMap/);
assert.match(live,/shop"="department_store/);
assert.match(live,/place_of_worship/);
assert.match(course,/fixed place data|고정 장소 데이터 미사용/);
assert.doesNotMatch(course,/RAW_PLACES|CURATED_COURSES|HOTSPOT_META/);
assert.doesNotMatch(controller,/aiSend|originSearch|distanceMinRange/);
assert.match(selector,/regionContinueBtn/);
assert.match(selector,/REGION COMPLETE/);
assert.match(selectorCss,/pixel-loader-frame/);
assert.match(selectorCss,/body\[data-trip-step="2"\] \.wizard\{display:block!important\}/);

console.log('TRIP QUEST TEST selection engine checks passed');
