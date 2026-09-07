/* ---------- Game-Boy-Klangerzeuger ----------
   Pro AudioContext gecacht, damit der Offline-Export eigene Puffer bekommt. */
const gbCache = new WeakMap();
function gbStore(){
  let s = gbCache.get(actx);
  if(!s){ s = {pulse:{}, wave:{}, noise:{}}; gbCache.set(actx, s); }
  return s;
}
/* Rechteck mit einstellbarem Tastverhältnis (12,5 / 25 / 50 / 75 %) als Fourier-Reihe */
function pulseWave(duty){
  const s = gbStore(), k = String(duty);
  if(s.pulse[k]) return s.pulse[k];
  const n = 28, real = new Float32Array(n), imag = new Float32Array(n);
  for(let i=1;i<n;i++) imag[i] = (2/(i*Math.PI))*Math.sin(Math.PI*i*duty);
  s.pulse[k] = actx.createPeriodicWave(real, imag);
  return s.pulse[k];
}
/* 32 Stufen à 4 Bit - genau wie der Wellenspeicher des Originals */
const WAVETABLES = {
  bass:  new Array(32).fill(0).map(function(_,i){ return Math.round(7.5 + 7.4*Math.sin(i/32*Math.PI*2)); }),
  orgel: new Array(32).fill(0).map(function(_,i){ return i%8 < 4 ? (i<16?15:11) : (i<16?4:0); }),
  saege: new Array(32).fill(0).map(function(_,i){ return 15 - Math.round(i/31*15); }),
  /* Dreieck: die weichste der vier Stellungen. Rund wie der Sinus, aber
     mit Ecken - damit hat der Wellenkanal neben Bass, Orgel und Saege
     noch eine vierte, klar unterscheidbare Farbe. */
  dreieck: new Array(32).fill(0).map(function(_,i){ return i < 16 ? Math.round(i/15*15) : Math.round((31-i)/15*15); })
};
function waveBuf(name){
  const s = gbStore();
  if(s.wave[name]) return s.wave[name];
  const T = WAVETABLES[name] || WAVETABLES.bass;
  const b = actx.createBuffer(1, 32, actx.sampleRate);
  const d = b.getChannelData(0);
  for(let i=0;i<32;i++) d[i] = (T[i]/15)*2 - 1;
  s.wave[name] = b;
  return b;
}
/* Rückgekoppeltes Schieberegister, 15 Bit breit - oder 7 Bit für den blechernen Modus */
function lfsrBuf(short){
  const s = gbStore(), k = short ? 's' : 'l';
  if(s.noise[k]) return s.noise[k];
  const len = Math.floor(actx.sampleRate*0.7);
  const b = actx.createBuffer(1, len, actx.sampleRate);
  const d = b.getChannelData(0);
  let reg = 0x7FFF;
  for(let i=0;i<len;i++){
    const bit = (reg ^ (reg>>1)) & 1;
    reg >>= 1;
    reg |= bit << 14;
    if(short){ reg &= ~(1<<6); reg |= bit << 6; }
    d[i] = (reg & 1) ? -0.55 : 0.55;
  }
  s.noise[k] = b;
  return b;
}
/* ---------- Gezupfte Saite ----------
   Karplus-Strong einmal fertig ausgerechnet statt als laufende
   Rueckkopplung. Eine Live-Schleife aus Delay und Feedback kann man nicht
   sauber beenden: bei jedem Anschlag bleibt eine weitere im Graphen
   haengen, sie stapeln sich und der Klang kippt. Ein fertiger Puffer
   stoppt dagegen von selbst und kann nie ueber sich hinauswachsen. */
function pluckBuf(bright, freq){
  const store = gbStore();
  if(!store.pluck) store.pluck = {};
  /* Ohne Frequenz entsteht der Puffer wie bisher auf 220 Hz und wird beim
     Abspielen verschoben. Mit Frequenz wird die Saite gleich in der richtigen
     Laenge gebaut. Das Verschieben zieht sonst Anschlag und Abklingen mit in
     die Tiefe - eine tiefe Gitarre klingt dann traege und verstimmt im
     Charakter, obwohl die Tonhoehe stimmt. */
  const sr = actx.sampleRate;
  const basis = (freq && freq > 20) ? Math.min(1600, freq) : 220;
  const key = Math.round(bright*10) + '/' + Math.round(basis);
  if(store.pluck[key]) return store.pluck[key];
  const N = Math.max(2, Math.round(sr/basis));
  const len = Math.floor(sr*2.4);
  const buf = actx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const ring = new Float32Array(N);
  let vor = 0;
  for(let i=0;i<N;i++){
    vor = vor*0.35 + (Math.random()*2-1)*0.65;   /* angeraute Anregung */
    ring[i] = vor;
  }
  /* rho unter 1 heisst: die Saite klingt garantiert aus */
  const rho = 0.978 + bright*0.012;
  let idx = 0, letzter = 0, peak = 0;
  for(let i=0;i<len;i++){
    const jetzt = ring[idx];
    ring[idx] = (jetzt + letzter)*0.5*rho;
    letzter = jetzt;
    d[i] = jetzt;
    if(Math.abs(jetzt) > peak) peak = Math.abs(jetzt);
    idx = (idx+1) % N;
  }
  if(peak > 0){ for(let i=0;i<len;i++) d[i] /= peak; }
  store.pluck[key] = buf;
  return buf;
}

/* ---------- Modale Synthese ----------
   Angeschlagene Instrumente bestehen physikalisch aus wenigen Resonanzen,
   die unterschiedlich schnell verklingen - und deren Frequenzen gerade NICHT
   ganzzahlig zum Grundton stehen. Genau das bildet diese Tabelle ab:
   verhaeltnis = Teiltonfrequenz, abkling = wie lange er steht,
   staerke = wie laut er anspricht. Deshalb klingt es nach Holz und Metall
   statt nach Oszillator. Werte an gemessenen Instrumenten orientiert. */
const MODALE = {
  marimba: {verhaeltnis:[1, 3.93, 9.22, 16.8], abkling:[1, 0.42, 0.20, 0.10], staerke:[1, 0.34, 0.13, 0.05], anschlag:'holz'},
  handpan: {verhaeltnis:[1, 2.01, 3.02, 4.95, 6.9], abkling:[1, 0.78, 0.55, 0.34, 0.22], staerke:[1, 0.5, 0.28, 0.14, 0.07], anschlag:'metall'},
  glocke:  {verhaeltnis:[0.5, 1, 1.19, 2.0, 2.76, 4.07, 5.43], abkling:[1, 0.9, 0.62, 0.5, 0.36, 0.22, 0.15], staerke:[0.5, 1, 0.42, 0.4, 0.28, 0.16, 0.09], anschlag:'metall'},
  kalimba: {verhaeltnis:[1, 2.7, 5.1, 8.4], abkling:[1, 0.45, 0.24, 0.12], staerke:[1, 0.3, 0.12, 0.05], anschlag:'holz'},
  /* Kesselpauke: die Verhaeltnisse eines gespannten Fells liegen dicht bei
     harmonischen - deshalb hat eine Pauke eine erkennbare Tonhoehe. */
  pauke:   {verhaeltnis:[1, 1.5, 1.97, 2.44, 2.9], abkling:[1, 0.62, 0.42, 0.26, 0.16], staerke:[1, 0.42, 0.24, 0.13, 0.07], anschlag:'filz'}
};

/* Kennlinie einer weich uebersteuerten Stufe. staerke 0 = sauber, 1 = brutal. */
const zerrCache = {};
function zerrKurve(staerke){
  const k = String(Math.round(staerke*20));
  if(zerrCache[k]) return zerrCache[k];
  const n = 8192, kurve = new Float32Array(n);
  const menge = 1 + staerke*60;
  for(let i=0;i<n;i++){
    const x = i*2/n - 1;
    kurve[i] = (1+menge)*x/(1+menge*Math.abs(x));   /* weiche Saettigung */
  }
  zerrCache[k] = kurve;
  return kurve;
}

/* Kennlinie mit Stufen: bildet die grobe Aufloesung alter Digitaltechnik
   nach. Wenige Stufen = starkes Broeseln. */
const bitCache = {};
function bitKurve(stufen){
  const k = String(stufen);
  if(bitCache[k]) return bitCache[k];
  const n = 4096, kurve = new Float32Array(n);
  for(let i=0;i<n;i++){
    const x = i*2/n - 1;
    kurve[i] = Math.round(x*stufen)/stufen;
  }
  bitCache[k] = kurve;
  return kurve;
}

/* Der Chip kannte nur 16 Lautstärkestufen */
function gbVol(v){ return Math.round(v*15)/15; }


/* ---------- 4. Audio ---------- */
let actx=null, master=null, revBus=null, delBus=null, delNode=null, noiseBuf=null;
/* Sidechain-Bus: Baesse, Melodien und Flaechen laufen hier durch und
   werden bei jedem Kick kurz leiser. Dieses Atmen im Takt ist das
   Kennzeichen elektronischer Musik - ohne es klingt alles statisch. */
let pumpBus = null;
let bpm=128, swingPct=0, masterVol=0.8;

function ensureAudio(){
  if(actx) return actx;
  const AC = window.AudioContext || window.webkitAudioContext;
  actx = new AC();
  /* iPadOS legt Web Audio sonst in die Kategorie "ambient": der
     Stummschalter im Kontrollzentrum macht dann die ganze App lautlos,
     ohne dass irgendwo etwas darauf hindeutet - man sucht den Fehler im
     Programm statt am Geraet. 'playback' sagt dem System, dass hier Musik
     laeuft und kein Klickgeraeusch. Safari ab 16.4, sonst wirkungslos. */
  try{ if(navigator.audioSession) navigator.audioSession.type = 'playback'; }catch(e){}
  buildBuses();
  return actx;
}
/* ---------- Wenn der Tonfaden reisst ----------
   Ein Anruf, Siri, der gesperrte Bildschirm, eine andere App, die den Ton
   uebernimmt: dann haelt das Geraet den Klangkontext an. Auf dem iPad heisst
   dieser Zustand aber NICHT 'suspended', sondern 'interrupted' - ein Name,
   den nur Safari kennt. Jede Abfrage auf 'suspended' geht daran vorbei, und
   genau deshalb blieb die Seite danach stumm, bis man sie neu lud.
   Dazu kommt: `resume()` ohne Nutzergeste lehnt iOS ab. Ein einmaliger
   Versuch reicht also nicht - es muss beim naechsten Tippen nochmal
   probiert werden. */
function audioLaeuft(){ return !!actx && actx.state === 'running'; }
function weckeAudio(){
  if(!actx) return false;
  if(actx.state === 'running') return true;
  if(actx.state === 'closed'){ baueAudioNeu(); return audioLaeuft(); }
  try{ const p = actx.resume(); if(p && p.catch) p.catch(function(){}); }catch(e){}
  return actx.state === 'running';
}
/* Letzter Ausweg: der Kontext ist geschlossen und laesst sich nicht mehr
   wecken. Dann einen neuen bauen und alle Figuren neu verkabeln - die
   alten Knoten gehoeren einem Kontext, den es nicht mehr gibt. */
function baueAudioNeu(){
  try{ if(typeof disposeSongAudio === 'function') disposeSongAudio(); }catch(e){}
  actx = null; master = null; revBus = null; delBus = null; delNode = null;
  noiseBuf = null; pumpBus = null; ambNode = null; ambGain = null;
  ensureAudio();
  /* Die Aufnahmen sind an ihren Kontext gebunden und muessen neu
     entschluesselt werden, sonst klingt hinterher alles synthetisch. */
  try{ if(typeof leereSampleSpeicher === 'function') leereSampleSpeicher(); }catch(e){}
  try{ if(typeof bereiteSamplesVor === 'function') bereiteSamplesVor(); }catch(e){}
  try{
    if(typeof allSongTracks === 'function' && typeof buildChain === 'function'){
      allSongTracks().forEach(buildChain);
      if(typeof applyAll === 'function') applyAll();
    }
  }catch(e){}
}

