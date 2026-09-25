/* =====================================================================
   CRAFTING MOCKUP — sockets / pylons / modules

   A MAIN BODY exposes sockets of three sizes:
     P1  red triangle    (smallest)
     P2  green square
     P3  blue circle     (largest)

   What a socket of size N accepts (same size only):
     - a MODULE of size N
     - a PYLON of input size N
         Extension  N > N            one output socket, same size
         Split      N > 2 x (N-1)    two smaller output sockets  (N >= 2)
   Pylon outputs are sockets too, so pylons can be chained.
   ===================================================================== */

const SIZE = {
  1: { n:1, label:'P1', name:'Small',  color:'#e5484d', shape:'tri'  },
  2: { n:2, label:'P2', name:'Medium', color:'#4fd06a', shape:'sq'   },
  3: { n:3, label:'P3', name:'Large',  color:'#3aa0ff', shape:'circ' },
};
const SIZE_ORDER = [3,2,1];

const KIND = {
  primary:   { cls:'pri', label:'Primary Weapons',   short:'Primary' },
  secondary: { cls:'sec', label:'Secondary Weapons', short:'Secondary' },
  engine:    { cls:'eng', label:'Engines',           short:'Engines' },
};
const TAB_ORDER = ['pylon','primary','secondary','engine'];
const TAB_LABEL = { pylon:'Pylons', primary:'Primary', secondary:'Secondary', engine:'Engines' };
const TAB_CLS   = { pylon:'pyl', primary:'pri', secondary:'sec', engine:'eng' };

// module rarity: lv 1..7, each with its colour
const RARITY = {
  1: { label:'LV1', color:'#9a6a3c' },   // brown
  2: { label:'LV2', color:'#a3a9b0' },   // grey
  3: { label:'LV3', color:'#4fcf5f' },   // green
  4: { label:'LV4', color:'#4cc4ff' },   // light blue
  5: { label:'LV5', color:'#ff8c1a' },   // orange
  6: { label:'LV6', color:'#ff3fc8' },   // fuchsia
  7: { label:'LV7', color:'#ffcf3a' },   // gold
};
const rarCol = it => RARITY[it?.lv]?.color || '';
const lvBadge = it => it?.lv ? `<span class="lv" style="--rc:${rarCol(it)}">${RARITY[it.lv].label}</span>` : '';

// kin/exp/nrg = damage types, eng = thrust, lv = rarity
const MODS = {
  // ---- primary weapons
  peashot:  { id:'peashot',  name:'Peashot',        kind:'primary',   size:1, lv:1, power:1, value:160,  kin:4 },
  flicker:  { id:'flicker',  name:'Flicker Beam',   kind:'primary',   size:1, lv:2, power:1, value:210,  nrg:6 },
  kb:       { id:'kb',       name:'K&B Gun',        kind:'primary',   size:2, lv:2, power:2, value:380,  kin:9 },
  scatter:  { id:'scatter',  name:'Ion Scatter',    kind:'primary',   size:2, lv:4, power:3, value:820,  kin:4, nrg:12 },
  pulse:    { id:'pulse',    name:'Pulse Lance',    kind:'primary',   size:2, lv:5, power:4, value:1150, nrg:22 },
  rail:     { id:'rail',     name:'Rail Driver',    kind:'primary',   size:3, lv:6, power:6, value:2300, kin:34 },
  halberd:  { id:'halberd',  name:'Halberd Cannon', kind:'primary',   size:3, lv:7, power:7, value:2900, kin:20, nrg:20 },
  // ---- secondary weapons
  dart:     { id:'dart',     name:'Dart Pod',       kind:'secondary', size:1, lv:3, power:2, value:300,  exp:40 },
  sho:      { id:'sho',      name:'SHO-Gun',        kind:'secondary', size:2, lv:3, power:3, value:640,  exp:105 },
  seeker:   { id:'seeker',   name:'Seeker Pod',     kind:'secondary', size:2, lv:5, power:5, value:1400, exp:160 },
  mortar:   { id:'mortar',   name:'Arc Mortar',     kind:'secondary', size:3, lv:6, power:7, value:2100, exp:90, nrg:60 },
  siege:    { id:'siege',    name:'Siege Launcher', kind:'secondary', size:3, lv:7, power:9, value:3400, exp:300 },
  // ---- engines
  trickle:  { id:'trickle',  name:'Trickle Jet',    kind:'engine',    size:1, lv:1, power:1, value:140,  eng:14 },
  speeder:  { id:'speeder',  name:'Speeder',        kind:'engine',    size:2, lv:2, power:1, value:352,  eng:41 },
  ion:      { id:'ion',      name:'Ion Drive',      kind:'engine',    size:2, lv:4, power:2, value:900,  eng:68 },
  bulwark:  { id:'bulwark',  name:'Bulwark Drive',  kind:'engine',    size:2, lv:3, power:2, value:760,  eng:30, hull:1500 },
  aegis:    { id:'aegis',    name:'Aegis Thruster', kind:'engine',    size:2, lv:4, power:2, value:820,  eng:35, shield:2000 },
  behemoth: { id:'behemoth', name:'Behemoth Drive', kind:'engine',    size:3, lv:5, power:4, value:2600, eng:120 },
  bastion:  { id:'bastion',  name:'Bastion Drive',  kind:'engine',    size:3, lv:6, power:4, value:2800, eng:70, hull:4000, shield:3000 },
};
// pylons: `size` is the input socket size. Pylons are unlimited: no cargo quantity
const PYLONS = {
  ext1:   { id:'ext1',   name:'Extension P1',    type:'ext',   size:1, value:120 },
  ext2:   { id:'ext2',   name:'Extension P2',    type:'ext',   size:2, value:220 },
  ext3:   { id:'ext3',   name:'Extension P3',    type:'ext',   size:3, value:380 },
  split2: { id:'split2', name:'Split P2 › 2×P1', type:'split', size:2, value:420 },
  split3: { id:'split3', name:'Split P3 › 2×P2', type:'split', size:3, value:760 },
};
const ITEMS = { ...PYLONS, ...MODS };
const ITEM_ORDER = Object.keys(ITEMS);
const isPylon = id => !!PYLONS[id];
const outputsOf = P => P.type==='ext' ? [P.size] : [P.size-1, P.size-1];

