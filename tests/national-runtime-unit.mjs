import fs from 'node:fs';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';

const manifest=JSON.parse(fs.readFileSync('site-src/data/national/runtime-manifest.json','utf8'));
assert.equal(manifest.status,'ready');
assert.equal(manifest.total,20365);
assert.equal(manifest.parts.length,8);

const gzip=Buffer.concat(manifest.parts.map(p=>fs.readFileSync('site-src/data/national/'+p)));
const payload=JSON.parse(zlib.gunzipSync(gzip).toString('utf8'));
assert.equal(payload.items.length,20365);

const counts=payload.items.reduce((m,x)=>(m[x.c]=(m[x.c]||0)+1,m),{});
assert.deepEqual(counts,{공원:18343,전통시장:1377,대형도서관:631,쇼핑거리:10,카페거리:4});

const sasangParks=payload.items.filter(x=>x.c==='공원'&&x.a.includes('부산광역시 사상구'));
assert.equal(sasangParks.length,33);
assert.ok(sasangParks.some(x=>x.n==='창날공원'&&x.a.includes('괘법동')));

const gwaebeopMarkets=payload.items.filter(x=>x.c==='전통시장'&&x.a.includes('부산광역시 사상구')&&x.a.includes('괘법동')).map(x=>x.n);
assert.deepEqual(gwaebeopMarkets.sort(),['르네시떼시장','부산산업용품상협동조합','사상시장'].sort());

const cafes=payload.items.filter(x=>x.c==='카페거리').map(x=>x.n).sort();
assert.deepEqual(cafes,['전포카페거리','보정동 카페거리','앞산카페거리','한남동카페거리'].sort());

assert.ok(payload.items.every(x=>Number.isFinite(Number(x.y))&&Number.isFinite(Number(x.x))));
console.log('TRIP QUEST official runtime dataset checks passed');
