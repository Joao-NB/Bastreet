const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const people = [
  ['Ruan Deud','ruan@bastreet.demo','quadra123','Homem',184,'Armador',76,'player'],
  ['João Guilherme','joao@bastreet.demo','quadra123','Homem',182,'Ala-armador',78,'player'],
  ['Daniel Moura','daniel@bastreet.demo','quadra123','Homem',191,'Pivô',74,'player'],
  ['Bárbara Menezes','barbara@bastreet.demo','quadra123','Mulher',177,'Ala',80,'player'],
  ['Administrador BASTREET','admin@teste.com','admin123','Prefiro não informar',180,'Administrador',85,'admin']
];
const users = people.map(([name,email,password,gender,height,position,skill,role]) => {
  const salt=crypto.randomBytes(16).toString('hex');
  return {id:crypto.randomUUID(),name,email,passwordHash:crypto.scryptSync(password,salt,64).toString('hex'),salt,age:21,height,location:'Recife, PE',position,gender,level:'Intermediário',availability:['Ter','Qui','Sáb'],skill,xp:0,semesterPoints:0,role,createdAt:new Date().toISOString()};
});
const db={users,sessions:[],trainings:[],checkins:[],messages:[{id:crypto.randomUUID(),userId:'bot',userName:'Rafael (bot)',text:'Ambiente preparado! Entrem com as quatro contas e busquem uma partida.',createdAt:new Date().toISOString()}],queue:[],matches:[],eventParticipants:[]};
const dir=path.join(__dirname,'..','data');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'db.json'),JSON.stringify(db,null,2));
console.log('Demonstração preparada: jogadores usam quadra123; admin usa admin123.');
