// Six more skills: Dreaming, Hunting, Archaeology, Carpentry, Stealth and Cartography.
// Data only; the rules that use it live in game.js, systems.js and perks.js.

Object.assign(SKILLS, {
  hunting: { name: 'Hunting', icon: '🦌', type: 'gathering', desc: 'Track game in the wild places, then tan the hides into light armour that lets you move freely.' },
  archaeology: { name: 'Archaeology', icon: '🏺', type: 'gathering', desc: 'Dig where older things were buried. Complete a collection of relics and its old power becomes yours.' },
  dreaming: { name: 'Dreaming', icon: '🌙', type: 'gathering', desc: 'Descend the Seventy Steps of Light Slumber into the Dreamlands. Light dreams soothe the mind; deep ones are only for the touched.' },
  carpentry: { name: 'Carpentry', icon: '🪚', type: 'production', desc: 'Work wood into bows, spears, packs, a boat of your own, and idols for those who worship you.' },
  stealth: { name: 'Stealth', icon: '🗡️', type: 'combat', desc: 'Pick pockets, burgle the unwary and strike from the shadows. Each level sharpens your sneak attack and your eye for hidden vaults.' },
  cartography: { name: 'Cartography', icon: '🧭', type: 'combat', desc: 'Learned on the road. Every journey and every discovery teaches you; your maps reveal places you have never been, and you travel faster.' },
});
SKILL_GROUPS.find(g => g.name === 'Gathering').skills.push('hunting', 'archaeology', 'dreaming');

// Wisdom: a general skill that grows from everything you do.
SKILLS.wisdom = { name: 'Wisdom', icon: '🦉', type: 'general', desc: 'Everything you learn teaches you how to learn. Wisdom gains a share of the experience from every other skill, and each level makes all your learning a little faster.' };
SKILL_GROUPS.unshift({ name: 'General', skills: ['wisdom'] });
const WISDOM_SHARE = 0.1;            // share of every other skill's xp that also goes to Wisdom
const WISDOM_XP_PER_LEVEL = 0.002;   // +0.2% xp in every skill per Wisdom level
SKILL_GROUPS.find(g => g.name === 'Crafting').skills.push('carpentry');
SKILL_GROUPS.find(g => g.name === 'Adventuring').skills.push('stealth', 'cartography');

// --- New workplaces ---
Object.assign(STATIONS, {
  bed: { name: 'Bed', icon: '🛏️', portable: 'bedroll' },
  workbench: { name: 'Workbench', icon: '🪚', portable: 'carpenters_kit' },
  tannery: { name: 'Tannery', icon: '🪣' },
});
LOCATIONS.saltmire.stations.push('bed', 'workbench');
LOCATIONS.ironhold.stations.push('bed', 'workbench', 'tannery');
LOCATIONS.silent_abbey.stations.push('bed');
LOCATIONS.blackwood.stations = ['tannery'];

// --- Tools ---
TOOLS.hunting = ['snares', 'hunters_bow', 'ysolde_bow'];
TOOLS.archaeology = ['trowel', 'brush_kit', 'dwarven_auger'];
const NEW_TOOLS = {
  snares: ['Snares', '🪤', 8, 'hunting'], hunters_bow: ["Hunter's Bow", '🏹', 600, 'hunting'], ysolde_bow: ["Ysolde's Recurve", '🏹', 8000, 'hunting'],
  trowel: ['Trowel', '🔧', 8, 'archaeology'], brush_kit: ["Excavator's Brushes", '🖌️', 600, 'archaeology'], dwarven_auger: ['Dwarven Auger', '🌀', 8000, 'archaeology'],
};
for (const [id, [name, icon, sell, skill]] of Object.entries(NEW_TOOLS)) {
  const tier = TOOLS[skill].indexOf(id);
  addItem(id, { name, icon, type: 'tool', toolFor: skill, tier, sell, desc: `Lets you practise ${SKILLS[skill].name} when carried.${TOOL_SPEEDUP[tier] ? ` Works ${TOOL_SPEEDUP[tier] * 100}% faster.` : ''}` });
}
addItem('bedroll', { name: 'Bedroll', icon: '🛏️', type: 'tool', sell: 15, desc: 'Lets you sleep, and dream, anywhere.' });
addItem('carpenters_kit', { name: "Carpenter's Kit", icon: '🧰', type: 'tool', sell: 120, desc: 'Saw, plane and chisels: a workbench wherever you go.' });

