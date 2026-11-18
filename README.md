# Schachtbrut

Spin-off von [Sandthron](https://github.com/ftigiser-collab/sandthron) im Alien-Setting: rundenbasierte Strategie auf Hexfeldern, im Dunkeln. **Freie Siedler** gegen **Kolonialmarines** um die Schlüsselorte einer Kolonie — und aus dem alten Wrack frisst sich **die Brut** durch die Schächte, gegen beide. Läuft im Browser (PWA), am PC und auf dem Handy.

**Spielen:** https://ftigiser-collab.github.io/kolonie-lv/ (sobald GitHub Pages aktiv ist)

## Kern: der Bewegungsmelder
- **Es ist dunkel.** Menschliche Gegner sind in Sichtweite zu sehen, die Brut nur aus 2 Feldern Nähe oder im Licht (Flutlicht, Leuchtfackel, Feuer).
- **Melder-Signale:** Alles, was sich seit dem eigenen letzten Zug im Melderbereich bewegt hat und nicht zu sehen ist, erscheint als grünes Signal — Brut, feindlicher Trupp oder Fehlalarm. Signale aus den Schächten sind verschwommen und ungenau.
- **Wer still hält, sendet nichts.** Die Brut lauert.
- Läuft ein Trupp in etwas Unsichtbares, bricht der Zug ab: **Kontakt!**

## Schächte
- Unter der Kolonie liegt ein Netz aus Lüftungsschächten. Die Brut taucht ab, kriecht weiter, taucht anderswo auf und hat dann noch 2 Felder Bewegung und einen Angriff.
- Die Siedler kennen das ganze Netz, die Marines nur, was sie gesehen haben.
- Techniker und Pioniere **verschweißen** Knoten (sperrt auch die Durchreise), Jäger und Brecher brechen sie wieder auf. Infanterie kann selbst durchkriechen (Siedler 2 Knoten, Marines 1).

## Die Brut (gegen alle)
- **Eier** öffnen sich bei Infanterie in 2 Feldern, **Klammerer** befallen Trupps: 3 Runden bis zum **Ausbruch**. Heilung an Krankenstation, Sanitätszelt oder im gelandeten Landungsschiff, der Sanitäter verschafft +1 Runde.
- **Säureblut:** Getötete Brut verätzt die Nachbarfelder, das Feld bleibt 2 Runden ätzend.
- **Harz** breitet sich aus, auch durch die Schächte; der Brenner brennt es weg.
- **Befall** steigt mit Zeit, Harz, Ausbrüchen und gefallenen Menschen und sinkt mit jedem Abschuss. Stufen: Läufer → Jäger → Brecher → **die Mutter**. Bei 100 % verhängt der Orbit die **Quarantäne: alle verlieren**.

## Zwei ungleiche Seiten
| Freie Siedler | Kolonialmarines |
|---|---|
| Feste Basis um die Kolonie-Zentrale | Keine Basis: Landefeld, FOBs, Lieferflüge |
| Zentrale bildet Infanterie aus, Werkstatt baut Lademech und Raupenschlepper | Jede Anforderung kommt per Lieferflug ans Landefeld (3/Runde) oder an ein FOB (3/Runde); Gunboats (900) werden gekauft |
| Techniker baut im Umkreis von 3 Feldern um eigene Bauten | Pionier errichtet FOBs (max. 3) und baut im Umkreis von 2 |
| Wohnmodule bringen Vorräte, Krankenstation heilt Befall | Sanitätszelt heilt Befall, Munition begrenzt (Auffüllen an FOB, Schiff, Landefeld) |
| Kennen alle Schächte | Jeder Trupp mit Kurzstrecken-Melder, Unteroffizier mit großem Melder |
| Werfer holen Landungsschiffe vom Himmel | Smartgunner mit Reaktionsfeuer, Landungsschiffe fliegen über alles |

**Siedler:** Miliz, Späher (Melder, Leuchtpistole), Techniker, Brenner, Werfer, Lademech, Raupenschlepper, Synthetiker.
**Marines:** Schütze, Unteroffizier (Melder, Leuchtfackeln, Orbitalschlag), Smartgunner, Flammentrupp, Pionier, Sanitäter, Panzerwagen, Landungsschiff, Synthetiker.
**Brut:** Ei, Nestknoten, Klammerer, Brutling, Läufer, Spucker, Jäger, Brecher, Mutter.
**Bauten:** Wohnmodul, Werkstatt, Krankenstation, Wachturm, Wachgeschütz, Flutlicht, Sensormast, Barrikade, FOB, Sanitätszelt, Munitionsdepot.

## Sieg
- Fünf Schlüsselorte: Atmosphäreprozessor (2 Punkte), Funkmast (Melder 9), Labor, zwei Erzminen. Punkte je Runde nur für **besetzte** Orte (eigene Einheit daneben oder eigenes Geschütz/FOB in 2 Feldern).
- Punkteziel 25/40/60 — oder die Zentrale der Siedler fällt bzw. die Marines verlieren alles ohne FOB.

## Stand: Stufe 1
- Komplettes Regelwerk, KI für die Gegenseite und die Brut, Staubstürme
- Prozedurale Mondkarte mit Kolonie, Landefeld, Wrack, Schlüsselorten und Schachtnetz
- Alle Grafiken per Code: Trupps, Fahrzeuge, Landungsschiffe, Brut, Bauten, Orte, Harz, Licht und Dunkelheit
- Spielstände (Autospeicher + 3 Plätze), offline spielbar

## Stand: Stufe 2
- **Geheimziele:** Zu Beginn wählt ihr eines von zwei Zielen, die KI-Gegenseite hat ebenfalls eines, das erst beim Erfüllen sichtbar wird (8–14 Punkte + 300). Marines: Sonderorder „Exemplar bergen“ (befallenen Trupp lebend im Landungsschiff aufs Landefeld bringen), Aufstand zerschlagen, Erzvorkommen sichern. Siedler: Funkspruch absetzen, Schächte versiegeln, Landungsschiff abschießen, Brutstätten ausbrennen. Beide: Labordaten sichern, Brut eindämmen, die Mutter töten.
- **Synthetiker** (beide Seiten, höchstens einer): immun gegen Befall, sieht die Brut im Dunkeln auf 3 Felder. Rund jeder dritte trägt einen versteckten Konzernbefehl und läuft irgendwann über — öffnet verschweißte Schächte, legt Geschütze lahm, greift an. Sanitäter, Techniker oder Pionier können scannen: Ein Schläfer schlägt dann sofort los.
- **Atmosphäreprozessor:** ab 55 % Befall Überhitzung, 10 Runden bis zur Kernschmelze (alle verlieren). Techniker, Pioniere und Synthetiker kühlen (+3), unter 40 % Befall beruhigt er sich.
- **Orbitalschlag** (Marines, Unteroffizier, 800, alle 5 Runden) und **Sprengladung** (Siedler, Techniker, 150, zündet am Rundenende): Flächenschaden auf Feld und Nachbarn, brennt Harz weg, verschüttet Schächte dauerhaft.
- KI nutzt Geheimziele, Synthetiker samt Scan, Kühlung, Orbitalschläge und Sprengladungen.

## Grafik-Update
- Gelände mit Höhenfeld und Schummerung: weiche Übergänge, Krater, Windrippel, Felsgrate mit Relief, tiefe Spalten
- Durchgehende Fahrwege, Koloniedeck und Landefeld aus Platten mit Warnstreifen an den Kanten
- Bleibende Spuren: Säureverätzungen, Blut, Wracks, Trümmer, Brandflecken, Orbitalkrater
- Dynamisches Licht: Mündungsfeuer, Explosionen, Flammenwerfer, Feuerschein, flackernde Flutlichter, Leuchtfackeln
- Ziehender Dunst, Staubpartikel, Blitze im Staubsturm
- Einheiten drehen sich weich, atmen leicht, Trupps mit Rucksack und Fraktionsfarbe am Helm; Bewegungsbereich als Umriss
- Aufgeräumte Oberfläche, kompakte Kopfzeile auf dem Handy
- Mehr Details: Rohrleitungen und Laternen entlang der Fahrwege (teils flackernd), Container und Fässer an Kolonie und Orten, verlassene Bergbaumaschinen, Leuchtfeuer am Landefeld, Dampf aus Spalten und Schächten, glänzendes Harz, Fahrspuren von Fahrzeugen, Patronenhülsen, Scheinwerferkegel der Wachtürme
- Neu: Spucker, Nestknoten, Flammentrupp, Munitionsdepot, Wachturm
- Marines: Einflugsequenz zum Start, jeder Nachschub mit eigenem Lieferflug, Landungsschiff als Gunboat nur per Kauf; neues Schiffsdesign (schwerer Senkrechtstarter mit vier Mantelschrauben, Heckrampe, Waffenträgern)
- Brut im eigenen Horror-Design: ausgemergelte, nass glänzende schwarze Lauerer mit Krallenarmen, freiliegenden Rippen und Wirbeln, gehörntem Schädel mit vierteiligem Blütenkiefer und glühendem Schlund, peitschende Rückenfäden; Klammerer als Neunauge, Brutling als schwarzer Aal, Eier als dunkle Brutsäcke
- Feinere Trupps (Arme, Visiere, Bergbauhelme mit Stirnlampe, Waffen je Rolle) und Fahrzeuge (Hydraulik, Ladung, Luken, Waffenkapseln)
- Begehbare Felder und Zielfelder auch im Dunkeln sichtbar

## Geplant
- Mehr Kartentypen (Kolonie im Eis, Raffinerie, Raumstation)
- Feinbalance nach Testpartien
- **Später:** Sound und Musik

## Legende
R. = Runden · LP = Lebenspunkte · Rw = Reichweite · Bew = Bewegung · Mun = Munition · FOB = vorgeschobener Stützpunkt (Forward Operating Base) · PWA = installierbare Web-App (Progressive Web App) · KI = künstliche Intelligenz (Computergegner)

## Technik
Reines HTML/JavaScript (ES-Module), Canvas 2D, keine Abhängigkeiten.
