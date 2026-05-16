/* ============================================================
   VAULT-PARSER.JS — Heuristic resume parser + tier detector
   ============================================================ */
'use strict';

// ── Strong action verbs to prepend when rewriting bullets ──
const ATS_VERBS = [
  'Spearheaded','Engineered','Architected','Optimized','Delivered',
  'Developed','Designed','Launched','Automated','Reduced',
  'Increased','Managed','Led','Collaborated','Implemented',
  'Streamlined','Deployed','Integrated','Mentored','Established'
];

function randomVerb() {
  return ATS_VERBS[Math.floor(Math.random() * ATS_VERBS.length)];
}

// ── Utility: clean a line ──
function cleanLine(l) { return l.replace(/\s+/g, ' ').trim(); }

// ── Rewrite bullet to be ATS-optimized ──
function rewriteBullet(bullet) {
  const b = bullet.replace(/^[-•·▪▸✓*]\s*/, '').trim();
  if (!b) return null;
  const startsWithVerb = ATS_VERBS.some(v => b.toLowerCase().startsWith(v.toLowerCase()));
  if (startsWithVerb) return b;
  // Check if it already starts with a capital verb-like word
  if (/^[A-Z][a-z]+ed|^[A-Z][a-z]+ing|^[A-Z][a-z]+ized/.test(b)) return b;
  return `${randomVerb()} ${b.charAt(0).toLowerCase() + b.slice(1)}`;
}

// ── Section header detection ──
const SECTION_PATTERNS = {
  experience:   /^(work\s*experience|experience|employment|professional\s*experience|career\s*history)/i,
  study:        /^(education|academic|study|qualification|degrees?|training\s*&?\s*education)/i,
  skills:       /^(skills?|technical\s*skills?|core\s*competenc|expertise|technologies|stack)/i,
  projects:     /^(projects?|portfolio|key\s*projects?|notable\s*projects?|side\s*projects?)/i,
  achievements: /^(achievements?|awards?|honors?|certifications?|recognitions?|accomplishments?)/i,
  summary:      /^(summary|profile|about|objective|professional\s*summary|career\s*summary)/i,
  languages:    /^(languages?|spoken\s*languages?)/i,
};

// ── Date range detection ──
const DATE_RANGE_RE = /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,.-]*\d{4}|\b\d{4})\s*[-–—to]+\s*(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,.-]*\d{4}|\b\d{4}|\bpresent\b|\bcurrent\b)/i;
const YEAR_RE = /\b(19|20)\d{2}\b/;

// ── Email / Phone / LinkedIn / GitHub / Website ──
const EMAIL_RE    = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
const PHONE_RE    = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /linkedin\.com\/in\/[\w-]+/i;
const GITHUB_RE   = /github\.com\/[\w-]+/i;
const WEBSITE_RE  = /https?:\/\/[^\s]+/i;

