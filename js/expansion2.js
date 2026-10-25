// Twelve more skills: Grave Digging, Tidecombing, Tailoring, Inscription, Brewing, Trading,
// Faith, Sailing, Forbidden Lore, Ritualism, Maces and Unarmed. Also Port Ulric and the Third Cellar.
// Data only; the rules that use it live in game.js, systems.js and perks.js.

Object.assign(SKILLS, {
  gravedigging: { name: 'Grave Digging', icon: '⚰️', type: 'gathering', desc: 'Open the graves of Aldmark by lantern light. Bones, rings and older things, and sometimes the owner wakes to object.' },
  tidecombing: { name: 'Tidecombing', icon: '🐚', type: 'gathering', desc: 'Walk the strandline for what the sea gives up. Low tide doubles the haul, and some places only show themselves when the water is out.' },
  tailoring: { name: 'Tailoring', icon: '🧵', type: 'production', desc: 'Sew robes and hoods that turn aside madness rather than blades, and sacks to carry more.' },
  inscription: { name: 'Inscription', icon: '✒️', type: 'production', desc: 'Make ink and parchment, then write scrolls: words that heal, burn, ward and banish when read aloud.' },
  brewing: { name: 'Brewing', icon: '🍺', type: 'production', desc: 'Brew ale, mead and stranger things in the cellars of inns. Drink steadies the mind, at the cost of a steady hand.' },
  trading: { name: 'Trading', icon: '⚖️', type: 'combat', desc: 'Buy where things are cheap and sell where they are dear. Every level gets you better prices in every shop.' },
  faith: { name: 'Faith', icon: '🕯️', type: 'combat', desc: 'Pray, bless and drive out what should not walk. Faith guards the mind, but the gods do not answer one who has gone too far.' },
  sailing: { name: 'Sailing', icon: '⛵', type: 'combat', desc: 'Learned on the water. Every sea crossing teaches you; you sail faster, and a seasoned sailor works their passage for free.' },
  lore: { name: 'Forbidden Lore', icon: '📖', type: 'combat', desc: 'Read the books that should have been burned. They teach quickly and take their price in sanity. What you learn opens doors.' },
  ritualism: { name: 'Ritualism', icon: '🔯', type: 'combat', desc: 'Perform rites in circles of salt and chalk. Each rite asks for an offering and gives a blessing that lasts a while.' },
});
SKILL_GROUPS.find(g => g.name === 'Gathering').skills.push('gravedigging', 'tidecombing');
SKILL_GROUPS.find(g => g.name === 'Crafting').skills.push('tailoring', 'inscription', 'brewing');
SKILL_GROUPS.find(g => g.name === 'Adventuring').skills.push('trading', 'sailing');
SKILL_GROUPS.splice(SKILL_GROUPS.findIndex(g => g.name === 'Weapons'), 0, { name: 'Mind and Spirit', skills: ['faith', 'lore', 'ritualism'] });

// --- New workplaces ---
Object.assign(STATIONS, {
  loom: { name: 'Loom', icon: '🧵', portable: 'sewing_kit' },
  desk: { name: "Scribe's Desk", icon: '✒️', portable: 'scribes_kit' },
  cellar: { name: "Brewer's Cellar", icon: '🍺' },
  chapel: { name: 'Chapel', icon: '⛪', portable: 'prayer_beads' },
  circle: { name: 'Ritual Circle', icon: '🔯', portable: 'ritual_chalk' },
});
LOCATIONS.saltmire.stations.push('loom', 'desk', 'cellar');
LOCATIONS.silent_abbey.stations.push('loom', 'desk', 'cellar', 'chapel');
LOCATIONS.ironhold.stations.push('cellar', 'chapel');
LOCATIONS.graveyard.stations = ['circle'];
LOCATIONS.crater.stations.push('circle');
LOCATIONS.dreaming_grove.stations.push('circle');
LOCATIONS.lighthouse.stations.push('circle');

addItem('sewing_kit', { name: 'Sewing Kit', icon: '🪡', type: 'tool', sell: 40, desc: 'Needles, thread and shears: a loom wherever you go.' });
addItem('scribes_kit', { name: "Scribe's Kit", icon: '🖋️', type: 'tool', sell: 80, desc: 'A lap desk, quills and a sealed inkwell. Write scrolls anywhere.' });
addItem('prayer_beads', { name: 'Prayer Beads', icon: '📿', type: 'tool', sell: 60, desc: 'Worn smooth by other hands. Pray wherever you are.' });
addItem('ritual_chalk', { name: 'Ritual Chalk', icon: '🖍️', type: 'tool', sell: 100, desc: 'Grey chalk that never quite wipes away. Draw a circle anywhere.' });

// --- Plain goods the shops sell ---
addItem('barley', { name: 'Barley', icon: '🌾', sell: 1, desc: 'For bread, for ale.' });
addItem('hops', { name: 'Wild Hops', icon: '🌿', sell: 3, desc: 'Bitter flowers from the edge of the Blackwood.' });
addItem('linen', { name: 'Bolt of Linen', icon: '🧻', sell: 3 });
addItem('parchment', { name: 'Parchment', icon: '📃', sell: 2 });
addItem('ink', { name: 'Ink', icon: '🫙', sell: 2 });
addItem('votive_candle', { name: 'Votive Candle', icon: '🕯️', sell: 4, desc: 'Lit for the dead, or for the living who need it more.' });
ACTIONS.foraging.push({ id: 'wild_hops', name: 'Wild Hops', level: 3, xp: 16, time: 3000, output: { hops: 1 } });
ACTIONS.foraging.sort((a, b) => a.level - b.level);
LOCATIONS.blackwood.gather.foraging.push('wild_hops');

// --- Grave Digging ---
TOOLS.gravedigging = ['spade', 'sextons_spade', 'ghoul_claw'];
const DIGGING_TOOLS = { spade: ['Spade', '🪏', 8], sextons_spade: ["Sexton's Spade", '🪏', 600], ghoul_claw: ['Ghoul-Claw Spade', '🦴', 8000] };
for (const [id, [name, icon, sell]] of Object.entries(DIGGING_TOOLS)) {
  const tier = TOOLS.gravedigging.indexOf(id);
  addItem(id, { name, icon, type: 'tool', toolFor: 'gravedigging', tier, sell, desc: `Lets you practise Grave Digging when carried.${TOOL_SPEEDUP[tier] ? ` Works ${TOOL_SPEEDUP[tier] * 100}% faster.` : ''}` });
}
addItem('old_bones', { name: 'Old Bones', icon: '🦴', sell: 2, desc: 'Ground into ink, laid in circles, or simply sold to people who do not ask.' });
addItem('grave_goods', { name: 'Tarnished Grave Goods', icon: '💍', sell: 25, desc: 'Rings, buckles and coins pressed into dead hands.' });
addItem('saints_knucklebone', { name: "Saint's Knucklebone", icon: '🦴', sell: 60, desc: 'From the crypt beneath the Abbey. It is warm.' });
addItem('ancient_bones', { name: 'Bones of Something Older', icon: '💀', sell: 150, desc: 'Too many joints. Not human, and not anything else either.' });
MONSTERS.restless_corpse = { name: 'Restless Corpse', icon: '🧟', hp: 18, ac: 9, hit: 2, dmg: '1d4', speed: 3000, xp: 12, gold: [0, 4], drops: [{ item: 'old_bones', chance: 0.6, qty: [1, 2] }] };
ACTIONS.gravedigging = [
  { id: 'pauper_graves', name: "Dig the Paupers' Graves", level: 1, xp: 11, time: 3500, output: { old_bones: 1 }, bonus: [{ item: 'grave_goods', chance: 0.03, qty: 1 }], ambush: { monster: 'restless_corpse', chance: 0.04 } },
  { id: 'barrow_graves', name: 'Open the Barrow Graves', level: 10, xp: 30, time: 4500, output: { old_bones: 1, grave_goods: 1 }, bonus: [{ item: 'cultes_des_goules', chance: 0.01, qty: 1 }, { item: 'pnakotic_fragments', chance: 0.005, qty: 1 }], ambush: { monster: 'skeleton', chance: 0.05 } },
  { id: 'catacomb_niches', name: 'Empty the Catacomb Niches', level: 20, xp: 55, time: 5500, output: { old_bones: 2 }, bonus: [{ item: 'cultist_text', chance: 0.06, qty: 1 }], ambush: { monster: 'deepling', chance: 0.04 } },
  { id: 'abbey_crypt', name: 'Rob the Abbey Crypt', level: 28, xp: 85, time: 6500, when: 'night', output: { saints_knucklebone: 1 }, ambush: { monster: 'ghoul', chance: 0.05 }, desc: 'The brothers must not see.' },
  { id: 'nameless_barrow', name: 'Open the Nameless Barrow', level: 40, xp: 160, time: 8000, sanityCost: 4, output: { ancient_bones: 1 }, bonus: [{ item: 'necronomicon_page', chance: 0.03, qty: 1 }], ambush: { monster: 'nightgaunt', chance: 0.03 }, desc: 'Inside the ring of stones, under the monolith.' },
];
LOCATIONS.graveyard.gather.gravedigging = ['pauper_graves', 'barrow_graves'];
LOCATIONS.drowned_catacombs.gather.gravedigging = ['catacomb_niches'];
LOCATIONS.silent_abbey.gather.gravedigging = ['abbey_crypt'];
LOCATIONS.dreaming_grove.gather.gravedigging = ['nameless_barrow'];

