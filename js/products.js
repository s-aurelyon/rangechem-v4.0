// ============================================================
// js/products.js — Client-Side Product catalog & Filter Engine
// ============================================================
(function () {
    'use strict';

    // ── Map sizing to SVG image assets for clean visuals ──
    function getProductImage(variants, category) {
        if (!variants || variants.length === 0) return 'assets/products/product-5l.svg';
        
        // Match standard patterns (e.g. 5lt, 5kg -> product-5l.svg)
        const sizeStr = (variants[0].size_packaging || '').toLowerCase();
        if (sizeStr.includes('5l') || sizeStr.includes('5k')) {
            return 'assets/products/product-5l.svg';
        } else if (sizeStr.includes('1l') || sizeStr.includes('1k') || sizeStr.includes('10l') || sizeStr.includes('25l') || sizeStr.includes('25k')) {
            return 'assets/products/product-1l.svg';
        } else if (sizeStr.includes('500') || sizeStr.includes('750') || sizeStr.includes('375') || sizeStr.includes('250') || sizeStr.includes('100g')) {
            return 'assets/products/product-500ml.svg';
        }
        
        // Category generic fallback images if no size matches
        const cat = (category || '').toLowerCase();
        if (cat.includes('paper')) {
            return 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=70'; // Paper towels
        } else if (cat.includes('brush') || cat.includes('mop') || cat.includes('tool') || cat.includes('broom')) {
            return 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=70'; // Mop/cleaning tools
        }
        
        return 'assets/products/product-5l.svg';
    }

    // ── Card Builder ──────────────────────────────────────
    function createCard(p, i) {
        const article = document.createElement('article');
        article.className = 'product-card fade-up visible';
        article.style.transitionDelay = Math.min(i * 30, 300) + 'ms';
        article.setAttribute('aria-label', p.name || 'Product');

        const catClass = (p.category || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const hasVariants = p.variants && p.variants.length > 0;
        
        // 1. Build Variant Options HTML
        let variantSelectHtml = '';
        let initialPrice = null;
        let initialStock = '';
        let initialSize = '';

        if (hasVariants) {
            initialSize = p.variants[0].size_packaging;
            initialPrice = p.variants[0].price_rand;
            initialStock = p.variants[0].stock_code || '';

            if (p.variants.length > 1) {
                variantSelectHtml = `
                    <div class="mt-3">
                        <label class="form-label text-[10px] mb-1">Select Size</label>
                        <select class="variant-select w-full text-xs font-600 bg-gray-50 border border-gray-200 py-1.5 px-2 rounded-lg outline-none focus:border-rc-red">
                            ${p.variants.map(v => `
                                <option value="${escHtml(v.size_packaging)}" 
                                        data-price="${v.price_rand !== null ? v.price_rand : ''}"
                                        data-stock="${escHtml(v.stock_code || '')}">
                                    ${escHtml(v.size_packaging)} ${v.price_rand !== null ? `(R ${parseFloat(v.price_rand).toFixed(2)})` : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
            } else {
                variantSelectHtml = `
                    <div class="mt-3 text-xs font-700 text-gray-700 flex items-center justify-between">
                        <span>Size: ${escHtml(initialSize)}</span>
                        ${initialPrice !== null ? `<span class="text-rc-red font-800">R ${parseFloat(initialPrice).toFixed(2)}</span>` : ''}
                    </div>
                `;
            }
        }

        // 2. Build Card Inner HTML
        article.innerHTML = `
            <div class="product-card-img-wrap product-svg-wrap">
                <img src="${escHtml(p.image_url)}"
                     alt="${escHtml(p.name)}"
                     loading="lazy"
                     onerror="this.src='assets/products/product-5l.svg'">
                <span class="category-pill bg-gray-100 text-gray-800 border border-gray-200 text-[10px] font-700 py-0.5 px-2.5 rounded-full absolute top-3 left-3 truncate max-w-[80%]">${escHtml(p.category)}</span>
            </div>
            <div class="product-card-body flex flex-col justify-between flex-1 p-5">
                <div>
                    <h2 class="product-card-title text-sm font-800 text-gray-900 leading-snug mb-1 truncate" title="${escHtml(p.name)}">${escHtml(p.name)}</h2>
                    <p class="product-card-desc text-xs text-gray-500 line-clamp-3 leading-relaxed min-h-[54px]">${escHtml(p.description || 'No description available for this product.')}</p>
                    
                    ${variantSelectHtml}
                </div>
                
                <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                    <!-- Quantity Adjuster -->
                    <div class="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
                        <button type="button" class="btn-qty-dec w-7 h-7 text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center justify-center rounded" aria-label="Decrease quantity">-</button>
                        <input type="number" class="quantity-input w-8 text-center text-xs font-800 bg-transparent border-none outline-none p-0" value="1" min="1" aria-label="Quantity">
                        <button type="button" class="btn-qty-inc w-7 h-7 text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center justify-center rounded" aria-label="Increase quantity">+</button>
                    </div>

                    <!-- Add to Quote Button -->
                    <button class="btn-add-quote flex-1"
                            data-id="${p.id}"
                            data-name="${escHtml(p.name)}"
                            data-category="${escHtml(p.category)}"
                            data-size="${escHtml(initialSize)}"
                            data-price="${initialPrice !== null ? initialPrice : ''}"
                            data-stock="${escHtml(initialStock)}"
                            aria-label="Add ${escHtml(p.name)} to quote">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add to Quote
                    </button>
                </div>
            </div>
        `;

        // 3. Bind interactive element events inside the card
        const qtyInput = article.querySelector('.quantity-input');
        
        article.querySelector('.btn-qty-dec')?.addEventListener('click', () => {
            qtyInput.value = Math.max(1, (parseInt(qtyInput.value) || 1) - 1);
        });

        article.querySelector('.btn-qty-inc')?.addEventListener('click', () => {
            qtyInput.value = (parseInt(qtyInput.value) || 1) + 1;
        });

        qtyInput?.addEventListener('change', () => {
            if (parseInt(qtyInput.value) < 1 || isNaN(parseInt(qtyInput.value))) {
                qtyInput.value = 1;
            }
        });

        // If multi-variant dropdown exists, trigger syncButtons when size is changed
        article.querySelector('.variant-select')?.addEventListener('change', () => {
            if (window.RangechemQuote) window.RangechemQuote.syncButtons();
        });

        return article;
    }

    // ── Render Product Grid ───────────────────────────────
    function renderProducts(products) {
        const grid = document.getElementById('products-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-20 text-center">
                    <div class="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                        <i data-lucide="search-x" class="w-8 h-8 text-rc-red"></i>
                    </div>
                    <h2 class="text-lg font-800 text-gray-900 mb-1">No Products Found</h2>
                    <p class="text-gray-500 text-xs max-w-sm mb-5">
                        Try adjusting your search query or selecting a different category.
                    </p>
                    <a href="products.html" class="btn-primary text-xs py-2 px-5">Reset Filters</a>
                </div>`;
            if (window.lucide) lucide.createIcons();
            return;
        }

        const frag = document.createDocumentFragment();
        products.forEach((p, i) => frag.appendChild(createCard(p, i)));
        grid.appendChild(frag);

        if (window.lucide) lucide.createIcons();

        // Sync buttons with the Quote cart states
        if (window.RangechemQuote) {
            window.RangechemQuote.syncButtons();
        }
    }

    // ── Update Result Count label ──────────────────────────
    function updateCount(n) {
        const el = document.getElementById('result-count');
        if (el) el.textContent = `${n} product${n !== 1 ? 's' : ''} found`;
    }

    // ── Apply Filters ──────────────────────────────────────
    function applyFilters(search, category) {
        let list = window.PRODUCTS || [];

        if (category) {
            list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }

        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.description && p.description.toLowerCase().includes(q)) ||
                p.category.toLowerCase().includes(q) ||
                (p.variants && p.variants.some(v => v.stock_code && v.stock_code.toLowerCase().includes(q)))
            );
        }

        renderProducts(list);
        updateCount(list.length);
        return list;
    }

    // ── Update Active Category Selection Highlight ────────
    function setActiveCategory(category) {
        // Desktop sidebar links
        document.querySelectorAll('.cat-sidebar-link').forEach(link => {
            const c = link.dataset.cat || '';
            link.classList.toggle('active', c.toLowerCase() === (category || '').toLowerCase());
        });

        // Mobile slider links
        document.querySelectorAll('.filter-pill').forEach(pill => {
            const c = pill.dataset.cat || '';
            pill.classList.toggle('active', c.toLowerCase() === (category || '').toLowerCase());
        });
    }

    // ── Push URL state helper ──────────────────────────────
    function updateUrl(search, category) {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        const qs = params.toString();
        history.replaceState({}, '', qs ? ('?' + qs) : location.pathname);
    }

    // ── Dynamic Category Sidebar populator ───────────────
    function populateCategoriesMenu(categories, currentCategory) {
        const sidebar = document.getElementById('category-sidebar-menu');
        const swiper = document.getElementById('category-swiper-menu');

        // Populate Desktop Sidebar
        if (sidebar) {
            sidebar.innerHTML = `
                <button class="cat-sidebar-link ${!currentCategory ? 'active' : ''}" data-cat="" type="button">
                    <span class="flex items-center gap-2">
                        <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> All Products
                    </span>
                    <span class="bg-gray-100 text-gray-600 text-[10px] font-700 py-0.5 px-2 rounded-full">${window.PRODUCTS.length}</span>
                </button>
            `;
            
            categories.forEach(cat => {
                const count = cat.product_count;
                if (count === 0) return;
                
                const btn = document.createElement('button');
                btn.className = `cat-sidebar-link ${currentCategory.toLowerCase() === cat.name.toLowerCase() ? 'active' : ''}`;
                btn.type = 'button';
                btn.dataset.cat = cat.name;
                btn.innerHTML = `
                    <span class="flex items-center gap-2 truncate">
                        <i data-lucide="package" class="w-3.5 h-3.5 flex-shrink-0"></i> ${cat.name}
                    </span>
                    <span class="bg-gray-100 text-gray-600 text-[10px] font-700 py-0.5 px-2 rounded-full">${count}</span>
                `;
                sidebar.appendChild(btn);
            });
        }

        // Populate Mobile Scroll Bar
        if (swiper) {
            swiper.innerHTML = `
                <button class="filter-pill ${!currentCategory ? 'active' : ''}" data-cat="" type="button">
                    All
                </button>
            `;
            
            categories.forEach(cat => {
                if (cat.product_count === 0) return;
                const btn = document.createElement('button');
                btn.className = `filter-pill ${currentCategory.toLowerCase() === cat.name.toLowerCase() ? 'active' : ''}`;
                btn.type = 'button';
                btn.dataset.cat = cat.name;
                btn.textContent = cat.name;
                swiper.appendChild(btn);
            });
        }

        // Re-bind listeners for newly created elements
        const triggerFilter = (cat) => {
            currentCategory = cat;
            const searchVal = document.getElementById('product-search')?.value.trim() || '';
            updateUrl(searchVal, currentCategory);
            updateActiveTagBanner(searchVal, currentCategory);
            applyFilters(searchVal, currentCategory);
            setActiveCategory(currentCategory);
        };

        document.querySelectorAll('.cat-sidebar-link, .filter-pill').forEach(btn => {
            btn.addEventListener('click', function () {
                triggerFilter(this.dataset.cat || '');
            });
        });

        if (window.lucide) lucide.createIcons();
    }

    // ── Active Filters Tag Banner updates ───────────────────
    function updateActiveTagBanner(search, category) {
        const banner = document.getElementById('active-tags');
        if (!banner) return;
        banner.innerHTML = '';

        if (!search && !category) { 
            banner.classList.add('hidden'); 
            return; 
        }
        banner.classList.remove('hidden');

        if (search) {
            banner.innerHTML += `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-rc-red text-xs font-700 rounded-full border border-rc-red/10 shadow-sm">
                    <i data-lucide="search" class="w-3 h-3"></i>
                    "${escHtml(search)}"
                    <button type="button" class="ml-1 hover:opacity-75 clear-search" aria-label="Clear search">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                </span>`;
        }

        if (category) {
            banner.innerHTML += `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-700 rounded-full border border-gray-200 shadow-sm">
                    <i data-lucide="tag" class="w-3 h-3"></i>
                    ${escHtml(category)}
                    <button type="button" class="ml-1 hover:opacity-75 clear-category" aria-label="Clear category">
                        <i data-lucide="x" class="w-3 h-3"></i>
                    </button>
                </span>`;
        }

        if (window.lucide) lucide.createIcons();

        banner.querySelector('.clear-search')?.addEventListener('click', () => {
            const si = document.getElementById('product-search');
            if (si) si.value = '';
            updateUrl('', category);
            updateActiveTagBanner('', category);
            applyFilters('', category);
            setActiveCategory(category);
        });

        banner.querySelector('.clear-category')?.addEventListener('click', () => {
            const srch = document.getElementById('product-search')?.value.trim() || '';
            updateUrl(srch, '');
            updateActiveTagBanner(srch, '');
            applyFilters(srch, '');
            setActiveCategory('');
        });
    }

    // ── Initialize App and Load API Products ──────────────
    document.addEventListener('DOMContentLoaded', async function () {
        const params = new URLSearchParams(location.search);
        let search = params.get('search') || '';
        let category = params.get('category') || '';

        // Handle category page direct slug redirects
        const typeSlug = params.get('type') || '';
        if (typeSlug) {
            // Slug-matching logic to match database uppercase categories
            const slugMap = { 
                detergents: 'AUTOMOTIVE DETERGENTS', 
                degreasers: 'DEGREASERS', 
                disinfectants: 'BATHROOM DETERGENTS' 
            };
            category = slugMap[typeSlug.toLowerCase()] || category;
        }

        try {
            // 1. Fetch Dynamic Flat Products from FastAPI
            const response = await fetch('/api/products/flat');
            if (!response.ok) throw new Error('API fetch failed');
            const flatProducts = await response.json();

            // 2. Format to window.PRODUCTS (compatibility layer)
            window.PRODUCTS = flatProducts.map(p => ({
                id: p.id,
                name: p.title,
                category: p.category,
                description: p.description,
                image_url: getProductImage(p.variants, p.category),
                variants: p.variants
            }));

            // 3. Fetch Category product counts
            const catResponse = await fetch('/api/categories');
            const categoriesList = catResponse.ok ? await catResponse.json() : [];

            // 4. Populate Sidebar/Mobile menus
            populateCategoriesMenu(categoriesList, category);

            // Pre-fill Search input box
            const searchInput = document.getElementById('product-search');
            if (searchInput) {
                searchInput.value = search;
                searchInput.addEventListener('input', function () {
                    search = this.value.trim();
                    updateUrl(search, category);
                    updateActiveTagBanner(search, category);
                    applyFilters(search, category);
                    setActiveCategory(category);
                });
            }

            // 5. Initial Render
            updateActiveTagBanner(search, category);
            applyFilters(search, category);
            setActiveCategory(category);

        } catch (err) {
            console.error("Failed to load products from API backend:", err);
            // Fallback empty state in case backend is offline
            renderProducts([]);
        }
    });

    // ── HTML Escaper Helper ────────────────────────────────
    function escHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    window.RangechemProducts = { applyFilters, renderProducts };
})();
