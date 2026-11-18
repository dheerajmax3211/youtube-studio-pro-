import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const testDir = '/tmp/test-workbench-render';
fs.mkdirSync(testDir, { recursive: true });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Workbench Test</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1080px; height: 1920px;
      background: radial-gradient(ellipse at 50% 20%, #0A1B14 0%, #05100B 60%, #020805 100%);
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    #root { position: relative; width: 1080px; height: 1920px; overflow: hidden; }
    .clip { position: absolute; inset: 0; }

    /* WORKBENCH (FULL-STAGE DEVELOPER IDE) */
    .visual-arena {
      position: absolute; top: 140px; left: 50px; right: 50px; height: 1180px;
      display: flex; align-items: center; justify-content: center;
    }

    .ide-workbench {
      width: 100%; height: 100%;
      background: #0D1117;
      border: 1px solid rgba(0, 245, 160, 0.3);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 245, 160, 0.15);
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Window Titlebar */
    .ide-titlebar {
      height: 48px; background: #080C10;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 18px; font-family: ui-monospace, monospace;
    }
    .traffic-lights { display: flex; gap: 8px; }
    .traffic-lights span { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .traffic-lights .red { background: #FF5F56; }
    .traffic-lights .yellow { background: #FFBD2E; }
    .traffic-lights .green { background: #27C93F; }
    .ide-window-title { font-size: 15px; color: #94A3B8; font-weight: 600; }
    .ide-branch-badge { font-size: 13px; color: #00F5A0; font-weight: 700; background: rgba(0, 245, 160, 0.1); padding: 4px 10px; border-radius: 6px; }

    /* IDE Main Area */
    .ide-main-row {
      display: flex; flex: 1; min-height: 0; overflow: hidden;
    }

    /* Activity Bar */
    .ide-activity-bar {
      width: 54px; background: #06090D;
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 0; gap: 20px; color: #64748B;
    }
    .activity-icon { width: 22px; height: 22px; }
    .activity-icon.active { color: #00F5A0; }

    /* Explorer Sidebar */
    .ide-sidebar {
      width: 220px; background: #0A0E14;
      border-right: 1px solid rgba(255, 255, 255, 0.06);
      padding: 16px; font-family: ui-monospace, monospace; font-size: 14px;
    }
    .sidebar-section { color: #94A3B8; font-weight: 800; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px; }
    .file-tree { display: flex; flex-direction: column; gap: 8px; }
    .tree-item { display: flex; align-items: center; gap: 8px; color: #94A3B8; padding: 4px 8px; border-radius: 6px; }
    .tree-item.active { background: rgba(0, 245, 160, 0.12); color: #00F5A0; font-weight: 700; }

    /* Editor Viewport */
    .ide-editor-viewport {
      flex: 1; display: flex; flex-direction: column; background: #0D1117;
      min-width: 0;
    }
    .editor-tabs {
      height: 40px; background: #080C10;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex; align-items: center;
    }
    .editor-tab {
      height: 100%; padding: 0 18px; font-family: ui-monospace, monospace;
      font-size: 14px; color: #94A3B8; display: flex; align-items: center; gap: 8px;
      border-right: 1px solid rgba(255, 255, 255, 0.06);
    }
    .editor-tab.active {
      background: #0D1117; color: #FFFFFF; font-weight: 700;
      border-top: 2px solid #00F5A0;
    }

    /* Code Lines */
    .code-canvas {
      flex: 1; padding: 18px 20px; font-family: ui-monospace, "SF Mono", Menlo, monospace;
      font-size: 19px; line-height: 1.6; overflow: hidden;
    }
    .c-line { display: flex; align-items: center; padding: 3px 6px; border-radius: 4px; }
    .c-line.highlight {
      background: rgba(0, 245, 160, 0.15);
      border-left: 4px solid #00F5A0;
    }
    .c-num { width: 34px; color: #475569; user-select: none; font-size: 16px; }
    .c-key { color: #38BDF8; font-weight: 600; }
    .c-val { color: #FCD34D; }
    .c-str { color: #00F5A0; }
    .c-note { margin-left: 14px; font-size: 14px; color: #00F5A0; font-style: italic; font-weight: 600; }

    /* Integrated Terminal Drawer */
    .ide-terminal-drawer {
      height: 250px; background: #070A0E;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex; flex-direction: column; font-family: ui-monospace, monospace;
    }
    .term-drawer-header {
      height: 36px; background: #05070A; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
    }
    .term-tab { font-size: 13px; font-weight: 700; color: #00F5A0; border-bottom: 2px solid #00F5A0; height: 100%; display: flex; align-items: center; }
    .term-status-badge { font-size: 12px; color: #94A3B8; }
    .term-drawer-body {
      flex: 1; padding: 14px 18px; font-size: 16px; display: flex; flex-direction: column; gap: 8px;
    }
    .term-prompt-row { font-size: 18px; font-weight: 700; color: #FFFFFF; display: flex; align-items: center; gap: 8px; }
    .t-user { color: #00F5A0; }
    .t-cmd { color: #FFFFFF; font-weight: 800; }
    .t-cursor { color: #00F5A0; animation: blink 1s step-start infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    .term-output-grid { display: flex; flex-direction: column; gap: 6px; font-size: 15px; color: #CBD5E1; }
    .term-out-row { display: flex; justify-content: space-between; background: rgba(255, 255, 255, 0.03); padding: 5px 10px; border-radius: 6px; }
    .term-pill-ok {
      background: rgba(0, 245, 160, 0.18); border: 1px solid #00F5A0;
      color: #00F5A0; font-weight: 800; padding: 6px 12px; border-radius: 8px; font-size: 15px;
      display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;
    }

    /* IDE Statusbar */
    .ide-statusbar {
      height: 32px; background: #05070A; border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; font-family: ui-monospace, monospace; font-size: 13px; color: #64748B;
    }
    .stat-item { display: flex; align-items: center; gap: 6px; }
    .stat-item.active { color: #00F5A0; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-width="1080" data-height="1920" class="clip" data-start="0" data-duration="10">
    <div class="visual-arena">
      <div id="beat-0" class="clip" data-start="0" data-duration="10">
        <div class="ide-workbench">
          <div class="ide-titlebar">
            <div class="traffic-lights"><span class="red"></span><span class="yellow"></span><span class="green"></span></div>
            <div class="ide-window-title">k8s-cluster — deployment.yaml</div>
            <div class="ide-branch-badge">⎇ production</div>
          </div>
          <div class="ide-main-row">
            <div class="ide-activity-bar">
              <svg class="activity-icon active" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/></svg>
              <svg class="activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 21-5.2-5.2M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/></svg>
              <svg class="activity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18m0-18 6 6m-6-6L6 9m6 12 6-6m-6 6-6-6"/></svg>
            </div>
            <div class="ide-sidebar">
              <div class="sidebar-section">Explorer</div>
              <div class="file-tree">
                <div class="tree-item active">📄 deployment.yaml</div>
                <div class="tree-item">📄 service.yaml</div>
                <div class="tree-item">📄 ingress.yaml</div>
                <div class="tree-item">📄 configmap.yaml</div>
              </div>
            </div>
            <div class="ide-editor-viewport">
              <div class="editor-tabs">
                <div class="editor-tab active">📄 deployment.yaml</div>
                <div class="editor-tab">📄 service.yaml</div>
              </div>
              <div class="code-canvas">
                <div class="c-line"><span class="c-num">01</span><span class="c-key">apiVersion:</span> <span class="c-val">apps/v1</span></div>
                <div class="c-line"><span class="c-num">02</span><span class="c-key">kind:</span> <span class="c-val">Deployment</span></div>
                <div class="c-line"><span class="c-num">03</span><span class="c-key">metadata:</span></div>
                <div class="c-line"><span class="c-num">04</span><span>  <span class="c-key">name:</span> <span class="c-str">web-api</span></span></div>
                <div class="c-line"><span class="c-num">05</span><span class="c-key">spec:</span></div>
                <div class="c-line highlight"><span class="c-num">06</span><span>  <span class="c-key">replicas:</span> <span class="c-val">3</span></span><span class="c-note"># Desired State</span></div>
                <div class="c-line"><span class="c-num">07</span><span>  <span class="c-key">selector:</span> <span class="c-val">{ matchLabels: { app: api } }</span></span></div>
                <div class="c-line"><span class="c-num">08</span><span>  <span class="c-key">template:</span></span></div>
                <div class="c-line"><span class="c-num">09</span><span>    <span class="c-key">spec:</span> <span class="c-val">containers: [{ name: server, image: nginx:alpine }]</span></span></div>
              </div>
              <div class="ide-terminal-drawer">
                <div class="term-drawer-header">
                  <span class="term-tab">TERMINAL</span>
                  <span class="term-status-badge">zsh · node 24</span>
                </div>
                <div class="term-drawer-body">
                  <div class="term-prompt-row">
                    <span class="t-user">admin@k8s:~$</span>
                    <span class="t-cmd">kubectl apply -f deployment.yaml && kubectl get pods</span>
                    <span class="t-cursor">█</span>
                  </div>
                  <div class="term-output-grid">
                    <div class="term-out-row"><span>web-api-7b8c-1</span><span style="color:#00F5A0">● Running</span><span>10.244.1.4</span></div>
                    <div class="term-out-row"><span>web-api-7b8c-2</span><span style="color:#00F5A0">● Running</span><span>10.244.2.8</span></div>
                    <div class="term-out-row"><span>web-api-7b8c-3</span><span style="color:#00F5A0">● Running</span><span>10.244.1.9</span></div>
                  </div>
                  <div>
                    <span class="term-pill-ok">✓ 3/3 Replicas Synchronized across Nodes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="ide-statusbar">
            <div class="stat-item active"><span>⎇ main</span><span>● 0 errors</span></div>
            <div class="stat-item"><span>Ln 6, Col 15</span><span>Spaces: 2</span><span>UTF-8</span><span>YAML</span></div>
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

fs.writeFileSync(path.join(testDir, 'index.html'), html);
fs.writeFileSync(path.join(testDir, 'hyperframes.json'), JSON.stringify({
  version: "1.0",
  id: "workbench-test",
  width: 1080,
  height: 1920,
  fps: 30,
  duration: 10,
  compositions: { main: { width: 1080, height: 1920, duration: 10, fps: 30 } }
}, null, 2));

console.log("Checking workbench composition...");
const res = execSync("npx hyperframes check --json", { cwd: testDir }).toString();
const parsed = JSON.parse(res);
console.log("OK:", parsed.ok);
console.log("Errors:", (parsed.lint?.findings || []).filter(f => f.severity === 'error'));
