import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const byId = (id) => document.getElementById(id);
const ui = {
  loading: byId('loading'),
  loadStatus: byId('load-status'),
  loadFill: byId('load-fill'),
  hud: byId('hud'),
  message: byId('message'),
  arsenal: byId('arsenal'),
  start: byId('start-wave'),
  speed: byId('speed'),
  wave: byId('wave'),
  lives: byId('lives'),
  gold: byId('gold'),
  info: byId('tower-info'),
  infoName: byId('tower-name'),
  infoStats: byId('tower-stats'),
  closeInfo: byId('close-info'),
  fatal: byId('fatal'),
  fatalText: byId('fatal-text'),
  result: byId('result'),
  resultTitle: byId('result-title'),
  resultText: byId('result-text'),
  replay: byId('replay')
};

const stage = byId('stage');
const RAW = 'https://raw.githubusercontent.com/sion-rgb/tactical-slash/main/assets/';
const MODEL_URLS = {
  enemy: RAW + 'characters/enemy/enemy_swordsman.glb',
  archer: RAW + 'characters/player/player_archer.glb',
  wall: RAW + 'environment/dungeon_wall.glb',
  pillar: RAW + 'environment/dungeon_pillar.glb',
  tree: RAW + 'environment/nature_tree.glb',
  bush: RAW + 'environment/nature_bush.glb',
  rock: RAW + 'environment/nature_rock.glb',
  crate: RAW + 'environment/dungeon_crate.glb'
};

const towerDefs = {
  archer: { name: 'ARCHER POST', cost: 180, range: 4.8, damage: 25, shots: 0.9 },
  ballista: { name: 'BALLISTA', cost: 270, range: 6.3, damage: 68, shots: 0.38 },
  watchtower: { name: 'WATCHTOWER', cost: 145, range: 5.5, damage: 16, shots: 1.22 }
};

const game = {
  gold: 900,
  lives: 20,
  wave: 0,
  maxWaves: 12,
  speed: 1,
  active: false,
  ended: false,
  spawnLeft: 0,
  spawnTimer: 0,
  enemies: [],
  towers: [],
  shots: [],
  effects: [],
  selectedTower: null,
  drag: null
};

let scene;
let camera;
let renderer;
let clock;
let raycaster;
let pointer;
let loader;
let assets = {};
let roadCurve;
let roadSamples = [];
let roadLength = 1;
let waterTexture;
let glowTexture;

function showFatal(message) {
  ui.loading.classList.add('hidden');
  ui.fatalText.textContent = message;
  ui.fatal.classList.remove('hidden');
  console.error(message);
}

function setMessage(message) {
  ui.message.textContent = message;
}

function updateHud() {
  ui.wave.textContent = game.wave + ' / ' + game.maxWaves;
  ui.lives.textContent = game.lives;
  ui.gold.textContent = Math.floor(game.gold);
  document.querySelectorAll('.tower-card').forEach((button) => {
    const def = towerDefs[button.dataset.tower];
    button.classList.toggle('poor', game.gold < def.cost);
  });
}

function loadingProgress(done, total, text) {
  ui.loadStatus.textContent = text;
  ui.loadFill.style.width = Math.max(4, Math.round((done / total) * 100)) + '%';
}

function createCanvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

function makeGrassTexture() {
  return createCanvasTexture(512, 512, (ctx, canvas) => {
    ctx.fillStyle = '#536c45';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 3200; i += 1) {
      const green = 52 + Math.random() * 70;
      const alpha = 0.03 + Math.random() * 0.08;
      ctx.fillStyle = 'rgba(' + Math.floor(green) + ',' + Math.floor(green + 24) + ',' + Math.floor(green * 0.62) + ',' + alpha + ')';
      const size = 0.6 + Math.random() * 2.3;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function makeRoadTexture() {
  return createCanvasTexture(512, 256, (ctx, canvas) => {
    ctx.fillStyle = '#b69c6d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 26) {
      const offset = (Math.floor(y / 26) % 2) * 21;
      for (let x = -30; x < canvas.width + 30; x += 42) {
        const shade = 110 + Math.floor(Math.random() * 35);
        ctx.fillStyle = 'rgba(' + shade + ',' + Math.floor(shade * 0.9) + ',' + Math.floor(shade * 0.68) + ',0.32)';
        ctx.strokeStyle = 'rgba(70,56,41,0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x + offset, y + 2, 37, 20, 4);
        else ctx.rect(x + offset, y + 2, 37, 20);
        ctx.fill();
        ctx.stroke();
      }
    }
  });
}

function makeWaterTexture() {
  return createCanvasTexture(512, 512, (ctx, canvas) => {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#2b6879');
    gradient.addColorStop(0.5, '#174b5b');
    gradient.addColorStop(1, '#0d3545');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 95; i += 1) {
      const alpha = 0.035 + Math.random() * 0.11;
      ctx.strokeStyle = 'rgba(177,225,231,' + alpha + ')';
      ctx.lineWidth = 1 + Math.random() * 1.8;
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 45 + Math.random() * 115, y + Math.random() * 4 - 2);
      ctx.stroke();
    }
  });
}

