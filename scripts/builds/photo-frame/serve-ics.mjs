// Serves the made-up calendar at http://127.0.0.1:<port>/calendar.ics for the local Worker's
// OUTLOOK_ICS_URL. Regenerated on every request, so it always covers the current week.
//   node serve-ics.mjs [port=5288]
import http from 'node:http';
import { makeIcs } from './make-ics.mjs';

const port = Number(process.argv[2]) || 5288;
http.createServer((req, res) => {
  if (req.url.split('?')[0] !== '/calendar.ics') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/calendar; charset=utf-8' });
  res.end(makeIcs());
}).listen(port, '127.0.0.1', () => console.log('calendar on http://127.0.0.1:' + port + '/calendar.ics'));
