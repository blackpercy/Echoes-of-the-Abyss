// Content for the living world: time and tide, road events, races and backgrounds, companions,
// the cult, expeditions, more people and quests, endings that change the world, the bestiary and achievements.

// --- Time and tide ---
const DAY_MS = 20 * 60 * 1000;       // one in-game day lasts 20 real minutes
const NIGHT_START = 2 / 3;           // the last third of the day is night
const TIDE_MS = 8 * 60 * 1000;       // a full tide cycle
const LOW_TIDE_SHARE = 0.4;          // the first 40% of the cycle is low tide
const STARS_RIGHT_EVERY = 7;         // the stars are right on the night of every seventh day
const NIGHT_VEIL_BONUS = 15;         // the Veil is thinner at night

// --- Races and backgrounds (chosen when you begin) ---
const RACES = {
  human: { name: 'Human', icon: '🧑', desc: 'Adaptable and ambitious: +10% experience in every skill.' },
  dwarf: { name: 'Dwarf', icon: '🧔', desc: '+1 AC and mining is 15% faster. The dwarves of Ironhold call you kin and give you 20% off at the smithy.' },
  elf: { name: 'Elf', icon: '🧝', desc: 'Old minds bend but rarely break: +2 to sanity saves. Foraging is 15% faster.' },
  halfling: { name: 'Halfling', icon: '🧒', desc: '+3 pack slots, because pockets. Lucky: you reroll natural 1s on attack rolls.' },
  tiefling: { name: 'Tiefling', icon: '😈', desc: 'Infernal blood thins the Veil: you see through it below 50 sanity instead of 40. +1 to hit against eldritch beings.' },
};

const BACKGROUNDS = {
  fisher: { name: 'Fisher', icon: '🎣', desc: 'You grew up on the boats. Fishing starts at level 5 and you carry a tinderbox.', skills: { fishing: 5 }, items: { tinderbox: 1 } },
  acolyte: { name: 'Acolyte', icon: '📿', desc: 'Raised by the Silent Order. Occultism starts at level 5 and the Abbey apothecary gives you 20% off, but Saltmire distrusts you (+10% at Marsh\'s store).', skills: { occultism: 5 }, items: { calming_tea: 3 } },
  soldier: { name: 'Soldier', icon: '🪖', desc: 'You have stood in a shield wall. Combat starts at level 3 and you carry an Iron Sword.', skills: { combat: 3 }, items: { iron_sword: 1 } },
  scholar: { name: 'Scholar', icon: '📚', desc: 'You read the wrong books at university. Alchemy starts at level 5 and you have +1 to sanity saves.', skills: { alchemy: 5 }, items: { calming_tea: 2 } },
  smuggler: { name: 'Smuggler', icon: '🏴‍☠️', desc: 'You know every cove on the coast. You start with 150 gold and a lantern, and the ferryman never charges you.', gold: 150, items: { lantern: 1 } },
};

// --- Abilities unlocked by madness ---
const MADNESS_ABILITIES = [
  null,
  { name: 'Speak with the Dead', desc: 'The restless dead of Blackwood Graveyard will talk to you.' },
  { name: 'Walk the Dream Roads', desc: 'While you see through the Veil, you travel 30% faster.' },
  { name: 'Feast on Fear', desc: 'Slaying an eldritch being restores as much sanity as it could have taken from you.' },
  { name: "Dreamer's Favour", desc: 'Eldritch sanity saves are 3 easier for you.' },
  { name: 'One of Them', desc: 'Eldritch beings hesitate to strike their own: they have −2 to hit you.' },
];

// --- New monsters for the expeditions ---
MONSTERS.high_priest = { name: 'High Priest of Dagon', icon: '🧜', boss: true, eldritch: { dc: 14, loss: 6 }, hp: 260, ac: 15, hit: 9, dmg: '2d8+2', speed: 2600, xp: 320, gold: [150, 300], drops: [{ item: 'cultist_text', chance: 1, qty: [2, 3] }, { item: 'necronomicon_page', chance: 0.2, qty: [1, 1] }] };
MONSTERS.stone_horror = { name: 'Stone Horror', icon: '🗿', hp: 180, ac: 17, hit: 7, dmg: '2d8', speed: 3000, xp: 150, gold: [20, 60], drops: [{ item: 'adamantine_ore', chance: 0.4, qty: [1, 3] }] };
MONSTERS.thing_below = { name: 'The Thing Below', icon: '🪱', boss: true, eldritch: { dc: 15, loss: 7 }, hp: 420, ac: 16, hit: 9, dmg: '3d6+3', speed: 2800, xp: 520, gold: [300, 600], drops: [{ item: 'adamantine_bar', chance: 1, qty: [2, 4] }] };

