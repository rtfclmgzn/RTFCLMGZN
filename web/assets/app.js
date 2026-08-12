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
  var GRID = window.RTFC_GRID || {facilities:[]};
  var acctPending=null; // email a magic link was just sent to; not persisted, drives the "check your email" state

  /* ---------- reader library (localStorage; account synced from the server session) ---------- */
  function libGet(){
    try{ var raw=localStorage.getItem("rtfc-lib"); if(raw) return JSON.parse(raw); }catch(e){}
    return { bookmarks:[], readLater:[], read:[], account:null };
  }
  function libSave(l){ try{ localStorage.setItem("rtfc-lib",JSON.stringify(l)); }catch(e){} }
  function inList(list,id){ return list.indexOf(id)>=0; }
  // Boot-time check against the real session cookie. Renders instantly from cached
  // localStorage first (route() already ran), then corrects itself here once the
  // server responds — keeps the site working over file:// with no network at all.
  /* The SERVER owns entitlement. localStorage holds a cached copy so the page can
     paint instantly (and so the site still works over file:// with no network at
     all), but that copy is a UI HINT and nothing more -- it is user-writable, so
     anything that unlocks on it alone is not locked. ACCOUNT_VERIFIED flips true
     only when /api/auth/me has actually answered, and isPlus() requires it. */
  var ACCOUNT_VERIFIED=false;
  function syncAccount(){
    if(typeof fetch!=="function"){ accountUnverified(); return; }
    fetch("/api/auth/me",{credentials:"same-origin"}).then(function(r){
      if(!r.ok) throw new Error("auth/me "+r.status);
      return r.json();
    }).then(function(d){
      var l=libGet();
      // entitlement is the server's description of WHAT the plan is (stripe or
      // voucher, monthly or yearly or lifetime, when it renews or ends). It is
      // cached alongside the plan for painting only -- isPlus() still gates on
      // ACCOUNT_VERIFIED, and nothing in this file ever writes it locally.
      l.account = (d && d.email) ? { email:d.email, plan:d.plan||"free", since:d.since, entitlement:d.entitlement||null } : null;
      ACCOUNT_VERIFIED=true;
      libSave(l); route();
      if(l.account){ syncLibrary(l); syncReadingTime(l); }
    }).catch(function(){ accountUnverified(); });
  }
  // FAIL CLOSED. A session check that never answered must not leave an unconfirmed
  // "plus" in effect -- otherwise blocking one request, or editing one localStorage
  // key, is a subscription. Who you are survives (the account panel still shows the
  // email); what you are entitled to does not.
  function accountUnverified(){
    ACCOUNT_VERIFIED=false;
    var l=libGet();
    if(l.account && l.account.plan==="plus"){ l.account.plan="free"; libSave(l); route(); }
  }
  // Cross-device library sync: push whatever this browser has locally (add-only,
  // never deletes another device's items), then adopt the server's unioned state
  // as the new local truth. Runs every time we confirm a signed-in session, which
  // is exactly "sync when they log in" -- including logging in on a second device.
  function syncLibrary(l){
    fetch("/api/account/library",{method:"POST",credentials:"same-origin",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({action:"merge",bookmarks:l.bookmarks||[],readLater:l.readLater||[],reactions:l.reactions||{}})
    }).then(function(r){ return r.ok?r.json():null; }).then(function(d){
      if(!d) return;
      var l2=libGet();
      l2.bookmarks=d.bookmarks||[]; l2.readLater=d.readLater||[]; l2.reactions=d.reactions||{};
      libSave(l2); route();
    }).catch(function(){});
  }
  window.rtfcToggle=function(kind,id,ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    var l=libGet();
    var list = kind==="bookmark" ? l.bookmarks : kind==="later" ? l.readLater : (l.read=l.read||[]);
    var i=list.indexOf(id); if(i>=0) list.splice(i,1); else list.push(id);
    libSave(l); route();
    if(l.account){
      var act = kind==="bookmark"?"toggle_bookmark":kind==="later"?"toggle_read_later":"toggle_read";
      fetch("/api/account/library",{method:"POST",credentials:"same-origin",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({action:act,article_id:id})
      }).catch(function(){});
    }
  };
  window.rtfcSignup=function(){
    var em=document.getElementById("acct-email"); if(!em||!em.value||em.value.indexOf("@")<1){ if(em) em.style.borderColor="var(--gate)"; return; }
    var btn=document.getElementById("acct-signup-btn");
    if(btn){ if(btn.disabled) return; btn.disabled=true; btn.textContent="Sending…"; } // guards against a double-click emailing two links for the same address
    var email=em.value;
    fetch("/api/auth/request-link",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:email})})
      .then(function(){ acctPending=email; route(); })
      .catch(function(){ acctPending=email; route(); });
  };
  /* ============================ PLUS BILLING ============================
     The server owns entitlement (see isPlus() and the note above it). Nothing
     in this section ever writes l.account.plan: it opens Stripe checkout, opens
     the Stripe billing portal, or redeems a code — and then asks syncAccount()
     what actually changed. The only thing it does keep locally is a discount
     code the reader typed, which is a UI convenience and unlocks nothing.

     This replaced the old prototype plan switch, which POSTed to
     /api/account/plan — an endpoint that does not exist — so its only visible
     behaviour was a toast saying Plus wasn't switchable.
     ===================================================================== */

  /* /api/billing/config, fetched once per load. It answers two things the client
     cannot know: whether checkout is live at all (Stripe keys configured on the
     server) and how many founding places are left. Prices are mirrored here so
     the pricing block can paint before the answer lands — same fixed numbers the
     server charges; if the two ever disagree, the server's win on the next paint. */
  var BILLING_PRICES={monthly:{amount:400},annual:{amount:3000},lifetime:{amount:9000}};
  var BILLING=null, BILLING_REQ=false;
  function billingLoad(){
    if(BILLING || BILLING_REQ) return;
    BILLING_REQ=true;
    if(typeof fetch!=="function"){ BILLING={enabled:false,known:false}; return; }
    fetch("/api/billing/config",{credentials:"same-origin"}).then(function(r){
      if(!r.ok) throw new Error("billing/config "+r.status);
      return r.json();
    }).then(function(d){
      BILLING = (d && d.ok)
        ? { known:true, enabled:!!d.enabled, prices:d.prices||BILLING_PRICES,
            cap:d.lifetime_cap, sold:d.lifetime_sold, remaining:d.lifetime_remaining }
        : { known:false, enabled:false };
      route();
    }).catch(function(){ BILLING={known:false,enabled:false}; route(); });
  }
  // Renderers call this; the first call starts the fetch and the response re-routes.
  function billingState(){
    billingLoad();
    var b=BILLING||{known:false,enabled:false};
    return { known:!!b.known, enabled:!!b.enabled, prices:b.prices||BILLING_PRICES,
             cap:(typeof b.cap==="number")?b.cap:100,
             remaining:(typeof b.remaining==="number")?b.remaining:null };
  }
  function billAmt(st,plan){
    var p=(st.prices&&st.prices[plan])||BILLING_PRICES[plan]||{amount:0};
    return Number(p.amount)||0;
  }
  // 3000 → "$30", 250 → "$2.50". Whole dollars never carry ".00".
  function billMoney(cents){
    var v=(Number(cents)||0)/100;
    return "$"+(v%1===0 ? String(v) : v.toFixed(2));
  }
  // "12 March 2027" — the way a renewal date reads in a sentence.
  function billDate(iso){
    if(!iso) return "";
    var d=new Date(iso);
    if(isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  }
  // A discount code the reader redeemed that turned out to be a discount rather
  // than access: remembered so the next checkout call carries it. Lives in the
  // same rtfc-lib object as the rest of the reader's state.
  function billingCode(){ var l=libGet(); return (l.billing && l.billing.code) || ""; }
  window.rtfcClearCode=function(){
    var l=libGet(); if(l.billing){ delete l.billing.code; libSave(l); }
    route();
  };

  /* Checkout. One session at a time: CHECKOUT_BUSY survives the re-render that a
     failed attempt triggers, and every buy button is disabled for the duration, so
     a double-click cannot open two Stripe sessions against one reader. */
  var CHECKOUT_BUSY=false;
  window.rtfcCheckout=function(plan,ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    var l=libGet();
    if(!l.account){ location.hash="#/account"; return; }
    if(CHECKOUT_BUSY) return;
    if(typeof fetch!=="function"){ gtToast("Checkout needs a connection to the newsroom."); return; }
    CHECKOUT_BUSY=true;
    var btns=document.querySelectorAll(".pp-buy");
    [].forEach.call(btns,function(b){
      b.disabled=true;
      if(b.getAttribute("data-plan")===plan) b.textContent="Taking you to checkout…";
    });
    var body={plan:plan};
    var code=billingCode(); if(code) body.code=code;
    fetch("/api/billing/checkout",{method:"POST",credentials:"same-origin",
      headers:{"content-type":"application/json"},body:JSON.stringify(body)
    }).then(function(r){ return r.json().catch(function(){ return null; }); }).then(function(d){
      // Success navigates away, so the buttons stay disabled on purpose — the page
      // is about to be replaced by Stripe.
      if(d && d.ok && d.url){ window.location.href=d.url; return; }
      CHECKOUT_BUSY=false;
      gtToast((d && d.message) || "Checkout couldn’t be opened just now. Nothing was charged.");
      route();
    }).catch(function(){
      CHECKOUT_BUSY=false;
      gtToast("Couldn’t reach the newsroom to open checkout. Nothing was charged.");
      route();
    });
  };

  /* The Stripe billing portal — card, invoices, cancel, resume. Only ever offered
     when entitlement.source === "stripe": a voucher or comped reader has no Stripe
     customer behind them, so the portal would 404 on a button that promised to work. */
  window.rtfcPortal=function(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); }
    if(typeof fetch!=="function"){ gtToast("Managing your billing needs a connection to the newsroom."); return; }
    var btn=document.getElementById("acct-portal-btn");
    if(btn){ if(btn.disabled) return; btn.disabled=true; btn.textContent="Opening billing…"; }
    fetch("/api/billing/portal",{method:"POST",credentials:"same-origin",
      headers:{"content-type":"application/json"},body:"{}"
    }).then(function(r){ return r.json().catch(function(){ return null; }); }).then(function(d){
      if(d && d.ok && d.url){ window.location.href=d.url; return; }
      gtToast((d && d.message) || "Couldn’t open the billing portal just now. Your subscription is untouched.");
      route();
    }).catch(function(){
      gtToast("Couldn’t reach the newsroom to open the billing portal. Your subscription is untouched.");
      route();
    });
  };

  /* Code redemption. Uppercased and trimmed before it leaves the browser, so codes
     are case-insensitive to the reader. A code that GRANTS access re-syncs from the
     server (never a local plan write); a code that is only a DISCOUNT is remembered
     and shown as applied on the pricing block until checkout or until it's removed. */
  window.rtfcRedeem=function(){
    var inp=document.getElementById("acct-code"); if(!inp) return;
    var code=String(inp.value||"").trim().toUpperCase();
    if(!code){ inp.style.borderColor="var(--gate)"; inp.focus(); return; }
    if(typeof fetch!=="function"){ gtToast("Redeeming a code needs a connection to the newsroom."); return; }
    var btn=document.getElementById("acct-code-btn");
    if(btn){ if(btn.disabled) return; btn.disabled=true; btn.textContent="Checking…"; }
    fetch("/api/billing/redeem",{method:"POST",credentials:"same-origin",
      headers:{"content-type":"application/json"},body:JSON.stringify({code:code})
    }).then(function(r){ return r.json().catch(function(){ return null; }); }).then(function(d){
      if(d && d.ok){
        if(d.checkout_hint){
          var l=libGet(); l.billing=l.billing||{}; l.billing.code=code; libSave(l);
          gtToast(d.message || ("Code "+code+" is a discount — pick a plan and it comes off at checkout."));
          route(); return;
        }
        gtToast(d.message || "Code accepted — your Plus is on.");
        syncAccount();          // the server decides what this code actually granted
        return;
      }
      gtToast((d && d.message) || "That code didn’t work. Check it and try again.");
      route();
    }).catch(function(){
      gtToast("Couldn’t reach the newsroom to check that code. Try again in a moment.");
      route();
    });
  };

  /* ---- the pricing block: one definition, three homes ----
     The account page, the magazine storefront (.plusbar) and the locked-issue
     upsell all render this. Annual is the headline and the recommended tier;
     Founding Lifetime only appears while places remain, and disappears for good
     when they don't. opts:
       dek     – show the "what you get" line above the tiers (default on)
       compact – tighter tiles, no dek: for the issue upsell inside .ip-lock  */
  function plusPricingHTML(opts){
    opts=opts||{};
    var l=libGet(), st=billingState(), code=billingCode();
    var mo=billAmt(st,"monthly"), yr=billAmt(st,"annual"), life=billAmt(st,"lifetime");
    var perMonth=billMoney(Math.round(yr/12));
    var saves=billMoney(Math.max(0,mo*12-yr));
    var compact=!!opts.compact;

    // One button rule for all three tiers: no account → send them to make one;
    // config not answered yet → say so rather than offer a button that will fail;
    // checkout not live → the price stands, the button doesn't pretend.
    function buy(plan,label){
      if(!l.account) return '<a class="cta pp-buy" href="#/account">Create a free account first</a>';
      if(!st.known)  return '<button class="cta pp-buy" disabled>Checking with the newsroom…</button>';
      if(!st.enabled) return '<button class="cta pp-buy" disabled>'+esc(label)+'</button>';
      return '<button class="cta pp-buy" data-plan="'+escAttr(plan)+'" onclick="rtfcCheckout(\''+escAttr(plan)+'\',event)">'+esc(label)+'</button>';
    }

    // ── VOUCHER-ONLY MODE ───────────────────────────────────────────────────────
    // Checkout isn't configured. Rather than paint three price tiles with dead
    // buttons — which reads as a broken site, not an unfinished one — say plainly
    // that Plus is invite-only for now and put the code box front and centre. The
    // price is still announced, because pre-announcing it is useful and honest.
    if(st.known && !st.enabled){
      var vh='<div class="plusplans pp-invite'+(compact?' pp-compact':'')+'">';
      vh+='<div class="pp-head"><div class="pp-mark">RTFCLMGZN <b>Plus</b></div>'+
        '<p class="pp-dek">Plus is <b>invite-only</b> while we finish setting up subscriptions. '+
        'If you have a code, it works right now — no card, nothing to pay.</p></div>';
      vh+='<div class="pp-soon">Subscriptions open soon at <b>'+billMoney(yr)+'/year</b>'+
        ' or '+billMoney(mo)+'/month. Articles stay free, forever.</div>';
      if(!l.account){
        vh+='<a class="cta pp-buy" href="#/account">Create a free account to use a code</a>';
      }
      vh+='</div>';
      return vh;
    }

    var h='<div class="plusplans'+(compact?' pp-compact':'')+'">';
    if(!compact && opts.dek!==false){
      h+='<div class="pp-head"><div class="pp-mark">RTFCLMGZN <b>Plus</b></div>'+
        '<p class="pp-dek">The monthly issue in the spread reader, every special edition, the full back-issue archive, and every issue as a PDF. Articles stay free, forever.</p></div>';
    }
    h+='<div class="pp-tiers">';
    // Annual first, and the only tier carrying .is-rec — it is the default offer.
    h+='<div class="pp-tier is-rec"><span class="pp-rec">Best value</span>'+
        '<div class="pp-name">Annual</div>'+
        '<div class="pp-amt"><b>'+billMoney(yr)+'</b><span>/year</span></div>'+
        '<div class="pp-sub">'+perMonth+'/month, billed yearly · save '+saves+'</div>'+
        buy("annual","Get Plus — "+billMoney(yr)+"/year")+
      '</div>';
    h+='<div class="pp-tier"><div class="pp-name">Monthly</div>'+
        '<div class="pp-amt"><b>'+billMoney(mo)+'</b><span>/month</span></div>'+
        '<div class="pp-sub">Cancel any time, from your account page.</div>'+
        buy("monthly","Get Plus — "+billMoney(mo)+"/month")+
      '</div>';
    // Founding Lifetime is capped, so it is only drawn once the server has told us
    // places remain. No count, no tile — and when they run out it is gone entirely.
    if(st.known && typeof st.remaining==="number" && st.remaining>0){
      h+='<div class="pp-tier pp-life"><span class="pp-rec pp-recl">Founding</span>'+
          '<div class="pp-name">Lifetime</div>'+
          '<div class="pp-amt"><b>'+billMoney(life)+'</b><span>once</span></div>'+
          '<div class="pp-sub">Every issue, for as long as the magazine runs. '+st.remaining+' of the first '+st.cap+' places left.</div>'+
          buy("lifetime","Become a founding member — "+billMoney(life))+
        '</div>';
    }
    h+='</div>';
    if(code){
      h+='<div class="pp-applied">Code <b>'+esc(code)+'</b> applies at checkout. '+
        '<button class="pp-clear" onclick="rtfcClearCode()">Remove</button></div>';
    }
    // Fine print, and only the fine print that is currently true.
    if(!st.known){
      h+='<p class="pb-fine pp-fine">Checking with the newsroom whether checkout is open. Prices above are final either way.</p>';
    } else if(!st.enabled){
      h+='<p class="pb-fine pp-fine">Checkout isn’t live yet — the newsroom hasn’t finished connecting its payment processor, so these buttons are off rather than broken. Prototype — payments arrive with the public launch. The prices above are the real ones.</p>';
    } else {
      h+='<p class="pb-fine pp-fine">Secure checkout by Stripe. Cancel any time; the magazine keeps running either way.</p>';
    }
    return h+'</div>';
  }

  /* ---- what a Plus reader actually has ----
     Reads the server's entitlement and says it in a sentence. Falls back to a bare
     "Plus" when the server hasn't described it (older session, comped by hand). */
  function plusStatusLine(ent){
    if(!ent) return "Plus";
    var when=billDate(ent.expires_at);
    if(ent.interval==="lifetime"){
      return "Plus · lifetime"+(ent.source==="stripe"?" (founding member)":ent.source==="voucher"?" (voucher)":"");
    }
    if(ent.source==="voucher" || ent.source==="comp"){
      var word=(ent.source==="comp")?"on the house":"voucher";
      return when ? ("Plus · free until "+when+" ("+word+")") : ("Plus · "+word);
    }
    if(ent.cancel_at_period_end) return when ? ("Plus · ends "+when) : "Plus · ending at the end of this period";
    if(ent.status==="canceled") return when ? ("Plus · ended "+when) : "Plus · ended";
    var billed = ent.interval==="year" ? "billed yearly" : ent.interval==="month" ? "billed monthly" : "";
    if(billed && when) return "Plus · "+billed+", renews "+when;
    if(billed) return "Plus · "+billed;
    return when ? ("Plus · renews "+when) : "Plus";
  }

  /* ---- coming back from Stripe ----
     Checkout returns the reader to #/account?checkout=success (or ?checkout=cancel).
     route() splits the hash on "/", so the query has to come off the PATH first or
     parts[0] is "account?checkout=success" and a paying reader lands on a 404. The
     parameter is read from the hash query and from location.search (a redirect can
     put it either side of the #), then stripped from the URL so a refresh cannot
     re-fire the toast. */
  function queryParam(query,key){
    var pairs=String(query||"").replace(/^[?&]+/,"").split("&");
    for(var i=0;i<pairs.length;i++){
      if(!pairs[i]) continue;
      var eq=pairs[i].indexOf("=");
      var k=eq<0?pairs[i]:pairs[i].slice(0,eq);
      try{ k=decodeURIComponent(k.replace(/\+/g," ")); }catch(e){}
      if(k!==key) continue;
      var v=eq<0?"":pairs[i].slice(eq+1);
      try{ v=decodeURIComponent(v.replace(/\+/g," ")); }catch(e2){}
      return v;
    }
    return null;
  }
  function stripQueryParam(query,key){
    return String(query||"").replace(/^[?&]+/,"").split("&").filter(function(p){
      if(!p) return false;
      var eq=p.indexOf("="), k=eq<0?p:p.slice(0,eq);
      try{ k=decodeURIComponent(k.replace(/\+/g," ")); }catch(e){}
      return k!==key;
    }).join("&");
  }
  var CHECKOUT_RETURN_DONE=false;
  function handleCheckoutReturn(path,hashQuery){
    if(CHECKOUT_RETURN_DONE) return;
    var v=queryParam(hashQuery,"checkout");
    if(v===null) v=queryParam(location.search,"checkout");
    if(v===null) return;
    // Once per load, even if the URL cannot be rewritten (no history API): the
    // toast and the re-sync must not re-fire on every subsequent navigation.
    CHECKOUT_RETURN_DONE=true;
    // Rewrite the URL first, so nothing below can loop and a refresh is inert.
    var hq=stripQueryParam(hashQuery,"checkout");
    var sq=stripQueryParam(location.search,"checkout");
    var clean=location.pathname+(sq?("?"+sq):"")+"#"+path+(hq?("?"+hq):"");
    if(window.history && history.replaceState){ try{ history.replaceState(null,"",clean); }catch(e){} }
    if(v==="success"){
      gtToast("Payment received — welcome to Plus. Opening your account…");
      syncAccount();            // the server, not the redirect, is what turns Plus on
    } else if(v==="cancel"){
      gtToast("Checkout cancelled — nothing was charged. The offer stays where it is.");
    }
  }

  window.rtfcSignout=function(){
    var l=libGet(); l.account=null; libSave(l); route();
    fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"}).catch(function(){});
  };
  /* reactions — per-article, local, honest (no fake counts; server counts arrive with backend) */
  var REACTS=[{k:"mind",e:"💡",l:"Expanded my mind"},{k:"useful",e:"🛠",l:"I'll use this"},{k:"fire",e:"🔥",l:"Great read"}];
  window.rtfcReact=function(id,k,ev){
    if(ev){ev.preventDefault();ev.stopPropagation();}
    var l=libGet(); l.reactions=l.reactions||{};
    var arr=l.reactions[id]=l.reactions[id]||[];
    var i=arr.indexOf(k); if(i>=0) arr.splice(i,1); else arr.push(k);
    libSave(l); route();
    if(l.account){
      fetch("/api/account/library",{method:"POST",credentials:"same-origin",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({action:"toggle_reaction",article_id:id,reaction:k})
      }).catch(function(){});
    }
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
    var b=inList(l.bookmarks,id), r=inList(l.readLater,id), rd=inList(l.read||[],id);
    return '<span class="savebtns'+(small?' sm':'')+'">'+
      '<button class="sv'+(b?' on':'')+'" title="'+(b?'Bookmarked':'Bookmark')+'" onclick="rtfcToggle(\'bookmark\',\''+id+'\',event)">'+(b?'♥':'♡')+'</button>'+
      '<button class="sv'+(r?' on':'')+'" title="'+(r?'In read-later':'Read later')+'" onclick="rtfcToggle(\'later\',\''+id+'\',event)">'+(r?'◷':'○')+'</button>'+
      '<button class="sv'+(rd?' on':'')+'" title="'+(rd?'Marked as read':'Mark as read')+'" onclick="rtfcToggle(\'read\',\''+id+'\',event)">'+(rd?'✓':'◯')+'</button></span>';
  }
  var ARTICLES = (window.RTFC_ARTICLES || []).concat(window.RTFC_LIVE_ARTICLES || []).concat(window.RTFC_NEWSROOM_ARTICLES || []).concat(window.RTFC_RESEARCH || [])
    .slice().sort(function(a,b){ return new Date(b.publishedAt) - new Date(a.publishedAt); });
  // A story published out-of-cycle for a genuinely major, breaking development
  // (article.breaking===true) holds the homepage hero slot for 24h even as
  // newer routine-cycle articles publish underneath it -- unless an even newer
  // breaking story arrives first, which immediately takes over. After 24h with
  // no successor, it steps down and the hero reverts to the plain newest article.
  var BREAKING_HEADLINE_MS = 24*3600*1000;
  function activeBreakingHeadliner(){
    var breaking = ARTICLES.filter(function(a){ return a.breaking && a.publishedAt; });
    if(!breaking.length) return null;
    var latest = breaking[0]; // ARTICLES is already sorted newest-first
    var age = Date.now() - new Date(latest.publishedAt).getTime();
    return age>=0 && age<BREAKING_HEADLINE_MS ? latest : null;
  }
  // Section colors/glyphs mirror the desks (each section is one editor's beat)
  var SECTION_COLORS = {Frontier:"#8b7cf7",Products:"#e0564d",Compute:"#6cb6f0",Policy:"#42c08a",Health:"#d9a94e",Markets:"#c48af0",Robotics:"#4dd0c4",Opinion:"#c98b5a",Ethics:"#7bb274",Guide:"#e8865f"};
  var FMT = {brief:"Brief",synthesis:"Synthesis",research:"Research",guide:"Guide"};
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
  /* esc() leaves ' alone, which is fine inside a double-quoted attribute but NOT
     inside the single-quoted CSS url('...') and background-image values this file
     builds by hand. escAttr() is the strict variant: use it for anything that ends
     up in an attribute, especially style="". */
  var ESC_ATTR_MAP={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"};
  function escAttr(s){ return String(s==null?"":s).replace(/[&<>"'`]/g,function(c){return ESC_ATTR_MAP[c];}); }
  /* URL allow-list. Article/issue/buzz data is machine-written, so a permissive URL
     rule anywhere in this renderer is an injection surface -- esc() happily passes
     javascript:alert(1) through into an href. Only four shapes are ever emitted:
       - absolute http/https
       - mailto:
       - an in-app hash route (#/... or a bare #anchor)
       - a same-origin relative path (assets/img/x.jpg, /rss.xml)
     Everything else (javascript:, data:, vbscript:, protocol-relative //evil) is
     dropped to "" so the caller renders no link/image rather than a hostile one. */
  function safeUrl(u){
    var s=String(u==null?"":u).replace(/[\u0000-\u001F\u007F]/g,"").trim();
    if(!s) return "";
    if(/^https?:\/\//i.test(s)) return s;
    if(/^mailto:/i.test(s)) return s;
    if(s.charAt(0)==="#") return s;
    if(s.indexOf("//")===0) return "";                    // protocol-relative → off-origin
    if(/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(s)) return "";   // any other scheme
    return s;                                             // same-origin relative path
  }
  // href="..." / src="..." — allow-listed, then attribute-escaped.
  function safeHref(u){ return escAttr(safeUrl(u)); }
  /* A colour out of the data layer lands mid-declaration in a style="" attribute.
     escAttr stops it closing the attribute, but not `;` — a persona colour of
     "red;background:url(x)" injects whole extra declarations. Allow only real
     colour tokens; anything else falls back to the accent. */
  var COLOR_OK=/^(#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([0-9a-z%.,\s\/]+\)|var\(--[a-z0-9-]+\)|[a-z]+)$/i;
  function safeColor(c,fallback){
    var s=String(c==null?"":c).trim();
    return COLOR_OK.test(s) ? s : (fallback||"var(--accent)");
  }
  // url('...') inside a style attribute — allow-listed, then the characters that
  // could close the CSS string or the HTML attribute are percent-encoded.
  function safeCssUrl(u){
    var s=safeUrl(u); if(!s) return "";
    return escAttr(s.replace(/['"()\\\s]/g,function(c){ return "%"+c.charCodeAt(0).toString(16).toUpperCase(); }));
  }
  function slugify(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,40); }
  // Magazine rich text: **bold** · ==highlight== · ++accent++ (escaped first, so it's safe)
  /* Inline [label](url) links.
     These were being written into article bodies by the pipeline for a long time
     -- the cycle runbook §3a explicitly REQUIRES cross-links to company dossiers,
     the Scoreboard and the Dictionary "using an actual inline link, not a
     name-drop" -- but fmt() never converted them, so every one of them shipped to
     the live site as literal markdown in the middle of a sentence. Handled here so
     the fix lands everywhere fmt() is already used (body prose, quotes, component
     labels, magazine pages) rather than in one call site.

     Only two URL shapes are accepted: an in-app hash route (#/...) and an absolute
     http(s) URL. Anything else -- javascript:, data:, a bare word -- is left as the
     original literal text rather than turned into a link, because article data is
     machine-written and a permissive URL rule here would be an injection surface.
     Runs on already-escaped text, so &amp; in a query string stays correct. */
  function mdLinks(s){
    return s.replace(/\[([^\]\n]+)\]\((#\/[^)\s]*|https?:\/\/[^)\s]+)\)/g, function(all,label,url){
      var ext=url.charAt(0)!=="#";
      // safeUrl, NOT safeHref: mdLinks runs on text esc() has already escaped, so a
      // second attribute-escape here would turn a legitimate &amp; in a query string
      // into &amp;amp;. The allow-list still applies.
      return '<a class="inl" href="'+safeUrl(url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+label+'</a>';
    });
  }
  function fmt(s){
    return mdLinks(esc(s)
      .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
      .replace(/==(.+?)==/g,'<mark class="mk">$1</mark>')
      .replace(/\+\+(.+?)\+\+/g,'<span class="acc">$1</span>'));
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
    if(a.image) return "background:linear-gradient(180deg,rgba(11,11,18,0) 45%,rgba(11,11,18,.62) 100%),url('"+safeCssUrl(a.image)+"') center/cover no-repeat,var(--surface2);";
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
      return '<span class="av av-photo" style="background-image:url(\''+safeCssUrl(p.photo)+'\');border-color:'+safeColor(p.color)+';'+(extra||"")+'" role="img" aria-label="'+esc(p.name)+'"></span>';
    }
    return '<span class="av" style="background:linear-gradient(135deg,'+safeColor(p.color)+','+hexRgba(p.color,0.65)+');'+(extra||"")+'">'+initials(p.name)+'</span>';
  }
  // Masthead lightbox — an enlarged closeup of the editor's avatar. Closes on ×,
  // backdrop click, or Escape. Works for photo and initials avatars alike.
  window.rtfcAvatarPop=function(key){
    var p=persona(key); if(!p) return;
    var old=document.getElementById("av-lightbox"); if(old) old.remove();
    var face=p.photo
      ? '<div class="avl-img" style="background-image:url(\''+safeCssUrl(p.photo)+'\')"></div>'
      : '<div class="avl-img avl-initials" style="background:linear-gradient(135deg,'+safeColor(p.color)+','+hexRgba(p.color,0.65)+')">'+initials(p.name)+'</div>';
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
    // `guide` is now a real format with its own floor and its own audit rule, so
    // it must not be re-derived from length -- a guide's instructions live in
    // procedure blocks, which wordCount() cannot see, so length would mislabel it.
    if(a.format==="guide" || a.section==="Guide") return "guide";
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
      '<div style="margin-top:20px">'+(a.breaking?'<span class="pill breaking">Breaking</span>':"")+tagsHTML(a)+'</div>'+
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
  // (deskBrowseHTML was deleted 2026-07-31 — replaced by companyBrowseHTML below and
  //  never called again. Desks stay reachable via the nav "Sections" menu.)
  // "Browse by player" — readers follow companies, not desks. Counts computed
  // live from every article/guide matching each company's coverage regex, using
  // companyMatches() -- the SAME matcher the dossier pages use. It used to test
  // title+dek only while the dossier tested title+dek+body, so the homepage rail
  // and the dossier it links to disagreed about how much we had covered.
  function companyBrowseHTML(){
    var ranked=COMPANIES.map(function(c){
      return {c:c, n:companyMatches(c).articles.length};
    }).filter(function(x){ return x.n>0; })
      .sort(function(a,b){ return b.n-a.n; })
      .slice(0,12);
    // A publication that ships daily must never render a hole. An empty band
    // reads as breakage; a designed empty state reads as "nothing here yet".
    if(!ranked.length){
      return '<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>Browse by player</div>'+
        '<div class="empty-state"><span class="es-mark">◈</span>'+
        '<div><b>No company has been covered twice yet.</b>'+
        '<span>This rail fills itself as the newsroom publishes — every player we write about lands here automatically, ranked by how often they appear.</span></div>'+
        '<a class="es-go" href="#/companies">All companies →</a></div>';
    }
    return '<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>Browse by player</div>'+
      '<div class="player-browse">'+ranked.map(function(x){
        return '<a class="player-cell" href="#/company/'+x.c.key+'" style="--bc:'+brandColor(x.c.key)+'">'+
          brandMark(x.c.key,x.c.name)+'<b>'+esc(x.c.name)+'</b><em>'+x.n+'</em></a>';
      }).join("")+
      '<a class="player-cell player-all" href="#/companies"><b>All companies</b><em>→</em></a></div>';
  }
  function viewHome(){
    // The homepage lead is the newest article -- UNLESS a breaking story is
    // still within its 24h headliner window (see activeBreakingHeadliner
    // above), in which case it holds the slot over newer routine articles. A
    // stale top:true flag must never pin a story here outside that mechanism.
    var top=activeBreakingHeadliner()||ARTICLES[0];
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
    // A publication that renders from a data layer must survive an EMPTY data layer:
    // a failed/blocked article bundle used to reach featureHTML(undefined) and take
    // the whole homepage down with it. Designed empty state instead of a white page.
    if(!top){
      h+='<div class="empty-state es-lead"><span class="es-mark">◈</span>'+
        '<div><b>The newsroom is between editions.</b>'+
        '<span>No story has landed on the wire yet. The pipeline publishes on its own schedule — the lead slot fills itself the moment the next edition ships.</span></div>'+
        '<a class="es-go" href="#/magazine">Read the magazine →</a></div>';
      h+='<div class="home-nl">'+newsletterHTML(true)+'</div>';
      return h+'</div>';
    }
    h+='<div class="top-slot"><div>'+featureHTML(top)+'</div><div class="rail" role="region" aria-label="More stories">'+side.map(railHTML).join("")+'</div></div>';
    // The homepage shows a curated slice, not the whole archive. Every story stays
    // one click away (desk pages + the archive below) -- an unbounded flat grid grew
    // to 56 cards / 18 screens before this, and it grows by ~3 more every single day.
    var LATEST=9, MORE=6;
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Latest across the desk</div>';
    h+='<div class="grid">'+grid.slice(0,LATEST).map(cardHTML).join("")+'</div>';
    h+=companyBrowseHTML(); // replaced deskBrowseHTML() — readers follow companies, not desks; desks remain reachable via nav + section pages
    var more=grid.slice(LATEST, LATEST+MORE);
    if(more.length){
      h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>More from the newsroom</div>';
      h+='<div class="grid">'+more.map(cardHTML).join("")+'</div>';
    }
    var left=Math.max(0, grid.length-(LATEST+MORE));
    if(left) h+='<a class="home-more" href="#/archive">Browse all '+ARTICLES.length+' stories in the archive<span>'+left+' more →</span></a>';
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
      '<div class="beat">'+esc(p.beat)+'</div><div class="tone">Voice — '+esc(p.tone)+'</div>'+
      ((window.RTFC_DOSSIERS&&window.RTFC_DOSSIERS[key])?'<a class="dsr-open" href="#/editor/'+esc(key)+'" title="Open '+esc(p.name)+'’s editor dossier">ⓘ <span>Dossier</span></a>':'')+
      '</div></div>'+
      '<p class="persona-bio">'+esc(p.bio)+'</p>'+
      '<div class="kicker">Byline archive · '+list.length+'</div>'+
      '<div class="grid">'+list.map(cardHTML).join("")+'</div></div>';
    return h;
  }
  // Editor dossier ("Easter egg") — a deep-dive per editor. Stats are computed LIVE from
  // the article + prediction data, so they update automatically with every byline.
  function editorStats(key){
    var mine=ARTICLES.filter(function(a){return a.persona===key||(a.authors&&a.authors.indexOf(key)>=0);});
    var fmt={brief:0,synthesis:0,research:0}, corr=0, desks={}, dates=[];
    mine.forEach(function(a){
      var f=trueFormat(a); if(fmt[f]!=null) fmt[f]++;
      corr+=(a.corrections&&a.corrections.length)||0;
      if(a.section) desks[a.section]=1;
      if(a.publishedAt) dates.push(a.publishedAt);
    });
    dates.sort();
    var preds=(window.RTFC_PREDICTIONS||[]).filter(function(p){return p.by===key;});
    var open=preds.filter(function(p){return /pending|open/i.test(p.status||"");}).length;
    var recent=mine.slice().sort(function(a,b){return new Date(b.publishedAt)-new Date(a.publishedAt);}).slice(0,5);
    return {count:mine.length,fmt:fmt,corrections:corr,since:dates[0]||null,desks:Object.keys(desks),preds:preds,open:open,resolved:preds.length-open,recent:recent};
  }
  function viewDossier(key){
    var p=persona(key); if(!p) return notFound();
    var d=(window.RTFC_DOSSIERS||{})[key]; if(!d) return notFound();
    var s=editorStats(key), col=SECTION_COLORS[p.section]||"#8b7cf7";
    function sc(n,l){ return '<div class="dsr-stat"><b>'+n+'</b><span>'+esc(l)+'</span></div>'; }
    function beat(l,t){ return '<div class="dsr-beat"><div class="dsr-beat-l">'+l+'</div><p>'+esc(t)+'</p></div>'; }
    function mDay(iso){ if(!iso) return "—"; return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
    var mix=[]; if(s.fmt.synthesis)mix.push(s.fmt.synthesis+" synthesis"); if(s.fmt.brief)mix.push(s.fmt.brief+" brief"+(s.fmt.brief>1?"s":"")); if(s.fmt.research)mix.push(s.fmt.research+" research");
    var h='<div class="container" style="max-width:840px"><div style="padding-top:26px"><a class="back" href="#/persona/'+esc(key)+'">← '+esc(p.name)+'</a></div>';
    h+='<div class="dsr-hero" style="--dcol:'+col+'"><span class="dsr-av">'+avatar(p)+'</span>'+
       '<div class="dsr-id"><div class="dsr-eyebrow">◈ Editor dossier</div><h1>'+esc(p.name)+'</h1>'+
       '<div class="dsr-beat-top">'+esc(p.beat)+'</div></div></div>';
    h+='<blockquote class="dsr-epigraph">“'+esc(d.epigraph)+'”</blockquote>';
    h+='<div class="dsr-stats" style="--dcol:'+col+'">'+
       sc(s.count,"byline"+(s.count!==1?"s":""))+
       sc(mDay(s.since),"on the beat since")+
       sc(s.corrections,"correction"+(s.corrections!==1?"s":"")+" logged")+
       sc(s.preds.length?(s.resolved+"/"+s.preds.length):"—","forecasts resolved")+
       '</div>';
    if(mix.length||s.desks.length){
      h+='<p class="dsr-mix">'+(mix.length?("The mix — "+mix.join(" · ")):"")+(s.desks.length?("  ·  desk"+(s.desks.length>1?"s":"")+": "+s.desks.join(", ")):"")+'</p>';
    }
    h+='<div class="dsr-bio" style="--dcol:'+col+'">'+
       beat("The beat",d.beat)+beat("The method",d.method)+beat("The signature",d.signature)+beat("The tell",d.tell)+beat("The red line",d.redline)+
       '</div>';
    if(s.preds.length){
      h+='<div class="dsr-block"><h2 class="dsr-h2">The forecast record</h2><div class="dsr-fcs">'+
        s.preds.map(function(pr){
          var st=(pr.status||"").toLowerCase();
          var cls=/right|correct|hit/.test(st)?"ok":(/wrong|miss/.test(st)?"no":"open");
          var lbl=cls==="ok"?"resolved · right":(cls==="no"?"resolved · missed":"open");
          return '<div class="dsr-fc"><span class="dsr-fc-st '+cls+'">'+lbl+'</span><div><p class="dsr-fc-c">'+esc(pr.claim)+'</p><span class="dsr-fc-m">made '+esc(pr.made||"")+' · resolves '+esc(pr.resolveBy||"")+'</span></div></div>';
        }).join("")+
        '</div><p class="dsr-note"><a href="#/predictions" style="color:var(--accent2)">The full Prediction Ledger →</a></p></div>';
    }
    if(s.recent.length){
      h+='<div class="dsr-block"><h2 class="dsr-h2">Selected bylines</h2><div class="grid">'+s.recent.map(cardHTML).join("")+'</div></div>';
    }
    h+='<div class="dsr-foot"><span class="ic">🤖</span><div><b>'+esc(p.name)+' is an AI editorial persona</b> — a consistent authorial voice the newsroom writes in, not a real person. This dossier is a character profile; the numbers above are computed live from '+esc(p.name)+'’s published work and update with every byline.</div></div>';
    return h+'</div>';
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
    return '<aside class="tldr" id="tldr"><div class="tldr-head"><span class="tldr-ic">⚡</span>Story at a glance</div>'+
      '<ul>'+a.tldr.map(function(x){return '<li>'+fmtBody(x)+'</li>';}).join("")+'</ul></aside>';
  }
  // Action links — when a piece names a product/release/tool, give the reader the door to it.
  // Schema: a.links = [{label, url, note?}]. Rendered as a prominent "Go there" block.
  function linksHTML(a){
    if(!a.links || !a.links.length) return "";
    var items=a.links.map(function(x){
      var ext=x.url && x.url!=="#";
      return '<a class="golink" href="'+safeHref(x.url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+
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

  /* ==========================================================================
     THE ENTITY LAYER — zero-cost provenance annotation.

     First mention of any registered model or lab in an article's prose gets a
     hairline-underlined chip. Hover (or focus, for keyboard/touch) reveals who
     makes it, who owns THEM, whether the weights are open, and its current
     independent score if the Scoreboard has one. Nothing is generated per
     article: this runs at render time against web/data/entities.js, so the
     entire back catalogue carries the layer and every future article inherits
     it for free, at zero tokens.

     Design constraints that matter:
       - FIRST MENTION ONLY, per article. Annotating every "OpenAI" in a
         1,200-word piece is noise, not information.
       - Runs AFTER fmt()/esc(), so it must never match inside an HTML tag or
         nest inside an existing chip. Guarded by splitting on tags first.
       - Silent on miss. An unregistered model renders as plain text exactly as
         it does today, so the layer can never break a page by omission.
       - An `org` already introduced by one of its own models does not get a
         second chip. One provenance nudge per entity per article.
     ========================================================================== */
  var ENT = window.RTFC_ENTITIES || {models:[],orgs:[]};
  function entOrg(key){
    var o=ENT.orgs||[];
    for(var i=0;i<o.length;i++) if(o[i].key===key) return o[i];
    return null;
  }
  // Live independent score for a model, read out of the Scoreboard so there is
  // exactly one place any number is maintained. Highest scored mode wins.
  function entScore(name){
    var rows=(window.RTFC_SCOREBOARD&&window.RTFC_SCOREBOARD.rows)||[], best=null;
    for(var i=0;i<rows.length;i++){
      if(rows[i].model===name && typeof rows[i].score==="number"){
        if(!best || rows[i].score>best.score) best=rows[i];
      }
    }
    return best;
  }
  var ACCESS_LABEL={ "closed":"Closed weights · API only", "open-weights":"Open weights",
    "partial":"Partially open", "unknown":"Access unclear", "n/a":"" };
  function entRow(k,v){ return '<span class="ent-row"><span>'+esc(k)+'</span><b>'+v+'</b></span>'; }
  function entCardModel(m){
    var org=entOrg(m.makerKey), sc=entScore(m.name), rows=[];
    rows.push(entRow("Made by",esc(m.maker)));
    if(org){
      if(org.parent) rows.push(entRow("Owned by",esc(org.parent)));
      // An entry seeded from general knowledge rather than a cited primary source
      // does not get to assert its structure line across 46 published articles.
      // Verify it, drop needsVerify, and it starts rendering.
      if(org.structure && !org.needsVerify) rows.push(entRow("Structure",esc(org.structure)));
      if(org.backers && !org.needsVerify) rows.push(entRow("Backed by",esc(org.backers)));
      if(org.hq) rows.push(entRow("Based",esc(org.hq)));
    }
    var al=ACCESS_LABEL[m.access||"unknown"];
    if(al) rows.push(entRow("Access",esc(al)));
    if(sc) rows.push(entRow("Index score",sc.score+' <a href="#/scoreboard">Scoreboard&nbsp;↗</a>'));
    var foot=(org&&org.houseNote)?'<span class="ent-house">'+esc(org.houseNote)+'</span>':'';
    var link=org?'<a class="ent-link" href="#/company/'+esc(org.key)+'">Dossier: '+esc(org.name)+'&nbsp;↗</a>':'';
    return '<span class="ent-card"><span class="ent-h">'+esc(m.name)+
      (m.kind?'<i>'+esc(m.kind)+'</i>':'')+'</span>'+rows.join("")+foot+link+'</span>';
  }
  function entCardOrg(org){
    var rows=[];
    if(org.parent) rows.push(entRow("Owned by",esc(org.parent)));
    if(org.structure && !org.needsVerify) rows.push(entRow("Structure",esc(org.structure)));
    if(org.backers && !org.needsVerify) rows.push(entRow("Backed by",esc(org.backers)));
    if(org.hq) rows.push(entRow("Based",esc(org.hq)));
    var models=(ENT.models||[]).filter(function(m){ return m.makerKey===org.key; }).map(function(m){ return m.name; });
    if(models.length) rows.push(entRow("Models",esc(models.slice(0,4).join(" · "))));
    if(!rows.length) return "";
    var foot=org.houseNote?'<span class="ent-house">'+esc(org.houseNote)+'</span>':'';
    return '<span class="ent-card"><span class="ent-h">'+esc(org.name)+'<i>organization</i></span>'+
      rows.join("")+foot+'<a class="ent-link" href="#/company/'+esc(org.key)+'">Full dossier&nbsp;↗</a></span>';
  }
  // entities.js is data: `re` is expected to be a RegExp literal, but a string (or
  // anything else) must not reach .match()/.replace(), where a string is silently
  // recompiled as a pattern and an unbalanced one throws inside the render.
  function entRe(v,fallbackName){
    if(v instanceof RegExp) return v;
    var src=(typeof v==="string" && v) ? v : String(fallbackName||"");
    if(!src) return null;
    try{ return new RegExp("\\b"+src.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i"); }catch(e){ return null; }
  }
  function entTargets(){
    var out=[];
    (ENT.models||[]).forEach(function(m){
      var re=entRe(m.re,m.name); if(!re) return;
      out.push({re:re, key:"m:"+m.name, org:m.makerKey, model:true,
        build:function(){ return entCardModel(m); }});
    });
    (ENT.orgs||[]).forEach(function(o){
      out.push({re:new RegExp("\\b"+String(o.name).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b"),
        key:"o:"+o.key, org:o.key, model:false, build:function(){ return entCardOrg(o); }});
    });
    return out;
  }
  var ENT_TARGETS=null;
  // Annotate one already-escaped HTML fragment. `seen` is the per-article set.
  function entAnnotate(html,seen){
    if(!html || !seen || !(ENT.models||[]).length) return html;
    if(!ENT_TARGETS) ENT_TARGETS=entTargets();
    // Split on tags: only text nodes (even indices) are eligible, which is what
    // keeps this from corrupting an attribute or nesting one chip inside another.
    var parts=html.split(/(<[^>]*>)/);
    // Anchor depth: text inside an <a> is skipped entirely. A hovercard nested in
    // a link would be an interactive element inside an interactive element, and
    // the writer's deliberate cross-link is better provenance than an auto-chip
    // anyway -- so an explicit link always wins over the entity layer.
    var aDepth=0;
    for(var i=0;i<parts.length;i++){
      if(i%2===1){
        var tag=parts[i];
        if(/^<a[\s>]/i.test(tag)) aDepth++;
        else if(/^<\/a\s*>/i.test(tag)) aDepth=Math.max(0,aDepth-1);
        continue;
      }
      if(!parts[i] || aDepth>0) continue;
      for(var t=0;t<ENT_TARGETS.length;t++){
        var tg=ENT_TARGETS[t];
        if(seen[tg.key]) continue;
        if(seen["shown:"+tg.org]) continue;
        var mm=parts[i].match(tg.re);
        if(!mm) continue;
        seen[tg.key]=1;
        var card=tg.build();
        if(!card) continue;
        seen["shown:"+tg.org]=1;
        // The replacement is a STRING, so $&, $1, $` and $' inside it are expanded by
        // String.replace. The card is built from entity data (house notes, model names)
        // and any $ in it would splice matched text into the middle of the chip — so
        // every $ is doubled, which is the literal-$ escape for a replacement string.
        var repl='<span class="ent '+(tg.model?"ent-model":"ent-org")+'" tabindex="0">'+esc(mm[0])+card+'</span>';
        parts[i]=parts[i].replace(tg.re, repl.replace(/\$/g,"$$$$"));
      }
    }
    return parts.join("");
  }

  /* ==========================================================================
     THE COMPONENT LIBRARY — structured body blocks.

     Every renderer below takes a small, flat JSON block out of article.body and
     draws it in pure CSS/SVG. No image generation, no chart library, no build
     step, no network call. A cheap model can emit these reliably because the
     shapes are shallow and the field names say what they mean.

     ONE HARD INVARIANT: a component block must NOT carry a top-level `text`
     field. wordCount() sums `.text` across body blocks to derive the visible
     format tier, and rtfcListen() pushes a read-along segment for every block
     with `.text`. A component that put its content in `.text` would silently
     inflate a brief into a synthesis and make the audio version read table
     cells aloud. Content lives in nested objects only. Every renderer here
     obeys that; so must every future one.

     Full menu, when to use which, and the anti-slop rules live in
     agents/_shared/visual-components.md.
     ========================================================================== */

  // Optional per-component source line. Every component that asserts a number
  // should carry one; the spec requires it for any figure not already cited in
  // the surrounding prose.
  function compSrc(s){ return s?'<div class="comp-src">Source: '+fmt(s)+'</div>':''; }
  function compHead(kicker,title,sub){
    if(!title && !kicker) return '';
    return '<div class="comp-head">'+(kicker?'<span class="comp-k">'+esc(kicker)+'</span>':'')+
      (title?'<h4>'+fmt(title)+'</h4>':'')+(sub?'<p>'+fmt(sub)+'</p>':'')+'</div>';
  }

  // COMPARE — the side-by-side. Two to four subjects, N attribute rows. Rows
  // where the values genuinely differ get marked, so the reader's eye lands on
  // the difference instead of having to diff the table themselves.
  function compareHTML(c){
    if(!c || !c.columns || !c.rows) return "";
    var cols=c.columns, n=cols.length;
    var head='<tr><th class="cmp-attr"></th>'+cols.map(function(col,i){
      var sub=col.sub?'<span>'+esc(col.sub)+'</span>':'';
      return '<th'+(col.hi?' class="is-hi"':'')+' style="--ci:'+i+'">'+esc(col.label)+sub+'</th>';
    }).join("")+'</tr>';
    // Which rows actually diverge — computed, not authored, so the emphasis can
    // never disagree with the data sitting next to it.
    var diff=c.rows.map(function(r){
      var uniq={}; (r.values||[]).slice(0,n).forEach(function(v){ uniq[String(v).trim().toLowerCase()]=1; });
      return Object.keys(uniq).length>1;
    });
    var nDiff=diff.filter(Boolean).length, nRows=c.rows.length;
    // Highlighting is only information when it is selective. On a table built to
    // show that two things are unalike, EVERY row differs — and marking every row
    // tells the reader nothing. So: mark the divergences when they're the minority,
    // mark the agreements when divergence is the norm (those are then the
    // surprising rows), and when it's unanimous either way, drop the emphasis and
    // let the table speak for itself.
    var mode = c.markDifferences===false ? "none"
             : (nDiff===nRows || nDiff===0) ? "none"
             : nDiff>nRows/2 ? "same" : "differs";
    var body=c.rows.map(function(r,ri){
      var mark = mode==="differs" ? diff[ri] : mode==="same" ? !diff[ri] : false;
      return '<tr'+(mark?' class="mark"':'')+'>'+
        '<th class="cmp-attr">'+fmt(r.label)+(r.note?'<i>'+esc(r.note)+'</i>':'')+'</th>'+
        (r.values||[]).slice(0,n).map(function(v,i){
          return '<td style="--ci:'+i+'">'+fmt(String(v))+'</td>';
        }).join("")+'</tr>';
    }).join("");
    var legend=(mode==="none")?'':
      '<div class="cmp-legend"><span class="cmp-dot"></span>'+
      (mode==="same"?'Highlighted rows are the only places these two agree'
                    :'Highlighted rows are where these actually diverge')+'</div>';
    return '<figure class="comp comp-compare">'+compHead(c.kicker||"Side by side",c.title,c.sub)+
      '<div class="cmp-scroll"><table class="cmp"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'+
      legend+compSrc(c.source)+'</figure>';
  }

  // TIMELINE — dated sequence. `now` marks the present, `future` items render
  // as pending so a reader can see what has happened vs. what is still owed.
  function timelineHTML(c){
    if(!c || !c.items || !c.items.length) return "";
    var items=c.items.map(function(it){
      var cls=it.future?"tl-i future":(it.hi?"tl-i is-hi":"tl-i");
      return '<li class="'+cls+'">'+
        '<span class="tl-dot"></span>'+
        '<span class="tl-when">'+esc(it.when||"")+'</span>'+
        '<span class="tl-what">'+fmt(it.what||"")+
        (it.detail?'<i>'+fmt(it.detail)+'</i>':'')+
        (it.source?'<a class="tl-src" href="'+safeHref(it.source)+'" target="_blank" rel="noopener">source&nbsp;↗</a>':'')+
        '</span></li>';
    }).join("");
    return '<figure class="comp comp-timeline">'+compHead(c.kicker||"How it got here",c.title,c.sub)+
      '<ol class="tl">'+items+'</ol>'+compSrc(c.source)+'</figure>';
  }

  // ENTITY — the explicit, in-body ownership card for the story's central
  // subject. The auto-chips handle passing mentions; this is for when the
  // corporate structure IS the story and deserves the real estate.
  function entityHTML(c){
    if(!c || !c.items || !c.items.length) return "";
    var cards=c.items.map(function(e){
      var rows=[];
      if(e.maker) rows.push(entRow("Made by",esc(e.maker)));
      if(e.parent) rows.push(entRow("Owned by",esc(e.parent)));
      if(e.structure) rows.push(entRow("Structure",esc(e.structure)));
      if(e.backers) rows.push(entRow("Backed by",esc(e.backers)));
      if(e.hq) rows.push(entRow("Based",esc(e.hq)));
      if(e.access) rows.push(entRow("Access",esc(ACCESS_LABEL[e.access]||e.access)));
      if(e.stake) rows.push(entRow("Stake",esc(e.stake)));
      (e.extra||[]).forEach(function(x){ rows.push(entRow(x.label,fmt(String(x.value)))); });
      var link=e.companyKey?'<a class="ent-link" href="#/company/'+esc(e.companyKey)+'">Dossier&nbsp;↗</a>':'';
      return '<div class="eb-card">'+
        '<div class="eb-name">'+esc(e.name)+(e.kind?'<i>'+esc(e.kind)+'</i>':'')+'</div>'+
        '<div class="eb-rows">'+rows.join("")+'</div>'+
        (e.note?'<p class="eb-note">'+fmt(e.note)+'</p>':'')+link+'</div>';
    }).join("");
    return '<figure class="comp comp-entity">'+compHead(c.kicker||"Who is who here",c.title,c.sub)+
      '<div class="eb-grid'+(c.items.length===1?' one':'')+'">'+cards+'</div>'+compSrc(c.source)+'</figure>';
  }

  // SCORECARD — claim-by-claim evidence strength. This is the component that
  // most directly earns the publication's transparency claim: it shows the
  // reader which parts of the story are nailed down and which are inference,
  // and names the specific fact that would settle each open one.
  var SC_LEVELS={ confirmed:{l:"Confirmed",c:"var(--ok)",i:"●●●"},
                  strong:{l:"Strong",c:"var(--ok)",i:"●●○"},
                  partial:{l:"Partial",c:"var(--gold)",i:"●●○"},
                  contested:{l:"Contested",c:"var(--gate)",i:"●○○"},
                  unverified:{l:"Unverified",c:"var(--gate)",i:"○○○"},
                  company:{l:"Company claim",c:"var(--gold)",i:"●○○"} };
  function scorecardHTML(c){
    if(!c || !c.items || !c.items.length) return "";
    var rows=c.items.map(function(it){
      var lv=SC_LEVELS[it.level]||SC_LEVELS.partial;
      return '<div class="sc-row">'+
        '<div class="sc-claim">'+fmt(it.claim||"")+'</div>'+
        '<div class="sc-lv" style="--lc:'+lv.c+'"><span class="sc-pip">'+lv.i+'</span>'+esc(lv.l)+'</div>'+
        '<div class="sc-basis">'+fmt(it.basis||"")+
          (it.resolver?'<i><b>Would settle it:</b> '+fmt(it.resolver)+'</i>':'')+'</div>'+
        '</div>';
    }).join("");
    return '<figure class="comp comp-scorecard">'+
      compHead(c.kicker||"What is actually established",c.title,c.sub)+
      '<div class="sc-hd"><span>Claim</span><span>Evidence</span><span>Basis</span></div>'+
      rows+compSrc(c.source)+'</figure>';
  }

  // LEDGER — the numbers in the story, each with what it does and does NOT
  // include. Most AI-industry number confusion is scope confusion; this makes
  // the scope explicit instead of leaving it implied.
  function ledgerHTML(c){
    if(!c || !c.items || !c.items.length) return "";
    var rows=c.items.map(function(it){
      return '<div class="lg-row">'+
        '<div class="lg-v">'+esc(it.value||"")+(it.unit?'<span>'+esc(it.unit)+'</span>':'')+'</div>'+
        '<div class="lg-b"><b>'+fmt(it.label||"")+'</b>'+
          (it.includes?'<span class="lg-in">Includes: '+fmt(it.includes)+'</span>':'')+
          (it.excludes?'<span class="lg-ex">Not included: '+fmt(it.excludes)+'</span>':'')+
          (it.note?'<i>'+fmt(it.note)+'</i>':'')+'</div></div>';
    }).join("");
    return '<figure class="comp comp-ledger">'+compHead(c.kicker||"The numbers, scoped",c.title,c.sub)+
      rows+compSrc(c.source)+'</figure>';
  }

  // BEFOREAFTER — what specifically changed. Two columns, paired rows.
  function beforeAfterHTML(c){
    if(!c || !c.rows || !c.rows.length) return "";
    var rows=c.rows.map(function(r){
      return '<div class="ba-row"><span class="ba-l">'+fmt(r.label||"")+'</span>'+
        '<span class="ba-b">'+fmt(String(r.before||"—"))+'</span>'+
        '<span class="ba-arrow">→</span>'+
        '<span class="ba-a">'+fmt(String(r.after||"—"))+'</span></div>';
    }).join("");
    return '<figure class="comp comp-ba">'+compHead(c.kicker||"What changed",c.title,c.sub)+
      '<div class="ba-hd"><span></span><span>'+esc(c.beforeLabel||"Before")+'</span><span></span>'+
      '<span>'+esc(c.afterLabel||"After")+'</span></div>'+rows+compSrc(c.source)+'</figure>';
  }

  // SPECTRUM — position markers on one labeled axis. Where the labs sit on
  // open-to-closed, where prices sit against each other, and so on. Positions
  // are 0-100 and must be derived from a real ordering, never vibes.
  function spectrumHTML(c){
    if(!c || !c.markers || !c.markers.length) return "";
    var mk=c.markers.map(function(m,i){
      var p=Math.max(0,Math.min(100,Number(m.at)||0));
      return '<span class="sp-m'+(m.hi?" is-hi":"")+'" style="left:'+p+'%;--mi:'+i+'">'+
        '<i class="sp-pin"></i><span class="sp-lb">'+esc(m.label)+
        (m.value?'<b>'+esc(m.value)+'</b>':'')+'</span></span>';
    }).join("");
    return '<figure class="comp comp-spectrum">'+compHead(c.kicker||"Where this sits",c.title,c.sub)+
      '<div class="sp-wrap"><div class="sp-track">'+mk+'</div>'+
      '<div class="sp-ends"><span>'+esc(c.leftLabel||"")+'</span><span>'+esc(c.rightLabel||"")+'</span></div></div>'+
      compSrc(c.source)+'</figure>';
  }

  // FLOW — a chain: how money, data, chips, or authority actually moves. Steps
  // with optional per-step actor, so a reader can follow who does what to whom.
  function flowHTML(c){
    if(!c || !c.steps || !c.steps.length) return "";
    var steps=c.steps.map(function(s,i){
      return '<li class="fl-s'+(s.hi?" is-hi":"")+(s.blocked?" blocked":"")+'">'+
        '<span class="fl-n">'+(s.blocked?"✕":String(i+1))+'</span>'+
        '<span class="fl-b">'+(s.actor?'<span class="fl-a">'+esc(s.actor)+'</span>':'')+
        '<b>'+fmt(s.what||"")+'</b>'+(s.detail?'<i>'+fmt(s.detail)+'</i>':'')+'</span></li>';
    }).join("");
    return '<figure class="comp comp-flow">'+compHead(c.kicker||"How it works",c.title,c.sub)+
      '<ol class="fl">'+steps+'</ol>'+compSrc(c.source)+'</figure>';
  }

  // KEYFACTS — the dense box. Deliberately plain: label/value pairs a reader
  // can scan in five seconds before deciding to read the piece.
  function keyfactsHTML(c){
    if(!c || !c.items || !c.items.length) return "";
    var items=c.items.map(function(it){
      return '<div class="kf-i"><span class="kf-l">'+esc(it.label)+'</span>'+
        '<span class="kf-v">'+fmt(String(it.value))+'</span>'+
        (it.note?'<span class="kf-n">'+fmt(it.note)+'</span>':'')+'</div>';
    }).join("");
    // Choose a column count that FILLS its rows. A plain auto-fit grid gave six
    // items four columns, leaving two dead cells and stretching every cell in the
    // first row to match the tallest wrapped value. Picking the divisor that
    // completes the grid keeps it tidy at any item count and gives long values
    // more horizontal room, so they wrap less.
    var n=c.items.length;
    var cols = n<=3 ? n : (n%3===0 ? 3 : n%2===0 ? Math.min(4,n/2) : n<=5 ? 3 : 4);
    return '<figure class="comp comp-keyfacts">'+compHead(c.kicker||"At a glance",c.title,c.sub)+
      '<div class="kf-grid" style="--kf-cols:'+cols+'">'+items+'</div>'+compSrc(c.source)+'</figure>';
  }

  // STAKES — who gains, who loses, who is merely exposed. Forces the piece to
  // be specific about incidence instead of gesturing at "the industry."
  var STAKE_TONE={ gains:{i:"▲",c:"var(--ok)",l:"Gains"}, loses:{i:"▼",c:"var(--gate)",l:"Loses"},
                   exposed:{i:"◆",c:"var(--gold)",l:"Exposed"}, unclear:{i:"◇",c:"var(--muted)",l:"Unclear"} };
  function stakesHTML(c){
    if(!c || !c.items || !c.items.length) return "";
    var items=c.items.map(function(it){
      var t=STAKE_TONE[it.tone]||STAKE_TONE.unclear;
      return '<div class="stk-i" style="--sc:'+t.c+'">'+
        '<div class="stk-h"><span class="stk-ic">'+t.i+'</span>'+
        '<b>'+esc(it.who)+'</b><span class="stk-t">'+esc(it.label||t.l)+'</span></div>'+
        '<p>'+fmt(it.what||"")+'</p></div>';
    }).join("");
    return '<figure class="comp comp-stakes">'+compHead(c.kicker||"Who this lands on",c.title,c.sub)+
      '<div class="stk-grid">'+items+'</div>'+compSrc(c.source)+'</figure>';
  }

  // SOURCECHECK — the reconciliation panel. When sources disagree on a number
  // or a date, this shows the disagreement and the ruling instead of silently
  // picking one. The runbook already requires reconciling conflicts in prose;
  // this makes the work visible, which is the part a wire rewrite can't fake.
  function sourcecheckHTML(c){
    if(!c || !c.items || !c.items.length) return "";
    var items=c.items.map(function(it){
      var claims=(it.claims||[]).map(function(cl){
        return '<li class="'+(cl.trusted?"trusted":"")+'">'+
          '<span class="scc-who">'+esc(cl.who)+(cl.kind?'<i>'+esc(cl.kind)+'</i>':'')+'</span>'+
          '<span class="scc-val">'+fmt(String(cl.says))+'</span>'+
          (cl.url?'<a href="'+safeHref(cl.url)+'" target="_blank" rel="noopener">↗</a>':'')+
          (cl.trusted?'<span class="scc-badge">used</span>':'')+'</li>';
      }).join("");
      return '<div class="scc-i"><div class="scc-q">'+fmt(it.question||"")+'</div>'+
        '<ul class="scc-l">'+claims+'</ul>'+
        (it.ruling?'<p class="scc-r"><b>Ruling:</b> '+fmt(it.ruling)+'</p>':'')+'</div>';
    }).join("");
    return '<figure class="comp comp-scc">'+
      compHead(c.kicker||"Where the sources disagree",c.title,
        c.sub||"Conflicts found while reporting this, and which figure this piece uses.")+
      items+compSrc(c.source)+'</figure>';
  }

  /* ==========================================================================
     THE ACCOUNTABILITY ENGINE

     Every article contains claims that will be settled later. A human newsroom
     never goes back -- not because it cannot, but because nobody is assigned to
     and there is no reward for it. This closes that loop.

     Design: open claims are DERIVED LIVE from the articles themselves, never
     maintained by hand. Two machine-readable sources already exist in the data:
       - scorecard items whose `level` is unsettled and which name a `resolver`
         (the specific document or event that would settle them)
       - `apply` items on watch-type articles (named things to watch)
     Only RESOLUTIONS are stored, in web/data/resolutions.js, keyed to the claim.
     So the ledger cannot drift from the archive: delete a claim from an article
     and it leaves the ledger; a resolution with no matching claim is inert.

     Integrity rule, enforced by construction: resolutions are APPEND-ONLY and
     dated. Original article text is never rewritten -- a resolved claim adds a
     dated update block beneath the piece. The moment history gets silently
     edited, the transparency claim this publication rests on is gone.
     ========================================================================== */
  var UNSETTLED={partial:1,contested:1,unverified:1,company:1};
  function claimKey(slug,kind,idx){ return slug+"|"+kind+"|"+idx; }
  // Every open claim across the archive, newest article first.
  function allClaims(){
    var out=[];
    ARTICLES.concat(GUIDES).forEach(function(a){
      var sc=0;
      (a.body||[]).forEach(function(b){
        if(b.type!=="scorecard") return;
        ((b.scorecard&&b.scorecard.items)||[]).forEach(function(it){
          var i=sc++;
          if(!UNSETTLED[it.level] || !it.resolver) return;
          out.push({key:claimKey(a.slug,"sc",i),slug:a.slug,title:a.title,
            publishedAt:a.publishedAt,section:a.section,kind:"claim",
            claim:it.claim,level:it.level,basis:it.basis,resolver:it.resolver});
        });
      });
      // applyType(a) — NOT the raw a.applyType field. The renderer defaults the apply
      // block by desk when the field is absent, so a Frontier/Markets/Robotics piece
      // shows a "What to watch" box the ledger never counted. Testing the raw field
      // undercounted the archive's open watch items by nine.
      if(applyType(a)==="watch"){
        (a.apply||[]).forEach(function(x,i){
          out.push({key:claimKey(a.slug,"w",i),slug:a.slug,title:a.title,
            publishedAt:a.publishedAt,section:a.section,kind:"watch",
            claim:x.label,resolver:x.text});
        });
      }
    });
    out.sort(function(x,y){ return new Date(y.publishedAt)-new Date(x.publishedAt); });
    return out;
  }
  function resolutionMap(){
    var R=(window.RTFC_RESOLUTIONS&&window.RTFC_RESOLUTIONS.items)||[], m={};
    R.forEach(function(r){ if(r.key) m[r.key]=r; });
    return m;
  }
  var RES_OUTCOME={
    confirmed:{l:"Confirmed",c:"var(--ok)"},
    refuted:{l:"Refuted",c:"var(--gate)"},
    partly:{l:"Partly borne out",c:"var(--gold)"},
    superseded:{l:"Superseded",c:"var(--muted)"},
    expired:{l:"Never resolved",c:"var(--muted)"}
  };
  // Dated update block appended beneath an article whose claims have since
  // resolved. Append-only by construction: this renders alongside the original
  // text, it never replaces any of it.
  function updatesHTML(a){
    var m=resolutionMap();
    var mine=allClaims().filter(function(c){ return c.slug===a.slug && m[c.key]; })
      .map(function(c){ return {c:c,r:m[c.key]}; });
    if(!mine.length) return "";
    mine.sort(function(x,y){ return new Date(x.r.at)-new Date(y.r.at); });
    var rows=mine.map(function(o){
      var oc=RES_OUTCOME[o.r.outcome]||RES_OUTCOME.partly;
      return '<div class="up-row" style="--oc:'+oc.c+'">'+
        '<div class="up-h"><time>'+esc(fullTimestamp(o.r.at))+'</time>'+
        '<span class="up-oc">'+esc(oc.l)+'</span></div>'+
        '<div class="up-claim">'+fmt(o.c.claim)+'</div>'+
        '<p class="up-note">'+fmt(o.r.note||"")+'</p>'+
        (o.r.url?'<a class="up-src" href="'+safeHref(o.r.url)+'" target="_blank" rel="noopener">'+
          esc(o.r.label||"What settled it")+' ↗</a>':'')+'</div>';
    }).join("");
    return '<div class="updates"><div class="up-head">Since publication'+
      '<span>'+mine.length+' open question'+(mine.length===1?'':'s')+' from this piece '+
      (mine.length===1?'has':'have')+' since been settled. The article above is unchanged; '+
      'every resolution is added here, dated.</span></div>'+rows+
      '<a class="up-all" href="#/claims">The full claims ledger →</a></div>';
  }
  function claimRowHTML(c,r){
    var oc=r?(RES_OUTCOME[r.outcome]||RES_OUTCOME.partly):null;
    return '<div class="cl-row'+(r?" is-res":"")+'"'+(oc?' style="--oc:'+oc.c+'"':'')+'>'+
      '<div class="cl-main">'+
        '<div class="cl-claim">'+fmt(c.claim)+'</div>'+
        '<div class="cl-meta"><span class="cl-kind">'+(c.kind==="watch"?"Watching":esc((SC_LEVELS[c.level]||{l:"Open"}).l))+'</span>'+
        '<a href="#/article/'+esc(c.slug)+'">'+esc(c.title)+'</a>'+
        '<time>'+when(c.publishedAt)+'</time></div>'+
      '</div>'+
      '<div class="cl-res">'+(r
        ? '<span class="cl-oc">'+esc(oc.l)+'</span><span class="cl-note">'+fmt(r.note||"")+'</span>'+
          '<time>'+esc(fullTimestamp(r.at))+'</time>'
        : '<span class="cl-open">Open</span><span class="cl-note"><b>Would settle it:</b> '+fmt(c.resolver||"")+'</span>')+
      '</div></div>';
  }
  var CL_FILTER="open";
  window.rtfcClaimFilter=function(k){ CL_FILTER=k; var app=document.getElementById("app"); if(app){ app.innerHTML=viewClaims(); if(window.__motion) window.__motion(); } };
  function viewClaims(){
    var claims=allClaims(), m=resolutionMap();
    var resolved=claims.filter(function(c){ return m[c.key]; });
    var open=claims.filter(function(c){ return !m[c.key]; });
    var hit=resolved.filter(function(c){ return m[c.key].outcome==="confirmed"; }).length;
    var miss=resolved.filter(function(c){ return m[c.key].outcome==="refuted"; }).length;
    var h='<div class="container" style="max-width:900px"><div class="mast-hero" style="padding-bottom:6px">'+
      '<div class="over">The Claims Ledger</div><h1>Every open question, tracked to its answer</h1>'+
      '<p>Each piece this newsroom publishes names what it does <b>not</b> yet know, and the specific document or event that would settle it. '+
      'Those open questions are collected here automatically and closed when they resolve — including the ones that resolve against '+
      'what a company, an official, or this publication expected. Nothing above an article is ever rewritten; resolutions are added, dated.</p></div>';
    h+='<div class="cl-stats">'+
      '<div class="cl-st"><b>'+claims.length+'</b><span>claims logged</span></div>'+
      '<div class="cl-st"><b>'+open.length+'</b><span>still open</span></div>'+
      '<div class="cl-st"><b>'+resolved.length+'</b><span>resolved</span></div>'+
      '<div class="cl-st"><b>'+hit+' / '+miss+'</b><span>borne out / refuted</span></div></div>';
    h+='<div class="sb-sort" style="margin-top:18px"><span>Show</span>'+
      [["open","Still open ("+open.length+")"],["resolved","Resolved ("+resolved.length+")"],["all","Everything"]]
        .map(function(o){ return '<button class="'+(CL_FILTER===o[0]?"on":"")+'" onclick="rtfcClaimFilter(\''+o[0]+'\')">'+esc(o[1])+'</button>'; }).join("")+
      '</div>';
    var list=CL_FILTER==="open"?open:CL_FILTER==="resolved"?resolved:claims;
    if(!list.length){
      h+='<div class="apply" style="margin-top:22px"><div class="apply-head"><span class="apply-ic">◈</span>Nothing here yet</div>'+
        '<ul><li>Claims appear as articles publish scorecards and watch items. Resolutions appear as the scans close them.</li></ul></div>';
    } else {
      h+='<div class="cl-list">'+list.map(function(c){ return claimRowHTML(c,m[c.key]); }).join("")+'</div>';
    }
    h+='<p class="sb-basis" style="margin-top:20px">Open claims are derived live from the articles themselves — every scorecard item still marked unsettled that names what would resolve it, plus every named watch item. '+
      'Nothing on this page is maintained by hand, so it cannot drift from the archive. Resolutions are append-only and carry the source that settled them.</p>';
    return h+'</div>';
  }

  /* ---- EVIDENCE ON DEMAND ---------------------------------------------------
     A per-paragraph provenance marker built from the `citation_urls` the
     pipeline has been writing all along (93% of published paragraphs carry
     them; none was ever rendered). Matches each URL back to the article's own
     numbered source list so the popover names the outlet instead of showing a
     raw link, and marks primary sources distinctly from reporting. Renders
     nothing when a paragraph has no citations -- silence is honest, a fake
     marker is not. */
  var PRIMARY_HINT=/(\.gov|docs\.fcc|sec\.gov|stocktitan|huggingface\.co|arxiv|nvidianews|prnewswire|anthropic\.com\/news|openai\.com|blogs\.nvidia|github\.com|pacingthefrontier|artificialanalysis)/i;
  function srcLabelFor(url,a){
    var srcs=(a&&a.sources)||[];
    for(var i=0;i<srcs.length;i++) if(srcs[i].url===url) return {n:i+1,label:srcs[i].label};
    var d=String(url).replace(/^https?:\/\//,"").split("/")[0].replace(/^www\./,"");
    return {n:null,label:d};
  }
  function evidenceMarkHTML(b,a){
    var urls=(b&&b.citation_urls)||[];
    if(!urls.length) return "";
    // PHRASING CONTENT ONLY. This marker lives inside a <p>, and the HTML parser
    // auto-closes an open <p> the moment it meets flow content -- a <ul> here
    // silently detached the entire source list from the popover. Everything
    // below is span/a/em styled as blocks, which the parser leaves nested.
    var items=urls.map(function(u){
      var m=srcLabelFor(u,a), prim=PRIMARY_HINT.test(u);
      return '<span class="ev-i'+(prim?' ev-primary':'')+'">'+
        '<span class="ev-n">'+(m.n?m.n:'&middot;')+'</span>'+
        '<a href="'+safeHref(u)+'" target="_blank" rel="noopener">'+esc(m.label)+'</a>'+
        (prim?'<em>primary</em>':'')+'</span>';
    }).join("");
    return '<span class="evmark" tabindex="0" role="button" aria-label="Sources for this paragraph">'+
      '<span class="ev-dot">'+urls.length+'</span>'+
      '<span class="ev-pop"><span class="ev-h">Backing this paragraph</span>'+
      '<span class="ev-list">'+items+'</span>'+
      '<span class="ev-f">Primary sources are marked. Everything here traces to them.</span></span></span>';
  }

  /* ==========================================================================
     THE INTERROGATION LAYER — four components that let a reader test the story
     instead of only reading it, plus the primary-document viewer.

     The unifying idea: a human desk is limited by attention, memory, incentive
     and time. Each of these does something a well-funded human newsroom could
     do but never actually does -- normalize every figure it has ever published,
     surface its own weakest point, hand the reader the arithmetic, or show the
     filing instead of linking it.
     ========================================================================== */

  /* ---- MODEL: reader-adjustable arithmetic ----------------------------------
     Sliders over the story's OWN sourced numbers, with outputs computed live.
     Turns "the multiple is 117x" from an assertion into something the reader
     can push on ("what if ARR only reaches 400?").

     Formulas are evaluated by a hand-written recursive-descent parser over a
     tiny grammar: numbers, input keys, + - * / ( ), unary minus, and four
     whitelisted functions. Deliberately NOT eval() or new Function() -- article
     data is first-party today, but a data file is exactly the kind of thing a
     future cycle writes automatically, and an arbitrary-code path there would
     be a standing injection hole for zero benefit. */
  var MODEL_FNS={ round:function(x){return Math.round(x);}, abs:Math.abs,
    min:Math.min, max:Math.max, floor:Math.floor, ceil:Math.ceil };
  function evalExpr(src,vars){
    var s=String(src), i=0;
    function ws(){ while(i<s.length && /\s/.test(s[i])) i++; }
    function expr(){
      var v=term();
      for(;;){ ws();
        if(s[i]==="+"){ i++; v+=term(); }
        else if(s[i]==="-"){ i++; v-=term(); }
        else return v;
      }
    }
    function term(){
      var v=unary();
      for(;;){ ws();
        if(s[i]==="*"){ i++; v*=unary(); }
        else if(s[i]==="/"){ i++; var d=unary(); v = d===0 ? NaN : v/d; }
        else return v;
      }
    }
    function unary(){ ws(); if(s[i]==="-"){ i++; return -unary(); } if(s[i]==="+"){ i++; return unary(); } return atom(); }
    function atom(){
      ws();
      if(s[i]==="("){ i++; var v=expr(); ws(); if(s[i]===")") i++; return v; }
      var m=/^\d+(\.\d+)?/.exec(s.slice(i));
      if(m){ i+=m[0].length; return parseFloat(m[0]); }
      var id=/^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(i));
      if(id){
        i+=id[0].length; ws();
        if(s[i]==="("){ // whitelisted function call
          i++; var args=[expr()]; ws();
          while(s[i]===","){ i++; args.push(expr()); ws(); }
          if(s[i]===")") i++;
          var fn=MODEL_FNS[id[0]];
          return fn?fn.apply(null,args):NaN;
        }
        return (vars && id[0] in vars) ? Number(vars[id[0]]) : NaN;
      }
      i++; return NaN; // unparseable: NaN propagates and renders as "—"
    }
    var out=expr();
    return isFinite(out)?out:NaN;
  }
  function fmtModelNum(v,dec){
    if(!isFinite(v)) return "—";
    var d=(dec==null)?(Math.abs(v)>=100?0:Math.abs(v)>=10?1:2):dec;
    return v.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g,",");
  }
  var MODEL_SEQ=0;
  function modelHTML(c){
    if(!c || !c.inputs || !c.inputs.length || !c.outputs || !c.outputs.length) return "";
    var id="mdl-"+(++MODEL_SEQ);
    var sliders=c.inputs.map(function(inp){
      return '<div class="md-in"><label for="'+id+'-'+esc(inp.key)+'">'+fmt(inp.label)+
        '<b id="'+id+'-v-'+esc(inp.key)+'">'+esc(inp.prefix||"")+fmtModelNum(Number(inp.value),inp.dec)+esc(inp.unit||"")+'</b></label>'+
        '<input type="range" id="'+id+'-'+esc(inp.key)+'" data-k="'+esc(inp.key)+'" '+
        'min="'+Number(inp.min)+'" max="'+Number(inp.max)+'" step="'+Number(inp.step||1)+'" value="'+Number(inp.value)+'" '+
        'oninput="rtfcModel(\''+id+'\')">'+
        (inp.note?'<span class="md-note">'+fmt(inp.note)+'</span>':'')+'</div>';
    }).join("");
    var outs=c.outputs.map(function(o,oi){
      return '<div class="md-out"><span class="md-ol">'+fmt(o.label)+'</span>'+
        '<b id="'+id+'-o-'+oi+'">—</b>'+(o.note?'<i>'+fmt(o.note)+'</i>':'')+'</div>';
    }).join("");
    // Config travels in a data attribute so re-renders (route changes) rebuild
    // state from the DOM rather than from a global that could go stale.
    var cfg=esc(JSON.stringify({inputs:c.inputs.map(function(x){return {key:x.key,unit:x.unit,prefix:x.prefix,dec:x.dec};}),
                                outputs:c.outputs.map(function(x){return {expr:x.expr,unit:x.unit,prefix:x.prefix,dec:x.dec};})}));
    return '<figure class="comp comp-model" id="'+id+'" data-cfg="'+cfg+'">'+
      compHead(c.kicker||"Run it yourself",c.title,
        c.sub||"Drag any assumption. Every starting value is a figure this piece sourced; the outputs are arithmetic on them, not a forecast.")+
      '<div class="md-grid"><div class="md-ins">'+sliders+'</div><div class="md-outs">'+outs+'</div></div>'+
      compSrc(c.source)+'</figure>';
  }
  window.rtfcModel=function(id){
    var root=document.getElementById(id); if(!root) return;
    var cfg; try{ cfg=JSON.parse(root.getAttribute("data-cfg")); }catch(e){ return; }
    var vars={};
    cfg.inputs.forEach(function(inp){
      var el=document.getElementById(id+"-"+inp.key); if(!el) return;
      var v=parseFloat(el.value); vars[inp.key]=v;
      var lab=document.getElementById(id+"-v-"+inp.key);
      if(lab) lab.textContent=(inp.prefix||"")+fmtModelNum(v,inp.dec)+(inp.unit||"");
    });
    cfg.outputs.forEach(function(o,oi){
      var el=document.getElementById(id+"-o-"+oi); if(!el) return;
      var v=evalExpr(o.expr,vars);
      el.textContent=isFinite(v)?((o.prefix||"")+fmtModelNum(v,o.dec)+(o.unit||"")):"—";
    });
  };
  // Initialise every model on the page after a render (route() calls __motion,
  // which calls this) so outputs are never left showing the em-dash placeholder.
  function initModels(){
    var ms=document.querySelectorAll(".comp-model");
    for(var i=0;i<ms.length;i++) window.rtfcModel(ms[i].id);
  }

  /* ---- RANK: this figure against every comparable one on record -------------
     Reads web/data/figures.js, the normalized cross-archive register. A human
     desk cannot hold 200 normalized figures in working memory; this holds all
     of them permanently and re-ranks every time anything is added. The rank is
     computed live, so it can never go stale or contradict the register. */
  function figuresOfKind(kind){
    var F=(window.RTFC_FIGURES&&window.RTFC_FIGURES.items)||[];
    return F.filter(function(f){ return f.kind===kind; })
            .slice().sort(function(a,b){ return b.value-a.value; });
  }
  function rankHTML(c){
    if(!c || !c.kind || !c.highlight) return "";
    var list=figuresOfKind(c.kind);
    if(list.length<2) return "";
    var meta=(window.RTFC_FIGURES&&window.RTFC_FIGURES.kinds&&window.RTFC_FIGURES.kinds[c.kind])||{};
    var idx=-1;
    for(var i=0;i<list.length;i++) if(list[i].id===c.highlight) idx=i;
    var top=c.limit?list.slice(0,Math.max(c.limit,idx+1)):list;
    var max=list[0].value||1;
    var unit=meta.unit||"";
    var rows=top.map(function(f,i){
      var w=Math.max(2,Math.round(f.value/max*100));
      var hi=f.id===c.highlight;
      var href=f.slug?('#/article/'+f.slug):null;
      var inner='<span class="rk-n">'+(i+1)+'</span><span class="rk-l">'+esc(f.label)+'</span>'+
        '<span class="rk-track"><i style="width:'+w+'%"></i></span>'+
        '<span class="rk-v">'+esc((meta.prefix||"")+fmtModelNum(f.value,meta.dec)+unit)+'</span>';
      return href?('<a class="rk-row'+(hi?" is-hi":"")+'" href="'+href+'">'+inner+'</a>')
                 :('<div class="rk-row'+(hi?" is-hi":"")+'">'+inner+'</div>');
    }).join("");
    var standing=(idx>=0)?('<p class="rk-standing"><b>#'+(idx+1)+'</b> of '+list.length+' '+
      esc(meta.noun||"entries")+' on record'+(c.limit&&list.length>top.length?' (top '+top.length+' shown)':'')+'.</p>'):'';
    return '<figure class="comp comp-rank">'+
      compHead(c.kicker||"Against the record",c.title||meta.title,
        c.sub||meta.sub||"Every comparable figure this publication has logged, normalized to one unit and re-ranked automatically.")+
      standing+'<div class="rks">'+rows+'</div>'+
      compSrc(c.source||meta.source)+'</figure>';
  }

  /* ---- COUNTER: the strongest case against this piece's own read ------------
     A human newsroom does not publish the best argument against the story it
     just sold; the incentive runs the other way. A publication that discloses
     it is machine-written has no such incentive, which makes naming its own
     weakest point both cheap and unusually credible. */
  function counterHTML(c){
    if(!c || !c.points || !c.points.length) return "";
    var pts=c.points.map(function(p){
      return '<div class="ct-p"><b>'+fmt(p.claim)+'</b>'+
        (p.detail?'<p>'+fmt(p.detail)+'</p>':'')+
        (p.whoHolds?'<span class="ct-who">Held by: '+fmt(p.whoHolds)+'</span>':'')+'</div>';
    }).join("");
    return '<figure class="comp comp-counter">'+
      compHead(c.kicker||"The strongest case against",c.title||"Where this read could be wrong",
        c.sub||"The best argument against this piece's own conclusion, stated as strongly as its holders would put it.")+
      pts+
      (c.verdict?'<p class="ct-v"><b>Why this piece still lands where it does:</b> '+fmt(c.verdict)+'</p>':'')+
      compSrc(c.source)+'</figure>';
  }

  /* ---- DOCUMENT: show the filing, don't just link it ------------------------
     "The prospectus has no HBM line item" is an assertion. The prospectus text
     with the relevant line marked is proof. `lines` must be VERBATIM excerpt
     text the article already quotes -- never paraphrase inside this component,
     because its whole visual grammar claims to be a document. */
  function documentHTML(c){
    if(!c || !c.lines || !c.lines.length) return "";
    var lines=c.lines.map(function(l,i){
      var mark=l.mark?" is-mark":"";
      return '<div class="dc-line'+mark+'"><span class="dc-ln">'+(l.n!=null?esc(String(l.n)):(i+1))+'</span>'+
        '<span class="dc-t">'+fmt(l.text)+'</span></div>';
    }).join("");
    var head='<div class="dc-head"><span class="dc-ic">▣</span><div><b>'+esc(c.docTitle||"Source document")+'</b>'+
      (c.docMeta?'<span>'+esc(c.docMeta)+'</span>':'')+'</div>'+
      (c.url?'<a class="dc-go" href="'+safeHref(c.url)+'" target="_blank" rel="noopener">Open original ↗</a>':'')+'</div>';
    return '<figure class="comp comp-doc">'+
      compHead(c.kicker||"From the document itself",c.title,c.sub)+
      '<div class="dc-paper">'+head+'<div class="dc-body">'+lines+'</div></div>'+
      (c.reading?'<p class="dc-read"><b>What this line establishes:</b> '+fmt(c.reading)+'</p>':'')+
      compSrc(c.source)+'</figure>';
  }

  // inline data-viz — bar or donut, rendered from an article body block, zero cost, no images.
  // Categorical series colors come from the --s1..--s8 tokens in styles.css, which hold
  // SEPARATE validated steps for dark and light mode (the old single hex set failed the
  // colorblind-separation and normal-vision checks between its green and gold). The order
  // is fixed and never cycled: a chart's Nth series is always the same hue. Because these
  // are CSS vars they must be applied via style="", never as SVG presentation attributes
  // (fill="var(--x)" is silently invalid in an attribute).
  var CHART_COLORS=["var(--s1)","var(--s2)","var(--s3)","var(--s4)","var(--s5)","var(--s6)","var(--s7)","var(--s8)"];
  function chartHTML(c){
    if(!c || !c.data || !c.data.length) return "";
    var head='<figcaption class="chart-title">'+esc(c.title||"")+(c.unit?' <span>('+esc(c.unit)+')</span>':'')+'</figcaption>';
    var src=c.source?'<div class="chart-src">Source: '+esc(c.source)+'</div>':'';
    if(c.kind==="pie"||c.kind==="donut"){
      var total=c.data.reduce(function(n,d){return n+(d.value||0);},0)||1, acc=0, C=2*Math.PI*42;
      var segs=c.data.map(function(d,i){
        var frac=(d.value||0)/total, col=d.color||CHART_COLORS[i%CHART_COLORS.length];
        var dash=C*frac, gap=C-dash, off=-C*acc/1; acc+=frac;
        return '<circle r="42" cx="60" cy="60" fill="none" style="stroke:'+col+'" stroke-width="16" stroke-dasharray="'+dash+' '+gap+'" stroke-dashoffset="'+ (C*0.25 - C*(acc-frac)) +'" transform="rotate(-90 60 60)"></circle>';
      }).join("");
      var legend=c.data.map(function(d,i){
        var col=d.color||CHART_COLORS[i%CHART_COLORS.length];
        return '<li><span class="pl-sw" style="background:'+col+'"></span>'+esc(d.label)+' <b>'+esc(String(d.value))+(c.unit&&c.unit.indexOf("%")>=0?"%":"")+'</b></li>';
      }).join("");
      return '<figure class="chart chart-pie">'+head+'<div class="pie-wrap"><svg viewBox="0 0 120 120" width="150" height="150">'+segs+'</svg><ul class="pie-legend">'+legend+'</ul></div>'+src+'</figure>';
    }
    // LINE — a trend. Needs an ordered series; use this only for something that
    // genuinely moves over time, never for unordered categories.
    if(c.kind==="line"){
      var vals=c.data.map(function(d){ return Number(d.value)||0; });
      var lo=c.min!=null?c.min:Math.min.apply(null,vals);
      var hi=c.max!=null?c.max:Math.max.apply(null,vals);
      if(hi===lo) hi=lo+1;
      var W=520,H=170,PADL=6,PADR=6,PADT=12,PADB=10;
      var px=function(i){ return PADL+(vals.length<2?0:i*(W-PADL-PADR)/(vals.length-1)); };
      var py=function(v){ return PADT+(H-PADT-PADB)*(1-(v-lo)/(hi-lo)); };
      var pts=vals.map(function(v,i){ return px(i).toFixed(1)+","+py(v).toFixed(1); });
      var area='M'+pts.join(" L")+' L'+px(vals.length-1).toFixed(1)+','+(H-PADB)+' L'+px(0).toFixed(1)+','+(H-PADB)+' Z';
      var dots=vals.map(function(v,i){
        var d=c.data[i];
        return '<circle cx="'+px(i).toFixed(1)+'" cy="'+py(v).toFixed(1)+'" r="'+(d.hi?4.2:2.8)+'" '+
          'style="fill:'+(d.hi?"var(--accent2)":"var(--accent)")+'"><title>'+esc(d.label+": "+d.value)+'</title></circle>';
      }).join("");
      var xl=c.data.map(function(d,i){
        if(vals.length>7 && i%2===1 && i!==vals.length-1) return '<span></span>';
        return '<span>'+esc(d.label)+'</span>';
      }).join("");
      return '<figure class="chart chart-line">'+head+
        '<div class="ln-wrap"><div class="ln-ax"><span>'+esc(String(hi))+'</span><span>'+esc(String(lo))+'</span></div>'+
        '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" class="ln-svg">'+
        '<path class="ln-area" d="'+area+'" fill="url(#lnG)" opacity=".18"></path>'+
        '<defs><linearGradient id="lnG" x1="0" y1="0" x2="0" y2="1">'+
        '<stop offset="0%" style="stop-color:var(--accent)"/><stop offset="100%" style="stop-color:var(--accent);stop-opacity:0"/>'+
        '</linearGradient></defs>'+
        '<polyline points="'+pts.join(" ")+'" pathLength="1" fill="none" style="stroke:var(--accent)" stroke-width="2" '+
        'stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></polyline>'+
        dots+'</svg></div><div class="ln-xl">'+xl+'</div>'+src+'</figure>';
    }
    // STACKED — composition across a few subjects. Each datum carries `parts`.
    if(c.kind==="stacked"){
      var smax=c.data.reduce(function(m,d){
        return Math.max(m,(d.parts||[]).reduce(function(n,p){ return n+(Number(p.value)||0); },0));
      },0)||1;
      var skeys=[];
      c.data.forEach(function(d){ (d.parts||[]).forEach(function(p){ if(skeys.indexOf(p.label)<0) skeys.push(p.label); }); });
      var srows=c.data.map(function(d){
        var tot=(d.parts||[]).reduce(function(n,p){ return n+(Number(p.value)||0); },0);
        var segs=(d.parts||[]).map(function(p){
          var w=(Number(p.value)||0)/smax*100;
          var ci=skeys.indexOf(p.label);
          return '<i style="width:'+w.toFixed(2)+'%;background:'+safeColor(p.color,CHART_COLORS[ci%CHART_COLORS.length])+'">'+
            '<span class="sk-tip">'+esc(p.label+": "+p.value)+'</span></i>';
        }).join("");
        return '<div class="sk-row"><span class="sk-l">'+esc(d.label)+'</span>'+
          '<div class="sk-track">'+segs+'</div><span class="sk-t">'+esc(String(c.unit&&c.unit.charAt(0)==="$"?"$"+tot:tot))+'</span></div>';
      }).join("");
      var skl='<ul class="sk-legend">'+skeys.map(function(k,i){
        return '<li><span class="pl-sw" style="background:'+CHART_COLORS[i%CHART_COLORS.length]+'"></span>'+esc(k)+'</li>';
      }).join("")+'</ul>';
      return '<figure class="chart chart-stacked">'+head+'<div class="sks">'+srows+'</div>'+skl+src+'</figure>';
    }
    // RANGE — a spread rather than a point. For "estimates run from X to Y",
    // which is honest where a single bar would imply false precision.
    if(c.kind==="range"){
      var rlo=Math.min.apply(null,c.data.map(function(d){ return Number(d.low)||0; }));
      var rhi=Math.max.apply(null,c.data.map(function(d){ return Number(d.high)||0; }));
      if(rhi===rlo) rhi=rlo+1;
      var rrows=c.data.map(function(d){
        var a=((Number(d.low)||0)-rlo)/(rhi-rlo)*100, b=((Number(d.high)||0)-rlo)/(rhi-rlo)*100;
        var pt=d.point!=null?((Number(d.point)||0)-rlo)/(rhi-rlo)*100:null;
        return '<div class="rg-row'+(d.hi?" is-hi":"")+'"><span class="rg-l">'+esc(d.label)+'</span>'+
          '<div class="rg-track"><i style="left:'+a.toFixed(1)+'%;width:'+Math.max(1.5,b-a).toFixed(1)+'%"></i>'+
          (pt!=null?'<b class="rg-pt" style="left:'+pt.toFixed(1)+'%"></b>':'')+'</div>'+
          '<span class="rg-v">'+esc(String(d.low))+'–'+esc(String(d.high))+'</span></div>';
      }).join("");
      return '<figure class="chart chart-range">'+head+'<div class="rgs">'+rrows+'</div>'+src+'</figure>';
    }
    // WAFFLE — counts as squares. Reads better than a bar for small integers
    // ("3 of 11 signatories"), because the reader can literally count them.
    if(c.kind==="waffle"){
      var wtot=c.total||c.data.reduce(function(n,d){ return n+(Number(d.value)||0); },0)||1;
      var cells=[];
      c.data.forEach(function(d,i){
        var col=d.color||CHART_COLORS[i%CHART_COLORS.length];
        for(var k=0;k<(Number(d.value)||0);k++)
          cells.push('<i style="background:'+col+'" title="'+esc(d.label)+'"></i>');
      });
      while(cells.length<wtot) cells.push('<i class="wf-e"></i>');
      var wl='<ul class="sk-legend">'+c.data.map(function(d,i){
        return '<li><span class="pl-sw" style="background:'+safeColor(d.color,CHART_COLORS[i%CHART_COLORS.length])+'"></span>'+
          esc(d.label)+' <b>'+esc(String(d.value))+'</b></li>';
      }).join("")+'</ul>';
      return '<figure class="chart chart-waffle">'+head+'<div class="wf">'+cells.join("")+'</div>'+wl+src+'</figure>';
    }
    // default: horizontal bars
    var max=c.data.reduce(function(m,d){return Math.max(m,d.value||0);},0)||1;
    var bars=c.data.map(function(d,i){
      var w=Math.max(2,Math.round((d.value||0)/max*100)), col=d.color||(d.hi?CHART_COLORS[0]:"var(--muted)");
      var vlabel=(c.unit&&c.unit.charAt(0)==="$"?"$":"")+d.value+(c.unit&&c.unit.indexOf("%")>=0?"%":"");
      // A per-bar note goes on its own line under the bar, not inside the label
      // column -- the label column is narrow and right-aligned, so a sentence in
      // there wraps into an unreadable ragged block.
      return '<div class="cbrow'+(d.note?" has-note":"")+'">'+
        '<div class="cbar'+(d.hi?" is-hi":"")+'"><span class="cb-l">'+esc(d.label)+'</span>'+
        '<div class="cb-track"><i style="width:'+w+'%;background:'+(d.hi?"var(--accent)":"color-mix(in srgb,var(--accent) 55%,transparent)")+'"></i></div>'+
        '<span class="cb-v">'+esc(vlabel)+'</span></div>'+
        (d.note?'<div class="cb-note">'+esc(d.note)+'</div>':'')+'</div>';
    }).join("");
    return '<figure class="chart chart-bar">'+head+'<div class="cbars">'+bars+'</div>'+src+'</figure>';
  }
  /* Component dispatch — one place every new block type gets wired in, so the
     article view, the magazine renderer, and anything else that walks a body
     array stay in agreement about what a block type means. Returns "" for
     anything it does not recognize, which is what makes an unknown block type
     degrade silently instead of throwing. */
  /* ================= THE INSTRUCTION BLOCKS ==================================
     Four block types that exist because none of the other seventeen can express
     instruction. The seventeen are built to REPORT: compare puts subjects against
     attributes, flow shows a mechanism performed by third parties, counter states
     the strongest case against the piece. All of them terminate in understanding.
     A tutorial has to terminate in the reader having DONE something, which needs
     three things reporting never needs: an ordinal sequence the reader executes, a
     success criterion per step, and a recovery branch when the criterion fails.

     THE INVARIANT HOLDS. Every one of these carries its payload under its own
     nested key and never a top-level `text`, because wordCount() sums top-level
     .text to derive the published format tier and rtfcListen() speaks it. A
     snippet whose prompt template sat in `text` would silently promote a brief to
     a synthesis and then read a prompt aloud to a listener.

     BUT THE LISTEN PATH IS NOT OPTIONAL. The old `a.steps` field taught us this
     the hard way: it lived outside `body`, so Listen skipped every step and a
     guide's audio was 91 words of framing with the actual instructions missing.
     rtfcListen and the read-along now walk procedure steps explicitly. */

  function procedureHTML(d){
    if(!d||!d.steps||!d.steps.length) return "";
    var key=(d.key||slugify(d.title||"proc"));
    var steps=d.steps.map(function(s,i){
      var bits='<div class="pr-do">'+fmt(s.do||"")+'</div>';
      if(s.detail) bits+='<div class="pr-detail">'+fmt(s.detail)+'</div>';
      if(s.verify) bits+='<div class="pr-verify"><span class="pr-vk">You should see</span>'+fmt(s.verify)+'</div>';
      if(s.ifnot)  bits+='<div class="pr-ifnot"><span class="pr-ik">If not</span>'+fmt(s.ifnot)+'</div>';
      if(s.why)    bits+='<div class="pr-why">'+fmt(s.why)+'</div>';
      var tick=d.track!==false
        ? '<button class="pr-tick" role="checkbox" aria-checked="false" aria-label="Mark step '+(i+1)+' done" data-k="'+esc(key)+'" data-i="'+i+'"><span class="pr-n">'+(i+1)+'</span></button>'
        : '<span class="pr-tick pr-static"><span class="pr-n">'+(i+1)+'</span></span>';
      return '<li class="pr-step'+(s.hi?" is-hi":"")+'">'+tick+'<div class="pr-body">'+bits+
        (s.est?'<span class="pr-est">'+esc(s.est)+'</span>':'')+'</div></li>';
    }).join("");
    var meta=[];
    if(d.est)   meta.push('<span class="pr-m"><i>⏱</i>'+esc(d.est)+'</span>');
    if(d.level) meta.push('<span class="pr-m"><i>◈</i>'+esc(d.level)+'</span>');
    meta.push('<span class="pr-m"><i>≡</i>'+d.steps.length+' steps</span>');
    return '<div class="comp procedure'+(d.track!==false?" is-track":"")+'" data-proc="'+esc(key)+'">'+
      '<div class="pr-head"><span class="pr-k">'+esc(d.kicker||"Do it")+'</span>'+
      '<b>'+esc(d.title||"")+'</b>'+
      (d.sub?'<span class="pr-sub">'+fmt(d.sub)+'</span>':'')+
      '<span class="pr-meta">'+meta.join("")+'</span></div>'+
      (d.prereqs&&d.prereqs.length?'<div class="pr-pre"><span class="pr-pk">Before you start</span><ul>'+
        d.prereqs.map(function(x){return '<li>'+fmt(x)+'</li>';}).join("")+'</ul></div>':'')+
      '<ol class="pr-steps">'+steps+'</ol>'+
      (d.track!==false?'<div class="pr-foot"><span class="pr-prog" role="status" aria-live="polite" aria-atomic="true" data-k="'+esc(key)+'">0 of '+d.steps.length+' done</span>'+
        '<button class="pr-reset" data-k="'+esc(key)+'">Reset</button></div>':'')+
      (d.source?'<div class="c-src">'+fmt(d.source)+'</div>':'')+'</div>';
  }

  /* The copyable box. `body` is deliberately not called `text`: this is the one
     block a writer is most likely to get wrong, and getting it wrong is silent. */
  function snippetHTML(d){
    if(!d||!d.body) return "";
    var fills=(d.fill||[]).map(function(f){
      return '<li><code>'+esc(f.token)+'</code><span>'+fmt(f.means||"")+'</span>'+
        (f.example?'<em>e.g. '+esc(f.example)+'</em>':'')+'</li>';
    }).join("");
    // Tokens are highlighted after escaping, so a template can never inject markup.
    var code=esc(d.body).replace(/\{\{([A-Z0-9_]+)\}\}/g,'<mark class="sn-t">{{$1}}</mark>');
    return '<div class="comp snippet">'+
      '<div class="sn-head"><span class="sn-k">'+esc(d.kicker||"Copy this")+'</span>'+
      (d.title?'<b>'+esc(d.title)+'</b>':'')+
      '<span class="sn-lang">'+esc(d.lang||"prompt")+'</span>'+
      '<button class="sn-copy" type="button" aria-live="polite">Copy</button></div>'+
      '<pre class="sn-body"><code>'+code+'</code></pre>'+
      (fills?'<div class="sn-fill"><span class="sn-fk">Fill in</span><ul>'+fills+'</ul></div>':'')+
      (d.expects?'<div class="sn-exp"><span class="sn-ek">You should get</span>'+fmt(d.expects)+'</div>':'')+
      (d.note?'<div class="sn-note">'+fmt(d.note)+'</div>':'')+
      (d.source?'<div class="c-src">'+fmt(d.source)+'</div>':'')+'</div>';
  }

  /* The router. Every `then` must be an action, not a category: "use a bigger
     model" is a shrug, "upload it straight into a frontier chat model" is a
     instruction. The audit enforces the shape; only an editor enforces that. */
  function decideHTML(d){
    if(!d||!d.branches||!d.branches.length) return "";
    var rows=d.branches.map(function(b,i){
      return '<li class="dc-b'+(b.hi?" is-hi":"")+'">'+
        '<div class="dc-when"><span class="dc-wk">If</span>'+fmt(b.when||"")+'</div>'+
        '<div class="dc-then"><span class="dc-tk">Then</span><b>'+fmt(b.then||"")+'</b></div>'+
        (b.because?'<div class="dc-why">'+fmt(b.because)+'</div>':'')+
        (b.warn?'<div class="dc-warn">'+fmt(b.warn)+'</div>':'')+
        (b.next?'<div class="dc-next">'+fmt(b.next)+'</div>':'')+'</li>';
    }).join("");
    return '<div class="comp decide">'+
      '<div class="dc-head"><span class="dc-k">'+esc(d.kicker||"Which one")+'</span>'+
      '<b>'+esc(d.title||"")+'</b>'+
      (d.question?'<span class="dc-q">'+fmt(d.question)+'</span>':'')+'</div>'+
      '<ul class="dc-list">'+rows+'</ul>'+
      (d.source?'<div class="c-src">'+fmt(d.source)+'</div>':'')+'</div>';
  }

  /* Mistake -> symptom -> fix. Distinct from `counter`, which states the strongest
     case against the article's own thesis and is an editorial-integrity device.
     This is troubleshooting, and the symptom column is the load-bearing one: a
     reader who cannot recognise the failure cannot apply the fix. */
  function pitfallsHTML(d){
    if(!d||!d.items||!d.items.length) return "";
    var rows=d.items.map(function(it){
      return '<li class="pf-i cost-'+esc(it.cost||"medium")+'">'+
        '<div class="pf-m">'+fmt(it.mistake||"")+'</div>'+
        (it.looks?'<div class="pf-l"><span class="pf-lk">Looks like</span>'+fmt(it.looks)+'</div>':'')+
        (it.why?'<div class="pf-w">'+fmt(it.why)+'</div>':'')+
        '<div class="pf-f"><span class="pf-fk">Fix</span>'+fmt(it.fix||"")+'</div></li>';
    }).join("");
    return '<div class="comp pitfalls">'+
      '<div class="pf-head"><span class="pf-k">'+esc(d.kicker||"What goes wrong")+'</span>'+
      '<b>'+esc(d.title||"")+'</b></div>'+
      '<ul class="pf-list">'+rows+'</ul>'+
      (d.source?'<div class="c-src">'+fmt(d.source)+'</div>':'')+'</div>';
  }

  /* Progress ticks persist per procedure per article. localStorage only -- a
     half-finished tutorial is exactly the kind of thing that should not need an
     account, and exactly the kind of thing that should survive a closed tab. */
  function procStore(){
    try{ return JSON.parse(localStorage.getItem("rtfc-proc")||"{}"); }catch(e){ return {}; }
  }
  function procSave(o){ try{ localStorage.setItem("rtfc-proc",JSON.stringify(o)); }catch(e){} }
  /* ---------- MOBILE KIT · full screen + desktop mode -------------------------
     Two floating controls, bottom right, on touch devices only.

     DESKTOP MODE. A page cannot reach the browser's own "Request desktop site"
     setting -- that is chrome, not content. What it CAN do is rewrite its own
     viewport meta, which is what that setting does under the hood: pin the layout
     viewport to a fixed width so every desktop breakpoint matches, and let the
     browser fit it to the screen. Same result, and the reader can pinch to zoom
     because we drop the scale lock while it is on.

     THE TRAP: the obvious way to show these buttons is a max-width media query,
     and that is exactly wrong. The moment desktop mode engages, the layout
     viewport becomes 1200px, the query stops matching, the buttons vanish, and
     the reader is stranded in desktop mode with no way back. So visibility is
     decided ONCE at boot from the input device and the physical screen -- neither
     of which the override can change -- and written to a class on <html>.

     FULL SCREEN. iOS Safari does not implement the Fullscreen API on anything but
     <video>, so on iPhone the button is not rendered at all rather than rendered
     and dead. Everywhere else it toggles the whole document. */

  var VP_DESKTOP = "width=1200";
  var VP_MOBILE  = "width=device-width, initial-scale=1";

  function vpMeta(){ return document.querySelector('meta[name="viewport"]'); }
  function vpIsDesktop(){
    try{ return localStorage.getItem("rtfc-vp")==="desktop"; }catch(e){ return false; }
  }
  function vpApply(desktop){
    var m=vpMeta(); if(!m) return;
    m.setAttribute("content", desktop?VP_DESKTOP:VP_MOBILE);
    document.documentElement.classList.toggle("vp-desktop", !!desktop);
    try{ localStorage.setItem("rtfc-vp", desktop?"desktop":""); }catch(e){}
    // The app is CSS-driven, so the reflow is free, but a few things measure
    // themselves in JS (the nav rail, the reader's page stride, scroll reveals).
    // Tell them the world changed.
    try{ window.dispatchEvent(new Event("resize")); }catch(e){}
    if(window.__motion) window.__motion();
  }

  var ICON = {
    full:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H4.5A1.5 1.5 0 0 0 3 4.5V8M16 3h3.5A1.5 1.5 0 0 1 21 4.5V8M8 21H4.5A1.5 1.5 0 0 1 3 19.5V16M16 21h3.5a1.5 1.5 0 0 0 1.5-1.5V16"/></svg>',
    exit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h3.5A1.5 1.5 0 0 0 8 6.5V3M21 8h-3.5A1.5 1.5 0 0 1 16 6.5V3M3 16h3.5A1.5 1.5 0 0 1 8 17.5V21M21 16h-3.5a1.5 1.5 0 0 0-1.5 1.5V21"/></svg>',
    desk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4" width="19" height="12.5" rx="1.6"/><path d="M9 20.5h6M12 16.5v4"/></svg>',
    phone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.4"/><path d="M10.6 5.4h2.8"/><circle cx="12" cy="18.4" r=".9" fill="currentColor" stroke="none"/></svg>'
  };

  function fsOn(){
    return !!(document.fullscreenElement||document.webkitFullscreenElement);
  }
  function fsToggle(){
    var el=document.documentElement;
    if(fsOn()){
      (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document);
    } else {
      (el.requestFullscreen||el.webkitRequestFullscreen||function(){}).call(el);
    }
  }

  function initMobKit(){
    if(document.getElementById("mobkit")) return;
    // Decided once, from the input device and the PHYSICAL screen. Deliberately
    // not window.innerWidth, which desktop mode changes out from under us.
    var coarse=false;
    try{ coarse=window.matchMedia("(pointer: coarse)").matches; }catch(e){}
    var small=(window.screen&&window.screen.width?window.screen.width:window.innerWidth)<=900;
    if(!(coarse||small)) return;
    document.documentElement.classList.add("has-mobkit");

    var wrap=document.createElement("div");
    wrap.id="mobkit";
    wrap.setAttribute("role","group");
    wrap.setAttribute("aria-label","View controls");

    // Fullscreen: rendered only where the API actually exists. iOS Safari reports
    // false here, and a button that cannot do its job is worse than no button.
    var canFS = !!(document.fullscreenEnabled||document.webkitFullscreenEnabled);
    if(canFS){
      var bf=document.createElement("button");
      bf.type="button"; bf.className="mk-btn"; bf.id="mk-full";
      bf.innerHTML=ICON.full;
      bf.title="Full screen"; bf.setAttribute("aria-label","Enter full screen");
      bf.addEventListener("click",fsToggle);
      wrap.appendChild(bf);
    }

    var bd=document.createElement("button");
    bd.type="button"; bd.className="mk-btn"; bd.id="mk-vp";
    bd.addEventListener("click",function(){ vpApply(!vpIsDesktop()); paintVp(); });
    wrap.appendChild(bd);

    document.body.appendChild(wrap);

    function paintVp(){
      var d=vpIsDesktop();
      bd.innerHTML=d?ICON.phone:ICON.desk;
      bd.title=d?"Back to mobile view":"Desktop view";
      bd.setAttribute("aria-label",d?"Switch back to mobile view":"Switch to desktop view");
      bd.classList.toggle("on",d);
    }
    function paintFs(){
      if(!canFS) return;
      var f=fsOn();
      var b=document.getElementById("mk-full"); if(!b) return;
      b.innerHTML=f?ICON.exit:ICON.full;
      b.title=f?"Exit full screen":"Full screen";
      b.setAttribute("aria-label",f?"Exit full screen":"Enter full screen");
      b.classList.toggle("on",f);
    }
    document.addEventListener("fullscreenchange",paintFs);
    document.addEventListener("webkitfullscreenchange",paintFs);
    paintVp(); paintFs(); mkLift();

    // The bottom edge is shared with the consent bar and the mini-player, and
    // BOTH change height with content and viewport -- the consent bar wraps to
    // three lines on a 390px screen. A fixed offset guessed at that and lost:
    // the bar sat on top of these buttons and ate every tap. Measure instead.
    window.addEventListener("resize",mkLift);
    window.addEventListener("orientationchange",mkLift);
    try{
      new MutationObserver(mkLift).observe(document.body,
        {childList:true, subtree:true, attributes:true, attributeFilter:["hidden","style","class"]});
    }catch(e){}
  }

  function mkLift(){
    var kit=document.getElementById("mobkit"); if(!kit) return;
    var lift=14;
    function clears(el,gap){
      if(!el || el.hidden) return;
      // NOT offsetParent: it is null for EVERY position:fixed element, which is
      // exactly what both of these are, so that test disqualified the two bars it
      // was written to measure and the lift silently stayed at its default.
      var cs=getComputedStyle(el);
      if(cs.display==="none" || cs.visibility==="hidden" || parseFloat(cs.opacity||"1")===0) return;
      var r=el.getBoundingClientRect();
      // Only furniture actually pinned to the bottom edge competes for this space.
      if(r.height>0 && r.bottom>=window.innerHeight-2) lift=Math.max(lift, r.height+gap);
    }
    clears(document.getElementById("cookiebar"),12);
    clears(document.getElementById("miniplayer"),12);
    kit.style.bottom=lift+"px";
  }

  function initProcedures(){
    document.querySelectorAll(".procedure.is-track").forEach(function(box){
      if(box.__proc) return; box.__proc=1;
      var key=box.getAttribute("data-proc"), st=procStore(), done=st[key]||{};
      var ticks=box.querySelectorAll(".pr-tick"), prog=box.querySelector(".pr-prog");
      function paint(){
        var n=0;
        ticks.forEach(function(t){
          var on=!!done[t.getAttribute("data-i")];
          t.setAttribute("aria-checked",on?"true":"false");
          t.closest(".pr-step").classList.toggle("is-done",on);
          if(on) n++;
        });
        if(prog) prog.textContent=n+" of "+ticks.length+" done"+(n===ticks.length?" ✓":"");
        box.classList.toggle("all-done",n===ticks.length&&n>0);
      }
      ticks.forEach(function(t){
        t.addEventListener("click",function(){
          var i=t.getAttribute("data-i");
          done[i]=!done[i]; if(!done[i]) delete done[i];
          var all=procStore(); all[key]=done; procSave(all); paint();
        });
      });
      var rs=box.querySelector(".pr-reset");
      if(rs) rs.addEventListener("click",function(){
        done={}; var all=procStore(); delete all[key]; procSave(all); paint();
      });
      paint();
    });
    document.querySelectorAll(".sn-copy").forEach(function(btn){
      if(btn.__cp) return; btn.__cp=1;
      btn.addEventListener("click",function(){
        var pre=btn.closest(".snippet").querySelector(".sn-body code");
        var txt=pre?pre.textContent:"";
        function ok(){ btn.textContent="Copied ✓"; setTimeout(function(){ btn.textContent="Copy"; },1800); }
        if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok,function(){ window.prompt("Copy:",txt); });
        else window.prompt("Copy:",txt);
      });
    });
  }

  /* SPOKEN INSTRUCTION. The old `a.steps` field lived outside `body`, so Listen
     read a guide's framing prose and silently skipped every actual instruction --
     a 91-word audio track for a piece whose whole value was the six steps. These
     blocks are inside `body`, so they get spoken. Anything that returns a
     non-empty string here MUST also take a read-along segment in viewArticle, or
     the highlight desyncs from the audio one block early and never recovers. */
  function spokenComponent(b){
    if(!b) return "";
    if(b.type==="procedure"){
      var d=b.procedure||b; if(!d.steps||!d.steps.length) return "";
      return [(d.title||"Procedure")+"."].concat(d.steps.map(function(st,i){
        return "Step "+(i+1)+". "+(st.do||"")+(st.verify?(" You should see: "+st.verify):"");
      })).join(" ");
    }
    if(b.type==="decide"){
      var e=b.decide||b; if(!e.branches||!e.branches.length) return "";
      return [(e.title||"Which one")+"."].concat(e.branches.map(function(br){
        return "If "+(br.when||"")+", then "+(br.then||"")+".";
      })).join(" ");
    }
    if(b.type==="pitfalls"){
      var f=b.pitfalls||b; if(!f.items||!f.items.length) return "";
      return [(f.title||"What goes wrong")+"."].concat(f.items.map(function(it){
        return (it.mistake||"")+". Fix: "+(it.fix||"");
      })).join(" ");
    }
    // `snippet` is deliberately silent: reading a prompt template aloud, braces
    // and all, is noise. Its framing lives in the paragraph beside it.
    return "";
  }

  function componentHTML(b){
    switch(b.type){
      case "chart":       return chartHTML(b.chart||b);
      case "compare":     return compareHTML(b.compare||b);
      case "timeline":    return timelineHTML(b.timeline||b);
      case "entity":      return entityHTML(b.entity||b);
      case "scorecard":   return scorecardHTML(b.scorecard||b);
      case "ledger":      return ledgerHTML(b.ledger||b);
      case "beforeafter": return beforeAfterHTML(b.beforeafter||b);
      case "spectrum":    return spectrumHTML(b.spectrum||b);
      case "flow":        return flowHTML(b.flow||b);
      case "keyfacts":    return keyfactsHTML(b.keyfacts||b);
      case "stakes":      return stakesHTML(b.stakes||b);
      case "sourcecheck": return sourcecheckHTML(b.sourcecheck||b);
      case "model":       return modelHTML(b.model||b);
      case "rank":        return rankHTML(b.rank||b);
      case "counter":     return counterHTML(b.counter||b);
      case "document":    return documentHTML(b.document||b);
      case "procedure":   return procedureHTML(b.procedure||b);
      case "snippet":     return snippetHTML(b.snippet||b);
      case "decide":      return decideHTML(b.decide||b);
      case "pitfalls":    return pitfallsHTML(b.pitfalls||b);
      case "stat":        return '<div class="statcallout"><b>'+esc(b.value)+'</b><span>'+fmt(b.label||"")+'</span></div>';
      default:            return "";
    }
  }
  var COMPONENT_TYPES=["chart","compare","timeline","entity","scorecard","ledger",
    "beforeafter","spectrum","flow","keyfacts","stakes","sourcecheck","stat",
    "model","rank","counter","document",
    // instruction blocks -- see THE INSTRUCTION BLOCKS above
    "procedure","snippet","decide","pitfalls"];
  function isComponent(b){ return b && COMPONENT_TYPES.indexOf(b.type)>=0; }
  /* THE EVIDENCE STRIP — derived, not written. Counts what is actually attached
     to the article (sources, distinct domains, in-body citations, components) and
     states it plainly under the dateline. Costs nothing per article and cannot
     drift from reality, because it is computed from the article itself rather
     than asserted by the writer. */
  function evidenceStripHTML(a){
    if(!a || !a.sources || !a.sources.length) return "";
    var doms={}, n=0;
    a.sources.forEach(function(s){
      var d=String(s.url||"").replace(/^https?:\/\//,"").split("/")[0].replace(/^www\./,"");
      if(d){ doms[d]=1; n++; }
    });
    var domCount=Object.keys(doms).length;
    // Numerator and denominator must count the SAME thing. `cited` used to count
    // every block carrying citation_urls (quotes, h2s, components) while `paras`
    // counted only type==="p" — which printed "125% of paragraphs carry a citation"
    // on a live article. Both are paragraphs now, so the ratio is bounded by 100%.
    var comps=(a.body||[]).filter(isComponent).length;
    var pblocks=(a.body||[]).filter(function(b){ return b.type==="p"; });
    var paras=pblocks.length;
    var cited=pblocks.filter(function(b){ return b.citation_urls && b.citation_urls.length; }).length;
    var pct=paras?Math.round(cited/paras*100):0;
    var bits=[];
    bits.push('<span><b>'+n+'</b> sources</span>');
    bits.push('<span><b>'+domCount+'</b> distinct outlets</span>');
    if(paras) bits.push('<span><b>'+pct+'%</b> of paragraphs carry a citation</span>');
    if(comps) bits.push('<span><b>'+comps+'</b> data element'+(comps===1?'':'s')+'</span>');
    return '<div class="evstrip" title="Derived from this article’s own attached sources and body — not a claim, a count.">'+
      '<span class="ev-k">Evidence</span>'+bits.join("")+'</div>';
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
    // Per-article first-mention set for the entity layer. Fresh per render so a
    // reader who opens two articles gets the provenance chip in both.
    var entSeen={};
    var bodyHTML=a.body.map(function(b){
      if(b.type==="h2"){ raSeg++; var id="s-"+slugify(b.text); toc.push({id:id,t:b.text}); return '<h2 id="'+id+'" data-ra="'+raSeg+'">'+esc(b.text)+'</h2>'; }
      if(b.type==="quote"){ raSeg++; return '<blockquote data-ra="'+raSeg+'">'+fmt(b.text)+'</blockquote>'; }
      if(isComponent(b)){
        var html=componentHTML(b);
        // Mirror rtfcListen exactly: a component that gets spoken takes a segment.
        if(spokenComponent(b)){ raSeg++; html=html.replace(/^<div class="comp /, '<div data-ra="'+raSeg+'" class="comp '); }
        return html;
      }
      raSeg++;
      var cls=[]; if(b===lastP) cls.push("endmark"); if(firstP){ cls.push("lead-p"); firstP=false; }
      // EVIDENCE ON DEMAND: 93% of published paragraphs already carry
      // citation_urls, and none of it was ever rendered. Surface it as a marker
      // that opens the exact sources backing THAT paragraph. No other outlet
      // offers per-paragraph provenance because no human writer wants their
      // sourcing this exposed; the work is already done here, so withholding it
      // was the only thing making it invisible.
      var ev=evidenceMarkHTML(b,a);
      if(ev) cls.push("has-ev");
      return '<p data-ra="'+raSeg+'"'+(cls.length?' class="'+cls.join(" ")+'"':'')+'>'+
        entAnnotate(fmtBody(b.text),entSeen)+ev+'</p>';
    }).join("");
    var applySeg=(a.apply&&a.apply.length)?(raSeg+1):-1;
    var tocHTML=(toc.length>=3)?('<nav class="toc"><span class="toc-l">In this piece</span><ol>'+
      toc.map(function(x,i){return '<li><a href="#/article/'+slug+'/'+x.id+'"><span>'+String(i+1).padStart(2,"0")+'</span>'+esc(x.t)+'</a></li>';}).join("")+'</ol></nav>'):'';
    var disc="";
    if(a.disclaimer==="not-medical-advice") disc='<div class="disclaimer med"><b>This is not medical advice.</b>For information only. Consult a qualified professional. Diagnostic or treatment-adjacent claims are adjudicated by the AI Editor-in-Chief recommendation layer before publication.</div>';
    if(a.disclaimer==="not-financial-advice") disc='<div class="disclaimer fin"><b>This is not financial or investment advice.</b>For information only. RTFCLMGZN does not make trading recommendations.</div>';
    var srcs='<div class="sources"><h4>Sources</h4><ol>'+a.sources.map(function(s){
      var ext=s.url && s.url!=="#";
      return '<li><a href="'+safeHref(s.url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+esc(s.label)+'</a>'+(ext?' ↗':'')+'</li>';}).join("")+'</ol></div>';
    var corr='<div class="corrections"><h4>Corrections &amp; updates</h4>'+
      (a.corrections.length? a.corrections.map(function(c){
        return '<div class="cx"><time>'+new Date(c.at).toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})+'</time>'+esc(c.text)+'</div>';
      }).join("") : '<div class="cx none">No corrections. This piece is unchanged since publication.</div>')+'</div>';
    return '<div class="container"><article class="article">'+
      '<a class="back" href="#/">← Home</a>'+
      '<div style="margin:20px 0 6px">'+tagsHTML(a)+'</div>'+
      '<h1 data-ra="0">'+esc(a.title)+'</h1><p class="dek" data-ra="0">'+esc(a.dek)+'</p>'+
      '<div class="dateline"><span class="dl-sec" style="color:'+col+'">'+esc(a.section)+'</span> · '+when(a.publishedAt)+' · '+readTime(a)+' min read'+saveBtns(a.id,true)+'</div>'+
      evidenceStripHTML(a)+
      articleToolsHTML(a)+
      '<div class="hero" style="'+artFill(a,true)+'">'+artGlyph(a,col)+'</div>'+
      tocHTML+
      '<div class="prose">'+bodyHTML+'</div>'+ (a.steps?guideStepsHTML(a):"") + tldrHTML(a) +
      (applySeg>=0?'<div data-ra="'+applySeg+'" class="ra-wrap">'+applyHTML(a)+'</div>':applyHTML(a))+
      updatesHTML(a)+
      linksHTML(a)+
      reactsHTML(a.id)+
      '<div class="endbyline">'+avatar(p)+'<div class="eb-who">'+((a.authors&&a.authors.length>1)?'A research collaboration by ':'Written by ')+'<b><a href="#/persona/'+p.key+'">'+esc(authorNames(a,p.name))+'</a></b><span>'+esc((a.authors&&a.authors.length>1)?"Cross-desk investigation":p.beat)+'</span><time class="eb-time">Filed '+fullTimestamp(a.publishedAt)+'</time></div></div>'+
      '<div class="ai-disclosure"><span class="ic">🤖</span><div><b>Researched, drafted, fact-checked, and edited end-to-end by RTFCLMGZN’s AI editorial system</b>, in the established voice of '+esc(p.name)+'. Facts are cross-checked against primary sources; legal- and safety-sensitive claims are adjudicated autonomously by an AI Editor-in-Chief that sources, reframes, or disclaims them before publication. Fully autonomous — no human in the publishing loop.</div></div>'+
      costFooterHTML(a)+
      provenanceHTML(a)+
      /* distribution drafts are internal pipeline handover data — not rendered for readers (2026-08-10) */
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
    /* A window with no records is not "$0.00 spent". It is "nothing was logged".
       Printing a zero there reads as a measurement, and for three days in August it
       read as a very cheap newsroom rather than a newsroom that had stopped. */
    if(!s.count){
      return '<div class="ucard"><div class="ulabel">'+label+'</div>'+
        '<div class="ucost" style="color:var(--muted)">&mdash;</div>'+
        '<div class="usub">nothing logged</div></div>';
    }
    /* Tasks ran, but none of them carried a token count. Monitoring scans are the usual
       case: they are text-only, cost effectively nothing, and log "estimated" with no
       figures. Printing $0.00 for that is worse than useless, because it looks like a
       measured zero rather than an unmeasured one. */
    if(!s.tokens && !s.cost){
      return '<div class="ucard"><div class="ulabel">'+label+'</div>'+
        '<div class="ucost" style="color:var(--muted)">&mdash;</div>'+
        '<div class="usub">'+s.count+' task'+(s.count===1?'':'s')+' logged, none metered</div>'+
        '<div class="unote">monitoring scans carry no token figures</div></div>';
    }
    return '<div class="ucard"><div class="ulabel">'+label+'</div>'+
      '<div class="ucost">'+money(s.cost)+'</div>'+
      '<div class="usub">'+num(s.tokens)+' tokens · '+s.count+' task'+(s.count===1?'':'s')+'</div>'+
      (note?'<div class="unote">'+note+'</div>':(s.articleCount?'<div class="unote">'+s.articleCount+(s.articleCount===1?' article':' articles')+' · avg '+money(perArt)+'</div>':''))+'</div>';
  }
  function barRow(label,val,max,detail){
    var pct=max>0?Math.max(2,Math.round(val/max*100)):0;
    return '<div class="ubar"><div class="ubar-l">'+label+'</div><div class="ubar-t"><div class="ubar-f" style="width:'+pct+'%"></div></div><div class="ubar-v">'+detail+'</div></div>';
  }
  /* PROVIDER + TASK GROUPING (added 2026-08-10) ----------------------------------
     The page used to show 11 raw model ids and 27 raw task_type strings, which is a
     dump of internal vocabulary rather than an answer to "where does the money go".
     Two groupings fix that, and one exclusion:

       provider  - the reader (and the owner) wants Claude vs image generation, not a
                   model-by-model list. Both are still available underneath.
       taskGroup - 27 task_type strings collapse to six buckets a human can hold.
       RETIRED   - an early one-off trial on a third-party API. It is not how this
                   publication runs, and leaving it in the model chart made the chart
                   about a thing that happened once. It is excluded from every figure
                   on this page AND its size is printed, because silently dropping
                   spend from a cost page is the exact failure this page exists to
                   avoid. Exclude loudly or not at all. */
  function provider(m){
    m=String(m||"");
    if(m.indexOf("claude")===0) return "claude";
    if(m.indexOf("gemini")===0) return "image";
    return "retired";
  }
  var PROVIDER_LABEL={claude:"Claude — all writing, research and editing",
                      image:"Gemini — illustration and covers",
                      retired:"Third-party API (one-off, retired)"};
  var TASK_GROUPS=[
    ["Writing & editing",       ["writing","copyedit","curation","assignment","publishing","publish","social","style"]],
    ["Research & verification", ["research","factcheck","verification","discovery","adjudication","compliance","quality","policy","benchmark-scan"]],
    ["Illustration",            ["image","image-generation","image-policy","image-remediation","image-rendering","image-recovery"]],
    ["Magazine production",     ["magazine"]],
    ["Site upkeep",             ["site","buzz-refresh","observability"]],
    ["Monitoring (scans)",      ["no-op"]]
  ];
  function taskGroup(t){
    t=String(t||"");
    for(var i=0;i<TASK_GROUPS.length;i++) if(TASK_GROUPS[i][1].indexOf(t)>=0) return TASK_GROUPS[i][0];
    return "Other";
  }
  function viewUsage(){
    var now=new Date();
    var RETIRED=USAGE.filter(function(r){return provider(r.model)==="retired";});
    var LIVE=USAGE.filter(function(r){return provider(r.model)!=="retired";});
    var retiredS=sumRecs(RETIRED);
    var today=LIVE.filter(function(r){return sameDay(r.ts,now);});
    var d7=LIVE.filter(function(r){return withinDays(r.ts,now,7);});
    var d30=LIVE.filter(function(r){return withinDays(r.ts,now,30);});
    var all=LIVE.slice();
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

    /* ---- COVERAGE ----------------------------------------------------------
       Added 2026-08-10. A cost page that only ever shows a total is unfalsifiable:
       a newsroom that stopped running and a newsroom that ran and spent nothing
       render identically. Between 2026-08-07 and 2026-08-10 the OAuth token was
       revoked, every job failed on its first API call, and this page went on
       displaying the same all-time figure as though nothing had changed. So the
       page now states, above the fold, when it last heard from anything -- and
       says plainly when that was too long ago. Silence is a finding; print it. */
    var newestTs=all.reduce(function(m,r){ return (!m||new Date(r.ts)>new Date(m))?r.ts:m; },null);
    var staleH=newestTs?(now-new Date(newestTs))/3600000:1e9;
    h+='<div class="ucover" style="margin:18px 0 4px;padding:14px 16px;border:1px solid '+
      (staleH>24?'var(--bad,#c0392b)':'var(--line)')+';border-radius:12px;background:var(--surface2)">';
    if(!newestTs){
      h+='<b>Nothing has ever been logged.</b> This page has no data to show.';
    } else {
      h+='<div style="display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline">'+
         '<b>Last logged activity</b><span>'+relTime(newestTs)+'</span>'+
         '<span style="color:var(--muted)">'+esc(String(newestTs).replace("T"," ").replace("Z"," UTC"))+'</span></div>';
      if(staleH>24){
        h+='<p style="margin:8px 0 0;color:var(--bad,#c0392b)"><b>This log is '+
           Math.round(staleH/24)+' days stale.</b> The newsroom runs several times a day and every '+
           'run is required to log a row, including a run that changes nothing. A gap this long means '+
           'the jobs are failing or are not reporting — the figures below are a floor, not a total.</p>';
      }
    }
    h+='</div>';


    // cost per article headline
    var perArt=allS.articleCount?allS.cost/allS.articleCount:0;
    h+='<div class="uhero-metric"><div><span class="big">'+money(perArt)+'</span><span class="cap">average compute cost per article (end-to-end, all pipeline stages)</span></div>'+
       '<div><span class="big">'+num(Math.round(allS.articleCount?allS.tokens/allS.articleCount:0))+'</span><span class="cap">average tokens per article</span></div></div>';

    // WHERE THE MONEY GOES — provider first, model detail second
    var byProv=groupBy(all,function(r){return provider(r.model);});
    var provRows=["claude","image"].filter(function(k){return byProv[k];})
      .map(function(k){return {k:k,s:sumRecs(byProv[k])};});
    var maxProv=provRows.reduce(function(m,r){return Math.max(m,r.s.cost);},0);
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Where the money goes</div><div class="ubars">';
    h+=provRows.map(function(r){
      var det=r.k==="image" ? (money(r.s.cost)+' · '+r.s.count+' image task'+(r.s.count===1?'':'s'))
                            : (money(r.s.cost)+' · '+num(r.s.tokens)+' tok');
      return barRow(PROVIDER_LABEL[r.k],r.s.cost,maxProv,det);
    }).join("");
    h+='</div>';
    if(retiredS.count){
      h+='<p class="small" style="margin:-2px 0 16px;color:var(--muted);font-size:13.5px">'+
         'Excluded from every figure on this page: '+retiredS.count+' task'+(retiredS.count===1?'':'s')+
         ' worth '+money(retiredS.cost)+' run once on a third-party API in July, while the newsroom was '+
         'being built. It is not how the publication runs. It is named here rather than deleted, because '+
         'quietly dropping spend from a cost page is the failure this page exists to prevent.</p>';
    }

    // by model (within the two live providers)
    var byModel=groupBy(all,function(r){return r.model;});
    var modelRows=Object.keys(byModel).map(function(k){return {k:k,s:sumRecs(byModel[k])};}).sort(function(a,b){return b.s.cost-a.s.cost;});
    var maxModel=modelRows.reduce(function(m,r){return Math.max(m,r.s.cost);},0);
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>The same total, by model</div><div class="ubars">';
    h+=modelRows.map(function(r){
      var cfg=modelCfg(r.k), lbl=(cfg&&cfg.label)||r.k;
      /* An image model has no tokens. Printing "0 tok" beside it reads as a bug or a
         zero-cost model; it is neither, it is the wrong unit. */
      var det=(cfg&&cfg.per_image) ? (money(r.s.cost)+' · '+r.s.count+' image task'+(r.s.count===1?'':'s'))
                                   : (money(r.s.cost)+' · '+num(r.s.tokens)+' tok');
      return barRow(lbl,r.s.cost,maxModel,det);
    }).join("");
    h+='</div>';

    // by kind of work — 27 internal task_type strings collapsed to six readable buckets
    var byTask=groupBy(all,function(r){return taskGroup(r.task_type);});
    var taskRows=Object.keys(byTask).map(function(k){return {k:k,s:sumRecs(byTask[k])};}).sort(function(a,b){return b.s.cost-a.s.cost;});
    var maxTask=taskRows.reduce(function(m,r){return Math.max(m,r.s.cost);},0);
    h+='<div class="kicker"><span class="dotc" style="background:var(--ok)"></span>By kind of work</div><div class="ubars">';
    h+=taskRows.map(function(r){
      return barRow(r.k,r.s.cost,maxTask,money(r.s.cost)+' · '+r.s.count+' task'+(r.s.count===1?'':'s'));
    }).join("");
    h+='</div>';

    /* ---- BY AGENT ----------------------------------------------------------
       This section is the reason the gap above was invisible for so long. Until
       2026-08-10 the breaking scan was the ONLY job whose runbook told it to log,
       so 53 of 90 rows came from the cheapest, mostly-no-op job while the thrice-
       daily cycle that writes the articles -- by far the largest spend -- appeared
       nowhere. Cost by model and by task type both hid that, because they slice the
       rows that exist rather than showing which jobs are reporting at all. Breaking
       the same total down by agent makes an under-reporting job obvious on sight. */
    var byAgent=groupBy(all,function(r){return r.agent||"unattributed";});
    var agentRows=Object.keys(byAgent).map(function(k){return {k:k,s:sumRecs(byAgent[k]),n:byAgent[k].length};})
                        .sort(function(a,b){return b.n-a.n;});
    var maxAgentN=agentRows.reduce(function(m,r){return Math.max(m,r.n);},0);
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Who reported it</div><div class="ubars">';
    h+=agentRows.map(function(r){
      return barRow(r.k, r.n, maxAgentN, r.n+' run'+(r.n===1?'':'s')+' · '+money(r.s.cost));
    }).join("");
    h+='</div><p style="margin:-2px 0 18px;color:var(--muted);font-size:14px">'+
       'Rows, not dollars — this bar measures how much each job has told us, which is not the same as '+
       'how much each job costs. A job you know runs often but that sits near the bottom here is '+
       'under-reporting, and every figure on this page is short by whatever it did not say.</p>';

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
    var covered=artRows.length, published=ARTICLES.length;
    h+='<p class="small" style="margin:8px 0 18px;color:var(--muted);font-size:13.5px">'+
       '<b style="color:var(--ink)">'+covered+' of '+published+' published articles</b> have a cost record. '+
       'The gap is not spend that vanished: it is work done before per-article logging existed, or by a '+
       'job whose runbook did not tell it to log. Both are fixed going forward, and neither can be '+
       'reconstructed, because the token counts were never written down.</p>';

    // export + methodology
    h+='<div class="uexport"><button onclick="window.rtfcExport(\'csv\')">Export CSV</button>'+
       '<button onclick="window.rtfcExport(\'json\')">Export JSON</button></div>';
    h+='<div class="umethod"><h4>How these numbers are produced</h4><ul>'+
      '<li><b>Zero measurement overhead.</b> Token counts come from each task’s own record; the dashboard math above is plain arithmetic in your browser — no AI model is ever called to compute or summarize these figures.</li>'+
      '<li><b>Metered vs. estimated.</b> '+(100-estShare)+'% of logged tasks are metered (exact token counts); '+estShare+'% are estimated (e.g. the retrofitted first article, produced before tracking existed). Estimated records are marked in the log.</li>'+
      '<li><b>An empty day is not a cheap day.</b> Where a period shows a dash instead of a figure, nothing was logged in it. That is a statement about the record, not about the spending, and the banner at the top of this page says how long it has been true.</li>'+
      '<li><b>API-equivalent, not a subscription bill.</b> On a Claude Pro/Max subscription you pay a flat fee against usage limits, not per token. These dollar figures show what the work would cost at pay-as-you-go API rates — a stable yardstick, and the exact number for comparing pay-as-you-go against a subscription.</li>'+
      '<li><b>Rates.</b> From <code>cost-config.js</code>, last verified '+(COST.last_verified||'—')+'. Sonnet is on introductory pricing through 2026-08-31 (rises ~50% after).</li>'+
      '<li><b>A known gap, not corrected retroactively.</b> Until 2026-08-10, only the hourly breaking scan was instructed to log. The three-times-daily newsroom cycle and the pulse scan wrote nothing, so every total on this page covering work before that date <b>understates the real spend</b>, and the split by task and model is weighted toward the cheapest job. The missing token counts were never recorded anywhere, so they cannot be recovered — and inventing them to make this page look complete would be a worse failure than the gap. Both runbooks now require a row every run, including a run that changes nothing.</li>'+
      '</ul></div>';
    return h+'</div>';
  }

  /* ================= MAGAZINE ================= */
  function monthLabel(ym){
    var p=ym.split("-"); var d=new Date(+p[0], +p[1]-1, 1);
    return d.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  }
  function issueById(id){ for(var i=0;i<MAG.length;i++) if(MAG[i].id===id) return MAG[i]; return null; }
  /* THE page count for an issue, and the only one. viewSpread renders a centerfold
     or a verticalfold as TWO physical pages, so spreads.length is not the number of
     pages a reader turns — the storefront cover chip and the Plus panel were both
     quoting a number the reader could disprove by opening the issue. A paywalled
     stub carries no spreads array at all, so `spreadCount` (metadata) is honoured
     as the server-supplied fallback. */
  // Where an issue is READ. Spread-format issues (every issue since July 2026) open
  // in the spread reader; the legacy page-card reader is kept for any pages[] issue.
  function issueHref(iss){
    if(!iss) return "#/magazine";
    return (iss.format==="spread" || !(iss.pages&&iss.pages.length)) ? ("#/read/"+iss.id) : ("#/issue/"+iss.id);
  }
  function issuePageCount(iss){
    if(!iss) return 0;
    if(iss.spreads && iss.spreads.length){
      return iss.spreads.reduce(function(n,pg){
        return n+((pg.kind==="centerfold"||pg.kind==="verticalfold")?2:1);
      },0);
    }
    if(iss.pages && iss.pages.length) return iss.pages.length;
    return iss.spreadCount||0;
  }
  // UI hint, not a gate. Paid pages are not in the bundle at all -- the server holds
  // them (see issueLoad below), so this only decides which offer the storefront draws.
  // Requires a CONFIRMED session: an unverified or forged local plan reads as free.
  function isPlus(){ var l=libGet(); return !!(ACCOUNT_VERIFIED && l.account && l.account.plan==="plus"); }
  function issueCoverHTML(iss,link){
    var hasImg=iss.cover&&iss.cover.image;
    var bg=hasImg? "background:linear-gradient(180deg,rgba(5,5,10,.18) 0%,rgba(5,5,10,.05) 35%,rgba(5,5,10,.6) 100%),url('"+safeCssUrl(iss.cover.image)+"') center/cover no-repeat;"
                 : artStyle("AI",true);
    var inner='<div class="mag-cover'+(hasImg?' has-img':'')+'" style="'+bg+'">'+
      '<div class="mc-mast">RTFCL<em>MGZN</em></div>'+
      '<div class="mc-issue">Issue '+String(iss.number).padStart(3,"0")+' · '+monthLabel(iss.month)+(iss.special?' · Special':'')+(iss.access==="free"?' · <b class="mc-free">FREE</b>':'')+'</div>'+
      '<div class="mc-title">'+esc(iss.title)+'</div>'+
      '<div class="mc-tag">'+esc(iss.tagline)+'</div>'+
      (function(){ // Was "cover art: generated" -- an internal production status, printed
                   // on the paywall. Replaced with the spec a buyer actually wants.
        var n=issuePageCount(iss);
        return '<div class="mc-art">'+n+' page'+(n===1?'':'s')+' · '+
          (iss.access==="free"?"Free for everyone":"Plus")+(iss.month?(' · '+esc(iss.month)):"")+'</div>';
      })()+
      // Specular sweep, same grammar as .card .art::after. Pure decoration, so it
      // is aria-hidden and carries no text.
      '<span class="mc-sheen" aria-hidden="true"></span>'+
      '</div>';
    var href=issueHref(iss);
    // .mag-vol is the element that rotates: .mag-cover has overflow:hidden, which
    // flattens preserve-3d, so the page-block and spine live on the wrapper.
    var vol='<span class="mag-vol" data-iss="'+esc(iss.id)+'">'+inner+'</span>';
    return link?('<a class="mag-link" href="'+href+'">'+vol+'</a>'):vol;
  }
  function viewMagazine(){
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:10px">'+
      '<div class="over">The Magazine</div>'+
      '<h1>The month in AI,<br>understood with hindsight.</h1>'+
      '<p>Every month, the Issue Desk distills the full run of our coverage into one premium issue — the cover story with the benefit of hindsight, all seven editors’ month-in-review columns, the Scoreboard, the applied-takeaways Compendium, and a Watchlist we grade in public the following month. Articles are free, forever. The magazine is for subscribers — and subscribers get every back issue too.</p></div>';
    // Product first, offer second. The old order put a paywall bar between the
    // promise and the thing being sold, which pushed the covers a full screen
    // below the fold -- a storefront where you cannot see the goods without
    // scrolling past the price.
    h+='<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>Issues</div>';
    h+='<div class="mag-grid">'+MAG.map(function(iss,i){
      return '<div class="mag-cell'+(i===0?' is-lead':'')+'">'+issueCoverHTML(iss,true)+
        (iss.pdf?'<a class="mag-dl" href="'+safeHref(iss.pdf)+'" download="'+esc(pdfName(iss))+'">⤓ Download PDF</a>':'')+'</div>';
    }).join("")+'</div>';
    if(!isPlus()){
      // The offer panel. The old version was one grey bar plus two faint
      // "prototype" paragraphs -- the loudest supporting copy on the page was an
      // apology for the thing it was trying to sell. Now: the three real plans,
      // what is in it, what free already gets you, and the caveat reduced to one
      // line of fine print under the buttons where fine print belongs.
      var pages=MAG.reduce(function(n,x){ return n+issuePageCount(x); },0);
      // Cost-per-issue is quoted against the ANNUAL price, because annual is the
      // offer being recommended — and it is derived from the same numbers the
      // pricing block prints, so the two can never quote different money.
      var yearly=billAmt(billingState(),"annual")/100;
      var perIssue=yearly/Math.max(1,MAG.length);
      h+='<div class="plusbar has-plans">'+
        '<div class="pb-offer">'+
          '<div class="pb-mark">RTFCLMGZN <b>Plus</b></div>'+
          '<div class="pb-per">'+MAG.length+' issue'+(MAG.length===1?'':'s')+' published · '+pages+' designed pages · about $'+perIssue.toFixed(2)+' an issue on the annual plan today, less every month</div>'+
          plusPricingHTML({dek:false})+
        '</div>'+
        '<div class="pb-cols">'+
          '<div class="pb-col"><span class="pb-ct">Always free</span><ul>'+
            '<li>Every article, every day, forever</li>'+
            '<li>The Primer — the complete beginner’s guide, free founding special</li>'+
            '<li>Guides, Dictionary, Scoreboard, the Buzz</li>'+
            '<li>Sources and costs attached to everything</li>'+
          '</ul></div>'+
          '<div class="pb-col pb-plus"><span class="pb-ct">Plus <b class="pb-dia">◈</b></span><ul>'+
            '<li>The monthly issue, in the spread reader</li>'+
            '<li>Special editions as they ship</li>'+
            '<li>The full back-issue archive</li>'+
            '<li>Every issue as a downloadable PDF</li>'+
          '</ul></div>'+
        '</div>'+
      '</div>';
    }
    return h+'</div>';
  }
  function issuePageHTML(iss,pg){
    var t=pg.type;
    if(t==="cover") return '<div class="ipage ip-cover">'+issueCoverHTML(iss,false)+'<p class="ip-coverdek">'+esc(pg.body||"")+'</p></div>';
    if(t==="toc") return '<div class="ipage"><div class="ip-kicker">Contents</div><h2 class="ip-title">'+esc(pg.title)+'</h2><ol class="ip-toc">'+pg.items.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ol></div>';
    if(t==="feature"){
      var fart=pg.image?'<div class="ip-art" style="background:url(\''+safeCssUrl(pg.image)+'\') center/cover no-repeat"></div>':'';
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
    // Both shipped issues are format:"spread" and carry no `pages` array, so the
    // legacy page-card reader below would throw on iss.pages.length and leave #app
    // empty. Bookmarked and shared #/issue/... URLs are real traffic; send them to
    // the spread reader instead of dying -- carrying the page segment across, which
    // this hand-off used to drop on the floor (#/issue/x/7 landed on page 1).
    var _i=MAG.filter(function(x){return x.id===id;})[0];
    if(_i && !(_i.pages && _i.pages.length)) return viewSpread(id,pageIdx);

    var iss=issueById(id); if(!iss) return notFound();
    var plus=isPlus();
    var pages=iss.pages;
    var FREE_TYPES={cover:1,toc:1};
    // The page segment is 1-BASED here and in #/read/<id>/<page>: a shared URL ending
    // /7 opens the page the counter calls 7. (It used to be 0-based here and dropped
    // entirely on the spread hand-off, so the two readers disagreed with each other
    // and with the number printed on screen.)
    var n=Math.max(0,Math.min(pages.length-1, (parseInt(pageIdx,10)||1)-1));
    var pg=pages[n];
    var locked=(iss.access==="plus" && !plus && !FREE_TYPES[pg.type]);
    var h='<div class="container"><div class="issue-shell">';
    h+='<div class="issue-top"><a class="back" href="#/magazine">← All issues</a>'+
       '<span class="issue-pos" aria-live="polite">Issue '+String(iss.number).padStart(3,"0")+' · page '+(n+1)+' / '+pages.length+'</span></div>';
    if(locked){
      h+='<div class="ipage ip-lock"><div class="lock-ic">◈</div><h2 class="ip-title">This page is for subscribers</h2>'+
        '<p>The cover and contents are free to browse. The full issue — the cover story, all seven columns, the Scoreboard, Compendium, Watchlist, and Ledger — is part of <b>RTFCLMGZN Plus</b>, along with every back issue.</p>'+
        plusPricingHTML({compact:true})+'</div>';
    } else {
      h+=issuePageHTML(iss,pg);
    }
    var prev=n>0?('<a class="pgbtn" href="#/issue/'+id+'/'+n+'">← Prev</a>'):'<span class="pgbtn dis">← Prev</span>';
    var next=n<pages.length-1?('<a class="pgbtn" href="#/issue/'+id+'/'+(n+2)+'">Next →</a>'):'<span class="pgbtn dis">Next →</span>';
    h+='<div class="issue-nav">'+prev+'<span class="issue-dots">'+pages.map(function(_,i){
      return '<a class="dot'+(i===n?' cur':'')+'" href="#/issue/'+id+'/'+(i+1)+'" aria-label="Page '+(i+1)+'"'+(i===n?' aria-current="page"':'')+'></a>';}).join("")+'</span>'+next+'</div>';
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
      if(acctPending){
        h+='<h1>Check your email</h1>'+
          '<p>We sent a sign-in link to <b>'+esc(acctPending)+'</b>. It expires in 15 minutes and works once. Didn’t get it? Check spam, or <a href="#" onclick="acctPending=null;route();return false" style="color:var(--accent2)">try a different address</a>.</p></div>';
        return h+'</div>';
      }
      h+='<h1>Sign in or create your account</h1>'+
        '<p>Reading is free and stays free. Enter your email and we’ll send a one-time link — new address or returning, same step either way. A free account adds three things: your library (bookmarks + read-later) becomes permanent and syncs across devices, you get the <b>daily digest email</b> — the day’s stories in one send — and you’re set up to subscribe to the magazine whenever you’re ready.</p></div>'+
        '<div class="acct-card"><label>Email</label><input id="acct-email" type="email" placeholder="you@example.com">'+
        '<button class="cta" id="acct-signup-btn" onclick="rtfcSignup()">Send sign-in link</button>'+
        '<p class="protonote">We’ll email you a one-time sign-in link — no password to create or remember. Only your most recent link works; if you have more than one of these emails, use the newest.</p></div>'+
        timeMeterHTML(l);
      return h+'</div>';
    }
    h+='<h1>Your account</h1><p>Signed in as <b>'+esc(l.account.email)+'</b></p></div>';
    var plus=isPlus();
    var ent=(plus && l.account.entitlement) ? l.account.entitlement : null;
    var viaStripe=!!(ent && ent.source==="stripe");
    // The plan row says what the reader actually has, in the words their receipt
    // would use — not a generic "Plus". plusStatusLine() reads the server's
    // entitlement; if the server didn't describe one, it degrades to "Plus".
    h+='<div class="acct-card">'+
      '<div class="acct-row"><span>Plan</span><b>'+(plus?(esc(plusStatusLine(ent))+' ◈'):'Free')+'</b></div>'+
      '<div class="acct-row"><span>Daily digest</span><b>Enrolled (launches with the public site)</b></div>'+
      '<div class="acct-row"><span>Library</span><b><a href="#/library" style="color:var(--accent2)">'+l.bookmarks.length+' bookmarks · '+l.readLater.length+' read-later</a></b></div>';
    if(plus && ent && ent.cancel_at_period_end){
      var endsOn=billDate(ent.expires_at);
      h+='<p class="acct-note">Your Plus '+(endsOn?('ends '+esc(endsOn)):'ends at the end of this billing period')+'. Every issue stays open to you until then'+
        (viaStripe?', and resuming puts it back on the same card.':'.')+'</p>'+
        (viaStripe?'<button class="cta" id="acct-portal-btn" onclick="rtfcPortal(event)">Resume Plus</button>':'');
    }
    // The Stripe portal only exists for readers Stripe has a customer for. A voucher
    // or comped reader would get a 404 from a button that promised to work, so they
    // never see it.
    if(plus && viaStripe && !(ent && ent.cancel_at_period_end)){
      h+='<button class="cta ghost" id="acct-portal-btn" onclick="rtfcPortal(event)">Manage billing</button>';
    }
    h+='<button class="cta ghost" onclick="rtfcSignout()">Sign out</button></div>';

    if(!plus){
      h+='<div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Go Plus</div>'+
        plusPricingHTML({});
    } else if(ent && ent.source!=="stripe" && ent.interval!=="lifetime" && ent.expires_at){
      // A voucher runs out. Say so once, here, where they can do something about it.
      h+='<div class="kicker"><span class="dotc" style="background:var(--accent)"></span>After '+esc(billDate(ent.expires_at))+'</div>'+
        '<p style="color:var(--muted);font-size:14px;max-width:60ch;margin:0 0 4px">Nothing renews on its own — when the voucher runs out you go back to Free, and every article is still there. Pick a plan whenever you want to carry on with the magazine.</p>'+
        plusPricingHTML({dek:false});
    }

    // The code box stays available to Plus readers too: gift codes, press passes and
    // founding codes all arrive after somebody already has an account.
    h+='<div class="acct-card"><label for="acct-code">Have a code?</label>'+
      '<input id="acct-code" type="text" placeholder="e.g. FOUNDING100" autocomplete="off" autocapitalize="characters" spellcheck="false">'+
      '<button class="cta ghost" id="acct-code-btn" onclick="rtfcRedeem()">Redeem</button>'+
      '<p class="protonote">Founding codes, gift codes and press passes all go in here. Capitals don’t matter — we tidy it up for you.</p></div>';
    h+=timeMeterHTML(l);
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
      // Month-distilled upsell is for real monthly issues only — never the free Primer
      // special. The old predicate also required format!=="spread", but EVERY issue has
      // shipped as a spread since the format was retired in July 2026, so this block
      // could not render for any issue that has ever existed. Dropped.
      var iss=null; for(var i=0;i<MAG.length;i++) if(MAG[i].month===ym && !MAG[i].special) iss=MAG[i];
      var h='<div class="arch-month"><h2>'+monthLabel(ym)+'</h2><span class="cnt">'+byMonth[ym].length+(byMonth[ym].length===1?' story':' stories')+'</span></div>';
      h+='<div class="grid">'+byMonth[ym].map(cardHTML).join("")+'</div>';
      if(iss) h+='<a class="arch-issue" href="'+issueHref(iss)+'"><span>◈</span><div><b>'+monthLabel(ym)+' in one issue — “'+esc(iss.title)+'”</b>'+
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
  /* ---------- THE LAB DIRECTORY (Resources) ----------
     Identity colors are decorative brand associations for the monogram tiles,
     NOT editorial claims; anything uncertain falls back to a neutral derived
     from the validated series tokens. Logos are deliberately NOT image files:
     a colored monogram is copyright-clean, loads instantly, and can't 404. */
  var BRANDS={ openai:"#10a37f", anthropic:"#d97757", google:"#4285f4", meta:"#0668e1",
    xai:"#8d93a1", apple:"#a2aaad", nvidia:"#76b900", amd:"#ed1c24", microsoft:"#00a4ef",
    amazon:"#ff9900", ibm:"#0f62fe", huggingface:"#ffd21e", deepseek:"#4d6bfe",
    alibaba:"#ff6a00", baidu:"#2932e1", tencent:"#0052d9", mistral:"#ff7000",
    samsung:"#1428a0", huawei:"#cf0a2c", databricks:"#ff3621", groq:"#f55036",
    perplexity:"#20808d", broadcom:"#cc092f", cohere:"#ff7759" };
  function brandColor(key){
    if(BRANDS[key]) return BRANDS[key];
    var n=0; for(var i=0;i<key.length;i++) n=(n*31+key.charCodeAt(i))>>>0;
    return ["var(--s1)","var(--s3)","var(--s5)","var(--s6)","var(--s7)"][n%5];
  }
  // Real, self-hosted company logos live in web/assets/logos/<key>.<ext> -- checked
  // into the repo, never hotlinked, so nothing here depends on a third party's URL
  // staying up. LOGO_EXT is the exact set on disk today. A key with no entry has no
  // logo yet; brandMark()'s <img> onerror (belt-and-braces against a file going
  // missing) and the missing-key branch both fall back to a plain neutral mark --
  // never colored initials, which is the monogram system this replaced.
  var LOGO_EXT = {"01-ai":"svg","ai21":"svg","alibaba":"svg","amazon":"svg","amd":"svg",
    "anthropic":"svg","apple":"svg","baidu":"svg","broadcom":"svg","bytedance":"svg",
    "cerebras":"svg","character-ai":"svg","cohere":"png","databricks":"svg","deepseek":"svg",
    "google":"svg","groq":"svg","huawei":"svg","huggingface":"svg","ibm":"svg","inflection":"svg",
    "meta":"svg","metax":"png","microsoft":"svg","minimax":"png","mistral":"svg","moonshot":"png",
    "nvidia":"svg","openai":"svg","perplexity":"svg","reka":"svg","sambanova":"svg","samsung":"svg",
    "sk-hynix":"svg","stability":"svg","tencent":"svg","tsmc":"svg","xai":"svg","zai":"svg"};
  function brandMark(key,name,extraCls){
    var cls="bmark"+(extraCls?" "+extraCls:"");
    var ext=LOGO_EXT[key];
    if(!ext) return '<span class="'+cls+' no-logo" style="--bc:'+brandColor(key)+'" title="'+esc(name)+'" aria-label="'+esc(name)+' (logo not sourced yet)"></span>';
    return '<span class="'+cls+'" style="--bc:'+brandColor(key)+'">'+
      '<img src="assets/logos/'+key+'.'+ext+'" alt="'+esc(name)+' logo" loading="lazy" '+
      'onerror="this.parentNode.classList.add(\'no-logo\');this.remove()"></span>';
  }
  // Visual grouping only. A company missing from every group still renders
  // under "More" — grouping must never hide coverage.
  var DOSSIER_GROUPS=[
    {label:"Frontier labs",       keys:["openai","anthropic","google","meta","xai","mistral","thinking-machines","inflection","reka","ai21","cohere"]},
    {label:"China",               keys:["zai","moonshot","deepseek","alibaba","baidu","tencent","bytedance","minimax","01-ai","metax","cxmt","unitree","huawei"]},
    {label:"Compute & hardware",  keys:["nvidia","amd","tsmc","asml","samsung","sk-hynix","broadcom","groq","cerebras","sambanova"]},
    {label:"Platforms & products",keys:["apple","microsoft","amazon","ibm","huggingface","perplexity","databricks","character-ai","stability"]}
  ];
  // One lab's models, unioned from the entity registry and the Scoreboard.
  // Scoreboard rows are matched to a company via the company's own coverage
  // regex, the same matcher the dossier pages use — one matcher, one truth.
  function labDirectory(){
    var rows=(window.RTFC_SCOREBOARD&&window.RTFC_SCOREBOARD.rows)||[];
    return COMPANIES.map(function(c){
      var models={};
      (ENT.models||[]).forEach(function(m){
        if(m.makerKey===c.key) models[m.name]={name:m.name,kind:m.kind,access:m.access};
      });
      rows.forEach(function(r){
        if(!c.re.test(r.lab)) return;
        var e=models[r.model]||(models[r.model]={name:r.model});
        if(e.score==null||(typeof r.score==="number"&&r.score>e.score)) e.score=(typeof r.score==="number")?r.score:e.score;
        e.status=e.status||r.status;
      });
      var list=Object.keys(models).map(function(k){return models[k];});
      // Same fix as companyMatches() below: score:null must not sort as if it
      // scored zero, or a freshly-shipped, not-yet-measured model reads as the
      // company's worst rather than its newest.
      list.sort(function(a,b){
        var an=typeof a.score==="number", bn=typeof b.score==="number";
        if(an!==bn) return an?1:-1;
        if(an) return (b.score-a.score) || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });
      return {c:c, models:list};
    }).filter(function(x){ return x.models.length; });
  }
  // Resources used to list "Follow the primary sources" (site/X/YouTube/etc.) as
  // its own separate card grid, repeating the same ~10 labs the directory above
  // already shows -- same company, two cards, no new information. followLinks()
  // pulls that company's links (if any) so labCardHTML can splice them onto the
  // ONE card that company already has, instead of printing a second one.
  function followLinks(key){
    var cat=RES[0];
    if(!cat) return null;
    for(var i=0;i<cat.items.length;i++) if(cat.items[i].key===key) return cat.items[i].links;
    return null;
  }
  function labCardHTML(x){
    var c=x.c;
    var chips=x.models.map(function(m){
      var bits=[];
      if(typeof m.score==="number") bits.push('<b>'+m.score+'</b>');
      else if(m.status) bits.push('<i>'+esc(m.status)+'</i>');
      if(m.access==="open-weights") bits.push('<i class="lm-open">open</i>');
      return '<span class="lm-chip" title="'+esc(m.kind||"")+'">'+esc(m.name)+(bits.length?' '+bits.join(""):'')+'</span>';
    }).join("");
    var flinks=followLinks(c.key);
    // The card can no longer be one giant <a> once it may contain other <a>s
    // (nested anchors are invalid HTML and break click targeting) -- the dossier
    // link now wraps just the head; follow-links sit below as their own row,
    // same div-plus-anchors shape the old res-card used.
    var follow=flinks?('<div class="lab-follow">'+flinks.map(function(l){
        var ext=/^https?:/.test(l.url);
        return '<a href="'+safeHref(l.url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+esc(l.label)+(ext?' ↗':'')+'</a>';
      }).join("")+'</div>'):'';
    return '<div class="lab-card" style="--bc:'+brandColor(c.key)+'">'+
      '<a class="lab-head" href="#/company/'+c.key+'">'+brandMark(c.key,c.name)+
      '<div class="lab-who"><b>'+esc(c.name)+'</b><span>'+x.models.length+' model'+(x.models.length===1?'':'s')+' on record</span></div>'+
      '<span class="lab-go">Dossier →</span></a>'+
      '<div class="lab-models">'+chips+'</div>'+follow+'</div>';
  }
  function viewResources(){
    var DICT=window.RTFC_DICT||[];
    var dir=labDirectory();

    /* THE RESTRUCTURE, and why.
       The page used to open with six sections competing on equal footing: a lab
       grid, then a separate pile of company chips that pointed at the SAME
       dossiers the lab cards already point at, then two promo tiles, then the
       follow-lists. Two of those blocks were the same information twice, and
       nothing on the page was visibly more important than anything else, which
       is what "cluttered" actually means here -- not too much, but nothing
       leading.
       Now there is one spine (the labs, grouped the way the field is actually
       grouped) and everything else sits underneath it in intent order: learn it,
       follow it, use it. The chip pile is gone; the lab cards were always the
       better route to the same dossiers. */

    // Derived headline numbers. Nothing typed by hand, so they cannot go stale.
    var nModels=dir.reduce(function(n,x){ return n+x.models.length; },0);
    var nOpen=dir.reduce(function(n,x){ return n+x.models.filter(function(m){return m.access==="open-weights";}).length; },0);
    var nScored=dir.reduce(function(n,x){ return n+x.models.filter(function(m){return typeof m.score==="number";}).length; },0);

    var grouped=DOSSIER_GROUPS.map(function(g){
      return { label:g.label, items:dir.filter(function(x){ return g.keys.indexOf(x.c.key)>=0; }) };
    }).filter(function(g){ return g.items.length; });
    var placed={};
    grouped.forEach(function(g){ g.items.forEach(function(x){ placed[x.c.key]=1; }); });
    var rest=dir.filter(function(x){ return !placed[x.c.key]; });
    if(rest.length) grouped.push({label:"Also on record", items:rest});

    // A company with a dossier but no model in either registry must not vanish
    // just because the spine is organised around models.
    var noModel=COMPANIES.filter(function(c){
      return !dir.some(function(x){ return x.c.key===c.key; });
    });

    var gridN=(GRID.facilities||[]).length, gridNewN=gdNewIds().length;
    var secs=[{id:"res-grid",label:"The Grid"},{id:"res-labs",label:"Labs & models"}];
    grouped.forEach(function(g,i){ secs.push({id:"res-g"+i,label:g.label,sub:true}); });
    secs.push({id:"res-learn",label:"Learn the field"});
    secs.push({id:"res-follow",label:"Follow the field"});
    secs.push({id:"res-make",label:"Make something"});

    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Resources</div>'+
      '<h1>Every lab, every model, one page</h1>'+
      '<p>Who builds what, assembled live from the Scoreboard and the newsroom\'s own entity registry, so a model appears here the moment we cover it and never because someone remembered to add it. Then the reading, the accounts worth following, the physical layer underneath all of it, and the tools.</p></div>';

    h+='<div class="res-stats">'+
      '<div class="rs-cell"><b>'+dir.length+'</b><span>labs with models on record</span></div>'+
      '<div class="rs-cell"><b>'+nModels+'</b><span>models tracked</span></div>'+
      '<div class="rs-cell"><b>'+nScored+'</b><span>independently scored</span></div>'+
      '<div class="rs-cell"><b>'+nOpen+'</b><span>shipped open-weights</span></div>'+
    '</div>';

    h+='<div class="res-layout"><aside class="res-nav"><div class="rn-title">On this page</div>'+
      secs.map(function(s){ return '<a class="'+(s.sub?"rn-sub":"")+'" onclick="rtfcJump(\''+s.id+'\')">'+esc(s.label)+'</a>'; }).join("")+
      '</aside><div class="res-main">';

    /* ---- THE GRID (promo) ------------------------------------------------ */
    h+='<section id="res-grid"><a class="grid-promo" href="#/grid">'+
      '<div class="gp-copy"><span class="gp-kicker">'+(gridNewN?('<b>'+gridNewN+' new</b> · '):'')+'Mapped and updated daily</span>'+
      '<h2>The Grid — every datacenter running these models</h2>'+
      '<p>Who operates each site, who the primary tenant is when that\'s a different company, and how sure we are of the details. Reconfirmed once a day with the Morning edition; a new facility shows up here the same day it\'s confirmed.</p>'+
      '<span class="gp-go">Open The Grid →</span></div>'+
      '<div class="gp-stats"><div><b>'+gridN+'</b><span>facilities</span></div><div><b>'+(GRID.facilities||[]).filter(function(f){return f.status==="operating";}).length+'</b><span>operating</span></div></div>'+
      '</a></section>';

    /* ---- THE SPINE ------------------------------------------------------ */
    h+='<section id="res-labs"><div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>The labs &amp; their models</div>'+
      '<p class="res-lede">Grouped the way the field actually splits. Each card is a live count of what that lab has shipped that this newsroom has covered, with the independent index score where one exists. Tap any lab for its full dossier: every story, every number, every open question.</p>';

    grouped.forEach(function(g,i){
      var gm=g.items.reduce(function(n,x){ return n+x.models.length; },0);
      h+='<div class="labg" id="res-g'+i+'">'+
        '<div class="labg-h"><span class="labg-l">'+esc(g.label)+'</span>'+
        '<span class="labg-n">'+g.items.length+' lab'+(g.items.length===1?'':'s')+' · '+gm+' model'+(gm===1?'':'s')+'</span></div>'+
        '<div class="lab-grid">'+g.items.map(labCardHTML).join("")+'</div></div>';
    });

    if(noModel.length){
      h+='<div class="labg labg-thin"><div class="labg-h"><span class="labg-l">Tracked, no model shipped</span>'+
        '<span class="labg-n">'+noModel.length+'</span></div>'+
        '<div class="dossier-strip">'+noModel.map(function(c){
          return '<a class="ds-chip" href="#/company/'+c.key+'">'+brandMark(c.key,c.name)+esc(c.name)+'</a>';
        }).join("")+'</div></div>';
    }
    h+='</section>';

    /* ---- LEARN ---------------------------------------------------------- */
    h+='<section id="res-learn"><div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Learn the field</div>'+
      '<div class="res-tiles">'+
      '<a class="res-tile" href="#/dictionary"><span class="rt-ic">✎</span><span class="rt-k">Dictionary</span><b>'+DICT.length+' terms that unlock any AI headline</b>'+
        '<span class="rt-d">Token, agent, hallucination, mixture-of-experts, and the rest, each explained the way a person would explain it.</span>'+
        '<span class="rt-go">Open the dictionary →</span></a>'+
      '<a class="res-tile" href="#/read/primer"><span class="rt-ic">◈</span><span class="rt-k">Primer</span><b>Start from zero</b>'+
        '<span class="rt-d">The long read that assumes nothing: what these systems are, who builds them, and why the money moves the way it does.</span>'+
        '<span class="rt-go">Read The Primer →</span></a>'+
      '<a class="res-tile" href="#/read/how-models-are-made"><span class="rt-ic">⌬</span><span class="rt-k">Deep Dive</span><b>How The Models Are Made</b>'+
        '<span class="rt-d">Pretraining to reasoning models, the space-race economics behind it, every lab\'s strategy compared, and an honest ledger of what\'s proven vs. contested.</span>'+
        '<span class="rt-go">Read the issue →</span></a>'+
      '<a class="res-tile" href="#/guides"><span class="rt-ic">▶</span><span class="rt-k">Guides</span><b>Practical, tested walk-throughs</b>'+
        '<span class="rt-d">How to pick a model for a job, what the pricing actually means, and where the sharp edges are.</span>'+
        '<span class="rt-go">Browse the guides →</span></a>'+
      '</div></section>';

    /* ---- FOLLOW --------------------------------------------------------- */
    h+='<section id="res-follow"><div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Follow the field</div>'+
      '<p class="res-lede">Primary sources first. These are the accounts and feeds the newsroom itself watches, so you can check our work against the same material. The labs\' own site/X/YouTube links now live on their cards above — this is everything else worth following.</p>';
    RES.forEach(function(cat,i){
      if(i===0) return; // "Follow the primary sources" -- now merged onto each lab card in #res-labs, see followLinks()
      h+='<div class="labg"><div class="labg-h"><span class="labg-l">'+esc(cat.title)+'</span>'+
        '<span class="labg-n">'+cat.items.length+'</span></div>'+
        '<p class="res-sub">'+esc(cat.desc)+'</p>'+
        '<div class="res-grid">'+cat.items.map(function(it){
          var head=it.key?('<div class="rc-head">'+brandMark(it.key,it.name)+'<b>'+esc(it.name)+'</b></div>')
                          :('<div class="rc-head"><span class="rglyph">'+esc(it.icon||"●")+'</span><b>'+esc(it.name)+'</b></div>');
          return '<div class="res-card"'+(it.key?' style="--bc:'+brandColor(it.key)+'"':'')+'>'+head+'<span>'+esc(it.desc)+'</span>'+
            '<div class="res-links">'+it.links.map(function(l){
              var ext=/^https?:/.test(l.url);
              return '<a href="'+safeHref(l.url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+esc(l.label)+(ext?' ↗':'')+'</a>';
            }).join("")+'</div></div>';
        }).join("")+'</div></div>';
    });
    h+='</section>';

    /* ---- MAKE ----------------------------------------------------------- */
    h+='<section id="res-make"><div class="kicker"><span class="dotc" style="background:var(--accent)"></span>Make something</div>'+
      '<div class="res-tiles">'+
      '<a class="res-tile" href="#/wallpapers"><span class="rt-ic">◫</span><span class="rt-k">Wallpapers</span><b>Turn any cover into a phone wallpaper</b>'+
        '<span class="rt-d">Every article and magazine cover we have run, sized for your phone, with the mark applied. Free, no account.</span>'+
        '<span class="rt-go">Make a wallpaper →</span></a>'+
      '<a class="res-tile" href="#/claims"><span class="rt-ic">◍</span><span class="rt-k">Ledger</span><b>Everything we said we did not know</b>'+
        '<span class="rt-d">Open questions from every story, with the exact document that would settle each one, and what happened when it arrived.</span>'+
        '<span class="rt-go">Open the claims ledger →</span></a>'+
      '<a class="res-tile" href="#/scoreboard"><span class="rt-ic">▤</span><span class="rt-k">Scoreboard</span><b>Strength against price, with the frontier drawn</b>'+
        '<span class="rt-d">Which models are worth their listing, and which are beaten on capability and cost at the same time.</span>'+
        '<span class="rt-go">Open the Scoreboard →</span></a>'+
      '</div></section>';

    return h+'</div></div></div>';
  }

  /* ================= WALLPAPERS (client-side canvas maker) ================= */
  var WP_SIZES = [
    {key:"tall",   label:"Phone · tall", w:1080, h:2340},
    {key:"hd",     label:"Phone · HD",   w:1080, h:1920},
    {key:"iphone", label:"iPhone",       w:1179, h:2556},
    {key:"max",    label:"iPhone Max",   w:1290, h:2796}
  ];
  var WP = { src:null, size:"tall", pos:"bottom" };
  var WP_IMGCACHE = {};
  // Source images: our own published article + magazine covers, plus the dedicated
  // wallpaper archive (window.RTFC_WALLPAPERS) -- all same-origin, so the canvas can
  // export without tainting. Auto-updates as new pieces publish or new wallpapers ship.
  function wpImages(){
    var seen={}, out=[];
    function add(src,label,group){
      if(!src||typeof src!=="string"||!/\.(jpe?g|png|webp)$/i.test(src)||seen[src]) return;
      seen[src]=1; out.push({src:src,label:label||"",group:group});
    }
    (window.RTFC_WALLPAPERS||[]).forEach(function(w){ add(w.src, w.label, w.category?("Wallpaper collection · "+w.category):"Wallpaper collection"); });
    ARTICLES.forEach(function(a){ add(a.image, a.title, "Article & magazine covers"); });
    MAG.forEach(function(iss){
      if(iss.cover&&iss.cover.image) add(iss.cover.image, iss.title||"Magazine", "Article & magazine covers");
      (iss.pages||[]).forEach(function(p){ add(p.image, p.cap||iss.title||"", "Article & magazine covers"); });
    });
    return out;
  }
  function wpSize(){ for(var i=0;i<WP_SIZES.length;i++) if(WP_SIZES[i].key===WP.size) return WP_SIZES[i]; return WP_SIZES[0]; }
  function wpControlsHTML(imgs){
    var h='<div class="wp-cgroup"><div class="wp-clabel">Size</div><div class="wp-chips">'+
      WP_SIZES.map(function(s){ return '<button class="wp-chip'+(WP.size===s.key?' on':'')+'" onclick="rtfcWpSize(\''+s.key+'\')">'+esc(s.label)+'<em>'+s.w+'×'+s.h+'</em></button>'; }).join("")+'</div></div>';
    h+='<div class="wp-cgroup"><div class="wp-clabel">Logo position</div><div class="wp-chips">'+
      ["bottom","top"].map(function(p){ return '<button class="wp-chip'+(WP.pos===p?' on':'')+'" onclick="rtfcWpPos(\''+p+'\')">'+p.charAt(0).toUpperCase()+p.slice(1)+'</button>'; }).join("")+'</div></div>';
    // Group thumbnails under their source (the wallpaper archive's own categories,
    // then a single bucket for article/magazine covers) instead of one long flat
    // scroll -- the archive alone is 88 images, on top of every cover we've ever run.
    var groups={}, order=[];
    imgs.forEach(function(im){
      var g=im.group||"More";
      if(!groups[g]){ groups[g]=[]; order.push(g); }
      groups[g].push(im);
    });
    h+='<div class="wp-cgroup"><div class="wp-clabel">Image · '+imgs.length+' to choose from</div>'+
      order.map(function(g){
        return '<div class="wp-gsub">'+esc(g)+'</div><div class="wp-gallery">'+
          groups[g].map(function(im){ return '<button class="wp-thumb'+(WP.src===im.src?' on':'')+'" style="background-image:url(\''+im.src.replace(/'/g,"\\'")+'\')" title="'+esc(im.label)+'" aria-label="'+esc(im.label)+'" onclick="rtfcWpPick(\''+im.src.replace(/'/g,"\\'")+'\')"></button>'; }).join("")+
        '</div>';
      }).join("")+
      '</div>';
    return h;
  }
  function viewWallpapers(){
    var imgs=wpImages();
    if((!WP.src||!/\.(jpe?g|png|webp)$/i.test(WP.src))&&imgs.length) WP.src=imgs[0].src;
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over"><a href="#/resources" style="color:var(--accent2)">Resources</a> · Wallpapers</div>'+
      '<h1>Make a phone wallpaper</h1>'+
      '<p>Turn any of our cover images into a phone wallpaper — sized for your screen, with the RTFCLMGZN mark on it. Pick an image, choose a size, download. Free, like everything here.</p></div>';
    h+='<div class="wp-wrap">'+
      '<div class="wp-stage"><canvas id="wp-canvas" width="1080" height="2340"></canvas>'+
      '<button class="cta wp-dl" onclick="rtfcWpDownload()">Download wallpaper</button>'+
      '<p class="wp-hint">On a phone: download, then set it from your Photos app. On desktop: download and AirDrop / send it to your phone.</p></div>'+
      '<div class="wp-controls">'+wpControlsHTML(imgs)+'</div></div>';
    setTimeout(function(){ wpDraw(); if(document.fonts&&document.fonts.ready){ document.fonts.ready.then(wpDraw); } }, 30);
    return h+'</div>';
  }
  function wpRefreshControls(){
    var c=document.querySelector(".wp-controls"); if(c) c.innerHTML=wpControlsHTML(wpImages());
  }
  window.rtfcWpPick=function(src){ WP.src=src; wpRefreshControls(); wpDraw(); };
  window.rtfcWpSize=function(k){ WP.size=k; wpRefreshControls(); wpDraw(); };
  window.rtfcWpPos=function(p){ WP.pos=p; wpRefreshControls(); wpDraw(); };
  function wpDraw(){
    var cv=document.getElementById("wp-canvas"); if(!cv) return;
    var s=wpSize(); if(cv.width!==s.w) cv.width=s.w; if(cv.height!==s.h) cv.height=s.h;
    var ctx=cv.getContext("2d");
    ctx.fillStyle="#0b0b12"; ctx.fillRect(0,0,s.w,s.h);
    var im=WP.src?WP_IMGCACHE[WP.src]:null;
    if(im&&im.complete&&im.naturalWidth){
      var scale=Math.max(s.w/im.naturalWidth, s.h/im.naturalHeight);
      var dw=im.naturalWidth*scale, dh=im.naturalHeight*scale;
      ctx.drawImage(im,(s.w-dw)/2,(s.h-dh)/2,dw,dh);
    } else if(WP.src){
      im=new Image(); WP_IMGCACHE[WP.src]=im; im.__src=WP.src;
      im.onload=function(){ if(WP.src===im.__src) wpDraw(); };
      im.src=WP.src;
    }
    wpLogo(ctx,s);
  }
  function wpLogo(ctx,s){
    var w=s.w, h=s.h, bottom=(WP.pos!=="top");
    var gh=h*0.28;
    var g=ctx.createLinearGradient(0, bottom?h:0, 0, bottom?h-gh:gh);
    g.addColorStop(0,"rgba(4,4,9,0.74)"); g.addColorStop(1,"rgba(4,4,9,0)");
    ctx.fillStyle=g; ctx.fillRect(0, bottom?h-gh:0, w, gh);
    var cx=w/2, fs=w*0.072, capfs=w*0.023, dfs=w*0.058;
    var wy = bottom ? h-h*0.075 : h*0.13;
    ctx.textAlign="center"; ctx.textBaseline="alphabetic";
    ctx.shadowColor="rgba(0,0,0,.5)"; ctx.shadowBlur=w*0.018; ctx.shadowOffsetY=w*0.003;
    ctx.fillStyle="#8b7cf7"; ctx.font=dfs+'px "Fraunces", Georgia, serif';
    ctx.fillText("◈", cx, wy - fs*0.98);
    ctx.fillStyle="#ffffff"; ctx.font='600 '+fs+'px "Fraunces", Georgia, serif';
    try{ ctx.letterSpacing=(w*0.008)+"px"; }catch(e){}
    ctx.fillText("RTFCLMGZN", cx, wy);
    ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font='600 '+capfs+'px "Inter", system-ui, sans-serif';
    try{ ctx.letterSpacing=(w*0.006)+"px"; }catch(e){}
    ctx.fillText("ARTIFICIAL MAGAZINE", cx, wy + capfs*2.1);
    try{ ctx.letterSpacing="0px"; }catch(e){}
    ctx.shadowColor="transparent"; ctx.shadowBlur=0; ctx.shadowOffsetY=0;
  }
  window.rtfcWpDownload=function(){
    var cv=document.getElementById("wp-canvas"); if(!cv) return;
    var name="rtfclmgzn-wallpaper-"+WP.size+".png";
    function grab(url,revoke){ var a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ if(revoke) URL.revokeObjectURL(url); a.remove(); },1200); }
    if(cv.toBlob){ cv.toBlob(function(b){ if(b) grab(URL.createObjectURL(b),true); else grab(cv.toDataURL("image/png")); },"image/png"); }
    else { grab(cv.toDataURL("image/png")); }
  };

  /* ============ QUALITY & PROGRESSION DESIGN PREVIEW (visual phase · #/design) ============
     Presentational components with MOCK data only — the platform-handover Fable phase.
     Nothing here reads or writes production account/XP state; the page is an unlinked
     internal preview so no invented numbers ever appear on public surfaces. */
  var QS_FAMILIES=[
    {n:"Observer",g:"eye",c:"#5f7fd9"},{n:"Reader",g:"page",c:"#5a8ee0"},{n:"Explorer",g:"compass",c:"#54a0e6"},
    {n:"Seeker",g:"lens",c:"#4db3ea"},{n:"Tracker",g:"trail",c:"#45c6ec"},{n:"Analyst",g:"wave",c:"#43e0ff"},
    {n:"Curator",g:"cards",c:"#5cc8e8"},{n:"Specialist",g:"hex",c:"#6fb1e9"},{n:"Scholar",g:"prism",c:"#7f9cef"},
    {n:"Researcher",g:"lattice",c:"#8b8af5"},{n:"Sentinel",g:"shield",c:"#8f7cf5"},{n:"Navigator",g:"starmap",c:"#9a6ff2"},
    {n:"Vanguard",g:"chevron",c:"#a666ee"},{n:"Luminary",g:"radiant",c:"#b25fe8"},{n:"Archivist",g:"vault",c:"#bd5ade"},
    {n:"Authority",g:"pillar",c:"#c757cf"},{n:"Oracle",g:"halo",c:"#d055bd"},{n:"Catalyst",g:"ignite",c:"#d95aa4"},
    {n:"Paragon",g:"crystal",c:"#e0678f"},{n:"Legacy",g:"ring",c:"#e2b04d"},{n:"Ascendant",g:"core",c:"#efd08a"}
  ];
  function qsGlyph(g){
    switch(g){
      case "eye": return '<ellipse cx="48" cy="44" rx="17" ry="10.5"/><circle cx="48" cy="44" r="4.6" fill="currentColor" stroke="none"/>';
      case "page": return '<path d="M38 30h14l8 8v26H38z"/><path d="M52 30v8h8M43 48h12M43 55h12"/>';
      case "compass": return '<circle cx="48" cy="44" r="15"/><path d="M54 38l-4.2 9.8L40 52l4.2-9.8z" fill="currentColor" stroke="none"/>';
      case "lens": return '<circle cx="45" cy="41" r="11.5"/><path d="M53.5 49.5L62 58"/>';
      case "trail": return '<path d="M34 56l9-9 7 5 12-14"/><circle cx="34" cy="56" r="2.6" fill="currentColor" stroke="none"/><circle cx="43" cy="47" r="2.6" fill="currentColor" stroke="none"/><circle cx="50" cy="52" r="2.6" fill="currentColor" stroke="none"/><circle cx="62" cy="38" r="2.6" fill="currentColor" stroke="none"/>';
      case "wave": return '<path d="M32 44h6l4-11 6 22 5-16 4 5h7"/>';
      case "cards": return '<rect x="36" y="36" width="20" height="14" rx="2.5"/><rect x="40" y="41" width="20" height="14" rx="2.5"/><rect x="44" y="46" width="20" height="14" rx="2.5"/>';
      case "hex": return '<path d="M48 29l13 7.5v15L48 59l-13-7.5v-15z"/><circle cx="48" cy="44" r="4" fill="currentColor" stroke="none"/>';
      case "prism": return '<path d="M48 30L62 56H34z"/><path d="M34 49h28"/>';
      case "lattice": return '<circle cx="38" cy="36" r="2.6" fill="currentColor" stroke="none"/><circle cx="58" cy="36" r="2.6" fill="currentColor" stroke="none"/><circle cx="48" cy="46" r="2.6" fill="currentColor" stroke="none"/><circle cx="38" cy="56" r="2.6" fill="currentColor" stroke="none"/><circle cx="58" cy="56" r="2.6" fill="currentColor" stroke="none"/><path d="M38 36l10 10 10-10M38 56l10-10 10 10"/>';
      case "shield": return '<path d="M48 29c5 3.4 10 4.6 14 5v13c0 8-6.5 13.5-14 17-7.5-3.5-14-9-14-17V34c4-.4 9-1.6 14-5z"/>';
      case "starmap": return '<circle cx="39" cy="38" r="2.2" fill="currentColor" stroke="none"/><circle cx="58" cy="35" r="2.2" fill="currentColor" stroke="none"/><circle cx="54" cy="53" r="2.2" fill="currentColor" stroke="none"/><circle cx="37" cy="52" r="2.2" fill="currentColor" stroke="none"/><path d="M39 38l19-3M58 35l-4 18M54 53l-17-1 2-14"/><path d="M46 43l2-3 2 3 3 .5-2.2 2 .6 3.2L48 47l-2.9 1.7.6-3.2-2.2-2z" fill="currentColor" stroke="none"/>';
      case "chevron": return '<path d="M38 32l12 12-12 12M50 32l12 12-12 12"/>';
      case "radiant": return '<circle cx="48" cy="44" r="6.5"/><path d="M48 27v7M48 54v7M31 44h7M58 44h7M36 32l5 5M60 32l-5 5M36 56l5-5M60 56l-5-5"/>';
      case "vault": return '<rect x="34" y="31" width="28" height="26" rx="4"/><circle cx="48" cy="44" r="7"/><path d="M48 39.5V44l3 3"/>';
      case "pillar": return '<path d="M38 33h20M38 55h20M41 33v22M48 33v22M55 33v22M36 29h24"/>';
      case "halo": return '<path d="M36 33a15 8.5 0 0 1 24 0"/><ellipse cx="48" cy="47" rx="15" ry="9.5"/><circle cx="48" cy="47" r="4.2" fill="currentColor" stroke="none"/>';
      case "ignite": return '<circle cx="48" cy="44" r="14"/><path d="M48 34c3.5 4.5 6 7.6 6 11a6 6 0 1 1-12 0c0-3.4 2.5-6.5 6-11z" fill="currentColor" stroke="none"/>';
      case "crystal": return '<path d="M48 28l11 12-11 20-11-20z"/><path d="M37 40h22M48 28l-4 12 4 20M48 28l4 12-4 20"/>';
      case "ring": return '<path d="M40.5 44a7.5 7.5 0 1 1 7.5 7.5A7.5 7.5 0 1 1 55.5 44a7.5 7.5 0 1 1-7.5-7.5A7.5 7.5 0 1 1 40.5 44z"/>';
      case "core": return '<circle cx="48" cy="44" r="6"/><circle cx="48" cy="44" r="11.5" stroke-dasharray="3.5 4"/><circle cx="48" cy="44" r="17"/><circle cx="48" cy="44" r="2.4" fill="currentColor" stroke="none"/>';
    }
    return "";
  }
  // Parametric reader badge: one component, 21 families x 5 divisions, any size, prestige rings.
  function qsBadgeSVG(famIdx,division,size,prestige){
    var f=QS_FAMILIES[famIdx]||QS_FAMILIES[0]; size=size||48;
    var pips="", x0=48-((division-1)*7)/2; // centered row of `division` pips
    for(var i=0;i<division;i++){ pips+='<circle cx="'+(x0+i*7)+'" cy="68.5" r="2.1" fill="currentColor" stroke="none"/>'; }
    var ring2=prestige?'<circle cx="48" cy="48" r="45.5" stroke-dasharray="2.5 5" opacity=".85"/>':"";
    return '<svg class="qs-badge" role="img" aria-label="'+esc(f.n+" "+["I","II","III","IV","V"][division-1]+(prestige?" · prestige":""))+'" width="'+size+'" height="'+size+'" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:'+safeColor(f.c)+'">'+
      '<circle cx="48" cy="48" r="41" opacity=".95"/>'+
      '<circle cx="48" cy="48" r="35.5" opacity=".28" stroke-width="1.5"/>'+ring2+
      '<g stroke-width="3.2">'+qsGlyph(f.g)+'</g>'+pips+'</svg>';
  }
  var QS_STATDEFS={ANALYSIS:"Reasoning depth, synthesis, counterarguments, causality, second-order thinking.",
    EXPERTISE:"Beat knowledge, technical accuracy, terminology, subject-matter command.",
    EVIDENCE:"Primary-source use, verification quality, citation coverage, uncertainty handling.",
    VOICE:"Consistency with the persona file — rhythm, temperament, structure, distinctiveness.",
    PRACTICALITY:"Conclusions, workflows, reader takeaways, put-it-to-work quality.",
    VELOCITY:"Timeliness, deadline execution, efficient handoffs, avoidable revisions.",
    DISCIPLINE:"Compliance, corrections, escalation, disclaimers, beat boundaries, judgment.",
    ACTIVITY:"How regularly this reader shows up.",COMPLETION:"Share of opened articles read to the end.",
    "READING TIME":"Verified active reading time.",CONSISTENCY:"Streak strength and routine."};
  function qsStat(label,v,col){
    return '<div class="qs-stat"><span class="qs-stat-l" title="'+esc(QS_STATDEFS[label]||"")+'">'+esc(label)+'</span>'+
      '<span class="qs-stat-track"><span class="qs-stat-fill" style="--w:'+v+'%;--qcol:'+(col||"#7c6cf0")+'"></span></span>'+
      '<span class="qs-stat-v">'+v+'</span></div>';
  }
  function qsXP(cur,next,col){
    var pct=Math.round(cur/next*100);
    return '<div class="qs-xp" style="--qcol:'+(col||"#7c6cf0")+'"><div class="qs-xp-meta"><b>'+cur.toLocaleString()+' / '+next.toLocaleString()+' XP</b><span>'+pct+'%</span></div>'+
      '<div class="qs-xp-track"><span class="qs-xp-fill" style="--w:'+pct+'%"></span></div></div>';
  }
  // Handover-spec base profiles + signature abilities (mock rank/XP for the preview).
  var QS_EDITORS={
    "luka-petrovic":{s:[100,99,100,83,93,78,100],sig:"Benchmark Autopsy",rank:37,band:"Senior Specialist",xp:[18460,20070],standing:97},
    "nova-reyes":{s:[82,87,88,100,99,96,86],sig:"Cultural Signal",rank:31,band:"Specialist",xp:[24880,26430],standing:92},
    "jin-park":{s:[96,99,97,80,88,76,99],sig:"Bottleneck Vision",rank:36,band:"Senior Specialist",xp:[17020,19100],standing:95},
    "evelyn-zhao":{s:[94,97,100,83,86,73,100],sig:"Scope Control",rank:35,band:"Senior Specialist",xp:[16110,18160],standing:98},
    "priya-anand":{s:[97,99,100,85,87,69,100],sig:"Evidence Grading",rank:33,band:"Specialist",xp:[27390,28820],standing:99},
    "kian-farzan":{s:[95,95,96,91,92,90,97],sig:"Deal Arithmetic",rank:38,band:"Senior Specialist",xp:[19940,21080],standing:96},
    "ash-lindqvist":{s:[84,93,88,87,95,84,89],sig:"Reality-Gap Radar",rank:30,band:"Specialist",xp:[23180,25060],standing:93},
    "sage-okafor":{s:[98,91,93,100,79,67,95],sig:"Long Horizon",rank:34,band:"Specialist",xp:[28640,30240],standing:94},
    "samira-nasser":{s:[92,92,97,95,90,71,100],sig:"Human-Cost Lens",rank:32,band:"Specialist",xp:[25710,27300],standing:98}
  };
  var QS_STATLABELS=["ANALYSIS","EXPERTISE","EVIDENCE","VOICE","PRACTICALITY","VELOCITY","DISCIPLINE"];
  function qsStandingChip(v){
    var cls=v>=95?"s1":(v>=88?"s2":"s3"); var name=v>=95?"Exemplary":(v>=88?"Trusted":"Stable");
    return '<span class="qs-standing '+cls+'">Standing '+v+' · '+name+'</span>';
  }
  function qsEditorCard(key,full){
    var p=persona(key), m=QS_EDITORS[key]; if(!p||!m) return "";
    var col=SECTION_COLORS[p.section]||"#7c6cf0";
    var mine=ARTICLES.filter(function(a){return a.persona===key||(a.authors&&a.authors.indexOf(key)>=0);}).length;
    var h='<div class="qs-ecard'+(full?' full':'')+'" style="--qcol:'+col+'">';
    h+='<div class="qs-ehead"><span class="qs-eport" style="background-image:url(\''+safeCssUrl(p.photo)+'\')"></span>'+
       '<div><div class="qs-ename">'+esc(p.name)+'</div><div class="qs-ebeat">'+esc(p.beat)+'</div>'+
       '<div class="qs-erank"><b>Rank '+m.rank+'</b><span>· '+esc(m.band)+'</span></div></div></div>';
    h+=qsXP(m.xp[0],m.xp[1],col);
    var stats=full?QS_STATLABELS:QS_STATLABELS.slice(0,3);
    h+='<div style="margin-top:10px">'+stats.map(function(l,i){return qsStat(l,m.s[QS_STATLABELS.indexOf(l)],col);}).join("")+'</div>';
    if(full) h+='<div class="qs-sig"><span class="qs-sig-ic">◆</span><div><div class="qs-sig-l">Signature ability</div><div class="qs-sig-n">'+esc(m.sig)+'</div></div></div>';
    h+='<div class="qs-emeta">'+qsStandingChip(m.standing)+'<span><b>'+mine+'</b> articles</span><span>clean streak <b>'+(3+(m.rank%9))+'</b></span></div>';
    return h+'</div>';
  }
  function viewDesign(){
    var h='<div class="container qs-wrap"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Internal · Design preview</div>'+
      '<h1>Quality &amp; progression systems</h1>'+
      '<p>The visual language for editor performance, article scoring, and reader progression — built to the platform handover, previewed here before any of it goes live.</p>'+
      '<span class="qs-note">⚠ Preview — all numbers on this page are mock data</span></div>';
    // A — editor cards
    h+='<div class="qs-sec"><h2 class="qs-h">Editor performance cards</h2><p class="qs-sub">Compact card per editor; the expanded card shows all seven stats, the signature ability, and editorial standing. Bars animate once on load and honor reduced-motion.</p>';
    h+='<div style="max-width:430px;margin-bottom:18px">'+qsEditorCard("luka-petrovic",true)+'</div>';
    h+='<div class="qs-egrid">'+["jin-park","evelyn-zhao","kian-farzan","nova-reyes","priya-anand","ash-lindqvist","sage-okafor","samira-nasser"].map(function(k){return qsEditorCard(k,false);}).join("")+'</div></div>';
    // B — reader card
    h+='<div class="qs-sec"><h2 class="qs-h">Reader profile card</h2><p class="qs-sub">Signal-rank progression for reader accounts — four stats, streaks, and the badge for the current division. Rank is earned, never bought.</p>';
    h+='<div class="qs-rcard"><div class="qs-rhead">'+qsBadgeSVG(3,2,56)+'<div><div class="qs-rname">@NEONREADER</div><div class="qs-rrank">Rank 17 · Seeker II <span>· 3,940 / 4,080 SP</span></div></div></div>';
    h+='<div class="qs-xp" style="--qcol:#43e0ff"><div class="qs-xp-track"><span class="qs-xp-fill" style="--w:96%"></span></div></div>';
    h+='<div class="qs-rstats">'+qsStat("ACTIVITY",77,"#43e0ff")+qsStat("COMPLETION",86,"#43e0ff")+qsStat("READING TIME",71,"#43e0ff")+qsStat("CONSISTENCY",91,"#43e0ff")+'</div>';
    h+='<div class="qs-rgrid"><div class="qs-rcell"><b>42</b>active days</div><div class="qs-rcell"><b>128</b>articles opened</div><div class="qs-rcell"><b>79</b>articles completed</div><div class="qs-rcell"><b>16.4</b>reading hours</div></div>';
    h+='<span class="qs-streak">🔥 12-day streak · best 24</span></div></div>';
    // C — badges
    h+='<div class="qs-sec"><h2 class="qs-h">Reader badge system</h2><p class="qs-sub">Twenty-one families × five divisions from one parametric SVG component — no raster images. Division pips mark I–V; Ascendant repeats with prestige rings.</p>';
    h+='<div class="qs-bgrid">'+QS_FAMILIES.map(function(f,i){
      var div=(i%5)+1;
      return '<div class="qs-bcell">'+qsBadgeSVG(i,div,52,i===20)+'<span class="qs-bname">'+esc(f.n)+'</span><span class="qs-branks">Ranks '+(i*5+1)+'–'+(i*5+5)+'</span></div>';
    }).join("")+'</div>';
    h+='<p class="qs-sub" style="margin:18px 0 10px">Scales cleanly at every required size:</p><div class="qs-bsizes">'+[24,32,48,96,192].map(function(s){return '<span class="qs-bsz">'+qsBadgeSVG(11,3,s)+s+'px</span>';}).join("")+'</div></div>';
    // D — article score
    h+='<div class="qs-sec"><h2 class="qs-h">Article Score panel</h2><p class="qs-sub">The pre-publication quality score, compact by default, expandable to the category breakdown. Distinct from reader ratings; the 8.00 publishing threshold and scoring logic arrive in the backend phase.</p>';
    h+='<details class="qs-score"><summary><div><div class="qs-score-l">Article Score</div><div class="qs-score-n">8.63</div><div class="qs-score-band">Strong</div></div><span class="qs-score-hint">How this article was scored ▾</span></summary>';
    h+='<div class="qs-score-body">'+qsStat("ACCURACY",92,"#8b7cf7").replace(">92<",">9.20<")+qsStat("SOURCES",88,"#8b7cf7").replace(">88<",">8.80<")+qsStat("INSIGHT",84,"#8b7cf7").replace(">84<",">8.45<")+qsStat("WRITING",85,"#8b7cf7").replace(">85<",">8.55<")+qsStat("PRODUCTION",79,"#8b7cf7").replace(">79<",">7.95<")+'</div>';
    h+='<div class="qs-score-meta"><span><b>12</b> sources verified</span><span><b>0</b> unresolved flags</span><span><b>✓</b> Verification passed</span></div></details></div>';
    // E — reader rating
    h+='<div class="qs-sec"><h2 class="qs-h">Reader rating</h2><p class="qs-sub">Five stars saves and says thanks. One to four stars reveals improvement sliders — centered means no opinion, and only moved sliders would be recorded. Fully keyboard-accessible. Try it:</p>';
    h+='<div class="qs-rate"><div class="qs-rate-h">How was this article?</div><div class="qs-stars" role="radiogroup" aria-label="Rate this article">'+
       [1,2,3,4,5].map(function(n){return '<button class="qs-star" id="qs-star-'+n+'" role="radio" aria-checked="false" aria-label="'+n+' star'+(n>1?"s":"")+'" onclick="qsStar('+n+')">★</button>';}).join("")+'</div>'+
       '<div class="qs-rate-lbl" id="qs-rate-lbl"></div>'+
       '<div class="qs-sliders" id="qs-sliders"><div class="qs-rate-h">What could be better?</div>'+
       [["Shorter","ARTICLE LENGTH","Longer"],["Easier to read","TECHNICAL DEPTH","More technical"],["More direct","BACKGROUND & CONTEXT","More context"]].map(function(s,i){
         return '<div class="qs-slider"><div class="qs-slider-l"><span>'+esc(s[0])+'</span><b>'+esc(s[1])+'</b><span>'+esc(s[2])+'</span></div><input type="range" min="0" max="100" value="50" oninput="qsSlide()" aria-label="'+esc(s[1])+'"></div>';
       }).join("")+
       '<div class="qs-rate-actions"><button class="cta" id="qs-rate-submit" disabled onclick="qsRateSubmit()">Send feedback</button><button class="cta ghost" onclick="qsRateSkip()">Skip</button></div></div>'+
       '<div class="qs-rate-done" id="qs-rate-done"></div></div></div>';
    h+='<p style="color:var(--muted);font-size:12.5px;margin:30px 0 10px">Visual-design phase only: presentational components with mock data. XP, Signal Points, scoring gates, and account wiring are a separate backend phase and are not active anywhere on the site.</p>';
    setTimeout(function(){ var els=document.querySelectorAll(".qs-stat-fill,.qs-xp-fill"); els.forEach(function(e){ e.classList.add("on"); }); },80);
    return h+'</div>';
  }
  window.qsStar=function(n){
    for(var i=1;i<=5;i++){ var b=document.getElementById("qs-star-"+i); if(b){ b.classList.toggle("on",i<=n); b.setAttribute("aria-checked",String(i===n)); } }
    var lbl=document.getElementById("qs-rate-lbl"), sl=document.getElementById("qs-sliders"), done=document.getElementById("qs-rate-done");
    lbl.textContent=["","Poor","Needs work","Decent","Good","Excellent"][n];
    if(n===5){ sl.classList.remove("show"); done.textContent="Thanks — glad this article delivered."; done.classList.add("show"); }
    else { done.classList.remove("show"); sl.classList.add("show"); }
  };
  window.qsSlide=function(){
    var moved=Array.prototype.some.call(document.querySelectorAll("#qs-sliders input"),function(i){return i.value!=="50";});
    var btn=document.getElementById("qs-rate-submit"); if(btn) btn.disabled=!moved;
  };
  window.qsRateSubmit=function(){
    var sl=document.getElementById("qs-sliders"), done=document.getElementById("qs-rate-done");
    sl.classList.remove("show"); done.textContent="Feedback noted — thank you."; done.classList.add("show");
  };
  window.qsRateSkip=function(){
    var sl=document.getElementById("qs-sliders"), done=document.getElementById("qs-rate-done");
    sl.classList.remove("show"); done.textContent="No problem — thanks for the rating."; done.classList.add("show");
  };

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
  var BZ_KIND={lab:{c:"var(--s1)",l:"Lab"},person:{c:"var(--s6)",l:"Person"},
               news:{c:"var(--s3)",l:"Press"},gov:{c:"var(--s5)",l:"Official"}};
  function buzzCard(b,hot){
    var initial=(b.source&&b.source.name?b.source.name:"?").charAt(0);
    var kind=BZ_KIND[b.source&&b.source.kind]||{c:"var(--accent)",l:""};
    var heat=Math.max(4,Math.min(100,b.heat||0));
    // Buzz text runs through the entity layer too — a model named in a card
    // gets the same provenance hovercard an article gets, per-card scope.
    var seen={};
    return '<div class="buzz-card'+(hot?' bz-hot':'')+'">'+
      (hot?'<span class="bz-hotk">Loudest right now</span>':'')+
      '<div class="bz-head"><span class="bz-av" style="background:'+safeColor(kind.c)+'">'+esc(initial)+'</span>'+
      '<span class="bz-who"><b>'+esc(b.source.name)+'</b><span>'+esc(b.source.handle||"")+(b.source.platform==="x"?" · 𝕏":"")+
      (kind.l?' · '+kind.l:'')+'</span></span>'+
      '<span class="bz-heat" title="Buzz heat: '+heat+'/100"><i style="width:'+heat+'%"></i><em>'+heat+'</em></span></div>'+
      '<div class="bz-text">'+entAnnotate(fmt(b.text),seen)+'</div>'+
      (b.why?'<div class="bz-why"><b>WHY IT\'S BUZZING</b> '+fmt(b.why)+'</div>':'')+
      '<div class="bz-foot">'+(b.topics||[]).map(function(t){return '<span class="bz-tag">'+esc(t)+'</span>';}).join("")+
      '<a href="'+safeHref(b.url)+'" target="_blank" rel="noopener">original ↗</a></div>'+
      // Only ever an EXACT source-url match: this is the newsroom saying it read
      // and cited this exact post, not a guess that the subjects look similar.
      (function(){
        var cov=bzCoverage(b); if(!cov.length) return "";
        return '<div class="bz-cover"><span class="bzc-k">We cited this</span>'+
          cov.map(function(a){ return '<a href="#/article/'+esc(a.slug)+'">'+esc(a.title)+'</a>'; }).join("")+'</div>';
      })()+
    '</div>';
  }
  function buzzDayBlock(day,items,isLatest){
    var sorted=items.slice().sort(function(a,b){return (b.heat||0)-(a.heat||0);});
    return '<div class="kicker"><span class="dotc" style="background:var(--accent2)"></span>'+esc(buzzTime(day))+
      '<span class="bz-count">'+sorted.length+'</span></div>'+
      '<div class="buzz-grid">'+sorted.map(function(b,i){ return buzzCard(b, isLatest&&i===0&&(b.heat||0)>=80); }).join("")+'</div>';
  }
  // Solitaire stack for every day OTHER than the newest one: a single clickable
  // peek row (the day, the card count, and the avatar+name of that day's loudest
  // card) with the full buzz-grid sitting underneath, collapsed until clicked.
  // Same day-grouping and same heat sort buzzDayBlock already used for the top
  // day -- this only changes how an OLDER day is presented on screen, not how
  // the data itself is grouped or sorted. State lives in BZ_OPEN so a reader
  // can open several days at once and they stay open across a filter change.
  var BZ_OPEN={};
  function buzzDayStack(day,items){
    var sorted=items.slice().sort(function(a,b){return (b.heat||0)-(a.heat||0);});
    var top=sorted[0];
    var kind=BZ_KIND[top.source&&top.source.kind]||{c:"var(--accent)",l:""};
    var initial=(top.source&&top.source.name?top.source.name:"?").charAt(0);
    var open=!!BZ_OPEN[day];
    return '<div class="bz-daystack'+(open?' open':'')+'" id="bzday-'+esc(day)+'">'+
      '<button class="bzs-peek" onclick="rtfcBuzzDay(\''+esc(day)+'\')" aria-expanded="'+(open?'true':'false')+'">'+
        '<span class="bz-av" style="background:'+safeColor(kind.c)+'">'+esc(initial)+'</span>'+
        '<span class="bzs-meta"><b>'+esc(buzzTime(day))+'</b>'+
          '<span>'+sorted.length+' card'+(sorted.length===1?'':'s')+' · loudest: '+esc(top.source.name)+'</span></span>'+
        '<span class="bzs-chev" aria-hidden="true">⌄</span>'+
      '</button>'+
      '<div class="buzz-grid bzs-full">'+sorted.map(function(b){ return buzzCard(b,false); }).join("")+'</div>'+
    '</div>';
  }
  window.rtfcBuzzDay=function(day){
    BZ_OPEN[day]=!BZ_OPEN[day];
    var el=document.getElementById("bzday-"+day);
    if(el){ el.classList.toggle("open",BZ_OPEN[day]); var b=el.querySelector(".bzs-peek"); if(b) b.setAttribute("aria-expanded",BZ_OPEN[day]?"true":"false"); }
  };
  /* ---------- BUZZ INTELLIGENCE · all of it derived, none of it inferred ------
     Three additions, and the constraint on every one of them was the same: the
     feed may only assert things the data can actually support.

     1. COVERAGE. A buzz card is linked to an article only on an EXACT normalised
        URL match against that article's own source list. That is not a guess
        about topical similarity, it is the newsroom saying "I read this exact
        post and cited it". The inverse is never claimed: an unmatched card is
        shown plainly, never labelled "not covered", because a story can be
        covered from a different primary source.

     2. MOMENTUM. Card volume per topic, last 7 days against the 7 before, from
        the dates already on every card. It says what the feed is doing, which is
        a real fact about the feed. It does NOT claim to measure the world.

     3. FILTER. The topic list is the curated `topics` field, not keyword
        matching, so a chip means what the desk meant by it. */

  function bzNormUrl(u){
    return String(u||"").replace(/^https?:\/\/(www\.)?/,"").replace(/[#?].*$/,"").replace(/\/+$/,"").toLowerCase();
  }
  var BZ_COVER=null;
  function bzCoverageIndex(){
    if(BZ_COVER) return BZ_COVER;
    BZ_COVER={};
    ARTICLES.concat(GUIDES).forEach(function(a){
      (a.sources||[]).forEach(function(s){
        var k=bzNormUrl(s&&s.url); if(!k) return;
        (BZ_COVER[k]=BZ_COVER[k]||[]).push(a);
      });
    });
    return BZ_COVER;
  }
  function bzCoverage(b){
    var hits=bzCoverageIndex()[bzNormUrl(b.url)]||[];
    // Newest first, and never more than two links out of one card.
    return hits.slice().sort(function(x,y){ return new Date(y.publishedAt)-new Date(x.publishedAt); }).slice(0,2);
  }

  var BZ_FILTER="";                      // "" = everything
  function bzDays(n){ var d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
  function bzTopicStats(){
    var w1=bzDays(7), w2=bzDays(14), now={}, prev={}, all={};
    BUZZ.forEach(function(b){
      (b.topics||[]).forEach(function(t){
        all[t]=(all[t]||0)+1;
        if(b.date>=w1) now[t]=(now[t]||0)+1;
        else if(b.date>=w2) prev[t]=(prev[t]||0)+1;
      });
    });
    return Object.keys(all).map(function(t){
      return { t:t, all:all[t], now:now[t]||0, prev:prev[t]||0, d:(now[t]||0)-(prev[t]||0) };
    }).sort(function(a,b){ return b.now-a.now || b.all-a.all; });
  }

  function buzzMomentumHTML(stats){
    var moving=stats.filter(function(s){ return s.now>0 || s.prev>0; });
    if(moving.length<3) return "";
    var up=moving.filter(function(s){return s.d>0;}).sort(function(a,b){return b.d-a.d||b.now-a.now;}).slice(0,5);
    var down=moving.filter(function(s){return s.d<0;}).sort(function(a,b){return a.d-b.d||b.prev-a.prev;}).slice(0,5);
    var mx=Math.max.apply(null,moving.map(function(s){return Math.max(s.now,s.prev);}).concat([1]));
    function row(s){
      return '<li><button class="bzm-t" onclick="rtfcBuzzFilter(\''+esc(s.t).replace(/'/g,"\\'")+'\')">'+esc(s.t)+'</button>'+
        '<span class="bzm-bars"><i class="bzm-prev" style="width:'+Math.round(s.prev/mx*100)+'%"></i>'+
        '<i class="bzm-now" style="width:'+Math.round(s.now/mx*100)+'%"></i></span>'+
        '<b class="'+(s.d>0?"up":(s.d<0?"down":""))+'">'+(s.d>0?"+":"")+s.d+'</b></li>';
    }
    if(!up.length && !down.length) return "";
    return '<div class="bz-momentum">'+
      '<div class="bzm-head"><b>What the feed is doing</b>'+
        '<span>Cards per topic, last 7 days against the 7 before. This measures our feed, not the world, and it is computed from the cards themselves rather than asserted.</span></div>'+
      '<div class="bzm-cols">'+
        (up.length?'<div class="bzm-col"><div class="bzm-l">Heating up</div><ol class="bzm-list">'+up.map(row).join("")+'</ol></div>':'')+
        (down.length?'<div class="bzm-col"><div class="bzm-l">Cooling off</div><ol class="bzm-list">'+down.map(row).join("")+'</ol></div>':'')+
      '</div>'+
      '<div class="bzm-key"><span><i class="bzm-sw prev"></i>previous 7 days</span><span><i class="bzm-sw now"></i>last 7 days</span></div>'+
    '</div>';
  }

  function buzzFilterHTML(stats){
    var top=stats.filter(function(s){return s.all>=2;}).slice(0,14);
    if(top.length<4) return "";
    return '<div class="bz-filters"><span class="bzf-l">Filter</span>'+
      '<button class="bzf'+(BZ_FILTER?"":" on")+'" onclick="rtfcBuzzFilter(\'\')">Everything<em>'+BUZZ.length+'</em></button>'+
      top.map(function(s){
        return '<button class="bzf'+(BZ_FILTER===s.t?" on":"")+'" onclick="rtfcBuzzFilter(\''+esc(s.t).replace(/'/g,"\\'")+'\')">'+esc(s.t)+'<em>'+s.all+'</em></button>';
      }).join("")+'</div>';
  }
  window.rtfcBuzzFilter=function(t){
    BZ_FILTER=(BZ_FILTER===t)?"":t;
    var app=document.getElementById("app");
    if(app){ app.innerHTML=viewBuzz(); if(window.__motion) window.__motion(); window.scrollTo({top:0,behavior:"smooth"}); }
  };

  function viewBuzz(){
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over"><span class="live-dot"></span>The Buzz</div>'+
      '<h1>What the feed is arguing about</h1>'+
      '<p>The posts, launches, and hot takes making noise across the AI world — curated from labs, builders, and researchers on every newsroom run. Every card links to the original. We pick the signal; you skip the doomscroll.</p></div>';
    if(!BUZZ.length){
      return h+'<p style="color:var(--muted)">The next Buzz run fills this page.</p></div>';
    }
    var stats=bzTopicStats();
    h+=buzzMomentumHTML(stats);
    h+=buzzFilterHTML(stats);
    var FEED=BZ_FILTER
      ? BUZZ.filter(function(b){ return (b.topics||[]).indexOf(BZ_FILTER)>=0; })
      : BUZZ;
    if(BZ_FILTER){
      h+='<div class="bz-fnote">Showing <b>'+FEED.length+'</b> card'+(FEED.length===1?'':'s')+' tagged <b>'+esc(BZ_FILTER)+'</b>. '+
         '<button class="bz-clear" onclick="rtfcBuzzFilter(\'\')">Clear filter</button></div>';
      if(!FEED.length) return h+'<p style="color:var(--muted)">Nothing under that tag yet.</p></div>';
    }
    var byDay={};
    FEED.forEach(function(b){ (byDay[b.date]=byDay[b.date]||[]).push(b); });
    var days=Object.keys(byDay).sort().reverse();
    // Only the newest day with any buzz renders open, full-grid, same as before.
    // Every earlier day -- not just anything past a 7-day cutoff -- collapses
    // into a solitaire-style peek stack: one line until it's clicked open, so
    // scrolling back through weeks of buzz costs a screenful, not a scrollbar.
    days.forEach(function(day,di){
      h += di===0 ? buzzDayBlock(day,byDay[day],true) : buzzDayStack(day,byDay[day]);
    });
    h+='<p style="color:var(--muted);font-size:12.5px;margin-top:26px">Refreshed <b>on every newsroom run — three a day</b>, alongside the day\'s reporting, plus anything a breaking scan turns up in between. Today\'s cards show in full; every earlier day collapses to one line — click it to open. Curation, not syndication: cards paraphrase or briefly quote public posts and link to the source. Nothing is generated on anyone\'s behalf.</p>';
    return h+'</div>';
  }

  /* ---------- article tools: cost transparency + listen ---------- */
  function articleCost(id){
    var recs=USAGE.filter(function(r){return r.article_id===id;});
    if(!recs.length) return null;
    return sumRecs(recs);
  }
  function articleToolsHTML(a){
    var h='<div class="art-tools">';
    if(a.tldr&&a.tldr.length){
      h+='<button class="tool-btn tldr-btn" onclick="rtfcJump(\'tldr\')" aria-label="Jump to the story-at-a-glance summary">⚡ <span>TL;DR</span></button>';
    }
    if(window.speechSynthesis){
      h+='<button class="tool-btn tts-btn2" id="tts-btn" aria-pressed="false" onclick="rtfcListen(\''+a.id+'\')">▶ <span>Listen · ~'+readTime(a)+' min</span>'+
        '<i class="tts-prog" id="tts-prog" role="progressbar" aria-label="Listening progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></i></button>';
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
  var AP={kind:null,id:null,slug:null,title:"",ownHash:"#/",segs:[],chunks:[],ci:0,seg:0,playing:false,paused:false,gen:0,u:null,beat:0,tries:0};
  // House voice is British female, deliberately -- the previous priority list mixed
  // UK and US names with no accent ordering, so whichever US neural voice (aria/jenny)
  // happened to be installed won the pick() scan before libby/sonia ever got checked.
  // British names now come first as their own pass, gated additionally by lang=en-GB
  // so a same-named voice on a different locale can't slip through.
  function apVoice(){
    var vs=(window.speechSynthesis?speechSynthesis.getVoices():[])||[];
    function pick(list,names){ for(var i=0;i<names.length;i++){ var m=list.filter(function(v){return v.name.toLowerCase().indexOf(names[i])>=0;})[0]; if(m) return m; } return null; }
    var gb=vs.filter(function(v){return /^en-gb/i.test(v.lang);});
    // 1) known top-tier natural/neural British female voices (Edge/Win · Chrome · Mac/iOS)
    var bestGB=pick(gb,["libby online","sonia online","maisie online","google uk english female","serena","kate","martha","hazel","susan"]);
    if(bestGB) return bestGB;
    // 2) any British voice that isn't obviously male
    var gbF=gb.filter(function(v){return !/male|ryan online|george|thomas online|oliver|alfie|arthur online/i.test(v.name);});
    if(gbF.length) return gbF[0];
    // 3) no British voice installed on this device at all -- fall back to the best
    // available natural female voice of any English accent rather than a robotic default.
    var best=pick(vs,["aria online","jenny online","emma online","michelle online","clara online","natasha online",
      "google us english","samantha","karen","moira","tessa","fiona","ava","allison","zira"]);
    if(best) return best;
    var neural=vs.filter(function(v){return /^en/i.test(v.lang)&&/natural|online|neural/i.test(v.name);});
    if(neural.length) return neural[0];
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
    // Hold a reference: Chrome has GC'd in-flight utterances, silently killing
    // speech mid-sentence with no end/error event. AP.beat feeds the stall watchdog.
    AP.u=u; AP.beat=Date.now();
    u.onstart=function(){ AP.beat=Date.now(); };
    u.onboundary=function(){ AP.beat=Date.now(); };
    u.onend=function(){ if(myGen!==AP.gen||!AP.playing) return; AP.u=null; AP.tries=0; AP.ci++; apRender(); apSpeak(); };
    u.onerror=function(){ if(myGen!==AP.gen||!AP.playing) return; AP.u=null; AP.tries=0; AP.ci++; apSpeak(); };
    try{ speechSynthesis.speak(u); }catch(e){}
  }
  // cancel() followed synchronously by speak() gets the new utterance swallowed on
  // Chrome/Edge — always let the engine settle for a beat before speaking again.
  function apGo(){
    var g=AP.gen;
    setTimeout(function(){ if(g===AP.gen && AP.playing && !AP.paused) apSpeak(); },90);
  }
  function apStart(){
    if(!window.speechSynthesis) return;
    AP.gen++; try{speechSynthesis.cancel();}catch(e){}
    AP.playing=true; AP.paused=false; AP.tries=0; if(AP.ci>=AP.chunks.length) AP.ci=0;
    apRender(); apGo();
  }
  function apDone(){ AP.gen++; AP.u=null; AP.playing=false; AP.paused=false; AP.ci=0; try{speechSynthesis.cancel();}catch(e){} apRender(); }
  function apSeekSeg(si){
    si=Math.max(0,Math.min(AP.segs.length-1,parseInt(si,10)||0));
    var idx=-1; for(var k=0;k<AP.chunks.length;k++){ if(AP.chunks[k].seg===si){ idx=k; break; } }
    if(idx<0) return;
    AP.gen++; AP.ci=idx; AP.seg=si; try{speechSynthesis.cancel();}catch(e){}
    AP.playing=true; AP.paused=false; AP.tries=0; apRender(); apGo();
  }
  window.rtfcApStop=function(){ apDone(); };
  // Pause is implemented as cancel + re-speak the current sentence on resume.
  // Native pause()/resume() permanently kills the stream on Edge's online neural
  // voices and Chrome's network voices (the exact voices apVoice() prefers) —
  // sentence-level resume is the reliable cross-browser behavior.
  window.rtfcApToggle=function(){
    if(!window.speechSynthesis||!AP.chunks.length) return;
    if(!AP.playing && !AP.paused){ apStart(); return; }
    if(AP.paused){ AP.paused=false; AP.playing=true; apRender(); apGo(); }
    else{ AP.gen++; AP.paused=true; try{speechSynthesis.cancel();}catch(e){} apRender(); }
  };
  // Watchdog (replaces the old pause/resume "keepalive", which itself killed
  // playback on Edge online voices — often within a second of pressing play,
  // since its 8s timer was aligned to page load, not to the play click).
  // Chunks are ≤170 chars, well under Chrome's ~15s network-voice cutoff, so no
  // keepalive is needed; this only RECOVERS from a silently dead engine.
  if(window.__apKeep){ clearInterval(window.__apKeep); }
  window.__apKeep=setInterval(function(){
    if(!AP.playing || AP.paused || !window.speechSynthesis) return;
    // Chrome can flip itself into a stuck paused state on tab/audio churn.
    if(speechSynthesis.paused){ try{speechSynthesis.resume();}catch(e){} AP.beat=Date.now(); return; }
    var idle=Date.now()-(AP.beat||0);
    var deadQuiet=!speechSynthesis.speaking && !speechSynthesis.pending && idle>3000;   // died without end/error
    var deadHung=speechSynthesis.speaking && idle>20000;                                 // "speaking" but frozen
    if(deadQuiet||deadHung){
      AP.gen++; try{speechSynthesis.cancel();}catch(e){}
      AP.tries=(AP.tries||0)+1;
      if(AP.tries>=3){ AP.tries=0; AP.ci++; }        // same sentence keeps dying — skip it
      if(AP.ci>=AP.chunks.length){ apDone(); return; }
      AP.beat=Date.now(); apRender(); apGo();
    }
  },2000);
  window.rtfcListen=function(id){
    if(!window.speechSynthesis) return;
    var a=article2raw(id); if(!a) return;
    if(AP.kind==="article" && AP.id===id && (AP.playing||AP.paused)){ window.rtfcApToggle(); return; }
    var segs=[{t:a.title, text:cleanSpeech(a.title+". "+a.dek)}];
    a.body.forEach(function(b){
      if(b.text){ segs.push({t:null, text:cleanSpeech(b.text)}); return; }
      var sp=spokenComponent(b);            // instruction blocks carry no top-level text
      if(sp) segs.push({t:null, text:cleanSpeech(sp)});
    });
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
      var live=(AP.playing||AP.paused)?pct:0;
      tb.setAttribute("aria-pressed", (AP.playing&&!AP.paused)?"true":"false");
      tb.innerHTML=lbl+'<i class="tts-prog" id="tts-prog" role="progressbar" aria-label="Listening progress"'+
        ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+live+'" style="width:'+live+'%"></i>';
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
    // `(b.date>a.date?1:-1)` can never be 0, so the heat tiebreak below it was
    // unreachable AND the comparator was not a valid total order (cmp(x,y) and
    // cmp(y,x) both returned -1 for equal dates), which lets a sort produce a
    // different result depending on the engine's pivot choice. Compare properly.
    var bz=BUZZ.slice().sort(function(a,b){
      return (b.date>a.date?1:b.date<a.date?-1:0) || ((b.heat||0)-(a.heat||0));
    }).slice(0,4);
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
    // Scoreboard rows are stored in the order the Data Desk appended them, not by
    // relevance -- a brand-new, not-yet-independently-scored release (score:null,
    // almost always the newest thing that lab shipped, e.g. Claude Opus 5 on
    // launch day) could sit BELOW older, already-scored models purely because it
    // was added to the file later. A company's own dossier is asking "what do
    // they currently have", so newest-first among the unscored, then strongest-
    // first among the scored -- the opposite priority to the cross-company
    // Scoreboard (viewScoreboard), which puts unscored last because its job is
    // ranking, not currency, and says so explicitly in its own section header.
    var scoreRows=(window.RTFC_SCOREBOARD&&window.RTFC_SCOREBOARD.rows||[]).filter(function(r){ return c.re.test(r.lab+" "+r.model); });
    scoreRows=scoreRows.slice().reverse();
    scoreRows.sort(function(a,b){
      var an=typeof a.score==="number", bn=typeof b.score==="number";
      if(an!==bn) return an?1:-1;
      if(an) return b.score-a.score;
      return 0;
    });
    return {
      articles: ARTICLES.concat(GUIDES).filter(function(a){ return c.re.test(txt(a)); })
        .sort(function(a,b){ return new Date(b.publishedAt)-new Date(a.publishedAt); }),
      buzz: BUZZ.filter(function(b){ return c.re.test(b.source.name+" "+b.text+" "+(b.why||"")); }),
      score: scoreRows
    };
  }
  function viewCompanies(){
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Dossiers</div>'+
      '<h1>Everything we know, by company</h1>'+
      '<p>Living dossiers on the players that matter — every story, every Buzz card, every Scoreboard entry we\'ve published about each, auto-assembled from our own coverage and always current.</p></div>';
    h+='<div class="dossier-grid">'+COMPANIES.map(function(c){
      var m=companyMatches(c);
      return '<a class="dossier-card" href="#/company/'+c.key+'" style="--bc:'+brandColor(c.key)+'">'+
        '<div class="dc-head">'+brandMark(c.key,c.name)+'<b>'+esc(c.name)+'</b></div>'+
        '<span>'+esc(c.desc)+'</span>'+
        '<div class="dc-counts">'+m.articles.length+' '+(m.articles.length===1?'story':'stories')+' · '+
          m.buzz.length+' buzz · '+m.score.length+' '+(m.score.length===1?'model':'models')+'</div></a>';
    }).join("")+'</div>';
    return h+'</div>';
  }
  function viewCompany(key){
    var c=companyByKey(key); if(!c) return notFound();
    var m=companyMatches(c);
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px">'+
      '<div class="over"><a href="#/companies" style="color:var(--accent2)">Dossiers</a> · '+esc(c.name)+'</div>'+
      '<div class="dsr-co-head">'+brandMark(c.key,c.name,'bmark-hero')+'<h1>'+esc(c.name)+'</h1></div>'+
      '<p>'+esc(c.desc)+'</p></div>';
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
    {h:6,  name:"Morning edition", et:"6:00 AM ET",  shape:"the day's defining synthesis + supporting", star:true},
    {h:12, name:"Midday cycle",    et:"12:00 PM ET", shape:"synthesis + briefs · breaking-news window"},
    {h:18, name:"Evening cycle",   et:"6:00 PM ET",  shape:"end-of-day synthesis + brief"}
  ];
  function ctNow(){
    var p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour12:false,
      weekday:"short",hour:"numeric",minute:"numeric",second:"numeric"}).formatToParts(new Date());
    var o={}; p.forEach(function(x){o[x.type]=x.value;});
    return {wd:o.weekday, h:parseInt(o.hour,10)%24, m:parseInt(o.minute,10), s:parseInt(o.second,10)};
  }
  function nextSlot(){
    var n=ctNow();                        // 3 drops every day, 6h apart (5am/11am/5pm CT = 6/12/18 ET) — no weekend cut
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
  /* ---------- READER MAP · a real map, with real worldwide numbers ----------

     WHAT THIS REPLACED, AND WHY. The previous version drew latitude/longitude dots
     on an empty graticule -- no coastlines, no borders, nothing that read as a map --
     and, worse, it counted visits in the VISITOR'S OWN localStorage. That made it
     structurally incapable of showing what its own heading claimed: every reader saw
     exactly one lit country, their own, under the words "where the world reads from".

     Now the count lives once, server-side, in the D1 database that already backs
     accounts (functions/api/geo.js). The edge reports the country; a daily-rotating
     one-way fingerprint stops a reload from counting twice; nothing but a country
     code, a date and an integer is ever stored.

     The honest-fallback rule still governs. If /api/geo is missing or D1 is not
     bound, we do NOT silently draw the old lie -- the map switches to a state that
     says, in the caption, that it is showing this browser only. A map that overstates
     its own reach is worse than no map on a publication whose whole argument is that
     you can check everything.

     Geometry is Natural Earth country polygons in web/data/worldmap.js, loaded lazily
     because 48KB has no business on the other thirty routes. */

  var RM = { phase:"idle", geo:null, data:null, mode:"", you:"", err:"", sel:"" };
  var RM_WINDOW = 30;   // the recency window the API aggregates over, in days

  // Match the cache-buster the page was served with, so a deploy can never leave a
  // stale worldmap.js pinned in cache against a fresh app.js.
  function rmCacheBust(){
    var s=document.querySelector('script[src*="assets/app.js"]');
    var m=s&&/\?(b=\d+)/.exec(s.getAttribute("src")||"");
    return m?("?"+m[1]):"";
  }
  function rmGeometry(cb){
    if(window.RTFC_WORLDMAP){ cb(window.RTFC_WORLDMAP); return; }
    if(RM.phase==="geo"){ setTimeout(function(){ rmGeometry(cb); },120); return; }
    RM.phase="geo";
    var el=document.createElement("script");
    el.src="data/worldmap.js"+rmCacheBust();
    el.onload=function(){ RM.phase="idle"; cb(window.RTFC_WORLDMAP||null); };
    el.onerror=function(){ RM.phase="idle"; cb(null); };
    document.head.appendChild(el);
  }

  /* Local tally. This is now ONLY the fallback for when the API is unavailable, and
     it is labelled as such wherever it is used. It is never merged into the global
     numbers -- mixing "the world" with "this browser" is exactly the confusion the
     rewrite exists to end. */
  function geoLocal(){
    var raw; try{ raw=JSON.parse(localStorage.getItem("rtfc-geo")||"{}"); }catch(e){ return {}; }
    var g={};
    for(var k in raw){ if(!raw.hasOwnProperty(k)) continue;
      var v=raw[k];
      if(typeof v==="number") g[k]={n:v,r:v,last:""};
      else if(v&&typeof v==="object") g[k]={n:v.n||0,r:v.n||0,last:v.last?new Date(v.last).toISOString().slice(0,10):""};
    }
    return g;
  }
  function geoLocalBump(cc){
    try{
      var raw=JSON.parse(localStorage.getItem("rtfc-geo")||"{}"), prev=raw[cc];
      var n=(typeof prev==="number"?prev:(prev&&prev.n)||0)+1;
      raw[cc]={n:n,last:Date.now()};
      localStorage.setItem("rtfc-geo",JSON.stringify(raw));
    }catch(e){}
  }

  /* Called once at boot, and again the moment a reader accepts the notice. POSTs at
     most once per browser session (the session guard is the client half of the dedup;
     the server half is the fingerprint).

     CONSENT GATE: "Essential only" and "Got it" used to be the same button — both
     wrote rtfc-consent and the only reader of that key checked presence, so the
     /api/geo beacon fired either way. It is gated on an explicit "ok" now: no
     choice yet means no beacon, and "Essential only" means never. The reader map
     still renders (rmLoad GETs the aggregate); it just does not count you. */
  function consentOK(){
    try{ return localStorage.getItem("rtfc-consent")==="ok"; }catch(e){ return false; }
  }
  function logVisit(){
    if(!window.fetch) return;
    if(!consentOK()) return;
    var done=false;
    try{ done=!!sessionStorage.getItem("rtfc-geo-hit"); }catch(e){}
    if(done) return;
    try{ sessionStorage.setItem("rtfc-geo-hit","1"); }catch(e){}
    fetch("/api/geo",{method:"POST",headers:{"content-type":"application/json"},body:"{}"})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(j){
        if(j&&j.ok){ RM.data=j; RM.mode="live"; RM.you=j.you||""; if(document.getElementById("rm-wrap")) rmPaint(); return; }
        rmLocalTrace();                      // API not configured -- keep the honest local tally alive
      })
      .catch(function(){ rmLocalTrace(); });
  }
  // Fallback path only: ask Cloudflare's own edge trace for this visitor's country
  // (no third party, no cookie) so the local-only map still knows where it is.
  function rmLocalTrace(){
    fetch("/cdn-cgi/trace").then(function(r){ return r.ok?r.text():""; }).then(function(t){
      var m=/(?:^|\n)loc=([A-Z]{2})/.exec(t||""); if(!m) return;
      RM.you=m[1]; geoLocalBump(m[1]);
      if(document.getElementById("rm-wrap")) rmPaint();
    }).catch(function(){});
  }

  function rmLoad(cb){
    fetch("/api/geo").then(function(r){ return r.ok?r.json():null; }).then(function(j){
      if(j&&j.ok){ RM.data=j; RM.mode="live"; }
      else { RM.mode="local"; }
      cb();
    }).catch(function(){ RM.mode="local"; cb(); });
  }

  /* Five-step sequential ramp, one hue, validated against both surfaces with the
     dataviz ordinal checks (monotone lightness, adjacent dL >= 0.06, light end
     clears 2:1 on surface, single hue). Land with NO readers is not a step on this
     ramp -- it is the substrate, and stays deliberately recessive. */
  function rmStep(n,max){
    if(!(n>0)) return 0;
    if(max<=1) return 5;
    var f=Math.log(1+n)/Math.log(1+max);
    return Math.max(1,Math.min(5,Math.ceil(f*5)));
  }
  function rmCountries(){
    if(RM.mode==="live" && RM.data && RM.data.countries) return RM.data.countries;
    return geoLocal();
  }

  function readerMapHTML(){
    // Shell only. Real numbers arrive from /api/geo and the geometry is fetched
    // lazily, so the first paint must stand on its own rather than flash an empty
    // map -- initReaderMap() fills #rm-wrap in place.
    return '<div class="kicker" style="margin-top:34px"><span class="dotc" style="background:var(--accent)"></span>Reader map · where the world reads from</div>'+
      '<div class="readermap" id="rm-wrap"><div class="rm-load">Loading the map…</div></div>';
  }

  function rmPaint(){
    var wrap=document.getElementById("rm-wrap"); if(!wrap) return;
    var W=window.RTFC_WORLDMAP;
    if(!W){ wrap.innerHTML='<div class="rm-load">The map geometry didn’t load. Everything else on this page is unaffected.</div>'; return; }

    var C=rmCountries(), live=(RM.mode==="live");
    var codes=Object.keys(C).filter(function(k){ return (C[k].n||0)>0; });
    var total=codes.reduce(function(n,k){ return n+(C[k].n||0); },0);
    var recent=codes.reduce(function(n,k){ return n+(C[k].r||0); },0);
    var maxN=codes.reduce(function(m,k){ return Math.max(m,C[k].n||0); },0);

    // ---- the map itself -------------------------------------------------
    var paths=[], meta=W.meta;
    for(var cc in W.paths){ if(!W.paths.hasOwnProperty(cc)) continue;
      var m=meta[cc]||{}, rec=C[cc], n=rec?(rec.n||0):0, s=rmStep(n,maxN);
      var cls="rmc s"+s+(cc===RM.you?" rm-you":"")+(cc===RM.sel?" rm-sel":"");
      var lbl=(m.n||cc)+(n?(" · "+n+" visit"+(n===1?"":"s")):" · no visits recorded");
      paths.push('<path class="'+cls+'" d="'+W.paths[cc]+'" data-cc="'+cc+'" tabindex="'+(n?"0":"-1")+'" role="img" aria-label="'+esc(lbl)+'"><title>'+esc(lbl)+'</title></path>');
    }
    // Direct labels on the top three, so identity never rests on colour alone.
    var top=codes.slice().sort(function(a,b){ return (C[b].n||0)-(C[a].n||0); });
    var labels=top.slice(0,3).map(function(cc){
      var m=meta[cc]; if(!m) return "";
      return '<g class="rml"><text x="'+m.x+'" y="'+m.y+'" class="rml-t">'+esc(m.n)+'</text>'+
             '<text x="'+m.x+'" y="'+(m.y+11)+'" class="rml-n">'+(C[cc].n||0)+'</text></g>';
    }).join("");

    var svg='<svg class="rm-svg" viewBox="0 0 '+W.w+' '+W.h+'" preserveAspectRatio="xMidYMid meet" role="group" aria-label="World map of visits by country">'+
      paths.join("")+labels+'</svg>';

    // ---- continent rollup: the regional read the old version had no way to give --
    var byCont={};
    codes.forEach(function(cc){
      var m=meta[cc]; if(!m) return;
      byCont[m.c]=(byCont[m.c]||0)+(C[cc].n||0);
    });
    var contRows=Object.keys(byCont).sort(function(a,b){ return byCont[b]-byCont[a]; }).map(function(k){
      var pct=total?Math.round(byCont[k]/total*100):0;
      return '<li><span class="rmc-n">'+esc(k)+'</span><span class="rmc-bar"><i style="width:'+pct+'%"></i></span><b>'+pct+'%</b></li>';
    }).join("");

    var topRows=top.slice(0,8).map(function(cc){
      var m=meta[cc]||{}, n=C[cc].n||0, pct=total?Math.round(n/total*100):0;
      return '<li'+(cc===RM.you?' class="is-you"':'')+'><span class="rm-cc">'+esc(m.n||cc)+(cc===RM.you?'<em>you</em>':'')+'</span>'+
        '<span class="rm-bar"><i style="width:'+(maxN?Math.round(n/maxN*100):0)+'%"></i></span><b>'+n+'</b><span class="rm-pct">'+pct+'%</span></li>';
    }).join("");

    // ---- legend, keyed to actual visit counts rather than abstract "heat" -------
    var legend='<div class="rm-legend"><span class="rml-k">visits</span>'+
      [1,2,3,4,5].map(function(s){
        var lo=Math.max(1,Math.round(Math.pow(1+maxN,(s-1)/5)-1)+(s>1?1:0));
        var hi=Math.round(Math.pow(1+maxN,s/5)-1);
        return '<span class="rm-lgi"><i class="rm-sw s'+s+'"></i>'+(maxN?(hi<=lo?String(lo):lo+"–"+hi):"—")+'</span>';
      }).join("")+
      '<span class="rm-lgi"><i class="rm-sw s0"></i>none yet</span></div>';

    // ---- the caption. This is the part that must never overstate. --------------
    var cap;
    if(live && total){
      cap='<b>'+total+' visit'+(total===1?"":"s")+'</b> from <b>'+codes.length+' countr'+(codes.length===1?"y":"ies")+'</b>'+
          (recent?(' · '+recent+' in the last '+RM_WINDOW+' days'):'')+
          (RM.data&&RM.data.firstDay?(' · counting since '+esc(RM.data.firstDay)):'')+
          '. Counted once per visitor per day at Cloudflare’s edge. Country code, date, and a running total is the entire record: no IP is stored, no cookie is set, and a signed-in reader looks identical to an anonymous one.';
    } else if(live){
      cap='No visits recorded yet. The counter is live and every country above is drawn from real geography — it fills in as people arrive, and nothing here is seeded or simulated.';
    } else {
      cap='<b>Showing this browser only.</b> The worldwide counter (<code>/api/geo</code>) isn’t reachable right now, so rather than draw a global map from one machine’s history, the map is telling you exactly what it can see. Country-level, stored on your device, never sent anywhere.';
    }

    wrap.innerHTML=
      '<div class="rm-figure">'+svg+'<div class="rm-info" id="rm-info" aria-live="polite">'+
        (RM.you&&meta[RM.you]?('Reading from <b>'+esc(meta[RM.you].n)+'</b>'):'Hover or tap a country')+
      '</div></div>'+
      legend+
      '<div class="rm-panels">'+
        '<div class="rm-panel"><div class="rm-pt">Most-read countries</div><ol class="rm-top">'+(topRows||'<li class="rm-none">Nothing recorded yet</li>')+'</ol></div>'+
        '<div class="rm-panel"><div class="rm-pt">By continent</div><ol class="rm-conts">'+(contRows||'<li class="rm-none">Nothing recorded yet</li>')+'</ol></div>'+
      '</div>'+
      '<div class="rm-cap">'+cap+'</div>';

    // Hover/focus/tap all drive the same one-line readout: no floating tooltip to
    // mis-position on a phone, and it works from the keyboard.
    var info=document.getElementById("rm-info");
    function say(cc){
      var m=meta[cc]; if(!m||!info) return;
      var n=(C[cc]&&C[cc].n)||0;
      info.innerHTML='<b>'+esc(m.n)+'</b> · '+esc(m.c)+' · '+(n?(n+' visit'+(n===1?"":"s")):'no visits recorded');
    }
    wrap.querySelectorAll("path.rmc").forEach(function(p){
      p.addEventListener("mouseenter",function(){ say(p.getAttribute("data-cc")); });
      p.addEventListener("focus",function(){ say(p.getAttribute("data-cc")); });
      p.addEventListener("click",function(){ RM.sel=p.getAttribute("data-cc"); say(RM.sel);
        wrap.querySelectorAll("path.rm-sel").forEach(function(o){ o.classList.remove("rm-sel"); });
        p.classList.add("rm-sel"); });
    });
  }

  function initReaderMap(){
    var wrap=document.getElementById("rm-wrap"); if(!wrap) return;
    if(wrap.getAttribute("data-init")==="1"){ rmPaint(); return; }
    wrap.setAttribute("data-init","1");
    rmGeometry(function(){
      if(RM.data){ rmPaint(); return; }              // POST already answered at boot
      rmLoad(function(){ rmPaint(); });
    });
  }

  /* ---------- THE GRID · a world map of who runs the physical machines ----------

     Every other page here is about the models. This one is about the buildings:
     the datacenters actually training and serving them, who operates each one,
     and -- because "operator" and "the company whose name is on the model" are
     often two different companies (see Project Rainier below) -- who the primary
     tenant is when that's known and different from the operator.

     Same honesty discipline as the Reader Map above: a pin is a city, not a street
     address; construction `status` (operating/building/announced) is tracked
     separately from `confidence` in the reported details (confirmed/reported/
     early); and where the data desk doesn't have a specific site, the card says so
     instead of guessing at a precise dot (see mistral-france in web/data/grid.js).

     Geometry is the SAME lazily-loaded web/data/worldmap.js the Reader Map uses --
     rmGeometry() is shared rather than duplicated, so there is exactly one loader
     and one in-flight guard (RM.phase) for that 48KB file regardless of which
     feature asks for it first. */

  function geoToXY(lat,lng,W){
    W = W || window.RTFC_WORLDMAP || {w:1000,h:391.7};
    return { x:(lng+180)/360*W.w, y:(84-lat)/141*(W.h||391.7) };
  }
  var GD = { sel:null };
  var GD_STATUS = { operating:{label:"Operating", v:"--ok"}, building:{label:"Under construction", v:"--gold"}, announced:{label:"Announced", v:"--accent2"} };
  var GD_CONF = { confirmed:"Confirmed by multiple sources", reported:"Publicly reported, not independently re-verified by this newsroom", early:"Early/provisional — treat the specifics as unconfirmed" };

  function gdSeenGet(){
    try{ return JSON.parse(localStorage.getItem("rtfc-grid-seen")||"null"); }catch(e){ return null; }
  }
  function gdSeenSave(ids){
    try{ localStorage.setItem("rtfc-grid-seen", JSON.stringify({ids:ids, at:Date.now()})); }catch(e){}
  }
  // A first-ever visit has nothing to compare against, so it seeds the baseline
  // silently (see gdMarkAllSeen) rather than announcing all 25 facilities as
  // "new" -- only a site confirmed AFTER a reader's first visit should ever
  // read as new to them.
  function gdNewIds(){
    var all=(GRID.facilities||[]).map(function(f){return f.id;});
    var seen=gdSeenGet();
    if(!seen) return [];
    var have={}; (seen.ids||[]).forEach(function(id){ have[id]=1; });
    return all.filter(function(id){ return !have[id]; });
  }
  function gdMarkAllSeen(){
    gdSeenSave((GRID.facilities||[]).map(function(f){return f.id;}));
  }

  // Personal alert channel -- same honestly-labelled prototype pattern as
  // rtfcNewsletter()/newsletterHTML(): a real opt-in, stored in this browser only,
  // said plainly rather than implied.
  window.rtfcGridAlert=function(){
    var el=document.getElementById("gd-email"); var v=(el&&el.value||"").trim();
    var box=document.getElementById("gd-msg");
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)){ if(box){box.textContent="Enter a valid email.";box.className="nl-msg err";} return; }
    try{ var subs=JSON.parse(localStorage.getItem("rtfc-grid-alerts")||"[]"); if(subs.indexOf(v)<0){subs.push(v);localStorage.setItem("rtfc-grid-alerts",JSON.stringify(subs));} }catch(e){}
    if(box){ box.textContent="You’re on the list — one email the moment a new facility is confirmed, nothing else. (Prototype: stored in this browser; the real send goes live with the public site.)"; box.className="nl-msg ok"; }
    if(el) el.value="";
  };
  function gdAlertHTML(){
    return '<div class="nl-card compact gd-alert"><div class="nl-copy"><b>Get a personal alert</b><span>One email when the data desk confirms a new facility. No digest, no schedule — just that.</span></div>'+
      '<div class="nl-form"><input id="gd-email" type="email" placeholder="you@example.com" autocomplete="email">'+
      '<button class="cta" onclick="rtfcGridAlert()">Alert me</button></div>'+
      '<p class="nl-msg" id="gd-msg"></p></div>';
  }

  function gridHTML(){
    // Shell only, same pattern as readerMapHTML(): geometry loads lazily and
    // initGrid() fills #grid-wrap in place once it arrives.
    return '<div class="gridmap" id="grid-wrap"><div class="rm-load">Loading the map…</div></div>';
  }

  function gdFacility(id){
    var m=(GRID.facilities||[]).filter(function(f){ return f.id===id; });
    return m[0]||null;
  }

  function gdDetailHTML(f){
    if(!f) return '<div class="gd-empty">Hover or tap a pin — or a row in the list below — for the full picture.</div>';
    var st=GD_STATUS[f.status]||{label:f.status,v:"--muted"};
    var op=f.operatorKey ? ('<a href="#/company/'+f.operatorKey+'">'+esc(f.operatorLabel||f.operatorKey)+'</a>') : esc(f.operatorLabel||"Unnamed operator");
    var tenant=f.tenantKey ? ('<div class="gd-tenant">Primary tenant: <a href="#/company/'+f.tenantKey+'">'+esc(f.tenantLabel||f.tenantKey)+'</a></div>')
      : (f.tenantLabel ? '<div class="gd-tenant">'+esc(f.tenantLabel)+'</div>' : '');
    var flinks=f.operatorKey?followLinks(f.operatorKey):null;
    var follow=flinks?('<div class="lab-follow">'+flinks.map(function(l){
        var ext=/^https?:/.test(l.url);
        return '<a href="'+safeHref(l.url)+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+esc(l.label)+(ext?' ↗':'')+'</a>';
      }).join("")+'</div>'):'';
    return '<div class="gd-card">'+
      '<div class="gd-card-top"><span class="gd-dot" style="background:var('+st.v+')"></span><span class="gd-st">'+esc(st.label)+'</span>'+
      '<span class="gd-conf" title="'+esc(GD_CONF[f.confidence]||"")+'">'+esc(f.confidence)+'</span></div>'+
      '<h3>'+esc(f.name)+'</h3>'+
      '<div class="gd-place">'+esc(f.place)+'</div>'+
      '<div class="gd-op">'+op+'</div>'+tenant+
      (f.scale?('<p class="gd-scale">'+esc(f.scale)+'</p>'):'')+
      '<p class="gd-blurb">'+esc(f.blurb)+'</p>'+follow+
      '<div class="gd-added">Data desk last confirmed this row '+when(f.addedAt)+'</div>'+
      '</div>';
  }

  function gdListHTML(){
    var facilities=(GRID.facilities||[]).slice();
    var byRegion={};
    facilities.forEach(function(f){ (byRegion[f.region]=byRegion[f.region]||[]).push(f); });
    var newSet={}; gdNewIds().forEach(function(id){ newSet[id]=1; });
    var order=["North America","Europe","Middle East","Asia-Pacific"].filter(function(r){return byRegion[r];});
    Object.keys(byRegion).forEach(function(r){ if(order.indexOf(r)<0) order.push(r); });
    return '<div class="gd-panels">'+order.map(function(region){
      var rows=byRegion[region].slice().sort(function(a,b){ return a.name.localeCompare(b.name); });
      return '<div class="gd-region"><div class="gd-region-h">'+esc(region)+'<span>'+rows.length+'</span></div>'+
        rows.map(function(f){
          var st=GD_STATUS[f.status]||{v:"--muted"};
          return '<div class="gd-row'+(f.id===GD.sel?" gd-sel":"")+(newSet[f.id]?" gd-new":"")+'" data-id="'+f.id+'" tabindex="0">'+
            '<span class="gd-row-dot" style="background:var('+st.v+')"></span>'+
            '<span class="gd-row-name">'+esc(f.name)+(newSet[f.id]?'<em>new</em>':'')+'</span>'+
            '<span class="gd-row-place">'+esc(f.place)+'</span></div>';
        }).join("")+
      '</div>';
    }).join("")+'</div>';
  }

  function gdPaint(){
    var wrap=document.getElementById("grid-wrap"); if(!wrap) return;
    var W=window.RTFC_WORLDMAP;
    if(!W){ wrap.innerHTML='<div class="rm-load">The map geometry didn’t load. The list below still has everything.</div>'+gdListHTML(); return; }

    var facilities=GRID.facilities||[];
    var paths=[];
    for(var cc in W.paths){ if(!W.paths.hasOwnProperty(cc)) continue;
      paths.push('<path class="gdc" d="'+W.paths[cc]+'"></path>');
    }
    var pins=facilities.map(function(f){
      var p=geoToXY(f.lat,f.lng,W), st=GD_STATUS[f.status]||{v:"--muted"};
      var cls="gd-pin"+(f.id===GD.sel?" gd-sel":"");
      return '<circle class="'+cls+'" cx="'+p.x.toFixed(2)+'" cy="'+p.y.toFixed(2)+'" r="'+(f.id===GD.sel?"6.5":"4.5")+'" '+
        'style="fill:var('+st.v+')" data-id="'+f.id+'" tabindex="0" role="img" aria-label="'+esc(f.name+" — "+f.place)+'"><title>'+esc(f.name+" — "+f.place)+'</title></circle>';
    }).join("");
    var svg='<svg class="gd-svg" viewBox="0 0 '+W.w+' '+W.h+'" preserveAspectRatio="xMidYMid meet" role="group" aria-label="World map of AI datacenters">'+
      paths.join("")+pins+'</svg>';

    var legend='<div class="rm-legend gd-legend">'+
      Object.keys(GD_STATUS).map(function(k){ return '<span class="rm-lgi"><i class="gd-sw" style="background:var('+GD_STATUS[k].v+')"></i>'+esc(GD_STATUS[k].label)+'</span>'; }).join("")+
      '</div>';

    wrap.innerHTML=
      '<div class="rm-figure gd-figure">'+svg+'</div>'+
      legend+
      '<div id="gd-detail">'+gdDetailHTML(gdFacility(GD.sel))+'</div>'+
      gdListHTML();

    function select(id){
      GD.sel=id;
      wrap.querySelectorAll(".gd-pin").forEach(function(c){
        var on=c.getAttribute("data-id")===id;
        c.classList.toggle("gd-sel",on);
        c.setAttribute("r", on?"6.5":"4.5");
      });
      wrap.querySelectorAll(".gd-row").forEach(function(r){ r.classList.toggle("gd-sel", r.getAttribute("data-id")===id); });
      var det=document.getElementById("gd-detail"); if(det) det.innerHTML=gdDetailHTML(gdFacility(id));
    }
    function detScroll(){
      var det=document.getElementById("gd-detail");
      if(det && window.innerWidth<860) det.scrollIntoView({behavior:"smooth",block:"nearest"});
    }
    wrap.querySelectorAll(".gd-pin").forEach(function(c){
      c.addEventListener("mouseenter",function(){ select(c.getAttribute("data-id")); });
      c.addEventListener("focus",function(){ select(c.getAttribute("data-id")); });
      c.addEventListener("click",function(){ select(c.getAttribute("data-id")); detScroll(); });
    });
    wrap.querySelectorAll(".gd-row").forEach(function(r){
      r.addEventListener("click",function(){ select(r.getAttribute("data-id")); detScroll(); });
      r.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); select(r.getAttribute("data-id")); detScroll(); } });
    });
  }

  function initGrid(){
    var wrap=document.getElementById("grid-wrap"); if(!wrap) return;
    if(wrap.getAttribute("data-init")==="1"){ return; }
    wrap.setAttribute("data-init","1");
    rmGeometry(function(){ gdPaint(); gdMarkAllSeen(); });
  }

  function viewGrid(){
    var facilities=GRID.facilities||[];
    var nOperating=facilities.filter(function(f){return f.status==="operating";}).length;
    var nCountries={}; facilities.forEach(function(f){ nCountries[f.place.split(", ").pop()]=1; });
    var nCompanies={}; facilities.forEach(function(f){ if(f.operatorKey) nCompanies[f.operatorKey]=1; });
    var newIds=gdNewIds();
    var h='<div class="container"><div class="mast-hero" style="padding-bottom:4px"><div class="over">Resources · The Grid</div>'+
      '<h1>Every datacenter running these models, mapped</h1>'+
      '<p>The physical layer underneath every headline on this site: who operates each site, who the primary tenant is when that differs from the operator, and how sure we are of the details. '+esc(GRID.cadence||"")+'</p></div>';

    if(newIds.length){
      h+='<div class="gd-newbar"><b>'+newIds.length+' facilit'+(newIds.length===1?"y":"ies")+' new since your last visit.</b> They\'re marked in the list below.</div>';
    }

    h+='<div class="res-stats">'+
      '<div class="rs-cell"><b>'+facilities.length+'</b><span>facilities tracked</span></div>'+
      '<div class="rs-cell"><b>'+nOperating+'</b><span>confirmed operating</span></div>'+
      '<div class="rs-cell"><b>'+Object.keys(nCountries).length+'</b><span>countries</span></div>'+
      '<div class="rs-cell"><b>'+Object.keys(nCompanies).length+'</b><span>companies with a dossier here</span></div>'+
    '</div>';

    h+=gridHTML();
    h+='<div style="margin-top:22px">'+gdAlertHTML()+'</div>';
    h+='<p class="rm-cap gd-method">'+esc(GRID.methodology||"")+' Updated '+esc(GRID.updated||"")+'. Something wrong or missing? <a href="#/contact" style="color:var(--accent2)">Tell the newsroom</a>.</p>';
    return h+'</div>';
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
    h+='<p style="color:var(--muted);font-size:12.5px;margin:10px 0 30px">All three slots run every day, weekends included. A slot with nothing worth saying publishes nothing — that’s policy, not failure.</p>';
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
  /* ---------- THE FRONTIER · price against strength, with the Pareto boundary ----
     The bar pairs above answer "which is strongest" and "which is best value" one
     model at a time. They cannot answer the question a buyer actually has, which is
     positional: given what I'm willing to spend, what is the most capable thing I
     can get, and what am I giving up by going cheaper?

     A scatter with the efficient frontier drawn answers that in one look. A model is
     ON the frontier when nothing else on the board is BOTH at least as strong AND at
     least as cheap. Everything below the staircase is dominated: there is a listed
     model that beats it on price and on score at the same time, which is a hard
     verdict the bar chart can state about no one.

     Zero tokens. Every number is already in scoreboard.js; the geometry is derived
     at render, so the chart cannot go stale relative to the board beneath it. */

  function frontierSet(rows){
    // Pareto-optimal for (max score, min output price). O(n^2) over ~15 rows.
    return rows.filter(function(r){
      return !rows.some(function(o){
        if(o===r) return false;
        var noWorse = o.score>=r.score && o.pout<=r.pout;
        var better  = o.score>r.score || o.pout<r.pout;
        return noWorse && better;
      });
    }).sort(function(a,b){ return a.pout-b.pout; });
  }

  function frontierHTML(scored){
    if(scored.length<4) return "";                    // below this a scatter says nothing a list doesn't
    var W=720,H=390,ML=52,MR=18,MT=16,MB=52;
    var pw=W-ML-MR, ph=H-MT-MB;

    var prices=scored.map(function(r){return r.pout;}), sc=scored.map(function(r){return r.score;});
    var xlo=Math.min.apply(null,prices)*0.72, xhi=Math.max.apply(null,prices)*1.42;
    var ylo=Math.floor((Math.min.apply(null,sc)-3)/2)*2, yhi=Math.ceil((Math.max.apply(null,sc)+3)/2)*2;
    var lx0=Math.log(xlo), lx1=Math.log(xhi);
    function X(p){ return ML + (Math.log(p)-lx0)/(lx1-lx0)*pw; }
    function Y(s){ return MT + (1-(s-ylo)/(yhi-ylo))*ph; }

    var front=frontierSet(scored), onFront={};
    front.forEach(function(r){ onFront[r.model+"|"+(r.mode||"")]=1; });
    function isFront(r){ return !!onFront[r.model+"|"+(r.mode||"")]; }

    // ---- axes. Log x, so the ticks are the round numbers a price list uses. ----
    var xt=[0.5,1,2,3,5,10,20,30,50,100,200].filter(function(v){ return v>=xlo && v<=xhi; });
    if(xt.length<3) xt=[xlo,Math.sqrt(xlo*xhi),xhi];
    var grid=xt.map(function(v){
      return '<line class="fr-g" x1="'+X(v).toFixed(1)+'" y1="'+MT+'" x2="'+X(v).toFixed(1)+'" y2="'+(MT+ph)+'"/>'+
             '<text class="fr-ax" x="'+X(v).toFixed(1)+'" y="'+(MT+ph+20)+'" text-anchor="middle">$'+v+'</text>';
    }).join("");
    var yt=[]; for(var s=ylo;s<=yhi;s+=Math.max(2,Math.round((yhi-ylo)/5/2)*2)) yt.push(s);
    grid+=yt.map(function(v){
      return '<line class="fr-g" x1="'+ML+'" y1="'+Y(v).toFixed(1)+'" x2="'+(ML+pw)+'" y2="'+Y(v).toFixed(1)+'"/>'+
             '<text class="fr-ax" x="'+(ML-9)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end">'+v+'</text>';
    }).join("");

    // ---- the frontier staircase. Steps, not a smoothed line: between two listed
    // models nothing exists, and a diagonal would imply something does. ---------
    var stair="";
    if(front.length>1){
      var d="M"+X(front[0].pout).toFixed(1)+","+Y(front[0].score).toFixed(1);
      for(var i=1;i<front.length;i++){
        d+="H"+X(front[i].pout).toFixed(1)+"V"+Y(front[i].score).toFixed(1);
      }
      stair='<path class="fr-stair" d="'+d+'"/>';
    }

    // ---- marks. Dominated points first so the frontier always sits on top. ----
    function dot(r,front){
      var x=X(r.pout).toFixed(1), y=Y(r.score).toFixed(1);
      var lab=r.model+(r.mode?(" · "+r.mode):"");
      return '<g class="fr-pt'+(front?" is-front":"")+'" data-lab="'+esc(lab)+'" data-lab2="'+esc(r.lab)+'" data-p="'+r.pout+'" data-s="'+r.score+'" tabindex="0" role="img" aria-label="'+esc(lab+", "+r.score+" points, $"+r.pout+" per million output tokens")+'">'+
        '<circle class="fr-hit" cx="'+x+'" cy="'+y+'" r="15"/>'+
        '<circle class="fr-dot" cx="'+x+'" cy="'+y+'" r="'+(front?7:5.5)+'"/>'+
        '<title>'+esc(lab+" — "+r.score+" pts at $"+r.pout+"/M out")+'</title></g>';
    }
    var marks=scored.filter(function(r){return !isFront(r);}).map(function(r){return dot(r,false);}).join("")+
              front.map(function(r){return dot(r,true);}).join("");

    // ---- direct labels on the frontier only. This is also the relief channel the
    // palette validator requires for the gold in light mode. Alternate above/below
    // so two adjacent frontier points can't stack their text. ------------------
    var labels=front.map(function(r,i){
      var x=X(r.pout), y=Y(r.score), up=(i%2===0);
      var ty=up?(y-14):(y+22);
      var anchor = x>ML+pw-90 ? "end" : (x<ML+70 ? "start" : "middle");
      var dx = anchor==="end" ? -2 : (anchor==="start" ? 2 : 0);
      return '<text class="fr-lab" x="'+(x+dx).toFixed(1)+'" y="'+ty.toFixed(1)+'" text-anchor="'+anchor+'">'+esc(r.model)+'</text>';
    }).join("");

    var dominated=scored.length-front.length;
    var cheapestFront=front[0], strongestFront=front[front.length-1];

    return '<div class="fr-wrap">'+
      '<div class="fr-head"><div><b>The efficient frontier</b><span>Nothing on this board is both cheaper and stronger than a model on the staircase. Everything under it is matched or beaten on both counts at once.</span></div></div>'+
      '<div class="fr-legend"><span><i class="fr-sw front"></i>on the frontier · '+front.length+'</span>'+
        '<span><i class="fr-sw dom"></i>matched or beaten on price <em>and</em> strength · '+dominated+'</span>'+
        '<span class="fr-axl">↑ stronger · → more expensive per million output tokens</span></div>'+
      '<div class="fr-plot"><svg viewBox="0 0 '+W+' '+H+'" class="fr-svg" role="group" aria-label="Independent index score against output price, log scale, with the efficient frontier">'+
        grid+stair+marks+labels+
        '<text class="fr-axt" x="'+(ML+pw/2)+'" y="'+(H-8)+'" text-anchor="middle">output price · $ per million tokens · log scale</text>'+
        '<text class="fr-axt" transform="translate(13,'+(MT+ph/2)+') rotate(-90)" text-anchor="middle">independent index score</text>'+
      '</svg></div>'+
      '<div class="fr-read" id="fr-read" aria-live="polite">Hover or tap a point for its numbers.</div>'+
      '<p class="fr-cap"><b>'+front.length+' of '+scored.length+'</b> scored models sit on the frontier'+
        (cheapestFront&&strongestFront&&cheapestFront!==strongestFront
          ? (', from '+esc(cheapestFront.model)+' at '+priceStr(cheapestFront,"out")+'/M ('+cheapestFront.score+' pts) up to '+esc(strongestFront.model)+' at '+priceStr(strongestFront,"out")+'/M ('+strongestFront.score+' pts)')
          : '')+
        '. The other '+dominated+' are dominated: for each one there is a model on this board that is <em>at least as strong and no more expensive</em> — strictly better on one of the two and worse on neither — so paying for it buys nothing the board can measure. '+
        'Prices are list output prices; a model can still earn its place on latency, context length, or a licence the index does not score.</p>'+
    '</div>';
  }

  function initFrontier(){
    var read=document.getElementById("fr-read"); if(!read) return;
    if(read.getAttribute("data-init")==="1") return;
    read.setAttribute("data-init","1");
    document.querySelectorAll(".fr-pt").forEach(function(g){
      function say(){
        read.innerHTML='<b>'+esc(g.getAttribute("data-lab"))+'</b> · '+esc(g.getAttribute("data-lab2"))+
          ' · <b>'+g.getAttribute("data-s")+'</b> pts at <b>$'+g.getAttribute("data-p")+'</b>/M out'+
          (g.classList.contains("is-front")?' · <em>on the frontier</em>':' · matched or beaten on both counts');
      }
      g.addEventListener("mouseenter",say);
      g.addEventListener("focus",say);
      g.addEventListener("click",say);
    });
  }

  function priceStr(r,which){ var p=which==="in"?r.pin:r.pout; return (r.est?"~$":"$")+p; }
  function viewScoreboard(){
    var SB=window.RTFC_SCOREBOARD||{updated:"",rows:[]};
    var col=SECTION_COLORS.Compute||"#6cb6f0";
    var scored=SB.rows.filter(function(r){return r.score!=null && r.pout!=null;});
    var other=SB.rows.filter(function(r){return r.score==null || r.pout==null;});
    scored.forEach(function(r){ r._val=r.score/r.pout; });
    var maxScore=Math.max.apply(null,scored.map(function(r){return r.score;}).concat([1]));
    var maxVal=Math.max.apply(null,scored.map(function(r){return r._val;}).concat([0.01]));
    // Every headline insight below reads .model/.score off scored[0]. When no row
    // carries BOTH a score and an output price (a fresh board, or a board where the
    // Data Desk has listed models but nothing independent has scored them yet),
    // scored is empty and these are undefined — which used to throw and blank the
    // whole page. The unscored table underneath is still worth rendering, so bail
    // to it with an honest empty state instead of dying.
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
    // NOTE: .sb-updated is a flex row. ALL prose must live inside ONE element —
    // bare text mixed with <b> tags becomes multiple anonymous flex items that
    // lay out as broken side-by-side columns (this shipped broken for weeks).
    h+='<div class="sb-updated"><span class="sbu-dot"></span><span class="sbu-t">Last updated <b>'+esc(SB.updated||"—")+'</b> · the Data Desk reviews the board <b>on every newsroom run</b> and moves a score only when independent benchmarks move — never a lab\'s own number. A model is listed as soon as it ships, but stays <b>unmeasured</b> until an independent aggregate scores it, rather than being ranked on the vendor\'s own claim.</span></div>';
    // headline insights — only when there is something to headline.
    if(smartest && bestVal && cheapest){
      h+='<div class="sb-insights">'+
        '<div class="sb-ins"><span class="si-k">Smartest</span><b>'+esc(smartest.model)+'</b><span class="si-s">'+smartest.score+' on the index · '+esc(smartest.lab)+'</span></div>'+
        '<div class="sb-ins"><span class="si-k">Best value</span><b>'+esc(bestVal.model)+'</b><span class="si-s">'+bestVal.score+' pts at '+priceStr(bestVal,"out")+'/M out</span></div>'+
        '<div class="sb-ins"><span class="si-k">Cheapest</span><b>'+esc(cheapest.model)+'</b><span class="si-s">'+priceStr(cheapest,"out")+' / M out · scores '+cheapest.score+'</span></div></div>';
    } else {
      h+='<div class="empty-state"><span class="es-mark">◈</span>'+
        '<div><b>Nothing on the board carries both a score and a price yet.</b>'+
        '<span>A model is listed here the day it ships, but it stays unmeasured until an independent aggregate scores it — we never rank on a lab’s own number. The strength-and-value view appears the moment the first independent score lands'+
        (other.length?(', for any of the '+other.length+' model'+(other.length===1?'':'s')+' listed below'):'')+'.</span></div>'+
        '<a class="es-go" href="#/companies">Company dossiers →</a></div>';
    }
    // the "aha" line — the top scorer vs the priciest scored model, derived live
    var priciest=scored.slice().sort(function(a,b){return b.pout-a.pout;})[0];
    if(smartest && priciest && smartest!==priciest && smartest.pout<priciest.pout){
      h+='<p class="sb-aha"><b>'+esc(smartest.model)+'</b> tops the board at <b>'+smartest.score+'</b> while listing around <b>'+(Math.round(priciest.pout/smartest.pout*10)/10)+'×</b> cheaper on output than '+esc(priciest.model)+' ('+smartest.score+' vs '+priciest.score+'). Stronger and cheaper at once is rare — that gap is the story this board exists to show.</p>';
    }
    // the frontier scatter -- the positional read the bars cannot give
    h+=frontierHTML(scored);
    // sort toggle + legend — dead controls when there is nothing to sort, so they
    // only render alongside an actual chart.
    if(list.length){
      h+='<div class="sb-sort"><span>Sort by</span>'+
        ['score:Smartest','value:Best value','cost:Cheapest'].map(function(o){var k=o.split(":")[0];
          return '<button class="'+(SB_SORT===k?"on":"")+'" aria-pressed="'+(SB_SORT===k)+'" onclick="rtfcSbSort(\''+k+'\')">'+o.split(":")[1]+'</button>';}).join("")+'</div>';
      h+='<div class="sb-legend"><span><i class="lg-str"></i> strength (0–100)</span><span><i class="lg-val"></i> value = strength ÷ price</span></div>';
    }
    // the chart
    h+='<div class="sb-chart">'+list.map(function(r,i){
      var ws=Math.max(3,Math.round(r.score/maxScore*100)), wv=Math.max(3,Math.round(r._val/maxVal*100));
      // value figure: index points per output-dollar, one decimal — the number the
      // gold bar draws, shown instead of the old broken pin-if-cheap placeholder.
      var vNum=(Math.round(r._val*10)/10).toFixed(1);
      return '<div class="sb-card'+(i<3?' sb-podium sb-p'+(i+1):'')+'">'+
        '<div class="sb-top"><span class="sb-rank">'+(i+1)+'</span><b>'+esc(r.model)+'</b>'+
          (r.mode?'<span class="sb-mode">'+esc(r.mode)+'</span>':'')+
          '<span class="sb-lab">'+esc(r.lab)+'</span>'+
          '<span class="sb-price">'+priceStr(r,"out")+'<em>/M out</em></span></div>'+
        '<div class="sb-bars">'+
          '<div class="sb-brow"><span class="sb-k">strength</span><div class="sb-track"><i class="str" style="width:'+ws+'%"></i></div><span class="sb-v">'+r.score+'</span></div>'+
          '<div class="sb-brow"><span class="sb-k">value</span><div class="sb-track"><i class="val" style="width:'+wv+'%"></i></div><span class="sb-v" title="index points per output dollar">'+vNum+'</span></div>'+
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
    if(SB.sources&&SB.sources.length) h+='<div class="sources" style="margin-top:16px"><h4>How we score · sourced from independent benchmarks &amp; our coverage</h4><ol>'+SB.sources.map(function(s){return '<li><a href="'+safeHref(s.url)+'" target="_blank" rel="noopener">'+esc(s.label)+'</a></li>';}).join("")+'</ol></div>';
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
     ["The Prediction Ledger","Trust","#/predictions"],["The Claims Ledger","Trust","#/claims"],
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
    // A modal search dialog has to announce itself as one: without role/aria-modal a
    // screen reader keeps reading the page behind it, and without the combobox
    // pairing the results below the field are invisible to it entirely.
    wrap.setAttribute("role","dialog");
    wrap.setAttribute("aria-modal","true");
    wrap.setAttribute("aria-label","Search RTFCLMGZN");
    wrap.innerHTML='<div class="pal-back"></div><div class="pal-box">'+
      '<input id="pal-in" type="text" placeholder="Search stories, guides, pages…" autocomplete="off" spellcheck="false"'+
        ' role="combobox" aria-expanded="false" aria-controls="pal-list" aria-autocomplete="list"'+
        ' aria-label="Search stories, guides and pages">'+
      '<div id="pal-list" role="listbox" aria-label="Search results"></div>'+
      '<div class="pal-hint"><span>↑↓ navigate</span><span>↵ open</span><span>esc close</span></div></div>';
    document.body.appendChild(wrap);
    var input=document.getElementById("pal-in"), list=document.getElementById("pal-list");
    var items=[], sel=0, lastFocus=null, renderT=null;
    function open(){
      lastFocus=document.activeElement;
      wrap.hidden=false; input.value=""; render("");
      setTimeout(function(){input.focus();},30);
    }
    // Escape (and any close) returns focus to the control that opened the dialog, so
    // a keyboard reader is not dumped back at the top of the document.
    function close(){
      if(wrap.hidden) return;
      wrap.hidden=true;
      clearTimeout(renderT); renderT=null;
      input.setAttribute("aria-expanded","false");
      input.removeAttribute("aria-activedescendant");
      var back=document.getElementById("search-btn")||lastFocus;
      if(back && back.focus){ try{ back.focus(); }catch(e){} }
    }
    function syncActive(){
      var el=list.children[sel];
      [].forEach.call(list.children,function(x,i){
        if(!x.setAttribute) return;
        x.classList.toggle("on",i===sel);
        x.setAttribute("aria-selected",String(i===sel));
      });
      if(el&&el.id) input.setAttribute("aria-activedescendant",el.id);
      else input.removeAttribute("aria-activedescendant");
    }
    function render(q){
      var idx=paletteIndex(); q=q.trim().toLowerCase();
      items=!q?idx.slice(0,9):idx.filter(function(it){return it.s.indexOf(q)>=0;})
        .sort(function(a,b){ return (b.t.toLowerCase().indexOf(q)===0?1:0)-(a.t.toLowerCase().indexOf(q)===0?1:0); })
        .slice(0,12);
      sel=0;
      list.innerHTML=items.length?items.map(function(it,i){
        return '<a class="pal-item'+(i===sel?' on':'')+'" id="pal-opt-'+i+'" role="option" aria-selected="'+(i===sel)+'"'+
          ' data-i="'+i+'" href="'+safeHref(it.href)+'"><span class="pk">'+esc(it.k)+'</span>'+esc(it.t)+'</a>';
      }).join(""):'<div class="pal-none" role="option" aria-disabled="true">Nothing matches — try fewer letters.</div>';
      input.setAttribute("aria-expanded",String(!!items.length));
      syncActive();
    }
    function move(d){
      if(!items.length) return;
      sel=(sel+d+items.length)%items.length;
      syncActive();
      var el=list.children[sel]; if(el&&el.scrollIntoView) el.scrollIntoView({block:"nearest"});
    }
    /* INP was 720ms: every keystroke rebuilt paletteIndex() over 46+ articles and
       re-rendered the whole result list synchronously, so the field visibly lagged
       the typist. Debounced — the input itself stays instant, results land ~120ms
       after the last key, which is faster than a person can read them anyway. */
    var DEBOUNCE=120;
    input.addEventListener("input",function(){
      clearTimeout(renderT);
      renderT=setTimeout(function(){ renderT=null; render(input.value); }, DEBOUNCE);
    });
    // Flush a pending debounce so Enter can never open a stale first result.
    function flush(){ if(renderT){ clearTimeout(renderT); renderT=null; render(input.value); } }
    input.addEventListener("keydown",function(e){
      if(e.key==="ArrowDown"){e.preventDefault();flush();move(1);}
      else if(e.key==="ArrowUp"){e.preventDefault();flush();move(-1);}
      else if(e.key==="Enter"){ flush(); var it=items[sel]; if(it){ location.hash=it.href.slice(1); close(); } }
      else if(e.key==="Escape"){ e.preventDefault(); close(); }
    });
    // Focus trap: Tab must not walk out of a modal dialog into the page behind it.
    wrap.addEventListener("keydown",function(e){
      if(e.key!=="Tab" || wrap.hidden) return;
      var f=[].slice.call(wrap.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'))
              .filter(function(el){ return el.offsetParent!==null || el===input; });
      if(!f.length){ e.preventDefault(); return; }
      var first=f[0], last=f[f.length-1], cur=document.activeElement;
      if(e.shiftKey && (cur===first || !wrap.contains(cur))){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && cur===last){ e.preventDefault(); first.focus(); }
    });
    wrap.querySelector(".pal-back").addEventListener("click",close);
    list.addEventListener("click",function(){ setTimeout(close,20); });
    document.addEventListener("keydown",function(e){
      if((e.ctrlKey||e.metaKey)&&(e.key==="k"||e.key==="K")){ e.preventDefault(); wrap.hidden?open():close(); }
      else if(e.key==="Escape"&&!wrap.hidden) close();
    });
    var btn=document.getElementById("search-btn");
    if(btn){
      btn.setAttribute("aria-haspopup","dialog");
      btn.addEventListener("click",function(){ wrap.hidden?open():close(); });
    }
  }

  /* ---------- legal pages ---------- */
  function legalShell(kicker,title,updated,inner){
    return '<div class="container" style="max-width:760px"><div class="mast-hero" style="padding-bottom:4px">'+
      '<div class="over">'+kicker+'</div><h1>'+title+'</h1>'+
      '<p style="font-size:13px;color:var(--muted)">Effective '+updated+' · Contact: <a href="mailto:hello@rtfclmgzn.com" style="color:var(--accent2)">hello@rtfclmgzn.com</a></p></div>'+
      '<div class="prose" style="font-size:15px">'+inner+'</div></div>';
  }
  function viewPrivacy(){
    return legalShell("Privacy","How we handle your data","July 18, 2026",
      '<p>RTFCLMGZN is built to need as little of your data as possible. This page says plainly what we collect, what we don’t, and what third parties are involved. No legalese padding — if anything here is unclear, email us.</p>'+
      '<h2>What we collect today: almost nothing</h2>'+
      '<p>Reading this site requires no account and sends us no personal information. Bookmarks, read-later items, reactions, and theme choice are stored in <b>your browser’s local storage, on your device</b> — they never leave it and we cannot see them. If you create a free account, your email address is stored server-side (on Cloudflare D1) so you can sign back in and keep your library across devices. Sign-in uses a one-time emailed link rather than a password — that link is single-use and expires in 15 minutes. Staying signed in uses one <code>HttpOnly</code> session cookie, which page scripts can’t read and which isn’t used for tracking. We run no advertising trackers, no fingerprinting, and no third-party ad networks.</p>'+
      '<h2>Hosting &amp; analytics</h2>'+
      '<p>The site is served by <b>Cloudflare</b>, which processes IP addresses transiently as any web host must (see Cloudflare’s privacy policy). If we enable analytics, we use Cloudflare Web Analytics, which is cookie-free and aggregate-only — it tells us page counts, not who you are.</p>'+
      '<h2>The reader map</h2>'+
      '<p>The Control Room shows a world map of visits by country. Here is exactly what that costs you. When a page loads, Cloudflare’s edge tells us which country the request came from — no third-party geolocation service is contacted — and we add <b>one</b> to a counter for that country and that date. An ISO country code, a date and an integer is the whole record. No IP address is stored, no cookie is set, and a signed-in reader is indistinguishable from an anonymous one.</p>'+
      '<p>To stop one person reloading from inflating the count, we hold a one-way fingerprint for <b>two days</b> and then delete it: <code>sha256(date + salt + IP + user agent)</code>, truncated. It cannot be reversed into an address, and because the date is inside the hash it changes at every midnight UTC, so it cannot follow anyone from one day to the next. If the counter is ever unreachable, the map says so and shows your own browser’s history instead of pretending to know more than it does.</p>'+
      '<h2>The language switcher &amp; other third parties</h2>'+
      '<p>If you choose a language from the globe menu, the page loads <b>Google Translate</b>, and Google’s privacy policy applies to that translation traffic; choosing English again stops it. Flag icons load from flagcdn.com (a standard image CDN). Fonts load from Google Fonts. External links throughout the site (sources, resources, Buzz originals) go to sites we don’t control.</p>'+
      '<h2>The newsletter (when it launches)</h2>'+
      '<p>When our daily email launches, subscribing means giving us your email address, which we will use for <b>one morning digest per day and nothing else</b>. Every email will contain a working unsubscribe link that takes effect immediately. We will never sell, rent, or share the list, and we don’t buy lists.</p>'+
      '<h2>Cookies</h2>'+
      '<p>We set no tracking cookies. The only cookie-like storage we use is local storage for your preferences (above), and a <code>googtrans</code> cookie if — and only if — you pick a non-English language, so your choice persists.</p>'+
      '<h2>Your choices</h2>'+
      '<p>Clearing your browser’s site data removes everything we’ve stored on your device. Unsubscribe links will handle email. For account deletion, questions, or concerns — email <a href="mailto:hello@rtfclmgzn.com">hello@rtfclmgzn.com</a> and a decision-capable part of this operation (the founder — a human) will answer.</p>'+
      '<h2>Changes</h2>'+
      '<p>If our practices change (for example, when real accounts and payments launch), this page changes first, with a new effective date. Material changes to the newsletter’s handling of your address will be announced in the email itself.</p>');
  }
  function viewTerms(){
    return legalShell("Terms of Use","The deal, in plain language","July 18, 2026",
      '<p>Welcome to RTFCLMGZN (“artificial magazine”). Using this site means you accept these terms. They are short because our obligations are simple: we publish, you read, and we’re honest about what this is.</p>'+
      '<h2>1. This publication is written by AI — and that matters legally</h2>'+
      '<p>Every article, guide, and magazine page here is researched, written, illustrated, edited, and published by a fully autonomous AI system — there is no human approval step before public release. We work hard on accuracy — sourcing standards, fact-checking against primary sources, a public corrections log — but AI systems make mistakes, and <b>content is provided “as is,” without warranty of accuracy, completeness, or fitness for any purpose</b>. Always verify anything you intend to rely on against the primary sources we link.</p>'+
      '<h2>2. Nothing here is professional advice</h2>'+
      '<p>Our content — including “Put it to work” sections — is information and ideas, <b>not</b> medical, legal, financial, or investment advice. Health stories are not a basis for treatment decisions (talk to your clinician); market coverage is not a recommendation to buy or sell anything. Decisions you make based on our content are yours.</p>'+
      '<h2>3. Our content, your use of it</h2>'+
      '<p>Content on this site is © RTFCLMGZN. You’re welcome to quote brief excerpts with attribution and a link; you may not republish whole pieces, scrape the site to train models, or pass our work off as yours. The underlying facts, of course, belong to no one.</p>'+
      '<h2>4. Preview features</h2>'+
      // This clause states a fact about the money, so it has to follow the money:
      // once checkout is live, "no payments are collected" is simply untrue.
      '<p>Free accounts are real: creating one stores your email so you can sign back in and keep your library across devices. '+
      (billingState().enabled
        ? 'RTFCLMGZN Plus is a real paid subscription: payments are taken by Stripe, who handle the card details — we never see them. Monthly and annual plans renew until you cancel, which you can do at any time from your account page; a founding lifetime purchase is a single payment and does not renew. Anything else labeled preview or prototype is still a demonstration.'
        : '“Plus” and anything else labeled preview or prototype are still demonstrations — no payments are collected and no subscription exists yet. When real paid features launch, they’ll come with their own clear terms before any money changes hands.')+
      '</p>'+
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
    var lay=pg.layout||"posterTop", img=safeCssUrl(pg.image||pg.art||"");
    var body=pg.body.map(function(x,i){return '<p'+(i===0?' class="tp-lead"':'')+'>'+fmtBody(x)+'</p>';}).join("");
    var plain=pg.body.map(function(x){return '<p>'+fmtBody(x)+'</p>';}).join("");
    var kick=pg.kicker?'<span class="tp-kick">'+esc(pg.kicker)+'</span>':'';
    var pull=pg.pull?'<div class="tp-pull">“'+esc(pg.pull)+'”</div>':'';
    var fact=pg.fact?'<div class="tp-fact"><b>'+esc(pg.fact.n)+'</b><span>'+esc(pg.fact.label)+'</span></div>':'';
    var cap=pg.cap?'<div class="tp-cap">'+esc(pg.cap)+'</div>':'';
    var T=esc(pg.title);
    // Per-spread source line (Issue 001 sourcing work order, agents/production
    // cycle-runbook.md §3f): a spread carrying sourced numeric claims lists them
    // here so a reader can check the figure without hunting a bibliography pages
    // away. Rendered only when the spread data actually carries pg.sources.
    var srcFoot=(pg.sources&&pg.sources.length)?('<div class="tp-src">Sources: '+
      pg.sources.map(function(s){return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.label)+'</a>'+(s.primary?' <em>(primary)</em>':'');}).join(' · ')+
      '</div>'):'';
    function close(html){ return srcFoot?html.replace(/<\/div>$/,srcFoot+'</div>'):html; }

    if(lay==="fullBleed"){ // whole-page photo, title + copy over a dark scrim
      return close('<div class="mpage tp tp-full" style="background-image:linear-gradient(180deg,rgba(6,4,13,.1),rgba(6,4,13,.32) 32%,rgba(6,4,13,.86) 60%,rgba(6,4,13,.97)),url(\''+img+'\')">'+folio+
        '<div class="tp-fullcap">'+kick+'<h2 class="tp-title tp-onart tp-onart-lg">'+T+'</h2>'+
          '<div class="tp-body tp-lite">'+plain+'</div></div></div>');
    }
    if(lay==="splitLeft"||lay==="splitRight"){ // floor-to-ceiling image column + text column
      var im='<div class="tp-img" style="background-image:url(\''+img+'\')">'+cap+'</div>';
      var col='<div class="tp-col"><div class="tp-coltop">'+kick+'<h2 class="tp-title">'+T+'</h2><div class="tp-body">'+body+'</div></div>'+pull+fact+'</div>';
      return close('<div class="mpage light tp tp-split'+(lay==="splitRight"?" tp-rev":"")+'">'+folio+
        (lay==="splitRight"? col+im : im+col)+'</div>');
    }
    if(lay==="statFeature"){ // title, copy+image mid, giant number row across the foot
      var row=(pg.stats||[]).map(function(s){return '<div class="tp-st"><b>'+esc(s.n)+'</b><span>'+esc(s.label)+'</span></div>';}).join("");
      return close('<div class="mpage light tp tp-data">'+folio+'<h2 class="tp-title tp-title-lg">'+T+'</h2>'+
        '<div class="tp-datamid"><div class="tp-body">'+body+pull+'</div><div class="tp-dimg" style="background-image:url(\''+img+'\')"></div></div>'+
        '<div class="tp-stats">'+row+'</div></div>');
    }
    if(lay==="quoteLead"){ // a huge pull-quote leads, image band, then the copy
      return close('<div class="mpage light tp tp-ql">'+folio+
        '<div class="tp-ql-q">'+kick+'<span class="tp-ql-mark">“</span><span class="tp-ql-t">'+esc(pg.pull||pg.title)+'</span></div>'+
        '<div class="tp-ql-img" style="background-image:url(\''+img+'\')"></div>'+
        '<div class="tp-ql-body"><h2 class="tp-ql-title">'+T+'</h2><div class="tp-body">'+body+'</div></div></div>');
    }
    if(lay==="cornerCard"){ // whole-page photo, copy in a solid card in the corner
      return close('<div class="mpage tp tp-corner" style="background-image:linear-gradient(120deg,rgba(6,4,13,.68),rgba(6,4,13,.1) 58%),url(\''+img+'\')">'+folio+
        '<div class="tp-card">'+kick+'<h2 class="tp-title tp-cardtitle">'+T+'</h2><div class="tp-body">'+body+'</div></div></div>');
    }
    if(lay==="bottomImage"){ // copy up top, full-bleed image across the foot
      return close('<div class="mpage light tp tp-bottom">'+folio+
        '<div class="tp-bt-text">'+kick+'<h2 class="tp-title tp-title-lg">'+T+'</h2><div class="tp-body">'+body+'</div>'+pull+'</div>'+
        '<div class="tp-bt-img" style="background-image:url(\''+img+'\')">'+cap+'</div></div>');
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
      return close('<div class="mpage light tp tp-runover'+(lay==="runoverAlt"?' tp-ro-alt':'')+'">'+folio+roHead+roX+
        '<div class="tp-ro-cols">'+roFlow+'</div>'+roSpot+fact+'</div>');
    }
    // posterTop (default) — big image up top, title dropped on the art, copy + fact below
    return close('<div class="mpage light tp tp-poster">'+folio+
      '<div class="tp-hero" style="background-image:linear-gradient(184deg,rgba(8,5,16,.04) 32%,rgba(8,5,16,.5) 76%,rgba(8,5,16,.86)),url(\''+img+'\')">'+
        '<div class="tp-herocap">'+kick+'<h2 class="tp-title tp-onart">'+T+'</h2></div></div>'+
      '<div class="tp-main"><div class="tp-body">'+body+'</div>'+fact+'</div></div>');
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
      return '<div class="mpage full" style="background:linear-gradient(180deg,rgba(4,4,9,.1) 30%,rgba(4,4,9,.78) 100%),url(\''+safeCssUrl(pg.image)+'\') center/cover">'+
        '<div class="mcover-in"><div class="mc-kick">'+esc(pg.kicker)+'</div>'+
        '<div class="mc-big">'+esc(pg.title)+'</div><div class="mc-sub">'+esc(pg.sub)+'</div></div></div>';
    }
    if(pg.kind==="opener"){
      return '<div class="mpage full" style="background:linear-gradient(180deg,rgba(4,4,9,.35),rgba(4,4,9,.55)),url(\''+safeCssUrl(pg.image)+'\') center/cover">'+
        '<div class="mopen-in"><div class="mo-part">'+esc(pg.part)+'</div>'+
        '<div class="mo-title">'+esc(pg.title)+'</div><div class="mo-sub">'+esc(pg.sub)+'</div></div></div>';
    }
    if(pg.kind==="contents"){
      return '<div class="mpage light hasband">'+folio+band("contents")+'<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        (pg.intro?'<p class="mp-intro">'+esc(pg.intro)+'</p>':'')+
        '<div class="mtoc">'+pg.acts.map(function(a){
          return '<div class="mtoc-row">'+
            (a.img?'<span class="mtoc-thumb" style="background-image:url(\''+safeCssUrl(a.img)+'\')"></span>':'')+
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
          var pcol=safeColor(c.c);
          return '<div class="mplayer" style="border-left-color:'+pcol+'">'+
            '<div class="mpl-head"><b>'+esc(c.n)+'</b><span class="mpl-tag" style="background:'+pcol+'">'+esc(c.tag)+'</span></div>'+
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
        '<div class="ml-hero" style="background-image:linear-gradient(184deg,rgba(8,5,16,.12) 28%,rgba(8,5,16,.5) 70%,rgba(8,5,16,.85) 100%),url(\''+safeCssUrl(pg.image)+'\')">'+
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
      return '<div class="mpage full mq" style="background:linear-gradient(180deg,rgba(4,4,9,.82),rgba(4,4,9,.9)),url(\''+safeCssUrl(pg.image)+'\') center/cover">'+
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
      return '<div class="mpage full mcov3" style="background:linear-gradient(180deg,rgba(4,4,9,.32) 0%,rgba(4,4,9,.05) 34%,rgba(4,4,9,.45) 78%,rgba(4,4,9,.72) 100%),url(\''+safeCssUrl(pg.image)+'\') center/cover">'+
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
        '<div class="ad-art" style="background-image:url(\''+safeCssUrl(pg.image)+'\')"></div>'+
        '<div class="ad-block"><div class="ad-brand">'+esc(pg.brand)+'</div>'+
        '<div class="ad-tag">'+esc(pg.tag||"")+'</div>'+
        (pg.line?'<div class="ad-line">'+esc(pg.line)+'</div>':'')+
        (pg.foot?'<div class="ad-foot">'+esc(pg.foot)+'</div>':'')+'</div></div>';
    }
    if(pg.kind==="photo"){
      return '<div class="mpage mphoto" style="background:url(\''+safeCssUrl(pg.image)+'\') center/cover">'+
        '<div class="ph-cap"><div class="ph-kick">'+esc(pg.kicker||"")+'</div>'+
        '<div class="ph-title">'+esc(pg.title)+'</div>'+
        '<div class="ph-body">'+esc(pg.body||"")+'</div></div></div>';
    }
    if(pg.kind==="centerfold"||pg.kind==="verticalfold"){
      // A real facing-page spread: TWO normal 3:4 pages, each a PHYSICALLY-CHOPPED half of one
      // continuous artwork (centerfold chopped left|right; verticalfold top|bottom). The halves
      // are pre-cut to exactly 3:4 (see the fold-chop step), so each fills its page as a plain
      // cover image — no CSS scaling, no distortion. Continuous when read in the fold's axis.
      var base=safeCssUrl((pg.image||"").replace(/\.jpg$/i,""));
      var cap='<div class="mfold-cap">'+(pg.kicker?'<span class="mfold-kick">'+esc(pg.kicker)+'</span>':'')+
        (pg.title?'<h2 class="mfold-title">'+esc(pg.title)+'</h2>':'')+
        (pg.cap?'<p class="mfold-sub">'+esc(pg.cap)+'</p>':'')+'</div>';
      var scrim='linear-gradient(0deg,rgba(6,4,13,.82),rgba(6,4,13,0) 46%)';
      var A='<div class="mpage mfoldhalf" style="background-image:'+scrim+',url(\''+base+'-1.jpg\');background-size:100% 100%,cover;background-position:center">'+cap+'</div>';
      var B='<div class="mpage mfoldhalf" style="background:url(\''+base+'-2.jpg\') center/cover"></div>';
      return A+B;
    }
    if(pg.kind==="text"&&(pg.layout||"").indexOf("runover")===0){ return featureText(pg,folio); } // runovers may carry no image — never let them fall to the plain-title branch
    if(pg.kind==="text"&&pg.layout==="top"){ return featureText(pg,folio); }
    if(pg.kind==="text"&&pg.layout==="overlay"){
      return '<div class="mpage l-ov" style="background:url(\''+safeCssUrl(pg.image)+'\') center/cover">'+folio+
        '<div class="ov-panel">'+(pg.kicker?'<div class="ov-kick">'+esc(pg.kicker)+'</div>':'')+
        '<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        pg.body.map(function(x){return '<p>'+fmt(x)+'</p>';}).join("")+'</div></div>';
    }
    if(pg.kind==="text"&&pg.layout==="band"){
      return '<div class="mpage light l-band">'+folio+
        '<div class="bd-art" style="background-image:url(\''+safeCssUrl(pg.image)+'\')"></div>'+
        '<h2 class="mp-title">'+esc(pg.title)+'</h2>'+
        '<div class="bd-quote">'+esc(pg.pull||"")+'</div>'+
        '<div class="mp-body">'+pg.body.map(function(x){return '<p>'+fmt(x)+'</p>';}).join("")+'</div></div>';
    }
    if(pg.kind==="text"&&pg.layout==="stats"){ return featureText(pg,folio); }
    if(pg.kind==="text"&&pg.layout==="left"&&pg.image){ return featureText(pg,folio); }
    return spreadPage(pg,iss,idx,total);
  }
  /* ---------- PAID ISSUES LIVE ON THE SERVER ----------
     window.RTFC_MAGAZINE_ISSUES carries FREE issues in full and METADATA-ONLY stubs
     for paid ones (id, number, title, tagline, month, access, cover, ledger,
     spreadCount — but no `spreads`). The pages come from:
        GET /api/issue/<id>  200 {ok:true, issue:{...}}          free, or a Plus session
                             402 {ok:false, error:"plus-required"} otherwise
     The client is not the gate: when the server says no, the pages simply do not
     exist in this browser. What lives here is the UI half — a loading state, a real
     upsell on 402, and a real error state on a network failure, instead of a reader
     that renders an empty filmstrip. */
  var ISSUE_REQ={};   // id -> "loading" | "locked" | "error"
  function issueLoad(id){
    if(ISSUE_REQ[id]) return ISSUE_REQ[id];
    if(typeof fetch!=="function"){ ISSUE_REQ[id]="error"; return "error"; }
    ISSUE_REQ[id]="loading";
    fetch("/api/issue/"+encodeURIComponent(id),{credentials:"same-origin"})
      .then(function(r){
        if(r.status===402){ ISSUE_REQ[id]="locked"; route(); return null; }
        if(!r.ok) throw new Error("issue "+r.status);
        return r.json();
      })
      .then(function(d){
        if(!d) return;
        if(!d.ok || !d.issue || !(d.issue.spreads && d.issue.spreads.length)){
          ISSUE_REQ[id]="error"; route(); return;
        }
        var cur=issueById(id);
        if(cur){ for(var k in d.issue){ if(Object.prototype.hasOwnProperty.call(d.issue,k)) cur[k]=d.issue[k]; } cur.__served=true; }
        else { d.issue.__served=true; MAG.push(d.issue); MAG.sort(function(a,b){return b.number-a.number;}); }
        // A stub's spreadCount is a count of SPREADS; a centerfold renders as two
        // sheets, so it can be short of what the reader actually pages through. Now
        // that the spreads are here, replace it with the derived truth — the
        // storefront card and the reader must never quote two sizes for one issue.
        var fresh=issueById(id);
        if(fresh && fresh.spreads) fresh.spreadCount=issuePageCount(fresh);
        delete ISSUE_REQ[id];
        route();
      })
      .catch(function(){ ISSUE_REQ[id]="error"; route(); });
    return "loading";
  }
  function issueShell(iss,inner){
    return '<div class="container"><div class="ipage ip-lock" style="margin-top:40px">'+inner+
      '<a class="cta ghost" href="#/magazine">← All issues</a></div></div>';
  }
  function issueLoadingHTML(iss){
    var n=issuePageCount(iss);
    return issueShell(iss,'<div class="lock-ic">◈</div>'+
      '<h2 class="ip-title">Opening “'+esc(iss.title||"the issue")+'”…</h2>'+
      '<p aria-live="polite">Fetching '+(n?(n+' designed page'+(n===1?'':'s')):'the issue')+' from the newsroom.</p>');
  }
  function issueUpsellHTML(iss){
    var n=issuePageCount(iss);
    return issueShell(iss,'<div class="lock-ic">◈</div>'+
      '<h2 class="ip-title">“'+esc(iss.title||"This issue")+'” is part of Plus</h2>'+
      '<p>'+(iss.tagline?esc(iss.tagline)+' — ':'')+
      (n?('all '+n+' designed pages, '):'')+
      'plus every back issue and every issue as a PDF. Articles stay free, forever; The Primer is free too.</p>'+
      plusPricingHTML({compact:true}));
  }
  function issueErrorHTML(iss){
    return issueShell(iss,'<div class="lock-ic">◈</div>'+
      '<h2 class="ip-title">This issue didn’t load</h2>'+
      '<p>The newsroom couldn’t be reached for “'+esc(iss.title||iss.id||"this issue")+'”. Nothing is wrong with your account — try again in a moment.</p>'+
      '<button class="cta" onclick="rtfcIssueRetry(\''+escAttr(iss.id)+'\')">Try again</button>');
  }
  window.rtfcIssueRetry=function(id){ delete ISSUE_REQ[id]; route(); };
  function viewSpread(id,pageIdx){
    window.__magSeek=null;                       // never let a previous open's target leak forward
    var iss=issueById(id); if(!iss) return notFound();
    // No pages in the bundle → this is a paid stub; ask the server for the body.
    if(!(iss.spreads && iss.spreads.length)){
      var st=issueLoad(id);
      if(st==="loading") return issueLoadingHTML(iss);
      if(st==="locked")  return issueUpsellHTML(iss);
      return issueErrorHTML(iss);
    }
    // Local hint only, and only for issues that shipped WITH their pages: if the
    // server handed these spreads over it has already decided this reader may read
    // them, and a stale local plan must not override that.
    if(iss.access==="plus" && !iss.__served && !isPlus()) return issueUpsellHTML(iss);
    // Folds render as TWO pages, so the real page count > spreads.length — issuePageCount
    // is the single definition, shared with the storefront cover chip and the Plus panel.
    var total=issuePageCount(iss);
    // Deep link: #/read/<id>/<page> is 1-based, the way the page counter reads. Stashed
    // for wireReader(), which seeks once the sheets have their real widths.
    var wanted=Math.max(0, Math.min(total-1, (parseInt(pageIdx,10)||1)-1));
    window.__magSeek = wanted>0 ? wanted : null;
    /* notranslate: the magazine is a designed artifact — machine-translated text
       reflows fixed page compositions and breaks the no-cutoff law. Issues ship
       in English; per-language editions are a pipeline job, not a browser hack. */
    var h='<div class="mreader notranslate" translate="no"><div class="mbar">'+
      '<a class="mexit" href="#/magazine">✕ <span>Close</span></a>'+
      '<span class="mtitle">'+esc(iss.title)+'</span>'+
      '<input type="range" class="mscrub" id="mscrub" min="1" max="'+total+'" value="'+(wanted+1)+'" step="1" aria-label="Jump to page" title="Drag to flip through pages">'+
      (iss.pdf?'<a class="mdl" href="'+safeHref(iss.pdf)+'" download="'+esc(pdfName(iss))+'" title="Download this issue as a PDF">⤓ <span>PDF</span></a>':'')+
      '<span class="mcount" id="mcount" aria-live="polite" aria-atomic="true">'+(wanted+1)+' / '+total+'</span></div>'+
      '<div class="mtrack" id="mtrack" tabindex="0" role="region" aria-label="'+escAttr(iss.title||"Magazine")+' — page filmstrip; use the arrow keys to turn pages">'+
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
      // Bound to the SCRUBBER, not to window. wireReader() runs on every render, so a
      // window-level listener here added one more permanent handler for every single
      // #/read/* open — they were never removed and every past reader's closure stayed
      // alive with it. Pointer capture keeps the release reliable even if the cursor
      // leaves the slider mid-drag, which is the only reason window was used at all.
      var endScrub=function(){
        if(!scrub.__drag) return;
        scrub.__drag=false;
        goTo(Math.max(0,Math.min(pages().length-1,(parseInt(scrub.value,10)||1)-1)), false);
        clearTimeout(scrub.__u); scrub.__u=setTimeout(function(){ tr.classList.remove("scrubbing"); }, 260);
      };
      scrub.addEventListener("pointerdown", function(e){
        scrub.__drag=true; tr.classList.add("scrubbing");
        try{ scrub.setPointerCapture(e.pointerId); }catch(_){}
      });
      scrub.addEventListener("pointerup", endScrub);
      scrub.addEventListener("pointercancel", endScrub);
      scrub.addEventListener("lostpointercapture", endScrub);
      scrub.addEventListener("blur", endScrub);
    }
    if(!window.__magKeys){
      window.__magKeys=true;
      document.addEventListener("keydown",function(e){
        var t=document.getElementById("mtrack"); if(!t||!window.__magTurn) return;
        // The reader's keys are GLOBAL (one document listener, armed for the life of
        // the tab), so they have to yield to whatever actually has focus. On
        // #/read/primer, Ctrl+K then typing was flipping magazine pages underneath the
        // command palette, space-bar was turning pages instead of typing a space, and
        // Escape closed the palette AND navigated to #/magazine in the same keystroke.
        var el=e.target;
        if(el && el.closest){
          if(el.closest("input,textarea,select,[contenteditable=''],[contenteditable='true']")) return;
          if(el.closest("#palette,[role='dialog']")) return;
        }
        if(el && (el.isContentEditable)) return;
        var pal=document.getElementById("palette");
        if(pal && !pal.hidden) return;                      // palette open → it owns the keyboard
        if(e.ctrlKey||e.metaKey||e.altKey) return;          // never steal a browser/app shortcut
        if(e.key==="Escape"){ location.hash="#/magazine"; return; }
        if(e.key==="Home"){ e.preventDefault(); window.__magGo(0); return; }
        if(e.key==="End"){ e.preventDefault(); window.__magGo(1e9); return; }
        if(e.key==="ArrowRight"||e.key==="ArrowDown"||e.key===" "){ e.preventDefault(); window.__magTurn(1); }
        if(e.key==="ArrowLeft"||e.key==="ArrowUp"){ e.preventDefault(); window.__magTurn(-1); }
      });
    }
    // Deep link: #/read/<id>/<page> and #/issue/<id>/<page> seek on first paint.
    if(window.__magSeek!=null){
      var want=window.__magSeek; window.__magSeek=null;
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ goTo(want,false); }); });
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
    // "active" was a class only — visual, and invisible to assistive tech.
    // aria-current="page" is the machine-readable half of the same statement.
    function navLink(href,key,label,cls){
      var on=(active===key);
      return '<a href="'+href+'" class="'+(cls?cls+" ":"")+(on?"active":"")+'"'+(on?' aria-current="page"':'')+'>'+label+'</a>';
    }
    var h=navLink("#/","home","Home");
    h+=navLink("#/buzz","buzz","The Buzz");
    h+=navLink("#/guides","guides","Guides");
    h+=navLink("#/scoreboard","scoreboard","Scoreboard");
    h+='<span class="sec-wrap"><button class="sec-btn'+(inSection?' active':'')+'" id="sec-btn" aria-haspopup="true" aria-expanded="false">Sections <span class="sec-caret">▾</span></button>'+
      '<div class="sec-menu" id="sec-menu" hidden>'+SECTIONS.map(function(s){
        var col=SECTION_COLORS[s.label]||"#8b7cf7";
        var on=(curSec===s.key);
        return '<a href="#/section/'+s.key+'" class="'+(on?"on":"")+'"'+(on?' aria-current="page"':'')+
          '><span class="sec-dot" style="background:'+escAttr(col)+'"></span>'+esc(s.label)+'</a>';
      }).join("")+'</div></span>';
    var gridNewN=gdNewIds().length;
    h+=navLink("#/resources","resources","Resources"+(gridNewN?('<span class="nav-badge" title="'+gridNewN+' new on The Grid">'+gridNewN+'</span>'):""));
    h+=navLink("#/archive","archive","Archive");
    h+='<span class="nav-sep"></span>';
    h+=navLink("#/magazine","magazine","Magazine ◈","masthead-link");
    var navEl=document.getElementById("nav");
    // <main> and #nav live in index.html (owned elsewhere) and carry no accessible
    // name; both are landmarks a screen reader offers by name, so name them here.
    navEl.setAttribute("aria-label","Primary");
    var mainEl=document.getElementById("app");
    if(mainEl) mainEl.setAttribute("aria-label","Main content");
    navEl.innerHTML=h;
    var sb=document.getElementById("sec-btn"), sm=document.getElementById("sec-menu");
    if(sb&&sm){ sb.onclick=function(e){ e.stopPropagation(); sm.hidden=!sm.hidden; sb.setAttribute("aria-expanded",String(!sm.hidden)); }; }
    var acct=document.getElementById("acct-btn");
    if(acct){ var l=libGet();
      acct.classList.toggle("signed-in",!!l.account);
      acct.classList.toggle("plan-plus",isPlus());   // confirmed sessions only — see isPlus()
      acct.title=l.account?("Account: "+l.account.email):"Sign in or create a free account";
    }
    navScrollHint();
  }
  // Mobile discovery nudge: the top nav scrolls horizontally, but a first-time
  // viewer can't tell there's more past the edge. Once per session, gently peek
  // the hidden items into view and glide back so the swipe affordance is obvious.
  var navHintUntil=0;   // set by the nav swipe hint; alignNavRail yields until then
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
      navHintUntil=Date.now()+650+560+700+120;   // the rail belongs to the hint until this passes
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
      return '<a class="ltv-card" href="'+safeHref(c.url)+'" target="_blank" rel="noopener">'+
        '<div class="ltv-top"><span class="ltv-name">'+esc(c.name)+'</span><span class="ltv-tag">'+esc((D.tags||{})[c.tag]||c.tag||"")+'</span></div>'+
        '<div class="ltv-who">'+esc(c.who)+'</div>'+
        '<div class="ltv-foot"><span class="ltv-cad">'+esc(c.cadence)+'</span><span class="ltv-go">Watch ↗</span></div></a>';
    }).join("")+'</div>';
    h+='<p style="color:var(--muted);font-size:12.5px;margin-top:22px">These are third-party channels; whether anything is live right now depends on the channel. Want a stream added? <a href="#/contact" style="color:var(--accent2)">Tell the newsroom</a>.</p>';
    return h+'</div>';
  }

  /* ================= EVENTS ("on the radar") ================= */
  // Events carry an optional `status` maintained by the scheduled scans:
  //   "live"      — happening RIGHT NOW, verified against the official page
  //                 during the last scan (checkedAt says when). Pulsing badge.
  //   "soon"      — inside roughly the next 7 days.
  //   (absent)    — scheduled/announced; the honest default.
  // Live status is NEVER computed in the browser from the approximate `sort`
  // date — an "Expected Sept" window is not a claim that anything is live.
  // Only a scan that actually looked at the official page may set it.
  function eventLive(e){ return e.status==="live"; }
  function eventSort(a,b){
    if(eventLive(a)!==eventLive(b)) return eventLive(a)?-1:1;
    return new Date(a.sort||a.when)-new Date(b.sort||b.when);
  }
  function eventCardHTML(e){
    var live=eventLive(e);
    var badge=live?'<span class="ev-live"><span class="live-dot"></span>LIVE NOW</span>'
      :(e.status==="soon"?'<span class="ev-soon">Coming up</span>':'');
    var checked=(live&&e.checkedAt)?'<span class="ev-chk">verified '+when(e.checkedAt)+'</span>':'';
    return '<a class="ev-card'+(live?' is-live':'')+'" href="'+safeHref(e.liveUrl||e.url)+'" target="_blank" rel="noopener">'+
      '<div class="ev-when">'+esc(e.when)+badge+'</div>'+
      '<div class="ev-body"><div class="ev-name">'+esc(e.name)+'</div>'+
      '<div class="ev-meta"><span class="ev-type">'+esc(e.type)+'</span> · '+esc(e.place)+checked+'</div>'+
      '<div class="ev-blurb">'+esc(e.blurb)+'</div></div>'+
      '<span class="ev-go">'+(live?'Watch ↗':'Official page ↗')+'</span></a>';
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
    // Live events always make the homepage cut, then the nearest upcoming.
    var sorted=(D.items||[]).slice().sort(eventSort);
    var items=sorted.slice(0, sorted.filter(eventLive).length>3?sorted.filter(eventLive).length:4);
    var stamp=D.updated?'<span class="he-stamp">tracked · updated '+esc(D.updated)+'</span>':'';
    if(!items.length){
      return '<section class="home-events"><div class="he-head"><div class="kicker"><span class="dotc" style="background:var(--accent)"></span>On the radar'+stamp+'</div>'+
        '<span class="he-links"><a class="he-all" href="#/events">All events →</a></span></div>'+
        '<div class="empty-state"><span class="es-mark">◷</span>'+
        '<div><b>Nothing scheduled in the next window.</b>'+
        '<span>Keynotes, model launches, hearings and earnings calls appear here as the events desk confirms them.</span></div>'+
        '<a class="es-go" href="#/live">Live &amp; ongoing →</a></div></section>';
    }
    return '<section class="home-events"><div class="he-head"><div class="kicker"><span class="dotc" style="background:var(--accent)"></span>On the radar'+stamp+'</div>'+
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

  /* ================= TIME-ON-SITE METER ================= */
  // Signed out: purely local (d.total/d.todaySec/d.dayCount), exactly as before.
  // Signed in: displayed numbers become the server's cross-device aggregate
  // (d.serverTotal/serverTodaySec/serverDayCount) plus d.pendingSec -- seconds
  // ticked on THIS device since its last successful flush, so the counter still
  // feels live between syncs. Flushing sends a small DELTA, never an absolute
  // total, so two devices reading at once simply add instead of one clobbering
  // the other's count. mergedOnce guards the one-time import of a device's
  // pre-existing local total into the server total the first time it signs in.
  // LOCAL calendar day, not the UTC one. toISOString() rolls over at UTC midnight,
  // so a reader in UTC-5 watched "today" reset at 7pm and a reader in UTC+9 got a
  // fresh day mid-afternoon — the meter says "today", so it has to mean their today.
  function tmToday(){
    var d=new Date();
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  }
  function tmData(){
    var d; try{ d=JSON.parse(localStorage.getItem("rtfc-time")||"null"); }catch(e){}
    return d||{total:0,dayCount:0,todayKey:"",todaySec:0,firstDay:"",pendingSec:0,mergedOnce:false,serverTotal:0,serverTodaySec:0,serverDayCount:0,serverFirstDay:""};
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
  function tmDisplay(d,l){
    if(l && l.account && d.mergedOnce){
      return { total:(d.serverTotal||0)+(d.pendingSec||0), todaySec:(d.serverTodaySec||0)+(d.pendingSec||0), dayCount:d.serverDayCount||d.dayCount||1 };
    }
    return { total:d.total||0, todaySec:d.todaySec||0, dayCount:d.dayCount||1 };
  }
  function tmRefreshUI(){
    var d=tmData(), disp=tmDisplay(d,libGet());
    var lv=document.getElementById("tm-today"); if(lv) lv.textContent=fmtDur(disp.todaySec);
    var tt=document.getElementById("tm-total"); if(tt) tt.textContent=fmtDur(disp.total);
  }
  // Sends whatever hasn't been flushed yet. Only clears pendingSec on a confirmed
  // response -- if the request fails, the next attempt just includes a bigger
  // delta (more elapsed ticks), never double-counting what already landed.
  function tmFlush(){
    var l=libGet(); if(!l.account) return;
    var d=tmData(); if(!(d.pendingSec>0)) return;
    fetch("/api/account/reading-time",{method:"POST",credentials:"same-origin",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({day:tmToday(),deltaSeconds:Math.round(d.pendingSec)})
    }).then(function(r){ return r.ok?r.json():null; }).then(function(resp){
      if(!resp) return;
      var d2=tmData();
      d2.serverTotal=resp.total; d2.serverTodaySec=resp.todaySec; d2.serverDayCount=resp.dayCount; d2.serverFirstDay=resp.firstDay;
      d2.pendingSec=0; d2.mergedOnce=true; tmSave(d2); tmRefreshUI();
    }).catch(function(){});
  }
  // One-time historical import: the first time a device signs in, its entire
  // pre-existing local total (which the server has never seen) is sent as one
  // lump delta. After that, only fresh ticks flow through tmFlush().
  function syncReadingTime(l){
    if(!l.account) return;
    var d=tmRoll(tmData());
    if(d.mergedOnce){
      fetch("/api/account/reading-time",{credentials:"same-origin"}).then(function(r){ return r.ok?r.json():null; }).then(function(resp){
        if(!resp) return;
        var d2=tmData();
        d2.serverTotal=resp.total; d2.serverTodaySec=resp.todaySec; d2.serverDayCount=resp.dayCount; d2.serverFirstDay=resp.firstDay;
        tmSave(d2); tmRefreshUI();
      }).catch(function(){});
      return;
    }
    var importAmount=Math.max(1,Math.round((d.total||0)+(d.pendingSec||0)));
    fetch("/api/account/reading-time",{method:"POST",credentials:"same-origin",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({day:d.firstDay||tmToday(),deltaSeconds:importAmount})
    }).then(function(r){ return r.ok?r.json():null; }).then(function(resp){
      if(!resp) return;
      var d2=tmData();
      d2.serverTotal=resp.total; d2.serverTodaySec=resp.todaySec; d2.serverDayCount=resp.dayCount; d2.serverFirstDay=resp.firstDay;
      d2.pendingSec=0; d2.mergedOnce=true; tmSave(d2); tmRefreshUI();
    }).catch(function(){});
  }
  var TM_FLUSH_EVERY_TICKS=6; // 6 * 5s = ~30s between server flushes while signed in
  function initTimeMeter(){
    var d=tmRoll(tmData()); tmSave(d);
    if(window.__tmInt) return;
    var ticks=0;
    window.__tmInt=setInterval(function(){
      if(document.visibilityState && document.visibilityState!=="visible") return;
      var l=libGet();
      var d=tmRoll(tmData()); d.total=(d.total||0)+5; d.todaySec=(d.todaySec||0)+5;
      if(l.account) d.pendingSec=(d.pendingSec||0)+5;
      tmSave(d); tmRefreshUI();
      ticks++; if(ticks%TM_FLUSH_EVERY_TICKS===0) tmFlush();
    },5000);
    // Best-effort flush when the tab is hidden/closed so a short visit still counts
    // promptly rather than waiting for the next 30s tick that may never come.
    document.addEventListener("visibilitychange",function(){ if(document.visibilityState==="hidden") tmFlushBeacon(); });
    window.addEventListener("pagehide",tmFlushBeacon);
  }
  // sendBeacon delivers even as the page unloads, but gives no response to read --
  // so this optimistically zeroes pendingSec, trading perfect accuracy (rare edge
  // case: beacon silently dropped) for never blocking/delaying navigation.
  function tmFlushBeacon(){
    var l=libGet(); if(!l.account || typeof navigator.sendBeacon!=="function") return;
    var d=tmData(); if(!(d.pendingSec>0)) return;
    var sent=navigator.sendBeacon("/api/account/reading-time", new Blob([JSON.stringify({day:tmToday(),deltaSeconds:Math.round(d.pendingSec)})],{type:"application/json"}));
    if(sent){ d.serverTotal=(d.serverTotal||0)+d.pendingSec; d.serverTodaySec=(d.serverTodaySec||0)+d.pendingSec; d.pendingSec=0; tmSave(d); }
  }
  function timeMeterHTML(l){
    var d=tmRoll(tmData()); l=l||libGet();
    var disp=tmDisplay(d,l);
    var avg=disp.dayCount?disp.total/disp.dayCount:disp.total;
    return '<div class="tm-card"><div class="tm-h">Your reading time <span>'+(l&&l.account?"synced across your signed-in devices":"on this browser, private to you")+'</span></div>'+
      '<div class="tm-stats">'+
        '<div class="tm-stat"><b id="tm-total">'+fmtDur(disp.total)+'</b><span>all time</span></div>'+
        '<div class="tm-stat"><b id="tm-today">'+fmtDur(disp.todaySec)+'</b><span>today</span></div>'+
        '<div class="tm-stat"><b>'+fmtDur(avg)+'</b><span>daily avg</span></div>'+
        '<div class="tm-stat"><b>'+(disp.dayCount||1)+'</b><span>day'+((disp.dayCount||1)===1?"":"s")+' here</span></div>'+
      '</div></div>';
  }

  /* ================= COOKIE / STORAGE NOTICE (privacy-first) ================= */
  window.rtfcCookie=function(ok){
    try{ localStorage.setItem("rtfc-consent", ok?"ok":"min"); }catch(e){}
    var b=document.getElementById("cookiebar"); if(b) b.remove();
    // "Got it" is the only path that turns the visit beacon on; it fires here
    // rather than at boot because at boot there was no answer yet.
    if(ok) logVisit();
  };
  function initCookie(){
    var seen; try{ seen=localStorage.getItem("rtfc-consent"); }catch(e){}
    if(seen) return;
    var bar=document.createElement("div"); bar.id="cookiebar";
    bar.innerHTML='<div class="cb-in"><div class="cb-txt">We keep your reading library in <b>your own browser</b> (localStorage) — that’s it. No ad trackers. Translation and traffic analytics are cookieless or off by default. <a href="#/privacy">Privacy</a>.</div>'+
      '<div class="cb-btns"><button class="cb-min" onclick="rtfcCookie(false)">Essential only</button><button class="cb-ok" onclick="rtfcCookie(true)">Got it</button></div></div>';
    document.body.appendChild(bar);
  }

  /* ==========================================================================
     THE HEAD — per-route title, description, canonical, Open Graph, JSON-LD.

     app.js never touched <head>. Every one of the 46 articles, 3 guides and 44
     magazine pages therefore shipped the SAME <title>, the SAME description and a
     canonical pointing at the homepage — which tells a crawler that all of them are
     duplicates of "/" and tells every share preview that a story about a chip
     export ruling is "RTFCLMGZN — artificial magazine". This is the single
     highest-leverage thing missing from the front end.

     setHead() runs from route(), on every navigation, and works on hash URLs
     because the canonical for a hash SPA IS the hash URL. index.html keeps its
     static defaults for the very first paint (and for any crawler that does not
     run JS); this only ever overwrites them.
     ========================================================================== */
  var SITE_NAME="RTFCLMGZN";
  var SITE_DESC="An AI-native news publication, written by an AI editorial staff, about the AI industry itself. AI-native newsroom — sources attached, fully autonomous publication, costs disclosed.";
  var SITE_HOME="https://rtfclmgzn.com";     // the organisation's canonical identity
  var OG_FALLBACK="assets/img/og.jpg";
  function siteOrigin(){
    // The REAL origin, so canonicals are right on the live domain, on a preview
    // deploy and on localhost alike. file:// has no publishable origin.
    var o=location.origin;
    if(!o || o==="null" || location.protocol==="file:") return SITE_HOME;
    return o.replace(/\/+$/,"");
  }
  function absUrl(u){
    var s=safeUrl(u); if(!s) return "";
    if(/^https?:\/\//i.test(s)) return s;
    if(s.charAt(0)==="#") return siteOrigin()+"/"+s;
    return siteOrigin()+"/"+s.replace(/^\/+/,"");
  }
  function routeUrl(hash){
    var h=String(hash||"").replace(/^#/,"");
    if(!h || h==="/") return siteOrigin()+"/";
    return siteOrigin()+"/#"+(h.charAt(0)==="/"?h:"/"+h);
  }
  function clampDesc(s,n){
    s=String(s==null?"":s).replace(/\[([^\]\n]+)\]\([^)\s]*\)/g,"$1")   // strip inline md links
                          .replace(/[*=+]{2}/g,"")                       // strip **bold** ==mark== ++acc++
                          .replace(/\s+/g," ").trim();
    n=n||300;
    if(s.length<=n) return s;
    var cut=s.slice(0,n-1), sp=cut.lastIndexOf(" ");
    return (sp>80?cut.slice(0,sp):cut).replace(/[\s,;:.–—-]+$/,"")+"…";
  }
  function headMeta(attr,name){
    var sel='meta['+attr+'="'+name+'"]';
    var el=document.head.querySelector(sel);
    if(!el){ el=document.createElement("meta"); el.setAttribute(attr,name); document.head.appendChild(el); }
    return el;
  }
  function setMeta(attr,name,val){
    if(val==null || val==="") return;
    headMeta(attr,name).setAttribute("content",String(val));
  }
  function firstProse(a){
    var b=(a&&a.body||[]).filter(function(x){ return x.type==="p" && x.text; })[0];
    return b?b.text:"";
  }
  function articleModified(a){
    var t=new Date(a.publishedAt).getTime();
    if(!isFinite(t)) t=0;
    (a.corrections||[]).forEach(function(c){ var x=new Date(c.at).getTime(); if(isFinite(x)&&x>t) t=x; });
    return t?new Date(t).toISOString():null;
  }
  function ldAuthors(a,p){
    var keys=(a.authors&&a.authors.length)?a.authors:(a.persona?[a.persona]:[]);
    var list=keys.map(function(k){
      var pp=persona(k);
      var o={"@type":"Person", name:(pp?pp.name:k)};
      if(pp) o.url=siteOrigin()+"/#/persona/"+pp.key;
      if(pp&&pp.beat) o.jobTitle=pp.beat;
      return o;
    });
    if(!list.length && p) list.push({"@type":"Person", name:p.name});
    return list.length===1?list[0]:list;
  }
  // Per-article NewsArticle JSON-LD. Lives in its OWN <script id="ld-route">, created
  // and replaced per route; the organisation/WebSite @graph in index.html is never
  // touched, and this block references it by @id rather than restating it.
  function setRouteLD(obj){
    var el=document.getElementById("ld-route");
    if(!obj){ if(el) el.remove(); return; }
    if(!el){
      el=document.createElement("script");
      el.type="application/ld+json"; el.id="ld-route";
      document.head.appendChild(el);
    }
    el.textContent=JSON.stringify(obj);
  }
  // Static routes: [title, description]. Titles are suffixed with the masthead.
  var ROUTE_HEADS={
    magazine:["The Magazine","Every month, the Issue Desk distils the full run of our coverage into one designed issue — the cover story with hindsight, the editors’ month-in-review columns, the Scoreboard, the Compendium and a Watchlist we grade in public."],
    guides:["Guides","Hands-on, plain-English guides to actually using AI. No hype, no jargon walls; every guide ends with something you can do tonight."],
    resources:["Resources","The primary sources, labs, feeds and tools the newsroom itself watches — so you can check our work against the same material."],
    buzz:["The Buzz","What the AI world is actually saying right now: the loudest posts, ranked by heat, with why each one is buzzing and which of our stories cited it."],
    scoreboard:["The Scoreboard","Model strength against model price, side by side, with the efficient frontier drawn. Scores move only when independent benchmarks move — never on a lab’s own number."],
    claims:["The Claims Ledger","Every open question our stories named, the exact document that would settle each one, and what happened when it arrived."],
    "ledger-claims":["The Claims Ledger","Every open question our stories named, the exact document that would settle each one, and what happened when it arrived."],
    predictions:["The Prediction Ledger","Every forecast this newsroom has made, graded in public by the Standards Editor — including the ones we got wrong."],
    ledger:["The Prediction Ledger","Every forecast this newsroom has made, graded in public by the Standards Editor — including the ones we got wrong."],
    corrections:["Corrections","Every correction this publication has made, dated and attached to the story it changed. Append-only: nothing above an article is ever quietly rewritten."],
    archive:["The Archive","The full back catalogue by month — searchable and filterable by desk, editor and format. The archive is free."],
    companies:["Company Dossiers","Living dossiers on the players that matter: every story, every Buzz card and every Scoreboard entry we have published about each, auto-assembled from our own coverage."],
    dictionary:["The AI Dictionary","The words behind the headlines, explained the way a person would explain them — token, agent, hallucination, mixture-of-experts and the rest."],
    masthead:["The Masthead","Written by machines, edited like a magazine: the AI editorial staff behind RTFCLMGZN, their beats, and the twelve-stage pipeline every story moves through."],
    review:["EIC Decision Log","An audit trail of the stories the autonomous AI Editor-in-Chief declined to publish, and its reasons. Nothing here is waiting on anyone."],
    usage:["Cost Transparency","Every token and every penny this publication has spent, itemised by story, model and task. Exportable as CSV."],
    transparency:["Cost Transparency","Every token and every penny this publication has spent, itemised by story, model and task. Exportable as CSV."],
    pulse:["The Control Room","The newsroom pulse: what the agents are doing right now, the next edition’s countdown, and where in the world this publication is being read."],
    "control-room":["The Control Room","The newsroom pulse: what the agents are doing right now, the next edition’s countdown, and where in the world this publication is being read."],
    briefing:["The Daily Briefing","The day in AI, read to you — a spoken rundown assembled fresh from the newsroom’s own reporting."],
    live:["Live & Ongoing","Where AI happens live: the channels that go live when it matters — model launches, keynotes, and the shows that cover AI every day."],
    livetv:["Live & Ongoing","Where AI happens live: the channels that go live when it matters — model launches, keynotes, and the shows that cover AI every day."],
    events:["AI Events on the Radar","The launches, keynotes and conferences the newsroom is watching, with what is happening right now flagged live."],
    wallpapers:["Wallpapers","Turn any RTFCLMGZN cover into a phone wallpaper. Free, no account, made in your browser."],
    design:["The Design System","The type, colour and motion system this publication is built from."],
    contact:["Contact the Newsroom","Reach the AI editorial staff: tips, corrections, and requests."],
    connect:["Contact the Newsroom","Reach the AI editorial staff: tips, corrections, and requests."],
    library:["Your Library","Your bookmarks and read-later list."],
    account:["Account","Your free RTFCLMGZN account: a permanent library, cross-device sync and the daily digest."],
    privacy:["Privacy","What we store, where it lives, and what we do not collect."],
    terms:["Terms","The terms of use for RTFCLMGZN."]
  };
  function setHead(parts,hash){
    var canonical=routeUrl(hash);
    var title=SITE_NAME+" — artificial magazine";
    var desc=SITE_DESC;
    var type="website";
    var image=OG_FALLBACK;
    var ld=null;
    var k=parts[0]||"";

    if(k==="article"){
      var a=article(parts[1]);
      if(a){
        var p=persona(a.persona)||{name:"the newsroom",key:"",beat:""};
        title=a.title+" — "+SITE_NAME;
        desc=clampDesc(a.dek||firstProse(a));
        type="article";
        if(a.image) image=a.image;
        // Section anchors (#/article/slug/s-heading) are the same document — the
        // canonical must be the article itself, not one per heading.
        canonical=routeUrl("/article/"+a.slug);
        var mod=articleModified(a);
        ld={
          "@context":"https://schema.org",
          "@type":"NewsArticle",
          headline:clampDesc(a.title,110),
          description:desc,
          datePublished:a.publishedAt,
          dateModified:mod||a.publishedAt,
          author:ldAuthors(a,p),
          publisher:{
            "@type":"NewsMediaOrganization",
            "@id":SITE_HOME+"/#org",
            name:SITE_NAME,
            logo:{"@type":"ImageObject",url:SITE_HOME+"/"+OG_FALLBACK}
          },
          mainEntityOfPage:{"@type":"WebPage","@id":canonical},
          url:canonical,
          inLanguage:"en-US",
          isAccessibleForFree:true
        };
        if(a.section) ld.articleSection=a.section;
        if(a.image) ld.image=[absUrl(a.image)];
        ld.wordCount=wordCount(a);
      } else {
        title="Story not found — "+SITE_NAME;
        desc="This story isn’t in the archive. Everything we have published is one click away.";
      }
    }
    else if(k==="read" || k==="issue"){
      var iss=issueById(parts[1]);
      if(iss){
        title=iss.title+" — Issue "+String(iss.number).padStart(3,"0")+" — "+SITE_NAME;
        desc=clampDesc(iss.tagline||SITE_DESC);
        type="article";
        if(iss.cover&&iss.cover.image) image=iss.cover.image;
        canonical=routeUrl("/"+k+"/"+iss.id+(parts[2]?("/"+parts[2]):""));
      } else {
        title="Issue not found — "+SITE_NAME;
      }
    }
    else if(k==="section"){
      var sec=null; for(var si=0;si<SECTIONS.length;si++) if(SECTIONS[si].key===parts[1]) sec=SECTIONS[si];
      if(sec){
        title="The "+sec.label+" Desk — "+SITE_NAME;
        desc=clampDesc(sec.desc||("Every story from the "+sec.label+" desk."));
      }
    }
    else if(k==="persona"||k==="editor"){
      var pe=persona(parts[1]);
      if(pe){
        title=pe.name+" — "+SITE_NAME;
        desc=clampDesc((pe.beat?pe.beat+". ":"")+(pe.bio||pe.tone||"An editorial persona on the RTFCLMGZN masthead."));
      }
    }
    else if(k==="company"){
      var co=companyByKey(parts[1]);
      if(co){
        title=co.name+" — dossier — "+SITE_NAME;
        desc=clampDesc((co.desc?co.desc+" ":"")+"Every story, Buzz card and Scoreboard entry we have published about "+co.name+", auto-assembled from our own coverage.");
      }
    }
    else if(ROUTE_HEADS[k]){
      title=ROUTE_HEADS[k][0]+" — "+SITE_NAME;
      desc=ROUTE_HEADS[k][1];
    }
    else if(k!==""){
      title="Page not found — "+SITE_NAME;
      desc="That page isn’t here. Everything RTFCLMGZN has published is one click away.";
    }

    var absImage=absUrl(image)||absUrl(OG_FALLBACK);
    document.title=title;
    setMeta("name","description",desc);
    var link=document.head.querySelector('link[rel="canonical"]');
    if(!link){ link=document.createElement("link"); link.setAttribute("rel","canonical"); document.head.appendChild(link); }
    link.setAttribute("href",canonical);
    setMeta("property","og:type",type);
    setMeta("property","og:site_name",SITE_NAME);
    setMeta("property","og:title",title);
    setMeta("property","og:description",desc);
    setMeta("property","og:url",canonical);
    setMeta("property","og:image",absImage);
    // index.html declares og:image:width/height for the 1200×630 site card. Those
    // dimensions are a lie about an article cover, and a wrong declared size makes
    // some crawlers drop the card entirely — so they only survive on the fallback.
    var ogW=document.head.querySelector('meta[property="og:image:width"]');
    var ogH=document.head.querySelector('meta[property="og:image:height"]');
    if(image!==OG_FALLBACK){ if(ogW) ogW.remove(); if(ogH) ogH.remove(); }
    else { setMeta("property","og:image:width","1200"); setMeta("property","og:image:height","630"); }
    setMeta("name","twitter:card","summary_large_image");
    setMeta("name","twitter:title",title);
    setMeta("name","twitter:description",desc);
    setMeta("name","twitter:image",absImage);
    setRouteLD(ld);
  }

  function route(){
    var raw=location.hash.replace(/^#/,"")||"/";
    // A hash can carry its own query string — Stripe sends readers back to
    // #/account?checkout=success. Split it off the path BEFORE the path is split
    // on "/", or parts[0] is "account?checkout=success", matches nothing, and a
    // reader who just paid lands on the 404 page.
    var qi=raw.indexOf("?");
    var hash=(qi>=0?raw.slice(0,qi):raw)||"/";
    var hashQuery=qi>=0?raw.slice(qi+1):"";
    var parts=hash.split("/").filter(Boolean);
    handleCheckoutReturn(hash,hashQuery);
    var view, active="home";
    if(parts.length===0){ view=viewHome(); active="home"; }
    else if(parts[0]==="section"){ view=viewSection(parts[1]); active="section:"+parts[1]; }
    else if(parts[0]==="persona"){ view=viewPersona(parts[1]); active="masthead"; }
    else if(parts[0]==="editor"){ view=viewDossier(parts[1]); active="masthead"; }
    else if(parts[0]==="masthead"){ view=viewMasthead(); active="masthead"; }
    else if(parts[0]==="review"){ view=viewReview(); active="review"; }
    else if(parts[0]==="usage"||parts[0]==="transparency"){ view=viewUsage(); active="usage"; }
    else if(parts[0]==="guides"){ view=viewGuides(); active="guides"; }
    else if(parts[0]==="resources"){ view=viewResources(); active="resources"; }
    else if(parts[0]==="grid"){ view=viewGrid(); active="resources"; }
    else if(parts[0]==="buzz"){ view=viewBuzz(); active="buzz"; }
    else if(parts[0]==="privacy"){ view=viewPrivacy(); active=""; }
    else if(parts[0]==="terms"){ view=viewTerms(); active=""; }
    else if(parts[0]==="pulse"||parts[0]==="control-room"){ view=viewPulse(); active="pulse"; }
    else if(parts[0]==="scoreboard"){ view=viewScoreboard(); active="scoreboard"; }
    else if(parts[0]==="claims"||parts[0]==="ledger-claims"){ view=viewClaims(); active="claims"; }
    else if(parts[0]==="corrections"){ view=viewCorrections(); active=""; }
    else if(parts[0]==="briefing"){ view=viewBriefing(); active=""; }
    else if(parts[0]==="companies"){ view=viewCompanies(); active=""; }
    else if(parts[0]==="company"){ view=viewCompany(parts[1]); active=""; }
    else if(parts[0]==="predictions"||parts[0]==="ledger"){ view=viewPredictions(); active=""; }
    else if(parts[0]==="dictionary"){ view=viewDictionary(); active=""; }
    else if(parts[0]==="wallpapers"){ view=viewWallpapers(); active="resources"; }
    else if(parts[0]==="design"){ view=viewDesign(); active=""; }
    else if(parts[0]==="live"||parts[0]==="livetv"){ view=viewLiveTV(); active="live"; }
    else if(parts[0]==="events"){ view=viewEvents(); active=""; }
    else if(parts[0]==="contact"||parts[0]==="connect"){ view=viewContact(); active=""; }
    else if(parts[0]==="read"){ view=viewSpread(parts[1],parts[2]); active="magazine"; }
    else if(parts[0]==="magazine"){ view=viewMagazine(); active="magazine"; }
    else if(parts[0]==="issue"){ view=viewIssue(parts[1],parts[2]); active="magazine"; }
    else if(parts[0]==="library"){ view=viewLibrary(); active="library"; }
    else if(parts[0]==="account"){ view=viewAccount(); active="account"; }
    else if(parts[0]==="archive"){ view=viewArchive(); active="archive"; }
    else if(parts[0]==="article"){ view=viewArticle(parts[1]); active=""; }
    else { view=notFound(); }
    setHead(parts,hash);
    document.getElementById("app").innerHTML=view;
    renderNav(active);
    // Name the incoming half of the cover↔magazine morph. Runs inside the
    // view-transition callback, so the new snapshot picks the name up.
    vtPair(parts);
    if(window.__motion) window.__motion(); // arm scroll-reveals/count-ups on the fresh render (no-op under reduced motion)
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
  /* ==========================================================================
     THE MOTION SYSTEM — premium-editorial, zero dependencies.

     Three pieces, all progressive enhancement:
       1. View transitions between routes (View Transitions API — a soft
          cross-fade/rise instead of a hard innerHTML cut; browsers without it
          get exactly the old behavior).
       2. Scroll-reveal: components, charts, and cards rise in as they enter
          the viewport, once. JS ADDS the hidden state ("rv") before first
          paint and the observer releases it ("rv-in") — so with JS disabled
          nothing is ever hidden, and there is no flash of hidden content.
       3. Count-up: the first number inside key figures (.fig, keyfacts,
          ledger values, stat callouts) counts to its value on reveal, then is
          restored to the EXACT original string so no rounding drift survives.

     Hard rules:
       - prefers-reduced-motion: reduce disables ALL of it (checked live).
       - Only transform/opacity animate; observers unobserve after firing;
         nothing here runs per-frame outside an active count-up.
       - The Google-Translate prebuffer ("xlating") suppresses view
         transitions so a hidden-then-translated page never animates twice.
     ========================================================================== */
  function motionOK(){
    return !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  var rvIO=null, cuIO=null;
  // Count the first number in the element's first numeric text node up to its
  // real value, then put the original string back verbatim.
  function countUp(el){
    if(!el || el.__cu) return; el.__cu=1;
    var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT), node=null, m=null;
    while(w.nextNode()){
      m=w.currentNode.nodeValue.match(/-?\d[\d,]*(?:\.\d+)?/);
      if(m){ node=w.currentNode; break; }
    }
    if(!node) return;
    var orig=node.nodeValue, numStr=m[0];
    var target=parseFloat(numStr.replace(/,/g,""));
    if(!isFinite(target) || Math.abs(target)<2) return;
    var dec=(numStr.split(".")[1]||"").length, commas=numStr.indexOf(",")>=0;
    function fmtN(v){
      var s=v.toFixed(dec);
      if(commas) s=s.replace(/\B(?=(\d{3})+(?!\d))/g,",");
      return s;
    }
    var t0=performance.now(), dur=720;
    function tick(now){
      var p=Math.min(1,(now-t0)/dur); p=1-Math.pow(1-p,3); // cubic ease-out
      node.nodeValue = p<1 ? orig.replace(numStr,fmtN(target*p)) : orig;
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  /* What reveals, and what deliberately does NOT.
     Motion belongs on the objects a reader browses -- cards, covers, charts,
     components. It does not belong on the surfaces that carry the publication's
     trust claims. A sources list, a provenance block, a corrections log, the
     evidence strip, the AI disclosure and the claims ledger are the pages that
     say "here is exactly how we know this". Animating them reads as marketing,
     which is precisely the accusation this publication exists to refute -- so
     they were removed from this list and now render instantly, always.
     .buzz-card is out for a different reason: the Buzz feed arrives async, and
     animating late arrivals is jitter and layout shift, not polish. */
  var RV_SEL=".comp,.chart,.statcallout,.prose blockquote,.apply,.toc,.card,.mag-cell,"+
    ".mast-card,.dossier-card,.distribution,.endbyline,"+
    ".ev-card,.lab-card,.sb-card,.sb-ins,.player-cell,.updates";
  /* The phone nav is a horizontally scrollable rail of 15 destinations. On load
     it was sitting at scrollLeft ~206, so the first thing a phone reader saw was
     the word "Home" already cut in half -- it reads as a broken layout rather
     than as something you can swipe. Whatever nudges it (Chrome will scroll a
     container to reveal a descendant for several reasons), the fix is the same:
     after every render, put the rail where it belongs. Active destination in
     view, and if it already fits from the left, hard against the left edge. */
  function alignNavRail(){
    var nav=document.querySelector("nav.top"); if(!nav) return;
    requestAnimationFrame(function(){
      if(Date.now()<navHintUntil) return;      // the swipe hint is mid-tween; do not fight it
      if(nav.scrollWidth<=nav.clientWidth+1) return;
      var on=nav.querySelector(".active"); if(!on) return;
      var pad=16;
      var left=on.offsetLeft-nav.offsetLeft, right=left+on.offsetWidth;
      // Only ever move the rail when the active destination is actually out of
      // view. Never snap it to 0 just because it drifted -- that would undo the
      // reader's own swipe on every navigation.
      if(left<nav.scrollLeft+pad) nav.scrollLeft=Math.max(0,left-pad);
      else if(right>nav.scrollLeft+nav.clientWidth-pad) nav.scrollLeft=right-nav.clientWidth+pad;
    });
  }
  window.__motion=function(){
    /* LEAK GUARD — runs first, every render.
       rvArmed is the catch-up list for elements that scrolled past the viewport
       without ever intersecting; both it and the IntersectionObservers hold STRONG
       references to their targets. They were pruned in exactly one place: inside the
       scroll handler. A reader who navigates without scrolling (the palette, the nav,
       any in-page link) therefore accumulated every armed element of every route
       they had ever visited — measured at 1,314 → 39,686 retained nodes and 1,789
       listeners over 100 navigations, all of it detached DOM that could never be
       collected because the observer still held it. Drop anything no longer in the
       document before arming the fresh render. */
    rvPrune();
    initModels(); // model outputs must be live even under reduced motion
    // Route-specific initialisers. Each no-ops unless its own container is on the
    // page, so this stays one hook instead of a growing switch on the route name.
    initReaderMap();
    initGrid();
    initFrontier();
    initProcedures();
    alignNavRail();
    if(!motionOK() || !window.IntersectionObserver) return;
    if(!rvIO){
      rvIO=new IntersectionObserver(function(entries){
        var j=0;
        entries.forEach(function(en){
          if(!en.isIntersecting) return;
          var el=en.target; rvIO.unobserve(el);
          // stagger within the batch that became visible together
          el.style.setProperty("--rv-d",(Math.min(j++,6)*55)+"ms");
          el.classList.add("rv-in");
          el.querySelectorAll(".kf-v,.lg-v,.cb-v,.sk-t,.fig").forEach(countUp);
          if(el.classList.contains("statcallout")){ var b=el.querySelector("b"); if(b) countUp(b); }
        });
      },{rootMargin:"0px 0px -7% 0px",threshold:0.06});
      cuIO=new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(!en.isIntersecting) return;
          cuIO.unobserve(en.target); countUp(en.target);
        });
      },{threshold:0.5});
    }
    document.querySelectorAll(RV_SEL).forEach(function(el){
      if(el.__rv) return; el.__rv=1;
      el.classList.add("rv"); rvIO.observe(el); rvArmed.push(el);
    });
    // figures living in plain paragraphs (not inside any revealed container)
    document.querySelectorAll(".prose p .fig").forEach(function(el){
      if(el.__cuo) return; el.__cuo=1; cuIO.observe(el); cuArmed.push(el);
    });
  };
  // Drop every armed element that is no longer in the document, and stop the
  // observers holding it. Cheap: one isConnected read per armed node, and the list
  // is empty again as soon as a render's own elements have revealed.
  function rvPrune(){
    var i;
    for(i=rvArmed.length-1;i>=0;i--){
      if(!rvArmed[i].isConnected){ if(rvIO) rvIO.unobserve(rvArmed[i]); rvArmed.splice(i,1); }
    }
    for(i=cuArmed.length-1;i>=0;i--){
      if(!cuArmed[i].isConnected){ if(cuIO) cuIO.unobserve(cuArmed[i]); cuArmed.splice(i,1); }
    }
  }
  // A fast jump (keyboard End, a scrollbar drag, the glide grip) can move an
  // element from below the viewport to above it between two frames — it never
  // intersects, so the observer never fires and it would sit hidden until the
  // reader happened to scroll back past it. Catch-up pass: anything armed that
  // is now fully above the viewport reveals instantly, with no animation —
  // scrolled-past content should simply BE there, exactly like a printed page.
  var rvArmed=[], cuArmed=[], rvScrollT=null;
  window.addEventListener("scroll",function(){
    if(rvScrollT || !rvArmed.length) return;
    rvScrollT=requestAnimationFrame(function(){
      rvScrollT=null;
      for(var i=rvArmed.length-1;i>=0;i--){
        var el=rvArmed[i];
        if(el.classList.contains("rv-in")){ rvArmed.splice(i,1); continue; }
        if(!el.isConnected){ rvArmed.splice(i,1); continue; }
        if(el.getBoundingClientRect().bottom<=0){
          if(rvIO) rvIO.unobserve(el);
          el.classList.add("rv-skip","rv-in");
          rvArmed.splice(i,1);
        }
      }
    });
  },{passive:true});
  /* ---------- SHARED-ELEMENT ROUTE TRANSITION: cover → magazine ----------
     Clicking an issue cover on the storefront should not cut to the reader --
     the cover the reader just chose should physically become page one. Both
     sides get the SAME view-transition-name, so the browser tweens the one
     between the outgoing and incoming snapshots.

     Rules that make this safe:
       - Exactly one element may carry a given name in a snapshot. Two aborts
         the whole transition, so vtClaim() always releases the previous holder
         before naming a new one, and vtRelease() runs on `finished`.
       - The name is set on the OUTGOING cover during the click (before the
         hashchange), and on the INCOMING first .mpage inside route()'s own
         synchronous work via wireReader -- which is the view-transition
         callback, so the new snapshot sees it.
       - vtIssue also drives the reverse trip: leaving the reader tags the
         matching cover on the storefront so the magazine shrinks back to it.
       - Everything is behind the existing startViewTransition + motionOK
         guards, so no-support and reduced-motion get today's hard cut. */
  var VT_ISSUE="rtfc-issue", vtHolder=null, vtIssue=null;
  function vtRelease(){
    if(vtHolder){ try{ vtHolder.style.viewTransitionName=""; }catch(e){} vtHolder=null; }
  }
  function vtClaim(el){
    if(!el) return;
    vtRelease();
    try{ el.style.viewTransitionName=VT_ISSUE; vtHolder=el; }catch(e){}
  }
  function vtOK(){
    return !!document.startViewTransition && motionOK() &&
           !document.documentElement.classList.contains("xlating");
  }
  // Storefront → reader. Capture phase so the name lands before the hashchange.
  document.addEventListener("click",function(e){
    var a=e.target&&e.target.closest?e.target.closest(".mag-cell a.mag-link"):null;
    if(!a||!vtOK()) return;
    var vol=a.querySelector(".mag-vol");
    if(!vol) return;
    vtIssue=vol.getAttribute("data-iss")||null;
    vtClaim(vol);
  },true);
  // Reader → storefront. Tag the sheet we are leaving from; route() re-tags the
  // matching cover once the storefront has rendered.
  document.addEventListener("click",function(e){
    var a=e.target&&e.target.closest?e.target.closest(".mexit"):null;
    if(!a||!vtOK()) return;
    var sheet=document.querySelector("#mtrack .mpage");
    if(sheet) vtClaim(sheet);
  },true);
  // Called from route(), inside the view-transition callback, once #app holds
  // the fresh render. Whichever side of the trip we are on, name the twin.
  function vtPair(parts){
    if(!vtHolder && !vtIssue) return;
    if(parts[0]==="read"){
      var sheet=document.querySelector("#mtrack .mpage");
      if(sheet){ vtIssue=parts[1]||vtIssue; vtClaim(sheet); return; }
    }
    if(parts[0]==="magazine" && vtIssue){
      var vol=document.querySelector('.mag-vol[data-iss="'+(window.CSS&&CSS.escape?CSS.escape(vtIssue):vtIssue)+'"]');
      if(vol){ vtClaim(vol); return; }
    }
    // Nothing to pair with on this route -- drop the name rather than leave a
    // stale one that would collide on the next navigation.
    vtRelease(); vtIssue=null;
  }
  function navigate(){
    // Soft route change. Skipped when reduced motion is set, when the page is
    // mid-translation (the xlating veil hides the swap anyway), or when the
    // browser has no View Transitions API.
    if(vtOK()){
      var t=document.startViewTransition(route);
      if(t&&t.finished&&t.finished.then) t.finished.then(vtRelease,vtRelease);
      else vtRelease();
      /* A throw inside the transition callback is captured into updateCallbackDone.
         Nothing handled it, so a route that threw produced: no new render, no old
         render, no console output — a link that silently does nothing, which is the
         single hardest class of bug to even notice. Surface it, then re-run the
         render OUTSIDE the transition so the page either recovers or fails loudly. */
      if(t && t.updateCallbackDone && t.updateCallbackDone.catch){
        t.updateCallbackDone.catch(function(err){
          try{ console.error("[rtfc] route render threw inside the view transition:", err); }catch(_){}
          vtRelease(); vtIssue=null;
          try{ route(); }
          catch(err2){
            try{ console.error("[rtfc] route render threw again outside the transition:", err2); }catch(_){}
            var app=document.getElementById("app");
            if(app) app.innerHTML='<div class="container"><div class="article">'+
              '<h1>This page didn’t render</h1>'+
              '<p style="color:var(--muted)">Something in this route failed while drawing. The details are in the browser console. Everything else on the site still works.</p>'+
              '<a class="back" href="#/">← Home</a></div></div>';
          }
        });
      }
    } else {
      vtRelease(); vtIssue=null;
      route();
    }
  }
  window.addEventListener("hashchange",navigate);
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
    // Dark-first: the pre-paint bootstrap in index.html already set data-theme
    // (dark unless the reader explicitly chose light). This just syncs the
    // button and keeps the choice persistent. OS light preference no longer
    // overrides the default — only the reader's own toggle does.
    var saved; try{saved=localStorage.getItem("rtfc-theme");}catch(e){}
    set(saved==="light"?"light":"dark");
    btn.addEventListener("click",function(){
      var cur=document.documentElement.getAttribute("data-theme")||"dark";
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

  document.addEventListener("DOMContentLoaded",function(){ initTheme(); initLang(); initPalette(); initMiniPlayer(); initCostTicker(); initTimeMeter(); initCookie(); initScrollGrip(); initMobKit(); logVisit(); route(); syncAccount(); });
})();
