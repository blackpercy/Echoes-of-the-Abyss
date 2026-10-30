/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Yield multiplier for Evolve, set from the Settings tab. Changes nothing in the game's own code.
// Every second, each resource that is growing gets (multiplier - 1) × its net gain per second on top,
// up to its cap. Shrinking resources and the population are left alone; nothing happens while paused.
(function () {
    'use strict';

    const KEY = 'evolve-yield';
    const CHOICES = [1, 2, 3, 5, 10, 25, 100];
    let mult = Number(read(KEY)) || 1;
    if (!CHOICES.includes(mult)) mult = 1;

    function read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
    }

    // The game's live state, reached through the Vue instances it binds to its own elements.
    function top() {
        const el = document.getElementById('topBar');
        const vm = el && el.__vue__;
        return vm && vm.$data.s && vm.$data.race ? vm.$data : null;
    }

    let lastTick = Date.now();

    function tick() {
        const now = Date.now();
        // Seconds since the last boost; a phone that slept gets nothing extra for the time it slept.
        const secs = Math.min((now - lastTick) / 1000, 2);
        lastTick = now;
        drawPanel();
        if (mult <= 1) return;
        const t = top();
        if (!t || t.s.pause) return;
        const people = `res${t.race.species}`;
        for (const row of document.querySelectorAll('#resources .resource')) {
            if (row.id === people) continue;
            const r = row.__vue__ && row.__vue__.$data;
            if (!r || !r.display || !(r.diff > 0)) continue;
            let add = r.diff * (mult - 1) * secs;
            // A cap of -1 or -2 means no cap.
            if (r.max >= 0) add = Math.min(add, r.max - r.amount);
            if (add > 0) r.amount += add;
        }
    }

    // --- The setting, at the top of the game's Settings tab ---
    function drawPanel() {
        const settings = document.getElementById('settings');
        if (!settings || document.getElementById('yieldMult')) return;
        const panel = document.createElement('div');
        panel.id = 'yieldMult';
        panel.innerHTML = `<h3 class="has-text-warning">Yield multiplier</h3>
            <div class="ym-row">${CHOICES.map(n => `<button type="button" class="button is-small${n === mult ? ' ym-on' : ''}" data-mult="${n}">×${n}</button>`).join('')}</div>
            <div class="ym-note">Growing resources gain this many times their usual amount per second, up to their storage cap.</div>`;
        panel.addEventListener('click', e => {
            const btn = e.target.closest('[data-mult]');
            if (!btn) return;
            mult = Number(btn.dataset.mult);
            write(KEY, String(mult));
            for (const b of panel.querySelectorAll('[data-mult]')) b.classList.toggle('ym-on', b === btn);
        });
        // Below the auto-trading panel when there is one, otherwise first.
        const after = document.getElementById('autoTrade');
        settings.insertBefore(panel, after ? after.nextSibling : settings.firstChild);
    }

    setInterval(tick, 1000);
})();
