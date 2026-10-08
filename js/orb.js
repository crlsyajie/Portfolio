/* ============================================
   The form
   A polished amber object behind the page. It morphs between five
   shapes (one per section, and click to cycle), leans toward the cursor,
   ripples where you click, and travels between sections as you scroll.
   Positions and shapes come from each section's data-orb attribute.
   ============================================ */
import * as THREE from './vendor/three.module.min.js';

export const SHAPES = ['Sphere', 'Twisted cube', 'Gem', 'Bloom', 'Hourglass'];

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
uniform vec3  uPointer;
uniform float uPointerAmt;
uniform float uPulse;
uniform vec3  uPulseDir;
uniform float uW[5];        // blend weights for the five shapes

varying vec3 vNormal;
varying vec3 vView;

${NOISE}

vec3 twistY(vec3 q, float a){
  float c = cos(a), s = sin(a);
  return vec3(c * q.x - s * q.z, q.y, s * q.x + c * q.z);
}
vec3 superEllipsoid(vec3 p, float n){
  vec3 a = abs(p) + 1e-5;
  return p / pow(pow(a.x, n) + pow(a.y, n) + pow(a.z, n), 1.0 / n);
}

// Every shape is a function of a point on the unit sphere, so they blend smoothly.
vec3 shapeAt(vec3 p){
  vec3 acc = vec3(0.0);
  if (uW[0] > 0.001) acc += uW[0] * p;                                   // sphere
  if (uW[1] > 0.001) {                                                    // twisted cube
    vec3 c = superEllipsoid(p, 9.0) * 0.8;
    acc += uW[1] * twistY(c, c.y * 1.6);
  }
  if (uW[2] > 0.001) {                                                    // gem
    acc += uW[2] * superEllipsoid(p, 1.15) * vec3(1.05, 1.35, 1.05);
  }
  if (uW[3] > 0.001) {                                                    // bloom
    float lon = atan(p.z, p.x);
    float petal = cos(6.0 * lon + p.y * 2.6) * (1.0 - p.y * p.y);
    acc += uW[3] * p * (0.92 + 0.22 * petal) * vec3(1.0, 0.86, 1.0);
  }
  if (uW[4] > 0.001) {                                                    // hourglass
    float w = 0.26 + 0.95 * pow(abs(p.y), 1.6);
    acc += uW[4] * twistY(vec3(p.x * w, p.y * 1.15, p.z * w), p.y * 0.8);
  }
  return acc;
}

float displace(vec3 p){
  float n = snoise(p * uFreq + vec3(0.0, uTime * 0.1, uTime * 0.07));
  n += 0.2 * snoise(p * uFreq * 1.9 - vec3(uTime * 0.08));
  float d = n * uAmp;
  d += pow(max(dot(p, uPointer), 0.0), 5.0) * 0.1 * uPointerAmt;
  float ang = acos(clamp(dot(p, uPulseDir), -1.0, 1.0));
  d += sin(ang * 9.0 - (1.0 - uPulse) * 18.0) * uPulse * 0.06;
  return d;
}

vec3 surface(vec3 p){
  p = normalize(p);
  vec3 sp = shapeAt(p);
  return sp + normalize(sp) * displace(p);
}

