// Procedural product models. Every builder works in "face space":
// x runs along the display, y is up from the floor, +z points out into the aisle.
// Each returns { root, hot, tag, emit, spin, door? }.
import * as THREE from "three";
import { mats, box, cyl, tube, mesh, plane, rbox, blob, canvasTex, displayTex, emissiveMat,
         grilleTexture, slatsTexture, FONT_B, FONT_D, BRAND, roundRect } from "./kit.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PLINTH = 0.14;

let A = {}; // loaded glTF templates
export function setModels(a) { A = a; }

// ---------- shared parts ----------
function fanAssembly(r, parent, x, y, z, { facing = "z", grille = true, blades = 3, color } = {}) {
  const M = mats();
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  if (facing === "y") g.rotation.x = -Math.PI / 2;
  // shroud ring
  const ring = mesh(new THREE.TorusGeometry(r, r * 0.08, 10, 48), M.dark, 0, 0, 0, g);
  ring.castShadow = false;
  // dark cavity
  const cav = mesh(new THREE.CircleGeometry(r * 0.98, 40), M.black, 0, 0, -r * 0.25, g);
  cav.castShadow = false;
  // blades
  const spin = new THREE.Group(); spin.position.z = -r * 0.1; g.add(spin);
  const bladeMat = color ? new THREE.MeshStandardMaterial({ color, roughness: 0.5 }) : M.dark;
  const bladeGeo = new THREE.SphereGeometry(1, 16, 8);
  for (let i = 0; i < blades; i++) {
    const b = new THREE.Mesh(bladeGeo, bladeMat);
    b.scale.set(r * 0.46, r * 0.2, r * 0.03);
    const a = (i / blades) * Math.PI * 2;
    b.position.set(Math.cos(a) * r * 0.48, Math.sin(a) * r * 0.48, 0);
    b.rotation.z = a; b.rotation.x = 0.35;
    spin.add(b);
  }
  cyl(r * 0.16, r * 0.16, r * 0.18, M.dark, 0, 0, 0, spin).rotation.x = Math.PI / 2;
  if (grille) {
    const gm = new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.4, metalness: 0.6, alphaMap: grilleTexture(), transparent: true, alphaTest: 0.35 });
    const gp = mesh(new THREE.CircleGeometry(r * 1.02, 48), gm, 0, 0, r * 0.06, g); gp.castShadow = false;
  }
  return { group: g, spin };
}

function tag(root, code, p, x, y, z = 0.012, w = 0.52) {
  const t = plane(w, w * 168 / 512, new THREE.MeshStandardMaterial({ map: tagTex(code, p), roughness: 0.5 }), x, y, z, root);
  t.receiveShadow = false;
  return t;
}
const tagCache = {};
function tagTex(code, p) {
  if (tagCache[p.id]) return tagCache[p.id];
  return (tagCache[p.id] = canvasTex(512, 168, (x, w, h) => {
    x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
    x.fillStyle = BRAND.navy; x.fillRect(0, 0, 14, h);
    x.fillStyle = BRAND.copper; x.font = `700 24px ${FONT_B}`; x.fillText(code, 38, 44);
    x.fillStyle = BRAND.ink; let s = 40; do { x.font = `650 ${s}px ${FONT_D}`; s -= 2; } while (x.measureText(p.name).width > w - 60);
    x.fillText(p.name, 38, 96);
    x.fillStyle = "#5B6685"; x.font = `500 23px ${FONT_B}`;
    x.fillText(p.specs[0][0] + ": " + p.specs[0][1], 38, 140);
  }));
}

function outdoorUnit(parent, x, y, z, w = 0.82, rot = 0) {
  // Poly Haven "exterior_aircon_unit" (CC0) when loaded, else a procedural stand-in
  if (A.acUnit) {
    const u = A.acUnit.clone(true);
    const s = w / A.acUnitSize.x;
    u.scale.setScalar(s);
    u.position.set(x, y, z);
    u.rotation.y = rot;
    u.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    parent.add(u);
    return { obj: u, h: A.acUnitSize.y * s, d: A.acUnitSize.z * s };
  }
  const M = mats();
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const h = w * 0.68, d = w * 0.36;
  box(w, h, d, M.offwhite, 0, h / 2, 0, g, 0.02);
  fanAssembly(h * 0.36, g, -w * 0.14, h / 2, d / 2 + 0.01);
  return { obj: g, h, d };
}

function copperRun(root, pts, insulated = true) {
  const M = mats();
  tube(pts.map(p => [p[0], p[1], p[2]]), insulated ? 0.024 : 0.009, insulated ? M.nitrile : M.copper, root, 64);
  if (insulated) tube(pts.map(p => [p[0] + 0.035, p[1], p[2]]), 0.009, M.copper, root, 64);
}

// ---------- builders ----------
const B = {};

