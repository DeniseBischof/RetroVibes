/* ---------- Optionale Klangdateien ----------
   Retrovibes klingt ohne jede Datei vollstaendig - alles wird gerechnet.
   Wer echte Aufnahmen einsetzen will, legt sie unter audio/ ab und traegt
   sie in audio/manifest.json ein. Fehlt das Manifest oder eine Datei, faellt
   alles still auf die synthetische Fassung zurueck. Nichts blockiert den
   Start: geladen wird im Hintergrund, sobald eine Welt geoeffnet wird.

   Bewusst getrennt gehalten, damit das Projekt auch als reine Codebasis
   ohne Audiodaten lauffaehig bleibt. */

const SAMPLE_BASIS = 'audio/';
let sampleManifest = null;         /* null = noch nicht geladen, {} = nichts vorhanden */
const rohDaten = {};               /* id -> ArrayBuffer, einmal geladen */
const dekodiert = new WeakMap();   /* AudioContext -> {id: AudioBuffer} */
let irGeladen = null;              /* ArrayBuffer der Impulsantwort */

function sampleSpeicher(){
  let s = dekodiert.get(actx);
  if(!s){ s = {}; dekodiert.set(actx, s); }
  return s;
}

/* Manifest einlesen. Fehlt es, bleibt alles synthetisch - das ist der Normalfall. */
/* Warum das Laden schiefging - null heisst: kein Problem aufgetreten.
   Wird gebraucht, weil ein stilles Zurueckfallen auf die Synthese sonst
   wie ein Klangfehler aussieht und nicht wie eine fehlende Datei. */
let sampleGrund = null;

async function ladeManifest(){
  if(sampleManifest !== null) return sampleManifest;
  sampleManifest = {};
  /* Ueber file:// blockiert der Browser jedes fetch. Dann laedt keine einzige
     Aufnahme, und alles klingt synthetisch - ohne dass irgendwo etwas steht.
     Genau das vorher abfangen, statt es im catch zu verschlucken. */
  if(location.protocol === 'file:'){
    sampleGrund = 'file';
    return sampleManifest;
  }
  try{
    const antwort = await fetch(SAMPLE_BASIS + 'manifest.json', {cache:'no-cache'});
    if(!antwort.ok){ sampleGrund = 'fehlt'; return sampleManifest; }
    const daten = await antwort.json();
    if(daten && typeof daten === 'object') sampleManifest = daten;
  }catch(e){ sampleGrund = 'fehler'; }
  return sampleManifest;
}

/* Kurzer Klartext fuer die Hinweiszeile, oder null wenn alles in Ordnung ist. */
function sampleHinweis(){
  if(sampleGrund === 'file')
    return 'Die Seite laeuft als Datei im Browser. Aufnahmen (Cello, Streicher, Chor, '
         + 'Klavier, Schlagzeug) koennen so nicht geladen werden - alles klingt '
         + 'synthetisch. Ueber einen lokalen Server geoeffnet klingt es richtig.';
  if(sampleGrund === 'fehlt')  return 'audio/manifest.json wurde nicht gefunden - alle Figuren klingen synthetisch.';
  if(sampleGrund === 'fehler') return 'Die Aufnahmen konnten nicht geladen werden - alle Figuren klingen synthetisch.';
  return null;
}

/* Die Aufnahmen liegen bewusst im Cache - sie aendern sich fast nie, und ohne
   das laedt jede Welt sie erneut. Genau deshalb erreicht eine ERSETZTE Aufnahme
   den Browser aber nie: er hat sie schon. Darum haengt die Nummer aus dem
   Manifest an der Adresse. Das Manifest selbst wird mit no-cache geholt, ist
   also immer aktuell - wer eine Datei austauscht, zaehlt dort `v` hoch, so wie
   in index.html bei den Skripten. */
function sampleVersion(){
  const v = sampleManifest && sampleManifest.v;
  return v === undefined || v === null ? '' : '?v=' + v;
}
async function ladeRoh(pfad, id){
  if(rohDaten[id]) return rohDaten[id];
  try{
    const antwort = await fetch(SAMPLE_BASIS + pfad + sampleVersion(), {cache:'force-cache'});
    if(!antwort.ok) return null;
    rohDaten[id] = await antwort.arrayBuffer();
    return rohDaten[id];
  }catch(e){ return null; }
}

