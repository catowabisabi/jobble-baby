const Jimp = require('jimp-compact');
import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_APP_STORE = 'assets/screenshots/app-store';
const OUTPUT_PLAY_STORE = 'assets/screenshots/play-store';

const TABS = [
  'allergens', 'appstore-checklist', 'bilateral-coordination', 'bonding-journal',
  'bottle-refusal', 'caregiver-fatigue', 'circadian', 'clinician-portal',
  'colic-relief', 'constellation', 'critical-periods', 'cry-analyzer',
  'doctor-visit', 'eight-month-storm', 'feeding-readiness', 'fontanelle-hydration',
  'fontanelle', 'gear-check', 'growth-montage', 'growth', 'gut-brain-axis',
  'habit-reset', 'hip-click', 'index', 'iot-security', 'jaundice', 'jet-lag',
  'launch-checklist', 'medicine-dose', 'milestones', 'milk-prep', 'milk-transfer',
  'monitor-correlation', 'moro-reflex', 'oral-motor', 'pediatric-report',
  'phototherapy-comfort', 'procedure-recovery', 'products', 'profile', 'projection',
  'reflex-integration', 'reflex-tracker', 'regression-navigator', 'safety-audit',
  'schedule', 'sensory-integration', 'shift-handoff', 'sleep-architecture',
  'sleep-association', 'sleep-debt', 'sleep-training', 'stress-cascade',
  'teething', 'thermal-regulation', 'tongue-tie', 'tracking', 'tummy-time',
  'vestibular-assessment', 'weaning-rash'
];

const APP_STORE_W = 1290;
const APP_STORE_H = 2796;
const PLAY_STORE_W = 1080;
const PLAY_STORE_H = 2340;

const BG_COLOR = 0xf8fafc;
const HEADER_COLOR = 0x3b82f6;
const FOOTER_COLOR = 0x1e293b;
const ACCENT_COLOR = 0x8b5cf6;
const WHITE = 0xffffff;
const MUTED = 0x94a3b8;
const CARD_BG = 0xe2e8f0;

function setPixel(img: any, x: number, y: number, color: number) {
  const w = img.getWidth();
  const h = img.getHeight();
  if (x >= 0 && x < w && y >= 0 && y < h) {
    img.setPixelColor(color, x, y);
  }
}

function fillRect(img: any, x: number, y: number, w: number, h: number, color: number) {
  const iw = img.getWidth();
  const ih = img.getHeight();
  const x1 = Math.max(0, x);
  const y1 = Math.max(0, y);
  const x2 = Math.min(iw, x + w);
  const y2 = Math.min(ih, y + h);
  for (let py = y1; py < y2; py++) {
    for (let px = x1; px < x2; px++) {
      img.setPixelColor(color, px, py);
    }
  }
}

function drawCircle(img: any, cx: number, cy: number, r: number, color: number) {
  for (let angle = 0; angle < 360; angle += 2) {
    const rad = (angle * Math.PI) / 180;
    const px = Math.round(cx + r * Math.cos(rad));
    const py = Math.round(cy + r * Math.sin(rad));
    setPixel(img, px, py, color);
  }
}

