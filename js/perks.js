// Skill trees: every five levels in a skill you choose one of two perks.
// Extends the Game object from game.js.

const PERK_EVERY = 5;
const PERK_RESPEC_GOLD = 100; // per perk forgotten
const MAX_PERK_SPEED = 0.5;

// What each kind of perk does. Values add up across every perk you have chosen.
// Keys marked "skill" only apply to the skill whose tree they are in; the rest apply everywhere.
const PERK_EFFECTS = {
  speed: { scope: 'skill', text: v => `${Math.round(v * 100)}% faster` },
  double: { scope: 'skill', text: v => `${Math.round(v * 100)}% chance of a double yield` },
  xp: { scope: 'skill', text: v => `+${Math.round(v * 100)}% experience` },
  save: { scope: 'skill', text: v => `${Math.round(v * 100)}% chance to keep your materials` },
  rare: { scope: 'skill', text: (v, skill) => `+${Math.round(v * 100)}% chance per action to find ${ITEMS[RARE_FINDS[skill]].name}` },
  sanityCost: { scope: 'skill', text: v => `Occult work costs ${Math.round(-v * 100)}% less sanity` },
  carry: { text: v => `+${v} pack slot${v > 1 ? 's' : ''}` },
  heal: { text: v => `Food heals ${Math.round(v * 100)}% more` },
  potency: { text: v => `Potions are ${Math.round(v * 100)}% stronger` },
  hit: { text: v => `+${v} to hit` },
  dmg: { text: v => `+${v} damage` },
  ac: { text: v => `+${v} AC` },
  hp: { text: v => `+${v} maximum hitpoints` },
  crit: { text: v => `Critical hits on ${v} more number${v > 1 ? 's' : ''} of the d20` },
  killHeal: { text: v => `Heal ${v} hitpoints whenever you slay an enemy` },
  ward: { text: v => `+${v} to sanity saves` },
  veil: { text: v => `You see through the Veil ${v} sanity sooner` },
  eldritch: { text: v => `+${Math.round(v * 100)}% damage against eldritch beings` },
  travel: { text: v => `Travel ${Math.round(v * 100)}% faster` },
  compHit: { text: v => `Your companion has +${v} to hit` },
  compAc: { text: v => `Your companion has +${v} AC` },
  compHp: { text: v => `Your companion has +${v} hitpoints` },
  compDmg: { text: v => `Your companion deals +${v} damage` },
  compWits: { text: v => `Your companion has +${v} to sanity saves` },
  compHeal: { text: v => `Your companion heals you ${v} each turn` },
  compGuard: { text: v => `Your companion draws ${Math.round(v * 100)}% more attacks away from you` },
  rally: { text: () => 'A downed companion gets back up after 30 seconds, without an inn' },
};

// What the "rare" perks turn up while gathering.
const RARE_FINDS = { woodcutting: 'whispering_fragment', fishing: 'veil_pearl', mining: 'starmetal_ore', foraging: 'star_rose' };

