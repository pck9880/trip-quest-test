const NOMINATIM='https://nominatim.openstreetmap.org/search';
const OVERPASS='https://overpass-api.de/api/interpreter';
const REGION_CACHE='trip-quest-test-region-cache-v1';
const REGION_CACHE_MS=30*24*60*60*1000;

function readCache(){
  try{return JSON.parse(localStorage.getItem(REGION_CACHE)||'{}')}catch{return {}}
}
function writeCache(cache){
  try{localStorage.setItem(REGION_CACHE,JSON.stringify(cache))}catch{}
}
function firstNamed(items=[]){
  return items.find(x=>x.osm_type==='relation'&&(x.class==='boundary'||x.type==='administrative'))||items[0]||null;
}
async function resolveRegion(region){
  const key=region.trim();
  const cache=readCache();
  const hit=cache[key];
  if(hit&&Date.now()-hit.savedAt<REGION_CACHE_MS)return hit.value;

  const params=new URLSearchParams({
    q:key+', 대한민국',
    format:'jsonv2',
    limit:'5',
    countrycodes:'kr',
    addressdetails:'1',
    'accept-language':'ko'
  });
  const res=await fetch(NOMINATIM+'?'+params.toString(),{headers:{Accept:'application/json'}});
  if(!res.ok)throw new Error('지역 경계를 찾지 못했습니다.');
  const choice=firstNamed(await res.json());
  if(!choice)throw new Error(key+' 지역을 찾지 못했습니다.');
  const bbox=(choice.boundingbox||[]).map(Number);
  const value={
    name:key,
    displayName:choice.display_name||key,
    osmType:choice.osm_type,
    osmId:Number(choice.osm_id),
    lat:Number(choice.lat),
    lng:Number(choice.lon),
    bbox:bbox.length===4?bbox:null
  };
  cache[key]={savedAt:Date.now(),value};
  writeCache(cache);
  return value;
}

function selectors(type,categories=[]){
  const requested=type||categories[0]||'';
  const map={
    '카페':[
      'nwr(area.searchArea)["amenity"="cafe"]["name"];',
      'nwr(area.searchArea)["shop"="bakery"]["name"];'
    ],
    '맛집':[
      'nwr(area.searchArea)["amenity"="restaurant"]["name"];',
      'nwr(area.searchArea)["amenity"="food_court"]["name"];'
    ],
    '소품샵':[
      'nwr(area.searchArea)["shop"="gift"]["name"];',
      'nwr(area.searchArea)["shop"="variety_store"]["name"];'
    ],
    '바다':[
      'nwr(area.searchArea)["natural"="beach"]["name"];',
      'nwr(area.searchArea)["tourism"="viewpoint"]["name"];'
    ],
    '산':['nwr(area.searchArea)["natural"="peak"]["name"];'],
    '공원':[
      'nwr(area.searchArea)["leisure"="park"]["name"];',
      'nwr(area.searchArea)["leisure"="garden"]["name"];'
    ],
    '뮤지엄':[
      'nwr(area.searchArea)["tourism"="museum"]["name"];',
      'nwr(area.searchArea)["tourism"="gallery"]["name"];'
    ],
    '전통시장':['nwr(area.searchArea)["amenity"="marketplace"]["name"];'],
    '캠핑':['nwr(area.searchArea)["tourism"="camp_site"]["name"];'],
    '온천':[
      'nwr(area.searchArea)["natural"="hot_spring"]["name"];',
      'nwr(area.searchArea)["leisure"="spa"]["name"];'
    ],
    '관광지':[
      'nwr(area.searchArea)["tourism"="attraction"]["name"];',
      'nwr(area.searchArea)["tourism"="viewpoint"]["name"];',
      'nwr(area.searchArea)["historic"]["name"];'
    ],
    '체험마을':[
      'nwr(area.searchArea)["tourism"="attraction"]["name"];',
      'nwr(area.searchArea)["place"="village"]["name"];'
    ]
  };
  if(map[requested])return map[requested];
  const merged=[];
  for(const c of categories){if(map[c])merged.push(...map[c])}
  if(merged.length)return [...new Set(merged)];
  return [
    'nwr(area.searchArea)["tourism"="attraction"]["name"];',
    'nwr(area.searchArea)["tourism"="museum"]["name"];',
    'nwr(area.searchArea)["tourism"="viewpoint"]["name"];',
    'nwr(area.searchArea)["leisure"="park"]["name"];',
    'nwr(area.searchArea)["natural"="beach"]["name"];',
    'nwr(area.searchArea)["amenity"="marketplace"]["name"];',
    'nwr(area.searchArea)["historic"]["name"];'
  ];
}
function inferCategory(tags={},requested=''){
  if(requested)return requested;
  if(tags.amenity==='cafe'||tags.shop==='bakery')return '카페';
  if(tags.amenity==='restaurant'||tags.amenity==='food_court')return '맛집';
  if(tags.shop==='gift'||tags.shop==='variety_store')return '소품샵';
  if(tags.natural==='beach')return '바다';
  if(tags.natural==='peak')return '산';
  if(tags.leisure==='park'||tags.leisure==='garden')return '공원';
  if(tags.tourism==='museum'||tags.tourism==='gallery')return '뮤지엄';
  if(tags.amenity==='marketplace')return '전통시장';
  if(tags.tourism==='camp_site')return '캠핑';
  if(tags.natural==='hot_spring'||tags.leisure==='spa')return '온천';
  return '관광지';
}
function itemPoint(el){
  const lat=Number(el.lat??el.center?.lat),lng=Number(el.lon??el.center?.lon);
  return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
}
function metadataScore(tags={}){
  let score=54;
  if(tags.wikidata)score+=13;
  if(tags.wikipedia)score+=10;
  if(tags.website||tags['contact:website'])score+=6;
  if(tags.opening_hours)score+=4;
  if(tags.phone||tags['contact:phone'])score+=3;
  if(tags.image)score+=4;
  return Math.min(90,score);
}
function addressText(tags={},region=''){
  return [tags['addr:city']||tags['addr:county']||region,tags['addr:district'],tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' ');
}

