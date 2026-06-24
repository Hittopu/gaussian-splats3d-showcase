import "./styles.css";
import * as THREE from "three";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";

const root = document.querySelector("#viewerRoot");
const canvas = document.querySelector("#splatCanvas");
const baseUrl = import.meta.env.BASE_URL || "/";
const assetPath = (name) => `${baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`}assets/${name}`;
const rawAssetPath = (name) =>
  `https://raw.githubusercontent.com/Hittopu/gaussian-splats3d-showcase/main/public/assets/${name}`;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x07090d, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(root.clientWidth, root.clientHeight);

const camera = new THREE.PerspectiveCamera(64, root.clientWidth / root.clientHeight, 0.03, 320);
camera.rotation.order = "YXZ";

const overlayScene = new THREE.Scene();
const ambient = new THREE.HemisphereLight(0xffffff, 0x1d2a31, 1.05);
overlayScene.add(ambient);

const floorGrid = new THREE.GridHelper(46, 46, 0x4fe0c3, 0x1f4349);
floorGrid.material.transparent = true;
floorGrid.material.opacity = 0.2;
overlayScene.add(floorGrid);

const halo = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(8, 4, 8)),
  new THREE.LineBasicMaterial({ color: 0xffc15c, transparent: true, opacity: 0.45 }),
);
halo.position.set(0, 2, 0);
overlayScene.add(halo);

const viewer = new GaussianSplats3D.Viewer({
  rootElement: root,
  renderer,
  camera,
  threeScene: overlayScene,
  selfDrivenMode: false,
  useBuiltInControls: false,
  sharedMemoryForWorkers: false,
  gpuAcceleratedSort: false,
  integerBasedSort: true,
  ignoreDevicePixelRatio: false,
  optimizeSplatData: true,
  inMemoryCompressionLevel: 1,
  sphericalHarmonicsDegree: 0,
  enableOptionalEffects: true,
  sceneRevealMode: GaussianSplats3D.SceneRevealMode.Instant,
  renderMode: GaussianSplats3D.RenderMode.Always,
  logLevel: GaussianSplats3D.LogLevel.None,
});

const scenes = {
  building: {
    title: "HITSZ Main Building",
    path: assetPath("hitsz_main_building_showcase.splat"),
    fallbackPath: rawAssetPath("hitsz_main_building_showcase.splat"),
    asset: "8.7 MB",
    capture: "campus video",
    format: "SPLAT",
    originalSize: "raw 3DGS",
    packedSize: "web asset",
    packedRatio: "31%",
    story: "手机视频采集哈工大深圳主楼，经 SfM / 3DGS 重建后，发布成浏览器可交互的轻量 Gaussian Splatting 场景。",
    codec: "展示页使用轻量 web splat 保证流畅；研究主线展示的是 full-model packed payload 的思想：所有属性进入码流，而不是只压外观。",
    camera: {
      position: [-0.45, 1.55, 3.0],
      target: [0, 1.15, 0],
      yaw: -0.16,
      pitch: 0.09,
      distance: 3.1,
    },
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
      splatScale: 0.58,
    },
    halo: { scale: [1.1, 0.72, 0.78], y: 1.8, opacity: 0.34 },
  },
  rocket: {
    title: "Campus Rocket",
    path: assetPath("rocket_showcase.splat"),
    fallbackPath: rawAssetPath("rocket_showcase.splat"),
    asset: "14 MB",
    capture: "phone video",
    format: "SPLAT",
    originalSize: "30k train",
    packedSize: "web splat",
    packedRatio: "42%",
    story: "真实校园火箭模型重建，适合课堂中演示从自拍视频到可浏览 3DGS 资产的完整链路。",
    codec: "火箭页用于视觉展示；同一 viewer 后续可以替换为压缩后的 packed asset，展示质量/体积对比。",
    camera: {
      position: [0.35, 1.2, 2.65],
      target: [0, 0.9, 0],
      yaw: 0.12,
      pitch: 0.05,
      distance: 2.85,
    },
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
      splatScale: 0.55,
    },
    halo: { scale: [0.72, 0.95, 0.72], y: 1.72, opacity: 0.5 },
  },
};

