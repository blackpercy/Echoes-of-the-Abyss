// Game data for Echoes of the Abyss: skills, items, actions, monsters, locations and the world map.

// Shown under Settings so players can tell which build they are running. Bump with CACHE in sw.js.
const GAME_VERSION = '15';

const SKILLS = {
  woodcutting: { name: 'Woodcutting', icon: '🪓', type: 'gathering', desc: 'Fell the trees of the Blackwood, whose roots drink from old graves.' },
  fishing: { name: 'Fishing', icon: '🎣', type: 'gathering', desc: 'Haul up what swims in the black waters off Saltmire. Some catches stare back.' },
  mining: { name: 'Mining', icon: '⛏️', type: 'gathering', desc: 'Break ore from the mountains, and from the star that fell beyond the forest.' },
  foraging: { name: 'Foraging', icon: '🌿', type: 'gathering', desc: 'Gather herbs that grow where the moonlight never reaches.' },
  cooking: { name: 'Cooking', icon: '🍲', type: 'production', desc: 'Cook your catch. A warm meal holds body and mind together.' },
  smithing: { name: 'Smithing', icon: '⚒️', type: 'production', desc: 'Smelt ore into bars and forge weapons and armour.' },
  alchemy: { name: 'Alchemy', icon: '⚗️', type: 'production', desc: 'Brew draughts that mend wounds and steady a shaken mind.' },
  occultism: { name: 'Occultism', icon: '👁️', type: 'production', desc: 'Study forbidden lore. Every insight costs a piece of your sanity, but grants power over things that should not be.' },
  fellowship: { name: 'Fellowship', icon: '🤝', type: 'combat', desc: 'The bond with those who travel beside you. Trained by fighting and travelling with a companion; each level makes your companions tougher and deadlier, and every 5 levels let you lead one more.' },
  combat: { name: 'Combat', icon: '⚔️', type: 'combat', desc: 'Skill at arms. Raises your proficiency, your might and your hitpoints, and lets you wield better gear.' },
};

const SKILL_GROUPS = [
  { name: 'Gathering', skills: ['woodcutting', 'fishing', 'mining', 'foraging'] },
  { name: 'Crafting', skills: ['cooking', 'smithing', 'alchemy', 'occultism'] },
  { name: 'Adventuring', skills: ['combat', 'fellowship'] },
];

// Places where production happens. A portable item lets you work anywhere.
const STATIONS = {
  fire: { name: 'Fire', icon: '🔥', portable: 'tinderbox' },
  forge: { name: 'Forge', icon: '⚒️' },
  star_forge: { name: 'Star Forge', icon: '☄️' },
  lab: { name: 'Alchemy Lab', icon: '⚗️', portable: 'alchemy_kit' },
  library: { name: 'Forbidden Library', icon: '📚' },
  altar: { name: 'Elder Altar', icon: '🗿' },
  shore: { name: 'Shoreline', icon: '🌊' },
};

const ITEMS = {};
function addItem(id, def) {
  ITEMS[id] = Object.assign({ id, type: 'resource', sell: 1, icon: '❔', desc: '' }, def);
}

// --- Logs ---
addItem('ash_logs', { name: 'Ash Logs', icon: '🪵', sell: 1, desc: 'Pale, straight wood. Burns clean.' });
addItem('twisted_oak_logs', { name: 'Twisted Oak Logs', icon: '🪵', sell: 3, desc: 'The grain forms patterns that almost look like writing.' });
addItem('grave_pine_logs', { name: 'Grave Pine Logs', icon: '🪵', sell: 8, desc: 'From pines grown on old burial grounds. The sap is red as blood.' });
addItem('shadowbark_logs', { name: 'Shadowbark Logs', icon: '🪵', sell: 18, desc: 'The bark casts a shadow even in darkness.' });
addItem('pale_logs', { name: 'Pale Logs', icon: '🪵', sell: 40, desc: 'White as bone, and just as cold.' });
addItem('dream_logs', { name: 'Dream Logs', icon: '🪵', sell: 90, desc: 'From a tree of the Outer Spheres. Those who sleep near it dream of cities beneath the sea.' });

// --- Fish: [id, name, level, xp, time, sell, heal, icon] ---
const FISH = [
  ['shrimp', 'Shrimp', 1, 10, 3000, 2, 15, '🦐'],
  ['pale_eel', 'Pale Eel', 5, 20, 3500, 5, 25, '🐍'],
  ['deep_cod', 'Deep Cod', 10, 32, 4000, 12, 40, '🐟'],
  ['squidling', 'Squidling', 18, 50, 5000, 25, 60, '🦑'],
  ['drowned_salmon', 'Drowned Salmon', 25, 75, 6000, 45, 85, '🐟'],
  ['abyssal_catfish', 'Abyssal Catfish', 32, 110, 7000, 80, 115, '🐡'],
  ['leviathan_spawn', 'Leviathan Spawn', 42, 175, 9000, 150, 160, '🐙'],
];
for (const [id, name, , , , sell, heal, icon] of FISH) {
  addItem('raw_' + id, { name: 'Raw ' + name, icon, sell, desc: 'Must be cooked before it can be eaten.' });
  addItem(id, { name: 'Cooked ' + name, icon: '🍖', type: 'food', heal, sell: Math.round(sell * 1.6), desc: `Restores ${heal} hitpoints.` });
}
addItem('bread', { name: 'Coarse Bread', icon: '🍞', type: 'food', heal: 10, sell: 1, desc: 'Dry but filling. Restores 10 hitpoints.' });