// ── Main Parser ──
function parseVaultResume(rawText) {
  const lines = rawText.split(/\r?\n/).map(cleanLine).filter(l => l.length > 0);
  const result = {
    name: '', title: '', email: '', phone: '', location: '', linkedin: '',
    github: '', website: '', summary: '',
    skills: [], languages: [], experience: [], studyContent: [],
    projects: [], achievements: [],
  };

  let currentSection = null;
  let currentItem    = null;
  let headerParsed   = false;
  let headerLines    = [];

  // ── Pass 1: extract contact info from entire text ──
  const fullText = rawText;
  const emailM  = fullText.match(EMAIL_RE);
  const phoneM  = fullText.match(PHONE_RE);
  const liM     = fullText.match(LINKEDIN_RE);
  const ghM     = fullText.match(GITHUB_RE);
  const webM    = fullText.match(WEBSITE_RE);
  if (emailM)  result.email    = emailM[0];
  if (phoneM)  result.phone    = phoneM[1];
  if (liM)     result.linkedin = liM[0];
  if (ghM)     result.github   = ghM[0];
  if (webM && !liM?.includes(webM[0]) && !ghM?.includes(webM[0])) result.website = webM[0];

  // ── Pass 2: line-by-line section parser ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers (short lines matching patterns)
    let detectedSection = null;
    if (line.length < 60) {
      for (const [sec, re] of Object.entries(SECTION_PATTERNS)) {
        if (re.test(line)) { detectedSection = sec; break; }
      }
    }

    if (detectedSection) {
      // Save last item before switching
      if (currentItem && currentSection === 'experience') result.experience.push(currentItem);
      if (currentItem && currentSection === 'projects')   result.projects.push(currentItem);
      if (currentItem && currentSection === 'study')      result.studyContent.push(currentItem);
      currentItem = null;
      currentSection = detectedSection;
      headerParsed = true;
      continue;
    }

    // Header lines (before any section is detected) → name/title
    if (!headerParsed) {
      headerLines.push(line);
      continue;
    }

    // ── SUMMARY ──
    if (currentSection === 'summary') {
      result.summary += (result.summary ? ' ' : '') + line;
      continue;
    }

    // ── SKILLS ──
    if (currentSection === 'skills') {
      // Comma-separated or bullet list
      const parts = line.split(/[,|•·▪]/);
      if (parts.length > 1) {
        parts.forEach(p => { const s = p.trim(); if (s && s.length < 40) result.skills.push(s); });
      } else if (line.startsWith('-') || line.startsWith('•')) {
        const s = line.replace(/^[-•·]\s*/, '').trim();
        if (s) result.skills.push(s);
      } else if (line.length < 40 && !/\d{4}/.test(line)) {
        result.skills.push(line);
      }
      continue;
    }

    // ── LANGUAGES ──
    if (currentSection === 'languages') {
      const parts = line.split(/[,|•·:–-]/);
      if (parts.length >= 2) {
        result.languages.push({ name: parts[0].trim(), level: parts[1].trim() || 'Intermediate' });
      } else if (line.length < 30) {
        result.languages.push({ name: line, level: 'Intermediate' });
      }
      continue;
    }

    // ── ACHIEVEMENTS ──
    if (currentSection === 'achievements') {
      const text = line.replace(/^[-•·*]\s*/, '').trim();
      if (text) result.achievements.push({ title: text, description: '' });
      continue;
    }

    // ── EXPERIENCE ──
    if (currentSection === 'experience') {
      const dateM = line.match(DATE_RANGE_RE);
      const isBullet = /^[-•·▸✓*]/.test(line);

      if (dateM && !isBullet) {
        // New experience entry
        if (currentItem) result.experience.push(currentItem);
        const dateStr  = dateM[0];
        const rest     = line.replace(dateStr, '').replace(/[|·,]/g, ' ').trim();
        const parts    = rest.split(/\s{2,}|[|·@]/);
        currentItem = {
          title: parts[0] || 'Role',
          company: parts[1] || '',
          date: dateStr,
          location: parts[2] || '',
          bullets: [],
        };
      } else if (currentItem && isBullet) {
        const b = rewriteBullet(line);
        if (b) currentItem.bullets.push(b);
      } else if (!currentItem && !isBullet && line.length > 3) {
        // Title line before date
        currentItem = { title: line, company: '', date: '', location: '', bullets: [] };
      } else if (currentItem && !isBullet && !dateM) {
        // Might be company name or location
        if (!currentItem.company) currentItem.company = line;
        else if (!currentItem.location) currentItem.location = line;
      }
      continue;
    }

    // ── PROJECTS ──
    if (currentSection === 'projects') {
      const isBullet = /^[-•·▸✓*]/.test(line);
      if (!isBullet && !currentItem) {
        currentItem = { name: line, date: '', description: '', bullets: [] };
      } else if (!isBullet && currentItem && !currentItem.description) {
        currentItem.description = line;
      } else if (isBullet && currentItem) {
        const b = rewriteBullet(line);
        if (b) currentItem.bullets.push(b);
      } else if (!isBullet && currentItem) {
        result.projects.push(currentItem);
        currentItem = { name: line, date: '', description: '', bullets: [] };
      }
      continue;
    }

    // ── STUDY ──
    if (currentSection === 'study') {
      const yearM = line.match(YEAR_RE);
      const isBullet = /^[-•·]/.test(line);
      if (!isBullet) {
        if (!currentItem) {
          currentItem = { degree: line, school: '', date: yearM ? yearM[0] : '', location: '' };
        } else if (!currentItem.school) {
          currentItem.school = line;
          if (yearM) currentItem.date = yearM[0];
        } else {
          result.studyContent.push(currentItem);
          currentItem = { degree: line, school: '', date: yearM ? yearM[0] : '', location: '' };
        }
      }
      continue;
    }
  }

  // ── Flush last item ──
  if (currentItem && currentSection === 'experience') result.experience.push(currentItem);
  if (currentItem && currentSection === 'projects')   result.projects.push(currentItem);
  if (currentItem && currentSection === 'study')      result.studyContent.push(currentItem);

  // ── Parse header lines for name & title ──
  if (headerLines.length > 0) {
    // First non-contact line is likely the name
    const nameCandidate = headerLines.find(l =>
      !EMAIL_RE.test(l) && !PHONE_RE.test(l) && !LINKEDIN_RE.test(l) &&
      !GITHUB_RE.test(l) && l.length < 60
    );
    if (nameCandidate) result.name = nameCandidate;
    // Second distinct line might be the title
    const titleCandidate = headerLines.find(l =>
      l !== nameCandidate && !EMAIL_RE.test(l) && !PHONE_RE.test(l) &&
      l.length < 80 && l.length > 3
    );
    if (titleCandidate) result.title = titleCandidate;
    // Location: look for "City, Country" pattern
    const locCandidate = headerLines.find(l => /,\s*[A-Z]/.test(l) && l.length < 40);
    if (locCandidate && !result.location) result.location = locCandidate;
  }

  // ── Dedupe skills ──
  result.skills = [...new Set(result.skills.filter(s => s.length > 1 && s.length < 40))];

  return result;
}

// ── Tier detector based on experience count and content ──
function detectTier(data) {
  const expCount = (data.experience || []).length;
  const hasCerts = (data.achievements || []).some(a =>
    /certif|aws|azure|gcp|pmp|cisco|comptia/i.test(a.title)
  );

  if (expCount === 0) return { tier: 'freshman',      templateId: 't1' };
  if (expCount === 1 && hasCerts) return { tier: 'certified', templateId: 't7' };
  if (expCount <= 2) return { tier: 'intern',         templateId: 't13' };
  if (expCount <= 5) return { tier: 'professional',   templateId: 't19' };
  return              { tier: 'executive',            templateId: 't25' };
}

// ── Export ──
if (typeof window !== 'undefined') {
  window.parseVaultResume = parseVaultResume;
  window.detectTier = detectTier;
  window.rewriteBullet = rewriteBullet;
}
