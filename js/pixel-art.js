/* ---------- 3. Pixel-Renderer ----------
   Schatten- und Lichttöne werden aus der Genre-Palette gerechnet:
   Schatten gehen ins Kühlere und Sattere, Lichter ins Wärmere. */
function adj(hex, dL, dS, dH){
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
  let h = 0, s = 0, l = (mx+mn)/2;
  if(d){
    s = l > 0.5 ? d/(2-mx-mn) : d/(mx+mn);
    if(mx === r) h = ((g-b)/d + (g<b?6:0))/6;
    else if(mx === g) h = ((b-r)/d + 2)/6;
    else h = ((r-g)/d + 4)/6;
  }
  l = clamp01(l+dL); s = clamp01(s+dS); h = (h+dH+1) % 1;
  function hue(p,q,t){
    if(t<0) t+=1; if(t>1) t-=1;
    if(t < 1/6) return p+(q-p)*6*t;
    if(t < 1/2) return q;
    if(t < 2/3) return p+(q-p)*(2/3-t)*6;
    return p;
  }
  let R,G,B;
  if(!s){ R=G=B=l; }
  else {
    const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
    R = hue(p,q,h+1/3); G = hue(p,q,h); B = hue(p,q,h-1/3);
  }
  return '#' + [R,G,B].map(function(v){ return ('0'+Math.round(v*255).toString(16)).slice(-2); }).join('');
}
function clamp01(v){ return v<0?0:(v>1?1:v); }
function fullPal(g){
  if(g._pal) return g._pal;
  if(g.palFull){ g._pal = g.palFull; return g._pal; }
  const p = g.pal;
  g._pal = Object.assign({}, p, {
    a: adj(p.A,-0.14, 0.07,-0.022),
    H: adj(p.A, 0.13,-0.06, 0.014),
    b: adj(p.B,-0.14, 0.07,-0.022),
    c: adj(p.C,-0.12, 0.05,-0.020),
    s: adj(p.S,-0.13, 0.06,-0.018)
  });
  return g._pal;
}
/* Dieselbe Palette ohne die gerechneten Zwischentoene: jede
   Aufhellung und jeder Schatten faellt auf seine Grundfarbe zurueck.
   Aus zwoelf Farben werden sechs. Fuer den Druck gedacht - dort wird
   aus jedem Zwischenton sonst ein eigener Rasterwert, und die Figur
   zerfaellt in Sprenkel. */
function flachePal(g){
  if(g._palFlach) return g._palFlach;
  const p = g.pal;
  g._palFlach = Object.assign({}, p, {a: p.A, H: p.A, b: p.B, c: p.C, s: p.S});
  return g._palFlach;
}
const spriteCache = {};
function spriteCanvas(name, genre, sc, flach){
  const key = name+'|'+genre.id+'|'+sc+(flach?'|f':'');
  if(spriteCache[key]) return spriteCache[key];
  const rows = SPRITES[name], pal = flach ? flachePal(genre) : fullPal(genre);
  /* Leerrand abschneiden, damit jede Figur wirklich auf der Grundlinie steht */
  let x0 = 99, x1 = -1, y0 = 99, y1 = -1;
  for(let y=0;y<rows.length;y++){
    for(let x=0;x<rows[y].length;x++){
      if(!pal[rows[y][x]]) continue;
      if(x < x0) x0 = x;
      if(x > x1) x1 = x;
      if(y < y0) y0 = y;
      if(y > y1) y1 = y;
    }
  }
  const cv = document.createElement('canvas');
  cv.width = (x1-x0+1)*sc; cv.height = (y1-y0+1)*sc;
  /* Die Presse liest die Figur spaeter Punkt fuer Punkt aus. */
  const g = cv.getContext('2d', {willReadFrequently: true});
  for(let y=y0;y<=y1;y++){
    const row = rows[y];
    for(let x=x0;x<=x1;x++){
      const col = pal[row[x]];
      if(!col) continue;
      g.fillStyle = col;
      g.fillRect((x-x0)*sc, (y-y0)*sc, sc, sc);
    }
  }
  spriteCache[key] = cv;
  return cv;
}
