const DEFAULT_MODE='5v5';
const MODES=Object.freeze({
  '2v2':Object.freeze({id:'2v2',name:'Duelo',label:'2 × 2',teamSize:2,needed:4}),
  '3v3':Object.freeze({id:'3v3',name:'Trio',label:'3 × 3',teamSize:3,needed:6}),
  '4v4':Object.freeze({id:'4v4',name:'Quarteto',label:'4 × 4',teamSize:4,needed:8}),
  '5v5':Object.freeze({id:'5v5',name:'Clássico',label:'5 × 5',teamSize:5,needed:10})
});
const validMode=id=>typeof id==='string'&&Object.hasOwn(MODES,id);
const queueMode=entry=>validMode(entry?.mode)?entry.mode:DEFAULT_MODE;
const matchMode=match=>validMode(match?.mode)?match.mode:(Object.keys(MODES).find(id=>MODES[id].teamSize===match.teams[0].length)||DEFAULT_MODE);
function queueSnapshot(db,user,modeId){
  const own=(db.queue||[]).find(entry=>entry.userId===user.id);
  const mode=MODES[validMode(modeId)?modeId:queueMode(own)];
  const entries=(db.queue||[]).filter(entry=>queueMode(entry)===mode.id);
  const modeCounts=Object.fromEntries(Object.keys(MODES).map(id=>[id,(db.queue||[]).filter(entry=>queueMode(entry)===id).length]));
  return {mode:mode.id,label:mode.label,waiting:entries.length,needed:mode.needed,queued:Boolean(own&&queueMode(own)===mode.id),queuedAt:own?.createdAt,modeCounts,players:entries.map(entry=>{const player=db.users.find(player=>player.id===entry.userId);return {name:player?.name||'Jogador',location:player?.location||''}})};
}
module.exports={DEFAULT_MODE,MODES,validMode,queueMode,matchMode,queueSnapshot};
