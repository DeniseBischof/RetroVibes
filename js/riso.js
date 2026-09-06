/* ============================================================
   RISO - Zweifarben-Risodruck fuer die Weltwahl
   ------------------------------------------------------------
   Ein Risograph druckt nicht in RGB. Er zieht pro Farbe eine
   eigene Schablone und walzt sie nacheinander aufs Papier.
   Genau das macht dieses Modul:

     1. Farbauszug  - jede Quellfarbe wird in zwei Deckungsgrade
                      zerlegt (wie viel Farbe A, wie viel Farbe B).
     2. Rasterung   - Deckung wird zu runden Punkten auf einem
                      gedrehten Raster. Zwei Winkel, damit die
                      Farben sich nicht zu einem Moire ueberlagern.
     3. Passerversatz - jede Farbe landet ein Haar daneben. Das ist
                      der Fehler, der den Druck erst echt macht.
     4. Ueberdruck  - die Farben multiplizieren sich. Wo beide voll
                      liegen, wird es fast schwarz.

   Gezeichnet wird nicht in Pixeln, sondern in Deckung: zwei
   Float-Puffer, einer pro Druckfarbe. Erst render() macht daraus
   ein Bild.
   ============================================================ */
const RISO = (function(){
  'use strict';

  /* Warmes Naturpapier. Nicht weiss - Riso liegt nie auf Weiss. */
  const PAPER = '#f4ecd8';

  function rgb(hex){
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }
  function hueOf(r,g,b){
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
    if(!d) return -1;
    let h;
    if(mx === r) h = (g-b)/d + (g<b?6:0);
    else if(mx === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    return h/6;
  }
  function hueDist(a,b){ const d = Math.abs(a-b); return d>0.5 ? 1-d : d; }

  /* Rauschen mit fester Saat: ein Neuzeichnen muss dasselbe Korn
     ergeben, sonst flimmert die Karte bei jedem Resize. */
  function hash(x,y,n){
    let s = (x*374761393 + y*668265263 + n*1442695040 + 2246822519) >>> 0;
    s = ((s ^ (s>>>13)) * 1274126177) >>> 0;
    return ((s ^ (s>>>16)) >>> 0) / 4294967296;
  }

  /* ---------- Farbauszug ----------
     Wie viel Farbe braucht dieser Bildpunkt, und welche?
     Helligkeit bestimmt die Menge, Farbton die Aufteilung.
     Neutrale Toene bekommen beide Farben - daraus entsteht im
     Ueberdruck das tiefe Fast-Schwarz, das Riso auszeichnet. */
  function separator(inkA, inkB){
    const A = rgb(inkA), B = rgb(inkB);
    const hA = hueOf(A[0],A[1],A[2]), hB = hueOf(B[0],B[1],B[2]);
    return function(r,g,b,out){
      const l = (0.299*r + 0.587*g + 0.114*b)/255;
      const chroma = (Math.max(r,g,b) - Math.min(r,g,b))/255;
      const need = 1 - l;
      let bias = 0;
      if(chroma > 0.02 && hA >= 0 && hB >= 0){
        const h = hueOf(r,g,b);
        bias = (hueDist(h,hB) - hueDist(h,hA)) * 2;
        bias *= Math.min(1, chroma*2.4);
        if(bias > 1) bias = 1; else if(bias < -1) bias = -1;
      }
      const wA = 0.5 + 0.5*bias;
      out[0] = Math.min(1, need*2*wA);
      out[1] = Math.min(1, need*2*(1-wA));
    };
  }

  /* ---------- Die Presse ----------
     w/h in Geraetepixeln. inks: zwei Hexfarben. */
  function press(w, h, opts){
    opts = opts || {};
    const inkA = opts.inks[0], inkB = opts.inks[1];
    const paper = opts.paper || PAPER;
    /* Zwei Druckfarben und zwei Sonderpuffer:
       n=2 ausgespartes Papier - dort druckt keine Walze, das ist der
           Mond im Nachthimmel und der Buchstabe im Schriftzug;
       n=3 Papiergrund - dort liegt Papier UNTER der Farbe. Damit wird
           ein freigestelltes Motiv deckend, ohne dass seine hellen
           Stellen durchsichtig werden. */
    const cov = [new Float32Array(w*h), new Float32Array(w*h),
                 new Float32Array(w*h), new Float32Array(w*h)];
    const sep = separator(inkA, inkB);
    const two = [0,0];

    /* add = Farbe legt sich auf vorhandene (Kulisse),
       set = Farbe ersetzt sie (Figuren stehen fuer sich),
       max = die dickere Schicht gewinnt. */
    function put(n, i, v, mode){
      const buf = cov[n];
      if(mode === 'set') buf[i] = v;
      else if(mode === 'max'){ if(v > buf[i]) buf[i] = v; }
      else { const s = buf[i] + v; buf[i] = s > 1 ? 1 : s; }
    }

    const api = {
      w: w, h: h,

      rect: function(n, x, y, rw, rh, v, mode){
        const x0 = Math.max(0, Math.round(x)), x1 = Math.min(w, Math.round(x+rw));
        const y0 = Math.max(0, Math.round(y)), y1 = Math.min(h, Math.round(y+rh));
        for(let yy=y0; yy<y1; yy++){
          const row = yy*w;
          for(let xx=x0; xx<x1; xx++) put(n, row+xx, v, mode);
        }
        return api;
      },

      /* Senkrechter Verlauf der Deckung - der Himmel jeder Karte. */
      vgrad: function(n, y0, y1, v0, v1, mode){
        const a = Math.max(0, Math.round(y0)), b = Math.min(h, Math.round(y1));
        const span = (y1 - y0) || 1;
        for(let yy=a; yy<b; yy++){
          let t = (yy - y0)/span;
          t = t*t*(3-2*t);                     /* weiche Kante statt harter Rampe */
          const v = v0 + (v1-v0)*t;
          if(v <= 0) continue;
          const row = yy*w;
          for(let xx=0; xx<w; xx++) put(n, row+xx, v, mode);
        }
        return api;
      },

      /* Eine fertige Pixelfigur einfaerben: jede Quellfarbe wird
         in ihre zwei Druckfarben zerlegt.

         `stufen` rastert die Deckung auf wenige Tonwerte. Ohne das
         bekommt jede der vielen Zwischenfarben einer Figur ihren
         eigenen Deckungsgrad, und in einer 20x20-Figur wird daraus
         Rauschen statt Druck. Mit drei Stufen bleiben grosse Flaechen
         geschlossen und nur echte Mitteltoene zeigen Punkte. */
      stamp: function(src, dx, dy, mode, stufen){
        const sw = src.width, sh = src.height;
        if(!sw || !sh) return api;
        const sctx = src.getContext('2d');
        const data = sctx.getImageData(0, 0, sw, sh).data;
        dx = Math.round(dx); dy = Math.round(dy);
        for(let y=0; y<sh; y++){
          const ty = dy + y;
          if(ty < 0 || ty >= h) continue;
          for(let x=0; x<sw; x++){
            const tx = dx + x;
            if(tx < 0 || tx >= w) continue;
            const s = (y*sw + x)*4;
            const a = data[s+3]/255;
            if(a < 0.5) continue;
            sep(data[s], data[s+1], data[s+2], two);
            if(stufen){
              two[0] = Math.round(two[0]*stufen)/stufen;
              two[1] = Math.round(two[1]*stufen)/stufen;
            }
            const i = ty*w + tx;
            put(0, i, two[0]*a, mode);
            put(1, i, two[1]*a, mode);
          }
        }
        return api;
      },

      /* Eine Vorlage nur ueber ihren Alphakanal aufnehmen: was dort
         deckend ist, bekommt die Deckung v in der Farbe n. n=2 ist das
         ausgesparte Papier. Anders als stamp() wird hier nicht nach
         Farben getrennt - die Vorlage ist eine Schablone, kein Bild. */
      maske: function(src, dx, dy, n, v, mode){
        const sw = src.width, sh = src.height;
        if(!sw || !sh) return api;
        const data = src.getContext('2d').getImageData(0, 0, sw, sh).data;
        dx = Math.round(dx); dy = Math.round(dy);
        for(let y=0; y<sh; y++){
          const ty = dy + y;
          if(ty < 0 || ty >= h) continue;
          for(let x=0; x<sw; x++){
            const tx = dx + x;
            if(tx < 0 || tx >= w) continue;
            const a = data[(y*sw + x)*4 + 3]/255;
            if(a < 0.5) continue;
            put(n, ty*w + tx, v*a, mode);
          }
        }
        return api;
      },

      /* ---------- Drucken ---------- */
      render: function(ctx, o){
        o = o || {};
        const pitch = o.pitch || 3.6;                       /* Rasterweite in Geraetepixeln */
        const grain = o.grain === undefined ? 0.13 : o.grain;
        const shift = o.shift === undefined ? 1.2 : o.shift; /* Passerversatz */
        const dens  = o.density === undefined ? 0.93 : o.density;
        const fibre = o.fibre === undefined ? 5 : o.fibre;   /* Papierkorn */
        /* `flach`: gar kein Raster - was mindestens halb gedeckt ist,
           druckt voll. Ergibt reine Volltoene (Papier, Farbe A,
           Farbe B, Ueberdruck) statt Punktmuster. */
        const flach = !!o.flach;
        const angA = o.angles ? o.angles[0] : Math.PI/12;        /* 15 Grad */
        const angB = o.angles ? o.angles[1] : Math.PI/12*5;      /* 75 Grad */
        const ca = [Math.cos(angA), Math.cos(angB)];
        const sa = [Math.sin(angA), Math.sin(angB)];
        const ox = [-shift, shift*0.75], oy = [shift*0.25, -shift*0.6];
        const P = rgb(paper), INK = [rgb(inkA), rgb(inkB)];

        /* Durchsichtig: nur wo wirklich Farbe oder ausgespartes Papier
           liegt, wird das Bild deckend. Zwischen den Rasterpunkten
           scheint durch, was hinter dem Canvas liegt. */
        const frei = !!o.transparent;
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for(let y=0; y<h; y++){
          for(let x=0; x<w; x++){
            let R = P[0], G = P[1], Bl = P[2];
            const i0 = y*w + x;
            if(cov[2][i0] >= 0.5){
              /* Ausgespartes Papier schlaegt jede Farbe. */
              const i = i0*4;
              const f0 = (hash(x, y, 7) - 0.5) * fibre;
              d[i] = P[0]+f0; d[i+1] = P[1]+f0; d[i+2] = P[2]+f0; d[i+3] = 255;
              continue;
            }
            /* Papiergrund macht den Punkt deckend, auch wo keine Farbe
               sitzt - sonst waeren die hellen Stellen einer
               freigestellten Figur Loecher. */
            let gedruckt = cov[3][i0] >= 0.5;
            for(let n=0; n<2; n++){
              const sx = Math.round(x + ox[n]), sy = Math.round(y + oy[n]);
              if(sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
              let c = cov[n][sy*w + sx];
              if(c <= 0.004) continue;
              c += (hash(x, y, n) - 0.5) * grain;   /* die Walze traegt nie gleichmaessig auf */
              if(c <= 0) continue;
              if(flach){
                if(c < 0.5) continue;
              } else if(c < 1){
                const u = (x*ca[n] + y*sa[n])/pitch, v = (y*ca[n] - x*sa[n])/pitch;
                const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5;
                const r = Math.sqrt(fu*fu + fv*fv) * 1.41421;  /* 0 Punktmitte .. 1 Zellecke */
                if(c < r) continue;
              }
              const k = INK[n];
              R -= R * (1 - k[0]/255) * dens;
              G -= G * (1 - k[1]/255) * dens;
              Bl -= Bl * (1 - k[2]/255) * dens;
              gedruckt = true;
            }
            /* Papier ist nie glatt */
            const f = (hash(x, y, 7) - 0.5) * fibre;
            const i = (y*w + x)*4;
            d[i]   = R + f < 0 ? 0 : (R + f > 255 ? 255 : R + f);
            d[i+1] = G + f < 0 ? 0 : (G + f > 255 ? 255 : G + f);
            d[i+2] = Bl + f < 0 ? 0 : (Bl + f > 255 ? 255 : Bl + f);
            d[i+3] = (frei && !gedruckt) ? 0 : 255;
          }
        }
        ctx.putImageData(img, 0, 0);
        return api;
      }
    };
    return api;
  }

  return { PAPER: PAPER, press: press, separator: separator, hash: hash };
})();
