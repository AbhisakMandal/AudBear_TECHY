/* ============================================================
   AUDBEAR TECHY — VAULT ENGINE
   ============================================================ */

const TYPE_LIMITS = {
    all: 8,
    resume: 3,
    vcard: 2,
    invoice: 3,
    imported: 2 
};
let pendingDeleteId = null;
let currentExportId = null;
let currentViewId = null;
let selectedIds = new Set();

/**
 * Get a human-friendly template name from template ID
 */
function getTemplateName(templateId) {
    if (!templateId) return 'Unknown Template';
    const num = templateId.replace(/\D/g, '');
    if (num) return `Template ${num.padStart(2, '0')}`;
    return templateId;
}

/**
 * Load and render the vault
 */
function loadVault() {
    const list = document.getElementById('resume-list');
    const meterEl = document.getElementById('slots-meter');

    // Clear selection on filter/reload
    selectedIds.clear();
    updateBulkBar();
    const filterItems = document.querySelectorAll('.filter-item');
    const currentFilter = document.querySelector('.filter-item.active')?.dataset.filter || 'all';

    list.innerHTML = '';

    const counts = { all: 0, resume: 0, vcard: 0, invoice: 0, imported: 0 };

    let resumes = [];
    const savedList = localStorage.getItem('audbear_resumes');

    if (savedList) {
        resumes = JSON.parse(savedList);
    } else {
        const legacy = localStorage.getItem('audbear_techy_resume_data');
        if (legacy) {
            const data = JSON.parse(legacy);
            resumes = [{
                id: 'legacy-1',
                name: data.resumeName || data.name || 'Untitled Resume',
                template: data.templateId || 't1',
                lastModified: (() => {
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
                    return `${month} ${date}, ${year}\u00A0\u00A0at\u00A0\u00A0${hours}:${minutes}:${seconds} ${ampm}`;
                })(),
                data: data
            }];
            localStorage.setItem('audbear_resumes', JSON.stringify(resumes));
        }
    }

    const currentLimit = TYPE_LIMITS[currentFilter] || 5;
    const typeCount = currentFilter === 'all' ? resumes.length : resumes.filter(r => (r.type || 'resume') === currentFilter).length;

    // Calculate counts
    resumes.forEach(res => {
        counts.all++;
        let type = res.type || 'resume';
        // Legacy mapping
        if (type === 'gst') type = 'invoice';
        if (type === 'unsaved') type = 'imported';

        if (counts[type] !== undefined) counts[type]++;
    });

    // Update count labels
    Object.keys(counts).forEach(key => {
        const el = document.getElementById(`count-${key}`);
        if (el) {
            const max = TYPE_LIMITS[key];
            el.innerHTML = `${counts[key]} / <span class="limit-val">${max}</span>`;
        }

        // Update detailed status card counts
        const statEl = document.getElementById(`count-stat-${key}`);
        if (statEl) statEl.innerText = counts[key];
    });

    // Update global meter based on total documents (MAX 8)
    const globalCount = resumes.length;
    const globalLimit = TYPE_LIMITS.all;
    const percent = Math.min((globalCount / globalLimit) * 100, 100);
    
    if (meterEl) {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light';
        meterEl.style.width = percent + '%';
        if (globalCount >= globalLimit) meterEl.style.background = '#EF4444';
        else if (percent >= 80) meterEl.style.background = '#F59E0B';
        else meterEl.style.background = isLight ? '#B45309' : 'var(--builder-accent)';
    }

    // Filter resumes
    const filteredResumes = currentFilter === 'all' ? resumes : resumes.filter(r => {
        let t = r.type || 'resume';
        if (t === 'gst') t = 'invoice';
        if (t === 'unsaved') t = 'imported';
        return t === currentFilter;
    });

    // Prepend Upload Card (Only in 'all' or 'resume' filters for now)
    if (currentFilter === 'all' || currentFilter === 'resume') {
        const uploadCard = document.createElement('div');
        uploadCard.className = 'upload-card';
        uploadCard.innerHTML = `
            <div class="upload-icon-circle">
                <i class="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <div class="upload-title">Import Document</div>
            <div class="upload-desc">Import your existing PDF or JSON resume to manage it here.</div>
        `;
        uploadCard.onclick = () => {
            triggerImport();
        };
        list.appendChild(uploadCard);
    }

    filteredResumes.forEach((res, index) => {
        const card = document.createElement('div');
        const type = res.type || 'resume';
        card.className = `doc-card doc-card--${type}`;
        card.id = `card-${res.id}`;
        card.style.animationDelay = `${index * 0.08}s`;
        
        // Add card-wide selection except for buttons
        card.onclick = (e) => {
            if (e.target.closest('.doc-btn')) return;
            toggleCardSelection(e, res.id);
        };

        const templateLabel = getTemplateName(res.template);
        const docName = res.name || res.data?.resumeName || res.data?.name || 'Untitled Resume';
        const lastMod = res.lastModified || 'N/A';

        // Icon Mapping
        let typeIcon = 'fa-file-invoice';
        if (type === 'vcard') typeIcon = 'fa-id-card';
        else if (type === 'invoice' || type === 'gst') typeIcon = 'fa-file-invoice-dollar';
        else if (type === 'imported' || type === 'unsaved') typeIcon = 'fa-file-import';

        card.innerHTML = `
            <div class="card-selection-wrap">
                <div class="selection-tick"><i class="fa-solid fa-circle-check"></i></div>
            </div>
            <div class="doc-card-top">
                <div class="doc-icon"><i class="fa-solid ${typeIcon}"></i></div>
                <div class="doc-info">
                    <div class="doc-name" title="${docName}">${docName}</div>
                    <div class="doc-meta">
                        <span><i class="fa-regular fa-clock"></i> ${lastMod}</span>
                        <span class="doc-template-badge"><i class="fa-solid fa-palette"></i> ${templateLabel}</span>
                    </div>
                </div>
            </div>
            <div class="doc-actions">
                <button class="doc-btn primary" onclick="editResume('${res.id}')">
                    <i class="fa-solid fa-pen-to-square"></i> Edit
                </button>
                <button class="doc-btn view" onclick="openView('${res.id}')">
                    <i class="fa-solid fa-eye"></i> View
                </button>
                <button class="doc-btn secondary" onclick="openExport('${res.id}')">
                    <i class="fa-solid fa-download"></i> Save
                </button>
                <button class="doc-btn danger" id="del-btn-${res.id}" onclick="confirmDelete('${res.id}')">
                    <i class="fa-solid fa-trash"></i> Delete
                </button>
            </div>
        `;
        list.appendChild(card);
    });

    // ── Create New Slots (Smart System) ──
    if (currentFilter === 'all') {
        const tools = [
            { id: 'resume', label: 'Resume / CV', icon: 'fa-file-invoice', url: '../audbear_techy_web_resume_html/audbear_techy_web_resume_templates.html', locked: false },
            { id: 'vcard', label: 'Visiting Card', icon: 'fa-id-card', url: '#', locked: true },
            { id: 'invoice', label: 'Invoices', icon: 'fa-file-invoice-dollar', url: '#', locked: true }
        ];

        let slotsToFill = globalLimit - globalCount;
        let animationIdx = filteredResumes.length;

        // We want to show at least one of each tool if room exists and category not full
        tools.forEach(tool => {
            const typeCount = resumes.filter(r => (r.type || 'resume') === tool.id).length;
            const typeLimit = TYPE_LIMITS[tool.id];

            if (slotsToFill > 0 && typeCount < typeLimit) {
                const slot = document.createElement('div');
                slot.className = 'empty-slot';
                if (tool.locked) slot.classList.add('locked');
                
                slot.style.animationDelay = `${animationIdx * 0.08}s`;
                slot.onclick = () => { if (!tool.locked && tool.url !== '#') window.location.href = tool.url; };
                
                slot.innerHTML = `
                    <div class="empty-slot-icon">
                        <div class="icon-stack">
                            <i class="fa-solid ${tool.icon} main-icon"></i>
                            <i class="fa-solid fa-plus plus-icon"></i>
                        </div>
                    </div>
                    <div class="empty-label">Create ${tool.label}</div>
                    <div class="empty-sublabel">${tool.locked ? 'Coming Soon' : 'Start a new project'}</div>
                    ${tool.locked ? '<i class="fa-solid fa-lock lock-indicator"></i>' : ''}
                `;
                list.appendChild(slot);
                slotsToFill--;
                animationIdx++;
            }
        });
    } else if (currentFilter !== 'imported') {
        const currentLimit = TYPE_LIMITS[currentFilter] || 5;
        const typeCount = resumes.filter(r => {
            let t = r.type || 'resume';
            if (t === 'gst') t = 'invoice';
            if (t === 'unsaved') t = 'imported';
            return t === currentFilter;
        }).length;
        const globalRemaining = globalLimit - globalCount;
        
        // Only show slots if both category and global limits allow
        const slotsToFill = Math.min(currentLimit - typeCount, globalRemaining);
        
        for (let i = 0; i < slotsToFill; i++) {
            const slot = document.createElement('div');
            slot.className = 'empty-slot';
            slot.style.animationDelay = `${(filteredResumes.length + i) * 0.08}s`;
            
            let targetUrl = '../audbear_techy_web_resume_html/audbear_techy_web_resume_templates.html';
            let label = 'Create New Resume';
            let icon = 'fa-file-invoice';
            
            if (currentFilter === 'vcard') { label = 'Create Visiting Card'; icon = 'fa-id-card'; }
            else if (currentFilter === 'invoice') { label = 'Create New Invoice'; icon = 'fa-file-invoice-dollar'; }
            else if (currentFilter === 'resume') { label = 'Create New Resume'; icon = 'fa-file-invoice'; }

            slot.onclick = () => { if (targetUrl !== '#') window.location.href = targetUrl; };
            slot.innerHTML = `
                <div class="empty-slot-icon">
                    <div class="icon-stack">
                        <i class="fa-solid ${icon} main-icon"></i>
                        <i class="fa-solid fa-plus plus-icon"></i>
                    </div>
                </div>
                <div class="empty-label">${label}</div>
                <div class="empty-sublabel">Select a template to get started</div>
            `;
            list.appendChild(slot);
        }
    }
}