B.split = (p) => {
  const M = mats(), root = new THREE.Group(), w = p.w || 0.9;
  const y = p.face === "vrf" ? 2.0 : 2.05, z = 0.14;
  // indoor unit: glossy shell, front seam, curved outlet, louver, display
  const unit = new THREE.Group(); unit.position.set(0, y, z); root.add(unit);
  box(w, 0.3, 0.23, M.white, 0, 0, 0, unit, 0.06);
  box(w * 0.97, 0.006, 0.01, M.offwhite, 0, 0.055, 0.116, unit);
  box(w * 0.88, 0.055, 0.07, M.slot, 0, -0.105, 0.08, unit, 0.02);
  const flap = box(w * 0.86, 0.012, 0.09, M.whiteMatte, 0, -0.14, 0.13, unit, 0.005); flap.rotation.x = 0.55;
  for (let i = -3; i <= 3; i++) box(0.004, 0.04, 0.05, M.dark, i * w * 0.11, -0.105, 0.1, unit);
  plane(0.075, 0.034, emissiveMat(displayTex(p.warm ? "28°" : "24°", p.warm ? "#ffb070" : "#7fdcff"), 1.4), w * 0.32, 0.02, 0.1155, unit);
  box(0.12, 0.004, 0.002, M.copper, -w * 0.34, 0.02, 0.1158, unit);
  blob(w + 0.3, 0.5, 0, 0.12, 0.1, root, 0.12).rotation.x = 0; // faint shadow on the panel
  root.children[root.children.length - 1].position.set(0, y - 0.22, 0.004);
  // outdoor unit on the plinth below, with copper running up the panel
  const out = outdoorUnit(root, w * 0.05, PLINTH, 0.3, Math.min(0.86, w * 0.92));
  const px = w / 2 - 0.08;
  copperRun(root, [[px, y - 0.12, 0.05], [px + 0.06, y - 0.4, 0.04], [px + 0.06, PLINTH + out.h + 0.12, 0.04], [px - 0.05, PLINTH + out.h * 0.8, 0.2]]);
  tube([[-w / 2 + 0.06, y - 0.12, 0.05], [-w / 2 + 0.02, y - 0.5, 0.03], [-w / 2 + 0.02, 0.4, 0.03]], 0.008, M.whiteMatte, root);
  tag(root, (p.face === "vrf" ? "02" : "01") + " · " + (p.tr ? p.tr + " TR" : "VRF"), p, -w / 2 + 0.2, 1.48);
  return { root, hot: V(0, y, 0.3), emit: [{ p: V(0, y - 0.14, 0.2), d: V(0, -0.55, 1), k: p.warm ? "warm" : "cool", w }, { p: V(w * 0.05, PLINTH + out.h * 0.5, 0.3 + out.d / 2 + 0.05), d: V(0, 0.1, 1), k: "warm", w: 0.4, rate: 0.5 }] };
};

B.window = (p) => {
  const M = mats(), root = new THREE.Group(), y = 1.35;
  // wall cut-out frame
  box(0.86, 0.6, 0.06, M.offwhite, 0, y, 0.03, root, 0.01);
  const u = new THREE.Group(); u.position.set(0, y, 0.1); root.add(u);
  box(0.7, 0.46, 0.34, M.white, 0, 0, 0, u, 0.03);
  // front grille: horizontal slats in a darker frame
  const fm = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.5, alphaMap: slatsTexture(16), transparent: true, alphaTest: 0.4 });
  box(0.48, 0.34, 0.01, M.dark, -0.07, 0.01, 0.168, u);
  plane(0.48, 0.34, fm, -0.07, 0.01, 0.176, u);
  box(0.14, 0.34, 0.012, M.offwhite, 0.25, 0.01, 0.172, u, 0.01);
  plane(0.06, 0.028, emissiveMat(displayTex("24°")), 0.25, 0.1, 0.18, u);
  for (let i = 0; i < 3; i++) cyl(0.012, 0.012, 0.01, M.dark, 0.25, -0.02 - i * 0.05, 0.18, u, 16).rotation.x = Math.PI / 2;
  tag(root, "01 · 1.5 TR", p, 0, 0.88);
  return { root, hot: V(0, y, 0.35), emit: [{ p: V(-0.07, y, 0.3), d: V(0, -0.2, 1), k: "cool", w: 0.45 }] };
};

function canopy(root, w, d, y) {
  const M = mats();
  const tex = canvasTex(512, 512, (x, s) => {
    x.fillStyle = "#f3f4f5"; x.fillRect(0, 0, s, s);
    x.strokeStyle = "#c9cdd2"; x.lineWidth = 6;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * s / 4, 0); x.lineTo(i * s / 4, s); x.stroke(); x.beginPath(); x.moveTo(0, i * s / 4); x.lineTo(s, i * s / 4); x.stroke(); }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / 2.4, d / 2.4);
  const c = box(w, 0.05, d, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), 0, y + 0.025, d / 2, root);
  box(w, 0.08, 0.04, M.navy, 0, y + 0.04, d, root);
  for (const sx of [-1, 1]) cyl(0.008, 0.008, 2.6 - y - 0.05, M.steel, sx * (w / 2 - 0.1), (y + 2.6) / 2 + 0.03, d - 0.1, root, 8);
  return c;
}

B.cassette = (p) => {
  const M = mats(), root = new THREE.Group(), y = 2.45;
  canopy(root, 1.7, 1.25, y);
  const u = new THREE.Group(); u.position.set(0, y - 0.025, 0.66); root.add(u);
  box(0.95, 0.045, 0.95, M.white, 0, 0, 0, u, 0.02);
  // center return grille
  const gm = new THREE.MeshStandardMaterial({ color: 0xf2f3f4, roughness: 0.55, alphaMap: slatsTexture(18), transparent: true, alphaTest: 0.4 });
  box(0.5, 0.004, 0.5, M.offwhite, 0, -0.024, 0, u);
  const gp = plane(0.5, 0.5, gm, 0, -0.027, 0, u); gp.rotation.x = Math.PI / 2;
  // four slots with louvers
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2, s = new THREE.Group(); s.rotation.y = a; u.add(s);
    box(0.56, 0.01, 0.07, M.slot, 0, -0.022, 0.36, s, 0.01);
    const l = box(0.54, 0.008, 0.06, M.whiteMatte, 0, -0.035, 0.37, s); l.rotation.x = -0.6;
  }
  tag(root, "01 · CASSETTE", p, 0, 1.55);
  const emit = [];
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; emit.push({ p: V(Math.sin(a) * 0.38, y - 0.08, 0.66 + Math.cos(a) * 0.38), d: V(Math.sin(a) * 0.6, -1, Math.cos(a) * 0.6), k: "cool", w: 0.45 }); }
  return { root, hot: V(0, y - 0.1, 0.66), emit };
};

