# Heiligenblut Ski – Projektregeln

3D-Ski-/Snowboard-Spiel im Skigebiet Heiligenblut am Großglockner (Kärnten), im Browser spielbar.

## Technik
- Kein Node, kein Vite, kein Build. Reine ES-Module in `src/`, Three.js per importmap (CDN jsdelivr, Version 0.170.0) in `index.html`.
- Läuft direkt auf GitHub Pages (Branch `main`, Root). `.nojekyll` liegt im Root.
- Keine Kommentare im Code. Erklärungen nur im Chat, knapp.
- Nur Dateien lesen, die für die aktuelle Etappe nötig sind.

## Arbeitsweise
- Genau eine Etappe pro Durchgang. Danach: Branch `etappe-N`, Commit, Push, Pull Request nach `main`, PR selbst direkt mergen. Dann stoppen, 3–5 Zeilen Zusammenfassung + Testhinweise.
- Nächste Etappe erst nach "weiter". Vorher diese Datei aktualisieren.
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
- Alle 10 Etappen fertig. Ideen danach: Touch-Steuerung, Zeitrennen/Bestzeiten, weitere Pisten/Lifte (Fleißbahn, Tunnelbahn), Tageszeit.
- Empfehlung: pro Etappe neuen Chat starten (spart Tokens).

## Struktur
- `index.html` – Einstieg, importmap, Overlay
- `src/main.js` – Renderer, Loop, Resize
- `src/world.js` – Szene, Licht, Himmel (Sky, liegt in Panorama-Szene), Nebel, `SUN`, `HAZE`
- `src/terrain.js` – `loadTerrain()` lädt Heightmap, liefert `mesh, heightAt, normalAt, inside, groom(fn), pois`
- `src/player.js` – Fahrer: Physik je Modus + Pose, `spawnAt(x,z,heading)`, `state` (pos, vel, dir, look, heading, speed, grounded, crashed, reset, mode, modeName, fakie, note, noteT)
- `src/models.js` – `createSkier()`, `createBoarder()` → `{ object, pose(p) }`
- `src/input.js` – Tastatur (`keys`, `down()`, `consume()`)
- `src/hud.js` – `createHud(pistes).update(state, dt)`, zeigt Modus, Piste, Meldungen
- `src/lift.js` – `createLift(terrain, pistes)` → `{ group, sections, update(dt, state, player, goTo), collide(state), leave(state), clear(pts), riding(), valleySpawn }`
- `src/pistes.js` – `loadPistes(terrain)` → `{ group, list, at(pos), collide(state), startOf(k), nearest(x,z,max) }`, `LEVELS`
- `public/pistes.json` – Pisten (id, name, level, width, pts [x,z] alle 20 m)
- `public/terrain/heiligenblut.bin|json` – Heightmap Uint16 (Höhe×10), 430×389, 30 m Raster, + Meta/POIs
- `src/scenery.js` – `createScenery(terrain, pistes, lift)` → `{ group, update(camera), collide(state, onHit), huts, treeCount }`
- `src/effects.js` – `createEffects(terrain)` → `{ group, update(dt, state, riding, canvasH), burst(state, n, v) }`
- `src/panorama.js` – `loadPanorama(terrain, world)` → `{ scene, camera, bake(renderer), shade(root), update(cam, dt), render(renderer, nearScene, cam), heightAny, peaks, visibleFrom }`
- `src/peaks.js` – `createPeakLabels(pano)` → `{ update(cam), toggle() }`
- `public/terrain/panorama.bin|json` – Uint16 (Höhe×10): Ebene Mitte 641² (50 m, ±16 km) + Fern 561² (200 m, ±56 km), Gipfelliste (Lage per DEM-Maximum geprüft)
- `src/camera.js` – `createFollowCamera(terrain)` → `{ camera, update(target, dir, dt, snap, opt), toggle(), mode }` (Verfolger/Ego)
- `src/menu.js` – `createMenu()` → `{ show, hide, setPistes, setStatus, ready, onStart, onResume, open }`
- `src/audio.js` – `createAudio()` → `{ init, update(state, ctrl, paused), toggle, pause }`
- `src/config.js` – Gebietsdaten, `get(url, type)` (fetch mit Statusprüfung)
- `public/` – eigene Assets (Fotos etc.)

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
| Piste 1 Fallbichl (schwarz) | Schareck → Fallbichl, steilste Piste Kärntens | Name verifiziert (remontees-mecaniques.net, TUI), Lage geschätzt (Ostflanke → Fleißtal) |
| Pistenverläufe | 5: 3,3 km Ø26 %, 4: 2,5 km Ø35 %, 1: 1,2 km Ø60 %, 10: 1,5 km Ø30 % | berechnet aus DEM, nicht real vermessen |
| Skiroute Fleißalm | ~4 km, ~800 Hm, unpräpariert | verifiziert |
| Pistenlängen/Gefälle einzeln | – | geschätzt (keine Quelle) |

## Gelände / Koordinaten
- Quelle: AWS Terrain Tiles (Terrarium, Zoom 14; Mapzen aus EU-DEM/SRTM). Ausschnitt 46.993–47.098 N, 12.785–12.955 E (~12,9 × 11,7 km).
- Welt: 1 Einheit = 1 m, y = Höhe über NN, +x = Ost, −z = Nord. Ursprung (0,0) = Talstation Heiligenblut (47.0395 N, 12.8430 E).
- POIs (aus DEM): Fallbichl 1.881 m (2330/−2450, geschätzt), Talstation 1.282 m (0/0), Rossbach ~1.734 m (392/−910, Lage geschätzt), Schareck 2.590 m (1305/−3034, Gipfel lt. DEM 2.606 m), Gjaidtroghöhe 2.965 m (5159/−2623, DEM-Gipfel 2.988 m), Fleißalm ~1.901 m (2350/−2700, Lage geschätzt, Talboden Großes Fleißtal).
- Großglockner (47.074 N, 12.694 E) liegt im Panorama-DEM bei (−11300/−3900), DEM 3.777 m (offiziell 3.798 m).
- Panorama: Kacheln z12 (Mitte) und z11 (Fern), gleiche Projektion (x = Δlon·111320·cos 47,0395°, z = −Δlat·111132), Abgleich mit Nah-DEM: Versatz 0, RMS 4,8 m. Skript im Scratchpad, nicht im Repo.
- Neu generieren: Python-Skript nicht im Repo (Scratchpad); Kacheln `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/{x}/{y}.png`, Höhe = R·256 + G + B/256 − 32768.
