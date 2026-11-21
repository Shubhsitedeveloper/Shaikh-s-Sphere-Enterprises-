// Walk-in showroom: renderer, camera, intro, tour, trolley and enquiry flow.
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { mats, setAniso, canvasTex, redraw, FONT_D, FONT_B, BRAND, roundRect } from "./kit.js";
import { PRODUCTS, BY_ID, FACES, FACE_BY_ID, AISLES, TOUR } from "./data.js";
import { setModels } from "./products.js";
import { buildWorld, DIM } from "./world.js";

const gsap = window.gsap;
if (new URLSearchParams(location.search).has("nolag")) gsap.ticker.lagSmoothing(0);
const SITE = window.SITE || {};
const $ = (s, r = document) => r.querySelector(s);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = matchMedia("(pointer: coarse)").matches;
const params = new URLSearchParams(location.search);
const LOW = params.has("low") || (!params.has("high") && (COARSE || innerWidth < 820 || (navigator.hardwareConcurrency || 8) <= 4));
const EYE = 1.56;

const ui = {
  app: $("#sr"), canvas: $("#sr-canvas"), intro: $("#sr-intro"), enter: $("#sr-enter"), load: $("#sr-load"), loadBar: $("#sr-load-bar"),
  hud: $("#sr-hud"), where: $("#sr-where"), tourBtn: $("#sr-tour"), cartBtn: $("#sr-cart"), cartCount: $("#sr-cart-count"), cartTr: $("#sr-cart-tr"),
  toast: $("#sr-toast"), toastText: $("#sr-toast-text"), bar: $("#sr-bar"), barImg: $("#sr-bar-img"), barKick: $("#sr-bar-kick"), barName: $("#sr-bar-name"),
  barSpec: $("#sr-bar-spec"), barAdd: $("#sr-bar-add"), hint: $("#sr-hint"), dots: $("#sr-dots"), tip: $("#sr-tip"),
  slip: $("#sr-slip"), slipList: $("#sr-slip-list"), slipSub: $("#sr-slip-sub"), slipTotal: $("#sr-slip-total"), slipSend: $("#sr-slip-send"),
  slipMail: $("#sr-slip-mail"), slipClose: $("#sr-slip-close"), slipForm: $("#sr-slip-form"), slipName: $("#sr-name"), slipArea: $("#sr-area"),
  slipHead: $("#sr-slip-head"), slipDone: $("#sr-slip-done"), slipAgain: $("#sr-slip-again"), slipEmpty: $("#sr-slip-empty"),
  confetti: $("#sr-confetti"), joy: $("#sr-joy"), joyKnob: $("#sr-joy-knob"), listBtn: $("#sr-list-btn"), list: $("#sr-list"), listClose: $("#sr-list-close"),
  listBody: $("#sr-list-body"), introList: $("#sr-intro-list"), nofx: $("#sr-nogl")
};

// ---------------- trolley state ----------------
const KEY = "ss-showroom-trolley";
let trolley = [];
try { trolley = JSON.parse(localStorage.getItem(KEY) || "[]").filter(i => BY_ID[i.id]); } catch (e) { trolley = []; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(trolley)); } catch (e) {} };
const qtyOf = id => (trolley.find(i => i.id === id) || {}).q || 0;
const totals = () => ({ n: trolley.reduce((a, i) => a + i.q, 0), tr: trolley.reduce((a, i) => a + (BY_ID[i.id].tr || 0) * i.q, 0) });
const fmtTr = v => (Math.round(v * 10) / 10).toString();

// ---------------- WebGL check ----------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: false, powerPreference: "high-performance" });
} catch (e) { renderer = null; }
if (!renderer) {
  ui.nofx.hidden = false;
  ui.intro.hidden = true;
  initDomOnly();
} else {
  boot().catch(err => { console.error(err); ui.load.textContent = "Could not load the 3D showroom."; });
}

function initDomOnly() {
  buildList(); syncCart(); openList();
}

