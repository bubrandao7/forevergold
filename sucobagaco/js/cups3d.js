import * as THREE from '../vendor/three.module.min.js';
const T = THREE;
const H = 2.8;
const YS = 2.37, YT = 2.785;
const rAt = (y) => 0.70 + 0.27 * (y / H);
const outerR = (y) => rAt(y) + (y > YS ? 0.04 : 0.012);
const rnd = (seed) => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (x) => 1 - Math.pow(1 - x, 3);

let S = null;
function shared() {
  if (S) return S;
  const R = rnd(11), N = 512;
  const h = new Float32Array(N * N), wet = new Uint8Array(N * N);
  const drop = (cx, cy, rad, st = 1) => {
    const ry = rad * st;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      if (y < 0 || y >= N) continue;
      for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) {
        const dx = (x - cx) / rad, dy = (y - cy) / ry, d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const k = y * N + (((x % N) + N) % N), v = Math.sqrt(1 - d);
        if (v > h[k]) h[k] = v;
        wet[k] = 1;
      }
    }
  };
  for (let i = 0; i < 3400; i++) drop(R() * N, R() * N, 0.7 + R() * 1.3);
  for (let i = 0; i < 340; i++) drop(R() * N, R() * N, 2 + R() * 3.2, 1 + R() * 0.35);
  for (let i = 0; i < 12; i++) {
    const x = R() * N, y0 = R() * N * 0.55, len = 50 + R() * 140;
    for (let y = y0; y < y0 + len; y += 1) drop(x + Math.sin(y * 0.06) * 1.2, y, 1 + ((y - y0) / len) * 1.4);
    drop(x, y0 + len + 2, 3.6 + R() * 2, 1.3);
  }
  const nc = cnv(N, N), nx = nc.getContext('2d'), nd = nx.createImageData(N, N);
  const rc = cnv(N, N), rx = rc.getContext('2d'), rd = rx.createImageData(N, N);
  const g = (x, y) => h[Math.min(N - 1, Math.max(0, y)) * N + (((x % N) + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = y * N + x, i = k * 4, s = 2.4;
    let a = -(g(x + 1, y) - g(x - 1, y)) * s, b = -(g(x, y - 1) - g(x, y + 1)) * s, c = 1;
    const l = Math.hypot(a, b, c); a /= l; b /= l; c /= l;
    nd.data[i] = (a * 0.5 + 0.5) * 255; nd.data[i + 1] = (b * 0.5 + 0.5) * 255; nd.data[i + 2] = (c * 0.5 + 0.5) * 255; nd.data[i + 3] = 255;
    const r = wet[k] ? 5 : 22 + R() * 22;
    rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = r; rd.data[i + 3] = 255;
  }
  nx.putImageData(nd, 0, 0); rx.putImageData(rd, 0, 0);

  const sc = cnv(512, 512), sx = sc.getContext('2d');
  sx.fillStyle = '#fff'; sx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const x = R() * 512, y = R() * 512, r = 20 + R() * 70, gr = sx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    sx.fillStyle = gr; sx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 9000; i++) { const v = (175 + R() * 60) | 0; sx.fillStyle = `rgb(${v},${v},${v})`; const s = R() < 0.85 ? 1 : 2; sx.fillRect(R() * 512, R() * 512, s, s); }
  const ec = cnv(512, 512), ex = ec.getContext('2d');
  ex.fillStyle = '#000'; ex.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) { const v = (110 + R() * 145) | 0; ex.fillStyle = `rgb(${v},${v},${v})`; const s = R() < 0.8 ? 1 : 2; ex.fillRect(R() * 512, R() * 512, s, s); }

  const shc = cnv(256, 256), shx = shc.getContext('2d'), sg = shx.createRadialGradient(128, 128, 0, 128, 128, 128);
  sg.addColorStop(0, 'rgba(255,255,255,1)'); sg.addColorStop(0.35, 'rgba(255,255,255,.55)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  shx.fillStyle = sg; shx.fillRect(0, 0, 256, 256);

  const wrap = (c, srgb, rep) => { const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.wrapT = T.ClampToEdgeWrapping; if (srgb) t.colorSpace = T.SRGBColorSpace; if (rep) t.repeat.set(rep, 1); t.anisotropy = 8; return t; };
  S = {
    normal: wrap(nc, false, 2), rough: wrap(rc, false, 2),
    slush: wrap(sc, true, 1), specks: wrap(ec, true, 1), soft: new T.CanvasTexture(shc),
    cupGeo: cupGeo(), liqGeo: liqGeo(), dropGeo: new T.SphereGeometry(0.028, 16, 12),
  };
  return S;
}

