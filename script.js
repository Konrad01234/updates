/* ============================================================
   AV8 — script.js
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ── Helpers ─────────────────────────────────────────────── */
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

/* ── Announcement bar dismiss ────────────────────────────── */
const announceBar   = $('#announceBar');
const announceClose = $('#announceClose');
const mainNav       = $('#mainNav');

if (announceClose) {
  announceClose.addEventListener('click', () => {
    announceBar.classList.add('hidden');
    mainNav.classList.add('announce-gone');
    document.documentElement.style.setProperty('--announce-h', '0px');
  });
}

/* ── Nav shrink on scroll ────────────────────────────────── */
window.addEventListener('scroll', () => {
  mainNav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── Hero flavor carousel ────────────────────────────────── */
const flavors = [
  { name: 'Melon & Mint',          bg: '#8eba5b', canColor: '#6fa83a', flavorLabel: 'MELON & MINT' },
  { name: 'Grapefruit',            bg: '#f0c040', canColor: '#e8734a', flavorLabel: 'GRAPEFRUIT' },
  { name: 'Blackberry & Hibiscus', bg: '#5b8fe8', canColor: '#3a6cc0', flavorLabel: 'BLACKBERRY & HIBISCUS' },
  { name: 'Passion Fruit',         bg: '#e8734a', canColor: '#c94f22', flavorLabel: 'PASSION FRUIT' },
];

let currentFlavor = 0;
const heroCan        = $('#heroCan');
const heroSection    = $('#hero');
const heroFlavorPill = $('#heroFlavorPill');

function setFlavor(idx) {
  currentFlavor = (idx + flavors.length) % flavors.length;
  const f = flavors[currentFlavor];

  gsap.to(heroSection, { backgroundColor: f.bg, duration: .5, ease: 'power2.out' });
  gsap.to(heroCan, { opacity: 0, y: -20, duration: .22, onComplete: () => {
    const nameEl  = heroCan.querySelector('.can-flavor-name');
    const tagEl   = heroCan.querySelector('.can-flavor-tag');
    if (nameEl) nameEl.textContent = f.flavorLabel;
    gsap.to(heroCan, { opacity: 1, y: 0, duration: .28 });
  }});

  gsap.to(heroFlavorPill, { opacity: 0, scale: .9, duration: .2, onComplete: () => {
    heroFlavorPill.textContent = f.name;
    gsap.to(heroFlavorPill, { opacity: 1, scale: 1, duration: .25 });
  }});
}

$('#heroPrev').addEventListener('click', () => setFlavor(currentFlavor - 1));
$('#heroNext').addEventListener('click', () => setFlavor(currentFlavor + 1));

/* ── Hero mouse parallax ─────────────────────────────────── */
const illus = $$('.illus');
const depths = [0.04, 0.07, 0.05, 0.03, 0.06, 0.03, 0.08, 0.05, 0.06];

window.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  const dx = e.clientX - cx;
  const dy = e.clientY - cy;

  illus.forEach((el, i) => {
    const d = depths[i] ?? 0.05;
    gsap.to(el, {
      x: dx * d,
      y: dy * d,
      duration: 1,
      ease: 'power1.out',
    });
  });
}, { passive: true });

/* Hero idle float animation */
illus.forEach((el, i) => {
  gsap.to(el, {
    y: `+=${8 + (i % 3) * 5}`,
    rotation: `+=${(i % 2 === 0 ? 1 : -1) * 4}`,
    duration: 2.5 + i * 0.4,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
    delay: i * 0.3,
  });
});

/* ── GSAP hero entrance ──────────────────────────────────── */
gsap.from('.hero-center', {
  opacity: 0,
  y: 60,
  duration: 1,
  ease: 'power3.out',
  delay: .3,
});

gsap.from('.illus', {
  opacity: 0,
  scale: 0.5,
  stagger: 0.07,
  duration: .8,
  ease: 'back.out(1.5)',
  delay: .4,
});

/* ── ScrollTrigger: benefit cards ───────────────────────── */
$$('.benefit-card').forEach((card) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        card.classList.add('in-view');
        observer.disconnect();
      }
    });
  }, { threshold: 0.2 });
  observer.observe(card);
});

/* ── ScrollTrigger: split photos ────────────────────────── */
$$('[data-animate]').forEach((el) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        el.classList.add('in-view');
        observer.disconnect();
      }
    });
  }, { threshold: 0.15 });
  observer.observe(el);
});

/* ── Flavors heading scale reveal ───────────────────────── */
const flavorsHeading = $('#flavorsHeading');
const flavorStars    = $$('.flavors-stars svg');

if (flavorsHeading) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        flavorsHeading.classList.add('in-view');
        flavorStars.forEach((s, i) => {
          setTimeout(() => s.classList.add('in-view'), 300 + i * 80);
        });
        obs.disconnect();
      }
    });
  }, { threshold: 0.2 });
  obs.observe(flavorsHeading);
}

/* ── Product carousel (flavors) ─────────────────────────── */
const carousel     = $('#flavorsCarousel');
const carouselPrev = $('#carouselPrev');
const carouselNext = $('#carouselNext');
let carouselIndex  = 0;

function getVisibleCount() {
  return window.innerWidth < 600 ? 1 : window.innerWidth < 900 ? 2 : 3;
}

function updateCarousel() {
  const cards   = $$('.flavor-card', carousel);
  const visible = getVisibleCount();
  const max     = cards.length - visible;
  carouselIndex = Math.max(0, Math.min(carouselIndex, max));
  const pct     = (100 / visible) * carouselIndex;
  gsap.to(carousel, { x: `-${pct}%`, duration: .45, ease: 'power2.out' });
}

carouselPrev.addEventListener('click', () => { carouselIndex--; updateCarousel(); });
carouselNext.addEventListener('click', () => { carouselIndex++; updateCarousel(); });

/* ── Subscription section reveals ───────────────────────── */
const subLines  = $$('.sub-line');
const subRocket = $('.subscribe-rocket');
const bubbleBadge = $('.bubble-badge');

const subObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      subLines.forEach((l, i) => setTimeout(() => l.classList.add('in-view'), i * 120));
      if (subRocket)  setTimeout(() => subRocket.classList.add('in-view'), 200);
      if (bubbleBadge) setTimeout(() => bubbleBadge.classList.add('in-view'), 400);
      subObs.disconnect();
    }
  });
}, { threshold: 0.15 });

const subSection = $('#subscribe');
if (subSection) subObs.observe(subSection);

/* ── GSAP scroll animations (GSAP ScrollTrigger extras) ──── */
gsap.utils.toArray('.footer-col').forEach((col, i) => {
  gsap.from(col, {
    opacity: 0,
    y: 30,
    duration: .6,
    delay: i * .1,
    scrollTrigger: {
      trigger: col,
      start: 'top 90%',
    }
  });
});

gsap.from('.footer-brand', {
  opacity: 0,
  x: -30,
  duration: .7,
  scrollTrigger: {
    trigger: '.footer-brand',
    start: 'top 90%',
  }
});

/* ── Flavor card stagger entrance ─────────────────────────── */
gsap.from('.flavor-card', {
  opacity: 0,
  y: 60,
  stagger: .12,
  duration: .7,
  ease: 'power2.out',
  scrollTrigger: {
    trigger: '.flavors-carousel',
    start: 'top 80%',
  }
});
