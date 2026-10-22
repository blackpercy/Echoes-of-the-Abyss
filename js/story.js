// The Veil: madness, derangements, hidden places, people and quests.
// Losing your mind is not the end. It shows you a second layer of the world.

// Below this much sanity you see through the Veil.
const VEIL_THRESHOLD = 40;
// Sanity you are left with after your mind breaks.
const SANITY_AFTER_BREAK = 25;
// Each madness level lowers your maximum sanity by this much.
const SANITY_PER_MADNESS = 10;
// At this madness level the Veil never closes again.
const PERMANENT_VEIL_MADNESS = 3;

const MIND_STATES = [
  { min: 70, name: 'Lucid' },
  { min: 40, name: 'Uneasy' },
  { min: 15, name: 'Fraying' },
  { min: 0, name: 'Breaking' },
];

const MADNESS_STAGES = ['Sound of Mind', 'Touched', 'Haunted', 'Unmoored', 'Dream-Kissed', 'Lost to the Deep'];

// Gained one at a time when your mind breaks. Each one is a gift and a curse.
const DERANGEMENTS = {
  voices: { name: 'Voices of the Deep', icon: '🗣️', desc: 'The whispers follow you everywhere: you can Listen to the Whispers anywhere. Your sanity recovers at half speed.' },
  night_eyes: { name: 'Eyes That See Too Much', icon: '👁️', desc: '+2 to hit against eldritch beings. −2 to sanity saves.' },
  ghoul_hunger: { name: "Ghoul's Hunger", icon: '🦴', desc: 'You can eat raw fish, and it nourishes you as well as cooked. Bread turns to ash in your mouth.' },
  drowned_lungs: { name: 'Drowned Lungs', icon: '🫁', desc: 'You can breathe water: the road into the Abyss no longer needs a Diving Helm. −10 maximum hitpoints.' },
  paranoia: { name: 'Paranoia', icon: '🫣', desc: '+2 AC, because you never let anything behind you. Merchants make you nervous: you pay 25% more.' },
  star_touched: { name: 'Star-Touched', icon: '✴️', desc: 'You feel the pull of distant stars: gathering is 15% faster. −1 to hit.' },
};

// --- Items found beyond the Veil ---
addItem('veil_pearl', { name: 'Veil Pearl', icon: '🫧', sell: 40, desc: 'A pearl that is only there when you are not quite sane.' });
addItem('ghost_lily', { name: 'Ghost Lily', icon: '🪷', sell: 25, desc: 'A pale flower that grows on the far side of graves.' });
addItem('veil_draught', { name: 'Veil Draught', icon: '🌫️', type: 'potion', sanity: -50, sell: 15, desc: 'Thins the Veil. Costs 50 sanity, but it will never break your mind.' });
addItem('lucid_tincture', { name: 'Lucid Tincture', icon: '💧', type: 'potion', sanity: 40, sell: 45, desc: 'Restores 40 sanity.' });
addItem('veil_lantern', { name: 'Veil Lantern', icon: '🪔', type: 'tool', sell: 200, veilSight: true, desc: 'Its light shows what is hidden. You see through the Veil while you carry it.' });
addItem('dreamers_eye', { name: "Dreamer's Eye", icon: '🧿', type: 'equipment', slot: 'amulet', veilSight: true, stats: { hit: 2, dmg: 3, ward: 3 }, req: { occultism: 10 }, sell: 800, desc: 'It blinks. You see through the Veil while you wear it.' });
addItem('drowned_crown', { name: 'Drowned Crown', icon: '👑', type: 'equipment', slot: 'head', stats: { ac: 3, hit: 1, ward: 3 }, req: { combat: 15 }, sell: 2000, desc: 'Coral and gold, still dripping.' });

