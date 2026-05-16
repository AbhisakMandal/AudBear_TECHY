/* ============================================================
   BUILDER.JS — Core Build Resume logic
   ============================================================ */

'use strict';

// ── Global state ──
let currentTemplate = 't1';
let currentData     = { ...window.DEFAULT_RESUME_DATA };
let isEditing       = false;
let zoomLevel       = 0.40;
let photoDataUrl    = null;
let isPhotoEnabled  = true;
let renderTimer     = null;
const TEMPLATE_CACHE = {};

function openTemplateGallery() {
    window.location.href = 'audbear_techy_web_resume_templates.html'; 
}

function triggerImport() {
    document.getElementById('resume-import-input').click();
}

// Configure PDF.js Worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    showToast(`Reading ${extension.toUpperCase()}...`, "success");

    try {
        if (extension === 'json') {
            await processJsonImport(file);
        } else if (extension === 'pdf') {
            await processPdfImport(file);
        } else if (extension === 'docx') {
            await processDocxImport(file);
        } else {
            showToast("Unsupported file format.", "error");
        }
    } catch (err) {
        console.error("Import failed:", err);
        showToast("Import failed. Check file content.", "error");
    }
    
    // Reset input
    event.target.value = '';
}

function processJsonImport(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                applyImportedData(data);
                resolve();
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function processPdfImport(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(" ") + "\n";
    }
    const parsedData = window.parseVaultResume(fullText);
    applyImportedData(parsedData);
}

async function processDocxImport(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    const parsedData = window.parseVaultResume(result.value);
    applyImportedData(parsedData);
}

function applyImportedData(data) {
    if (!data || (!data.name && !data.title && !data.summary)) {
        showToast("No clear resume data found.", "error");
        return;
    }
    if (confirm("Importing will overwrite your current work. Continue?")) {
        // Deep merge or overwrite? Let's overwrite core fields
        currentData = { ...currentData, ...data };
        syncFormFromData();
        renderPreview(true);
        showToast("Resume data imported!", "success");
    }
}

function syncFormFromData() {
    // Basic fields
    const fields = ['name', 'title', 'summary', 'email', 'phone', 'location', 'resumeName'];
    fields.forEach(f => {
        const el = document.querySelector(`[oninput*="currentData.${f}"]`);
        if (el) el.value = currentData[f] || '';
    });
    
    const photoCheckbox = document.getElementById('togglePhotoCheckbox');
    if (photoCheckbox) photoCheckbox.checked = currentData.showPhoto !== false;

    // Complex lists
    renderSkillTags();
    renderLanguagesForm();
    renderExperienceForm();
    renderSTUDYForm();
    renderProjectsForm();
    renderAchievementsForm();
    
    // Update Document Title Pill
    const pillName = document.getElementById('current-resume-name');
    if (pillName) pillName.textContent = currentData.resumeName || "Untitled Resume";
}

function renderGenerativeFallback(wrap) {
    if (window.renderTemplate) {
        requestAnimationFrame(() => {
            wrap.innerHTML = window.renderTemplate(currentTemplate, currentData);
            requestAnimationFrame(() => {
                applyZoom();
                updateATS();
            });
        });
    } else {
        wrap.innerHTML = `<div style="padding:40px; color:#EF4444; text-align:center;">
            <h3>Design Error</h3>
            <p>Generative engine not available.</p>
        </div>`;
    }
}

function renameResume() {
    const pill = document.getElementById('resume-name-pill');
    if (!pill || pill.classList.contains('editing')) return;

    const currentName = currentData.resumeName || "Untitled Resume";
    
    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tb-name-input';
    input.value = currentName;
    
    // Find title value element
    const valueEl = pill.querySelector('.title-value');
    if (!valueEl) return;

    // Toggle state
    pill.classList.add('editing');
    
    // Store original display and hide it
    valueEl.style.display = 'none';
    
    // Add input
    pill.appendChild(input);
    input.focus();
    input.select();

    // Helper to finish editing
    const finishEdit = (save) => {
        if (!pill.classList.contains('editing')) return;
        
        let newName = input.value.trim();
        if (save && newName && newName !== currentName) {
            currentData.resumeName = newName;
            localStorage.setItem('audbear_techy_resume_data', JSON.stringify(currentData));
            showToast('Resume renamed!');
        }
        
        pill.classList.remove('editing');
        input.remove(); // Remove the input
        valueEl.style.display = 'block'; // Show the original back
        updateResumeNameDisplay();
    };

    // Events
    input.onkeydown = (e) => {
        if (e.key === 'Enter') finishEdit(true);
        if (e.key === 'Escape') finishEdit(false);
    };
    input.onblur = () => finishEdit(true);
    input.onclick = (e) => e.stopPropagation();
}

function updateResumeNameDisplay() {
    const name = currentData.resumeName || "Untitled Resume";
    const el = document.getElementById('current-resume-name');
    if (el) el.textContent = name;
}

/**
 * AI Redesign: Polish Content Tone
 */