const ui = {
  sceneTitle: document.querySelector("#sceneTitle"),
  splats: document.querySelector("#splatsValue"),
  asset: document.querySelector("#assetValue"),
  capture: document.querySelector("#captureValue"),
  mode: document.querySelector("#modeValue"),
  story: document.querySelector("#sceneStory"),
  origSize: document.querySelector("#origSizeValue"),
  packedSize: document.querySelector("#packedSizeValue"),
  packedBar: document.querySelector("#packedBar"),
  codecText: document.querySelector("#codecText"),
  status: document.querySelector("#statusText"),
  format: document.querySelector("#formatValue"),
  orbitButton: document.querySelector("#orbitButton"),
  walkButton: document.querySelector("#walkButton"),
  resetButton: document.querySelector("#resetButton"),
  autoButton: document.querySelector("#autoButton"),
  height: document.querySelector("#heightValue"),
  keys: document.querySelector("#keysValue"),
};

const state = {
  sceneKey: "building",
  loading: false,
  pendingScene: null,
  loadedAll: false,
  sceneOrder: [],
  mode: "orbit",
  auto: true,
  dragging: false,
  lastX: 0,
  lastY: 0,
  yaw: 0,
  pitch: 0,
  distance: 3,
  target: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  verticalVelocity: 0,
  keys: new Set(),
  loadedCounts: {},
  lastFrame: performance.now(),
  frameCount: 0,
};

window.__HC3DGS_DEMO__ = {
  getCameraY: () => camera.position.y,
  getCameraPosition: () => camera.position.toArray(),
  getFrameCount: () => state.frameCount,
  getMode: () => state.mode,
  getKeys: () => Array.from(state.keys),
};

bindEvents();
resize();
loadScene("building");
requestAnimationFrame(tick);
setInterval(() => {
  if (state.mode === "walk") renderFrame(performance.now());
}, 16);

function bindEvents() {
  window.addEventListener("resize", resize);

  document.querySelectorAll(".scene-button").forEach((button) => {
    button.addEventListener("click", () => loadScene(button.dataset.scene));
  });

  ui.orbitButton.addEventListener("click", () => setMode("orbit"));
  ui.walkButton.addEventListener("click", () => setMode("walk"));
  ui.resetButton.addEventListener("click", resetCamera);
  ui.autoButton.addEventListener("click", () => {
    state.auto = !state.auto;
    ui.autoButton.classList.toggle("active", state.auto);
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (state.mode === "walk") {
      canvas.requestPointerLock?.();
      return;
    }
    state.dragging = true;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (state.mode === "walk" && document.pointerLockElement === canvas) {
      rotateCamera(event.movementX, event.movementY, 0.002);
      return;
    }
    if (!state.dragging || state.mode !== "orbit") return;
    rotateCamera(event.clientX - state.lastX, event.clientY - state.lastY, 0.004);
    state.lastX = event.clientX;
    state.lastY = event.clientY;
  });

  canvas.addEventListener("pointerup", () => {
    state.dragging = false;
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.distance = THREE.MathUtils.clamp(state.distance + event.deltaY * 0.003, 0.75, 12);
  }, { passive: false });

  window.addEventListener("keydown", (event) => {
    rememberKey(event, true);
    if (state.mode === "walk" && isMovementKey(event)) event.preventDefault();
    if (event.code === "Digit1") loadScene("building");
    if (event.code === "Digit2") loadScene("rocket");
    if (event.code === "KeyR") resetCamera();
    if (event.code === "KeyF") setMode(state.mode === "walk" ? "orbit" : "walk");
  }, { capture: true });

  window.addEventListener("keyup", (event) => {
    rememberKey(event, false);
    if (state.mode === "walk" && isMovementKey(event)) event.preventDefault();
  }, { capture: true });
  document.addEventListener("pointerlockchange", () => {
    document.body.classList.toggle("locked", document.pointerLockElement === canvas);
  });
}

async function loadScene(key) {
  const data = scenes[key];
  if (!data) return;
  if (state.loading) {
    state.pendingScene = key;
    ui.status.textContent = "queued";
    return;
  }
  state.loading = true;
  state.sceneKey = key;
  state.pendingScene = null;
  updateSceneUI(data, true);

  try {
    if (!state.loadedAll) {
      await loadAllSplatScenes(key);
      state.loadedAll = true;
      cacheSceneCounts();
    }
    activateScene(key);
  } catch (error) {
    console.error(error);
    ui.status.textContent = "load failed";
  } finally {
    state.loading = false;
    if (state.pendingScene && state.pendingScene !== state.sceneKey) {
      const nextScene = state.pendingScene;
      state.pendingScene = null;
      loadScene(nextScene);
    }
  }
}

