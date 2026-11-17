# Heiligenblut Ski – Projektregeln

3D-Ski-/Snowboard-Spiel im Skigebiet Heiligenblut am Großglockner (Kärnten), im Browser spielbar.

## Technik
- Kein Node, kein Vite, kein Build. Reine ES-Module in `src/`, Three.js per importmap (CDN jsdelivr, Version 0.170.0) in `index.html`.
- Läuft direkt auf GitHub Pages (Branch `main`, Root). `.nojekyll` liegt im Root.
- Keine Kommentare im Code. Erklärungen nur im Chat, knapp.
- Nur Dateien lesen, die für die aktuelle Etappe nötig sind.

## Arbeitsweise
- Genau eine Etappe pro Durchgang. Danach: Branch `etappe-N`, Commit, Push, Pull Request nach `main`, PR selbst direkt mergen. Dann stoppen, 3–5 Zeilen Zusammenfassung + Testhinweise.
- Nächste Etappe erst nach "weiter" bzw. "Etappe XX". Vorher diese Datei aktualisieren.
- Bei "Etappe XX" (ab 12): `MANAGER.md` lesen – nur Abschnitt A (Grundregeln), B (Referenzwerte) und den Abschnitt der Etappe. Genau das umsetzen, Abnahme-Liste dort prüfen, dann Stand hier eintragen.
- Nach jeder Etappe muss das Spiel lauffähig bleiben.

## Etappen
1. Fundament: Repo-Struktur, index.html, importmap, Szene, Licht, Himmel, Verfolgerkamera, einfaches schräges Schneegelände, Deploy auf GitHub Pages.
2. Gelände: Heightmap-Terrain im Stil des Heiligenbluter Tals (Talstation → Rossbach → Schareck → Fleißtal), Schnee-Material, Schatten, Nebel. Echte Höhendaten falls auffindbar, sonst nachgebaut.
3. Fahrphysik Ski: WASD (W Tuck, S Bremsen/Schneepflug, A/D Carven), Leertaste Sprung, R Neustart, Gefälle, Reibung, Luftwiderstand, Terrain-Kollision.
4. HUD: km/h, Höhe über NN, Pistenname, Fahrzeit, Höchstgeschwindigkeit.
5. Snowboard: Umschalten mit Q, eigene Physik und eigenes Modell.
6. Pisten: mind. 3 echte Pisten (leicht, mittel, schwer) inkl. Talabfahrt, Markierungen, Schilder, Begrenzung, Pistenerkennung fürs HUD.
7. Lift: Gondel Rossbach befahrbar (Talstation → Mittel-/Bergstation), fahrende Kabinen, Masten, Seil.
8. Welt: Bäume (Lärchen/Fichten), Hütten (Rossbach Klause, Schareck, Fleißalm), Liftmasten, Spurrillen, Schneestaub.
9. Panorama: Großglockner als Skybox (Fotos aus `public/` falls vorhanden, sonst prozedural).
10. Feinschliff: Startmenü (Ski/Snowboard, Piste), Ego-Kamera, Sound optional, ~60 FPS, Mobile-Hinweis, Fehlerprüfung.
11. Freie Kamera (fertig).

### Manager-Modus (Details in `MANAGER.md`)
12. Spielkern: Zeit (Tag 08:30–16:30 = 60 min bei ×1, Faktor ×1/2/5/10/20), Tagesphasen Vorbereitung → Betrieb → Feierabend, Spielstand, rechtes Manager-Panel.
13. Gäste, Tickets, Lift-Warteschlangen.
14. Anlagen: Zustand, Defekte, Öffnen/Schließen, Reparatur (auch in 3D sichtbar).
15. Zufriedenheit und Ruf (Hauptindikator).
16. Schnee, Wetter, Präparierung, Beschneiung.
17. Personal.
18. Marketing, Zielgruppen, Konkurrenz.
19. Nebengeschäfte: Hütten, Verleih, Skischule, Parkplatz.
20. Investitionen, Kredite, Ausbau (Fleißtal-Lifte).
21. Saisonzyklus (1. Dez bis Ostermontag/6. Apr), Sommer-Skip, mehrere Jahre, Szenarien.
22. Ereignisse und Entscheidungen.
23. Dashboard, Tutorial, Balancing.

