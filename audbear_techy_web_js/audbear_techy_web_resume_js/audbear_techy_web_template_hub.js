document.addEventListener('DOMContentLoaded', () => {
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
            
            let currentActive = 'docs';
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
});
