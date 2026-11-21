// SAELLE walk-in store: renderer, camera, intro, tour, basket and checkout.
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { mats, setAniso, redraw, texturesReady, FONT_D, FONT_B, BRAND, roundRect, spaced } from "./kit.js";
import { PRODUCTS, BY_ID, SECTIONS, SEC_BY_ID, TOUR, fmt } from "./data.js";
import { buildProduct } from "./products.js";
import { buildWorld, DIM } from "./world.js";

const gsap = window.gsap;
const params = new URLSearchParams(location.search);
if (params.has("nolag")) gsap.ticker.lagSmoothing(0);
const $ = (s, r = document) => r.querySelector(s);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const COARSE = matchMedia("(pointer: coarse)").matches;
const LOW = params.has("low") || (!params.has("high") && (COARSE || innerWidth < 820 || (navigator.hardwareConcurrency || 8) <= 4));
const EYE = 1.6;

const ui = {
  canvas: $("#st-canvas"), intro: $("#st-intro"), enter: $("#st-enter"), load: $("#st-load"), loadBar: $("#st-load-bar"),
  hud: $("#st-hud"), where: $("#st-where"), tourBtn: $("#st-tour"), cartBtn: $("#st-cart"), cartCount: $("#st-cart-count"), cartSum: $("#st-cart-sum"),
  toast: $("#st-toast"), toastText: $("#st-toast-text"), bar: $("#st-bar"), barImg: $("#st-bar-img"), barKick: $("#st-bar-kick"), barName: $("#st-bar-name"),
  barSpec: $("#st-bar-spec"), barPrice: $("#st-bar-price"), barAdd: $("#st-bar-add"), hint: $("#st-hint"), dots: $("#st-dots"), tip: $("#st-tip"),
  slip: $("#st-slip"), slipList: $("#st-slip-list"), slipSub: $("#st-slip-sub"), slipTotal: $("#st-slip-total"), slipTax: $("#st-slip-tax"), slipCount: $("#st-slip-count"),
  slipClose: $("#st-slip-close"), slipForm: $("#st-slip-form"), slipName: $("#st-name"), slipHead: $("#st-slip-head"), slipDone: $("#st-slip-done"),
  slipAgain: $("#st-slip-again"), slipEmpty: $("#st-slip-empty"), slipOrder: $("#st-slip-order"), slipDate: $("#st-slip-date"), slipThanks: $("#st-slip-thanks"),
  confetti: $("#st-confetti"), joy: $("#st-joy"), joyKnob: $("#st-joy-knob"), listBtn: $("#st-list-btn"), list: $("#st-list"), listClose: $("#st-list-close"),
  listBody: $("#st-list-body"), introList: $("#st-intro-list"), nogl: $("#st-nogl")
};

// ---------------- basket state ----------------
const KEY = "saelle-basket";
let basket = [];
try { basket = JSON.parse(localStorage.getItem(KEY) || "[]").filter(i => BY_ID[i.id]); } catch (e) { basket = []; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(basket)); } catch (e) {} };
const qtyOf = id => (basket.find(i => i.id === id) || {}).q || 0;
const totals = () => ({ n: basket.reduce((a, i) => a + i.q, 0), sum: basket.reduce((a, i) => a + BY_ID[i.id].price * i.q, 0) });