B.cassette1 = (p) => {
  const M = mats(), root = new THREE.Group(), y = 2.45;
  canopy(root, 1.5, 1.0, y);
  const u = new THREE.Group(); u.position.set(0, y - 0.025, 0.5); root.add(u);
  box(1.05, 0.04, 0.42, M.white, 0, 0, 0, u, 0.02);
  box(0.92, 0.01, 0.07, M.slot, 0, -0.02, 0.1, u, 0.01);
  const l = box(0.9, 0.008, 0.07, M.whiteMatte, 0, -0.033, 0.12, u); l.rotation.x = -0.6;
  const gm = new THREE.MeshStandardMaterial({ color: 0xf2f3f4, roughness: 0.55, alphaMap: slatsTexture(14, true), transparent: true, alphaTest: 0.4 });
  const gp = plane(0.9, 0.18, gm, 0, -0.022, -0.08, u); gp.rotation.x = Math.PI / 2;
  tag(root, "01 · CASSETTE", p, 0, 1.55);
  return { root, hot: V(0, y - 0.1, 0.5), emit: [{ p: V(0, y - 0.08, 0.66), d: V(0, -1, 0.7), k: "cool", w: 0.8 }] };
};

B.ductable = (p) => {
  const M = mats(), root = new THREE.Group();
  // steel stand
  for (const sx of [-0.5, 0.5]) for (const sz of [0.12, 0.62]) box(0.03, 1.0, 0.03, M.alu, sx, PLINTH + 0.5, sz, root);
  const body = new THREE.Group(); body.position.set(0, PLINTH + 1.15, 0.37); root.add(body);
  box(1.12, 0.3, 0.62, M.panelGrey, 0, 0, 0, body, 0.012);
  box(1.0, 0.24, 0.02, M.dark, 0, 0, 0.315, body);          // supply opening
  plane(0.98, 0.22, new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.4, alphaMap: slatsTexture(10, true), transparent: true, alphaTest: 0.4 }), 0, 0, 0.327, body);
  box(0.26, 0.12, 0.004, new THREE.MeshStandardMaterial({ map: plateTex("DUCTABLE", "R410A"), roughness: 0.5 }), 0.32, 0.05, -0.31, body).rotation.y = Math.PI;
  // flexible foil duct up to a ceiling diffuser on a canopy
  canopy(root, 1.4, 1.1, 2.45);
  tube([[0, PLINTH + 1.3, 0.55], [0, 1.9, 0.7], [0.05, 2.3, 0.62], [0, 2.43, 0.6]], 0.1, M.foil, root, 40);
  const d = new THREE.Group(); d.position.set(0, 2.43, 0.6); root.add(d);
  box(0.5, 0.02, 0.5, M.white, 0, 0, 0, d, 0.01);
  for (let i = 1; i <= 3; i++) { const s = 0.46 - i * 0.1; const r = box(s, 0.025, s, M.whiteMatte, 0, -0.012 - i * 0.006, 0, d, 0.004); }
  blob(1.3, 0.8, 0, 0, 0.37, root, 0.45);
  tag(root, "01 · 3–17 TR", p, 0, 0.62, 0.012);
  return { root, hot: V(0, PLINTH + 1.15, 0.6), emit: [{ p: V(0, 2.38, 0.6), d: V(0, -1, 0.4), k: "cool", w: 0.5 }] };
};

B.tower = (p) => {
  const M = mats(), root = new THREE.Group(), h = 1.82;
  const u = new THREE.Group(); u.position.set(0, PLINTH, 0.32); root.add(u);
  box(0.44, h, 0.36, M.white, 0, h / 2, 0, u, 0.1);
  box(0.16, 1.05, 0.03, M.slot, 0, h * 0.62, 0.17, u, 0.06);
  for (let i = 0; i < 9; i++) box(0.006, 1.0, 0.04, M.whiteMatte, -0.064 + i * 0.016, h * 0.62, 0.18, u);
  plane(0.09, 0.04, emissiveMat(displayTex("22°")), 0, h * 0.32, 0.182, u);
  box(0.44, 0.04, 0.36, M.dark, 0, 0.02, 0, u, 0.01);
  blob(0.9, 0.8, 0, PLINTH, 0.32, root, 0.55);
  tag(root, "01 · 2–4 TR", p, 0.55, 1.2);
  return { root, hot: V(0, PLINTH + h * 0.6, 0.5), emit: [{ p: V(0, PLINTH + h * 0.62, 0.55), d: V(0, 0.05, 1), k: "cool", w: 0.12, h: 1.0 }] };
};

B.floorceil = (p) => {
  const M = mats(), root = new THREE.Group(), y = 2.0;
  const u = new THREE.Group(); u.position.set(0, y, 0.34); root.add(u);
  box(1.28, 0.24, 0.66, M.white, 0, 0, 0, u, 0.06);
  box(1.12, 0.05, 0.02, M.slot, 0, -0.04, 0.33, u, 0.02);
  const l = box(1.1, 0.01, 0.07, M.whiteMatte, 0, -0.08, 0.35, u); l.rotation.x = 0.5;
  for (const sx of [-0.5, 0.5]) box(0.04, 0.08, 0.66, M.offwhite, sx, 0.14, 0, u);
  plane(0.08, 0.035, emissiveMat(displayTex("23°")), 0.5, 0.05, 0.331, u);
  tag(root, "01 · 2–5 TR", p, 0, 1.45);
  return { root, hot: V(0, y, 0.6), emit: [{ p: V(0, y - 0.06, 0.7), d: V(0, -0.3, 1), k: "cool", w: 1.0 }] };
};

