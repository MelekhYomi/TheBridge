// Mobile menu toggle.
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// Prevent double submits (important for payment forms).
document.querySelectorAll('form[data-once]').forEach((form) => {
  form.addEventListener('submit', () => {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.dataset.label = btn.innerHTML;
      btn.textContent = 'Please wait…';
    }
  });
});

// Scroll reveal: fade sections in as they enter the viewport.
const revealables = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  revealables.forEach((el) => io.observe(el));
} else {
  revealables.forEach((el) => el.classList.add('in'));
}

// Spotlight that follows the pointer on the field cards.
document.querySelectorAll('.field').forEach((card) => {
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
});

// Restore buttons when the page comes back from the bfcache (e.g. back from checkout).
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.querySelectorAll('button[data-label]').forEach((btn) => {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.label;
  });
});

// YouTube: swap the thumbnail for the real player only when someone presses play.
document.querySelectorAll('a.yt[data-yt]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${link.dataset.yt}?autoplay=1&rel=0`;
    frame.title = link.getAttribute('aria-label') || 'Video';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    frame.allowFullscreen = true;
    const box = document.createElement('div');
    box.className = 'yt';
    box.append(frame);
    link.replaceWith(box);
  });
});