// --- Activities only visible through the Veil ---
ACTIONS.fishing.push({ id: 'veil_pearls', name: 'Pearls Between the Waves', level: 8, xp: 40, time: 5000, veil: true, output: { veil_pearl: 1 } });
ACTIONS.foraging.push({ id: 'ghost_lily', name: 'Ghost Lilies', level: 10, xp: 35, time: 4500, veil: true, output: { ghost_lily: 1 } });
ACTIONS.alchemy.push(
  { id: 'veil_draught', name: 'Veil Draught', level: 5, xp: 25, time: 3500, station: 'lab', input: { grave_moss: 2, whispering_fragment: 2 }, output: { veil_draught: 1 } },
  { id: 'lucid_tincture', name: 'Lucid Tincture', level: 12, xp: 45, time: 4000, station: 'lab', input: { ghost_lily: 2, pale_wort: 1 }, output: { lucid_tincture: 1 } },
);
ACTIONS.alchemy.sort((a, b) => a.level - b.level);
LOCATIONS.saltmire_shore.gather.fishing.push('veil_pearls');
LOCATIONS.graveyard.gather.foraging.push('ghost_lily');

MONSTERS.echo = { name: 'Your Echo', icon: '🪞', eldritch: { dc: 13, loss: 4 }, hp: 120, ac: 14, hit: 7, dmg: '2d6', speed: 2600, xp: 110, gold: [0, 0], drops: [{ item: 'veil_pearl', chance: 0.3, qty: [1, 2] }, { item: 'whispering_fragment', chance: 0.5, qty: [1, 3] }] };

// --- Hidden places ---
LOCATIONS.lighthouse = {
  name: "The Lighthouse That Isn't", kind: 'hidden', hidden: true, icon: '🗼', x: 850, y: 360,
  desc: 'In daylight the headland is bare rock. Through the Veil, a lighthouse stands there, and its lamp burns with a black light that makes the sea glow.',
  stations: ['shore', 'library'], gather: { fishing: ['veil_pearls', 'drowned_salmon'] },
  monsters: ['echo'],
};
LOCATIONS.market = {
  name: 'The Market Under the Hill', kind: 'hidden', hidden: true, icon: '🏮', x: 340, y: 300,
  desc: 'Beneath the oldest barrow, lanterns hang over stalls run by things in long coats. They do not take gold. They take what you have heard in the dark.',
  shop: 'hollow_market',
};
ROADS.push(
  { a: 'saltmire_shore', b: 'lighthouse', time: 12, veil: true },
  { a: 'graveyard', b: 'market', time: 10, veil: true, flag: 'market', note: 'Someone must vouch for you.' },
);

SHOPS.hollow_market = {
  name: 'The Hollow Stalls',
  keeper: 'A merchant with a face like a moth turns its head all the way around to look at you. "Fragments only, warm one. Whispers are the only coin that keeps its value."',
  currency: 'whispering_fragment',
  buysNothing: true,
  stock: [
    { item: 'veil_draught', price: 4 }, { item: 'lucid_tincture', price: 6 }, { item: 'ghost_lily', price: 3 },
    { item: 'veil_lantern', price: 60 }, { item: 'explorers_pack', price: 90 },
  ],
};
// The people of Saltmire treat the mad as kin; the Abbey turns them away.
SHOPS.general_store.kinDiscountAtMadness = 2;
SHOPS.apothecary.refuseAtMadness = 4;

