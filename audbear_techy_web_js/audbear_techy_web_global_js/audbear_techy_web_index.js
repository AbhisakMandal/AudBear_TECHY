/* ============================================================
   AUDBEAR TECHY — LANDING PAGE ENGINE
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const scrollWrap = document.querySelector('.page-scroll-wrap');

  // ── Smooth Scrolling ──
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target && scrollWrap) {
        const targetTop = target.offsetTop;
        scrollWrap.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    });
  });

  // ── Theme Toggle Logic ──
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const htmlElement = document.documentElement;

  // Initialize theme from local storage or default to dark
  const savedTheme = localStorage.getItem('audbear_theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);
  
  const updateIcon = () => {
    if (htmlElement.getAttribute('data-theme') === 'light') {
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i><span>Light</span>';
    } else {
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i><span>Dark</span>';
    }
  };
  
  if (themeToggleBtn) {
    updateIcon();
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = htmlElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      htmlElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('audbear_theme', newTheme);
      updateIcon();
    });
  }

  // ── Scroll Animations ──
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.feature-card, .step-card, .template-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

  // ── Counter Animation ──
  const animateCounters = () => {
    const counters = document.querySelectorAll('.stat-num[data-target]');
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'), 10);
      const suffix = counter.getAttribute('data-suffix') || '';
      let current = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        counter.textContent = (current >= 1000)
          ? `${(current/1000).toFixed(0)}K${suffix}`
          : `${Math.round(current)}${suffix}`;
      }, 16);
    });
  };
  animateCounters();

  // ── Navigation Bridges ──
  document.querySelectorAll('.template-card[data-template]').forEach(card => {
    card.addEventListener('click', () => {
      const tpl = card.getAttribute('data-template');
      window.location.href = `audbear_techy_web_html/audbear_techy_web_resume_html/audbear_techy_web_resume_builder.html?template=${tpl}`;
    });
  });

  const mainCta = document.getElementById('mainCta');
  if (mainCta) {
    mainCta.addEventListener('click', () => {
      window.location.href = 'audbear_techy_web_html/audbear_techy_web_global_html/audbear_techy_web_workspace.html';
    });
  }
});