// ---------------- WebGL check ----------------
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: false, powerPreference: "high-performance" }); } catch (e) { renderer = null; }
if (!renderer) { ui.nogl.hidden = false; ui.intro.hidden = true; buildList(); syncCartDom(); openList(); }
else boot().catch(err => { console.error(err); ui.load.textContent = "The 3D store could not open. Try the list view."; });

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
  const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.03, 120);
  const body = new THREE.Group(); scene.add(body);
  body.add(camera); camera.position.y = EYE;

  const fontWait = Promise.race([
    Promise.all([document.fonts.load(`500 64px "Bodoni Moda"`), document.fonts.load(`500 32px "Manrope"`), document.fonts.load(`600 32px "Manrope"`), document.fonts.load(`700 32px "Manrope"`)]),
    new Promise(r => setTimeout(r, 3500))
  ]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = roomEnv;
  scene.environmentIntensity = 0.5;

  let loaded = 0; const total = 11;
  const tick = () => { loaded++; ui.loadBar.style.transform = `scaleX(${Math.min(1, loaded / total)})`; };
  const hdrP = fetch("assets/hdri/night_square.txt").then(r => r.text()).then(s => { const b = Uint8Array.from(atob(s.trim()), c => c.charCodeAt(0)); const L = new RGBELoader(); const d = L.parse(b.buffer); const t = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type); t.colorSpace = THREE.LinearSRGBColorSpace; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true; return t; }).then(t => { tick(); return t; });
  const gl = new GLTFLoader();
  const g = (n) => gl.loadAsync(`assets/models/${n}/main.json`).then(r => { tick(); return r.scene; }).catch(e => { console.warn("model", n, e); tick(); return null; });
  const [hdr, tree, plant4, vase1, vase3, brass, stool, ottoman, side, lamp] = await Promise.all([
    hdrP, g("pachira_aquatica_01"), g("potted_plant_04"), g("ceramic_vase_01"), g("ceramic_vase_03"), g("brass_vase_01"), g("bar_chair_round_01"), g("Ottoman_01"), g("side_table_01"), g("street_lamp_01")
  ]);
  await fontWait; tick();

  hdr.mapping = THREE.EquirectangularReflectionMapping;
  const extEnv = pmrem.fromEquirectangular(hdr).texture;
  scene.background = hdr;
  scene.backgroundIntensity = 0.42;
  scene.backgroundRotation = new THREE.Euler(0, Math.PI * 0.62, 0);

  const norm = (o) => { if (!o) return null; const w = new THREE.Group(); o.position.set(0, 0, 0); o.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(o); const c = b.getCenter(new THREE.Vector3()); o.position.sub(new THREE.Vector3(c.x, b.min.y, c.z)); w.add(o); w.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return w; };
  const models = { tree: norm(tree), plant4: norm(plant4), vase1: norm(vase1), vase3: norm(vase3), brass: norm(brass), stool: norm(stool), ottoman: norm(ottoman), side: norm(side), lamp: norm(lamp) };

  const W = buildWorld(scene, { extEnv, models, quality: LOW ? "low" : "high" });
  W.mainCamera = camera;
  await Promise.race([texturesReady(), new Promise(r => setTimeout(r, 20000))]);

  // ---------------- lights ----------------
  const hemi = new THREE.HemisphereLight(0xfff1e6, 0x6b5a50, 0.32); scene.add(hemi);
  const shadowSpot = (x, y, z, tx, tz, I, ang) => {
    const s = new THREE.SpotLight(0xffe6cc, I, 0, ang, 0.75, 1.4);
    s.position.set(x, y, z); s.target.position.set(tx, 0, tz);
    s.castShadow = true; s.shadow.mapSize.set(LOW ? 1024 : 2048, LOW ? 1024 : 2048);
    s.shadow.camera.near = 1; s.shadow.camera.far = 12; s.shadow.bias = -0.0003; s.shadow.normalBias = 0.015; s.shadow.radius = 5;
    scene.add(s, s.target); return s;
  };
  shadowSpot(0, 3.95, -6.5, 0, -7.2, 40, 1.05);
  if (!LOW) shadowSpot(0, 3.95, 1.4, 0, 1.5, 16, 0.6);
  // wall washers on each side: warm, wide
  for (const s of [-1, 1]) for (const z of [-2.0, -7.6]) {
    const w = new THREE.SpotLight(0xffe2c4, 34, 9, 0.85, 0.9, 1.3);
    w.position.set(s * 3.4, 3.9, z); w.target.position.set(s * 7, 1.4, z); scene.add(w, w.target);
  }
  const pend = new THREE.PointLight(0xffd9b0, 4, 6, 1.6); pend.position.set(0, 2.2, DIM.scentZ); scene.add(pend);
  const desk = new THREE.SpotLight(0xffe2c4, 22, 8, 0.8, 0.9, 1.4); desk.position.set(0, 3.9, DIM.deskZ + 0.6); desk.target.position.set(0, 0.8, DIM.deskZ - 0.6); scene.add(desk, desk.target);
  const vanity = new THREE.PointLight(0xffe0c0, 2.5, 5, 1.6); vanity.position.set(4.9, 2.4, DIM.back + 1.6); scene.add(vanity);
  // facade washers grazing the stone
  for (const x of [-9.7, -2.0, 2.0, 9.7]) { const u = new THREE.SpotLight(0xffcf98, 70, 7, 0.26, 0.75, 1.5); u.position.set(x, 0.12, DIM.front + 1.05); u.target.position.set(x, 4.4, DIM.front + 0.62); scene.add(u, u.target); }
  // outdoors the city light comes from the street HDRI: keep it as reflections, not as a flat fill
  for (const m of W.extMats) m.envMapIntensity = (m.metalness > 0.5 || m.transmission > 0 || m.clearcoat > 0.5) ? 0.8 : m.clearcoat > 0 ? 0.35 : 0.05;
  // the warm spill of the shop through the door and windows onto the pavement
  const spill = new THREE.SpotLight(0xffdcb6, 30, 9, 1.1, 1, 1.5); spill.position.set(0, 3.2, DIM.front - 1.5); spill.target.position.set(0, 0, DIM.front + 3.5); scene.add(spill, spill.target);

  // ---------------- interior reflections: capture the finished room once ----------------
  {
    const crt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    const cc = new THREE.CubeCamera(0.05, 60, crt); cc.position.set(0, 1.7, -5.5); scene.add(cc);
    W.skipReflect = true;
    cc.update(renderer, scene);
    W.skipReflect = false;
    const inEnv = pmrem.fromCubemap(crt.texture).texture;
    scene.environment = inEnv;
    scene.environmentIntensity = 0.75;
    crt.dispose(); scene.remove(cc);
  }

  // ---------------- post ----------------
  const size = new THREE.Vector2(innerWidth, innerHeight);
  const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: LOW ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(DPR);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (!LOW) {
    gtao = new GTAOPass(scene, camera, innerWidth, innerHeight);
    gtao.updateGtaoMaterial({ radius: 0.3, distanceExponent: 1.5, thickness: 1, scale: 1.0, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
    gtao.blendIntensity = 0.75;
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(size.clone().multiplyScalar(0.5), 0.28, 0.55, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // the camera itself: a touch of lens fringing at the edges, vignette, a soft grade and fine film grain
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) }, uGrain: { value: LOW ? 0.022 : 0.03 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; uniform float uGrain; varying vec2 vUv;
      float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
      void main(){
        vec2 d = vUv - 0.5; float r2 = dot(d, d);
        vec2 off = d * r2 * 0.012;
        vec3 c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
        float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(c, c * vec3(1.03, 1.0, 0.95), smoothstep(0.35, 0.9, lum));       // warm highlights
        c = mix(c, c + vec3(-0.004, 0.0, 0.012), 1.0 - smoothstep(0.0, 0.25, lum)); // cool, slightly lifted shadows
        c = mix(vec3(lum), c, 1.04);
        c *= mix(1.0, 0.72, smoothstep(0.12, 0.62, r2 * 1.6));                  // vignette
        float n = h(vUv * uRes + fract(uTime * 13.7) * 100.0) - 0.5;
        c += n * uGrain * (1.0 - lum * 0.6);
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  composer.addPass(lens);

  // ---------------- camera rig ----------------
  const rig = { x: -1.2, y: 0, z: 17.2, yaw: 0, pitch: 0.12, bob: 0 };
  const lookYaw = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  rig.yaw = lookYaw(rig.x, rig.z, -0.3, DIM.front);
  if (innerWidth / innerHeight < 0.8) { Object.assign(rig, { x: -0.6, z: 18.5, pitch: 0.16 }); rig.yaw = lookYaw(rig.x, rig.z, 0, DIM.front); }
  const shortest = (from, to) => { let d = to - from; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return from + d; };
  function applyRig() {
    body.position.set(rig.x, rig.y, rig.z);
    body.rotation.y = rig.yaw;
    camera.rotation.set(rig.pitch, 0, 0);
    camera.position.y = EYE + rig.bob;
  }
  function fov() { const a = innerWidth / innerHeight; camera.fov = a < 0.8 ? 72 : a < 1.2 ? 64 : 56; camera.aspect = a; camera.updateProjectionMatrix(); }
  fov();

  // ---------------- basket ----------------
  const cart = buildBasket(); body.add(cart.group);
  const BASK = { x: 0.42, y: 0.9, z: -0.74 };
  cart.group.position.set(BASK.x, BASK.y - 0.8, BASK.z); cart.group.visible = false;

  // ---------------- products ----------------
  const pickables = [];
  const prodState = {};
  for (const item of W.products) {
    item.root.userData.pid = item.p.id;
    const own = [];
    item.root.traverse(o => {
      if (!o.isMesh) return;
      pickables.push(o);
      if (o.material && o.material.isMeshStandardMaterial && !o.material.transparent && o.material.transmission === 0 || (o.material && o.material.transmission === undefined && o.material.isMeshStandardMaterial)) { o.material = o.material.clone(); own.push(o.material); }
    });
    item.mats = own;
    item.root.updateMatrixWorld(true);
    item.hotWorld = item.root.localToWorld(item.hot.clone());
    if (item.normal) item.normal = item.normal.clone().normalize();
    prodState[item.p.id] = item;
  }
  const highlight = (id, amount) => { const it = prodState[id]; if (!it) return; for (const m of it.mats) { m.emissive.set(BRAND.brass); m.emissiveIntensity = amount; } };

  // ---------------- particles: perfume mist and dust in the light ----------------
  const air = makeAir(LOW ? 300 : 800);
  scene.add(air.points);
  scene.updateMatrixWorld(true);
  for (const e of W.emitters) { e.wp = e.obj ? e.obj.localToWorld(e.p.clone()) : e.p.clone(); e.wd = (e.obj ? e.d.clone().transformDirection(e.obj.matrixWorld) : e.d.clone()).normalize(); e.acc = 0; }
  const motes = makeMotes(LOW ? 120 : 320); scene.add(motes.points);

  // ---------------- thumbnails ----------------
  const thumbs = makeThumbs(renderer, PRODUCTS, scene.environment);

  // ---------------- campaign prints on the bare walls, shot like real product photography ----------------
  const CAMPAIGNS = [
    { ids: ["cloud-cream", "dew-serum", "rice-toner"], kick: "NEW  ·  THE GLOW RITUAL", title: ["Dewy,", "by design."], line: "Hyaluronic serum, barrier cream, rice water toner", bg: ["#f0d3c7", "#d9a596"], plinth: 0xf4e4dc, ink: "#3a1f2b", wall: -1, z: 2.75 },
    { ids: ["jasmine-night", "oud-saffron"], kick: "FRAGRANCE  ·  No. 7", title: ["Wear", "the night."], line: "Jasmine Night and Oud & Saffron, eau de parfum", bg: ["#6b3445", "#26121a"], plinth: 0x3a1f2b, ink: "#f3e3d6", wall: 1, z: 2.75 },
    { ids: ["lip-sindoor", "palette", "lip-rosewood"], kick: "MAKEUP  ·  VELVET MATTE", title: ["Colour", "that stays."], line: "Lipstick in Sindoor and Rosewood, Sunset palette", bg: ["#d4917f", "#8c4a45"], plinth: 0xe9cfc5, ink: "#fbf1ea", wall: 1, z: -12.75 },
    { ids: ["body-butter", "hair-oil", "ubtan-scrub"], kick: "HAIR & BODY", title: ["Slow", "rituals."], line: "Bhringraj hair oil, shea butter, ubtan scrub", bg: ["#ede2d3", "#c9b29a"], plinth: 0xf6efe6, ink: "#3a1f2b", wall: -1, z: -12.75 },
  ];
  for (const c of CAMPAIGNS) {
    const tex = makeCampaign(renderer, scene.environment, c);
    const g = new THREE.Group(); g.position.set(c.wall * (DIM.x - 0.03), 1.75, c.z); g.rotation.y = -c.wall * Math.PI / 2; scene.add(g);
    const PW = 1.25, PH = 1.72;
    const frameM = new THREE.MeshStandardMaterial({ color: 0xb08a55, metalness: 1, roughness: 0.38 });
    const matM = new THREE.MeshStandardMaterial({ color: 0xf6f1ea, roughness: 0.95 });
    const fb = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; g.add(b); return b; };
    fb(PW + 0.26, PH + 0.26, 0.02, 0, 0, 0.01, matM);
    for (const [w, h, x, y] of [[PW + 0.3, 0.025, 0, (PH + 0.275) / 2], [PW + 0.3, 0.025, 0, -(PH + 0.275) / 2], [0.025, PH + 0.3, (PW + 0.275) / 2, 0], [0.025, PH + 0.3, -(PW + 0.275) / 2, 0]]) fb(w, h, 0.045, x, y, 0.022, frameM);
    const print = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.08, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: LOW ? 0.32 : 0.12 }));
    print.position.z = 0.0215; g.add(print);
    // a brass picture light over each print
    const arm = fb(0.02, 0.02, 0.22, 0, PH / 2 + 0.2, 0.11, frameM); void arm;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 20), frameM); bar.rotation.z = Math.PI / 2; bar.position.set(0, PH / 2 + 0.2, 0.22); g.add(bar);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.006, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.8, 1.4), toneMapped: false })); glow.position.set(0, PH / 2 + 0.177, 0.22); g.add(glow);
    if (!LOW) { const sp = new THREE.SpotLight(0xffe4c8, 9, 3, 0.75, 0.9, 1.6); sp.position.set(0, PH / 2 + 0.17, 0.25); g.add(sp); sp.target.position.set(0, -0.3, 0); g.add(sp.target); }
  }

  // ---------------- hotspot dots ----------------
  const dots = {};
  for (const it of W.products) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "st-dot"; b.setAttribute("aria-label", it.p.name + ", " + fmt(it.p.price));
    b.innerHTML = '<span class="st-dot__core"></span>';
    b.addEventListener("click", (e) => { e.stopPropagation(); stopTour(); focusProduct(it.p.id, true); });
    b.addEventListener("pointerenter", () => { if (!COARSE) hoverId = it.p.id; });
    b.addEventListener("pointerleave", () => { if (hoverId === it.p.id) hoverId = null; });
    ui.dots.appendChild(b);
    dots[it.p.id] = b;
  }

  // ---------------- state ----------------
  let mode = "intro";
  let hoverId = null, pinnedId = null, tourTl = null, userMoved = false;
  const keys = {}; const vel = new THREE.Vector2(); let wheelV = 0;
  const joy = { x: 0, y: 0, active: false };
  let deskArmed = true;

  drawDesk("idle");
  syncCart();
  buildList();
  basket.forEach(i => cart.fill(BY_ID[i.id]));

  // ---------------- intro ----------------
  ui.load.hidden = true;
  ui.enter.disabled = false;
  ui.intro.classList.add("is-ready");
  ui.enter.focus({ preventScroll: true });
  ui.enter.addEventListener("click", enter);
  ui.introList.addEventListener("click", openList);

  function enter() {
    if (mode !== "intro") return;
    mode = "entering";
    ui.intro.classList.add("is-leaving");
    setTimeout(() => { ui.intro.hidden = true; }, 700);
    if (REDUCED) { Object.assign(rig, { x: 0, z: 3.6, yaw: 0, pitch: -0.12 }); openDoors(true); showInside(); return; }
    const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });
    const doorYaw = () => lookYaw(rig.x, rig.z, 0, DIM.front - 2);
    tl.to(rig, { x: -0.4, z: 10.5, pitch: 0.02, duration: 3.4, onUpdate: () => { rig.yaw = shortest(rig.yaw, doorYaw()) * 0.1 + rig.yaw * 0.9; } })
      .to(rig, { x: 0, z: 7.6, yaw: 0, pitch: -0.02, duration: 1.8, ease: "power1.inOut" })
      .add(() => openDoors(true), "-=1.1")
      .to(rig, { z: 3.4, pitch: -0.12, duration: 2.8, ease: "power2.inOut" })
      .add(() => { cart.group.visible = true; gsap.fromTo(cart.group.position, { y: BASK.y - 0.8 }, { y: BASK.y, duration: 1.2, ease: "power3.out" }); }, "-=1.2")
      .add(() => showInside(), "-=0.4")
      .add(() => openDoors(false), "+=0.4");
  }
  function showInside() {
    cart.group.visible = true; if (REDUCED) cart.group.position.y = BASK.y;
    ui.hud.hidden = false;
    requestAnimationFrame(() => ui.hud.classList.add("is-on"));
    if (COARSE) ui.joy.hidden = false;
    mode = "free";
    showHint();
    setTimeout(() => { if (mode === "free" && !userMoved) startTour(); }, REDUCED ? 600 : 1200);
  }
  function openDoors(open) {
    for (const d of W.doors) {
      if (REDUCED) d.obj.rotation.y = open ? d.open : d.closed;
      else gsap.to(d.obj.rotation, { y: open ? d.open : d.closed, duration: open ? 1.6 : 1.8, ease: open ? "power2.out" : "power2.inOut" });
    }
  }
  let hintTimer = 0;
  function showHint() {
    ui.hint.hidden = false;
    requestAnimationFrame(() => ui.hint.classList.add("is-on"));
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { ui.hint.classList.remove("is-on"); setTimeout(() => ui.hint.hidden = true, 400); }, 7500);
  }

  // ---------------- tour ----------------
  function standFor(it) {
    const hw = it.hotWorld;
    if (it.normal) {
      const d = 1.45;
      return { x: THREE.MathUtils.clamp(hw.x + it.normal.x * d, -5.4, 5.4), z: hw.z + it.normal.z * d + (it.normal.x ? 0.35 : 0) };
    }
    // tables: stand in front, nudged sideways toward the product
    return { x: hw.x * 0.75, z: hw.z + (hw.z > DIM.scentZ - 1 ? 1.45 : 1.3) };
  }
  function glideTo(x, z, tx, ty, tz, dur) {
    const yaw = shortest(rig.yaw, lookYaw(x, z, tx, tz));
    const dist = Math.hypot(tx - x, tz - z);
    const pitch = THREE.MathUtils.clamp(Math.atan2(ty - EYE, dist), -0.55, 0.25) + 0.02;
    return gsap.to(rig, { x, z, yaw, pitch, duration: dur ?? Math.min(3.4, 1.2 + Math.hypot(x - rig.x, z - rig.z) * 0.36), ease: "power2.inOut" });
  }
  // a walk that avoids the tables: go round via the aisle beside them
  function routeTo(x, z) {
    const pts = [];
    const crosses = (z0, z1, zc, half) => (Math.min(z0, z1) < zc + half && Math.max(z0, z1) > zc - half);
    const zA = rig.z, zB = z;
    for (const [zc, half] of [[DIM.entryZ, 1.1], [DIM.scentZ, 0.95], [DIM.bodyZ, 0.85]]) {
      if (crosses(zA, zB, zc, half) && Math.abs(x) < 2.6 && Math.abs(rig.x) < 2.6 && !(Math.abs(zA - zc) < half && Math.abs(zB - zc) < half)) {
        const sx = (x + rig.x) >= 0 ? 2.75 : -2.75;
        pts.push({ x: sx, z: zc + (zB > zA ? -0.0 : 0) });
      }
    }
    return pts;
  }
  function walkTo(x, z, tx, ty, tz, done) {
    const via = routeTo(x, z);
    const tl = gsap.timeline({ onComplete: done });
    let px = rig.x, pz = rig.z;
    for (const v of via) {
      const yaw = () => lookYaw(px, pz, v.x, v.z);
      tl.to(rig, { x: v.x, z: v.z, duration: Math.max(0.9, Math.hypot(v.x - px, v.z - pz) * 0.42), ease: "sine.inOut", onStart: () => gsap.to(rig, { yaw: shortest(rig.yaw, yaw()), pitch: -0.08, duration: 0.8, ease: "power2.inOut" }) });
      px = v.x; pz = v.z;
    }
    tl.add(() => { tl.pause(); glideTo(x, z, tx, ty, tz).eventCallback("onComplete", () => tl.resume()); });
    tl.to({}, { duration: 0.01 });
    return tl;
  }
  function startTour(fromIndex) {
    stopTour(true);
    mode = "tour";
    setTourBtn(true);
    const tl = gsap.timeline({ onComplete: () => { mode = "free"; setTourBtn(false); } });
    let start = 0;
    if (fromIndex == null && rig.z < DIM.front) {
      let best = Infinity;
      TOUR.forEach((s, i) => { if (s === "desk") return; const it = prodState[s[0]]; const p = standFor(it); const d = Math.hypot(p.x - rig.x, p.z - rig.z); if (d < best) { best = d; start = i; } });
    } else if (fromIndex != null) start = fromIndex;
    for (let i = start; i < TOUR.length; i++) {
      const s = TOUR[i];
      if (s === "desk") {
        tl.call(() => { tl.pause(); walkTo(0, DIM.deskZ + 1.75, 0, 1.15, DIM.deskZ, () => tl.resume()); });
        tl.call(() => { deskArmed = false; openSlip(true); });
        continue;
      }
      s.forEach((id, k) => {
        const it = prodState[id]; if (!it) return;
        tl.call(() => { tl.pause(); const st = standFor(it); walkTo(st.x, st.z, it.hotWorld.x, it.hotWorld.y, it.hotWorld.z, () => tl.resume()); });
        tl.call(() => { pinnedId = id; });
        tl.to({}, { duration: k === 0 ? 2.8 : 2.4 });
      });
      tl.call(() => { pinnedId = null; });
    }
    tourTl = tl;
  }
  function stopTour() {
    if (tourTl) { tourTl.kill(); tourTl = null; }
    gsap.killTweensOf(rig);
    gsap.globalTimeline.getChildren(false, true, true).forEach(t => { if (t.data === "walk") t.kill(); });
    pinnedId = null;
    if (mode === "tour") mode = "free";
    setTourBtn(false);
  }
  function setTourBtn(on) { ui.tourBtn.dataset.state = on ? "on" : "off"; ui.tourBtn.querySelector("span").textContent = on ? "Stop tour" : "Guided tour"; }
  ui.tourBtn.addEventListener("click", () => { if (mode === "tour") stopTour(); else if (mode === "free") startTour(); });

  // ---------------- product bar ----------------
  let barId = null;
  function focusProduct(id, pin) {
    if (!pin) return;
    pinnedId = id; const it = prodState[id];
    if (mode !== "tour") {
      gsap.killTweensOf(rig);
      const yaw = shortest(rig.yaw, lookYaw(rig.x, rig.z, it.hotWorld.x, it.hotWorld.z));
      const dist = Math.hypot(it.hotWorld.x - rig.x, it.hotWorld.z - rig.z);
      gsap.to(rig, { yaw, pitch: THREE.MathUtils.clamp(Math.atan2(it.hotWorld.y - EYE, dist), -0.55, 0.25), duration: REDUCED ? 0 : 0.7, ease: "power2.inOut" });
    }
  }
  function setBar(id) {
    if (id === barId) return;
    if (barId) highlight(barId, 0);
    barId = id;
    if (!id) { ui.bar.classList.remove("is-on"); ui.bar.setAttribute("aria-hidden", "true"); return; }
    highlight(id, 0.06);
    const p = BY_ID[id], s = SEC_BY_ID[p.sec];
    ui.barImg.src = thumbs[id] || "";
    ui.barKick.textContent = p.hero ? "New launch" : `${s.n} · ${s.name}`;
    ui.barName.textContent = p.name;
    ui.barSpec.textContent = `${p.size} · ${p.note}`;
    ui.barPrice.textContent = fmt(p.price);
    ui.bar.dataset.id = id;
    syncBarButton();
    ui.bar.setAttribute("aria-hidden", "false");
    ui.bar.classList.remove("is-on"); void ui.bar.offsetWidth; ui.bar.classList.add("is-on");
  }
  function syncBarButton() {
    if (!barId) return;
    const q = qtyOf(barId);
    ui.barAdd.querySelector("span").textContent = q ? `In basket · ${q}` : "Add to basket";
    ui.barAdd.classList.toggle("is-added", !!q);
  }
  ui.barAdd.addEventListener("click", () => { if (barId) addToBasket(barId); });

  function addToBasket(id) {
    const ex = basket.find(i => i.id === id);
    if (ex) ex.q++; else basket.push({ id, q: 1 });
    save(); syncCart(); syncBarButton(); syncList();
    const it = prodState[id];
    if (it && qtyOf(id) === 1) flyToBasket(it); else bumpCart();
    toast(`${BY_ID[id].name} is in your basket`);
    drawDesk(totals().n ? "ready" : "idle");
  }
  function removeOne(id) {
    const ex = basket.find(i => i.id === id); if (!ex) return;
    ex.q--; if (ex.q <= 0) { basket = basket.filter(i => i !== ex); cart.remove(id); }
    save(); syncCart(); syncBarButton(); syncList(); renderSlip();
    drawDesk(totals().n ? "ready" : "idle");
  }
  function flyToBasket(it) {
    const holder = cart.makeItem(it.p);
    if (REDUCED || !cart.group.visible) { cart.place(holder, it.p.id); return; }
    const from = it.hotWorld.clone();
    scene.add(holder);
    holder.position.copy(from);
    const s0 = 1, s1 = holder.userData.fitScale;
    const st = { t: 0 };
    gsap.to(st, {
      t: 1, duration: 0.9, ease: "power2.inOut",
      onUpdate: () => {
        const to = cart.slotWorld(it.p.id);
        const mid = from.clone().lerp(to, 0.5); mid.y = Math.max(from.y, to.y) + 0.35;
        const a = from.clone().lerp(mid, st.t), b = mid.clone().lerp(to, st.t);
        holder.position.copy(a.lerp(b, st.t));
        holder.scale.setScalar(s0 + (s1 - s0) * st.t);
        holder.rotation.y = rig.yaw + st.t * Math.PI * 0.8;
      },
      onComplete: () => { cart.place(holder, it.p.id); bumpCart(); }
    });
  }
  function bumpCart() {
    if (REDUCED) return;
    gsap.fromTo(cart.group.position, { y: BASK.y }, { y: BASK.y - 0.025, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" });
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

  // ---------------- basket chip and receipt ----------------
  function syncCart() {
    const t = totals();
    ui.cartCount.textContent = t.n;
    ui.cartSum.textContent = t.n ? fmt(t.sum) : "Basket";
    ui.cartBtn.setAttribute("aria-label", `Open your basket, ${t.n} item${t.n === 1 ? "" : "s"}, ${fmt(t.sum)}`);
    ui.cartBtn.classList.toggle("has-items", t.n > 0);
  }
  ui.cartBtn.addEventListener("click", () => openSlip(false));
  ui.slipClose.addEventListener("click", closeSlip);
  ui.slipAgain.addEventListener("click", () => { closeSlip(); });
  let slipOpen = false;
  function renderSlip() {
    const t = totals();
    ui.slipEmpty.hidden = t.n > 0;
    ui.slipForm.hidden = t.n === 0;
    ui.slipList.innerHTML = "";
    for (const i of basket) {
      const p = BY_ID[i.id];
      const li = document.createElement("li");
      li.innerHTML = `<span class="st-slip__q"></span><span class="st-slip__n"><span></span><small></small></span><span class="st-slip__v"></span><span class="st-slip__ctl"><button type="button" aria-label="Remove one">−</button><button type="button" aria-label="Add one">+</button></span>`;
      li.querySelector(".st-slip__q").textContent = i.q + "×";
      li.querySelector(".st-slip__n span").textContent = p.name;
      li.querySelector(".st-slip__n small").textContent = p.size;
      li.querySelector(".st-slip__v").textContent = fmt(p.price * i.q);
      const [minus, plus] = li.querySelectorAll("button");
      minus.addEventListener("click", () => removeOne(i.id));
      plus.addEventListener("click", () => { addToBasket(i.id); renderSlip(); });
      ui.slipList.appendChild(li);
    }
    ui.slipCount.textContent = `${t.n} item${t.n === 1 ? "" : "s"}`;
    ui.slipSub.textContent = t.n ? "Check your basket, then pay at the counter." : "Your basket is empty.";
    ui.slipTax.textContent = t.n ? fmt(Math.round(t.sum - t.sum / 1.18)) : "—";
    ui.slipTotal.textContent = t.n ? fmt(t.sum) : "—";
    const d = new Date();
    ui.slipDate.textContent = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  function openSlip(fromDesk) {
    ui.slip.classList.remove("is-sent");
    ui.slipDone.hidden = true; ui.slipHead.hidden = false;
    renderSlip();
    ui.slip.hidden = false;
    requestAnimationFrame(() => ui.slip.classList.add("is-on"));
    slipOpen = true;
    setTimeout(() => (totals().n ? ui.slipName : ui.slipClose).focus({ preventScroll: true }), 60);
  }
  function closeSlip() {
    ui.slip.classList.remove("is-on");
    slipOpen = false;
    setTimeout(() => { if (!slipOpen) ui.slip.hidden = true; }, 340);
  }
  ui.slipForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!totals().n) return;
    const name = ui.slipName.value.trim();
    const no = "SA-" + String(Math.floor(10000 + Math.random() * 89999));
    ui.slipOrder.textContent = no;
    ui.slipThanks.textContent = name ? `Thank you, ${name}.` : "Thank you.";
    ui.slip.classList.add("is-sent");
    ui.slipHead.hidden = true; ui.slipDone.hidden = false;
    drawDesk("paid", no);
    confetti(1);
    ui.slipAgain.focus({ preventScroll: true });
    // a fresh basket for the next visit
    basket = []; save(); cart.clear(); syncCart(); syncList(); syncBarButton();
  });

  // the screen on the till
  function drawDesk(state, no) {
    const t = totals();
    redraw(W.deskScreen, (x, w, h) => {
      x.fillStyle = "#1e1418"; x.fillRect(0, 0, w, h);
      x.textAlign = "center"; x.fillStyle = "#c9a46a"; x.font = `500 34px ${FONT_D}`; spaced(x, "SAELLE", w / 2, 64, 10);
      x.fillStyle = "rgba(201,164,106,.4)"; x.fillRect(w / 2 - 40, 84, 80, 2);
      if (state === "paid") {
        x.strokeStyle = "#d9b77c"; x.lineWidth = 10; x.lineCap = "round"; x.lineJoin = "round";
        x.beginPath(); x.arc(w / 2, 220, 70, 0, 7); x.stroke();
        x.beginPath(); x.moveTo(w / 2 - 32, 222); x.lineTo(w / 2 - 6, 248); x.lineTo(w / 2 + 36, 196); x.stroke();
        x.fillStyle = "#fbf7f4"; x.font = `600 34px ${FONT_B}`; x.fillText("Paid. Thank you!", w / 2, 350);
        x.fillStyle = "rgba(251,247,244,.6)"; x.font = `500 24px ${FONT_B}`; x.fillText("Order " + (no || ""), w / 2, 392);
      } else if (t.n) {
        x.fillStyle = "rgba(251,247,244,.6)"; x.font = `500 26px ${FONT_B}`; x.fillText(`${t.n} item${t.n > 1 ? "s" : ""} in your basket`, w / 2, 160);
        x.fillStyle = "#fbf7f4"; x.font = `700 96px ${FONT_B}`; x.fillText(fmt(t.sum), w / 2, 272);
        x.fillStyle = "#c9a46a"; roundRect(x, w / 2 - 150, 330, 300, 70, 35); x.fill();
        x.fillStyle = "#1e1418"; x.font = `700 28px ${FONT_B}`; x.fillText("Tap to pay", w / 2, 375);
      } else {
        x.fillStyle = "#fbf7f4"; x.font = `500 38px ${FONT_D}`; x.fillText("Welcome to Saelle", w / 2, 220);
        x.fillStyle = "rgba(251,247,244,.6)"; x.font = `500 26px ${FONT_B}`; x.fillText("Fill your basket on the shelves,", w / 2, 290); x.fillText("then pay here.", w / 2, 326);
      }
    });
  }

  // ---------------- confetti: petals in the brand colours ----------------
  const cctx = ui.confetti.getContext("2d");
  let bits = [], confettiOn = false;
  function confetti(power) {
    if (REDUCED) return;
    ui.confetti.width = innerWidth * DPR; ui.confetti.height = innerHeight * DPR;
    const cols = ["#C9A46A", "#E9CFC5", "#B85C6E", "#FBF7F4", "#5A2E33", "#F2D9A6"];
    for (let i = 0; i < 170 * power; i++) bits.push({ x: innerWidth * (0.25 + Math.random() * 0.5), y: innerHeight * 0.38, vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * 10, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35, w: 7 + Math.random() * 6, h: 10 + Math.random() * 9, c: cols[i % cols.length], life: 0, petal: i % 3 === 0 });
    confettiOn = true;
  }
  function stepConfetti() {
    if (!confettiOn) return;
    const c = cctx; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter(b => b.y < innerHeight + 40 && b.life < 320);
    for (const b of bits) {
      b.vy += 0.3; b.vx *= 0.985; b.vy *= 0.982; b.x += b.vx + Math.sin(b.life * 0.08 + b.r) * 0.6; b.y += b.vy; b.r += b.vr; b.life++;
      c.save(); c.translate(b.x, b.y); c.rotate(b.r); c.scale(1, Math.cos(b.life * 0.16 + b.r)); c.fillStyle = b.c;
      if (b.petal) { c.beginPath(); c.ellipse(0, 0, b.w * 0.5, b.h * 0.6, 0, 0, 7); c.fill(); } else c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * 0.6);
      c.restore();
    }
    if (!bits.length) { confettiOn = false; c.clearRect(0, 0, innerWidth, innerHeight); }
  }

  // ---------------- input ----------------
  let drag = null;
  const mouse = { x: 0, y: 0, moved: false, cx: 0, cy: 0 };
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
      const k = (COARSE ? 0.0055 : 0.0036) * (58 / camera.fov);
      rig.yaw = drag.yaw + dx * k;
      rig.pitch = THREE.MathUtils.clamp(drag.pitch + dy * k * 0.9, -0.8, 0.5);
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
    wheelV = THREE.MathUtils.clamp(wheelV - e.deltaY * 0.012, -4, 4);
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) rig.yaw -= e.deltaX * 0.002;
  }, { passive: false });
  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.key === "Escape") { if (slipOpen) closeSlip(); else if (!ui.list.hidden) closeList(); else if (mode === "tour") stopTour(); return; }
    if (mode !== "free" && mode !== "tour") return;
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e", "shift"].includes(k)) {
      if (k.startsWith("arrow")) e.preventDefault();
      if (mode === "tour") stopTour();
      userMoved = true; keys[k] = true;
    }
    if ((k === "enter" || k === " ") && e.target === document.body && barId) { e.preventDefault(); addToBasket(barId); }
  });
  addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
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
  const ray = new THREE.Raycaster(); ray.far = 12;
  function hitAt(nx, ny) {
    ray.setFromCamera({ x: nx, y: ny }, camera);
    const hits = ray.intersectObjects(pickables, false);
    for (const h of hits) { let o = h.object; while (o && !o.userData.pid) o = o.parent; if (o) return o.userData.pid; }
    return null;
  }
  function pick(cx, cy) {
    const id = hitAt((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    if (id) { if (mode === "tour") stopTour(); focusProduct(id, true); }
    else if (nearDesk() < 3.2) openSlip(true);
  }

  // ---------------- movement + collisions ----------------
  const R = 0.3;
  function blocked(x, z) {
    const inDoor = Math.abs(x) < 1.05 && z > DIM.front - 0.6 && z < DIM.front + 0.9;
    if (inDoor) return false;
    const b = z > DIM.front ? W.outside : W.bounds;
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return true;
    for (const o of W.obstacles) if (x > o.x0 - R && x < o.x1 + R && z > o.z0 - R && z < o.z1 + R) return true;
    return false;
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
    const speed = keys["shift"] ? 3.6 : 2.2;
    const tf = f * speed + wheelV, ts = s * speed * 0.8;
    wheelV *= Math.pow(0.02, dt);
    const k = 1 - Math.exp(-dt * 8);
    vel.x += (ts - vel.x) * k; vel.y += (tf - vel.y) * k;
    const sin = Math.sin(rig.yaw), cos = Math.cos(rig.yaw);
    const dx = (-sin * vel.y + cos * vel.x) * dt, dz = (-cos * vel.y - sin * vel.x) * dt;
    if (!blocked(rig.x + dx, rig.z)) rig.x += dx; else vel.x *= 0.3;
    if (!blocked(rig.x, rig.z + dz)) rig.z += dz; else vel.y *= 0.3;
    if (rig.z < DIM.front - 0.2 && Math.abs(rig.z - DIM.front) < 2.5 && W.doors[0] && Math.abs(W.doors[0].obj.rotation.y) < 0.5) openDoors(true);
    return Math.hypot(vel.x, vel.y);
  }

  // ---------------- where am I ----------------
  function nearDesk() { return Math.hypot(rig.x, rig.z - (DIM.deskZ + 1.1)); }
  let lastWhere = "";
  function updateWhere() {
    let w;
    if (rig.z > DIM.front) w = "Outside · Saelle flagship";
    else if (rig.z > 0) w = "Entrance · New launch";
    else if (rig.z < DIM.deskZ + 2.2) w = "Checkout counter";
    else if (rig.x < -2.4) w = "01 · Skincare";
    else if (rig.x > 2.4) w = "03 · Makeup";
    else if (rig.z > DIM.scentZ - 1.8) w = "02 · Fragrance bar";
    else w = "04 · Hair & Body";
    if (w !== lastWhere) { lastWhere = w; ui.where.textContent = w; }
  }

  // ---------------- dots ----------------
  const tmp = new THREE.Vector3(), camW = new THREE.Vector3();
  const occRay = new THREE.Raycaster();
  const occluders = [];
  scene.traverse(o => { if (o.isMesh && o.geometry && (o.geometry.type === "BoxGeometry" || o.geometry.type === "ExtrudeGeometry") && !o.material.transparent && !(o.material.transmission > 0)) { const b = new THREE.Box3().setFromObject(o); const s = b.getSize(new THREE.Vector3()); if (s.x * s.y + s.y * s.z > 0.5 && s.y > 0.5) occluders.push(o); } });
  function occluded(hw, dist) {
    occRay.set(camW, tmp.copy(hw).sub(camW).normalize()); occRay.far = dist - 0.25;
    return occRay.intersectObjects(occluders, false).length > 0;
  }
  let occTick = 0; const occCache = {};
  function updateDots() {
    camera.getWorldPosition(camW);
    let best = null, bestScore = Infinity;
    const live = (mode === "free" || mode === "tour") && !slipOpen;
    occTick++;
    for (const it of W.products) {
      const el = dots[it.p.id];
      const hw = it.hotWorld;
      const dist = camW.distanceTo(hw);
      let vis = live && dist < 8.5;
      if (vis && it.normal) vis = tmp.copy(camW).sub(hw).dot(it.normal) > 0.2 * dist;
      let sx = 0, sy = 0;
      if (vis) { tmp.copy(hw).project(camera); vis = tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05; sx = tmp.x; sy = tmp.y; }
      if (vis) { if ((occTick + it.p.id.length) % 6 === 0 || occCache[it.p.id] === undefined) occCache[it.p.id] = occluded(hw, dist); vis = !occCache[it.p.id]; }
      if (!vis) { if (el.dataset.v !== "0") { el.dataset.v = "0"; el.classList.remove("is-on"); el.tabIndex = -1; } continue; }
      const px = (sx * 0.5 + 0.5) * innerWidth, py = (-sy * 0.5 + 0.5) * innerHeight;
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      if (el.dataset.v !== "1") { el.dataset.v = "1"; el.classList.add("is-on"); el.tabIndex = 0; }
      el.classList.toggle("is-focus", it.p.id === barId);
      const score = Math.hypot(sx, sy * 1.3) + dist * 0.05;
      if (dist < 4.5 && score < bestScore) { bestScore = score; best = it.p.id; }
    }
    let want = pinnedId || hoverId || (bestScore < 0.5 ? best : null);
    if (!live) want = null;
    if (want && pinnedId && !hoverId) { const it = prodState[pinnedId]; if (Math.hypot(it.hotWorld.x - rig.x, it.hotWorld.z - rig.z) > 6) { pinnedId = null; want = best; } }
    setBar(want);
  }
  function updateHover() {
    if (COARSE || !mouse.moved || drag || (mode !== "free" && mode !== "tour")) return;
    const id = hitAt(mouse.x, mouse.y);
    if (id !== hoverId && !ui.dots.matches(":hover")) hoverId = id;
    ui.canvas.style.cursor = id ? "pointer" : "";
    if (id) { ui.tip.textContent = `${BY_ID[id].name} · ${fmt(BY_ID[id].price)}`; ui.tip.style.transform = `translate3d(${mouse.cx + 16}px, ${mouse.cy + 18}px, 0)`; ui.tip.classList.add("is-on"); }
    else ui.tip.classList.remove("is-on");
  }

  // ---------------- loop ----------------
  const clock = new THREE.Clock();
  let frame = 0, fpsAcc = 0, fpsN = 0, degraded = LOW, bobT = 0, puffT = 3;
  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    frame++; W.frameId = frame;
    if (mode === "intro" && !REDUCED) { rig.yaw += Math.sin(t * 0.25) * 0.0002; rig.x += Math.sin(t * 0.2) * 0.001; }
    let sp = 0;
    if (mode === "free") sp = move(dt);
    if (!REDUCED) { bobT += dt * (sp > 0.2 ? sp * 2.4 : 0); rig.bob = Math.sin(bobT * 2) * 0.01 * Math.min(1, sp / 2); cart.group.rotation.z = Math.sin(bobT) * 0.02 * Math.min(1, sp / 2); cart.group.rotation.x = Math.sin(t * 0.9) * 0.008; }
    applyRig();
    { const k = THREE.MathUtils.clamp((rig.z - DIM.front) / 3, 0, 1); hemi.intensity = 0.32 - 0.28 * k; renderer.toneMappingExposure = 1.22 - 0.22 * k; }
    // the tester atomiser puffs now and then
    puffT -= dt;
    for (const e of W.emitters) if (e.puff) { if (puffT < 0) { e.rate = 3.5; puffT = 5 + Math.random() * 3; } e.rate = Math.max(0, e.rate - dt * 5); }
    air.update(dt, W.emitters, camera);
    motes.update(dt, t);
    if (frame % 2 === 0) updateDots();
    if (frame % 3 === 0) { updateHover(); updateWhere(); }
    if (mode === "free") { const nd = nearDesk(); if (nd < 1.9 && deskArmed && !slipOpen) { deskArmed = false; openSlip(true); } if (nd > 3.4) deskArmed = true; }
    lens.uniforms.uTime.value = t;
    composer.render(dt);
    stepConfetti();
    if (!degraded && mode === "free") { fpsAcc += dt; fpsN++; if (fpsN === 90) { if (fpsN / fpsAcc < 34 && gtao) { gtao.enabled = false; degraded = true; } fpsAcc = 0; fpsN = 0; } }
  }
  renderer.setAnimationLoop(loop);
  document.addEventListener("visibilitychange", () => { renderer.setAnimationLoop(document.hidden ? null : loop); clock.getDelta(); });
  addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); lens.uniforms.uRes.value.set(innerWidth, innerHeight); fov(); });

  listHooks.add = (id) => addToBasket(id);
  listHooks.pause = (on) => renderer.setAnimationLoop(on ? null : loop);
  window.__st = { loop, rig, startTour, stopTour, enter, addToBasket, openSlip, openDoors, get mode() { return mode; }, set mode(v) { mode = v; }, setBar, composer, renderer, W, scene, camera, cart };
}