// --- Tidecombing ---
addItem('kelp', { name: 'Kelp', icon: '🌿', sell: 1, desc: 'Slick and salty. Spun into cloth or brewed into ale.' });
addItem('sea_glass', { name: 'Sea Glass', icon: '💠', sell: 3, desc: 'Bottle-glass worn smooth by the sea.' });
addItem('deep_egg', { name: 'Deep-Spawn Egg', icon: '🥚', sell: 15, desc: 'Pale and soft. Must be cooked. Do not think about what laid it.' });
addItem('deep_omelette', { name: 'Deep-Spawn Omelette', icon: '🍳', type: 'food', heal: 70, sell: 30, desc: 'Restores 70 hitpoints. Tastes of the sea, and of something else.' });
addItem('ambergris', { name: 'Ambergris', icon: '🟨', sell: 120, desc: 'Grey, waxy and precious. Whatever coughed it up was not a whale.' });
addItem('drowned_idol', { name: 'Drowned Idol', icon: '🗿', sell: 300, desc: 'A squat figure of green stone with a face like an octopus.' });
ACTIONS.tidecombing = [
  { id: 'kelp_beds', name: 'Cut the Kelp Beds', level: 1, xp: 10, time: 3000, tideDouble: true, output: { kelp: 1 } },
  { id: 'strandline', name: 'Comb the Strandline', level: 4, xp: 16, time: 3500, tideDouble: true, output: { sea_glass: 1 }, gold: [0, 3] },
  { id: 'rock_pools', name: 'Search the Rock Pools', level: 14, xp: 40, time: 5000, tideDouble: true, output: { deep_egg: 1 }, bonus: [{ item: 'veil_pearl', chance: 0.03, qty: 1 }] },
  { id: 'wreck_ribs', name: 'Pick Over the Wreck', level: 22, xp: 70, time: 6000, when: 'low_tide', output: { sea_glass: 2 }, gold: [20, 50], bonus: [{ item: 'treasure_map', chance: 0.03, qty: 1 }], desc: 'Only the ribs of the ship show above the water, and only at low tide.' },
  { id: 'harbour_mud', name: 'Wade the Harbour Mud', level: 28, xp: 90, time: 7000, tideDouble: true, output: { ambergris: 1 } },
  { id: 'black_sand', name: 'Sift the Black Sand', level: 38, xp: 150, time: 8000, when: 'low_tide', sanityCost: 3, output: { drowned_idol: 1 }, bonus: [{ item: 'rlyeh_text', chance: 0.01, qty: 1 }], desc: 'The beach below the lamp that should not be there.' },
];
LOCATIONS.saltmire_shore.gather.tidecombing = ['kelp_beds', 'strandline'];
LOCATIONS.devils_reef.gather.tidecombing = ['rock_pools'];
LOCATIONS.drowned_isle.gather.tidecombing = ['wreck_ribs'];
LOCATIONS.lighthouse.gather.tidecombing = ['black_sand'];
ACTIONS.cooking.push({ id: 'deep_omelette', name: 'Cook a Deep-Spawn Omelette', level: 20, xp: 50, time: 3000, station: 'fire', input: { deep_egg: 1 }, output: { deep_omelette: 1 } });
ACTIONS.cooking.sort((a, b) => a.level - b.level);

// --- Forbidden Lore: tomes you keep, and the insight you wring from them ---
addItem('eldritch_insight', { name: 'Eldritch Insight', icon: '🌀', sell: 20, desc: 'A thought you should not be able to think, written down before it got away. Offered up in rites and scrolls.' });
const TOMES = {
  pnakotic_fragments: ['Pnakotic Fragments', 300],
  cultes_des_goules: ['Cultes des Goules', 700],
  unaussprechlichen: ['Unaussprechlichen Kulten', 1500],
  necronomicon: ['The Necronomicon', 4000],
  rlyeh_text: ["The R'lyeh Text", 6000],
};
for (const [id, [name, sell]] of Object.entries(TOMES)) {
  addItem(id, { name, icon: id === 'necronomicon' ? '📕' : '📘', type: 'tome', sell, desc: 'A forbidden tome. Carry it to study it with Forbidden Lore; reading does not use it up.' });
}
ACTIONS.lore = [
  { id: 'margins', name: 'Read the Margins', level: 1, xp: 14, time: 4000, anywhere: true, sanityCost: 1, input: { whispering_fragment: 1 }, output: { eldritch_insight: 1 }, desc: 'Notes scrawled beside the whispers. They are in your handwriting.' },
  { id: 'pnakotic', name: 'Study the Pnakotic Fragments', level: 8, xp: 40, time: 5000, station: 'library', sanityCost: 3, needs: ['pnakotic_fragments'], output: { eldritch_insight: 1 } },
  { id: 'cultes', name: 'Study the Cultes des Goules', level: 16, xp: 75, time: 5500, station: 'library', sanityCost: 5, needs: ['cultes_des_goules'], output: { eldritch_insight: 2 } },
  { id: 'unaussprechlichen', name: 'Study the Unaussprechlichen Kulten', level: 26, xp: 140, time: 6500, station: 'library', sanityCost: 8, needs: ['unaussprechlichen'], output: { eldritch_insight: 3 } },
  { id: 'necronomicon', name: 'Study the Necronomicon', level: 36, xp: 240, time: 7500, station: 'library', sanityCost: 12, needs: ['necronomicon'], output: { eldritch_insight: 4 } },
  { id: 'rlyeh', name: "Decipher the R'lyeh Text", level: 45, xp: 420, time: 9000, sanityCost: 15, minMadness: 2, needs: ['rlyeh_text'], output: { eldritch_insight: 6 }, desc: 'Only here, among the shelves no one else can find, does the script hold still.' },
];
const LORE_VEIL_PER_TEN = 3;      // see through the Veil this much sooner per 10 Forbidden Lore levels
const THIRD_CELLAR_LORE = 20;     // Forbidden Lore needed to find the stair
// Sanity does not recover while you do these.
const SANITY_DRAINING_SKILLS = ['occultism', 'lore'];

// --- Inscription: scrolls are read once, in a fight or out of it ---
// scroll.damage hits the enemy you are fighting; scroll.heal mends you; a buff lasts a while.
const SCROLLS = {
  scroll_mending: ['Scroll of Mending', 3, 15, { parchment: 1, ink: 1 }, { heal: 40 }, 'Restores 40 hitpoints.'],
  scroll_flame: ['Scroll of Flame', 8, 25, { parchment: 1, ink: 1, pale_wort: 1 }, { damage: '3d6' }, 'Read it in a fight: 3d6 fire.'],
  scroll_warding: ['Scroll of Warding', 14, 40, { parchment: 1, ink: 1, whispering_fragment: 2 }, { buff: { name: 'Warded', icon: '🛡️', effects: { ward: 3 }, ms: 300000 } }, '+3 to sanity saves for 5 minutes.'],
  scroll_haste: ['Scroll of Haste', 20, 60, { parchment: 1, ink: 2, dream_dust: 2 }, { buff: { name: 'Hasted', icon: '💨', effects: { atkSpeed: 0.2 }, ms: 180000 } }, 'Attack 20% faster for 3 minutes.'],
  scroll_sight: ['Scroll of True Sight', 26, 85, { parchment: 1, ink: 1, eldritch_insight: 1 }, { buff: { name: 'True Sight', icon: '👁️', effects: { veil: 20 }, ms: 600000 } }, 'See through the Veil 20 sanity sooner for 10 minutes.'],
  scroll_banishing: ['Scroll of Banishing', 32, 120, { parchment: 1, ink: 2, eldritch_insight: 2 }, { damage: '6d6', eldritchMult: 2 }, 'Read it in a fight: 6d6, doubled against eldritch beings.'],
  scroll_fortune: ['Scroll of Fortune', 38, 160, { parchment: 1, ink: 2, veil_pearl: 1 }, { buff: { name: 'Fortunate', icon: '🍀', effects: { gold: 0.25, allXp: 0.1 }, ms: 600000 } }, '+25% gold found and +10% experience for 10 minutes.'],
  elder_glyph: ['Elder Glyph', 46, 280, { parchment: 2, ink: 3, eldritch_insight: 3, star_rose: 1 }, { buff: { name: 'Elder Glyph', icon: '⭐', effects: { ward: 6, ac: 2 }, ms: 300000 } }, '+6 to sanity saves and +2 AC for 5 minutes.'],
};
ACTIONS.inscription = [
  { id: 'ink', name: 'Mix Ink', level: 1, xp: 6, time: 2500, station: 'desk', input: { grave_moss: 2 }, output: { ink: 2 } },
  { id: 'parchment', name: 'Scrape Parchment', level: 2, xp: 10, time: 3000, station: 'desk', input: { deer_hide: 1 }, output: { parchment: 3 } },
  { id: 'bone_ink', name: 'Grind Bone Ink', level: 6, xp: 14, time: 3000, station: 'desk', input: { old_bones: 2 }, output: { ink: 4 } },
  { id: 'necronomicon', name: 'Bind the Necronomicon', level: 40, xp: 1200, time: 15000, station: 'desk', sanityCost: 25, input: { necronomicon_page: 10, parchment: 5, ink: 5 }, output: { necronomicon: 1 }, desc: 'Ten pages, sewn in the right order. There is only one right order.' },
];
for (const [id, [name, level, xp, input, effect, desc]] of Object.entries(SCROLLS)) {
  addItem(id, Object.assign({ name, icon: '📜', type: 'scroll', sell: Math.round(xp / 2), desc: desc + ' Used up when read.' }, effect));
  ACTIONS.inscription.push({ id, name: `Write a ${name}`, level, xp, time: 3000 + level * 80, station: 'desk', input, output: { [id]: 1 } });
}
ACTIONS.inscription.sort((a, b) => a.level - b.level);

