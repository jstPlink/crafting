/* =====================================================================
   3D SHIP VIEW  (three.js r147, classic script — works from file://)

   Globals used from index.html: S, SLOTS, MODS, CATS, preview(), wouldFit(),
   slotDef(), slotLabel(), toast()

   HARDPOINT CONTRACT for real ship models (.glb):
     add an Empty/node per slot named   hp_<category>_<n>
       hp_primary_1 … hp_primary_4
       hp_secondary_1 … hp_secondary_2
       hp_engine_1 … hp_engine_5
     The node's local +Z axis is the direction the module points
     (muzzle for weapons, exhaust for engines).
   Slots without a node fall back to the default positions below.
   ===================================================================== */
const SHIP_W = 920, SHIP_H = 530;
const TARGET = new THREE.Vector3(0, -.1, 0);

// default hardpoints for the placeholder ship: position + direction module points at
const HP_DEFAULT = {
  p0:{ pos:[-3.0,-1.5, 1.0], dir:[0,0,1] },
  p1:{ pos:[-1.6,-2.1, 1.7], dir:[0,0,1] },
  p2:{ pos:[ 1.6,-2.1, 1.7], dir:[0,0,1] },
  p3:{ pos:[ 3.0,-1.5, 1.0], dir:[0,0,1] },
  s0:{ pos:[-0.75,-1.05, 2.0], dir:[0,0,1] },
  s1:{ pos:[ 0.75,-1.05, 2.0], dir:[0,0,1] },
  e0:{ pos:[-3.2, 2.2,-1.5], dir:[0,0,-1] },
  e1:{ pos:[-1.7, 2.9,-1.2], dir:[0,0,-1] },
  e2:{ pos:[ 1.7, 2.9,-1.2], dir:[0,0,-1] },
  e3:{ pos:[ 3.2, 2.2,-1.5], dir:[0,0,-1] },
  e4:{ pos:[ 0.0, 0.2,-3.3], dir:[0,0,-1] },
};
const RING_COL = { primary:'#e2685b', secondary:'#d8b25a', engine:'#3d8ff0' };

const V = { ready:false, slots:{}, cur:{ yaw:.9, pitch:.26, d:12.6 }, tex:{}, raycaster:new THREE.Raycaster(), tmp:new THREE.Vector3() };

/* ---------- helpers ---------- */
const stdMat = (color, metal=.35, rough=.45, extra={}) => new THREE.MeshStandardMaterial({ color, metalness:metal, roughness:rough, ...extra });

function ringTexture(color, dashed, plus){
  const key = color+dashed+plus; if(V.tex[key]) return V.tex[key];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = color; g.lineWidth = 9; g.lineCap = 'butt';
  if(dashed) g.setLineDash([16,11]);
  g.beginPath(); g.arc(64,64,52,0,Math.PI*2); g.stroke();
  g.setLineDash([]);
  if(plus){ g.lineWidth = 8; g.beginPath(); g.moveTo(64,44); g.lineTo(64,84); g.moveTo(44,64); g.lineTo(84,64); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return V.tex[key] = t;
}
function makeSprite(){
  const m = new THREE.SpriteMaterial({ map:ringTexture('#6a737c',true,true), alphaTest:.5, transparent:false, depthTest:false, depthWrite:false });
  const sp = new THREE.Sprite(m); sp.renderOrder = 10; return sp;
}
function boom(a, b, r, mat){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r*.8, r, d.length(), 10), mat);
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize());
  return m;
}
const orient = (dir) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(...dir).normalize());