async function aiRedesign() {
    showToast('AI Polishing Tone...');
    await new Promise(r => setTimeout(r, 1500));

    if (currentData.summary) currentData.summary = polishText(currentData.summary, "summary");
    if (currentData.experience) {
        currentData.experience.forEach(exp => {
            if (exp.bullets) exp.bullets = exp.bullets.map(b => polishText(b, "experience"));
        });
    }
    if (currentData.projects) {
        currentData.projects.forEach(proj => {
            if (proj.bullets) proj.bullets = proj.bullets.map(b => polishText(b, "experience"));
        });
    }

    populateForm();
    renderPreview(true);
    showToast('Tone Enhanced Successfully!');
}

function polishText(text, context) {
    if (!text || text.length < 5) return text;
    const replacements = {
        "led": "Spearheaded", "Managed": "Orchestrated", "built": "Architected",
        "made": "Engineered", "Worked": "Collaborated", "fixed": "Optimized",
        "improved": "Enhanced", "changed": "Transformed", "did": "Executed"
    };
    let polished = text;
    Object.keys(replacements).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        polished = polished.replace(regex, replacements[key]);
    });
    return polished;
}

// ── Default resume data ──
const DEFAULT_DATA = {
  name: 'Your Name', title: 'Professional Title', email: 'name@example.com',
  phone: '+1-000-000-0000', location: 'City, Country', summary: 'Professional summary...',
  skills: ['Skill 1', 'Skill 2'],
  experience: [{ title: 'Job Title', company: 'Company', date: 'Date', bullets: ['Responsibility'] }],
  studyContent: [{ degree: 'Degree', school: 'University', date: 'Date' }]
};

// ══════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════

