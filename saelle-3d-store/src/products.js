// Procedural product models at real-world size (metres). Origin = bottom centre, front = +z.
import * as THREE from "three";
import { mats, lacquer, matte, capMat, liquidGlass, clearGlass, rbox, mesh, cyl, lathe, capsuleProfile, labelTex, canvasTex, BRAND, FONT_D, FONT_B, spaced } from "./kit.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const labelMats = {};
function printMat(key, opts) {
  // ink printed straight onto glass or plastic: transparent except the type
  return labelMats[key] || (labelMats[key] = new THREE.MeshStandardMaterial({ map: labelTex(key, opts), transparent: true, roughness: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
}
function paperMat(key, opts) {
  return labelMats["p" + key] || (labelMats["p" + key] = new THREE.MeshStandardMaterial({ map: labelTex("p" + key, opts), roughness: 0.7 }));
}
// a label that wraps part of the way round a cylinder, centred on +z
function wrapLabel(r, h, y, arc, mat, parent, seg = 24) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, true, -arc / 2, arc);
  const m = mesh(g, mat, 0, y, 0, parent); m.castShadow = false; m.renderOrder = 2;
  return m;
}
function flatLabel(w, h, x, y, z, mat, parent) {
  const m = mesh(new THREE.PlaneGeometry(w, h), mat, x, y, z, parent); m.castShadow = false; m.renderOrder = 2;
  return m;
}
const sizeOf = (o) => { const b = new THREE.Box3().setFromObject(o); const s = new THREE.Vector3(); b.getSize(s); return s; };

export const B = {
  dropper(p) {
    const L = p.look, g = new THREE.Group();
    const r = 0.0175, H = 0.072;
    const glass = liquidGlass(L.liquid, { thickness: 0.03, dist: L.glass.startsWith("#b") || L.glass.startsWith("#7") ? 0.012 : 0.06 });
    glass.color.set(L.glass).lerp(new THREE.Color(1, 1, 1), 0.55);
    const body = mesh(lathe([...capsuleProfile(r, 0, H, 0.003, 0.01, { closeTop: false }), [0.0068, H + 0.002], [0.0072, H + 0.012], [0, H + 0.012]]), glass, 0, 0, 0, g);
    body.castShadow = true;
    // the pipette inside, visible through the glass
    mesh(new THREE.CylinderGeometry(0.0022, 0.0016, 0.07, 10), clearGlass("#ffffff", { thickness: 0.002 }), 0, H - 0.026, 0, g).castShadow = false;
    cyl(0.0092, 0.0092, 0.013, capMat(L.collar || "gold"), 0, H + 0.0125, 0, g);
    cyl(0.0098, 0.0098, 0.0015, capMat(L.collar || "gold"), 0, H + 0.0062, 0, g);
    mesh(lathe(capsuleProfile(0.0076, H + 0.019, H + 0.05, 0.002, 0.0072)), lacquer(L.cap, 0.38), 0, 0, 0, g);
    wrapLabel(r + 0.0004, 0.036, 0.033, 1.9, printMat("d" + p.id, { name: p.name, size: p.size, fg: L.glass.startsWith("#b") || L.glass.startsWith("#7") ? "#f6e8d8" : BRAND.wine, w: 384, h: 384 }), g);
    return { root: g, hot: V(0, H * 0.7, r), h: H + 0.05, w: r * 2, d: r * 2 };
  },
  jar(p) {
    const L = p.look, g = new THREE.Group(), s = L.small ? 0.62 : 1;
    const r = 0.031 * s, H = 0.036 * s;
    const glass = clearGlass(L.glass, { thickness: 0.012, frost: 0.32, dist: 0.05 });
    glass.color.set(L.glass).lerp(new THREE.Color(1, 1, 1), 0.4);
    mesh(lathe([[0, 0], [r - 0.004, 0], [r, 0.004], [r, H - 0.002], [r - 0.004, H]]), glass, 0, 0, 0, g);
    mesh(lathe([[0, 0.006 * s], [r - 0.005, 0.006 * s], [r - 0.005, H - 0.004], [r * 0.5, H + 0.001], [0, H + 0.003]]), new THREE.MeshPhysicalMaterial({ color: L.cream, roughness: 0.4, sheen: 0.5, sheenColor: new THREE.Color("#ffffff") }), 0, 0, 0, g).castShadow = false;
    mesh(lathe([[r * 0.96, H - 0.001], [r + 0.0012, H], [r + 0.0012, H + 0.016 * s], [r - 0.002, H + 0.0175 * s], [0, H + 0.0178 * s]]), capMat(L.lid), 0, 0, 0, g);
    wrapLabel(r + 0.0004, H * 0.42, H * 0.48, 1.5, printMat("j" + p.id, { name: L.small ? null : p.name, size: null, fg: BRAND.wine, w: 512, h: 256, rule: false }), g);
    return { root: g, hot: V(0, H, r), h: H + 0.018 * s, w: r * 2, d: r * 2 };
  },
  toner(p) {
    const L = p.look, g = new THREE.Group();
    const r = 0.023, H = 0.13;
    const glass = liquidGlass(L.liquid, { thickness: 0.04, dist: 0.09 });
    mesh(lathe([...capsuleProfile(r, 0, H, 0.004, 0.016, { closeTop: false }), [0.009, H + 0.002], [0.0095, H + 0.012], [0, H + 0.012]]), glass, 0, 0, 0, g);
    mesh(lathe(capsuleProfile(0.0118, H + 0.006, H + 0.036, 0.0015, 0.003)), lacquer(L.cap, 0.35), 0, 0, 0, g);
    wrapLabel(r + 0.0005, 0.06, 0.052, 1.7, paperMat("t" + p.id, { name: p.name, size: p.size, bg: "#f7f1ea", fg: BRAND.wine, w: 384, h: 448 }), g);
    return { root: g, hot: V(0, H * 0.6, r), h: H + 0.036, w: r * 2, d: r * 2 };
  },
  pump(p) {
    const L = p.look, g = new THREE.Group();
    const r = 0.025, H = 0.13;
    mesh(lathe([...capsuleProfile(r, 0, H, 0.004, 0.012, { closeTop: false }), [0.0105, H + 0.003], [0, H + 0.003]]), lacquer(L.body, 0.28), 0, 0, 0, g);
    cyl(0.0118, 0.0118, 0.012, lacquer(L.pump, 0.3), 0, H + 0.008, 0, g);
    cyl(0.004, 0.004, 0.022, lacquer(L.pump, 0.3), 0, H + 0.024, 0, g);
    const head = mesh(rbox(0.022, 0.011, 0.016, 0.004), lacquer(L.pump, 0.3), 0, H + 0.038, 0, g);
    const noz = mesh(new THREE.CylinderGeometry(0.0028, 0.0032, 0.022, 12), lacquer(L.pump, 0.3), 0, H + 0.038, 0.016, g); noz.rotation.x = Math.PI / 2;
    wrapLabel(r + 0.0004, 0.07, 0.06, 1.8, printMat("pu" + p.id, { name: p.name, size: p.size, fg: L.text, w: 384, h: 448 }), g);
    return { root: g, hot: V(0, H * 0.6, r), h: H + 0.044, w: r * 2, d: r * 2 };
  },
  tube(p) {
    const L = p.look, g = new THREE.Group();
    const r = 0.017, c = 0.022, H = 0.13;
    cyl(0.0135, 0.0135, c, capMat(L.cap), 0, c / 2, 0, g, 32);
    const geo = new THREE.CylinderGeometry(r, r * 0.8, H, 40, 24, false);
    squeeze(geo, H);
    mesh(geo, lacquer(L.body, 0.32), 0, c + H / 2, 0, g);
    const lg = new THREE.CylinderGeometry(r + 0.0005, r * 0.8 + 0.0005, H, 24, 24, true, -0.9, 1.8);
    squeeze(lg, H);
    const lab = mesh(lg, printMat("tu" + p.id, { name: p.name, size: p.size, fg: L.text, w: 640, h: 220 }), 0, c + H / 2, 0, g);
    lab.castShadow = false; lab.renderOrder = 2;
    // type runs along the tube, like a real one
    lab.material.map.center.set(0.5, 0.5); lab.material.map.rotation = Math.PI / 2;
    return { root: g, hot: V(0, c + H * 0.5, r), h: c + H, w: r * 2.4, d: r * 2 };
  },
  perfumeSquare(p, k = 1) { return perfume(p, { w: 0.062, h: 0.072, d: 0.04, rad: 0.004, base: 0.012, cap: "cube" }); },
  perfumeTall(p) { return perfume(p, { w: 0.052, h: 0.125, d: 0.036, rad: 0.003, base: 0.014, cap: "cyl" }); },
  perfumeSmall(p) { return perfume(p, { w: 0.044, h: 0.052, d: 0.03, rad: 0.004, base: 0.01, cap: "cube" }); },
  perfumeRound(p) {
    const L = p.look, g = new THREE.Group(), R = 0.038;
    const pts = []; for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI; pts.push([Math.cos(a) * R * (i < 2 ? 0.92 : 1), R + Math.sin(a) * R * 0.92]); }
    pts[0] = [0, R - R * 0.92]; pts.push([0.0062, R * 1.92 + 0.002], [0.0062, R * 1.92 + 0.008], [0, R * 1.92 + 0.008]);
    const body = mesh(lathe(pts, 56), liquidGlass(L.liquid, { thickness: 0.06, dist: 0.08 }), 0, 0, 0, g);
    body.position.y = -(R - R * 0.92);
    const top = R * 1.92 - (R - R * 0.92);
    cyl(0.0085, 0.0085, 0.008, capMat(L.cap), 0, top + 0.006, 0, g);
    mesh(new THREE.SphereGeometry(0.019, 40, 24), capMat(L.cap), 0, top + 0.026, 0, g);
    flatLabel(0.03, 0.012, 0, R * 0.95, R * 0.93, printMat("pr" + p.id, { name: null, size: null, small: "SAELLE", fg: "#5a2e33", w: 512, h: 160, rule: false, big: true }), g);
    return { root: g, hot: V(0, R, R), h: top + 0.045, w: R * 2, d: R * 2 };
  },
  perfumeCyl(p) {
    const L = p.look, g = new THREE.Group(), r = 0.026, H = 0.1;
    mesh(lathe([[0, 0], [r - 0.002, 0], [r, 0.003], [r, H - 0.003], [r - 0.004, H], [0.0065, H + 0.002], [0.0065, H + 0.008], [0, H + 0.008]], 56), liquidGlass(L.liquid, { thickness: 0.05, dist: 0.1 }), 0, 0, 0, g);
    cyl(0.0095, 0.0095, 0.006, mats().brass, 0, H + 0.006, 0, g);
    cyl(0.021, 0.021, 0.04, capMat(L.cap), 0, H + 0.028, 0, g);
    wrapLabel(r + 0.0004, 0.03, H * 0.5, 1.2, printMat("pc" + p.id, { name: p.name, size: p.size, fg: "#2e3a26", w: 384, h: 384 }), g);
    return { root: g, hot: V(0, H * 0.6, r), h: H + 0.048, w: r * 2, d: r * 2 };
  },
  mist(p) {
    const L = p.look, g = new THREE.Group(), r = 0.019, H = 0.15;
    mesh(lathe([...capsuleProfile(r, 0, H, 0.003, 0.006, { closeTop: false }), [0.006, H + 0.002], [0, H + 0.002]], 48), liquidGlass(L.liquid, { thickness: 0.035, dist: 0.12 }), 0, 0, 0, g);
    cyl(0.0105, 0.0105, 0.012, mats().gold, 0, H + 0.008, 0, g);
    mesh(lathe(capsuleProfile(0.0195, H + 0.002, H + 0.05, 0.001, 0.004)), clearGlass("#ffffff", { thickness: 0.003, frost: 0.05 }), 0, 0, 0, g).castShadow = false;
    wrapLabel(r + 0.0004, 0.05, H * 0.45, 1.6, printMat("mi" + p.id, { name: p.name, size: p.size, fg: BRAND.wine, w: 384, h: 512 }), g);
    return { root: g, hot: V(0, H * 0.6, r), h: H + 0.05, w: r * 2, d: r * 2 };
  },
  lipstick(p) {
    const L = p.look, g = new THREE.Group(), M = mats();
    const r = 0.0098;
    cyl(r, r, 0.046, M.blackLacquer, 0, 0.023, 0, g, 32);
    cyl(r + 0.0003, r + 0.0003, 0.006, M.gold, 0, 0.049, 0, g, 32);
    cyl(0.0082, 0.0082, 0.014, M.gold, 0, 0.059, 0, g, 32);
    // the bullet, cut at an angle
    const bg = new THREE.CylinderGeometry(0.0068, 0.0068, 0.024, 32, 6);
    const pos = bg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0.006) { const zz = pos.getZ(i); pos.setY(i, Math.min(y, 0.012 - (zz + 0.0068) * 0.75)); }
    }
    bg.computeVertexNormals();
    mesh(bg, new THREE.MeshPhysicalMaterial({ color: L.shade, roughness: L.satin ? 0.28 : 0.55, sheen: 0.6, sheenColor: new THREE.Color(L.shade).lerp(new THREE.Color(1, 1, 1), 0.4), clearcoat: L.satin ? 0.5 : 0 }), 0, 0.075, 0, g);
    // its cap, lying beside it
    const cap = new THREE.Group(); g.add(cap);
    cyl(r + 0.0006, r + 0.0006, 0.046, M.blackLacquer, 0, 0, 0, cap, 32);
    cyl(r + 0.0008, r + 0.0008, 0.004, M.gold, 0, -0.021, 0, cap, 32);
    cap.rotation.z = Math.PI / 2; cap.rotation.y = 0.5; cap.position.set(0.024, r + 0.0006, -0.004);
    return { root: g, hot: V(0, 0.07, r), h: 0.087, w: 0.05, d: r * 2 };
  },
  gloss(p) {
    const L = p.look, g = new THREE.Group(), M = mats();
    mesh(lathe([...capsuleProfile(0.0085, 0, 0.07, 0.002, 0.002, { closeTop: false }), [0.0042, 0.071], [0, 0.071]], 32), liquidGlass(L.liquid, { thickness: 0.016, dist: 0.012 }), 0, 0, 0, g);
    cyl(0.0088, 0.0088, 0.05, M.blackLacquer, 0, 0.097, 0, g, 32);
    cyl(0.009, 0.009, 0.004, M.gold, 0, 0.073, 0, g, 32);
    wrapLabel(0.0089, 0.035, 0.035, 1.4, printMat("gl" + p.id, { name: null, size: null, small: "SAELLE", fg: "#fff", w: 512, h: 128, rule: false, big: true }), g);
    return { root: g, hot: V(0, 0.06, 0.009), h: 0.122, w: 0.018, d: 0.018 };
  },
  foundation(p) {
    const L = p.look, g = new THREE.Group();
    const w = 0.044, h = 0.09, d = 0.03;
    mesh(rbox(w, h, d, 0.004), liquidGlass(L.liquid, { thickness: 0.03, dist: 0.006 }), 0, h / 2, 0, g);
    cyl(0.0085, 0.0085, 0.012, mats().gold, 0, h + 0.006, 0, g, 32);
    mesh(rbox(0.024, 0.03, 0.024, 0.003), lacquer(L.cap, 0.25), 0, h + 0.027, 0, g);
    flatLabel(w * 0.8, h * 0.5, 0, h * 0.5, d / 2 + 0.0004, printMat("fo" + p.id, { name: p.name, size: p.size, fg: "#fff", w: 384, h: 448 }), g);
    return { root: g, hot: V(0, h * 0.65, d / 2), h: h + 0.042, w, d };
  },
  palette(p) {
    const L = p.look, g = new THREE.Group(), M = mats();
    const tilt = new THREE.Group(); g.add(tilt);
    const W = 0.13, D = 0.1, T = 0.011;
    mesh(rbox(W, T, D, 0.004), lacquer(L.shell, 0.3), 0, T / 2, 0, tilt);
    L.pans.forEach((c, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const shimmer = i % 3 === 1;
      mesh(new THREE.CylinderGeometry(0.0118, 0.0118, 0.0035, 28), new THREE.MeshPhysicalMaterial({ color: c, roughness: shimmer ? 0.35 : 0.9, metalness: shimmer ? 0.55 : 0, sheen: shimmer ? 0 : 0.4 }), -0.045 + col * 0.03, T + 0.0005, -0.03 + row * 0.03, tilt);
    });
    const lid = new THREE.Group(); lid.position.set(0, T, -D / 2); tilt.add(lid);
    mesh(rbox(W, 0.007, D, 0.003), lacquer(L.shell, 0.3), 0, 0.0035, D / 2, lid);
    const mir = mesh(new THREE.PlaneGeometry(W - 0.014, D - 0.014), M.mirror, 0, -0.0003, D / 2, lid); mir.rotation.x = Math.PI / 2;
    const top = flatLabel(W * 0.6, 0.02, 0, 0.0072, D / 2, printMat("pa" + p.id, { name: null, size: null, small: "SAELLE", fg: "#d9b77c", w: 512, h: 128, rule: false, big: true }), lid); top.rotation.x = -Math.PI / 2;
    lid.rotation.x = -1.95;
    tilt.rotation.x = -0.9; tilt.position.set(0, 0.012, 0.03);
    // little acrylic easel
    const st = mesh(rbox(0.08, 0.05, 0.004, 0.001), clearGlass("#ffffff", { thickness: 0.004 }), 0, 0.025, -0.035, g); st.rotation.x = -0.5; st.castShadow = false;
    return { root: g, hot: V(0, 0.06, 0.04), h: 0.12, w: W, d: 0.08 };
  },
  compact(p) {
    const L = p.look, g = new THREE.Group(), M = mats();
    const tilt = new THREE.Group(); g.add(tilt);
    const r = 0.032;
    cyl(r, r, 0.011, lacquer(L.shell, 0.25), 0, 0.0055, 0, tilt, 48);
    cyl(r - 0.004, r - 0.004, 0.002, new THREE.MeshPhysicalMaterial({ color: L.pan, roughness: 0.85, sheen: 0.6, sheenColor: new THREE.Color("#ffe3dc") }), 0, 0.011, 0, tilt, 48);
    cyl(r + 0.0004, r + 0.0004, 0.002, M.gold, 0, 0.0115, 0, tilt, 48);
    const lid = new THREE.Group(); lid.position.set(0, 0.012, -r); tilt.add(lid);
    const lm = cyl(r, r, 0.006, lacquer(L.shell, 0.25), 0, 0.003, r, lid, 48);
    const mir = mesh(new THREE.CircleGeometry(r - 0.004, 40), M.mirror, 0, -0.0002, r, lid); mir.rotation.x = Math.PI / 2;
    lid.rotation.x = -1.9;
    tilt.rotation.x = -0.75; tilt.position.set(0, 0.02, 0.02);
    const st = mesh(rbox(0.05, 0.04, 0.004, 0.001), clearGlass("#ffffff", { thickness: 0.004 }), 0, 0.02, -0.02, g); st.rotation.x = -0.5; st.castShadow = false;
    return { root: g, hot: V(0, 0.05, 0.03), h: 0.08, w: r * 2, d: 0.06 };
  },
  mascara(p) {
    const L = p.look, g = new THREE.Group(), M = mats();
    const r = 0.0085;
    mesh(lathe(capsuleProfile(r, 0, 0.07, 0.003, 0.0005, { closeTop: true })), lacquer(L.body, 0.22), 0, 0, 0, g);
    cyl(r + 0.0003, r + 0.0003, 0.004, M.gold, 0, 0.072, 0, g, 32);
    mesh(lathe(capsuleProfile(r, 0.074, 0.13, 0.0005, 0.003)), capMat(L.cap), 0, 0, 0, g);
    wrapLabel(r + 0.0003, 0.045, 0.036, 1.2, printMat("ma" + p.id, { name: null, size: null, small: "SAELLE", fg: "#d9b77c", w: 512, h: 96, rule: false, big: true }), g);
    return { root: g, hot: V(0, 0.08, r), h: 0.13, w: r * 2, d: r * 2 };
  },
  oil(p) {
    const L = p.look, g = new THREE.Group();
    const r = 0.025, H = 0.11;
    const glass = liquidGlass(L.liquid, { thickness: 0.04, dist: 0.015 });
    glass.color.set(L.glass).lerp(new THREE.Color(1, 1, 1), 0.6);
    mesh(lathe([...capsuleProfile(r, 0, H, 0.003, 0.015, { closeTop: false }), [0.009, H + 0.003], [0.0095, H + 0.012], [0, H + 0.012]]), glass, 0, 0, 0, g);
    mesh(lathe(capsuleProfile(0.0125, H + 0.004, H + 0.03, 0.001, 0.002)), capMat(L.cap), 0, 0, 0, g);
    wrapLabel(r + 0.0005, 0.05, 0.048, 1.8, paperMat("oi" + p.id, { name: p.name, size: p.size, bg: "#f3e7d6", fg: "#3b2412", w: 384, h: 384 }), g);
    return { root: g, hot: V(0, H * 0.6, r), h: H + 0.03, w: r * 2, d: r * 2 };
  },
  bottle(p) {
    const L = p.look, g = new THREE.Group();
    const r = 0.033, H = 0.17;
    const bodyGeo = lathe(capsuleProfile(r, 0, H, 0.008, 0.02, { closeTop: true }), 48); bodyGeo.scale(1, 1, 0.62);
    mesh(bodyGeo, lacquer(L.body, 0.36), 0, 0, 0, g);
    const capGeo = lathe(capsuleProfile(0.021, H - 0.004, H + 0.022, 0.002, 0.006), 40); capGeo.scale(1, 1, 0.75);
    mesh(capGeo, lacquer(L.cap, 0.3), 0, 0, 0, g);
    flatLabel(0.05, 0.1, 0, H * 0.45, r * 0.62 + 0.0012, printMat("bo" + p.id, { name: p.name, size: p.size, fg: L.text, w: 256, h: 512 }), g);
    return { root: g, hot: V(0, H * 0.6, r * 0.62), h: H + 0.022, w: r * 2, d: r * 1.3 };
  },
  tub(p) {
    const L = p.look, g = new THREE.Group();
    const r = 0.043, H = 0.05;
    mesh(lathe(capsuleProfile(r, 0, H, 0.004, 0.001, { closeTop: true }), 56), lacquer(L.body, 0.32), 0, 0, 0, g);
    mesh(lathe(capsuleProfile(r + 0.0015, H - 0.004, H + 0.02, 0.001, 0.004), 56), capMat(L.lid), 0, 0, 0, g);
    wrapLabel(r + 0.0005, H * 0.6, H * 0.45, 1.6, printMat("tb" + p.id, { name: p.name, size: null, fg: L.text, w: 512, h: 256, rule: false }), g);
    return { root: g, hot: V(0, H * 0.7, r), h: H + 0.02, w: r * 2, d: r * 2 };
  },
};

