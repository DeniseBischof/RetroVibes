/* ---------- 2. Genres ---------- */
function C(id,name,cat,sprite,engine,oct,pat,over){
  return Object.assign({id,name,cat,sprite,engine,oct,pat},over||{});
}
const GENRES = [
{
  id:'cyber',
  /* Druckfarben der Weltkarte: Fluo-Pink + Blue. Bewusst getrennt von
     ac/ac2 - die bleiben die Bildschirmfarben des Editors. */
  riso:['#ff48b0', '#0078bf'],
  /* Einzige Nachtwelt: der Himmel wird deckend gedruckt, die
     Haeuser sparen sich hell aus, die Fenster leuchten pink. */
  nacht: true, regen: true, name:'Cyberpunk',
  bpm:126, root:48, scale:[0,1,3,5,7,8,10], scaleName:'Phrygisch',
  pump:{tiefe:0.42, dauer:0.24},
  /* Achtel statt punktierter Achtel: das Delay treibt, statt zu traeumen. */
  delay:0.5,
  ac:'#ff2e88', ac2:'#22e0ff', bg1:'#1a1030', bg2:'#0d1226',
  cats:{beat:'#ff2e88', bass:'#8b5cf6', melo:'#22e0ff', voice:'#ffd166'},
  pal:{K:'#0a0a12',A:'#ff2e88',B:'#22e0ff',C:'#3f3560',S:'#e8b48c',W:'#f2f0ff',E:'#22e0ff'},
  chars:[
    C('cy1','Puls','beat','stomper','kick',0,'5...5...5...5...'),
    C('cy2','Klatschbot','beat','klatscher','clap',0,'....6.......6...',{gate:true, params:{vol:0.78, space:0.52}}),
    C('cy3','Ratsche','beat','schuettler','hat',0,'2.3.6.3.2.3.6.3.',{offen:true}),
    C('cy4','Neonbass','bass','moench','bass',-12,'0070007000700050',{glide:0.02, params:{vol:0.74, len:0.10, tone:0.50}}),
    C('cy5','Tiefdruck','bass','wumme','sub',-12,'0.......0.......',{params:{vol:0.66}}),
    C('cy6','Arpdroide','melo','funke','pluck',12,'0.2.4.2.5.4.2.0.'),
    C('cy7','Klingenlead','melo','keytar','supersaw',12,'....4.5.7...5.4.',{glide:0.06, params:{len:0.34}}),
    C('cy14','E-Gitarre','melo','gitarre','egitarre',0,'0.0.03..0.0.05..',{params:{vol:0.80, tone:0.76, len:0.08, space:0.20}}),
    C('cy8','Stimmchip','voice','saenger','voice',12,'0...2...4...2...',{sample:'chor', verzerrung:0.20, params:{vol:0.72, tone:0.72, len:0.55, space:0.34}}),
    C('cy9','Störgeist','voice','geist','glitch',0,'......3.......5.'),
    C('cy10','Stahltom','beat','trommler','tom',0,'......4.....2.5.',{params:{len:0.28}}),
    C('cy11','Wobbelbass','bass','roehre','wobble',-12,'0...........3...'),
    C('cy12','Datenschleier','voice','floete','schleier',0,'0...............',{params:{vol:0.92, tone:0.62, len:0.72, space:0.44}}),
    C('cy13','Akkordstoß','voice','funker','stab',0,'0.......4.......'),
    C('cy15','Datenmüll','melo','geist','bitcrush',0,'..3...5...3.6...',{params:{vol:0.80}}),
    /* Vierter Bass, und der einzige, der eine Linie spielt statt einen
       Grundton zu halten: kurze Sechzehntel, jede aus der vorherigen
       herausgeglitten. Das ist der Acidbass. Gleiche Klangart wie der
       Neonbass, andere Rolle - der Neonbass trägt, dieser wandert.
       Darum auch leiser und kürzer: zwei Bässe im selben Register
       gehen sonst gegeneinander statt miteinander. */
    C('cy16','Säurebass','bass','orbitbass','bass',-12,'0.0030..0.0070..',{glide:0.05, params:{vol:0.70, len:0.04, space:0.14}})]
},
{
  /* Episch statt melancholisch: Aeolisch (natuerliches Moll) klang schlicht und
     traurig. Lydisch ist Dur mit erhoehter Quarte - der weite, magische Klang,
     den man aus Abenteuerfilmen und Zelda kennt. Dazu die Instrumente, die
     Epik ueberhaupt erst machen: Hoerner, gestimmte Pauken, Streicher.
     Die Epik kommt nicht aus der Skala, sondern aus Rhythmus und Lage:
     eine durchgehende 3+3+2-Figur in Pauke und Bass, ein halbtaktiger
     Schlag statt Backbeat, und Melodien, die in Quinten und Oktaven
     springen statt in Sekundschritten zu laufen. Etwas langsamer, weil
     Epik Platz braucht. */
  id:'fantasy',
  /* Druckfarben der Weltkarte: Gold + Green. Bewusst getrennt von
     ac/ac2 - die bleiben die Bildschirmfarben des Editors. */
  riso:['#ffb511', '#00a95c'], name:'Fantasy', tag:'Hoerner, Pauken, weites Land.',
  bpm:96, root:50, scale:[0,2,4,6,7,9,11], scaleName:'Lydisch',
  ac:'#e0a63c', ac2:'#4fb573', bg1:'#1d2417', bg2:'#2a1c12',
  cats:{beat:'#c96a3a', bass:'#8a6a3a', melo:'#4fb573', voice:'#e0a63c'},
  pal:{K:'#120d0a',A:'#e0a63c',B:'#4fb573',C:'#5a3b2a',S:'#f0c9a0',W:'#fff3d6',E:'#8fe3ff'},
  chars:[
    C('fa1','Kesselpauke','beat','trommler','modal',-12,'0..0..4.0..0..4.',{modell:'pauke', params:{vol:0.74, len:0.52, space:0.32}}),
    /* Kein Fell, sondern Holz: die Snare-Aufnahme ist eine moderne
       Kesseltrommel und hat den Holzklatscher in eine Marschtrommel
       verwandelt, sobald die Aufnahmen dazukamen. Der Name stand schon
       vorher da - jetzt stimmt die Klangart dazu. */
    C('fa2','Holzklatscher','beat','klatscher','woodblock',0,'........7.....5.',{params:{vol:1.00, len:0.60, space:0.34}}),
    C('fa3','Tamburin','beat','schuettler','hat',0,'5.3.4.3.5.3.4.3.',{params:{vol:0.62}}),
    C('fa10','Rahmentrommel','beat','becken','tom',0,'0.0.0.0.0.0.0.4.',{params:{vol:0.56, len:0.30, space:0.30}}),
    C('fa16','Pizzicato','melo','gitarre','pizz',12,'0.4.7.4.0.4.7.4.'),
    C('fa4','Wandelbass','bass','moench','upright',-12,'0..0..4.0..0..7.',{params:{vol:0.74}}),
    C('fa5','Erdbrummen','bass','wumme','sub',-12,'0...............',{params:{vol:0.62}}),
    C('fa15','Cello','bass','cello','strings',-12,'0.......4.......',{body:'low', sample:'cello', params:{vol:0.92, tone:0.80, space:0.17}}),
    /* Gemessen (A-bewertete Terzbaender): das Horn fuehrt das ganze Feld
       zwischen 250 und 500 Hz um 4 bis 4,6 dB an - das ist sein Trichter,
       nicht seine Lautstaerke. Darum eine schmale Senke genau dort statt
       noch eines Griffs an den Pegel, und ein laengerer Ansatz: ein Horn
       wird angeblasen, es steht nicht ploetzlich da. */
    C('fa17','Waldhorn','melo','funker','horn',-12,'0..4....7.......',{sample:'horn', ansatz:0.18, senke:{hz:400, db:-5, q:0.9}, params:{vol:0.62, space:0.42}}),
    C('fa6','Harfenlicht','melo','funke','pluck',12,'0.2.4.7.5.4.2.0.',{params:{space:0.40}}),
    /* Aufrechtes Klavier, mittlere Anschlagstaerke. Die Aufnahmen liegen
       eine Quinte auseinander, die Figur spielt D3 bis D4 - jeder Ton
       trifft damit hoechstens drei Halbtoene daneben und muss nirgends
       gedehnt werden. */
    C('fa7','Spielmann','melo','keytar','twang',0,'..0...4...7...4.',{sample:'klavier', params:{vol:0.70, tone:0.52, space:0.34}}),
    C('fa12','Waldfloete','melo','floete','flute',12,'0...4...7...4...'),
    C('fa14','Streichersatz','melo','geige','strings',0,'4.......7.......',{sample:'streicher', params:{vol:0.84, tone:0.80, space:0.15}}),
    /* Gemessen: der Chor liegt zwischen 630 und 1000 Hz um 6 bis 7,2 dB ueber
       allem anderen. Das ist der Formant des gesungenen 'ah' - genau die
       Stelle, an der Melodien wohnen, darum deckt er sie zu. Senke dort,
       laengerer Ansatz, und etwas mehr Hall: was weiter weg steht, draengt
       sich weniger auf als dasselbe leiser direkt vorne. */
    C('fa8','Elfenchor','voice','saenger','voice',12,'0.......4.......',{sample:'chor', ansatz:0.16, senke:{hz:800, db:-6.5, q:1.0}, params:{vol:0.90, tone:0.85, len:0.60, space:0.40}}),
    C('fa9','Waldfluestern','voice','geist','fluestern',0,'0...............',{params:{vol:0.85, tone:0.52, len:0.66, space:0.54}}),
    C('fa13','Hornstoss','voice','funker','horn',-12,'....0...0...4.4.',{sample:'hornstac', params:{vol:0.78, space:0.34}}),
    /* Der Bordun ist der aelteste Bass, den es gibt: ein Ton, der liegen
       bleibt, waehrend sich alles andere darueber bewegt. Dudelsack und
       Drehleier bestehen daraus. Die anderen drei Baesse laufen, brummen
       oder streichen - dieser hier tut nichts, und das ist die Rolle. */
    C('fa18','Bordun','bass','roehre','orgel',-12,'0.......0.......',{params:{vol:0.44, len:0.92, space:0.36}}),
    /* Der Regen-Ansatz als Laubrauschen ist gescheitert: heller gefiltert
       klingt Regen nicht nach Blaettern, sondern nach schlechtem Regen.
       Stattdessen Hufe - die Klangart streut Zeit, Kraft und Bodenhoehe je
       Schlag von sich aus, und genau das trennt ein Pferd von einem
       Holzblock im Takt. */
    C('fa19','Reiterzug','voice','stomper','hufe',0,'5.34....5.34....',{params:{vol:0.62, len:0.30, space:0.34}}),
    /* Roehrenglocken, kraeftig angeschlagen. Ein Schlag pro Takt und sonst
       nichts - eine Glocke, die oefter kommt, ist keine Glocke mehr, sondern
       ein Metallophon. Die Aufnahmen reichen von C4 bis E5, in dieser Welt
       liegt die Figur damit genau im Bestand und muss nirgends gedehnt
       werden. */
    C('fa20','Klosterglocke','voice','becken','bell',12,'0...............',{sample:'glocke', params:{vol:0.80, len:0.85, space:0.52}})]
},
{
  /* Sonic und Mario leben von drei Dingen: Shuffle statt gerader Achtel,
     Melodien mit Spruengen statt Tonleiterlaeufen, und parallelen Terzen.
     Dazu Rechteckwellen mit verschiedenen Pulsbreiten - eine schmale klingt
     naeselnd und duenn, eine halbe voll und rund. Genau darueber trennten
     die alten Automaten ihre Stimmen. */
  id:'arcade',
  /* Druckfarben der Weltkarte: Bright Red + Cornflower. Bewusst getrennt von
     ac/ac2 - die bleiben die Bildschirmfarben des Editors. */
  riso:['#f15060', '#62a8e5'], name:'8-Bit Arcade',
  bpm:150, root:48, scale:[0,2,4,5,7,9,11], scaleName:'Dur',
  swing:16,
  ac:'#ff5252', ac2:'#3ea1ff', bg1:'#1b1030', bg2:'#101a30',
  cats:{beat:'#ff5252', bass:'#f5d442', melo:'#3ea1ff', voice:'#5ce6a1'},
  /* E ist das Augenleuchten und lag hier auf demselben Weiss wie W. Bei
     jeder Figur, deren Augen in einem hellen Feld sitzen - Boom-Bot,
     Wummbass, Sternenarp - verschwanden sie dadurch spurlos. Beim Bleepbass
     nicht: dort liegen die Augen auf der Koerperfarbe. */
  pal:{K:'#0b0b18',A:'#ff5252',B:'#3ea1ff',C:'#f5d442',S:'#f7c08a',W:'#ffffff',E:'#2f7fd6'},
  chars:[
    C('ar1','Boom-Bot','beat','wumme','kick',0,'5...5...5...5...'),
    C('ar2','Zapp','beat','klatscher','snare',0,'....5.......5...'),
    C('ar3','Chip-Hats','beat','schuettler','hat',0,'3.4.3.5.3.4.3.5.',{params:{vol:0.85}}),
    C('ar4','Bleepbass','bass','stomper','bass',-12,'0.7.0.7.5.7.4.7.',{params:{vol:0.72, len:0.16, tone:0.44}}),
    /* Stand auf Oktave -24, also Grundton bei 33 Hz: nachgemessen lagen
       98 % der Energie unter 80 Hz. Kein Tablet- und kein Laptoplautsprecher
       gibt das wieder - die Figur war nicht leise, sie war ausserhalb des
       Bereichs. Eine Oktave hoeher liegt der Grundton bei 65 Hz und die
       Hoerbarmacher der Klangart bei 131 und 196 Hz. */
    C('ar5','Münzsub','bass','moench','sub',-12,'0.......0.......',{params:{vol:0.50}}),
    /* Die alte Linie lief 7-5-4-2-0 die Tonleiter hinunter - genau das, was
       der Kommentar dieser Welt oben ausschliesst. Sonic und Mario springen:
       hier Oktave hoch, Quarte zurueck, dann ueber die Sexte wieder hinauf.
       Vibrato ist raus, es griff bei diesen kurzen Toenen ohnehin nie
       vollstaendig und machte die Terz nur unruhig. */
    C('ar6','Melodiechip','melo','keytar','chip',12,'0...7...4...5.7.',{duty:0.5, terz:true, params:{vol:1.00, len:0.50}}),
    C('ar7','Sternenarp','melo','funke','chip',12,'0.4.7.4.0.4.7.4.',{duty:0.125, params:{vol:1.00, len:0.16}}),
    /* Die Bewegung stimmt - ein kurzer Ton, der eine Quarte hochspringt -,
       aber als nackter Rechteck auf Oktave 24 sass sie bei ueber 2 kHz und
       stach bei jedem Durchlauf. Jetzt eine Oktave tiefer, voller Puls statt
       schmalem (rund statt naeselnd) und mehr Raum: dasselbe Signal, nur
       nicht mehr im Vordergrund. */
    C('ar8','Münze','voice','muenze','chip',12,'.....7..........',{duty:0.5, sprung:{ht:5, ab:0.30}, params:{vol:0.72, len:0.16, space:0.46}}),
    /* Der alte Powerup lief auf der Rueckfall-Klangart des Schalters: eine
       Rauschfahrt von 280 Hz nach oben. Gemessen -60,8 dB, praktisch nicht
       vorhanden, und ein Wischen statt eines Signals. Ein Extraleben ist in
       Wahrheit eine schnelle Tonleiter aufwaerts - hier fuenf Sechzehntel am
       Taktende, das sind knapp 400 ms. */
    C('ar9','Extraleben','voice','geist','chip',12,'..........02457.',{duty:0.5, params:{vol:0.95, len:0.14, space:0.24}}),
    C('ar10','Pixeltom','beat','trommler','tom',0,'......3.....4.5.'),
    C('ar11','Wummbass','bass','roehre','wobble',-12,'0...0...4...0...'),
    C('ar12','Pfeifchip','melo','floete','chip',12,'..2...4...2...0.',{duty:0.25, vibrato:true, params:{vol:0.76, len:0.30}}),
    C('ar13','Fanfare','voice','funker','stab',0,'0.......0.......'),
    /* Der laufende Rechteckbass ist das Fundament von Pac-Man und den frueh-
       en Mario-Titeln: keine gehaltenen Toene, sondern eine Linie, die
       staendig weiterschreitet. Schmaler Puls, damit sie neben dem
       Bleepbass nicht dieselbe Stelle besetzt. */
    C('ar14','Laufbass','bass','orbitbass','chip',-12,'0.4.7.4.5.4.2.4.',{duty:0.25, params:{vol:0.95, len:0.40, space:0.06}}),
    /* Die drei vorhandenen Melodiefiguren sind alle Rechteckwellen und
       stapeln sich deshalb zu Brei. Diese hier ist ein angeschlagener Stab
       aus seinen Eigenresonanzen - die Klangfarbe, mit der die Sega-Titel
       ihre Melodien ueber den Chip legten. Sie schneidet durch, statt sich
       einzureihen. */
    C('ar15','Glockenlead','melo','becken','modal',12,'0...4...7...4...',{modell:'marimba', params:{vol:0.70, len:0.30, space:0.30}}),
    /* Pac-Man frisst in Sechzehnteln: zwei Stufen im Wechsel, sehr kurz,
       schmalster Puls. Nur die halbe Zeit - durchgehend waere es kein
       Geraeusch mehr, sondern ein Instrument. */
    C('ar16','Waka','voice','handheld','chip',12,'02020202........',{duty:0.125, params:{vol:0.85, len:0.06, space:0.14}}),
    /* Ab hier kippt die Welt vom Automaten in Richtung Konsolen-Rock: das
       ist der Unterschied zwischen Pac-Man und einem Sonic-Titelsong.
       Drei Zutaten, mehr braucht es nicht.

       Erstens die Rhythmusgitarre. Die Klangart spielt von sich aus einen
       Powerchord - Grundton, Quinte, Oktave gemeinsam durch dieselbe
       Saettigung - und genau daraus entsteht das Knurren. Kurze Toene,
       damit sie schiebt statt zu stehen. */
    C('ar17','Powerchord','melo','gitarre','egitarre',0,'0.0.0.0.4.4.5.5.',{params:{vol:0.62, tone:0.58, len:0.20, space:0.18}}),
    /* Zweitens der Antrieb: durchgehende Sechzehntel. Die Chip-Hats spielen
       Achtel mit Muster, das ist Groove. Das hier ist kein Groove, sondern
       Tempo - deshalb bewusst gleichfoermig und leise. */
    C('ar18','Antriebshats','beat','schuettler','hat',0,'6424642464246424',{params:{vol:0.85, len:0.10}}),
    /* Drittens das Becken auf der Eins. Eine eigene Klangart dafuer gibt es
       nicht - die Hi-Hat kann es, wenn `offen` gesetzt ist: hohe Stufen
       zaehlen dann als offen und klingen fuenfeinhalbmal so lang. */
    C('ar19','Crash','beat','becken','hat',0,'7...............',{offen:true, params:{vol:0.72, len:0.62, space:0.42}}),
    /* Der Synth, der durchzieht. Von drei Lesarten die liegende: zwei
       Akkorde je Takt, jeder laenger als sein halber Takt, also stehen sie
       ineinander und reissen nie ab. Die Klangart stapelt sieben gegen-
       einander verstimmte Saegezaehne - bei einem Synthesizer ist genau das
       richtig, waehrend dieselbe Verstimmung auf einer Aufnahme ein Chorus
       waere und nach Effektgeraet klaenge.
       `glide` ist hier kein Beiwerk: der Ton rutscht in den naechsten hinein
       statt ihn anzuspringen, und dieses Hineinrutschen ist das Erkennungs-
       zeichen der Stilrichtung. Ohne es steht eine Wand da, mit ihm atmet sie.
       Bewusst leiser als jede Melodiefigur: eine Flaeche traegt, sie fuehrt
       nicht. */
    C('ar20','Breitwand','melo','kassette','supersaw',0,'0.......5.......',{glide:0.05, params:{vol:0.55, len:0.92, space:0.44}})]
},
{
  /* Old-School-Horror: Spukhaus statt Psychothriller. Pfeifenorgel,
     Theremin, Spieluhr - die Klaenge der alten Gruselfilme. Das ist die
     Schule, die als Loop funktioniert, weil sie nie erschrecken wollte
     sondern eine Stimmung baut, und die man Kindern vorspielen kann.

     Zur Skala: frueher lag hier die verminderte. Symmetrisch, ohne Zentrum,
     mit zwei Halbtonschritten - fast jede Kombination rieb, und Melodien
     wirkten ziellos. Harmonisch Moll ist duester UND spielbar, und die
     uebermaessige Sekunde zwischen sechster und siebter Stufe ist genau der
     Gruselklang, den man aus diesen Filmen kennt. */
  id:'horror',
  /* Druckfarben der Weltkarte: Burgundy + Kelly Green. Bewusst getrennt von
     ac/ac2 - die bleiben die Bildschirmfarben des Editors. */
  riso:['#914e72', '#67b346'],
  /* Nachtwelt wie Cyberpunk: der Himmel wird deckend gedruckt, die
     Baeume sparen sich giftgruen aus. Regen vereinzelt und traege -
     nicht der treibende Stadtregen, sondern Tropfen im Nichts. */
  /* Die Kennung bleibt 'horror': daran haengen die gespeicherten Staende im
     Browser. Wer sie umbenennt, wirft jedem seine Takte weg. */
  nacht: true, regen: true, regenDichte: 3, regenTempo: 2.4, name:'Creepy', tag:'Spukhaus, Orgel, Theremin.',
  /* Harmonischer Plan der Welt. Vorher hatte sie keinen: vierzehn Figuren
     waren einzeln geschrieben, acht davon lagen auf dem Grundton, und wer
     davon abwich, klang nicht nach Akkordwechsel, sondern nach Fehler.
     Jetzt bewegt sich der Takt einmal:
        Schritt 1-8   A-Moll  (A C E) = Stufen 0, 2, 4
        Schritt 9-16  F-Dur   (F A C) = Stufen 5, 0, 2
     A und C liegen in beiden Akkorden, wechseln muss also nur E gegen F.
     Der kleinstmoegliche Wechsel, und genau der, den Gruselmusik seit jeher
     nimmt: von der Tonika zur Sexte, ein Halbton abwaerts in der Oberstimme.
     Die Stufe 6 (G#) ist der Leitton und gehoert zu keinem der beiden - sie
     steht nur am Taktende, wo sie in das A des naechsten Durchlaufs faellt. */
  bpm:112, root:45, scale:[0,2,3,5,7,8,11], scaleName:'Harmonisch Moll',
  delay:0.75,
  ac:'#8fbf3f', ac2:'#a83b2a', bg1:'#141a12', bg2:'#1a1212',
  cats:{beat:'#a83b2a', bass:'#5c6b4a', melo:'#8fbf3f', voice:'#c9c2b0'},
  pal:{K:'#080a08',A:'#8fbf3f',B:'#a83b2a',C:'#3b423a',S:'#c9c2b0',W:'#e8ecd8',E:'#d64545'},
  chars:[
    C('ho1','Herzschlag','beat','stomper','kick',0,'5..3........5..3',{params:{vol:0.68, tone:0.32, space:0.16}}),
    /* Hier stand kurz ein Zufall je Anschlag. Der Mechanismus ist aus dem
     Code genommen (siehe trigger() in audio-engine.js): eine Figur, die
     mal kommt und mal nicht, klingt im Loop kaputt und laesst sich nicht
     exportieren. */
    C('ho2','Türschlag','beat','klatscher','snare',0,'........5.......',{params:{vol:0.62, tone:0.40, space:0.22}}),
    C('ho3','Kratzen','beat','schuettler','hat',0,'......3.......4.',{params:{vol:0.60, tone:0.88, len:0.40, space:0.16}}),
    C('ho10','Sargdeckel','beat','becken','tom',-12,'............0...',{params:{vol:0.70, len:0.44, space:0.46}}),
    C('ho4','Grabbass','bass','moench','bass',-12,'0...0...5...5...',{params:{vol:0.62, tone:0.28, len:0.22, space:0.08}}),
    C('ho5','Grollen','bass','wumme','sub',-12,'0.......5.......',{params:{vol:0.66, len:0.70}}),
    C('ho11','Kriechbass','bass','roehre','wobble',-12,'0.......2.......',{params:{vol:0.50}}),
    /* Eine Spieluhr, deren Feder nachlaesst. `leiern` laesst die Tonhoehe
     langsam wandern, gemeinsam ueber mehrere Toene - das hoert man als
     Leiern und nicht als Verstimmung, und es ist der bekannteste Gruselklang
     ueberhaupt. In Lo-Fi steht das acht Mal, hier stand es null Mal. */
    C('ho6','Spieluhr','melo','funke','modal',12,'0.....2.....0...',{modell:'glocke', leiern:18, params:{vol:0.62, len:0.44, space:0.44}}),
    /* Gemessen lagen die Streicher 5 bis 13 dB UNTER allem anderen - weh
     getan haben sie also nicht durch Lautstaerke, sondern durch Inhalt: ein
     einziger liegender Ton, und darueber eine zweite Stimme einen Halbton
     hoeher. Zwei Toene so dicht beieinander ergeben kein Intervall mehr,
     sondern eine Schwebung, und die haelt das Ohr nicht lange aus, wenn sie
     den ganzen Takt steht. Jetzt eine Linie in drei Stufen, und der Cluster
     nur noch angedeutet statt gleichberechtigt. */
    /* Der Cluster ist ganz raus. Eine zweite Stimme einen Halbton daneben
     ist als kurzer Effekt richtig und als Dauerzustand eine Zumutung - zwei
     Toene so dicht beieinander ergeben kein Intervall, sondern eine
     Schwebung, und die haelt niemand ueber einen ganzen Takt aus. Der Grusel
     kommt jetzt aus der Lage und der Langsamkeit, nicht aus der Reibung. */
    C('ho7','Streicher','melo','geige','strings',0,'0.......5...2...',{sample:'streicher', params:{vol:0.52, tone:0.58, space:0.40}}),
    /* Sieben Toene rauf und runter in einem Takt, waehrend ringsum alles
     liegt - die Floete rannte durch eine Welt, die schleicht. Drei Toene mit
     Luecken dazwischen, und laenger gehalten: ein Knochen hat keine Klappen. */
    C('ho12','Knochenflöte','melo','floete','flute',12,'..0.....5.....6.',{params:{vol:0.60, len:0.62, space:0.44}}),
    /* Nach Effektwert war es mit -51,5 dB eine der leisesten Figuren - und
     trotzdem zu praesent. Die Terzbandmessung zeigt warum: seine Spitze liegt
     bei 1260 Hz und ueberragte dort das ganze Feld. Genau da hoert das Ohr am
     schaerfsten. Also leiser UND den Filter tiefer, statt nur am Pegel zu
     ziehen - der haette das Zischen mit heruntergenommen, nicht weggenommen. */
    C('ho8','Flüstern','voice','saenger','fluestern',0,'........5.......',{params:{vol:0.51, tone:0.34, len:0.70, space:0.52}}),
    /* Lag zwischen 315 Hz und 5 kHz durchgehend 4,6 bis 10,2 dB ueber allem
     anderen - ein reiner Sinus, der sich nirgends einordnet. Dazu spielte er
     die Stufen 4 und 6, und die 6 ist in Harmonisch Moll der Leitton: ein
     grosser Septimabstand zum Grundton des Basses. Als Spannungston richtig,
     als Dauerzustand falsch. Jetzt Grundton und Quinte, deutlich leiser und
     gedaempft. */
    C('ho9','Theremin','voice','trommler','theremin',12,'....0.......5...',{params:{vol:0.50, tone:0.40, len:0.60, space:0.52}}),
    /* Zwei Sachen: sie lag mit -27,8 dB 4,7 dB ueber allem anderen, und sie
     spielte im zweiten Halbtakt F und E nacheinander - eine kleine Sekunde,
     unten im Bass, wo jede Reibung zu Matsch wird. Jetzt nur noch der
     Akkordwechsel, und leiser. */
    C('ho13','Kirchenorgel','voice','funker','orgel',-12,'0.......5.......',{params:{vol:0.58, len:0.52, space:0.58}}),
    /* Vierter Bass, und der einzige gestrichene: die drei anderen sind
     gerechnet, das hier ist eine Aufnahme. Ein gestrichener Ton hat keinen
     Anschlag - er ist einfach da, und man merkt nicht, wann er angefangen
     hat. Genau das fehlte dem Fundament dieser Welt. */
    C('ho14','Bogenbass','bass','cello','strings',-12,'0.......5.......',{sample:'cello', params:{vol:0.56, tone:0.42, len:0.70, space:0.30}}),
    /* Gezupfte Streicher sind der Schritt hinter einem her. Kurz, trocken,
     immer zu zweit - ein einzelner Zupfer ist ein Geraeusch, zwei sind
     jemand, der geht. */
    C('ho15','Zupfschritt','melo','gitarre','pizz',0,'0.0.....0.0.....',{params:{vol:0.72, tone:0.52, len:0.20, space:0.34}}),
    /* Jemand pfeift im Dunkeln. Die Klangart kommt in dieser Welt sonst nicht
     vor, und das ist der Punkt: alles andere hier ist Instrument oder
     Geraeusch, das hier ist ein Mensch. */
    /* Klang nicht nach Pfeifen, weil sie keins war: die Figur lag auf A3 bis
     C4, also 220 bis 262 Hz. Ein Mensch pfeift zwischen etwa 800 und 2500 Hz.
     Nachgemessen lag ihr lautestes Terzband bei 250 Hz - das ist ein Summen.
     Zwei Oktaven hoeher, und der Tiefpass weiter auf, damit die Luft dabei
     ist: ohne das Rauschen ist es ein Sinuston, kein Mund. */
    C('ho16','Nachtpfeifen','voice','geist','whistle',36,'..0.....2.......',{params:{vol:0.52, tone:0.72, len:0.58, space:0.60}}),
    /* Ein Ticken, das nicht aufhoert. Die Klangart ist trocken und ohne
     erkennbare Tonhoehe - deshalb wird sie nicht Teil der Musik, sondern
     bleibt daneben stehen. Genau das macht das Unbehagen. */
    C('ho17','Uhrenticken','beat','kassette','woodblock',0,'5...5...5...5...',{params:{vol:0.85, len:0.30, space:0.24}}),
    /* Der Tritonus, im Mittelalter der `diabolus in musica`. Aus der Tonleiter
     dieser Welt laesst er sich ueber die Stufen gar nicht bilden - darum sitzt
     er in der Tonhoehe: sechs Halbtoene fest nach oben, und die Figur steht
     damit dauerhaft eine verminderte Quinte ueber dem Grundton des Basses.
     Als Flaeche, nicht als Melodie: das Intervall soll stehen, nicht vorbei. */
    /* Vorher sass der Tritonus in der Tonhoehe: sechs Halbtoene fest nach
     oben, und die Figur spielte damit dauerhaft D# - einen Ton, den es in
     dieser Tonart gar nicht gibt. Alle anderen dreizehn Figuren sind
     leitereigen; diese eine stand daneben, jeden Takt, von Anfang bis Ende.
     Das ist kein Grusel, das ist ein Fehler.
     In Harmonisch Moll steckt der Tritonus aber selbst drin: von D nach G#
     sind es genau sechs Halbtoene. Jetzt spielt die Figur diese beiden Toene
     nacheinander, am Taktende, und das G# faellt in das A des naechsten
     Durchlaufs. Dasselbe Intervall - nur gehoert es jetzt dazu. */
    C('ho18','Teufelston','melo','keytar','pad',0,'............3.6.',{params:{vol:0.50, tone:0.40, len:0.40, space:0.52}}),
    /* Chor durch einen uebersteuerten Verstaerker, und aus einer hoeheren Lage
     geholt und langsamer abgespielt. Beides lag im Code bereit und wurde hier
     nie benutzt: `verzerrung` steht sonst nur im Cyberpunk, `dehnen` nirgends.
     Zusammen ergibt das den erwachsenen Chor, den jemand verlangsamt hat. */
    C('ho19','Chorhauch','voice','sternklatscher','voice',0,'0...............',{sample:'chor', verzerrung:0.16, dehnen:12, ansatz:0.30, params:{vol:0.68, tone:0.44, len:0.80, space:0.58}}),
    /* Rueckwaerts abgespielte Glocke. Der Ton waechst aus dem Nichts und endet
     im Anschlag, statt mit ihm anzufangen. Dafuer musste die Wiedergabe das
     erst lernen - siehe rueckBuffer in samples.js. Der lange Ansatz verstaerkt
     das Anschwellen zusaetzlich. */
    C('ho21','Rückwärtsglocke','voice','becken','bell',12,'0...............',{sample:'glocke', rueckwaerts:true, ansatz:0.9, params:{vol:0.95, len:0.80, space:0.56}})]
},
{
  /* CANTINA-SWING, definiert.
     Der Witz der Cantina ist, dass Weltraummusik in Wahrheit Swing der 1930er
     ist - Benny Goodman, gespielt von Aliens. Vier Saeulen tragen den Stil,
     und drei davon sind Rhythmus und Harmonie, nicht Klangfarbe:

     1. HARMONIE IN BEWEGUNG. Swing ist keine Tonart, sondern eine
        Akkordfolge. Ein ganzes Stueck auf einem Akkord ist statisch, egal wie
        gut es klingt. Bass und Begleitung laufen deshalb I-VI-II-V, also die
        Stufen 0-5-1-4. Erst dadurch harmonisiert die Welt ueberhaupt.
     2. SEPTAKKORDE. Terz und Septime geben einem Akkord seine Farbe; Quinten
        allein sind farblos. Die Begleitung nutzt 'septime'.
     3. WALKING BASS IN VIERTELN. Ein Ton pro Schlag, vier pro Takt - nicht
        acht. Achtel im Bass toeten das Swinggefuehl sofort.
     4. SHUFFLE. Deutlich, nicht angedeutet.

     Rollen wie in einer echten Band: Bass geht, Begleitung schlaegt Akkorde,
     EIN Blasinstrument spielt die Melodie, das Metallinstrument verdoppelt
     sie eine Oktave tiefer (das ist die Cantina-Farbe - keine zweite Stimme),
     und Blaesersaetze antworten in den Luecken.
     Das Science-Fiction steckt bewusst nur in den Klangfarben, nicht in der
     Musik: die Musik ist vollkommen irdisch, nur die Instrumente sind fremd. */
  id:'spacefunk',
  /* Druckfarben der Weltkarte: Gold + Purple. Bewusst getrennt von
     ac/ac2 - die bleiben die Bildschirmfarben des Editors. */
  riso:['#ffb511', '#765ba7'], name:'Sci-Funk',
  /* Harmonischer Plan. Er war schon da - der Orbitbass laeuft E, C#, F#, B -
     stand aber nirgends, und zwei Figuren wussten nichts davon. Es ist der
     Swing-Turnaround, ein Akkord je Schlag:
        Schlag 1 (1-4)    E       = Stufen 0, 2, 4 (dazu 6 als Septime)
        Schlag 2 (5-8)    C#-Moll = Stufen 5, 0, 2
        Schlag 3 (9-12)   F#-Moll = Stufen 1, 3, 5
        Schlag 4 (13-16)  B       = Stufen 4, 6, 1
     Das ist die Cantina-Harmonik: nichts Fremdes, nur Mixolydisch, aber jeder
     Schlag ein anderer Akkord - daher das Hopsende. Wer eine Figur schreibt,
     legt ihre Toene auf die Akkordtoene des jeweiligen Schlags. */
  bpm:132, root:52, scale:[0,2,4,5,7,9,10], scaleName:'Mixolydisch',
  swing:60, delay:0.5,
  ac:'#ff7a45', ac2:'#b7f34a', bg1:'#25164a', bg2:'#11152f',
  cats:{beat:'#ff7a45', bass:'#b7f34a', melo:'#63d7ff', voice:'#c99cff'},
  pal:{K:'#0a0920',A:'#ff7a45',B:'#b7f34a',C:'#52428a',S:'#d9b08c',W:'#fff4c8',E:'#63d7ff'},
  chars:[
    C('sf1','Mondstampfer','beat','mondstampfer','kick',0,'5.......4.......',{params:{vol:0.66}}),
    C('sf2','Sternklatscher','beat','sternklatscher','clap',0,'....5.......5...',{params:{vol:0.64, space:0.26}}),
    C('sf3','Meteor-Ride','beat','schuettler','hat',0,'4...4.3.4...4.3.',{params:{vol:0.56, tone:0.80, len:0.30}}),
    C('sf4','Orbitbass','bass','orbitbass','upright',-12,'0...5...1...4...',{params:{vol:0.80, len:0.30, space:0.10}}),
    C('sf5','Tiefenplanet','bass','wumme','sub',-12,'0.......0.......',{params:{vol:0.52}}),
    C('sf6','Laserclav','melo','keytar','stab',0,'0...5...1...4...',{septime:true, params:{vol:0.68, len:0.12, space:0.22}}),
    /* Diese Melodie war zweimal falsch, auf zwei verschiedene Arten.

       Zuerst lief sie am Akkordplan vorbei (H ueber fis-Moll, gis ueber
       h-Moll). Das habe ich repariert, indem ich jeden Ton auf einen
       Akkordton gelegt habe - und damit den zweiten Fehler gebaut: eine
       Folge aus lauter Akkordtoenen ist keine Melodie, sondern eine
       Akkordbrechung. Von fuenf Intervallen waren nur zwei Sekundschritte,
       der Rest Spruenge. Wenn dann noch drei Figuren Akkorde in dieselbe
       Oktave stapeln, hoert das Ohr keine Stimme mehr, sondern eine
       stehende Masse - einen Chor.

       Was eine Melodie ausmacht, sind SCHRITTE. Jetzt eine durchgehende
       Tonleiter abwaerts, e5 bis e4, ein Ton je Achtel:
          e5 d5 | cis5 h4 | a4 gis4 | fis4 e4
       Auf jedem betonten Schlag steht ein Akkordton (e ueber E7, cis ueber
       cis-Moll7, a ueber fis-Moll7, fis ueber h-Moll7). Die beiden Toene,
       die NICHT im Akkord stehen, liegen auf unbetonten Achteln: gis ueber
       fis-Moll und e ueber h-Moll. Genau das sind Durchgangstoene, und
       genau die haben vorher gefehlt - ohne sie klingt eine Linie wie ein
       Arpeggio.

       Im Raster ist es eine Treppe von links oben nach rechts unten. Man
       sieht die Melodie, bevor man sie hoert. */
    C('sf7','Kloohorn','melo','floete','blaeser',12,'..245.....134...',{params:{vol:0.86, tone:0.62, len:0.38, space:0.24}}),
    /* War ein gehaltenes Chor-Sample, auf 0,16 s zerhackt und auf C#5
       gestellt - ein Chor stoesst nicht. Jetzt die Trompete: gestopfte kurze
       Rufe auf den Akkordtoenen des jeweiligen Schlags.

       Die Toene waren gis-gis-h, also zweimal derselbe und dann ein Sprung -
       als Ruf zu wenig Bewegung. Jetzt gis-h-d, ein Ruf, der STEIGT, waehrend
       das Kloohorn faellt. Gegenbewegung ist der einfachste Weg, zwei Stimmen
       hoerbar getrennt zu halten: laufen sie parallel, verschmelzen sie zu
       einer Farbe, laufen sie gegeneinander, bleiben es zwei. */
    /* Die Aufnahme ist eine LEISE geblasene Trompete: gemessen liegt ihr
       Teilton-Schwerpunkt beim 1,8. Teilton, eine kraeftig geblasene liegt
       beim 5.-8. Sie klingt darum rund und brav, egal wie kurz man sie macht
       (nur kuerzen: Schwerpunkt bleibt bei 3,5).
       Blech wird aber nicht dadurch hell, dass man es lauter dreht, sondern
       weil es bei Druck verzerrt - die Obertoene entstehen im Instrument.
       Genau das baut `verzerrung` nach, und die Praesenzanhebung hebt an,
       wo sie landen. Gemessen 3,5 -> 4,8 Teiltoene und +5 dB Spitze, deshalb
       die Lautstaerke deutlich herunter. */
    C('sf8','Funkonaut','voice','saenger','trompete',12,'.....0.2.......6',{sample:'trompete', ansatz:0.02, senke:{hz:2300, db:4, q:1.0}, params:{vol:0.75, tone:0.66, len:0.14, space:0.30}}),
    /* Ein Theremin lebt vom Gleiten: die Klangart faehrt jede Tonhoehe aus
       der vorherigen an. Mit EINEM Ton je Takt gibt es aber keine vorherige -
       ab dem zweiten Durchlauf stand `letzteFreq` schon auf demselben h, und
       damit fuhr nichts mehr. Uebrig blieb ein 1,4 s stehender, fast reiner
       Sinus auf h4, mit anschwellendem Vibrato und viel Hall, mitten im
       Melodiebereich - und der Ton war ueber fis-Moll auch noch die Quarte.
       Ein stehender Sinus in dieser Lage ist genau das, was im Ohr drueckt.
       Jetzt zwei Toene, und damit tut die Klangart, wofuer sie gebaut ist:
       e5 herunter auf e4, eine Oktave, in der Luecke von Schlag 2. Beide sind
       Akkordtoene von cis-Moll (die Terz). Ein Ruf, der faellt, statt eines
       Tons, der steht - leiser, kuerzer, und er bewegt sich weg statt zu
       bleiben. */
    C('sf9','Ufo-Ruf','voice','geist','theremin',12,'.....7.0........',{params:{vol:0.38, len:0.12, space:0.44}}),
    C('sf10','Kratertom','beat','trommler','tom',0,'......3.....4.5.'),
    C('sf11','Ringwobble','bass','roehre','wobble',-12,'0.......3.......'),
    /* Verdoppelt das Kloohorn eine Oktave tiefer - das ist die Cantina-Farbe.
       Das Muster muss deshalb Zeichen fuer Zeichen gleich bleiben: laeuft es
       auseinander, sind es zwei Stimmen statt einer Klangfarbe. */
    C('sf12','Sternentrommel','melo','funke','modal',0,'..245.....134...',{modell:'handpan', params:{vol:0.60, len:0.34, space:0.30}}),
    /* Hiess Blaesersatz und war keiner: 'stab' sind acht verstimmte
       Saegezaehne durch einen fallenden Tiefpass, also ein Synthesizer-Stich.
       Die Harmonik stimmte (Septakkord auf den Offbeats von Schlag 1 und 3),
       das Instrument nicht.

       Jetzt die echte Trompete - viermal, als Akkord. Dafuer gab es bisher
       keinen Weg: `septime` kann nur die Stab-Klangart, und sobald eine Figur
       eine Aufnahme hat, verlaesst trigger() den Klangerzeuger vorher. Der
       neue Schalter `satz` liegt deshalb VOR beiden und gilt fuer Aufnahmen
       genauso wie fuer Synthese.

       [0,2,4,6] heisst: Stufe, Terz, Quinte, Septime - der Vierklang des
       jeweiligen Schlags. Geschrieben auf Stufe 0 ergibt das ueber E den
       Septakkord e-gis-h-d, auf Stufe 1 ueber fis-Moll fis-a-cis-e. Die vier
       Toene liegen auf 64/68/71/74 bzw. 66/69/73/76, und die Trompete hat
       Aufnahmen auf 63/67/70/74/77 - jede Stimme kommt aus einer eigenen
       Datei, hoechstens einen Halbton verschoben.

       Lautstaerke deutlich herunter: vier Stimmen summieren sich, 0,58 waren
       fuer EINEN Klang gedacht.

       Die Figur stand danach auf zwei einzelnen Stoessen (Schritt 4 und 12).
       Harmonisch richtig, musikalisch nichts: zwei Sechzehntel ohne
       Verwandtschaft, jeder fuer sich. Ein Satz ist aber nie ein einzelner
       Stoss, sondern eine FIGUR, die wiederkommt - dieselbe Rhythmuszelle,
       mit der Harmonie weitergeschoben. Genau das steht jetzt da: zwei
       geswingte Achtel ab dem Offbeat, einmal auf Schlag 1 ueber E7, dann
       Zeichen fuer Zeichen dieselbe Zelle auf Schlag 3 ueber fis-Moll7. Die
       geschriebenen Stufen 0 und 1 liegen bewusst einen Ganzton auseinander,
       damit der Vierklang beide Male in derselben Lage steht (64-74 bzw.
       66-76) - schreibt man Schlag 2 auf seine eigene Stufe 5, springt der
       ganze Satz eine Oktave hoch, und dann ist es keine Figur mehr.

       Ein `einstieg` (siehe Mundharmonika) stand hier auch schon: die
       Trompete schwillt ebenfalls an, 90 % erst nach 555 ms. Gemessen bringt
       er hier aber nichts - die 90-%-Zeiten der vier Stoesse schwanken mit
       und ohne gleich stark, weil die Aufnahme ein Vibrato von 3,9 dB bei
       2,5 Hz hat und das jede Messung ueberlagert. Wieder raus: ein Schalter,
       der nichts messbar aendert, ist nur eine Stelle mehr zum Kaputtgehen. */
    /* Dieselbe leise Trompete wie beim Funkonaut, also derselbe fehlende
       Biss - und hier haette ich es fast falsch gemessen. Auf den Teiltoenen
       des Grundtons abgetastet schien die Zerre nichts zu bringen (3,5 ->
       3,6). Das ist ein Messfehler: bei einem VIERKLANG entstehen
       Mischprodukte, und die liegen zwischen den Teiltoenen, nicht auf ihnen.
       Breitbandig gemessen bringt Zerre allein -7,8 -> -7,7 dB, Praesenz
       allein -7,5, BEIDE ZUSAMMEN aber -4,4 dB ueber 1,8 kHz und den
       Schwerpunkt von 995 auf 1182 Hz. Die Zerre erzeugt den Obertongehalt,
       die Praesenz hebt an, wo er landet - einzeln taugt keins von beidem.
       0,90 ist wieder schlechter als 0,60 (-5,5 dB): uebersteuert faellt es
       in sich zusammen. */
    C('sf13','Bläsersatz','voice','funker','trompete',12,'0.....0.1.....4.',{sample:'trompete', satz:[0,2,4], ansatz:0.010, senke:{hz:2400, db:4, q:1.0}, params:{vol:0.46, tone:0.66, len:0.00, space:0.30}}),
    /* ---- Cantina-Zugaben: ein bis zwei je Spalte ---- */
    /* Besen auf der Snare, swingende Achtel, leise: das Zischen, das eine
       Jazzband unter allem laufen laesst. */
    C('sf14','Nebelbesen','beat','klatscher','lofisnare',0,'2.3.2.5.2.3.2.5.',{params:{vol:0.80, tone:0.70, len:0.30, space:0.20}}),
    /* Der echte gezupfte Kontrabass (Aufnahme E1-E3, die Figur liegt genau
       darin). Laeuft als Walking Bass durch alle vier Akkorde und endet auf
       D, das in das E des naechsten Takts zieht. */
    C('sf15','Kantinenbass','bass','cello','upright',-12,'0.2.5.0.1.3.4.6.',{sample:'kontrabass', params:{vol:0.74, tone:0.55, len:0.28, space:0.10}}),
    /* Funk braucht einen Bass, der zwischen den Schlaegen springt: kurze
       Sechzehntel, hell und trocken. Jeder Ton ist Akkordton seines Schlags. */
    C('sf16','Slapbass','bass','moench','bass',-12,'0..0.0..5..5.1.4',{params:{vol:0.66, tone:0.78, len:0.06, space:0.06}}),
    /* Hier stand eine Mundharmonika, und sie ging nicht zu retten: die beiden
       VCSL-Dateien sind GEHALTENE Toene, die langsam anschwellen (50 % Pegel
       nach 45 ms, 90 % erst nach 1475 ms). Schneidet man daraus 0,3 s fuer
       eine kurze Antwort heraus, bekommt jeder Ton ein abgeschnittenes
       Crescendo statt eines Ansatzes. Der Schalter `einstieg` in samples.js
       repariert das messbar und bleibt fuer andere Aufnahmen drin - aber ein
       Instrument, das man erst reparieren muss, damit es kurze Toene kann,
       ist an dieser Stelle das falsche.

       Stattdessen eine Gitarre: die Welt heisst Sci-Funk und hatte keine.

       Sie stand hier zuerst als MELODIEFIGUR, und das war der naechste Fehler.
       Die Rollen dieser Welt sind oben beschrieben und alle vergeben: der Bass
       geht, der Laserclav schlaegt Akkorde, EIN Blasinstrument spielt die
       Melodie, die Sternentrommel verdoppelt sie, der Blaesersatz antwortet.
       Eine zweite Melodiestimme kann darin nur mit dem Kloohorn konkurrieren,
       egal wie richtig ihre Toene sind. In einer Funkband spielt die Gitarre
       auch keine Melodie, sondern kurze Akkorde.

       Und dann lag hier lange die Aufnahme `gitarre`. Der Manifest-Eintrag
       heisst so, das Instrument darin ist aber ein STRUMSTICK: drei Saiten,
       mit den Fingern gezupft, ein Folkinstrument. Es klang deshalb dauerhaft
       nach "irgendetwas Gezupftem" und nie nach der Gitarre, die eine
       Funkband spielt - da half auch kein Anschlagsversatz. Jetzt die
       Klangart `egitarre`, und die ist wirklich eine: Saiten in einen
       Kompressor, in die Saettigung, in eine Box, in dieser Reihenfolge.
       Gemessen solo: Anschlag 1 ms statt 28 ms, Schwerpunkt 1091 statt
       907 Hz.

       Kein `satz` mehr - die Klangart spielt von sich aus Grundton, Quinte und
       Oktave, also einen Powerchord. Der legt kein Tongeschlecht fest und kann
       der Harmonie deshalb nicht widersprechen; dass Schlag 4 h-Moll ist und
       nicht H-Dur, sagen Kantinenbass und Slapbass mit ihrem d.

       Vorsicht beim Regler: `tone` steuert in dieser Klangart nicht nur den
       Tiefpass, sondern auch den Zerrgrad (zerrKurve(0.26 + tone*0.30)). Von
       0,40 auf 0,52 springt der Anteil ueber 1,8 kHz um 10 dB - das ist kein
       Helligkeitsregler, das ist ein Verstaerker. 0,40 liegt knapp ueber der
       alten Aufnahme (523 statt 481 Hz Schwerpunkt) und laesst der Melodie
       oben Platz.

       Die Figur bleibt: zwei enge Anschlagspaare auf Schlag 2 und 4, waehrend
       der Blaesersatz auf 1 und 3 stoesst - die beiden treffen sich nie,
       sondern werfen sich den Takt zu. Geschriebene Stufe 0 ergibt e, Stufe 4
       ergibt h, den Powerchord baut die Klangart darauf.
       Der frueher hier stehende Griff fis-a-cis fuer Schlag 4 war uebrigens
       falsch: auf Schritt 14 spielt der Slapbass ein fis, und fis-a-cis
       darueber ist fis-Moll, nicht h-Moll. */
    C('sf17','Kantinengitarre','melo','gitarre','egitarre',12,'.0...0...1...4..',{params:{vol:0.50, tone:0.40, len:0.10, space:0.20}}),
    /* Das Piepsen kam nicht von zu viel Hoehe, sondern vom Gegenteil: die
       Aufnahme ist fast ein reiner Sinus. Terzbandanalyse der beiden
       benutzten Dateien (67 und 74) - der naechste Teilton liegt 38 bzw.
       50 dB unter dem Grundton, oberhalb ist nichts. Weiche Schlaegel auf
       Aluminium, sauber aufgenommen.

       Damit greift keiner der ueblichen Griffe: `senke` kann nichts
       absenken, was nicht da ist, und `tone` ist ein Tiefpass weit oberhalb
       des Grundtons. Ein lauter, langer, unbewegter Sinus IST ein Piepton -
       genau das stand hier, 1,24 s lang, bei vol 0,85 der lauteste Klang der
       ganzen Melodiespalte, dazu fast die Haelfte in den Hall.

       Was ein Vibraphon von einem Testton unterscheidet, ist der Motor: zwei
       Scheiben drehen sich in den Roehren und machen daraus ein
       Schwanken der Lautstaerke. `tremolo` baut genau das, und die
       Geschwindigkeit haengt am Tempo, laeuft also nicht gegen den Takt.
       Dazu kuerzer und weniger Hall. Die Lautstaerke stand hier zwischendurch
       auf 0,48 und war damit zu weit unten - der Motor loest das Piepsen, der
       Regler musste es nicht auch noch tun. */
    C('sf18','Sternenvibes','melo','becken','bell',12,'....2.....5.....',{sample:'vibraphon', tremolo:0.42, params:{vol:0.70, len:0.34, space:0.30}}),
    /* Pew. Ein Rechteckton, der nach einem Viertel seiner Dauer eine Oktave
       nach unten springt - dieselbe Mechanik wie die Muenze in Arcade, nur
       abwaerts. Einmal am Taktende. */
    C('sf19','Laserpistole','voice','handheld','chip',24,'..............7.',{duty:0.25, sprung:{ht:-12, ab:0.25}, params:{vol:0.95, len:0.16, space:0.34}})]
},
{
  /* Der DMG hatte genau vier Kanäle: zwei Pulsgeneratoren mit je vier
     Tastverhältnissen, einen frei programmierbaren Wave-Kanal mit 32
     Stufen à 4 Bit und einen Rauschkanal mit rückgekoppeltem Schieberegister.
     Genau die sind hier nachgebaut - und pro Kanal spielt nur eine Figur. */
  id:'gameboy',
  /* Diese Welt ist ihre eigene Palette. Statt fremder Druckfarben die
     beiden aeusseren DMG-Toene: dunkel traegt die Skyline, hell den
     Schirm. Und `direktdruck` laesst die Figuren ihre vier Originaltoene
     behalten - eine Zerlegung in zwei fremde Farben nimmt dem Game Boy
     genau das, was ihn ausmacht. */
  riso:['#0f380f', '#9bbc0f'], direktdruck: true, name:'Game Boy',
  kanalkurz:'Nur 4 Tonkanäle – also höchstens 4 Figuren.',
  kanaltext:'Der echte Game Boy hat vier Tonkanäle: zwei Puls, eine Welle, ein Rauschen. Darum spielen hier höchstens vier Figuren gleichzeitig – eine neue löst die alte auf ihrem Kanal ab.',
  bpm:140, root:48, scale:[0,2,3,5,7,9,10], scaleName:'Dorisch',
  /* Ein Game-Boy-Stueck ist selten "ein Song" - es hat eine Aufgabe im Spiel.
     Die drei Fassungen sind die drei Stellen, an denen GB Studio Musik
     braucht, und sie unterscheiden sich nur in dem, was am echten Geraet
     ueberhaupt einstellbar war: Tempo, Grundton, Tonleiter. Die gesetzten
     Schritte bleiben stehen - dieselbe Figur klingt im Bosskampf anders als
     auf der Weltkarte, ohne dass eine Note verschoben wird. */
  songarten:[
    {id:'abenteuer', name:'Abenteuer', lang:'Abenteuer · Weltkarte',
     bpm:140, root:48, scale:[0,2,3,5,7,9,10], scaleName:'Dorisch',
     text:'Unterwegs auf der Karte: flott und hell, mit einem Rest Moll darunter.'},
    {id:'titel', name:'Titel', lang:'Titelbild · Fanfare',
     bpm:104, root:53, scale:[0,2,4,6,7,9,11], scaleName:'Lydisch',
     text:'Der erste Bildschirm: langsamer, feierlich. Die erhöhte Quarte macht es weit.'},
    {id:'boss', name:'Boss', lang:'Bosskampf · Gefahr',
     bpm:168, root:45, scale:[0,2,3,5,7,8,11], scaleName:'Harmonisch Moll',
     text:'Gegner in Sicht: schnell und tief, mit dem übermäßigen Schritt zwischen 6 und 7.'}],
  ac:'#9bbc0f', ac2:'#8bac0f', bg1:'#24331a', bg2:'#0f1a0c',
  cats:{melo:'#c5d84a', voice:'#9bbc0f', bass:'#6f9c2f', beat:'#4f7c3a'},
  catLabels:{melo:'CH1 · PULSE 1', voice:'CH2 · PULSE 2', bass:'CH3 · WAVE', beat:'CH4 · NOISE'},
  catOrder:['melo','voice','bass','beat'],
  onePerCat:true,
  pal:{K:'#0f380f',A:'#9bbc0f',B:'#306230',C:'#306230',S:'#8bac0f',W:'#9bbc0f',E:'#0f380f'},
  /* echte DMG-Palette: genau vier Töne, keine berechneten Zwischenstufen */
  palFull:{K:'#0f380f',A:'#9bbc0f',a:'#8bac0f',H:'#9bbc0f',B:'#306230',b:'#0f380f',
           C:'#306230',c:'#0f380f',S:'#8bac0f',s:'#306230',W:'#9bbc0f',E:'#0f380f'},
  chars:[
    C('gb1','Blip-Lead','melo','keytar','gbpulse',12,'0.2.4.5.7.5.4.2.',{duty:0.5}),
    C('gb2','Piep-Arp','melo','funke','gbpulse',12,'0.4.7.4.0.4.7.4.',{duty:0.125}),
    C('gb3','Sweep-Kick','melo','stomper','gbkick',0,'5...5...5...5.5.'),
    C('gb4','Zweitstimme','voice','saenger','gbpulse',0,'0...2...4...2...',{duty:0.25}),
    C('gb5','Echo-Puls','voice','geist','gbpulse',12,'....4.......7...',{duty:0.5}),
    C('gb6','Wave-Bass','bass','handheld','gbwave',-12,'0...0...5...3...',{wave:'bass'}),
    C('gb7','Wave-Orgel','bass','moench','gbwave',0,'0.......4.......',{wave:'orgel'}),
    C('gb8','Noise-Kit','beat','wumme','gbnoise',0,'0...5...0.0.5...'),
    C('gb9','Blech-Noise','beat','schuettler','gbnoise',0,'6.6.6.6.6.6.6.7.',{shortLfsr:true}),
    C('gb10','Sirene','melo','floete','gbpulse',12,'..5...4...2.....',{duty:0.75}),
    C('gb11','Tick-Puls','voice','funker','gbpulse',24,'0.0...0.0.0...0.',{duty:0.125}),
    C('gb12','Wave-Säge','bass','roehre','gbwave',-12,'0...2...0...4...',{wave:'saege'}),
    C('gb13','Tick-Noise','beat','becken','gbnoise',0,'..7...7...7...7.',{shortLfsr:true}),
    /* Je Kanal eine Figur mehr. Nicht mehr vom Gleichen, sondern die vier
       Rollen, die im Tracker-Satz noch fehlten: ein Sechzehntellauf ueber
       der Melodie, ein Jingle statt einer Stimme, ein laufender Bass und
       ein Wirbel als Uebergang. */
    /* CH1: der Lauf, den Chiptunes ueber alles legen. Kurz und leise -
       er soll glitzern, nicht fuehren. */
    C('gb14','Glitzerlauf','melo','sternklatscher','gbpulse',24,'0123454321012345',{duty:0.25, params:{vol:0.46, len:0.12, space:0.24}}),
    /* CH2: der Einwurf. Zwei helle Blöcke am Taktende, wie ein
       aufgesammelter Gegenstand. */
    C('gb15','Münzblip','voice','muenze','gbpulse',24,'.......7......5.',{duty:0.25, params:{vol:0.82, len:0.10, space:0.30}}),
    /* CH3: Grundton und Oktave im Wechsel - der laufende Bass, den fast
       jedes Game-Boy-Stueck unter der Melodie hat. Dreieck, damit er
       neben Wave-Bass und Wave-Säge eine eigene Farbe hat. */
    C('gb16','Oktavbass','bass','orbitbass','gbwave',-12,'0.7.0.7.4.7.2.7.',{wave:'dreieck', params:{vol:0.70, len:0.18}}),
    /* CH4: kein Grundschlag, sondern der Übergang. Die Höhe ist im
       Rauschkanal die Klangfarbe, also wird der Wirbel nach oben heller. */
    C('gb17','Rauschwirbel','beat','trommler','gbnoise',0,'............3456')]
},
{
  /* LO-FI.
     Vorbilder: Powfu "death bed", Kina "Can We Kiss Forever?",
     Tomppabeats "Monday Loop". Alle drei haben denselben Bauplan:

     EINE gezupfte Schleife traegt das ganze Stueck. Vier Akkorde, immer
     wieder, warm und leise. Darunter ein einfacher, schleppender Beat.
     Alles andere ist Textur - Bandrauschen, Vinylknistern, Regen. Es gibt
     keine Leadstimme, die um Aufmerksamkeit kaempft; die Schleife IST die
     Melodie. Genau deshalb kann man dabei arbeiten.

     Daraus folgt die Rollenverteilung:
     - Die Gitarre spielt die Schleife und ist die lauteste Figur.
     - Das E-Piano legt nur Akkorde darunter, leise und dumpf.
     - Stimmen gibt es fast nicht: hoechstens gehauchte Silben weit hinten.
     - Regen, Band und Platte sind Untergrund, nie Ereignis.

     Handwerklich: 'schleppen' fuer die menschliche Zeit, 'leiern' fuer den
     Bandschlupf, 'septime' fuer Jazzakkorde, und die Koenigsweg-Folge
     (IV-V-iii-vi, Stufen 3-4-2-5) als Harmonie. */
  id:'lofi',
  /* Druckfarben der Weltkarte: Coral + Steel. Bewusst getrennt von
     ac/ac2 - die bleiben die Bildschirmfarben des Editors. */
  riso:['#ff8e91', '#375e6b'], regen: true, name:'Lo-fi', tag:'Rhodes, Staub, City Pop.',
  bpm:84, root:48, scale:[0,2,4,5,7,9,11], scaleName:'Dur', swing:30,
  ambience:{type:'vinyl', level:0.34},
  ac:'#d98aa7', ac2:'#76b7ad', bg1:'#21182c', bg2:'#121622',
  cats:{beat:'#cf836d', bass:'#8aa18a', melo:'#d0a36d', voice:'#a98fc5'},
  /* Die Augen waren weg, und zwar in JEDER Figur dieser Welt - nicht nur
     beim E-Piano. Gemessen an den Druckfarben Coral/Steel: Haut #c89d82
     deckt 0,53/0,16, das alte Augen-Gold #d0a36d 0,55/0,11. Beide landen
     damit in derselben Stufe (VOLL/Papier), also im selben Farbauftrag -
     das Auge druckt exakt wie die Wange um es herum. Zwei Prozent
     Unterschied trennt keine Schwelle, auch keine dritte.
     Lo-fi war die einzige Welt mit diesem Zusammenfall; ueberall sonst
     steht ein kuehles Auge in einem warmen Gesicht. Jetzt auch hier:
     #5fbcd6 deckt 0,03/0,69 und wird als Steel voll gedruckt, waehrend die
     Haut nur Coral bekommt. */
  pal:{K:'#0d0d16',A:'#d98aa7',B:'#76b7ad',C:'#5a5268',S:'#c89d82',W:'#f2dcc6',E:'#5fbcd6'},
  chars:[
    C('lf1','Staubkick','beat','stomper','lofikick',0,'5.....5...5.....',{sample:'kick', params:{vol:0.98, tone:0.44}}),
    C('lf2','Pappsnare','beat','klatscher','lofisnare',0,'....5.......5...',{sample:'snare', schleppen:0.028, params:{vol:0.62, tone:0.36}}),
    C('lf3','Teppichhut','beat','schuettler','lofihat',0,'2.3.2.432.3.2.4.',{schleppen:0.014, params:{vol:0.78, tone:0.70}}),
    C('lf10','Holzklopf','beat','becken','woodblock',0,'..........3.....'),
    C('lf4','Kontrabass','bass','moench','upright',-12,'3...4...2...5..4',{schleppen:0.012, leiern:7, params:{vol:0.76, tone:0.52}}),
    C('lf5','Subbass','bass','wumme','sub',-12,'0.......0.......',{params:{vol:0.58}}),
    C('lf11','Weichbass','bass','roehre','sub',-12,'3...4...2...5...',{leiern:5, params:{vol:0.62, len:0.46, space:0.14}}),
    C('lf6','E-Piano','melo','keytar','rhodes',0,'3...4...2...5...',{sample:'epiano', schleppen:0.02, leiern:11, params:{vol:0.29, tone:0.32, len:0.38, space:0.44}}),
    C('lf7','Regen','voice','funke','regen',0,'2...............',{params:{vol:0.62, tone:0.74, len:0.92, space:0.30}}),
    C('lf12','Flöte','melo','floete','flute',12,'....4.2.......0.',{leiern:12, params:{vol:0.44, tone:0.56, len:0.38, space:0.44}}),
    C('lf15','Gitarre','melo','gitarre','twang',12,'3...5...2...4...',{sample:'gitarre', schleppen:0.018, leiern:8, params:{vol:0.33, tone:0.30, len:0.46, space:0.40}}),
    C('lf9','Plattenstreicher','voice','kassette','strings',0,'3.......2.......',{sample:'streicher', leiern:6, params:{vol:0.30, tone:0.26, len:0.82, space:0.44}}),
    C('lf8','Summstimme','voice','saenger','voice',12,'3...4...2...5...',{sample:'chor', params:{vol:0.26, tone:0.28, len:0.46, space:0.26}}),
    C('lf13','Akkordwolke','voice','funker','stab',0,'3.......2.......',{septime:true, schleppen:0.018, params:{vol:0.26, tone:0.34, len:0.70, space:0.50}}),
    C('lf14','Vibraphon','melo','trommler','bell',12,'..5.4...2.4.5...',{sample:'vibraphon', leiern:8, params:{vol:0.37, tone:0.42, len:0.44, space:0.46}}),
    C('lf16','Handpan','melo','geist','modal',0,'3...4...2.......',{modell:'handpan', leiern:9, params:{vol:0.31, tone:0.34, len:0.52, space:0.48}}),
    /* Richtung GameChops (Dj CUTMAN, "Zelda & Chill" und Verwandte). Deren
       Kunstgriff ist nicht, Spielmusik auf Rhodes nachzuspielen - es ist,
       das SPIEL im Beat hoerbar zu lassen: die Melodie bleibt ein weicher
       Rechteckton, dazwischen faellt ein Spielgeraeusch, und darunter
       liegt trotzdem der Teppich. Genau die Haelfte fehlte hier - Lo-fi
       hatte den Teppich, aber nichts, was darauf spielt. */
    /* Die Melodie selbst, in parallelen Terzen wie in den Vorlagen. Leise,
       dunkel und mit Bandschlupf: ein Chip klingt erst dann nach Zimmer,
       wenn er durch dieselbe Maschine geht wie alles andere. */
    C('lf17','Chipmelodie','melo','handheld','chip',12,'5...6.5.4...7.6.',{duty:0.5, terz:true, schleppen:0.018, leiern:10, params:{vol:0.52, tone:0.44, len:0.34, space:0.42}}),
    /* Das eingestreute Spielgeraeusch. Einmal im Takt, weit hinten im
       Hall - als Beigabe, nicht als Melodie. */
    C('lf18','Münzglitzer','voice','muenze','chip',24,'..............5.',{duty:0.25, sprung:{ht:7, ab:0.3}, params:{vol:0.58, tone:0.46, len:0.14, space:0.62}}),
    /* Schnipser statt Klatschen: dieselbe Aufnahme, nur kurz und leise
       gefahren - so macht man das im Lo-fi seit jeher. Der Nachschlag auf
       15 ist der menschliche Fehler, der den Takt erst atmen laesst. */
    C('lf19','Schnipser','beat','sternklatscher','clap',0,'....5.......5.3.',{sample:'clap', schleppen:0.02, params:{vol:0.50, tone:0.52, space:0.30}}),
    /* Weiche Toms als Uebergang am Taktende - gestimmt, also faellt der
       Wirbel wirklich. Dumpf gehalten, sonst wird aus dem Uebergang ein
       Schlagzeugsolo. */
    C('lf20','Weichtom','beat','mondstampfer','tom',0,'..........2.1.0.',{schleppen:0.016, params:{vol:0.42, tone:0.34, len:0.30, space:0.26}}),
    /* Der rutschende Sinusbass. Kontrabass und Subbass springen beide von
       Ton zu Ton; dieser gleitet, und das ist der Unterschied zwischen
       Jazzkeller und Kopfhoerer. */
    C('lf21','Rutschbass','bass','orbitbass','sub',-12,'3...4...2...5...',{glide:0.09, leiern:6, params:{vol:0.62, len:0.52, space:0.10}}),
    /* Ein einziger gestrichener Ton unter allem. Der Plattenstreicher
       wechselt in der Taktmitte, dieser haelt durch - das ist das Polster,
       auf dem die "& Chill"-Platten liegen. */
    C('lf22','Cellopolster','voice','cello','strings',-12,'3...............',{sample:'cello', leiern:5, params:{vol:0.34, tone:0.30, len:0.95, space:0.46}})]
},
{
  /* WESTERN nach Morricone. Von allen Welten hier hat diese die festesten
     Vorgaben - ein Mann hat das Genre praktisch allein definiert:

     1. AEOLISCH, nicht Mixolydisch. Der Spaghetti-Western ist Moll. Und im
        Bass keine Terzen, sondern offene Quinten - das ist die Weite.
     2. GALOPP. Ein Pferd laeuft nicht in geraden Achteln, sondern punktiert:
        lang-kurz, lang-kurz. Gerade Achtel sind ein Marsch, kein Ritt.
     3. DIE DREI STIMMEN: Pfeifen, Trompete, Mundharmonika. Alle drei sind
        einzelne Stimmen ueber weitem Raum, nie Akkorde.
     4. STILLE. Morricone laesst mehr weg als er hinsetzt. Deshalb sind die
        Muster hier duenn - das ist Absicht, kein Versehen. */
  id:'western',
  /* Druckfarben der Weltkarte: Gold + Burgundy. Bewusst getrennt von
     ac/ac2 - die bleiben die Bildschirmfarben des Editors. */
  riso:['#ffb511', '#914e72'], name:'Western', tag:'Weite, Staub, ein Pfeifen am Horizont.',
  bpm:100, root:50, scale:[0,2,3,5,7,8,10], scaleName:'Aeolisch',
  delay:1.0,
  ac:'#e8a33d', ac2:'#c4553a', bg1:'#3a2418', bg2:'#1d1410',
  cats:{beat:'#a8663a', bass:'#8a6a45', melo:'#e8a33d', voice:'#d8cbb0'},
  pal:{K:'#1a1008',A:'#e8a33d',B:'#c4553a',C:'#6b4a30',S:'#e8c9a0',W:'#fff0d8',E:'#8fd0e0'},
  chars:[
    C('we1','Hufgetrappel','beat','trommler','hufe',0,'5..55..55..55..5',{params:{vol:0.95, len:0.34}}),
    C('we2','Handklatschen','beat','klatscher','clap',0,'....5.......5...',{sample:'clap', params:{vol:0.80}}),
    C('we3','Grosse Trommel','beat','stomper','kick',0,'5.......5.......',{sample:'kick', params:{vol:0.94}}),
    C('we4','Schuettelei','beat','schuettler','hat',0,'......3.......4.',{params:{vol:0.60}}),
    C('we5','Kontrabass','bass','moench','upright',-12,'0...0...4...4...',{sample:'kontrabass', params:{vol:0.90, len:0.30, space:0.14}}),
    C('we6','Tiefe Streicher','bass','cello','strings',-12,'0.......4.......',{body:'low', sample:'cello', params:{vol:0.44, tone:0.58, len:0.82, space:0.26}}),
    C('we15','E-Bass','bass','roehre','bass',-12,'0.0.0.0.4.4.4.4.',{params:{vol:0.47, tone:0.44, len:0.16, space:0.06}}),
    C('we8','Klampfe','melo','gitarre','twang',12,'0...0.4.....2...',{sample:'gitarre', tremolo:0.55, params:{vol:0.39, tone:0.44, len:0.34, space:0.44}}),
    C('we9','Mundharmonika','melo','floete','harmonica',0,'4.....2.....4...',{sample:'mundharmonika', params:{vol:0.58, tone:0.82, len:0.30, space:0.40}}),
    C('we10','Pfiff','melo','saenger','whistle',12,'0...4.......2...',{params:{vol:0.95, len:0.52, space:0.34}}),
    C('we14','Trompete','melo','funker','trompete',12,'....0.......4...',{sample:'trompete', params:{vol:0.60, len:0.62, space:0.50}}),
    C('we13','Banjo','melo','gitarre','banjo',0,'0.0.4.0.2.0.4.0.',{params:{vol:0.53, tone:0.60, len:0.22, space:0.30}}),
    C('we7','Maultrommel','voice','roehre','maultrommel',0,'0...0.0.0...0.0.',{params:{vol:0.71, len:0.24, space:0.18}}),
    C('we11','Kirchenglocke','voice','becken','bell',12,'0...............',{sample:'glocke', params:{vol:0.55, len:0.80, space:0.50}}),
    C('we12','Chor der Weite','voice','geist','voice',0,'4.......2...0...',{sample:'maennerchor', params:{vol:0.51, tone:0.46, len:0.72, space:0.60}}),
    /* Je Kategorie eine Figur mehr, und zwar aus der Luecke heraus, nicht
       aus der Menge: geschlagen fehlte die Trommel, geblasen fehlte der
       Bass, gespielt fehlte das Klavier, gesungen fehlte die hohe Stimme. */
    /* Die Militaertrommel. Morricone laesst sie marschieren, nicht
       Backbeat spielen - lang-kurz-kurz, und dazwischen bleibt Luft.
       Sie ist die einzige Trommel dieser Welt mit Fell und Teppich;
       Klatschen und Grosse Trommel decken das nicht ab. */
    C('we16','Marschtrommel','beat','mondstampfer','snare',0,'5..3.3..5..3.3.4',{sample:'snare', params:{vol:0.62, tone:0.70, space:0.28}}),
    /* Blechbass. Der Kontrabass zupft, die Streicher streichen - geblasen
       hatte die Welt unten nichts. Grundton und Quinte im Wechsel: das ist
       die offene Quinte aus der Genreregel, gespielt als Oom-Pah. */
    C('we17','Tuba','bass','wumme','blaeser',-12,'0...4...0...4...',{params:{vol:0.90, tone:0.62, len:0.52, space:0.24}}),
    /* Das Saloonklavier. Ein Klavier, das jahrelang nicht gestimmt wurde -
       darum `leiern` deutlich hoeher als sonst; die Verstimmung IST der
       Klang. Ohne sie waere es ein Konzertfluegel im Staub. */
    C('we18','Saloonklavier','melo','keytar','twang',0,'0...4.7.2...5...',{sample:'klavier', leiern:16, schleppen:0.02, params:{vol:0.33, tone:0.52, len:0.40, space:0.34}}),
    /* Die hohe Stimme ueber der Weite - bei Morricone singt sie ohne Text,
       hoch und weit hinten. Der Maennerchor traegt unten, diese ruft oben;
       zusammen sind sie der ganze Effekt. Zwei Toene im Takt, mehr nicht. */
    C('we19','Sopranruf','voice','sternklatscher','voice',12,'4.......7.......',{sample:'chor', params:{vol:0.44, tone:0.60, len:0.88, space:0.66}})]
}];