/* ---------- placeholder ship (replaced when a .glb is dropped) ---------- */
function buildHull(){
  const g = new THREE.Group();
  const gold = stdMat(0xb98a3e,.4,.4), dark = stdMat(0x22272d,.5,.5), steel = stdMat(0x59616b,.5,.45);
  const cyan = new THREE.MeshBasicMaterial({ color:0x35e0d0 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1,40,24), gold); body.scale.set(1.5,1.1,2.9); g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1,24,16), dark); belly.scale.set(1.1,.6,2.0); belly.position.set(0,-.6,.1); g.add(belly);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.5,24,16), stdMat(0x7a5a24,.5,.3)); cockpit.scale.set(1.2,.8,1.8); cockpit.position.set(0,.75,1.2); g.add(cockpit);
  for(const sx of [-1,1]){
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.9), cyan); strip.position.set(sx*.8,.5,1.3); strip.rotation.y = sx*-.25; g.add(strip);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(.22,1.5,8), dark); horn.position.set(sx*.7,1.35,-.5); horn.rotation.x = -.6; g.add(horn);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.1,.7,1.3), steel); fin.position.set(sx*1.35,-.1,-.5); fin.rotation.z = sx*.3; g.add(fin);
  }
  const rear = new THREE.Mesh(new THREE.BoxGeometry(1.8,.9,1.1), dark); rear.position.set(0,.1,-2.6); g.add(rear);

  // booms out to every hardpoint
  const root = { p:[0,-.5,.7], e:[0,.7,-.8] };
  for(const [id,h] of Object.entries(HP_DEFAULT)){
    const cat = id[0];
    if(cat==='s') continue;
    const base = cat==='p' ? [Math.sign(h.pos[0])*.95, root.p[1], root.p[2]] : (id==='e4' ? [0,.2,-2.9] : [Math.sign(h.pos[0])*.9, root.e[1], root.e[2]]);
    g.add(boom(base, h.pos, .16, steel));
    const j = new THREE.Mesh(new THREE.SphereGeometry(.26,14,10), dark); j.position.set(...base); g.add(j);
  }
  return g;
}

/* ---------- modules ---------- */
function buildModule(cat, style){
  const g = new THREE.Group();
  const tint = style==='good' ? 0x2f9e4d : style==='bad' ? 0xc23a3a : style==='rem' ? 0x5a3030
             : cat==='primary' ? 0xe2685b : cat==='secondary' ? 0xd8b25a : 0x3d8ff0;
  const lit = style!=='normal';
  const m = stdMat(tint,.4,.4, lit ? { emissive:tint, emissiveIntensity:.45 } : {});
  const dark = stdMat(0x1b1f24,.4,.5);
  const cyl = (r1,r2,len,mat) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,16), mat); c.rotation.x = Math.PI/2; return c; };
  if(cat==='primary'){
    const h = new THREE.Mesh(new THREE.BoxGeometry(.36,.36,.55), m); g.add(h);
    const b = cyl(.07,.09,1.3,m); b.position.z = .85; g.add(b);
    const t = cyl(.11,.11,.14,dark); t.position.z = 1.5; g.add(t);
  }else if(cat==='secondary'){
    const h = new THREE.Mesh(new THREE.SphereGeometry(.24,16,12), m); g.add(h);
    for(const sx of [-1,1]){ const t = cyl(.13,.13,.9,m); t.position.set(sx*.17,0,.45); g.add(t); const c = cyl(.15,.15,.08,dark); c.position.set(sx*.17,0,.92); g.add(c); }
  }else{
    const body = cyl(.36,.4,.8,m); body.position.z = -.1; g.add(body);
    const noz = cyl(.42,.3,.22,dark); noz.position.z = .4; g.add(noz);
    const glowCol = style==='normal' ? 0x9fd4ff : tint;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.27,20), new THREE.MeshBasicMaterial({ color:glowCol })); glow.position.z = .52; g.add(glow);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.24,1.1,16), new THREE.MeshBasicMaterial({ color: style==='normal' ? 0x5fb0ff : tint }));
    flame.rotation.x = Math.PI/2; flame.position.z = 1.08; g.add(flame); g.userData.flame = flame;
  }
  return g;
}