function bifTex() {
  const W = 1024, Hh = 1024, c = cnv(W, Hh), x = c.getContext('2d'), R = rnd(5);
  const top = '#FFB52E', bot = '#E3263F', base = Hh * 0.5;
  const yb = (i) => base + Math.sin((i / W) * Math.PI * 6) * 28 + Math.sin((i / W) * Math.PI * 14 + 1) * 9;
  x.fillStyle = bot; x.fillRect(0, 0, W, Hh);
  x.filter = 'blur(5px)';
  x.beginPath(); x.moveTo(-20, -20); x.lineTo(W + 20, -20);
  for (let i = W + 20; i >= -20; i -= 4) x.lineTo(i, yb(i));
  x.closePath(); x.fillStyle = top; x.fill();
  x.filter = 'blur(9px)'; x.strokeStyle = 'rgba(255,232,206,.9)'; x.lineWidth = 16; x.beginPath();
  for (let i = -20; i <= W + 20; i += 4) (i === -20 ? x.moveTo(i, yb(i)) : x.lineTo(i, yb(i)));
  x.stroke();
  x.filter = 'blur(3px)'; x.strokeStyle = 'rgba(214,28,52,.38)';
  for (let k = 0; k < 5; k++) {
    const sx0 = (k + 0.3 + R() * 0.4) * (W / 5); x.lineWidth = 2 + R() * 3; x.beginPath();
    const y0 = yb(sx0), y1 = 40 + R() * 260; x.moveTo(sx0, y0);
    for (let y = y0; y > y1; y -= 6) x.lineTo(sx0 + Math.sin(y * 0.03 + k) * 6, y);
    x.stroke();
  }
  x.filter = 'none';
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.35})`; x.fillRect(R() * W, R() * Hh, 1.5, 1.5); }
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(90,0,10,${0.08 + R() * 0.12})`; x.fillRect(R() * W, R() * Hh, 1.5, 1.5); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.anisotropy = 8;
  return t;
}

function cupGeo() {
  const o = [[0, 0], [0.6, 0], [0.675, 0.012], [0.69, 0.05], [0.695, 0.15], [rAt(0.19) + 0.012, 0.185]];
  for (let i = 1; i <= 20; i++) { const y = 0.185 + ((YS - 0.04 - 0.185) * i) / 20; o.push([rAt(y) + 0.012, y]); }
  o.push([rAt(YS) + 0.04, YS]);
  for (let i = 1; i <= 6; i++) { const y = YS + ((YT - YS) * i) / 6; o.push([rAt(y) + 0.04, y]); }
  const inner = o.slice(1).reverse().map(([r, y]) => [Math.max(0, r - 0.014), Math.max(0.014, y)]);
  inner.push([0, 0.014]);
  const pts = o.concat(inner).map(([r, y]) => new T.Vector2(r, y));
  const geo = new T.LatheGeometry(pts, 128);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / H);
  return geo;
}

function liqGeo() {
  const pts = [], y0 = 0.05, y1 = 2.69;
  pts.push(new T.Vector2(0, y0));
  for (let i = 0; i <= 24; i++) { const y = y0 + ((y1 - y0) * i) / 24; pts.push(new T.Vector2(rAt(y) - 0.022 - (y < 0.2 ? 0.012 : 0), y)); }
  const rt = rAt(y1) - 0.022;
  [[0.95, 2.73], [0.84, 2.77], [0.66, 2.8], [0.42, 2.82], [0.2, 2.83], [0, 2.832]].forEach(([f, y]) => pts.push(new T.Vector2(rt * f, y)));
  const g = new T.LatheGeometry(pts, 96);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / H);
  return g;
}

function makeEnv(renderer, tint) {
  const s = new T.Scene();
  const base = new T.Color(tint).multiplyScalar(0.16).add(new T.Color(0.1, 0.1, 0.1));
  const room = new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: base, side: T.BackSide }));
  room.position.y = 5; s.add(room);
  const panel = (w, h, pos, k, col = 0xffffff) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(col).multiplyScalar(k), side: T.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 1.2, 0); s.add(m);
  };
  panel(1.3, 10, [-5, 2.5, 3.2], 10);
  panel(0.9, 10, [5.4, 2.5, 1.6], 6);
  panel(12, 12, [0, 11, 0], 2.4);
  panel(9, 1.6, [0, -0.6, 8], 1.3, 0xfff1e0);
  panel(5, 8, [-3, 2, -8], 1.2, 0xffe2c4);
  const pm = new T.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return tex;
}

