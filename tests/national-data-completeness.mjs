import fs from 'node:fs';
import assert from 'node:assert/strict';

const importer=fs.readFileSync('scripts/build-national-places.mjs','utf8');
const workflow=fs.readFileSync('.github/workflows/national-data.yml','utf8');

assert.match(importer,/status:incomplete\?'partial':'ready'/);
assert.match(importer,/large-stores/);
assert.match(importer,/traditional-temples/);
assert.match(importer,/underground-shopping/);
assert.match(importer,/tour-api/);
assert.match(workflow,/DATA_GO_KR_SERVICE_KEY/);
assert.match(workflow,/npm run data:build/);
assert.match(workflow,/git push/);

console.log('TRIP QUEST national data completeness checks passed');
