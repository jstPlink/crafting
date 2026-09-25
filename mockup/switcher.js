/* =====================================================================
   VERSION & EXPERIMENTS MENU

   Shared by every version: the root index.html and every frozen snapshot
   (versions/<v>/index.html) load this file, so you can always switch back.
   Click the build label (top right, under the credits) to open it.

   - VERSION: lists window.CRAFTING_VERSIONS (versions.js, written by scripts/snapshot.py).
       LATEST  = the working copy at the site root
       others  = frozen snapshots in versions/<v>/
       COPY BUILD HERE = copy the saved builds of that version into the current one
   - EXPERIMENTS: optional. A version can expose window.craftingExperiments =
       { items: () => [{ id, label, desc, on }], toggle: id => {} }
     and each item shows up as a switch.

   Globals read: APP_VERSION (app.js), window.CRAFTING_VERSIONS (versions.js)
   ===================================================================== */
(function(){
  const stage = document.getElementById('stage'), label = document.getElementById('build');
  if(!stage || !label) return;

  const cur = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?';
  const nums = v => String(v).split('.').map(n => +n || 0);
  const newestFirst = (a, b) => { const x = nums(a.version), y = nums(b.version); for(let i = 0; i < 3; i++) if(x[i] !== y[i]) return y[i] - x[i]; return 0; };
  const list = (window.CRAFTING_VERSIONS || []).slice().sort(newestFirst);
  const snap = location.pathname.match(/^(.*?)\/versions\/[^/]+\/(?:index\.html)?$/);   // are we inside a snapshot?
  const root = snap ? snap[1] + '/' : location.pathname.replace(/[^/]*$/, '');
  const keyOf = v => list.find(e => e.version === v)?.saveKey || 'crafting.save.' + v;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  const css = document.createElement('style');
  css.textContent = `
    /* the version button: !important because older versions style #build as a tiny grey label */
    #stage #build{cursor:pointer;pointer-events:auto;font-size:20px!important;font-weight:700;letter-spacing:.08em!important;color:#dfe5ea!important;
      padding:7px 16px;background:rgba(10,12,15,.75);border:1px solid #4a4f55}
    #stage #build::after{content:" ▾";color:var(--accent-2)}
    #stage #build:hover,#stage #build.open{border-color:var(--accent-2)}
    #verpanel{position:absolute;right:80px;top:160px;width:500px;max-height:820px;overflow-y:auto;z-index:60;display:none;background:#0a0c0f;border:1px solid var(--accent);
      font-size:17px;letter-spacing:.03em;color:#dfe5ea;scrollbar-width:thin;scrollbar-color:#3a3f46 transparent}
    #verpanel.show{display:block}
    #verpanel h4{font-size:15px;letter-spacing:.14em;color:var(--dim);padding:12px 16px 6px;font-weight:600}
    #verpanel .vrow{display:flex;align-items:center;gap:12px;padding:9px 16px;border-top:1px solid #16181b;cursor:pointer}
    #verpanel .vrow:hover{background:#171a1e}
    #verpanel .vrow.cur{background:#211914;cursor:default}
    #verpanel .vmain{flex:1;min-width:0}
    #verpanel .vmain b{font-size:20px;letter-spacing:.05em}
    #verpanel .vmain small{display:block;font-size:15px;color:var(--dim);letter-spacing:.02em;line-height:1.3;margin-top:2px}
    #verpanel .vtag{font-size:13px;font-weight:700;letter-spacing:.12em;padding:2px 8px;background:#1f3d29;color:var(--good)}
    #verpanel .vbtn{font-size:13px;font-weight:700;letter-spacing:.1em;color:#c9d0d6;border:1px dashed #4b5158;padding:4px 9px;white-space:nowrap}
    #verpanel .vbtn:hover{color:#fff;border-color:var(--accent-2)}
    #verpanel .sw{flex:none;width:52px;text-align:center;font-size:14px;font-weight:700;letter-spacing:.1em;padding:3px 0;background:#22262b;color:var(--dim)}
    #verpanel .sw.on{background:#1f3d29;color:var(--good)}
    #verpanel .vfoot{padding:10px 16px;font-size:14px;color:var(--dim);border-top:1px solid #16181b}`;
  document.head.appendChild(css);

  const panel = document.createElement('div');
  panel.id = 'verpanel';
  stage.appendChild(panel);

  function render(){
    let h = `<h4>VERSION · YOU ARE ON v${esc(cur)}</h4>`;
    h += `<div class="vrow ${snap ? '' : 'cur'}" data-root><div class="vmain"><b>LATEST</b><small>Working copy: always the newest version</small></div>${snap ? '' : '<span class="vtag">HERE</span>'}</div>`;
    for(const e of list){
      const here = !!snap && e.version === cur;
      h += `<div class="vrow ${here ? 'cur' : ''}" data-go="${esc(e.version)}"><div class="vmain"><b>v${esc(e.version)}</b><small>${esc(e.date || '')}${e.notes ? ' · ' + esc(e.notes) : ''}</small></div>`
        + (here ? '<span class="vtag">HERE</span>' : `<span class="vbtn" data-copy="${esc(e.version)}" title="Replace this version's saved builds with the ones saved in v${esc(e.version)}">COPY BUILD HERE</span>`) + `</div>`;
    }
    if(!list.length) h += '<div class="vfoot">No frozen versions yet.</div>';
    const ex = window.craftingExperiments;
    if(ex){
      h += `<h4>EXPERIMENTS · SWITCH FEATURES ON / OFF</h4>`;
      for(const it of ex.items()) h += `<div class="vrow" data-exp="${esc(it.id)}"><div class="vmain"><b>${esc(it.label)}</b>${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</div><span class="sw ${it.on ? 'on' : ''}">${it.on ? 'ON' : 'OFF'}</span></div>`;
    }
    h += '<div class="vfoot">Saved builds are kept separately for every version.</div>';
    panel.innerHTML = h;
  }

  function go(v){ location.href = root + 'versions/' + v + '/index.html'; }
  function copyBuild(v){
    let data = null; try{ data = localStorage.getItem(keyOf(v)); }catch(e){}
    if(!data){ alert('v' + v + ' has no saved build to copy.'); return; }
    if(!confirm('Replace the builds saved in v' + cur + ' with the ones from v' + v + '?')) return;
    try{ localStorage.setItem(keyOf(cur), data); }catch(e){ alert('Could not write the save.'); return; }
    location.reload();
  }

  panel.addEventListener('click', e => {
    e.stopPropagation();
    const t = e.target;
    const c = t.closest('[data-copy]'); if(c){ copyBuild(c.dataset.copy); return; }
    const x = t.closest('[data-exp]'); if(x){ window.craftingExperiments.toggle(x.dataset.exp); render(); return; }
    if(t.closest('[data-root]')){ if(snap) location.href = root + 'index.html'; return; }
    const g = t.closest('[data-go]'); if(g && !g.classList.contains('cur')) go(g.dataset.go);
  });
  panel.addEventListener('pointerdown', e => e.stopPropagation());
  label.title = 'Versions & experiments';
  const setOpen = on => { panel.classList.toggle('show', on); label.classList.toggle('open', on); };
  label.addEventListener('click', e => { e.stopPropagation(); render(); setOpen(!panel.classList.contains('show')); });
  document.addEventListener('click', e => { if(!panel.contains(e.target)) setOpen(false); });
})();