B.vrf = (p) => {
  const M = mats(), root = new THREE.Group(), w = 1.3, h = 1.72, d = 0.78;
  const u = new THREE.Group(); u.position.set(0, PLINTH + 0.08, 0.46); root.add(u);
  // base frame
  box(w, 0.08, d, M.dark, 0, -0.04, 0, u);
  box(w, h, d, M.offwhite, 0, h / 2, 0, u, 0.03);
  // front: louvered heat-exchanger panels and a service panel
  const lm = new THREE.MeshStandardMaterial({ color: 0x8b939c, roughness: 0.5, metalness: 0.6, alphaMap: slatsTexture(30), transparent: true, alphaTest: 0.4 });
  for (const sx of [-0.3, 0.3]) { box(0.55, h * 0.72, 0.01, M.black, sx, h * 0.42, d / 2 + 0.002, u); plane(0.55, h * 0.72, lm, sx, h * 0.42, d / 2 + 0.008, u); }
  box(w * 0.96, h * 0.18, 0.012, M.white, 0, h * 0.89, d / 2 + 0.004, u, 0.006);
  box(0.3, 0.14, 0.004, new THREE.MeshStandardMaterial({ map: plateTex("VRF  16 HP", "R410A · 3φ"), roughness: 0.5 }), 0, h * 0.89, d / 2 + 0.012, u);
  // top discharge fans in shrouds
  const fans = [];
  for (const sx of [-0.3, 0.3]) {
    cyl(0.27, 0.29, 0.12, M.offwhite, sx, h + 0.06, 0, u, 40, true);
    const f = fanAssembly(0.26, u, sx, h + 0.1, 0, { facing: "y", blades: 4 });
    fans.push({ obj: f.spin, speed: 9 });
  }
  blob(1.8, 1.2, 0, PLINTH, 0.46, root, 0.6);
  // copper headers running into the panel
  copperRun(root, [[0.66, PLINTH + 0.4, 0.4], [0.8, PLINTH + 0.4, 0.2], [0.9, PLINTH + 0.6, 0.05], [0.9, 2.3, 0.05]]);
  tag(root, "02 · VRF", p, -0.95, 1.2, 0.012, 0.5);
  return { root, hot: V(0, PLINTH + 1.0, 0.9), spin: fans, emit: [-0.3, 0.3].map(sx => ({ p: V(sx, PLINTH + h + 0.25, 0.46), d: V(0, 1, 0.05), k: "warm", w: 0.4, rate: 0.6 })) };
};

B.slimduct = (p) => {
  const M = mats(), root = new THREE.Group(), y = 2.25;
  for (const sx of [-0.45, 0.45]) for (const sz of [0.12, 0.6]) cyl(0.006, 0.006, 2.62 - y, M.steel, sx, (2.62 + y) / 2, sz, root, 6);
  const u = new THREE.Group(); u.position.set(0, y, 0.36); root.add(u);
  box(1.0, 0.2, 0.56, M.panelGrey, 0, 0, 0, u, 0.01);
  box(0.26, 0.11, 0.004, new THREE.MeshStandardMaterial({ map: plateTex("SLIM DUCT", "VRF indoor"), roughness: 0.5 }), 0.25, 0, 0.281, u);
  // short rectangular plenum down to a linear slot diffuser
  box(0.9, 0.18, 0.2, M.gi, 0, -0.18, 0.2, u);
  const sd = box(1.0, 0.03, 0.22, M.white, 0, -0.28, 0.2, u, 0.008);
  for (let i = 0; i < 3; i++) box(0.94, 0.006, 0.025, M.slot, 0, -0.296, 0.14 + i * 0.06, u);
  tag(root, "02 · SLIM", p, 0, 1.4);
  return { root, hot: V(0, y, 0.6), emit: [{ p: V(0, y - 0.3, 0.56), d: V(0, -1, 0.3), k: "cool", w: 0.9 }] };
};

B.refnet = (p) => {
  const M = mats(), root = new THREE.Group();
  box(1.35, 1.05, 0.03, M.whiteMatte, 0, 1.55, 0.03, root, 0.01);
  // a little piping tree: header splitting to three branches
  const y0 = 1.95;
  copperRun(root, [[-0.55, y0, 0.08], [0.0, y0, 0.08], [0.25, y0, 0.08]], false);
  for (const [bx, by] of [[-0.3, 1.25], [0.05, 1.2], [0.4, 1.25]]) {
    tube([[bx, y0, 0.08], [bx, (y0 + by) / 2, 0.09], [bx + 0.02, by, 0.08]], 0.011, M.copper, root, 20);
    box(0.09, 0.05, 0.05, M.copperDull, bx, y0, 0.08, root, 0.01); // Y joint
  }
  // insulated sample beside it
  tube([[-0.58, 1.2, 0.09], [-0.58, 1.9, 0.09]], 0.028, M.nitrile, root, 12);
  tag(root, "02 · PIPING", p, 0, 0.88);
  return { root, hot: V(0, 1.6, 0.2), emit: [] };
};