## Stand
- Etappe 1: fertig, gemergt (PR #1).
- Etappe 2: fertig, gemergt (PR #2). Echtes DEM, Platzhalter-Fahrer gleitet entlang Falllinie ab Schareck.
- Etappe 3: fertig. Fahrphysik in `player.js` (Kanten-Grip/Carving, Reibung, Luftwiderstand, Sprung, Absprung an Kanten, Sturz bei harter Landung), Eingabe `input.js`.
- Etappe 4: fertig. HUD in `src/hud.js` (km/h, Höhe, Pistenname, Fahrzeit, Max). Pistenname vorläufig per nächstem POI (`pisteName()`), in Etappe 6 durch echte Pistenerkennung ersetzen.
- Etappe 5: fertig. Q schaltet Ski/Snowboard (nur am Boden). Physik-Parameter je Modus in `MODES` (`player.js`), Modelle in `src/models.js`. Board: Seitrutschen (S), mehr Drift, höherer Ollie, schnelle Air-Spins, Fakie-Landung; Landung quer zur Fahrtrichtung = Sturz (beide Modi). Kamera folgt `state.look` (in der Luft eingefroren).
- Etappe 6: fertig. Pisten in `public/pistes.json` (Verlauf per Kostenpfad auf DEM berechnet, Skript im Scratchpad), Laden/Präparieren/Markierung/Netze/Schilder/Erkennung in `src/pistes.js`. Gelände entlang Pisten geglättet (`terrain.groom`), Cord-Band, Stangen (Kappe in Pistenfarbe), Fangnetze an Abbruchkanten mit Kollision, Startschild + Nummernschilder alle 500 m. HUD zeigt Piste (farbig) oder „abseits“. Tasten 1–4 = Pistenstart, R = letzter Start. Kamera hält Sichtlinie über Kuppen.
- Etappe 7: fertig. Lift in `src/lift.js`: 2 Sektionen (Gondel Rossbach Talstation→Rossbach, Gondel Schareck Rossbach→Schareck), Seilprofil mit Durchhang, Masten automatisch nach Bodenfreiheit gesetzt (nicht an Pistenstarts, auf Pisten mit Prallschutz), umlaufende Kabinen (InstancedMesh, 5 m/s), Stationen mit Kollision. E an Talstation/Rossbach = einsteigen, W in Gondel = Zeitraffer ×8, Ausstieg automatisch am nächstgelegenen Pistenstart. Taste 0 = Talstation. HUD zeigt Liftname + Hinweiszeile (`state.hint`).
- Etappe 8: fertig. `src/scenery.js`: ~114k Bäume (Fichten unten, Lärchen winterkahl oben, Waldgrenze ~2.150 m, Rauschen für Lichtungen, frei von Pisten/Lift/Stationen), Chunks à 500 m mit LOD (nah 1,3 km / fern 3,8 km), Baum-Kollision (Sturz ab 7 m/s). Hütten Rossbach Klause, Schareck, Fleißalm (Lage automatisch: flach, abseits Piste/Lift, Gelände eingeebnet, Terrasse, Namensschild, Kollision). `src/effects.js`: Spurrillen (Ringpuffer, Breite nach Seitrutschen), Schneestaub (Points-Shader; Carven/Bremsen/Landung/Sturz). Liftmasten aus Etappe 7.
- Etappe 9: fertig. `src/panorama.js`: echtes DEM-Panorama bis ~56 km (Großglockner, Glocknergruppe, Venediger, Sonnblick, Ankogel …) in eigenem Render-Pass (eigene Kamera near 150/far 200 km, danach Tiefe löschen, dann Nahszene). Zwei Ebenen: Mitte ±16 km/50 m, Fern ±56 km/200 m, Loch unter Nahgelände, Ränder nahtlos verblendet, Erdkrümmung im Shader. Shader: Schnee/Fels (Rinnen entlang Falllinie)/Wald/Gletscher, Ableitungs-AA. Sonnensichtbarkeit (Bergschatten) per GPU-Raymarch gebacken (3 Texturen) und per `onBeforeCompile` auf alle Standard-/Lambert-Materialien der Nahszene angewendet, plus wandernde Wolkenschatten. Wolkenschicht (Cumulus + Cirren) auf 5.400 m. Sonne jetzt real im SSO (Azimut 158°, 31°), Dunst `HAZE` als exp. Distanz-Nebel (ShaderChunk `fog_fragment` gepatcht), Hemi 1,15. `src/peaks.js`: Gipfelnamen mit Höhe/Entfernung, Sichtprüfung über Gelände, Entzerrung; P schaltet.
- Etappe 10: fertig. `src/menu.js`: Start-/Pausenmenü (Ski/Snowboard, Startpunkt Piste/Talstation, Steuerung, Mobile-Hinweis bei Touch ohne Maus, Auswahl in localStorage), dient auch als Ladeanzeige; Esc/Tabwechsel = Pause. `camera.js`: Ego-Kamera (C, Augenhöhe je Hocke/Sturz, Blick in Gondel), FOV wächst mit Tempo. `src/audio.js`: WebAudio-Rauschen (Wind nach Tempo, Kantengeräusch beim Carven/Bremsen, Gondelbrummen), M = Ton. Adaptive Auflösung (Pixelratio 0,6–2 nach FPS), F = FPS-Anzeige. Fehlerprüfung: WebGL2-Check, globale Fehler-/Promise-Anzeige mit Neu-laden, Context-Lost, `get()` in `config.js` prüft HTTP-Status. Bugfix: Pisten 4/5 starteten auf der Achse der Bergstation Schareck (Kollision) → Start auf ersten Pistenpunkt ohne Station/Mast (`lift.clear(pts)`); globale Tasten (Esc, C, M, P, F) wirken jetzt auch in der Gondel.
- Etappe 11: fertig. Freie Kamera in `camera.js`: Linke Maustaste halten + Maus = Orbit um Fahrer (Verfolger) bzw. Umschauen (Ego), Mausrad = Abstand (0,45–3×). Nach Loslassen kehrt Blick nach ~1,2 s weich hinter den Fahrer zurück. Kontextmenü auf Canvas unterdrückt.
- Fix Fahrphysik: Energiebilanz pro Schritt (½v² + g·h, Höhe aus Gelände) minus Reibung (μ Ski 0,06 / Board 0,07), Luftwiderstand (m 80 kg, cW·A aufrecht 0,7/0,8 m², Hocke 0,35/0,45 m², Luftdichte nach Höhe) und Rutschverlust. Volle Hangabtriebskraft (nicht nur in Skirichtung), Kurven lenken nur um, Haftreibung im Stand. Ergebnis: rote Piste Hocke ~120–130 km/h, aufrecht ~95–105, Steilgelände max ~190. Stockschub (W < 5 m/s) nur flach/bergab.
- Fix Bodenkontakt/Grafik: Gelände auf 15 m verfeinert (Catmull-Rom aus 30-m-DEM), in Chunks à 64 Zellen (Frustum-Culling, auch Schattenpass). `heightAt` interpoliert exakt die gerenderten Dreiecke (vorher bilinear → Schweben/Einsinken), `normalAt` bilinear aus Vertex-Normalen (weich). Ski/Board liegen per 4-Punkt-Abtastung (±0,8 m längs, ±0,25 m quer) bündig auf. Schnee-Shader in `terrain.js` (onBeforeCompile, von `pano.shade` verkettet): Albedo-Rauschen, 2-Skalen-Bump, Pisten-Cord (Rillen 0,3 m, Spurbahnen 4,4 m) über Attribut `pist` (Maske, Querabstand), Glitzer in der Sonne. Cord-Band-Mesh aus `pistes.js` entfernt; `groom`-Callback darf `[h, blend, lat]` liefern.
- Echte Satellitenbilder: Copernicus Sentinel-2 L2A vom 24.03.2021 (wolkenfrei, Schnee bis ins Tal; AWS `sentinel-cogs`, Kacheln 33TUN/TUM, 32TQT/TQS), in Weltkoordinaten umprojiziert, eingebrannte Schatten per DEM (Sonne 160,7°/42,6°) herausgerechnet. `public/terrain/sat_near.jpg` (Nahgelände, ~6 m), `sat_mid.jpg` (±16 km), `sat_far.jpg` (±56 km, fehlende Ränder → prozedural), `forest.png` (Waldmaske aus NDVI). Nahgelände: Bildfarbe abseits der Pisten (Pisten bleiben präpariert-weiß), unter Wald bis ~3 km Schnee (3D-Bäume), nah an der Kamera weich in Schnee-Shader. Bäume (`scenery.js`) stehen nach echter Waldmaske (`terrain.forestAt`). Skript `gen.py` im Scratchpad. Attribution: „Contains modified Copernicus Sentinel data 2021“.
- Minikarte: Pistenplan `public/pistenplan.jpg` unten rechts im HUD, roter Punkt = Position. Abbildung Welt→Bild per Thin-Plate-Spline (`mapAt` in `hud.js`) über 8 Passpunkte (Liftstationen aus OSM ↔ Pixel im Plan).
- Echte Gebietsdaten aus OpenStreetMap (Abruf 16.11.2026, ODbL; Skript `osmparse.py`/`mkpistes.py`/`tps.py` im Scratchpad). Vorher waren Pisten/Lifte nur geschätzt (Fallbichl fälschlich nach Osten). Jetzt: 9 Pisten aus OSM-Wegen verkettet (4, 5, 5a, 1 Fallbichl → West zur Panoramabahn, 2 Seppenalm, 10 Tal, 11, 12 im Fleißtal, 8 Viehbühel), Tasten 1–9. Lifte: Gondel Rossbach, Gondel Schareck, neu Panoramabahn (Fallbichl → Schareck); `SECTIONS[].st` = Stationsindizes. Hütten: Rossbach Alm, Panoramarestaurant Schareck, Spatzl Alm, Skihütte Fleißalm. POIs in `heiligenblut.json` ersetzt. Gegenprobe DEM-Höhe: Talstation 1.309 (offiz. 1.301), Rossbach 1.750 (~1.740), Fleißalm 1.808 (Plan 1.800). Fleißtal-Lifte (Tunnelbahn, Fleißbahn, Hochfleiß, Ederfeld, Tauernberg) noch nicht im Spiel.
- 3D-Modelle: `src/assets.js` lädt `public/models/spruce.glb` (4 Fichten aus Quaternius „Ultimate Stylized Nature“, CC0, via GitHub-Kopie walterpalladino/godot-quaternius-ultimate-stylized-nature; FBX→GLB im Scratchpad `conv/trees.mjs`, Höhe 1, Nadelkarten `spruce_leaves.png`) und `figure.glb` (three.js-Beispiel Xbot, Mixamo-Rig, Animationen entfernt). Bäume: Detailstufe im Umkreis `DET` 170 m als dynamische InstancedMesh-Pools (Fichte grün + Schnee nach Normalen, Lärche braun/licht), Kegelbäume dort per Shader (`hider`, auch Schattenpass) ausgeblendet. Fahrer: Skelett per Richtungs-Aim je Knochen (`rig().aim`) aus tuck/brake/ctrl gepost, Kleidung per Shader nach Bind-Pose-Höhe, Ski/Stöcke bzw. Board separat. Gutschrift im Menü.
- Welt-Details aus OSM (API 0.6, Abruf 16.11.2026; Skript `gen_osm.py` im Scratchpad): `public/osm.json` (Gebäude [Typ, Höhe, Grundriss], Fels-/Geröllflächen, Felswände, Latschenflächen, Zäune/Schneezäune); OSM-Waldflächen in `forest.png` eingerechnet. `src/props.js`: ~1.240 Gebäude als Instanzen (Grundriss → OBB, Steinsockel bis Hang, weiß/Holz-Obergeschoss, Satteldach mit Schnee per Normalen-Shader, Fenster, Balkone, Kamine; Stadel aus Holz; Kirche St. Vinzenz mit Turm + Spitzhelm, Kapellen mit Dachreiter), ~66k Felsen (Felswände, Geröll, Steilhänge, Hochlagen), Latschenfelder 1.650–2.450 m, Zäune. Chunks 600 m mit Ebenen body/big/detail/small (Sichtweite 6 km/3,5 km/0,9 km/1,1 km). Kollision Gebäude + Felsen > 1,1 m (Sturz ab 7 m/s). Bäume: Raster 10 m, Waldgrenze bis 2.320 m, vereinzelte Bäume auch außerhalb der Waldmaske, nicht in Gebäuden (`props.blocked`).
- Leben auf der Piste: `src/crowd.js` – ~45 Gruppen (~100 Personen): Familien (Kinder klein, Schneepflug), Skischulen (Lehrer rot + Kinder orange im Gänsemarsch), Paare, Carver, Racer (Hocke), Snowboard-Crews/-Solo. Gebietsgraph aus Liftstationen (Knoten) + Pisten mit Start/Ende an Knoten (4, 5, 5a, 1, 2, 10; nicht 8/11/12). Gruppe fährt eine „Etappe“: Ausstieg → Piste(n) (Kurven als Sinus quer zur Linie, Tempo nach Gefälle/Typ, Pausen) → Talstation → wartet auf freie Kabine → fährt sichtbar in der Gondel → Ausstieg oben. Nah (120 m) geriggte Figuren (Pool 10 Ski/5 Board, `dress()` in `models.js`), fern Instanz-Figuren bis 2,6 km. Kollision mit Spieler (Sturz ab 6 m/s rel.). `lift.js` liefert `cabinAt, cabinU, rideCabin`.
- Etappen 1–11 fertig.
- Etappe 12: fertig. Menü: Spielmodus Manager (Standard) / Freies Fahren, Manager mit „Weiterspielen · Datum“ / „Neues Spiel“ (Bestätigung). `src/biz/`: `data.js` (alle Werte Abschnitt B), `rng.js` (mulberry32, Zustand `G.rng`), `calendar.js` (ISO-Datumsstrings, Ostern Gauß, Saisonende min(Ostermontag, 6. Apr), Nachfragephase, `fmtDate`), `sim.js` (`newGame/startDay/tick/nextDay/clock/save/load`, Phasen prep→open→closed, bucht Verwaltung, Wartung, Strom nach Laufzeit, Zinsen; Historie), `ui.js` (Panel rechts, Overlays Vorbereitung/Tagesbericht/Büro mit Tabs), `bridge.js` (Tasten +/−, Tab, B, Enter; Lifte via `lift.shut` gesperrt außerhalb Betrieb; Fahrer steht in prep/closed an Talstation, laufende Gondelfahrt endet normal). Biz wird per dynamischem Import nur im Manager geladen. Autosave bei Feierabend, Tageswechsel, Pause, `pagehide`. Fahrer-HUD wandert im Manager nach links. Zahlen `de-DE` (Punkt als Tausender, `de-AT` liefert Leerzeichen).
- Tests: `simtest.mjs` (Scratchpad, Node) und Playwright-Smoke; jsdelivr ist in der Session gesperrt → Three per `npm pack three@0.170.0` lokal und `page.route` umleiten. SwiftShader rendert ~1 FPS, Sim holt Frames bis 1 s nach.
- Empfehlung: pro Etappe neuen Chat starten (spart Tokens).

## Struktur
- `index.html` – Einstieg, importmap, Overlay
- `src/main.js` – Renderer, Loop, Resize
- `src/world.js` – Szene, Licht, Himmel (Sky, liegt in Panorama-Szene), Nebel, `SUN`, `HAZE`
- `src/terrain.js` – `loadTerrain()` lädt Heightmap, liefert `mesh` (Group aus Chunks), `heightAt, normalAt, inside, groom(fn), forestAt, pois, meta` (meta = grobes 30-m-Raster)
- `src/player.js` – Fahrer: Physik je Modus + Pose, `spawnAt(x,z,heading)`, `state` (pos, vel, dir, look, heading, speed, grounded, crashed, reset, mode, modeName, fakie, note, noteT)
- `src/models.js` – `createSkier(figure)`, `createBoarder(figure)` → `{ object, pose(p) }` (geriggte Figur)
- `src/assets.js` – `loadAssets()` → `{ spruce: [{bark, leaves}], leaves, figure }`
- `public/models/` – `spruce.glb`, `spruce_leaves.png`, `figure.glb`
- `src/input.js` – Tastatur (`keys`, `down()`, `consume()`)
- `src/hud.js` – `createHud(pistes).update(state, dt)`, zeigt Modus, Piste, Meldungen
- `src/lift.js` – `createLift(terrain, pistes)` → `{ group, sections, update(dt, state, player, goTo), collide(state), leave(state), clear(pts), riding(), valleySpawn }`
- `src/pistes.js` – `loadPistes(terrain)` → `{ group, list, at(pos), collide(state), startOf(k), nearest(x,z,max) }`, `LEVELS`
- `public/pistes.json` – Pisten (id, name, level, width, pts [x,z] alle 20 m)
- `public/terrain/heiligenblut.bin|json` – Heightmap Uint16 (Höhe×10), 430×389, 30 m Raster, + Meta/POIs
- `src/props.js` – `createProps(terrain, pistes, lift, osm)` → `{ group, blocked(x,z,m), build(huts), update(camera), collide(state, onHit), count }`
- `public/osm.json` – OSM-Gebäude/Fels/Latschen/Zäune (Weltkoordinaten)
- `src/crowd.js` – `createCrowd(terrain, pistes, lift, assets)` → `{ group, update(dt, camera), collide(state, onHit), count }`
- `src/scenery.js` – `createScenery(terrain, pistes, lift, assets, blocked)`, `detailMaterials(assets)` → `{ group, update(camera), collide(state, onHit), huts, treeCount }`
- `src/effects.js` – `createEffects(terrain)` → `{ group, update(dt, state, riding, canvasH), burst(state, n, v) }`
- `src/panorama.js` – `loadPanorama(terrain, world)` → `{ scene, camera, bake(renderer), shade(root), update(cam, dt), render(renderer, nearScene, cam), heightAny, peaks, visibleFrom }`
- `src/peaks.js` – `createPeakLabels(pano)` → `{ update(cam), toggle() }`
- `public/terrain/panorama.bin|json` – Uint16 (Höhe×10): Ebene Mitte 641² (50 m, ±16 km) + Fern 561² (200 m, ±56 km), Gipfelliste (Lage per DEM-Maximum geprüft)
- `src/camera.js` – `createFollowCamera(terrain)` → `{ camera, update(target, dir, dt, snap, opt), toggle(), mode }` (Verfolger/Ego)
- `src/menu.js` – `createMenu()` → `{ show, hide, setPistes, setStatus, ready, onStart, onResume, open }`
- `src/audio.js` – `createAudio()` → `{ init, update(state, ctrl, paused), toggle, pause }`
- `src/config.js` – Gebietsdaten, `get(url, type)` (fetch mit Statusprüfung), `image(url)`, `texture(url)` (sRGB, flipY aus)
- `public/` – eigene Assets (Fotos etc.)
- `MANAGER.md` – Spezifikation Manager-Modus (Etappen 12–23), `src/biz/` – Simulation (ab Etappe 12)
- `src/biz/bridge.js` – `createBiz({ lift, player })` → `{ begin(fresh), end(), update(dt), save(), hold, active }`; `lift.shut` (Set gesperrter Liftnamen)
- `src/biz/sim.js` – Spielstand `G` (date ISO, phase, min, factor, cash, loan, rep, lifts[{id,name,open,cond,run,util}], today{costs,revenue,guests,demand}, history[])

## Gebietsdaten
Quellen: heiligenblut.at (Pisteninfo, Stand 06.04.2026), kaernten.at, schneehoehen.de, Skiclub-Pistenplan (PDF), Skimagazin Heiligenblut 2025/26. skiresort.info und bergfex waren aus der Session nicht direkt abrufbar.

| Wert | Angabe | Status |
|---|---|---|
| Talstation Heiligenblut | 1.301 m (andere Quellen 1.315 m) | verifiziert (Spanne) |
| Mittelstation Rossbach | ~1.740 m | geschätzt |
| Schareck Bergstation | 2.604 m | verifiziert |
| Höchster Punkt (Gjaidtroghöhe-Bereich) | ~2.902 m | verifiziert (Pistenplan), Name geschätzt |
| Pistenkilometer | 55 km (26,4 km Falllinie) | verifiziert |
| Großglockner | 3.798 m | verifiziert |
| Lifte | 4er-Gondel Rossbach, Gondel Schareck, Tunnelbahn Fleißalm, Fleißbahn | verifiziert |
| Piste 4 Schareckabfahrt | mittel (rot) | verifiziert |
| Piste 5 Kärntnerabfahrt | leicht (blau) | verifiziert |
| Piste 5a Kärntnerabfahrt Variante | mittel (rot) | verifiziert |
| Piste 10 Talabfahrt (Rossbach → Ort) | mittel (rot) | verifiziert |
| Piste 1 Fallbichl (schwarz) | Schareck → Westen zur Panoramabahn-Talstation | verifiziert (OSM + Pistenplan) |
| Pistenverläufe | aus OpenStreetMap: 4: 2,4 km, 5: 2,9 km, 5a: 3,2 km, 1: 1,4 km, 2: 3,1 km, 10: 2,0 km | verifiziert (OSM, mit Pistenplan abgeglichen) |
| Skiroute Fleißalm | ~4 km, ~800 Hm, unpräpariert | verifiziert |
| Pistenlängen/Gefälle einzeln | – | geschätzt (keine Quelle) |

## Gelände / Koordinaten
- Quelle: AWS Terrain Tiles (Terrarium, Zoom 14; Mapzen aus EU-DEM/SRTM). Ausschnitt 46.993–47.098 N, 12.785–12.955 E (~12,9 × 11,7 km).
- Welt: 1 Einheit = 1 m, y = Höhe über NN, +x = Ost, −z = Nord. Ursprung (0,0) = Talstation Heiligenblut (47.0395 N, 12.8430 E).
- POIs (OSM, Höhe aus DEM): Talstation Rossbach (−158/−109) 1.309 m, Mittelstation Rossbach (617/−921) 1.750 m, Bergstation Schareck (1110/−2861) 2.556 m, Schareck-Gipfel (1357/−3049) 2.606 m, Fallbichl/Panoramabahn-Tal (40/−3263) 2.219 m, Seppenalm (1104/−1948), Fleißalm (2143/−1190) 1.808 m, Gjaidtroghöhe (5167/−2657) 2.988 m. Ursprung (0,0) bleibt Referenzpunkt 47.0395 N/12.8430 E (nicht mehr exakt Talstation).
- Großglockner (47.074 N, 12.694 E) liegt im Panorama-DEM bei (−11300/−3900), DEM 3.777 m (offiziell 3.798 m).
- Panorama: Kacheln z12 (Mitte) und z11 (Fern), gleiche Projektion (x = Δlon·111320·cos 47,0395°, z = −Δlat·111132), Abgleich mit Nah-DEM: Versatz 0, RMS 4,8 m. Skript im Scratchpad, nicht im Repo.
- Neu generieren: Python-Skript nicht im Repo (Scratchpad); Kacheln `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/{x}/{y}.png`, Höhe = R·256 + G + B/256 − 32768.