function makeGlowTexture() {
  const texture = createCanvasTexture(256, 256, (ctx) => {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 126);
    gradient.addColorStop(0, 'rgba(255,245,190,1)');
    gradient.addColorStop(0.22, 'rgba(255,172,74,0.92)');
    gradient.addColorStop(0.58, 'rgba(255,80,22,0.23)');
    gradient.addColorStop(1, 'rgba(255,70,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function makeFlagTexture() {
  const texture = createCanvasTexture(256, 160, (ctx) => {
    ctx.fillStyle = '#8d1925';
    ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#f0dca8';
    ctx.beginPath();
    ctx.arc(106, 80, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d1925';
    ctx.beginPath();
    ctx.arc(122, 72, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0dca8';
    ctx.font = '38px Georgia';
    ctx.fillText('✦', 137, 92);
  });
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function initializeRenderer() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x78909a);
  scene.fog = new THREE.Fog(0x819397, 19, 40);

  const aspect = window.innerWidth / window.innerHeight;
  const span = 17;
  camera = new THREE.OrthographicCamera(-span * aspect / 2, span * aspect / 2, span / 2, -span / 2, 0.1, 100);
  camera.position.set(15.5, 18, 20);
  camera.lookAt(0, 0, -0.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  stage.appendChild(renderer.domElement);

  const hemisphere = new THREE.HemisphereLight(0xc5dae1, 0x3d4936, 2.2);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffdfad, 3.8);
  sun.position.set(-8, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 55;
  sun.shadow.bias = -0.0007;
  scene.add(sun);

  const coolFill = new THREE.DirectionalLight(0x78acc2, 0.75);
  coolFill.position.set(12, 8, -12);
  scene.add(coolFill);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  clock = new THREE.Clock();
  glowTexture = makeGlowTexture();
  window.addEventListener('resize', resizeRenderer);
}

function resizeRenderer() {
  if (!renderer) return;
  const aspect = window.innerWidth / window.innerHeight;
  const span = 17;
  camera.left = -span * aspect / 2;
  camera.right = span * aspect / 2;
  camera.top = span / 2;
  camera.bottom = -span / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function prepareModel(root) {
  root.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.material) node.material = node.material.clone();
    }
  });
  return root;
}

function cloneAsset(key, targetHeight) {
  const source = assets[key];
  if (!source) return null;
  const model = prepareModel(SkeletonUtils.clone(source.scene));
  const box = new THREE.Box3().setFromObject(model);
  const height = Math.max(0.001, box.max.y - box.min.y);
  model.scale.setScalar(targetHeight / height);
  const scaledBox = new THREE.Box3().setFromObject(model);
  model.position.y -= scaledBox.min.y;
  const holder = new THREE.Group();
  holder.add(model);
  holder.userData.model = model;
  return holder;
}

function findClip(key, patterns) {
  const clips = assets[key] && assets[key].animations ? assets[key].animations : [];
  for (const pattern of patterns) {
    const match = clips.find((clip) => pattern.test(clip.name));
    if (match) return match;
  }
  return clips.length ? clips[0] : null;
}

function createAnimationController(holder, key, moving) {
  if (!holder || !holder.userData.model || !assets[key]) return null;
  const mixer = new THREE.AnimationMixer(holder.userData.model);
  const idleClip = findClip(key, [/idle/i, /breath/i]);
  const walkClip = findClip(key, [/walk/i, /run/i]);
  const attackClip = findClip(key, [/shoot/i, /ranged/i, /attack/i, /slash/i]);
  const deathClip = findClip(key, [/death/i, /defeat/i, /die/i]);
  const controller = {
    mixer,
    idle: idleClip ? mixer.clipAction(idleClip) : null,
    walk: walkClip ? mixer.clipAction(walkClip) : null,
    attack: attackClip ? mixer.clipAction(attackClip) : null,
    death: deathClip ? mixer.clipAction(deathClip) : null,
    current: null
  };
  const start = moving ? (controller.walk || controller.idle) : (controller.idle || controller.walk);
  if (start) {
    start.play();
    controller.current = start;
  }
  return controller;
}

function playOneShot(controller, action) {
  if (!controller || !action) return;
  if (controller.current && controller.current !== action) controller.current.fadeOut(0.08);
  action.reset();
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.fadeIn(0.05).play();
  const restore = () => {
    controller.mixer.removeEventListener('finished', restore);
    if (controller.idle && action !== controller.death) {
      action.fadeOut(0.08);
      controller.idle.reset().fadeIn(0.08).play();
      controller.current = controller.idle;
    }
  };
  controller.mixer.addEventListener('finished', restore);
}

async function loadModels() {
  loader = new GLTFLoader();
  const entries = Object.entries(MODEL_URLS);
  let done = 0;
  for (const [key, url] of entries) {
    loadingProgress(done, entries.length, 'Loading ' + key.replace('_', ' ') + '…');
    try {
      assets[key] = await loader.loadAsync(url);
    } catch (error) {
      console.warn('Model failed:', key, error);
      assets[key] = null;
    }
    done += 1;
    loadingProgress(done, entries.length, 'Loaded ' + done + ' / ' + entries.length + ' scene assets');
  }
  if (!assets.enemy || !assets.archer || !assets.wall || !assets.pillar) {
    throw new Error('Core animated character or fortress assets could not be loaded.');
  }
}

function makeRibbon(curve, width, material, y, segments = 150) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    [-1, 1].forEach((side) => {
      positions.push(point.x + normal.x * width * 0.5, y, point.z + normal.z * width * 0.5);
      uvs.push(t, side < 0 ? 0 : 1);
    });
    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, c, d, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function distanceToRoad(x, z) {
  let nearest = 999;
  for (const point of roadSamples) nearest = Math.min(nearest, Math.hypot(x - point.x, z - point.z));
  return nearest;
}

function placeAsset(key, x, z, height, rotation = 0, parent = scene) {
  const model = cloneAsset(key, height);
  if (!model) return null;
  model.position.set(x, 0, z);
  model.rotation.y = rotation;
  parent.add(model);
  return model;
}

function addFlag(parent, x, y, z, rotation = 0, scale = 1) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 2.1, 8),
    new THREE.MeshStandardMaterial({ color: 0x4b3626, roughness: 0.85 })
  );
  pole.position.set(x, y + 1, z);
  pole.castShadow = true;
  parent.add(pole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 0.7),
    new THREE.MeshStandardMaterial({ map: makeFlagTexture(), side: THREE.DoubleSide, roughness: 0.72 })
  );
  flag.position.set(x + 0.56 * Math.cos(rotation), y + 1.68, z - 0.56 * Math.sin(rotation));
  flag.rotation.y = rotation;
  flag.scale.setScalar(scale);
  flag.castShadow = true;
  parent.add(flag);
}

