# Optionale Klangdateien

Retrovibes klingt **ohne jede Datei vollständig** — alle Instrumente werden im
Moment des Abspielens gerechnet. Dieser Ordner ist ein Angebot, kein Bedarf:
Wer echte Aufnahmen einsetzen will, legt sie hier ab. Fehlt eine Datei oder das
Manifest, fällt alles still auf die synthetische Fassung zurück. Nichts bricht.

## So geht's

1. Dateien hier ablegen (siehe Ordnervorschlag unten)
2. `manifest.json` anlegen oder ergänzen
3. Fertig — beim nächsten Öffnen einer Welt werden sie im Hintergrund geladen

## manifest.json

```json
{
  "raum": {
    "datei": "raum/halle.wav",
    "quelle": "woher die Datei stammt",
    "lizenz": "CC0"
  },
  "instrumente": {
    "piano": {
      "lizenz": "CC0",
      "dateien": [
        { "note": 48, "datei": "piano/c3.wav" },
        { "note": 60, "datei": "piano/c4.wav" },
        { "note": 72, "datei": "piano/c5.wav" }
      ]
    },
    "kick": {
      "lizenz": "CC0",
      "dateien": [ { "note": 60, "datei": "drums/kick.wav" } ]
    }
  }
}
```

`note` ist die MIDI-Nummer, in der die Aufnahme tatsächlich klingt (60 = C4).
Für Töne dazwischen wird die nächstgelegene Aufnahme in der Abspielrate
verschoben. Drei bis vier Aufnahmen pro Oktave reichen völlig; bei Schlagzeug
genügt eine einzige.

## Eine Figur an eine Aufnahme hängen

In `js/genres.js` bekommt die Figur `sample` mit dem Namen aus dem Manifest:

```js
C('lf6','E-Piano','melo','keytar','rhodes',0,'0...4...2...5...',{sample:'piano'})
```

Die Engine (`rhodes`) bleibt als Rückfall stehen. Ist die Aufnahme da, wird sie
gespielt; fehlt sie, klingt die Figur synthetisch wie bisher.

## Wichtig: die Seite muss ausgeliefert werden

Über `file:///…/index.html` geöffnet lädt **keine einzige Aufnahme**. Der
Browser blockiert dort jedes `fetch`, und alles fällt auf die Synthese zurück —
das Cello klingt dann nach Synthesizer, obwohl die Datei danebenliegt. Die App
sagt es inzwischen selbst in der Hinweiszeile, aber gut zu wissen:

- **GitHub Pages** (`https://`) — funktioniert, dafür ist es gebaut.
- **Lokal zum Hören** — ein statischer Server reicht:
  `python -m http.server 8124 --directory <Projektordner>`, dann
  `http://localhost:8124`. Davon wandert nichts ins Projekt.
- **`file://`** — alles synthetisch. Kein Fehler, aber auch kein Test.

## Die Falle: Bibliotheken benennen nach Griff, nicht nach Klang

VCSL, VSCO-2-CE und Sonatina benennen **mehrere Saetze eine Oktave unter der
klingenden Tonhoehe**. Wer den Dateinamen glaubt, baut einen Satz, der
durchgehend zwoelf Halbtoene falsch liegt - und weil alle Noten gleich falsch
sind, faellt es beim Spielen nicht als Verstimmung auf, sondern nur als
"klingt komisch". Betroffen sind hier: Vibraphon, Strumstick, Trompete,
Mundharmonika, Kontrabass, Roehrenglocken.

Deshalb wird jede Notennummer im Manifest **gemessen**, nicht abgeschrieben.
Zwei Verfahren, weil eines allein nicht reicht:

- **YIN** (kumulierte normierte Differenzfunktion) fuer den Regelfall.
- **Gegenprobe im Spektrum**, wenn YIN eine Oktave darueber meldet: liegt bei
  `f0/2` wirklich nichts, ist die tiefere Zahl falsch. Bei Mundharmonika und
  Maennerchor ist der zweite Teilton lauter als der Grundton - da irrt jeder
  Tonhoehenmesser, das Spektrum nicht.

Bei einer Glocke geht beides nicht: ihr Schlagton ist ein **fehlender**
Grundton. Die Teiltoene stehen im Verhaeltnis 2:3:4:5 darueber, und die
Notennummer wird aus dieser Reihe erschlossen.

## Warum eine echte Aufnahme trotzdem synthetisch klingen kann

