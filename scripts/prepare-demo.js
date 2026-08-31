const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const people = [
  ['Ruan Deud','ruan@bastreet.demo','Homem',184,'Armador',76],
  ['João Guilherme','joao@bastreet.demo','Homem',182,'Ala-armador',78],
  ['Daniel Moura','daniel@bastreet.demo','Homem',191,'Pivô',74],
  ['Bárbara Menezes','barbara@bastreet.demo','Mulher',177,'Ala',80]
];
const users = people.map(([name,email,gender,height,position,skill]) => {
  const salt=crypto.randomBytes(16).toString('hex');
  return {id:crypto.randomUUID(),name,email,passwordHash:crypto.scryptSync('quadra123',salt,64).toString('hex'),salt,age:21,height,location:'Fortaleza, CE',position,gender,level:'Intermediário',availability:['Ter','Qui','Sáb'],skill,xp:0,semesterPoints:0,createdAt:new Date().toISOString()};
});
const db={users,sessions:[],trainings:[],checkins:[],messages:[{id:crypto.randomUUID(),userId:'bot',userName:'Rafael (bot)',text:'Ambiente preparado! Entrem com as quatro contas e busquem uma partida.',createdAt:new Date().toISOString()}],queue:[],matches:[],eventParticipants:[]};
const dir=path.join(__dirname,'..','data');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify(db,null,2));
console.log('Demonstração preparada. Senha de todas as contas: quadra123');
