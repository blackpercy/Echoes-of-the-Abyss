/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Storage settings, in the Settings tab: crate and container capacity, and the money cap. The game reads them every tick
// through storageBoost() in src/resources.js (used by crateValue(), containerValue() and the money cap in src/main.js),
// so a change applies at once.
(function () {
    'use strict';

    const DEFAULT = 100;   // must match storageBoost() in src/resources.js
    const PANELS = [
        { id: 'containerMult', key: 'evolve-container-mult', choices: [1, 10, 100, 1000, 10000, 100000], title: 'Crate & container capacity', note: 'Each crate and container holds this many times its normal amount.' },
        { id: 'moneyMult', key: 'evolve-money-mult', choices: [1, 10, 100], title: 'Money storage', note: 'Your money cap is this many times its normal size.' },
    ];

    // One-time update: switch this game to ×10000 container capacity when that step arrives; the player's choice wins after that.
    try {
        if (!localStorage.getItem('evolve-container-v2')) {
            localStorage.setItem('evolve-container-mult', '10000');
            localStorage.setItem('evolve-container-v2', '1');
        }
    } catch (e) { /* private mode */ }

    function current(key) {
        let n = DEFAULT;
        try { n = Number(localStorage.getItem(key)) || DEFAULT; } catch (e) { /* private mode */ }
        return n;
    }

    function drawPanel(p, after) {
        const settings = document.getElementById('settings');
        let panel = document.getElementById(p.id);
        if (!settings || panel) return panel;
        const mult = current(p.key);
        panel = document.createElement('div');
        panel.id = p.id;
        panel.className = 'storage-mult';
        panel.innerHTML = `<h3 class="has-text-warning">${p.title}</h3>
            <div class="ym-row">${p.choices.map(n => `<button type="button" class="button is-small${n === mult ? ' ym-on' : ''}" data-mult="${n}">×${n.toLocaleString('en-US')}</button>`).join('')}</div>
            <div class="ym-note">${p.note}</div>`;
        panel.addEventListener('click', e => {
            const btn = e.target.closest('[data-mult]');
            if (!btn) return;
            try { localStorage.setItem(p.key, btn.dataset.mult); } catch (err) { /* private mode */ }
            for (const b of panel.querySelectorAll('[data-mult]')) b.classList.toggle('ym-on', b === btn);
        });
        settings.insertBefore(panel, after ? after.nextSibling : settings.firstChild);
        return panel;
    }

    // After the other added settings, in the order they appear.
    function drawAll() {
        let after = document.getElementById('yieldMult') || document.getElementById('autoTrade');
        for (const p of PANELS) after = drawPanel(p, after) || after;
    }

    setInterval(drawAll, 1000);
})();