window.initUnifiedBuilder = async function(template = 't1', data = null) {
    console.log("[AudBear] Initializing with template:", template);
    
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    // If it's a new resume (no ID), analyze the template for dummy data
    if (!idParam && !data) {
        await analyzeTemplateContent(template);
    } else if (data && typeof data === 'object') {
        currentData = JSON.parse(JSON.stringify(data));
        currentTemplate = template;
    } else if (idParam) {
        // Load specific resume from vault
        const resumes = JSON.parse(localStorage.getItem('audbear_resumes') || '[]');
        const found = resumes.find(r => r.id === idParam);
        if (found) {
            console.log("[AudBear] Loading from Vault ID:", idParam);
            currentData = JSON.parse(JSON.stringify(found.data));
            currentTemplate = found.template || template;
        }
    }

    if (!currentData) {
        currentData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    
    photoDataUrl = currentData.photo || null;
    isPhotoEnabled = currentData.showPhoto !== false;
    
    populateForm();
    renderPreview(true);
    applyZoom();
    updateATS();

    document.addEventListener('keydown', handleKeyboard);
    addFocusListeners();
    injectCropperHTML();
};

async function triggerDeepScan() {
    const overlay = document.getElementById('scanning-overlay');
    if (overlay) overlay.classList.add('active');
    
    try {
        const p = new URLSearchParams(window.location.search);
        const tid = p.get('template') || currentTemplate || 't1';
        
        // Wait a bit for the animation to feel real
        await new Promise(r => setTimeout(r, 2000));
        
        await analyzeTemplateContent(tid);
        populateForm();
        renderPreview(true);
        showToast("Deep Scan Complete!", "success");
    } finally {
        if (overlay) overlay.classList.remove('active');
    }
}

async function analyzeTemplateContent(templateId) {
    try {
        console.log("[AudBear] Starting Deep Analysis for template:", templateId);
        
        const num = templateId.replace(/\D/g, '');
        const formattedNum = num.padStart(2, '0');
        const path = `../../audbear_techy_web_templates/audbear_techy_web_resume/resume_template_html/resume_template_${formattedNum}.html`;
        const response = await fetch(path);
        if (!response.ok) throw new Error("Template not found at " + path);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const extractedData = JSON.parse(JSON.stringify(DEFAULT_DATA));
        
        // 0. Style Analysis (Every design, every style)
        const styles = {
            primaryColor: '#0F172A',
            fontFamily: "'Inter', sans-serif"
        };
        const sidebar = doc.querySelector('.sidebar, .header-bar, .cv-header');
        if (sidebar) {
            const styleTags = Array.from(doc.querySelectorAll('style')).map(s => s.textContent).join(' ');
            const colorMatch = styleTags.match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\))/);
            if (colorMatch) styles.primaryColor = colorMatch[1];
        }
        extractedData.styles = styles;

        // 1. Basic Info
        extractedData.name = doc.querySelector('h1, .name, .header-bar h1, .profile-info h1')?.textContent.trim() || extractedData.name;
        extractedData.title = doc.querySelector('.title, h3, .header-bar h3, .profile-info h3, h2:not(.section-title)')?.textContent.trim() || extractedData.title;
        
        const summarySec = Array.from(doc.querySelectorAll('section, .section, .sidebar-section, .content-section')).find(s => {
            const h = s.querySelector('h2, h3, .section-title, .sidebar-title')?.textContent.toLowerCase() || "";
            return h.includes('summary') || h.includes('about') || h.includes('profile');
        });
        extractedData.summary = summarySec?.querySelector('p, .summary-text, .sidebar-text')?.textContent.trim() || 
                               doc.querySelector('.summary-text, .sidebar-text, .gen-summary')?.textContent.trim() || "";
        
        const contactSelectors = ['.contact-item', '.contact-list span', '.header-contact span', '.contact-row span', '.contact-grid span', '.contact-row div', '.sidebar-text div'];
        const contactEls = doc.querySelectorAll(contactSelectors.join(','));
        contactEls.forEach(el => {
            const txt = el.textContent.trim();
            const icon = el.querySelector('i')?.className || el.parentElement.querySelector('i')?.className || "";
            
            if (icon.includes('envelope') || txt.includes('@')) extractedData.email = txt;
            else if (icon.includes('phone') || icon.includes('mobile') || txt.includes('+')) extractedData.phone = txt;
            else if (icon.includes('location') || icon.includes('map-marker') || icon.includes('house')) extractedData.location = txt;
            else if (icon.includes('linkedin')) extractedData.linkedin = txt;
            else if (icon.includes('github')) extractedData.github = txt;
            else if (icon.includes('globe') || icon.includes('earth') || txt.includes('www.')) extractedData.website = txt;
        });

        // 2. Photo Extraction (Professional Image)
        const img = doc.querySelector('img');
        if (img && img.src) {
            try {
                const rawSrc = img.getAttribute('src');
                const imgUrl = (rawSrc.startsWith('http') || rawSrc.startsWith('data:')) ? rawSrc : new URL(rawSrc, new URL(path, window.location.href)).href;
                const imgRes = await fetch(imgUrl);
                if (imgRes.ok) {
                    const blob = await imgRes.blob();
                    photoDataUrl = await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    extractedData.photo = photoDataUrl;
                }
            } catch (e) { console.warn("Photo analysis skipped:", e); }
        }

        // 3. Lists
        const extractList = (keywords, itemSelectors, titleSel, dateSel, bulletSel) => {
            const sec = Array.from(doc.querySelectorAll('section, .section, .content-section, .sidebar-section')).find(s => {
                const h = s.querySelector('h2, h3, .section-title, .sidebar-title')?.textContent.toLowerCase() || "";
                return keywords.some(k => h.includes(k));
            });
            if (!sec) return [];
            
            let items = [];
            for (const sel of itemSelectors) {
                items = Array.from(sec.querySelectorAll(sel));
                if (items.length > 0) break;
            }

            return items.map(item => {
                const res = {
                    title: item.querySelector(titleSel)?.textContent.trim() || "",
                    company: item.querySelector('.company, .company-info')?.textContent.trim() || "",
                    date: item.querySelector(dateSel)?.textContent.trim() || "",
                    bullets: Array.from(item.querySelectorAll(bulletSel)).map(b => b.textContent.trim())
                };
                if (res.bullets.length === 0) {
                    const p = item.querySelector('p:not(' + dateSel + '), .exp-text')?.textContent.trim();
                    if (p) res.bullets = [p];
                }
                return res;
            });
        };

        extractedData.experience = extractList(['experience', 'employment', 'history'], ['.exp-item', '.history-item', '.work-item'], 'h4', '.meta, .date', 'li');
        extractedData.studyContent = extractList(['education', 'study'], ['.edu-item', '.study-item', '.education-item'], 'h4', '.meta, .date', 'li');
        extractedData.projects = extractList(['projects'], ['.project-item', '.item'], 'h4', '.meta, .date', 'li, p');
        extractedData.achievements = extractList(['achievement', 'award'], ['.achievement-item', '.item'], 'h4', '', 'li, p');

        const skillsSec = Array.from(doc.querySelectorAll('section, .section, .sidebar-section')).find(s => {
            const h = s.querySelector('h2, h3, .section-title, .sidebar-title')?.textContent.toLowerCase() || "";
            return h.includes('skills') || h.includes('expertise');
        });
        if (skillsSec) {
            extractedData.skills = Array.from(skillsSec.querySelectorAll('li, .skill-name, .skill-item span:first-child, .skill-tag'))
                .map(s => s.textContent.trim())
                .filter(s => s.length > 0 && s.length < 50);
        }

        const langSec = Array.from(doc.querySelectorAll('section, .section, .sidebar-section')).find(s => {
            const h = s.querySelector('h2, h3, .section-title, .sidebar-title')?.textContent.toLowerCase() || "";
            return h.includes('language');
        });
        if (langSec) {
            extractedData.languages = Array.from(langSec.querySelectorAll('li, .lang-item, .language-item')).map(el => {
                const txt = el.textContent.trim();
                const parts = txt.split(/[:\-(]/);
                return {
                    name: parts[0]?.trim() || txt,
                    level: parts[1]?.replace(/[)]/g, '').trim() || 'Professional'
                };
            });
        }

        // 4. Sections Order
        const sections = Array.from(doc.querySelectorAll('section, .section, .content-section, .sidebar-section'));
        const order = [];
        sections.forEach(s => {
            const h = s.querySelector('h2, h3, .section-title, .sidebar-title')?.textContent.toLowerCase() || "";
            if (h.includes('experience') || h.includes('employment') || h.includes('history')) order.push('sec-experience');
            else if (h.includes('education') || h.includes('study')) order.push('sec-study');
            else if (h.includes('skills') || h.includes('expertise')) order.push('sec-skills');
            else if (h.includes('summary') || h.includes('about') || h.includes('profile')) order.push('sec-summary');
            else if (h.includes('projects')) order.push('sec-projects');
            else if (h.includes('language')) order.push('sec-languages');
            else if (h.includes('achievement') || h.includes('award')) order.push('sec-achievements');
        });

        const finalOrder = ['sec-personal', ...new Set(order)];
        arrangeFormsByOrder(finalOrder);

        currentData = extractedData;
        currentTemplate = templateId;
        console.log("[AudBear] Deep Scan Analysis Complete.");
        
    } catch (err) {
        console.error("Deep Scan Failed:", err);
        const templateDefaults = (window.RESUME_TEMPLATE_DATA && window.RESUME_TEMPLATE_DATA[templateId]) 
            ? window.RESUME_TEMPLATE_DATA[templateId] 
            : DEFAULT_DATA;
        currentData = JSON.parse(JSON.stringify(templateDefaults));
        currentData.template = templateId;
    }
}