// --- Ores and bars ---
addItem('iron_ore', { name: 'Iron Ore', icon: '🪨', sell: 3 });
addItem('silver_ore', { name: 'Silver Ore', icon: '🪨', sell: 10 });
addItem('blackiron_ore', { name: 'Blackiron Ore', icon: '🪨', sell: 20 });
addItem('adamantine_ore', { name: 'Adamantine Ore', icon: '🪨', sell: 45 });
addItem('starmetal_ore', { name: 'Starmetal Ore', icon: '☄️', sell: 100, desc: 'Warm to the touch. It hums faintly, as if it remembers the journey through the void.' });
addItem('iron_bar', { name: 'Iron Bar', icon: '🧱', sell: 10 });
addItem('silver_bar', { name: 'Silver Bar', icon: '🧱', sell: 30, desc: 'Silver cuts through the undead.' });
addItem('blackiron_bar', { name: 'Blackiron Bar', icon: '🧱', sell: 60 });
addItem('adamantine_bar', { name: 'Adamantine Bar', icon: '🧱', sell: 140 });
addItem('starmetal_bar', { name: 'Starmetal Bar', icon: '🧱', sell: 320 });

// --- Herbs ---
addItem('grave_moss', { name: 'Grave Moss', icon: '🌿', sell: 3 });
addItem('pale_wort', { name: 'Pale Wort', icon: '🌱', sell: 8 });
addItem('nightshade', { name: 'Nightshade', icon: '🍇', sell: 20 });
addItem('dream_poppy', { name: 'Dream Poppy', icon: '🌺', sell: 45 });
addItem('star_rose', { name: 'Star Rose', icon: '🌸', sell: 100, desc: 'Blooms only when the stars are right.' });

// --- Potions ---
addItem('healing_draught', { name: 'Healing Draught', icon: '🧪', type: 'potion', heal: 30, sell: 12, desc: 'Restores 30 hitpoints.' });
addItem('calming_tea', { name: 'Calming Tea', icon: '🍵', type: 'potion', sanity: 10, sell: 10, desc: 'Restores 10 sanity.' });
addItem('calming_elixir', { name: 'Calming Elixir', icon: '🧪', type: 'potion', sanity: 25, sell: 30, desc: 'Restores 25 sanity.' });
addItem('greater_healing', { name: 'Greater Healing Draught', icon: '🧪', type: 'potion', heal: 90, sell: 70, desc: 'Restores 90 hitpoints.' });
addItem('clarity_draught', { name: 'Draught of Clarity', icon: '🔮', type: 'potion', sanity: 50, sell: 110, desc: 'Restores 50 sanity.' });
addItem('elder_elixir', { name: 'Elixir of the Elders', icon: '✨', type: 'potion', heal: 200, sanity: 100, sell: 600, desc: 'Restores 200 hitpoints and all sanity.' });

// --- Occult ---
addItem('whispering_fragment', { name: 'Whispering Fragment', icon: '📜', sell: 5, desc: 'A scrap of parchment. The words move when you are not looking.' });
addItem('cultist_text', { name: 'Cultist Text', icon: '📕', sell: 30, desc: 'Prayers to something that sleeps beneath the sea.' });
addItem('necronomicon_page', { name: 'Necronomicon Page', icon: '📖', sell: 150, desc: 'Whoever reads it can never stop knowing what they learned.' });

// --- Tools and travel gear ---
const TOOLS = {
  woodcutting: ['hatchet', 'steel_hatchet', 'runed_hatchet'],
  fishing: ['fishing_rod', 'whalebone_rod', 'deepling_rod'],
  mining: ['pickaxe', 'adamantine_pickaxe', 'star_pickaxe'],
  foraging: ['sickle', 'silver_sickle', 'moon_sickle'],
};
const TOOL_SPEEDUP = [0, 0.15, 0.3];
const TOOL_INFO = {
  hatchet: ['Hatchet', '🪓', 8], steel_hatchet: ['Steel Hatchet', '🪓', 600], runed_hatchet: ['Runed Hatchet', '🪓', 8000],
  fishing_rod: ['Fishing Rod', '🎣', 8], whalebone_rod: ['Whalebone Rod', '🎣', 600], deepling_rod: ['Deepling Rod', '🎣', 8000],
  pickaxe: ['Pickaxe', '⛏️', 8], adamantine_pickaxe: ['Adamantine Pickaxe', '⛏️', 600], star_pickaxe: ['Star Pickaxe', '⛏️', 8000],
  sickle: ['Sickle', '🌙', 8], silver_sickle: ['Silver Sickle', '🌙', 600], moon_sickle: ['Moon Sickle', '🌙', 8000],
};
for (const [skill, tiers] of Object.entries(TOOLS)) {
  tiers.forEach((id, tier) => {
    const [name, icon, sell] = TOOL_INFO[id];
    const speed = TOOL_SPEEDUP[tier] ? ` Works ${TOOL_SPEEDUP[tier] * 100}% faster.` : '';
    addItem(id, { name, icon, type: 'tool', toolFor: skill, tier, sell, desc: `Lets you practise ${SKILLS[skill].name} when carried.${speed}` });
  });
}
addItem('tinderbox', { name: 'Tinderbox', icon: '🔥', type: 'tool', sell: 5, desc: 'Lets you light a fire and cook anywhere.' });
addItem('alchemy_kit', { name: 'Travelling Alchemy Kit', icon: '⚗️', type: 'tool', sell: 400, desc: 'Lets you brew potions anywhere.' });
addItem('lantern', { name: 'Hooded Lantern', icon: '🏮', type: 'tool', sell: 30, desc: 'Required to descend into the Drowned Catacombs.' });
addItem('diving_helm', { name: 'Diving Helm', icon: '🤿', type: 'tool', sell: 800, desc: 'An adamantine helm with glass eyes. Required to descend into the Abyss.' });

