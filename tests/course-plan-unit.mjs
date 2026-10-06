import assert from 'node:assert/strict';
import { buildSelectedCourse, optimizeStops } from '../site-src/js/domain/course-planner.js';

const destination={id:'d',name:'목적지',lat:35.0,lng:129.0};
const near={id:'near',name:'가까운 장소',lat:35.001,lng:129.001};
const far={id:'far',name:'먼 장소',lat:35.015,lng:129.015};

const ordered=optimizeStops(destination,[far,near]);
assert.equal(ordered[0].id,'d');
assert.equal(ordered[1].id,'near');

const stationary=await buildSelectedCourse({
  destination,
  selectedStops:[{id:'same',name:'동일지점',lat:35.0,lng:129.0}],
  departureTime:'09:00',
  stayById:{d:60,same:30}
});
assert.equal(stationary.stayMin,90);
assert.equal(stationary.travelMin,0);
assert.equal(stationary.endTime,'10:30');
assert.equal(stationary.endDayOffset,0);

const moving=await buildSelectedCourse({
  destination,
  selectedStops:[near,far],
  departureTime:'23:30',
  stayById:{d:60,near:30,far:30}
});
assert.ok(moving.travelMin>0);
assert.ok(moving.totalMin>moving.stayMin);
assert.ok(moving.endDayOffset>=1);
assert.equal(moving.mode,'walk');
assert.equal(moving.id,'SELECTED');

console.log('TRIP QUEST selected course timing/optimization checks passed');