/* Rueckwaerts. Der Ton waechst, statt anzuschlagen - das Ohr liest das sofort
   als "falsch herum", weil in der Natur nichts so beginnt. Umgedreht wird der
   fertige Puffer, nicht die Datei: dieselbe Aufnahme kann in einer Welt
   vorwaerts und in der naechsten rueckwaerts stehen, ohne zweimal zu laden.
   Gemerkt am Quellpuffer selbst, der haengt schon am richtigen Kontext. */
const umgedreht = new WeakMap();
function rueckBuffer(buf){
  const fertig = umgedreht.get(buf);
  if(fertig) return fertig;
  const neu = actx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  for(let c=0;c<buf.numberOfChannels;c++){
    const quelle = buf.getChannelData(c), ziel = neu.getChannelData(c);
    for(let i=0, n=buf.length; i<n; i++) ziel[i] = quelle[n-1-i];
  }
  umgedreht.set(buf, neu);
  return neu;
}

/* Dekodieren pro AudioContext: der Export rendert in einem eigenen Kontext,
   und ein AudioBuffer gehoert immer zu genau einem. */
/* Laufende Dekodierungen je Kontext, als Promise. Wer auf einen Puffer
   warten will, haengt sich an das laufende Versprechen, statt dieselbe
   Datei ein zweites Mal zu entschluesseln - das passierte vorher beim
   Export kurz nach dem Oeffnen einer Welt: rund 60 MB zweimal. */
const dekodierLauf = new WeakMap();   /* AudioContext -> {id: Promise} */
function laufSpeicher(){
  let l = dekodierLauf.get(actx);
  if(!l){ l = {}; dekodierLauf.set(actx, l); }
  return l;
}
/* 'laeuft' = wird gerade entschluesselt, 'kaputt' = ging nicht. Beides
   sind Platzhalter, kein Klang - und 'kaputt' wird nicht bei jedem Ton
   erneut versucht. */
function bufferFertig(da){ return !!da && typeof da !== 'string'; }
function dekodiere(id){
  const s = sampleSpeicher(), l = laufSpeicher();
  if(l[id]) return l[id];
  const roh = rohDaten[id];
  if(!roh) return Promise.resolve(null);
  s[id] = 'laeuft';
  const p = new Promise(function(fertig){
    try{
      /* `slice(0)` ist noetig: decodeAudioData nimmt den Puffer in
         Besitz, und ein zweites Entschluesseln (neuer Kontext nach einer
         Unterbrechung) braucht das Original noch. Gemessen kostet das
         3 MB - die bleiben bewusst liegen, waehrend die 60 MB
         entschluesselter Klangdaten das eigentliche Gewicht sind. */
      actx.decodeAudioData(roh.slice(0),
        function(buf){ s[id] = buf; fertig(buf); },
        function(){ s[id] = 'kaputt'; fertig(null); });
    }catch(e){ s[id] = 'kaputt'; fertig(null); }
  }).then(function(buf){ delete l[id]; return buf; });
  l[id] = p;
  return p;
}
function holeBuffer(id){
  const s = sampleSpeicher();
  const da = s[id];
  /* nur fertige Buffer herausgeben */
  if(bufferFertig(da)) return da;
  if(typeof da === 'string') return null;
  if(!rohDaten[id]) return null;
  dekodiere(id);
  return null;                     /* beim ersten Mal noch nicht fertig - dann Synthese */
}
/* Auf einen einzelnen Puffer warten: fertiger Puffer oder null. */
function wartenAufBuffer(id){
  const da = sampleSpeicher()[id];
  if(bufferFertig(da)) return Promise.resolve(da);
  if(da === 'kaputt') return Promise.resolve(null);
  return dekodiere(id);
}

/* Alle vorhandenen Aufnahmen im AKTUELLEN Kontext dekodieren und darauf warten.
   Der Export rendert in einem eigenen Kontext; ohne dieses Warten waeren die
   Aufnahmen dort noch nicht fertig und die Datei klaenge anders als die
   Wiedergabe. */
function bereiteSamplesVor(){
  if(!sampleManifest) return Promise.resolve();
  const s = sampleSpeicher();
  const offen = Object.keys(rohDaten).filter(function(id){
    return !bufferFertig(s[id]) && s[id] !== 'kaputt';
  });
  if(!offen.length) return Promise.resolve();
  return Promise.all(offen.map(dekodiere)).then(function(){ delete s.__irLang__; });
}

