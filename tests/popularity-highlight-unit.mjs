import assert from 'node:assert/strict';
import { pickPopularRecommendations, popularityScore, popularBasis } from '../site-src/js/domain/popularity.js';

const items=[
  {id:'a',name:'일반공원',category:'공원',score:80},
  {id:'b',name:'해운대해수욕장',category:'해수욕장',score:80},
  {id:'c',name:'중앙문화공원',category:'공원',score:82},
  {id:'d',name:'박물관',category:'박물관미술관',score:81}
];
const top=pickPopularRecommendations(items);
assert.equal(top.length,3);
assert.equal(top[0].place.id,'b');
assert.ok(popularityScore(items[1])>popularityScore(items[0]));

const two=pickPopularRecommendations(items.slice(0,2));
assert.equal(two.length,1);

const one=pickPopularRecommendations(items.slice(0,1));
assert.equal(one.length,1);

const none=pickPopularRecommendations([]);
assert.equal(none.length,0);

const traffic=[
  {id:'x',name:'X',category:'공원',score:99,footTraffic:100},
  {id:'y',name:'Y',category:'공원',score:70,footTraffic:200}
];
assert.equal(pickPopularRecommendations(traffic)[0].place.id,'y');
assert.equal(popularBasis(traffic),'foot-traffic');
assert.equal(popularBasis(items),'popularity-proxy');

console.log('TRIP QUEST popularity highlight checks passed');