// --- Expeditions: a string of fights with no rest in between, and a treasure at the end ---
const EXPEDITIONS = {
  catacomb_depths: {
    name: 'The Catacomb Depths', location: 'drowned_catacombs', level: 18,
    desc: 'Follow the hymns down through five flooded chambers to the altar of the High Priest.',
    rooms: ['deepling', 'cultist_priest', 'shoggoth_larva', 'deepling', 'high_priest'],
    loot: { gold: [300, 600], items: [{ item: 'necronomicon_page', chance: 0.6, qty: [1, 2] }, { item: 'clarity_draught', chance: 0.8, qty: [1, 3] }, { item: 'deepling_trident', chance: 0.15, qty: [1, 1] }] },
  },
  sealed_shaft: {
    name: 'The Sealed Shaft', location: 'deep_mines', level: 20, requires: { flags: ['shaft'] },
    desc: 'Break the dwarven seals and descend to whatever the miners woke.',
    rooms: ['duergar', 'duergar', 'stone_horror', 'duergar', 'thing_below'],
    loot: { gold: [400, 800], items: [{ item: 'adamantine_bar', chance: 1, qty: [3, 6] }, { item: 'explorers_pack', chance: 0.25, qty: [1, 1] }, { item: 'adamantine_pickaxe', chance: 0.3, qty: [1, 1] }] },
  },
  sunken_temple: {
    name: 'The Sunken Temple', location: 'the_abyss', level: 42,
    desc: 'Swim through the drowned city to the throne of Father Dagon.',
    rooms: ['star_spawn', 'nightgaunt', 'star_spawn', 'dagon'],
    loot: { gold: [3000, 6000], items: [{ item: 'elder_elixir', chance: 1, qty: [2, 4] }, { item: 'dagon_scale', chance: 0.2, qty: [1, 1] }, { item: 'bag_of_holding', chance: 0.15, qty: [1, 1] }] },
  },
};

// --- Companions ---
// Sane companions leave you if their own sanity breaks; Meg only gets angrier.
const COMPANIONS = {
  gorim: { name: 'Gorim Ironfist', icon: '🪓', desc: 'A dwarven sellsword with a scarred face and no sense of humour.', hp: 70, ac: 15, hit: 5, dmg: '1d10+2', speed: 2800, wits: 0, home: 'ironhold' },
  tobias: { name: 'Brother Tobias', icon: '🙏', desc: 'A young monk of the Silent Order. He fights poorly but tends your wounds (heals you 4 each turn). He will not follow anyone who is Unmoored or worse.', hp: 45, ac: 12, hit: 3, dmg: '1d6', speed: 3000, wits: 5, heals: 4, maxMadness: 2, home: 'silent_abbey' },
  meg: { name: 'Mad Meg', icon: '🧙‍♀️', desc: 'She laughs at things that are not there. When her mind breaks she does not run; she gets worse (+2 damage each time).', hp: 50, ac: 13, hit: 6, dmg: '2d4+2', speed: 2400, wits: 0, mad: true, home: 'saltmire' },
};
const COMPANION_TARGET_CHANCE = 0.3;

// --- Your own cult (the third path) ---
const CULT_TASKS = {
  tithe: { name: 'Collect tithes', icon: '💰', every: 60000, gold: 4 },
  whispers: { name: 'Listen at the shore', icon: '📜', every: 90000, items: { whispering_fragment: 1 } },
  fishing: { name: 'Work the boats', icon: '🎣', every: 60000, items: { raw_deep_cod: 1 } },
  foraging: { name: 'Gather in the graveyard', icon: '🌿', every: 60000, items: { grave_moss: 1 } },
};
const CULT_SHRINE = 'saltmire';
const CULT_RECRUIT_GOLD = 80;
const CULT_RECRUIT_SANITY = 5;

