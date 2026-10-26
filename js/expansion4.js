// Twelve more skills: Delving, Thaumaturgy, Shieldcraft, Toxicology, Investigation, Linguistics, Divination,
// Meditation, Beekeeping, Animal Husbandry, Glassblowing and Fletching. Data only; the rules live in systems3.js.

Object.assign(SKILLS, {
  delving: { name: 'Delving', icon: '🕳️', type: 'combat', desc: 'Go down the Endless Stair beneath the Third Cellar, one floor at a time. Every floor is harder than the last, and every fifth holds a chest.' },
  thaumaturgy: { name: 'Thaumaturgy', icon: '✴️', type: 'combat', desc: 'Prepare a spell and it is cast for you in every fight, paid for in sanity. Each level makes your spells stronger.' },
  shieldcraft: { name: 'Shieldcraft', icon: '🛡️', type: 'combat', desc: 'Carry a shield in your off hand and learn to block. Every level makes a block more likely.' },
  toxicology: { name: 'Toxicology', icon: '☠️', type: 'production', desc: 'Brew poisons and coat your weapon. Every hit then carries extra damage, more the better you are at it.' },
  investigation: { name: 'Investigation', icon: '🔎', type: 'combat', desc: 'Gather clues around Aldmark and piece together what happened. Each case solved pays well, and some pay in stranger coin.' },
  linguistics: { name: 'Linguistics', icon: '🗣️', type: 'combat', desc: 'Learn the dwarven runes, Naacal, Aklo and the language of R\'lyeh. Every tongue you master helps the skills that use it.' },
  divination: { name: 'Divination', icon: '🔮', type: 'combat', desc: 'Read tea leaves, tarot, entrails and the water. Omens bless you for a while; scrying shows you places you have never been.' },
  meditation: { name: 'Meditation', icon: '🧘', type: 'combat', desc: 'Quiet the mind. It restores sanity, and every level makes it less likely that a breaking mind leaves a derangement behind.' },
  beekeeping: { name: 'Beekeeping', icon: '🐝', type: 'gathering', desc: 'Keep hives in Hollowfen or at home: honey, wax for candles, royal jelly, and for the touched, bees from the Dreamlands.' },
  husbandry: { name: 'Animal Husbandry', icon: '🐑', type: 'gathering', desc: 'Keep sheep, goats, hens and cattle in the pastures of Dunwich or at home, for wool, milk, eggs and meat.' },
  glassblowing: { name: 'Glassblowing', icon: '🫙', type: 'production', desc: 'Melt sand and sea glass at a forge into vials, lenses, telescopes, witch bottles and lamps that help just by being carried.' },
  fletching: { name: 'Fletching', icon: '🪶', type: 'production', desc: 'Make arrows. A bow uses the best arrows in your pack, one per shot, and they hit harder; some hit eldritch things harder still.' },
});
SKILL_GROUPS.find(g => g.name === 'Gathering').skills.push('beekeeping', 'husbandry');
SKILL_GROUPS.find(g => g.name === 'Crafting').skills.push('toxicology', 'glassblowing', 'fletching');
SKILL_GROUPS.find(g => g.name === 'Adventuring').skills.push('delving', 'investigation');
SKILL_GROUPS.find(g => g.name === 'Mind and Spirit').skills.push('thaumaturgy', 'linguistics', 'divination', 'meditation');
SKILL_GROUPS.find(g => g.name === 'Weapons').skills.push('shieldcraft');
for (const [attr, skills] of Object.entries({
  strength: ['delving', 'husbandry'], dexterity: ['shieldcraft', 'glassblowing', 'fletching'], constitution: ['meditation', 'beekeeping'],
  intelligence: ['thaumaturgy', 'toxicology', 'investigation', 'linguistics'], charisma: ['divination'],
})) {
  ATTRIBUTE_SKILLS[attr].push(...skills);
  for (const sk of skills) ATTRIBUTE_OF[sk] = attr;
}

