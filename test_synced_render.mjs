import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ENGINE_DIR = '/Users/dheerajsrinivasa/.gemini/antigravity/scratch/youtube-studio-pro/engines/generator';
const BGM_DIR = path.join(ENGINE_DIR, 'assets/audio/bgm');
const AVATAR_DIR = path.join(ENGINE_DIR, 'assets/avatar');
const ENV_PATH = `/Users/dheerajsrinivasa/.local/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`;

const workDir = '/Users/dheerajsrinivasa/Library/Application Support/YouTube Studio Pro/Workspace/Videos/hf_project_1794578998099';
const words = JSON.parse(fs.readFileSync(path.join(workDir, 'assets/audio/transcript.json'), 'utf-8'));
const totalDuration = 86.73;

const storyboard = {
  title: 'The 2026 Homeownership Trap',
  tagline: 'FINANCIAL REALITY',
  bgm_mood: 'ambient_suspense',
  theme: {
    name: "Luxury Finance Warning",
    background_css: "radial-gradient(ellipse at 50% 20%, #161A23 0%, #0D0F14 60%, #07080A 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(255, 75, 75, 0.20) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(255, 170, 0, 0.16) 0%, transparent 65%)",
    accent_primary: "#FF4D4D",
    accent_secondary: "#FFAA00",
    card_bg: "rgba(20, 24, 33, 0.88)",
    card_border: "rgba(255, 75, 75, 0.35)",
    card_glow: "0 20px 60px rgba(0, 0, 0, 0.8)",
    caption_highlight: "#FFAA00",
    vibe_pattern: "modern_minimal"
  },
  beats: [
    {
      anchor_phrase: 'buying a house in your twenties',
      type: 'stat_hero',
      eyebrow: '2026 OUTLOOK',
      number: '7.5%',
      unit: 'MORTGAGE RATE',
      label: 'HISTORIC PEAK BURDEN',
      subtitle: 'What looks like adulting could be your biggest financial trap.'
    },
    {
      anchor_phrase: 'rules of the game are changing',
      type: 'kinetic_slam',
      eyebrow: 'MARKET SHIFT',
      headline: 'RULES CHANGED',
      highlight_word: 'TRAP',
      punchline: 'Turning dream homes into financial servitude.'
    },
    {
      anchor_phrase: 'Interest rates are projected to remain',
      type: 'data_grid',
      eyebrow: 'ECONOMIC PRESSURES',
      title: 'CRUSHING MONTHLY BURDEN',
      metrics: [
        { label: 'Mortgage Rate', value: '7.5%' },
        { label: 'Wage Growth', value: 'Stagnant' },
        { label: 'Property Tax', value: '+14%' },
        { label: 'Liquidity', value: '0%' }
      ]
    },
    {
      anchor_phrase: 'decades of debt servitude',
      type: 'ranked_item',
      eyebrow: 'THE BIGGEST DANGER',
      rank: 1,
      title: 'DEBT SERVITUDE',
      danger_score: 'CRITICAL',
      description: 'You are not buying freedom — you are locking away your peak investment compounding decades.'
    },
    {
      anchor_phrase: 'hidden financial anchors',
      type: 'classified_dossier',
      eyebrow: 'HIDDEN COSTS',
      badge: 'SURGE RISK',
      title: 'THE HIDDEN ANCHORS',
      location: 'ALL US METROS',
      bullets: [
        'Surging insurance premiums',
        'Uncapped maintenance liabilities',
        'Zero career relocation agility'
      ]
    },
    {
      anchor_phrase: 'Lenting offers flexibility',
      type: 'split_contrast',
      eyebrow: 'THE REALITY CHECK',
      left_title: 'BUYING IN 20s',
      left_text: 'Locked to 30-year debt, illiquid equity, high maintenance overhead.',
      right_title: 'RENTING & INVESTING',
      right_text: 'Total career flexibility, index fund growth, zero repair liabilities.'
    },
    {
      anchor_phrase: 'diversified investments',
      type: 'stat_hero',
      eyebrow: 'WEALTH MULTIPLIER',
      number: '10x',
      unit: 'LIQUID ADVANTAGE',
      label: 'COMPOUND FREEDOM',
      subtitle: 'Let your money work for you rather than trapping it in drywall.'
    },
    {
      anchor_phrase: 'needs a serious reality check',
      type: 'kinetic_slam',
      eyebrow: 'FINAL VERDICT',
      headline: 'WAKE UP',
      highlight_word: 'FREEDOM',
      punchline: 'Do not sacrifice your entire financial future for a down payment.'
    }
  ]
};