/* Die entschluesselten Aufnahmen gehoeren dem Klangkontext, in dem sie
   entstanden sind. Muss der neu gebaut werden (siehe baueAudioNeu), sind
   sie wertlos - dann leeren, damit sie im neuen Kontext neu entstehen. */
function leereSampleSpeicher(){
  const s = sampleSpeicher();
  for(const k in s) delete s[k];
}

/* ---------- Instrumente ---------- */
/* Ein Eintrag sieht so aus:
   "piano": { "dateien": [ {"note": 48, "datei": "piano/c3.wav"}, ... ] }
   note = MIDI-Nummer, in der die Aufnahme klingt. Dazwischen wird die
   naechstgelegene Aufnahme in der Abspielrate verschoben. */
function sampleFuer(name, midi){
  const m = sampleManifest && sampleManifest.instrumente && sampleManifest.instrumente[name];
  if(!m || !m.dateien || !m.dateien.length) return null;
  let beste = m.dateien[0], abstand = Math.abs((beste.note || 60) - midi);
  for(let i=1;i<m.dateien.length;i++){
    const d = Math.abs((m.dateien[i].note || 60) - midi);
    if(d < abstand){ abstand = d; beste = m.dateien[i]; }
  }
  const id = name + '/' + beste.datei;
  const buf = holeBuffer(id);
  if(!buf) return null;
  return {buffer: buf, rate: Math.pow(2, (midi - (beste.note || 60))/12), loop: !!m.loop,
          attack: m.attack || 0.004, gehalten: !!m.gehalten,
          /* 0 = die Aufnahme wird genau einmal gespielt, >0 = zusaetzlich eine
             zweite Schicht aus einer spaeteren Stelle derselben Aufnahme.
             Vorsicht: zwei verstimmte Kopien desselben Klangs sind ein Chorus.
             Auf gestrichenen Instrumenten klingt das nach Streichersynthesizer,
             nicht nach Ensemble - deshalb standardmaessig aus. */
          breite: m.breite === undefined ? 0 : m.breite};
}

/* Aufeinanderfolgende Noten greifen reihum an leicht verschiedenen Stellen in
   die Aufnahme und werden minimal gegeneinander verstimmt. Ohne das spielt
   jede Note exakt denselben Puffer phasengleich ab. Zwei davon nebeneinander
   ergeben einen Kammfilter - und genau den hoert man als "synthetisch",
   selbst wenn die Aufnahme echt ist. */
const SAMPLE_VERSATZ = [0, 0.041, 0.017, 0.062];
const SAMPLE_CENT    = [0, 6, -5, 3];

/* Wird von trigger() zuerst gefragt. Gibt true zurueck, wenn eine Aufnahme
   gespielt wurde - dann ueberspringt der Klangerzeuger die Synthese. */
