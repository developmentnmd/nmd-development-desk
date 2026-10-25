/* ------------------------------------------------------------------
   NMD Development Desk — weekly e-mail report (Google Apps Script)
   Runs inside reportspmi411@gmail.com on Google's servers, reads the
   Firebase (Firestore) data and mails the two-part report every
   Thursday morning. No passwords or keys are stored here: the script
   uses the Google account's own access to the Firebase project.

   One-time setup: see README.md in this folder.
------------------------------------------------------------------- */

var CONFIG = {
  PROJECT_ID: "PASTE_PROJECT_ID",                 // Firebase → Project settings → Project ID
  RECIPIENTS: "development.nmd@pmiglobal.co.in, manish.teli@pmiglobal.co.in",
  DASHBOARD_URL: "https://YOUR-NAME.github.io/nmd-development-desk/",
  SENDER_NAME: "NMD Development Desk",
  TIMEZONE: "Asia/Kolkata",
  SEND_DAY: "THURSDAY",
  SEND_HOUR: 8                                     // 8 = between 8 and 9 am
};

/* ===== run these from the editor ===== */

/** 1) Run once: creates the weekly Thursday trigger (and removes old ones). */
function installWeeklyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "sendWeeklyReport") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("sendWeeklyReport").timeBased()
    .onWeekDay(ScriptApp.WeekDay[CONFIG.SEND_DAY]).atHour(CONFIG.SEND_HOUR)
    .inTimezone(CONFIG.TIMEZONE).create();
  Logger.log("Weekly report will be sent every " + CONFIG.SEND_DAY + " " + CONFIG.SEND_HOUR + ":00–" + (CONFIG.SEND_HOUR + 1) + ":00 " + CONFIG.TIMEZONE);
}

/** 2) Test: sends the report only to this Google account. */
function sendTestToMe() {
  var r = buildReport_(loadAll_(), todayIST_());
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "[TEST] " + r.subject, r.text,
    {htmlBody: r.html, name: CONFIG.SENDER_NAME});
  Logger.log("Test sent to " + Session.getEffectiveUser().getEmail() + " — " + r.summary);
}

/** The weekly job (called by the trigger). */
function sendWeeklyReport() {
  var r = buildReport_(loadAll_(), todayIST_());
  MailApp.sendEmail(CONFIG.RECIPIENTS, r.subject, r.text, {htmlBody: r.html, name: CONFIG.SENDER_NAME});
  Logger.log("Sent: " + r.summary);
}

/* ===== reading Firestore ===== */

