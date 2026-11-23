# Manager-Modus – Spezifikation (Etappen 12–31)

Bei „Etappe XX“: nur **Abschnitt A (Grundregeln)**, **Abschnitt B (Referenzwerte)** und den Abschnitt der Etappe lesen, dazu nur die dort genannten Quelldateien. Am Ende Abnahme-Liste prüfen, dann Stand in `CLAUDE.md` eintragen (2–4 Zeilen) und Workflow aus `CLAUDE.md` (Branch `etappe-XX`, PR, merge).

---

## A. Grundregeln (gelten für alle Etappen 12–31)

**Vision.** Der Spieler ist Betreiber des Skigebiets Heiligenblut. Jeder Tag läuft in drei Phasen ab: **Vorbereitung** (morgens, Zeit steht) → **Betrieb** 08:30–16:30 (Zeit läuft, Spieler kann selbst fahren, Kennzahlen live) → **Feierabend** (Tagesbericht, Planung, Nacht-Aufträge) → „Nächster Tag“. Hauptindikator ist die **Gästezufriedenheit**; sie treibt den **Ruf**, der Ruf treibt die Nachfrage. Alles kostet Geld, Einnahmen kommen über Tickets und Nebengeschäfte.

**Spielmodi im Startmenü.** „Manager“ (neu, Standard) und „Freies Fahren“ (bisheriges Spiel, unverändert). Im Freien Fahren wird kein `biz`-Code ausgeführt.

**Architektur.**
- Neuer Ordner `src/biz/`. Die Simulation ist **rein** (kein DOM, kein three.js): `biz/sim.js`, `biz/data.js` usw. Dadurch lässt sie sich im Scratchpad mit `node` headless testen (keine Abhängigkeit, nur ES-Module).
- Brücke zur 3D-Welt nur in `biz/bridge.js` (liest/schreibt `lift`, `pistes`, `crowd`, `hud`). UI nur in `biz/ui.js` (+ evtl. `biz/ui-*.js`).
- **Alle Zahlen** (Preise, Kosten, Kapazitäten, Gewichte) stehen zentral in `biz/data.js`, nie verstreut im Code.
- Spielstand `G` ist ein reines JSON-Objekt (Datum, Uhrzeit, Kasse, Anlagen, Personal, Historie, RNG-Zustand). Zufall nur über eigenen RNG (mulberry32) mit Seed im Spielstand → reproduzierbar.
- Speichern: `localStorage` Schlüssel `hb-biz-v1`, mit Feld `version`. Autosave bei Feierabend und beim Pausieren. Menü: „Weiterspielen“, „Neues Spiel“ (mit Bestätigung).
- Keine Kommentare im Code (Projektregel). Kein Build, kein npm im Repo.

**Zeit.**
- Betriebstag 08:30–16:30 = 8 h Spielzeit. Bei **×1 dauert der Tag 60 min Echtzeit** (1 s echt = 8 s Spielzeit). Faktoren **×1, ×2, ×5, ×10, ×20** (×20 ≈ 3 min). Tasten `+`/`-`, Anzeige im Panel. Faktor wirkt nur auf Sim-Uhr und Gästeflüsse, **nicht** auf Fahrphysik, Kabinentempo und Animation der KI-Fahrer.
- Sim-Schritt: feste 1 Spielminute (bei großen Faktoren mehrere Schritte pro Frame, max. 40 pro Frame).
- Pause (Esc/Menü) hält die Sim-Uhr an.
- Saison: **1. Dezember bis Ostermontag, spätestens 6. April** (Ostern per Gauß-Algorithmus). Danach Saisonende → Sommer wird übersprungen (Etappe 21). Spielstart: 1. Dezember 2026, Saison 2026/27.

**UI.**
- Rechts: **Manager-Panel** (Breite ~280 px, halbtransparent dunkel wie das bestehende Menü), oben rechts bis über die Minikarte; Minikarte bleibt unten rechts. `Tab` klappt das Panel ein/aus. Das Fahrer-HUD links bleibt.
- Zahlenformat `toLocaleString('de-AT')`, Euro als `12.345 €`, große Beträge `1,25 Mio €`.
- Farben: gut grün, Warnung gelb, kritisch rot. Kennzahlen mit Trendpfeil ggü. Vortag (▲▼).
- Planungs- und Feierabend-Ansichten sind große Overlays (Tabs: Übersicht, Anlagen, Preise, Personal, Marketing, Schnee, Finanzen, Bau). Jede Etappe ergänzt ihren Tab.
- Neue Tasten: `+`/`-` Zeitfaktor, `Tab` Panel, `B` Büro (Planungs-Overlay jederzeit öffnen; im Betrieb läuft die Zeit weiter, außer bei ×1 pausiert sie nicht automatisch). Bestehende Tasten nicht umbelegen.

**Rahmen (Nutzerentscheidung, gilt für alle offenen Etappen).**
- **Nur Desktop** (Maus + Tastatur). Keine Handy-/Touch-Anpassungen bauen (der bestehende Mobile-Hinweis aus Etappe 10 bleibt einfach stehen).
- **Reines Einzelspieler-Spiel, offline.** Keine Ranglisten, kein Online-Vergleich, kein Multiplayer, keine Server. Die fiktiven Konkurrenzgebiete aus Etappe 18 (`G.comp`, Faktor `K`) sind nur ein Teil des Nachfragemodells und bleiben unverändert; es kommen keine neuen Konkurrenz-Features dazu.

**Ablauf jeder Etappe (Schritt für Schritt, immer gleich).**
1. `CLAUDE.md` ist schon geladen. Aus `MANAGER.md` nur Abschnitt A, B und den Abschnitt der Etappe lesen.
2. Nur die im Etappen-Abschnitt genannten Quelldateien lesen (bei Bedarf gezielt per `grep` nach Funktionsnamen suchen statt ganze Dateien zu lesen).
3. Branch `etappe-XX` von aktuellem `main` anlegen.
4. Umsetzen. Regeln: keine Kommentare im Code, alle Zahlen in `biz/data.js`, Sim bleibt rein (kein DOM/three.js in `sim.js`, `data.js` und den anderen Sim-Modulen), Spielstand bleibt JSON, neue Felder alter Spielstände über `migrate()` in `sim.js` ergänzen.
5. Prüfen: `node --check` für jede geänderte `.js`-Datei; `node tools/simtest.mjs` (ab Etappe 20b im Repo, Aufruf siehe Etappe 20b) mit `--check`, alle Ziele OK. Wo sinnvoll (UI, 3D, Bedienung) zusätzlich Browser-Test mit Playwright.
6. Abnahme-Liste der Etappe Punkt für Punkt durchgehen und im Chat abhaken.
7. In `CLAUDE.md` unter „Stand“ 2–4 Zeilen zur Etappe eintragen (Dateien, Funktionen, wichtigste Zahlen aus dem Simtest), bei neuen Dateien auch „Struktur“ ergänzen.
8. Commit, Push, Pull Request nach `main`, PR selbst mergen. Danach stoppen: 3–5 Zeilen Zusammenfassung + was der Nutzer im Spiel testen soll.

**Abnahme jeder Etappe (Pflicht).**
1. `node tools/simtest.mjs --check` läuft ohne Fehler, alle Balancing-Ziele aus Abschnitt B sind OK (oder die Abweichung ist im Chat begründet).
2. „Freies Fahren“ funktioniert unverändert (kein `biz`-Code wird geladen).
3. Alter Spielstand lädt ohne Absturz.

---

## B. Referenzwerte (Startwerte für `biz/data.js`)

Realistisch nach österreichischen Mittelgebieten 2025/26. **Bau- und Kaufpreise ≈ 40 % des Realwerts**, damit der Ausbau in 1–3 Saisonen machbar ist. Betriebskosten und Ticketpreise realistisch.

**Start:** Kasse 1.200.000 €, Kredit 0 €, Kreditrahmen 6 Mio € (Zins 5,5 % p. a., täglich verbucht), Ruf 55, Anlagenzustand 70–85 % (leicht heruntergewirtschaftet).

**Lifte (im Spiel vorhanden):**
| Lift | Kapazität P/h | Leistung kW | Personal min. | Fahrzeit |
|---|---|---|---|---|
| Gondel Rossbach | 1.400 | 260 | 4 | 9 min |
| Gondel Schareck | 1.200 | 300 | 4 | 8 min |
| Panoramabahn | 1.800 | 220 | 3 | 6 min |