Object.assign(STATIONS, {
  apiary: { name: 'Apiary', icon: '🐝' },
  pasture: { name: 'Pasture', icon: '🐑' },
});
LOCATIONS.hollowfen.stations.push('apiary');
LOCATIONS.dunwich.stations.push('pasture');
Object.assign(HOUSE_ROOMS, {
  apiary: { name: 'Apiary', icon: '🐝', level: 12, xp: 350, input: { twisted_oak_logs: 6, linen: 2 }, stations: ['apiary'], mods: [['heal', 0.05]], desc: 'Hives at the bottom of the garden.' },
  barn: { name: 'Barn and Paddock', icon: '🐑', level: 18, xp: 500, input: { grave_pine_logs: 10, stone_block: 6 }, stations: ['pasture'], mods: [['hp', 10]], desc: 'Room for a few sheep, a goat and some hens.' },
});
for (const id of ['apiary', 'barn']) {
  const r = HOUSE_ROOMS[id];
  ACTIONS.construction.push({ id: `build_${id}`, name: `Build a ${r.name}`, icon: r.icon, level: r.level, xp: r.xp, time: 8000 + r.level * 150, anywhere: true, input: r.input, effect: 'build', room: id, output: {}, desc: r.desc });
}
ACTIONS.construction.sort((a, b) => a.level - b.level);

// A place's gathering list, created if it has none yet.
const gatherAt = loc => LOCATIONS[loc].gather || (LOCATIONS[loc].gather = {});

// --- Delving: the Endless Stair ---
const DELVE_LOCATION = 'third_cellar';
const DELVE_CHEST_EVERY = 5;       // a chest every this many floors
const DELVE_CHECKPOINT = 10;       // you can start again from any multiple of this you have reached
const DELVE_XP_PER_FLOOR = 15;
// Each stretch of floors borrows the look of a creature, and grows from there.
const DELVE_FORMS = ['skeleton', 'ghoul', 'deepling', 'shoggoth_larva', 'bound_horror', 'mi_go', 'barrow_wight', 'nightgaunt', 'spawn_of_yog', 'star_spawn'];
const DELVE_LOOT = ['necronomicon_page', 'starmetal_bar', 'elder_elixir', 'eldritch_insight', 'adamantine_bar', 'clarity_draught', 'star_shard', 'ring_of_rlyeh', 'silver_key', 'brainkeeper_crown', 'nightgaunt_wraps', 'captains_coat'];

// --- Thaumaturgy: one prepared spell, cast in every fight ---
// effect: damage (dice), stun (dice, and the enemy starts its swing over), heal, ward (a blessing), summon (a shade for the fight)
const SPELLS = {
  force_bolt: { name: 'Force Bolt', icon: '✴️', level: 1, cost: 2, every: 6000, damage: '2d6', desc: 'A bolt of raw will.' },
  witch_fire: { name: 'Witch-Fire', icon: '🔥', level: 10, cost: 4, every: 8000, damage: '3d8', desc: 'Green fire that burns what it should not.' },
  elder_ward: { name: 'Elder Ward', icon: '⭐', level: 18, cost: 5, every: 30000, ward: { name: 'Elder Ward', icon: '⭐', effects: { ward: 3, ac: 2 }, ms: 30000 }, desc: '+3 to sanity saves and +2 AC, renewed every 30 seconds.' },
  binding_words: { name: 'Binding Words', icon: '⛓️', level: 26, cost: 6, every: 10000, damage: '2d8', stun: true, desc: 'Words that hold a thing still, and hurt it.' },
  mend_flesh: { name: 'Mend Flesh', icon: '🩹', level: 32, cost: 6, every: 12000, heal: 40, desc: 'Heals 40 when you are below 60% of your hitpoints.' },
  summon_shade: { name: 'Summon Shade', icon: '👤', level: 40, cost: 12, every: 60000, summon: 'conjured_shade', desc: 'A shade fights beside you for a minute.' },
  unmaking: { name: 'The Unmaking', icon: '🌀', level: 48, cost: 15, every: 15000, damage: '8d10', eldritchMult: 1.5, desc: 'A word that undoes. Half again as strong against eldritch beings.' },
};
const SPELL_POWER_PER_LEVEL = 0.02;
const SPELL_SANITY_MARGIN = 5;      // never cast a spell that would leave you this close to breaking
Object.assign(COMPANIONS, {
  conjured_shade: { name: 'Conjured Shade', icon: '👤', desc: 'A shadow with your outline, called up for one fight.', hp: 80, ac: 16, hit: 8, dmg: '2d8', speed: 2200, wits: 99, mad: true, thrall: true, conjured: true, lasts: 60000, home: 'third_cellar' },
});
ACTIONS.thaumaturgy = [
  { id: 'drill_forms', name: 'Drill the Forms', icon: '✴️', level: 1, xp: 12, time: 4000, anywhere: true, sanityCost: 1, output: {} },
  { id: 'study_grimoire', name: 'Study a Grimoire', icon: '📖', level: 20, xp: 60, time: 6000, station: 'library', sanityCost: 4, needs: ['pnakotic_fragments'], output: {} },
  { id: 'channel_stars', name: 'Channel the Stars', icon: '🌌', level: 40, xp: 150, time: 8000, nightBest: true, sanityCost: 8, output: { eldritch_insight: 1 } },
];
gatherAt('standing_stones').thaumaturgy = ['channel_stars'];

