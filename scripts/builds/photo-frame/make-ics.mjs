// A made-up Outlook-style calendar (.ics) for the current Monday-to-Friday week in America/New_York,
// shaped like the feed Outlook publishes (Windows time zone name, X-MICROSOFT-CDO-BUSYSTATUS for
// show-as). Every title is invented; first names only. Nothing here comes from a real calendar.
//
//   node make-ics.mjs > demo.ics          (or import { makeIcs } from './make-ics.mjs')

const TZ = 'America/New_York';
const ET = ';TZID=Eastern Standard Time:';
const CRLF = '\r\n';

// Today's date in New York as a UTC-midnight Date, so day arithmetic never crosses a DST edge.
function nyToday(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now).map(x => [x.type, x.value]));
  return new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
}
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const ymd = d => d.toISOString().slice(0, 10).replace(/-/g, '');
const at = (d, hhmm) => ymd(d) + 'T' + hhmm.replace(':', '') + '00';

// US Thanksgiving: the fourth Thursday of November.
function isThanksgiving(d) {
  return d.getUTCMonth() === 10 && d.getUTCDay() === 4 && d.getUTCDate() >= 22 && d.getUTCDate() <= 28;
}

// The work week the page shows: Monday to Friday of this week (from Saturday on, the next one).
export function weekMonday(now = new Date()) {
  const t = nyToday(now);
  const dow = t.getUTCDay();
  return addDays(t, -((dow + 6) % 7) + (dow === 6 || dow === 0 ? 7 : 0));
}

const STATUS = { busy: 'BUSY', tentative: 'TENTATIVE', free: 'FREE', oof: 'OOF', elsewhere: 'WORKINGELSEWHERE' };
const TEAMS = 'Microsoft Teams Meeting';

// One-off timed events: [weekday 0=Mon..4=Fri, start, end, title, show-as, location]
const TIMED = [
  [0, '11:00', '12:30', 'Focus: quarterly review deck', 'busy', ''],
  [0, '12:30', '13:15', 'Lunch', 'free', ''],
  [0, '13:30', '14:00', '1:1 with Sam', 'busy', TEAMS],
  [0, '14:00', '15:00', 'Design review', 'busy', 'Conference Room B'],
  [0, '14:30', '15:30', 'Vendor demo', 'tentative', TEAMS],
  [0, '15:30', '16:30', 'Budget planning', 'busy', 'Conference Room A'],
  [0, '17:00', '18:00', 'Gym (personal)', 'busy', ''],

  [1, '09:30', '10:00', 'Hiring sync with Priya', 'busy', TEAMS],
  [1, '10:00', '11:30', 'Focus: write project update', 'busy', ''],
  [1, '11:00', '11:30', 'Roadmap check-in', 'tentative', TEAMS],
  [1, '12:00', '13:00', 'Lunch with Alex', 'free', 'Cafe'],
  [1, '13:00', '14:00', 'Dentist (personal)', 'oof', ''],
  [1, '14:00', '14:30', '1:1 with Jordan', 'busy', TEAMS],
  [1, '14:30', '15:00', 'Office hours', 'free', ''],
  [1, '15:00', '16:00', 'Quarterly planning', 'busy', 'Conference Room A'],
  [1, '15:30', '16:30', 'Release review', 'tentative', TEAMS],
  [1, '16:30', '17:30', 'Focus: inbox and follow-ups', 'busy', ''],

  [2, '10:00', '12:00', 'Team workshop', 'elsewhere', 'Library meeting room'],
  [2, '10:30', '11:00', 'Customer feedback review', 'tentative', TEAMS],
  [2, '12:00', '12:45', 'Lunch', 'free', ''],
  [2, '13:00', '13:30', '1:1 with Maria', 'busy', TEAMS],
  [2, '13:30', '14:30', 'Design review', 'busy', 'Conference Room B'],
  [2, '14:30', '16:00', 'Focus: budget forecast', 'busy', ''],
  [2, '16:00', '16:30', 'Holiday coverage plan', 'tentative', TEAMS],
  [2, '17:00', '18:00', 'Drive to family (personal)', 'oof', ''],

  [4, '10:00', '11:30', 'Focus: clear the backlog', 'busy', ''],
  [4, '12:00', '13:00', 'Lunch', 'free', ''],
  [4, '14:00', '14:30', 'Coffee chat with Dana', 'tentative', ''],
];

