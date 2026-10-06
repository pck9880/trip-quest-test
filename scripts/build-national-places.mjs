import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'site-src/data/national');
const SOURCE_FILE=path.join(ROOT,'data-sources/national-place-sources.json');
const SERVICE_KEY=process.env.DATA_GO_KR_SERVICE_KEY||'';
const TOUR_KEY=process.env.TOUR_API_SERVICE_KEY||SERVICE_KEY;
const LOCALDATA_LARGE_STORES=process.env.LOCALDATA_LARGE_STORES||'';
const LOCALDATA_TEMPLES=process.env.LOCALDATA_TEMPLES||'';

const sources=JSON.parse(await fs.readFile(SOURCE_FILE,'utf8')).sources;

function pick(o,...keys){
  for(const k of keys){
    if(o&&o[k]!=null&&String(o[k]).trim()!=='')return o[k];
    const found=Object.keys(o||{}).find(x=>x.toLowerCase()===String(k).toLowerCase());
    if(found&&String(o[found]).trim()!=='')return o[found];
  }
  return '';
}
function n(v){const x=Number(String(v??'').replaceAll(',',''));return Number.isFinite(x)?x:null}
function s(v){return String(v??'').trim()}
function boolText(v){return /^(y|yes|true|1|있음|가능|유)$/i.test(s(v))}
function normalizeName(v){return s(v).replace(/\s+/g,' ').trim()}
function parseRegion(address=''){
  const tokens=s(address).replace(/[(),]/g,' ').split(/\s+/).filter(Boolean);
  const sido=tokens[0]||'';
  const sigunguParts=[];
  for(let i=1;i<Math.min(tokens.length,4);i++){
    if(/(시|군|구)$/.test(tokens[i]))sigunguParts.push(tokens[i]);
    else break;
  }
  const local=tokens.find((x,i)=>i>0&&/(읍|면|동|가|리)$/.test(x))||'';
  return {sido,sigungu:sigunguParts.join(' '),eupmyeondong:local,regionTerms:[...new Set([sido,...sigunguParts,local].filter(Boolean))]};
}
function idFor(source,rawId,name,lat,lng){
  const seed=[source,rawId||'',name||'',lat??'',lng??''].join('|');
  let h=2166136261;
  for(const ch of seed){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return source+'-'+(h>>>0).toString(36);
}
function itemBase({source,rawId,name,category,subcategory='',address='',lat=null,lng=null,referenceDate='',metadata={},facilities={}}){
  const region=parseRegion(address);
  return {
    id:idFor(source,rawId,name,lat,lng),
    name:normalizeName(name),
    category,subcategory,
    ...region,address:s(address),
    lat:n(lat),lng:n(lng),
    facilities:{parking:null,indoor:null,outdoor:null,pet:null,wheelchair:null,toilets:null,...facilities},
    access:'official',
    status:'active',
    source:{id:source,recordId:s(rawId),referenceDate:s(referenceDate)},
    metadata
  };
}
function extractItems(json){
  const candidates=[
    json?.response?.body?.items?.item,json?.response?.body?.items,
    json?.body?.items?.item,json?.body?.items,json?.items?.item,json?.items,
    json?.data
  ];
  for(const x of candidates){
    if(Array.isArray(x))return x;
    if(x&&typeof x==='object'&&!Array.isArray(x))return [x];
  }
  return [];
}
function totalCount(json){
  return Number(json?.response?.body?.totalCount??json?.body?.totalCount??json?.totalCount??extractItems(json).length)||0;
}
function xmlText(xml,tag){
  const m=String(xml).match(new RegExp('<'+tag+'(?:\\s[^>]*)?>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/'+tag+'>','i'));
  return m?s(m[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')):'';
}
function xmlItems(xml){
  return [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m=>{
    const obj={};
    for(const x of m[1].matchAll(/<([A-Za-z0-9_:-]+)(?:\s[^>]*)?>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/g))obj[x[1]]=s(x[2]);
    return obj;
  });
}
async function fetchPage(url,{pageNo=1,numOfRows=1000,key=SERVICE_KEY,extra={}}={}){
  if(!key)throw new Error('DATA_GO_KR_SERVICE_KEY가 없습니다.');
  const u=new URL(url);
  u.searchParams.set('serviceKey',key);
  u.searchParams.set('pageNo',String(pageNo));
  u.searchParams.set('numOfRows',String(numOfRows));
  u.searchParams.set('type','json');
  u.searchParams.set('_type','json');
  for(const [k,v] of Object.entries(extra))if(v!=null&&v!=='')u.searchParams.set(k,String(v));
  const res=await fetch(u,{headers:{Accept:'application/json, application/xml;q=0.8, text/xml;q=0.7'}});
  if(!res.ok)throw new Error(url+' HTTP '+res.status);
  const text=await res.text();
  if(/^\s*[{[]/.test(text)){
    try{return {items:extractItems(JSON.parse(text)),total:totalCount(JSON.parse(text))}}catch{}
  }
  return {items:xmlItems(text),total:Number(xmlText(text,'totalCount'))||0};
}
async function fetchAll(url,opts={}){
  const rows=opts.numOfRows||1000,all=[];
  for(let page=1;page<=10000;page++){
    const r=await fetchPage(url,{...opts,pageNo:page,numOfRows:rows});
    all.push(...r.items);
    if(!r.items.length||all.length>=r.total||(r.total===0&&r.items.length<rows))break;
    await new Promise(r=>setTimeout(r,90));
  }
  return all;
}
function csvRows(text){
  const rows=[];let row=[],field='',q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],next=text[i+1];
    if(c==='"'&&q&&next==='"'){field+='"';i++;continue}
    if(c==='"'){q=!q;continue}
    if(c===','&&!q){row.push(field);field='';continue}
    if((c==='\n'||c==='\r')&&!q){
      if(c==='\r'&&next==='\n')i++;
      row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];continue;
    }
    field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row)}
  if(rows.length<2)return [];
  const header=rows[0].map(x=>x.replace(/^\uFEFF/,'').trim());
  return rows.slice(1).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])));
}
async function readCsv(file){
  if(!file)return [];
  return csvRows(await fs.readFile(path.resolve(file),'utf8'));
}