// --- Shieldcraft ---
SLOTS.offhand = 'Off-hand';
const BLOCK_BASE = 0.05;
const BLOCK_PER_LEVEL = 0.005;
const MAX_BLOCK = 0.5;
const SHIELD_KILL_SHARE = 0.25;   // share of each kill's xp that goes to Shieldcraft while you carry a shield
const SHIELD_AC = { iron: 1, silver: 2, blackiron: 2, adamantine: 3, starmetal: 4 };
for (const t of GEAR_TIERS) {
  const id = `${t.key}_shield`;
  addItem(id, { name: `${t.prefix} Shield`, icon: '🛡️', type: 'equipment', slot: 'offhand', stats: { ac: SHIELD_AC[t.key] }, req: { combat: t.req }, sell: Math.round(ITEMS[t.bar].sell * 2 * 1.5), desc: 'Carried in the off hand. Lets you block.' });
  ACTIONS.smithing.push({ id, name: `Forge ${ITEMS[id].name}`, level: Math.min(50, t.smith + 2), xp: t.xp * 2, time: 4000, station: t.station, input: { [t.bar]: 2 }, output: { [id]: 1 } });
}
addItem('oak_buckler', { name: 'Oak Buckler', icon: '🛡️', type: 'equipment', slot: 'offhand', stats: { ac: 1 }, req: { combat: 2 }, sell: 15, desc: 'Carried in the off hand. Lets you block.' });
addItem('elder_sign_shield', { name: 'Shield of the Elder Sign', icon: '⭐', type: 'equipment', slot: 'offhand', stats: { ac: 4, ward: 3 }, mods: [['block', 0.05]], req: { combat: 30 }, sell: 3000, desc: 'The star and the flaming eye, inlaid in silver. Things from beyond flinch from it.' });
ACTIONS.carpentry.push({ id: 'oak_buckler', name: 'Carve an Oak Buckler', level: 4, xp: 20, time: 3000, station: 'workbench', input: { twisted_oak_logs: 2 }, output: { oak_buckler: 1 } });
ACTIONS.smithing.push({ id: 'elder_sign_shield', name: 'Forge the Shield of the Elder Sign', level: 36, xp: 600, time: 8000, station: 'forge', input: { silver_bar: 4, starmetal_bar: 2, whispering_fragment: 10 }, output: { elder_sign_shield: 1 } });
ACTIONS.carpentry.sort((a, b) => a.level - b.level);
ACTIONS.smithing.sort((a, b) => a.level - b.level);

// --- Toxicology: poisons that coat your weapon ---
const POISONS = [
  // [id, name, icon, level, xp, input, extra damage per hit, minutes, other effects]
  ['bitter_paste', 'Bitter Paste', '🟢', 1, 10, { grave_moss: 3 }, 1, 3, {}],
  ['nightshade_venom', 'Nightshade Venom', '🍇', 10, 30, { nightshade: 2 }, 3, 3, {}],
  ['lily_tincture', 'Ghost-Lily Tincture', '🤍', 18, 50, { ghost_lily: 2, pale_wort: 1 }, 4, 5, {}],
  ['deep_toxin', 'Deep Toxin', '🐟', 28, 80, { deep_egg: 2, nightshade: 2 }, 6, 5, {}],
  ['myrtle_bane', 'Myrtle Bane', '🌿', 36, 120, { bog_myrtle: 3, ghost_lily: 2 }, 8, 5, {}],
  ['leng_venom', 'Venom of Leng', '🕷️', 46, 220, { leng_onyx: 1, star_rose: 1 }, 12, 5, { eldritch: 0.1 }],
];
const POISON_POWER_PER_LEVEL = 0.01;
ACTIONS.toxicology = [];
for (const [id, name, icon, level, xp, input, dmg, mins, other] of POISONS) {
  addItem(id, { name, icon, type: 'poison', sell: Math.round(xp / 2) + 2, buff: { name: `Coated: ${name}`, icon, effects: Object.assign({ poisonDmg: dmg }, other), ms: mins * 60000 }, desc: `Coat your weapon: +${dmg} poison damage on every hit for ${mins} minutes.` });
  ACTIONS.toxicology.push({ id, name: `Brew ${name}`, level, xp, time: 3500 + level * 60, station: 'lab', input, output: { [id]: 1 } });
}