/* ---------- init ---------- */
function initShip(){
  const box = $('#shipbox');
  const renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
  renderer.setClearColor(0x0c0f12, 1);
  box.insertBefore(renderer.domElement, box.firstChild);
  V.renderer = renderer;
  const scene = V.scene = new THREE.Scene();
  const camera = V.camera = new THREE.PerspectiveCamera(36, SHIP_W/SHIP_H, .1, 100);

  scene.add(new THREE.AmbientLight(0x8a96aa, .7));
  scene.add(new THREE.HemisphereLight(0xaac4ff, 0x2a1a12, .6));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.9); key.position.set(5,9,7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf4623a, 1.6); rim.position.set(-7,3,-7); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x4aa0ff, .8); fill.position.set(-8,2,6); scene.add(fill);

  // docking platform
  const floorY = -3.2;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.3,5.3,.12,72), stdMat(0x12171d,.3,.7)); floor.position.y = floorY; scene.add(floor);
  const ringG = new THREE.Mesh(new THREE.TorusGeometry(5.0,.05,8,120), new THREE.MeshBasicMaterial({ color:0x2f7a43 })); ringG.rotation.x = Math.PI/2; ringG.position.y = floorY+.08; scene.add(ringG);
  const ringO = new THREE.Mesh(new THREE.TorusGeometry(3.9,.04,8,120), new THREE.MeshBasicMaterial({ color:0x8a4230 })); ringO.rotation.x = Math.PI/2; ringO.position.y = floorY+.08; scene.add(ringO);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.3,48), new THREE.MeshBasicMaterial({ color:0x0a0c0e })); shadow.rotation.x = -Math.PI/2; shadow.position.y = floorY+.07; scene.add(shadow);

  const shipRoot = V.shipRoot = new THREE.Group(); scene.add(shipRoot);
  V.hull = buildHull(); shipRoot.add(V.hull);

  // hardpoints
  V.pickers = [];
  for(const s of SLOTS){
    const d = HP_DEFAULT[s.id];
    const node = new THREE.Group(); node.position.set(...d.pos); node.quaternion.copy(orient(d.dir)); shipRoot.add(node);
    const pick = new THREE.Mesh(new THREE.SphereGeometry(.55,10,8), new THREE.MeshBasicMaterial({ visible:false })); pick.userData.slotId = s.id; node.add(pick); V.pickers.push(pick);
    const sprite = makeSprite(); node.add(sprite);
    V.slots[s.id] = { node, sprite, mod:null, key:'' };
  }

  V.ready = true;
  resizeShip();

  // drag & drop a .glb
  const stg = $('#stage');
  stg.addEventListener('dragover', e => e.preventDefault());
  stg.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0]; if(!f) return;
    if(!/\.(glb|gltf)$/i.test(f.name)){ toast('DROP A .GLB FILE','bad'); return; }
    loadShipModel(URL.createObjectURL(f), f.name);
  });
  const q = new URLSearchParams(location.search).get('model');
  if(q) loadShipModel(q, q);

  requestAnimationFrame(animateShip);
}
function resizeShip(){
  if(!V.ready) return;
  V.renderer.setPixelRatio(Math.min(2.5, (devicePixelRatio||1) * (S.scale||1)));
  V.renderer.setSize(SHIP_W, SHIP_H, false);
}
window.resizeShip = resizeShip;
function setShipCursor(c){ const cv = V.renderer?.domElement; if(cv) cv.style.cursor = c; }

/* ---------- model loading ---------- */
function loadShipModel(url, name){
  new THREE.GLTFLoader().load(url, gltf => setHull(gltf.scene, name), undefined, () => toast('MODEL LOAD FAILED','bad'));
}
function setHull(obj, name){
  V.shipRoot.remove(V.hull);
  // normalise: centre + scale to a ~7.5 unit ship
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  obj.position.sub(ctr);
  const wrap = new THREE.Group(); wrap.add(obj); wrap.scale.setScalar(7.5 / Math.max(size.x,size.y,size.z));
  V.shipRoot.add(wrap); V.hull = wrap;
  V.shipRoot.updateMatrixWorld(true);

  let found = 0;
  obj.traverse(n => {
    const m = /^hp[_\- ]?(primary|secondary|engine)s?[_\- ]?(\d+)/i.exec(n.name || ''); if(!m) return;
    const slot = SLOTS.find(s => s.cat===m[1].toLowerCase() && s.n===+m[2]); if(!slot) return;
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
    n.getWorldPosition(wp); n.getWorldQuaternion(wq);
    V.shipRoot.worldToLocal(wp);
    const st = V.slots[slot.id]; st.node.position.copy(wp); st.node.quaternion.copy(wq); found++;
  });
  toast(found ? `MODEL LOADED · ${found}/${SLOTS.length} HARDPOINTS` : 'MODEL LOADED · NO hp_* NODES, DEFAULT SLOT POSITIONS', found?'':'info');
  renderShip();
}