function arrangeFormsByOrder(order) {
    const container = document.getElementById('builder-sections-container');
    if (!container) return;
    
    const allSections = ['sec-personal', 'sec-summary', 'sec-experience', 'sec-study', 'sec-skills', 'sec-languages', 'sec-projects', 'sec-achievements'];
    
    order.forEach(id => {
        const el = document.getElementById(id);
        if (el) container.appendChild(el);
    });
    
    allSections.forEach(id => {
        const el = document.getElementById(id);
        if (el && !order.includes(id)) container.appendChild(el);
    });
}

async function injectCropperHTML() {
    const container = document.getElementById('cropper-container-inject');
    if (!container) return;
    try {
        const response = await fetch('../audbear_techy_web_global_html/audbear_techy_web_cropper.html');
        if (response.ok) {
            container.innerHTML = await response.text();
        }
    } catch (err) { console.error("Cropper Injection Failed:", err); }
}

// ──────────────────────────────────────────────────────
// FORM POPULATION
// ──────────────────────────────────────────────────────

function populateForm() {
    const fields = ['name', 'title', 'email', 'phone', 'location', 'linkedin', 'github', 'website', 'summary'];
    fields.forEach(f => {
        const el = document.getElementById(`f-${f}`);
        if (el) el.value = currentData[f] || '';
    });

    updateAvatarPreview();
    renderSkillTags();
    renderLanguagesForm();
    renderExperienceForm();
    renderSTUDYForm();
    renderProjectsForm();
    renderAchievementsForm();

    const photoToggle = document.getElementById('togglePhotoCheckbox');
    if (photoToggle) photoToggle.checked = isPhotoEnabled;
}

function syncFormToData() {
    const fields = ['name', 'title', 'email', 'phone', 'location', 'linkedin', 'github', 'website', 'summary'];
    fields.forEach(f => {
        const el = document.getElementById(`f-${f}`);
        if (el) currentData[f] = el.value;
    });
}

// ──────────────────────────────────────────────────────
// PREVIEW ENGINE
// ──────────────────────────────────────────────────────

function renderPreview(immediate = false) {
    if (renderTimer) clearTimeout(renderTimer);
    if (immediate) executeRender();
    else renderTimer = setTimeout(executeRender, 50);
}

async function executeRender() {
    syncFormToData();
    updateResumeNameDisplay();
    
    const wrap = document.getElementById('resume-preview');
    if (!wrap) return;

    if (!window.TEMPLATES || window.TEMPLATES.length === 0) {
        console.warn("[AudBear] TEMPLATES not available yet. Retrying in 100ms...");
        setTimeout(executeRender, 100);
        return;
    }

    const tpl = window.TEMPLATES.find(t => t.id === currentTemplate) || window.TEMPLATES[0];
    console.log("[AudBear] Rendering Template:", tpl.id);

    if (tpl.htmlPath) {
        let html = TEMPLATE_CACHE[tpl.id];
        if (!html) {
            try {
                // Now relative to root due to <base> tag
                const finalPath = tpl.htmlPath;
                console.log("[AudBear] Fetching Template from:", finalPath);
                const response = await fetch(finalPath);
                if (!response.ok) throw new Error(`HTTP ${response.status} for ${finalPath}`);
                html = await response.text();
                TEMPLATE_CACHE[tpl.id] = html;
            } catch (err) {
                console.warn("[AudBear] Static template load failed, falling back to generative engine:", err);
                renderGenerativeFallback(wrap);
                return;
            }
        }

        requestAnimationFrame(() => {
            try {
                const processedHtml = injectDataIntoStaticTemplate(html, currentData);
                wrap.innerHTML = processedHtml;
                
                // Double frame wait for layout computation
                requestAnimationFrame(() => {
                    applyZoom();
                    updateATS();
                    console.log("[AudBear] Static Render Complete");
                });
            } catch (err) {
                console.error("[AudBear] Render Error:", err);
                showToast("Render failed. Falling back...", "error");
                renderGenerativeFallback(wrap);
            }
        });
    } else if (window.renderTemplate) {
        requestAnimationFrame(() => {
            wrap.innerHTML = window.renderTemplate(currentTemplate, currentData);
            applyZoom();
            updateATS();
        });
    }

    localStorage.setItem('audbear_techy_resume_data', JSON.stringify(currentData));
}