// MAIN BODIES. Each one defines its sockets (position + outward direction, model space),
// its power budget, its base stats and a 3D look.
// Rules: no sockets on the rear of the hull; sockets keep clear of each other in front view.
// A .glb dropped on the scene becomes a new body built from its sock_p<size>_<n> nodes.
const BODIES = {
  zephyros: {
    id:'zephyros', name:'ZEPHYROS', tag:'MIXED', maxPower:26, base:{ value:1900, hull:22000, shield:14000 },
    cam:13.6, plat:1,
    look:{ r:[1.5,1.1,2.9], color:0xb98a3e },
    sockets:[
      { id:'b0', size:3, pos:[-1.5,-0.35, 0.6], dir:[-1,-.12, .1] },
      { id:'b1', size:3, pos:[ 1.5,-0.35, 0.6], dir:[ 1,-.12, .1] },
      { id:'b2', size:2, pos:[-1.05, 0.85, 0.1], dir:[-.55, 1, .1] },
      { id:'b3', size:2, pos:[ 1.05, 0.85, 0.1], dir:[ .55, 1, .1] },
      { id:'b4', size:2, pos:[ 0.0, 1.15, 0.2], dir:[0, 1, .1] },
      { id:'b5', size:1, pos:[-0.4,-0.55, 2.3], dir:[-.3,-.2, 1] },
      { id:'b6', size:1, pos:[ 0.4,-0.55, 2.3], dir:[ .3,-.2, 1] },
      { id:'b7', size:1, pos:[ 0.0,-1.25, 0.4], dir:[0,-1, .2] },
    ],
  },
  // light scout: four small sockets only
  needle: {
    id:'needle', name:'NEEDLE', tag:'LIGHT', maxPower:12, base:{ value:800, hull:9000, shield:6000 },
    cam:8.6, plat:.8,
    look:{ r:[.8,.6,2.6], color:0x8fa6b8 },
    sockets:[
      { id:'b0', size:1, pos:[-0.85, 0.0, 0.5], dir:[-1, 0, .15] },
      { id:'b1', size:1, pos:[ 0.85, 0.0, 0.5], dir:[ 1, 0, .15] },
      { id:'b2', size:1, pos:[ 0.0, 0.65, 0.8], dir:[0, 1, .1] },
      { id:'b3', size:1, pos:[ 0.0,-0.65, 0.8], dir:[0,-1, .1] },
    ],
  },
  // heavy hauler: six large sockets
  colossus: {
    id:'colossus', name:'COLOSSUS', tag:'HEAVY', maxPower:40, base:{ value:4200, hull:42000, shield:30000 },
    cam:16.5, plat:1.3,
    look:{ r:[2.3,1.7,3.6], color:0x8a4a3a },
    sockets:[
      { id:'b0', size:3, pos:[-2.35, 0.0, 0.4], dir:[-1, 0, .1] },
      { id:'b1', size:3, pos:[ 2.35, 0.0, 0.4], dir:[ 1, 0, .1] },
      { id:'b2', size:3, pos:[-1.4, 1.3, 0.3], dir:[-.6, 1, .1] },
      { id:'b3', size:3, pos:[ 1.4, 1.3, 0.3], dir:[ .6, 1, .1] },
      { id:'b4', size:3, pos:[-1.4,-1.3, 0.3], dir:[-.6,-1, .1] },
      { id:'b5', size:3, pos:[ 1.4,-1.3, 0.3], dir:[ .6,-1, .1] },
    ],
  },
  // mixed gunship: one big dorsal socket, two medium flanks, two small at the nose
  kestrel: {
    id:'kestrel', name:'KESTREL', tag:'MIXED', maxPower:20, base:{ value:1500, hull:15000, shield:12000 },
    cam:13.8, plat:.95,
    look:{ r:[1.3,.9,2.6], color:0x6c8a62 },
    sockets:[
      { id:'b0', size:3, pos:[ 0.0, 0.95, 0.3], dir:[0, 1, .1] },
      { id:'b1', size:2, pos:[-1.3,-0.1, 0.5], dir:[-1, 0, .1] },
      { id:'b2', size:2, pos:[ 1.3,-0.1, 0.5], dir:[ 1, 0, .1] },
      { id:'b3', size:1, pos:[-0.4,-0.5, 2.0], dir:[-.3,-.2, 1] },
      { id:'b4', size:1, pos:[ 0.4,-0.5, 2.0], dir:[ .3,-.2, 1] },
    ],
  },
};
const BODY_LIST = ['zephyros','needle','colossus','kestrel'];
let BODY = BODIES.zephyros;
const M = id => ({ t:'mod', id }), P = id => ({ t:'pyl', id });

const S = {
  // socket id -> attachment. child sockets are '<parent>.<i>'
  att: {
    b0:P('split3'), 'b0.0':M('kb'), 'b0.1':M('kb'),
    b1:P('ext3'),
    b2:M('speeder'), b3:M('speeder'),
    b4:P('split2'), 'b4.0':M('trickle'),
    b5:M('dart'),
  },
  builds: {},            // saved loadout of every body that is not the active one
  cargo: Object.fromEntries(Object.keys(MODS).map(id => [id,16])),   // modules only (pylons are unlimited)
  sel: 'b0',
  tab: 'primary',
  focus: 'slots',        // 'slots' | 'cargo' | 'body'
  picker: false, pickIdx: 0,
  cargoIdx: 0,
  hoverCargo: null, hoverSlot: null, hoverRemove: null,
  inputPref: 'gamepad',  // 'gamepad' | 'keyboard' | 'auto'
  device: 'gamepad',
  flash: null, flashT: 0,
  scale: 1,
  rot: { yaw:.75, pitch:.34, d:13.2 },
};
const homeRot = () => ({ yaw:.75, pitch:.34, d:BODY.cam });

/* =====================================================================
   HELPERS
   ===================================================================== */
const $ = s => document.querySelector(s);
const fmt = n => Math.round(n).toLocaleString('en-US');
const sgn = n => (n>0?'+':n<0?'−':'') + fmt(Math.abs(n));
const mv = (m,k) => (m && m[k]) || 0;
const dev = () => S.inputPref==='auto' ? S.device : S.inputPref;
const ITEM = id => ITEMS[id];

const I = {
  kin:   '<path d="M2 3h12L8 14z"/>',
  exp:   '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2.2" fill="none"/>',
  nrg:   '<path d="M9.5 1L3 9h4l-1 6 7-8.5H9z"/>',
  eng:   '<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2" /><path d="M8 2v3M8 11v3M2 8h3M11 8h3" stroke="currentColor" stroke-width="1.4"/>',
  hull:  '<path d="M8 1l6 3.5v7L8 15l-6-3.5v-7z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 6l3 2 3-2M8 8v4" stroke="currentColor" stroke-width="1.2" fill="none"/>',
  shield:'<path d="M8 1l6 2v5c0 3-3 5-6 7-3-2-6-4-6-7V3z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  value: '<path d="M8 1l7 7-7 7-7-7z"/>',
  power: '<rect x="4" y="4" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 1v3M10 1v3M6 12v3M10 12v3M1 6h3M1 10h3M12 6h3M12 10h3" stroke="currentColor" stroke-width="1.3"/>',
  primary:   '<path d="M8 1l3 4v9H5V5z" fill="currentColor"/><path d="M3 15h10" stroke="currentColor" stroke-width="1.5"/>',
  secondary: '<circle cx="8" cy="8" r="3.4" fill="currentColor"/><path d="M8 1v2.6M8 12.4V15M1 8h2.6M12.4 8H15M3 3l1.8 1.8M11.2 11.2L13 13M13 3l-1.8 1.8M4.8 11.2L3 13" stroke="currentColor" stroke-width="1.6"/>',
  engine:    '<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.8" fill="currentColor"/><path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke="currentColor" stroke-width="1.4"/>',
  pylon:     '<path d="M8 15V7M8 7L3 2M8 7l5-5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="7" r="1.8" fill="currentColor"/>',
  sockets:   '<path d="M8 2l5 9H3zM2 14h5M9 14h5" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  x:     '<path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="2.4" fill="none"/>',
};
const ico = (n,cls='') => `<svg class="${cls}" viewBox="0 0 16 16" fill="currentColor">${I[n]}</svg>`;

// socket shape glyph: triangle / square / circle in the size colour
function sg(n, px=14, mode='solid'){
  const { color, shape } = SIZE[n];
  const body = shape==='tri' ? '<path d="M8 2L14.5 13.5H1.5Z"/>' : shape==='sq' ? '<rect x="2.5" y="2.5" width="11" height="11"/>' : '<circle cx="8" cy="8" r="6"/>';
  return `<svg class="sg" width="${px}" height="${px}" viewBox="0 0 16 16" fill="${mode==='solid'?color:'none'}" stroke="${color}" stroke-width="1.8"${mode==='dash'?' stroke-dasharray="3 2"':''}>${body}</svg>`;
}
const outGlyphs = p => `<span class="outs">${outputsOf(p).map(n=>sg(n,13)).join('')}</span>`;

const STAT_META = {
  power:  { label:'Power cost',    icon:'power',  better:'low' },
  kin:    { label:'Kinetic dmg',   icon:'kin',    better:'high' },
  exp:    { label:'Explosive dmg', icon:'exp',    better:'high' },
  nrg:    { label:'Energy dmg',    icon:'nrg',    better:'high' },
  eng:    { label:'Engine thrust', icon:'eng',    better:'high' },
  hull:   { label:'Hull',          icon:'hull',   better:'high' },
  shield: { label:'Shield',        icon:'shield', better:'high' },
  value:  { label:'Value',         icon:'value',  better:'neutral' },
};
function dcls(k,d){
  if(!d) return 'nt';
  const b = STAT_META[k]?.better;
  if(b==='neutral') return 'nt';
  if(b==='low') return d>0 ? 'wn' : 'up';
  return d>0 ? 'up' : 'dn';
}