B.controller = (p) => {
  const M = mats(), root = new THREE.Group();
  cyl(0.18, 0.2, 0.02, M.alu, 0, PLINTH + 0.01, 0.4, root);
  cyl(0.022, 0.022, 1.05, M.brushed, 0, PLINTH + 0.53, 0.4, root, 16);
  const t = new THREE.Group(); t.position.set(0, PLINTH + 1.12, 0.42); t.rotation.x = -0.45; root.add(t);
  box(0.42, 0.3, 0.02, M.black, 0, 0, 0, t, 0.015);
  const scr = canvasTex(640, 448, (x, w, h) => {
    x.fillStyle = "#0b1426"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#fff"; x.font = `600 30px ${FONT_D}`; x.fillText("Building zones", 34, 54);
    x.fillStyle = "#8fa0c6"; x.font = `500 20px ${FONT_B}`; x.fillText("12 units · 4 floors", 34, 84);
    const zones = [["Reception", "23°", 1], ["Cabin 1", "24°", 1], ["Cabin 2", "—", 0], ["Meeting", "22°", 1], ["Pantry", "25°", 1], ["Server", "20°", 1]];
    zones.forEach((z, i) => {
      const cx = 34 + (i % 3) * 196, cy = 110 + Math.floor(i / 3) * 150;
      x.fillStyle = z[2] ? "#13254a" : "#141b2b"; roundRect(x, cx, cy, 180, 132, 14); x.fill();
      x.fillStyle = z[2] ? "#2FB6EE" : "#56607a"; x.beginPath(); x.arc(cx + 22, cy + 26, 7, 0, 7); x.fill();
      x.fillStyle = "#cfd8ee"; x.font = `500 20px ${FONT_B}`; x.fillText(z[0], cx + 38, cy + 33);
      x.fillStyle = "#fff"; x.font = `600 46px ${FONT_D}`; x.fillText(z[1], cx + 18, cy + 104);
    });
  });
  plane(0.39, 0.27, emissiveMat(scr, 1.15), 0, 0, 0.0105, t);
  blob(0.5, 0.5, 0, PLINTH, 0.4, root, 0.4);
  tag(root, "02 · CONTROL", p, 0, 1.75, 0.012, 0.48);
  return { root, hot: V(0, PLINTH + 1.1, 0.5), emit: [] };
};

B.exhaust = (p) => {
  const M = mats(), root = new THREE.Group(), y = 1.85;
  const g = new THREE.Group(); g.position.set(0, y, 0.07); root.add(g);
  box(0.5, 0.5, 0.12, M.white, 0, 0, 0, g, 0.03);
  const f = fanAssembly(0.19, g, 0, 0, 0.065, { blades: 5, color: 0xe8eaed });
  box(0.36, 0.36, 0.08, M.white, 0.55, -0.6, -0.02, g, 0.02); // smaller one
  const f2 = fanAssembly(0.13, g, 0.55, -0.6, 0.025, { blades: 5, color: 0xe8eaed });
  tag(root, "02 · EXHAUST", p, -0.05, 1.2);
  return { root, hot: V(0.2, y - 0.2, 0.25), spin: [{ obj: f.spin, speed: 14 }, { obj: f2.spin, speed: 16 }], emit: [] };
};

B.inline = (p) => {
  const M = mats(), root = new THREE.Group(), y = 2.05;
  const g = new THREE.Group(); g.position.set(0, y, 0.34); g.rotation.z = Math.PI / 2; root.add(g);
  cyl(0.17, 0.17, 0.48, M.dark, 0, 0, 0, g, 40);
  for (const s of [-1, 1]) { cyl(0.11, 0.11, 0.12, M.gi, 0, s * 0.3, 0, g, 28); mesh(new THREE.TorusGeometry(0.17, 0.012, 8, 40), M.gi, 0, s * 0.24, 0, g).rotation.x = Math.PI / 2; }
  box(0.08, 0.1, 0.06, M.navy, 0.17, 0, 0, g, 0.01); // terminal box
  for (const sx of [-0.18, 0.18]) box(0.03, 0.34, 0.03, M.alu, sx, y + 0.22, 0.34, root);
  // flexible ducts into the panel
  tube([[0.36, y, 0.34], [0.6, y, 0.3], [0.75, y + 0.1, 0.12], [0.78, y + 0.2, 0.02]], 0.1, M.foil, root, 40);
  tube([[-0.36, y, 0.34], [-0.6, y, 0.3], [-0.75, y - 0.1, 0.12], [-0.78, y - 0.2, 0.02]], 0.1, M.foil, root, 40);
  tag(root, "02 · INLINE", p, 0, 1.35);
  return { root, hot: V(0, y, 0.5), emit: [] };
};

B.hood = (p) => {
  const M = mats(), root = new THREE.Group(), y = 1.95;
  const g = new THREE.Group(); g.position.set(0, y, 0); root.add(g);
  box(1.6, 0.08, 0.82, M.brushed, 0, 0, 0.41, g, 0.01);
  // sloped canopy (square frustum stretched)
  const fr = mesh(new THREE.CylinderGeometry(0.28, 0.8, 0.42, 4, 1, true), M.brushed, 0, 0.25, 0.41, g);
  fr.rotation.y = Math.PI / 4; fr.scale.set(1.41, 1, 0.73);
  box(0.36, 0.5, 0.36, M.brushed, 0, 0.66, 0.3, g);
  // baffle filters seen from below/front
  for (let i = -2; i <= 2; i++) box(0.26, 0.012, 0.3, M.steel, i * 0.29, -0.045, 0.45, g).rotation.x = 0.4;
  // steel counter below
  const t = new THREE.Group(); t.position.set(0, 0, 0.42); root.add(t);
  box(1.5, 0.04, 0.72, M.brushed, 0, 0.9, 0, t, 0.006);
  box(1.44, 0.03, 0.66, M.steel, 0, 0.3, 0, t);
  for (const sx of [-0.7, 0.7]) for (const sz of [-0.32, 0.32]) cyl(0.02, 0.02, 0.88, M.steel, sx, 0.45, sz, t, 12);
  cyl(0.16, 0.18, 0.05, M.black, -0.35, 0.945, 0, t); cyl(0.16, 0.18, 0.05, M.black, 0.35, 0.945, 0, t);
  cyl(0.16, 0.14, 0.18, M.steel, 0.35, 1.06, 0, t, 32, true); // a pot
  blob(1.8, 1.0, 0, 0, 0.42, root, 0.5);
  tag(root, "02 · KITCHEN", p, -0.58, 1.32, 0.012, 0.46);
  return { root, hot: V(0, y, 0.6), emit: [{ p: V(0.35, 1.16, 0.42), d: V(0, 1, 0), k: "mist", w: 0.12, rate: 0.7 }] };
};

