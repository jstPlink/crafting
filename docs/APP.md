# Crafting — riferimento tecnico e funzionale

Documento unico che descrive **come funziona tutta l'app**. Va letto prima di toccare il codice e va
**aggiornato ogni volta che cambia un comportamento** (vedi "Manutenzione" in fondo).
Le funzioni sono citate per nome, non per riga: i numeri di riga cambiano.

## 1. Cos'è

Un mockup della schermata "Crafting" di un gioco spaziale (stazione "Marianan Station"): il giocatore
sceglie un **Body** (scafo), monta **Arms** (bracci) e **moduli** (armi, motori) sui suoi socket, e
vede in tempo reale statistiche, potenza, calore e valore della nave. È pensata per **gamepad**, con
tastiera e mouse come alternative. Non c'è backend: tutto vive nel browser.

- Stack: HTML + CSS + JavaScript vanilla, **nessun build step**, nessun framework.
- 3D: three.js r147 (`mockup/vendor/three.min.js`, `GLTFLoader.js`), script classici (funziona anche da `file://`).
- Render UI: stringhe HTML assegnate con `innerHTML` (niente virtual DOM).
- Persistenza: `localStorage`, chiave `crafting.save.v1`.
- Lingua dell'interfaccia: inglese. Terminologia: lo scafo si chiama **Body**, i bracci si chiamano **Arms**, ma **nel codice sono ancora `pylon` / `PYLONS` / `'pyl'`**.

## 2. File del repository

| Percorso | Contenuto |
|---|---|
| `mockup/index.html` | Markup dei contenitori vuoti + **tutto il CSS** (nel tag `<style>`) + caricamento script e `boot()` |
| `mockup/app.js` | Dati (catalogo, body), stato, calcoli, rendering UI, azioni, input mouse/tastiera/gamepad, salvataggio, boot |
| `mockup/ship3d.js` | Vista 3D three.js: scafo procedurale, moduli, outline, camera, picking, caricamento `.glb` |
| `mockup/switcher.js` | Menu **versioni + esperimenti** (click sulla scritta build in alto a destra). Condiviso da tutte le versioni |
| `mockup/versions.js` | Manifest delle versioni congelate (`window.CRAFTING_VERSIONS`), scritto da `scripts/snapshot.py` |
| `mockup/versions/<v>/` | **Snapshot congelati** (`index.html`, `app.js`, `ship3d.js`) di ogni versione rilasciata. Non si modificano a mano |
| `scripts/snapshot.py` | Congela la copia di lavoro come nuova versione |
| `mockup/vendor/` | `three.min.js` e `GLTFLoader.js` (non modificare) |
| `Dockerfile`, `docker/nginx.conf`, `docker-compose.yml` | Deploy: nginx serve `mockup/` |
| `.github/workflows/docker.yml` | CI: build multi-arch e push su `ghcr.io/jstplink/crafting` |
| `.claude/launch.json` | Dev server: `python -m http.server 6480 --directory mockup` (nome config: `mockup`) |
| `docs/APP.md` | Questo file |

Ordine di caricamento in `index.html`: `three.min.js` → `GLTFLoader.js` → `app.js` → `ship3d.js` → `boot()` → `versions.js` → `switcher.js`.
`app.js` e `ship3d.js` condividono **variabili globali** (nessun modulo ES): `ship3d.js` usa `S`, `LY`, `PV`,
`BODY`, `SIZE`, `ITEM`, `layout()`, `renderAll()`, `toast()`, `$`; `app.js` chiama `initShip`, `renderShip`,
`pickSlot`, `setShipCursor`, `window.setShipBody/resizeShip/panShip/resetPan`.

## 3. Come si esegue

- Dev: preview `mockup` (porta 6480), oppure aprire `mockup/index.html` da `file://`.
- Debug URL: `?model=<url.glb>` carica un body personalizzato.
- Docker: `docker compose up -d --build` → `http://localhost:6480`. In produzione l'immagine viene da `ghcr.io/jstplink/crafting:latest`.
- `version.json` è generato dal Dockerfile (versione CI `1.0.<run>`, sha, data). In locale non esiste. La scritta build mostra solo `v<APP_VERSION>`; i dettagli CI (build, sha, data) sono nel tooltip (`title`) quando `version.json` esiste. Cliccando la scritta si apre il menu versioni (§3b).
- **Versione app**: `APP_VERSION` in `app.js` (oggi `0.4.3`) va incrementata a ogni versione e la versione va congelata con `scripts/snapshot.py` (§3b).
- nginx serve html/js con `no-cache` e `vendor/` con cache di 7 giorni.
- **Cache-busting** (Dockerfile): a ogni build ogni `src="….js"` locale di **ogni** `index.html` (radice e `versions/<v>/`) riceve `?v=<sha>`, così né browser né CDN mischiano script vecchi con html nuovo. Gli script nuovi che si aggiungono a un `index.html` sono coperti in automatico (purché locali e senza `?`).

