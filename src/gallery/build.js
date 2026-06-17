// Build a self-contained static gallery (single HTML file) from the vault.
// Thumbnails + prompts are searchable; clicking opens the full image. The file
// references images/thumbs by paths relative to the vault root, so hosting the
// vault folder (or opening gallery.html locally) just works — ready to publish.
import fs from 'node:fs';
import path from 'node:path';

import { openVault } from '../storage/db.js';

/**
 * @param {ReturnType<import('../config.js').resolveConfig>} config
 * @param {{ limit?: number, all?: boolean, out?: string, title?: string }} [opts]
 */
export function buildGallery(config, { limit = 5000, all = false, out = null, title = 'Omnigen Vault', refreshSec = 0 } = {}) {
  const outPath = out || config.galleryPath;
  const vault = openVault(config.dbPath);
  let rows;
  let total;
  try {
    total = vault.stats().total;
    rows = vault.db
      .prepare(
        `SELECT subject, category, bucket, size_label, prompt, rel_path, thumb_rel, created_at, COALESCE(rating,0) rating
         FROM images WHERE status='active' ORDER BY created_at DESC LIMIT ?`
      )
      .all(all ? -1 : limit);
  } finally {
    vault.close();
  }

  const items = rows.map((r) => ({
    s: r.subject,
    c: r.category,
    b: r.bucket,
    z: r.size_label,
    p: r.prompt,
    f: r.rel_path,
    t: r.thumb_rel || r.rel_path, // fall back to full image if no thumb
    d: r.created_at,
    r: r.rating
  }));

  const html = renderHtml(items, { title, total, shown: items.length, refreshSec });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  return { outPath, count: items.length, total };
}

