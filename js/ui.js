/* ---------- 9. Hinweise ---------- */
const TIPS = [
  'Antippen setzt einen Schritt. Ziehen verändert Höhe oder Wucht.',
  '<b>Solo</b> hört nur eine Figur. <b>Stumm</b> macht Pause.',
  '<b>Leertaste</b> startet und stoppt.',
  'Jeder Takt hat eigene Figuren.',
  '<b>Sichern</b>: Audio, MIDI oder Projekt.'
];
let tipIdx = 0, hoverHint = false;
/* Die Tippleiste ist raus - sie nahm unten Platz weg, ohne viel zu sagen.
   Die Funktion bleibt bewusst stehen: sie wird an zwei Dutzend Stellen
   gerufen, und ein stiller Nichtstuer ist sauberer als zwei Dutzend
   Streichungen. Kommt die Leiste je zurueck, reicht das Element. */
function hint(html){ const el = $('#hintText'); if(el) el.innerHTML = html; }
function rotateTip(){ if(!hoverHint) hint(TIPS[tipIdx++ % TIPS.length]); }

/* ---------- 10. Genre-Auswahl ---------- */
function renderGenreCards(){
  const grid = $('#genreGrid');
  if(cardRO) cardRO.disconnect();
  grid.innerHTML = '';
  GENRES.forEach(function(g){
    const card = el('button', 'gcard');
    card.type = 'button';
    const tinten = risoFarben(g);
    card.style.setProperty('--gac', tinten[0]);
    card.style.setProperty('--gac2', tinten[1]);
    const cv = el('canvas');
    card.appendChild(el('div','strip'));
    card.appendChild(cv);
    const saved = loadState(g.id);
    const hasSavedMix = !!(saved && (
      (Array.isArray(saved.bars) && saved.bars.some(function(savedBar){
        return savedBar && Array.isArray(savedBar.tracks || savedBar.parts) && (savedBar.tracks || savedBar.parts).length;
      })) ||
      (Array.isArray(saved.tracks) && saved.tracks.length)
    ));
    card.setAttribute('data-hint', '<b>'+g.name+'</b> &middot; '+g.bpm+' BPM &middot; '+g.scaleName+'.');
    card.setAttribute('aria-label', g.name+', '+g.bpm+' BPM, '+g.scaleName+(hasSavedMix?', gespeichert':''));
    const meta = el('div','meta');
    meta.innerHTML = '<h3>'+g.name+'</h3>'+
      '<span class="bpm">'+g.bpm+' BPM &middot; '+g.scaleName+'</span>';
    card.appendChild(meta);
    card.addEventListener('click', function(){ openGenre(g); });
    grid.appendChild(card);
    paintGenreCard(cv, g);
    watchCard(cv, g);
  });
}
/* Karten immer 1:1 zur echten Anzeigebreite zeichnen. Der Rahmen kann sich
   nach dem ersten Zeichnen noch ändern (Spaltenzahl!), darum neu zeichnen. */
let cardRO = null;
function watchCard(cv, g){
  cv._genre = g;
  if(typeof ResizeObserver === 'undefined') return;
  if(!cardRO){
    cardRO = new ResizeObserver(function(entries){
      entries.forEach(function(en){
        const c = en.target;
        const soll = Math.round(Math.max(200, c.clientWidth || 240) * Math.max(1, Math.min(2, window.devicePixelRatio || 1)));
        if(c._genre && Math.abs(c.width - soll) > 1) paintGenreCard(c, c._genre);
      });
    });
  }
  cardRO.observe(cv);
}
/* fester Zufall pro Genre, damit ein Neuzeichnen nicht flackert */
function seeded(n){
  let s = (n*2654435761) >>> 0;
  return function(){ s = (s*1664525 + 1013904223) >>> 0; return s/4294967296; };
}
/* Die zwei Druckfarben einer Welt. Bewusst nicht ac/ac2: die sind fuer
   den Bildschirm gemacht und im Druck zu grell. Welten ohne eigene
   Angabe fallen auf ihre Bildschirmfarben zurueck. */
function risoFarben(g){ return g.riso || [g.ac, g.ac2]; }

/* Hoehe der Bildflaeche einer Karte in CSS-Pixeln. Muss zu
   `.gcard canvas { height }` in styles.css passen. */
const CARD_ART_H = 158;

/* Die Karte wird als kleiner Risodruck gebaut: erst Deckung
   sammeln, dann in zwei Farben durch die Presse. Gezeichnet wird in
   Geraetepixeln (u = ein CSS-Pixel), damit das Raster auf jedem
   Bildschirm gleich fein bleibt und nichts krumm skaliert wird. */
function paintGenreCard(cv, g){
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const cssW = Math.max(200, Math.round(cv.clientWidth || 240));
  const u = dpr;
  const W = Math.round(cssW*u), H = Math.round(CARD_ART_H*u);
  cv.width = W; cv.height = H;

  const pr = RISO.press(W, H, {inks: risoFarben(g), paper: RISO.PAPER});
  const rnd = seeded(g.bpm + g.name.length);
  const gy = Math.round(H - 26*u);            /* Horizont, darauf stehen die Figuren */

  himmelDrucken(pr, g, W, gy);

  paintWorldBackdrop(pr, g, W, H, gy, u, rnd);

  /* Horizontlinie und angetoneter Boden */
  pr.rect(0, 0, gy, W, Math.round(2*u), 0.9);
  pr.rect(1, 0, gy + Math.round(2*u), W, H-gy, 0.15);

  /* Drei Figuren aus der Welt, aussen nach innen, damit die
     mittlere vorn steht. Massstab ganzzahlig - halbe Pixel gibt es
     im Druck nicht. */
  const picks = [g.chars[0], g.chars[5], g.chars[7]];
  const sc = Math.round((cssW < 232 ? 3 : 4) * u);
  [0,2,1].forEach(function(i){
    const p = picks[i];
    const sp = spriteCanvas(p.sprite, g, sc, true);   /* flache Palette */
    const cx = Math.round(W*(0.2 + i*0.3));
    const lift = i === 1 ? 2*sc : 0;          /* die mittlere steht weiter hinten */
    /* Schatten: zwei flache Streifen, wie im Druck ueberlagert */
    pr.rect(0, cx-8*sc, gy-lift, 16*sc, sc, 0.34);
    pr.rect(0, cx-6*sc, gy-lift+sc, 12*sc, sc, 0.22);
    pr.stamp(sp, cx - Math.round(sp.width/2), gy - sp.height - lift, 'set', FIGUR_STUFEN);
  });

  const ctx = cv.getContext('2d');
  pr.render(ctx, {pitch: 3.0*u, shift: 1.0*u, grain: 0.10, density: 0.95});
}

/* ---------- Figuren als Druckplatten ----------
   Eine flach gedruckte Figur besteht aus genau drei Ebenen: Papier,
   Farbe A, Farbe B. Die werden einmal gerechnet und danach nur noch
   gegeneinander verschoben uebereinandergelegt - so kann der
   Passerversatz pro Bild wandern, ohne dass die Presse mitlaeuft.

   In Ruhe sitzen die Platten genau uebereinander (sauberer Druck).
   Beim Anschlag rutschen sie auseinander und laufen wieder zusammen -
   der Versatz ist die Bewegung. */
const FIGUR_STUFEN = 1;        /* eine Stufe = Volltoene, kein Raster */
const VERSATZ_MAX = 3;         /* wie weit die Platten beim Anschlag auseinandergehen */

function hexRgb(h){
  return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
}