function spieleSample(t, when, h, ziel, lautstaerke, dauer, midi){
  const name = t.p.sample;
  if(!name || !sampleManifest || !sampleManifest.instrumente) return false;
  /* dehnen: die Aufnahme bewusst aus einer HOEHEREN Lage holen und dafuer
     langsamer abspielen. Klingt am Ende auf derselben Tonhoehe, aber jede
     Resonanz des Instruments wandert mit nach unten und jeder Ton wird
     laenger - aus einer hellen Stahlsaite wird eine dunkle Darmsaite.
     Angabe in Halbtoenen. Ohne das greift bei dichten Aufnahmen fast immer
     die passgenaue Datei, und dann klingt es exakt nach dem aufgenommenen
     Instrument - was manchmal genau das Falsche ist. */
  const dehnen = t.p.dehnen || 0;
  const treffer = sampleFuer(name, midi + dehnen);
  if(!treffer) return false;
  if(dehnen) treffer.rate *= Math.pow(2, -dehnen/12);
  const laut = Math.max(lautstaerke, 0.0004);
  const rueck = !!t.p.rueckwaerts;
  if(rueck) treffer.buffer = rueckBuffer(treffer.buffer);
  const gehalten = treffer.gehalten;
  /* Gehaltene Toene klingen etwas ueber die Note hinaus. Hier stand einmal
     1.6 - damit lagen zwei Noten ueber eine halbe Sekunde uebereinander. */
  const laenge = gehalten ? dauer*1.18 : dauer;
  const ausblenden = gehalten ? Math.min(0.50, laenge*0.38) : Math.min(0.10, laenge*0.3);
  /* Wieviel Aufnahme bleibt hinter der Note uebrig? Nur so weit darf eine
     Schicht hineingreifen, sonst laeuft der Puffer mitten im Ton aus.
     Die Abspielrate zaehlt mit: langsamer abgespielt reicht sie weiter. */
  const rest = Math.max(0, treffer.buffer.duration - treffer.rate*(laenge + 0.08));
  const rr = t.rrSample = ((t.rrSample | 0) + 1) % SAMPLE_VERSATZ.length;

  function schicht(versatz, cent, pegel, ansatz, verzug){
    const q = actx.createBufferSource();
    q.buffer = treffer.buffer;
    q.loop = treffer.loop;
    if(q.detune) { q.playbackRate.value = treffer.rate; q.detune.value = cent; }
    else q.playbackRate.value = treffer.rate*Math.pow(2, cent/1200);
    const g = actx.createGain();
    const start = when + verzug;
    const halte = start + Math.max(laenge - verzug - ausblenden, ansatz + 0.01);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(laut*pegel, start + ansatz);
    g.gain.setValueAtTime(laut*pegel, halte);
    /* Der Bogen wird abgehoben, nicht abgeschnitten: erst langsam, dann
       schneller. Eine gerade Rampe mitten durchs Vibrato hoert man als Schnitt. */
    g.gain.setTargetAtTime(0.0001, halte, Math.max(ausblenden/3.5, 0.02));
    g.gain.linearRampToValueAtTime(0.0001, when + laenge + 0.05);
    q.connect(g); g.connect(einspeisung);
    /* Vorwaerts wird an einer leicht versetzten Stelle eingestiegen, damit
       zwei gleiche Noten nicht deckungsgleich sind. Rueckwaerts gibt es diese
       Freiheit nicht: der Einstieg muss so liegen, dass die Note GENAU auf dem
       umgedrehten Anschlag endet - sonst schwillt sie an und bricht vorher ab,
       und der ganze Sinn ist weg. */
    q.start(start, rueck
      ? Math.max(0, treffer.buffer.duration - laenge*treffer.rate)
      : Math.min(versatz, rest));
    q.stop(when + laenge + 0.09);
  }

  /* Optionale Verzerrung fuer Aufnahmen. Der Chor im Cyberpunk soll nicht
     sauber klingen, sondern wie durch einen uebersteuerten Verstaerker. Die
     Kette haengt an der Spur und wird nur einmal gebaut - pro Note waeren es
     sonst drei zusaetzliche Knoten. */
  let einspeisung = ziel;
  if(t.p.verzerrung > 0 && typeof zerrKurve === 'function'){
    if(!t.zerrKette || t.zerrKette.ziel !== ziel || t.zerrKette.staerke !== t.p.verzerrung){
      /* Parallel, nicht in Reihe. Schickt man eine Aufnahme vollstaendig durch
         die Saettigung, bleibt vom Chor nur noch ein Droehnen uebrig - das
         klingt bedrohlich statt angeschmutzt. Hier laeuft das Original weiter
         und bekommt nur eine verzerrte Schicht beigemischt. */
      const mix = Math.min(1, t.p.verzerrung);
      const ein = actx.createGain();
      const trocken = actx.createGain(); trocken.gain.value = 1 - mix*0.45;
      const zahm = actx.createBiquadFilter(); zahm.type='lowpass';
      zahm.frequency.value = 3600; zahm.Q.value = 0.6;
      const former = actx.createWaveShaper();
      /* Die Kurve bewusst milder als der Mischanteil: die Kante soll aus der
         Beimischung kommen, nicht aus brutaler Saettigung. */
      former.curve = zerrKurve(0.10 + mix*0.30); former.oversample = '4x';
      /* Nach der Saettigung das Tieffrequente kappen, sonst matscht es */
      const hp = actx.createBiquadFilter(); hp.type='highpass';
      hp.frequency.value = 200; hp.Q.value = 0.7;
      const nass = actx.createGain(); nass.gain.value = mix*0.6;
      ein.connect(trocken); trocken.connect(ziel);
      ein.connect(zahm); zahm.connect(former); former.connect(hp);
      hp.connect(nass); nass.connect(ziel);
      t.zerrKette = {ein: ein, ziel: ziel, staerke: t.p.verzerrung};
    }
    einspeisung = t.zerrKette.ein;
  }

  /* Senke: eine schmale Absenkung an einer festen Frequenz.

     Gegen die eine Stelle, an der eine Aufnahme sticht. Nicht zu verwechseln
     mit `tone` - das ist ein Tiefpass und nimmt alles OBERHALB der
     Grenzfrequenz weg. Sitzt der Stachel darunter, entfernt der Tiefpass
     genau das Falsche: die Luft geht, der Schmerz bleibt, und es klingt
     dumpf statt angenehm. So gemessen bei der Mundharmonika, deren
     gehoerbezogen lauteste Stelle bei 1,6-2 kHz liegt.

     Angabe: {hz, db, q}. Zu finden ueber eine A-bewertete Terzbandanalyse
     der Aufnahme - nicht ueber den Rohpegel, denn nach Effektivwert faellt
     genau diese Stelle nicht auf. */
  if(t.p.senke){
    if(!t.senkKette || t.senkKette.ziel !== einspeisung){
      const s = t.p.senke;
      const pk = actx.createBiquadFilter();
      pk.type = 'peaking';
      pk.frequency.value = s.hz || 1800;
      pk.Q.value = s.q || 1.2;
      pk.gain.value = s.db === undefined ? -6 : s.db;
      pk.connect(einspeisung);
      t.senkKette = {ein: pk, ziel: einspeisung};
    }
    einspeisung = t.senkKette.ein;
  }

  /* Tremolo. Nicht zu verwechseln mit Vibrato: hier schwankt die LAUTSTAERKE,
     nicht die Tonhoehe. Jeder Gitarrenverstaerker der Sechziger hatte den
     Schalter, und Morricones Westerngitarre steht und faellt damit - ohne ihn
     ist es eine Gitarre, mit ihm ist es die Weite. Die Geschwindigkeit haengt
     am Tempo, sonst laeuft das Flackern gegen den Takt.
     Einmal pro Spur gebaut: pro Note waeren es ein Oszillator und zwei
     Verstaerker mehr, und der Oszillator liefe danach ewig weiter. */
  if(t.p.tremolo > 0){
    if(!t.tremKette || t.tremKette.ziel !== einspeisung){
      if(t.tremKette && t.tremKette.lfo){ try{ t.tremKette.lfo.stop(); }catch(e){} }
      const tiefe = Math.min(0.9, t.p.tremolo);
      const vg = actx.createGain();
      vg.gain.value = 1 - tiefe/2;
      const lfo = actx.createOscillator();
      lfo.frequency.value = (typeof bpm === 'number' ? bpm : 100)/60*2;   /* zwei je Schlag */
      const lg = actx.createGain(); lg.gain.value = tiefe/2;
      lfo.connect(lg); lg.connect(vg.gain);
      lfo.start();
      vg.connect(einspeisung);
      t.tremKette = {ein: vg, ziel: einspeisung, lfo: lfo};
    }
    einspeisung = t.tremKette.ein;
  }

  /* Der Ansatz steht im Manifest bei der Aufnahme - das ist die Eigenschaft
     des Instruments. Eine einzelne Figur darf ihn trotzdem verlaengern: ein
     Horn, das eine Flaeche traegt, muss weicher hereinkommen als eines, das
     einen Ruf setzt, obwohl beide dieselbe Aufnahme benutzen. Verkuerzen
     geht auch, ergibt aber selten Sinn. */
  const ansatz0 = t.p.ansatz === undefined ? treffer.attack : t.p.ansatz;
  const breit = gehalten && treffer.breite > 0 && rest > 0.30;
  /* einstieg: eine feste Stelle in der Aufnahme, in Sekunden, ab der gelesen
     wird - der aufgenommene Anstrich wird uebersprungen.

     Warum das noetig ist: viele Bibliotheken nehmen einen GEHALTENEN Ton auf.
     Gemessen an der Mundharmonika hier - 50 % Pegel nach 45 ms, 75 % nach
     130 ms, 90 % erst nach 1,5 s. Das ist kein Anschlag, das ist ein
     Anschwellen. Schneidet man daraus 0,3 s heraus, bekommt jede Note ein
     abgeschnittenes Crescendo statt eines Ansatzes, und schnelle Toene
     klingen unbeholfen, egal welche Noten darin stehen. Dieselbe Aufnahme ab
     Sekunde 0,35 gelesen ist ein stehender Ton, dem `ansatz` dann einen
     eigenen, kurzen Anstrich gibt.

     Die Reihum-Werte bleiben, schrumpfen aber auf ein Zittern von wenigen
     Millisekunden: ihr Sinn ist, dass zwei gleiche Noten sich nicht
     ausloeschen, nicht die Suche nach der Stelle. Bei voller Streuung waere
     der Gewinn sofort wieder weg - auf einer Rampe faengt jede Note sonst
     bei einer anderen Lautstaerke an, und genau das hoert man als ungleich
     gespielt. */
  const fest = Math.min(t.p.einstieg || 0, Math.max(0, rest - 0.02));
  const einstieg = Math.min(fest + SAMPLE_VERSATZ[rr]*(fest ? 0.18 : 1), rest);
  schicht(einstieg, SAMPLE_CENT[rr], breit ? 0.80 : 1, ansatz0, 0);
  /* Zweite Schicht aus einer deutlich spaeteren Stelle derselben Aufnahme:
     gegenlaeufig verstimmt, ohne Anstrich, minimal spaeter. Aus einem
     aufgenommenen Ensemble wird so ein breiteres - und zwei gleiche Noten
     koennen sich nicht mehr gegenseitig ausloeschen. */
  if(breit) schicht(rest*0.72, -SAMPLE_CENT[rr] - 4, 0.44*treffer.breite/0.5,
                    Math.max(ansatz0*3, 0.10), 0.009 + rr*0.004);
  /* Cluster: eine zweite Stimme dicht daneben, angegeben in Halbtoenen. Eine
     kleine Sekunde uebereinander ist der Streicherklang aus jedem Horrorfilm -
     zwei Toene, die zu nah beieinander liegen, um zusammenzugehoeren. Das Ohr
     hoert kein Intervall mehr, sondern eine Schwebung, und liest sie als
     falsch. Bewusst etwas leiser und weicher angesetzt als die Hauptstimme. */
  if(t.p.cluster)
    schicht(Math.min(SAMPLE_VERSATZ[(rr+2) % SAMPLE_VERSATZ.length], rest),
            t.p.cluster*100 + (rr-1)*6,
            t.p.clusterPegel || 0.5,
            Math.max(ansatz0*2, 0.06), 0.006);
  return true;
}

