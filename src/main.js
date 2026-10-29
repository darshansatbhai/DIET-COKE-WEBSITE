import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initCanScene } from './can-scene.js';
import { initPourScene } from './pour-scene.js';
import { initScrollFeedback } from './scroll-feedback.js';

gsap.registerPlugin(ScrollTrigger);
const deviceReducesMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let motionOverride = false;
try { motionOverride = localStorage.getItem('diet-coke-motion-enabled') === 'true'; } catch { /* Storage is optional. */ }
const reduceMotion = deviceReducesMotion && !motionOverride;
if (deviceReducesMotion) {
  const choice = document.querySelector('.motion-choice');
  const toggle = document.querySelector('#motion-toggle');
  choice.classList.add('is-visible');
  document.documentElement.classList.toggle('motion-forced', motionOverride);
  document.querySelector('#motion-status').textContent = motionOverride ? '3D motion is enabled.' : 'Reduced motion is enabled on this device.';
  toggle.textContent = motionOverride ? 'USE REDUCED MOTION' : 'ENABLE MOTION';
  toggle.addEventListener('click', () => {
    try { localStorage.setItem('diet-coke-motion-enabled', String(!motionOverride)); } catch { /* Storage is optional. */ }
    location.reload();
  });
}
const lenis = reduceMotion ? null : new Lenis({ lerp: .085, smoothWheel: true, syncTouch: false, anchors: true });
if (lenis) {
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
initCanScene(reduceMotion);
initPourScene(reduceMotion);
initScrollFeedback();

const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.mobile-menu');
function setMenu(open) {
  menuButton.classList.toggle('is-open', open);
  menu.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menu.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('menu-open', open);
  if (lenis) open ? lenis.stop() : lenis.start();
}
menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });

if (!reduceMotion) {
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.header', { y: -30, duration: .7 })
    .from('.hero h1 > span', { y: 24, stagger: .1, duration: .85 }, '-=.4')
    .from('.eyebrow, .hero-copy p, .hero-copy .pill-button', { y: 14, stagger: .09, duration: .65 }, '-=.65');
  gsap.utils.toArray('.reveal').forEach(element => {
    gsap.from(element, { y: 35, duration: .85, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 88%', once: true } });
  });
  gsap.to('.break-image', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.break-section', start: 'top bottom', end: 'bottom top', scrub: true } });
}
window.addEventListener('load', () => {
  ScrollTrigger.refresh();
  const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target && lenis) lenis.scrollTo(target, { immediate: true, force: true });
});