// ── Selection Logic ──
window.toggleCardSelection = (event, id) => {
    event.stopPropagation();
    const card = document.getElementById(`card-${id}`);
    if (card) {
        if (card.classList.contains('selected')) {
            card.classList.remove('selected');
            selectedIds.delete(id);
        } else {
            card.classList.add('selected');
            selectedIds.add(id);
        }
        updateBulkBar();
    }
};

function updateBulkBar() {
    const bar = document.getElementById('bulk-delete-bar');
    const countEl = document.getElementById('selected-count');
    if (!bar || !countEl) return;
    
    const count = selectedIds.size;
    if (count > 1) {
        countEl.innerText = count;
        bar.classList.add('active');
    } else {
        bar.classList.remove('active');
    }
}

window.deleteSelectedDocuments = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    
    const countEl = document.getElementById('bulk-delete-count');
    const modal = document.getElementById('bulk-delete-modal');
    if (countEl && modal) {
        countEl.innerText = count;
        modal.classList.add('active');
    }
};

window.closeBulkDelete = () => {
    const modal = document.getElementById('bulk-delete-modal');
    if (modal) modal.classList.remove('active');
};

window.executeBulkDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    
    let resumes = JSON.parse(localStorage.getItem('audbear_resumes') || '[]');
    resumes = resumes.filter(r => !selectedIds.has(r.id));
    localStorage.setItem('audbear_resumes', JSON.stringify(resumes));
    
    selectedIds.clear();
    updateBulkBar();
    loadVault();
    closeBulkDelete();
    showToast(`Successfully deleted ${count} documents.`);
};

