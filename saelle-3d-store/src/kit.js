// Shared building blocks: materials, PBR sets, canvas textures and mesh helpers.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const BRAND = {
  ink: "#1E1418", plum: "#3A1F2B", blush: "#E9CFC5", brass: "#C9A46A", porcelain: "#FBF7F4", rose: "#B85C6E", wine: "#5A2E33"
};
export const FONT_D = '"Bodoni Moda", "Didot", "Bodoni 72", Georgia, serif';
export const FONT_B = '"Manrope", "Segoe UI", system-ui, sans-serif';

const BASE = "assets/";
const texLoader = new THREE.TextureLoader();
// every texture is tracked so the store only opens once its surfaces have loaded
let pending = 0; const waiters = [];
const done = () => { pending--; if (pending <= 0) waiters.splice(0).forEach(f => f()); };
export function texturesReady() { return pending <= 0 ? Promise.resolve() : new Promise(r => waiters.push(r)); }
let maxAniso = 8;
export function setAniso(n) { maxAniso = n; }
export const loadingManager = THREE.DefaultLoadingManager;

// ---------- PBR texture sets (Poly Haven, CC0) ----------
const setCache = {};
export function pbrSet(name, rx = 1, ry = rx, { rot = 0 } = {}) {
  const key = name + rx + "x" + ry + rot;
  if (setCache[key]) return setCache[key];
  const load = (suffix, srgb) => {
    pending++;
    const t = texLoader.load(BASE + "tex/" + name + "_" + suffix + ".jpg", done, undefined, done);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry); t.rotation = rot;
    t.anisotropy = maxAniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const arm = load("arm");
  return (setCache[key] = { map: load("diffuse", true), normalMap: load("nor_gl"), roughnessMap: arm, aoMap: arm });
}

// ---------- materials ----------
const M = {};
export function mats() {
  if (M.gold) return M;
  M.gold = new THREE.MeshPhysicalMaterial({ color: 0xe2bd7a, metalness: 1, roughness: 0.16, clearcoat: 0.4, clearcoatRoughness: 0.1 });
  M.brass = new THREE.MeshStandardMaterial({ color: 0xc9a066, metalness: 1, roughness: 0.3 });
  M.brushedBrass = new THREE.MeshStandardMaterial({ color: 0xbf9560, metalness: 1, roughness: 0.42 });
  M.roseGold = new THREE.MeshPhysicalMaterial({ color: 0xe8b4a0, metalness: 1, roughness: 0.2, clearcoat: 0.5 });
  M.chrome = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, metalness: 1, roughness: 0.08 });
  M.bronze = new THREE.MeshStandardMaterial({ color: 0x3a2d24, metalness: 0.85, roughness: 0.38 });
  M.blackLacquer = new THREE.MeshPhysicalMaterial({ color: 0x141012, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.06 });
  M.blackMatte = new THREE.MeshStandardMaterial({ color: 0x18151a, roughness: 0.7 });
  M.ivory = new THREE.MeshPhysicalMaterial({ color: 0xf6efe8, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  M.porcelain = new THREE.MeshPhysicalMaterial({ color: 0xfbf7f4, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  M.blushLacquer = new THREE.MeshPhysicalMaterial({ color: 0xe6c3b8, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.14 });
  M.plumLacquer = new THREE.MeshPhysicalMaterial({ color: 0x3a1f2b, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.1 });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x1a1718, roughness: 0.9 });
  M.mirror = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, metalness: 1, roughness: 0.02 });
  // clear glass for shelves and the shopfront: thin, reflective, slightly green at the edge
  M.shelfGlass = new THREE.MeshPhysicalMaterial({ color: 0xdfeee8, roughness: 0.04, transparent: true, opacity: 0.22, envMapIntensity: 0.8, depthWrite: false });
  M.windowGlass = new THREE.MeshPhysicalMaterial({ color: 0x9fb3b6, roughness: 0.02, metalness: 0.05, transparent: true, opacity: 0.12, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false });
  M.led = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.85, 1.5), toneMapped: false });
  M.ledSoft = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.05, 0.85), toneMapped: false });
  M.opal = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.6, 1.25), toneMapped: false });
  M.shadow = new THREE.MeshBasicMaterial({ alphaMap: blobTexture(), transparent: true, depthWrite: false, opacity: 0.5, color: 0x000000 });
  M.paper = new THREE.MeshStandardMaterial({ color: 0xf3ece4, roughness: 0.85 });
  return M;
}

// gold-ish metal by name, or a coloured lacquer
export function capMat(spec) {
  const m = mats();
  if (spec === "gold") return m.gold;
  if (spec === "rose") return m.roseGold;
  if (spec === "wood") return woodCap();
  return lacquer(spec);
}
const lacCache = {};
export function lacquer(hex, rough = 0.3) {
  const k = hex + rough;
  return lacCache[k] || (lacCache[k] = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness: rough, clearcoat: 0.8, clearcoatRoughness: 0.12 }));
}
export function matte(hex, rough = 0.55) {
  const k = "m" + hex + rough;
  return lacCache[k] || (lacCache[k] = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough }));
}
function woodCap() {
  if (M.woodCap) return M.woodCap;
  const s = pbrSet("american_walnut_veneer", 0.3, 0.3);
  return (M.woodCap = new THREE.MeshPhysicalMaterial({ map: s.map, normalMap: s.normalMap, roughness: 0.35, clearcoat: 0.6, color: 0xd9b48c }));
}

