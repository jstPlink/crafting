/* =====================================================================
   3D SHIP VIEW  (three.js r147, classic script — works from file://)

   Globals used from app.js: S, LY, PV, BODY, SIZE, ITEM, layout(),
   renderAll(), toast(), $

   SOCKET CONTRACT for real main-body models (.glb):
     add an Empty/node per socket named  sock_p<size>_<n>
       sock_p3_1, sock_p3_2 …   large  (blue circle)
       sock_p2_1 …              medium (green square)
       sock_p1_1 …              small  (red triangle)
     The node's local +Z axis is the direction pylons grow out of the socket.
   Pylons, extensions, splits and modules are generated on top of those
   sockets, so the model only has to describe the bare main body.
   ===================================================================== */
const SHIP_W = 920, SHIP_H = 530;
const TARGET = new THREE.Vector3(0, .1, -.3);

const PYL_R = { 1:.07, 2:.11, 3:.17 };       // strut radius by socket size
const MOD_SCALE = { 1:.55, 2:.85, 3:1.3 };   // module size by socket size
const SPR_SIZE = { 1:.55, 2:.8, 3:1.1 };     // socket marker size
const KIND_COL = { primary:0xe2685b, secondary:0xd8b25a, engine:0x3d8ff0 };

const V = { ready:false, cur:{ yaw:.75, pitch:.34, d:13.2 }, tex:{}, raycaster:new THREE.Raycaster(), tmp:new THREE.Vector3(),
            pickers:[], anchor:{}, spr:{}, modG:{}, flames:[] };

/* ---------- helpers ---------- */
const stdMat = (color, metal=.35, rough=.45, extra={}) => new THREE.MeshStandardMaterial({ color, metalness:metal, roughness:rough, ...extra });
const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);

function ringTexture(shape, color, dashed){
  const key = shape+color+dashed; if(V.tex[key]) return V.tex[key];
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.strokeStyle = color; g.lineWidth = 10; g.lineJoin = 'round';
  if(dashed) g.setLineDash([16,10]);
  g.beginPath();
  if(shape==='tri'){ g.moveTo(64,14); g.lineTo(116,106); g.lineTo(12,106); g.closePath(); }
  else if(shape==='sq'){ g.rect(20,20,88,88); }
  else { g.arc(64,64,48,0,Math.PI*2); }
  g.stroke();
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return V.tex[key] = t;
}
function makeSprite(tex){
  const m = new THREE.SpriteMaterial({ map:tex, alphaTest:.5, transparent:false, depthTest:false, depthWrite:false });
  const sp = new THREE.Sprite(m); sp.renderOrder = 10; return sp;
}
function strut(a, b, r, mat){
  const A = v3(a), B = v3(b), d = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r*.85, r, d.length(), 12), mat);
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize());
  return m;
}

/* ---------- placeholder main body ---------- */
function buildHull(){
  const g = new THREE.Group();
  const gold = stdMat(0xb98a3e,.4,.4), dark = stdMat(0x22272d,.5,.5), steel = stdMat(0x59616b,.5,.45);
  const cyan = new THREE.MeshBasicMaterial({ color:0x35e0d0 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(1,40,24), gold); body.scale.set(1.5,1.1,2.9); g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1,24,16), dark); belly.scale.set(1.1,.6,2.0); belly.position.set(0,-.6,.1); g.add(belly);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.5,24,16), stdMat(0x7a5a24,.5,.3)); cockpit.scale.set(1.2,.8,1.8); cockpit.position.set(0,.75,1.2); g.add(cockpit);
  for(const sx of [-1,1]){
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.08,.08,.9), cyan); strip.position.set(sx*.8,.5,1.3); strip.rotation.y = sx*-.25; g.add(strip);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.1,.7,1.3), steel); fin.position.set(sx*1.35,-.1,-.5); fin.rotation.z = sx*.3; g.add(fin);
  }
  const rear = new THREE.Mesh(new THREE.BoxGeometry(1.8,.9,1.1), dark); rear.position.set(0,.1,-2.6); g.add(rear);

  // a base plate + coloured rim under every socket
  const zAxis = new THREE.Vector3(0,0,1);
  for(const s of BODY.sockets){
    const r = SPR_SIZE[s.size]*.42, dir = v3(s.dir).normalize();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(r,r*1.15,.12,20).rotateX(Math.PI/2), dark);
    plate.position.copy(v3(s.pos)); plate.quaternion.setFromUnitVectors(zAxis, dir); g.add(plate);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r,.035,8,28), new THREE.MeshBasicMaterial({ color:SIZE[s.size].color }));
    rim.position.copy(v3(s.pos)).addScaledVector(dir,.07); rim.quaternion.copy(plate.quaternion); g.add(rim);
  }
  return g;
}

