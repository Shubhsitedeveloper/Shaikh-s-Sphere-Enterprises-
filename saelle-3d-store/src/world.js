// The store: street and facade outside, shelving, bars and the checkout inside.
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mats, pbrSet, lacquer, matte, rbox, mesh, box, cyl, plane, lathe, blob, canvasTex, emissiveMat, gradientTex, labelTex, spaced, fitFont, BRAND, FONT_D, FONT_B, mulberry, clearGlass } from "./kit.js";
import { PRODUCTS } from "./data.js";
import { buildProduct, carton, cartonRow } from "./products.js";

export const DIM = { x: 7, front: 5, back: -17, ceil: 4.0, fT: 0.45, bayZ: [-0.6, -3.4, -6.2, -9.0], bayW: 2.5, scentZ: -4.6, bodyZ: -10.2, deskZ: -14.6, entryZ: 1.5 };

export function buildWorld(scene, { extEnv, models, quality }) {
  const HI = quality === "high";
  const M = mats();
  const W = { frameId: 0, products: [], obstacles: [], occluders: [], emitters: [], doors: [], lights: [], blinkers: [], extMats: [], spinners: [] };
  const rnd = mulberry(7);
  const ext = (m) => { m.envMap = extEnv; W.extMats.push(m); return m; };

  // ======================= materials =======================
  const marble = pbrSet("stone_light", 1, 1);
  const floorMat = new THREE.MeshPhysicalMaterial({ map: marble.map, normalMap: marble.normalMap, normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: marble.roughnessMap, roughness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.1, color: 0xffffff });
  const plaster = pbrSet("plaster_blush", 2.2, 1.4);
  const wallMat = new THREE.MeshStandardMaterial({ map: plaster.map, normalMap: plaster.normalMap, normalScale: new THREE.Vector2(0.12, 0.12), roughness: 0.88, color: 0xfff8f4 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0xf4eeea, roughness: 0.95, emissive: 0xfff1e6, emissiveIntensity: 0.1 });
  const walnut = pbrSet("american_walnut_veneer", 1.5, 1.5);
  const walnutMat = new THREE.MeshPhysicalMaterial({ map: walnut.map, normalMap: walnut.normalMap, normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.25, color: 0xc99d78 });
  const walnutV = pbrSet("american_walnut_veneer", 1, 2, { rot: Math.PI / 2 });
  const walnutVMat = new THREE.MeshPhysicalMaterial({ map: walnutV.map, normalMap: walnutV.normalMap, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.25, color: 0xc99d78 });
  const stoneTop = pbrSet("stone_light", 0.6, 0.6);
  const topMat = new THREE.MeshPhysicalMaterial({ map: stoneTop.map, normalMap: stoneTop.normalMap, normalScale: new THREE.Vector2(0.15, 0.15), roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.12, color: 0xfbf8f5 });
  const flute = fluteNormal();
  const fcache = {};
  const fluted = (mat, rx) => { const k = mat.uuid + rx; if (fcache[k]) return fcache[k]; const m = mat.clone(); m.normalMap = flute.clone(); m.normalMap.wrapS = m.normalMap.wrapT = THREE.RepeatWrapping; m.normalMap.repeat.set(rx, 1); m.normalMap.needsUpdate = true; return (fcache[k] = m); };
  const plumFluted = new THREE.MeshPhysicalMaterial({ color: 0x6a3445, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.15, normalMap: flute, normalScale: new THREE.Vector2(1.4, 1.4) });
  const blushFluted = new THREE.MeshPhysicalMaterial({ color: 0xe3c1b5, roughness: 0.4, clearcoat: 0.7, clearcoatRoughness: 0.15, normalMap: flute, normalScale: new THREE.Vector2(1.4, 1.4) });
  const brassFluted = new THREE.MeshStandardMaterial({ color: 0xc69b62, metalness: 1, roughness: 0.32, normalMap: flute, normalScale: new THREE.Vector2(1.6, 1.6) });
  const velvet = pbrSet("velour_velvet", 2, 2);
  const velvetMat = new THREE.MeshPhysicalMaterial({ map: velvet.map, normalMap: velvet.normalMap, color: 0xd9a6a6, roughness: 0.9, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffd9d2) });

  // ======================= interior shell =======================
  const IN = new THREE.Group(); IN.name = "interior"; scene.add(IN);
  const fw = DIM.x * 2, fd = DIM.front - DIM.back;
  marble.map.repeat.set(fw / 2.4, fd / 2.4); marble.normalMap.repeat.copy(marble.map.repeat); marble.roughnessMap.repeat.copy(marble.map.repeat);
  let floor;
  if (HI) {
    floor = new Reflector(new THREE.PlaneGeometry(fw, fd), { textureWidth: Math.round(innerWidth * 0.5 * Math.min(devicePixelRatio, 1.5)), textureHeight: Math.round(innerHeight * 0.5 * Math.min(devicePixelRatio, 1.5)), clipBias: 0.002, multisample: 0 });
    const tm = floor.material.uniforms.textureMatrix.value, tex = floor.getRenderTarget().texture;
    floor.material = reflectiveFloor(floorMat, tex, tm);
    // render the reflection once per frame (the transmission pass would trigger it again)
    const orig = floor.onBeforeRender; let last = -1;
    floor.onBeforeRender = function (r, s, c) { const f = W.frameId; if (c !== W.mainCamera || f === last) return; last = f; orig.call(this, r, s, c); };
    W.reflector = floor;
  } else floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (DIM.front + DIM.back) / 2); floor.receiveShadow = true;
  IN.add(floor);
  // grout lines between the big slabs

  const wallL = plane(fd, DIM.ceil, wallMat, -DIM.x, DIM.ceil / 2, (DIM.front + DIM.back) / 2, IN); wallL.rotation.y = Math.PI / 2; wallL.receiveShadow = true;
  const wallR = plane(fd, DIM.ceil, wallMat, DIM.x, DIM.ceil / 2, (DIM.front + DIM.back) / 2, IN); wallR.rotation.y = -Math.PI / 2; wallR.receiveShadow = true;
  const wallB = plane(fw, DIM.ceil, wallMat, 0, DIM.ceil / 2, DIM.back, IN); wallB.receiveShadow = true;
  const ceil = plane(fw, fd, ceilMat, 0, DIM.ceil, (DIM.front + DIM.back) / 2, IN); ceil.rotation.x = Math.PI / 2;
  // skirting in walnut
  for (const s of [-1, 1]) box(0.02, 0.1, fd, walnutMat, s * (DIM.x - 0.01), 0.05, (DIM.front + DIM.back) / 2, IN);
  box(fw, 0.1, 0.02, walnutMat, 0, 0.05, DIM.back + 0.01, IN);
  // perimeter cove: a lowered soffit with a warm light line washing the ceiling
  for (const s of [-1, 1]) {
    box(0.5, 0.18, fd, ceilMat, s * (DIM.x - 0.25), DIM.ceil - 0.09, (DIM.front + DIM.back) / 2, IN);
    const l = box(0.02, 0.02, fd, M.led, s * (DIM.x - 0.52), DIM.ceil - 0.17, (DIM.front + DIM.back) / 2, IN); l.castShadow = false;
  }
  box(fw - 1, 0.18, 0.5, ceilMat, 0, DIM.ceil - 0.09, DIM.back + 0.25, IN);
  box(fw - 1, 0.02, 0.02, M.led, 0, DIM.ceil - 0.17, DIM.back + 0.52, IN).castShadow = false;

  // ceiling tracks with spot heads
  const trackMat = M.blackMatte;
  for (const x of [-3.4, 0, 3.4]) {
    box(0.04, 0.035, 19, trackMat, x, DIM.ceil - 0.02, -6.2, IN).castShadow = false;
    for (let z = 3; z > -15.5; z -= 1.55) {
      const head = new THREE.Group(); head.position.set(x, DIM.ceil - 0.04, z); IN.add(head);
      cyl(0.012, 0.012, 0.08, trackMat, 0, -0.04, 0, head, 12).castShadow = false;
      const can = new THREE.Group(); can.position.y = -0.09; head.add(can);
      const aim = x === 0 ? 0 : -Math.sign(x);
      can.rotation.z = aim * 0.55; can.rotation.x = 0.12 * Math.sin(z * 3.1);
      cyl(0.034, 0.03, 0.13, trackMat, 0, -0.03, 0, can, 20).castShadow = false;
      const lens = cyl(0.025, 0.025, 0.004, M.led, 0, -0.096, 0, can, 20); lens.castShadow = false;
    }
  }

  // ======================= wall bays =======================
  const placed = {};
  for (const p of PRODUCTS) placed[p.id] = p;
  const wallUnit = (side) => {
    const s = side === "L" ? -1 : 1;
    const g = new THREE.Group(); g.position.set(s * DIM.x, 0, 0); g.rotation.y = -s * Math.PI / 2; IN.add(g);
    const glow = side === "L" ? gradientTex("#f3d9cd", "#ecc9bb", "#d9ab9b") : gradientTex("#efcfcf", "#e2b4b6", "#c98f95");
    const glowMat = emissiveMat(glow, side === "L" ? 0.62 : 0.55);
    const pil = side === "L" ? walnutVMat : fluted(plumFluted, 7);
    const zs = DIM.bayZ;
    // pilasters between and around bays
    for (let i = 0; i <= zs.length; i++) {
      const lx = (i - zs.length / 2) * (DIM.bayW + 0.3) * 1 - 0.15 * 0;
      const zPos = i === 0 ? zs[0] + (DIM.bayW / 2 + 0.15) : i === zs.length ? zs[zs.length - 1] - (DIM.bayW / 2 + 0.15) : (zs[i - 1] + zs[i]) / 2;
      const localX = side === "L" ? -zPos : zPos;
      box(0.3, 3.62, 0.5, pil, localX, 1.81, 0.25, g, 0.01);
      box(0.32, 0.06, 0.52, M.brass, localX, 3.65, 0.26, g);
    }
    // frieze above the bays with section name
    zs.forEach((bz, bi) => {
      const lx = side === "L" ? -bz : bz;
      const bay = new THREE.Group(); bay.position.set(lx, 0, 0); g.add(bay);
      // lower cabinet: fluted front, stone top
      box(DIM.bayW, 0.82, 0.48, fluted(side === "L" ? blushFluted : plumFluted, 62), 0, 0.41, 0.24, bay);
      box(DIM.bayW, 0.08, 0.47, M.blackMatte, 0, 0.04, 0.22, bay); // toe kick
      box(DIM.bayW + 0.02, 0.04, 0.52, topMat, 0, 0.84, 0.26, bay);
      // backlit arched niche
      const ny0 = 0.86, nRect = 1.55, nW = DIM.bayW - 0.1;
      const archShape = arch(nW, nRect);
      const back = new THREE.Mesh(new THREE.ShapeGeometry(archShape, 32), glowMat); back.position.set(0, ny0, 0.02); bay.add(back);
      fixShapeUV(back.geometry, nW, nRect + nW / 2);
      // arch frame: thin brass edge just inside the plaster
      const ring = archRing(nW + 0.06, nRect, 0.03); const rm = new THREE.Mesh(new THREE.ExtrudeGeometry(ring, { depth: 0.05, bevelEnabled: false, curveSegments: 40 }), M.brass);
      rm.position.set(0, ny0, 0.45); bay.add(rm);
      // plaster infill around the arch so it reads as a recess in a wall
      const surround = new THREE.Shape(); surround.moveTo(-DIM.bayW / 2, 0); surround.lineTo(DIM.bayW / 2, 0); surround.lineTo(DIM.bayW / 2, 3.62 - ny0); surround.lineTo(-DIM.bayW / 2, 3.62 - ny0); surround.closePath();
      surround.holes.push(arch(nW + 0.06, nRect));
      const sur = new THREE.Mesh(new THREE.ExtrudeGeometry(surround, { depth: 0.06, bevelEnabled: false, curveSegments: 40 }), wallMat);
      sur.position.set(0, ny0, 0.44); sur.receiveShadow = true; bay.add(sur);
      // side cheeks of the recess
      const cheekL = box(0.02, nRect, 0.44, wallMat, -nW / 2 - 0.02, ny0 + nRect / 2, 0.24, bay); const cheekR = box(0.02, nRect, 0.44, wallMat, nW / 2 + 0.02, ny0 + nRect / 2, 0.24, bay);
      // glass shelves with brass lips and LED lines underneath
      const shelfY = [1.2, 1.6, 2.0];
      for (const y of shelfY) {
        const sh = box(nW - 0.02, 0.012, 0.36, M.shelfGlass, 0, y, 0.22, bay); sh.castShadow = false; sh.renderOrder = 3;
        box(nW - 0.02, 0.022, 0.012, M.brass, 0, y - 0.004, 0.405, bay).castShadow = false;
        const led = box(nW - 0.1, 0.006, 0.01, M.ledSoft, 0, y - 0.012, 0.38, bay); led.castShadow = false;
      }
      // what sits on each shelf
      const bayProducts = PRODUCTS.filter(p => p.slot.wall === side && p.slot.bay === bi);
      bayProducts.forEach(p => {
        const y = shelfY[p.slot.row];
        const it = shelfBlock(p, bay, 0, y + 0.006, 0.27, (nW - 0.16) * 0.9, { across: HI ? 18 : 9, deep: 1 });
        it.normal = new THREE.Vector3(-s, 0, 0);
        // boxed stock of the same product lined up behind the testers
        const cw = Math.max(0.045, Math.min(0.09, it.unitW + 0.004)), ch = Math.min(0.34, Math.max(0.08, it.unitH * 1.02)), cd = Math.max(0.045, Math.min(0.08, cw));
        const nAcross = Math.floor((nW - 0.12) / (cw + 0.006));
        const row = cartonRow(p, cw, ch, cd, nAcross, 1, ch < 0.15 ? 2 : 1); row.position.set(0, y + 0.006, 0.27 - (it.unitD || 0.05) / 2 - cd / 2 - 0.012); bay.add(row);
        W.products.push(it);
      });
      // top shelf: cartons and a vase
      const top = shelfY[2] + 0.006;
      bayProducts.forEach((p, k) => {
        const cx = (k === 0 ? -1 : 1) * 0.55;
        const n = 3; for (let j = 0; j < n; j++) { const c = carton(p, 0.07, 0.13, 0.07); c.position.set(cx + (j - 1) * 0.085, top + 0.065, 0.2); c.rotation.y = (rnd() - 0.5) * 0.06; bay.add(c); }
        const c2 = carton(p, 0.07, 0.13, 0.07); c2.position.set(cx, top + 0.13 + 0.065, 0.2); c2.rotation.y = 0.2; bay.add(c2);
      });
      if (models.vase1 && bi % 2 === 0) { const v = models.vase1.clone(); v.scale.setScalar(0.62); v.position.set(0, top, 0.2); bay.add(v); }
      else if (models.vase3) { const v = models.vase3.clone(); v.scale.setScalar(0.55); v.position.set(0, top, 0.2); bay.add(v); }
      // on the counter: testers, a tray and a mirror
      const tray = box(0.42, 0.012, 0.22, M.brushedBrass, -0.55, 0.866, 0.27, bay, 0.004);
      bayProducts.forEach((p, k) => { const t = buildProduct(p).root; t.position.set(-0.65 + k * 0.2, 0.872, 0.27); t.rotation.y = 0.3 - k * 0.5; bay.add(t); });
      const testCard = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.05), new THREE.MeshStandardMaterial({ map: labelTex("tester", { bg: "#fbf7f4", fg: BRAND.wine, name: "Try me", size: null, small: "TESTER", w: 512, h: 180, rule: false }), roughness: 0.6 }));
      testCard.position.set(-0.55, 0.9, 0.39); testCard.rotation.x = -0.6; bay.add(testCard);
      // a round vanity mirror on a brass stand on alternate bays
      if (bi % 2 === 1) {
        const mg = new THREE.Group(); mg.position.set(0.6, 0.86, 0.22); bay.add(mg);
        cyl(0.06, 0.07, 0.012, M.brass, 0, 0.006, 0, mg, 32);
        cyl(0.006, 0.006, 0.2, M.brass, 0, 0.11, 0, mg, 12);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 12, 48), M.brass); ring2.position.y = 0.32; mg.add(ring2);
        const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.105, 48), M.mirror); mirror.position.set(0, 0.32, 0.002); mg.add(mirror);
        mg.rotation.y = -0.25;
        if (models.plant4) { const pl = models.plant4.clone(); pl.scale.setScalar(0.9); pl.position.set(0.95, 0.86, 0.24); bay.add(pl); }
      } else if (models.plant4) { const pl = models.plant4.clone(); pl.position.set(0.9, 0.86, 0.22); bay.add(pl); }
    });
    // section name on the soffit above
    const sec = side === "L" ? ["Skincare", "01"] : ["Makeup", "03"];
    const zMid = (zs[0] + zs[zs.length - 1]) / 2;
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.28), new THREE.MeshStandardMaterial({ map: friezeTex(sec[0], sec[1]), transparent: true, metalness: 0.6, roughness: 0.35, color: 0xffffff }));
    fr.position.set(side === "L" ? -zMid : zMid, 3.78, 0.52); g.add(fr);
    const zMin = zs[zs.length - 1] - DIM.bayW / 2 - 0.3, zMax = zs[0] + DIM.bayW / 2 + 0.3;
    W.obstacles.push({ x0: s < 0 ? -DIM.x : DIM.x - 0.58, x1: s < 0 ? -DIM.x + 0.58 : DIM.x, z0: zMin, z1: zMax });
    return g;
  };
  wallUnit("L"); wallUnit("R");

  // ======================= entrance table: new launch =======================
  {
    const g = new THREE.Group(); g.position.set(0, 0, DIM.entryZ); IN.add(g);
    cyl(0.18, 0.3, 0.06, M.brass, 0, 0.03, 0, g, 48);
    cyl(0.16, 0.16, 0.82, fluted(blushFluted, 26), 0, 0.47, 0, g, 64);
    mesh(lathe([[0, 0], [0.74, 0], [0.76, 0.02], [0.76, 0.045], [0.74, 0.06], [0, 0.06]], 96), topMat, 0, 0.88, 0, g);
    // tiered display: three stone discs
    const tiers = [[0.42, 0.09], [0.28, 0.2], [0.15, 0.32]];
    for (const [r, h] of tiers) mesh(lathe([[0, 0], [r, 0], [r, h], [0, h]], 64), M.porcelain, 0, 0.94, 0, g);
    const p = PRODUCTS.find(p => p.slot.table === "entry");
    const it = ringBlock(p, g, [[0, 0.94 + 0.32, 0.0, 1], [0.21, 0.94 + 0.2, 0.06, 0], [-0.21, 0.94 + 0.2, 0.06, 0], [0.32, 0.94 + 0.09, 0.22, 0], [-0.32, 0.94 + 0.09, 0.22, 0], [0, 0.94 + 0.09, 0.36, 0], [0.12, 0.94 + 0.2, -0.22, 0], [-0.12, 0.94 + 0.2, -0.22, 0]]);
    it.normal = null; W.products.push(it);
    // launch card
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshStandardMaterial({ map: launchCard(), roughness: 0.6 }));
    const stand = new THREE.Group(); stand.position.set(0.48, 0.94, 0.34); stand.rotation.y = -0.5; g.add(stand);
    card.position.set(0, 0.17, 0); card.rotation.x = -0.12; stand.add(card);
    box(0.24, 0.01, 0.06, M.brass, 0, 0.005, -0.01, stand);
    if (models.vase1) { const v = models.vase1.clone(); v.position.set(-0.45, 0.94, -0.25); g.add(v); }
    blob(1.9, 1.9, 0, 0, 0, g, 0.35);
    W.obstacles.push({ x0: -0.85, x1: 0.85, z0: DIM.entryZ - 0.85, z1: DIM.entryZ + 0.85, occ: false });
  }

  // ======================= fragrance bar =======================
  {
    const g = new THREE.Group(); g.position.set(0, 0, DIM.scentZ); IN.add(g);
    const L = 3.6, D = 1.2;
    const sh = stadium(L, D);
    const bodyGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.86, bevelEnabled: false, curveSegments: 40 });
    bodyGeo.rotateX(-Math.PI / 2);
    fixFluteUV(bodyGeo);
    const bodyM = new THREE.Mesh(bodyGeo, plumFluted); bodyM.position.y = 0.06; bodyM.castShadow = bodyM.receiveShadow = true; g.add(bodyM);
    const kickGeo = new THREE.ExtrudeGeometry(stadium(L - 0.08, D - 0.08), { depth: 0.06, bevelEnabled: false, curveSegments: 40 }); kickGeo.rotateX(-Math.PI / 2);
    g.add(new THREE.Mesh(kickGeo, M.blackMatte));
    const topGeo = new THREE.ExtrudeGeometry(stadium(L + 0.06, D + 0.06), { depth: 0.045, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 3, curveSegments: 48 }); topGeo.rotateX(-Math.PI / 2);
    planarUV(topGeo, 0.7);
    const top = new THREE.Mesh(topGeo, topMat); top.position.y = 0.92; top.castShadow = top.receiveShadow = true; g.add(top);
    const bandGeo = new THREE.ExtrudeGeometry(stadium(L + 0.005, D + 0.005), { depth: 0.012, bevelEnabled: false, curveSegments: 40 }); bandGeo.rotateX(-Math.PI / 2);
    const band = new THREE.Mesh(bandGeo, M.brass); band.position.y = 0.9; g.add(band);
    // perfumes on lit pedestals, in a gentle arc facing the entrance
    const scent = PRODUCTS.filter(p => p.slot.table === "scent");
    scent.forEach((p, i) => {
      const x = (i - 2.5) * 0.56, z = 0.18 - Math.abs(i - 2.5) * 0.03;
      const ph = [0.16, 0.24, 0.12, 0.2, 0.1, 0.18][i];
      const ped = new THREE.Group(); ped.position.set(x, 0.965, z); g.add(ped);
      mesh(lathe([[0, 0], [0.085, 0], [0.085, ph], [0, ph]], 48), M.porcelain, 0, 0, 0, ped);
      const ring = cyl(0.086, 0.086, 0.006, M.led, 0, ph - 0.004, 0, ped, 48); ring.castShadow = false;
      cyl(0.09, 0.09, 0.008, M.brass, 0, 0.004, 0, ped, 48);
      const it = ringBlock(p, ped, [[0, ph, 0, 1], [-0.12, -0.0, 0.05, 0], [0.12, 0, 0.05, 0]].map(([a, b, c, h]) => [a, b, c, h]), { yRot: -x * 0.08 });
      it.normal = null; W.products.push(it);
    });
    // glass cloche over a crystal flacon in the middle, blotter strips and an atomiser
    const cl = new THREE.Group(); cl.position.set(0, 0.965, -0.3); g.add(cl);
    cyl(0.12, 0.12, 0.02, M.plumLacquer, 0, 0.01, 0, cl, 48);
    const dome = mesh(lathe([[0.11, 0], [0.11, 0.22], [0.09, 0.28], [0.05, 0.305], [0, 0.31]], 48), clearGlass("#ffffff", { thickness: 0.004 }), 0, 0.02, 0, cl); dome.castShadow = false;
    cyl(0.012, 0.012, 0.03, M.brass, 0, 0.345, 0, cl, 16);
    const hero = buildProduct(PRODUCTS.find(p => p.id === "jasmine-night")).root; hero.scale.setScalar(1.6); hero.position.y = 0.02; cl.add(hero);
    const strips = new THREE.Group(); strips.position.set(1.15, 0.965, -0.15); g.add(strips);
    cyl(0.035, 0.04, 0.09, M.brass, 0, 0.045, 0, strips, 24);
    for (let k = 0; k < 9; k++) { const s = box(0.012, 0.15, 0.0015, M.paper, (rnd() - 0.5) * 0.03, 0.15, (rnd() - 0.5) * 0.03, strips); s.rotation.set((rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4); s.castShadow = false; }
    const atom = new THREE.Group(); atom.position.set(-1.2, 0.965, -0.2); g.add(atom);
    mesh(lathe([[0, 0], [0.04, 0], [0.045, 0.04], [0.035, 0.09], [0.006, 0.11], [0, 0.11]], 40), clearGlass("#f7d4dc", { thickness: 0.02, dist: 0.08 }), 0, 0, 0, atom);
    cyl(0.005, 0.005, 0.05, M.gold, 0, 0.13, 0, atom, 12);
    const bulb = mesh(new THREE.SphereGeometry(0.022, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xc9a46a, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0xffe5c4) }), 0.03, 0.12, 0, atom);
    const tube = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 8), M.gold, 0.012, 0.13, 0, atom); tube.rotation.z = Math.PI / 2;
    W.emitters.push({ obj: atom, p: new THREE.Vector3(-0.005, 0.155, 0), d: new THREE.Vector3(-0.6, 0.35, 0.7), k: "mist", w: 0.02, rate: 0, puff: true });
    // three opal globe pendants above
    for (const x of [-1.1, 0, 1.1]) pendant(IN, x, DIM.scentZ, 2.55 + (x === 0 ? -0.1 : 0), M);
    const ped2 = 1; void ped2;
    W.obstacles.push({ x0: -L / 2 - 0.12, x1: L / 2 + 0.12, z0: DIM.scentZ - D / 2 - 0.08, z1: DIM.scentZ + D / 2 + 0.08, occ: false });
    blob(L + 0.8, D + 0.8, 0, 0, 0, g, 0.4);
  }

  // ======================= hair & body table =======================
  {
    const g = new THREE.Group(); g.position.set(0, 0, DIM.bodyZ); IN.add(g);
    const L = 3.4, D = 1.1;
    box(L, 0.74, D, walnutMat, 0, 0.43, 0, g, 0.01);
    box(L - 0.08, 0.06, D - 0.08, M.blackMatte, 0, 0.03, 0, g);
    box(L + 0.04, 0.05, D + 0.04, topMat, 0, 0.825, 0, g, 0.006);
    // stepped riser down the middle
    box(L - 0.5, 0.16, 0.34, M.porcelain, 0, 0.93, -0.18, g, 0.01);
    box(L - 1.3, 0.14, 0.26, M.porcelain, 0, 1.08, -0.2, g, 0.01);
    const body = PRODUCTS.filter(p => p.slot.table === "body");
    body.forEach((p, i) => {
      const x = (i - 2.5) * 0.52;
      const it = shelfBlock(p, g, x, 0.85, 0.2, 0.46, { across: HI ? 3 : 2, deep: HI ? 2 : 1, spacing: 0.012 });
      it.normal = new THREE.Vector3(0, 0, 1);
      W.products.push(it);
      // a few on the riser behind
      const u = buildProduct(p).root; u.position.set(x, 1.01, -0.16); u.rotation.y = 0.2; g.add(u);
    });
    if (models.brass) { const v = models.brass.clone(); v.scale.setScalar(0.62); v.position.set(0, 1.15, -0.2); g.add(v); }
    // towels and a soap dish to dress it
    for (let k = 0; k < 3; k++) box(0.26, 0.035, 0.18, matte(k === 1 ? "#e9d6cc" : "#f5eee8", 0.95), 1.4, 0.87 + k * 0.035, -0.32, g, 0.012);
    blob(L + 0.7, D + 0.7, 0, 0, 0, g, 0.4);
    W.obstacles.push({ x0: -L / 2 - 0.1, x1: L / 2 + 0.1, z0: DIM.bodyZ - D / 2 - 0.1, z1: DIM.bodyZ + D / 2 + 0.1, occ: false });
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), new THREE.MeshStandardMaterial({ map: friezeTex("Hair & Body", "04", "#5a2e33"), transparent: true, roughness: 0.5 }));
    fr.position.set(0, 0.5, D / 2 + 0.003); g.add(fr);
  }
  {
    const fr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.18), new THREE.MeshStandardMaterial({ map: friezeTex("Fragrance", "02", "#f3e2d6"), transparent: true, roughness: 0.5 }));
    fr.position.set(0, 0.6, DIM.scentZ + 0.6 + 0.004); IN.add(fr);
  }

  // ======================= checkout =======================
  {
    const g = new THREE.Group(); g.position.set(0, 0, DIM.deskZ); IN.add(g);
    const L = 3.4, D = 0.7, H = 1.0;
    const front = box(L, H - 0.05, 0.04, brassFluted, 0, (H - 0.05) / 2, D / 2 - 0.02, g);
    fixBoxFlute(front.geometry, L, H);
    box(L, H - 0.05, D - 0.04, walnutMat, 0, (H - 0.05) / 2, -0.02, g);
    box(L + 0.06, 0.05, D + 0.08, topMat, 0, H - 0.025, 0, g, 0.008);
    box(L - 0.08, 0.06, D - 0.2, M.blackMatte, 0, 0.03, 0, g);
    // till: a slim screen facing the customer, a card machine, bags and tissue
    const pos = new THREE.Group(); pos.position.set(-0.6, H, 0.05); g.add(pos);
    cyl(0.07, 0.08, 0.012, M.chrome, 0, 0.006, 0, pos, 32);
    cyl(0.012, 0.012, 0.2, M.chrome, 0, 0.11, -0.02, pos, 16);
    const scr = new THREE.Group(); scr.position.set(0, 0.25, 0); scr.rotation.x = -0.25; pos.add(scr);
    box(0.34, 0.24, 0.014, M.blackLacquer, 0, 0, 0, scr, 0.012);
    const deskTex = canvasTex(680, 460, () => {});
    const dsc = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.215), emissiveMat(deskTex, 1.1)); dsc.position.z = 0.008; scr.add(dsc);
    W.deskScreen = deskTex;
    const term = new THREE.Group(); term.position.set(-0.15, H, 0.18); term.rotation.set(-0.3, 0.3, 0); g.add(term);
    box(0.08, 0.025, 0.16, M.blackMatte, 0, 0.012, 0, term, 0.01);
    const tscr = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), emissiveMat(canvasTex(128, 128, (x, w, h) => { x.fillStyle = "#0b0b0d"; x.fillRect(0, 0, w, h); x.fillStyle = "#d9b77c"; x.font = `600 20px ${FONT_B}`; x.textAlign = "center"; x.fillText("TAP", w / 2, 60); x.strokeStyle = "#d9b77c"; x.lineWidth = 3; for (let r = 14; r < 40; r += 8) { x.beginPath(); x.arc(w / 2, 92, r, -0.7 - Math.PI / 2, 0.7 - Math.PI / 2); x.stroke(); } }), 1));
    tscr.rotation.x = -Math.PI / 2; tscr.position.set(0, 0.026, -0.03); term.add(tscr);
    // paper bags with rope handles
    const bagM = new THREE.MeshStandardMaterial({ map: bagTex(), roughness: 0.8 });
    const bagSide = matte("#e8cfc3", 0.85);
    for (const [x, sc, ry] of [[0.85, 1, -0.2], [1.12, 0.78, 0.25]]) {
      const bag = new THREE.Group(); bag.position.set(x, H, -0.05); bag.rotation.y = ry; bag.scale.setScalar(sc); g.add(bag);
      const bm = mesh(new THREE.BoxGeometry(0.26, 0.32, 0.12), [bagSide, bagSide, bagSide, bagSide, bagM, bagM], 0, 0.16, 0, bag);
      for (const s of [-1, 1]) { const rope = mesh(new THREE.TorusGeometry(0.05, 0.004, 8, 24, Math.PI), matte("#5a2e33", 0.8), s * 0.0, 0.32, s * 0.03, bag); rope.position.x = 0; }
      // tissue poking out
      const t = mesh(new THREE.ConeGeometry(0.09, 0.08, 5, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4dcd6, roughness: 0.9, side: THREE.DoubleSide }), 0, 0.34, 0, bag); t.rotation.y = 0.4; t.castShadow = false;
    }
    // gift boxes with ribbon
    for (const [x, z, s, c] of [[0.35, 0.12, 0.14, "#5a2e33"], [0.48, 0.1, 0.1, "#e9cfc5"]]) {
      const gb = box(s, s * 0.7, s, lacquer(c, 0.5), x, H + s * 0.35, z, g, 0.004);
      box(s + 0.002, s * 0.7 + 0.002, 0.012, M.gold, x, H + s * 0.35, z, g); box(0.012, s * 0.7 + 0.002, s + 0.002, M.gold, x, H + s * 0.35, z, g);
    }
    if (models.vase3) { const v = models.vase3.clone(); v.position.set(-1.35, H, -0.1); g.add(v); }
    if (models.plant4) { const p = models.plant4.clone(); p.position.set(1.5, H, 0.15); g.add(p); }
    W.desk = g;
    W.obstacles.push({ x0: -2.0, x1: 2.0, z0: DIM.back, z1: DIM.deskZ + D / 2 + 0.05 });
    // back wall: a large lit arch with the wordmark, flanked by gift shelves
    const bw = new THREE.Group(); bw.position.set(0, 0, DIM.back); IN.add(bw);
    const aw = 3.0, ar = 1.7;
    const bg = new THREE.Mesh(new THREE.ShapeGeometry(arch(aw, ar), 48), emissiveMat(gradientTex("#f2d3c5", "#e9c0b0", "#d29e8e"), 0.7)); bg.position.set(0, 0.6, 0.01); bw.add(bg);
    fixShapeUV(bg.geometry, aw, ar + aw / 2);
    const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(archRing(aw + 0.08, ar, 0.04), { depth: 0.05, bevelEnabled: false, curveSegments: 48 }), M.brass); ring.position.set(0, 0.6, 0.0); bw.add(ring);
    const word = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshStandardMaterial({ map: wordmarkTex("#b08a55"), transparent: true, metalness: 1, roughness: 0.28, color: 0xffe2b0 }));
    word.position.set(0, 2.55, 0.06); bw.add(word);
    const tagline = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.1), new THREE.MeshBasicMaterial({ map: textTex("SKIN · SCENT · COLOUR", "#7a4a4a", 1024, 64, 30), transparent: true }));
    tagline.position.set(0, 2.17, 0.06); bw.add(tagline);
    for (const s of [-1, 1]) {
      const sx = s * 3.35;
      for (const y of [1.1, 1.5, 1.9]) { box(1.6, 0.03, 0.32, walnutMat, sx, y, 0.16, bw, 0.004); for (let k = 0; k < 4; k++) { const c = 0.12 + rnd() * 0.06; box(c, c * 0.7, c * 0.9, lacquer(["#5a2e33", "#e9cfc5", "#f6efe8", "#c9a46a"][(k + (y * 10 | 0)) % 4], 0.5), sx - 0.6 + k * 0.4, y + 0.015 + c * 0.35, 0.16, bw, 0.004); } }
    }
  }

  // ======================= back corners: vanity and lounge =======================
  {
    // vanity bar on the right, with two lit mirrors and stools
    const g = new THREE.Group(); g.position.set(4.9, 0, DIM.back); IN.add(g);
    box(2.8, 0.06, 0.55, topMat, 0, 0.92, 0.3, g, 0.006);
    box(2.7, 0.86, 0.5, fluted(plumFluted, 66), 0, 0.45, 0.25, g);
    // both mirrors sit in one plane, so one planar reflection serves the pair
    const discs = mergeGeometries([-0.7, 0.7].map(x => new THREE.CircleGeometry(0.4, 64).translate(x, 0, 0)));
    let pair;
    if (HI) {
      pair = new Reflector(discs, { textureWidth: 1024, textureHeight: 512, color: 0xdcd8d3, clipBias: 0.003 });
      const orig = pair.onBeforeRender; let last = -1;
      pair.onBeforeRender = function (r, s, c) { if (c !== W.mainCamera || W.frameId === last) return; last = W.frameId; orig.call(this, r, s, c); };
    } else pair = new THREE.Mesh(discs, M.mirror);
    pair.position.set(0, 1.55, 0.052); g.add(pair);
    for (const x of [-0.7, 0.7]) {
      const mg = new THREE.Group(); mg.position.set(x, 1.55, 0.04); g.add(mg);
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.014, 12, 72), M.brass); frame.position.z = 0.012; mg.add(frame);
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; const b = mesh(new THREE.SphereGeometry(0.022, 16, 12), M.opal, Math.cos(a) * 0.45, Math.sin(a) * 0.45, 0.03, mg); b.castShadow = false; }
      if (models.stool) { const st = models.stool.clone(); st.position.set(x, 0, 1.0); st.rotation.y = Math.PI; g.add(st); }
      // brushes in a cup
      const cup = cyl(0.035, 0.035, 0.1, M.porcelain, x + 0.3, 0.995, 0.35, g, 32);
      for (let k = 0; k < 5; k++) { const br = cyl(0.004, 0.003, 0.16, M.blackLacquer, x + 0.3 + (rnd() - 0.5) * 0.03, 1.08, 0.35 + (rnd() - 0.5) * 0.03, g, 8); br.rotation.set((rnd() - 0.5) * 0.4, 0, (rnd() - 0.5) * 0.4); const hair = mesh(new THREE.ConeGeometry(0.008, 0.035, 10), matte("#c8a27a", 0.9), 0, 0.09, 0, br); hair.rotation.x = Math.PI; }
    }
    // a few things left out on the vanity, as if someone just tried them
    for (const [id, x, z, ry, lie] of [["palette", -0.95, 0.32, 0.3, 0], ["blush", -0.45, 0.42, -0.4, 0], ["lip-sindoor", 0.05, 0.4, 0.8, 0], ["foundation", 0.45, 0.3, -0.2, 0], ["lip-petal", 0.95, 0.42, 1.9, 0], ["mascara", 1.1, 0.3, 0.4, 1]]) {
      const pr = PRODUCTS.find(p => p.id === id); if (!pr) continue;
      const o = buildProduct(pr).root; o.position.set(x, 0.95, z); o.rotation.y = ry; if (lie) { o.rotation.z = Math.PI / 2; o.position.y += 0.012; } g.add(o);
    }
    W.obstacles.push({ x0: 3.4, x1: DIM.x, z0: DIM.back, z1: DIM.back + 1.45 });
    // lounge on the left: two velvet ottomans, a side table and a tree
    const l = new THREE.Group(); l.position.set(-4.9, 0, DIM.back + 1.3); IN.add(l);
    if (models.ottoman) { for (const [x, r] of [[-0.6, 0.3], [0.7, -0.4]]) { const o = models.ottoman.clone(); o.traverse(m => { if (m.isMesh) m.material = velvetMat; }); o.position.set(x, 0, 0); o.rotation.y = r; l.add(o); } }
    if (models.side) { const s = models.side.clone(); s.position.set(0.05, 0, -0.55); l.add(s); }
    if (models.tree) { const t = models.tree.clone(); t.position.set(-1.6, 0, -0.85); l.add(t); const t2 = models.tree.clone(); t2.position.set(DIM.x * 2 - 3.6, 0, -0.9); t2.rotation.y = 2; l.add(t2); }
    W.obstacles.push({ x0: -DIM.x, x1: -3.6, z0: DIM.back, z1: DIM.back + 2.1 });
  }
  // plants by the windows inside
  if (models.tree) for (const s of [-1, 1]) { const t = models.tree.clone(); t.scale.setScalar(0.9); t.position.set(s * 6.4, 0, 2.2); t.rotation.y = s; IN.add(t); W.obstacles.push({ x0: s * 6.4 - 0.5, x1: s * 6.4 + 0.5, z0: 1.7, z1: 2.7 }); }

  // ======================= facade and street =======================
  buildExterior(scene, W, { ext, models, M, HI, wallMat });

  // bounds
  W.bounds = { x0: -DIM.x + 0.35, x1: DIM.x - 0.35, z0: DIM.back + 0.35, z1: DIM.front - 0.45 };
  W.outside = { x0: -9, x1: 9, z0: DIM.front + 0.75, z1: 19 };
  return W;

  // ---------- helpers that need W ----------
  function shelfBlock(p, parent, cx, y, zc, maxW, { across = 5, deep = 2, spacing = 0.018 } = {}) {
    const holder = new THREE.Group(); holder.position.set(cx, y, zc); parent.add(holder);
    const proto = buildProduct(p);
    const stepX = proto.w + spacing, stepZ = proto.d + 0.012;
    const n = Math.max(1, Math.min(across, Math.floor(maxW / stepX)));
    let hot = null;
    for (let r = 0; r < deep; r++) for (let i = 0; i < n; i++) {
      const u = r === 0 && i === Math.floor(n / 2) ? proto : buildProduct(p);
      u.root.position.set((i - (n - 1) / 2) * stepX, 0, -r * stepZ + (deep - 1) * stepZ / 2);
      if (r > 0) u.root.position.x += stepX * 0.5 * (n > 1 ? 0 : 0);
      holder.add(u.root);
      if (u === proto) hot = u.root.position.clone().add(proto.hot);
    }
    blob(n * stepX + 0.08, deep * stepZ + 0.08, 0, 0.001, 0, holder, 0.28);
    return { p, root: holder, hot, unitH: proto.h, unitW: proto.w, unitD: proto.d };
  }
  function ringBlock(p, parent, spots, { yRot = 0 } = {}) {
    const holder = new THREE.Group(); parent.add(holder);
    let hot = null, unitH = 0;
    for (const [x, y, z, isHero] of spots) {
      const u = buildProduct(p);
      u.root.position.set(x, y, z); u.root.rotation.y = yRot + (isHero ? 0 : (x > 0 ? -0.35 : x < 0 ? 0.35 : 0));
      if (!isHero && spots.length <= 3) u.root.scale.setScalar(0.82);
      holder.add(u.root);
      if (isHero) { hot = new THREE.Vector3(x, y, z).add(u.hot); unitH = u.h; }
    }
    return { p, root: holder, hot, unitH };
  }
}