function renderHtml(items, { title, total, shown, refreshSec = 0 }) {
  const data = JSON.stringify(items).replace(/<\//g, '<\\/');
  const refreshTag = refreshSec > 0 ? `<meta http-equiv="refresh" content="${refreshSec}">` : '';
  const note = shown < total ? `최근 ${shown.toLocaleString()} / 총 ${total.toLocaleString()}장` : `총 ${total.toLocaleString()}장`;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${refreshTag}
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; --bg:#0b0d12; --card:#151922; --muted:#8b94a7; --fg:#e8ecf4; --accent:#6ea8fe; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  header { position:sticky; top:0; z-index:10; background:rgba(11,13,18,.85); backdrop-filter:blur(8px); padding:14px 20px; border-bottom:1px solid #222936; display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
  header h1 { font-size:16px; margin:0; font-weight:650; }
  header .count { color:var(--muted); font-size:12px; }
  #q { flex:1; min-width:180px; padding:9px 12px; border-radius:10px; border:1px solid #2a3242; background:#0f131b; color:var(--fg); font-size:13px; }
  header select { padding:8px 10px; border-radius:10px; border:1px solid #2a3242; background:#0f131b; color:var(--fg); font-size:12px; }
  #grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; padding:16px 20px; }
  .card { background:var(--card); border-radius:12px; overflow:hidden; cursor:zoom-in; border:1px solid #1d2330; transition:transform .12s, border-color .12s; }
  .card:hover { transform:translateY(-2px); border-color:#39435a; }
  .card img { width:100%; aspect-ratio:1/1; object-fit:cover; display:block; background:#0f131b; }
  .meta { padding:8px 10px; }
  .meta .sub { font-size:12px; color:var(--fg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .meta .tags { margin-top:4px; display:flex; gap:5px; flex-wrap:wrap; }
  .tag { font-size:10px; color:var(--muted); background:#0f131b; border:1px solid #232b3a; padding:1px 6px; border-radius:999px; }
  #empty { color:var(--muted); padding:40px 20px; text-align:center; display:none; }
  /* lightbox */
  #lb { position:fixed; inset:0; background:rgba(0,0,0,.92); display:none; z-index:50; padding:24px; grid-template-columns:1fr; align-content:center; justify-items:center; gap:16px; overflow:auto; }
  #lb.open { display:grid; }
  #lb img { max-width:min(92vw,1200px); max-height:72vh; border-radius:10px; }
  #lb .info { max-width:min(92vw,1200px); width:100%; background:var(--card); border:1px solid #232b3a; border-radius:12px; padding:14px 16px; }
  #lb .prompt { white-space:pre-wrap; color:#cfd6e4; font-size:12.5px; margin:8px 0 0; }
  #lb button { background:#222b3c; color:var(--fg); border:1px solid #2f394d; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:12px; }
  #lb .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
</style>
</head>
<body>
<header>
  <h1>${escapeHtml(title)}</h1>
  <span class="count">${note}</span>
  <input id="q" type="search" placeholder="프롬프트·종류·단어 검색…" autocomplete="off">
  <select id="cat" title="종류"><option value="">모든 종류</option></select>
  <select id="rate" title="별점"><option value="0">별점 전체</option><option value="1">★1+</option><option value="2">★2+</option><option value="3">★3+</option><option value="4">★4+</option><option value="5">★5</option></select>
  <select id="sort" title="정렬"><option value="new">최신순</option><option value="old">오래된순</option></select>
</header>
<div id="grid"></div>
<div id="empty">검색 결과 없음</div>
<div id="lb"><img id="lbimg" alt=""><div class="info"><div class="row"><strong id="lbsub"></strong><span class="tag" id="lbcat"></span><span class="tag" id="lbsize"></span><button id="lbcopy">프롬프트 복사</button><button id="lbopen">원본 열기</button></div><p class="prompt" id="lbprompt"></p></div></div>
<script>
const DATA = ${data};
const grid=document.getElementById('grid'), empty=document.getElementById('empty'), lb=document.getElementById('lb');
const qEl=document.getElementById('q'), catEl=document.getElementById('cat'), rateEl=document.getElementById('rate'), sortEl=document.getElementById('sort');
let view=DATA, cur=-1;
function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function stars(n){ n=n||0; return n>0 ? '<span class="tag">'+'★'.repeat(n)+'</span>' : ''; }
[...new Set(DATA.map(it=>it.c))].sort().forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; catEl.appendChild(o); });
function render(list){
  view=list; grid.innerHTML=''; empty.style.display=list.length?'none':'block';
  const frag=document.createDocumentFragment();
  list.forEach((it,i)=>{
    const card=document.createElement('div'); card.className='card';
    card.innerHTML='<img loading="lazy" decoding="async" src="'+encodeURI(it.t)+'" alt="">'+
      '<div class="meta"><div class="sub">'+esc(it.s)+'</div>'+
      '<div class="tags"><span class="tag">'+esc(it.c)+'</span><span class="tag">'+esc(it.z||'')+'</span>'+stars(it.r)+'</div></div>';
    card.onclick=()=>openAt(i);
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}
function apply(){
  const v=qEl.value.trim().toLowerCase(), terms=v?v.split(/\\s+/):[];
  const cat=catEl.value, minR=+rateEl.value;
  let list=DATA.filter(it=>{
    if(cat && it.c!==cat) return false;
    if(minR && (it.r||0)<minR) return false;
    if(terms.length){ const hay=(it.s+' '+it.c+' '+it.p).toLowerCase(); if(!terms.every(tk=>hay.includes(tk))) return false; }
    return true;
  });
  if(sortEl.value==='old') list=list.slice().reverse();
  render(list);
}
function openAt(i){
  if(i<0||i>=view.length) return; cur=i; const it=view[i];
  document.getElementById('lbimg').src=encodeURI(it.f);
  document.getElementById('lbsub').textContent=it.s;
  document.getElementById('lbcat').textContent=it.c;
  document.getElementById('lbsize').textContent=(it.z||'')+(it.r?'  '+'★'.repeat(it.r):'');
  document.getElementById('lbprompt').textContent=it.p||'';
  document.getElementById('lbopen').onclick=(e)=>{ e.stopPropagation(); window.open(encodeURI(it.f),'_blank'); };
  document.getElementById('lbcopy').onclick=(e)=>{ e.stopPropagation(); navigator.clipboard&&navigator.clipboard.writeText(it.p||''); };
  lb.classList.add('open');
}
lb.onclick=(e)=>{ if(e.target===lb||e.target.id==='lbimg') lb.classList.remove('open'); };
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){ lb.classList.remove('open'); return; }
  if(!lb.classList.contains('open')) return;
  if(e.key==='ArrowRight'){ e.preventDefault(); openAt(Math.min(cur+1,view.length-1)); }
  if(e.key==='ArrowLeft'){ e.preventDefault(); openAt(Math.max(cur-1,0)); }
});
let t; qEl.oninput=()=>{ clearTimeout(t); t=setTimeout(apply,120); };
catEl.onchange=apply; rateEl.onchange=apply; sortEl.onchange=apply;
apply();
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
