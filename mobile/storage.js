/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Storage and gas settings, in the Settings tab: crate and container capacity, the money cap and gas production.
// The game reads them every tick, through storageBoost() in src/resources.js (crateValue(), containerValue() and the
// money cap in src/main.js) and gasBoost() in src/prod.js (the gas buildings' base output), so a change applies at once.
(function () {
    'use strict';

    const DEFAULT = 100;   // must match storageBoost() in src/resources.js, unless a panel has its own default
    const PANELS = [
        { id: 'containerMult', key: 'evolve-container-mult', choices: [1, 10, 100, 1000, 10000, 100000], title: 'Crate & container capacity', note: 'Each crate and container holds this many times its normal amount.' },
        { id: 'depotMult', key: 'evolve-depot-mult', choices: [1, 10, 100], title: 'Fuel depot storage', note: 'Fuel depots and other fuel storage (oil, helium-3, uranium, deuterium) hold this many times their normal amount.' },
        { id: 'otherMult', key: 'evolve-other-mult', choices: [1, 10, 100], title: 'Other storage', note: 'Every other storage cap (wood, stone, metals, food, knowledge, alloys and the rest) is this many times its normal size. Crates and containers, money and the fuels have their own settings.' },
        { id: 'supplyMult', key: 'evolve-supply-mult', def: 1000, choices: [1, 10, 100, 1000], title: 'Spire supply storage', note: 'The Spire can hold this many times its normal supply (from Ports and Base Camps).' },
        { id: 'moneyMult', key: 'evolve-money-mult', choices: [1, 10, 100], title: 'Money storage', note: 'Your money cap is this many times its normal size.' },
        { id: 'oreMult', key: 'evolve-ore-mult', choices: [1, 10, 100], title: 'Ore & oil production', note: 'Every source of Copper, Iron, Coal, Aluminium, Titanium, Iridium, Uranium, Oil and the space ores produces this many times its normal amount.' },
        { id: 'foodMult', key: 'evolve-food-mult', choices: [1, 10, 100], title: 'Food production', note: 'Every source of food (farmers, hunters, foragers, buildings) produces this many times its normal amount.' },
        { id: 'gasMult', key: 'evolve-gas-mult', choices: [1, 10, 100], title: 'Gas production', note: 'Every Helium-3 and Deuterium building produces this many times its normal amount.' },
    ];

    // One-time update: switch this game to ×10000 container capacity when that step arrives; the player's choice wins after that.
    try {
        if (!localStorage.getItem('evolve-container-v2')) {
            localStorage.setItem('evolve-container-mult', '10000');
            localStorage.setItem('evolve-container-v2', '1');
        }
    } catch (e) { /* private mode */ }

    function current(key, def) {
        let n = def;
        try { n = Number(localStorage.getItem(key)) || def; } catch (e) { /* private mode */ }
        return n;
    }

    function drawPanel(p, after) {
        const settings = document.getElementById('settings');
        let panel = document.getElementById(p.id);
        if (!settings || panel) return panel;
        const mult = current(p.key, p.def || DEFAULT);
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
