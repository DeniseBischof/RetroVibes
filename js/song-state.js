/* ---------- Songmodell: jeder Takt besitzt eigene Figuren ---------- */
const MAX_TRACKS = 8;
/* Obergrenze fuer die Songlaenge. Bei 126 BPM ist ein Takt rund
   1,9 Sekunden - 8 Takte waren also nur 15 Sekunden.
   Harte Grenze ist der MOD-Export: das Format kennt eine
   Musterreihenfolge von hoechstens 128 Eintraegen (siehe export.js).
   Darunter begrenzt nur die Taktleiste, und die scrollt jetzt. */
const MAX_BARS = 32;

let genre = null;
let songBars = [];
let tracks = [];
let selUid = null;
let playing = false;
let uidSeq = 1;
let barCount = 1;
let curBar = 0;
let playBar = 0;
let songMode = false;
/* Welche Art von Song gerade gebaut wird - nur Welten mit `songarten`
   haben das ueberhaupt, bei allen anderen bleibt es null. */
let songartId = null;

function emptyBar(){ return new Array(16).fill(null); }
function normalizeSteps(value){
  const source = Array.isArray(value) ? value : [];
  const steps = emptyBar();
  for(let i=0;i<16;i++){
    const raw = source[i];
    steps[i] = raw === null || raw === undefined || raw === '' ? null : clamp(Math.round(+raw || 0), 0, 7);
  }
  return steps;
}
function parsePat(pattern){
  const steps = emptyBar();
  for(let i=0;i<16;i++){
    const char = (pattern || '')[i] || '.';
    steps[i] = char === '.' ? null : clamp(+char || 0, 0, 7);
  }
  return steps;
}
function bar(track){ return track.steps; }
function tracksAt(index){
  const state = songBars[index];
  return state && Array.isArray(state.tracks) ? state.tracks : [];
}
function currentBarState(){ return songBars[curBar] || null; }
function allSongTracks(){
  return songBars.reduce(function(all, state){ return all.concat(state.tracks || []); }, []);
}
function activateBar(index){
  curBar = clamp(index, 0, Math.max(0, barCount-1));
  tracks = tracksAt(curBar);
  const state = currentBarState();
  const remembered = state && state.selectedUid;
  const selected = tracks.find(function(track){ return track.uid === remembered || track.uid === selUid; });
  selUid = selected ? selected.uid : (tracks[0] ? tracks[0].uid : null);
  if(state) state.selectedUid = selUid;
}
function rememberSelection(uid){
  selUid = uid;
  const state = currentBarState();
  if(state) state.selectedUid = uid;
}
function anySolo(index){
  const at = index === undefined ? curBar : index;
  return tracksAt(at).some(function(track){ return track.solo; });
}
function degree(height){
  const scale = genre.scale;
  return scale[height % scale.length] + 12*Math.floor(height/scale.length);
}

function makeTrack(preset, state){
  const sourceSteps = state && (state.steps || (state.bars && state.bars[0]));
  return {
    uid: uidSeq++,
    p: preset,
    steps: sourceSteps ? normalizeSteps(sourceSteps) : parsePat(preset.pat),
    params: Object.assign(
      {pitch:0, vol:0.8, tone:0.62, len:0.5, space:0.22, pan:0},
      /* Werksbalance je Klangart, damit acht Figuren zusammen sauber bleiben */
      (typeof ENGINE_MIX !== 'undefined' && ENGINE_MIX[preset.engine]) || null,
      preset.params || null,          /* Feinschliff je Figur, schlaegt die Klangart */
      state && state.params ? state.params : null
    ),
    auto: (state && state.auto) ? JSON.parse(JSON.stringify(state.auto)) : {},
    mute: state ? !!state.mute : false,
    solo: state ? !!state.solo : false,
    hitAt: -9,
    cv: null,
    cells: null,
    n: null,
    sparks: [],
    voiceEnds: []
  };
}
function cloneTrack(track){
  return makeTrack(track.p, {
    steps: track.steps.slice(),
    params: Object.assign({}, track.params),
    auto: track.auto,
    mute: track.mute,
    solo: track.solo
  });
}
function serializeTrack(track){
  const roh = {
    id: track.p.id,
    steps: track.steps.slice(),
    params: Object.assign({}, track.params),
    mute: track.mute,
    solo: track.solo
  };
  /* Nur schreiben, was auch faehrt - ein Stand voller leerer Fahrten waere
     groesser und beim Lesen nicht klarer. */
  if(hatFahrten(track)) roh.auto = JSON.parse(JSON.stringify(track.auto));
  return roh;
}
function serializeBars(){
  return songBars.map(function(state){
    return {tracks:(state.tracks || []).map(serializeTrack)};
  });
}

