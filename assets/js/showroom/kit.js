// Shared building blocks: materials, textures, text panels and small mesh helpers.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const BRAND = {
  navy: "#0E1E4A", ink: "#0A1636", copper: "#E07A35", blue: "#2FB6EE", paper: "#F6F4EF"
};
export const FONT_D = '"Bricolage Grotesque", "Segoe UI", system-ui, sans-serif';
export const FONT_B = '"Instrument Sans", "Segoe UI", system-ui, sans-serif';

const BASE = "assets/showroom/";
const texLoader = new THREE.TextureLoader();
let maxAniso = 8;
export function setAniso(n) { maxAniso = n; }

// ---------- PBR texture sets (Poly Haven, CC0) ----------
const setCache = {};
export function pbrSet(name, repeatX = 1, repeatY = repeatX) {
  const key = name + repeatX + "x" + repeatY;
  if (setCache[key]) return setCache[key];
  const load = (suffix, srgb) => {
    const t = texLoader.load(BASE + "tex/" + name + "_" + suffix + ".jpg");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = maxAniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const arm = load("arm");
  return (setCache[key] = { map: load("diffuse", true), normalMap: load("nor_gl"), roughnessMap: arm, aoMap: arm, metalnessMap: null });
}

// ---------- materials ----------
const M = {};
export function mats() {
  if (M.white) return M;
  M.white = new THREE.MeshPhysicalMaterial({ color: 0xf7f8f9, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.22 });
  M.whiteMatte = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.62 });
  M.offwhite = new THREE.MeshStandardMaterial({ color: 0xe3e6ea, roughness: 0.5 });
  M.grey = new THREE.MeshStandardMaterial({ color: 0xb8bec6, roughness: 0.42, metalness: 0.15 });
  M.panelGrey = new THREE.MeshStandardMaterial({ color: 0xd4d8dd, roughness: 0.38, metalness: 0.25 });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x22272f, roughness: 0.55 });
  M.slot = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.8 });
  M.black = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.75 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.92 });
  M.navy = new THREE.MeshStandardMaterial({ color: BRAND.navy, roughness: 0.48, metalness: 0.05 });
  M.navyGloss = new THREE.MeshPhysicalMaterial({ color: BRAND.navy, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 });
  M.copper = new THREE.MeshStandardMaterial({ color: 0xc8763f, roughness: 0.28, metalness: 1 });
  M.copperDull = new THREE.MeshStandardMaterial({ color: 0xb06a3b, roughness: 0.45, metalness: 0.9 });
  M.steel = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.24, metalness: 1 });
  M.brushed = new THREE.MeshStandardMaterial({ color: 0xbfc5cc, roughness: 0.38, metalness: 1 });
  M.gi = new THREE.MeshStandardMaterial({ color: 0xa9b1ba, roughness: 0.42, metalness: 0.85 });
  M.alu = new THREE.MeshStandardMaterial({ color: 0x2a2f37, roughness: 0.35, metalness: 0.7 });
  M.foil = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.2, metalness: 1 });
  M.nitrile = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.85 });
  M.cardboard = new THREE.MeshStandardMaterial({ color: 0xc19a6b, roughness: 0.9 });
  M.wood = new THREE.MeshStandardMaterial({ color: 0x9a7650, roughness: 0.6 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0xa9bcc8, roughness: 0.03, metalness: 0, transmission: 0, transparent: true, opacity: 0.1, envMapIntensity: 1.3, side: THREE.DoubleSide, depthWrite: false });
  M.glassDark = new THREE.MeshPhysicalMaterial({ color: 0x0c141c, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.35, envMapIntensity: 1.6, depthWrite: false });
  M.screen = new THREE.MeshBasicMaterial({ color: 0x0b1220 });
  M.led = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  M.ledWarm = new THREE.MeshBasicMaterial({ color: 0xfff1dc, toneMapped: false });
  M.ledBlue = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.9, 1.6), toneMapped: false });
  M.ledCopper = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 0.75, 0.3), toneMapped: false });
  M.shadow = new THREE.MeshBasicMaterial({ alphaMap: blobTexture(), transparent: true, depthWrite: false, opacity: 0.55, color: 0x000000 });
  return M;
}

// ---------- geometry helpers ----------
const rbCache = new Map();
export function rbox(w, h, d, r = 0.02, seg = 3) {
  const k = [w, h, d, r, seg].map(v => v.toFixed(3)).join("|");
  if (!rbCache.has(k)) rbCache.set(k, new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) - 1e-4));
  return rbCache.get(k);
}
export function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
export function box(w, h, d, mat, x, y, z, parent, r = 0) {
  return mesh(r > 0 ? rbox(w, h, d, r) : new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
}
export function cyl(rt, rb, h, mat, x, y, z, parent, seg = 32, open = false) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat, x, y, z, parent);
}
export function tube(points, r, mat, parent, seg = 48) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, "catmullrom", 0.2);
  return mesh(new THREE.TubeGeometry(curve, seg, r, 10, false), mat, 0, 0, 0, parent);
}
export function plane(w, h, mat, x, y, z, parent) {
  const m = mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z, parent);
  m.castShadow = false;
  return m;
}
// soft contact shadow under an object
export function blob(w, d, x, y, z, parent, opacity = 0.5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats().shadow.clone());
  m.material.opacity = opacity;
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.003, z);
  m.renderOrder = 1;
  if (parent) parent.add(m);
  return m;
}
function blobTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  // use as alpha: white = shadow strength
  return t;
}

