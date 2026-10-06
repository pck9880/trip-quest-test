import { activeVehicleProfile } from './vehicle-settings.js';
import { estimateRoundTripToll } from '../domain/trip-cost.js';
import { roadRoute } from './routing.js';
import { clientWeather, selectWeatherAt } from './weather.js';
import { localGeocode } from './geocoding.js';
import { localRecommend } from '../domain/recommendation.js';
import { refineRoadDistanceResults } from '../usecases/search-destinations.js';
import { localAI } from '../domain/intent-parser.js';
import { coursePack } from '../domain/course-planner.js';
import { searchRegionPlaces, searchNearbyPlaces } from './live-place-search.js';

export function createTravelService(){
  async function getConfig(){
    return {
      providers:{kakao:false,tmap:false,openai:false,livePlaces:true,weather:true},
      defaultGasPrice:1858,
      fuelEconomyKmL:11,
      publicBaseUrl:''
    };
  }

  async function geocode(query){
    return {items:await localGeocode(query||'')};
  }

  async function bootstrap(origin){
    const weather=await clientWeather(origin.lat,origin.lng);
    return {
      weather,
      traffic:{label:'경로 선택 후 계산',avgSpeed:0,source:'정적 배포판'},
      updatedAt:new Date().toISOString()
    };
  }

  async function selectionSearch(criteria){
    const result=await searchRegionPlaces({
      boundary:criteria.regionBoundary,
      categories:criteria.categories||[],
      facilities:criteria.facilities||[]
    });
    return {items:result.items,source:result.source};
  }

  async function recommend(criteria){
    const base=localRecommend(criteria);
    const items=await refineRoadDistanceResults(base,criteria);
    return {
      items,
      source:items.some(x=>x.roadVerified)?'도로 경로 + 내장 장소 데이터':'근사 경로 + 내장 장소 데이터'
    };
  }

  async function tripSummary(body){
    const [outbound,inbound]=await Promise.all([
      roadRoute(body.origin,body.destination),
      roadRoute(body.destination,body.origin)
    ]);
    const distanceKm=outbound.distanceKm+inbound.distanceKm;
    const drivingMin=outbound.timeMin+inbound.timeMin;
    const vehicle=activeVehicleProfile(body);
    const energyAmount=distanceKm/vehicle.efficiency;
    const energyCost=Math.round(energyAmount*vehicle.energyPrice);
    const toll=estimateRoundTripToll(distanceKm,vehicle.tollDiscount);

    return {
      outbound,
      inbound,
      total:{
        distanceKm,
        drivingMin,
        toll,
        tripCost:energyCost+toll,
        fuelLiters:energyAmount,
        fuelCost:energyCost,
        energyAmount,
        energyCost,
        energyUnit:vehicle.energyUnit,
        energyPrice:vehicle.energyPrice,
        vehicleLabel:vehicle.vehicleLabel,
        fuelLabel:vehicle.fuelLabel,
        efficiency:vehicle.efficiency,
        efficiencyUnit:vehicle.efficiencyUnit,
        energyLabel:vehicle.fuel==='electric'?'예상 전력':'예상 연료',
        costLabel:vehicle.fuel==='electric'?'충전비':'연료비'
      },
      fuelEconomyKmL:vehicle.efficiency
    };
  }

  async function courses(body){
    const weatherPack=await clientWeather(body.destination.lat,body.destination.lng);
    const weather=selectWeatherAt(weatherPack,body.departure);
    const nearby=await searchNearbyPlaces(body.destination,5000);
    return {
      weather,
      courses:await coursePack({...body,nearby},weather),
      provider:{ai:false,places:'OpenStreetMap/Overpass',road:'osrm-or-fallback'}
    };
  }

  async function aiSearch(message,context={}){
    const result=localAI(message||'',context);
    if(result.intent==='travel_search'&&context.origin){
      const merged={
        ...context,
        ...result.patch,
        focusQuery:result.focusQuery,
        exactRegion:!!result.exactRegion,
        semanticProfile:result.semanticProfile
      };
      if(result.exactRegion&&result.focusQuery){
        try{
          const live=await searchRegionPlaces({
            region:result.focusQuery,
            primaryPlaceType:result.primaryPlaceType||'',
            categories:merged.categories||[]
          });
          result.items=await refineRoadDistanceResults(live.items,merged);
          result.mode='live_region';
          result.provider={ai:false,places:live.source,region:result.focusQuery};
          result.message=`${result.focusQuery} 행정구역 내부의 실시간 장소를 검색했습니다. 다른 도시로 자동 확장하지 않습니다.`;
        }catch(e){
          result.items=await refineRoadDistanceResults(localRecommend(merged),merged);
          result.mode='local_region_fallback';
          result.provider={ai:false,places:'내장 데이터',region:result.focusQuery,error:e.message};
          result.message=`${result.focusQuery} 지역 실시간 검색에 실패해 내장 데이터에서 같은 지역만 검색했습니다.`;
        }
      }else{
        result.items=await refineRoadDistanceResults(localRecommend(merged),merged);
        result.mode='local_rules';
        result.provider={ai:false,places:'내장 데이터'};
      }
    }
    return result;
  }

  return {getConfig,geocode,bootstrap,selectionSearch,recommend,tripSummary,courses,aiSearch};
}
