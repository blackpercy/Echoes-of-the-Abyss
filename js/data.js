// Speldata för Ekon från Avgrunden: färdigheter, föremål, handlingar, monster och områden.

const SKILLS = {
  vedhuggning: { name: 'Vedhuggning', icon: '🪓', type: 'gathering', desc: 'Fäll träden i Svartskogen, där rötterna dricker ur gamla gravar.' },
  fiske: { name: 'Fiske', icon: '🎣', type: 'gathering', desc: 'Dra upp det som simmar i Saltmyrs svarta vatten. Vissa fångster stirrar tillbaka.' },
  gruvdrift: { name: 'Gruvdrift', icon: '⛏️', type: 'gathering', desc: 'Bryt malm ur bergen, och ur stjärnan som föll vid Kraterns rand.' },
  ortsamling: { name: 'Örtsamling', icon: '🌿', type: 'gathering', desc: 'Plocka örter som växer där månljuset inte når.' },
  matlagning: { name: 'Matlagning', icon: '🍲', type: 'production', desc: 'Tillaga fångsten. Varm mat håller både kropp och sinne samman.' },
  smide: { name: 'Smide', icon: '⚒️', type: 'production', desc: 'Smält malm till tackor och smid vapen och rustningar.' },
  alkemi: { name: 'Alkemi', icon: '⚗️', type: 'production', desc: 'Brygg drycker som läker sår och lugnar ett skakat förstånd.' },
  ockultism: { name: 'Ockultism', icon: '👁️', type: 'production', desc: 'Studera förbjuden kunskap. Varje insikt kostar en bit av ditt förstånd, men ger makt över det som inte borde finnas.' },
  anfall: { name: 'Anfall', icon: '⚔️', type: 'combat', desc: 'Träffsäkerhet i strid. Krävs för bättre vapen.' },
  styrka: { name: 'Styrka', icon: '💪', type: 'combat', desc: 'Ökar din maximala skada.' },
  forsvar: { name: 'Försvar', icon: '🛡️', type: 'combat', desc: 'Gör dig svårare att träffa. Krävs för bättre rustning.' },
  livskraft: { name: 'Livskraft', icon: '❤️', type: 'combat', desc: 'Varje nivå ger 10 extra livspoäng.' },
};

const SKILL_GROUPS = [
  { name: 'Insamling', skills: ['vedhuggning', 'fiske', 'gruvdrift', 'ortsamling'] },
  { name: 'Hantverk', skills: ['matlagning', 'smide', 'alkemi', 'ockultism'] },
];

const ITEMS = {};
function addItem(id, def) {
  ITEMS[id] = Object.assign({ id, type: 'resource', sell: 1, icon: '❔', desc: '' }, def);
}

// --- Ved ---
addItem('askved', { name: 'Askved', icon: '🪵', sell: 1, desc: 'Ljus, rak ved. Brinner rent.' });
addItem('vridekved', { name: 'Vridekved', icon: '🪵', sell: 3, desc: 'Ådringen bildar mönster som nästan liknar skrift.' });
addItem('gravtallsved', { name: 'Gravtallsved', icon: '🪵', sell: 8, desc: 'Från tallar som vuxit på gamla gravfält. Kåda röd som blod.' });
addItem('skuggbark', { name: 'Skuggbark', icon: '🪵', sell: 18, desc: 'Barken kastar en skugga även i mörker.' });
addItem('blekved', { name: 'Blekved', icon: '🪵', sell: 40, desc: 'Vit som ben och lika kall.' });
addItem('dromved', { name: 'Drömved', icon: '🪵', sell: 90, desc: 'Ett träd från de Yttre Sfärerna. Den som sover nära det drömmer om städer under havet.' });