function perfume(p, o) {
  const L = p.look, g = new THREE.Group(), M = mats();
  const { w, h, d, rad, base } = o;
  // one solid of glass; its lower part is tinted by the perfume (attenuation), with a thick clear base
  const glass = liquidGlass(L.liquid, { thickness: Math.min(w, d) * 1.1, dist: 0.07 });
  mesh(rbox(w, h, d, rad, 4), glass, 0, h / 2, 0, g);
  // heavy base slab reads as thicker glass
  const baseM = clearGlass("#e9f2ef", { thickness: 0.03, dist: 0.25 });
  mesh(rbox(w - 0.002, base, d - 0.002, rad * 0.7, 3), baseM, 0, base / 2 + 0.0004, 0, g).castShadow = false;
  cyl(0.0068, 0.0068, 0.006, M.gold, 0, h + 0.003, 0, g, 24);
  if (o.cap === "cube") {
    const s = Math.min(w, d) * 0.72;
    mesh(rbox(s, s * 1.05, s, 0.003, 3), capMat(L.cap), 0, h + 0.006 + s * 0.525, 0, g);
  } else {
    cyl(0.017, 0.017, 0.036, capMat(L.cap), 0, h + 0.024, 0, g, 48);
  }
  // small engraved plate on the front
  flatLabel(w * 0.62, h * 0.32, 0, h * 0.55, d / 2 + 0.0004, printMat("pf" + p.id, { name: p.name, size: p.size, fg: L.liquid === "#a8521c" ? "#f5e3c9" : "#2b1d1a", w: 384, h: 256, rule: true }), g);
  return { root: g, hot: V(0, h * 0.6, d / 2), h: h + 0.04, w, d };
}