/* ---------- modules ---------- */
function buildModule(kind, size, style){
  const g = new THREE.Group();
  const tint = style==='good' ? 0x2f9e4d : style==='bad' ? 0xc23a3a : style==='rem' ? 0x5a3030 : KIND_COL[kind];
  const lit = style!=='normal';
  const m = stdMat(tint,.4,.4, lit ? { emissive:tint, emissiveIntensity:.45 } : {});
  const dark = stdMat(0x1b1f24,.4,.5);
  const cyl = (r1,r2,len,mat) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,len,16), mat); c.rotation.x = Math.PI/2; return c; };
  if(kind==='primary'){
    g.add(new THREE.Mesh(new THREE.BoxGeometry(.36,.36,.55), m));
    const b = cyl(.07,.09,1.3,m); b.position.z = .85; g.add(b);
    const t = cyl(.11,.11,.14,dark); t.position.z = 1.5; g.add(t);
  }else if(kind==='secondary'){
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.24,16,12), m));
    for(const sx of [-1,1]){ const t = cyl(.13,.13,.9,m); t.position.set(sx*.17,0,.45); g.add(t); const c = cyl(.15,.15,.08,dark); c.position.set(sx*.17,0,.92); g.add(c); }
  }else{
    const body = cyl(.36,.4,.8,m); body.position.z = -.1; g.add(body);
    const noz = cyl(.42,.3,.22,dark); noz.position.z = .4; g.add(noz);
    const glowCol = style==='normal' ? 0x9fd4ff : tint;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(.27,20), new THREE.MeshBasicMaterial({ color:glowCol })); glow.position.z = .52; g.add(glow);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.24,1.1,16), new THREE.MeshBasicMaterial({ color: style==='normal' ? 0x5fb0ff : tint }));
    flame.rotation.x = Math.PI/2; flame.position.z = 1.08; g.add(flame); V.flames.push(flame);
  }
  g.scale.setScalar(MOD_SCALE[size]);
  // weapons fire forward, engines exhaust backward — whatever the socket direction
  if(kind==='engine') g.rotation.y = Math.PI;
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
  const floorY = -3.0;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.2,5.2,.12,72), stdMat(0x12171d,.3,.7)); floor.position.y = floorY; scene.add(floor);
  const ringG = new THREE.Mesh(new THREE.TorusGeometry(4.95,.05,8,120), new THREE.MeshBasicMaterial({ color:0x2f7a43 })); ringG.rotation.x = Math.PI/2; ringG.position.y = floorY+.08; scene.add(ringG);
  const ringO = new THREE.Mesh(new THREE.TorusGeometry(3.9,.04,8,120), new THREE.MeshBasicMaterial({ color:0x8a4230 })); ringO.rotation.x = Math.PI/2; ringO.position.y = floorY+.08; scene.add(ringO);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.0,48), new THREE.MeshBasicMaterial({ color:0x0a0c0e })); shadow.rotation.x = -Math.PI/2; shadow.position.y = floorY+.07; scene.add(shadow);

  const shipRoot = V.shipRoot = new THREE.Group(); scene.add(shipRoot);
  V.hull = buildHull(); shipRoot.add(V.hull);
  V.dyn = new THREE.Group(); shipRoot.add(V.dyn);   // pylons, modules, markers: rebuilt on every change

  V.ready = true;
  resizeShip();

  // drag & drop a .glb main body
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
  const box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
  obj.position.sub(ctr);
  const wrap = new THREE.Group(); wrap.add(obj); wrap.scale.setScalar(6 / Math.max(size.x,size.y,size.z));
  V.shipRoot.add(wrap); V.hull = wrap;
  V.shipRoot.updateMatrixWorld(true);

  const found = [];
  obj.traverse(n => {
    const m = /^sock(?:et)?[_\- ]?p([123])[_\- ]?(\d+)/i.exec(n.name || ''); if(!m) return;
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion();
    n.getWorldPosition(wp); n.getWorldQuaternion(wq);
    V.shipRoot.worldToLocal(wp);
    const dir = new THREE.Vector3(0,0,1).applyQuaternion(wq);
    found.push({ size:+m[1], n:+m[2], pos:[wp.x,wp.y,wp.z], dir:[dir.x,dir.y,dir.z] });
  });
  if(found.length){
    // the model now defines the sockets: hand back everything that was installed
    for(const k of Object.keys(S.att)) S.cargo[S.att[k].id] = (S.cargo[S.att[k].id]||0)+1;
    S.att = {};
    found.sort((a,b) => b.size-a.size || a.n-b.n);
    BODY.sockets = found.map((f,i) => ({ id:'b'+i, size:f.size, pos:f.pos, dir:f.dir }));
    S.sel = 'b0'; S.focus = 'slots';
    if(name) BODY.name = name.split(/[\/]/).pop().replace(/\.(glb|gltf)$/i,'').replace(/[_-]+/g,' ').toUpperCase();
    const c = n => found.filter(f=>f.size===n).length;
    toast(`MODEL LOADED · ${found.length} SOCKETS (P3×${c(3)} P2×${c(2)} P1×${c(1)})`);
  }else{
    toast('MODEL LOADED · NO sock_p* NODES, KEEPING DEFAULT SOCKETS','info');
  }
  renderAll();
}