// --- Fisk ---
const FISH = [
  ['raka', 'Räka', 1, 10, 3000, 2, 30, '🦐'],
  ['blekal', 'Blekål', 10, 20, 3500, 5, 50, '🐍'],
  ['djuptorsk', 'Djuptorsk', 20, 32, 4000, 12, 80, '🐟'],
  ['kalmarling', 'Kalmarling', 35, 50, 5000, 25, 120, '🦑'],
  ['drunknad_lax', 'Drunknad lax', 50, 75, 6000, 45, 170, '🐟'],
  ['avgrundsmal', 'Avgrundsmal', 65, 110, 7000, 80, 230, '🐡'],
  ['leviatanyngel', 'Leviatanyngel', 85, 175, 9000, 150, 320, '🐙'],
];
for (const [id, name, , , , sell, heal, icon] of FISH) {
  addItem('ra_' + id, { name: 'Rå ' + name.toLowerCase(), icon, sell, desc: 'Behöver tillagas innan den kan ätas.' });
  addItem(id, { name: 'Tillagad ' + name.toLowerCase(), icon: '🍖', type: 'food', heal, sell: Math.round(sell * 1.6), desc: `Återställer ${heal} livspoäng.` });
}
addItem('brod', { name: 'Grovbröd', icon: '🍞', type: 'food', heal: 20, sell: 1, desc: 'Torrt men mättande. Återställer 20 livspoäng.' });

// --- Malm och tackor ---
addItem('jarnmalm', { name: 'Järnmalm', icon: '🪨', sell: 3 });
addItem('silvermalm', { name: 'Silvermalm', icon: '🪨', sell: 10 });
addItem('svartjarnsmalm', { name: 'Svartjärnsmalm', icon: '🪨', sell: 20 });
addItem('adamantinmalm', { name: 'Adamantinmalm', icon: '🪨', sell: 45 });
addItem('stjarnmetallmalm', { name: 'Stjärnmetallmalm', icon: '☄️', sell: 100, desc: 'Varm vid beröring. Den surrar svagt, som om den minns färden genom rymden.' });
addItem('jarntacka', { name: 'Järntacka', icon: '🧱', sell: 10 });
addItem('silvertacka', { name: 'Silvertacka', icon: '🧱', sell: 30, desc: 'Silver skär genom det odöda.' });
addItem('svartjarnstacka', { name: 'Svartjärnstacka', icon: '🧱', sell: 60 });
addItem('adamantintacka', { name: 'Adamantintacka', icon: '🧱', sell: 140 });
addItem('stjarnmetalltacka', { name: 'Stjärnmetalltacka', icon: '🧱', sell: 320 });

// --- Örter ---
addItem('gravmossa', { name: 'Gravmossa', icon: '🌿', sell: 3 });
addItem('blekort', { name: 'Blekört', icon: '🌱', sell: 8 });
addItem('nattskatta', { name: 'Nattskatta', icon: '🍇', sell: 20 });
addItem('dromvallmo', { name: 'Drömvallmo', icon: '🌺', sell: 45 });
addItem('stjarnros', { name: 'Stjärnros', icon: '🌸', sell: 100, desc: 'Blommar bara när stjärnorna står rätt.' });

// --- Drycker ---
addItem('lakedryck', { name: 'Enkel läkedryck', icon: '🧪', type: 'potion', heal: 60, sell: 12, desc: 'Återställer 60 livspoäng.' });
addItem('lugnande_te', { name: 'Lugnande te', icon: '🍵', type: 'potion', sanity: 10, sell: 10, desc: 'Återställer 10 förstånd.' });
addItem('lugnande_elixir', { name: 'Lugnande elixir', icon: '🧪', type: 'potion', sanity: 25, sell: 30, desc: 'Återställer 25 förstånd.' });
addItem('stark_lakedryck', { name: 'Stark läkedryck', icon: '🧪', type: 'potion', heal: 180, sell: 70, desc: 'Återställer 180 livspoäng.' });
addItem('klarsynsdryck', { name: 'Klarsynsdryck', icon: '🔮', type: 'potion', sanity: 50, sell: 110, desc: 'Återställer 50 förstånd.' });
addItem('aldre_elixir', { name: 'De Äldres elixir', icon: '✨', type: 'potion', heal: 400, sanity: 100, sell: 600, desc: 'Återställer 400 livspoäng och allt förstånd.' });

// --- Ockult ---
addItem('viskande_fragment', { name: 'Viskande fragment', icon: '📜', sell: 5, desc: 'En pergamentbit. Texten byter plats när du inte tittar.' });
addItem('kultisttext', { name: 'Kultistisk text', icon: '📕', sell: 30, desc: 'Böner till något som sover under havet.' });
addItem('necronomicon_sida', { name: 'Sida ur Necronomicon', icon: '📖', sell: 150, desc: 'Den som läser den kan aldrig sluta veta det den lärt sig.' });