// --- Equipment ---
addItem('rusty_dagger', { name: 'Rusty Dagger', icon: '🗡️', type: 'equipment', slot: 'weapon', speed: 2000, dice: '1d4', stats: {}, sell: 1, desc: 'Better than nothing.' });

// hit: bonus to attack rolls. dmg: bonus to damage. ac: armour class. ward: bonus to sanity saves.
const GEAR_TIERS = [
  { key: 'iron', prefix: 'Iron', bar: 'iron_bar', smith: 1, req: 1, hit: 1, dice: '1d8', dmg: 0, helm: 1, body: 2, xp: 12, station: 'forge' },
  { key: 'silver', prefix: 'Silver', bar: 'silver_bar', smith: 8, req: 5, hit: 2, dice: '1d8', dmg: 1, helm: 1, body: 3, xp: 28, station: 'forge' },
  { key: 'blackiron', prefix: 'Blackiron', bar: 'blackiron_bar', smith: 15, req: 13, hit: 3, dice: '1d10', dmg: 2, helm: 2, body: 4, xp: 50, station: 'forge' },
  { key: 'adamantine', prefix: 'Adamantine', bar: 'adamantine_bar', smith: 25, req: 23, hit: 4, dice: '2d6', dmg: 3, helm: 2, body: 5, xp: 90, station: 'forge' },
  { key: 'starmetal', prefix: 'Starmetal', bar: 'starmetal_bar', smith: 38, req: 35, hit: 5, dice: '2d8', dmg: 5, helm: 3, body: 6, xp: 160, station: 'star_forge' },
];
const GEAR_PIECES = [
  { key: 'sword', suffix: 'Sword', slot: 'weapon', icon: '⚔️', bars: 2, smithOffset: 1, stats: t => ({ hit: t.hit, dmg: t.dmg }) },
  { key: 'helm', suffix: 'Helm', slot: 'head', icon: '⛑️', bars: 1, smithOffset: 0, stats: t => ({ ac: t.helm }) },
  { key: 'chainmail', suffix: 'Chainmail', slot: 'body', icon: '🦺', bars: 3, smithOffset: 2, stats: t => ({ ac: t.body }) },
];
for (const t of GEAR_TIERS) {
  for (const p of GEAR_PIECES) {
    addItem(`${t.key}_${p.key}`, {
      name: `${t.prefix} ${p.suffix}`,
      icon: p.icon,
      type: 'equipment',
      slot: p.slot,
      speed: p.slot === 'weapon' ? 2400 : undefined,
      dice: p.slot === 'weapon' ? t.dice : undefined,
      stats: p.stats(t),
      req: { combat: t.req },
      sell: Math.round(ITEMS[t.bar].sell * p.bars * 1.5),
    });
  }
}

addItem('rune_amulet', { name: 'Rune Amulet', icon: '📿', type: 'equipment', slot: 'amulet', stats: { ac: 1, ward: 2 }, req: { occultism: 5 }, sell: 40, desc: 'Warding runes carved in twisted oak.' });
addItem('elder_sign', { name: 'The Elder Sign', icon: '⭐', type: 'equipment', slot: 'amulet', stats: { hit: 1, ac: 1, ward: 4 }, req: { occultism: 20 }, sell: 300, desc: 'A five-pointed star with a flaming eye. That Which Sleeps dislikes it.' });
addItem('star_seal', { name: 'The Star Seal', icon: '🌟', type: 'equipment', slot: 'amulet', stats: { hit: 2, dmg: 2, ac: 2, ward: 7 }, req: { occultism: 40 }, sell: 2500, desc: 'Woven from starmetal and forbidden words.' });
addItem('deepling_trident', { name: 'Deepling Trident', icon: '🔱', type: 'equipment', slot: 'weapon', speed: 2600, dice: '2d6', stats: { hit: 3, dmg: 4 }, req: { combat: 20 }, sell: 900, desc: 'Scaled and wet. Always wet.' });
addItem('bone_crown', { name: "Ghoul's Bone Crown", icon: '👑', type: 'equipment', slot: 'head', stats: { ac: 2, dmg: 1 }, req: { combat: 10 }, sell: 250, desc: 'Gnawed finger bones, bound with sinew.' });
addItem('mi_go_cylinder', { name: 'Mi-Go Cylinder', icon: '🧠', type: 'equipment', slot: 'amulet', stats: { hit: 2, ward: 5 }, req: { occultism: 25 }, sell: 1500, desc: 'A metal canister. Something inside is thinking.' });
addItem('dagon_scale', { name: 'Dagon Scale Armour', icon: '🐉', type: 'equipment', slot: 'body', stats: { ac: 7, ward: 2 }, req: { combat: 32 }, sell: 6000, desc: 'Scales from Father Dagon himself.' });