// --- More people ---
Object.assign(NPCS, {
  brunhild: {
    name: 'Brunhild Stonebeard', icon: '⚒️', title: 'master smith of Ironhold', location: 'ironhold',
    lines: [
      { if: { race: 'dwarf' }, text: '"Kinsman! Sit, sit. The forge is warm and the ale is warmer. What do you need?"' },
      { if: { quests: { brunhild_below: 'done' } }, text: '"The shaft is quiet. My people sleep again. You have a friend in Ironhold forever."' },
      { text: '"Pay first, ask later, and never ask about the deep tunnels." She hammers on without looking up.' },
    ],
    interactions: [
      { id: 'rumours', label: 'Ask about the mountains', result: '"The Deep Mines run under the whole range. Abandoned, now. And there is a crater north of here where nothing grows right."', gain: { reveal: ['deep_mines', 'crater'] } },
    ],
  },
  gorim_npc: {
    name: 'Gorim Ironfist', icon: '🪓', title: 'sellsword, for hire', location: 'ironhold', if: { noCompanion: 'gorim' },
    lines: [{ text: '"Two hundred and fifty gold and I will stand in front of whatever wants to eat you. Fair price."' }],
    interactions: [{ id: 'hire', label: 'Hire Gorim', cost: { gold: 250 }, gain: { companion: 'gorim' }, result: '"Good. Try not to die before I have spent it."' }],
  },
  maud: {
    name: 'Sister Maud', icon: '📚', title: 'keeper of the Forbidden Library', location: 'silent_abbey',
    lines: [
      { if: { veil: true }, text: 'Sister Maud closes a book very quickly. "You see the marginalia too, then. Do not read them aloud."' },
      { if: { background: 'acolyte' }, text: '"You have come home, acolyte. The library remembers you."' },
      { text: '"Mind the third shelf. And the fourth. Honestly, mind all of them."' },
    ],
    interactions: [
      { id: 'rumours', label: 'Ask about old maps', result: 'She unrolls a map that is not quite the same shape each time you look at it. "There is a grove in the far west where the trees came from somewhere else."', gain: { reveal: ['dreaming_grove'] } },
    ],
  },
  tobias_npc: {
    name: 'Brother Tobias', icon: '🙏', title: 'willing to travel', location: 'silent_abbey', if: { noCompanion: 'tobias', maxMadness: 2 },
    lines: [{ text: '"The Abbot says I should see the world. And that the world should be seen with someone holding a bandage. Will you have me? A donation to the Order is customary."' }],
    interactions: [{ id: 'hire', label: 'Take Tobias with you', cost: { gold: 300 }, gain: { companion: 'tobias' }, result: '"Bless you. I will pray for both of us."' }],
  },
  ysolde: {
    name: 'Ysolde the Hunter', icon: '🏹', title: 'of the Blackwood', location: 'blackwood',
    lines: [
      { if: { quests: { wolf_season: 'done' } }, text: '"The wolves have learned to fear you. So have I, a little."' },
      { text: 'A woman in green leathers lowers her bow. "The wolves have grown bold since the star fell. Bigger, too."' },
    ],
    interactions: [
      { id: 'rumours', label: 'Ask about the forest', result: '"North through the trees lies the old graveyard, and past it the abbey on the hill. Beyond that, the crater. Don\'t go to the crater."', gain: { reveal: ['graveyard', 'silent_abbey', 'crater'] } },
    ],
  },
  peaslee: {
    name: 'Professor Peaslee', icon: '🔭', title: 'of Miskatonic, lately', location: 'crater',
    lines: [
      { if: { veil: true }, text: '"You can see them too? The cone-shaped ones? They took me for five years, you know. I wrote a great deal of their history. In my own hand, which is the troubling part."' },
      { text: 'A thin man with a theodolite and a nervous twitch. "Fascinating, fascinating! The ore is not of this world. Not of any world I can name."' },
    ],
  },
  restless_dead: {
    name: 'The Restless Dead', icon: '👻', title: 'speak only to the touched', location: 'graveyard', if: { minMadness: 1 },
    lines: [{ text: 'Voices rise from the barrows, all talking at once, until one of them notices you can hear. "Listen. Listen. We know things."' }],
    interactions: [
      { id: 'listen', label: 'Speak with the Dead', cost: { sanity: 8 }, gain: { items: { whispering_fragment: 3 }, xp: { occultism: 80 } }, result: 'They tell you how they died. Some of the stories have not happened yet.' },
      { id: 'market', label: 'Ask where the ghouls trade', result: '"Under the hill. Under the leaning stone. They will want someone to vouch for you."', gain: { reveal: ['market'] } },
    ],
  },
  meg_npc: {
    name: 'Mad Meg', icon: '🧙‍♀️', title: 'laughing at the harbour wall', location: 'saltmire', if: { minMadness: 2, noCompanion: 'meg' },
    lines: [{ text: '"You hear it too! The singing! Take me with you, sweetling, I know where all the teeth are buried."' }],
    interactions: [{ id: 'hire', label: 'Take Meg along', cost: { gold: 150 }, gain: { companion: 'meg' }, result: 'She cackles and falls in step beside you, humming a hymn no church ever sang.' }],
  },
  ferryman: {
    name: 'Old Barnabas', icon: '⛵', title: 'the ferryman', location: 'saltmire_shore',
    lines: [
      { if: { background: 'smuggler' }, text: '"You again. No charge for old friends. Just don\'t tell the Marshes."' },
      { if: { lowTide: true }, text: '"Tide\'s out. You could walk to the reef if you fancy wet boots. Most don\'t come back to complain."' },
      { text: '"Fifty gold to the reef. Price of not drowning."' },
    ],
  },
});

// Rumours from people you already know.
NPCS.zadok.interactions.push({ id: 'rumours', label: 'Ask about the coast', result: '"Out past the shore there\'s Devil\'s Reef. And under the temple, the old catacombs. Don\'t go to either."', gain: { reveal: ['saltmire_shore', 'devils_reef', 'drowned_catacombs'] } });
NPCS.zadok.lines.unshift({ if: { background: 'smuggler', veil: false }, text: '"Seen ye on the docks before, haven\'t I? Never mind. Never mind. I don\'t remember faces."' });
NPCS.abbot.lines.splice(1, 0, { if: { background: 'acolyte', maxMadness: 2 }, text: '"Welcome home, acolyte. The Order has need of you."' });

