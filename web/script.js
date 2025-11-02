// Alkalmazás indulási napló a fejlesztéshez
console.log("Sötét Térkép Alkalmazás betöltve");

// Landing hero parallax + belépő animációk
if (window.gsap) {
  const heroCard = document.getElementById('hero-card');
  if (heroCard) {
    // Make sure it's visible even with [data-animate] baseline hidden
    heroCard.classList.add('in-view');
    gsap.from(heroCard, { y: 28, opacity: 0, duration: 0.7, ease: 'power2.out' });
  }
  const parallaxEls = document.querySelectorAll('.parallax');
  if (parallaxEls.length) {
    window.addEventListener('mousemove', (e) => {
      const cx = e.clientX / window.innerWidth - 0.5;
      const cy = e.clientY / window.innerHeight - 0.5;
      parallaxEls.forEach(el => {
        const depth = parseFloat(el.getAttribute('data-depth') || '0.05');
        const x = -cx * 40 * depth;
        const y = -cy * 40 * depth;
        gsap.to(el, { x, y, duration: 0.5, ease: 'power2.out' });
      });
    });
  }
  const dots = document.getElementById('bg-dots');
  if (dots) {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 10;
      const y = (e.clientY / window.innerHeight - 0.5) * 10;
      gsap.to(dots, { backgroundPosition: `${x}px ${y}px`, duration: 0.4, ease: 'power1.out' });
    });
  }
}

// Scroll-in animációk
(function setupInView(){
  const els = document.querySelectorAll('[data-animate]');
  if (!('IntersectionObserver' in window) || !els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
})();

// Footer év
(function setYear(){
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

// Carousel gombok
(function setupCarousel(){
  const scroller = document.getElementById('testi');
  if (!scroller) return;
  function scrollByCard(dir = 1) {
    const card = scroller.querySelector('article');
    const delta = (card ? card.getBoundingClientRect().width + 16 : 320) * dir;
    scroller.scrollBy({ left: delta, behavior: 'smooth' });
  }
  const prev = document.getElementById('t-prev');
  const next = document.getElementById('t-next');
  const prevM = document.getElementById('t-prev-m');
  const nextM = document.getElementById('t-next-m');
  if (prev) prev.addEventListener('click', () => scrollByCard(-1));
  if (next) next.addEventListener('click', () => scrollByCard(1));
  if (prevM) prevM.addEventListener('click', () => scrollByCard(-1));
  if (nextM) nextM.addEventListener('click', () => scrollByCard(1));
})();

// Egyszerű mock autentikáció localStorage segítségével
const USERS_KEY = 'dma_users';
const SESSION_KEY = 'dma_session';

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function saveSession(email) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email, ts: Date.now() }));
}

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}

// Session-alapú átirányítások/CTA módosítás
(function sessionRouting(){
  const session = readSession();
  // Ha van session és login/reg oldalon vagyunk, irány a térkép
  const isLoginPage = !!document.getElementById('form-login');
  const isRegisterPage = !!document.getElementById('form-register');
  if (session && (isLoginPage || isRegisterPage)) {
    window.location.href = 'map.html';
    return;
  }
  // Landing CTA: ha be vagy jelentkezve, a gomb menjen közvetlen a térképre
  if (session) {
    const cta = document.querySelector('a.cta-primary[href="register.html"]');
    if (cta) cta.setAttribute('href', 'map.html');
  }
})();

// Regisztráció / Bejelentkezés tabok (ha jelen vannak)
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

if (tabLogin && tabRegister && formLogin && formRegister) {
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('bg-white/10', 'ring-1', 'ring-[#a855f7]/40', 'shadow-[0_0_10px_rgba(168,85,247,0.4)]');
    tabRegister.classList.remove('bg-white/10', 'ring-1', 'ring-[#a855f7]/40', 'shadow-[0_0_10px_rgba(168,85,247,0.4)]');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('bg-white/10', 'ring-1', 'ring-[#a855f7]/40', 'shadow-[0_0_10px_rgba(168,85,247,0.4)]');
    tabLogin.classList.remove('bg-white/10', 'ring-1', 'ring-[#a855f7]/40', 'shadow-[0_0_10px_rgba(168,85,247,0.4)]');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
  });
}

// Regisztráció
const regForm = document.getElementById('form-register');
if (regForm) {
  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;
    const err = document.getElementById('register-error');
    const ok = document.getElementById('register-success');
    err.classList.add('hidden');
    ok.classList.add('hidden');
    
    // Ellenőrizzük, hogy a két jelszó megegyezik-e
    if (password !== passwordConfirm) {
      err.textContent = 'A két jelszó nem egyezik meg.';
      err.classList.remove('hidden');
      return;
    }
    
    const users = readUsers();
    if (users[email]) {
      err.textContent = 'Már létező felhasználó.';
      err.classList.remove('hidden');
      return;
    }
    users[email] = { password };
    writeUsers(users);
    saveSession(email);
    ok.classList.remove('hidden');
    // Rövid késleltetés után irány a térkép
    setTimeout(() => window.location.href = 'map.html', 400);
  });
}

// Bejelentkezés
const loginForm = document.getElementById('form-login');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    err.classList.add('hidden');
    const users = readUsers();
    if (!users[email] || users[email].password !== password) {
      err.classList.remove('hidden');
      return;
    }
    saveSession(email);
    window.location.href = 'map.html';
  });
}