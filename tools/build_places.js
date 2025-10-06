#!/usr/bin/env node

process.exit(0);

const fs = require('fs');
const path = require('path');

function readJsonSafe(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`Failed to read ${p}:`, e.message);
    return fallback;
  }
}

function toKey(place) {
  const lat = Array.isArray(place.coordinates) ? place.coordinates[0] : 0;
  const lng = Array.isArray(place.coordinates) ? place.coordinates[1] : 0;
  return `${place.name}|${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
}

function applyOverrides(places, overrides) {
  const map = new Map();
  for (const p of places) map.set(toKey(p), p);

  for (const o of overrides) {
    // Try to match by name only first, then by key
    const candidates = places.filter(p => p.name === o.name);
    if (candidates.length > 0) {
      for (const c of candidates) {
        if (o.coordinates) c.coordinates = o.coordinates;
        if (typeof o.rating === 'number') c.rating = o.rating;
        if (typeof o.price === 'number') c.price = o.price;
      }
      continue;
    }
    const k = toKey(o);
    if (map.has(k)) {
      const c = map.get(k);
      if (o.coordinates) c.coordinates = o.coordinates;
      if (typeof o.rating === 'number') c.rating = o.rating;
      if (typeof o.price === 'number') c.price = o.price;
    } else {
      // Not found: add as new entry
      map.set(k, {
        name: o.name,
        type: '',
        coordinates: o.coordinates || [0, 0],
        price: typeof o.price === 'number' ? o.price : null,
        address: '',
        rating: typeof o.rating === 'number' ? o.rating : null
      });
    }
  }

  return Array.from(map.values());
}

(function main() {
  const webDir = path.resolve(process.cwd(), 'web');
  const rawPath = path.join(webDir, 'places.raw.json');
  const overridesPath = path.join(webDir, 'places.overrides.json');
  const outPath = path.join(webDir, 'places.json');

  const raw = readJsonSafe(rawPath, []);
  const overrides = readJsonSafe(overridesPath, []);

  const merged = applyOverrides(raw, overrides)
    .filter(p => Array.isArray(p.coordinates) && p.coordinates.length === 2)
    .map(p => ({
      name: p.name,
      type: p.type || '',
      coordinates: [Number(p.coordinates[0]), Number(p.coordinates[1])],
      price: p.price == null ? null : Number(p.price),
      address: p.address || '',
      rating: p.rating == null ? null : Number(p.rating)
    }));

  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`Wrote ${merged.length} places to ${outPath}`);
})();