/* ---------- state -> scene ---------- */
function renderShip(){
  if(!V.ready) return;
  const pv = preview();
  for(const s of SLOTS){
    const v = V.slots[s.id], cur = S.slots[s.id];
    let modId = cur, style = 'normal';
    if(pv && pv.slot===s.id){
      if(pv.to){ modId = pv.to; style = wouldFit(s.id, pv.to) ? 'good' : 'bad'; }
      else style = 'rem';
    }
    const key = `${modId||''}:${style}`;
    if(key !== v.key){
      if(v.mod){ v.node.remove(v.mod); }
      v.mod = modId ? buildModule(s.cat, style) : null;
      if(v.mod) v.node.add(v.mod);
      v.key = key;
    }
    let col, dashed=false, plus=false, scale=1;
    const sel = S.sel===s.id, hov = S.hoverSlot===s.id;
    if(style==='good'){ col='#63e07a'; dashed=true; }
    else if(style==='bad'){ col='#ff5a5a'; dashed=true; }
    else if(style==='rem'){ col='#ff5a5a'; dashed=true; }
    else if(sel || hov){ col='#ffffff'; plus=!modId; }
    else if(!modId){ col='#6a737c'; dashed=true; plus=true; }
    else col = RING_COL[s.cat];
    v.sprite.material.map = ringTexture(col,dashed,plus);
    v.sprite.material.needsUpdate = true;
    v.sprite.userData.base = modId ? 1.05 : .85;
  }
  // tags
  const fill = (el, id, hv) => {
    if(!id){ el.style.display='none'; el.dataset.slot=''; return; }
    const sd = slotDef(id), pvm = (pv && pv.slot===id && pv.to) ? MODS[pv.to] : MODS[S.slots[id]];
    el.dataset.slot = id;
    el.innerHTML = `<small>${slotLabel(sd).toUpperCase()}</small><b>${pvm ? pvm.name.toUpperCase() : 'EMPTY'}</b>`;
    el.style.display = 'block';
  };
  fill($('#tagSel'), S.sel, false);
  fill($('#tagHov'), S.hoverSlot && S.hoverSlot!==S.sel ? S.hoverSlot : null, true);
}

function placeTag(el){
  const id = el.dataset.slot; if(!id || el.style.display==='none') return;
  const v = V.slots[id]; v.node.getWorldPosition(V.tmp); V.tmp.project(V.camera);
  if(V.tmp.z>1){ el.style.visibility='hidden'; return; }
  el.style.visibility='visible';
  el.style.left = ((V.tmp.x*.5+.5)*SHIP_W)+'px';
  el.style.top  = ((-V.tmp.y*.5+.5)*SHIP_H - 30)+'px';
}

function animateShip(now){
  requestAnimationFrame(animateShip);
  const t = now/1000, r = S.rot, c = V.cur;
  c.yaw += (r.yaw-c.yaw)*.14; c.pitch += (r.pitch-c.pitch)*.14; c.d += (r.d-c.d)*.14;
  const cp = Math.cos(c.pitch);
  V.camera.position.set(TARGET.x + Math.sin(c.yaw)*cp*c.d, TARGET.y + Math.sin(c.pitch)*c.d, TARGET.z + Math.cos(c.yaw)*cp*c.d);
  V.camera.lookAt(TARGET);
  V.shipRoot.position.y = Math.sin(t*.9)*.08;

  const flashT = S.flash ? (performance.now()-S.flashT)/900 : 2;
  for(const s of SLOTS){
    const v = V.slots[s.id];
    const pulse = S.sel===s.id ? 1 + Math.sin(t*5)*.09 : 1;
    const pop = (S.flash===s.id && flashT<1) ? 1 + (1-flashT)*.5 : 1;
    v.sprite.scale.setScalar((v.sprite.userData.base||1) * pulse * pop);
    if(v.mod){
      v.mod.scale.setScalar(pop);
      const f = v.mod.userData.flame; if(f){ f.scale.set(1,.75+.25*Math.sin(t*38+s.n),1); }
    }
  }
  placeTag($('#tagSel')); placeTag($('#tagHov'));
  V.renderer.render(V.scene, V.camera);
}

/* ---------- picking ---------- */
function pickSlot(e){
  if(!V.ready) return null;
  const rect = V.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
  V.raycaster.setFromCamera(ndc, V.camera);
  // nearest to the ray wins (pickers sit inside the hull, so ignore occlusion)
  const hits = V.raycaster.intersectObjects(V.pickers, false);
  return hits.length ? hits[0].object.userData.slotId : null;
}