/* ---------- Raumklang ---------- */
/* Liegt im Manifest eine Impulsantwort, ersetzt sie den gerechneten Hall.
   Das ist der groesste Klanggewinn pro Kilobyte, weil alle Figuren davon
   profitieren. */
/* Die echte Aufnahme ist ein kleiner Raum (gut eine halbe Sekunde). Sie
   liefert die charakteristischen fruehen Reflexionen, die kein gerechneter
   Hall trifft - fuer musikalische Laenge haengen wir einen abklingenden
   Schweif an, spektral an die Aufnahme angelehnt. Beides zusammen klingt
   natuerlicher als jede der beiden Haelften allein. */
function irBuffer(){
  if(!irGeladen) return null;
  const roh = holeBuffer('__ir__');
  if(!roh) return null;
  const s = sampleSpeicher();
  if(s.__irLang__) return s.__irLang__;
  const sr = roh.sampleRate;
  const kanaele = Math.max(2, roh.numberOfChannels);
  const schweif = Math.floor(sr*1.9);
  const lang = actx.createBuffer(kanaele, roh.length + schweif, sr);
  for(let c=0;c<kanaele;c++){
    const ziel = lang.getChannelData(c);
    const quelle = roh.getChannelData(Math.min(c, roh.numberOfChannels-1));
    for(let i=0;i<quelle.length;i++) ziel[i] = quelle[i];
    /* Uebergang: der Schweif setzt schon im letzten Viertel der Aufnahme ein */
    const start = Math.floor(quelle.length*0.75);
    let vor = 0;
    for(let i=start;i<ziel.length;i++){
      const t = (i-start)/(ziel.length-start);
      vor = vor*0.6 + (Math.random()*2-1)*0.4;      /* gefiltertes Rauschen */
      ziel[i] += vor*0.32*Math.pow(1-t, 2.6);
    }
  }
  s.__irLang__ = lang;
  return lang;
}