// --- More quests ---
Object.assign(QUESTS, {
  brunhild_ore: {
    name: 'Fuel for the Forge', giver: 'brunhild',
    offer: '"Bars. Iron bars. Ten of them. My apprentices are useless and the orders keep coming."',
    objective: { type: 'deliver', items: { iron_bar: 10 } },
    done: '"Good, honest work. Here, a blade from my own anvil."',
    reward: { gold: 150, items: { silver_sword: 1 } },
  },
  brunhild_shaft: {
    name: 'The Sealed Shaft', giver: 'brunhild', requires: { quests: { brunhild_ore: 'done' } },
    offer: '"Duergar raiders have been coming up from the old tunnels. Kill eight of them, and I will tell you where they are coming from."',
    objective: { type: 'kill', monster: 'duergar', count: 8 },
    done: '"They come from the sealed shaft. We sealed it for a reason. I will give you the rune-key, but do not say I did not warn you."',
    reward: { gold: 400, flags: ['shaft'] },
  },
  brunhild_below: {
    name: 'What Woke Below', giver: 'brunhild', requires: { quests: { brunhild_shaft: 'done' } },
    offer: '"Go down. Kill whatever is at the bottom. Bring me back proof, or do not come back."',
    objective: { type: 'expedition', expedition: 'sealed_shaft' },
    done: '"You actually did it." She sets down her hammer for the first time since you met her.',
    reward: { gold: 1500, items: { explorers_pack: 1 } },
  },
  lost_pages: {
    name: 'Lost Pages', giver: 'maud',
    offer: '"A page from the Necronomicon was stolen from us. Any page will do. I am not proud."',
    objective: { type: 'deliver', items: { necronomicon_page: 1 } },
    done: '"Thank you. Do not ask me what is on it. Take this kit, it belonged to a brother who no longer needs it."',
    reward: { items: { alchemy_kit: 1 }, xp: { occultism: 400 } },
  },
  depths_cleansed: {
    name: 'The Catacomb Depths', giver: 'maud', requires: { quests: { lost_pages: 'done' } },
    offer: '"The High Priest of Dagon keeps a library of his own at the bottom of the catacombs. I would very much like it burned."',
    objective: { type: 'expedition', expedition: 'catacomb_depths' },
    done: '"Burned? All of it? Good. Good. Here, for your trouble and your nightmares."',
    reward: { gold: 800, items: { clarity_draught: 3 } },
  },
  wolf_season: {
    name: 'Wolf Season', giver: 'ysolde',
    offer: '"Ten dire wolves. I will pay, and I will throw in a pack I took off a traveller who did not need it any more."',
    objective: { type: 'kill', monster: 'dire_wolf', count: 10 },
    done: '"Ten. Not bad for a city-dweller. Here."',
    reward: { gold: 100, items: { leather_backpack: 1 } },
  },
  star_samples: {
    name: 'Samples from the Star', giver: 'peaslee',
    offer: '"Five pieces of starmetal ore, if you would be so kind. For science. For the university. For my sanity, which is to say for science."',
    objective: { type: 'deliver', items: { starmetal_ore: 5 } },
    done: '"Marvellous! It sings, did you know? Very faintly. In a minor key."',
    reward: { gold: 2500, xp: { occultism: 1000 } },
  },
  cult_found: {
    name: 'A Congregation of One', giver: 'man', requires: { minMadness: 2 }, path: 'prophet',
    offer: '"Why serve the Order, or the Dreamer, when you could be served? Bring me three cultist texts and I will show you how to write your own scripture."',
    objective: { type: 'deliver', items: { cultist_text: 3 } },
    done: '"There. Your gospel. The desperate of Saltmire will come to you now. Build a shrine in town, and they will work for you while you wander."',
    reward: { cult: true, xp: { occultism: 400 } },
  },
  cult_grow: {
    name: 'The Faithful', giver: 'man', requires: { quests: { cult_found: 'done' } }, path: 'prophet',
    offer: '"A prophet with no flock is just a madman. Gather six followers."',
    objective: { type: 'followers', count: 6 },
    done: '"Six voices chanting your name. Do you feel it? That is what the gods feel."',
    reward: { gold: 2000 },
  },
  cult_usurp: {
    name: 'The Third Door', giver: 'man', requires: { quests: { cult_grow: 'done' }, minMadness: 2 }, path: 'prophet',
    offer: '"The Order wants Dagon dead. The Dreamer wants him obeyed. You want his throne. Go and take it."',
    objective: { type: 'kill', monster: 'dagon', count: 1 },
    done: 'Father Dagon falls, and the deep ones turn to look at you. Slowly, one by one, they kneel.',
    reward: { gold: 5000, ending: 'prophet' },
  },
});