async function loadAllSplatScenes(activeKey) {
  state.sceneOrder = [];
  for (const key of Object.keys(scenes)) {
    await addSplatSceneWithFallback(key, key === activeKey);
  }
  if (!state.sceneOrder.length) {
    throw new Error("No splat scenes could be loaded.");
  }
}

async function addSplatSceneWithFallback(key, visible) {
  const data = scenes[key];
  const candidates = [data.path, data.fallbackPath].filter(Boolean);
  let lastError = null;
  for (const path of candidates) {
    try {
      await viewer.addSplatScene(path, sceneToLoadOptions(key, visible, path));
      state.sceneOrder.push(key);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`Failed to load ${key} from ${path}; trying next source.`, error);
    }
  }
  throw lastError ?? new Error(`Could not load ${key}`);
}

function sceneToLoadOptions(key, visible, path) {
  const data = scenes[key];
  return {
    path,
    splatAlphaRemovalThreshold: 2,
    position: data.transform.position,
    rotation: data.transform.rotation,
    scale: data.transform.scale,
    opacity: visible ? 1 : 0,
    visible,
  };
}

function cacheSceneCounts() {
  state.sceneOrder.forEach((key, index) => {
    const count = viewer.getSplatScene?.(index)?.splatBuffer?.getSplatCount?.() ?? 0;
    if (count) state.loadedCounts[key] = count;
  });
}

function activateScene(key) {
  const data = scenes[key];
  state.sceneKey = key;
  state.sceneOrder.forEach((sceneKey, index) => {
    const scene = viewer.getSplatScene?.(index);
    if (!scene) return;
    const active = sceneKey === key;
    scene.visible = active;
    scene.opacity = active ? 1 : 0;
  });
  syncSceneVisibilityUniforms();
  setViewerSplatScale(data.transform.splatScale);
  updateSceneUI(data, false);
  resetCamera();
}

function syncSceneVisibilityUniforms() {
  const uniforms = viewer.splatMesh?.material?.uniforms;
  if (!uniforms?.sceneVisibility || !uniforms?.sceneOpacity) return;
  state.sceneOrder.forEach((key, index) => {
    const active = key === state.sceneKey;
    uniforms.sceneVisibility.value[index] = active ? 1 : 0;
    uniforms.sceneOpacity.value[index] = active ? 1 : 0;
  });
  viewer.splatMesh.material.uniformsNeedUpdate = true;
}

