/* ---------- 18. Bedienung ---------- */
/* Fehlende Aufnahmen sind der einzige Hinweis, der wirklich zaehlt: ohne sie
   klingt jede Figur synthetisch, und man sucht den Fehler im Klang statt in
   der Auslieferung. Er steht deshalb unter der Weltenauswahl - sichtbar beim
   Start, und er kostet keinen Platz, wenn alles in Ordnung ist. */
function zeigeKlangwarnung(text){
  const fuss = document.querySelector('.pick-foot');
  if(!fuss || fuss.dataset.gewarnt) return;
  fuss.dataset.gewarnt = '1';
  const w = document.createElement('span');
  w.className = 'warnung';
  w.textContent = text;
  fuss.appendChild(document.createElement('br'));
  fuss.appendChild(w);
}

function wireTransport(){
  $('#playBtn').addEventListener('click', togglePlay);
  $('#helpBtn').addEventListener('click', openHelp);
  $('#expBtn').addEventListener('click', openExport);
  $('#resetBtn').addEventListener('click', function(){
    const b = this;
    if(resetTimer){ disarmReset(); resetAll(); return; }
    b.classList.add('warn'); b.textContent = 'Wirklich?';
    hint('Nochmal klicken, dann sind alle Figuren und Takte weg. Sonst einfach warten.');
    resetTimer = setTimeout(disarmReset, 5000);
  });
  $('#backBtn').addEventListener('click', backToPick);
  const coachClose = $('#coachClose');
  if(coachClose) coachClose.addEventListener('click', function(){
    $('#coach').hidden = true;
    try{ localStorage.setItem('taktbande.coach','1'); }catch(e){}
  });
  $('#bpm').addEventListener('input', function(e){
    bpm = +e.target.value; $('#bpmOut').textContent = bpm;
    if(delNode) delNode.delayTime.value = delayZeit();
    hint('Tempo: <b>'+bpm+' BPM</b>. '+(bpm<90?'Schleppend und schwer.':bpm>145?'Rennt.':'Solides Mittelfeld.'));
  });
  $('#bpm').addEventListener('change', save);
  $('#swing').addEventListener('input', function(e){
    swingPct = +e.target.value; $('#swingOut').textContent = swingPct + '%';
    hint('Swing: <b>'+swingPct+'%</b>. '+(swingPct<8?'Streng im Raster.':swingPct>35?'Deutlich schief, fast Shuffle.':'Leicht schwingend.'));
  });
  $('#swing').addEventListener('change', save);
  $('#master').addEventListener('input', function(e){
    masterVol = +e.target.value/100; $('#masterOut').textContent = e.target.value;
    if(master) master.gain.value = masterVol;
  });
  $('#master').addEventListener('change', save);

  document.addEventListener('keydown', function(e){
    const tag = (e.target.tagName || '').toLowerCase();
    if(e.key === 'Escape'){ closeHelp(); closeExport(); closePop(); return; }
    if(tag === 'input' || tag === 'textarea') return;
    if(e.code === 'Space'){ e.preventDefault(); if(!$('#screenMix').hidden) togglePlay(); }
    else if(e.key === 'ArrowLeft' && !$('#screenMix').hidden && curBar > 0){ showBar(curBar-1); }
    else if(e.key === 'ArrowRight' && !$('#screenMix').hidden && curBar < barCount-1){ showBar(curBar+1); }
    else if(e.key === 'Delete' && selUid !== null && !$('#screenMix').hidden){ removeTrack(selUid); }
    else if(e.key === '?' || e.key === 'h'){ if(!$('#screenMix').hidden) openHelp(); }
  });

  document.addEventListener('click', function(e){
    if(!e.target.closest || !e.target.closest('#barPop')) closePop();
  });
  document.addEventListener('mouseover', function(e){
    const n = e.target.closest ? e.target.closest('[data-hint]') : null;
    if(n){ hoverHint = true; hint(n.getAttribute('data-hint')); }
  });
  document.addEventListener('mouseout', function(e){
    const n = e.target.closest ? e.target.closest('[data-hint]') : null;
    if(n){ hoverHint = false; }
  });
  document.addEventListener('focusin', function(e){
    const n = e.target.closest ? e.target.closest('[data-hint]') : null;
    if(n) hint(n.getAttribute('data-hint'));
  });
  document.addEventListener('visibilitychange', function(){
    if(document.hidden && playing) stop();
    else{
      markStageDirty();
      startFrameLoop();
    }
  });
}

/* Die Namensnennung gehoert auf die erste Seite, nicht in ein Fenster, das
   man erst oeffnen muss: zwei der vier Sammlungen verlangen sie. Geladen wird
   dafuer nur das Manifest - ein paar Kilobyte JSON, keine einzige Aufnahme.
   Die Klangdateien selbst holt weiterhin erst openGenre(). */
function zeigeQuellen(){
  const fuss = document.querySelector('.pick-foot');
  if(!fuss || typeof creditsZeile !== 'function') return;
  const zeile = creditsZeile();
  if(!zeile) return;
  const alt = fuss.querySelector('.quellen');
  if(alt) alt.remove();
  const q = document.createElement('span');
  q.className = 'quellen';
  q.innerHTML = zeile;
  fuss.appendChild(q);
}

/* ---------- 19. Start ---------- */
let appAnimationFrame = 0;
function startFrameLoop(){
  if(!appAnimationFrame) appAnimationFrame = requestAnimationFrame(frame);
}
function frame(){
  appAnimationFrame = 0;
  if(document.hidden || $('#screenMix').hidden) return;
  pumpVis();
  const hasSparks = tracks.some(function(track){ return track.sparks && track.sparks.length; });
  if(playing || stageDirty || hasSparks){
    drawStage();
    stageDirty = false;
  }
  appAnimationFrame = requestAnimationFrame(frame);
}
/* Der Drehhinweis blendet sich per Media-Query selbst ein; hier haengt nur
   der Ausweg dran. Bewusst NICHT gespeichert: dreht jemand spaeter doch,
   verschwindet der Hinweis von allein, und beim naechsten Besuch hochkant
   soll er wieder da sein - sonst sieht ihn genau die Person nie wieder, die
   ihn beim ersten Mal weggetippt hat, ohne ihn zu lesen. */
const drehWeiter = $('#drehWeiter');
if(drehWeiter) drehWeiter.addEventListener('click', function(){
  document.body.classList.add('hochkant-egal');
});

renderGenreCards();
wireTransport();
if(typeof ladeManifest === 'function') ladeManifest().then(zeigeQuellen).catch(function(){});
hint(TIPS[0]);
setInterval(rotateTip, 9000);
startFrameLoop();
