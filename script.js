/* ============================================================
   AV8 — script.js
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

function $(s, ctx = document) { return ctx.querySelector(s); }
function $$(s, ctx = document) { return [...ctx.querySelectorAll(s)]; }

/* ── Announce bar dismiss ─────────────────────────────────── */
const announceBar   = $('#announceBar');
const announceClose = $('#announceClose');
const mainNav       = $('#mainNav');

announceClose.addEventListener('click', () => {
  announceBar.classList.add('hidden');
  mainNav.classList.add('announce-gone');
  document.documentElement.style.setProperty('--announce-h', '0px');
});

/* ── Nav scroll shrink ────────────────────────────────────── */
window.addEventListener('scroll', () => {
  mainNav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── Hero flavor data ─────────────────────────────────────── */
const flavors = [
  {
    name:       'Coconut Water',
    pill:       'Coconut Water',
    heroBg:     '#71CECA',
    canTopBg:   '#71CECA',
    canGradient:'linear-gradient(180deg, #71CECA 0%, #fff 55%, #fff 100%)',
    nameColor:  '#71CECA',
    flavorText: 'COCONUT<br>WATER',
    footer:     'NO ADDED SUGAR · NOT FROM CONCENTRATE',
    hasFibre:   false,
    iconSvg: `
      <ellipse cx="40" cy="42" rx="35" ry="34" fill="#4db84f"/>
      <ellipse cx="40" cy="40" rx="31" ry="30" fill="#5ccc60"/>
      <ellipse cx="40" cy="40" rx="14" ry="14" fill="#fff" opacity=".9"/>
      <rect x="37" y="16" width="6" height="16" rx="3" fill="#71CECA"/>
    `,
  },
  {
    name:       'Mango Coconut Water',
    pill:       'Mango Coconut Water',
    heroBg:     '#e8963a',
    canTopBg:   '#e05020',
    canGradient:'linear-gradient(180deg, #e05020 0%, #e8963a 52%, #fff 54%, #fff 100%)',
    nameColor:  '#e8963a',
    flavorText: 'MANGO<br>COCONUT WATER',
    footer:     'HIGH IN FIBRE · NO ADDED SUGAR',
    hasFibre:   true,
    iconSvg: `
      <ellipse cx="40" cy="42" rx="35" ry="34" fill="#4db84f"/>
      <path d="M40 8 Q75 8 75 76 L40 76Z" fill="#e8963a"/>
      <ellipse cx="40" cy="40" rx="14" ry="14" fill="#fff" opacity=".9"/>
      <rect x="37" y="16" width="6" height="16" rx="3" fill="#f5b040"/>
    `,
  },
  {
    name:       'Pineapple Coconut Water',
    pill:       'Pineapple Coconut Water',
    heroBg:     '#f5d020',
    canTopBg:   '#e8b800',
    canGradient:'linear-gradient(180deg, #f5d020 0%, #f5d020 52%, #fff 54%, #fff 100%)',
    nameColor:  '#3d8a00',
    flavorText: 'PINEAPPLE<br>COCONUT WATER',
    footer:     'HIGH IN FIBRE · NO ADDED SUGAR',
    hasFibre:   true,
    iconSvg: `
      <ellipse cx="40" cy="42" rx="35" ry="34" fill="#4db84f"/>
      <path d="M40 8 Q75 8 75 76 L40 76Z" fill="#f5b040"/>
      <ellipse cx="40" cy="40" rx="14" ry="14" fill="#fff" opacity=".9"/>
      <rect x="37" y="16" width="6" height="16" rx="3" fill="#f5d020"/>
      <path d="M50 20 Q58 26 56 36" stroke="#e8963a" stroke-width="2" fill="none" opacity=".7"/>
    `,
  },
];

let currentFlavor = 0;
const heroSection     = $('#hero');
const canHeroBody     = $('#canHeroBody');
const canFruitIcon    = $('#canFruitIcon');
const canFlavorName   = $('#canFlavorName');
const canFibreBadge   = $('#canFibreBadge');
const heroFlavorPill  = $('#heroFlavorPill');
const canTopBarEl     = $('#canTopBar');

function applyFlavor(idx, animate = true) {
  currentFlavor = (idx + flavors.length) % flavors.length;
  const f = flavors[currentFlavor];

  /* Background */
  gsap.to(heroSection, { backgroundColor: f.heroBg, duration: .55, ease: 'power2.out' });

  const doSwap = () => {
    /* Can body gradient */
    canHeroBody.style.background = f.canGradient;
    canTopBarEl.style.background = 'rgba(255,255,255,.3)';

    /* Icon */
    canFruitIcon.innerHTML = f.iconSvg;

    /* Flavor text */
    canFlavorName.innerHTML = f.flavorText;
    canFlavorName.style.color = f.nameColor;

    /* Fibre badge */
    if (f.hasFibre) {
      canFibreBadge.classList.remove('hidden');
    } else {
      canFibreBadge.classList.add('hidden');
    }

    /* Pill text */
    heroFlavorPill.textContent = f.pill;
  };

  if (animate) {
    gsap.to('#canHeroBody', { opacity: 0, y: -16, duration: .22, onComplete: () => {
      doSwap();
      gsap.to('#canHeroBody', { opacity: 1, y: 0, duration: .28 });
    }});
    gsap.to(heroFlavorPill, { opacity: 0, scale: .9, duration: .18, onComplete: () => {
      gsap.to(heroFlavorPill, { opacity: 1, scale: 1, duration: .25 });
    }});
  } else {
    doSwap();
  }
}

$('#heroPrev').addEventListener('click', () => applyFlavor(currentFlavor - 1));
$('#heroNext').addEventListener('click', () => applyFlavor(currentFlavor + 1));

/* ── Mousemove parallax on illustrations ─────────────────── */
const illus  = $$('.illus');
const depths = [0.03, 0.03, 0.05, 0.04, 0.06, 0.05, 0.02, 0.08, 0.07, 0.06, 0.04];

window.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;
  illus.forEach((el, i) => {
    const d = depths[i] ?? 0.04;
    gsap.to(el, {
      x: (e.clientX - cx) * d,
      y: (e.clientY - cy) * d,
      duration: 1.2, ease: 'power1.out',
    });
  });
}, { passive: true });

