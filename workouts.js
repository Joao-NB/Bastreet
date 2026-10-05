const routineVersion = 2;
function block({name,difficulty,xp,description,equipment,sets,work,rest,cue,target,warmup=120,cooldown=120}) {
  const timeline = [{seconds:warmup,kind:'warmup',label:'Aquecimento',cue:'Caminhe, mobilize tornozelos e quadris e faça toques leves com os dois pés.'}];
  for(let i=1;i<=sets;i++) {
    timeline.push({seconds:work,kind:'work',label:`Série ${i} de ${sets}`,cue});
    timeline.push({seconds:rest,kind:'rest',label:`Recuperação ${i} de ${sets}`,cue:'Caminhe, respire e prepare a próxima série. Mantenha a bola parada.'});
  }
  timeline.push({seconds:cooldown,kind:'cooldown',label:'Volta à calma',cue:'Caminhe devagar, solte as pernas e recupere a respiração.'});
  let end=0;timeline.forEach(phase=>{end+=phase.seconds;phase.end=end});
  return {name,difficulty,xp,description,equipment,sets,work,rest,cue,target,timeline,seconds:end,routineVersion};
}
const workouts = {
  'controle-bola':block({name:'Sola & domínio',difficulty:'Iniciante',xp:40,description:'Puxe, role e pare a bola com a sola. Toques curtos, controle perto do corpo e cabeça erguida.',equipment:'1 bola de futsal · espaço livre de 2 × 2 m',sets:4,work:45,rest:15,cue:'Alterne os pés: role a bola para o lado com a sola, pare com o outro pé e traga de volta. Evite pisar com todo o peso.',target:'Conte ciclos sem perder a bola. Busque mais controle antes de aumentar a velocidade.'}),
  'passe-parede':block({name:'Passe & primeiro toque',difficulty:'Iniciante',xp:45,description:'Passe rasteiro com a parte interna do pé. Receba com a sola e prepare o próximo passe em dois toques.',equipment:'1 bola · parede livre e resistente · distância de 2–3 m',sets:4,work:60,rest:30,cue:'Alterne o pé de passe a cada série. Pé de apoio ao lado da bola, passe rasteiro e recepção amortecida com a sola.',target:'Conte passes que voltam ao seu alcance. Tente manter a precisão também com o pé menos usado.'}),
  'agilidade':block({name:'Condução & mudança',difficulty:'Intermediário',xp:65,description:'Conduza em zigue-zague, mude a direção com a sola e acelere com a bola próxima ao pé.',equipment:'1 bola · 4 cones a 1 m entre si · faixa livre de 6 m',sets:6,work:30,rest:60,warmup:180,cue:'Passe entre os cones com toques curtos. Na última marca, pare com a sola, gire e volte. Alterne o pé que conduz por série.',target:'Conte percursos sem tocar os cones. Aumente o ritmo apenas quando mantiver o controle.'}),
  'finalizacoes':block({name:'Mira & finalização',difficulty:'Avançado',xp:90,description:'Receba, prepare e chute rasteiro com o peito do pé. Alterne os lados e busque precisão nos cantos.',equipment:'1 bola · gol ou alvos baixos em parede livre · distância de 5–6 m',sets:5,work:60,rest:30,warmup:180,cue:'Conduza dois toques e finalize mirando um canto. Alterne o pé a cada tentativa. Recolha a bola caminhando antes de repetir.',target:'Conte acertos no alvo por pé. Compare a precisão entre os lados, sem priorizar força.'})
};
module.exports = {workouts,routineVersion};
