# Heiligenblut Ski – Projektregeln

3D-Ski-/Snowboard-Spiel im Skigebiet Heiligenblut am Großglockner (Kärnten), im Browser. **Nur Desktop** (Maus + Tastatur, keine Touch-Anpassungen), **reines Einzelspieler-Spiel offline** (keine Ranglisten/Online/Multiplayer). Modi: Freies Fahren und Manager (Betreiber-Simulation).

## Technik
- Kein Node/Vite/Build. Reine ES-Module in `src/`, Three.js 0.170.0 per importmap (jsdelivr) in `index.html`. GitHub Pages (Branch `main`, Root, `.nojekyll`).
- Keine Kommentare im Code. Erklärungen nur im Chat, knapp.
- Nur Dateien lesen, die für die aktuelle Etappe nötig sind. Verlauf/Herkunft der Daten: `HISTORY.md` (nur bei Bedarf).

## Arbeitsweise
- Genau eine Etappe pro Durchgang. Danach Branch `etappe-XX`, Commit, Push, PR nach `main`, selbst mergen. Stoppen, 3–5 Zeilen Zusammenfassung + Testhinweise.
- **Nur noch Manager weiterentwickeln.** Freies Fahren bleibt unverändert (nicht anfassen, nur lauffähig halten).
- **Immer mergen:** Jede Änderung (auch kleine Zusätze außerhalb von Etappen) per PR nach `main` und selbst mergen, ohne Rückfrage.
- Nächste Etappe erst nach „weiter“/„Etappe XX“. Vorher diese Datei aktualisieren (Stand 2–4 Zeilen; Details nach `HISTORY.md`).
- Bei „Etappe XX“: aus `MANAGER.md` nur Abschnitt A, B und den Etappen-Abschnitt lesen, umsetzen, Abnahme-Liste prüfen.
- Prüfen: `node --check` + `node tools/simtest.mjs --check` (~100 s, 5 Saisonen, alle Ziele OK). Zum Probieren `--seeds 1,2`. Wo sinnvoll (UI, 3D, Bedienung) zusätzlich Browser-Test mit Playwright (vorinstalliertes Chromium, lokaler Server, Screenshot/Konsolenfehler prüfen).
- Spiel muss nach jeder Etappe lauffähig bleiben; Freies Fahren lädt keinen `biz`-Code; alte Spielstände laden (`migrate()` in `sim.js`).
- Pro Etappe neuen Chat starten (spart Tokens).

## Offene Etappen (Reihenfolge)
22 Ereignisse und Entscheidungen · 23b Dashboard (Diagramme, KPI), Panel konfigurierbar, Tutorial · 25 Tageslicht nach Uhrzeit, Feierabend, Nacht mit Pistengeräten/Beschneiung, besondere Tage · 26 Berater mit Ursachen/Vorschlägen, „Warum?“, Meilensteine, Saisonziele · 27 Sound: synthetische Effekte, Umgebungsklang nach Kamera, Lautstärke.

