(function(){
  'use strict';

  const scene = document.getElementById('introRooftop');
  const screen = document.getElementById('screenPick');
  if(!scene || !screen) return;

  const back = scene.querySelector('.intro-rooftop__back');
  const middle = scene.querySelector('.intro-rooftop__middle');
  const front = scene.querySelector('.intro-rooftop__front');
  const moon = scene.querySelector('.intro-rooftop__moon');
  if(!back || !moon || !middle || !front) return;

  /* Seitenverhaeltnisse der Silhouettenstreifen. Die Quellbilder sind
     209 px breit, riso_scenery.py legt sie gespiegelt dreifach
     nebeneinander - dadurch sind sie nur ein Drittel so hoch und
     passen unten ins Bild, statt versenkt werden zu muessen. */
  const FRONT_RATIO = 50/627;     /* Hoehe der vorderen Silhouette zur Breite */
  const MIDDLE_RATIO = 29/627;
  /* Ab dieser Hoehe ist die vordere Silhouette durchgehend deckend -
     dort liegt die Dachflaeche, darauf stellen wir die ferne Stadt. */
  const FRONT_DACH = 15/50;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let motionFrame = 0;
  let resizeFrame = 0;
  let settleTimer = 0;

  function viewportSize(){
    const viewport = window.visualViewport;
    return {
      width: Math.round(viewport ? viewport.width : window.innerWidth),
      height: Math.round(viewport ? viewport.height : window.innerHeight)
    };
  }

  /* Der Himmel deckt das Fenster ueber CSS ab (object-fit: cover).
     Hier werden nur die beiden Silhouetten gesetzt. Sie muessen die
     Breite ueberspannen, sonst klafft an den Seiten eine Luecke - und
     weil die Streifen dreifach breit vorliegen, bleiben sie dabei
     flach genug, um ganz sichtbar zu sein.

     Die ferne Stadt wird auf die Dachflaeche der vorderen Silhouette
     gestellt. Beide unten buendig hiesse: die niedrigere Stadt
     verschwindet komplett hinter dem Dach. */
  function sizeScene(){
    resizeFrame = 0;
    const size = viewportSize();
    const portrait = size.height > size.width;
    const focus = portrait && size.width < 600 ? 0.62 : 0.5;
    /* Die Groesse kommt aus der gewuenschten Dachhoehe, nicht aus der
       Fensterbreite - sonst ist die Kulisse auf schmalen Fenstern ein
       Strich und auf breiten halb so hoch wie die Seite. Was seitlich
       uebersteht, faellt nicht auf: der Streifen ist gespiegelt
       aneinandergesetzt und laeuft durch.
       Mindestens Fensterbreite plus Zugabe fuer den Parallaxen-Versatz,
       sonst laeuft beim Wandern der Maus ein Rand herein. */
    const wunschHoehe = size.height * (portrait ? 0.19 : 0.24);
    const width = Math.ceil(Math.max(size.width * 1.08 + 96, wunschHoehe / FRONT_RATIO));
    const dach = Math.round(width * FRONT_RATIO * FRONT_DACH);

    /* Der Mond waechst mit der Fensterhoehe, nicht mit dem Himmelsbild -
       das wird ja gedehnt. */
    scene.style.setProperty('--moon-size', Math.round(Math.max(26, size.height * 0.055)) + 'px');
    scene.style.setProperty('--scene-width', width + 'px');
    scene.style.setProperty('--scene-left', Math.round(size.width / 2 - width * focus) + 'px');
    scene.style.setProperty('--middle-bottom', dach + 'px');
  }

  function requestSize(){
    if(!resizeFrame) resizeFrame = requestAnimationFrame(sizeScene);
  }

  function setLayerOffset(layer, x, y){
    layer.style.setProperty('--px', Math.round(x) + 'px');
    layer.style.setProperty('--py', Math.round(y) + 'px');
  }

  function paintMotion(){
    motionFrame = 0;
    currentX += (targetX - currentX) * 0.2;
    currentY += (targetY - currentY) * 0.2;

    setLayerOffset(back, -currentX, -currentY);
    setLayerOffset(moon, -currentX, -currentY);
    setLayerOffset(middle, currentX * 3, currentY * 2);
    setLayerOffset(front, currentX * 6, currentY * 3);

    if(Math.abs(targetX - currentX) > 0.015 || Math.abs(targetY - currentY) > 0.015){
      motionFrame = requestAnimationFrame(paintMotion);
      return;
    }

    currentX = targetX;
    currentY = targetY;
    setLayerOffset(back, -currentX, -currentY);
    setLayerOffset(moon, -currentX, -currentY);
    setLayerOffset(middle, currentX * 3, currentY * 2);
    setLayerOffset(front, currentX * 6, currentY * 3);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function(){ scene.classList.remove('is-moving'); }, 160);
  }

  function requestMotion(){
    if(!motionFrame){
      scene.classList.add('is-moving');
      motionFrame = requestAnimationFrame(paintMotion);
    }
  }

  function motionAllowed(){
    return finePointer.matches && !reducedMotion.matches && !screen.hidden && !document.hidden;
  }

  function aimFromPointer(event){
    if(!motionAllowed()) return;
    const size = viewportSize();
    targetX = Math.max(-1, Math.min(1, (event.clientX / size.width - 0.5) * 2));
    targetY = Math.max(-1, Math.min(1, (event.clientY / size.height - 0.5) * 2));
    requestMotion();
  }

  function resetMotion(immediate){
    targetX = 0;
    targetY = 0;
    if(immediate){
      if(motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      currentX = 0;
      currentY = 0;
      setLayerOffset(back, 0, 0);
      setLayerOffset(moon, 0, 0);
      setLayerOffset(middle, 0, 0);
      setLayerOffset(front, 0, 0);
      clearTimeout(settleTimer);
      scene.classList.remove('is-moving');
      return;
    }
    requestMotion();
  }

  function handleCapabilityChange(){
    if(!motionAllowed()) resetMotion(true);
    requestSize();
  }

  screen.addEventListener('pointermove', aimFromPointer, {passive:true});
  screen.addEventListener('pointerleave', function(){ resetMotion(false); }, {passive:true});
  window.addEventListener('resize', requestSize, {passive:true});
  window.addEventListener('orientationchange', requestSize, {passive:true});
  document.addEventListener('visibilitychange', handleCapabilityChange);
  if(window.visualViewport) visualViewport.addEventListener('resize', requestSize, {passive:true});
  if(finePointer.addEventListener) finePointer.addEventListener('change', handleCapabilityChange);
  if(reducedMotion.addEventListener) reducedMotion.addEventListener('change', handleCapabilityChange);

  new MutationObserver(function(){
    if(screen.hidden) resetMotion(true);
    else requestSize();
  }).observe(screen, {attributes:true, attributeFilter:['hidden']});

  sizeScene();
})();
