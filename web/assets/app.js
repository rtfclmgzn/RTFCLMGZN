/* RTFCLMGZN front-end v2 — hash router rendering from the data layer.
   No build step, no fetch: content loads as JS globals so it runs over file:// too. */
(function(){
  var PERSONAS = window.RTFC_PERSONAS || [];
  var SECTIONS = window.RTFC_SECTIONS || [];
  var PENDING = window.RTFC_PENDING_REVIEW || [];
  var COST = window.RTFC_COST_CONFIG || {models:{},discounts:{}};
  var USAGE = window.RTFC_USAGE_LOG || [];
  var SOCIAL = window.RTFC_SOCIAL_POSTS || [];
  var MAG = (window.RTFC_MAGAZINE_ISSUES || []).slice().sort(function(a,b){return b.number-a.number;});
  var GUIDES = window.RTFC_GUIDES || [];
  var RES = window.RTFC_RESOURCES || [];
  var BUZZ = window.RTFC_BUZZ || [];

  /* ---------- reader library (localStorage; syncs to account at public launch) ---------- */
  function libGet(){
    try{ var raw=localStorage.getItem("rtfc-lib"); if(raw) return JSON.parse(raw); }catch(e){}
    return { bookmarks:[], readLater:[], account:null };
  }
  function libSave(l){ try{ localStorage.setItem("rtfc-lib",JSON.stringify(l)); }catch(e){} }
  function inList(list,id){ return list.indexOf(id)>=0; }
  window.rtfcToggle=function(kind,id,ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    var l=libGet(), list=(kind==="bookmark")?l.bookmarks:l.readLater;
    var i=list.indexOf(id); if(i>=0) list.splice(i,1); else list.push(id);
    libSave(l); route();
  };
  window.rtfcSignup=function(){
    var em=document.getElementById("acct-email"); if(!em||!em.value||em.value.indexOf("@")<1){ if(em) em.style.borderColor="var(--gate)"; return; }
    var l=libGet(); l.account={ email:em.value, plan:"free", since:new Date().toISOString() }; libSave(l); route();
  };
  window.rtfcPlan=function(plan){ var l=libGet(); if(!l.account) return; l.account.plan=plan; libSave(l); route(); };
  window.rtfcSignout=function(){ var l=libGet(); l.account=null; libSave(l); route(); };
  /* reactions — per-article, local, honest (no fake counts; server counts arrive with backend) */
  var REACTS=[{k:"mind",e:"💡",l:"Expanded my mind"},{k:"useful",e:"🛠",l:"I'll use this"},{k:"fire",e:"🔥",l:"Great read"}];
  window.rtfcReact=function(id,k,ev){
    if(ev){ev.preventDefault();ev.stopPropagation();}
    var l=libGet(); l.reactions=l.reactions||{};
    var arr=l.reactions[id]=l.reactions[id]||[];
    var i=arr.indexOf(k); if(i>=0) arr.splice(i,1); else arr.push(k);
    libSave(l); route();
  };
  function reactsHTML(id){
    var l=libGet(); var mine=(l.reactions||{})[id]||[];
    return '<div class="reacts"><span class="reacts-l">How did this piece land?</span>'+
      REACTS.map(function(r){
        var on=mine.indexOf(r.k)>=0;
        return '<button class="react'+(on?' on':'')+'" onclick="rtfcReact(\''+id+'\',\''+r.k+'\',event)">'+r.e+' '+r.l+(on?' ✓':'')+'</button>';
      }).join("")+'</div>';
  }
  window.rtfcDismissPrimer=function(){ try{localStorage.setItem("rtfc-primer-seen","1");}catch(e){} route(); };
  function saveBtns(id,small){
    var l=libGet();
    var b=inList(l.bookmarks,id), r=inList(l.readLater,id);
    return '<span class="savebtns'+(small?' sm':'')+'">'+
      '<button class="sv'+(b?' on':'')+'" title="'+(b?'Bookmarked':'Bookmark')+'" onclick="rtfcToggle(\'bookmark\',\''+id+'\',event)">'+(b?'♥':'♡')+'</button>'+
      '<button class="sv'+(r?' on':'')+'" title="'+(r?'In read-later':'Read later')+'" onclick="rtfcToggle(\'later\',\''+id+'\',event)">'+(r?'◷':'○')+'</button></span>';
  }
  var ARTICLES = (window.RTFC_ARTICLES || []).concat(window.RTFC_LIVE_ARTICLES || []).concat(window.RTFC_NEWSROOM_ARTICLES || []).concat(window.RTFC_RESEARCH || [])
    .slice().sort(function(a,b){ return new Date(b.publishedAt) - new Date(a.publishedAt); });
  // Section colors/glyphs mirror the desks (each section is one editor's beat)
  var SECTION_COLORS = {Frontier:"#8b7cf7",Products:"#e0564d",Compute:"#6cb6f0",Policy:"#42c08a",Health:"#d9a94e",Markets:"#c48af0",Robotics:"#4dd0c4",Opinion:"#c98b5a",Ethics:"#7bb274",Guide:"#e8865f"};
  var FMT = {brief:"Brief",synthesis:"Synthesis",research:"Research"};
  var GLYPHS = {Frontier:"◆",Products:"◉",Compute:"▞",Policy:"◍",Health:"✚",Markets:"◈",Robotics:"⟁",Opinion:"❝",Ethics:"⚖",Guide:"✎"};

  function persona(key){ for(var i=0;i<PERSONAS.length;i++) if(PERSONAS[i].key===key) return PERSONAS[i]; return null; }
  // Active masthead only — retired personas stay resolvable via persona() for
  // historical bylines but never appear in listings, filters, or counts.
  function activePersonas(){ return PERSONAS.filter(function(p){ return !p.retired; }); }
  function article(slug){
    for(var i=0;i<ARTICLES.length;i++) if(ARTICLES[i].slug===slug) return ARTICLES[i];
    for(var j=0;j<GUIDES.length;j++) if(GUIDES[j].slug===slug) return GUIDES[j];
    return null;
  }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function slugify(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,40); }
  // Magazine rich text: **bold** · ==highlight== · ++accent++ (escaped first, so it's safe)
  function fmt(s){
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
      .replace(/==(.+?)==/g,'<mark class="mk">$1</mark>')
      .replace(/\+\+(.+?)\+\+/g,'<span class="acc">$1</span>');
  }
  function initials(name){ return name.split(" ").map(function(w){return w[0];}).join("").replace(/[^A-Za-z]/g,"").slice(0,2).toUpperCase(); }
  function hexRgba(hex,a){
    var h=hex.replace("#",""); var n=parseInt(h,16);
    return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")";
  }
  function when(iso){
    var d=new Date(iso), now=new Date(), h=Math.round((now-d)/3.6e6);
    if(h<1) return "just now"; if(h<24) return h+"h ago";
    return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});
  }
  function artStyle(section,deep){
    var c=SECTION_COLORS[section]||"#8b7cf7";
    return 'background:linear-gradient(140deg,'+hexRgba(c,deep?0.42:0.30)+' 0%,'+hexRgba(c,0.08)+' 58%,transparent 100%),var(--surface2);';
  }
  function artFill(a,deep){
    if(a.image) return "background:linear-gradient(180deg,rgba(11,11,18,0) 45%,rgba(11,11,18,.62) 100%),url('"+a.image+"') center/cover no-repeat,var(--surface2);";
    return artStyle(a.section,deep);
  }
  function artGlyph(a,col,extra){
    if(a.image) return "";
    return '<span class="glyph" style="color:'+col+(extra||"")+'">'+GLYPHS[a.section]+'</span>';
  }
  // Persona avatar: photo when the persona has one (p.photo), otherwise the
  // initials-on-gradient fallback. Photo avatars keep the persona color as a ring.
  function avatar(p,extra){
    if(p.photo){
      return '<span class="av av-photo" style="background-image:url(\''+p.photo+'\');border-color:'+p.color+';'+(extra||"")+'" role="img" aria-label="'+esc(p.name)+'"></span>';
    }
    return '<span class="av" style="background:linear-gradient(135deg,'+p.color+','+hexRgba(p.color,0.65)+');'+(extra||"")+'">'+initials(p.name)+'</span>';
  }
  // Masthead lightbox — an enlarged closeup of the editor's avatar. Closes on ×,
  // backdrop click, or Escape. Works for photo and initials avatars alike.
  window.rtfcAvatarPop=function(key){
    var p=persona(key); if(!p) return;
    var old=document.getElementById("av-lightbox"); if(old) old.remove();
    var face=p.photo
      ? '<div class="avl-img" style="background-image:url(\''+p.photo+'\')"></div>'
      : '<div class="avl-img avl-initials" style="background:linear-gradient(135deg,'+p.color+','+hexRgba(p.color,0.65)+')">'+initials(p.name)+'</div>';
    var el=document.createElement("div");
    el.id="av-lightbox"; el.className="av-lightbox"; el.setAttribute("role","dialog"); el.setAttribute("aria-label",p.name);
    el.innerHTML='<div class="avl-card">'+face+
      '<button class="avl-x" aria-label="Close">✕</button>'+
      '<div class="avl-cap"><b>'+esc(p.name)+'</b><span>'+esc(p.beat)+'</span></div></div>';
    el.addEventListener("click",function(e){
      if(e.target===el || (e.target.closest && e.target.closest(".avl-x"))) close();
    });
    function close(){ el.classList.remove("open"); document.removeEventListener("keydown",onKey); setTimeout(function(){ el.remove(); },180); }
    function onKey(e){ if(e.key==="Escape") close(); }
    document.addEventListener("keydown",onKey);
    document.body.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add("open"); });
  };
  // Reading time and format are DERIVED from the actual article text — never stored,
  // never guessed. A piece cannot claim a length it doesn't have.
  function wordCount(a){
    if(!a||!a.body) return 0;
    return a.body.reduce(function(n,b){ return n + (b.text? b.text.trim().split(/\s+/).filter(Boolean).length : 0); }, 0);
  }
  function readTime(a){ return Math.max(1, Math.round(wordCount(a)/225)); } // ~225 wpm
  function trueFormat(a){
    // THREE formats only (founder-locked 2026-07-12). Length ladder:
    //   Brief    ~300w   (target 250–450)  — the quick daily hit
    //   Synthesis ~1,200w (target 800–1,900) — the standard full feature
    //   Research  ~3,500w (2,200+, multi-editor, 2–3 charts) — the flagship investigation
    if((a.authors&&a.authors.length>1) || (a.format==="research")) return "research";
    var w=wordCount(a);
    if(w>=2200) return "research";
    if(w>=650) return "synthesis";
    return "brief";
  }
  // Named byline — one persona, or a research collaboration of 2–4 (a.authors = [key,...]).
  function authorNames(a,fallback){
    if(a && a.authors && a.authors.length){
      var ns=a.authors.map(function(k){ var pp=persona(k); return pp?pp.name:k; });
      if(ns.length===1) return ns[0];
      return ns.slice(0,-1).join(", ")+" & "+ns[ns.length-1];
    }
    return fallback;
  }
  function bylineHTML(p,iso,mins,a){
    return '<div class="byline">'+avatar(p)+'<span>By <b>'+esc(authorNames(a,p.name))+'</b> · '+when(iso)+(mins?' · '+mins+' min':'')+'</span></div>';
  }
  function tagsHTML(a){
    var col=SECTION_COLORS[a.section]||"#8b7cf7";
    var h='<div class="tags"><span class="pill section" style="background:'+col+'">'+esc(a.section)+'</span>'+
          '<span class="pill fmt">'+FMT[trueFormat(a)]+'</span>';
    if(a.sample) h+='<span class="pill sample">Sample</span>';
    return h+'</div>';
  }

  function cardHTML(a){
    var p=persona(a.persona), col=SECTION_COLORS[a.section]||"#8b7cf7";
    return '<a class="card" href="#/article/'+a.slug+'">'+
      '<div class="art" style="'+artFill(a)+'">'+artGlyph(a,col)+saveBtns(a.id)+'</div>'+
      tagsHTML(a)+'<h3>'+esc(a.title)+'</h3>'+
      '<p class="dek">'+esc(a.dek)+'</p>'+bylineHTML(p,a.publishedAt,readTime(a),a)+'</a>';
  }
  function railHTML(a){
    var p=persona(a.persona);
    return '<a class="rail-item" href="#/article/'+a.slug+'">'+tagsHTML(a)+
      '<h4>'+esc(a.title)+'</h4>'+bylineHTML(p,a.publishedAt,null,a)+'</a>';
  }
  function featureHTML(a){
    var p=persona(a.persona), col=SECTION_COLORS[a.section]||"#8b7cf7";
    return '<a class="feature" href="#/article/'+a.slug+'">'+
      '<div class="art" style="'+artFill(a,true)+'">'+artGlyph(a,col)+
        '<span class="beatline">'+esc(a.section)+' — '+FMT[trueFormat(a)]+'</span></div>'+
      '<div style="margin-top:20px">'+tagsHTML(a)+'</div>'+
      '<h3 style="margin-top:12px">'+esc(a.title)+'</h3>'+
      '<p class="dek">'+esc(a.dek)+'</p>'+bylineHTML(p,a.publishedAt,readTime(a),a)+'</a>';
  }

  /* ---------- views ---------- */
  function editionHTML(){
    var d=new Date();
    return '<div class="edition"><span class="date">'+
      d.toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"})+
      '</span><span class="motto">AI news, written by AI, about AI</span></div>';
  }
  function viewHome(){
    // The homepage lead is always the newest article. A stale top:true flag must
    // never pin one image and story to this slot indefinitely.
    var top=ARTICLES[0];
    var rest=ARTICLES.filter(function(a){return a!==top;});
    var side=rest.slice(0,3), grid=rest.slice(3);
    var h='<div class="container">'+editionHTML();
    if(window.speechSynthesis){
      var B0=briefingScript();
      if(B0) h+='<div class="home-chips"><a class="brief-chip" href="#/briefing">▶ <b>The Daily Briefing</b><span>today\'s AI, read to you · ~'+B0.mins+' min</span></a></div>';
    }
    var seen; try{seen=localStorage.getItem("rtfc-primer-seen");}catch(e){}
    if(!seen){
      h+='<a class="primer-banner" href="#/read/primer">'+
        '<span class="pb-art" style="background:url(\'assets/img/primer-cover.jpg\') center/cover"></span>'+
        '<span class="pb-txt"><b>New to AI? Start with The Primer.</b>'+
        '<span>Our free field guide to the whole AI world — who the players are, what the words mean, and what it can do for you tonight. 12 pages, no jargon walls.</span></span>'+
        '<span class="pb-go">Read free →</span>'+
        '<button class="pb-x" onclick="rtfcDismissPrimer();event.preventDefault();event.stopPropagation();" title="Dismiss">✕</button></a>';
    }
    h+='<div class="top-slot"><div>'+featureHTML(top)+'</div><div class="rail">'+side.map(railHTML).join("")+'</div></div>';
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Latest across the desk</div>';
    h+='<div class="grid">'+grid.map(cardHTML).join("")+'</div>';
    h+=eventsHomeHTML();
    h+='<div class="home-nl">'+newsletterHTML(true)+'</div>';
    return h+'</div>';
  }
  function viewSection(key){
    var sec=null; for(var i=0;i<SECTIONS.length;i++) if(SECTIONS[i].key===key) sec=SECTIONS[i];
    if(!sec) return notFound();
    var list=ARTICLES.filter(function(a){return a.section===key;});
    var col=SECTION_COLORS[key]||"#8b7cf7";
    var ed=sec.editor?persona(sec.editor):null;
    var h='<div class="container"><div class="desk-head" style="background:radial-gradient(640px 300px at 12% -10%,'+col+'26,transparent 68%);border-radius:18px">'+
      '<div><div class="kicker" style="margin:0 0 10px"><span class="dotc" style="background:'+col+'"></span>The '+esc(sec.label)+' Desk</div>'+
      '<h1 class="desk-title">'+esc(sec.label)+'</h1>'+
      (sec.desc?'<p class="desk-desc">'+esc(sec.desc)+'</p>':'')+'</div>'+
      (ed?('<a class="desk-editor" href="#/persona/'+ed.key+'">'+avatar(ed)+
        '<span><em>Desk editor</em><b>'+esc(ed.name)+'</b><span>'+esc(ed.tone)+'</span></span></a>'):'')+
      '</div>';
    h+='<div class="kicker"><span class="dotc" style="background:'+col+'"></span>'+list.length+(list.length===1?' story':' stories')+'</div>';
    h+= list.length? '<div class="grid">'+list.map(cardHTML).join("")+'</div>'
                   : '<p style="color:var(--muted)">No stories on this desk yet — the pipeline fills it as news breaks.</p>';
    return h+'</div>';
  }
  function viewMasthead(){
    var h='<div class="container"><div class="mast-hero">'+
      '<div class="over">The Masthead</div>'+
      '<h1>Written by machines.<br>Edited like a magazine.</h1>'+
      '<p>RTFCLMGZN is produced end-to-end by a coordinated system of AI editorial agents — nine writers with real beats, distinct voices, and standing rules about what they will and won’t claim. Every piece moves through a <b>twelve-stage production pipeline</b> — including dedicated art-direction, layout, and link-enrichment passes — and anything touching health, money, law, or a named person’s reputation is adjudicated by an <b>AI Editor-in-Chief recommendation layer</b> that sources, reframes, or disclaims it before publishing. A Standards Editor grades our predictions and logs our corrections in public. Fully autonomous — no human in the publishing loop.</p></div>';
    var ACTIVE=activePersonas();
    h+='<div class="mast-strip">'+
      '<div class="cell"><div class="num">'+(ACTIVE.length+17)+'</div><div class="lbl">AI agents — writers, editors, an AI Editor-in-Chief, a Standards Editor &amp; a weekly self-review</div></div>'+
      '<div class="cell"><div class="num">'+ACTIVE.length+'</div><div class="lbl">editorial personas with named beats</div></div>'+
      '<div class="cell"><div class="num">12</div><div class="lbl">pipeline stages on every story</div></div>'+
      '<div class="cell"><div class="num">0</div><div class="lbl">humans in the publishing loop</div></div></div>';
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>The editors</div>';
    h+='<div class="mast-grid mast-3x3">'+ACTIVE.map(function(p){
      return '<a class="mast-card" href="#/persona/'+p.key+'">'+
        '<span class="av-pop" title="Enlarge" data-persona="'+p.key+'">'+avatar(p)+'</span>'+
        '<h3>'+esc(p.name)+'</h3>'+
        '<div class="beat">'+esc(p.beat)+'</div>'+
        '<div class="tone">'+esc(p.tone)+'</div></a>';
    }).join("")+'</div>';
    h+='<p style="color:var(--muted);font-size:14px;margin:26px 0 10px">Curious how the machine actually runs? '+
       '<a href="../agents/newsroom-map.html" style="color:var(--accent2)">See the full newsroom system map →</a></p>';
    return h+'</div>';
  }
  function viewPersona(key){
    var p=persona(key); if(!p) return notFound();
    var list=ARTICLES.filter(function(a){return a.persona===key;});
    var h='<div class="container"><div style="padding-top:26px"><a class="back" href="#/masthead">← The masthead</a></div>'+
      '<div class="persona-hero">'+avatar(p)+
      '<div><h1>'+esc(p.name)+(p.retired?' <span class="hi" style="background:color-mix(in srgb,var(--muted) 18%,transparent);color:var(--muted);border-color:var(--muted)">Alumni · desk retired</span>':(p.sensitivity==="high"?' <span class="hi">High sensitivity</span>':''))+'</h1>'+
      '<div class="beat">'+esc(p.beat)+'</div><div class="tone">Voice — '+esc(p.tone)+'</div></div></div>'+
      '<p class="persona-bio">'+esc(p.bio)+'</p>'+
      '<div class="kicker">Byline archive · '+list.length+'</div>'+
      '<div class="grid">'+list.map(cardHTML).join("")+'</div></div>';
    return h;
  }
  // The closing takeaway now comes in several flavors — the frame that fits the story,
  // not a forced "put it to work" on everything. Writers set `applyType`; when unset we
  // default by desk so the site reads varied automatically.
  var APPLY_TYPES = {
    work:      {head:"Put it to work",   ic:"➜"},
    watch:     {head:"What to watch",    ic:"◉"},
    matters:   {head:"Why it matters",   ic:"✷"},
    stakes:    {head:"The stakes",       ic:"⚖"},
    bottomline:{head:"The bottom line",  ic:"▪"},
    context:   {head:"Know the context", ic:"◈"},
    numbers:   {head:"By the numbers",   ic:"№"}
  };
  function applyType(a){
    if(a.applyType && APPLY_TYPES[a.applyType]) return a.applyType;
    if((a.format||"")==="brief") return "bottomline";
    var byDesk={Frontier:"watch",Products:"work",Compute:"work",Policy:"stakes",Health:"matters",Markets:"watch",Robotics:"watch",Opinion:"bottomline",Ethics:"stakes",Guide:"work"};
    return byDesk[a.section]||"work";
  }
  function applyLabel(a){ return (APPLY_TYPES[applyType(a)]||APPLY_TYPES.work).head; }
  function applyHTML(a){
    if(!a.apply || !a.apply.length) return "";
    var key=applyType(a), ty=APPLY_TYPES[key]||APPLY_TYPES.work;
    var items=a.apply.map(function(x){
      var label=x.label?'<b>'+esc(x.label)+'</b> ':'';
      return '<li>'+label+esc(x.text)+'</li>';
    }).join("");
    return '<aside class="apply apply-'+key+'"><div class="apply-head"><span class="apply-ic">'+ty.ic+'</span>'+ty.head+'</div>'+
      '<ul>'+items+'</ul></aside>';
  }
  // TL;DR — the story's main points as bullets at the end of the piece, so the gist
  // is scannable at a glance. Schema: a.tldr = ["point", ...]. A jump chip under the
  // cover (rendered in viewArticle) deep-links here via rtfcJump('tldr').
  function tldrHTML(a){
    if(!a.tldr || !a.tldr.length) return "";
    return '<aside class="tldr" id="tldr"><div class="tldr-head"><span class="tldr-ic">⚡</span>TL;DR<span class="tldr-sub">the story at a glance</span></div>'+
      '<ul>'+a.tldr.map(function(x){return '<li>'+fmtBody(x)+'</li>';}).join("")+'</ul></aside>';
  }
  // Action links — when a piece names a product/release/tool, give the reader the door to it.
  // Schema: a.links = [{label, url, note?}]. Rendered as a prominent "Go there" block.
  function linksHTML(a){
    if(!a.links || !a.links.length) return "";
    var items=a.links.map(function(x){
      var ext=x.url && x.url!=="#";
      return '<a class="golink" href="'+esc(x.url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+
        '<span class="gl-label">'+esc(x.label)+'</span>'+(x.note?'<span class="gl-note">'+esc(x.note)+'</span>':'')+
        '<span class="gl-arrow">↗</span></a>';
    }).join("");
    return '<aside class="golinks"><div class="gl-head"><span class="gl-ic">⤤</span>Go there</div>'+items+'</aside>';
  }
  // Guides render as numbered, scannable STEPS — not article prose. Schema: a.steps =
  // [{do, detail?, tip?, example?}], plus optional a.outcome / a.gtime / a.glevel.
  function guideStepsHTML(a){
    if(!a.steps || !a.steps.length) return "";
    var meta='<div class="gd-meta">'+(a.gtime?'<span>⏱ '+esc(a.gtime)+'</span>':'')+
      (a.glevel?'<span>◆ '+esc(a.glevel)+'</span>':'')+'<span>✔ '+a.steps.length+' steps</span></div>';
    var out=a.outcome?'<div class="gd-outcome"><b>By the end</b> '+esc(a.outcome)+'</div>':'';
    var steps=a.steps.map(function(s,i){
      return '<div class="gstep"><div class="gs-n">'+(i+1)+'</div><div class="gs-body">'+
        '<div class="gs-do">'+esc(s.do)+'</div>'+
        (s.detail?'<div class="gs-detail">'+fmt(s.detail)+'</div>':'')+
        (s.example?'<div class="gs-ex"><span class="gs-ex-k">Try this</span>'+fmt(s.example)+'</div>':'')+
        (s.tip?'<div class="gs-tip"><span class="gs-tip-k">Tip</span>'+fmt(s.tip)+'</div>':'')+
        '</div></div>';
    }).join("");
    return '<div class="guidesteps">'+meta+out+'<div class="gs-head">Do it, step by step</div>'+steps+'</div>';
  }
  var PLAT = {
    x:{label:"X", glyph:"𝕏"},
    instagram:{label:"Instagram", glyph:"◎"},
    facebook:{label:"Facebook", glyph:"f"}
  };
  function socialFor(articleId){ for(var i=0;i<SOCIAL.length;i++) if(SOCIAL[i].article_id===articleId) return SOCIAL[i]; return null; }
  function distributionHTML(a){
    var s=socialFor(a.id); if(!s||!s.posts||!s.posts.length) return "";
    var anyPosted=s.posts.some(function(p){return p.status==="posted";});
    var statusPill=anyPosted?'<span class="dist-live">Live</span>':'<span class="dist-dry">Dry-run · staged</span>';
    var cards=s.posts.map(function(p){
      var pl=PLAT[p.platform]||{label:p.platform,glyph:"•"};
      var tags=(p.hashtags||[]).slice(0,6).map(function(t){return '<span class="dist-tag">'+esc(t)+'</span>';}).join("");
      var img=p.image?('<div class="dist-img">🖼 '+(p.image.status==="generated"?'image generated':'image prompt ready')+(p.image.cost_usd?' · '+money(p.image.cost_usd):'')+'</div>'):'';
      return '<div class="dist-card"><div class="dist-head"><span class="dist-glyph">'+pl.glyph+'</span>'+esc(pl.label)+
        '<span class="dist-st '+(p.status==="posted"?"ok":"")+'">'+esc(p.status)+'</span></div>'+
        '<div class="dist-copy">'+esc(p.copy)+'</div>'+
        (tags?'<div class="dist-tags">'+tags+'</div>':'')+img+'</div>';
    }).join("");
    return '<div class="distribution"><div class="dist-title">⇢ Distribution '+statusPill+
      '<span class="dist-note">Platform-native posts generated by the Social agent from this article. FB · IG · X.</span></div>'+
      '<div class="dist-grid">'+cards+'</div></div>';
  }
  function provenanceHTML(a){
    if(!a.pipeline) return "";
    var pl=a.pipeline;
    var h='<div class="provenance"><div class="head">⚙ Pipeline provenance · run '+esc(pl.run)+
      '<span class="pill live livepill">Live</span></div><div class="stages">';
    h+=pl.stages.map(function(s){
      return '<div class="pstage"><span class="tick'+(s.hold?' gatehold':'')+'">'+(s.hold?'⛔':'✓')+'</span>'+
        '<span class="sname">'+esc(s.name)+'</span><span class="sagent">'+esc(s.agent)+'</span>'+
        '<span class="snote">'+esc(s.note)+'</span></div>';
    }).join("");
    h+='</div><div class="gaterow"><b>'+esc(pl.gate.decision)+'</b> — '+esc(pl.gate.note)+'</div></div>';
    return h;
  }
  // richer body text: fmt() + tasteful auto-emphasis of the figures that carry a story
  // (money-with-scale, percentages, multipliers) — subtle, not every number.
  function fmtBody(t){
    var s=fmt(t);
    s=s.replace(/(\$\d[\d.,]*\s?(?:billion|million|trillion|bn\b|B\b|M\b)?|\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?[×x](?=\s|,|\.|$))/g,
      function(m){ return '<span class="fig">'+m+'</span>'; });
    return s;
  }
  // inline data-viz — bar or donut, rendered from an article body block, zero cost, no images.
  var CHART_COLORS=["#8b7cf7","#5aa8d8","#e0b64e","#7bb274","#e0564d","#c48af0","#4dd0c4","#cf9b57"];
  function chartHTML(c){
    if(!c || !c.data || !c.data.length) return "";
    var head='<figcaption class="chart-title">'+esc(c.title||"")+(c.unit?' <span>('+esc(c.unit)+')</span>':'')+'</figcaption>';
    var src=c.source?'<div class="chart-src">Source: '+esc(c.source)+'</div>':'';
    if(c.kind==="pie"||c.kind==="donut"){
      var total=c.data.reduce(function(n,d){return n+(d.value||0);},0)||1, acc=0, C=2*Math.PI*42;
      var segs=c.data.map(function(d,i){
        var frac=(d.value||0)/total, col=d.color||CHART_COLORS[i%CHART_COLORS.length];
        var dash=C*frac, gap=C-dash, off=-C*acc/1; acc+=frac;
        return '<circle r="42" cx="60" cy="60" fill="none" stroke="'+col+'" stroke-width="16" stroke-dasharray="'+dash+' '+gap+'" stroke-dashoffset="'+ (C*0.25 - C*(acc-frac)) +'" transform="rotate(-90 60 60)"></circle>';
      }).join("");
      var legend=c.data.map(function(d,i){
        var col=d.color||CHART_COLORS[i%CHART_COLORS.length];
        return '<li><span class="pl-sw" style="background:'+col+'"></span>'+esc(d.label)+' <b>'+esc(String(d.value))+(c.unit&&c.unit.indexOf("%")>=0?"%":"")+'</b></li>';
      }).join("");
      return '<figure class="chart chart-pie">'+head+'<div class="pie-wrap"><svg viewBox="0 0 120 120" width="150" height="150">'+segs+'</svg><ul class="pie-legend">'+legend+'</ul></div>'+src+'</figure>';
    }
    // default: horizontal bars
    var max=c.data.reduce(function(m,d){return Math.max(m,d.value||0);},0)||1;
    var bars=c.data.map(function(d,i){
      var w=Math.max(2,Math.round((d.value||0)/max*100)), col=d.color||(d.hi?CHART_COLORS[0]:"var(--muted)");
      var vlabel=(c.unit&&c.unit.charAt(0)==="$"?"$":"")+d.value+(c.unit&&c.unit.indexOf("%")>=0?"%":"");
      return '<div class="cbar'+(d.hi?" hi":"")+'"><span class="cb-l">'+esc(d.label)+'</span>'+
        '<div class="cb-track"><i style="width:'+w+'%;background:'+(d.hi?"var(--accent)":"color-mix(in srgb,var(--accent) 55%,transparent)")+'"></i></div>'+
        '<span class="cb-v">'+esc(vlabel)+'</span></div>';
    }).join("");
    return '<figure class="chart chart-bar">'+head+'<div class="cbars">'+bars+'</div>'+src+'</figure>';
  }
  function fullTimestamp(iso){
    var d=new Date(iso);
    var day=d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
    var tm=d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    return day+" · "+tm;
  }
  // Relevant, human download name for an issue PDF:
  //   special issue → rtfclmgzn-the-primer-2026.pdf
  //   numbered      → rtfclmgzn-issue-002-august-2026.pdf
  var MONTH_NAMES=["january","february","march","april","may","june","july","august","september","october","november","december"];
  function pdfName(iss){
    if(!iss) return "rtfclmgzn.pdf";
    var ym=String(iss.month||"").match(/^(\d{4})-(\d{2})/);
    var year=ym?ym[1]:String(new Date().getFullYear());
    var mo=ym?(MONTH_NAMES[parseInt(ym[2],10)-1]||""):"";
    var base;
    if(iss.special){
      base="rtfclmgzn-"+slugify(iss.title||iss.id||"issue")+"-"+year;
    } else {
      var num=iss.number?("issue-"+String(iss.number).padStart(3,"0")):("issue-"+slugify(iss.id||"x"));
      base="rtfclmgzn-"+num+(mo?"-"+mo:"")+"-"+year;
    }
    return base+".pdf";
  }
  function viewArticle(slug){
    var a=article(slug); if(!a) return notFound();
    var p=persona(a.persona), col=SECTION_COLORS[a.section]||"#8b7cf7";
    var paras=a.body.filter(function(b){return b.type!=="h2"&&b.type!=="quote";});
    var lastP=paras[paras.length-1];
    var toc=[]; var firstP=true;
    // read-along: seg 0 = title/dek, then one seg per spoken block (must mirror rtfcListen's `if(b.text)` sequence)
    var raSeg=0;
    var bodyHTML=a.body.map(function(b){
      if(b.type==="h2"){ raSeg++; var id="s-"+slugify(b.text); toc.push({id:id,t:b.text}); return '<h2 id="'+id+'" data-ra="'+raSeg+'">'+esc(b.text)+'</h2>'; }
      if(b.type==="quote"){ raSeg++; return '<blockquote data-ra="'+raSeg+'">'+fmt(b.text)+'</blockquote>'; }
      if(b.type==="chart") return chartHTML(b.chart||b);
      if(b.type==="stat") return '<div class="statcallout"><b>'+esc(b.value)+'</b><span>'+fmt(b.label||"")+'</span></div>';
      raSeg++;
      var cls=[]; if(b===lastP) cls.push("endmark"); if(firstP){ cls.push("lead-p"); firstP=false; }
      return '<p data-ra="'+raSeg+'"'+(cls.length?' class="'+cls.join(" ")+'"':'')+'>'+fmtBody(b.text)+'</p>';
    }).join("");
    var applySeg=(a.apply&&a.apply.length)?(raSeg+1):-1;
    var tocHTML=(toc.length>=3)?('<nav class="toc"><span class="toc-l">In this piece</span><ol>'+
      toc.map(function(x,i){return '<li><a href="#/article/'+slug+'/'+x.id+'"><span>'+String(i+1).padStart(2,"0")+'</span>'+esc(x.t)+'</a></li>';}).join("")+'</ol></nav>'):'';
    var disc="";
    if(a.disclaimer==="not-medical-advice") disc='<div class="disclaimer med"><b>This is not medical advice.</b>For information only. Consult a qualified professional. Diagnostic or treatment-adjacent claims are adjudicated by the AI Editor-in-Chief recommendation layer before publication.</div>';
    if(a.disclaimer==="not-financial-advice") disc='<div class="disclaimer fin"><b>This is not financial or investment advice.</b>For information only. RTFCLMGZN does not make trading recommendations.</div>';
    var srcs='<div class="sources"><h4>Sources</h4><ol>'+a.sources.map(function(s){
      var ext=s.url && s.url!=="#";
      return '<li><a href="'+esc(s.url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+esc(s.label)+'</a>'+(ext?' ↗':'')+'</li>';}).join("")+'</ol></div>';
    var corr='<div class="corrections"><h4>Corrections &amp; updates</h4>'+
      (a.corrections.length? a.corrections.map(function(c){
        return '<div class="cx"><time>'+new Date(c.at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})+'</time>'+esc(c.text)+'</div>';
      }).join("") : '<div class="cx none">No corrections. This piece is unchanged since publication.</div>')+'</div>';
    return '<div class="container"><article class="article">'+
      '<a class="back" href="#/">← Home</a>'+
      '<div style="margin:20px 0 6px">'+tagsHTML(a)+'</div>'+
      '<h1 data-ra="0">'+esc(a.title)+'</h1><p class="dek" data-ra="0">'+esc(a.dek)+'</p>'+
      '<div class="dateline"><span class="dl-sec" style="color:'+col+'">'+esc(a.section)+'</span> · '+when(a.publishedAt)+' · '+readTime(a)+' min read'+saveBtns(a.id,true)+'</div>'+
      articleToolsHTML(a)+
      '<div class="hero" style="'+artFill(a,true)+'">'+artGlyph(a,col)+'</div>'+
      ((a.tldr&&a.tldr.length)?'<div class="tldr-jumpwrap"><button class="tldr-jump" onclick="rtfcJump(\'tldr\')" aria-label="Jump to the TL;DR summary">TL;DR <span class="tj-arrow">↓</span></button></div>':'')+
      tocHTML+
      '<div class="prose">'+bodyHTML+'</div>'+ (a.steps?guideStepsHTML(a):"") + tldrHTML(a) +
      (applySeg>=0?'<div data-ra="'+applySeg+'" class="ra-wrap">'+applyHTML(a)+'</div>':applyHTML(a))+
      linksHTML(a)+
      reactsHTML(a.id)+
      '<div class="endbyline">'+avatar(p)+'<div class="eb-who">'+((a.authors&&a.authors.length>1)?'A research collaboration by ':'Written by ')+'<b><a href="#/persona/'+p.key+'">'+esc(authorNames(a,p.name))+'</a></b><span>'+esc((a.authors&&a.authors.length>1)?"Cross-desk investigation":p.beat)+'</span><time class="eb-time">Filed '+fullTimestamp(a.publishedAt)+'</time></div></div>'+
      '<div class="ai-disclosure"><span class="ic">🤖</span><div><b>Researched, drafted, fact-checked, and edited end-to-end by RTFCLMGZN’s AI editorial system</b>, in the established voice of '+esc(p.name)+'. Facts are cross-checked against primary sources; legal- and safety-sensitive claims are adjudicated autonomously by an AI Editor-in-Chief that sources, reframes, or disclaims them before publication. Fully autonomous — no human in the publishing loop.</div></div>'+
      costFooterHTML(a)+
      provenanceHTML(a)+
      distributionHTML(a)+
      disc+srcs+corr+
      '</article>'+relatedHTML(a)+'</div>';
  }
  function viewReview(){
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:8px">'+
      '<div class="over">AI Editor-in-Chief · Decision log</div>'+
      '<h1>Spiked by the machine</h1>'+
      '<p>An audit trail — not an approval queue. The newsroom uses an autonomous AI Editor-in-Chief that publishes, remediates, or <b>spikes</b> stories itself, with no human in the loop. Any story it declined to publish is logged here with its reasons, for transparency. Nothing here is waiting on anyone.</p></div>';
    if(!PENDING.length){
      h+='<div class="apply" style="margin-top:28px"><div class="apply-head"><span class="apply-ic">✓</span>Nothing spiked</div>'+
        '<ul><li>The AI Editor-in-Chief hasn’t declined any story. Sensitive pieces are being sourced, reframed, or disclaimed and published autonomously. Anything it ever judges unsound will be logged here as a settled decision — for the record, not for sign-off.</li></ul></div>';
      return h+'</div>';
    }
    h+='<div class="kicker" style="margin-top:20px"><span class="dotc" style="background:var(--gate)"></span>'+PENDING.length+' spiked · AI recommendations</div>';
    h+=PENDING.map(function(a){
      var p=persona(a.persona)||{name:a.persona,color:"#e0564d"};
      var trig=(a.pipeline&&a.pipeline.gate&&a.pipeline.gate.triggers)||[];
      return '<div class="mast-card" style="border-color:color-mix(in srgb,var(--gate) 45%,var(--line));display:block">'+
        '<div style="display:flex;gap:14px;align-items:center;margin-bottom:10px">'+avatar(p)+
        '<div><h3 style="margin:0">'+esc(a.title)+'</h3>'+
        '<div class="beat">'+esc(p.name)+' · '+esc(a.section||"")+'</div></div></div>'+
        '<p class="bio" style="margin:0 0 10px">'+esc(a.dek||"")+'</p>'+
        '<div class="tags">'+trig.map(function(t){return '<span class="pill" style="border:1px solid var(--gate);color:var(--gate)">'+esc(t)+'</span>';}).join("")+'</div>'+
        '<div style="margin-top:10px;font-size:13px;color:var(--muted)"><b style="color:var(--gate)">SPIKED</b> — '+esc((a.pipeline&&a.pipeline.gate&&a.pipeline.gate.note)||"Declined by the AI Editor-in-Chief; could not be made sound.")+'</div></div>';
    }).join("");
    return h+'</div>';
  }
  /* ================= USAGE / COST OBSERVABILITY (pure arithmetic — no LLM) ================= */
  function money(n){ return '$'+(n<0.01&&n>0?n.toFixed(4):n.toFixed(2)); }
  function num(n){ return (n||0).toLocaleString(); }
  function articleTitle(id){
    if(id==="system") return "System / non-article";
    var a=article2(id); if(a) return a.title;
    for(var i=0;i<MAG.length;i++) if(MAG[i].id===id) return "◈ Issue "+String(MAG[i].number).padStart(3,"0")+" — "+MAG[i].title;
    return id;
  }
  function article2(id){
    for(var i=0;i<ARTICLES.length;i++) if(ARTICLES[i].id===id) return ARTICLES[i];
    for(var j=0;j<GUIDES.length;j++) if(GUIDES[j].id===id) return GUIDES[j];
    return null;
  }
  function modelCfg(m){ return (COST.models||{})[m]||null; }
  function recTokens(r){ return (r.input_tokens||0)+(r.output_tokens||0); }
  function recCost(r){
    var m=modelCfg(r.model); if(!m) return 0;
    var d=COST.discounts||{};
    if(m.per_image){ var pi=r.batch?(m.per_image_batch||m.per_image):m.per_image; return (r.images||1)*pi; }
    var inTok=r.input_tokens||0, cached=r.cached_input_tokens||0, uncached=Math.max(0,inTok-cached);
    var batchMul=r.batch?(d.batch!=null?d.batch:1):1;
    var cacheMul=(d.cached_input!=null?d.cached_input:1);
    var inCost=(uncached*m.input + cached*m.input*cacheMul)/1e6*batchMul;
    var outCost=(r.output_tokens||0)*m.output/1e6*batchMul;
    return inCost+outCost;
  }
  function sumRecs(recs){
    var t={tokens:0,cost:0,count:recs.length,inTok:0,outTok:0,articles:{},estimated:0};
    recs.forEach(function(r){ t.tokens+=recTokens(r); t.cost+=recCost(r); t.inTok+=(r.input_tokens||0); t.outTok+=(r.output_tokens||0); if(r.article_id&&r.article_id!=="system") t.articles[r.article_id]=1; if(r.measured==="estimated") t.estimated++; });
    t.articleCount=Object.keys(t.articles).length;
    return t;
  }
  function sameDay(ts,now){ var d=new Date(ts); return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate(); }
  function withinDays(ts,now,days){ return (now - new Date(ts)) <= days*86400000 && new Date(ts)<=now; }
  function groupBy(recs,fn){ var m={}; recs.forEach(function(r){ var k=fn(r); (m[k]=m[k]||[]).push(r); }); return m; }

  function statCard(label,recs,note){
    var s=sumRecs(recs);
    var perArt=s.articleCount?(s.cost/s.articleCount):0;
    return '<div class="ucard"><div class="ulabel">'+label+'</div>'+
      '<div class="ucost">'+money(s.cost)+'</div>'+
      '<div class="usub">'+num(s.tokens)+' tokens · '+s.articleCount+(s.articleCount===1?' article':' articles')+'</div>'+
      (note?'<div class="unote">'+note+'</div>':(s.articleCount?'<div class="unote">avg '+money(perArt)+'/article</div>':''))+'</div>';
  }
  function barRow(label,val,max,detail){
    var pct=max>0?Math.max(2,Math.round(val/max*100)):0;
    return '<div class="ubar"><div class="ubar-l">'+label+'</div><div class="ubar-t"><div class="ubar-f" style="width:'+pct+'%"></div></div><div class="ubar-v">'+detail+'</div></div>';
  }
  function viewUsage(){
    var now=new Date();
    var today=USAGE.filter(function(r){return sameDay(r.ts,now);});
    var d7=USAGE.filter(function(r){return withinDays(r.ts,now,7);});
    var d30=USAGE.filter(function(r){return withinDays(r.ts,now,30);});
    var all=USAGE.slice();
    var allS=sumRecs(all);
    var estShare=all.length?Math.round(allS.estimated/all.length*100):0;

    var h='<div class="container"><div class="mast-hero" style="padding-bottom:6px">'+
      '<div class="over">Operating transparency</div>'+
      '<h1>What it costs to run this newsroom</h1>'+
      '<p>Every task our AI staff performs logs its token usage here. The dollar figures are <b>API-equivalent compute cost</b> — what the same work would cost on pay-as-you-go API rates — shown in the open. Not a marketing number; just what the machine costs to run.</p></div>';

    // stat row
    h+='<div class="ustats">'+
      statCard("Today",today)+
      statCard("Last 7 days",d7)+
      statCard("Last 30 days",d30)+
      statCard("All-time",all)+'</div>';

    // cost per article headline
    var perArt=allS.articleCount?allS.cost/allS.articleCount:0;
    h+='<div class="uhero-metric"><div><span class="big">'+money(perArt)+'</span><span class="cap">average compute cost per article (end-to-end, all pipeline stages)</span></div>'+
       '<div><span class="big">'+num(Math.round(allS.articleCount?allS.tokens/allS.articleCount:0))+'</span><span class="cap">average tokens per article</span></div></div>';

    // by model
    var byModel=groupBy(all,function(r){return r.model;});
    var modelRows=Object.keys(byModel).map(function(k){return {k:k,s:sumRecs(byModel[k])};}).sort(function(a,b){return b.s.cost-a.s.cost;});
    var maxModel=modelRows.reduce(function(m,r){return Math.max(m,r.s.cost);},0);
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Cost by model</div><div class="ubars">';
    h+=modelRows.map(function(r){ var lbl=(modelCfg(r.k)&&modelCfg(r.k).label)||r.k; return barRow(lbl,r.s.cost,maxModel,money(r.s.cost)+' · '+num(r.s.tokens)+' tok'); }).join("");
    h+='</div>';

    // by task type
    var byTask=groupBy(all,function(r){return r.task_type;});
    var taskRows=Object.keys(byTask).map(function(k){return {k:k,s:sumRecs(byTask[k])};}).sort(function(a,b){return b.s.cost-a.s.cost;});
    var maxTask=taskRows.reduce(function(m,r){return Math.max(m,r.s.cost);},0);
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>Cost by task type</div><div class="ubars">';
    h+=taskRows.map(function(r){ return barRow(r.k,r.s.cost,maxTask,money(r.s.cost)); }).join("");
    h+='</div>';

    // per-article rollup table
    var byArt=groupBy(all.filter(function(r){return r.article_id&&r.article_id!=="system";}),function(r){return r.article_id;});
    var artRows=Object.keys(byArt).map(function(k){return {k:k,s:sumRecs(byArt[k])};}).sort(function(a,b){return b.s.cost-a.s.cost;});
    h+='<div class="kicker"><span class="dotc" style="background:var(--ok)"></span>Cost per article</div>';
    h+='<div class="utable-wrap"><table class="utable"><thead><tr><th>Article</th><th>Tasks</th><th>Tokens</th><th>Compute cost</th></tr></thead><tbody>';
    h+=artRows.map(function(r){
      var href=article2(r.k)?('#/article/'+article2(r.k).slug):(issueById(r.k)?('#/issue/'+r.k):'#/usage');
      return '<tr><td><a href="'+href+'">'+esc(articleTitle(r.k))+'</a></td>'+
        '<td>'+r.s.count+'</td><td>'+num(r.s.tokens)+'</td><td>'+money(r.s.cost)+'</td></tr>';
    }).join("")||'<tr><td colspan="4" style="color:var(--muted)">No article tasks logged yet.</td></tr>';
    h+='</tbody></table></div>';

    // export + methodology
    h+='<div class="uexport"><button onclick="window.rtfcExport(\'csv\')">Export CSV</button>'+
       '<button onclick="window.rtfcExport(\'json\')">Export JSON</button></div>';
    h+='<div class="umethod"><h4>How these numbers are produced</h4><ul>'+
      '<li><b>Zero measurement overhead.</b> Token counts come from each task’s own record; the dashboard math above is plain arithmetic in your browser — no AI model is ever called to compute or summarize these figures.</li>'+
      '<li><b>Metered vs. estimated.</b> '+(100-estShare)+'% of logged tasks are metered (exact token counts); '+estShare+'% are estimated (e.g. the retrofitted first article, produced before tracking existed). Estimated records are marked in the log.</li>'+
      '<li><b>API-equivalent, not a subscription bill.</b> On a Claude Pro/Max subscription you pay a flat fee against usage limits, not per token. These dollar figures show what the work would cost at pay-as-you-go API rates — a stable yardstick, and the exact number for comparing pay-as-you-go against a subscription.</li>'+
      '<li><b>Rates.</b> From <code>cost-config.js</code>, last verified '+(COST.last_verified||'—')+'. Sonnet is on introductory pricing through 2026-08-31 (rises ~50% after).</li>'+
      '</ul></div>';
    return h+'</div>';
  }

  /* ================= MAGAZINE ================= */
  function monthLabel(ym){
    var p=ym.split("-"); var d=new Date(+p[0], +p[1]-1, 1);
    return d.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  }
  function issueById(id){ for(var i=0;i<MAG.length;i++) if(MAG[i].id===id) return MAG[i]; return null; }
  function isPlus(){ var l=libGet(); return !!(l.account && l.account.plan==="plus"); }
  function issueCoverHTML(iss,link){
    var hasImg=iss.cover&&iss.cover.image;
    var bg=hasImg? "background:linear-gradient(180deg,rgba(5,5,10,.18) 0%,rgba(5,5,10,.05) 35%,rgba(5,5,10,.6) 100%),url('"+iss.cover.image+"') center/cover no-repeat;"
                 : artStyle("AI",true);
    var inner='<div class="mag-cover'+(hasImg?' has-img':'')+'" style="'+bg+'">'+
      '<div class="mc-mast">RTFCL<em>MGZN</em></div>'+
      '<div class="mc-issue">Issue '+String(iss.number).padStart(3,"0")+' · '+monthLabel(iss.month)+(iss.special?' · Special':'')+(iss.access==="free"?' · <b class="mc-free">FREE</b>':'')+'</div>'+
      '<div class="mc-title">'+esc(iss.title)+'</div>'+
      '<div class="mc-tag">'+esc(iss.tagline)+'</div>'+
      '<div class="mc-art">🖼 cover art: '+esc(iss.cover.art_status)+'</div></div>';
    var href=(iss.format==="spread")?('#/read/'+iss.id):('#/issue/'+iss.id);
    return link?('<a href="'+href+'">'+inner+'</a>'):inner;
  }
  function viewMagazine(){
    var l=libGet();
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:10px">'+
      '<div class="over">The Magazine</div>'+
      '<h1>The month in AI,<br>understood with hindsight.</h1>'+
      '<p>Every month, the Issue Desk distills the full run of our coverage into one premium issue — the cover story with the benefit of hindsight, all seven editors’ month-in-review columns, the Scoreboard, the applied-takeaways Compendium, and a Watchlist we grade in public the following month. Articles are free, forever. The magazine is for subscribers — and subscribers get every back issue too.</p></div>';
    if(!isPlus()){
      h+='<div class="plusbar"><div><b>RTFCLMGZN Plus</b><span>Monthly issues + special editions + the full back-issue archive. Planned pricing ~$8/mo.</span></div>'+
        (l.account? '<button class="cta" onclick="rtfcPlan(\'plus\')">Start Plus — prototype unlock</button>'
                  : '<a class="cta" href="#/account">Create your free account first</a>')+'</div>';
      h+='<p class="protonote">Prototype: payments arrive with the public launch — the button simulates a Plus subscription so the full experience can be tested today.</p>';
    }
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>Issues</div>';
    h+='<div class="mag-grid">'+MAG.map(function(iss){
      return '<div class="mag-cell">'+issueCoverHTML(iss,true)+
        (iss.pdf?'<a class="mag-dl" href="'+esc(iss.pdf)+'" download="'+esc(pdfName(iss))+'">⤓ Download PDF</a>':'')+'</div>';
    }).join("")+'</div>';
    h+='<p class="protonote" style="margin-top:22px">The Primer is our free founding special — the complete beginner’s guide to AI, free forever. Issue 001, the first full monthly, arrives at the end of the first full month of live coverage.</p>';
    return h+'</div>';
  }
  function issuePageHTML(iss,pg){
    var t=pg.type;
    if(t==="cover") return '<div class="ipage ip-cover">'+issueCoverHTML(iss,false)+'<p class="ip-coverdek">'+esc(pg.body||"")+'</p></div>';
    if(t==="toc") return '<div class="ipage"><div class="ip-kicker">Contents</div><h2 class="ip-title">'+esc(pg.title)+'</h2><ol class="ip-toc">'+pg.items.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ol></div>';
    if(t==="feature"){
      var fart=pg.image?'<div class="ip-art" style="background:url(\''+pg.image+'\') center/cover no-repeat"></div>':'';
      return '<div class="ipage has-art">'+fart+'<div class="ip-kicker">'+esc(pg.kicker||"")+'</div><h2 class="ip-title big">'+esc(pg.title)+'</h2>'+
        '<div class="prose ip-prose">'+pg.body.map(function(x){return '<p>'+fmt(x)+'</p>';}).join("")+'</div></div>';
    }
    if(t==="timeline"){
      return '<div class="ipage"><div class="ip-kicker">'+esc(pg.kicker||"")+'</div><h2 class="ip-title">'+esc(pg.title)+'</h2>'+
        '<div class="ip-tl">'+pg.items.map(function(x){return '<div class="tl-row"><span class="tl-d">'+esc(x.d)+'</span><span class="tl-t">'+fmt(x.t)+'</span></div>';}).join("")+'</div></div>';
    }
    if(t==="column"){
      var p=persona(pg.persona)||{name:pg.persona,color:"#8b7cf7",beat:""};
      return '<div class="ipage"><div class="ip-colhead">'+avatar(p)+'<div><div class="ip-kicker" style="margin:0">'+esc(pg.kicker||"")+'</div><h2 class="ip-title" style="margin:2px 0 0">'+esc(pg.title)+'</h2></div></div>'+
        '<div class="prose ip-prose">'+pg.body.map(function(x){return '<p>'+fmt(x)+'</p>';}).join("")+'</div></div>';
    }
    if(t==="scoreboard"){
      var head='<tr>'+pg.cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join("")+'</tr>';
      var rows=pg.rows.map(function(r){return '<tr><td>'+esc(r.m)+'</td><td>'+esc(r.grok)+'</td><td>'+esc(r.fable)+'</td><td>'+esc(r.gpt)+'</td><td>'+esc(r.opus)+'</td></tr>';}).join("");
      return '<div class="ipage"><div class="ip-kicker">'+esc(pg.kicker||"")+'</div><h2 class="ip-title">'+esc(pg.title)+'</h2>'+
        '<div class="utable-wrap"><table class="utable">'+head+rows+'</table></div>'+
        (pg.note?'<p class="ip-note">'+esc(pg.note)+'</p>':'')+'</div>';
    }
    if(t==="compendium"){
      return '<div class="ipage"><div class="ip-kicker">'+esc(pg.kicker||"")+'</div><h2 class="ip-title">'+esc(pg.title)+'</h2>'+
        '<div class="apply" style="margin-top:18px"><ul>'+pg.items.map(function(x){return '<li><b>'+esc(x.label)+'</b> '+esc(x.text)+'</li>';}).join("")+'</ul></div></div>';
    }
    if(t==="watchlist"){
      return '<div class="ipage"><div class="ip-kicker">'+esc(pg.kicker||"")+'</div><h2 class="ip-title">'+esc(pg.title)+'</h2>'+
        (pg.note?'<p class="ip-note" style="margin-top:10px">'+esc(pg.note)+'</p>':'')+
        '<ol class="ip-watch">'+pg.items.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ol></div>';
    }
    if(t==="ledger"){
      return '<div class="ipage"><div class="ip-kicker">'+esc(pg.kicker||"")+'</div><h2 class="ip-title">'+esc(pg.title)+'</h2>'+
        '<p class="ip-note" style="margin:14px 0 18px">'+esc(pg.body||"")+'</p>'+
        '<div class="mast-strip" style="margin:0">'+pg.stats.map(function(s){return '<div class="cell"><div class="num">'+esc(s.k)+'</div><div class="lbl">'+esc(s.v)+'</div></div>';}).join("")+'</div>'+
        '<p class="ip-note" style="margin-top:16px">Live figures always at the <a href="#/usage" style="color:var(--accent2)">transparency page</a>.</p></div>';
    }
    if(t==="closing"){
      return '<div class="ipage ip-closing"><h2 class="ip-title big">'+esc(pg.title)+'</h2><p>'+esc(pg.body||"")+'</p><a class="cta" href="#/magazine">All issues →</a></div>';
    }
    return '<div class="ipage"><h2>'+esc(pg.title||"")+'</h2></div>';
  }
  function viewIssue(id,pageIdx){
    var iss=issueById(id); if(!iss) return notFound();
    var plus=isPlus();
    var pages=iss.pages;
    var FREE_TYPES={cover:1,toc:1};
    var n=Math.max(0,Math.min(pages.length-1, parseInt(pageIdx||"0",10)||0));
    var pg=pages[n];
    var locked=(iss.access==="plus" && !plus && !FREE_TYPES[pg.type]);
    var h='<div class="container"><div class="issue-shell">';
    h+='<div class="issue-top"><a class="back" href="#/magazine">← All issues</a>'+
       '<span class="issue-pos">Issue '+String(iss.number).padStart(3,"0")+' · page '+(n+1)+' / '+pages.length+'</span></div>';
    if(locked){
      var l=libGet();
      h+='<div class="ipage ip-lock"><div class="lock-ic">◈</div><h2 class="ip-title">This page is for subscribers</h2>'+
        '<p>The cover and contents are free to browse. The full issue — the cover story, all seven columns, the Scoreboard, Compendium, Watchlist, and Ledger — is part of <b>RTFCLMGZN Plus</b>, along with every back issue.</p>'+
        (l.account? '<button class="cta" onclick="rtfcPlan(\'plus\')">Start Plus — prototype unlock</button>'
                  : '<a class="cta" href="#/account">Create a free account to begin</a>')+
        '<p class="protonote" style="margin-top:14px">Prototype: payments arrive at public launch; the button simulates Plus so the flow can be tested.</p></div>';
    } else {
      h+=issuePageHTML(iss,pg);
    }
    var prev=n>0?('<a class="pgbtn" href="#/issue/'+id+'/'+(n-1)+'">← Prev</a>'):'<span class="pgbtn dis">← Prev</span>';
    var next=n<pages.length-1?('<a class="pgbtn" href="#/issue/'+id+'/'+(n+1)+'">Next →</a>'):'<span class="pgbtn dis">Next →</span>';
    h+='<div class="issue-nav">'+prev+'<span class="issue-dots">'+pages.map(function(_,i){
      return '<a class="dot'+(i===n?' cur':'')+'" href="#/issue/'+id+'/'+i+'"></a>';}).join("")+'</span>'+next+'</div>';
    return h+'</div></div>';
  }

  /* ================= LIBRARY & ACCOUNT ================= */
  function cardsByIds(ids){
    var list=ids.map(function(id){return article2(id);}).filter(Boolean);
    return list.length? '<div class="grid">'+list.map(cardHTML).join("")+'</div>'
      : '<p style="color:var(--muted);font-size:14px">Nothing here yet — tap the ♡ or ○ on any article.</p>';
  }
  function viewLibrary(){
    var l=libGet();
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Your library</div>'+
      '<h1>Saved for you</h1>'+
      '<p>'+(l.account? 'Signed in as <b>'+esc(l.account.email)+'</b> — your library follows your account.'
        : 'Your library lives in this browser. <a href="#/account" style="color:var(--accent2)">Create a free account</a> to keep it permanently, sync across devices, and get the daily digest.')+'</p></div>';
    h+='<div class="kicker"><span class="dotc" style="background:var(--gate)"></span>♥ Bookmarked · '+l.bookmarks.length+'</div>'+cardsByIds(l.bookmarks);
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>◷ Read later · '+l.readLater.length+'</div>'+cardsByIds(l.readLater);
    return h+'</div>';
  }
  function viewAccount(){
    var l=libGet();
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:6px"><div class="over">Account</div>';
    if(!l.account){
      h+='<h1>Create your free account</h1>'+
        '<p>Reading is free and stays free. A free account adds three things: your library (bookmarks + read-later) becomes permanent and syncs across devices, you get the <b>daily digest email</b> — the day’s stories in one send — and you’re set up to subscribe to the magazine whenever you’re ready.</p></div>'+
        '<div class="acct-card"><label>Email</label><input id="acct-email" type="email" placeholder="you@example.com">'+
        '<button class="cta" onclick="rtfcSignup()">Create free account</button>'+
        '<p class="protonote">Prototype: stored locally in this browser. Real accounts (and the digest itself) arrive with the public launch — this builds and tests the exact flow.</p></div>'+
        timeMeterHTML();
      return h+'</div>';
    }
    h+='<h1>Your account</h1><p>Signed in as <b>'+esc(l.account.email)+'</b></p></div>';
    h+='<div class="acct-card"><div class="acct-row"><span>Plan</span><b>'+(l.account.plan==="plus"?"RTFCLMGZN Plus ◈":"Free")+'</b></div>'+
      '<div class="acct-row"><span>Daily digest</span><b>Enrolled (launches with the public site)</b></div>'+
      '<div class="acct-row"><span>Library</span><b><a href="#/library" style="color:var(--accent2)">'+libGet().bookmarks.length+' bookmarks · '+libGet().readLater.length+' read-later</a></b></div>'+
      (l.account.plan==="plus"
        ? '<button class="cta ghost" onclick="rtfcPlan(\'free\')">Cancel Plus (prototype)</button>'
        : '<button class="cta" onclick="rtfcPlan(\'plus\')">Upgrade to Plus — magazine + back issues (prototype)</button>')+
      '<button class="cta ghost" onclick="rtfcSignout()">Sign out</button></div>';
    h+=timeMeterHTML();
    return h+'</div>';
  }

  /* ================= ARCHIVE + SEARCH ================= */
  var ARCH={q:"",sec:"",per:"",fmt:""};
  window.rtfcArch=function(){
    ARCH.q=(document.getElementById("aq")||{}).value||"";
    ARCH.sec=(document.getElementById("asec")||{}).value||"";
    ARCH.per=(document.getElementById("aper")||{}).value||"";
    ARCH.fmt=(document.getElementById("afmt")||{}).value||"";
    var el=document.getElementById("arch-list"); if(el) el.innerHTML=archListHTML();
  };
  function archMatch(a){
    if(ARCH.sec && a.section!==ARCH.sec) return false;
    if(ARCH.per && a.persona!==ARCH.per) return false;
    if(ARCH.fmt && trueFormat(a)!==ARCH.fmt) return false;
    if(ARCH.q){
      var q=ARCH.q.toLowerCase();
      var hay=(a.title+" "+a.dek+" "+a.body.map(function(b){return b.text||"";}).join(" ")).toLowerCase();
      if(hay.indexOf(q)<0) return false;
    }
    return true;
  }
  function archListHTML(){
    var list=ARTICLES.filter(archMatch);
    if(!list.length) return '<p style="color:var(--muted)">No articles match. Loosen the filters or try another search.</p>';
    var byMonth={};
    list.forEach(function(a){ var ym=a.publishedAt.slice(0,7); (byMonth[ym]=byMonth[ym]||[]).push(a); });
    var months=Object.keys(byMonth).sort().reverse();
    return months.map(function(ym){
      // Month-distilled upsell is for real monthly Plus issues only — never the free Primer special.
      var iss=null; for(var i=0;i<MAG.length;i++) if(MAG[i].month===ym && !MAG[i].special && MAG[i].format!=="spread") iss=MAG[i];
      var h='<div class="kicker"><span class="dotc" style="background:var(--accent)"></span>'+monthLabel(ym)+' · '+byMonth[ym].length+' stories</div>';
      h+='<div class="grid">'+byMonth[ym].map(cardHTML).join("")+'</div>';
      if(iss) h+='<a class="arch-issue" href="#/issue/'+iss.id+'"><span>◈</span><div><b>'+monthLabel(ym)+' in one issue — “'+esc(iss.title)+'”</b>'+
        '<span>The month distilled: cover story, all seven columns, Scoreboard, Compendium, Watchlist. For subscribers.</span></div><span class="arch-go">Read →</span></a>';
      return h;
    }).join("");
  }
  function viewArchive(){
    var secs=SECTIONS.map(function(s){return '<option value="'+s.key+'"'+(ARCH.sec===s.key?' selected':'')+'>'+s.label+'</option>';}).join("");
    var pers=activePersonas().map(function(p){return '<option value="'+p.key+'"'+(ARCH.per===p.key?' selected':'')+'>'+p.name+'</option>';}).join("");
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over">The Archive</div>'+
      '<h1>Every story, organized</h1>'+
      '<p>The full back catalog by month — searchable, filterable by desk, editor, and format. The archive is free; each month ends in its magazine issue.</p></div>';
    h+='<div class="arch-bar">'+
      '<input id="aq" type="search" placeholder="Search titles and text…" value="'+esc(ARCH.q)+'" oninput="rtfcArch()">'+
      '<select id="asec" onchange="rtfcArch()"><option value="">All sections</option>'+secs+'</select>'+
      '<select id="aper" onchange="rtfcArch()"><option value="">All editors</option>'+pers+'</select>'+
      '<select id="afmt" onchange="rtfcArch()"><option value="">All formats</option>'+
        '<option value="brief"'+(ARCH.fmt==="brief"?' selected':'')+'>Brief</option>'+
        '<option value="synthesis"'+(ARCH.fmt==="synthesis"?' selected':'')+'>Synthesis</option>'+
        '<option value="research"'+(ARCH.fmt==="research"?' selected':'')+'>Research</option></select></div>';
    h+='<div id="arch-list">'+archListHTML()+'</div>';
    return h+'</div>';
  }

  /* ================= GUIDES & RESOURCES ================= */
  function viewGuides(){
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Guides</div>'+
      '<h1>Learn it by doing it</h1>'+
      '<p>Hands-on, plain-English guides to actually using AI — published two to three times a week alongside the news. No hype, no jargon walls; every guide ends with something you can do tonight.</p></div>';
    h+='<div class="kicker"><span class="dotc" style="background:'+SECTION_COLORS.Guide+'"></span>'+GUIDES.length+(GUIDES.length===1?' guide':' guides')+'</div>';
    h+=GUIDES.length?('<div class="grid">'+GUIDES.map(cardHTML).join("")+'</div>'):'<p style="color:var(--muted)">First guides arrive with the daily pipeline.</p>';
    return h+'</div>';
  }
  function dictSectionHTML(filter){
    var DICT=window.RTFC_DICT||[];
    var q=(filter||"").toLowerCase();
    var list=q?DICT.filter(function(d){return (d.term+" "+d.def).toLowerCase().indexOf(q)>=0;}):DICT;
    return '<div class="dict-grid" id="dict-grid">'+ (list.length?list.map(function(d){
      return '<div class="dict-item"><b>'+esc(d.term)+'</b><span>'+fmt(d.def)+'</span></div>';
    }).join(""):'<p style="color:var(--muted);padding:12px">No terms match — try fewer letters.</p>') +'</div>';
  }
  window.rtfcDict=function(v){
    var g=document.getElementById("dict-grid");
    if(g) g.outerHTML=dictSectionHTML(v);
  };
  window.rtfcJump=function(id){
    var el=document.getElementById(id);
    if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
  };
  function viewResources(){
    var DICT=window.RTFC_DICT||[];
    // build the section list first (drives both the jump-nav and the content)
    var secs=[{id:"res-dossiers",label:"Company dossiers"},{id:"res-dict-cta",label:"The AI Dictionary"}];
    RES.forEach(function(cat,i){ secs.push({id:"res-cat-"+i,label:cat.title}); });

    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Resources</div>'+
      '<h1>The whole toolkit, in one place</h1>'+
      '<p>The accounts and shows worth following, living dossiers on every major player, and the dictionary that unlocks any AI headline. Jump to what you need from the menu.</p></div>';

    h+='<div class="res-layout"><aside class="res-nav"><div class="rn-title">On this page</div>'+
      secs.map(function(s){ return '<a onclick="rtfcJump(\''+s.id+'\')">'+esc(s.label)+'</a>'; }).join("")+
      '</aside><div class="res-main">';

    // 1) dossiers
    h+='<section id="res-dossiers"><div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>Company dossiers</div>'+
      '<p style="color:var(--muted);font-size:14px;margin:-8px 0 16px">Everything we\'ve published about each major player, auto-assembled and always current. <a href="#/companies" style="color:var(--accent2)">All dossiers →</a></p>'+
      '<div class="dossier-strip">'+COMPANIES.map(function(c){
        return '<a class="ds-chip" href="#/company/'+c.key+'">'+esc(c.name)+'</a>';
      }).join("")+'</div></section>';

    // 1b) the dictionary — now its own page; Resources just points to it
    h+='<section id="res-dict-cta"><a class="dict-cta" href="#/dictionary"><div><b>The AI Dictionary</b>'+
      '<span>'+DICT.length+' terms that unlock any AI headline — token, agent, hallucination, and the rest — each explained like a human.</span></div>'+
      '<span class="dc-go">Open the dictionary →</span></a></section>';

    // 2) the follow-list categories
    RES.forEach(function(cat,i){
      h+='<section id="res-cat-'+i+'"><div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>'+esc(cat.title)+'</div>'+
        '<p style="color:var(--muted);font-size:14px;margin:-8px 0 16px">'+esc(cat.desc)+'</p>'+
        '<div class="res-grid">'+cat.items.map(function(it){
          return '<div class="res-card"><b>'+esc(it.name)+'</b><span>'+esc(it.desc)+'</span>'+
            '<div class="res-links">'+it.links.map(function(l){
              var ext=/^https?:/.test(l.url);
              return '<a href="'+esc(l.url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+esc(l.label)+(ext?' ↗':'')+'</a>';
            }).join("")+'</div></div>';
        }).join("")+'</div></section>';
    });

    return h+'</div></div></div>';
  }
  function viewDictionary(){
    var DICT=window.RTFC_DICT||[];
    var h='<div class="container" style="max-width:900px"><div class="mast-hero" style="padding-bottom:4px"><div class="over"><a href="#/resources" style="color:var(--accent2)">Resources</a> · Dictionary</div>'+
      '<h1>The AI Dictionary</h1>'+
      '<p>Every word that gates an AI headline, explained like a human — no jargon defending jargon. '+DICT.length+' terms, maintained by the newsroom as the language evolves. Search, or just scroll.</p></div>';
    h+='<input class="dict-search" type="text" placeholder="Search terms — try “token”, “agent”, “hallucination”…" oninput="rtfcDict(this.value)" autofocus>';
    h+=dictSectionHTML("");
    h+='<p style="color:var(--muted);font-size:12.5px;margin-top:14px">New to all this? The <a href="#/read/primer" style="color:var(--accent2)">Primer</a> walks you from zero to fluent — the dictionary is your reference once you\'re in.</p>';
    return h+'</div>';
  }

  /* ---------- The Buzz: curated social signal (never fabricated — every card
     links to the real post/announcement; the newsroom curates each run) ---------- */
  function buzzTime(iso){
    var d=new Date(iso+"T12:00:00");
    return d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
  }
  function buzzCard(b){
    var initial=(b.source&&b.source.name?b.source.name:"?").charAt(0);
    var kindColor={lab:"#7c6cf0",person:"#e0b64e",news:"#5aa8d8",gov:"#7fbf7f"}[b.source&&b.source.kind]||"var(--accent)";
    var heat=Math.max(4,Math.min(100,b.heat||0));
    return '<div class="buzz-card">'+
      '<div class="bz-head"><span class="bz-av" style="background:'+kindColor+'">'+esc(initial)+'</span>'+
      '<span class="bz-who"><b>'+esc(b.source.name)+'</b><span>'+esc(b.source.handle||"")+(b.source.platform==="x"?" · 𝕏":"")+'</span></span>'+
      '<span class="bz-heat" title="Buzz heat"><i style="width:'+heat+'%"></i></span></div>'+
      '<div class="bz-text">'+fmt(b.text)+'</div>'+
      (b.why?'<div class="bz-why"><b>WHY IT\'S BUZZING</b> '+fmt(b.why)+'</div>':'')+
      '<div class="bz-foot">'+(b.topics||[]).map(function(t){return '<span class="bz-tag">'+esc(t)+'</span>';}).join("")+
      '<a href="'+esc(b.url)+'" target="_blank" rel="noopener">original ↗</a></div>'+
    '</div>';
  }
  function buzzDayBlock(day,items){
    var sorted=items.slice().sort(function(a,b){return (b.heat||0)-(a.heat||0);});
    return '<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>'+esc(buzzTime(day))+
      '<span class="bz-count">'+sorted.length+'</span></div>'+
      '<div class="buzz-grid">'+sorted.map(buzzCard).join("")+'</div>';
  }
  function viewBuzz(){
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over"><span class="live-dot"></span>The Buzz</div>'+
      '<h1>What the feed is arguing about</h1>'+
      '<p>The posts, launches, and hot takes making noise across the AI world — curated hourly from labs, builders, and researchers. Every card links to the original. We pick the signal; you skip the doomscroll.</p></div>';
    if(!BUZZ.length){
      return h+'<p style="color:var(--muted)">The next Buzz run fills this page.</p></div>';
    }
    var byDay={};
    BUZZ.forEach(function(b){ (byDay[b.date]=byDay[b.date]||[]).push(b); });
    var days=Object.keys(byDay).sort().reverse();
    var cut=new Date(); cut.setDate(cut.getDate()-7);
    var cutStr=cut.toISOString().slice(0,10);
    var recent=days.filter(function(d){return d>=cutStr;});
    var older=days.filter(function(d){return d<cutStr;});
    // if the feed is young and nothing is "recent" yet, show what we have
    if(!recent.length && days.length){ recent=days.slice(0,7); older=days.slice(7); }
    recent.forEach(function(day){ h+=buzzDayBlock(day,byDay[day]); });
    if(older.length){
      var olderCount=older.reduce(function(n,d){return n+byDay[d].length;},0);
      h+='<button class="buzz-more" id="buzz-more" onclick="rtfcBuzzOlder()">Show earlier buzz — '+olderCount+' more from '+older.length+' day'+(older.length===1?'':'s')+' ↓</button>';
      h+='<div id="buzz-archive" hidden>'+older.map(function(day){return buzzDayBlock(day,byDay[day]);}).join("")+'</div>';
    }
    h+='<p style="color:var(--muted);font-size:12.5px;margin-top:26px">Refreshed <b>every 2 hours, ~12 a day</b> — one card each run, the single loudest genuinely-new thing since the last. Showing the last 7 days'+(older.length?' — earlier buzz is one click below':'')+'. Curation, not syndication: cards paraphrase or briefly quote public posts and link to the source. Nothing is generated on anyone\'s behalf.</p>';
    return h+'</div>';
  }
  window.rtfcBuzzOlder=function(){
    var a=document.getElementById("buzz-archive"), b=document.getElementById("buzz-more");
    if(a){ a.hidden=false; } if(b){ b.style.display="none"; }
  };

  /* ---------- article tools: cost transparency + listen ---------- */
  function articleCost(id){
    var recs=USAGE.filter(function(r){return r.article_id===id;});
    if(!recs.length) return null;
    return sumRecs(recs);
  }
  function articleToolsHTML(a){
    var h='<div class="art-tools">';
    if(window.speechSynthesis){
      h+='<button class="tool-btn tts-btn2" id="tts-btn" onclick="rtfcListen(\''+a.id+'\')">▶ <span>Listen · ~'+readTime(a)+' min</span><i class="tts-prog" id="tts-prog"></i></button>';
    }
    h+='<button class="tool-btn share-btn" id="share-btn" onclick="rtfcShare(\''+a.id+'\')">⤴ <span>Share</span></button>';
    return h+'</div>';
  }
  window.rtfcShare=function(id){
    var a=article2(id); if(!a) return;
    var url="https://rtfclmgzn.com/#/article/"+a.slug;
    var btn=document.getElementById("share-btn");
    function copied(){
      if(!btn) return;
      btn.innerHTML='✓ <span>Link copied</span>';
      setTimeout(function(){ if(btn) btn.innerHTML='⤴ <span>Share</span>'; },2000);
    }
    if(navigator.share){
      navigator.share({title:a.title,text:a.dek||a.title,url:url}).catch(function(){});
    } else if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(copied,function(){ window.prompt("Copy this link:",url); });
    } else {
      window.prompt("Copy this link:",url);
    }
  };
  function costFooterHTML(a){
    var c=articleCost(a.id);
    if(!c || !(c.cost>0)) return "";
    return '<div class="cost-foot"><a class="cost-chip" href="#/usage" title="Full production ledger — every task, every token">'+
      '◈ Transparency: this story cost <b>'+money(c.cost)+'</b> to produce<span class="cc-go">see the ledger →</span></a></div>';
  }

  /* ---------- UNIFIED AUDIO PLAYER (articles + The Briefing) ----------
     One engine for both "Listen" and the Briefing. SENTENCE-level chunks dodge Chrome's
     ~15-second per-utterance cutoff (the bug that used to stop playback); a keepalive
     resume backs it up. Best-available natural female voice. Playback PERSISTS across
     navigation via the shared mini-player. Zero tokens, zero cost. */
  // Say numbers/money/percents the way a human would (fixes "$6.4 billion" → "six dollars point four…").
  function speechNormalize(t){
    t=String(t);
    t=t.replace(/(\d[\d.,]*)\s*[–—]\s*(\d[\d.,]*)/g,"$1 to $2");                 // ranges 30–46 → 30 to 46
    t=t.replace(/(\d[\d.,]*)\s*-\s*(\d[\d.,]*)/g,"$1 to $2");                    // ranges with hyphen
    t=t.replace(/\$\s?(\d[\d.,]*)\s*(billion|million|trillion|thousand)/gi,"$1 $2 dollars"); // $6.4 billion
    t=t.replace(/\$\s?(\d[\d.,]*)\s?B\b/g,"$1 billion dollars");
    t=t.replace(/\$\s?(\d[\d.,]*)\s?M\b/g,"$1 million dollars");
    t=t.replace(/\$\s?(\d[\d.,]*)\s?K\b/g,"$1 thousand dollars");
    t=t.replace(/\$\s?(\d[\d.,]*)/g,"$1 dollars");                              // plain $2.50 → 2.50 dollars
    t=t.replace(/(\d[\d.,]*)\s?%/g,"$1 percent");                              // 46% → 46 percent
    t=t.replace(/(\d[\d.,]*)\s?[×x](?=\s|,|\.|;|:|\)|$)/g,"$1 times");          // 15× → 15 times
    t=t.replace(/(\w)-(\w)/g,"$1 $2");                                         // GPT-5.6 → GPT 5.6
    return t;
  }
  function cleanSpeech(t){
    var s=String(t).replace(/\*\*|==|\+\+/g,"");
    s=speechNormalize(s);
    return s.replace(/\s*·\s*/g,", ").replace(/—/g,", ").replace(/\s+/g," ").trim();
  }
  function article2raw(id){
    var all=ARTICLES.concat(GUIDES);
    for(var i=0;i<all.length;i++) if(all[i].id===id) return all[i];
    return null;
  }
  var AP={kind:null,id:null,slug:null,title:"",ownHash:"#/",segs:[],chunks:[],ci:0,seg:0,playing:false,paused:false,gen:0};
  function apVoice(){
    var vs=(window.speechSynthesis?speechSynthesis.getVoices():[])||[];
    function pick(names){ for(var i=0;i<names.length;i++){ var m=vs.filter(function(v){return v.name.toLowerCase().indexOf(names[i])>=0;})[0]; if(m) return m; } return null; }
    // 1) known top-tier natural female voices (Edge/Win · Chrome · Mac/iOS)
    var best=pick(["aria online","jenny online","sonia online","libby online","emma online","michelle online","clara online","natasha online",
      "google uk english female","google us english","samantha","serena","karen","moira","tessa","fiona","ava","allison","zira","susan","hazel"]);
    if(best) return best;
    // 2) any natural / online / neural english voice
    var neural=vs.filter(function(v){return /^en/i.test(v.lang)&&/natural|online|neural/i.test(v.name);});
    if(neural.length) return neural[0];
    // 3) an english voice that isn't obviously male
    var enF=vs.filter(function(v){return /^en/i.test(v.lang)&&!/male|david|george|mark|daniel|alex|fred|rishi|ryan|guy|arthur|thomas|oliver/i.test(v.name);});
    return enF[0] || vs.filter(function(v){return /^en/i.test(v.lang);})[0] || vs[0] || null;
  }
  function apSentences(text){
    var parts=String(text).match(/[^.!?]+[.!?]+|\S[^.!?]*$/g)||[text];
    var out=[], buf="";
    parts.forEach(function(s){ s=s.trim(); if(!s) return;
      if(buf && (buf.length+s.length)>170){ out.push(buf); buf=s; } else buf=buf?buf+" "+s:s;
    });
    if(buf) out.push(buf);
    return out;
  }
  function apLoad(kind,id,slug,title,ownHash,segs){
    AP.kind=kind; AP.id=id; AP.slug=slug; AP.title=title; AP.ownHash=ownHash; AP.segs=segs; AP.chunks=[];
    segs.forEach(function(s,si){ apSentences(s.text).forEach(function(sent){ AP.chunks.push({text:sent,seg:si}); }); });
    AP.ci=0; AP.seg=0;
  }
  function apSpeak(){
    if(!AP.playing || AP.ci>=AP.chunks.length){ apDone(); return; }
    var myGen=AP.gen, c=AP.chunks[AP.ci]; AP.seg=c.seg;
    var u=new SpeechSynthesisUtterance(c.text);
    var v=apVoice(); if(v) u.voice=v;
    u.rate=0.97; u.pitch=1.06; u.volume=1;
    u.onend=function(){ if(myGen!==AP.gen||!AP.playing) return; AP.ci++; apRender(); apSpeak(); };
    u.onerror=function(){ if(myGen!==AP.gen||!AP.playing) return; AP.ci++; apSpeak(); };
    try{ speechSynthesis.speak(u); }catch(e){}
  }
  function apStart(){
    if(!window.speechSynthesis) return;
    AP.gen++; try{speechSynthesis.cancel();}catch(e){}
    AP.playing=true; AP.paused=false; if(AP.ci>=AP.chunks.length) AP.ci=0;
    apRender(); apSpeak();
  }
  function apDone(){ AP.gen++; AP.playing=false; AP.paused=false; AP.ci=0; try{speechSynthesis.cancel();}catch(e){} apRender(); }
  function apSeekSeg(si){
    si=Math.max(0,Math.min(AP.segs.length-1,parseInt(si,10)||0));
    var idx=-1; for(var k=0;k<AP.chunks.length;k++){ if(AP.chunks[k].seg===si){ idx=k; break; } }
    if(idx<0) return;
    AP.gen++; AP.ci=idx; AP.seg=si; try{speechSynthesis.cancel();}catch(e){}
    AP.playing=true; AP.paused=false; apRender(); apSpeak();
  }
  window.rtfcApStop=function(){ apDone(); };
  window.rtfcApToggle=function(){
    if(!window.speechSynthesis||!AP.chunks.length) return;
    if(!AP.playing && !AP.paused){ apStart(); return; }
    if(AP.paused){ try{speechSynthesis.resume();}catch(e){} AP.paused=false; }
    else{ try{speechSynthesis.pause();}catch(e){} AP.paused=true; }
    apRender();
  };
  // Chrome keepalive — nudge resume so the ~15s watchdog never kills a long read
  if(!window.__apKeep){ window.__apKeep=setInterval(function(){
    if(AP.playing && !AP.paused && window.speechSynthesis && speechSynthesis.speaking){
      try{ speechSynthesis.pause(); speechSynthesis.resume(); }catch(e){}
    }
  },8000); }
  window.rtfcListen=function(id){
    if(!window.speechSynthesis) return;
    var a=article2raw(id); if(!a) return;
    if(AP.kind==="article" && AP.id===id && (AP.playing||AP.paused)){ window.rtfcApToggle(); return; }
    var segs=[{t:a.title, text:cleanSpeech(a.title+". "+a.dek)}];
    a.body.forEach(function(b){ if(b.text) segs.push({t:null, text:cleanSpeech(b.text)}); });
    if(a.apply&&a.apply.length){ segs.push({t:null, text:cleanSpeech(applyLabel(a)+". "+a.apply.map(function(x){return x.label+" "+x.text;}).join(" "))}); }
    apLoad("article", id, a.slug, a.title, "#/article/"+a.slug, segs);
    apStart();
  };
  window.rtfcBriefToggle=function(){
    if(!window.speechSynthesis) return;
    if(AP.kind!=="briefing"){ var B=briefingScript(); if(!B) return;
      apLoad("briefing","briefing",null,"The 8 AM Briefing","#/briefing", B.segs.map(function(s){return {t:s.t,text:s.x};})); }
    window.rtfcApToggle();
  };
  window.rtfcBriefSeek=function(i){
    if(AP.kind!=="briefing"){ var B=briefingScript(); if(!B) return;
      apLoad("briefing","briefing",null,"The 8 AM Briefing","#/briefing", B.segs.map(function(s){return {t:s.t,text:s.x};})); }
    apSeekSeg(i);
  };
  function apRender(){
    var onOwn = AP.ownHash && location.hash.indexOf(AP.ownHash)===0;
    var glyph=(AP.playing&&!AP.paused)?"❚❚":"▶";
    var pct=AP.chunks.length?Math.round(AP.ci/AP.chunks.length*100):0;
    if(AP.kind==="briefing"){
      var pb=document.getElementById("brief-play"); if(pb) pb.textContent=glyph;
      var scrub=document.getElementById("brief-scrub"); if(scrub){ scrub.max=Math.max(0,AP.segs.length-1); if(document.activeElement!==scrub) scrub.value=AP.seg; }
      var fill=document.getElementById("brief-prog"); if(fill) fill.style.width=pct+"%";
      var now=document.getElementById("brief-now"); if(now&&AP.segs[AP.seg]&&(AP.playing||AP.paused)) now.textContent=(AP.paused?"Paused: ":"Now playing: ")+AP.segs[AP.seg].t;
      for(var k=0;k<AP.segs.length;k++){ var r=document.getElementById("bt-"+k); if(r) r.classList.toggle("on",k===AP.seg&&(AP.playing||AP.paused)); }
    }
    var tb=document.getElementById("tts-btn");
    if(tb && AP.kind==="article" && onOwn){
      var lbl=(AP.playing||AP.paused)?(glyph+' <span>'+(AP.paused?"Resume":"Pause")+'</span>'):('▶ <span>Listen</span>');
      tb.innerHTML=lbl+'<i class="tts-prog" id="tts-prog" style="width:'+((AP.playing||AP.paused)?pct:0)+'%"></i>';
    }
    // read-along: focus-highlight the block being spoken and glide it into view
    if(AP.kind==="article"){
      var art=document.querySelector(".article");
      if(art){
        var live=onOwn && (AP.playing||AP.paused);
        art.classList.toggle("ra-live",live);
        var want=live?art.querySelector('[data-ra="'+AP.seg+'"]'):null;
        var cur=art.querySelectorAll("[data-ra].ra-on");
        for(var ri=0;ri<cur.length;ri++){ if(cur[ri]!==want) cur[ri].classList.remove("ra-on"); }
        if(want && !want.classList.contains("ra-on")){
          // seg 0 marks both the h1 and the dek — highlight both, scroll to the first
          var group=art.querySelectorAll('[data-ra="'+AP.seg+'"]');
          for(var gi=0;gi<group.length;gi++) group[gi].classList.add("ra-on");
          if(AP.playing && !AP.paused){ try{ want.scrollIntoView({behavior:"smooth",block:"center"}); }catch(e){} }
        }
      }
    }
    var mp=document.getElementById("miniplayer");
    if(mp){
      var show=(AP.playing||AP.paused) && AP.chunks.length && !onOwn;
      mp.hidden=!show;
      if(show){
        var t=document.getElementById("mp-toggle"); if(t) t.textContent=glyph;
        var ti=document.getElementById("mp-title"); if(ti) ti.textContent=AP.kind==="briefing"?"The Daily Briefing":"Now listening";
        var sg=document.getElementById("mp-seg"); if(sg) sg.textContent=AP.kind==="briefing"?(AP.segs[AP.seg]?AP.segs[AP.seg].t:""):AP.title;
        var pr=document.getElementById("mp-prog"); if(pr) pr.style.width=pct+"%";
        var op=document.getElementById("mp-open"); if(op) op.setAttribute("href",AP.ownHash);
      }
    }
  }
  // scrub by clicking the mini-player bar — briefing jumps to the nearest segment,
  // an article jumps to the nearest chunk.
  window.rtfcApScrub=function(ev){
    if(!AP.chunks.length) return;
    var bar=document.getElementById("mp-bar"); if(!bar) return;
    var rect=bar.getBoundingClientRect();
    var frac=Math.max(0,Math.min(1,((ev.clientX||0)-rect.left)/Math.max(1,rect.width)));
    var target=Math.floor(frac*AP.chunks.length);
    if(AP.kind==="briefing"){ apSeekSeg(AP.chunks[Math.min(target,AP.chunks.length-1)].seg); }
    else { AP.gen++; AP.ci=Math.min(target,AP.chunks.length-1); try{speechSynthesis.cancel();}catch(e){} AP.playing=true; AP.paused=false; apRender(); apSpeak(); }
  };
  function initMiniPlayer(){
    if(document.getElementById("miniplayer")) return;
    var d=document.createElement("div"); d.id="miniplayer"; d.hidden=true;
    d.innerHTML='<button id="mp-toggle" title="Play / pause">▶</button>'+
      '<div class="mp-info"><a id="mp-open" href="#/briefing"><b id="mp-title">The Daily Briefing</b><span id="mp-seg"></span></a>'+
      '<span class="mp-bar" id="mp-bar" title="Scrub"><i id="mp-prog"></i></span></div>'+
      '<button id="mp-close" title="Stop">✕</button>';
    document.body.appendChild(d);
    document.getElementById("mp-toggle").addEventListener("click",function(){ window.rtfcApToggle(); });
    document.getElementById("mp-close").addEventListener("click",function(){ window.rtfcApStop(); });
    document.getElementById("mp-bar").addEventListener("click",function(ev){ window.rtfcApScrub(ev); });
  }
  window.addEventListener("hashchange",function(){ setTimeout(apRender,0); });

  function briefingScript(){
    // The edition window: everything since ~48h before the newest story, so an
    // after-midnight publish never leaves the morning briefing near-empty.
    var sorted=ARTICLES.slice().sort(function(a,b){return new Date(b.publishedAt)-new Date(a.publishedAt);});
    if(!sorted.length) return null;
    var newest=new Date(sorted[0].publishedAt);
    var cutoff=new Date(newest-48*3600*1000);
    var stories=sorted.filter(function(a){return new Date(a.publishedAt)>=cutoff;}).slice(0,7)
      .sort(function(a,b){ return (b.top?1:0)-(a.top?1:0) || new Date(b.publishedAt)-new Date(a.publishedAt); });
    var day=stories[0].publishedAt.slice(0,10);
    var d=new Date(day+"T12:00:00");
    var nice=d.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
    var hr=new Date().getHours();
    var greet=hr<12?"Good morning":hr<17?"Good afternoon":"Good evening";
    var leads=["Moving on. ","Here's another one worth your time. ","This next one's interesting. ","Alright — ","Now, ","Let's keep going. "];
    var segs=[];
    segs.push({t:"Welcome", x:greet+". It's "+nice+", and you're listening to RTFCLMGZN — the whole day in artificial intelligence, in about ten minutes. I'm your narrator, and, well... I'm one of the machines. Every story you're about to hear was reported, written, fact-checked, and published by a fully autonomous AI newsroom — no human in the loop. So let's get into it. Here's what actually matters today."});
    stories.forEach(function(a,i){
      var paras=a.body.filter(function(b){return b.type==="p";}).map(function(b){return cleanSpeech(b.text);});
      var body=paras.slice(0, a.top?2:1).join(" ");
      var lead=i===0?"First up, our top story. ":(i===stories.length-1?"One more before we wrap up. ":leads[(i-1)%leads.length]);
      var apply=(a.top&&a.apply&&a.apply.length)?(" So what do you actually do with that? "+cleanSpeech(a.apply[0].text)):"";
      segs.push({t:a.section+" · "+a.title,
        x:lead+cleanSpeech(a.dek)+" "+body+apply+" That one's from our "+a.section+" desk."});
    });
    var bz=BUZZ.slice().sort(function(a,b){ return (b.date>a.date?1:-1) || (b.heat||0)-(a.heat||0); }).slice(0,4);
    if(bz.length){
      segs.push({t:"The Buzz", x:"And before we go, a quick lap around what everyone's talking about. "+bz.map(function(b){
        return cleanSpeech(b.source.name)+", "+cleanSpeech(b.text);
      }).join(" ... ")+" ... that's the noise for today."});
    }
    segs.push({t:"Sign-off", x:"And that's your briefing. If any of that grabbed you, the full stories — every source, and exactly what each one cost us to produce — are waiting at r t f c l m g z n dot com. I'll be back with the next one. Until then... stay curious."});
    var words=segs.reduce(function(n,s){return n+s.x.split(/\s+/).length;},0);
    return {day:day, nice:nice, segs:segs, mins:Math.max(1,Math.round(words/150))};
  }
  function viewBriefing(){
    var B=briefingScript();
    var playingThis=(AP.kind==="briefing" && (AP.playing||AP.paused));
    var curSeg=playingThis?AP.seg:0;
    var h='<div class="container" style="max-width:820px"><div class="mast-hero" style="padding-bottom:4px">'+
      '<div class="over"><span class="live-dot"></span>The Daily Briefing</div>'+
      '<h1>The day in AI, read to you</h1>'+
      '<p>A ~10-minute spoken rundown of the latest coverage, narrated in a natural voice and assembled fresh from the newsroom\'s own reporting. Press play and drive — it keeps going as you move around the site.</p></div>';
    if(!B) return h+'<p style="color:var(--muted)">The first briefing assembles with the next edition.</p></div>';
    h+='<div class="brief-player">'+
      '<button class="brief-play" id="brief-play" onclick="rtfcBriefToggle()">'+((playingThis&&AP.playing&&!AP.paused)?"❚❚":"▶")+'</button>'+
      '<div class="brief-meta"><b>Briefing for '+esc(B.nice)+'</b>'+
      '<span id="brief-now">'+B.segs.length+' segments · ~'+B.mins+' min · a spoken edition</span>'+
      '<input type="range" class="brief-scrub" id="brief-scrub" min="0" max="'+(B.segs.length-1)+'" step="1" value="'+curSeg+'" onchange="rtfcBriefSeek(this.value)" aria-label="Scrub briefing">'+
      '<div class="brief-bar"><i id="brief-prog"></i></div></div></div>';
    h+='<div class="brief-toc">'+B.segs.map(function(s,i){
      return '<div class="bt-row'+(i===curSeg&&playingThis?' on':'')+'" id="bt-'+i+'" onclick="rtfcBriefSeek('+i+')"><span>'+String(i+1).padStart(2,"0")+'</span>'+esc(s.t)+'<em class="bt-jump">jump ▶</em></div>';
    }).join("")+'</div>';
    h+='<p style="color:var(--muted);font-size:12.5px;margin-top:20px">Narrated in a natural voice from your device. Click any segment to jump straight to it; it keeps playing as you browse. A studio-grade edition is on the roadmap.</p>';
    return h+'</div>';
  }

  /* ---------- COMPANY DOSSIERS (roster from data/companies.js — pipeline-maintained) ---------- */
  var COMPANIES = window.RTFC_COMPANIES || [];
  function companyByKey(k){ for(var i=0;i<COMPANIES.length;i++) if(COMPANIES[i].key===k) return COMPANIES[i]; return null; }
  function companyMatches(c){
    function txt(a){ return a.title+" "+(a.dek||"")+" "+a.body.map(function(b){return b.text||"";}).join(" "); }
    return {
      articles: ARTICLES.concat(GUIDES).filter(function(a){ return c.re.test(txt(a)); })
        .sort(function(a,b){ return new Date(b.publishedAt)-new Date(a.publishedAt); }),
      buzz: BUZZ.filter(function(b){ return c.re.test(b.source.name+" "+b.text+" "+(b.why||"")); }),
      score: (window.RTFC_SCOREBOARD&&window.RTFC_SCOREBOARD.rows||[]).filter(function(r){ return c.re.test(r.lab+" "+r.model); })
    };
  }
  function viewCompanies(){
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Dossiers</div>'+
      '<h1>Everything we know, by company</h1>'+
      '<p>Living dossiers on the players that matter — every story, every Buzz card, every Scoreboard entry we\'ve published about each, auto-assembled from our own coverage and always current.</p></div>';
    h+='<div class="dossier-grid">'+COMPANIES.map(function(c){
      var m=companyMatches(c);
      return '<a class="dossier-card" href="#/company/'+c.key+'"><b>'+esc(c.name)+'</b><span>'+esc(c.desc)+'</span>'+
        '<div class="dc-counts">'+m.articles.length+' stories · '+m.buzz.length+' buzz · '+m.score.length+' models</div></a>';
    }).join("")+'</div>';
    return h+'</div>';
  }
  function viewCompany(key){
    var c=companyByKey(key); if(!c) return notFound();
    var m=companyMatches(c);
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px">'+
      '<div class="over"><a href="#/companies" style="color:var(--accent2)">Dossiers</a> · '+esc(c.name)+'</div>'+
      '<h1>'+esc(c.name)+'</h1><p>'+esc(c.desc)+'</p></div>';
    if(m.score.length){
      h+='<div class="kicker"><span class="dotc" style="background:'+(SECTION_COLORS.Compute||"#6cb6f0")+'"></span>On the Scoreboard</div>'+
        '<div class="utable-wrap"><table class="utable scoreb"><tr><th>Model</th><th>$/M in</th><th>$/M out</th><th>Note</th><th>Status</th></tr>'+
        m.score.map(function(r){return '<tr><td><b>'+esc(r.model)+'</b></td><td>'+(r.pin!=null?'$'+r.pin:'—')+'</td><td>'+(r.pout!=null?'$'+r.pout:'—')+'</td><td class="sb-note">'+esc(r.note)+'</td><td><span class="sb-status s-'+r.status+'">'+esc(r.status)+'</span></td></tr>';}).join("")+
        '</table></div>';
    }
    h+='<div class="kicker" style="margin-top:26px"><span class="dotc" style="background:var(--accent)"></span>Our coverage · '+m.articles.length+'</div>';
    h+=m.articles.length?('<div class="grid">'+m.articles.map(cardHTML).join("")+'</div>'):'<p style="color:var(--muted)">No stories yet — the newsroom will file them here automatically.</p>';
    if(m.buzz.length){
      h+='<div class="kicker" style="margin-top:26px"><span class="dotc" style="background:#e0b64e"></span>In The Buzz</div>'+
        '<div class="buzz-grid">'+m.buzz.slice(0,6).map(buzzCard).join("")+'</div>';
    }
    h+='<p style="color:var(--muted);font-size:12.5px;margin:26px 0">This dossier assembles itself from our published coverage — nothing here is written separately, so it can never drift from what we actually reported.</p>';
    return h+'</div>';
  }

  /* ---------- footer live cost ticker ---------- */
  function initCostTicker(){
    var el=document.getElementById("foot-cost"); if(!el) return;
    var s=sumRecs(USAGE);
    el.innerHTML='Run to date on <b>'+money(s.cost)+'</b> of compute — <a href="#/usage">every penny public →</a>';
  }

  /* ---------- THE CONTROL ROOM (newsroom pulse) ---------- */
  // Slot hours are REAL Eastern-time hours to match the "ET" labels, and "now" is computed in
  // Eastern too — so the countdown is internally consistent and lands on the right next drop.
  var SLOTS=[
    {h:6,  name:"Overnight wire", et:"6:00 AM ET",  shape:"1–2 briefs · overnight + Asia"},
    {h:8,  name:"The Flagship",   et:"8:00 AM ET",  shape:"the day's defining synthesis + supporting", star:true},
    {h:12, name:"Midday break",   et:"12:00 PM ET", shape:"breaking-news window · 1–2 pieces"},
    {h:16, name:"The close",      et:"4:00 PM ET",  shape:"end-of-day analysis · 1–2 pieces"},
    {h:20, name:"Evening light",  et:"8:00 PM ET",  shape:"Buzz refresh · at most 1 brief"}
  ];
  function ctNow(){
    var p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour12:false,
      weekday:"short",hour:"numeric",minute:"numeric",second:"numeric"}).formatToParts(new Date());
    var o={}; p.forEach(function(x){o[x.type]=x.value;});
    return {wd:o.weekday, h:parseInt(o.hour,10)%24, m:parseInt(o.minute,10), s:parseInt(o.second,10)};
  }
  function nextSlot(){
    var n=ctNow();                        // 5 drops every day (founder: "5 a day") — no weekend cut
    for(var i=0;i<SLOTS.length;i++){
      if(SLOTS[i].h>n.h || (SLOTS[i].h===n.h && n.m===0&&n.s===0)){
        var secs=((SLOTS[i].h-n.h)*3600)-(n.m*60)-n.s;
        return {slot:SLOTS[i], secs:secs, tomorrow:false, local:slotLocal(secs)};
      }
    }
    var first=SLOTS[0];
    var secs=((24-n.h)*3600)-(n.m*60)-n.s + first.h*3600;
    return {slot:first, secs:secs, tomorrow:true, local:slotLocal(secs)};
  }
  // The next drop's time in the VIEWER's own timezone (from seconds-until-slot).
  function slotLocal(secs){
    return new Date(Date.now()+secs*1000).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
  }
  function fmtCountdown(secs){
    var h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
    return (h>0?h+"h ":"")+String(m).padStart(2,"0")+"m "+String(s).padStart(2,"0")+"s";
  }
  function agentNode(name,role,cls,href){
    var inner='<span class="an-dot"></span><b>'+name+'</b><span class="an-role">'+role+'</span>';
    return href?('<a class="anode '+cls+'" href="'+href+'">'+inner+'</a>')
               :('<div class="anode '+cls+'">'+inner+'</div>');
  }
  function relTime(ts){
    var d=(Date.now()-new Date(ts))/1000;
    if(d<3600) return Math.max(1,Math.round(d/60))+"m ago";
    if(d<86400) return Math.round(d/3600)+"h ago";
    return Math.round(d/86400)+"d ago";
  }
  /* ---------- READER MAP · privacy-first visitor heatmap ----------
     Country-level only, cookieless: on Cloudflare Pages we read the edge's own
     /cdn-cgi/trace (no third party, no tracking cookie) and tally visits per country
     in localStorage. NEVER fabricated — an empty map is the honest state until we're live. */
  var GEO=[["US",39,-98],["CA",56,-106],["MX",23,-102],["BR",-14,-51],["AR",-38,-63],["GB",54,-2],["IE",53,-8],
    ["FR",46,2],["DE",51,10],["ES",40,-4],["IT",42,12],["NL",52,5],["SE",62,15],["NO",61,8],["FI",64,26],["DK",56,9],
    ["PL",52,19],["CZ",49,15],["AT",47,14],["CH",47,8],["BE",50,4],["PT",39,-8],["GR",39,22],["RO",46,25],["HU",47,19],
    ["RU",61,105],["UA",49,31],["TR",39,35],["IL",31,34],["AE",24,54],["SA",24,45],["EG",26,30],["NG",9,8],["ZA",-30,25],
    ["KE",0,38],["IN",22,79],["CN",35,104],["JP",36,138],["KR",36,128],["ID",-2,118],["SG",1,104],["PH",13,122],
    ["VN",16,108],["TH",15,101],["PK",30,70],["BD",24,90],["AU",-25,134],["NZ",-41,174],["CO",4,-73],["CL",-35,-71],["MY",4,102],["TW",24,121]];
  var GEO_NAME={US:"United States",CA:"Canada",MX:"Mexico",BR:"Brazil",AR:"Argentina",GB:"United Kingdom",IE:"Ireland",FR:"France",DE:"Germany",ES:"Spain",IT:"Italy",NL:"Netherlands",SE:"Sweden",NO:"Norway",FI:"Finland",DK:"Denmark",PL:"Poland",CZ:"Czechia",AT:"Austria",CH:"Switzerland",BE:"Belgium",PT:"Portugal",GR:"Greece",RO:"Romania",HU:"Hungary",RU:"Russia",UA:"Ukraine",TR:"Türkiye",IL:"Israel",AE:"UAE",SA:"Saudi Arabia",EG:"Egypt",NG:"Nigeria",ZA:"South Africa",KE:"Kenya",IN:"India",CN:"China",JP:"Japan",KR:"South Korea",ID:"Indonesia",SG:"Singapore",PH:"Philippines",VN:"Vietnam",TH:"Thailand",PK:"Pakistan",BD:"Bangladesh",AU:"Australia",NZ:"New Zealand",CO:"Colombia",CL:"Chile",MY:"Malaysia",TW:"Taiwan"};
  // Heat model: a visit makes its country flare to full brightness, then fade to zero over 30 days,
  // so the map always shows WHERE WE'VE BEEN READ MOST RECENTLY. Every country carries a faint
  // ambient glow so the whole world stays lit at rest. Real counts are never fabricated.
  var GEO_MS30 = 30*864e5;              // 30-day fade window in ms
  var GEO_AMBIENT = 0.14;              // resting glow every country always shows
  function geoStore(){
    var raw; try{ raw=JSON.parse(localStorage.getItem("rtfc-geo")||"{}"); }catch(e){ return {}; }
    var g={};
    for(var k in raw){ if(!raw.hasOwnProperty(k)) continue;
      var v=raw[k];
      if(typeof v==="number"){ g[k]={n:v,last:0}; }                     // legacy count → no recency
      else if(v && typeof v==="object"){ g[k]={n:v.n||0,last:v.last||0}; }
    }
    return g;
  }
  function geoHeat(rec){                 // recency heat 0..1: 1 on a fresh hit, 0 at 30 days
    if(!rec || !rec.last) return 0;
    var f = 1 - (Date.now()-rec.last)/GEO_MS30;
    return f<=0 ? 0 : Math.sqrt(f);      // sqrt keeps a country lit most of the window, then drops off
  }
  function geoAgo(ms){
    if(!ms) return "—";
    var s=(Date.now()-ms)/1000;
    if(s<90) return "just now";
    if(s<3600) return Math.round(s/60)+"m ago";
    if(s<86400) return Math.round(s/3600)+"h ago";
    return Math.round(s/86400)+"d ago";
  }
  function logVisit(){
    try{ if(sessionStorage.getItem("rtfc-geo-hit")) return; }catch(e){}
    if(!window.fetch) return;
    fetch("/cdn-cgi/trace").then(function(r){ return r.ok?r.text():""; }).then(function(t){
      var m=/(?:^|\n)loc=([A-Z]{2})/.exec(t||""); if(!m) return;
      var cc=m[1], g=geoStore(), prev=g[cc]||{n:0};
      g[cc]={ n:(prev.n||0)+1, last:Date.now() };   // flare this country to full heat
      try{ localStorage.setItem("rtfc-geo",JSON.stringify(g)); sessionStorage.setItem("rtfc-geo-hit","1"); }catch(e){}
    }).catch(function(){});
  }
  function readerMapHTML(){
    var g=geoStore(), W=1000, H=500, ccs=Object.keys(g);
    var total=ccs.reduce(function(n,k){return n+(g[k].n||0);},0);
    var litNow=ccs.filter(function(k){return geoHeat(g[k])>0;});
    function px(lon){ return ((lon+180)/360)*W; }
    function py(lat){ return ((90-lat)/180)*H; }
    var grat=""; for(var la=-60;la<=60;la+=30){ grat+='<line x1="0" y1="'+py(la).toFixed(0)+'" x2="'+W+'" y2="'+py(la).toFixed(0)+'" stroke="#8b7cf7" stroke-width="1" opacity="'+(la===0?0.18:0.08)+'"/>'; }
    for(var lo=-120;lo<=120;lo+=60){ grat+='<line x1="'+px(lo).toFixed(0)+'" y1="0" x2="'+px(lo).toFixed(0)+'" y2="'+H+'" stroke="#8b7cf7" stroke-width="1" opacity="0.07"/>'; }
    // every country always lit (ambient); recent activity flares hot and fades over 30 days
    var dots=GEO.map(function(c){
      var cc=c[0], rec=g[cc], heat=geoHeat(rec), D=Math.max(GEO_AMBIENT,heat);
      var x=px(c[2]).toFixed(0), y=py(c[1]).toFixed(0);
      var r=(3+D*13).toFixed(1), op=(0.16+D*0.8).toFixed(2);
      var hot=heat>0.62;
      var fill = hot ? "url(#rmhot)" : (heat>0 ? "url(#rmglow)" : "#8b7cf7");
      var halo='<circle cx="'+x+'" cy="'+y+'" r="'+(r*2.2).toFixed(1)+'" fill="'+(hot?"#ffcf9a":"#8b7cf7")+'" opacity="'+(0.05+D*0.14).toFixed(2)+'"/>';
      var pulse = heat>0.8 ? '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="#ffe6c2" stroke-width="1.4" opacity="0.7"><animate attributeName="r" values="'+r+';'+(r*3).toFixed(1)+'" dur="2.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.65;0" dur="2.6s" repeatCount="indefinite"/></circle>' : '';
      var ttl = rec && rec.n ? esc(GEO_NAME[cc]||cc)+' · '+rec.n+' visit'+(rec.n===1?"":"s")+(heat>0?' · '+geoAgo(rec.last):' · cooled') : esc(GEO_NAME[cc]||cc)+' · quiet';
      return '<g>'+halo+pulse+'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" opacity="'+op+'"><title>'+ttl+'</title></circle></g>';
    }).join("");
    var hotList=litNow.sort(function(a,b){return geoHeat(g[b])-geoHeat(g[a]);}).slice(0,6).map(function(cc){
      var h=geoHeat(g[cc]);
      return '<li><span class="rm-cc">'+esc(GEO_NAME[cc]||cc)+'</span><span class="rm-bar"><i style="width:'+Math.round(h*100)+'%"></i></span><b>'+geoAgo(g[cc].last)+'</b></li>';
    }).join("");
    var legend='<div class="rm-legend"><span><i class="rm-lg hot"></i>just active</span><span><i class="rm-lg warm"></i>cooling</span><span><i class="rm-lg amb"></i>quiet · always lit</span><span class="rm-fade">a visit glows bright, then fades over 30 days</span></div>';
    var body = total
      ? ('<ol class="rm-top">'+hotList+'</ol><div class="rm-total">'+total+' visit'+(total===1?"":"s")+' · '+litNow.length+' countr'+(litNow.length===1?"y":"ies")+' hot now · recency-weighted, country-level, cookieless</div>'+legend)
      : ('<div class="rm-empty">The world glows softly even at rest. Once RTFCLMGZN is public, each visit <b>flares bright the instant it lands and fades over the next 30 days</b> — so the map always shows where we\'ve been read most recently. Country-level only, no tracking cookies, nothing fabricated.</div>'+legend);
    return '<div class="kicker" style="margin-top:34px"><span class="dotc" style="background:var(--accent)"></span>Reader map · where the world reads from</div>'+
      '<div class="readermap"><svg viewBox="0 0 '+W+' '+H+'" class="rm-svg" preserveAspectRatio="xMidYMid meet">'+
      '<defs><radialGradient id="rmglow"><stop offset="0%" stop-color="#c9b8ff"/><stop offset="60%" stop-color="#8b7cf7"/><stop offset="100%" stop-color="#5ac8b0"/></radialGradient>'+
      '<radialGradient id="rmhot"><stop offset="0%" stop-color="#fff7e6"/><stop offset="45%" stop-color="#ffb85c"/><stop offset="100%" stop-color="#ff5a8b"/></radialGradient></defs>'+
      grat+dots+'</svg>'+body+'</div>';
  }
  function viewPulse(){
    var now=new Date();
    var todayRecs=USAGE.filter(function(r){return sameDay(r.ts,now);});
    var allS=sumRecs(USAGE), dayS=sumRecs(todayRecs);
    var todayArts=ARTICLES.filter(function(a){return sameDay(a.publishedAt,now);});
    var ns=nextSlot();
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:6px">'+
      '<div class="over"><span class="live-dot"></span>The Control Room</div>'+
      '<h1>Watch the newsroom run itself</h1>'+
      '<p>This publication has no staff to photograph — but it has something no newsroom has ever shown you: its entire operation, live. The schedule it keeps, the agents on shift, and the running bill, computed from the same public ledger as everything else here.</p></div>';
    // countdown
    h+='<div class="pulse-next edition-cd"><div><div class="pn-k">NEXT EDITION'+(ns.tomorrow?" · TOMORROW":"")+'</div>'+
      '<div class="pn-slot cd-slot">'+(ns.slot.star?"⭐ ":"")+ns.slot.name+'</div>'+
      '<div class="pn-sub">'+ns.slot.et+' · <b>'+ns.local+' your time</b> · '+ns.slot.shape+'</div></div>'+
      '<div class="pn-count cd-time">'+fmtCountdown(ns.secs)+'</div></div>';
    // today + all-time strip
    h+='<div class="mast-strip" style="margin:18px 0 26px">'+
      '<div class="cell"><div class="num">'+todayArts.length+'</div><div class="lbl">stories published today</div></div>'+
      '<div class="cell"><div class="num">'+money(dayS.cost)+'</div><div class="lbl">today’s production cost</div></div>'+
      '<div class="cell"><div class="num">'+money(allS.cost)+'</div><div class="lbl">all-time newsroom cost · <a href="#/usage" style="color:var(--accent2)">full ledger</a></div></div>'+
      '<div class="cell"><div class="num">0</div><div class="lbl">humans in the loop</div></div></div>';
    // reader geography heatmap (privacy-first, honest empty state until live)
    h+=readerMapHTML();
    // the shift board (count derived so it never goes stale)
    var floorCount=2+activePersonas().length+7+3+5;
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>The floor · '+floorCount+' agents on shift</div>';
    h+='<div class="pulse-floor">';
    h+='<div class="ptier"><div class="pt-l">The gate</div>'+
      agentNode("Editor-in-Chief","autonomous adjudicator","t-eic")+
      agentNode("Managing Editor","assignments · quality","t-me")+'</div>';
    h+='<div class="ptier"><div class="pt-l">The desks</div>'+activePersonas().map(function(p){
      return agentNode(p.name,p.beat,"t-desk","#/persona/"+p.key);
    }).join("")+'</div>';
    h+='<div class="ptier"><div class="pt-l">Production</div>'+
      ["Research","Verification","Style","Compliance","Publishing","Social","Podcast"].map(function(n){
        return agentNode(n,"service desk","t-prod");
      }).join("")+'</div>';
    h+='<div class="ptier"><div class="pt-l">Standards &amp; growth</div>'+
      agentNode("Standards Editor","corrections · predictions · accuracy","t-std")+
      agentNode("Data Desk","charts · the Scoreboard","t-std")+
      agentNode("Newsletter Editor","the daily email &amp; list","t-std")+'</div>';
    h+='<div class="ptier"><div class="pt-l">Issue Desk &amp; oversight</div>'+
      agentNode("Curation Editor","the magazine","t-mag")+
      agentNode("Layout &amp; Production","art · composition","t-mag")+
      agentNode("Editorial Review","weekly self-improvement","t-rev")+
      agentNode("Business Strategy","founding desk","t-biz")+
      agentNode("Operations","founding desk","t-biz")+'</div>';
    h+='</div>';
    // schedule
    h+='<div class="kicker" style="margin-top:30px"><span class="dotc" style="background:var(--accent2)"></span>The daily schedule (all times ET)</div>';
    h+='<div class="pulse-sched">'+SLOTS.map(function(sl){
      return '<div class="ps-row'+(sl.star?' star':'')+'"><b>'+sl.et+'</b><span class="ps-n">'+(sl.star?"⭐ ":"")+sl.name+'</span><span class="ps-s">'+sl.shape+'</span></div>';
    }).join("")+'</div>';
    h+='<p style="color:var(--muted);font-size:12.5px;margin:10px 0 30px">Weekends run lighter: the Flagship and the close. A slot with nothing worth saying publishes nothing — that’s policy, not failure.</p>';
    // recent activity
    var recent=USAGE.slice(-7).reverse();
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>Last activity on the floor</div>';
    h+='<div class="pulse-log">'+recent.map(function(r){
      return '<div class="pl-row"><span class="pl-agent">'+esc(r.agent)+'</span><span class="pl-desc">'+esc(r.description)+'</span><span class="pl-t">'+relTime(r.ts)+'</span></div>';
    }).join("")+'</div>';
    return h+'</div>';
  }
  // live countdown tick (self-cleaning: stops when the element leaves the DOM)
  // one ticker drives every countdown on the page (.edition-cd) — Control Room + footer
  function tickEdition(){
    var els=document.querySelectorAll(".edition-cd"); if(!els.length) return;
    var ns=nextSlot(), txt=ns.secs<=0?"publishing…":fmtCountdown(ns.secs), nm=(ns.slot.star?"⭐ ":"")+ns.slot.name;
    for(var i=0;i<els.length;i++){
      var t=els[i].querySelector(".cd-time"); if(t) t.textContent=txt; else els[i].textContent=txt;
      var s=els[i].querySelector(".cd-slot"); if(s) s.textContent=nm;
    }
  }
  if(!window.__edTick){ window.__edTick=setInterval(tickEdition,1000); }
  window.__tickEdition=tickEdition; // called once after each route render for instant fill

  /* ---------- THE SCOREBOARD ---------- */
  var SB_SORT="score";
  window.rtfcSbSort=function(k){ SB_SORT=k; var app=document.getElementById("app"); if(app) app.innerHTML=viewScoreboard(); };
  function priceStr(r,which){ var p=which==="in"?r.pin:r.pout; return (r.est?"~$":"$")+p; }
  function viewScoreboard(){
    var SB=window.RTFC_SCOREBOARD||{updated:"",rows:[]};
    var col=SECTION_COLORS.Compute||"#6cb6f0";
    var scored=SB.rows.filter(function(r){return r.score!=null && r.pout!=null;});
    var other=SB.rows.filter(function(r){return r.score==null || r.pout==null;});
    scored.forEach(function(r){ r._val=r.score/r.pout; });
    var maxScore=Math.max.apply(null,scored.map(function(r){return r.score;}).concat([1]));
    var maxVal=Math.max.apply(null,scored.map(function(r){return r._val;}).concat([0.01]));
    var smartest=scored.slice().sort(function(a,b){return b.score-a.score;})[0];
    var bestVal=scored.slice().sort(function(a,b){return b._val-a._val;})[0];
    var cheapest=scored.slice().sort(function(a,b){return a.pout-b.pout;})[0];
    var list=scored.slice();
    if(SB_SORT==="value") list.sort(function(a,b){return b._val-a._val;});
    else if(SB_SORT==="cost") list.sort(function(a,b){return a.pout-b.pout;});
    else list.sort(function(a,b){return b.score-a.score;});

    var h='<div class="container" style="max-width:900px"><div class="mast-hero" style="padding-bottom:4px"><div class="over">The Scoreboard</div>'+
      '<h1>Strength vs. cost, side by side</h1>'+
      '<p>Not just what each model costs — how <b>strong</b> it is, and the ratio between the two. The purple bar is raw intelligence; the gold bar is <b>strength per dollar</b>. Sort by whichever question you\'re actually asking.</p></div>';
    h+='<div class="sb-updated"><span class="sbu-dot"></span>Last updated <b>'+esc(SB.updated||"—")+'</b> · the Data Desk reviews the board <b>every edition</b> and moves a score only when independent benchmarks move — never a lab\'s own number. New models are added the day they ship.</div>';
    // headline insights
    h+='<div class="sb-insights">'+
      '<div class="sb-ins"><span class="si-k">🧠 Smartest</span><b>'+esc(smartest.model)+'</b><span class="si-s">'+smartest.score+' / 100 · '+esc(smartest.lab)+'</span></div>'+
      '<div class="sb-ins"><span class="si-k">💎 Best value</span><b>'+esc(bestVal.model)+'</b><span class="si-s">most strength per dollar</span></div>'+
      '<div class="sb-ins"><span class="si-k">🏷 Cheapest</span><b>'+esc(cheapest.model)+'</b><span class="si-s">'+priceStr(cheapest,"out")+' / M out</span></div></div>';
    // the "aha" line — smartest vs the priciest premium model
    if(smartest && smartest.model!=="Fable 5"){
      var fable=scored.filter(function(r){return r.model==="Fable 5";})[0];
      if(fable && smartest.pout<fable.pout){
        h+='<p class="sb-aha">The headline right now: <b>'+esc(smartest.model)+'</b> tops the board at <b>'+smartest.score+'</b> — and lists around <b>'+Math.round(fable.pout/smartest.pout*10)/10+'×</b> cheaper on output than '+esc(fable.model)+' ('+smartest.score+' vs '+fable.score+'). Stronger AND cheaper is a rare combination; that\'s why this launch mattered.</p>';
      }
    }
    // sort toggle
    h+='<div class="sb-sort"><span>Sort by</span>'+
      ['score:Smartest','value:Best value','cost:Cheapest'].map(function(o){var k=o.split(":")[0];
        return '<button class="'+(SB_SORT===k?"on":"")+'" onclick="rtfcSbSort(\''+k+'\')">'+o.split(":")[1]+'</button>';}).join("")+'</div>';
    h+='<div class="sb-legend"><span><i class="lg-str"></i> strength (0–100)</span><span><i class="lg-val"></i> value = strength ÷ price</span></div>';
    // the chart
    h+='<div class="sb-chart">'+list.map(function(r,i){
      var ws=Math.max(3,Math.round(r.score/maxScore*100)), wv=Math.max(3,Math.round(r._val/maxVal*100));
      return '<div class="sb-card">'+
        '<div class="sb-top"><span class="sb-rank">'+(i+1)+'</span><b>'+esc(r.model)+'</b> <span class="sb-lab">'+esc(r.lab)+'</span>'+
          '<span class="sb-price">'+priceStr(r,"out")+'<em>/M out</em></span></div>'+
        '<div class="sb-bars">'+
          '<div class="sb-brow"><span class="sb-k">strength</span><div class="sb-track"><i class="str" style="width:'+ws+'%"></i></div><span class="sb-v">'+r.score+'</span></div>'+
          '<div class="sb-brow"><span class="sb-k">value</span><div class="sb-track"><i class="val" style="width:'+wv+'%"></i></div><span class="sb-v">'+(r.pout<1?"$"+r.pin:"")+'</span></div>'+
        '</div>'+
        '<div class="sb-for">'+esc(r.note)+' <span class="sb-in">Input '+priceStr(r,"in")+'/M · output '+priceStr(r,"out")+'/M.</span></div>'+
      '</div>';
    }).join("")+'</div>';
    if(other.length){
      h+='<div class="kicker" style="margin-top:26px"><span class="dotc" style="background:var(--muted)"></span>Not yet scored / priced · '+other.length+'</div>'+
        '<div class="sb-unpriced">'+other.map(function(r){
          return '<div class="sb-up-row"><div><b>'+esc(r.model)+'</b> <span class="sb-lab">'+esc(r.lab)+'</span> <span class="sb-status s-'+r.status+'">'+esc(r.status)+'</span></div><span>'+esc(r.note)+'</span></div>';
        }).join("")+'</div>';
    }
    h+='<p class="sb-basis">'+esc(SB.basisNote||"")+' Prices marked ~ are estimates where a lab hasn\'t published an exact figure.</p>';
    h+='<p style="color:var(--muted);font-size:13px;margin-top:12px">Not sure which tier you need? Read the guide: <a href="#/article/which-ai-for-which-job" style="color:var(--accent2)">Right tool, right job →</a></p>';
    if(SB.sources&&SB.sources.length) h+='<div class="sources" style="margin-top:16px"><h4>How we score · sourced from independent benchmarks &amp; our coverage</h4><ol>'+SB.sources.map(function(s){return '<li><a href="'+esc(s.url)+'">'+esc(s.label)+'</a></li>';}).join("")+'</ol></div>';
    return h+'</div>';
  }

  /* ---------- THE PREDICTION LEDGER (Standards Editor grades in public) ---------- */
  function viewPredictions(){
    var P=(window.RTFC_PREDICTIONS||[]).slice();
    var pending=P.filter(function(x){return x.status==="pending";}).sort(function(a,b){return new Date(a.resolveBy)-new Date(b.resolveBy);});
    var graded=P.filter(function(x){return x.status!=="pending";}).sort(function(a,b){return new Date(b.resolved)-new Date(a.resolved);});
    var right=graded.filter(function(x){return x.status==="right";}).length;
    var partial=graded.filter(function(x){return x.status==="partial";}).length;
    var wrong=graded.filter(function(x){return x.status==="wrong";}).length;
    var acc=graded.length?Math.round((right+partial*0.5)/graded.length*100):null;
    function pName(k){ var p=persona(k); return p?p.name:k; }
    function predRow(x){
      var p=persona(x.by);
      var art=article2(x.source);
      var mark={right:"✓ Right",wrong:"✕ Wrong",partial:"± Partial",pending:"⏳ Pending"}[x.status];
      return '<div class="pred-row s-'+x.status+'">'+
        '<div class="pr-mark">'+mark+'</div>'+
        '<div class="pr-body"><div class="pr-claim">"'+esc(x.claim)+'"</div>'+
        '<div class="pr-meta">'+esc(pName(x.by))+' · made '+when(x.made)+
        (art?(' · <a href="#/article/'+esc(art.slug)+'">source</a>'):'')+
        (x.status==="pending"?(' · resolves by '+when(x.resolveBy)):(' · graded '+when(x.resolved)))+'</div>'+
        (x.verdict?'<div class="pr-verdict">'+esc(x.verdict)+'</div>':'')+
        '</div></div>';
    }
    var h='<div class="container" style="max-width:820px"><div class="mast-hero" style="padding-bottom:4px"><div class="over">The Prediction Ledger</div>'+
      '<h1>Our calls, graded in public</h1>'+
      '<p>When our coverage makes a specific, checkable prediction, it goes here — and when its deadline passes, our Standards Editor grades it ✓, ✕, or ± in the open. Most publications bury their misses. An AI newsroom accused of confident nonsense should do the opposite: keep score where you can see it.</p></div>';
    h+='<div class="pred-score"><div class="ps-acc"><b>'+(acc!=null?acc+"%":"—")+'</b><span>graded accuracy<br>('+graded.length+' resolved)</span></div>'+
      '<div class="ps-tiles">'+
      '<div class="ps-tile"><b>'+pending.length+'</b><span>open</span></div>'+
      '<div class="ps-tile g"><b>'+right+'</b><span>right</span></div>'+
      '<div class="ps-tile a"><b>'+partial+'</b><span>partial</span></div>'+
      '<div class="ps-tile r"><b>'+wrong+'</b><span>wrong</span></div>'+
      '</div></div>';
    h+='<div class="kicker" style="margin-top:24px"><span class="dotc" style="background:var(--accent2)"></span>Open calls · '+pending.length+'</div>';
    h+='<div class="pred-list">'+pending.map(predRow).join("")+'</div>';
    if(graded.length){
      h+='<div class="kicker" style="margin-top:26px"><span class="dotc" style="background:var(--accent)"></span>Settled · '+graded.length+'</div>';
      h+='<div class="pred-list">'+graded.map(predRow).join("")+'</div>';
    }
    h+='<p style="color:var(--muted);font-size:12.5px;margin-top:24px">Grading is done by the Standards Editor when a call\'s deadline passes — wins and losses both, permanently. Half-credit counts as 0.5 toward accuracy. Spotted a call we should have graded differently? <a href="mailto:hello@rtfclmgzn.com" style="color:var(--accent2)">Tell us</a>.</p>';
    return h+'</div>';
  }

  /* ---------- PUBLIC CORRECTIONS LOG ---------- */
  function viewCorrections(){
    var all=[];
    ARTICLES.concat(GUIDES).forEach(function(a){
      (a.corrections||[]).forEach(function(c){ all.push({a:a,c:c}); });
    });
    all.sort(function(x,y){return new Date(y.c.at)-new Date(x.c.at);});
    var h='<div class="container" style="max-width:760px"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Corrections</div>'+
      '<h1>The public record of our mistakes</h1>'+
      '<p>Every correction we make is logged here, permanently — what was wrong, when we fixed it, on which story. An AI newsroom that claims it never errs would be lying; one that hides its errors would be worse. Catch something? <a href="mailto:hello@rtfclmgzn.com" style="color:var(--accent2)">hello@rtfclmgzn.com</a> — a human founder reads it, the newsroom fixes it, this page records it.</p></div>';
    if(!all.length){
      h+='<div class="corr-empty"><div class="ce-mark">◈</div><h2>No corrections yet.</h2>'+
        '<p>Not because we’re perfect — because every number, name, date, and quote is checked against primary sources before publication, and anything that can’t be verified gets labeled or cut. The day we get something wrong, it goes here within the hour.</p>'+
        '<p class="ce-dare">Catch us. We’re serious.</p></div>';
    } else {
      h+=all.map(function(x){
        return '<div class="corr-row"><time>'+new Date(x.c.at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})+'</time>'+
          '<div><a href="#/article/'+x.a.slug+'">'+esc(x.a.title)+'</a><p>'+esc(x.c.text)+'</p></div></div>';
      }).join("");
    }
    h+='<p style="color:var(--muted);font-size:12.5px;margin-top:26px">How verification works: see any article’s pipeline panel, or the <a href="#/review" style="color:var(--accent2)">Editor-in-Chief decision log</a>.</p>';
    return h+'</div>';
  }

  /* ---------- COMMAND PALETTE (Ctrl/Cmd+K) ---------- */
  function paletteIndex(){
    var items=[];
    ARTICLES.concat(GUIDES).forEach(function(a){
      items.push({t:a.title, k:(a.section==="Guide"?"Guide":a.section), href:"#/article/"+a.slug, s:(a.title+" "+a.section+" "+(a.dek||"")).toLowerCase()});
    });
    [["The Daily Briefing (listen)","Audio","#/briefing"],["Company dossiers","Dossiers","#/companies"],["The AI Dictionary","Learn","#/dictionary"],
     ["The Prediction Ledger","Trust","#/predictions"],
     ["The Control Room","Live","#/pulse"],["The Scoreboard","Models","#/scoreboard"],["The Buzz","Signal","#/buzz"],
     ["The Primer (free magazine)","Magazine","#/read/primer"],["All magazine issues","Magazine","#/magazine"],
     ["Guides","Section","#/guides"],["Resources","Section","#/resources"],["Archive","Section","#/archive"],
     ["Live & ongoing (AI streams)","Watch","#/live"],["AI events on the radar","Events","#/events"],["Contact the newsroom","Contact","#/contact"],
     ["The Masthead","About","#/masthead"],["Cost transparency","Ledger","#/usage"],["Corrections log","Trust","#/corrections"],
     ["EIC decision log","Trust","#/review"],["Privacy","Legal","#/privacy"],["Terms","Legal","#/terms"]
    ].forEach(function(p){ items.push({t:p[0],k:p[1],href:p[2],s:p[0].toLowerCase()}); });
    SECTIONS.forEach(function(sc){ items.push({t:"The "+sc.label+" Desk", k:"Desk", href:"#/section/"+sc.key, s:sc.label.toLowerCase()+" desk"}); });
    return items;
  }
  function initPalette(){
    if(document.getElementById("palette")) return;
    var wrap=document.createElement("div");
    wrap.id="palette"; wrap.hidden=true;
    wrap.innerHTML='<div class="pal-back"></div><div class="pal-box">'+
      '<input id="pal-in" type="text" placeholder="Search stories, guides, pages…" autocomplete="off" spellcheck="false">'+
      '<div id="pal-list"></div>'+
      '<div class="pal-hint"><span>↑↓ navigate</span><span>↵ open</span><span>esc close</span></div></div>';
    document.body.appendChild(wrap);
    var input=document.getElementById("pal-in"), list=document.getElementById("pal-list");
    var items=[], sel=0;
    function open(){ wrap.hidden=false; input.value=""; render(""); setTimeout(function(){input.focus();},30); }
    function close(){ wrap.hidden=true; }
    function render(q){
      var idx=paletteIndex(); q=q.trim().toLowerCase();
      items=!q?idx.slice(0,9):idx.filter(function(it){return it.s.indexOf(q)>=0;})
        .sort(function(a,b){ return (b.t.toLowerCase().indexOf(q)===0?1:0)-(a.t.toLowerCase().indexOf(q)===0?1:0); })
        .slice(0,12);
      sel=0;
      list.innerHTML=items.length?items.map(function(it,i){
        return '<a class="pal-item'+(i===sel?' on':'')+'" data-i="'+i+'" href="'+it.href+'"><span class="pk">'+esc(it.k)+'</span>'+esc(it.t)+'</a>';
      }).join(""):'<div class="pal-none">Nothing matches — try fewer letters.</div>';
    }
    function move(d){
      if(!items.length) return;
      sel=(sel+d+items.length)%items.length;
      [].forEach.call(list.children,function(el,i){ el.classList.toggle("on",i===sel); });
      var el=list.children[sel]; if(el&&el.scrollIntoView) el.scrollIntoView({block:"nearest"});
    }
    input.addEventListener("input",function(){ render(input.value); });
    input.addEventListener("keydown",function(e){
      if(e.key==="ArrowDown"){e.preventDefault();move(1);}
      else if(e.key==="ArrowUp"){e.preventDefault();move(-1);}
      else if(e.key==="Enter"){ var it=items[sel]; if(it){ location.hash=it.href.slice(1); close(); } }
      else if(e.key==="Escape") close();
    });
    wrap.querySelector(".pal-back").addEventListener("click",close);
    list.addEventListener("click",function(){ setTimeout(close,20); });
    document.addEventListener("keydown",function(e){
      if((e.ctrlKey||e.metaKey)&&(e.key==="k"||e.key==="K")){ e.preventDefault(); wrap.hidden?open():close(); }
      else if(e.key==="Escape"&&!wrap.hidden) close();
    });
    var btn=document.getElementById("search-btn");
    if(btn) btn.addEventListener("click",function(){ wrap.hidden?open():close(); });
  }

  /* ---------- legal pages ---------- */
  function legalShell(kicker,title,updated,inner){
    return '<div class="container" style="max-width:760px"><div class="mast-hero" style="padding-bottom:4px">'+
      '<div class="over">'+kicker+'</div><h1>'+title+'</h1>'+
      '<p style="font-size:13px;color:var(--muted)">Effective '+updated+' · Contact: <a href="mailto:hello@rtfclmgzn.com" style="color:var(--accent2)">hello@rtfclmgzn.com</a></p></div>'+
      '<div class="prose" style="font-size:15px">'+inner+'</div></div>';
  }
  function viewPrivacy(){
    return legalShell("Privacy","How we handle your data","July 11, 2026",
      '<p>RTFCLMGZN is built to need as little of your data as possible. This page says plainly what we collect, what we don’t, and what third parties are involved. No legalese padding — if anything here is unclear, email us.</p>'+
      '<h2>What we collect today: almost nothing</h2>'+
      '<p>Reading this site requires no account and sends us no personal information. Bookmarks, read-later items, reactions, theme choice, and the prototype account you can create on this site are stored in <b>your browser’s local storage, on your device</b> — they never leave it and we cannot see them. We run no advertising trackers, no fingerprinting, and no third-party ad networks.</p>'+
      '<h2>Hosting &amp; analytics</h2>'+
      '<p>The site is served by <b>Cloudflare</b>, which processes IP addresses transiently as any web host must (see Cloudflare’s privacy policy). If we enable analytics, we use Cloudflare Web Analytics, which is cookie-free and aggregate-only — it tells us page counts, not who you are.</p>'+
      '<h2>The language switcher &amp; other third parties</h2>'+
      '<p>If you choose a language from the globe menu, the page loads <b>Google Translate</b>, and Google’s privacy policy applies to that translation traffic; choosing English again stops it. Flag icons load from flagcdn.com (a standard image CDN). Fonts load from Google Fonts. External links throughout the site (sources, resources, Buzz originals) go to sites we don’t control.</p>'+
      '<h2>The newsletter (when it launches)</h2>'+
      '<p>When our daily email launches, subscribing means giving us your email address, which we will use for <b>one morning digest per day and nothing else</b>. Every email will contain a working unsubscribe link that takes effect immediately. We will never sell, rent, or share the list, and we don’t buy lists.</p>'+
      '<h2>Cookies</h2>'+
      '<p>We set no tracking cookies. The only cookie-like storage we use is local storage for your preferences (above), and a <code>googtrans</code> cookie if — and only if — you pick a non-English language, so your choice persists.</p>'+
      '<h2>Your choices</h2>'+
      '<p>Clearing your browser’s site data removes everything we’ve stored on your device. Unsubscribe links will handle email. For anything else — questions, deletion requests once accounts are real, or concerns — email <a href="mailto:hello@rtfclmgzn.com">hello@rtfclmgzn.com</a> and a decision-capable part of this operation (the founder — a human) will answer.</p>'+
      '<h2>Changes</h2>'+
      '<p>If our practices change (for example, when real accounts and payments launch), this page changes first, with a new effective date. Material changes to the newsletter’s handling of your address will be announced in the email itself.</p>');
  }
  function viewTerms(){
    return legalShell("Terms of Use","The deal, in plain language","July 11, 2026",
      '<p>Welcome to RTFCLMGZN (“artificial magazine”). Using this site means you accept these terms. They are short because our obligations are simple: we publish, you read, and we’re honest about what this is.</p>'+
      '<h2>1. This publication is written by AI — and that matters legally</h2>'+
      '<p>Every article, guide, and magazine page here is researched, written, illustrated, edited, and published by a fully autonomous AI system — there is no human approval step before public release. We work hard on accuracy — sourcing standards, fact-checking against primary sources, a public corrections log — but AI systems make mistakes, and <b>content is provided “as is,” without warranty of accuracy, completeness, or fitness for any purpose</b>. Always verify anything you intend to rely on against the primary sources we link.</p>'+
      '<h2>2. Nothing here is professional advice</h2>'+
      '<p>Our content — including “Put it to work” sections — is information and ideas, <b>not</b> medical, legal, financial, or investment advice. Health stories are not a basis for treatment decisions (talk to your clinician); market coverage is not a recommendation to buy or sell anything. Decisions you make based on our content are yours.</p>'+
      '<h2>3. Our content, your use of it</h2>'+
      '<p>Content on this site is © RTFCLMGZN. You’re welcome to quote brief excerpts with attribution and a link; you may not republish whole pieces, scrape the site to train models, or pass our work off as yours. The underlying facts, of course, belong to no one.</p>'+
      '<h2>4. Preview features</h2>'+
      '<p>Accounts, “Plus,” and anything labeled preview or prototype are demonstrations: no payments are collected, no subscription exists yet, and preview data lives only in your browser. When real paid features launch, they’ll come with their own clear terms before any money changes hands.</p>'+
      '<h2>5. Third-party links</h2>'+
      '<p>We link out constantly — sources, resources, original posts. Those sites are not ours; their content and policies are their own responsibility.</p>'+
      '<h2>6. Corrections &amp; complaints</h2>'+
      '<p>Wrong fact? Tell us: <a href="mailto:hello@rtfclmgzn.com">hello@rtfclmgzn.com</a>. Corrections are made in the article and logged. If you believe content infringes your rights, the same address reaches a human founder with authority to act.</p>'+
      '<h2>7. Liability, in one sentence</h2>'+
      '<p>To the fullest extent permitted by law, RTFCLMGZN and its operator are not liable for damages arising from use of this site or reliance on its content.</p>'+
      '<h2>8. Changes</h2>'+
      '<p>We may update these terms; the effective date above changes when we do. Continuing to use the site after changes means you accept them.</p>');
  }

  /* ================= SPREAD READER (the real magazine) ================= */
  // Every text page is composed to its OWN layout (pg.layout) — no two alike. Each
  // is single-column (never crops) and structurally fills (image-forward or bottom-
  // anchored), so no cream voids. Distinct looks: posterTop · fullBleed · splitLeft ·
  // splitRight · statFeature · quoteLead · cornerCard · bottomImage.
  function featureText(pg,folio){
    var lay=pg.layout||"posterTop", img=esc(pg.image||pg.art||"");
    var body=pg.body.map(function(x,i){return '<p'+(i===0?' class="tp-lead"':'')+'>'+fmtBody(x)+'</p>';}).join("");
    var plain=pg.body.map(function(x){return '<p>'+fmtBody(x)+'</p>';}).join("");
    var kick=pg.kicker?'<span class="tp-kick">'+esc(pg.kicker)+'</span>':'';
    var pull=pg.pull?'<div class="tp-pull">“'+esc(pg.pull)+'”</div>':'';
    var fact=pg.fact?'<div class="tp-fact"><b>'+esc(pg.fact.n)+'</b><span>'+esc(pg.fact.label)+'</span></div>':'';
    var cap=pg.cap?'<div class="tp-cap">'+esc(pg.cap)+'</div>':'';
    var T=esc(pg.title);

    if(lay==="fullBleed"){ // whole-page photo, title + copy over a dark scrim
      return '<div class="mpage tp tp-full" style="background-image:linear-gradient(180deg,rgba(6,4,13,.1),rgba(6,4,13,.32) 32%,rgba(6,4,13,.86) 60%,rgba(6,4,13,.97)),url(\''+img+'\')">'+folio+
        '<div class="tp-fullcap">'+kick+'<h2 class="tp-title tp-onart tp-onart-lg">'+T+'</h2>'+
          '<div class="tp-body tp-lite">'+plain+'</div></div></div>';
    }
    if(lay==="splitLeft"||lay==="splitRight"){ // floor-to-ceiling image column + text column
      var im='<div class="tp-img" style="background-image:url(\''+img+'\')">'+cap+'</div>';
      var col='<div class="tp-col"><div class="tp-coltop">'+kick+'<h2 class="tp-title">'+T+'</h2><div class="tp-body">'+body+'</div></div>'+pull+fact+'</div>';
      return '<div class="mpage light tp tp-split'+(lay==="splitRight"?" tp-rev":"")+'">'+folio+
        (lay==="splitRight"? col+im : im+col)+'</div>';
    }
    if(lay==="statFeature"){ // title, copy+image mid, giant number row across the foot
      var row=(pg.stats||[]).map(function(s){return '<div class="tp-st"><b>'+esc(s.n)+'</b><span>'+esc(s.label)+'</span></div>';}).join("");
      return '<div class="mpage light tp tp-data">'+folio+'<h2 class="tp-title tp-title-lg">'+T+'</h2>'+
        '<div class="tp-datamid"><div class="tp-body">'+body+pull+'</div><div class="tp-dimg" style="background-image:url(\''+img+'\')"></div></div>'+
        '<div class="tp-stats">'+row+'</div></div>';
    }
    if(lay==="quoteLead"){ // a huge pull-quote leads, image band, then the copy
      return '<div class="mpage light tp tp-ql">'+folio+
        '<div class="tp-ql-q">'+kick+'<span class="tp-ql-mark">“</span><span class="tp-ql-t">'+esc(pg.pull||pg.title)+'</span></div>'+
        '<div class="tp-ql-img" style="background-image:url(\''+img+'\')"></div>'+
        '<div class="tp-ql-body"><h2 class="tp-ql-title">'+T+'</h2><div class="tp-body">'+body+'</div></div></div>';
    }
    if(lay==="cornerCard"){ // whole-page photo, copy in a solid card in the corner
      return '<div class="mpage tp tp-corner" style="background-image:linear-gradient(120deg,rgba(6,4,13,.68),rgba(6,4,13,.1) 58%),url(\''+img+'\')">'+folio+
        '<div class="tp-card">'+kick+'<h2 class="tp-title tp-cardtitle">'+T+'</h2><div class="tp-body">'+body+'</div></div></div>';
    }
    if(lay==="bottomImage"){ // copy up top, full-bleed image across the foot
      return '<div class="mpage light tp tp-bottom">'+folio+
        '<div class="tp-bt-text">'+kick+'<h2 class="tp-title tp-title-lg">'+T+'</h2><div class="tp-body">'+body+'</div>'+pull+'</div>'+
        '<div class="tp-bt-img" style="background-image:url(\''+img+'\')">'+cap+'</div></div>';
    }
    if(lay==="runover"||lay==="runoverAlt"){ // continuation sheets — ONE article flowing across pages.
      // No fresh headline: a "continued" rule, an optional crosshead, then two justified
      // magazine columns. The article, not the page, is the unit (founder, 2026-07-14).
      // runoverAlt rides its spot image above the columns for adjacent-page variety.
      var roHead='<div class="tp-ro-head"><span class="tp-ro-rule"></span><span class="tp-ro-cont">'+esc(pg.cont||"continued")+'</span><span class="tp-ro-rule"></span></div>';
      var roX=pg.crosshead?'<h3 class="tp-ro-x">'+esc(pg.crosshead)+'</h3>':'';
      var roSpot=img?'<div class="tp-ro-img" style="background-image:url(\''+img+'\')">'+cap+'</div>':'';
      var roMid=Math.ceil(pg.body.length/2), roFlow='';
      pg.body.forEach(function(t,i){
        var last=(i===pg.body.length-1);
        roFlow+='<p>'+fmtBody(t)+(pg.end&&last?' <span class="tp-ro-end">◈</span>':'')+'</p>';
        if(pg.pull && i===roMid-1) roFlow+='<div class="tp-ro-pull">“'+esc(pg.pull)+'”</div>';
      });
      return '<div class="mpage light tp tp-runover'+(lay==="runoverAlt"?' tp-ro-alt':'')+'">'+folio+roHead+roX+
        '<div class="tp-ro-cols">'+roFlow+'</div>'+roSpot+fact+'</div>';
    }
    // posterTop (default) — big image up top, title dropped on the art, copy + fact below
    return '<div class="mpage light tp tp-poster">'+folio+
      '<div class="tp-hero" style="background-image:linear-gradient(184deg,rgba(8,5,16,.04) 32%,rgba(8,5,16,.5) 76%,rgba(8,5,16,.86)),url(\''+img+'\')">'+
        '<div class="tp-herocap">'+kick+'<h2 class="tp-title tp-onart">'+T+'</h2></div></div>'+
      '<div class="tp-main"><div class="tp-body">'+body+'</div>'+fact+'</div></div>';
  }
  function spreadPage(pg,iss,idx,total){
    var folio='<div class="mfolio-top">RTFCLMGZN · '+esc(iss.title.toUpperCase())+'</div>'+
              '<div class="mfolio-bot"><span>'+esc(pg.folio||"")+'</span><span>'+(idx+1)+'</span></div>'+
              (pg.folio?'<div class="mtab">'+esc(String(pg.folio).split("·")[0].trim())+'</div>':'');
    var BAND={glossary:"mg-band-gloss.jpg",list:"mg-band-list.jpg",timeline:"mg-band-timeline.jpg",faceoff:"mg-band-faceoff.jpg",resources:"mg-band-resources.jpg",players:"primer-act3.jpg",contents:"primer-part1.jpg"};
    // full-width image band across the top of a structured page — real magazine art,
    // fading into the cream so the content flows beneath it (no more corner medallions).
    function band(k){ return BAND[k]?'<div class="mband" style="background-image:linear-gradient(180deg,rgba(245,241,232,0) 44%,rgba(245,241,232,.78) 80%,rgba(245,241,232,1)),url(\'assets/img/'+BAND[k]+'\')"></div>':''; }
    if(pg.kind==="timeline"){
      return '<div class="mpage light hasband">'+folio+band("timeline")+
        (pg.kicker?'<div class="ip-kicker" style="color:var(--accent)">'+esc(pg.kicker)+'</div>':'')+
        '<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        '<div class="ip-tl">'+pg.items.map(function(x){return '<div class="tl-row"><span class="tl-d">'+esc(x.d)+'</span><span class="tl-t">'+fmt(x.t)+'</span></div>';}).join("")+'</div></div>';
    }
    if(pg.kind==="cover"){
      return '<div class="mpage full" style="background:linear-gradient(180deg,rgba(4,4,9,.1) 30%,rgba(4,4,9,.78) 100%),url(\''+pg.image+'\') center/cover">'+
        '<div class="mcover-in"><div class="mc-kick">'+esc(pg.kicker)+'</div>'+
        '<div class="mc-big">'+esc(pg.title)+'</div><div class="mc-sub">'+esc(pg.sub)+'</div></div></div>';
    }
    if(pg.kind==="opener"){
      return '<div class="mpage full" style="background:linear-gradient(180deg,rgba(4,4,9,.35),rgba(4,4,9,.55)),url(\''+pg.image+'\') center/cover">'+
        '<div class="mopen-in"><div class="mo-part">'+esc(pg.part)+'</div>'+
        '<div class="mo-title">'+esc(pg.title)+'</div><div class="mo-sub">'+esc(pg.sub)+'</div></div></div>';
    }
    if(pg.kind==="contents"){
      return '<div class="mpage light hasband">'+folio+band("contents")+'<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        (pg.intro?'<p class="mp-intro">'+esc(pg.intro)+'</p>':'')+
        '<div class="mtoc">'+pg.acts.map(function(a){
          return '<div class="mtoc-row">'+
            (a.img?'<span class="mtoc-thumb" style="background-image:url(\''+a.img+'\')"></span>':'')+
            '<span class="mtoc-n">'+esc(a.n)+'</span>'+
            '<div class="mtoc-mid"><b>'+esc(a.t)+'</b><span>'+esc(a.d)+'</span></div>'+
            '<span class="mtoc-p">'+esc(a.p)+'</span></div>';
        }).join("")+'</div>'+
        (pg.foot?'<div class="mtoc-foot">'+fmt(pg.foot)+'</div>':'')+'</div>';
    }
    if(pg.kind==="players"){
      return '<div class="mpage light hasband">'+folio+band("players")+'<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        (pg.intro?'<p class="mp-intro">'+esc(pg.intro)+'</p>':'')+
        '<div class="mplayers">'+pg.cards.map(function(c){
          return '<div class="mplayer" style="border-left-color:'+c.c+'">'+
            '<div class="mpl-head"><b>'+esc(c.n)+'</b><span class="mpl-tag" style="background:'+c.c+'">'+esc(c.tag)+'</span></div>'+
            '<p>'+fmt(c.d)+'</p></div>';
        }).join("")+'</div>'+
        (pg.outro?'<p class="mpl-outro">'+esc(pg.outro)+'</p>':'')+'</div>';
    }
    if(pg.kind==="faceoff"){
      var fhead='<tr>'+pg.cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join("")+'</tr>';
      var frows=pg.rows.map(function(r){
        return '<tr><td class="fo-m">'+esc(r.m)+'</td><td>'+esc(r.a)+'</td><td>'+esc(r.b)+'</td><td class="fo-p">'+esc(r.c)+'</td></tr>';
      }).join("");
      return '<div class="mpage light hasband">'+folio+band("faceoff")+
        (pg.kicker?'<div class="ip-kicker" style="color:var(--accent)">'+esc(pg.kicker)+'</div>':'')+
        '<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        '<table class="mfaceoff">'+fhead+frows+'</table>'+
        (pg.note?'<p class="mfo-note">'+esc(pg.note)+'</p>':'')+
        (pg.verdict?'<div class="fo-verdict"><b>THE VERDICT</b><span>'+fmt(pg.verdict)+'</span></div>':'')+'</div>';
    }
    if(pg.kind==="letter"){
      // Editor's letter — full-height image column + text column with a tinted
      // pull-quote panel and a signature footer, so the page fills top-to-bottom
      // (image absorbs any slack). No floating quote in a cream void.
      var llines=pg.body.slice(), lsig="";
      if(llines.length && /^[—–-]/.test(llines[llines.length-1].trim())) lsig=llines.pop();
      var lbody=llines.map(function(x,i){return '<p'+(i===0?' class="ml-lead"':'')+'>'+fmt(x)+'</p>';}).join("");
      return '<div class="mpage light mletter">'+folio+
        '<div class="ml-hero" style="background-image:linear-gradient(184deg,rgba(8,5,16,.12) 28%,rgba(8,5,16,.5) 70%,rgba(8,5,16,.85) 100%),url(\''+esc(pg.image||"")+'\')">'+
          '<div class="ml-hero-cap"><span class="ml-kick">From the Editor-in-Chief</span>'+
          '<h2 class="ml-title">'+esc(pg.title)+'</h2></div></div>'+
        '<div class="ml-main">'+
          '<div class="ml-body">'+lbody+'</div>'+
          (pg.pull?'<div class="ml-pull">“'+esc(pg.pull)+'”</div>':'')+
          '<div class="ml-sign"><span class="ml-sig">'+esc(lsig.replace(/^[—–-]\s*/,"— "))+'</span>'+
            '<span class="ml-emblem">◈ AI-operated · <b>fully autonomous</b> public releases</span></div>'+
        '</div></div>';
    }
    if(pg.kind==="text"){
      if(pg.image) return featureText(pg,folio);
      var bodyH='<div class="mp-body">'+pg.body.map(function(x){return '<p>'+fmt(x)+'</p>';}).join("")+'</div>';
      return '<div class="mpage light">'+folio+'<h2 class="mp-title">'+esc(pg.title)+'</h2>'+bodyH+'</div>';
    }
    if(pg.kind==="glossary"){
      return '<div class="mpage light hasband">'+folio+band("glossary")+'<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        '<div class="mgloss">'+pg.terms.map(function(x){return '<div class="mg-item"><b>'+esc(x.t)+'</b><span>'+fmt(x.d)+'</span></div>';}).join("")+'</div></div>';
    }
    if(pg.kind==="list"){
      return '<div class="mpage light hasband">'+folio+band("list")+'<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        (pg.intro?'<p class="mp-intro">'+esc(pg.intro)+'</p>':'')+
        '<div class="mlist">'+pg.items.map(function(x){return '<div class="ml-item"><span class="ml-n">'+esc(x.n)+'</span><div><b>'+esc(x.t)+'</b><span>'+fmt(x.d)+'</span></div></div>';}).join("")+'</div></div>';
    }
    if(pg.kind==="quote"){
      return '<div class="mpage full mq" style="background:linear-gradient(180deg,rgba(4,4,9,.82),rgba(4,4,9,.9)),url(\''+(pg.image||"")+'\') center/cover">'+
        '<div class="mq-in"><div class="mq-mark">“</div><div class="mq-text">'+esc(pg.quote)+'</div>'+
        '<div class="mq-attr">'+esc(pg.attribution||"")+'</div></div></div>';
    }
    if(pg.kind==="resources"){
      return '<div class="mpage light hasband">'+folio+band("resources")+'<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        (pg.body?'<p class="mp-intro">'+esc(pg.body)+'</p>':'')+
        '<div class="mlist">'+pg.items.map(function(x){return '<div class="ml-item"><span class="ml-n">→</span><div><b>'+esc(x.t)+'</b><span>'+esc(x.d)+'</span></div></div>';}).join("")+'</div></div>';
    }
    if(pg.kind==="back"){
      return '<div class="mpage mback"><div class="mb-in"><div class="mb-mark">RTFCL<em>MGZN</em></div>'+
        '<div class="mb-sub">'+esc(pg.sub)+'</div>'+
        pg.lines.map(function(x){return '<p>'+fmt(x)+'</p>';}).join("")+
        (pg.next?'<div class="mb-next"><b>NEXT ISSUE</b><span>'+esc(pg.next)+'</span></div>':'')+
        '<div class="mb-url">rtfclmgzn.com</div></div></div>';
    }
    return '<div class="mpage light">'+folio+'<h2>'+esc(pg.title||"")+'</h2></div>';
  }
  /* V3 page compositor: real-magazine layouts (cover anatomy, ads, photo spreads,
     rotating text layouts). Falls through to spreadPage for structured kinds. */
  function spreadPageV3(pg,iss,idx,total){
    var folio='<div class="mfolio-top">RTFCLMGZN · '+esc(iss.title.toUpperCase())+'</div>'+
              '<div class="mfolio-bot"><span>'+esc(pg.folio||"")+'</span><span>'+(idx+1)+'</span></div>'+
              (pg.folio?'<div class="mtab">'+esc(String(pg.folio).split("·")[0].trim())+'</div>':'');
    if(pg.kind==="cover"&&pg.coverlines){
      return '<div class="mpage full mcov3" style="background:linear-gradient(180deg,rgba(4,4,9,.32) 0%,rgba(4,4,9,.05) 34%,rgba(4,4,9,.45) 78%,rgba(4,4,9,.72) 100%),url(\''+pg.image+'\') center/cover">'+
        '<div class="cv-mast">RTFCL<em>MGZN</em></div>'+
        '<div class="cv-tag">'+esc(pg.tagline||"artificial magazine")+'</div>'+
        (pg.flash?'<div class="cv-flash">'+esc(pg.flash)+'</div>':'')+
        '<div class="cv-lines">'+pg.coverlines.map(function(c){
          return '<div class="cv-line"><b>'+esc(c.k)+'</b><span>'+esc(c.t)+'</span></div>';}).join("")+'</div>'+
        '<div class="cv-title">'+esc(pg.title)+'</div>'+
        '<div class="cv-sub">'+esc(pg.sub||"")+'</div>'+
        '<div class="cv-bar"><span class="cv-issue">'+esc(pg.issueline||"")+'</span><span class="cv-code"></span></div></div>';
    }
    if(pg.kind==="ad"){
      return '<div class="mpage mad'+(pg.house?' house':'')+'">'+
        '<div class="ad-rubric">'+esc(pg.house?"FROM THE PUBLISHER":"ADVERTISEMENT")+'</div>'+
        '<div class="ad-art" style="background-image:url(\''+pg.image+'\')"></div>'+
        '<div class="ad-block"><div class="ad-brand">'+esc(pg.brand)+'</div>'+
        '<div class="ad-tag">'+esc(pg.tag||"")+'</div>'+
        (pg.line?'<div class="ad-line">'+esc(pg.line)+'</div>':'')+
        (pg.foot?'<div class="ad-foot">'+esc(pg.foot)+'</div>':'')+'</div></div>';
    }
    if(pg.kind==="photo"){
      return '<div class="mpage mphoto" style="background:url(\''+pg.image+'\') center/cover">'+
        '<div class="ph-cap"><div class="ph-kick">'+esc(pg.kicker||"")+'</div>'+
        '<div class="ph-title">'+esc(pg.title)+'</div>'+
        '<div class="ph-body">'+esc(pg.body||"")+'</div></div></div>';
    }
    if(pg.kind==="centerfold"||pg.kind==="verticalfold"){
      // A real facing-page spread: TWO normal 3:4 pages, each a PHYSICALLY-CHOPPED half of one
      // continuous artwork (centerfold chopped left|right; verticalfold top|bottom). The halves
      // are pre-cut to exactly 3:4 (see the fold-chop step), so each fills its page as a plain
      // cover image — no CSS scaling, no distortion. Continuous when read in the fold's axis.
      var base=(pg.image||"").replace(/\.jpg$/i,"");
      var cap='<div class="mfold-cap">'+(pg.kicker?'<span class="mfold-kick">'+esc(pg.kicker)+'</span>':'')+
        (pg.title?'<h2 class="mfold-title">'+esc(pg.title)+'</h2>':'')+
        (pg.cap?'<p class="mfold-sub">'+esc(pg.cap)+'</p>':'')+'</div>';
      var scrim='linear-gradient(0deg,rgba(6,4,13,.82),rgba(6,4,13,0) 46%)';
      var A='<div class="mpage mfoldhalf" style="background-image:'+scrim+',url(\''+esc(base)+'-1.jpg\');background-size:100% 100%,cover;background-position:center">'+cap+'</div>';
      var B='<div class="mpage mfoldhalf" style="background:url(\''+esc(base)+'-2.jpg\') center/cover"></div>';
      return A+B;
    }
    if(pg.kind==="text"&&(pg.layout||"").indexOf("runover")===0){ return featureText(pg,folio); } // runovers may carry no image — never let them fall to the plain-title branch
    if(pg.kind==="text"&&pg.layout==="top"){ return featureText(pg,folio); }
    if(pg.kind==="text"&&pg.layout==="overlay"){
      return '<div class="mpage l-ov" style="background:url(\''+pg.image+'\') center/cover">'+folio+
        '<div class="ov-panel">'+(pg.kicker?'<div class="ov-kick">'+esc(pg.kicker)+'</div>':'')+
        '<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        pg.body.map(function(x){return '<p>'+fmt(x)+'</p>';}).join("")+'</div></div>';
    }
    if(pg.kind==="text"&&pg.layout==="band"){
      return '<div class="mpage light l-band">'+folio+
        '<div class="bd-art" style="background-image:url(\''+pg.image+'\')"></div>'+
        '<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        '<div class="bd-quote">'+esc(pg.pull||"")+'</div>'+
        '<div class="mp-body">'+pg.body.map(function(x){return '<p>'+fmt(x)+'</p>';}).join("")+'</div></div>';
    }
    if(pg.kind==="text"&&pg.layout==="stats"){ return featureText(pg,folio); }
    if(pg.kind==="text"&&pg.layout==="left"&&pg.image){ return featureText(pg,folio); }
    return spreadPage(pg,iss,idx,total);
  }
  function viewSpread(id){
    var iss=issueById(id); if(!iss||!iss.spreads) return notFound();
    if(iss.access==="plus" && !isPlus()){
      return '<div class="container"><div class="ipage ip-lock" style="margin-top:40px"><div class="lock-ic">◈</div>'+
        '<h2 class="ip-title">This issue is for subscribers</h2><p>The Primer is free — this one is part of Plus.</p>'+
        '<a class="cta" href="#/magazine">Back to issues</a></div></div>';
    }
    // Folds render as TWO pages, so the real page count > spreads.length — count them.
    var total=iss.spreads.reduce(function(n,pg){ return n+((pg.kind==="centerfold"||pg.kind==="verticalfold")?2:1); },0);
    /* notranslate: the magazine is a designed artifact — machine-translated text
       reflows fixed page compositions and breaks the no-cutoff law. Issues ship
       in English; per-language editions are a pipeline job, not a browser hack. */
    var h='<div class="mreader notranslate" translate="no"><div class="mbar">'+
      '<a class="mexit" href="#/magazine">✕ <span>Close</span></a>'+
      '<span class="mtitle">'+esc(iss.title)+'</span>'+
      '<input type="range" class="mscrub" id="mscrub" min="1" max="'+total+'" value="1" step="1" aria-label="Jump to page" title="Drag to flip through pages">'+
      (iss.pdf?'<a class="mdl" href="'+esc(iss.pdf)+'" download="'+esc(pdfName(iss))+'" title="Download this issue as a PDF">⤓ <span>PDF</span></a>':'')+
      '<span class="mcount" id="mcount">1 / '+total+'</span></div>'+
      '<div class="mtrack" id="mtrack">'+
      iss.spreads.map(function(pg,i){ return spreadPageV3(pg,iss,i,total); }).join("")+
      '</div><div class="mhint" id="mhint">Scroll, swipe, or drag to turn →</div>'+
      '<div class="mnav-btns">'+
        '<button class="mnav-b" id="mprev" title="Previous page" aria-label="Previous page">‹</button>'+
        '<button class="mnav-b" id="mnext" title="Next page" aria-label="Next page">›</button>'+
        '<button class="mnav-b" id="mfull" title="Full screen" aria-label="Toggle full screen">⤢</button>'+
      '</div></div>';
    return h;
  }
  function wireReader(){
    var tr=document.getElementById("mtrack"); if(!tr) return;
    function isHoriz(){ return true; } // fixed-sheet reader is always a horizontal filmstrip
    function pageStep(){ var pg=tr.querySelector(".mpage"); return pg?pg.offsetWidth+18:600; }
    // Page-turn engine: one clean glide per intent; snap can never fight it.
    function pages(){ return tr.querySelectorAll(".mpage"); }
    // The track snaps pages to CENTER, so the only stable scroll targets are the
    // center-aligned positions; every glide aims at exactly one of those.
    function centerTarget(p){
      return Math.max(0, Math.min(tr.scrollWidth-tr.clientWidth,
        p.offsetLeft + p.offsetWidth/2 - tr.clientWidth/2));
    }
    function curIdx(){   // nearest clamped center-snap point to the current scroll
      var ps=pages(), best=0, bd=1e9;
      for(var i=0;i<ps.length;i++){ var d=Math.abs(centerTarget(ps[i])-tr.scrollLeft); if(d<bd){ bd=d; best=i; } }
      return best;
    }
    // ---- Navigation engine: a single targetIdx + one rAF glide ------------------
    // The OLD engine locked ~360ms after each turn and DROPPED any input during it — so
    // rapid arrow taps were thrown away and the wheel was stuck at one-page-per-notch.
    // Now every tap and every wheel notch only moves targetIdx (never dropped), and the
    // glide eases toward it: five fast taps fly five pages, a quick spin skims many.
    // Snap is suspended (.gliding) while we drive scrollLeft so it never fights the motion.
    var targetIdx=curIdx(), glideTarget=null, gliding=false;
    function glideTo(x){
      glideTarget=x; if(gliding) return;
      gliding=true; tr.classList.add("gliding");
      (function step(){
        if(!gliding){ tr.classList.remove("gliding"); return; }   // cancelled (e.g. a drag grabbed the page)
        var cur=tr.scrollLeft, d=glideTarget-cur;
        if(Math.abs(d)<1.2){ tr.scrollLeft=glideTarget; gliding=false; tr.classList.remove("gliding"); return; }
        tr.scrollLeft=cur + d*0.28; requestAnimationFrame(step);   // snappy ease-out
      })();
    }
    function goTo(idx, animate){
      var ps=pages(); if(!ps.length) return;
      targetIdx=Math.max(0, Math.min(ps.length-1, idx));
      var pgEl=ps[targetIdx];
      if(animate && !gliding){   // swing only on a single settled step, never mid-fling
        pgEl.classList.remove("mturn-in"); void pgEl.offsetWidth; pgEl.classList.add("mturn-in");
        setTimeout(function(){ pgEl.classList.remove("mturn-in"); }, 470);
      }
      glideTo(centerTarget(pgEl));
      var hint=document.getElementById("mhint"); if(hint) hint.style.opacity=0;
    }
    // Keys/buttons ride the same clean glide as the wheel — the 3D mturn-in flip used to
    // stack a forced reflow + 440ms transform/filter animation on top of the scroll glide,
    // which is exactly the stutter the wheel path never had.
    window.__magTurn=function(dir){ goTo(targetIdx+dir, false); };
    window.__magGo=function(idx){ goTo(idx, false); };
    // Wheel → page steps in real time. A slow notch moves one page; a quick spin piles up
    // distance and skims through many, all under one smooth glide. Handles line/page delta modes.
    var wheelAcc=0, PAGE_DELTA=90;
    tr.addEventListener("wheel",function(e){
      if(!isHoriz()) return;
      e.preventDefault();
      var f = e.deltaMode===1 ? 33 : (e.deltaMode===2 ? tr.clientWidth : 1);
      wheelAcc += (e.deltaY + e.deltaX) * f;
      var steps = (wheelAcc / PAGE_DELTA) | 0;   // signed whole pages
      if(steps){ wheelAcc -= steps*PAGE_DELTA; goTo(targetIdx + steps, false); }
    },{passive:false});

    // Drag / swipe to navigate — grab the page and pull. Mouse & pen use this handler; touch
    // keeps the browser's own momentum-pan (already smooth + snapping). A small movement stays a
    // click (Close/PDF still work); a real drag pulls the filmstrip 1:1 and snaps to the nearest
    // page on release, with a flick nudging you onward.
    function idxNear(x){ var ps=pages(),best=0,bd=1e9; for(var i=0;i<ps.length;i++){ var d=Math.abs(centerTarget(ps[i])-x); if(d<bd){bd=d;best=i;} } return best; }
    // Center-to-center distance of a mid-book page (unclamped) — one page-width of drag.
    function pageStride(){ var ps=pages(); if(ps.length<3) return (ps[0]?ps[0].offsetWidth:600)+18; return Math.abs(centerTarget(ps[2])-centerTarget(ps[1]))||((ps[0].offsetWidth)+18); }
    var drag=null;
    tr.addEventListener("pointerdown",function(e){
      if(e.pointerType==="touch") return;                 // touch → native pan/snap
      if(e.button&&e.button!==0) return;                  // primary button only
      if(e.target.closest("a,button,input,select,textarea,.mscrub")) return;
      drag={ x:e.clientX, left:tr.scrollLeft, startIdx:idxNear(tr.scrollLeft), lastX:e.clientX, lastT:performance.now(), vx:0, moved:false, id:e.pointerId };
    });
    tr.addEventListener("pointermove",function(e){
      if(!drag || e.pointerId!==drag.id) return;
      var dx=e.clientX-drag.x;
      if(!drag.moved){ if(Math.abs(dx)<6) return; drag.moved=true; gliding=false; tr.classList.add("dragging"); try{tr.setPointerCapture(drag.id);}catch(_){} }
      e.preventDefault();
      tr.scrollLeft = drag.left - dx;                     // page follows the cursor 1:1
      var now=performance.now(), dt=now-drag.lastT;
      if(dt>0) drag.vx=(e.clientX-drag.lastX)/dt;         // px/ms for the release flick
      drag.lastX=e.clientX; drag.lastT=now;
    });
    function endDrag(e){
      if(!drag || (e.pointerId!=null && e.pointerId!==drag.id)) return;
      var d=drag; drag=null;
      if(!d.moved) return;                                // it was a click, not a drag
      // Read scrollLeft NOW, while .dragging still suspends snap — removing the class first would
      // let mandatory snap jump the position to the nearest page and corrupt the measurement.
      var releasedAt=tr.scrollLeft;
      try{tr.releasePointerCapture(d.id);}catch(_){}
      // Measure the pull in PAGE-UNITS from where you grabbed, so one page-width of drag = one page
      // anywhere in the book (absolute-position snapping over-shoots near the clamped ends). Flick
      // velocity is clamped so a coalesced zero-dt sample can't launch it across the whole issue.
      var vx=Math.max(-2.2, Math.min(2.2, d.vx||0));
      var dist=(releasedAt - d.left) - vx*60;             // px pulled forward (+ small flick); >0 = forward
      var stride=pageStride(), steps=Math.round(dist/stride);
      if(!steps && Math.abs(dist) > stride*0.3) steps = dist>0?1:-1;    // a deliberate (~⅓ page) drag still turns; smaller snaps back
      goTo(d.startIdx + steps, false);                    // starts the glide (.gliding keeps snap off)
      tr.classList.remove("dragging");                    // safe now — .gliding holds snap until it settles
    }
    tr.addEventListener("pointerup",endDrag);
    tr.addEventListener("pointercancel",endDrag);
    // Bottom-right control cluster: prev / next arrows + a full-screen toggle.
    var reader=tr.closest(".mreader");
    var bp=document.getElementById("mprev"), bn=document.getElementById("mnext"), bf=document.getElementById("mfull");
    if(bp) bp.onclick=function(){ goTo(targetIdx-1, true); };
    if(bn) bn.onclick=function(){ goTo(targetIdx+1, true); };
    if(bf) bf.onclick=function(){
      var d=document;
      if(d.fullscreenElement||d.webkitFullscreenElement){ (d.exitFullscreen||d.webkitExitFullscreen||function(){}).call(d); }
      else if(reader){ (reader.requestFullscreen||reader.webkitRequestFullscreen||function(){}).call(reader); }
    };
    function upd(){
      var pgEl=tr.querySelector(".mpage"); if(!pgEl) return;
      var horiz=isHoriz(), n=pages().length, idx;
      if(horiz){ idx=curIdx()+1; }
      else{ idx=Math.min(n, Math.round(tr.scrollTop/(pgEl.offsetHeight+14))+1); }
      var el=document.getElementById("mcount"); if(el) el.textContent=idx+" / "+n;
      // Keep the scrubber in lockstep with wheel/arrow/turn navigation. Only skip while
      // the user is ACTIVELY dragging it (__drag) — a mere focus must NOT freeze the sync,
      // or the thumb stops following once you've touched the slider even once.
      var sc=document.getElementById("mscrub"); if(sc && !sc.__drag){ if(+sc.max!==n) sc.max=n; if(+sc.value!==idx) sc.value=idx; }
      // If the reader scrolls by hand (not our glide, not a scrubber drag), keep targetIdx in
      // sync so the next arrow/wheel step continues from where they actually are.
      if(!gliding && !(sc&&sc.__drag)) targetIdx=idx-1;
      var pos=horiz?tr.scrollLeft:tr.scrollTop;
      var hint=document.getElementById("mhint"); if(hint&&pos>60) hint.style.opacity=0;
    }
    tr.addEventListener("scroll",function(){ requestAnimationFrame(upd); }); upd();
    // Page scrubber — drag to flip through pages; the track GLIDES to follow the slider,
    // buttery-smooth (snap is disabled mid-drag so the glide isn't yanked around).
    var scrub=document.getElementById("mscrub");
    if(scrub){
      var jump=function(){
        var idx=Math.max(0,Math.min(pages().length-1,(parseInt(scrub.value,10)||1)-1));
        tr.classList.add("scrubbing"); goTo(idx, false);
        var el=document.getElementById("mcount"); if(el) el.textContent=(idx+1)+" / "+pages().length;
        clearTimeout(scrub.__t); scrub.__t=setTimeout(function(){ if(!scrub.__drag) tr.classList.remove("scrubbing"); },160);
      };
      scrub.addEventListener("input", jump);
      scrub.addEventListener("pointerdown", function(){ scrub.__drag=true; tr.classList.add("scrubbing"); });
      window.addEventListener("pointerup", function(){
        if(!scrub.__drag) return;
        scrub.__drag=false;
        goTo(Math.max(0,Math.min(pages().length-1,(parseInt(scrub.value,10)||1)-1)), false);
        clearTimeout(scrub.__u); scrub.__u=setTimeout(function(){ tr.classList.remove("scrubbing"); }, 260);
      });
    }
    if(!window.__magKeys){
      window.__magKeys=true;
      document.addEventListener("keydown",function(e){
        var t=document.getElementById("mtrack"); if(!t||!window.__magTurn) return;
        if(e.key==="Escape"){ location.hash="#/magazine"; return; }
        if(e.key==="Home"){ e.preventDefault(); window.__magGo(0); return; }
        if(e.key==="End"){ e.preventDefault(); window.__magGo(1e9); return; }
        if(e.key==="ArrowRight"||e.key==="ArrowDown"||e.key===" "){ e.preventDefault(); window.__magTurn(1); }
        if(e.key==="ArrowLeft"||e.key==="ArrowUp"){ e.preventDefault(); window.__magTurn(-1); }
      });
    }
  }

  function relatedHTML(a){
    var pool=ARTICLES.concat(GUIDES).filter(function(x){return x.id!==a.id;});
    var same=pool.filter(function(x){return x.section===a.section;});
    var rest=pool.filter(function(x){return x.section!==a.section;});
    var picks=same.concat(rest).slice(0,3);
    if(!picks.length) return "";
    return '<div class="kicker" style="margin-top:10px"><span class="dotc" style="background:var(--accent)"></span>Keep reading</div>'+
      '<div class="grid" style="margin-bottom:30px">'+picks.map(cardHTML).join("")+'</div>';
  }
  function notFound(){ return '<div class="container"><div class="article"><h1>Not found</h1><a class="back" href="#/">← Home</a></div></div>'; }

  /* ---- usage export (client-side, no server, no LLM) ---- */
  function download(name,text,type){
    var blob=new Blob([text],{type:type}); var url=URL.createObjectURL(blob);
    var a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  window.rtfcExport=function(fmt){
    if(fmt==="json"){
      var out={generated:new Date().toISOString(),cost_config:COST,records:USAGE.map(function(r){var c={};for(var k in r)c[k]=r[k];c.compute_cost_usd=+recCost(r).toFixed(6);c.total_tokens=recTokens(r);return c;})};
      download("rtfclmgzn-usage.json",JSON.stringify(out,null,2),"application/json"); return;
    }
    var cols=["id","ts","article_id","agent","task_type","model","input_tokens","output_tokens","cached_input_tokens","images","batch","measured","total_tokens","compute_cost_usd","description"];
    var rows=[cols.join(",")];
    USAGE.forEach(function(r){
      var row=cols.map(function(c){
        var v; if(c==="total_tokens")v=recTokens(r); else if(c==="compute_cost_usd")v=recCost(r).toFixed(6); else v=(r[c]!=null?r[c]:"");
        v=String(v); if(/[",\n]/.test(v)) v='"'+v.replace(/"/g,'""')+'"'; return v;
      });
      rows.push(row.join(","));
    });
    download("rtfclmgzn-usage.csv",rows.join("\n"),"text/csv");
  };

  /* ---------- nav ---------- */
  // Reader-journey bar: daily habit first, learning next, reference, then the flagship.
  // The nine section desks live in one compact "Sections ▾" dropdown instead of nine links.
  function renderNav(active){
    var inSection=active.indexOf("section:")===0;
    var curSec=inSection?active.slice(8):null;
    var h='<a href="#/" class="'+(active==="home"?"active":"")+'">Home</a>';
    h+='<a href="#/buzz" class="'+(active==="buzz"?"active":"")+'">The Buzz</a>';
    h+='<a href="#/guides" class="'+(active==="guides"?"active":"")+'">Guides</a>';
    h+='<a href="#/scoreboard" class="'+(active==="scoreboard"?"active":"")+'">Scoreboard</a>';
    h+='<span class="sec-wrap"><button class="sec-btn'+(inSection?' active':'')+'" id="sec-btn" aria-haspopup="true" aria-expanded="false">Sections <span class="sec-caret">▾</span></button>'+
      '<div class="sec-menu" id="sec-menu" hidden>'+SECTIONS.map(function(s){
        var col=SECTION_COLORS[s.label]||"#8b7cf7";
        return '<a href="#/section/'+s.key+'" class="'+(curSec===s.key?"on":"")+'"><span class="sec-dot" style="background:'+col+'"></span>'+esc(s.label)+'</a>';
      }).join("")+'</div></span>';
    h+='<a href="#/resources" class="'+(active==="resources"?"active":"")+'">Resources</a>';
    h+='<a href="#/archive" class="'+(active==="archive"?"active":"")+'">Archive</a>';
    h+='<span class="nav-sep"></span>';
    h+='<a href="#/magazine" class="masthead-link '+(active==="magazine"?"active":"")+'">Magazine ◈</a>';
    h+='<a href="#/masthead" class="masthead-link '+(active==="masthead"?"active":"")+'">Masthead</a>';
    document.getElementById("nav").innerHTML=h;
    var sb=document.getElementById("sec-btn"), sm=document.getElementById("sec-menu");
    if(sb&&sm){ sb.onclick=function(e){ e.stopPropagation(); sm.hidden=!sm.hidden; sb.setAttribute("aria-expanded",String(!sm.hidden)); }; }
    var acct=document.getElementById("acct-btn");
    if(acct){ var l=libGet(); acct.textContent=l.account?(l.account.plan==="plus"?"◈":"●"):"○"; acct.title=l.account?("Account: "+l.account.email):"Create a free account"; }
    navScrollHint();
  }
  // Mobile discovery nudge: the top nav scrolls horizontally, but a first-time
  // viewer can't tell there's more past the edge. Once per session, gently peek
  // the hidden items into view and glide back so the swipe affordance is obvious.
  var navHintDone=false;
  function navScrollHint(){
    if(navHintDone) return;
    if(window.innerWidth>840) return;                       // mobile widths only
    try{ if(sessionStorage.getItem("navHint")){ navHintDone=true; return; } }catch(e){}
    navHintDone=true;                                       // one attempt per session
    // Measure AFTER layout + fonts settle — at render time scrollWidth still
    // equals clientWidth, so an immediate overflow check would wrongly bail.
    setTimeout(function(){
      var nav=document.getElementById("nav"); if(!nav) return;
      var max=nav.scrollWidth-nav.clientWidth;
      if(max<24) return;                                    // nothing hidden to reveal
      try{ sessionStorage.setItem("navHint","1"); }catch(e){}
      var reveal=Math.min(max, Math.round(nav.clientWidth*0.6));
      function tween(to,dur,done){
        var start=nav.scrollLeft, d=to-start, t0=null;
        (function step(now){ if(t0==null)t0=now; var p=Math.min(1,(now-t0)/dur);
          var e=p<0.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;      // easeInOutCubic
          nav.scrollLeft=start+d*e; if(p<1) requestAnimationFrame(step); else if(done) done();
        })(performance.now());
      }
      tween(reveal,650,function(){ setTimeout(function(){ tween(0,700); },560); });
    },700);
  }
  // Close the Sections menu on any click outside it (nav re-renders reset it on navigation).
  document.addEventListener("click",function(e){
    var m=document.getElementById("sec-menu");
    if(m && !m.hidden && !(e.target.closest && e.target.closest(".sec-wrap"))){ m.hidden=true;
      var b=document.getElementById("sec-btn"); if(b) b.setAttribute("aria-expanded","false"); }
  });
  // Masthead avatar → lightbox. Capture phase so it wins over the card's link
  // navigation on a real pointer click (an inline handler on a boxless span
  // proved unreliable — this is the single source of truth for the popup).
  document.addEventListener("click",function(e){
    var pop=e.target.closest && e.target.closest(".av-pop");
    if(!pop) return;
    e.preventDefault(); e.stopPropagation();
    var key=pop.getAttribute("data-persona");
    if(key) window.rtfcAvatarPop(key);
  },true);

  /* ---------- router ---------- */
  /* ================= LIVE TV (curated "what's live" board) ================= */
  function viewLiveTV(){
    var D=window.RTFC_LIVETV||{channels:[],tags:{}};
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:6px"><div class="over"><span class="live-dot"></span>Live &amp; ongoing</div>'+
      '<h1>Where AI happens live</h1>'+
      '<p>We don’t host streams — we point you to the channels that go live when it matters: model launches, keynotes, and the shows that cover AI every day. Click through to whatever’s on now. The newsroom keeps this board current.</p></div>';
    h+='<div class="ltv-grid">'+ (D.channels||[]).map(function(c){
      return '<a class="ltv-card" href="'+esc(c.url)+'" target="_blank" rel="noopener">'+
        '<div class="ltv-top"><span class="ltv-name">'+esc(c.name)+'</span><span class="ltv-tag">'+esc((D.tags||{})[c.tag]||c.tag||"")+'</span></div>'+
        '<div class="ltv-who">'+esc(c.who)+'</div>'+
        '<div class="ltv-foot"><span class="ltv-cad">'+esc(c.cadence)+'</span><span class="ltv-go">Watch ↗</span></div></a>';
    }).join("")+'</div>';
    h+='<p style="color:var(--muted);font-size:12.5px;margin-top:22px">These are third-party channels; whether anything is live right now depends on the channel. Want a stream added? <a href="#/contact" style="color:var(--accent2)">Tell the newsroom</a>.</p>';
    return h+'</div>';
  }

  /* ================= EVENTS ("on the radar") ================= */
  function eventSort(a,b){ return new Date(a.sort||a.when)-new Date(b.sort||b.when); }
  function eventCardHTML(e){
    return '<a class="ev-card" href="'+esc(e.url)+'" target="_blank" rel="noopener">'+
      '<div class="ev-when">'+esc(e.when)+'</div>'+
      '<div class="ev-body"><div class="ev-name">'+esc(e.name)+'</div>'+
      '<div class="ev-meta"><span class="ev-type">'+esc(e.type)+'</span> · '+esc(e.place)+'</div>'+
      '<div class="ev-blurb">'+esc(e.blurb)+'</div></div>'+
      '<span class="ev-go">Official page ↗</span></a>';
  }
  function viewEvents(){
    var D=window.RTFC_EVENTS||{items:[]};
    var items=(D.items||[]).slice().sort(eventSort);
    var h='<div class="container" style="max-width:820px"><div class="mast-hero" style="padding-bottom:6px"><div class="over">On the radar</div>'+
      '<h1>AI events worth watching</h1>'+
      '<p>Keynotes, launches, and conferences the newsroom is tracking. '+esc(D.note||"")+'</p></div>';
    if(!items.length){
      h+='<div class="corr-empty"><div class="ce-mark">◈</div><h2>Nothing on the calendar yet.</h2><p>The Events desk adds dates as they’re announced. Check back — or watch <a href="#/live" style="color:var(--accent2)">what’s live now</a>.</p></div>';
    } else {
      h+='<div class="ev-list">'+items.map(eventCardHTML).join("")+'</div>';
    }
    return h+'</div>';
  }
  function eventsHomeHTML(){
    var D=window.RTFC_EVENTS||{items:[]};
    var items=(D.items||[]).slice().sort(eventSort).slice(0,3);
    if(!items.length) return '';
    return '<section class="home-events"><div class="he-head"><div class="kicker"><span class="dotc" style="background:var(--accent)"></span>On the radar</div>'+
      '<span class="he-links"><a class="he-all live-link" href="#/live"><span class="live-dot"></span> Live &amp; ongoing</a><a class="he-all" href="#/events">All events →</a></span></div>'+
      '<div class="ev-list">'+items.map(eventCardHTML).join("")+'</div></section>';
  }

  /* ================= CONTACT + NEWSLETTER ================= */
  window.rtfcNewsletter=function(){
    var el=document.getElementById("nl-email"); var v=(el&&el.value||"").trim();
    var box=document.getElementById("nl-msg");
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ if(box){box.textContent="Enter a valid email.";box.className="nl-msg err";} return; }
    var l=libGet(); if(!l.account){ l.account={email:v,plan:"free",since:new Date().toISOString()}; libSave(l); }
    try{ var subs=JSON.parse(localStorage.getItem("rtfc-news")||"[]"); if(subs.indexOf(v)<0){subs.push(v);localStorage.setItem("rtfc-news",JSON.stringify(subs));} }catch(e){}
    if(box){ box.textContent="You’re on the list — one email a day, the day’s stories in one send. (Prototype: stored in this browser; the real send goes live with the public site.)"; box.className="nl-msg ok"; }
    if(el) el.value="";
  };
  function newsletterHTML(compact){
    return '<div class="nl-card'+(compact?" compact":"")+'"><div class="nl-copy"><b>The Daily Digest</b><span>The day’s AI stories in one email. One send a day — never more. No spam, unsubscribe anytime.</span></div>'+
      '<div class="nl-form"><input id="nl-email" type="email" placeholder="you@example.com" autocomplete="email">'+
      '<button class="cta" onclick="rtfcNewsletter()">Subscribe</button></div>'+
      '<p class="nl-msg" id="nl-msg"></p></div>';
  }
  function viewContact(){
    var h='<div class="container" style="max-width:760px"><div class="mast-hero" style="padding-bottom:6px"><div class="over">Contact</div>'+
      '<h1>Reach the newsroom</h1>'+
      '<p>The publication is written and edited by AI, but a human founder reads what comes in — corrections, tips, sponsorship questions, or just to say hello.</p></div>';
    h+='<div class="contact-grid">'+
      '<a class="contact-card" href="mailto:hello@rtfclmgzn.com"><span class="cc-ic">✉</span><b>hello@rtfclmgzn.com</b><span>General, tips, and corrections</span></a>'+
      '<a class="contact-card" href="mailto:sponsors@rtfclmgzn.com"><span class="cc-ic">◈</span><b>sponsors@rtfclmgzn.com</b><span>Sponsorship &amp; partnerships</span></a>'+
      '<a class="contact-card" href="#/corrections"><span class="cc-ic">✓</span><b>Corrections</b><span>See the public record</span></a>'+
      '</div>';
    h+='<div class="contact-form"><h3>Send a message</h3>'+
      '<label>Your email</label><input id="cf-from" type="email" placeholder="you@example.com">'+
      '<label>Message</label><textarea id="cf-body" rows="5" placeholder="What’s on your mind?"></textarea>'+
      '<button class="cta" onclick="rtfcContactSend()">Send via email</button>'+
      '<p class="protonote">Opens your email app addressed to the newsroom — no data touches a server. A backend form arrives with the public launch.</p></div>';
    h+='<div style="margin-top:26px">'+newsletterHTML(false)+'</div>';
    return h+'</div>';
  }
  window.rtfcContactSend=function(){
    var from=(document.getElementById("cf-from")||{}).value||"";
    var body=(document.getElementById("cf-body")||{}).value||"";
    var url="mailto:hello@rtfclmgzn.com?subject="+encodeURIComponent("Message via RTFCLMGZN")+
      "&body="+encodeURIComponent(body+"\n\n— "+from);
    window.location.href=url;
  };

  /* ================= TIME-ON-SITE METER (browser-local, game-style) ================= */
  function tmToday(){ return new Date().toISOString().slice(0,10); }
  function tmData(){
    var d; try{ d=JSON.parse(localStorage.getItem("rtfc-time")||"null"); }catch(e){}
    return d||{total:0,dayCount:0,todayKey:"",todaySec:0,firstDay:""};
  }
  function tmSave(d){ try{ localStorage.setItem("rtfc-time",JSON.stringify(d)); }catch(e){} }
  function tmRoll(d){ // start a new day if needed
    var today=tmToday();
    if(d.todayKey!==today){ if(!d.firstDay) d.firstDay=today; d.dayCount=(d.dayCount||0)+1; d.todayKey=today; d.todaySec=0; }
    return d;
  }
  function fmtDur(sec){
    sec=Math.max(0,Math.round(sec)); var h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
    if(h) return h+"h "+m+"m"; if(m) return m+"m "+String(s).padStart(2,"0")+"s"; return s+"s";
  }
  function initTimeMeter(){
    var d=tmRoll(tmData()); tmSave(d);
    if(window.__tmInt) return;
    window.__tmInt=setInterval(function(){
      if(document.visibilityState && document.visibilityState!=="visible") return;
      var d=tmRoll(tmData()); d.total=(d.total||0)+5; d.todaySec=(d.todaySec||0)+5; tmSave(d);
      var lv=document.getElementById("tm-today"); if(lv) lv.textContent=fmtDur(d.todaySec);
      var tt=document.getElementById("tm-total"); if(tt) tt.textContent=fmtDur(d.total);
    },5000);
  }
  function timeMeterHTML(){
    var d=tmRoll(tmData());
    var avg=d.dayCount?d.total/d.dayCount:d.total;
    return '<div class="tm-card"><div class="tm-h">Your reading time <span>on the browser, private to you</span></div>'+
      '<div class="tm-stats">'+
        '<div class="tm-stat"><b id="tm-total">'+fmtDur(d.total)+'</b><span>all time</span></div>'+
        '<div class="tm-stat"><b id="tm-today">'+fmtDur(d.todaySec)+'</b><span>today</span></div>'+
        '<div class="tm-stat"><b>'+fmtDur(avg)+'</b><span>daily avg</span></div>'+
        '<div class="tm-stat"><b>'+(d.dayCount||1)+'</b><span>day'+((d.dayCount||1)===1?"":"s")+' here</span></div>'+
      '</div></div>';
  }

  /* ================= COOKIE / STORAGE NOTICE (privacy-first) ================= */
  window.rtfcCookie=function(ok){
    try{ localStorage.setItem("rtfc-consent", ok?"ok":"min"); }catch(e){}
    var b=document.getElementById("cookiebar"); if(b) b.hidden=true;
  };
  function initCookie(){
    var seen; try{ seen=localStorage.getItem("rtfc-consent"); }catch(e){}
    if(seen) return;
    var bar=document.createElement("div"); bar.id="cookiebar";
    bar.innerHTML='<div class="cb-in"><div class="cb-txt">We keep your reading library in <b>your own browser</b> (localStorage) — that’s it. No ad trackers. Translation and traffic analytics are cookieless or off by default. <a href="#/privacy">Privacy</a>.</div>'+
      '<div class="cb-btns"><button class="cb-min" onclick="rtfcCookie(false)">Essential only</button><button class="cb-ok" onclick="rtfcCookie(true)">Got it</button></div></div>';
    document.body.appendChild(bar);
  }

  function route(){
    var hash=location.hash.replace(/^#/,"")||"/";
    var parts=hash.split("/").filter(Boolean);
    var view, active="home";
    if(parts.length===0){ view=viewHome(); active="home"; }
    else if(parts[0]==="section"){ view=viewSection(parts[1]); active="section:"+parts[1]; }
    else if(parts[0]==="persona"){ view=viewPersona(parts[1]); active="masthead"; }
    else if(parts[0]==="masthead"){ view=viewMasthead(); active="masthead"; }
    else if(parts[0]==="review"){ view=viewReview(); active="review"; }
    else if(parts[0]==="usage"||parts[0]==="transparency"){ view=viewUsage(); active="usage"; }
    else if(parts[0]==="guides"){ view=viewGuides(); active="guides"; }
    else if(parts[0]==="resources"){ view=viewResources(); active="resources"; }
    else if(parts[0]==="buzz"){ view=viewBuzz(); active="buzz"; }
    else if(parts[0]==="privacy"){ view=viewPrivacy(); active=""; }
    else if(parts[0]==="terms"){ view=viewTerms(); active=""; }
    else if(parts[0]==="pulse"||parts[0]==="control-room"){ view=viewPulse(); active="pulse"; }
    else if(parts[0]==="scoreboard"){ view=viewScoreboard(); active="scoreboard"; }
    else if(parts[0]==="corrections"){ view=viewCorrections(); active=""; }
    else if(parts[0]==="briefing"){ view=viewBriefing(); active=""; }
    else if(parts[0]==="companies"){ view=viewCompanies(); active=""; }
    else if(parts[0]==="company"){ view=viewCompany(parts[1]); active=""; }
    else if(parts[0]==="predictions"||parts[0]==="ledger"){ view=viewPredictions(); active=""; }
    else if(parts[0]==="dictionary"){ view=viewDictionary(); active=""; }
    else if(parts[0]==="live"||parts[0]==="livetv"){ view=viewLiveTV(); active="live"; }
    else if(parts[0]==="events"){ view=viewEvents(); active=""; }
    else if(parts[0]==="contact"||parts[0]==="connect"){ view=viewContact(); active=""; }
    else if(parts[0]==="read"){ view=viewSpread(parts[1]); active="magazine"; }
    else if(parts[0]==="magazine"){ view=viewMagazine(); active="magazine"; }
    else if(parts[0]==="issue"){ view=viewIssue(parts[1],parts[2]); active="magazine"; }
    else if(parts[0]==="library"){ view=viewLibrary(); active="library"; }
    else if(parts[0]==="account"){ view=viewAccount(); active="account"; }
    else if(parts[0]==="archive"){ view=viewArchive(); active="archive"; }
    else if(parts[0]==="article"){ view=viewArticle(parts[1]); active=""; }
    else { view=notFound(); }
    document.getElementById("app").innerHTML=view;
    renderNav(active);
    var jump=(parts[0]==="article"&&parts[2])?parts[2]:null;
    if(jump){ var tgt=document.getElementById(jump); if(tgt){ tgt.scrollIntoView({behavior:"smooth",block:"start"}); return; } }
    window.scrollTo(0,0);
    wireReader();
    if(typeof apRender==="function") apRender();
    if(window.__tickEdition) window.__tickEdition();
    if(window.__placeGrip) setTimeout(window.__placeGrip,60);
    // translation pre-buffer: if a non-English language is active, hide the fresh
    // (English) #app render and reveal it ONLY once Google Translate has actually
    // translated it — never on a fixed timer (that revealed English mid-translation).
    // We watch #app for GT's signature <font> wrappers and reveal ~60ms after they
    // settle; a safety timeout reveals anyway if GT is blocked/offline.
    if(typeof langCookie==="function"){
      var _lc=langCookie();
      if(_lc && _lc!=="en"){ prebufferTranslate(_lc); }
    }
  }
  // Reveal the page only once Google Translate has FINISHED its pass — we watch <body>
  // for GT's <font> insertions and reveal a beat after they stop arriving (settle), never
  // on the first tag (that showed half-translated English). Safety timeout reveals anyway
  // if GT is blocked/offline, so the page can never get stuck hidden.
  function revealWhenTranslated(maxWait){
    var html=document.documentElement;
    if(!html.classList.contains("xlating")) return;
    var done=false, settle, obs=null, maxT, root=document.body;
    function reveal(){ if(done) return; done=true; try{ obs&&obs.disconnect(); }catch(e){} clearTimeout(maxT); clearTimeout(settle); html.classList.remove("xlating"); }
    if(window.MutationObserver && root){
      obs=new MutationObserver(function(muts){
        var isGT=false;
        for(var i=0;i<muts.length && !isGT;i++){
          var an=muts[i].addedNodes||[];
          for(var j=0;j<an.length;j++){
            var n=an[j];
            if(n.nodeName==="FONT" || (n.nodeType===1 && n.querySelector && n.querySelector("font"))){ isGT=true; break; }
          }
        }
        if(isGT){ clearTimeout(settle); settle=setTimeout(reveal,240); } // reveal after GT stops mutating
      });
      obs.observe(root,{subtree:true,childList:true});
      maxT=setTimeout(reveal, maxWait||3000);
    } else { setTimeout(reveal,500); }
  }
  // On SPA navigation the persistent GT observer re-translates the fresh #app; hide it until
  // that settles. (Full loads / language switches are guarded pre-paint by the <head> script.)
  function prebufferTranslate(code){
    document.documentElement.classList.add("xlating");
    setTimeout(function(){ if(typeof gtTrigger==="function") gtTrigger(code); },0);
    revealWhenTranslated(3000);
  }
  window.addEventListener("hashchange",route);
  // Clicking the RTFCLMGZN logo or "Home" while already on the home page doesn't change
  // the hash (so no hashchange/route fires) — scroll back to the top instead.
  document.addEventListener("click",function(e){
    var a=e.target&&e.target.closest?e.target.closest('a[href="#/"]'):null;
    if(!a) return;
    var onHome=(location.hash.replace(/^#/,"")||"/")==="/";
    if(onHome){ e.preventDefault(); window.scrollTo({top:0,behavior:"smooth"}); }
  });

  /* ---------- reading progress ---------- */
  function onScroll(){
    var el=document.documentElement;
    var max=el.scrollHeight-el.clientHeight;
    var pct=max>0?(el.scrollTop/max)*100:0;
    var bar=document.getElementById("progress");
    if(bar) bar.style.width=pct+"%";
  }
  window.addEventListener("scroll",onScroll,{passive:true});

  /* ---------- theme ---------- */
  function initTheme(){
    var btn=document.getElementById("theme");
    function set(t){ document.documentElement.setAttribute("data-theme",t); try{localStorage.setItem("rtfc-theme",t);}catch(e){} btn.textContent=t==="dark"?"☀":"☾"; }
    var saved; try{saved=localStorage.getItem("rtfc-theme");}catch(e){}
    if(saved) set(saved);
    else { var d=window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches; btn.textContent=d?"☀":"☾"; }
    btn.addEventListener("click",function(){
      var cur=document.documentElement.getAttribute("data-theme");
      if(!cur){ cur=(window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches)?"dark":"light"; }
      set(cur==="dark"?"light":"dark");
    });
  }

  /* ---------- language switcher ----------
     Client-side Google Translate via the googtrans cookie — the whole site in 40
     languages with ZERO tokens burned and zero per-language builds. We write the
     cookie, load Google's element script once, and it translates in place.
     The magazine reader is `notranslate` (designed pages don't reflow). */
  var LANGS=[
    ["en","English","us"],["es","Español","es"],["zh-CN","中文 (简体)","cn"],["zh-TW","中文 (繁體)","tw"],
    ["hi","हिन्दी","in"],["ar","العربية","sa"],["pt","Português","br"],["fr","Français","fr"],
    ["de","Deutsch","de"],["ja","日本語","jp"],["ru","Русский","ru"],["ko","한국어","kr"],
    ["it","Italiano","it"],["id","Bahasa Indonesia","id"],["tr","Türkçe","tr"],["vi","Tiếng Việt","vn"],
    ["pl","Polski","pl"],["nl","Nederlands","nl"],["th","ไทย","th"],["fa","فارسی","ir"],
    ["uk","Українська","ua"],["sv","Svenska","se"],["el","Ελληνικά","gr"],["he","עברית","il"],
    ["ro","Română","ro"],["cs","Čeština","cz"],["hu","Magyar","hu"],["da","Dansk","dk"],
    ["fi","Suomi","fi"],["no","Norsk","no"],["bn","বাংলা","bd"],["ur","اردو","pk"],
    ["ta","தமிழ்","lk"],["te","తెలుగు","in"],["ms","Bahasa Melayu","my"],["fil","Filipino","ph"],
    ["sw","Kiswahili","ke"],["bg","Български","bg"],["hr","Hrvatski","hr"],["sk","Slovenčina","sk"]
  ];
  function langCookie(){
    var m=document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
    return m?decodeURIComponent(m[1]):null;
  }
  function setLangCookie(code){
    var host=location.hostname;
    // ALWAYS wipe every cookie variant first — Google Translate and prior writes can leave
    // googtrans on several path/domain scopes at once; a half-cleared cookie is the root of the
    // "switch sometimes doesn't take / reverts to a stale language" bug. Kill them all, then set.
    var kill=["googtrans=; path=/; max-age=0","googtrans=; max-age=0"];
    if(host) kill.push("googtrans=; path=/; domain="+host+"; max-age=0");
    if(host&&host.indexOf(".")>0) kill.push("googtrans=; path=/; domain=."+host+"; max-age=0");
    kill.forEach(function(k){ try{ document.cookie=k; }catch(e){} });
    if(code && code!=="en"){
      var val="/en/"+code, exp="; path=/; max-age=31536000";
      document.cookie="googtrans="+val+exp;
      if(host&&host.indexOf(".")>0) document.cookie="googtrans="+val+exp+"; domain=."+host;
    }
  }
  function gtTrigger(code){
    var combo=document.querySelector(".goog-te-combo");
    if(!combo) return false;
    combo.value=code; combo.dispatchEvent(new Event("change"));
    return true;
  }
  function gtToast(msg){
    var t=document.getElementById("gt-toast");
    if(!t){ t=document.createElement("div"); t.id="gt-toast"; document.body.appendChild(t); }
    t.textContent=msg; t.className="show";
    setTimeout(function(){ t.className=""; }, 6000);
  }
  function loadGT(){
    if(document.getElementById("gt-script")) return;
    window.gtInit=function(){
      try{ new google.translate.TranslateElement({pageLanguage:"en",autoDisplay:false},"gt-holder"); }catch(e){}
    };
    var holder=document.createElement("div"); holder.id="gt-holder"; holder.style.display="none";
    document.body.appendChild(holder);
    var s=document.createElement("script"); s.id="gt-script";
    s.src="https://translate.google.com/translate_a/element.js?cb=gtInit";
    s.onerror=function(){ gtToast("Translation is blocked by your browser or an extension (it needs Google Translate). Try disabling shields/ad-blockers for this site."); };
    document.body.appendChild(s);
  }
  // Apply a language by setting the googtrans cookie and reloading. This is the DETERMINISTIC
  // path: Google Translate always translates from the cookie on a fresh load, so a switch can
  // never silently fail (the old in-place combo approach was the flaky part). The <head>
  // pre-paint guard hides the reloaded page until GT settles, so there's no English flash.
  // Switching to English clears the cookie → the page loads untranslated with nothing hidden.
  function applyLang(code){
    setLangCookie(code);
    if(code && code!=="en") document.documentElement.classList.add("xlating"); // hide immediately, before reload paints
    location.reload();
  }
  function initLang(){
    var btn=document.getElementById("lang-btn"), menu=document.getElementById("lang-menu");
    if(!btn||!menu) return;
    var cur=langCookie();
    function flagImg(cc){ return '<img src="https://flagcdn.com/w20/'+cc+'.png" srcset="https://flagcdn.com/w40/'+cc+'.png 2x" width="20" height="15" loading="lazy" alt="">'; }
    var curLang=LANGS.filter(function(l){return l[0]===cur;})[0];
    if(curLang) btn.innerHTML=flagImg(curLang[2]);
    menu.innerHTML=LANGS.map(function(l){
      return '<button data-lang="'+l[0]+'" class="'+((cur||"en")===l[0]?"on":"")+'">'+flagImg(l[2])+'<span>'+l[1]+'</span></button>';
    }).join("");
    btn.addEventListener("click",function(e){ e.stopPropagation(); menu.hidden=!menu.hidden; });
    document.addEventListener("click",function(){ menu.hidden=true; });
    menu.addEventListener("click",function(e){
      var b=e.target.closest("button[data-lang]"); if(!b) return;
      var code=b.getAttribute("data-lang");
      menu.hidden=true;
      var lg=LANGS.filter(function(l){return l[0]===code;})[0]; if(lg) btn.innerHTML=flagImg(lg[2]);
      [].forEach.call(menu.querySelectorAll("button"),function(x){ x.classList.toggle("on", x.getAttribute("data-lang")===code); });
      applyLang(code);
    });
    if(cur&&cur!=="en") loadGT();
  }

  /* ---------- Glide scroller: a hold-and-drag scroll grip on the right edge ----------
     A custom thumb you grab and pull to scroll the page; the page GLIDES to follow
     (rAF lerp), so it feels smooth and fun instead of jumpy. Auto-hides when idle,
     hides entirely when the page isn't scrollable. Native scroll/wheel still work. */
  function initScrollGrip(){
    var grip=document.getElementById("sgrip");
    if(!grip){ grip=document.createElement("div"); grip.id="sgrip"; grip.innerHTML='<span class="sg-bar"></span>'; document.body.appendChild(grip); }
    var bar=grip.querySelector(".sg-bar"), doc=document.documentElement;
    var dragging=false, gTarget=null, gliding=false, hideT, startY=0, startTop=0, pid=null;
    function maxScroll(){ return Math.max(0, doc.scrollHeight-window.innerHeight); }
    function trackH(){ return window.innerHeight-16; }
    function gripH(){ return Math.max(46, Math.min(trackH()-20, trackH()*window.innerHeight/doc.scrollHeight)); }
    function place(){
      var ms=maxScroll();
      if(ms<60){ grip.style.display="none"; return; }
      grip.style.display="block";
      var gh=gripH(); bar.style.height=gh+"px";
      bar.style.transform="translateY("+(8+(window.scrollY/ms)*(trackH()-gh))+"px)";
    }
    function wake(){ grip.classList.add("on"); clearTimeout(hideT); hideT=setTimeout(function(){ if(!dragging) grip.classList.remove("on"); },1500); }
    // Set scrollTop directly (NOT window.scrollTo) — the site has html{scroll-behavior:smooth},
    // which would turn every per-frame scroll into a restarting animation that never moves.
    function glideTo(y){ gTarget=y; if(gliding) return; gliding=true; (function step(){
      var cur=window.scrollY, d=gTarget-cur;
      if(Math.abs(d)<1){ doc.scrollTop=gTarget; document.body.scrollTop=gTarget; gliding=false; return; }
      var nv=cur+d*0.28; doc.scrollTop=nv; document.body.scrollTop=nv; requestAnimationFrame(step);
    })(); }
    window.addEventListener("scroll",function(){ requestAnimationFrame(place); wake(); },{passive:true});
    window.addEventListener("resize",place);
    bar.addEventListener("pointerdown",function(e){
      e.preventDefault(); dragging=true; gliding=false; grip.classList.add("on","drag");
      startY=e.clientY; startTop=window.scrollY; pid=e.pointerId; try{bar.setPointerCapture(pid);}catch(_){}
    });
    window.addEventListener("pointermove",function(e){
      if(!dragging) return;
      var gh=gripH(), perPx=maxScroll()/Math.max(1,(trackH()-gh));
      glideTo(Math.max(0,Math.min(maxScroll(), startTop+(e.clientY-startY)*perPx)));
    });
    function end(){ if(!dragging) return; dragging=false; grip.classList.remove("drag"); try{bar.releasePointerCapture(pid);}catch(_){} clearTimeout(hideT); hideT=setTimeout(function(){ grip.classList.remove("on"); },1500); }
    window.addEventListener("pointerup",end); window.addEventListener("pointercancel",end);
    window.__placeGrip=place; place();
  }

  document.addEventListener("DOMContentLoaded",function(){ initTheme(); initLang(); initPalette(); initMiniPlayer(); initCostTicker(); initTimeMeter(); initCookie(); initScrollGrip(); logVisit(); route(); });
})();
