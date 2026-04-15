// ============================================================
// js/products.js — Client-side product grid renderer + filter
// ============================================================
(function () {
    'use strict';

    // ── Card builder ──────────────────────────────────────
    function createCard(p, i) {
        const article = document.createElement('article');
        article.className = 'product-card fade-up visible';
        article.style.transitionDelay = Math.min(i * 40, 400) + 'ms';
        article.setAttribute('aria-label', p.name || 'Product');

        const catClass = (p.category || '').toLowerCase().replace(/\s+/g, '-');

        article.innerHTML = `
            <div class="product-card-img-wrap product-svg-wrap">
                <img src="${escHtml(p.image_url || '')}"
                     alt="${escHtml(p.name || '')}"
                     loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400&q=70'">
                <span class="category-pill ${catClass}">${escHtml(p.category || '')}</span>
            </div>
            <div class="product-card-body">
                <h2 class="product-card-title">${escHtml(p.name || '')}</h2>
                <p class="product-card-desc">${escHtml(p.description || '')}</p>
                <button class="btn-add-quote"
                        data-id="${escHtml(String(p.id))}"
                        data-name="${escHtml(p.name || '')}"
                        data-category="${escHtml(p.category || '')}"
                        aria-label="Add ${escHtml(p.name || 'product')} to quote">
                    <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add to Quote
                </button>
            </div>
        `;

        return article;
    }

    // ── Render grid ───────────────────────────────────────
    function renderProducts(products) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-24 text-center">
                    <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <i data-lucide="search-x" class="w-8 h-8 text-rc-red"></i>
                    </div>
                    <h2 class="text-xl font-800 text-gray-900 mb-2">No Products Found</h2>
                    <p class="text-gray-500 text-sm max-w-sm mb-6">
                        Try adjusting your search or filters.
                    </p>
                    <a href="products.html" class="btn-primary">Clear Filters</a>
                </div>`;
            if (window.lucide) lucide.createIcons();
            return;
        }

        const frag = document.createDocumentFragment();
        products.forEach((p, i) => frag.appendChild(createCard(p, i)));
        grid.appendChild(frag);

        if (window.lucide) lucide.createIcons();

        // Re-mark cart items
        if (window.RangechemQuote) {
            const cart = RangechemQuote.getCart();
            cart.forEach(item => {
                grid.querySelectorAll(`.btn-add-quote[data-id="${item.id}"]`).forEach(btn => {
                    btn.classList.add('added');
                    btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> In Quote`;
                });
            });
            if (window.lucide) lucide.createIcons();
        }
    }

    // ── Update result count label ─────────────────────────
    function updateCount(n) {
        const el = document.getElementById('result-count');
        if (el) el.textContent = `${n} product${n !== 1 ? 's' : ''} found`;
    }

    // ── Apply filters ─────────────────────────────────────
    function applyFilters(search, category) {
        let list = window.PRODUCTS || [];

        if (category) {
            list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q)
            );
        }

        renderProducts(list);
        updateCount(list.length);
        return list;
    }

    // ── Update active filter pill ─────────────────────────
    function setActivePill(category) {
        document.querySelectorAll('.filter-pill').forEach(pill => {
            const pillCat = pill.dataset.cat || '';
            pill.classList.toggle('active', pillCat.toLowerCase() === (category || '').toLowerCase());
        });
    }

    // ── Push state helper ─────────────────────────────────
    function updateUrl(search, category) {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        const qs = params.toString();
        history.replaceState({}, '', qs ? ('?' + qs) : location.pathname);
    }

    // ── Init (products.html + category.html) ──────────────
    document.addEventListener('DOMContentLoaded', function () {
        const params = new URLSearchParams(location.search);
        let search = params.get('search') || '';
        let category = params.get('category') || '';

        // category.html may pass a "type" slug  (detergents → Detergents)
        const typeSlug = params.get('type') || '';
        const slugMap = { detergents: 'Detergents', degreasers: 'Degreasers', disinfectants: 'Disinfectants' };
        if (typeSlug && !category) category = slugMap[typeSlug.toLowerCase()] || '';

        // Pre-fill search input
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.value = search;

            searchInput.addEventListener('input', function () {
                search = this.value.trim();
                updateUrl(search, category);
                updateActiveTagBanner(search, category);
                applyFilters(search, category);
                setActivePill(category);
            });
        }

        // Filter pills
        document.querySelectorAll('.filter-pill').forEach(pill => {
            pill.addEventListener('click', function (e) {
                e.preventDefault();
                category = this.dataset.cat || '';
                updateUrl(search, category);
                updateActiveTagBanner(search, category);
                applyFilters(search, category);
                setActivePill(category);
            });
        });

        updateActiveTagBanner(search, category);
        applyFilters(search, category);
        setActivePill(category);
    });

    // ── Active tag banner (products.html) ─────────────────
    function updateActiveTagBanner(search, category) {
        const banner = document.getElementById('active-tags');
        if (!banner) return;
        banner.innerHTML = '';

        if (!search && !category) { banner.classList.add('hidden'); return; }
        banner.classList.remove('hidden');

        if (search) {
            banner.innerHTML += `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-rc-red text-xs font-700 rounded-full">
                    <i data-lucide="search" class="w-3 h-3"></i>
                    "${escHtml(search)}"
                    <button type="button" class="ml-1 hover:opacity-70 clear-search" aria-label="Clear search">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                </span>`;
        }

        if (category) {
            banner.innerHTML += `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-700 rounded-full">
                    <i data-lucide="tag" class="w-3 h-3"></i>
                    ${escHtml(category)}
                    <button type="button" class="ml-1 hover:opacity-70 clear-category" aria-label="Clear category">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                </span>`;
        }

        if (window.lucide) lucide.createIcons();

        banner.querySelector('.clear-search')?.addEventListener('click', () => {
            const si = document.getElementById('product-search');
            if (si) si.value = '';
            // Re-read category from pills
            const activeP = document.querySelector('.filter-pill.active');
            const cat = activeP ? (activeP.dataset.cat || '') : '';
            updateUrl('', cat);
            updateActiveTagBanner('', cat);
            applyFilters('', cat);
            setActivePill(cat);
        });

        banner.querySelector('.clear-category')?.addEventListener('click', () => {
            const srch = document.getElementById('product-search')?.value.trim() || '';
            updateUrl(srch, '');
            updateActiveTagBanner(srch, '');
            applyFilters(srch, '');
            setActivePill('');
        });
    }

    // ── Utility ───────────────────────────────────────────
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    window.RangechemProducts = { applyFilters, renderProducts };
})();