async function ladeKlangdateien(){
  const m = await ladeManifest();
  const aufgaben = [];
  if(m.raum && m.raum.datei){
    aufgaben.push(ladeRoh(m.raum.datei, '__ir__').then(function(r){ if(r) irGeladen = r; }));
  }
  if(m.instrumente){
    Object.keys(m.instrumente).forEach(function(name){
      const eintrag = m.instrumente[name];
      (eintrag.dateien || []).forEach(function(d){
        aufgaben.push(ladeRoh(d.datei, name + '/' + d.datei));
      });
    });
  }
  await Promise.all(aufgaben);
  /* Buffer im laufenden Kontext vorbereiten, damit der erste Ton schon sitzt */
  if(actx){
    if(irGeladen) holeBuffer('__ir__');
    if(m.instrumente) Object.keys(m.instrumente).forEach(function(name){
      (m.instrumente[name].dateien || []).forEach(function(d){ holeBuffer(name + '/' + d.datei); });
    });
  }
  return m;
}
function klangdateienAktiv(){
  if(!sampleManifest) return false;
  if(irGeladen) return true;
  const inst = sampleManifest.instrumente;
  return !!(inst && Object.keys(inst).length);
}

/* ---------- Credits ----------
   Wird aus dem Manifest gebaut: wer eine Aufnahme eintraegt, taucht
   automatisch hier auf. Ohne Aufnahmen entfaellt der Abschnitt. */