// --- Bags (worn on the back, add pack slots) ---
addItem('leather_backpack', { name: 'Leather Backpack', icon: '🎒', type: 'equipment', slot: 'back', stats: { slots: 6 }, sell: 50, desc: '+6 pack slots.' });
addItem('explorers_pack', { name: "Explorer's Pack", icon: '🎒', type: 'equipment', slot: 'back', stats: { slots: 12 }, sell: 1000, desc: '+12 pack slots.' });
addItem('bag_of_holding', { name: 'Bag of Holding', icon: '👜', type: 'equipment', slot: 'back', stats: { slots: 30 }, sell: 10000, desc: 'Bigger on the inside. Do not put your head in it. +30 pack slots.' });

// --- Actions per skill ---
// Gathering actions are available where a location lists them; production actions need a station.
const ACTIONS = {
  woodcutting: [
    { id: 'ash', name: 'Ash Tree', level: 1, xp: 10, time: 3000, output: { ash_logs: 1 } },
    { id: 'twisted_oak', name: 'Twisted Oak', level: 5, xp: 22, time: 4000, output: { twisted_oak_logs: 1 } },
    { id: 'grave_pine', name: 'Grave Pine', level: 12, xp: 40, time: 5000, output: { grave_pine_logs: 1 } },
    { id: 'shadowbark', name: 'Shadowbark Tree', level: 20, xp: 65, time: 6000, output: { shadowbark_logs: 1 } },
    { id: 'pale_tree', name: 'Pale Tree', level: 30, xp: 105, time: 7500, output: { pale_logs: 1 } },
    { id: 'dream_tree', name: 'Dream Tree', level: 40, xp: 170, time: 9000, output: { dream_logs: 1 }, bonus: [{ item: 'whispering_fragment', chance: 0.05, qty: 1 }] },
  ],
  fishing: FISH.map(([id, name, level, xp, time]) => ({
    id, name, level, xp, time, output: { ['raw_' + id]: 1 },
    bonus: level >= 25 ? [{ item: 'whispering_fragment', chance: 0.03, qty: 1 }] : undefined,
  })),
  mining: [
    { id: 'iron', name: 'Iron Vein', level: 1, xp: 10, time: 3000, output: { iron_ore: 1 } },
    { id: 'silver', name: 'Silver Vein', level: 8, xp: 25, time: 4000, output: { silver_ore: 1 } },
    { id: 'blackiron', name: 'Blackiron Vein', level: 15, xp: 45, time: 5000, output: { blackiron_ore: 1 } },
    { id: 'adamantine', name: 'Adamantine Vein', level: 25, xp: 80, time: 6500, output: { adamantine_ore: 1 } },
    { id: 'starmetal', name: 'The Fallen Star', level: 38, xp: 140, time: 8500, output: { starmetal_ore: 1 } },
  ],
  foraging: [
    { id: 'grave_moss', name: 'Grave Moss', level: 1, xp: 10, time: 3000, output: { grave_moss: 1 } },
    { id: 'pale_wort', name: 'Pale Wort', level: 8, xp: 24, time: 3500, output: { pale_wort: 1 } },
    { id: 'nightshade', name: 'Nightshade', level: 15, xp: 42, time: 4500, output: { nightshade: 1 } },
    { id: 'dream_poppy', name: 'Dream Poppy', level: 25, xp: 70, time: 5500, output: { dream_poppy: 1 } },
    { id: 'star_rose', name: 'Star Rose', level: 35, xp: 120, time: 7000, output: { star_rose: 1 } },
  ],
  cooking: FISH.map(([id, name, level, xp]) => ({
    id, name: 'Cook ' + name, level, xp: Math.round(xp * 0.9), time: 2500, station: 'fire',
    input: { ['raw_' + id]: 1 }, output: { [id]: 1 },
  })),
  smithing: [
    { id: 'smelt_iron', name: 'Smelt Iron', level: 1, xp: 8, time: 2500, station: 'forge', input: { iron_ore: 2, ash_logs: 1 }, output: { iron_bar: 1 } },
    { id: 'smelt_silver', name: 'Smelt Silver', level: 8, xp: 18, time: 3000, station: 'forge', input: { silver_ore: 2, twisted_oak_logs: 1 }, output: { silver_bar: 1 } },
    { id: 'smelt_blackiron', name: 'Smelt Blackiron', level: 15, xp: 32, time: 3500, station: 'forge', input: { blackiron_ore: 2, grave_pine_logs: 1 }, output: { blackiron_bar: 1 } },
    { id: 'smelt_adamantine', name: 'Smelt Adamantine', level: 25, xp: 55, time: 4000, station: 'forge', input: { adamantine_ore: 2, shadowbark_logs: 1 }, output: { adamantine_bar: 1 } },
    { id: 'smelt_starmetal', name: 'Smelt Starmetal', level: 38, xp: 95, time: 5000, station: 'star_forge', input: { starmetal_ore: 2, pale_logs: 1 }, output: { starmetal_bar: 1 } },
    { id: 'diving_helm', name: 'Forge Diving Helm', level: 28, xp: 400, time: 6000, station: 'forge', input: { adamantine_bar: 4, silver_bar: 2 }, output: { diving_helm: 1 } },
    ...GEAR_TIERS.flatMap(t => GEAR_PIECES.map(p => ({
      id: `${t.key}_${p.key}`,
      name: 'Forge ' + ITEMS[`${t.key}_${p.key}`].name,
      level: Math.min(50, t.smith + p.smithOffset),
      xp: t.xp * p.bars,
      time: 3000 + p.bars * 500,
      station: t.station,
      input: { [t.bar]: p.bars },
      output: { [`${t.key}_${p.key}`]: 1 },
    }))),
  ].sort((a, b) => a.level - b.level),
  alchemy: [
    { id: 'healing_draught', name: 'Healing Draught', level: 1, xp: 12, time: 3000, station: 'lab', input: { grave_moss: 2 }, output: { healing_draught: 1 } },
    { id: 'calming_elixir', name: 'Calming Elixir', level: 8, xp: 30, time: 3500, station: 'lab', input: { pale_wort: 2 }, output: { calming_elixir: 1 } },
    { id: 'greater_healing', name: 'Greater Healing Draught', level: 15, xp: 55, time: 4000, station: 'lab', input: { nightshade: 2, pale_eel: 1 }, output: { greater_healing: 1 } },
    { id: 'clarity_draught', name: 'Draught of Clarity', level: 25, xp: 95, time: 4500, station: 'lab', input: { dream_poppy: 2, whispering_fragment: 2 }, output: { clarity_draught: 1 } },
    { id: 'elder_elixir', name: 'Elixir of the Elders', level: 38, xp: 200, time: 6000, station: 'lab', input: { star_rose: 2, starmetal_bar: 1 }, output: { elder_elixir: 1 } },
  ],
  occultism: [
    { id: 'whispers', name: 'Listen to the Whispers', level: 1, xp: 9, time: 3000, station: 'shore', sanityCost: 2, output: { whispering_fragment: 1 }, desc: 'Sit at the water’s edge and listen.' },
    { id: 'rune_amulet', name: 'Carve a Rune Amulet', level: 5, xp: 45, time: 5000, station: 'library', sanityCost: 3, input: { whispering_fragment: 5, twisted_oak_logs: 2 }, output: { rune_amulet: 1 } },
    { id: 'cultist_text', name: 'Study Cultist Texts', level: 12, xp: 70, time: 5000, station: 'library', sanityCost: 8, input: { cultist_text: 1 }, output: { whispering_fragment: 4 } },
    { id: 'elder_sign', name: 'Shape the Elder Sign', level: 20, xp: 220, time: 8000, station: 'library', sanityCost: 10, input: { whispering_fragment: 12, silver_bar: 3 }, output: { elder_sign: 1 } },
    { id: 'necronomicon', name: 'Read from the Necronomicon', level: 30, xp: 260, time: 7000, station: 'library', sanityCost: 20, input: { necronomicon_page: 1 }, output: { whispering_fragment: 10 } },
    { id: 'star_seal', name: 'Weave the Star Seal', level: 40, xp: 900, time: 12000, station: 'altar', sanityCost: 30, input: { whispering_fragment: 40, starmetal_bar: 3 }, output: { star_seal: 1 } },
  ],
};