/* Alte Beatkiste-Stände werden einmal in echte, unabhängige Takte transponiert. */
function hydrateSongBars(activeGenre, state){
  uidSeq = 1;
  if(state && Array.isArray(state.bars)){
    return state.bars.slice(0, MAX_BARS).map(function(savedBar){
      const savedTracks = (savedBar && (savedBar.tracks || savedBar.parts)) || [];
      return {
        selectedUid: null,
        tracks: savedTracks.slice(0, MAX_TRACKS).map(function(savedTrack){
          const id = savedTrack.id || savedTrack.presetId;
          const preset = activeGenre.chars.find(function(char){ return char.id === id; });
          return preset ? makeTrack(preset, savedTrack) : null;
        }).filter(Boolean)
      };
    });
  }

  if(state && Array.isArray(state.tracks) && state.tracks.length){
    let longest = state.barCount || 1;
    state.tracks.forEach(function(savedTrack){
      if(Array.isArray(savedTrack.bars)) longest = Math.max(longest, savedTrack.bars.length);
    });
    const migrated = Array.from({length:clamp(longest,1,MAX_BARS)}, function(){
      return {selectedUid:null, tracks:[]};
    });
    state.tracks.forEach(function(savedTrack){
      const preset = activeGenre.chars.find(function(char){ return char.id === savedTrack.id; });
      if(!preset) return;
      migrated.forEach(function(savedBar, index){
        const source = Array.isArray(savedTrack.bars && savedTrack.bars[index])
          ? savedTrack.bars[index]
          : Array.isArray(savedTrack.bars && savedTrack.bars[0])
            ? savedTrack.bars[0]
            : savedTrack.steps;
        savedBar.tracks.push(makeTrack(preset, {
          steps: source || emptyBar(),
          params: savedTrack.params,
          mute: savedTrack.mute,
          solo: savedTrack.solo
        }));
      });
    });
    return migrated;
  }

  return [{selectedUid:null, tracks:[makeTrack(activeGenre.chars[0])]}];
}

function disconnectTrack(track){
  if(!track || !track.n) return;
  try{ track.n.in.disconnect(); }catch(error){}
  try{ track.n.g.disconnect(); }catch(error){}
  try{ track.n.send.disconnect(); }catch(error){}
  try{ track.n.dsend.disconnect(); }catch(error){}
  track.n = null;
  track.voiceEnds = [];
}
function disposeSongAudio(){ allSongTracks().forEach(disconnectTrack); }

/* ---------- Audiokette pro Figur ---------- */
function buildChain(track){
  if(!actx || track.n) return;
  const input = actx.createGain();
  const filter = actx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 0.8;
  const pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
  const gain = actx.createGain();
  const send = actx.createGain();
  const delaySend = actx.createGain();
  input.connect(filter);
  if(pan){ filter.connect(pan); pan.connect(gain); }
  else filter.connect(gain);
  /* Alles ausser dem Schlagzeug laeuft ueber den Sidechain-Bus, sofern die
     Welt das Atmen eingeschaltet hat. Der Sub bleibt aussen vor: pumpt das
     Fundament mit, wackelt der ganze Boden unter dem Stueck. */
  const atmet = typeof pumpBus !== 'undefined' && pumpBus && genre && genre.pump
             && track.p.cat !== 'beat' && track.p.engine !== 'sub';
  const summe = atmet ? pumpBus : master;
  gain.connect(summe);
  gain.connect(send); send.connect(revBus);
  gain.connect(delaySend); delaySend.connect(delBus);
  track.n = {in:input, f:filter, pan:pan, g:gain, send:send, dsend:delaySend};
  applyParams(track);
}
function applyParams(track){
  if(!track.n) return;
  const params = track.params;
  track.n.g.gain.value = params.vol*params.vol*0.62*(track.mute ? 0 : 1);
  track.n.f.frequency.value = Math.min(18000, 180*Math.pow(110, params.tone));
  if(track.n.pan) track.n.pan.pan.value = params.pan;
  track.n.send.gain.value = params.space*0.62;
  track.n.dsend.gain.value = params.space*0.34;
}
function applyAll(){ allSongTracks().forEach(applyParams); }