// --- Investigation: cases with clues ---
const CASES = {
  missing_fisherman: {
    name: 'The Missing Fisherman', level: 1, solveAt: 'saltmire',
    clues: { wet_footprints: ['saltmire_shore', 'Wet Footprints'], torn_net: ['saltmire', 'A Torn Net'], scaled_button: ['saltmire_shore', 'A Scaled Button'] },
    reward: { gold: 200, items: { calming_elixir: 3 } },
    result: 'Ezra Hobbs did not drown. He walked into the sea, in his Sunday coat, and the buttons tell you who he went to meet.',
  },
  abbey_thefts: {
    name: 'The Abbey Thefts', level: 12, solveAt: 'silent_abbey',
    clues: { ink_stained_note: ['silent_abbey', 'An Ink-Stained Note'], dug_earth: ['graveyard', 'Freshly Dug Earth'], trampled_path: ['blackwood', 'A Trampled Path'] },
    reward: { gold: 400, items: { pnakotic_fragments: 1 } },
    result: 'The missing books were carried to the graveyard by a novice who sleepwalks. He was reading them aloud. Something was listening. The brothers let you keep one.',
  },
  dunwich_cattle: {
    name: 'The Dunwich Cattle', level: 22, solveAt: 'dunwich',
    clues: { crushed_fence: ['dunwich', 'A Crushed Fence'], huge_tracks: ['sentinel_hill', 'Tracks the Size of Barrels'], charred_stone: ['standing_stones', 'A Charred Stone'] },
    reward: { gold: 1500, items: { necronomicon_page: 2 } },
    result: 'The cattle were not stolen. They were fed to something that is growing in the Whateley farmhouse, and it has outgrown cattle.',
  },
  lighthouse_keeper: {
    name: 'The Lighthouse Keeper', level: 32, solveAt: 'port_ulric',
    clues: { keeper_log: ['lighthouse', "The Keeper's Log"], lens_fragment: ['saltmire_shore', 'A Lens Fragment'], ship_manifest: ['port_ulric', 'A Ship\'s Manifest'] },
    reward: { gold: 2500, items: { echo_mirror: 1 } },
    result: 'There was a lighthouse, and a keeper, until a ship from no port on any map put in for one night. The light that burns now is what they left behind.',
  },
  shadow_over_hollowfen: {
    name: 'The Shadow over Hollowfen', level: 42, solveAt: 'hollowfen',
    clues: { stilt_carving: ['hollowfen', 'A Carving on the Stilts'], drowned_letter: ['moonmere', 'A Drowned Letter'], hymnal_page: ['drowned_catacombs', 'A Page from a Hymnal'] },
    reward: { gold: 4000, items: { clarity_draught: 3 }, madness: -1 },
    result: 'Half of Hollowfen has gills under its collars, and the lamps on the porches are not to keep the lights away. They are to call them home. Knowing it, oddly, steadies you.',
  },
};
ACTIONS.investigation = [
  { id: 'canvass', name: 'Ask Around Town', icon: '🗨️', level: 1, xp: 12, time: 4000, gold: [1, 5], output: {} },
];
for (const [caseId, c] of Object.entries(CASES)) {
  for (const [clue, [loc, name]] of Object.entries(c.clues)) {
    addItem(clue, { name, icon: '🔍', type: 'clue', sell: 0, desc: `A clue in the case of ${c.name}.` });
    ACTIONS.investigation.push({ id: `clue_${clue}`, name: `Look for ${name}`, icon: '🔍', level: c.level, xp: 20 + c.level * 3, time: 5000 + c.level * 60, caseId, output: { [clue]: 1 } });
    gatherAt(loc).investigation = (gatherAt(loc).investigation || []).concat(`clue_${clue}`);
  }
  ACTIONS.investigation.push({ id: `solve_${caseId}`, name: `Solve: ${c.name}`, icon: '📁', level: c.level, xp: 150 + c.level * 25, time: 8000, caseId, effect: 'solve', input: Object.fromEntries(Object.keys(c.clues).map(k => [k, 1])), output: {} });
  gatherAt(c.solveAt).investigation = (gatherAt(c.solveAt).investigation || []).concat(`solve_${caseId}`);
}
for (const loc of ['saltmire', 'ironhold', 'dunwich', 'hollowfen', 'port_ulric']) {
  gatherAt(loc).investigation = ['canvass'].concat(gatherAt(loc).investigation || []);
}