## Stand (Etappen 1–21, 23, 24 fertig, Details `HISTORY.md`)
- 3D: echtes DEM (15-m-Gelände, Satellitenbild Sentinel-2, Panorama bis 56 km), Fahrphysik Ski/Board, Pisten/Lifte/Hütten aus OSM, Bäume/Gebäude/Felsen, Gäste 1:1 als Figuren (Manager), Flugmodus (F), Menü, Audio.
- Manager-Sim (`src/biz/`, rein, headless testbar): Zeit/Phasen, Nachfrage je Zielgruppe, Flussmodell, Anlagen/Defekte, Zufriedenheit/Ruf, Wetter/Schnee, Personal, Marketing/Konkurrenz, Nebengeschäfte, Bau/Kredit/AfA. Start nur mit Gondel Rossbach + Piste 10 + Rossbach Alm (Kasse 1,5 Mio, Kredit bis 6 Mio), Rest sind Bauprojekte.
- Etappe 20b: `tools/simtest.mjs` + Balancing. Werte in `data.js` (nicht MANAGER.md B) maßgeblich: Bauprojekte ~50 %, Nachfrage ×0,65, Lift-Wartung je Lift `maint`, Gästebetrieb 15 €/Gast, Preis-Note bis −50, Grundwartung nachts bis 70 %. Ohne offene Piste keine Nachfrage; Folgeprojekte im Sommer vorbestellbar.
- Simtest 20b (5 Seeds): vernünftig S1 58k/+0,16 Mio/Ruf 64 · S2 119k/+0,80 · S3 125k/+0,85/Z 73; abwarten S1 Ruf 41 · S2 −0,70; gierig/geizig Ruf < 35, Verlust; investor S3 +0,48, Kredit 5,3 → 4,0. Knapp: vern S3 Skitage (≥120k), abwarten Ruf (≥40), investor S3.
- Etappe 21: Saisonende → `G.summer` {sy, next, stage report/plan} statt Tageswechsel; `season.js` `snapshot` (Saisonbilanz in `G.seasons`), `revise` (Revision auf 95 %), `fixed` (Sommer-Verwaltung 20 Tage + Zinsen); `sim.js` `endSeason/startSeason/summerStage`; `ui-season.js` Saisonbilanz + Sommerplanung; Events `G.ev` (Bau/Personal). Keine Szenarien/Slots (Nutzerwunsch). Simtest alle OK (vern S3 Skitage 121k knapp).
- Etappe 23 (Feinbalancing): Buchhaltung lückenlos (Kassenabgleich je Tag, `build.js` `post`/`writeoff`), Saisonkarten-Erlös je Besuch (`flow.cardVisits`), Jahresergebnis inkl. Sommerkosten (`s.year`), abhängige Bauprojekte vorab bestellbar (`ready`). `guestCost` 9, `admin` 2500, `adminLift` 1200, `expW` 1,7. Ziele in MANAGER.md B (5 Saisonen).
- Simtest 23: vernünftig S1 +0,37 · S2 +1,55 · S3 +1,80 · S4 +2,02 · S5 185k/+2,58 Mio; investor schneller, S5 schuldenfrei; abwarten/gierig/geizig verlieren. `--check` ~100 s.
- Etappe 24: `biz/view3d.js` Objektkarte im Flugmodus (F; V-Modus entfernt, `bridge` setzt `v3.setMgr(cam.mode==='fly')`, Doppelklick `cam.goTo` fliegt hin, Klick nach Ziehen ignoriert), sonst Alt+Klick → Objektkarte (Lift/Piste/Hütte/Bauprojekt, Aktionen über `bridge` `action`), Status-Sprites (H), Pisten-Overlay (O) über Terrain-Uniform `pTint` (`terrain.tint`, `pistes.setTint`), geplante Lifte gestrichelt. Optik: `src/textures.js` (prozedurale Holz/Stein/Schindel-Texturen, `worldUV`), Hütten mit Blockbau, Fensterrahmen, Geländer, Ski, wehender Fahne, Kaminrauch (`public/textures/smoke.webp`, CC0 aus npm `@pmndrs/assets`), drehende Seilscheiben. Sim unverändert.
- Gondel-Optik (Zusatz nach 24): `src/station.js` D-Line-Stationen (gewölbtes Dach, Verglasung, Umlaufschiene mit Reifenförderer, Antrieb, Liftwart-Kabine, Stationsschilder), Wartebereich je Einstieg (Holzdeck, Geländer, Vordach, Drehkreuze, Infotafel, Skiständer, Fahnen), Kassa an der Talstation; Kabinen im Omega-Stil, Stützen mit Rollenbatterien/Bühne. `src/workers.js` Liftpersonal (`lift.spots`, `createWorker` in models.js, max. 16 im Umkreis 280 m, animiert).
- Einstieg (Zusatz): `station.js` ebnet Zugang auf Stationsboden (`flatten`), Drehkreuze mit Skipass-Scanner, Schild + Spurampeln, Absperrband-Labyrinth (`maze`); `queueSpot(rank)` → 5 Zulaufspuren, 4 Serpentinen, Überlauf staut nach hinten; ungerade Ränge in zweite Schlange auf dem Schnee (2 Spuren + eigene Drehkreuze, Seite `sec.qside`) für Pistenfahrer (genutzt in `crowd.queueAt`). Talstation: Schnee-Schlange als 5-spuriges Serpentinen-Labyrinth auf der Piste vor der Station (al −8…2, Gang zu 2 seitlichen Drehkreuzen an der Hallenwand; `LANE`, `laneAt`, `sec.qbig`); Freies Fahren: Skifahrer fahren ins Labyrinth ein, rücken nach (`crowd` Zustand `queue`, `stepLines`), schnallen am Pistenende ab (`path.walk`, Pause 3 s), gehen mit geschulterten Ski (`carry`/`carryB`) durchs Labyrinth, warten ≥2,5 s am Scanner, gehen dann in die Halle hinter die gelbe Linie (`startBoard`, Zustand `board`) und steigen am Umlenkrad-Scheitel (`APEX`) in die Kabine. Manager gleich: Gäste, die die Schlange verlassen, laufen als `ghosts` (`stepGhost`, Sitzplätze `seats`) zum Scanner, in die Halle und in die nächste freie Kabine; Fahrgäste `r` erst ab `RIDE0` (40 m) sichtbar. Kabine bis 8 Gäste (`GCAP`). Manager-Schlange wie Freies Fahren, Tempo × Spielfaktor (`k = max(1, Faktor)`, `vq`, `stepV`, `stepB`, bis 8 je Kabine): Anzahl 1:1 aus Sim (`T`), Einstiegs-Guthaben `c` aus `out[q:id]` (gedeckelt, Überschuss entfällt hinten), Zweierreihen (`rowD`), 2,5 s am Scanner, Gruppen ≤4 je Kabine, 1,25 m/s; ankommende Pistengäste werden übernommen (`qarr`). Pistenwege enden am Labyrinth-Eingang (`runPath` `walk`, letzte Meter zu Fuß).
- Dorf (Zusatz): `src/village.js` + `public/village.json` (OSM-Straßen, Möll, Parkplätze, Routen): Straßen im Winterlook, Schneewälle, Leitplanken, Brücken, Laternen; neuer Skiparkplatz (−240/130, 192 Plätze, eingeebnet) mit Serpentinen-Fußweg zur Kassa; Autos fahren an/parken/fahren ab (Manager: `G.flow.cars`), Gäste gehen mit Ski zur Kassa (`crowd.setExtra/make`).
- Kurzsaison (Zusatz): `D.dayStep` 6 → 1 Spieltag = 6 Kalendertage, Saison ≈ 20 Spieltage (`nextDate`, Wetter, Zinsen ×6/365, AfA `fin.days` 20). Bau immer über Nacht (`left` 1, keine Sperren), Inspektion ohne Stillstand (vor Öffnung sofort, sonst nachts). Investitionen, Kasse (250k), Kredit (1 Mio), Anlagen ÷6; Reparaturen kürzer. Simtest-Ziele in MANAGER.md B neu (alle OK, ~25 s).
- Schlange nach Kabinentakt (Zusatz): Lifte in `data.js` mit `gap` (s je Kabine) + `places` (4, Upgrade `rossbach10` → 6, `G.lifts[].places`), `cap` daraus berechnet; 3D-Kabinenzahl aus `gap`. Talstation-Schlange (`crowd.stepV`): Gehtempo × Spielzeit (`k = pace·60`, Echtzeit = 1), Scanner 1 s, Durchgang sofort wenn Halle < 3 Kabinen voll, Gruppen füllen nächste Kabine bis `places`; Halle max. 16 Wartende in 4 Reihen à 4 (`HALL`, `slot`), rücken nach, nur vorderste Gruppe steigt ein; Einstieg darf Sim um 1 Minute vorauslaufen (Guthaben aus `out['b:id']`).
- Vereinfachung (Zusatz): Personal automatisch (`staff.js` `staffAuto` beim Tagesstart nach `needs`), nur Lohnkosten; kein Einstellen/Kündigen/Lohn/Moral/Krank. Lifte nutzen sich ab (keine Nacht-Erholung); einmal je Saison Revision 10k/Lift → 100 % (`assets.js` `inspect`, `l.svc`, im Sommer für nächste Saison), alte Inspektion/Sommer-Revision entfallen.
- Kabinen-Ausbau (Zusatz): je Lift Bauprojekte in 2er-Schritten bis 20 Plätze (`data.js` Schleife nach `cap`, `cabId`, Ids `rossbach10` bzw. `cab:<lift>:<n>`, Preis Basis × (1 + 0,4·Stufe), Basis = Liftprojekt bzw. 300k), Kette über `needs`; Bau-Tab zeigt nur nächste Stufe, Objektkarte Lift bietet nächste Stufe an.
- Mittelstation (Zusatz): Plateau um Halle (`station.js` `plaza`), Straßen/Parkplatz im Umkreis 135 m entfernt (`village.js` `CLEAR`), Schareck-Wartebereich seitlich an der Hallenwand mit Durchgang (`lift.js` `midAt`/`doorAt`, Queue-Rahmen `sec.qf` auch in `crowd.queueAt`).
- Spielstand-Datei (Zusatz): Startmenü (Manager) „Spielstand sichern/laden“ exportiert/importiert `hb-biz-v1` als JSON (`menu.js`, Import im laufenden Spiel → `onImport` → Reload ohne Speichern); `navigator.storage.persist()`.
- Simtest-Strategien: Aufruf `node tools/simtest.mjs [--strat a,b] [--seasons 3] [--seeds 1,2,3,4,5] [--days N] [--daily] [--check] [--json datei]`.

