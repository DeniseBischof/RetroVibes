/* ---------- 16. Speichern ---------- */
const LSK = 'taktbande.v2';
const LEGACY_LSK = 'beatkiste.v1';
function readStore(key){
  try{ return JSON.parse(localStorage.getItem(key) || '{}'); }catch(e){ return {}; }
}
function readAll(){ return readStore(LSK); }
function loadState(gid){
  const all = readAll();
  if(all && all[gid]) return all[gid];
  const legacy = readStore(LEGACY_LSK);
  return legacy && legacy[gid] ? legacy[gid] : null;
}
function save(){
  if(!genre) return;
  try{
    const all = readAll();
    all[genre.id] = {
      version: 2,
      /* Songart nur dort, wo die Welt eine kennt (Game Boy). Sie legt Tempo,
         Grundton und Tonleiter fest und muss deshalb vor allem anderen
         wieder anliegen - siehe openGenre(). */
      songart: songartId,
      bpm: bpm, swingPct: swingPct, masterVol: masterVol,
      plattenPegel: typeof plattenPegel === 'number' ? plattenPegel : 1,
      barCount: barCount, songMode: songMode,
      bars: serializeBars()
    };
    localStorage.setItem(LSK, JSON.stringify(all));
  }catch(e){}
}

/* ---------- 17. Hilfe ---------- */
function openHelp(){
  if($('#helpBox')) return;
  const wrap = el('div','help'); wrap.id = 'helpBox';
  wrap.innerHTML =
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="Hilfe">'+
    '<h2>RETROVIBES IN KURZ</h2>'+ 
    '<dl>'+ 
    '<dt>Figur antippen</dt><dd>Setzt sie in den aktuellen Takt.</dd>'+ 
    '<dt>Raster antippen</dt><dd>Schaltet einen Schritt an oder aus.</dd>'+ 
    '<dt>Hochziehen</dt><dd>Ändert Tonhöhe oder Wucht.</dd>'+ 
    '<dt>+ Takt</dt><dd>Kopiert die Szene oder startet mit neuer Besetzung.</dd>'+ 
    '<dt>Takt / Song</dt><dd>Wiederholt einen Takt oder spielt alle nacheinander.</dd>'+ 
    '<dt>Sichern</dt><dd>Exportiert Audio, MIDI oder das ganze Projekt.</dd>'+ 
    '</dl>'+
    ((typeof creditsHtml === 'function') ? creditsHtml() : '')+
    '<button class="btn" type="button" id="helpClose" style="margin-top:18px">Alles klar</button></div>';
  document.body.appendChild(wrap);
  $('#helpClose').addEventListener('click', closeHelp);
  wrap.addEventListener('click', function(e){ if(e.target === wrap) closeHelp(); });
  $('#helpClose').focus();
}
function closeHelp(){ const w = $('#helpBox'); if(w) w.remove(); }

/* ---------- 17b. Export ---------- */
function songSeconds(){
  let s = 0;
  for(let b=0;b<barCount;b++) for(let i=0;i<16;i++) s += stepDur(i);
  return s;
}
function songName(ext){
  return 'retrovibes-' + genre.id + '-' + bpm + 'bpm.' + ext;
}
/* Den ganzen Song in einem OfflineAudioContext rendern: exaktes Timing,
   schneller als Echtzeit. Die Bus-Variablen werden dafür kurz umgehängt. */
