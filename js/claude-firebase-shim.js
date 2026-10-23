/* ------------------------------------------------------------------
   NMD Development Desk — Firebase bridge
   The dashboard was written for claude.ai, where it talks to
   window.claude.use("db" | "downloads" | "permissions").
   This file gives it the same small API on top of Google Firebase
   (Firestore + Authentication), so the dashboard code itself does
   not change when it is hosted on GitHub Pages.
------------------------------------------------------------------- */
(function(){
  "use strict";
  var cfg = window.NMD_FIREBASE_CONFIG, authCfg = window.NMD_AUTH || {mode:"google"};

  function fail(msg){
    var box = document.createElement("div");
    box.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#0e3f39;color:#fff;font:15px/1.5 system-ui,sans-serif;padding:24px";
    box.innerHTML = "<div style='max-width:520px'><h2 style='margin:0 0 8px'>NMD Development Desk</h2><p>" + msg + "</p></div>";
    document.body.appendChild(box);
  }
  if(!window.firebase){ document.addEventListener("DOMContentLoaded", function(){ fail("Firebase did not load. Check the internet connection and reload."); }); return; }
  if(!cfg || /PASTE_/.test(cfg.apiKey || "PASTE_")){
    document.addEventListener("DOMContentLoaded", function(){ fail("Firebase is not set up yet. Fill in <b>firebase-config.js</b> (see README, Part B, step 5)."); });
    return;
  }

  firebase.initializeApp(cfg);
  var fs = firebase.firestore();
  try { fs.settings({ignoreUndefinedProperties:true, merge:true}); } catch(e){}
  var auth = firebase.auth();

  /* ---------- sign-in gate ---------- */
  function allowed(user){
    if(!user) return false;
    if(authCfg.mode === "anonymous") return true;
    return emailAllowed(user.email);
  }
  /* sign-in: company e-mail + password (accounts made by the admin), an e-mailed link, or Google */
  var gate = null, LS_KEY = "nmd_signin_email";
  function lsGet(){ try { return localStorage.getItem(LS_KEY) || ""; } catch(e){ return ""; } }
  function lsSet(v){ try { if(v) localStorage.setItem(LS_KEY, v); else localStorage.removeItem(LS_KEY); } catch(e){} }
  function showGate(msg){
    if(!gate){
      gate = document.createElement("div");
      gate.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:linear-gradient(160deg,#0e7c6b,#0b4f47);color:#fff;font:15px/1.5 system-ui,sans-serif;padding:24px";
      var btn = "font:600 15px system-ui;padding:12px 22px;border-radius:10px;border:0;cursor:pointer;";
      var inp = "font:15px system-ui;padding:12px 14px;border-radius:10px;border:0;width:100%;box-sizing:border-box;color:#15201f;background:#fff";
      gate.innerHTML = "<form id='nmdGateForm' style='max-width:420px;width:100%;text-align:center;display:grid;gap:12px'>" +
        "<div style='font:700 26px/1.2 system-ui;letter-spacing:.04em'>NMD DEVELOPMENT DESK</div>" +
        "<p id='nmdGateMsg' style='opacity:.92;margin:0'></p>" +
        "<input id='nmdGateEmail' type='email' required autocomplete='username' placeholder='name@pmiglobal.co.in' style='" + inp + "'>" +
        "<input id='nmdGatePass' type='password' autocomplete='current-password' placeholder='Password' style='" + inp + "'>" +
        "<button type='submit' style='" + btn + "background:#ffb020;color:#1d1300'>Sign in</button>" +
        "<button type='button' id='nmdGateLink' style='border:0;background:none;color:#d9f3ee;font:13px system-ui;cursor:pointer;text-decoration:underline'>No password? E-mail me a sign-in link instead</button>" +
        (authCfg.google !== false ? "<button type='button' id='nmdGateGoogle' style='" + btn + "background:transparent;color:#fff;border:1px solid rgba(255,255,255,.6)'>or sign in with Google</button>" : "") +
        "<div style='font:11px ui-monospace,monospace;opacity:.55'>sign-in v3</div>" +
        "</form>";
      document.body.appendChild(gate);
      var emEl = gate.querySelector("#nmdGateEmail"), pwEl = gate.querySelector("#nmdGatePass");
      emEl.value = lsGet();
      function emailOk(){
        var em = emEl.value.trim().toLowerCase();
        if(!em){ emEl.focus(); return ""; }
        if(!emailAllowed(em)){ showGate("<b>" + em + "</b> is not allowed. Use your company e-mail."); return ""; }
        return em;
      }
      gate.querySelector("#nmdGateForm").onsubmit = function(ev){
        ev.preventDefault();
        var em = emailOk(); if(!em) return;
        if(!pwEl.value){ pwEl.focus(); return; }
        auth.signInWithEmailAndPassword(em, pwEl.value).then(function(){ lsSet(em); pwEl.value = ""; })
          .catch(function(e){
            var c = e && e.code;
            showGate(c === "auth/wrong-password" || c === "auth/invalid-credential" || c === "auth/invalid-login-credentials" || c === "auth/user-not-found"
              ? "E-mail or password is wrong. Ask the Development Head if you do not have a password yet."
              : c === "auth/too-many-requests" ? "Too many tries. Wait a few minutes and try again."
              : "Could not sign in (" + (c || e.message) + "). Try again.");
          });
      };
      gate.querySelector("#nmdGateLink").onclick = function(){
        var em = emailOk(); if(!em) return;
        auth.sendSignInLinkToEmail(em, {url: location.href.split("#")[0].split("?")[0], handleCodeInApp: true}).then(function(){
          lsSet(em);
          showGate("Link sent to <b>" + em + "</b>. Open your Outlook inbox (check Junk too) and click the link <b>on this same device and browser</b>.");
        }).catch(function(e){
          showGate(e && e.code === "auth/quota-exceeded"
            ? "Today's limit for sign-in e-mails is used up. Sign in with your password instead."
            : "Could not send the link (" + (e.code || e.message) + "). Try again.");
        });
      };
      var g = gate.querySelector("#nmdGateGoogle");
      if(g) g.onclick = function(){
        var p = new firebase.auth.GoogleAuthProvider();
        p.setCustomParameters({prompt:"select_account"});
        auth.signInWithPopup(p).catch(function(e){ showGate("Sign-in did not finish (" + (e.code || e.message) + "). Try again."); });
      };
    }
    gate.querySelector("#nmdGateMsg").innerHTML = msg;
    gate.hidden = false;
  }
  function emailAllowed(em){
    em = String(em || "").toLowerCase();
    if((authCfg.allowedEmails || []).some(function(x){ return x.toLowerCase() === em; })) return true;
    return (authCfg.allowedDomains || []).some(function(d){ return em.slice(-(d.length + 1)) === "@" + d.toLowerCase(); });
  }
  /* coming back from the e-mail link */
  try {
    if(auth.isSignInWithEmailLink && auth.isSignInWithEmailLink(location.href)){
      var em = lsGet();
      if(!em) em = (window.prompt && window.prompt("Confirm your e-mail address")) || "";
      if(em) auth.signInWithEmailLink(em, location.href).then(function(){
        history.replaceState(null, "", location.href.split("?")[0]);
      }).catch(function(e){ onBody(function(){ showGate("This sign-in link has expired or was already used (" + e.code + "). Ask for a new one."); }); });
    }
  } catch(e){}
  var ready = new Promise(function(resolve){
    auth.onAuthStateChanged(function(user){
      if(authCfg.mode === "anonymous"){
        if(!user){ auth.signInAnonymously().catch(function(e){ fail("Could not connect (" + e.code + ")."); }); return; }
        resolve(user); return;
      }
      if(!user){ onBody(function(){ showGate("Sign in with your company e-mail and password. You stay signed in on this computer."); }); return; }
      if(!allowed(user)){
        onBody(function(){ showGate("<b>" + user.email + "</b> is not allowed to open this dashboard. Use your company e-mail."); });
        auth.signOut(); return;
      }
      if(gate) gate.hidden = true;
      resolve(user);
    });
  });
  function onBody(fn){ if(document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }

  /* ---------- the db API the dashboard expects ---------- */
  function mapErr(e){
    var c = e && e.code;
    /* the dashboard treats "invalid_argument" as "not allowed / not there" */
    if(c === "permission-denied" || c === "not-found") return {code:"invalid_argument", message:e.message};
    return {code:(c || "error").replace(/-/g, "_"), message:e && e.message};
  }
  function wrapDoc(s){
    return {id:s.id, exists:!!s.exists, data:function(){ return s.exists ? s.data() : undefined; }};
  }
  function wrapCol(q){ return {docs:q.docs.map(wrapDoc), size:q.size, empty:q.empty}; }
  function clean(o){ return JSON.parse(JSON.stringify(o == null ? {} : o)); }

  function docRef(path){
    var r = fs.doc(path);
    return {
      id: r.id,
      get: function(){ return r.get().then(wrapDoc, function(e){ throw mapErr(e); }); },
      set: function(d){ return r.set(clean(d)).catch(function(e){ throw mapErr(e); }); },
      update: function(d){ return r.update(clean(d)).catch(function(e){ throw mapErr(e); }); },
      delete: function(){ return r.delete().catch(function(e){ throw mapErr(e); }); },
      onSnapshot: function(fn, err){ return r.onSnapshot(function(s){ fn(wrapDoc(s)); }, function(e){ if(err) err(mapErr(e)); }); },
      /* a short shared lock so only one open dashboard runs a job at a time */
      acquire: function(o){
        o = o || {};
        var lock = fs.doc("_locks/" + path.replace(/\//g, "__")), ttl = o.ttlMs || 15000, holder = o.holder || String(Math.random());
        return fs.runTransaction(function(tx){
          return tx.get(lock).then(function(s){
            var now = Date.now(), d = s.exists ? s.data() : null;
            if(d && d.until > now && d.holder !== holder) return {acquired:false};
            tx.set(lock, {holder:holder, until:now + ttl});
            return {acquired:true};
          });
        }).catch(function(){ return {acquired:false}; });
      },
      release: function(){ return fs.doc("_locks/" + path.replace(/\//g, "__")).delete().catch(function(){}); }
    };
  }
  function colRef(name, lim){
    var q = lim ? fs.collection(name).limit(lim) : fs.collection(name);
    return {
      doc: function(id){ return docRef(name + "/" + id); },
      limit: function(n){ return colRef(name, n); },
      get: function(){ return q.get().then(wrapCol, function(e){ throw mapErr(e); }); },
      onSnapshot: function(fn, err){ return q.onSnapshot(function(s){ fn(wrapCol(s)); }, function(e){ if(err) err(mapErr(e)); }); }
    };
  }
  var db = {doc:docRef, collection:function(n){ return colRef(n); }};

  /* ---------- downloads: a normal browser download ---------- */
  var downloads = {
    save: function(o){
      var data = o.data, type = o.mimeType || o.type ||
        (/\.xlsx$/i.test(o.filename) ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/octet-stream");
      var blob = data instanceof Blob ? data : new Blob([data], {type:type});
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = o.filename || "download";
      document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      return Promise.resolve();
    }
  };

  var api = {db:db, downloads:downloads, permissions:{request:function(){ return Promise.resolve({}); }, state:function(){ return Promise.resolve({}); }}};
  window.claude = {
    use: function(name){ return ready.then(function(){ return api[name] || null; }); }
  };
  window.NMD_SIGN_OUT = function(){ return auth.signOut().then(function(){ location.reload(); }); };
})();
