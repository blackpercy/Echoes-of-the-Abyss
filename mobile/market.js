/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Auto-trading for Evolve, switched on from the Settings tab. Changes nothing in the game's own code.
// - Auto-sell: every second, each tradable resource at its cap sells 100.
// - Auto-buy: every second that money is at its cap, buy 100 of the tradable resource that is least full.
// Trades go through the game's own market buttons, so prices and price changes are exactly the game's.
// Those buttons only exist while the market is drawn, so auto-trading turns on the game's own
// "Preload Tab Content" switch, which draws every tab in the background.
(function () {
    'use strict';

    const QTY = 100;
    const KEYS = { sell: 'evolve-auto-sell', buy: 'evolve-auto-buy' };
    const opts = { sell: read(KEYS.sell) === '1', buy: read(KEYS.buy) === '1' };
    let last = '';
    let preloadMissing = false;

    function read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
    }

    // The game's live state, reached through the Vue instances it binds to its own elements.
    function game() {
        const top = document.getElementById('topBar');
        const vm = top && top.__vue__;
        if (!vm || !vm.$data.s || !vm.$data.city) return null;
        return { settings: vm.$data.s, market: vm.$data.city.market };
    }

    function resources() {
        const list = [];
        for (const row of document.querySelectorAll('#resources .resource')) {
            const r = row.__vue__ && row.__vue__.$data;
            if (r) list.push({ name: row.id.replace(/^res/, ''), r });
        }
        return list;
    }

    // Trade through the market row's own buy and sell, with the market quantity set to QTY for the moment.
    function trade(g, name, how) {
        const row = document.getElementById(`market-${name}`);
        const vm = row && row.__vue__;
        if (!vm || typeof vm[how] !== 'function') return false;
        const qty = g.market.qty;
        g.market.qty = QTY;
        try {
            vm[how](name);
        } finally {
            g.market.qty = qty;
        }
        return true;
    }

    function tick() {
        drawPanel();
        if (!opts.sell && !opts.buy) return;
        const g = game();
        if (!g) return;
        if (!g.settings.tabLoad) {
            // The market's buttons only exist when tabs are preloaded. Flip the game's own switch, as a
            // player would: it also draws the tabs (setting the value directly breaks the game's loop).
            const label = document.querySelector('#settings .settings11');
            const sw = label && label.closest('label');
            preloadMissing = !sw;
            if (sw) sw.click();
            drawPanel(true);
            return;
        }
        preloadMissing = false;
        if (g.settings.pause || !g.settings.showMarket) return;
        const all = resources();
        const money = all.find(x => x.name === 'Money');
        const tradable = all.filter(x => 'trade' in x.r && x.r.display && x.r.max > 0 && document.getElementById(`market-${x.name}`));
        const done = [];

        if (opts.sell) {
            for (const { name, r } of tradable) {
                if (r.amount < r.max) continue;
                const before = r.amount;
                if (trade(g, name, 'sell') && r.amount < before) done.push(`sold ${Math.round(before - r.amount)} ${r.name}`);
            }
        }
        if (opts.buy && money && money.r.amount >= money.r.max) {
            const pick = tradable
                .filter(x => x.r.amount < x.r.max)
                .sort((a, b) => a.r.amount / a.r.max - b.r.amount / b.r.max)[0];
            if (pick) {
                const before = pick.r.amount;
                if (trade(g, pick.name, 'purchase') && pick.r.amount > before) done.push(`bought ${Math.round(pick.r.amount - before)} ${pick.r.name}`);
            }
        }
        if (done.length) {
            last = done.join(', ');
            drawPanel(true);
        }
    }

    // --- The settings panel, at the top of the game's Settings tab ---
    function drawPanel(refresh) {
        const settings = document.getElementById('settings');
        if (!settings) return;
        let panel = document.getElementById('autoTrade');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'autoTrade';
            panel.innerHTML = `<h3 class="has-text-warning">Auto-trading</h3>
                <label class="at-row"><input type="checkbox" data-opt="sell"> Auto-sell ${QTY} of a resource when it is full</label>
                <label class="at-row"><input type="checkbox" data-opt="buy"> Auto-buy ${QTY} of the least-full resource when money is full</label>
                <div class="at-note"></div>`;
            panel.addEventListener('change', e => {
                const box = e.target.closest('input[data-opt]');
                if (!box) return;
                opts[box.dataset.opt] = box.checked;
                write(KEYS[box.dataset.opt], box.checked ? '1' : '0');
                tick();
                drawPanel(true);
            });
            settings.insertBefore(panel, settings.firstChild);
            refresh = true;
        }
        if (!refresh) return;
        for (const box of panel.querySelectorAll('input[data-opt]')) box.checked = opts[box.dataset.opt];
        const g = game();
        let note = '';
        if (preloadMissing) note = 'Auto-trading needs the game\'s <b>Preload Tab Content</b> setting. Turn it on below, in this Settings tab.';
        else if (g && !g.settings.showMarket && (opts.sell || opts.buy)) note = 'Waiting for the market: research it first.';
        else if (last) note = `Last: ${last}.`;
        panel.querySelector('.at-note').innerHTML = note;
    }

    setInterval(tick, 1000);
})();
