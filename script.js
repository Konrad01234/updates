/* =========================================================
   OrthoSmile – script.js
   13 Animation Modules
   ========================================================= */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── 1. Lucide Icons ──────────────────────────────────────── */
function initLucideIcons() {
  if (window.lucide) lucide.createIcons();
}

/* ── 2. Page Loader ───────────────────────────────────────── */
function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  const hide = () => loader.classList.add('loader--hidden');

  if (document.readyState === 'complete') {
    setTimeout(hide, 300);
  } else {
    window.addEventListener('load', () => setTimeout(hide, 300), { once: true });
    setTimeout(hide, 1200); // fallback
  }
}

/* ── 3. Canvas Cursor Trail ───────────────────────────────── */
function initCursorTrail() {
  if (prefersReducedMotion) return;
  if (window.matchMedia('(hover: none)').matches) return; // skip touch devices

  const canvas = document.getElementById('cursor-trail');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let points = [];
  let mouse = { x: -999, y: -999 };
  let rafId = null;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    points.unshift({ x: e.clientX, y: e.clientY, age: 0 });
    if (points.length > 22) points.pop();
  }, { passive: true });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    points.forEach((p, i) => {
      p.age++;
      const progress = i / points.length;
      const alpha  = (1 - progress) * 0.55;
      const radius = (1 - progress) * 7 + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(43, 163, 154, ${alpha})`;
      ctx.fill();
    });

    rafId = requestAnimationFrame(draw);
  }
  draw();
}

/* ── 4. Navbar Scroll Solid ───────────────────────────────── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('navbar--scrolled', window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ── 5. Active Nav Highlight (IntersectionObserver) ──────── */
function initNavHighlight() {
  const links    = document.querySelectorAll('.nav__link[data-section]');
  const sections = document.querySelectorAll('section[id]');
  if (!links.length || !sections.length) return;

  const map = {};
  links.forEach(l => { map[l.dataset.section] = l; });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('is-active'));
        const active = map[entry.target.id];
        if (active) active.classList.add('is-active');
      }
    });
  }, { threshold: 0.4, rootMargin: '-10% 0px -50% 0px' });

  sections.forEach(s => observer.observe(s));
}

/* ── 6. Mobile Menu ───────────────────────────────────────── */
function initMobileMenu() {
  const burger = document.querySelector('.nav__burger');
  const drawer = document.querySelector('.nav__drawer');
  if (!burger || !drawer) return;

  function toggle(open) {
    burger.classList.toggle('is-open', open);
    drawer.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  burger.addEventListener('click', () => {
    toggle(burger.getAttribute('aria-expanded') !== 'true');
  });

  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => toggle(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle(false);
  });
}

/* ── 7. Scroll Reveal ─────────────────────────────────────── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  if (prefersReducedMotion) {
    els.forEach(el => el.classList.add('is-visible'));
    return;
  }

  // Stagger siblings within same parent
  document.querySelectorAll('.services__grid, .team__grid, .feature-list, .carousel__track').forEach(parent => {
    parent.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${i * 80}ms`);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
}

