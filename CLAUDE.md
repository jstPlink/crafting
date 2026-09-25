# Crafting

Mockup vanilla JS (nessun build step) della schermata Crafting: Body → Arms → moduli, con vista 3D three.js.

**Prima di lavorare sul codice leggi [docs/APP.md](docs/APP.md)**: descrive tutto il funzionamento (dominio, stato,
calcoli, UI, 3D, input, salvataggio, versioning, deploy, ricette). Usalo come unica fonte di riferimento invece di
rileggere `mockup/app.js` per intero.

Regole:
- **Prima di ogni commit/push aggiorna `docs/APP.md`** (comportamento, catalogo, layout, input, salvataggio, deploy, versioni).
- Incrementa `APP_VERSION` in `mockup/app.js` a ogni versione e congelala con `python scripts/snapshot.py <versione>`
  (procedura completa in `docs/APP.md` §3b). Le cartelle `mockup/versions/<v>/` sono congelate: non modificarle a mano.
- UI in inglese; nel codice gli "Arms" si chiamano ancora `pylon`/`PYLONS`/`'pyl'`.
- Dev server: preview `mockup` (porta 6480). Se il browser mostra una pagina vecchia, ricaricare saltando la cache.
