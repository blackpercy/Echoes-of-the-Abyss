// Game data for Echoes of the Abyss: skills, items, actions, monsters, locations and the world map.

const SKILLS = {
  woodcutting: { name: 'Woodcutting', icon: '🪓', type: 'gathering', desc: 'Fell the trees of the Blackwood, whose roots drink from old graves.' },
  fishing: { name: 'Fishing', icon: '🎣', type: 'gathering', desc: 'Haul up what swims in the black waters off Saltmire. Some catches stare back.' },
  mining: { name: 'Mining', icon: '⛏️', type: 'gathering', desc: 'Break ore from the mountains, and from the star that fell beyond the forest.' },
  foraging: { name: 'Foraging', icon: '🌿', type: 'gathering', desc: 'Gather herbs that grow where the moonlight never reaches.' },
  cooking: { name: 'Cooking', icon: '🍲', type: 'production', desc: 'Cook your catch. A warm meal holds body and mind together.' },
  smithing: { name: 'Smithing', icon: '⚒️', type: 'production', desc: 'Smelt ore into bars and forge weapons and armour.' },
  alchemy: { name: 'Alchemy', icon: '⚗️', type: 'production', desc: 'Brew draughts that mend wounds and steady a shaken mind.' },
  occultism: { name: 'Occultism', icon: '👁️', type: 'production', desc: 'Study forbidden lore. Every insight costs a piece of your sanity, but grants power over things that should not be.' },
  attack: { name: 'Attack', icon: '⚔️', type: 'combat', desc: 'Accuracy in combat. Required for better weapons.' },
  strength: { name: 'Strength', icon: '💪', type: 'combat', desc: 'Increases your maximum hit.' },
  defence: { name: 'Defence', icon: '🛡️', type: 'combat', desc: 'Makes you harder to hit. Required for better armour.' },
  hitpoints: { name: 'Hitpoints', icon: '❤️', type: 'combat', desc: 'Each level grants 10 hitpoints.' },
};

const SKILL_GROUPS = [
  { name: 'Gathering', skills: ['woodcutting', 'fishing', 'mining', 'foraging'] },
  { name: 'Crafting', skills: ['cooking', 'smithing', 'alchemy', 'occultism'] },
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
  ['shrimp', 'Shrimp', 1, 10, 3000, 2, 30, '🦐'],
  ['pale_eel', 'Pale Eel', 10, 20, 3500, 5, 50, '🐍'],
  ['deep_cod', 'Deep Cod', 20, 32, 4000, 12, 80, '🐟'],
  ['squidling', 'Squidling', 35, 50, 5000, 25, 120, '🦑'],
  ['drowned_salmon', 'Drowned Salmon', 50, 75, 6000, 45, 170, '🐟'],
  ['abyssal_catfish', 'Abyssal Catfish', 65, 110, 7000, 80, 230, '🐡'],
  ['leviathan_spawn', 'Leviathan Spawn', 85, 175, 9000, 150, 320, '🐙'],
];
for (const [id, name, , , , sell, heal, icon] of FISH) {
  addItem('raw_' + id, { name: 'Raw ' + name, icon, sell, desc: 'Must be cooked before it can be eaten.' });
  addItem(id, { name: 'Cooked ' + name, icon: '🍖', type: 'food', heal, sell: Math.round(sell * 1.6), desc: `Restores ${heal} hitpoints.` });
}
addItem('bread', { name: 'Coarse Bread', icon: '🍞', type: 'food', heal: 20, sell: 1, desc: 'Dry but filling. Restores 20 hitpoints.' });

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
addItem('healing_draught', { name: 'Healing Draught', icon: '🧪', type: 'potion', heal: 60, sell: 12, desc: 'Restores 60 hitpoints.' });
addItem('calming_tea', { name: 'Calming Tea', icon: '🍵', type: 'potion', sanity: 10, sell: 10, desc: 'Restores 10 sanity.' });
addItem('calming_elixir', { name: 'Calming Elixir', icon: '🧪', type: 'potion', sanity: 25, sell: 30, desc: 'Restores 25 sanity.' });
addItem('greater_healing', { name: 'Greater Healing Draught', icon: '🧪', type: 'potion', heal: 180, sell: 70, desc: 'Restores 180 hitpoints.' });
addItem('clarity_draught', { name: 'Draught of Clarity', icon: '🔮', type: 'potion', sanity: 50, sell: 110, desc: 'Restores 50 sanity.' });
addItem('elder_elixir', { name: 'Elixir of the Elders', icon: '✨', type: 'potion', heal: 400, sanity: 100, sell: 600, desc: 'Restores 400 hitpoints and all sanity.' });

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
addItem('rusty_dagger', { name: 'Rusty Dagger', icon: '🗡️', type: 'equipment', slot: 'weapon', speed: 2000, stats: { attack: 2, strength: 2 }, sell: 1, desc: 'Better than nothing.' });