// ================= list view (also the no-WebGL fallback) =================
const listHooks = {};
function buildList() {
  ui.listBody.innerHTML = "";
  for (const s of SECTIONS) {
    const sec = document.createElement("section");
    sec.className = "st-list__group";
    sec.innerHTML = `<h3></h3><ul></ul>`;
    sec.querySelector("h3").textContent = `${s.n} · ${s.name}`;
    const ul = sec.querySelector("ul");
    for (const p of PRODUCTS.filter(p => p.sec === s.id)) {
      const li = document.createElement("li");
      li.className = "st-list__item";
      li.innerHTML = `<div><h4></h4><p></p></div><div class="st-list__buy"><strong></strong><button type="button" class="st-btn st-btn--ghost" data-id=""><span>Add</span></button></div>`;
      li.querySelector("h4").textContent = p.name;
      li.querySelector("p").textContent = `${p.size} · ${p.note}`;
      li.querySelector("strong").textContent = fmt(p.price);
      const b = li.querySelector("button"); b.dataset.id = p.id;
      b.addEventListener("click", () => { if (listHooks.add) listHooks.add(p.id); else domAdd(p.id); syncList(); });
      ul.appendChild(li);
    }
    ui.listBody.appendChild(sec);
  }
  syncList();
}
function domAdd(id) { const ex = basket.find(i => i.id === id); if (ex) ex.q++; else basket.push({ id, q: 1 }); save(); syncCartDom(); }
function syncCartDom() { const t = totals(); ui.cartCount.textContent = t.n; ui.cartSum.textContent = t.n ? fmt(t.sum) : "Basket"; }
function syncList() { ui.listBody.querySelectorAll("button[data-id]").forEach(b => { const q = qtyOf(b.dataset.id); b.querySelector("span").textContent = q ? `Added · ${q}` : "Add"; b.classList.toggle("is-added", !!q); }); }
function openList() { ui.list.hidden = false; requestAnimationFrame(() => ui.list.classList.add("is-on")); listHooks.pause && listHooks.pause(true); ui.listClose.focus({ preventScroll: true }); }
function closeList() { ui.list.classList.remove("is-on"); listHooks.pause && listHooks.pause(false); setTimeout(() => ui.list.hidden = true, 300); }
ui.listBtn.addEventListener("click", openList);
ui.listClose.addEventListener("click", () => { if (!renderer) return; closeList(); });