function injectDataIntoStaticTemplate(html, data) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const set = (selectors, val) => { 
        for (const sel of selectors) {
            const el = doc.querySelector(sel); 
            if (el) { el.textContent = val || ''; return; }
        }
    };
    
    // 1. Core Identity
    set(['h1', '.name', '.header-bar h1', '.profile-info h1', '.cv-header h1', '.name-title h1'], data.name);
    set(['h3', '.title', '.job-title', '.header-bar h3', '.profile-info h3', '.cv-header h3', '.gen-title'], data.title);
    
    // 2. Summary / Profile
    const summarySelectors = ['.summary-text', '.sidebar-text', '.profile-text', '.gen-summary', '.objective p', '.summary p'];
    const summarySec = Array.from(doc.querySelectorAll('section, .section, .sidebar-section, .content-section')).find(s => {
        const h = s.querySelector('h2, h3, .section-title, .sidebar-title')?.textContent.toLowerCase() || "";
        return h.includes('summary') || h.includes('about') || h.includes('profile');
    });
    if (summarySec) {
        const sEl = summarySec.querySelector('p, .summary-text, .sidebar-text');
        if (sEl) sEl.textContent = data.summary || '';
    } else {
        set(summarySelectors, data.summary);
    }

    // 3. Asset Rewriting
    doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && (src.includes('professional_images') || src.includes('template_professional_images'))) {
            const filename = src.split('/').pop();
            img.src = '../../audbear_techy_web_templates/audbear_techy_web_resume/resume_template_professional_images/' + filename;
        }
    });

    const photoImg = doc.querySelector('.profile-photo img, .gen-avatar, .photo img, .avatar-img');
    if (photoImg) {
        if (!isPhotoEnabled) {
            const wrap = photoImg.closest('.profile-photo, .gen-avatar-wrap, .photo-wrap, .photo, .avatar-box');
            if (wrap) wrap.style.display = 'none';
        } else if (photoDataUrl) {
            photoImg.src = photoDataUrl;
        }
    }

    // 4. Contact Intelligence
    doc.querySelectorAll('.contact-item, .gen-contact div, .contact-row span, .contact-info div, .contact-grid div').forEach(el => {
        const t = el.textContent.toLowerCase();
        let target = el.querySelector('span') || Array.from(el.childNodes).find(n => n.nodeType === 3 && n.textContent.trim().length > 0);
        
        const isEmail = t.includes('@') || el.querySelector('.fa-envelope');
        const isPhone = t.includes('+') || el.querySelector('.fa-phone') || (/[0-9]/.test(t) && t.length > 8);
        const isLoc = t.includes('location') || el.querySelector('.fa-location') || el.querySelector('.fa-map-marker');
        const isWeb = t.includes('www.') || t.includes('.com') || el.querySelector('.fa-globe') || el.querySelector('.fa-earth');

        if (isEmail) { if (target) target.textContent = data.email || ''; }
        else if (isPhone) { if (target) target.textContent = data.phone || ''; }
        else if (isLoc) { if (target) target.textContent = data.location || ''; }
        else if (isWeb) { if (target) target.textContent = data.website || ''; }
    });

    // 5. Intelligent List Rendering
    const renderList = (keywords, dataList, itemSelectors, titleSel, dateSel, bulletSel) => {
        const sec = Array.from(doc.querySelectorAll('.section, .content-section, .sidebar-section, section')).find(s => {
            const h = s.querySelector('h2, h3, .section-title, .sidebar-title');
            return h && keywords.some(k => h.textContent.toLowerCase().includes(k.toLowerCase()));
        });
        if (!sec) return;

        let itemTpl = null;
        for (const sel of itemSelectors) {
            itemTpl = sec.querySelector(sel);
            if (itemTpl) break;
        }
        if (!itemTpl) return;

        const container = itemTpl.parentElement;
        container.innerHTML = '';
        if (!dataList || dataList.length === 0) {
            sec.style.display = 'none';
            return;
        }
        sec.style.display = 'block';

        dataList.forEach(d => {
            const clone = itemTpl.cloneNode(true);
            const t = clone.querySelector(titleSel);
            if (t) t.textContent = d.title || d.degree || d.name || '';
            
            const c = clone.querySelector('.company, .company-info');
            if (c) c.textContent = d.company || d.school || '';

            const dt = clone.querySelector(dateSel);
            if (dt) dt.textContent = d.date || '';
            
            const b = clone.querySelector(bulletSel + ', .exp-text, .edu-text, .sidebar-text');
            if (b && d.bullets) {
                if (b.tagName === 'UL' || b.tagName === 'OL') {
                    b.innerHTML = d.bullets.map(p => `<li>${p}</li>`).join('');
                } else {
                    b.textContent = d.bullets.join(' • ');
                }
            }
            container.appendChild(clone);
        });
    };

    renderList(['experience', 'employment', 'history'], data.experience, ['.exp-item', '.history-item', '.work-item'], 'h4', '.meta, .date', 'ul');
    renderList(['education', 'study'], data.studyContent, ['.edu-item', '.study-item', '.education-item'], 'h4', '.meta, .date', 'ul, p');
    renderList(['projects'], data.projects, ['.project-item', '.item'], 'h4', '.meta, .date', 'p');
    renderList(['achievements', 'awards'], data.achievements, ['.achievement-item', '.item'], 'h4', '', 'p');
    
    // Languages
    const langSec = Array.from(doc.querySelectorAll('section, .section, .sidebar-section')).find(s => {
        const h = s.querySelector('h2, h3, .section-title, .sidebar-title')?.textContent.toLowerCase() || "";
        return h.includes('language');
    });
    if (langSec) {
        const lContainer = langSec.querySelector('ul, .languages-list, .sidebar-text');
        const lItem = langSec.querySelector('li, .lang-item, .language-item');
        if (lItem) {
            const container = lContainer || lItem.parentElement;
            container.innerHTML = '';
            if (!data.languages || data.languages.length === 0) {
                langSec.style.display = 'none';
            } else {
                langSec.style.display = 'block';
                data.languages.forEach(l => {
                    const clone = lItem.cloneNode(true);
                    // Handle complex language items (Name + Level)
                    const n = clone.querySelector('.lang-name, span:first-child') || clone;
                    const lv = clone.querySelector('.lang-level, span:last-child');
                    n.textContent = l.name;
                    if (lv && l.level) lv.textContent = l.level;
                    else if (l.level && n === clone) n.textContent = `${l.name} (${l.level})`;
                    container.appendChild(clone);
                });
            }
        }
    }
    
    // Skills Matrix
    const skillsSec = Array.from(doc.querySelectorAll('section, .section, .sidebar-section')).find(s => {
        const h = s.querySelector('h2, h3, .section-title, .sidebar-title')?.textContent.toLowerCase() || "";
        return h.includes('skills') || h.includes('expertise');
    });
    if (skillsSec) {
        let sContainer = skillsSec.querySelector('ul, ol, .skills-list, .skills-grid, .sidebar-text');
        const sItem = skillsSec.querySelector('li, .skill-item, .skill-tag');
        
        if (sItem) {
            if (!sContainer) sContainer = sItem.parentElement;
            sContainer.innerHTML = '';
            (data.skills || []).forEach(sk => {
                const clone = sItem.cloneNode(true);
                // Look for text element or bar
                const txt = clone.querySelector('span, .skill-name, .skill-header span') || clone;
                txt.textContent = sk;
                // If it has a progress bar, give it a random or default width
                const bar = clone.querySelector('.skill-bar-fill, .progress-fill');
                if (bar) bar.style.width = '85%';
                sContainer.appendChild(clone);
            });
        }
    }

    // Result Assembly
    const styles = Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('\n');
    const bodyContent = doc.body.innerHTML;
    const bodyClass = doc.body.className;
    const bodyStyle = doc.body.style.cssText;
    
    return `
        <div class="static-template-root ${bodyClass}" style="${bodyStyle}">
            <style>
                .static-template-root { 
                    min-width: 100%; 
                    min-height: 100%; 
                    background: #ffffff; /* Default background */
                    color: #0F172A; /* Default dark text, stops builder inheritance */
                    text-align: left;
                }
            </style>
            ${styles}
            ${bodyContent}
        </div>
    `;
}