// --- Utrustning ---
addItem('rostig_dolk', { name: 'Rostig dolk', icon: '🗡️', type: 'equipment', slot: 'vapen', speed: 2000, stats: { attack: 2, strength: 2 }, sell: 1, desc: 'Bättre än inget.' });

const GEAR_TIERS = [
  { key: 'jarn', prefix: 'Järn', bar: 'jarntacka', smith: 1, req: 1, atk: 8, str: 7, def: 6, xp: 12 },
  { key: 'silver', prefix: 'Silver', bar: 'silvertacka', smith: 15, req: 10, atk: 16, str: 14, def: 12, xp: 28 },
  { key: 'svartjarn', prefix: 'Svartjärns', bar: 'svartjarnstacka', smith: 30, req: 25, atk: 30, str: 27, def: 22, xp: 50 },
  { key: 'adamantin', prefix: 'Adamantin', bar: 'adamantintacka', smith: 50, req: 45, atk: 50, str: 45, def: 38, xp: 90 },
  { key: 'stjarnmetall', prefix: 'Stjärnmetall', bar: 'stjarnmetalltacka', smith: 75, req: 70, atk: 80, str: 72, def: 60, xp: 160 },
];
const GEAR_PIECES = [
  { key: 'svard', suffix: 'svärd', slot: 'vapen', icon: '⚔️', bars: 2, smithOffset: 2, stats: t => ({ attack: t.atk, strength: t.str }), reqSkill: 'anfall' },
  { key: 'hjalm', suffix: 'hjälm', slot: 'huvud', icon: '⛑️', bars: 1, smithOffset: 0, stats: t => ({ defence: Math.round(t.def * 0.5) }), reqSkill: 'forsvar' },
  { key: 'brynja', suffix: 'brynja', slot: 'kropp', icon: '🦺', bars: 3, smithOffset: 4, stats: t => ({ defence: t.def }), reqSkill: 'forsvar' },
];
for (const t of GEAR_TIERS) {
  for (const p of GEAR_PIECES) {
    addItem(`${t.key}_${p.key}`, {
      name: t.prefix + p.suffix,
      icon: p.icon,
      type: 'equipment',
      slot: p.slot,
      speed: p.slot === 'vapen' ? 2400 : undefined,
      stats: p.stats(t),
      req: { [p.reqSkill]: t.req },
      sell: Math.round(ITEMS[t.bar].sell * p.bars * 1.5),
    });
  }
}

addItem('runamulett', { name: 'Runamulett', icon: '📿', type: 'equipment', slot: 'amulett', stats: { defence: 4, sanityResist: 0.1 }, req: { ockultism: 10 }, sell: 40, desc: 'Varningsrunor ristade i vridek.' });
addItem('aldre_tecknet', { name: 'Det Äldre Tecknet', icon: '⭐', type: 'equipment', slot: 'amulett', stats: { attack: 10, defence: 10, sanityResist: 0.25 }, req: { ockultism: 40 }, sell: 300, desc: 'En femuddig stjärna med ett flammande öga. Det Som Sover ogillar den.' });
addItem('stjarnsigillet', { name: 'Stjärnsigillet', icon: '🌟', type: 'equipment', slot: 'amulett', stats: { attack: 25, strength: 20, defence: 20, sanityResist: 0.5 }, req: { ockultism: 80 }, sell: 2500, desc: 'Vävt av stjärnmetall och förbjudna ord.' });
addItem('djupingens_treudd', { name: 'Djupingens treudd', icon: '🔱', type: 'equipment', slot: 'vapen', speed: 2600, stats: { attack: 42, strength: 48 }, req: { anfall: 40 }, sell: 900, desc: 'Fjällig och våt, alltid våt.' });
addItem('benkrona', { name: 'Ghoulens benkrona', icon: '👑', type: 'equipment', slot: 'huvud', stats: { defence: 16, strength: 4 }, req: { forsvar: 20 }, sell: 250, desc: 'Gnagda fingerben, ihopsnörda med senor.' });
addItem('mi_go_cylinder', { name: 'Mi-Go-cylinder', icon: '🧠', type: 'equipment', slot: 'amulett', stats: { attack: 15, sanityResist: 0.3 }, req: { ockultism: 50 }, sell: 1500, desc: 'En metallbehållare. Något inuti tänker.' });
addItem('dagons_fjall', { name: 'Dagons fjällpansar', icon: '🐉', type: 'equipment', slot: 'kropp', stats: { defence: 75, sanityResist: 0.15 }, req: { forsvar: 65 }, sell: 6000, desc: 'Fjäll från Fader Dagon själv.' });