// --- Tailoring: light clothes that ward the mind ---
addItem('kelp_cloth', { name: 'Kelp-Cloth', icon: '🟩', sell: 6, desc: 'Coarse green cloth that never quite dries.' });
const GARMENTS = [
  // [id, name, icon, slot, level, input, stats, combat req, sell]
  ['linen_hood', 'Linen Hood', '🧕', 'head', 2, { linen: 2 }, { ward: 1 }, 1, 12],
  ['seaglass_charm', 'Sea-Glass Charm', '💠', 'amulet', 4, { sea_glass: 3, linen: 1 }, { ac: 1, ward: 1 }, 3, 25],
  ['linen_robe', 'Linen Robe', '🥼', 'body', 6, { linen: 4 }, { ac: 1, ward: 2 }, 4, 30],
  ['sailcloth_sack', 'Sailcloth Sack', '👝', 'back', 10, { kelp_cloth: 4, deer_hide: 2 }, { slots: 7 }, 0, 90],
  ['acolyte_robe', "Acolyte's Robe", '🥼', 'body', 16, { kelp_cloth: 4, linen: 2, whispering_fragment: 4 }, { ac: 2, ward: 3 }, 12, 120],
  ['quilted_hood', 'Quilted Hood', '🧕', 'head', 20, { linen: 3, wolf_pelt: 1 }, { ac: 1, ward: 2 }, 15, 110],
  ['silk_hood', 'Silk Hood of Celephaïs', '🧕', 'head', 28, { celephais_silk: 2 }, { ac: 2, ward: 3 }, 22, 400],
  ['silk_robe', 'Silk Robe of Celephaïs', '👘', 'body', 34, { celephais_silk: 4, star_hide: 1 }, { ac: 3, ward: 5 }, 30, 900],
  ['yellow_robe', 'Tattered Yellow Robe', '🟨', 'body', 42, { celephais_silk: 5, eldritch_insight: 4 }, { ac: 4, ward: 6, hit: 1 }, 38, 2000],
  ['robe_of_stars', 'Robe of Stars', '🌌', 'body', 48, { celephais_silk: 4, kadath_star: 1 }, { ac: 5, ward: 8, hit: 1, dmg: 1 }, 42, 5000],
];
ACTIONS.tailoring = [{ id: 'kelp_cloth', name: 'Weave Kelp-Cloth', level: 1, xp: 8, time: 2500, station: 'loom', input: { kelp: 3 }, output: { kelp_cloth: 1 } }];
for (const [id, name, icon, slot, level, input, stats, req, sell] of GARMENTS) {
  addItem(id, { name, icon, type: 'equipment', slot, stats, req: req ? { combat: req } : undefined, sell, desc: slot === 'back' ? `+${stats.slots} pack slots.` : 'Cloth, not plate: it turns aside madness better than blades.' });
  ACTIONS.tailoring.push({ id, name: `Sew a ${name}`, level, xp: Math.round(sell / 3) + 8, time: 3000 + level * 60, station: 'loom', input, output: { [id]: 1 } });
}
ACTIONS.tailoring.sort((a, b) => a.level - b.level);

// --- Brewing: drinks restore sanity but leave you a little worse at aiming ---
const BREWS = [
  // [id, name, icon, level, xp, input, heal, sanity, buff]
  ['small_beer', 'Small Beer', '🍺', 1, 10, { barley: 2 }, 0, 6, { name: 'Tipsy', icon: '🍺', effects: { hit: -1 }, ms: 60000 }],
  ['saltmire_stout', 'Saltmire Stout', '🍺', 5, 20, { barley: 2, hops: 1 }, 15, 12, { name: 'Tipsy', icon: '🍺', effects: { hit: -1 }, ms: 120000 }],
  ['kelp_ale', 'Kelp Ale', '🍻', 10, 32, { barley: 2, kelp: 2 }, 0, 15, { name: 'Sea Legs', icon: '🌊', effects: { ward: 1, hit: -1 }, ms: 180000 }],
  ['fire_ale', 'Dwarven Fire-Ale', '🔥', 16, 50, { barley: 3, hops: 2 }, 30, 10, { name: 'Liquid Courage', icon: '🔥', effects: { dmg: 2, hit: -1 }, ms: 180000 }],
  ['abbey_mead', 'Abbey Mead', '🍯', 24, 80, { dream_honey: 1, barley: 2 }, 20, 30, { name: 'Mellow', icon: '🍯', effects: { hit: -1 }, ms: 120000 }],
  ['poppy_wine', 'Poppy Wine', '🍷', 32, 120, { dream_poppy: 2, barley: 2 }, 0, 40, { name: 'Hazy', icon: '🌫️', effects: { veil: 15, hit: -2 }, ms: 300000 }],
  ['ambergris_cordial', 'Ambergris Cordial', '🥃', 40, 200, { ambergris: 1, barley: 2 }, 80, 40, { name: 'Warmth', icon: '🥃', effects: { ac: 1, ward: 2 }, ms: 300000 }],
  ['starlight_brandy', 'Starlight Brandy', '✨', 46, 320, { star_rose: 1, moonwine: 1 }, 0, 70, { name: 'Starlit', icon: '✨', effects: { ward: 4, hit: -1 }, ms: 300000 }],
];
ACTIONS.brewing = [];
for (const [id, name, icon, level, xp, input, heal, sanity, buff] of BREWS) {
  addItem(id, { name, icon, type: 'potion', heal: heal || undefined, sanity, buff, sell: Math.round(xp / 2) + 2, desc: `${heal ? `Restores ${heal} hitpoints and ${sanity} sanity` : `Restores ${sanity} sanity`}. Leaves you ${buff.name.toLowerCase()} for a while.` });
  ACTIONS.brewing.push({ id, name: `Brew ${name}`, level, xp, time: 3000 + level * 70, station: 'cellar', input, output: { [id]: 1 } });
}

// --- Faith ---
addItem('holy_water', { name: 'Holy Water', icon: '💧', type: 'potion', sanity: 10, buff: { name: 'Blessed', icon: '✝️', effects: { eldritch: 0.25, ward: 1 }, ms: 300000 }, sell: 40, desc: 'Restores 10 sanity, and for 5 minutes you deal 25% more damage to eldritch beings and have +1 to sanity saves.' });
addItem('blessed_ash', { name: 'Blessed Ash', icon: '⚱️', sell: 12, desc: 'What is left when the unquiet dead are put to rest.' });
addItem('silver_icon', { name: 'Silver Icon', icon: '🖼️', type: 'equipment', slot: 'amulet', stats: { hit: 1, ac: 1, ward: 3 }, req: { faith: 24 }, sell: 200, desc: 'A saint in silver, blessed with ash.' });
addItem('reliquary', { name: 'Reliquary of Saint Ambrose', icon: '⚜️', type: 'equipment', slot: 'amulet', stats: { dmg: 1, ac: 2, ward: 5 }, req: { faith: 32 }, sell: 900, desc: 'The knucklebone, set in silver and glass. It is still warm.' });
addItem('sanctified_oil', { name: 'Sanctified Oil', icon: '🫗', type: 'potion', sanity: 20, buff: { name: 'Anointed', icon: '🫗', effects: { eldritch: 0.4, ward: 4, dmg: 2 }, ms: 300000 }, sell: 300, desc: 'Restores 20 sanity, and for 5 minutes: +40% damage against eldritch beings, +4 to sanity saves and +2 damage.' });
const FAITH_MAX_MADNESS = 3;     // the gods stop answering at this much madness and beyond
const FAITH_WARD_LEVELS = 10;    // +1 to sanity saves per this many Faith levels
ACTIONS.faith = [
  { id: 'prayer', name: 'Pray', icon: '🙏', level: 1, xp: 10, time: 4000, station: 'chapel', sanityGain: 2, output: {} },
  { id: 'vigil', name: 'Keep a Vigil', icon: '🕯️', level: 8, xp: 30, time: 5000, station: 'chapel', sanityGain: 5, input: { votive_candle: 1 }, output: {} },
  { id: 'holy_water', name: 'Bless Holy Water', level: 12, xp: 45, time: 5000, station: 'chapel', input: { votive_candle: 1, silver_bar: 1 }, output: { holy_water: 2 } },
  { id: 'exorcism', name: 'Lay the Unquiet Dead to Rest', level: 18, xp: 60, time: 5000, output: { blessed_ash: 1 }, ambush: { monster: 'ghoul', chance: 0.04 } },
  { id: 'silver_icon', name: 'Bless a Silver Icon', level: 24, xp: 150, time: 7000, station: 'chapel', input: { silver_bar: 2, blessed_ash: 4 }, output: { silver_icon: 1 } },
  { id: 'reliquary', name: 'Sanctify a Reliquary', level: 32, xp: 400, time: 9000, station: 'chapel', input: { saints_knucklebone: 1, silver_bar: 2, votive_candle: 3 }, output: { reliquary: 1 } },
  { id: 'consecrate', name: 'Consecrate the Drowned Temple', level: 40, xp: 220, time: 8000, sanityGain: 3, output: { blessed_ash: 3 }, ambush: { monster: 'deepling', chance: 0.05 } },
  { id: 'sanctified_oil', name: 'Sanctify Oil', level: 45, xp: 300, time: 8000, station: 'chapel', input: { holy_water: 2, star_rose: 1 }, output: { sanctified_oil: 1 } },
];
for (const a of ACTIONS.faith) a.maxMadness = FAITH_MAX_MADNESS;
LOCATIONS.graveyard.gather.faith = ['exorcism'];
LOCATIONS.drowned_catacombs.gather.faith = ['consecrate'];