// --- Dreaming ---
addItem('dream_dust', { name: 'Dream Dust', icon: '✨', sell: 4, desc: 'It glitters only when you are not looking straight at it.' });
addItem('cat_whisker', { name: 'Whisker of an Ulthar Cat', icon: '🐈', sell: 15, desc: 'Given, never taken. The cats of Ulthar remember.' });
addItem('dream_honey', { name: 'Dream Honey', icon: '🍯', type: 'potion', heal: 40, sanity: 8, sell: 30, desc: 'From the bees of the Enchanted Wood. Restores 40 hitpoints and 8 sanity.' });
addItem('celephais_silk', { name: 'Silk of Celephaïs', icon: '🧣', sell: 120, desc: 'Woven in a city where time does not pass.' });
addItem('moonwine', { name: 'Moon-Wine', icon: '🍷', type: 'potion', heal: 30, sanity: 30, sell: 90, desc: 'Traded by the black galleys of Dylath-Leen. Restores 30 hitpoints and 30 sanity.' });
addItem('leng_onyx', { name: 'Onyx of Leng', icon: '⚫', sell: 300, desc: 'Quarried by things that are almost men.' });
addItem('kadath_star', { name: 'Star of Kadath', icon: '🌠', sell: 1000, desc: 'A shard of light from the onyx castle atop unknown Kadath.' });

ACTIONS.dreaming = [
  { id: 'light_slumber', name: 'The Seventy Steps of Light Slumber', level: 1, xp: 10, time: 3500, station: 'bed', sanityGain: 1, output: { dream_dust: 1 }, desc: 'Walk down into the cavern of flame. A gentle dream.' },
  { id: 'ulthar', name: 'The Cats of Ulthar', level: 5, xp: 20, time: 4000, station: 'bed', sanityGain: 1, output: { cat_whisker: 1 }, desc: 'In Ulthar no man may kill a cat.' },
  { id: 'enchanted_wood', name: 'The Enchanted Wood', level: 12, xp: 35, time: 4500, station: 'bed', output: { dream_honey: 1 }, desc: 'Where the zoogs whisper among the fungi.' },
  { id: 'celephais', name: 'Celephaïs in the Valley of Ooth-Nargai', level: 20, xp: 55, time: 5500, station: 'bed', output: { celephais_silk: 1 }, desc: 'A city dreamed so well it became real.' },
  { id: 'dylath_leen', name: 'The Black Galleys of Dylath-Leen', level: 28, xp: 80, time: 6000, station: 'bed', sanityCost: 3, output: { moonwine: 1 }, desc: 'Trade with merchants whose turbans hide too much.' },
  { id: 'leng', name: 'The Plateau of Leng', level: 36, xp: 120, time: 7000, station: 'bed', sanityCost: 6, minMadness: 2, output: { leng_onyx: 1 }, desc: 'Only a mind that has broken can find the way.' },
  { id: 'kadath', name: 'Unknown Kadath in the Cold Waste', level: 45, xp: 220, time: 9000, station: 'bed', sanityCost: 10, minMadness: 3, output: { kadath_star: 1 }, desc: 'The gods of earth dance there. So does something else.' },
];

