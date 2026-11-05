// Generates the profile README artwork (header + project cards) as SVG.
// Text is converted to outlines so the Geist fonts render identically everywhere,
// including inside GitHub's image proxy where external fonts never load.
//
//   npm install
//   npm run build        -> writes ./assets/*.svg
//
// Edit PROFILE / PROJECTS / THEMES below and re-run.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets');

// ───────────────────────── content ─────────────────────────

const PROFILE = {
  name: 'John Fanidis',
  kicker: 'Founder @ Recurssive',
  typing: [
    'shipping react with callstack',
    'building recurssive.com',
    'cooking lorcana decks',
    'tinkering with llms',
  ],
  meta: 'thessaloniki, gr  ·  40.64°N 22.94°E',
};

const PROJECTS = [
  {
    slug: 'inkweave',
    title: 'Inkweave',
    label: 'TypeScript · React',
    dot: '#3178c6',
    link: 'inkweave.ink',
    desc: 'Synergy finder for Disney Lorcana. Pick a card and see its Shift targets, companions and archetypes.',
  },
  {
    slug: 'doomsday-clock',
    title: 'Doomsday Clock',
    label: 'TypeScript · React',
    dot: '#3178c6',
    link: 'doomsday-clock.online',
    desc: 'Every MCU title plotted as a constellation by story order and release date, counting down to Doomsday.',
  },
  {
    slug: 'prompt-toolkit',
    title: 'Prompt Engineering Toolkit',
    label: 'Prompts · AI tooling',
    dot: 'accentB',
    link: 'view repo',
    desc: 'Research-backed toolkit for better prompts: evaluators, calibration sets and Claude Code skills.',
  },
  {
    slug: 'recurssive',
    title: 'Recurssive',
    label: 'Web & app studio',
    dot: 'accentA',
    brand: true, // the studio's card carries the full signature gradient on its top edge
    link: 'recurssive.com',
    desc: 'Studio in Thessaloniki crafting custom websites plus mobile and desktop apps.',
  },
];

// Recurssive palette (app/src/app/theme.css): Inception #4813D0, Flow #A59BFF and the
// signature gradient #966FFF → #2805C3 → #4616E3 → #7856EC. `a` is the main accent,
// `b` the brighter second one; `spiral` runs from the centre of the motif to its edge.
const BRAND_GRADIENT = ['#966FFF', '#2805C3', '#4616E3', '#7856EC'];
const THEMES = {
  dark: {
    bg0: '#0d1117', bg1: '#130f24', border: '#272338',
    text: '#f3f1fa', text2: '#bdb8d0', muted: '#8f8aa3', dim: '#5f5a72',
    a: '#A59BFF', b: '#D4CDFF',
    glow: '#4616E3', glowOpacity: 0.3,
    dots: '#ffffff', dotsOpacity: 0.07,
    spiral: ['#E4DFFF', '#A59BFF', '#5B3BE8'],
  },
  light: {
    bg0: '#ffffff', bg1: '#f5f3ff', border: '#dcd7ee',
    text: '#1a1530', text2: '#463f5e', muted: '#5f5875', dim: '#9089a6',
    a: '#4813D0', b: '#966FFF',
    glow: '#7856EC', glowOpacity: 0.13,
    dots: '#1a1530', dotsOpacity: 0.09,
    spiral: ['#2805C3', '#4813D0', '#A59BFF'],
  },
};

// ───────────────────────── fonts ─────────────────────────

const fontFile = (pkg, file) => path.join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file);
const loadFont = (p) => {
  const b = fs.readFileSync(p);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const F = {
  sans400: loadFont(fontFile('geist-sans', 'geist-sans-latin-400-normal.woff')),
  sans600: loadFont(fontFile('geist-sans', 'geist-sans-latin-600-normal.woff')),
  mono400: loadFont(fontFile('geist-mono', 'geist-mono-latin-400-normal.woff')),
  mono500: loadFont(fontFile('geist-mono', 'geist-mono-latin-500-normal.woff')),
};

// ───────────────────────── helpers ─────────────────────────

const r2 = (n) => Math.round(n * 100) / 100;
const rad = (deg) => (deg * Math.PI) / 180;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Own serializer: opentype.js's toPathData occasionally emits NaN when rounding.
const num = (n) => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? '0' : String(v);
};
function glyphs(font, str, x, y, size, tracking = 0) {
  const { commands } = font.getPath(str, x, y, size, { kerning: true, letterSpacing: tracking });
  let d = '';
  for (const c of commands) {
    if (c.type === 'M' || c.type === 'L') d += `${c.type}${num(c.x)} ${num(c.y)}`;
    else if (c.type === 'Q') d += `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`;
    else if (c.type === 'C') d += `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}`;
    else if (c.type === 'Z') d += 'Z';
  }
  if (/NaN|Infinity/.test(d)) throw new Error(`Bad glyph geometry for "${str}"`);
  return d;
}