Strom 0,24 €/kWh, Lastfaktor 0,4 + 0,6 × Auslastung. Wartung fix 350 €/Lift/Betriebstag.

**Tickets (Startpreise):** Tageskarte Erw. 62 €, Jugend (15–18) 47 €, Kind (6–14) 31 €, Halbtag ab 11:30 50 €, Saisonkarte Erw. 520 € (wird vor Saisonbeginn verkauft). Gästemix: 62 % Erw., 13 % Jugend, 25 % Kinder; Halbtag 15 %.

**Nachfrage-Basis B (Gäste/Tag bei Ruf 50, Normalpreis, gutem Schnee, allen Pisten offen):**
| Zeitraum | Werktag | Sa/So |
|---|---|---|
| 1.–19. Dez | 350 | 750 |
| 20. Dez–6. Jan | 1.900 | 1.900 |
| 7. Jan–31. Jan | 550 | 1.150 |
| Februar (Ferienwochen AT/DE/NL 2.–4. Woche) | 1.700 | 2.000 |
| Februar sonst | 750 | 1.250 |
| März | 800 | 1.300 |
| Osterferien | 1.300 | 1.400 |
| nach Ostern | 300 | 550 |

**Kosten pro Kopf und Arbeitstag (inkl. Nebenkosten):** Liftpersonal 210 €, Techniker 270 €, Pistengerätefahrer 250 €, Pistenrettung 240 €, Kassa 190 €, Skilehrer 220 €, Gastro 185 €, Verwaltung fix 3.200 €/Tag.

**Präparierung:** Pistengerät Kauf 190.000 € (Spielpreis), Betrieb 145 €/h, Leistung 1,3 h je Pisten-km. Start: 4 Geräte.
**Beschneiung:** 4,20 €/m³ Schnee (Strom + Wasser), Kanone Kauf 22.000 € (Spielpreis), 55 m³/h, nur bei ≤ −3 °C. Grundbeschneiung 40 cm. Start: 30 Kanonen, verteilt auf Pisten 10, 4, 5.
**Nebengeschäft je Gast:** Gastro 19 € Umsatz (Marge 38 %), Verleih 18 % der Gäste × 36 €, Skischule 6 % × 75 €, Parkplatz 55 % × 6 €.
**Investitionen (Spielpreise):** Fleißbahn (Gondel) 4,8 Mio €, Tunnelbahn 3,2 Mio €, Sessellift Hochfleiß 2,4 Mio €, Upgrade Gondel Rossbach auf 10er (+60 % Kapazität) 3,6 Mio €, neue Piste 180.000 €/km, Hütte ausbauen 350.000 €, Parkhaus 900.000 €.

**Hinweis Ausbau-Start (nach Etappe 20):** Das Spiel startet nur mit Gondel Rossbach, Piste 10 und Rossbach Alm (Kasse 1,5 Mio €, Personal 19, 1 Pistengerät, 10 Kanonen). Alles Weitere wird gebaut. Die alten Ziele (90–130k Skitage in Saison 1) galten für das voll ausgebaute Gebiet und sind ersetzt.

**Stand nach Etappe 20b:** Maßgeblich sind die Werte in `biz/data.js` (Bauprojekte ~50 % der obigen Investitionspreise, Nachfrage-Tabelle ×0,65, Fixkosten je Lift/Gast höher), nicht die Tabellen oben.

**Balancing-Ziele ab Kurzsaison (1 Spieltag = 6 Kalendertage, Saison ≈ 20 Spieltage, Geldbestände/Investitionen ÷6; prüfen mit `node tools/simtest.mjs --check`, 5 Seeds × 5 Saisonen, Mittelwert, Ergebnis = Jahresergebnis inkl. Sommerkosten):**
| Strategie | Saison 1 | Saison 2 | Saison 3 | Saison 4–5 |
|---|---|---|---|---|
| vernünftig | 9–15k Skitage, −0,2 bis +0,3 Mio €, Ø-Z 55–75, Ruf ≥ 48 | 16–26k, +0,1 bis +0,6 Mio € | 20–32k, +0,1 bis +0,6 Mio €, Ø-Z 60–80 | S5 > S3; S5 28–42k, +0,3 bis +1,0 Mio € |
| abwarten | Ruf 40–52, Ø-Z ≥ 45, ≥ −0,1 Mio € | −0,15 bis +0,05 Mio € | keine Insolvenz | keine Insolvenz |
| gierig / geizig | Ruf < 42 | Ruf < 38, Ergebnis < 0 | – | – |
| investor | Kredit ≥ 0,5 Mio €, keine Insolvenz | – | > vernünftig − 0,1 Mio €, Kredit sinkt | keine Insolvenz |

Allgemein: Kein Tag mit Ø-Wartezeit > 45 min bei „vernünftig“; Zufriedenheit typisch 55–80; keine Strategie erreicht in einer Saison mehr als 1,1 Mio € Gewinn.

---

## Etappe 12 – Spielkern: Zeit, Tagesphasen, Spielstand, Panel

**Ziel:** Der Spielablauf existiert, auch wenn es noch keine echte Wirtschaft gibt.

**Umsetzen:**
1. `src/menu.js`: Modus-Wahl „Manager“ / „Freies Fahren“ (in localStorage merken). Bei Manager: „Weiterspielen“ (falls Spielstand vorhanden) und „Neues Spiel“.
2. `src/biz/data.js` mit allen Werten aus Abschnitt B (auch die noch ungenutzten), `src/biz/rng.js` (mulberry32, Zustand im Spielstand).
3. `src/biz/calendar.js`: Datum, Wochentag, Ostern (Gauß), Saisonphase nach Tabelle B, `isSeason(date)`, Formatierung „Mo 01.12.2026“.
4. `src/biz/sim.js`: `newGame()`, `load()`, `save()`, `tick(G, minutes)`, Phasenautomat `prep → open → closed`. Kasse bucht Fixkosten (Verwaltung) und die Lift-Grundkosten (Wartung + Strom nach Laufzeit), damit der Tagesbericht schon Zahlen zeigt.
5. `src/biz/ui.js`: rechtes Panel mit Datum, Uhrzeit, Phase, Zeitfaktor, Kasse, Kosten heute; Vorbereitungs-Overlay (Datum, Wettervorschau-Platzhalter, Button „Lifte öffnen / Tag starten“); Feierabend-Overlay „Tagesbericht“ (Kosten nach Posten, Kasse vorher/nachher) mit Button „Nächster Tag“.
6. `src/biz/bridge.js`: im Manager-Modus wird Zeitfaktor per `+`/`-` gesetzt. Um 16:30: Hinweis „Lifte schließen“, laufende Gondelfahrt des Spielers endet normal, danach Feierabend-Overlay. Während Vorbereitung/Feierabend steht der Fahrer an der Talstation.
7. `src/main.js`: Manager-Modul nur im Manager-Modus laden und in den Loop hängen (`biz.update(dt)`).

**Abnahme:** Tag läuft bei ×1 in 60 min, bei ×20 in ~3 min. Feierabend → Nächster Tag erhöht das Datum. Reload → Spielstand ist wieder da. Freies Fahren unverändert.

---

## Etappe 13 – Gäste, Tickets, Lift-Warteschlangen

**Ziel:** Gäste kommen, zahlen und stehen an. Erste echte Einnahmen.

**Umsetzen:**
1. `biz/demand.js`: Tagesnachfrage
   `N = B(Datum) × P × R × O × ε`, mit
   - Preisfaktor `P = clamp((62 / Ø-Ticketpreis)^1,4; 0,3; 1,6)` (Ø gewichtet nach Gästemix),
   - Ruf `R = 0,4 + 1,2 × Ruf/100`,
   - Angebot `O = 0,3 + 0,7 × (offene Pisten-km / alle Pisten-km)`,
   - Zufall `ε` 0,9–1,1.
   Wetter, Schnee und Marketing kommen später als weitere Faktoren (jetzt = 1, als Platzhalter vorsehen).