// --- Hunting and tanning ---
addItem('raw_venison', { name: 'Raw Venison', icon: '🥩', sell: 8, desc: 'Must be cooked before it can be eaten.' });
addItem('venison', { name: 'Roast Venison', icon: '🍖', type: 'food', heal: 45, sell: 15, desc: 'Restores 45 hitpoints.' });
addItem('deer_hide', { name: 'Deer Hide', icon: '🟫', sell: 10 });
addItem('rat_pelt', { name: 'Grave-Rat Pelt', icon: '🐀', sell: 6, desc: 'The rats of the graveyard grow large on what they eat.' });
addItem('wolf_pelt', { name: 'Dire Wolf Pelt', icon: '🐺', sell: 25 });
addItem('lizard_hide', { name: 'Cave Lizard Hide', icon: '🦎', sell: 45 });
addItem('star_hide', { name: 'Star-Elk Hide', icon: '🦌', sell: 120, desc: 'It shimmers with a colour that does not exist.' });
ACTIONS.hunting = [
  { id: 'deer', name: 'Stalk Deer', level: 1, xp: 12, time: 3500, output: { raw_venison: 1, deer_hide: 1 } },
  { id: 'grave_rats', name: 'Snare Grave Rats', level: 8, xp: 22, time: 3500, output: { rat_pelt: 1 } },
  { id: 'cave_lizards', name: 'Hunt Cave Lizards', level: 20, xp: 50, time: 5000, output: { lizard_hide: 1 } },
  { id: 'star_elk', name: 'Stalk the Star-Elk', level: 35, xp: 100, time: 7000, output: { star_hide: 1, raw_venison: 2 } },
  { id: 'leather_cap', name: 'Tan a Leather Cap', level: 3, xp: 18, time: 3000, station: 'tannery', input: { deer_hide: 2 }, output: { leather_cap: 1 } },
  { id: 'leather_armour', name: 'Tan Leather Armour', level: 6, xp: 35, time: 4000, station: 'tannery', input: { deer_hide: 4 }, output: { leather_armour: 1 } },
  { id: 'rat_satchel', name: 'Stitch a Rat-Pelt Satchel', level: 10, xp: 40, time: 4000, station: 'tannery', input: { rat_pelt: 6 }, output: { rat_satchel: 1 } },
  { id: 'wolfhide_armour', name: 'Tan Wolfhide Armour', level: 15, xp: 70, time: 4500, station: 'tannery', input: { wolf_pelt: 4 }, output: { wolfhide_armour: 1 } },
  { id: 'lizardscale_armour', name: 'Tan Lizardscale Armour', level: 25, xp: 120, time: 5000, station: 'tannery', input: { lizard_hide: 5 }, output: { lizardscale_armour: 1 } },
  { id: 'starhide_cloak', name: 'Sew a Starhide Cloak', level: 40, xp: 260, time: 6000, station: 'tannery', input: { star_hide: 4 }, output: { starhide_cloak: 1 } },
];
// Light armour: less protection than metal, but it never slows your aim.
addItem('leather_cap', { name: 'Leather Cap', icon: '🧢', type: 'equipment', slot: 'head', stats: { ac: 1, hit: 1 }, req: { combat: 3 }, sell: 30 });
addItem('leather_armour', { name: 'Leather Armour', icon: '🥋', type: 'equipment', slot: 'body', stats: { ac: 2, hit: 1 }, req: { combat: 5 }, sell: 60 });
addItem('rat_satchel', { name: 'Rat-Pelt Satchel', icon: '👝', type: 'equipment', slot: 'back', stats: { slots: 4 }, sell: 40, desc: '+4 pack slots. Smells exactly as you would expect.' });
addItem('wolfhide_armour', { name: 'Wolfhide Armour', icon: '🧥', type: 'equipment', slot: 'body', stats: { ac: 3, hit: 1 }, req: { combat: 12 }, sell: 150 });
addItem('lizardscale_armour', { name: 'Lizardscale Armour', icon: '🦎', type: 'equipment', slot: 'body', stats: { ac: 4, hit: 2 }, req: { combat: 22 }, sell: 400 });
addItem('starhide_cloak', { name: 'Starhide Cloak', icon: '🌌', type: 'equipment', slot: 'body', stats: { ac: 4, hit: 2, ward: 3 }, req: { combat: 35 }, sell: 1500 });
ACTIONS.cooking.push({ id: 'venison', name: 'Roast Venison', level: 6, xp: 22, time: 2500, station: 'fire', input: { raw_venison: 1 }, output: { venison: 1 } });
ACTIONS.cooking.sort((a, b) => a.level - b.level);
MONSTERS.dire_wolf.drops.push({ item: 'wolf_pelt', chance: 0.5, qty: [1, 1] });