// --- Monsters ---
// --- Monsters ---
// ac: armour class. hit: attack bonus. dmg: damage dice. eldritch: sanity save DC and sanity lost on a failed save.
const MONSTERS = {
  giant_crab: { name: 'Giant Crab', icon: '🦀', hp: 12, ac: 10, hit: 2, dmg: '1d3', speed: 3000, xp: 8, gold: [1, 5], drops: [{ item: 'raw_shrimp', chance: 0.5, qty: [1, 3] }] },
  deepling_spawn: { name: 'Deepling Spawn', icon: '🐸', eldritch: { dc: 9, loss: 2 }, hp: 20, ac: 11, hit: 3, dmg: '1d4', speed: 2800, xp: 14, gold: [3, 8], drops: [{ item: 'whispering_fragment', chance: 0.2, qty: [1, 1] }, { item: 'raw_pale_eel', chance: 0.3, qty: [1, 2] }] },
  smuggler: { name: 'Smuggler', icon: '🏴‍☠️', hp: 30, ac: 12, hit: 4, dmg: '1d6', speed: 2600, xp: 20, gold: [8, 20], drops: [{ item: 'bread', chance: 0.5, qty: [1, 3] }, { item: 'iron_bar', chance: 0.15, qty: [1, 2] }, { item: 'calming_tea', chance: 0.1, qty: [1, 1] }] },
  dire_wolf: { name: 'Dire Wolf', icon: '🐺', hp: 40, ac: 12, hit: 5, dmg: '1d6+1', speed: 2400, xp: 28, gold: [2, 10], drops: [{ item: 'leather_backpack', chance: 0.01, qty: [1, 1] }] },
  skeleton: { name: 'Skeleton Warrior', icon: '💀', hp: 55, ac: 13, hit: 5, dmg: '1d6+1', speed: 2600, xp: 38, gold: [10, 30], drops: [{ item: 'iron_bar', chance: 0.3, qty: [1, 3] }, { item: 'silver_ore', chance: 0.2, qty: [1, 3] }] },
  ghoul: { name: 'Ghoul', icon: '🧟', eldritch: { dc: 11, loss: 3 }, hp: 65, ac: 12, hit: 6, dmg: '1d8+1', speed: 2800, xp: 46, gold: [12, 35], drops: [{ item: 'grave_moss', chance: 0.4, qty: [2, 5] }, { item: 'bone_crown', chance: 0.01, qty: [1, 1] }] },
  cultist_novice: { name: 'Cultist Novice', icon: '🧙', eldritch: { dc: 12, loss: 3 }, hp: 60, ac: 12, hit: 6, dmg: '1d8+1', speed: 2400, xp: 48, gold: [15, 40], drops: [{ item: 'cultist_text', chance: 0.25, qty: [1, 1] }, { item: 'calming_tea', chance: 0.15, qty: [1, 2] }] },
  duergar: { name: 'Duergar Raider', icon: '⛏️', hp: 90, ac: 15, hit: 7, dmg: '1d10+1', speed: 2600, xp: 65, gold: [30, 60], drops: [{ item: 'blackiron_ore', chance: 0.4, qty: [2, 4] }, { item: 'adamantine_ore', chance: 0.08, qty: [1, 2] }] },
  deepling: { name: 'Deepling', icon: '🐟', eldritch: { dc: 12, loss: 4 }, hp: 110, ac: 14, hit: 8, dmg: '2d6', speed: 2800, xp: 80, gold: [30, 70], drops: [{ item: 'raw_squidling', chance: 0.3, qty: [1, 3] }, { item: 'deepling_trident', chance: 0.005, qty: [1, 1] }] },
  cultist_priest: { name: 'Cultist Priest', icon: '🕯️', eldritch: { dc: 13, loss: 5 }, hp: 100, ac: 13, hit: 8, dmg: '2d6+2', speed: 2600, xp: 90, gold: [40, 90], drops: [{ item: 'cultist_text', chance: 0.5, qty: [1, 2] }, { item: 'necronomicon_page', chance: 0.02, qty: [1, 1] }] },
  shoggoth_larva: { name: 'Shoggoth Larva', icon: '🫧', eldritch: { dc: 14, loss: 5 }, hp: 160, ac: 12, hit: 8, dmg: '2d6+1', speed: 3000, xp: 110, gold: [30, 80], drops: [{ item: 'nightshade', chance: 0.3, qty: [2, 4] }, { item: 'blackiron_bar', chance: 0.2, qty: [1, 2] }] },
  mi_go: { name: 'Mi-Go', icon: '🦟', eldritch: { dc: 14, loss: 5 }, hp: 180, ac: 16, hit: 10, dmg: '2d8', speed: 2600, xp: 150, gold: [70, 150], drops: [{ item: 'starmetal_ore', chance: 0.25, qty: [1, 2] }, { item: 'mi_go_cylinder', chance: 0.005, qty: [1, 1] }] },
  colour: { name: 'The Colour Out of Space', icon: '🌈', eldritch: { dc: 16, loss: 6 }, hp: 220, ac: 15, hit: 10, dmg: '2d8+1', speed: 2800, xp: 170, gold: [80, 170], drops: [{ item: 'dream_poppy', chance: 0.3, qty: [2, 4] }, { item: 'adamantine_bar', chance: 0.15, qty: [1, 2] }] },
  byakhee: { name: 'Byakhee', icon: '🦇', eldritch: { dc: 15, loss: 5 }, hp: 200, ac: 15, hit: 11, dmg: '2d8+1', speed: 2400, xp: 180, gold: [80, 160], drops: [{ item: 'necronomicon_page', chance: 0.05, qty: [1, 1] }, { item: 'clarity_draught', chance: 0.08, qty: [1, 1] }, { item: 'bag_of_holding', chance: 0.002, qty: [1, 1] }] },
  nightgaunt: { name: 'Nightgaunt', icon: '👤', eldritch: { dc: 16, loss: 6 }, hp: 300, ac: 18, hit: 12, dmg: '3d6+2', speed: 2600, xp: 260, gold: [150, 300], drops: [{ item: 'star_rose', chance: 0.25, qty: [1, 3] }, { item: 'necronomicon_page', chance: 0.08, qty: [1, 1] }] },
  star_spawn: { name: 'Star Spawn', icon: '🐙', eldritch: { dc: 17, loss: 7 }, hp: 450, ac: 19, hit: 13, dmg: '3d8+2', speed: 2800, xp: 380, gold: [200, 400], drops: [{ item: 'raw_leviathan_spawn', chance: 0.3, qty: [1, 3] }, { item: 'starmetal_bar', chance: 0.15, qty: [1, 2] }] },
  dagon: { name: 'Father Dagon', icon: '🔱', boss: true, eldritch: { dc: 18, loss: 9 }, hp: 900, ac: 20, hit: 15, dmg: '4d8+2', speed: 3000, xp: 1000, gold: [1000, 2500], drops: [{ item: 'dagon_scale', chance: 0.05, qty: [1, 1] }, { item: 'elder_elixir', chance: 0.3, qty: [1, 2] }, { item: 'necronomicon_page', chance: 0.5, qty: [1, 3] }, { item: 'bag_of_holding', chance: 0.05, qty: [1, 1] }] },
};

