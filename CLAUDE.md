# Heiligenblut Ski – Projektregeln

3D-Ski-/Snowboard-Spiel im Skigebiet Heiligenblut am Großglockner (Kärnten), im Browser. **Nur Desktop** (Maus + Tastatur, keine Touch-Anpassungen), **reines Einzelspieler-Spiel offline** (keine Ranglisten/Online/Multiplayer). Modi: Freies Fahren und Manager (Betreiber-Simulation).

## Technik
- Kein Node/Vite/Build. Reine ES-Module in `src/`, Three.js 0.170.0 per importmap (jsdelivr) in `index.html`. GitHub Pages (Branch `main`, Root, `.nojekyll`).
- Keine Kommentare im Code. Erklärungen nur im Chat, knapp.
- Nur Dateien lesen, die für die aktuelle Etappe nötig sind. Verlauf/Herkunft der Daten: `HISTORY.md` (nur bei Bedarf).

## Arbeitsweise
- Genau eine Etappe pro Durchgang. Danach Branch `etappe-XX`, Commit, Push, PR nach `main`, selbst mergen. Stoppen, 3–5 Zeilen Zusammenfassung + Testhinweise.
- Nächste Etappe erst nach „weiter“/„Etappe XX“. Vorher diese Datei aktualisieren (Stand 2–4 Zeilen; Details nach `HISTORY.md`).
- Bei „Etappe XX“: aus `MANAGER.md` nur Abschnitt A, B und den Etappen-Abschnitt lesen, umsetzen, Abnahme-Liste prüfen.
- Prüfen: `node --check` + `node tools/simtest.mjs --check` (~85 s, alle Ziele OK). Zum Probieren `--seeds 1,2`. Kein Playwright (Nutzerwunsch).
- Spiel muss nach jeder Etappe lauffähig bleiben; Freies Fahren lädt keinen `biz`-Code; alte Spielstände laden (`migrate()` in `sim.js`).
- Pro Etappe neuen Chat starten (spart Tokens).

## Offene Etappen (Reihenfolge)
21 Saisonzyklus (1. Dez – Ostermontag/6. Apr), Sommer-Skip, mehrere Jahre, Szenarien · 22 Ereignisse und Entscheidungen · 23 Dashboard, Tutorial, Feinbalancing, Performance · 24 Manager in 3D: Kamera (V), Objekte anklicken/Objektkarte, Status-Symbole, Pisten-Overlay · 25 Tageslicht nach Uhrzeit, Feierabend, Nacht mit Pistengeräten/Beschneiung, besondere Tage · 26 Berater mit Ursachen/Vorschlägen, „Warum?“, Meilensteine, Saisonziele · 27 Sound: synthetische Effekte, Umgebungsklang nach Kamera, Lautstärke.

## Stand (Etappen 1–20b fertig, Details `HISTORY.md`)
- 3D: echtes DEM (15-m-Gelände, Satellitenbild Sentinel-2, Panorama bis 56 km), Fahrphysik Ski/Board, Pisten/Lifte/Hütten aus OSM, Bäume/Gebäude/Felsen, Gäste 1:1 als Figuren (Manager), Flugmodus (F), Menü, Audio.
- Manager-Sim (`src/biz/`, rein, headless testbar): Zeit/Phasen, Nachfrage je Zielgruppe, Flussmodell, Anlagen/Defekte, Zufriedenheit/Ruf, Wetter/Schnee, Personal, Marketing/Konkurrenz, Nebengeschäfte, Bau/Kredit/AfA. Start nur mit Gondel Rossbach + Piste 10 + Rossbach Alm (Kasse 1,5 Mio, Kredit bis 6 Mio), Rest sind Bauprojekte.
- Etappe 20b: `tools/simtest.mjs` + Balancing. Werte in `data.js` (nicht MANAGER.md B) maßgeblich: Bauprojekte ~50 %, Nachfrage ×0,65, Lift-Wartung je Lift `maint`, Gästebetrieb 15 €/Gast, Preis-Note bis −50, Grundwartung nachts bis 70 %. Ohne offene Piste keine Nachfrage; Folgeprojekte im Sommer vorbestellbar.
- Simtest 20b (5 Seeds): vernünftig S1 58k/+0,16 Mio/Ruf 64 · S2 119k/+0,80 · S3 125k/+0,85/Z 73; abwarten S1 Ruf 41 · S2 −0,70; gierig/geizig Ruf < 35, Verlust; investor S3 +0,48, Kredit 5,3 → 4,0. Knapp: vern S3 Skitage (≥120k), abwarten Ruf (≥40), investor S3.
- Simtest-Strategien: Aufruf `node tools/simtest.mjs [--strat a,b] [--seasons 3] [--seeds 1,2,3,4,5] [--days N] [--daily] [--check] [--json datei]`.

## Struktur
**3D/Spiel**
- `index.html` Einstieg/importmap · `src/main.js` Renderer, Loop · `src/world.js` Szene, Licht, Nebel, `SUN`, `HAZE`
- `src/terrain.js` `loadTerrain()` → `mesh, heightAt, normalAt, inside, groom(fn), forestAt, pois, meta`; Schnee-/Pisten-Shader (Attribut `pist`, Uniform `pSurf[16]`)
- `src/player.js` Physik + Pose, `spawnAt`, `state` · `src/input.js` · `src/hud.js` `createHud(pistes).update(state, dt)`, Minikarte `mapAt`
- `src/models.js` `createSkier/createBoarder(figure)`, `dress()` · `src/assets.js` `loadAssets()` (spruce.glb, figure.glb in `public/models/`)
- `src/lift.js` `createLift(terrain, pistes, exp)` → `group, sections, update, collide, leave, clear, riding, valleySpawn, shut, stop, setOpen(id, open, why), addSection, removeSection, site, onAdd, pace, cabinAt, cabinU, rideCabin`
- `src/pistes.js` `loadPistes(terrain)` → `list, at, collide, startOf, nearest, setOpen, setSurface, setBuilt`, `LEVELS`; Daten `public/pistes.json`
- `src/scenery.js` Bäume, Hütten, `setHut(name, open)` · `src/props.js` OSM-Gebäude/Felsen (`public/osm.json`), `blocked` · `src/effects.js` Spuren/Schneestaub
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
- `bridge.js` Brücke zur 3D-Welt · `ui.js`, `ui-build.js` Panel/Overlays/Tabs
- `tools/simtest.mjs` Headless-Balancingtest

## Koordinaten
1 Einheit = 1 m, y = Höhe NN, +x Ost, −z Nord, Ursprung 47.0395 N/12.8430 E (bei Talstation). Talstation (−158/−109) 1.309 m, Rossbach (617/−921) 1.750 m, Schareck Berg (1110/−2861) 2.556 m, Fallbichl (40/−3263) 2.219 m, Fleißalm (2143/−1190) 1.808 m. Quellen/Skripte: `HISTORY.md`.