// Ten tiers (levels 5, 10 … 50), two options each: [effect, value].
const PERK_TEMPLATES = {
  gathering: [
    [['speed', 0.05], ['double', 0.05]],
    [['xp', 0.1], ['carry', 1]],
    [['speed', 0.05], ['rare', 0.01]],
    [['double', 0.05], ['xp', 0.1]],
    [['speed', 0.07], ['carry', 2]],
    [['double', 0.07], ['rare', 0.02]],
    [['speed', 0.07], ['xp', 0.15]],
    [['double', 0.08], ['carry', 2]],
    [['speed', 0.08], ['rare', 0.02]],
    [['double', 0.12], ['speed', 0.12]],
  ],
  production: special => [
    [['speed', 0.05], ['save', 0.05]],
    [['xp', 0.1], ['double', 0.05]],
    [['speed', 0.05], ['save', 0.05]],
    [special[0], ['xp', 0.1]],
    [['speed', 0.07], ['double', 0.05]],
    [['save', 0.07], special[1]],
    [['speed', 0.07], ['xp', 0.15]],
    [['double', 0.07], ['save', 0.07]],
    [['speed', 0.08], special[2]],
    [['double', 0.12], ['save', 0.12]],
  ],
  occultism: [
    [['sanityCost', -0.15], ['xp', 0.1]],
    [['ward', 1], ['veil', 5]],
    [['speed', 0.05], ['double', 0.05]],
    [['sanityCost', -0.15], ['eldritch', 0.05]],
    [['ward', 1], ['xp', 0.15]],
    [['veil', 5], ['save', 0.07]],
    [['sanityCost', -0.2], ['eldritch', 0.07]],
    [['ward', 2], ['double', 0.07]],
    [['speed', 0.08], ['eldritch', 0.08]],
    [['ward', 3], ['sanityCost', -0.25]],
  ],
  fellowship: [
    [['compHit', 1], ['compAc', 1]],
    [['compHp', 15], ['travel', 0.05]],
    [['compDmg', 1], ['compWits', 2]],
    [['compGuard', 0.15], ['compHeal', 2]],
    [['compHit', 1], ['travel', 0.1]],
    [['rally', 1], ['compHp', 25]],
    [['compDmg', 2], ['compAc', 2]],
    [['compWits', 3], ['travel', 0.1]],
    [['compHeal', 4], ['compGuard', 0.15]],
    [['compDmg', 3], ['compHp', 50]],
  ],
  combat: [
    [['hit', 1], ['ac', 1]],
    [['hp', 10], ['dmg', 1]],
    [['crit', 1], ['killHeal', 3]],
    [['hit', 1], ['ac', 1]],
    [['dmg', 2], ['hp', 20]],
    [['crit', 1], ['ward', 1]],
    [['hit', 1], ['ac', 1]],
    [['dmg', 2], ['killHeal', 6]],
    [['hp', 30], ['eldritch', 0.1]],
    [['crit', 2], ['ac', 2]],
  ],
};