// --- Shops ---
const SHOPS = {
  general_store: {
    name: "Marsh's General Store",
    keeper: 'Old Obed Marsh never looks up from his ledger. There is webbing between his fingers.',
    stock: [
      { item: 'bread', price: 5 }, { item: 'calming_tea', price: 40 }, { item: 'hatchet', price: 25 },
      { item: 'fishing_rod', price: 25 }, { item: 'sickle', price: 25 }, { item: 'tinderbox', price: 30 },
      { item: 'lantern', price: 120 }, { item: 'leather_backpack', price: 250 }, { item: 'whalebone_rod', price: 3000 },
      { item: 'deepling_rod', price: 40000 },
    ],
  },
  smithy: {
    name: 'Stonebeard Smithy',
    keeper: 'The dwarf Brunhild Stonebeard hammers without pause. "Pay first. Ask later. Never ask about the deep tunnels."',
    stock: [
      { item: 'pickaxe', price: 30 }, { item: 'hatchet', price: 30 }, { item: 'iron_sword', price: 150 },
      { item: 'iron_helm', price: 80 }, { item: 'iron_chainmail', price: 220 }, { item: 'steel_hatchet', price: 3000 },
      { item: 'adamantine_pickaxe', price: 3000 }, { item: 'explorers_pack', price: 5000 },
      { item: 'runed_hatchet', price: 40000 }, { item: 'star_pickaxe', price: 40000 },
    ],
  },
  apothecary: {
    name: 'Abbey Apothecary',
    keeper: 'Brother Ambrose has taken a vow of silence. He points at prices with a trembling finger.',
    stock: [
      { item: 'healing_draught', price: 60 }, { item: 'calming_tea', price: 35 }, { item: 'calming_elixir', price: 120 },
      { item: 'sickle', price: 25 }, { item: 'alchemy_kit', price: 1500 }, { item: 'silver_sickle', price: 3000 },
      { item: 'moon_sickle', price: 40000 },
    ],
  },
};

