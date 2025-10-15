#!/usr/bin/env node

process.exit(0);

const fs = require('fs');
const path = require('path');

function readEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const examplePath = path.resolve(process.cwd(), '.env.example');
  const env = {};

  const load = (p) => {
    if (!fs.existsSync(p)) return;
    const content = fs.readFileSync(p, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
      if (key) env[key] = val;
    }
  };

  // .env overrides .env.example defaults
  load(examplePath);
  load(envPath);
  return env;
}

function delay(ms) { return new Promise((res) => setTimeout(res, ms)); }

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} on ${url}: ${text}`);
  }
  return res.json();
}

function normalizePlace(p) {
  // price_level: 0-4, rating: 0-5
  const location = p.geometry && p.geometry.location;
  return {
    name: p.name || 'Unknown',
    type: (p.types || []).join(', '),
    coordinates: location ? [location.lat, location.lng] : [0, 0],
    price: typeof p.price_level === 'number' ? p.price_level : null,
    address: p.vicinity || p.formatted_address || '',
    rating: typeof p.rating === 'number' ? p.rating : null
  };
}

async function fetchNearby({ apiKey, lat, lng, radius, type }) {
  const fields = [
    'name',
    'geometry/location',
    'price_level',
    'rating',
    'vicinity',
    'formatted_address',
    'types'
  ].join('%2C');

  let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${encodeURIComponent(type)}&key=${apiKey}`;

  const all = [];
  for (let page = 0; page < 3; page++) {
    const data = await fetchJson(url);
    if (Array.isArray(data.results)) {
      for (const r of data.results) {
        all.push(normalizePlace(r));
      }
    }
    if (data.next_page_token) {
      // Google requires a short delay before next_page_token becomes valid
      await delay(2000);
      url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${data.next_page_token}&key=${apiKey}`;
    } else {
      break;
    }
  }
  return all;
}

(async () => {
  try {
    const env = readEnv();
    const apiKey = env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY is missing. Set it in .env');
      process.exit(1);
    }
    const lat = parseFloat(env.DEFAULT_LOCATION_LAT || '47.4979');
    const lng = parseFloat(env.DEFAULT_LOCATION_LNG || '19.0402');
    const radius = parseInt(env.SEARCH_RADIUS_METERS || '3000', 10);
    const types = String(env.PLACE_TYPES || 'bar|night_club|cafe|restaurant').split('|');

    const results = [];
    const seen = new Set();

    for (const t of types) {
      const list = await fetchNearby({ apiKey, lat, lng, radius, type: t });
      for (const p of list) {
        const key = `${p.name}|${p.coordinates[0].toFixed(6)},${p.coordinates[1].toFixed(6)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(p);
      }
      await delay(200); // be kind
    }

    // Write raw output
    const outDir = path.resolve(process.cwd(), 'web');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const rawPath = path.join(outDir, 'places.raw.json');
    fs.writeFileSync(rawPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Wrote ${results.length} places to ${rawPath}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
