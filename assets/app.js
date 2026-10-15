(() => {
  'use strict';
  const FALLBACK = window.CULTURE_SIGNAL_SEED || {editorial:[],live:[],charts:[],updated_at:null,errors:[]};
  const CATEGORY = {fashion:'FASHION',music:'MUSIC',internet:'INTERNET CULTURE',beauty:'BEAUTY',lifestyle:'LIFESTYLE',culture:'ART & CULTURE'};
  const STATE = {feed:FALLBACK,section:'discover',filter:'all',search:'',sort:'recent',liveFilter:'all',saved:loadSaved()};
  const $ = id => document.getElementById(id);
  function loadSaved(){try{return JSON.parse(localStorage.getItem('cs:saved')||'[]')}catch{return []}}
  function writeSaved(){try{localStorage.setItem('cs:saved',JSON.stringify(STATE.saved))}catch{}}
  const safeURL=s=>/^https?:\/\//i.test(String(s||''))?String(s):'#';
  const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function compactDate(s){return s ? String(s).slice(0,10).replaceAll('-','.'):'—'}
  function chinaTime(value){if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?compactDate(value):new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replaceAll('/','.');}
  function isRecent(s,days){const t=Date.parse(s);return Number.isFinite(t) && Date.now()-t < days*864e5 && Date.now()-t >=-864e5}
  function sortDate(s){const q=/^(20\d\d)-Q([1-4])$/.exec(s||'');if(q)return `${q[1]}-${String(Number(q[2])*3).padStart(2,'0')}-30`;return s||'0000-00-00';}
  function evidenceTag(d){return d.evidence==='quantified'?'<span class="tag-quant">● DATA BACKED</span>':'<span class="tag-report">○ PRESS / OBSERVED</span>'}
  function picture(d){const text=d.category==='music'?'SOUND / 26':d.category==='internet'?'internet culture':d.category==='beauty'?'beauty notes':d.category==='lifestyle'?'objects & rituals':'CULTURE';const safeColor=/^#[0-9a-fA-F]{6}$/.test(d.accent||'')?d.accent:'#667363';
    return `${d.image?`<img src="${escapeHTML(d.image)}" alt="${escapeHTML(d.english||d.headline)}" loading="lazy" onerror="this.style.display='none'">`:''}<div class="art-placeholder ${d.category==='music'?'art-music':''}" style="background:${safeColor};z-index:-1"><b>${escapeHTML(text)}</b><small>CULTURE SIGNAL / 2026</small></div>`
  }
  function sortDate(s){const m=String(s||'').match(/^(\d{4})-Q([1-4])$/);if(m)return `${m[1]}-${String(+m[2]*3).padStart(2,'0')}-30`;return /^\d{4}-\d{2}$/.test(s)?s+'-01':String(s||'')}
  function getEditorial(){let r=(STATE.feed.editorial||[]).filter(d=>(STATE.filter==='all'||d.category===STATE.filter));if(STATE.search){const q=STATE.search.toLowerCase();r=r.filter(d=>[d.headline,d.english,d.lede,d.category,...(d.keywords||[]),...(d.items||[])].join(' ').toLowerCase().includes(q));}r.sort((a,b)=>STATE.sort==='proof'?Number(b.evidence==='quantified')-Number(a.evidence==='quantified')||sortDate(b.published).localeCompare(sortDate(a.published)):sortDate(b.published).localeCompare(sortDate(a.published)));return r;}
  function card(d){const saved=STATE.saved.includes(d.id);return `<article class="story-card" data-story="${escapeHTML(d.id)}" tabindex="0" aria-label="阅读：${escapeHTML(d.headline)}"><div class="story-art">${picture(d)}<button class="card-save ${saved?'is-saved':''}" data-save="${escapeHTML(d.id)}" aria-label="${saved?'取消收藏':'收藏'}">${saved?'★':'☆'}</button><span class="card-label">${escapeHTML(CATEGORY[d.category]||d.category)} / ${escapeHTML(d.region||'Global')}</span></div><div class="story-meta">${evidenceTag(d)}<span>${compactDate(d.published)}</span></div><h3>${escapeHTML(d.headline)}</h3><p>${escapeHTML(d.lede)}</p><div class="story-bottom"><span>${d.metric?`<span class="metric">${escapeHTML(d.metric.value)}</span> · ${escapeHTML(d.metric.label)}`:escapeHTML(d.source?.name||'SOURCE CHECKED')}</span><span class="arrow">↗</span></div></article>`}
  function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__cs_toast);window.__cs_toast=setTimeout(()=>t.classList.remove('show'),2300)}
  function toggleSave(id){const idx=STATE.saved.indexOf(id);if(idx>=0){STATE.saved.splice(idx,1);toast('Removed from Saved')}else{STATE.saved.push(id);toast('Saved to your collection')};writeSaved();renderStories();renderSaved();$('sideSavedCount').textContent=STATE.saved.length;const open=document.querySelector('.drawer.open');if(open?.dataset.id===id){const btn=open.querySelector('[data-drawer-save]');if(btn)btn.textContent=STATE.saved.includes(id)?'★ Saved':'☆ Save story';}}
  function openStory(id){const d=(STATE.feed.editorial||[]).find(v=>v.id===id);if(!d)return;const metric=d.metric?`<div class="drawer-data"><div><strong>${escapeHTML(d.metric.value)}</strong><span>${escapeHTML(d.metric.label)} · ${escapeHTML(d.metric.context)}</span></div><small>OBSERVED<br>${escapeHTML(d.metric.as_of)}</small></div>`:'';
    $('drawerContent').innerHTML=`<div class="drawer-inner"><div class="drawer-top"><span>IN THE KNOW / STORY ${escapeHTML(id.toUpperCase().slice(0,12))}</span><button class="drawer-close" id="drawerClose" aria-label="关闭详情">×</button></div><div class="drawer-hero">${picture(d)}</div><div class="drawer-meta"><span>${escapeHTML(CATEGORY[d.category]||d.category)} / ${escapeHTML(d.region||'Global')}</span><span>${compactDate(d.published)}</span></div><h2>${escapeHTML(d.headline)}</h2><div class="drawer-english">${escapeHTML(d.english||'')}</div><p class="drawer-lede">${escapeHTML(d.lede)}</p>${metric}<div class="drawer-section"><h4>WHAT'S ACTUALLY HAPPENING / 观察与边界</h4><p>${escapeHTML(d.why)}</p></div><div class="drawer-section"><h4>THE DETAILS / 单品 · 内容</h4><div class="item-list">${(d.items||[]).map(x=>`<span>${escapeHTML(x)}</span>`).join('')}</div></div><div class="drawer-section"><h4>KEYWORDS / 海外关键词</h4><div class="keyword-wrap">${(d.keywords||[]).map(x=>`<span>${escapeHTML(x)}</span>`).join('')}</div></div><div class="drawer-section"><h4>PROVENANCE / 信息出处</h4><p>${escapeHTML(d.source?.name)} · ${escapeHTML(d.source?.date)}${(d.additional_sources||[]).map(s=>`<br><a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.name)} ↗</a>`).join('')}<br>证据类型：${d.evidence==='quantified'?'可核验的来源量化指标（须注意统计口径）':'行业媒体 / 社交趋势观察'}</p></div><div class="drawer-actions"><a href="${escapeHTML(safeURL(d.source?.url))}" target="_blank" rel="noopener noreferrer">View original source ↗</a><button data-drawer-save="${escapeHTML(id)}">${STATE.saved.includes(id)?'★ Saved':'☆ Save story'}</button></div>${d.image_credit?`<div class="drawer-credit">IMAGE: ${escapeHTML(d.image_credit)} · linked from original publisher; availability may vary</div>`:''}</div>`;
    $('drawer').dataset.id=id;$('drawer').classList.add('open');$('overlay').classList.add('open');$('drawer').setAttribute('aria-hidden','false');$('overlay').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('drawerClose').addEventListener('click',closeDrawer);
  }
  function closeDrawer(){$('drawer').classList.remove('open');$('overlay').classList.remove('open');$('drawer').setAttribute('aria-hidden','true');$('overlay').setAttribute('aria-hidden','true');document.body.style.overflow=''}
  function renderStories(){const arr=getEditorial();$('countRead').textContent=arr.length;$('storyGrid').innerHTML=arr.length?arr.map(card).join(''):'<div class="empty-state"><strong>No signals matched.</strong>试试调整分类或者搜索关键词。</div>'}
  function spotlightItems(){
    const news=(STATE.feed.live||[]).filter(item=>item.type==='news'&&isRecent(item.observed,4)&&safeURL(item.url)!=='#').sort((left,right)=>String(right.observed).localeCompare(String(left.observed)));
    if(!news.length)return [];
    const newestTime=Date.parse(news[0].observed);
    const lead=news.find(item=>item.category==='fashion'&&newestTime-Date.parse(item.observed)<12*3600000)||news[0];
    const selected=[lead];
    const different=news.find(item=>item.id!==lead.id&&item.category!==lead.category);
    if(different)selected.push(different);
    const nextFashion=news.find(item=>!selected.some(chosen=>chosen.id===item.id)&&item.category==='fashion'&&item.source!==lead.source);
    const third=nextFashion||news.find(item=>!selected.some(chosen=>chosen.id===item.id));
    if(third)selected.push(third);
    return selected;
  }
  function spotlightCard(item,large){
    const image=item.image?'<img src="'+escapeHTML(safeURL(item.image))+'" alt="" loading="lazy" onerror="this.style.display=\'none\'">':'';
    const metric=item.metric?'<span class="spotlight-metric">'+escapeHTML(item.metric.value)+' · '+escapeHTML(item.metric.label)+'</span>':'';
    return '<a class="spotlight-card '+(large?'spotlight-main':'spotlight-small')+'" href="'+escapeHTML(safeURL(item.url))+'" target="_blank" rel="noopener noreferrer">'+
      '<div class="spotlight-art">'+image+'<span>'+escapeHTML(CATEGORY[item.category]||'CULTURE')+'</span></div>'+
      '<div class="spotlight-copy"><span class="spotlight-kicker">'+escapeHTML(CATEGORY[item.category]||'CULTURE')+' / NEW SOURCE LEAD</span>'+
      '<h3>'+escapeHTML(item.title)+'</h3>'+
      '<div class="spotlight-source">'+escapeHTML(item.source||'Original source')+' ↗ · '+compactDate(item.observed)+'</div>'+
      '<p>媒体提及是线索，不等于已证实流行。'+metric+'</p></div></a>';
  }
  function renderLead(){
    const selected=spotlightItems();
    if(!selected.length){$('leadGrid').innerHTML='<div class="spotlight-empty"><strong>正在等待新的海外线索</strong><p>当前没有近四天的可用新闻来源。下方仍可查看有日期的编辑档案，或到 Daily Signals 阅读原始搜索与榜单数据。</p><button data-nav="latest">查看全部线索 ↗</button></div>';return;}
    $('leadGrid').innerHTML=spotlightCard(selected[0],true)+'<div class="spotlight-side">'+selected.slice(1).map(item=>spotlightCard(item,false)).join('')+'</div>';
  }
  function renderWire(){
    const target=$('wireSection');if(!target)return;
    const featured=new Set(spotlightItems().map(item=>item.id));
    const live=(STATE.feed.live||[]).filter(item=>item.type==='news'&&isRecent(item.observed,4)&&!featured.has(item.id)).sort((left,right)=>String(right.observed).localeCompare(String(left.observed))).slice(0,6);
    if(!live.length){target.classList.add('hidden');return;}
    target.classList.remove('hidden');
    $('wireGrid').innerHTML=live.map(item=>'<a class="wire-card" href="'+escapeHTML(safeURL(item.url))+'" target="_blank" rel="noopener noreferrer"><div><span class="wire-type">'+escapeHTML(CATEGORY[item.category]||'CULTURE')+' / PRESS</span><span class="wire-arrow">↗</span></div><h3>'+escapeHTML(item.title)+'</h3><p>'+escapeHTML(item.source||'Original source')+' · '+compactDate(item.observed)+'</p></a>').join('');
  }
  function renderSaved(){const arr=(STATE.feed.editorial||[]).filter(d=>STATE.saved.includes(d.id));$('savedGrid').innerHTML=arr.length?arr.map(card).join(''):'<div class="empty-state"><strong>Your collection starts here.</strong>点击资讯图片右上角的 ☆ 来收藏你在意的文化信号。</div>'}
  function chartLinks(){
    const charts=STATE.feed.charts||[];
    return [['GLOBAL','Spotify 全球周榜','global'],['US','Spotify 美国周榜','us']].map(([region,title,slug])=>{
      const chart=charts.find(item=>item.source?.includes('Spotify')&&item.region===region);
      return '<a class="chart-link" href="https://kworb.net/spotify/country/'+slug+'_weekly.html" target="_blank" rel="noopener noreferrer"><span>SPOTIFY / '+region+'</span><h3>'+title+' ↗</h3><p>查看完整歌曲排名与周播放量 · 榜单日期 '+compactDate(chart?.observed)+'</p></a>';
    }).join('');
  }
  function renderLive(){
    const chartView=STATE.liveFilter==='chart';
    const items=chartView?[]:(STATE.feed.live||[]).filter(item=>STATE.liveFilter==='all'||item.type===STATE.liveFilter).sort((left,right)=>String(right.observed||'').localeCompare(String(left.observed||'')));
    if(chartView){
      $('liveFeed').innerHTML='<div class="chart-links">'+chartLinks()+'</div>';
      $('liveStatus').textContent='MUSIC CHARTS · LAST SYNC '+chinaTime(STATE.feed.updated_at)+' 北京时间';
    }else{
      $('liveFeed').innerHTML=items.length?items.slice(0,80).map(item=>{
        const metric=item.metric?'<strong>'+escapeHTML(item.metric.value)+'</strong>'+escapeHTML(item.metric.label):escapeHTML(compactDate(item.observed));
        const image=item.image?'<img class="live-image" src="'+escapeHTML(safeURL(item.image))+'" alt="'+escapeHTML(item.image_credit||item.title)+'" loading="lazy" onerror="this.style.display=\'none\'">':'';
        return '<article class="live-item"><div class="live-type">'+escapeHTML((item.type||'news').toUpperCase())+'<br>'+escapeHTML(item.region||'')+'</div><div class="live-body">'+image+'<div><h3>'+escapeHTML(item.title)+'</h3><p>'+escapeHTML(item.source||'')+' · '+escapeHTML(compactDate(item.observed))+'<br>'+escapeHTML(item.note||'')+(item.image_credit?'<br>IMAGE: '+escapeHTML(item.image_credit):'')+'</p></div></div><div class="live-right">'+metric+'</div><a href="'+escapeHTML(safeURL(item.url))+'" target="_blank" rel="noopener noreferrer" aria-label="查看原始来源">↗</a></article>';
      }).join(''):'<div class="empty-state"><strong>Not yet synced.</strong>暂时没有这类新线索。已注明日期的编辑档案仍可在首页查看。</div>';
      $('liveStatus').textContent=items.length?items.length+' ITEMS · LAST SYNC '+chinaTime(STATE.feed.updated_at)+' 北京时间':'NO NEW LEADS · LAST SYNC '+chinaTime(STATE.feed.updated_at)+' 北京时间';
    }
    let warning=$('liveErrors');if(!warning){warning=document.createElement('p');warning.id='liveErrors';warning.className='live-errors';$('liveFeed').before(warning)}
    warning.textContent=(STATE.feed.errors||[]).length?'部分来源本次未更新：'+STATE.feed.errors.map(error=>error.split(':')[0]).join('、')+'。详情见公开数据文件。':'';
  }
  function navigate(page){STATE.section=page;['discover','latest','saved','sources'].forEach(section=>{$(section+'View').classList.toggle('hidden',section!==page)});document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===page));if(page==='saved')renderSaved();if(page==='latest')renderLive();if(page==='discover')renderStories();window.scrollTo({top:0,behavior:'smooth'});}
  function setFilter(f){STATE.filter=f;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===f));navigate('discover');}
  function updateSync(){const data=STATE.feed;const isFresh=isRecent(data.updated_at,1/24);$('syncLabel').textContent=data.mode==='auto'?(isFresh?'最近采集 · ':'更新延迟 · ')+chinaTime(data.updated_at)+' 北京时间':'编辑快照 · '+compactDate(data.updated_at);$('statusDot').className='status-dot '+(isFresh&&data.mode==='auto'?'ready':'stale');$('sidebarRefresh').textContent=data.mode==='auto'?'LAST SYNC · '+chinaTime(data.updated_at)+' CST':'FIRST EDITION · OCT 2026'}
  function addHandlers(){document.addEventListener('click',event=>{const save=event.target.closest('[data-save]');if(save){event.stopPropagation();toggleSave(save.dataset.save);return}const drawerSave=event.target.closest('[data-drawer-save]');if(drawerSave){toggleSave(drawerSave.dataset.drawerSave);return}const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return}const story=event.target.closest('[data-story]');if(story){openStory(story.dataset.story);return}const filter=event.target.closest('[data-filter]');if(filter){setFilter(filter.dataset.filter);return}const topic=event.target.closest('[data-topic]');if(topic){setFilter(topic.dataset.topic);return}const live=event.target.closest('[data-live]');if(live){STATE.liveFilter=live.dataset.live;document.querySelectorAll('[data-live]').forEach(b=>b.classList.toggle('active',b.dataset.live===STATE.liveFilter));renderLive();return}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();if((e.key==='Enter'||e.key===' ')&&!['INPUT','TEXTAREA','BUTTON','SELECT','A'].includes(e.target.tagName)){const story=e.target.closest('[data-story]');if(story){e.preventDefault();openStory(story.dataset.story)}}});$('overlay').addEventListener('click',closeDrawer);$('searchInput').addEventListener('input',e=>{STATE.search=e.target.value.trim();renderStories()});$('sortSelect').addEventListener('change',e=>{STATE.sort=e.target.value;renderStories()});$('aboutQuick').addEventListener('click',()=>navigate('sources'));
  }
  function boot(){const now=new Date();$('todayDate').textContent=now.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}).toUpperCase();$('sideSavedCount').textContent=STATE.saved.length;document.querySelector('[data-live="chart"]').textContent='Music charts';addHandlers();renderLead();renderStories();renderSaved();renderLive();renderWire();updateSync();if(location.protocol!=='file:'){setInterval(()=>{updateSync();if(!document.hidden)refresh()},5*60*1000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});}}
  async function refresh(){if(location.protocol==='file:')return;try{const res=await fetch(`data/feed.json?refresh=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw new Error('Feed not reachable');const d=await res.json();if(!Array.isArray(d.editorial)||!Array.isArray(d.live))throw new Error('Invalid feed');STATE.feed=d;renderLead();renderStories();renderSaved();renderLive();renderWire();updateSync();}catch(err){console.warn('Using bundled verified editorial snapshot:',err.message)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{boot();refresh()});else{boot();refresh()}
})();