// --- Ritualism: rites repeat like any activity, each one renewing a blessing that lasts a while ---
const RITES = [
  // [id, name, icon, level, xp, input, extra, buff]
  ['salt_circle', 'Circle of Salt', '🧂', 1, 20, { grave_moss: 3 }, {}, { effects: { ward: 1, ac: 1 }, ms: 600000 }],
  ['blood_offering', 'Blood Offering', '🩸', 6, 40, {}, { hpCost: 15 }, { effects: { dmg: 2 }, ms: 600000 }],
  ['bone_augury', 'Augury of Bones', '🦴', 12, 70, { old_bones: 3, eldritch_insight: 1 }, {}, { effects: { crit: 1, gold: 0.1 }, ms: 600000 }],
  ['tide_calling', 'Calling of the Tide', '🌊', 18, 110, { raw_deep_cod: 3, sea_glass: 2 }, { sanityCost: 4 }, { effects: { gold: 0.2, eldritch: 0.1 }, ms: 600000 }],
  ['byakhee', 'Summoning of the Byakhee', '🦇', 26, 170, { eldritch_insight: 3 }, { sanityCost: 8 }, { effects: { travel: 1 }, ms: 600000 }],
  ['communion', 'Communion with the Dreamer', '🐙', 32, 240, { eldritch_insight: 4, dream_dust: 4 }, { sanityCost: 10 }, { effects: { allXp: 0.25 }, ms: 900000 }],
  ['yellow_sign', 'The Yellow Sign', '🟨', 38, 320, { eldritch_insight: 5, celephais_silk: 1 }, { sanityCost: 12 }, { effects: { hit: 2, dmg: 3, atkSpeed: 0.1 }, ms: 600000 }],
  ['great_old_rite', 'Rite of the Great Old Ones', '🌌', 45, 500, { eldritch_insight: 8, ancient_bones: 1, star_rose: 2 }, { sanityCost: 20, minMadness: 1 }, { effects: { hit: 3, dmg: 4, ac: 2, ward: 3, hp: 30 }, ms: 900000 }],
];
ACTIONS.ritualism = RITES.map(([id, name, icon, level, xp, input, extra, buff]) => Object.assign({
  id, name, icon, level, xp, time: 5000 + level * 100, station: 'circle', input: Object.keys(input).length ? input : undefined, output: {},
  buff: Object.assign({ name, icon }, buff),
}, extra));

// --- Trading ---
// Each town makes some goods cheaply and pays well for others. Markets hold only so much and restock over time.
const TRADE_GOODS = {
  salted_fish: { name: 'Barrel of Salted Fish', icon: '🛢️', origin: 'saltmire', base: 12, level: 1, xp: 4, prices: { ironhold: 24, silent_abbey: 20, port_ulric: 15 } },
  abbey_candles: { name: 'Crate of Abbey Candles', icon: '🕯️', origin: 'silent_abbey', base: 10, level: 1, xp: 4, prices: { saltmire: 20, ironhold: 18, port_ulric: 24 } },
  dwarven_tools: { name: 'Dwarven Ironware', icon: '🔨', origin: 'ironhold', base: 30, level: 5, xp: 8, prices: { saltmire: 55, silent_abbey: 48, port_ulric: 62 } },
  ulric_spices: { name: 'Sack of Ulric Spices', icon: '🌶️', origin: 'port_ulric', base: 60, level: 10, xp: 14, prices: { saltmire: 105, ironhold: 120, silent_abbey: 110 } },
  deep_amber: { name: 'Deep Amber', icon: '🟠', origin: 'saltmire', base: 90, level: 15, xp: 20, prices: { silent_abbey: 150, ironhold: 140, port_ulric: 175 } },
  illuminated_psalter: { name: 'Illuminated Psalter', icon: '📗', origin: 'silent_abbey', base: 200, level: 25, xp: 40, prices: { saltmire: 330, ironhold: 310, port_ulric: 380 } },
  runed_steel: { name: 'Runed Steel Ingots', icon: '🔩', origin: 'ironhold', base: 350, level: 30, xp: 60, prices: { saltmire: 560, silent_abbey: 520, port_ulric: 640 } },
  ivory_of_leng: { name: 'Ivory of Leng', icon: '🦷', origin: 'port_ulric', base: 500, level: 40, xp: 90, prices: { saltmire: 780, ironhold: 820, silent_abbey: 800 } },
};
for (const [id, g] of Object.entries(TRADE_GOODS)) {
  addItem(id, { name: g.name, icon: g.icon, type: 'trade', sell: g.base, desc: 'Trade goods: cheap where they are made, worth more in other towns. Each market shows what it pays.' });
}
const TRADE_SUPPLY = 10;              // how many of each good a market holds for you
const TRADE_RESTOCK_MS = 30000;       // one more every this long (game time, so it restocks while you are away)
const TRADING_PRICE_PER_LEVEL = 0.005; // better prices per Trading level, in every shop
const MAX_HAGGLE = 0.4;
const TRADING_XP_PER_GOLD = 0.1;      // xp for every gold you earn selling anything
ACTIONS.trading = [
  { id: 'market_stall', name: 'Mind a Market Stall', icon: '🧺', level: 1, xp: 10, time: 3000, gold: [2, 6], output: {} },
  { id: 'haggle_dwarves', name: 'Haggle with Dwarven Merchants', icon: '🪙', level: 10, xp: 26, time: 3500, gold: [8, 18], output: {} },
  { id: 'pilgrim_trinkets', name: 'Sell Trinkets to Pilgrims', icon: '📿', level: 20, xp: 50, time: 4000, gold: [15, 35], output: {} },
  { id: 'ulric_brokering', name: 'Broker Cargo on the Quay', icon: '⚓', level: 30, xp: 90, time: 5000, gold: [30, 70], output: {} },
  { id: 'hollow_barter', name: 'Barter in the Hollow Stalls', icon: '🏮', level: 40, xp: 150, time: 6000, output: { whispering_fragment: 2 }, gold: [10, 40] },
];
LOCATIONS.saltmire.gather.trading = ['market_stall'];
LOCATIONS.ironhold.gather.trading = ['haggle_dwarves'];
LOCATIONS.silent_abbey.gather.trading = ['pilgrim_trinkets'];
LOCATIONS.market.gather = { trading: ['hollow_barter'] };

// --- Sailing ---
const SAILING_SPEED_PER_LEVEL = 0.01;  // +1% speed on sea roads per level
const SAILING_XP_PER_SEA_SECOND = 3;
const SAILING_FREE_PASSAGE = 15;       // from this level you work your passage instead of paying
ACTIONS.sailing = [
  { id: 'deckhand', name: 'Work as a Deckhand', icon: '⚓', level: 1, xp: 12, time: 3500, gold: [2, 6], output: {} },
  { id: 'mend_nets', name: 'Mend Nets on the Shore', icon: '🕸️', level: 6, xp: 20, time: 4000, gold: [4, 10], output: {} },
  { id: 'night_run', name: 'Run Contraband by Night', icon: '🌙', level: 14, xp: 45, time: 5000, when: 'night', gold: [15, 40], risk: 0.06, output: {} },
  { id: 'harbour_pilot', name: 'Pilot Ships into Harbour', icon: '🧭', level: 24, xp: 75, time: 5000, gold: [25, 55], output: {} },
  { id: 'pearl_dive', name: 'Dive for Pearls from Your Boat', level: 32, xp: 110, time: 6000, needs: ['rowboat'], output: { veil_pearl: 1 } },
  { id: 'reef_pilot', name: "Pilot Ships Past Devil's Reef", icon: '🪸', level: 42, xp: 180, time: 7000, gold: [60, 130], output: {} },
];
LOCATIONS.saltmire.gather.sailing = ['deckhand'];
LOCATIONS.saltmire_shore.gather.sailing = ['mend_nets', 'night_run'];
LOCATIONS.drowned_isle.gather.sailing = ['pearl_dive'];
LOCATIONS.devils_reef.gather.sailing = ['reef_pilot'];

