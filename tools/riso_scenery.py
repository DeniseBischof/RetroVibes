"""Macht aus den drei Dachkulissen-Bildern einen Zweifarben-Risodruck.

Gleiche Idee wie js/riso.js, nur einmal vorab statt bei jedem Laden:
Farbauszug -> gedrehtes Punktraster -> Passerversatz -> Ueberdruck.

Papier ist dasselbe Creme wie die Genrekarten. Der dunkle Nachthimmel
entsteht als volle Deckung der kalten Farbe, nicht als eigene
Farbflaeche - genau wie auf echtem Papier.

Zur Feinheit: die Quellbilder sind nur 209 px breit und werden im
Browser auf die volle Fensterbreite gezogen. Ein Rasterpunkt waechst
dabei mit. Damit er auf breiten Bildschirmen nicht klobig wird, wird
vor dem Rastern mit LUPE vergroessert - die Rasterweite bleibt in
Bildpunkten gleich, wird auf dem Schirm aber entsprechend feiner:

    Punktweite am Schirm = RASTER * Fensterbreite / (Quellbreite * LUPE)

Bei LUPE_HIMMEL 8 und RASTER 2.6 sind das auf einem 2000-px-Fenster rund
3,1 px - etwa so fein wie das Raster der Genrekarten.

    python tools/riso_scenery.py
"""
import math
import os

import numpy as np
from PIL import Image

HIER = os.path.dirname(os.path.abspath(__file__))
ORDNER = os.path.join(HIER, "..", "assets", "intro-rooftop")

PAPIER = (246, 236, 214)   # dasselbe Creme wie die Karten
FARBE_A = (74, 74, 122)    # gedaempftes Indigo, traegt die Nacht
FARBE_B = (145, 78, 114)   # Riso-Burgundy, traegt das Abendlicht
# Vorher lag hier Fluo-Orange (#ff5a4d). Das ist die lauteste Farbe im
# Riso-Katalog und hat die ganze Seite dominiert.

# Der Mond sitzt im Quellbild bei x 162..165, y 15..21 (von 209x118).
# Er wird herausgeloest und als eigene Ebene gedruckt: der Himmel wird
# im Browser auf die Fensterhoehe gezogen, damit der ganze Verlauf
# sichtbar bleibt - ein mitgedehnter Mond waere oval.
MOND = (159, 12, 170, 25)  # links, oben, rechts, unten im Quellbild

LUPE_HIMMEL = 8            # erst vergroessern, dann rastern
LUPE_KULISSE = 3           # Silhouetten liegen dreifach breit vor, brauchen weniger
RASTER = 2.6               # Rasterweite in Bildpunkten
WINKEL = (math.radians(15), math.radians(75))
VERSATZ = ((-1.8, 0.6), (1.4, -1.2))   # Passerversatz je Farbe
DECKKRAFT = 0.94
KORN = 0.11
SAAT = 20260904            # feste Saat: zweimal laufen lassen gibt dasselbe Bild