export function mount(canvas, o) {
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = T.NeutralToneMapping;
  renderer.toneMappingExposure = o.exposure ?? 1.05;
  renderer.setClearColor(0x000000, 0);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sh = shared();
  const scene = new T.Scene();
  scene.environment = makeEnv(renderer, o.env || '#888888');
  const key = new T.DirectionalLight(0xffffff, 1.3); key.position.set(-3, 6, 4); scene.add(key);
  const cam = new T.PerspectiveCamera(22, 1, 0.1, 100);
  const logo = new T.TextureLoader().load(o.logo);
  logo.colorSpace = T.SRGBColorSpace; logo.anisotropy = 8;

  const cupMat = new T.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 1, roughnessMap: sh.rough, normalMap: sh.normal,
    normalScale: new T.Vector2(0.75, 0.75), transmission: 1, thickness: 0.06, ior: 1.45, envMapIntensity: 1.25, specularIntensity: 1,
  });
  const rimMat = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.08, transmission: 1, thickness: 0.05, ior: 1.45, envMapIntensity: 1.4 });
  const dropMat = new T.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.08, ior: 1.33, envMapIntensity: 1.6 });
  for (const m of [cupMat, rimMat, dropMat]) {
    m.transparent = true; m.blending = T.CustomBlending;
    m.blendSrc = T.SrcAlphaFactor; m.blendDst = T.OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = T.OneFactor; m.blendDstAlpha = T.OneFactor;
  }
  const decalMat = new T.MeshPhysicalMaterial({
    map: logo, transparent: true, alphaTest: 0.02, roughness: 0.3, metalness: 0, depthWrite: false,
    emissive: 0xffffff, emissiveMap: logo, emissiveIntensity: 0.1, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const dY0 = 0.98, dY1 = 2.18, arc = 1.49, L = arc / rAt((dY0 + dY1) / 2);
  const decalGeo = new T.CylinderGeometry(rAt(dY1) + 0.017, rAt(dY0) + 0.017, dY1 - dY0, 64, 1, true, -L / 2, L);
  const rimGeo = new T.TorusGeometry(rAt(YT) + 0.04, 0.022, 16, 160);
  const R = rnd(3);

  const units = o.cups.map((c, i) => {
    const root = new T.Group(); root.position.set(c.x || 0, 0, c.z || 0); root.scale.setScalar(c.s || 1); scene.add(root);
    const body = new T.Group(); root.add(body);
    const bif = c.flavor === 'bifasico';
    const liqMat = new T.MeshPhysicalMaterial({
      color: bif ? 0xffffff : c.flavor, map: bif ? bifTex() : sh.slush, roughness: 0.5, bumpMap: sh.slush, bumpScale: 0.4,
      emissive: 0xffffff, emissiveMap: sh.specks, emissiveIntensity: 0.16, sheen: 0.5, sheenColor: new T.Color(1, 1, 1), sheenRoughness: 0.5,
      clearcoat: 0.35, clearcoatRoughness: 0.35,
    });
    const liquid = new T.Mesh(sh.liqGeo, liqMat); body.add(liquid);
    const cup = new T.Mesh(sh.cupGeo, cupMat); body.add(cup);
    const rim = new T.Mesh(rimGeo, rimMat); rim.rotation.x = Math.PI / 2; rim.position.y = YT + 0.005; body.add(rim);
    const decal = new T.Mesh(decalGeo, decalMat); decal.position.y = (dY0 + dY1) / 2; decal.renderOrder = 3; body.add(decal);
    const glowMat = new T.MeshBasicMaterial({ map: sh.soft, color: bif ? '#FF7A2E' : c.flavor, transparent: true, opacity: 0.55, depthWrite: false });
    const glow = new T.Mesh(new T.PlaneGeometry(2.8, 1.5), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.set(0.55, 0.002, -0.4); glow.renderOrder = 1; root.add(glow);
    const shMat = new T.MeshBasicMaterial({ map: sh.soft, color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false });
    const shadow = new T.Mesh(new T.PlaneGeometry(2.1, 1.0), shMat); shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.12, 0.004, 0.05); shadow.renderOrder = 2; root.add(shadow);
    const drops = [];
    for (let k = 0; k < (c.drops ?? 5); k++) {
      const m = new T.Mesh(sh.dropGeo, dropMat); m.scale.set(1, 1.35, 0.45); body.add(m);
      drops.push({ m, a: (R() - 0.5) * 1.8, y: 0.5 + R() * 1.7, v: 0.04 + R() * 0.05, ph: R() * 10 });
    }
    return { c, i, root, body, liquid, liqMat, glowMat, shMat, shadow, drops, target: new T.Color(bif ? 0xffffff : c.flavor), bif };
  });

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    const v = o.view, tf = Math.tan(T.MathUtils.degToRad(cam.fov / 2));
    const d = Math.max(v.h / 2 / tf, v.w / 2 / (tf * cam.aspect));
    cam.position.set(0, v.cy + d * 0.12, d); cam.lookAt(0, v.cy, 0); cam.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let tx = 0, ty = 0, px = 0, py = 0;
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1.5, 1.5);
    ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1.5, 1.5);
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  let visible = false, started = null, raf = 0, armed = !o.wait;
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.05 });
  io.observe(canvas);
  const clock = new T.Clock();
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (!visible) return;
    for (const u of units) u.root.visible = armed;
    if (!armed) { renderer.render(scene, cam); return; }
    const t = reduce ? 0 : clock.elapsedTime;
    if (started === null) started = clock.elapsedTime;
    const e = reduce ? 99 : clock.elapsedTime - started;
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;
    let sr = 0;
    if (o.scrollSpin) {
      const r = canvas.getBoundingClientRect();
      sr = (clamp((innerHeight - r.top) / (innerHeight + r.height)) - 0.5) * o.scrollSpin;
    }
    for (const u of units) {
      const c = u.c, ph = c.phase ?? u.i * 1.7, dl = c.delay ?? u.i * 0.18;
      const intro = ease(clamp((e - dl) / 1.3)), fill = ease(clamp((e - 0.55 - dl) / 1.9));
      const bob = reduce ? 0 : Math.sin(t * 0.9 + ph) * 0.07;
      u.body.position.y = 0.13 + bob - (1 - intro) * 1.6;
      const motion = (o.spin ?? c.spin) ? t * (o.spin ?? c.spin) : Math.sin(t * 0.32 + ph) * (c.swing ?? 0.35);
      u.body.rotation.y = (c.ry || 0) + motion + sr + px * 0.28;
      u.body.rotation.z = -px * 0.035 + Math.sin(t * 0.7 + ph) * 0.012;
      u.body.rotation.x = py * 0.045;
      let mul = 1;
      if (u.refill != null) {
        const k = clock.elapsedTime - u.refill;
        if (k < 0.42) mul = 1 - ease(k / 0.42) * 0.93;
        else {
          if (u.pending) { u.liqMat.color.set(u.pending); u.target.set(u.pending); u.pending = null; }
          mul = 0.07 + 0.93 * ease(clamp((k - 0.42) / 1.05));
          if (k > 1.5) u.refill = null;
        }
        u.body.rotation.z += Math.sin(k * 14) * 0.012 * (1 - clamp(k / 1.5));
      }
      u.liquid.scale.y = Math.max(0.015, fill * mul);
      const lift = u.body.position.y - 0.13;
      u.shadow.scale.setScalar(clamp(1 - lift * 0.5, 0.6, 1.2));
      u.shMat.opacity = clamp(0.72 - lift * 0.9, 0, 0.8) * intro;
      u.glowMat.opacity = 0.5 * fill;
      if (!u.bif) { if (u.refill == null) u.liqMat.color.lerp(u.target, 0.06); u.glowMat.color.lerp(u.pending ? u.glowMat.color : u.target, 0.05); u.glowMat.opacity *= mul; }
      else u.liqMat.map.offset.x = t * 0.006;
      for (const d of u.drops) {
        d.y -= dt * d.v * (Math.sin(t * 1.6 + d.ph) > 0.55 ? 3.4 : 0.18);
        if (d.y < 0.3) { d.y = 1.7 + R() * 0.55; d.a = (R() - 0.5) * 1.8; }
        const r = outerR(d.y) + 0.01;
        d.m.position.set(Math.sin(d.a) * r, d.y, Math.cos(d.a) * r); d.m.rotation.y = d.a;
        d.m.visible = fill * mul > 0.9;
      }
    }
    renderer.render(scene, cam);
  };
  frame();

  return {
    setFlavor(i, hex) { const u = units[i]; if (!u || u.bif) return; if (reduce) { u.liqMat.color.set(hex); u.target.set(hex); return; } u.pending = hex; u.refill = clock.elapsedTime; },
    start() { if (!armed) { armed = true; started = null; } },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove); renderer.dispose(); },
  };
}