// --- Port Ulric: a free port across the bay, reached only by sea ---
SHOPS.ulric_bazaar = {
  name: 'The Ulric Bazaar',
  keeper: 'Merchants from a dozen shores shout over each other. A one-eyed factor named Hesper Vane offers you tea and a contract in the same breath.',
  stock: [
    { item: 'barley', price: 2 }, { item: 'hops', price: 6 }, { item: 'linen', price: 6 }, { item: 'parchment', price: 5 },
    { item: 'votive_candle', price: 12 }, { item: 'sewing_kit', price: 120 }, { item: 'scribes_kit', price: 220 }, { item: 'ritual_chalk', price: 500 },
    { item: 'spade', price: 25 }, { item: 'sextons_spade', price: 2800 }, { item: 'pnakotic_fragments', price: 1200 },
    { item: 'cultes_des_goules', price: 2500 }, { item: 'unaussprechlichen', price: 6000 },
  ],
};
LOCATIONS.port_ulric = {
  name: 'Port Ulric', kind: 'town', icon: '⚓', x: 935, y: 215, labelDx: -40,
  desc: 'A free port of painted warehouses and crooked piers, owned by no lord. Ships come here from shores that are not on any map, and nobody asks what is in the holds.',
  shop: 'ulric_bazaar', inn: 'the Gull & Gallows', stations: ['fire', 'loom', 'desk', 'cellar', 'bed', 'workbench'],
  gather: { trading: ['ulric_brokering'], sailing: ['harbour_pilot'], tidecombing: ['harbour_mud'], fishing: ['deep_cod', 'squidling'] },
};
ROADS.push(
  { a: 'saltmire_shore', b: 'port_ulric', time: 40, cost: 60, sea: true, note: 'A trading ketch takes 60 gold.' },
  { a: 'port_ulric', b: 'drowned_isle', time: 25, req: ['rowboat'], sea: true },
);
for (const r of ROADS) if ((r.a === 'saltmire_shore' && r.b === 'devils_reef') || (r.a === 'devils_reef' && r.b === 'drowned_isle')) r.sea = true;

// --- The Third Cellar, beneath the Silent Abbey ---
MONSTERS.bound_horror = { name: 'Bound Horror', icon: '📚', eldritch: { dc: 15, loss: 5 }, hp: 240, ac: 16, hit: 10, dmg: '2d8+2', speed: 2700, xp: 200, gold: [60, 140], drops: [{ item: 'eldritch_insight', chance: 0.4, qty: [1, 2] }, { item: 'necronomicon_page', chance: 0.1, qty: [1, 1] }, { item: 'unaussprechlichen', chance: 0.03, qty: [1, 1] }, { item: 'rlyeh_text', chance: 0.01, qty: [1, 1] }] };
LOCATIONS.third_cellar = {
  name: 'The Third Cellar', kind: 'dungeon', icon: '🗝️', x: 655, y: 75, labelDx: 30,
  desc: 'Below the second cellar there is a stair the brothers pretend not to see. At the bottom, shelves run further than the hill above them. Some of the books are chained. Some of the chains are broken.',
  stations: ['library', 'desk', 'circle'], gather: { lore: ['rlyeh'] },
  monsters: ['bound_horror'],
};
ROADS.push({ a: 'silent_abbey', b: 'third_cellar', time: 8, lore: THIRD_CELLAR_LORE });

// --- Weapon skills: Maces and Unarmed ---
Object.assign(SKILLS, {
  maces: { name: 'Maces', icon: '🔨', type: 'weapon', desc: 'Cudgels, maces and hammers. Every level makes your blows more likely to stagger the enemy, so that it loses its next swing.' },
  unarmed: { name: 'Unarmed', icon: '👊', type: 'weapon', desc: 'Fists, or knuckles of metal. Your hands grow deadlier as you level, and every 15 levels your sneak attacks deal another d6.' },
});
SKILL_GROUPS.find(g => g.name === 'Weapons').skills.push('maces', 'unarmed');
const MACE_STUN_PER_LEVEL = 0.005;  // chance per Maces level that a hit staggers the enemy
const MAX_STUN = 0.5;
const UNARMED_SPEED = 1600;         // fists are quick
const FIST_DICE = [[1, '1d3'], [10, '1d4'], [20, '1d6'], [30, '1d8'], [40, '1d10'], [50, '2d6'], [60, '2d8'], [70, '2d10'], [80, '3d8'], [90, '3d10'], [100, '4d8']];
const UNARMED_SNEAK_LEVELS = 15;    // +1d6 sneak attack per this many Unarmed levels, while unarmed

const MACE_DICE = { iron: '1d8', silver: '1d8', blackiron: '1d10', adamantine: '2d6', starmetal: '2d8' };
for (const t of GEAR_TIERS) {
  const mace = `${t.key}_mace`;
  addItem(mace, { name: `${t.prefix} Mace`, icon: '🔨', type: 'equipment', slot: 'weapon', speed: 2600, dice: MACE_DICE[t.key], stats: { hit: t.hit, dmg: t.dmg + 1 }, req: { combat: t.req }, sell: Math.round(ITEMS[t.bar].sell * 2 * 1.5) });
  ACTIONS.smithing.push({ id: mace, name: `Forge ${ITEMS[mace].name}`, level: Math.min(50, t.smith + 2), xp: t.xp * 2, time: 4000, station: t.station, input: { [t.bar]: 2 }, output: { [mace]: 1 } });
  // Knuckles use your fists' dice and speed, and add their own bonuses.
  const knuckles = `${t.key}_knuckles`;
  addItem(knuckles, { name: `${t.prefix} Knuckles`, icon: '🥊', type: 'equipment', slot: 'weapon', fist: true, stats: { hit: t.hit, dmg: t.dmg + 1 }, req: { combat: t.req }, sell: Math.round(ITEMS[t.bar].sell * 1.5), desc: 'Worn over the fist. You fight as if unarmed, but harder.' });
  ACTIONS.smithing.push({ id: knuckles, name: `Forge ${ITEMS[knuckles].name}`, level: Math.min(50, t.smith + 3), xp: t.xp, time: 3000, station: t.station, input: { [t.bar]: 1 }, output: { [knuckles]: 1 } });
}
ACTIONS.smithing.sort((a, b) => a.level - b.level);
addItem('oak_cudgel', { name: 'Twisted Oak Cudgel', icon: '🏏', type: 'equipment', slot: 'weapon', speed: 2400, dice: '1d6', stats: { dmg: 1 }, req: { combat: 2 }, sell: 15 });
ACTIONS.carpentry.push({ id: 'oak_cudgel', name: 'Carve a Twisted Oak Cudgel', level: 3, xp: 20, time: 3000, station: 'workbench', input: { twisted_oak_logs: 2 }, output: { oak_cudgel: 1 } });
ACTIONS.carpentry.sort((a, b) => a.level - b.level);

// Every weapon gets a type, from its name (again, now that there are more).
for (const item of Object.values(ITEMS)) {
  if (item.slot !== 'weapon') continue;
  item.wtype = item.fist ? 'unarmed'
    : /staff/.test(item.id) ? 'staves'
      : /bow/.test(item.id) ? 'bows'
        : /spear|trident|halberd/.test(item.id) ? 'polearms'
          : /mace|cudgel|hammer/.test(item.id) ? 'maces'
            : 'blades';
}

// --- Shops stock the new tools and goods ---
SHOPS.general_store.stock.push({ item: 'barley', price: 3 }, { item: 'linen', price: 8 }, { item: 'parchment', price: 6 }, { item: 'votive_candle', price: 20 },
  { item: 'spade', price: 25 }, { item: 'sewing_kit', price: 150 }, { item: 'scribes_kit', price: 250 });
SHOPS.smithy.stock.push({ item: 'barley', price: 3 }, { item: 'spade', price: 30 }, { item: 'sextons_spade', price: 3000 }, { item: 'iron_mace', price: 140 }, { item: 'iron_knuckles', price: 70 });
SHOPS.apothecary.stock.push({ item: 'parchment', price: 5 }, { item: 'votive_candle', price: 15 }, { item: 'prayer_beads', price: 200 }, { item: 'holy_water', price: 90 });
SHOPS.esoteric_order.stock.push({ item: 'spade', price: 20 }, { item: 'ritual_chalk', price: 300 }, { item: 'pnakotic_fragments', price: 800 }, { item: 'votive_candle', price: 15 });
SHOPS.hollow_market.stock.push({ item: 'ritual_chalk', price: 30 }, { item: 'ghoul_claw', price: 400 }, { item: 'pnakotic_fragments', price: 40 }, { item: 'eldritch_insight', price: 3 });

// Tomes from the things that guard them.
MONSTERS.ghoul.drops.push({ item: 'cultes_des_goules', chance: 0.01, qty: [1, 1] });
MONSTERS.cultist_priest.drops.push({ item: 'unaussprechlichen', chance: 0.02, qty: [1, 1] });
MONSTERS.dagon.drops.push({ item: 'rlyeh_text', chance: 0.1, qty: [1, 1] });

// --- Bestiary pages for the new creatures ---
Object.assign(BESTIARY, {
  restless_corpse: { sane: 'A body that would not stay buried. Slow, stupid and very determined.', mad: 'It only wants its ring back. You are wearing its ring.' },
  bound_horror: { sane: 'Something that lives between the pages, bound in the chains the monks forged for it.', mad: 'It has read every book down here. It would like to read you next.' },
});

// --- Achievements for the new skills ---
ACHIEVEMENTS.push(
  { id: 'port_ulric', icon: '⚓', name: 'Free Port', desc: 'Sail to Port Ulric.', test: g => !!g.state.visited.port_ulric },
  { id: 'third_cellar', icon: '🗝️', name: 'The Third Cellar', desc: 'Find the stair beneath the Silent Abbey.', test: g => !!g.state.visited.third_cellar },
  { id: 'necronomicon', icon: '📕', name: 'Al Azif', desc: 'Bind the Necronomicon.', test: g => g.carries('necronomicon') || g.bankCount('necronomicon') > 0 },
  { id: 'merchant', icon: '⚖️', name: 'Merchant Prince', desc: 'Reach level 30 in Trading.', test: g => g.level('trading') >= 30 },
  { id: 'bare_knuckle', icon: '👊', name: 'Bare-Knuckle Theology', desc: 'Slay an eldritch being with your bare hands.', test: g => !!g.state.flags.bareKnuckle },
);

