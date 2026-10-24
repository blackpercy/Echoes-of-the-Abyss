// Skill trees: every five levels in a skill you choose one of two perks.
// Extends the Game object from game.js.

const PERK_EVERY = 5;
const PERK_RESPEC_GOLD = 100; // per perk forgotten
const MAX_PERK_SPEED = 0.95;
// Limits on perks that would otherwise run away once every perk has been taken twice.
const MIN_CRIT_ROLL = 15;          // critical hits never start below this roll
const MAX_DOUBLE_STRIKE = 0.5;
const MAX_SANITY_COST_CUT = 0.8;

// What each kind of perk does. Values add up across every perk you have chosen.
// Keys marked "skill" only apply to the skill whose tree they are in; the rest apply everywhere.
const PERK_EFFECTS = {
  speed: { scope: 'skill', text: v => `${Math.round(v * 100)}% faster` },
  double: { scope: 'skill', text: v => `${Math.round(v * 100)}% chance of a double yield` },
  xp: { scope: 'skill', text: (v, skill) => skill === 'wisdom' ? `Wisdom itself grows ${Math.round(v * 100)}% faster` : `+${Math.round(v * 100)}% experience` },
  save: { scope: 'skill', text: v => `${Math.round(v * 100)}% chance to keep your materials` },
  rare: { scope: 'skill', text: (v, skill) => `+${Math.round(v * 100)}% chance per action to find ${ITEMS[RARE_FINDS[skill]].name}` },
  sanityCost: { scope: 'skill', text: v => `Occult work costs ${Math.round(-v * 100)}% less sanity` },
  carry: { text: v => `+${v} pack slot${v > 1 ? 's' : ''}` },
  heal: { text: v => `Food heals ${Math.round(v * 100)}% more` },
  potency: { text: v => `Potions are ${Math.round(v * 100)}% stronger` },
  hit: { text: v => `${withSign(v)} to hit` },
  dmg: { text: v => `${withSign(v)} damage` },
  ac: { text: v => `${withSign(v)} AC` },
  hp: { text: v => `+${v} maximum hitpoints` },
  crit: { text: v => `Critical hits on ${v} more number${v > 1 ? 's' : ''} of the d20` },
  killHeal: { text: v => `Heal ${v} hitpoints whenever you slay an enemy` },
  ward: { text: v => `${withSign(v)} to sanity saves` },
  veil: { text: v => `You see through the Veil ${v} sanity sooner` },
  eldritch: { text: v => `+${Math.round(v * 100)}% damage against eldritch beings` },
  travel: { text: v => `Travel ${Math.round(v * 100)}% faster` },
  allXp: { text: v => `+${Math.round(v * 100)}% experience in every skill` },
  wHit: { scope: 'skill', text: v => `+${v} to hit with this weapon type` },
  wDmg: { scope: 'skill', text: v => `+${v} damage with this weapon type` },
  wCrit: { scope: 'skill', text: v => `Critical hits on ${v} more number${v > 1 ? 's' : ''} of the d20` },
  wSpeed: { scope: 'skill', text: v => `Attack ${Math.round(v * 100)}% faster` },
  wDouble: { scope: 'skill', text: v => `${Math.round(v * 100)}% chance of a second, free attack` },
  wPierce: { scope: 'skill', text: v => `Ignore ${v} point${v > 1 ? 's' : ''} of enemy armour` },
  wLeech: { scope: 'skill', text: v => `Heal ${v} every time you hit` },
  wEldritch: { scope: 'skill', text: v => `+${Math.round(v * 100)}% damage against eldritch beings` },
  wWard: { scope: 'skill', text: v => `+${v} to sanity saves while you wield it` },
  offlineXp: { text: v => `+${Math.round(v * 100)}% experience while you are away` },
  gold: { text: v => `+${Math.round(v * 100)}% gold from fights, thefts, treasure, quests and tithes` },
  speedAll: { text: v => `Every activity is ${Math.round(v * 100)}% faster` },
  dreamRest: { scope: 'skill', text: (v, skill) => skill === 'faith' ? `Prayer restores +${v} more sanity` : `Gentle dreams restore +${v} more sanity` },
  safe: { scope: 'skill', text: v => `${Math.round(v * 100)}% less likely to be caught` },
  sneak: { text: v => `Sneak attacks deal +${v}d6` },
  scout: { text: v => `+${v} to road-event checks` },
  compHit: { text: v => `Your companions have +${v} to hit` },
  compAc: { text: v => `Your companions have +${v} AC` },
  compHp: { text: v => `Your companions have +${v} hitpoints` },
  compDmg: { text: v => `Your companions deal +${v} damage` },
  compWits: { text: v => `Your companions have +${v} to sanity saves` },
  compHeal: { text: v => `Each companion heals you ${v} each turn` },
  compGuard: { text: v => `Your companions draw ${Math.round(v * 100)}% more attacks away from you` },
  rally: { text: () => 'Downed companions get back up after 30 seconds, without an inn' },
  wStun: { scope: 'skill', text: v => `+${Math.round(v * 100)}% chance to stagger the enemy` },
  atkSpeed: { text: v => `Attack ${Math.round(v * 100)}% faster` },
  haggle: { text: v => `Prices ${Math.round(v * 100)}% better when buying and selling` },
  tradeStock: { text: v => `Markets hold ${v} more of each good for you` },
  scrollPower: { text: v => `Scrolls are ${Math.round(v * 100)}% stronger` },
  buffTime: { text: v => `Rites, brews and scrolls last ${Math.round(v * 100)}% longer` },
};