// --- Linguistics: languages that help other skills ---
const LANGUAGES = [
  { level: 10, name: 'Dwarven Runes', icon: 'ᚱ', mods: [['xp', 0.1, 'mining'], ['xp', 0.1, 'smithing']] },
  { level: 20, name: 'Naacal', icon: '𓂀', mods: [['xp', 0.1, 'archaeology'], ['rare', 0.01, 'archaeology']] },
  { level: 30, name: 'Aklo', icon: '᛭', mods: [['sanityCost', -0.1, 'lore'], ['sanityCost', -0.1, 'occultism']] },
  { level: 40, name: "R'lyehian", icon: '🐙', mods: [['eldritch', 0.1], ['double', 0.1, 'lore']] },
];
ACTIONS.linguistics = [
  { id: 'dwarven_runes', name: 'Copy the Rune-Walls', icon: 'ᚱ', level: 1, xp: 12, time: 4000, output: {} },
  { id: 'translate_tablets', name: 'Translate Tablets', icon: '🏺', level: 10, xp: 30, time: 5000, anywhere: true, input: { potsherd: 2 }, output: { whispering_fragment: 1 } },
  { id: 'naacal_pillars', name: 'Read the Naacal Pillars', icon: '𓂀', level: 20, xp: 60, time: 6000, output: {} },
  { id: 'aklo', name: 'Transcribe Aklo', icon: '᛭', level: 30, xp: 100, time: 6500, station: 'library', sanityCost: 3, input: { cultist_text: 1 }, output: { eldritch_insight: 2 } },
  { id: 'rlyehian', name: 'Listen to the Deep Ones Speak', icon: '🐙', level: 42, xp: 180, time: 8000, sanityCost: 6, output: { eldritch_insight: 3 } },
];
LOCATIONS.ironhold.gather.linguistics = ['dwarven_runes'];
LOCATIONS.deep_mines.gather.linguistics = ['dwarven_runes'];
LOCATIONS.drowned_isle.gather.linguistics = ['naacal_pillars'];
LOCATIONS.devils_reef.gather.linguistics = ['rlyehian'];

// --- Divination ---
addItem('tarot_deck', { name: 'Tarot Deck', icon: '🃏', type: 'tool', sell: 60, desc: 'Worn cards. One of them is not in any other deck.' });
const TAROT = [
  { name: 'The Tower', icon: '🗼', effects: { dmg: 2 } },
  { name: 'The Star', icon: '⭐', effects: { allXp: 0.1 } },
  { name: 'The Moon', icon: '🌙', effects: { veil: 10, ward: 1 } },
  { name: 'The Hermit', icon: '🕯️', effects: { ward: 2 } },
  { name: 'The Wheel', icon: '☸️', effects: { gold: 0.15 } },
  { name: 'The Chariot', icon: '🐎', effects: { travel: 0.25 } },
];
const TAROT_MS = 600000;
const DIVINATION_SCOUT_LEVELS = 15;   // +1 to road-event checks per this many levels
ACTIONS.divination = [
  { id: 'tea_leaves', name: 'Read the Tea Leaves', icon: '🍵', level: 1, xp: 10, time: 4000, anywhere: true, input: { grave_moss: 1 }, output: {}, buff: { name: 'Good Omen', icon: '🍵', effects: { gold: 0.05 }, ms: 300000 } },
  { id: 'tarot', name: 'Lay Out the Tarot', icon: '🃏', level: 10, xp: 30, time: 5000, anywhere: true, needs: ['tarot_deck'], effect: 'tarot', output: {}, desc: 'One card, one blessing for ten minutes.' },
  { id: 'entrails', name: 'Read the Entrails', icon: '🩸', level: 22, xp: 55, time: 5500, anywhere: true, input: { raw_venison: 1 }, output: {}, buff: { name: 'Augury of Blood', icon: '🩸', effects: { crit: 1, killHeal: 3 }, ms: 600000 } },
  { id: 'scrying', name: 'Scry in Still Water', icon: '💧', level: 34, xp: 100, time: 7000, station: 'shore', input: { veil_pearl: 1 }, effect: 'scry', output: {}, buff: { name: 'Far Sight', icon: '💧', effects: { travel: 0.2 }, ms: 600000 }, desc: 'Shows you a place you have not yet found.' },
  { id: 'oracle', name: 'Consult the Stones', icon: '🗿', level: 45, xp: 200, time: 9000, input: { eldritch_insight: 3 }, output: {}, buff: { name: 'Foreknowledge', icon: '🗿', effects: { ac: 3, ward: 3, hit: 2 }, ms: 600000 } },
];
LOCATIONS.standing_stones.gather.divination = ['oracle'];