/* =====================================================================
   SOCKET TREE
   ===================================================================== */
const vadd = (a,b) => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const vmul = (a,k) => [a[0]*k,a[1]*k,a[2]*k];
const vlen = a => Math.hypot(a[0],a[1],a[2]);
const vnorm = a => { const l = vlen(a)||1; return [a[0]/l,a[1]/l,a[2]/l]; };
const vcross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];

const EXT_LEN = { 1:.95, 2:1.5, 3:2.2 };
const STEM    = { 2:1.0, 3:1.5 };
const SPREAD  = { 2:.75, 3:1.1 };

// Seen from the front (looking along +Z) no two module positions may line up:
// a weapon sitting behind another one would shoot it. Children are pushed sideways
// in the XY plane until they clear every other socket that could hold a module.
const CLEAR = { 1:.3, 2:.45, 3:.66 };
function stagger(pos, size, placed, att, side){
  const p = pos.slice();
  for(let it=0; it<30; it++){
    let moved = false;
    for(const o of placed){
      if(att[o.id]?.t==='pyl') continue;                  // a pylon holds no module
      const dx = p[0]-o.pos[0], dy = p[1]-o.pos[1], dist = Math.hypot(dx,dy), min = CLEAR[size]+CLEAR[o.size]+.12;
      if(dist >= min) continue;
      let ux = dx, uy = dy;
      if(dist < 1e-3){ ux = side[0]; uy = side[1]; if(Math.hypot(ux,uy) < 1e-3){ ux = 1; uy = 0; } }
      const l = Math.hypot(ux,uy) || 1, push = min - dist;
      p[0] += ux/l*push; p[1] += uy/l*push; moved = true;
    }
    if(!moved) break;
  }
  return p;
}
// direction a split fans out in: vertical for horizontal pylons (so the two children are
// staggered in the front view), horizontal for pylons growing up/down
const sideOf = d => Math.abs(d[1])>.85 ? [1,0,0] : vnorm([-d[1]*d[0], 1-d[1]*d[1], -d[1]*d[2]]);

// raw geometry of a pylon plugged into `sock`: the sockets it exposes (before staggering)
function spawn(sock, p){
  const d = vnorm(sock.dir), o = sock.pos, side = sideOf(d);
  if(p.type==='ext') return { joint:null, kids:[{ size:p.size, pos:vadd(o, vmul(d, EXT_LEN[p.size])), dir:d, side }] };
  const f = vadd(o, vmul(d, STEM[p.size])), w = SPREAD[p.size];
  const mk = k => ({ size:p.size-1, pos:vadd(vadd(f, vmul(d, w*.9)), vmul(side, k*w)), dir:vnorm(vadd(d, vmul(side, k*.55))), side });
  return { joint:f, kids:[mk(-1), mk(1)] };
}

// flatten body sockets + everything the pylons expose (depth-first)
function layout(att){
  const list = [], byId = {}, count = {1:0,2:0,3:0};
  const roots = BODY.sockets.map(b => { count[b.size]++; return { id:b.id, size:b.size, pos:b.pos, dir:b.dir, depth:0, parent:null, idx:count[b.size] }; });
  const placed = [...roots];
  const add = s => {
    list.push(s); byId[s.id] = s;
    const a = att[s.id];
    if(a && a.t==='pyl' && PYLONS[a.id] && PYLONS[a.id].size===s.size){
      const p = PYLONS[a.id], g = spawn(s,p);
      s.pylon = p; s.joint = g.joint;
      s.kids = g.kids.map((k,i) => {
        const kid = { id:`${s.id}.${i}`, size:k.size, pos:k.pos, dir:k.dir, depth:s.depth+1, parent:s.id, idx:i+1 };
        kid.pos = stagger(kid.pos, kid.size, placed, att, k.side);
        placed.push(kid); return kid;
      });
      s.segs = p.type==='ext' ? [[s.pos, s.kids[0].pos]] : [[s.pos,g.joint],[g.joint,s.kids[0].pos],[g.joint,s.kids[1].pos]];
      s.kids.forEach(add);
    }
  };
  roots.forEach(add);
  return { list, byId };
}
const inTree = (id, root) => id===root || id.startsWith(root+'.');
const sockName = s => `${SIZE[s.size].label} socket`;

// display order of the left panel: sections P3, P2, P1 (body sockets), each with its subtree
function navOrder(L){
  const out = [];
  for(const n of SIZE_ORDER) for(const r of L.list.filter(s=>!s.parent && s.size===n)) L.list.forEach(s => { if(inTree(s.id,r.id)) out.push(s.id); });
  return out;
}

/* ---------- loadout maths ---------- */
function calc(att){
  const L = layout(att);
  const t = { power:0, value:BODY.base.value, eng:0, hull:BODY.base.hull, shield:BODY.base.shield,
              pri:{kin:0,exp:0,nrg:0}, sec:{kin:0,exp:0,nrg:0},
              sock:{1:{free:0,total:0},2:{free:0,total:0},3:{free:0,total:0}} };
  for(const s of L.list){
    t.sock[s.size].total++;
    const a = att[s.id];
    if(!a){ t.sock[s.size].free++; continue; }
    const it = ITEM(a.id); t.value += it.value;
    if(a.t!=='mod') continue;
    t.power += it.power; t.eng += mv(it,'eng'); t.hull += mv(it,'hull'); t.shield += mv(it,'shield');
    const tgt = it.kind==='primary' ? t.pri : it.kind==='secondary' ? t.sec : null;
    if(tgt){ tgt.kin+=mv(it,'kin'); tgt.exp+=mv(it,'exp'); tgt.nrg+=mv(it,'nrg'); }
  }
  return t;
}
// put `item` (or nothing) on a socket; whatever hung there goes back to cargo
function attachTo(att, cargo, sid, item){
  const A = { ...att }, C = { ...cargo }, ret = [];
  for(const k of Object.keys(A)) if(inTree(k,sid)){ ret.push(A[k].id); if(!isPylon(A[k].id)) C[A[k].id] = (C[A[k].id]||0)+1; delete A[k]; }
  if(item){ A[sid] = { t:isPylon(item)?'pyl':'mod', id:item }; if(!isPylon(item)) C[item] = (C[item]||0)-1; }
  return { att:A, cargo:C, ret };
}
function makePreview(sid, to){
  const r = attachTo(S.att, S.cargo, sid, to), t1 = calc(r.att);
  return { sid, to, att:r.att, ret:r.ret, t1, fits:t1.power <= BODY.maxPower };
}

let LY = layout(S.att), T0 = calc(S.att), PV = null;

const selSock = () => LY.byId[S.sel];
function cargoItems(size = selSock().size, tab = S.tab){
  return ITEM_ORDER.filter(id => (isPylon(id) || (S.cargo[id]||0)>0) && ITEMS[id].size===size &&
    (tab==='pylon' ? isPylon(id) : (!isPylon(id) && ITEMS[id].kind===tab))).map(id => ITEMS[id]);
}
const cargoList = () => cargoItems();
function ensureTab(){
  if(cargoItems().length) return;
  const t = TAB_ORDER.find(k => cargoItems(selSock().size, k).length);
  if(t) S.tab = t;
}
function computePreview(){
  if(S.hoverRemove && LY.byId[S.hoverRemove] && S.att[S.hoverRemove]) return makePreview(S.hoverRemove, null);
  const list = cargoList();
  const id = S.hoverCargo ?? (S.focus==='cargo' ? list[S.cargoIdx]?.id : null);
  return id ? makePreview(S.sel, id) : null;
}
const wouldFit = (sid, id) => calc(attachTo(S.att, S.cargo, sid, id).att).power <= BODY.maxPower;

/* =====================================================================
   GLYPHS (gamepad / keyboard)
   ===================================================================== */
