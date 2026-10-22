// Game engine: state, tick loop, travel, pack and bank, combat, saving and offline progress.

const SAVE_KEY = 'echoes-of-the-abyss-save-v3';
const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000;
const RESPAWN_MS = 1500;
const AUTO_EAT_THRESHOLD = 0.4;
const SANITY_REGEN_MS = 2000;
const HP_REGEN_MS = 5000;
const INN_REGEN_MULTIPLIER = 4;

const COMBAT_LOG_LINES = 8;

// Total xp needed to reach each level: a smooth power curve up to MAX_LEVEL.
const XP_TABLE = (() => {
  const table = [0];
  for (let lvl = 1; lvl <= MAX_LEVEL + 1; lvl++) table[lvl] = Math.floor(60 * Math.pow(lvl - 1, 2.2));
  return table;
})();

function levelFromXp(xp) {
  let lvl = 1;
  while (lvl < MAX_LEVEL && XP_TABLE[lvl + 1] <= xp) lvl++;
  return lvl;
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Dice notation such as '2d6+3'.
function parseDice(str) {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(str);
  return { n: +m[1], sides: +m[2], bonus: m[3] ? +m[3] : 0 };
}

function rollDice(str, crit = false) {
  const d = parseDice(str);
  let total = d.bonus;
  for (let i = 0; i < d.n * (crit ? 2 : 1); i++) total += randInt(1, d.sides);
  return total;
}

function d20() {
  return randInt(1, 20);
}

// Chance that d20 + bonus meets the target; a natural 1 always misses and a natural 20 always hits.
function chanceToHit(bonus, target) {
  return Math.min(0.95, Math.max(0.05, (21 - (target - bonus)) / 20));
}

function withSign(n) {
  return (n >= 0 ? '+' : '') + n;
}

const STANCES = {
  aggressive: { name: 'Aggressive', icon: '🔥', hit: 0, dmg: 2, ac: -2, desc: '+2 damage, −2 AC' },
  balanced: { name: 'Balanced', icon: '⚖️', hit: 0, dmg: 0, ac: 0, desc: 'No modifiers' },
  defensive: { name: 'Defensive', icon: '🛡️', hit: -2, dmg: 0, ac: 2, desc: '+2 AC, −2 to hit' },
};

function findAction(skill, id) {
  return (ACTIONS[skill] || []).find(a => a.id === id);
}

function findRoad(a, b) {
  return ROADS.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

function roadsFrom(loc) {
  return ROADS.filter(r => r.a === loc || r.b === loc).map(r => ({ road: r, to: r.a === loc ? r.b : r.a }));
}

const Game = {
  state: null,
  listeners: [],
  silent: false,

  newState() {
    const skills = {};
    for (const id in SKILLS) skills[id] = { xp: 0 };
    return {
      version: 3,
      gold: 50,
      skills,
      pack: { bread: 10, hatchet: 1, fishing_rod: 1 },
      bank: {},
      equipment: { weapon: 'rusty_dagger', head: null, body: null, amulet: null, back: null },
      food: 'bread',
      hp: 28,
      sanity: 100,
      location: START_LOCATION,
      home: START_LOCATION,
      visited: { [START_LOCATION]: true },
      travel: null,
      action: null,
      combat: null,
      stance: 'balanced',
      kills: {},
      madness: 0,
      derangements: [],
      quests: {},
      flags: {},
      endings: {},
      race: 'human',
      background: null,
      created: false,
      clock: DAY_MS * 0.3,
      known: { [START_LOCATION]: true },
      companion: null,
      cult: null,
      bestiary: {},
      achievements: {},
      expeditionsDone: {},
      perks: {},
      settings: { audio: false },
      achTimer: 0,
      log: [],
      regen: { hp: 0, sanity: 0 },
      seenIntro: false,
      lastSave: Date.now(),
    };
  },

  // --- Events ---
  emit(type, payload) {
    for (const fn of this.listeners) fn(type, payload);
  },
  log(msg, kind = 'info') {
    if (this.silent) return;
    this.state.log.unshift({ msg, kind, t: Date.now() });
    if (this.state.log.length > 60) this.state.log.length = 60;
    this.emit('log');
  },

  // --- Skills ---
  level(skill) {
    return levelFromXp(this.state.skills[skill].xp);
  },
  addXp(skill, amount) {
    const s = this.state.skills[skill];
    const before = levelFromXp(s.xp);
    s.xp += amount * this.xpMultiplier() * (1 + this.perk('xp', skill));
    const after = levelFromXp(s.xp);
    if (after > before) {
      this.announcePerks(skill, before, after);
      this.log(`${SKILLS[skill].icon} ${SKILLS[skill].name} reached level ${after}!`, 'level');
      if (skill === 'combat') this.state.hp = Math.min(this.maxHp(), this.state.hp + (after - before) * 8);
      this.emit('level');
    }
  },

  // --- Location ---
  here() {
    return LOCATIONS[this.state.location];
  },
  hasStation(station) {
    const def = STATIONS[station];
    if (station === 'shore' && this.hasDerangement('voices')) return true;
    return (this.here().stations || []).includes(station) || (def.portable && this.carries(def.portable));
  },

  // --- Pack (carried items) ---
  count(item) {
    return this.state.pack[item] || 0;
  },
  carries(item) {
    return this.count(item) > 0 || Object.values(this.state.equipment).includes(item);
  },
  capacity(equipment = this.state.equipment) {
    const bag = equipment.back;
    return BASE_PACK_SLOTS + (bag ? ITEMS[bag].stats.slots : 0) + (this.state.race === 'halfling' ? 3 : 0) + this.perk('carry');
  },
  usedSlots() {
    return Object.keys(this.state.pack).length;
  },
  canAdd(item) {
    return this.count(item) > 0 || this.usedSlots() < this.capacity();
  },
  addItem(item, qty = 1) {
    if (!this.canAdd(item)) return false;
    this.state.pack[item] = this.count(item) + qty;
    this.emit('pack');
    return true;
  },
  removeItem(item, qty = 1) {
    const left = this.count(item) - qty;
    if (left < 0) return false;
    if (left === 0) delete this.state.pack[item];
    else this.state.pack[item] = left;
    if (this.state.food === item && left === 0) this.log(`You have run out of ${ITEMS[item].name}.`, 'warn');
    this.emit('pack');
    return true;
  },
  hasAll(input) {
    if (!input) return true;
    return Object.entries(input).every(([item, qty]) => this.count(item) >= qty);
  },
  drop(item) {
    const qty = this.count(item);
    if (!qty) return;
    this.removeItem(item, qty);
    this.log(`You leave ${qty} × ${ITEMS[item].name} by the roadside.`);
  },
  toolTier(skill) {
    let best = -1;
    TOOLS[skill].forEach((id, tier) => { if (this.carries(id)) best = tier; });
    return best;
  },

  // --- Bank ---
  bankCount(item) {
    return this.state.bank[item] || 0;
  },
  deposit(item, qty = this.count(item)) {
    if (!this.here().bank) return;
    qty = Math.min(qty, this.count(item));
    if (qty <= 0) return;
    this.removeItem(item, qty);
    this.state.bank[item] = this.bankCount(item) + qty;
  },
  depositAll() {
    if (!this.here().bank) return;
    for (const item of Object.keys(this.state.pack)) {
      if (ITEMS[item].type !== 'tool' && item !== this.state.food) this.deposit(item);
    }
    this.log('You deposit everything except your tools and chosen food.');
  },
  withdraw(item, qty = this.bankCount(item)) {
    if (!this.here().bank) return;
    qty = Math.min(qty, this.bankCount(item));
    if (qty <= 0) return;
    if (!this.addItem(item, qty)) return this.log('Your pack is full.', 'warn');
    const left = this.bankCount(item) - qty;
    if (left) this.state.bank[item] = left;
    else delete this.state.bank[item];
  },

  // --- Shop ---
  shop() {
    return this.here().shop ? SHOPS[this.here().shop] : null;
  },
  sell(item, qty) {
    if (!this.shop() || this.shop().buysNothing) return;
    qty = Math.min(qty, this.count(item));
    if (qty <= 0) return;
    this.removeItem(item, qty);
    const gold = ITEMS[item].sell * qty;
    this.state.gold += gold;
    this.log(`Sold ${qty} × ${ITEMS[item].name} for ${gold} gold.`);
  },
  buy(item, qty = 1) {
    const shop = this.shop();
    const entry = shop && shop.stock.find(s => s.item === item);
    if (!entry || this.shopRefuses()) return;
    const cost = this.price(entry) * qty;
    if (this.funds() < cost) return this.log('You cannot afford that.', 'warn');
    if (!this.addItem(item, qty)) return this.log('Your pack is full.', 'warn');
    const cur = this.currency();
    if (cur) this.removeItem(cur, cost);
    else this.state.gold -= cost;
    this.log(`Bought ${qty} × ${ITEMS[item].name} for ${cost} ${cur ? ITEMS[cur].name : 'gold'}.`);
  },

  // --- Equipment ---
  meetsReq(item) {
    const req = ITEMS[item].req;
    if (!req) return true;
    return Object.entries(req).every(([skill, lvl]) => this.level(skill) >= lvl);
  },
  equip(item) {
    const def = ITEMS[item];
    if (def.type !== 'equipment' || this.count(item) < 1) return;
    if (!this.meetsReq(item)) return this.log('You do not meet the requirements to wear this.', 'warn');
    const eq = this.state.equipment;
    const old = eq[def.slot];
    const packBefore = Object.assign({}, this.state.pack);
    this.removeItem(item, 1);
    eq[def.slot] = item;
    if (old) this.state.pack[old] = this.count(old) + 1;
    if (this.usedSlots() > this.capacity()) {
      // Swapping would overflow the pack (e.g. a smaller bag); undo.
      this.state.pack = packBefore;
      eq[def.slot] = old;
      return this.log('Your pack has no room for that swap.', 'warn');
    }
    this.log(`You equip the ${def.name}.`);
    this.emit('pack');
  },
  unequip(slot) {
    const eq = this.state.equipment;
    const item = eq[slot];
    if (!item) return;
    const after = Object.assign({}, eq, { [slot]: null });
    const needsSlot = this.count(item) === 0 ? 1 : 0;
    if (this.usedSlots() + needsSlot > this.capacity(after)) return this.log('Your pack is too full to take that off.', 'warn');
    eq[slot] = null;
    this.state.pack[item] = this.count(item) + 1;
    this.emit('pack');
  },
  // Raw fish counts as food for someone with a ghoul's hunger.
  isFood(item) {
    return ITEMS[item].type === 'food' || (this.hasDerangement('ghoul_hunger') && item.startsWith('raw_') && !!ITEMS[item.slice(4)]);
  },
  foodHeal(item) {
    let heal = ITEMS[item].heal;
    if (this.hasDerangement('ghoul_hunger')) {
      if (item === 'bread') return 0;
      if (item.startsWith('raw_')) heal = ITEMS[item.slice(4)].heal;
    }
    return Math.round(heal * (1 + this.perk('heal')));
  },
  setFood(item) {
    if (!this.isFood(item)) return;
    this.state.food = item;
    this.log(`${ITEMS[item].name} is now your chosen food.`);
    this.emit('pack');
  },
  playerStats() {
    const total = { hit: 0, dmg: 0, ac: 0, ward: 0 };
    for (const slot in this.state.equipment) {
      const item = this.state.equipment[slot];
      if (!item) continue;
      for (const [k, v] of Object.entries(ITEMS[item].stats || {})) if (k in total) total[k] += v;
    }
    const weapon = this.state.equipment.weapon;
    total.speed = weapon ? ITEMS[weapon].speed : 2000;
    total.dice = weapon ? ITEMS[weapon].dice : '1d2';
    return total;
  },
  stance() {
    return STANCES[this.state.stance] || STANCES.balanced;
  },
  maxHp() {
    return 20 + 8 * this.level('combat') - (this.hasDerangement('drowned_lungs') ? 10 : 0) + this.perk('hp');
  },
  maxSanity() {
    return 100 - SANITY_PER_MADNESS * this.state.madness;
  },
  proficiency() {
    return 2 + Math.floor((this.level('combat') - 1) / 6);
  },
  might() {
    return Math.floor(this.level('combat') / 3);
  },
  attackBonus() {
    return this.proficiency() + this.playerStats().hit + this.stance().hit - (this.hasDerangement('star_touched') ? 1 : 0) + this.perk('hit');
  },
  attackBonusVs(m) {
    return this.attackBonus() + (m.eldritch && this.hasDerangement('night_eyes') ? 2 : 0) + (m.eldritch && this.state.race === 'tiefling' ? 1 : 0);
  },
  damageBonus() {
    return this.might() + this.playerStats().dmg + this.stance().dmg + this.perk('dmg');
  },
  damageText() {
    const bonus = this.damageBonus();
    return this.playerStats().dice + (bonus ? withSign(bonus) : '');
  },
  armourClass() {
    return 10 + this.playerStats().ac + this.stance().ac + (this.hasDerangement('paranoia') ? 2 : 0) + (this.state.race === 'dwarf' ? 1 : 0) + this.perk('ac');
  },
  // Bonus to sanity saving throws: occult understanding plus warding gear.
  wits() {
    return Math.floor(this.level('occultism') / 5) + this.playerStats().ward - (this.hasDerangement('night_eyes') ? 2 : 0)
      + (this.state.race === 'elf' ? 2 : 0) + (this.state.background === 'scholar' ? 1 : 0) + this.perk('ward');
  },
  eldritchBonus() {
    return (this.level('occultism') - 1) / 100 + this.perk('eldritch');
  },

  // --- Consumables ---
  heal(amount) {
    this.state.hp = Math.min(this.maxHp(), this.state.hp + amount);
  },
  // Negative amounts drain sanity but never break the mind on their own.
  restoreSanity(amount) {
    this.state.sanity = Math.max(Math.min(1, this.state.sanity), Math.min(this.maxSanity(), this.state.sanity + amount));
  },
  eat() {
    const food = this.state.food;
    if (!food || this.count(food) < 1 || !this.isFood(food)) return false;
    if (this.state.hp >= this.maxHp()) return false;
    this.removeItem(food, 1);
    this.heal(this.foodHeal(food));
    return true;
  },
  use(item) {
    const def = ITEMS[item];
    if (this.count(item) < 1) return;
    if (this.isFood(item)) {
      this.removeItem(item, 1);
      this.heal(this.foodHeal(item));
      this.log(`You eat the ${def.name}.`);
    } else if (def.type === 'potion') {
      this.removeItem(item, 1);
      // Alchemy perks make potions stronger, but never make the Veil Draught drain more.
      const potency = 1 + this.perk('potency');
      if (def.heal) this.heal(Math.round(def.heal * potency));
      if (def.sanity) this.restoreSanity(def.sanity > 0 ? Math.round(def.sanity * potency) : def.sanity);
      this.log(`You drink the ${def.name}.`, 'good');
    }
  },

  // --- Actions ---
  actionTime(skill, action) {
    const tier = TOOLS[skill] ? Math.max(0, this.toolTier(skill)) : 0;
    const stars = TOOLS[skill] && this.hasDerangement('star_touched') ? 0.85 : 1;
    const practised = 1 - Math.min(MAX_PERK_SPEED, this.perk('speed', skill));
    return Math.round(action.time * (1 - TOOL_SPEEDUP[tier]) * stars * this.raceSpeed(skill) * practised);
  },
  availableHere(skill, action) {
    if (action.veil && !this.veilSight()) return false;
    if (action.station) return this.hasStation(action.station);
    return ((this.here().gather || {})[skill] || []).includes(action.id);
  },
  // Why an action cannot be done right now, or null if it can.
  actionBlocker(skill, action) {
    if (this.state.travel) return 'You are travelling';
    if (this.level(skill) < action.level) return `Requires level ${action.level}`;
    if (!this.availableHere(skill, action)) return action.station ? `Needs a ${STATIONS[action.station].name}` : 'Not found here';
    if (TOOLS[skill] && this.toolTier(skill) < 0) return `Needs a ${ITEMS[TOOLS[skill][0]].name}`;
    const when = this.whenBlocker(action);
    if (when) return when;
    if (!this.hasAll(action.input)) return 'Missing materials';
    if (action.sanityCost && this.state.sanity < this.sanityCostOf(skill, action)) return 'Not enough sanity';
    if (!Object.keys(action.output).every(item => this.canAdd(item))) return 'Your pack is full';
    return null;
  },
  // Locations where an action can be performed (ignoring portable tools).
  whereAvailable(skill, action) {
    return Object.keys(LOCATIONS).filter(id => {
      const loc = LOCATIONS[id];
      if (loc.hidden && !this.veilSight()) return false;
      if (!this.state.known[id]) return false;
      if (action.station) return (loc.stations || []).includes(action.station);
      return ((loc.gather || {})[skill] || []).includes(action.id);
    });
  },
  startAction(skill, id) {
    const action = findAction(skill, id);
    if (!action) return;
    const a = this.state.action;
    if (a && a.skill === skill && a.id === id) return this.stop();
    const why = this.actionBlocker(skill, action);
    if (why) return this.log(why + '.', 'warn');
    this.stop(true);
    this.state.action = { skill, id, progress: 0 };
    this.emit('action');
  },
  stop(quiet) {
    const c = this.state.combat;
    if (c && c.expedition) this.log(`You flee the depths. The expedition is abandoned.`, 'warn');
    else if (c && !quiet) this.log('You withdraw from the fight.');
    this.state.action = null;
    this.state.combat = null;
    this.emit('action');
  },
  completeAction(skill, action) {
    const why = this.actionBlocker(skill, action);
    if (why) {
      this.log(`${SKILLS[skill].name} stopped: ${why.toLowerCase()}.`, 'warn');
      this.state.action = null;
      this.emit('action');
      return false;
    }
    // Perks may save the materials, double the result, or turn up something rare.
    if (!(Math.random() < this.perk('save', skill))) {
      for (const [item, qty] of Object.entries(action.input || {})) this.removeItem(item, qty);
    }
    if (action.sanityCost) {
      this.state.sanity -= this.sanityCostOf(skill, action);
      if (this.state.sanity <= 0) {
        this.addXp(skill, action.xp);
        this.mindBreaks();
        return false;
      }
    }
    const mult = Math.random() < this.perk('double', skill) ? 2 : 1;
    for (const [item, qty] of Object.entries(action.output)) this.addItem(item, qty * mult);
    if (RARE_FINDS[skill] && Math.random() < this.perk('rare', skill) && this.addItem(RARE_FINDS[skill], 1)) {
      this.log(`A lucky find: ${ITEMS[RARE_FINDS[skill]].name}!`, 'rare');
    }
    for (const b of action.bonus || []) {
      if (Math.random() < b.chance && this.addItem(b.item, b.qty)) this.log(`Something unusual: ${ITEMS[b.item].name}!`, 'rare');
    }
    this.addXp(skill, action.xp);
    return true;
  },

  // --- Travel ---
  roadBlocker(road) {
    // You can always leave a hidden place, even if the Veil closes while you are there.
    const leavingHidden = LOCATIONS[this.state.location].hidden && (road.a === this.state.location || road.b === this.state.location);
    if (road.veil && !this.veilSight() && !leavingHidden) return 'Only visible through the Veil';
    if (road.flag && !this.state.flags[road.flag]) return road.note || 'The way is closed to you';
    const waived = item => item === 'diving_helm' && (this.hasDerangement('drowned_lungs') || this.starsRight());
    const missing = (road.req || []).filter(item => !this.carries(item) && !waived(item));
    if (missing.length) return 'Requires ' + missing.map(i => ITEMS[i].name).join(', ');
    return null;
  },
  // Fastest passable route (Dijkstra). Returns { path, time, cost } or null.
  findRoute(target) {
    const start = this.state.location;
    const dist = { [start]: 0 };
    const prev = {};
    const open = new Set([start]);
    while (open.size) {
      let cur = null;
      for (const n of open) if (cur === null || dist[n] < dist[cur]) cur = n;
      open.delete(cur);
      if (cur === target) break;
      for (const { road, to } of roadsFrom(cur)) {
        if (this.roadBlocker(road) || !this.canReach(to)) continue;
        const d = dist[cur] + road.time;
        if (dist[to] === undefined || d < dist[to]) {
          dist[to] = d;
          prev[to] = cur;
          open.add(to);
        }
      }
    }
    if (dist[target] === undefined) return null;
    const path = [target];
    while (path[0] !== start) path.unshift(prev[path[0]]);
    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) cost += this.roadCost(findRoad(path[i], path[i + 1]));
    return { path, time: dist[target], cost };
  },
  travelTo(target) {
    if (target === this.state.location || !LOCATIONS[target]) return;
    const route = this.findRoute(target);
    if (!route) return this.log(`You cannot find a way to ${LOCATIONS[target].name} with what you carry.`, 'warn');
    if (route.cost > this.state.gold) return this.log(`The journey costs ${route.cost} gold, which you do not have.`, 'warn');
    this.stop(true);
    this.state.travel = { path: route.path, leg: 0, progress: 0 };
    this.startLeg();
    this.log(`You set out for ${LOCATIONS[target].name}.`);
    this.emit('action');
  },
  startLeg() {
    const t = this.state.travel;
    const road = findRoad(t.path[t.leg], t.path[t.leg + 1]);
    const cost = this.roadCost(road);
    if (cost) {
      if (this.state.gold < cost) {
        this.log('You cannot pay the ferryman. Your journey ends here.', 'warn');
        this.state.travel = null;
        return;
      }
      this.state.gold -= cost;
      this.log(`You pay ${cost} gold for passage.`);
    } else if (road.cost) {
      this.log(this.isLowTide() && road.tideFree ? 'The tide is out. You wade across the exposed reef.' : 'The ferryman waves you aboard for free.');
    }
  },
  travelProgress() {
    const t = this.state.travel;
    if (!t) return null;
    const from = t.path[t.leg];
    const to = t.path[t.leg + 1];
    const legTime = findRoad(from, to).time * 1000;
    // Whole-journey progress, plus where each stop along the way falls (0–1).
    const legs = [];
    for (let i = 0; i < t.path.length - 1; i++) legs.push(findRoad(t.path[i], t.path[i + 1]).time * 1000);
    const total = legs.reduce((a, b) => a + b, 0);
    const done = legs.slice(0, t.leg).reduce((a, b) => a + b, 0) + t.progress;
    const stops = [];
    let acc = 0;
    for (let i = 0; i < legs.length - 1; i++) stops.push((acc += legs[i]) / total);
    return { from, to, frac: t.progress / legTime, remaining: total - done, overall: done / total, stops, start: t.path[0], target: t.path[t.path.length - 1], paused: !!t.event };
  },
  arriveAt(loc) {
    const s = this.state;
    s.location = loc;
    s.visited[loc] = true;
    s.known[loc] = true;
    if (LOCATIONS[loc].inn) s.home = loc;
    this.questEvent('visit', loc);
  },
  tickTravel(dt) {
    const t = this.state.travel;
    if (t.event) return;
    t.progress += dt * this.travelSpeed();
    while (this.state.travel) {
      const legTime = findRoad(t.path[t.leg], t.path[t.leg + 1]).time * 1000;
      // Halfway along each road, something may happen (never while you are away).
      if (!t.rolled && t.progress >= legTime / 2) {
        t.rolled = true;
        if (!this.silent && Math.random() < EVENT_CHANCE) {
          t.event = this.rollEvent(t.path[t.leg], t.path[t.leg + 1]);
          if (t.event) {
            t.progress = legTime / 2;
            this.emit('event');
            return;
          }
        }
      }
      if (t.progress < legTime) break;
      t.progress -= legTime;
      t.leg++;
      t.rolled = false;
      this.arriveAt(t.path[t.leg]);
      if (t.leg >= t.path.length - 1) {
        this.state.travel = null;
        this.log(`You arrive at ${LOCATIONS[t.path[t.leg]].name}.`, 'good');
      } else {
        this.startLeg();
      }
      this.emit('action');
    }
  },

  // --- Combat ---
  startCombat(monsterId) {
    if (this.state.travel || !(this.here().monsters || []).includes(monsterId)) return;
    this.stop(true);
    if (this.state.hp <= 0) this.state.hp = 1;
    this.state.combat = {
      monster: monsterId,
      monsterHp: MONSTERS[monsterId].hp,
      playerTimer: 0,
      monsterTimer: 0,
      respawn: 0,
      log: [],
    };
    this.log(`You engage the ${MONSTERS[monsterId].name}.`);
    this.emit('action');
  },
  setStance(stance) {
    if (!STANCES[stance]) return;
    this.state.stance = stance;
    this.emit('action');
  },
  combatLog(c, msg) {
    c.log.unshift(msg);
    if (c.log.length > COMBAT_LOG_LINES) c.log.length = COMBAT_LOG_LINES;
  },
  playerAttack(c, m) {
    let roll = d20();
    if (roll === 1 && this.state.race === 'halfling') {
      roll = d20();
      this.combatLog(c, `Halfling luck! You reroll the 1 and get ${roll}.`);
    }
    const bonus = this.attackBonusVs(m);
    const total = roll + bonus;
    const critFrom = 20 - this.perk('crit');
    if (roll === 1 || (roll < critFrom && total < m.ac)) {
      this.combatLog(c, `You roll ${roll}${withSign(bonus)} = ${total} vs AC ${m.ac}: miss.`);
      return;
    }
    const crit = roll >= critFrom;
    let dmg = Math.max(1, rollDice(this.playerStats().dice, crit) + this.damageBonus());
    if (m.eldritch) dmg = Math.floor(dmg * (1 + this.eldritchBonus()));
    c.monsterHp -= dmg;
    this.combatLog(c, crit ? `${roll === 20 ? 'Natural 20' : `Critical (${roll})`}! You strike for ${dmg} damage.` : `You roll ${roll}${withSign(bonus)} = ${total} vs AC ${m.ac}: hit for ${dmg}.`);
  },
  monsterAttack(c, m) {
    if (this.companionActive() && Math.random() < COMPANION_TARGET_CHANCE) return this.monsterAttacksCompanion(c, m);
    const roll = d20();
    const ac = this.armourClass();
    const hit = this.monsterHit(m);
    if (roll === 1 || (roll !== 20 && roll + hit < ac)) {
      this.combatLog(c, `The ${m.name} rolls ${roll + hit} vs your AC ${ac}: miss.`);
      return;
    }
    const crit = roll === 20;
    const dmg = Math.max(1, rollDice(m.dmg, crit));
    this.state.hp -= dmg;
    this.combatLog(c, `${crit ? 'Critical! ' : ''}The ${m.name} hits you for ${dmg}.`);
    if (m.eldritch) {
      const save = d20() + this.wits();
      const dc = this.eldritchDc(m);
      if (save >= dc) {
        this.combatLog(c, `Sanity save ${save} vs DC ${dc}: your mind holds.`);
      } else {
        this.state.sanity = Math.max(0, this.state.sanity - m.eldritch.loss);
        this.combatLog(c, `Sanity save ${save} vs DC ${dc}: you lose ${m.eldritch.loss} sanity.`);
      }
    }
  },
  monsterKilled(c, m) {
    this.state.kills[c.monster] = (this.state.kills[c.monster] || 0) + 1;
    c.slain = (c.slain || 0) + 1;
    const gold = randInt(m.gold[0], m.gold[1]);
    this.state.gold += gold;
    const xp = m.eldritch && this.starsRight() ? m.xp * 2 : m.xp;
    this.addXp('combat', xp);
    this.combatLog(c, `The ${m.name} falls. +${Math.round(xp * this.xpMultiplier())} xp, +${gold} gold.`);
    this.recordBestiary(c.monster);
    const killHeal = this.perk('killHeal');
    if (killHeal) this.heal(killHeal);
    if (m.eldritch && this.state.madness >= 3) {
      this.restoreSanity(m.eldritch.loss);
      this.combatLog(c, `You feast on its fear (+${m.eldritch.loss} sanity).`);
    }
    this.questEvent('kill', c.monster);
    if (!this.state.combat) return;
    for (const d of m.drops) {
      if (Math.random() >= d.chance) continue;
      const qty = randInt(d.qty[0], d.qty[1]);
      if (!this.addItem(d.item, qty)) {
        this.log(`Your pack is full. You leave the ${ITEMS[d.item].name} behind.`, 'warn');
      } else if (d.chance <= 0.05) {
        this.log(`Rare find: ${ITEMS[d.item].name}!`, 'rare');
      }
    }
    c.respawn = RESPAWN_MS;
    c.playerTimer = 0;
    c.monsterTimer = 0;
    c.compTimer = 0;
    if (c.expedition) this.advanceExpedition(c);
    this.emit('kill');
  },
  tickCombat(dt) {
    const c = this.state.combat;
    const m = MONSTERS[c.monster];
    if (c.respawn > 0) {
      c.respawn -= dt;
      if (c.respawn <= 0) {
        c.respawn = 0;
        c.monsterHp = m.hp;
      }
      return;
    }
    if (this.companionActive()) {
      const compSpeed = this.companion().speed;
      c.compTimer = (c.compTimer || 0) + dt;
      while (c.compTimer >= compSpeed) {
        c.compTimer -= compSpeed;
        this.companionAttack(c, m);
        if (c.monsterHp <= 0) return this.monsterKilled(c, m);
      }
    }
    const speed = this.playerStats().speed;
    c.playerTimer += dt;
    c.monsterTimer += dt;
    while (this.state.combat && (c.playerTimer >= speed || c.monsterTimer >= m.speed)) {
      if (c.playerTimer >= speed) {
        c.playerTimer -= speed;
        this.playerAttack(c, m);
        if (c.monsterHp <= 0) return this.monsterKilled(c, m);
      }
      if (c.monsterTimer >= m.speed) {
        c.monsterTimer -= m.speed;
        this.monsterAttack(c, m);
        if (this.state.hp < this.maxHp() * AUTO_EAT_THRESHOLD) this.eat();
        if (this.state.hp <= 0) return this.playerDied();
        if (this.state.sanity <= 0) return this.mindBreaks();
      }
    }
  },
  wakeAtHome() {
    this.state.combat = null;
    this.state.travel = null;
    this.state.location = this.state.home;
  },
  playerDied() {
    this.wakeAtHome();
    this.state.hp = this.maxHp();
    const lost = Math.floor(this.state.gold * 0.1);
    this.state.gold -= lost;
    this.log(`You have fallen. You wake at ${LOCATIONS[this.state.home].name}, ${lost} gold poorer.`, 'bad');
    this.emit('action');
  },

  // --- Tick ---
  tick(dt) {
    const s = this.state;
    s.clock += dt;
    this.tickCult(dt);
    s.achTimer += dt;
    if (s.achTimer >= ACHIEVEMENT_CHECK_MS) {
      s.achTimer = 0;
      if (!this.silent) this.checkAchievements();
    }
    if (s.travel) {
      this.tickTravel(dt);
    } else if (s.combat) {
      this.tickCombat(dt);
    }
    if (!s.combat) {
      this.tickCompanion(dt);
      const rate = this.here().inn && !s.travel ? INN_REGEN_MULTIPLIER : 1;
      s.regen.hp += dt * rate;
      while (s.regen.hp >= HP_REGEN_MS) {
        s.regen.hp -= HP_REGEN_MS;
        this.heal(Math.ceil(this.maxHp() * 0.02));
      }
      const regenSanity = !s.action || s.action.skill !== 'occultism';
      s.regen.sanity += dt * rate * (this.hasDerangement('voices') ? 0.5 : 1);
      while (s.regen.sanity >= SANITY_REGEN_MS) {
        s.regen.sanity -= SANITY_REGEN_MS;
        if (regenSanity) this.restoreSanity(1);
      }
    }
    if (s.action) {
      const action = findAction(s.action.skill, s.action.id);
      const time = this.actionTime(s.action.skill, action);
      s.action.progress += dt;
      while (s.action && s.action.progress >= time) {
        s.action.progress -= time;
        if (!this.completeAction(s.action.skill, action)) break;
      }
    }
  },

  // --- Offline ---
  simulateOffline(ms) {
    const s = this.state;
    const before = { pack: Object.assign({}, s.pack), gold: s.gold, xp: {}, location: s.location };
    for (const id in SKILLS) before.xp[id] = s.skills[id].xp;
    this.silent = true;
    const step = 500;
    let left = Math.min(ms, MAX_OFFLINE_MS);
    while (left > 0 && (s.action || s.combat || s.travel || s.hp < this.maxHp() || s.sanity < this.maxSanity())) {
      const dt = Math.min(step, left);
      this.tick(dt);
      left -= dt;
    }
    this.silent = false;
    this.checkAchievements();
    const diff = { ms, items: {}, gold: s.gold - before.gold, xp: {}, moved: s.location !== before.location ? s.location : null };
    const ids = new Set([...Object.keys(before.pack), ...Object.keys(s.pack)]);
    for (const id of ids) {
      const d = (s.pack[id] || 0) - (before.pack[id] || 0);
      if (d) diff.items[id] = d;
    }
    for (const id in SKILLS) {
      const d = s.skills[id].xp - before.xp[id];
      if (d >= 1) diff.xp[id] = Math.floor(d);
    }
    return diff;
  },

  // --- Saving ---
  save() {
    this.state.lastSave = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save', e);
    }
  },
  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      console.warn('Could not read save', e);
    }
    this.state = raw ? this.migrate(JSON.parse(raw)) : this.newState();
    this.applyWorld();
    if (!raw) return null;
    const away = Date.now() - this.state.lastSave;
    return away > 10000 ? this.simulateOffline(away) : null;
  },
  migrate(saved) {
    // Fill in fields missing from older saves so new content does not break the game.
    const state = Object.assign(this.newState(), saved);
    for (const id in SKILLS) if (!state.skills[id]) state.skills[id] = { xp: 0 };
    for (const store of [state.pack, state.bank]) for (const id in store) if (!ITEMS[id]) delete store[id];
    for (const slot in SLOTS) if (!(slot in state.equipment) || (state.equipment[slot] && !ITEMS[state.equipment[slot]])) state.equipment[slot] = null;
    if (!LOCATIONS[state.location]) state.location = START_LOCATION;
    if (!LOCATIONS[state.home]) state.home = START_LOCATION;
    if (state.action && !findAction(state.action.skill, state.action.id)) state.action = null;
    if (state.combat && !MONSTERS[state.combat.monster]) state.combat = null;
    if (state.travel && !state.travel.path.every(l => LOCATIONS[l])) state.travel = null;
    state.derangements = state.derangements.filter(id => DERANGEMENTS[id]);
    // Saves from before character creation and fog of war keep their progress.
    if (saved.created === undefined) state.created = !!saved.seenIntro;
    for (const loc in state.visited) state.known[loc] = true;
    for (const loc in state.known) if (!LOCATIONS[loc]) delete state.known[loc];
    if (state.companion && !COMPANIONS[state.companion.id]) state.companion = null;
    for (const id in state.quests) if (!QUESTS[id]) delete state.quests[id];
    return state;
  },
  exportSave() {
    this.save();
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.state))));
  },
  importSave(text) {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    this.state = this.migrate(parsed);
    this.applyWorld();
    this.save();
    this.emit('reset');
  },
  reset() {
    this.state = this.newState();
    this.applyWorld();
    this.save();
    this.emit('reset');
  },
};

if (typeof module !== 'undefined') module.exports = { Game, XP_TABLE, levelFromXp };