/* Idle float */
illus.forEach((el, i) => {
  gsap.to(el, {
    y: `+=${6 + (i % 4) * 4}`,
    rotation: `+=${(i % 2 === 0 ? 1 : -1) * 3}`,
    duration: 2.8 + i * 0.35,
    yoyo: true, repeat: -1,
    ease: 'sine.inOut', delay: i * 0.25,
  });
});

/* ── Hero entrance ────────────────────────────────────────── */
gsap.from('.hero-center', { opacity: 0, y: 70, duration: 1.1, ease: 'power3.out', delay: .25 });
gsap.from('.illus', {
  opacity: 0, scale: 0.4, stagger: 0.06,
  duration: .8, ease: 'back.out(1.4)', delay: .35,
});

/* ── IntersectionObserver helper ─────────────────────────── */
function watchInView(selector, threshold = 0.2) {
  $$(selector).forEach(el => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { el.classList.add('in-view'); obs.disconnect(); }
      });
    }, { threshold });
    obs.observe(el);
  });
}

watchInView('.benefit-card', 0.2);
watchInView('[data-animate]',  0.15);

/* ── Flavors heading ────────────────────────────────────────── */
const flavorsHeading = $('#flavorsHeading');
const flavorStars    = $$('.flavors-stars svg');

if (flavorsHeading) {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        flavorsHeading.classList.add('in-view');
        flavorStars.forEach((s, i) => setTimeout(() => s.classList.add('in-view'), 300 + i * 90));
        obs.disconnect();
      }
    });
  }, { threshold: 0.2 });
  obs.observe(flavorsHeading);
}

/* ── Flavor carousel ─────────────────────────────────────── */
const carousel     = $('#flavorsCarousel');
const carouselPrev = $('#carouselPrev');
const carouselNext = $('#carouselNext');
let carouselIndex  = 0;

function getVisible() {
  return window.innerWidth < 600 ? 1 : window.innerWidth < 900 ? 2 : 3;
}
function updateCarousel() {
  const cards   = $$('.flavor-card', carousel);
  const visible = getVisible();
  const max     = cards.length - visible;
  carouselIndex = Math.max(0, Math.min(carouselIndex, max));
  gsap.to(carousel, { x: `-${(100 / visible) * carouselIndex}%`, duration: .48, ease: 'power2.out' });
}

carouselPrev.addEventListener('click', () => { carouselIndex--; updateCarousel(); });
carouselNext.addEventListener('click', () => { carouselIndex++; updateCarousel(); });

/* ── Subscribe section ───────────────────────────────────── */
const subObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      $$('.sub-line').forEach((l, i) => setTimeout(() => l.classList.add('in-view'), i * 130));
      const rocket = $('.subscribe-rocket');
      const badge  = $('.bubble-badge');
      if (rocket) setTimeout(() => rocket.classList.add('in-view'), 200);
      if (badge)  setTimeout(() => badge.classList.add('in-view'),  420);
      subObs.disconnect();
    }
  });
}, { threshold: 0.12 });

const subSection = $('#subscribe');
if (subSection) subObs.observe(subSection);

/* ── GSAP scroll extras ──────────────────────────────────── */
gsap.from('.flavor-card', {
  opacity: 0, y: 60, stagger: .13, duration: .7, ease: 'power2.out',
  scrollTrigger: { trigger: '.flavors-carousel', start: 'top 82%' },
});

$$('.footer-col').forEach((col, i) => {
  gsap.from(col, {
    opacity: 0, y: 28, duration: .6, delay: i * .1,
    scrollTrigger: { trigger: col, start: 'top 92%' },
  });
});

gsap.from('.footer-brand', {
  opacity: 0, x: -30, duration: .7,
  scrollTrigger: { trigger: '.footer-brand', start: 'top 92%' },
});