const dpadSvg = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M6 1h4v5h5v4h-5v5H6v-5H1V6h5z"/></svg>';
function glyph(n){
  if(dev()==='gamepad'){
    switch(n){
      case 'A': return '<i class="gp a">A</i>';
      case 'B': return '<i class="gp b">B</i>';
      case 'X': return '<i class="gp x">X</i>';
      case 'Y': return '<i class="gp y">Y</i>';
      case 'dpad': return `<i class="gp">${dpadSvg}</i>`;
      case 'LT': return '<i class="gp pill">LT</i>';
      case 'RT': return '<i class="gp pill">RT</i>';
      case 'LB': return '<i class="gp pill">LB</i>';
      case 'RB': return '<i class="gp pill">RB</i>';
      case 'RS': return '<i class="gp rs">R</i>';
      case 'START': return '<i class="gp pill">≡</i>';
    }
  }else{
    const k = { A:'Enter', B:'Bksp', X:'Del', Y:'R', dpad:'↑ ↓', LT:'⇧ Tab', RT:'Tab', LB:'Q', RB:'E', RS:'Drag', START:'Esc' }[n];
    return `<i class="key">${k}</i>`;
  }
}

/* =====================================================================
   RENDER
   ===================================================================== */
function renderTop(){
  const segs = (n,on,c)=>Array.from({length:n},(_,i)=>`<i class="${i<on?'on '+c:''}"></i>`).join('');
  $('#top').innerHTML = `
    <div class="hud">
      <div class="emblem"><svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#9aa3ab" stroke-width="2"><circle cx="22" cy="22" r="16"/><path d="M22 8v28M10 16l12 6 12-6M10 28l12-6 12 6"/></svg></div>
      <div class="hud-bars">
        <div class="hud-bar"><b>21,980</b><div class="segs">${segs(22,21,'g')}</div></div>
        <div class="hud-bar"><b>14,000</b><div class="segs">${segs(22,22,'b')}</div></div>
        <div class="hud-speed">0 m/s</div>
      </div>
      <div class="hud-lv">30</div>
    </div>
    <div class="station-wrap"><div class="station">MARIANAN STATION</div></div>
    <div class="tabs">
      ${glyph('LB')}
      <span class="tab">MAINTENANCE</span><span class="tab">RAIDER LOG</span><span class="tab">INVENTORY</span><span class="tab">TRADING</span><span class="tab act">CRAFTING</span>
      ${glyph('RB')}
    </div>
    <div class="credits">121,834 CR</div>`;
}

function leftRow(s, up=1){
  const a = S.att[s.id], it = a ? ITEM(a.id) : null, isSel = S.sel===s.id;
  const kcls = !it ? 'free' : a.t==='pyl' ? 'pyl' : KIND[it.kind].cls;
  const cls = ['slot', kcls, isSel?'sel':'', isSel&&S.focus==='slots'?'focus':'', S.hoverSlot===s.id?'hov':'', S.flash===s.id?'flash':'',
               s.depth?'child':'',
               PV&&PV.sid===s.id ? (PV.to?'pv-add':'pv-rem') : ''].join(' ');
  const icon = !it ? sg(s.size,20,'dash') : ico(a.t==='pyl' ? 'pylon' : it.kind);
  const name = it ? it.name : `Empty ${SIZE[s.size].label} socket`;
  const right = !it ? '' : a.t==='mod'
    ? `<div class="pwr">${ico('power')}${it.power}</div>`
    : outGlyphs(it);
  const rc = it && a.t==='mod' ? rarCol(it) : '';
  return `<div class="${cls}${rc?' rar':''}" data-slot="${s.id}" style="--d:${s.depth};--up:${up}${rc?`;--rc:${rc}`:''}">
    <div class="ic">${icon}</div>
    <div class="nm">${name}</div>
    ${it && a.t==='mod' ? lvBadge(it) : ''}
    ${it && a.t==='mod' ? sg(s.size,12) : ''}${right}
    ${isSel&&S.focus==='slots'?`<span class="kh">${glyph('A')}</span>`:''}
    ${it?`<button class="unq" data-unq="${s.id}" title="Unequip">${ico('x')}</button>`:''}
  </div>`;
}

function renderLeft(){
  const keep = $('#left .lp-body')?.scrollTop || 0;
  const pt = PV ? PV.t1 : T0;
  const pcls = pt.power>BODY.maxPower ? 'bad' : pt.power>T0.power ? 'warn' : '';
  let html = `
    <div class="lp-head bodysel ${S.focus==='body'?'focus':''}">
      <div class="ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></svg></div>
      <div class="nm"><button class="bsb" data-bstep="-1" title="Previous main body">‹</button><span class="bname" data-bpick>${BODY.name}</span><button class="bsb" data-bstep="1" title="Next main body">›</button><small class="btag">${BODY.tag}</small></div>
      <div class="pw"><svg viewBox="0 0 16 16" fill="currentColor">${I.power}</svg><span class="n ${pcls}">${pt.power}</span><span>/ ${BODY.maxPower}</span></div>
    </div>
    <div class="lp-body">`;
  for(const n of SIZE_ORDER){
    const roots = LY.list.filter(s=>!s.parent && s.size===n);
    if(!roots.length) continue;
    html += `<div class="sec-title"><span class="st-l">${sg(n,16)}${SIZE[n].label} · ${SIZE[n].name.toUpperCase()} SOCKETS</span><span>${roots.length} ON BODY</span></div>`;
    // rows between a child and its pylon: the tree line runs all the way up to the pylon row
    const rows = LY.list.filter(s => roots.some(r => inTree(s.id,r.id)));
    const at = Object.fromEntries(rows.map((s,i) => [s.id,i]));
    for(const s of rows) html += leftRow(s, s.parent ? at[s.id]-at[s.parent] : 1);
  }
  html += `</div>`;
  $('#left').innerHTML = html;
  const b = $('#left .lp-body'); if(b) b.scrollTop = keep;
}

function skCell(n, t, nn){
  const d = nn.sock[n].free - t.sock[n].free;
  return `<div class="wc sk">${sg(n,20)}<span class="v">${nn.sock[n].free}<i>/${nn.sock[n].total}</i></span>${d?`<span class="d ${d>0?'up':'nt'}">${sgn(d)}</span>`:''}</div>`;
}
function statCell(icon,label,val,delta,k){
  const c = dcls(k,delta);
  return `<div class="st"><div class="si">${ico(icon)}</div><div><div class="sl">${label}</div><div class="sv ${delta?c:''}">${fmt(val)}</div></div>${delta?`<div class="sd ${c}">${sgn(delta)}</div>`:''}</div>`;
}
function wcell(cls,icon,val,delta){
  const c = delta ? (delta>0?'up':'dn') : '';
  return `<div class="wc ${cls}">${ico(icon)}<span class="v ${val?'':'zero'} ${c}">${val}</span>${delta?`<span class="d ${c}">${sgn(delta)}</span>`:''}</div>`;
}