// --- People ---
// "if" conditions: veil, minMadness, maxMadness, quests: { id: 'active' | 'done' | 'none' }.
const NPCS = {
  zadok: {
    name: 'Zadok Allen', icon: '🧔', title: 'the town drunk', location: 'saltmire',
    lines: [
      { if: { veil: true }, text: 'Zadok grips your sleeve. For once his eyes are clear. "You see \'em too now, don\'t ye? The lights out past the shore. The lighthouse that ain\'t there in the daytime."' },
      { if: { quests: { shore_echoes: 'done' } }, text: '"Ye did good on the shore. But they keep comin\'. They always keep comin\'."' },
      { text: '"Don\'t go down to the water after dark, stranger. Things come up out of it. Frog-things. They want somethin\'."' },
    ],
    interactions: [
      { id: 'drink', label: 'Buy him a drink', cost: { gold: 5 }, result: 'He drinks, and mutters about Father Dagon and Mother Hydra, and a bargain his grandfather made when the fish stopped coming.' },
    ],
  },
  man: {
    name: "The Man Who Isn't There", icon: '🕴️', title: 'seen only through the Veil', location: 'saltmire', if: { veil: true },
    lines: [
      { if: { minMadness: 3 }, text: '"Welcome home. You are one of us now, whether you like it or not. Still trading?"' },
      { text: 'He stands where the lamplight should fall on him, but it does not. "You can see me. How delightful. Few do, until it is too late. Shall we trade? I collect memories."' },
    ],
    interactions: [
      { id: 'memory', label: 'Give him a memory', cost: { sanity: 15 }, gain: { items: { whispering_fragment: 4 }, xp: { occultism: 60 } }, result: 'You forget your mother\'s face. In its place: four fragments of a language older than speech.' },
      { id: 'veil', label: 'Ask what lies beyond the Veil', result: '"Everything you were told is a story. Everything you were not told is true. The Lighthouse, the Market Under the Hill… they were always there. You simply lacked the eyes."' },
    ],
  },
  abbot: {
    name: 'Abbot Hieronymus', icon: '🧓', title: 'of the Silent Order', location: 'silent_abbey',
    lines: [
      { if: { minMadness: 3 }, text: 'The Abbot studies you through a grate in the door. "The Order cannot use you now, child. But we do not turn away the sick."' },
      { if: { quests: { order_silence: 'done' } }, text: '"The sea is quiet. For now. The Order is in your debt."' },
      { text: '"The Silent Order has watched the sea for three hundred years. We would welcome another pair of eyes, so long as they remain your own."' },
    ],
    interactions: [
      { id: 'quieting', label: 'Undergo the Rite of Quieting', if: { minMadness: 1 }, cost: { goldPerMadness: 300, items: { calming_elixir: 2 } }, gain: { madness: -1, sanity: 30 }, result: 'Chanting, cold water, the smell of incense. When it ends, one of the voices in your head has fallen silent.' },
    ],
  },
  keeper: {
    name: 'The Keeper', icon: '🕯️', title: 'of the black lamp', location: 'lighthouse',
    lines: [
      { if: { quests: { keeper_door: 'done' } }, text: '"Herald. The deep ones bow when you pass. Go where you will; the sea is yours."' },
      { if: { minMadness: 4 }, text: '"The tide is high, little lamp. He is waiting for you below."' },
      { text: 'A tall figure tends a lamp that burns with black light. "Ah. Another one who looked too long at the water. Good. The Dreamer has need of eyes that can see."' },
    ],
    interactions: [
      { id: 'tide', label: 'Drink from the dark tide', cost: { sanity: 40 }, gain: { xp: { occultism: 150 } }, result: 'The water tastes of salt and starlight. Something in you loosens.' },
    ],
  },
  ghoul: {
    name: 'The Ghoul Who Speaks', icon: '🧟', title: 'who will not eat you, yet', location: 'graveyard', if: { minMadness: 1, noCompanion: 'gnaw' },
    interactions: [
      { id: 'hire', label: 'Ask Old Gnaw to come with you', if: { quests: { ghoul_company: 'done' } }, cost: { items: { raw_pale_eel: 5 } }, gain: { companion: 'gnaw' }, result: '"Fresh meat on every road? Old Gnaw comes."' },
    ],
    lines: [
      { if: { quests: { ghoul_company: 'done' } }, text: '"Go on down to the Market, warm one. Tell them Old Gnaw sent you."' },
      { text: 'A crouched figure looks up from a gnawed bone. Its voice is a dry rustle. "You smell of the threshold. The Market Under the Hill might let you in, if someone vouches for you. Someone with a full belly."' },
    ],
  },
};