const plattenCache = {};
function risoPlatten(name, g, sc){
  const key = name + '|' + g.id + '|' + sc;
  if(plattenCache[key]) return plattenCache[key];
  const tinten = risoFarben(g);
  const src = spriteCanvas(name, g, sc, true);      /* flache Palette */
  const sw = src.width, sh = src.height;

  /* Freistellrand: ein schmaler Papierrand ringsum. Ohne ihn geht eine
     gruene Figur im gruenen Wald unter - Gold und Gruen koennen
     zusammen kein Dunkel drucken (Ueberdruck-Helligkeit 73 gegen 38
     bei Cyberpunk), es gibt also keine dunkle Kontur, die traegt.
     Aussparen ist die Antwort des Drucks darauf. */
  const rand = Math.max(2, Math.round(sc*0.55));
  const w = sw + rand*2, h = sh + rand*2;

  /* Verdickte Silhouette: die Figur achtmal im Kreis versetzt
     uebereinander, dann per `source-in` mit Papier gefuellt. */
  const maske = document.createElement('canvas');
  maske.width = w; maske.height = h;
  const gm = maske.getContext('2d', {willReadFrequently: true});
  gm.drawImage(src, rand, rand);
  for(let a = 0; a < 8; a++){
    const wi = a*Math.PI/4;
    gm.drawImage(src, rand + Math.round(Math.cos(wi)*rand), rand + Math.round(Math.sin(wi)*rand));
  }
  const haloAlpha = gm.getImageData(0, 0, w, h).data;

  const daten = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const trenn = RISO.separator(tinten[0], tinten[1]);
  const zwei = [0, 0];
  const P = hexRgb(RISO.PAPER), A = hexRgb(tinten[0]), B = hexRgb(tinten[1]);

  function leer(){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const papier = leer(), pa = leer(), pb = leer();
  const gp = papier.getContext('2d'), ga = pa.getContext('2d'), gb = pb.getContext('2d');
  const dp = gp.createImageData(w, h), da = ga.createImageData(w, h), db = gb.createImageData(w, h);

  /* Sehr sparsam. Bei jedem elften Punkt sah die Figur zerfressen aus
     statt gedruckt. Und die betroffenen Punkte nehmen die Farbe nur
     duenn an, statt ganz zu fehlen - ein Loch bis aufs Papier ist
     haerter als eine duenne Stelle. */
  const AUSFALL = 0.05;
  const DUENN = 125;         /* Deckung dieser Punkte statt 255 */
  const FARBSCHWANKUNG = 7;
  const PAPIERSCHWANKUNG = 6;

  /* Drei Tonstufen statt zwei: voll, hauchduenn, gar nicht.
     Mit nur `Math.round()` fiel alles unter der Haelfte auf Papier -
     und damit fielen Augen (Deckung 0,32), Haut (0,27) und Lichter
     (0,06) auf denselben Wert. Die Augen verschwanden also im
     Gesicht. Die mittlere Stufe trennt sie wieder, ohne dass ein
     Raster noetig waere: sie druckt dieselbe Farbe nur duenner. */
  const VOLL = 0.5, HAUCH = 0.18, HAUCHDECKUNG = 150;
  const tonAlpha = function(c){
    if(c >= VOLL) return 255;
    if(c >= HAUCH) return HAUCHDECKUNG;
    return 0;
  };

  /* Papier ueber die ganze verdickte Silhouette */
  for(let i = 0; i < w*h; i++){
    const q = i*4;
    if(haloAlpha[q+3] < 128) continue;
    const x = i % w, y = (i / w) | 0;
    const f = (RISO.hash(x, y, 7) - 0.5) * PAPIERSCHWANKUNG;
    dp.data[q] = P[0]+f; dp.data[q+1] = P[1]+f; dp.data[q+2] = P[2]+f; dp.data[q+3] = 255;
  }
  /* Farben nur auf der echten Figur, um den Rand versetzt.

     `direktdruck` heisst: keine Farbtrennung, die Figur behaelt ihre
     eigenen Farben und bekommt nur den Druck darauf. Das braucht der
     Game Boy - seine vier DMG-Toene sind die Welt, und eine Zerlegung
     in zwei fremde Druckfarben nimmt ihm genau das. */
  const direkt = !!g.direktdruck;
  for(let i = 0; i < sw*sh; i++){
    const q = i*4;
    if(daten[q+3] < 128) continue;
    const x = (i % sw) + rand, y = ((i / sw) | 0) + rand;
    const z = (y*w + x)*4;
    if(direkt){
      const gd = (RISO.hash(x, y, 3) - 0.5) * FARBSCHWANKUNG;
      da.data[z] = daten[q]+gd; da.data[z+1] = daten[q+1]+gd; da.data[z+2] = daten[q+2]+gd;
      da.data[z+3] = RISO.hash(x, y, 1) < AUSFALL ? DUENN : 255;
      continue;
    }
    trenn(daten[q], daten[q+1], daten[q+2], zwei);
    const aA = tonAlpha(zwei[0]), aB = tonAlpha(zwei[1]);
    if(aA){
      const g0 = (RISO.hash(x, y, 3) - 0.5) * FARBSCHWANKUNG;
      da.data[z] = A[0]+g0; da.data[z+1] = A[1]+g0; da.data[z+2] = A[2]+g0;
      da.data[z+3] = RISO.hash(x, y, 1) < AUSFALL ? Math.round(aA*DUENN/255) : aA;
    }
    if(aB){
      const g1 = (RISO.hash(x, y, 4) - 0.5) * FARBSCHWANKUNG;
      db.data[z] = B[0]+g1; db.data[z+1] = B[1]+g1; db.data[z+2] = B[2]+g1;
      db.data[z+3] = RISO.hash(x, y, 2) < AUSFALL ? Math.round(aB*DUENN/255) : aB;
    }
  }
  gp.putImageData(dp, 0, 0); ga.putImageData(da, 0, 0); gb.putImageData(db, 0, 0);
  const pl = {papier: papier, a: pa, b: pb, w: w, h: h, rand: rand};
  plattenCache[key] = pl;
  return pl;
}

/* Die drei Platten uebereinanderlegen. `multiply` sorgt dafuer, dass
   sich die beiden Farben dort, wo sie sich decken, zum tiefen
   Ueberdruck mischen - genau wie zwei Durchgaenge auf Papier. */
function zeichneFigur(g, pl, x, y, ax, ay, bx, by){
  g.drawImage(pl.papier, x, y);
  const vorher = g.globalCompositeOperation;
  g.globalCompositeOperation = 'multiply';
  g.drawImage(pl.a, x + ax, y + ay);
  g.drawImage(pl.b, x + bx, y + by);
  g.globalCompositeOperation = vorher;
}

/* Ruckweise Zufallszahl: ein Druck verrutscht nicht fliessend. */
function ruckZufall(stufe, n){
  let z = (stufe*2654435761 + n*40503 + 12345) >>> 0;
  z = ((z ^ (z >>> 13)) * 1274126177) >>> 0;
  return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
}

/* Eine kachelbare Regenflaeche, einmal gedruckt. CSS scrollt sie
   danach endlos - so faellt der Regen, ohne dass pro Bild etwas
   gezeichnet wird.

   Damit die Kachel an allen vier Kanten aufgeht, wird jeder Strich
   viermal gesetzt: an seinem Platz und je einmal um eine Kachelbreite
   beziehungsweise -hoehe versetzt. Was oben herauslaeuft, kommt unten
   wieder herein.

   Nachts sind die Striche ausgespartes Papier - helle Striche im
   dunklen Himmel -, tagsueber Farbe. Entsprechend wird die Ebene im
   Browser einmal aufhellend und einmal abdunkelnd gemischt. */
const REGEN_KACHEL = 120;      /* CSS-Pixel, muss zur CSS-Animation passen */
function regenKachel(g){
  if(!g.regen || typeof RISO === 'undefined') return null;
  const u = 2, S = REGEN_KACHEL*u, nacht = !!g.nacht;
  const pr = RISO.press(S, S, {inks: risoFarben(g), paper: RISO.PAPER});
  const rnd = seeded(g.bpm + 17);
  /* Sparsam und kraeftig wie im Papierdruck: vorher waren es dreimal
     so viele und halb so dicke Striche, das las sich als Flimmern. */
  const strich = Math.max(2, Math.round(2*u));
  /* Dichte je Welt: Horror will vereinzelte Tropfen, Cyberpunk mehr. */
  for(let i=0, n=(g.regenDichte || 6); i<n; i++){
    const rx = Math.round(rnd()*S), ry = Math.round(rnd()*S);
    const lang = Math.round((11 + rnd()*7)*u);
    for(let k=0; k<lang; k++){
      const px = rx + Math.round(k*0.5), py = ry + k;
      for(let ox=0; ox>=-S; ox-=S){
        for(let oy=0; oy>=-S; oy-=S){
          if(nacht) pr.rect(2, px+ox, py+oy, strich, strich, 1, 'set');
          else pr.rect(1, px+ox, py+oy, strich, strich, 0.75, 'set');
        }
      }
    }
  }
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  pr.render(cv.getContext('2d'), {pitch: 2.4*u, shift: 0, grain: 0.05, transparent: true});
  return {bild: cv.toDataURL('image/png'), nacht: nacht};
}

/* Funkelnde Sterne: eine Ebene ueber dem Druck, ein Punkt je gemerktem
   Stern, jeder mit eigener Dauer und eigenem Versatz. Reines CSS, kostet
   kein gezeichnetes Bild. Nur Welten, die Sterne gemerkt haben. */
let stageSterne = [];
function setzeSterne(g){
  const el = $('#stageSterne');
  if(!el) return;
  el.innerHTML = '';
  if(!g || !stageSterne.length){ el.hidden = true; return; }
  el.hidden = false;
  const tinten = g.riso || [];
  stageSterne.forEach(function(st, i){
    const d = document.createElement('i');
    d.style.left = (st.x*100).toFixed(2) + '%';
    d.style.top  = (st.y*100).toFixed(2) + '%';
    d.style.width = d.style.height = (st.s > 2 ? 4 : 3) + 'px';
    /* Die Druckfarbe geht als Variable hinein, damit die Animation auch den
       Schein damit faerben kann - der Schein ist der eigentliche Trick: ein
       3-px-Punkt wird nicht heller wahrgenommen, sondern GROESSER. Ohne ihn
       passiert das Funkeln unterhalb dessen, was das Auge bemerkt. */
    d.style.setProperty('--ton', tinten[st.tinte] || 'currentColor');
    /* Streuung aus dem Index, nicht aus Math.random: gleiche Sterne,
       gleiches Funkeln bei jedem Aufbau. Die Spanne ist bewusst breit -
       laufen alle gleich schnell, sieht man ein Blinken statt eines
       Himmels. Jeder siebte bleibt lange stehen und blitzt kurz. */
    const lang = i%7 === 0;
    d.style.animationDuration = (lang ? 5.2 + ((i*5)%7)*0.4 : 1.6 + ((i*7)%11)*0.3).toFixed(2) + 's';
    d.style.animationDelay = '-' + (((i*11)%19)*0.29).toFixed(2) + 's';
    if(lang) d.classList.add('blitz');
    el.appendChild(d);
  });
}
function setzeRegen(g){
  const el = $('#stageRegen');
  if(!el) return;
  const k = regenKachel(g);
  if(!k){ el.hidden = true; el.style.backgroundImage = ''; return; }
  el.hidden = false;
  el.style.backgroundImage = 'url(' + k.bild + ')';
  el.style.mixBlendMode = k.nacht ? 'screen' : 'multiply';
  el.style.opacity = k.nacht ? '0.5' : '0.42';
  /* Tempo je Welt: der Regen springt fuenfmal je Runde, eine laengere
     Runde heisst also langsamer und traeger. */
  el.style.animationDuration = (g.regenTempo || 1) + 's';
}

/* ---------- Gedruckte Buehne ----------
   Die Welt, die man betritt, bekommt dieselbe Kulisse wie ihre Karte
   auf der Startseite - nur gross. Vorher war die Buehne ein
   CSS-Verlauf mit zwei Lichtkegeln, und der Sprung von der gedruckten
   Startseite hinein war ein harter Bruch. */
let stageRO = null;
let stageRahmen = 0;
/* Beim Ziehen am Fenster feuert der Beobachter bei jedem Pixel. Ein
   Druck der ganzen Buehne kostet aber je nach Groesse hundert
   Millisekunden - also hoechstens einmal pro Bild. */
function bestelleStageDruck(){
  if(stageRahmen) return;
  stageRahmen = requestAnimationFrame(function(){
    stageRahmen = 0;
    paintStagePrint();
  });
}
function paintStagePrint(){
  const cv = $('#stageDruck');
  if(!cv || !genre || typeof RISO === 'undefined') return;
  const stage = cv.parentElement;
  const cssW = Math.round(stage.clientWidth), cssH = Math.round(stage.clientHeight);
  if(cssW < 60 || cssH < 60) return;

  /* Die Buehne ist gross. Auf zu vielen Bildpunkten dauert der Druck
     spuerbar, darum oberhalb einer Grenze in CSS-Pixeln rechnen und
     den Browser das letzte Stueck hochziehen lassen. */
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const u = (cssW*cssH*dpr*dpr > 1600000) ? 1 : dpr;
  const W = Math.round(cssW*u), H = Math.round(cssH*u);
  cv.width = W; cv.height = H;

  const floor = $('.stagefloor');
  const gy = floor ? Math.round(floor.offsetTop * u) : Math.round(H - 30*u);

  /* Die Kulisse ist fuer eine 132 px hohe Karte gezeichnet. Hier ist
     mehr Platz, also waechst der Massstab mit - das Raster bleibt
     dabei gleich fein, das haengt nicht am Massstab. */
  const us = u * Math.max(1, Math.min(2.6, (gy/u) / 155));

  const pr = RISO.press(W, H, {inks: risoFarben(genre), paper: RISO.PAPER});
  himmelDrucken(pr, genre, W, gy);
  paintWorldBackdrop(pr, genre, W, H, gy, us, seeded(genre.bpm + genre.name.length), true);
  pr.rect(0, 0, gy, W, Math.max(1, Math.round(2*u)), 0.9);
  pr.rect(1, 0, gy + Math.round(2*u), W, H-gy, 0.13);
  pr.render(cv.getContext('2d'), {pitch: 3.0*u, shift: 1.0*u, grain: 0.10, density: 0.95});
  setzeSterne(genre);
}
function watchStage(){
  const cv = $('#stageDruck');
  if(!cv || stageRO || typeof ResizeObserver === 'undefined') return;
  stageRO = new ResizeObserver(bestelleStageDruck);
  stageRO.observe(cv.parentElement);
}

/* Der Himmel. Voreinstellung ist Tag: kuehle Farbe nach oben, warmes
   Licht am Horizont, viel blankes Papier. Welten mit `nacht: true`
   drehen das um - die Farbe liegt oben fast voll, und was davor steht,
   muss sich hell aussparen. */
function himmelDrucken(pr, g, W, gy){
  if(g.nacht){
    /* Beide Farben oben fast voll - erst der Ueberdruck gibt das tiefe
       Nachtblau. Nach unten nimmt vor allem die zweite ab, das ist der
       Lichtschein der Stadt ueber dem Horizont. */
    pr.vgrad(1, 0, gy, 0.98, 0.6);
    /* In zwei Abschnitten: die obere Haelfte bleibt fast so dunkel,
       erst darunter oeffnet sich der Himmel zum Lichtschein der Stadt.
       Ein einziger Verlauf hellte schon im ersten Viertel auf. */
    pr.vgrad(0, 0, gy*0.5, 0.62, 0.46);
    pr.vgrad(0, gy*0.5, gy, 0.46, 0.05);
  } else {
    pr.vgrad(1, 0, gy, 0.54, 0.04);
    pr.vgrad(0, gy*0.28, gy, 0, 0.34);
  }
}

/* Vollflaechige Scheibe in einer Druckfarbe - Sonne, Mond, Planet. */
function risoDisc(pr, n, cx, cy, r, v, mode){
  const y0 = Math.max(0, Math.floor(cy-r)), y1 = Math.min(pr.h, Math.ceil(cy+r));
  for(let y=y0; y<y1; y++){
    const dy = y - cy + 0.5;
    const dx = Math.sqrt(Math.max(0, r*r - dy*dy));
    pr.rect(n, cx-dx, y, dx*2, 1, v, mode);
  }
}

/* Blockige Skyline auf dem Horizont. */
function risoSkyline(pr, n, rnd, W, gy, u, o){
  const step = o.step*u, minH = o.min*u, maxH = o.max*u, v = o.v;
  for(let px=-step; px<W+step; px+=step){
    const h = Math.round(minH + rnd()*(maxH-minH));
    const w = Math.round(step*(0.62 + rnd()*0.3));
    pr.rect(n, px, gy-h, w, h, v);
    if(o.win){
      /* Fenster: kleine Aussparungen in der zweiten Farbe */
      for(let wy=gy-h+3*u; wy<gy-3*u; wy+=5*u){
        for(let wx=px+2*u; wx<px+w-2*u; wx+=5*u){
          if(rnd() > 0.45) pr.rect(o.win, wx, wy, 2*u, 2*u, 0.9, 'set');
        }
      }
    }
  }
}

/* Skyline vor einem Nachthimmel: die Haeuser sind heller als der
   Grund, also wird die Deckung gesetzt statt addiert. Ausserdem muss
   der ausgesparte Mond dahinter geloescht werden, sonst scheint er
   durch die Haeuser. */
function risoSkylineHell(pr, rnd, W, gy, u, o){
  const step = o.step*u, minH = o.min*u, maxH = o.max*u;
  for(let px=-step; px<W+step; px+=step){
    const h = Math.round(minH + rnd()*(maxH-minH));
    const w = Math.round(step*(0.62 + rnd()*0.3));
    pr.rect(2, px, gy-h, w, h, 0, 'set');
    pr.rect(0, px, gy-h, w, h, o.a, 'set');
    pr.rect(1, px, gy-h, w, h, o.b, 'set');
  }
}

/* Jede Welt bekommt eine eigene Kulisse - als Druckflaeche, nicht als
   Farbe. n=0 ist die Hauptfarbe der Welt, n=1 die Zweitfarbe. Welche
   Farbe was traegt, entscheidet die Welt: Fantasy druckt Baeume gruen
   und die Burg gold, Horror druckt beide uebereinander, damit die
   Aeste fast schwarz werden. */
function paintWorldBackdrop(pr, g, W, H, gy, u, rnd, ohneRegen){
  if(g.id === 'cyber'){
    /* Neonmond: heller Fleck im Nachthimmel. Nicht ganz ausgespart -
       blankes Papier wirkt wie ein Loch -, sondern beide Farben auf
       einen Hauch heruntergesetzt. */
    risoDisc(pr, 0, W*0.78, gy-88*u, 26*u, 0.04, 'set');
    risoDisc(pr, 1, W*0.78, gy-88*u, 26*u, 0.12, 'set');
    /* Ferne Tuerme: heller als der Himmel, aber noch nicht Papier -
       sie stehen im Dunst. 'set' statt 'add', sonst kommt die Deckung
       des Himmels dazu und sie werden dunkler statt heller. */
    risoSkylineHell(pr, rnd, W, gy, u, {step:12, min:26, max:82, a:0.25, b:0.38});

    /* Nahe Tuerme. Ihre Masse werden gemerkt, damit Fenster,
       Leuchtreklame und die Spiegelung auf der nassen Strasse
       zusammenpassen - vorher wurden die Fenster blind ins Raster
       gestreut und sahen aus wie Schmutz. */
    const tuerme = [];
    for(let px = -10*u; px < W + 20*u; px += Math.round(22*u)){
      const th = Math.round((20 + rnd()*56)*u);
      const tw = Math.round(22*u*(0.58 + rnd()*0.3));
      tuerme.push({x: px, w: tw, h: th});
      /* Helle Haeuser vor dunklem Himmel: beide Farben werden hier
         heruntergesetzt, nicht aufgetragen. Der ausgesparte Mond wird
         mitgeloescht, sonst scheint er durch die Wand. */
      pr.rect(2, px, gy-th, tw, th, 0, 'set');
      pr.rect(0, px, gy-th, tw, th, 0.06, 'set');
      pr.rect(1, px, gy-th, tw, th, 0.16, 'set');
    }
    tuerme.forEach(function(t){
      /* Fenster leuchten pink - die einzige satte Farbe im Bild. */
      for(let wy = gy-t.h+5*u; wy < gy-5*u; wy += Math.round(7*u)){
        for(let wx = t.x+3*u; wx < t.x+t.w-4*u; wx += Math.round(6*u)){
          if(rnd() > 0.4){
            pr.rect(0, wx, wy, 2*u, 3*u, 0.95, 'set');
            pr.rect(1, wx, wy, 2*u, 3*u, 0, 'set');
          }
        }
      }
      /* Leuchtreklame: schmaler senkrechter Balken an der Hauskante */
      if(t.h > 42*u && rnd() > 0.5){
        pr.rect(0, t.x + t.w - 5*u, gy-t.h+7*u, 3*u, Math.round(t.h*0.42), 0.95, 'set');
        pr.rect(1, t.x + t.w - 5*u, gy-t.h+7*u, 3*u, Math.round(t.h*0.42), 0, 'set');
      }
      /* Antenne mit Spitzenlicht auf den hohen Tuermen */
      if(t.h > 54*u){
        const mx = t.x + Math.round(t.w/2);
        pr.rect(0, mx, gy-t.h-11*u, Math.max(1, Math.round(u)), 11*u, 0.1, 'set');
        pr.rect(1, mx, gy-t.h-11*u, Math.max(1, Math.round(u)), 11*u, 0.2, 'set');
        pr.rect(0, mx-u, gy-t.h-14*u, 3*u, 3*u, 0.95, 'set');
      }
      /* Nasse Strasse: die Stadt spiegelt sich in Streifen. Als
         geschlossene Flaeche war davon nichts zu sehen - erst die
         Luecken dazwischen machen daraus nassen Asphalt. */
      for(let sx = t.x; sx < t.x + t.w; sx += Math.round(4*u)){
        const sl = Math.round(Math.min(t.h*0.34, 20*u) * (0.35 + rnd()*0.65));
        pr.rect(0, sx, gy + 3*u, Math.round(2.5*u), sl, 0.4);
      }
    });

    /* Regen: helle Striche im dunklen Himmel, also aufhellen statt
       auftragen. Auf der Buehne faellt er stattdessen als eigene,
       laufende Ebene - siehe regenKachel(). */
    for(let i=0; i<55 && !ohneRegen; i++){
      const rx = Math.round(rnd()*W), ry = Math.round(rnd()*(gy-4*u));
      for(let k=0; k<6; k++){
        pr.rect(1, rx + Math.round(k*0.5*u), ry + k*u, Math.max(1, Math.round(u)), u, 0.42, 'set');
      }
    }

  } else if(g.id === 'fantasy'){
    /* Tiefstehende Sonne, gross und warm, hinter allem */
    risoDisc(pr, 0, W*0.68, gy-26*u, 42*u, 0.2);

    /* Zwei Huegelruecken. Ohne sie steht der ganze Wald auf einer
       Linie und die Karte hat keine Tiefe. */
    [[27, 46, 0.6, 13, 0.18], [16, 31, 2.1, 8, 0.26]].forEach(function(k){
      for(let x=0; x<W; x++){
        const hh = Math.round((k[0] + Math.sin(x/(k[1]*u) + k[2])*k[3])*u);
        pr.rect(1, x, gy-hh, 1, hh, k[4]);
      }
    });

    /* Baumliste zuerst, gezeichnet wird sie in zwei Durchgaengen:
       ferne Reihe, dann die Burg, dann die nahe Reihe. Lag die Burg
       vor beiden, verschwand sie komplett hinter dem Wald. */
    const baeume = [];
    for(let px = -10*u; px < W + 26*u; px += Math.round(13*u)){
      baeume.push({
        x: px + Math.round((rnd()-0.5)*9*u),
        h: Math.round((24 + rnd()*44)*u),
        fern: rnd() > 0.52
      });
    }
    const baum = function(t){
      const v = t.fern ? 0.34 : 0.85;
      const th = t.fern ? Math.round(t.h*0.6) : t.h;
      pr.rect(1, t.x - Math.round(1.5*u), gy - Math.round(th*0.2), 3*u, Math.round(th*0.2), v);
      /* Stufe 0 ist die Spitze, Stufe 4 der Fuss - die Krone wird also
         nach unten breiter. */
      for(let st=0; st<5; st++){
        const spread = Math.round(th*0.075*(1 + st*0.62));
        pr.rect(1, t.x - spread, gy - th + Math.round(st*th*0.16), spread*2, Math.round(th*0.2), v);
      }
    };
    baeume.filter(function(t){ return t.fern; }).forEach(baum);

    /* Burg auf einem Huegel: Mauer mit Tor, Seitenturm, Bergfried mit
       Fenstern und Fahne. Vorher ein Rechteck mit vier Zinnen - das
       las sich als Klotz, nicht als Burg. Der Sockel liegt ueber dem
       Horizont, sonst steht sie im Wald statt dahinter. */
    const bg2 = gy - Math.round(14*u);
    const bx = Math.round(W*0.33), bw = Math.round(30*u);
    const mauerH = Math.round(26*u), turmH = Math.round(38*u), bergH = Math.round(60*u);
    const zinne = Math.round(4.5*u);
    const zinnen = function(x, breite, oben, anzahl){
      const schritt = breite/anzahl;
      for(let i=0; i<anzahl; i++){
        pr.rect(0, x + Math.round(i*schritt), oben-zinne, Math.round(schritt*0.58), zinne, 0.88);
      }
    };
    pr.rect(0, bx, bg2-mauerH, bw, mauerH, 0.82);
    zinnen(bx + Math.round(1.5*u), bw - 3*u, bg2-mauerH, 4);
    /* Tor: dunkler als die Mauer, also beide Farben */
    const tx = bx + Math.round(bw/2) - Math.round(4*u), th2 = Math.round(14*u);
    pr.rect(0, tx, bg2-th2, 8*u, th2, 0.55, 'set');
    pr.rect(1, tx, bg2-th2, 8*u, th2, 0.8, 'set');
    /* Seitenturm links */
    pr.rect(0, bx - Math.round(7*u), bg2-turmH, Math.round(9*u), turmH, 0.88);
    zinnen(bx - Math.round(7*u), Math.round(9*u), bg2-turmH, 2);
    /* Bergfried rechts, hoch genug, um ueber die Baeume zu reichen */
    const kx = bx + bw - Math.round(4*u), kb = Math.round(12*u);
    pr.rect(0, kx, bg2-bergH, kb, bergH, 0.9);
    zinnen(kx, kb, bg2-bergH, 3);
    /* Zwei Fenster - sie geben dem Turm erst seinen Massstab */
    [16, 32].forEach(function(fy){
      pr.rect(0, kx + Math.round(4.5*u), bg2-bergH+Math.round(fy*u), 3*u, Math.round(5*u), 0.5, 'set');
      pr.rect(1, kx + Math.round(4.5*u), bg2-bergH+Math.round(fy*u), 3*u, Math.round(5*u), 0.85, 'set');
    });
    /* Fahne */
    const fx = kx + Math.round(kb/2);
    pr.rect(0, fx, bg2-bergH-Math.round(16*u), Math.max(1, Math.round(u)), Math.round(16*u), 0.85);
    pr.rect(0, fx + Math.round(u), bg2-bergH-Math.round(16*u), Math.round(10*u), Math.round(5.5*u), 0.9);

    baeume.filter(function(t){ return !t.fern; }).forEach(baum);

    /* Voegel */
    for(let i=0; i<5; i++){
      const vx = Math.round(W*(0.1 + rnd()*0.8)), vy = Math.round(gy - (78 + rnd()*26)*u);
      pr.rect(1, vx-3*u, vy+u, 3*u, Math.max(1, Math.round(u)), 0.8);
      pr.rect(1, vx, vy, 2*u, Math.max(1, Math.round(u)), 0.8);
      pr.rect(1, vx+2*u, vy+u, 3*u, Math.max(1, Math.round(u)), 0.8);
    }

    /* Grasbueschel im unteren Band */
    for(let i=0; i<70; i++){
      const gx = Math.round(rnd()*W), gh = Math.round((2 + rnd()*5)*u);
      pr.rect(1, gx, gy + Math.round(4*u) + Math.round(rnd()*14*u), Math.max(1, Math.round(u)), gh, 0.45);
    }

  } else if(g.id === 'arcade'){
    /* Ein Spielfeld statt einer leeren Flaeche. Vorher lagen hier ein
       paar Sterne und ein Fluchtraster - das Raster kam in Gross nie
       durch und der Rest war Himmel.

       Die Sachen, die etwas zeigen, sitzen bewusst im oberen Drittel:
       darunter stehen die Figuren, und auf der Weltkarte ist ueber
       ihren Koepfen nur ein schmaler Streifen frei. */

    /* Bildroehre: feine Zeilen ueber alles */
    for(let y = Math.round(3*u); y < gy; y += Math.round(4*u)){
      pr.rect(1, 0, y, W, Math.max(1, Math.round(u*0.6)), 0.22, 'max');
    }

    /* Sterne */
    for(let i=0; i<22; i++){
      pr.rect(1, Math.round(rnd()*W), Math.round(rnd()*(gy-118*u)), 2*u, 2*u, 0.85);
    }

    /* Angreifer, zwei Reihen, versetzt - die zweite haelt die Arme
       anders, wie die zwei Bilder der Vorlage. */
    const angreifer = [
      ['..X.X..',
       '.XXXXX.',
       'XX.X.XX',
       'XXXXXXX',
       'X.X.X.X'],
      ['..X.X..',
       '.XXXXX.',
       'XX.X.XX',
       'XXXXXXX',
       '.X...X.']
    ];
    const muster = function(n, bild, x, y, sc, v){
      for(let r=0; r<bild.length; r++){
        for(let c=0; c<bild[r].length; c++){
          if(bild[r][c] !== 'X') continue;
          pr.rect(n, x + c*sc, y + r*sc, sc, sc, v);
        }
      }
    };
    const asc = Math.max(1, Math.round(2*u));
    [[118, 0], [100, 1]].forEach(function(reihe){
      const y = gy - Math.round(reihe[0]*u);
      for(let x = Math.round(6*u); x < W - 10*u; x += Math.round(26*u)){
        muster(1, angreifer[reihe[1]], x, y, asc, 0.9);
      }
    });

    /* Ziegelstege, gegeneinander versetzt */
    [[0.04, 0.42, 84], [0.56, 0.97, 72], [0.24, 0.74, 58]].forEach(function(st){
      const x0 = Math.round(W*st[0]), x1 = Math.round(W*st[1]);
      const y = gy - Math.round(st[2]*u), dick = Math.round(5*u);
      pr.rect(0, x0, y, x1-x0, dick, 0.88);
      /* Fugen: die Steine erkennt man erst an den Luecken */
      for(let x = x0 + Math.round(6*u); x < x1; x += Math.round(9*u)){
        pr.rect(0, x, y, Math.max(1, Math.round(u)), dick, 0, 'set');
      }
    });

    /* Leitern zwischen den Stegen */
    [[0.36, 84, 72], [0.62, 72, 58]].forEach(function(le){
      const lx = Math.round(W*le[0]);
      const oben = gy - Math.round(le[1]*u), unten = gy - Math.round(le[2]*u);
      pr.rect(0, lx, oben, Math.max(1, Math.round(1.5*u)), unten-oben, 0.8);
      pr.rect(0, lx + Math.round(7*u), oben, Math.max(1, Math.round(1.5*u)), unten-oben, 0.8);
      for(let y = oben; y < unten; y += Math.round(5*u)){
        pr.rect(0, lx, y, Math.round(8*u), Math.max(1, Math.round(u)), 0.8);
      }
    });

    /* Boden: Bloecke statt Skyline, wie der Rand eines Levels */
    for(let x = 0; x < W; x += Math.round(11*u)){
      const hoch = Math.round((7 + (rnd() > 0.7 ? 8 : 0))*u);
      pr.rect(0, x, gy-hoch, Math.round(10*u), hoch, 0.85);
      pr.rect(1, x + Math.round(3*u), gy-hoch+Math.round(2*u), Math.round(3*u), Math.round(3*u), 0.8, 'set');
    }

  } else if(g.id === 'horror'){
    /* Nachtwelt: alles, was zu sehen sein soll, muss heller sein als
       der Himmel - also gesetzt statt aufgetragen. */
    risoDisc(pr, 0, W*0.86, gy-92*u, 19*u, 0.05, 'set');
    risoDisc(pr, 1, W*0.86, gy-92*u, 19*u, 0.16, 'set');
    /* Krater */
    risoDisc(pr, 1, W*0.86+5*u, gy-96*u, 5*u, 0.4, 'set');

    /* Kahle Baeume, giftgruen vor dem dunklen Himmel. Vorher waren sie
       in beiden Farben ueberdruckt und damit fast schwarz - vor einem
       dunklen Himmel verschwindet das. */
    for(let px=-8*u; px<W+10*u; px+=Math.round(46*u)){
      const th = Math.round((62 + rnd()*26)*u);
      const cx = px + 14*u, w = Math.max(2, Math.round(2.5*u));
      const aeste = [
        [ 1, -0.9, Math.round(13*u), 0.22],
        [-1, -1.0, Math.round(11*u), 0.36],
        [ 1, -0.7, Math.round(10*u), 0.52],
        [-1, -0.8, Math.round(8*u),  0.64]
      ];
      const setz = function(x, y, bw, bh){
        pr.rect(0, x, y, bw, bh, 0.04, 'set');
        pr.rect(1, x, y, bw, bh, 0.78, 'set');
      };
      setz(cx-Math.round(w/2), gy-th, w+u, th);
      aeste.forEach(function(ast){
        const ay = gy - th + Math.round(th*ast[3]);
        for(let i=0; i<ast[2]; i++){
          setz(cx + ast[0]*i*u, ay + Math.round(ast[1]*i*u), w, w);
        }
        /* Zweig am Ende, damit der Ast nicht abgeschnitten wirkt */
        const ex = cx + ast[0]*ast[2]*u, ey = ay + Math.round(ast[1]*ast[2]*u);
        for(let i=0; i<Math.round(4*u); i++) setz(ex + ast[0]*Math.round(i*0.4), ey - i, w, w);
      });
    }

    /* Bodennebel: heller Streifen ueber dem Horizont */
    for(let x=0; x<W; x++){
      const nh = Math.round((7 + Math.sin(x/(29*u))*4 + Math.sin(x/(61*u))*3)*u);
      pr.rect(0, x, gy-nh, 1, nh, 0.03, 'set');
      pr.rect(1, x, gy-nh, 1, nh, 0.3, 'set');
    }

  } else if(g.id === 'spacefunk'){
    /* Sterne. Auf der Buehne werden sie schwaecher gedruckt und ihre Lage
       gemerkt: darueber liegt dann eine Ebene, auf der jeder Stern fuer sich
       funkelt (setzeSterne). Auf der Karte bleibt es der volle Druck. */
    /* Es waren 34 Sterne zu 4 px auf einer 762x321-Buehne - zusammen 0,2 %
       der Flaeche. So wenig kann nicht funkeln, egal wie stark die Animation
       ist. Jetzt 78, und der GEDRUCKTE Stern liegt schwaecher (0,28 statt
       0,45): das Funkeln soll aus der Ebene darueber kommen, nicht gegen
       einen schon hellen Punkt ankaempfen muessen. */
    const gemerkt = [];
    for(let i=0;i<78;i++){
      const s = i%7 === 0 ? 3*u : 2*u;
      const sx = Math.round(rnd()*W), sy = Math.round(rnd()*(gy-34*u));
      pr.rect(i%3 ? 1 : 0, sx, sy, s, s, ohneRegen ? 0.28 : 0.92);
      gemerkt.push({x: sx/W, y: sy/H, s: s/u, tinte: i%3 ? 1 : 0});
    }
    if(ohneRegen) stageSterne = gemerkt;
    /* Ringplanet, hoch genug, dass er den Figuren nur als Halo im
       Ruecken steht. Der Ring laeuft durch die Mitte der Scheibe - vorher
       sass er neun Einheiten tiefer und las sich wie ein Guertel. */
    const px = W*0.86, py = gy-88*u;
    risoDisc(pr, 1, px, py, 17*u, 0.62);
    for(let i=-1;i<=1;i++) pr.rect(0, px-30*u, py+i*2*u, 60*u, 2*u, 0.6);
    for(let x=0; x<W; x++){
      const h = Math.round((12 + Math.sin(x/(21*u))*7 + Math.sin(x/(53*u))*5)*u);
      pr.rect(0, x, gy-h, 1, h, 0.82);
    }

  } else if(g.id === 'gameboy'){
    /* Eine Ein-Farben-Welt: alles laeuft auf der zweiten Tinte, dem
       DMG-Gruen. Die erste steuert nur die Horizontglut bei und macht
       im Ueberdruck das Oliv. */
    for(let y=Math.round(5*u); y<gy-10*u; y+=Math.round(7*u)){
      for(let x=((Math.round(y/(7*u)))%2)*Math.round(3.5*u); x<W; x+=Math.round(7*u)){
        pr.rect(1, x, y, 2*u, 2*u, 0.3);
      }
    }
    risoSkyline(pr, 0, rnd, W, gy, u, {step:15, min:14, max:46, v:0.85});

  } else if(g.id === 'lofi'){
    risoDisc(pr, 0, W*0.9, gy-86*u, 13*u, 0.42);
    risoSkyline(pr, 0, rnd, W, gy, u, {step:22, min:22, max:58, v:0.72, win:1});
    /* Schraeger Regen - auf der Buehne als laufende Ebene */
    for(let i=0;i<70 && !ohneRegen;i++){
      const x = Math.round(rnd()*W), y = Math.round(rnd()*(gy-8*u));
      for(let k=0;k<7;k++) pr.rect(1, x + Math.round(k*0.4*u), y + k*u, Math.max(1, Math.round(u)), u, 0.55);
    }

  } else if(g.id === 'western'){
    risoDisc(pr, 0, W*0.5, gy-72*u, 30*u, 0.4);
    /* Tafelberge mit Absatz */
    [[0.02,78,46],[0.38,62,34],[0.74,88,54]].forEach(function(m){
      const mx = Math.round(W*m[0]), mw = Math.round(m[1]*u), mh = Math.round(m[2]*u);
      pr.rect(1, mx, gy-mh, mw, mh, 0.62);
      pr.rect(1, mx-5*u, gy-mh+8*u, mw+10*u, 5*u, 0.62);
    });
    /* Kakteen */
    for(let px=14*u; px<W; px+=Math.round(47*u)){
      pr.rect(0, px, gy-26*u, 5*u, 26*u, 0.88);
      pr.rect(0, px-7*u, gy-19*u, 7*u, 4*u, 0.88);
      pr.rect(0, px-7*u, gy-19*u, 4*u, 11*u, 0.88);
      pr.rect(0, px+5*u, gy-24*u, 6*u, 4*u, 0.88);
      pr.rect(0, px+7*u, gy-24*u, 4*u, 9*u, 0.88);
    }

  } else {
    risoSkyline(pr, 0, rnd, W, gy, u, {step:21, min:16, max:52, v:0.82, win:1});
  }
}

/* ---------- 11. Genre öffnen ---------- */
/* ---------- 11b. Songart ----------
   Welche Art von Song soll das werden? Nur Welten mit `songarten` fragen
   das - beim Game Boy sind es die drei Stellen, an denen ein Spiel Musik
   braucht. Die Wahl schreibt Tempo, Grundton und Tonleiter in die Welt
   zurueck; die gesetzten Schritte bleiben unberuehrt und bedeuten danach
   andere Toene. Deshalb steht die Wahl oben neben PLAY und nicht in der
   Weltenuebersicht: sie gehoert zum Bauen, nicht zum Aussuchen. */
function setzeSongart(id, still){
  const arten = genre && genre.songarten;
  if(!arten || !arten.length){ songartId = null; renderSongarten(); return; }
  const art = arten.filter(function(a){ return a.id === id; })[0] || arten[0];
  songartId = art.id;
  genre.bpm = art.bpm; genre.root = art.root;
  genre.scale = art.scale; genre.scaleName = art.scaleName;
  renderSongarten();
  if(still) return;
  /* Von Hand gewaehlt: das Tempo der Fassung gilt sofort. Ohne das hoert
     man von einem Bosskampf nur die Tonleiter, und das ist die halbe
     Miete - der Rest ist Geschwindigkeit. */
  bpm = art.bpm;
  $('#bpm').value = bpm; $('#bpmOut').textContent = bpm;
  if(delNode) delNode.delayTime.value = delayZeit();
  renderInspector(); save();
  hint('<b>' + art.lang + '</b> &ndash; ' + art.bpm + ' BPM, ' + art.scaleName
     + '. ' + art.text + ' Deine Schritte bleiben stehen.');
}
function renderSongarten(){
  const box = $('#songArten');
  if(!box) return;
  const arten = genre && genre.songarten;
  box.innerHTML = '';
  box.hidden = !arten || !arten.length;
  /* Die Gruppe braucht Platz, den die Kopfleiste bei 1280 px nicht hat.
     Statt sie schrumpfen zu lassen, ruecken in diesen Welten Abstaende,
     Knoepfe und Regler zusammen - siehe .bar.mit-songart. */
  const leiste = document.querySelector('.bar');
  if(leiste) leiste.classList.toggle('mit-songart', !box.hidden);
  if(box.hidden) return;
  arten.forEach(function(a){
    const an = a.id === songartId;
    const b = el('button','songart'+(an?' on':''));
    b.type = 'button';
    b.textContent = a.name;
    b.setAttribute('aria-pressed', an ? 'true' : 'false');
    b.title = a.lang + ' · ' + a.bpm + ' BPM · ' + a.scaleName;
    b.setAttribute('data-hint', '<b>' + a.lang + '</b> &middot; ' + a.bpm
      + ' BPM &middot; ' + a.scaleName + '. ' + a.text);
    b.addEventListener('click', function(){ setzeSongart(a.id); });
    box.appendChild(b);
  });
}

function openGenre(g, override){
  if(playing) stop();
  if(songBars.length) disposeSongAudio();
  genre = g;
  const r = document.documentElement.style;
  r.setProperty('--ac', g.ac); r.setProperty('--ac2', g.ac2);
  /* Die beiden Druckfarben der Welt auch dem Stylesheet geben - der
     Editor liegt jetzt auf gedrucktem Grund und braucht sie fuer
     Raender, Marken und Umrisse. */
  const tinten = risoFarben(g);
  r.setProperty('--riso1', tinten[0]); r.setProperty('--riso2', tinten[1]);
  r.setProperty('--world1', g.bg1); r.setProperty('--world2', g.bg2);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if(themeMeta) themeMeta.setAttribute('content', g.bg2);
  const st = override || loadState(g.id);
  /* Songart zuerst: sie schreibt Tempo, Grundton und Tonleiter in die Welt,
     und alles darunter liest genau die. Welten ohne `songarten` merken
     davon nichts. */
  setzeSongart(st && st.songart, true);
  bpm = st && st.bpm ? st.bpm : g.bpm;
  swingPct = st && st.swingPct !== undefined ? st.swingPct : (g.swing || 0);
  masterVol = st && st.masterVol !== undefined ? st.masterVol : 0.8;
  setzePlattenPegel(st && st.plattenPegel !== undefined ? st.plattenPegel : 0.1);
  songMode = st ? !!st.songMode : false;
  curBar = 0; playBar = 0;
  songBars = hydrateSongBars(g, st);
  if(!songBars.length) songBars = [{selectedUid:null, tracks:[makeTrack(g.chars[0])]}];
  barCount = songBars.length;
  activateBar(0);
  $('#genreChip').textContent = g.name;
  /* Welten mit einer Figur je Kanal sagen das oben in der Kopfleiste.
     In der Figurenliste stand es vorher zu weit unten - dort liest es
     niemand. Ein Satz, fett, neben dem Namen. */
  const note = $('#weltNote');
  if(note){
    const kurz = g.onePerCat
      ? (g.kanalkurz || ('Nur ' + (g.catOrder || CATS).length + ' Kanäle, also höchstens ' + (g.catOrder || CATS).length + ' Figuren.'))
      : '';
    note.textContent = kurz;
    note.hidden = !kurz;
    note.title = g.kanaltext || kurz;
  }
  $('#bpm').value = bpm; $('#bpmOut').textContent = bpm;
  $('#swing').value = swingPct; $('#swingOut').textContent = swingPct + '%';
  $('#master').value = Math.round(masterVol*100); $('#masterOut').textContent = Math.round(masterVol*100);
  $('#screenPick').hidden = true;
  $('#screenMix').hidden = false;
  startFrameLoop();
  ensureAudio();
  /* Klangdateien im Hintergrund holen; ohne sie klingt alles synthetisch */
  if(typeof ladeKlangdateien === 'function'){
    ladeKlangdateien().then(function(){
      if(typeof klangdateienAktiv === 'function' && klangdateienAktiv()) buildBuses();
      /* Konnten die Aufnahmen nicht geladen werden, klingt jede Figur
         synthetisch. Ohne Hinweis sieht das aus wie ein Klangfehler und man
         sucht an der falschen Stelle - deshalb steht es jetzt in der Zeile. */
      const warum = typeof sampleHinweis === 'function' ? sampleHinweis() : null;
      if(warum) zeigeKlangwarnung(warum);
    }).catch(function(){});
  }
  if(actx.state === 'suspended') actx.resume();
  master.gain.value = masterVol;
  if(delNode) delNode.delayTime.value = delayZeit();
  tracks.forEach(buildChain); applyAll();
  renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector();
  paintStagePrint(); watchStage(); setzeRegen(g); setzeSterne(g);
  markStageDirty();
  rotateTip();
}
/* Alles auf Anfang - der Knopf fragt vorher einmal nach */
function resetAll(){
  stop();
  disposeSongAudio();
  barCount = 1; curBar = 0; playBar = 0; songMode = false;
  bpm = genre.bpm; swingPct = genre.swing || 0; masterVol = 0.8;
  $('#bpm').value = bpm; $('#bpmOut').textContent = bpm;
  $('#swing').value = 0; $('#swingOut').textContent = '0%';
  $('#master').value = 80; $('#masterOut').textContent = '80';
  if(master) master.gain.value = masterVol;
  if(delNode) delNode.delayTime.value = delayZeit();
  const erste = makeTrack(genre.chars[0]);
  songBars = [{selectedUid:erste.uid, tracks:[erste]}];
  activateBar(0);
  buildChain(erste); applyAll();
  renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector(); save();
  hint('Alles auf Anfang. <b>'+genre.chars[0].name+'</b> steht wieder allein auf der Bühne.');
}
let resetTimer = null;
function disarmReset(){
  const b = $('#resetBtn');
  if(b){ b.classList.remove('warn'); b.textContent = 'Neu'; }
  clearTimeout(resetTimer); resetTimer = null;
}
function backToPick(){
  disarmReset();
  stop(); save();
  disposeSongAudio();
  $('#screenMix').hidden = true;
  $('#screenPick').hidden = false;
  renderGenreCards();
}

/* ---------- 12. Figurenkiste ---------- */
function renderRoster(){
  const box = $('#roster');
  box.innerHTML = '';
  const order = genre.catOrder || CATS.map(function(c){ return c.id; });
  order.forEach(function(cid){
    const cat = CATS.filter(function(c){ return c.id === cid; })[0];
    if(!cat) return;
    const chars = genre.chars.filter(function(c){ return c.cat === cat.id; });
    if(!chars.length) return;
    const lab = el('h2','rlabel','<i></i>'+((genre.catLabels && genre.catLabels[cid]) || cat.label));
    lab.style.setProperty('--c', genre.cats[cat.id]);
    box.appendChild(lab);
    const grid = el('div','rgrid');
    chars.forEach(function(p){
      const used = tracks.some(function(t){ return t.p.id === p.id; });
      const item = el('button','rchar'+(used?' used':''));
      item.type = 'button';
      item.disabled = used;
      item.style.setProperty('--c', genre.cats[p.cat]);
      item.draggable = !used;
      item.setAttribute('aria-label', used ? p.name+' ist in diesem Takt schon dabei' : p.name+' zu diesem Takt hinzufügen');
      item.setAttribute('data-hint', used
        ? '<b>'+p.name+'</b> ist in diesem Takt schon dabei.'
        : '<b>'+p.name+'</b> antippen und loslegen.');
      /* Auch die Figurenliste zeigt den Druck, nicht das rohe Sprite -
         sonst stehen daneben gedruckte Figuren auf der Buehne. */
      /* In der Liste steht der saubere Druck: Platten genau
         uebereinander, kein Versatz. */
      const cv = el('canvas');
      const pl = risoPlatten(p.sprite, genre, 3);
      cv.width = pl.w; cv.height = pl.h;
      zeichneFigur(cv.getContext('2d'), pl, 0, 0, 0, 0, 0, 0);
      item.appendChild(cv);
      item.appendChild(el('span','',p.name));
      if(!used){
        item.addEventListener('click', function(){ addTrack(p); });
        item.addEventListener('dragstart', function(e){
          e.dataTransfer.setData('text/plain', p.id);
          e.dataTransfer.effectAllowed = 'copy';
        });
      }
      grid.appendChild(item);
    });
    box.appendChild(grid);
  });
}
function addTrack(p){
  if(tracks.some(function(t){ return t.p.id === p.id; })) return;
  let ersetzt = null;
  if(genre.onePerCat){
    /* ein Kanal, eine Stimme - die neue Figur löst die alte ab */
    const alt = tracks.filter(function(t){ return t.p.cat === p.cat; });
    alt.forEach(disconnectTrack);
    if(alt.length){
      ersetzt = alt[0].p.name;
      for(let i=tracks.length-1;i>=0;i--) if(tracks[i].p.cat === p.cat) tracks.splice(i,1);
    }
  }
  if(tracks.length >= MAX_TRACKS){ hint('Dieser Takt ist voll. Nimm erst eine Figur herunter.'); return; }
  const t = makeTrack(p);
  tracks.push(t);
  ensureAudio(); if(actx.state === 'suspended') actx.resume();
  buildChain(t); applyAll();
  rememberSelection(t.uid);
  renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector(); save();
  hint(ersetzt
    ? '<b>'+p.name+'</b> übernimmt den Kanal von <b>'+ersetzt+'</b>.'
    : '<b>'+p.name+'</b> spielt jetzt in Takt '+(curBar+1)+'.');
  if(!playing) audition(t, t.steps.find(function(s){ return s !== null; }) || 4);
  markStageDirty();
}
function removeTrack(uid){
  const i = tracks.findIndex(function(t){ return t.uid === uid; });
  if(i < 0) return;
  const t = tracks[i];
  disconnectTrack(t);
  tracks.splice(i,1);
  if(selUid === uid) rememberSelection(tracks.length ? tracks[0].uid : null);
  renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector(); save();
  hint('<b>'+t.p.name+'</b> ist nur aus Takt '+(curBar+1)+' entfernt.');
  markStageDirty();
}
function selectTrack(uid){
  rememberSelection(uid);
  renderStage(); renderInspector();
  document.querySelectorAll('.trow').forEach(function(r){
    r.classList.toggle('sel', +r.dataset.uid === uid);
  });
}

/* ---------- 13. Bühne ---------- */
let stageDirty = true;
function markStageDirty(){ stageDirty = true; }
function renderStage(){
  const box = $('#slots');
  box.innerHTML = '';
  tracks.forEach(function(t){
    const slot = el('div','slot'+(t.uid===selUid?' sel':'')+(t.mute?' muted':''));
    slot.style.setProperty('--c', genre.cats[t.p.cat]);
    const choose = el('button','slot-select');
    choose.type = 'button';
    choose.setAttribute('aria-label', t.p.name+' auswählen');
    choose.setAttribute('data-hint','<b>'+t.p.name+'</b> auswählen.');
    /* 140 statt 110: die Figur ist 100 hoch und steht 15 ueber dem
       Boden - bei 110 fehlten schon in Ruhe 5 Pixel und beim Absprung
       20. Das Canvas waechst nach oben, die Figur bleibt stehen. */
    const cv = el('canvas'); cv.width = 96; cv.height = 140;
    t.cv = cv;
    choose.appendChild(cv);
    choose.appendChild(el('span','nameplate', t.p.name));
    choose.addEventListener('click', function(){ selectTrack(t.uid); });
    slot.appendChild(choose);
    const kill = el('button','kill','✕');
    kill.type = 'button';
    kill.setAttribute('aria-label', t.p.name+' aus diesem Takt entfernen');
    kill.setAttribute('data-hint','<b>'+t.p.name+'</b> nur aus diesem Takt nehmen.');
    kill.addEventListener('click', function(){ removeTrack(t.uid); });
    slot.appendChild(kill);
    box.appendChild(slot);
  });
  if(tracks.length < MAX_TRACKS){
    /* Auf dem Tablet gibt es kein Ziehen: HTML5-Drag haengt dort am
       langen Druck und wird nicht gefunden. Der rettende Hinweis kaeme
       ueber `mouseover` - den es auf Touch auch nicht gibt. Also sagt die
       Beschriftung selbst, was geht. */
    const tippen = !!(window.matchMedia && matchMedia('(hover: none), (pointer: coarse)').matches);
    const empty = el('div','slot empty', tippen
      ? '<em>+</em><span>FIGUR<br>ANTIPPEN</span>'
      : '<em>+</em><span>FIGUR HIER<br>ABLEGEN</span>');
    empty.setAttribute('data-hint', tippen
      ? 'Tipp in der Kiste eine Figur an &ndash; sie stellt sich von allein auf die Bühne.'
      : 'Zieh eine Figur aus der Kiste links hierher &ndash; oder klick sie einfach an.');
    empty.addEventListener('dragover', function(e){ e.preventDefault(); empty.classList.add('drop'); });
    empty.addEventListener('dragleave', function(){ empty.classList.remove('drop'); });
    empty.addEventListener('drop', function(e){
      e.preventDefault(); empty.classList.remove('drop');
      const id = e.dataTransfer.getData('text/plain');
      const p = genre.chars.find(function(c){ return c.id === id; });
      if(p) addTrack(p);
    });
    box.appendChild(empty);
  }
  renderPlatte();
  markStageDirty();
}
/* Bühne: alles rastert auf P Pixel, damit nichts weichgezeichnet wirkt.
   Beim Treffer staucht die Figur erst (Aufprall) und springt dann. */
const P = 5;
function spawnSparks(t, cv){
  if(!t.sparks) t.sparks = [];
  const n = 3 + Math.floor(Math.random()*3);
  for(let k=0;k<n;k++){
    t.sparks.push({
      x: cv.width/2 + (Math.random()*44-22), y: cv.height - 22,
      vx: (Math.random()-0.5)*1.4, vy: -(0.7+Math.random()*1.5), life: 1
    });
  }
  if(t.sparks.length > 30) t.sparks.splice(0, t.sparks.length-30);
}
function drawSparks(t, g, col){
  if(!t.sparks || !t.sparks.length) return;
  for(let i=t.sparks.length-1;i>=0;i--){
    const s = t.sparks[i];
    s.x += s.vx; s.y += s.vy; s.vy += 0.05; s.life -= 0.032;
    if(s.life <= 0){ t.sparks.splice(i,1); continue; }
    g.globalAlpha = s.life;
    g.fillStyle = s.life > 0.62 ? '#ffffff' : col;
    g.fillRect(Math.round(s.x/P)*P, Math.round(s.y/P)*P, P, P);
  }
  g.globalAlpha = 1;
}
function drawStage(){
  if(!genre) return;
  const now = actx ? actx.currentTime : 0;
  for(let i=0;i<tracks.length;i++){
    const t = tracks[i], cv = t.cv;
    if(!cv) continue;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0,0,cv.width,cv.height);
    const sp = spriteCanvas(t.p.sprite, genre, P, true);
    const pl = risoPlatten(t.p.sprite, genre, P);
    /* Schatten und Funken in der Druckfarbe der Welt - die
       Kategoriefarben sind fuer den Bildschirm gemacht und leuchten
       auf gedrucktem Grund wie Neon. */
    const col = risoFarben(genre)[0];
    const since = now - t.hitAt;
    const e = (since >= 0 && since < 0.3) ? 1 - since/0.3 : 0;
    if(t.hitAt !== t.seen && since >= 0 && since < 0.12 && !t.mute){ t.seen = t.hitAt; spawnSparks(t, cv); }

    const cx = Math.round(cv.width/2/P)*P, base = cv.height - 3*P;
    /* gepixelter Schatten aus zwei Streifen statt einer weichen Ellipse */
    const w0 = (6 + Math.round(2*e))*P;
    g.globalAlpha = 0.18 + 0.34*e;
    g.fillStyle = col;
    g.fillRect(cx-w0/2, base, w0, P);
    g.fillRect(cx-w0/2+P, base+P, w0-2*P, P);
    g.globalAlpha = 1;

    let dx = 0, dy = 0;
    if(e > 0.72){ dy = P; }                         /* Aufprall */
    else if(e > 0.34){ dy = -2*P; dx = i%2 ? P : -P; } /* Absprung */
    const beat = playing ? Math.sin(now*Math.PI*bpm/60) : -1;
    if(beat > 0) dy -= P;
    const drawX = Math.round((cx-sp.width/2+dx)/P)*P;
    /* Der Versatz haengt an der Anschlagshuellkurve: in Ruhe null,
       beim Treffer voll, dann laeuft er zurueck. Ruckweise, in fuenf
       Stufen je Sekunde - fliessend saehe es nach Wackeln aus, nicht
       nach Druck. */
    const stufe = Math.floor(now*5);
    const weit = e * VERSATZ_MAX;
    const ax = Math.round((ruckZufall(stufe, i*4+1) - 0.5) * 2 * weit) - Math.round(e*VERSATZ_MAX*0.5);
    const ay = Math.round((ruckZufall(stufe, i*4+2) - 0.5) * 2 * weit);
    const bx = Math.round((ruckZufall(stufe, i*4+3) - 0.5) * 2 * weit) + Math.round(e*VERSATZ_MAX*0.5);
    const by = Math.round((ruckZufall(stufe, i*4+4) - 0.5) * 2 * weit);
    zeichneFigur(g, pl, drawX - pl.rand, base - sp.height + dy - pl.rand, ax, ay, bx, by);
    drawSparks(t, g, col);
  }
}