// --- Archaeology: dig sites and relic collections ---
addItem('potsherd', { name: 'Potsherd', icon: '🏺', sell: 3, desc: 'A fragment of something that held something.' });
const RELIC_SETS = {
  barrow_kings: { name: 'The Barrow Kings', icon: '👑', bonus: ['ac', 1], relics: { barrow_ring: 'Barrow Ring', barrow_crown: 'Shard of a Barrow Crown', barrow_blade: 'Grave-Blade Hilt' } },
  dwarf_ancestors: { name: 'The Dwarven Ancestors', icon: '⛏️', bonus: ['carry', 2], relics: { ancestor_rune: 'Ancestor Rune-Stone', ancestor_axe: 'First Axe-Head', ancestor_tankard: 'Tankard of the Founders' } },
  star_fall: { name: 'The Fall of the Star', icon: '☄️', bonus: ['ward', 1], relics: { star_shard: 'Fused Star-Glass', migo_tool: 'Mi-Go Surgical Tool', colour_vial: 'Vial of Captured Colour' } },
  sunken_empire: { name: 'The Sunken Empire', icon: '🔱', bonus: ['hp', 15], relics: { trident_tip: 'Tip of an Ancient Trident', scale_tablet: 'Tablet of Scales', pearl_idol: 'Pearl Idol' } },
  cyclopean: { name: 'The Cyclopean Masonry', icon: '🗿', bonus: ['eldritch', 0.05], relics: { elder_key: 'Elder Key', wrong_angle: 'A Stone With Wrong Angles', sleeping_sigil: 'Sigil of the Sleeper' } },
};
for (const set of Object.values(RELIC_SETS)) {
  for (const [id, name] of Object.entries(set.relics)) addItem(id, { name, icon: set.icon, type: 'relic', sell: 80, desc: `A relic of ${set.name}. Place it in your collection on the Archaeology page.` });
}
const relicBonus = (set, chance) => Object.keys(RELIC_SETS[set].relics).map(item => ({ item, chance, qty: 1 }));
ACTIONS.archaeology = [
  { id: 'barrows', name: 'Excavate the Barrows', level: 1, xp: 12, time: 4000, output: { potsherd: 1 }, bonus: relicBonus('barrow_kings', 0.03) },
  { id: 'dwarven_halls', name: 'Dig the Abandoned Halls', level: 10, xp: 30, time: 5000, output: { potsherd: 1 }, bonus: relicBonus('dwarf_ancestors', 0.03) },
  { id: 'impact_strata', name: 'Sift the Impact Strata', level: 18, xp: 50, time: 5500, output: { potsherd: 1 }, bonus: relicBonus('star_fall', 0.025) },
  { id: 'sunken_ruins', name: 'Dive the Sunken Ruins', level: 28, xp: 85, time: 6500, output: { potsherd: 1 }, bonus: relicBonus('sunken_empire', 0.025) },
  { id: 'cyclopean', name: 'Measure the Cyclopean Masonry', level: 40, xp: 150, time: 8000, sanityCost: 4, output: { potsherd: 2 }, bonus: relicBonus('cyclopean', 0.02) },
];
LOCATIONS.graveyard.gather.archaeology = ['barrows'];
LOCATIONS.deep_mines.gather.archaeology = ['dwarven_halls'];
LOCATIONS.crater.gather.archaeology = ['impact_strata'];
LOCATIONS.the_abyss.gather = { archaeology: ['cyclopean'] };
LOCATIONS.blackwood.gather.hunting = ['deer'];
LOCATIONS.graveyard.gather.hunting = ['grave_rats'];
LOCATIONS.deep_mines.gather.hunting = ['cave_lizards'];
LOCATIONS.crater.gather.hunting = ['star_elk'];
// The Professor knows where to dig.
COMPANIONS.peaslee.aura.dig = 0.15;
COMPANIONS.peaslee.desc += ' Archaeology goes 15% faster with him along.';