// ================= the basket you carry =================
function buildBasket() {
  const M = mats();
  const group = new THREE.Group();
  const wire = new THREE.MeshStandardMaterial({ color: 0x2a2224, metalness: 0.8, roughness: 0.35 });
  const wires = [];
  const Wd = 0.42, D = 0.28, H = 0.19;
  const add = (a, b, r = 0.0028) => wires.push([new THREE.Vector3(...a), new THREE.Vector3(...b), r]);
  // the basket tapers a little toward the base
  const k = 0.88;
  const rim = (y, s, r) => { const w = Wd * s / 2, d = D * s / 2; add([-w, y, -d], [w, y, -d], r); add([-w, y, d], [w, y, d], r); add([-w, y, -d], [-w, y, d], r); add([w, y, -d], [w, y, d], r); };
  rim(H, 1, 0.006); rim(H * 0.5, (1 + k) / 2, 0.0026); rim(0, k, 0.004);
  for (let i = 0; i <= 14; i++) { const t = -0.5 + i / 14; add([t * Wd * k, 0, -D * k / 2], [t * Wd, H, -D / 2]); add([t * Wd * k, 0, D * k / 2], [t * Wd, H, D / 2]); }
  for (let i = 1; i < 10; i++) { const t = -0.5 + i / 10; add([-Wd * k / 2, 0, t * D * k], [-Wd / 2, H, t * D]); add([Wd * k / 2, 0, t * D * k], [Wd / 2, H, t * D]); }
  for (let i = 0; i <= 10; i++) { const t = -0.5 + i / 10; add([t * Wd * k, 0, -D * k / 2], [t * Wd * k, 0, D * k / 2]); }
  for (let i = 0; i <= 6; i++) { const t = -0.5 + i / 6; add([-Wd * k / 2, 0, t * D * k], [Wd * k / 2, 0, t * D * k]); }
  const geo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  const inst = new THREE.InstancedMesh(geo, wire, wires.length);
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  wires.forEach(([a, b, r], i) => { const d = b.clone().sub(a), len = d.length(); q.setFromUnitVectors(up, d.normalize()); mtx.compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(r, len, r)); inst.setMatrixAt(i, mtx); });
  group.add(inst);
  // a felt liner on the base and leather handles in the brand plum
  const liner = new THREE.Mesh(new THREE.BoxGeometry(Wd * k - 0.01, 0.006, D * k - 0.01), new THREE.MeshStandardMaterial({ color: 0xe9cfc5, roughness: 0.95 })); liner.position.y = 0.004; group.add(liner);
  const leather = new THREE.MeshPhysicalMaterial({ color: 0x5a2e33, roughness: 0.45, clearcoat: 0.4, sheen: 0.3 });
  // the two straps rest folded out over the long sides
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 8, 32, Math.PI), leather); h.position.set(0, H, s * D / 2); h.rotation.x = s * 1.2; h.scale.set(1, 0.7, 1); group.add(h);
    for (const e of [-1, 1]) { const tab = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.004), leather); tab.position.set(e * 0.1, H - 0.012, s * (D / 2 + 0.004)); group.add(tab); }
  }
  // little brand tag on the front
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), new THREE.MeshStandardMaterial({ color: 0xc9a46a, metalness: 1, roughness: 0.3 })); tag.position.set(0, H * 0.6, D / 2 + 0.004); group.add(tag);

  const slots = [];
  for (const r of [0, 1]) for (const c of [1, 2, 0, 3]) slots.push(new THREE.Vector3(-0.135 + c * 0.09, 0.008, -0.055 + r * 0.11));
  const items = {}; let used = 0;
  const box = new THREE.Box3(), sz = new THREE.Vector3();
  return {
    group,
    makeItem(p) {
      const c = buildProduct(p).root;
      c.traverse(o => { if (o.isMesh) o.castShadow = false; });
      c.updateMatrixWorld(true);
      box.setFromObject(c); box.getSize(sz);
      const holder = new THREE.Group(); holder.add(c);
      // lay tall things down so they fit in the basket
      const tall = sz.y > 0.11;
      if (tall) { c.rotation.z = Math.PI / 2; c.position.set(sz.y / 2, sz.x / 2 * 0 + Math.max(sz.x, sz.z) / 2, 0); }
      holder.userData.fitScale = Math.min(1.35, 0.15 / Math.max(sz.x, sz.y, sz.z, 0.001) * (tall ? 1 : 1.2));
      return holder;
    },
    slotWorld(id) { const idx = items[id] ? items[id].slot : used; const p = slots[idx % slots.length].clone(); p.y += Math.floor(idx / slots.length) * 0.05; return group.localToWorld(p); },
    place(holder, id) {
      const slot = used++;
      const p = slots[slot % slots.length].clone(); p.y += Math.floor(slot / slots.length) * 0.05;
      group.add(holder); holder.position.copy(p);
      holder.scale.setScalar(holder.userData.fitScale);
      holder.rotation.set(0, (slot % 3 - 1) * 0.4, 0);
      items[id] = { obj: holder, slot };
    },
    fill(p) { const h = this.makeItem(p); this.place(h, p.id); },
    remove(id) { if (items[id]) { group.remove(items[id].obj); delete items[id]; } },
    clear() { for (const id in items) group.remove(items[id].obj); for (const id in items) delete items[id]; used = 0; }
  };
}