ENDINGS.prophet = {
  title: 'The Prophet of Saltmire',
  text: 'Neither the Order nor the Dreamer. The deep ones sing your name now, and so does Saltmire. Your followers paint your sigil on every door. Somewhere far below, the Dreamer stirs, irritated, as a small and stubborn mind takes something that was meant for it.',
};

// --- How endings change the world ---
const WORLD_CHANGES = {
  order: {
    saltmire: { desc: 'The shutters are open now and children play on the quay. The fish the boats bring in have the right number of eyes. People still do not like questions, but they smile when they say so.' },
    saltmire_shore: { desc: 'The fog has lifted from the kelp banks. Crabs and smugglers remain, but nothing crawls out of the water at night any more.', monsters: ['giant_crab', 'smuggler'] },
  },
  dreamer: {
    saltmire: { desc: 'Robed figures of the Esoteric Order of Dagon walk the streets openly now, and the townsfolk bow as you pass. The old general store has become the Order\'s hall.', shop: 'esoteric_order' },
    saltmire_shore: { desc: 'The deepling spawn sit on the rocks and watch you with wet, adoring eyes. None of them will raise a claw against you.', monsters: ['giant_crab', 'smuggler'] },
  },
  prophet: {
    saltmire: { desc: 'Your sigil is painted on every door in Saltmire. Your followers keep the streets, and the shops give their prophet whatever is asked.', shop: 'general_store', kin: true },
  },
};

SHOPS.esoteric_order = {
  name: 'Hall of the Esoteric Order',
  keeper: 'A priest in green robes bows low. "Herald. The Order provides."',
  stock: [
    { item: 'bread', price: 4 }, { item: 'hatchet', price: 20 }, { item: 'fishing_rod', price: 20 }, { item: 'sickle', price: 20 },
    { item: 'tinderbox', price: 25 }, { item: 'lantern', price: 100 }, { item: 'clarity_draught', price: 150 },
    { item: 'necronomicon_page', price: 400 }, { item: 'elder_elixir', price: 900 }, { item: 'deepling_rod', price: 30000 },
  ],
};

