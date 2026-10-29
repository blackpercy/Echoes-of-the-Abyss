/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Mobile layer for Evolve. Loaded after the game; changes nothing in the game's own code.
// - On narrow screens: one panel at a time (Resources / Game / Log), switched from a bar at the bottom.
// - On touch screens: a tap only does the thing (build, gather, research); press and hold shows its details.
(function () {
    'use strict';

    const NARROW = window.matchMedia('(max-width: 768px)');
    const TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const HOLD_MS = 450;
    const PANELS = [
        { id: 'res', icon: '📦', label: 'Resources' },
        { id: 'game', icon: '🧬', label: 'Game' },
        { id: 'log', icon: '📜', label: 'Log' },
    ];
    const STORE = 'evolve-mobile-panel';

    function read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
    }

    // --- Panels and the bottom bar ---
    let panel = read(STORE) || 'game';
    let unread = 0;

    function buildNav() {
        if (document.getElementById('mobNav')) return;
        const nav = document.createElement('nav');
        nav.id = 'mobNav';
        nav.setAttribute('aria-label', 'Panels');
        nav.innerHTML = PANELS.map(p => `<button type="button" data-panel="${p.id}"><span class="mob-icon">${p.icon}</span><span class="mob-label">${p.label}</span><span class="mob-badge" hidden></span></button>`).join('');
        nav.addEventListener('click', e => {
            const btn = e.target.closest('button[data-panel]');
            if (btn) show(btn.dataset.panel);
        });
        document.body.appendChild(nav);
    }

    function show(id) {
        panel = id;
        write(STORE, id);
        if (id === 'log') unread = 0;
        apply();
        updateTicker();
        window.scrollTo(0, 0);
    }

    function apply() {
        const body = document.body;
        const on = NARROW.matches;
        body.classList.toggle('mob', on);
        // The game locks scrolling on the page itself; on a phone the page is what scrolls.
        document.documentElement.classList.toggle('mob-page', on);
        for (const p of PANELS) body.classList.toggle(`mob-${p.id}`, on && panel === p.id);
        const nav = document.getElementById('mobNav');
        if (!nav) return;
        for (const btn of nav.querySelectorAll('button')) {
            btn.classList.toggle('on', btn.dataset.panel === panel);
            const badge = btn.querySelector('.mob-badge');
            if (btn.dataset.panel === 'log') {
                badge.hidden = !unread;
                badge.textContent = unread > 99 ? '99+' : String(unread);
            }
        }
    }

    // Count new messages while the log is out of sight.
    function watchLog() {
        const log = document.getElementById('msgQueueLog');
        if (!log || log.dataset.mobWatched) return;
        log.dataset.mobWatched = '1';
        new MutationObserver(records => {
            if (!NARROW.matches || panel === 'log') return;
            for (const r of records) unread += r.addedNodes.length;
            apply();
        }).observe(log, { childList: true });
    }

    // --- A strip of resources over the game panel, so you can see what you can afford ---
    // Two lines by default; a button at the end shows the rest.
    let tickerOpen = read('evolve-mobile-ticker') === 'open';
    let tickerTimer = null;

    function buildTicker() {
        if (document.getElementById('mobTicker') || !document.getElementById('main')) return;
        const strip = document.createElement('div');
        strip.id = 'mobTicker';
        strip.innerHTML = '<div class="mob-chips" title="Tap for all resources"></div><button type="button" class="mob-more" aria-label="Show all resources"></button>';
        strip.querySelector('.mob-chips').addEventListener('click', () => show('res'));
        strip.querySelector('.mob-more').addEventListener('click', () => {
            tickerOpen = !tickerOpen;
            write('evolve-mobile-ticker', tickerOpen ? 'open' : 'closed');
            updateTicker();
        });
        // In the page flow just above the game, so it can grow when opened.
        const main = document.getElementById('main');
        main.parentNode.insertBefore(strip, main);
        if (!tickerTimer) tickerTimer = setInterval(updateTicker, 1000);
        updateTicker();
    }

    function updateTicker() {
        const strip = document.getElementById('mobTicker');
        if (!strip) {
            buildTicker();
            return;
        }
        // Always directly above the game, wherever something else may have put it.
        const main = document.getElementById('main');
        if (main && strip.nextElementSibling !== main) main.parentNode.insertBefore(strip, main);
        if (!NARROW.matches || panel !== 'game') return;
        const box = strip.querySelector('.mob-chips');
        const more = strip.querySelector('.mob-more');
        const chips = [];
        for (const row of document.querySelectorAll('#resources .resource')) {
            if (row.style.display === 'none') continue;
            const name = row.querySelector('.res');
            const count = row.querySelector('.count');
            if (!name || !count) continue;
            const [have, max] = count.textContent.trim().split('/').map(t => t.trim());
            // Nowhere to keep it yet: nothing to show.
            if (max === '0' && have === '0') continue;
            const full = max && have === max;
            const colour = [...name.classList].find(c => c.startsWith('has-text-')) || '';
            chips.push(`<span class="mob-chip${full ? ' full' : ''}"><b class="${colour}">${name.textContent.trim()}</b> ${have}${max ? `<i>/${max}</i>` : ''}</span>`);
        }
        const html = chips.join('');
        if (box.dataset.html !== html) {
            box.dataset.html = html;
            box.innerHTML = html || '<span class="mob-chip">Resources</span>';
        }
        strip.classList.toggle('open', tickerOpen);
        // Count the chips that fall below the two lines shown.
        const limit = box.getBoundingClientRect().top + box.clientHeight + 1;
        const hidden = tickerOpen ? 0 : [...box.children].filter(c => c.getBoundingClientRect().top >= limit).length;
        more.hidden = !tickerOpen && !hidden;
        more.textContent = tickerOpen ? '▴' : `+${hidden}`;
    }

    // --- Touch: tap acts, press and hold explains ---
    // The game shows its details pop-ups on mouseover. A tap on a phone fakes a mouseover, so every tap
    // would also open a pop-up that then sticks. Instead, fake mouse events right after a touch are
    // stopped before they reach the game, and holding a finger down opens the pop-up on purpose.
    let lastTouch = 0;
    let holdTimer = null;
    let start = null;
    let held = false;
    let shownFor = null;

    // The nearest element the game has hooked a details pop-up to.
    function popoverTarget(el) {
        const $ = window.jQuery;
        if (!$ || !$._data) return null;
        for (let n = el; n && n !== document.body; n = n.parentElement) {
            const ev = $._data(n, 'events');
            if (ev && (ev.mouseover || ev.mouseenter)) return n;
        }
        return null;
    }

    function hidePopover() {
        const $ = window.jQuery;
        if (shownFor && $) $(shownFor).trigger('mouseout').trigger('mouseleave');
        shownFor = null;
        const pop = document.getElementById('popper');
        if (pop) pop.style.display = 'none';
    }

    function showPopover(el) {
        const $ = window.jQuery;
        if (!$) return;
        hidePopover();
        shownFor = el;
        $(el).trigger('mouseover').trigger('mouseenter');
        if (navigator.vibrate) navigator.vibrate(12);
    }

    function onTouchStart(e) {
        lastTouch = Date.now();
        held = false;
        // A touch anywhere but inside the open pop-up closes it.
        if (!e.target.closest('#popper')) hidePopover();
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        start = { x: t.clientX, y: t.clientY };
        const target = popoverTarget(e.target);
        clearTimeout(holdTimer);
        if (!target) return;
        holdTimer = setTimeout(() => {
            held = true;
            showPopover(target);
        }, HOLD_MS);
    }

    function onTouchMove(e) {
        if (!start) return;
        const t = e.touches[0];
        if (Math.abs(t.clientX - start.x) > 10 || Math.abs(t.clientY - start.y) > 10) clearTimeout(holdTimer);
    }

    function onTouchEnd(e) {
        lastTouch = Date.now();
        clearTimeout(holdTimer);
        start = null;
        // After a hold, the finger lifting must not also build or buy.
        if (held && e.cancelable) e.preventDefault();
    }

    // Stop the mouse events a browser fakes after a tap from reaching the game.
    function swallowFakeHover(e) {
        if (Date.now() - lastTouch < 800) e.stopPropagation();
    }

    function initTouch() {
        document.documentElement.classList.add('mob-touch');
        document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true, capture: true });
        document.addEventListener('touchend', onTouchEnd, { passive: false, capture: true });
        document.addEventListener('touchcancel', () => clearTimeout(holdTimer), { capture: true });
        for (const type of ['mouseover', 'mouseenter', 'mouseout', 'mouseleave']) window.addEventListener(type, swallowFakeHover, true);
        // A long press would otherwise open the browser's own menu.
        window.addEventListener('contextmenu', e => {
            if (Date.now() - lastTouch < 1500) e.preventDefault();
        }, true);
        // Scrolling closes a pop-up that would otherwise float over the wrong thing.
        window.addEventListener('scroll', () => { if (shownFor) hidePopover(); }, { passive: true, capture: true });
    }

    function tipOnce() {
        if (!TOUCH || read('evolve-mobile-tip')) return;
        write('evolve-mobile-tip', '1');
        const tip = document.createElement('div');
        tip.id = 'mobTip';
        tip.innerHTML = '👆 Tap to build or buy. <b>Press and hold</b> anything to see what it costs and does.<button type="button" aria-label="Close">✕</button>';
        tip.querySelector('button').addEventListener('click', () => tip.remove());
        document.body.appendChild(tip);
        setTimeout(() => tip.remove(), 12000);
    }

    // --- Start once the game has drawn itself ---
    function ready() {
        return document.getElementById('mainColumn') && document.getElementById('resources');
    }

    function init() {
        buildNav();
        buildTicker();
        apply();
        watchLog();
        tipOnce();
        // The game redraws parts of the page (for example on a new run); keep the log watched.
        new MutationObserver(watchLog).observe(document.body, { childList: true, subtree: false });
        if (NARROW.addEventListener) NARROW.addEventListener('change', apply);
        else NARROW.addListener(apply);
    }

    if (TOUCH) initTouch();
    const wait = setInterval(() => {
        if (!ready()) return;
        clearInterval(wait);
        init();
    }, 100);
})();