// --- Carpentry ---
addItem('shortbow', { name: 'Ash Shortbow', icon: '🏹', type: 'equipment', slot: 'weapon', speed: 1800, dice: '1d6', stats: { hit: 2 }, req: { combat: 3 }, sell: 20, desc: 'Light and quick.' });
addItem('oak_spear', { name: 'Twisted Oak Spear', icon: '🔱', type: 'equipment', slot: 'weapon', speed: 2600, dice: '1d8', stats: { hit: 1, dmg: 1 }, req: { combat: 6 }, sell: 35 });
addItem('frame_pack', { name: 'Oak Frame Pack', icon: '🎒', type: 'equipment', slot: 'back', stats: { slots: 8 }, sell: 120, desc: '+8 pack slots.' });
addItem('longbow', { name: 'Grave Pine Longbow', icon: '🏹', type: 'equipment', slot: 'weapon', speed: 1900, dice: '1d8', stats: { hit: 3, dmg: 1 }, req: { combat: 13 }, sell: 90 });
addItem('rowboat', { name: 'Rowboat', icon: '🚣', type: 'tool', sell: 400, desc: 'Your own boat. No ferryman to pay, and it can reach the Drowned Isle.' });
addItem('shadow_bow', { name: 'Shadowbark Bow', icon: '🏹', type: 'equipment', slot: 'weapon', speed: 2000, dice: '2d6', stats: { hit: 4, dmg: 2 }, req: { combat: 23 }, sell: 300 });
addItem('shrine_idol', { name: 'Shrine Idol', icon: '🗿', sell: 200, desc: 'A carved idol for your cult\'s shrine. Raise it there and two more followers will come.' });
addItem('pale_bow', { name: 'Pale Bow', icon: '🏹', type: 'equipment', slot: 'weapon', speed: 2000, dice: '2d8', stats: { hit: 5, dmg: 3 }, req: { combat: 35 }, sell: 900 });
addItem('dream_staff', { name: 'Dreamwood Staff', icon: '🪄', type: 'equipment', slot: 'weapon', speed: 2400, dice: '2d8', stats: { hit: 5, dmg: 4, ward: 3 }, req: { combat: 40 }, sell: 3000, desc: 'Carved from a tree of the Outer Spheres, set with a star of Kadath.' });
ACTIONS.carpentry = [
  { id: 'shortbow', name: 'Carve an Ash Shortbow', level: 1, xp: 15, time: 3000, station: 'workbench', input: { ash_logs: 3 }, output: { shortbow: 1 } },
  { id: 'oak_spear', name: 'Shape a Twisted Oak Spear', level: 6, xp: 30, time: 3500, station: 'workbench', input: { twisted_oak_logs: 3 }, output: { oak_spear: 1 } },
  { id: 'frame_pack', name: 'Build an Oak Frame Pack', level: 10, xp: 45, time: 4500, station: 'workbench', input: { twisted_oak_logs: 4, deer_hide: 2 }, output: { frame_pack: 1 } },
  { id: 'longbow', name: 'Carve a Grave Pine Longbow', level: 15, xp: 60, time: 4000, station: 'workbench', input: { grave_pine_logs: 3 }, output: { longbow: 1 } },
  { id: 'rowboat', name: 'Build a Rowboat', level: 18, xp: 300, time: 8000, station: 'workbench', input: { grave_pine_logs: 10, iron_bar: 5 }, output: { rowboat: 1 } },
  { id: 'shadow_bow', name: 'Carve a Shadowbark Bow', level: 28, xp: 110, time: 4500, station: 'workbench', input: { shadowbark_logs: 3 }, output: { shadow_bow: 1 } },
  { id: 'shrine_idol', name: 'Carve a Shrine Idol', level: 32, xp: 200, time: 6000, station: 'workbench', input: { shadowbark_logs: 5, silver_bar: 2 }, output: { shrine_idol: 1 } },
  { id: 'pale_bow', name: 'Carve a Pale Bow', level: 40, xp: 200, time: 5000, station: 'workbench', input: { pale_logs: 3 }, output: { pale_bow: 1 } },
  { id: 'dream_staff', name: 'Carve a Dreamwood Staff', level: 46, xp: 500, time: 8000, station: 'workbench', input: { dream_logs: 2, kadath_star: 1 }, output: { dream_staff: 1 } },
];
const MAX_IDOLS = 3;
const FOLLOWERS_PER_IDOL = 2;