function addHouse(x, z, scale = 1, rotation = 0) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.8 * scale, 1.2 * scale, 1.45 * scale),
    new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xc7b28d : 0xd7ceb6, roughness: 0.94 })
  );
  body.position.y = 0.6 * scale;
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.5 * scale, 0.85 * scale, 4),
    new THREE.MeshStandardMaterial({ color: 0x914b33, roughness: 0.86 })
  );
  roof.position.y = 1.55 * scale;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  group.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.38 * scale, 0.66 * scale, 0.06 * scale),
    new THREE.MeshStandardMaterial({ color: 0x513725, roughness: 0.95 })
  );
  door.position.set(0, 0.33 * scale, 0.755 * scale);
  group.add(door);
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  scene.add(group);
}

function buildWorld() {
  const grassTexture = makeGrassTexture();
  grassTexture.repeat.set(5, 3);
  const terrain = new THREE.Mesh(
    new THREE.PlaneGeometry(29, 18),
    new THREE.MeshStandardMaterial({ map: grassTexture, color: 0xb8c39e, roughness: 0.97 })
  );
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.07;
  terrain.receiveShadow = true;
  scene.add(terrain);

  waterTexture = makeWaterTexture();
  waterTexture.repeat.set(2.4, 5);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(6.2, 18),
    new THREE.MeshPhysicalMaterial({ map: waterTexture, color: 0x5a92a0, roughness: 0.25, clearcoat: 0.55, clearcoatRoughness: 0.2 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-11.8, -0.025, 0);
  scene.add(water);

  roadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-13, 0, 3.2),
    new THREE.Vector3(-9.7, 0, 3.05),
    new THREE.Vector3(-7.6, 0, 1.25),
    new THREE.Vector3(-5.1, 0, 2.4),
    new THREE.Vector3(-2.7, 0, 0.45),
    new THREE.Vector3(-0.4, 0, 1.5),
    new THREE.Vector3(2.2, 0, -0.5),
    new THREE.Vector3(4.9, 0, 0.25),
    new THREE.Vector3(7.1, 0, -2.2),
    new THREE.Vector3(10.7, 0, -2.1),
    new THREE.Vector3(13, 0, -2.1)
  ], false, 'catmullrom', 0.22);
  roadLength = roadCurve.getLength();
  roadSamples = Array.from({ length: 151 }, (_, i) => roadCurve.getPointAt(i / 150));

  const edge = makeRibbon(
    roadCurve,
    2.55,
    new THREE.MeshStandardMaterial({ color: 0x544938, roughness: 1 }),
    0.005
  );
  edge.receiveShadow = true;
  scene.add(edge);

  const roadTexture = makeRoadTexture();
  roadTexture.repeat.set(13, 1.6);
  const road = makeRibbon(
    roadCurve,
    2.14,
    new THREE.MeshStandardMaterial({ map: roadTexture, color: 0xe4cd99, roughness: 0.98 }),
    0.026
  );
  road.receiveShadow = true;
  scene.add(road);

  const quay = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.5, 18),
    new THREE.MeshStandardMaterial({ color: 0xb5a382, roughness: 0.95 })
  );
  quay.position.set(-8.9, 0.18, 0);
  quay.castShadow = quay.receiveShadow = true;
  scene.add(quay);

  const walls = new THREE.Group();
  scene.add(walls);
  [-6.2, -4.9, -0.2, 1.1, 2.4, 3.7, 5.0, 6.3].forEach((z) => placeAsset('wall', 10.9, z, 2.3, Math.PI / 2, walls));
  [-3.6, -2.0].forEach((z) => {
    const tower = placeAsset('pillar', 10.65, z, 4.15, 0, walls);
    if (tower) addFlag(tower, 0, 2.55, 0, 0, 0.72);
  });

  const gateBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 1.0, 2.7),
    new THREE.MeshStandardMaterial({ color: 0x78654e, roughness: 0.94 })
  );
  gateBeam.position.set(10.85, 2.75, -2.8);
  gateBeam.castShadow = true;
  scene.add(gateBeam);

  addHouse(12.8, -5.2, 1.05, 0.2);
  addHouse(13.1, 1.4, 0.9, -0.25);
  addHouse(8.9, 4.8, 0.72, 0.4);
  addHouse(7.2, 5.6, 0.6, -0.2);
  addHouse(-6.7, -5.2, 0.65, 0.1);
  addHouse(-4.8, -5.9, 0.55, -0.4);

  const treeSpots = [
    [-7.3, -3.5, 3.2], [-5.7, -2.9, 2.8], [-3.8, -4.7, 3.4], [-1.9, -4.2, 3.0],
    [0.5, -4.8, 3.7], [2.7, -4.8, 3.1], [4.6, -4.1, 2.9], [6.7, -5.3, 3.4],
    [8.7, -5.3, 2.8], [-7.2, 5.5, 2.7], [-4.9, 5.3, 3.3], [-2.2, 5.7, 2.9],
    [0.5, 5.3, 3.5], [3.0, 5.9, 3.0], [5.8, 5.3, 3.5], [8.1, 4.5, 2.8]
  ];
  treeSpots.forEach(([x, z, height]) => {
    if (distanceToRoad(x, z) > 1.9) placeAsset('tree', x, z, height, (x + z) * 0.3);
  });

  [[-7.7, -1.7], [-6.1, 4.5], [-3.6, 4.6], [-1, 4.8], [1.2, -3.5], [3.5, 3.8], [5.8, 3.7], [7.8, 2.6], [8.3, -4.1], [-4.8, -3.4]].forEach(([x, z]) => placeAsset('bush', x, z, 0.7, x - z));
  [[-7.5, -5.6], [-6.2, -4.7], [-3.3, 5.4], [1.5, 5.5], [4.7, -4.7], [7.8, 3.6]].forEach(([x, z]) => placeAsset('rock', x, z, 0.8, x * z));

  for (let i = 0; i < 7; i += 1) placeAsset('crate', -7.9 + i * 0.45, -6.4 + (i % 2) * 0.55, 0.55, i * 0.6);

  addFlag(scene, 9.85, 2.1, -3.65, 0, 0.82);
  addFlag(scene, 9.85, 2.1, -1.95, 0, 0.82);

  const gateGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xff8735,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  gateGlow.position.set(10.2, 0.95, -2.1);
  gateGlow.scale.set(1.1, 1.1, 1.1);
  scene.add(gateGlow);
  game.effects.push({ kind: 'pulse', object: gateGlow, phase: 0, base: 1.1 });
}