// ── Filter Interaction ──
document.addEventListener('click', (e) => {
    const filterItem = e.target.closest('.filter-item');
    if (filterItem) {
        document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
        filterItem.classList.add('active');
        loadVault();
    }
});

// ── Navigation & Modals ──
window.editResume = (id) => {
    if (id === 'legacy-1') {
        window.location.href = '../audbear_techy_web_resume_html/audbear_techy_web_resume_builder.html';
    } else {
        window.location.href = `../audbear_techy_web_resume_html/audbear_techy_web_resume_builder.html?id=${id}`;
    }
};

window.openView = async (id) => {
    currentViewId = id;
    const resumes = JSON.parse(localStorage.getItem('audbear_resumes') || '[]');
    const res = resumes.find(r => r.id === id);
    if (!res) return;

    // Use static title
    document.getElementById('view-modal-title').textContent = 'Professional Viewer';
    document.getElementById('view-edit-btn').onclick = () => editResume(id);

    const body = document.getElementById('view-modal-body');
    const frame = document.getElementById('view-resume-frame');
    
    // Premium Loading State
    body.innerHTML = `
        <div class="loading-preview" style="display: flex; flex-direction: column; align-items: center; gap: 20px; color: #94a3b8; font-weight: 600;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 40px; color: #10B981;"></i>
            <span>Synchronizing Document Output...</span>
        </div>
    `;
    
    document.getElementById('view-modal').classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
        // Isolated Rendering via Iframe srcdoc (Prevents style leakage)
        const templateId = res.template || 't1';
        const num = templateId.replace(/\D/g, '');
        const formattedNum = num.padStart(2, '0');
        const response = await fetch(`../../audbear_techy_web_templates/audbear_techy_web_resume/resume_template_html/resume_template_${formattedNum}.html`);
        const html = await response.text();

        // 1. Process the HTML content (inject data)
        const result = injectDataIntoStaticTemplate(html, res.data, res.photoDataUrl, res.isPhotoEnabled);

        // 2. Prepare full document for srcdoc (including base for assets)
        const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -2).join('/') + '/';
        const fullSource = `
            <!DOCTYPE html>
            <html>
            <head>
                <base href="${baseUrl}">
                <meta charset="UTF-8">
                ${result.styles}
                <style>
                    body { margin: 0; padding: 0; background: #f0f0f0; display: flex; justify-content: center; overflow-x: hidden; }
                    .static-template-root { 
                        min-width: 850px; 
                        min-height: 1100px; 
                        background: #ffffff; 
                        color: #0F172A; 
                        text-align: left; 
                        box-shadow: 0 0 50px rgba(0,0,0,0.1);
                        position: relative;
                        ${result.bodyStyle}
                    }
                </style>
            </head>
            <body>
                <div class="static-template-root ${result.bodyClass}">
                    ${result.body}
                </div>
            </body>
            </html>
        `;

        // 3. Inject isolated iframe
        body.innerHTML = `<iframe id="view-resume-frame" style="border:none; width: 100%; height: 1100px; transition: opacity 0.3s;" frameborder="0"></iframe>`;
        const iframe = document.getElementById('view-resume-frame');
        iframe.srcdoc = fullSource;
        
        // Ensure iframe height matches content after load
        iframe.onload = () => { iframe.style.opacity = '1'; };
    } catch (err) {
        body.innerHTML = '<div style="color: #ef4444; padding: 40px; font-weight: 700;">Failed to load template preview. Please try again.</div>';
    }
};