// --- Quests ---
// objective types: kill (monster, count), deliver (items, handed to the giver), visit (location, optional minMadness), madness (reach a level).
const QUESTS = {
  shore_echoes: {
    name: 'Echoes on the Shore', giver: 'zadok',
    offer: '"Them frog-spawn on the shore. Kill a few for me, would ye? Five. My nerves can\'t take the croakin\'."',
    objective: { type: 'kill', monster: 'deepling_spawn', count: 5 },
    done: '"Ha! That\'ll teach \'em. Here, take this. Tea from the Abbey. Helps with the dreams."',
    reward: { gold: 80, items: { calming_tea: 3 } },
  },
  zadok_truth: {
    name: 'What Zadok Saw', giver: 'zadok', requires: { quests: { shore_echoes: 'done' }, veil: true },
    offer: '"If ye can see the lighthouse, go to it. Ask for the Keeper. Tell \'em Zadok never told a soul. Never."',
    objective: { type: 'visit', location: 'lighthouse' },
    done: 'The Lighthouse That Isn\'t rises out of the fog, solid as stone. Zadok was telling the truth.',
    reward: { xp: { occultism: 300 } },
  },
  order_errand: {
    name: "The Order's Errand", giver: 'abbot', requires: { maxMadness: 2 }, path: 'order',
    offer: '"The cults grow bold. Bring me two of their texts, so we may learn what they are planning."',
    objective: { type: 'deliver', items: { cultist_text: 2 } },
    done: '"Grim reading. Take this amulet. The runes will help you keep your mind."',
    reward: { gold: 150, items: { rune_amulet: 1 }, xp: { occultism: 200 } },
  },
  order_catacombs: {
    name: 'Cleanse the Catacombs', giver: 'abbot', requires: { quests: { order_errand: 'done' }, maxMadness: 2 }, path: 'order',
    offer: '"Their priests gather in the Drowned Catacombs beneath Saltmire. Put an end to five of them."',
    objective: { type: 'kill', monster: 'cultist_priest', count: 5 },
    done: '"The hymns below have stopped. Carry the Elder Sign; you will need it where you are going next."',
    reward: { gold: 600, items: { elder_sign: 1 } },
  },
  order_silence: {
    name: 'Silence the Deep', giver: 'abbot', requires: { quests: { order_catacombs: 'done' }, maxMadness: 2 }, path: 'order',
    offer: '"There is one who leads them all. Father Dagon. Go down into the Abyss and slay him, and the Dreamer will sleep another thousand years."',
    objective: { type: 'kill', monster: 'dagon', count: 1 },
    done: '"It is done. The Order will remember you."',
    reward: { gold: 5000, ending: 'order' },
  },
  keeper_listen: {
    name: 'Listen Deeper', giver: 'keeper', requires: { quests: { zadok_truth: 'done' } }, path: 'dreamer',
    offer: '"You only glimpse us when your mind is thin. Let it break, and break again, and you will never be blind again."',
    objective: { type: 'madness', count: 2 },
    done: '"There. Now you see. Wear this, and the Veil will never close for you, however lucid you pretend to be."',
    reward: { items: { dreamers_eye: 1 }, xp: { occultism: 500 } },
  },
  keeper_gift: {
    name: 'A Gift for the Dreamer', giver: 'keeper', requires: { quests: { keeper_listen: 'done' } }, path: 'dreamer',
    offer: '"The Dreamer loves pearls from between the waves. Bring me five."',
    objective: { type: 'deliver', items: { veil_pearl: 5 } },
    done: '"Lovely. Wear this crown. It was made for someone who drowned willingly."',
    reward: { gold: 1000, items: { drowned_crown: 1 } },
  },
  keeper_door: {
    name: 'The Door Beneath the Sea', giver: 'keeper', requires: { quests: { keeper_gift: 'done' } }, path: 'dreamer',
    offer: '"When you are mad enough to be welcome, go down into the Abyss. Father Dagon will know you."',
    objective: { type: 'visit', location: 'the_abyss', minMadness: 4 },
    done: 'Father Dagon rises from the dark and lowers his vast head. He does not attack. He bows.',
    reward: { gold: 2500, ending: 'dreamer' },
  },
  ghoul_company: {
    name: 'Hungry Company', giver: 'ghoul',
    offer: '"Ten raw eels, warm one. Pale ones. Then I will vouch for you at the Market."',
    objective: { type: 'deliver', items: { raw_pale_eel: 10 } },
    done: '"Mmm. Slippery. Go on, then. The way down is behind the leaning stone."',
    reward: { flags: ['market'], items: { ghost_lily: 3 } },
  },
};

const ENDINGS = {
  order: {
    title: 'The Silence Beneath the Waves',
    text: 'Father Dagon sinks into the black water, and the sea goes still. In Saltmire the fishermen haul up ordinary fish again, and the Silent Order carves your name into the abbey wall. On some nights you still dream of a city where the angles are wrong. But you wake, every time.',
  },
  dreamer: {
    title: "The Dreamer's Herald",
    text: 'The deep ones sing your name in the drowned city. Father Dagon bows, and somewhere far below, something vast turns over in its sleep and smiles. You walk back up onto the land, and the townsfolk of Saltmire lower their eyes as you pass. When the stars are right you will open the door. Until then, the world above is yours to wander.',
  },
};