function towerFoundation(radius) {
  const group = new THREE.Group();
  const stone = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.08, 0.28, 12),
    new THREE.MeshStandardMaterial({ color: 0x8f8878, roughness: 0.94 })
  );
  stone.position.y = 0.14;
  stone.castShadow = stone.receiveShadow = true;
  group.add(stone);
  return group;
}

function buildBallista() {
  const group = towerFoundation(0.82);
  const wood = new THREE.MeshStandardMaterial({ color: 0x70472b, roughness: 0.84 });
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x38271f, roughness: 0.86 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x626365, roughness: 0.45, metalness: 0.58 });
  const pivot = new THREE.Group();
  pivot.position.y = 0.5;
  group.add(pivot);

  [-0.42, 0.42].forEach((x) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.65), wood);
    beam.position.set(x, 0.2, 0);
    beam.castShadow = true;
    pivot.add(beam);
  });

  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.18, 1.55), darkWood);
  bed.position.y = 0.28;
  bed.castShadow = true;
  pivot.add(bed);

  [-0.68, 0.68].forEach((x) => {
    [-0.48, 0.48].forEach((z) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.12, 12), darkWood);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.12, z);
      wheel.castShadow = true;
      pivot.add(wheel);
    });
  });

  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.16), wood);
  crossbar.position.set(0, 0.65, 0.32);
  crossbar.castShadow = true;
  pivot.add(crossbar);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.12, 0.12), wood);
  leftArm.position.set(-0.55, 0.67, 0.32);
  leftArm.rotation.y = -0.25;
  pivot.add(leftArm);
  const rightArm = leftArm.clone();
  rightArm.position.x = 0.55;
  rightArm.rotation.y = 0.25;
  pivot.add(rightArm);

  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 2.2, 7), metal);
  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(0, 0.75, 0.62);
  bolt.castShadow = true;
  pivot.add(bolt);

  const stringPoints = [new THREE.Vector3(-1.05, 0.68, 0.52), new THREE.Vector3(0, 0.72, -0.2), new THREE.Vector3(1.05, 0.68, 0.52)];
  pivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(stringPoints), new THREE.LineBasicMaterial({ color: 0xe0cda6 })));

  group.userData.turret = pivot;
  group.userData.muzzle = new THREE.Vector3(0, 1.25, 1.35);
  return group;
}