B.erv = (p) => {
  const M = mats(), root = new THREE.Group();
  const g = new THREE.Group(); g.position.set(0, PLINTH + 0.5, 0.4); root.add(g);
  box(1.0, 0.42, 0.66, M.white, 0, 0, 0, g, 0.015);
  box(0.3, 0.14, 0.004, new THREE.MeshStandardMaterial({ map: plateTex("ERV  800", "heat recovery"), roughness: 0.5 }), 0.25, 0.08, 0.331, g);
  for (const [sx, sz] of [[-0.5, -0.18], [-0.5, 0.18], [0.5, -0.18], [0.5, 0.18]]) cyl(0.08, 0.08, 0.1, M.gi, sx + Math.sign(sx) * 0.05, 0, sz, g, 24).rotation.z = Math.PI / 2;
  for (const sx of [-0.4, 0.4]) box(0.04, 0.5, 0.5, M.alu, sx, PLINTH + 0.03 + 0.21 - 0.25 + 0.25, 0.4, root);
  tube([[-0.6, PLINTH + 0.5, 0.22], [-0.75, PLINTH + 0.9, 0.12], [-0.75, 1.6, 0.04]], 0.075, M.foil, root, 30);
  tube([[0.6, PLINTH + 0.5, 0.22], [0.75, PLINTH + 0.9, 0.12], [0.75, 1.6, 0.04]], 0.075, M.foil, root, 30);
  blob(1.4, 1.0, 0, PLINTH, 0.4, root, 0.5);
  tag(root, "02 · FRESH AIR", p, 0, 1.35);
  return { root, hot: V(0, PLINTH + 0.6, 0.7), emit: [] };
};

B.axial = (p) => {
  const M = mats(), root = new THREE.Group(), y = 1.5;
  const g = new THREE.Group(); g.position.set(0, y, 0.2); root.add(g);
  const casing = cyl(0.42, 0.42, 0.34, M.gi, 0, 0, 0, g, 48, true); casing.rotation.x = Math.PI / 2; casing.material = M.gi;
  mesh(new THREE.TorusGeometry(0.43, 0.025, 8, 48), M.gi, 0, 0, 0.17, g);
  mesh(new THREE.TorusGeometry(0.43, 0.025, 8, 48), M.gi, 0, 0, -0.17, g);
  const f = fanAssembly(0.4, g, 0, 0, 0.05, { blades: 6, color: 0x6f7881, grille: true });
  for (const sx of [-0.35, 0.35]) box(0.05, 0.5, 0.05, M.alu, sx, y - 0.5, 0.2, root);
  tag(root, "02 · AXIAL", p, 0, 0.62);
  return { root, hot: V(0, y, 0.45), spin: [{ obj: f.spin, speed: 7 }], emit: [] };
};

function gltfPart(name, size, parent, x, y, z, ry = 0, rz = 0) {
  const t = A.parts && A.parts[name];
  if (!t) return null;
  const o = t.clone(true);
  const b = new THREE.Box3().setFromObject(o), s = new THREE.Vector3(); b.getSize(s);
  const k = size / Math.max(s.x, s.y, s.z);
  o.scale.setScalar(k);
  o.position.set(x, y, z); o.rotation.set(0, ry, rz);
  o.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  parent.add(o);
  return o;
}

B.giduct = (p) => {
  const M = mats(), root = new THREE.Group();
  const ok = gltfPart("modular_airduct_rectangular_01_single_01", 1.2, root, -0.2, 2.05, 0.32, 0, 0) &&
             gltfPart("modular_airduct_rectangular_01_bend_01", 0.75, root, 0.62, 1.75, 0.32, 0, 0);
  if (!ok) {
    const g = new THREE.Group(); g.position.set(0, 2.0, 0.32); root.add(g);
    box(1.6, 0.36, 0.46, M.gi, 0, 0, 0, g);
    for (let i = -2; i <= 2; i++) box(0.04, 0.42, 0.52, M.gi, i * 0.38, 0, 0, g);
  }
  gltfPart("modular_airduct_rectangular_01_vent_01", 0.6, root, -0.3, 1.2, 0.2, 0, 0);
  tag(root, "03 · GI DUCT", p, -0.55, 0.62);
  return { root, hot: V(0, 1.8, 0.4), emit: [] };
};

B.spiral = (p) => {
  const M = mats(), root = new THREE.Group();
  const ok = gltfPart("modular_airduct_circular_smooth_single", 1.4, root, 0, 2.15, 0.3, 0, Math.PI / 2) &&
             gltfPart("modular_airduct_circular_smooth_bend_quater", 0.6, root, 0.7, 1.75, 0.3, 0, 0);
  if (!ok) { const c = cyl(0.2, 0.2, 1.4, M.gi, 0, 2.1, 0.3, root, 40); c.rotation.z = Math.PI / 2; }
  gltfPart("modular_airduct_circular_fan", 0.55, root, -0.35, 1.3, 0.3, 0, 0);
  tag(root, "03 · SPIRAL", p, 0.1, 0.62);
  return { root, hot: V(0, 1.9, 0.4), emit: [] };
};

