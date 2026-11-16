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
- Nächste: Etappe 4.
- Empfehlung: pro Etappe neuen Chat starten (spart Tokens).

## Struktur
- `index.html` – Einstieg, importmap, Overlay
- `src/main.js` – Renderer, Loop, Resize
- `src/world.js` – Szene, Licht, Himmel, Nebel
- `src/terrain.js` – `loadTerrain()` lädt Heightmap, liefert `mesh, heightAt, normalAt, inside, pois`
- `src/player.js` – Skifahrer: Physik + Pose, `state` (pos, vel, dir, heading, speed, grounded, crashed, reset)
- `src/input.js` – Tastatur (`keys`, `down()`, `consume()`)
- `public/terrain/heiligenblut.bin|json` – Heightmap Uint16 (Höhe×10), 430×389, 30 m Raster, + Meta/POIs
- `src/camera.js` – Verfolgerkamera
- `src/config.js` – Gebietsdaten
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
| Schwere Piste (schwarz) | Name/Lage | geschätzt, in Etappe 6 klären |
| Skiroute Fleißalm | ~4 km, ~800 Hm, unpräpariert | verifiziert |
| Pistenlängen/Gefälle einzeln | – | geschätzt (keine Quelle) |

## Gelände / Koordinaten
- Quelle: AWS Terrain Tiles (Terrarium, Zoom 14; Mapzen aus EU-DEM/SRTM). Ausschnitt 46.993–47.098 N, 12.785–12.955 E (~12,9 × 11,7 km).
- Welt: 1 Einheit = 1 m, y = Höhe über NN, +x = Ost, −z = Nord. Ursprung (0,0) = Talstation Heiligenblut (47.0395 N, 12.8430 E).
- POIs (aus DEM): Talstation 1.282 m (0/0), Rossbach ~1.734 m (392/−910, Lage geschätzt), Schareck 2.590 m (1305/−3034, Gipfel lt. DEM 2.606 m), Gjaidtroghöhe 2.965 m (5159/−2623, DEM-Gipfel 2.988 m), Fleißalm ~1.901 m (2350/−2700, Lage geschätzt, Talboden Großes Fleißtal).
- Großglockner (47.074 N, 12.694 E) liegt außerhalb des Ausschnitts → Etappe 9.
- Neu generieren: Python-Skript nicht im Repo (Scratchpad); Kacheln `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/{x}/{y}.png`, Höhe = R·256 + G + B/256 − 32768.