function updateSceneUI(data, loading) {
  ui.sceneTitle.textContent = data.title;
  ui.asset.textContent = data.asset;
  ui.capture.textContent = data.capture;
  ui.story.textContent = data.story;
  ui.origSize.textContent = data.originalSize;
  ui.packedSize.textContent = data.packedSize;
  ui.packedBar.style.width = data.packedRatio;
  ui.codecText.textContent = data.codec;
  ui.format.textContent = data.format;
  ui.status.textContent = loading ? "loading" : "ready";
  const count = state.loadedCounts[state.sceneKey];
  ui.splats.textContent = loading ? "loading" : (count ? `${Math.round(count / 1000)}k` : "3DGS");

  halo.scale.set(...data.halo.scale);
  halo.position.y = data.halo.y;
  halo.material.opacity = data.halo.opacity;

  document.querySelectorAll(".scene-button").forEach((button) => {
    const active = button.dataset.scene === state.sceneKey;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function resetCamera() {
  const data = scenes[state.sceneKey].camera;
  camera.position.set(...data.position);
  state.target.set(...data.target);
  state.yaw = data.yaw;
  state.pitch = data.pitch;
  state.distance = data.distance;
  state.velocity.set(0, 0, 0);
  state.verticalVelocity = 0;
  updateCamera(0);
}

function setMode(mode) {
  state.mode = mode;
  ui.mode.textContent = mode === "walk" ? "Walk" : "Orbit";
  ui.orbitButton.classList.toggle("active", mode === "orbit");
  ui.walkButton.classList.toggle("active", mode === "walk");
  document.body.classList.toggle("walk-mode", mode === "walk");
  if (mode === "walk") {
    canvas.focus({ preventScroll: true });
    state.auto = false;
    ui.autoButton.classList.remove("active");
  }
  if (mode === "orbit" && document.pointerLockElement) document.exitPointerLock?.();
}

function rotateCamera(dx, dy, sensitivity) {
  state.auto = false;
  ui.autoButton.classList.remove("active");
  state.yaw -= dx * sensitivity;
  state.pitch = THREE.MathUtils.clamp(state.pitch - dy * sensitivity, -1.18, 1.08);
}

function rememberKey(event, pressed) {
  const keys = new Set([event.code, event.key, event.key?.toLowerCase()].filter(Boolean));
  if (event.code === "Space" || event.key === " ") keys.add("Space");
  if (event.code === "ControlLeft" || event.code === "ControlRight" || event.key === "Control") keys.add("Control");
  if (event.code === "KeyZ" || event.key === "z" || event.key === "Z") keys.add("KeyZ");
  keys.forEach((key) => {
    if (pressed) state.keys.add(key);
    else state.keys.delete(key);
  });
}

function isMovementKey(event) {
  return [
    "KeyW", "KeyA", "KeyS", "KeyD",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "Space", "ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight",
    "KeyE", "KeyQ", "KeyZ", "PageUp", "PageDown",
  ].includes(event.code) || [" ", "w", "a", "s", "d", "e", "q", "z", "Z", "Control", "Shift"].includes(event.key);
}

function updateCamera(delta) {
  if (state.mode === "walk") {
    const forward = Number(hasKey("KeyW", "w", "ArrowUp")) -
      Number(hasKey("KeyS", "s", "ArrowDown"));
    const right = Number(hasKey("KeyD", "d", "ArrowRight")) -
      Number(hasKey("KeyA", "a", "ArrowLeft"));
    const vertical = Number(hasKey("Space", " ", "KeyE", "e", "PageUp")) -
      Number(hasKey("Control", "ControlLeft", "ControlRight", "KeyQ", "q", "KeyZ", "z", "PageDown"));
    const sprint = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") ? 1.9 : 1.0;
    const direction = new THREE.Vector3(right, 0, -forward);
    if (direction.lengthSq() > 1) direction.normalize();
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
    direction.multiplyScalar(4.2 * sprint * delta);
    state.velocity.x = THREE.MathUtils.damp(state.velocity.x, direction.x, 12, delta);
    state.velocity.z = THREE.MathUtils.damp(state.velocity.z, direction.z, 12, delta);
    state.verticalVelocity = THREE.MathUtils.damp(state.verticalVelocity, vertical * 3.0 * sprint, 12, delta);
    camera.position.add(state.velocity);
    camera.position.y += state.verticalVelocity * delta;
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, state.target.y - 2.2, state.target.y + 8.0);
    camera.rotation.set(state.pitch, state.yaw, 0);
    return;
  }

  if (state.auto && !state.dragging) {
    state.yaw += delta * 0.16;
  }
  const radius = state.distance;
  const cosPitch = Math.cos(state.pitch);
  camera.position.set(
    state.target.x + Math.sin(state.yaw) * cosPitch * radius,
    state.target.y + Math.sin(state.pitch) * radius,
    state.target.z + Math.cos(state.yaw) * cosPitch * radius,
  );
  camera.lookAt(state.target);
}

function hasKey(...keys) {
  return keys.some((key) => state.keys.has(key));
}

function tick(now) {
  requestAnimationFrame(tick);
  renderFrame(now);
}

function renderFrame(now) {
  state.frameCount += 1;
  const delta = Math.min(0.04, (now - state.lastFrame) / 1000 || 0.016);
  state.lastFrame = now;
  halo.rotation.y += delta * 0.22;
  floorGrid.rotation.y += delta * 0.015;
  updateCamera(delta);
  updateDebugReadout();
  viewer.update();
  viewer.render();
}

function updateDebugReadout() {
  if (ui.height) ui.height.textContent = camera.position.y.toFixed(2);
  if (ui.keys) {
    const interesting = ["W", "A", "S", "D", "Space", "Control", "Z", "Shift"]
      .filter((key) => hasKey(
        key === "W" ? "KeyW" : key,
        key.toLowerCase(),
        key === "Z" ? "KeyZ" : key,
      ));
    ui.keys.textContent = interesting.length ? interesting.join("+") : "none";
  }
}

function resize() {
  const width = root.clientWidth;
  const height = root.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
}

function setViewerSplatScale(value) {
  const splatMesh = viewer.splatMesh;
  if (!splatMesh?.setSplatScale) return;
  splatMesh.setSplatScale(value);
}