// What the "rare" perks turn up while gathering.
const RARE_FINDS = { woodcutting: 'whispering_fragment', fishing: 'veil_pearl', mining: 'starmetal_ore', foraging: 'star_rose', hunting: 'star_hide', archaeology: 'necronomicon_page', dreaming: 'leng_onyx', gravedigging: 'saints_knucklebone', tidecombing: 'ambergris' };

// Ten tiers (levels 5, 10 … 50), two options each: [effect, value].
// Levels 55–100 repeat the same ten choices as second ranks ("… II"), so each perk can be taken twice.
const PERK_TEMPLATES = {
  gathering: [
    [['speed', 0.15], ['double', 0.05]],
    [['xp', 0.1], ['carry', 1]],
    [['speed', 0.15], ['rare', 0.01]],
    [['double', 0.05], ['xp', 0.1]],
    [['speed', 0.15], ['carry', 2]],
    [['double', 0.07], ['rare', 0.02]],
    [['speed', 0.15], ['xp', 0.15]],
    [['double', 0.08], ['carry', 2]],
    [['speed', 0.15], ['rare', 0.02]],
    [['double', 0.12], ['speed', 0.15]],
  ],
  production: special => [
    [['speed', 0.15], ['save', 0.05]],
    [['xp', 0.1], ['double', 0.05]],
    [['speed', 0.15], ['save', 0.05]],
    [special[0], ['xp', 0.1]],
    [['speed', 0.15], ['double', 0.05]],
    [['save', 0.07], special[1]],
    [['speed', 0.15], ['xp', 0.15]],
    [['double', 0.07], ['save', 0.07]],
    [['speed', 0.15], special[2]],
    [['double', 0.12], ['save', 0.12]],
  ],
  occultism: [
    [['sanityCost', -0.15], ['xp', 0.1]],
    [['ward', 1], ['veil', 5]],
    [['speed', 0.15], ['double', 0.05]],
    [['sanityCost', -0.15], ['eldritch', 0.05]],
    [['ward', 1], ['xp', 0.15]],
    [['veil', 5], ['save', 0.07]],
    [['sanityCost', -0.2], ['eldritch', 0.07]],
    [['ward', 2], ['double', 0.07]],
    [['speed', 0.15], ['eldritch', 0.08]],
    [['ward', 3], ['sanityCost', -0.25]],
  ],
  blades: [
    [['wHit', 1], ['wCrit', 1]],
    [['wDmg', 1], ['wLeech', 1]],
    [['wSpeed', 0.05], ['wHit', 1]],
    [['wCrit', 1], ['wDmg', 2]],
    [['wDouble', 0.05], ['wLeech', 2]],
    [['wHit', 2], ['wSpeed', 0.05]],
    [['wDmg', 2], ['wCrit', 1]],
    [['wDouble', 0.08], ['wHit', 2]],
    [['wDmg', 3], ['wLeech', 3]],
    [['wCrit', 2], ['wDouble', 0.12]],
  ],
  polearms: [
    [['wDmg', 1], ['wPierce', 1]],
    [['wHit', 1], ['ac', 1]],
    [['wPierce', 1], ['wDmg', 2]],
    [['wHit', 1], ['hp', 15]],
    [['wDmg', 2], ['wPierce', 1]],
    [['wDouble', 0.05], ['ac', 1]],
    [['wPierce', 2], ['wDmg', 3]],
    [['wHit', 2], ['hp', 25]],
    [['wDmg', 3], ['wDouble', 0.1]],
    [['wPierce', 3], ['wDmg', 4]],
  ],
  bows: [
    [['wSpeed', 0.05], ['wHit', 1]],
    [['wDouble', 0.05], ['wDmg', 1]],
    [['wHit', 1], ['wSpeed', 0.05]],
    [['wCrit', 1], ['wDouble', 0.05]],
    [['wSpeed', 0.07], ['wDmg', 2]],
    [['wHit', 2], ['wDouble', 0.07]],
    [['wSpeed', 0.08], ['wCrit', 1]],
    [['wDmg', 2], ['wDouble', 0.08]],
    [['wSpeed', 0.1], ['wHit', 2]],
    [['wDouble', 0.15], ['wCrit', 2]],
  ],
  staves: [
    [['wEldritch', 0.05], ['wWard', 1]],
    [['wDmg', 1], ['wLeech', 1]],
    [['wEldritch', 0.05], ['wHit', 1]],
    [['wWard', 1], ['wDmg', 2]],
    [['wEldritch', 0.07], ['wLeech', 2]],
    [['wWard', 2], ['wHit', 1]],
    [['wEldritch', 0.08], ['wDmg', 2]],
    [['wWard', 2], ['wLeech', 3]],
    [['wEldritch', 0.1], ['wHit', 2]],
    [['wWard', 3], ['wEldritch', 0.15]],
  ],
  // Wisdom: every choice is between learning faster and something else.
  wisdom: [
    [['allXp', 0.05], ['gold', 0.05]],
    [['xp', 0.25], ['carry', 1]],
    [['allXp', 0.05], ['hp', 15]],
    [['offlineXp', 0.1], ['ward', 1]],
    [['allXp', 0.07], ['travel', 0.15]],
    [['allXp', 0.07], ['gold', 0.1]],
    [['offlineXp', 0.15], ['speedAll', 0.05]],
    [['allXp', 0.08], ['crit', 1]],
    [['offlineXp', 0.2], ['carry', 2]],
    [['allXp', 0.15], ['speedAll', 0.1]],
  ],
  dreaming: [
    [['speed', 0.15], ['dreamRest', 1]],
    [['xp', 0.1], ['double', 0.05]],
    [['sanityCost', -0.15], ['rare', 0.01]],
    [['dreamRest', 1], ['speed', 0.15]],
    [['double', 0.07], ['xp', 0.15]],
    [['sanityCost', -0.2], ['ward', 1]],
    [['speed', 0.15], ['rare', 0.02]],
    [['dreamRest', 2], ['double', 0.08]],
    [['sanityCost', -0.25], ['veil', 5]],
    [['double', 0.12], ['dreamRest', 3]],
  ],
  cartography: [
    [['travel', 0.15], ['xp', 0.1]],
    [['scout', 1], ['speed', 0.15]],
    [['travel', 0.15], ['double', 0.05]],
    [['scout', 1], ['carry', 1]],
    [['travel', 0.15], ['xp', 0.15]],
    [['scout', 1], ['double', 0.07]],
    [['travel', 0.15], ['speed', 0.15]],
    [['scout', 2], ['carry', 2]],
    [['travel', 0.15], ['double', 0.08]],
    [['travel', 0.15], ['scout', 3]],
  ],
  stealth: [
    [['speed', 0.15], ['safe', 0.25]],
    [['sneak', 1], ['xp', 0.1]],
    [['double', 0.05], ['safe', 0.25]],
    [['sneak', 1], ['scout', 1]],
    [['speed', 0.15], ['double', 0.07]],
    [['safe', 0.25], ['sneak', 1]],
    [['xp', 0.15], ['crit', 1]],
    [['double', 0.08], ['sneak', 1]],
    [['speed', 0.15], ['scout', 2]],
    [['sneak', 2], ['double', 0.12]],
  ],
  fellowship: [
    [['compHit', 1], ['compAc', 1]],
    [['compHp', 15], ['travel', 0.15]],
    [['compDmg', 1], ['compWits', 2]],
    [['compGuard', 0.15], ['compHeal', 2]],
    [['compHit', 1], ['travel', 0.15]],
    [['rally', 1], ['compHp', 25]],
    [['compDmg', 2], ['compAc', 2]],
    [['compWits', 3], ['travel', 0.15]],
    [['compHeal', 4], ['compGuard', 0.15]],
    [['compDmg', 3], ['compHp', 50]],
  ],
  maces: [
    [['wStun', 0.03], ['wDmg', 1]],
    [['wHit', 1], ['ac', 1]],
    [['wDmg', 2], ['wStun', 0.03]],
    [['wHit', 1], ['hp', 15]],
    [['wStun', 0.05], ['wDmg', 2]],
    [['wDouble', 0.05], ['ac', 1]],
    [['wDmg', 3], ['wStun', 0.05]],
    [['wHit', 2], ['hp', 25]],
    [['wStun', 0.07], ['wDouble', 0.1]],
    [['wDmg', 4], ['wStun', 0.1]],
  ],
  unarmed: [
    [['wSpeed', 0.05], ['wHit', 1]],
    [['sneak', 1], ['wDmg', 1]],
    [['wDouble', 0.05], ['wCrit', 1]],
    [['wHit', 1], ['wLeech', 1]],
    [['wSpeed', 0.07], ['sneak', 1]],
    [['wDmg', 2], ['wDouble', 0.07]],
    [['wCrit', 1], ['wSpeed', 0.08]],
    [['sneak', 1], ['wLeech', 2]],
    [['wDouble', 0.1], ['wDmg', 3]],
    [['wCrit', 2], ['sneak', 2]],
  ],
  trading: [
    [['haggle', 0.03], ['xp', 0.1]],
    [['tradeStock', 5], ['carry', 1]],
    [['speed', 0.15], ['gold', 0.05]],
    [['haggle', 0.03], ['double', 0.05]],
    [['tradeStock', 10], ['xp', 0.15]],
    [['haggle', 0.04], ['carry', 2]],
    [['speed', 0.15], ['gold', 0.05]],
    [['haggle', 0.05], ['double', 0.07]],
    [['tradeStock', 15], ['travel', 0.15]],
    [['haggle', 0.06], ['gold', 0.1]],
  ],
  sailing: [
    [['travel', 0.15], ['xp', 0.1]],
    [['speed', 0.15], ['safe', 0.25]],
    [['double', 0.05], ['travel', 0.15]],
    [['carry', 1], ['xp', 0.1]],
    [['travel', 0.15], ['speed', 0.15]],
    [['safe', 0.25], ['double', 0.07]],
    [['travel', 0.15], ['xp', 0.15]],
    [['carry', 2], ['speed', 0.15]],
    [['double', 0.08], ['travel', 0.15]],
    [['travel', 0.15], ['double', 0.12]],
  ],
  faith: [
    [['dreamRest', 1], ['ward', 1]],
    [['xp', 0.1], ['speed', 0.15]],
    [['eldritch', 0.05], ['dreamRest', 1]],
    [['ward', 1], ['save', 0.05]],
    [['speed', 0.15], ['hp', 15]],
    [['dreamRest', 2], ['eldritch', 0.07]],
    [['ward', 2], ['xp', 0.15]],
    [['double', 0.07], ['dreamRest', 2]],
    [['eldritch', 0.08], ['speed', 0.15]],
    [['ward', 3], ['dreamRest', 3]],
  ],
  lore: [
    [['sanityCost', -0.15], ['xp', 0.1]],
    [['veil', 5], ['double', 0.05]],
    [['speed', 0.15], ['ward', 1]],
    [['sanityCost', -0.15], ['eldritch', 0.05]],
    [['xp', 0.15], ['veil', 5]],
    [['double', 0.07], ['ward', 1]],
    [['sanityCost', -0.2], ['speed', 0.15]],
    [['eldritch', 0.07], ['xp', 0.15]],
    [['ward', 2], ['double', 0.08]],
    [['sanityCost', -0.25], ['allXp', 0.05]],
  ],
  ritualism: [
    [['save', 0.05], ['buffTime', 0.15]],
    [['sanityCost', -0.15], ['xp', 0.1]],
    [['speed', 0.15], ['buffTime', 0.15]],
    [['save', 0.07], ['ward', 1]],
    [['buffTime', 0.2], ['sanityCost', -0.15]],
    [['xp', 0.15], ['save', 0.07]],
    [['buffTime', 0.2], ['speed', 0.15]],
    [['sanityCost', -0.2], ['eldritch', 0.07]],
    [['save', 0.12], ['buffTime', 0.25]],
    [['buffTime', 0.3], ['sanityCost', -0.25]],
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
  blades: ['Point Control', 'Killing Edge', 'Clean Cuts', 'Bloodletter', 'Quick Draw', 'Riposte', 'Find the Gap', 'Deep Wounds', 'Flurry', 'Drinker of Blood', 'Master of the Point', 'Whirling Steel', 'Heavy Hand', 'Surgeon of War', 'Twin Strikes', 'Duellist', 'Brutal Edge', 'Crimson Tide', 'The Thousand Cuts', 'Dance of Blades'],
  polearms: ['Weighted Head', 'Armour-Breaker', 'Long Reach', 'Braced Stance', 'Hook and Pull', 'Heavy Thrust', 'Steady Haft', 'Hardened', 'Cleaving Arc', 'Through the Gap', 'Sweep', 'Phalanx', 'Skewer', 'Crushing Blow', 'Long Arm of the Law', 'Iron Frame', 'Executioner\'s Swing', 'Double Thrust', 'Can-Opener', 'The Last Thrust'],
  bows: ['Quick Nock', 'Steady Aim', 'Double Shot', 'Broadheads', 'Eagle Eye', 'Rapid Fire', 'Vital Shot', 'Volley', 'Arrow Storm', 'Heavy Draw', 'True Aim', 'Twin Arrows', 'Lightning Release', 'Through the Eye', 'Piercing Shot', 'Rain of Arrows', 'Endless Quiver', 'Dead Eye', 'Hail of Arrows', 'One Arrow, One Kill'],
  staves: ['Warding Grain', 'Calm Grip', 'Weighted Tip', 'Drain', 'Banishing Strike', 'Focused Mind', 'Rune-Carved', 'Heavy Staff', 'Elder Knots', 'Life-Thief', 'Mind Like Oak', 'Sure Blow', 'Sigil of Unmaking', 'Heavy Rune', 'Still Mind', 'Vampiric Grain', 'Bane of Things Below', 'Measured Strike', 'Unshakeable', 'The Elder Staff'],
  wisdom: ['Quick Study', 'Coin Sense', 'Inner Voice', 'Well-Packed', 'Lessons Learned', 'Hardy', 'Dreams of Practice', 'Clear Mind', 'Broad Learning', 'Seasoned Traveller', 'Polymath', "Merchant's Instinct", 'Sleep-Learning', 'Efficient Habits', 'Old Hand', 'Lucky Strike', 'Night School', 'Long Experience', 'Sage of Aldmark', 'Master of All Trades'],
  hunting: ['Quiet Feet', 'Clean Kill', 'Tracker\'s Lore', 'Game Bag', 'Wind in Your Face', 'Glimmer in the Grass', 'Twin Quarry', 'Old Hunter\'s Tales', 'Swift Stalk', 'Skinner\'s Satchel', 'Bountiful Hunt', 'Starlit Trail', 'Arrow on the String', 'Way of the Wild', 'Brace of Game', 'Hunter\'s Frame', 'Ghost Stalker', 'The Elk That Shines', 'Lord of the Hunt', 'The Swift Kill'],
  archaeology: ['Careful Brush', 'Rich Strata', 'Antiquarian\'s Notes', 'Finds Tray', 'Practised Digging', 'Lost Pages', 'Twin Finds', 'Field Journal', 'Quick Trowel', 'Specimen Crates', 'Hoard Layer', 'Things Better Left Buried', 'Swift Excavation', 'Scholar of Ruins', 'Double Cache', 'Expedition Mules', 'Shovel Lightning', 'The Forbidden Shelf', 'Unearther of Empires', 'The Patient Dig'],
  dreaming: ['Deep Breath', 'Gentle Slumber', 'Dream Journal', 'Twice-Dreamed', 'Calm Descent', 'Onyx Glint', 'Restful Sleep', 'Swift Dreamer', 'Rich Dreams', 'Lore of Ulthar', 'Steady Dreamer', 'Dream-Warded', 'Running Dreams', 'Leng\'s Treasures', 'Sleep of the Just', 'Dream Twice Over', 'Untroubled Dreamer', 'The Veil Is Thin', 'Bounty of Dreams', 'Sleep Like the Dead'],
  carpentry: ['Sharp Saw', 'Measure Twice', 'Joiner\'s Lore', 'Two from One', 'Steady Plane', 'Offcut Saver', 'Strapping', 'Woodwright\'s Lore', 'Quick Joints', 'Paired Pieces', 'Careful Cuts', 'Fletcher\'s Eye', 'Master\'s Pace', 'Grand Designs', 'Twice the Work', 'Waste Nothing', 'Lightning Lathe', 'Panniers', 'Master Carpenter', 'Not a Shaving Wasted'],
  stealth: ['Soft Steps', 'Innocent Face', 'Backstab', 'Thieves\' Cant', 'Deep Pockets', 'Unseen', 'Knife in the Dark', 'Eyes on the Road', 'Quick Hands', 'Two Purses', 'Vanish', 'Assassin\'s Mark', 'Master Thief', 'Killing Blow', 'Second Purse', 'Shadow Blade', 'Fleet Footed', 'Watcher on the Road', 'Death from Nowhere', 'Prince of Thieves'],
  cartography: ['Shortcut', 'Field Notes', 'Read the Road', 'Quick Survey', 'Known Paths', 'Twin Copies', 'Pathfinder', 'Map Case', 'Swift Feet', 'Master Draughtsman', 'Wayfinder', 'Spare Copies', 'Fast Roads', 'Quick Hand', 'Guide of Aldmark', 'Atlas Satchel', 'Running Road', 'Second Edition', 'Map of Everything', 'Eyes of the World'],
  fellowship: ['Drilled Together', 'Shield Wall', 'Shared Rations', 'Road-Wise', 'Sparring Partner', 'Steady Words', 'Bodyguard', 'Field Dressing', 'Practised Tactics', 'Shortcuts', 'Never Leave a Friend', 'Hearty Fellow', 'Brothers in Arms', 'Back to Back', 'Courage Shared', 'Long Road Home', 'Tender Mercies', 'Stand in Front', 'Legendary Duo', 'Unbreakable Bond'],
  gravedigging: ['Strong Back', 'Two Graves at Once', "Sexton's Lore", 'Burial Sack', 'Practised Spade', 'Saintly Glint', 'Deep Plots', 'Parish Records', 'Quick Shovel', 'Body Bag', 'Mass Grave', 'Holy Bones', 'Night Shift', 'Resurrection Man', 'Family Vault', 'Coffin Cart', 'Lightning Spade', 'The Saint Provides', 'Lord of the Barrows', 'Six Feet in a Breath'],
  tidecombing: ['Quick Feet', 'Double Haul', 'Tide Tables', 'Wet Pockets', 'Low-Tide Stride', 'Golden Lump', 'Twin Finds', 'Old Beachcomber', 'Sand Sifter', 'Driftwood Pack', 'Rich Strandline', 'Grey Gold', 'Wave-Runner', 'Salt in the Blood', 'The Sea Gives Twice', 'Fisherman\'s Creel', 'Running Tide', 'Treasure of the Deep', 'Spring Tide', 'Lord of the Strand'],
  tailoring: ['Quick Needle', 'Thrifty Cutting', "Tailor's Notes", 'Two from One', 'Steady Seams', 'Offcuts', 'Warding Stitch', "Draper's Lore", 'Fast Hems', 'Twin Garments', 'Waste Not', 'Sigil Thread', "Master's Pace", "Couturier's Lore", 'Double Bolt', 'Cut to the Thread', 'Lightning Needle', 'Woven Wards', 'Master Tailor', 'Not a Thread Wasted'],
  inscription: ['Quick Quill', 'Saved Ink', "Scribe's Notes", 'Second Copy', 'Steady Hand', 'Blotted Not', 'Burning Words', 'Library Lore', 'Running Script', 'Twin Scrolls', 'No Spilt Ink', 'Words of Power', "Master's Pace", "Archivist's Lore", 'Fair Copies', 'Palimpsest', 'Lightning Pen', 'True Names', 'Master Scribe', 'Not a Drop Wasted'],
  brewing: ['Quick Mash', 'Saved Grain', "Brewer's Notes", 'Double Batch', 'Steady Boil', 'Spent Grain', 'Strong Stuff', "Cellarer's Lore", 'Fast Ferment', 'Overflowing Cask', 'Clean Brew', 'Hearty Ale', "Master's Pace", "Alewife's Lore", 'Twin Casks', 'Second Runnings', 'Lightning Brew', 'Potent Spirits', 'Master Brewer', 'Not a Drop Spilt'],
  trading: ['Sharp Bargain', 'Ledger Sense', 'Contacts', 'Mule', 'Quick Sale', 'Merchant\'s Eye', 'Shrewd Haggler', 'Double Deal', 'Warehouses', 'Trade Secrets', 'Silver Tongue', 'Wagon', 'Fast Talk', 'Lucky Purse', 'Master Haggler', 'Two for One', 'Monopoly', 'Caravan Roads', 'Merchant Prince', 'Gold Breeds Gold'],
  sailing: ['Fair Winds', 'Sea Legs', 'Quick Rigging', 'Know the Watch', 'Double Wage', 'Following Sea', 'Sea Chest', 'Old Salt', 'Full Sail', 'Swift Hands', 'Smuggler\'s Luck', 'Bonus Pay', 'Trade Winds', 'Salt-Sense', 'Sea Locker', 'Swift Rigging', 'Rich Cargo', 'Clipper', 'Ocean Road', "Captain's Share"],
  faith: ['Gentle Prayer', 'Shield of Faith', 'Novice\'s Zeal', 'Swift Devotion', 'Righteous Fury', 'Quiet Prayer', 'Armour of Faith', 'Thrifty Rites', 'Swift Litany', 'Steadfast Body', 'Psalms of Comfort', 'Smite the Unclean', 'Sanctified Mind', 'Devout', 'Double Blessing', 'Hymns of Peace', 'Hammer of the Gods', 'Untiring Prayer', 'Saint\'s Ward', 'Grace'],
  lore: ['Guarded Reading', 'Quick Learner', 'Thin Pages', 'Doubled Notes', 'Speed-Reader', 'Iron Mind', 'Careful Reader', 'Know Thy Foe', 'Forbidden Studies', 'Second Sight', 'Annotations', 'Mind Like a Vault', 'Hardened Mind', 'Skimmer', 'Bane of the Outer Dark', 'Deep Study', 'Warded Library', 'Copious Notes', 'The Unbroken Reader', 'Polymath of the Abyss'],
  ritualism: ['Spare Offerings', 'Lingering Blessing', 'Steady Rites', 'Novice of the Circle', 'Quick Chalk', 'Long Echo', 'Thrifty Altar', 'Salt Ward', 'Enduring Rites', 'Steady Mind', 'Adept of the Circle', 'Second Offering', 'Long Blessing', 'Swift Rites', 'Iron Will', 'Bane of the Outsiders', 'Nothing Wasted', 'Eternal Rite', 'Echoes of Power', 'Unbroken Circle'],
  maces: ['Stunning Blow', 'Heavy Head', 'Steady Grip', 'Braced', 'Crushing Weight', 'Ringing Blow', 'Firm Footing', 'Thick Skin', 'Concussive Force', 'Bone-Breaker', 'Flail of Blows', 'Iron Guard', 'Skull-Cracker', 'Daze', 'Sure Swing', 'Hardened Body', 'Earthshaker', 'Twin Blows', 'Hammer of Doom', 'The Last Bell'],
  unarmed: ['Quick Fists', 'Steady Jab', 'Sucker Punch', 'Heavy Hands', 'Flurry', 'Pressure Points', 'True Strike', 'Bloodied Knuckles', 'Lightning Jab', 'Ambusher', 'Iron Fists', 'Combination', 'Nerve Strike', 'Blinding Speed', 'Death from the Shadows', 'Bloody Hands', 'Thousand Fists', 'Fists of Iron', 'One-Inch Punch', 'The Silent Hand'],
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
    wisdom: PERK_TEMPLATES.wisdom,
    blades: PERK_TEMPLATES.blades,
    polearms: PERK_TEMPLATES.polearms,
    bows: PERK_TEMPLATES.bows,
    staves: PERK_TEMPLATES.staves,
    hunting: PERK_TEMPLATES.gathering,
    archaeology: PERK_TEMPLATES.gathering,
    dreaming: PERK_TEMPLATES.dreaming,
    carpentry: PERK_TEMPLATES.production([['carry', 1], ['hit', 1], ['carry', 2]]),
    stealth: PERK_TEMPLATES.stealth,
    cartography: PERK_TEMPLATES.cartography,
    gravedigging: PERK_TEMPLATES.gathering,
    tidecombing: PERK_TEMPLATES.gathering,
    tailoring: PERK_TEMPLATES.production([['ward', 1], ['ward', 1], ['ward', 2]]),
    inscription: PERK_TEMPLATES.production([['scrollPower', 0.15], ['scrollPower', 0.15], ['scrollPower', 0.2]]),
    brewing: PERK_TEMPLATES.production([['potency', 0.1], ['heal', 0.1], ['potency', 0.15]]),
    trading: PERK_TEMPLATES.trading,
    sailing: PERK_TEMPLATES.sailing,
    faith: PERK_TEMPLATES.faith,
    lore: PERK_TEMPLATES.lore,
    ritualism: PERK_TEMPLATES.ritualism,
    maces: PERK_TEMPLATES.maces,
    unarmed: PERK_TEMPLATES.unarmed,
  };
  const trees = {};
  for (const [skill, tiers] of Object.entries(layout)) {
    const first = tiers.map((options, t) => options.map(([effect, value], o) => ({ name: PERK_NAMES[skill][t * 2 + o], effect, value })));
    const second = first.map(options => options.map(p => Object.assign({}, p, { name: `${p.name} II` })));
    trees[skill] = first.concat(second).slice(0, MAX_LEVEL / PERK_EVERY);
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
    // Completed relic collections, rites, brews and scrolls grant the same kinds of bonus as perks.
    if (PERK_EFFECTS[effect].scope !== 'skill') total += this.relicBonus(effect) + this.buffBonus(effect);
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
    return Math.max(1, Math.round(action.sanityCost * (1 + Math.max(-MAX_SANITY_COST_CUT, this.perk('sanityCost', skill)))));
  },
});