async function renderSong(){
  const sr = 44100;
  const total = songSeconds() + 6;
  const OfflineCtor = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if(!OfflineCtor) throw new Error('Audio-Export wird von diesem Browser nicht unterstützt.');
  const off = new OfflineCtor(2, Math.ceil(total*sr), sr);
  const renderTracks = allSongTracks();
  /* pumpBus muss mitgesichert werden: buildBuses() legt ihn im Renderkontext
     neu an, und ohne Ruecksicherung zeigt der Live-Graph danach auf einen
     Knoten aus einem fremden Kontext. Die naechste Figur, die gebaut wird,
     wirft dann beim Verbinden - betrifft jede Welt mit Sidechain. */
  const keep = {actx:actx, master:master, revBus:revBus, delBus:delBus, delNode:delNode,
                noiseBuf:noiseBuf, pumpBus:pumpBus};
  const keepRuntime = renderTracks.map(function(t){ return {n:t.n, voiceEnds:t.voiceEnds, hitAt:t.hitAt}; });
  let buf = null;
  try{
    actx = off;
    /* Aufnahmen im Renderkontext bereitstellen, bevor irgendetwas klingt */
    if(typeof bereiteSamplesVor === 'function') await bereiteSamplesVor();
    buildBuses();
    startAmbience(0, total);
    master.gain.value = masterVol;
    delNode.delayTime.value = delayZeit();
    renderTracks.forEach(function(t){ t.n = null; t.voiceEnds = []; buildChain(t); });
    let time = 0.1;
    for(let b=0;b<barCount;b++){
      const localTracks = tracksAt(b);
      const solo = anySolo(b);
      for(let s=0;s<16;s++){
        for(let k=0;k<localTracks.length;k++){
          const t = localTracks[k], h = t.steps[s];
          if(h === null || h === undefined) continue;
          if(t.mute || (solo && !t.solo)) continue;
          trigger(t, time, h, s);
        }
        time += stepDur(s);
      }
    }
    buf = await off.startRendering();
  } finally {
    actx = keep.actx; master = keep.master; revBus = keep.revBus;
    delBus = keep.delBus; delNode = keep.delNode; noiseBuf = keep.noiseBuf;
    pumpBus = keep.pumpBus;
    renderTracks.forEach(function(t,i){
      t.n = keepRuntime[i].n; t.voiceEnds = keepRuntime[i].voiceEnds; t.hitAt = keepRuntime[i].hitAt;
    });
  }
  return buf;
}
function bufToWav(buf){
  const n = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const total = 44 + len*n*2;
  const ab = new ArrayBuffer(total), view = new DataView(ab);
  let p = 0;
  function str(s){ for(let i=0;i<s.length;i++) view.setUint8(p++, s.charCodeAt(i)); }
  function u32(v){ view.setUint32(p, v, true); p += 4; }
  function u16(v){ view.setUint16(p, v, true); p += 2; }
  str('RIFF'); u32(total-8); str('WAVE');
  str('fmt '); u32(16); u16(1); u16(n); u32(sr); u32(sr*n*2); u16(n*2); u16(16);
  str('data'); u32(len*n*2);
  const ch = [];
  for(let c=0;c<n;c++) ch.push(buf.getChannelData(c));
  for(let i=0;i<len;i++){
    for(let c=0;c<n;c++){
      let v = ch[c][i];
      v = v < -1 ? -1 : (v > 1 ? 1 : v);
      view.setInt16(p, v < 0 ? v*0x8000 : v*0x7fff, true);
      p += 2;
    }
  }
  return new Blob([ab], {type:'audio/wav'});
}
let dlCap;
async function downloadsCap(){
  if(dlCap !== undefined) return dlCap;
  dlCap = null;
  try{ if(window.claude && window.claude.use) dlCap = await window.claude.use('downloads'); }catch(e){ dlCap = null; }
  return dlCap;
}
async function offerFile(filename, data, mime){
  const cap = await downloadsCap();
  if(cap){ await cap.save({filename:filename, data:data}); return; }
  const blob = (typeof Blob !== 'undefined' && data instanceof Blob) ? data : new Blob([data], {type:mime||'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 5000);
}
function saveError(e){
  const code = e && e.code;
  if(code === 'declined') return 'Abgebrochen &ndash; nichts gespeichert.';
  if(code === 'too_large') return 'Die Datei ist zu groß. Nimm weniger Takte.';
  if(code === 'rate_limited') return 'Zu schnell hintereinander. Kurz warten, dann nochmal.';
  if(code === 'rejected_extension' || code === 'extension_not_enabled') return 'Dieses Dateiformat ist hier nicht erlaubt.';
  return 'Hat nicht geklappt: ' + ((e && e.message) || e);
}

/* ---------- 17b2. MIDI ----------
   Standard-MIDI-Datei, Format 1: ein Spur-Chunk je Figur, Schlagzeug auf
   Kanal 10. Damit lässt sich der Song in jeder DAW weiterbauen. */
const GM_PROG = {bass:33, sub:38, pluck:45, lead:80, pad:89, voice:53, bell:10,
  gbpulse:80, gbwave:81, tom:117, wobble:38, flute:73, stab:62,
  rhodes:4, upright:32, tape:89, strings:48, pizz:45, twang:25, harmonica:22, whistle:78, modal:12, egitarre:30, banjo:105, maultrommel:104, trompete:56, supersaw:81, bitcrush:87, horn:60};
const GM_DRUM = {kick:36, snare:38, clap:39, hat:42, fx:49, gbkick:36,
  lofikick:36, lofisnare:38, lofihat:42, woodblock:76, hufe:77, glitch:37};
function midiFile(){
  const PPQ = 96, TPS = PPQ/4;
  function vlq(n){
    const out = [n & 0x7f];
    n = Math.floor(n/128);
    while(n){ out.unshift((n & 0x7f) | 0x80); n = Math.floor(n/128); }
    return out;
  }
  function chunk(id, data){
    const out = [id.charCodeAt(0), id.charCodeAt(1), id.charCodeAt(2), id.charCodeAt(3),
      (data.length>>>24)&255, (data.length>>>16)&255, (data.length>>>8)&255, data.length&255];
    return out.concat(data);
  }
  function nameEvent(s){
    const d = [];
    for(let i=0;i<s.length;i++){ const c = s.charCodeAt(i); d.push(c < 128 ? c : 63); }
    return [0].concat([0xff, 0x03], vlq(d.length), d);
  }
  const chunks = [];
  /* Spur 1: Tempo und Taktart */
  const us = Math.round(60000000/bpm);
  let head = nameEvent('Retrovibes - ' + genre.name);
  head = head.concat([0, 0xff, 0x51, 3, (us>>>16)&255, (us>>>8)&255, us&255]);
  head = head.concat([0, 0xff, 0x58, 4, 4, 2, 24, 8]);
  head = head.concat([0, 0xff, 0x2f, 0]);
  chunks.push(chunk('MTrk', head));

  let ch = 0;
  function nextChan(){
    if(ch === 9) ch = 10;          /* Kanal 10 gehört dem Schlagzeug */
    return Math.min(ch++, 15);
  }
  for(let b=0;b<barCount;b++){
    const localTracks = tracksAt(b);
    const solo = anySolo(b);
    localTracks.forEach(function(t){
      if(t.mute || (solo && !t.solo)) return;
      const drum = !TONAL[t.p.engine];
      const chan = drum ? 9 : nextChan();
      const ev = [];
      if(!drum) ev.push({tick:b*16*TPS, d:[0xc0|chan, GM_PROG[t.p.engine] || 80]});
      const hits = [];
      for(let s=0;s<16;s++){
        const h = t.steps[s];
        if(h !== null && h !== undefined) hits.push({tick:(b*16+s)*TPS, h:h});
      }
      hits.forEach(function(hit, i){
        let note, vel;
        if(drum){
          if(t.p.engine === 'gbnoise') note = hit.h < 3 ? 36 : (hit.h < 5 ? 38 : 42);
          else note = GM_DRUM[t.p.engine] || 38;
          vel = 62 + hit.h*8;
        } else {
          note = genre.root + t.p.oct + t.params.pitch + degree(hit.h);
          vel = 92;
        }
        note = clamp(note, 0, 127);
        const next = hits[i+1] ? hits[i+1].tick : hit.tick + TPS*4;
        const wanted = drum ? 12 : Math.round(TPS*(0.6 + t.params.len*3));
        const len = clamp(Math.min(wanted, next-hit.tick-1), 3, TPS*8);
        ev.push({tick:hit.tick, d:[0x90|chan, note, clamp(vel,1,127)]});
        ev.push({tick:hit.tick+len, d:[0x80|chan, note, 0]});
      });
      ev.sort(function(a,b){ return a.tick - b.tick; });
      let data = nameEvent('Takt '+(b+1)+' - '+t.p.name), last = 0;
      ev.forEach(function(event){
        data = data.concat(vlq(event.tick-last), event.d);
        last = event.tick;
      });
      data = data.concat([0, 0xff, 0x2f, 0]);
      chunks.push(chunk('MTrk', data));
    });
  }

  const header = chunk('MThd', [0,1, (chunks.length>>>8)&255, chunks.length&255, (PPQ>>>8)&255, PPQ&255]);
  const all = header.concat.apply(header, chunks);
  return new Blob([new Uint8Array(all)], {type:'audio/midi'});
}

/* ---------- 17b3. MOD für GB Studio ----------
   GB Studio liest .mod über den GBT Player und wandelt sie im Musik-Editor
   nach .uge um. Dessen vier Kanäle sind genau die des Game Boy:
   1+2 Puls, 3 Wave, 4 Rauschen. Instrumentennummern laut GB-Studio-Doku:
   Puls 1-4 (25/50/75/12,5 %), Wave 8-15, Rauschen 16-23 periodisch und
   24-31 pseudozufällig. Der Rauschkanal kennt nur eine Tonhöhe. */
const MOD_PERIODS = [
  856,808,762,720,678,640,604,570,538,508,480,453,
  428,404,381,360,339,320,302,285,269,254,240,226,
  214,202,190,180,170,160,151,143,135,127,120,113];
const MOD_NOISE_ROW = 24;            /* entspricht C5, der einzigen Rauschnote */
function modNote(midi){
  let i = midi - 36;
  while(i > 35) i -= 12;
  while(i < 0) i += 12;
  return i;
}
function modInst(t){
  const e = t.p.engine;
  if(e === 'gbpulse'){
    const d = t.p.duty || 0.5;
    return d <= 0.15 ? 4 : (d <= 0.3 ? 1 : (d <= 0.6 ? 2 : 3));
  }
  if(e === 'gbkick') return 2;
  if(e === 'gbwave') return t.p.wave === 'orgel' ? 14 : (t.p.wave === 'saege' ? 13 : 15);
  if(e === 'bass' || e === 'sub') return 15;
  if(e === 'lead' || e === 'pluck' || e === 'bell' || e === 'chip') return 2;
  if(e === 'orgel') return 16;
  if(e === 'blaeser') return 12;
  if(e === 'trompete') return 13;
  if(e === 'theremin') return 1;
  if(e === 'voice' || e === 'pad' || e === 'fluestern' || e === 'schleier') return 1;
  return 2;
}
function modNoiseInst(t, h){
  const base = t.p.shortLfsr ? 16 : 24;
  return base + clamp(h, 0, 7);
}
/* Welche Figur auf welchem der vier Kanäle landet */
function modSlots(barIndex){
  const chanOf = {melo:0, voice:1, bass:2, beat:3};
  const slots = [null,null,null,null], raus = [];
  const localTracks = tracksAt(barIndex === undefined ? curBar : barIndex);
  const solo = localTracks.some(function(t){ return t.solo; });
  localTracks.forEach(function(t){
    if(t.mute || (solo && !t.solo)) return;
    const c = chanOf[t.p.cat];
    if(slots[c] === null) slots[c] = t; else raus.push(t.p.name);
  });
  return {slots:slots, raus:raus};
}
function modFile(){
  const out = [];
  function text(s, len){
    for(let i=0;i<len;i++) out.push(i < s.length ? (s.charCodeAt(i) & 0x7f) : 0);
  }
  text('Retrovibes ' + genre.name, 20);
  const NAMES = {1:'Pulse 25%', 2:'Pulse 50%', 3:'Pulse 75%', 4:'Pulse 12.5%',
    8:'Wave Buzzy', 9:'Wave Ringy', 10:'Wave SyncSaw', 11:'Wave RingSaw',
    12:'Wave OctPulse', 13:'Wave Saw', 14:'Wave Square', 15:'Wave Sine'};
  for(let s=1;s<=31;s++){
    text(NAMES[s] || (s < 24 ? 'Noise periodic '+(s-15) : 'Noise random '+(s-23)), 22);
    out.push(0,0);      /* Sample-Länge 0: GBT Player braucht keine Klangdaten */
    out.push(0, 64);    /* Finetune, Lautstärke */
    out.push(0,0, 0,1); /* Loop-Start, Loop-Länge */
  }
  out.push(barCount, 127);
  for(let i=0;i<128;i++) out.push(i < barCount ? i : 0);
  text('M.K.', 4);

  for(let b=0;b<barCount;b++){
    const sl = modSlots(b).slots;
    for(let row=0;row<64;row++){
      for(let c=0;c<4;c++){
        let inst = 0, period = 0, eff = 0, par = 0;
        const t = sl[c];
        if(t && row < 16){
          const h = t.steps[row];
          if(h !== null && h !== undefined){
            if(c === 3){
              inst = modNoiseInst(t, h);
              period = MOD_PERIODS[MOD_NOISE_ROW];
            } else {
              inst = modInst(t);
              const midi = TONAL[t.p.engine]
                ? genre.root + t.p.oct + t.params.pitch + degree(h)
                : genre.root + t.p.oct + t.params.pitch;
              period = MOD_PERIODS[modNote(midi)];
            }
          }
        }
        /* Zeile 0: Geschwindigkeit und Tempo; Zeile 15: Sprung zum nächsten Takt */
        if(b === 0 && row === 0 && c === 0){ eff = 0xF; par = 6; }
        if(b === 0 && row === 0 && c === 1){ eff = 0xF; par = clamp(bpm, 32, 255); }
        if(row === 15 && c === 3){ eff = 0xD; par = 0; }
        out.push((inst & 0xF0) | ((period >> 8) & 0x0F));
        out.push(period & 0xFF);
        out.push(((inst & 0x0F) << 4) | (eff & 0x0F));
        out.push(par & 0xFF);
      }
    }
  }
  return new Blob([new Uint8Array(out)], {type:'audio/mod'});
}

/* ---------- 17c. Projektdatei ---------- */
function projectJSON(){
  return JSON.stringify({
    app: 'taktbande', version: 2, datum: new Date().toISOString().slice(0,10),
    genre: genre.id, songart: songartId,
    bpm: bpm, swingPct: swingPct, masterVol: masterVol,
    barCount: barCount, songMode: songMode,
    bars: serializeBars()
  }, null, 1);
}
function loadProject(txt){
  let o;
  try{ o = JSON.parse(txt); }
  catch(e){ return 'Das ist keine lesbare Projektdatei.'; }
  if(!o || (o.app !== 'taktbande' && o.app !== 'beatkiste')) return 'Das sieht nicht nach einer Retrovibes-Projektdatei aus.';
  const g = GENRES.filter(function(x){ return x.id === o.genre; })[0];
  if(!g) return 'Das Genre aus der Datei kenne ich nicht.';
  if(!Array.isArray(o.bars) && !Array.isArray(o.tracks)) return 'In der Datei fehlen die Takte.';
  stop();
  openGenre(g, o);
  save();
  return null;
}

/* ---------- 17d. Dialog ---------- */
function openExport(){
  if($('#expBox')) return;
  const wrap = el('div','help'); wrap.id = 'expBox';
  wrap.innerHTML =
    '<div class="sheet" role="dialog" aria-modal="true" aria-label="Sichern und Exportieren">'+
    '<h2>SICHERN</h2>'+ 
    '<div class="xrow"><div><b>Audio</b>'+ 
      '<span id="expFmt">Alle '+barCount+' '+(barCount===1?'Takt':'Takte')+', rund '+Math.round(songSeconds())+
      ' Sekunden als WAV.</span></div>'+ 
      '<button class="btn" type="button" id="expAudio">.wav</button></div>'+ 
    (genre.onePerCat ?
    '<div class="xrow"><div><b>Für GB Studio</b>'+ 
      '<span id="expModTxt">Vier echte Game-Boy-Kanäle als MOD.</span></div>'+ 
      '<button class="btn" type="button" id="expMod">.mod</button></div>' : '')+
    '<div class="xrow"><div><b>MIDI</b>'+ 
      '<span id="expMidiTxt">Noten zum Weiterbauen in Musik-Apps.</span></div>'+ 
      '<button class="btn" type="button" id="expMidi">.mid</button></div>'+ 
    '<div class="xrow"><div><b>Projekt</b>'+ 
      '<span>Alle Takte, Figuren und Regler.</span></div>'+ 
      '<button class="btn" type="button" id="expJson">.json</button></div>'+ 
    '<div class="xrow"><div><b>Projekt öffnen</b>'+ 
      '<span>Lädt eine gespeicherte JSON-Datei.</span></div>'+ 
      '<button class="btn" type="button" id="expOpen">Datei wählen</button></div>'+
    '<details class="xpaste"><summary>Oder Projekttext einfügen</summary>'+
      '<textarea id="expText" rows="4" placeholder="Inhalt einer .json-Datei hier einfügen"></textarea>'+
      '<button class="btn" type="button" id="expPaste">Text laden</button></details>'+
    '<p class="xstatus" id="expStatus" role="status" aria-live="polite">&nbsp;</p>'+ 
    '<input type="file" id="expFile" accept="application/json,.json" hidden>'+
    '<button class="btn" type="button" id="expClose">Schließen</button></div>';
  document.body.appendChild(wrap);
  const status = $('#expStatus');
  function say(html){ status.innerHTML = html; }
  /* Die Artifact-Ansicht lässt nur bestimmte Dateiendungen zu; wav, mid und mod
     gehören nicht dazu. Statt den Nutzer in eine Fehlermeldung laufen zu lassen,
     steht der Hinweis vorher da. */
  downloadsCap().then(function(cap){
    if(!cap) return;
    const nurLokal = ' <b>Klappt nur lokal</b> &ndash; die Artifact-Ansicht darf diese Dateiart nicht speichern.';
    ['#expFmt','#expMidiTxt','#expModTxt'].forEach(function(sel){
      const n = $(sel);
      if(n) n.innerHTML += nurLokal;
    });
  });

  $('#expAudio').addEventListener('click', async function(){
    const btn = this;
    btn.disabled = true;
    try{
      if(playing) stop();
      say('Song wird gerechnet &hellip;');
      const buf = await renderSong();
      say('Datei wird geschrieben &hellip;');
      await offerFile(songName('wav'), bufToWav(buf), 'audio/wav');
      say('Song gespeichert.');
    }catch(e){ say(saveError(e)); }
    btn.disabled = false;
  });

  if($('#expMod')) $('#expMod').addEventListener('click', async function(){
    try{
      const dropped = [];
      for(let b=0;b<barCount;b++) modSlots(b).raus.forEach(function(name){ if(dropped.indexOf(name)<0) dropped.push(name); });
      say('.mod wird geschrieben &hellip;');
      await offerFile('retrovibes-'+genre.id+'.mod', modFile());
      say(dropped.length
        ? 'Gespeichert. Nicht mitgekommen sind: '+dropped.join(', ')+' &ndash; der Game Boy hat nur vier Kanäle.'
        : 'Für GB Studio gespeichert. Datei nach assets/music legen.');
    }catch(e){
      say(e && e.code === 'rejected_extension'
        ? 'Die Artifact-Ansicht darf keine .mod speichern. Öffne Retrovibes lokal, dort klappt es.'
        : saveError(e));
    }
  });

  $('#expMidi').addEventListener('click', async function(){
    try{
      say('MIDI wird geschrieben &hellip;');
      await offerFile('retrovibes-'+genre.id+'.mid', midiFile());
      say('MIDI-Datei gespeichert.');
    }catch(e){
      say(e && e.code === 'rejected_extension'
        ? 'Die Artifact-Ansicht darf keine .mid speichern. Öffne Retrovibes lokal, dort klappt es.'
        : saveError(e));
    }
  });

  $('#expJson').addEventListener('click', async function(){
    try{
      await offerFile('retrovibes-'+genre.id+'.json', projectJSON(), 'application/json');
      say('Projekt gespeichert.');
    }catch(e){ say(saveError(e)); }
  });

  $('#expOpen').addEventListener('click', function(){ $('#expFile').click(); });
  $('#expFile').addEventListener('change', function(e){
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const rd = new FileReader();
    rd.onload = function(){
      const err = loadProject(String(rd.result));
      if(err){ say(err); return; }
      closeExport();
      hint('Projekt geladen: <b>'+genre.name+'</b>, '+barCount+' '+(barCount===1?'Takt':'Takte')+'.');
    };
    rd.onerror = function(){ say('Die Datei ließ sich nicht lesen.'); };
    rd.readAsText(f);
  });
  $('#expPaste').addEventListener('click', function(){
    const txt = $('#expText').value.trim();
    if(!txt){ say('Erst den Projekttext einfügen.'); return; }
    const err = loadProject(txt);
    if(err){ say(err); return; }
    closeExport();
    hint('Projekt geladen: <b>'+genre.name+'</b>, '+barCount+' '+(barCount===1?'Takt':'Takte')+'.');
  });
  $('#expClose').addEventListener('click', closeExport);
  wrap.addEventListener('click', function(e){ if(e.target === wrap) closeExport(); });
  $('#expClose').focus();
}
function closeExport(){ const w = $('#expBox'); if(w) w.remove(); }
