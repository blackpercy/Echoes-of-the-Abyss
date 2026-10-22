// Spelmotor: tillstånd, tick-loop, strid, sparning och offline-framsteg.

const SAVE_KEY = 'ekon-fran-avgrunden-save-v1';
const MAX_LEVEL = 99;
const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000;
const RESPAWN_MS = 1500;
const AUTO_EAT_THRESHOLD = 0.4;
const SANITY_REGEN_MS = 2000;
const HP_REGEN_MS = 5000;

const XP_TABLE = (() => {
  const table = [0, 0];
  let points = 0;
  for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
    points += Math.floor(lvl + 300 * Math.pow(2, lvl / 7));
    table[lvl + 1] = Math.floor(points / 4);
  }
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

function findAction(skill, id) {
  return (ACTIONS[skill] || []).find(a => a.id === id);
}

const Game = {
  state: null,
  listeners: [],
  silent: false,

  newState() {
    const skills = {};
    for (const id in SKILLS) skills[id] = { xp: 0 };
    skills.livskraft.xp = XP_TABLE[10];
    const tools = {};
    for (const id in TOOL_UPGRADES) tools[id] = 0;
    return {
      version: 1,
      gold: 25,
      skills,
      bank: { brod: 10 },
      equipment: { vapen: 'rostig_dolk', huvud: null, kropp: null, amulett: null },
      food: 'brod',
      hp: 100,
      sanity: 100,
      action: null,
      combat: null,
      combatStyle: 'anfall',
      tools,
      kills: {},
      log: [],
      regen: { hp: 0, sanity: 0 },
      seenIntro: false,
      lastSave: Date.now(),
    };
  },

  // --- Händelser ---
  emit(type) {
    for (const fn of this.listeners) fn(type);
  },
  log(msg, kind = 'info') {
    if (this.silent) return;
    this.state.log.unshift({ msg, kind, t: Date.now() });
    if (this.state.log.length > 60) this.state.log.length = 60;
    this.emit('log');
  },

  // --- Färdigheter ---
  level(skill) {
    return levelFromXp(this.state.skills[skill].xp);
  },
  addXp(skill, amount) {
    const s = this.state.skills[skill];
    const before = levelFromXp(s.xp);
    s.xp += amount;
    const after = levelFromXp(s.xp);
    if (after > before) {
      this.log(`${SKILLS[skill].icon} ${SKILLS[skill].name} nådde nivå ${after}!`, 'level');
      if (skill === 'livskraft') this.state.hp = Math.min(this.maxHp(), this.state.hp + (after - before) * 10);
      this.emit('level');
    }
  },

  // --- Bank ---
  count(item) {
    return this.state.bank[item] || 0;
  },
  addItem(item, qty = 1) {
    this.state.bank[item] = this.count(item) + qty;
    this.emit('bank');
  },
  removeItem(item, qty = 1) {
    const left = this.count(item) - qty;
    if (left < 0) return false;
    if (left === 0) delete this.state.bank[item];
    else this.state.bank[item] = left;
    if (this.state.food === item && left === 0) this.log(`Du har slut på ${ITEMS[item].name.toLowerCase()}.`, 'warn');
    this.emit('bank');
    return true;
  },
  hasAll(input) {
    if (!input) return true;
    return Object.entries(input).every(([item, qty]) => this.count(item) >= qty);
  },
  sell(item, qty) {
    qty = Math.min(qty, this.count(item));
    if (qty <= 0) return;
    this.removeItem(item, qty);
    const gold = ITEMS[item].sell * qty;
    this.state.gold += gold;
    this.log(`Sålde ${qty} × ${ITEMS[item].name} för ${gold} guld.`);
  },
  buy(item, price, qty = 1) {
    const cost = price * qty;
    if (this.state.gold < cost) return this.log('Du har inte råd.', 'warn');
    this.state.gold -= cost;
    this.addItem(item, qty);
    this.log(`Köpte ${qty} × ${ITEMS[item].name} för ${cost} guld.`);
  },
  buyTool(skill) {
    const lvl = this.state.tools[skill];
    if (lvl >= TOOL_COSTS.length) return;
    const cost = TOOL_COSTS[lvl];
    if (this.state.gold < cost) return this.log('Du har inte råd.', 'warn');
    this.state.gold -= cost;
    this.state.tools[skill] = lvl + 1;
    this.log(`Köpte ${TOOL_UPGRADES[skill].tiers[lvl]}! ${SKILLS[skill].name} går nu snabbare.`, 'good');
    this.emit('bank');
  },

  // --- Utrustning ---
  meetsReq(item) {
    const req = ITEMS[item].req;
    if (!req) return true;
    return Object.entries(req).every(([skill, lvl]) => this.level(skill) >= lvl);
  },
  equip(item) {
    const def = ITEMS[item];
    if (def.type !== 'equipment' || this.count(item) < 1) return;
    if (!this.meetsReq(item)) return this.log('Du uppfyller inte kraven för att bära detta.', 'warn');
    const current = this.state.equipment[def.slot];
    this.removeItem(item, 1);
    if (current) this.addItem(current, 1);
    this.state.equipment[def.slot] = item;
    this.log(`Du utrustar ${def.name}.`);
  },
  unequip(slot) {
    const item = this.state.equipment[slot];
    if (!item) return;
    this.state.equipment[slot] = null;
    this.addItem(item, 1);
  },
  setFood(item) {
    if (ITEMS[item].type !== 'food') return;
    this.state.food = item;
    this.log(`${ITEMS[item].name} är nu vald som mat.`);
    this.emit('bank');
  },
  playerStats() {
    const total = { attack: 0, strength: 0, defence: 0, sanityResist: 0 };
    for (const slot in this.state.equipment) {
      const item = this.state.equipment[slot];
      if (!item) continue;
      for (const [k, v] of Object.entries(ITEMS[item].stats || {})) total[k] += v;
    }
    total.sanityResist = Math.min(0.75, total.sanityResist);
    const weapon = this.state.equipment.vapen;
    total.speed = weapon ? ITEMS[weapon].speed : 2400;
    return total;
  },
  maxHp() {
    return this.level('livskraft') * 10;
  },
  maxSanity() {
    return 100;
  },
  maxHit() {
    const eff = this.level('styrka') + 8 + (this.state.combatStyle === 'styrka' ? 3 : 0);
    const str = this.playerStats().strength;
    return Math.floor(10 * (1.3 + eff / 10 + str / 80 + (eff * str) / 640));
  },
  accuracy() {
    const eff = this.level('anfall') + 8 + (this.state.combatStyle === 'anfall' ? 3 : 0);
    return eff * (64 + this.playerStats().attack);
  },
  evasion() {
    const eff = this.level('forsvar') + 8 + (this.state.combatStyle === 'forsvar' ? 3 : 0);
    return eff * (64 + this.playerStats().defence);
  },
  eldritchBonus() {
    return this.level('ockultism') / 100;
  },
  hitChance(acc, eva) {
    return acc < eva ? 0.5 * acc / eva : 1 - 0.5 * eva / acc;
  },

  // --- Förbrukning ---
  heal(amount) {
    this.state.hp = Math.min(this.maxHp(), this.state.hp + amount);
  },
  restoreSanity(amount) {
    this.state.sanity = Math.min(this.maxSanity(), this.state.sanity + amount);
  },
  eat() {
    const food = this.state.food;
    if (!food || this.count(food) < 1) return false;
    if (this.state.hp >= this.maxHp()) return false;
    this.removeItem(food, 1);
    this.heal(ITEMS[food].heal);
    return true;
  },
  use(item) {
    const def = ITEMS[item];
    if (this.count(item) < 1) return;
    if (def.type === 'food') {
      this.removeItem(item, 1);
      this.heal(def.heal);
      this.log(`Du äter ${def.name.toLowerCase()}.`);
    } else if (def.type === 'potion') {
      this.removeItem(item, 1);
      if (def.heal) this.heal(def.heal);
      if (def.sanity) this.restoreSanity(def.sanity);
      this.log(`Du dricker ${def.name.toLowerCase()}.`, 'good');
    }
  },

  // --- Handlingar ---
  actionTime(skill, action) {
    const toolLvl = this.state.tools[skill] || 0;
    return Math.round(action.time * (1 - toolLvl * TOOL_SPEEDUP));
  },
  canDo(skill, action) {
    if (this.level(skill) < action.level) return 'För låg nivå';
    if (!this.hasAll(action.input)) return 'Saknar material';
    if (action.sanityCost && this.state.sanity < action.sanityCost) return 'För lite förstånd';
    return null;
  },
  startAction(skill, id) {
    const action = findAction(skill, id);
    if (!action) return;
    const a = this.state.action;
    if (a && a.skill === skill && a.id === id) return this.stop();
    const why = this.canDo(skill, action);
    if (why) return this.log(why + '.', 'warn');
    this.stop(true);
    this.state.action = { skill, id, progress: 0 };
    this.emit('action');
  },
  stop(quiet) {
    if (this.state.combat && !quiet) this.log('Du drar dig tillbaka från striden.');
    this.state.action = null;
    this.state.combat = null;
    this.emit('action');
  },
  completeAction(skill, action) {
    const why = this.canDo(skill, action);
    if (why) {
      this.log(`${SKILLS[skill].name} avbröts: ${why.toLowerCase()}.`, 'warn');
      this.state.action = null;
      this.emit('action');
      return false;
    }
    for (const [item, qty] of Object.entries(action.input || {})) this.removeItem(item, qty);
    if (action.sanityCost) this.state.sanity -= action.sanityCost;
    for (const [item, qty] of Object.entries(action.output || {})) this.addItem(item, qty);
    for (const b of action.bonus || []) {
      if (Math.random() < b.chance) {
        this.addItem(b.item, b.qty);
        this.log(`Något ovanligt: ${ITEMS[b.item].name}!`, 'rare');
      }
    }
    this.addXp(skill, action.xp);
    return true;
  },

  // --- Strid ---
  startCombat(monsterId) {
    this.stop(true);
    if (this.state.hp <= 0) this.state.hp = 1;
    this.state.combat = {
      monster: monsterId,
      monsterHp: MONSTERS[monsterId].hp,
      playerTimer: 0,
      monsterTimer: 0,
      respawn: 0,
    };
    this.log(`Du ger dig i strid med ${MONSTERS[monsterId].name.toLowerCase()}.`);
    this.emit('action');
  },
  setStyle(style) {
    this.state.combatStyle = style;
    this.emit('action');
  },
  playerAttack(c, m) {
    const eva = (m.defence + 9) * 64;
    if (Math.random() >= this.hitChance(this.accuracy(), eva)) return;
    let dmg = randInt(1, this.maxHit());
    if (m.eldritch) dmg = Math.floor(dmg * (1 + this.eldritchBonus()));
    dmg = Math.min(dmg, c.monsterHp);
    c.monsterHp -= dmg;
    this.addXp(this.state.combatStyle, dmg * 0.4);
    this.addXp('livskraft', dmg * 0.133);
  },
  monsterAttack(m) {
    const acc = (m.attack + 9) * 64;
    if (Math.random() >= this.hitChance(acc, this.evasion())) return;
    this.state.hp -= randInt(1, m.maxHit);
    if (m.sanityDmg) {
      const loss = m.sanityDmg * (1 - this.playerStats().sanityResist);
      this.state.sanity = Math.max(0, this.state.sanity - loss);
    }
  },
  monsterKilled(c, m) {
    this.state.kills[c.monster] = (this.state.kills[c.monster] || 0) + 1;
    this.state.gold += randInt(m.gold[0], m.gold[1]);
    for (const d of m.drops) {
      if (Math.random() < d.chance) {
        const qty = randInt(d.qty[0], d.qty[1]);
        this.addItem(d.item, qty);
        if (d.chance <= 0.05) this.log(`Sällsynt fynd: ${ITEMS[d.item].name}!`, 'rare');
      }
    }
    c.respawn = RESPAWN_MS;
    c.playerTimer = 0;
    c.monsterTimer = 0;
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
        this.monsterAttack(m);
        if (this.state.hp < this.maxHp() * AUTO_EAT_THRESHOLD) this.eat();
        if (this.state.hp <= 0) return this.playerDied();
        if (this.state.sanity <= 0) return this.playerMaddened();
      }
    }
  },
  playerDied() {
    this.state.combat = null;
    this.state.hp = this.maxHp();
    const lost = Math.floor(this.state.gold * 0.1);
    this.state.gold -= lost;
    this.log(`Du har stupat. Du vaknar på Saltmyrs värdshus, ${lost} guld fattigare.`, 'bad');
    this.emit('action');
  },
  playerMaddened() {
    this.state.combat = null;
    this.state.sanity = 10;
    this.log('Ditt förstånd brister. Du flyr skrikande och vaknar senare på stranden, utan minne av hur du kom dit.', 'bad');
    this.emit('action');
  },

  // --- Tick ---
  tick(dt) {
    const s = this.state;
    if (s.combat) {
      this.tickCombat(dt);
    } else {
      s.regen.hp += dt;
      while (s.regen.hp >= HP_REGEN_MS) {
        s.regen.hp -= HP_REGEN_MS;
        this.heal(Math.ceil(this.maxHp() * 0.02));
      }
      const regenSanity = !s.action || s.action.skill !== 'ockultism';
      s.regen.sanity += dt;
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
    const before = { bank: Object.assign({}, this.state.bank), gold: this.state.gold, xp: {} };
    for (const id in SKILLS) before.xp[id] = this.state.skills[id].xp;
    this.silent = true;
    const step = 500;
    let left = Math.min(ms, MAX_OFFLINE_MS);
    while (left > 0 && (this.state.action || this.state.combat || this.state.hp < this.maxHp() || this.state.sanity < this.maxSanity())) {
      const dt = Math.min(step, left);
      this.tick(dt);
      left -= dt;
    }
    this.silent = false;
    const diff = { ms, items: {}, gold: this.state.gold - before.gold, xp: {} };
    const ids = new Set([...Object.keys(before.bank), ...Object.keys(this.state.bank)]);
    for (const id of ids) {
      const d = (this.state.bank[id] || 0) - (before.bank[id] || 0);
      if (d) diff.items[id] = d;
    }
    for (const id in SKILLS) {
      const d = this.state.skills[id].xp - before.xp[id];
      if (d >= 1) diff.xp[id] = Math.floor(d);
    }
    return diff;
  },

  // --- Sparning ---
  save() {
    this.state.lastSave = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Kunde inte spara', e);
    }
  },
  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      console.warn('Kunde inte läsa sparfil', e);
    }
    this.state = raw ? this.migrate(JSON.parse(raw)) : this.newState();
    if (!raw) return null;
    const away = Date.now() - this.state.lastSave;
    return away > 10000 ? this.simulateOffline(away) : null;
  },
  migrate(saved) {
    // Fyll på fält som saknas i äldre sparfiler så att nytt innehåll inte kraschar spelet.
    const fresh = this.newState();
    const state = Object.assign(fresh, saved);
    for (const id in SKILLS) if (!state.skills[id]) state.skills[id] = { xp: 0 };
    for (const id in TOOL_UPGRADES) if (state.tools[id] == null) state.tools[id] = 0;
    for (const id in state.bank) if (!ITEMS[id]) delete state.bank[id];
    if (state.action && !findAction(state.action.skill, state.action.id)) state.action = null;
    if (state.combat && !MONSTERS[state.combat.monster]) state.combat = null;
    return state;
  },
  exportSave() {
    this.save();
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.state))));
  },
  importSave(text) {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(text.trim()))));
    this.state = this.migrate(parsed);
    this.save();
    this.emit('reset');
  },
  reset() {
    this.state = this.newState();
    this.save();
    this.emit('reset');
  },
};

if (typeof module !== 'undefined') module.exports = { Game, XP_TABLE, levelFromXp };
