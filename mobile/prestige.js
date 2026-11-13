/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Prestige overview in the Settings tab: what each reset would give if it were done now, using the
// game's own calculation (window.evolvePrestige in src/main.js). It shows numbers only and resets nothing.
(function () {
    'use strict';

    const NAMES = { plasmid: 'Plasmids', phage: 'Phage', dark: 'Dark Energy', harmony: 'Harmony', artifact: 'Artifacts' };

    function fmt(n) {
        return Number(n).toLocaleString('en-US', { maximumFractionDigits: 3 });
    }

    function draw() {
        const settings = document.getElementById('settings');
        if (!settings || typeof window.evolvePrestige !== 'function') return;
        let panel = document.getElementById('prestigeOverview');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'prestigeOverview';
            panel.innerHTML = '<h3 class="has-text-warning">Prestige overview</h3><div class="po-body"></div>'
                + '<div class="ym-note">What each reset would give if it were done now. Only the rewards above 0 are listed; a reset you have not unlocked can still show numbers.</div>';
            const after = document.getElementById('autoTrade');
            settings.insertBefore(panel, after ? after : settings.firstChild);
        }
        if (!panel.offsetParent) return;
        let gains;
        try { gains = window.evolvePrestige(); } catch (e) { return; }
        const rows = Object.keys(gains).map(reset => {
            const g = gains[reset];
            if (!g) return '';
            const parts = Object.keys(NAMES).filter(k => g[k] > 0).map(k => `<span class="has-text-advanced">${fmt(g[k])}</span> ${NAMES[k]}`);
            return `<div class="po-row"><span class="has-text-caution">${reset}</span>: ${parts.length ? parts.join(', ') : 'nothing'}</div>`;
        });
        panel.querySelector('.po-body').innerHTML = rows.join('');
    }

    setInterval(draw, 2000);
})();