// --- Dungeon gear with skill modifiers ---
// mods: [effect, value, skill?]. They work like perks while the item is worn; skill-bound effects need the skill named.
Object.assign(SLOTS, { hands: 'Hands', ring: 'Ring' });
const DUNGEON_GEAR = [
  // [id, name, icon, slot, stats, mods, combat req, sell, desc]
  ['work_gloves', 'Work Gloves', '🧤', 'hands', {}, [['speedAll', 0.03]], 1, 20, 'Thick leather, worn soft at the fingers.'],
  ['silver_ring', 'Silver Ring', '💍', 'ring', { ward: 1 }, [], 5, 60, 'Plain silver. The dead dislike it.'],
  ['fishscale_gloves', 'Fishscale Gloves', '🧤', 'hands', { ac: 1 }, [['speed', 0.15, 'fishing'], ['double', 0.05, 'fishing']], 15, 400, 'Cut from a deepling. The scales still flex when they touch water.'],
  ['drowned_signet', 'Drowned Signet', '💍', 'ring', { ward: 1 }, [['sanityCost', -0.15, 'occultism'], ['xp', 0.1, 'occultism']], 15, 500, 'The seal of a priest of Dagon. It leaves wet prints.'],
  ['ichor_ring', 'Ring of Living Ichor', '💍', 'ring', {}, [['hp', 20], ['killHeal', 3]], 18, 700, 'A bead of shoggoth, sealed in glass. It moves.'],
  ['mitre_of_dagon', 'Mitre of the High Priest', '🎩', 'head', { ac: 2, ward: 3 }, [['sanityCost', -0.2, 'ritualism'], ['buffTime', 0.15]], 20, 1200, 'Tall, scaled and smelling of the sea.'],
  ['duergar_gauntlets', 'Duergar Mining Gauntlets', '🧤', 'hands', { ac: 1 }, [['speed', 0.2, 'mining'], ['rare', 0.02, 'mining']], 15, 600, 'Grey iron, made for breaking stone in the dark.'],
  ['stoneheart_ring', 'Stoneheart Ring', '💍', 'ring', { ac: 2 }, [['double', 0.07, 'smithing'], ['save', 0.05, 'smithing']], 20, 900, 'A chip of the Stone Horror, still warm as a forge.'],
  ['wormtooth_necklace', 'Wormtooth Necklace', '🦷', 'amulet', { dmg: 2, ward: 2 }, [['speed', 0.2, 'gravedigging'], ['speed', 0.2, 'archaeology']], 22, 1500, 'One tooth from the Thing Below. It still wants to dig.'],
  ['librarian_gloves', "Librarian's Gloves", '🧤', 'hands', {}, [['speed', 0.2, 'lore'], ['speed', 0.2, 'inscription'], ['scrollPower', 0.1]], 25, 1400, 'White cotton, stained at the fingertips with ink that is not ink.'],
  ['ring_of_the_bound', 'Ring of the Bound', '💍', 'ring', { ward: 2 }, [['sanityCost', -0.25, 'lore'], ['xp', 0.15, 'lore']], 25, 1600, 'A link of the chain that held the Bound Horror.'],
  ['leviathan_grips', 'Leviathan Grips', '🧤', 'hands', { hit: 2 }, [['wDmg', 2, 'polearms'], ['speed', 0.15, 'fishing']], 35, 3000, 'Gloves of star-spawn hide. Spears and lines never slip.'],
  ['ring_of_rlyeh', "Ring of R'lyeh", '💍', 'ring', { ward: 3 }, [['eldritch', 0.1], ['allXp', 0.05]], 38, 5000, 'Green stone, carved with angles that are not right.'],
  ['crown_of_dagon', 'Crown of Father Dagon', '👑', 'head', { ac: 3, ward: 3 }, [['double', 0.1, 'fishing'], ['travel', 0.15], ['gold', 0.1]], 40, 9000, 'Coral and gold from the throne of the deep.'],
];
for (const [id, name, icon, slot, stats, mods, req, sell, desc] of DUNGEON_GEAR) {
  addItem(id, { name, icon, type: 'equipment', slot, stats, mods, req: { combat: req }, sell, desc });
}
// The plain pieces can be made; the rest are found in the dark places.
ACTIONS.hunting.push({ id: 'work_gloves', name: 'Stitch Work Gloves', level: 4, xp: 20, time: 3000, station: 'tannery', input: { deer_hide: 2 }, output: { work_gloves: 1 } });
ACTIONS.hunting.sort((a, b) => a.level - b.level);
ACTIONS.smithing.push({ id: 'silver_ring', name: 'Forge a Silver Ring', level: 10, xp: 40, time: 3000, station: 'forge', input: { silver_bar: 1 }, output: { silver_ring: 1 } });
ACTIONS.smithing.sort((a, b) => a.level - b.level);
SHOPS.general_store.stock.push({ item: 'work_gloves', price: 80 });
const gearDrops = {
  deepling: [['fishscale_gloves', 0.03]],
  cultist_priest: [['drowned_signet', 0.02]],
  shoggoth_larva: [['ichor_ring', 0.02]],
  high_priest: [['mitre_of_dagon', 0.1], ['drowned_signet', 0.1]],
  duergar: [['duergar_gauntlets', 0.02]],
  stone_horror: [['stoneheart_ring', 0.05]],
  thing_below: [['wormtooth_necklace', 0.15]],
  bound_horror: [['librarian_gloves', 0.03], ['ring_of_the_bound', 0.02]],
  star_spawn: [['leviathan_grips', 0.02], ['ring_of_rlyeh', 0.01]],
  dagon: [['crown_of_dagon', 0.08], ['ring_of_rlyeh', 0.1]],
};
for (const [m, drops] of Object.entries(gearDrops)) for (const [item, chance] of drops) MONSTERS[m].drops.push({ item, chance, qty: [1, 1] });
EXPEDITIONS.catacomb_depths.loot.items.push({ item: 'mitre_of_dagon', chance: 0.1, qty: [1, 1] }, { item: 'fishscale_gloves', chance: 0.15, qty: [1, 1] });
EXPEDITIONS.sealed_shaft.loot.items.push({ item: 'duergar_gauntlets', chance: 0.2, qty: [1, 1] }, { item: 'stoneheart_ring', chance: 0.15, qty: [1, 1] });
EXPEDITIONS.sunken_temple.loot.items.push({ item: 'crown_of_dagon', chance: 0.15, qty: [1, 1] }, { item: 'ring_of_rlyeh', chance: 0.15, qty: [1, 1] });

// --- More gear with modifiers, from the wild places and two new expeditions ---
MONSTERS.brain_keeper = { name: 'The Brain-Keeper', icon: '🧠', boss: true, eldritch: { dc: 16, loss: 7 }, hp: 520, ac: 18, hit: 12, dmg: '3d6+3', speed: 2600, xp: 600, gold: [400, 800], drops: [{ item: 'starmetal_ore', chance: 1, qty: [3, 6] }, { item: 'mi_go_cylinder', chance: 0.1, qty: [1, 1] }] };
MONSTERS.librarian = { name: 'The Librarian', icon: '📚', boss: true, eldritch: { dc: 16, loss: 6 }, hp: 480, ac: 17, hit: 11, dmg: '3d6+2', speed: 2500, xp: 550, gold: [300, 700], drops: [{ item: 'eldritch_insight', chance: 1, qty: [3, 6] }, { item: 'necronomicon_page', chance: 0.5, qty: [1, 2] }] };
Object.assign(EXPEDITIONS, {
  crater_heart: {
    name: "The Crater's Heart", location: 'crater', level: 30,
    desc: 'Climb down into the glowing pit where the Mi-Go keep their cylinders, to the thing that keeps the keepers.',
    rooms: ['mi_go', 'colour', 'byakhee', 'mi_go', 'brain_keeper'],
    loot: { gold: [800, 1500], items: [{ item: 'starmetal_bar', chance: 1, qty: [2, 5] }, { item: 'mi_go_cylinder', chance: 0.2, qty: [1, 1] }] },
  },
  chained_stacks: {
    name: 'The Chained Stacks', location: 'third_cellar', level: 28,
    desc: 'Follow the broken chains between the shelves to whoever has been reading down here all these years.',
    rooms: ['bound_horror', 'bound_horror', 'bound_horror', 'librarian'],
    loot: { gold: [600, 1200], items: [{ item: 'unaussprechlichen', chance: 0.15, qty: [1, 1] }, { item: 'eldritch_insight', chance: 1, qty: [4, 8] }] },
  },
});
Object.assign(BESTIARY, {
  brain_keeper: { sane: 'An elder Mi-Go, swollen and slow, that tends the canisters in the heart of the crater.', mad: 'It has kept thousands of minds. It talks to them at night. They talk back.' },
  librarian: { sane: 'A robed figure among the chained shelves. The monks say it was the first abbot.', mad: 'It has a card for you. It has always had a card for you. Your book is overdue.' },
});