function normPark(r){
  const name=pick(r,'PARK_NM','parkNm','공원명'),addr=pick(r,'RDNMADR','LNMADR','rdnmadr','lnmadr','소재지도로명주소','소재지지번주소');
  return name?itemBase({source:'urban-parks',rawId:pick(r,'MANAGE_NO','manageNo','관리번호'),name,category:'공원',subcategory:pick(r,'PARK_SE','parkSe','공원구분'),address:addr,lat:pick(r,'LATITUDE','latitude','위도'),lng:pick(r,'LONGITUDE','longitude','경도'),referenceDate:pick(r,'REFERENCE_DATE','referenceDate','데이터기준일자'),facilities:{parking:/주차/.test(s(pick(r,'CNVNNC_FCLTY','ETC_FCLTY','공원보유시설(편익시설)','공원보유시설(기타시설)')))||null,toilets:/화장실/.test(s(pick(r,'CNVNNC_FCLTY','ETC_FCLTY','공원보유시설(편익시설)','공원보유시설(기타시설)')))||null,outdoor:true}}):null;
}
function normMarket(r){
  const name=pick(r,'mrktNm','MRKT_NM','시장명'),addr=pick(r,'rdnmadr','lnmadr','RDNMADR','LNMADR','소재지도로명주소','소재지지번주소');
  return name?itemBase({source:'traditional-markets',rawId:pick(r,'mrktCode','MRKT_CODE','시장번호'),name,category:'전통시장',subcategory:pick(r,'mrktSe','MRKT_SE','시장유형'),address:addr,lat:pick(r,'latitude','LATITUDE','위도'),lng:pick(r,'longitude','LONGITUDE','경도'),referenceDate:pick(r,'referenceDate','REFERENCE_DATE','데이터기준일자'),facilities:{parking:boolText(pick(r,'parkngYn','PARKNG_YN','주차장보유여부'))||null,toilets:boolText(pick(r,'toiletYn','TOILET_YN','공중화장실보유여부'))||null}}):null;
}
function normLibrary(r){
  const seats=n(pick(r,'seatNumber','SEAT_NUMBER','좌석수')),books=n(pick(r,'bookCo','BOOK_CO','도서수','자료수')),area=n(pick(r,'buldAr','BULD_AR','건물면적','연면적'));
  if(!((area??0)>=3000||(seats??0)>=300||(books??0)>=100000))return null;
  const name=pick(r,'lbrryNm','LBRRY_NM','도서관명'),addr=pick(r,'rdnmadr','lnmadr','RDNMADR','LNMADR','소재지도로명주소','소재지지번주소');
  return name?itemBase({source:'libraries',rawId:pick(r,'lbrryCode','LBRRY_CODE','도서관코드'),name,category:'대형도서관',subcategory:pick(r,'lbrrySe','LBRRY_SE','도서관유형'),address:addr,lat:pick(r,'latitude','LATITUDE','위도'),lng:pick(r,'longitude','LONGITUDE','경도'),referenceDate:pick(r,'referenceDate','REFERENCE_DATE','데이터기준일자'),metadata:{seats,books,buildingArea:area},facilities:{indoor:true}}):null;
}
function normStreet(r){
  const name=pick(r,'stretNm','STRET_NM','거리명'),intro=pick(r,'stretIntrcn','STRET_INTRCN','거리소개');
  const hay=(name+' '+intro).toLowerCase();
  let category='';
  if(/카페|커피|coffee|cafe/.test(hay))category='카페거리';
  else if(/쇼핑|패션|아울렛|상점|상가|시장거리|지하상가|지하도상가|로데오|shopping/.test(hay))category='쇼핑거리';
  if(!category)return null;
  const addr=pick(r,'rdnmadr','lnmadr','RDNMADR','LNMADR','소재지도로명','소재지지번주소');
  return itemBase({source:'specialized-streets',rawId:name+'|'+addr,name,category,subcategory:category==='카페거리'?'공식 카페거리':'공식 쇼핑거리',address:addr,lat:pick(r,'latitude','LATITUDE','위도'),lng:pick(r,'longitude','LONGITUDE','경도'),referenceDate:pick(r,'referenceDate','REFERENCE_DATE','데이터기준일자'),metadata:{intro:s(intro),length:n(pick(r,'stretLt','STRET_LT','총길이')),storeCount:n(pick(r,'storNumber','STOR_NUMBER','점포수'))},facilities:{outdoor:true}});
}
function normMountain(r){
  const name=pick(r,'mntnm','mntNm','산명','산이름'),addr=pick(r,'mntadd','mntAdd','소재지','주소');
  if(!name)return null;
  return itemBase({source:'mountains',rawId:pick(r,'mntid','mntId','산코드'),name,category:'산',subcategory:'산림청 산행 대상',address:addr,lat:pick(r,'mntlat','lat','위도'),lng:pick(r,'mntlon','lot','lng','경도'),metadata:{height:n(pick(r,'mntheight','mntHeight','높이')),details:s(pick(r,'mntinfodtlinfocont','상세정보'))},facilities:{outdoor:true}});
}
function normTrail(r){
  const name=pick(r,'frtrlNm','frtrlname','숲길명','등산로명'),section=pick(r,'frtrlSectnNm','구간명','구간');
  if(!name||(!section&&!pick(r,'frtrlId','숲길식별자')))return null;
  const addr=pick(r,'addr','주소','소재지');
  return itemBase({source:'forest-trails',rawId:pick(r,'frtrlId','frtrlSectnId','숲길식별자'),name:section?name+' · '+section:name,category:'산책로',subcategory:'공식 숲길·등산로',address:addr,lat:pick(r,'lat','위도'),lng:pick(r,'lot','lon','경도'),metadata:{trailName:s(name),section:s(section),distance:n(pick(r,'frtrlSectnLt','거리'))},facilities:{outdoor:true}});
}
function normBeach(r){
  const name=pick(r,'staNm','beachNm','해수욕장명','정점명'),addr=pick(r,'addr','주소','시도명','SIDO_NM');
  return name?itemBase({source:'beaches',rawId:pick(r,'staCde','beachCode','해수욕장코드'),name,category:'해수욕장',subcategory:'공식 해수욕장',address:addr,lat:pick(r,'lat','위도'),lng:pick(r,'lon','lot','경도'),metadata:{length:n(pick(r,'beachLen','length','해변길이')),width:n(pick(r,'beachWid','width','해변폭'))},facilities:{outdoor:true}}):null;
}
function activeLocalData(r){
  const status=s(pick(r,'영업상태명','영업상태','trdStateNm','상세영업상태명','dtlStateNm'));
  return !status||/영업|운영|정상|개장/.test(status);
}
function normLargeStore(r){
  if(!activeLocalData(r))return null;
  const type=s(pick(r,'업태구분명','업태명','storeType','대규모점포구분'));
  let category='';
  if(/대형마트/.test(type))category='대형마트';
  else if(/백화점/.test(type))category='백화점';
  else return null;
  const name=pick(r,'사업장명','storeNm','업소명'),addr=pick(r,'도로명전체주소','소재지전체주소','도로명주소','지번주소');
  return name?itemBase({source:'large-stores',rawId:pick(r,'관리번호','manageNo'),name,category,subcategory:type,address:addr,lat:pick(r,'위도','lat'),lng:pick(r,'경도','lng'),metadata:{licenseDate:s(pick(r,'인허가일자','licenseDate'))},facilities:{indoor:true,parking:null}}):null;
}
function normTemple(r){
  if(!activeLocalData(r))return null;
  const name=pick(r,'사업장명','사찰명','templeNm'),addr=pick(r,'도로명전체주소','소재지전체주소','도로명주소','지번주소');
  if(!name)return null;
  const x=itemBase({source:'traditional-temples',rawId:pick(r,'관리번호','manageNo'),name,category:'사찰',subcategory:'전통사찰·방문검증대기',address:addr,lat:pick(r,'위도','lat'),lng:pick(r,'경도','lng'),metadata:{visitVerified:false}});
  x.access='verification_required';
  return x;
}
const IKEA=[
  ['IKEA 광명점','경기도 광명시 일직로 17'],
  ['IKEA 고양점','경기도 고양시 덕양구 권율대로 420'],
  ['IKEA 기흥점','경기도 용인시 기흥구 신고매로 62'],
  ['IKEA 강동점','서울특별시 강동구 고덕비즈밸리로 51'],
  ['IKEA 동부산점','부산광역시 기장군 기장읍 동부산관광3로 17']
].map(([name,address])=>itemBase({source:'ikea-official',rawId:name,name,category:'대형복합시설',subcategory:'IKEA 정규 대형매장',address,facilities:{indoor:true,parking:true}}));

