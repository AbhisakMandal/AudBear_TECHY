/* ============================================================
   TEMPLATES.JS — Generative UI Template Engine
   ============================================================ */

'use strict';

const LAYOUTS = ['sidebar-left', 'sidebar-right', 'top-header', 'split-column', 'minimal'];
const FONTS = [
  "'Inter', sans-serif", 
  "'Playfair Display', serif", 
  "'JetBrains Mono', monospace",
  "'Roboto', sans-serif",
  "system-ui, sans-serif"
];

// Color palettes [primary, secondary, bg]
const PALETTES = [
  ['#0F172A', '#FF5252', '#FFFFFF'], // Dark slate / Red
  ['#2563EB', '#10B981', '#F8FAFC'], // Blue / Green
  ['#7C3AED', '#EC4899', '#FFFFFF'], // Purple / Pink
  ['#047857', '#F59E0B', '#FAFAFA'], // Emerald / Amber
  ['#111827', '#D4AF37', '#FFFFFF'], // Black / Gold
  ['#1E293B', '#38BDF8', '#F1F5F9'], // Navy / Sky
];

// ── 1. Define the 63 Templates with Structured Categories ──
const CAT_CONFIG = [
  { name: 'fresher', count: 14 },
  { name: 'certified', count: 12 },
  { name: 'intern', count: 10 },
  { name: 'professional', count: 15 },
  { name: 'executive', count: 12 }
];

const TEMPLATES = window.TEMPLATES = [];
let templateIdx = 1;