/* ---------- 14. Timeline ---------- */
let numEls = [];
function renderTimeline(){
  const nums = $('#tlNums'), rows = $('#tlRows');
  nums.innerHTML = ''; rows.innerHTML = '';
  numEls = [];
  nums.appendChild(el('div'));
  for(let i=0;i<16;i++){
    const n = el('div','n'+(i%4===0?' beat':''), String(i+1));
    nums.appendChild(n); numEls.push(n);
  }
  $('#tlEmpty').hidden = tracks.length > 0;
  tracks.forEach(function(t){
    const row = el('div','trow grid'+(t.uid===selUid?' sel':'')+(t.mute?' muted':''));
    row.dataset.uid = t.uid;
    row.style.setProperty('--c', genre.cats[t.p.cat]);
    const rh = el('button','rh','<i></i><b>'+t.p.name+'</b>');
    rh.type = 'button';
    const hk = heightKind(t);
    rh.setAttribute('data-hint','<b>'+t.p.name+'</b> auswählen. Die Balkenhöhe ist hier '+
      (hk === 'ton' ? 'die Tonhöhe.' : hk === 'farbe' ? 'die Rauschfarbe: unten Trommel, oben Hi-Hat.' : 'die Wucht des Schlags.'));
    rh.addEventListener('click', function(){ selectTrack(t.uid); });
    row.appendChild(rh);
    t.cells = [];
    for(let i=0;i<16;i++){
      const cell = el('div','cell'+(i%4===0?' q':''));
      cell.setAttribute('role','button');
      cell.tabIndex = i === 0 ? 0 : -1;
      cell._track = t; cell._step = i;
      cell.appendChild(el('div','stepbar'));
      paintCell(cell, bar(t)[i]);
      wireCell(cell, t, i);
      row.appendChild(cell);
      t.cells.push(cell);
    }
    rows.appendChild(row);
  });
  curHead = -1;
}
const CELL_H = 48;
function paintCell(cell, h){
  const bar = cell.firstChild;
  if(h === null || h === undefined){ cell.classList.add('off'); }
  else {
    cell.classList.remove('off');
    /* absolute Pixel statt Prozent: funktioniert unabhängig vom Render-Modus */
    bar.style.height = Math.round(5 + (h/7)*(CELL_H-9)) + 'px';
  }
  const track = cell._track;
  if(track){
    const off = h === null || h === undefined;
    cell.setAttribute('aria-pressed', String(!off));
    cell.setAttribute('aria-label', track.p.name+', Schritt '+(cell._step+1)+', '+(off ? 'aus' : 'Stufe '+(h+1)));
  }
}
let lastAud = 0;
function wireCell(cell, t, i){
  cell.addEventListener('keydown', function(event){
    let value = bar(t)[i];
    if(event.key === 'Enter' || event.key === ' '){
      event.preventDefault();
      value = value === null || value === undefined ? 4 : null;
      bar(t)[i] = value; paintCell(cell, value); save();
      if(value !== null) audition(t, value);
      return;
    }
    if(event.key === 'ArrowUp' || event.key === 'ArrowDown'){
      event.preventDefault();
      value = value === null || value === undefined ? 4 : value;
      value = clamp(value + (event.key === 'ArrowUp' ? 1 : -1), 0, 7);
      bar(t)[i] = value; paintCell(cell, value); audition(t, value); save();
      return;
    }
    if(event.key === 'ArrowLeft' || event.key === 'ArrowRight'){
      event.preventDefault();
      const next = clamp(i + (event.key === 'ArrowRight' ? 1 : -1), 0, 15);
      if(t.cells && t.cells[next]){
        t.cells.forEach(function(other){ other.tabIndex = -1; });
        t.cells[next].tabIndex = 0; t.cells[next].focus();
      }
    }
  });
  cell.addEventListener('contextmenu', function(e){
    e.preventDefault(); bar(t)[i] = null; paintCell(cell, null); save();
    hint('Schritt '+(i+1)+' gelöscht.');
  });
  cell.addEventListener('pointerdown', function(ev){
    if(ev.button === 2) return;
    ev.preventDefault();
    if(selUid !== t.uid) selectTrack(t.uid);
    const st = {y: ev.clientY, h: (bar(t)[i] === null || bar(t)[i] === undefined) ? 4 : bar(t)[i], was: bar(t)[i], moved: false};
    try{ cell.setPointerCapture(ev.pointerId); }catch(e){}
    function move(e2){
      const dy = st.y - e2.clientY;
      if(Math.abs(dy) < 5) return;
      st.moved = true;
      const nh = clamp(st.h + Math.round(dy/8), 0, 7);
      if(bar(t)[i] !== nh){
        bar(t)[i] = nh; paintCell(cell, nh);
        const now = performance.now();
        if(now - lastAud > 80){ lastAud = now; audition(t, nh); }
        hint(stepHint(t, i, nh));
      }
    }
    function up(){
      cell.removeEventListener('pointermove', move);
      cell.removeEventListener('pointerup', up);
      cell.removeEventListener('pointercancel', up);
      if(!st.moved){
        if(st.was === null || st.was === undefined){ bar(t)[i] = st.h; paintCell(cell, st.h); audition(t, st.h); }
        else { bar(t)[i] = null; paintCell(cell, null); }
      }
      hint(stepHint(t, i, bar(t)[i]));
      save();
    }
    cell.addEventListener('pointermove', move);
    cell.addEventListener('pointerup', up);
    cell.addEventListener('pointercancel', up);
  });
}
/* Was die Balkenhöhe für diese Figur bedeutet */
function heightKind(t){
  if(TONAL[t.p.engine]) return 'ton';
  if(t.p.engine === 'gbnoise') return 'farbe';
  return 'wucht';
}
function stepHint(t, i, h){
  if(h === null || h === undefined) return 'Schritt '+(i+1)+' von <b>'+t.p.name+'</b> ist aus. Klick setzt ihn wieder.';
  const k = heightKind(t), vor = 'Schritt '+(i+1)+' &middot; <b>'+t.p.name+'</b>';
  if(k === 'ton') return vor+' spielt '+noteName(t,h)+'. Zieh weiter hoch oder runter für andere Töne.';
  if(k === 'farbe') return vor+': '+(h<3?'dumpfes Rauschen, klingt wie eine Trommel':h<5?'mittleres Rauschen, wie eine Snare':'helles Zischen, wie eine Hi-Hat')+'. Die Höhe ist hier die Rauschfarbe.';
  return vor+', Wucht '+(h+1)+' von 8. Hochziehen macht den Schlag härter.';
}
function refreshCells(){
  tracks.forEach(function(t){
    if(!t.cells) return;
    const b = bar(t);
    for(let i=0;i<16;i++) paintCell(t.cells[i], b[i]);
  });
}
function showBar(i){
  activateBar(i);
  if(!songMode) playBar = curBar;
  renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector();
  markStageDirty();
}
function setHead(s, b){
  if(b !== undefined && b !== curBar){
    activateBar(b);
    renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector();
  }
  if(s === curHead) return;
  if(curHead >= 0){
    if(numEls[curHead]) numEls[curHead].classList.remove('head');
    tracks.forEach(function(t){ if(t.cells && t.cells[curHead]) t.cells[curHead].classList.remove('head','fire'); });
  }
  curHead = s;
  if(s >= 0){
    if(numEls[s]) numEls[s].classList.add('head');
    tracks.forEach(function(t){
      if(!t.cells || !t.cells[s]) return;
      t.cells[s].classList.add('head');
      if(bar(t)[s] !== null && bar(t)[s] !== undefined) t.cells[s].classList.add('fire');
    });
  }
}
function pumpVis(){
  if(!actx || !playing) return;
  const now = actx.currentTime;
  let ev = null;
  while(visQ.length && visQ[0].t <= now){ ev = visQ.shift(); }
  if(ev) setHead(ev.s, ev.b);
}