/* ---------- Reglerfahrten ----------
   Ein Regler muss nicht stehen bleiben. Pro Figur und Regler laesst sich eine
   Fahrt hinterlegen: {an, von, bis, schritte}. Der Wert startet auf `von` und
   erreicht `bis` genau nach `schritte` Anschlaegen; danach bleibt er dort, bis
   der Takt von vorn beginnt.

   Die Werte stehen in denselben Einheiten wie die Regler im Inspektor, also in
   Prozent bzw. Halbtoenen - nicht in den internen 0..1. Sonst muesste man an
   zwei Stellen umrechnen, und die zweite Stelle vergisst man.

   Bewusst stufig je Anschlag statt gleitend: `len` und `pitch` wirken ohnehin
   nur im Moment des Anschlags, eine gleitende Kurve waere dort eine Luege. Was
   gleitend klingen soll, macht man ueber viele kurze Anschlaege. */
function autoWert(fahrt, schritt){
  if(!fahrt || !fahrt.an) return null;
  const dauer = Math.max(1, fahrt.schritte | 0);
  const anteil = Math.min(1, Math.max(0, (schritt | 0) / dauer));
  return fahrt.von + (fahrt.bis - fahrt.von) * anteil;
}
/* Die Umrechnung von Reglereinheit nach Parameter steht genau einmal, naemlich
   in KNOBS. Die Datei laedt spaeter als diese hier, zur Laufzeit ist sie da. */
function knopfFuer(schluessel){
  if(typeof KNOBS === 'undefined') return null;
  for(let i=0;i<KNOBS.length;i++) if(KNOBS[i].k === schluessel) return KNOBS[i];
  return null;
}
function hatFahrten(track){
  const a = track.auto;
  if(!a) return false;
  for(const k in a) if(a[k] && a[k].an) return true;
  return false;
}
/* Die Parameter dieser Figur, wie sie bei diesem Anschlag gelten. */
function paramsBei(track, schritt){
  if(!hatFahrten(track)) return track.params;
  const P = Object.assign({}, track.params);
  for(const k in track.auto){
    const wert = autoWert(track.auto[k], schritt);
    if(wert === null) continue;
    const K = knopfFuer(k);
    if(K) K.set(P, wert);
  }
  return P;
}
/* Lautstaerke, Filter, Panorama und Hallanteil haengen an Knoten der Kette,
   nicht am einzelnen Ton. Sie werden deshalb auf den Anschlagszeitpunkt
   vorgemerkt statt sofort gesetzt - so stimmt es im Vorlauf des Sequenzers
   genauso wie im Offline-Export. Angefasst wird nur, was auch faehrt: sonst
   wuerde die Fahrt den Regler ueberschreiben, an dem gerade jemand zieht. */
function setzeKettenwerte(track, P, when){
  const n = track.n, a = track.auto;
  if(!n || !a) return;
  if(a.vol && a.vol.an)
    n.g.gain.setValueAtTime(P.vol*P.vol*0.62*(track.mute ? 0 : 1), when);
  if(a.tone && a.tone.an)
    n.f.frequency.setValueAtTime(Math.min(18000, 180*Math.pow(110, P.tone)), when);
  if(a.pan && a.pan.an && n.pan)
    n.pan.pan.setValueAtTime(P.pan, when);
  if(a.space && a.space.an){
    n.send.gain.setValueAtTime(P.space*0.62, when);
    n.dsend.gain.setValueAtTime(P.space*0.34, when);
  }
}