Das ist der haeufigste Stolperstein - und er liegt nie an der Aufnahme selbst:

1. **Zu grosse Abstaende zwischen den Aufnahmen.** Liegen nur alle sechs oder
   sieben Halbtoene Dateien vor, wird fast jede Note um drei Halbtoene
   verschoben abgespielt. Damit wandert der Koerperklang des Instruments mit -
   ein Cello klingt dann groesser und falscher, als es je klingen koennte.
   Drei Halbtoene Abstand sind die Grenze, ab der man es nicht mehr hoert.
2. **Immer dieselbe Stelle im Puffer.** Wird jede Note phasengleich ab
   Sekunde null gespielt und ueberlappen sich zwei davon, entsteht ein
   Kammfilter. Das ist der Klang, den man als "synthetisch" hoert. Deshalb
   greift `spieleSample` reihum an leicht verschiedenen Stellen zu und
   verstimmt die Noten minimal gegeneinander.
3. **Unterschiedliche Lautheit im Satz.** Aufnahmen, die nicht auf eine
   gemeinsame Lautheit gezogen sind, springen von Note zu Note im Pegel. Das
   liest das Ohr als Fehler, nicht als Ausdruck.
4. **Zu langes Ueberhaengen.** Klingt eine gehaltene Note weit in die
   naechste hinein, liegen zwei gleiche Aufnahmen uebereinander - siehe 2.
   Schlimmer noch: aus der Melodie wird ein **Akkord**, den niemand
   geschrieben hat. Liegen die beiden Toene eine Sekunde auseinander, ist
   das der Horrorfilm-Cluster - auf einer Mundharmonika unertraeglich.
   Rechnen statt hoffen: `laenge = (0.25 + len*1.8) * 1.18` bei gehaltenen
   Aufnahmen, und das muss **kuerzer** sein als der Abstand zur naechsten
   Note (`60/bpm/4` je Schritt). Wird `len` erhoeht oder das Muster
   ausgeduennt, muss das andere mitwandern.
   Nebenwirkung derselben Ursache: ist `laenge` so gross, dass fast der ganze
   Puffer aufgebraucht wird, bleibt fuer den Round-Robin kein Rest mehr
   (`rest = dauer - rate*(laenge+0.08)`), und dann startet jede Note wieder
   phasengleich - siehe 2.

## Schalter

Im **Manifest**, pro Instrument:

| Schalter | Bedeutung |
|---|---|
| `attack` | Ansatz in Sekunden. Bei geschnittenen Aufnahmen klein halten (0,01–0,05), sonst verschmiert der Anschlag. |
| `gehalten` | Der Ton darf über die Note hinausklingen. |
| `breite` | 0 = eine Schicht. >0 legt eine zweite aus einer späteren Stelle derselben Aufnahme darüber. **Vorsicht:** zwei verstimmte Kopien desselben Klangs sind ein Chorus — auf gestrichenen Instrumenten klingt das nach Streichersynthesizer, nicht nach Ensemble. Standard ist aus. |
| `loop` | Puffer in Schleife. |

An der **Figur** in `js/genres.js`:

| Schalter | Bedeutung |
|---|---|
| `sample` | Name des Instruments im Manifest. |
| `cluster` | Zweite Stimme in Halbtönen daneben. `cluster:1` ist die kleine Sekunde — der Streicherklang aus jedem Horrorfilm. |
| `clusterPegel` | Lautstärke dieser zweiten Stimme (Standard 0,5). |
| `tremolo` | 0–1. Schwankende **Lautstärke** (nicht Tonhöhe), zwei Wellen je Schlag. Der Schalter am Verstärker der Sechziger — ohne ihn ist es eine Gitarre, mit ihm die Weite. |
| `verzerrung` | 0–1. Läuft **parallel**: das Original bleibt, eine gesättigte Schicht wird beigemischt. Vollständig durch die Sättigung geschickt bleibt von einem Chor nur ein Dröhnen. |

## Klangarten, die in dieser Runde dazukamen