/* ---------- 14b. Takte ---------- */
function renderBars(){
  const box = $('#bars');
  if(!box) return;
  box.innerHTML = '';
  box.appendChild(el('span','lab','TAKT'));
  /* Die Takte laufen in einer eigenen, waagerecht scrollenden Spur.
     Vorher lagen sie direkt in der Leiste und brachen bei vielen
     Takten in weitere Zeilen um - das frisst die Buehne. Die
     Steuerung bleibt bewusst ausserhalb der Spur, sonst waere sie bei
     dreissig Takten weit rechts weggescrollt. */
  const spur = el('div','barspur');
  for(let i=0;i<barCount;i++){
    const count = tracksAt(i).length;
    const c = el('button','barchip'+(i===curBar?' on':'')+(playing && i===playBar?' playing':''),
      '<b>'+String(i+1)+'</b><small>'+count+' '+(count===1?'Figur':'Figuren')+'</small>');
    c.type = 'button';
    c.setAttribute('aria-label','Takt '+(i+1)+', '+count+' '+(count===1?'Figur':'Figuren'));
    c.setAttribute('data-hint','Takt '+(i+1)+' von '+barCount+' anzeigen und bearbeiten.');
    c.addEventListener('click', function(){ closePop(); showBar(i); });
    spur.appendChild(c);
  }
  box.appendChild(spur);
  const steuer = el('div','barsteuer');
  if(barCount > 1){
    /* Verschieben statt loeschen und neu bauen: die Reihenfolge der
       Takte war bisher die Reihenfolge, in der man sie angelegt hat. */
    [[-1, '&#9664;', 'nach vorne'], [1, '&#9654;', 'nach hinten']].forEach(function(m){
      const b = el('button', 'barchip barmove', m[1]);
      b.type = 'button';
      const ziel = curBar + m[0];
      b.disabled = ziel < 0 || ziel >= barCount;
      b.setAttribute('aria-label', 'Takt ' + (curBar+1) + ' ' + m[2] + ' schieben');
      b.setAttribute('data-hint', 'Schiebt Takt ' + (curBar+1) + ' einen Platz ' + m[2] + '.');
      b.addEventListener('click', function(){ moveBar(m[0]); });
      steuer.appendChild(b);
    });
  }
  if(barCount < MAX_BARS){
    const add = el('button','barchip addbar','+ TAKT');
    add.type = 'button';
    add.setAttribute('data-hint','Hängt einen neuen Takt an den Song an &ndash; als Kopie des jetzigen oder leer.');
    add.addEventListener('click', function(e){ e.stopPropagation(); openBarPop(add); });
    steuer.appendChild(add);
  }
  if(barCount > 1){
    const del = el('button','barchip barkill','✕');
    del.type = 'button';
    del.setAttribute('aria-label','Takt '+(curBar+1)+' löschen');
    del.setAttribute('data-hint','Löscht Takt '+(curBar+1)+' aus dem Song.');
    del.addEventListener('click', removeBar);
    steuer.appendChild(del);
  }
  const modes = el('div','modes');
  const m1 = el('button','mode'+(songMode?'':' on'),'&#8635; Takt');
  m1.type = 'button';
  m1.setAttribute('data-hint','<b>Takt wiederholen</b> &ndash; nur der angezeigte Takt läuft in Schleife. Zum Bauen.');
  m1.addEventListener('click', function(){ setSongMode(false); });
  const m2 = el('button','mode'+(songMode?' on':''),'&#9654; Song');
  m2.type = 'button';
  m2.setAttribute('data-hint','<b>Song spielen</b> &ndash; alle Takte laufen hintereinander, die Timeline springt mit.');
  m2.addEventListener('click', function(){ setSongMode(true); });
  modes.appendChild(m1); modes.appendChild(m2);
  box.appendChild(steuer);
  box.appendChild(modes);

  /* Den angezeigten Takt in die Spur holen - bei dreissig Takten liegt
     er sonst ausserhalb. Von Hand statt scrollIntoView(), das zieht
     sonst die ganze Seite mit. */
  const aktiv = spur.querySelector('.barchip.on');
  if(aktiv){
    const links = aktiv.offsetLeft, rechts = links + aktiv.offsetWidth;
    if(links < spur.scrollLeft) spur.scrollLeft = links - 8;
    else if(rechts > spur.scrollLeft + spur.clientWidth) spur.scrollLeft = rechts - spur.clientWidth + 8;
  }
}
function setSongMode(on){
  songMode = on;
  if(!on) playBar = curBar;
  renderBars(); save();
  hint(on
    ? 'Song-Modus: alle '+barCount+' '+(barCount===1?'Takt':'Takte')+' laufen hintereinander, die Timeline springt mit.'
    : 'Takt-Modus: Takt '+(curBar+1)+' läuft in Schleife &ndash; so kannst du in Ruhe daran bauen.');
}
function addBar(copy){
  closePop();
  if(barCount >= MAX_BARS){ hint('Mehr als '+MAX_BARS+' Takte gehen nicht.'); return; }
  const from = curBar+1;
  const selectedIndex = tracks.findIndex(function(track){ return track.uid === selUid; });
  const nextTracks = copy ? tracks.map(cloneTrack) : [];
  songBars.push({
    selectedUid: nextTracks[selectedIndex] ? nextTracks[selectedIndex].uid : (nextTracks[0] ? nextTracks[0].uid : null),
    tracks: nextTracks
  });
  barCount = songBars.length;
  activateBar(barCount-1);
  if(!songMode) playBar = curBar;
  renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector(); save();
  hint(copy
    ? 'Takt '+barCount+' kopiert Takt '+from+'. Figuren und Regler sind jetzt unabhängig.'
    : 'Takt '+barCount+' startet leer. Such dir eine neue Besetzung aus.');
  markStageDirty();
}
/* Einen Takt an eine andere Stelle im Song schieben.

   Es reicht, die Plaetze im Array zu tauschen: Figuren und Muster
   haengen am Takt, nicht an seiner Nummer. Der angezeigte Takt wandert
   mit, damit man nicht ploetzlich einen anderen vor sich hat. */