2. Ankunft: Glockenkurve 08:15–11:00 (Spitze 09:30), Halbtagsgäste ab 11:30, Abreise 14:30–16:30.
3. `biz/flow.js`: aggregiertes Flussmodell pro Spielminute. Gäste sind in Zuständen: `queue[lift]`, `onLift`, `onPiste[piste]`, `hut`, `gone`. Lift befördert `Kap/60` pro Minute. Abfahrtsdauer pro Piste = Länge / Ø-Tempo (leicht 25, mittel 32, schwer 38 km/h) + Pausen. Verteilung auf Pisten nach Attraktivität (Level-Mix der Gäste: 35 % leicht, 45 % mittel, 20 % schwer). Graph = Gebietsgraph aus `crowd.js` (Liftstationen + Pisten); dort als gemeinsame Funktion herauslösen, wenn nötig. Mittag 11:45–13:30: 60 % der Gäste 40 min in Hütten.
4. Wartezeit je Lift = Queue / (Kap/60) min. Panel zeigt pro Lift: Wartezeit (farbig), Auslastung %.
5. Einnahmen: Ticketverkauf bei Ankunft (nach Mix), Saisonkarten-Gäste zahlen nichts (Anteil startet bei 8 %).
6. Tab **Preise** in Vorbereitung/Feierabend: alle Ticketpreise per ±1-€-Buttons und Eingabe, Vorschau „erwartete Gäste morgen“.
7. 3D: `crowd.js` bekommt `setDensity(f)` (0–1) = Gäste im Gebiet / 2.500. Bei Schlange > 5 min stehen sichtbar Figuren an der Talstation (einfacher Pulk, Instanzen).
8. Panel ergänzen: Gäste im Gebiet / heute gesamt, Umsatz heute (Tickets), Ø-Wartezeit.
9. Tagesbericht: Gäste nach Typ, Einnahmen nach Ticketart, Spitzen-Wartezeit je Lift.

**Abnahme:** Weihnachten lange Schlangen am Rossbach, Jänner-Werktag leer. Preis 90 € → deutlich weniger Gäste. `simtest.mjs` mit 30 Tagen plausibel.

---

## Etappe 14 – Anlagen: Zustand, Defekte, Öffnen/Schließen, Reparatur

**Ziel:** Pisten und Lifte sind verwaltbare Anlagen, die kaputtgehen können.

**Umsetzen:**
1. `biz/assets.js`: je Lift `{id, open, cond 0–100, broken, repairLeft}`, je Piste `{id, open, cond, snow, groomed}` (Schnee folgt in Etappe 16, jetzt Startwert 80 cm).
2. Verschleiß Lift: −0,3 % pro Betriebsstunde × (0,5 + Auslastung). Defektwahrscheinlichkeit pro Stunde `p = 0,0015 × (1 + (100 − cond)/20)²`. Defektarten (Tabelle in `data.js`): Kleinstörung (30–90 min, 2.000–6.000 €), Antrieb (1–2 Tage, 25.000–60.000 €), Seil/Klemme (3–5 Tage, 80.000–150.000 €). Bei Defekt im Betrieb: Lift steht, Gäste in Kabinen = Ereignis „Bergung“ (Zufriedenheit-Abzug folgt in Etappe 15, jetzt Ereignis protokollieren).
3. Reparatur: Auftrag im Tab **Anlagen** (Kosten, Dauer; Option „Express“ ×1,8 Kosten, ½ Dauer). Wartung: „Inspektion“ (4.000 €, +8 % Zustand, Lift morgens 2 h zu).
4. Öffnen/Schließen jederzeit per Klick (Panel-Liste mit Schaltern), auch während des Betriebs. Geschlossener Lift: keine Strom-/Personalkosten (Personal folgt in Etappe 17). Gesperrte Piste: Gäste weichen aus, der Fluss rechnet sie heraus.
5. 3D über `bridge.js`:
   - `lift.js`: `setOpen(sectionId, bool)`. Geschlossen → Kabinen stehen, `E` zeigt „Lift geschlossen“. Defekt → Kabinen stehen, Hinweis „Störung“.
   - `pistes.js`: `setOpen(id, bool)`. Gesperrt → Absperrband (rot-weiße Linie) + Schild „GESPERRT“ am Start, HUD-Pistenname mit „(gesperrt)“, KI-Fahrer meiden die Piste.
6. Panel: Liste Lifte/Pisten mit Status-Punkt (grün offen, gelb Störung/Inspektion, rot zu/defekt), Zustand als Balken. Meldungsleiste (Toast) für Defekte: „Störung Gondel Schareck – Reparatur ca. 1 h, 4.200 €“ mit Button „Reparieren“.

**Abnahme:** Defekt tritt auf, Lift steht in 3D, Reparatur kostet Geld und dauert, danach läuft er wieder. Gesperrte Piste in 3D sichtbar abgesperrt.

---

## Etappe 15 – Zufriedenheit und Ruf (Hauptindikator)

**Ziel:** Jede Entscheidung wirkt auf die Zufriedenheit, und diese bestimmt die Zukunft.

**Umsetzen:**
1. `biz/satisfaction.js`: Live-Wert und Tageswert Z (0–100) aus Teilnoten, Gewichte in `data.js`:
   - Wartezeit 25 % (100 bei ≤ 3 min, 0 bei ≥ 30 min; gewichtet nach Gästen in der Schlange),
   - Pistenangebot 20 % (offene km / gesamt),
   - Pistenqualität 20 % (Ø `cond` der offenen Pisten; ab Etappe 16 aus Schnee und Präparierung),
   - Preis-Leistung 15 % (fairer Preis = 62 € × (0,6 + 0,4 × Angebot); 100 − 3 × (Preis − fair)),
   - Gedränge 10 % (Gäste je offenem Pisten-km; ab 60/km sinkt der Wert),
   - Service 10 % (Platzhalter 70, ab Etappe 17/19 echt).
   Ereignis-Abzüge vom Tageswert: Bergung −8, Liftausfall im Betrieb −3, Pistensperre im Betrieb −2, Unfall −5 (Etappe 22).
2. Ruf: `Ruf = 0,9 × Ruf + 0,1 × Z` am Tagesende. Stammgäste-Bonus: Anteil Saisonkarten nächste Saison = f(Ruf).
3. Gästestimmen: pro Tag 3–5 Zitate aus Vorlagen (`data.js`), passend zur schlechtesten und besten Teilnote („25 Minuten Anstehen am Rossbach – nie wieder!“, „Traumhaft präpariert!“). Sternebewertung = Z/20.
4. Panel oben groß: **Zufriedenheit** (Zahl + Smiley-Farbe + Trend), darunter Ruf. Klick → Aufschlüsselung der Teilnoten als Balken.
5. Tagesbericht: Teilnoten, Stimmen, Ruf-Entwicklung (Mini-Liniendiagramm der letzten 14 Tage, Canvas).

**Abnahme:** Liftsperre zu Spitzenzeiten senkt die Zufriedenheit deutlich, und am nächsten Tag kommen weniger Gäste. `simtest.mjs`: Ruf stabil bei vernünftigem Spiel, fällt bei Preis ×1,5.

---

## Etappe 16 – Schnee, Wetter, Präparierung, Beschneiung

**Ziel:** Natur als Gegenspieler. Nachtarbeit wird zur wichtigsten Feierabend-Entscheidung.

