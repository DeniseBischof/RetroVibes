/* ---------- 15. Inspektor ---------- */
const KNOBS = [
  {k:'pitch', label:'TONHÖHE', min:-12, max:12,
   get:function(P){ return P.pitch; }, set:function(P,v){ P.pitch = v; },
   fmt:function(v){ return (v>0?'+':'') + v + ' HT'; },
   tip:function(t){
     const k = heightKind(t);
     return k === 'ton' ? 'Verschiebt alle Töne dieser Figur. +12 ist genau eine Oktave höher.'
       : k === 'farbe' ? 'Schiebt das ganze Rauschen heller oder dunkler.'
       : 'Stimmt das Schlagzeug höher oder tiefer &ndash; tiefer klingt fetter.'; }},
  {k:'vol', label:'LAUTSTÄRKE', min:0, max:100,
   get:function(P){ return Math.round(P.vol*100); }, set:function(P,v){ P.vol = v/100; },
   fmt:function(v){ return v + '%'; },
   tip:function(){ return 'Wie laut diese Figur im Gesamtmix steht.'; }},
  {k:'tone', label:'KLANGFARBE', min:0, max:100,
   get:function(P){ return Math.round(P.tone*100); }, set:function(P,v){ P.tone = v/100; },
   fmt:function(v){ return v + '%'; },
   tip:function(){ return 'Ein Filter: links dumpf wie hinter einer Wand, rechts hell und direkt.'; }},
  {k:'len', label:'LÄNGE', min:0, max:100,
   get:function(P){ return Math.round(P.len*100); }, set:function(P,v){ P.len = v/100; },
   fmt:function(v){ return v + '%'; },
   tip:function(t){ return TONAL[t.p.engine]
     ? 'Wie lange jeder Ton stehen bleibt &ndash; kurz zupft, lang schwebt.'
     : 'Wie lange der Schlag nachklingt.'; }},
  {k:'space', label:'RAUM', min:0, max:100,
   get:function(P){ return Math.round(P.space*100); }, set:function(P,v){ P.space = v/100; },
   fmt:function(v){ return v + '%'; },
   tip:function(){ return 'Hall und Echo. Viel Raum schiebt die Figur nach hinten in die Halle.'; }},
  {k:'pan', label:'PANORAMA', min:-100, max:100,
   get:function(P){ return Math.round(P.pan*100); }, set:function(P,v){ P.pan = v/100; },
   fmt:function(v){ return v===0 ? 'Mitte' : (v<0 ? 'links '+(-v) : 'rechts '+v); },
   tip:function(){ return 'Links oder rechts im Stereobild. Figuren nach außen ziehen macht den Mix breit.'; }}
];
const ROLE = {kick:'Bassdrum', snare:'Snare', clap:'Klatschen', hat:'Hi-Hat', bass:'Bass',
  sub:'Sub-Bass', pluck:'Zupfer', lead:'Lead', chip:'Chip', regen:'Regen', orgel:'Orgel', trompete:'Trompete', theremin:'Theremin', blaeser:'Blasinstrument', pad:'Fläche', fluestern:'Atem', schleier:'Schleier', voice:'Stimme', bell:'Glocke', fx:'Effekt',
  gbpulse:'Pulskanal', gbkick:'Puls-Sweep', gbwave:'Wave-Kanal', gbnoise:'Rauschkanal',
  tom:'Tom', wobble:'Wobbelbass', flute:'Flöte', stab:'Akkordstoß',
  lofikick:'Weiche Bassdrum', lofisnare:'Weiche Snare', lofihat:'Dunkle Hi-Hat',
  rhodes:'E-Piano', upright:'Kontrabass', tape:'Bandfläche',
  strings:'Streicher', pizz:'Pizzicato', twang:'Zupfsaite', harmonica:'Mundharmonika',
  whistle:'Pfeifen', woodblock:'Holzblock', hufe:'Hufschlag', maultrommel:'Maultrommel', banjo:'Banjo', glitch:'Digitalstörung', modal:'Angeschlagen', egitarre:'E-Gitarre', supersaw:'Supersaw', bitcrush:'Bitcrusher', horn:'Horn'};

