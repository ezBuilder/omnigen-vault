// Self-contained, multilingual, polished gallery page served by serve.js.
// All client JS uses string concatenation (no template literals) so the whole
// document can live in one server-side template literal without escaping.

const I18N = {
  en: { title: 'Omnigen Gallery', search: 'Search prompts, subjects…', all: 'All categories',
        ratingAll: 'Any rating', newest: 'Newest', oldest: 'Oldest', more: 'Load more',
        none: 'No images found', dl: 'Download', copy: 'Copy prompt', copied: 'Copied!',
        results: 'images', rate: 'Rate' },
  ko: { title: '옴니젠 갤러리', search: '프롬프트·주제 검색…', all: '모든 종류',
        ratingAll: '별점 전체', newest: '최신순', oldest: '오래된순', more: '더 보기',
        none: '이미지 없음', dl: '다운로드', copy: '프롬프트 복사', copied: '복사됨!',
        results: '장', rate: '별점' },
  ja: { title: 'オムニジェン ギャラリー', search: 'プロンプト・被写体を検索…', all: 'すべて',
        ratingAll: '評価すべて', newest: '新しい順', oldest: '古い順', more: 'もっと見る',
        none: '画像なし', dl: 'ダウンロード', copy: 'プロンプトをコピー', copied: 'コピー!',
        results: '枚', rate: '評価' },
  zh: { title: 'Omnigen 画廊', search: '搜索提示词、主题…', all: '全部分类',
        ratingAll: '所有评分', newest: '最新', oldest: '最早', more: '加载更多',
        none: '没有图片', dl: '下载', copy: '复制提示词', copied: '已复制!',
        results: '张', rate: '评分' },
  es: { title: 'Galería Omnigen', search: 'Buscar prompts, temas…', all: 'Todas',
        ratingAll: 'Cualquier valoración', newest: 'Recientes', oldest: 'Antiguos', more: 'Cargar más',
        none: 'Sin imágenes', dl: 'Descargar', copy: 'Copiar prompt', copied: '¡Copiado!',
        results: 'imágenes', rate: 'Valorar' }
};