// ── UI RENDERERS ──
function renderSkillTags() {
    const container = document.getElementById('skillTagsContainer');
    if (!container) return;
    container.innerHTML = (currentData.skills || []).map((s, i) =>
        `<span class="skill-tag">${escHtml(s)} <span class="skill-tag-rm" onclick="removeSkill(${i})">✕</span></span>`
    ).join('');
}
function addSkill() {
    const input = document.getElementById('skillInput');
    if (!input?.value.trim()) return;
    if (!currentData.skills) currentData.skills = [];
    currentData.skills.push(input.value.trim());
    input.value = ''; renderSkillTags(); renderPreview();
}
function removeSkill(i) { currentData.skills.splice(i, 1); renderSkillTags(); renderPreview(); }

function renderLanguagesForm() {
    const container = document.getElementById('languagesContainer');
    if (!container) return;
    container.innerHTML = (currentData.languages || []).map((l, i) => `
        <div class="item-card">
            <div class="form-row">
                <input class="form-input" value="${escHtml(l.name)}" oninput="currentData.languages[${i}].name=this.value; renderPreview()">
                <input class="form-input" value="${escHtml(l.level)}" oninput="currentData.languages[${i}].level=this.value; renderPreview()">
            </div>
            <button class="item-rm-btn" onclick="currentData.languages.splice(${i},1); renderLanguagesForm(); renderPreview()">✕</button>
        </div>`).join('');
}
function addLang() { if (!currentData.languages) currentData.languages = []; currentData.languages.push({name:'',level:''}); renderLanguagesForm(); }

function renderExperienceForm() {
    const container = document.getElementById('experienceContainer');
    if (!container) return;
    container.innerHTML = (currentData.experience || []).map((e, i) => `
        <div class="item-card">
            <div class="item-card-header"><span>Experience ${i+1}</span><button class="item-rm-btn" onclick="currentData.experience.splice(${i},1); renderExperienceForm(); renderPreview()">✕</button></div>
            <input class="form-input" placeholder="Title" value="${escHtml(e.title)}" oninput="currentData.experience[${i}].title=this.value; renderPreview()">
            <input class="form-input" placeholder="Company" value="${escHtml(e.company)}" oninput="currentData.experience[${i}].company=this.value; renderPreview()">
            <div class="bullet-list">${(e.bullets || []).map((b, bi) => `
                <div class="bullet-row">
                    <input class="form-input" value="${escHtml(b)}" oninput="currentData.experience[${i}].bullets[${bi}]=this.value; renderPreview()">
                    <button class="bullet-rm" onclick="currentData.experience[${i}].bullets.splice(${bi},1); renderExperienceForm(); renderPreview()">✕</button>
                </div>`).join('')}
            </div>
            <button class="add-bullet-btn" onclick="currentData.experience[${i}].bullets.push(''); renderExperienceForm()">+ Add Point</button>
        </div>`).join('');
}
function addExp() { if (!currentData.experience) currentData.experience = []; currentData.experience.push({title:'',company:'',bullets:['']}); renderExperienceForm(); }

