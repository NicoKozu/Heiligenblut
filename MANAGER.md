# Manager-Modus – Spezifikation (Etappen 12–23)

Bei „Etappe XX“: nur **Abschnitt A (Grundregeln)**, **Abschnitt B (Referenzwerte)** und den Abschnitt der Etappe lesen, dazu nur die dort genannten Quelldateien. Am Ende Abnahme-Liste prüfen, dann Stand in `CLAUDE.md` eintragen (2–4 Zeilen) und Workflow aus `CLAUDE.md` (Branch `etappe-XX`, PR, merge).

---

## A. Grundregeln (gelten für alle Etappen 12–23)

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

**Abnahme jeder Etappe (Pflicht).**
1. Headless-Test der Sim im Scratchpad: Skript `node simtest.mjs` simuliert mindestens 30 Tage mit Standardentscheidungen, gibt Tabelle (Datum, Gäste, Umsatz, Kosten, Kasse, Zufriedenheit, Ruf) aus. Werte plausibel nach Abschnitt B.
2. Playwright-Smoke-Test: Seite laden, Manager starten, ×20, einen Tag durchlaufen, Feierabend erscheint, keine Konsolenfehler. Screenshot ansehen.
3. „Freies Fahren“ funktioniert unverändert.

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

**Balancing-Ziele (prüfen mit `simtest.mjs`):** Saison 1 mit vernünftigem Spiel: 90.000–130.000 Skier-Tage, Umsatz 5–7 Mio €, Gewinn 0,4–1,2 Mio €. Schlechtes Spiel (Preise ×1,5, keine Präparierung) → Verlust und Ruf < 35. Zufriedenheit typisch 60–80.

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

## Etappe 21 – Saisonzyklus, Sommer-Skip, Jahre, Ziele

**Ziel:** Langzeitspiel über mehrere Saisonen.

**Umsetzen:**
1. Saisonende (Ostermontag bzw. spätestens 6. April): Saisonbilanz-Bildschirm (Skier-Tage, Umsatz, Gewinn, Ø-Zufriedenheit, Ruf, Vergleich zur Vorsaison, beste/schlechteste Tage).
2. **Sommer-Planung** (ein Bildschirm statt Tage): Revision der Lifte (Kosten nach Zustand, setzt auf 95 %), Bauprojekte laufen durch, Personal für die nächste Saison planen, Preise festlegen, Frühbucher-Saisonkarten verkaufen (Menge = f(Ruf, Preis)), Sommer-Fixkosten (Verwaltung, Zinsen) pauschal verbuchen. Button „Saison 20XX/YY starten“ → 1. Dezember.
3. Vorsaison: Saisonstart erst, wenn genug Schnee (natürlich oder Grundbeschneiung ab November als Kostenblock planbar).
4. Ziele/Szenarien beim neuen Spiel: „Freies Spiel“, „Sanierung“ (Startkasse 300.000 €, Ruf 35, Zustand 55 %, Ziel: 3 Saisons ohne Verlust), „Expansion“ (Ziel: Fleißtal-Lifte in 2 Saisons). Schwierigkeit Leicht/Normal/Schwer (Nachfrage ±15 %, Defektrate ±40 %).
5. Mehrere Spielstände (3 Slots).

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
4. Balancing mit `simtest.mjs`: Strategien „vernünftig“, „gierig“ (Preise hoch), „geizig“ (keine Präparierung, kein Personal), „Investor“ (viel Kredit) über 3 Saisonen; Ziele aus Abschnitt B erreichen, Werte in `data.js` anpassen.
5. Performance: Sim bei ×20 < 1 ms pro Frame. Mobile: Panel einklappbar, Buttons ≥ 40 px.
6. Fehlerprüfung: alter Spielstand mit fehlenden Feldern lädt ohne Absturz (Migration über `version`).

**Abnahme:** Neuer Spieler versteht die erste Saison ohne Anleitung von außen. Alle drei Szenarien sind schaffbar, „gierig“ und „geizig“ scheitern.
