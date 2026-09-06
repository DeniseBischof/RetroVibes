"""Dampft die Plakatschrift auf die Zeichen ein, die die App braucht.

Oswald kommt als Variable Font mit 850 Zeichen und 168 KB. Gebraucht
werden Latein plus deutsche Umlaute und ein paar Satzzeichen - das sind
332 Zeichen und 65 KB. Die Gewichtsachse (200-700) bleibt erhalten,
darum wird nicht auf einen Schnitt instanziiert.

Die Symbole der Oberflaeche (U+21BB Pfeil, U+25B6 Dreieck, U+2715 Kreuz,
U+25A0 Quadrat) hat Oswald ohnehin nicht; sie kommen aus der
Systemschrift und sind hier bewusst nicht aufgefuehrt.

Quelle der Ausgangsdatei (SIL OFL 1.1, Lizenz liegt als
assets/fonts/OSWALD-OFL.txt daneben):
  https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/Oswald%5Bwght%5D.ttf

    python tools/subset_font.py Oswald-var.ttf oswald-latein.ttf
"""
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

HIER = os.path.dirname(os.path.abspath(__file__))
ORDNER = os.path.join(HIER, "..", "assets", "fonts")

BEREICHE = ",".join([
    "U+0020-007E",   # Grundlatein
    "U+00A0-00FF",   # Umlaute, ss, geschuetztes Leerzeichen, Mittelpunkt
    "U+0100-017F",   # erweitertes Latein, falls mal andere Sprachen dazukommen
    "U+2013-2014",   # Halbgeviert- und Geviertstrich
    "U+2018-201E",   # typografische Anfuehrungszeichen
    "U+2022",        # Aufzaehlungspunkt
    "U+2026",        # Auslassungspunkte
    "U+2039-203A",   # einfache Guillemets
    "U+20AC",        # Euro
    "U+2212",        # Minus
])


def dampfe_ein(quelle, ziel):
    opts = subset.Options()
    opts.layout_features = ["*"]      # Unterschneidung und Ligaturen behalten
    opts.name_IDs = ["*"]             # Namen und Lizenzhinweis behalten
    opts.notdef_outline = True
    opts.recalc_bounds = True

    font = subset.load_font(quelle, opts)
    s = subset.Subsetter(options=opts)
    s.populate(unicodes=subset.parse_unicodes(BEREICHE))
    s.subset(font)
    subset.save_font(font, ziel, opts)

    fertig = TTFont(ziel)
    achsen = [(a.axisTag, a.minValue, a.maxValue) for a in fertig["fvar"].axes]
    print("%s -> %s (%d Zeichen, %.0f KB, Achsen %s)" % (
        os.path.basename(quelle), os.path.basename(ziel),
        len(fertig.getBestCmap()), os.path.getsize(ziel) / 1024, achsen))


if __name__ == "__main__":
    q = sys.argv[1] if len(sys.argv) > 1 else "Oswald-var.ttf"
    z = sys.argv[2] if len(sys.argv) > 2 else "oswald-latein.ttf"
    dampfe_ein(os.path.join(ORDNER, q), os.path.join(ORDNER, z))