void main(){
  vec3 p = normalize(position);
  vec3 pos = surface(p);

  float e = 0.004;
  vec3 t = normalize(cross(p, abs(p.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 b = normalize(cross(p, t));
  vec3 n = normalize(cross(surface(p + t * e) - pos, surface(p + b * e) - pos));
  if (dot(n, pos) < 0.0) n = -n;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vNormal = normalize(normalMatrix * n);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

// Polished amber metal under a soft studio rig. The reflections come from a
// procedural environment: a softbox overhead, a tall strip right, a dimmer one left.
const fragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uLift;       // 0 on the dark page, 1 on the light page

varying vec3 vNormal;
varying vec3 vView;

vec3 studio(vec3 r){
  float top   = smoothstep(0.25, 0.9, r.y);
  float right = exp(-pow((r.x - 0.6) * 4.2, 2.0)) * smoothstep(-0.6, 0.4, r.y);
  float left  = exp(-pow((r.x + 0.75) * 6.0, 2.0)) * smoothstep(-0.3, 0.6, r.y);
  float front = exp(-pow(length(r.xy - vec2(-0.25, 0.35)) * 2.2, 2.0)) * step(0.0, r.z);
  float bounce = smoothstep(-0.1, -0.9, r.y);
  vec3 warm = vec3(1.0, 0.95, 0.88);
  // On the light page the room around the form is pale too, so its shadows reflect paper, not black.
  vec3 room = mix(vec3(0.06, 0.05, 0.04), vec3(0.42, 0.36, 0.3) * (0.55 + 0.45 * smoothstep(-0.8, 0.6, r.y)), uLift);
  return warm * (top * 1.35 + right * 1.15 + left * 0.5 + front * 0.35)
       + vec3(0.55, 0.25, 0.08) * bounce * 0.22
       + room;
}

void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  vec3 R = reflect(-V, N);
  float NdV = max(dot(N, V), 0.0);

  vec3 F = uColor + (1.0 - uColor) * pow(1.0 - NdV, 5.0);   // metal: reflections tinted amber
  vec3 col = studio(R) * F;

  vec3 L = normalize(vec3(-0.4, 0.8, 0.5));
  col += uColor * max(dot(N, L), 0.0) * 0.16;
  vec3 H = normalize(L + V);
  col += vec3(1.0, 0.96, 0.9) * pow(max(dot(N, H), 0.0), 220.0) * 1.4;

  col = 1.0 - exp(-col * 1.5);
  gl_FragColor = vec4(col, 1.0);
}
`;

const wrap = (i) => ((i % SHAPES.length) + SHAPES.length) % SHAPES.length;

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
    uAmp: { value: 0.05 },
    uFreq: { value: 0.95 },
    uPointer: { value: new THREE.Vector3(0, 0, 1) },
    uPointerAmt: { value: 0 },
    uPulse: { value: 0 },
    uPulseDir: { value: new THREE.Vector3(0, 0, 1) },
    uW: { value: [1, 0, 0, 0, 0] },
    uColor: { value: new THREE.Color(1.0, 0.5, 0.17) },
    uLift: { value: 0 }
  };

  const detail = window.innerWidth < 700 ? 36 : 56;
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, detail),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
  );
  scene.add(mesh);

  const target = { x: 0.16, y: 0, s: 1, amp: 0.05, shape: 0 };
  const current = { x: 0.16, y: 0, s: 1, amp: 0.05 };
  const pointer = { x: 0, y: 0, has: false };
  let liftTarget = 0;
  let shapeOffset = 0;              // each click moves the shape on by one
  let currentShape = 0;
  let rotX = 0, rotY = 0;
  const introStart = performance.now();
  let running = true;
  let idle = false;
  let width = 1, height = 1;
  const listeners = [];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const viewHalfH = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;

  function screenCircle() {
    const halfH = viewHalfH();
    const halfW = halfH * camera.aspect;
    return {
      cx: (mesh.position.x / halfW) * 0.5 * width + width / 2,
      cy: -(mesh.position.y / halfH) * 0.5 * height + height / 2,
      r: (mesh.scale.x / halfH) * 0.5 * height
    };
  }

  function wantedShape() { return wrap(target.shape + shapeOffset); }
  function announce() { const i = wantedShape(); listeners.forEach(fn => fn(i, SHAPES[i])); }

  function pulse(nx = 0, ny = 0) {
    const z = Math.sqrt(Math.max(0, 1 - Math.min(1, nx * nx + ny * ny)));
    const dir = new THREE.Vector3(nx, ny, z).normalize();
    dir.applyQuaternion(mesh.quaternion.clone().invert());
    uniforms.uPulseDir.value.copy(dir);
    uniforms.uPulse.value = 1;
  }

  function nextShape(nx = 0, ny = 0) {
    shapeOffset += 1;
    pulse(nx, ny);
    announce();
    wake();
  }

  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.has = true; }, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('a, button, input, textarea, label, select, dialog, [role="dialog"], .ring-stage')) return;
    const { cx, cy, r } = screenCircle();
    const dx = e.clientX - cx, dy = e.clientY - cy;
    if (Math.hypot(dx, dy) > r * 1.1) return;
    nextShape(dx / r, -dy / r);
  });

  const clock = new THREE.Clock();
  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = reduceMotion ? 1 : 1 - Math.pow(0.006, dt);    // unhurried, frame-rate independent easing

    current.x += (target.x - current.x) * k;
    current.y += (target.y - current.y) * k;
    current.s += (target.s - current.s) * k;
    current.amp += (target.amp - current.amp) * k;

    const t = Math.min(1, (performance.now() - introStart) / 1800);
    const intro = reduceMotion ? 1 : 1 - Math.pow(1 - t, 4);

    const halfH = viewHalfH();
    const halfW = halfH * camera.aspect;
    mesh.position.set(current.x * halfW * 2, current.y * halfH * 2, 0);
    mesh.scale.setScalar(Math.max(current.s * intro * Math.min(halfH * 0.62, halfW * 0.9), 0.0001));

    let near = 0;
    if (pointer.has) {
      const { cx, cy, r } = screenCircle();
      const dx = (pointer.x - cx) / Math.max(r, 1);
      const dy = (pointer.y - cy) / Math.max(r, 1);
      near = Math.max(0, 1 - Math.max(0, Math.hypot(dx, dy) - 0.6) / 1.4);
      const dir = new THREE.Vector3(dx, -dy, 0.8).normalize();
      dir.applyQuaternion(mesh.quaternion.clone().invert());
      uniforms.uPointer.value.lerp(dir, 0.12);
      rotY += ((dx * 0.3) - rotY) * 0.04;
      rotX += ((dy * 0.2) - rotX) * 0.04;
    }
    uniforms.uPointerAmt.value += (near - uniforms.uPointerAmt.value) * 0.06;

    // morph toward the wanted shape
    const want = wantedShape();
    const w = uniforms.uW.value;
    const km = reduceMotion ? 1 : 1 - Math.pow(0.05, dt);
    let morphing = false;
    for (let i = 0; i < w.length; i++) {
      const goal = i === want ? 1 : 0;
      w[i] += (goal - w[i]) * km;
      if (Math.abs(goal - w[i]) > 0.002) morphing = true; else w[i] = goal;
    }
    currentShape = want;

    if (!reduceMotion) uniforms.uTime.value += dt;
    uniforms.uAmp.value = current.amp + uniforms.uPointerAmt.value * 0.03;
    uniforms.uPulse.value = Math.max(0, uniforms.uPulse.value - dt * 0.8);
    uniforms.uLift.value += (liftTarget - uniforms.uLift.value) * (reduceMotion ? 1 : 1 - Math.pow(0.02, dt));
    const lifting = Math.abs(liftTarget - uniforms.uLift.value) > 0.002;

    mesh.rotation.y = uniforms.uTime.value * 0.12 + rotY;
    mesh.rotation.x = rotX + Math.sin(uniforms.uTime.value * 0.2) * 0.08;

    renderer.render(scene, camera);
    const settling = Math.abs(target.x - current.x) > 0.0005 || Math.abs(target.s - current.s) > 0.0005;
    if (!reduceMotion || uniforms.uPulse.value > 0 || settling || morphing || lifting) requestAnimationFrame(frame);
    else idle = true;
  }
  function wake() { if (idle && running) { idle = false; clock.getDelta(); requestAnimationFrame(frame); } }
  window.addEventListener('pointermove', wake, { passive: true });
  window.addEventListener('scroll', wake, { passive: true });

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); requestAnimationFrame(frame); }
  });
  requestAnimationFrame(frame);

  return {
    setTarget(t) {
      const before = wantedShape();
      Object.assign(target, t);
      if (wantedShape() !== before) announce();
      wake();
    },
    nextShape() { nextShape(); },
    setTheme(light) { liftTarget = light ? 1 : 0; wake(); },
    onShapeChange(fn) { listeners.push(fn); },
    get shape() { return currentShape; }
  };
}