// --- World map ---
// x/y are coordinates on a 1000 × 700 map. Gathering lists what can be gathered at each place.
const LOCATIONS = {
  saltmire: {
    name: 'Saltmire', kind: 'town', icon: '🏘️', x: 650, y: 410,
    desc: 'A crooked fishing town of slate roofs and shuttered windows. The townsfolk have wide, unblinking eyes and do not like questions.',
    bank: true, shop: 'general_store', inn: 'The Drowned Lantern Inn', stations: ['fire'],
    gather: { fishing: ['shrimp'] },
  },
  saltmire_shore: {
    name: 'Saltmire Shore', kind: 'wild', icon: '🌊', x: 790, y: 470,
    desc: 'Fog lies thick over the kelp banks. The fishermen say something crawls out of the water at night.',
    stations: ['shore'], gather: { fishing: ['shrimp', 'pale_eel', 'deep_cod'], foraging: ['grave_moss'] },
    monsters: ['giant_crab', 'deepling_spawn', 'smuggler'],
  },
  drowned_catacombs: {
    name: 'The Drowned Catacombs', kind: 'dungeon', icon: '🏛️', x: 600, y: 540,
    desc: 'Beneath Saltmire’s temple, stairs lead down into water. The hymns sung below are not sung by human throats.',
    monsters: ['deepling', 'cultist_priest', 'shoggoth_larva'],
  },
  devils_reef: {
    name: "Devil's Reef", kind: 'wild', icon: '🪸', x: 900, y: 530,
    desc: 'A black reef a mile out to sea. On moonless nights, lights move beneath the waves around it.',
    stations: ['shore'], gather: { fishing: ['squidling', 'drowned_salmon', 'abyssal_catfish', 'leviathan_spawn'] },
  },
  the_abyss: {
    name: 'The Abyss', kind: 'dungeon', icon: '🌀', x: 860, y: 625,
    desc: 'The sunken city, where the angles are wrong and the Dreamer waits.',
    monsters: ['star_spawn', 'dagon'],
  },
  blackwood: {
    name: 'The Blackwood', kind: 'wild', icon: '🌲', x: 470, y: 340,
    desc: 'An old forest where the light turns green and the birds have stopped singing.',
    gather: { woodcutting: ['ash', 'twisted_oak', 'grave_pine'], foraging: ['grave_moss', 'pale_wort'] },
    monsters: ['dire_wolf'],
  },
  graveyard: {
    name: 'Blackwood Graveyard', kind: 'wild', icon: '🪦', x: 370, y: 220,
    desc: 'The headstones lean as if something dug beneath them. Cultists have been seen lighting candles among the barrows.',
    gather: { woodcutting: ['shadowbark'], foraging: ['nightshade'] },
    monsters: ['skeleton', 'ghoul', 'cultist_novice'],
  },
  silent_abbey: {
    name: 'The Silent Abbey', kind: 'town', icon: '⛪', x: 560, y: 150,
    desc: 'Monks of the Silent Order guard a library of books that should have been burned. They rarely speak, and never about the third cellar.',
    shop: 'apothecary', inn: 'the abbey guest cells', stations: ['fire', 'lab', 'library'],
    gather: { foraging: ['pale_wort'] },
  },
  ironhold: {
    name: 'Ironhold', kind: 'town', icon: '🏰', x: 290, y: 460,
    desc: 'A dwarven hold carved into the mountainside. The forges never go cold, and the dwarves never go too deep. Not any more.',
    bank: true, shop: 'smithy', inn: 'the Anvil & Ale', stations: ['fire', 'forge'],
    gather: { mining: ['iron'] },
  },
  deep_mines: {
    name: 'The Deep Mines', kind: 'wild', icon: '🕳️', x: 150, y: 570,
    desc: 'Abandoned tunnels below Ironhold. The dwarves sealed the lowest shaft and will not say why.',
    gather: { mining: ['iron', 'silver', 'blackiron', 'adamantine'] },
    monsters: ['duergar'],
  },
  crater: {
    name: 'Crater of the Fallen Star', kind: 'wild', icon: '☄️', x: 220, y: 120,
    desc: 'The grass around the crater has a colour that does not exist. Wings buzz overhead. At its heart, the star still glows hot enough to forge.',
    stations: ['star_forge'], gather: { mining: ['starmetal'], woodcutting: ['pale_tree'], foraging: ['dream_poppy'] },
    monsters: ['mi_go', 'colour', 'byakhee'],
  },
  dreaming_grove: {
    name: 'The Dreaming Grove', kind: 'wild', icon: '🌳', x: 115, y: 290,
    desc: 'Trees from another world grow in a circle around a monolith of black stone. Time moves strangely here.',
    stations: ['altar'], gather: { woodcutting: ['dream_tree'], foraging: ['star_rose'] },
    monsters: ['nightgaunt'],
  },
};