function buildArcherTower(type) {
  const watch = type === 'watchtower';
  const group = towerFoundation(watch ? 0.72 : 0.86);
  const pillar = cloneAsset('pillar', watch ? 3.4 : 2.75);
  if (pillar) {
    pillar.position.y = 0.2;
    group.add(pillar);
  }

  const platformY = watch ? 3.22 : 2.63;
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.82, 0.18, 8),
    new THREE.MeshStandardMaterial({ color: 0x704a30, roughness: 0.88 })
  );
  platform.position.y = platformY;
  platform.castShadow = platform.receiveShadow = true;
  group.add(platform);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.67, 0.11, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0xb8ad95, roughness: 0.94 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = platformY + 0.13;
  group.add(rim);

  const turret = new THREE.Group();
  turret.position.y = platformY + 0.13;
  const archer = cloneAsset('archer', 1.05);
  let animation = null;
  if (archer) {
    archer.rotation.y = Math.PI;
    turret.add(archer);
    animation = createAnimationController(archer, 'archer', false);
  }
  group.add(turret);
  addFlag(group, 0.52, platformY - 0.15, -0.2, Math.PI / 2, 0.48);

  group.userData.turret = turret;
  group.userData.animation = animation;
  group.userData.muzzle = new THREE.Vector3(0, platformY + 1.0, 0.55);
  return group;
}

function buildTowerModel(type, ghost) {
  const model = type === 'ballista' ? buildBallista() : buildArcherTower(type);
  if (ghost) {
    model.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material = node.material.clone();
        node.material.transparent = true;
        node.material.opacity = 0.45;
        node.material.depthWrite = false;
      }
    });
  }
  return model;
}

function makeRangeRing(range, color) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(range - 0.035, range + 0.035, 96),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  return ring;
}

function validPlacement(x, z) {
  if (x <= -7.9 || x >= 9.3 || z <= -6.8 || z >= 6.8) return false;
  if (distanceToRoad(x, z) <= 1.75) return false;
  return game.towers.every((tower) => Math.hypot(tower.x - x, tower.z - z) > 1.8);
}

function placeTower(type, x, z) {
  const def = towerDefs[type];
  if (!def || game.gold < def.cost) return;
  game.gold -= def.cost;
  const object = buildTowerModel(type, false);
  object.position.set(x, 0, z);
  scene.add(object);

  const ring = makeRangeRing(def.range, 0xd8bd75);
  ring.position.set(x, 0.06, z);
  ring.visible = false;
  scene.add(ring);

  const tower = {
    type,
    x,
    z,
    object,
    ring,
    range: def.range,
    damage: def.damage,
    shots: def.shots,
    cooldown: Math.random() * 0.3,
    turret: object.userData.turret,
    animation: object.userData.animation,
    muzzle: object.userData.muzzle,
    recoil: 0
  };
  game.towers.push(tower);
  object.traverse((node) => {
    if (node.isMesh) node.userData.tower = tower;
  });
  burst(new THREE.Vector3(x, 0.45, z), 0xe8c66f, 1.3);
  selectTower(tower);
  updateHud();
}

function selectTower(tower) {
  game.selectedTower = tower;
  game.towers.forEach((item) => { item.ring.visible = item === tower; });
  if (!tower) {
    ui.info.classList.add('hidden');
    return;
  }
  const def = towerDefs[tower.type];
  ui.infoName.textContent = def.name;
  ui.infoStats.textContent = 'Damage ' + tower.damage + ' · Range ' + tower.range.toFixed(1) + ' · Fire rate ' + tower.shots.toFixed(2) + '/s';
  ui.info.classList.remove('hidden');
}

