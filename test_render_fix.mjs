import fs from 'fs';
import path from 'path';

const workDir = '/Users/dheerajsrinivasa/Library/Application Support/YouTube Studio Pro/Workspace/Videos/hf_project_1794548466060';
const indexPath = path.join(workDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

// Fix root tag
html = html.replace(
  '<div id="root" class="clip"',
  '<div id="root" data-composition-id="main" data-width="1080" data-height="1920" class="clip"'
);

// Fix timeline registration
html = html.replace(
  'window.__timelines = { "root": tl };',
  'window.__timelines = window.__timelines || {}; window.__timelines["main"] = tl; tl.seek(0);'
);

// Remove css transitions
html = html.replace('transition: color 0.05s ease;', '');

fs.writeFileSync(indexPath, html);
console.log('Fixed index.html contract!');