function renderSTUDYForm() {
    const container = document.getElementById('studyContentContainer');
    if (!container) return;
    container.innerHTML = (currentData.studyContent || []).map((s, i) => `
        <div class="item-card">
            <div class="item-card-header"><span>Education ${i+1}</span><button class="item-rm-btn" onclick="currentData.studyContent.splice(${i},1); renderSTUDYForm(); renderPreview()">✕</button></div>
            <input class="form-input" placeholder="Degree" value="${escHtml(s.degree)}" oninput="currentData.studyContent[${i}].degree=this.value; renderPreview()">
            <input class="form-input" placeholder="School" value="${escHtml(s.school)}" oninput="currentData.studyContent[${i}].school=this.value; renderPreview()">
        </div>`).join('');
}
function addStudy() { if (!currentData.studyContent) currentData.studyContent = []; currentData.studyContent.push({degree:'',school:''}); renderSTUDYForm(); }

function renderProjectsForm() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;
    container.innerHTML = (currentData.projects || []).map((p, i) => `
        <div class="item-card">
            <div class="item-card-header"><span>Project ${i+1}</span><button class="item-rm-btn" onclick="currentData.projects.splice(${i},1); renderProjectsForm(); renderPreview()">✕</button></div>
            <input class="form-input" value="${escHtml(p.name)}" oninput="currentData.projects[${i}].name=this.value; renderPreview()">
        </div>`).join('');
}
function addProj() { if (!currentData.projects) currentData.projects = []; currentData.projects.push({name:''}); renderProjectsForm(); }

function renderAchievementsForm() {
    const container = document.getElementById('achievementsContainer');
    if (!container) return;
    container.innerHTML = (currentData.achievements || []).map((a, i) => `
        <div class="item-card">
            <input class="form-input" value="${escHtml(a.title)}" oninput="currentData.achievements[${i}].title=this.value; renderPreview()">
            <button class="item-rm-btn" onclick="currentData.achievements.splice(${i},1); renderAchievementsForm(); renderPreview()">✕</button>
        </div>`).join('');
}
function addAch() { if (!currentData.achievements) currentData.achievements = []; currentData.achievements.push({title:''}); renderAchievementsForm(); }

// ── UTILS ──
function applyZoom() {
    const wrap = document.getElementById('resume-preview');
    const container = document.getElementById('preview-content-wrapper');
    
    if (wrap) {
        wrap.style.transform = `scale(${zoomLevel})`;
        wrap.style.transformOrigin = 'top left';
        
        // Sync container size with scaled resume to fix scroll bounds
        if (container) {
            const w = wrap.offsetWidth;
            const h = wrap.offsetHeight;
            
            // Set the container to the visual (scaled) size
            container.style.width = (w * zoomLevel) + 'px';
            container.style.height = (h * zoomLevel) + 'px';
            
            // Because transform-origin is top-left, the scaled content
            // fits perfectly inside this newly sized container.
            container.style.display = 'block';
        }
    }
    
    const zv = document.getElementById('zoomValue');
    if (zv) zv.value = `${Math.round(zoomLevel * 100)}%`;
}
function zoomIn() { zoomLevel = Math.min(1.5, zoomLevel + 0.1); applyZoom(); }
function zoomOut() { zoomLevel = Math.max(0.3, zoomLevel - 0.1); applyZoom(); }
function handleZoomInput(v) { zoomLevel = parseInt(v)/100 || 0.6; applyZoom(); }

function showToast(msg, type = 'success') {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.className = 'active ' + type;
    t.innerHTML = `<i class="fa-solid ${type==='error'?'fa-circle-exclamation':'fa-circle-check'}"></i> <span>${msg}</span>`;
    setTimeout(() => t.classList.remove('active'), 3000);
}

function updateATS() {
    if (typeof window.calculateATS === 'function') window.calculateATS(currentData);
}

function openATSScore() {
    const modal = document.getElementById('ats-modal');
    const renderArea = document.getElementById('ats-modal-render');
    if (!modal || !renderArea) return;
    const report = window.calculateATS?.(currentData);
    if (!report) return;
    renderArea.innerHTML = `<div class="ats-modal-layout">Score: ${report.score}</div>`; 
    modal.style.display = 'flex';
}
function closeATSScore() { document.getElementById('ats-modal').style.display = 'none'; }

