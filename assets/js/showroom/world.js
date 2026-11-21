// The building: street outside, the showroom shell, gondolas, signs, desk and lights.
import * as THREE from "three";
import { mats, box, cyl, plane, mesh, blob, pbrSet, canvasTex, signTexture, emissiveMat,
         loadImage, FONT_D, FONT_B, BRAND, roundRect, fitText } from "./kit.js";
import { FACES, AISLES, PRODUCTS } from "./data.js";
import { buildProduct } from "./products.js";

export const DIM = {
  x: 9, front: 5, back: -22, ceil: 4.4,
  aisleStart: -2, aisleEnd: -13, faceLen: 11, faceZ: -7.5,
  deskZ: -18
};

export function buildWorld(scene, { exteriorEnv, models, quality }) {
  const M = mats();
  const W = { products: [], emitters: [], spinners: [], doors: [], obstacles: [], extMats: [], blinkers: [], coldDoor: null };
  const root = new THREE.Group(); scene.add(root);
  const ext = (m) => { m.envMap = exteriorEnv; m.envMapIntensity = m.envMapIntensity ?? 1; W.extMats.push(m); return m; };

  // ================= EXTERIOR =================
  const street = new THREE.Group(); root.add(street);
  const paveSet = pbrSet("concrete_pavement", 20, 2.5);
  const pave = new THREE.MeshStandardMaterial({ ...paveSet, color: 0xb9b4ad, roughness: 0.9 });
  ext(pave);
  plane(80, 5, pave, 0, 0, 7.5, street).rotation.x = -Math.PI / 2;
  const apronSet = pbrSet("large_grey_tiles", 3, 1.25);
  const apron = ext(new THREE.MeshStandardMaterial({ ...apronSet, color: 0xc9c6c0 }));
  const ap = plane(7, 3, apron, 0, 0.004, 6.5, street); ap.rotation.x = -Math.PI / 2;
  // kerb and road
  box(80, 0.15, 0.3, ext(new THREE.MeshStandardMaterial({ color: 0x9c9893, roughness: 0.85 })), 0, 0.0, 10.1, street);
  const roadSet = pbrSet("clean_asphalt", 24, 4);
  const road = ext(new THREE.MeshStandardMaterial({ ...roadSet, color: 0x8c8c8c, roughness: 0.75 }));
  plane(120, 14, road, 0, -0.07, 17.2, street).rotation.x = -Math.PI / 2;
  const lane = canvasTex(1024, 32, (x, w, h) => { x.fillStyle = "#e9e6dc"; for (let i = 0; i < w; i += 128) x.fillRect(i, 0, 72, h); });
  lane.wrapS = THREE.RepeatWrapping; lane.repeat.set(10, 1);
  const ln = plane(80, 0.14, new THREE.MeshStandardMaterial({ map: lane, transparent: true, roughness: 0.6 }), 0, -0.065, 17, street); ln.rotation.x = -Math.PI / 2;
  const edge = plane(80, 0.1, new THREE.MeshStandardMaterial({ color: 0xe9e6dc, roughness: 0.6 }), 0, -0.065, 10.6, street); edge.rotation.x = -Math.PI / 2;
  plane(80, 6, pave, 0, 0, 27, street).rotation.x = -Math.PI / 2;
  box(80, 0.15, 0.3, M.grey, 0, 0, 24.1, street);

  // ---- building shell (outside faces)
  const cladSet = pbrSet("concrete_tile_facade", 6, 2.4);
  const clad = ext(new THREE.MeshStandardMaterial({ ...cladSet, color: 0x8a8e96 }));
  const cladSide = ext(new THREE.MeshStandardMaterial({ ...pbrSet("concrete_tile_facade", 8, 2.4), color: 0x8a8e96 }));
  const H = 9.2;
  // upper floor band
  box(24, H - DIM.ceil - 0.6, 0.5, clad, 0, DIM.ceil + 0.6 + (H - DIM.ceil - 0.6) / 2, DIM.front + 0.25, root);
  // side pillars
  for (const s of [-1, 1]) box(2.4, DIM.ceil + 0.6, 0.6, clad, s * 10.8, (DIM.ceil + 0.6) / 2, DIM.front + 0.3, root);
  // side and back walls (outside)
  for (const s of [-1, 1]) box(0.4, H, DIM.front - DIM.back + 0.4, cladSide, s * 12, H / 2, (DIM.front + DIM.back) / 2 - 0.06, root);
  // fill between the side pillars and the outer walls so nothing shows through
  for (const s of [-1, 1]) box(2.6, H, 0.4, clad, s * 10.7, H / 2, DIM.back - 0.26, root);
  box(24.4, H, 0.4, cladSide, 0, H / 2, DIM.back - 0.26, root);
  box(24.4, 0.4, 28, M.dark, 0, H + 0.2, (DIM.front + DIM.back) / 2, root);
  // upper windows: dark glass with a few warm lit rooms
  const winGlass = ext(M.glassDark.clone());
  const lit = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.95, 0.65), toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const wx = -8.75 + i * 3.5, wy = 6.9, on = i === 1 || i === 4, fz0 = DIM.front + 0.5;
    // recess: dark reveal, the room (lit or dark), slim frame, reflective glass
    box(2.7, 1.7, 0.02, M.black, wx, wy, fz0 + 0.0, root);
    const room = on ? canvasTex(256, 160, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#fff1d6"); g.addColorStop(1, "#c98d52"); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = "rgba(60,40,20,.35)"; x.fillRect(w * .1, h * .55, w * .35, h * .45); x.fillRect(w * .62, h * .3, w * .06, h * .7); })
                    : canvasTex(64, 64, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#1c2430"); g.addColorStop(1, "#0d1218"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    plane(2.55, 1.55, on ? emissiveMat(room, 1.05) : new THREE.MeshBasicMaterial({ map: room }), wx, wy, fz0 + 0.02, root);
    const fm = M.black;
    box(2.62, 0.05, 0.1, fm, wx, wy + 0.8, fz0 + 0.05, root); box(2.62, 0.05, 0.1, fm, wx, wy - 0.8, fz0 + 0.05, root);
    box(0.05, 1.62, 0.1, fm, wx - 1.29, wy, fz0 + 0.05, root); box(0.05, 1.62, 0.1, fm, wx + 1.29, wy, fz0 + 0.05, root);
    box(0.04, 1.55, 0.06, fm, wx, wy, fz0 + 0.05, root);
    box(2.8, 0.06, 0.22, M.offwhite, wx, wy - 0.86, fz0 + 0.1, root); // sill
    plane(2.55, 1.55, winGlass, wx, wy, fz0 + 0.07, root);
    if (on) for (let b = 0; b < 7; b++) box(2.5, 0.025, 0.01, M.offwhite, wx, wy + 0.72 - b * 0.06, fz0 + 0.03, root); // half-open blinds
  }
  // outdoor AC units on brackets between the windows (the trade, on show)
  for (const [ax, ay] of [[-7, 5.35], [0, 5.35], [3.5, 8.55], [7, 5.35], [-3.5, 8.55]]) {
    if (!models.acUnit) break;
    const u = models.acUnit.clone(true), s = 0.95 / models.acUnitSize.x;
    u.scale.setScalar(s); u.position.set(ax + 1.75, ay, DIM.front + 0.5);
    root.add(u);
    for (const bx of [-0.32, 0.32]) box(0.04, 0.04, 0.42, M.alu, ax + 1.75 + bx, ay - 0.02, DIM.front + 0.7, root);
    // copper + insulation into the wall
    const p0 = new THREE.Vector3(ax + 1.75 + 0.42, ay + 0.2, DIM.front + 0.62);
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p0.clone().add(new THREE.Vector3(0.18, 0.1, -0.02)), p0.clone().add(new THREE.Vector3(0.2, 0.5, -0.1))]), 16, 0.025, 8), M.nitrile, 0, 0, 0, root);
  }

  // ---- shop sign: navy fascia with the backlit logo and a copper LED line
  const signW = 12, signH = 1.1;
  box(signW + 0.3, signH + 0.25, 0.3, M.navyGloss, 0, DIM.ceil + 0.95, DIM.front + 0.55, root, 0.02);
  const signTex = canvasTex(2400, 220, () => {});
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });
  plane(signW, signH, signMat, 0, DIM.ceil + 0.95, DIM.front + 0.71, root);
  loadImage("assets/img/logo-horizontal-on-dark.svg").then(img => {
    const c = signTex.userData.canvas, x = c.getContext("2d");
    x.clearRect(0, 0, c.width, c.height);
    if (img) { const h = 190, w = h * (img.width / img.height || 3.43); x.drawImage(img, 60, 15, w, h); }
    x.fillStyle = "rgba(255,255,255,.82)"; x.font = `500 64px ${FONT_B}`; x.textAlign = "right"; x.textBaseline = "middle";
    x.fillText("AC · VRF · Ventilation · AMC", c.width - 60, c.height / 2 + 4);
    signTex.needsUpdate = true;
  });
  box(signW + 0.3, 0.035, 0.03, M.ledCopper, 0, DIM.ceil + 0.36, DIM.front + 0.72, root);

  // ---- entrance canopy with downlights
  box(6.2, 0.18, 2.4, M.navyGloss, 0, DIM.ceil - 0.6, DIM.front + 1.2, root, 0.02);
  for (const dx of [-2, 0, 2]) {
    cyl(0.09, 0.09, 0.01, M.ledWarm, dx, DIM.ceil - 0.695, DIM.front + 1.3, root, 24);
  }

  // ---- storefront: aluminium frame, glass, sliding doors
  const glass = ext(M.glass.clone());
  const fz = DIM.front;
  box(18.2, 0.12, 0.2, M.alu, 0, DIM.ceil - 0.06, fz, root);
  box(18.2, 0.1, 0.2, M.alu, 0, 0.05, fz, root);
  box(18.2, 0.06, 0.12, M.alu, 0, 3.05, fz, root);
  for (let i = 0; i <= 10; i++) { const mx = -9 + i * 1.8; if (Math.abs(mx) < 1.0) continue; box(0.08, DIM.ceil, 0.18, M.alu, mx, DIM.ceil / 2, fz, root); }
  for (const s of [-1, 1]) {
    const gw = 9 - 1.2;
    plane(gw, DIM.ceil - 0.2, glass, s * (1.2 + gw / 2), DIM.ceil / 2, fz, root);
  }
  plane(2.4, DIM.ceil - 3.1, glass, 0, (DIM.ceil + 3.1) / 2, fz, root);
  // the glass door leaves
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group(); leaf.position.set(s * 0.6, 0, fz + 0.12); root.add(leaf);
    plane(1.16, 2.98, glass, 0, 1.53, 0, leaf);
    box(1.2, 0.06, 0.05, M.brushed, 0, 3.02, 0, leaf); box(1.2, 0.08, 0.05, M.brushed, 0, 0.06, 0, leaf);
    box(0.05, 3.0, 0.05, M.brushed, s * 0.58, 1.53, 0, leaf);
    box(0.03, 0.9, 0.06, M.steel, -s * 0.48, 1.2, 0.06, leaf, 0.01);
    // frosted band with the opening hours
    const band = canvasTex(512, 64, (x, w, h) => { x.fillStyle = "rgba(255,255,255,.55)"; x.fillRect(0, 0, w, h); x.fillStyle = BRAND.navy; x.font = `600 28px ${FONT_B}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(s < 0 ? "PUSH · WELCOME" : "AC SHOWROOM", w / 2, h / 2 + 2); });
    plane(1.1, 0.14, new THREE.MeshBasicMaterial({ map: band, transparent: true }), 0, 1.45, 0.01, leaf);
    W.doors.push({ obj: leaf, closedX: s * 0.6, openX: s * 1.65 });
  }
  // air curtain above the door, inside
  box(2.2, 0.22, 0.28, M.white, 0, 3.32, fz - 0.25, root, 0.04);
  box(2.0, 0.03, 0.04, M.slot, 0, 3.2, fz - 0.2, root);

  // planters and street furniture
  if (models.planter) for (const s of [-1, 1]) { const p = models.planter.clone(true); fitTo(p, 1.4); p.position.set(s * 3.6, 0, fz + 1.0); p.rotation.y = Math.PI / 2; street.add(p); }
  if (models.lamp) for (const lx of [-9, 9]) { const l = models.lamp.clone(true); fitTo(l, 6.2, "y"); l.position.set(lx, 0, 9.6); l.rotation.y = -Math.PI / 2; street.add(l); }
  if (models.camera) { const c = models.camera.clone(true); fitTo(c, 0.35); c.position.set(-9.6, 3.6, fz + 0.7); c.rotation.y = Math.PI * 0.8; root.add(c); }
  for (const bx of [-2.6, 2.6]) cyl(0.07, 0.08, 0.8, M.alu, bx, 0.4, 9.4, street, 16);

  // ================= INTERIOR =================
  const inside = new THREE.Group(); root.add(inside);
  const L = DIM.x * 2, D = DIM.front - DIM.back;
  // polished porcelain floor (drawn: large pale tiles, faint veining)
  const floorTex = canvasTex(1024, 1024, (x, w) => {
    x.fillStyle = "#dcd9d3"; x.fillRect(0, 0, w, w);
    const rnd = mulberry(7);
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rnd() > .5 ? "255,255,255" : "120,118,112"},${rnd() * 0.05})`; const r = rnd() * 22; x.beginPath(); x.arc(rnd() * w, rnd() * w, r, 0, 7); x.fill(); }
    x.strokeStyle = "rgba(150,145,138,.18)"; x.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { x.beginPath(); let px = rnd() * w, py = rnd() * w; x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (rnd() - .5) * 160; py += rnd() * 120; x.lineTo(px, py); } x.stroke(); }
    x.fillStyle = "#bdb9b2"; x.fillRect(0, 0, w, 3); x.fillRect(0, w / 2, w, 3); x.fillRect(0, 0, 3, w); x.fillRect(w / 2, 0, 3, w);
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(L / 2.4, D / 2.4);
  const floorRough = canvasTex(256, 256, (x, w) => { x.fillStyle = "#3a3a3a"; x.fillRect(0, 0, w, w); const r = mulberry(3); for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${r() * .08})`; x.fillRect(r() * w, r() * w, 6, 6); } x.fillStyle = "#9a9a9a"; x.fillRect(0, 0, w, 2); x.fillRect(0, w / 2, w, 2); x.fillRect(0, 0, 2, w); x.fillRect(w / 2, 0, 2, w); }, { srgb: false });
  floorRough.wrapS = floorRough.wrapT = THREE.RepeatWrapping; floorRough.repeat.copy(floorTex.repeat);
  const floorMat = new THREE.MeshPhysicalMaterial({ map: floorTex, roughnessMap: floorRough, roughness: 1, clearcoat: 0.8, clearcoatRoughness: 0.06 });
  const floor = plane(L, D, floorMat, 0, 0, (DIM.front + DIM.back) / 2, inside); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  W.floor = floor;

  // walls: white plaster
  const wallSet = pbrSet("white_plaster_02", 6, 2);
  const wall = new THREE.MeshStandardMaterial({ normalMap: wallSet.normalMap, normalScale: new THREE.Vector2(0.35, 0.35), color: 0xeeece7, roughness: 0.85 });
  for (const s of [-1, 1]) { const w = plane(D, DIM.ceil, wall, s * DIM.x, DIM.ceil / 2, (DIM.front + DIM.back) / 2, inside); w.rotation.y = -s * Math.PI / 2; w.receiveShadow = true; }
  const bw = plane(L, DIM.ceil, wall, 0, DIM.ceil / 2, DIM.back, inside); bw.receiveShadow = true;
  // skirting
  for (const s of [-1, 1]) box(0.02, 0.1, D, M.navy, s * (DIM.x - 0.01), 0.05, (DIM.front + DIM.back) / 2, inside);
  box(L, 0.1, 0.02, M.navy, 0, 0.05, DIM.back + 0.01, inside);
  // inner face of the upper front wall
  box(L, 0.4, 0.1, M.navy, 0, DIM.ceil - 0.2, DIM.front - 0.06, inside);

  // ceiling: deep navy, exposed services
  const ceil = plane(L, D, new THREE.MeshStandardMaterial({ color: 0x111c36, roughness: 0.9 }), 0, DIM.ceil, (DIM.front + DIM.back) / 2, inside);
  ceil.rotation.x = Math.PI / 2;
  // linear LED pendants: two runs over every aisle and a grid over the lobby and back hall
  const ledGeo = new THREE.BoxGeometry(0.06, 0.04, 1);
  const housing = new THREE.BoxGeometry(0.09, 0.06, 1);
  const streakTex = canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); const v = x.createLinearGradient(0, 0, 0, h); v.addColorStop(0, "rgba(0,0,0,1)"); v.addColorStop(.12, "rgba(0,0,0,0)"); v.addColorStop(.88, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)"); x.globalCompositeOperation = "destination-out"; x.fillStyle = v; x.fillRect(0, 0, w, h); });
  const streakMat = new THREE.MeshBasicMaterial({ map: streakTex, color: new THREE.Color(0.55, 0.55, 0.52), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const addLed = (x, z0, z1, y = 3.6) => {
    const len = Math.abs(z1 - z0), zc = (z0 + z1) / 2;
    const st = plane(0.5, len, streakMat, x, 0.006, zc, inside); st.rotation.x = -Math.PI / 2; st.renderOrder = 1;
    const h = new THREE.Mesh(housing, M.alu); h.scale.z = len; h.position.set(x, y + 0.03, zc); inside.add(h);
    const l = new THREE.Mesh(ledGeo, M.led); l.scale.z = len; l.position.set(x, y, zc); inside.add(l);
    for (const zz of [z0 + 0.2, z1 - 0.2]) cyl(0.004, 0.004, DIM.ceil - y, M.steel, x, (DIM.ceil + y) / 2, zz, inside, 4);
  };
  for (const a of AISLES) for (const dx of [-0.75, 0.75]) addLed(a.x + dx, DIM.aisleStart + 0.4, DIM.aisleEnd - 0.4);
  for (let gx = -6; gx <= 6; gx += 3) { addLed(gx, 4.4, 0.0, 3.7); addLed(gx, -14, -21, 3.7); }
  // exposed spiral ducts with drop diffusers along each aisle
  const ductMat = new THREE.MeshStandardMaterial({ color: 0xb4bcc5, roughness: 0.35, metalness: 0.9 });
  for (const a of AISLES) {
    const d = cyl(0.28, 0.28, 19, ductMat, a.x, 4.0, -6, inside, 40); d.rotation.x = Math.PI / 2; d.castShadow = false;
    for (let z = 3; z >= -15; z -= 1.5) { const r = mesh(new THREE.TorusGeometry(0.285, 0.012, 6, 40), ductMat, a.x, 4.0, z, inside); r.castShadow = false; }
    for (const z of [-4, -8.5, -12.5]) {
      cyl(0.12, 0.12, 0.18, ductMat, a.x, 3.67, z, inside, 24).castShadow = false;
      cyl(0.26, 0.2, 0.06, M.white, a.x, 3.56, z, inside, 32).castShadow = false;
      W.emitters.push({ p: new THREE.Vector3(a.x, 3.5, z), d: new THREE.Vector3(0, -1, 0), k: "cool", w: 0.4, rate: 0.35, ceiling: true });
    }
  }

  // ---- gondolas (double-sided display units) and wall displays
  const slat = canvasTex(512, 512, (x, w) => {
    x.fillStyle = "#f4f5f6"; x.fillRect(0, 0, w, w);
    for (let y = 0; y < w; y += 32) { x.fillStyle = "rgba(0,0,0,.09)"; x.fillRect(0, y, w, 3); x.fillStyle = "rgba(255,255,255,.7)"; x.fillRect(0, y + 3, w, 1); }
  });
  slat.wrapS = slat.wrapT = THREE.RepeatWrapping; slat.repeat.set(DIM.faceLen / 1.6, 2.4 / 1.6);
  const slatMat = new THREE.MeshStandardMaterial({ map: slat, roughness: 0.55 });
  for (const s of [-1, 1]) {
    const gx = s * 3;
    box(1.2, 2.5, DIM.faceLen, M.whiteMatte, gx, 1.25, DIM.faceZ, inside);
    // end caps facing the lobby: backlit posters
    endCap(inside, gx, s);
    endCap(inside, gx, s, true);
    W.obstacles.push({ x0: gx - 0.6 - 0.62, x1: gx + 0.6 + 0.62, z0: DIM.aisleEnd - 0.1, z1: DIM.aisleStart + 0.25 });
  }
  W.obstacles.push({ x0: -20, x1: -8.3, z0: DIM.aisleEnd, z1: DIM.aisleStart });
  W.obstacles.push({ x0: 8.3, x1: 20, z0: DIM.aisleEnd, z1: DIM.aisleStart });

  // faces: backing panel, plinth, fascia sign, products
  W.faces = {};
  for (const f of FACES) {
    const g = new THREE.Group();
    g.position.set(f.x, 0, DIM.faceZ);
    g.rotation.y = f.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    inside.add(g);
    W.faces[f.id] = g;
    const onWall = Math.abs(f.x) > 8;
    plane(DIM.faceLen, 2.4, slatMat, 0, 1.3, 0.004, g).receiveShadow = true;
    box(DIM.faceLen, 0.14, 0.6, M.whiteMatte, 0, 0.07, 0.3, g);
    box(DIM.faceLen, 0.1, 0.012, M.navy, 0, 0.05, 0.606, g);
    // fascia with the aisle number and name; a warm LED line lights the panel below it
    const fasc = signTexture(2400, 200, { num: f.aisle, title: f.name, sub: f.sub });
    box(DIM.faceLen, 0.52, 0.14, M.navy, 0, 2.8, 0.07, g);
    plane(DIM.faceLen, 0.46, emissiveMat(fasc, 1.05), 0, 2.8, 0.142, g);
    box(DIM.faceLen, 0.02, 0.03, M.ledWarm, 0, 2.53, 0.12, g);
    if (onWall) box(DIM.faceLen, 0.02, 0.6, M.whiteMatte, 0, 2.53, 0.2, g);
    // soft light falloff on the panel from the strip above
    const glow = canvasTex(32, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,244,225,.55)"); gr.addColorStop(.35, "rgba(255,244,225,.12)"); gr.addColorStop(1, "rgba(255,244,225,0)"); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
    const gl = plane(DIM.faceLen, 1.6, new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 1.72, 0.008, g);
    gl.renderOrder = 2;
  }

  // products on the faces
  const model = {};
  for (const p of PRODUCTS) {
    if (p.face === "amc") continue;
    const built = buildProduct(p);
    if (!built) continue;
    const g = W.faces[p.face];
    built.root.position.x = p.slot;
    g.add(built.root);
    register(W, p, built);
  }

  // stock boxes stacked under the wall-mounted units, like the stockroom on show

  // ---- lobby: hanging aisle boards, floor numbers, welcome wall, plants
  for (const a of AISLES) {
    const t = signTexture(1200, 260, { num: a.n, title: a.title, sub: "Aisle " + a.n });
    const board = new THREE.Group(); board.position.set(a.x, 3.5, DIM.aisleStart - 0.2); inside.add(board);
    box(2.7, 0.6, 0.06, M.navy, 0, 0, 0, board, 0.02);
    plane(2.6, 0.56, emissiveMat(t, 1.1), 0, 0, 0.032, board);
    const back = plane(2.6, 0.56, emissiveMat(t, 1.1), 0, 0, -0.032, board); back.rotation.y = Math.PI;
    for (const wx of [-1.1, 1.1]) cyl(0.003, 0.003, DIM.ceil - 3.8, M.steel, wx, (DIM.ceil - 3.5) / 2 + 0.3, 0, board, 4);
    // big floor number
    const ft = canvasTex(512, 256, (x, w, h) => { x.fillStyle = "rgba(14,30,74,.16)"; x.font = `700 220px ${FONT_D}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(a.n, w / 2, h / 2 + 10); });
    const fn = plane(2.0, 1.0, new THREE.MeshBasicMaterial({ map: ft, transparent: true, depthWrite: false }), a.x, 0.004, DIM.aisleStart + 1.2, inside);
    fn.rotation.x = -Math.PI / 2; fn.renderOrder = 1;
  }
  // welcome wall on the left of the lobby
  const welcome = canvasTex(1600, 1000, (x, w, h) => {
    x.fillStyle = BRAND.navy; x.fillRect(0, 0, w, h);
    x.fillStyle = BRAND.copper; x.fillRect(90, 120, 90, 8);
    x.fillStyle = "#fff"; x.font = `650 96px ${FONT_D}`;
    ["Walk in.", "Look closer.", "Leave cooler."].forEach((l, i) => x.fillText(l, 90, 270 + i * 112));
    x.fillStyle = "rgba(255,255,255,.72)"; x.font = `500 40px ${FONT_B}`;
    ["Every system we install is on show here,", "from a 1 TR split to a walk-in cold room."].forEach((l, i) => x.fillText(l, 90, 690 + i * 56));
    x.fillStyle = BRAND.blue; x.font = `600 34px ${FONT_B}`; x.fillText("Enquiry desk at the back ↓", 90, 880);
  });
  const ww = new THREE.Group(); ww.position.set(-DIM.x + 0.03, 1.9, 1.6); ww.rotation.y = Math.PI / 2; inside.add(ww);
  plane(4.0, 2.5, emissiveMat(welcome, 1.0), 0, 0, 0, ww);
  const wr = canvasTex(1600, 1000, (x, w, h) => {
    x.fillStyle = "#f4f2ee"; x.fillRect(0, 0, w, h);
    x.fillStyle = BRAND.navy; x.font = `650 84px ${FONT_D}`; x.fillText("Not sure what size", 90, 230); x.fillText("your room needs?", 90, 330);
    x.fillStyle = "#4a5574"; x.font = `500 40px ${FONT_B}`;
    ["The free site survey includes a heat-load", "calculation for every room, before we", "recommend a single unit."].forEach((l, i) => x.fillText(l, 90, 470 + i * 58));
    x.fillStyle = BRAND.copper; x.fillRect(90, 720, 520, 110); x.fillStyle = BRAND.ink; x.font = `650 44px ${FONT_D}`; x.fillText("Ask at the desk", 130, 792);
  });
  const wr2 = new THREE.Group(); wr2.position.set(DIM.x - 0.03, 1.9, 1.6); wr2.rotation.y = -Math.PI / 2; inside.add(wr2);
  plane(4.0, 2.5, emissiveMat(wr, 0.95), 0, 0, 0, wr2);
  if (models.plant) for (const [px, pz] of [[-7.6, 3.8], [7.6, 3.8], [-7.6, -20.6], [7.6, -20.6]]) { const p = models.plant.clone(true); fitTo(p, 1.5, "y"); p.position.set(px, 0, pz); inside.add(p); blob(1.0, 1.0, px, 0, pz, inside, 0.4); }
  if (models.wet) { const w = models.wet.clone(true); fitTo(w, 0.62, "y"); w.position.set(1.6, 0, 3.6); w.rotation.y = -0.5; inside.add(w); }
  // entrance mat
  const mat = canvasTex(512, 256, (x, w, h) => { x.fillStyle = "#1d2535"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(255,255,255,.06)"; for (let i = 0; i < w; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } x.fillStyle = "rgba(224,122,53,.85)"; x.font = `600 40px ${FONT_D}`; x.textAlign = "center"; x.fillText("WELCOME", w / 2, h / 2 + 14); });
  const em = plane(2.4, 1.2, new THREE.MeshStandardMaterial({ map: mat, roughness: 1 }), 0, 0.006, DIM.front - 0.9, inside); em.rotation.x = -Math.PI / 2;

  // ---- back hall: enquiry desk, logo wall, AMC boards, process wall
  const desk = new THREE.Group(); desk.position.set(0, 0, DIM.deskZ); inside.add(desk);
  box(3.6, 1.04, 0.9, M.navyGloss, 0, 0.52, 0, desk, 0.03);
  box(3.7, 0.05, 1.0, new THREE.MeshPhysicalMaterial({ color: 0xf5f4f1, roughness: 0.18, clearcoat: 0.6 }), 0, 1.065, 0, desk, 0.01);
  box(3.62, 0.025, 0.02, M.ledCopper, 0, 0.12, 0.455, desk);
  // monitor facing the visitor
  const scrTex = canvasTex(800, 500, () => {});
  const mon = new THREE.Group(); mon.position.set(0.55, 1.09, 0.05); desk.add(mon);
  box(0.12, 0.02, 0.18, M.alu, 0, 0.01, 0, mon); box(0.04, 0.3, 0.04, M.alu, 0, 0.16, -0.03, mon);
  const scr = new THREE.Group(); scr.position.set(0, 0.48, 0); scr.rotation.x = -0.08; mon.add(scr);
  box(0.66, 0.42, 0.03, M.black, 0, 0, 0, scr, 0.012);
  plane(0.62, 0.385, emissiveMat(scrTex, 1.15), 0, 0, 0.0155, scr);
  W.deskScreen = scrTex;
  // brochure stand and a plant on the desk
  box(0.42, 0.02, 0.16, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05 }), -1.1, 1.1, 0.25, desk);
  for (let i = 0; i < 3; i++) { const br = box(0.11, 0.24, 0.008, new THREE.MeshStandardMaterial({ color: [BRAND.navy, BRAND.copper, "#2FB6EE"][i], roughness: 0.4 }), -1.22 + i * 0.12, 1.22, 0.27, desk); br.rotation.x = -0.25; }
  blob(4.4, 1.6, 0, 0, DIM.deskZ, inside, 0.45);
  W.obstacles.push({ x0: -2.2, x1: 2.2, z0: DIM.deskZ - 0.8, z1: DIM.deskZ + 0.8 });
  W.desk = desk;
  // hanging "Enquiry desk" sign
  const ds = signTexture(1200, 260, { title: "Enquiry desk", sub: "Send your list, get a quote", rule: true });
  const dsg = new THREE.Group(); dsg.position.set(0, 3.2, DIM.deskZ + 0.2); inside.add(dsg);
  box(2.7, 0.6, 0.06, M.navy, 0, 0, 0, dsg, 0.02);
  plane(2.6, 0.56, emissiveMat(ds, 1.1), 0, 0, 0.032, dsg);
  // logo wall behind the desk
  const lw = canvasTex(2400, 900, () => {});
  box(7.2, 2.7, 0.1, M.navyGloss, 0, 2.1, DIM.back + 0.06, inside, 0.02);
  const lwm = plane(7.0, 2.62, new THREE.MeshBasicMaterial({ map: lw, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) }), 0, 2.1, DIM.back + 0.115, inside);
  loadImage("assets/img/logo-horizontal-on-dark.svg").then(img => {
    const c = lw.userData.canvas, x = c.getContext("2d");
    x.fillStyle = BRAND.navy; x.fillRect(0, 0, c.width, c.height);
    if (img) { const w = 1700, h = w / (img.width / img.height || 3.43); x.drawImage(img, (c.width - w) / 2, 140, w, h); }
    x.fillStyle = "rgba(255,255,255,.7)"; x.font = `500 64px ${FONT_B}`; x.textAlign = "center";
    x.fillText("Design · Installation · Service", c.width / 2, 760);
    lw.needsUpdate = true;
  });
  // AMC / survey lightboxes on the left wall of the back hall
  const boards = PRODUCTS.filter(p => p.face === "amc");
  boards.forEach((p, i) => {
    const g = new THREE.Group(); g.position.set(-DIM.x + 0.08, 0, -14.9 - i * 2.2); g.rotation.y = Math.PI / 2; inside.add(g);
    const t = canvasTex(800, 1000, (x, w, h) => {
      x.fillStyle = i === 2 ? BRAND.navy : "#fbfaf7"; x.fillRect(0, 0, w, h);
      const ink = i === 2 ? "#fff" : BRAND.navy, mute = i === 2 ? "rgba(255,255,255,.72)" : "#4a5574";
      x.fillStyle = BRAND.copper; x.font = `700 34px ${FONT_B}`; x.fillText(["SERVICE · 01", "SERVICE · 02", "SERVICE · 03"][i], 64, 110);
      x.fillStyle = ink; fitText(x, p.title, w - 128, 74, 650); x.fillText(p.title, 64, 220);
      x.fillStyle = mute; x.font = `500 34px ${FONT_B}`;
      wrap(x, p.line, 64, 300, w - 128, 48);
      p.specs.forEach((s, k) => { const y = 560 + k * 110; x.fillStyle = i === 2 ? "rgba(255,255,255,.14)" : "rgba(14,30,74,.12)"; x.fillRect(64, y - 56, w - 128, 2); x.fillStyle = mute; x.font = `500 30px ${FONT_B}`; x.fillText(s[0], 64, y); x.fillStyle = ink; x.font = `600 36px ${FONT_D}`; x.fillText(s[1], 64, y + 44); });
    });
    const root = new THREE.Group(); g.add(root);
    box(1.7, 2.1, 0.12, M.alu, 0, 1.45, 0.06, root, 0.02);
    plane(1.6, 2.0, emissiveMat(t, i === 2 ? 1.1 : 0.95), 0, 1.45, 0.125, root);
    register(W, p, { root, hot: new THREE.Vector3(0, 1.45, 0.3), emit: [], spin: [] });
  });
  // process wall on the right of the back hall
  const steps = canvasTex(2000, 800, (x, w, h) => {
    x.fillStyle = "#f4f2ee"; x.fillRect(0, 0, w, h);
    x.fillStyle = BRAND.navy; x.font = `650 86px ${FONT_D}`; x.fillText("Five steps, one accountable team.", 80, 150);
    const S = ["Site survey", "Design & quote", "Installation", "Testing & handover", "Service & AMC"];
    S.forEach((s, i) => { const cx = 80 + i * 376; x.fillStyle = BRAND.copper; x.fillRect(cx, 300, 330, 6); x.fillStyle = BRAND.navy; x.font = `700 120px ${FONT_D}`; x.fillText("0" + (i + 1), cx, 470); x.font = `600 44px ${FONT_D}`; x.fillText(s, cx, 560); });
  });
  const sw = new THREE.Group(); sw.position.set(DIM.x - 0.03, 2.0, -17.5); sw.rotation.y = -Math.PI / 2; inside.add(sw);
  plane(6.5, 2.6, emissiveMat(steps, 0.95), 0, 0, 0, sw);

  // interior bounds
  W.bounds = { x0: -DIM.x + 0.6, x1: DIM.x - 0.6, z0: DIM.back + 0.6, z1: DIM.front - 0.45 };
  return W;
}