/* ---------- Stimmenbremse ----------
   Die Grenze eines Tablets ist nicht die Zahl der Figuren, sondern die Zahl
   der gleichzeitig klingenden Toene: jeder Anschlag baut je nach
   Klangerzeuger fuenf bis fuenfzehn Knoten. Gemessen an den Werksmustern
   sind das 51 Knoten je Sekunde - harmlos. Acht dicht gewuerfelte Figuren
   kommen leicht auf das Fuenf- bis Zehnfache, und dann bricht der Tonfaden
   ein: erst knistert es, dann fallen Toene aus, dann steht alles.
   Darum eine harte Obergrenze ueber ALLE Figuren hinweg. Sie greift nur in
   Faellen, die ohnehin nach Matsch klingen, und schneidet dort die
   spaetesten Toene weg statt den ganzen Satz zu verlieren. */
let stimmen = [];
let stimmenUhr = 0;
function stimmenGrenze(){
  /* Gemessen: acht dicht gewuerfelte Lo-fi-Figuren kommen auf hoechstens 22
     gleichzeitige Toene und 59 Knoten je Sekunde - normale Nutzung liegt
     also weit darunter. Die Grenze ist bewusst kein Sparzwang, sondern ein
     Fangnetz gegen Faelle, die ohnehin nach Matsch klingen. Zu eng gesetzt
     wuerde sie hoerbar Toene schlucken. */
  return document.documentElement.classList.contains('klein') ? 32 : 48;
}
function stimmeFrei(when, dauer){
  /* Springt die Zeit zurueck, ist das ein anderer Kontext (Export) - dann
     ist die alte Liste wertlos. */
  if(when < stimmenUhr - 1) stimmen = [];
  stimmenUhr = when;
  stimmen = stimmen.filter(function(ende){ return ende > when; });
  if(stimmen.length >= stimmenGrenze()) return false;
  stimmen.push(when + Math.max(0.05, dauer));
  return true;
}
function stimmenZuruecksetzen(){ stimmen = []; stimmenUhr = 0; }

/* Summenweg, Hall und Echo. Getrennt von ensureAudio, damit der Export
   dieselben Busse in einem OfflineAudioContext aufbauen kann. */
function buildBuses(){
  /* Der Kompressor ist ein Sicherheitsnetz fuer Spitzen, kein Dauergriff:
     die Spuren kommen leise herein, danach hebt outGain wieder an. So bleibt
     der Beat auch mit acht Figuren luftig statt gequetscht. */
  const comp = actx.createDynamicsCompressor();
  comp.threshold.value=-3; comp.ratio.value=8; comp.knee.value=6;
  comp.attack.value=0.004; comp.release.value=0.16;
  master = actx.createGain(); master.gain.value = masterVol;
  pumpBus = actx.createGain(); pumpBus.gain.value = 1; pumpBus.connect(master);
  const outGain = actx.createGain(); outGain.gain.value = 1.75;
  master.connect(comp); comp.connect(outGain); outGain.connect(actx.destination);

  /* Hall bekommt kein Tieffrequentes: genau da entsteht sonst der Matsch,
     wenn mehrere Baesse gleichzeitig in denselben Raum spielen. */
  const conv = actx.createConvolver();
  /* echte Raumaufnahme, falls hinterlegt - sonst der gerechnete Raum */
  const echterRaum = (typeof irBuffer === 'function') ? irBuffer() : null;
  conv.buffer = echterRaum || impulse(2.4, 2.8);
  const revHP = actx.createBiquadFilter(); revHP.type='highpass'; revHP.frequency.value=320; revHP.Q.value=0.6;
  const revLP = actx.createBiquadFilter(); revLP.type='lowpass'; revLP.frequency.value=5600; revLP.Q.value=0.6;
  revBus = actx.createGain(); revBus.gain.value = 1;
  const revOut = actx.createGain(); revOut.gain.value = 0.55;
  revBus.connect(revHP); revHP.connect(revLP); revLP.connect(conv);
  conv.connect(revOut); revOut.connect(master);

  delNode = actx.createDelay(1.2); delNode.delayTime.value = delayZeit();
  const fb = actx.createGain(); fb.gain.value = 0.3;
  const dfil = actx.createBiquadFilter(); dfil.type='lowpass'; dfil.frequency.value=2400;
  const delHP = actx.createBiquadFilter(); delHP.type='highpass'; delHP.frequency.value=280; delHP.Q.value=0.6;
  delBus = actx.createGain(); delBus.gain.value = 1;
  delBus.connect(delHP); delHP.connect(delNode);
  delNode.connect(dfil); dfil.connect(fb); fb.connect(delNode);
  const delOut = actx.createGain(); delOut.gain.value = 0.34;
  delNode.connect(delOut); delOut.connect(master);

  noiseBuf = actx.createBuffer(1, Math.floor(actx.sampleRate*2), actx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
}
/* ---------- Ambience: Dauerklang einer Welt ----------
   Simuliertes Schallplattenrauschen als nahtlose Schleife: leises
   Grundrauschen, viele kleine Knackser und ein paar seltene, tiefere
   Plopps. Kein Sample, alles gerechnet - und im Export genauso dabei. */
let ambNode = null, ambGain = null, ambLevel = 1;
const ambCache = new WeakMap();
function vinylBuf(seconds){
  let store = ambCache.get(actx);
  if(!store){ store = {}; ambCache.set(actx, store); }
  if(store.vinyl) return store.vinyl;
  const sr = actx.sampleRate, len = Math.floor(sr*seconds);
  const buf = actx.createBuffer(2, len, sr);
  for(let c=0;c<2;c++){
    const d = buf.getChannelData(c);
    let last = 0;
    for(let i=0;i<len;i++){
      last = last*0.72 + (Math.random()*2-1)*0.28;   /* sanft gefiltertes Grundrauschen */
      d[i] = last*0.055;
    }
    const knacks = Math.floor(seconds*42);
    for(let k=0;k<knacks;k++){
      const pos = Math.floor(Math.random()*(len-300));
      const amp = 0.10+Math.random()*0.45, dur = 5+Math.floor(Math.random()*40);
      for(let i=0;i<dur;i++) d[pos+i] += (Math.random()*2-1)*amp*Math.pow(1-i/dur, 3);
    }
    const plopps = Math.floor(seconds*2.4);
    for(let k=0;k<plopps;k++){
      const pos = Math.floor(Math.random()*(len-600));
      const amp = 0.28+Math.random()*0.38, dur = 70+Math.floor(Math.random()*200);
      for(let i=0;i<dur;i++) d[pos+i] += Math.sin(i*0.085)*amp*Math.pow(1-i/dur, 2.2);
    }
  }
  store.vinyl = buf;
  return buf;
}
/* until gesetzt = Offline-Export: dann nichts am laufenden Live-Klang anfassen */
function startAmbience(when, until){
  if(typeof genre === 'undefined' || !genre || !genre.ambience || !master) return;
  if(!until) stopAmbience();
  const src = actx.createBufferSource();
  src.buffer = vinylBuf(4.5);
  src.loop = true;
  const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=130;
  const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=7200;
  const g = actx.createGain();
  const level = Math.max(genre.ambience.level*ambLevel, 0.0002);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(level, when+0.4);
  src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(master);
  src.start(when, Math.random()*3);
  if(until){
    g.gain.setValueAtTime(level, Math.max(when, until-0.8));
    g.gain.linearRampToValueAtTime(0.0001, until);
    src.stop(until+0.05);
  } else {
    ambNode = src; ambGain = g;
  }
}
function stopAmbience(){
  if(!ambNode) return;
  try{
    const now = actx.currentTime;
    if(ambGain){
      ambGain.gain.cancelScheduledValues(now);
      ambGain.gain.setValueAtTime(Math.max(ambGain.gain.value, 0.0002), now);
      ambGain.gain.linearRampToValueAtTime(0.0001, now+0.3);
    }
    ambNode.stop(now+0.35);
  }catch(e){}
  ambNode = null; ambGain = null;
}
/* Fuer einen Regler im Frontend: 0 = aus, 1 = wie in der Welt vorgesehen */
function setAmbienceLevel(v){
  ambLevel = Math.max(0, Math.min(1, v));
  if(ambGain && genre && genre.ambience){
    try{ ambGain.gain.setTargetAtTime(genre.ambience.level*ambLevel, actx.currentTime, 0.05); }catch(e){}
  }
}
function ambienceOn(){ return !!(typeof genre !== 'undefined' && genre && genre.ambience); }

function impulse(dur, decay){
  const len = Math.floor(actx.sampleRate*dur);
  const buf = actx.createBuffer(2, len, actx.sampleRate);
  for(let c=0;c<2;c++){
    const ch = buf.getChannelData(c);
    for(let i=0;i<len;i++) ch[i] = (Math.random()*2-1) * Math.pow(1-i/len, decay);
  }
  return buf;
}
function noiseSrc(when, dur){
  const s = actx.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  s.start(when, Math.random()*1.5); s.stop(when+dur+0.02);
  return s;
}
function osc(type, freq, when, dur){
  const o = actx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, when);
  o.start(when); o.stop(when+dur+0.03);
  return o;
}
function envGain(when, a, d, peak){
  const g = actx.createGain();
  const p = Math.max(peak, 0.0004);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(p, when+Math.max(a,0.001));
  g.gain.exponentialRampToValueAtTime(0.0001, when+Math.max(a,0.001)+d);
  return g;
}
function mtof(m){ return 440*Math.pow(2,(m-69)/12); }
/* Delayzeit im Takt der Welt. 0.75 = punktierte Achtel, das traegt breit und
   traeumerisch. Kuerzere Werte treiben - deshalb kann jede Welt ihren eigenen
   Wert setzen, statt dass alle denselben bekommen. */
function delayZeit(){
  const teil = (typeof genre !== 'undefined' && genre && genre.delay) || 0.75;
  return 60/bpm*teil;
}
/* Kurzes Wegdruecken beim Kick. tiefe 0 = aus, 1 = ganz zu. */
function duckeBeimKick(when){
  if(!pumpBus || typeof genre === 'undefined' || !genre || !genre.pump) return;
  const tiefe = Math.min(0.85, genre.pump.tiefe || 0.45);
  const zurueck = genre.pump.dauer || 0.24;
  try{
    pumpBus.gain.cancelScheduledValues(when);
    pumpBus.gain.setValueAtTime(1, when);
    pumpBus.gain.linearRampToValueAtTime(1-tiefe, when+0.014);
    pumpBus.gain.linearRampToValueAtTime(1, when+0.014+zurueck);
  }catch(e){}
}