function updateAvatarPreview() {
    const img = document.getElementById('avatarImg');
    const span = document.getElementById('avatarInitials');
    if (photoDataUrl) { if (img) { img.src = photoDataUrl; img.style.display = 'block'; } if (span) span.style.display = 'none'; }
    else { if (img) img.style.display = 'none'; if (span) span.style.display = 'flex'; }
}
function triggerAvatarUpload() { document.getElementById('avatarFileInput').click(); }
function handleAvatarUpload(input) {
    if (input.files && input.files[0]) {
        if (window.handleBuilderPhotoEdit) {
            window.handleBuilderPhotoEdit(input.files[0]);
        } else {
            // Fallback if cropper not loaded
            const r = new FileReader();
            r.onload = e => { photoDataUrl = e.target.result; updateAvatarPreview(); renderPreview(); };
            r.readAsDataURL(input.files[0]);
        }
    }
}

/**
 * Cropper Callback
 */
window.updatePhotoInBuilder = function(croppedDataUrl, selectedShape) {
    photoDataUrl = croppedDataUrl;
    currentData.photo = photoDataUrl;
    currentData.photoShape = selectedShape; // Store shape metadata
    updateAvatarPreview();
    renderPreview(true);
    showToast("Photo updated!");
};
function removePhoto() {
    photoDataUrl = null;
    currentData.photo = null;
    document.getElementById('avatarFileInput').value = '';
    updateAvatarPreview();
    renderPreview();
    showToast('Photo removed');
}
function togglePhotoDisplay(c) { isPhotoEnabled = c; renderPreview(); }

function toggleSection(h) { h.parentElement.classList.toggle('open'); }
function addFocusListeners() {
    document.querySelectorAll('.form-input, .form-textarea').forEach(el => {
        el.addEventListener('focus', () => el.parentElement.classList.add('focused'));
        el.addEventListener('blur', () => el.parentElement.classList.remove('focused'));
    });
}
function handleKeyboard(e) { if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveResumeToVault(); } }
function escHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }

function toggleDownloadMenu() {
    const m = document.getElementById('download-menu');
    if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
}

function saveResumeToVault() {
    syncFormToData();
    
    // Validate name before saving
    const currentName = (currentData.resumeName || "").trim();
    if (!currentName || currentName.toLowerCase() === "untitled resume") {
        showToast("Please rename your resume before saving!", "error");
        renameResume();
        return;
    }
    
    let resumes = JSON.parse(localStorage.getItem('audbear_resumes') || '[]');
    const params = new URLSearchParams(window.location.search);
    let id = params.get('id') || 'res-' + Date.now();
    const now = new Date();
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const date = now.getDate();
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const dateStr = `${month} ${date}, ${year}\u00A0\u00A0at\u00A0\u00A0${hours}:${minutes}:${seconds} ${ampm}`;
    const entry = {
        id,
        name: currentData.resumeName || currentData.name || 'Untitled Resume',
        template: currentTemplate,
        lastModified: dateStr,
        photoDataUrl: photoDataUrl,
        isPhotoEnabled: isPhotoEnabled,
        data: JSON.parse(JSON.stringify(currentData))
    };
    const idx = resumes.findIndex(r => r.id === id);
    if (idx !== -1) resumes[idx] = entry; else resumes.push(entry);
    localStorage.setItem('audbear_resumes', JSON.stringify(resumes));
    showToast('Saved to Vault!');
}

function applyImportedData(data) {
    if (!data || (!data.name && !data.title && !data.summary)) {
        showToast("No clear resume data found.", "error");
        return;
    }
    if (confirm("Importing will overwrite your current work. Proceed with Deep Scan?")) {
        const overlay = document.getElementById('scanning-overlay');
        if (overlay) overlay.classList.add('active');
        
        setTimeout(() => {
            currentData = { ...currentData, ...data };
            if (data.photo) photoDataUrl = data.photo;
            
            populateForm();
            renderPreview(true);
            if (overlay) overlay.classList.remove('active');
            showToast("Imported & Scanned!", "success");
        }, 1500);
    }
}

async function resetToTemplateDefaults() {
    if (confirm("⚠️ WARNING: This will permanently erase all your current changes and reset the builder to the original template design. Are you absolutely sure you want to proceed?")) {
        localStorage.removeItem('audbear_techy_resume_data');
        const p = new URLSearchParams(window.location.search);
        const tid = p.get('template') || currentTemplate || 't1';
        
        const overlay = document.getElementById('scanning-overlay');
        if (overlay) overlay.classList.add('active');
        
        await new Promise(r => setTimeout(r, 1200));
        await initUnifiedBuilder(tid);
        
        if (overlay) overlay.classList.remove('active');
        showToast("Reset to template defaults!");
    }
}

// ── Global Exports ──
Object.assign(window, {
    openTemplateGallery, renameResume, aiRedesign, renderPreview, zoomIn, zoomOut, handleZoomInput,
    saveResumeToVault, addSkill, removeSkill, addLang, addExp, addStudy, addProj, addAch,
    openATSScore, closeATSScore, triggerAvatarUpload, handleAvatarUpload, removePhoto, togglePhotoDisplay,
    toggleSection, toggleDownloadMenu, resetToTemplateDefaults
});

document.addEventListener('DOMContentLoaded', async () => {
    const p = new URLSearchParams(window.location.search);
    const templateId = p.get('template') || 't1';
    
    // Safety: Wait for TEMPLATES if not ready
    if (!window.TEMPLATES) {
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            if (window.TEMPLATES || attempts > 20) {
                clearInterval(interval);
                await initUnifiedBuilder(templateId);
            }
        }, 50);
    } else {
        await initUnifiedBuilder(templateId);
    }
});
