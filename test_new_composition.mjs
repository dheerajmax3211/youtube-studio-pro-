import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PRESET_THEMES, resolveTheme, buildHyperFramesProject } from './engines/generator/hyperframes_engine.mjs';

const workDir = '/Users/dheerajsrinivasa/Library/Application Support/YouTube Studio Pro/Workspace/Videos/hf_test_creator_theme';
fs.mkdirSync(workDir, { recursive: true });

// Copy audio and assets from the previous project
const srcDir = '/Users/dheerajsrinivasa/Library/Application Support/YouTube Studio Pro/Workspace/Videos/hf_project_1794578998099';
fs.cpSync(path.join(srcDir, 'assets'), path.join(workDir, 'assets'), { recursive: true });

const words = JSON.parse(fs.readFileSync(path.join(srcDir, 'assets/audio/transcript.json'), 'utf-8'));
const totalDuration = 86.73;

// Diverse creator storyboard with rich archetypes
const storyboard = {
  title: 'The 2026 Homeownership Trap',
  tagline: 'FINANCIAL BLUEPRINT',
  bgm_mood: 'ambient_suspense',
  beats: [
    {
      anchor_phrase: 'buying a house in your twenties',
      type: 'stat_hero',
      eyebrow: '2026 REALITY',
      number: '7.5%',
      unit: 'MORTGAGE RATE',
      label: 'HISTORIC PEAK FINANCIAL BURDEN',
      subtitle: 'What looks like adulting could be your biggest financial trap.'
    },
    {
      anchor_phrase: 'rules of the game are changing',
      type: 'kinetic_slam',
      eyebrow: 'MARKET SHIFT',
      headline: 'THE NEW TRAP',
      highlight_word: 'EXPOSED',
      punchline: 'Turning dream homes into financial servitude.'
    },
    {
      anchor_phrase: 'Interest rates are projected to remain',
      type: 'split_contrast',
      eyebrow: 'FINANCIAL COMPARISON',
      left_title: 'BUYING NOW',
      left_text: 'Fixed high interest, zero mobility, heavy property tax liabilities.',
      right_title: 'RENT & REINVEST',
      right_text: 'Liquid cashflow, index fund compounding, total geographic freedom.'
    },
    {
      anchor_phrase: 'maintenance, property taxes, and insurance',
      type: 'data_grid',
      eyebrow: 'HIDDEN COSTS',
      title: 'DRAINING YOUR WEALTH',
      metrics: [
        { label: 'Mortgage Rate', value: '7.5%' },
        { label: 'Property Tax', value: '+14%' },
        { label: 'HOA & Repair', value: '$850/mo' },
        { label: 'Liquidity', value: '0%' }
      ]
    },
    {
      anchor_phrase: 'Renting is not throwing money away',
      type: 'roadmap_checklist',
      eyebrow: 'THE WEALTH BLUEPRINT',
      title: 'SURGICAL CAPITAL PROTOCOL',
      items: [
        'Automate 30% of income directly into diversified index funds',
        'Keep emergency runway liquid in high-yield reserves',
        'Maintain zero debt burden for maximum career agility'
      ]
    },
    {
      anchor_phrase: 'freedom to move, to invest in assets',
      type: 'kinetic_slam',
      eyebrow: 'CLOSING TRUTH',
      headline: 'TRUE FREEDOM',
      highlight_word: 'FLEXIBILITY',
      punchline: 'True wealth is options, not 30 years of trapped equity.'
    }
  ]
};

console.log('Testing buildHyperFramesProject with theme "warm_creator"...');
buildHyperFramesProject(storyboard, words, totalDuration, workDir, {
  avatar: true,
  avatarPos: 'bottom_right',
  bgmMood: 'ambient_suspense',
  noBgm: false,
  theme: 'warm_creator',
  topic: 'The 2026 Homeownership Trap'
});

console.log('Validating with npx hyperframes check...');
const ENV_PATH = `/Users/dheerajsrinivasa/.local/bin:/opt/homebrew/bin:/usr/local/bin:${process.env.PATH}`;
const checkRes = execSync('npx hyperframes check --json', {
  cwd: workDir,
  env: { ...process.env, PATH: ENV_PATH }
}).toString();

console.log('Check result:', checkRes);
