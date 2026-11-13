import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFileSync(join(root, name), 'utf8');
const html = read('index.html');
const css = read('styles.css');
const layoutCss = read('layout-fix.css');
const js = read('app.js');
const scrollScenes = read('scroll-scenes.js');
const performerMotion = read('performer-motion.js');
const performerSettings = read('performer-settings.js');

assert.match(html, /<html lang="es">/);
assert.match(html, /<main id="contenido"/);
assert.ok(html.includes('href="/layout-fix.css"'));
assert.equal((html.match(/class="section-inner"/g) || []).length, 4);
assert.match(html, /class="sound-panel__inner"/);
assert.match(html, /id="booking-form"/);
assert.match(html, /og:image/);
assert.match(html, /rel="canonical"/);
assert.match(html, /<script src="\/scroll-scenes\.js" defer><\/script>/);
assert.match(html, /<script src="\/performer-motion\.js" defer><\/script>/);
assert.match(html, /<script src="\/performer-settings\.js" defer><\/script>/);
assert.match(html, /id="performer-settings"/);
assert.match(html, /data-performer-action="dance"/);
assert.match(html, /data-performer-action="visibility"/);
assert.match(html, /aria-controls="performer-settings"/);
assert.match(html, /og:url/);
assert.match(html, /<picture>/);
assert.match(html, /aria-hidden="true"/);
assert.match(html, /alt=""/);
assert.match(html, /loading="eager" fetchpriority="high"/);
assert.match(html, /data-performer="left"/);
assert.match(html, /data-performer="right"/);
assert.match(html, /data-animation-src="\/assets\/monks\/dance\/monje-left-dance\.webp"/);
assert.match(html, /data-poster-src="\/assets\/monks\/dance\/monje-right-poster\.webp"/);
for (const scene of ['hero', 'manifesto', 'ritual', 'formats', 'sound', 'booking']) {
  assert.match(html, new RegExp(`data-scene="${scene}"`), `Missing data-scene ${scene}`);
}

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
  assert.ok(ids.has(target), `Broken internal anchor #${target}`);
}
for (const [, target] of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
  for (const id of target.split(/\s+/)) assert.ok(ids.has(id), `Broken aria-labelledby reference ${id}`);
}