**Umsetzen:**
1. `biz/weather.js`: Tageswetter per Markov-Kette (Sonne, bewölkt, Schneefall, Sturm, Nebel, Föhn/Warm), Temperatur nach Höhe (−0,6 °C/100 m) und Monat (Tal Dez Ø −4 °C, März Ø +3 °C), Neuschnee cm. 3-Tage-Vorhersage mit Unsicherheit (Tag 3 nur 60 % treffsicher). Sturm > 70 km/h → Schareck/Panoramabahn müssen schließen (Sicherheit).
2. Nachfrage-Faktoren: Wetter (Sonne 1,15 · bewölkt 1,0 · Schneefall 0,8 · Nebel 0,85 · Sturm 0,4), Schnee (Ø Schneehöhe der Pisten < 20 cm → 0,3; 20–40 → 0,7; ≥ 60 → 1,05; Neuschnee ≥ 15 cm → +0,2 „Powder-Day“).
3. Schnee je Piste: Schneehöhe, Qualität (pulvrig/griffig/eisig/sulzig/abgefahren). Abfahrten (Gäste × km) bauen Qualität ab; über 0 °C schmilzt es (cm pro Grad·Tag), Regen in tiefen Lagen.
4. Tab **Schnee** (Feierabend): Nacht-Aufträge je Piste: präparieren (ja/nein → Gerätestunden, Kosten, nur mit genug Geräten und Fahrern), beschneien (Stunden, nur bei ≤ −3 °C, Kosten nach m³). Anzeige Wasser/Strom. Ergebnis morgens im Vorbereitungsbericht.
5. Pistenqualität für Zufriedenheit = f(Schneehöhe, Qualität, präpariert).
6. Lawinenwarnstufe 1–5 nach Neuschnee + Wind. Ab Stufe 4 müssen Pisten 1 und 12 gesperrt werden, sonst Unfallrisiko (Etappe 22).
7. 3D: `world.js`/`effects.js`: Schneefall-Partikel, dichter Nebel, bedeckter Himmel (Sonne/Hemi dimmen). Pisten: Cord nur, wenn präpariert, sonst abgefahrene Optik (Shader-Uniform je Piste über `pist`-Attribut). Pistengeräte als Modell in der Nacht nicht nötig.
8. Panel: Wetter heute (Icon, Temp Tal/Berg, Wind), Ø Schneehöhe, Lawinenstufe.

**Abnahme:** Warmphase ohne Beschneiung → Talabfahrt apert aus und muss zu. Präparierung weglassen → Qualität und Zufriedenheit sinken. Schneefall sichtbar.

---

## Etappe 17 – Personal

**Ziel:** Ohne Leute läuft nichts. Lohnkosten sind der größte Kostenblock.

**Umsetzen:**
1. `biz/staff.js`: Gruppen Liftpersonal, Techniker, Pistengerätefahrer, Pistenrettung, Kassa, Skilehrer, Gastro (Kosten aus B). Start: 14 Lift, 4 Technik, 5 Fahrer, 4 Rettung, 5 Kassa, 10 Skilehrer, 18 Gastro.
2. Einstellen/Entlassen im Tab **Personal** (Einstellung wirkt nach 2 Tagen, Kündigung kostet 5 Tageslöhne). Saisonkräfte enden automatisch am Saisonende.
3. Wirkung: Lift öffnet nur mit Mindestpersonal (Tabelle B); Techniker beschleunigen Reparaturen (Dauer × 4 / Techniker, min. ×0,5) und senken Defektrisiko; Fahrer begrenzen Präparierstunden (max. 8 h pro Fahrer und Nacht); Rettung < 1 je 3 offene Pisten → höheres Unfallrisiko; Kassa: zu wenig → Kassenschlange morgens (zählt in die Wartezeit); Skilehrer/Gastro begrenzen Etappe-19-Einnahmen.
4. Moral 0–100: sinkt bei Überstunden (zu wenig Leute) und Lohnkürzung, steigt bei Bonus. Lohnniveau-Regler 90–120 %. Moral < 40 → Krankmeldungen (zufällige Ausfälle).
5. Service-Teilnote (Etappe 15) = f(Kassa-Wartezeit, Personal-Moral, Gastro-Besetzung).
6. Panel: Personal im Dienst / benötigt, Moral, Lohnkosten heute.

**Abnahme:** Zu wenig Liftpersonal → Lift lässt sich nicht öffnen (Meldung). Lohnkosten im Tagesbericht realistisch (~60–70 Personen ≈ 13–15 Tsd. €/Tag).

---

## Etappe 18 – Marketing, Zielgruppen, Konkurrenz

**Ziel:** Gäste aktiv gewinnen und gezielt ansprechen.

**Umsetzen:**
1. `biz/marketing.js`: Kampagnen (Tabelle in `data.js`) mit Kosten, Laufzeit, Verzögerung, Zielgruppe und Wirkung:
   - Social Media (2.500 €/Woche, sofort, +6 %, jung/sportlich),
   - Radio Kärnten (9.000 €/Woche, 3 Tage Verzögerung, +10 %, Tagesgäste),
   - Reisebüros NL/DE (25.000 € einmalig, 14 Tage Verzögerung, +12 % für 4 Wochen, Wochengäste),
   - Plakate Lienz/Spittal (6.000 €, 5 Tage, +5 %),
   - Familienaktion „Kinder gratis am Samstag“ (Einnahmeverlust, Familien +25 % am Samstag),
   - Frühbucher-Saisonkarte (nur vor Saisonstart).
   Marketing-Faktor `M` in der Nachfrage, Abnutzung bei Dauerschaltung (−30 % Wirkung nach 3 Wochen).
2. Zielgruppen Familien / Sportliche / Tagesgäste / Wochengäste: unterschiedliche Preisempfindlichkeit (Familien 1,8, Sportliche 1,0), Pistenvorlieben (leicht/schwer) und Zufriedenheitsgewichte (Familien: Preis und Gedränge; Sportliche: Präparierung und schwere Pisten offen). Nachfrage und Zufriedenheit pro Gruppe rechnen.
3. Konkurrenz (fiktive Nachbargebiete, z. B. „Mölltaler Gletscher“-artig, aber fiktive Namen): Preis und Schneelage schwanken; Faktor `K` = relativer Preisvergleich.
4. Tab **Marketing**: aktive Kampagnen, Budget Saison, geschätzte Wirkung.
5. Panel: Gäste nach Zielgruppe (kleiner gestapelter Balken).

**Abnahme:** Reisebüro-Kampagne erhöht nach 2 Wochen die Wochengäste. Familienaktion senkt den Umsatz pro Gast, erhöht aber Gäste und Zufriedenheit der Familien.

---

## Etappe 19 – Nebengeschäfte: Hütten, Verleih, Skischule, Parkplatz

**Ziel:** Zweites Standbein mit eigenen Entscheidungen.

**Umsetzen:**
1. `biz/side.js`: Hütten (Rossbach Alm, Panoramarestaurant Schareck, Spatzl Alm, Skihütte Fleißalm) mit Preisniveau (günstig/normal/gehoben), Kapazität Sitzplätze, Personal. Verleih (Preis, Ausrüstungszustand, Neukauf), Skischule (Kurspreis, Skilehrer), Parkplatz (Gebühr, Kapazität 600 Plätze; voll → Gäste kehren um).
2. Einnahmen je Gast nach Abschnitt B, skaliert nach Preisniveau (Elastizität) und Besetzung. Volle Hütte mittags → Wartezeit, wirkt auf Service-Note.
3. Tab **Gastro & Service**.
4. 3D: offene Hütte = Licht/Tische auf Terrasse sichtbar (`scenery.js` Hütten-Objekte über `bridge.js` ein-/ausblenden), geschlossene Hütte = Fensterläden zu.
5. Tagesbericht: Umsatz nach Bereich (Tortendiagramm Canvas).

**Abnahme:** Gastro bringt ~20–30 % des Umsatzes. Gehobenes Preisniveau → mehr Marge, weniger Zufriedenheit bei Familien.

---

## Etappe 20 – Investitionen, Kredite, Ausbau

**Ziel:** Das Gebiet wachsen lassen.

**Umsetzen:**
1. `biz/build.js`: Bauprojekte aus B mit Kosten, Bauzeit (Tage, nur außerhalb der Saison oder mit Teilsperrung), Voraussetzungen (z. B. Hochfleiß erst nach Fleißbahn). Weiter: Pistengeräte/Kanonen kaufen und verkaufen, Beschneiung auf weitere Pisten ausbauen (Leitungen pro km 120.000 €).
2. Fleißtal-Lifte (Fleißbahn, Tunnelbahn, Hochfleiß) und ihre Pisten aus OpenStreetMap holen (API 0.6, wie früher; Skript im Scratchpad) → `public/expansion.json`. `lift.js` so verallgemeinern, dass Sektionen aus Daten nachgeladen und erst nach Fertigstellung gebaut/angezeigt werden (`addSection(def)`). Pisten 11/12 an neue Lifte anbinden, Gebietsgraph aktualisieren.
3. Finanzen: Kredit aufnehmen/tilgen (Rahmen, Zins), Abschreibung (Lifte 20 Jahre), Tab **Finanzen** mit Gewinn- und Verlustrechnung Saison, Bilanz light (Kasse, Kredit, Anlagenwert). Kasse < 0 ohne Kreditrahmen → Warnung, 7 Tage → Insolvenz (Game Over mit Bilanz).
4. Tab **Bau**: Projektkarten (Kosten, Nutzen: +Kapazität, +Pisten-km, erwartete Zufriedenheit), Baufortschritt.
5. 3D während des Baus: Baustelle (Kran-Platzhalter, Absperrung) am Standort.