function creditsListe(){
  if(!sampleManifest) return [];
  const raus = [];
  function nimm(e){
    if(!e || !e.quelle) return;
    if(raus.some(function(x){ return x.quelle === e.quelle; })) return;
    raus.push({quelle:e.quelle, url:e.url || '', autor:e.autor || '', lizenz:e.lizenz || '', lizenzUrl:e.lizenzUrl || ''});
  }
  nimm(sampleManifest.raum);
  const inst = sampleManifest.instrumente || {};
  Object.keys(inst).forEach(function(k){ nimm(inst[k]); });
  return raus;
}
/* Eine Zeile statt einer Liste: fuer die Startseite, wo die Namensnennung
   hingehoert und nicht in einen Dialog, den man erst oeffnen muss. Zwei der
   vier Sammlungen stehen unter Lizenzen, die Namensnennung VERLANGEN - im
   Hilfefenster vergraben erfuellt das die Bedingung nur formal.
   Kurzname ist die Abkuerzung in Klammern, wenn die Quelle eine hat. */
function creditsZeile(){
  const liste = creditsListe();
  if(!liste.length) return '';
  const teile = liste.map(function(e){
    const kurz = (/\(([^()]+)\)\s*$/.exec(e.quelle) || [null, e.quelle])[1];
    const name = e.url
      ? '<a href="'+e.url+'" target="_blank" rel="noopener">'+kurz+'</a>'
      : kurz;
    return name + (e.lizenz ? ' <span class="liz">'+e.lizenz+'</span>' : '');
  });
  return 'Aufnahmen: ' + teile.join(' &middot; ')
       + '. Alles &uuml;brige entsteht live im Browser.';
}
function creditsHtml(){
  const liste = creditsListe();
  if(!liste.length) return '';
  let h = '<h2 style="margin-top:22px">KLANGQUELLEN</h2><dl>';
  liste.forEach(function(e){
    const name = e.url
      ? '<a href="'+e.url+'" target="_blank" rel="noopener">'+e.quelle+'</a>'
      : e.quelle;
    const liz = e.lizenzUrl
      ? '<a href="'+e.lizenzUrl+'" target="_blank" rel="noopener">'+e.lizenz+'</a>'
      : e.lizenz;
    h += '<dt>'+(e.autor || 'Quelle')+'</dt><dd>'+name+(liz ? ' &middot; '+liz : '')+'</dd>';
  });
  h += '</dl><p style="font-size:11.5px;color:var(--muted);margin-top:10px">'+
       'Alle uebrigen Klaenge entstehen live im Browser, ohne Aufnahme.</p>';
  return h;
}
