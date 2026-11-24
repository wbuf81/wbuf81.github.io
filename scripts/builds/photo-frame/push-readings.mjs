// Pushes made-up readings to the LOCAL Worker only, in the shapes mac/claude-readings.js and
// mac/tesla-readings.js produce: Claude usage for two invented orgs (Apollo, Voyager) and one car
// at an invented public place near Cape Canaveral. Times are worked out from the moment the page's
// clock is frozen at, so "as of" and the reset ticks read right.
//   node push-readings.mjs <base http://localhost:5287> <push key> <frozen ISO time>
export const PLACES = {
  // Public places only. The map is centred on them; nothing is a home or a real parking spot.
  ksc: { name: 'Space Center', lat: 28.5233, lon: -80.6819 },
  pier: { name: 'Cocoa Beach Pier', lat: 28.3681, lon: -80.6017 },
  road: { lat: 28.3405, lon: -80.6086 }, // on A1A in Cocoa Beach, a public road
};

const H = 3600000;
const iso = ms => new Date(ms).toISOString();

// This week's day at hh:00 New York time (day: 0 = Sunday), as ms; a week on if already past.
function nextAt(t, day, hour) {
  const q = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', weekday: 'short', hour: 'numeric', minute: 'numeric' })
    .formatToParts(new Date(t)).map(x => [x.type, x.value]));
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(q.weekday);
  const nowH = +q.hour + +q.minute / 60;
  let ahead = ((day - dow + 7) % 7) * 24 + (hour - nowH);
  if (ahead <= 0) ahead += 7 * 24;
  return Math.round((t + ahead * H) / 60000) * 60000;
}

export function claudeReadings(now) {
  const t = new Date(now).getTime();
  // Each org's weekly limit resets at a fixed time (Apollo Thursday 5 PM, Voyager Friday 9 AM);
  // the ring's tick is how much of that week has gone by.
  const org = (name, week, resetDay, resetHour, session, sessionElapsed, light) => {
    const reset = nextAt(t, resetDay, resetHour);
    return { name, week, weekElapsed: 1 - (reset - t) / (7 * 24 * H), weekResetsAt: iso(reset), session, sessionElapsed, light, readAt: iso(t - 2 * 60000), stale: false };
  };
  return {
    updated: iso(t - 2 * 60000),
    orgs: [
      org('Apollo', 35, 4, 17, 22, 0.38, 'green'),
      org('Voyager', 61, 5, 9, 67, 0.72, 'yellow'),
    ],
  };
}

// The car's name and model are the ones the app's own tests use.
export function carReading(now) {
  const t = new Date(now).getTime();
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(new Date(t)));
  const base = { name: 'Elon', model: 'Model Y', online: 'online', stale: false, atHome: false, guess: null, route: null, charging: false, locked: true, address: null, readAt: iso(t - 3 * 60000) };
  if (hour < 12) {
    // Morning: on the way to the visitor complex.
    const p = { lat: PLACES.road.lat, lon: PLACES.road.lon };
    return Object.assign(base, { activity: 'driving', place: null, since: iso(t - 18 * 60000), position: p, map: p, heading: 2, speedMph: 44,
      route: { destination: PLACES.ksc.name, arriveAt: iso(t + 31 * 60000), miles: 21.4 }, battery: 84, rangeMiles: 268, locked: true });
  }
  const spot = hour < 18 ? PLACES.ksc : PLACES.pier;
  const p = { lat: spot.lat, lon: spot.lon };
  return Object.assign(base, { activity: 'parked', place: spot.name, since: iso(t - (hour < 18 ? 5.4 : 1.5) * H), position: p, map: p, heading: 0, speedMph: 0,
    battery: hour < 18 ? 78 : 71, rangeMiles: hour < 18 ? 245 : 223, online: hour < 18 ? 'online' : 'asleep' });
}

export async function push(base, key, now) {
  const put = (path, body) => fetch(base + path, { method: 'PUT', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw new Error(path + ' answered ' + r.status); });
  await put('/api/claude', claudeReadings(now));
  await put('/api/tesla', carReading(now));
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const [base, key, now] = process.argv.slice(2);
  push(base, key, now || new Date().toISOString()).then(() => console.log('pushed'), e => { console.error(e.message); process.exit(1); });
}