function moveBar(delta){
  const ziel = curBar + delta;
  if(ziel < 0 || ziel >= barCount) return;
  const merk = songBars[curBar];
  songBars[curBar] = songBars[ziel];
  songBars[ziel] = merk;
  /* playBar zeigt auf eine Stelle im Song, nicht auf einen Inhalt -
     ohne Mitziehen springt die Wiedergabe beim Verschieben. */
  if(playBar === curBar) playBar = ziel;
  else if(playBar === ziel) playBar = curBar;
  activateBar(ziel);
  if(!songMode) playBar = curBar;
  renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector(); save();
  hint('Takt steht jetzt an Stelle ' + (ziel+1) + ' von ' + barCount + '.');
  markStageDirty();
}

function removeBar(){
  if(barCount <= 1) return;
  const gone = curBar+1;
  const removed = songBars.splice(curBar,1)[0];
  (removed.tracks || []).forEach(disconnectTrack);
  barCount = songBars.length;
  if(curBar >= barCount) curBar = barCount-1;
  if(playBar >= barCount) playBar = barCount-1;
  activateBar(curBar);
  renderRoster(); renderStage(); renderBars(); renderTimeline(); renderInspector(); save();
  hint('Takt '+gone+' gelöscht. Der Song hat jetzt '+barCount+' '+(barCount===1?'Takt':'Takte')+'.');
  markStageDirty();
}
function openBarPop(anchor){
  closePop();
  const p = el('div','pop'); p.id = 'barPop';
  const b1 = el('button', null, '<b>Takt '+(curBar+1)+' kopieren</b>'+ 
    '<span>Figuren, Muster und Regler kopieren.</span>');
  b1.type = 'button';
  b1.addEventListener('click', function(){ addBar(true); });
  const b2 = el('button', null, '<b>Leer anfangen</b>'+ 
    '<span>Neue Figuren für einen neuen Teil.</span>');
  b2.type = 'button';
  b2.addEventListener('click', function(){ addBar(false); });
  p.appendChild(b1); p.appendChild(b2);
  /* Bezug ist die ganze Taktleiste, nicht der Elternknoten: seit die
     Steuerung in einer eigenen Gruppe sitzt, ist deren Breite kleiner
     als das Menue - die Klammer wurde negativ und das Menue rutschte
     an den linken Rand. */
  const rahmen = anchor.closest('.bars') || anchor.parentNode;
  rahmen.appendChild(p);
  p.style.left = Math.max(6, Math.min(anchor.offsetLeft - 40, rahmen.clientWidth - 274)) + 'px';
  p.style.top = (anchor.offsetTop + anchor.offsetHeight + 6) + 'px';
  b1.focus();
}
function closePop(){
  const p = $('#barPop'); if(p) p.remove();
  const t = $('#tellerPop'); if(t) t.remove();
}