**Abnahme:** Fleißbahn bauen → nach Fertigstellung in 3D befahrbar, mehr Pisten-km, Angebot und Nachfrage steigen. Kredit und Zinsen werden verbucht.

---

## Etappe 20b – Testskript ins Repo + Balancing des Spielverlaufs

**Ziel:** Ein dauerhaftes Testskript im Repo, mit dem jede spätere Etappe das Balancing über mehrere Saisonen nachweist. Danach den Spielverlauf so einstellen, dass die erste Saison machbar ist (keine Abwärtsspirale) und das voll ausgebaute Gebiet nicht zu leicht wird (bisher ~6 Mio € Gewinn).

**Ausgangslage:** Das alte `simtest.mjs` lag nur im Scratchpad früherer Sessions und ist verloren. Es muss neu geschrieben werden. Die Sim ist rein (keine DOM-/three.js-Abhängigkeit) und läuft direkt in Node.

**Dateien lesen (nur diese, gezielt):** `src/biz/sim.js` (Exporte `newGame, startDay, tick, nextDay, setPrice, forecast, report`), `src/biz/data.js` (Werte, Projekte `D.build.projects`, Startwerte `D.start`), Signaturen per `grep -n "^export"` in `assets.js` (`repair, inspect, setOpen`), `snow.js` (`setGroom, setGun, groomPlan, gunPlan`), `staff.js` (`hire, fire, setWage, bonus, needs`), `marketing.js` (`act`), `side.js` (`setLevel, toggleHut, setSidePrice`), `build.js` (`check, order, borrow, repay, seasonPL`). Funktionsrümpfe nur lesen, wenn die Signatur nicht reicht.

**Umsetzen:**
1. **`tools/simtest.mjs` anlegen** (neuer Ordner `tools/`, reines Node-ES-Modul, keine Abhängigkeiten, importiert `../src/biz/*.js`). Keine Kommentare. Es darf `localStorage` nicht benutzen (`save/load` nicht aufrufen).
2. **Aufruf und Optionen:**
   - `node tools/simtest.mjs` → alle Strategien, 3 Saisonen, Seeds 1–5, nur Zusammenfassung.
   - `--strat vernünftig,gierig` Auswahl, `--seasons 2`, `--seeds 1,2,3`, `--days 30` (bricht nach N Spieltagen ab, für schnelle Tests), `--daily` (Tagestabelle zusätzlich), `--check` (Ziele aus Abschnitt B prüfen, Exitcode 1 bei Fehler), `--json datei` (Rohdaten schreiben, z. B. in den Scratchpad).
3. **Tagesschleife (exakt so):**
   ```
   G = newGame(seed)
   solange Saisonzähler < seasons und nicht G.fin.over:
     phase 'prep'   → strat.morning(G), startDay(G)
     phase 'open'   → ev = tick(G, 30); strat.live(G, ev) (z. B. defekte Lifte reparieren)
     phase 'closed' → strat.evening(G, report(G)), nextDay(G)
   ```
   Saisonwechsel erkennen über `G.season`. Schutz gegen Endlosschleifen (max. 200 Tage pro Saison, sonst Fehler). Insolvenz (`G.fin.over`) wird als Ergebnis gemeldet, nicht als Absturz.
4. **Strategien** (jeweils Objekt mit `morning/live/evening`, Entscheidungen nur über die Exporte der Sim, nie direkt Felder in `G` schreiben außer wo es keine Funktion gibt):
   - **vernünftig:** Startpreise; baut in Saison 1 sobald bezahlbar (Kasse ≥ Preis + 300 k€ Reserve, sonst Kredit bis 2 Mio): Gondel Schareck → Piste 4 → Piste 5 → Panoramarestaurant Schareck; im Sommer nach Saison 1 Panoramabahn + Piste 1 + 5a + 2, nach Saison 2 Tunnelbahn + Fleißbahn + Pisten 11/12; Defekte sofort reparieren (Express bei Rossbach), Inspektion bei Zustand < 72 %; Präparierung aller offenen Pisten; Beschneiung 10 h wenn Nacht ≤ −4 °C und Schnee < 70 cm; Personal nach `needs` (fehlende Köpfe einstellen, Überhang am Saisonende abbauen); Marketing Social + Radio ab Saison 2; Hütten Preisniveau normal; Kredit tilgen, wenn Kasse > 1,5 Mio.
   - **abwarten:** Startpreise, baut nichts, repariert normal, präpariert, Personal nach Bedarf, kein Marketing.
   - **gierig:** wie vernünftig, aber alle Ticketpreise ×1,5, Hütten gehoben, Parkgebühr ×2.
   - **geizig:** Startpreise, keine Präparierung, keine Beschneiung, keine Inspektion, Reparatur nur normal, Personal am Saisonbeginn auf Mindestbesetzung (Liftpersonal 9, Rettung 1, Technik 1), Lohn 90 %.
   - **investor:** wie vernünftig, aber baut alles so früh wie möglich mit Kredit (Rahmen voll ausnutzen, auch „sofort“ statt „Im Sommer“), tilgt ab Saison 3.
5. **Ausgabe:** je Strategie und Saison eine Zeile (Mittel über Seeds, dahinter Min–Max): Skitage, Umsatz, Kosten, Ergebnis nach AfA (`seasonPL`), Kasse, Kredit, Ø-Z, Ruf Ende, Defekte, Unfälle, max. Spitzenwartezeit, Insolvenzen, gebaute Projekte (Kürzel + Saisontag). Bei `--daily`: Datum, Gäste, Umsatz, Kosten, Kasse, Z, Ruf, Wartezeit. Bei `--check`: Tabelle Ziel / Ist / OK|FAIL.
6. **Laufzeit:** 5 Strategien × 5 Seeds × 3 Saisonen müssen in < 3 min durchlaufen. Wenn zu langsam: Seeds-Standard auf 3 senken, nicht die Sim verfälschen.
7. **Balancing** gegen die Ziele in Abschnitt B (neue Tabelle): Werte **nur in `biz/data.js`** ändern. Nur wenn ein Ziel mit Werten allein nicht erreichbar ist, Formel minimal im betroffenen Sim-Modul anpassen und im Chat begründen. Erst messen, dann je Durchgang höchstens 2–3 Stellschrauben ändern, erneut messen. Typische Hebel:
   - Saison 1 zu hart (Ruf fällt, Z ~42): Untergrenze Angebots-Faktor (bisher 0,12) und Angebots-Teilnote (100·Anteil^0,45) für das kleine Startgebiet, Startnachfrage, Startpreise.
   - Spätes Spiel zu leicht (~6 Mio Gewinn): Betriebskosten der großen Lifte (Wartung/Personal/Strom je Lift), Verwaltung je Lift, Hütten-Betriebskosten/Marge, Nebengeschäfts-Kosten, Abschreibungsdauer, Nachfrage-Faktor > 1 bei Angebot über Basis.
   - „gierig“/„geizig“ müssen sichtbar scheitern.
8. **Dokumentation:** In `CLAUDE.md` unter „Tests“ eintragen, dass das Skript jetzt in `tools/simtest.mjs` liegt (alte Hinweise auf Scratchpad ersetzen), Aufruf und Optionen in einer Zeile, Ergebnis-Tabelle (vernünftig/abwarten/gierig/geizig/investor, Saison 1–3) knapp unter „Stand“.

**Abnahme:**
- `node --check tools/simtest.mjs` und alle geänderten Dateien ok.
- `node tools/simtest.mjs --days 30 --strat vernünftig --daily` läuft und zeigt plausible Tage.
- `node tools/simtest.mjs --check` (alle Strategien, 3 Saisonen) → alle Ziele OK.
- Saisonwechsel wird 2× ohne Fehler durchlaufen (Werte wie Ruf, Kasse, Kredit, Bauprojekte werden übernommen).
- Im Browser: Manager startet, ein Tag ×20 läuft (Playwright-Browsertest).

---

## Etappe 21 – Saisonzyklus, Sommer-Skip, Jahre, Ziele