// Names for each option, tier by tier (option A, option B).
const PERK_NAMES = {
  woodcutting: ['Steady Swing', 'Keen Eye', "Woodsman's Lore", 'Bundled Logs', 'Rhythm of the Axe', 'Whispering Bark', 'Heartwood', "Forester's Lore", 'Clean Cuts', "Hauler's Back", 'Twin Fells', 'Things in the Rings', 'Timber!', 'Old Growth Wisdom', 'Split Grain', "Woodsman's Frame", 'Lightning Swing', 'Rings of Dreams', 'Lord of the Blackwood', 'The Last Tree Falls'],
  fishing: ['Patient Line', 'Full Nets', 'Tide Lore', 'Creel', 'Quick Cast', 'Glint Beneath', 'Shoal Sense', 'Old Salt', 'Flick of the Wrist', 'Deep Creel', 'Teeming Waters', 'Pearl Diver', 'Hook Master', 'Sea Wisdom', 'Double Hook', "Fisher's Barrow", 'Lightning Strike', 'Things That Glitter', 'Bounty of the Deep', "Leviathan's Patience"],
  mining: ['Steady Pick', 'Rich Seam', "Prospector's Lore", 'Ore Sack', 'Rhythm of Stone', 'Starglint', 'Mother Lode', 'Deep Lore', 'Sure Strike', "Miner's Harness", 'Twin Veins', 'Fallen Fragments', 'Stonebreaker', 'Dwarf-Taught', 'Rich Pockets', "Mule's Back", 'Thunder Pick', 'Sky Iron', 'King Under the Mountain', 'The Endless Vein'],
  foraging: ['Light Fingers', 'Bountiful Patch', 'Herb Lore', 'Satchel of Pockets', 'Quick Sickle', 'Moonlit Finds', 'Green Thumb', "Old Wives' Lore", 'Swift Gathering', 'Root Bag', 'Overgrowth', 'Starflower Sense', "Reaper's Grace", 'Druidic Lore', 'Twin Blooms', "Gatherer's Frame", 'Wind Through the Grass', 'The Garden Beyond', 'Mother of Groves', 'The Quick Harvest'],
  cooking: ['Hot Pan', 'Waste Not', 'Recipe Book', 'Second Helping', 'Practised Hands', 'Frugal Cook', 'Hearty Meals', 'Kitchen Lore', 'Flash Fry', 'Generous Portions', 'Nothing Burns', 'Comfort Food', 'Line Cook', 'Master Recipes', 'Feast', 'Scraps to Soup', 'Kitchen Fury', 'Feast for Heroes', 'Banquet', 'Never a Crumb'],
  smithing: ['Hot Iron', 'Careful Measure', "Smith's Lore", 'Extra Billet', 'Hammer Rhythm', 'Thrifty Smelting', "Armourer's Eye", 'Forge Lore', 'Quick Quench', 'Twin Ingots', 'No Waste', 'Weaponsmith', "Master's Pace", 'Masterwork Lore', 'Abundant Forge', 'Recast Scraps', 'Thunder Hammer', 'Balanced Blades', 'Forge-Lord', 'Not a Speck Wasted'],
  alchemy: ['Quick Distill', 'Measured Drops', "Alchemist's Notes", 'Double Batch', 'Steady Flame', 'Reclaimed Residue', 'Potent Brews', "Apothecary's Lore", 'Rapid Reduction', 'Overflowing Flask', 'Perfect Ratios', 'Concentrated Essence', 'Swift Hands', 'Grand Formulae', 'Twin Vials', "Philosopher's Thrift", 'Bubbling Cauldron', 'Elixir of Elixirs', 'The Great Work', 'The Unwasting Retort'],
  occultism: ['Steeled Mind', 'Forbidden Notes', 'Warded Thoughts', 'Thin Eyes', 'Quick Study', 'Doubled Whispers', 'Mind Like Stone', 'Know Thy Enemy', 'Inner Sigil', 'Deeper Reading', 'The Opened Eye', 'Careful Rites', 'Empty Mind', 'Banishing Words', 'Elder Ward', 'Echoing Whispers', 'Swift Incantation', 'Bane of the Deep', 'The Unbroken', 'Communion'],
  fellowship: ['Drilled Together', 'Shield Wall', 'Shared Rations', 'Road-Wise', 'Sparring Partner', 'Steady Words', 'Bodyguard', 'Field Dressing', 'Practised Tactics', 'Shortcuts', 'Never Leave a Friend', 'Hearty Fellow', 'Brothers in Arms', 'Back to Back', 'Courage Shared', 'Long Road Home', 'Tender Mercies', 'Stand in Front', 'Legendary Duo', 'Unbreakable Bond'],
  combat: ['Weapon Training', 'Shield Drill', 'Toughness', 'Heavy Blows', 'Keen Edge', 'Second Wind', 'Battle Focus', 'Iron Skin', 'Brutal Strikes', 'Unyielding', 'Deadly Precision', 'Steel Nerves', "Veteran's Eye", 'Fortress', 'Executioner', 'Bloodthirst', 'Colossus', 'Monster Hunter', 'Legend of Aldmark', 'The Last Wall'],
};

// Build the trees: PERK_TREES[skill][tierIndex] = [optionA, optionB], each { name, effect, value }.
const PERK_TREES = (() => {
  const layout = {
    woodcutting: PERK_TEMPLATES.gathering,
    fishing: PERK_TEMPLATES.gathering,
    mining: PERK_TEMPLATES.gathering,
    foraging: PERK_TEMPLATES.gathering,
    cooking: PERK_TEMPLATES.production([['heal', 0.1], ['heal', 0.15], ['heal', 0.2]]),
    smithing: PERK_TEMPLATES.production([['ac', 1], ['dmg', 1], ['hit', 1]]),
    alchemy: PERK_TEMPLATES.production([['potency', 0.15], ['potency', 0.15], ['potency', 0.2]]),
    occultism: PERK_TEMPLATES.occultism,
    combat: PERK_TEMPLATES.combat,
    fellowship: PERK_TEMPLATES.fellowship,
  };
  const trees = {};
  for (const [skill, tiers] of Object.entries(layout)) {
    trees[skill] = tiers.map((options, t) => options.map(([effect, value], o) => ({ name: PERK_NAMES[skill][t * 2 + o], effect, value })));
  }
  return trees;
})();