function pointerToGround(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const point = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  return raycaster.ray.intersectPlane(plane, point) ? point : null;
}

function beginTowerDrag(event, type) {
  const def = towerDefs[type];
  if (game.ended || !def || game.gold < def.cost) {
    setMessage('Not enough Gold for that defence.');
    return;
  }
  event.preventDefault();
  const ghost = buildTowerModel(type, true);
  const ring = makeRangeRing(def.range, 0x72e38d);
  scene.add(ghost, ring);
  game.drag = { type, ghost, ring };
  moveTowerDrag(event);
  window.addEventListener('pointermove', moveTowerDrag, { passive: false });
  window.addEventListener('pointerup', endTowerDrag, { once: true });
}

function moveTowerDrag(event) {
  if (!game.drag) return;
  event.preventDefault();
  const point = pointerToGround(event);
  if (!point) return;
  const valid = validPlacement(point.x, point.z);
  game.drag.ghost.position.set(point.x, 0, point.z);
  game.drag.ring.position.set(point.x, 0.06, point.z);
  game.drag.ring.material.color.setHex(valid ? 0x72e38d : 0xef655c);
  game.drag.ghost.traverse((node) => {
    if (node.isMesh && node.material) node.material.opacity = valid ? 0.5 : 0.22;
  });
}

function endTowerDrag(event) {
  window.removeEventListener('pointermove', moveTowerDrag);
  if (!game.drag) return;
  const point = pointerToGround(event);
  const drag = game.drag;
  scene.remove(drag.ghost, drag.ring);
  game.drag = null;
  if (point && validPlacement(point.x, point.z)) placeTower(drag.type, point.x, point.z);
  else setMessage('Place defences on open ground away from the stone road.');
}

function makeHealthBar() {
  const group = new THREE.Group();
  const background = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.085), new THREE.MeshBasicMaterial({ color: 0x181918, depthTest: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.055), new THREE.MeshBasicMaterial({ color: 0x65d66f, depthTest: false }));
  fill.position.z = 0.001;
  group.add(background, fill);
  group.userData.fill = fill;
  return group;
}

function spawnEnemy() {
  const model = cloneAsset('enemy', 1.22);
  if (!model) return;
  const animation = createAnimationController(model, 'enemy', true);
  const healthBar = makeHealthBar();
  healthBar.position.y = 1.55;
  model.add(healthBar);
  const start = roadCurve.getPointAt(0);
  model.position.set(start.x, 0, start.z);
  scene.add(model);
  const maxHealth = 84 + game.wave * 18;
  game.enemies.push({
    object: model,
    animation,
    healthBar,
    health: maxHealth,
    maxHealth,
    progress: 0,
    moveSpeed: 1.08 + game.wave * 0.018,
    dead: false,
    removeTimer: 0
  });
}

function hurtEnemy(enemy, amount) {
  if (enemy.dead) return;
  enemy.health -= amount;
  const ratio = Math.max(0.01, enemy.health / enemy.maxHealth);
  enemy.healthBar.userData.fill.scale.x = ratio;
  enemy.healthBar.userData.fill.position.x = -0.39 * (1 - ratio);
  if (enemy.health <= 0) {
    enemy.dead = true;
    game.gold += 9 + game.wave;
    updateHud();
    if (enemy.animation && enemy.animation.death) playOneShot(enemy.animation, enemy.animation.death);
    enemy.removeTimer = 0.7;
    burst(enemy.object.position.clone().add(new THREE.Vector3(0, 0.7, 0)), 0xff9b48, 1.05);
  }
}

function removeEnemy(enemy) {
  scene.remove(enemy.object);
  const index = game.enemies.indexOf(enemy);
  if (index >= 0) game.enemies.splice(index, 1);
}

function startWave() {
  if (game.active || game.ended) return;
  if (game.wave >= game.maxWaves) {
    winGame();
    return;
  }
  game.wave += 1;
  game.active = true;
  game.spawnLeft = 8 + game.wave * 2;
  game.spawnTimer = 0.05;
  ui.start.disabled = true;
  setMessage('Wave ' + game.wave + ': enemy formations approaching.');
  updateHud();
}

function breach(enemy) {
  game.lives -= 1;
  removeEnemy(enemy);
  burst(new THREE.Vector3(10.4, 0.75, -2.1), 0xf25b43, 1.5);
  if (game.lives <= 0) {
    game.lives = 0;
    game.ended = true;
    game.active = false;
    ui.resultTitle.textContent = 'DEFEAT';
    ui.resultText.textContent = 'The assault breached Constantinople. Rebuild the defence and try again.';
    window.setTimeout(() => ui.result.classList.remove('hidden'), 650);
  }
  updateHud();
}