**Ziel:** Langzeitspiel über mehrere Saisonen.

**Umsetzen:**
1. Saisonende (Ostermontag bzw. spätestens 6. April): Saisonbilanz-Bildschirm (Skier-Tage, Umsatz, Gewinn, Ø-Zufriedenheit, Ruf, Vergleich zur Vorsaison, beste/schlechteste Tage).
2. **Sommer-Planung** (ein Bildschirm statt Tage): Revision der Lifte (Kosten nach Zustand, setzt auf 95 %), Bauprojekte laufen durch, Personal für die nächste Saison planen, Preise festlegen, Frühbucher-Saisonkarten verkaufen (Menge = f(Ruf, Preis)), Sommer-Fixkosten (Verwaltung, Zinsen) pauschal verbuchen. Button „Saison 20XX/YY starten“ → 1. Dezember.
3. Vorsaison: Saisonstart erst, wenn genug Schnee (natürlich oder Grundbeschneiung ab November als Kostenblock planbar).
4. Entfällt (Nutzerentscheidung): keine Szenarien, keine Schwierigkeit, keine Slots.

**Umgesetzt (Etappe 21):** Saisonbilanz mit Verlauf, Bau/Personal/Finanzen, Sommerplanung (Revision, Bau, Personal, Preise), Fixkosten pauschal beim Saisonstart. Vorsaison-Schnee (Punkt 3) nicht umgesetzt.

**Abnahme:** Kompletter Zyklus Dez → Apr → Sommer → Dez ohne Fehler, Werte werden korrekt übernommen. `simtest.mjs` simuliert 2 volle Saisonen.

---

## Etappe 22 – Ereignisse und Entscheidungen

**Ziel:** Abwechslung und Krisen mit Folgen.

**Umsetzen:**
1. `biz/events.js`: Ereignistabelle mit Bedingung, Wahrscheinlichkeit, Dialog (2–3 Optionen mit Kosten und Wirkung). Beispiele: Föhnsturm (Lifte oben zu), Stromausfall (Notstrom 8.000 € oder Stillstand 2 h), Skiunfall (Wahrscheinlichkeit nach Rettungspersonal, Präparierung, Gedränge, Lawinenstufe), Lawine auf gesperrter vs. offener Piste, FIS-Rennen anfragen (Piste 4 einen Tag gesperrt, +Ruf, Gebühr), Influencer-Besuch (Ruf-Hebel je nach Zustand am Tag), Busgruppe bucht (Rabatt verhandeln), Schneemangel-Presse, Kontrolle Seilbahnbehörde (bei Zustand < 50 % Zwangsschließung).
2. Dialog als Overlay, pausiert die Zeit. Folgen werden im Tagesbericht protokolliert.
3. Spieler fährt selbst: optionale **Kontrollfahrt**. Schäden an Pisten (Steine, Eisplatten, defekte Netze) erscheinen als Markierung in 3D; Anfahren und `E` meldet sie → billigere Behebung vor einem Unfall.

**Abnahme:** In 30 simulierten Tagen 4–8 Ereignisse. Jede Option hat sichtbare Folgen.

---

## Etappe 23 – Dashboard, Tutorial, Balancing, Feinschliff

**Ziel:** Rund, verständlich, ausbalanciert.

**Umsetzen:**
1. Dashboard-Tab **Übersicht**: Liniendiagramme (Canvas, keine Bibliothek) für Gäste, Umsatz/Kosten, Zufriedenheit, Ruf über die Saison. KPI-Kacheln (Umsatz pro Gast, Kosten pro Skier-Tag, Auslastung, Gewinn bis heute vs. Vorjahr).
2. Panel überarbeiten: konfigurierbar (Kennzahlen an/aus), kompakte Ansicht.
3. Tutorial für den ersten Tag (Schritt-für-Schritt-Hinweise: Preise, Lifte öffnen, Panel lesen, Feierabend, Schnee-Tab), überspringbar.
4. Feinbalancing mit `tools/simtest.mjs` (Grundlage aus Etappe 20b) inkl. der neuen Systeme aus 21/22 (Ereignisse, Szenarien): Ziele aus Abschnitt B weiter erreichen, Szenarien „Sanierung“ und „Expansion“ als eigene Simtest-Läufe.
5. Performance (nur Desktop): Sim bei ×20 < 1 ms pro Frame; 3D bei ×20 mit allen Gästen als Figuren (Weihnachten, ~1.900 Gäste) ≥ 45 FPS auf Mittelklasse-PC, sonst Figuren fern stärker zusammenfassen. Panel einklappbar bleibt (`Tab`), keine Touch-Anpassung.
6. Fehlerprüfung: alter Spielstand mit fehlenden Feldern lädt ohne Absturz (Migration über `version`).

**Abnahme:** Neuer Spieler versteht die erste Saison ohne Anleitung von außen. Alle drei Szenarien sind schaffbar, „gierig“ und „geizig“ scheitern.

---

## Etappe 24 – Manager in 3D: Anklicken, Status-Symbole, Vogelperspektive

**Ziel:** Das Gebiet wird in der 3D-Welt gemanagt, nicht nur im Panel.

**Dateien:** `src/biz/bridge.js`, `src/biz/ui.js`, `src/camera.js` (Flugmodus `startFly/endFly`), `src/lift.js`, `src/pistes.js`, `src/scenery.js` (Hütten), `src/main.js` (Eingabe/Loop). Nur Exporte und betroffene Funktionen lesen.

**Umsetzen:**
1. **Manager-Kamera** (Taste `V`, nur Manager): Vogelperspektive über dem Gebiet, baut auf dem Flugmodus auf. Steuerung: WASD/Bildschirmrand verschieben, Mausrad Höhe (300–4.000 m), rechte Maus drehen, Doppelklick auf Objekt = hinfliegen. `V` erneut = zurück zum Fahrer. Fahrer steht derweil still (Physik pausiert, Sim läuft weiter).
2. **Anklicken** (Raycast, in Manager-Kamera und beim Fahren mit gehaltener Taste `Alt`): Lift (Station, Seil, Kabine), Piste (Gelände in der Pistenmaske oder Schild), Hütte. Öffnet eine kleine **Objektkarte** am Mausort: Name, Status, Zustand, Wartezeit/Auslastung bzw. Schnee/Qualität bzw. Plätze/Wartezeit, Knöpfe (Öffnen/Schließen, Reparieren, Inspektion, Präparieren, Beschneien, Preisniveau). Aktionen nur über die vorhandenen Sim-Funktionen.
3. **Status-Symbole** über Stationen und Hütten (Sprites, immer lesbar, Größe nach Entfernung begrenzt): Wartezeit in Minuten mit Farbe grün/gelb/rot, Werkzeug-Symbol bei Defekt, Schloss bei gesperrt, Kran bei Baustelle, Wind-Symbol bei Sturm. In Fahrer-Ansicht nur im Umkreis 1,5 km, in Manager-Kamera alle. Taste `H` blendet Symbole aus.
4. **Pisten-Overlay** in Manager-Kamera (Taste `O` wechselt): aus / Zustand (grün→rot nach `cond`) / Schneehöhe / Gedränge (Gäste je km). Umsetzung über die vorhandene Terrain-Uniform `pSurf` bzw. eine zusätzliche Farbe je Pistenindex, kein neues Mesh.
5. Bauprojekte: Klick auf geplante Trasse/Baustelle zeigt Projektkarte (Kosten, Dauer, Nutzen, „Bauen“ / „Im Sommer“).

**Abnahme:** In der Manager-Kamera lassen sich ein Lift reparieren, eine Piste sperren und eine Hütte auf „gehoben“ stellen, ohne das Büro (`B`) zu öffnen. Symbole stimmen mit dem Panel überein. Freies Fahren unverändert (Taste `V` dort ohne Wirkung).

---

## Etappe 25 – Tageslicht und Atmosphäre

**Ziel:** Man sieht, wie der Tag vergeht und wann Nacht ist.

**Dateien:** `src/world.js` (`SUN`, Licht, Himmel), `src/weatherfx.js`, `src/panorama.js` (nur Schnittstelle `shade`/gebackene Schatten), `src/biz/bridge.js`, `src/scenery.js`, `src/lift.js`.