function drawTabPlaceholder(img: any, tabName: string) {
  const w = img.getWidth();
  const h = img.getHeight();

  fillRect(img, 0, 0, w, h, BG_COLOR);

  const headerH = Math.floor(h * 0.1);
  fillRect(img, 0, 0, w, headerH, HEADER_COLOR);

  const footerH = Math.floor(h * 0.08);
  fillRect(img, 0, h - footerH, w, footerH, FOOTER_COLOR);

  const cardW = Math.floor(w * 0.85);
  const cardH = Math.floor(h * 0.22);
  const cardX = Math.floor((w - cardW) / 2);
  const cardY = Math.floor(h * 0.18);
  fillRect(img, cardX, cardY, cardW, cardH, WHITE);

  const innerCardW = Math.floor(w * 0.75);
  const innerCardH = Math.floor(h * 0.1);
  const innerCardX = Math.floor((w - innerCardW) / 2);
  const innerCardY = cardY + Math.floor((cardH - innerCardH) / 2);
  fillRect(img, innerCardX, innerCardY, innerCardW, innerCardH, CARD_BG);

  const logoSize = Math.floor(Math.min(w, h) * 0.1);
  const logoX = Math.floor((w - logoSize) / 2);
  const logoY = Math.floor(h * 0.5);
  drawCircle(img, Math.floor(w / 2), logoY, Math.floor(logoSize / 2), HEADER_COLOR);

  const dotSize = Math.max(6, Math.floor(logoSize * 0.12));
  const dotSpacing = dotSize * 4;
  const dotsY = logoY;
  for (let i = 0; i < 3; i++) {
    const dotX = Math.floor(w / 2) + (i - 1) * dotSpacing;
    fillRect(img, dotX - Math.floor(dotSize / 2), dotsY - Math.floor(dotSize / 2), dotSize, dotSize, WHITE);
  }

  const labelY = logoY + Math.floor(logoSize / 2) + Math.floor(h * 0.025);
  const labelW = Math.floor(w * 0.65);
  const labelH = Math.floor(h * 0.035);
  const labelX = Math.floor((w - labelW) / 2);
  fillRect(img, labelX, labelY, labelW, labelH, CARD_BG);

  const subLabelY = labelY + labelH + Math.floor(h * 0.012);
  const subLabelW = Math.floor(w * 0.45);
  const subLabelH = Math.floor(h * 0.022);
  const subLabelX = Math.floor((w - subLabelW) / 2);
  fillRect(img, subLabelX, subLabelY, subLabelW, subLabelH, CARD_BG);

  const featureY = Math.floor(h * 0.65);
  const featureH = Math.floor(h * 0.16);
  const featureW = Math.floor((cardW - 40) / 3);
  for (let i = 0; i < 3; i++) {
    const featureX = cardX + 10 + i * (featureW + 10);
    fillRect(img, featureX, featureY, featureW, featureH, CARD_BG);
  }

  const cornerSize = Math.floor(Math.min(w, h) * 0.04);
  fillRect(img, 0, 0, cornerSize, 4, ACCENT_COLOR);
  fillRect(img, 0, 0, 4, cornerSize, ACCENT_COLOR);
  fillRect(img, w - cornerSize, 0, cornerSize, 4, ACCENT_COLOR);
  fillRect(img, w - 4, 0, 4, cornerSize, ACCENT_COLOR);
  fillRect(img, 0, h - 4, cornerSize, 4, ACCENT_COLOR);
  fillRect(img, 0, h - cornerSize, 4, cornerSize, ACCENT_COLOR);
  fillRect(img, w - cornerSize, h - 4, cornerSize, 4, ACCENT_COLOR);
  fillRect(img, w - 4, h - cornerSize, 4, cornerSize, ACCENT_COLOR);

  const badgeW = Math.floor(w * 0.22);
  const badgeH = Math.floor(h * 0.03);
  const badgeX = w - badgeW - Math.floor(w * 0.04);
  const badgeY = Math.floor(h * 0.012);
  fillRect(img, badgeX, badgeY, badgeW, badgeH, MUTED);

  const storeW = Math.floor(w * 0.12);
  const storeH = Math.floor(h * 0.022);
  const storeX = Math.floor(w * 0.04);
  const storeY = Math.floor(h * 0.012);
  fillRect(img, storeX, storeY, storeW, storeH, MUTED);
}

async function generatePlaceholder(tabName: string, width: number, height: number, outputPath: string): Promise<void> {
  const img = new Jimp(width, height, BG_COLOR);
  drawTabPlaceholder(img, tabName);
  await img.write(outputPath);
  process.stdout.write('.');
}

async function main(): Promise<void> {
  const dirs = [OUTPUT_APP_STORE, OUTPUT_PLAY_STORE];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  process.stdout.write(`Generating ${TABS.length} tabs x 2 stores...`);
  for (const tab of TABS) {
    await generatePlaceholder(tab, APP_STORE_W, APP_STORE_H, path.join(OUTPUT_APP_STORE, `${tab}.png`));
    await generatePlaceholder(tab, PLAY_STORE_W, PLAY_STORE_H, path.join(OUTPUT_PLAY_STORE, `${tab}.png`));
  }

  console.log(' Done!');
  const appCount = fs.readdirSync(OUTPUT_APP_STORE).filter(f => f.endsWith('.png')).length;
  const playCount = fs.readdirSync(OUTPUT_PLAY_STORE).filter(f => f.endsWith('.png')).length;
  console.log(`App Store: ${appCount} screenshots (${APP_STORE_W}x${APP_STORE_H})`);
  console.log(`Play Store: ${playCount} screenshots (${PLAY_STORE_W}x${PLAY_STORE_H})`);
}

main().catch(console.error);