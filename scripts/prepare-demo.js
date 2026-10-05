const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const people = [
  ['Ruan Deud','ruan@futstreet.demo','quadra123','Homem',184,'Fixo',76,'player'],
  ['João Guilherme','joao@futstreet.demo','quadra123','Homem',182,'Ala',78,'player'],
  ['Daniel Moura','daniel@futstreet.demo','quadra123','Homem',191,'Pivô',74,'player'],
  ['Bárbara Menezes','barbara@futstreet.demo','quadra123','Mulher',177,'Ala',80,'player'],
  ...Array.from({length:6},(_,index)=>[`Atleta ${index+5}`,`atleta${index+5}@futstreet.demo`,'quadra123','Outro',175,['Goleiro','Fixo','Ala','Pivô'][index%4],70,'player']),
  ['Administrador FUTSTREET','admin@teste.com','admin123','Outro',180,'Administrador',85,'admin']
];
const users = people.map(([name,email,password,gender,height,position,skill,role]) => {
  const salt=crypto.randomBytes(16).toString('hex');
  return {id:crypto.randomUUID(),name,email,passwordHash:crypto.scryptSync(password,salt,64).toString('hex'),salt,age:21,height,location:'Olinda, PE',position,gender,level:'Intermediário',availability:['Ter','Qui','Sáb'],skill,xp:0,semesterPoints:0,role,createdAt:new Date().toISOString()};
});
const db={users,sessions:[],trainings:[],checkins:[],messages:[{id:crypto.randomUUID(),userId:'bot',userName:'Rafael (bot)',text:'Ambiente preparado! Entrem com as dez contas e busquem uma partida.',createdAt:new Date().toISOString()}],queue:[],matches:[],eventParticipants:[]};
const dir=path.join(__dirname,'..','data');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify(db,null,2));
console.log('Demonstração preparada: jogadores usam quadra123; admin usa admin123.');
