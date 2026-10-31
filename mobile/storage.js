/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Container capacity setting, in the Settings tab. The game's containerValue() (src/resources.js)
// multiplies what each container holds by this; the game reads it every tick, so a change applies at once.
(function () {
    'use strict';

    const KEY = 'evolve-container-mult';
    const CHOICES = [1, 10, 100];
    const DEFAULT = 100;   // must match containerBoost() in src/resources.js

    function current() {
        let n = DEFAULT;
        try { n = Number(localStorage.getItem(KEY)) || DEFAULT; } catch (e) { /* private mode */ }
        return n;
    }

    function drawPanel() {
        const settings = document.getElementById('settings');
        if (!settings || document.getElementById('containerMult')) return;
        const mult = current();
        const panel = document.createElement('div');
        panel.id = 'containerMult';
        panel.innerHTML = `<h3 class="has-text-warning">Container capacity</h3>
            <div class="ym-row">${CHOICES.map(n => `<button type="button" class="button is-small${n === mult ? ' ym-on' : ''}" data-mult="${n}">×${n}</button>`).join('')}</div>
            <div class="ym-note">Each container holds this many times its normal amount.</div>`;
        panel.addEventListener('click', e => {
            const btn = e.target.closest('[data-mult]');
            if (!btn) return;
            try { localStorage.setItem(KEY, btn.dataset.mult); } catch (err) { /* private mode */ }
            for (const b of panel.querySelectorAll('[data-mult]')) b.classList.toggle('ym-on', b === btn);
        });
        // After the other added settings, in the order they appear.
        const after = document.getElementById('yieldMult') || document.getElementById('autoTrade');
        settings.insertBefore(panel, after ? after.nextSibling : settings.firstChild);
    }

    setInterval(drawPanel, 1000);
})();
