// Alkalmazás indulási napló a fejlesztéshez
console.log("Sötét Térkép Alkalmazás betöltve");

// Fülek közti váltás (Bejelentkezés / Regisztráció)
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

// Egyszerű mock autentikáció localStorage segítségével
const USERS_KEY = 'dma_users';

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
  localStorage.setItem('dma_session', JSON.stringify({ email, ts: Date.now() }));
}

// Regisztráció
const regForm = document.getElementById('form-register');
if (regForm) {
  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const err = document.getElementById('register-error');
    const ok = document.getElementById('register-success');
    err.classList.add('hidden');
    ok.classList.add('hidden');
    const users = readUsers();
    if (users[email]) {
      err.classList.remove('hidden');
      return;
    }
    users[email] = { password };
    writeUsers(users);
    ok.classList.remove('hidden');
    // Rövid késleltetés után váltás a bejelentkezés fülre
    setTimeout(() => tabLogin.click(), 500);
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

// Belépő animáció a kártyához
if (window.gsap) {
  gsap.from('#auth-card', { y: 24, opacity: 0, duration: 0.6, ease: 'power2.out' });
  // parallax dots
  const dots = document.getElementById('bg-dots');
  if (dots) {
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 10;
      const y = (e.clientY / window.innerHeight - 0.5) * 10;
      gsap.to(dots, { backgroundPosition: `${x}px ${y}px`, duration: 0.4, ease: 'power1.out' });
    });
  }
}