// Glass that holds liquid. The tinted part of the bottle IS the liquid (attenuation),
// so the refraction shows what's behind it through both glass and perfume.
export function liquidGlass(liquidHex, { thickness = 0.04, frost = 0, dist = 0.05, ior = 1.48 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02 + frost, transmission: 1, thickness, ior,
    attenuationColor: new THREE.Color(liquidHex), attenuationDistance: dist,
    specularIntensity: 1, envMapIntensity: 1.25, clearcoat: frost ? 0 : 0.6, clearcoatRoughness: 0.02
  });
}
export function clearGlass(tintHex = "#ffffff", { thickness = 0.01, frost = 0, dist = 0.4 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.015 + frost, transmission: 1, thickness, ior: 1.5,
    attenuationColor: new THREE.Color(tintHex), attenuationDistance: dist, envMapIntensity: 1.3, specularIntensity: 1
  });
}

// ---------- geometry helpers ----------
const rbCache = new Map();
export function rbox(w, h, d, r = 0.02, seg = 3) {
  const k = [w, h, d, r, seg].map(v => v.toFixed(4)).join("|");
  if (!rbCache.has(k)) rbCache.set(k, new RoundedBoxGeometry(w, h, d, seg, Math.max(1e-4, Math.min(r, w / 2, h / 2, d / 2) - 1e-4)));
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
export function cyl(rt, rb, h, mat, x, y, z, parent, seg = 40, open = false) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), mat, x, y, z, parent);
}
export function plane(w, h, mat, x, y, z, parent) {
  const m = mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z, parent);
  m.castShadow = false;
  return m;
}
// lathe from [radius, y] pairs, bottom to top
export function lathe(pts, seg = 48) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg);
}
// a rounded profile: a vertical wall from y0 to y1 at radius r, with fillets of radius f at both ends
export function capsuleProfile(r, y0, y1, fBot, fTop, { closeBottom = true, closeTop = true, steps = 6 } = {}) {
  const p = [];
  if (closeBottom) p.push([0, y0]);
  for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + (i / steps) * Math.PI / 2; p.push([r - fBot + Math.cos(a) * fBot, y0 + fBot + Math.sin(a) * fBot]); }
  for (let i = 0; i <= steps; i++) { const a = (i / steps) * Math.PI / 2; p.push([r - fTop + Math.cos(a) * fTop, y1 - fTop + Math.sin(a) * fTop]); }
  if (closeTop) p.push([0, y1]);
  return p;
}
export function blob(w, d, x, y, z, parent, opacity = 0.5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mats().shadow.clone());
  m.material.opacity = opacity;
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.002, z);
  m.renderOrder = 1;
  if (parent) parent.add(m);
  return m;
}
function blobTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.45, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
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
export function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.closePath(); }
export function fitFont(ctx, text, maxW, size, weight, font) {
  let s = size;
  do { ctx.font = `${weight} ${s}px ${font}`; s -= 1; } while (ctx.measureText(text).width > maxW && s > 6);
  return s + 1;
}
// letter-spaced text (canvas letterSpacing is not everywhere yet)
export function spaced(ctx, text, x, y, track, align = "center") {
  const chars = [...text];
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign; ctx.textAlign = "left";
  chars.forEach((c, i) => { ctx.fillText(c, cx, y); cx += widths[i] + track; });
  ctx.textAlign = prev;
  return total;
}

// The printed label on a product. Wraps around a bottle or sits flat on a box.
const labelCache = {};
export function labelTex(key, { bg = null, fg = BRAND.wine, name, size, w = 512, h = 512, small = "SAELLE", rule = true, big = false }) {
  if (labelCache[key]) return labelCache[key];
  return (labelCache[key] = canvasTex(w, h, (x) => {
    x.clearRect(0, 0, w, h);
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
    x.fillStyle = fg; x.textAlign = "center"; x.textBaseline = "alphabetic";
    const s1 = big ? h * 0.2 : h * 0.13;
    x.font = `500 ${s1}px ${FONT_D}`;
    spaced(x, small, w / 2, h * (big ? 0.42 : 0.33), s1 * 0.32);
    if (rule) { x.globalAlpha = 0.5; x.fillRect(w * 0.38, h * (big ? 0.5 : 0.41), w * 0.24, Math.max(1, h * 0.006)); x.globalAlpha = 1; }
    if (name) {
      const words = name.split(" · ")[0].split(" ");
      const lines = []; let line = "";
      const fs = h * (big ? 0.075 : 0.085);
      x.font = `600 ${fs}px ${FONT_B}`;
      for (const wd of words) { const t = line ? line + " " + wd : wd; if (x.measureText(t.toUpperCase()).width > w * 0.82 && line) { lines.push(line); line = wd; } else line = t; }
      lines.push(line);
      lines.slice(0, 3).forEach((l, i) => spaced(x, l.toUpperCase(), w / 2, h * (big ? 0.6 : 0.53) + i * fs * 1.35, fs * 0.12));
    }
    if (size) { x.globalAlpha = 0.75; x.font = `500 ${h * 0.065}px ${FONT_B}`; x.fillText(size, w / 2, h * 0.88); x.globalAlpha = 1; }
  }));
}

export function emissiveMat(tex, s = 1.6) {
  return new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(s, s, s), toneMapped: false });
}
// soft vertical gradient for the backlit niches
export function gradientTex(top, mid, bottom) {
  return canvasTex(8, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bottom);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
}
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