// --- Meditation ---
const MEDITATION_RESIST_PER_LEVEL = 0.01;   // chance per level that a breaking mind keeps no derangement
const MAX_DERANGEMENT_RESIST = 0.6;
ACTIONS.meditation = [
  { id: 'breathing', name: 'Count Your Breaths', icon: '🌬️', level: 1, xp: 8, time: 4000, anywhere: true, sanityGain: 2, output: {} },
  { id: 'stillness', name: 'Sit in Stillness', icon: '🪷', level: 12, xp: 25, time: 5000, anywhere: true, sanityGain: 4, output: {} },
  { id: 'mind_palace', name: 'Walk Your Mind Palace', icon: '🏛️', level: 25, xp: 60, time: 6000, station: 'library', sanityGain: 6, output: {}, buff: { name: 'Mind Palace', icon: '🏛️', effects: { ward: 2 }, ms: 600000 } },
  { id: 'void_gazing', name: 'Gaze into the Void', icon: '🕳️', level: 40, xp: 140, time: 8000, sanityGain: 10, output: {}, buff: { name: 'Empty Mind', icon: '🕳️', effects: { ward: 3, eldritch: 0.1 }, ms: 600000 } },
];
LOCATIONS.standing_stones.gather.meditation = ['void_gazing'];
gatherAt('sentinel_hill').meditation = ['void_gazing'];

// --- Beekeeping ---
addItem('honeycomb', { name: 'Honeycomb', icon: '🍯', sell: 6, desc: 'Render it for honey and wax.' });
addItem('honey', { name: 'Jar of Honey', icon: '🍯', type: 'food', heal: 30, sell: 12, desc: 'Restores 30 hitpoints.' });
addItem('beeswax', { name: 'Beeswax', icon: '🟨', sell: 4, desc: 'For candles.' });
addItem('royal_jelly', { name: 'Royal Jelly', icon: '👑', type: 'potion', heal: 80, sanity: 10, sell: 60, desc: 'Restores 80 hitpoints and 10 sanity.' });
ACTIONS.beekeeping = [
  { id: 'tend_hives', name: 'Tend the Hives', icon: '🐝', level: 1, xp: 10, time: 4000, station: 'apiary', output: { honeycomb: 1 }, bonus: [{ item: 'beeswax', chance: 0.3, qty: 1 }] },
  { id: 'render_comb', name: 'Render Honeycomb', level: 5, xp: 14, time: 3000, station: 'apiary', input: { honeycomb: 2 }, output: { honey: 1, beeswax: 2 } },
  { id: 'dip_candles', name: 'Dip Candles', level: 10, xp: 20, time: 3500, station: 'apiary', input: { beeswax: 2 }, output: { votive_candle: 3 } },
  { id: 'royal_jelly', name: 'Gather Royal Jelly', level: 25, xp: 70, time: 6000, station: 'apiary', output: { royal_jelly: 1 } },
  { id: 'dream_bees', name: 'Keep Bees from the Dreamlands', icon: '✨', level: 40, xp: 150, time: 7500, station: 'apiary', minMadness: 1, output: { dream_honey: 1 }, desc: 'They come through when you are half asleep, and they only make honey for the touched.' },
];