function selTrack(){ return tracks.find(function(t){ return t.uid === selUid; }); }

function renderInspector(){
  const box = $('#insp');
  const t = selTrack();
  box.innerHTML = '';
  if(!t){
    box.style.setProperty('--c', genre ? genre.ac : '#ff2e88');
    const d = el('div','empty-insp');
    d.innerHTML = '<h2 style="color:var(--c)">TAKT IST LEER</h2>'+ 
      '<p>Wähl links eine Figur. Sie gehört nur zu diesem Takt.</p>';
    box.appendChild(d);
    return;
  }
  box.style.setProperty('--c', genre.cats[t.p.cat]);
  const head = el('div');
  const hk = heightKind(t);
  head.innerHTML = '<h2>'+t.p.name.toUpperCase()+'</h2><p class="sub">'+
    (ROLE[t.p.engine]||'Klang')+' &middot; '+
    (hk === 'ton' ? 'spielt Töne aus '+genre.scaleName : hk === 'farbe' ? 'Rauschen, Höhe = Klangfarbe' : 'Schlagzeug')+'</p>';
  box.appendChild(head);

  const btns = el('div','rowbtns');
  const mute = el('button','btn'+(t.mute?' on':''),'Stumm');
  mute.type='button';
  mute.setAttribute('data-hint','Schaltet <b>'+t.p.name+'</b> stumm, ohne sie von der Bühne zu nehmen.');
  mute.addEventListener('click', function(){ t.mute = !t.mute; applyAll(); renderStage(); renderTimeline(); renderInspector(); save(); markStageDirty(); });
  const solo = el('button','btn solo'+(t.solo?' on':''),'Solo');
  solo.type='button';
  solo.setAttribute('data-hint','Nur <b>'+t.p.name+'</b> hören, alles andere schweigt.');
  solo.addEventListener('click', function(){ t.solo = !t.solo; applyAll(); renderInspector(); save(); });
  const dice = el('button','btn','Würfeln');
  dice.type='button';
  dice.setAttribute('data-hint','Erfindet ein neues Muster für diese Figur. Nochmal drücken für einen neuen Versuch.');
  dice.addEventListener('click', function(){ rollPattern(t); renderTimeline(); save(); hint('Neues Muster für <b>'+t.p.name+'</b> gewürfelt.'); });
  const clr = el('button','btn','Leeren');
  clr.type='button';
  clr.setAttribute('data-hint','Löscht alle Schritte dieser Figur.');
  clr.addEventListener('click', function(){ t.steps = emptyBar(); renderTimeline(); save(); });
  const del = el('button','btn','Aus Takt');
  del.type='button';
  del.setAttribute('data-hint','Nimmt <b>'+t.p.name+'</b> nur aus Takt '+(curBar+1)+'.');
  del.addEventListener('click', function(){ removeTrack(t.uid); });
  [mute,solo,dice,clr,del].forEach(function(b){ btns.appendChild(b); });
  box.appendChild(btns);

  KNOBS.forEach(function(K){
    const wrap = el('div','knob');
    if(!t.auto) t.auto = {};
    const fahrt = t.auto[K.k];
    const faehrt = !!(fahrt && fahrt.an);
    const val = K.get(t.params);
    wrap.innerHTML = '<div class="top"><label for="k_'+K.k+'">'+K.label+'</label>'+
      '<button type="button" class="animknopf'+(faehrt?' an':'')+'">AUTO</button>'+
      '<output>'+(faehrt ? K.fmt(fahrt.von)+' &rarr; '+K.fmt(fahrt.bis) : K.fmt(val))+'</output></div>';

    const inp = el('input');
    inp.type='range'; inp.id='k_'+K.k; inp.min=K.min; inp.max=K.max; inp.step=1; inp.value=val;
    inp.disabled = faehrt;
    inp.setAttribute('data-hint','<b>'+K.label.toLowerCase()+'</b> &ndash; '+K.tip(t));
    inp.addEventListener('input', function(){
      const v = +inp.value;
      K.set(t.params, v);
      wrap.querySelector('output').textContent = K.fmt(v);
      applyParams(t);
      hint('<b>'+t.p.name+'</b> &middot; '+K.label.toLowerCase()+': '+K.fmt(v));
    });
    inp.addEventListener('change', function(){ save(); if(!playing) audition(t, 4); });
    wrap.appendChild(inp);

    /* Die Fahrt. Sichtbar nur, wenn sie eingeschaltet ist - drei Zahlenfelder
       stehen sonst unter jedem der sechs Regler und erschlagen die Spalte. */
    const zeile = el('div','autozeile');
    zeile.hidden = !faehrt;
    function feld(titel, wert, min, max, aendere){
      const l = el('label');
      l.appendChild(el('span','',titel));
      const i = el('input');
      i.type='number'; i.min=min; i.max=max; i.step=1; i.value=wert;
      i.addEventListener('input', function(){
        let v = Math.round(+i.value);
        if(!isFinite(v)) return;
        v = Math.max(min, Math.min(max, v));
        aendere(v);
        wrap.querySelector('output').innerHTML = K.fmt(t.auto[K.k].von)+' &rarr; '+K.fmt(t.auto[K.k].bis);
        applyParams(t);
      });
      i.addEventListener('change', function(){ i.value = Math.max(min, Math.min(max, Math.round(+i.value)||min)); save(); });
      l.appendChild(i);
      zeile.appendChild(l);
      return i;
    }
    if(faehrt){
      feld('von', fahrt.von, K.min, K.max, function(v){ t.auto[K.k].von = v; });
      feld('bis', fahrt.bis, K.min, K.max, function(v){ t.auto[K.k].bis = v; });
      feld('über … Anschläge', fahrt.schritte, 1, 16, function(v){ t.auto[K.k].schritte = v; });
    }
    wrap.appendChild(zeile);

    const an = wrap.querySelector('.animknopf');
    an.setAttribute('data-hint', faehrt
      ? '<b>'+K.label.toLowerCase()+'</b> fährt gerade. Nochmal drücken stellt den Regler still.'
      : 'Lässt <b>'+K.label.toLowerCase()+'</b> im Takt wandern, statt stehen zu bleiben.');
    an.addEventListener('click', function(){
      let bis = val;
      if(faehrt){ delete t.auto[K.k]; }
      else{
        /* Beim Einschalten dort anfangen, wo der Regler steht - sonst springt
           der Klang weg und man sucht den Zusammenhang. */
        bis = Math.max(K.min, Math.min(K.max, val + Math.round((K.max-K.min)*0.2)));
        t.auto[K.k] = {an:true, von:val, bis:bis, schritte:6};
      }
      applyParams(t); renderInspector(); save();
      hint(faehrt
        ? '<b>'+K.label.toLowerCase()+'</b> steht wieder still.'
        : '<b>'+K.label.toLowerCase()+'</b> fährt jetzt von '+K.fmt(val)+' nach '+K.fmt(bis)+' über 6 Anschläge.');
    });

    wrap.appendChild(el('p','tip', faehrt
      ? 'Der Wert startet auf <b>von</b>, erreicht <b>bis</b> nach so vielen Anschlägen und bleibt dann dort, bis der Takt von vorn beginnt.'
      : K.tip(t)));
    box.appendChild(wrap);
  });
}
function rollPattern(t){
  const tonal = !!TONAL[t.p.engine];
  const long = t.p.engine === 'pad' || t.p.engine === 'fluestern' || t.p.engine === 'schleier' || t.p.engine === 'sub';
  for(let i=0;i<16;i++){
    const strong = i % 4 === 0;
    if(long){ bar(t)[i] = (i === 0 || (i === 8 && Math.random() < 0.5)) ? Math.floor(Math.random()*5) : null; continue; }
    const p = tonal ? (strong ? 0.7 : 0.3) : (strong ? 0.85 : 0.3);
    bar(t)[i] = Math.random() < p
      ? (tonal ? Math.floor(Math.random()*6) : (strong ? 5 + Math.floor(Math.random()*3) : 1 + Math.floor(Math.random()*4)))
      : null;
  }
}