function perkText(perk, skill) {
  return PERK_EFFECTS[perk.effect].text(perk.value, skill);
}

Object.assign(Game, {
  // Levels at which a perk can be chosen: 5, 10, … 50.
  perkTiers() {
    const tiers = [];
    for (let lvl = PERK_EVERY; lvl <= MAX_LEVEL; lvl += PERK_EVERY) tiers.push(lvl);
    return tiers;
  },
  chosenPerk(skill, tierLevel) {
    const picks = this.state.perks[skill] || {};
    const idx = picks[tierLevel];
    return idx === undefined ? null : PERK_TREES[skill][tierLevel / PERK_EVERY - 1][idx];
  },
  // Sum of an effect: within one skill's tree for skill-scoped effects, or across all trees otherwise.
  perk(effect, skill) {
    const skills = PERK_EFFECTS[effect].scope === 'skill' ? [skill] : Object.keys(PERK_TREES);
    let total = 0;
    for (const sk of skills) {
      const picks = this.state.perks[sk];
      if (!picks) continue;
      for (const [tier, idx] of Object.entries(picks)) {
        const p = PERK_TREES[sk][tier / PERK_EVERY - 1][idx];
        if (p.effect === effect) total += p.value;
      }
    }
    return total;
  },
  pendingPerks(skill) {
    const lvl = this.level(skill);
    return this.perkTiers().filter(t => t <= lvl && this.chosenPerk(skill, t) === null).length;
  },
  totalPendingPerks() {
    return Object.keys(PERK_TREES).reduce((n, sk) => n + this.pendingPerks(sk), 0);
  },
  choosePerk(skill, tierLevel, index) {
    if (!PERK_TREES[skill] || this.level(skill) < tierLevel || this.chosenPerk(skill, tierLevel) !== null) return;
    const perk = PERK_TREES[skill][tierLevel / PERK_EVERY - 1][index];
    if (!perk) return;
    this.state.perks[skill] = Object.assign(this.state.perks[skill] || {}, { [tierLevel]: index });
    this.log(`${SKILLS[skill].icon} New perk: ${perk.name}. ${perkText(perk, skill)}.`, 'level');
    this.state.hp = Math.min(this.state.hp, this.maxHp());
    this.emit('action');
  },
  respecCost(skill) {
    return PERK_RESPEC_GOLD * Object.keys(this.state.perks[skill] || {}).length;
  },
  respecPerks(skill) {
    const cost = this.respecCost(skill);
    if (!cost) return;
    if (this.state.gold < cost) return this.log('You cannot afford to unlearn your habits.', 'warn');
    this.state.gold -= cost;
    delete this.state.perks[skill];
    // Fewer pack slots could leave you carrying too much; that is allowed, you simply cannot pick up new kinds.
    this.state.hp = Math.min(this.state.hp, this.maxHp());
    this.log(`You unlearn your ${SKILLS[skill].name.toLowerCase()} habits and may choose again.`, 'warn');
    this.emit('action');
  },
  // Called on level-up: tells the player when a new perk is waiting.
  announcePerks(skill, before, after) {
    if (!PERK_TREES[skill]) return;
    if (Math.floor(after / PERK_EVERY) > Math.floor(before / PERK_EVERY)) {
      this.log(`${SKILLS[skill].icon} A new ${SKILLS[skill].name} perk is waiting to be chosen.`, 'rare');
      this.emit('perk', { skill });
    }
  },
  sanityCostOf(skill, action) {
    if (!action.sanityCost) return 0;
    return Math.max(1, Math.round(action.sanityCost * (1 + this.perk('sanityCost', skill))));
  },
});
