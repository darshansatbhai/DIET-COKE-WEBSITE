import * as THREE from 'three';
import { gsap } from 'gsap';

function makeLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const logo = new Image();
  let loaded = false;

  function draw() {
    const metal = ctx.createLinearGradient(0, 0, 2048, 0);
    metal.addColorStop(0, '#b8bec0');
    metal.addColorStop(.14, '#f4f4f1');
    metal.addColorStop(.28, '#aeb4b6');
    metal.addColorStop(.44, '#f8f8f5');
    metal.addColorStop(.60, '#c2c7c7');
    metal.addColorStop(.76, '#f5f5f2');
    metal.addColorStop(1, '#b8bec0');
    ctx.fillStyle = metal;
    ctx.fillRect(0, 0, 2048, 2048);
    [0, 1024, 2048].forEach(center => {
      if (loaded) ctx.drawImage(logo, center - 480, 300, 960, 367);
      else {
        ctx.fillStyle = '#e4001b';
        ctx.textAlign = 'center';
        ctx.font = 'bold 250px Georgia, serif';
        ctx.fillText('Coke', center, 570);
      }
      ctx.fillStyle = '#d90018';
      ctx.textAlign = 'center';
      ctx.font = 'bold 56px Arial, sans-serif';
      ctx.fillText('NO SUGAR', center, 1570);
      ctx.fillText('NO CALORIES', center, 1630);
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillText('12 FL OZ  •  355 mL', center, 1870);
    });
    // Restrained highlights suggest the chilled, metallic surface without hiding the label.
    for (let i = 0; i < 180; i++) {
      const x = (i * 163 + 71) % 2048;
      const y = (i * 281 + 115) % 2048;
      if (y > 250 && y < 720) continue;
      const r = 2 + (i % 5);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,90,90,.16)';
      ctx.stroke();
    }
    texture.needsUpdate = true;
  }
  draw();
  logo.onload = () => { loaded = true; draw(); };
  logo.src = '/assets/diet-coke-mark.png';
  return texture;
}

// Reuse the same modeled can in the hero and the pouring scene.
export function createDietCan() {
  const can = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xc3c8ca, metalness: .68, roughness: .29 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x7f8587, metalness: .65, roughness: .34 });
  const bodyMaterial = new THREE.MeshStandardMaterial({ map: makeLabel(), metalness: .28, roughness: .34 });
  can.add(new THREE.Mesh(new THREE.CylinderGeometry(.76, .76, 3.42, 128, 1, true), bodyMaterial));
  function cylinder(top, bottom, height, y, material = metal) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 96), material);
    mesh.position.y = y;
    can.add(mesh);
  }
  function ring(radius, tube, y, material = metal) {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 96), material);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.y = y;
    can.add(mesh);
  }
  cylinder(.64, .76, .22, 1.82);
  cylinder(.64, .64, .04, 1.95, darkMetal);
  ring(.64, .04, 1.98);
  cylinder(.62, .62, .025, 1.98);
  ring(.49, .012, 2, darkMetal);
  cylinder(.76, .67, .14, -1.78);
  ring(.67, .036, -1.86);

  const aperture = new THREE.Mesh(new THREE.CircleGeometry(.12, 32), new THREE.MeshBasicMaterial({ color: 0x292b2b, side: THREE.DoubleSide }));
  aperture.rotation.x = -Math.PI / 2;
  aperture.scale.y = 1.55;
  aperture.position.set(0, 2.008, -.25);
  aperture.visible = false;
  can.add(aperture);
  const tabPivot = new THREE.Group();
  tabPivot.position.set(0, 2.025, -.06);
  can.add(tabPivot);
  const tab = new THREE.Mesh(new THREE.TorusGeometry(.14, .035, 12, 48), darkMetal);
  tab.rotation.x = Math.PI / 2;
  tab.scale.set(.7, 1.35, 1);
  tab.position.z = .11;
  tabPivot.add(tab);
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(.045, 20, 12), metal);
  rivet.position.set(0, 2.03, -.06);
  rivet.scale.y = .3;
  can.add(rivet);
  return { can, tabPivot, aperture };
}

export function initCanScene(reduceMotion) {
  const canvas = document.querySelector('#can-canvas');
  const container = document.querySelector('.can-wrap');
  const stage = document.querySelector('.hero-stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    container.classList.add('no-webgl');
    console.warn('3D is unavailable; using the product image.', error);
    return;
  }
  container.classList.add('has-webgl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  camera.position.set(0, .15, 8.5);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x7d8388, 2.4));
  const key = new THREE.DirectionalLight(0xffffff, 3.3);
  key.position.set(-4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2.2);
  rim.position.set(4, 2, -3);
  scene.add(rim);

  const { can } = createDietCan();
  scene.add(can);
  can.rotation.set(.05, Math.PI, -.12);

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 500 ? 9.2 : 8.5;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  if (!reduceMotion) {
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: '+=220%',
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: self => {
          document.querySelector('.progress i').style.transform = `scaleX(${self.progress})`;
          document.querySelector('.progress-number').textContent = String(Math.min(3, Math.floor(self.progress * 3) + 1)).padStart(2, '0');
        }
      }
    });
    timeline.to(can.rotation, { y: Math.PI * 3.9, ease: 'none', duration: 1 }, 0)
      .to(can.rotation, { z: .14, x: .2, duration: .5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
      .to(can.position, { y: .16, duration: .5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
      .to('.hero-watermark', { xPercent: -12, ease: 'none', duration: 1 }, 0)
      .to('.red-stripe', { xPercent: 28, ease: 'none', duration: 1 }, 0)
      .to('.hero-copy', { x: -20, opacity: .8, ease: 'none', duration: .45 }, 0)
      .fromTo('.hero-aside', { x: 25, opacity: .6 }, { x: 0, opacity: 1, ease: 'none', duration: .5 }, 0);
  }
  let visible = true;
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { rootMargin: '100px' }).observe(stage);
  gsap.ticker.add(() => { if (visible) renderer.render(scene, camera); });
}