## Struktur
**3D/Spiel**
- `index.html` Einstieg/importmap · `src/main.js` Renderer, Loop · `src/world.js` Szene, Licht, Nebel, `SUN`, `HAZE`
- `src/terrain.js` `loadTerrain()` → `mesh, heightAt, normalAt, inside, groom(fn), forestAt, pois, meta`; Schnee-/Pisten-Shader (Attribut `pist`, Uniform `pSurf[16]`)
- `src/player.js` Physik + Pose, `spawnAt`, `state` · `src/input.js` · `src/hud.js` `createHud(pistes).update(state, dt)`, Minikarte `mapAt`
- `src/models.js` `createSkier/createBoarder(figure)`, `dress()` · `src/assets.js` `loadAssets()` (spruce.glb, figure.glb in `public/models/`)
- `src/lift.js` `createLift(terrain, pistes, exp)` → `group, sections, update, collide, leave, clear, riding, valleySpawn, shut, stop, setOpen(id, open, why), addSection, removeSection, site, onAdd, pace, cabinAt, cabinU, rideCabin`
- `src/pistes.js` `loadPistes(terrain)` → `list, at, collide, startOf, nearest, setOpen, setSurface, setBuilt`, `LEVELS`; Daten `public/pistes.json`
- `src/scenery.js` Bäume, Hütten (animiert: Rauch, Fahne, `wind`), `setHut(name, open)` · `src/textures.js` prozedurale Materialien · `src/props.js` OSM-Gebäude/Felsen (`public/osm.json`), `blocked` · `src/effects.js` Spuren/Schneestaub
- `src/station.js` `createStationKit(terrain)` → `hall, ends` · `src/workers.js` `createWorkers(lift, assets)`
- `src/village.js` `createVillage(terrain, data, blocked)` → `group, update, blocked, attach(crowd, lift), setSource(fn → Füllgrad 0–1 | null)`
- `src/crowd.js` `createCrowd(...)` → `update, collide, setDensity, setQueue, setSource(fn), link, count`
- `src/panorama.js` Fern-DEM, Sonnenschatten, `shade(root)`, `render` · `src/peaks.js` Gipfelnamen (P) · `src/weatherfx.js` Wetter-Optik
- `src/camera.js` Verfolger/Ego (C)/Orbit/Flug (F) · `src/menu.js` · `src/audio.js` (M) · `src/config.js` `get, image, texture`
- `public/terrain/` Heightmap, Panorama-DEM, Satellitenbilder · `public/expansion.json` Fleißtal-Lifte