// --- Handlingar per färdighet ---
const ACTIONS = {
  vedhuggning: [
    { id: 'ask', name: 'Askträd', level: 1, xp: 10, time: 3000, output: { askved: 1 } },
    { id: 'vridek', name: 'Vridek', level: 10, xp: 22, time: 4000, output: { vridekved: 1 } },
    { id: 'gravtall', name: 'Gravtall', level: 25, xp: 40, time: 5000, output: { gravtallsved: 1 } },
    { id: 'skuggbark', name: 'Skuggbarksträd', level: 40, xp: 65, time: 6000, output: { skuggbark: 1 } },
    { id: 'blektrad', name: 'Blekträd', level: 60, xp: 105, time: 7500, output: { blekved: 1 } },
    { id: 'dromtrad', name: 'Drömträd', level: 80, xp: 170, time: 9000, output: { dromved: 1 }, bonus: [{ item: 'viskande_fragment', chance: 0.05, qty: 1 }] },
  ],
  fiske: FISH.map(([id, name, level, xp, time]) => ({
    id, name, level, xp, time, output: { ['ra_' + id]: 1 },
    bonus: level >= 50 ? [{ item: 'viskande_fragment', chance: 0.03, qty: 1 }] : undefined,
  })),
  gruvdrift: [
    { id: 'jarn', name: 'Järnåder', level: 1, xp: 10, time: 3000, output: { jarnmalm: 1 } },
    { id: 'silver', name: 'Silverådra', level: 15, xp: 25, time: 4000, output: { silvermalm: 1 } },
    { id: 'svartjarn', name: 'Svartjärnsådra', level: 30, xp: 45, time: 5000, output: { svartjarnsmalm: 1 } },
    { id: 'adamantin', name: 'Adamantinådra', level: 50, xp: 80, time: 6500, output: { adamantinmalm: 1 } },
    { id: 'stjarnmetall', name: 'Den fallna stjärnan', level: 75, xp: 140, time: 8500, output: { stjarnmetallmalm: 1 } },
  ],
  ortsamling: [
    { id: 'gravmossa', name: 'Gravmossa', level: 1, xp: 10, time: 3000, output: { gravmossa: 1 } },
    { id: 'blekort', name: 'Blekört', level: 15, xp: 24, time: 3500, output: { blekort: 1 } },
    { id: 'nattskatta', name: 'Nattskatta', level: 30, xp: 42, time: 4500, output: { nattskatta: 1 } },
    { id: 'dromvallmo', name: 'Drömvallmo', level: 50, xp: 70, time: 5500, output: { dromvallmo: 1 } },
    { id: 'stjarnros', name: 'Stjärnros', level: 70, xp: 120, time: 7000, output: { stjarnros: 1 } },
  ],
  matlagning: FISH.map(([id, name, level, xp]) => ({
    id, name: 'Tillaga ' + name.toLowerCase(), level, xp: Math.round(xp * 0.9), time: 2500,
    input: { ['ra_' + id]: 1 }, output: { [id]: 1 },
  })),
  smide: [
    { id: 'smalt_jarn', name: 'Smält järn', level: 1, xp: 8, time: 2500, input: { jarnmalm: 2, askved: 1 }, output: { jarntacka: 1 } },
    { id: 'smalt_silver', name: 'Smält silver', level: 15, xp: 18, time: 3000, input: { silvermalm: 2, vridekved: 1 }, output: { silvertacka: 1 } },
    { id: 'smalt_svartjarn', name: 'Smält svartjärn', level: 30, xp: 32, time: 3500, input: { svartjarnsmalm: 2, gravtallsved: 1 }, output: { svartjarnstacka: 1 } },
    { id: 'smalt_adamantin', name: 'Smält adamantin', level: 50, xp: 55, time: 4000, input: { adamantinmalm: 2, skuggbark: 1 }, output: { adamantintacka: 1 } },
    { id: 'smalt_stjarnmetall', name: 'Smält stjärnmetall', level: 75, xp: 95, time: 5000, input: { stjarnmetallmalm: 2, blekved: 1 }, output: { stjarnmetalltacka: 1 } },
    ...GEAR_TIERS.flatMap(t => GEAR_PIECES.map(p => ({
      id: `${t.key}_${p.key}`,
      name: 'Smid ' + ITEMS[`${t.key}_${p.key}`].name.toLowerCase(),
      level: Math.min(99, t.smith + p.smithOffset),
      xp: t.xp * p.bars,
      time: 3000 + p.bars * 500,
      input: { [t.bar]: p.bars },
      output: { [`${t.key}_${p.key}`]: 1 },
    }))),
  ].sort((a, b) => a.level - b.level),
  alkemi: [
    { id: 'lakedryck', name: 'Enkel läkedryck', level: 1, xp: 12, time: 3000, input: { gravmossa: 2 }, output: { lakedryck: 1 } },
    { id: 'lugnande_elixir', name: 'Lugnande elixir', level: 15, xp: 30, time: 3500, input: { blekort: 2 }, output: { lugnande_elixir: 1 } },
    { id: 'stark_lakedryck', name: 'Stark läkedryck', level: 30, xp: 55, time: 4000, input: { nattskatta: 2, blekal: 1 }, output: { stark_lakedryck: 1 } },
    { id: 'klarsynsdryck', name: 'Klarsynsdryck', level: 50, xp: 95, time: 4500, input: { dromvallmo: 2, viskande_fragment: 2 }, output: { klarsynsdryck: 1 } },
    { id: 'aldre_elixir', name: 'De Äldres elixir', level: 75, xp: 200, time: 6000, input: { stjarnros: 2, stjarnmetalltacka: 1 }, output: { aldre_elixir: 1 } },
  ],
  ockultism: [
    { id: 'viskningar', name: 'Lyssna till viskningarna', level: 1, xp: 9, time: 3000, sanityCost: 2, output: { viskande_fragment: 1 }, desc: 'Sätt dig vid strandkanten och lyssna.' },
    { id: 'runamulett', name: 'Rista runamulett', level: 10, xp: 45, time: 5000, sanityCost: 3, input: { viskande_fragment: 5, vridekved: 2 }, output: { runamulett: 1 } },
    { id: 'kultisttext', name: 'Studera kultistiska texter', level: 25, xp: 70, time: 5000, sanityCost: 8, input: { kultisttext: 1 }, output: { viskande_fragment: 4 } },
    { id: 'aldre_tecknet', name: 'Forma Det Äldre Tecknet', level: 40, xp: 220, time: 8000, sanityCost: 10, input: { viskande_fragment: 12, silvertacka: 3 }, output: { aldre_tecknet: 1 } },
    { id: 'necronomicon', name: 'Läs ur Necronomicon', level: 60, xp: 260, time: 7000, sanityCost: 20, input: { necronomicon_sida: 1 }, output: { viskande_fragment: 10 } },
    { id: 'stjarnsigillet', name: 'Väv Stjärnsigillet', level: 80, xp: 900, time: 12000, sanityCost: 30, input: { viskande_fragment: 40, stjarnmetalltacka: 3 }, output: { stjarnsigillet: 1 } },
  ],
};

