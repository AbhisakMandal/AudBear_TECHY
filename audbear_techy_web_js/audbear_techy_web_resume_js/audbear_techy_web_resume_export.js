/* ============================================================
   EXPORT.JS — PDF / PNG / JPG / HTML / DOCX export
   ============================================================ */

'use strict';

async function exportPortfolio(format, resumeEl, fileName) {
  if (!resumeEl) { showToast('Profile preview not found', 'error'); return; }

  fileName = fileName || `Portfolio_${Date.now()}`;

  switch (format) {
    case 'pdf':
      await exportPDF(resumeEl, fileName);
      break;
    case 'png':
      await exportImage(resumeEl, fileName, 'png', 3);
      break;
    case 'png-4k':
      await exportImage(resumeEl, fileName, 'png', 4);
      break;
    case 'jpg':
      await exportImage(resumeEl, fileName, 'jpeg', 2);
      break;
    case 'html':
      exportHTML(resumeEl, fileName);
      break;
    case 'docx':
      exportDOCX(window.__resumeData || {}, fileName);
      break;
    case 'print':
      window.print();
      break;
    default:
      showToast('Unknown format', 'error');
  }
}

// ── PDF ──
async function exportPDF(el, fileName) {
  if (typeof html2pdf === 'undefined') {
    showToast('PDF library loading... please wait', 'error');
    return;
  }
  showToast('Generating PDF…', 'info');
  const opt = {
    margin: 0,
    filename: `${fileName}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { format: 'a4', orientation: 'portrait', unit: 'mm' }
  };
  try {
    await html2pdf().set(opt).from(el).save();
    showToast('PDF downloaded!');
  } catch (e) {
    showToast('PDF export failed. Try Print instead.', 'error');
    console.error(e);
  }
}

// ── PNG / JPG ──
async function exportImage(el, fileName, type, scale) {
  if (typeof html2canvas === 'undefined') {
    showToast('Image library loading...', 'error');
    return;
  }
  const scaleLabel = scale === 4 ? '4K' : scale === 3 ? 'HD' : 'standard';
  showToast(`Generating ${type.toUpperCase()} (${scaleLabel})…`, 'info');
  try {
    const canvas = await html2canvas(el, { scale, useCORS: true, logging: false });
    const link = document.createElement('a');
    link.href = canvas.toDataURL(`image/${type}`, 0.97);
    link.download = `${fileName}.${type === 'jpeg' ? 'jpg' : 'png'}`;
    link.click();
    showToast(`${type.toUpperCase()} downloaded!`);
  } catch (e) {
    showToast('Image export failed', 'error');
    console.error(e);
  }
}

// ── HTML (standalone) ──
function exportHTML(el, fileName) {
  // Get all computed styles for templates
  const styleSheets = Array.from(document.styleSheets).map(sheet => {
    try {
      return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
    } catch { return ''; }
  }).join('\n');

  const fontLink = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Portfolio</title>
${fontLink}
<style>
body { margin: 0; background: #f0f2f5; display: flex; justify-content: center; padding: 20px; }
${styleSheets}
</style>
</head>
<body>
${el.outerHTML}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.html`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('HTML file downloaded!');
}

// ── DOCX (using docx.js) ──
function exportDOCX(data, fileName) {
  if (typeof docx === 'undefined') {
    showToast('DOCX library not loaded', 'error');
    return;
  }
  try {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, ShadingType } = docx;

    const children = [];

    // Name heading
    children.push(new Paragraph({
      children: [new TextRun({ text: data.name || 'Portfolio', bold: true, size: 48, color: '0A2540' })],
      alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: data.title || '', size: 24, color: '2563EB' })],
      alignment: AlignmentType.CENTER,
    }));

    // Contact
    const contactParts = [data.phone, data.email, data.location, data.linkedin].filter(Boolean);
    if (contactParts.length) {
      children.push(new Paragraph({
        children: [new TextRun({ text: contactParts.join(' | '), size: 20, color: '64748B' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));
    }

    const addSection = (title) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 22, color: '0A2540' })],
        border: { bottom: { color: '2563EB', style: BorderStyle.SINGLE, size: 6, space: 1 } },
        spacing: { before: 200, after: 100 },
      }));
    };

    // Summary
    if (data.summary) {
      addSection('Professional Summary');
      children.push(new Paragraph({ children: [new TextRun({ text: data.summary, size: 20 })], spacing: { after: 100 } }));
    }

    // Experience
    if ((data.experience || []).length) {
      addSection('Work Experience');
      (data.experience || []).forEach(exp => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: exp.title || '', bold: true, size: 22 }),
            new TextRun({ text: `  ${exp.company || ''}`, size: 20, color: '2563EB' }),
            new TextRun({ text: `  |  ${exp.date || ''}`, size: 18, color: '64748B' }),
          ],
        }));
        if (exp.location) children.push(new Paragraph({ children: [new TextRun({ text: exp.location, size: 18, color: '64748B' })], spacing: { after: 60 } }));
        (exp.bullets || []).forEach(b => {
          children.push(new Paragraph({ children: [new TextRun({ text: `• ${b}`, size: 20 })], indent: { left: 360 }, spacing: { after: 50 } }));
        });
      });
    }

    // Projects
    if ((data.projects || []).length) {
      addSection('Projects');
      (data.projects || []).forEach(proj => {
        children.push(new Paragraph({ children: [new TextRun({ text: proj.name || '', bold: true, size: 22 })], spacing: { after: 60 } }));
        if (proj.description) children.push(new Paragraph({ children: [new TextRun({ text: proj.description, size: 20 })], spacing: { after: 60 } }));
      });
    }

    // STUDY
    if ((data.studyContent || []).length) {
      addSection('STUDY');
      (data.studyContent || []).forEach(study => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: study.degree || '', bold: true, size: 22 }),
            new TextRun({ text: `  —  ${study.school || ''}`, size: 20, color: '2563EB' }),
            new TextRun({ text: `  ${study.date || ''}`, size: 18, color: '64748B' }),
          ],
          spacing: { after: 80 },
        }));
      });
    }

    // Skills
    if ((data.skills || []).length) {
      addSection('Skills');
      children.push(new Paragraph({ children: [new TextRun({ text: (data.skills || []).join(' · '), size: 20 })], spacing: { after: 100 } }));
    }

    const doc = new Document({ sections: [{ children }] });
    Packer.toBlob(doc).then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.docx`;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('DOCX downloaded!');
    });
  } catch (e) {
    showToast('DOCX export failed', 'error');
    console.error(e);
  }
}

// ── Toast helper ──
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = '';
  if (type === 'error') toast.classList.add('error');
  if (type === 'info') { toast.style.background = '#2563EB'; }
  else { toast.style.background = ''; }
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// Export
if (typeof window !== 'undefined') {
  window.exportPortfolio = exportPortfolio;
  window.showToast = showToast;
}