**Umsetzen:**
1. **Licht nach Uhrzeit** (Manager: Sim-Uhr; Freies Fahren: unverändert Mittag): Farbe und Stärke von Sonne, Hemisphäre und Himmel/Dunst über eine Kurve 08:30 → 12:30 → 16:30 (morgens kühl-bläulich, mittags neutral, ab 15:30 warm-golden, 16:30 Dämmerung). Der Sonnenstand bleibt fest, weil die Bergschatten gebacken sind; nur Farbe/Intensität und Himmelsfarbe ändern. Zusammenspiel mit dem Wetter aus `weatherfx` (Wetter dämpft, Uhrzeit färbt). Werte in einer Tabelle in `world.js` oder `data.js`.
2. **Feierabend-Stimmung:** in Phase `closed` Dämmerlicht, Fenster der Hütten und Stationen leuchten, Lichterketten an offenen Hütten.
3. **Nachtszene beim Tageswechsel** (überspringbar mit Leertaste/Klick, Option im Menü „Nachtszene an/aus“): 6–8 s Dunkelheit mit Mondlicht, Pistengeräte mit Scheinwerfern fahren auf den präparierten Pisten (Anzahl = eingesetzte Geräte), Schneekanonen mit Sprühnebel an beschneiten Pisten, danach Morgengrauen → Vorbereitung. Pistengeräte als einfaches Modell (Kasten + Schild + Fräse), Pfad entlang der Pistenpunkte.
4. **Besondere Tage:** 24.12. Lichter/Christbaum an der Talstation, 31.12. Feuerwerk über dem Ort bei Feierabend (Partikel), Ostern kleiner Hinweis im Panel. Rein optisch.

**Abnahme:** Ein Tag bei ×20 zeigt sichtbar Morgen-, Mittags- und Abendlicht; die Nachtszene erscheint mit der richtigen Anzahl Pistengeräte und lässt sich überspringen; FPS bleibt im Rahmen von Etappe 23.

---

## Etappe 26 – Berater, Rückmeldung, Meilensteine

**Ziel:** Der Spieler versteht jederzeit, warum etwas passiert und was er tun kann.

**Dateien:** `src/biz/satisfaction.js`, `src/biz/ui.js`, neue `src/biz/advisor.js` (rein, ohne DOM), `src/biz/data.js`, `src/biz/sim.js` (nur Aufruf und Spielstand-Felder).

**Umsetzen:**
1. **`biz/advisor.js`:** Regeln (in `data.js`: Bedingung, Text-Vorlage, Vorschlag, Priorität, Abklingzeit), ausgewertet stündlich und bei Feierabend. Beispiele: Wartezeit Rossbach > 20 min → „Gäste stehen lange an der Gondel Rossbach. Kassa ist schnell genug, Engpass ist der Lift: Express-Wartung vermeiden, 10er-Ausbau prüfen.“; Teilnote Qualität < 50 → Präparierung/Beschneiung; Moral < 50 → Lohn/Prämie; Kasse reicht < 10 Tage; Lawinenstufe ≥ 4 und Rettung knapp; Projekt mit bestem Nutzen/Kosten verfügbar. Jede Meldung mit Knopf, der direkt den passenden Tab/die Objektkarte öffnet.
2. **„Warum?“ im Panel:** Neben Zufriedenheit und Gästen ein kleines Fragezeichen → zeigt die 2 stärksten Ursachen (größte Abweichung der Teilnoten bzw. Nachfragefaktoren ggü. Vortag) in einem Satz.
3. **Meilensteine** (Liste in `data.js`, gespeichert in `G.goals`): z. B. erster Gewinn-Tag, 1.000 Gäste an einem Tag, Ruf 70, Gondel Schareck gebaut, Fleißtal erschlossen, Saison ohne Unfall, 3 Saisonen ohne Verlust. Einblendung als Toast mit kleinem Sound, Übersicht im Tab Übersicht. Nur Einzelspieler, keine Ranglisten.
4. **Saisonziele:** zu Saisonbeginn 3 Ziele passend zum Stand (z. B. „Ø-Zufriedenheit ≥ 65“, „Piste 5 bauen“, „Kredit unter 2 Mio“), Belohnung kleiner Ruf-/Kassenbonus. Fortschritt im Panel.
5. `tools/simtest.mjs`: Anzahl Beratermeldungen je Saison und erreichte Meilensteine je Strategie mit ausgeben (soll bei „geizig“ deutlich mehr Warnungen zeigen).

**Abnahme:** Bei künstlich erzeugtem Engpass (Rossbach-Defekt im Simtest bzw. im Spiel) erscheint innerhalb einer Spielstunde ein passender Hinweis mit funktionierendem Knopf. Meilensteine werden gespeichert und nach Neuladen nicht doppelt vergeben.

---

## Etappe 27 – Sound und Rückmeldung

**Ziel:** Das Spiel klingt lebendig, wichtige Ereignisse hört man.

**Dateien:** `src/audio.js`, `src/biz/bridge.js`, `src/biz/ui.js`.

**Umsetzen:**
1. Alle Klänge per WebAudio synthetisch erzeugen (keine Audiodateien nötig): Kasse/Münzen (Ertrag bei Feierabend, Kauf), Störung (Warnton), Meldung (sanftes Pling), Meilenstein (kurze Fanfare), Tagesbeginn (Glocke), Feierabend (Glocke tiefer), Klick auf Knöpfe.
2. Umgebung abhängig von der Kameraposition: Stimmengewirr an Talstation/Hütten nach Anzahl Gäste in der Nähe, Liftmotor an Stationen, leise Hüttenmusik (einfache synthetische Melodie) nahe offener Hütten, Wind nach Wetter (`G.weather`), Pistengeräte in der Nachtszene.
3. Lautstärke-Regler im Menü: Gesamt, Effekte, Umgebung; Speicherung in localStorage. `M` schaltet weiterhin alles stumm.
4. Bei hohem Zeitfaktor (×10/×20) Meldungsklänge zusammenfassen (max. 1 pro Sekunde).

**Abnahme:** Jeder genannte Klang ist auslösbar, Regler wirken und bleiben nach Neuladen erhalten, kein Knacken/Übersteuern bei ×20.

---

## Open World (Etappen 28–31) – gemeinsame Regeln

**Freischaltung:** „Freier Ausbau“ erst, wenn alle Lift- und Pistenprojekte des echten Gebiets gebaut sind (`data.js`, ohne Kabinen-Ausbaustufen); Meldung + Tab „Freier Bau“. Für Tests Schalter in `simtest.mjs`/Konsole (`G.open = true`).
**Gelände:** DEM deckt x −4,4…+8,5 km, z −6,5…+5,2 km ab, inkl. Gegenhang und Nachbartäler. Bauen nur innerhalb `terrain.inside`, nicht auf Straßen/Gebäuden (`village.blocked`, `props.blocked`), Mindestabstand zu bestehenden Anlagen.
**Datenmodell:** eigene Anlagen in `G.custom` {lifts[], pistes[], bases[]} mit Punkten in Weltkoordinaten; alle Kennzahlen aus der Geometrie berechnet (Funktion in `biz/`, ohne DOM). Echte Anlagen bleiben unverändert. Alte Spielstände: `migrate()` legt `G.custom` leer an.
**Preise/Werte** in `data.js` (je Typ: Basis + €/m Länge + €/Hm, Bauzeit über Nacht wie bisher, Wartung, Personal). Simtest-Ziele der Etappen 12–27 bleiben OK (freier Bau ist erst nach Vollausbau aktiv); neue Strategie `openworld` im Simtest.
**Bedienung:** im Flugmodus (F), Platzieren per Klick, Vorschau live (Linie/Geist-Modell, rot = ungültig mit Grund), Esc bricht ab, Rechtsklick entfernt letzten Punkt, Bestätigen zeigt Kosten/Kennzahlen.

---

## Etappe 28 – Freier Liftbau (inkl. Tal- und Verbindungslifte)

**Ziel:** Eigene Lifte überall im Gelände bauen: im bestehenden Gebiet, als neue Tallifte mit eigener Talstation und als Verbindungslifte zwischen Gebieten.

**Dateien:** neue `src/biz/custom.js` (rein: Geometrie → Kennzahlen, Prüfung, Bau), `src/biz/data.js`, `src/biz/build.js`, `src/biz/sim.js` (`migrate`, Aufrufe), neue `src/biz/ui-custom.js` (Platzier-Modus), `src/biz/bridge.js`, `src/lift.js` (`addSection`, `dressDrag`), `src/station.js`.