**Manager (`src/biz/`, kein DOM/three.js außer bridge/ui)** – alle Zahlen in `data.js`, Zufall nur `rng.js` (Seed in `G`), Spielstand `G` JSON in localStorage `hb-biz-v1`.
- `sim.js` `newGame, startDay, tick, nextDay, nextDate, forecast, setPrice, report, prev, setFactor, save, load, clock`; `G` {date, season, day, phase prep/open/closed, min, factor, cash, loan, rep, prices, lifts[], pistes{}, flow, today{costs, revenue, guests, …}, history[], log[]}
- `calendar.js` Datum/Ostern/Saison/Nachfragephase · `demand.js` N = B·P·R·O·Wetter·Schnee·Marketing·K·word je Zielgruppe (`offerF`, `segOffer`, `expW`)
- `flow.js` Flussmodell pro Minute (Kassa, Queue, Lift, Piste, Hütte), bucht Tickets + `guestCost` · `people.js` `out, count, each`
- `assets.js` `pay, log, running, status, liftMinute, dayStart, overnight, repair, inspect, setOpen` · `satisfaction.js` Teilnoten, `offerScore`, `endDay` (Ruf), `hit`
- `weather.js` · `snow.js` (`night, setGroom, setGun, groomPlan, gunPlan, nightTemp`) · `staff.js` (`needs, hire, fire, setWage, bonus, seasonEnd`) · `marketing.js` (`act`, Konkurrenz `G.comp`) · `side.js` (Hütten, Verleih, Schule, Parkplatz)
- `build.js` `check(G, id, summer), order, buildDay, borrow, repay, depreciate, solvency, groomer, cannon, pipe, seasonPL, benefit` · `area.js` `pl(G), DIRS, keys, baseKm`
- `season.js` Saisonbilanz/Revision/Sommerkosten · `ui-season.js` Bilanz- und Sommer-Ansicht
- `bridge.js` Brücke zur 3D-Welt · `ui.js`, `ui-build.js` Panel/Overlays/Tabs · `view3d.js` Objektkarte, Status-Symbole, Overlay (three + DOM)
- `tools/simtest.mjs` Headless-Balancingtest

## Koordinaten
1 Einheit = 1 m, y = Höhe NN, +x Ost, −z Nord, Ursprung 47.0395 N/12.8430 E (bei Talstation). Talstation (−158/−109) 1.309 m, Rossbach (617/−921) 1.750 m, Schareck Berg (1110/−2861) 2.556 m, Fallbichl (40/−3263) 2.219 m, Fleißalm (2143/−1190) 1.808 m. Quellen/Skripte: `HISTORY.md`.
