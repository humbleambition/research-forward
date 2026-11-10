/* Trading Strategy Test Results: page behaviour.
   1 theme toggle and nav highlight, 2 Results (rendered from tests.json), 3 search,
   4 Forward tests (rendered from forward.json), 5 diagram/clip lightbox. No libraries. */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var $ = function (id) { return doc.getElementById(id); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function str(v) { return v === null || v === undefined ? "" : String(v); }
  function el(tag, text, cls) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (str(text) !== "") n.appendChild(doc.createTextNode(str(text)));
    return n;
  }
  function small(parent, text) { if (str(text)) parent.appendChild(el("small", text)); }
  function norm(s) { return s.toLowerCase().replace(/\s+/g, " "); }

  /* ---------- 1. theme toggle and nav highlight ---------- */
  var themeBtn = $("theme-btn");
  function theme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function themeLabel() { themeBtn.setAttribute("aria-label", theme() === "dark" ? "Switch to light theme" : "Switch to dark theme"); }
  themeBtn.addEventListener("click", function () {
    var next = theme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("hark-theme", next); } catch (e) { /* storage blocked: lasts this visit */ }
    themeLabel();
  });
  themeLabel();

  var seg = doc.querySelector(".seg");
  var navLinks = [].slice.call(seg.querySelectorAll("a"));
  var navTargets = navLinks.map(function (a) { return $(a.getAttribute("href").slice(1)); });
  var active = -2;
  function syncNav(force) {
    var line = window.innerHeight * 0.32, cur = -1;
    navTargets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) cur = i; });
    if (cur === active && !force) return;
    active = cur;
    navLinks.forEach(function (a, i) { if (i === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    if (cur >= 0) {
      var a = navLinks[cur], l = a.offsetLeft - 8, r = a.offsetLeft + a.offsetWidth + 8;
      if (l < seg.scrollLeft || r > seg.scrollLeft + seg.clientWidth) seg.scrollTo({ left: l, behavior: reduce ? "auto" : "smooth" });
    }
  }
  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return; ticking = true;
    window.requestAnimationFrame(function () { syncNav(false); ticking = false; });
  }, { passive: true });
  window.addEventListener("resize", function () { syncNav(true); }, { passive: true });

  /* ---------- 2. Results ---------- */
  var COLS = [["tr_yr", "Tr/yr"], ["win", "Win %"], ["avg", "Avg / trade"], ["cagr", "CAGR"], ["max_dd", "Max DD"], ["result", "IS → OOS"]];
  var ORDER = ["PASS", "WEAK", "FAIL", "INCONCLUSIVE"];
  var testsById = {}, showPlaceholder = false;

  function countLine(list) {
    var c = {};
    list.forEach(function (t) { c[t.verdict] = (c[t.verdict] || 0) + 1; });
    var parts = [list.length + (list.length === 1 ? " test" : " tests")];
    ORDER.forEach(function (v) { if (c[v]) parts.push(c[v] + " " + v.toLowerCase()); });
    return { text: parts.join(" · "), pass: c.PASS || 0 };
  }

  function mediaButtons(th, t) {
    var items = [];
    if (t.diagram) items.push(["diagram", "Diagram"]);
    if (t.clip) items.push(["clip", "Clip"]);
    if (!items.length) {   /* off by default so rows look as before; set "media_placeholder": true in tests.json */
      if (showPlaceholder) th.appendChild(el("span", "No diagram yet", "x-media x-media--none"));
      return;
    }
    var row = el("span", "", "x-media-row");
    th.appendChild(row);
    items.forEach(function (it) {
      var b = el("button", "", "x-media");
      b.type = "button";
      b.setAttribute("data-test", t.id);
      b.setAttribute("data-kind", it[0]);
      b.setAttribute("aria-label", it[1] + " for " + t.id + " (opens full screen)");
      if (it[0] === "diagram" && !/\.(mp4|webm)$/i.test(t.diagram)) {
        var im = doc.createElement("img");
        im.src = t.diagram; im.alt = ""; im.loading = "lazy"; im.decoding = "async";
        b.appendChild(im);
      }
      b.appendChild(el("span", it[0] === "clip" ? "▶ " + it[1] : it[1]));
      row.appendChild(b);
    });
  }

  function testRow(t) {
    var tr = doc.createElement("tr");
    if (t.highlight) tr.className = "is-highlight";
    var th = el("th", t.id + " " + t.name);
    th.setAttribute("scope", "row");
    small(th, t.data);
    small(th, t.script);
    mediaButtons(th, t);
    tr.appendChild(th);
    var stats = t.stats || {}, cls = t.cls || {};
    COLS.forEach(function (c) {
      var v = c[0] === "result" ? t.result : stats[c[0]];
      var k = cls[c[0]] || (c[0] === "result" ? "muted" : "");
      var td = el("td", v, k === "plain" ? "" : k);
      if (str(v)) td.setAttribute("data-label", c[1]); else td.classList.add("is-empty");
      tr.appendChild(td);
    });
    var vd = el("td", t.verdict, "num");
    vd.setAttribute("data-label", "Verdict");
    small(vd, t.verdict_note);
    tr.appendChild(vd);
    return tr;
  }

  function areaBlock(a, list) {
    var d = doc.createElement("details");
    d.className = "x-acc"; d.id = a.id;
    var sum = doc.createElement("summary"), wrap = doc.createElement("span");
    wrap.appendChild(el("span", a.num + " " + a.title, "x-acc__title"));
    wrap.appendChild(el("span", countLine(list).text, "x-acc__count"));
    sum.appendChild(wrap); d.appendChild(sum);
    var body = el("div", "", "x-acc__body");
    var prose = el("div", "", "prose");
    prose.innerHTML = a.intro_html || "";   /* authored HTML from tests.json */
    body.appendChild(prose);
    var tw = el("div", "", "table-wrap"), table = doc.createElement("table");
    var hr = doc.createElement("tr");
    [["", "Test"]].concat(COLS, [["", "Verdict"]]).forEach(function (c) { var h = el("th", c[1]); h.setAttribute("scope", "col"); hr.appendChild(h); });
    var thead = doc.createElement("thead"); thead.appendChild(hr); table.appendChild(thead);
    var tb = doc.createElement("tbody");
    list.forEach(function (t) { tb.appendChild(testRow(t)); });
    table.appendChild(tb); tw.appendChild(table); body.appendChild(tw); d.appendChild(body);
    return d;
  }

  function loadTests() {
    var inline = $("tests-data");
    if (inline) { try { return Promise.resolve(JSON.parse(inline.textContent)); } catch (e) { /* fall through */ } }
    return fetch("data/tests.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  var sections = [];
  function renderResults(data) {
    var box = $("x-areas"), toc = $("x-toc");
    showPlaceholder = data.media_placeholder === true;
    var by = {};
    data.tests.forEach(function (t) { (by[t.area] = by[t.area] || []).push(t); testsById[t.id] = t; });
    var frag = doc.createDocumentFragment(), tfrag = doc.createDocumentFragment();
    data.areas.forEach(function (a) {
      var list = by[a.id] || [];
      if (!list.length) return;
      var d = areaBlock(a, list);
      frag.appendChild(d);
      var li = doc.createElement("li"), link = el("a", a.num + " " + a.short + " ");
      link.href = "#" + a.id;
      link.appendChild(el("b", countLine(list).pass + " pass"));
      link.addEventListener("click", function () { d.open = true; });
      li.appendChild(link); tfrag.appendChild(li);
      var rows = [].slice.call(d.querySelectorAll("tbody tr"));
      sections.push({
        el: d, li: li, wrap: d.querySelector(".table-wrap"),
        head: norm(a.num + " " + a.title + " " + countLine(list).text + " " + prose(d)),
        rows: rows.map(function (r, i) { var t = list[i]; return { el: r, text: norm(rowText(t)) }; })
      });
    });
    box.textContent = "";
    box.appendChild(frag);
    toc.appendChild(tfrag);
  }
  function prose(d) { return d.querySelector(".prose").textContent; }
  function rowText(t) {
    var s = t.stats || {};
    return [t.id, t.name, t.data, t.script, s.tr_yr, s.win, s.avg, s.cagr, s.max_dd, t.result, t.verdict, t.verdict_note].map(str).join(" ");
  }

  function openHash() {
    var t = location.hash && $(location.hash.slice(1));
    if (t && t.tagName === "DETAILS") { t.open = true; t.scrollIntoView(); }
  }

  /* ---------- 3. search ---------- */
  var q = $("x-q"), qStatus = $("x-status"), qEmpty = $("x-empty");
  function runSearch() {
    var terms = norm(q.value.trim()).split(" ").filter(Boolean);
    var has = function (t) { return terms.every(function (w) { return t.indexOf(w) !== -1; }); };
    var hits = 0, secs = 0;
    sections.forEach(function (s) {
      if (!terms.length) {
        s.el.hidden = false; s.li.hidden = false; s.wrap.hidden = false;
        s.rows.forEach(function (r) { r.el.hidden = false; });
        if (s.el.dataset.xOpened) { s.el.open = false; delete s.el.dataset.xOpened; }
        return;
      }
      var n = 0;
      s.rows.forEach(function (r) { var m = has(r.text); r.el.hidden = !m; if (m) n++; });
      var headHit = has(s.head);
      s.wrap.hidden = !n;
      if (!n && headHit) { s.wrap.hidden = false; s.rows.forEach(function (r) { r.el.hidden = false; }); }
      var show = n > 0 || headHit;
      s.el.hidden = !show; s.li.hidden = !show;
      if (show) {
        secs++; hits += n;
        if (n && !s.el.open) { s.el.open = true; s.el.dataset.xOpened = "1"; }
      }
    });
    qEmpty.hidden = !terms.length || secs > 0;
    qStatus.textContent = terms.length && secs ? hits + (hits === 1 ? " test" : " tests") + " in " + secs + (secs === 1 ? " area" : " areas") : "";
  }
  q.addEventListener("input", runSearch);
  function setAll(open) { sections.forEach(function (s) { s.el.open = open; }); }
  $("x-open").addEventListener("click", function () { setAll(true); });
  $("x-close").addEventListener("click", function () { setAll(false); });
  window.addEventListener("hashchange", openHash);

  /* ---------- 4. Forward tests (forward.json, written by fwd_status.py) ---------- */
  function fmtDate(s) {
    s = str(s);
    var m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/.exec(s);
    if (!m) return s || "–";
    return m[1] + " " + m[2] + (m[3] ? (m[3] === "Z" ? " UTC" : " UTC" + m[3].replace("-", "−")) : "");
  }
  function tint(text) {
    var s = str(text);
    if (s.length < 2) return "";
    var c = s.charAt(0);
    return c === "+" ? "x-up" : c === "\u2212" || c === "-" ? "x-down" : "";
  }
  function fwdRow(t) {
    var retired = str(t.status).toLowerCase() === "retired";
    var trades = Number(t.trades) || 0;
    var tr = doc.createElement("tr");
    if (retired) tr.className = "x-retired";
    var th = el("th", str(t.name) + (retired ? " (retired)" : ""));
    th.setAttribute("scope", "row");
    small(th, t.code);
    tr.appendChild(th);
    var what = el("td", t.what || "–"); small(what, t.data); tr.appendChild(what);
    tr.appendChild(el("td", t.started || "–", "rowhead"));
    tr.appendChild(el("td", trades, "num"));
    var wr = Number(t.win_rate);
    tr.appendChild(el("td", trades === 0 || t.win_rate === null || !isFinite(wr) ? "–" : wr.toFixed(1) + "%", "num"));
    var cum = Number(t.cum);
    var res = el("td", trades === 0 ? "–" : (t.cum_label || (isFinite(cum) ? cum : "–")), "num" + (trades && cum > 0 ? " x-up" : trades && cum < 0 ? " x-down" : ""));
    small(res, t.unit); tr.appendChild(res);
    var lt = t.last_trade, last = el("td", lt && lt.date ? lt.date : "–");
    if (lt) small(last, lt.result);
    tr.appendChild(last);
    tr.appendChild(el("td", t.backtest_pace || "–", "num"));
    tr.appendChild(el("td", t.note || "–", "muted"));
    return tr;
  }
  function logTable(cols, rows) {
    var wrap = el("div", "", "x-fwd__log"), table = doc.createElement("table");
    var head = doc.createElement("tr");
    (cols || []).forEach(function (c) { var h = el("th", c); h.setAttribute("scope", "col"); head.appendChild(h); });
    var thead = doc.createElement("thead"); thead.appendChild(head); table.appendChild(thead);
    var tb = doc.createElement("tbody");
    rows.forEach(function (r) {
      var tr = doc.createElement("tr");
      (Array.isArray(r) ? r : []).forEach(function (v) { tr.appendChild(el("td", v, tint(v))); });
      tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table);
    return wrap;
  }
  function fwdDetail(t, span) {
    var tr = doc.createElement("tr"); tr.className = "x-fwd__detail";
    var td = doc.createElement("td"); td.colSpan = span;
    var panel = el("div", "", "x-fwd__panel");
    var text = [t.what, t.data, t.note].map(str).filter(function (s) { return s && s !== "–"; })
      .map(function (s) { return /[.!?]$/.test(s) ? s : s + "."; }).join(" ");
    if (text) panel.appendChild(el("p", text));
    var log = t.log && typeof t.log === "object" ? t.log : {};
    var rows = Array.isArray(log.rows) ? log.rows : [];
    panel.appendChild(rows.length ? logTable(log.columns, rows) : el("p", "No trades in the record yet."));
    [log.extra, log.extra2].forEach(function (x) {
      if (!x || typeof x !== "object") return;
      var box = doc.createElement("div");
      if (str(x.title)) box.appendChild(el("h4", x.title));
      var xr = Array.isArray(x.rows) ? x.rows : [];
      box.appendChild(xr.length ? logTable(x.columns, xr) : el("p", "No trades in the record yet."));
      panel.appendChild(box);
    });
    td.appendChild(panel); tr.appendChild(td);
    return tr;
  }
  function expandable(tr, t) {
    var span = tr.children.length, open = null;
    tr.classList.add("x-fwd__row");
    tr.setAttribute("role", "button");
    tr.setAttribute("tabindex", "0");
    tr.setAttribute("aria-expanded", "false");
    var chev = el("span", "", "x-fwd__chev"); chev.setAttribute("aria-hidden", "true");
    tr.firstChild.insertBefore(chev, tr.firstChild.firstChild);
    function toggle() {
      if (open) { open.parentNode.removeChild(open); open = null; tr.setAttribute("aria-expanded", "false"); }
      else { open = fwdDetail(t, span); tr.parentNode.insertBefore(open, tr.nextSibling); tr.setAttribute("aria-expanded", "true"); }
    }
    tr.addEventListener("click", toggle);
    tr.addEventListener("keydown", function (e) {
      if (e.target !== tr) return;
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); toggle(); }
    });
    return tr;
  }
  function loadForward() {
    var body = $("x-fwd-body"), status = $("x-fwd-status"), box = body.closest(".x-fwd");
    function fit() {
      var cs = getComputedStyle(box);
      box.style.setProperty("--x-fwd-w", Math.max(0, box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) + "px");
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(box); else window.addEventListener("resize", fit);
    if (!window.fetch || location.protocol === "file:" || /\.s3[.-]/.test(location.hostname)) return;
    fetch("forward.json", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.tests) || !d.tests.length) throw new Error("empty");
        var frag = doc.createDocumentFragment();
        d.tests.forEach(function (t) { if (t && typeof t === "object") frag.appendChild(expandable(fwdRow(t), t)); });
        body.textContent = "";
        body.appendChild(frag);
        $("x-fwd-updated").textContent = fmtDate(d.updated);
        status.hidden = true;
        $("x-fwd-hint").hidden = false;
      })
      .catch(function () { status.hidden = false; status.textContent = "Live results load on the published site."; });
  }

  /* ---------- 5. lightbox: full screen, zoom and pan (mouse, touch, keyboard) ---------- */
  var lb = $("lb"), stage = $("lb-stage"), lbTitle = $("lb-title");
  var view = { s: 1, x: 0, y: 0 }, media = null, lastFocus = null, pointers = {}, pinch = null, drag = null;
  function apply() { if (media) media.style.transform = "translate(" + view.x + "px," + view.y + "px) scale(" + view.s + ")"; }
  function zoomAt(f, cx, cy) {
    var r = stage.getBoundingClientRect();
    var px = (cx === undefined ? r.width / 2 : cx - r.left) - r.width / 2, py = (cy === undefined ? r.height / 2 : cy - r.top) - r.height / 2;
    var s = Math.min(8, Math.max(1, view.s * f)), k = s / view.s;
    view.x = px - (px - view.x) * k; view.y = py - (py - view.y) * k; view.s = s;
    if (s === 1) { view.x = 0; view.y = 0; }
    apply();
  }
  function reset() { view = { s: 1, x: 0, y: 0 }; apply(); }
  function openLb(t, kind) {
    var src = kind === "clip" ? t.clip : t.diagram;
    lastFocus = doc.activeElement;
    stage.textContent = "";
    if (/\.(mp4|webm)$/i.test(src)) {
      media = doc.createElement("video");
      media.src = src; media.controls = true; media.autoplay = true; media.muted = true; media.loop = true;
      media.setAttribute("playsinline", "");
    } else {
      media = doc.createElement("img");
      media.src = src; media.alt = (kind === "clip" ? "Clip" : "Diagram") + " for " + t.id + " " + t.name;
      media.draggable = false;
    }
    media.className = "lb__media";
    stage.appendChild(media);
    lbTitle.textContent = t.id + " · " + t.name;
    reset();
    lb.hidden = false;
    doc.body.classList.add("lb-open");
    lb.querySelector('[data-lb="close"]').focus();
  }
  function closeLb() {
    if (lb.hidden) return;
    lb.hidden = true; doc.body.classList.remove("lb-open");
    if (media && media.pause) media.pause();
    stage.textContent = ""; media = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".x-media[data-test]");
    if (b && testsById[b.getAttribute("data-test")]) openLb(testsById[b.getAttribute("data-test")], b.getAttribute("data-kind"));
  });
  lb.addEventListener("click", function (e) {
    var act = e.target.getAttribute && e.target.getAttribute("data-lb");
    if (act === "close" || e.target === stage && view.s === 1) closeLb();
    else if (act === "in") zoomAt(1.5);
    else if (act === "out") zoomAt(1 / 1.5);
    else if (act === "reset") reset();
  });
  lb.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "Escape") { e.preventDefault(); closeLb(); }
    else if (k === "+" || k === "=") zoomAt(1.25);
    else if (k === "-" || k === "_") zoomAt(0.8);
    else if (k === "0") reset();
    else if (/^Arrow/.test(k) && view.s > 1) {
      e.preventDefault();
      var d = 40;
      if (k === "ArrowLeft") view.x += d; if (k === "ArrowRight") view.x -= d;
      if (k === "ArrowUp") view.y += d; if (k === "ArrowDown") view.y -= d;
      apply();
    } else if (k === "Tab") {   /* keep focus inside the dialog */
      var f = [].slice.call(lb.querySelectorAll("button, [tabindex='0'], video"));
      var i = f.indexOf(doc.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  stage.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
  stage.addEventListener("dblclick", function (e) { if (view.s > 1) reset(); else zoomAt(2.5, e.clientX, e.clientY); });
  stage.addEventListener("pointerdown", function (e) {
    if (!media || media.tagName === "VIDEO" && view.s === 1) return;
    stage.setPointerCapture(e.pointerId);
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s }; drag = null;
    } else drag = { x: e.clientX - view.x, y: e.clientY - view.y };
  });
  stage.addEventListener("pointermove", function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (pinch && ids.length === 2) {
      var a = pointers[ids[0]], b = pointers[ids[1]];
      zoomAt(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d / view.s, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (drag && view.s > 1) { view.x = e.clientX - drag.x; view.y = e.clientY - drag.y; apply(); }
  });
  function up(e) { delete pointers[e.pointerId]; if (Object.keys(pointers).length < 2) pinch = null; if (!Object.keys(pointers).length) drag = null; }
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);

  /* ---------- start ---------- */
  loadTests().then(function (d) { renderResults(d); openHash(); syncNav(true); })
    .catch(function () { $("x-areas").appendChild(el("p", "Results failed to load. Raw data: data/tests.json", "fineprint")); });
  loadForward();
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { syncNav(true); });
  syncNav(true);
})();
