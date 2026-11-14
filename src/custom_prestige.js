/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// Added in this copy: four prestige resources, each earned only from its own new reset, kept through every reset
// (they live in global.stats, which resets do not clear) and giving a permanent bonus.
//   Demon Sigils   - Hellgate Collapse (500,000 demon kills this run): stronger patrols, more Soul Gems.
//   Star Shards    - Supernova (5 complete Additional Dyson Spheres): more power, faster Mass Ejectors.
//   Spire Crowns   - Spire Conquest (floor 50 of the Spire): more Blood Stones, faster Spire progress.
//   Echo Fragments - Time Loop (late game): each run starts with free copies of your first buildings.
import { global } from './vars.js';

export const CP_NAMES = { sigils: 'Demon Sigils', shards: 'Star Shards', crowns: 'Spire Crowns', echoes: 'Echo Fragments' };

export function cp(){
    if (!global.stats['cprest']){
        global.stats['cprest'] = { sigils: 0, shards: 0, crowns: 0, echoes: 0, kills_base: 0 };
    }
    return global.stats.cprest;
}

// Demon kills made since the last reset.
export function runKills(){
    return Math.max(0, (global.stats.dkills || 0) - (cp().kills_base || 0));
}

// What each new reset would give now.
export const CP_RESETS = {
    hellgate: { title: 'Hellgate Collapse', res: 'sigils', flag: 'cp_hellgate',
        ready(){ return !!global.portal['fortress'] && runKills() >= 500000; },
        gain(){ return Math.floor(runKills() / 50000); } },
    supernova: { title: 'Supernova', res: 'shards', flag: 'cp_supernova',
        ready(){ return !!global.interstellar['dyson_extra'] && global.interstellar.dyson_extra.count >= 500; },
        gain(){ return Math.floor(((global.interstellar['dyson_extra'] && global.interstellar.dyson_extra.count) || 0) / 100); } },
    spire: { title: 'Spire Conquest', res: 'crowns', flag: 'cp_spire',
        ready(){ return !!global.portal['spire'] && global.portal.spire.count >= 50; },
        gain(){ return Math.floor(((global.portal['spire'] && global.portal.spire.count) || 0) / 10); } },
    timeloop: { title: 'Time Loop', res: 'echoes', flag: 'cp_timeloop',
        ready(){ return (global.tech['blackhole'] || 0) >= 4; },
        gain(){ return 1 + Math.floor((global.stats.days || 0) / 500); } },
};

// Unlocks each reset's research while its condition holds (run from the game's mid loop).
// Returns true when something changed, so the research list can be redrawn.
export function checkCustomResets(){
    if (global.race.species === 'protoplasm'){ return false; }
    let changed = false;
    Object.keys(CP_RESETS).forEach(function(k){
        const r = CP_RESETS[k];
        if (r.ready()){
            if (!global.tech[r.flag]){ global.tech[r.flag] = 1; changed = true; }
        }
        else if (global.tech[r.flag] === 1){
            delete global.tech[r.flag];
            changed = true;
        }
    });
    return changed;
}

// Bonuses.
export function sigilBonus(){ return 1 + 0.02 * cp().sigils; }      // patrol strength and Soul Gem chance
export function shardBonus(){ return 1 + 0.02 * cp().shards; }      // power
export function shardEject(){ return 1 + 0.1 * cp().shards; }       // Mass Ejector capacity
export function crownBonus(){ return 1 + 0.05 * cp().crowns; }      // Blood Stones and Spire progress

// Echo Fragments: each fragment gives one free copy of each of these, once per run, as soon as you have one.
const ECHO_BUILDINGS = ['basic_housing','cottage','farm','silo','shed','storage_yard','warehouse','bank','library','temple','lumber_yard'];
export function payEchoes(){
    const c = cp();
    if (!(c.echoes > 0) || !global.city || global.race.species === 'protoplasm'){ return; }
    if (c.echo_run !== global.stats.reset){
        c.echo_run = global.stats.reset;
        c.echo_given = {};
    }
    ECHO_BUILDINGS.forEach(function(b){
        if (global.city[b] && typeof global.city[b].count === 'number' && global.city[b].count > 0 && (c.echo_given[b] || 0) < c.echoes){
            global.city[b].count += c.echoes - (c.echo_given[b] || 0);
            c.echo_given[b] = c.echoes;
        }
    });
}