// squeeze-tube shape: round at the cap, flat and wide at the crimp
function squeeze(geo, H) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + H / 2) / H;
    const k = Math.pow(t, 1.6);
    pos.setZ(i, pos.getZ(i) * (1 - k * 0.92));
    pos.setX(i, pos.getX(i) * (1 + k * 0.28));
  }
  geo.computeVertexNormals();
}

// product carton for the low shelves
const cartonMats = {};
export function carton(p, w, h, d) {
  const L = p.look;
  const bg = L.body || L.glass || L.liquid || L.shade || "#efe4dc";
  const col = new THREE.Color(bg); const hsl = {}; col.getHSL(hsl);
  const fg = hsl.l > 0.6 ? BRAND.wine : "#f6ece4";
  const key = p.id;
  if (!cartonMats[key]) {
    const face = labelTex("c" + key, { bg, fg, name: p.name, size: p.size, w: 256, h: 384 });
    const side = new THREE.MeshStandardMaterial({ color: bg, roughness: 0.55 });
    const front = new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 });
    cartonMats[key] = [side, side, side, side, front, side];
  }
  return mesh(new THREE.BoxGeometry(w, h, d), cartonMats[key]);
}

// a row of boxed stock, as one instanced draw: n across, `deep` rows back, optionally stacked
export function cartonRow(p, w, h, d, n, deep = 1, stack = 1, gap = 0.006) {
  carton(p, w, h, d); // makes sure the materials exist
  const mats = cartonMats[p.id];
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, d), mats, n * deep * stack);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  let k = 0;
  for (let st = 0; st < stack; st++) for (let r = 0; r < deep; r++) for (let i = 0; i < n; i++) {
    e.set(0, (Math.random() - 0.5) * 0.05, 0); q.setFromEuler(e);
    v.set((i - (n - 1) / 2) * (w + gap) + (Math.random() - 0.5) * 0.004, h / 2 + st * (h + 0.001), -r * (d + gap));
    im.setMatrixAt(k++, m4.compose(v, q, one));
  }
  im.castShadow = true; im.receiveShadow = true;
  return im;
}

export function buildProduct(p) {
  const f = B[p.kind];
  const out = f(p);
  out.root.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return out;
}