function measure(font, str, size, tracking = 0) {
  return font.getAdvanceWidth(str, size, { kerning: true, letterSpacing: tracking });
}

function wrap(font, str, size, maxWidth, maxLines) {
  const words = str.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (measure(font, next, size) <= maxWidth || !cur) cur = next;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (measure(font, `${last}…`, size) > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

// Discrete SMIL keyframes: [[time, value], ...] over a cycle of `dur` seconds.
function discreteAnimate(attr, frames, dur) {
  const kt = frames.map(([t], i) => (i === frames.length - 1 ? '1' : (t / dur).toFixed(5)));
  const vals = frames.map(([, v]) => r2(v));
  return `<animate attributeName="${attr}" dur="${r2(dur)}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${kt.join(';')}" values="${vals.join(';')}"/>`;
}

// ───────────────────────── header ─────────────────────────

function typingLine({ lines, x, y, size, t, id }) {
  const font = F.mono400;
  const cw = (font.charToGlyph('a').advanceWidth * size) / font.unitsPerEm;
  const tx = x + cw * 2; // after "> "
  const TYPE = 0.07, DEL = 0.03, HOLD = 2.4, GAP = 0.5, START = 0.6;

  let clock = START;
  const perLine = lines.map(() => []);
  const cursor = [[0, tx]];
  lines.forEach((ln, i) => {
    const n = ln.length;
    for (let k = 1; k <= n; k++) {
      const time = clock + k * TYPE;
      perLine[i].push([time, k * cw]);
      cursor.push([time, tx + k * cw]);
    }
    const delStart = clock + n * TYPE + HOLD;
    for (let k = n - 1; k >= 0; k--) {
      const time = delStart + (n - k) * DEL;
      perLine[i].push([time, k * cw]);
      cursor.push([time, tx + k * cw]);
    }
    clock = delStart + n * DEL + GAP;
  });
  const dur = clock;
  cursor.push([dur, tx]);

  const top = y - size * 0.95;
  const h = size * 1.35;
  let defs = '';
  let body = `<path d="${glyphs(F.mono500, '>', x, y, size)}" fill="${t.a}"/>`;
  lines.forEach((ln, i) => {
    const frames = [[0, 0], ...perLine[i], [dur, 0]];
    // Static renderers (no SMIL) show the first line fully typed.
    const staticW = i === 0 ? ln.length * cw + 2 : 0;
    defs += `<clipPath id="${id}-c${i}"><rect x="${r2(tx - 1)}" y="${r2(top)}" width="${r2(staticW)}" height="${r2(h)}">${discreteAnimate('width', frames, dur)}</rect></clipPath>`;
    body += `<path clip-path="url(#${id}-c${i})" d="${glyphs(F.mono400, ln, tx, y, size)}" fill="${t.text2}"/>`;
  });
  const staticCursorX = tx + lines[0].length * cw + 3;
  body += `<rect x="${r2(staticCursorX)}" y="${r2(y - size * 0.8)}" width="${r2(size * 0.12)}" height="${r2(size * 1.0)}" rx="1" fill="${t.b}">`
    + discreteAnimate('x', cursor.map(([time, cx]) => [time, cx + 3]), dur)
    + `<animate attributeName="opacity" values="1;0;1" keyTimes="0;0.5;1" calcMode="discrete" dur="1.05s" repeatCount="indefinite"/>`
    + `</rect>`;
  return { defs, body };
}

// Infinite zoom into the square spiral. Each square is the previous one turned by `step`
// and shrunk to fit inside it. Over one cycle the whole stack scales up by 1/s and turns
// back by `step`, so every square lands exactly where its parent was and the loop has no
// seam. The squares are drawn white into a mask and a fixed radial gradient shows
// through, so the colour stays put while the geometry moves. The outermost square fades
// out before it reaches the card edge (`reach`), which hides the hand-over.
function recursionMotif({ cx, cy, reach, step, dur, t, id }) {
  const s = 1 / (Math.cos(rad(step)) + Math.sin(rad(step)));
  // Smallest outer square whose grown-up parent is fully past the fade.
  const size = Math.ceil((2 * reach) * s) + 4;
  let squares = '';
  for (let i = 0, side = size; side > 4; i++, side = size * s ** i) {
    squares += `<rect x="${r2(-side / 2)}" y="${r2(-side / 2)}" width="${r2(side)}" height="${r2(side)}" rx="${r2(Math.max(1, side * 0.03))}" transform="rotate(${r2(step * i)})" stroke-width="1.3" vector-effect="non-scaling-stroke"/>`;
  }
  const [c0, c1, c2] = t.spiral;
  const defs = `
  <radialGradient id="${id}-spiral" cx="${cx}" cy="${cy}" r="${reach}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c0}"/><stop offset="0.5" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>
  <radialGradient id="${id}-reach" cx="${cx}" cy="${cy}" r="${reach}" gradientUnits="userSpaceOnUse"><stop offset="0.45" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="${id}-squares" maskUnits="userSpaceOnUse" x="${cx - reach}" y="${cy - reach}" width="${2 * reach}" height="${2 * reach}">
    <g transform="translate(${cx} ${cy})" fill="none" stroke="#fff"><g>
      <animateTransform attributeName="transform" type="rotate" from="0" to="${-step}" dur="${dur}s" repeatCount="indefinite"/>
      <g><animateTransform attributeName="transform" type="scale" from="1" to="${r2((1 / s) * 10000) / 10000}" dur="${dur}s" repeatCount="indefinite"/>${squares}</g>
    </g></g>
  </mask>
  <mask id="${id}-reachmask" maskUnits="userSpaceOnUse" x="${cx - reach}" y="${cy - reach}" width="${2 * reach}" height="${2 * reach}"><rect x="${cx - reach}" y="${cy - reach}" width="${2 * reach}" height="${2 * reach}" fill="url(#${id}-reach)"/></mask>`;
  const body = `<g mask="url(#${id}-reachmask)"><rect x="${cx - reach}" y="${cy - reach}" width="${2 * reach}" height="${2 * reach}" fill="url(#${id}-spiral)" mask="url(#${id}-squares)"/></g>`;
  return { defs, body };
}

function header(themeName) {
  const t = THEMES[themeName];
  const W = 1200, H = 360, R = 22;
  const id = `h${themeName[0]}`;
  const x0 = 76;
  const mx = 962, my = 180;

  const typing = typingLine({ lines: PROFILE.typing, x: x0, y: 236, size: 24, t, id });
  const motif = recursionMotif({ cx: mx, cy: my, reach: 175, step: 7, dur: 2.6, t, id });

  const defs = `
  <clipPath id="${id}-card"><rect width="${W}" height="${H}" rx="${R}"/></clipPath>
  <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg0}"/><stop offset="1" stop-color="${t.bg1}"/></linearGradient>
  <radialGradient id="${id}-glow" cx="${mx}" cy="${my}" r="330" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.glow}" stop-opacity="${t.glowOpacity}"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}-name" x1="0" y1="${110}" x2="0" y2="${176}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.text}"/><stop offset="1" stop-color="${t.text2}"/></linearGradient>
  <pattern id="${id}-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1.15" fill="${t.dots}" fill-opacity="${t.dotsOpacity}"/></pattern>
  <radialGradient id="${id}-fade" cx="${mx}" cy="${my}" r="560" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="${id}-mask"><rect width="${W}" height="${H}" fill="url(#${id}-fade)"/></mask>
  ${typing.defs}${motif.defs}`;

  const body = `
  <g clip-path="url(#${id}-card)">
    <rect width="${W}" height="${H}" fill="url(#${id}-bg)"/>
    <rect width="${W}" height="${H}" fill="url(#${id}-dots)" mask="url(#${id}-mask)"/>
    <rect width="${W}" height="${H}" fill="url(#${id}-glow)"/>
    ${motif.body}
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R - 0.5}" fill="none" stroke="${t.border}"/>

  <rect x="${x0}" y="${83}" width="9" height="9" rx="2" fill="${t.a}"/>
  <path d="${glyphs(F.mono500, PROFILE.kicker.toUpperCase(), x0 + 22, 92, 15, 0.14)}" fill="${t.muted}"/>
  <path d="${glyphs(F.sans600, PROFILE.name, x0 - 3, 172, 82, -0.028)}" fill="url(#${id}-name)"/>
  ${typing.body}
  <rect x="${x0}" y="${270}" width="28" height="1.5" fill="${t.border}"/>
  <path d="${glyphs(F.mono400, PROFILE.meta, x0, 300, 14.5, 0.02)}" fill="${t.dim}"/>`;

  const label = `${PROFILE.name}. ${PROFILE.kicker}.`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title><defs>${defs}</defs>${body}</svg>\n`;
}

// ───────────────────────── project card ─────────────────────────

// Cards sit two per row at width="50%". Each SVG carries a transparent gutter on its
// inner side (right for the left column, left for the right column) so the grid lines up
// exactly with the header's edges.
const GUTTER = 14;

function card(p, themeName, column) {
  const t = THEMES[themeName];
  const W = 600, H = 200, R = 18;
  const VW = W + GUTTER;
  const offset = column === 'right' ? GUTTER : 0;
  const id = `c${themeName[0]}-${p.slug}`;
  const dot = p.dot === 'accentA' ? t.a : p.dot === 'accentB' ? t.b : p.dot;
  const x0 = 36;

  const linkSize = 14.5;
  const linkW = measure(F.mono400, p.link, linkSize);
  const arrowX = W - 36 - 11;
  const linkX = arrowX - 10 - linkW;

  const desc = wrap(F.sans400, p.desc, 18.5, W - x0 * 2, 2);
  const descPaths = desc.map((ln, i) => `<path d="${glyphs(F.sans400, ln, x0, 142 + i * 27, 18.5)}" fill="${t.muted}"/>`).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW} ${H}" width="${VW}" height="${H}" role="img" aria-label="${esc(`${p.title}: ${p.desc}`)}"><title>${esc(p.title)}</title>
  <defs>
    <clipPath id="${id}-card"><rect width="${W}" height="${H}" rx="${R}"/></clipPath>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg0}"/><stop offset="1" stop-color="${t.bg1}"/></linearGradient>
    <radialGradient id="${id}-glow" cx="${W}" cy="0" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.glow}" stop-opacity="${r2(t.glowOpacity * 0.7)}"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}-line" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">${p.brand
      ? BRAND_GRADIENT.map((c, i) => `<stop offset="${r2(i / (BRAND_GRADIENT.length - 1))}" stop-color="${c}"/>`).join('')
      : `<stop offset="0" stop-color="${t.a}" stop-opacity="0"/><stop offset="0.5" stop-color="${t.a}" stop-opacity="0.7"/><stop offset="1" stop-color="${t.b}" stop-opacity="0"/>`}</linearGradient>
  </defs>
  <g transform="translate(${offset} 0)">
  <g clip-path="url(#${id}-card)">
    <rect width="${W}" height="${H}" fill="url(#${id}-bg)"/>
    <rect width="${W}" height="${H}" fill="url(#${id}-glow)"/>
    <rect x="0" y="0" width="${W}" height="${p.brand ? 4 : 1.5}" fill="url(#${id}-line)"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R - 0.5}" fill="none" stroke="${t.border}"/>
  <circle cx="${x0 + 5}" cy="46" r="5" fill="${dot}"/>
  <path d="${glyphs(F.mono400, p.label, x0 + 19, 51, 14.5, 0.01)}" fill="${t.muted}"/>
  <path d="${glyphs(F.mono400, p.link, linkX, 51, linkSize)}" fill="${t.a}"/>
  <path d="M${arrowX} ${53} L${arrowX + 11} ${42} M${arrowX + 3} ${42} L${arrowX + 11} ${42} L${arrowX + 11} ${50}" fill="none" stroke="${t.a}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${glyphs(F.sans600, p.title, x0 - 1, 100, 30, -0.015)}" fill="${t.text}"/>
  ${descPaths}
  </g>
</svg>\n`;
  return svg;
}

// ───────────────────────── write ─────────────────────────

fs.mkdirSync(OUT, { recursive: true });
const written = [];
for (const theme of Object.keys(THEMES)) {
  const h = path.join(OUT, `header-${theme}.svg`);
  fs.writeFileSync(h, header(theme));
  written.push(h);
  for (const [i, p] of PROJECTS.entries()) {
    const c = path.join(OUT, `card-${p.slug}-${theme}.svg`);
    fs.writeFileSync(c, card(p, theme, i % 2 === 0 ? 'left' : 'right'));
    written.push(c);
  }
}
for (const f of written) {
  console.log(`${path.relative(ROOT, f).padEnd(38)} ${(fs.statSync(f).size / 1024).toFixed(1)} KB`);
}