// A new place at sea, only for those with a boat of their own.
LOCATIONS.drowned_isle = {
  name: 'The Drowned Isle', kind: 'wild', icon: '🏝️', x: 960, y: 430, labelDx: -45,
  desc: 'A spit of black rock that the maps forget. At low tide, the tops of carved columns break the surface around it.',
  stations: ['shore'], gather: { fishing: ['drowned_salmon', 'abyssal_catfish'], archaeology: ['sunken_ruins'] },
  monsters: ['deepling'],
};
ROADS.push({ a: 'devils_reef', b: 'drowned_isle', time: 20, req: ['rowboat'] });

// --- Stealth ---
// Thefts give gold directly; a "risk" of being caught ends the attempt with a fine.
ACTIONS.stealth = [
  { id: 'pickpocket_saltmire', name: 'Pick Pockets on the Quay', icon: '👛', level: 1, xp: 12, time: 3000, gold: [2, 8], risk: 0.08, output: {} },
  { id: 'pickpocket_ironhold', name: 'Lift Purses in the Forge Hall', icon: '👛', level: 10, xp: 28, time: 3500, gold: [8, 20], risk: 0.08, output: {} },
  { id: 'burgle_abbey', name: 'Rifle the Forbidden Library', icon: '📚', level: 20, xp: 55, time: 4500, gold: [5, 15], risk: 0.1, output: { whispering_fragment: 1 }, bonus: [{ item: 'cultist_text', chance: 0.05, qty: 1 }] },
  { id: 'rob_cult', name: 'Rob the Cult Strongbox', icon: '🗝️', level: 30, xp: 90, time: 5500, gold: [40, 100], risk: 0.12, output: {}, bonus: [{ item: 'necronomicon_page', chance: 0.02, qty: 1 }] },
  { id: 'dagon_hoard', name: "Steal from Dagon's Hoard", icon: '💎', level: 40, xp: 160, time: 7000, gold: [100, 250], risk: 0.15, output: {}, bonus: [{ item: 'elder_elixir', chance: 0.03, qty: 1 }] },
];
LOCATIONS.saltmire.gather.stealth = ['pickpocket_saltmire'];
LOCATIONS.ironhold.gather.stealth = ['pickpocket_ironhold'];
LOCATIONS.silent_abbey.gather.stealth = ['burgle_abbey'];
LOCATIONS.drowned_catacombs.gather = { stealth: ['rob_cult'] };
LOCATIONS.the_abyss.gather.stealth = ['dagon_hoard'];
const CAUGHT_FINE = 0.1;            // share of your gold you lose when caught
const VAULT_DC = 15;                // stealth check to find an expedition's hidden vault
const SNEAK_LEVELS_PER_DIE = 10;    // one d6 of sneak attack per this many Stealth levels

// More road events now have a stealthy way out.
ROAD_EVENTS.cultist_camp.choices[0].check = { skill: 'stealth', dc: 11 };
ROAD_EVENTS.bandits.choices.push({ label: 'Slip away into the trees', check: { skill: 'stealth', dc: 11 }, outcome: { gain: { xp: { stealth: 40 } }, text: 'They never see you go.' }, fail: { fight: 'smuggler', text: 'A twig snaps.' } });
ROAD_EVENTS.caravan.choices.splice(2, 0, { label: 'Pilfer from a cart', check: { skill: 'stealth', dc: 13 }, outcome: { gain: { items: { iron_bar: 4 }, gold: 30, xp: { stealth: 60 } }, text: 'Four bars and a purse, and not a dwarf the wiser.' }, fail: { lose: { gold: 40 }, text: 'A dwarf catches your wrist. You pay for your manners.' } });