/* ---------- Schallplatte ----------
   Das Grundrauschen einer Welt war fest verdrahtet: setAmbienceLevel() gibt es
   seit jeher, nur nie einen Regler dazu. Statt eines weiteren Schiebers oben in
   der Leiste sitzt er dort, wo er hingehoert - an einer Platte, die in der Welt
   liegt und sich dreht, solange gespielt wird. Sie erscheint nur in Welten, die
   ueberhaupt ein Grundrauschen haben, und kostet sonst keinen Platz. */
/* Vorgabe 10 %: das Knistern soll man ahnen, nicht hoeren. */
let plattenPegel = 0.1;
function setzePlattenPegel(v){
  plattenPegel = Math.max(0, Math.min(1, v));
  if(typeof setAmbienceLevel === 'function') setAmbienceLevel(plattenPegel);
}
function renderPlatte(){
  const buehne = $('#slots'); if(!buehne || !buehne.parentNode) return;
  const alt = $('#platte'); if(alt) alt.remove();
  if(typeof ambienceOn !== 'function' || !ambienceOn()) return;
  const b = el('button','platte'); b.id = 'platte'; b.type = 'button';
  b.setAttribute('aria-label','Schallplatte: Knistern einstellen');
  b.innerHTML = '<span class="platte-loch"></span>';
  b.addEventListener('click', function(e){ e.stopPropagation(); openTellerPop(b); });
  buehne.parentNode.appendChild(b);
}
function openTellerPop(anchor){
  closePop();
  const p = el('div','pop tellerpop'); p.id = 'tellerPop';
  const wert = Math.round(plattenPegel*100);
  p.innerHTML = '<b>Knistern</b><span>Das Rauschen der Schallplatte. Auf 0 ist es ganz aus.</span>' +
    '<input type="range" min="0" max="100" step="1" value="' + wert + '">' +
    '<output>' + wert + '%</output>';
  const schieber = p.querySelector('input'), anzeige = p.querySelector('output');
  schieber.addEventListener('input', function(){
    setzePlattenPegel(+this.value/100);
    anzeige.textContent = this.value + '%';
  });
  schieber.addEventListener('change', save);
  anchor.parentNode.appendChild(p);
  /* Wie die Platte selbst am rechten Rand verankern statt eine Position
     auszurechnen: dann stimmt es unabhaengig von der Buehnenbreite. */
  p.style.left = 'auto';
  p.style.right = '10px';
  p.style.bottom = (anchor.offsetHeight + 18) + 'px';
  p.style.top = 'auto';
  schieber.focus();
}