const MORE_GEAR = [
  // [id, name, icon, slot, stats, mods, combat req, sell, desc, extra]
  ['crabshell_gloves', 'Crabshell Gloves', '🦀', 'hands', { ac: 1 }, [['speed', 0.1, 'fishing'], ['speed', 0.1, 'cooking']], 1, 40, 'Pincer-plated. Good for gutting fish.'],
  ['spawn_eye_charm', 'Spawn-Eye Charm', '👁️', 'amulet', { ward: 1 }, [['speed', 0.15, 'tidecombing'], ['double', 0.05, 'tidecombing']], 3, 80, 'A deepling spawn\'s eye in a cage of wire. It still looks for the sea.'],
  ['smugglers_gloves', "Smuggler's Gloves", '🧤', 'hands', {}, [['speed', 0.15, 'stealth'], ['safe', 0.25, 'stealth']], 5, 120, 'Thin, black and very quiet.'],
  ['factors_signet', "Factor's Signet", '💍', 'ring', {}, [['haggle', 0.05], ['tradeStock', 5]], 5, 300, 'The seal of a trading house that no longer exists. Merchants still respect it.'],
  ['wolfhunter_bracers', 'Wolfhunter Bracers', '🧤', 'hands', { hit: 1 }, [['wSpeed', 0.05, 'bows'], ['speed', 0.15, 'hunting']], 8, 200, 'Bracers of dire-wolf hide, scratched by bowstrings.'],
  ['wolfpelt_mantle', 'Wolfpelt Mantle', '🐺', 'back', { slots: 4 }, [['speed', 0.15, 'foraging'], ['speed', 0.15, 'woodcutting']], 8, 250, '+4 pack slots. Warm, heavy and full of pockets.'],
  ['gravediggers_gloves', "Gravedigger's Gloves", '🧤', 'hands', { ac: 1 }, [['speed', 0.15, 'gravedigging'], ['rare', 0.02, 'gravedigging']], 10, 300, 'Stiff with old earth.'],
  ['ghoul_tooth_ring', 'Ghoul-Tooth Ring', '💍', 'ring', {}, [['heal', 0.15], ['speed', 0.15, 'brewing'], ['speed', 0.15, 'cooking']], 10, 280, 'It is always a little hungry, and so are you.'],
  ['novice_cowl', "Novice's Cowl", '🧕', 'head', { ac: 1, ward: 1 }, [['xp', 0.1, 'ritualism'], ['sanityCost', -0.1, 'occultism']], 8, 220, 'Green wool, embroidered with fish.'],
  ['tailors_thimble', "Tailor's Thimble", '💍', 'ring', {}, [['speed', 0.2, 'tailoring'], ['save', 0.1, 'tailoring']], 8, 250, 'Silver, worn on a finger that is not quite the right shape.'],
  ['skullcrusher_gauntlets', 'Skullcrusher Gauntlets', '🧤', 'hands', { ac: 1 }, [['wStun', 0.1, 'maces'], ['wDmg', 2, 'maces']], 20, 900, 'Stone-knuckled. Anything you hit stays hit.'],
  ['vestments_of_dagon', 'Vestments of Dagon', '👘', 'body', { ac: 3, ward: 4 }, [['speed', 0.2, 'ritualism'], ['buffTime', 0.1]], 20, 1500, 'Sea-green silk, stiff with salt.'],
  ['echo_mirror', 'Hand Mirror of the Echo', '🪞', 'amulet', { ward: 3 }, [['xp', 0.2, 'wisdom'], ['allXp', 0.03]], 20, 1200, 'Your reflection in it is always a moment ahead of you.'],
  ['mirror_blade', 'Mirror Blade', '🗡️', 'weapon', { hit: 4, dmg: 3 }, [['wCrit', 1, 'blades'], ['wLeech', 2, 'blades']], 22, 1800, 'A sliver of the Echo\'s lamp, sharpened.', { speed: 2000, dice: '2d6', wtype: 'blades' }],
  ['migo_lens', 'Mi-Go Lens', '🥽', 'head', { ac: 2, ward: 2 }, [['speed', 0.15, 'mining'], ['speed', 0.15, 'alchemy']], 25, 2000, 'It sees the seams in rock and the seams in things.'],
  ['colour_vial_ring', 'Ring of the Captured Colour', '💍', 'ring', {}, [['eldritch', 0.1], ['potency', 0.15]], 28, 2500, 'The stone is a colour you cannot name.'],
  ['byakhee_wingcloak', 'Byakhee Wingcloak', '🦇', 'back', { slots: 8 }, [['travel', 0.25], ['speed', 0.15, 'sailing']], 28, 3000, '+8 pack slots. It still tries to fly.'],
  ['byakhee_bone_bow', 'Byakhee-Bone Bow', '🏹', 'weapon', { hit: 5, dmg: 3 }, [['wDouble', 0.1, 'bows'], ['travel', 0.1]], 30, 3500, 'Strung with something that hums between the stars.', { speed: 1900, dice: '2d8', wtype: 'bows' }],
  ['nightgaunt_wraps', 'Nightgaunt Wraps', '🧤', 'hands', { hit: 2 }, [['sneak', 1], ['wDouble', 0.1, 'unarmed'], ['speed', 0.2, 'stealth']], 32, 3200, 'Rubbery, faceless and silent.'],
  ['dreamwood_circlet', 'Dreamwood Circlet', '🌿', 'head', { ac: 2, ward: 3 }, [['dreamRest', 2, 'dreaming'], ['speed', 0.2, 'dreaming'], ['speed', 0.15, 'woodcutting']], 32, 3500, 'A twist of living branch. You sleep well in it, and wake somewhere else.'],
  ['banner_of_ironhold', 'Banner of Ironhold', '🚩', 'back', { slots: 6 }, [['compHit', 1], ['compAc', 1], ['compHp', 20]], 20, 2500, '+6 pack slots. Your companions stand straighter beneath it.'],
  ['captains_coat', "Captain's Coat", '🧥', 'body', { ac: 5, ward: 3 }, [['travel', 0.15], ['speed', 0.2, 'sailing'], ['xp', 0.2, 'sailing']], 38, 6000, 'Salt-stained blue, with brass buttons shaped like octopi.'],
  ['brainkeeper_crown', "Brain-Keeper's Crown", '🧠', 'head', { ac: 3, ward: 5 }, [['xp', 0.15, 'lore'], ['allXp', 0.05], ['scrollPower', 0.15]], 30, 5000, 'A ring of metal that once held a mind. It holds yours, gently.'],
  ['star_alloy_band', 'Band of Star-Alloy', '💍', 'ring', { dmg: 1 }, [['speed', 0.2, 'smithing'], ['double', 0.08, 'smithing'], ['speed', 0.15, 'carpentry']], 30, 4500, 'Mi-Go metal, folded a thousand times.'],
  ['archivists_satchel', "Archivist's Satchel", '👜', 'back', { slots: 10 }, [['speed', 0.15, 'inscription'], ['xp', 0.15, 'inscription']], 28, 4000, '+10 pack slots. Every pocket holds a different century.'],
  ['librarian_staff', "The Librarian's Staff", '🪄', 'weapon', { hit: 5, dmg: 4, ward: 3 }, [['scrollPower', 0.2], ['wEldritch', 0.1, 'staves']], 36, 6000, 'A reading-staff of black oak, chained at the top.', { speed: 2400, dice: '2d8', wtype: 'staves' }],
];
for (const [id, name, icon, slot, stats, mods, req, sell, desc, extra] of MORE_GEAR) {
  addItem(id, Object.assign({ name, icon, type: 'equipment', slot, stats, mods, req: { combat: req }, sell, desc }, extra || {}));
}
const moreDrops = {
  giant_crab: [['crabshell_gloves', 0.03]],
  deepling_spawn: [['spawn_eye_charm', 0.02]],
  smuggler: [['smugglers_gloves', 0.02], ['factors_signet', 0.005]],
  dire_wolf: [['wolfhunter_bracers', 0.02], ['wolfpelt_mantle', 0.01]],
  skeleton: [['gravediggers_gloves', 0.02]],
  ghoul: [['ghoul_tooth_ring', 0.02]],
  cultist_novice: [['novice_cowl', 0.03], ['tailors_thimble', 0.01]],
  stone_horror: [['skullcrusher_gauntlets', 0.03]],
  cultist_priest: [['vestments_of_dagon', 0.01]],
  echo: [['echo_mirror', 0.03], ['mirror_blade', 0.01]],
  mi_go: [['migo_lens', 0.02]],
  colour: [['colour_vial_ring', 0.02]],
  byakhee: [['byakhee_wingcloak', 0.01], ['byakhee_bone_bow', 0.01]],
  nightgaunt: [['nightgaunt_wraps', 0.02], ['dreamwood_circlet', 0.01]],
  brain_keeper: [['brainkeeper_crown', 0.15], ['star_alloy_band', 0.15]],
  librarian: [['archivists_satchel', 0.15], ['librarian_staff', 0.1]],
};
for (const [m, drops] of Object.entries(moreDrops)) for (const [item, chance] of drops) MONSTERS[m].drops.push({ item, chance, qty: [1, 1] });
EXPEDITIONS.sealed_shaft.loot.items.push({ item: 'banner_of_ironhold', chance: 0.2, qty: [1, 1] }, { item: 'skullcrusher_gauntlets', chance: 0.15, qty: [1, 1] });
EXPEDITIONS.sunken_temple.loot.items.push({ item: 'captains_coat', chance: 0.2, qty: [1, 1] });
EXPEDITIONS.catacomb_depths.loot.items.push({ item: 'vestments_of_dagon', chance: 0.15, qty: [1, 1] });
EXPEDITIONS.crater_heart.loot.items.push({ item: 'brainkeeper_crown', chance: 0.25, qty: [1, 1] }, { item: 'star_alloy_band', chance: 0.25, qty: [1, 1] }, { item: 'migo_lens', chance: 0.2, qty: [1, 1] });
EXPEDITIONS.chained_stacks.loot.items.push({ item: 'archivists_satchel', chance: 0.25, qty: [1, 1] }, { item: 'librarian_staff', chance: 0.15, qty: [1, 1] }, { item: 'librarian_gloves', chance: 0.2, qty: [1, 1] });