// --- Animal Husbandry ---
addItem('wool', { name: 'Wool', icon: '🧶', sell: 3 });
addItem('goat_milk', { name: 'Goat Milk', icon: '🥛', type: 'food', heal: 18, sell: 4, desc: 'Restores 18 hitpoints.' });
addItem('egg', { name: 'Egg', icon: '🥚', sell: 2, desc: 'Cook it.' });
addItem('omelette', { name: 'Omelette', icon: '🍳', type: 'food', heal: 35, sell: 8, desc: 'Restores 35 hitpoints.' });
addItem('raw_beef', { name: 'Raw Beef', icon: '🥩', sell: 8, desc: 'Must be cooked before it can be eaten.' });
addItem('roast_beef', { name: 'Roast Beef', icon: '🍖', type: 'food', heal: 60, sell: 16, desc: 'Restores 60 hitpoints.' });
addItem('whateley_fleece', { name: 'Whateley Fleece', icon: '🐏', sell: 200, desc: 'Grey, oily and warm in a way wool should not be. It came off something that bleats with too many voices.' });
addItem('woollen_cloak', { name: 'Woollen Cloak', icon: '🧥', type: 'equipment', slot: 'back', stats: { slots: 5, ward: 1 }, sell: 60, desc: '+5 pack slots. Warm and full of pockets.' });
addItem('whateley_shawl', { name: 'Whateley Shawl', icon: '🧣', type: 'equipment', slot: 'back', stats: { slots: 6, ward: 3 }, mods: [['veil', 5]], req: { combat: 20 }, sell: 900, desc: '+6 pack slots. You hear the whippoorwills when you wear it.' });
ACTIONS.husbandry = [
  { id: 'shear_sheep', name: 'Shear the Sheep', icon: '🐑', level: 1, xp: 10, time: 4000, station: 'pasture', output: { wool: 1 } },
  { id: 'milk_goats', name: 'Milk the Goats', icon: '🐐', level: 5, xp: 16, time: 4000, station: 'pasture', output: { goat_milk: 1 } },
  { id: 'collect_eggs', name: 'Collect the Eggs', icon: '🐔', level: 10, xp: 22, time: 4500, station: 'pasture', output: { egg: 2 } },
  { id: 'raise_cattle', name: 'Raise Cattle', icon: '🐄', level: 20, xp: 45, time: 6000, station: 'pasture', output: { raw_beef: 2, deer_hide: 1 } },
  { id: 'whateley_herd', name: 'Tend the Whateley Herd', icon: '🐏', level: 35, xp: 110, time: 7000, minMadness: 1, sanityCost: 3, output: { whateley_fleece: 1 }, bonus: [{ item: 'eldritch_insight', chance: 0.2, qty: 1 }] },
];
gatherAt('sentinel_hill').husbandry = ['whateley_herd'];
ACTIONS.cooking.push(
  { id: 'omelette', name: 'Cook an Omelette', level: 10, xp: 20, time: 2500, station: 'fire', input: { egg: 2 }, output: { omelette: 1 } },
  { id: 'roast_beef', name: 'Roast Beef', level: 18, xp: 40, time: 3000, station: 'fire', input: { raw_beef: 1 }, output: { roast_beef: 1 } },
);
ACTIONS.cooking.sort((a, b) => a.level - b.level);
ACTIONS.tailoring.push(
  { id: 'woollen_cloak', name: 'Knit a Woollen Cloak', level: 12, xp: 40, time: 4500, station: 'loom', input: { wool: 6 }, output: { woollen_cloak: 1 } },
  { id: 'whateley_shawl', name: 'Weave a Whateley Shawl', level: 30, xp: 250, time: 6000, station: 'loom', input: { whateley_fleece: 3 }, output: { whateley_shawl: 1 } },
);
ACTIONS.tailoring.sort((a, b) => a.level - b.level);

// --- Glassblowing ---
addItem('sand', { name: 'Sand', icon: '⏳', sell: 1, desc: 'Fine, pale sand from the shore.' });
addItem('glass_vial', { name: 'Glass Vial', icon: '🧪', sell: 4 });
addItem('lens', { name: 'Ground Lens', icon: '🔍', sell: 20 });
addItem('witch_bottle', { name: 'Witch Bottle', icon: '🍾', type: 'equipment', slot: 'amulet', stats: { ward: 2 }, mods: [['sanityCost', -0.05, 'occultism'], ['veil', 5]], req: { combat: 10 }, sell: 150, desc: 'Bones, pins and whispers sealed in glass. Hung round the neck, it catches what is sent at you.' });
const GLASS_GADGETS = {
  brass_telescope: ['Brass Telescope', '🔭', [['speed', 0.2, 'astronomy'], ['rare', 0.02, 'astronomy']], 600, 'Folds into a tube the length of your hand.'],
  stained_glass: ['Stained-Glass Saint', '🪟', [['ward', 1], ['dreamRest', 1, 'faith']], 900, 'A little saint in coloured glass, to hold up to the light when you pray.'],
  alhazred_lamp: ['Lamp of Alhazred', '🪔', [['speed', 0.15, 'lore'], ['speed', 0.1, 'inscription'], ['ward', 1]], 3000, 'By its light, the pages of forbidden books hold still.'],
};
for (const [id, [name, icon, mods, sell, desc]] of Object.entries(GLASS_GADGETS)) addItem(id, { name, icon, type: 'tool', gadget: true, mods, sell, desc: `${desc} Works while carried.` });
ACTIONS.glassblowing = [
  { id: 'glass_vial', name: 'Blow Glass Vials', level: 1, xp: 8, time: 3000, station: 'forge', input: { sand: 2 }, output: { glass_vial: 2 } },
  { id: 'lens', name: 'Grind a Lens', level: 10, xp: 30, time: 4000, station: 'forge', input: { sand: 3, sea_glass: 1 }, output: { lens: 1 } },
  { id: 'witch_bottle', name: 'Seal a Witch Bottle', level: 18, xp: 60, time: 4500, station: 'forge', input: { glass_vial: 1, old_bones: 2, whispering_fragment: 2 }, output: { witch_bottle: 1 } },
  { id: 'brass_telescope', name: 'Build a Brass Telescope', level: 24, xp: 200, time: 6000, station: 'forge', input: { lens: 2, silver_bar: 1 }, output: { brass_telescope: 1 } },
  { id: 'stained_glass', name: 'Lead a Stained-Glass Saint', level: 32, xp: 300, time: 7000, station: 'forge', input: { sand: 6, sea_glass: 4, silver_bar: 1 }, output: { stained_glass: 1 } },
  { id: 'alhazred_lamp', name: 'Make the Lamp of Alhazred', level: 42, xp: 800, time: 9000, station: 'forge', input: { lens: 2, starmetal_bar: 1, eldritch_insight: 2 }, output: { alhazred_lamp: 1 } },
];
ACTIONS.tidecombing.push({ id: 'shovel_sand', name: 'Shovel Sand', level: 1, xp: 8, time: 3000, tideDouble: true, output: { sand: 2 } });
ACTIONS.tidecombing.sort((a, b) => a.level - b.level);
LOCATIONS.saltmire_shore.gather.tidecombing.push('shovel_sand');
LOCATIONS.port_ulric.gather.tidecombing.push('shovel_sand');

