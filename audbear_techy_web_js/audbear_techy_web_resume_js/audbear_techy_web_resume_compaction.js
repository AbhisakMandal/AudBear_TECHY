/* ============================================================
   COMPACTION.JS — Overflow detection + intelligent compaction
   ============================================================ */
'use strict';

// A4 at 96dpi ≈ 1122.52px — we use 1123 as the hard limit
const A4_HEIGHT_PX = 1123;

// Compaction levels: 0 = normal, 1 = light, 2 = medium, 3 = aggressive
const COMPACTION_LEVELS = [
  { label: 'Normal',     fontSize: 10,   sectionGap: 20, itemGap: 12, bulletSize: 9   },
  { label: 'Light',      fontSize: 9.5,  sectionGap: 16, itemGap: 9,  bulletSize: 8.5 },
  { label: 'Medium',     fontSize: 9,    sectionGap: 12, itemGap: 7,  bulletSize: 8   },
  { label: 'Aggressive', fontSize: 8.5,  sectionGap: 8,  itemGap: 5,  bulletSize: 7.5 },
];

let currentCompactionLevel = 0;

// ── Apply compaction CSS variables to the resume page element ──
function applyCompaction(level) {
  const lv = Math.max(0, Math.min(3, level));
  currentCompactionLevel = lv;
  const cfg = COMPACTION_LEVELS[lv];

  const page = document.querySelector('#resume-preview .resume-page');
  if (!page) return;

  page.style.setProperty('--base-font',    `${cfg.fontSize}px`);
  page.style.setProperty('--section-gap',  `${cfg.sectionGap}px`);
  page.style.setProperty('--item-gap',     `${cfg.itemGap}px`);
  page.style.setProperty('--bullet-size',  `${cfg.bulletSize}px`);

  // Also scale down known font size classes generically
  const style = document.getElementById('compaction-style') || (() => {
    const s = document.createElement('style');
    s.id = 'compaction-style';
    document.head.appendChild(s);
    return s;
  })();

  if (lv === 0) {
    style.textContent = '';
    return;
  }

  style.textContent = `
    #resume-preview .resume-page * {
      line-height: ${lv >= 2 ? '1.3' : '1.45'} !important;
    }
    #resume-preview .resume-page [class*="-sec"] {
      margin-bottom: ${cfg.sectionGap}px !important;
      margin-top: ${cfg.sectionGap}px !important;
    }
    #resume-preview .resume-page [class*="-exp-card"],
    #resume-preview .resume-page [class*="-exp-item"],
    #resume-preview .resume-page [class*="-proj-card"] {
      margin-bottom: ${cfg.itemGap}px !important;
    }
    #resume-preview .resume-page [class*="-exp-bullets"] li,
    #resume-preview .resume-page [class*="-proj-bullets"] li,
    #resume-preview .resume-page ul li {
      font-size: ${cfg.bulletSize}px !important;
      margin-bottom: 1px !important;
    }
    #resume-preview .resume-page [class*="-summary"],
    #resume-preview .resume-page [class*="-sec-title"] {
      font-size: ${cfg.fontSize + 1}px !important;
    }
  `;
}

function resetCompaction() {
  currentCompactionLevel = 0;
  applyCompaction(0);
}

// ── Check if the resume overflows A4 ──
function checkOverflow() {
  const preview = document.getElementById('resume-preview');
  if (!preview) return { overflowing: false, overflowPx: 0 };

  const page = preview.querySelector('.resume-page');
  if (!page) return { overflowing: false, overflowPx: 0 };

  // Get the unscaled scroll height
  const zoomEl = preview;
  const transform = zoomEl.style.transform || '';
  const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
  const scale = scaleMatch ? parseFloat(scaleMatch[1]) : 1;

  const rawHeight = page.scrollHeight;
  const overflowPx = rawHeight - A4_HEIGHT_PX;

  return {
    overflowing: overflowPx > 20, // 20px tolerance
    overflowPx: Math.max(0, overflowPx),
    currentLevel: currentCompactionLevel,
    canCompactMore: currentCompactionLevel < 3,
  };
}

// ── Build the compaction warning HTML for the right panel ──
function buildCompactionPanel(overflowInfo) {
  if (!overflowInfo.overflowing) {
    return `
      <div class="compaction-ok">
        <div class="compaction-ok-icon">✅</div>
        <div class="compaction-ok-text">Content fits on one page</div>
      </div>`;
  }

  const lvlBtns = COMPACTION_LEVELS.map((lv, i) => `
    <button class="compact-btn ${i === currentCompactionLevel ? 'active' : ''}"
      onclick="applyCompaction(${i}); renderRightPanel();">
      ${lv.label}
      <span class="compact-btn-sub">${lv.fontSize}pt · ${lv.sectionGap}px gaps</span>
    </button>`).join('');

  return `
    <div class="compaction-warning">
      <div class="compaction-warn-icon">⚠️</div>
      <div class="compaction-warn-text">
        Content overflows by <strong>~${Math.round(overflowInfo.overflowPx)}px</strong>
      </div>
      <div class="compaction-warn-sub">Select a compaction level to fit one page:</div>
    </div>
    <div class="compact-btn-group">${lvlBtns}</div>
    ${!overflowInfo.canCompactMore ? `<div class="compact-limit-note">Maximum compaction reached. Consider removing some content.</div>` : ''}`;
}

// ── Export ──
if (typeof window !== 'undefined') {
  window.checkOverflow      = checkOverflow;
  window.applyCompaction    = applyCompaction;
  window.resetCompaction    = resetCompaction;
  window.buildCompactionPanel = buildCompactionPanel;
  window.COMPACTION_LEVELS  = COMPACTION_LEVELS;
}