**Umsetzen:**
1. **Typen:** Gondel (8–10er), Sessel (4/6er, neu: offenes Modell mit Bügel), Schlepp, Teller, Seillift. Je Typ max. Länge/Neigung, Tempo, `gap`, `places`, Preis.
2. **Platzieren:** Talpunkt und Bergpunkt klicken; optional Mittelstation (dritter Punkt). Stützen automatisch nach Geländeprofil (Mindestbodenabstand), Trasse prüfen (Gefälle, Hindernisse, Wald → Rodungskosten).
3. **Talstationen:** Ein Lift, dessen Talpunkt nicht an einer bestehenden Piste/Station liegt, kann als **Tallift** gebaut werden: Talstation mit Kassa, Wartebereich, Parkplatz (Plätze wählbar, eingeebnet, Zufahrt zur nächsten Straße aus `village.json`). Eintrag in `G.custom.bases` (Name frei wählbar, Vorschlag aus nächstem Ortsnamen/POI).
4. **Verbindungslifte:** Lift, dessen Endpunkte in zwei verschiedenen Gebieten/Talstationen liegen, wird als Verbindung markiert (Symbol, eigene Farbe im Overlay O).
5. 3D wie bestehende Lifte (Stationen, Kabinen/Bügel, Wartebereich, Personal), Objektkarte mit Öffnen/Schließen, Revision, Ausbaustufen (Plätze), Abriss (Rückerstattung 20 %).
6. Sim: eigene Lifte laufen in `assets.js`/`flow.js` wie echte (Abnutzung, Defekte, Kosten, Kapazität aus `gap`/`places`). Gäste nutzen sie in dieser Etappe nur, wenn sie an bestehende Pisten anschließen; volle Netzlogik folgt in 30.

**Abnahme:** Nach Freischaltung lassen sich ein Sessellift im bestehenden Gebiet, ein Tallift mit Parkplatz am Gegenhang und ein Verbindungslift bauen; sie erscheinen in 3D, auf Minikarte/Overlay, in Finanzen und Objektkarte; Spielstand speichern/laden erhält sie; Simtest alle Ziele OK.

---

## Etappe 29 – Freier Pistenbau

**Ziel:** Eigene Pisten zeichnen, die sich in Gelände, Pflege und Beschneiung wie echte verhalten.

**Dateien:** `src/biz/custom.js`, `src/biz/ui-custom.js`, `src/pistes.js`, `src/terrain.js` (Attribut `pist`, `pSurf`/`SURF`), `src/biz/snow.js`, `src/biz/area.js`, `src/scenery.js` (Bäume auf Trasse entfernen).

**Umsetzen:**
1. **Zeichnen:** Punkte setzen (Start an einer Bergstation/Piste, Ende an Talstation/Lift/Piste), Spline glätten, Breite 20–60 m wählbar. Schwierigkeit automatisch aus Gefälle (blau ≤ 25 %, rot ≤ 40 %, schwarz darüber; Anzeige je Abschnitt), Name frei.
2. **Gelände:** Piste ins Pisten-Attribut eintragen, Bäume auf der Trasse entfernen (Rodung kostet je m²), leichte Einebnung quer zur Fahrtrichtung. `pSurf`/`SURF` erweitern (Textur oder größeres Array), damit ≥ 64 Pisten Zustände haben.
3. Pflege/Beschneiung/Mittagspräparierung/Abnutzung wie echte Pisten (`snow.js`), Kanonen je Piste, Anteil in `area.js`.
4. Eigene Pisten nur im Manager; Freies Fahren bleibt unverändert und lädt keinen `biz`-Code.
5. Objektkarte, Pisten-Overlay, Minikarte, Pistenliste links.

**Abnahme:** Eine rote Piste vom neuen Tallift zur Talstation lässt sich zeichnen, wird präpariert/beschneit, zeigt Zustand im Overlay, Gäste fahren sie ab (über bestehende Logik, sofern verbunden); ≥ 64 Pisten-Zustände ohne Shaderfehler; FPS stabil.

---

## Etappe 30 – Netzlogik: Gäste wählen Talstation, Lifte und Pisten

**Ziel:** Gäste bewegen sich in einem beliebigen Netz aus echten und eigenen Anlagen und verteilen sich nach Spaß und Wollen auf alle Talstationen.

**Dateien:** `src/biz/flow.js`, `src/biz/demand.js`, `src/biz/side.js` (Parkplätze), neue `src/biz/net.js` (Graph: Knoten Stationen/Pistenenden, Kanten Lift/Piste/Fußweg), `src/crowd.js`, `src/village.js` (Autos zu allen Parkplätzen), `tools/simtest.mjs`.

**Umsetzen:**
1. **Graph** aus echten + eigenen Anlagen (`net.js`), automatisch neu bei Bau/Abriss/Öffnen/Schließen; Erreichbarkeit je Talstation.
2. **Wahl der Talstation** je Gruppe bei Ankunft (Logit/Gewichtung): **Spaß** = erreichbare Pistenkilometer je Schwierigkeit passend zur Zielgruppe, Abwechslung, Schneezustand; **Wollen** = erwartete Wartezeit an Kassa/Lift, Parkplatz frei/Preis, Anfahrt (Entfernung vom Ort), Ruf der Talstation. Gäste merken sich gute Tage (leichter Bonus nächster Besuch).
3. **Routenwahl** an jedem Knoten nach denselben Faktoren (bisheriges `decide` erweitert): Zielgruppen-Vorlieben, Wartezeiten, Hütten in Reichweite, Rückweg zur eigenen Talstation vor Liftschluss (Verbindungslifte zurück nutzen, sonst Shuttle-Kosten/Unzufriedenheit).
4. **Nachfrage:** zusätzliche Talstationen und Verbindungen erhöhen Angebot (`offerF`), Parkplätze begrenzen Anreise je Talstation; Gebietsgröße steigert Ruf langsam.
5. 3D: Autos zu allen Parkplätzen, Gäste an allen Talstationen, Panel zeigt Gäste/Wartezeit je Talstation.
6. Simtest: Strategie `openworld` (baut ab Vollausbau Tallift + 2 Pisten + Verbindung) – Gäste verteilen sich auf ≥ 2 Talstationen, kein Stau-Kollaps, Gewinn plausibel.

**Abnahme:** Mit zweiter Talstation verteilen sich Gäste sichtbar; schließt man dort den Lift, wechseln sie zur anderen; Verbindungslift wird in beide Richtungen genutzt; Simtest alle Ziele OK + `openworld` plausibel.

---

## Etappe 31 – Zweites Skigebiet, Hütten und Balancing

**Ziel:** Ein komplett eigenes Gebiet am Gegenhang (oder Nachbartal) fühlt sich vollwertig an und ist wirtschaftlich ausbalanciert.

**Dateien:** `src/biz/custom.js`, `src/biz/side.js`, `src/biz/data.js`, `src/biz/ui-custom.js`, `src/scenery.js`, `src/biz/view3d.js`, `tools/simtest.mjs`.

**Umsetzen:**
1. **Eigene Hütten** frei platzieren (Größe S/M/L, Plätze, Preisniveau), Optik wie bestehende Hütten; Verleih/Skischule je Talstation.
2. **Gebiete benennen**, Gebietskarte (Overlay) mit allen Talstationen, Liften, Pisten, Verbindungen; Kennzahlen je Gebiet in Finanzen/Saisonbilanz.
3. **Balancing:** Kosten je Meter/Hm, Nachfragezuwachs, Abnehmender Ertrag großer Gebiete, Kreditrahmen wächst mit Anlagevermögen. Ziel: freier Ausbau lohnt sich langfristig, aber nicht sofort; Ziele für `openworld` in Abschnitt B ergänzen.
4. Optik am Gegenhang prüfen (Satellitenbild gröber → Schneetextur stärker überblenden, Bäume vorhanden).

**Abnahme:** Ein zweites Gebiet mit Tallift, 3 Liften, 4 Pisten, Hütte und Verbindung ist spielbar; Saisonbilanz je Gebiet; Simtest alle Ziele + `openworld`-Ziele OK; FPS stabil.
