import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENGINE_DIR = __dirname;
const ASSETS_DIR = path.join(ENGINE_DIR, 'assets');
const AUDIO_DIR = path.join(ASSETS_DIR, 'audio');
const BGM_DIR = path.join(AUDIO_DIR, 'bgm');
const AVATAR_DIR = path.join(ASSETS_DIR, 'avatar');
const VOICE_PATH = path.join(AUDIO_DIR, 'dheeraj_voice.mp3');
const BGM_PATH = path.join(AUDIO_DIR, 'bgm.mp3');

const ENV_PATH = `/Users/dheerajsrinivasa/.local/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`;

function emit(pct, step, msg) {
  console.log(JSON.stringify({ type: 'progress', percent: pct, step, message: msg }));
}

const REF_TEXT = (
  'Hey, this is Dheeraj. We are testing the voice assistant here in Bangalore, ' +
  'looking for natural rhythm and human realism. Yesterday, Arjun and Rahul were ' +
  'discussing our project roadmap, while Maya reviewed the architectural blueprints. ' +
  'There are a few things we need to settle before Friday: first, whether the database ' +
  'migration can happen over the weekend without downtime, and second, how we handle ' +
  'latency during peak hours. The weather outside today is surprisingly pleasant with ' +
  'cool monsoon breezes. Let\'s see if this longer recording captures the natural tone, ' +
  'pauses, and accent accurately.'
);

// MARK: - Visual Theme Catalog (8 Handcrafted Creator Palettes)
export const PRESET_THEMES = {
  creator_viral: {
    name: "Creator Viral",
    background_css: "radial-gradient(ellipse at 50% 15%, #181236 0%, #0E0922 55%, #05030D 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(255, 230, 0, 0.22) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(255, 0, 85, 0.20) 0%, transparent 65%)",
    accent_primary: "#FFE600",
    accent_secondary: "#FF0055",
    card_bg: "rgba(22, 14, 46, 0.90)",
    card_border: "rgba(255, 230, 0, 0.4)",
    card_glow: "0 20px 60px rgba(255, 230, 0, 0.25)",
    caption_highlight: "#FFE600",
    vibe_pattern: "dot_matrix"
  },
  abyssal_dread: {
    name: "Abyssal Dread",
    background_css: "radial-gradient(ellipse at 50% 10%, #200408 0%, #0D0204 50%, #030002 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(255, 0, 60, 0.28) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(255, 107, 0, 0.22) 0%, transparent 65%)",
    accent_primary: "#FF003C",
    accent_secondary: "#FF6B00",
    card_bg: "rgba(28, 4, 8, 0.92)",
    card_border: "rgba(255, 0, 60, 0.45)",
    card_glow: "0 20px 60px rgba(255, 0, 60, 0.35)",
    caption_highlight: "#FF003C",
    vibe_pattern: "hazard_lines"
  },
  crimson_noir: {
    name: "Crimson Noir",
    background_css: "radial-gradient(ellipse at 50% 15%, #2A050B 0%, #150205 55%, #080002 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(255, 0, 60, 0.28) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(255, 107, 0, 0.20) 0%, transparent 65%)",
    accent_primary: "#FF003C",
    accent_secondary: "#FF6B00",
    card_bg: "rgba(32, 4, 10, 0.90)",
    card_border: "rgba(255, 0, 60, 0.42)",
    card_glow: "0 20px 60px rgba(255, 0, 60, 0.30)",
    caption_highlight: "#FF003C",
    vibe_pattern: "hazard_lines"
  },
  ocean_abyss: {
    name: "Ocean Abyss",
    background_css: "radial-gradient(ellipse at 50% 15%, #052642 0%, #021324 55%, #010812 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(0, 163, 255, 0.25) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(0, 245, 212, 0.18) 0%, transparent 65%)",
    accent_primary: "#00A3FF",
    accent_secondary: "#00F5D4",
    card_bg: "rgba(3, 19, 36, 0.90)",
    card_border: "rgba(0, 163, 255, 0.38)",
    card_glow: "0 20px 60px rgba(0, 163, 255, 0.22)",
    caption_highlight: "#00F5D4",
    vibe_pattern: "bathymetric_depth"
  },
  emerald_tech: {
    name: "Emerald Tech",
    background_css: "radial-gradient(ellipse at 50% 15%, #061F12 0%, #03120A 55%, #010804 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(0, 255, 136, 0.25) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(0, 229, 255, 0.18) 0%, transparent 65%)",
    accent_primary: "#00FF88",
    accent_secondary: "#00E5FF",
    card_bg: "rgba(5, 26, 16, 0.90)",
    card_border: "rgba(0, 255, 136, 0.38)",
    card_glow: "0 20px 60px rgba(0, 255, 136, 0.25)",
    caption_highlight: "#00FF88",
    vibe_pattern: "blueprint_grid"
  },
  luxury_gold: {
    name: "Luxury Gold",
    background_css: "radial-gradient(ellipse at 50% 15%, #261D08 0%, #140E03 55%, #080501 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(255, 215, 0, 0.26) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(255, 255, 255, 0.16) 0%, transparent 65%)",
    accent_primary: "#FFD700",
    accent_secondary: "#FFFFFF",
    card_bg: "rgba(34, 26, 8, 0.90)",
    card_border: "rgba(255, 215, 0, 0.4)",
    card_glow: "0 20px 60px rgba(255, 215, 0, 0.25)",
    caption_highlight: "#FFD700",
    vibe_pattern: "pinstripe_sheen"
  },
  cyber_violet: {
    name: "Cyber Violet",
    background_css: "radial-gradient(ellipse at 50% 15%, #240C3E 0%, #130522 55%, #07010E 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(236, 72, 153, 0.22) 0%, transparent 65%)",
    accent_primary: "#C084FC",
    accent_secondary: "#F43F5E",
    card_bg: "rgba(32, 12, 54, 0.90)",
    card_border: "rgba(192, 132, 252, 0.38)",
    card_glow: "0 20px 60px rgba(192, 132, 252, 0.25)",
    caption_highlight: "#F472B6",
    vibe_pattern: "cyber_grid"
  },
  studio_frost: {
    name: "Studio Frost",
    background_css: "radial-gradient(ellipse at 50% 15%, #131E33 0%, #0A111E 55%, #04070D 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(248, 250, 252, 0.16) 0%, transparent 65%)",
    accent_primary: "#38BDF8",
    accent_secondary: "#F8FAFC",
    card_bg: "rgba(17, 28, 48, 0.90)",
    card_border: "rgba(56, 189, 248, 0.35)",
    card_glow: "0 20px 60px rgba(56, 189, 248, 0.20)",
    caption_highlight: "#38BDF8",
    vibe_pattern: "modern_minimal"
  },
  warm_creator: {
    name: "Warm Creator",
    background_css: "radial-gradient(ellipse at 50% 20%, #1A1311 0%, #0F0B0A 60%, #080605 100%)",
    ambient_glow_1: "radial-gradient(circle, rgba(255, 159, 28, 0.22) 0%, transparent 70%)",
    ambient_glow_2: "radial-gradient(circle, rgba(255, 64, 129, 0.18) 0%, transparent 65%)",
    accent_primary: "#FF9F1C",
    accent_secondary: "#FF4081",
    card_bg: "rgba(28, 20, 18, 0.85)",
    card_border: "rgba(255, 159, 28, 0.35)",
    card_glow: "0 20px 60px rgba(255, 159, 28, 0.2)",
    caption_highlight: "#FFD166",
    vibe_pattern: "modern_minimal"
  }
};

export function getVibePatternCss(pattern, primary, secondary) {
  switch (pattern) {
    case 'hazard_lines':
      return `background-size: 40px 40px;\n      background-image: repeating-linear-gradient(45deg, ${primary}14 0, ${primary}14 12px, transparent 12px, transparent 24px);`;
    case 'bathymetric_depth':
      return `background-size: 140px 140px;\n      background-image: radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, ${primary}15 41px, transparent 43px, transparent 80px, ${primary}10 81px, transparent 83px, transparent 120px, ${primary}0A 121px, transparent 123px);`;
    case 'dot_matrix':
      return `background-size: 32px 32px;\n      background-image: radial-gradient(circle at 50% 50%, ${primary}25 2.5px, transparent 2.5px);`;
    case 'pinstripe_sheen':
      return `background-size: 48px 100%;\n      background-image: repeating-linear-gradient(90deg, ${primary}10 0, ${primary}10 2px, transparent 2px, transparent 48px);`;
    case 'blueprint_grid':
      return `background-size: 70px 70px;\n      background-image: linear-gradient(to right, ${primary}18 1px, transparent 1px), linear-gradient(to bottom, ${primary}18 1px, transparent 1px);`;
    case 'cyber_grid':
      return `background-size: 50px 50px;\n      background-image: linear-gradient(to right, ${primary}20 1px, transparent 1px), linear-gradient(to bottom, ${primary}20 1px, transparent 1px);`;
    case 'modern_minimal':
    default:
      return `background-size: 80px 80px;\n      background-image: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.07) 1.5px, transparent 1.5px);`;
  }
}

export function resolveTheme(requestedTheme, topic = '', storyboardTheme = null) {
  if (requestedTheme && requestedTheme !== 'auto' && PRESET_THEMES[requestedTheme]) {
    return PRESET_THEMES[requestedTheme];
  }

  const t = (topic || '').toLowerCase();
  const isHorror = t.includes('horror') || t.includes('terrify') || t.includes('creepy') || t.includes('ghost') || t.includes('danger') || t.includes('blood') || t.includes('crime') || t.includes('dark') || t.includes('monster') || t.includes('scary') || t.includes('death') || t.includes('deadly');
  const isOcean = t.includes('ocean') || t.includes('sea') || t.includes('water') || t.includes('depth') || t.includes('shark') || t.includes('trench') || t.includes('abyss') || t.includes('hadal') || t.includes('challenger') || t.includes('coral') || t.includes('marine') || t.includes('aquatic') || t.includes('underwater');

  // CRITICAL: Ocean Horror topics route to high-contrast Abyssal Dread, NOT generic cyan
  if (isHorror && isOcean) {
    return PRESET_THEMES.abyssal_dread;
  }
  if (isHorror) {
    return PRESET_THEMES.crimson_noir;
  }
  if (isOcean) {
    return PRESET_THEMES.ocean_abyss;
  }
  if (t.includes('greek') || t.includes('god') || t.includes('muscle') || t.includes('fitness') || t.includes('gym') || t.includes('wealth') || t.includes('rich') || t.includes('gold') || t.includes('money') || t.includes('finance') || t.includes('housing') || t.includes('real estate') || t.includes('history') || t.includes('empire')) {
    return PRESET_THEMES.luxury_gold;
  }
  if (t.includes('ai') || t.includes('tech') || t.includes('code') || t.includes('software') || t.includes('algorithm') || t.includes('robot') || t.includes('startup') || t.includes('data') || t.includes('kubernetes') || t.includes('k8s') || t.includes('cloud') || t.includes('docker') || t.includes('devops')) {
    return PRESET_THEMES.emerald_tech;
  }
  if (t.includes('cyber') || t.includes('game') || t.includes('gaming') || t.includes('virtual') || t.includes('future') || t.includes('synth') || t.includes('space') || t.includes('scifi')) {
    return PRESET_THEMES.cyber_violet;
  }
  if (t.includes('study') || t.includes('typing') || t.includes('speed') || t.includes('book') || t.includes('clean') || t.includes('minimal') || t.includes('productivity')) {
    return PRESET_THEMES.studio_frost;
  }

  // If storyboard theme has explicit valid colors that are non-ocean defaults
  if (storyboardTheme && storyboardTheme.accent_primary && storyboardTheme.accent_primary !== '#00F2FE') {
    return {
      ...PRESET_THEMES.creator_viral,
      ...storyboardTheme
    };
  }

  return PRESET_THEMES.creator_viral;
}

function isTechnicalTopic(topic = '') {
  const t = topic.toLowerCase();
  const explicitTech = [
    'kubernetes', 'k8s', 'kubernat', 'docker', 'container', 'pod', 'microservice',
    'devops', 'ci/cd', 'git repo', 'github', 'gitlab',
    'database', 'sql', 'nosql', 'redis', 'postgres', 'kafka', 'etcd', 'mongodb',
    'rest api', 'graphql', 'backend', 'frontend', 'react', 'nodejs', 'python code',
    'golang', 'rust lang', 'linux kernel', 'terminal command', 'compiler',
    'load balancer', 'system architecture', 'software architecture', 'coding',
    'programming', 'web dev', 'source code', 'cluster node'
  ];
  return explicitTech.some(k => t.includes(k));
}