window.closeView = () => {
    document.getElementById('view-modal').classList.remove('active');
    document.body.style.overflow = '';
    currentViewId = null;
};

window.openExport = (id) => {
    currentExportId = id;
    document.getElementById('export-modal').classList.add('active');
};

window.closeExport = () => {
    document.getElementById('export-modal').classList.remove('active');
    currentExportId = null;
};

window.executeExport = async (format) => {
    if (!currentExportId) return;
    
    const resumes = JSON.parse(localStorage.getItem('audbear_resumes') || '[]');
    const res = resumes.find(r => r.id === currentExportId);
    if (!res) return;

    closeExport();

    const overlay = document.createElement('div');
    overlay.className = 'generating-overlay';
    overlay.innerHTML = `
        <div class="gen-box">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <h3>Generating ${format.toUpperCase()}...</h3>
            <p>Optimizing layout and assets for high-resolution output.</p>
        </div>
    `;
    document.body.appendChild(overlay);

    try {
        const templateId = res.template || 't1';
        const num = templateId.replace(/\D/g, '');
        const formattedNum = num.padStart(2, '0');
        const response = await fetch(`../../audbear_techy_web_templates/audbear_techy_web_resume/resume_template_html/resume_template_${formattedNum}.html`);
        const html = await response.text();
        
        const container = document.getElementById('export-container');
        container.innerHTML = ''; // Clear previous
        
        // Use iframe for isolation during export
        const iframe = document.createElement('iframe');
        iframe.style.width = '850px';
        iframe.style.height = '1100px';
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.border = 'none';
        container.appendChild(iframe);

        const result = injectDataIntoStaticTemplate(html, res.data, res.photoDataUrl, res.isPhotoEnabled);
        const baseUrl = window.location.origin + window.location.pathname.split('/').slice(0, -2).join('/') + '/';
        
        const fullSource = `
            <!DOCTYPE html>
            <html>
            <head>
                <base href="${baseUrl}">
                <meta charset="UTF-8">
                ${result.styles}
                <style>
                    body { margin: 0; padding: 0; background: #ffffff; }
                    .static-template-root { 
                        width: 850px; 
                        min-height: 1100px; 
                        position: relative;
                        ${result.bodyStyle}
                    }
                </style>
            </head>
            <body style="margin:0; padding:0;">
                <div class="static-template-root ${result.bodyClass}">
                    ${result.body}
                </div>
            </body>
            </html>
        `;

        iframe.srcdoc = fullSource;

        // Wait for iframe to load content
        await new Promise(r => { iframe.onload = r; });
        // Wait a bit more for images/styles to stabilize
        await new Promise(r => setTimeout(r, 800));

        const element = iframe.contentDocument.querySelector('.static-template-root') || iframe.contentDocument.body;
        const filename = (res.name || 'resume').replace(/\s+/g, '_').toLowerCase();

        if (format === 'pdf') {
            const opt = {
                margin: 0,
                filename: `${filename}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await html2pdf().set(opt).from(fullSource).save();
        } else {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const link = document.createElement('a');
            link.download = `${filename}.${format}`;
            const mimeType = (format === 'jpg' || format === 'jpeg') ? 'image/jpeg' : `image/${format}`;
            link.href = canvas.toDataURL(mimeType);
            link.click();
        }
        
        showToast('Document saved successfully!', 'fa-solid fa-check-circle');
    } catch (err) {
        console.error(err);
        showToast('Failed to export document.', 'fa-solid fa-circle-xmark');
    } finally {
        document.getElementById('export-container').innerHTML = '';
        const overlay = document.querySelector('.generating-overlay');
        if (overlay) overlay.remove();
    }
};

/**
 * Template Injection Engine (Shared logic)
 */
function injectDataIntoStaticTemplate(html, data, photoDataUrl, isPhotoEnabled) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const set = (selectors, val) => { 
        for (const sel of selectors) {
            const el = doc.querySelector(sel); 
            if (el) { el.textContent = val || ''; return; }
        }
    };
    set(['.header h1', 'h1', '.name-title h1', '.profile-info h1', '.cv-header h1'], data.name);
    set(['.header h3', '.gen-title', '.job-title', 'h3', '.profile-info h3', '.cv-header h3'], data.title);
    set(['.profile-text', '.summary-text', '.gen-summary', '.objective p', '.summary p'], data.summary);

    doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && (src.includes('template_professional_images') || src.includes('resume_template_professional_images'))) {
            const filename = src.split('/').pop();
            img.src = '../../audbear_techy_web_templates/audbear_techy_web_resume/resume_template_professional_images/' + filename;
        }
    });

    const photoImg = doc.querySelector('.profile-photo img, .gen-avatar, .photo img');
    if (photoImg) {
        if (isPhotoEnabled === false) {
            const wrap = photoImg.closest('.profile-photo, .gen-avatar-wrap, .photo-wrap, .photo');
            if (wrap) wrap.style.display = 'none';
        } else if (photoDataUrl) {
            photoImg.src = photoDataUrl;
        }
    }

    doc.querySelectorAll('.contact-item, .gen-contact div, .contact-row span, .contact-info div').forEach(el => {
        const t = el.textContent.toLowerCase();
        let targetNode = null;
        for (let node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                targetNode = node; break;
            }
        }
        if (t.includes('@') || el.querySelector('.fa-envelope')) {
            if (targetNode) targetNode.textContent = ' ' + (data.email || '');
        } else if (t.includes('-') || el.querySelector('.fa-phone') || t.includes('phone')) {
            if (targetNode) targetNode.textContent = ' ' + (data.phone || '');
        } else if (t.includes('location') || el.querySelector('.fa-location')) {
            if (targetNode) targetNode.textContent = ' ' + (data.location || '');
        }
    });

    const renderList = (sectionKeywords, dataList, itemSelectors, titleSel, dateSel, bulletSel) => {
        const sec = Array.from(doc.querySelectorAll('.section, .content-section, .sidebar-section')).find(s => {
            const h = s.querySelector('h2, h3, .section-title');
            return h && sectionKeywords.some(k => h.textContent.toLowerCase().includes(k.toLowerCase()));
        });
        if (!sec) return;

        let item = null;
        for (const sel of itemSelectors) {
            item = sec.querySelector(sel);
            if (item) break;
        }
        if (!item || !dataList || dataList.length === 0) {
            sec.style.display = 'none';
            return;
        }

        const container = item.parentElement;
        container.innerHTML = '';
        dataList.forEach(d => {
            const clone = item.cloneNode(true);
            const t = clone.querySelector(titleSel);
            if (t) t.textContent = d.title || d.degree || d.name || '';
            const dt = clone.querySelector(dateSel);
            if (dt) dt.textContent = d.date || '';
            const b = clone.querySelector(bulletSel);
            if (b && d.bullets) {
                b.innerHTML = d.bullets.map(txt => `<li>${txt}</li>`).join('');
            }
            container.appendChild(clone);
        });
    };

    renderList(['Experience', 'Employment', 'Work'], data.experience, ['.exp-item', '.history-item', '.work-item', '.experience-item', '.gen-item'], 'h4', '.meta, .date', 'ul');
    renderList(['Education', 'Study'], data.studyContent, ['.edu-item', '.study-item', '.education-item', '.gen-item'], 'h4', '.meta, .date', 'ul, p');
    renderList(['Projects'], data.projects, ['.project-item', '.item', '.gen-item'], 'h4', '.meta, .date', 'p, ul');
    renderList(['Achievements', 'Awards'], data.achievements, ['.achievement-item', '.item', '.gen-item'], 'h4', '.meta, .date', 'p');

    const skillsSec = Array.from(doc.querySelectorAll('.section, .sidebar-section')).find(s => {
        const h = s.querySelector('h2, h3, .section-title');
        return h && h.textContent.toLowerCase().includes('skill');
    });
    if (skillsSec && data.skills) {
        const list = skillsSec.querySelector('ul, .skills-grid, .gen-list');
        if (list) {
            list.innerHTML = data.skills.map(s => `<li>${s}</li>`).join('');
        }
    }

    const langSec = Array.from(doc.querySelectorAll('.section, .sidebar-section')).find(s => {
        const h = s.querySelector('h2, h3, .section-title');
        return h && h.textContent.toLowerCase().includes('language');
    });
    if (langSec && data.languages) {
        const list = langSec.querySelector('ul, .gen-list');
        if (list) {
            list.innerHTML = data.languages.map(l => `<li>${l}</li>`).join('');
        }
    }

    // Prepare result parts for isolation
    const bodyClass = doc.body.className;
    const bodyStyle = doc.body.style.cssText;
    const styles = Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('\n');
    const bodyHtml = doc.body.innerHTML;

    return {
        body: bodyHtml,
        styles: styles,
        bodyClass: bodyClass,
        bodyStyle: bodyStyle
    };
}

// ── Delete Confirmation Modal ──
window.confirmDelete = (id) => {
    pendingDeleteId = id;
    const modal = document.getElementById('delete-modal');
    modal.classList.add('active');
};

window.cancelDelete = () => {
    pendingDeleteId = null;
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('active');
};

window.executeDelete = () => {
    if (!pendingDeleteId) return;
    let resumes = JSON.parse(localStorage.getItem('audbear_resumes') || '[]');
    resumes = resumes.filter(r => r.id !== pendingDeleteId);
    localStorage.setItem('audbear_resumes', JSON.stringify(resumes));
    cancelDelete();
    showToast('Document deleted successfully', 'fa-solid fa-trash');
    loadVault();
};

// ── Toast ──
function showToast(msg, icon = 'fa-solid fa-check-circle') {
    const t = document.getElementById('toast');
    t.innerHTML = `<i class="${icon}"></i><span>${msg}</span>`;
    t.classList.add('active');
    setTimeout(() => { t.classList.remove('active'); }, 3000);
}
// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    // ── Theme Toggle Logic ──
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const htmlElement = document.documentElement;

    const updateThemeIcon = () => {
        if (!themeToggleBtn) return;
        if (htmlElement.getAttribute('data-theme') === 'light') {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i><span>Light</span>';
        } else {
            themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i><span>Dark</span>';
        }
    };

    if (themeToggleBtn) {
        const savedTheme = localStorage.getItem('audbear_theme') || 'dark';
        htmlElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon();

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('audbear_theme', newTheme);
            updateThemeIcon();
        });
    }
    loadVault();
    
    // ── Document Import Integration ──
    const importInput = document.getElementById('import-input');
    if (importInput) {
        importInput.addEventListener('change', handleImportChange);
    }
});

/**
 * Trigger the hidden file input
 */
function triggerImport() {
    const input = document.getElementById('import-input');
    if (input) input.click();
}

/**
 * Handle file selection
 */
async function handleImportChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    showToast(`Processing ${file.name}...`, 'fa-solid fa-spinner fa-spin');

    try {
        let importedData = null;
        let fileName = file.name.replace(/\.[^/.]+$/, "");

        if (extension === 'json') {
            const text = await file.text();
            const json = JSON.parse(text);
            // If it's a direct AudBear export (has name and summary at root)
            if (json.name || json.experience) {
                importedData = json;
            } else {
                throw new Error("Invalid AudBear JSON format");
            }
        } 
        else if (extension === 'txt') {
            const text = await file.text();
            if (window.parseVaultResume) {
                importedData = window.parseVaultResume(text);
            }
        }
        else if (extension === 'docx') {
            if (window.mammoth) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                if (window.parseVaultResume) {
                    importedData = window.parseVaultResume(result.value);
                }
            }
        }
        else if (extension === 'pdf') {
            if (window.pdfjsLib) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map(item => item.str).join(' ') + '\n';
                }
                if (window.parseVaultResume) {
                    importedData = window.parseVaultResume(fullText);
                }
            }
        }

        if (importedData) {
            saveImportedDocument(importedData, fileName);
        } else {
            throw new Error("Could not parse document data");
        }

    } catch (err) {
        console.error("Import Error:", err);
        showToast("Failed to import document. format not supported or invalid.", "fa-solid fa-circle-xmark");
    } finally {
        e.target.value = ''; // Reset input
    }
}

/**
 * Save the parsed data to localStorage
 */
function saveImportedDocument(data, fileName) {
    const resumes = JSON.parse(localStorage.getItem('audbear_resumes') || '[]');
    
    // Check limit (Max 8 total including legacy)
    if (resumes.length >= 8) {
        showToast("Vault is full! Please delete some documents.", "fa-solid fa-triangle-exclamation");
        return;
    }

    const newDoc = {
        id: 'imported-' + Date.now(),
        name: fileName,
        type: 'imported', // Use 'imported' type for better filtering
        lastModified: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        template: 't1', // Default template for imported docs
        data: data
    };

    resumes.push(newDoc);
    localStorage.setItem('audbear_resumes', JSON.stringify(resumes));
    
    showToast("Document imported successfully!", "fa-solid fa-cloud-arrow-down");
    loadVault();
}
