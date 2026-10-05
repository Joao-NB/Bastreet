const STATES = Object.freeze({AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'});
function parseLocation(value){
  const parts=String(value||'').trim().split(',');if(parts.length!==2)return null;
  const city=parts[0].trim().replace(/\s+/g,' '),state=parts[1].trim().toUpperCase();
  if(city.length<2||city.length>80||! /^[\p{L}][\p{L}\p{M}\s.'’-]*$/u.test(city)||!Object.hasOwn(STATES,state))return null;
  return {city,state,location:`${city}, ${state}`};
}
const cityKey=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function locationKey(value){const parsed=parseLocation(value);return parsed?`${cityKey(parsed.city)}|${parsed.state}`:`${cityKey(String(value||'Olinda').split(',')[0].trim())}|PE`;}
module.exports={STATES,parseLocation,locationKey};