function checkWaveComplete() {
  const living = game.enemies.some((enemy) => !enemy.dead);
  if (!game.active || game.spawnLeft > 0 || living) return;
  game.active = false;
  game.gold += 70 + game.wave * 9;
  updateHud();
  if (game.wave >= game.maxWaves) winGame();
  else {
    ui.start.disabled = false;
    setMessage('Wave ' + game.wave + ' repelled. Reinforce the line.');
  }
}

function winGame() {
  if (game.ended) return;
  game.ended = true;
  game.active = false;
  ui.resultTitle.textContent = 'VICTORY';
  ui.resultText.textContent = 'The city holds through all twelve waves.';
  window.setTimeout(() => ui.result.classList.remove('hidden'), 650);
}

function towerMuzzle(tower) {
  return tower.object.localToWorld(tower.muzzle.clone());
}

function createProjectile(tower, enemy) {
  if (!enemy || enemy.dead) return;
  const heavy = tower.type === 'ballista';
  const start = towerMuzzle(tower);
  const target = enemy.object.position.clone().add(new THREE.Vector3(0, 0.72, 0));
  const direction = target.clone().sub(start).normalize();

  if (tower.turret) {
    const localTarget = tower.object.worldToLocal(enemy.object.position.clone());
    tower.turret.rotation.y = Math.atan2(localTarget.x, localTarget.z);
  }
  if (tower.animation && tower.animation.attack) playOneShot(tower.animation, tower.animation.attack);
  if (heavy) tower.recoil = 1;

  const radiusA = heavy ? 0.055 : 0.025;
  const radiusB = heavy ? 0.065 : 0.03;
  const length = heavy ? 1.15 : 0.68;
  const geometry = new THREE.CylinderGeometry(radiusA, radiusB, length, 6);
  const material = new THREE.MeshStandardMaterial({
    color: heavy ? 0xc9b088 : 0xedd6a0,
    emissive: heavy ? 0x3c210e : 0x1d1508,
    emissiveIntensity: 0.8,
    roughness: 0.42,
    metalness: heavy ? 0.3 : 0.05
  });
  const projectile = new THREE.Mesh(geometry, material);
  projectile.position.copy(start);
  projectile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  projectile.castShadow = true;
  scene.add(projectile);

  game.shots.push({
    object: projectile,
    start: start.clone(),
    target,
    enemy,
    progress: 0,
    duration: heavy ? 0.23 : 0.15,
    damage: tower.damage,
    type: tower.type
  });
  muzzleFlash(start, heavy ? 0xff9542 : 0xffda87);
}

function muzzleFlash(position, color) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.position.copy(position);
  sprite.scale.setScalar(0.4);
  scene.add(sprite);
  game.effects.push({ kind: 'flash', object: sprite, age: 0, life: 0.16, size: 0.55 });
}

function burst(position, color, size) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, color, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.position.copy(position);
  sprite.scale.setScalar(0.3);
  scene.add(sprite);
  game.effects.push({ kind: 'burst', object: sprite, age: 0, life: 0.36, size });

  for (let i = 0; i < 5; i += 1) {
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), new THREE.MeshBasicMaterial({ color, transparent: true }));
    spark.position.copy(position);
    scene.add(spark);
    game.effects.push({
      kind: 'spark',
      object: spark,
      age: 0,
      life: 0.34,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 2.5, 1.2 + Math.random() * 1.8, (Math.random() - 0.5) * 2.5)
    });
  }
}

function updateEnemies(dt) {
  if (game.active && game.spawnLeft > 0) {
    game.spawnTimer -= dt * game.speed;
    if (game.spawnTimer <= 0) {
      spawnEnemy();
      game.spawnLeft -= 1;
      game.spawnTimer = 0.78;
    }
  }

  [...game.enemies].forEach((enemy) => {
    if (enemy.animation) enemy.animation.mixer.update(dt * game.speed);
    if (enemy.dead) {
      enemy.removeTimer -= dt * game.speed;
      if (enemy.removeTimer <= 0) removeEnemy(enemy);
      return;
    }

    enemy.progress += dt * game.speed * enemy.moveSpeed / roadLength;
    const progress = Math.min(enemy.progress, 1);
    const point = roadCurve.getPointAt(progress);
    const tangent = roadCurve.getTangentAt(Math.min(0.999, progress));
    enemy.object.position.set(point.x, 0, point.z);
    enemy.object.rotation.y = Math.atan2(tangent.x, tangent.z);
    enemy.healthBar.lookAt(camera.position);
    if (enemy.progress >= 1) breach(enemy);
  });

  checkWaveComplete();
}