// --- Road events ---
// "region" limits an event to roads touching those places. Choices may need items or gold,
// or ask for a skill check: d20 + skill level ÷ 4 against a DC.
const EVENT_CHANCE = 0.35;
const ROAD_EVENTS = {
  bandits: {
    title: 'Bandits on the Road', icon: '🗡️', if: { veil: false },
    text: 'Three figures step out from behind a fallen tree. One of them has a crossbow, and it is pointed at you.',
    choices: [
      { label: 'Fight them', outcome: { fight: 'smuggler', text: 'Steel rings out on the road.' } },
      { label: 'Pay them off', need: { gold: 25 }, outcome: { lose: { gold: 25 }, text: 'They take your gold and vanish into the trees, laughing.' } },
      { label: 'Stare them down', check: { skill: 'combat', dc: 12 }, outcome: { text: 'Something in your face makes them reconsider. They melt away.', gain: { xp: { combat: 30 } } }, fail: { fight: 'smuggler', text: 'They do not reconsider.' } },
    ],
  },
  pedlar: {
    title: 'A Hooded Pedlar', icon: '🧳',
    text: 'A hunched pedlar blocks the road with a cart of jars. "Trade, traveller? Whispers for comfort. Fair, fair."',
    choices: [
      { label: 'Trade 5 Whispering Fragments for 2 Calming Elixirs', need: { items: { whispering_fragment: 5 } }, outcome: { lose: { items: { whispering_fragment: 5 } }, gain: { items: { calming_elixir: 2 } }, text: 'The jars are cold. The pedlar does not seem to breathe.' } },
      { label: 'Buy a Healing Draught for 40 gold', need: { gold: 40 }, outcome: { lose: { gold: 40 }, gain: { items: { healing_draught: 1 } }, text: '"Wise, wise." The pedlar counts the coins twice.' } },
      { label: 'Walk on', outcome: { text: 'When you look back, the road behind you is empty.' } },
    ],
  },
  wreck: {
    title: 'Wreck on the Shingle', icon: '🛶', region: ['saltmire_shore', 'devils_reef', 'saltmire', 'lighthouse'],
    text: 'A fishing boat lies broken on the stones. The nets are still full, and something in them is still moving.',
    choices: [
      { label: 'Search the wreck', check: { skill: 'fishing', dc: 10 }, outcome: { gain: { gold: 30, items: { raw_deep_cod: 3 } }, text: 'You find a purse of coins and a good catch.' }, fail: { lose: { hp: 8 }, text: 'Something in the nets bites you and slithers away.' } },
      { label: 'Leave it be', outcome: { text: 'Wise. Probably.' } },
    ],
  },
  cultist_camp: {
    title: 'Cultist Camp', icon: '🔥', region: ['blackwood', 'graveyard', 'silent_abbey', 'saltmire'],
    text: 'Firelight through the trees. Robed figures chant around a carved stone, swaying in time.',
    choices: [
      { label: 'Sneak past', check: { skill: 'occultism', dc: 11 }, outcome: { text: 'You recognise their signs and walk among them unnoticed.' }, fail: { fight: 'cultist_novice', text: 'A novice spots you and shrieks.' } },
      { label: 'Attack the camp', outcome: { fight: 'cultist_novice', gain: { items: { cultist_text: 1 } }, text: 'You scatter them and take their scripture.' } },
      { label: 'Listen to the chant', outcome: { lose: { sanity: 8 }, gain: { xp: { occultism: 80 }, items: { whispering_fragment: 2 } }, text: 'The words lodge in your head like fishhooks.' } },
    ],
  },
  procession: {
    title: 'The Drowned Procession', icon: '🕯️', if: { veil: true },
    text: 'Pale figures walk along the road in a long line, water running from their clothes. None of them leave footprints. One turns to look at you.',
    choices: [
      { label: 'Join them for a while', outcome: { lose: { sanity: 20 }, gain: { items: { veil_pearl: 2 }, reveal: ['lighthouse'] }, text: 'They lead you to the headland and show you a lighthouse that is not there. Then they are gone.' } },
      { label: 'Speak to them', check: { skill: 'occultism', dc: 14 }, outcome: { gain: { items: { whispering_fragment: 5 } }, text: 'They answer in voices like waves on gravel, and you understand.' }, fail: { lose: { sanity: 10 }, text: 'They answer. You wish they had not.' } },
      { label: 'Look away', outcome: { text: 'When you look back, the road is wet but empty.' } },
    ],
  },
  wounded: {
    title: 'A Wounded Traveller', icon: '🩸',
    text: 'A man sits against a milestone, clutching a bloody side. "Please. I have nothing, but I know the roads."',
    choices: [
      { label: 'Give him a Healing Draught', need: { items: { healing_draught: 1 } }, outcome: { lose: { items: { healing_draught: 1 } }, gain: { gold: 40, revealRandom: true }, text: 'He presses a few coins on you, and tells you of a place you have not yet seen.' } },
      { label: 'Bind his wounds', check: { skill: 'alchemy', dc: 10 }, outcome: { gain: { revealRandom: true }, text: 'You stop the bleeding. In thanks, he tells you of a place you have not yet seen.' }, fail: { text: 'You do what you can. It is not enough.' } },
      { label: 'Leave him', outcome: { lose: { sanity: 3 }, text: 'His eyes follow you down the road.' } },
    ],
  },
  marsh_lights: {
    title: 'Lights Over the Marsh', icon: '✨', if: { night: true },
    text: 'Blue lights bob above the reeds, just off the road. They seem to beckon.',
    choices: [
      { label: 'Follow them', outcome: { lose: { sanity: 10 }, gain: { items: { dream_poppy: 2 }, reveal: ['dreaming_grove'] }, text: 'They lead you in circles for hours, and leave you holding flowers that should not grow here.' } },
      { label: 'Keep to the road', outcome: { text: 'The lights follow you for a while, then lose interest.' } },
    ],
  },
  wolves: {
    title: 'Eyes in the Dark', icon: '🐺', region: ['blackwood', 'graveyard', 'ironhold', 'deep_mines'],
    text: 'Yellow eyes in the undergrowth. Many of them. A low growl.',
    choices: [
      { label: 'Fight', outcome: { fight: 'dire_wolf', text: 'The pack leader lunges.' } },
      { label: 'Throw them your bread', need: { items: { bread: 3 } }, outcome: { lose: { items: { bread: 3 } }, text: 'They fall on the bread, and you slip away.' } },
      { label: 'Climb a tree', check: { skill: 'woodcutting', dc: 10 }, outcome: { text: 'You wait them out in the branches.' }, fail: { fight: 'dire_wolf', text: 'The branch snaps.' } },
    ],
  },
  your_name: {
    title: 'Your Name on the Wind', icon: '🌬️', if: { minMadness: 1 },
    text: 'Someone calls your name from just beyond the hedge. It is your own voice.',
    choices: [
      { label: 'Answer', outcome: { lose: { sanity: 15 }, gain: { xp: { occultism: 150 } }, text: 'You have a long conversation with yourself. You lose, on points.' } },
      { label: 'Cover your ears', outcome: { text: 'It keeps calling for a mile. Then it laughs and stops.' } },
    ],
  },
  caravan: {
    title: 'Dwarven Caravan', icon: '🐂', region: ['ironhold', 'blackwood', 'deep_mines', 'crater'], if: { veil: false },
    text: 'A train of ox-carts rumbles by, guarded by dwarves in heavy mail. The caravan master waves you over.',
    choices: [
      { label: 'Buy 5 Iron Bars for 40 gold', need: { gold: 40 }, outcome: { lose: { gold: 40 }, gain: { items: { iron_bar: 5 } }, text: '"Good doing business."' } },
      { label: 'Ask for news', outcome: { gain: { revealRandom: true }, text: 'The caravan master tells you about a place on the road ahead.' } },
      { label: 'Wave and walk on', outcome: { text: 'The oxen do not wave back.' } },
    ],
  },
  stars_right: {
    title: 'The Stars Are Right', icon: '🌌', if: { starsRight: true },
    text: 'Every star in the sky has moved. The constellations spell something, and you can almost read it.',
    choices: [
      { label: 'Read the sky', outcome: { lose: { sanity: 25 }, gain: { xp: { occultism: 600 } }, text: 'It is a door. It is open. It will not be open for long.' } },
      { label: 'Look at the ground until it passes', outcome: { text: 'The ground is comfortingly the wrong way up.' } },
    ],
  },
};