CAT_CONFIG.forEach(cat => {
  for (let i = 1; i <= cat.count; i++) {
    const tier = cat.name;
    const globalIdx = templateIdx++;
    const templateNum = globalIdx < 10 ? `0${globalIdx}` : globalIdx;
    const catNum = i < 10 ? `0${i}` : i;
    
    const layout = LAYOUTS[(globalIdx - 1) % LAYOUTS.length];
    const palette = PALETTES[(globalIdx - 1) % PALETTES.length];
    const font = FONTS[(globalIdx - 1) % FONTS.length];
    
    let mainOrder, sideOrder;
    if (tier === 'fresher' || tier === 'intern') {
      mainOrder = ['summary', 'study', 'projects', 'experience', 'achievements'];
      sideOrder = ['contact', 'skills', 'languages'];
    } else {
      mainOrder = ['summary', 'experience', 'projects', 'achievements', 'study'];
      sideOrder = ['contact', 'skills', 'languages'];
    }

    TEMPLATES.push({
      id: `t${globalIdx}`,
      category: tier,
      name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Template ${catNum}`,
      icon: ['✨', '🏅', '💼', '🚀', '👑'][(globalIdx - 1) % 5],
      previewImage: `../../audbear_techy_web_templates/audbear_techy_web_resume/resume_template_images/resume_template_${templateNum}.png`,
      htmlPath: `../../audbear_techy_web_templates/audbear_techy_web_resume/resume_template_html/resume_template_${templateNum}.html`,
      schema: {
        layout: layout,
        typography: {
          baseFont: font,
          headingFont: font,
          baseSize: "10px",
          headingSize: "28px"
        },
        colors: {
          primary: globalIdx === 1 ? '#134e4a' : palette[0],
          accent: globalIdx === 1 ? '#134e4a' : palette[1],
          background: palette[2],
          text: "#1E293B",
          sidebarBg: (layout.includes('sidebar') && globalIdx % 2 === 0) ? palette[0] : 'transparent',
          sidebarText: (layout.includes('sidebar') && globalIdx % 2 === 0) ? '#FFFFFF' : '#1E293B'
        },
        sections: {
          main: mainOrder,
          side: sideOrder
        },
        styles: {
          headerAlign: layout === 'minimal' ? 'center' : 'left',
          sectionTitleStyle: globalIdx % 2 === 0 ? 'underline' : 'box',
          headerType: (globalIdx === 1 || globalIdx % 7 === 0) ? 'floating-box' : 'standard'
        }
      }
    });
  }
});

// ── 2. Helper Functions ──
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderBullets(arr) {
  if (!arr || !arr.length) return '';
  return `<ul class="gen-bullets">${arr.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`;
}

function isSec(d, section) {
  if (!d.sections) return true;
  return d.sections[section] !== false;
}

// ── 3. Section Renderers ──
const SectionGenerators = {
  contact: (d, schema) => `
    <div class="gen-contact">
      ${d.phone ? `<div><i class="fas fa-phone"></i> ${esc(d.phone)}</div>` : ''}
      ${d.email ? `<div><i class="fas fa-envelope"></i> ${esc(d.email)}</div>` : ''}
      ${d.location ? `<div><i class="fas fa-map-marker-alt"></i> ${esc(d.location)}</div>` : ''}
      ${d.linkedin ? `<div><i class="fab fa-linkedin"></i> ${esc(d.linkedin)}</div>` : ''}
      ${d.github ? `<div><i class="fab fa-github"></i> ${esc(d.github)}</div>` : ''}
      ${d.website ? `<div><i class="fas fa-globe"></i> ${esc(d.website)}</div>` : ''}
    </div>
  `,
  skills: (d, schema) => `
    <div class="gen-skills">
      ${(d.skills||[]).map((s, i) => `
        <div class="gen-skill-bar-wrap">
          <span class="skill-name">${esc(s)}</span>
          <div class="skill-bar-outer">
            <div class="skill-bar-inner" style="width: ${80 + (i % 3) * 10}%"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `,
  languages: (d, schema) => `
    <div class="gen-langs">
      ${(d.languages||[]).map(l => `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:0.9em;"><span>${esc(l.name)}</span><span style="opacity:0.7">${esc(l.level)}</span></div>`).join('')}
    </div>
  `,
  summary: (d, schema) => d.summary ? `<p class="gen-summary" style="line-height:1.5;">${esc(d.summary)}</p>` : '',
  experience: (d, schema) => (d.experience||[]).map(e => `
    <div class="gen-item" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <strong style="font-size:1.1em;color:${schema.colors.primary}">${esc(e.title)}</strong>
        <span style="font-size:0.9em;opacity:0.8;">${esc(e.date)}</span>
      </div>
      <div style="font-weight:500;margin-bottom:4px;">${esc(e.company)} ${e.location ? `| ${esc(e.location)}` : ''}</div>
      ${renderBullets(e.bullets)}
    </div>
  `).join(''),
  projects: (d, schema) => (d.projects||[]).map(p => `
    <div class="gen-item" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <strong style="font-size:1.1em;color:${schema.colors.primary}">${esc(p.name)}</strong>
        <span style="font-size:0.9em;opacity:0.8;">${esc(p.date)}</span>
      </div>
      <div style="font-style:italic;margin-bottom:4px;font-size:0.95em;">${esc(p.description)}</div>
      ${renderBullets(p.bullets)}
    </div>
  `).join(''),
  study: (d, schema) => (d.studyContent||[]).map(s => `
    <div class="gen-item" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <strong style="font-size:1.1em;color:${schema.colors.primary}">${esc(s.degree)}</strong>
        <span style="font-size:0.9em;opacity:0.8;">${esc(s.date)}</span>
      </div>
      <div>${esc(s.school)} ${s.location ? `| ${esc(s.location)}` : ''}</div>
    </div>
  `).join(''),
  achievements: (d, schema) => (d.achievements||[]).map(a => `
    <div class="gen-item" style="margin-bottom:8px;">
      <strong style="color:${schema.colors.primary}">${esc(a.title)}</strong>
      ${a.description ? `<div style="font-size:0.9em;">${esc(a.description)}</div>` : ''}
    </div>
  `).join('')
};

// ── 4. Generative Engine ──
function renderTemplate(templateId, data) {
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const schema = template.schema;

    /* Header Styling Variants */
    const headerType = schema.styles.headerType || 'standard';

    // Avatar HTML (Moved up to fix scope)
    const avatarHtml = (data.showPhoto && data.photo) ? `
      <div class="gen-avatar-wrap">
        <img src="${data.photo}" class="gen-avatar">
      </div>
    ` : '';
    
    let headerHtml = '';
    if (headerType === 'floating-box') {
      headerHtml = `
        <div class="header-floating-box" style="
          background: #fff;
          margin: -20px 20px 30px 20px;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
          position: relative;
          z-index: 5;
          border: 1px solid rgba(0,0,0,0.05);
        ">
          <h1 class="gen-name" style="font-size: 36px; color: #0F172A; margin: 0;">${esc(data.name)}</h1>
          <div class="gen-title" style="font-size: 18px; color: ${schema.colors.accent}; font-weight: 700; margin-top: 5px;">${esc(data.title)}</div>
          <div style="margin-top: 15px; display: flex; gap: 20px; font-size: 11px; opacity: 0.8;">
            ${SectionGenerators.contact(data, schema)}
          </div>
        </div>
      `;
    } else {
      headerHtml = `
        <div class="gen-header" style="margin-bottom: 30px;">
          ${(schema.layout === 'top-header' || schema.layout === 'minimal') ? avatarHtml : ''}
          <h1 class="gen-name">${esc(data.name)}</h1>
          <div class="gen-title">${esc(data.title)}</div>
          ${(schema.layout === 'top-header' || schema.layout === 'minimal') ? 
            `<div style="margin-top:15px;">${SectionGenerators.contact(data, schema)}</div>` : ''}
        </div>
      `;
    }

    const css = `
      .gen-resume {
        width: 210mm;
        min-height: 297mm;
        font-family: ${schema.typography.baseFont};
        font-size: 10px;
        color: #1E293B;
        background: ${schema.colors.background};
        line-height: 1.5;
        box-sizing: border-box;
        margin: 0 auto;
        position: relative;
      }
      
      .top-strip {
        height: 60px;
        background: ${schema.colors.primary};
        width: 100%;
        position: absolute;
        top: 0; left: 0;
      }

      .layout-main-grid {
        display: grid;
        grid-template-columns: ${schema.layout === 'sidebar-left' ? '240px 1fr' : '1fr 240px'};
        min-height: 297mm;
        padding-top: ${headerType === 'floating-box' ? '40px' : '0'};
      }

      .gen-sidebar {
        background: ${schema.colors.sidebarBg || 'transparent'};
        padding: 40px 25px;
        border-right: ${schema.layout === 'sidebar-left' ? '1px solid rgba(0,0,0,0.05)' : 'none'};
        border-left: ${schema.layout === 'sidebar-right' ? '1px solid rgba(0,0,0,0.05)' : 'none'};
      }

      .gen-main {
        padding: 40px;
      }

      .section-title {
        font-size: 13px;
        font-weight: 800;
        color: ${schema.colors.primary};
        text-transform: uppercase;
        letter-spacing: 1.5px;
        margin-bottom: 12px;
        margin-top: 25px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .section-title::after {
        content: '';
        flex: 1;
        height: 1px;
        background: rgba(0,0,0,0.1);
      }

      .gen-skill-bar-wrap {
        margin-bottom: 10px;
      }
      .skill-name { font-weight: 700; font-size: 10px; margin-bottom: 4px; display: block; }
      .skill-bar-outer { height: 6px; background: rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden; }
      .skill-bar-inner { height: 100%; background: ${schema.colors.primary}; border-radius: 10px; }

      .gen-contact div { margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
      .gen-contact i { color: ${schema.colors.accent}; width: 14px; text-align: center; }

      .avatar-box {
        width: 140px; height: 140px;
        background: #fff;
        padding: 10px;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        margin-bottom: 30px;
      }
      .avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
    `;

  // Render Sections Helper
  const renderSections = (sectionsArr) => {
    return sectionsArr.map(sec => {
      if (!isSec(data, sec)) return '';
      // Only render if data exists
      if (sec === 'experience' && (!data.experience || !data.experience.length)) return '';
      if (sec === 'projects' && (!data.projects || !data.projects.length)) return '';
      if (sec === 'study' && (!data.studyContent || !data.studyContent.length)) return '';
      if (sec === 'achievements' && (!data.achievements || !data.achievements.length)) return '';
      if (sec === 'skills' && (!data.skills || !data.skills.length)) return '';
      if (sec === 'languages' && (!data.languages || !data.languages.length)) return '';
      if (sec === 'summary' && !data.summary) return '';

      const content = SectionGenerators[sec](data, schema);
      const title = sec === 'study' ? 'Education' : (sec.charAt(0).toUpperCase() + sec.slice(1));
      return `<div class="gen-section"><div class="section-title">${title}</div>${content}</div>`;
    }).join('');
  };



    const sidebarSections = renderSections(schema.sections.side);
    const mainSections = renderSections(schema.sections.main);

    return `
      <style>${css}</style>
      <div class="gen-resume">
        <div class="top-strip"></div>
        <div class="layout-main-grid">
          ${schema.layout === 'sidebar-left' ? `
            <div class="gen-sidebar">
              ${avatarHtml ? `<div class="avatar-box"><img src="${data.photo}" class="avatar-img"></div>` : ''}
              ${sidebarSections}
            </div>
            <div class="gen-main">
              ${headerHtml}
              ${mainSections}
            </div>
          ` : `
            <div class="gen-main">
              ${headerHtml}
              ${mainSections}
            </div>
            <div class="gen-sidebar">
              ${avatarHtml ? `<div class="avatar-box"><img src="${data.photo}" class="avatar-img"></div>` : ''}
              ${sidebarSections}
            </div>
          `}
        </div>
      </div>
    `;
}

// Export
if (typeof window !== 'undefined') {
  window.TEMPLATES = TEMPLATES;
  window.renderTemplate = renderTemplate;
  window.isSec = isSec;
}