const GEAR_TIERS = [
  { key: 'iron', prefix: 'Iron', bar: 'iron_bar', smith: 1, req: 1, atk: 8, str: 7, def: 6, xp: 12, station: 'forge' },
  { key: 'silver', prefix: 'Silver', bar: 'silver_bar', smith: 15, req: 10, atk: 16, str: 14, def: 12, xp: 28, station: 'forge' },
  { key: 'blackiron', prefix: 'Blackiron', bar: 'blackiron_bar', smith: 30, req: 25, atk: 30, str: 27, def: 22, xp: 50, station: 'forge' },
  { key: 'adamantine', prefix: 'Adamantine', bar: 'adamantine_bar', smith: 50, req: 45, atk: 50, str: 45, def: 38, xp: 90, station: 'forge' },
  { key: 'starmetal', prefix: 'Starmetal', bar: 'starmetal_bar', smith: 75, req: 70, atk: 80, str: 72, def: 60, xp: 160, station: 'star_forge' },
];
const GEAR_PIECES = [
  { key: 'sword', suffix: 'Sword', slot: 'weapon', icon: '⚔️', bars: 2, smithOffset: 2, stats: t => ({ attack: t.atk, strength: t.str }), reqSkill: 'attack' },
  { key: 'helm', suffix: 'Helm', slot: 'head', icon: '⛑️', bars: 1, smithOffset: 0, stats: t => ({ defence: Math.round(t.def * 0.5) }), reqSkill: 'defence' },
  { key: 'chainmail', suffix: 'Chainmail', slot: 'body', icon: '🦺', bars: 3, smithOffset: 4, stats: t => ({ defence: t.def }), reqSkill: 'defence' },
];
for (const t of GEAR_TIERS) {
  for (const p of GEAR_PIECES) {
    addItem(`${t.key}_${p.key}`, {
      name: `${t.prefix} ${p.suffix}`,
      icon: p.icon,
      type: 'equipment',
      slot: p.slot,
      speed: p.slot === 'weapon' ? 2400 : undefined,
      stats: p.stats(t),
      req: { [p.reqSkill]: t.req },
      sell: Math.round(ITEMS[t.bar].sell * p.bars * 1.5),
    });
  }
}

addItem('rune_amulet', { name: 'Rune Amulet', icon: '📿', type: 'equipment', slot: 'amulet', stats: { defence: 4, sanityResist: 0.1 }, req: { occultism: 10 }, sell: 40, desc: 'Warding runes carved in twisted oak.' });
addItem('elder_sign', { name: 'The Elder Sign', icon: '⭐', type: 'equipment', slot: 'amulet', stats: { attack: 10, defence: 10, sanityResist: 0.25 }, req: { occultism: 40 }, sell: 300, desc: 'A five-pointed star with a flaming eye. That Which Sleeps dislikes it.' });
addItem('star_seal', { name: 'The Star Seal', icon: '🌟', type: 'equipment', slot: 'amulet', stats: { attack: 25, strength: 20, defence: 20, sanityResist: 0.5 }, req: { occultism: 80 }, sell: 2500, desc: 'Woven from starmetal and forbidden words.' });
addItem('deepling_trident', { name: 'Deepling Trident', icon: '🔱', type: 'equipment', slot: 'weapon', speed: 2600, stats: { attack: 42, strength: 48 }, req: { attack: 40 }, sell: 900, desc: 'Scaled and wet. Always wet.' });
addItem('bone_crown', { name: "Ghoul's Bone Crown", icon: '👑', type: 'equipment', slot: 'head', stats: { defence: 16, strength: 4 }, req: { defence: 20 }, sell: 250, desc: 'Gnawed finger bones, bound with sinew.' });
addItem('mi_go_cylinder', { name: 'Mi-Go Cylinder', icon: '🧠', type: 'equipment', slot: 'amulet', stats: { attack: 15, sanityResist: 0.3 }, req: { occultism: 50 }, sell: 1500, desc: 'A metal canister. Something inside is thinking.' });
addItem('dagon_scale', { name: 'Dagon Scale Armour', icon: '🐉', type: 'equipment', slot: 'body', stats: { defence: 75, sanityResist: 0.15 }, req: { defence: 65 }, sell: 6000, desc: 'Scales from Father Dagon himself.' });