// MARK: - Step 1: LLM Dynamic Storyboard & Theme Director
async function generateStoryboard(topic, durationSeconds, apiKey) {
  emit(10, 'Scripting', `Directing creator storyboard & visual theme for "${topic}"...`);

  const isTech = isTechnicalTopic(topic);

  let prompt = '';

  if (isTech) {
    prompt = `You are a world-class creator & engineering video director (specialized in viral high-retention technical explainers like Fireship, Veritasium, and Vox).
Topic: "${topic}"
Target Duration: ${durationSeconds} seconds (approximately ${Math.round(durationSeconds * 2.3)} spoken words).

DETECT TOPIC GENRE: TECHNICAL / ARCHITECTURE / ENGINEERING EXPLAINER

CRITICAL TECHNICAL & CREATOR DIRECTIVES:
1. The viewer is watching this video specifically to see REAL CODE, REAL CLUSTER ARCHITECTURE, and REAL TERMINAL WORKFLOWS.
2. YOU ARE STRICTLY FORBIDDEN from generating generic marketing slogans, bullet lists, or PowerPoint-style presentation cards.
   DO NOT USE 'split_contrast', 'roadmap_checklist', or 'classified_dossier'. They are strictly banned for this topic.
3. MANDATORY FIRST BEAT RULE:
   Beat 0 (0 to 4 seconds) MUST be EITHER 'code_workbench' or 'architecture_diagram'.
   Real code or system architecture MUST appear on screen in the very first 2 seconds!
4. MANDATORY PACING CONTRACT:
   Create 10 to 14 rapid visual beats (lasting 3 to 5 seconds each).
   Paragraph 1 MUST contain at least 2 or 3 beats with anchor phrases every 10 to 15 spoken words!
   NEVER leave any single beat on screen for more than 5 seconds.
5. Every beat MUST include an "anchor_phrase" property containing an EXACT 2 to 5 word phrase taken verbatim from your "paragraphs" text that triggers this visual card when spoken.
   Anchor phrases MUST be arranged in strictly chronological order as spoken in the paragraphs from start to finish.

ALLOWED ARCHETYPES FOR THIS TOPIC (Pick ONLY from these 6):
- 'code_workbench': Full-screen developer IDE (VS Code) showing file tree, syntax-highlighted code, and integrated terminal running commands.
  Schema: {
    "anchor_phrase": "string",
    "type": "code_workbench",
    "eyebrow": "DECLARATIVE MANIFEST",
    "filename": "deployment.yaml",
    "language": "yaml",
    "highlight_line": 6,
    "files": ["deployment.yaml", "service.yaml", "ingress.yaml"],
    "lines": [
      { "num": "01", "text": "apiVersion: apps/v1" },
      { "num": "02", "text": "kind: Deployment" },
      { "num": "03", "text": "metadata:" },
      { "num": "04", "text": "  name: web-api" },
      { "num": "05", "text": "spec:" },
      { "num": "06", "text": "  replicas: 3", "highlight": true, "note": "Desired State" },
      { "num": "07", "text": "  template:" },
      { "num": "08", "text": "    spec: containers: [{name: server, image: nginx:alpine}]" }
    ],
    "command": "kubectl apply -f deployment.yaml",
    "outputs": [
      { "name": "web-api-7b8c-1", "ready": "1/1", "status": "Running", "ip": "10.244.1.4" },
      { "name": "web-api-7b8c-2", "ready": "1/1", "status": "Running", "ip": "10.244.2.8" },
      { "name": "web-api-7b8c-3", "ready": "1/1", "status": "Running", "ip": "10.244.1.9" }
    ],
    "success_message": "3/3 Replicas Synchronized"
  }

- 'architecture_diagram': Interactive cluster/system topology (Control Plane + Worker Nodes).
  Schema: {
    "anchor_phrase": "string",
    "type": "architecture_diagram",
    "eyebrow": "CLUSTER TOPOLOGY",
    "title": "Control Plane & Worker Nodes",
    "control_plane": {
      "title": "Control Plane (Master)",
      "components": [
        { "name": "API Server", "role": "Cluster Gateway & REST API" },
        { "name": "etcd", "role": "Distributed State Store" },
        { "name": "Kube-Scheduler", "role": "Pod Placement Engine" },
        { "name": "Controller Mgr", "role": "State Reconciliation" }
      ]
    },
    "worker_nodes": [
      { "node_name": "Worker Node 01", "pods": ["web-api-a", "web-api-b"] },
      { "node_name": "Worker Node 02", "pods": ["web-api-c", "db-pod-d"] }
    ],
    "flow_label": "Bi-directional TLS telemetry & scheduling directives"
  }

- 'code_snippet': Focused code / manifest editor walkthrough.
  Schema: {
    "anchor_phrase": "string",
    "type": "code_snippet",
    "eyebrow": "SERVICE DEFINITION",
    "filename": "service.yaml",
    "language": "yaml",
    "highlight_line": 4,
    "lines": [
      { "num": "01", "text": "apiVersion: v1" },
      { "num": "02", "text": "kind: Service" },
      { "num": "03", "text": "spec:" },
      { "num": "04", "text": "  type: LoadBalancer", "highlight": true, "note": "External IP" },
      { "num": "05", "text": "  ports: [{ port: 80, targetPort: 8080 }]" }
    ]
  }

- 'terminal_execution': Dedicated terminal CLI execution session.
  Schema: {
    "anchor_phrase": "string",
    "type": "terminal_execution",
    "eyebrow": "CLUSTER CLI",
    "command": "kubectl get pods -o wide --watch",
    "outputs": [
      { "type": "info", "text": "deployment.apps/web-api configured" },
      { "type": "header", "text": "NAME         READY   STATUS    RESTARTS   AGE" },
      { "type": "row", "name": "web-api-1", "ready": "1/1", "status": "Running", "ip": "10.244.0.12" },
      { "type": "row", "name": "web-api-2", "ready": "1/1", "status": "Running", "ip": "10.244.1.4" },
      { "type": "row", "name": "web-api-3", "ready": "1/1", "status": "Running", "ip": "10.244.2.8" },
      { "type": "success", "text": "✓ 3/3 Healthy & Auto-Balancing" }
    ]
  }

- 'system_flow': End-to-end request or data pipeline.
  Schema: {
    "anchor_phrase": "string",
    "type": "system_flow",
    "eyebrow": "REQUEST LIFECYCLE",
    "title": "From Ingress to Container",
    "steps": [
      { "step": "01", "name": "Client Request", "desc": "HTTPS Traffic arrives at Cluster IP", "badge": "INGRESS" },
      { "step": "02", "name": "Ingress Controller", "desc": "TLS termination and URL path routing", "badge": "ROUTING" },
      { "step": "03", "name": "Kube-Proxy", "desc": "IPtables load balancing across pods", "badge": "SERVICE" },
      { "step": "04", "name": "Target Pod", "desc": "Container handles request & returns JSON", "badge": "APP" }
    ]
  }

- 'mechanism_inspect': Self-healing / reconciliation loop simulator.
  Schema: {
    "anchor_phrase": "string",
    "type": "mechanism_inspect",
    "eyebrow": "THE RECONCILIATION LOOP",
    "title": "Continuous State Convergence",
    "desired_state": "3 Replicas Running",
    "detected_event": "Node 02 Out of Memory (Pod 3 Died)",
    "controller_action": "Controller schedules Pod 4 on Node 01",
    "final_state": "Cluster restored to 3/3 within 120ms"
  }

Return ONLY valid JSON with this exact structure:
{
  "title": "Short Punchy Title",
  "tagline": "UPPERCASE CATEGORY OR HOOK",
  "bgm_mood": "cyber_synth",
  "theme_preset": "emerald_tech",
  "paragraphs": [
    "Opening hook paragraph with exact words...",
    "Second paragraph with architectural details...",
    "Third paragraph with execution/code flow...",
    "Closing takeaway paragraph..."
  ],
  "beats": [
    { ... }
  ]
}`;
  } else {
    prompt = `You are a world-class creator & documentary video director (specialized in high-retention viral YouTube Shorts, Vox explainers, National Geographic, and Veritasium).
Topic: "${topic}"
Target Duration: ${durationSeconds} seconds (approximately ${Math.round(durationSeconds * 2.3)} spoken words).

DETECT TOPIC GENRE: DOCUMENTARY / NATURE / SCIENCE / HISTORY / DEEP SEA / VISUAL EXPLAINER

CRITICAL VISUAL & CREATOR DIRECTIVES:
1. THE VIEWER IS WATCHING THIS VIDEO TO SEE REAL SUBJECT PHOTOGRAPHY, AUTHENTIC EVIDENCE, AND HIGH-TECH HUD TELEMETRY.
2. YOU ARE STRICTLY FORBIDDEN from generating generic PowerPoint presentation cards, bullet checklists, or marketing comparison boxes ('split_contrast', 'roadmap_checklist').
3. MANDATORY VISUAL MEDIA SEARCH QUERY ("image_query"):
   Every single beat MUST include an "image_query" property specifying a precise 1-3 word Wikipedia/Wikimedia search query for authentic photography of that exact subject.
   Examples:
   - "Humpback anglerfish"
   - "Mariana Trench map"
   - "Hydrothermal vent"
   - "Colossal squid"
   - "Challenger Deep"
   - "Bathyscaphe Trieste"
   - "Giant isopod"
   - "Pacific viperfish"

4. ALLOWED DOCUMENTARY ARCHETYPES (Pick dynamically across beats):
   - 'cinematic_specimen': Full-screen real subject photograph with Ken Burns zoom, targeting reticle crosshair, scientific taxonomy badge, depth/pressure badge, and punchy takeaway.
     Schema: {
       "anchor_phrase": "exact phrase from spoken paragraph",
       "type": "cinematic_specimen",
       "eyebrow": "DEEP SEA SPECIMEN",
       "title": "HUMPBACK ANGLERFISH",
       "image_query": "Humpback anglerfish",
       "taxonomy": "MELANOCETUS JOHNSONII // ZONE: BATHYPELAGIC",
       "stat_pill": "DEPTH: 2,000M",
       "punchline": "Jaws snap shut in one millisecond"
     }
   - 'telemetry_inspection': Authentic satellite, bathymetric, or topographical map or scan with sweep line, coordinates, telemetry meters, and warning alert.
     Schema: {
       "anchor_phrase": "exact phrase from spoken paragraph",
       "type": "telemetry_inspection",
       "eyebrow": "HADAL BATHYMETRY",
       "title": "MARIANA TRENCH CHASM",
       "image_query": "Mariana Trench map",
       "coordinates": "11°21′N 142°12′E",
       "telemetry": [
         { "label": "MAX DEPTH", "value": "10,984m" },
         { "label": "CRUSH PRESSURE", "value": "1,086 ATM" },
         { "label": "SOLAR PENETRATION", "value": "0.00%" }
       ],
       "alert": "Hull implosion threshold exceeded"
     }
   - 'scale_comparison': Authentic visual comparison showing specimen scale vs human diver/vehicle with dynamic scale bar.
     Schema: {
       "anchor_phrase": "exact phrase from spoken paragraph",
       "type": "scale_comparison",
       "eyebrow": "EXTREME GIGANTISM",
       "title": "COLOSSAL SQUID VS DIVER",
       "image_query": "Colossal squid",
       "subject_scale": "14 METERS (BUS-SIZED)",
       "comparison_scale": "1.8 METERS (HUMAN DIVER)",
       "takeaway": "Dinner-plate eyes evolved to detect bioluminescence"
     }
   - 'dossier_investigation': Declassified investigation docket with pinned evidence photo, red rubber stamp, and classified observation reveal.
     Schema: {
       "anchor_phrase": "exact phrase from spoken paragraph",
       "type": "dossier_investigation",
       "eyebrow": "FIELD INVESTIGATION",
       "title": "CHALLENGER DEEP EXPEDITION",
       "image_query": "Bathyscaphe Trieste",
       "badge": "DECLASSIFIED LOG #1960",
       "location": "CHALLENGER DEEP",
       "observation": "Outer window cracked under 1,000 atmospheres of crushing pressure",
       "stamp": "DECLASSIFIED LOG"
     }
   - 'depth_meter': (CRITICAL for oceans/trenches/abyss): Oceanic Depth & Scale Telemetry Gauge with vertical zone ruler from Sunlight down to Hadal Trenches and real hydrostatic telemetry.
     Schema: {
       "anchor_phrase": "exact phrase from spoken paragraph",
       "type": "depth_meter",
       "eyebrow": "HADAL TELEMETRY",
       "target": "CHALLENGER DEEP",
       "depth": "10,984m",
       "pressure": "1,086 ATM",
       "temp": "1.2°C",
       "alert": "Instant implosion zone for unhulled vessels",
       "image_query": "Mariana Trench map"
     }

5. MANDATORY PACING CONTRACT:
   Create 8 to 12 rapid visual beats (lasting 3 to 5 seconds each).
   Every beat MUST have an "anchor_phrase" matching exact spoken words.
   Dynamically vary archetypes across beats (e.g. specimen -> telemetry -> scale -> dossier -> depth_meter).
6. Pick the best BGM mood fitting the topic: 'ambient_suspense', 'dark_mystery', 'cinematic_epic', 'lofi_chill', 'cyber_synth'.
7. Pick the best visual theme preset fitting the topic: 'abyssal_dread' (for terrifying ocean/deep sea topics), 'crimson_noir' (horror/danger), 'ocean_abyss' (exploratory sea), 'luxury_gold' (history/wealth), 'cyber_violet' (space/sci-fi), 'creator_viral' (general high energy).

Return ONLY valid JSON matching this exact structure:
{
  "title": "Short Punchy Title",
  "tagline": "UPPERCASE CATEGORY OR HOOK",
  "bgm_mood": "ambient_suspense",
  "theme_preset": "abyssal_dread",
  "paragraphs": [
    "Opening hook paragraph with exact words...",
    "Second revelation paragraph with specific data points...",
    "Third escalating detail paragraph...",
    "Closing takeaway paragraph..."
  ],
  "beats": [
    { ... }
  ]
}`;
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://youtube-studio-pro.local',
      'X-Title': 'YouTube Studio Pro'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Storyboard LLM failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(raw);
}

// MARK: - Step 2: Fish Audio Voice Cloning
async function synthesizeVoice(paragraphs, workDir, apiKey) {
  emit(25, 'Voiceover', 'Synthesizing cloned narration with Fish Audio on OpenRouter...');
  const audioDir = path.join(workDir, 'assets/audio');
  fs.mkdirSync(audioDir, { recursive: true });

  const b64Voice = fs.readFileSync(VOICE_PATH).toString('base64');
  const chunkFiles = [];

  for (let i = 0; i < paragraphs.length; i++) {
    emit(25 + Math.round((i / paragraphs.length) * 20), 'Voiceover', `Synthesizing narration chunk ${i + 1}/${paragraphs.length}...`);
    const chunkText = paragraphs[i];
    const payload = {
      model: 'fish-audio/s2.1-pro-free:free',
      input: chunkText,
      response_format: 'mp3',
      speed: 0.95,
      input_references: [
        {
          type: 'input_audio',
          input_audio: { data: `data:audio/mp3;base64,${b64Voice}` }
        },
        {
          type: 'text',
          text: REF_TEXT
        }
      ]
    };

    const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://youtube-studio-pro.local',
        'X-OpenRouter-Title': 'YouTubeStudioPro'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fish Audio synthesis failed (${res.status}): ${errText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const chunkFile = path.join(audioDir, `chunk_${i}.mp3`);
    fs.writeFileSync(chunkFile, buffer);
    chunkFiles.push(chunkFile);
  }

  // Concatenate chunks
  const concatTxt = path.join(audioDir, 'concat.txt');
  fs.writeFileSync(concatTxt, chunkFiles.map(f => `file '${f}'`).join('\n'));

  const masterAudio = path.join(audioDir, 'voiceover.mp3');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatTxt}" -c copy "${masterAudio}"`, {
    stdio: 'ignore',
    env: { ...process.env, PATH: ENV_PATH }
  });
  return masterAudio;
}

// MARK: - Step 3: Whisper Alignment
function transcribeAudio(audioPath, workDir) {
  emit(50, 'Transcription', 'Extracting word-level timestamps with Whisper...');
  const audioDir = path.join(workDir, 'assets/audio');
  
  const whisperCandidates = [
    '/Users/dheerajsrinivasa/.local/bin/whisper-ctranslate2',
    '/opt/homebrew/bin/whisper-ctranslate2',
    '/usr/local/bin/whisper-ctranslate2'
  ];
  const whisperBin = whisperCandidates.find(p => fs.existsSync(p)) || 'whisper-ctranslate2';

  execSync(`"${whisperBin}" "${audioPath}" --model base.en --word_timestamps True --output_format json --output_dir "${audioDir}"`, {
    stdio: 'ignore',
    env: { ...process.env, PATH: ENV_PATH }
  });

  const rawJson = path.join(audioDir, 'voiceover.json');
  const data = JSON.parse(fs.readFileSync(rawJson, 'utf-8'));

  const words = [];
  for (const seg of data.segments || []) {
    for (const w of seg.words || []) {
      const txt = w.word.trim();
      if (txt) {
        words.push({
          text: txt,
          start: parseFloat(w.start),
          end: parseFloat(w.end)
        });
      }
    }
  }

  const transcriptPath = path.join(audioDir, 'transcript.json');
  fs.writeFileSync(transcriptPath, JSON.stringify(words, null, 2));
  return words;
}