/* ── 8. Hero Parallax ─────────────────────────────────────── */
function initParallax() {
  if (prefersReducedMotion) return;
  const bg = document.querySelector('.hero__bg');
  if (!bg) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY * 0.45;
        bg.style.transform = `translateY(${y}px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ── 9. Counter Count-Up ──────────────────────────────────── */
function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCounter(el) {
    const target   = parseFloat(el.dataset.count);
    const suffix   = el.dataset.suffix   || '';
    const prefix   = el.dataset.prefix   || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const duration = 1600;
    const startTime = performance.now();

    function tick(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutCubic(progress);
      const value    = eased * target;
      el.textContent = prefix + value.toFixed(decimals) + suffix;

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        el.style.animation = 'countPulse 0.4s ease';
        el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
      }
    }
    requestAnimationFrame(tick);
  }

  if (prefersReducedMotion) {
    els.forEach(el => {
      const target = parseFloat(el.dataset.count);
      el.textContent = (el.dataset.prefix || '') + target + (el.dataset.suffix || '');
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  els.forEach(el => observer.observe(el));
}

/* ── 10. Draggable Carousel ───────────────────────────────── */
function initCarousel() {
  const viewport = document.querySelector('.carousel__viewport');
  const track    = document.getElementById('carousel-track');
  const btnPrev  = document.querySelector('.carousel__btn--prev');
  const btnNext  = document.querySelector('.carousel__btn--next');
  if (!viewport || !track) return;

  const cards = track.querySelectorAll('.stat-card');
  if (!cards.length) return;

  let currentIndex = 0;
  let isDragging   = false;
  let startX       = 0;
  let startOffset  = 0;
  let currentOffset = 0;

  function getCardWidth() {
    return cards[0].offsetWidth + parseInt(getComputedStyle(track).gap || '16');
  }
  function getMaxOffset() {
    return Math.max(0, track.scrollWidth - viewport.offsetWidth - parseInt(getComputedStyle(track).paddingInlineStart || '0') * 2);
  }
  function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

  function goTo(offset, animate = true) {
    currentOffset = clamp(offset, 0, getMaxOffset());
    track.style.transition = animate ? 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
    track.style.transform  = `translateX(-${currentOffset}px)`;
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      goTo(currentOffset - getCardWidth());
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      goTo(currentOffset + getCardWidth());
    });
  }

  // Pointer drag
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    isDragging  = true;
    startX      = e.clientX;
    startOffset = currentOffset;
    viewport.setPointerCapture(e.pointerId);
    track.style.transition = 'none';
    track.style.cursor = 'grabbing';
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const delta = startX - e.clientX;
    const raw   = startOffset + delta;
    track.style.transform = `translateX(-${clamp(raw, -50, getMaxOffset() + 50)}px)`;
  });

  const endDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    track.style.cursor = '';
    const delta = startX - e.clientX;
    const w     = getCardWidth();
    if (Math.abs(delta) > w * 0.25) {
      currentOffset = delta > 0
        ? currentOffset + w
        : currentOffset - w;
    }
    goTo(currentOffset);
  };
  viewport.addEventListener('pointerup',     endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  // Prevent image drag
  track.querySelectorAll('img').forEach(img => {
    img.addEventListener('dragstart', e => e.preventDefault());
  });
}

/* ── 11. Testimonial Slider ───────────────────────────────── */
function initTestimonialSlider() {
  const cards = document.querySelectorAll('.testimonial-card');
  const dots  = document.querySelectorAll('.testimonial-dot');
  if (!cards.length) return;

  let current  = 0;
  let timer    = null;

  function goTo(index) {
    cards[current].classList.remove('is-active');
    dots[current]?.classList.remove('is-active');
    current = (index + cards.length) % cards.length;
    cards[current].classList.add('is-active');
    dots[current]?.classList.add('is-active');
    dots[current]?.setAttribute('aria-selected', 'true');
  }

  function start() {
    timer = setInterval(() => goTo(current + 1), 5000);
  }
  function stop() { clearInterval(timer); }

  goTo(0);
  if (!prefersReducedMotion) start();

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { stop(); goTo(i); start(); });
  });

  const slider = document.querySelector('.testimonial-slider');
  if (slider) {
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', () => { if (!prefersReducedMotion) start(); });
    slider.addEventListener('focusin',    stop);
    slider.addEventListener('focusout',   () => { if (!prefersReducedMotion) start(); });
  }
}

/* ── 12. FAQ Accordion ────────────────────────────────────── */
function initFAQAccordion() {
  const triggers = document.querySelectorAll('.accordion__trigger');
  if (!triggers.length) return;

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item     = trigger.closest('.accordion__item');
      const panel    = trigger.nextElementSibling;
      const isOpen   = item.classList.contains('is-open');

      // Close all
      document.querySelectorAll('.accordion__item.is-open').forEach(openItem => {
        openItem.classList.remove('is-open');
        openItem.querySelector('.accordion__trigger').setAttribute('aria-expanded', 'false');
      });

      // Open clicked (unless already open)
      if (!isOpen) {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        panel?.removeAttribute('hidden');
      }
    });

    // Keyboard support
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
    });
  });
}

/* ── 13. Button Ripple ────────────────────────────────────── */
function initRipple() {
  if (prefersReducedMotion) return;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn || btn.classList.contains('btn--ghost')) return;

    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    Object.assign(ripple.style, {
      width:  `${size}px`,
      height: `${size}px`,
      left:   `${e.clientX - rect.left - size / 2}px`,
      top:    `${e.clientY - rect.top  - size / 2}px`,
    });
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

/* ── Smooth Scroll for Anchor Links ──────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: prefersReducedMotion ? 'instant' : 'smooth' });
    });
  });
}

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initLucideIcons();
  initLoader();
  initCursorTrail();
  initNavbar();
  initNavHighlight();
  initMobileMenu();
  initScrollReveal();
  initParallax();
  initCounters();
  initCarousel();
  initTestimonialSlider();
  initFAQAccordion();
  initRipple();
  initSmoothScroll();
});