## 3b. Versioning: provare versioni diverse dall'app

Obiettivo: poter aprire **qualsiasi versione passata** dell'app e confrontarne il "feeling", restando nell'app.

- **Radice del sito (`/`) = LATEST**: la copia di lavoro, sempre la versione più nuova. Si sviluppa qui.
- **`/versions/<v>/index.html` = snapshot congelato** di una versione rilasciata (immutabile). Le librerie `vendor/`, `versions.js` e `switcher.js` restano condivise alla radice (lo script riscrive i percorsi in `../../`).
- **Menu in-app**: click sulla scritta build (sotto i crediti). Elenca LATEST e ogni versione del manifest con data e note, e permette di passare da una all'altra. Solo mouse (è uno strumento da mockup, come la pill INPUT). Il menu è dentro `#stage`, quindi sparisce in view mode.
- **Salvataggi separati per versione**: chiave `localStorage` = `saveKey` dell'entry nel manifest (default `crafting.save.<versione>`; la 0.4.0 usa quella storica `crafting.save.v1`). Il pulsante **COPY BUILD HERE** copia le build salvate di un'altra versione in quella corrente (chiede conferma, poi ricarica).
- **Esperimenti (flag)**: una versione può esporre `window.craftingExperiments = { items(), toggle(id) }`; il menu mostra ogni voce come interruttore ON/OFF. Serve a combinare/confrontare singole funzioni **dentro la stessa versione** (gli snapshot servono invece a confrontare versioni intere).
- Le versioni congelate non hanno gli esperimenti nuovi (sono codice vecchio); hanno solo il menu, aggiunto dallo script.
- Se una versione non ha ancora un salvataggio proprio, `loadLocal` parte da quello storico `crafting.save.v1` (la 0.4.3 ha ereditato così la build della 0.4.2); da lì in poi scrive solo sulla propria chiave.

### Procedura di rilascio (a ogni versione nuova)
1. Finire le modifiche in `mockup/` e incrementare `APP_VERSION` in `mockup/app.js`.
2. **Aggiornare questo documento** (regole, UI, input, file, sezione "Versioni").
3. `python scripts/snapshot.py <versione> --notes "<una riga>"` (fallisce se `APP_VERSION` non coincide o se lo snapshot esiste già).
4. Commit (incluse `mockup/versions/<v>/` e `mockup/versions.js`), poi `git tag v<versione>`, poi push.
- Non modificare mai a mano una cartella `versions/<v>/`. Se serve correggerla: `--force`, e dirlo nel commit.
- Se una nuova versione cambia il formato del salvataggio, `loadLocal` deve restare tollerante (scarta id sconosciuti) o gestire la migrazione.

### Versioni
| Versione | Note |
|---|---|
| 0.4.0 | Baseline (tag `v0.4.0` = commit `685adf4`): Body/Arms, parametri moduli, slot cargo, view mode. Salvataggio `crafting.save.v1` |
| 0.4.1 | Solo cache-busting nel Dockerfile (commit `ccb8dc9`). Nessuno snapshot: UI identica alla 0.4.0 |
| 0.4.2 | Colori per tipo di modulo di nuovo attivi (rosso primary, giallo secondary, blu engine), scritta build ridotta a `v<versione>`. Snapshot **retroattivo** dal commit `da61880`. Salvataggio `crafting.save.v1` |
| 0.4.3 | Leggibilità: testo più grande e più contrasto, stat chiave su ogni riga + delta + BEST + ordinamento cargo, overview più chiara. Ogni intervento è un esperimento ON/OFF (§3c). Salvataggio `crafting.save.0.4.3` |

## 3c. Esperimenti (flag) della 0.4.3

Tre interruttori nel menu versioni (in alto a destra), tutti ON di default, salvati in `localStorage` (`crafting.flags.<versione>`).
Definiti in `app.js`: `FLAGS`, `flag(id)`, `loadFlags`, `applyFlags`, `window.craftingExperiments`. Con **tutti spenti l'app è uguale alla 0.4.2**.

