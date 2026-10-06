import fs from 'node:fs';
import assert from 'node:assert/strict';

const taxonomy=fs.readFileSync('site-src/js/data/selection-taxonomy.js','utf8');
const importer=fs.readFileSync('scripts/build-national-places.mjs','utf8');
const registry=JSON.parse(fs.readFileSync('data-sources/national-place-sources.json','utf8'));
const manifest=JSON.parse(fs.readFileSync('site-src/data/national/manifest.json','utf8'));

for(const cat of ['공원','대형마트','백화점','전통시장','해수욕장','산','사찰','산책로','카페거리','쇼핑거리','대형복합시설','대형도서관']){
  assert.ok(taxonomy.includes("id:'"+cat+"'"),cat+' taxonomy missing');
}
for(const removed of ["id:'맛집'","id:'숙박'","id:'온천'","id:'캠핑'","id:'카페'","id:'마트'","id:'해변'","id:'도서관'"]){
  assert.ok(!taxonomy.includes(removed),removed+' must not be selectable');
}
assert.match(importer,/DATA_GO_KR_SERVICE_KEY/);
assert.match(importer,/3000/);
assert.match(importer,/100000/);
assert.match(importer,/카페거리/);
assert.match(importer,/쇼핑거리/);
assert.match(importer,/IKEA 광명점/);
assert.ok(registry.sources.length>=10);
assert.equal(manifest.status,'awaiting-official-import');
assert.equal(manifest.total,0);

console.log('TRIP QUEST national data pipeline checks passed');
