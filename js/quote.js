// ============================================================
// js/quote.js — Quote Cart (localStorage)
// ============================================================
// Cart item shape: { id, name, category }
// ============================================================

(function () {
    'use strict';

    const STORAGE_KEY = 'rangechem_quote_cart';

    // ── Helpers ────────────────────────────────────────────
    function getCart() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveCart(cart) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }

    // ── Add to Cart ────────────────────────────────────────
    function addToCart(id, name, category) {
        const cart = getCart();
        if (cart.some(item => item.id === id)) return false;
        cart.push({ id, name, category });
        saveCart(cart);
        updateBadge();
        showToast(`"${name}" added to quote.`);

        // Update all matching buttons on the page
        document.querySelectorAll(`.btn-add-quote[data-id="${id}"]`).forEach(btn => {
            btn.classList.add('added');
            btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5"></i> In Quote`;
            if (window.lucide) lucide.createIcons();
        });

        return true;
    }

    // ── Remove from Cart ───────────────────────────────────
    function removeFromCart(productId) {
        const cart = getCart().filter(item => item.id !== productId);
        saveCart(cart);
        updateBadge();
        return cart;
    }

    // ── Clear Cart ─────────────────────────────────────────
    function clearCart() {
        localStorage.removeItem(STORAGE_KEY);
        updateBadge();
    }

    // ── Badge Count ────────────────────────────────────────
    function updateBadge() {
        const els = document.querySelectorAll('.quote-count');
        const count = getCart().length;
        els.forEach(el => {
            el.textContent = count;
            el.style.display = count === 0 ? 'none' : '';
            el.classList.remove('bump');
            void el.offsetWidth;
            el.classList.add('bump');
            setTimeout(() => el.classList.remove('bump'), 400);
        });
    }

    // ── Toast ──────────────────────────────────────────────
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

        setTimeout(() => toast.remove(), 3000);
    }

    // ── Delegate click handling ────────────────────────────
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.btn-add-quote');
        if (!btn) return;

        const id       = btn.dataset.id;
        const name     = btn.dataset.name     || 'Product';
        const category = btn.dataset.category || '';

        if (!id) return;

        if (btn.classList.contains('added')) {
            // Toggle: remove from quote
            removeFromCart(id);
            document.querySelectorAll(`.btn-add-quote[data-id="${id}"]`).forEach(b => {
                b.classList.remove('added');
                b.innerHTML = `<i data-lucide="plus" class="w-3.5 h-3.5"></i> Add to Quote`;
            });
            if (window.lucide) lucide.createIcons();
            showToast(`"${name}" removed from quote.`, 'info');
        } else {
            addToCart(id, name, category);
        }
    });

    // ── Sync all button states from cart ─────────────────────
    function syncButtons() {
        const cart = getCart();
        document.querySelectorAll('.btn-add-quote').forEach(btn => {
            const id = btn.dataset.id;
            const inCart = cart.some(item => String(item.id) === String(id));
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

    // ── Init ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        updateBadge();
        syncButtons();
    });

    // Re-sync when returning via browser back/forward cache
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            updateBadge();
            syncButtons();
        }
    });

    // ── Expose API globally ────────────────────────────────
    window.RangechemQuote = {
        getCart,
        addToCart,
        removeFromCart,
        clearCart,
        updateBadge,
        syncButtons,
        showToast,
    };

})();