function updateTowers(dt) {
  game.towers.forEach((tower) => {
    if (tower.animation) tower.animation.mixer.update(dt * game.speed);
    tower.cooldown -= dt * game.speed;

    if (tower.recoil > 0) {
      tower.recoil = Math.max(0, tower.recoil - dt * game.speed * 5);
      if (tower.turret) tower.turret.position.z = -0.22 * tower.recoil;
    }

    let target = null;
    let nearest = Infinity;
    game.enemies.forEach((enemy) => {
      if (enemy.dead) return;
      const distance = Math.hypot(enemy.object.position.x - tower.x, enemy.object.position.z - tower.z);
      if (distance < tower.range && distance < nearest) {
        nearest = distance;
        target = enemy;
      }
    });

    if (target && tower.turret) {
      const localTarget = tower.object.worldToLocal(target.object.position.clone());
      tower.turret.rotation.y = Math.atan2(localTarget.x, localTarget.z);
    }

    if (target && tower.cooldown <= 0) {
      createProjectile(tower, target);
      tower.cooldown = 1 / tower.shots;
    }
  });
}

function updateShots(dt) {
  for (let i = game.shots.length - 1; i >= 0; i -= 1) {
    const shot = game.shots[i];
    shot.progress += dt * game.speed / shot.duration;
    const t = Math.min(1, shot.progress);
    const ease = 1 - Math.pow(1 - t, 2);
    shot.object.position.lerpVectors(shot.start, shot.target, ease);
    if (shot.progress >= 1) {
      if (shot.enemy && !shot.enemy.dead) hurtEnemy(shot.enemy, shot.damage);
      burst(shot.target, shot.type === 'ballista' ? 0xff8436 : 0xffcf79, shot.type === 'ballista' ? 1.0 : 0.62);
      scene.remove(shot.object);
      shot.object.geometry.dispose();
      shot.object.material.dispose();
      game.shots.splice(i, 1);
    }
  }
}

function updateEffects(dt) {
  for (let i = game.effects.length - 1; i >= 0; i -= 1) {
    const effect = game.effects[i];
    if (effect.kind === 'pulse') {
      effect.phase += dt;
      const scale = effect.base * (0.9 + Math.sin(effect.phase * 6) * 0.12);
      effect.object.scale.setScalar(scale);
      continue;
    }

    effect.age += dt * game.speed;
    const ratio = Math.min(1, effect.age / effect.life);
    if (effect.kind === 'spark') {
      effect.velocity.y -= 4.5 * dt * game.speed;
      effect.object.position.addScaledVector(effect.velocity, dt * game.speed);
      effect.object.material.opacity = 1 - ratio;
    } else {
      effect.object.scale.setScalar((effect.size || 1) * (0.3 + ratio * 1.5));
      effect.object.material.opacity = (1 - ratio) * (effect.kind === 'flash' ? 0.95 : 0.78);
    }

    if (effect.age >= effect.life) {
      scene.remove(effect.object);
      if (effect.object.material) effect.object.material.dispose();
      if (effect.object.geometry) effect.object.geometry.dispose();
      game.effects.splice(i, 1);
    }
  }
}

function animate() {
  window.requestAnimationFrame(animate);
  const dt = Math.min(0.04, clock.getDelta());
  if (waterTexture) {
    waterTexture.offset.x += dt * 0.008;
    waterTexture.offset.y -= dt * 0.014;
  }
  updateEnemies(dt);
  updateTowers(dt);
  updateShots(dt);
  updateEffects(dt);
  renderer.render(scene, camera);
}

function setupInput() {
  document.querySelectorAll('.tower-card').forEach((button) => {
    button.addEventListener('pointerdown', (event) => beginTowerDrag(event, button.dataset.tower));
  });

  ui.start.addEventListener('click', startWave);
  ui.speed.addEventListener('click', () => {
    game.speed = game.speed === 1 ? 2 : 1;
    ui.speed.textContent = '×' + game.speed;
    setMessage(game.speed === 2 ? 'Battle speed doubled.' : 'Battle speed normal.');
  });
  ui.closeInfo.addEventListener('click', () => selectTower(null));
  ui.replay.addEventListener('click', () => window.location.reload());

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (game.drag) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = [];
    game.towers.forEach((tower) => tower.object.traverse((node) => { if (node.isMesh) meshes.push(node); }));
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length && hits[0].object.userData.tower) selectTower(hits[0].object.userData.tower);
    else selectTower(null);
  });
}

async function start() {
  try {
    initializeRenderer();
    await loadModels();
    loadingProgress(8, 8, 'Building Constantinople…');
    buildWorld();
    setupInput();
    updateHud();
    ui.loading.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    ui.message.classList.remove('hidden');
    ui.arsenal.classList.remove('hidden');
    ui.start.classList.remove('hidden');
    setMessage('Drag a defence onto open ground. Enemy formations follow the stone road.');
    clock.start();
    animate();
  } catch (error) {
    showFatal(error && error.message ? error.message : String(error));
  }
}

start();