async function boot() {
  const DPR = Math.min(devicePixelRatio || 1, LOW ? 1.25 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 160);
  const body = new THREE.Group(); scene.add(body);
  body.add(camera); camera.position.y = EYE;

  // fonts first: signs are drawn into canvases
  const fontWait = Promise.race([
    Promise.all([document.fonts.load(`650 64px "Bricolage Grotesque"`), document.fonts.load(`500 32px "Instrument Sans"`), document.fonts.load(`600 32px "Instrument Sans"`)]),
    new Promise(r => setTimeout(r, 3500))
  ]);

  // environment maps
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  scene.environment = roomEnv;
  scene.environmentIntensity = 0.45;

  let loaded = 0; const total = 9;
  const tick = () => { loaded++; ui.loadBar.style.transform = `scaleX(${Math.min(1, loaded / total)})`; };
  const hdrP = new RGBELoader().loadAsync("assets/showroom/hdri/modern_evening_street_1k.hdr").then(t => { tick(); return t; });
  const gl = new GLTFLoader();
  const g = (n) => gl.loadAsync(`assets/showroom/models/${n}/main.gltf`).then(r => { tick(); return r.scene; }).catch(() => { tick(); return null; });
  const [hdr, ac, ductR, ductC, plant, lamp, planter, cam, wet] = await Promise.all([
    hdrP, g("exterior_aircon_unit"), g("modular_airduct_rectangular_01"), g("modular_airduct_circular_01"), g("potted_plant_04"),
    g("street_lamp_01"), g("planter_box_01"), g("security_camera_01"), g("WetFloorSign_01")
  ]);
  await fontWait;

  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const extEnv = pmrem.fromEquirectangular(hdr).texture;
  scene.background = hdr;
  scene.backgroundIntensity = 0.55;
  scene.backgroundRotation = new THREE.Euler(0, Math.PI * 0.62, 0);

  const models = {};
  if (ac) { const u = ac.getObjectByName("exterior_aircon_unit") || ac; u.position.set(0, 0, 0); u.rotation.set(0, 0, 0); const b = new THREE.Box3().setFromObject(u); const s = new THREE.Vector3(); b.getSize(s); const wrap = new THREE.Group(); const c = b.getCenter(new THREE.Vector3()); u.position.sub(new THREE.Vector3(c.x, b.min.y, c.z)); wrap.add(u); models.acUnit = wrap; models.acUnitSize = s; }
  const parts = {};
  for (const src of [ductR, ductC]) if (src) src.traverse(o => { if (o.name && o.parent === src) { const w = new THREE.Group(); const c = o.clone(true); c.position.set(0, 0, 0); const b = new THREE.Box3().setFromObject(c); c.position.sub(b.getCenter(new THREE.Vector3())); w.add(c); parts[o.name] = w; } });
  models.parts = parts;
  const norm = (o) => { if (!o) return null; const w = new THREE.Group(); o.position.set(0, 0, 0); const b = new THREE.Box3().setFromObject(o); const c = b.getCenter(new THREE.Vector3()); o.position.sub(new THREE.Vector3(c.x, b.min.y, c.z)); w.add(o); return w; };
  models.plant = norm(plant); models.lamp = norm(lamp); models.planter = norm(planter); models.camera = norm(cam); models.wet = norm(wet);
  setModels({ acUnit: models.acUnit, acUnitSize: models.acUnitSize, parts });

  const W = buildWorld(scene, { exteriorEnv: extEnv, models, quality: LOW ? "low" : "high" });

  // ---------------- lights ----------------
  scene.add(new THREE.HemisphereLight(0xe8f0ff, 0x8a8478, 0.3));
  const key = new THREE.SpotLight(0xfff6ea, 140, 0, 1.05, 0.9, 1.6);
  key.position.set(0, 11.5, -7.5); key.target.position.set(0, 0, -8.5);
  key.castShadow = true; key.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
  key.shadow.camera.near = 4; key.shadow.camera.far = 20; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(key, key.target);
  for (const [x, z] of [[-6, -4], [0, -4], [6, -4], [-6, -11], [0, -11], [6, -11], [0, 1.5], [0, -17.5]]) {
    const p = new THREE.PointLight(0xfff3e4, 2.2, 10, 1.6); p.position.set(x, 3.4, z); scene.add(p);
  }
  // outside: warm street lamps and the canopy downlights
  for (const x of [-9, 9]) { const p = new THREE.PointLight(0xffc88a, 26, 16, 1.7); p.position.set(x + (x < 0 ? 1.2 : -1.2), 5.6, 9.6); scene.add(p); }
  for (const x of [-2, 0, 2]) { const s = new THREE.SpotLight(0xffe2bf, 30, 7, 0.7, 0.8, 1.5); s.position.set(x, DIM.ceil - 0.72, DIM.front + 1.3); s.target.position.set(x, 0, DIM.front + 1.6); scene.add(s, s.target); }
  const storeGlow = new THREE.PointLight(0xfff1de, 30, 10, 1.6); storeGlow.position.set(0, 2.2, DIM.front + 1.4); scene.add(storeGlow);
  // the sign washes the facade
  // warm uplights grazing the facade above the shopfront
  for (const x of [-9.6, -4.5, 4.5, 9.6]) { const u = new THREE.SpotLight(0xffd7a8, 60, 7, 0.5, 0.9, 1.4); u.position.set(x, DIM.ceil + 0.4, DIM.front + 0.9); u.target.position.set(x, 9.5, DIM.front + 0.4); scene.add(u, u.target); }

  // ---------------- post ----------------
  const size = new THREE.Vector2(innerWidth, innerHeight);
  const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: LOW ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(DPR);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (!LOW) {
    gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
    gtao.updateGtaoMaterial({ radius: 0.45, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(size.clone().multiplyScalar(0.5), 0.32, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------------- camera rig ----------------
  const rig = { x: -8.2, y: 0, z: 20.5, yaw: 0, pitch: 0.1, bob: 0 };
  const lookYaw = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  rig.yaw = lookYaw(rig.x, rig.z, -4.6, DIM.front);
  if (innerWidth / innerHeight < 0.8) { Object.assign(rig, { x: -3.2, z: 25, pitch: -0.22 }); rig.yaw = lookYaw(rig.x, rig.z, -0.6, DIM.front); }
  const shortest = (from, to) => { let d = to - from; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return from + d; };
  function applyRig(t) {
    body.position.set(rig.x, rig.y, rig.z);
    body.rotation.y = rig.yaw;
    camera.rotation.set(rig.pitch, 0, 0);
    camera.position.y = EYE + rig.bob;
  }
  function fov() { const a = innerWidth / innerHeight; camera.fov = a < 0.8 ? 74 : a < 1.2 ? 66 : 58; camera.aspect = a; camera.updateProjectionMatrix(); }
  fov();

  // ---------------- trolley model ----------------
  const cart = buildTrolley(); body.add(cart.group);
  cart.group.position.y = -1.2; cart.group.visible = false;

  // ---------------- products: interaction helpers ----------------
  const pickables = [];
  const prodState = {};
  for (const item of W.products) {
    item.root.userData.pid = item.p.id;
    const own = [];
    item.root.traverse(o => {
      if (!o.isMesh) return;
      pickables.push(o);
      if (o.material && o.material.isMeshStandardMaterial && !o.material.transparent) { o.material = o.material.clone(); own.push(o.material); }
    });
    item.mats = own;
    item.root.updateMatrixWorld(true);
    item.hotWorld = item.root.localToWorld(item.hot.clone());
    // facing direction of the display this product sits on
    const n = new THREE.Vector3(0, 0, 1).transformDirection(item.root.parent.matrixWorld);
    item.normal = n;
    prodState[item.p.id] = item;
  }
  const highlight = (id, amount) => {
    const it = prodState[id]; if (!it) return;
    for (const m of it.mats) { m.emissive.set(BRAND.copper); m.emissiveIntensity = amount; }
  };

  // ---------------- airflow particles ----------------
  const air = makeAir(LOW ? 420 : 1100);
  scene.add(air.points);
  scene.updateMatrixWorld(true);
  for (const e of W.emitters) {
    e.wp = e.obj ? e.obj.localToWorld(e.p.clone()) : e.p.clone();
    e.wd = (e.obj ? e.d.clone().transformDirection(e.obj.matrixWorld) : e.d.clone()).normalize();
    e.acc = 0;
  }
  // door mist burst at the entrance
  const doorMist = { wp: new THREE.Vector3(0, 0.4, DIM.front + 0.1), wd: new THREE.Vector3(0, -0.1, 1), k: "mist", w: 1.6, rate: 0, acc: 0 };
  W.emitters.push(doorMist);

  // ---------------- thumbnails for the product bar ----------------
  const thumbs = makeThumbs(renderer, W.products, roomEnv);

  // ---------------- hotspot dots ----------------
  const dots = {};
  for (const it of W.products) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sr-dot"; b.setAttribute("aria-label", it.p.name);
    b.innerHTML = '<span class="sr-dot__core"></span>';
    b.addEventListener("click", (e) => { e.stopPropagation(); stopTour(); focusProduct(it.p.id, true); });
    b.addEventListener("pointerenter", () => { if (!COARSE) { hoverId = it.p.id; } });
    b.addEventListener("pointerleave", () => { if (hoverId === it.p.id) hoverId = null; });
    ui.dots.appendChild(b);
    dots[it.p.id] = b;
  }

  // ---------------- state ----------------
  let mode = "intro";             // intro | entering | tour | free
  let focusId = null, hoverId = null, pinnedId = null;
  let tourTl = null;
  const keys = {};
  const vel = new THREE.Vector2();
  let wheelV = 0;
  const joy = { x: 0, y: 0, active: false };
  let deskArmed = true;

  drawDesk("idle");
  syncCart();
  buildList();
  W.products.forEach(it => { if (qtyOf(it.p.id)) cart.fill(it, thumbsOrRoot(it)); });

  function thumbsOrRoot(it) { return it.root; }

  // ---------------- intro ----------------
  ui.load.hidden = true;
  ui.enter.disabled = false;
  ui.enter.focus({ preventScroll: true });
  ui.intro.classList.add("is-ready");

  ui.enter.addEventListener("click", enter);
  ui.introList.addEventListener("click", () => { openList(); });

  function enter() {
    if (mode !== "intro") return;
    mode = "entering";
    ui.intro.classList.add("is-leaving");
    setTimeout(() => { ui.intro.hidden = true; }, 600);
    if (REDUCED) {
      Object.assign(rig, { x: 0, z: 2.6, yaw: 0, pitch: -0.16 });
      showInside(); return;
    }
    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    const doorYaw = () => lookYaw(rig.x, rig.z, 0, DIM.front - 1);
    tl.to(rig, { x: -1.4, z: 11.5, duration: 3.2, onUpdate: () => { rig.yaw = shortest(rig.yaw, doorYaw()) * 0.12 + rig.yaw * 0.88; } })
      .to(rig, { pitch: -0.02, duration: 3.2 }, 0)
      .to(rig, { x: 0, z: 7.4, yaw: 0, duration: 1.8, ease: "power1.inOut" })
      .add(() => openDoors(true), "-=1.0")
      .add(() => { doorMist.rate = 2.6; gsap.to(doorMist, { rate: 0, duration: 2.6, delay: 0.6, ease: "power2.in" }); }, "-=0.9")
      .to(rig, { z: 2.6, pitch: -0.16, duration: 2.6, ease: "power2.inOut" })
      .add(() => { cart.group.visible = true; gsap.fromTo(cart.group.position, { y: -1.2 }, { y: 0, duration: 1.1, ease: "power3.out" }); }, "-=1.4")
      .add(() => showInside(), "-=0.5")
      .add(() => openDoors(false), "+=0.6");
  }
  function showInside() {
    cart.group.visible = true; if (REDUCED) cart.group.position.y = 0;
    ui.hud.hidden = false;
    requestAnimationFrame(() => ui.hud.classList.add("is-on"));
    if (COARSE) ui.joy.hidden = false;
    mode = "free";
    showHint();
    setTimeout(() => { if (mode === "free" && !userMoved) startTour(); }, REDUCED ? 600 : 900);
  }
  function openDoors(open) {
    for (const d of W.doors) {
      if (REDUCED) d.obj.position.x = open ? d.openX : d.closedX;
      else gsap.to(d.obj.position, { x: open ? d.openX : d.closedX, duration: open ? 1.1 : 1.3, ease: open ? "power3.out" : "power2.inOut" });
    }
  }
  let hintTimer = 0;
  function showHint() {
    ui.hint.hidden = false;
    requestAnimationFrame(() => ui.hint.classList.add("is-on"));
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { ui.hint.classList.remove("is-on"); setTimeout(() => ui.hint.hidden = true, 400); }, 7000);
  }

  // ---------------- tour ----------------
  let userMoved = false;
  function standFor(it) {
    const f = FACE_BY_ID[it.p.face];
    const hw = it.hotWorld;
    if (!f) { // back hall boards
      return { x: -5.6, z: hw.z + 0.6 };
    }
    const aisle = AISLES.reduce((a, b) => Math.abs(b.x - (f.x + f.dir * 2.4)) < Math.abs(a.x - (f.x + f.dir * 2.4)) ? b : a);
    return { x: aisle.x + f.dir * 0.75, z: hw.z + 1.9 };
  }
  function glideTo(x, z, tx, ty, tz, dur) {
    const yaw = shortest(rig.yaw, lookYaw(x, z, tx, tz));
    const dist = Math.hypot(tx - x, tz - z);
    const pitch = Math.max(-0.42, Math.min(0.25, Math.atan2(ty - (EYE + 0.05), dist))) - 0.06;
    return gsap.to(rig, { x, z, yaw, pitch, duration: dur ?? Math.min(3.2, 1.0 + Math.hypot(x - rig.x, z - rig.z) * 0.32), ease: "power2.inOut" });
  }
  function startTour(fromIndex) {
    stopTour(true);
    mode = "tour";
    ui.tourBtn.dataset.state = "on"; ui.tourBtn.querySelector("span").textContent = "Stop the tour";
    const tl = gsap.timeline({ onComplete: () => { mode = "free"; ui.tourBtn.dataset.state = "off"; ui.tourBtn.querySelector("span").textContent = "Take the tour"; } });
    let start = 0;
    if (fromIndex == null) {
      // resume from the stop nearest to where you are
      let best = Infinity;
      TOUR.forEach((s, i) => { const it = s.focus[0] && prodState[s.focus[0]]; const p = it ? standFor(it) : { x: 0, z: DIM.deskZ + 2.4 }; const d = Math.hypot(p.x - rig.x, p.z - rig.z); if (d < best && rig.z < 3) { best = d; start = i; } });
    } else start = fromIndex;
    for (let i = start; i < TOUR.length; i++) {
      const s = TOUR[i];
      if (s.face === "desk") {
        // leave the aisle at its far end, then walk up to the desk
        tl.call(() => {
          tl.pause();
          gsap.to(rig, { z: DIM.aisleEnd - 1.4, duration: 1.4, ease: "power2.inOut", onComplete: () => {
            const g = glideTo(0, DIM.deskZ + 2.9, 0, 1.3, DIM.deskZ, 2.2);
            g.eventCallback("onComplete", () => tl.resume());
          } });
        });
        tl.call(() => { deskArmed = false; openSlip(true); });
        continue;
      }
      s.focus.forEach((id, k) => {
        const it = prodState[id]; if (!it) return;
        tl.call(() => { tl.pause(); const st = standFor(it); const g = glideTo(st.x, st.z, it.hotWorld.x, it.hotWorld.y, it.hotWorld.z); g.eventCallback("onComplete", () => tl.resume()); });
        tl.call(() => { pinnedId = id; });
        tl.to({}, { duration: k === 0 ? 2.6 : 2.2 });
      });
      // walk out of the aisle before the next one
      tl.call(() => { pinnedId = null; });
      const next = TOUR[i + 1];
      if (next && next.face !== "desk" && FACE_BY_ID[next.face].aisle !== FACE_BY_ID[s.face].aisle) {
        tl.call(() => { tl.pause(); gsap.to(rig, { z: DIM.aisleStart + 1.2, duration: 1.6, ease: "power2.inOut", onComplete: () => tl.resume() }); });
      }
    }
    tourTl = tl;
  }
  function stopTour(silent) {
    if (tourTl) { tourTl.kill(); tourTl = null; }
    gsap.killTweensOf(rig);
    pinnedId = null;
    if (mode === "tour") mode = "free";
    ui.tourBtn.dataset.state = "off"; ui.tourBtn.querySelector("span").textContent = "Take the tour";
  }
  ui.tourBtn.addEventListener("click", () => { if (mode === "tour") stopTour(); else if (mode === "free") startTour(); });

  // ---------------- focus + product bar ----------------
  let barId = null;
  function focusProduct(id, pin) {
    if (pin) { pinnedId = id; const it = prodState[id]; if (mode !== "tour") { gsap.killTweensOf(rig); const yaw = shortest(rig.yaw, lookYaw(rig.x, rig.z, it.hotWorld.x, it.hotWorld.z)); const dist = Math.hypot(it.hotWorld.x - rig.x, it.hotWorld.z - rig.z); gsap.to(rig, { yaw, pitch: Math.max(-0.42, Math.min(0.25, Math.atan2(it.hotWorld.y - EYE, dist))) - 0.05, duration: REDUCED ? 0 : 0.7, ease: "power2.inOut" }); } }
  }
  function setBar(id) {
    if (id === barId) return;
    if (barId) highlight(barId, 0);
    barId = id;
    if (!id) { ui.bar.classList.remove("is-on"); ui.bar.setAttribute("aria-hidden", "true"); return; }
    highlight(id, 0.18);
    const p = BY_ID[id], f = FACE_BY_ID[p.face];
    ui.barImg.src = thumbs[id] || "";
    ui.barKick.textContent = f ? `Aisle ${f.aisle} · ${f.name}` : "Service · Enquiry desk";
    ui.barName.textContent = p.name;
    ui.barSpec.textContent = p.specs.slice(0, 2).map(s => s[1]).join(" · ");
    ui.bar.dataset.id = id;
    syncBarButton();
    ui.bar.setAttribute("aria-hidden", "false");
    ui.bar.classList.remove("is-on"); void ui.bar.offsetWidth; ui.bar.classList.add("is-on");
  }
  function syncBarButton() {
    const id = barId; if (!id) return;
    const q = qtyOf(id);
    ui.barAdd.querySelector("span").textContent = q ? `Added · ${q}` : "Add to trolley";
    ui.barAdd.classList.toggle("is-added", !!q);
  }
  ui.barAdd.addEventListener("click", () => { if (barId) addToTrolley(barId); });

  function addToTrolley(id) {
    const ex = trolley.find(i => i.id === id);
    if (ex) ex.q++; else trolley.push({ id, q: 1 });
    save(); syncCart(); syncBarButton(); syncList();
    const it = prodState[id];
    if (it && qtyOf(id) === 1) flyToCart(it); else bumpCart();
    toast(`${BY_ID[id].name} added to your trolley`);
    drawDesk(totals().n ? "ready" : "idle");
  }
  function removeOne(id) {
    const ex = trolley.find(i => i.id === id); if (!ex) return;
    ex.q--; if (ex.q <= 0) { trolley = trolley.filter(i => i !== ex); cart.remove(id); }
    save(); syncCart(); syncBarButton(); syncList(); renderSlip();
    drawDesk(totals().n ? "ready" : "idle");
  }

  function flyToCart(it) {
    const clone = cart.makeItem(it);
    if (REDUCED || !cart.group.visible) { cart.place(clone, it.p.id); return; }
    const from = it.hotWorld.clone();
    scene.add(clone);
    clone.position.copy(from);
    const s0 = clone.userData.fitScale * 3.2, s1 = clone.userData.fitScale;
    const st = { t: 0 };
    gsap.to(st, {
      t: 1, duration: 0.85, ease: "power2.inOut",
      onUpdate: () => {
        const to = cart.slotWorld(it.p.id);
        const mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + 0.6;
        const a = from.clone().lerp(mid, st.t), b = mid.clone().lerp(to, st.t);
        clone.position.copy(a.lerp(b, st.t));
        clone.scale.setScalar(s0 + (s1 - s0) * st.t);
        clone.rotation.y = rig.yaw + st.t * Math.PI * 0.6;
      },
      onComplete: () => { cart.place(clone, it.p.id); bumpCart(); }
    });
  }
  function bumpCart() {
    if (REDUCED) return;
    gsap.fromTo(cart.group.rotation, { z: 0 }, { z: 0.035, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" });
    ui.cartBtn.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(.23,1,.32,1)" });
  }
  let toastTimer = 0;
  function toast(text) {
    ui.toastText.textContent = text;
    ui.toast.hidden = false;
    ui.toast.classList.remove("is-on"); void ui.toast.offsetWidth; ui.toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ui.toast.classList.remove("is-on"), 2600);
  }

  // ---------------- cart chip, slip ----------------
  function syncCart() {
    const t = totals();
    ui.cartCount.textContent = t.n;
    ui.cartTr.textContent = t.tr ? `${fmtTr(t.tr)} TR` : "Trolley";
    ui.cartBtn.setAttribute("aria-label", `Open your enquiry slip, ${t.n} items`);
    ui.cartBtn.classList.toggle("has-items", t.n > 0);
  }
  window.__srSync = syncCart;
  ui.cartBtn.addEventListener("click", () => openSlip(false));
  ui.slipClose.addEventListener("click", closeSlip);
  ui.slipAgain.addEventListener("click", () => { closeSlip(); });
  let slipOpen = false, sent = false;
  function renderSlip() {
    const t = totals();
    ui.slipEmpty.hidden = t.n > 0;
    ui.slipForm.hidden = t.n === 0;
    ui.slipList.innerHTML = "";
    for (const i of trolley) {
      const p = BY_ID[i.id];
      const li = document.createElement("li");
      li.innerHTML = `<span class="sr-slip__q"></span><span class="sr-slip__n"></span><span class="sr-slip__v"></span><span class="sr-slip__ctl"><button type="button" aria-label="Remove one">−</button><button type="button" aria-label="Add one">+</button></span>`;
      li.querySelector(".sr-slip__q").textContent = i.q + " ×";
      li.querySelector(".sr-slip__n").textContent = p.name;
      li.querySelector(".sr-slip__v").textContent = p.tr ? fmtTr(p.tr * i.q) + " TR" : "Quote";
      const [minus, plus] = li.querySelectorAll("button");
      minus.addEventListener("click", () => removeOne(i.id));
      plus.addEventListener("click", () => { addToTrolley(i.id); renderSlip(); });
      ui.slipList.appendChild(li);
    }
    ui.slipSub.textContent = t.n ? `${t.n} item${t.n > 1 ? "s" : ""} picked at the Shaikh's Sphere showroom.` : "Your trolley is empty.";
    ui.slipTotal.textContent = t.tr ? `${fmtTr(t.tr)} TR` : "—";
  }
  function openSlip(fromDesk) {
    sent = false;
    ui.slip.classList.remove("is-sent");
    ui.slipDone.hidden = true; ui.slipHead.hidden = false;
    renderSlip();
    ui.slip.hidden = false;
    requestAnimationFrame(() => ui.slip.classList.add("is-on"));
    slipOpen = true;
    if (fromDesk && totals().n) confetti(0.6);
    setTimeout(() => (totals().n ? ui.slipName : ui.slipClose).focus({ preventScroll: true }), 50);
  }
  function closeSlip() {
    ui.slip.classList.remove("is-on");
    slipOpen = false;
    setTimeout(() => { if (!slipOpen) ui.slip.hidden = true; }, 320);
  }
  function enquiryText() {
    const t = totals();
    const lines = trolley.map(i => `• ${i.q} × ${BY_ID[i.id].name}`);
    const name = ui.slipName.value.trim(), area = ui.slipArea.value.trim();
    return ["Hello Shaikh's Sphere, I walked through your online showroom and would like a quote for:", "", ...lines, "",
      t.tr ? `Total cooling picked: ${fmtTr(t.tr)} TR` : "", name ? `Name: ${name}` : "", area ? `Site / area: ${area}` : ""].filter((l, i, a) => l !== "" || (a[i - 1] !== "")).join("\n").trim();
  }
  ui.slipForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!totals().n) return;
    const url = "https://wa.me/" + (SITE.whatsappNumber || "") + "?text=" + encodeURIComponent(enquiryText());
    window.open(url, "_blank", "noopener");
    sent = true;
    ui.slip.classList.add("is-sent");
    ui.slipHead.hidden = true; ui.slipDone.hidden = false;
    drawDesk("sent");
    confetti(1);
    ui.slipAgain.focus({ preventScroll: true });
  });
  ui.slipMail.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "mailto:" + (SITE.email || "") + "?subject=" + encodeURIComponent("Quote from the online showroom") + "&body=" + encodeURIComponent(enquiryText());
  });

  // desk screen
  function drawDesk(state) {
    const t = totals();
    redraw(W.deskScreen, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#0f2250"); g.addColorStop(1, "#0a1636");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = state === "sent" ? "#1F9D57" : BRAND.copper; x.fillRect(0, 0, w, 74);
      x.fillStyle = "#fff"; x.font = `650 36px ${FONT_D}`; x.textAlign = "center"; x.fillText(state === "sent" ? "Sent. Thank you!" : "Enquiry desk", w / 2, 50);
      if (state === "sent") {
        x.strokeStyle = "#5ee09a"; x.lineWidth = 16; x.lineCap = "round"; x.lineJoin = "round";
        x.beginPath(); x.arc(w / 2, 245, 92, 0, 7); x.stroke();
        x.beginPath(); x.moveTo(w / 2 - 42, 248); x.lineTo(w / 2 - 8, 282); x.lineTo(w / 2 + 48, 212); x.stroke();
        x.fillStyle = "rgba(255,255,255,.75)"; x.font = `500 30px ${FONT_B}`; x.fillText("The team will reply on WhatsApp.", w / 2, 410);
      } else if (t.n) {
        x.fillStyle = "#fff"; x.font = `650 120px ${FONT_D}`; x.fillText(t.tr ? fmtTr(t.tr) + " TR" : t.n + "", w / 2, 250);
        x.fillStyle = "rgba(255,255,255,.75)"; x.font = `500 32px ${FONT_B}`; x.fillText(`${t.n} item${t.n > 1 ? "s" : ""} in your trolley`, w / 2, 310);
        x.fillStyle = BRAND.copper; roundRect(x, w / 2 - 150, 360, 300, 72, 36); x.fill();
        x.fillStyle = BRAND.ink; x.font = `650 32px ${FONT_D}`; x.fillText("Tap to send", w / 2, 408);
      } else {
        x.fillStyle = "#fff"; x.font = `600 44px ${FONT_D}`; x.fillText("Pick products in the aisles,", w / 2, 230); x.fillText("then send your list here.", w / 2, 290);
      }
    });
  }

  // ---------------- confetti ----------------
  const cctx = ui.confetti.getContext("2d");
  let bits = [], confettiOn = false;
  function confetti(power) {
    if (REDUCED) return;
    ui.confetti.width = innerWidth * DPR; ui.confetti.height = innerHeight * DPR;
    const cols = [BRAND.copper, "#2FB6EE", "#ffffff", "#FFB46B", BRAND.navy, "#5FD3FF"];
    for (let i = 0; i < 160 * power; i++) {
      bits.push({ x: innerWidth * (0.3 + Math.random() * 0.4), y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 10, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 6, h: 8 + Math.random() * 10, c: cols[i % cols.length], life: 0 });
    }
    confettiOn = true;
  }
  function stepConfetti() {
    if (!confettiOn) return;
    const c = cctx; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter(b => b.y < innerHeight + 40 && b.life < 300);
    for (const b of bits) {
      b.vy += 0.32; b.vx *= 0.985; b.vy *= 0.985; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.life++;
      c.save(); c.translate(b.x, b.y); c.rotate(b.r); c.scale(1, Math.cos(b.life * 0.18 + b.r));
      c.fillStyle = b.c; c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); c.restore();
    }
    if (!bits.length) { confettiOn = false; c.clearRect(0, 0, innerWidth, innerHeight); }
  }

  // ---------------- input ----------------
  let drag = null;
  ui.canvas.addEventListener("pointerdown", (e) => {
    if (mode === "intro" || mode === "entering") return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, yaw: rig.yaw, pitch: rig.pitch };
    ui.canvas.setPointerCapture(e.pointerId);
  });
  ui.canvas.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = -(e.clientY / innerHeight) * 2 + 1; mouse.moved = true; mouse.cx = e.clientX; mouse.cy = e.clientY;
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 5) {
      if (mode === "tour") stopTour();
      userMoved = true;
      const k = (COARSE ? 0.0055 : 0.0038) * (60 / camera.fov);
      rig.yaw = drag.yaw + dx * k;
      rig.pitch = Math.max(-0.75, Math.min(0.5, drag.pitch + dy * k * 0.9));
      ui.canvas.classList.add("is-dragging");
    }
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    ui.canvas.classList.remove("is-dragging");
    if (drag.moved <= 5) pick(e.clientX, e.clientY);
    drag = null;
  };
  ui.canvas.addEventListener("pointerup", endDrag);
  ui.canvas.addEventListener("pointercancel", () => { drag = null; ui.canvas.classList.remove("is-dragging"); });
  ui.canvas.addEventListener("pointerleave", () => { mouse.moved = false; hoverId = null; ui.tip.classList.remove("is-on"); });
  ui.canvas.addEventListener("wheel", (e) => {
    if (mode !== "free" && mode !== "tour") return;
    e.preventDefault();
    if (mode === "tour") stopTour();
    userMoved = true;
    wheelV = Math.max(-4, Math.min(4, wheelV - e.deltaY * 0.012));
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) rig.yaw -= e.deltaX * 0.002;
  }, { passive: false });

  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, select")) return;
    if (e.key === "Escape") { if (slipOpen) closeSlip(); else if (!ui.list.hidden) closeList(); else if (mode === "tour") stopTour(); return; }
    if (mode !== "free" && mode !== "tour") { if (mode === "intro" && (e.key === "Enter")) {} return; }
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e", "shift"].includes(k)) {
      if (k.startsWith("arrow")) e.preventDefault();
      if (mode === "tour") stopTour();
      userMoved = true;
      keys[k] = true;
    }
    if ((k === "enter" || k === " ") && e.target === document.body && barId) { e.preventDefault(); addToTrolley(barId); }
  });
  addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

  // joystick (touch)
  ui.joy.addEventListener("pointerdown", (e) => { joy.active = true; joy.id = e.pointerId; ui.joy.setPointerCapture(e.pointerId); moveJoy(e); if (mode === "tour") stopTour(); userMoved = true; });
  ui.joy.addEventListener("pointermove", (e) => { if (joy.active && e.pointerId === joy.id) moveJoy(e); });
  const endJoy = () => { joy.active = false; joy.x = joy.y = 0; ui.joyKnob.style.transform = ""; };
  ui.joy.addEventListener("pointerup", endJoy); ui.joy.addEventListener("pointercancel", endJoy);
  function moveJoy(e) {
    const r = ui.joy.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const l = Math.hypot(dx, dy); if (l > R * 0.62) { dx *= R * 0.62 / l; dy *= R * 0.62 / l; }
    ui.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joy.x = dx / (R * 0.62); joy.y = dy / (R * 0.62);
  }

  // picking
  const ray = new THREE.Raycaster(); ray.far = 14;
  const mouse = { x: 0, y: 0, moved: false };
  function hitAt(nx, ny) {
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const hits = ray.intersectObjects(pickables, false);
    for (const h of hits) { let o = h.object; while (o && !o.userData.pid) o = o.parent; if (o) return o.userData.pid; }
    return null;
  }
  function pick(cx, cy) {
    const id = hitAt((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    if (id) { if (mode === "tour") stopTour(); focusProduct(id, true); }
    else if (W.desk && nearDesk() < 3.2) openSlip(true);
  }

  // ---------------- movement + collisions ----------------
  const R = 0.34;
  function blocked(x, z) {
    const b = W.bounds;
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return true;
    for (const o of W.obstacles) if (x > o.x0 - R && x < o.x1 + R && z > o.z0 - R && z < o.z1 + R) return true;
    return false;
  }
  function free(x, z) {
    if (blocked(x, z)) return false;
    // the trolley's front must stay clear too
    const fx = x - Math.sin(rig.yaw) * 0.85, fz = z - Math.cos(rig.yaw) * 0.85;
    return !blocked(fx, fz) || blocked(rig.x - Math.sin(rig.yaw) * 0.85, rig.z - Math.cos(rig.yaw) * 0.85);
  }
  function move(dt) {
    let f = 0, s = 0, turn = 0;
    if (keys["w"] || keys["arrowup"]) f += 1;
    if (keys["s"] || keys["arrowdown"]) f -= 1;
    if (keys["a"]) s -= 1;
    if (keys["d"]) s += 1;
    if (keys["arrowleft"] || keys["q"]) turn += 1;
    if (keys["arrowright"] || keys["e"]) turn -= 1;
    if (joy.active) { f -= joy.y; turn -= joy.x * 0.9; }
    rig.yaw += turn * dt * 1.6;
    const speed = keys["shift"] ? 4.2 : 2.6;
    const tf = f * speed + wheelV, ts = s * speed * 0.8;
    wheelV *= Math.pow(0.02, dt);
    const k = 1 - Math.exp(-dt * 8);
    vel.x += (ts - vel.x) * k; vel.y += (tf - vel.y) * k;
    const sin = Math.sin(rig.yaw), cos = Math.cos(rig.yaw);
    const dx = (-sin * vel.y + cos * vel.x) * dt, dz = (-cos * vel.y - sin * vel.x) * dt;
    if (free(rig.x + dx, rig.z)) rig.x += dx; else vel.x *= 0.3;
    if (free(rig.x, rig.z + dz)) rig.z += dz; else vel.y *= 0.3;
    const sp = Math.hypot(vel.x, vel.y);
    return sp;
  }

  // ---------------- where am I + desk proximity ----------------
  function nearDesk() { return Math.hypot(rig.x, rig.z - (DIM.deskZ + 0.9)); }
  let lastWhere = "";
  function updateWhere() {
    let w;
    if (rig.z > DIM.front) w = "Outside the showroom";
    else if (rig.z > DIM.aisleStart) w = "Entrance";
    else if (rig.z < DIM.aisleEnd) w = "Enquiry desk & services";
    else { const a = AISLES.reduce((p, c) => Math.abs(c.x - rig.x) < Math.abs(p.x - rig.x) ? c : p); w = `Aisle ${a.n} · ${a.title}`; }
    if (w !== lastWhere) { lastWhere = w; ui.where.textContent = w; }
  }

  // ---------------- hotspots: project and show ----------------
  const tmp = new THREE.Vector3(), camW = new THREE.Vector3();
  function segBlocked(ax, az, bx, bz) {
    for (const o of W.obstacles) {
      if (o.z1 - o.z0 < 2) continue; // desk etc. never hides anything
      let t0 = 0, t1 = 1; const dx = bx - ax, dz = bz - az;
      const clip = (p, q) => { if (p === 0) return q >= 0; const r = q / p; if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } return true; };
      const x0 = o.x0 + 0.65, x1 = o.x1 - 0.65; // the solid core, not the product zone
      if (x1 <= x0) continue;
      if (clip(-dx, ax - x0) && clip(dx, x1 - ax) && clip(-dz, az - o.z0) && clip(dz, o.z1 - az) && t0 < t1 && t1 > 0.02 && t0 < 0.98) return true;
    }
    return false;
  }
  function updateDots() {
    camera.getWorldPosition(camW);
    let best = null, bestScore = Infinity;
    const live = mode === "free" || mode === "tour";
    for (const it of W.products) {
      const el = dots[it.p.id];
      const hw = it.hotWorld;
      const toCam = camW.clone().sub(hw);
      const dist = toCam.length();
      let vis = live && dist < 9.5 && toCam.dot(it.normal) > 0.15 && !slipOpen;
      if (vis) { tmp.copy(hw).project(camera); vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05; }
      if (vis && segBlocked(camW.x, camW.z, hw.x, hw.z)) vis = false;
      if (!vis) { if (el.dataset.v !== "0") { el.dataset.v = "0"; el.classList.remove("is-on"); el.tabIndex = -1; } continue; }
      const sx = (tmp.x * 0.5 + 0.5) * innerWidth, sy = (-tmp.y * 0.5 + 0.5) * innerHeight;
      el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0)`;
      if (el.dataset.v !== "1") { el.dataset.v = "1"; el.classList.add("is-on"); el.tabIndex = 0; }
      el.classList.toggle("is-focus", it.p.id === barId);
      const score = Math.hypot(tmp.x, tmp.y * 1.3) + dist * 0.05;
      if (dist < 6 && score < bestScore) { bestScore = score; best = it.p.id; }
    }
    // what the product bar shows: pinned > hovered > the product nearest the middle of the view
    let want = pinnedId || hoverId || (bestScore < 0.55 ? best : null);
    if (slipOpen) want = null;
    if (want && pinnedId && !hoverId) {
      const it = prodState[pinnedId]; if (Math.hypot(it.hotWorld.x - rig.x, it.hotWorld.z - rig.z) > 7.5) { pinnedId = null; want = best; }
    }
    setBar(want);
  }

  // hover tooltip + highlight with the mouse
  function updateHover() {
    if (COARSE || !mouse.moved || drag || (mode !== "free" && mode !== "tour")) return;
    const id = hitAt(mouse.x, mouse.y);
    if (id !== hoverId && !ui.dots.matches(":hover")) hoverId = id;
    ui.canvas.style.cursor = id ? "pointer" : "";
    if (id) { ui.tip.textContent = BY_ID[id].name; ui.tip.style.transform = `translate3d(${mouse.cx + 16}px, ${mouse.cy + 18}px, 0)`; ui.tip.classList.add("is-on"); }
    else ui.tip.classList.remove("is-on");
  }

  // ---------------- loop ----------------
  const clock = new THREE.Clock();
  let frame = 0, fpsAcc = 0, fpsN = 0, degraded = LOW, bobT = 0;
  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    frame++;
    if (mode === "intro" && !REDUCED) { rig.yaw += Math.sin(t * 0.25) * 0.00025; rig.x += Math.sin(t * 0.2) * 0.0012; }
    let sp = 0;
    if (mode === "free") sp = move(dt);
    // gentle walking bob, never under reduced motion
    if (!REDUCED) { bobT += dt * (sp > 0.2 ? sp * 2.4 : 0); rig.bob = Math.sin(bobT * 2) * 0.012 * Math.min(1, sp / 2); cart.group.rotation.z = Math.sin(bobT) * 0.006 * Math.min(1, sp / 2); }
    applyRig();
    for (const s of W.spinners) s.obj.rotation.z += s.speed * dt;
    for (const b of W.blinkers) b.visible = Math.sin(t * 5) > -0.2;
    // the cold room door opens as you walk up to it
    if (W.coldDoor) {
      const it = W.coldDoor; it.root.updateMatrixWorld(); const hp = it.hinge.getWorldPosition(tmp);
      const want = Math.hypot(hp.x - rig.x, hp.z - rig.z) < 3.4 && rig.x > 3 ? 1 : 0;
      it.open += (want - it.open) * (1 - Math.exp(-dt * 2.2));
      it.hinge.rotation.y = -it.open * 1.45;
      for (const e of W.emitters) if (e.door) e.rate = it.open * 1.6;
    }
    air.update(dt, W.emitters, camera);
    if (frame % 2 === 0) updateDots();
    if (frame % 3 === 0) { updateHover(); updateWhere(); }
    // walking up to the desk opens the slip once
    if (mode === "free") { const nd = nearDesk(); if (nd < 2.3 && deskArmed && !slipOpen) { deskArmed = false; openSlip(true); } if (nd > 3.6) deskArmed = true; }
    composer.render(dt);
    stepConfetti();
    // drop the ambient occlusion pass if the device can't keep up
    if (!degraded && mode === "free") { fpsAcc += dt; fpsN++; if (fpsN === 90) { if (fpsN / fpsAcc < 34 && gtao) { gtao.enabled = false; degraded = true; } fpsAcc = 0; fpsN = 0; } }
  }
  renderer.setAnimationLoop(loop);
  document.addEventListener("visibilitychange", () => { renderer.setAnimationLoop(document.hidden ? null : loop); clock.getDelta(); });

  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    fov();
  });

  // list view hooks
  listHooks.add = (id) => addToTrolley(id);
  listHooks.remove = (id) => removeOne(id);
  listHooks.pause = (on) => renderer.setAnimationLoop(on ? null : loop);

  // test hook
  window.__sr = { rig, startTour, stopTour, enter, addToTrolley, openSlip, get mode() { return mode; }, set mode(v) { mode = v; }, setBar, composer, renderer, W };
}

// ================= list view (also the no-WebGL fallback) =================
const listHooks = {};
function buildList() {
  const groups = [...FACES.map(f => ({ id: f.id, title: `Aisle ${f.aisle} · ${f.name}` })), { id: "amc", title: "Services at the enquiry desk" }];
  ui.listBody.innerHTML = "";
  for (const g of groups) {
    const sec = document.createElement("section");
    sec.className = "sr-list__group";
    sec.innerHTML = `<h3></h3><ul></ul>`;
    sec.querySelector("h3").textContent = g.title;
    const ul = sec.querySelector("ul");
    for (const p of PRODUCTS.filter(p => p.face === g.id)) {
      const li = document.createElement("li");
      li.className = "sr-list__item";
      li.innerHTML = `<div><h4></h4><p></p><p class="sr-list__spec"></p></div><button type="button" class="sr-btn sr-btn--ghost" data-id=""><span>Add</span></button>`;
      li.querySelector("h4").textContent = p.name;
      li.querySelector("p").textContent = p.short;
      li.querySelector(".sr-list__spec").textContent = p.specs.map(s => s[1]).join(" · ");
      const b = li.querySelector("button"); b.dataset.id = p.id;
      b.addEventListener("click", () => { if (listHooks.add) listHooks.add(p.id); else { domAdd(p.id); } syncList(); });
      ul.appendChild(li);
    }
    ui.listBody.appendChild(sec);
  }
  syncList();
}
function domAdd(id) {
  const ex = trolley.find(i => i.id === id); if (ex) ex.q++; else trolley.push({ id, q: 1 });
  save(); syncCartDom();
}
function syncCartDom() { const t = totals(); ui.cartCount.textContent = t.n; ui.cartTr.textContent = t.tr ? `${fmtTr(t.tr)} TR` : "Trolley"; }
function syncList() {
  ui.listBody.querySelectorAll("button[data-id]").forEach(b => { const q = qtyOf(b.dataset.id); b.querySelector("span").textContent = q ? `Added · ${q}` : "Add"; b.classList.toggle("is-added", !!q); });
}
function syncCart() { syncCartDom(); }
function openList() { ui.list.hidden = false; requestAnimationFrame(() => ui.list.classList.add("is-on")); listHooks.pause && listHooks.pause(true); ui.listClose.focus({ preventScroll: true }); }
function closeList() { ui.list.classList.remove("is-on"); listHooks.pause && listHooks.pause(false); setTimeout(() => ui.list.hidden = true, 300); }
ui.listBtn.addEventListener("click", openList);
ui.listClose.addEventListener("click", () => { if (!renderer) return; closeList(); });

// ================= the trolley =================
function buildTrolley() {
  const M = mats();
  const group = new THREE.Group();
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe4e8ee, metalness: 1, roughness: 0.16 });
  const wires = [];
  const W = 0.56, D = 0.8, Hb = 0.38, y0 = 0.68, zN = -0.44, zF = zN - D;
  const add = (a, b, r = 0.0042) => wires.push([new THREE.Vector3(...a), new THREE.Vector3(...b), r]);
  // rims
  const rim = (y, r) => { add([-W / 2, y, zN], [W / 2, y, zN], r); add([-W / 2, y, zF], [W / 2, y, zF], r); add([-W / 2, y, zN], [-W / 2, y, zF], r); add([W / 2, y, zN], [W / 2, y, zF], r); };
  rim(y0 + Hb, 0.008); rim(y0 + Hb * 0.5, 0.004); rim(y0, 0.006);
  // verticals around the sides; the front flares outward slightly like a real cart
  for (let i = 0; i <= 12; i++) { const x = -W / 2 + i * W / 12; add([x, y0, zN], [x, y0 + Hb, zN]); add([x, y0, zF], [x * 1.04, y0 + Hb, zF - 0.03]); }
  for (let i = 1; i < 18; i++) { const z = zN - i * D / 18; add([-W / 2, y0, z], [-W / 2, y0 + Hb, z]); add([W / 2, y0, z], [W / 2, y0 + Hb, z]); }
  // floor grid
  for (let i = 0; i <= 8; i++) { const x = -W / 2 + i * W / 8; add([x, y0, zN], [x, y0, zF]); }
  for (let i = 0; i <= 10; i++) { const z = zN - i * D / 10; add([-W / 2, y0, z], [W / 2, y0, z]); }
  // frame and legs
  add([-W / 2 + 0.02, y0, zN], [-W / 2 + 0.04, 0.08, zN + 0.05], 0.011); add([W / 2 - 0.02, y0, zN], [W / 2 - 0.04, 0.08, zN + 0.05], 0.011);
  add([-W / 2 + 0.02, y0, zF], [-W / 2 + 0.04, 0.08, zF + 0.02], 0.011); add([W / 2 - 0.02, y0, zF], [W / 2 - 0.04, 0.08, zF + 0.02], 0.011);
  add([-W / 2 + 0.04, 0.12, zN + 0.05], [-W / 2 + 0.04, 0.12, zF + 0.02], 0.009); add([W / 2 - 0.04, 0.12, zN + 0.05], [W / 2 - 0.04, 0.12, zF + 0.02], 0.009);
  // handle uprights
  add([-W / 2, y0 + Hb, zN], [-W / 2 + 0.01, y0 + Hb + 0.16, zN + 0.12], 0.009); add([W / 2, y0 + Hb, zN], [W / 2 - 0.01, y0 + Hb + 0.16, zN + 0.12], 0.009);
  const geo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const inst = new THREE.InstancedMesh(geo, chrome, wires.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  wires.forEach(([a, b, r], i) => {
    const d = b.clone().sub(a), len = d.length();
    q.setFromUnitVectors(up, d.normalize());
    mtx.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(r, len, r));
    inst.setMatrixAt(i, mtx);
  });
  inst.castShadow = true;
  group.add(inst);
  // handle in brand navy with copper caps
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, W + 0.04, 20), M.navyGloss);
  handle.rotation.z = Math.PI / 2; handle.position.set(0, y0 + Hb + 0.16, zN + 0.12); group.add(handle);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.03, 20), M.copper); c.rotation.z = Math.PI / 2; c.position.set(s * (W / 2 + 0.03), y0 + Hb + 0.16, zN + 0.12); group.add(c); }
  // plastic panel with the logo colour on the front
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.14), M.navy); plate.position.set(0, y0 + Hb * 0.55, zF - 0.012); plate.rotation.y = Math.PI; group.add(plate);
  // wheels
  for (const [x, z] of [[-W / 2 + 0.04, zN + 0.05], [W / 2 - 0.04, zN + 0.05], [-W / 2 + 0.04, zF + 0.02], [W / 2 - 0.04, zF + 0.02]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20), M.rubber); w.rotation.z = Math.PI / 2; w.position.set(x, 0.05, z); group.add(w);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.3, D + 0.3), M.shadow.clone()); shadow.material.opacity = 0.35; shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.004, (zN + zF) / 2); group.add(shadow);

  const slots = [];
  for (const r of [2, 1, 0]) for (const c of [1, 0, 2]) slots.push(new THREE.Vector3(-0.17 + c * 0.17, y0 + 0.02, zN - 0.16 - r * 0.24));
  const items = {}; let used = 0;
  const box = new THREE.Box3(), sz = new THREE.Vector3();
  return {
    group,
    makeItem(it) {
      const c = it.root.clone(true);
      c.position.set(0, 0, 0); c.rotation.set(0, 0, 0); c.scale.set(1, 1, 1);
      c.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); o.material.emissiveIntensity = 0; } o.castShadow = false; });
      c.updateMatrixWorld(true);
      box.setFromObject(c); box.getSize(sz);
      const fit = 0.3 / Math.max(sz.x, sz.y, sz.z, 0.001);
      const ctr = box.getCenter(new THREE.Vector3());
      const holder = new THREE.Group();
      c.position.set(-ctr.x, -box.min.y, -ctr.z);
      holder.add(c);
      holder.userData.fitScale = fit;
      return holder;
    },
    slotWorld(id) {
      const idx = items[id] ? items[id].slot : used % slots.length;
      const layer = Math.floor((items[id] ? items[id].slot : used) / slots.length);
      const p = slots[idx % slots.length].clone(); p.y += layer * 0.18;
      return group.localToWorld(p);
    },
    place(holder, id) {
      const slot = used++;
      const p = slots[slot % slots.length].clone(); p.y += Math.floor(slot / slots.length) * 0.18;
      group.add(holder);
      holder.position.copy(p);
      holder.scale.setScalar(holder.userData.fitScale);
      holder.rotation.set(0, (slot % 3 - 1) * 0.5, 0);
      items[id] = { obj: holder, slot };
    },
    fill(it) { const h = this.makeItem(it); this.place(h, it.p.id); },
    remove(id) { if (items[id]) { group.remove(items[id].obj); delete items[id]; } }
  };
}

// ================= airflow particles =================
function makeAir(N) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), alpha = new Float32Array(N), size = new Float32Array(N);
  const vel = new Float32Array(N * 3), life = new Float32Array(N), age = new Float32Array(N), base = new Float32Array(N);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: innerHeight * 0.9 } },
    vertexShader: `attribute vec3 aColor; attribute float aAlpha; attribute float aSize; uniform float uScale; varying vec3 vC; varying float vA;
      void main(){ vC=aColor; vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*uScale/max(.1,-mv.z); }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.0,d); a*=a; gl_FragColor=vec4(vC,a*vA); }`
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 5;
  for (let i = 0; i < N; i++) { life[i] = 0; age[i] = 1; pos[i * 3 + 1] = -50; }
  let cursor = 0;
  const C = { cool: [0.62, 0.88, 1.0], warm: [1.0, 0.74, 0.5], mist: [0.93, 0.97, 1.0] };
  const camP = new THREE.Vector3();
  addEventListener("resize", () => { mat.uniforms.uScale.value = innerHeight * 0.9; });
  return {
    points: pts,
    update(dt, emitters, camera) {
      camera.getWorldPosition(camP);
      for (const e of emitters) {
        if (e.wp.distanceToSquared(camP) > 200) continue;
        const rate = (e.rate ?? 1) * (e.k === "mist" ? 40 : 26);
        e.acc += rate * dt;
        while (e.acc >= 1) {
          e.acc -= 1;
          const i = cursor; cursor = (cursor + 1) % N;
          const spread = e.w || 0.3;
          // spread along the outlet's width (perpendicular to the flow, horizontal)
          const side = new THREE.Vector3(-e.wd.z, 0, e.wd.x); if (side.lengthSq() < 0.01) side.set(1, 0, 0); side.normalize();
          const o = (Math.random() - 0.5) * spread;
          pos[i * 3] = e.wp.x + side.x * o + (Math.random() - 0.5) * 0.04;
          pos[i * 3 + 1] = e.wp.y + (Math.random() - 0.5) * (e.h || 0.04);
          pos[i * 3 + 2] = e.wp.z + side.z * o + (Math.random() - 0.5) * 0.04;
          const sp = e.k === "mist" ? 0.35 : e.k === "warm" ? 0.7 : 0.95;
          vel[i * 3] = e.wd.x * sp + (Math.random() - 0.5) * 0.12;
          vel[i * 3 + 1] = e.wd.y * sp + (Math.random() - 0.5) * 0.08;
          vel[i * 3 + 2] = e.wd.z * sp + (Math.random() - 0.5) * 0.12;
          life[i] = e.k === "mist" ? 2.6 + Math.random() * 1.6 : 1.4 + Math.random() * 1.0; age[i] = 0;
          const c = C[e.k] || C.cool; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
          size[i] = e.k === "mist" ? 0.26 + Math.random() * 0.2 : 0.07 + Math.random() * 0.07;
          base[i] = e.k === "mist" ? 0.22 : e.k === "warm" ? 0.1 : 0.2;
        }
      }
      for (let i = 0; i < N; i++) {
        if (age[i] >= life[i]) { alpha[i] = 0; continue; }
        age[i] += dt;
        const k = i * 3, mist = size[i] > 0.2;
        vel[k] *= 0.985; vel[k + 2] *= 0.985; vel[k + 1] = vel[k + 1] * 0.985 + (mist ? -0.03 : col[k] > 0.9 ? 0.12 : -0.18) * dt;
        pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
        if (pos[k + 1] < 0.02) { pos[k + 1] = 0.02; vel[k + 1] = 0; }
        const tt = age[i] / life[i];
        alpha[i] = Math.sin(Math.PI * tt) * base[i];
        if (mist) size[i] += dt * 0.08;
      }
      g.attributes.position.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true; g.attributes.aColor.needsUpdate = true; g.attributes.aSize.needsUpdate = true;
    }
  };
}

// ================= product thumbnails for the bar =================
function makeThumbs(renderer, items, env) {
  const S = 160, out = {};
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 0.9;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.2));
  const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(2, 3, 4); scene.add(d);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  const rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
  const buf = new Uint8Array(S * S * 4);
  const c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d"); const img = x.createImageData(S, S);
  const box = new THREE.Box3(), size = new THREE.Vector3(), ctr = new THREE.Vector3();
  const prevTM = renderer.toneMapping;
  for (const it of items) {
    const clone = it.root.clone(true); clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0);
    // drop tags and shadow planes from the picture
    clone.traverse(o => { if (o.isMesh && o.geometry.type === "PlaneGeometry" && o.material.map && o.material.map.userData.canvas && o.material.map.userData.canvas.width === 512 && o.material.map.userData.canvas.height === 168) o.visible = false; if (o.isMesh && o.material && o.material.alphaMap && o.material.color && o.material.color.getHex() === 0) o.visible = false; });
    scene.add(clone); clone.updateMatrixWorld(true);
    box.makeEmpty(); clone.traverse(o => { if (o.isMesh && o.visible) box.expandByObject(o); });
    box.getSize(size); box.getCenter(ctr);
    const r = Math.max(size.x, size.y, size.z) * 0.62;
    const dist = r / Math.tan(THREE.MathUtils.degToRad(15));
    cam.position.set(ctr.x + dist * 0.42, ctr.y + dist * 0.22, ctr.z + dist * 0.88); cam.lookAt(ctr);
    renderer.setRenderTarget(rt); renderer.setClearColor(0xf1f2f4, 1); renderer.clear();
    renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf);
    for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
    x.putImageData(img, 0, 0);
    out[it.p.id] = c.toDataURL("image/jpeg", 0.85);
    scene.remove(clone);
  }
  renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); renderer.toneMapping = prevTM;
  rt.dispose();
  return out;
}