/* Werksbalance: breite und tiefe Klaenge kommen leiser herein als Beats.
   Ohne das summieren sich acht Figuren im selben Frequenzbereich zu Matsch.
   vol = Startlautstaerke, space = Startanteil im Hall. */
const ENGINE_MIX = {
  sub:{vol:0.52, space:0.06}, wobble:{vol:0.56, space:0.10},
  pad:{vol:0.46, space:0.32}, fluestern:{vol:0.62, space:0.40},
  schleier:{vol:0.52, space:0.42}, chip:{vol:0.72, space:0.18},
  orgel:{vol:0.66, space:0.52}, theremin:{vol:0.62, space:0.48},
  blaeser:{vol:0.74, space:0.24}, trompete:{vol:0.76, space:0.50},
  hufe:{vol:0.70, space:0.12}, maultrommel:{vol:0.60, space:0.20},
  banjo:{vol:0.62, space:0.22},
  regen:{vol:0.54, space:0.40}, tape:{vol:0.46, space:0.30},
  strings:{vol:0.70, space:0.30}, stab:{vol:0.58, space:0.24},
  bass:{vol:0.70, space:0.08}, upright:{vol:0.70, space:0.10},
  gbwave:{vol:0.70, space:0.10},
  kick:{vol:0.82, space:0.05}, lofikick:{vol:0.82, space:0.05}, gbkick:{vol:0.80, space:0.05},
  snare:{vol:0.74, tone:0.78, space:0.22}, lofisnare:{vol:0.72, tone:0.72, space:0.22}, clap:{vol:0.70, tone:0.78, space:0.26},
  hat:{vol:0.62, tone:0.88, space:0.14}, lofihat:{vol:0.60, tone:0.82, space:0.14}, gbnoise:{vol:0.62, tone:0.86, space:0.12},
  tom:{vol:0.68, space:0.18}, woodblock:{vol:0.62, space:0.16},
  lead:{vol:0.62, space:0.22}, pluck:{vol:0.64, space:0.24}, bell:{vol:0.58, space:0.30},
  flute:{vol:0.60, space:0.28}, whistle:{vol:0.58, space:0.30}, harmonica:{vol:0.58, space:0.24},
  rhodes:{vol:0.74, space:0.24}, twang:{vol:0.64, space:0.20}, pizz:{vol:0.64, space:0.20},
  voice:{vol:0.82, tone:0.72, space:0.30}, fx:{vol:0.54, space:0.30},
  gbpulse:{vol:0.66, space:0.16}, horn:{vol:0.72, space:0.34}, supersaw:{vol:0.62, space:0.26}, bitcrush:{vol:0.66, space:0.22}, egitarre:{vol:0.58, space:0.20}, modal:{vol:0.66, space:0.28}, glitch:{vol:0.62, tone:0.92, space:0.18}
};

const CATS = [
  {id:'beat', label:'BEATS'},
  {id:'bass', label:'BASS'},
  {id:'melo', label:'MELODIE'},
  {id:'voice', label:'STIMME & FX'}];
const TONAL = {bass:1,sub:1,pluck:1,lead:1,chip:1,orgel:1,theremin:1,blaeser:1,trompete:1,pad:1,fluestern:1,schleier:1,voice:1,bell:1,gbpulse:1,gbwave:1,
  tom:1,wobble:1,flute:1,stab:1,
  rhodes:1,upright:1,tape:1,strings:1,pizz:1,twang:1,harmonica:1,whistle:1,
  maultrommel:1,banjo:1,modal:1,egitarre:1,supersaw:1,bitcrush:1,horn:1};