export async function searchRegionPlaces({region,primaryPlaceType='',categories=[]}){
  if(!region)return {items:[],source:'none'};
  const boundary=await resolveRegion(region);
  const selectorList=selectors(primaryPlaceType,categories);
  let areaSetup='';
  if(boundary.osmType==='relation'&&Number.isFinite(boundary.osmId)){
    areaSetup='area('+(3600000000+boundary.osmId)+')->.searchArea;';
  }else if(boundary.bbox){
    const [south,north,west,east]=boundary.bbox;
    areaSetup='map_to_area->.searchArea;';
    const synthetic='('+south+','+west+','+north+','+east+')';
    const query='[out:json][timeout:18];('+selectorList.map(s=>s.replace('(area.searchArea)',synthetic)).join('')+');out center tags 80;';
    return runOverpass(query,boundary,primaryPlaceType);
  }else{
    throw new Error(region+' 행정경계를 확인하지 못했습니다.');
  }

  const query='[out:json][timeout:18];'+areaSetup+'('+selectorList.join('')+');out center tags 80;';
  return runOverpass(query,boundary,primaryPlaceType);
}

async function runOverpass(query,boundary,requested){
  const body=new URLSearchParams({data:query});
  const res=await fetch(OVERPASS,{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8',Accept:'application/json'},
    body
  });
  if(!res.ok)throw new Error('실시간 장소 검색 서버가 응답하지 않습니다.');
  const json=await res.json();
  const seen=new Set(),items=[];
  for(const el of json.elements||[]){
    const point=itemPoint(el),name=String(el.tags?.name||'').trim();
    if(!point||!name)continue;
    const key=name+'|'+point.lat.toFixed(4)+'|'+point.lng.toFixed(4);
    if(seen.has(key))continue;
    seen.add(key);
    items.push({
      id:'osm-'+el.type+'-'+el.id,
      name,
      category:inferCategory(el.tags,requested),
      lat:point.lat,
      lng:point.lng,
      address:addressText(el.tags,boundary.name)||boundary.name,
      liveRegion:boundary.name,
      liveSource:'OpenStreetMap/Overpass',
      score:metadataScore(el.tags),
      osmTags:el.tags||{}
    });
  }
  items.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ko'));
  return {items:items.slice(0,40),source:'OpenStreetMap/Overpass',region:boundary};
}