const sceneRefs = [...html.matchAll(/(?:src|srcset)="(\/assets\/sections\/[^"]+\.webp)"/g)].map((match) => match[1]);
assert.equal(sceneRefs.length, 16, `Expected 16 desktop/mobile scene refs, found ${sceneRefs.length}`);
const sceneNames = new Set(sceneRefs.map((ref) => ref.match(/\/([^/]+)-(?:desktop|mobile)\.[a-f0-9]{10}\.webp$/)?.[1]));
assert.equal(sceneNames.size, 8, `Expected 8 unique scenes, found ${sceneNames.size}`);
for (const ref of sceneRefs) {
  const file = join(root, ref.replace(/^\//, ''));
  assert.ok(existsSync(file), `Missing scene asset ${ref}`);
  assert.ok(statSync(file).size > 20000, `Scene asset unexpectedly small: ${ref}`);
}

assert.match(css, /corner-light--tl/);
assert.match(css, /corner-light--tr/);
assert.match(css, /corner-light--bl/);
assert.match(css, /corner-light--br/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /max-width: 360px/);
assert.match(css, /\.scene-media/);
assert.match(css, /\.scene-overlay/);
assert.match(css, /\.format-card__media/);
assert.match(css, /--scene-sound-primary/);
assert.match(css, /--ambient-primary/);
assert.match(css, /--ambient-secondary/);
assert.match(css, /view-timeline-name: --scene-view/);
assert.match(css, /animation-timeline: --scene-view/);
assert.match(css, /@supports \(view-timeline-name: --scene-view\)/);
assert.match(css, /no-scroll-timeline/);
assert.match(css, /mix-blend-mode: screen/);
assert.match(js, /IntersectionObserver/);
assert.match(js, /navigator\.clipboard/);
assert.match(performerMotion, /window\.MonjesPerformers/);
assert.match(performerMotion, /playAll/);
assert.match(performerMotion, /pauseAll/);
assert.match(performerMotion, /hideAll/);
assert.match(performerMotion, /showAll/);
assert.match(performerMotion, /includeHidden/);
assert.match(performerSettings, /openPanel/);
assert.match(performerSettings, /Escape/);
assert.match(performerSettings, /aria-expanded/);
assert.match(css, /\.performer-settings-toggle/);
assert.match(css, /\.performer-settings\[hidden\]/);
assert.match(layoutCss, /--content-max:\s*1760px/);
assert.match(layoutCss, /\.page-shell\s*\{\s*width:\s*100%/);
assert.match(layoutCss, /\.section-inner/);
assert.match(layoutCss, /min-height:\s*100vh/);
assert.match(layoutCss, /min-height:\s*100svh/);
assert.match(layoutCss, /min-height:\s*100dvh/);
assert.match(layoutCss, /--section-block-space/);
assert.match(layoutCss, /\.section-block\s*\{[^}]*display:\s*grid/s);
assert.match(layoutCss, /\.sound-panel\s*\{[^}]*display:\s*grid/s);
assert.match(layoutCss, /max-height:\s*calc\(100dvh - 112px\)/);
assert.match(layoutCss, /overflow-y:\s*auto/);
assert.match(layoutCss, /overscroll-behavior:\s*contain/);
assert.match(layoutCss, /--section-gutter/);
assert.match(layoutCss, /\.performers\s*\{\s*z-index:\s*3/);
assert.match(performerMotion, /prefers-reduced-motion/);
assert.match(performerMotion, /visibilitychange/);
assert.doesNotMatch(performerMotion, /setInterval\s*\(/, 'Performer controller must not poll with timers');
assert.match(js, /aria-expanded/);
for (const scene of ['hero', 'manifesto', 'ritual', 'formats', 'sound', 'booking']) {
  assert.match(scrollScenes, new RegExp(`${scene}: Object\.freeze`), `Missing color profile ${scene}`);
}
assert.match(scrollScenes, /requestAnimationFrame/);
assert.match(scrollScenes, /IntersectionObserver/);
assert.match(scrollScenes, /ResizeObserver/);
assert.match(scrollScenes, /prefers-reduced-motion/);
assert.match(scrollScenes, /interpolateColor/);
assert.doesNotMatch(scrollScenes, /setInterval\s*\(/, 'Continuous timers are not allowed');

const minimumSizes = {
  'assets/images/monjes-frame.webp': 20000,
  'assets/monks/monjes-frame-desktop.webp': 50000,
  'assets/monks/monje-izquierdo.webp': 20000,
  'assets/monks/monje-derecho.webp': 20000,
  'assets/monks/dance/monje-left-dance.webp': 50000,
  'assets/monks/dance/source/monje-left-dance-original.webp': 50000,
  'assets/monks/dance/source/monje-right-dance-original.webp': 50000,
  'assets/monks/dance/monje-right-dance.webp': 50000,
  'assets/monks/dance/monje-left-poster.webp': 5000,
  'assets/monks/dance/monje-right-poster.webp': 5000,
  'assets/monks/dance/monje-left-dance.gif': 100000,
  'assets/monks/dance/monje-right-dance.gif': 100000,
  'favicon.svg': 200,
  'robots.txt': 20,
  'sitemap.xml': 100
};
for (const [file, minimum] of Object.entries(minimumSizes)) {
  assert.ok(existsSync(join(root, file)), `Missing ${file}`);
  assert.ok(statSync(join(root, file)).size >= minimum, `Unexpectedly small ${file}`);
}

const manifest = JSON.parse(read('assets/sections/manifest.json'));
assert.equal(Object.keys(manifest.scenes).length, 8);
for (const [key, variants] of Object.entries(manifest.scenes)) {
  assert.ok(variants.desktop.file.endsWith('.webp'), `${key} desktop variant missing`);
  assert.ok(variants.mobile.file.endsWith('.webp'), `${key} mobile variant missing`);
  for (const variant of [variants.desktop, variants.mobile]) {
    const assetPath = join(root, variant.file.replace(/^\//, ''));
    assert.ok(existsSync(assetPath), `Manifest asset missing: ${variant.file}`);
    const digest = createHash('sha256').update(readFileSync(assetPath)).digest('hex');
    assert.equal(digest, variant.sha256, `Manifest SHA-256 mismatch: ${variant.file}`);
  }
}

const danceManifest = JSON.parse(read('assets/monks/dance/manifest.json'));
assert.equal(Object.keys(danceManifest.performers).length, 2);
for (const [side, performer] of Object.entries(danceManifest.performers)) {
  for (const asset of [performer.animation, performer.poster, performer.fallback]) {
    const assetPath = join(root, asset.file);
    assert.ok(existsSync(assetPath), `Missing ${side} dance asset ${asset.file}`);
    const digest = createHash('sha256').update(readFileSync(assetPath)).digest('hex');
    assert.equal(digest, asset.sha256, `Dance SHA-256 mismatch: ${asset.file}`);
  }
  assert.equal(performer.animation.frames, 63, `${side} dance cycle must contain 63 interpolated frames`);
  assert.equal(performer.animation.frameDurationMs, 40, `${side} dance timing mismatch`);
  assert.equal(performer.animation.totalDurationMs, 2520, `${side} dance cycle duration mismatch`);
  const sourcePath = join(root, performer.source);
  assert.ok(existsSync(sourcePath), `Missing preserved ${side} source animation`);
  const sourceDigest = createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
  assert.equal(sourceDigest, performer.sourceSha256, `${side} source SHA-256 mismatch`);
}

console.log('PASS — Phase 1/2/3/4/5/6 smoke tests (semantic HTML, eight scenes, full-bleed sections, fluid content rails, ambient profiles, scroll timelines, animated performers, accessible settings, reduced motion, and asset integrity).');
