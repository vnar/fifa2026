/**
 * Parses Roadtrips markdown (FIFA draw–aligned) → ALL_MATCHES lines.
 * Run from repo: node scripts/build-schedule.mjs
 *
 * SCHEDULE VERIFICATION (manual, required for accuracy):
 * Compare generated kickoff times (Eastern Time) against the official list at
 * https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
 * before treating output as authoritative. Do not scrape FIFA from this script;
 * update scripts/schedule-source.txt from verified published data only.
 * See scripts/SCHEDULE_VERIFICATION.md in this repo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [path.join(__dirname, 'schedule-source.txt')];
let src = '';
for (const p of candidates) {
  try {
    src = fs.readFileSync(p, 'utf8');
    if (src.length > 1000) break;
  } catch (_) {}
}
if (!src) {
  console.error('No schedule source file found. Copy agent-tools markdown to scripts/schedule-source.txt');
  process.exit(1);
}

function etFromParts(h, m) {
  const H = Number(h);
  const M = Number(m || 0);
  const p = H >= 12 ? 'PM' : 'AM';
  const h12 = H % 12 || 12;
  return `${h12}:${String(M).padStart(2, '0')} ${p}`;
}

function dayShort(iso) {
  const d = new Date(iso + 'T12:00:00');
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function countryForCity(city) {
  const c = city.toLowerCase();
  if (/mexico city|guadalajara|monterrey|zapopan/.test(c)) return 'Mexico';
  if (/toronto|vancouver/.test(c)) return 'Canada';
  return 'USA';
}

function normCity(city) {
  if (city === 'New York/New Jersey') return 'East Rutherford';
  if (city === 'San Francisco Bay Area') return 'Santa Clara';
  if (city === 'Boston') return 'Foxborough';
  if (city === 'Dallas') return 'Arlington';
  if (city === 'Los Angeles') return 'Inglewood';
  if (city === 'Miami') return 'Miami Gardens';
  if (city === 'Guadalajara') return 'Zapopan';
  return city;
}

function normVenue(v) {
  return v.replace(/^\[|\]\([^)]*\)/g, '').replace(/\]$/, '').trim();
}

function normTeam(t) {
  return t
    .replace(/Côte d'Ivoire/g, 'Ivory Coast')
    .replace(/Curaçao/g, 'Curacao')
    .replace(/Cabo Verde/g, 'Cape Verde')
    .replace(/Congo DR/g, 'DR Congo')
    .replace(/Türkiye/g, 'Turkiye')
    .replace(/Bosnia and Herzegovina/g, 'Bosnia & Herzegovina');
}

function isoFromRoad(d) {
  const m = d.match(/^(\d+)-(\w+)-(\d+)$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const mon = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07' }[m[2]];
  return `2026-${mon}-${day}`;
}

function r32Teams(desc) {
  let s = desc
    .replace(/Group ([A-L]) Winners/g, 'Winner Grp $1')
    .replace(/Group ([A-L]) Runners Up/g, 'Runner-up Grp $1')
    .replace(/Group ([A-L])\/([A-L])\/([A-L])\/([A-L])\/([A-L]) 3rd Place/g, 'Best 3rd ($1/$2/$3/$4/$5)')
    .replace(/Group ([A-L])\/([A-L])\/([A-L])\/([A-L]) 3rd Place/g, 'Best 3rd ($1/$2/$3/$4)')
    .replace(/Group ([A-L])\/([A-L])\/([A-L]) 3rd Place/g, 'Best 3rd ($1/$2/$3)');
  const parts = s.split(/\s+v\s+/i);
  return { t1: parts[0].trim(), t2: parts[1].trim() };
}

const rows = [];
for (const line of src.split('\n')) {
  if (!/^\|\s*\d+\s*\|/.test(line)) continue;
  const cells = line.split('|').map((c) => c.trim());
  const id = parseInt(cells[1], 10);
  if (id < 1 || id > 104) continue;
  const dateRaw = cells[2];
  const iso = isoFromRoad(dateRaw);
  if (!iso) continue;
  const et = cells[3];
  const [eh, em] = et.split(':');
  const timeEt = etFromParts(eh, em);
  const day = dayShort(iso);
  const matchup = cells[5];
  let group = '-';
  let venueCell, cityCell, stage;
  if (/^[A-L]$/.test(cells[6] || '')) {
    group = cells[6];
    venueCell = cells[7];
    cityCell = cells[8];
    stage = 'Group Stage';
  } else {
    venueCell = cells[6];
    cityCell = cells[7];
    if (id <= 88) stage = 'Round of 32';
    else if (id <= 96) stage = 'Round of 16';
    else if (id <= 100) stage = 'Quarterfinal';
    else if (id <= 102) stage = 'Semifinal';
    else if (id === 103) stage = '3rd Place Match';
    else stage = 'FINAL';
  }
  const venue = normVenue(venueCell.replace(/\[([^\]]+)\].*/, '$1'));
  const city = normCity((cityCell || '').replace(/\|$/, '').trim());
  const country = countryForCity(city);
  let t1, t2;
  if (/^Match \d+/i.test(matchup)) {
    const w = matchup.match(/Match (\d+) Winner v Match (\d+) Winner/i);
    const l = matchup.match(/Match (\d+) Loser v Match (\d+) Loser/i);
    if (l) {
      t1 = `Loser M${l[1]}`;
      t2 = `Loser M${l[2]}`;
    } else if (w) {
      t1 = `Winner M${w[1]}`;
      t2 = `Winner M${w[2]}`;
    } else {
      t1 = 'TBD';
      t2 = 'TBD';
    }
  } else if (/^Group /i.test(matchup) && stage === 'Round of 32') {
    const z = r32Teams(matchup);
    t1 = z.t1;
    t2 = z.t2;
  } else if (matchup.includes(' v ')) {
    const [a, b] = matchup.split(/\s+v\s+/i).map((x) => normTeam(x.trim()));
    t1 = a;
    t2 = b;
  } else {
    t1 = 'TBD';
    t2 = 'TBD';
  }
  rows.push({ id, date: iso, day, time: timeEt, stage, group, t1, t2, venue, city, country });
}

rows.sort((a, b) => a.id - b.id);

for (const r of rows) {
  const g = JSON.stringify(r.group);
  process.stdout.write(
    `  {id:${r.id},date:"${r.date}",day:"${r.day}",time:"${r.time}",stage:"${r.stage}",group:${g},t1:${JSON.stringify(r.t1)},t2:${JSON.stringify(r.t2)},venue:${JSON.stringify(r.venue)},city:${JSON.stringify(r.city)},country:${JSON.stringify(r.country)}},\n`,
  );
}
