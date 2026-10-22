// The living world: time and tide, fog of war, road events, character creation, companions,
// the cult, expeditions, world changes after endings, the bestiary and achievements.
// Extends the Game object from game.js.

const ACHIEVEMENT_CHECK_MS = 3000;
// Everyone travels this much faster than the base road times in data.js.
const BASE_TRAVEL_SPEED = 1.5;
const EXPEDITION_ROOM_PAUSE_MS = 2000;

Object.assign(Game, {
  // --- Time and tide ---
  dayIndex() {
    return Math.floor(this.state.clock / DAY_MS);
  },
  isNight() {
    return (this.state.clock % DAY_MS) / DAY_MS >= NIGHT_START;
  },
  isLowTide() {
    return (this.state.clock % TIDE_MS) / TIDE_MS < LOW_TIDE_SHARE;
  },
  starsRight() {
    return this.isNight() && this.dayIndex() % STARS_RIGHT_EVERY === STARS_RIGHT_EVERY - 1;
  },
  timeLabel() {
    const parts = [this.isNight() ? '🌙 Night' : '☀️ Day', this.isLowTide() ? '🌊 Low tide' : '🌊 High tide'];
    if (this.starsRight()) parts.push('🌌 The stars are right');
    return `Day ${this.dayIndex() + 1} · ${parts.join(' · ')}`;
  },
  veilThreshold() {
    return VEIL_THRESHOLD + (this.state.race === 'tiefling' ? 10 : 0) + (this.isNight() ? NIGHT_VEIL_BONUS : 0) + this.perk('veil');
  },
  whenBlocker(action) {
    if (action.when === 'night' && !this.isNight()) return 'Only at night';
    if (action.when === 'low_tide' && !this.isLowTide()) return 'Only at low tide';
    return null;
  },

  // --- Character creation ---
  createCharacter(race, background) {
    const s = this.state;
    if (s.created || !RACES[race] || !BACKGROUNDS[background]) return;
    const bg = BACKGROUNDS[background];
    s.race = race;
    s.background = background;
    for (const [skill, lvl] of Object.entries(bg.skills || {})) s.skills[skill].xp = Math.max(s.skills[skill].xp, XP_TABLE[lvl]);
    for (const [item, qty] of Object.entries(bg.items || {})) this.addItem(item, qty);
    s.gold += bg.gold || 0;
    s.hp = this.maxHp();
    s.created = true;
    this.log(`You are a ${RACES[race].name.toLowerCase()} ${bg.name.toLowerCase()}, newly arrived in Saltmire.`, 'story');
    this.emit('action');
  },
  xpMultiplier() {
    return this.state.race === 'human' ? 1.1 : 1;
  },
  raceSpeed(skill) {
    const r = this.state.race;
    return (r === 'dwarf' && skill === 'mining') || (r === 'elf' && skill === 'foraging') ? 0.85 : 1;
  },

  // --- Fog of war ---
  // Known places show on the map; unexplored places next to where you have been show as "???".
  isFrontier(loc) {
    if (this.state.known[loc]) return false;
    return roadsFrom(loc).some(({ road, to }) => this.state.visited[to] && (!road.veil || this.veilSight()));
  },
  canReach(loc) {
    return !!this.state.known[loc] || this.isFrontier(loc);
  },
  reveal(locs) {
    for (const loc of locs) {
      if (this.state.known[loc]) continue;
      this.state.known[loc] = true;
      this.log(`You learn of ${LOCATIONS[loc].name}.`, 'good');
    }
    this.emit('action');
  },
  revealRandom() {
    const unknown = Object.keys(LOCATIONS).filter(l => !LOCATIONS[l].hidden && !this.state.known[l]);
    if (unknown.length) this.reveal([unknown[randInt(0, unknown.length - 1)]]);
  },

  // --- Roads ---
  roadCost(road) {
    if (!road.cost || this.state.background === 'smuggler') return 0;
    if (road.tideFree && this.isLowTide()) return 0;
    return road.cost;
  },
  travelSpeed() {
    return BASE_TRAVEL_SPEED * (this.state.madness >= 2 && this.veilSight() ? 1 / 0.7 : 1);
  },
  // Seconds a road takes at your current speed, for display.
  roadSeconds(road) {
    return Math.round(road.time / this.travelSpeed());
  },

  // --- Road events ---
  rollEvent(from, to) {
    const options = Object.keys(ROAD_EVENTS).filter(id => {
      const ev = ROAD_EVENTS[id];
      return this.check(ev.if) && (!ev.region || ev.region.includes(from) || ev.region.includes(to));
    });
    return options.length ? options[randInt(0, options.length - 1)] : null;
  },
  checkBonus(skill) {
    return Math.floor(this.level(skill) / 4);
  },
  choiceBlocker(choice) {
    const need = choice.need || {};
    if (need.gold && this.state.gold < need.gold) return `Needs ${need.gold} gold`;
    if (need.items && !this.hasAll(need.items)) return 'You lack what is needed';
    return null;
  },
  // Resolves the open road event. Returns the lines to show the player.
  resolveEvent(index) {
    const t = this.state.travel;
    if (!t || !t.event) return null;
    const ev = ROAD_EVENTS[t.event];
    const choice = ev.choices[index];
    if (!choice || this.choiceBlocker(choice)) return null;
    const lines = [];
    let outcome = choice.outcome;
    if (choice.check) {
      const roll = d20();
      const bonus = this.checkBonus(choice.check.skill);
      const ok = roll + bonus >= choice.check.dc;
      lines.push(`${SKILLS[choice.check.skill].name} check: ${roll}${withSign(bonus)} = ${roll + bonus} vs DC ${choice.check.dc}: ${ok ? 'success' : 'failure'}.`);
      if (!ok) outcome = choice.fail;
    }
    t.event = null;
    lines.push(outcome.text);
    this.log(`${ev.title}: ${outcome.text}`, 'story');
    const lose = outcome.lose || {};
    if (lose.gold) this.state.gold = Math.max(0, this.state.gold - lose.gold);
    for (const [item, qty] of Object.entries(lose.items || {})) this.removeItem(item, Math.min(qty, this.count(item)));
    if (lose.hp) this.state.hp = Math.max(1, this.state.hp - lose.hp);
    if (outcome.fight) {
      const result = this.quickFight(outcome.fight);
      lines.push(result);
      if (!this.state.travel) return lines;
    }
    this.grant(outcome.gain);
    if (lose.sanity) {
      this.state.sanity -= lose.sanity;
      if (this.state.sanity <= 0) this.mindBreaks();
    }
    this.emit('action');
    return lines;
  },
  // A short fight on the road, resolved at once with the normal combat rules.
  quickFight(monsterId) {
    const m = MONSTERS[monsterId];
    const hpBefore = this.state.hp;
    const travel = this.state.travel;
    this.state.combat = { monster: monsterId, monsterHp: m.hp, playerTimer: 0, monsterTimer: 0, compTimer: 0, respawn: 0, log: [] };
    for (let i = 0; i < 5000 && this.state.combat && this.state.combat.respawn === 0; i++) this.tickCombat(100);
    if (!this.state.combat) {
      return this.state.travel === travel ? 'Your mind gives way mid-fight, and the thing escapes.' : 'You are beaten, and wake far from the road.';
    }
    this.state.combat = null;
    return `You defeat the ${m.name}, losing ${Math.max(0, hpBefore - this.state.hp)} hitpoints.`;
  },

  // --- Companions ---
  companion() {
    return this.state.companion ? COMPANIONS[this.state.companion.id] : null;
  },
  companionActive() {
    return !!this.state.companion && !this.state.companion.downed;
  },
  hireCompanion(id) {
    const def = COMPANIONS[id];
    if (this.state.companion) this.log(`${this.companion().name} parts ways with you.`);
    this.state.companion = { id, hp: def.hp, sanity: 50, downed: false, rage: 0, timer: 0 };
    this.emit('action');
  },
  dismissCompanion() {
    if (!this.state.companion) return;
    this.log(`${this.companion().name} returns to ${LOCATIONS[this.companion().home].name}.`);
    this.state.companion = null;
    this.emit('action');
  },
  companionDamageText() {
    const def = this.companion();
    const rage = this.state.companion.rage * 2;
    return def.dmg + (rage ? withSign(rage) : '');
  },
  companionAttack(c, m) {
    const def = this.companion();
    const comp = this.state.companion;
    const roll = d20();
    if (roll === 1 || (roll !== 20 && roll + def.hit < m.ac)) {
      this.combatLog(c, `${def.name} misses.`);
    } else {
      const dmg = Math.max(1, rollDice(def.dmg, roll === 20) + comp.rage * 2);
      c.monsterHp -= dmg;
      this.combatLog(c, `${def.name} hits the ${m.name} for ${dmg}.`);
    }
    if (def.heals && this.state.hp < this.maxHp()) {
      this.heal(def.heals);
      this.combatLog(c, `${def.name} tends your wounds (+${def.heals}).`);
    }
  },
  monsterAttacksCompanion(c, m) {
    const def = this.companion();
    const comp = this.state.companion;
    const roll = d20();
    if (roll === 1 || (roll !== 20 && roll + this.monsterHit(m) < def.ac)) {
      this.combatLog(c, `The ${m.name} lunges at ${def.name} and misses.`);
      return;
    }
    const dmg = Math.max(1, rollDice(m.dmg, roll === 20));
    comp.hp -= dmg;
    this.combatLog(c, `The ${m.name} hits ${def.name} for ${dmg}.`);
    if (comp.hp <= 0) {
      comp.hp = 0;
      comp.downed = true;
      this.log(`${def.name} is down! They will recover at an inn.`, 'bad');
      return;
    }
    if (m.eldritch && d20() + def.wits < this.eldritchDc(m)) {
      comp.sanity -= m.eldritch.loss;
      if (comp.sanity <= 0) this.companionBreaks();
    }
  },
  companionBreaks() {
    const def = this.companion();
    const comp = this.state.companion;
    if (def.mad) {
      comp.rage++;
      comp.sanity = 50;
      this.log(`${def.name} shrieks with laughter. She hits harder now (+${comp.rage * 2} damage).`, 'veil');
    } else {
      this.log(`${def.name}'s mind breaks. They flee back to ${LOCATIONS[def.home].name}, and will not travel with you again until you hire them anew.`, 'bad');
      this.state.companion = null;
    }
  },
  checkCompanionLoyalty() {
    const def = this.companion();
    if (def && def.maxMadness !== undefined && this.state.madness > def.maxMadness) {
      this.log(`${def.name} looks into your eyes and backs away. "I cannot follow where you are going." He returns to ${LOCATIONS[def.home].name}.`, 'bad');
      this.state.companion = null;
    }
  },
  tickCompanion(dt) {
    const comp = this.state.companion;
    if (!comp) return;
    const def = this.companion();
    if (comp.downed) {
      if (this.here().inn && !this.state.travel) {
        comp.downed = false;
        comp.hp = def.hp;
        this.log(`${def.name} is back on their feet.`, 'good');
      }
      return;
    }
    comp.timer = (comp.timer || 0) + dt;
    while (comp.timer >= HP_REGEN_MS) {
      comp.timer -= HP_REGEN_MS;
      comp.hp = Math.min(def.hp, comp.hp + Math.ceil(def.hp * 0.04));
      comp.sanity = Math.min(50, comp.sanity + 1);
    }
  },

  // --- Combat modifiers from madness, race and the sky ---
  eldritchDc(m) {
    return m.eldritch.dc + (this.isNight() ? 1 : 0) - (this.state.madness >= 4 ? 3 : 0);
  },
  monsterHit(m) {
    return m.hit - (m.eldritch && this.state.madness >= 5 ? 2 : 0);
  },

  // --- Your cult ---
  foundCult() {
    if (this.state.cult) return;
    this.state.cult = { followers: 1, tasks: { tithe: 1 }, stash: {}, gold: 0, timers: {} };
    this.log('Your first follower kneels before you in a Saltmire cellar. The cult has begun.', 'veil');
  },
  cultCapacity() {
    return 3 + Math.floor(this.level('occultism') / 5);
  },
  recruitCost() {
    return CULT_RECRUIT_GOLD * this.state.cult.followers;
  },
  recruit() {
    const cult = this.state.cult;
    if (!cult || this.state.location !== CULT_SHRINE || cult.followers >= this.cultCapacity()) return;
    if (this.state.gold < this.recruitCost()) return this.log('You cannot afford the gifts a new follower expects.', 'warn');
    this.state.gold -= this.recruitCost();
    cult.followers++;
    cult.tasks.tithe = (cult.tasks.tithe || 0) + 1;
    this.log('Another lost soul joins your flock.', 'veil');
    this.state.sanity -= CULT_RECRUIT_SANITY;
    if (this.state.sanity <= 0) this.mindBreaks();
    this.questEvent('followers');
    this.emit('action');
  },
  assignFollower(from, to) {
    const tasks = this.state.cult && this.state.cult.tasks;
    if (!tasks || !(tasks[from] > 0) || !CULT_TASKS[to]) return;
    tasks[from]--;
    tasks[to] = (tasks[to] || 0) + 1;
    this.emit('action');
  },
  tickCult(dt) {
    const cult = this.state.cult;
    if (!cult) return;
    for (const [task, n] of Object.entries(cult.tasks)) {
      if (!n) continue;
      const def = CULT_TASKS[task];
      cult.timers[task] = (cult.timers[task] || 0) + dt * n;
      while (cult.timers[task] >= def.every) {
        cult.timers[task] -= def.every;
        cult.gold += def.gold || 0;
        for (const [item, qty] of Object.entries(def.items || {})) cult.stash[item] = (cult.stash[item] || 0) + qty;
      }
    }
  },
  collectCult() {
    const cult = this.state.cult;
    if (!cult || this.state.location !== CULT_SHRINE) return;
    this.state.gold += cult.gold;
    const parts = cult.gold ? [`${cult.gold} gold`] : [];
    cult.gold = 0;
    for (const [item, qty] of Object.entries(cult.stash)) {
      if (!this.addItem(item, qty)) this.state.bank[item] = this.bankCount(item) + qty;
      parts.push(`${qty} × ${ITEMS[item].name}`);
    }
    cult.stash = {};
    this.log(parts.length ? `Your followers bring you their offerings: ${parts.join(', ')}.` : 'Your followers have nothing for you yet.', 'veil');
    this.emit('action');
  },

  // --- Expeditions ---
  expeditionBlocker(id) {
    const ex = EXPEDITIONS[id];
    if (this.state.travel) return 'You are travelling';
    if (this.state.location !== ex.location) return `Begins at ${LOCATIONS[ex.location].name}`;
    for (const flag of (ex.requires || {}).flags || []) if (!this.state.flags[flag]) return 'The way is sealed';
    return null;
  },
  startExpedition(id) {
    if (this.expeditionBlocker(id)) return;
    const ex = EXPEDITIONS[id];
    this.stop(true);
    this.state.combat = { monster: ex.rooms[0], monsterHp: MONSTERS[ex.rooms[0]].hp, playerTimer: 0, monsterTimer: 0, compTimer: 0, respawn: 0, log: [], expedition: { id, room: 0 } };
    this.log(`You begin the expedition: ${ex.name}. There is no rest until you are out.`, 'story');
    this.emit('action');
  },
  advanceExpedition(c) {
    const ex = EXPEDITIONS[c.expedition.id];
    c.expedition.room++;
    if (c.expedition.room >= ex.rooms.length) return this.completeExpedition(c.expedition.id);
    c.monster = ex.rooms[c.expedition.room];
    c.respawn = EXPEDITION_ROOM_PAUSE_MS;
    this.combatLog(c, `You press deeper. Chamber ${c.expedition.room + 1} of ${ex.rooms.length}.`);
  },
  completeExpedition(id) {
    const ex = EXPEDITIONS[id];
    this.state.combat = null;
    this.state.expeditionsDone[id] = (this.state.expeditionsDone[id] || 0) + 1;
    const gold = randInt(ex.loot.gold[0], ex.loot.gold[1]);
    const items = {};
    for (const d of ex.loot.items) if (Math.random() < d.chance) items[d.item] = randInt(d.qty[0], d.qty[1]);
    this.log(`Expedition complete: ${ex.name}! You find a hoard at the bottom.`, 'rare');
    this.grant({ gold, items });
    this.questEvent('expedition', id);
    this.emit('expedition', { id, gold, items });
    this.emit('action');
  },

  // --- How endings reshape the world ---
  applyWorld() {
    for (const [loc, base] of Object.entries(BASE_LOCATIONS_SNAPSHOT)) {
      const cur = LOCATIONS[loc];
      cur.desc = base.desc;
      cur.monsters = base.monsters ? base.monsters.slice() : undefined;
      cur.shop = base.shop;
      cur.kin = false;
    }
    for (const ending of ['order', 'dreamer', 'prophet']) {
      if (!this.state.endings[ending]) continue;
      for (const [loc, change] of Object.entries(WORLD_CHANGES[ending])) Object.assign(LOCATIONS[loc], JSON.parse(JSON.stringify(change)));
    }
  },

  // --- Bestiary and achievements ---
  totalKills() {
    return Object.values(this.state.kills).reduce((a, b) => a + b, 0);
  },
  recordBestiary(id) {
    if (!BESTIARY[id] || this.state.bestiary[id] !== undefined) return;
    this.state.bestiary[id] = this.state.madness;
    this.log(`New bestiary entry: ${MONSTERS[id].name}.`, 'good');
  },
  checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (this.state.achievements[a.id] || !a.test(this)) continue;
      this.state.achievements[a.id] = Date.now();
      this.log(`Achievement unlocked: ${a.icon} ${a.name}.`, 'rare');
      this.emit('achievement', a);
    }
  },
});