// Roads between locations. time is in seconds. req: items you must carry. cost: gold paid per trip.
const ROADS = [
  { a: 'saltmire', b: 'saltmire_shore', time: 10 },
  { a: 'saltmire', b: 'drowned_catacombs', time: 8, req: ['lantern'] },
  { a: 'saltmire', b: 'blackwood', time: 15 },
  { a: 'saltmire_shore', b: 'devils_reef', time: 25, cost: 50, note: 'The ferryman takes 50 gold.' },
  { a: 'devils_reef', b: 'the_abyss', time: 30, req: ['diving_helm'] },
  { a: 'blackwood', b: 'graveyard', time: 12 },
  { a: 'blackwood', b: 'ironhold', time: 20 },
  { a: 'blackwood', b: 'silent_abbey', time: 18 },
  { a: 'graveyard', b: 'silent_abbey', time: 15 },
  { a: 'graveyard', b: 'crater', time: 25 },
  { a: 'crater', b: 'dreaming_grove', time: 20 },
  { a: 'ironhold', b: 'deep_mines', time: 12 },
  { a: 'ironhold', b: 'crater', time: 35 },
];

const START_LOCATION = 'saltmire';
const BASE_PACK_SLOTS = 12;

const MAX_LEVEL = 50;

const SLOTS = { weapon: 'Weapon', head: 'Head', body: 'Body', amulet: 'Amulet', back: 'Back' };

const LORE = [
  'The Kingdom of Aldmark was once a land of knights and wizards, and of gods who answered when you prayed. Then the star fell.',
  'It struck the Blackwood three generations ago. That same night the sea drew back from Saltmire harbour, and when it returned it was blacker than before. The fishermen began to haul up catches with too many eyes. The priests stopped hearing their gods, and soon other voices were answering instead.',
  'You arrive in Saltmire with a rusty dagger, a hatchet, a fishing rod and a few loaves of bread. The townsfolk say that something sleeps beneath the sea, something older than the gods, and that it dreams. They say its dreams are seeping up to us.',
  'Travel the land, gather, craft and fight. Grow strong enough to descend into the Abyss. But guard your sanity: what waits down there does not care about your body. It is your mind it wants.',
];