function renderRight(){
  const keep = $('.cg-list')?.scrollTop || 0;
  const t = T0, n = PV ? PV.t1 : T0;
  const over = n.power > BODY.maxPower;

  let bar='';
  for(let i=0;i<BODY.maxPower;i++){
    let c='';
    if(over) c='over';
    else if(n.power>=t.power) c = i<t.power ? 'on' : i<n.power ? 'add' : '';
    else c = i<n.power ? 'on' : i<t.power ? 'rem' : '';
    bar += `<i class="${c}"></i>`;
  }
  const pd = n.power - t.power;
  const wrow = (label,a,b)=>`<div class="wrow"><div class="rl">${label}</div>
      ${wcell('k','kin',b.kin,b.kin-a.kin)}${wcell('e','exp',b.exp,b.exp-a.exp)}${wcell('n','nrg',b.nrg,b.nrg-a.nrg)}</div>`;

  const ov = `<div class="ov">
    <div class="head">SPACESHIP OVERVIEW<small>${PV?'PREVIEW':'CURRENT'}</small></div>
    <div class="ov-body">
      <div class="pw-row">
        <div class="lbl">POWER<b class="${over?'bad':''}">${n.power} / ${BODY.maxPower}</b></div>
        <div class="pbar">${bar}</div>
        ${pd?`<div class="sd ${over?'dn':dcls('power',pd)}" style="font-size:16px;font-weight:700;padding:1px 7px;border-radius:2px">${sgn(pd)}</div>`:''}
      </div>
      <div class="stats">
        ${statCell('value','VALUE',n.value,n.value-t.value,'value')}
        ${statCell('eng','ENGINE',n.eng,n.eng-t.eng,'eng')}
        ${statCell('hull','HULL',n.hull,n.hull-t.hull,'hull')}
        ${statCell('shield','SHIELD',n.shield,n.shield-t.shield,'shield')}
      </div>
      <div class="wrows">
        ${wrow('PRIMARY',t.pri,n.pri)}
        ${wrow('SECONDARY',t.sec,n.sec)}
        <div class="wrow"><div class="rl">FREE SOCKETS</div>${skCell(3,t,n)}${skCell(2,t,n)}${skCell(1,t,n)}</div>
      </div>
    </div></div>`;

  // ---- cargo (filtered by the size of the selected socket)
  ensureTab();
  const sock = selSock(), list = cargoList();
  if(S.cargoIdx>=list.length) S.cargoIdx = Math.max(0,list.length-1);
  const curA = S.att[S.sel], curIt = curA ? ITEM(curA.id) : null, curM = curA && curA.t==='mod' ? curIt : null;
  const cats = TAB_ORDER.map(k=>{
    const cnt = k==='pylon' ? '∞' : cargoItems(sock.size,k).reduce((a,m)=>a+S.cargo[m.id],0);
    return `<div class="cat ${TAB_CLS[k]} ${k===S.tab?'act':''}" data-tab="${k}">${TAB_LABEL[k].toUpperCase()}<i>${cnt}</i></div>`;
  }).join('');
  const rows = list.map((m,i)=>{
    const pyl = isPylon(m.id);
    const fits = pyl ? true : wouldFit(S.sel,m.id);
    const focus = S.focus==='cargo' && i===S.cargoIdx, hov = S.hoverCargo===m.id;
    let chips;
    if(pyl){
      chips = `<span class="chip">${m.type==='ext'?'Extension':'Split'} ›</span>${outGlyphs(m)}<span class="chip">${ico('value')}${fmt(m.value)}</span>`;
    }else{
      chips = ['kin','exp','nrg','eng','hull','shield'].filter(k=>mv(m,k)).map(k=>{
        const d = curM ? mv(m,k)-mv(curM,k) : 0;
        return `<span class="chip">${ico(STAT_META[k].icon)}${fmt(mv(m,k))}${curM&&d?` <em class="${dcls(k,d)}">${sgn(d)}</em>`:''}</span>`;
      }).join('');
      const pd2 = curM ? m.power-curM.power : 0;
      chips += `<span class="chip">${ico('power')}${m.power}${curM&&pd2?` <em class="${dcls('power',pd2)}">${sgn(pd2)}</em>`:''}</span>`;
    }
    const label = !fits ? 'NO POWER' : (curIt?'REPLACE':'EQUIP');
    return `<div class="cg-row ${pyl?'pyl':KIND[m.kind].cls+' rar'} ${focus?'sel':''} ${hov?'hov':''} ${fits?'':'nopow'}" data-item="${m.id}" data-i="${i}"${pyl?'':` style="--rc:${rarCol(m)}"`}>
      <div class="ic">${ico(pyl?'pylon':m.kind)}</div>
      <div class="mid"><div class="nm">${pyl?'':lvBadge(m)}${m.name}<small>${pyl?'∞':'×'+S.cargo[m.id]}</small></div><div class="chips">${chips}</div></div>
      <div class="act">${focus||hov?label:''}${focus?glyph('A'):''}</div>
    </div>`;
  }).join('') || `<div class="cg-empty">NO ${TAB_LABEL[S.tab].toUpperCase()} FOR A ${SIZE[sock.size].label} SOCKET IN CARGO<br><span style="font-size:15px">Try another tab, or craft / loot new parts</span></div>`;

  const cg = `<div class="cg">
    <div class="head">CARGO<small>${Object.keys(MODS).reduce((a,id)=>a+(S.cargo[id]||0),0)} MODULES · PYLONS ∞</small></div>
    <div class="target"><span>TARGET · ${sg(sock.size,14)} <b>${SIZE[sock.size].label} SOCKET</b> · ${SIZE[sock.size].name.toUpperCase()}</span><span>${curIt?curIt.name.toUpperCase():'EMPTY'}</span></div>
    <div class="cats">${glyph('LT')}${cats}${glyph('RT')}</div>
    <div class="cg-list">${rows}</div>
  </div>`;

  $('#right').innerHTML = ov + cg;
  const l = $('.cg-list'); if(l) l.scrollTop = keep;
}

/* ---------- compare card ---------- */
const CARD_KEYS = ['power','kin','exp','nrg','eng','hull','shield','value'];
function totalsOf(t){ return { power:t.power, kin:t.pri.kin+t.sec.kin, exp:t.pri.exp+t.sec.exp, nrg:t.pri.nrg+t.sec.nrg, eng:t.eng, hull:t.hull, shield:t.shield, value:t.value }; }

