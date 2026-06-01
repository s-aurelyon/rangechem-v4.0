// ============================================================
// js/quote.js — Dynamic Quote Cart State Manager (localStorage)
// ============================================================
// Cart item shape:
// { productId, key, name, category, size, price, stockCode, quantity }
// ============================================================

(function () {
    'use strict';

    const STORAGE_KEY = 'rangechem_quote_cart';

    // ── Load cart from localStorage ────────────────────────
    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    // ── Save cart to localStorage ──────────────────────────
    function saveCart(cart) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }

    // ── Add to Cart ────────────────────────────────────────
    function addToCart(productId, name, category, size, price, stockCode, quantity = 1) {
        const cart = getCart();
        productId = parseInt(productId);
        quantity = parseInt(quantity) || 1;
        
        // Composite key: e.g. "12_5lt"
        const key = `${productId}_${size}`;
        const existingIndex = cart.findIndex(item => item.key === key);

        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
        } else {
            cart.push({
                productId,
                key,
                name,
                category,
                size,
                price: price !== null ? parseFloat(price) : null,
                stockCode: stockCode || null,
                quantity
            });
        }

        saveCart(cart);
        updateBadge();
        showToast(`"${name}" (${size}) added to quote.`);
        syncButtons();

        return true;
    }

    // ── Remove from Cart ───────────────────────────────────
    function removeFromCart(key) {
        const cart = getCart().filter(item => item.key !== key);
        saveCart(cart);
        updateBadge();
        syncButtons();
        return cart;
    }

    // ── Update Quantity ────────────────────────────────────
    function updateQuantity(key, quantity) {
        const cart = getCart();
        const item = cart.find(i => i.key === key);
        if (item) {
            item.quantity = Math.max(1, parseInt(quantity) || 1);
            saveCart(cart);
            updateBadge();
        }
        return cart;
    }

    // ── Clear Cart ─────────────────────────────────────────
    function clearCart() {
        localStorage.removeItem(STORAGE_KEY);
        updateBadge();
        syncButtons();
    }

    // ── Badge Count ────────────────────────────────────────
    // Sum of quantities in cart
    function updateBadge() {
        const els = document.querySelectorAll('.quote-count');
        const cart = getCart();
        const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

        els.forEach(el => {
            el.textContent = totalQty;
            el.style.display = totalQty === 0 ? 'none' : '';
            el.classList.remove('bump');
            void el.offsetWidth; // Trigger reflow
            el.classList.add('bump');
            setTimeout(() => el.classList.remove('bump'), 400);
        });
    }

    // ── Toast Notification ─────────────────────────────────
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icon = type === 'info'
            ? `<i data-lucide="info" class="w-4 h-4 text-blue-400 flex-shrink-0"></i>`
            : `<i data-lucide="check-circle" class="w-4 h-4 text-green-400 flex-shrink-0"></i>`;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `${icon}<span>${message}</span>`;
        container.appendChild(toast);

        if (window.lucide) lucide.createIcons();

        // Animate out and remove
        setTimeout(() => {
            toast.style.animation = 'toastOut 300ms ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ── Sync Add-to-Quote Button States ───────────────────
    // Reads page cards, identifies active selections, and styles buttons
    function syncButtons() {
        const cart = getCart();

        document.querySelectorAll('.product-card').forEach(card => {
            const btn = card.querySelector('.btn-add-quote');
            if (!btn) return;

            const productId = btn.dataset.id;
            const selectEl = card.querySelector('.variant-select');
            
            // Get selected size from dropdown
            let selectedSize = '';
            if (selectEl) {
                selectedSize = selectEl.value;
            } else {
                selectedSize = btn.dataset.size || '';
            }

            const compositeKey = `${productId}_${selectedSize}`;
            const inCart = cart.some(item => item.key === compositeKey);

            if (inCart) {
                btn.classList.add('added');
                btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> In Quote`;
            } else {
                btn.classList.remove('added');
                btn.innerHTML = `<i data-lucide="plus" class="w-3.5 h-3.5"></i> Add to Quote`;
            }
        });

        if (window.lucide) lucide.createIcons();
    }

    // ── Delegate Click Handling ───────────────────────────
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-add-quote');
        if (!btn) return;

        const id       = btn.dataset.id;
        const name     = btn.dataset.name     || 'Product';
        const category = btn.dataset.category || '';

        if (!id) return;

        // Find the variant details from dropdown or button datasets
        const card = btn.closest('.product-card');
        const selectEl = card ? card.querySelector('.variant-select') : null;
        const qtyEl = card ? card.querySelector('.quantity-input') : null;
        
        let size = '';
        let price = null;
        let stockCode = '';
        let quantity = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;

        if (selectEl) {
            const selectedOpt = selectEl.options[selectEl.selectedIndex];
            size = selectEl.value;
            price = selectedOpt.dataset.price ? parseFloat(selectedOpt.dataset.price) : null;
            stockCode = selectedOpt.dataset.stock || '';
        } else {
            size = btn.dataset.size || '';
            price = btn.dataset.price ? parseFloat(btn.dataset.price) : null;
            stockCode = btn.dataset.stock || '';
        }

        const compositeKey = `${id}_${size}`;

        if (btn.classList.contains('added')) {
            // Remove from cart
            removeFromCart(compositeKey);
            showToast(`"${name}" (${size}) removed from quote.`, 'info');
        } else {
            // Add to cart
            addToCart(id, name, category, size, price, stockCode, quantity);
        }
    });

    // ── Init on page load ──────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        updateBadge();
        syncButtons();
    });

    // Re-sync when returning via browser cache (back/forward button)
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            updateBadge();
            syncButtons();
        }
    });

    // Expose API globally
    window.RangechemQuote = {
        getCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        updateBadge,
        syncButtons,
        showToast,
    };

})();