/* ---------- Sequencer ---------- */
let stepIdx = 0;
let nextTime = 0;
let timer = null;
let visQ = [];
let curHead = -1;
function stepDur(index){
  const base = 60/bpm/4;
  /* Der Faktor bestimmt, was der Regler am oberen Ende bedeutet. Mit 0.45
     erreichte er nur 1,74:1 - echter Swing der 1930er sind Triolen, also
     2:1, und der war damit unerreichbar. Mit 0.56 heisst Vollausschlag genau
     Triolenswing. Werte in der Mitte swingen dadurch etwas staerker als
     vorher; das betrifft nur Welten, die den Regler ueberhaupt nutzen. */
  const swing = (swingPct/100)*0.56;
  return index % 2 === 0 ? base*(1+swing) : base*(1-swing);
}
function schedule(){
  if(!actx || !playing) return;
  if(nextTime < actx.currentTime-0.2){
    nextTime = actx.currentTime+0.05;
    visQ = [];
  }
  let guard = 0;
  while(nextTime < actx.currentTime+0.12 && guard++ < 32){
    const scheduledBar = playBar;
    const scheduledTracks = tracksAt(scheduledBar);
    const solo = scheduledTracks.some(function(track){ return track.solo; });
    scheduledTracks.forEach(function(track){
      const height = track.steps[stepIdx];
      if(height === null || height === undefined) return;
      if(track.mute || (solo && !track.solo)) return;
      trigger(track, nextTime, height, stepIdx);
    });
    visQ.push({s:stepIdx, b:scheduledBar, t:nextTime});
    if(visQ.length > 96) visQ.splice(0, visQ.length-64);
    nextTime += stepDur(stepIdx);
    stepIdx = (stepIdx+1)%16;
    if(stepIdx === 0) playBar = songMode ? (playBar+1)%barCount : curBar;
  }
}
/* Ohne das dimmt das Tablet mitten im Loop weg und sperrt kurz darauf -
   der Ton geht mit. Die Sperre gilt nur, solange wirklich gespielt wird;
   das System nimmt sie ausserdem selbst zurueck, sobald der Tab in den
   Hintergrund geht. Safari ab 16.4, sonst wirkungslos. */
let wachSperre = null;
function halteBildschirmWach(){
  if(wachSperre || !navigator.wakeLock) return;
  navigator.wakeLock.request('screen').then(function(sperre){
    wachSperre = sperre;
    sperre.addEventListener('release', function(){ wachSperre = null; });
  }).catch(function(){});
}
function gibBildschirmFrei(){
  const sperre = wachSperre;
  if(!sperre) return;
  wachSperre = null;
  try{ sperre.release(); }catch(e){}
}
function play(){
  ensureAudio();
  if(actx.state === 'suspended') actx.resume();
  tracksAt(curBar).forEach(buildChain);
  applyAll();
  playing = true;
  stepIdx = 0;
  visQ = [];
  playBar = curBar;
  nextTime = actx.currentTime+0.08;
  clearInterval(timer);
  timer = setInterval(schedule, 25);
  startAmbience(actx.currentTime+0.05);
  halteBildschirmWach();
  const button = $('#playBtn');
  button.classList.add('on');
  button.innerHTML = '&#9632; STOP';
  renderBars();
  markStageDirty();
}
function stop(){
  playing = false;
  stopAmbience();
  gibBildschirmFrei();
  clearInterval(timer);
  timer = null;
  visQ = [];
  setHead(-1);
  renderBars();
  const button = $('#playBtn');
  button.classList.remove('on');
  button.innerHTML = '&#9654; PLAY';
  markStageDirty();
}
function togglePlay(){
  playing ? stop() : play();
  /* Die Schallplatte dreht sich nur, solange wirklich gespielt wird -
     sonst waere die Bewegung Dekoration ohne Aussage. */
  document.body.classList.toggle('laeuft', playing);
}
function audition(track, height){
  ensureAudio();
  if(actx.state === 'suspended') actx.resume();
  buildChain(track);
  if(!playing && !track.mute){
    trigger(track, actx.currentTime+0.02, height, 0);
    markStageDirty();
  }
}

/* ---------- Kleine Helfer ---------- */
function $(selector, root){ return (root || document).querySelector(selector); }
function el(tag, className, html){
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(html !== undefined) node.innerHTML = html;
  return node;
}
function clamp(value, min, max){ return value < min ? min : (value > max ? max : value); }
function noteName(track, height){
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const midi = genre.root+track.p.oct+track.params.pitch+degree(height);
  return names[((midi%12)+12)%12]+(Math.floor(midi/12)-1);
}