// --- Monster och områden ---
const MONSTERS = {
  jattekrabba: { name: 'Jättekrabba', icon: '🦀', hp: 35, attack: 1, defence: 1, maxHit: 5, speed: 3000, gold: [1, 5], drops: [{ item: 'ra_raka', chance: 0.5, qty: [1, 3] }] },
  djupingyngel: { name: 'Djupingyngel', icon: '🐸', eldritch: true, sanityDmg: 2, hp: 60, attack: 4, defence: 3, maxHit: 10, speed: 2800, gold: [3, 8], drops: [{ item: 'viskande_fragment', chance: 0.2, qty: [1, 1] }, { item: 'ra_blekal', chance: 0.3, qty: [1, 2] }] },
  smugglare: { name: 'Smugglare', icon: '🏴‍☠️', hp: 80, attack: 6, defence: 5, maxHit: 15, speed: 2600, gold: [8, 20], drops: [{ item: 'brod', chance: 0.5, qty: [1, 3] }, { item: 'jarntacka', chance: 0.15, qty: [1, 2] }, { item: 'lugnande_te', chance: 0.1, qty: [1, 1] }] },

  skelettkrigare: { name: 'Skelettkrigare', icon: '💀', hp: 150, attack: 15, defence: 15, maxHit: 25, speed: 2600, gold: [10, 30], drops: [{ item: 'jarntacka', chance: 0.3, qty: [1, 3] }, { item: 'silvermalm', chance: 0.2, qty: [1, 3] }] },
  ghoul: { name: 'Ghoul', icon: '🧟', eldritch: true, sanityDmg: 3, hp: 200, attack: 18, defence: 14, maxHit: 30, speed: 2800, gold: [12, 35], drops: [{ item: 'gravmossa', chance: 0.4, qty: [2, 5] }, { item: 'benkrona', chance: 0.01, qty: [1, 1] }] },
  kultistnovis: { name: 'Kultistnovis', icon: '🧙', eldritch: true, sanityDmg: 4, hp: 170, attack: 20, defence: 12, maxHit: 28, speed: 2400, gold: [15, 40], drops: [{ item: 'kultisttext', chance: 0.25, qty: [1, 1] }, { item: 'lugnande_te', chance: 0.15, qty: [1, 2] }] },

  djuping: { name: 'Djuping', icon: '🐟', eldritch: true, sanityDmg: 4, hp: 350, attack: 32, defence: 30, maxHit: 45, speed: 2800, gold: [30, 70], drops: [{ item: 'ra_kalmarling', chance: 0.3, qty: [1, 3] }, { item: 'djupingens_treudd', chance: 0.005, qty: [1, 1] }] },
  kultistprast: { name: 'Kultistpräst', icon: '🕯️', eldritch: true, sanityDmg: 6, hp: 300, attack: 35, defence: 28, maxHit: 55, speed: 2600, gold: [40, 90], drops: [{ item: 'kultisttext', chance: 0.5, qty: [1, 2] }, { item: 'necronomicon_sida', chance: 0.02, qty: [1, 1] }] },
  shoggothlarv: { name: 'Shoggothlarv', icon: '🫧', eldritch: true, sanityDmg: 7, hp: 500, attack: 30, defence: 35, maxHit: 50, speed: 3000, gold: [30, 80], drops: [{ item: 'nattskatta', chance: 0.3, qty: [2, 4] }, { item: 'svartjarnstacka', chance: 0.2, qty: [1, 2] }] },

  mi_go: { name: 'Mi-Go', icon: '🦟', eldritch: true, sanityDmg: 6, hp: 650, attack: 52, defence: 50, maxHit: 75, speed: 2600, gold: [70, 150], drops: [{ item: 'stjarnmetallmalm', chance: 0.25, qty: [1, 2] }, { item: 'mi_go_cylinder', chance: 0.005, qty: [1, 1] }] },
  fargen: { name: 'Färgen ur rymden', icon: '🌈', eldritch: true, sanityDmg: 9, hp: 800, attack: 55, defence: 60, maxHit: 70, speed: 2800, gold: [80, 170], drops: [{ item: 'dromvallmo', chance: 0.3, qty: [2, 4] }, { item: 'adamantintacka', chance: 0.15, qty: [1, 2] }] },
  byakhee: { name: 'Byakhee', icon: '🦇', eldritch: true, sanityDmg: 7, hp: 700, attack: 58, defence: 52, maxHit: 85, speed: 2400, gold: [80, 160], drops: [{ item: 'necronomicon_sida', chance: 0.05, qty: [1, 1] }, { item: 'klarsynsdryck', chance: 0.08, qty: [1, 1] }] },

  nattgast: { name: 'Nattgast', icon: '👤', eldritch: true, sanityDmg: 8, hp: 1100, attack: 72, defence: 75, maxHit: 100, speed: 2600, gold: [150, 300], drops: [{ item: 'stjarnros', chance: 0.25, qty: [1, 3] }, { item: 'necronomicon_sida', chance: 0.08, qty: [1, 1] }] },
  stjarnyngel: { name: 'Stjärnyngel', icon: '🐙', eldritch: true, sanityDmg: 10, hp: 1600, attack: 80, defence: 80, maxHit: 130, speed: 2800, gold: [200, 400], drops: [{ item: 'ra_leviatanyngel', chance: 0.3, qty: [1, 3] }, { item: 'stjarnmetalltacka', chance: 0.15, qty: [1, 2] }] },
  dagon: { name: 'Fader Dagon', icon: '🔱', boss: true, eldritch: true, sanityDmg: 14, hp: 3500, attack: 92, defence: 90, maxHit: 160, speed: 3000, gold: [1000, 2500], drops: [{ item: 'dagons_fjall', chance: 0.05, qty: [1, 1] }, { item: 'aldre_elixir', chance: 0.3, qty: [1, 2] }, { item: 'necronomicon_sida', chance: 0.5, qty: [1, 3] }] },
};