// ======================= exterior =======================
function buildExterior(scene, W, { ext, models, M, HI, wallMat }) {
  const X = new THREE.Group(); X.name = "exterior"; scene.add(X);
  const F = DIM.front, FD = 0.5; // facade thickness
  const stucco = pbrSet("white_stucco_02", 0.9, 0.9);
  const stone = ext(new THREE.MeshStandardMaterial({ map: stucco.map, normalMap: stucco.normalMap, normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: stucco.roughnessMap, color: 0xe6d6c2, roughness: 0.95 }));
  const stoneDark = ext(new THREE.MeshStandardMaterial({ map: stucco.map, normalMap: stucco.normalMap, normalScale: new THREE.Vector2(0.45, 0.45), color: 0xb9a690, roughness: 0.9 }));
  const bronze = ext(M.bronze.clone());
  const extGlass = ext(M.windowGlass.clone());
  const brass = ext(M.brass.clone());

  // facade with arched openings (door in the middle, two display windows)
  const FW = 20, FH = 9.4;
  const sh = new THREE.Shape(); sh.moveTo(-FW / 2, -0.4); sh.lineTo(FW / 2, -0.4); sh.lineTo(FW / 2, FH); sh.lineTo(-FW / 2, FH); sh.closePath();
  const openings = [
    { x: 0, w: 2.6, rect: 2.75, door: true },
    { x: -4.7, w: 3.4, rect: 2.35, sill: 0.55 },
    { x: 4.7, w: 3.4, rect: 2.35, sill: 0.55 },
  ];
  for (const o of openings) sh.holes.push(o.door ? arch(o.w, o.rect + 0.2, o.x, -0.2) : arch(o.w, o.rect, o.x, o.sill || 0));
  const upper = [-6.6, -2.2, 2.2, 6.6];
  for (const x of upper) { const h = new THREE.Path(); h.moveTo(x - 0.75, 5.95); h.lineTo(x + 0.75, 5.95); h.lineTo(x + 0.75, 8.1); h.lineTo(x - 0.75, 8.1); h.closePath(); sh.holes.push(h); }
  const fgeo = new THREE.ExtrudeGeometry(sh, { depth: FD, bevelEnabled: false, curveSegments: 48 });
  planarUV(fgeo, 1);
  const facade = new THREE.Mesh(fgeo, [stone, stone]); facade.position.z = F; facade.castShadow = facade.receiveShadow = true; X.add(facade);
  // inside face of the facade gets the interior plaster
  const innerMat = wallMat.clone(); innerMat.side = THREE.BackSide;
  const inner = new THREE.Mesh(new THREE.ShapeGeometry(sh, 48), innerMat); inner.position.z = F - 0.001; X.add(inner);
  const ztop = F + FD;
  // classical details: plinth, pilasters, cornices, parapet
  box(FW + 0.1, 0.5, 0.12, stoneDark, 0, 0.25, ztop + 0.05, X);
  for (const x of [-9.7, -2.0, 2.0, 9.7]) box(0.5, 4.55, 0.12, stone, x, 2.275, ztop + 0.05, X);
  const cornice = (y, dep) => { box(FW + 0.3, 0.16, dep, stone, 0, y, ztop + dep / 2 - 0.02, X); box(FW + 0.4, 0.08, dep + 0.08, stone, 0, y + 0.12, ztop + dep / 2 + 0.02, X); box(FW + 0.2, 0.06, dep - 0.06, stoneDark, 0, y - 0.1, ztop + dep / 2 - 0.05, X); };
  cornice(4.6, 0.32); cornice(9.25, 0.42);
  box(FW + 0.3, 0.6, 0.3, stone, 0, FH + 0.3 + 0.1, ztop - 0.1, X);
  // string course with a dentil band under the upper windows
  for (let x = -9.8; x <= 9.8; x += 0.28) box(0.12, 0.1, 0.08, stone, x, 4.45, ztop + 0.04, X);

  // arched frames, glass, the door and window displays
  for (const o of openings) {
    const y0 = o.sill || 0;
    const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(archRing(o.w, o.rect, 0.08), { depth: 0.12, bevelEnabled: false, curveSegments: 48 }), bronze);
    fr.position.set(o.x, y0, F + 0.18); X.add(fr);
    // keystone above the arch
    const ks = box(0.34, 0.5, 0.16, stone, o.x, y0 + o.rect + o.w / 2 + 0.16, ztop + 0.06, X); ks.geometry = new THREE.CylinderGeometry(0.14, 0.2, 0.5, 4, 1); ks.rotation.y = Math.PI / 4; ks.scale.set(1, 1, 0.45);
    // reveal (the stone thickness inside the opening)
    if (o.door) {
      // transom bar + fanlight with radiating glazing bars
      box(o.w, 0.1, 0.12, bronze, o.x, o.rect, F + 0.24, X);
      const fan = new THREE.Mesh(new THREE.ShapeGeometry(semi(o.w / 2 - 0.04, 32), 32), extGlass); fan.position.set(o.x, o.rect + 0.05, F + 0.24); X.add(fan);
      for (let k = 1; k < 6; k++) { const a = Math.PI * k / 6; const bar = box(0.035, o.w / 2 - 0.06, 0.04, bronze, o.x + Math.cos(a) * (o.w / 4 - 0.02), o.rect + 0.05 + Math.sin(a) * (o.w / 4 - 0.02), F + 0.245, X); bar.rotation.z = a - Math.PI / 2; }
      // two door leaves, hinged at the sides, opening inward
      for (const s of [-1, 1]) {
        const hinge = new THREE.Group(); hinge.position.set(o.x + s * (o.w / 2 - 0.08), 0, F + 0.2); X.add(hinge);
        const lw = o.w / 2 - 0.08, lh = o.rect - 0.05;
        const leaf = new THREE.Group(); leaf.position.x = -s * lw / 2; hinge.add(leaf);
        box(lw, 0.12, 0.05, bronze, 0, 0.06, 0, leaf); box(lw, 0.08, 0.05, bronze, 0, lh - 0.04, 0, leaf);
        box(0.07, lh, 0.05, bronze, -lw / 2 + 0.035, lh / 2, 0, leaf); box(0.07, lh, 0.05, bronze, lw / 2 - 0.035, lh / 2, 0, leaf);
        const gl = plane(lw - 0.1, lh - 0.2, extGlass, 0, lh / 2 + 0.02, 0, leaf); gl.renderOrder = 4;
        // long brass pull handle
        const handle = cyl(0.014, 0.014, 0.9, brass, s * (-lw / 2 + 0.14), 1.05, 0.07, leaf, 16);
        for (const yy of [0.66, 1.44]) { const st = cyl(0.008, 0.008, 0.06, brass, s * (-lw / 2 + 0.14), yy, 0.04, leaf, 8); st.rotation.x = Math.PI / 2; }
        W.doors.push({ obj: hinge, open: -s * 1.35, closed: 0 });
      }
      // door mat inside and step
      box(o.w + 0.4, 0.05, 0.5, stoneDark, o.x, 0.025, ztop + 0.25, X);
      const mat = box(1.8, 0.012, 1.1, matte("#2b2321", 0.95), 0, 0.006, F - 0.7, X);
      const matLogo = plane(1.2, 0.35, new THREE.MeshStandardMaterial({ map: textTex("S A E L L E", "#c9a46a", 1024, 256, 120, FONT_D), transparent: true, roughness: 0.9 }), 0, 0.0135, F - 0.7, X); matLogo.rotation.x = -Math.PI / 2;
    } else {
      // mullions for the display windows
      const g = new THREE.Mesh(new THREE.ShapeGeometry(arch(o.w - 0.14, o.rect, 0, 0), 48), extGlass); g.position.set(o.x, y0, F + 0.24); g.renderOrder = 4; X.add(g);
      box(0.05, o.rect, 0.05, bronze, o.x - o.w / 6, y0 + o.rect / 2, F + 0.26, X); box(0.05, o.rect, 0.05, bronze, o.x + o.w / 6, y0 + o.rect / 2, F + 0.26, X);
      box(o.w - 0.1, 0.05, 0.05, bronze, o.x, y0 + o.rect, F + 0.26, X);
      // stone sill
      box(o.w + 0.3, 0.1, 0.32, stoneDark, o.x, y0 - 0.02, ztop + 0.08, X);
      // the display inside: lit plinths and oversized bottles
      const d = new THREE.Group(); d.position.set(o.x, 0, F - 0.55); X.add(d);
      const backdrop = new THREE.Mesh(new THREE.ShapeGeometry(arch(o.w - 0.3, o.rect - 0.2), 40), emissiveMat(gradientTex("#f3d3c6", "#eabfaf", "#d99c8c"), 0.5));
      backdrop.position.set(0, y0 + 0.1, -0.45); d.add(backdrop); fixShapeUV(backdrop.geometry, o.w - 0.3, o.rect - 0.2 + (o.w - 0.3) / 2);
      const backBack = new THREE.Mesh(new THREE.ShapeGeometry(arch(o.w - 0.3, o.rect - 0.2), 40), wallMat); backBack.position.set(0, y0 + 0.1, -0.452); backBack.rotation.y = Math.PI; d.add(backBack);
      box(o.w - 0.1, y0, 0.9, M.plumLacquer, 0, y0 / 2, -0.05, d);
      const plinths = [[-0.75, 0.55, 0.34], [0.1, 0.32, 0.42], [0.85, 0.75, 0.3]];
      for (const [px, ph, pr] of plinths) mesh(lathe([[0, 0], [pr, 0], [pr, ph], [0, ph]], 64), M.blushLacquer, px, y0, -0.05, d);
      const big = PRODUCTS.find(p => p.id === (o.x < 0 ? "jasmine-night" : "rose-atelier"));
      const b1 = buildProduct(big).root; b1.scale.setScalar(5.2); b1.position.set(0.1, y0 + 0.32, -0.02); b1.rotation.y = -0.2; d.add(b1);
      const small = PRODUCTS.find(p => p.id === (o.x < 0 ? "dew-serum" : "lip-sindoor"));
      for (const [px, ph, s] of [[-0.75, 0.55, o.x < 0 ? 3.2 : 4.2], [0.85, 0.75, o.x < 0 ? 2.6 : 3.4]]) { const b = buildProduct(small).root; b.scale.setScalar(s); b.position.set(px, y0 + ph, -0.05); b.rotation.y = 0.3; d.add(b); }
      if (models.brass) { const v = models.brass.clone(); v.position.set(-1.25, y0, -0.2); v.scale.setScalar(0.9); d.add(v); }
      const sp = new THREE.SpotLight(0xffe7cf, HI ? 16 : 12, 4, 0.6, 0.6, 1.4); sp.position.set(0, 3.7, F - 0.2); sp.target.position.set(0, y0 + 0.4, F - 0.7); X.add(sp, sp.target);
      W.obstacles.push({ x0: o.x - o.w / 2 - 0.2, x1: o.x + o.w / 2 + 0.2, z0: F - 1.2, z1: F + 0.2 });
    }
  }
  // the sign: halo-lit brass letters on the frieze, and a tagline under them
  const sign = new THREE.Group(); sign.position.set(0, 5.35, ztop + 0.04); X.add(sign);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(1.6, 1.2, 0.85), toneMapped: false }));
  sign.add(halo);
  const letters = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), ext(new THREE.MeshStandardMaterial({ map: wordmarkTex("#8a6a3e"), transparent: true, metalness: 0.9, roughness: 0.32, color: 0xfff0d8 })));
  letters.position.z = 0.05; sign.add(letters);
  const letters2 = letters.clone(); letters2.material = letters.material.clone(); letters2.material.color = new THREE.Color(0x2a1c10); letters2.position.set(0.012, -0.012, 0.03); sign.add(letters2);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.16), new THREE.MeshBasicMaterial({ map: textTex("SKIN · SCENT · COLOUR", "#f1dcc4", 1024, 64, 30), transparent: true, color: new THREE.Color(1.3, 1.2, 1.1) }));
  tag.position.set(0, -0.62, 0.02); sign.add(tag);
  // wall lanterns either side of the door
  for (const s of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(s * 2.0, 2.65, ztop + 0.23); X.add(lg);
    box(0.1, 0.16, 0.06, bronze, 0, 0, -0.06, lg);
    const arm = cyl(0.012, 0.012, 0.16, bronze, 0, 0, 0.02, lg, 8); arm.rotation.x = Math.PI / 2;
    const cage = new THREE.Group(); cage.position.set(0, 0.04, 0.16); lg.add(cage);
    box(0.2, 0.03, 0.2, bronze, 0, 0.2, 0, cage); box(0.16, 0.02, 0.16, bronze, 0, -0.16, 0, cage);
    const pyr = mesh(new THREE.ConeGeometry(0.15, 0.12, 4), bronze, 0, 0.28, 0, cage); pyr.rotation.y = Math.PI / 4;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.014, 0.36, 0.014, bronze, x * 0.085, 0.02, z * 0.085, cage);
    const glow = box(0.15, 0.3, 0.15, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 1.0), toneMapped: false }), 0, 0.02, 0, cage); glow.castShadow = false;
    const pl = new THREE.PointLight(0xffc98f, 7, 6, 1.8); pl.position.set(0, 0.02, 0.1); cage.add(pl);
  }
  // upper floor windows: recessed, some lit behind sheer curtains, with iron balconettes
  upper.forEach((x, i) => {
    const lit = i === 1 || i === 2;
    const rec = new THREE.Group(); rec.position.set(x, 5.95, F); X.add(rec);
    box(1.5, 2.15, 0.02, lit ? emissiveMat(curtainTex(true), 0.7) : matte("#1a1513", 0.8), 0, 1.075, -0.15, rec);
    box(1.5, 0.02, 0.5, stone, 0, 0.0, 0.1, rec); box(1.5, 0.02, 0.5, stone, 0, 2.15, 0.1, rec);
    box(0.02, 2.15, 0.5, stone, -0.75, 1.075, 0.1, rec); box(0.02, 2.15, 0.5, stone, 0.75, 1.075, 0.1, rec);
    const g = plane(1.48, 2.13, extGlass, 0, 1.075, 0.05, rec); g.renderOrder = 4;
    box(0.05, 2.13, 0.05, M.ivory, 0, 1.075, 0.06, rec); box(1.48, 0.05, 0.05, M.ivory, 0, 1.5, 0.06, rec);
    for (const s of [-1, 1]) box(0.06, 2.15, 0.06, M.ivory, s * 0.72, 1.075, 0.06, rec);
    // pediment
    box(1.9, 0.14, 0.22, stone, 0, 2.35, 0.6, rec); box(1.75, 0.1, 0.16, stoneDark, 0, 2.26, 0.58, rec);
    // balconette
    const bal = new THREE.Group(); bal.position.set(0, 0, 0.75); rec.add(bal);
    box(1.8, 0.12, 0.4, stone, 0, -0.06, -0.08, bal);
    box(1.7, 0.03, 0.03, bronze, 0, 0.95, 0.08, bal);
    for (let k = 0; k <= 16; k++) box(0.016, 0.95, 0.016, bronze, -0.85 + k * (1.7 / 16), 0.475, 0.08, bal);
    for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.008, 6, 20), bronze); t.position.set(-0.6 + k * 0.4, 0.45, 0.08); bal.add(t); }
    if (lit) { const pl = new THREE.PointLight(0xffc48a, 4, 5, 1.8); pl.position.set(0, 1.4, 0.8); rec.add(pl); }
  });

  // pavement, kerb, road and the far kerb
  const pave = pbrSet("concrete_pavement", 7, 1.6);
  const paveMat = ext(new THREE.MeshStandardMaterial({ map: pave.map, normalMap: pave.normalMap, roughnessMap: pave.roughnessMap, color: 0xb6aea6, roughness: 0.8 }));
  const pv = plane(40, 5.2, paveMat, 0, 0.012, F + FD + 2.6, X); pv.rotation.x = -Math.PI / 2; pv.receiveShadow = true;
  box(40, 0.15, 0.25, ext(new THREE.MeshStandardMaterial({ color: 0x8d877f, roughness: 0.7 })), 0, 0.06, F + FD + 5.3, X);
  const asphalt = pbrSet("clean_asphalt", 8, 3);
  const roadMat = ext(new THREE.MeshPhysicalMaterial({ map: asphalt.map, normalMap: asphalt.normalMap, roughnessMap: asphalt.roughnessMap, color: 0x3f3b39, roughness: 0.7, clearcoat: 0.3, clearcoatRoughness: 0.25, envMapIntensity: 0.6 }));
  const road = plane(40, 10, roadMat, 0, -0.05, F + FD + 10.4, X); road.rotation.x = -Math.PI / 2; road.receiveShadow = true;
  // wet patches that mirror the shop lights
  const puddle = ext(new THREE.MeshPhysicalMaterial({ color: 0x1c1b1b, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, alphaMap: puddleTex(), transparent: true, depthWrite: false, envMapIntensity: 1.6 }));
  for (const [x, z, w, d, r] of [[-3.5, 13.5, 3.2, 1.4, 0.2], [2.8, 15.2, 4.2, 1.6, -0.1], [6.5, 12.6, 2.2, 1, 0.5], [-7.5, 16, 3, 1.4, 0.1]]) { const p = plane(w, d, puddle, x, -0.045, z, X); p.rotation.x = -Math.PI / 2; p.rotation.z = r; p.renderOrder = 1; }
  for (let x = -18; x < 18; x += 3.2) { const m = plane(1.6, 0.12, ext(new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 })), x, -0.044, F + FD + 10.6, X); m.rotation.x = -Math.PI / 2; }
  // far pavement so the road doesn't end in the void
  const pv2 = plane(40, 6, paveMat, 0, 0.012, F + FD + 18.4, X); pv2.rotation.x = -Math.PI / 2;
  box(40, 0.15, 0.25, ext(new THREE.MeshStandardMaterial({ color: 0x8d877f, roughness: 0.7 })), 0, 0.06, F + FD + 15.3, X);

  // planters with trees either side of the door
  for (const s of [-1, 1]) {
    const pg = new THREE.Group(); pg.position.set(s * 2.25, 0, ztop + 0.75); X.add(pg);
    mesh(lathe([[0, 0], [0.34, 0], [0.4, 0.62], [0.42, 0.66], [0.38, 0.68], [0, 0.6]], 48), ext(new THREE.MeshStandardMaterial({ color: 0x3a3330, roughness: 0.55, metalness: 0.2 })), 0, 0, 0, pg);
    if (models.tree) { const t = models.tree.clone(); t.scale.setScalar(1.05); t.position.y = 0.42; t.rotation.y = s * 1.3; pg.add(t); }
    W.obstacles.push({ x0: s * 2.25 - 0.45, x1: s * 2.25 + 0.45, z0: ztop + 0.3, z1: ztop + 1.2 });
  }
  // street lamps
  if (models.lamp) for (const x of [-8.6, 8.6]) { const l = models.lamp.clone(); l.position.set(x, 0, F + FD + 4.9); l.rotation.y = Math.PI; X.add(l); const pl = new THREE.PointLight(0xffc27e, 9, 12, 1.9); pl.position.set(x, 3.7, F + FD + 4.4); X.add(pl); }
  // neighbouring buildings to close the street
  const neighbour = (x0, x1, h, tint, seed) => {
    const w = x1 - x0, g = new THREE.Group(); g.position.set((x0 + x1) / 2, 0, F + 0.2); X.add(g);
    const m = ext(new THREE.MeshStandardMaterial({ map: stucco.map, normalMap: stucco.normalMap, normalScale: new THREE.Vector2(0.45, 0.45), color: tint, roughness: 0.95 }));
    box(w, h, 0.6, m, 0, h / 2, 0, g);
    const r = mulberry(seed);
    const cols = Math.floor(w / 2.2);
    for (let fl = 0; fl < Math.floor((h - 4.5) / 2.8); fl++) for (let c = 0; c < cols; c++) {
      const lit = r() > 0.55;
      const wx = -w / 2 + (c + 0.5) * (w / cols), wy = 5.4 + fl * 2.8;
      box(1.1, 1.7, 0.04, lit ? emissiveMat(curtainTex(r() > 0.5), 0.5 + r() * 0.4) : matte("#16120f", 0.7), wx, wy, 0.29, g);
      box(1.3, 0.1, 0.16, m, wx, wy - 0.9, 0.34, g);
    }
    // a closed shopfront at street level
    box(w - 1.2, 2.8, 0.05, ext(new THREE.MeshStandardMaterial({ map: shutterTex(), color: 0x8a8580, metalness: 0.3, roughness: 0.5 })), 0, 1.7, 0.3, g);
    box(w - 1, 0.5, 0.2, matte("#2a2522", 0.6), 0, 3.4, 0.38, g);
  };
  neighbour(-24, -10.05, 12.5, 0xcbb7a6, 3);
  neighbour(10.05, 24, 11.2, 0xb9a99a, 9);
  W.extGroup = X;
}

