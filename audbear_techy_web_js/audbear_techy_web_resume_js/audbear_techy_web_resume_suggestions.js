/* ============================================================
   SUGGESTIONS.JS — ATS Scoring + Content suggestions
   ============================================================ */

'use strict';

// ── Action verbs for ATS scoring ──
const ACTION_VERBS = [
  'developed','built','designed','led','managed','created',
  'optimized','reduced','increased','improved','collaborated',
  'architected','delivered','launched','deployed','integrated',
  'automated','migrated','refactored','mentored','supervised',
  'coordinated','analyzed','researched','published','presented',
  'achieved','awarded','generated','engineered','maintained',
  'tested','monitored','configured','streamlined','enhanced',
  'pioneered','spearheaded','initiated','established','transformed'
];

// ── ATS Scoring ──
function calculateATS(data) {
  let score = 0;
  const tips = [];

  // 1. Contact info completeness (20 pts)
  let contactScore = 0;
  if (data.name)     contactScore += 5;
  if (data.email)    contactScore += 5;
  if (data.phone)    contactScore += 5;
  if (data.location) contactScore += 3;
  if (data.linkedin || data.github) contactScore += 2;
  score += contactScore;
  if (contactScore < 18) tips.push({ icon: 'fa-user-tie', text: 'Complete your professional contact details', noStripe: true });

  // 2. Summary (15 pts)
  if (data.summary && data.summary.length >= 80) { score += 15; }
  else if (data.summary && data.summary.length > 0) {
    score += 8;
    tips.push({ icon: 'fa-align-left', text: 'Add a professional summary to boost ATS visibility', noStripe: true });
  }

  // 3. Experience (30 pts)
  const exp = data.experience || [];
  if (exp.length >= 2) {
    score += 25;
    const allBullets = exp.flatMap(e => e.bullets || []).join(' ').toLowerCase();
    const verbsFound = ACTION_VERBS.filter(v => allBullets.includes(v)).length;
    if (verbsFound >= 5) score += 5;
    else tips.push({ icon: 'fa-bolt', text: 'Use more strong action verbs (e.g., Spearheaded, Optimized)', noStripe: true });
  } else if (exp.length === 1) {
    score += 15;
    tips.push({ icon: 'fa-briefcase', text: 'Include at least 2 detailed work experiences if possible', noStripe: true });
  } else {
    tips.push({ icon: 'fa-briefcase', text: 'Experience is critical for ATS ranking', noStripe: true });
  }

  // 4. Education (10 pts)
  const edu = data.studyContent || [];
  if (edu.length >= 1) score += 10;
  else tips.push({ icon: 'fa-graduation-cap', text: 'Add your educational background', noStripe: true });

  // 5. Skills (15 pts)
  const skills = data.skills || [];
  if (skills.length >= 8) score += 15;
  else if (skills.length >= 4) {
    score += 10;
    tips.push({ icon: 'fa-screwdriver-wrench', text: 'Add more relevant industry skills', noStripe: true });
  } else {
    tips.push({ icon: 'fa-screwdriver-wrench', text: 'Add technical and soft skills', noStripe: true });
  }

  // 6. Projects & Achievements (10 pts)
  const extra = (data.projects || []).length + (data.achievements || []).length;
  if (extra >= 2) score += 10;
  else if (extra === 1) score += 5;

  score = Math.min(100, score);
  let grade, color;
  if (score >= 85) { grade = 'Excellent'; color = '#10B981'; }
  else if (score >= 70) { grade = 'Good';  color = '#3B82F6'; }
  else if (score >= 50) { grade = 'Fair';  color = '#F59E0B'; }
  else { grade = 'Needs Work'; color = '#EF4444'; }

  return { score, grade, color, tips };
}