function register(W, p, built) {
  W.products.push({ p, root: built.root, hot: built.hot, door: built.door, blink: built.blink });
  for (const e of built.emit || []) W.emitters.push({ ...e, obj: built.root, pid: p.id });
  for (const s of built.spin || []) W.spinners.push(s);
  if (built.door) W.coldDoor = { hinge: built.door, root: built.root, open: 0 };
  if (built.blink) W.blinkers.push(built.blink);
}

function endCap(parent, gx, s, back = false) {
  const M = mats();
  const z = back ? DIM.aisleEnd - 0.03 : DIM.aisleStart + 0.03;
  const g = new THREE.Group(); g.position.set(gx, 0, z); if (back) g.rotation.y = Math.PI; parent.add(g);
  const promo = [
    { k: "New in", t: "R32 inverter", t2: "split range", c: BRAND.copper },
    { k: "Free", t: "Site survey &", t2: "heat-load calc", c: "#2FB6EE" },
    { k: "Service", t: "AMC plans for", t2: "homes & offices", c: BRAND.copper },
    { k: "Ask us", t: "VRF for villas", t2: "and offices", c: "#2FB6EE" }
  ][(s < 0 ? 0 : 1) + (back ? 2 : 0)];
  const t = canvasTex(600, 1200, (x, w, h) => {
    x.fillStyle = "#fbfaf7"; x.fillRect(0, 0, w, h);
    x.fillStyle = BRAND.navy; x.fillRect(0, 0, w, 150);
    x.fillStyle = "#fff"; x.font = `650 66px ${FONT_D}`; x.fillText(promo.k, 48, 98);
    // a big round "cool air" mark
    const cx = w / 2, cy = 520;
    x.fillStyle = promo.c; x.beginPath(); x.arc(cx, cy, 200, 0, 7); x.fill();
    x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 16; x.lineCap = "round";
    for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx - 120, cy - 60 + i * 60); x.bezierCurveTo(cx - 40, cy - 110 + i * 60, cx + 40, cy - 10 + i * 60, cx + 120, cy - 60 + i * 60); x.stroke(); }
    x.fillStyle = BRAND.navy; x.font = `650 64px ${FONT_D}`; x.fillText(promo.t, 48, 860); x.fillText(promo.t2, 48, 936);
    x.fillStyle = BRAND.copper; x.fillRect(48, 1000, 120, 8);
  });
  box(1.18, 2.42, 0.04, M.navy, 0, 1.25, 0.02, g, 0.01);
  plane(1.08, 2.16, emissiveMat(t, 1.05), 0, 1.3, 0.042, g);
}