// --- Cartography ---
addItem('survey_notes', { name: 'Survey Notes', icon: '📝', sell: 3, desc: 'Bearings, distances and sketches of the land around you.' });
addItem('local_map', { name: 'Hand-Drawn Map', icon: '🗺️', type: 'map', reveal: 1, sell: 30, desc: 'Read it to learn of a place you have not yet found.' });
addItem('treasure_map', { name: 'Treasure Map', icon: '🗺️', type: 'map', treasure: [150, 450], sell: 80, desc: 'X marks the spot. Read it to dig up a buried hoard.' });
addItem('sea_chart', { name: 'Chart of the Black Sea', icon: '🧭', type: 'map', reveal: 3, sell: 150, desc: 'Read it to learn of three places you have not yet found.' });
ACTIONS.cartography = [
  { id: 'survey', name: 'Survey the Surroundings', level: 1, xp: 10, time: 3500, anywhere: true, output: { survey_notes: 1 } },
  { id: 'local_map', name: 'Draw a Map', level: 5, xp: 40, time: 5000, anywhere: true, input: { survey_notes: 4 }, output: { local_map: 1 } },
  { id: 'treasure_map', name: 'Draw a Treasure Map', level: 20, xp: 90, time: 6000, anywhere: true, input: { survey_notes: 8, whispering_fragment: 2 }, output: { treasure_map: 1 } },
  { id: 'sea_chart', name: 'Chart the Black Sea', level: 32, xp: 180, time: 8000, anywhere: true, input: { survey_notes: 12, celephais_silk: 1 }, output: { sea_chart: 1 } },
];
const CARTOGRAPHY_XP_PER_ROAD_SECOND = 1.5;
const CARTOGRAPHY_XP_PER_DISCOVERY = 120;
const CARTOGRAPHY_TRAVEL_PER_LEVEL = 0.005;  // +0.5% travel speed per level

// --- Shops stock the new tools ---
SHOPS.general_store.stock.push({ item: 'bedroll', price: 60 }, { item: 'snares', price: 25 }, { item: 'trowel', price: 30 }, { item: 'carpenters_kit', price: 400 });
SHOPS.smithy.stock.push({ item: 'hunters_bow', price: 3000 }, { item: 'dwarven_auger', price: 40000 }, { item: 'trowel', price: 30 });
SHOPS.apothecary.stock.push({ item: 'bedroll', price: 50 }, { item: 'brush_kit', price: 3000 });
SHOPS.esoteric_order.stock.push({ item: 'bedroll', price: 50 }, { item: 'snares', price: 20 }, { item: 'trowel', price: 25 });
SHOPS.hollow_market.stock.push({ item: 'ysolde_bow', price: 400 }, { item: 'dream_honey', price: 5 });

// --- Bestiary-style achievements for the new skills ---
ACHIEVEMENTS.push(
  { id: 'kadath', icon: '🌠', name: 'Dream-Quest', desc: 'Reach unknown Kadath in your dreams.', test: g => g.count('kadath_star') > 0 || g.bankCount('kadath_star') > 0 },
  { id: 'curator', icon: '🏺', name: 'Curator', desc: 'Complete a relic collection.', test: g => Object.keys(RELIC_SETS).some(s => g.relicSetDone(s)) },
  { id: 'boat', icon: '🚣', name: 'Your Own Boat', desc: 'Build a rowboat.', test: g => g.carries('rowboat') },
  { id: 'thief', icon: '🗡️', name: 'Light Fingers', desc: 'Find an expedition\'s hidden vault.', test: g => !!g.state.flags.vault },
);