// ---------- canvas textures ----------
export function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.userData.canvas = c; t.userData.draw = draw;
  return t;
}
export function redraw(t, draw) {
  const c = t.userData.canvas, ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  (draw || t.userData.draw)(ctx, c.width, c.height);
  t.needsUpdate = true;
}
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.closePath();
}
export function fitText(ctx, text, maxW, size, weight = 600, font = FONT_D) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${font}`; s -= 2; } while (ctx.measureText(text).width > maxW && s > 10);
  return s + 2;
}

// Images: the logo is an SVG in the repo; drawn into canvases for signs.
const imgCache = {};
export function loadImage(src) {
  if (imgCache[src]) return imgCache[src];
  return (imgCache[src] = new Promise(res => {
    const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
  }));
}

// Signage text panel used on fascias and hanging boards
export function signTexture(w, h, { bg = BRAND.navy, fg = "#fff", num, title, sub, align = "left", rule = true } = {}) {
  return canvasTex(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    // faint top sheen like a printed acrylic panel
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,255,.07)"); g.addColorStop(.5, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.12)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    let cx = h * 0.42;
    if (num) {
      const r = h * 0.3;
      x.fillStyle = BRAND.copper; x.beginPath(); x.arc(cx + r * 0.2, h / 2, r, 0, Math.PI * 2); x.fill();
      x.fillStyle = BRAND.ink; x.font = `700 ${r * 1.0}px ${FONT_D}`; x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(num, cx + r * 0.2, h / 2 + r * 0.04);
      cx += r * 2.0;
    }
    x.textAlign = align === "center" && !num ? "center" : "left"; x.textBaseline = "alphabetic"; x.fillStyle = fg;
    const tx = x.textAlign === "center" ? w / 2 : cx;
    const maxW = w - tx - h * 0.4;
    const ts = fitText(x, title, x.textAlign === "center" ? w * 0.86 : maxW, sub ? h * 0.42 : h * 0.5, 650);
    x.font = `650 ${ts}px ${FONT_D}`;
    x.fillText(title, tx, sub ? h * 0.56 : h * 0.66);
    if (sub) {
      x.globalAlpha = 0.72; x.font = `500 ${h * 0.17}px ${FONT_B}`;
      x.fillText(sub, tx, h * 0.83); x.globalAlpha = 1;
    }
    if (rule) { x.fillStyle = BRAND.copper; x.fillRect(0, h - h * 0.05, w, h * 0.05); }
  });
}

// Shelf-edge tag: the small printed card under every product
export function tagTexture(code, title, line) {
  return canvasTex(512, 168, (x, w, h) => {
    x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
    x.fillStyle = BRAND.navy; x.fillRect(0, 0, 14, h);
    x.fillStyle = BRAND.copper; x.font = `700 26px ${FONT_B}`; x.fillText(code, 40, 46);
    x.fillStyle = BRAND.ink; fitText(x, title, w - 64, 40, 650); x.fillText(title, 40, 98);
    x.fillStyle = "#5B6685"; x.font = `500 24px ${FONT_B}`;
    let l = line; while (x.measureText(l).width > w - 64 && l.length > 4) l = l.slice(0, -2);
    if (l !== line) l = l.trimEnd() + "…";
    x.fillText(l, 40, 140);
  });
}

// Little 7-segment-like display ("24°") on indoor units
export function displayTex(text, color = "#7fdcff") {
  return canvasTex(128, 64, (x, w, h) => {
    x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
    x.fillStyle = color; x.shadowColor = color; x.shadowBlur = 10;
    x.font = `600 42px ${FONT_B}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, w / 2, h / 2 + 2);
  });
}

export function emissiveMat(tex, strength = 1.6) {
  return new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(strength, strength, strength), toneMapped: false });
}

// shared radial fan grille texture (alpha), used in front of spinning blades
export function grilleTexture() {
  if (grilleTexture.t) return grilleTexture.t;
  grilleTexture.t = canvasTex(512, 512, (x, w) => {
    x.clearRect(0, 0, w, w);
    x.strokeStyle = "#fff"; x.lineWidth = 5;
    for (let r = 30; r < 250; r += 22) { x.beginPath(); x.arc(256, 256, r, 0, Math.PI * 2); x.stroke(); }
    x.lineWidth = 7;
    for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; x.beginPath(); x.moveTo(256, 256); x.lineTo(256 + Math.cos(t) * 250, 256 + Math.sin(t) * 250); x.stroke(); }
    x.beginPath(); x.arc(256, 256, 40, 0, Math.PI * 2); x.fillStyle = "#fff"; x.fill();
  }, { srgb: false });
  return grilleTexture.t;
}
export function slatsTexture(n = 12, vertical = false) {
  const key = "s" + n + vertical;
  if (slatsTexture[key]) return slatsTexture[key];
  return (slatsTexture[key] = canvasTex(256, 256, (x, w) => {
    x.clearRect(0, 0, w, w); x.fillStyle = "#fff";
    const step = w / n;
    for (let i = 0; i < n; i++) vertical ? x.fillRect(i * step + step * 0.2, 0, step * 0.42, w) : x.fillRect(0, i * step + step * 0.2, w, step * 0.42);
  }, { srgb: false }));
}
