// Import Leaflet library
const L = window.L

// Map oldal logika
if (L) {
  const map = L.map("map", {
    zoomControl: false,
    dragging: true,
    scrollWheelZoom: true,
    touchZoom: true,
    tap: true,
  }).setView([0, 0], 13)

  // Sötét (Carto Dark Matter) csempék beállítása
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap contributors & CARTO",
    subdomains: "abcd",
    maxZoom: 19,
  }).addTo(map)

  L.control.zoom({ position: "bottomright" }).addTo(map)

  // Kedvencek (localStorage)
  const FAV_KEY = "dma_favorites"
  function favKeyOf(p) {
    return `${p.name}|${p.coordinates[0]},${p.coordinates[1]}`
  }
  function readFavs() {
    try {
      return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || [])
    } catch {
      return new Set()
    }
  }
  function writeFavs(set) {
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(set)))
  }
  function isFav(p, favs) {
    return favs.has(favKeyOf(p))
  }
  function toggleFav(p) {
    const favs = readFavs()
    const k = favKeyOf(p)
    if (favs.has(k)) favs.delete(k)
    else favs.add(k)
    writeFavs(favs)
    updateFavCount()
  }
  function updateFavCount() {
    const c = document.getElementById("fav-count")
    if (!c) return
    try {
      const n = JSON.parse(localStorage.getItem(FAV_KEY) || "[]").length
      c.textContent = n ? `(${n})` : ""
    } catch {
      c.textContent = ""
    }
  }

  // Neon jelölő a felhasználó helyéhez (piros)
  function addNeonMarker(lat, lng) {
    const icon = L.divIcon({
      className: "neon",
      html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ef4444;box-shadow:0 0 4px #ef4444;"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    L.marker([lat, lng], { icon }).addTo(map).bindPopup("Itt vagy")
  }

  if (navigator.geolocation) {
    let userMarker
    let accuracyCircle
    let centeredOnce = false
    let activeWatchId = null
    const fallback = [48.103, 20.79]

    const isSecure =
      location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1"
    if (!isSecure) {
      console.warn("Geolokáció: pontosság javításához futtasd https-en vagy localhoston.")
    }

    const startWatch = () =>
      navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords
          const latlng = [latitude, longitude]

          if (!centeredOnce) {
            map.setView(latlng, 15)
            centeredOnce = true
            loadPlacesAndRender(latlng)
          }

          if (!userMarker) {
            const icon = L.divIcon({
              className: "neon",
              html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ef4444;box-shadow:0 0 4px #ef4444;"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })
            userMarker = L.marker(latlng, { icon }).addTo(map).bindPopup("Itt vagy")
          } else {
            userMarker.setLatLng(latlng)
          }

          if (accuracyCircle) accuracyCircle.remove()
          accuracyCircle = L.circle(latlng, {
            radius: Math.min(accuracy || 0, 200),
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(map)

          if (typeof accuracy === "number" && accuracy <= 50) {
            if (activeWatchId !== null) navigator.geolocation.clearWatch(activeWatchId)
          }
          const badge = document.getElementById("accuracy-badge")
          if (badge) badge.textContent = `Pontosság: ${Math.round(accuracy)} m`
        },
        (err) => {
          console.warn("Geolokáció hiba:", err && err.message)
          map.setView(fallback, 12)
          addNeonMarker(fallback[0], fallback[1])
          loadPlacesAndRender(fallback)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      )

    activeWatchId = startWatch()

    const toolsToggle = document.getElementById("tools-toggle")
    const gpsTools = document.getElementById("gps-tools")
    if (toolsToggle && gpsTools) {
      toolsToggle.addEventListener("click", () => {
        gpsTools.classList.toggle("hidden")
      })
    }

    const btnRetry = document.getElementById("gps-retry")
    if (btnRetry) {
      btnRetry.addEventListener("click", () => {
        if (activeWatchId !== null) navigator.geolocation.clearWatch(activeWatchId)
        centeredOnce = false
        activeWatchId = startWatch()
      })
    }

    const btnManual = document.getElementById("manual-set")
    if (btnManual) {
      btnManual.addEventListener("click", () => {
        if (activeWatchId !== null) {
          navigator.geolocation.clearWatch(activeWatchId)
          activeWatchId = null
        }
        const container = map.getContainer()
        const previousCursor = container.style.cursor
        container.style.cursor = "crosshair"
        const wasDragging = map.dragging.enabled()
        if (wasDragging) map.dragging.disable()

        map.once("click", (e) => {
          const latlng = [e.latlng.lat, e.latlng.lng]
          if (!userMarker) {
            const icon = L.divIcon({
              className: "neon",
              html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ef4444;box-shadow:0 0 4px #ef4444;"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })
            userMarker = L.marker(latlng, { icon }).addTo(map).bindPopup("Itt vagy")
          } else {
            userMarker.setLatLng(latlng)
          }
          if (accuracyCircle) accuracyCircle.remove()
          accuracyCircle = L.circle(latlng, {
            radius: 25,
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(map)
          map.setView(latlng, 15, { animate: true })
          const badge = document.getElementById("accuracy-badge")
          if (badge) badge.textContent = "Kézi pozíció beállítva"
          loadPlacesAndRender(latlng)
          container.style.cursor = previousCursor || ""
          if (wasDragging) map.dragging.enable()
        })
      })
    }
  } else {
    const lat = 48.103,
      lng = 20.79 // Miskolc
    map.setView([lat, lng], 12)
    addNeonMarker(lat, lng)
    loadPlacesAndRender([lat, lng])
  }

  const markersByKey = {}
  let selectedKey = null
  let lastOrigin = [0, 0]
  let lastPlaces = []
  let currentTab = "nearby" // or 'favs'

  function placeKeyOf(p) {
    return `${p.name}|${p.coordinates[0]},${p.coordinates[1]}`
  }

  function makeIcon(color, size = 12) {
    const r = Math.round(size / 2)
    return L.divIcon({
      className: "neon",
      html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};box-shadow:0 0 4px ${color};"></div>`,
      iconSize: [size, size],
      iconAnchor: [r, r],
    })
  }

  function popupHtml(p) {
    const price = "€".repeat(p.price || 1)
    const rating = p.rating != null ? Number(p.rating).toFixed(1) : "–"
    const img = p.image
      ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:6px;"/>`
      : ""
    return `
      <div style="min-width:200px;max-width:260px">
        ${img}
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:12px;opacity:.8">${p.address || ""}</div>
        <div style="font-size:12px;margin-top:4px">Ár: <span style="color:#a855f7">${price}</span> · Értékelés: <span style="color:#f59e0b">${rating}</span></div>
      </div>
    `
  }

  function selectPlace(p) {
    const key = placeKeyOf(p)
    if (selectedKey && markersByKey[selectedKey]) {
      markersByKey[selectedKey].setIcon(makeIcon("#06b6d4", 12))
    }
    selectedKey = key
    if (markersByKey[key]) {
      markersByKey[key].setIcon(makeIcon("#f59e0b", 14))
    }
  }

  function distanceKm(a, b) {
    const [lat1, lon1] = a
    const [lat2, lon2] = b
    const R = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const la1 = (lat1 * Math.PI) / 180
    const la2 = (lat2 * Math.PI) / 180
    const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2)
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    return R * c
  }

  // Hazibulik tárolása és betöltése
  let userEvents = []
  let eventMarkers = []

  async function loadUserEvents() {
    userEvents = []
    
    // Először próbáljuk a localStorage-ból (ha van új hazibuli)
    try {
      const tempEvents = localStorage.getItem("user-events-temp")
      if (tempEvents) {
        const parsed = JSON.parse(tempEvents)
        if (Array.isArray(parsed) && parsed.length > 0) {
          userEvents = parsed
        }
      }
    } catch (e) {
      console.error("localStorage eventek betöltése sikertelen", e)
    }

    // Ha nincs localStorage, vagy üres, próbáljuk a JSON fájlból
    if (userEvents.length === 0) {
      try {
        const res = await fetch("./user-events.json")
        userEvents = await res.json()
      } catch (e) {
        console.error("user-events.json betöltése sikertelen", e)
        userEvents = []
      }
    }

    renderEventMarkers()
  }

  function renderEventMarkers() {
    // Eltávolítjuk a régi event markereket
    eventMarkers.forEach((m) => m.remove())
    eventMarkers = []

    // Új event markerek hozzáadása (lila/purple színnel)
    userEvents.forEach((event) => {
      const icon = makeIcon("#a855f7", 14)
      const m = L.marker(event.coordinates, { icon }).addTo(map)
      const popup = `
        <div style="min-width:200px;max-width:260px">
          <div style="font-weight:600;color:#a855f7">🎉 ${event.name}</div>
          <div style="font-size:12px;opacity:.8">${event.address || ""}</div>
          <div style="font-size:12px;margin-top:4px">${event.date ? new Date(event.date).toLocaleString("hu-HU") : ""}</div>
          <div style="font-size:11px;opacity:.6;margin-top:2px">Létrehozó: ${event.creatorName || event.creator}</div>
        </div>
      `
      m.bindPopup(popup)
      eventMarkers.push(m)
    })
  }

  function saveUserEvent(event) {
    userEvents.push(event)
    // Statikus megoldás: localStorage-ban tároljuk, majd manuálisan kell frissíteni a JSON-t
    localStorage.setItem("user-events-temp", JSON.stringify(userEvents))
    renderEventMarkers()
    // TODO: Valós környezetben itt lenne egy API hívás a backend-re
  }

  // Helyek betöltése és kirajzolása
  async function loadPlacesAndRender(origin) {
    lastOrigin = origin
    try {
      const res = await fetch("./places.json")
      const places = await res.json()
      lastPlaces = places
      const withDist = places
        .map((p) => ({ ...p, distance: distanceKm(origin, p.coordinates) }))
        .sort((a, b) => a.distance - b.distance)
      renderList(withDist)
      renderMarkers(withDist)
      updateFavCount()
    } catch (e) {
      console.error("places.json betöltése sikertelen", e)
    }
  }

  // Jelölők kirajzolása
  function renderMarkers(list) {
    Object.values(markersByKey).forEach((m) => m.remove())
    Object.keys(markersByKey).forEach((k) => delete markersByKey[k])
    list.forEach((p) => {
      const key = placeKeyOf(p)
      const m = L.marker(p.coordinates, { icon: makeIcon("#06b6d4", 12) })
        .addTo(map)
        .bindPopup(popupHtml(p))
      m.on("click", () => {
        selectPlace(p)
        openInfo(p)
      })
      markersByKey[key] = m
    })
    if (selectedKey && markersByKey[selectedKey]) {
      markersByKey[selectedKey].setIcon(makeIcon("#f59e0b", 14))
    }
  }

  // Oldalsáv lista kirajzolása
  function renderList(list) {
    const ul = document.getElementById("places-list")
    if (!ul) return
    const favs = readFavs()
    ul.innerHTML = ""

    const filtered = currentTab === "favs" ? list.filter((p) => isFav(p, favs)) : list

    filtered.forEach((p) => {
      const li = document.createElement("li")
      li.className =
        "p-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#22c55e]/60 hover:shadow-[0_0_14px_#22c55e] transition"
      const heartFilled = isFav(p, favs)
      li.innerHTML = `<div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="font-semibold truncate">${p.name}</div>
          <div class="text-xs text-white/70 truncate">${p.type} · ${"\u20ac".repeat(p.price)}${p.distance != null ? ` · ${p.distance.toFixed(1)} km` : ""}</div>
        </div>
        <button class="fav-btn shrink-0 w-8 h-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10" title="Kedvenc">
          <span class="block text-${heartFilled ? "[#22c55e]" : "white/70"}">${heartFilled ? "❤" : "♡"}</span>
        </button>
      </div>`

      // Kattintás a sorra: fókuszálás
      li.addEventListener("click", (ev) => {
        // ha a szívre kattintottunk, ne fókuszáljon a térképre
        if (ev.target instanceof HTMLElement && ev.target.closest && ev.target.closest(".fav-btn")) return
        selectPlace(p)
        map.flyTo(p.coordinates, 19, { duration: 0.8 })
        const key = placeKeyOf(p)
        if (markersByKey[key]) {
          markersByKey[key].openPopup()
        }
      })

      // Szív gomb logika
      const favBtn = li.querySelector(".fav-btn")
      if (favBtn) {
        favBtn.addEventListener("click", (e) => {
          e.stopPropagation()
          toggleFav(p)
          renderList(list)
        })
      }

      ul.appendChild(li)
    })
  }

  // Információs kártya
  const overlay = document.getElementById("info-overlay")
  const card = document.getElementById("info-card")
  const closeBtn = document.getElementById("info-close")
  const elName = document.getElementById("info-name")
  const elAddr = document.getElementById("info-address")
  const elPrice = document.getElementById("info-price")
  const elRating = document.getElementById("info-rating")
  const elImage = document.getElementById("info-image")

  function openInfo(p) {
    if (!overlay) return
    elName.textContent = p.name
    elAddr.textContent = p.address
    elPrice.textContent = "€".repeat(p.price)
    elRating.textContent = p.rating.toFixed(1)
    elImage.src = p.image || ""
    overlay.classList.remove("hidden")
  }

  function closeInfo() {
    if (!overlay) return
    overlay.classList.add("hidden")
  }

  if (closeBtn) closeBtn.addEventListener("click", closeInfo)
  if (overlay)
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeInfo()
    })

  const sidebar = document.getElementById("sidebar")
  const sidebarFab = document.getElementById("sidebar-fab")
  if (sidebar && sidebarFab) {
    sidebarFab.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed")
      setTimeout(() => map.invalidateSize(), 320)
    })
  }

  if (sidebar) {
    map.on("movestart zoomstart", () => {
      sidebar.classList.add("hidden-during-move")
    })
    map.on("moveend zoomend", () => {
      sidebar.classList.remove("hidden-during-move")
    })
  }

  // Tab váltás
  const tabNearby = document.getElementById("tab-nearby")
  const tabFavs = document.getElementById("tab-favs")
  function setTab(tab) {
    currentTab = tab
    if (tabNearby && tabFavs) {
      if (tab === "nearby") {
        tabNearby.classList.add("bg-white/10")
        tabFavs.classList.remove("bg-white/10")
      } else {
        tabFavs.classList.add("bg-white/10")
        tabNearby.classList.remove("bg-white/10")
      }
    }
    // rebuild list using lastPlaces
    const withDist = lastPlaces
      .map((p) => ({ ...p, distance: distanceKm(lastOrigin, p.coordinates) }))
      .sort((a, b) => a.distance - b.distance)
    renderList(withDist)
  }
  if (tabNearby) tabNearby.addEventListener("click", () => setTab("nearby"))
  if (tabFavs) tabFavs.addEventListener("click", () => setTab("favs"))
  updateFavCount()

  const randomPlaceBtn = document.getElementById("random-place-btn")
  if (randomPlaceBtn) {
    randomPlaceBtn.addEventListener("click", () => {
      // véletlenszerű hely kiválasztása a jelenlegi listából
      if (lastPlaces.length === 0) return
      const randomIndex = Math.floor(Math.random() * lastPlaces.length)
      const randomPlace = lastPlaces[randomIndex]

      // hely kiválasztása és navigálás
      selectPlace(randomPlace)
      map.flyTo(randomPlace.coordinates, 19, { duration: 0.8 })

      // marker popup megnyitása
      const key = placeKeyOf(randomPlace)
      if (markersByKey[key]) {
        markersByKey[key].openPopup()
      }
    })
  }

  // Térkép kattintás koordináta mentése (ha profil oldalról jöttünk)
  const returnToProfile = localStorage.getItem("return-to-profile")
  if (returnToProfile) {
    // Egyedi click handler csak pozíció kiválasztáshoz
    const positionSelectHandler = (e) => {
      const coords = [e.latlng.lat, e.latlng.lng]
      localStorage.setItem("selected-event-coords", JSON.stringify(coords))
      localStorage.removeItem("return-to-profile")
      const editMode = localStorage.getItem("edit-event-mode")
      if (editMode) {
        localStorage.removeItem("edit-event-mode")
      }
      // Visszatérés a profil oldalra
      window.location.href = "profile.html"
    }
    map.on("click", positionSelectHandler)
    
    // Felhasználó értesítése
    const editMode = localStorage.getItem("edit-event-mode")
    setTimeout(() => {
      alert(editMode 
        ? "Kattints a térképre az új pozíció kiválasztásához!" 
        : "Kattints a térképre a hazibuli pozíciójának kiválasztásához!")
    }, 500)
  }

  // Hazibulik betöltése a térkép betöltésekor
  loadUserEvents()
}
