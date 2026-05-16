/* ============================================================
   AUDBEAR TECHY WORKSPACE — Page Logic
   ============================================================ */

'use strict';

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

    // ── Animate cards on page load ──
    const cards = document.querySelectorAll('.ws-tool-card');
    cards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `opacity 0.4s ease ${i * 0.08}s, transform 0.4s ease ${i * 0.08}s`;

        // Trigger animation after a tick
        requestAnimationFrame(() => {
            setTimeout(() => {
                card.style.opacity = '';
                card.style.transform = '';
            }, 50);
        });
    });

    // ── Category Filter Logic ──
    const catItems = document.querySelectorAll('.ws-cat-item');
    const scrollContainer = document.querySelector('.ws-content-scrollable');

    catItems.forEach(item => {
        item.addEventListener('click', () => {
            const cat = item.getAttribute('data-cat');
            const targetSection = document.getElementById(`section-${cat}`);

            if (targetSection && scrollContainer) {
                // Remove active from all
                catItems.forEach(i => i.classList.remove('active'));
                // Add active to current
                item.classList.add('active');

                const containerRect = scrollContainer.getBoundingClientRect();
                const sectionRect = targetSection.getBoundingClientRect();
                const relativeTop = sectionRect.top - containerRect.top + scrollContainer.scrollTop;

                scrollContainer.scrollTo({
                    top: relativeTop - 20, // 20px buffer
                    behavior: 'smooth'
                });
            }
        });
    });

    // ── Update active category on scroll ──
    if (scrollContainer) {
        scrollContainer.addEventListener('scroll', () => {
            const sections = document.querySelectorAll('.ws-section');
            const containerRect = scrollContainer.getBoundingClientRect();
            
            let currentActive = 'builder';
            sections.forEach(section => {
                const sectionRect = section.getBoundingClientRect();
                // If the section's top is near the container's top (within 150px)
                if (sectionRect.top - containerRect.top <= 150) {
                    currentActive = section.id.replace('section-', '');
                }
            });

            catItems.forEach(i => {
                if (i.getAttribute('data-cat') === currentActive) {
                    i.classList.add('active');
                } else {
                    i.classList.remove('active');
                }
            });
        }, { passive: true });
    }

    // ── Locked card click feedback ──
    document.querySelectorAll('.ws-card--locked').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if it was a button click inside the card
            if (e.target.closest('.ws-btn')) return;
            
            card.style.transition = 'transform 0.1s ease';
            card.style.transform = 'scale(0.98)';
            setTimeout(() => { card.style.transform = ''; }, 150);
        });
    });

});