| Flag | Cosa cambia | Dove |
|---|---|---|
| `bigText` "Readable text" | Font più grandi (etichette maiuscole ≥ 15px, testo ≥ 16px) e `--dim` più chiaro (`#9aa3ab`) + testi molto spenti schiariti (`#8a939b`) | Solo CSS: blocco `#stage.ux-big …` in fondo a `index.html`. La classe `ux-big` è messa sullo stage da `applyFlags` |
| `keyStats` "Key stat on rows" | Riga slot: icona+valore della stat chiave (DPS armi, velocità motori), senza glifo taglia. Riga cargo a 2 linee: `×n · DPS/SPEED valore · ▲/▼ delta · BEST`. Chip `SORT · …` nella riga TARGET. Ordinamento cargo | `KEYSTAT`, `statOf`, `SORT_FN`, `cargoItems`, `leftRow`, `renderRight`, `cycleSort`; CSS `.ks`, `.cg-row.two`, `.sub`, `.dlt`, `.best`, `.sortchip` |
| `overview` "Clearer overview" | Potenza mostrata **una volta** (tolta dall'header sinistro e dal footer della card, che dà solo il verdetto); riga unica **SHIP VALUE + FREE SOCKETS** (liberi/totali per taglia, con delta in anteprima); slot vuoti chiamati "Empty"; leggera compattazione (`ux-ov`) per lasciare spazio al cargo | `hdrPower` in `renderLeft`, `valRow` in `renderRight`, `verdict/foot` in `renderCard`, `leftRow`; CSS `.valrow.sum`, `#stage.ux-ov …` |

Dettagli `keyStats`:
- **Delta** = stat del pezzo in cargo − stat del **modulo montato nel socket selezionato**, solo se dello stesso `kind`; `=` se uguale; nessun delta se il socket è vuoto o contiene un arm.
- **BEST** = pezzo con la stat più alta fra quelli **montabili** (rispetto a potenza e cargo), solo se ce ne sono ≥ 2 e batte l'eventuale modulo montato dello stesso tipo. Se il montato è già il migliore non compare nessun BEST.
- **Ordinamenti** (`S.sort`, si cicla con il chip, tasto `O`, o **X** del pad in focus cargo): `stat` (stat chiave ↓, poi rarità), `rarity` (rarità ↓, poi stat), `power` (potenza ↑, poi stat). Non vale per la tab Arms. `S.sort` non viene salvato.

## 4. Modello di dominio

### 4.1 Taglie dei socket (`SIZE`, `SIZE_ORDER`)
| Taglia | Etichetta | Colore | Forma |
|---|---|---|---|
| 1 | P1 Small | rosso `#e5484d` | triangolo |
| 2 | P2 Medium | verde `#4fd06a` | quadrato |
| 3 | P3 Large | blu `#3aa0ff` | cerchio |

Un socket di taglia N accetta **solo** elementi di taglia N. `sg(n,px,mode)` disegna la forma SVG del socket.

### 4.2 Body (`BODIES`, `BODY_LIST`, variabile `BODY`)
Ogni body ha: `id, name, value, tag, integrity, shield, generator` (budget di potenza), `heatsink`,
`boost` (carica boost), `cam` (distanza camera), `plat` (scala piattaforma), `look` (raggi e colore dello scafo procedurale),
`sockets[]` (`{id,size,pos,dir}` in spazio modello), opzionale `model3d` (gruppo three.js da `.glb`).
Body definiti: **ZEPHYROS** (8 socket, misto), **NEEDLE** (4×P1, leggero), **COLOSSUS** (6×P3, pesante), **KESTREL** (5 socket, misto).
- `BODIES_IN_GAME = 12` è solo il totale mostrato in "UNLOCKED n/12"; `unlockedBodies()` conta i body non `CUSTOM`.
- Regole di progettazione: niente socket sul retro dello scafo; i socket non devono sovrapporsi in vista frontale.
- Ogni body ha **la propria build**: `S.att` è quella del body attivo, `S.builds[bodyId]` le altre.

### 4.3 Arms (`PYLONS`) — bracci, illimitati (nessuna quantità in cargo)
| Tipo | Ingresso | Uscite (`outputsOf`) | Dove si monta |
|---|---|---|---|
| `ext` Extension | N | 1 socket di taglia N | **solo su socket del Body** (`canMount`), per evitare catene infinite |
| `split` Split | N ≥ 2 | 2 socket di taglia N−1 | su qualsiasi socket di taglia N |

Definiti: `ext1/2/3`, `split2` (P2 → 2×P1), `split3` (P3 → 2×P2). Le uscite di un arm sono socket a tutti gli effetti
(id `<padre>.<i>`), quindi gli split si concatenano. Gli arms **non consumano potenza e non hanno valore**.

### 4.4 Moduli (`MODS`) — limitati dal cargo
Costruiti con `W()` (armi) e `E()` (motori). Campi comuni: `id, name, kind, fam, size, lv, value`.
- `kind`: `primary` (munizioni infinite, generano `heat`), `secondary` (caricatore `mag`, niente calore), `engine`.
- `fam` (famiglia): `gatling`, `laser` (primary), `rocket`, `smatter` (secondary), `engine`. Determina icona e tipo di munizione (`FAMILY`).
- Armi: `power, dmg, rate, acc`, `dps = round(dmg*rate)` calcolato. Motori: `power, speed, boostUse`.
- `lv` 1..7 = rarità (`RARITY`: marrone, grigio, verde, azzurro, arancio, fucsia, oro).
- `value = worth(size, lv)` = `round(size*140*RAR_MULT[lv-1]/10)*10`.
- Parametri mostrati e ordine: `MOD_KEYS` / `KEY_ORDER`; metadati (etichetta, icona, "meglio alto/basso", unità) in `STAT_META`.

### 4.5 Cargo
- `CARGO_SLOTS = 25` slot, `STACK = 14` moduli identici per slot. `cargoSlots(C)` = somma di `ceil(qty/STACK)` per modulo.
- Stato iniziale: uno stack pieno di ogni modulo, meno quelli già montati nella build di default.
- Un modulo montato esce dal cargo; smontato (o sostituito, o rimosso con l'arm che lo regge) **torna** nel cargo. Se non c'è spazio l'operazione è **rifiutata** ("CARGO FULL").

## 5. Stato (`S`) e variabili globali

```
S.att        socketId -> { t:'mod'|'pyl', id }   build del body attivo (i figli hanno id '<padre>.<i>')
S.builds     bodyId -> att                        build salvate degli altri body
S.cargo      moduleId -> quantità
S.sel        socket selezionato
S.tab        categoria cargo: 'pylon'|'primary'|'secondary'|'engine'
S.focus      'slots' | 'cargo' | 'body'           dove sta il focus di navigazione
S.picker/pickIdx   selettore Body aperto / indice
S.cargoIdx   riga del cargo evidenziata
S.sort       ordinamento cargo: 'stat'|'rarity'|'power' (esperimento keyStats, non salvato)
S.hoverCargo / hoverSlot / hoverRemove   hover mouse (guidano anteprima e outline 3D)
S.inputPref  'gamepad'|'keyboard'|'auto'; S.device = dispositivo rilevato (per 'auto')
S.flash/flashT   animazione "appena montato"
S.view       vista a schermo intero (non è inizializzato in S: parte undefined = falso)
S.scale      fattore di scala dello stage
S.rot        {yaw,pitch,d} camera desiderata
BODY  body attivo   LY  layout corrente   T0  totali correnti   PV  anteprima corrente (o null)
```

## 6. Motore di calcolo

### 6.1 Layout dei socket — `layout(att)`
Appiattisce socket del body + tutte le uscite degli arms montati in `{ list, byId }` (depth-first).
Ogni socket: `id, size, pos, dir, depth, parent, idx` e, se ospita un arm, `pylon, joint, kids, segs` (segmenti 3D).
- `spawn(sock, arm)` calcola la geometria grezza (lunghezze `EXT_LEN`, `STEM`, `SPREAD`).
- `stagger()` sposta lateralmente i figli finché, **in vista frontale (asse Z)**, nessun socket-modulo cade dietro un altro (`CLEAR`).
- `sideOf()` decide la direzione di apertura dello split.
- `navOrder(L)`: ordine di navigazione = sezioni P3, P2, P1, ognuna con il proprio sottoalbero. Usato per su/giù.
- `inTree(id, root)`: `id` è `root` o un suo discendente (prefisso `root.`).

### 6.2 Totali — `calc(att)` → `t`
`power` (somma potenza moduli), `heat` (somma calore), `speed`, `boostUse`, `priDps`, `secDps`, `value` (= `BODY.value` + valore moduli),
`sock[1..3].{free,total}`, `maxSpeed = speed` (il body non ha velocità base: la danno i motori),
`boostTime = BODY.boost / boostUse` (0 se nessun consumo).
`T0 = calc(S.att)` è la build corrente.

### 6.3 Regole di legalità
- **Potenza**: `fits` se `power <= BODY.generator` (moduli soltanto). Superarla blocca l'equip ("NOT ENOUGH POWER").
- **Calore**: **informativo, non bloccante**. `carico = heat / BODY.heatsink`; oltre 100% → "OVERHEATS ON SUSTAINED FIRE".
- **Cargo**: dopo l'operazione `cargoSlots <= 25`, altrimenti "CARGO FULL".
- **Extension**: solo su socket radice (`canMount`).

### 6.4 Operazioni sulla build
- `attachTo(att, cargo, sid, item)`: **pura**. Rimuove tutto il sottoalbero di `sid` (i moduli tornano in cargo, gli arms spariscono), poi monta `item` (se dato, un modulo lo toglie dal cargo). Ritorna `{att,cargo,ret}`; `ret` = id restituiti.
- `makePreview(sid, to)` → `{sid,to,att,ret,t1,fits,room}`: simulazione senza modificare lo stato.
- `computePreview()` → `PV`: priorità a `hoverRemove` (passaggio sul ✕ di uno slot → anteprima rimozione), poi `hoverCargo`, poi la riga cargo evidenziata se `focus==='cargo'`; altrimenti `null`.
- `equip(id, sid)` esegue (con toast e `flash`); se monti un arm seleziona automaticamente il suo primo figlio `<sid>.0`.
- `unequip(sid)`, `removeAll()` (rifiutati se il cargo non basta), `switchBody(id)`.

## 7. Interfaccia (stage fisso 1920×1080)

`#stage` è 1920×1080 posizionato al centro e scalato con `transform: scale(...)` da `fit()` (`min(w/1920, h/1080)`). Tutto dentro è
in **coordinate assolute a 1920×1080**. Font: Rajdhani (Google Fonts) con fallback. Nessun test responsive: cambia solo la scala.

| Regione | Elemento | Posizione/dimensione | Funzione di render |
|---|---|---|---|
| Barra alta | `#top` | 0,0 · 1920×160 | `renderTop()` |
| Pannello sinistro | `#left` | 40,180 · 450 · max 780 alto | `renderLeft()` |
| Vista nave | `#shipbox` | 490,168 · 920×468 | `renderShip()` (ship3d.js) |
| Card confronto | `#card` | 560,640 · 780 largo | `renderCard()` |
| Colonna destra | `#right` | 1410,180 · 470×780 | `renderRight()` |
| Selettore body | `#picker` | 510,180 · 880×780, sopra il centro | `renderPicker()` |
| Barra bassa | `#bottom` | in basso, 100 alto | `renderBottom()` |
| Toast | `#toast` | centro alto | `toast(msg, kind)` |
| Overlay uscita | `#leave-ov` | a tutto schermo | mostrato da `holdDone('leave')` |

`renderAll()` ricalcola `LY`, `T0`, `PV`, salva in locale, e richiama **tutti** i render. Ogni cambio di hover/selezione lo chiama.
Nota: `#top` e le tab "MAINTENANCE / RAIDER LOG / INVENTORY / TRADING" e l'HUD (21.980 / 14.000 / lv 30 / 121.834 CR) sono **decorazioni statiche** di contorno, non funzionano.

### 7.1 Barra alta (`renderTop`)
HUD finto (emblema, barre, velocità 0 m/s, livello), titolo stazione, tab con "CRAFTING" attiva, crediti. Glifi LB/RB decorativi.

### 7.2 Pannello sinistro (`renderLeft`, `leftRow`)
- **Header** (`lp-head bodysel`): pulsanti ‹ › per cambiare body (`data-bstep`), nome cliccabile (`data-bpick`) che apre il selettore, "UNLOCKED n/12", potenza `usata / generator` (arancione se sale, rosso se eccede, con anteprima; **nascosta con il flag `overview`**).
- **Lista socket** divisa per sezioni P3/P2/P1 (`sec-title`). Ogni riga (`.slot`): icona (forma socket tratteggiata se vuoto, icona famiglia se modulo, icona arm se braccio), nome (tooltip = nome completo), stat chiave (flag `keyStats`), glifo taglia (non con `keyStats`), uscite se arm, glifo `A` se selezionato+focus, pulsante ✕ (`data-unq`) per smontare.
- Indentazione di 24px per livello (`--d`) e linee ad albero fino al braccio genitore (`--up`).
- Stati CSS: `sel`, `focus`, `hov`, `flash`, `pv-add` ("→ NEW"), `pv-rem` (barrato), `rar` (tinta rarità via `--rc`), `free` (vuoto, tratteggiato; con `overview` mostra "EMPTY"), `pyl`, `child`.

### 7.3 Colonna destra
**Overview** (`.ov`, titolo "SPACESHIP OVERVIEW", mostra "PREVIEW" quando `PV` è attivo):
1. `SHIP VALUE` con delta (con `overview`, nella stessa riga di `FREE SOCKETS ▲n/tot ■n/tot ●n/tot`, con delta in anteprima).
2. `POWER n / generator`: barra a segmenti (uno per punto di generatore): `on` (in uso), `add` (verde, verrebbe aggiunto), `rem` (righe rosse, verrebbe liberato), `over` (tutta rossa se si eccede) + delta.
3. `HEAT LOAD %`: barra continua `hbar` (cur/add/rem), stato "∞ SUSTAINED FIRE" o "OVERHEATS…", tooltip "?" (solo hover mouse).
4. Griglia 2×3 di `statCell`: INTEGRITY, SHIELD POWER (costanti del body), PRIMARY DPS, SECONDARY DPS, MAX SPEED, BOOST DURATION, con badge delta (verde migliora / rosso peggiora / giallo `wn` per costi in aumento; `dcls` decide in base a `STAT_META.better`).

**Cargo** (`.cg`): titolo con `slot usati / 25`, riga `TARGET` (taglia del socket selezionato; a destra il chip di ordinamento con `keyStats`, altrimenti il nome del pezzo montato), 4 categorie (Arms, Primary, Secondary, Engines) con glifi LT/RT, lista.
- `cargoItems()` filtra per **taglia del socket selezionato**, categoria, disponibilità (`cargo>0`, arms sempre) e `canMount`.
- `ensureTab()` cambia categoria automaticamente se quella corrente è vuota per quel socket.
- Riga (senza `keyStats`): icona, nome, `×quantità` (solo moduli), taglia o uscite (arms). Con `keyStats` i moduli hanno 2 linee (nome / `×n`, stat, delta, BEST) e niente glifo taglia; etichetta azione visibile **solo con focus/hover**: `EQUIP`/`REPLACE`/`NO POWER`/`CARGO FULL`. Classe `nopow` se non ci sta.
- Click su una riga = **equipaggia subito** (non solo seleziona).

### 7.4 Card di confronto (`renderCard`)
- Senza anteprima: socket vuoto (invito a scegliere), arm montato (uscite e figli), oppure modulo montato (tabella dei parametri).
- Con anteprima: tabella `INSTALLED | NEW | Δ` (per arms: uscite e socket liberi prima/dopo), riga "Returns to cargo", footer con verdetto (`READY TO EQUIP/REPLACE`, `NOT ENOUGH POWER · NEEDS n MORE`, `CARGO FULL…`, `GOES BACK TO CARGO`). Senza il flag `overview` il footer mostra anche la potenza `T0 ➜ nuova`.
- Se cambia il tipo di modulo (es. arma → motore) mostra solo i parametri del nuovo.

### 7.5 Selettore Body (`renderPicker`)
Griglia 2 colonne di card (`.bcard`): nome, "IN USE", schema dall'alto dei socket (`schematic`), stats del body, conteggio socket per taglia, parti montate. Navigazione: ←→ ±1, ↑↓ ±2, A conferma, B/click fuori chiude.

### 7.6 Barra bassa (`renderBottom`)
Suggerimenti dei tasti **che cambiano col contesto** (picker / focus body / focus slot / focus cargo). In focus cargo, con `keyStats`, c'è anche **Sort** (X / `O`). Sempre presenti: rotazione (RS), View mode, `INPUT · <pref>` (pill che cicla gamepad → keyboard → auto), **HOLD TO LEAVE** (START/Esc tenuto premuto 900 ms → overlay "UNDOCKING…"). "Remove all" (Y / R) è hold-to-confirm 900 ms (`HOLD_MS`, `holdStart/holdEnd/holdDone`, barra di avanzamento via `--p`).
`glyph(n)` restituisce il glifo gamepad o il tasto tastiera secondo `dev()`.

### 7.7 Debug / mockup-only
Il pulsante viola **DEBUG · RANDOM BUILD** (`#dbgRandom` → `randomBuild()`) monta una build casuale ma legale (fino a 20 tentativi). La pill INPUT e la scritta build `#build` (cliccabile: menu versioni/esperimenti, `switcher.js`) sono elementi del mockup, non del gioco.

## 8. Vista 3D (`ship3d.js`)

- `initShip()`: renderer WebGL (`preserveDrawingBuffer`), luci, piattaforma di attracco (`floorG`), `shipRoot` con `V.hull` (scafo) e `V.dyn` (parti dinamiche).
- `renderShip()`: **ricostruisce da zero** `V.dyn` a ogni chiamata (`clearDyn` libera geometrie/materiali). Se c'è un'anteprima con `PV.to` usa `PV.att`/`layout(PV.att)`: le parti nuove vengono disegnate "fantasma" (verde se `fits`, rosso altrimenti), quelle in rimozione in `rem`.
- Per ogni socket: puntoni degli arms (`strut`, sfere di giunzione), modulo (`buildModule` per `kind`: primary/secondary/engine, scala `MOD_SCALE[size]`), **marker** (sprite forma+colore) **solo sui socket liberi** e non in view mode, sfera invisibile per il picking (`V.pickers`).
- **Outline** (`addOutline`, hull invertito) sul socket selezionato (arancione) o in hover (bianco); assente in view mode.
- **Tag** HTML (`#tagSel`, `#tagHov`) ancorati alla posizione proiettata del socket, con taglia e nome (`placeTag` ogni frame).
- `animateShip()`: camera orbitale con smorzamento verso `S.rot` (yaw, pitch, distanza) + `V.pan` (solo view mode), leggera oscillazione della nave, pulsazione del marker selezionato, effetto "pop" dopo l'equip, fiamme dei motori animate.
- `pickSlot(e)`: raycast sui picker → id socket (usato da hover e click).
- Camera: `TARGET=(0,.5,-.3)`; limiti in `ROT()`: normale pitch −.25..1.1, dist 8..26; in view mode pitch ±1.45, dist 3..45.

### 8.1 Body personalizzati da `.glb`
Trascinando un `.glb/.gltf` sullo stage (o con `?model=`), `setHull` cerca i nodi chiamati `sock_p<size>_<n>` (regex tollerante: `socket_p2-1`, ecc.), il cui asse locale **+Z** è la direzione di uscita. Se ne trova, crea `BODIES['custom<N>']` (tag `CUSTOM`, valori di default: value 1500, integrity 20000, shield 10000, generator 26, heatsink 40, boost 100), lo aggiunge a `BODY_LIST` e lo seleziona. Il modello è scalato a 6 unità sul lato maggiore. **I body custom non sopravvivono al reload** (il salvataggio scarta body sconosciuti).

## 9. Input

Le azioni logiche passano tutte da **`act(name)`**: `up down left right a b x sort catNext catPrev view`. `act` smista in base al contesto (view mode → picker → focus body → focus slot/cargo).

### 9.1 Flusso di navigazione
- **Focus `slots`** (default): ↑↓ cambiano socket (`moveSel`, salendo oltre il primo si passa a `body`); **A** → passa al cargo (se vuoto, toast informativo); **X** smonta.
- **Focus `cargo`**: ↑↓ evidenziano una riga (→ anteprima live); **A** equipaggia; **B / ←** torna a `slots`; **LT/RT** cambiano categoria; **X** (pad) / `O` cambia l'ordinamento (con `keyStats`).
- **Focus `body`**: ←→ cambia body, **A** apre il selettore, ↓ torna agli slot.
- Dopo un `equip` il focus torna a `slots`.

### 9.2 Tastiera
`↑/W ↓/S` naviga · `Enter/Space` = A · `Backspace` = B · `←/→` · `Del/X` smonta · `Tab / Shift+Tab` categoria · `O` ordinamento cargo · `V` view mode · `R` (tenuto) rimuovi tutto · `Esc` (tenuto) lascia; in picker chiude; in view mode esce.
Nota: i tasti `Q/E` sono mostrati come glifi LB/RB ma **non sono associati a nulla**.

### 9.3 Gamepad (mapping standard, `pollPad` ogni frame)
A=0 B=1 X=2 Y=3 LB=4 RB=5 LT=6 RT=7 View=8 Start=9 D-pad 12–15. Stick sinistro Y = su/giù (con ripetizione a 90 ms dopo 380 ms). Stick destro = rotazione camera. In view mode: stick sinistro = pan, trigger = zoom, B/View = esci. LT/RT = categoria; Y (tenuto) = rimuovi tutto; Start (tenuto) = lascia; **X in focus cargo = ordinamento** (negli altri focus X smonta).
`inputPref='auto'` cambia i glifi in base all'ultimo dispositivo usato; `gamepadconnected` mostra un toast.

### 9.4 Mouse
- **Hover** riga cargo / riga slot / ✕ / socket nella vista 3D → aggiorna `S.hover*` → anteprima e outline (ogni cambio chiama `renderAll`).
- **Click** slot o socket 3D → seleziona (focus `slots`); **click riga cargo → equipaggia**; ✕ smonta; tab categorie; chip `SORT` (`data-sort`); hint della barra bassa attivano l'azione corrispondente; header body apre selettore.
- **Vista 3D**: trascina = ruota (soglia 5px per distinguere dal click), rotella = zoom, doppio click = reset camera. Tasto destro/centrale/Shift+drag = pan (solo view mode).

### 9.5 View mode (`setView`)
Tasto `V` / View del pad / pulsante "EXIT VIEW MODE". `#shipbox` occupa tutto lo stage e **tutto il resto diventa `visibility:hidden`** (tranne scena e toast). Niente marker né tag. Al ritorno la camera torna alla posizione di `homeRot()`.

## 10. Persistenza (`saveLocal` / `loadLocal`)
- Salva a ogni `renderAll` (solo se il JSON è cambiato): `{ body, builds (tutte, inclusa la corrente), cargo }`.
- Chiave = `crafting.save.<APP_VERSION>` (una per versione). Se manca, si legge la storica `crafting.save.v1` (`LEGACY_SAVE_KEY`).
- Flag esperimenti: `crafting.flags.<APP_VERSION>`.
- Non salva: selezione, categoria, ordinamento, camera, view mode, preferenza input.
- Al caricamento scarta id sconosciuti al catalogo attuale e allinea `t` arm/modulo; i moduli nuovi partono con uno stack pieno; se l'id body non esiste usa ZEPHYROS. Per azzerare: cancellare la chiave della versione da localStorage.

## 11. Boot (`boot()`)
`loadLocal` → `loadFlags` → `applyFlags` → camera `homeRot()` → scritta build → `renderTop` → `initShip` → `renderAll` → avvio `pollPad` → fetch di `version.json` per completare la scritta build.

## 12. Convenzioni CSS/UI da rispettare
- Colore dei **tipi di modulo** (dalla 0.4.2): primary rosso `--pri`, secondary giallo `--sec`, engine blu `--eng`, su icone delle righe (`.slot`, `.cg-row`), bordo della tab attiva e modelli 3D (`KIND_COL` in `ship3d.js`). La 0.4.0/0.4.1 li teneva solo per icona: ora **taglia socket** (forma+colore), **rarità** (tinta riga) e **tipo modulo** convivono, quindi non aggiungere altri significati al colore.
- Rarità: solo colore (tinta riga `--rc`, striscia sull'icona, `rdot`).
- I delta nelle statistiche **non devono cambiare il layout**: usare slot a larghezza fissa (`dslot`) o badge assoluti (`.sd`), e `visibility:hidden` (`.sd.off`).
- **Tipografia** (regola dell'esperimento `bigText`): etichette MAIUSCOLE ≥ 15px, testo normale ≥ 16px, niente sotto i 14px per ciò che si legge. Testi secondari: `--dim`; i grigi ancora più spenti (`#5c…`, `#6b…`) hanno contrasto < 4.5:1 e vanno evitati per testo nuovo (usare `#8a939b` o più chiaro).
- **Ogni modifica UX confrontabile va dietro un flag** (§3c): il CSS nuovo si scopa con una classe sullo stage (`ux-big`, `ux-ov`) o si genera solo quando il flag è attivo, così con il flag spento resta il comportamento precedente.
- Il nome del body ha larghezza fissa (150px) così i pulsanti ‹ › non si spostano.
- Il CSS è stratificato (regole successive sovrascrivono le precedenti, es. `.slot`, `.cg-row`, `.st`, `.wc`): quando si modifica un componente cercare **tutte** le occorrenze del selettore.

## 13. Codice morto / stranezze note
- `skCell()`, `wcell()` e le classi `.wrow/.wc/.wc.sk` (vecchia griglia socket liberi/pot.) **non sono usate**: i socket liberi si vedono nell'overview solo con il flag `overview` (riga `.valrow.sum`, non con `skCell`); senza flag si vedono solo nell'anteprima degli arms.
- `.slot .pwr` (potenza per slot) è definita in CSS ma non renderizzata.
- `S.view` non è dichiarato in `S`.
- `KIND.label` e `TAB_CLS` parzialmente ridondanti; `I.eng/kin/exp/nrg` sono icone non usate.
- Nel codice arm = "pylon". Nella UI: "Arm".

## 14. Ricette per le modifiche più comuni
- **Nuovo modulo**: aggiungere una riga in `MODS` con `W(...)` o `E(...)` (id univoco, famiglia esistente). Compare da solo in cargo (stack pieno) e nei salvataggi vecchi.
- **Nuova famiglia di armi**: aggiungere in `FAMILY`, un'icona in `I`, e (se serve) una forma in `buildModule` (ship3d.js).
- **Nuovo Body**: aggiungere in `BODIES` (socket con `pos` e `dir`) e il suo id in `BODY_LIST`. Verificare la regola "nessun socket dietro un altro in vista frontale".
- **Nuova statistica**: `STAT_META` (etichetta, icona, `better`, unità), poi `MOD_KEYS`/`KEY_ORDER` per i moduli o `calc()` + `renderRight()` per i totali.
- **Nuovo tipo di arm**: `PYLONS` + `outputsOf` + `spawn` (geometria) + eventuale regola in `canMount`.
- **Nuova azione da input**: aggiungere il caso in `act()`, la mappatura in tastiera (`keydown`) e gamepad (`pollPad`), il glifo in `glyph()` e il suggerimento in `renderBottom()`.
- **Nuovo esperimento (flag)**: voce in `FLAGS` (app.js), `flag('id')` nei punti di render, eventuale classe in `applyFlags` e CSS scopato; il menu la mostra da solo.
- **Costanti di bilanciamento**: `CARGO_SLOTS`, `STACK`, `RAR_MULT`, `HOLD_MS`.

## 15. Manutenzione di questo documento
Aggiornare `docs/APP.md` nello **stesso commit** di ogni modifica a: regole di gioco, catalogo, layout/posizioni, input, salvataggio, deploy.
Incrementare `APP_VERSION` in `app.js` a ogni commit.