// --- Fletching: arrows that bows use up ---
const ARROWS = [
  // [id, name, level, input, bonus damage, extra against eldritch]
  ['iron_arrows', 'Iron Arrows', 1, { ash_logs: 1, iron_bar: 1 }, 1, 0],
  ['silver_arrows', 'Silver Arrows', 10, { twisted_oak_logs: 1, silver_bar: 1 }, 2, 2],
  ['blackiron_arrows', 'Blackiron Arrows', 18, { grave_pine_logs: 1, blackiron_bar: 1 }, 3, 0],
  ['blessed_arrows', 'Blessed Arrows', 26, { grave_pine_logs: 1, silver_bar: 1, holy_water: 1 }, 3, 5],
  ['adamantine_arrows', 'Adamantine Arrows', 34, { shadowbark_logs: 1, adamantine_bar: 1 }, 5, 0],
  ['starmetal_arrows', 'Starmetal Arrows', 44, { pale_logs: 1, starmetal_bar: 1 }, 7, 3],
];
const ARROWS_PER_BATCH = 15;
const FLETCHING_XP_PER_SHOT = 0.5;
const FLETCHING_DMG_LEVELS = 20;   // +1 arrow damage per this many Fletching levels
ACTIONS.fletching = [];
for (const [id, name, level, input, dmg, eldritch] of ARROWS) {
  addItem(id, { name, icon: '🏹', type: 'arrow', arrowDmg: dmg, arrowEldritch: eldritch, sell: Math.max(1, level), desc: `A bow shoots these first: +${dmg} damage${eldritch ? `, +${eldritch} more against eldritch beings` : ''}. One per shot.` });
  ACTIONS.fletching.push({ id, name: `Fletch ${name}`, level, xp: 10 + level * 3, time: 3000 + level * 50, station: 'workbench', input, output: { [id]: ARROWS_PER_BATCH } });
}

// --- Shops ---
SHOPS.general_store.stock.push({ item: 'tarot_deck', price: 200 }, { item: 'iron_arrows', price: 3 });
SHOPS.ulric_bazaar.stock.push({ item: 'tarot_deck', price: 180 }, { item: 'sand', price: 2 });
SHOPS.smithy.stock.push({ item: 'iron_shield', price: 120 }, { item: 'iron_arrows', price: 3 });
SHOPS.osborn_store.stock.push({ item: 'iron_arrows', price: 3 }, { item: 'wool', price: 6 });

// --- Achievements ---
ACHIEVEMENTS.push(
  { id: 'deep_stair', icon: '🕳️', name: 'The Deep Stair', desc: 'Reach floor 25 of the Endless Stair.', test: g => g.state.delve.deepest >= 25 },
  { id: 'case_closed', icon: '📁', name: 'Case Closed', desc: 'Solve every case.', test: g => Object.keys(CASES).every(c => g.state.flags[`case_${c}`]) },
  { id: 'polyglot', icon: '🗣️', name: 'Polyglot', desc: 'Learn every language.', test: g => g.level('linguistics') >= LANGUAGES[LANGUAGES.length - 1].level },
);