// MARK: - Transcript Alignment & Anchor Matching
function alignBeatsToTranscript(rawBeats, words, totalDuration) {
  const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

  const normWords = words.map((w, idx) => ({
    text: clean(w.text || w.word || ''),
    start: w.start,
    end: w.end,
    origIndex: idx
  }));

  const beats = rawBeats && rawBeats.length > 0 ? rawBeats : [
    { type: 'kinetic_slam', eyebrow: 'ALERT', headline: 'REVEALED', highlight_word: 'TRUTH', punchline: 'The complete breakdown.' }
  ];

  let lastMatchedWordIdx = 0;
  const timed = [];

  for (let bIdx = 0; bIdx < beats.length; bIdx++) {
    const beat = beats[bIdx];
    const phrase = clean(beat.anchor_phrase || beat.headline || beat.title || '');
    const tokens = phrase.split(/\s+/).filter(Boolean);

    let matchTime = null;
    let matchWordIdx = null;

    if (tokens.length > 0) {
      // 1. Exact consecutive token sequence match from lastMatchedWordIdx
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

      // 2. Fallback: fuzzy/window match (70%+ tokens appear within 6 words)
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

      // 3. Fallback: distinctive keyword (>4 characters) match
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

  // First beat starts at 0.00s (or when speech begins)
  if (timed.length > 0 && (timed[0].rawStart === null || timed[0].rawStart > 2.5)) {
    timed[0].rawStart = 0.00;
  }

  // Interpolate any beats that could not be directly matched
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

  // Enforce Pacing Contract: Max duration per beat is 4.8s to prevent static holds
  for (let i = 0; i < timed.length - 1; i++) {
    const cur = timed[i].rawStart;
    const nxt = timed[i + 1].rawStart;
    if (nxt - cur > 4.8) {
      timed[i + 1].rawStart = cur + 4.5;
    }
  }

  // Ensure strictly monotonic order
  for (let i = 1; i < timed.length; i++) {
    if (timed[i].rawStart <= timed[i - 1].rawStart) {
      timed[i].rawStart = timed[i - 1].rawStart + 2.5;
    }
  }

  // If beats clump at the beginning, distribute rhythmically to cover duration
  const lastStart = timed[timed.length - 1]?.rawStart || 0;
  if (totalDuration > 15 && (totalDuration - lastStart > 7.0 || (timed[0]?.rawStart || 0) > 2.0)) {
    const idealStep = (totalDuration - 3.2) / Math.max(1, timed.length - 1);
    for (let i = 0; i < timed.length; i++) {
      const idealStart = i * idealStep;
      // 40% anchor time, 60% rhythmic pacing
      timed[i].rawStart = (timed[i].rawStart * 0.4) + (idealStart * 0.6);
    }
  }

  // Calculate durations: each beat stays on screen until the next beat begins (capped to max 5.2s)
  const alignedBeats = [];
  for (let i = 0; i < timed.length; i++) {
    const bStart = timed[i].rawStart;
    const nextStart = (i < timed.length - 1) ? timed[i + 1].rawStart : totalDuration;
    let bDur = Math.min(5.2, Math.max(1.8, nextStart - bStart));
    if (i === timed.length - 1) {
      bDur = Math.max(0.5, totalDuration - bStart);
    }
    alignedBeats.push({
      ...timed[i],
      start: bStart,
      duration: bDur
    });
  }

  return alignedBeats;
}

// MARK: - Procedural Contour & Media Fetch Engine
export function generateProceduralContourSvg(beat, idx) {
  const title = (beat.title || beat.eyebrow || 'HADAL BATHYMETRY').toUpperCase().replace(/["\\]/g, '');
  const sub = (beat.stat_pill || beat.taxonomy || 'ACOUSTIC DEPTH TELEMETRY // 11,000M').toUpperCase().replace(/["\\]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1160" width="100%" height="100%">
    <defs>
      <radialGradient id="contour-glow-${idx}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00F5D4" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#020813" stop-opacity="1"/>
      </radialGradient>
      <linearGradient id="scan-beam-${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="50%" stop-color="rgba(0,245,212,0.12)"/>
        <stop offset="100%" stop-color="transparent"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="#020813"/>
    <circle cx="540" cy="580" r="500" fill="url(#contour-glow-${idx})"/>
    <rect width="100%" height="100%" fill="url(#scan-beam-${idx})"/>
    <circle cx="540" cy="580" r="460" fill="none" stroke="rgba(0,245,212,0.15)" stroke-width="2" stroke-dasharray="12 8"/>
    <circle cx="540" cy="580" r="360" fill="none" stroke="rgba(0,245,212,0.22)" stroke-width="2"/>
    <circle cx="540" cy="580" r="240" fill="none" stroke="rgba(0,245,212,0.3)" stroke-width="2" stroke-dasharray="8 6"/>
    <circle cx="540" cy="580" r="120" fill="none" stroke="#00F5D4" stroke-width="2.5"/>
    <circle cx="540" cy="580" r="8" fill="#00F5D4"/>
    <line x1="40" y1="580" x2="1040" y2="580" stroke="rgba(0,245,212,0.2)" stroke-width="1.5"/>
    <line x1="540" y1="80" x2="540" y2="1080" stroke="rgba(0,245,212,0.2)" stroke-width="1.5"/>
    <text x="540" y="555" text-anchor="middle" font-family="ui-monospace, monospace" font-size="28" font-weight="900" fill="#00F5D4" letter-spacing="4">${title}</text>
    <text x="540" y="615" text-anchor="middle" font-family="ui-monospace, monospace" font-size="16" font-weight="700" fill="#94A3B8" letter-spacing="2">${sub}</text>
  </svg>`;
}

export async function fetchBeatMedia(beats, workDir, fallbackTopic = '') {
  emit(62, 'Media Curation', 'Curating authentic photographic specimens & bathymetric maps...');
  const mediaDir = path.join(workDir, 'assets/media');
  fs.mkdirSync(mediaDir, { recursive: true });

  const tasks = beats.map(async (b, idx) => {
    const destFile = path.join(mediaDir, `beat_${idx}.jpg`);
    b.media_file = `assets/media/beat_${idx}.jpg`;

    // Candidate search queries in order of precision:
    const queries = [];
    if (b.image_query) queries.push(b.image_query);
    if (b.title) queries.push(b.title);
    if (b.target) queries.push(b.target);
    
    // Also try simplified 1-2 words from query
    if (b.image_query && b.image_query.includes(' ')) {
      const words = b.image_query.split(' ').filter(w => w.length > 3);
      if (words.length > 0) queries.push(words.slice(0, 2).join(' '));
    }
    if (b.title && b.title.includes(' ')) {
      const words = b.title.split(' ').filter(w => w.length > 3);
      if (words.length > 0) queries.push(words.slice(0, 2).join(' '));
    }
    if (fallbackTopic) queries.push(fallbackTopic);

    let downloaded = false;
    for (const rawQ of queries) {
      if (!rawQ || typeof rawQ !== 'string') continue;
      const q = rawQ.replace(/["\\]/g, '').trim();
      if (q.length < 3) continue;
      if (/^(REVEALED|ALERT|CHAPTER|STEP|DECLASSIFIED|HEAD TO HEAD|CRITICAL)/i.test(q)) continue;

      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=4&prop=pageimages&format=json&pithumbsize=1080`;
        const res = await fetch(wikiUrl, {
          headers: { 'User-Agent': 'YouTubeStudioPro/1.0 (contact@youtubestudiopro.local)' }
        });
        if (!res.ok) continue;
        const data = await res.json();
        const pages = data.query?.pages || {};

        let candidateImgUrl = null;
        for (const pid of Object.keys(pages)) {
          const p = pages[pid];
          if (p.thumbnail?.source) {
            candidateImgUrl = p.thumbnail.source;
            break;
          }
        }

        if (candidateImgUrl) {
          const imgRes = await fetch(candidateImgUrl, {
            headers: { 'User-Agent': 'YouTubeStudioPro/1.0 (contact@youtubestudiopro.local)' }
          });
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            if (buf.length > 4000) {
              fs.writeFileSync(destFile, buf);
              b.has_media = true;
              downloaded = true;
              break;
            }
          }
        }
      } catch (err) {
        // Fallback to next query
      }
    }

    if (!downloaded) {
      const svgDest = path.join(mediaDir, `beat_${idx}.svg`);
      fs.writeFileSync(svgDest, generateProceduralContourSvg(b, idx));
      b.media_file = `assets/media/beat_${idx}.svg`;
      b.has_media = true;
    }
  });

  await Promise.all(tasks);
}

// MARK: - Step 4: HyperFrames Dynamic Project Builder
export async function buildHyperFramesProject(storyboard, words, totalDuration, workDir, options = {}) {
  emit(65, 'Composing', 'Building dynamic HyperFrames composition & animations...');

  // Resolve dynamic theme
  const theme = resolveTheme(options.theme, options.topic || storyboard.title, storyboard.theme);

  // Select and Copy BGM
  const bgmMood = (options.bgmMood && options.bgmMood !== 'auto') ? options.bgmMood : (storyboard.bgm_mood || 'lofi_chill');
  const targetBgm = path.join(workDir, 'assets/audio/bgm.mp3');
  let hasBgm = false;

  if (bgmMood !== 'none' && !options.noBgm) {
    const candidatePath = path.join(BGM_DIR, `${bgmMood}.mp3`);
    if (fs.existsSync(candidatePath)) {
      fs.copyFileSync(candidatePath, targetBgm);
      hasBgm = true;
    } else if (fs.existsSync(BGM_PATH)) {
      fs.copyFileSync(BGM_PATH, targetBgm);
      hasBgm = true;
    }
  }

  // Copy Avatar assets if enabled
  const targetAvatarDir = path.join(workDir, 'assets/avatar');
  fs.mkdirSync(targetAvatarDir, { recursive: true });
  if (options.avatar && fs.existsSync(AVATAR_DIR)) {
    for (const f of fs.readdirSync(AVATAR_DIR)) {
      if (f.endsWith('.png')) {
        fs.copyFileSync(path.join(AVATAR_DIR, f), path.join(targetAvatarDir, f));
      }
    }
  }

  // Copy Beat Transition SFX assets
  const SFX_DIR = path.join(AUDIO_DIR, 'sfx');
  const targetSfxDir = path.join(workDir, 'assets/audio/sfx');
  fs.mkdirSync(targetSfxDir, { recursive: true });
  if (fs.existsSync(SFX_DIR)) {
    for (const f of fs.readdirSync(SFX_DIR)) {
      if (f.endsWith('.mp3')) {
        fs.copyFileSync(path.join(SFX_DIR, f), path.join(targetSfxDir, f));
      }
    }
  }

  // Build hyperframes.json
  const config = {
    version: "1.0",
    id: "youtube-studio-dynamic",
    width: 1080,
    height: 1920,
    fps: 30,
    duration: totalDuration,
    compositions: {
      main: {
        width: 1080,
        height: 1920,
        duration: totalDuration,
        fps: 30
      }
    }
  };
  fs.writeFileSync(path.join(workDir, 'hyperframes.json'), JSON.stringify(config, null, 2));

  // Chunk Captions into 2-4 words per group
  const captionGroups = [];
  let currentGroup = [];
  let groupStart = 0;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (currentGroup.length === 0) groupStart = w.start;
    currentGroup.push(w);

    const wordStr = w.text || w.word || '';
    const isPunctuation = /[.,!?;:]$/.test(wordStr);
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

  // Generate Captions Markup & GSAP
  let captionsHtml = '';
  let captionsGsap = '';
  captionGroups.forEach((g, gIdx) => {
    const wordSpans = g.words.map((w, wIdx) => {
      const txt = w.text || w.word || '';
      return `<span id="cw-${gIdx}-${wIdx}" class="caption-word">${txt}</span>`;
    }).join(' ');

    captionsHtml += `
      <div id="${g.id}" class="caption-group clip" data-start="${g.start.toFixed(2)}" data-duration="${(g.end - g.start).toFixed(2)}">
        ${wordSpans}
      </div>`;

    g.words.forEach((w, wIdx) => {
      const wordId = `#cw-${gIdx}-${wIdx}`;
      captionsGsap += `
  tl.set("${wordId}", { color: "${theme.caption_highlight}", scale: 1.15, textShadow: "0 0 25px ${theme.accent_primary}" }, ${w.start.toFixed(2)});
  tl.set("${wordId}", { color: "#FFFFFF", scale: 1.0, textShadow: "none" }, ${w.end.toFixed(2)});`;
    });
  });

  const topicName = options.topic || storyboard.title || '';
  const isTech = isTechnicalTopic(topicName);

  // Technical Explainer Guard: Strictly forbid slide deck / bullet presentation archetypes
  const TECH_ALLOWED = ['code_workbench', 'architecture_diagram', 'code_snippet', 'terminal_execution', 'system_flow', 'mechanism_inspect'];
  
  const rawBeats = (storyboard.beats && storyboard.beats.length > 0) ? storyboard.beats : [
    isTech ? { type: 'code_workbench', eyebrow: 'DECLARATIVE ARCHITECTURE', filename: 'deployment.yaml' }
           : { type: 'cinematic_specimen', eyebrow: 'DOCUMENTARY SPECIMEN', title: 'ABYSSAL ANOMALY', image_query: topicName }
  ];

  const sanitizedBeats = rawBeats.map((b, idx) => {
    let type = b.type || (isTech ? (idx === 0 ? 'code_workbench' : 'architecture_diagram') : 'cinematic_specimen');
    // Forbid legacy radar circle widget: map to full-stage depth telemetry gauge
    if (type === 'sonar_scan') {
      type = 'depth_meter';
    }
    if (isTech) {
      if (!TECH_ALLOWED.includes(type)) {
        // Map non-tech or presentation archetypes to rich developer visual components
        if (idx === 0) type = 'code_workbench';
        else if (idx === 1) type = 'architecture_diagram';
        else if (idx % 4 === 0) type = 'terminal_execution';
        else if (idx % 4 === 1) type = 'code_snippet';
        else if (idx % 4 === 2) type = 'system_flow';
        else type = 'mechanism_inspect';
      }
    } else {
      // Documentary / General: strictly ban slide boxes and presentation bullet cards
      const DOC_ALLOWED = ['cinematic_specimen', 'telemetry_inspection', 'scale_comparison', 'dossier_investigation', 'depth_meter'];
      if (!DOC_ALLOWED.includes(type)) {
        if (type === 'split_contrast') type = 'scale_comparison';
        else if (type === 'roadmap_checklist' || type === 'classified_dossier') type = 'dossier_investigation';
        else if (type === 'data_grid' || type === 'stat_hero') type = 'telemetry_inspection';
        else type = 'cinematic_specimen';
      }
    }
    return { ...b, type };
  });

  // Fetch authentic documentary photography/maps for non-technical topics
  if (!isTech) {
    await fetchBeatMedia(sanitizedBeats, workDir, topicName);
  }

  // Align beats with exact speech timestamps
  const alignedBeats = alignBeatsToTranscript(sanitizedBeats, words, totalDuration);

  // Transition choreographies
  const TRANSITION_STYLES = ['snap_punch', 'whip_right', 'slam_drop', 'split_duel', 'whip_left', 'stagger_rise', 'pop_bounce', 'finale_slam'];

  let beatsHtml = '';
  let beatsGsap = '';
  let sfxHtml = '';

  alignedBeats.forEach((b, idx) => {
    const bStart = b.start;
    const bDur = b.duration;
    const beatId = `beat-${idx}`;
    const cardId = `card-${idx}`;
    const bType = b.type || (isTech ? 'code_workbench' : 'cinematic_specimen');
    const animMode = TRANSITION_STYLES[idx % TRANSITION_STYLES.length];

    // Select punchy contextual SFX for transition beat
    let sfxFile = 'click.mp3';
    if (bType === 'code_workbench' || bType === 'code_snippet' || bType === 'terminal_execution') {
      sfxFile = 'typing.mp3';
    } else if (bType === 'cinematic_specimen' || bType === 'dossier_investigation' || bType === 'stat_hero' || bType === 'mechanism_inspect' || bType === 'kinetic_slam') {
      sfxFile = 'impact.mp3';
    } else if (bType === 'architecture_diagram' || bType === 'system_flow' || bType === 'depth_meter' || bType === 'telemetry_inspection' || bType === 'scale_comparison' || bType === 'split_contrast') {
      sfxFile = 'whoosh.mp3';
    } else {
      sfxFile = 'click.mp3';
    }
    sfxHtml += `    <audio id="sfx-${idx}" class="clip" data-start="${bStart.toFixed(2)}" data-duration="0.75" data-volume="0.55" src="assets/audio/sfx/${sfxFile}"></audio>\n`;

    let cardContent = '';

    if (bType === 'code_workbench') {
      const files = b.files || ["deployment.yaml", "service.yaml", "ingress.yaml"];
      const activeFile = b.filename || files[0] || "deployment.yaml";
      const fileTabs = files.slice(0, 3).map((f) => `
        <div class="editor-tab ${f === activeFile ? 'active' : ''}">📄 ${f}</div>
      `).join('');
      const fileTreeItems = files.map((f) => `
        <div class="tree-item ${f === activeFile ? 'active' : ''}">📄 ${f}</div>
      `).join('');

      const lines = (b.lines || [
        { num: "01", text: "apiVersion: apps/v1" },
        { num: "02", text: "kind: Deployment" },
        { num: "03", text: "metadata:" },
        { num: "04", text: "  name: web-api" },
        { num: "05", text: "spec:" },
        { num: "06", text: "  replicas: 3", highlight: true, note: "Desired State" },
        { num: "07", text: "  selector: { matchLabels: { app: api } }" },
        { num: "08", text: "  template:" },
        { num: "09", text: "    spec: containers: [{ name: server, image: nginx:alpine }]" }
      ]).map(l => {
        const isHl = l.highlight || l.num === String(b.highlight_line || 6).padStart(2, '0');
        const note = l.note ? `<span class="c-note"># ${l.note}</span>` : '';
        const raw = l.text || '';
        let textHtml = raw;
        if (raw.includes(':')) {
          const parts = raw.split(':');
          textHtml = `<span class="c-key">${parts[0]}:</span><span class="c-val">${parts.slice(1).join(':')}</span>`;
        }
        return `<div class="c-line ${isHl ? 'highlight' : ''}"><span class="c-num">${l.num || '01'}</span><span>${textHtml}</span>${note}</div>`;
      }).join('');

      const outputs = (b.outputs || [
        { name: "web-api-7b8c-1", ready: "1/1", status: "Running", ip: "10.244.1.4" },
        { name: "web-api-7b8c-2", ready: "1/1", status: "Running", ip: "10.244.2.8" },
        { name: "web-api-7b8c-3", ready: "1/1", status: "Running", ip: "10.244.1.9" }
      ]).map(o => `
        <div class="term-out-row">
          <span>${o.name || o.text || 'pod-item'}</span>
          <span style="color:#00F5A0">● ${o.status || 'Running'}</span>
          <span>${o.ip || o.ready || '1/1'}</span>
        </div>
      `).join('');

      cardContent = `
        <div class="card-ide-workbench">
          <div class="ide-titlebar">
            <div class="traffic-lights">
              <span class="red"></span>
              <span class="yellow"></span>
              <span class="green"></span>
            </div>
            <div class="ide-window-title">${activeFile} — visual-studio-code</div>
            <div class="ide-branch-badge">⎇ cluster-main</div>
          </div>
          <div class="ide-main-row">
            <div class="ide-activity-bar">
              <svg class="activity-icon active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
              <svg class="activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 21-5.2-5.2M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/></svg>
              <svg class="activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18m0-18 6 6m-6-6L6 9m6 12 6-6m-6 6-6-6"/></svg>
            </div>
            <div class="ide-sidebar">
              <div class="sidebar-section">Explorer</div>
              <div class="file-tree">${fileTreeItems}</div>
            </div>
            <div class="ide-editor-viewport">
              <div class="editor-tabs">${fileTabs}</div>
              <div class="code-canvas">${lines}</div>
              <div class="ide-terminal-drawer">
                <div class="term-drawer-header">
                  <span class="term-tab">TERMINAL</span>
                  <span class="term-status-badge">zsh · k8s-v1.30</span>
                </div>
                <div class="term-drawer-body">
                  <div class="term-prompt-row">
                    <span class="t-user">admin@k8s:~$</span>
                    <span class="t-cmd">${b.command || 'kubectl apply -f ' + activeFile + ' && kubectl get pods'}</span>
                    <span class="t-cursor">█</span>
                  </div>
                  <div class="term-output-grid">${outputs}</div>
                  <div>
                    <span class="term-pill-ok">✓ ${b.success_message || 'Replicas Synchronized & Running'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="ide-statusbar">
            <div class="stat-item active"><span>⎇ main</span><span>● 0 errors</span></div>
            <div class="stat-item"><span>Ln ${b.highlight_line || 6}, Col 15</span><span>Spaces: 2</span><span>UTF-8</span><span>${(b.language || 'YAML').toUpperCase()}</span></div>
          </div>
        </div>`;
    } else if (bType === 'architecture_diagram') {
      const cp = b.control_plane || { title: 'CONTROL PLANE (MASTER)', components: [{ name: 'API Server', role: 'Cluster Gateway & REST API' }, { name: 'etcd', role: 'Distributed State Store' }, { name: 'Kube-Scheduler', role: 'Pod Placement Engine' }, { name: 'Controller Mgr', role: 'State Reconciliation Loop' }] };
      const comps = (cp.components || []).map(c => `
        <div class="arch-comp-chip">
          <div class="comp-name">${c.name}</div>
          <div class="comp-role">${c.role || ''}</div>
        </div>
      `).join('');

      const workers = (b.worker_nodes || [
        { node_name: "Worker Node 01", pods: ["web-api-a", "web-api-b"] },
        { node_name: "Worker Node 02", pods: ["web-api-c", "db-pod-d"] }
      ]).map(w => {
        const pods = (w.pods || ['active-pod']).map(p => `
          <div class="pod-chip"><span class="pod-dot"></span>${p}</div>
        `).join('');
        return `
          <div class="worker-node-card">
            <div class="worker-node-name">${w.node_name || 'Worker Node'}</div>
            <div class="worker-pods-wrap">${pods}</div>
          </div>
        `;
      }).join('');

      cardContent = `
        <div class="card-arch-diagram">
          <div class="arch-header">
            <span class="badge-pill">${b.eyebrow || 'CLUSTER ARCHITECTURE'}</span>
            <div class="arch-title">${b.title || 'Control Plane & Worker Nodes'}</div>
          </div>
          <div class="arch-plane">
            <div class="plane-label"><span class="plane-indicator"></span>${cp.title || 'CONTROL PLANE (MASTER)'}</div>
            <div class="plane-components">${comps}</div>
          </div>
          <div class="arch-connector-flow">
            <svg class="connector-svg" viewBox="0 0 800 35">
              <line x1="200" y1="5" x2="200" y2="30" stroke="var(--accent-primary)" stroke-width="2" stroke-dasharray="4 4" />
              <line x1="600" y1="5" x2="600" y2="30" stroke="var(--accent-primary)" stroke-width="2" stroke-dasharray="4 4" />
            </svg>
            <div class="connector-label">${b.flow_label || 'Bi-directional TLS Telemetry & Scheduling'}</div>
          </div>
          <div class="arch-plane">
            <div class="plane-label"><span class="plane-indicator"></span>WORKER NODES (DATA PLANE)</div>
            <div class="worker-nodes-grid">${workers}</div>
          </div>
        </div>`;
    } else if (bType === 'code_snippet') {
      const lines = (b.lines || [
        { num: "01", text: "apiVersion: apps/v1" },
        { num: "02", text: "kind: Deployment" },
        { num: "03", text: "metadata:" },
        { num: "04", text: "  name: web-api" },
        { num: "05", text: "spec:" },
        { num: "06", text: "  replicas: 3", highlight: true, note: "Desired state: 3 Pods" },
        { num: "07", text: "  template:" },
        { num: "08", text: "    spec: containers: [{name: api, image: app:v2}]" }
      ]).map(l => {
        const isHl = l.highlight || (b.highlight_line && parseInt(l.num) === b.highlight_line);
        let textHtml = l.text;
        if (textHtml.includes(':')) {
          const parts = textHtml.split(':');
          textHtml = `<span class="line-key">${parts[0]}:</span><span class="line-val">${parts.slice(1).join(':')}</span>`;
        }
        return `
          <div class="code-line ${isHl ? 'highlight' : ''}">
            <span class="line-num">${l.num || ''}</span>
            <span class="line-text">${textHtml}</span>
            ${l.note ? `<span class="line-note"># ${l.note}</span>` : ''}
          </div>
        `;
      }).join('');

      cardContent = `
        <div class="card-code-editor">
          <div class="editor-titlebar">
            <div class="editor-traffic-lights">
              <span class="red"></span><span class="yellow"></span><span class="green"></span>
            </div>
            <div class="editor-tab">
              <span class="tab-icon">📄</span>
              <span class="tab-name">${b.filename || 'manifest.yaml'}</span>
            </div>
            <div class="editor-lang-badge">${(b.language || 'YAML').toUpperCase()}</div>
          </div>
          <div class="editor-body">
            <div class="code-lines-container">${lines}</div>
          </div>
        </div>`;
    } else if (bType === 'terminal_execution') {
      const outputs = (b.outputs || [
        { type: "info", text: "deployment.apps/web-api created" },
        { type: "header", text: "NAME         READY   STATUS    RESTARTS   AGE" },
        { type: "row", name: "web-api-1", ready: "1/1", status: "Running", ip: "10.244.0.12" },
        { type: "row", name: "web-api-2", ready: "1/1", status: "Running", ip: "10.244.1.4" },
        { type: "row", name: "web-api-3", ready: "1/1", status: "Running", ip: "10.244.2.8" },
        { type: "success", text: "✓ 3/3 Replicas Healthy & Distributed" }
      ]).map(o => {
        if (o.type === 'row') {
          return `
            <div class="term-row">
              <span class="term-pod-name">${o.name || ''}</span>
              <span class="term-pod-ready">${o.ready || '1/1'}</span>
              <span class="term-status-running"><span class="pod-dot"></span>${o.status || 'Running'}</span>
              <span class="term-pod-ip">${o.ip || ''}</span>
            </div>
          `;
        } else if (o.type === 'success') {
          return `<div class="term-success-pill">${o.text || '✓ 3/3 Replicas Healthy'}</div>`;
        } else if (o.type === 'header') {
          return `<div class="term-header-line">${o.text || ''}</div>`;
        } else {
          return `<div class="term-info-line">${o.text || ''}</div>`;
        }
      }).join('');

      cardContent = `
        <div class="card-terminal">
          <div class="terminal-titlebar">
            <div class="editor-traffic-lights">
              <span class="red"></span><span class="yellow"></span><span class="green"></span>
            </div>
            <div class="terminal-title">bash — 80×24</div>
            <div class="terminal-env-badge">PROD CLUSTER</div>
          </div>
          <div class="terminal-body">
            <div class="terminal-prompt-line">
              <span class="term-user">admin@cluster</span><span class="term-colon">:</span><span class="term-path">~</span><span class="term-dollar">$</span>
              <span class="term-cmd">${b.command || 'kubectl get pods'}</span>
              <span class="term-cursor">█</span>
            </div>
            <div class="terminal-outputs">${outputs}</div>
          </div>
        </div>`;
    } else if (bType === 'system_flow') {
      const steps = (b.steps || [
        { step: "01", name: "Client Request", desc: "HTTPS Traffic arrives at Cluster IP", badge: "INGRESS" },
        { step: "02", name: "Ingress Controller", desc: "TLS termination and URL path routing", badge: "ROUTING" },
        { step: "03", name: "Kube-Proxy", desc: "IPtables load balancing across pods", badge: "SERVICE" },
        { step: "04", name: "Target Pod", desc: "Container handles request & returns JSON", badge: "APP" }
      ]).map(s => `
        <div class="flow-step-item flow-step-${idx}">
          <div class="step-num-pill">${s.step || '01'}</div>
          <div class="step-content">
            <div class="step-top">
              <div class="step-name">${s.name || ''}</div>
              ${s.badge ? `<div class="step-badge">${s.badge}</div>` : ''}
            </div>
            <div class="step-desc">${s.desc || ''}</div>
          </div>
        </div>
      `).join('');

      cardContent = `
        <div class="card-system-flow">
          <div class="flow-header">
            <span class="badge-pill">${b.eyebrow || 'REQUEST LIFECYCLE'}</span>
            <div class="flow-title">${b.title || 'From Ingress to Container'}</div>
          </div>
          <div class="flow-steps-rail">${steps}</div>
        </div>`;
    } else if (bType === 'mechanism_inspect') {
      cardContent = `
        <div class="card-mechanism">
          <div class="mechanism-header">
            <span class="badge-pill">${b.eyebrow || 'RECONCILIATION LOOP'}</span>
            <div class="mechanism-title">${b.title || 'Continuous State Convergence'}</div>
          </div>
          <div class="mechanism-stages">
            <div class="stage-card desired">
              <div class="stage-tag">DESIRED STATE</div>
              <div class="stage-val">${b.desired_state || '3 Replicas Required'}</div>
            </div>
            <div class="stage-vs-arrow">⚡ VS</div>
            <div class="stage-card actual">
              <div class="stage-tag">DETECTED ANOMALY</div>
              <div class="stage-val">${b.detected_event || 'Pod Died (OOM)'}</div>
            </div>
          </div>
          <div class="mechanism-action-box">
            <div class="action-tag">CONTROLLER RECONCILIATION</div>
            <div class="action-desc">${b.controller_action || 'Controller schedules replacement pod immediately'}</div>
          </div>
          <div class="mechanism-result-pill">
            <span class="check-dot">✓</span> ${b.final_state || 'Cluster restored to 3/3 in 120ms'}
          </div>
        </div>`;
    } else if (bType === 'cinematic_specimen') {
      const mediaSrc = b.media_file || `assets/media/beat_${idx}.jpg`;
      cardContent = `
        <div class="doc-viewport specimen-viewport">
          <div class="doc-media-stage">
            <img id="media-img-${idx}" class="doc-media-img" src="${mediaSrc}" alt="${b.title || 'Specimen'}" />
            <div class="doc-gradient-top"></div>
            <div class="doc-gradient-bottom"></div>
            <div class="doc-vignette-radial"></div>
            <div class="doc-reticle-crosshair">
              <div class="reticle-ring"></div>
              <div class="reticle-dot"></div>
              <div class="reticle-line-h"></div>
              <div class="reticle-line-v"></div>
              <span class="reticle-tag">SPECIMEN LOCK // 0${idx + 1}</span>
            </div>
          </div>
          <div class="doc-hud-brackets">
            <span class="bracket b-tl"></span>
            <span class="bracket b-tr"></span>
            <span class="bracket b-bl"></span>
            <span class="bracket b-br"></span>
          </div>
          <div class="doc-content-overlay">
            <div class="doc-eyebrow-pill"><span class="sonar-beacon"></span>${b.eyebrow || 'DEEP SEA SPECIMEN'}</div>
            <h2 class="doc-headline">${b.title || 'UNIDENTIFIED SPECIMEN'}</h2>
            ${b.taxonomy ? `<div class="doc-taxonomy-badge">🧬 ${b.taxonomy}</div>` : ''}
            <div class="doc-punchline-dock">
              ${b.stat_pill ? `<div class="doc-stat-pill">${b.stat_pill}</div>` : ''}
              <div class="doc-punchline-text">"${b.punchline || b.takeaway || 'Living in complete darkness under crushing pressure.'}"</div>
            </div>
          </div>
        </div>`;
    } else if (bType === 'telemetry_inspection') {
      const mediaSrc = b.media_file || `assets/media/beat_${idx}.jpg`;
      const telemetry = b.telemetry || [
        { label: "TARGET DEPTH", value: b.depth || b.number || "10,984m" },
        { label: "HYDROSTATIC PRESSURE", value: b.pressure || "1,086 ATM" },
        { label: "SOLAR PENETRATION", value: "0.00%" }
      ];
      const metricsHtml = telemetry.map(m => `
        <div class="telemetry-chip">
          <div class="tc-val">${m.value}</div>
          <div class="tc-lbl">${m.label}</div>
        </div>
      `).join('');

      cardContent = `
        <div class="doc-viewport telemetry-viewport">
          <div class="doc-media-stage">
            <img id="media-img-${idx}" class="doc-media-img" src="${mediaSrc}" alt="${b.title || 'Bathymetry'}" />
            <div class="doc-gradient-top"></div>
            <div class="doc-gradient-bottom"></div>
            <div class="doc-vignette-radial"></div>
            <div class="doc-scanline-sweep"></div>
          </div>
          <div class="doc-hud-brackets">
            <span class="bracket b-tl"></span>
            <span class="bracket b-tr"></span>
            <span class="bracket b-bl"></span>
            <span class="bracket b-br"></span>
          </div>
          <div class="doc-content-overlay">
            <div class="telemetry-top-bar">
              <div class="doc-eyebrow-pill"><span class="sonar-beacon"></span>${b.eyebrow || 'HADAL BATHYMETRY'}</div>
              <div class="telemetry-coords">📍 ${b.coordinates || '11°21′N 142°12′E'}</div>
            </div>
            <h2 class="doc-headline">${b.title || 'MARIANA TRENCH CHASM'}</h2>
            <div class="telemetry-metrics-grid">
              ${metricsHtml}
            </div>
            ${b.alert ? `
              <div class="doc-danger-alert">
                <span class="alert-icon">⚠️</span>
                <span class="alert-msg">${b.alert}</span>
              </div>` : ''}
          </div>
        </div>`;
    } else if (bType === 'scale_comparison') {
      const mediaSrc = b.media_file || `assets/media/beat_${idx}.jpg`;
      cardContent = `
        <div class="doc-viewport scale-viewport">
          <div class="doc-media-stage">
            <img id="media-img-${idx}" class="doc-media-img" src="${mediaSrc}" alt="${b.title || 'Scale'}" />
            <div class="doc-gradient-top"></div>
            <div class="doc-gradient-bottom"></div>
            <div class="doc-vignette-radial"></div>
          </div>
          <div class="doc-hud-brackets">
            <span class="bracket b-tl"></span>
            <span class="bracket b-tr"></span>
            <span class="bracket b-bl"></span>
            <span class="bracket b-br"></span>
          </div>
          <div class="doc-content-overlay">
            <div class="doc-eyebrow-pill"><span class="sonar-beacon"></span>${b.eyebrow || 'EXTREME GIGANTISM'}</div>
            <h2 class="doc-headline">${b.title || 'SCALE COMPARISON'}</h2>
            <div class="scale-dimension-bar">
              <div class="dimension-line">
                <span class="dim-arrow">◄</span>
                <span class="dim-label">${b.subject_scale || b.right_title || '14 METERS (BUS-SIZED)'}</span>
                <span class="dim-arrow">►</span>
              </div>
            </div>
            <div class="scale-vs-row">
              <div class="scale-chip subject">
                <div class="sc-tag">SPECIMEN SCALE</div>
                <div class="sc-val">${b.subject_scale || '14 METERS'}</div>
              </div>
              <div class="scale-vs-badge">VS</div>
              <div class="scale-chip human">
                <div class="sc-tag">HUMAN DIVER</div>
                <div class="sc-val">${b.comparison_scale || '1.8 METERS'}</div>
              </div>
            </div>
            <div class="scale-takeaway-dock">
              💡 ${b.takeaway || b.right_text || 'Abyssal gigantism allows survival under crushing pressure.'}
            </div>
          </div>
        </div>`;
    } else if (bType === 'dossier_investigation') {
      const mediaSrc = b.media_file || `assets/media/beat_${idx}.jpg`;
      cardContent = `
        <div class="doc-viewport dossier-viewport">
          <div class="dossier-docket-container">
            <div class="dossier-topbar">
              <div class="dossier-badge-pill"><span class="warning-beacon"></span>${b.badge || 'DECLASSIFIED EXPEDITION LOG'}</div>
              <div class="dossier-id">CASE #${idx + 104}-CLASSIFIED</div>
            </div>
            <div class="dossier-photo-viewport">
              <img id="media-img-${idx}" class="dossier-evidence-photo" src="${mediaSrc}" alt="Evidence" />
              <div class="photo-tape-tl"></div>
              <div class="photo-tape-tr"></div>
              <div class="dossier-red-stamp">${b.stamp || 'TOP SECRET // DECLASSIFIED'}</div>
            </div>
            <div class="dossier-docket-footer">
              <h3 class="dossier-title">${b.title || 'UNIDENTIFIED HADAL SPECIMEN'}</h3>
              ${b.location ? `<div class="dossier-location-tag">📍 LOCATION: ${b.location}</div>` : ''}
              <div class="dossier-observation-box">
                <span class="dossier-bullet-text">${b.observation || b.bullet || (b.bullets ? b.bullets[0] : (b.items ? b.items[0] : 'Crushing hydrostatic pressure verified.'))}</span>
                <div class="dossier-redact-wipe"></div>
              </div>
            </div>
          </div>
        </div>`;
    } else if (bType === 'depth_meter' || bType === 'sonar_scan') {
      const mediaSrc = b.media_file || `assets/media/beat_${idx}.jpg`;
      const targetName = b.target || b.title || 'CHALLENGER DEEP';
      const depthVal = b.depth || '10,984m';
      const pressureVal = b.pressure || '1,086 ATM';
      const tempVal = b.temp || '1.2°C';
      const alertVal = b.alert || b.finding || 'Crushing Pressure: Instant implosion zone for unhulled vessels';
      const eyebrowVal = b.eyebrow || 'ABYSSAL TELEMETRY';

      cardContent = `
        <div class="doc-viewport depth-viewport">
          <div class="doc-media-stage">
            <img id="media-img-${idx}" class="doc-media-img" src="${mediaSrc}" alt="${targetName}" />
            <div class="doc-gradient-top"></div>
            <div class="doc-gradient-bottom"></div>
            <div class="doc-vignette-radial"></div>
          </div>
          <div class="stage-depth-meter-hud">
            <div class="depth-hud-topbar">
              <div class="depth-pill-status"><span class="sonar-beacon"></span>${eyebrowVal}</div>
              <div class="depth-location-title">${targetName}</div>
            </div>
            <div class="depth-hud-body">
              <div class="depth-scale-ruler">
                <div class="depth-zone-marker z-sunlight"><span class="zm-m">0m</span><span class="zm-lbl">Sunlight Zone</span></div>
                <div class="depth-zone-marker z-twilight"><span class="zm-m">200m</span><span class="zm-lbl">Twilight Zone</span></div>
                <div class="depth-zone-marker z-midnight"><span class="zm-m">1,000m</span><span class="zm-lbl">Midnight Zone</span></div>
                <div class="depth-zone-marker z-abyss"><span class="zm-m">4,000m</span><span class="zm-lbl">Abyssal Plain</span></div>
                <div class="depth-zone-marker z-hadal active"><span class="zm-m">11,000m</span><span class="zm-lbl">Hadal Trenches</span><div class="hadal-probe-tag">▼ HADAL CRUSH DEPTH</div></div>
              </div>
              <div class="depth-telemetry-panel">
                <div class="depth-readout-card">
                  <div class="d-tag">TARGET DEPTH</div>
                  <div class="d-hero-num">${depthVal}</div>
                  <div class="d-sub-text">Beyond reach of all solar photons</div>
                </div>
                <div class="depth-stats-grid">
                  <div class="d-stat-box">
                    <div class="dsb-tag">CRUSH PRESSURE</div>
                    <div class="dsb-val">${pressureVal}</div>
                    <div class="dsb-note">8 Tons / Sq Inch</div>
                  </div>
                  <div class="d-stat-box">
                    <div class="dsb-tag">WATER TEMP</div>
                    <div class="dsb-val">${tempVal}</div>
                    <div class="dsb-note">Near Freezing</div>
                  </div>
                </div>
                <div class="depth-danger-alert">
                  <span class="dda-icon">⚠️</span>
                  <span class="dda-text">${alertVal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    } else {
      // Default: cinematic_specimen with media
      const mediaSrc = b.media_file || `assets/media/beat_${idx}.jpg`;
      cardContent = `
        <div class="doc-viewport specimen-viewport">
          <div class="doc-media-stage">
            <img id="media-img-${idx}" class="doc-media-img" src="${mediaSrc}" alt="${b.title || 'Discovery'}" />
            <div class="doc-gradient-top"></div>
            <div class="doc-gradient-bottom"></div>
            <div class="doc-vignette-radial"></div>
          </div>
          <div class="doc-hud-brackets">
            <span class="bracket b-tl"></span>
            <span class="bracket b-tr"></span>
            <span class="bracket b-bl"></span>
            <span class="bracket b-br"></span>
          </div>
          <div class="doc-content-overlay">
            <div class="doc-eyebrow-pill"><span class="sonar-beacon"></span>${b.eyebrow || 'CRITICAL REVEAL'}</div>
            <h2 class="doc-headline">${b.title || b.headline || 'UNVEILED PHENOMENON'}</h2>
            <div class="doc-punchline-dock">
              <div class="doc-punchline-text">"${b.punchline || b.highlight_word || 'Documented deep sea record.'}"</div>
            </div>
          </div>
        </div>`;
    }

    beatsHtml += `
      <div id="${beatId}" class="beat-wrapper clip" data-start="${bStart.toFixed(2)}" data-duration="${bDur.toFixed(2)}">
        <div id="${cardId}" class="beat-card beat-type-${bType}">
          ${cardContent}
        </div>
      </div>`;

    // Choreographed GSAP Motion per Archetype & Transition Style
    const exitTime = Math.max(bStart + 0.5, bStart + bDur - 0.28).toFixed(2);
    const tagText = (b.eyebrow || b.title || 'CHAPTER').toUpperCase().replace(/["\\]/g, '');

    beatsGsap += `
  // Beat ${idx} [${bType}] @ ${bStart.toFixed(2)}s
  tl.fromTo("#flash-overlay", { opacity: 0.22 }, { opacity: 0, duration: 0.16, ease: "power2.out", immediateRender: false }, ${bStart.toFixed(2)});
  tl.call(() => {
    const el = document.getElementById('stage-tag');
    if (el) el.innerText = "${tagText}";
  }, null, ${bStart.toFixed(2)});`;

    if (bType === 'code_workbench') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.94, y: 25 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.2)" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .c-line", { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.25, stagger: 0.04, ease: "power2.out" }, ${(bStart + 0.12).toFixed(2)});
  tl.fromTo("#${cardId} .c-line.highlight", { backgroundColor: "rgba(0, 245, 160, 0.0)" }, { backgroundColor: "rgba(0, 245, 160, 0.2)", duration: 0.5, ease: "power2.inOut" }, ${(bStart + 0.35).toFixed(2)});
  tl.fromTo("#${cardId} .ide-terminal-drawer", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, ${(bStart + 0.3).toFixed(2)});
  tl.fromTo("#${cardId} .term-out-row", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.2, stagger: 0.06, ease: "power2.out" }, ${(bStart + 0.5).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.95, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'architecture_diagram') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.92, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.2)" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .arch-comp-chip", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, stagger: 0.08, ease: "back.out(1.4)" }, ${(bStart + 0.15).toFixed(2)});
  tl.fromTo("#${cardId} .worker-node-card", { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.12, ease: "power2.out" }, ${(bStart + 0.25).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.95, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'code_snippet') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, y: 35 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .code-line", { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.25, stagger: 0.04, ease: "power2.out" }, ${(bStart + 0.12).toFixed(2)});
  tl.fromTo("#${cardId} .code-line.highlight", { backgroundColor: "rgba(0, 245, 160, 0.0)" }, { backgroundColor: "rgba(0, 245, 160, 0.18)", duration: 0.5, ease: "power2.inOut" }, ${(bStart + 0.35).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, y: -25, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'terminal_execution') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.2)" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .term-cmd", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "steps(10)" }, ${(bStart + 0.15).toFixed(2)});
  tl.fromTo("#${cardId} .term-row, #${cardId} .term-info-line, #${cardId} .term-header-line", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.08, ease: "power2.out" }, ${(bStart + 0.3).toFixed(2)});
  tl.fromTo("#${cardId} .term-success-pill", { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.5)" }, ${(bStart + 0.6).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.95, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'system_flow') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${bStart.toFixed(2)});
  tl.fromTo(".flow-step-${idx}", { x: -35, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, stagger: 0.14, ease: "power2.out" }, ${(bStart + 0.12).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, y: -25, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'mechanism_inspect') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.2)" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .stage-card.desired", { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, ${(bStart + 0.12).toFixed(2)});
  tl.fromTo("#${cardId} .stage-card.actual", { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, ${(bStart + 0.2).toFixed(2)});
  tl.fromTo("#${cardId} .mechanism-action-box", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, ${(bStart + 0.32).toFixed(2)});
  tl.fromTo("#${cardId} .mechanism-result-pill", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.5)" }, ${(bStart + 0.45).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.95, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'cinematic_specimen') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, ${bStart.toFixed(2)});
  tl.fromTo("#media-img-${idx}", { scale: 1.0 }, { scale: 1.15, duration: ${bDur.toFixed(2)}, ease: "none" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .bracket", { scale: 1.4, opacity: 0 }, { scale: 1, opacity: 0.85, duration: 0.35, ease: "power2.out" }, ${(bStart + 0.08).toFixed(2)});
  tl.fromTo("#${cardId} .doc-reticle-crosshair", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 0.85, duration: 0.4, ease: "back.out(1.5)" }, ${(bStart + 0.15).toFixed(2)});
  tl.fromTo("#${cardId} .doc-headline", { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" }, ${(bStart + 0.2).toFixed(2)});
  tl.fromTo("#${cardId} .doc-punchline-dock", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(1.2)" }, ${(bStart + 0.35).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.96, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'telemetry_inspection') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, ${bStart.toFixed(2)});
  tl.fromTo("#media-img-${idx}", { scale: 1.0 }, { scale: 1.12, duration: ${bDur.toFixed(2)}, ease: "none" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .doc-scanline-sweep", { y: 0, opacity: 0.9 }, { y: 1160, opacity: 0.2, duration: ${bDur.toFixed(2)}, ease: "none" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .telemetry-chip", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, stagger: 0.08, ease: "back.out(1.4)" }, ${(bStart + 0.2).toFixed(2)});
  tl.fromTo("#${cardId} .doc-danger-alert", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.5)" }, ${(bStart + 0.4).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.96, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'scale_comparison') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, ${bStart.toFixed(2)});
  tl.fromTo("#media-img-${idx}", { scale: 1.0 }, { scale: 1.12, duration: ${bDur.toFixed(2)}, ease: "none" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .scale-chip.subject", { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.38, ease: "power2.out" }, ${(bStart + 0.15).toFixed(2)});
  tl.fromTo("#${cardId} .scale-chip.human", { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.38, ease: "power2.out" }, ${(bStart + 0.22).toFixed(2)});
  tl.fromTo("#${cardId} .scale-vs-badge", { scale: 2.2, opacity: 0, rotation: -20 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.35, ease: "back.out(2)" }, ${(bStart + 0.28).toFixed(2)});
  tl.fromTo("#${cardId} .scale-takeaway-dock", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power2.out" }, ${(bStart + 0.4).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.96, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'dossier_investigation') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, ${bStart.toFixed(2)});
  tl.fromTo("#media-img-${idx}", { scale: 1.0 }, { scale: 1.14, duration: ${bDur.toFixed(2)}, ease: "none" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .dossier-red-stamp", { scale: 2.2, opacity: 0, rotation: -25 }, { scale: 1, opacity: 1, rotation: -8, duration: 0.35, ease: "back.out(1.8)" }, ${(bStart + 0.35).toFixed(2)});
  tl.fromTo("#${cardId} .dossier-redact-wipe", { scaleX: 1, transformOrigin: "right center" }, { scaleX: 0, duration: 0.55, ease: "power2.inOut" }, ${(bStart + 0.5).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, y: -25, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else if (bType === 'depth_meter' || bType === 'sonar_scan') {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, ${bStart.toFixed(2)});
  tl.fromTo("#media-img-${idx}", { scale: 1.0 }, { scale: 1.12, duration: ${bDur.toFixed(2)}, ease: "none" }, ${bStart.toFixed(2)});
  tl.fromTo("#${cardId} .depth-zone-marker", { x: -25, opacity: 0 }, { x: 0, opacity: 1, duration: 0.22, stagger: 0.06, ease: "power2.out" }, ${(bStart + 0.1).toFixed(2)});
  tl.fromTo("#${cardId} .d-hero-num", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.38, ease: "back.out(1.4)" }, ${(bStart + 0.25).toFixed(2)});
  tl.fromTo("#${cardId} .d-stat-box", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, stagger: 0.08, ease: "power2.out" }, ${(bStart + 0.35).toFixed(2)});
  tl.fromTo("#${cardId} .depth-danger-alert", { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }, ${(bStart + 0.45).toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.96, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    } else {
      beatsGsap += `
  tl.fromTo("#${cardId}", { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power3.out" }, ${bStart.toFixed(2)});
  tl.fromTo("#media-img-${idx}", { scale: 1.0 }, { scale: 1.12, duration: ${bDur.toFixed(2)}, ease: "none" }, ${bStart.toFixed(2)});
  tl.to("#${cardId}", { opacity: 0, scale: 0.96, duration: 0.25, ease: "power2.in" }, ${exitTime});`;
    }
  });

  // Avatar Rig with Directional Mirroring & Strict Silence Pauses
  let avatarHtml = '';
  let avatarGsap = '';
  if (options.avatar) {
    const isMirrored = options.avatarPos === 'bottom_left';
    avatarHtml = `
      <div id="avatar-rig" class="avatar-rig ${isMirrored ? 'mirrored' : ''}">
        <img id="viseme-closed" src="assets/avatar/closed.png" class="viseme active" />
        <img id="viseme-teeth" src="assets/avatar/teeth.png" class="viseme" />
        <img id="viseme-open" src="assets/avatar/open_a.png" class="viseme" />
        <img id="viseme-round" src="assets/avatar/round_o.png" class="viseme" />
        <img id="viseme-m" src="assets/avatar/closed_m.png" class="viseme" />
      </div>`;

    const visemes = ['#viseme-open', '#viseme-teeth', '#viseme-round', '#viseme-m'];
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
  }

  // Compose Full HTML Document
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${storyboard.title || 'YouTube Studio Pro Video'}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Space+Grotesk:wght@600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --accent-primary: ${theme.accent_primary || '#FF9F1C'};
      --accent-secondary: ${theme.accent_secondary || '#FF4081'};
      --card-bg: ${theme.card_bg || 'rgba(28, 20, 18, 0.85)'};
      --card-border: ${theme.card_border || 'rgba(255, 159, 28, 0.35)'};
      --card-glow: ${theme.card_glow || '0 20px 60px rgba(0,0,0,0.8)'};
      --caption-highlight: ${theme.caption_highlight || '#FFD166'};
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

    /* Ambient Lighting */
    .blob-1 {
      position: absolute; top: -100px; left: 80px; width: 850px; height: 850px;
      background: ${theme.ambient_glow_1};
      filter: blur(90px); z-index: 1; pointer-events: none;
      animation: pulseGlow 8s ease-in-out infinite alternate;
    }
    .blob-2 {
      position: absolute; bottom: 200px; right: -100px; width: 750px; height: 750px;
      background: ${theme.ambient_glow_2};
      filter: blur(100px); z-index: 1; pointer-events: none;
      animation: pulseGlow 10s ease-in-out infinite alternate-reverse;
    }
    @keyframes pulseGlow {
      0% { transform: scale(0.95); opacity: 0.8; }
      100% { transform: scale(1.1); opacity: 1.0; }
    }

    /* Cinematic Vignette */
    .vignette-overlay {
      position: absolute; inset: 0;
      background: radial-gradient(circle at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.78) 100%);
      z-index: 2; pointer-events: none;
    }

    /* Atmospheric Dynamic Pattern */
    .vibe-bg-pattern {
      position: absolute; inset: 0;
      ${getVibePatternCss(theme.vibe_pattern, theme.accent_primary, theme.accent_secondary)}
      z-index: 2; pointer-events: none;
    }

    /* Editorial White Flash Overlay */
    .flash-overlay {
      position: absolute; inset: 0;
      background: #FFFFFF;
      opacity: 0;
      pointer-events: none;
      z-index: 150;
    }

    /* Top HUD (Y: 60 - 150) */
    .top-hud {
      position: absolute; top: 70px; left: 60px; right: 60px;
      display: flex; justify-content: space-between; align-items: center;
      z-index: 30;
    }
    .topic-badge {
      display: inline-flex; align-items: center; gap: 12px;
      padding: 12px 24px; border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(16px);
      font-size: 20px; font-weight: 800; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--accent-primary);
    }
    .topic-badge .pulse-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--accent-primary);
      box-shadow: 0 0 10px var(--accent-primary);
    }
    .time-badge {
      font-family: 'Space Grotesk', monospace;
      font-size: 20px; font-weight: 700;
      color: rgba(255, 255, 255, 0.75);
      background: rgba(0, 0, 0, 0.45);
      padding: 10px 20px; border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    /* Continuous Top Progress Fill */
    .top-progress-track {
      position: absolute; top: 0; left: 0; width: 100%; height: 6px;
      background: rgba(255, 255, 255, 0.1);
      z-index: 40;
    }
    .top-progress-fill {
      width: 0%; height: 100%;
      background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
      box-shadow: 0 0 15px var(--accent-primary);
    }

    /* Visual Action Arena (Y: 150 - 1330) */
    .visual-arena {
      position: absolute;
      top: 150px;
      left: 50px;
      right: 50px;
      height: 1180px;
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

    /* Universal Badge Pill */
    .badge-pill {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 999px;
      font-size: 19px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: var(--accent-secondary);
    }

    /* Card: code_workbench (Full Developer IDE) */
    .card-ide-workbench {
      width: 100%; height: 1100px;
      background: #0D1117;
      border: 1px solid rgba(0, 245, 160, 0.3);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 245, 160, 0.15);
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .ide-titlebar {
      height: 48px; background: #080C10;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 18px; font-family: ui-monospace, monospace; flex-shrink: 0;
    }
    .traffic-lights { display: flex; gap: 8px; }
    .traffic-lights span { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .traffic-lights .red { background: #FF5F56; }
    .traffic-lights .yellow { background: #FFBD2E; }
    .traffic-lights .green { background: #27C93F; }
    .ide-window-title { font-size: 15px; color: #94A3B8; font-weight: 600; }
    .ide-branch-badge { font-size: 13px; color: #00F5A0; font-weight: 700; background: rgba(0, 245, 160, 0.1); padding: 4px 10px; border-radius: 6px; }

    .ide-main-row {
      display: flex; flex: 1; min-height: 0; overflow: hidden;
    }
    .ide-activity-bar {
      width: 54px; background: #06090D;
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 0; gap: 20px; color: #64748B; flex-shrink: 0;
    }
    .activity-icon { width: 22px; height: 22px; }
    .activity-icon.active { color: #00F5A0; }

    .ide-sidebar {
      width: 210px; background: #0A0E14;
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      padding: 16px; font-family: ui-monospace, monospace; font-size: 14px; flex-shrink: 0;
    }
    .sidebar-section { color: #94A3B8; font-weight: 800; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px; }
    .file-tree { display: flex; flex-direction: column; gap: 8px; }
    .tree-item { display: flex; align-items: center; gap: 8px; color: #94A3B8; padding: 5px 8px; border-radius: 6px; font-size: 13px; }
    .tree-item.active { background: rgba(0, 245, 160, 0.12); color: #00F5A0; font-weight: 700; }

    .ide-editor-viewport {
      flex: 1; display: flex; flex-direction: column; background: #0D1117;
      min-width: 0;
    }
    .editor-tabs {
      height: 40px; background: #080C10;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex; align-items: center; flex-shrink: 0;
    }
    .editor-tab {
      height: 100%; padding: 0 16px; font-family: ui-monospace, monospace;
      font-size: 13px; color: #94A3B8; display: flex; align-items: center; gap: 8px;
      border-right: 1px solid rgba(255, 255, 255, 0.06);
    }
    .editor-tab.active {
      background: #0D1117; color: #FFFFFF; font-weight: 700;
      border-top: 2px solid #00F5A0;
    }

    .code-canvas {
      flex: 1; padding: 16px 18px; font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 17px; line-height: 1.55; overflow: hidden;
    }
    .c-line { display: flex; align-items: center; padding: 2px 6px; border-radius: 4px; white-space: pre; }
    .c-line.highlight {
      background: rgba(0, 245, 160, 0.15);
      border-left: 4px solid #00F5A0;
    }
    .c-num { width: 32px; color: #475569; user-select: none; font-size: 15px; flex-shrink: 0; }
    .c-key { color: #38BDF8; font-weight: 600; }
    .c-val { color: #FCD34D; }
    .c-str { color: #00F5A0; }
    .c-note { margin-left: 12px; font-size: 13px; color: #00F5A0; font-style: italic; }

    .ide-terminal-drawer {
      height: 290px; background: #070A0E;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex; flex-direction: column; flex-shrink: 0;
    }
    .term-drawer-header {
      height: 34px; background: #090D12;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 14px; font-family: ui-monospace, monospace;
    }
    .term-tab { font-size: 12px; font-weight: 800; color: #00F5A0; letter-spacing: 0.08em; }
    .term-status-badge { font-size: 11px; color: #64748B; }
    .term-drawer-body {
      padding: 14px 18px; font-family: ui-monospace, monospace; font-size: 14px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .term-prompt-row { display: flex; align-items: center; gap: 8px; }
    .t-user { color: #00F5A0; font-weight: 700; }
    .t-cmd { color: #F1F5F9; font-weight: 600; }
    .t-cursor { color: #00F5A0; animation: blink 1s step-end infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    .term-output-grid { display: flex; flex-direction: column; gap: 5px; margin-top: 2px; }
    .term-out-row {
      display: flex; justify-content: space-between; color: #94A3B8; font-size: 13px;
      background: rgba(255, 255, 255, 0.02); padding: 4px 8px; border-radius: 4px;
    }
    .term-pill-ok {
      display: inline-block; background: rgba(0, 245, 160, 0.15);
      border: 1px solid #00F5A0; color: #00F5A0; font-size: 12px;
      font-weight: 800; padding: 4px 10px; border-radius: 999px;
    }

    .ide-statusbar {
      height: 30px; background: #00F5A0; color: #000000;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700;
      flex-shrink: 0;
    }
    .stat-item { display: flex; gap: 12px; }

    /* Card: architecture_diagram */
    .card-arch-diagram {
      width: 100%; background: var(--card-bg); border: 1px solid var(--card-border);
      box-shadow: var(--card-glow); backdrop-filter: blur(28px); border-radius: 36px; padding: 36px 32px;
    }
    .arch-header { text-align: center; margin-bottom: 20px; }
    .arch-title { font-size: 34px; font-weight: 900; text-transform: uppercase; margin-top: 10px; color: #FFFFFF; }
    .arch-plane {
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px; padding: 18px 20px; margin-bottom: 12px;
    }
    .plane-label {
      font-size: 16px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--accent-primary); display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
    }
    .plane-indicator { width: 10px; height: 10px; border-radius: 50%; background: var(--accent-primary); box-shadow: 0 0 10px var(--accent-primary); }
    .plane-components { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .arch-comp-chip {
      background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 12px; padding: 10px 14px;
    }
    .comp-name { font-size: 19px; font-weight: 800; color: #FFFFFF; font-family: ui-monospace, monospace; }
    .comp-role { font-size: 14px; font-weight: 500; color: #94A3B8; margin-top: 3px; }
    .arch-connector-flow { text-align: center; margin: 6px 0; }
    .connector-svg { width: 100%; height: 32px; }
    .connector-label { font-size: 13px; font-weight: 700; color: var(--accent-secondary); letter-spacing: 0.05em; text-transform: uppercase; }
    .worker-nodes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .worker-node-card {
      background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px; padding: 14px;
    }
    .worker-node-name { font-size: 17px; font-weight: 800; font-family: ui-monospace, monospace; color: var(--accent-secondary); margin-bottom: 8px; }
    .worker-pods-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
    .pod-chip {
      background: rgba(0, 245, 160, 0.12); border: 1px solid rgba(0, 245, 160, 0.35);
      border-radius: 8px; padding: 5px 9px; font-size: 13px; font-weight: 700; color: #FFF; font-family: ui-monospace, monospace;
      display: flex; align-items: center; gap: 6px;
    }
    .pod-dot { width: 6px; height: 6px; border-radius: 50%; background: #00F5A0; box-shadow: 0 0 6px #00F5A0; }

    /* Card: code_snippet */
    .card-code-editor {
      width: 100%; background: #0B1015; border: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.85); border-radius: 28px; overflow: hidden;
    }
    .editor-titlebar {
      height: 52px; background: #070B0E; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
    }
    .editor-traffic-lights { display: flex; gap: 8px; }
    .editor-traffic-lights span { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .editor-traffic-lights .red { background: #FF5F56; }
    .editor-traffic-lights .yellow { background: #FFBD2E; }
    .editor-traffic-lights .green { background: #27C93F; }
    .editor-tab {
      background: #0B1015; border-top: 2px solid var(--accent-primary);
      padding: 10px 18px; font-size: 16px; font-weight: 700; font-family: ui-monospace, monospace;
      color: #FFFFFF; display: flex; align-items: center; gap: 8px;
    }
    .editor-lang-badge { font-size: 13px; font-weight: 800; color: #64748B; letter-spacing: 0.08em; }
    .editor-body { padding: 22px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 19px; line-height: 1.6; }
    .code-line { display: flex; align-items: center; padding: 3px 8px; border-radius: 6px; }
    .code-line.highlight { background: rgba(0, 245, 160, 0.15); border-left: 4px solid var(--accent-primary); }
    .line-num { width: 38px; color: #475569; user-select: none; font-size: 16px; }
    .line-text { color: #E2E8F0; }
    .line-key { color: #38BDF8; font-weight: 600; }
    .line-val { color: #FCD34D; }
    .line-note { margin-left: 14px; font-size: 14px; color: var(--accent-primary); font-style: italic; }

    /* Card: terminal_execution */
    .card-terminal {
      width: 100%; background: #0A0E14; border: 1px solid rgba(0, 245, 160, 0.35);
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.9); border-radius: 28px; overflow: hidden;
    }
    .terminal-titlebar {
      height: 50px; background: #05070A; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
    }
    .terminal-title { font-size: 16px; font-weight: 700; color: #94A3B8; font-family: ui-monospace, monospace; }
    .terminal-env-badge { font-size: 13px; font-weight: 800; color: var(--accent-secondary); letter-spacing: 0.08em; }
    .terminal-body { padding: 24px; font-family: ui-monospace, "SF Mono", Menlo, monospace; }
    .terminal-prompt-line { font-size: 20px; font-weight: 700; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
    .term-user { color: var(--accent-primary); }
    .term-path { color: var(--accent-secondary); }
    .term-dollar { color: #94A3B8; }
    .term-cmd { color: #FFFFFF; }
    .term-cursor { color: var(--accent-primary); animation: blink 1s step-start infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    .terminal-outputs { display: flex; flex-direction: column; gap: 8px; font-size: 17px; color: #CBD5E1; }
    .term-header-line { font-size: 15px; font-weight: 800; color: #64748B; letter-spacing: 0.05em; padding: 4px 10px; }
    .term-info-line { font-size: 16px; color: #38BDF8; padding: 4px 10px; }
    .term-row { display: flex; justify-content: space-between; padding: 6px 12px; background: rgba(255, 255, 255, 0.04); border-radius: 8px; }
    .term-pod-name { font-weight: 700; color: #FFFFFF; }
    .term-pod-ready { color: #94A3B8; }
    .term-status-running { color: #00F5A0; font-weight: 700; display: flex; align-items: center; gap: 6px; }
    .term-pod-ip { color: #64748B; }
    .term-success-pill {
      background: rgba(0, 245, 160, 0.15); border: 1px solid var(--accent-primary);
      padding: 12px 16px; border-radius: 10px; color: var(--accent-primary); font-weight: 800; margin-top: 8px; font-size: 17px;
    }

    /* Card: system_flow */
    .card-system-flow {
      width: 100%; background: var(--card-bg); border: 1px solid var(--card-border);
      box-shadow: var(--card-glow); backdrop-filter: blur(28px); border-radius: 36px; padding: 38px 32px;
    }
    .flow-header { text-align: center; margin-bottom: 22px; }
    .flow-title { font-size: 34px; font-weight: 900; text-transform: uppercase; margin-top: 8px; color: #FFFFFF; }
    .flow-steps-rail { display: flex; flex-direction: column; gap: 14px; position: relative; }
    .flow-step-item {
      display: flex; align-items: center; gap: 16px;
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px; padding: 16px 20px;
    }
    .step-num-pill {
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--accent-primary); color: #000000;
      font-size: 20px; font-weight: 950; font-family: 'Space Grotesk', sans-serif;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      box-shadow: 0 0 16px var(--accent-primary);
    }
    .step-content { flex: 1; }
    .step-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .step-name { font-size: 22px; font-weight: 800; color: #FFFFFF; }
    .step-badge {
      font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
      background: rgba(255, 255, 255, 0.1); color: var(--accent-secondary);
      padding: 3px 8px; border-radius: 6px;
    }
    .step-desc { font-size: 16px; font-weight: 500; color: #94A3B8; }

    /* Card: mechanism_inspect */
    .card-mechanism {
      width: 100%; background: var(--card-bg); border: 1px solid var(--card-border);
      box-shadow: var(--card-glow); backdrop-filter: blur(28px); border-radius: 36px; padding: 38px 32px;
      text-align: center;
    }
    .mechanism-header { margin-bottom: 22px; }
    .mechanism-title { font-size: 34px; font-weight: 900; text-transform: uppercase; margin-top: 8px; color: #FFFFFF; }
    .mechanism-stages { display: flex; gap: 14px; align-items: center; margin-bottom: 18px; }
    .stage-card {
      flex: 1; background: rgba(0, 0, 0, 0.5); border-radius: 16px; padding: 18px 14px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .stage-card.desired { border-top: 4px solid var(--accent-primary); }
    .stage-card.actual { border-top: 4px solid #FF5F56; }
    .stage-tag { font-size: 13px; font-weight: 900; letter-spacing: 0.08em; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px; }
    .stage-val { font-size: 18px; font-weight: 800; color: #FFFFFF; }
    .stage-vs-arrow { font-size: 20px; font-weight: 950; color: var(--accent-secondary); font-family: 'Space Grotesk', sans-serif; }
    .mechanism-action-box {
      background: rgba(0, 245, 160, 0.08); border: 1px solid var(--accent-primary);
      border-radius: 16px; padding: 16px 18px; margin-bottom: 16px; text-align: left;
    }
    .action-tag { font-size: 12px; font-weight: 900; color: var(--accent-primary); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
    .action-desc { font-size: 18px; font-weight: 700; color: #FFFFFF; }
    .mechanism-result-pill {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(0, 245, 160, 0.18); border: 1px solid var(--accent-primary);
      padding: 10px 22px; border-radius: 999px; font-size: 18px; font-weight: 800; color: var(--accent-primary);
    }
    .check-dot { font-size: 19px; font-weight: 950; }

    /* Stage: stat_hero (Full Arena Metric Explosion) */
    .stage-stat-hero {
      width: 100%; height: 980px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(circle at 50% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
      text-align: center;
    }
    .stat-top-eyebrow { margin-bottom: 24px; }
    .stat-main-gauge {
      position: relative;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      margin: 10px 0 20px;
    }
    .stat-ring-pulse {
      position: absolute; width: 440px; height: 440px; border-radius: 50%;
      border: 2px dashed var(--accent-primary);
      opacity: 0.25; animation: spin-slow 20s linear infinite;
    }
    @keyframes spin-slow { 100% { transform: rotate(360deg); } }
    .stat-giant-num {
      font-size: 175px; font-weight: 950; line-height: 0.9;
      font-family: 'Space Grotesk', sans-serif;
      color: var(--accent-primary);
      text-shadow: 0 0 60px var(--accent-primary);
      letter-spacing: -0.02em;
    }
    .stat-giant-unit {
      font-size: 38px; font-weight: 800; letter-spacing: 0.08em;
      color: #FFFFFF; text-transform: uppercase; margin-top: 10px;
    }
    .stat-meter-rail {
      width: 600px; height: 14px; border-radius: 7px;
      background: rgba(255, 255, 255, 0.12);
      margin: 24px 0 20px; overflow: hidden;
    }
    .meter-rail-fill {
      width: 0%; height: 100%;
      background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
      border-radius: 7px; box-shadow: 0 0 25px var(--accent-primary);
    }
    .stat-delta-pill {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(0, 255, 136, 0.16); border: 1px solid var(--accent-primary);
      padding: 10px 24px; border-radius: 999px;
      font-size: 20px; font-weight: 900; letter-spacing: 0.08em;
      color: var(--accent-primary); margin-bottom: 20px;
    }
    .stat-impact-label {
      font-size: 38px; font-weight: 900; line-height: 1.25;
      text-transform: uppercase; color: #FFFFFF; max-width: 820px;
    }
    .stat-impact-sub {
      font-size: 24px; font-weight: 600; opacity: 0.75;
      margin-top: 12px; line-height: 1.35; max-width: 780px;
    }

    /* Card: kinetic_slam (Full Arena Typography) */
    .kinetic-slam-arena {
      width: 100%;
      text-align: center;
      padding: 40px 20px;
    }
    .slam-eyebrow { margin-bottom: 30px; }
    .slam-head {
      font-size: 64px; font-weight: 950; line-height: 1.15;
      text-transform: uppercase; letter-spacing: -0.01em;
      color: #FFFFFF;
      text-shadow: 0 4px 20px rgba(0,0,0,0.8);
    }
    .slam-highlight-badge {
      display: inline-block;
      font-size: 68px; font-weight: 950;
      font-family: 'Space Grotesk', sans-serif;
      text-transform: uppercase; letter-spacing: 0.03em;
      background: var(--accent-primary);
      color: #000000;
      padding: 14px 44px; border-radius: 20px;
      margin: 32px 0 26px;
      box-shadow: 0 0 45px var(--accent-primary);
    }
    .slam-punch {
      font-size: 34px; font-weight: 700; opacity: 0.9;
      line-height: 1.4; color: #F1F5F9;
    }

    /* Stage: split_contrast (Broadcast Head-to-Head Clash) */
    .stage-split-clash {
      width: 100%; height: 980px;
      display: flex; flex-direction: column;
    }
    .split-clash-header {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      margin-bottom: 24px; text-align: center;
    }
    .split-clash-title {
      font-size: 32px; font-weight: 900; letter-spacing: 0.04em;
      text-transform: uppercase; color: #FFFFFF;
    }
    .split-clash-arena {
      display: flex; flex: 1; gap: 20px; position: relative; min-height: 0;
    }
    .clash-column {
      flex: 1; display: flex; flex-direction: column;
      border-radius: 24px; padding: 32px 28px;
      backdrop-filter: blur(24px); position: relative;
    }
    .clash-column.old-way {
      background: rgba(36, 12, 16, 0.85);
      border: 1.5px solid rgba(255, 60, 60, 0.45);
      box-shadow: 0 16px 50px rgba(255, 0, 60, 0.2);
    }
    .clash-column.new-way {
      background: rgba(10, 32, 24, 0.85);
      border: 1.5px solid var(--accent-primary);
      box-shadow: 0 16px 50px rgba(0, 255, 136, 0.22);
    }
    .column-status-tag {
      font-size: 15px; font-weight: 900; letter-spacing: 0.1em;
      text-transform: uppercase; margin-bottom: 14px;
    }
    .column-status-tag.danger { color: #FF4D6D; }
    .column-status-tag.success { color: var(--accent-primary); }
    .column-headline {
      font-size: 36px; font-weight: 950; text-transform: uppercase;
      line-height: 1.15; color: #FFFFFF; margin-bottom: 14px;
    }
    .column-body {
      font-size: 21px; font-weight: 500; line-height: 1.45;
      color: rgba(255, 255, 255, 0.85); flex: 1;
    }
    .column-footer-pill {
      font-size: 14px; font-weight: 900; letter-spacing: 0.08em;
      padding: 8px 16px; border-radius: 999px; text-transform: uppercase;
      align-self: flex-start; margin-top: 14px;
    }
    .column-footer-pill.fail { background: rgba(255, 0, 60, 0.2); color: #FF4D6D; }
    .column-footer-pill.win { background: rgba(0, 255, 136, 0.2); color: var(--accent-primary); }
    .clash-divider {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      z-index: 10; display: flex; flex-direction: column; align-items: center;
    }
    .clash-lightning { font-size: 28px; filter: drop-shadow(0 0 12px var(--accent-primary)); }
    .clash-vs-badge {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--accent-primary); color: #000000;
      font-family: 'Space Grotesk', sans-serif;
      font-size: 26px; font-weight: 950;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 35px var(--accent-primary);
    }

    /* Stage: roadmap_checklist (Pipeline Bus Node Tree) */
    .stage-roadmap-tree {
      width: 100%; height: 980px;
      display: flex; flex-direction: column;
      background: rgba(10, 14, 24, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 28px; padding: 40px 36px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }
    .tree-top-eyebrow { margin-bottom: 12px; }
    .tree-main-title {
      font-size: 38px; font-weight: 950; text-transform: uppercase;
      color: #FFFFFF; margin-bottom: 28px; letter-spacing: 0.02em;
    }
    .tree-nodes-list {
      display: flex; flex-direction: column; gap: 20px; position: relative; flex: 1;
    }
    .tree-vertical-bus {
      position: absolute; left: 27px; top: 20px; bottom: 20px; width: 4px;
      background: linear-gradient(180deg, var(--accent-primary), var(--accent-secondary));
      box-shadow: 0 0 15px var(--accent-primary);
    }
    .tree-node-row {
      display: flex; align-items: center; gap: 22px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 18px; padding: 22px 26px;
      position: relative; z-index: 2;
    }
    .tree-node-icon {
      width: 44px; height: 44px; border-radius: 50%;
      background: var(--accent-primary); color: #000000;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 950; flex-shrink: 0;
      box-shadow: 0 0 20px var(--accent-primary);
    }
    .node-bullet { font-family: 'Space Grotesk', sans-serif; }
    .tree-node-content { flex: 1; }
    .tree-node-title {
      font-size: 24px; font-weight: 800; color: #FFFFFF; line-height: 1.3;
    }
    .tree-node-sub {
      font-size: 13px; font-weight: 700; letter-spacing: 0.1em;
      color: var(--accent-primary); text-transform: uppercase; margin-top: 4px;
    }
    .tree-node-status {
      font-size: 13px; font-weight: 900; letter-spacing: 0.1em;
      background: rgba(0, 255, 136, 0.18); border: 1px solid var(--accent-primary);
      color: var(--accent-primary); padding: 6px 14px; border-radius: 999px;
    }

    /* Stage: classified_dossier (Declassified Intelligence Docket) */
    .stage-classified-dossier {
      width: 100%; height: 980px;
      display: flex; flex-direction: column;
      background: rgba(14, 18, 26, 0.88);
      border: 1.5px solid rgba(255, 60, 60, 0.35);
      border-radius: 28px; padding: 40px 36px;
      box-shadow: 0 20px 60px rgba(255, 0, 60, 0.18);
      position: relative;
    }
    .dossier-header-bar {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px;
    }
    .dossier-badge-wrap { display: flex; align-items: center; gap: 10px; }
    .dossier-warning-beacon {
      width: 10px; height: 10px; border-radius: 50%;
      background: #FF003C; box-shadow: 0 0 12px #FF003C;
    }
    .dossier-classification {
      font-size: 15px; font-weight: 900; letter-spacing: 0.15em;
      color: #FF003C; text-transform: uppercase;
    }
    .dossier-file-id {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px; font-weight: 700; color: rgba(255, 255, 255, 0.5);
    }
    .dossier-main-title {
      font-size: 38px; font-weight: 950; text-transform: uppercase;
      color: #FFFFFF; line-height: 1.2; margin-bottom: 10px;
    }
    .dossier-location-tag {
      font-size: 16px; font-weight: 700; letter-spacing: 0.08em;
      color: var(--accent-primary); margin-bottom: 24px;
    }
    .dossier-records-list {
      display: flex; flex-direction: column; gap: 16px; flex: 1;
    }
    .dossier-row {
      display: flex; align-items: center; gap: 18px;
      background: rgba(255, 255, 255, 0.04);
      border-left: 4px solid var(--accent-primary);
      padding: 18px 22px; border-radius: 12px;
      position: relative;
    }
    .dossier-index {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 18px; font-weight: 900; color: var(--accent-primary);
    }
    .dossier-text-wrap {
      flex: 1; position: relative; overflow: hidden;
    }
    .dossier-text {
      font-size: 22px; font-weight: 600; color: #FFFFFF; line-height: 1.35;
    }
    .redaction-bar {
      position: absolute; left: 0; top: 0; right: 0; bottom: 0;
      background: #000000; border-radius: 4px;
    }
    .dossier-status-pill {
      font-size: 12px; font-weight: 900; letter-spacing: 0.12em;
      background: rgba(255, 255, 255, 0.1); color: #FFFFFF;
      padding: 6px 12px; border-radius: 6px;
    }
    .dossier-seal-badge {
      align-self: flex-end; margin-top: 16px;
      font-size: 14px; font-weight: 950; letter-spacing: 0.14em;
      color: #FF003C; border: 2px dashed #FF003C;
      padding: 8px 20px; border-radius: 8px; text-transform: uppercase;
      transform: rotate(-3deg);
    }

    /* Stage: depth_meter (Oceanic Depth & Scale Telemetry Gauge) */
    .beat-card.beat-type-depth_meter {
      height: 980px;
    }
    .stage-depth-meter {
      width: 100%; height: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 28px;
      padding: 36px 32px;
      display: flex; flex-direction: column;
    }
    .depth-hud-topbar {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 18px; margin-bottom: 22px;
    }
    .depth-pill-status {
      display: inline-flex; align-items: center; gap: 10px;
      background: rgba(0, 255, 163, 0.15); border: 1px solid var(--accent-primary);
      padding: 8px 18px; border-radius: 999px;
      font-size: 15px; font-weight: 900; letter-spacing: 0.1em;
      color: var(--accent-primary); text-transform: uppercase;
    }
    .sonar-beacon { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-primary); box-shadow: 0 0 10px var(--accent-primary); }
    .depth-location-title { font-size: 26px; font-weight: 900; color: #FFFFFF; letter-spacing: 0.05em; text-transform: uppercase; }

    .depth-hud-body { display: flex; flex: 1; gap: 28px; min-height: 0; }
    .depth-scale-ruler {
      width: 320px; background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px;
      padding: 24px 18px; display: flex; flex-direction: column; justify-content: space-between;
    }
    .depth-zone-marker {
      display: flex; flex-direction: column; gap: 3px; position: relative;
      padding-left: 20px; border-left: 2px solid rgba(255, 255, 255, 0.2);
    }
    .depth-zone-marker.active {
      border-left: 4px solid var(--accent-primary);
    }
    .zm-m { font-size: 16px; font-weight: 900; font-family: ui-monospace, monospace; color: var(--accent-primary); }
    .zm-lbl { font-size: 14px; font-weight: 700; color: #94A3B8; text-transform: uppercase; }
    .hadal-probe-tag {
      margin-top: 6px; display: inline-block;
      background: rgba(255, 30, 86, 0.2); border: 1px solid var(--accent-secondary);
      color: var(--accent-secondary); font-size: 12px; font-weight: 900; padding: 4px 10px; border-radius: 6px;
    }

    .depth-telemetry-panel {
      flex: 1; display: flex; flex-direction: column; gap: 20px; justify-content: center;
    }
    .depth-readout-card {
      background: rgba(0, 0, 0, 0.55); border: 1px solid var(--card-border);
      border-radius: 22px; padding: 28px; text-align: center;
    }
    .d-tag { font-size: 13px; font-weight: 900; letter-spacing: 0.12em; color: var(--accent-primary); text-transform: uppercase; margin-bottom: 8px; }
    .d-hero-num {
      font-size: 78px; font-weight: 950; font-family: ui-monospace, monospace;
      color: #FFFFFF; line-height: 1; text-shadow: 0 0 40px var(--accent-primary);
      margin-bottom: 8px;
    }
    .d-sub-text { font-size: 16px; font-weight: 600; color: #94A3B8; }

    .depth-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .d-stat-box {
      background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px; padding: 18px; text-align: center;
    }
    .dsb-tag { font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px; }
    .dsb-val { font-size: 26px; font-weight: 900; color: var(--accent-primary); font-family: ui-monospace, monospace; margin-bottom: 4px; }
    .dsb-note { font-size: 13px; font-weight: 600; color: #CBD5E1; }

    .depth-danger-alert {
      background: rgba(255, 30, 86, 0.14); border: 1px solid var(--accent-secondary);
      border-radius: 16px; padding: 16px 20px; display: flex; align-items: center; gap: 14px;
    }
    .dda-icon { font-size: 24px; }
    .dda-text { font-size: 16px; font-weight: 800; color: #FFFFFF; line-height: 1.35; }

    /* Card: ranked_item */
    .card-ranked {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 36px;
      padding: 55px 45px;
    }
    .ranked-eyebrow { margin-bottom: 24px; }
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

    /* Card: data_grid */
    .card-grid {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: var(--card-glow);
      backdrop-filter: blur(28px);
      border-radius: 36px;
      padding: 50px 40px;
    }
    .grid-eyebrow { margin-bottom: 12px; }
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

    /* ========================================================
       DOCUMENTARY VIEWPORT & CINEMATIC HUD MEDIA ARCHETYPES
       ======================================================== */
    .doc-viewport {
      width: 100%;
      height: 1160px;
      position: relative;
      border-radius: 36px;
      overflow: hidden;
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: #020813;
    }

    /* Full-Stage Media Container & Ken Burns Motion */
    .doc-media-stage {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      overflow: hidden;
      z-index: 1;
    }
    .doc-media-img {
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
      transform-origin: center center;
    }

    /* Gradients & Vignettes for High Contrast legibility */
    .doc-gradient-top {
      position: absolute; top: 0; left: 0; width: 100%; height: 280px;
      background: linear-gradient(to bottom, rgba(2, 8, 19, 0.92) 0%, rgba(2, 8, 19, 0.5) 50%, transparent 100%);
      pointer-events: none; z-index: 2;
    }
    .doc-gradient-bottom {
      position: absolute; bottom: 0; left: 0; width: 100%; height: 440px;
      background: linear-gradient(to top, rgba(2, 8, 19, 0.98) 0%, rgba(2, 8, 19, 0.78) 50%, transparent 100%);
      pointer-events: none; z-index: 2;
    }
    .doc-vignette-radial {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(ellipse at center, transparent 35%, rgba(0, 0, 0, 0.75) 100%);
      pointer-events: none; z-index: 2;
    }

    /* Tactical HUD Viewfinder Brackets */
    .doc-hud-brackets {
      position: absolute; top: 22px; left: 22px; right: 22px; bottom: 22px;
      pointer-events: none; z-index: 3;
    }
    .bracket {
      position: absolute; width: 32px; height: 32px;
      border-color: var(--accent-primary);
      border-style: solid;
      opacity: 0.85;
    }
    .bracket.b-tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-top-left-radius: 8px; }
    .bracket.b-tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-top-right-radius: 8px; }
    .bracket.b-bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-bottom-left-radius: 8px; }
    .bracket.b-br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-bottom-right-radius: 8px; }

    /* Animated Reticle Crosshairs */
    .doc-reticle-crosshair {
      position: absolute; top: 42%; left: 50%;
      transform: translate(-50%, -50%);
      width: 140px; height: 140px;
      pointer-events: none; z-index: 3;
    }
    .reticle-ring {
      width: 100%; height: 100%; border-radius: 50%;
      border: 1px dashed var(--accent-primary);
      opacity: 0.6;
    }
    .reticle-dot {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--accent-primary); box-shadow: 0 0 12px var(--accent-primary);
    }
    .reticle-line-h {
      position: absolute; top: 50%; left: -24px; right: -24px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
      opacity: 0.45;
    }
    .reticle-line-v {
      position: absolute; left: 50%; top: -24px; bottom: -24px; width: 1px;
      background: linear-gradient(180deg, transparent, var(--accent-primary), transparent);
      opacity: 0.45;
    }
    .reticle-tag {
      position: absolute; bottom: -30px; left: 50%; transform: translateX(-50%);
      font-family: ui-monospace, monospace; font-size: 11px; font-weight: 800;
      letter-spacing: 0.15em; color: var(--accent-primary); white-space: nowrap;
    }

    /* Scanline Sweep */
    .doc-scanline-sweep {
      position: absolute; left: 0; width: 100%; height: 4px;
      background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
      box-shadow: 0 0 16px var(--accent-primary);
      pointer-events: none; z-index: 3;
    }

    /* Content Overlay Container */
    .doc-content-overlay {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      padding: 42px 38px;
      display: flex; flex-direction: column; justify-content: space-between;
      z-index: 4; pointer-events: none;
    }
    .doc-eyebrow-pill {
      display: inline-flex; align-items: center; gap: 10px;
      background: rgba(0, 0, 0, 0.65);
      border: 1px solid var(--accent-primary);
      color: var(--accent-primary);
      font-size: 15px; font-weight: 900; letter-spacing: 0.12em;
      padding: 8px 22px; border-radius: 999px;
      text-transform: uppercase; align-self: flex-start;
      backdrop-filter: blur(12px);
    }
    .doc-headline {
      font-size: 44px; font-weight: 950; line-height: 1.15;
      color: #FFFFFF; text-transform: uppercase;
      letter-spacing: -0.01em; margin-top: 14px;
      text-shadow: 0 4px 20px rgba(0, 0, 0, 0.95);
    }
    .doc-taxonomy-badge {
      display: inline-block; margin-top: 10px;
      font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700;
      color: var(--accent-secondary); letter-spacing: 0.08em;
      background: rgba(0, 0, 0, 0.65); padding: 6px 16px; border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15); align-self: flex-start;
      backdrop-filter: blur(10px);
    }
    .doc-punchline-dock {
      background: rgba(2, 8, 19, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 22px; padding: 22px 26px;
      backdrop-filter: blur(24px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7);
      display: flex; flex-direction: column; gap: 10px;
    }
    .doc-stat-pill {
      display: inline-block; align-self: flex-start;
      background: rgba(255, 255, 255, 0.1); border: 1px solid var(--accent-primary);
      color: var(--accent-primary); font-size: 13px; font-weight: 900;
      letter-spacing: 0.1em; padding: 4px 12px; border-radius: 6px;
      font-family: ui-monospace, monospace;
    }
    .doc-punchline-text {
      font-size: 24px; font-weight: 800; color: #FFFFFF;
      line-height: 1.35; font-style: italic;
    }

    /* Scale Comparison Archetype */
    .scale-dimension-bar {
      margin: 16px 0; text-align: center;
    }
    .dimension-line {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      background: rgba(0, 0, 0, 0.65); border: 1px solid var(--accent-primary);
      padding: 8px 24px; border-radius: 999px; backdrop-filter: blur(8px);
    }
    .dim-label {
      font-size: 18px; font-weight: 900; color: var(--accent-primary);
      letter-spacing: 0.08em; font-family: ui-monospace, monospace;
    }
    .scale-vs-row {
      display: flex; align-items: center; justify-content: space-between; gap: 14px;
    }
    .scale-chip {
      flex: 1; background: rgba(2, 8, 19, 0.88); border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 18px; padding: 18px; text-align: center; backdrop-filter: blur(15px);
    }
    .scale-chip.subject { border-color: var(--accent-primary); }
    .sc-tag { font-size: 12px; font-weight: 800; color: #94A3B8; letter-spacing: 0.1em; text-transform: uppercase; }
    .sc-val { font-size: 26px; font-weight: 950; color: #FFFFFF; font-family: ui-monospace, monospace; margin-top: 4px; }
    .scale-vs-badge {
      width: 44px; height: 44px; border-radius: 50%; background: var(--accent-primary);
      color: #000; font-weight: 950; font-size: 15px; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 15px var(--accent-primary); flex-shrink: 0;
    }
    .scale-takeaway-dock {
      background: rgba(2, 8, 19, 0.88); border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px; padding: 16px 20px; font-size: 17px; font-weight: 700; color: #CBD5E1;
      backdrop-filter: blur(15px); margin-top: 10px;
    }

    /* Telemetry Inspection Archetype */
    .telemetry-top-bar {
      display: flex; justify-content: space-between; align-items: center;
    }
    .telemetry-coords {
      font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700;
      color: var(--accent-secondary); background: rgba(0, 0, 0, 0.65);
      padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .telemetry-metrics-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;
    }
    .telemetry-chip {
      background: rgba(2, 8, 19, 0.88); border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px; padding: 16px; text-align: center; backdrop-filter: blur(15px);
    }
    .tc-val { font-size: 28px; font-weight: 950; color: var(--accent-primary); font-family: ui-monospace, monospace; }
    .tc-lbl { font-size: 12px; font-weight: 800; color: #94A3B8; text-transform: uppercase; margin-top: 4px; }
    .doc-danger-alert {
      background: rgba(255, 30, 86, 0.22); border: 1px solid #FF003C;
      border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; gap: 12px;
      backdrop-filter: blur(15px); margin-top: 12px;
    }
    .alert-icon { font-size: 22px; }
    .alert-msg { font-size: 16px; font-weight: 800; color: #FFFFFF; }

    /* Dossier Investigation Archetype */
    .dossier-docket-container {
      width: 100%; height: 100%;
      padding: 34px 32px; display: flex; flex-direction: column; justify-content: space-between;
      background: rgba(6, 12, 22, 0.96);
    }
    .dossier-photo-viewport {
      position: relative; width: 100%; height: 600px;
      border-radius: 20px; overflow: hidden; border: 2px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85);
    }
    .dossier-evidence-photo {
      width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;
    }
    .dossier-red-stamp {
      position: absolute; top: 30px; right: 30px;
      border: 3px solid #FF003C; color: #FF003C;
      font-size: 22px; font-weight: 950; letter-spacing: 0.15em;
      padding: 8px 24px; text-transform: uppercase;
      transform: rotate(-8deg); background: rgba(255, 0, 60, 0.18);
      box-shadow: 0 0 20px rgba(255, 0, 60, 0.4);
    }
    .dossier-docket-footer {
      background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px; padding: 18px 22px;
    }
    .dossier-title { font-size: 30px; font-weight: 950; color: #FFF; text-transform: uppercase; }
    .dossier-observation-box {
      position: relative; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px; padding: 12px 16px; margin-top: 8px; overflow: hidden;
    }
    .dossier-bullet-text { font-size: 17px; font-weight: 700; color: #F1F5F9; line-height: 1.4; }
    .dossier-redact-wipe {
      position: absolute; top: 0; right: 0; bottom: 0; width: 100%;
      background: #000000;
    }

    /* Depth Meter Stage HUD */
    .stage-depth-meter-hud {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      padding: 36px 32px;
      display: flex; flex-direction: column;
      z-index: 4; pointer-events: none;
    }

    /* Kinetic Subtitles Safe Zone (Y: 1370 - 1520) */
    .caption-group {
      position: absolute;
      top: 1370px;
      left: 50px;
      right: 50px;
      max-width: 980px;
      margin: 0 auto;
      height: 150px;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 12px;
      text-align: center;
      z-index: 100;
      pointer-events: none;
    }
    .caption-word {
      font-size: 46px;
      font-weight: 900;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #FFFFFF;
      display: inline-block;
      margin: 0 6px;
      text-shadow: 0 4px 18px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.9);
    }

    /* Talking Avatar Rig (Y: 1690 - 1900, bottom: 20px) */
    .avatar-rig {
      position: absolute; bottom: 20px; right: 40px; width: 210px; height: 210px;
      z-index: 40; filter: drop-shadow(0 15px 35px rgba(0,0,0,0.85));
      pointer-events: none;
    }
    .avatar-rig.mirrored { right: auto; left: 40px; transform: scaleX(-1); }
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
    <div id="flash-overlay" class="flash-overlay"></div>

    <!-- Continuous Top Progress Bar -->
    <div class="top-progress-track">
      <div id="progress-fill" class="top-progress-fill"></div>
    </div>

    <!-- Top HUD -->
    <div class="top-hud">
      <div class="topic-badge">
        <div class="pulse-dot"></div>
        <span id="stage-tag">${(storyboard.beats && storyboard.beats[0]?.eyebrow) || storyboard.tagline || 'EXPLAINER'}</span>
      </div>
      <div class="time-badge">${storyboard.title || 'STUDIO PRO'}</div>
    </div>

    <!-- Visual Action Arena -->
    <div class="visual-arena">
      ${beatsHtml}
    </div>

    <!-- Subtitles Track -->
    ${captionsHtml}

    <!-- Avatar Rig -->
    ${avatarHtml}

    <audio id="audio-voice" src="assets/audio/voiceover.mp3" class="clip" data-start="0" data-duration="${totalDuration.toFixed(2)}"></audio>
    ${hasBgm ? `<audio id="audio-bgm" src="assets/audio/bgm.mp3" class="clip" data-start="0" data-duration="${totalDuration.toFixed(2)}"></audio>` : ''}
${sfxHtml}
  </div>

  <script>
    const tl = gsap.timeline({ paused: true });
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = tl;

    // Continuous Top Progress Fill
    tl.fromTo("#progress-fill", { width: "0%" }, { width: "100%", duration: ${totalDuration.toFixed(2)}, ease: "none" }, 0);

    // Subtle Virtual Camera Drift across entire composition
    tl.to(".visual-arena", { scale: 1.025, y: -12, duration: ${totalDuration.toFixed(2)}, ease: "sine.inOut" }, 0);

    ${hasBgm ? `// Intelligent Vocal Ducking for BGM
    tl.set("#audio-bgm", { volume: 0.16 }, 0);
    tl.to("#audio-bgm", { volume: 0.04, duration: 0.2 }, Math.max(0, ${((words[0]?.start || 0.1) - 0.15).toFixed(2)}));
    ${(() => {
      let duckCode = '';
      for (let i = 0; i < words.length - 1; i++) {
        const gap = words[i+1].start - words[i].end;
        if (gap > 0.45) {
          duckCode += `    tl.to("#audio-bgm", { volume: 0.16, duration: 0.25 }, ${(words[i].end + 0.05).toFixed(2)});\n`;
          duckCode += `    tl.to("#audio-bgm", { volume: 0.04, duration: 0.2 }, ${(words[i+1].start - 0.15).toFixed(2)});\n`;
        }
      }
      if (words.length > 0) {
        duckCode += `    tl.to("#audio-bgm", { volume: 0.20, duration: 0.4 }, ${(words[words.length - 1].end + 0.1).toFixed(2)});\n`;
      }
      return duckCode;
    })()}` : ''}

    ${beatsGsap}
    ${captionsGsap}
    ${avatarGsap}

    tl.seek(0);
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(workDir, 'index.html'), indexHtml);
  return { projectDir: workDir, totalDuration };
}

// MARK: - Step 5: Native HyperFrames Render
async function renderHyperFrames(workDir, outputMp4) {
  emit(75, 'Rendering', 'Compiling composition with HyperFrames Chromium engine...');

  let checkRes = '';
  try {
    checkRes = execSync(`npx hyperframes check --json`, {
      cwd: workDir,
      env: { ...process.env, PATH: ENV_PATH }
    }).toString();
  } catch (err) {
    checkRes = err.stdout ? err.stdout.toString() : '';
  }

  if (checkRes) {
    try {
      const checkData = JSON.parse(checkRes);
      if (checkData.lint && checkData.lint.errorCount > 0) {
        const errs = (checkData.lint.findings || []).filter(f => f.severity === 'error');
        if (errs.length > 0) {
          throw new Error(`HyperFrames check failed: ${JSON.stringify(errs)}`);
        }
      }
    } catch (e) {
      if (e.message.includes('HyperFrames check failed')) throw e;
    }
  }

  emit(85, 'Rendering', 'Rendering 1080x1920 30fps frames to MP4...');
  execSync(`npx hyperframes render --output "${outputMp4}" --quality looks`, {
    cwd: workDir,
    stdio: 'inherit',
    env: { ...process.env, PATH: ENV_PATH }
  });

  emit(100, 'Complete', 'Video render complete!');
  return outputMp4;
}

// MARK: - Main Execution Pipeline
export async function runHyperFramesPipeline({ topic, duration = 60, apiKey, outputMp4, avatar = true, avatarPos = 'bottom_right', bgmMood = 'auto', noBgm = false, theme = 'auto' }) {
  const timestamp = Date.now();
  const workDir = path.join(path.dirname(outputMp4), `hf_project_${timestamp}`);
  fs.mkdirSync(workDir, { recursive: true });

  // 1. Script & Dynamic Storyboard
  const storyboard = await generateStoryboard(topic, duration, apiKey);

  // 2. Cloned Voice Generation
  const audioPath = await synthesizeVoice(storyboard.paragraphs, workDir, apiKey);

  // 3. Word-Level Timestamp Alignment
  const words = transcribeAudio(audioPath, workDir);

  const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, {
    env: { ...process.env, PATH: ENV_PATH }
  }).toString().trim();
  const totalDuration = parseFloat(durStr);

  // 4. Project Composition with Speech Alignment & Theme-matched BGM
  await buildHyperFramesProject(storyboard, words, totalDuration, workDir, { avatar, avatarPos, bgmMood, noBgm, theme, topic });

  // 5. Native Render
  await renderHyperFrames(workDir, outputMp4);

  return {
    status: 'success',
    video_path: outputMp4,
    duration: totalDuration,
    title: storyboard.title
  };
}

// CLI entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let topic = 'Horrifying facts about our ocean';
  let duration = 60;
  let output = path.join(process.cwd(), 'output.mp4');
  let apiKey = process.env.OPENROUTER_API_KEY || '';
  let avatar = true;
  let avatarPos = 'bottom_right';
  let bgmMood = 'auto';
  let noBgm = false;
  let theme = 'auto';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topic') topic = args[++i];
    if (args[i] === '--duration') duration = parseInt(args[++i]);
    if (args[i] === '--output') output = args[++i];
    if (args[i] === '--api-key') apiKey = args[++i];
    if (args[i] === '--no-avatar') avatar = false;
    if (args[i] === '--avatar-pos') avatarPos = args[++i];
    if (args[i] === '--bgm-mood') bgmMood = args[++i];
    if (args[i] === '--no-bgm') noBgm = true;
    if (args[i] === '--theme') theme = args[++i];
  }

  runHyperFramesPipeline({ topic, duration, apiKey, outputMp4: output, avatar, avatarPos, bgmMood, noBgm, theme })
    .then(r => console.log(JSON.stringify(r)))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
