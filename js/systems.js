// The living world: time and tide, fog of war, road events, character creation, companions,
// the cult, expeditions, world changes after endings, the bestiary and achievements.
// Extends the Game object from game.js.

const ACHIEVEMENT_CHECK_MS = 3000;
// Everyone travels this much faster than the base road times in data.js.
const BASE_TRAVEL_SPEED = 2;
// Fellowship: each level adds this share to a companion's hitpoints; Rally brings a downed companion back after this long.
const FELLOWSHIP_HP_PER_LEVEL = 0.03;
const RALLY_MS = 30000;
// One extra companion slot for every this many Fellowship levels.
const FELLOWSHIP_LEVELS_PER_COMPANION = 5;
// Each companion beyond the first draws this much more of the enemy's attention, up to the cap.
const EXTRA_COMPANION_TARGET_CHANCE = 0.15;
const MAX_COMPANION_TARGET_CHANCE = 0.75;
// Fellowship xp: a share of each enemy's xp when your companion fights beside you, and per second travelled together.
const FELLOWSHIP_KILL_SHARE = 0.6;
const FELLOWSHIP_XP_PER_ROAD_SECOND = 2;
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
    return VEIL_THRESHOLD + (this.state.race === 'tiefling' ? 10 : 0) + (this.isNight() ? NIGHT_VEIL_BONUS : 0) + this.perk('veil')
      + LORE_VEIL_PER_TEN * Math.floor(this.level('lore') / 10);
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
    if (!road.cost || this.state.background === 'smuggler' || this.carries('rowboat')) return 0;
    if (road.sea && this.level('sailing') >= SAILING_FREE_PASSAGE) return 0;
    if (road.tideFree && this.isLowTide()) return 0;
    return road.cost;
  },
  // On a sea road, Sailing makes you faster too.
  travelSpeed(road) {
    const charted = 1 + CARTOGRAPHY_TRAVEL_PER_LEVEL * (this.level('cartography') - 1);
    const sailed = road && road.sea ? 1 + SAILING_SPEED_PER_LEVEL * (this.level('sailing') - 1) : 1;
    return BASE_TRAVEL_SPEED * charted * sailed * (1 + this.perk('travel')) * (this.state.madness >= 2 && this.veilSight() ? 1 / 0.7 : 1);
  },
  // Seconds a road takes at your current speed, for display.
  roadSeconds(road) {
    return Math.round(road.time / this.travelSpeed(road));
  },
  // Seconds left on the journey, each remaining road at its own speed.
  journeySeconds() {
    const t = this.state.travel;
    if (!t) return 0;
    let ms = 0;
    for (let i = t.leg; i < t.path.length - 1; i++) {
      const road = findRoad(t.path[i], t.path[i + 1]);
      ms += (road.time * 1000 - (i === t.leg ? t.progress : 0)) / this.travelSpeed(road);
    }
    return Math.ceil(ms / 1000);
  },
  // Seconds a planned route would take.
  routeSeconds(path) {
    let secs = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const road = findRoad(path[i], path[i + 1]);
      secs += road.time / this.travelSpeed(road);
    }
    return Math.round(secs);
  },

  // --- Road events ---
  rollEvent(from, to) {
    const options = Object.keys(ROAD_EVENTS).filter(id => {
      const ev = ROAD_EVENTS[id];
      return this.check(ev.if) && (!ev.region || ev.region.includes(from) || ev.region.includes(to));
    });
    return options.length ? options[randInt(0, options.length - 1)] : null;
  },
  // Road-event checks: a quarter of the skill, plus what a seasoned map-maker knows about roads.
  checkBonus(skill) {
    return Math.floor(this.level(skill) / 4) + Math.floor(this.level('cartography') / 10) + this.perk('scout');
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
  // You can lead one companion, plus one more for every few Fellowship levels.
  companionCapacity() {
    return 1 + Math.floor(this.level('fellowship') / FELLOWSHIP_LEVELS_PER_COMPANION);
  },
  companions() {
    return this.state.companions;
  },
  activeCompanions() {
    return this.state.companions.filter(c => !c.downed);
  },
  companionActive() {
    return this.activeCompanions().length > 0;
  },
  hasCompanion(id) {
    return this.state.companions.some(c => c.id === id);
  },
  companionRoom() {
    // Thralls do not take a companion's place.
    return this.state.companions.filter(c => !COMPANIONS[c.id].thrall).length < this.companionCapacity();
  },
  // A companion's numbers: their own, improved by your Fellowship level and perks.
  companionStats(comp) {
    const def = COMPANIONS[comp.id];
    const lvl = this.level('fellowship');
    return {
      hp: Math.round(def.hp * (1 + FELLOWSHIP_HP_PER_LEVEL * (lvl - 1))) + this.perk('compHp'),
      ac: def.ac + this.perk('compAc'),
      hit: def.hit + Math.floor(lvl / 10) + this.perk('compHit'),
      dmgBonus: Math.floor(lvl / 8) + this.perk('compDmg') + comp.rage * 2,
      wits: def.wits + this.perk('compWits'),
      heals: (def.heals || 0) + this.perk('compHeal'),
      sanity: 50 + lvl,
    };
  },
  // Bonuses some companions give you just by being at your side (e.g. Peaslee's +2 to sanity saves).
  companionAura(key) {
    return this.activeCompanions().reduce((sum, c) => sum + ((COMPANIONS[c.id].aura || {})[key] || 0), 0);
  },
  hireCompanion(id) {
    if (this.hasCompanion(id)) return;
    if (!this.companionRoom()) return this.log(`You can lead only ${this.companionCapacity()} companion${this.companionCapacity() > 1 ? 's' : ''}. Raise your Fellowship to lead more.`, 'warn');
    const comp = { id, hp: 0, sanity: 0, downed: false, rage: 0, timer: 0 };
    const st = this.companionStats(comp);
    Object.assign(comp, { hp: st.hp, sanity: st.sanity });
    this.state.companions.push(comp);
    this.emit('action');
  },
  dismissCompanion(id) {
    if (!this.hasCompanion(id)) return;
    this.log(`${COMPANIONS[id].name} returns to ${LOCATIONS[COMPANIONS[id].home].name}.`);
    this.state.companions = this.state.companions.filter(c => c.id !== id);
    this.emit('action');
  },
  companionDamageText(comp) {
    const d = parseDice(COMPANIONS[comp.id].dmg);
    const bonus = d.bonus + this.companionStats(comp).dmgBonus;
    return `${d.n}d${d.sides}${bonus ? withSign(bonus) : ''}`;
  },
  // More companions draw more attacks away from you, up to a limit.
  companionTargetChance() {
    const n = this.activeCompanions().length;
    if (!n) return 0;
    return Math.min(MAX_COMPANION_TARGET_CHANCE, COMPANION_TARGET_CHANCE + EXTRA_COMPANION_TARGET_CHANCE * (n - 1) + this.perk('compGuard'));
  },
  companionAttack(c, m, comp) {
    const def = COMPANIONS[comp.id];
    const st = this.companionStats(comp);
    const roll = d20();
    if (roll === 1 || (roll !== 20 && roll + st.hit < m.ac)) {
      this.combatLog(c, `${def.name} misses.`);
    } else {
      const dmg = Math.max(1, rollDice(def.dmg, roll === 20) + st.dmgBonus);
      c.monsterHp -= dmg;
      this.combatLog(c, `${def.name} hits the ${m.name} for ${dmg}.`);
    }
    if (st.heals && this.state.hp < this.maxHp()) {
      this.heal(st.heals);
      this.combatLog(c, `${def.name} tends your wounds (+${st.heals}).`);
    }
  },
  monsterAttacksCompanion(c, m) {
    const active = this.activeCompanions();
    const comp = active[randInt(0, active.length - 1)];
    const def = COMPANIONS[comp.id];
    const st = this.companionStats(comp);
    const roll = d20();
    if (roll === 1 || (roll !== 20 && roll + this.monsterHit(m) < st.ac)) {
      this.combatLog(c, `The ${m.name} lunges at ${def.name} and misses.`);
      return;
    }
    const dmg = Math.max(1, rollDice(m.dmg, roll === 20));
    comp.hp -= dmg;
    this.combatLog(c, `The ${m.name} hits ${def.name} for ${dmg}.`);
    if (comp.hp <= 0 && def.thrall) return this.crumble(comp, 'is torn apart');
    if (comp.hp <= 0) {
      comp.hp = 0;
      comp.downed = true;
      comp.downedFor = 0;
      this.log(`${def.name} is down! ${this.perk('rally') ? 'They will get back up once you have caught your breath.' : 'They will recover at an inn.'}`, 'bad');
      return;
    }
    if (m.eldritch && d20() + st.wits < this.eldritchDc(m)) {
      comp.sanity -= m.eldritch.loss;
      if (comp.sanity <= 0) this.companionBreaks(comp);
    }
  },
  companionBreaks(comp) {
    const def = COMPANIONS[comp.id];
    if (def.mad) {
      comp.rage++;
      comp.sanity = this.companionStats(comp).sanity;
      this.log(`${def.name} shrieks with laughter. ${def.name} hits harder now (+${comp.rage * 2} damage).`, 'veil');
    } else {
      this.log(`${def.name}'s mind breaks. They flee back to ${LOCATIONS[def.home].name}, and will not travel with you again until you hire them anew.`, 'bad');
      this.state.companions = this.state.companions.filter(c => c !== comp);
    }
  },
  // Companions who feed on the fallen (Old Gnaw) heal when an enemy dies.
  companionsFeed() {
    for (const comp of this.activeCompanions()) {
      const feeds = COMPANIONS[comp.id].feeds;
      if (feeds) comp.hp = Math.min(this.companionStats(comp).hp, comp.hp + feeds);
    }
  },
  checkCompanionLoyalty() {
    for (const comp of this.state.companions.slice()) {
      const def = COMPANIONS[comp.id];
      if (def.maxMadness !== undefined && this.state.madness > def.maxMadness) {
        this.log(`${def.name} looks into your eyes and backs away. "I cannot follow where you are going." They return to ${LOCATIONS[def.home].name}.`, 'bad');
        this.state.companions = this.state.companions.filter(c => c !== comp);
      }
    }
  },
  tickCompanion(dt) {
    for (const comp of this.state.companions) {
      const def = COMPANIONS[comp.id];
      const st = this.companionStats(comp);
      if (comp.downed) {
        // At an inn, or after a short rest with the Never Leave a Friend perk.
        comp.downedFor = (comp.downedFor || 0) + dt;
        const rallied = this.perk('rally') && comp.downedFor >= RALLY_MS;
        if (rallied || (this.here().inn && !this.state.travel)) {
          comp.downed = false;
          comp.hp = rallied ? Math.ceil(st.hp / 2) : st.hp;
          this.log(`${def.name} is back on their feet.`, 'good');
        }
        continue;
      }
      comp.timer = (comp.timer || 0) + dt;
      while (comp.timer >= HP_REGEN_MS) {
        comp.timer -= HP_REGEN_MS;
        comp.hp = Math.min(st.hp, comp.hp + Math.ceil(st.hp * 0.04));
        comp.sanity = Math.min(st.sanity, comp.sanity + 1);
      }
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
    return 3 + Math.floor(this.level('occultism') / 5) + FOLLOWERS_PER_IDOL * (this.state.cult.idols || 0);
  },
  raiseIdol() {
    const cult = this.state.cult;
    if (!cult || this.state.location !== CULT_SHRINE || (cult.idols || 0) >= MAX_IDOLS || !this.removeItem('shrine_idol', 1)) return;
    cult.idols = (cult.idols || 0) + 1;
    this.log(`You raise an idol in the shrine. Room for ${FOLLOWERS_PER_IDOL} more of the faithful.`, 'veil');
    this.emit('action');
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
    const tithes = this.goldFound(cult.gold);
    this.state.gold += tithes;
    const parts = tithes ? [`${tithes} gold`] : [];
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
    // A sharp-eyed thief finds the hidden vault behind the hoard: double the treasure.
    const vaultRoll = d20() + Math.floor(this.level('stealth') / 4);
    const vault = vaultRoll >= VAULT_DC;
    if (vault) {
      this.state.flags.vault = true;
      for (const item in items) items[item] *= 2;
      this.log(`Stealth ${vaultRoll} vs DC ${VAULT_DC}: you find a hidden vault behind the hoard. Double the treasure!`, 'rare');
    }
    this.grant({ gold: vault ? gold * 2 : gold, items });
    this.questEvent('expedition', id);
    this.emit('expedition', { id, gold: vault ? gold * 2 : gold, items, vault });
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
    this.applyHouse();
    this.applyDelve();
  },

  // --- Weapon skills ---
  weaponSkill() {
    const w = this.state.equipment.weapon;
    return w ? ITEMS[w].wtype : 'unarmed';
  },
  // Your fists hit harder as Unarmed grows.
  fistDice() {
    const lvl = this.level('unarmed');
    return FIST_DICE.filter(([l]) => lvl >= l).pop()[1];
  },
  // Maces stagger: a hit may make the enemy start its swing over.
  stunChance() {
    const ws = this.weaponSkill();
    return Math.min(MAX_STUN, (ws === 'maces' ? MACE_STUN_PER_LEVEL * this.level('maces') : 0) + this.perk('wStun', ws));
  },
  weaponHit() {
    const ws = this.weaponSkill();
    return Math.floor(this.level(ws) / WEAPON_LEVELS_PER_BONUS) + this.perk('wHit', ws);
  },
  weaponDmg() {
    const ws = this.weaponSkill();
    return Math.floor(this.level(ws) / WEAPON_LEVELS_PER_BONUS) + this.perk('wDmg', ws);
  },
  // Lowest d20 roll that counts as a critical hit.
  critFrom() {
    const ws = this.weaponSkill();
    const blades = ws === 'blades' ? BLADE_CRIT_LEVELS.filter(l => this.level('blades') >= l).length : 0;
    return Math.max(MIN_CRIT_ROLL, 20 - this.perk('crit') - this.perk('wCrit', ws) - blades);
  },
  // Polearms punch through armour.
  pierce() {
    const ws = this.weaponSkill();
    return (ws === 'polearms' ? Math.floor(this.level('polearms') / POLEARM_PIERCE_LEVELS) : 0) + this.perk('wPierce', ws);
  },
  effectiveAc(m) {
    return Math.max(0, m.ac - this.pierce());
  },
  attackSpeedBonus() {
    const ws = this.weaponSkill();
    return Math.min(MAX_ATTACK_SPEED_BONUS, (ws === 'bows' ? BOW_SPEED_PER_LEVEL * (this.level('bows') - 1) : 0) + this.perk('wSpeed', ws) + this.perk('atkSpeed'));
  },
  weaponEldritch() {
    const ws = this.weaponSkill();
    return (ws === 'staves' ? STAFF_ELDRITCH_PER_LEVEL * (this.level('staves') - 1) : 0) + this.perk('wEldritch', ws);
  },
  weaponWard() {
    const ws = this.weaponSkill();
    return (ws === 'staves' ? Math.floor(this.level('staves') / STAFF_WARD_LEVELS) : 0) + this.perk('wWard', ws);
  },

  // --- Stealth ---
  // Chance of being caught: lower the further your level is above the activity's, and with perks.
  catchChance(skill, action) {
    const practised = RISK_CUT_PER_LEVEL * Math.max(0, this.level(skill) - action.level);
    return action.risk * (1 - Math.min(MAX_RISK_CUT, practised + this.perk('safe', skill)));
  },
  sneakDice() {
    const fists = this.weaponSkill() === 'unarmed' ? Math.floor(this.level('unarmed') / UNARMED_SNEAK_LEVELS) : 0;
    return Math.floor(this.level('stealth') / SNEAK_LEVELS_PER_DIE) + this.perk('sneak') + fists;
  },

  // --- Blessings, brews and scrolls that last a while ---
  addBuff(id, def) {
    const ms = Math.round(def.ms * (1 + this.perk('buffTime')));
    // Renewing a blessing that is still running (a repeating rite, say) refreshes it quietly.
    const renewed = !!this.state.buffs[id];
    this.state.buffs[id] = { name: def.name, icon: def.icon, effects: def.effects, left: ms };
    if (!renewed) this.log(`${def.icon} ${def.name} for ${Math.round(ms / 60000 * 10) / 10} minutes: ${this.effectsText(def.effects)}.`, 'good');
    this.emit('action');
  },
  effectsText(effects) {
    return Object.entries(effects).map(([k, v]) => PERK_EFFECTS[k].text(v)).join(', ');
  },
  buffBonus(effect) {
    let total = 0;
    for (const b of Object.values(this.state.buffs)) total += b.effects[effect] || 0;
    return total;
  },
  tickBuffs(dt) {
    const buffs = this.state.buffs;
    for (const [id, b] of Object.entries(buffs)) {
      b.left -= dt;
      if (b.left > 0) continue;
      delete buffs[id];
      this.log(`${b.icon} ${b.name} wears off.`);
      this.state.hp = Math.min(this.state.hp, this.maxHp());
      this.emit('action');
    }
  },

  // --- Scrolls ---
  scrollPower() {
    return 1 + this.perk('scrollPower');
  },
  readScroll(item) {
    const def = ITEMS[item];
    const c = this.state.combat;
    if (def.damage && (!c || c.respawn > 0)) return this.log('Save it for a fight: there is nothing here to strike.', 'warn');
    if (def.heal && this.state.hp >= this.maxHp()) return this.log('You are not hurt.', 'warn');
    this.removeItem(item, 1);
    if (def.heal) {
      this.heal(Math.round(def.heal * this.scrollPower()));
      this.log(`You read the ${def.name}. Your wounds close.`, 'good');
    }
    if (def.buff) this.addBuff(item, def.buff);
    if (def.damage) {
      const m = MONSTERS[c.monster];
      const mult = m.eldritch && def.eldritchMult ? def.eldritchMult : 1;
      const dmg = Math.round(rollDice(def.damage) * mult * this.scrollPower());
      c.monsterHp -= dmg;
      this.combatLog(c, `You read the ${def.name}: ${dmg} damage to the ${m.name}.`);
      if (c.monsterHp <= 0) this.monsterKilled(c, m);
    }
    this.emit('action');
  },

  // --- Trading ---
  // Better prices in every shop, from Trading levels and perks.
  haggle() {
    return Math.min(MAX_HAGGLE, TRADING_PRICE_PER_LEVEL * (this.level('trading') - 1) + this.perk('haggle'));
  },
  // What this place pays for an item. Trade goods fetch their market price; everything else its worth.
  sellPrice(item) {
    const good = TRADE_GOODS[item];
    const base = good ? (good.prices[this.state.location] || good.base) : ITEMS[item].sell;
    return Math.max(1, Math.round(base * (1 + this.haggle())));
  },
  // Extra Trading xp for carrying goods to a town that wants them.
  tradeXp(item) {
    const good = TRADE_GOODS[item];
    return good && good.prices[this.state.location] ? good.xp : 0;
  },
  // Goods this town makes and sells cheaply.
  marketGoods() {
    return Object.keys(TRADE_GOODS).filter(id => TRADE_GOODS[id].origin === this.state.location);
  },
  tradeBuyPrice(good) {
    return Math.max(1, Math.round(TRADE_GOODS[good].base * (1 - this.haggle())));
  },
  tradeSupplyMax() {
    return TRADE_SUPPLY + this.perk('tradeStock');
  },
  // Stock refills with game time, so it is counted lazily from when you last bought.
  tradeSupply(good) {
    const st = this.state.trade[good];
    if (!st) return this.tradeSupplyMax();
    return Math.min(this.tradeSupplyMax(), st.n + Math.floor((this.state.clock - st.t) / TRADE_RESTOCK_MS));
  },
  tradeBuy(good, qty) {
    const g = TRADE_GOODS[good];
    if (!g || g.origin !== this.state.location) return;
    if (this.level('trading') < g.level) return this.log(`You need Trading ${g.level} to deal in ${g.name}.`, 'warn');
    qty = Math.min(qty, this.tradeSupply(good), Math.floor(this.state.gold / this.tradeBuyPrice(good)));
    if (qty <= 0) return this.log(this.tradeSupply(good) ? 'You cannot afford that.' : 'The market has none left for now.', 'warn');
    if (!this.addItem(good, qty)) return this.log('Your pack is full.', 'warn');
    const cost = this.tradeBuyPrice(good) * qty;
    this.state.gold -= cost;
    const left = this.tradeSupply(good) - qty;
    // Keep the part of the restock timer already run down.
    const st = this.state.trade[good];
    const since = st && left + qty < this.tradeSupplyMax() ? (this.state.clock - st.t) % TRADE_RESTOCK_MS : 0;
    this.state.trade[good] = { n: left, t: this.state.clock - since };
    this.log(`Bought ${qty} × ${g.name} for ${cost} gold.`);
  },

  // --- Relic collections ---
  placeRelic(item) {
    const set = Object.keys(RELIC_SETS).find(s => item in RELIC_SETS[s].relics);
    if (!set || this.state.relics[item] || !this.removeItem(item, 1)) return;
    this.state.relics[item] = true;
    this.log(`You place the ${ITEMS[item].name} in your collection.`, 'good');
    if (this.relicSetDone(set)) {
      const [effect, value] = RELIC_SETS[set].bonus;
      this.log(`Collection complete: ${RELIC_SETS[set].name}! ${PERK_EFFECTS[effect].text(value)}.`, 'rare');
    }
    this.emit('action');
  },
  relicSetDone(set) {
    return Object.keys(RELIC_SETS[set].relics).every(r => this.state.relics[r]);
  },
  relicBonus(effect) {
    let total = 0;
    for (const [id, set] of Object.entries(RELIC_SETS)) if (set.bonus[0] === effect && this.relicSetDone(id)) total += set.bonus[1];
    return total;
  },

  // Gold you find or are given (fights, thefts, treasure, quests, tithes), boosted by Wisdom perks. Selling is not.
  goldFound(amount) {
    return Math.round(amount * (1 + this.perk('gold')));
  },

  // --- Debug ---
  debugGold(amount) {
    if (!(amount > 0)) return;
    this.state.gold += amount;
    this.log(`Debug: +${amount.toLocaleString('en-GB')} gold.`, 'warn');
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