// ── Content suggestions by section ──
const SUGGESTIONS = {
  summary: {
    label: 'Professional Summaries',
    items: [
      'Innovative Software Developer with 5+ years of experience in building scalable cloud solutions and optimizing database performance by 40%.',
      'Detail-oriented Data Analyst adept at leveraging Python and Tableau to deliver actionable business insights and drive strategic decision-making.',
      'Marketing Strategist with a track record of increasing brand engagement by 60% through data-driven campaigns and cross-functional leadership.',
      'Motivated Recent Graduate in Computer Science with a strong foundation in algorithms, full-stack development, and collaborative coding.',
      'Customer Success Specialist dedicated to improving user retention through proactive support and comprehensive product training programs.'
    ]
  },
  experience: {
    label: 'Work Experience Bullets',
    items: [
      'Spearheaded the migration of legacy systems to microservices, reducing downtime by 25%.',
      'Optimized React application performance, resulting in a 40% improvement in lighthouse scores.',
      'Led a cross-functional team of 10 to deliver a high-priority project 3 weeks ahead of schedule.',
      'Developed automated testing suites that increased code coverage from 60% to 95%.',
      'Managed a budget of $500k, consistently delivering projects 15% under estimated costs.',
      'Mentored 5 junior developers, facilitating professional growth and team productivity.',
      'Implemented CI/CD pipelines using GitHub Actions, streamlining the deployment process.',
      'Collaborated with UX designers to translate complex requirements into intuitive user interfaces.'
    ]
  },
  projects: {
    label: 'Project descriptions',
    items: [
      'Designed and built a real-time collaborative code editor using WebSockets and Node.js.',
      'Developed a machine learning model to predict market trends with 92% accuracy.',
      'Created a mobile-first e-commerce platform with integrated payment gateways and headless CMS.',
      'Architected a distributed tracking system for IoT devices serving 5k+ concurrent nodes.',
      'Built an open-source library for CSS-in-JS that received 500+ GitHub stars in 3 months.'
    ]
  },
  skills: {
    label: 'Industry Skills',
    groups: [
      { label: 'Frontend', items: ['React', 'Next.js', 'TypeScript', 'Tailwind', 'Vue', 'Redux', 'SCSS'] },
      { label: 'Backend',  items: ['Node.js', 'Python', 'Go', 'Express', 'PostgreSQL', 'MongoDB', 'Redis'] },
      { label: 'Cloud/DevOps', items: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'Nginx', 'Vercel'] },
      { label: 'Business', items: ['Strategic Planning', 'KPI Analysis', 'Public Speaking', 'Agile/Scrum', 'CRM'] }
    ]
  },
  achievements: {
    label: 'Professional Achievements',
    items: [
      'Promoted to Senior Engineer within 18 months for outstanding technical leadership.',
      'Recipient of the "Innovator of the Year" award for developing internal efficiency tools.',
      'Published author of a technical whitepaper on decentralized finance architectures.',
      'Speaker at JSConf 2023, presenting on the future of server-side rendering.',
      'Successfully led the company through a SOC2 compliance audit with zero non-conformities.',
      'Awarded "Employee of the Quarter" for maintaining 99.9% system uptime during peak traffic.',
      'Consistently exceeded quarterly sales targets by over 25%, resulting in $2M+ additional revenue.'
    ]
  },
  software_engineering: {
    label: 'Software Engineering Snippets',
    items: [
      'Engineered a scalable data pipeline using Apache Kafka and Go, handling 1M+ events per second.',
      'Architected a micro-frontend architecture using Webpack Module Federation, improving team velocity by 30%.',
      'Optimized SQL queries and database indexing, reducing API latency by 200ms on high-traffic endpoints.',
      'Implemented robust unit and integration testing using Jest and Cypress, hitting 90% code coverage.',
      'Containerized all legacy applications using Docker and migrated to AWS EKS cloud infrastructure.'
    ]
  },
  business_finance: {
    label: 'Business & Finance Snippets',
    items: [
      'Conducted complex financial modeling to support a $50M Series B funding round.',
      'Streamlined accounts receivable processes, reducing the average payment cycle from 45 to 30 days.',
      'Led comprehensive market research that identified a $10M expansion opportunity in the APAC region.',
      'Managed a diverse portfolio of 50+ corporate clients with a 98% annual retention rate.',
      'Automated monthly executive reporting using Power BI, saving the finance team 20 hours per month.'
    ]
  },
  healthcare_nursing: {
    label: 'Healthcare & Nursing Snippets',
    items: [
      'Administered specialized patient care in a high-volume ICU, managing 4+ critical patients per shift.',
      'Coordinated with multidisciplinary teams to develop and implement comprehensive patient treatment plans.',
      'Ensured strict adherence to HIPAA regulations and hospital safety protocols at all times.',
      'Mentored 10+ student nurses during their clinical rotations, providing hands-on training and guidance.',
      'Spearheaded a departmental initiative to improve shift handoff procedures, reducing medical errors by 15%.'
    ]
  }
};

// Export
if (typeof window !== 'undefined') {
  window.calculateATS = calculateATS;
  window.SUGGESTIONS = SUGGESTIONS;
}