const AREAS = [
  { id: 'kusten', name: 'Saltmyrs kuststräcka', level: 1, icon: '🌊', desc: 'Dimman ligger tät över tångbankarna. Fiskarna säger att något har krupit upp ur vattnet om nätterna.', monsters: ['jattekrabba', 'djupingyngel', 'smugglare'] },
  { id: 'gravfaltet', name: 'Svartskogens gravfält', level: 15, icon: '🪦', desc: 'Gravstenarna lutar som om något grävt under dem. Kultister har setts tända ljus bland kullarna.', monsters: ['skelettkrigare', 'ghoul', 'kultistnovis'] },
  { id: 'katakomberna', name: 'De drunknade katakomberna', level: 30, icon: '🏛️', desc: 'Under Saltmyrs tempel leder trappor ned i vatten. Psalmerna där nere sjungs inte av människor.', monsters: ['djuping', 'kultistprast', 'shoggothlarv'] },
  { id: 'kratern', name: 'Den fallna stjärnans krater', level: 50, icon: '☄️', desc: 'Gräset runt kratern har en färg som inte finns. Vingar surrar ovanför.', monsters: ['mi_go', 'fargen', 'byakhee'] },
  { id: 'avgrunden', name: 'Avgrunden', level: 70, icon: '🌀', desc: 'Den sjunkna staden, där vinklarna är fel och Den Drömmande väntar.', monsters: ['nattgast', 'stjarnyngel', 'dagon'] },
];