// All-day events: [weekday, title, show-as]
function allDay(week) {
  const thu = week[3];
  return [
    [1, 'Budget submissions due', 'free'],
    [2, 'Chris out', 'free'],
    [3, isThanksgiving(thu) ? 'Thanksgiving' : 'Day off', 'oof'],
    [4, 'Holiday week · light day', 'free'],
  ];
}

export function makeIcs(now = new Date()) {
  const mon = weekMonday(now);
  const week = [0, 1, 2, 3, 4].map(i => addDays(mon, i));
  const stamp = 'DTSTAMP:' + new Date(now).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = [];
  const push = (...l) => lines.push(...l);
  let n = 0;
  const ev = (props, show) => {
    n++;
    push('BEGIN:VEVENT', ...props,
      'X-MICROSOFT-CDO-BUSYSTATUS:' + STATUS[show],
      'TRANSP:' + (show === 'free' ? 'TRANSPARENT' : 'OPAQUE'),
      'CLASS:PUBLIC', 'PRIORITY:5', 'SEQUENCE:0', stamp, 'END:VEVENT');
  };

  push('BEGIN:VCALENDAR', 'METHOD:PUBLISH', 'PRODID:Microsoft Exchange Server 2010', 'VERSION:2.0', 'X-WR-CALNAME:Calendar',
    'BEGIN:VTIMEZONE', 'TZID:Eastern Standard Time',
    'BEGIN:STANDARD', 'DTSTART:16010101T020000', 'TZOFFSETFROM:-0400', 'TZOFFSETTO:-0500',
    'RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=1SU;BYMONTH=11', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:16010101T020000', 'TZOFFSETFROM:-0500', 'TZOFFSETTO:-0400',
    'RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=2SU;BYMONTH=3', 'END:DAYLIGHT',
    'END:VTIMEZONE');

  // Recurring: a daily standup (Mon, Tue, Wed, Fri) that began weeks ago, with this Wednesday's
  // moved earlier, and a weekly team sync every Monday.
  const firstMon = addDays(mon, -42);
  ev(['UID:demo-standup', 'SUMMARY:Daily standup', 'LOCATION:' + TEAMS,
    'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,FR',
    'DTSTART' + ET + at(firstMon, '09:00'), 'DTEND' + ET + at(firstMon, '09:15')], 'busy');
  ev(['UID:demo-standup', 'RECURRENCE-ID' + ET + at(week[2], '09:00'), 'SUMMARY:Daily standup (moved)', 'LOCATION:' + TEAMS,
    'DTSTART' + ET + at(week[2], '08:30'), 'DTEND' + ET + at(week[2], '08:45')], 'busy');
  ev(['UID:demo-weekly-sync', 'SUMMARY:Weekly team sync', 'LOCATION:' + TEAMS,
    'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO',
    'DTSTART' + ET + at(firstMon, '10:00'), 'DTEND' + ET + at(firstMon, '10:45')], 'busy');

  TIMED.forEach(([d, s, e, title, show, loc], i) => {
    ev(['UID:demo-' + i, 'SUMMARY:' + title, ...(loc ? ['LOCATION:' + loc] : []),
      'DTSTART' + ET + at(week[d], s), 'DTEND' + ET + at(week[d], e)], show);
  });
  allDay(week).forEach(([d, title, show], i) => {
    ev(['UID:demo-allday-' + i, 'SUMMARY:' + title,
      'DTSTART;VALUE=DATE:' + ymd(week[d]), 'DTEND;VALUE=DATE:' + ymd(addDays(week[d], 1))], show);
  });

  push('END:VCALENDAR');
  return lines.join(CRLF) + CRLF;
}

// The titles, for the record.
export function titles(now = new Date()) {
  const mon = weekMonday(now);
  const week = [0, 1, 2, 3, 4].map(i => addDays(mon, i));
  return ['Daily standup', 'Daily standup (moved)', 'Weekly team sync']
    .concat(TIMED.map(t => t[3]), allDay(week).map(a => a[1]));
}

if (import.meta.url === 'file://' + process.argv[1]) process.stdout.write(makeIcs());