| Name | wofür |
|---|---|
| `fluestern` | Atem statt Ton: Rauschen durch zwei wandernde Formanten. Bewusst getrennt von `pad`, an der mehrere Welten hängen. |
| `schleier` | Kalte Fläche mit wanderndem Bandpass und Ringmodulator. |
| `chip` | Rechteckwelle mit einstellbarer Pulsbreite. Mit `terz:true` klingt eine diatonische Terz mit — über die Tonleiter berechnet, bleibt also immer in der Tonart. Mit `vibrato:true` setzt ein verzögertes Vibrato ein. |
| `hufe` | Hufschlag ohne Tonhöhe: Aufschlag, dunkler Hohlraum, Gewicht. Zeitpunkt, Höhe und Stärke streuen pro Schlag — ein Pferd trifft das Raster nie. |
| `maultrommel` | Fester tiefer Impulston, die gespielte Note steuert nur die **Filterfahrt**. Eine Maultrommel ändert ihre Tonhöhe nicht; wer den Grundton verstimmt, baut einen Synthesizer. |
| `banjo` | Stahlsaite über Trommelfell: feste Resonanz bei 380 Hz (Eigenschaft des Instruments, nicht des Tons), oben hell, sofort wieder weg. |
| `trompete` | Blech hat **alle** Teiltöne und wird lauter **heller** — die Sättigung hängt deshalb an der Anschlagstärke. Dient nur noch als Rückfall, wenn die Aufnahmen fehlen. |

Und pro Welt: `delay` setzt die Delayzeit als Bruchteil eines Schlags (0.75 = punktierte Achtel, 0.5 = Achtel, 1.5 = lang und unheimlich). `swing` setzt den Shuffle.

## Was sich am meisten lohnt

1. **Raumklang** (`raum`) — mit Abstand der größte Gewinn pro Kilobyte. Der
   gerechnete Hall ist Rauschen mit Hüllkurve und klingt flach. Eine echte
   Raumaufnahme von 100–300 KB hebt **alle** Figuren gleichzeitig.
2. **Schlagzeug** — echte Kick, Snare und Hi-Hat klingen sofort besser und
   sind je 20–50 KB.
3. **Klavier, Rhodes, Streicher** — genau die Instrumente, an denen Synthese
   scheitert, weil sie von durchgehender Anregung und feinen Spielarten leben.

Nicht ersetzen würde ich: den **Game Boy** (der soll synthetisch sein, das ist
sein Sinn), die **modalen Instrumente** (Glocke, Handpan — die klingen bereits
echt, weil sie physikalisch nachgebaut sind) und den **Lo-Fi-Charakter**.

## Lizenzen — bitte vorher lesen

Läuft das Projekt über GitHub Pages, sind alle Dateien hier **öffentlich
abrufbar**, auch wenn das Repository privat ist. Damit gilt:

- **Nicht geeignet:** Material aus dem Unity Asset Store, Humble Bundles und
  vergleichbaren Paketen. Deren Lizenzen erlauben in aller Regel die Nutzung im
  fertigen Produkt, aber nicht die Weitergabe der Rohdateien — und genau das
  wäre eine öffentlich herunterladbare `.wav` im Repo.
- **Geeignet:** CC0 / Public Domain, selbst Aufgenommenes, oder Material mit
  ausdrücklicher Erlaubnis zur Weiterverbreitung.
- **Hier im Einsatz:** VCSL ist CC0 (Klavier, Schlagzeug, Gitarre), VSCO-2-CE
  ist CC0 (Horn, Trompete, Kontrabass). Mundharmonika, Röhrenglocken und Strumstick sind CC0 (VCSL). Der **Männerchor** kommt wie Celli, Violen und der andere Chor aus dem *Sonatina Symphonic Orchestra*. Celli, Violen und Chor stammen aus dem
  *Sonatina Symphonic Orchestra* und stehen unter
  **CC Sampling Plus 1.0** — das erlaubt die Weitergabe der Dateien
  ausdrücklich, aber nur für **nicht-kommerzielle** Zwecke und mit Nennung
  des Autors. Solange Retrovibes frei bleibt, passt das. Sollte daraus
  einmal etwas Kommerzielles werden, müssen diese drei Sätze ersetzt werden.
- Trag die Herkunft jeder Datei im Manifest unter `quelle` und `lizenz` ein.
  Das kostet nichts und beantwortet später die Frage, woher etwas kam.

## Format

`.wav` funktioniert überall und ist unkompliziert. Wer Platz sparen will, nimmt
`.webm` mit Opus — deutlich kleiner bei gleicher Wahrnehmung, wird von allen
aktuellen Browsern gelesen. Mono reicht für einzelne Instrumente; Stereo lohnt
nur beim Raumklang.
