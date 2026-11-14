/* Shaikh's Sphere Enterprises — site behaviour.
   Sections: 1 config binding · 2 scroll pipeline, header, menu, nav · 3 building drawing
   and the pinned walk-through · 4 sector tabs · 5 estimator · 6 enquiry form ·
   7 motion (load sequence, scroll reveals, bands, parallax, ambient)

   Motion rules used throughout (after Emil Kowalski's guidance):
   - entrances ease-out, cubic-bezier(.22,1,.36,1); travel ease-in-out; never ease-in
   - UI feedback 120 to 300 ms; authored entrances 500 to 700 ms; staggers 40 to 80 ms
   - only transform, opacity, clip-path and stroke-dashoffset are animated
   - everything is visible without JS; with "reduce motion" nothing moves */
(function () {
  "use strict";
  var SITE = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // MOTION switches on every hidden-before-reveal state. Off = plain, fully visible page.
  var MOTION = !REDUCE && "IntersectionObserver" in window && "animate" in document.documentElement;
  var EASE_OUT = "cubic-bezier(.22,1,.36,1)";
  root.classList.add("js");
  if (MOTION) root.classList.add("motion");
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }

  /* ---------- 1. Fill contact details from config.js ---------- */
  $$("[data-c]").forEach(function (el) {
    var v = SITE[el.getAttribute("data-c")];
    if (v) el.textContent = v;
  });
  function waUrl(text) {
    return "https://wa.me/" + (SITE.whatsappNumber || "") + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  $$("[data-link]").forEach(function (el) {
    var kind = el.getAttribute("data-link");
    if (kind === "tel" && SITE.phoneDial) el.href = "tel:" + SITE.phoneDial;
    if (kind === "email" && SITE.email) el.href = "mailto:" + SITE.email;
    if (kind === "whatsapp" && SITE.whatsappNumber) el.href = waUrl("Hello, I would like to enquire about your HVAC services.");
  });
  var year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  var demoBar = $("#demo-bar");
  if (demoBar) {
    if (SITE.showDemoBar === false) demoBar.hidden = true;
    $("#demo-bar-close").addEventListener("click", function () {
      if (!MOTION) { demoBar.hidden = true; return; }
      // fold away instead of vanishing (a one-off, so animating height is fine here)
      var h = demoBar.offsetHeight;
      demoBar.style.overflow = "hidden";
      demoBar.animate(
        [{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0, paddingTop: 0, paddingBottom: 0 }],
        { duration: 260, easing: EASE_OUT }
      ).onfinish = function () { demoBar.hidden = true; queueScroll(); };
    });
  }

  /* ---------- 2. Scroll pipeline, header, mobile menu, nav ----------
     Every scroll-linked effect registers { read(vh, y), write() }. On each frame all
     reads run first and all writes after, so scrolling never forces extra layouts. */
  var scrollers = [];
  function onScroll() {
    var vh = window.innerHeight, y = window.scrollY, n;
    for (n = 0; n < scrollers.length; n++) scrollers[n].read(vh, y);
    for (n = 0; n < scrollers.length; n++) scrollers[n].write();
  }
  var ticking = false;
  function queueScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; onScroll(); });
  }
  window.addEventListener("scroll", queueScroll, { passive: true });
  window.addEventListener("resize", queueScroll);
  window.addEventListener("load", queueScroll);

  var header = $("#site-header"), menuBtn = $("#menu-btn"), nav = $("#nav");

  // header: shrinks and gains a hairline once the page has moved
  (function () {
    var stuck = false;
    scrollers.push({
      read: function (vh, y) { stuck = y > 40; },
      write: function () { header.classList.toggle("is-stuck", stuck); }
    });
  })();

  // nav: the link of the section on screen is marked; one indicator slides between links
  (function () {
    var links = $$('a[href^="#"]', nav).filter(function (a) { return !a.hasAttribute("data-link"); });
    var spied = links.map(function (a) { return $(a.getAttribute("href")); });
    var current = -1, shown = -2, ind = null;
    if (MOTION) {
      ind = document.createElement("span");
      ind.className = "nav__ind"; ind.setAttribute("aria-hidden", "true");
      nav.appendChild(ind);
    }
    function moveInd(a) {
      if (!ind) return;
      if (!a) { ind.style.opacity = "0"; return; }
      ind.style.opacity = "1";
      ind.style.transform = "translateX(" + a.offsetLeft + "px) scaleX(" + (a.offsetWidth / 100) + ")";
    }
    links.forEach(function (a) { a.addEventListener("mouseenter", function () { moveInd(a); }); });
    nav.addEventListener("mouseleave", function () { moveInd(links[current]); });
    window.addEventListener("resize", function () { shown = -2; });
    scrollers.push({
      read: function (vh) {
        var c = -1, n, r;
        for (n = 0; n < spied.length; n++) {
          if (!spied[n]) continue;
          r = spied[n].getBoundingClientRect();
          if (r.top < vh * 0.4 && r.bottom > 80) c = n;
        }
        current = c;
      },
      write: function () {
        if (current === shown) return;
        shown = current;
        links.forEach(function (a, n) {
          if (n === current) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
        if (!nav.matches(":hover")) moveInd(links[current]);
      }
    });
  })();

  // process rail: fills with copper as the steps pass through the screen
  (function () {
    var steps = $("#steps"), items = steps ? $$("li", steps) : [], p = 0, last = -1;
    if (!steps) return;
    scrollers.push({
      read: function (vh) {
        var r = steps.getBoundingClientRect();
        p = clamp01((vh * 0.78 - r.top) / Math.max(r.height, vh * 0.5));
      },
      write: function () {
        if (p === last) return;
        last = p;
        items.forEach(function (li, n) {
          var q = clamp01(p * items.length - n);
          li.style.setProperty("--q", q.toFixed(3));
          li.classList.toggle("on", q > 0.02);
        });
      }
    });
  })();

  function setMenu(open) {
    header.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  menuBtn.addEventListener("click", function () { setMenu(!header.classList.contains("menu-open")); });
  nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && header.classList.contains("menu-open")) { setMenu(false); menuBtn.focus(); }
  });

  /* ---------- 3. Building drawing ----------
     The text for each room lives in the "stages" list in index.html.
     With motion on, the drawing is pinned (position: sticky, in CSS) and scrolling walks
     through it: the camera (the SVG viewBox) glides to each room, that room lights up and
     its text becomes active. Purely scroll-linked: it runs backwards on the way up and
     never takes over the wheel. Without motion: buttons and a note, nothing moves. */
  (function building() {
    var fig = $("#building");
    if (!fig) return;
    var svg = $(".bld__svg", fig), buttons = $$(".bld__rooms button", fig),
        title = $("#bld-note-title"), text = $("#bld-note-text"),
        stages = $$("#stages .stage"), lit = $$("[data-room]", fig);
    var active, timer = 0;

    function show(room) { // a room name, or null for the whole building
      if (room === active) return;
      active = room;
      fig.classList.toggle("is-live", !!room);
      lit.forEach(function (el) { el.classList.toggle("is-on", el.getAttribute("data-room") === room); });
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-room") === room ? "true" : "false");
      });
      stages.forEach(function (li) {
        var on = li.getAttribute("data-room") === room;
        li.classList.toggle("is-active", on);
        if (on) { title.textContent = li.getAttribute("data-title"); text.textContent = $(".stage__text", li).textContent; }
      });
    }

    var SCENE = MOTION && stages.length && window.innerHeight >= 560 &&
                window.CSS && CSS.supports && CSS.supports("position", "sticky");

    if (!SCENE) {
      // plain mode: pick a room with the buttons or by pointing at it
      var stop = function () { clearInterval(timer); timer = 0; };
      buttons.forEach(function (b) {
        b.addEventListener("click", function () { stop(); show(b.getAttribute("data-room")); });
      });
      $$(".hit rect", fig).forEach(function (r) {
        var room = r.getAttribute("data-room");
        r.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { stop(); show(room); } });
        r.addEventListener("click", function () { stop(); show(room); });
      });
      show("office");
      if (!REDUCE) {
        var i = 3;
        timer = setInterval(function () {
          i = (i + 1) % buttons.length;
          show(buttons[i].getAttribute("data-room"));
        }, 4200);
      }
      return;
    }

    root.classList.add("scene");
    show(null);

    // camera positions: viewBox "x y width height", all in the drawing's own 710:600 shape
    var FULL = [30, 30, 710, 600];
    var CAM = {
      terrace: [100, 22, 560, 473],
      bedroom: [96, 104, 330, 279],
      living:  [322, 104, 340, 287],
      office:  [100, 168, 520, 439],
      dining:  [92, 322, 366, 309],
      kitchen: [380, 332, 350, 296]
    };
    var rooms = stages.map(function (li) { return li.getAttribute("data-room"); });
    var cams = [FULL].concat(rooms.map(function (r) { return CAM[r] || FULL; }), [FULL]);
    var cur = FULL.slice(), goal = FULL.slice(), moving = false, want = null, at = -1, shownAt = -2;
    var wide = window.matchMedia("(min-width: 1021px)");

    // progress bar under the drawing (phones; on wide screens the room buttons do this job)
    var bar = document.createElement("div");
    bar.className = "scene__bar"; bar.setAttribute("aria-hidden", "true");
    stages.forEach(function () { bar.appendChild(document.createElement("i")); });
    fig.insertBefore(bar, $(".bld__cap", fig));
    var segs = $$("i", bar);

    // Wide screens: a stage is "here" when its middle crosses the middle of the screen.
    // Phones: when its top reaches a line just under the pinned drawing, so the text that
    // is active is always the text sitting right below the picture.
    var figBottom = 0;
    function measure() {
      figBottom = wide.matches ? 0 : (parseFloat(getComputedStyle(fig).top) || 60) + fig.offsetHeight;
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    function focusLine(vh) { return wide.matches ? vh * 0.5 : Math.min(figBottom + 105, vh * 0.62); }
    function anchor(r) { return wide.matches ? r.top + r.height / 2 : r.top; }

    function glide() { // ease the camera toward its goal; stops by itself
      var d = 0, n;
      for (n = 0; n < 4; n++) { cur[n] += (goal[n] - cur[n]) * 0.16; d += Math.abs(goal[n] - cur[n]); }
      if (d < 0.4) { cur = goal.slice(); moving = false; }
      svg.setAttribute("viewBox", cur[0].toFixed(2) + " " + cur[1].toFixed(2) + " " + cur[2].toFixed(2) + " " + cur[3].toFixed(2));
      if (moving) requestAnimationFrame(glide);
    }

    scrollers.push({
      read: function (vh, y) {
        var f = focusLine(vh), d = [-y], n, k, t, e, a, b;
        for (n = 0; n < stages.length; n++) d.push(anchor(stages[n].getBoundingClientRect()) - f);
        var span = d.length > 2 ? d[2] - d[1] : vh;
        d.push(d[d.length - 1] + span * 0.7);
        // d[k] is how far key point k is below the focus line; find the pair we are between
        k = 0;
        while (k < d.length - 2 && d[k + 1] <= 0) k++;
        t = d[k + 1] === d[k] ? 0 : clamp01(-d[k] / (d[k + 1] - d[k]));
        e = k === 0 ? smooth((t - 0.3) / 0.6) : smooth((t - 0.22) / 0.56); // hold, travel, hold
        a = cams[k]; b = cams[k + 1];
        for (n = 0; n < 4; n++) goal[n] = a[n] + (b[n] - a[n]) * e;
        // the text switches half-way through a move; the last room stays lit until the very end
        at = t < (k === stages.length ? 0.85 : 0.5) ? k - 1 : k; // -1 / stages.length = none
        if (at >= stages.length) at = -1;
        want = at < 0 ? null : rooms[at];
      },
      write: function () {
        if (at !== shownAt) {
          shownAt = at;
          show(want);
          segs.forEach(function (s, n) { s.classList.toggle("is-on", at >= 0 && n <= at); });
        }
        if (!moving && (Math.abs(goal[0] - cur[0]) + Math.abs(goal[1] - cur[1]) + Math.abs(goal[2] - cur[2])) > 0.4) {
          moving = true; requestAnimationFrame(glide);
        }
      }
    });

    // a room button, or a tap on the room itself, scrolls to that part of the walk-through
    function goTo(room) {
      var n = rooms.indexOf(room);
      if (n < 0) return;
      var top = window.scrollY + anchor(stages[n].getBoundingClientRect()) - focusLine(window.innerHeight);
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
    buttons.forEach(function (b) { b.addEventListener("click", function () { goTo(b.getAttribute("data-room")); }); });
    $$(".hit rect", fig).forEach(function (r) {
      r.addEventListener("click", function () { goTo(r.getAttribute("data-room")); });
    });
  })();

  /* ---------- 4. Sector tabs ---------- */
  (function sectors() {
    var list = $("#sector-tabs"), panel = $("#sector-panel");
    if (!list || !panel) return;
    var tabs = $$('[role="tab"]', list);
    var parts = [$("#sp-title"), $("#sp-text"), $(".sectors__spec", panel)];
    var ind = null, swapping = 0;
    if (MOTION) {
      ind = document.createElement("span");
      ind.className = "sectors__ind"; ind.setAttribute("aria-hidden", "true");
      list.appendChild(ind);
    }
    function placeInd(tab) {
      if (ind) ind.style.transform = "translateY(" + tab.offsetTop + "px) scaleY(" + (tab.offsetHeight / 100) + ")";
    }
    function fill(tab) {
      $("#sp-title").textContent = tab.getAttribute("data-title");
      $("#sp-text").textContent = tab.getAttribute("data-text");
      $("#sp-system").textContent = tab.getAttribute("data-system");
      $("#sp-load").textContent = tab.getAttribute("data-load");
      $("#sp-focus").textContent = tab.getAttribute("data-focus");
      panel.setAttribute("aria-labelledby", tab.id);
    }
    function pick(tab, focus) {
      if (tab.classList.contains("is-on")) { if (focus) tab.focus(); return; }
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle("is-on", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
      });
      placeInd(tab);
      if (focus) tab.focus();
      if (!MOTION) { fill(tab); return; }
      // old text leaves quickly, new text settles in: a cross-fade with a small slide
      var mine = ++swapping;
      parts.forEach(function (el) {
        el.getAnimations().forEach(function (a) { a.cancel(); });
        el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-6px)" }],
          { duration: 110, easing: "ease-out", fill: "forwards" });
      });
      setTimeout(function () {
        if (mine !== swapping) return;
        fill(tab);
        parts.forEach(function (el, n) {
          el.getAnimations().forEach(function (a) { a.cancel(); });
          el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
            { duration: 320, delay: n * 40, easing: EASE_OUT, fill: "backwards" });
        });
      }, 110);
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { pick(tab); });
      tab.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault(); pick(tabs[(i + d + tabs.length) % tabs.length], true);
      });
    });
    placeInd(tabs[0]);
    window.addEventListener("resize", function () { placeInd($(".is-on", list) || tabs[0]); });
    window.addEventListener("load", function () { placeInd($(".is-on", list) || tabs[0]); });
  })();

  /* ---------- 5. AC size estimator ----------
     Rule of thumb: square feet cooled by 1 TR, by type of space.
     Adjusted for ceiling height, sun and people. Edit the numbers here. */
  (function estimator() {
    var form = $("#est-form");
    if (!form) return;
    var SQFT_PER_TR = { home: 120, office: 100, shop: 85, restaurant: 65 };
    var FREE_PEOPLE_PER_100SQFT = { home: 1.5, office: 1, shop: 1.5, restaurant: 3 };
    var area = $("#est-area"), areaOut = $("#est-area-out"), height = $("#est-height"),
        people = $("#est-people"), sun = $("#est-sun"), trEl = $("#est-tr");
    var shown = 1.5, anim = 0, result = $("#est-result"), lastSys = "", lastText = "";
    var sysArt = $$("[data-sys]", result);
    if (MOTION) sysArt.forEach(function (el) { el.removeAttribute("hidden"); }); // CSS cross-fades them instead

    function showTR(to) {
      cancelAnimationFrame(anim);
      if (REDUCE) { shown = to; trEl.textContent = to % 1 ? to.toFixed(1) : to.toFixed(0); return; }
      var from = shown, t0 = null;
      (function frame(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 380), e = 1 - Math.pow(1 - k, 3);
        shown = from + (to - from) * e;
        var v = k < 1 ? Math.round(shown * 2) / 2 : to;
        trEl.textContent = v % 1 ? v.toFixed(1) : v.toFixed(0);
        if (k < 1) anim = requestAnimationFrame(frame); else shown = to;
      })(performance.now());
    }
    function calc() {
      var type = (form.querySelector('input[name="est-type"]:checked') || {}).value || "home";
      var A = +area.value, h = +height.value, n = Math.max(1, +people.value || 1);
      var tr = A / SQFT_PER_TR[type];
      tr *= Math.max(1, h / 10);
      if (sun.checked) tr *= 1.15;
      var extra = n - Math.ceil(A / 100 * FREE_PEOPLE_PER_100SQFT[type]);
      if (extra > 0) tr += extra * 0.05; // about 600 BTU/hr per extra person
      tr = Math.max(1, Math.ceil(tr * 2 - 0.2) / 2);

      var system = tr <= 2 ? "Split AC"
        : tr <= 4 ? "Two split units, or one cassette AC"
        : tr <= 11 ? "Cassette or ductable AC"
        : "VRF system or ductable packaged units";

      areaOut.textContent = A.toLocaleString("en-IN") + " sq ft";
      showTR(tr);
      $("#est-kw").textContent = (tr * 3.517).toFixed(1);
      $("#est-btu").textContent = (tr * 12000).toLocaleString("en-IN");
      var sysText = $("#est-system");
      sysText.textContent = system;
      // small drawing of the suggested system
      var sys = tr <= 2 ? "split" : tr <= 4 ? "cassette" : tr <= 11 ? "ductable" : "vrf";
      if (sys !== lastSys) {
        sysArt.forEach(function (el) {
          var on = el.getAttribute("data-sys") === sys;
          if (MOTION) el.classList.toggle("is-on", on); else el.toggleAttribute("hidden", !on);
        });
        lastSys = sys;
      }
      if (MOTION && lastText && system !== lastText) { // the new recommendation settles in
        sysText.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
          { duration: 260, easing: EASE_OUT });
      }
      lastText = system;
      area.style.setProperty("--fill", ((A - area.min) / (area.max - area.min) * 100) + "%");
      return { type: type, area: A, tr: tr, system: system };
    }
    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    form.addEventListener("submit", function (e) { e.preventDefault(); });
    calc();

    // Carry the estimate into the enquiry form
    $("#est-cta").addEventListener("click", function () {
      var r = calc(), msg = $("#f-msg");
      if (msg && (!msg.value || /^Estimator result/.test(msg.value))) {
        msg.value = "Estimator result: about " + r.tr + " TR for " + r.area + " sq ft (" + r.type + ").";
      }
    });
  })();

  /* ---------- 6. Enquiry form: builds a WhatsApp message ----------
     No server needed. To receive enquiries by email instead, point this
     form at a form service (Formspree, Web3Forms) or your own backend. */
  (function enquiry() {
    var form = $("#enquiry");
    if (!form) return;
    var fields = $("#enquiry-fields"), done = $("#enquiry-done"), err = $("#enquiry-error");
    function settle(el) {
      if (MOTION) el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
        { duration: 320, easing: EASE_OUT });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#f-name").value.trim(), phone = $("#f-phone").value.trim();
      var digits = phone.replace(/\D/g, "");
      if (!name) { fail("Please enter your name.", "#f-name"); return; }
      if (digits.length < 10) { fail("Please enter a 10-digit phone number so we can call you back.", "#f-phone"); return; }
      err.hidden = true;
      var lines = [
        "Hello Shaikh's Sphere, I would like a site visit.",
        "",
        "Name: " + name,
        "Phone: " + phone,
        "Requirement: " + $("#f-service").value,
        "Space: " + $("#f-space").value
      ];
      var msg = $("#f-msg").value.trim();
      if (msg) lines.push("Details: " + msg);
      var text = lines.join("\n");
      $("#enquiry-preview").textContent = text;
      $("#enquiry-send").href = waUrl(text);
      fields.hidden = true; done.hidden = false; settle(done);
      $("#enquiry-send").focus();
    });
    function fail(message, sel) {
      err.textContent = message; err.hidden = false; settle(err); $(sel).focus();
    }
    $("#enquiry-edit").addEventListener("click", function () {
      done.hidden = true; fields.hidden = false; settle(fields); $("#f-name").focus();
    });
  })();

  /* ---------- 7. Motion ----------
     a. load sequence (hero)   b. scroll reveals, once each   c. facts count up
     d. navy bands widen as they arrive   e. project drawings: in-frame parallax
     f. ambient loops pause off screen   g. safety net: nothing stays hidden */
  (function motion() {
    if (!MOTION) return;
    var vhNow = window.innerHeight;
    // The page may already have painted before this script runs. Hidden-before-reveal states
    // are applied with transitions switched off, so they jump to hidden instead of fading out
    // first (which would swallow the entrance of anything already on screen).
    root.classList.add("rv-setup");

    /* headings rise word by word out of a mask, one line after another */
    function split(el) {
      if (el.children.length || el.getAttribute("data-split")) return;
      var words = el.textContent.replace(/\s+/g, " ").trim();
      el.setAttribute("data-split", "1");
      el.setAttribute("aria-label", words);
      el.textContent = "";
      words.split(" ").forEach(function (w) {
        var o = document.createElement("span"), i = document.createElement("span");
        o.className = "w"; o.setAttribute("aria-hidden", "true");
        i.className = "w__i"; i.textContent = w;
        o.appendChild(i); el.appendChild(o); el.appendChild(document.createTextNode(" "));
      });
      el.classList.add("mask");
    }
    function lines(el) { // which line each word sits on (read after all splits are written)
      var tops = [];
      $$(".w", el).forEach(function (w) {
        var t = w.offsetTop;
        if (tops.indexOf(t) < 0) tops.push(t);
        w.firstChild.style.setProperty("--l", tops.indexOf(t));
      });
    }

    var pending = [];
    function prep(sel, kind) {
      $$(sel).forEach(function (el) {
        if (el.closest(".hero")) return;
        if (kind === "mask") split(el); else el.classList.add("rv", "rv--" + kind);
        el._rv = kind; pending.push(el);
      });
    }
    // what reveals, and how. Lead = headings; support = rows and cards; decoration only fades.
    prep(".sec__head h2, .facts h2, .est__copy h2, .contact__copy h2, .footer__line", "mask");
    prep(".sec__head > p, .sec__head > .link-arrow, .est__copy > p, .contact__copy > p", "rise");
    prep(".svc, .facts__grid > div, .steps li, .faq details, .contact__list > div, .sectors__tabs", "rise");
    prep(".sectors__panel, .est__card, .plan, .contact__form", "card");
    prep(".brands, .footer__art, .footer__in > *", "fade");
    prep(".proj", "clip"); // the drawing wipes up inside its frame (class on the card, clip on the frame)
    $$(".mask").forEach(lines);

    function reveal(el, delay) {
      if (el._done) return;
      el._done = true;
      var i = pending.indexOf(el); if (i > -1) pending.splice(i, 1);
      el.style.setProperty("--d", (delay || 0) + "ms");
      el.classList.add("in");
      if (el.classList.contains("fact")) setTimeout(function () { countUp(el); }, delay || 0);
      // once it has landed, drop the helper classes so the element's own hover transitions return
      if (el._rv !== "mask") setTimeout(function () {
        el.classList.remove("rv", "rv--" + el._rv, "in"); el.style.removeProperty("--d");
      }, (delay || 0) + 1100);
    }
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      // things arriving together stagger in reading order; the gaps shrink so nothing waits long
      batch.sort(function (a, b) { return a.compareDocumentPosition(b) & 2 ? 1 : -1; });
      batch.forEach(function (el, n) {
        io.unobserve(el);
        reveal(el, Math.round(70 * Math.min(n, 6) - 4 * Math.min(n, 6) * Math.min(n, 6)));
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    pending.slice().forEach(function (el) { io.observe(el); });

    /* g. safety net: anything on screen and still hidden gets shown; so does everything
       before printing. Nothing can stay invisible. */
    var seen = [];
    setInterval(function () {
      var h = window.innerHeight;
      pending.slice().forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < h && r.bottom > 0) { if (seen.indexOf(el) > -1) reveal(el, 0); else seen.push(el); }
      });
    }, 700);
    window.addEventListener("beforeprint", function () { pending.slice().forEach(function (el) { reveal(el, 0); }); });

    /* c. the facts count up once, as they are revealed */
    $$(".facts__grid > div").forEach(function (item) {
      item.classList.add("fact");
      var dt = $("dt", item);
      Array.prototype.slice.call(dt.childNodes).forEach(function (node) {
        if (node.nodeType !== 3 || !/\d/.test(node.nodeValue)) return;
        var frag = document.createDocumentFragment();
        node.nodeValue.split(/(\d[\d,]*)/).forEach(function (bit) {
          if (/^\d/.test(bit)) {
            var s = document.createElement("span");
            s.className = "count"; s.setAttribute("data-to", bit.replace(/,/g, "")); s.textContent = bit;
            frag.appendChild(s);
          } else if (bit) frag.appendChild(document.createTextNode(bit));
        });
        dt.replaceChild(frag, node);
      });
    });
    function countUp(item) {
      $$(".count", item).forEach(function (s) {
        var to = +s.getAttribute("data-to"), t0 = null;
        (function frame(t) {
          if (!t0) t0 = t;
          var k = clamp01((t - t0) / 1000);
          s.textContent = Math.round(to * easeOut(k)).toLocaleString("en-IN");
          if (k < 1) requestAnimationFrame(frame);
        })(performance.now());
      });
    }

    /* d. navy bands arrive narrow with rounded shoulders and widen to full bleed.
       The colour sits on its own layer, so only that layer's transform changes. */
    $$(".band").forEach(function (band) {
      var bg = document.createElement("span"), top = 0, last = -1;
      bg.className = "band__bg"; bg.setAttribute("aria-hidden", "true");
      band.insertBefore(bg, band.firstChild);
      band.classList.add("has-bg");
      scrollers.push({
        read: function (vh) { top = band.getBoundingClientRect().top; vhNow = vh; },
        write: function () {
          var p = easeOut((vhNow - top) / (vhNow * 0.6));
          if (p === last) return;
          last = p;
          bg.style.transform = "scaleX(" + (0.9 + 0.1 * p).toFixed(4) + ")";
        }
      });
    });

    /* e. project drawings drift a little inside their frames as the page moves */
    $$(".proj__art").forEach(function (art) {
      var slot = art.parentNode, off = 0, last = 99, live = false;
      scrollers.push({
        read: function (vh) {
          var r = slot.getBoundingClientRect();
          live = r.bottom > 0 && r.top < vh;
          if (live) off = ((r.top + r.height / 2) - vh / 2) / vh;
        },
        write: function () {
          if (!live || Math.abs(off - last) < 0.002) return;
          last = off;
          art.style.transform = "translateY(" + (off * -22).toFixed(1) + "px) scale(1.09)";
        }
      });
    });

    /* f. air, fans and clouds only run while their drawing is on screen */
    var life = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("is-off", !e.isIntersecting); });
    }, { rootMargin: "80px" });
    $$("svg.draw").forEach(function (s) { life.observe(s); });

    /* a. load sequence: the headline rises, the support follows, the building assembles */
    (function intro() {
      var hero = $(".hero"), fig = $("#building"), h1 = hero && $("h1", hero);
      if (!hero || !h1) return;
      split(h1); lines(h1);
      var support = [$(".hero__kicker", hero), $(".hero__lead", hero), $(".hero__cta", hero), $(".hero__points", hero)];
      support.forEach(function (el, n) {
        if (!el) return;
        el.classList.add("rv", n ? "rv--rise" : "rv--fade");
        el._rv = n ? "rise" : "fade";
      });
      // commit the hidden states (no transition), then let transitions run again
      void getComputedStyle(support[1] || h1).opacity;
      root.classList.remove("rv-setup");
      if (fig) {
        // pipes and the ground line draw themselves: give them a length of 1 to dash against
        $$(".pipe path, .bld__svg > path.ln:not([fill])", fig).forEach(function (p) { p.setAttribute("pathLength", "1"); });
        fig.classList.add("is-intro");
        setTimeout(function () { fig.classList.remove("is-intro"); }, 2800);
      }
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        h1.style.setProperty("--d", "60ms"); h1.classList.add("in");
        reveal(support[0], 0);
        [support[1], support[2], support[3]].forEach(function (el, n) { if (el) reveal(el, 340 + n * 90); });
      }); });
    })();
  })();

  onScroll();
})();
