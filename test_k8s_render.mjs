import path from 'path';
import { runHyperFramesPipeline } from './engines/generator/hyperframes_engine.mjs';

const outputMp4 = '/Users/dheerajsrinivasa/.gemini/antigravity/brain/454ba65c-eca9-4899-b920-b908e3504675/Kubernetes_Architecture_Explainer.mp4';
const apiKey = process.env.OPENROUTER_API_KEY || '';

console.log("Starting test generation for Kubernetes Architecture...");
runHyperFramesPipeline({
  topic: 'Explain Kubernetes Architecture and how it works',
  duration: 35,
  apiKey,
  outputMp4,
  avatar: false,
  bgmMood: 'cyber_synth',
  noBgm: false,
  theme: 'emerald_tech'
}).then(res => {
  console.log("SUCCESS:", JSON.stringify(res, null, 2));
}).catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