export function renderServerGallery({ isPublic = true, allowRating = false, allowDownload = true } = {}) {
  const cfg = JSON.stringify({ ratingEnabled: !!allowRating, downloadEnabled: !!allowDownload, isPublic: !!isPublic });
  const i18n = JSON.stringify(I18N);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Omnigen Gallery</title>
<style>
  :root{color-scheme:dark;--bg:#0a0c11;--card:#141821;--line:#222a38;--fg:#eef2f9;--muted:#8a93a6;--accent:#6ea8fe;--star:#ffce54}
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;background:radial-gradient(1200px 600px at 70% -10%,#16203a 0%,var(--bg) 55%);color:var(--fg);
       font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans CJK KR",sans-serif;min-height:100vh}
  header{position:sticky;top:0;z-index:20;display:flex;gap:12px;align-items:center;flex-wrap:wrap;
         padding:13px 20px;background:rgba(10,12,17,.78);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
  h1{font-size:15px;margin:0;font-weight:700;letter-spacing:.2px;display:flex;align-items:center;gap:8px}
  h1 .dot{width:9px;height:9px;border-radius:50%;background:var(--accent);box-shadow:0 0 12px var(--accent)}
  .count{color:var(--muted);font-size:12px}
  input,select{background:#0f131c;color:var(--fg);border:1px solid #2a3140;border-radius:11px;padding:9px 12px;font-size:13px;outline:none;transition:border-color .15s,box-shadow .15s}
  input:focus,select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(110,168,254,.18)}
  #q{flex:1;min-width:170px}
  .grow{flex:1}
  #grid{column-count:5;column-gap:12px;padding:16px 20px 60px}
  @media(max-width:1500px){#grid{column-count:4}} @media(max-width:1100px){#grid{column-count:3}}
  @media(max-width:760px){#grid{column-count:2}} @media(max-width:460px){#grid{column-count:1}}
  .card{break-inside:avoid;margin:0 0 12px;background:var(--card);border:1px solid var(--line);border-radius:14px;
        overflow:hidden;cursor:zoom-in;opacity:0;transform:translateY(8px);animation:rise .4s forwards;position:relative}
  @keyframes rise{to{opacity:1;transform:none}}
  .card img{width:100%;display:block;background:#0f131c;transition:transform .5s cubic-bezier(.2,.8,.2,1)}
  .card:hover{border-color:#3a4a63}
  .card:hover img{transform:scale(1.04)}
  .cap{position:absolute;left:0;right:0;bottom:0;padding:18px 10px 9px;font-size:12px;
       background:linear-gradient(transparent,rgba(8,10,15,.92));opacity:0;transition:opacity .2s}
  .card:hover .cap{opacity:1}
  .cap .s{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
  .cap .t{color:var(--muted);display:flex;gap:6px;align-items:center;margin-top:2px}
  .chip{font-size:10px;color:var(--muted);background:#0f131c;border:1px solid #2a3140;border-radius:999px;padding:1px 7px}
  .dlbtn{position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:9px;border:1px solid #2a3140;
         background:rgba(15,19,28,.7);color:var(--fg);display:none;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px)}
  .card:hover .dlbtn{display:flex}.dlbtn:hover{background:var(--accent);color:#06101f}
  #more{display:block;margin:8px auto 40px;padding:11px 22px;border-radius:12px;border:1px solid #2a3140;background:#141821;color:var(--fg);cursor:pointer}
  #more:hover{border-color:var(--accent)} #sentinel{height:1px}
  #empty{display:none;text-align:center;color:var(--muted);padding:60px}
  /* lightbox */
  #lb{position:fixed;inset:0;z-index:50;background:rgba(4,6,10,.96);display:none;opacity:0;transition:opacity .2s;
      padding:24px;flex-direction:column;align-items:center;justify-content:center;gap:16px;overflow:auto}
  #lb.open{display:flex;opacity:1}
  #lb img{max-width:min(94vw,1300px);max-height:74vh;border-radius:12px;transform:scale(.97);transition:transform .25s;box-shadow:0 24px 80px rgba(0,0,0,.6)}
  #lb.open img{transform:scale(1)}
  .info{max-width:min(94vw,1300px);width:100%;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
  .info .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .info .prompt{white-space:pre-wrap;color:#c7cedd;font-size:12.5px;margin:9px 0 0}
  .btn{background:#222b3c;color:var(--fg);border:1px solid #2f394d;border-radius:9px;padding:7px 13px;cursor:pointer;font-size:12px;transition:background .15s}
  .btn:hover{background:#2c374d}.btn.acc{background:var(--accent);color:#06101f;border-color:var(--accent)}
  .stars span{cursor:pointer;font-size:18px;color:#454e60;transition:color .12s}
  .stars span.on,.stars:hover span{color:var(--star)} .stars span:hover ~ span{color:#454e60}
  .nav{position:fixed;top:50%;transform:translateY(-50%);font-size:30px;color:#fff;background:rgba(20,24,33,.5);
       border:0;width:46px;height:64px;border-radius:12px;cursor:pointer;z-index:60}
  #prev{left:14px}#next{right:14px}.nav:hover{background:rgba(110,168,254,.5)}
  .skel{background:linear-gradient(100deg,#141821 30%,#1c2230 50%,#141821 70%);background-size:200% 100%;animation:sk 1.2s infinite}
  @keyframes sk{to{background-position:-200% 0}}
</style>
</head>
<body>
<header>
  <h1><span class="dot"></span><span id="ttl">Omnigen Gallery</span></h1>
  <span class="count" id="count"></span>
  <input id="q" type="search" autocomplete="off">
  <select id="cat"></select>
  <select id="rate"></select>
  <select id="sort"></select>
  <select id="lang">
    <option value="en">English</option><option value="ko">한국어</option>
    <option value="ja">日本語</option><option value="zh">中文</option><option value="es">Español</option>
  </select>
</header>
<div id="grid"></div>
<button id="more"></button>
<div id="sentinel"></div>
<div id="empty"></div>
<button class="nav" id="prev">‹</button><button class="nav" id="next">›</button>
<div id="lb">
  <img id="lbimg" alt="">
  <div class="info">
    <div class="row"><strong id="lbsub"></strong><span class="chip" id="lbcat"></span><span class="chip" id="lbsize"></span>
      <span class="grow"></span>
      <span class="stars" id="lbstars"></span>
      <button class="btn" id="lbcopy"></button><a class="btn acc" id="lbdl" download></a></div>
    <p class="prompt" id="lbprompt"></p>
  </div>
</div>
<script>
var CFG=${cfg}, I18N=${i18n};
var K=new URLSearchParams(location.search).get('k');
function api(u){ return K ? u+(u.indexOf('?')<0?'?':'&')+'k='+encodeURIComponent(K) : u; }
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]});}
var lang=localStorage.getItem('omnilang')||(navigator.language||'en').slice(0,2);
if(!I18N[lang]) lang='en';
function t(k){return (I18N[lang]||I18N.en)[k];}

var grid=document.getElementById('grid'),emptyEl=document.getElementById('empty'),moreBtn=document.getElementById('more');
var lb=document.getElementById('lb');
var state={q:'',category:'',minRating:0,order:'new',offset:0,total:0,loading:false,done:false};
var items=[], cur=-1;

function applyLang(){
  document.documentElement.lang=lang;
  document.getElementById('ttl').textContent=t('title');
  document.getElementById('q').placeholder=t('search');
  moreBtn.textContent=t('more'); emptyEl.textContent=t('none');
  document.getElementById('lbcopy').textContent=t('copy');
  document.getElementById('lbdl').textContent=t('dl');
  // selects keep their option values; refresh labels
  buildRate(); buildSort(); document.getElementById('lang').value=lang;
  // category dropdown: refresh the "all categories" label (category names stay as-is)
  var catSel=document.getElementById('cat');
  if(catSel && catSel.options.length){ catSel.options[0].textContent=t('all'); }
  updateCount();
}
function buildRate(){var r=document.getElementById('rate');var v=r.value||'0';r.innerHTML='';
  var o=document.createElement('option');o.value='0';o.textContent=t('ratingAll');r.appendChild(o);
  for(var i=1;i<=5;i++){var e=document.createElement('option');e.value=i;e.textContent='★'.repeat(i)+(i<5?'+':'');r.appendChild(e);}r.value=v;}
function buildSort(){var s=document.getElementById('sort');var v=s.value||'new';s.innerHTML='';
  [['new',t('newest')],['old',t('oldest')]].forEach(function(p){var e=document.createElement('option');e.value=p[0];e.textContent=p[1];s.appendChild(e);});s.value=v;}
function updateCount(){document.getElementById('count').textContent=state.total.toLocaleString()+' '+t('results');}

function stars(n){var s='';for(var i=1;i<=5;i++)s+='<span style="color:'+(i<=n?'var(--star)':'#454e60')+'">★</span>';return s;}

function reset(){state.offset=0;state.done=false;items=[];grid.innerHTML='';fetchPage();}
function fetchPage(){
  if(state.loading||state.done)return; state.loading=true;
  var u=api('/api/search?limit=60&offset='+state.offset+'&q='+encodeURIComponent(state.q)
      +'&category='+encodeURIComponent(state.category)+'&minRating='+state.minRating+'&order='+state.order);
  fetch(u).then(function(r){return r.json()}).then(function(d){
    state.total=d.total; updateCount();
    if(state.offset===0 && d.items.length===0){emptyEl.style.display='block';} else {emptyEl.style.display='none';}
    var frag=document.createDocumentFragment();
    d.items.forEach(function(it){ var idx=items.length; items.push(it);
      var card=document.createElement('div');card.className='card';
      var dl = CFG.downloadEnabled ? '<div class="dlbtn" data-dl="'+it.id+'" title="'+t('dl')+'">↓</div>' : '';
      card.innerHTML='<img loading="lazy" decoding="async" src="'+api(it.thumb)+'" alt="">'+dl+
        '<div class="cap"><div class="s">'+esc(it.subject)+'</div><div class="t"><span class="chip">'+esc(it.category)+'</span>'+
        (it.rating?('<span>'+ '★'.repeat(it.rating) +'</span>'):'')+'</div></div>';
      card.addEventListener('click',function(e){ if(e.target.getAttribute('data-dl')){e.stopPropagation();location.href=api(it.download);return;} openAt(idx); });
      frag.appendChild(card);
    });
    grid.appendChild(frag);
    state.offset+=d.items.length;
    if(d.items.length===0 || state.offset>=state.total) state.done=true;
    moreBtn.style.display=state.done?'none':'block';
    state.loading=false;
  }).catch(function(){state.loading=false;});
}

function openAt(i){ if(i<0||i>=items.length)return; cur=i; var it=items[i];
  document.getElementById('lbimg').src=api(it.full);
  document.getElementById('lbsub').textContent=it.subject;
  document.getElementById('lbcat').textContent=it.category;
  document.getElementById('lbsize').textContent=it.size||'';
  document.getElementById('lbprompt').textContent=it.prompt||'';
  var dlA=document.getElementById('lbdl');
  if(CFG.downloadEnabled){dlA.style.display='';dlA.href=api(it.download);} else dlA.style.display='none';
  var st=document.getElementById('lbstars');
  if(CFG.ratingEnabled){ st.style.display=''; st.innerHTML=''; (function(){ for(var k=1;k<=5;k++){ (function(v){
    var sp=document.createElement('span'); sp.textContent='★'; sp.style.color=(v<=it.rating?'var(--star)':'#454e60');
    sp.onclick=function(e){e.stopPropagation(); fetch(api('/api/rate'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:it.id,rating:v})})
      .then(function(r){return r.json()}).then(function(){it.rating=v;openAt(cur);}); };
    st.appendChild(sp);} )(k); } })(); } else st.style.display='none';
  lb.classList.add('open');
}
document.getElementById('lbcopy').onclick=function(e){e.stopPropagation();var it=items[cur];if(it&&navigator.clipboard){navigator.clipboard.writeText(it.prompt||'');this.textContent=t('copied');var b=this;setTimeout(function(){b.textContent=t('copy')},1200);}};
lb.onclick=function(e){if(e.target===lb||e.target.id==='lbimg')lb.classList.remove('open');};
document.getElementById('prev').onclick=function(e){e.stopPropagation();openAt(cur-1);};
document.getElementById('next').onclick=function(e){e.stopPropagation();if(cur+1>=items.length)fetchPage();openAt(cur+1);};
document.addEventListener('keydown',function(e){ if(e.key==='Escape')lb.classList.remove('open');
  if(!lb.classList.contains('open'))return;
  if(e.key==='ArrowLeft'){e.preventDefault();openAt(cur-1);}
  if(e.key==='ArrowRight'){e.preventDefault();if(cur+1>=items.length)fetchPage();openAt(cur+1);} });

var qto; document.getElementById('q').oninput=function(){clearTimeout(qto);var v=this.value;qto=setTimeout(function(){state.q=v;reset();},180);};
document.getElementById('cat').onchange=function(){state.category=this.value;reset();};
document.getElementById('rate').onchange=function(){state.minRating=+this.value;reset();};
document.getElementById('sort').onchange=function(){state.order=this.value;reset();};
document.getElementById('lang').onchange=function(){lang=this.value;localStorage.setItem('omnilang',lang);applyLang();};
moreBtn.onclick=fetchPage;
new IntersectionObserver(function(es){if(es[0].isIntersecting)fetchPage();}).observe(document.getElementById('sentinel'));

// populate categories
fetch(api('/api/categories')).then(function(r){return r.json()}).then(function(d){
  var c=document.getElementById('cat');var o=document.createElement('option');o.value='';o.textContent=t('all');c.appendChild(o);
  (d.categories||[]).forEach(function(name){var e=document.createElement('option');e.value=name;e.textContent=name;c.appendChild(e);});
});
applyLang(); fetchPage();
</script>
</body>
</html>`;
}