function loadAll_() {
  var out = {};
  ["tasks", "projects", "sdbs", "customers", "config"].forEach(function (c) { out[c] = loadCollection_(c); });
  return out;
}
function loadCollection_(col) {
  if (/PASTE_/.test(CONFIG.PROJECT_ID)) throw new Error("Set CONFIG.PROJECT_ID first (Firebase → Project settings → Project ID).");
  var base = "https://firestore.googleapis.com/v1/projects/" + CONFIG.PROJECT_ID + "/databases/(default)/documents/" + col;
  var docs = {}, token = "";
  do {
    var res = UrlFetchApp.fetch(base + "?pageSize=300" + (token ? "&pageToken=" + encodeURIComponent(token) : ""), {
      headers: {Authorization: "Bearer " + ScriptApp.getOAuthToken()}, muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) throw new Error("Firestore " + col + ": " + res.getResponseCode() + " " + res.getContentText().slice(0, 300));
    var j = JSON.parse(res.getContentText());
    (j.documents || []).forEach(function (d) {
      var id = d.name.split("/").pop();
      docs[id] = decodeFields_(d.fields || {});
    });
    token = j.nextPageToken || "";
  } while (token);
  return docs;
}
function decodeFields_(f) { var o = {}; Object.keys(f).forEach(function (k) { o[k] = decodeValue_(f[k]); }); return o; }
function decodeValue_(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return decodeFields_(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decodeValue_);
  return null;
}

/* ===== dates (all as yyyy-mm-dd strings, India time) ===== */

function todayIST_() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd"); }
function addDays_(d, n) { var x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function diffDays_(a, b) { return Math.round((new Date(a + "T00:00:00Z") - new Date(b + "T00:00:00Z")) / 864e5); } // a - b
var MON_ = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fd_(d) { return d ? d.slice(8, 10) + " " + MON_[+d.slice(5, 7) - 1] : "—"; }
function D_(s) { return s ? String(s).slice(0, 10) : null; }

/* ===== the report (same rules as the dashboard) ===== */

function buildReport_(db, today) {
  var T = db.tasks, P = db.projects, SD = db.sdbs, CU = db.customers;
  var team = (db.config.team && db.config.team.people) || [];
  var W = db.config.scoring || {};
  var lw0 = addDays_(today, -7), lw1 = addDays_(today, -1), nw1 = addDays_(today, 6);
  var e = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;"); };
  var name = {}; team.forEach(function (m) { name[m.id] = m.name; }); name.head = "Manish Teli"; name.owner = "Mayur Mundra";
  var first = function (i) { return String(name[i] || i || "—").split(" ")[0]; };
  var num = function (x) { var s = String(x == null ? "" : x).trim(); return (s === "" || s === "None") ? 0 : (parseFloat(s) || 0); };
  var vals = function (o) { return Object.keys(o).sort().map(function (k) { return o[k]; }); };

  /* priority bands */
  var wget = function (k, d) { return num(W[k]) || d; };
  var wV = wget("wValue", 50), wC = wget("wCustomer", 25), wG = wget("wGrowth", 25), gF = wget("growthFull", 25);
  var active = function (p) { return p.status !== "Completed" && p.status !== "Dropped"; };
  var pval = function (p) {
    if (p.type === "qve") return num(p.savingPerPc) * num(p.qtyPerMonth);
    var q = num(p.qty), r = num(p.rate), m = p.msr;
    if (!q || !r) return 0;
    return q * r / 12 * (1 - ((m === "" || m == null) ? 0.45 : parseFloat(m)));
  };
  var known = function (p) { return p.type === "qve" ? (num(p.savingPerPc) > 0 && num(p.qtyPerMonth) > 0) : (num(p.qty) > 0 && num(p.rate) > 0); };
  var sale = function (p) { return p.type === "qve" ? pval(p) : num(p.qty) * num(p.rate) / 12; };
  var cust = function (p) {
    var k = String(p.customer || "").trim().toLowerCase();
    return vals(CU).filter(function (c) { return String(c.name || "").trim().toLowerCase() === k; })[0] || null;
  };
  var gs = function (g) { return g === "A" ? 1 : (g === "C" ? 0.3 : 0.6); };
  var act = vals(P).filter(function (p) { return active(p) && known(p); });
  var mx = Math.max.apply(null, act.map(pval).concat([0])) || 1;
  var score = {};
  act.forEach(function (p) {
    var c = cust(p), vs = pval(p) / mx, base = c ? num(c.monthlySale) : 0;
    var g = base <= 0 ? vs : Math.min(1, (sale(p) / base * 100) / gF);
    score[p.id] = (wV * vs + wC * gs(c ? c.grade : "B") + wG * g) / (wV + wC + wG);
  });
  act.sort(function (a, b) { return score[b.id] - score[a.id]; });
  var n = act.length, jr = function (x) { return Math.floor(x + 0.5); };
  var band = {};
  act.forEach(function (p, i) { band[p.id] = i < Math.max(1, jr(n * 0.25)) ? "P1" : (i < jr(n * 0.60) ? "P2" : "P3"); });
  var rank = {P1: 0, P2: 1, P3: 2};

  /* styles */
  var C = {ink: "#141c24", ink2: "#4a5866", ink3: "#7b8895", line: "#dde4ea", head: "#0b6178", late: "#c62a1f", lateBg: "#fbe5e2",
           p2: "#b46a00", p2bg: "#fcefd9", ok: "#16804a", okbg: "#e3f3ea", sel: "#1765d1", selbg: "#e3edfb"};
  var chip = function (t, fg, bg) { return '<span style="display:inline-block;padding:1px 7px;border-radius:3px;font:600 11px Consolas,monospace;color:' + fg + ';background:' + bg + ';white-space:nowrap">' + e(t) + '</span>'; };
  var bchip = function (pid) { var b = band[pid]; return b === "P1" ? chip("P1", C.late, C.lateBg) : (b === "P2" ? chip("P2", C.p2, C.p2bg) : ""); };
  var table = function (head, rows) {
    var th = head.map(function (h) { return '<th align="left" style="padding:8px 10px;background:' + C.head + ';color:#fff;font:600 11px Consolas,monospace;letter-spacing:.06em;text-transform:uppercase">' + h + '</th>'; }).join("");
    var tr = rows.map(function (r, i) {
      return "<tr>" + r.map(function (c) { return '<td valign="top" style="padding:8px 10px;border-top:1px solid ' + C.line + ';background:' + (i % 2 === 0 ? "#ffffff" : "#f6f9fb") + ';font:13px Arial,sans-serif;color:' + C.ink + '">' + c + '</td>'; }).join("") + "</tr>";
    }).join("");
    return '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ' + C.line + '"><tr>' + th + '</tr>' + tr + '</table>';
  };
  var h2 = function (nn, t, sub) {
    return '<tr><td style="padding:26px 24px 10px"><div style="font:700 18px Arial,sans-serif;color:' + C.ink + ';text-transform:uppercase;letter-spacing:.04em">' +
      '<span style="display:inline-block;width:24px;height:24px;line-height:24px;border:1.5px solid ' + C.sel + ';border-radius:50%;text-align:center;font:600 12px Consolas,monospace;color:' + C.sel + ';margin-right:8px">' + nn + '</span>' + e(t) + '</div>' +
      '<div style="font:12px Consolas,monospace;color:' + C.ink3 + ';margin-top:4px">' + e(sub) + '</div></td></tr>';
  };
  var inwk = function (d) { return d != null && d >= lw0 && d <= lw1; };
  /* tasks of projects on hold are parked: not counted as open work */
  var openT = vals(T).filter(function (t) { return t.status !== "done" && !(t.projectId && P[t.projectId] && P[t.projectId].status === "On Hold"); });
  var due = function (t) { return D_(t.plannedDate || t.date); };
  var pname = function (p) { return '<b>' + e(p.customer || "") + ' · ' + e(p.name || "") + '</b> <span style="color:' + C.ink3 + ';font-size:11px">' + e(p.id) + '</span>'; };
  var curstep = function (p) { return (p.steps || []).filter(function (s) { return s.status === "open"; })[0] || null; };
  var stageAge = function (p) {
    var st = p.stage, d = null, logs = p.log || [];
    for (var i = 0; i < logs.length; i++) {
      var l = logs[i];
      if (l.stage === st && l.d) d = D_(l.d); else if (d) break;
    }
    return d ? diffDays_(today, d) : null;
  };

  /* ---- 1. what we did last week ---- */
  var doneTasks = vals(T).filter(function (t) { return t.status === "done" && inwk(D_(t.doneAt)); });
  var byPerson = {}; team.forEach(function (m) { byPerson[m.id] = 0; });
  doneTasks.forEach(function (t) { if (t.assignee in byPerson) byPerson[t.assignee]++; });
  var skip = /^(Step|Status from|Opening|Update: Stage|Stage \/ status)/;
  var prog = [], stepsTotal = 0;
  vals(P).forEach(function (p) {
    var ds = (p.steps || []).filter(function (s) { return ["done", "skipped", "closed"].indexOf(s.status) >= 0 && inwk(D_(s.doneAt)); });
    var upd = (p.log || []).filter(function (l) { var t = String(l.t || ""); return inwk(D_(l.d)) && !skip.test(t) && t.toLowerCase().indexOf("stage / status updated") < 0; });
    if (!ds.length && !upd.length) return;
    stepsTotal += ds.length;
    var who = {};
    doneTasks.forEach(function (t) { if (t.projectId === p.id && t.assignee) who[t.assignee] = 1; });
    upd.forEach(function (l) { if (l.by) who[l.by] = 1; });
    var shown;
    if (ds.length) {
      var last = ds[ds.length - 1];
      shown = '<b>' + ds.length + ' step' + (ds.length > 1 ? "s" : "") + '</b> done · up to Step ' + e(last.k) + ' ' + e(last.title) +
        (ds.some(function (x) { return x.status === "closed"; }) ? " — enquiry closed" : "");
    } else shown = 'Update: ' + e(String(upd[0].t || "").slice(0, 80));
    var cs = curstep(p);
    var now = e(p.stage || "") + (cs ? '<br><span style="color:' + C.ink3 + ';font-size:11px">next: Step ' + cs.k + ' ' + e(cs.title) + '</span>' : "");
    prog.push({r: (band[p.id] in rank) ? rank[band[p.id]] : 3, n: -ds.length,
      row: [bchip(p.id), pname(p), shown, now, e(Object.keys(who).sort().map(first).join(", ") || "—")]});
  });
  prog.sort(function (a, b) { return a.r - b.r || a.n - b.n; });
  var PMAX = 10, progMore = Math.max(0, prog.length - PMAX);
  var sdRows = [], sdSteps = 0, sdHanded = [];
  Object.keys(SD).sort().forEach(function (sid) {
    var s = SD[sid], ds = (s.steps || []).filter(function (x) { return x.status === "done" && inwk(D_(x.doneAt)); });
    if (!ds.length) return;
    sdSteps += ds.length;
    var cur = (s.steps || []).filter(function (x) { return x.status !== "done"; })[0];
    if (!cur) { sdHanded.push(s.sdCode); return; }
    var whos = {}; ds.forEach(function (x) { whos[first(x.who)] = 1; });
    sdRows.push(['<b>' + e(s.sdCode) + '</b><br><span style="color:' + C.ink3 + ';font-size:11px">' + e(s.desc || "") + '</span>',
      '<b>' + ds.length + ' step' + (ds.length > 1 ? "s" : "") + '</b> done · up to ' + e(ds[ds.length - 1].title.split(" — ")[0]),
      'Step ' + cur.n + ': ' + e(cur.title.split(" — ")[0]), e(Object.keys(whos).sort().join(", "))]);
  });

  /* ---- 2. what to do next week ---- */
  var acts = [], used = {};
  var add = function (sc, action, where, owner, when, why, key) {
    if (used[key]) return; used[key] = 1; acts.push({s: sc, i: acts.length, row: [action, where, owner, when, why]});
  };
  var whenOf = function (d) { return d == null ? "this week" : (d < today ? chip("immediately", C.late, C.lateBg) : (d === today ? "today" : fd_(d))); };
  var lateTxt = function (d) { return d && d < today ? diffDays_(today, d) + " days late" : ""; };
  vals(P).forEach(function (p) {
    if (!active(p) || p.status === "On Hold") return;
    var b = band[p.id], cs = curstep(p);
    if (!cs) return;
    var tk = openT.filter(function (t) { return t.projectId === p.id && t.pStep; })[0];
    var d = tk ? due(tk) : D_(cs.plan);
    var owner = tk ? first(tk.assignee) : first(p.owner);
    var late = !!(d && d < today);
    var where = e(p.customer) + ' · ' + e(p.name);
    if ((b === "P1" || b === "P2") && (late || (d && d <= nw1) || d == null)) {
      var sc = (b === "P1" ? 0 : 3) + (late ? 0 : 1);
      add(sc, 'Finish Step ' + cs.k + ': ' + e(cs.title), where, owner, whenOf(d), [b + " project", lateTxt(d)].filter(Boolean).join(" · "), p.id);
    } else {
      var age = stageAge(p);
      if (p.status === "Waiting for Customer" && age && age >= 14)
        add(5, 'Chase the customer for a decision (' + e(p.stage || "") + ')', where, owner, "Mon–Tue", "waiting " + age + " days", p.id);
      else if (late && diffDays_(today, d) >= 2)
        add(6, 'Clear Step ' + cs.k + ': ' + e(cs.title), where, owner, whenOf(d), lateTxt(d), p.id);
    }
  });
  Object.keys(SD).sort().forEach(function (sid) {
    var s = SD[sid], cur = (s.steps || []).filter(function (x) { return x.status !== "done"; })[0];
    if (!cur) return;
    var tk = openT.filter(function (t) { return t.sdId === sid; })[0];
    var d = (tk ? due(tk) : null) || D_(cur.plan), late = !!(d && d < today);
    add(late ? 1 : 4, 'Special DB step ' + cur.n + ': ' + e(cur.title.split(" — ")[0]),
      'Special DB · ' + e(s.sdCode) + (s.critical ? " " + chip("critical", C.late, C.lateBg) : ""),
      first((tk && tk.assignee) || cur.who), whenOf(d), ["special DB", lateTxt(d)].filter(Boolean).join(" · "), sid);
  });
  openT.forEach(function (t) {
    if (!t.assignedBy) return;
    var d = due(t);
    add(d && d < today ? 2 : 4, e(t.title), 'given by ' + e(first(t.assignedBy)), first(t.assignee), whenOf(d),
      "from " + first(t.assignedBy) + (lateTxt(d) ? " · " + lateTxt(d) : ""), t.id);
  });
  acts.sort(function (a, b) { return a.s - b.s || a.i - b.i; });
  var MAX = 10, more = Math.max(0, acts.length - MAX);
  var actRows = acts.slice(0, MAX).map(function (a, i) { return ['<b style="color:' + C.sel + '">' + (i + 1) + '</b>'].concat(a.row); });
  var lateN = {}, openN = {};
  team.forEach(function (m) {
    openN[m.id] = openT.filter(function (t) { return t.assignee === m.id; }).length;
    lateN[m.id] = openT.filter(function (t) { var d = due(t); return t.assignee === m.id && d && d < today; }).length;
  });

  /* ---- assemble ---- */
  var stat = function (v, l, c) { return '<td width="25%" valign="top" style="padding:0 5px"><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ' + C.line + ';border-left:4px solid ' + c + '"><tr><td style="padding:10px 12px"><div style="font:700 24px Arial,sans-serif;color:' + C.ink + '">' + v + '</div><div style="font:600 10px Consolas,monospace;letter-spacing:.08em;color:' + C.ink3 + ';text-transform:uppercase;margin-top:2px">' + l + '</div></td></tr></table></td>'; };
  var stats = stat(stepsTotal, "project steps done", "#0f8a76") + stat(prog.length, "projects moved ahead", "#1765d1") + stat(sdHanded.length, "special DBs handed over", "#c27a12") + stat(acts.length, "actions for next week", "#c62a1f");
  var teamLine = team.map(function (m) { return '<b>' + e(m.name.split(" ")[0]) + '</b> ' + byPerson[m.id] + ' done'; }).join(" &nbsp;·&nbsp; ");
  var teamNext = team.map(function (m) { return '<b>' + e(m.name.split(" ")[0]) + '</b> ' + openN[m.id] + ' open, <span style="color:' + C.late + '">' + lateN[m.id] + ' late</span>'; }).join(" &nbsp;·&nbsp; ");
  var note = function (s) { return '<tr><td style="padding:0 24px 8px;font:13px Arial,sans-serif;color:' + C.ink2 + '">' + s + '</td></tr>'; };
  var Y = function (d) { return d.slice(0, 4); };
  var body = h2(1, "What we did last week", fd_(lw0) + " – " + fd_(lw1) + " " + Y(lw1) + " · steps finished on each project");
  body += note("Tasks finished: " + teamLine);
  body += '<tr><td style="padding:0 24px 8px">' + (prog.length ? table(["Pri", "Project", "Done last week", "Now at", "By"], prog.slice(0, PMAX).map(function (x) { return x.row; }))
    : '<div style="font:13px Arial;color:' + C.ink3 + '">No project steps were closed last week.</div>') + '</td></tr>';
  if (progMore) body += note("+ " + progMore + " more projects also moved ahead — see the dashboard.");
  if (sdHanded.length || sdRows.length) body += '<tr><td style="padding:10px 24px 4px"><div style="font:700 13px Arial,sans-serif;color:' + C.head + ';margin:0">Special DBs</div></td></tr>';
  if (sdHanded.length) body += note(chip(sdHanded.length + " handed over to production", C.ok, C.okbg) + " &nbsp;" + e(sdHanded.join(", ")));
  if (sdRows.length) body += '<tr><td style="padding:4px 24px 8px">' + table(["SD code", "Done last week", "Now at", "By"], sdRows) + '</td></tr>';
  body += h2(2, "What we do next week to speed up development", fd_(today) + " – " + fd_(nw1) + " " + Y(nw1) + " · most important first");
  body += '<tr><td style="padding:0 24px 8px">' + (actRows.length ? table(["#", "Action", "Project", "Owner", "By when", "Why"], actRows)
    : '<div style="font:13px Arial;color:' + C.ink3 + '">Nothing urgent.</div>') + '</td></tr>';
  if (more) body += note("+ " + more + " more actions are in the dashboard.");
  body += note("Open work now: " + teamNext);
  var dLong = fd_(today) + " " + Y(today);
  var html = '<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f5"><tr><td align="center" style="padding:24px 12px">' +
    '<table width="760" cellpadding="0" cellspacing="0" style="max-width:760px;width:100%;background:#ffffff;border:1px solid ' + C.line + '">' +
    '<tr><td style="background:#0b6178;background-image:linear-gradient(100deg,#0a5a78,#0c7a8f 45%,#129a83);padding:20px 24px;border-bottom:3px solid ' + C.sel + '">' +
    '<div style="font:600 11px Consolas,monospace;letter-spacing:.14em;color:#c2e6ec">NMD-DEV-DESK · WEEKLY REPORT</div>' +
    '<div style="font:700 24px Arial,sans-serif;color:#ffffff;letter-spacing:.04em;margin-top:4px">DEVELOPMENT REPORT — ' + dLong.toUpperCase() + '</div>' +
    '<div style="font:13px Arial,sans-serif;color:#e6f6f8;margin-top:6px">1. What we did last week &nbsp;·&nbsp; 2. What we do next week to speed up development</div></td></tr>' +
    '<tr><td style="padding:20px 19px 4px"><table width="100%" cellpadding="0" cellspacing="0"><tr>' + stats + '</tr></table></td></tr>' + body +
    '<tr><td style="padding:22px 24px;border-top:1px solid ' + C.line + ';font:12px Consolas,monospace;color:' + C.ink3 + '">' +
    'Full task lists and updates: <a href="' + e(CONFIG.DASHBOARD_URL) + '" style="color:' + C.sel + '">NMD Development Desk</a><br>' +
    'Data as of ' + dLong + ' · Nashik MetalDust Pvt Ltd · Design &amp; Development</td></tr></table></td></tr></table>';
  var subject = "NMD Development Report — " + dLong + ": last week's progress and next week's actions";
  var text = "NMD development report " + dLong + ". Last week: " + stepsTotal + " project steps done on " + prog.length + " projects, " + sdSteps +
    " special DB steps done. Next week: " + acts.length + " actions to speed up development. Dashboard: " + CONFIG.DASHBOARD_URL;
  return {subject: subject, html: html, text: text,
          summary: "steps " + stepsTotal + ", projects " + prog.length + ", sd " + sdSteps + ", actions " + acts.length};
}
