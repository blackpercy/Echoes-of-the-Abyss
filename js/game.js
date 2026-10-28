// Holdout: the strategic layer. Days, the base, survivors, resources and the region.
// Missions themselves are fought in tactics.js.

const SAVE_KEY = 'holdout-save-v1';

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function pick(list) {
  return list[randInt(0, list.length - 1)];
}
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const Game = {
  state: null,
  listeners: [],

  emit(type, payload) {
    for (const fn of this.listeners) fn(type, payload);
  },
  log(msg, kind = 'info') {
    this.state.log.unshift({ day: this.state.day, msg, kind });
    if (this.state.log.length > 80) this.state.log.length = 80;
  },

  // --- A new game ---
  newGame() {
    const s = {
      version: 1, day: 1, nextId: 1, morale: 60, threat: 10, missionToday: false,
      resources: { food: 16, materials: 14, medicine: 4, ammo: 24, fuel: 6 },
      survivors: [], facilities: { bunks: 1 }, building: null,
      armory: { pistol: 1, knife: 1 }, gear: { medkit: 2, pipe_bomb: 1, flare: 0 },
      sites: {}, contacts: [], hiveKnown: false, won: false, lost: false, battle: null,
      stats: { kills: 0, missions: 0, deaths: 0 }, log: [], seenIntro: false,
    };
    this.state = s;
    for (const [id, site] of Object.entries(SITES)) {
      s.sites[id] = { known: dist(site, BASE_SITE) <= START_REVEAL, visited: false, stock: site.stock, infested: false };
    }
    // One infestation is already festering somewhere you know.
    const known = Object.keys(s.sites).filter(id => s.sites[id].known);
    s.sites[pick(known)].infested = true;
    const starters = [
      ['fighter', 'pistol', 'bat'], ['shooter', 'rifle', 'knife'], ['medic', 'pistol', 'knife'], [pick(['scout', 'engineer']), null, 'bat'],
    ];
    for (const [spec, gun, melee] of starters) this.addSurvivor(this.makeSurvivor(spec, gun, melee));
    this.log('You bar the church doors behind you. Day one.', 'story');
    this.save();
  },
  makeSurvivor(spec, gun = null, melee = 'knife') {
    const used = new Set(this.state.survivors.map(x => x.name));
    let name;
    do name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`; while (used.has(name));
    return { id: 0, name, spec: spec || pick(Object.keys(SPECIALTIES)), baseHp: randInt(8, 11), baseAim: randInt(55, 68), xp: 0, level: 1, path: null, branch: null, perks: [], gun, melee, status: 'ready', injured: 0, infected: 0, kills: 0, missions: 0 };
  },
  addSurvivor(sv) {
    sv.id = this.state.nextId++;
    sv.hp = this.maxHp(sv);
    this.state.survivors.push(sv);
    return sv;
  },

  // --- Survivors ---
  maxHp(sv) {
    return sv.baseHp + (SPECIALTIES[sv.spec].hp || 0) + (sv.level - 1) * LEVEL_HP + (this.fx(sv).hp || 0);
  },
  aim(sv) {
    return sv.baseAim + (SPECIALTIES[sv.spec].aim || 0) + (sv.level - 1) * LEVEL_AIM + (this.fx(sv).aim || 0) + this.moraleAim();
  },
  move(sv) {
    return 5 + (SPECIALTIES[sv.spec].move || 0) + (this.fx(sv).move || 0);
  },

  // --- The skill tree ---
  // Everything a survivor's choices add up to: path, specialty and abilities.
  fx(sv) {
    const total = {};
    const add = fx => { for (const [k, v] of Object.entries(fx || {})) total[k] = (total[k] || 0) + v; };
    const path = sv.path && PATHS[sv.path];
    if (path) {
      add(path.fx);
      const branch = sv.branch && path.branches[sv.branch];
      if (branch) {
        add(branch.fx);
        for (const tier of branch.tiers) for (const perk of tier) if ((sv.perks || []).includes(perk.id)) add(perk.fx);
      }
    }
    return total;
  },
  // What a survivor can choose now: 'path', 'branch', a tier index, or null.
  pendingChoice(sv) {
    if (sv.level >= PATH_LEVEL && !sv.path) return 'path';
    if (sv.level >= BRANCH_LEVEL && !sv.branch) return 'branch';
    const tiers = sv.branch ? PATHS[sv.path].branches[sv.branch].tiers : [];
    for (let i = 0; i < TIER_LEVELS.length; i++) {
      if (sv.level >= TIER_LEVELS[i] && !tiers[i].some(p => (sv.perks || []).includes(p.id))) return i;
    }
    return null;
  },
  choose(id, choice) {
    const sv = this.survivor(id);
    if (!sv) return;
    const pending = this.pendingChoice(sv);
    const before = this.maxHp(sv);
    if (pending === 'path' && PATHS[choice]) sv.path = choice;
    else if (pending === 'branch' && PATHS[sv.path].branches[choice]) sv.branch = choice;
    else if (typeof pending === 'number' && PATHS[sv.path].branches[sv.branch].tiers[pending].some(p => p.id === choice)) sv.perks = (sv.perks || []).concat(choice);
    else return;
    // New hitpoints come at once.
    sv.hp = Math.max(1, sv.hp + this.maxHp(sv) - before);
    this.log(`${sv.name} learns ${this.choiceName(sv, choice)}.`, 'good');
    this.save();
    this.emit('change');
  },
  choiceName(sv, choice) {
    if (PATHS[choice]) return PATHS[choice].name;
    const path = PATHS[sv.path];
    if (path.branches[choice]) return path.branches[choice].name;
    for (const b of Object.values(path.branches)) for (const t of b.tiers) for (const p of t) if (p.id === choice) return p.name;
    return choice;
  },
  anyPending() {
    return this.alive().some(sv => this.pendingChoice(sv) !== null);
  },
  moraleAim() {
    return Math.round((this.state.morale - 50) / 5);
  },
  alive() {
    return this.state.survivors.filter(sv => sv.status !== 'dead' && sv.status !== 'gone');
  },
  ready() {
    return this.alive().filter(sv => sv.status === 'ready' && !sv.injured);
  },
  survivor(id) {
    return this.state.survivors.find(sv => sv.id === id);
  },
  // Returns how many levels were gained.
  addXp(sv, xp) {
    sv.xp += xp;
    let gained = 0;
    while (sv.level < LEVEL_XP.length && sv.xp >= LEVEL_XP[sv.level]) {
      sv.level++;
      gained++;
      sv.hp = Math.min(this.maxHp(sv), sv.hp + LEVEL_HP);
      this.log(`${sv.name} reaches level ${sv.level}: ${LEVEL_NAMES[sv.level - 1]}.`, 'good');
    }
    return gained;
  },
  // Swap a weapon between a survivor and the armory. slot: 'gun' or 'melee'.
  equip(id, slot, weapon) {
    const sv = this.survivor(id);
    const a = this.state.armory;
    if (!sv || (weapon && !(a[weapon] > 0))) return;
    if (weapon && WEAPONS[weapon].type !== (slot === 'gun' ? 'gun' : 'melee')) return;
    if (sv[slot]) a[sv[slot]] = (a[sv[slot]] || 0) + 1;
    if (weapon) {
      a[weapon]--;
      if (!a[weapon]) delete a[weapon];
    }
    sv[slot] = weapon || null;
    this.save();
    this.emit('change');
  },

  // --- Resources ---
  canAfford(cost) {
    return Object.entries(cost || {}).every(([r, n]) => this.state.resources[r] >= n);
  },
  pay(cost) {
    for (const [r, n] of Object.entries(cost || {})) this.state.resources[r] -= n;
  },
  gain(res) {
    for (const [r, n] of Object.entries(res || {})) this.state.resources[r] = (this.state.resources[r] || 0) + n;
  },
  costText(cost) {
    return Object.entries(cost || {}).map(([r, n]) => `${RESOURCES[r].icon} ${n}`).join(' ') || 'free';
  },

  // --- Facilities ---
  facilityLevel(id) {
    return this.state.facilities[id] || 0;
  },
  facility(id) {
    const lvl = this.facilityLevel(id);
    return lvl ? FACILITIES[id].levels[lvl - 1] : {};
  },
  usedSlots() {
    return Object.keys(this.state.facilities).length + (this.state.building && !this.state.facilities[this.state.building.id] ? 1 : 0);
  },
  buildBlocker(id) {
    const lvl = this.facilityLevel(id);
    const next = FACILITIES[id].levels[lvl];
    if (!next) return 'Fully built';
    if (this.state.building) return `Already building ${FACILITIES[this.state.building.id].name}`;
    if (!lvl && this.usedSlots() >= FACILITY_SLOTS) return 'No room left inside the walls';
    if (!this.canAfford(next.cost)) return 'Not enough resources';
    return null;
  },
  build(id) {
    if (this.buildBlocker(id)) return;
    const next = FACILITIES[id].levels[this.facilityLevel(id)];
    this.pay(next.cost);
    this.state.building = { id, level: this.facilityLevel(id) + 1, daysLeft: next.days };
    this.log(`Work begins on ${FACILITIES[id].name}${this.facilityLevel(id) ? ` (level ${this.facilityLevel(id) + 1})` : ''}.`);
    if (next.days === 0) this.finishBuilding();
    this.save();
    this.emit('change');
  },
  finishBuilding() {
    const b = this.state.building;
    this.state.facilities[b.id] = b.level;
    this.state.building = null;
    this.log(`${FACILITIES[b.id].name} ${b.level > 1 ? `upgraded to level ${b.level}` : 'is finished'}.`, 'good');
  },
  beds() {
    return this.facility('bunks').beds || 0;
  },

  // --- Workshop ---
  craftBlocker(id) {
    const c = CRAFTS[id];
    if (this.facilityLevel('workshop') < c.level) return `Needs a level ${c.level} workshop`;
    if (!this.canAfford(c.cost)) return 'Not enough resources';
    return null;
  },
  craft(id) {
    if (this.craftBlocker(id)) return;
    const c = CRAFTS[id];
    this.pay(c.cost);
    if (c.gives) this.gain(c.gives);
    if (c.gear) this.state.gear[c.gear] = (this.state.gear[c.gear] || 0) + 1;
    if (c.weapon) this.state.armory[c.weapon] = (this.state.armory[c.weapon] || 0) + 1;
    this.save();
    this.emit('change');
  },

  // --- The infirmary ---
  cureBlocker(id) {
    const sv = this.survivor(id);
    if (!sv || !sv.infected) return 'Not infected';
    if (!this.facilityLevel('infirmary')) return 'Needs an infirmary';
    if (this.state.resources.medicine < CURE_COST) return `Needs ${CURE_COST} medicine`;
    return null;
  },
  cure(id) {
    if (this.cureBlocker(id)) return;
    const sv = this.survivor(id);
    this.state.resources.medicine -= CURE_COST;
    sv.infected = 0;
    this.log(`${sv.name} is cured of the Blood Plague.`, 'good');
    this.save();
    this.emit('change');
  },

  // --- The region ---
  site(id) {
    return id === 'base' ? BASE_SITE : SITES[id];
  },
  fuelCost(siteId) {
    return Math.ceil(dist(SITES[siteId], BASE_SITE) / FUEL_PER_DISTANCE);
  },
  revealAround(siteId, radius) {
    const found = [];
    for (const [id, site] of Object.entries(SITES)) {
      if (!this.state.sites[id].known && dist(site, SITES[siteId] || BASE_SITE) <= radius) {
        this.state.sites[id].known = true;
        found.push(site.name);
      }
    }
    if (found.length) this.log(`You spot ${found.join(', ')}.`);
  },
  hearts() {
    return Object.keys(this.state.sites).filter(id => this.state.sites[id].infested);
  },
  // What kinds of mission a site offers right now.
  missionKinds(siteId) {
    const s = this.state.sites[siteId];
    const kinds = [];
    if (siteId === HIVE_SITE && this.state.hiveKnown) kinds.push('hive');
    if (s.infested) kinds.push('clear');
    if (this.state.contacts.some(c => c.site === siteId)) kinds.push('rescue');
    if (s.stock > 0 && !s.infested) kinds.push('scavenge');
    return kinds;
  },
  missionBlocker(siteId, kind, squad) {
    if (this.state.missionToday) return 'Your people have already been out today';
    if (this.hordeHere()) return 'The horde is at the gates';
    if (!squad.length) return 'Choose who goes';
    if (squad.length > SQUAD_SIZE) return `At most ${SQUAD_SIZE} can go`;
    if (this.state.resources.fuel < this.fuelCost(siteId)) return 'Not enough fuel';
    if (!this.missionKinds(siteId).includes(kind)) return 'Nothing to do there';
    return null;
  },
  startMission(siteId, kind, squadIds, gear) {
    const squad = squadIds.map(id => this.survivor(id)).filter(sv => sv && sv.status === 'ready' && !sv.injured);
    if (this.missionBlocker(siteId, kind, squad)) return;
    this.state.resources.fuel -= this.fuelCost(siteId);
    const taken = {};
    for (const [g, n] of Object.entries(gear || {})) {
      const k = Math.min(n, this.state.gear[g] || 0);
      if (k > 0) {
        taken[g] = k;
        this.state.gear[g] -= k;
      }
    }
    this.state.missionToday = true;
    this.state.battle = Tactics.create({ kind, siteId, squad, gear: taken });
    this.log(`${squad.map(sv => sv.name.split(' ')[0]).join(', ')} head out to ${SITES[siteId].name}.`);
    this.save();
    this.emit('battle');
  },

  // --- The horde ---
  hordeHere() {
    return this.state.threat >= HORDE_AT;
  },
  // Days until the horde comes at the current rate (for the watchtower).
  hordeEta() {
    const rate = this.threatPerDay();
    return rate > 0 ? Math.max(0, Math.ceil((HORDE_AT - this.state.threat) / rate)) : null;
  },
  threatPerDay() {
    return Math.max(1, THREAT_BASE + THREAT_PER_HEART * this.hearts().length - (this.facility('walls').threat || 0));
  },
  startDefense(defenderIds) {
    const squad = defenderIds.map(id => this.survivor(id)).filter(sv => sv && sv.status === 'ready');
    if (!this.hordeHere() || !squad.length) return;
    this.state.battle = Tactics.create({ kind: 'defend', siteId: 'base', squad, gear: Object.assign({}, this.state.gear) });
    this.state.gear = {};
    this.log('The horde is at the walls.', 'bad');
    this.save();
    this.emit('battle');
  },

  // --- After a mission: count the living and the dead, and bring home what was found ---
  finishMission() {
    const b = this.state.battle;
    if (!b || !b.result) return null;
    const report = { kind: b.kind, site: b.siteId, won: b.result === 'won', lines: [] };
    let deaths = 0;
    for (const u of b.units.filter(u => u.side === 'p')) {
      if (u.npc) {
        if (u.extracted || (b.kind === 'defend' && u.hp > 0)) {
          const sv = this.addSurvivor(Object.assign(this.makeSurvivor(u.spec, null, 'knife'), { name: u.name }));
          sv.hp = Math.max(1, Math.min(sv.hp, u.hp));
          report.lines.push(`${sv.name} joins you.`);
          this.state.contacts = this.state.contacts.filter(c => c.site !== b.siteId);
        }
        continue;
      }
      const sv = this.survivor(u.svId);
      sv.missions++;
      // In a siege, those knocked down are carried into the crypt; only the torn apart are lost.
      const safe = b.kind === 'defend' ? u.hp > 0 || u.downed > 0 : u.extracted;
      if (!safe) {
        sv.status = 'dead';
        deaths++;
        report.lines.push(`💀 ${sv.name} did not come back.`);
        continue;
      }
      sv.hp = Math.max(1, u.hp);
      sv.kills += u.kills || 0;
      const before = sv.level;
      if (this.addXp(sv, (u.xp || 0) + 2)) report.lines.push(`⭐ ${sv.name} reaches level ${sv.level}${this.pendingChoice(sv) !== null ? ' and can learn something new' : ''}.`);
      if (sv.level === before && this.pendingChoice(sv) !== null) report.lines.push(`⭐ ${sv.name} still has a skill to choose.`);
      if (u.infected && !sv.infected) {
        sv.infected = INFECTION_DAYS;
        report.lines.push(`🦠 ${sv.name} has the Blood Plague. Cure it at the infirmary within ${INFECTION_DAYS} days.`);
      }
      if (sv.hp < this.maxHp(sv) / 2) {
        sv.injured = INJURY_DAYS;
        report.lines.push(`🩸 ${sv.name} is badly hurt and needs ${INJURY_DAYS} days to recover.`);
      }
    }
    // Ammo left in the pool comes home (looted ammo is added on top below).
    this.state.resources.ammo = b.ammo;
    // Unused gear comes home.
    const anyHome = b.units.some(u => u.side === 'p' && !u.npc && u.extracted);
    if (anyHome || b.kind === 'defend') {
      for (const [g, n] of Object.entries(b.gear)) this.state.gear[g] = (this.state.gear[g] || 0) + n;
      this.gain(b.bag.resources);
      for (const w of b.bag.weapons) this.state.armory[w] = (this.state.armory[w] || 0) + 1;
      const got = [...Object.entries(b.bag.resources).filter(([, n]) => n > 0).map(([r, n]) => `${RESOURCES[r].icon} ${n}`), ...b.bag.weapons.map(w => `${WEAPONS[w].icon} ${WEAPONS[w].name}`)];
      if (got.length) report.lines.push(`Brought home: ${got.join(', ')}.`);
    } else {
      report.lines.push('Everything they carried is lost with them.');
    }
    this.state.stats.kills += b.kills;
    this.state.stats.missions++;
    this.state.stats.deaths += deaths;
    this.state.morale = Math.max(0, Math.min(100, this.state.morale - deaths * 15 + (report.won ? 5 : -5)));
    // Noise travels: a loud mission brings the horde closer.
    if (b.kind !== 'defend') this.state.threat += Math.round(b.noiseMade / NOISE_TO_THREAT);
    if (b.siteId !== 'base') {
      const site = this.state.sites[b.siteId];
      site.visited = true;
      if (b.kind === 'scavenge' && b.lootTaken) site.stock = Math.max(0, site.stock - 1);
      if (b.heartKilled && (b.kind === 'clear' || b.kind === 'hive')) {
        site.infested = false;
        report.lines.push('🔥 The plague heart is destroyed. The dead here scatter.');
        this.state.threat = Math.max(0, this.state.threat - 15);
        if (b.kind === 'hive') {
          this.state.won = true;
          report.lines.push('🏆 The Hive is burning. Marrow Creek can breathe again.');
        }
      }
      this.revealAround(b.siteId, 180 + (this.facility('watchtower').reveal || 0) / 2);
      if (!this.state.hiveKnown && b.siteId === HIVE_SITE) {
        this.state.hiveKnown = true;
        this.state.sites[HIVE_SITE].infested = true;
        report.lines.push('Deep inside St. Agnes, you find where it all comes from: the Hive.');
      }
    }
    if (b.kind === 'defend') {
      if (report.won) {
        report.lines.push('The horde breaks against your walls and drifts away.');
        this.state.threat = 15;
      } else {
        this.state.threat = 30;
        for (const r of Object.keys(this.state.resources)) this.state.resources[r] = Math.floor(this.state.resources[r] / 2);
        this.state.morale = Math.max(0, this.state.morale - 20);
        report.lines.push('The dead pour through the church. You lose half of everything before you drive them out.');
      }
    }
    this.log(`${b.kind === 'defend' ? 'The siege' : `The mission to ${SITES[b.siteId].name}`} ${report.won ? 'succeeded' : 'failed'}.`, report.won ? 'good' : 'bad');
    this.state.battle = null;
    this.checkLost();
    this.save();
    this.emit('change');
    return report;
  },

  // --- The end of a day ---
  endDay() {
    const s = this.state;
    if (s.battle || this.hordeHere() || s.won || s.lost) return null;
    const lines = [];
    const people = this.alive();
    // Food.
    const eat = people.length * DAILY_FOOD;
    if (s.resources.food >= eat) {
      s.resources.food -= eat;
    } else {
      s.resources.food = 0;
      s.morale -= 10;
      lines.push('🥫 There was not enough food. Everyone goes to bed hungry.');
    }
    // Production.
    const grown = this.facility('garden').food || 0;
    if (grown) {
      s.resources.food += grown;
      lines.push(`🌱 The garden gives ${grown} food.`);
    }
    // Building, sped up by engineers at home.
    if (s.building) {
      const builders = this.ready().filter(sv => SPECIALTIES[sv.spec].builder).length;
      s.building.daysLeft -= 1 + builders;
      if (s.building.daysLeft <= 0) {
        lines.push(`🛠️ ${FACILITIES[s.building.id].name} ${s.building.level > 1 ? `is now level ${s.building.level}` : 'is finished'}.`);
        this.finishBuilding();
      }
    }
    // Wounds, and the Blood Plague.
    const medics = this.ready().some(sv => SPECIALTIES[sv.spec].healBonus) ? 1 : 0;
    for (const sv of people) {
      if (sv.injured) {
        sv.injured = Math.max(0, sv.injured - 1 - (this.facility('infirmary').heal || 0) - medics);
        if (!sv.injured) lines.push(`🩹 ${sv.name} is back on their feet.`);
      }
      sv.hp = Math.min(this.maxHp(sv), sv.hp + 2 + (this.facility('infirmary').heal || 0) * 2);
      if (sv.infected) {
        sv.infected--;
        if (!sv.infected) {
          sv.status = 'dead';
          s.stats.deaths++;
          s.morale -= 15;
          lines.push(`🦠 The Blood Plague takes ${sv.name}. You do what has to be done.`);
        }
      }
    }
    // Morale.
    if (people.length > this.beds()) {
      s.morale -= 3;
      lines.push('🛏️ There are not enough beds. Tempers fray.');
    } else if (s.resources.food >= people.length * 3) {
      s.morale += 2;
    }
    s.morale = Math.max(0, Math.min(100, s.morale));
    if (s.morale < 20 && this.alive().length > 1) {
      const leaver = pick(this.alive().filter(sv => sv.status === 'ready'));
      if (leaver) {
        leaver.status = 'gone';
        lines.push(`🚪 ${leaver.name} packs a bag in the night and leaves. Morale is too low.`);
      }
    }
    // The radio.
    const contact = this.facility('radio').contact || 0;
    if (contact && Math.random() < contact && s.contacts.length < 2) {
      const options = Object.keys(SITES).filter(id => s.sites[id].known && !s.contacts.some(c => c.site === id));
      if (options.length) {
        const site = pick(options);
        s.contacts.push({ site, days: 4 });
        lines.push(`📻 A voice on the radio: someone is trapped at ${SITES[site].name}. They will not last long.`);
      }
    }
    for (const c of s.contacts) c.days--;
    for (const c of s.contacts.filter(c => c.days <= 0)) lines.push(`📻 The radio at ${SITES[c.site].name} has gone quiet.`);
    s.contacts = s.contacts.filter(c => c.days > 0);
    // The plague spreads.
    if (this.hearts().length < MAX_HEARTS && Math.random() < HEART_CHANCE) {
      const options = Object.keys(SITES).filter(id => !s.sites[id].infested && id !== HIVE_SITE);
      const site = pick(options);
      s.sites[site].infested = true;
      if (s.sites[site].known) lines.push(`🫀 The dead are gathering at ${SITES[site].name}. Something has taken root there.`);
    }
    s.threat += this.threatPerDay();
    s.day++;
    s.missionToday = false;
    if (this.hordeHere()) lines.push('📯 The bell rings. A horde is coming up Grace Hill.');
    else if (this.facilityLevel('watchtower') && this.hordeEta() <= 3) lines.push(`🗼 The lookout sees them massing. The horde will come in about ${this.hordeEta()} days.`);
    for (const l of lines) this.log(l);
    this.checkLost();
    this.save();
    this.emit('change');
    return lines;
  },
  checkLost() {
    if (!this.alive().length && !this.state.lost) {
      this.state.lost = true;
      this.log('There is no one left on Grace Hill.', 'bad');
    }
  },

  // --- Saving ---
  save() {
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
    if (raw) {
      try {
        this.state = JSON.parse(raw);
        for (const sv of this.state.survivors) sv.perks = sv.perks || [];
        return true;
      } catch (e) {
        console.warn('Broken save, starting over', e);
      }
    }
    this.newGame();
    return false;
  },
  reset() {
    this.newGame();
    this.emit('reset');
  },
};