// --- More companions ---
// mods work like perks while the companion is with you and on their feet.
Object.assign(COMPANIONS, {
  hesper: { name: 'Hesper Vane', icon: '🎩', desc: 'A one-eyed factor of the Ulric Bazaar. She fights like a clerk, but nobody cheats you while she watches.', hp: 40, ac: 12, hit: 3, dmg: '1d6', speed: 2800, wits: 2, home: 'port_ulric', mods: [['haggle', 0.05], ['gold', 0.1]] },
  marrow: { name: 'Old Marrow', icon: '⚓', desc: 'A sailor with salt in his beard and a cutlass he calls Mother. Knows every current in the bay.', hp: 65, ac: 13, hit: 5, dmg: '1d8+2', speed: 2600, wits: 1, home: 'port_ulric', mods: [['speed', 0.2, 'sailing'], ['travel', 0.1]] },
  thrain: { name: 'Thrain Deepdelver', icon: '⛏️', desc: 'A dwarven miner who went back down after the shaft was sealed again. He swings a pick in a fight, too.', hp: 80, ac: 16, hit: 5, dmg: '1d10+1', speed: 2900, wits: 1, home: 'ironhold', mods: [['speed', 0.2, 'mining'], ['double', 0.05, 'mining']] },
  maud: { name: 'Sister Maud', icon: '📚', desc: 'Keeper of the Forbidden Library. She reads aloud to steady you. She will not follow a mind that is Dream-Kissed or worse.', hp: 35, ac: 11, hit: 2, dmg: '1d4', speed: 3000, wits: 8, maxMadness: 3, home: 'silent_abbey', aura: { ward: 1 }, mods: [['sanityCost', -0.2, 'lore'], ['xp', 0.1, 'lore']] },
  silas: { name: 'Silas Crane', icon: '⚰️', desc: 'The sexton of the Blackwood Graveyard. He knows which graves are worth opening, and hits hard with a spade.', hp: 60, ac: 13, hit: 5, dmg: '1d8+1', speed: 2700, wits: 2, home: 'graveyard', mods: [['speed', 0.2, 'gravedigging'], ['rare', 0.02, 'gravedigging']] },
  ilse: { name: 'Ilse Hammerfoam', icon: '🍺', desc: 'Brewer of the Anvil & Ale. She keeps a flask for you in every fight (heals you 3 each turn).', hp: 55, ac: 12, hit: 4, dmg: '1d6+1', speed: 2800, wits: 1, heals: 3, home: 'ironhold', mods: [['speed', 0.2, 'brewing'], ['potency', 0.1]] },
  shuck: { name: 'Shuck', icon: '🐕‍🦺', desc: 'A black dog the size of a calf, with eyes like coals. Fast, and it always finds the trail.', hp: 45, ac: 14, hit: 6, dmg: '1d6+2', speed: 1800, wits: 3, home: 'blackwood', mods: [['speed', 0.15, 'hunting'], ['scout', 1]] },
  drowned_girl: { name: 'The Drowned Girl', icon: '👧', desc: 'She walks a little behind you and leaves wet footprints. Madness cannot touch her, and the things from beyond fear her.', hp: 60, ac: 15, hit: 7, dmg: '2d6', speed: 2600, wits: 99, mad: true, home: 'lighthouse', mods: [['eldritch', 0.15], ['veil', 10]] },
  cylinder: { name: 'The Voice in the Cylinder', icon: '🧠', desc: 'A brain in a Mi-Go canister, carried on your back. It cannot fight much, but it has read the libraries of Yuggoth and loves to explain.', hp: 30, ac: 18, hit: 2, dmg: '1d4', speed: 3000, wits: 10, home: 'crater', mods: [['allXp', 0.05], ['scrollPower', 0.1]] },
});
Object.assign(NPCS, {
  hesper_npc: {
    name: 'Hesper Vane', icon: '🎩', title: 'factor of the Ulric Bazaar', location: 'port_ulric', if: { noCompanion: 'hesper' },
    lines: [{ text: '"Six hundred gold, and I will come and make sure the rest of your gold stays yours. A bargain, you will find."' }],
    interactions: [{ id: 'hire', label: 'Hire Hesper', cost: { gold: 600 }, gain: { companion: 'hesper' }, result: '"Splendid. I shall keep the ledger."' }],
  },
  marrow_npc: {
    name: 'Old Marrow', icon: '⚓', title: 'between ships', location: 'port_ulric', if: { noCompanion: 'marrow' },
    lines: [{ text: '"Mother and I have sailed every water in the bay. For four hundred and fifty, we\'ll sail yours."' }],
    interactions: [{ id: 'hire', label: 'Sign on Old Marrow', cost: { gold: 450 }, gain: { companion: 'marrow' }, result: 'He pats his cutlass. "Mother approves."' }],
  },
  thrain_npc: {
    name: 'Thrain Deepdelver', icon: '⛏️', title: 'miner, back from below', location: 'deep_mines', if: { noCompanion: 'thrain', quests: { brunhild_below: 'done' } },
    lines: [{ text: '"You quieted the deep. Now there is ore down here no dwarf has touched in a hundred years. Five hundred gold and I will show you where."' }],
    interactions: [{ id: 'hire', label: 'Hire Thrain', cost: { gold: 500 }, gain: { companion: 'thrain' }, result: '"Mind your head. Mind everything, really."' }],
  },
  silas_npc: {
    name: 'Silas Crane', icon: '⚰️', title: 'sexton of the graveyard', location: 'graveyard', if: { noCompanion: 'silas' },
    lines: [{ text: 'A gaunt man leans on a spade. "Everyone in this ground owes me something. Three hundred gold and I\'ll collect for you."' }],
    interactions: [{ id: 'hire', label: 'Hire Silas', cost: { gold: 300 }, gain: { companion: 'silas' }, result: '"Bring a lantern. And a strong stomach."' }],
  },
  ilse_npc: {
    name: 'Ilse Hammerfoam', icon: '🍺', title: 'brewer of the Anvil & Ale', location: 'ironhold', if: { noCompanion: 'ilse' },
    lines: [{ text: '"I brew the best ale under the mountain and I fight better drunk than most do sober. Three hundred and fifty, and the first round is on me."' }],
    interactions: [{ id: 'hire', label: 'Hire Ilse', cost: { gold: 350 }, gain: { companion: 'ilse' }, result: 'She shoulders a keg. "Lead on."' }],
  },
  shuck_npc: {
    name: 'A Black Dog', icon: '🐕‍🦺', title: 'watching from the trees', location: 'blackwood', if: { noCompanion: 'shuck' },
    lines: [{ text: 'A huge black dog sits at the edge of the path, watching you with eyes like coals. It looks hungry, and it looks at your pack.' }],
    interactions: [{ id: 'hire', label: 'Offer it venison', cost: { items: { raw_venison: 5 } }, gain: { companion: 'shuck' }, result: 'It eats, licks your hand once, and falls in at your heel.' }],
  },
  drowned_girl_npc: {
    name: 'The Drowned Girl', icon: '👧', title: 'at the foot of the black lamp', location: 'lighthouse', if: { noCompanion: 'drowned_girl', minMadness: 3 },
    lines: [{ text: 'A small girl in a soaked nightdress looks up at you. "You can see me. Nobody can see me. Can I come? I will bring you pearls."' }],
    interactions: [{ id: 'hire', label: 'Give her three Veil Pearls back', cost: { items: { veil_pearl: 3 } }, gain: { companion: 'drowned_girl' }, result: 'She takes your hand. Hers is very cold.' }],
  },
  cylinder_npc: {
    name: 'A Voice from a Canister', icon: '🧠', title: 'among the Mi-Go wreckage', location: 'crater', if: { noCompanion: 'cylinder', minMadness: 1 },
    lines: [{ text: 'One of the metal canisters in the grass is talking. "You. Yes, you. Carry me away from here and I will teach you everything they taught me. Bring me a working cylinder; this one is leaking."' }],
    interactions: [{ id: 'hire', label: 'Move it into a Mi-Go Cylinder', cost: { items: { mi_go_cylinder: 1 } }, gain: { companion: 'cylinder' }, result: '"Ahh. Much better. Now, about the nature of time…"' }],
  },
});
// Sister Maud already keeps the library; she can now be asked along (and is away from it while she travels).
NPCS.maud.if = { noCompanion: 'maud' };
NPCS.maud.interactions.push({ id: 'hire', label: 'Ask Sister Maud to come', if: { maxMadness: 3 }, cost: { gold: 600 }, gain: { companion: 'maud' }, result: '"Someone ought to read to you while you read those books. I shall bring the small ones. The large ones bite."' });
ACHIEVEMENTS.find(a => a.id === 'company').name = 'The Whole Company';