// ================= mist puffs =================
function makeAir(N) {
  const pos = new Float32Array(N * 3), alpha = new Float32Array(N), size = new Float32Array(N);
  const vel = new Float32Array(N * 3), life = new Float32Array(N), age = new Float32Array(N);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: innerHeight * 0.9 } },
    vertexShader: `attribute float aAlpha; attribute float aSize; uniform float uScale; varying float vA;
      void main(){ vA=aAlpha; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*uScale/max(.1,-mv.z); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.0,d); a*=a; gl_FragColor=vec4(vec3(1.,.97,.95),a*vA); }`
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 5;
  for (let i = 0; i < N; i++) { life[i] = 0; age[i] = 1; pos[i * 3 + 1] = -50; }
  let cursor = 0;
  addEventListener("resize", () => { mat.uniforms.uScale.value = innerHeight * 0.9; });
  return {
    points: pts,
    update(dt, emitters) {
      for (const e of emitters) {
        e.acc += (e.rate || 0) * 40 * dt;
        while (e.acc >= 1) {
          e.acc -= 1;
          const i = cursor; cursor = (cursor + 1) % N;
          pos[i * 3] = e.wp.x + (Math.random() - 0.5) * 0.01; pos[i * 3 + 1] = e.wp.y + (Math.random() - 0.5) * 0.01; pos[i * 3 + 2] = e.wp.z + (Math.random() - 0.5) * 0.01;
          const sp = 0.5 + Math.random() * 0.4;
          vel[i * 3] = e.wd.x * sp + (Math.random() - 0.5) * 0.15; vel[i * 3 + 1] = e.wd.y * sp + (Math.random() - 0.5) * 0.1; vel[i * 3 + 2] = e.wd.z * sp + (Math.random() - 0.5) * 0.15;
          life[i] = 1.8 + Math.random() * 1.4; age[i] = 0; size[i] = 0.03 + Math.random() * 0.03;
        }
      }
      for (let i = 0; i < N; i++) {
        if (age[i] >= life[i]) { alpha[i] = 0; continue; }
        age[i] += dt;
        const k = i * 3;
        vel[k] *= 0.96; vel[k + 1] = vel[k + 1] * 0.96 - 0.01 * dt; vel[k + 2] *= 0.96;
        pos[k] += vel[k] * dt; pos[k + 1] += vel[k + 1] * dt; pos[k + 2] += vel[k + 2] * dt;
        size[i] += dt * 0.09;
        alpha[i] = Math.sin(Math.PI * age[i] / life[i]) * 0.16;
      }
      g.attributes.position.needsUpdate = true; g.attributes.aAlpha.needsUpdate = true; g.attributes.aSize.needsUpdate = true;
    }
  };
}
// dust in the light beams: a few hundred motes drifting slowly through the room
function makeMotes(N) {
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = 0.4 + Math.random() * 3.2; pos[i * 3 + 2] = DIM.back + 1 + Math.random() * (DIM.front - DIM.back - 1.5); seed[i] = Math.random() * 100; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uScale: { value: innerHeight } },
    vertexShader: `attribute float aSeed; uniform float uT; uniform float uScale; varying float vA;
      void main(){ vec3 p=position; p.x+=sin(uT*.11+aSeed)*.25; p.y+=sin(uT*.07+aSeed*1.7)*.18; p.z+=cos(uT*.09+aSeed*.7)*.25;
      vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; float d=-mv.z; gl_PointSize=clamp(.012*uScale/max(.3,d),1.,6.);
      vA=smoothstep(.4,1.5,d)*smoothstep(7.,3.,d)*(.5+.5*sin(uT*.6+aSeed)); }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,.1,d); gl_FragColor=vec4(1.,.92,.8,a*vA*.35); }`
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 6;
  return { points: pts, update(dt, t) { mat.uniforms.uT.value = t; } };
}