// --- Bestiary: what you learn by slaying things. The mad read a different text. ---
const BESTIARY = {
  giant_crab: { sane: 'An oversized shore crab, grown fat on whatever washes up near Saltmire.', mad: 'It is not a crab. It is wearing a crab, the way you wear a coat.' },
  deepling_spawn: { sane: 'The young of the deep ones. Frog-like, wet, and more numerous every year.', mad: 'They are children. Somebody\'s children. Some of them have Saltmire surnames.' },
  smuggler: { sane: 'Coastal thieves who run cargo past the Marsh family. Or for them.', mad: 'They smuggle people out at night, to the reef. Not all the people want to go.' },
  dire_wolf: { sane: 'Wolves the size of ponies. They appeared in the Blackwood after the star fell.', mad: 'They howl at the crater, not the moon.' },
  skeleton: { sane: 'Old soldiers who never stopped marching. Something in the graveyard keeps them walking.', mad: 'They are not walking. They are fleeing something underneath, very, very slowly.' },
  ghoul: { sane: 'Grave-eaters with rubbery skin and dog-like faces. They avoid the light.', mad: 'They were people once. They say it was the best decision they ever made.' },
  cultist_novice: { sane: 'Desperate townsfolk who joined the Esoteric Order of Dagon for fish and gold.', mad: 'They are very happy. That is the worst part.' },
  duergar: { sane: 'Grey dwarves from deep below, cruel and silent.', mad: 'Something under the mountain pulls their strings. They do not know it.' },
  deepling: { sane: 'A full-grown deep one. Immortal unless slain, and patient beyond measure.', mad: 'It recognises you. It says you have your grandmother\'s eyes.' },
  cultist_priest: { sane: 'Ordained priests of Father Dagon, with gills hidden under their collars.', mad: 'Their sermons are accurate. That is what makes them so frightening.' },
  shoggoth_larva: { sane: 'A young shoggoth: a mass of protoplasm, eyes and mouths that form and dissolve.', mad: 'Tekeli-li. Tekeli-li. It is singing to you.' },
  mi_go: { sane: 'The Fungi from Yuggoth, who mine the fallen star and collect brains in metal canisters.', mad: 'They would very much like to show you the stars. Just your brain, mind you.' },
  colour: { sane: 'A colour that is not a colour, which drains the life from all it touches.', mad: 'You can name the colour now. You wish you could not.' },
  byakhee: { sane: 'Winged things that fly between the stars and carry riders who should not be carried.', mad: 'It offers you a ride. The offer stands.' },
  nightgaunt: { sane: 'Faceless, rubbery, horned flyers that tickle their victims into oblivion.', mad: 'They are not cruel. They simply have no faces with which to show mercy.' },
  star_spawn: { sane: 'Kin of the Dreamer, vast and tentacled, who came down from the stars.', mad: 'They are homesick. The stars are home. They mean to bring home here.' },
  dagon: { sane: 'Father Dagon, ruler of the deep ones, as old as the sea.', mad: 'He is tired. He has been waiting a very long time, and he would like someone else to wait for a while.' },
  echo: { sane: 'A reflection that stepped out of the black lamp\'s light, wearing your face.', mad: 'It is the one that stayed sane. It envies you.' },
  high_priest: { sane: 'The High Priest of Dagon, more scale than skin.', mad: 'He wrote the hymns. He is very proud of the third verse.' },
  stone_horror: { sane: 'A thing of living rock that dwells in the deepest tunnels.', mad: 'It is a tooth. Something very large is chewing the mountain.' },
  thing_below: { sane: 'The worm the dwarves woke. No one has a better name for it.', mad: 'It was asleep, and dreaming of you.' },
};