B.grilles = (p) => {
  const M = mats(), root = new THREE.Group();
  box(1.5, 1.15, 0.025, M.navy, 0, 1.6, 0.0125, root, 0.01);
  const sq = new THREE.Group(); sq.position.set(-0.4, 1.85, 0.03); root.add(sq);
  box(0.42, 0.42, 0.02, M.white, 0, 0, 0, sq, 0.006);
  for (let i = 1; i <= 3; i++) { const s = 0.4 - i * 0.09; box(s, s, 0.02 + i * 0.008, M.whiteMatte, 0, 0, 0.01, sq, 0.003); }
  const rd = new THREE.Group(); rd.position.set(0.35, 1.85, 0.03); root.add(rd);
  for (let i = 0; i < 4; i++) cyl(0.2 - i * 0.04, 0.2 - i * 0.04, 0.02 + i * 0.01, i % 2 ? M.offwhite : M.white, 0, 0, 0.01, rd, 40).rotation.x = Math.PI / 2;
  const sl = new THREE.Group(); sl.position.set(0, 1.3, 0.03); root.add(sl);
  box(1.2, 0.16, 0.02, M.white, 0, 0, 0, sl, 0.005);
  for (let i = 0; i < 4; i++) box(1.14, 0.018, 0.025, M.slot, 0, -0.05 + i * 0.033, 0.002, sl);
  tag(root, "03 · GRILLES", p, 0, 0.85);
  return { root, hot: V(0, 1.6, 0.15), emit: [] };
};

B.insulation = (p) => {
  const M = mats(), root = new THREE.Group();
  const rollMat = [M.nitrile, M.nitrile, M.foil];
  [[-0.32, 0.18], [0.32, 0.18], [0, 0.52]].forEach(([x, y], i) => {
    const r = cyl(0.2, 0.2, 0.9, rollMat[i], x, PLINTH + y, 0.45, root, 40); r.rotation.z = Math.PI / 2;
    const core = cyl(0.06, 0.06, 0.91, M.cardboard, x, PLINTH + y, 0.45, root, 20); core.rotation.z = Math.PI / 2;
  });
  // pipe insulation tubes in a bin
  box(0.4, 0.5, 0.3, M.dark, 0.75, PLINTH + 0.25, 0.3, root, 0.01);
  for (let i = 0; i < 7; i++) cyl(0.025, 0.025, 1.1, M.nitrile, 0.62 + (i % 4) * 0.08, PLINTH + 0.6, 0.22 + Math.floor(i / 4) * 0.12, root, 12).rotation.z = (i - 3) * 0.03;
  blob(1.6, 1.0, 0.2, PLINTH, 0.4, root, 0.5);
  tag(root, "03 · INSULATION", p, 0, 1.5);
  return { root, hot: V(0, PLINTH + 0.5, 0.7), emit: [] };
};

B.damper = (p) => {
  const M = mats(), root = new THREE.Group();
  const g = new THREE.Group(); g.position.set(0, 1.35, 0.25); root.add(g);
  box(0.62, 0.05, 0.22, M.gi, 0, 0.25, 0, g); box(0.62, 0.05, 0.22, M.gi, 0, -0.25, 0, g);
  box(0.05, 0.55, 0.22, M.gi, -0.3, 0, 0, g); box(0.05, 0.55, 0.22, M.gi, 0.3, 0, 0, g);
  for (let i = 0; i < 5; i++) box(0.56, 0.008, 0.1, M.brushed, 0, -0.18 + i * 0.09, 0, g).rotation.x = 0.5;
  box(0.1, 0.16, 0.08, M.navy, 0.38, 0.05, 0, g, 0.01);
  box(0.05, 0.05, 0.02, M.copper, 0.38, 0.08, 0.045, g);
  for (const sx of [-0.2, 0.2]) box(0.03, 1.0, 0.03, M.alu, sx, PLINTH + 0.5, 0.25, root);
  tag(root, "03 · DAMPERS", p, 0, 1.92);
  return { root, hot: V(0, 1.35, 0.4), emit: [] };
};