/* ---------- 6. Klangerzeuger ---------- */
function trigger(t, when, h, schritt){
  if(!t.n) buildChain(t);
  if(!t.n) return;
  /* satz: mehrere Toene gleichzeitig, angegeben als Stufenabstaende auf der
     Tonleiter der Welt. Damit wird aus einer Figur eine Sektion - vier
     Blaeser, die denselben Akkord stossen, statt eines Blaesers mit Hall.

     Warum das nicht dasselbe ist wie zwei verstimmte Kopien: jede Stimme
     holt sich ueber sampleFuer() die Aufnahme, die IHRER Tonhoehe am
     naechsten liegt - vier Stimmen sind also vier verschiedene Dateien, ein
     echter Akkord. Nebenbei zaehlt t.rrSample pro Stimme weiter, jede greift
     an einer anderen Stelle in die Aufnahme. Zwei Kopien derselben Datei
     waeren ein Chorus, und der klingt nach Synthesizer, nicht nach Satz.

     Der winzige Versatz je Stimme ist kein Detail, sondern der Grund, warum
     eine Sektion nicht nach Sampler klingt: kein Blaeser setzt exakt
     gleichzeitig an, und ein perfekt gleichzeitiger Akkord verschmilzt zu
     einem einzigen breiten Ton. */
  if(t.p.satz && !t.imSatz){
    t.imSatz = true;
    /* Der Versatz je Stimme ist kein Detail, sondern entscheidet, welches
       Instrument man zu hoeren glaubt.

       Ein BLAESERSATZ ist gleichzeitig gemeint: vier Leute atmen auf denselben
       Punkt. 7 ms waren dafuer zu viel (bei vier Stimmen 21 ms zwischen erster
       und letzter, gemessen 44 ms bis zum vollen Pegel - kein Ansatz mehr,
       sondern ein Anschwellen, und ein anschwellender Vierklang ist ein Chor).
       2,5 ms machen den Einsatz menschlich, ohne ihn zu verwischen.

       Ein GITARRENAKKORD ist NIE gleichzeitig: das Plektrum faehrt ueber die
       Saiten, und genau dieser Anschlag ist das, woran das Ohr eine Gitarre
       erkennt. Kommen die Toene zusammen, hoert man ein Tasteninstrument -
       egal, welche Aufnahme darunter liegt. Deshalb pro Figur einstellbar. */
    const versatz = t.p.satzVersatz === undefined ? 0.0025 : t.p.satzVersatz;
    for(let i=0;i<t.p.satz.length;i++) trigger(t, when + i*versatz, h + t.p.satz[i], schritt);
    t.imSatz = false;
    return;
  }
  /* Hier gab es einmal `selten`, einen Zufall je Anschlag. Ausgebaut, aus
     zwei Gruenden: in einem Ein-Takt-Loop bleibt eine Figur damit ganze
     Durchlaeufe stumm und wirkt kaputt - und ein Export, der bei jedem
     Rendern anders klingt, ist kein Export. Was jemand hoert, muss er auch
     mitnehmen koennen. Ueberraschung gehoert in die Takte, nicht in den Wurf. */
  /* schleppen: die Figur kommt absichtlich zu spaet, angegeben in Sekunden.
     Das ist der Kern von Lo-Fi und von allem, was "menschlich gespielt"
     klingen soll. Ein Schlagzeuger sitzt nie exakt auf dem Raster; die Snare
     haengt hinter dem Schlag, waehrend die Bassdrum steht. Genau diese
     Differenz erzeugt den traegen Zug. Perfekt quantisiert klingt es
     maschinell, egal wie gut die Klaenge sind. */
  if(t.p.schleppen) when += t.p.schleppen;
  /* Faehrt an dieser Figur ein Regler, gelten fuer diesen Anschlag andere
     Werte als die, die im Inspektor stehen. */
  const P = (typeof paramsBei === 'function') ? paramsBei(t, schritt || 0) : t.params;
  if(P !== t.params && typeof setzeKettenwerte === 'function') setzeKettenwerte(t, P, when);
  const tonal = !!TONAL[t.p.engine];
  /* Lange Klänge bekommen ein kleines Polyphonie-Limit. Das hält iPads auch
     bei sehr dichten Workshop-Mustern stabil, ohne kurze Beats zu beschneiden. */
  const caps = {pad:4, voice:6, wobble:6, sub:4};
  const cap = caps[t.p.engine];
  if(cap){
    const tails = {pad:1.2+P.len*4, voice:0.5+P.len*1.8, wobble:0.4+P.len*1.6, sub:0.7+P.len*2.4};
    t.voiceEnds = (t.voiceEnds || []).filter(function(end){ return end > when; });
    if(t.voiceEnds.length >= cap) return;
    t.voiceEnds.push(when+tails[t.p.engine]);
  }
  const vel = tonal ? 0.85 : (0.30 + h/7*0.70);
  const L = 0.35 + P.len*1.6;
  /* Nach den Einzelgrenzen die Gesamtgrenze - siehe stimmeFrei(). */
  if(!stimmeFrei(when, L)) return;
  const pf = Math.pow(2, P.pitch/12);
  /* leiern: Bandschlupf. Ein Kassettendeck haelt die Geschwindigkeit nicht,
     die Tonhoehe wandert langsam - das ist der Klang, den man mit "alt" und
     "staubig" verbindet. Der langsame Anteil folgt der Uhr, damit
     aufeinanderfolgende Toene gemeinsam wandern (das hoert man als Leiern
     statt als Verstimmung); dazu ein winziger zufaelliger Anteil pro Ton
     fuer die Unruhe des Bandlaufs. Angabe in Cent. */
  let schlupf = 0;
  if(t.p.leiern){
    schlupf = (Math.sin(when*0.83) * 0.7 + Math.sin(when*2.7) * 0.2
               + (Math.random()*2-1) * 0.1) * t.p.leiern;
  }
  const f = mtof(genre.root + t.p.oct + P.pitch + (tonal ? degree(h) : 0)) * Math.pow(2, schlupf/1200);
  const out = t.n.in;
  /* Liegt fuer diese Figur eine echte Aufnahme bereit, hat sie Vorrang.
     Ohne Datei laeuft alles unveraendert synthetisch weiter. */
  if(t.p.sample && typeof spieleSample === 'function'){
    const midi = genre.root + t.p.oct + P.pitch + (tonal ? degree(h) : 0);
    /* Die Untergrenze stand auf 0,25 s. Damit war der kuerzeste Ton, den eine
       Aufnahme spielen konnte, laenger als der Abstand zwischen zwei
       Sechzehnteln bei 132 BPM (0,15 s) - eine Stossfigur klang deshalb
       zwangslaeufig durchgehend, egal wie klein `len` stand. Gemessen: der
       Blaesersatz bestand zu 89 % aus stehendem Klang, die Gitarre zu 83 %.
       Vier verstimmte Stimmen, die nie aufhoeren, sind ein Chor.
       Mit 0,10 s reicht der Regler jetzt bis zu einem echten Stoss. Der obere
       Teil bleibt fast gleich (Faktor 1,95 statt 1,8): bei mittlerer
       Stellung sind es 6 % Unterschied, das hoert niemand - betroffen sind
       nur Figuren, die ganz unten stehen, und die wollen genau das. */
    const laenge = tonal ? (0.10 + P.len*1.95) : (0.12 + P.len*0.5);
    if(spieleSample(t, when, h, out, vel*0.8, laenge, midi)){ t.hitAt = when; return; }
  }

  switch(t.p.engine){
    case 'kick': {
      duckeBeimKick(when);
      const g = envGain(when, 0.004, 0.16*L+0.08, vel);
      const o = osc('sine', 150*pf, when, 0.3*L+0.12);
      o.frequency.exponentialRampToValueAtTime(42*pf, when+0.09);
      o.connect(g); g.connect(out);
      const cg = envGain(when, 0.001, 0.022, vel*0.45);
      noiseSrc(when, 0.05).connect(cg); cg.connect(out);
      break;
    }
    case 'snare': {
      const dur = 0.10+P.len*0.26;
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1500*pf; bp.Q.value=0.8;
      const g = envGain(when, 0.002, dur, vel*0.75);
      noiseSrc(when, dur+0.05).connect(bp); bp.connect(g); g.connect(out);
      const bg = envGain(when, 0.002, 0.085, vel*0.5);
      const o = osc('triangle', 195*pf, when, 0.13);
      o.frequency.exponentialRampToValueAtTime(120*pf, when+0.08);
      o.connect(bg); bg.connect(out);
      break;
    }
    case 'clap': {
      /* Gated Reverb: ein Hallschwanz, der nicht ausklingt, sondern abrupt
         abgeschnitten wird. Der Signalklang der 80er. */
      if(t.p.gate){
        const halle = 0.09+P.len*0.16;
        const ng = actx.createGain();
        ng.gain.setValueAtTime(0.0001, when);
        ng.gain.exponentialRampToValueAtTime(vel*0.30, when+0.012);
        ng.gain.setValueAtTime(vel*0.24, when+halle);
        ng.gain.linearRampToValueAtTime(0.0001, when+halle+0.008);  /* harte Kante */
        const bp = actx.createBiquadFilter(); bp.type='bandpass';
        bp.frequency.value = 1500*pf; bp.Q.value = 0.5;
        noiseSrc(when, halle+0.06).connect(bp); bp.connect(ng); ng.connect(out);
      }
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1150*pf; bp.Q.value=1.2;
      bp.connect(out);
      for(let i=0;i<4;i++){
        const tt = when + i*0.013;
        const dur = i===3 ? (0.09+P.len*0.24) : 0.022;
        const g = envGain(tt, 0.001, dur, vel*(i===3?0.75:0.45));
        noiseSrc(tt, dur+0.03).connect(g); g.connect(bp);
      }
      break;
    }
    case 'hat': {
      /* Mit offen:true zaehlen hohe Stufen als offene Hi-Hat. Bewusst nur auf
         Wunsch der Figur - an dieser Klangart haengen alle Welten, und in den
         uebrigen soll eine hohe Stufe weiter nur lauter heissen. */
      const auf = t.p.offen && h >= 6;
      const dur = (0.018+P.len*0.24) * (auf ? 5.5 : 1);
      const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=Math.min(14000, 6200*pf);
      const g = envGain(when, 0.001, dur, vel*0.42);
      noiseSrc(when, dur+0.04).connect(hp); hp.connect(g); g.connect(out);
      break;
    }
    case 'bass': {
      const dur = 0.16+P.len*0.6;
      /* Portamento: der Ton gleitet aus dem vorherigen heraus, statt zu springen.
         Genau das macht aus einem Rechteckbass einen analogen Synthesizer. */
      const gleit = t.p.glide || 0;
      const vonF = (gleit && t.letzteFreq) ? t.letzteFreq : 0;
      t.letzteFreq = f;
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=6;
      lp.frequency.setValueAtTime(Math.min(f*10, 3600), when);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f*1.6, 60), when+dur*0.85);
      const g = envGain(when, 0.006, dur, vel*0.62);
      const o1 = osc('sawtooth', f, when, dur+0.1);
      const o2 = osc('square', f/2, when, dur+0.1); o2.detune.value = 7;
      if(vonF > 20){
        o1.frequency.setValueAtTime(vonF, when);
        o1.frequency.exponentialRampToValueAtTime(f, when+gleit);
        o2.frequency.setValueAtTime(vonF/2, when);
        o2.frequency.exponentialRampToValueAtTime(f/2, when+gleit);
      }
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out);
      break;
    }
    case 'sub': {      /* Der Grundton allein liegt unter dem, was Laptop- und
                          Tabletlautsprecher wiedergeben. Ein leiser Oberton eine
                          Oktave und eine Duodezime darueber macht ihn hoerbar,
                          ohne den Tiefgang auf guten Boxen zu verlieren. */
      const dur = 0.5+P.len*2.4;
      const g = envGain(when, 0.025, dur, vel*0.8);
      /* Portamento wie beim Bass und beim Lead: der Ton rutscht in den
         naechsten, statt zu springen. Beim Sinusbass ist das der ganze
         Unterschied zwischen gezupft und geschoben - und es muss ALLE
         Teiltoene mitnehmen, sonst gleitet der Grundton, waehrend Oktave
         und Quinte darueber stehenbleiben. Das waere kein Rutschen,
         sondern ein kurzer falscher Akkord. */
      const gleit = t.p.glide || 0;
      const vonF = (gleit && t.letzteFreq) ? t.letzteFreq : 0;
      t.letzteFreq = f;
      const rutsch = function(o, teil){
        if(vonF <= 20) return;
        o.frequency.setValueAtTime(vonF*teil, when);
        o.frequency.exponentialRampToValueAtTime(f*teil, when+Math.min(gleit, dur*0.6));
      };
      const o = osc('sine', f, when, dur+0.15); rutsch(o, 1);
      const o2 = osc('triangle', f, when, dur+0.15); o2.detune.value = -9; rutsch(o2, 1);
      const g2 = actx.createGain(); g2.gain.value = 0.22;
      o2.connect(g2); g2.connect(g); o.connect(g); g.connect(out);
      /* Hoerbarmacher: Oktave und Quinte darueber, deutlich leiser */
      const ob1 = osc('sine', f*2, when, dur*0.7); rutsch(ob1, 2);
      const gb1 = envGain(when, 0.02, dur*0.6, vel*0.16);
      ob1.connect(gb1); gb1.connect(out);
      const ob2 = osc('triangle', f*3, when, dur*0.5); rutsch(ob2, 3);
      const gb2 = envGain(when, 0.02, dur*0.45, vel*0.07);
      ob2.connect(gb2); gb2.connect(out);
      break;
    }
    case 'pluck': {
      const dur = 0.09+P.len*0.65;
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=3;
      lp.frequency.setValueAtTime(Math.min(f*9, 12000), when);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f*1.5, 130), when+dur);
      const g = envGain(when, 0.003, dur, vel*0.5);
      const o1 = osc('triangle', f, when, dur+0.06);
      const o2 = osc('square', f, when, dur+0.06); o2.detune.value = -9;
      const gg = actx.createGain(); gg.gain.value = 0.35;
      o2.connect(gg); gg.connect(lp); o1.connect(lp); lp.connect(g); g.connect(out);
      break;
    }
    case 'lead': {
      const dur = 0.16+P.len*0.95;
      const g = envGain(when, 0.014, dur, vel*0.38);
      const o1 = osc('sawtooth', f, when, dur+0.08); o1.detune.value = -7;
      const o2 = osc('sawtooth', f, when, dur+0.08); o2.detune.value = 7;
      const o3 = osc('square', f*2, when, dur+0.08);
      const g3 = actx.createGain(); g3.gain.value = 0.16;
      o3.connect(g3); g3.connect(g); o1.connect(g); o2.connect(g); g.connect(out);
      break;
    }
    case 'pad': {
      const dur = 1.4+P.len*3.6;
      const g = envGain(when, 0.4, dur, vel*0.26);
      const o1 = osc('sawtooth', f, when, dur+0.6); o1.detune.value = -8;
      const o2 = osc('sawtooth', f, when, dur+0.6); o2.detune.value = 9;
      const o3 = osc('sawtooth', f*2, when, dur+0.6);
      const g3 = actx.createGain(); g3.gain.value = 0.28;
      o3.connect(g3); g3.connect(g); o1.connect(g); o2.connect(g); g.connect(out);
      break;
    }
    case 'schleier': {
      /* Datenschleier: eine kalte Flaeche, die sich langsam oeffnet und wieder
         schliesst. Bewusst eine eigene Klangart und nicht 'pad' - an der
         haengen Chor der Weite und andere Welten. Der Reiz liegt in der
         Bewegung: ein wandernder Bandpass ueber zwei verstimmten Saegezaehnen,
         darueber ein leiser Ringmodulator fuers Metallische. */
      const dur = 1.8+P.len*3.4;
      const g = envGain(when, 0.7, dur, vel*0.30);
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value = 1.5;
      bp.frequency.setValueAtTime(Math.max(140, f*0.9), when);
      bp.frequency.linearRampToValueAtTime(Math.min(6200, f*5.5), when+dur*0.66);
      bp.frequency.linearRampToValueAtTime(Math.max(160, f*1.2), when+dur);
      const o1 = osc('sawtooth', f, when, dur+0.5); o1.detune.value = -11;
      const o2 = osc('sawtooth', f, when, dur+0.5); o2.detune.value = 12;
      const o3 = osc('square', f*0.5, when, dur+0.5);
      const g3 = actx.createGain(); g3.gain.value = 0.18;
      o1.connect(bp); o2.connect(bp); o3.connect(g3); g3.connect(bp);
      bp.connect(g);
      /* Ringmodulation: eine Sinuswelle multipliziert die Flaeche und erzeugt
         Summen- und Differenztoene. Das klingt nach Maschine statt nach Chor -
         und der Faktor 2.41 ist bewusst unharmonisch. */
      const ring = actx.createGain(); ring.gain.value = 0;
      const rm = osc('sine', f*2.41, when, dur+0.5);
      const rg = actx.createGain(); rg.gain.value = 0.5;
      rm.connect(rg); rg.connect(ring.gain);
      bp.connect(ring);
      const ringAus = actx.createGain(); ringAus.gain.value = 0.32;
      ring.connect(ringAus); ringAus.connect(g);
      g.connect(out);
      break;
    }
    case 'fluestern': {
      /* Atem statt Ton. Bewusst eine eigene Klangart und nicht 'pad':
         daran haengen auch Datenschleier und Chor der Weite, und die sollen
         Synthesizerflaeche bleiben. Rauschen durch zwei Formanten, die ueber
         die Note hinweg von einem Vokal zum naechsten wandern - genau diese
         Bewegung trennt ein Fluestern von einem Zischen. */
      const dur = 1.6+P.len*3.8;
      const g = envGain(when, 0.55, dur, vel*0.46);
      /* Alles laeuft durch eine zweite Stufe, die langsam auf und ab geht.
         Direkt auf die Huellkurve gelegt wuerde das Atmen den Pegel ins
         Negative ziehen - hier schwankt es sauber um 1 herum. */
      const atmung = actx.createGain(); atmung.gain.value = 1;
      atmung.connect(g);
      const luft = noiseSrc(when, dur+0.7);
      const hp = actx.createBiquadFilter(); hp.type='highpass';
      hp.frequency.value = Math.min(900, Math.max(190, f*1.1)); hp.Q.value = 0.4;
      const lp = actx.createBiquadFilter(); lp.type='lowpass';
      lp.frequency.value = 2300+P.tone*4400;
      luft.connect(hp); hp.connect(lp);
      const vok = [[520,1180],[420,1900],[680,1080],[350,1650]];
      const von = vok[h % vok.length], nach = vok[(h+2) % vok.length];
      const lage = 0.85+Math.min(f, 900)/900*0.32;
      for(let i=0;i<2;i++){
        const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value = 5.4-i*1.7;
        bp.frequency.setValueAtTime(von[i]*lage, when);
        bp.frequency.linearRampToValueAtTime(nach[i]*lage, when+dur*0.85);
        const bg = actx.createGain(); bg.gain.value = i ? 0.62 : 1;
        lp.connect(bp); bp.connect(bg); bg.connect(atmung);
      }
      /* etwas ungeformte Luft daneben, sonst hoert man den Filter und nicht den Atem */
      const roh = actx.createGain(); roh.gain.value = 0.20;
      lp.connect(roh); roh.connect(atmung);
      const atem = actx.createOscillator(); atem.type='sine';
      atem.frequency.value = 0.32+Math.random()*0.22;
      const atemG = actx.createGain(); atemG.gain.value = 0.28;
      atem.connect(atemG); atemG.connect(atmung.gain);
      atem.start(when); atem.stop(when+dur+0.7);
      /* gestimmte Spur, bewusst weit unter dem Rauschen */
      const tlp = actx.createBiquadFilter(); tlp.type='lowpass'; tlp.frequency.value = f*4.2;
      const t1 = osc('triangle', f, when, dur+0.5);
      const t2 = osc('triangle', f*2, when, dur+0.5); t2.detune.value = 9;
      const tg = actx.createGain(); tg.gain.value = 0.06;
      t1.connect(tlp); t2.connect(tlp); tlp.connect(tg); tg.connect(atmung);
      g.connect(out);
      break;
    }
    case 'voice': {
      const dur = 0.35+P.len*1.5;
      const src = osc('sawtooth', f, when, dur+0.12);
      const lfo = actx.createOscillator(); lfo.frequency.value = 5.4;
      const lg = actx.createGain(); lg.gain.value = 7;
      lfo.connect(lg); lg.connect(src.detune); lfo.start(when); lfo.stop(when+dur+0.12);
      const g = envGain(when, 0.08, dur, vel*0.95);
      const F = [[730,1090,2440],[400,1700,2600],[300,870,2240]][h % 3];
      F.forEach(function(fq, i){
        const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=fq; bp.Q.value=8;
        const bg = actx.createGain(); bg.gain.value = [1, 0.55, 0.3][i];
        src.connect(bp); bp.connect(bg); bg.connect(g);
      });
      g.connect(out);
      break;
    }
    case 'bell': {     /* echte Glocke: inharmonische Teiltoene, jeder mit eigener Abklingzeit */
      const M = MODALE.glocke;
      const basis = 0.7 + P.len*2.8;
      const g = actx.createGain(); g.gain.value = vel*0.4;
      g.connect(out);
      M.verhaeltnis.forEach(function(v, i){
        const fq = f*v;
        if(fq > 17000) return;
        const dauer = basis*M.abkling[i];
        const o = osc('sine', fq, when, dauer+0.05);
        o.detune.value = (i%2 ? 5 : -4);
        const og = envGain(when, 0.003, dauer, M.staerke[i]);
        o.connect(og); og.connect(g);
      });
      const ng = envGain(when, 0.0005, 0.02, vel*0.12);
      const nbp = actx.createBiquadFilter(); nbp.type='bandpass';
      nbp.frequency.value = Math.min(11000, f*7); nbp.Q.value = 2.2;
      noiseSrc(when, 0.04).connect(nbp); nbp.connect(ng); ng.connect(g);
      break;
    }
    case 'tom': {       /* gestimmte Trommel - spielt Töne wie ein Melodie-Instrument */
      const dur = 0.16+P.len*0.6;
      const g = envGain(when, 0.003, dur, vel*0.55);
      const o = osc('sine', f*2.2, when, dur+0.06);
      o.frequency.exponentialRampToValueAtTime(f, when+dur*0.55);
      const o2 = osc('triangle', f*2.2, when, dur+0.06);
      o2.frequency.exponentialRampToValueAtTime(f, when+dur*0.55);
      const g2 = actx.createGain(); g2.gain.value = 0.3;
      o2.connect(g2); g2.connect(g);
      o.connect(g); g.connect(out);
      const ng = envGain(when, 0.001, 0.028, vel*0.22);
      noiseSrc(when, 0.05).connect(ng); ng.connect(out);
      break;
    }
    case 'wobble': {    /* Bass, dessen Filter im Takt auf und zu geht */
      const dur = 0.2+P.len*0.95;
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=9;
      lp.frequency.setValueAtTime(Math.min(f*4, 900), when);
      const lfo = actx.createOscillator();
      lfo.frequency.value = bpm/60*2;
      const lg = actx.createGain(); lg.gain.value = Math.min(f*3, 700);
      lfo.connect(lg); lg.connect(lp.frequency);
      lfo.start(when); lfo.stop(when+dur+0.1);
      const g = envGain(when, 0.008, dur, vel*0.6);
      const o1 = osc('sawtooth', f, when, dur+0.1);
      const o2 = osc('square', f/2, when, dur+0.1);
      const g2 = actx.createGain(); g2.gain.value = 0.45;
      o2.connect(g2); g2.connect(lp);
      o1.connect(lp); lp.connect(g); g.connect(out);
      break;
    }
    case 'flute': {     /* weiche Melodie mit Vibrato und etwas Atemgeräusch */
      const dur = 0.25+P.len*1.1;
      const g = envGain(when, 0.07, dur, vel*0.42);
      const o = osc('triangle', f, when, dur+0.1);
      const o2 = osc('sine', f*2, when, dur+0.1);
      const g2 = actx.createGain(); g2.gain.value = 0.18;
      o2.connect(g2); g2.connect(g);
      const lfo = actx.createOscillator(); lfo.frequency.value = 5.6;
      const lg = actx.createGain(); lg.gain.value = 5;
      lfo.connect(lg); lg.connect(o.detune);
      lfo.start(when); lfo.stop(when+dur+0.1);
      const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value = 2200;
      const ng = envGain(when, 0.04, dur*0.5, vel*0.07);
      noiseSrc(when, dur).connect(hp); hp.connect(ng); ng.connect(out);
      o.connect(g); g.connect(out);
      break;
    }
    case 'stab': {      /* kurzer Akkord aus drei Tönen der Tonleiter */
      const dur = 0.12+P.len*0.6;
      const g = envGain(when, 0.004, dur, vel*0.28);
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=2;
      lp.frequency.setValueAtTime(4200, when);
      lp.frequency.exponentialRampToValueAtTime(700, when+dur);
      /* Standard: Grundton, Quinte, Oktave. Terzen aus der Tonleiter ergeben je
         nach Stufe auch verminderte Akkorde, die gegen alles andere unruhig
         klingen; Quinten legen kein Tongeschlecht fest und passen immer.

         Mit septime:true wird stattdessen in Terzen geschichtet - Stufe, dritte,
         fuenfte, siebte. Das ergibt Septakkorde, und die sind in Swing und Jazz
         nicht die Ausnahme sondern der Normalfall: erst Terz und Septime geben
         einem Akkord seine Farbe. Bewusst nur auf Wunsch, weil es in den
         uebrigen Welten tatsaechlich unruhig waere. */
      const toene = t.p.septime
        ? [0,2,4,6].map(function(st){ return degree(h+st) - degree(h); })
        : [0,7,12];
      toene.forEach(function(halbton){
        const ff = mtof(genre.root + t.p.oct + P.pitch + degree(h) + halbton);
        const a = osc('sawtooth', ff, when, dur+0.07); a.detune.value = -6;
        const b = osc('sawtooth', ff, when, dur+0.07); b.detune.value = 6;
        a.connect(lp); b.connect(lp);
      });
      lp.connect(g); g.connect(out);
      break;
    }
    /* ----- Lo-Fi: alles eine Spur zu weich, zu dumpf, zu spät ----- */
    case 'lofikick': {
      duckeBeimKick(when);
      const dur = 0.20+P.len*0.42;
      const g = envGain(when, 0.008, dur, vel*0.92);
      const o = osc('sine', 118*pf, when, dur+0.08);
      o.frequency.exponentialRampToValueAtTime(45*pf, when+0.12);
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=190;
      o.connect(g); g.connect(lp); lp.connect(out);
      break;
    }
    case 'lofisnare': {
      const dur = 0.10+P.len*0.24;
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1050*pf; bp.Q.value=0.55;
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3000;
      const g = envGain(when, 0.006, dur, vel*0.5);
      noiseSrc(when, dur+0.05).connect(bp); bp.connect(lp); lp.connect(g); g.connect(out);
      const bg = envGain(when, 0.005, 0.075, vel*0.3);
      osc('sine', 172*pf, when, 0.11).connect(bg); bg.connect(out);
      break;
    }
    case 'lofihat': {
      const dur = 0.02+P.len*0.15;
      const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=Math.min(9000, 4000*pf);
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=7800;
      const g = envGain(when, 0.002, dur, vel*0.26);
      noiseSrc(when, dur+0.03).connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
      break;
    }
    case 'rhodes': {   /* E-Piano: FM-Anschlag, der schnell wegschmilzt, plus Tremolo */
      const dur = 0.5+P.len*2.2;
      const car = osc('sine', f, when, dur+0.12);
      const mod = osc('sine', f*2, when, dur+0.12);
      const mg = actx.createGain();
      mg.gain.setValueAtTime(f*2.4, when);
      mg.gain.exponentialRampToValueAtTime(f*0.06, when+0.3);
      mod.connect(mg); mg.connect(car.frequency);
      const g = envGain(when, 0.006, dur, vel*0.4);
      const trem = actx.createGain(); trem.gain.value = 1;
      const lfo = actx.createOscillator(); lfo.frequency.value = 4.6;
      const lg = actx.createGain(); lg.gain.value = 0.14;
      lfo.connect(lg); lg.connect(trem.gain); lfo.start(when); lfo.stop(when+dur+0.12);
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2500;
      car.connect(g); g.connect(trem); trem.connect(lp); lp.connect(out);
      break;
    }
    case 'upright': {  /* Kontrabass mit Fingeranschlag */
      const dur = 0.28+P.len*0.9;
      const g = envGain(when, 0.012, dur, vel*0.72);
      const o1 = osc('sine', f, when, dur+0.12);
      const o2 = osc('triangle', f, when, dur+0.12); o2.detune.value = 5;
      const g2 = actx.createGain(); g2.gain.value = 0.26;
      o2.connect(g2); g2.connect(g); o1.connect(g);
      const lp = actx.createBiquadFilter(); lp.type='lowpass';
      lp.frequency.setValueAtTime(Math.min(f*7, 1400), when);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f*2, 90), when+dur*0.7);
      g.connect(lp); lp.connect(out);
      const ng = envGain(when, 0.001, 0.035, vel*0.13);
      const nbp = actx.createBiquadFilter(); nbp.type='bandpass'; nbp.frequency.value=1800; nbp.Q.value=1.2;
      noiseSrc(when, 0.05).connect(nbp); nbp.connect(ng); ng.connect(out);
      break;
    }
    case 'tape': {     /* Fläche, die leiert - langsames Wow, schnelleres Flattern */
      const dur = 1.2+P.len*3.2;
      const g = envGain(when, 0.3, dur, vel*0.22);
      const wow = actx.createOscillator(); wow.frequency.value = 0.7;
      const wowg = actx.createGain(); wowg.gain.value = 9;
      wow.connect(wowg); wow.start(when); wow.stop(when+dur+0.5);
      const flut = actx.createOscillator(); flut.frequency.value = 6.3;
      const flutg = actx.createGain(); flutg.gain.value = 3;
      flut.connect(flutg); flut.start(when); flut.stop(when+dur+0.5);
      [[-7,'sawtooth'],[0,'sawtooth'],[8,'triangle']].forEach(function(v){
        const o = osc(v[1], f, when, dur+0.5);
        o.detune.value = v[0];
        wowg.connect(o.detune); flutg.connect(o.detune);
        o.connect(g);
      });
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=1700; lp.Q.value=0.6;
      g.connect(lp); lp.connect(out);
      break;
    }
    /* ----- Streicher: fünf verstimmte Sägezähne, Bogenansatz, Korpus ----- */
    case 'strings': {
      const low = t.p.body === 'low';
      const dur = 0.6+P.len*2.6;
      const g = envGain(when, low?0.15:0.11, dur, vel*(low?0.3:0.22));
      const vib = actx.createOscillator(); vib.frequency.value = low?4.8:5.3;
      const vibg = actx.createGain();
      vibg.gain.setValueAtTime(0, when);                       /* Vibrato kommt erst nach dem Ansatz */
      vibg.gain.linearRampToValueAtTime(low?5:7, when+0.38);
      vib.connect(vibg); vib.start(when); vib.stop(when+dur+0.25);
      [-11,-5,0,6,12].forEach(function(d){
        const o = osc('sawtooth', f, when, dur+0.25);
        o.detune.value = d;
        vibg.connect(o.detune);
        o.connect(g);
      });
      const body1 = actx.createBiquadFilter(); body1.type='peaking';
      body1.frequency.value = low?185:420; body1.Q.value=1.1; body1.gain.value=5;
      const body2 = actx.createBiquadFilter(); body2.type='peaking';
      body2.frequency.value = low?520:1150; body2.Q.value=1.4; body2.gain.value=4;
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.7;
      lp.frequency.setValueAtTime(low?800:1400, when);
      lp.frequency.linearRampToValueAtTime(low?2100:4000, when+0.55);
      const ng = envGain(when, 0.06, 0.42, vel*0.05);          /* Bogenrauschen */
      const nbp = actx.createBiquadFilter(); nbp.type='bandpass'; nbp.frequency.value=2600; nbp.Q.value=0.8;
      noiseSrc(when, 0.5).connect(nbp); nbp.connect(ng); ng.connect(body1);
      g.connect(body1); body1.connect(body2); body2.connect(lp); lp.connect(out);
      break;
    }
    case 'pizz': {     /* gezupfte Saite, kurz und trocken */
      const dur = 0.10+P.len*0.35;
      const g = envGain(when, 0.002, dur, vel*0.48);
      const o1 = osc('triangle', f, when, dur+0.06);
      const o2 = osc('sawtooth', f, when, dur+0.06); o2.detune.value = 7;
      const g2 = actx.createGain(); g2.gain.value = 0.5;
      o2.connect(g2); g2.connect(g); o1.connect(g);
      const pk = actx.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=520; pk.Q.value=1.2; pk.gain.value=6;
      const lp = actx.createBiquadFilter(); lp.type='lowpass';
      lp.frequency.setValueAtTime(Math.min(f*11, 7000), when);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f*2.5, 200), when+dur);
      g.connect(pk); pk.connect(lp); lp.connect(out);
      const ng = envGain(when, 0.001, 0.02, vel*0.11);
      noiseSrc(when, 0.04).connect(ng); ng.connect(out);
      break;
    }
    /* ----- Western ----- */
    case 'twang': {    /* gezupfte Saite aus dem fertigen Puffer, Tonhoehe ueber die Abspielrate */
      const dur = 0.35+P.len*1.5;
      const src = actx.createBufferSource();
      src.buffer = pluckBuf(Math.min(1, P.len+0.3));
      src.playbackRate.value = Math.max(0.2, Math.min(6, f/220));
      const g = envGain(when, 0.003, dur, vel*0.85);
      const pk = actx.createBiquadFilter(); pk.type='peaking';
      pk.frequency.value = 240; pk.Q.value = 1.1; pk.gain.value = 4;
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.5;
      lp.frequency.value = Math.min(11000, Math.max(2200, f*18));
      src.connect(g); g.connect(pk); pk.connect(lp); lp.connect(out);
      src.start(when); src.stop(when+dur+0.1);
      break;
    }
    case 'trompete': {
      /* Die einsame Trompete Morriccones. Sie unterscheidet sich in drei
         Punkten von einem Rohrblatt ('blaeser'), und alle drei hoert man:

         1. Blech hat ALLE Teiltoene, nicht nur die ungeraden - also Saegezahn
            statt Rechteck. Deshalb klingt es offen statt hohl.
         2. Blech wird lauter HELLER. Der Trichter strahlt hohe Teiltoene erst
            ab, wenn kraeftig geblasen wird; darum haengt die Saettigung hier
            an der Anschlagstaerke. Ohne das klingt jede Trompete nach Orgel.
         3. Das Vibrato ist breit und kommt spaet - ein Trompeter setzt den Ton
            gerade an und faengt erst dann an zu beben. */
      const dur = 0.16 + P.len*1.5;
      const g = envGain(when, 0.02, dur, vel*0.24);
      const o1 = osc('sawtooth', f, when, dur+0.15);
      const o2 = osc('sawtooth', f, when, dur+0.15); o2.detune.value = 7;
      /* Ansatz von unten: ein Blaeser trifft den Ton nicht sofort */
      [o1,o2].forEach(function(o){
        o.frequency.setValueAtTime(f*0.94, when);
        o.frequency.exponentialRampToValueAtTime(f, when+Math.min(0.06, dur*0.2));
      });
      const vib = actx.createOscillator(); vib.type='sine'; vib.frequency.value = 5.2;
      const vg = actx.createGain();
      vg.gain.setValueAtTime(0, when);
      vg.gain.setValueAtTime(0, when+dur*0.28);
      vg.gain.linearRampToValueAtTime(22, when+dur*0.8);
      vib.connect(vg); vg.connect(o1.detune); vg.connect(o2.detune);
      vib.start(when); vib.stop(when+dur+0.15);
      /* Blech-Saettigung: mit der Anschlagstaerke wird sie staerker */
      const blech = actx.createWaveShaper();
      blech.curve = zerrKurve(0.06 + vel*0.16); blech.oversample = '2x';
      /* Trichterresonanz um 1200 Hz - fest, nicht mit der Tonhoehe wandernd */
      const trichter = actx.createBiquadFilter(); trichter.type='peaking';
      trichter.frequency.value = 1200; trichter.Q.value = 0.9; trichter.gain.value = 7;
      const glanz = actx.createBiquadFilter(); glanz.type='peaking';
      glanz.frequency.value = 2600; glanz.Q.value = 1.2; glanz.gain.value = 4;
      const lp = actx.createBiquadFilter(); lp.type='lowpass';
      lp.frequency.value = 2800 + P.tone*5200; lp.Q.value = 0.6;
      o1.connect(blech); o2.connect(blech);
      blech.connect(trichter); trichter.connect(glanz); glanz.connect(lp); lp.connect(g);
      /* Luft beim Ansetzen */
      const luft = actx.createBiquadFilter(); luft.type='bandpass';
      luft.frequency.value = Math.min(5000, f*4); luft.Q.value = 0.7;
      const lg = envGain(when, 0.005, 0.05, vel*0.07);
      noiseSrc(when, 0.09).connect(luft); luft.connect(lg); lg.connect(g);
      g.connect(out);
      break;
    }
    case 'blaeser': {
      /* Rohrblatt einer Swingband - Klarinette und Saxophon liegen dazwischen.
         'harmonica' war hier falsch: drei verstimmte Saegezaehne sind ein
         Akkordeon. Ein Rohrblatt klingt HOHL, weil in einer zylindrischen
         Roehre vor allem die ungeraden Teiltoene stehen. Genau das macht eine
         Rechteckwelle, und deshalb ist sie hier die richtige Grundlage.

         Drei Dinge trennen ein gespieltes Blasinstrument von einem Oszillator:
         die Tonhoehe wird von unten angefahren statt angesprungen, beim
         Ansetzen ist ein Luftgeraeusch zu hoeren, und das Vibrato kommt erst,
         wenn der Ton schon steht. */
      const dur = 0.14 + P.len*0.95;
      const g = envGain(when, 0.012, dur, vel*0.30);
      /* Anfahren von unten - ein Blaeser trifft den Ton nicht sofort */
      const scoop = Math.min(0.045, dur*0.18);
      const bauen = function(typ, pegel, teil){
        const o = osc(typ, f*teil, when, dur+0.12);
        o.frequency.setValueAtTime(f*teil*0.955, when);
        o.frequency.exponentialRampToValueAtTime(f*teil, when+scoop);
        const og = actx.createGain(); og.gain.value = pegel;
        o.connect(og); return {o:o, g:og};
      };
      const kern = bauen('square', 1, 1);        /* hohl, ungerade Teiltoene */
      const glanz = bauen('sawtooth', 0.28, 1);  /* etwas Glanz obendrauf    */
      /* Vibrato setzt erst ein, wenn der Ton steht */
      const vib = actx.createOscillator(); vib.type='sine'; vib.frequency.value = 5.6;
      const vg = actx.createGain();
      vg.gain.setValueAtTime(0, when);
      vg.gain.setValueAtTime(0, when+dur*0.35);
      vg.gain.linearRampToValueAtTime(13, when+dur*0.85);
      vib.connect(vg); vg.connect(kern.o.detune); vg.connect(glanz.o.detune);
      vib.start(when); vib.stop(when+dur+0.12);
      /* Roehrenresonanz: das Instrument hat einen festen Koerper, der nicht
         mit der Tonhoehe wandert - deshalb absolute Frequenzen, keine Teiler */
      const koerper = actx.createBiquadFilter(); koerper.type='bandpass';
      koerper.frequency.value = 1150; koerper.Q.value = 0.7;
      const glanzP = actx.createBiquadFilter(); glanzP.type='peaking';
      glanzP.frequency.value = 2650; glanzP.Q.value = 1.1; glanzP.gain.value = 5;
      const lp = actx.createBiquadFilter(); lp.type='lowpass';
      lp.frequency.value = 2600 + P.tone*4200; lp.Q.value = 0.6;
      kern.g.connect(koerper); glanz.g.connect(koerper);
      koerper.connect(glanzP); glanzP.connect(lp); lp.connect(g);
      /* Luft beim Ansetzen */
      const luft = actx.createBiquadFilter(); luft.type='bandpass';
      luft.frequency.value = Math.min(6000, f*4.5); luft.Q.value = 0.8;
      const lg = envGain(when, 0.004, 0.06, vel*0.09);
      noiseSrc(when, 0.10).connect(luft); luft.connect(lg); lg.connect(g);
      g.connect(out);
      break;
    }
    case 'harmonica': {
      const dur = 0.2+P.len*1.0;
      const g = envGain(when, 0.05, dur, vel*0.28);
      const vib = actx.createOscillator(); vib.frequency.value = 6.2;
      const vibg = actx.createGain();
      vibg.gain.setValueAtTime(0, when);
      vibg.gain.linearRampToValueAtTime(9, when+0.26);
      vib.connect(vibg); vib.start(when); vib.stop(when+dur+0.12);
      [0,-8,9].forEach(function(d){
        const o = osc('sawtooth', f, when, dur+0.12);
        o.detune.value = d; vibg.connect(o.detune); o.connect(g);
      });
      const o2 = osc('square', f*2, when, dur+0.12);
      const g2 = actx.createGain(); g2.gain.value = 0.16; o2.connect(g2); g2.connect(g);
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1500; bp.Q.value=0.9;
      const pk = actx.createBiquadFilter(); pk.type='peaking'; pk.frequency.value=2400; pk.Q.value=1.5; pk.gain.value=6;
      g.connect(bp); bp.connect(pk); pk.connect(out);
      break;
    }
    case 'whistle': {
      /* Gepfiffen wird mit dem Mundraum als Helmholtz-Resonator: das Ergebnis
         ist fast ein reiner Sinus, der zweite Teilton liegt 25-30 dB darunter.
         Mehr Obertoene machen es deshalb nicht echter, sondern zur Floete.
         Was ein Pfeifen ausmacht, passiert ZWISCHEN den Toenen:

         1. Ein Pfeifer springt nicht, er zieht. Die Tonhoehe gleitet vom
            vorigen Ton herueber - je groesser der Sprung, desto laenger.
         2. Der Ton steht nie ganz still. Ohne feine Unruhe im Pegel klingt
            es nach Testton.
         3. Das Vibrato kommt spaet und waechst, wie bei jeder Stimme. */
      const dur = 0.3+P.len*1.4;
      /* Nur binden, wenn der vorige Ton noch steht. Sonst zieht sich jede Note
         aus einer Tonhoehe herueber, die laengst verklungen ist - und aus dem
         Pfeifen wird ein Theremin. */
      const nahtlos = t.letztesEnde !== undefined && when < t.letztesEnde + 0.06;
      const vonF = (nahtlos && t.letzteFreq) ? t.letzteFreq : f*0.978;
      t.letzteFreq = f;
      t.letztesEnde = when + dur;
      const spanne = Math.abs(Math.log2(f/vonF))*12;                 /* Halbtoene */
      const zieh = nahtlos ? Math.min(0.09, 0.022 + spanne*0.009) : 0.030;
      const g = envGain(when, 0.055, dur, vel*0.34);
      const o = osc('sine', vonF, when, dur+0.12);
      o.frequency.setValueAtTime(vonF, when);
      o.frequency.exponentialRampToValueAtTime(f*1.003, when+zieh);   /* winzig darueber */
      o.frequency.exponentialRampToValueAtTime(f, when+zieh+0.05);    /* und zurueck */
      const vib = actx.createOscillator(); vib.frequency.value = 5.2;
      const vibg = actx.createGain();
      vibg.gain.setValueAtTime(0, when);
      vibg.gain.setValueAtTime(0, when+zieh+0.06);
      vibg.gain.linearRampToValueAtTime(7, when+zieh+0.40);
      vib.connect(vibg); vibg.connect(o.detune); vib.start(when); vib.stop(when+dur+0.12);
      /* Unruhe im Pegel: zwei unregelmaessige Schwingungen, viel zu schwach
         fuer ein Tremolo - man hoert sie nur als "lebendig". */
      const flatter = actx.createGain(); flatter.gain.value = 1;
      [[3.1, 0.022],[7.7, 0.014]].forEach(function(v){
        const lo = actx.createOscillator(); lo.frequency.value = v[0]*(0.85+Math.random()*0.3);
        const lg = actx.createGain(); lg.gain.value = v[1];
        lo.connect(lg); lg.connect(flatter.gain); lo.start(when); lo.stop(when+dur+0.12);
      });
      const o2 = osc('sine', f*2, when, dur+0.12);
      const g2 = actx.createGain(); g2.gain.value = 0.045; o2.connect(g2); g2.connect(g);
      /* Der Luftstrom, der den Ton traegt: vorne kurz mehr, dann zurueck */
      const ng = actx.createGain();
      ng.gain.setValueAtTime(0.0001, when);
      ng.gain.linearRampToValueAtTime(Math.max(vel*0.055, 0.0005), when+0.035);
      ng.gain.exponentialRampToValueAtTime(Math.max(vel*0.030, 0.0004), when+0.22);
      ng.gain.setValueAtTime(Math.max(vel*0.030, 0.0004), when+dur*0.7);
      ng.gain.exponentialRampToValueAtTime(0.0001, when+dur);
      const nbp = actx.createBiquadFilter(); nbp.type='bandpass';
      nbp.frequency.value=Math.min(12000, f*1.15); nbp.Q.value=1.6;
      noiseSrc(when, dur).connect(nbp); nbp.connect(ng); ng.connect(out);
      o.connect(g); g.connect(flatter); flatter.connect(out);
      break;
    }
    case 'woodblock': {
      const dur = 0.04+P.len*0.1;
      const g = envGain(when, 0.001, dur, vel*0.45);
      const o = osc('triangle', 880*pf, when, dur+0.04);
      o.frequency.exponentialRampToValueAtTime(480*pf, when+0.022);
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400*pf; bp.Q.value=2.4;
      const ng = envGain(when, 0.0005, 0.012, vel*0.35);
      noiseSrc(when, 0.02).connect(bp); bp.connect(ng); ng.connect(out);
      o.connect(g); g.connect(out);
      break;
    }
    case 'hufe': {
      /* Ein Huf auf trockenem Boden ist kein gestimmter Ton, ein Holzblock
         ist einer - daran hoert man das Spielzeug. Hier stattdessen drei
         Schichten ohne erkennbare Tonhoehe: der Aufschlag, ein kurzer
         dunkler Hohlraum, das Gewicht darunter.

         Wichtiger noch als der Klang ist die Streuung. Ein Pferd trifft das
         Raster nie, schlaegt nie zweimal gleich stark auf und nie zweimal
         auf denselben Boden. Exakt quantisiert bleibt es ein Metronom, egal
         wie gut die einzelne Schicht klingt. */
      const streu = Math.random()*2-1;
      const zeit  = when + streu*0.008;              /* +-8 ms */
      const hoehe = Math.pow(2, streu*0.12);         /* +-2 Halbtoene Boden */
      const kraft = vel*(0.78 + Math.random()*0.40);
      const dur = 0.05 + P.len*0.16;
      const nhp = actx.createBiquadFilter(); nhp.type='highpass'; nhp.frequency.value=190;
      const nlp = actx.createBiquadFilter(); nlp.type='lowpass';
      nlp.frequency.value = 2400*pf*hoehe; nlp.Q.value = 0.7;
      const ng = envGain(zeit, 0.0006, dur*0.4, kraft*0.62);
      noiseSrc(zeit, dur).connect(nhp); nhp.connect(nlp); nlp.connect(ng); ng.connect(out);
      const bp = actx.createBiquadFilter(); bp.type='bandpass';
      bp.frequency.value = 260*pf*hoehe; bp.Q.value = 2.4;
      const bg = envGain(zeit, 0.0012, dur, kraft*1.30);
      noiseSrc(zeit, dur+0.03).connect(bp); bp.connect(bg); bg.connect(out);
      const o = osc('sine', 185*pf*hoehe, zeit, dur+0.04);
      o.frequency.exponentialRampToValueAtTime(92*pf*hoehe, zeit+dur*0.55);
      const og = envGain(zeit, 0.001, dur*0.65, kraft*0.48);
      o.connect(og); og.connect(out);
      break;
    }
    case 'maultrommel': {
      /* Eine Maultrommel aendert ihre Tonhoehe NICHT. Die Metallzunge schwingt
         immer gleich schnell; was sich bewegt, ist der Mundraum, der mal
         diesen, mal jenen Teilton herausgreift. Deshalb steht hier ein fester
         tiefer Impulston, und die gespielte Note steuert nicht ihn, sondern
         das Ziel der Filterfahrt. Wer stattdessen den Grundton verstimmt,
         baut einen Synthesizer, keine Maultrommel. */
      const dur = 0.14 + P.len*0.55;
      const zunge = mtof(genre.root + t.p.oct + P.pitch);   /* ohne degree(h) - fest */
      const src = osc('sawtooth', zunge, when, dur+0.06);
      const g = envGain(when, 0.001, dur, vel*1.90);
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value = 6.5;
      bp.frequency.setValueAtTime(Math.min(6000, f*4.2), when);
      bp.frequency.exponentialRampToValueAtTime(Math.max(zunge*1.4, f*1.15), when+dur*0.8);
      const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value = zunge*0.9;
      src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out);
      /* Die Zunge selbst, ungefiltert und leise: der Resonator hebt Teiltoene
         heraus, aber er erzeugt sie nicht. Ohne diese Schicht verschwindet
         der Klang immer dann, wenn die Filterfahrt zwischen zwei Teiltoenen
         steht - und das ist die meiste Zeit. */
      const trocken = envGain(when, 0.001, dur*0.55, vel*0.20);
      const tlp = actx.createBiquadFilter(); tlp.type='lowpass';
      tlp.frequency.value = zunge*5; tlp.Q.value = 0.6;
      src.connect(tlp); tlp.connect(trocken); trocken.connect(out);
      /* Der Finger, der die Zunge anreisst */
      const kg = envGain(when, 0.0004, 0.012, vel*0.20);
      const kbp = actx.createBiquadFilter(); kbp.type='bandpass';
      kbp.frequency.value = 2600; kbp.Q.value = 1.4;
      noiseSrc(when, 0.03).connect(kbp); kbp.connect(kg); kg.connect(out);
      break;
    }
    case 'banjo': {
      /* Banjo statt allgemeiner Zupfsaite. Der Unterschied ist das Fell: die
         Stahlsaite laeuft ueber einen Steg auf gespanntes Leder. Das hebt
         einen schmalen Bereich um 380 Hz an - eine Eigenschaft des
         Instruments, nicht des Tons, deshalb steht die Frequenz fest und
         wandert nicht mit der Note. Und weil das Fell die Energie schnell
         abstrahlt, ist ein Banjo vorne sehr hell und sofort wieder weg. */
      const dur = 0.16 + P.len*0.55;
      const src = actx.createBufferSource();
      src.buffer = pluckBuf(1, f);
      const g = envGain(when, 0.002, dur, vel*0.62);
      const fell = actx.createBiquadFilter(); fell.type='peaking';
      fell.frequency.value = 380; fell.Q.value = 1.6; fell.gain.value = 7;
      const hp = actx.createBiquadFilter(); hp.type='highpass';
      hp.frequency.value = 120; hp.Q.value = 0.7;        /* Banjos haben keinen Bass */
      const glanz = actx.createBiquadFilter(); glanz.type='peaking';
      glanz.frequency.value = 2400; glanz.Q.value = 0.8; glanz.gain.value = 2.5;
      const oben = actx.createBiquadFilter(); oben.type='lowpass';
      oben.frequency.value = 5200; oben.Q.value = 0.5;
      src.connect(g); g.connect(fell); fell.connect(glanz); glanz.connect(oben);
      oben.connect(hp); hp.connect(out);
      src.start(when); src.stop(when+dur+0.1);
      /* Fingernagel auf Stahl */
      const kg = envGain(when, 0.0003, 0.008, vel*0.10);
      const khp = actx.createBiquadFilter(); khp.type='highpass'; khp.frequency.value = 3200;
      noiseSrc(when, 0.02).connect(khp); khp.connect(kg); kg.connect(out);
      break;
    }
    case 'glitch': {   /* kurze digitale Aussetzer - rhythmisch statt wischend */
      const dur = 0.03+P.len*0.12;
      const g = envGain(when, 0.0008, dur, vel*1.5);
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=2.6;
      const start = 900+((h*613)%2600);
      bp.frequency.setValueAtTime(start*pf, when);
      bp.frequency.setValueAtTime(start*0.5*pf, when+dur*0.5);
      noiseSrc(when, dur+0.03).connect(bp); bp.connect(g); g.connect(out);
      const o = osc('square', start*1.5*pf, when, dur);
      const og = envGain(when, 0.0005, dur*0.6, vel*0.28);
      o.connect(og); og.connect(out);
      break;
    }
    case 'modal': {    /* angeschlagenes Instrument aus seinen Eigenresonanzen */
      const M = MODALE[t.p.modell] || MODALE.marimba;
      const basis = 0.6 + P.len*2.6;
      const g = actx.createGain(); g.gain.value = vel*0.5;
      g.connect(out);
      M.verhaeltnis.forEach(function(v, i){
        const fq = f*v;
        if(fq > 17000) return;                       /* nichts Unhoerbares rechnen */
        const dauer = basis*M.abkling[i];
        const o = osc('sine', fq, when, dauer+0.05);
        /* leichtes Verstimmen macht den Klang lebendig statt steril */
        o.detune.value = (i%2 ? 4 : -3);
        const og = envGain(when, 0.002+i*0.001, dauer, M.staerke[i]);
        o.connect(og); og.connect(g);
      });
      /* der Schlaegel selbst: kurzer Anschlag, Holz dumpfer als Metall */
      const holz = M.anschlag === 'holz', filz = M.anschlag === 'filz';
      const ng = envGain(when, filz?0.004:0.0005, filz?0.05:(holz?0.012:0.02), vel*(filz?0.3:(holz?0.22:0.14)));
      const nbp = actx.createBiquadFilter(); nbp.type = filz ? 'lowpass' : 'bandpass';
      nbp.frequency.value = filz ? Math.min(900, f*3.5) : Math.min(9000, f*(holz?4:7));
      nbp.Q.value = filz ? 0.8 : (holz?1.4:2.2);
      noiseSrc(when, 0.04).connect(nbp); nbp.connect(ng); ng.connect(g);
      break;
    }
    case 'egitarre': {
      /* Signalweg wie in echt: Saiten -> Kompressor -> Zerre -> Box -> Huellkurve.
         Die Reihenfolge ist der ganze Punkt. Lag die Huellkurve vor der Zerre,
         steuerte die Lautstaerke den Verzerrungsgrad - der Notenanfang war
         uebersteuert, danach schlagartig sauber. Das klingt nach Effektgeraet,
         nicht nach Verstaerker.
         Und es sind mehrere Saiten: eine E-Gitarre in der Rhythmusrolle spielt
         einen Powerchord. Erst Grundton und Quinte gemeinsam durch dieselbe
         Saettigung ergeben die Mischprodukte, die man als Knurren hoert. */
      const dur = 0.25+P.len*1.3;
      const saiten = [ {v:1,    p:0},        /* Grundton  */
                       {v:1.5,  p:6},        /* Quinte    */
                       {v:2,    p:-5} ];     /* Oktave    */
      const eingang = actx.createGain(); eingang.gain.value = 0.5;
      saiten.forEach(function(st){
        const q = actx.createBufferSource();
        q.buffer = pluckBuf(Math.min(1, P.len+0.5), f*st.v);
        q.playbackRate.value = 1;
        if(q.detune) q.detune.value = st.p;   /* leicht gegeneinander, wie echte Saiten */
        const sg = actx.createGain(); sg.gain.value = st.v === 1 ? 1 : 0.62;
        q.connect(sg); sg.connect(eingang);
        q.start(when); q.stop(when+dur+0.1);
      });
      /* Kompressor: presst den Pegel flach, damit die Zerre ueber die ganze
         Note gleich stark arbeitet. Genau das laesst eine Gitarre tragen. */
      const presse = actx.createDynamicsCompressor();
      presse.threshold.value = -34; presse.knee.value = 6; presse.ratio.value = 12;
      presse.attack.value = 0.003; presse.release.value = 0.14;
      /* Hoehen vor der Zerre kappen: das nimmt die Schaerfe an der Wurzel */
      const zahm = actx.createBiquadFilter(); zahm.type='lowpass';
      zahm.frequency.value = Math.min(3800, Math.max(1400, f*10)); zahm.Q.value = 0.5;
      const zerre = actx.createWaveShaper();
      zerre.curve = zerrKurve(0.26 + P.tone*0.30);
      zerre.oversample = '4x';
      const hp = actx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=95; hp.Q.value=0.7;
      /* Mittensenke: ohne sie klingt die Zerre nach Pappe */
      const senke = actx.createBiquadFilter(); senke.type='peaking';
      senke.frequency.value=430; senke.Q.value=1.1; senke.gain.value=-4;
      /* Praesenz: das Beissende, das eine E-Gitarre ausmacht */
      const praesenz = actx.createBiquadFilter(); praesenz.type='peaking';
      praesenz.frequency.value=2900; praesenz.Q.value=1.2; praesenz.gain.value=5;
      const lp1 = actx.createBiquadFilter(); lp1.type='lowpass'; lp1.frequency.value=5200; lp1.Q.value=0.9;
      const lp2 = actx.createBiquadFilter(); lp2.type='lowpass'; lp2.frequency.value=6800; lp2.Q.value=0.5;
      /* Erst hier die Lautstaerkekurve - hinter der Box, wie ein Regler davor */
      const huelle = envGain(when, 0.003, dur, vel*0.5);
      eingang.connect(presse); presse.connect(zahm); zahm.connect(zerre); zerre.connect(hp);
      hp.connect(senke); senke.connect(praesenz); praesenz.connect(lp1);
      lp1.connect(lp2); lp2.connect(huelle); huelle.connect(out);
      /* Plektrum: kurzer Rauschklick vor dem Ton, an der Zerre vorbei */
      const kratz = actx.createBiquadFilter(); kratz.type='bandpass';
      kratz.frequency.value = 2600; kratz.Q.value = 0.9;
      const kg = envGain(when, 0.001, 0.020, vel*0.26);
      noiseSrc(when, 0.03).connect(kratz); kratz.connect(kg); kg.connect(lp1);
      break;
    }
    case 'supersaw': { /* Sieben gegeneinander verstimmte Saegezaehne. Die leichte
                          Verstimmung laesst die Stimmen gegeneinander schweben -
                          daher der breite, glitzernde Klang. */
      const dur = 0.18+P.len*1.1;
      const g = envGain(when, 0.014, dur, vel*0.17);
      /* Portamento wie beim Bass: das Lead rutscht in die naechste Note.
         Gleitende Leads sind ein Kernmerkmal des Genres - ohne das klingt
         selbst ein breiter Saegezahnstapel nach Tastatur statt nach Solo. */
      const gleit = t.p.glide || 0;
      const vonF = (gleit && t.letzteFreq) ? t.letzteFreq : 0;
      t.letzteFreq = f;
      [-24,-15,-7,0,7,15,24].forEach(function(cent){
        const o = osc('sawtooth', f, when, dur+0.1);
        o.detune.value = cent;
        if(vonF > 20){
          o.frequency.setValueAtTime(vonF, when);
          o.frequency.exponentialRampToValueAtTime(f, when+Math.min(gleit, dur*0.6));
        }
        o.connect(g);
      });
      const tief = osc('sawtooth', f/2, when, dur+0.1);   /* Fundament darunter */
      const tg = actx.createGain(); tg.gain.value = 0.34;
      tief.connect(tg); tg.connect(g);
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=1.4;
      lp.frequency.setValueAtTime(Math.min(11000, f*11), when);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f*2.5, 400), when+dur*0.9);
      g.connect(lp); lp.connect(out);
      break;
    }
    case 'bitcrush': {  /* absichtlich grob aufgeloest - das digitale Broeseln */
      const dur = 0.06+P.len*0.45;
      const stufen = 2 + Math.round(P.tone*9);
      const ws = actx.createWaveShaper();
      ws.curve = bitKurve(stufen);
      const o = osc('square', f, when, dur+0.05);
      const o2 = osc('sawtooth', f*1.005, when, dur+0.05);
      const g = envGain(when, 0.001, dur, vel*0.5);
      const nach = actx.createGain(); nach.gain.value = 0.5;
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=6000; lp.Q.value=0.7;
      o.connect(g); o2.connect(g);
      g.connect(ws); ws.connect(lp); lp.connect(nach); nach.connect(out);
      break;
    }
    case 'horn': {     /* Rueckfall, wenn keine Aufnahme hinterlegt ist: weiches
                          Blech aus wenigen Teiltoenen mit langsamem Ansatz. */
      const dur = 0.4+P.len*1.8;
      const g = envGain(when, 0.09, dur, vel*0.3);
      [[1,1],[2,0.5],[3,0.28],[4,0.14],[5,0.07]].forEach(function(v){
        const o = osc('sine', f*v[0], when, dur+0.15);
        const og = actx.createGain(); og.gain.value = v[1];
        o.connect(og); og.connect(g);
      });
      const vib = actx.createOscillator(); vib.frequency.value = 4.6;
      const vg = actx.createGain();
      vg.gain.setValueAtTime(0, when);
      vg.gain.linearRampToValueAtTime(4, when+0.45);
      vib.connect(vg); vib.start(when); vib.stop(when+dur+0.15);
      const lp = actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.8;
      lp.frequency.setValueAtTime(Math.min(2200, f*5), when);
      lp.frequency.linearRampToValueAtTime(Math.min(4200, f*9), when+0.5);
      g.connect(lp); lp.connect(out);
      break;
    }
    case 'chip': {
      /* Rechteckwelle wie in den Arcade-Automaten. Bewusst nicht 'gbpulse':
         dort wird die Lautstaerke auf 16 Stufen gerastert - eine Eigenart des
         Game Boy, die hier nichts zu suchen hat.
         Mit terz:true klingt eine zweite Stimme eine diatonische Terz darueber
         mit. Parallele Terzen sind das Erkennungszeichen der Melodien aus
         Mario und Sonic, und weil die Terz ueber die Tonleiter berechnet wird
         statt in festen Halbtoenen, bleibt sie immer in der Tonart. */
      const dur = 0.04 + P.len*0.5;
      const g = envGain(when, 0.002, dur, vel*0.52);
      const duty = t.p.duty || 0.5;
      const stimmen = [0];
      if(t.p.terz && typeof degree === 'function') stimmen.push(degree(h+2) - degree(h));
      stimmen.forEach(function(halb, i){
        const o = actx.createOscillator();
        o.setPeriodicWave(pulseWave(duty));
        const fz = f*Math.pow(2, halb/12);
        o.frequency.setValueAtTime(fz, when);
        /* sprung: mitten im Ton auf eine andere Stufe springen, ohne Gleiten.
           Genau daraus bestehen die kurzen Signale der Automaten - die Muenze
           ist ein Ton, der nach einem Wimpernschlag eine Quarte hoeher steht.
           Ein Glissando waere das Falsche: der Chip konnte gar nicht gleiten,
           er schrieb einen neuen Wert ins Frequenzregister. */
        if(t.p.sprung){
          const ab = when + dur*(t.p.sprung.ab === undefined ? 0.35 : t.p.sprung.ab);
          o.frequency.setValueAtTime(fz*Math.pow(2, t.p.sprung.ht/12), ab);
        }
        /* Vibrato setzt erst spaet ein - die alten Chips machten das per
           Software, und zwar nie sofort, sondern nach einem Moment. */
        if(t.p.vibrato){
          const lfo = actx.createOscillator(); lfo.frequency.value = 6.2;
          const lg = actx.createGain();
          lg.gain.setValueAtTime(0, when);
          lg.gain.linearRampToValueAtTime(10, when+dur*0.6);
          lfo.connect(lg); lg.connect(o.detune);
          lfo.start(when); lfo.stop(when+dur+0.05);
        }
        const vg = actx.createGain(); vg.gain.value = i ? 0.55 : 1;
        o.connect(vg); vg.connect(g);
        o.start(when); o.stop(when+dur+0.05);
      });
      g.connect(out);
      break;
    }
    case 'orgel': {
      /* Pfeifenorgel, additiv aus Registern gebaut - genau so entsteht der
         Klang auch in echt: mehrere Pfeifenreihen in festen Verhaeltnissen
         zum gespielten Ton, die gemeinsam angeblasen werden. Die Fusszahlen
         sind die ueblichen: 16' klingt eine Oktave tiefer, 8' ist der Ton
         selbst, 5 1/3' die Quinte darueber, 4' die Oktave, und so fort.
         Zwei Dinge machen den Unterschied zu einem Synthesizer-Akkord:
         der Ton steht voellig gerade, solange die Taste liegt (keine
         Abklingkurve), und beim Ansprechen zischt die Pfeife kurz. */
      const dur = 0.12 + P.len*1.6;
      const register = [
        {fuss: 0.5,  pegel: 0.55},   /* 16'    */
        {fuss: 1,    pegel: 1.00},   /* 8'     */
        {fuss: 1.5,  pegel: 0.32},   /* 5 1/3' */
        {fuss: 2,    pegel: 0.62},   /* 4'     */
        {fuss: 3,    pegel: 0.24},   /* 2 2/3' */
        {fuss: 4,    pegel: 0.34},   /* 2'     */
        {fuss: 8,    pegel: 0.11}    /* 1'     */
      ];
      /* Eigene Huellkurve statt envGain: eine Orgel klingt nicht ab. */
      const g = actx.createGain();
      const spitze = Math.max(vel*0.20, 0.0004);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(spitze, when+0.022);
      g.gain.setValueAtTime(spitze, when+dur);
      g.gain.linearRampToValueAtTime(0.0001, when+dur+0.07);
      /* Tremulant: das langsame Schweben, das jede Kirchenorgel hat */
      const trem = actx.createGain(); trem.gain.value = 1;
      const lfo = actx.createOscillator(); lfo.type='sine'; lfo.frequency.value = 4.6;
      const lg = actx.createGain(); lg.gain.value = 0.07;
      lfo.connect(lg); lg.connect(trem.gain);
      lfo.start(when); lfo.stop(when+dur+0.1);
      register.forEach(function(r){
        const ff = f*r.fuss;
        if(ff > 16000) return;
        const o = osc('sine', ff, when, dur+0.12);
        const og = actx.createGain(); og.gain.value = r.pegel;
        o.connect(og); og.connect(trem);
      });
      /* Anblasgeraeusch: kurzes Zischen, wenn die Pfeife anspricht */
      const chiff = actx.createBiquadFilter(); chiff.type='bandpass';
      chiff.frequency.value = Math.min(9000, f*6); chiff.Q.value = 1.4;
      const cg = envGain(when, 0.002, 0.05, vel*0.10);
      noiseSrc(when, 0.08).connect(chiff); chiff.connect(cg); cg.connect(trem);
      trem.connect(g); g.connect(out);
      break;
    }
    case 'theremin': {
      /* Der heulende Sinus aus jedem alten Gruselfilm. Drei Dinge machen ihn:
         die Tonhoehe wird nie angesprungen sondern angefahren, das Vibrato
         setzt erst nach einem Moment ein und wird breiter, und die
         Lautstaerke schwillt an statt einzusetzen - es gibt keinen Anschlag,
         weil nichts angeschlagen wird. */
      const dur = 0.35 + P.len*1.7;
      const vonF = t.letzteFreq || f*0.72;
      t.letzteFreq = f;
      const o = osc('sine', f, when, dur+0.2);
      o.frequency.setValueAtTime(vonF, when);
      o.frequency.exponentialRampToValueAtTime(f, when+Math.min(0.22, dur*0.35));
      /* eine leise Oktave darueber gibt dem Sinus etwas Koerper */
      const o2 = osc('sine', f*2, when, dur+0.2);
      o2.frequency.setValueAtTime(vonF*2, when);
      o2.frequency.exponentialRampToValueAtTime(f*2, when+Math.min(0.22, dur*0.35));
      const g2 = actx.createGain(); g2.gain.value = 0.16;
      const vib = actx.createOscillator(); vib.type='sine'; vib.frequency.value = 5.4;
      const vg = actx.createGain();
      vg.gain.setValueAtTime(0, when);
      vg.gain.linearRampToValueAtTime(34, when+dur*0.7);
      vib.connect(vg); vg.connect(o.detune); vg.connect(o2.detune);
      vib.start(when); vib.stop(when+dur+0.2);
      const g = actx.createGain();
      const spitze = Math.max(vel*0.26, 0.0004);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(spitze, when+dur*0.28);
      g.gain.setValueAtTime(spitze, when+dur*0.75);
      g.gain.linearRampToValueAtTime(0.0001, when+dur+0.12);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
      break;
    }
    case 'regen': {
      /* Echter Regen statt Glockenspiel. Regen besteht aus zwei Schichten, die
         das Ohr getrennt wahrnimmt: einem breitbandigen Rauschteppich (das
         Flaechige) und einzelnen Tropfen, die auf etwas auftreffen. Nur
         zusammen klingt es nach Regen - Rauschen allein ist Wind, Tropfen
         allein sind Wassertropfen aus einem Hahn.
         Bewusst unabhaengig von der Tonhoehe: Regen hat keine Tonart. Die
         Stufe steuert stattdessen, wie dicht es schuettet. */
      const dur = 0.5 + P.len*2.4;
      const dichte = 6 + h*4;                      /* Tropfen pro Sekunde */
      const g = envGain(when, 0.4, dur, vel*0.16);
      /* Teppich: Rauschen, unten und oben beschnitten */
      const hp = actx.createBiquadFilter(); hp.type='highpass';
      hp.frequency.value = 900; hp.Q.value = 0.5;
      const lp = actx.createBiquadFilter(); lp.type='lowpass';
      lp.frequency.value = 2200 + P.tone*6000; lp.Q.value = 0.4;
      const tg = actx.createGain(); tg.gain.value = 0.72;
      noiseSrc(when, dur+0.3).connect(hp); hp.connect(lp); lp.connect(tg); tg.connect(g);
      /* Einzelne Tropfen: sehr kurze, schmalbandige Klicks in zufaelligen
         Abstaenden und Hoehen. Die Streuung ist der ganze Punkt - gleichmaessig
         verteilt klingt es nach Maschine. */
      const anzahl = Math.min(48, Math.round(dur*dichte));
      for(let i=0;i<anzahl;i++){
        const t0 = when + Math.random()*dur;
        const bp = actx.createBiquadFilter(); bp.type='bandpass';
        bp.frequency.value = 1800 + Math.random()*3600;
        /* niedrige Guete: hohe wuerde jeden Tropfen zu einem gestimmten Blip
           machen. Ein Wassertropfen ist breitbandig und sehr kurz. */
        bp.Q.value = 1.1 + Math.random()*1.6;
        const laut = (0.15 + Math.random()*0.55) * vel * 0.09;
        const tgain = envGain(t0, 0.0006, 0.006 + Math.random()*0.014, laut);
        noiseSrc(t0, 0.06).connect(bp); bp.connect(tgain); tgain.connect(g);
      }
      g.connect(out);
      break;
    }
    case 'gbpulse': {   /* CH1 / CH2 */
      const dur = 0.05 + P.len*0.55;
      const g = envGain(when, 0.002, dur, gbVol(vel*0.72));
      const o = actx.createOscillator();
      o.setPeriodicWave(pulseWave(t.p.duty || 0.5));
      o.frequency.setValueAtTime(f, when);
      o.start(when); o.stop(when+dur+0.05);
      o.connect(g); g.connect(out);
      break;
    }
    case 'gbkick': {
      duckeBeimKick(when);    /* Kick per Pulskanal mit Abwärts-Sweep, wie im Tracker */
      const dur = 0.09 + P.len*0.24;
      const g = envGain(when, 0.001, dur, gbVol(vel*0.95));
      const o = actx.createOscillator();
      o.setPeriodicWave(pulseWave(0.5));
      o.frequency.setValueAtTime(440*pf, when);
      o.frequency.exponentialRampToValueAtTime(52*pf, when+dur*0.55);
      o.start(when); o.stop(when+dur+0.05);
      o.connect(g); g.connect(out);
      break;
    }
    case 'gbwave': {    /* CH3: 32-Stufen-Wellenspeicher, geloopt */
      const dur = 0.08 + P.len*1.3;
      const s = actx.createBufferSource();
      s.buffer = waveBuf(t.p.wave || 'bass');
      s.loop = true;
      s.playbackRate.value = f*32/actx.sampleRate;
      const g = envGain(when, 0.004, dur, gbVol(vel*0.85));
      s.start(when); s.stop(when+dur+0.05);
      s.connect(g); g.connect(out);
      break;
    }
    case 'gbnoise': {   /* CH4: die Höhe ist hier die Rauschfarbe, nicht die Lautstärke */
      const step = h;
      const dur = (0.05 + P.len*0.45) / (0.55 + step*0.17);
      const s = actx.createBufferSource();
      s.buffer = lfsrBuf(!!t.p.shortLfsr);
      s.playbackRate.value = Math.pow(2, (step-3)*0.62)*pf;
      const lp = actx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = Math.min(16000, 380*Math.pow(2, step*0.66));
      const g = envGain(when, 0.001, dur, gbVol(step < 3 ? 0.95 : 0.7));
      s.start(when, Math.random()*0.4); s.stop(when+dur+0.05);
      s.connect(lp); lp.connect(g); g.connect(out);
      break;
    }
    default: { /* fx */
      const dur = 0.35+P.len*1.5;
      const bp = actx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=3.5;
      bp.frequency.setValueAtTime(280*pf, when);
      bp.frequency.exponentialRampToValueAtTime(Math.min(16000, 5200*pf), when+dur);
      const g = envGain(when, 0.02, dur, vel*0.45);
      noiseSrc(when, dur+0.06).connect(bp); bp.connect(g); g.connect(out);
      const o = osc('sawtooth', mtof(genre.root+P.pitch+12), when, dur);
      o.frequency.exponentialRampToValueAtTime(mtof(genre.root+P.pitch+34), when+dur*0.9);
      const og = envGain(when, 0.06, dur*0.8, vel*0.12);
      o.connect(og); og.connect(out);
    }
  }
  t.hitAt = when;
}
