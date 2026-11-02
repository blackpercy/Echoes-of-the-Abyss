/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Bigger clicks for long segment builds. A tap (or click) on one of these builds 10 segments at once,
// as Ctrl+click does on a keyboard: for that one click the game is told its ×10 key is held, so its own
// code builds the segments, pays for each, and queues the rest if they cannot be afforded.
(function () {
    'use strict';

    // Building element id → which of the game's multiplier keys to hold (x10, x25 or x100).
    const TARGETS = {
        'space-world_collider': 'x10',
    };

    function settings() {
        const top = document.getElementById('topBar');
        return top && top.__vue__ && top.__vue__.$data.s;
    }

    function key(type, name) {
        document.dispatchEvent(new KeyboardEvent(type, { key: name, bubbles: true }));
    }

    // Capture phase: runs before the game's own click handler on the building's button.
    document.addEventListener('click', e => {
        const act = e.target.closest && e.target.closest('.action');
        const mult = act && TARGETS[act.id];
        // Only the build button itself, not the gear or on/off controls on it.
        if (!mult || !e.target.closest('a.button') || e.target.closest('.special, .on, .off')) return;
        const s = settings();
        const name = s && s.keyMap && s.keyMap[mult];
        if (!name) return;
        const mKeys = s.mKeys;
        s.mKeys = true;
        key('keydown', name);
        // Let go once the game has handled this click.
        setTimeout(() => {
            key('keyup', name);
            s.mKeys = mKeys;
        }, 0);
    }, true);
})();