/* ---------- state -> scene ---------- */
function clearDyn(){
  for(const c of [...V.dyn.children]){
    V.dyn.remove(c);
    c.traverse(o => { o.geometry?.dispose(); (Array.isArray(o.material)?o.material:[o.material]).forEach(m => m?.dispose()); });
  }
  V.pickers = []; V.anchor = {}; V.spr = {}; V.modG = {}; V.flames = [];
}
function renderShip(){
  if(!V.ready) return;
  clearDyn();
  const withPv = PV && PV.to;
  const att = withPv ? PV.att : S.att;
  const disp = withPv ? layout(PV.att) : LY;
  V.disp = disp; V.att = att;

  const ghost = new Set(), rem = new Set(); let gstyle = 'good';
  if(PV){
    if(PV.to){ gstyle = PV.fits ? 'good' : 'bad'; disp.list.forEach(s => { if(s.id===PV.sid || s.id.startsWith(PV.sid+'.')) ghost.add(s.id); }); }
    else LY.list.forEach(s => { if(s.id===PV.sid || s.id.startsWith(PV.sid+'.')) rem.add(s.id); });
  }
  const styleOf = id => ghost.has(id) ? gstyle : rem.has(id) ? 'rem' : 'normal';
  const steel = stdMat(0x59616b,.5,.45), knob = stdMat(0x22272d,.5,.5);
  const pylMat = st => st==='normal' ? steel : stdMat(st==='good'?0x2f9e4d:st==='bad'?0xc23a3a:0x5a3030,.4,.4,{ emissive:st==='good'?0x2f9e4d:st==='bad'?0xc23a3a:0x5a3030, emissiveIntensity:.4 });

  for(const s of disp.list){
    const a = att[s.id], st = styleOf(s.id);
    const an = new THREE.Object3D(); an.position.copy(v3(s.pos)); V.dyn.add(an); V.anchor[s.id] = an;

    if(s.pylon){                                   // struts
      const mat = pylMat(st), r = PYL_R[s.size];
      s.segs.forEach(([p,q]) => V.dyn.add(strut(p,q,r,mat)));
      const base = new THREE.Mesh(new THREE.SphereGeometry(r*1.7,14,10), knob); base.position.copy(v3(s.pos)); V.dyn.add(base);
      if(s.joint){ const j = new THREE.Mesh(new THREE.SphereGeometry(r*1.5,14,10), knob); j.position.copy(v3(s.joint)); V.dyn.add(j); }
    }
    if(a && a.t==='mod'){                          // module
      const it = ITEM(a.id), mg = buildModule(it.kind, s.size, st);
      mg.position.copy(v3(s.pos)); V.dyn.add(mg); V.modG[s.id] = mg;
    }

    // socket marker: triangle / square / circle in the size colour.
    // Off while something is mounted on the socket (the part itself is the indicator);
    // it only comes back, wider than the part, to show selection / hover.
    const sel = S.sel===s.id, hov = S.hoverSlot===s.id;
    const occupied = !!a;
    if(!occupied || sel || hov){
      let col = SIZE[s.size].color, dashed = !a;
      if(ghost.has(s.id) && !occupied){ col = gstyle==='good' ? '#63e07a' : '#ff5a5a'; dashed = true; }
      else if(sel || hov){ col = '#ffffff'; }
      const sp = makeSprite(ringTexture(SIZE[s.size].shape, col, dashed));
      sp.position.copy(v3(s.pos)); sp.userData.base = SPR_SIZE[s.size] * (occupied ? 1.7 : 1);
      sp.scale.setScalar(sp.userData.base); V.dyn.add(sp); V.spr[s.id] = sp;
    }

    const pick = new THREE.Mesh(new THREE.SphereGeometry(SPR_SIZE[s.size]*.6,10,8), new THREE.MeshBasicMaterial({ visible:false }));
    pick.position.copy(v3(s.pos)); pick.userData.sid = s.id; V.dyn.add(pick); V.pickers.push(pick);
  }

  // tags
  const fill = (el, id) => {
    const s = id && disp.byId[id];
    if(!s){ el.style.display='none'; el.dataset.slot=''; return; }
    const at = att[id], it = at ? ITEM(at.id) : null;
    el.dataset.slot = id;
    el.innerHTML = `<small>${SIZE[s.size].label} SOCKET</small><b>${it ? it.name.toUpperCase() : 'EMPTY'}</b>`;
    el.style.display = 'block';
  };
  fill($('#tagSel'), S.sel);
  fill($('#tagHov'), S.hoverSlot && S.hoverSlot!==S.sel ? S.hoverSlot : null);
}