// ======================= small builders and textures =======================
function pendant(parent, x, z, y, M) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  cyl(0.06, 0.06, 0.02, M.brass, 0, DIM.ceil - 0.01, 0, g, 24).castShadow = false;
  cyl(0.004, 0.004, DIM.ceil - y - 0.2, M.brass, 0, (DIM.ceil + y + 0.2) / 2, 0, g, 8).castShadow = false;
  cyl(0.03, 0.04, 0.06, M.brass, 0, y + 0.19, 0, g, 24).castShadow = false;
  const globe = mesh(new THREE.SphereGeometry(0.18, 40, 28), M.opal, 0, y, 0, g); globe.castShadow = false;
  
}
function arch(w, rect, x = 0, y = 0) {
  const s = new THREE.Shape(); const r = w / 2;
  s.moveTo(x - r, y); s.lineTo(x + r, y); s.lineTo(x + r, y + rect);
  s.absarc(x, y + rect, r, 0, Math.PI, false);
  s.lineTo(x - r, y); s.closePath();
  return s;
}
function archRing(w, rect, t) {
  const s = arch(w + t * 2, rect);
  const h = new THREE.Path(); const r = w / 2;
  h.moveTo(-r, 0); h.lineTo(-r, rect); h.absarc(0, rect, r, Math.PI, 0, true); h.lineTo(r, 0); h.closePath();
  s.holes.push(h);
  return s;
}
function semi(r) { const s = new THREE.Shape(); s.moveTo(-r, 0); s.absarc(0, 0, r, Math.PI, 0, true); s.lineTo(-r, 0); return s; }
function stadium(L, D) {
  const r = D / 2, a = L / 2 - r;
  const s = new THREE.Shape(); s.moveTo(-a, -r); s.lineTo(a, -r); s.absarc(a, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-a, r); s.absarc(-a, 0, r, Math.PI / 2, Math.PI * 1.5, false); s.closePath();
  return s;
}
function fixShapeUV(geo, w, h) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, p.getY(i) / h);
  uv.needsUpdate = true;
}
function planarUV(geo, scale) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * scale, (p.getY(i) + p.getZ(i)) * scale);
  uv.needsUpdate = true;
}
// flutes run vertically: u follows the perimeter, v follows height
function fixFluteUV(geo) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const x = p.getX(i); uv.setXY(i, (x + Math.sign(p.getZ(i) || 1) * 0.0) * 14 + a * 0.0, p.getY(i)); }
  uv.needsUpdate = true;
}
function fixBoxFlute(geo, L, H) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + L / 2) * 14, (p.getY(i) + H / 2));
  uv.needsUpdate = true;
}
function fluteNormal() {
  return canvasTex(64, 4, (x, w, h) => {
    const img = x.createImageData(w, h);
    for (let i = 0; i < w; i++) {
      const t = i / w; const nx = Math.sin(t * Math.PI * 2) * 0.85; const nz = Math.sqrt(1 - nx * nx);
      for (let j = 0; j < h; j++) { const k = (j * w + i) * 4; img.data[k] = (nx * 0.5 + 0.5) * 255; img.data[k + 1] = 128; img.data[k + 2] = (nz * 0.5 + 0.5) * 255; img.data[k + 3] = 255; }
    }
    x.putImageData(img, 0, 0);
  }, { srgb: false });
}
// physical floor + a planar reflection, roughness-aware and blurred a touch
function reflectiveFloor(base, tex, tm) {
  const m = base.clone();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tReflect = { value: tex }; sh.uniforms.reflMatrix = { value: tm };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform mat4 reflMatrix; varying vec4 vReflUv;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvReflUv = reflMatrix * vec4( position, 1.0 );");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D tReflect; varying vec4 vReflUv;")
      .replace("#include <opaque_fragment>", `
        vec2 rUv = vReflUv.xy / vReflUv.w + normal.xy * 0.006;
        float bl = 0.0025 + roughnessFactor * 0.01;
        vec3 refl = texture2D(tReflect, rUv).rgb * 0.36;
        refl += texture2D(tReflect, rUv + vec2(bl, 0.)).rgb * 0.16; refl += texture2D(tReflect, rUv - vec2(bl, 0.)).rgb * 0.16;
        refl += texture2D(tReflect, rUv + vec2(0., bl)).rgb * 0.16; refl += texture2D(tReflect, rUv - vec2(0., bl)).rgb * 0.16;
        float fres = 0.18 + 0.82 * pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 4.0);
        outgoingLight += refl * fres * 0.55 * (1.0 - roughnessFactor * 0.75);
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => "reflfloor";
  return m;
}
function friezeTex(name, num, color = "#8a6a3e") {
  return canvasTex(2048, 136, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = color; x.textBaseline = "middle";
    x.font = `500 ${h * 0.34}px ${FONT_B}`; x.textAlign = "center";
    spaced(x, num + "   —   " + name.toUpperCase(), w / 2, h / 2, h * 0.16);
  });
}
function textTex(text, color, w, h, size, font = FONT_B) {
  return canvasTex(w, h, (x) => { x.clearRect(0, 0, w, h); x.fillStyle = color; x.textBaseline = "middle"; x.font = `500 ${size}px ${font}`; x.textAlign = "center"; spaced(x, text, w / 2, h / 2 + 2, size * 0.42); });
}
export function wordmarkTex(color) {
  return canvasTex(2048, 512, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    const g = x.createLinearGradient(0, h * 0.2, 0, h * 0.8);
    g.addColorStop(0, "#f5dfb0"); g.addColorStop(0.45, "#c9a066"); g.addColorStop(0.55, "#a87f48"); g.addColorStop(1, "#e9cd96");
    x.fillStyle = g; x.textBaseline = "middle"; x.font = `500 ${h * 0.62}px ${FONT_D}`;
    spaced(x, "SAELLE", w / 2, h / 2 + h * 0.04, h * 0.16);
  });
}
function haloTex() {
  return canvasTex(1024, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h);
    x.fillStyle = "#fff"; x.textBaseline = "middle"; x.font = `500 ${h * 0.5}px ${FONT_D}`;
    x.shadowColor = "rgba(255,210,150,1)"; x.shadowBlur = 40;
    for (let k = 0; k < 3; k++) spaced(x, "SAELLE", w / 2, h / 2 + h * 0.03, h * 0.13);
    x.globalCompositeOperation = "destination-out"; x.shadowBlur = 0; x.fillStyle = "rgba(0,0,0,.55)"; spaced(x, "SAELLE", w / 2, h / 2 + h * 0.03, h * 0.13);
  });
}
function curtainTex(warm) {
  return canvasTex(128, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, warm ? "#f4c58e" : "#d9c2a8"); g.addColorStop(1, warm ? "#b57440" : "#8f7a66");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 6) { x.fillStyle = `rgba(0,0,0,${0.06 + 0.06 * Math.sin(i * 0.7)})`; x.fillRect(i, 0, 3, h); }
  });
}
function shutterTex() {
  return canvasTex(256, 512, (x, w, h) => {
    x.fillStyle = "#5c5853"; x.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { const g = x.createLinearGradient(0, y, 0, y + 8); g.addColorStop(0, "#7a756f"); g.addColorStop(0.5, "#56524d"); g.addColorStop(1, "#3c3935"); x.fillStyle = g; x.fillRect(0, y, w, 8); }
    x.globalAlpha = 0.18; for (let i = 0; i < 40; i++) { x.fillStyle = i % 2 ? "#2a2724" : "#9a948c"; x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 30, 1 + Math.random() * 3); }
    x.globalAlpha = 1; x.fillStyle = "#2b2825"; x.fillRect(0, h - 18, w, 18);
  });
}
function puddleTex() {
  return canvasTex(256, 128, (x, w, h) => {
    x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
    const r = mulberry(11);
    for (let i = 0; i < 9; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.7, "rgba(255,255,255,.85)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.save(); x.translate(w * (0.2 + r() * 0.6), h * (0.3 + r() * 0.4)); x.scale(w * (0.12 + r() * 0.18), h * (0.15 + r() * 0.2)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); }
  }, { srgb: false });
}
function bagTex() {
  return canvasTex(256, 320, (x, w, h) => {
    x.fillStyle = "#e9cfc5"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#5a2e33"; x.textBaseline = "middle"; x.font = `500 46px ${FONT_D}`; spaced(x, "SAELLE", w / 2, h * 0.52, 8);
    x.font = `500 12px ${FONT_B}`; spaced(x, "SKIN · SCENT · COLOUR", w / 2, h * 0.64, 3);
  });
}
function launchCard() {
  return canvasTex(440, 600, (x, w, h) => {
    x.fillStyle = "#fbf7f4"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "#c9a46a"; x.lineWidth = 3; x.strokeRect(16, 16, w - 32, h - 32);
    x.fillStyle = "#b85c6e"; x.textAlign = "center"; x.font = `600 22px ${FONT_B}`; spaced(x, "NEW LAUNCH", w / 2, 90, 6);
    x.fillStyle = "#3a1f2b"; x.font = `500 64px ${FONT_D}`; x.fillText("Glow", w / 2, 210); x.fillText("Ritual", w / 2, 280);
    x.font = `500 22px ${FONT_B}`; x.fillStyle = "#5a2e33"; x.fillText("Niacinamide 10%", w / 2, 360); x.fillText("with rose water", w / 2, 392);
    x.font = `700 40px ${FONT_B}`; x.fillStyle = "#3a1f2b"; x.fillText("₹2,250", w / 2, 490);
  });
}