// --- Achievements ---
const ACHIEVEMENTS = [
  { id: 'first_blood', icon: '🩸', name: 'First Blood', desc: 'Slay your first enemy.', test: g => g.totalKills() >= 1 },
  { id: 'slayer', icon: '⚔️', name: 'Slayer', desc: 'Slay 500 enemies.', test: g => g.totalKills() >= 500 },
  { id: 'cartographer', icon: '🗺️', name: 'Cartographer', desc: 'Discover every place in the waking world.', test: g => Object.keys(LOCATIONS).filter(l => !LOCATIONS[l].hidden).every(l => g.state.known[l]) },
  { id: 'veil', icon: '🌫️', name: 'Through the Veil', desc: 'See through the Veil for the first time.', test: g => g.veilSight() },
  { id: 'lighthouse', icon: '🗼', name: 'The Lighthouse That Is', desc: 'Visit the Lighthouse That Isn\'t.', test: g => !!g.state.visited.lighthouse },
  { id: 'broken', icon: '💔', name: 'Broken', desc: 'Have your mind break for the first time.', test: g => g.state.madness >= 1 },
  { id: 'lost', icon: '🌀', name: 'Lost to the Deep', desc: 'Reach the deepest madness.', test: g => g.state.madness >= MADNESS_STAGES.length - 1 },
  { id: 'end_order', icon: '🕊️', name: 'The Silence', desc: 'Complete the Silent Order\'s path.', test: g => !!g.state.endings.order },
  { id: 'end_dreamer', icon: '🐙', name: 'The Herald', desc: 'Complete the Dreamer\'s path.', test: g => !!g.state.endings.dreamer },
  { id: 'end_prophet', icon: '👁️', name: 'The Prophet', desc: 'Complete your own path.', test: g => !!g.state.endings.prophet },
  { id: 'all_endings', icon: '♾️', name: 'Every Door', desc: 'Reach all three endings.', test: g => ['order', 'dreamer', 'prophet'].every(e => g.state.endings[e]) },
  { id: 'rich', icon: '💰', name: 'Marsh Money', desc: 'Hold 10,000 gold at once.', test: g => g.state.gold >= 10000 },
  { id: 'adept', icon: '⭐', name: 'Adept', desc: 'Reach level 25 in any skill.', test: g => Object.keys(SKILLS).some(s => g.level(s) >= 25) },
  { id: 'master', icon: '🌟', name: 'Master', desc: 'Reach level 50 in any skill.', test: g => Object.keys(SKILLS).some(s => g.level(s) >= 50) },
  { id: 'expedition', icon: '🏛️', name: 'Delver', desc: 'Complete an expedition.', test: g => Object.keys(g.state.expeditionsDone).length >= 1 },
  { id: 'all_expeditions', icon: '🏆', name: 'Into Every Dark', desc: 'Complete every expedition.', test: g => Object.keys(EXPEDITIONS).every(e => g.state.expeditionsDone[e]) },
  { id: 'companion', icon: '🤝', name: 'Fellow Traveller', desc: 'Hire a companion.', test: g => !!g.state.companion },
  { id: 'congregation', icon: '🛐', name: 'Congregation', desc: 'Lead a cult of ten followers.', test: g => !!g.state.cult && g.state.cult.followers >= 10 },
  { id: 'bestiary', icon: '📕', name: 'Naturalist', desc: 'Fill every page of the bestiary.', test: g => Object.keys(BESTIARY).every(m => g.state.bestiary[m] !== undefined) },
  { id: 'stars', icon: '🌌', name: 'When the Stars Are Right', desc: 'Be awake on a night when the stars are right.', test: g => g.starsRight() },
];

// --- Hallucinations: harmless tricks played on the deeply mad ---
const HALLUCINATIONS = {
  minMadness: 3,
  logLines: [
    'You hear your name called from the water.',
    'Someone is standing behind you. No one is standing behind you.',
    'Your pack feels heavier. Then lighter. Then it breathes.',
    'The road sign says SALTMIRE in every direction.',
    'You remember a friend you never had. They miss you.',
    'Rare find: a Second Shadow!',
    'The Keeper says: "Not yet."',
    'Your reflection blinks before you do.',
  ],
  items: [{ name: 'Your Own Eye', icon: '👁️' }, { name: 'A Wet Letter', icon: '✉️' }, { name: 'Lost Tooth', icon: '🦷' }, { name: 'Black Pearl', icon: '⚫' }],
  monsters: [{ name: 'The Thing Behind You', icon: '👤' }, { name: 'Your Mother', icon: '👵' }, { name: 'Something Under the Floor', icon: '🕳️' }],
  places: [{ name: 'The Town That Was', icon: '🏚️', x: 560, y: 460 }, { name: 'The Seventh Door', icon: '🚪', x: 180, y: 220 }],
};

const BASE_LOCATIONS_SNAPSHOT = JSON.parse(JSON.stringify(LOCATIONS));

// Some things only happen at certain times.
ACTIONS.foraging.find(a => a.id === 'star_rose').when = 'night';
ACTIONS.foraging.find(a => a.id === 'ghost_lily').when = 'night';
ACTIONS.fishing.find(a => a.id === 'veil_pearls').when = 'low_tide';
// At low tide you can wade out to the reef for free.
ROADS.find(r => r.b === 'devils_reef' && r.a === 'saltmire_shore').tideFree = true;
