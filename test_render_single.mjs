import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';

const workDir = '/Users/dheerajsrinivasa/Library/Application Support/YouTube Studio Pro/Workspace/Videos/hf_project_1794548466060';
const audioDir = path.join(workDir, 'assets/audio');
const rawJson = path.join(audioDir, 'voiceover.json');
const data = JSON.parse(fs.readFileSync(rawJson, 'utf-8'));

const words = [];
for (const seg of data.segments || []) {
  for (const w of seg.words || []) {
    words.push({
      text: w.word.trim(),
      start: parseFloat(w.start),
      end: parseFloat(w.end)
    });
  }
}
console.log(`Loaded ${words.length} words from transcript`);

const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${path.join(audioDir, 'voiceover.mp3')}"`).toString().trim();
const totalDuration = parseFloat(durStr);
console.log(`Total duration: ${totalDuration}s`);


const storyboard = {
  title: "Skinny Fat to Greek God Blueprint",
  tagline: "6-MONTH RECOMPOSITION",
  scenes: [
    {
      phase: "PHASE 01: THE MISTAKE",
      type: "comparison",
      bad_title: "Endless Cardio & Starvation",
      bad_desc: "Melts whatever muscle you have, ruins metabolism, leaves you softer.",
      good_title: "Heavy Mechanical Tension + 200 Cal Deficit",
      good_desc: "Forces fat burn while high protein builds dense muscle tissue."
    },
    {
      phase: "PHASE 02: NUTRITION",
      type: "metrics",
      metric_title: "The Surgical Nutrition Protocol",
      metrics: [
        { value: "2g / kg", label: "Protein Daily" },
        { value: "-200 kcal", label: "Slight Deficit" },
        { value: "5g Daily", label: "Creatine Monohydrate" },
        { value: "4 Liters", label: "Water Hydration" }
      ]
    },
    {
      phase: "PHASE 03: TRAINING",
      type: "actions",
      action_title: "The V-Taper Movements",
      actions: [
        { lift: "Incline Dumbbell Press", target: "Upper Chest Fullness" },
        { lift: "Heavy Lateral Raises", target: "Capped Round Shoulders" },
        { lift: "Weighted Pull-Ups", target: "Wide Lat Spread" },
        { lift: "Romanian Deadlifts", target: "Posterior Chain & Glutes" }
      ]
    },
    {
      phase: "PHASE 04: TIMELINE",
      type: "timeline",
      timeline_title: "6-Month Transformation Check",
      milestones: [
        { time: "Month 1-2", desc: "Rapid neural strength & firming up" },
        { time: "Month 3-4", desc: "Waist shrinks by 2 inches, shoulders widen" },
        { time: "Month 5-6", desc: "Chiseled abs, carved jawline, aesthetic V-taper" }
      ]
    }
  ]
};

// Copy BGM
const bgmSrc = '/Users/dheerajsrinivasa/.gemini/antigravity/scratch/greek-god-transformation/assets/audio/bgm.mp3';
const bgmDst = path.join(audioDir, 'bgm.mp3');
if (fs.existsSync(bgmSrc) && !fs.existsSync(bgmDst)) {
  fs.copyFileSync(bgmSrc, bgmDst);
}

// Build hyperframes.json
const hfConfig = {
  $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
  registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
  paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
  media: { autoProxy: true }
};
fs.writeFileSync(path.join(workDir, 'hyperframes.json'), JSON.stringify(hfConfig, null, 2));