function renderCard(){
  const sock = selSock(), curA = S.att[S.sel], cur = curA ? ITEM(curA.id) : null;
  const head = title => `<div class="ch"><span class="tg">${sg(sock.size,14)} ${SIZE[sock.size].label} SOCKET</span>${title}</div>`;
  let html;
  if(!PV){
    if(!cur){
      const n = cargoList().length;
      html = head('EMPTY SOCKET') + `<div class="emptyc">This ${SIZE[sock.size].name.toLowerCase()} socket is free.<br>${n?`${glyph('A')} to browse the <b style="color:#fff">${n}</b> compatible ${TAB_LABEL[S.tab].toLowerCase()} in your cargo and compare them with your current build.`:`Nothing in the <b style="color:#fff">${TAB_LABEL[S.tab]}</b> tab fits a ${SIZE[sock.size].label} socket — try another tab (${glyph('LT')}${glyph('RT')}).`}</div>`;
    }else if(curA.t==='pyl'){
      const kids = (sock.kids||[]).map(k => `<span class="kidchip">${sg(k.size,13)} ${S.att[k.id]?ITEM(S.att[k.id].id).name:'<i>free</i>'}</span>`).join('');
      html = head(cur.name.toUpperCase()) + `<div class="emptyc">${cur.type==='ext'?'Extension':'Split'} pylon · ${SIZE[cur.size].label} in → ${outputsOf(cur).map(n=>SIZE[n].label).join(' + ')} out<div class="kids">${kids}</div></div>
        <div class="cf"><span>Select a cargo item to swap this pylon (attached parts return to cargo)</span><span>${glyph('A')}</span></div>`;
    }else{
      const rows = CARD_KEYS.filter(k=>mv(cur,k)).map(k=>`<tr><td>${ico(STAT_META[k].icon)}${STAT_META[k].label}</td><td>${fmt(mv(cur,k))}</td></tr>`).join('');
      html = head(`${lvBadge(cur)}${cur.name.toUpperCase()}`) + `<table><tr><th>STAT</th><th>INSTALLED</th></tr>${rows}</table>
        <div class="cf"><span>Select a cargo item to compare it against <b>${cur.name}</b></span><span>${glyph('A')}</span></div>`;
    }
  }else{
    const to = PV.to ? ITEM(PV.to) : null;
    const pylonCase = isPylon(PV.to||'') || (curA && curA.t==='pyl');
    const over = PV.t1.power - BODY.maxPower;
    const title = to
      ? `<span class="old">${cur?lvBadge(cur)+cur.name.toUpperCase():'EMPTY'}</span><span class="arrow">➜</span>${lvBadge(to)}${to.name.toUpperCase()}`
      : `REMOVE <span class="old">${lvBadge(cur)}${cur.name.toUpperCase()}</span>`;
    let table = '';
    if(!pylonCase){
      const keys = CARD_KEYS.filter(k=>mv(cur,k)||mv(to,k));
      table = `<table><tr><th>STAT</th><th>${cur?'INSTALLED':''}</th><th>${to?'NEW':''}</th><th>Δ</th></tr>` + keys.map(k=>{
        const o = mv(cur,k), nn = mv(to,k), d = nn-o;
        return `<tr><td>${ico(STAT_META[k].icon)}${STAT_META[k].label}</td><td class="o">${cur?fmt(o):'—'}</td><td>${to?fmt(nn):'—'}</td><td class="dl ${d?dcls(k,d):'nt'}">${d?sgn(d):'='}</td></tr>`;
      }).join('') + `</table>`;
    }else{
      const a = totalsOf(T0), b = totalsOf(PV.t1);
      let rows = '';
      for(const n of SIZE_ORDER){
        const d = PV.t1.sock[n].free - T0.sock[n].free;
        if(d) rows += `<tr><td>${sg(n,14)}Free ${SIZE[n].label} sockets</td><td class="o">${T0.sock[n].free}</td><td>${PV.t1.sock[n].free}</td><td class="dl ${d>0?'up':'nt'}">${sgn(d)}</td></tr>`;
      }
      for(const k of CARD_KEYS){
        const d = b[k]-a[k];
        if(d) rows += `<tr><td>${ico(STAT_META[k].icon)}${STAT_META[k].label} <small class="tot">(whole ship)</small></td><td class="o">${fmt(a[k])}</td><td>${fmt(b[k])}</td><td class="dl ${dcls(k,d)}">${sgn(d)}</td></tr>`;
      }
      table = `<table><tr><th>BUILD</th><th>NOW</th><th>AFTER</th><th>Δ</th></tr>${rows}</table>`;
    }
    const back = PV.ret.filter((id,i)=>!(i===0 && !pylonCase));
    const backTxt = back.length && pylonCase ? `<div class="retline">Returns to cargo: ${PV.ret.map(id=>ITEM(id).name).join(', ')}</div>` : '';
    const foot = over>0
      ? `<span>POWER <b>${T0.power}</b> ➜ <b class="no">${PV.t1.power} / ${BODY.maxPower}</b></span><span class="no">NOT ENOUGH POWER (${over} OVER)</span>`
      : `<span>POWER <b>${T0.power}</b> ➜ <b>${PV.t1.power} / ${BODY.maxPower}</b></span><span class="ok">${to?(cur?'READY TO REPLACE':'READY TO EQUIP'):'GOES BACK TO CARGO'}</span>`;
    html = head(title) + table + backTxt + `<div class="cf">${foot}</div>`;
  }
  $('#card').innerHTML = html;
}

/* ---------- bottom bar ---------- */
function renderBottom(){
  const d = dev(), curA = S.att[S.sel];
  const list = cargoList(), cm = list[S.cargoIdx];
  const fits = cm ? (isPylon(cm.id) || wouldFit(S.sel, cm.id)) : true;
  const H = (g,label,attrs='',cls='')=>`<div class="hint ${cls}" ${attrs}>${g}<span>${label}</span></div>`;
  let left = '';
  if(S.picker){
    left += H(glyph('dpad'),'Browse','data-act="none"');
    left += H(glyph('A'),'Select body','data-act="a"');
    left += H(glyph('B'),'Cancel','data-act="b"');
  }else if(S.focus==='body'){
    left += H(glyph('dpad'),'Change body','data-act="none"');
    left += H(glyph('A'),'Body list','data-act="a"');
  }else if(S.focus==='slots'){
    left += H(glyph('dpad'),'Select socket','data-act="none"');
    left += H(glyph('A'), curA?'Replace':'Choose part','data-act="a"');
    left += H(glyph('X'),'Unequip','data-act="x"', curA?'':'off');
  }else{
    left += H(glyph('dpad'),'Compare','data-act="none"');
    left += H(glyph('A'), !cm ? 'Equip' : !fits ? 'Not enough power' : curA?'Replace':'Equip','data-act="a"', (!cm||!fits)?'off':'');
    left += H(glyph('B'),'Back','data-act="b"');
  }
  if(!S.picker && S.focus!=='body'){
    left += H(glyph('LT')+glyph('RT'),'Category','data-act="cat"');
    left += H(glyph('Y'),'Remove all','id="hAll" data-hold="all"','hold');
  }
  left += H(glyph('RS'), d==='gamepad'?'Rotate':'Rotate / zoom','data-act="none"');
  const pref = { gamepad:'GAMEPAD', keyboard:'KEYBOARD', auto:'AUTO' }[S.inputPref];
  $('#bottom').innerHTML = `<div class="hints">${left}</div>
    <div class="rightbar">
      <button class="inputpill" id="pill" title="Mockup only: switch the input hints">INPUT · ${pref}</button>
      <div class="leave" id="hLeave" data-hold="leave">${glyph('START')}<span>HOLD TO LEAVE</span></div>
    </div>`;
}