def farbton(rgb):
    """Farbton 0..1 je Bildpunkt, -1 wo es keinen gibt (grau)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(axis=-1), rgb.min(axis=-1)
    d = mx - mn
    sicher = np.where(d == 0, 1.0, d)
    rot = (mx == r) & (d > 0)
    gruen = (mx == g) & (d > 0) & ~rot
    blau = (d > 0) & ~rot & ~gruen
    h = np.zeros_like(mx)
    h = np.where(rot, ((g - b) / sicher) % 6, h)
    h = np.where(gruen, (b - r) / sicher + 2, h)
    h = np.where(blau, (r - g) / sicher + 4, h)
    return np.where(d == 0, -1.0, h / 6)


def abstand(a, b):
    """Abstand zweier Farbtoene auf dem Farbkreis, 0..0.5."""
    d = np.abs(a - b)
    return np.minimum(d, 1 - d)


def auszug(rgb):
    """Zerlegt Farben in die Deckungsgrade der beiden Druckfarben.

    Helligkeit bestimmt die Menge, Farbton die Aufteilung. Neutrale
    Toene bekommen beide Farben - daraus entsteht im Ueberdruck das
    tiefe Fast-Schwarz, das Riso auszeichnet.
    """
    h_a = float(farbton(np.array(FARBE_A, dtype=float).reshape(1, 1, 3))[0, 0])
    h_b = float(farbton(np.array(FARBE_B, dtype=float).reshape(1, 1, 3))[0, 0])
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255
    chroma = (rgb.max(axis=-1) - rgb.min(axis=-1)) / 255
    h = farbton(rgb)
    bias = (abstand(h, h_b) - abstand(h, h_a)) * 2
    bias = np.clip(bias * np.minimum(1.0, chroma * 2.4), -1, 1)
    bias = np.where((h < 0) | (chroma <= 0.02), 0.0, bias)
    w_a = 0.5 + 0.5 * bias
    bedarf = 1 - lum
    return (np.clip(bedarf * 2 * w_a, 0, 1),
            np.clip(bedarf * 2 * (1 - w_a), 0, 1))


def raster(x, y, n):
    """Runde Rasterpunkte auf einem gedrehten Gitter: 0 in der
    Punktmitte, 1 in der Zellecke. Ein Punkt sitzt dort, wo die
    Deckung groesser ist als dieser Wert."""
    ca, sa = math.cos(WINKEL[n]), math.sin(WINKEL[n])
    u = (x * ca + y * sa) / RASTER
    v = (y * ca - x * sa) / RASTER
    fu = u - np.floor(u) - 0.5
    fv = v - np.floor(v) - 0.5
    return np.hypot(fu, fv) * 1.41421


def breitziehen(bild, mal):
    """Macht aus einem Streifen einen `mal` so breiten - abwechselnd
    Original und Spiegelung. Das ist nahtlos: an jeder Naht trifft eine
    Kante auf ihr eigenes Spiegelbild.

    Warum ueberhaupt: die Silhouetten muessen die Fensterbreite
    ueberspannen, und ihre Hoehe waechst dabei mit. Bei 209x50 waeren
    das auf einem 2000er Fenster 480 px - die halbe Seite. Dreifach
    breit ist der Streifen nur noch ein Drittel so hoch und passt,
    ohne dass die Dachkante unter den Fensterrand rutscht."""
    w, h = bild.size
    breit = Image.new("RGBA", (w*mal, h))
    for i in range(mal):
        teil = bild if i % 2 == 0 else bild.transpose(Image.FLIP_LEFT_RIGHT)
        breit.paste(teil, (i*w, 0))
    return breit


def drucke(name, transparent, lupe, mal=1):
    quelle = Image.open(os.path.join(ORDNER, name)).convert("RGBA")
    if mal > 1:
        quelle = breitziehen(quelle, mal)
    w, h = quelle.size
    # NEAREST: die Silhouetten sollen ihre harten Pixelkanten behalten.
    # Das Raster kommt danach darueber.
    quelle = quelle.resize((w * lupe, h * lupe), Image.NEAREST)
    w, h = quelle.size

    bild = np.asarray(quelle, dtype=float)
    rgb, alpha = bild[..., :3], bild[..., 3] / 255
    deckung = list(auszug(rgb))
    for c in deckung:
        c[alpha < 0.03] = 0

    wuerfel = np.random.default_rng(SAAT)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    ergebnis = np.empty((h, w, 3), dtype=float)
    ergebnis[:] = PAPIER

    for n, farbe in enumerate((FARBE_A, FARBE_B)):
        ox, oy = VERSATZ[n]
        # Passerversatz: die Farbe wird ein Haar daneben gedruckt.
        c = np.roll(deckung[n], (-int(round(oy)), -int(round(ox))), axis=(0, 1))
        # Die Walze traegt nie ganz gleichmaessig auf.
        c = c + (wuerfel.random((h, w)) - 0.5) * KORN
        sitzt = (c > 0.004) & ((c >= 1) | (c >= raster(xx, yy, n)))
        for k in range(3):
            ergebnis[..., k] -= ergebnis[..., k] * (1 - farbe[k] / 255) * DECKKRAFT * sitzt

    # Kein Papierkorn ins Bild rechnen: das liegt als Kachel im CSS
    # darueber. Hier wuerde es nur jede PNG-Kompression zerstoeren -
    # mit Korn war die Datei siebenmal so gross.
    aus_rgb = np.clip(ergebnis, 0, 255).astype(np.uint8)
    if transparent:
        # Silhouetten bleiben freigestellt, der Himmel wird deckend.
        a = (np.clip(alpha, 0, 1) * 255).astype(np.uint8)
        ziel = Image.fromarray(np.dstack([aus_rgb, a]), "RGBA")
        # FASTOCTREE ist das einzige Verfahren, das die Freistellung
        # ueberlebt - MEDIANCUT wirft bei RGBA.
        ziel = ziel.quantize(colors=48, method=Image.FASTOCTREE)
    else:
        # Ein Zweifarbendruck braucht keine 16 Millionen Farben.
        ziel = Image.fromarray(aus_rgb, "RGB").quantize(colors=24, method=Image.MEDIANCUT)

    ziel_pfad = os.path.join(
        ORDNER, name.replace("_flat_pix.png", "_riso.png").replace("_pix.png", "_riso.png"))
    ziel.save(ziel_pfad, optimize=True)
    print("%s -> %s (%dx%d, %.0f KB)" % (
        name, os.path.basename(ziel_pfad), w, h,
        os.path.getsize(ziel_pfad) / 1024))


def mond_ausschneiden():
    """Nimmt den Mond aus dem Himmel und legt ihn als eigene Datei ab.
    Im Himmel bleibt an seiner Stelle die Farbe der Nachbarschaft."""
    quelle = Image.open(os.path.join(ORDNER, "back_pix.png")).convert("RGBA")
    l, o, r, u = MOND
    mond = quelle.crop(MOND)
    # Freistellen: alles, was nicht deutlich heller als der Himmel
    # ringsum ist, faellt weg.
    umfeld = np.asarray(quelle.crop((l-6, o, r+6, u)).convert("RGB"), dtype=float)
    schwelle = float(np.median(umfeld.mean(axis=2))) + 25
    feld = np.asarray(mond, dtype=float)
    hell = feld[..., :3].mean(axis=2) > schwelle
    feld[..., 3] = np.where(hell, 255, 0)
    Image.fromarray(feld.astype(np.uint8), "RGBA").save(
        os.path.join(ORDNER, "moon_pix.png"))

    # Loch im Himmel schliessen: Zeile fuer Zeile mit der Farbe links
    # daneben fuellen. Der Himmel ist ein waagerechter Verlauf, das faellt
    # nicht auf.
    himmel = np.asarray(quelle, dtype=float).copy()
    for y in range(o, u):
        himmel[y, l:r] = himmel[y, l-8]
    Image.fromarray(himmel.astype(np.uint8), "RGBA").save(
        os.path.join(ORDNER, "back_flat_pix.png"))
    print("Mond herausgeloest -> moon_pix.png, back_flat_pix.png")


def drucke_mond(lupe):
    """Der Mond ist keine Farbflaeche, sondern ausgespartes Papier: die
    Walze laesst die Stelle frei. Er wird deshalb nicht durch den
    Farbauszug geschickt, sondern schlicht in Papierfarbe gefuellt -
    mit einem Hauch Farbe am Rand, damit er kein Aufkleber ist."""
    quelle = Image.open(os.path.join(ORDNER, "moon_pix.png")).convert("RGBA")
    w, h = quelle.size
    quelle = quelle.resize((w*lupe, h*lupe), Image.NEAREST)
    w, h = quelle.size
    maske = np.asarray(quelle, dtype=float)[..., 3] / 255

    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    bild = np.empty((h, w, 3), dtype=float)
    bild[:] = PAPIER
    # Angedeutete Randbeule: dort, wo die Maske duenn wird, etwas Farbe.
    rand = (maske > 0.5) & (
        np.roll(maske, 1, 0) * np.roll(maske, -1, 0) *
        np.roll(maske, 1, 1) * np.roll(maske, -1, 1) < 0.5)
    punkt = raster(xx, yy, 1) < 0.55
    for k in range(3):
        bild[..., k] -= bild[..., k] * (1 - FARBE_B[k]/255) * 0.5 * (rand & punkt)

    a = (np.clip(maske, 0, 1) * 255).astype(np.uint8)
    ziel = Image.fromarray(
        np.dstack([np.clip(bild, 0, 255).astype(np.uint8), a]), "RGBA")
    pfad = os.path.join(ORDNER, "moon_riso.png")
    ziel.save(pfad, optimize=True)
    print("moon_pix.png -> moon_riso.png (%dx%d, %.0f KB)"
          % (w, h, os.path.getsize(pfad)/1024))


if __name__ == "__main__":
    mond_ausschneiden()
    drucke("back_flat_pix.png", transparent=False, lupe=LUPE_HIMMEL)
    drucke_mond(lupe=24)
    drucke("middle_pix.png", transparent=True, lupe=LUPE_KULISSE, mal=3)
    drucke("front_pix.png", transparent=True, lupe=LUPE_KULISSE, mal=3)