async function collect(){
  const results=[];
  const coverage={loaded:[],missing:[],errors:[]};
  const enabled=id=>sources.find(x=>x.id===id)?.enabled!==false;
  async function run(id,fn){
    try{
      const before=results.length;
      await fn();
      coverage.loaded.push({id,count:results.length-before});
    }catch(e){
      coverage.errors.push({id,error:e?.message||String(e)});
      console.warn('[SOURCE ERROR]',id,e?.message||e);
    }
  }
  if(enabled('urban-parks'))await run('urban-parks',async()=>results.push(...(await fetchAll(sources.find(x=>x.id==='urban-parks').endpoint)).map(normPark).filter(Boolean)));
  if(enabled('traditional-markets'))await run('traditional-markets',async()=>results.push(...(await fetchAll(sources.find(x=>x.id==='traditional-markets').endpoint)).map(normMarket).filter(Boolean)));
  if(enabled('libraries'))await run('libraries',async()=>results.push(...(await fetchAll(sources.find(x=>x.id==='libraries').endpoint)).map(normLibrary).filter(Boolean)));
  if(enabled('specialized-streets'))await run('specialized-streets',async()=>results.push(...(await fetchAll(sources.find(x=>x.id==='specialized-streets').endpoint)).map(normStreet).filter(Boolean)));
  if(enabled('mountains'))await run('mountains',async()=>results.push(...(await fetchAll(sources.find(x=>x.id==='mountains').endpoint,{numOfRows:500})).map(normMountain).filter(Boolean)));
  if(enabled('forest-trails'))await run('forest-trails',async()=>results.push(...(await fetchAll(sources.find(x=>x.id==='forest-trails').endpoint,{numOfRows:500})).map(normTrail).filter(Boolean)));
  if(enabled('beaches'))await run('beaches',async()=>{
    const sido=['부산','인천','울산','강원','충남','전북','전남','경북','경남','제주'];
    for(const x of sido)results.push(...(await fetchAll(sources.find(y=>y.id==='beaches').endpoint,{numOfRows:200,extra:{SIDO_NM:x}})).map(normBeach).filter(Boolean));
  });
  if(LOCALDATA_LARGE_STORES)await run('large-stores',async()=>results.push(...(await readCsv(LOCALDATA_LARGE_STORES)).map(normLargeStore).filter(Boolean)));
  else coverage.missing.push({id:'large-stores',reason:'LOCALDATA_LARGE_STORES 전국 CSV가 필요함'});
  if(LOCALDATA_TEMPLES)await run('traditional-temples',async()=>results.push(...(await readCsv(LOCALDATA_TEMPLES)).map(normTemple).filter(Boolean)));
  else coverage.missing.push({id:'traditional-temples',reason:'LOCALDATA_TEMPLES 전국 CSV가 필요함'});
  coverage.missing.push({id:'tour-api',reason:'관광공사 활용신청 후 공원 보강·놀이공원·방문가능 사찰 검증 adapter 실행 필요'});
  coverage.missing.push({id:'underground-shopping',reason:'전국 단일 표준셋 부재. 지자체 공식 지하도상가 파일 통합 필요'});
  results.push(...IKEA);
  coverage.loaded.push({id:'ikea-official',count:IKEA.length});
  return {results,coverage};
}
function dedupe(items){
  const map=new Map();
  for(const x of items){
    const key=[x.category,normalizeName(x.name),x.address||'',x.lat?.toFixed?.(4)||'',x.lng?.toFixed?.(4)||''].join('|');
    const old=map.get(key);
    if(!old||JSON.stringify(x).length>JSON.stringify(old).length)map.set(key,x);
  }
  return [...map.values()];
}
function safePart(v){return s(v||'_unknown').replace(/[\\/:*?"<>|]/g,'_')}
async function writeOutput(items,coverage){
  await fs.rm(OUT,{recursive:true,force:true});
  await fs.mkdir(OUT,{recursive:true});
  const byRegion=new Map();
  for(const x of items){
    const key=safePart(x.sido||'_unknown')+'/'+safePart(x.sigungu||'_all');
    if(!byRegion.has(key))byRegion.set(key,[]);
    byRegion.get(key).push(x);
  }
  const shards=[];
  for(const [key,list] of byRegion){
    const file=key+'.json',full=path.join(OUT,file);
    await fs.mkdir(path.dirname(full),{recursive:true});
    await fs.writeFile(full,JSON.stringify(list,null,2)+'\n');
    shards.push({file,count:list.length,sido:list[0]?.sido||'',sigungu:list[0]?.sigungu||''});
  }
  const counts=Object.fromEntries([...new Set(items.map(x=>x.category))].sort().map(c=>[c,items.filter(x=>x.category===c).length]));
  const incomplete=(coverage?.missing?.length||0)+(coverage?.errors?.length||0)>0;
  const manifest={version:1,status:incomplete?'partial':'ready',generatedAt:new Date().toISOString(),total:items.length,counts,coverage,shards};
  await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

if(!SERVICE_KEY){
  console.error('DATA_GO_KR_SERVICE_KEY 환경변수가 필요합니다. 공공데이터포털에서 일반 인증키를 발급하고 각 사용 API 활용신청을 완료한 뒤 실행하세요.');
  process.exit(2);
}

const collected=await collect();
const all=dedupe(collected.results);
const manifest=await writeOutput(all,collected.coverage);
console.log(JSON.stringify(manifest,null,2));
