import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testDir = '/tmp/test-tech-render';
fs.mkdirSync(testDir, { recursive: true });

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kubernetes Explainer Test</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <style>
    :root {
      --accent-primary: #00F5A0;
      --accent-secondary: #00D9F5;
      --card-bg: rgba(8, 24, 20, 0.88);
      --card-border: rgba(0, 245, 160, 0.35);
      --card-glow: 0 20px 60px rgba(0, 245, 160, 0.2);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1080px; height: 1920px;
      background: radial-gradient(ellipse at 50% 20%, #0A1B14 0%, #05100B 60%, #020805 100%);
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    #root {
      position: relative; width: 1080px; height: 1920px; overflow: hidden;
    }
    .clip { position: absolute; inset: 0; }
    .visual-arena {
      position: absolute; top: 170px; left: 60px; right: 60px; height: 1130px;
      display: flex; align-items: center; justify-content: center;
    }
    .badge-pill {
      display: inline-block; padding: 8px 20px; border-radius: 999px;
      font-size: 19px; font-weight: 900; letter-spacing: 0.12em;
      text-transform: uppercase; background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18); color: var(--accent-secondary);
    }

    /* ARCHITECTURE DIAGRAM */
    .card-arch-diagram {
      width: 100%; background: var(--card-bg); border: 1px solid var(--card-border);
      box-shadow: var(--card-glow); backdrop-filter: blur(28px); border-radius: 36px; padding: 42px 36px;
    }
    .arch-header { text-align: center; margin-bottom: 24px; }
    .arch-title { font-size: 38px; font-weight: 900; text-transform: uppercase; margin-top: 10px; }
    .arch-plane {
      background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px; padding: 20px; margin-bottom: 14px;
    }
    .plane-label {
      font-size: 17px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--accent-primary); display: flex; align-items: center; gap: 10px; margin-bottom: 14px;
    }
    .plane-indicator { width: 10px; height: 10px; border-radius: 50%; background: var(--accent-primary); box-shadow: 0 0 10px var(--accent-primary); }
    .plane-components { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .arch-comp-chip {
      background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(0, 245, 160, 0.25);
      border-radius: 12px; padding: 12px 14px;
    }
    .comp-name { font-size: 20px; font-weight: 800; color: #FFFFFF; font-family: ui-monospace, monospace; }
    .comp-role { font-size: 15px; font-weight: 500; color: #94A3B8; margin-top: 4px; }
    .arch-connector-flow { text-align: center; margin: 8px 0; }
    .connector-svg { width: 100%; height: 35px; }
    .connector-label { font-size: 14px; font-weight: 700; color: var(--accent-secondary); letter-spacing: 0.05em; text-transform: uppercase; }
    .worker-nodes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .worker-node-card {
      background: rgba(0, 0, 0, 0.45); border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px; padding: 16px;
    }
    .worker-node-name { font-size: 18px; font-weight: 800; font-family: ui-monospace, monospace; color: var(--accent-secondary); margin-bottom: 8px; }
    .worker-pods-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
    .pod-chip {
      background: rgba(0, 245, 160, 0.12); border: 1px solid rgba(0, 245, 160, 0.35);
      border-radius: 8px; padding: 6px 10px; font-size: 14px; font-weight: 700; color: #FFF; font-family: ui-monospace, monospace;
      display: flex; align-items: center; gap: 6px;
    }
    .pod-dot { width: 6px; height: 6px; border-radius: 50%; background: #00F5A0; box-shadow: 0 0 6px #00F5A0; }

    /* CODE SNIPPET */
    .card-code-editor {
      width: 100%; background: #0B1015; border: 1px solid rgba(255, 255, 255, 0.16);
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
    .editor-body { padding: 24px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 20px; line-height: 1.6; }
    .code-line { display: flex; align-items: center; padding: 4px 8px; border-radius: 6px; }
    .code-line.highlight { background: rgba(0, 245, 160, 0.15); border-left: 4px solid var(--accent-primary); }
    .line-num { width: 40px; color: #475569; user-select: none; font-size: 17px; }
    .line-text { color: #E2E8F0; }
    .line-key { color: #38BDF8; font-weight: 600; }
    .line-val { color: #FCD34D; }
    .line-note { margin-left: 14px; font-size: 15px; color: var(--accent-primary); font-style: italic; }

    /* TERMINAL */
    .card-terminal {
      width: 100%; background: #0A0E14; border: 1px solid rgba(0, 245, 160, 0.3);
      box-shadow: 0 25px 70px rgba(0, 0, 0, 0.9); border-radius: 28px; overflow: hidden;
    }
    .terminal-titlebar {
      height: 50px; background: #05070A; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
    }
    .terminal-title { font-size: 16px; font-weight: 700; color: #94A3B8; font-family: ui-monospace, monospace; }
    .terminal-body { padding: 26px; font-family: ui-monospace, "SF Mono", Menlo, monospace; }
    .terminal-prompt-line { font-size: 22px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
    .term-user { color: var(--accent-primary); }
    .term-path { color: var(--accent-secondary); }
    .term-cmd { color: #FFFFFF; }
    .term-cursor { color: var(--accent-primary); animation: blink 1s step-start infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    .terminal-outputs { display: flex; flex-direction: column; gap: 10px; font-size: 18px; color: #CBD5E1; }
    .term-row { display: flex; justify-content: space-between; padding: 6px 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; }
    .term-status-running { color: #00F5A0; font-weight: 700; display: flex; align-items: center; gap: 6px; }
    .term-success-pill {
      background: rgba(0, 245, 160, 0.15); border: 1px solid var(--accent-primary);
      padding: 12px 16px; border-radius: 10px; color: var(--accent-primary); font-weight: 800; margin-top: 10px;
    }
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-width="1080" data-height="1920" class="clip" data-start="0" data-duration="15">
    <div class="visual-arena">
      <div id="beat-0" class="clip" data-start="0" data-duration="5">
        <div class="card-arch-diagram">
          <div class="arch-header">
            <span class="badge-pill">CLUSTER ARCHITECTURE</span>
            <div class="arch-title">Control Plane & Worker Nodes</div>
          </div>
          <div class="arch-plane">
            <div class="plane-label"><span class="plane-indicator"></span>CONTROL PLANE (MASTER)</div>
            <div class="plane-components">
              <div class="arch-comp-chip"><div class="comp-name">API Server</div><div class="comp-role">Cluster Gateway & REST API</div></div>
              <div class="arch-comp-chip"><div class="comp-name">etcd</div><div class="comp-role">Distributed State Store</div></div>
              <div class="arch-comp-chip"><div class="comp-name">Kube-Scheduler</div><div class="comp-role">Pod Placement Engine</div></div>
              <div class="arch-comp-chip"><div class="comp-name">Controller Mgr</div><div class="comp-role">State Reconciliation Loop</div></div>
            </div>
          </div>
          <div class="arch-connector-flow">
            <svg class="connector-svg" viewBox="0 0 800 35">
              <line x1="200" y1="5" x2="200" y2="30" stroke="#00F5A0" stroke-width="2" stroke-dasharray="4 4" />
              <line x1="600" y1="5" x2="600" y2="30" stroke="#00F5A0" stroke-width="2" stroke-dasharray="4 4" />
            </svg>
            <div class="connector-label">TLS Telemetry & Pod Directives</div>
          </div>
          <div class="arch-plane">
            <div class="plane-label"><span class="plane-indicator"></span>WORKER NODES (DATA PLANE)</div>
            <div class="worker-nodes-grid">
              <div class="worker-node-card">
                <div class="worker-node-name">Worker Node 01</div>
                <div class="worker-pods-wrap">
                  <div class="pod-chip"><span class="pod-dot"></span>nginx-pod-a</div>
                  <div class="pod-chip"><span class="pod-dot"></span>api-pod-b</div>
                </div>
              </div>
              <div class="worker-node-card">
                <div class="worker-node-name">Worker Node 02</div>
                <div class="worker-pods-wrap">
                  <div class="pod-chip"><span class="pod-dot"></span>api-pod-c</div>
                  <div class="pod-chip"><span class="pod-dot"></span>db-pod-d</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    window.__timelines = window.__timelines || {};
    window.__timelines["main"] = tl;
    tl.seek(0);
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(testDir, 'index.html'), htmlContent);
fs.writeFileSync(path.join(testDir, 'hyperframes.json'), JSON.stringify({
  version: "1.0",
  id: "test",
  width: 1080,
  height: 1920,
  fps: 30,
  duration: 15,
  compositions: {
    main: { width: 1080, height: 1920, duration: 15, fps: 30 }
  }
}, null, 2));

console.log("Running hyperframes check on test dir...");
const out = execSync("npx hyperframes check --json", { cwd: testDir }).toString();
console.log(out);