function stockBoxes(face, xs) {
  // printed cartons under each split display; adds the density of a real store
  const M = mats();
  const tex = canvasTex(512, 256, (x, w, h) => {
    x.fillStyle = "#c9a477"; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(0,0,0,.06)"; for (let i = 0; i < 40; i++) x.fillRect(0, i * 7, w, 1);
    x.fillStyle = BRAND.navy; x.fillRect(0, 0, w, 54);
    x.fillStyle = "#fff"; x.font = `700 30px ${FONT_B}`; x.fillText("INDOOR UNIT", 20, 38);
    x.fillStyle = BRAND.navy; x.font = `650 56px ${FONT_D}`; x.fillText("1.5 TR", 20, 140);
    x.font = `500 26px ${FONT_B}`; x.fillText("Inverter split · R32", 20, 190);
    x.strokeStyle = BRAND.navy; x.lineWidth = 3; x.strokeRect(380, 90, 100, 100); x.beginPath(); x.moveTo(430, 110); x.lineTo(430, 170); x.moveTo(405, 135); x.lineTo(430, 110); x.lineTo(455, 135); x.stroke();
  });
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 });
  const geo = new THREE.BoxGeometry(0.34, 0.3, 0.98);
  for (const x0 of xs) {
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(geo, [M.cardboard, M.cardboard, M.cardboard, M.cardboard, mat, M.cardboard]);
      m.rotation.y = Math.PI / 2;
      m.position.set(x0 + 0.62 + (i ? 0.02 : 0), 0.14 + 0.15 + i * 0.3, 0.18);
      m.castShadow = m.receiveShadow = true;
      face.add(m);
    }
  }
}

export function fitTo(obj, size, axis) {
  obj.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(obj), s = new THREE.Vector3(); b.getSize(s);
  const k = size / (axis ? s[axis] : Math.max(s.x, s.y, s.z));
  obj.scale.multiplyScalar(k);
  obj.traverse(m => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  return obj;
}

function wrap(x, text, px, py, maxW, lh) {
  const words = text.split(" "); let line = "", y = py;
  for (const w of words) { const t = line ? line + " " + w : w; if (x.measureText(t).width > maxW) { x.fillText(line, px, y); line = w; y += lh; } else line = t; }
  if (line) x.fillText(line, px, y);
}

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
