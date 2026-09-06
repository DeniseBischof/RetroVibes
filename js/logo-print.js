/* ============================================================
   Der Schriftzug als Risodruck
   ------------------------------------------------------------
   Der Rest der Weltwahl ist gedruckt, das Logo war bis eben das
   einzige, was nach Bildschirm aussah. Es laeuft jetzt durch
   dieselbe Presse wie die Kartengrafiken: zwei Farbplatten als
   Punktraster, gegeneinander versetzt, der Buchstabe selbst als
   ausgespartes Papier.

   Die Ueberschrift bleibt dabei echter Text. Das Canvas legt sich
   nur darueber, die <h1> behaelt ihren Inhalt und wird lediglich
   durchsichtig gefaerbt - markieren, suchen und Vorleseprogramme
   funktionieren weiter. Geht hier irgendetwas schief, bleibt der
   Ueberdruck aus dem Stylesheet stehen; angefasst wird die
   Ueberschrift erst, wenn das Bild wirklich steht.
   ============================================================ */
(function(){
  'use strict';

  const INDIGO = '#4a4a7a';
  const BURGUNDY = '#914e72';
  const PAPIER = '#f6ecd6';
  /* Deckung der beiden Platten. Unter 1, sonst sieht man vom Raster
     nichts - volle Deckung ist eine glatte Flaeche. */
  const DECKUNG = [0.60, 0.68];
  const VERSATZ = [[-5, -5], [6, 6]];   /* in CSS-Pixeln, je Platte */

  const logo = document.querySelector('.pick .logo');
  if(!logo || typeof RISO === 'undefined') return;

  let leinwand = null;
  let rahmen = 0;
  let zuletzt = '';      /* Masse des letzten Drucks, gegen Doppelarbeit */

  /* Die Buchstaben einmal als Schablone: nur der Alphakanal zaehlt. */
  function schablone(breite, hoehe, schrift, spatium, text, u){
    const cv = document.createElement('canvas');
    cv.width = breite; cv.height = hoehe;
    const g = cv.getContext('2d', {willReadFrequently: true});
    g.font = schrift;
    if('letterSpacing' in g) g.letterSpacing = spatium;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#000';
    g.fillText(text, breite/2, hoehe/2);
    return cv;
  }

  function drucke(){
    rahmen = 0;
    const text = (logo.textContent || '').trim();
    if(!text) return;

    const stil = getComputedStyle(logo);
    const groesse = parseFloat(stil.fontSize);
    if(!groesse) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const u = dpr;
    /* Rand fuer Passerversatz und Raster, sonst schneidet das Canvas
       die versetzten Platten ab. */
    const rand = Math.ceil(groesse * 0.28);
    const kastenB = Math.ceil(logo.clientWidth) + rand*2;
    const kastenH = Math.ceil(logo.clientHeight) + rand*2;
    if(kastenB < 8 || kastenH < 8) return;

    const W = Math.round(kastenB * u), H = Math.round(kastenH * u);
    const kennung = W + 'x' + H + '|' + text;
    if(kennung === zuletzt) return;
    zuletzt = kennung;
    const schrift = stil.fontWeight + ' ' + Math.round(groesse*u) + 'px ' + stil.fontFamily;
    const spatium = (parseFloat(stil.letterSpacing) || 0) * u + 'px';

    const pr = RISO.press(W, H, {inks: [INDIGO, BURGUNDY], paper: PAPIER});
    for(let n = 0; n < 2; n++){
      const s = schablone(W, H, schrift, spatium, text, u);
      pr.maske(s, Math.round(VERSATZ[n][0]*u), Math.round(VERSATZ[n][1]*u), n, DECKUNG[n]);
    }
    /* Der Buchstabe selbst: ausgespartes Papier, keine Farbe. */
    pr.maske(schablone(W, H, schrift, spatium, text, u), 0, 0, 2, 1);

    if(!leinwand){
      leinwand = document.createElement('canvas');
      leinwand.className = 'logo__druck';
      leinwand.setAttribute('aria-hidden', 'true');
      logo.appendChild(leinwand);
    }
    leinwand.width = W; leinwand.height = H;
    leinwand.style.top = -rand + 'px';
    leinwand.style.left = -rand + 'px';
    leinwand.style.width = kastenB + 'px';
    leinwand.style.height = kastenH + 'px';
    pr.render(leinwand.getContext('2d'), {
      pitch: 3.0*u, shift: 1.0*u, grain: 0.10, density: 0.95, transparent: true
    });
    /* Erst jetzt die echte Schrift durchsichtig stellen - bis hierher
       stand der Ueberdruck aus dem Stylesheet. */
    logo.classList.add('ist-gedruckt');
  }

  function anfordern(){
    if(!rahmen) rahmen = requestAnimationFrame(drucke);
  }

  /* Ohne geladene Schrift misst der Browser mit der Ersatzschrift und
     der Druck sitzt daneben. */
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(anfordern).catch(anfordern);
  } else {
    anfordern();
  }

  /* Am `resize`-Ereignis haengen reicht nicht: die Schriftgroesse
     kommt aus einem clamp() auf die Fensterbreite, und beim Ziehen
     lief der Druck los, bevor das Layout stand - das Canvas blieb dann
     zu schmal und schnitt die letzten Buchstaben ab. Der
     ResizeObserver meldet sich erst, wenn der Kasten wirklich steht. */
  if(typeof ResizeObserver !== 'undefined'){
    new ResizeObserver(anfordern).observe(logo);
  } else {
    window.addEventListener('resize', anfordern, {passive: true});
    window.addEventListener('orientationchange', anfordern, {passive: true});
  }
})();