function placeTag(el){
  const id = el.dataset.slot; if(!id || el.style.display==='none') return;
  const an = V.anchor[id]; if(!an){ el.style.visibility='hidden'; return; }
  an.getWorldPosition(V.tmp); V.tmp.project(V.camera);
  if(V.tmp.z>1){ el.style.visibility='hidden'; return; }
  el.style.visibility='visible';
  el.style.left = ((V.tmp.x*.5+.5)*SHIP_W)+'px';
  el.style.top  = ((-V.tmp.y*.5+.5)*SHIP_H - 26)+'px';
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
  const popOf = id => (S.flash===id && flashT<1) ? 1 + (1-flashT)*.5 : 1;
  for(const id in V.spr){
    const sp = V.spr[id];
    sp.scale.setScalar(sp.userData.base * (S.sel===id ? 1 + Math.sin(t*5)*.1 : 1) * popOf(id));
  }
  for(const id in V.modG) V.modG[id].scale.setScalar(MOD_SCALE[V.disp.byId[id].size] * popOf(id));
  V.flames.forEach((f,i) => f.scale.set(1,.75+.25*Math.sin(t*38+i),1));
  placeTag($('#tagSel')); placeTag($('#tagHov'));
  V.renderer.render(V.scene, V.camera);
}

/* ---------- picking ---------- */
function pickSlot(e){
  if(!V.ready) return null;
  const rect = V.renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
  V.raycaster.setFromCamera(ndc, V.camera);
  const hits = V.raycaster.intersectObjects(V.pickers, false);
  return hits.length ? hits[0].object.userData.sid : null;
}