function renderAll(){
  LY = layout(S.att); T0 = calc(S.att);
  if(!LY.byId[S.sel]) S.sel = navOrder(LY)[0] || BODY.sockets[0].id;
  PV = computePreview();
  renderLeft(); renderRight(); renderShip(); renderCard(); renderBottom(); renderPicker();
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
let toastT;
function toast(msg,kind=''){
  const el = $('#toast'); el.textContent = msg; el.className = 'show '+kind;
  clearTimeout(toastT); toastT = setTimeout(()=>el.classList.remove('show'),1800);
}
function flash(sid){ S.flash = sid; S.flashT = performance.now(); renderAll(); setTimeout(()=>{ if(S.flash===sid){ S.flash=null; renderAll(); } },900); }

function selectSlot(id){ S.sel = id; S.cargoIdx = 0; S.hoverCargo = null; LY = layout(S.att); ensureTab(); }
function moveSel(dir){
  S.hoverCargo = S.hoverRemove = null;
  if(S.focus==='slots'){
    const order = navOrder(LY), i = order.indexOf(S.sel);
    if(dir<0 && i<=0){ S.focus = 'body'; renderAll(); return; }
    const j = Math.max(0,Math.min(order.length-1,i+dir));
    if(j!==i) selectSlot(order[j]);
  }else{
    const n = cargoList().length; if(!n) return;
    S.cargoIdx = Math.max(0,Math.min(n-1,S.cargoIdx+dir));
  }
  renderAll();
  if(S.focus==='cargo') $('.cg-row.sel')?.scrollIntoView({block:'nearest'});
  else $('.slot.sel')?.scrollIntoView({block:'nearest'});
}
function cycleCat(dir){
  const i = TAB_ORDER.indexOf(S.tab); S.tab = TAB_ORDER[(i+dir+TAB_ORDER.length)%TAB_ORDER.length];
  S.cargoIdx = 0; S.hoverCargo = null; renderAll();
}
function equip(id, sid=S.sel){
  const it = ITEM(id); if(!it || !(isPylon(id) || S.cargo[id]>0)) return;
  const pre = makePreview(sid,id);
  if(!pre.fits){ toast('NOT ENOUGH POWER','bad'); return; }
  const r = attachTo(S.att, S.cargo, sid, id);
  S.att = r.att; S.cargo = r.cargo;
  S.focus = 'slots'; S.hoverCargo = null; S.cargoIdx = 0;
  const extra = r.ret.length;
  if(isPylon(id)){
    const first = `${sid}.0`; LY = layout(S.att); if(LY.byId[first]) S.sel = first; ensureTab();
    toast(`${it.name.toUpperCase()} INSTALLED · ${outputsOf(it).length} OUTPUT SOCKET${outputsOf(it).length>1?'S':''}`);
  }else toast(`${it.name.toUpperCase()} EQUIPPED${extra?` · ${extra} RETURNED TO CARGO`:''}`);
  flash(sid);
}
function unequip(sid=S.sel){
  const a = S.att[sid]; S.hoverRemove = null;
  if(!a){ toast('SOCKET ALREADY EMPTY','info'); renderAll(); return; }
  const r = attachTo(S.att, S.cargo, sid, null);
  S.att = r.att; S.cargo = r.cargo;
  toast(r.ret.length>1 ? `${r.ret.length} PARTS MOVED TO CARGO` : `${ITEM(a.id).name.toUpperCase()} MOVED TO CARGO`,'info');
  flash(sid);
}
function removeAll(){
  const n = Object.keys(S.att).length;
  for(const k of Object.keys(S.att)) if(!isPylon(S.att[k].id)) S.cargo[S.att[k].id] = (S.cargo[S.att[k].id]||0)+1;
  S.att = {}; S.focus = 'slots'; S.sel = BODY.sockets[0].id;
  toast(n?`${n} PARTS MOVED TO CARGO`:'NOTHING TO REMOVE','info'); renderAll();
}
function act(name){
  S.hoverCargo = S.hoverRemove = null;
  if(S.picker){
    ({ left:()=>pickMove(-1), right:()=>pickMove(1), up:()=>pickMove(-2), down:()=>pickMove(2), a:confirmPick, b:closePicker })[name]?.();
    return;
  }
  if(S.focus==='body'){
    ({ left:()=>stepBody(-1), right:()=>stepBody(1), down:()=>{ S.focus='slots'; renderAll(); }, a:openPicker })[name]?.();
    return;
  }
  switch(name){
    case 'up': moveSel(-1); break;
    case 'down': moveSel(1); break;
    case 'a':
      if(S.focus==='slots'){
        if(!cargoList().length){ toast(`NOTHING FOR A ${SIZE[selSock().size].label} SOCKET IN THIS TAB`,'info'); return; }
        S.focus='cargo'; S.cargoIdx=0; renderAll();
      } else { const m = cargoList()[S.cargoIdx]; if(m) equip(m.id); }
      break;
    case 'b': case 'left': if(S.focus==='cargo'){ S.focus='slots'; renderAll(); } break;
    case 'x': unequip(S.sel); break;
    case 'catNext': cycleCat(1); break;
    case 'catPrev': cycleCat(-1); break;
  }
}

/* ---------- main body selector ---------- */
function switchBody(id){
  if(!BODIES[id] || id===BODY.id) return;
  S.builds[BODY.id] = S.att;                 // every body keeps its own build
  BODY = BODIES[id]; S.att = S.builds[id] || {};
  S.cargoIdx = 0; S.hoverCargo = S.hoverSlot = S.hoverRemove = null;
  S.sel = navOrder(layout(S.att))[0];
  Object.assign(S.rot, homeRot());
  window.setShipBody?.();
  toast(`${BODY.name} · ${BODY.tag}`,'info');
  renderAll();
}
function stepBody(dir){ const i = BODY_LIST.indexOf(BODY.id); switchBody(BODY_LIST[(i+dir+BODY_LIST.length)%BODY_LIST.length]); }
function openPicker(){ S.picker = true; S.pickIdx = BODY_LIST.indexOf(BODY.id); renderAll(); }
function closePicker(){ S.picker = false; renderAll(); }
function pickMove(d){ S.pickIdx = Math.max(0,Math.min(BODY_LIST.length-1,S.pickIdx+d)); renderAll(); }
function confirmPick(){ const id = BODY_LIST[S.pickIdx]; S.picker = false; S.focus = 'slots'; if(id===BODY.id) renderAll(); else switchBody(id); }

const bodyCounts = b => { const c = {1:0,2:0,3:0}; b.sockets.forEach(s => c[s.size]++); return c; };
// top-view schematic of a body's sockets
function schematic(b){
  const ext = Math.max(...b.sockets.map(s => Math.max(Math.abs(s.pos[0]),Math.abs(s.pos[2]))), b.look?.r[0]||1, 2)*1.25;
  const rx = b.look ? b.look.r[0] : ext*.5, rz = b.look ? b.look.r[2] : ext*.7;
  const shapes = b.sockets.map(s => {
    const r = ext*.075*(s.size===3?1.5:s.size===2?1.2:1), x = s.pos[0], y = -s.pos[2], c = SIZE[s.size].color;
    return SIZE[s.size].shape==='tri' ? `<path d="M${x} ${y-r}L${x+r*.95} ${y+r*.7}L${x-r*.95} ${y+r*.7}Z" fill="${c}"/>`
         : SIZE[s.size].shape==='sq'  ? `<rect x="${x-r*.8}" y="${y-r*.8}" width="${r*1.6}" height="${r*1.6}" fill="${c}"/>`
         : `<circle cx="${x}" cy="${y}" r="${r*.9}" fill="${c}"/>`;
  }).join('');
  return `<svg class="schem" viewBox="${-ext} ${-ext} ${2*ext} ${2*ext}"><ellipse cx="0" cy="0" rx="${rx}" ry="${rz}" fill="#171b20" stroke="#3a3f46" stroke-width="${ext*.02}"/>${shapes}</svg>`;
}
function renderPicker(){
  const el = $('#picker'); if(!el) return;
  if(!S.picker){ el.classList.remove('show'); el.innerHTML = ''; return; }
  const cards = BODY_LIST.map((id,i) => {
    const b = BODIES[id], c = bodyCounts(b), mounted = Object.keys(id===BODY.id ? S.att : (S.builds[id]||{})).length;
    return `<div class="bcard ${id===BODY.id?'cur':''} ${i===S.pickIdx?'sel':''}" data-bcard="${i}">
      <div class="bc-head"><b>${b.name}</b><small>${b.tag}</small>${id===BODY.id?'<span class="bc-use">IN USE</span>':''}</div>
      <div class="bc-mid">${schematic(b)}
        <div class="bc-stats">
          <div><span>POWER</span><b>${b.maxPower}</b></div>
          <div><span>HULL</span><b>${fmt(b.base.hull)}</b></div>
          <div><span>SHIELD</span><b>${fmt(b.base.shield)}</b></div>
          <div><span>BASE VALUE</span><b>${fmt(b.base.value)}</b></div>
        </div></div>
      <div class="bc-foot"><span class="bc-cnt">${SIZE_ORDER.filter(n=>c[n]).map(n=>`${sg(n,16)}<b>×${c[n]}</b>`).join('')}</span><span class="bc-mnt">${mounted?`${mounted} parts mounted`:'empty build'}</span></div>
    </div>`;
  }).join('');
  el.innerHTML = `<div class="pk-head">SELECT MAIN BODY<small>${BODY_LIST.length} AVAILABLE</small></div><div class="pk-grid">${cards}</div>`;
  el.classList.add('show');
}

/* ---------- hold-to-confirm (leave / remove all) ---------- */
const HOLD_MS = 900, holds = {};
const holdEls = { leave:'#hLeave', all:'#hAll' };
function holdStart(id){
  if(holds[id]) return;
  holds[id] = { t0: performance.now(), done:false };
  (function tick(){
    const h = holds[id]; if(!h) return;
    const p = Math.min(1,(performance.now()-h.t0)/HOLD_MS);
    const el = $(holdEls[id]); if(el) el.style.setProperty('--p',p);
    if(p>=1 && !h.done){ h.done = true; holdDone(id); }
    if(!h.done) requestAnimationFrame(tick);
  })();
}
function holdEnd(id){
  if(!holds[id]) return; delete holds[id];
  const el = $(holdEls[id]); if(el) el.style.setProperty('--p',0);
}
function holdDone(id){
  const el = $(holdEls[id]); if(el) el.style.setProperty('--p',0);
  if(id==='all') removeAll();
  if(id==='leave') $('#leave-ov').classList.add('show');
  setTimeout(()=>delete holds[id],250);
}

/* =====================================================================
   INPUT — mouse
   ===================================================================== */
const stage = $('#stage');
stage.addEventListener('pointermove',e=>{
  const row = e.target.closest?.('.cg-row'), sl = e.target.closest?.('[data-slot]'), un = e.target.closest?.('[data-unq]');
  const hc = row?.dataset.item || null, hr = un?.dataset.unq || null;
  let hs = sl?.dataset.slot || null;
  if(!drag && e.target.closest?.('#shipbox')){ hs = pickSlot(e); setShipCursor(hs?'pointer':''); }
  const bcd = e.target.closest?.('[data-bcard]');
  if(S.picker && bcd && +bcd.dataset.bcard!==S.pickIdx){ S.pickIdx = +bcd.dataset.bcard; renderAll(); return; }
  if(S.picker) return;
  if(hc!==S.hoverCargo || hs!==S.hoverSlot || hr!==S.hoverRemove){
    S.hoverCargo=hc; S.hoverSlot=hs; S.hoverRemove=hr; renderAll();
  }
});
stage.addEventListener('pointerleave',()=>{ S.hoverCargo=S.hoverSlot=S.hoverRemove=null; renderAll(); });
stage.addEventListener('click',e=>{
  if(dragMoved) return;
  const t = e.target;
  if(t.closest('#leave-ov')){ $('#leave-ov').classList.remove('show'); return; }
  if(t.closest('#pill')){ S.inputPref = { gamepad:'keyboard', keyboard:'auto', auto:'gamepad' }[S.inputPref]; renderTop(); renderAll(); return; }
  const bc = t.closest('[data-bcard]'); if(bc){ S.pickIdx = +bc.dataset.bcard; confirmPick(); return; }
  if(S.picker){ if(!t.closest('#picker')) closePicker(); return; }
  const bs = t.closest('[data-bstep]'); if(bs){ S.focus='body'; stepBody(+bs.dataset.bstep); return; }
  if(t.closest('[data-bpick]')){ S.focus='body'; openPicker(); return; }
  const un = t.closest('[data-unq]'); if(un){ unequip(un.dataset.unq); return; }
  if(t.closest('#shipbox')){ const id = pickSlot(e); if(id){ selectSlot(id); S.focus='slots'; renderAll(); } return; }
  const sl = t.closest('[data-slot]'); if(sl){ selectSlot(sl.dataset.slot); S.focus='slots'; renderAll(); return; }
  const row = t.closest('.cg-row'); if(row){ S.focus='cargo'; S.cargoIdx=+row.dataset.i; equip(row.dataset.item); return; }
  const tab = t.closest('[data-tab]'); if(tab){ S.tab = tab.dataset.tab; S.cargoIdx = 0; renderAll(); return; }
  const h = t.closest('[data-act]'); if(h && h.dataset.act!=='none' && !h.classList.contains('off')){
    if(h.dataset.act==='cat') cycleCat(1); else act(h.dataset.act);
  }
});
stage.addEventListener('pointerdown',e=>{
  const h = e.target.closest('[data-hold]'); if(h) holdStart(h.dataset.hold);
});
addEventListener('pointerup',()=>{ holdEnd('all'); holdEnd('leave'); });

/* ship: drag = orbit, wheel = zoom, dblclick = reset */
let drag=null, dragMoved=false;
$('#shipbox').addEventListener('pointerdown',e=>{ drag={x:e.clientX,y:e.clientY,yaw:S.rot.yaw,pitch:S.rot.pitch}; dragMoved=false; });
addEventListener('pointermove',e=>{
  if(!drag) return;
  const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>5) dragMoved=true;
  if(dragMoved){ S.rot.yaw=drag.yaw-dx*.006; S.rot.pitch=Math.max(-.25,Math.min(1.1,drag.pitch+dy*.005)); }
});
addEventListener('pointerup',()=>{ drag=null; setTimeout(()=>dragMoved=false,0); });
$('#shipbox').addEventListener('wheel',e=>{ e.preventDefault(); S.rot.d=Math.max(8,Math.min(26,S.rot.d+e.deltaY*.01)); },{passive:false});
$('#shipbox').addEventListener('dblclick',()=>{ Object.assign(S.rot,homeRot()); });

