import { buildHyperFramesProject } from "./engines/generator/hyperframes_engine.mjs";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const testDir = "/tmp/test-k8s-e2e";
fs.mkdirSync(testDir, { recursive: true });
fs.mkdirSync(path.join(testDir, "assets/audio"), { recursive: true });
fs.writeFileSync(path.join(testDir, "assets/audio/voiceover.mp3"), Buffer.alloc(100));

const storyboard = {
  title: "Kubernetes Architecture",
  tagline: "CLOUD CONTAINER ORCHESTRATION",
  beats: [
    { type: "split_contrast", eyebrow: "INTRO", headline: "OLD VS NEW", punchline: "Manual vs automated" },
    { type: "code_workbench", eyebrow: "DEPLOYMENT MANIFEST", filename: "deployment.yaml" },
    { type: "architecture_diagram", eyebrow: "CLUSTER TOPOLOGY", title: "Control Plane" }
  ]
};

const words = [
  { text: "Ever", start: 0.1, end: 0.4 },
  { text: "wondered", start: 0.4, end: 0.8 },
  { text: "how", start: 0.8, end: 1.0 },
  { text: "Kubernetes", start: 1.0, end: 1.6 },
  { text: "actually", start: 1.6, end: 2.0 },
  { text: "works?", start: 2.0, end: 2.5 },
  { text: "Lets", start: 2.6, end: 2.9 },
  { text: "break", start: 2.9, end: 3.2 },
  { text: "down", start: 3.2, end: 3.5 },
  { text: "the", start: 3.5, end: 3.7 },
  { text: "cluster", start: 3.7, end: 4.1 },
  { text: "control", start: 4.1, end: 4.5 },
  { text: "plane.", start: 4.5, end: 5.0 }
];

await buildHyperFramesProject(storyboard, words, 6.0, testDir, { topic: "Explain Kubernetes Architecture", noBgm: true });

console.log("HyperFrames project written to", testDir);
const check = execSync("npx hyperframes check --json", { cwd: testDir }).toString();
const parsed = JSON.parse(check);
console.log("Check OK:", parsed.ok);
const errors = (parsed.lint?.findings || []).filter(f => f.severity === "error");
console.log("Errors:", errors);

const html = fs.readFileSync(path.join(testDir, "index.html"), "utf-8");
console.log("Has card-ide-workbench:", html.includes("card-ide-workbench"));
console.log("Has kinetic-slam-arena:", html.includes("kinetic-slam-arena"));
console.log("Has card-split-contrast:", html.includes("card-split-contrast"));
