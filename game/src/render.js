// SOLMAR BAY — renderer and camera. Creates the WebGL renderer with
// soft shadows and filmic tone mapping, owns the resize handler, and
// hands the camera back to the boot hub. The frame loop itself lives in
// main.js; this module only owns the drawing surface.

export function init(ctx) {
  const T = ctx.THREE;

  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.id = 'game-canvas';
  document.body.appendChild(renderer.domElement);

  const camera = new T.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 3000);
  camera.position.set(0, 26, 60);
  ctx.camera = camera;

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  const api = { renderer, camera, resize };
  ctx.render = api;
  return api;
}