// Build caption groups
const captionGroups = [];
let cur = [];
for (let i = 0; i < words.length; i++) {
  const w = words[i];
  cur.push(w);
  const hasPunct = /[.?!,;:]/.test(w.text);
  const next = words[i + 1];
  const bigPause = next && (next.start - w.end >= 0.22);
  if (hasPunct || bigPause || cur.length >= 4 || i === words.length - 1) {
    captionGroups.push({
      id: `cg-${captionGroups.length}`,
      start: cur[0].start,
      end: cur[cur.length - 1].end + 0.12,
      words: [...cur]
    });
    cur = [];
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
tl.to("${wordId}", { color: "#FFD700", scale: 1.15, textShadow: "0 0 24px rgba(255,215,0,0.85)", duration: 0.08 }, ${w.start.toFixed(2)});
tl.to("${wordId}", { color: "#FFFFFF", scale: 1.0, textShadow: "none", duration: 0.1 }, ${w.end.toFixed(2)});`;
  });
});

// Calculate Scene Timings
const sceneCount = storyboard.scenes.length;
const sceneDur = totalDuration / Math.max(1, sceneCount);

let scenesHtml = '';
let scenesGsap = '';

storyboard.scenes.forEach((sc, idx) => {
  const sStart = idx * sceneDur;
  const sDur = sceneDur;
  const sceneId = `act-${idx}`;

  let innerContent = '';
  if (sc.type === 'comparison') {
    innerContent = `
      <div class="comp-grid">
        <div class="comp-card bad">
          <div class="card-tag">❌ WHAT 90% DO</div>
          <div class="card-head">${sc.bad_title}</div>
          <div class="card-body">${sc.bad_desc}</div>
        </div>
        <div class="comp-card good">
          <div class="card-tag">✅ THE BLUEPRINT</div>
          <div class="card-head">${sc.good_title}</div>
          <div class="card-body">${sc.good_desc}</div>
        </div>
      </div>`;
  } else if (sc.type === 'metrics') {
    const items = (sc.metrics || []).map(m => `
      <div class="metric-pill">
        <div class="metric-val">${m.value}</div>
        <div class="metric-lbl">${m.label}</div>
      </div>
    `).join('');
    innerContent = `
      <div class="metric-box">
        <div class="box-head">${sc.metric_title}</div>
        <div class="metrics-grid">${items}</div>
      </div>`;
  } else if (sc.type === 'actions') {
    const lifts = (sc.actions || []).map(a => `
      <div class="action-row">
        <div class="action-lift">🏋️ ${a.lift}</div>
        <div class="action-target">${a.target}</div>
      </div>
    `).join('');
    innerContent = `
      <div class="action-box">
        <div class="box-head">${sc.action_title}</div>
        <div class="actions-list">${lifts}</div>
      </div>`;
  } else {
    const ms = (sc.milestones || []).map(m => `
      <div class="timeline-row">
        <div class="time-badge-sm">${m.time}</div>
        <div class="time-desc">${m.desc}</div>
      </div>
    `).join('');
    innerContent = `
      <div class="timeline-box">
        <div class="box-head">${sc.timeline_title || 'Progression'}</div>
        <div class="timeline-list">${ms}</div>
      </div>`;
  }

  scenesHtml += `
    <div id="${sceneId}" class="scene clip" data-start="${sStart.toFixed(2)}" data-duration="${sDur.toFixed(2)}">
      <div class="phase-eyebrow">${sc.phase}</div>
      ${innerContent}
    </div>`;

  scenesGsap += `
tl.from("#${sceneId}", { opacity: 0, y: 40, scale: 0.95, duration: 0.45, ease: "power2.out" }, ${sStart.toFixed(2)});
tl.to("#${sceneId}", { opacity: 0, y: -30, scale: 0.98, duration: 0.35, ease: "power2.in" }, ${(sStart + sDur - 0.35).toFixed(2)});`;
});

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800;900&family=Cinzel:wght@700;800;900&family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07090E;
      --card-bg: rgba(15, 20, 31, 0.88);
      --card-border: rgba(255, 215, 0, 0.28);
      --gold: #FFD700;
      --amber: #F59E0B;
      --green: #10B981;
      --red: #EF4444;
      --cyan: #00F0FF;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1080px; height: 1920px; overflow: hidden;
      background: var(--bg); font-family: 'Plus Jakarta Sans', sans-serif;
      color: #FFF; user-select: none;
    }
    #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; }

    /* Ambient lighting */
    .blob-gold {
      position: absolute; top: 180px; left: 50%; transform: translateX(-50%);
      width: 800px; height: 800px; background: radial-gradient(circle, rgba(255, 215, 0, 0.12) 0%, transparent 70%);
      filter: blur(120px); pointer-events: none;
    }
    .grid-lines {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background-size: 80px 80px;
      background-image: linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
      pointer-events: none;
    }

    /* Top Safe Header */
    .top-header {
      position: absolute; top: 100px; left: 60px; right: 60px;
      display: flex; justify-content: space-between; align-items: center; z-index: 30;
    }
    .tag-badge {
      display: flex; align-items: center; gap: 12px;
      background: var(--card-bg); border: 1px solid var(--card-border);
      padding: 14px 26px; border-radius: 999px;
      font-family: 'Cinzel', serif; font-size: 20px; font-weight: 800; color: #FFF;
      letter-spacing: 0.1em;
    }
    .time-badge {
      background: rgba(255, 215, 0, 0.12); border: 1px solid var(--gold);
      padding: 12px 24px; border-radius: 999px; font-family: 'JetBrains Mono', monospace;
      font-size: 20px; font-weight: 800; color: var(--gold);
    }

    /* Scene Center Stage */
    .scene {
      position: absolute; top: 260px; left: 60px; right: 60px; height: 1100px;
      display: flex; flex-direction: column; justify-content: center; z-index: 20;
    }
    .phase-eyebrow {
      font-family: 'Cinzel', serif; font-size: 26px; font-weight: 800;
      letter-spacing: 0.15em; color: var(--gold); text-align: center; margin-bottom: 30px;
    }

    /* Comparison Card */
    .comp-grid { display: flex; flex-direction: column; gap: 24px; }
    .comp-card {
      padding: 34px; border-radius: 24px; backdrop-filter: blur(20px);
      display: flex; flex-direction: column; gap: 12px;
    }
    .comp-card.bad {
      background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .comp-card.good {
      background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.5);
    }
    .card-tag { font-size: 16px; font-weight: 800; letter-spacing: 0.1em; }
    .comp-card.bad .card-tag { color: var(--red); }
    .comp-card.good .card-tag { color: var(--green); }
    .card-head { font-size: 32px; font-weight: 800; line-height: 1.25; }
    .card-body { font-size: 22px; color: rgba(255, 255, 255, 0.75); line-height: 1.4; }

    /* Metric Grid */
    .metric-box {
      background: var(--card-bg); border: 1px solid var(--card-border);
      border-radius: 28px; padding: 40px 30px; backdrop-filter: blur(20px);
    }
    .box-head { font-size: 34px; font-weight: 800; text-align: center; margin-bottom: 34px; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .metric-pill {
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 215, 0, 0.25);
      border-radius: 20px; padding: 26px 20px; text-align: center;
    }
    .metric-val { font-size: 40px; font-weight: 900; color: var(--gold); font-family: 'JetBrains Mono', monospace; }
    .metric-lbl { font-size: 18px; font-weight: 700; color: rgba(255, 255, 255, 0.7); margin-top: 6px; }

    /* Actions List */
    .action-box {
      background: var(--card-bg); border: 1px solid var(--card-border);
      border-radius: 28px; padding: 36px 30px; backdrop-filter: blur(20px);
    }
    .actions-list { display: flex; flex-direction: column; gap: 16px; }
    .action-row {
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px; padding: 22px 26px; display: flex; justify-content: space-between; align-items: center;
    }
    .action-lift { font-size: 26px; font-weight: 800; }
    .action-target { font-size: 20px; font-weight: 700; color: var(--gold); }

    /* Timeline Box */
    .timeline-box {
      background: var(--card-bg); border: 1px solid var(--card-border);
      border-radius: 28px; padding: 36px 30px; backdrop-filter: blur(20px);
    }
    .timeline-list { display: flex; flex-direction: column; gap: 20px; }
    .timeline-row {
      display: flex; gap: 20px; align-items: center;
      background: rgba(255, 255, 255, 0.04); border-radius: 16px; padding: 22px 24px;
    }
    .time-badge-sm {
      background: var(--gold); color: #000; font-family: 'JetBrains Mono', monospace;
      font-weight: 900; font-size: 20px; padding: 8px 18px; border-radius: 10px; white-space: nowrap;
    }
    .time-desc { font-size: 22px; font-weight: 700; line-height: 1.35; }

    /* Captions Safe Zone */
    .caption-group {
      position: absolute; bottom: 220px; left: 80px; right: 80px;
      display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;
      text-align: center; z-index: 40;
    }
    .caption-word {
      font-size: 54px; font-weight: 900; letter-spacing: 0.02em;
      text-transform: uppercase; color: #FFF; transition: color 0.05s ease;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div id="root" class="clip" data-start="0" data-duration="${totalDuration.toFixed(2)}">
    <div class="blob-gold"></div>
    <div class="grid-lines"></div>

    <div class="top-header">
      <div class="tag-badge">🏛️ ${storyboard.tagline || 'TRANSFORMATION PROTOCOL'}</div>
      <div class="time-badge">01:28</div>
    </div>

    ${scenesHtml}
    ${captionsHtml}

    <audio id="audio-voice" src="assets/audio/voiceover.mp3" class="clip" data-start="0" data-duration="${totalDuration.toFixed(2)}"></audio>
    <audio id="audio-bgm" src="assets/audio/bgm.mp3" class="clip" data-start="0" data-duration="${totalDuration.toFixed(2)}"></audio>
  </div>

  <script>
    const tl = gsap.timeline({ paused: true });
    window.__timelines = { "root": tl };

    // Audio ducking for BGM
    tl.to("#audio-bgm", { volume: 0.18, duration: 0.1 }, 0);

    ${scenesGsap}
    ${captionsGsap}
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(workDir, 'index.html'), html);
console.log('Successfully wrote index.html and hyperframes.json to', workDir);