const SHOP = [
  { item: 'brod', price: 5 },
  { item: 'lugnande_te', price: 40 },
  { item: 'lakedryck', price: 60 },
  { item: 'jarn_svard', price: 150 },
  { item: 'jarn_hjalm', price: 80 },
  { item: 'jarn_brynja', price: 220 },
];

const TOOL_UPGRADES = {
  vedhuggning: { name: 'Yxa', tiers: ['Järnyxa', 'Silveryxa', 'Runyxa'] },
  fiske: { name: 'Fiskespö', tiers: ['Lingarnsspö', 'Valbensspö', 'Djupingens spö'] },
  gruvdrift: { name: 'Hacka', tiers: ['Järnhacka', 'Adamantinhacka', 'Stjärnhacka'] },
  ortsamling: { name: 'Skära', tiers: ['Silverskära', 'Månskära', 'Drömskära'] },
};
const TOOL_COSTS = [400, 5000, 60000];
const TOOL_SPEEDUP = 0.1;

const SLOTS = { vapen: 'Vapen', huvud: 'Huvud', kropp: 'Kropp', amulett: 'Amulett' };

const LORE = [
  'Kungariket Aldmark var en gång ett land av riddare, magiker och gudar som svarade när man bad. Sedan föll stjärnan.',
  'Den slog ned i Svartskogen för tre generationer sedan. Samma natt drog sig havet tillbaka från Saltmyrs hamn, och när det kom tillbaka var det svartare än förut. Fiskarna började dra upp fångster med för många ögon. Prästerna slutade få svar från sina gudar, och snart var det andra röster som svarade.',
  'Du har kommit till Saltmyr med en rostig dolk och några bröd. Byborna säger att något sover under havet, något som är äldre än gudarna, och att det drömmer. De säger att dess drömmar läcker upp till oss.',
  'Samla, smid och slåss. Bygg upp din styrka tills du kan stiga ned i Avgrunden. Men vakta ditt förstånd: det som väntar där nere bryr sig inte om din kropp. Det är ditt sinne det vill åt.',
];
