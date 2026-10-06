import assert from 'node:assert/strict';
import { curatedBeachFallback } from '../site-src/js/services/live-place-search.js';

const busan=curatedBeachFallback({name:'부산광역시'});
assert.equal(busan.length,7);
for(const name of ['해운대해수욕장','광안리해수욕장','송정해수욕장','송도해수욕장','다대포해수욕장','일광해수욕장','임랑해수욕장']){
  assert.ok(busan.some(x=>x.name===name),name+' missing');
}
assert.equal(curatedBeachFallback({name:'서울특별시'}).length,0);
assert.ok(busan.every(x=>x.category==='해수욕장'&&Number.isFinite(x.lat)&&Number.isFinite(x.lng)));
console.log('TRIP QUEST Busan beach fallback checks passed');