// ================= product pictures for the bar =================
function makeCampaign(renderer, env, c) {
  const Wd = 600, Ht = 826;
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 0.55;
  // seamless studio sweep in the campaign colour
  const sweepTex = (() => { const cv = document.createElement("canvas"); cv.width = 8; cv.height = 256; const x = cv.getContext("2d"); const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, c.bg[1]); gr.addColorStop(0.55, c.bg[0]); gr.addColorStop(1, c.bg[0]); x.fillStyle = gr; x.fillRect(0, 0, 8, 256); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ map: sweepTex, roughness: 0.95 })); back.position.set(0, 2.2, -1.2); back.receiveShadow = true; scene.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshStandardMaterial({ color: new THREE.Color(c.bg[0]), roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.position.z = 1.4; floor.receiveShadow = true; scene.add(floor);
  // a lacquered plinth for the hero and a lower step beside it
  const plM = new THREE.MeshPhysicalMaterial({ color: c.plinth, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const pl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.16, 96), plM); pl1.position.set(0.02, 0.08, 0); pl1.castShadow = pl1.receiveShadow = true; scene.add(pl1);
  const pl2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.07, 96), plM); pl2.position.set(-0.2, 0.035, 0.12); pl2.castShadow = pl2.receiveShadow = true; scene.add(pl2);
  const spots = [[0.02, 0.16, 0], [-0.2, 0.07, 0.12], [0.24, 0, 0.14]];
  const sizes = [];
  c.ids.forEach((id, i) => {
    const p = BY_ID[id]; if (!p) return; const o = buildProduct(p).root;
    o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const b = new THREE.Box3().setFromObject(o); const sz = b.getSize(new THREE.Vector3()); sizes.push(sz.y);
    const k = (i === 0 ? 0.3 : 0.2) / Math.max(sz.y, 0.04); o.scale.setScalar(Math.min(k, 4.5));
    o.position.set(spots[i][0], spots[i][1], spots[i][2]); o.rotation.y = i === 0 ? -0.25 : i === 1 ? 0.5 : -0.6; scene.add(o);
  });
  // studio lighting: big soft key from the side, a rim from behind, a little fill
  const key = new THREE.DirectionalLight(0xfff1e4, 3.2); key.position.set(-1.6, 2.2, 1.6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 8; key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 8 }); scene.add(key);
  const rim = new THREE.SpotLight(0xffe2cc, 14, 6, 0.5, 1, 1.5); rim.position.set(1.4, 1.6, -1.0); rim.target.position.set(0, 0.2, 0); scene.add(rim, rim.target);
  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(c.bg[0]), 0.6));
  const cam = new THREE.PerspectiveCamera(24, Wd / Ht, 0.05, 20); cam.position.set(0.12, 0.72, 2.25); cam.lookAt(0.0, 0.3, 0);
  const rt = new THREE.WebGLRenderTarget(Wd, Ht, { samples: 4, type: THREE.FloatType });
  const prevSM = renderer.shadowMap.enabled; renderer.shadowMap.enabled = true;
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
  const fbuf = new Float32Array(Wd * Ht * 4); renderer.readRenderTargetPixels(rt, 0, 0, Wd, Ht, fbuf);
  renderer.setRenderTarget(null); renderer.shadowMap.enabled = prevSM; rt.dispose();
  // ACES filmic + sRGB by hand, as the renderer does on screen
  const buf = new Uint8ClampedArray(Wd * Ht * 4);
  const tm = (v) => { v *= 0.78; const m = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14); const c2 = Math.min(1, Math.max(0, m)); return (c2 <= 0.0031308 ? c2 * 12.92 : 1.055 * Math.pow(c2, 1 / 2.4) - 0.055) * 255; };
  for (let i = 0; i < fbuf.length; i += 4) { buf[i] = tm(fbuf[i]); buf[i + 1] = tm(fbuf[i + 1]); buf[i + 2] = tm(fbuf[i + 2]); buf[i + 3] = 255; }
  // compose the print: photograph plus typography
  const cv = document.createElement("canvas"); cv.width = Wd * 2; cv.height = Ht * 2; const x = cv.getContext("2d");
  const pc = document.createElement("canvas"); pc.width = Wd; pc.height = Ht; const px = pc.getContext("2d"); const img = px.createImageData(Wd, Ht);
  for (let y = 0; y < Ht; y++) img.data.set(buf.subarray((Ht - 1 - y) * Wd * 4, (Ht - y) * Wd * 4), y * Wd * 4);
  px.putImageData(img, 0, 0);
  x.imageSmoothingQuality = "high"; x.drawImage(pc, 0, 0, Wd * 2, Ht * 2);
  const W2 = Wd * 2, H2 = Ht * 2;
  x.fillStyle = c.ink; x.textAlign = "left";
  x.font = `600 22px ${FONT_B}`; x.globalAlpha = 0.9; spaced(x, c.kick, 80, 110, 5, "left"); x.globalAlpha = 1;
  x.font = `500 150px ${FONT_D}`; x.fillText(c.title[0], 74, H2 - 330); x.font = `italic 500 150px ${FONT_D}`; x.fillText(c.title[1], 74, H2 - 180);
  x.font = `500 26px ${FONT_B}`; x.globalAlpha = 0.85; x.fillText(c.line, 80, H2 - 100); x.globalAlpha = 1;
  x.font = `500 34px ${FONT_D}`; x.textAlign = "right"; spaced(x, "SAELLE", W2 - 80, 110, 12, "right");
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function makeThumbs(renderer, list, env) {
  const S = 192, out = {};
  const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 1.0;
  scene.background = new THREE.Color(0xf3e6df);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8c2b8, 1.1));
  const d = new THREE.DirectionalLight(0xfff3e6, 2.2); d.position.set(2, 3, 4); scene.add(d);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: 0xf1e2da, roughness: 0.9 })); scene.add(backdrop);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.01, 50);
  const rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
  const buf = new Uint8Array(S * S * 4);
  const c = document.createElement("canvas"); c.width = c.height = S; const x = c.getContext("2d"); const img = x.createImageData(S, S);
  const box = new THREE.Box3(), size = new THREE.Vector3(), ctr = new THREE.Vector3();
  const prevTM = renderer.toneMapping; const prevOCS = renderer.outputColorSpace;
  // the target holds linear light: tone map and gamma-encode by hand
  const LUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) { const v = (i / 255) * 1.05; const m = (v * (2.51 * v + 0.03)) / (v * (2.43 * v + 0.59) + 0.14); const s = m <= 0.0031308 ? m * 12.92 : 1.055 * Math.pow(m, 1 / 2.4) - 0.055; LUT[i] = Math.max(0, Math.min(255, Math.round(s * 255))); }
  for (const p of list) {
    const o = buildProduct(p).root; scene.add(o); o.updateMatrixWorld(true);
    box.setFromObject(o); box.getSize(size); box.getCenter(ctr);
    const r = Math.max(size.x, size.y, size.z) * 0.6;
    const dist = r / Math.tan(THREE.MathUtils.degToRad(14));
    cam.position.set(ctr.x + dist * 0.25, ctr.y + dist * 0.12, ctr.z + dist * 0.96); cam.lookAt(ctr);
    backdrop.position.copy(ctr).add(new THREE.Vector3(0, 0, -0.3)); backdrop.lookAt(cam.position);
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf);
    for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
    for (let i = 0; i < img.data.length; i += 4) { img.data[i] = LUT[img.data[i]]; img.data[i + 1] = LUT[img.data[i + 1]]; img.data[i + 2] = LUT[img.data[i + 2]]; }
    x.putImageData(img, 0, 0);
    out[p.id] = c.toDataURL("image/jpeg", 0.88);
    scene.remove(o);
  }
  renderer.setRenderTarget(null); renderer.toneMapping = prevTM; renderer.outputColorSpace = prevOCS;
  rt.dispose();
  return out;
}
