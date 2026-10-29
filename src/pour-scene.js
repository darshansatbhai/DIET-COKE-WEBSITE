import * as THREE from 'three';
import { gsap } from 'gsap';
import { createDietCan } from './can-scene.js';

// Every part of the animation is driven by the scroll timeline, including the liquid.
export function initPourScene(reduceMotion) {
  const stage = document.querySelector('.pour-stage');
  const container = document.querySelector('.pour-canvas-wrap');
  const canvas = document.querySelector('#pour-canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    container.classList.add('no-webgl');
    stage.classList.add('no-webgl');
    console.warn('3D pouring is unavailable; using the product image.', error);
    return;
  }
  container.classList.add('has-webgl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  camera.position.set(0, .3, 10);
  camera.lookAt(0, .3, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8388, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-4, 6, 8);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xffffff, 2);
  rimLight.position.set(5, 2, -3);
  scene.add(rimLight);

  const { can, tabPivot, aperture } = createDietCan();
  can.rotation.order = 'ZYX';
  can.rotation.set(0, Math.PI, -.12);
  can.position.set(-1.05, .08, 0);
  scene.add(can);

  // A double-walled tapered glass with a separate, rising cola surface.
  const glass = new THREE.Group();
  glass.position.set(1.35, -1.65, 0);
  scene.add(glass);
  const profile = [
    [0, 0], [.47, 0], [.51, .08], [.66, 2.4],
    [.62, 2.4], [.47, .14], [0, .14]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const glassMaterial = new THREE.MeshPhongMaterial({
    color: 0xf3f8f6, specular: 0xffffff, shininess: 110,
    transparent: true, opacity: .20, depthWrite: false, side: THREE.DoubleSide
  });
  const glassMesh = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), glassMaterial);
  glassMesh.renderOrder = 4;
  glass.add(glassMesh);
  const rimMaterial = new THREE.MeshPhongMaterial({ color: 0xf9ffff, specular: 0xffffff, shininess: 120, transparent: true, opacity: .85 });
  const glassRim = new THREE.Mesh(new THREE.TorusGeometry(.64, .022, 12, 96), rimMaterial);
  glassRim.rotation.x = Math.PI / 2;
  glassRim.position.y = 2.4;
  glassRim.renderOrder = 5;
  glass.add(glassRim);
  const foot = new THREE.Mesh(new THREE.TorusGeometry(.49, .022, 12, 96), rimMaterial);
  foot.rotation.x = Math.PI / 2;
  foot.position.y = .07;
  foot.renderOrder = 5;
  glass.add(foot);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7 });
  [-1, 1].forEach(side => {
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(side * .48, .13, .08),
      new THREE.Vector3(side * .65, 2.36, .08)
    ]), edgeMaterial);
    edge.renderOrder = 5;
    glass.add(edge);
  });

  const liquidGeometry = new THREE.CylinderGeometry(.60, .46, 1, 80);
  liquidGeometry.translate(0, .5, 0);
  const liquid = new THREE.Mesh(liquidGeometry, new THREE.MeshPhongMaterial({ color: 0x4a190a, specular: 0xa65722, shininess: 85 }));
  liquid.position.y = .13;
  liquid.renderOrder = 1;
  glass.add(liquid);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(.59, .59, .10, 64), new THREE.MeshPhongMaterial({ color: 0xd7b18b, transparent: true, opacity: .88, shininess: 35 }));
  foam.renderOrder = 2;
  glass.add(foam);
  const bubbleGeometry = new THREE.SphereGeometry(.025, 10, 8);
  const bubbleMaterial = new THREE.MeshBasicMaterial({ color: 0xf1c88e, transparent: true, opacity: .7 });
  const bubbles = Array.from({ length: 28 }, (_, index) => {
    const bubble = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
    const angle = index * 2.399;
    const radius = .14 + (index % 4) * .085;
    bubble.position.x = Math.cos(angle) * radius;
    bubble.position.z = Math.sin(angle) * radius + .2;
    bubble.scale.setScalar(.6 + (index % 4) * .18);
    bubble.renderOrder = 3;
    glass.add(bubble);
    return bubble;
  });

  // The flow originates at the can opening in its final pouring pose.
  const pourPosition = new THREE.Vector3(-.82, 1.25, 0);
  const pourRotation = new THREE.Euler(0, Math.PI, -1.05, 'ZYX');
  const mouth = new THREE.Vector3(0, 2.02, -.25).applyEuler(pourRotation).add(pourPosition);
  // Build the stream down to the empty glass, then shorten it as the drink rises.
  const emptySurfaceY = glass.position.y + .13;
  const target = new THREE.Vector3(1.35, emptySurfaceY, .25).sub(mouth);
  const flowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(target.x * .34, target.y * .28, 0),
    new THREE.Vector3(target.x * .78, target.y * .68, 0),
    target
  ]);
  const stream = new THREE.Mesh(new THREE.TubeGeometry(flowCurve, 48, .055, 12, false), new THREE.MeshPhongMaterial({ color: 0x57200d, specular: 0xe7a45e, shininess: 100 }));
  stream.position.copy(mouth);
  scene.add(stream);

  const state = { fill: reduceMotion ? .58 : .02, flow: 0, phase: 0 };
  if (reduceMotion) {
    document.querySelector('.pour-step-title').textContent = 'A LITTLE MOMENT FOR YOU';
    document.querySelector('.pour-step-caption').textContent = 'THE PERFECT POUR';
  }
  const steps = [
    ['01', 'CRACK IT OPEN', 'THE MOMENT STARTS HERE'],
    ['02', 'THE PERFECT POUR', 'LET THE GOOD TIMES FIZZ'],
    ['03', 'MAKE IT YOURS', 'A LITTLE MOMENT OF REFRESHMENT']
  ];
  let currentStep = -1;
  function updateStep(progress) {
    const index = progress < .24 ? 0 : progress < .82 ? 1 : 2;
    if (index === currentStep) return;
    currentStep = index;
    const [number, title, caption] = steps[index];
    document.querySelector('.pour-step-number').textContent = number;
    document.querySelector('.pour-step-title').textContent = title;
    document.querySelector('.pour-step-caption').textContent = caption;
    document.querySelector('.pour-count').textContent = `${number} / 03`;
  }
  function render() {
    const level = Math.max(.001, state.fill * 1.9);
    liquid.scale.y = level;
    foam.position.y = .13 + level;
    foam.visible = state.fill > .035;
    stream.visible = state.flow > .005;
    const surfaceY = emptySurfaceY + level;
    const depth = THREE.MathUtils.clamp((mouth.y - surfaceY) / (mouth.y - emptySurfaceY), .05, 1);
    stream.scale.y = Math.max(.001, state.flow * depth);
    aperture.visible = tabPivot.rotation.x < -.12;
    bubbles.forEach((bubble, index) => {
      bubble.visible = state.fill > .04;
      bubble.position.y = .15 + (((index * .371 + state.phase * 3) % 1) * Math.max(.01, level - .08));
    });
    renderer.render(scene, camera);
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep both the can and glass inside narrow mobile and tablet viewports.
    camera.position.z = Math.max(8.9, 5.9 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  if (!reduceMotion) {
    const timeline = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: '+=320%',
        pin: true,
        scrub: .85,
        invalidateOnRefresh: true,
        onUpdate: self => {
          document.querySelector('.pour-progress i').style.transform = `scaleX(${self.progress})`;
          updateStep(self.progress);
        }
      }
    });
    timeline.to(tabPivot.rotation, { x: -.85, duration: .5 }, .12)
      .to(can.position, { x: pourPosition.x, y: pourPosition.y, duration: .85 }, .8)
      .to(can.rotation, { z: pourRotation.z, duration: .85 }, .8)
      .to(state, { flow: 1, duration: .28, ease: 'power1.out' }, 1.75)
      .to(state, { fill: .98, duration: 1.8, ease: 'none' }, 1.95)
      .to(state, { flow: 0, duration: .25, ease: 'power1.in' }, 3.75)
      .to(can.rotation, { z: -.18, duration: .65 }, 3.9)
      .to(can.position, { x: -1.05, y: .22, duration: .65 }, 3.9)
      .to(state, { phase: 1, duration: 4.65, ease: 'none' }, 0);
    updateStep(0);
  }
  let visible = true;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '100px' }).observe(stage);
  gsap.ticker.add(() => { if (visible) render(); });
}