B.coldroom = (p) => {
  const M = mats(), root = new THREE.Group(), W = 3.0, H = 2.6, D = 0.22;
  const pm = new THREE.MeshStandardMaterial({ color: 0xf1f3f4, roughness: 0.42, metalness: 0.15 });
  box(W, H, D, pm, 0, H / 2, D / 2, root);
  for (let i = 1; i < 5; i++) box(0.008, H, 0.004, M.grey, -W / 2 + i * W / 5, H / 2, D + 0.002, root);
  box(W + 0.04, 0.12, D + 0.04, M.brushed, 0, 0.06, D / 2, root); // kick plate
  // door frame + leaf, hinged on the left
  const dx = -0.4, dw = 1.0, dh = 2.05;
  box(dw + 0.12, dh + 0.08, 0.02, M.brushed, dx, dh / 2 + 0.06, D + 0.01, root);
  // dark inside + strip curtain, visible when the door opens
  box(dw - 0.02, dh - 0.02, 0.01, new THREE.MeshBasicMaterial({ color: 0x9fc4dc }), dx, dh / 2 + 0.06, D + 0.012, root);
  const stripMat = new THREE.MeshPhysicalMaterial({ color: 0xdff0ff, transparent: true, opacity: 0.45, roughness: 0.15 });
  for (let i = 0; i < 6; i++) box(0.17, dh - 0.12, 0.004, stripMat, dx - dw / 2 + 0.09 + i * 0.165, dh / 2 + 0.05, D + 0.03, root);
  const hinge = new THREE.Group(); hinge.position.set(dx - dw / 2, 0.06, D + 0.07); root.add(hinge);
  const leaf = box(dw, dh, 0.09, pm, dw / 2, dh / 2, 0, hinge, 0.012);
  box(0.05, 0.36, 0.06, M.steel, dw - 0.12, dh * 0.5, 0.07, hinge, 0.02);
  box(0.16, 0.05, 0.05, M.steel, dw - 0.12, dh * 0.5 + 0.18, 0.06, hinge, 0.01);
  for (const hy of [0.3, dh - 0.3]) box(0.08, 0.14, 0.05, M.steel, 0.02, hy, 0.05, hinge, 0.01);
  // temperature readout above the door
  const t = canvasTex(256, 96, (x, w, h) => { x.fillStyle = "#050a10"; x.fillRect(0, 0, w, h); x.fillStyle = "#7fdcff"; x.shadowColor = "#7fdcff"; x.shadowBlur = 12; x.font = `600 58px ${FONT_B}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("−18.0°C", w / 2, h / 2 + 3); });
  box(0.38, 0.16, 0.05, M.dark, dx, dh + 0.25, D + 0.025, root, 0.01);
  plane(0.32, 0.12, emissiveMat(t, 1.3), dx, dh + 0.25, D + 0.052, root);
  // frost line along the bottom
  const frost = canvasTex(512, 64, (x, w, h) => { const g = x.createLinearGradient(0, h, 0, 0); g.addColorStop(0, "rgba(235,248,255,.9)"); g.addColorStop(1, "rgba(235,248,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  plane(W, 0.35, new THREE.MeshBasicMaterial({ map: frost, transparent: true, depthWrite: false }), 0, 0.3, D + 0.003, root);
  tag(root, "03 · COLD ROOM", p, 0.85, 1.55, D + 0.004);
  return { root, hot: V(dx, 1.3, D + 0.4), door: hinge,
           emit: [{ p: V(dx, 0.25, D + 0.25), d: V(0, -0.15, 1), k: "mist", w: 0.9, rate: 0, door: true }] };
};

B.condensing = (p) => {
  const M = mats(), root = new THREE.Group();
  const g = new THREE.Group(); g.position.set(0, PLINTH + 0.1, 0.36); root.add(g);
  box(1.0, 0.72, 0.46, M.panelGrey, 0, 0.36, 0, g, 0.015);
  const f = fanAssembly(0.25, g, -0.18, 0.38, 0.235, { blades: 4 });
  box(0.3, 0.6, 0.01, M.dark, 0.3, 0.36, 0.232, g);
  box(0.26, 0.11, 0.004, new THREE.MeshStandardMaterial({ map: plateTex("COND. UNIT", "R404A · 3φ"), roughness: 0.5 }), 0.3, 0.5, 0.238, g);
  for (const sx of [-0.4, 0.4]) box(0.05, 0.1, 0.46, M.dark, sx, -0.05, 0.36, root);
  copperRun(root, [[0.5, PLINTH + 0.4, 0.3], [0.62, PLINTH + 0.5, 0.15], [0.62, 2.2, 0.05]]);
  blob(1.4, 0.9, 0, PLINTH, 0.36, root, 0.55);
  tag(root, "03 · CONDENSING", p, -0.1, 1.45);
  return { root, hot: V(0, PLINTH + 0.45, 0.65), spin: [{ obj: f.spin, speed: 11 }], emit: [{ p: V(-0.18, PLINTH + 0.48, 0.7), d: V(0, 0.15, 1), k: "warm", w: 0.4, rate: 0.5 }] };
};

B.evaporator = (p) => {
  const M = mats(), root = new THREE.Group(), y = 2.1;
  const g = new THREE.Group(); g.position.set(0, y, 0.26); root.add(g);
  box(1.15, 0.36, 0.48, M.white, 0, 0, 0, g, 0.02);
  const fans = [];
  for (const sx of [-0.28, 0.28]) { const f = fanAssembly(0.13, g, sx, -0.01, 0.245, { blades: 4 }); fans.push({ obj: f.spin, speed: 13 }); }
  const fin = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.4, alphaMap: slatsTexture(40, true), transparent: true, alphaTest: 0.4 });
  const pb = plane(1.05, 0.4, fin, 0, -0.181, 0, g); pb.rotation.x = Math.PI / 2;
  tag(root, "03 · EVAPORATOR", p, 0, 1.4);
  return { root, hot: V(0, y, 0.5), spin: fans, emit: [-0.28, 0.28].map(sx => ({ p: V(sx, y, 0.56), d: V(0, -0.3, 1), k: "cool", w: 0.25 })) };
};

B.thermo = (p) => {
  const M = mats(), root = new THREE.Group();
  box(0.48, 0.6, 0.18, M.panelGrey, 0, 1.6, 0.09, root, 0.01);
  box(0.2, 0.12, 0.02, M.black, 0, 1.72, 0.185, root, 0.008);
  plane(0.16, 0.07, emissiveMat(displayTex("−18.0", "#ff6b4a"), 1.4), 0, 1.72, 0.196, root);
  for (let i = 0; i < 3; i++) cyl(0.014, 0.014, 0.012, M.dark, -0.05 + i * 0.05, 1.62, 0.19, root, 12).rotation.x = Math.PI / 2;
  const lamp = cyl(0.03, 0.03, 0.03, M.ledCopper, 0.16, 1.82, 0.19, root, 16); lamp.rotation.x = Math.PI / 2;
  tube([[0, 1.3, 0.1], [0, 0.6, 0.08], [0.1, 0.3, 0.05]], 0.012, M.dark, root, 16);
  tag(root, "03 · CONTROL", p, 0, 1.05);
  return { root, hot: V(0, 1.6, 0.35), emit: [], blink: lamp };
};

function plateTex(a, b) {
  return canvasTex(256, 110, (x, w, h) => {
    x.fillStyle = "#e8eaed"; x.fillRect(0, 0, w, h);
    x.fillStyle = BRAND.navy; x.fillRect(0, 0, w, 30);
    x.fillStyle = "#fff"; x.font = `700 18px ${FONT_B}`; x.fillText("SHAIKH'S SPHERE", 10, 21);
    x.fillStyle = "#222"; x.font = `700 24px ${FONT_B}`; x.fillText(a, 10, 64);
    x.fillStyle = "#555"; x.font = `500 18px ${FONT_B}`; x.fillText(b, 10, 94);
  });
}

export function buildProduct(p) {
  const f = B[p.kind];
  if (!f) return null;
  const out = f(p);
  out.root.name = "product:" + p.id;
  out.spin = out.spin || [];
  return out;
}
