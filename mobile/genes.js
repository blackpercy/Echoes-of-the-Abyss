/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Auto "Assemble Gene" for Evolve: an Auto button next to the game's Assemble Gene button (A.R.P.A. → Genetics).
// While it is on, one gene is assembled each second that Knowledge is full, so only knowledge that would
// otherwise go to waste is spent and research is never starved. It presses the game's own button.
// Like auto-trading, it needs the game's Preload Tab Content switch so the button exists on every tab.
(function () {
    'use strict';

    const KEY = 'evolve-auto-genes';
    const COST = 200000;
    let on = read(KEY) === '1';

    function read(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
    }

    // The Genetics panel's Vue instance, which owns the game's novo() (Assemble Gene).
    function genetics() {
        const el = document.getElementById('arpaSequence');
        const vm = el && el.__vue__;
        return vm && typeof vm.novo === 'function' ? vm : null;
    }

    function drawToggle(vm) {
        let btn = document.getElementById('autoNovo');
        if (!btn) {
            // The game's Assemble Gene button carries its own tooltip text as its label.
            const novo = [...document.querySelectorAll('#arpaSequence button')].find(b => b.getAttribute('aria-label') === vm.novoLabel());
            if (!novo) return;
            btn = document.createElement('button');
            btn.id = 'autoNovo';
            btn.type = 'button';
            btn.className = 'button';
            btn.title = 'Assemble a gene every second while Knowledge is full';
            btn.addEventListener('click', () => {
                on = !on;
                write(KEY, on ? '1' : '0');
                drawToggle(vm);
            });
            const wrap = novo.closest('.b-tooltip') || novo;
            wrap.parentNode.insertBefore(btn, wrap.nextSibling);
        }
        btn.textContent = on ? 'Auto: On' : 'Auto: Off';
        btn.classList.toggle('has-text-success', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function tick() {
        const vm = genetics();
        if (vm) drawToggle(vm);
        if (!on) return;
        const top = document.getElementById('topBar');
        const s = top && top.__vue__ && top.__vue__.$data.s;
        if (!s) return;
        if (!s.tabLoad) {
            // Keep the Genetics panel drawn on every tab by flipping the game's own switch, as a player would.
            const label = document.querySelector('#settings .settings11');
            const sw = label && label.closest('label');
            if (sw) sw.click();
            return;
        }
        if (s.pause || !vm) return;
        const row = document.getElementById('resKnowledge');
        const k = row && row.__vue__ && row.__vue__.$data;
        if (k && k.max > 0 && k.amount >= k.max && k.amount >= COST) vm.novo();
    }

    setInterval(tick, 1000);
})();