/* =====================================================================
   INPUT — keyboard
   ===================================================================== */
addEventListener('keydown',e=>{
  if(e.repeat && !['ArrowUp','ArrowDown','w','s'].includes(e.key)) return;
  if(S.inputPref==='auto' && S.device!=='keyboard'){ S.device='keyboard'; renderTop(); renderBottom(); }
  const k = e.key;
  const map = { ArrowUp:'up', w:'up', ArrowDown:'down', s:'down', Enter:'a', ' ':'a', Backspace:'b', ArrowLeft:'left', ArrowRight:'right',
                Delete:'x', x:'x', Tab: e.shiftKey?'catPrev':'catNext' };
  if(map[k]){ e.preventDefault(); act(map[k]); return; }
  if(k==='r'||k==='R'){ holdStart('all'); }
  if(k==='Escape' && S.picker){ e.preventDefault(); closePicker(); return; }
  if(k==='Escape'){ e.preventDefault(); if($('#leave-ov').classList.contains('show')) $('#leave-ov').classList.remove('show'); else holdStart('leave'); }
});
addEventListener('keyup',e=>{
  if(e.key==='r'||e.key==='R') holdEnd('all');
  if(e.key==='Escape') holdEnd('leave');
});

/* =====================================================================
   INPUT — gamepad (standard mapping)
   ===================================================================== */
const gpPrev = {}; let gpRepeat = {};
function pollPad(){
  const pad = [...(navigator.getGamepads?.()||[])].find(Boolean);
  if(pad){
    const b = i => !!pad.buttons[i]?.pressed;
    const now = performance.now();
    const cur = { up:b(12)||pad.axes[1]<-.6, down:b(13)||pad.axes[1]>.6, left:b(14), right:b(15), a:b(0), b:b(1), x:b(2), y:b(3), lt:b(6), rt:b(7), lb:b(4), rb:b(5), start:b(9) };
    for(const k of Object.keys(cur)){
      const edge = cur[k] && !gpPrev[k];
      if(edge){
        gpRepeat[k] = now+380;
        if(S.inputPref==='auto' && S.device!=='gamepad'){ S.device='gamepad'; renderTop(); renderBottom(); }
        ({ up:()=>act('up'), down:()=>act('down'), left:()=>act('left'), right:()=>act('right'), a:()=>act('a'), b:()=>act('b'), x:()=>act('x'),
           lt:()=>act('catPrev'), rt:()=>act('catNext'), y:()=>holdStart('all'), start:()=>holdStart('leave') })[k]?.();
      }else if(cur[k] && (k==='up'||k==='down') && now>gpRepeat[k]){ gpRepeat[k]=now+90; act(k); }
      if(!cur[k] && gpPrev[k]){ if(k==='y') holdEnd('all'); if(k==='start') holdEnd('leave'); }
      gpPrev[k]=cur[k];
    }
    const rx = pad.axes[2]||0, ry = pad.axes[3]||0;
    if(Math.abs(rx)>.2||Math.abs(ry)>.2){
      S.rot.yaw-=rx*.05; S.rot.pitch=Math.max(-.25,Math.min(1.1,S.rot.pitch+ry*.04));
    }
  }
  requestAnimationFrame(pollPad);
}
addEventListener('gamepadconnected',()=>toast('GAMEPAD CONNECTED','info'));

/* =====================================================================
   BOOT
   ===================================================================== */
function fit(){ const s=Math.min(innerWidth/1920,innerHeight/1080); S.scale=s; stage.style.transform=`translate(-50%,-50%) scale(${s})`; window.resizeShip?.(); }
addEventListener('resize',fit); fit();

function boot(){
  Object.assign(S.rot, homeRot());
  renderTop(); initShip(); renderAll(); requestAnimationFrame(pollPad);
  fetch('version.json',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(v=>{
    $('#build').textContent = `BUILD v${v.version} · ${v.sha}`; $('#build').title = v.date;
  }).catch(()=>{});
}
