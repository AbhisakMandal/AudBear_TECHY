document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('template-grid');
    const filterContainer = document.getElementById('gallery-filters');
    window.selectedTemplateId = null;

    // ── Theme Logic (Forced Dark) ──
    document.documentElement.setAttribute('data-theme', 'dark');


    
    window.isLiked = function(id) {
        const liked = JSON.parse(localStorage.getItem('audbear_liked_templates') || '[]');
        return liked.includes(id);
    };

    // Initialize stats if not present
    let stats = JSON.parse(localStorage.getItem('audbear_template_stats') || '{}');
    let liked = JSON.parse(localStorage.getItem('audbear_liked_templates') || '[]');

    window.toggleLike = function(id) {
        let liked = JSON.parse(localStorage.getItem('audbear_liked_templates') || '[]');
        let stats = JSON.parse(localStorage.getItem('audbear_template_stats') || '{}');
        
        if (!stats[id]) stats[id] = { likes: getRandom(160, 1200), views: getRandom(1600, 24000) };

        const isNowLiked = !liked.includes(id);

        if (!isNowLiked) {
            liked = liked.filter(lid => lid !== id);
            stats[id].likes--;
        } else {
            liked.push(id);
            stats[id].likes++;
        }
        
        localStorage.setItem('audbear_liked_templates', JSON.stringify(liked));
        localStorage.setItem('audbear_template_stats', JSON.stringify(stats));
        
        // Surgical UI Update
        const card = document.querySelector(`.template-card[data-id="${id}"]`);
        if (card) {
            const likeBtn = card.querySelector('.like-btn');
            const statHeartWrap = card.querySelector('.template-stats span:last-child');
            
            if (likeBtn) {
                likeBtn.classList.toggle('active', isNowLiked);
                likeBtn.innerHTML = `<i class="${isNowLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
                
                if (isNowLiked) {
                    likeBtn.classList.add('pop');
                    setTimeout(() => likeBtn.classList.remove('pop'), 600);
                }
            }
            
            if (statHeartWrap) {
                statHeartWrap.classList.toggle('stat-liked', isNowLiked);
                statHeartWrap.innerHTML = `
                    <i class="${isNowLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> 
                    ${formatStat(stats[id].likes)}
                `;
            }
        }

        renderFilters();
    };

    window.openQuickView = function(id) {
        const tpl = (window.TEMPLATES || []).find(t => t.id === id);
        if (!tpl) return;

        const modal = document.getElementById('template-modal');
        const body = document.getElementById('modal-preview-body');
        const useBtn = document.getElementById('modal-use-btn');

        // Clear previous content
        body.innerHTML = `
            <div class="loading-preview">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                <span>Synchronizing Template Output...</span>
            </div>
        `;

        const fullPath = tpl.htmlPath;

        const iframe = document.createElement('iframe');
        iframe.className = 'quickview-iframe';
        iframe.style.width = '850px';
        iframe.style.height = '1100px';
        iframe.style.border = 'none';
        iframe.style.background = '#fff';
        iframe.style.borderRadius = '12px';
        iframe.style.boxShadow = '0 30px 100px rgba(0,0,0,0.5)';
        iframe.style.display = 'none';
        iframe.style.transform = 'scale(0.85)';
        iframe.style.transformOrigin = 'top center';
        
        iframe.onload = () => {
            const loading = body.querySelector('.loading-preview');
            if (loading) loading.style.display = 'none';
            iframe.style.display = 'block';
        };

        body.appendChild(iframe);
        iframe.src = fullPath;

        useBtn.onclick = () => window.location.href = `audbear_techy_web_resume_builder.html?template=${tpl.id}`;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };


    window.closeQuickView = function() {
        const modal = document.getElementById('template-modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    function getRandom(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function formatStat(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    }

    const observerOptions = {
        root: document.querySelector('.gallery-content-scrollable'),
        rootMargin: '200px',
        threshold: 0.01
    };
    
    const iframeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const iframe = entry.target.querySelector('iframe');
                if (iframe && !iframe.src) {
                    iframe.src = iframe.dataset.src;
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const catIcons = {
        all: 'fa-border-all',
        fresher: 'fa-seedling',
        certified: 'fa-certificate',
        intern: 'fa-user-graduate',
        professional: 'fa-briefcase',
        executive: 'fa-user-tie',
        liked: 'fa-heart'
    };

    const scrollableArea = document.querySelector('.gallery-content-scrollable');
    if (scrollableArea) {
        scrollableArea.addEventListener('click', (e) => {
            if (!e.target.closest('.template-card') && window.selectedTemplateId) {
                const prevId = window.selectedTemplateId;
                window.selectedTemplateId = null;
                
                if (prevId) {
                    const prevCard = document.querySelector(`.template-card[data-id="${prevId}"]`);
                    if (prevCard) prevCard.classList.remove('selected');
                }
                updateFloatingBtn();
            }
        });
    }

    if (!grid || !window.TEMPLATES) return;

    let currentFilter = 'all';

    function renderGallery() {
        grid.innerHTML = '';
        const stats = JSON.parse(localStorage.getItem('audbear_template_stats') || '{}');
        
        const filtered = currentFilter === 'all' 
            ? window.TEMPLATES 
            : currentFilter === 'liked'
                ? window.TEMPLATES.filter(t => isLiked(t.id))
                : window.TEMPLATES.filter(t => t.category === currentFilter);

        let index = 0;
        const BATCH_SIZE = 8;

        function renderBatch() {
            const limit = Math.min(index + BATCH_SIZE, filtered.length);
            
            for (; index < limit; index++) {
                const tpl = filtered[index];
                if (!stats[tpl.id]) {
                    stats[tpl.id] = { likes: getRandom(160, 1200), views: getRandom(1600, 24000) };
                }

                const card = document.createElement('div');
                card.dataset.id = tpl.id;
                card.className = `template-card ${window.selectedTemplateId === tpl.id ? 'selected' : ''}`;
                card.onclick = () => {
                    const prevId = window.selectedTemplateId;
                    
                    if (window.selectedTemplateId === tpl.id) {
                        window.selectedTemplateId = null;
                    } else {
                        window.selectedTemplateId = tpl.id;
                    }

                    // Remove selection from previous card
                    if (prevId) {
                        const prevCard = document.querySelector(`.template-card[data-id="${prevId}"]`);
                        if (prevCard) prevCard.classList.remove('selected');
                    }

                    // Add selection to new card
                    if (window.selectedTemplateId) {
                        const newCard = document.querySelector(`.template-card[data-id="${window.selectedTemplateId}"]`);
                        if (newCard) newCard.classList.add('selected');
                    }

                    updateFloatingBtn();
                };
                
                const catIcon = catIcons[tpl.category] || 'fa-gem';
                
                const isTplLiked = isLiked(tpl.id);

                card.innerHTML = `
                    <div class="template-preview">
                        <div class="template-skeleton">
                            <i class="fa-solid fa-gem"></i>
                        </div>
                        <iframe data-src="${tpl.htmlPath}" class="template-card-iframe" scrolling="no" onload="this.previousElementSibling.style.opacity='0'; setTimeout(() => this.previousElementSibling.remove(), 400); this.style.transform='scale(' + (this.parentElement.offsetWidth / 850) + ')'"></iframe>
                        <div class="template-overlay">
                            <div class="selection-indicator">
                                <i class="fa-solid fa-circle-check"></i>
                            </div>
                        </div>
                        <button class="tpl-view-btn" onclick="event.stopPropagation(); openQuickView('${tpl.id}')" title="Quick View">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="like-btn ${isTplLiked ? 'active' : ''}" onclick="event.stopPropagation(); toggleLike('${tpl.id}')">
                            <i class="${isTplLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                    </div>
                    <div class="template-info">
                        <div class="template-header">
                            <i class="fa-solid ${catIcon} design-gem"></i>
                            <span class="template-name">${tpl.name}</span>
                        </div>
                        <div class="template-meta">
                            <span class="template-tier">${tpl.category}</span>
                            <div class="template-stats">
                                <span><i class="fa-regular fa-eye"></i> ${formatStat(stats[tpl.id].views)}</span>
                                <span class="${isTplLiked ? 'stat-liked' : ''}">
                                    <i class="${isTplLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> 
                                    ${formatStat(stats[tpl.id].likes)}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
                iframeObserver.observe(card);
            }

            if (index < filtered.length) {
                requestAnimationFrame(renderBatch);
            } else {
                localStorage.setItem('audbear_template_stats', JSON.stringify(stats));
            }
        }

        renderBatch();
    }


    function renderFilters() {
        filterContainer.innerHTML = '';
        
        // Get unique categories and their counts
        const counts = { all: window.TEMPLATES.length };
        const categories = [];
        
        window.TEMPLATES.forEach(t => {
            if (!categories.includes(t.category)) categories.push(t.category);
            counts[t.category] = (counts[t.category] || 0) + 1;
        });
        
        counts['liked'] = window.TEMPLATES.filter(t => isLiked(t.id)).length;

        const allCats = ['all', 'fresher', 'certified', 'intern', 'professional', 'executive', 'liked'];
        
        allCats.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = `filter-btn ${cat}-cat ${currentFilter === cat ? 'active' : ''}`;
            const label = cat === 'all' ? 'All Templates' : cat.charAt(0).toUpperCase() + cat.slice(1);
            const icon = catIcons[cat] || 'fa-tag';
            
            const count = counts[cat] || 0;
            btn.innerHTML = `
                <i class="fa-solid ${icon}"></i>
                <span>${label}</span>
                <span class="filter-count">${count}</span>
            `;
            
            btn.onclick = () => {
                currentFilter = cat;
                renderFilters();
                renderGallery();
            };
            filterContainer.appendChild(btn);
        });

        // Update Floating Build Button
        updateFloatingBtn();
    }

    function updateFloatingBtn() {
        const btn = document.getElementById('floating-build-btn');
        if (!btn) return;
        
        const isSelected = !!window.selectedTemplateId;
        if (isSelected) {
            btn.classList.add('active');
            btn.disabled = false;
        } else {
            btn.classList.remove('active');
            btn.disabled = true;
        }
        
        btn.onclick = () => {
            if (window.selectedTemplateId) {
                window.location.href = `audbear_techy_web_resume_builder.html?template=${window.selectedTemplateId}`;
            }
        };
    }




    renderFilters();
    renderGallery();
});