// --- Bags (worn on the back, add pack slots) ---
addItem('leather_backpack', { name: 'Leather Backpack', icon: '🎒', type: 'equipment', slot: 'back', stats: { slots: 6 }, sell: 50, desc: '+6 pack slots.' });
addItem('explorers_pack', { name: "Explorer's Pack", icon: '🎒', type: 'equipment', slot: 'back', stats: { slots: 12 }, sell: 1000, desc: '+12 pack slots.' });
addItem('bag_of_holding', { name: 'Bag of Holding', icon: '👜', type: 'equipment', slot: 'back', stats: { slots: 30 }, sell: 10000, desc: 'Bigger on the inside. Do not put your head in it. +30 pack slots.' });

// --- Actions per skill ---
// Gathering actions are available where a location lists them; production actions need a station.
const ACTIONS = {
  woodcutting: [
    { id: 'ash', name: 'Ash Tree', level: 1, xp: 10, time: 3000, output: { ash_logs: 1 } },
    { id: 'twisted_oak', name: 'Twisted Oak', level: 10, xp: 22, time: 4000, output: { twisted_oak_logs: 1 } },
    { id: 'grave_pine', name: 'Grave Pine', level: 25, xp: 40, time: 5000, output: { grave_pine_logs: 1 } },
    { id: 'shadowbark', name: 'Shadowbark Tree', level: 40, xp: 65, time: 6000, output: { shadowbark_logs: 1 } },
    { id: 'pale_tree', name: 'Pale Tree', level: 60, xp: 105, time: 7500, output: { pale_logs: 1 } },
    { id: 'dream_tree', name: 'Dream Tree', level: 80, xp: 170, time: 9000, output: { dream_logs: 1 }, bonus: [{ item: 'whispering_fragment', chance: 0.05, qty: 1 }] },
  ],
  fishing: FISH.map(([id, name, level, xp, time]) => ({
    id, name, level, xp, time, output: { ['raw_' + id]: 1 },
    bonus: level >= 50 ? [{ item: 'whispering_fragment', chance: 0.03, qty: 1 }] : undefined,
  })),
  mining: [
    { id: 'iron', name: 'Iron Vein', level: 1, xp: 10, time: 3000, output: { iron_ore: 1 } },
    { id: 'silver', name: 'Silver Vein', level: 15, xp: 25, time: 4000, output: { silver_ore: 1 } },
    { id: 'blackiron', name: 'Blackiron Vein', level: 30, xp: 45, time: 5000, output: { blackiron_ore: 1 } },
    { id: 'adamantine', name: 'Adamantine Vein', level: 50, xp: 80, time: 6500, output: { adamantine_ore: 1 } },
    { id: 'starmetal', name: 'The Fallen Star', level: 75, xp: 140, time: 8500, output: { starmetal_ore: 1 } },
  ],
  foraging: [
    { id: 'grave_moss', name: 'Grave Moss', level: 1, xp: 10, time: 3000, output: { grave_moss: 1 } },
    { id: 'pale_wort', name: 'Pale Wort', level: 15, xp: 24, time: 3500, output: { pale_wort: 1 } },
    { id: 'nightshade', name: 'Nightshade', level: 30, xp: 42, time: 4500, output: { nightshade: 1 } },
    { id: 'dream_poppy', name: 'Dream Poppy', level: 50, xp: 70, time: 5500, output: { dream_poppy: 1 } },
    { id: 'star_rose', name: 'Star Rose', level: 70, xp: 120, time: 7000, output: { star_rose: 1 } },
  ],
  cooking: FISH.map(([id, name, level, xp]) => ({
    id, name: 'Cook ' + name, level, xp: Math.round(xp * 0.9), time: 2500, station: 'fire',
    input: { ['raw_' + id]: 1 }, output: { [id]: 1 },
  })),
  smithing: [
    { id: 'smelt_iron', name: 'Smelt Iron', level: 1, xp: 8, time: 2500, station: 'forge', input: { iron_ore: 2, ash_logs: 1 }, output: { iron_bar: 1 } },
    { id: 'smelt_silver', name: 'Smelt Silver', level: 15, xp: 18, time: 3000, station: 'forge', input: { silver_ore: 2, twisted_oak_logs: 1 }, output: { silver_bar: 1 } },
    { id: 'smelt_blackiron', name: 'Smelt Blackiron', level: 30, xp: 32, time: 3500, station: 'forge', input: { blackiron_ore: 2, grave_pine_logs: 1 }, output: { blackiron_bar: 1 } },
    { id: 'smelt_adamantine', name: 'Smelt Adamantine', level: 50, xp: 55, time: 4000, station: 'forge', input: { adamantine_ore: 2, shadowbark_logs: 1 }, output: { adamantine_bar: 1 } },
    { id: 'smelt_starmetal', name: 'Smelt Starmetal', level: 75, xp: 95, time: 5000, station: 'star_forge', input: { starmetal_ore: 2, pale_logs: 1 }, output: { starmetal_bar: 1 } },
    { id: 'diving_helm', name: 'Forge Diving Helm', level: 55, xp: 400, time: 6000, station: 'forge', input: { adamantine_bar: 4, silver_bar: 2 }, output: { diving_helm: 1 } },
    ...GEAR_TIERS.flatMap(t => GEAR_PIECES.map(p => ({
      id: `${t.key}_${p.key}`,
      name: 'Forge ' + ITEMS[`${t.key}_${p.key}`].name,
      level: Math.min(99, t.smith + p.smithOffset),
      xp: t.xp * p.bars,
      time: 3000 + p.bars * 500,
      station: t.station,
      input: { [t.bar]: p.bars },
      output: { [`${t.key}_${p.key}`]: 1 },
    }))),
  ].sort((a, b) => a.level - b.level),
  alchemy: [
    { id: 'healing_draught', name: 'Healing Draught', level: 1, xp: 12, time: 3000, station: 'lab', input: { grave_moss: 2 }, output: { healing_draught: 1 } },
    { id: 'calming_elixir', name: 'Calming Elixir', level: 15, xp: 30, time: 3500, station: 'lab', input: { pale_wort: 2 }, output: { calming_elixir: 1 } },
    { id: 'greater_healing', name: 'Greater Healing Draught', level: 30, xp: 55, time: 4000, station: 'lab', input: { nightshade: 2, pale_eel: 1 }, output: { greater_healing: 1 } },
    { id: 'clarity_draught', name: 'Draught of Clarity', level: 50, xp: 95, time: 4500, station: 'lab', input: { dream_poppy: 2, whispering_fragment: 2 }, output: { clarity_draught: 1 } },
    { id: 'elder_elixir', name: 'Elixir of the Elders', level: 75, xp: 200, time: 6000, station: 'lab', input: { star_rose: 2, starmetal_bar: 1 }, output: { elder_elixir: 1 } },
  ],
  occultism: [
    { id: 'whispers', name: 'Listen to the Whispers', level: 1, xp: 9, time: 3000, station: 'shore', sanityCost: 2, output: { whispering_fragment: 1 }, desc: 'Sit at the water’s edge and listen.' },
    { id: 'rune_amulet', name: 'Carve a Rune Amulet', level: 10, xp: 45, time: 5000, station: 'library', sanityCost: 3, input: { whispering_fragment: 5, twisted_oak_logs: 2 }, output: { rune_amulet: 1 } },
    { id: 'cultist_text', name: 'Study Cultist Texts', level: 25, xp: 70, time: 5000, station: 'library', sanityCost: 8, input: { cultist_text: 1 }, output: { whispering_fragment: 4 } },
    { id: 'elder_sign', name: 'Shape the Elder Sign', level: 40, xp: 220, time: 8000, station: 'library', sanityCost: 10, input: { whispering_fragment: 12, silver_bar: 3 }, output: { elder_sign: 1 } },
    { id: 'necronomicon', name: 'Read from the Necronomicon', level: 60, xp: 260, time: 7000, station: 'library', sanityCost: 20, input: { necronomicon_page: 1 }, output: { whispering_fragment: 10 } },
    { id: 'star_seal', name: 'Weave the Star Seal', level: 80, xp: 900, time: 12000, station: 'altar', sanityCost: 30, input: { whispering_fragment: 40, starmetal_bar: 3 }, output: { star_seal: 1 } },
  ],
};