// Térkép oldal logika
if (window.__DMA_MAP__ && window.L) {
  const map = L.map('map', {
    zoomControl: false,
    dragging: true,
    scrollWheelZoom: true,
    touchZoom: true,
    tap: true
  }).setView([0, 0], 13);

  // Sötét (Carto Dark Matter) csempék beállítása
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors & CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Neon jelölő a felhasználó helyéhez (piros)
  function addNeonMarker(lat, lng) {
    const icon = L.divIcon({
      className: 'neon',
      html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ef4444;box-shadow:0 0 12px #ef4444;"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([lat, lng], { icon }).addTo(map).bindPopup('Itt vagy');
  }

  if (navigator.geolocation) {
    let userMarker;
    let accuracyCircle;
    let centeredOnce = false;
    let activeWatchId = null;
    const fallback = [48.103, 20.790];

    // Ha nem biztonságos kontextus (https vagy localhost), a böngészők pontatlan adatot adhatnak
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecure) {
      console.warn('Geolokáció: pontosság javításához futtasd https-en vagy localhoston.');
    }

    const startWatch = () => navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const latlng = [latitude, longitude];

        if (!centeredOnce) {
          map.setView(latlng, 15);
          centeredOnce = true;
          loadPlacesAndRender(latlng);
        }

        // Marker frissítése
        if (!userMarker) {
          const icon = L.divIcon({
            className: 'neon',
            html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ef4444;box-shadow:0 0 12px #ef4444;"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          });
          userMarker = L.marker(latlng, { icon }).addTo(map).bindPopup('Itt vagy');
        } else {
          userMarker.setLatLng(latlng);
        }

        // Pontossági kör (piros)
        if (accuracyCircle) accuracyCircle.remove();
        accuracyCircle = L.circle(latlng, { radius: Math.min(accuracy || 0, 200), color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }).addTo(map);

        // Ha elég jó a pontosság, leállítjuk a figyelést
        if (typeof accuracy === 'number' && accuracy <= 50) {
          if (activeWatchId !== null) navigator.geolocation.clearWatch(activeWatchId);
        }
        const badge = document.getElementById('accuracy-badge');
        if (badge) badge.textContent = `Pontosság: ${Math.round(accuracy)} m`;
      },
      (err) => {
        console.warn('Geolokáció hiba:', err && err.message);
        map.setView(fallback, 12);
        addNeonMarker(fallback[0], fallback[1]);
        loadPlacesAndRender(fallback);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    activeWatchId = startWatch();

    // Titkos eszköz panel toggle (jobb felső ikon)
    const toolsToggle = document.getElementById('tools-toggle');
    const gpsTools = document.getElementById('gps-tools');
    if (toolsToggle && gpsTools) {
      toolsToggle.addEventListener('click', () => {
        gpsTools.classList.toggle('hidden');
      });
    }

    // Újrapróbálás gomb
    const btnRetry = document.getElementById('gps-retry');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        if (activeWatchId !== null) navigator.geolocation.clearWatch(activeWatchId);
        centeredOnce = false;
        activeWatchId = startWatch();
      });
    }

    // Kézi hely beállítása: a térképre kattintva oda állítjuk a helyzetet
    const btnManual = document.getElementById('manual-set');
    if (btnManual) {
      btnManual.addEventListener('click', () => {
        // Ha megy a watch, állítsuk le, hogy ne írja felül a kézi pozíciót
        if (activeWatchId !== null) {
          navigator.geolocation.clearWatch(activeWatchId);
          activeWatchId = null;
        }
        // Segítség a felhasználónak: kurzor módosítás, drag ideiglenes tiltása
        const container = map.getContainer();
        const previousCursor = container.style.cursor;
        container.style.cursor = 'crosshair';
        const wasDragging = map.dragging.enabled();
        if (wasDragging) map.dragging.disable();

        map.once('click', (e) => {
          const latlng = [e.latlng.lat, e.latlng.lng];
          if (!userMarker) {
            const icon = L.divIcon({
              className: 'neon',
              html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ef4444;box-shadow:0 0 12px #ef4444;"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });
            userMarker = L.marker(latlng, { icon }).addTo(map).bindPopup('Itt vagy');
          } else {
            userMarker.setLatLng(latlng);
          }
          if (accuracyCircle) accuracyCircle.remove();
          accuracyCircle = L.circle(latlng, { radius: 25, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }).addTo(map);
          map.setView(latlng, 15, { animate: true });
          const badge = document.getElementById('accuracy-badge');
          if (badge) badge.textContent = 'Kézi pozíció beállítva';
          // Távolságok újraszámítása az új origóhoz
          loadPlacesAndRender(latlng);
          // Visszaállítások
          container.style.cursor = previousCursor || '';
          if (wasDragging) map.dragging.enable();
        });
      });
    }
  } else {
    // Ha nincs geolokáció támogatás
    const lat = 48.103, lng = 20.790; // Miskolc
    map.setView([lat, lng], 12);
    addNeonMarker(lat, lng);
    loadPlacesAndRender([lat, lng]);
  }

  // Jelölők tárolása kulcs szerint és kiválasztott állapot kezelése
  const markersByKey = {};
  let selectedKey = null;

  function placeKeyOf(p) {
    return `${p.name}|${p.coordinates[0]},${p.coordinates[1]}`;
  }

  function makeIcon(color, size = 12) {
    const r = Math.round(size / 2);
    return L.divIcon({
      className: 'neon',
      html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};box-shadow:0 0 10px ${color};"></div>`,
      iconSize: [size, size],
      iconAnchor: [r, r],
    });
  }

  function popupHtml(p) {
    const price = '€'.repeat(p.price || 1);
    const rating = (p.rating != null) ? Number(p.rating).toFixed(1) : '–';
    const img = p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:6px;"/>` : '';
    return `
      <div style="min-width:200px;max-width:260px">
        ${img}
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:12px;opacity:.8">${p.address || ''}</div>
        <div style="font-size:12px;margin-top:4px">Ár: <span style="color:#a855f7">${price}</span> · Értékelés: <span style="color:#f59e0b">${rating}</span></div>
      </div>
    `;
  }

  function selectPlace(p) {
    const key = placeKeyOf(p);
    // visszaállítjuk a korábbi kiválasztott jelölőt
    if (selectedKey && markersByKey[selectedKey]) {
      markersByKey[selectedKey].setIcon(makeIcon('#06b6d4', 12));
    }
    selectedKey = key;
    // kiválasztott jelölő színe: sárga
    if (markersByKey[key]) {
      markersByKey[key].setIcon(makeIcon('#f59e0b', 14));
    }
  }
  // Haversine-távolság számítása (km)
  function distanceKm(a, b) {
    const [lat1, lon1] = a; const [lat2, lon2] = b;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const la1 = lat1 * Math.PI / 180;
    const la2 = lat2 * Math.PI / 180;
    const x = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(la1) * Math.cos(la2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
    return R * c;
  }

  // Helyek betöltése és kirajzolása
  async function loadPlacesAndRender(origin) {
    try {
      const res = await fetch('./places.json');
      const places = await res.json();
      const withDist = places.map(p => ({...p, distance: distanceKm(origin, p.coordinates)}))
        .sort((a,b)=>a.distance-b.distance);
      renderList(withDist);
      renderMarkers(withDist);
    } catch (e) {
      console.error('places.json betöltése sikertelen', e);
    }
  }

  // Jelölők kirajzolása
  function renderMarkers(list) {
    // Töröljük a korábbi markereket a térképről
    Object.values(markersByKey).forEach(m => m.remove());
    Object.keys(markersByKey).forEach(k => delete markersByKey[k]);
    // Új jelölők létrehozása
    list.forEach((p) => {
      const key = placeKeyOf(p);
      const m = L.marker(p.coordinates, { icon: makeIcon('#06b6d4', 12) })
        .addTo(map)
        .bindPopup(popupHtml(p));
      m.on('click', () => { selectPlace(p); openInfo(p); });
      markersByKey[key] = m;
    });
    // Ha volt korábban kiválasztott, próbáljuk meg visszaállítani a színét
    if (selectedKey && markersByKey[selectedKey]) {
      markersByKey[selectedKey].setIcon(makeIcon('#f59e0b', 14));
    }
  }

  // Oldalsáv lista kirajzolása
  function renderList(list) {
    const ul = document.getElementById('places-list');
    if (!ul) return;
    ul.innerHTML = '';
    list.forEach((p, idx) => {
      const li = document.createElement('li');
      li.className = 'p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#a855f7]/60 hover:shadow-[0_0_14px_#a855f7] cursor-pointer transition';
      li.innerHTML = `<div class="flex items-center justify-between">
        <div>
          <div class="font-semibold">${p.name}</div>
          <div class="text-xs text-white/70">${p.type} · ${'\u20ac'.repeat(p.price)} · ${p.distance.toFixed(1)} km</div>
        </div>
        <div class="w-2 h-2 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]"></div>
      </div>`;
      li.addEventListener('click', () => {
        selectPlace(p);
        map.flyTo(p.coordinates, 19, { duration: 0.8 });
        const key = placeKeyOf(p);
        if (markersByKey[key]) {
          markersByKey[key].openPopup();
        }
      });
      ul.appendChild(li);
    });
  }

  // Információs kártya
  const overlay = document.getElementById('info-overlay');
  const card = document.getElementById('info-card');
  const closeBtn = document.getElementById('info-close');
  const elName = document.getElementById('info-name');
  const elAddr = document.getElementById('info-address');
  const elPrice = document.getElementById('info-price');
  const elRating = document.getElementById('info-rating');
  const elImage = document.getElementById('info-image');

  function openInfo(p) {
    if (!overlay) return;
    elName.textContent = p.name;
    elAddr.textContent = p.address;
    elPrice.textContent = '€'.repeat(p.price);
    elRating.textContent = p.rating.toFixed(1);
    elImage.src = p.image;
    overlay.classList.remove('hidden');
    // dim map
    if (window.gsap) {
      gsap.fromTo(card, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' });
    }
  }

  function closeInfo() {
    if (!overlay) return;
    if (window.gsap) {
      gsap.to(card, { y: 24, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => overlay.classList.add('hidden') });
    } else {
      overlay.classList.add('hidden');
    }
  }

  if (closeBtn) closeBtn.addEventListener('click', closeInfo);
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeInfo(); });

  // Oldalsáv kapcsoló gomb (bal alsó sarok)
  const sidebar = document.getElementById('sidebar');
  const sidebarFab = document.getElementById('sidebar-fab');
  if (sidebar && sidebarFab) {
    sidebarFab.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      setTimeout(() => map.invalidateSize(), 320);
    });
  }

  // Mozgatás/zoom közben rejtsük el vizuálisan a sávot, hogy ne csússzon be/ki
  if (sidebar) {
    map.on('movestart zoomstart', () => {
      sidebar.classList.add('hidden-during-move');
    });
    map.on('moveend zoomend', () => {
      sidebar.classList.remove('hidden-during-move');
    });
  }
}