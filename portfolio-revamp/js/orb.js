/* ============================================
   The orange orb
   A noise-displaced sphere that sits behind the page. It reacts to the
   cursor, ripples when clicked, and travels between sections as you
   scroll (positions come from each section's data-orb attribute).
   ============================================ */
import * as THREE from './vendor/three.module.min.js';

const NOISE = /* glsl */ `
// Simplex 3D noise — Ian McEwan, Ashima Arts (MIT)
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform vec3  uPointer;     // pointer direction in object space
uniform float uPointerAmt;  // 0..1, how close the pointer is
uniform float uPulse;       // 0..1, decays after a click
uniform vec3  uPulseDir;

varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;

${NOISE}

float displace(vec3 p){
  float n = snoise(p * uFreq + vec3(0.0, uTime * 0.16, uTime * 0.1));
  n += 0.22 * snoise(p * uFreq * 1.9 - vec3(uTime * 0.12));
  float d = n * uAmp;
  // a soft bulge toward the pointer
  float toward = max(dot(normalize(p), uPointer), 0.0);
  d += pow(toward, 5.0) * 0.16 * uPointerAmt;
  // ripple travelling outward from where it was clicked
  float ang = acos(clamp(dot(normalize(p), uPulseDir), -1.0, 1.0));
  float wave = sin(ang * 9.0 - (1.0 - uPulse) * 18.0) * uPulse;
  d += wave * 0.09;
  return d;
}

void main(){
  vec3 p = position;
  float d = displace(p);
  vec3 displaced = p + normal * d;

  // recompute the normal from two nearby displaced points
  float e = 0.01;
  vec3 t = normalize(cross(normal, abs(normal.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 b = normalize(cross(normal, t));
  vec3 pt = p + t * e; vec3 pb = p + b * e;
  vec3 dt = pt + normalize(pt) * displace(pt);
  vec3 db = pb + normalize(pb) * displace(pb);
  vec3 n = normalize(cross(dt - displaced, db - displaced));
  if (dot(n, normal) < 0.0) n = -n;

  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  vNormal = normalize(normalMatrix * n);
  vView = normalize(-mv.xyz);
  vDisp = d;
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uDeep;
uniform vec3 uRim;

varying vec3 vNormal;
varying vec3 vView;
varying float vDisp;

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  vec3 L = normalize(vec3(-0.45, 0.75, 0.6));
  vec3 L2 = normalize(vec3(0.8, -0.3, 0.4));

  float diff = max(dot(N, L), 0.0);
  float fill = max(dot(N, L2), 0.0) * 0.25;
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 60.0) * 0.55;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);

  vec3 col = mix(uDeep, uColor, smoothstep(0.0, 1.0, diff * 0.85 + fill + 0.15));
  col += vDisp * 0.35 * uColor;           // peaks catch a little more light
  col += uRim * fres * 0.55;
  col += vec3(1.0, 0.93, 0.85) * spec;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createOrb(canvas, { reduceMotion = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.18 },
    uFreq: { value: 0.95 },
    uPointer: { value: new THREE.Vector3(0, 0, 1) },
    uPointerAmt: { value: 0 },
    uPulse: { value: 0 },
    uPulseDir: { value: new THREE.Vector3(0, 0, 1) },
    uColor: { value: new THREE.Color('#ff7a1a') },
    uDeep: { value: new THREE.Color('#8f2d00') },
    uRim: { value: new THREE.Color('#ffd2a8') }
  };

  const detail = window.innerWidth < 700 ? 40 : 64;
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, detail),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
  );
  scene.add(mesh);

  // ---- state ----
  const target = { x: 0.2, y: 0, s: 1, amp: 0.18 };
  const current = { x: 0.2, y: 0, s: 1, amp: 0.18 };
  const pointer = { x: 0, y: 0, inside: false, has: false };
  let rotX = 0, rotY = 0;
  let introStart = performance.now();
  let running = true;
  let width = 1, height = 1;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // Visible half-height of the view at z = 0, used to map section positions.
  const viewHalfH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

  // Orb centre and radius in screen pixels, for hit-testing the pointer.
  function screenCircle() {
    const halfH = viewHalfH();
    const halfW = halfH * camera.aspect;
    const cx = (mesh.position.x / halfW) * 0.5 * width + width / 2;
    const cy = -(mesh.position.y / halfH) * 0.5 * height + height / 2;
    const r = (mesh.scale.x / halfH) * 0.5 * height;
    return { cx, cy, r };
  }

  function onPointerMove(e) {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true;
  }
  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('a, button, input, textarea, label, select, [role="dialog"], .ring-stage')) return;
    const { cx, cy, r } = screenCircle();
    const dx = e.clientX - cx, dy = e.clientY - cy;
    if (Math.hypot(dx, dy) > r * 1.1) return;
    pulse(dx / r, -dy / r);
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown);

  function pulse(nx = 0, ny = 0) {
    const z = Math.sqrt(Math.max(0, 1 - Math.min(1, nx * nx + ny * ny)));
    const dir = new THREE.Vector3(nx, ny, z).normalize();
    // into object space so the ripple starts where you clicked
    dir.applyQuaternion(mesh.quaternion.clone().invert());
    uniforms.uPulseDir.value.copy(dir);
    uniforms.uPulse.value = 1;
  }

  function setTarget(t) { Object.assign(target, t); }

  const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = reduceMotion ? 1 : 1 - Math.pow(0.0025, dt);   // frame-rate independent easing

    current.x += (target.x - current.x) * k;
    current.y += (target.y - current.y) * k;
    current.amp += (target.amp - current.amp) * k;

    // intro: grow in once with a little overshoot
    const t = Math.min(1, (performance.now() - introStart) / 1400);
    const intro = reduceMotion ? 1 : 1 + Math.sin(t * Math.PI) * 0.06 * (1 - t) - Math.pow(1 - t, 3);
    current.s += (target.s - current.s) * k;

    const halfH = viewHalfH();
    const halfW = halfH * camera.aspect;
    mesh.position.set(current.x * halfW * 2, current.y * halfH * 2, 0);
    const scale = current.s * Math.max(0, intro) * Math.min(halfH * 0.62, halfW * 0.9);
    mesh.scale.setScalar(Math.max(scale, 0.0001));

    // pointer: tilt toward it and bulge when it's close
    let near = 0;
    if (pointer.has) {
      const { cx, cy, r } = screenCircle();
      const dx = (pointer.x - cx) / Math.max(r, 1);
      const dy = (pointer.y - cy) / Math.max(r, 1);
      const dist = Math.hypot(dx, dy);
      near = Math.max(0, 1 - Math.max(0, dist - 0.6) / 1.4);
      const dir = new THREE.Vector3(dx, -dy, 0.8).normalize();
      dir.applyQuaternion(mesh.quaternion.clone().invert());
      uniforms.uPointer.value.lerp(dir, 0.15);
      rotY += ((dx * 0.35) - rotY) * 0.05;
      rotX += ((dy * 0.25) - rotX) * 0.05;
    }
    uniforms.uPointerAmt.value += (near - uniforms.uPointerAmt.value) * 0.08;

    if (!reduceMotion) uniforms.uTime.value += dt;
    uniforms.uAmp.value = current.amp + uniforms.uPointerAmt.value * 0.05;
    uniforms.uPulse.value = Math.max(0, uniforms.uPulse.value - dt * 0.9);

    mesh.rotation.y = uniforms.uTime.value * 0.08 + rotY;
    mesh.rotation.x = rotX;

    renderer.render(scene, camera);
    if (!reduceMotion || uniforms.uPulse.value > 0 || Math.abs(target.x - current.x) > 0.0005) {
      requestAnimationFrame(frame);
    } else {
      // with reduced motion, only redraw on demand
      idle = true;
    }
  }
  let idle = false;
  const wake = () => { if (idle && running) { idle = false; clock.getDelta(); requestAnimationFrame(frame); } };
  window.addEventListener('pointermove', wake, { passive: true });
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('pointerdown', wake);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); requestAnimationFrame(frame); }
  });

  requestAnimationFrame(frame);

  return {
    setTarget: (t) => { setTarget(t); wake(); },
    pulse: (x, y) => { pulse(x, y); wake(); },
    restartIntro: () => { introStart = performance.now(); }
  };
}