// Copy gentle ambient suspense BGM
const targetBgm = path.join(workDir, 'assets/audio/bgm.mp3');
fs.copyFileSync(path.join(BGM_DIR, 'ambient_suspense.mp3'), targetBgm);

// Alignment logic
function alignBeatsToTranscript(rawBeats, words, totalDuration) {
  const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

  const normWords = words.map((w, idx) => ({
    text: clean(w.text),
    start: w.start,
    end: w.end,
    origIndex: idx
  }));

  const beats = rawBeats;
  let lastMatchedWordIdx = 0;
  const timed = [];

  for (let bIdx = 0; bIdx < beats.length; bIdx++) {
    const beat = beats[bIdx];
    const phrase = clean(beat.anchor_phrase || beat.headline || beat.title || '');
    const tokens = phrase.split(/\s+/).filter(Boolean);

    let matchTime = null;
    let matchWordIdx = null;

    if (tokens.length > 0) {
      for (let i = lastMatchedWordIdx; i <= normWords.length - tokens.length; i++) {
        let ok = true;
        for (let j = 0; j < tokens.length; j++) {
          if (normWords[i + j].text !== tokens[j]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          matchTime = normWords[i].start;
          matchWordIdx = i + tokens.length - 1;
          break;
        }
      }

      if (matchTime === null && tokens.length >= 2) {
        for (let i = lastMatchedWordIdx; i < normWords.length - 2; i++) {
          const windowTokens = normWords.slice(i, i + tokens.length + 3).map(w => w.text);
          const matchedCount = tokens.filter(t => windowTokens.includes(t)).length;
          if (matchedCount >= Math.ceil(tokens.length * 0.7)) {
            matchTime = normWords[i].start;
            matchWordIdx = i + tokens.length;
            break;
          }
        }
      }

      if (matchTime === null) {
        const longTokens = tokens.filter(t => t.length >= 5);
        for (const token of longTokens) {
          for (let i = lastMatchedWordIdx; i < normWords.length; i++) {
            if (normWords[i].text === token) {
              matchTime = normWords[i].start;
              matchWordIdx = i;
              break;
            }
          }
          if (matchTime !== null) break;
        }
      }
    }

    if (matchTime !== null) {
      lastMatchedWordIdx = matchWordIdx + 1;
    }

    timed.push({
      ...beat,
      rawStart: matchTime
    });
  }

  if (timed.length > 0 && (timed[0].rawStart === null || timed[0].rawStart > 2.5)) {
    timed[0].rawStart = 0.00;
  }

  for (let i = 0; i < timed.length; i++) {
    if (timed[i].rawStart === null) {
      let prevValid = 0.0;
      let prevIdx = -1;
      for (let p = i - 1; p >= 0; p--) {
        if (timed[p].rawStart !== null) {
          prevValid = timed[p].rawStart;
          prevIdx = p;
          break;
        }
      }
      let nextValid = totalDuration;
      let nextIdx = timed.length;
      for (let n = i + 1; n < timed.length; n++) {
        if (timed[n].rawStart !== null) {
          nextValid = timed[n].rawStart;
          nextIdx = n;
          break;
        }
      }
      const steps = nextIdx - prevIdx;
      const stepIdx = i - prevIdx;
      timed[i].rawStart = prevValid + (nextValid - prevValid) * (stepIdx / steps);
    }
  }

  const alignedBeats = [];
  for (let i = 0; i < timed.length; i++) {
    const bStart = timed[i].rawStart;
    const nextStart = (i < timed.length - 1) ? timed[i + 1].rawStart : totalDuration;
    let bDur = Math.max(1.8, nextStart - bStart);
    if (nextStart - bStart < 1.2 && i < timed.length - 1) {
      bDur = Math.max(1.8, (totalDuration - bStart) / (timed.length - i));
    }
    alignedBeats.push({
      ...timed[i],
      start: bStart,
      duration: bDur
    });
  }

  return alignedBeats;
}

const alignedBeats = alignBeatsToTranscript(storyboard.beats, words, totalDuration);

// Build Captions
const captionGroups = [];
let currentGroup = [];
let groupStart = 0;

for (let i = 0; i < words.length; i++) {
  const w = words[i];
  if (currentGroup.length === 0) groupStart = w.start;
  currentGroup.push(w);

  const isPunctuation = /[.,!?;:]$/.test(w.text);
  const isMaxWords = currentGroup.length >= 3;
  const isBigGap = (i < words.length - 1) && (words[i + 1].start - w.end > 0.28);

  if (isPunctuation || isMaxWords || isBigGap || i === words.length - 1) {
    captionGroups.push({
      id: `cg-${captionGroups.length}`,
      start: groupStart,
      end: w.end,
      words: [...currentGroup]
    });
    currentGroup = [];
  }
}

let captionsHtml = '';
let captionsGsap = '';
captionGroups.forEach((g, gIdx) => {
  const wordSpans = g.words.map((w, wIdx) =>
    `<span id="cw-${gIdx}-${wIdx}" class="caption-word">${w.text}</span>`
  ).join(' ');

  captionsHtml += `
    <div id="${g.id}" class="caption-group clip" data-start="${g.start.toFixed(2)}" data-duration="${(g.end - g.start).toFixed(2)}">
      ${wordSpans}
    </div>`;

  g.words.forEach((w, wIdx) => {
    const wordId = `#cw-${gIdx}-${wIdx}`;
    captionsGsap += `
tl.set("${wordId}", { color: "${storyboard.theme.caption_highlight}", scale: 1.15, textShadow: "0 0 25px ${storyboard.theme.accent_primary}" }, ${w.start.toFixed(2)});
tl.set("${wordId}", { color: "#FFFFFF", scale: 1.0, textShadow: "none" }, ${w.end.toFixed(2)});`;
  });
});

let beatsHtml = '';
let beatsGsap = '';

alignedBeats.forEach((b, idx) => {
  const bStart = b.start;
  const bDur = b.duration;
  const beatId = `beat-${idx}`;
  let cardContent = '';

  if (b.type === 'stat_hero') {
    cardContent = `
      <div class="card-hero-stat">
        <div class="stat-eyebrow">${b.eyebrow}</div>
        <div class="stat-big-number">${b.number}</div>
        <div class="stat-unit">${b.unit}</div>
        <div class="stat-meter-bar"><div class="meter-fill"></div></div>
        <div class="stat-label">${b.label}</div>
        <div class="stat-sub">${b.subtitle}</div>
      </div>`;
  } else if (b.type === 'data_grid') {
    const cellsHtml = (b.metrics || []).map(m => `
      <div class="grid-cell">
        <div class="grid-val">${m.value}</div>
        <div class="grid-lbl">${m.label}</div>
      </div>
    `).join('');
    cardContent = `
      <div class="card-grid">
        <div class="grid-eyebrow">${b.eyebrow}</div>
        <div class="grid-title">${b.title}</div>
        <div class="grid-cells">${cellsHtml}</div>
      </div>`;
  } else if (b.type === 'ranked_item') {
    cardContent = `
      <div class="card-ranked">
        <div class="ranked-eyebrow">${b.eyebrow}</div>
        <div class="ranked-top">
          <div class="ranked-number">#${b.rank}</div>
          <div class="ranked-title-box">
            <div class="ranked-title">${b.title}</div>
            <div class="ranked-danger">${b.danger_score}</div>
          </div>
        </div>
        <div class="ranked-desc">${b.description}</div>
      </div>`;
  } else if (b.type === 'classified_dossier') {
    const bulletsHtml = (b.bullets || []).map(bullet => `
      <div class="dossier-item"><span class="dossier-bullet-icon">▸</span> ${bullet}</div>
    `).join('');
    cardContent = `
      <div class="card-dossier">
        <div class="dossier-header">
          <div class="dossier-tag">📁 ${b.eyebrow}</div>
          <div class="dossier-badge">${b.badge}</div>
        </div>
        <div class="dossier-title">${b.title}</div>
        <div class="dossier-loc">📍 ${b.location}</div>
        <div class="dossier-bullets">${bulletsHtml}</div>
      </div>`;
  } else if (b.type === 'split_contrast') {
    cardContent = `
      <div class="card-split">
        <div class="split-eyebrow">${b.eyebrow}</div>
        <div class="split-grid">
          <div class="split-side left">
            <div class="split-title">${b.left_title}</div>
            <div class="split-text">${b.left_text}</div>
          </div>
          <div class="split-vs">VS</div>
          <div class="split-side right">
            <div class="split-title">${b.right_title}</div>
            <div class="split-text">${b.right_text}</div>
          </div>
        </div>
      </div>`;
  } else {
    cardContent = `
      <div class="card-kinetic-slam">
        <div class="slam-eyebrow">${b.eyebrow}</div>
        <div class="slam-head">${b.headline}</div>
        <div class="slam-highlight-badge">${b.highlight_word}</div>
        <div class="slam-punch">${b.punchline}</div>
      </div>`;
  }

  beatsHtml += `
    <div id="${beatId}" class="beat-wrapper clip" data-start="${bStart.toFixed(2)}" data-duration="${bDur.toFixed(2)}">
      <div id="card-${idx}" class="beat-card">
        ${cardContent}
      </div>
    </div>`;

  beatsGsap += `
// Beat ${idx} [${bStart.toFixed(2)}s - ${(bStart + bDur).toFixed(2)}s] (${b.anchor_phrase})
tl.fromTo("#card-${idx}", 
  { opacity: 0, y: 35, scale: 0.94 }, 
  { opacity: 1, y: 0, scale: 1.0, duration: 0.35, ease: "power3.out" }, 
  ${bStart.toFixed(2)}
);
tl.to("#card-${idx}", 
  { opacity: 0, y: -25, scale: 0.98, duration: 0.25, ease: "power2.in" }, 
  ${(bStart + bDur - 0.25).toFixed(2)}
);`;
});

// Avatar viseme GSAP
const visemes = ['#viseme-open', '#viseme-teeth', '#viseme-round', '#viseme-m'];
let avatarGsap = '';
words.forEach((w, idx) => {
  const activeV = visemes[idx % visemes.length];
  avatarGsap += `
tl.set(".viseme", { opacity: 0 }, ${w.start.toFixed(2)});
tl.set("${activeV}", { opacity: 1 }, ${w.start.toFixed(2)});`;

  const next = words[idx + 1];
  const gap = next ? next.start - w.end : 1.0;
  if (gap >= 0.12) {
    avatarGsap += `
tl.set(".viseme", { opacity: 0 }, ${(w.end + 0.03).toFixed(2)});
tl.set("#viseme-closed", { opacity: 1 }, ${(w.end + 0.03).toFixed(2)});`;
  }
});

const theme = storyboard.theme;
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${storyboard.title}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --accent-primary: ${theme.accent_primary};
      --accent-secondary: ${theme.accent_secondary};
      --card-bg: ${theme.card_bg};
      --card-border: ${theme.card_border};
      --card-glow: ${theme.card_glow};
      --caption-highlight: ${theme.caption_highlight};
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1080px; height: 1920px;
      background: ${theme.background_css};
      color: #FFFFFF;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
      user-select: none;
    }

    #root {
      position: relative;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
    }

    .blob-1 {
      position: absolute; top: -100px; left: 100px; width: 850px; height: 850px;
      background: ${theme.ambient_glow_1};
      filter: blur(80px); z-index: 1; pointer-events: none;
    }
    .blob-2 {
      position: absolute; bottom: 200px; right: -100px; width: 750px; height: 750px;
      background: ${theme.ambient_glow_2};
      filter: blur(90px); z-index: 1; pointer-events: none;
    }

    .vignette-overlay {
      position: absolute; inset: 0;
      background: radial-gradient(circle at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.75) 100%);
      z-index: 2; pointer-events: none;
    }

    .vibe-bg-pattern {
      position: absolute; inset: 0;
      background-size: 60px 60px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      z-index: 2; pointer-events: none;
    }

    .top-hud {
      position: absolute; top: 70px; left: 60px; right: 60px;
      display: flex; justify-content: space-between; align-items: center;
      z-index: 30;
    }
    .topic-badge {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 10px 22px; border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(16px);
      font-size: 19px; font-weight: 800; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--accent-primary);
    }
    .topic-badge .pulse-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--accent-primary);
      box-shadow: 0 0 10px var(--accent-primary);
    }
    .time-badge {
      font-family: 'Space Grotesk', monospace;
      font-size: 22px; font-weight: 700;
      color: rgba(255, 255, 255, 0.75);
      background: rgba(0, 0, 0, 0.45);
      padding: 8px 18px; border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .visual-arena {
      position: absolute;
      top: 170px;
      left: 60px;
      right: 60px;
      height: 1120px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
    }
    .beat-wrapper {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .beat-card {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .card-hero-stat {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 36px;
      padding: 60px 48px;
      text-align: center;
    }
    .stat-eyebrow {
      font-size: 22px; font-weight: 900; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--accent-secondary);
      margin-bottom: 24px;
    }
    .stat-big-number {
      font-size: 140px; font-weight: 950; line-height: 0.95;
      font-family: 'Space Grotesk', sans-serif;
      color: var(--accent-primary);
      text-shadow: 0 0 45px var(--accent-primary);
    }
    .stat-unit {
      font-size: 38px; font-weight: 800; letter-spacing: 0.05em;
      color: #FFFFFF; text-transform: uppercase; margin-top: 10px;
    }
    .stat-meter-bar {
      width: 100%; height: 10px; border-radius: 5px;
      background: rgba(255, 255, 255, 0.1);
      margin: 36px 0 28px; overflow: hidden;
    }
    .meter-fill {
      width: 85%; height: 100%;
      background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
      border-radius: 5px;
      box-shadow: 0 0 20px var(--accent-primary);
    }
    .stat-label {
      font-size: 28px; font-weight: 800; line-height: 1.35;
      text-transform: uppercase; color: #FFFFFF;
    }
    .stat-sub {
      font-size: 22px; font-weight: 500; opacity: 0.75;
      margin-top: 14px; line-height: 1.4;
    }

    .card-kinetic-slam {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 36px;
      padding: 65px 45px;
      text-align: center;
    }
    .slam-eyebrow {
      font-size: 22px; font-weight: 900; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--accent-secondary);
      margin-bottom: 24px;
    }
    .slam-head {
      font-size: 56px; font-weight: 900; line-height: 1.15;
      text-transform: uppercase; letter-spacing: 0.02em;
      color: #FFFFFF;
    }
    .slam-highlight-badge {
      display: inline-block;
      font-size: 68px; font-weight: 950;
      font-family: 'Space Grotesk', sans-serif;
      text-transform: uppercase; letter-spacing: 0.03em;
      background: var(--accent-primary);
      color: #000000;
      padding: 10px 36px; border-radius: 16px;
      margin: 24px 0 20px;
      box-shadow: 0 0 40px var(--accent-primary);
    }
    .slam-punch {
      font-size: 32px; font-weight: 700; opacity: 0.85;
      line-height: 1.35; color: #E0E5EC;
    }

    .card-dossier {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 36px;
      padding: 50px 44px;
    }
    .dossier-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 22px;
    }
    .dossier-tag {
      font-size: 19px; font-weight: 900; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--accent-primary);
    }
    .dossier-badge {
      font-size: 16px; font-weight: 900; letter-spacing: 0.1em;
      text-transform: uppercase; background: var(--accent-secondary);
      color: #FFFFFF; padding: 6px 14px; border-radius: 8px;
    }
    .dossier-title {
      font-size: 42px; font-weight: 900; line-height: 1.2;
      text-transform: uppercase; color: #FFFFFF; margin-bottom: 8px;
    }
    .dossier-loc {
      font-size: 21px; font-weight: 700; color: rgba(255, 255, 255, 0.65);
      margin-bottom: 28px;
    }
    .dossier-bullets {
      display: flex; flex-direction: column; gap: 18px;
    }
    .dossier-item {
      display: flex; align-items: flex-start; gap: 14px;
      font-size: 24px; font-weight: 600; line-height: 1.4;
      background: rgba(255, 255, 255, 0.05);
      padding: 16px 20px; border-radius: 14px;
      border-left: 4px solid var(--accent-primary);
    }
    .dossier-bullet-icon { color: var(--accent-primary); font-weight: 900; }

    .card-ranked {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 36px;
      padding: 55px 45px;
    }
    .ranked-eyebrow {
      font-size: 21px; font-weight: 900; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--accent-secondary); margin-bottom: 24px;
    }
    .ranked-top {
      display: flex; align-items: center; gap: 24px; margin-bottom: 24px;
    }
    .ranked-number {
      font-size: 80px; font-weight: 950; font-family: 'Space Grotesk', sans-serif;
      color: var(--accent-primary); line-height: 1;
      text-shadow: 0 0 30px var(--accent-primary);
    }
    .ranked-title-box { flex: 1; }
    .ranked-title {
      font-size: 40px; font-weight: 900; line-height: 1.2; text-transform: uppercase;
    }
    .ranked-danger {
      display: inline-block; font-size: 16px; font-weight: 900;
      color: #FFF; background: var(--accent-secondary);
      padding: 5px 12px; border-radius: 6px; margin-top: 6px;
    }
    .ranked-desc {
      font-size: 26px; font-weight: 600; line-height: 1.45; color: #E2E8F0;
      background: rgba(255, 255, 255, 0.04);
      padding: 24px; border-radius: 16px;
    }

    .card-split {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 36px;
      padding: 50px 40px;
    }
    .split-eyebrow {
      font-size: 21px; font-weight: 900; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--accent-primary); text-align: center; margin-bottom: 24px;
    }
    .split-grid {
      display: flex; flex-direction: column; gap: 16px; position: relative;
    }
    .split-side {
      padding: 26px; border-radius: 20px;
    }
    .split-side.left {
      background: rgba(255, 77, 77, 0.12);
      border: 1px solid rgba(255, 77, 77, 0.35);
    }
    .split-side.right {
      background: rgba(255, 170, 0, 0.12);
      border: 1px solid rgba(255, 170, 0, 0.35);
    }
    .split-side .split-title {
      font-size: 28px; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;
    }
    .split-side.left .split-title { color: var(--accent-primary); }
    .split-side.right .split-title { color: var(--accent-secondary); }
    .split-side .split-text {
      font-size: 22px; font-weight: 600; line-height: 1.35; color: #FFFFFF;
    }
    .split-vs {
      text-align: center; font-size: 18px; font-weight: 900;
      color: rgba(255, 255, 255, 0.6);
    }

    .card-grid {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 36px;
      padding: 50px 40px;
    }
    .grid-eyebrow {
      font-size: 21px; font-weight: 900; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--accent-secondary); margin-bottom: 12px;
    }
    .grid-title {
      font-size: 38px; font-weight: 900; text-transform: uppercase; margin-bottom: 28px;
    }
    .grid-cells {
      display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
    }
    .grid-cell {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px; padding: 24px; text-align: center;
    }
    .grid-val {
      font-size: 42px; font-weight: 900; font-family: 'Space Grotesk', sans-serif;
      color: var(--accent-primary); margin-bottom: 6px;
    }
    .grid-lbl {
      font-size: 19px; font-weight: 700; color: rgba(255, 255, 255, 0.7);
    }

    /* Kinetic Subtitles Safe Zone (Y: 1320 - 1520) */
    .caption-group {
      position: absolute;
      top: 1320px;
      left: 60px;
      right: 60px;
      max-width: 960px;
      margin: 0 auto;
      height: 180px;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 14px;
      text-align: center;
      z-index: 100;
      pointer-events: none;
    }
    .caption-word {
      font-size: 50px;
      font-weight: 900;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #FFFFFF;
      display: inline-block;
      margin: 0 8px;
      text-shadow: 0 4px 18px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.9);
    }

    /* Talking Avatar Rig (Y: 1600 - 1880, bottom: 30px) */
    .avatar-rig {
      position: absolute; bottom: 30px; right: 50px; width: 270px; height: 270px;
      z-index: 40; filter: drop-shadow(0 15px 35px rgba(0,0,0,0.85));
      pointer-events: none;
    }
    .avatar-rig.mirrored { right: auto; left: 50px; transform: scaleX(-1); }
    .viseme { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; }
    .viseme.active { opacity: 1; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-width="1080" data-height="1920" class="clip" data-start="0" data-duration="${totalDuration.toFixed(2)}">
    <div class="blob-1"></div>
    <div class="blob-2"></div>
    <div class="vignette-overlay"></div>
    <div class="vibe-bg-pattern"></div>

    <div class="top-hud">
      <div class="topic-badge"><div class="pulse-dot"></div> ${storyboard.tagline}</div>
      <div class="time-badge">01:00</div>
    </div>

    <div class="visual-arena">
      ${beatsHtml}
    </div>

    ${captionsHtml}

    <div id="avatar-rig" class="avatar-rig">
      <img id="viseme-closed" src="assets/avatar/closed.png" class="viseme active" />
      <img id="viseme-teeth" src="assets/avatar/teeth.png" class="viseme" />
      <img id="viseme-open" src="assets/avatar/open_a.png" class="viseme" />
      <img id="viseme-round" src="assets/avatar/round_o.png" class="viseme" />
      <img id="viseme-m" src="assets/avatar/closed_m.png" class="viseme" />
    </div>

    <audio id="audio-voice" src="assets/audio/voiceover.mp3" class="clip" data-start="0" data-duration="${totalDuration.toFixed(2)}"></audio>
    <audio id="audio-bgm" src="assets/audio/bgm.mp3" class="clip" data-start="0" data-duration="${totalDuration.toFixed(2)}"></audio>
  </div>

  <script>
    const tl = gsap.timeline({ paused: true });
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = tl;

    // Gentle ducked BGM (0.07 volume)
    tl.to("#audio-bgm", { volume: 0.07, duration: 0.1 }, 0);

    ${beatsGsap}
    ${captionsGsap}
    ${avatarGsap}

    tl.seek(0);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(workDir, 'index.html'), indexHtml);
console.log('Successfully wrote index.html to', workDir);