// --- Monsters ---
const MONSTERS = {
  giant_crab: { name: 'Giant Crab', icon: '🦀', hp: 35, attack: 1, defence: 1, maxHit: 5, speed: 3000, gold: [1, 5], drops: [{ item: 'raw_shrimp', chance: 0.5, qty: [1, 3] }] },
  deepling_spawn: { name: 'Deepling Spawn', icon: '🐸', eldritch: true, sanityDmg: 2, hp: 60, attack: 4, defence: 3, maxHit: 10, speed: 2800, gold: [3, 8], drops: [{ item: 'whispering_fragment', chance: 0.2, qty: [1, 1] }, { item: 'raw_pale_eel', chance: 0.3, qty: [1, 2] }] },
  smuggler: { name: 'Smuggler', icon: '🏴‍☠️', hp: 80, attack: 6, defence: 5, maxHit: 15, speed: 2600, gold: [8, 20], drops: [{ item: 'bread', chance: 0.5, qty: [1, 3] }, { item: 'iron_bar', chance: 0.15, qty: [1, 2] }, { item: 'calming_tea', chance: 0.1, qty: [1, 1] }] },
  dire_wolf: { name: 'Dire Wolf', icon: '🐺', hp: 110, attack: 10, defence: 8, maxHit: 18, speed: 2400, gold: [2, 10], drops: [{ item: 'leather_backpack', chance: 0.01, qty: [1, 1] }] },

  skeleton: { name: 'Skeleton Warrior', icon: '💀', hp: 150, attack: 15, defence: 15, maxHit: 25, speed: 2600, gold: [10, 30], drops: [{ item: 'iron_bar', chance: 0.3, qty: [1, 3] }, { item: 'silver_ore', chance: 0.2, qty: [1, 3] }] },
  ghoul: { name: 'Ghoul', icon: '🧟', eldritch: true, sanityDmg: 3, hp: 200, attack: 18, defence: 14, maxHit: 30, speed: 2800, gold: [12, 35], drops: [{ item: 'grave_moss', chance: 0.4, qty: [2, 5] }, { item: 'bone_crown', chance: 0.01, qty: [1, 1] }] },
  cultist_novice: { name: 'Cultist Novice', icon: '🧙', eldritch: true, sanityDmg: 4, hp: 170, attack: 20, defence: 12, maxHit: 28, speed: 2400, gold: [15, 40], drops: [{ item: 'cultist_text', chance: 0.25, qty: [1, 1] }, { item: 'calming_tea', chance: 0.15, qty: [1, 2] }] },
  duergar: { name: 'Duergar Raider', icon: '⛏️', hp: 280, attack: 28, defence: 30, maxHit: 40, speed: 2600, gold: [30, 60], drops: [{ item: 'blackiron_ore', chance: 0.4, qty: [2, 4] }, { item: 'adamantine_ore', chance: 0.08, qty: [1, 2] }] },

  deepling: { name: 'Deepling', icon: '🐟', eldritch: true, sanityDmg: 4, hp: 350, attack: 32, defence: 30, maxHit: 45, speed: 2800, gold: [30, 70], drops: [{ item: 'raw_squidling', chance: 0.3, qty: [1, 3] }, { item: 'deepling_trident', chance: 0.005, qty: [1, 1] }] },
  cultist_priest: { name: 'Cultist Priest', icon: '🕯️', eldritch: true, sanityDmg: 6, hp: 300, attack: 35, defence: 28, maxHit: 55, speed: 2600, gold: [40, 90], drops: [{ item: 'cultist_text', chance: 0.5, qty: [1, 2] }, { item: 'necronomicon_page', chance: 0.02, qty: [1, 1] }] },
  shoggoth_larva: { name: 'Shoggoth Larva', icon: '🫧', eldritch: true, sanityDmg: 7, hp: 500, attack: 30, defence: 35, maxHit: 50, speed: 3000, gold: [30, 80], drops: [{ item: 'nightshade', chance: 0.3, qty: [2, 4] }, { item: 'blackiron_bar', chance: 0.2, qty: [1, 2] }] },

  mi_go: { name: 'Mi-Go', icon: '🦟', eldritch: true, sanityDmg: 6, hp: 650, attack: 52, defence: 50, maxHit: 75, speed: 2600, gold: [70, 150], drops: [{ item: 'starmetal_ore', chance: 0.25, qty: [1, 2] }, { item: 'mi_go_cylinder', chance: 0.005, qty: [1, 1] }] },
  colour: { name: 'The Colour Out of Space', icon: '🌈', eldritch: true, sanityDmg: 9, hp: 800, attack: 55, defence: 60, maxHit: 70, speed: 2800, gold: [80, 170], drops: [{ item: 'dream_poppy', chance: 0.3, qty: [2, 4] }, { item: 'adamantine_bar', chance: 0.15, qty: [1, 2] }] },
  byakhee: { name: 'Byakhee', icon: '🦇', eldritch: true, sanityDmg: 7, hp: 700, attack: 58, defence: 52, maxHit: 85, speed: 2400, gold: [80, 160], drops: [{ item: 'necronomicon_page', chance: 0.05, qty: [1, 1] }, { item: 'clarity_draught', chance: 0.08, qty: [1, 1] }, { item: 'bag_of_holding', chance: 0.002, qty: [1, 1] }] },

  nightgaunt: { name: 'Nightgaunt', icon: '👤', eldritch: true, sanityDmg: 8, hp: 1100, attack: 72, defence: 75, maxHit: 100, speed: 2600, gold: [150, 300], drops: [{ item: 'star_rose', chance: 0.25, qty: [1, 3] }, { item: 'necronomicon_page', chance: 0.08, qty: [1, 1] }] },
  star_spawn: { name: 'Star Spawn', icon: '🐙', eldritch: true, sanityDmg: 10, hp: 1600, attack: 80, defence: 80, maxHit: 130, speed: 2800, gold: [200, 400], drops: [{ item: 'raw_leviathan_spawn', chance: 0.3, qty: [1, 3] }, { item: 'starmetal_bar', chance: 0.15, qty: [1, 2] }] },
  dagon: { name: 'Father Dagon', icon: '🔱', boss: true, eldritch: true, sanityDmg: 14, hp: 3500, attack: 92, defence: 90, maxHit: 160, speed: 3000, gold: [1000, 2500], drops: [{ item: 'dagon_scale', chance: 0.05, qty: [1, 1] }, { item: 'elder_elixir', chance: 0.3, qty: [1, 2] }, { item: 'necronomicon_page', chance: 0.5, qty: [1, 3] }, { item: 'bag_of_holding', chance: 0.05, qty: [1, 1] }] },
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

const SLOTS = { weapon: 'Weapon', head: 'Head', body: 'Body', amulet: 'Amulet', back: 'Back' };

const LORE = [
  'The Kingdom of Aldmark was once a land of knights and wizards, and of gods who answered when you prayed. Then the star fell.',
  'It struck the Blackwood three generations ago. That same night the sea drew back from Saltmire harbour, and when it returned it was blacker than before. The fishermen began to haul up catches with too many eyes. The priests stopped hearing their gods, and soon other voices were answering instead.',
  'You arrive in Saltmire with a rusty dagger, a hatchet, a fishing rod and a few loaves of bread. The townsfolk say that something sleeps beneath the sea, something older than the gods, and that it dreams. They say its dreams are seeping up to us.',
  'Travel the land, gather, craft and fight. Grow strong enough to descend into the Abyss. But guard your sanity: what waits down there does not care about your body. It is your mind it wants.',
];
