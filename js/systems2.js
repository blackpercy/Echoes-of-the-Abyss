// Rules for the skills in expansion3.js: garden plots, your house, pets, bounties, thralls and healing.
// Extends the Game object from game.js.

Object.assign(Game, {
  // --- Bonuses that work like perks: your pet, the rooms of your house, carried gadgets and passive skills ---
  extraBonus(effect, skill) {
    const skillBound = PERK_EFFECTS[effect].scope === 'skill';
    const s = this.state;
    const mods = [];
    if (s.pets.active) mods.push(...PETS[s.pets.active].mods);
    if (this.atHome() || !skillBound) for (const room of this.builtRooms()) mods.push(...HOUSE_ROOMS[room].mods);
    for (const id of Object.keys(s.pack)) if (ITEMS[id].gadget) mods.push(...ITEMS[id].mods);
    let total = 0;
    for (const [eff, value, sk] of mods) if (eff === effect && (!skillBound || sk === skill)) total += value;
    // Skills whose levels act like perks.
    if (effect === 'heal' || effect === 'potency') total += MEDICINE_HEAL_PER_LEVEL * (this.level('medicine') - 1);
    if (effect === 'eldritch') total += ASTRONOMY_ELDRITCH_PER_LEVEL * (this.level('astronomy') - 1);
    if (effect === 'rally' && this.level('medicine') >= MEDICINE_RALLY_LEVEL) total += 1;
    return total;
  },

  // --- Special activities ---
  // Why an activity with a special effect cannot happen right now, or null.
  effectBlocker(skill, action) {
    const s = this.state;
    if (skill === 'faith' && this.thralls().length) return 'The gods will not hear you while the dead walk beside you';
    if (action.goldCost && s.gold < action.goldCost) return `Needs ${action.goldCost} gold`;
    switch (action.effect) {
      case 'raise':
        if (this.thralls().length >= this.thrallCapacity()) return 'You cannot hold more thralls';
        if (this.hasCompanion(action.id)) return 'That thrall already walks with you';
        return null;
      case 'cure':
        return s.madness > 0 ? null : 'Your mind is whole';
      case 'revive':
        return s.companions.some(c => !COMPANIONS[c.id].thrall && (c.downed || c.hp < this.companionStats(c).hp)) ? null : 'None of your companions need tending';
      case 'build':
        return this.buildBlocker(action.room);
    }
    return null;
  },
  // Runs an activity's special effect. Returns false when the activity should stop.
  actionEffect(skill, action) {
    const s = this.state;
    if (action.goldCost) s.gold -= action.goldCost;
    switch (action.effect) {
      case 'raise': return this.raiseThrall(action.id);
      case 'cure':
        this.quietMind();
        s.flags.mindMended = true;
        this.log('The worst of it passes. You feel more like yourself.', 'good');
        this.checkCompanionLoyalty();
        return false;
      case 'revive':
        for (const c of s.companions) {
          if (COMPANIONS[c.id].thrall) continue;
          c.downed = false;
          c.hp = this.companionStats(c).hp;
        }
        this.log('You patch up your companions. They are ready to go on.', 'good');
        return false;
      case 'tame': return this.tryTame(skill, action);
      case 'build': return this.buildRoom(action.room);
    }
    return true;
  },

  // --- Gardening ---
  gardenPlots() {
    return Math.min(MAX_PLOTS, GARDEN_BASE_PLOTS + Math.floor(this.level('gardening') / GARDEN_LEVELS_PER_PLOT) + this.perk('plots'));
  },
  // Each planted plot: { seed, planted } (real time, so it grows while you are away).
  plots() {
    const g = this.state.garden;
    while (g.plots.length < this.gardenPlots()) g.plots.push(null);
    return g.plots.slice(0, this.gardenPlots());
  },
  growTime(seed) {
    return CROPS[seed][2] * 60000 * (1 - Math.min(MAX_PERK_SPEED, this.perk('speed', 'gardening')));
  },
  plotReady(plot) {
    return plot && Date.now() - plot.planted >= this.growTime(plot.seed);
  },
  plant(seed) {
    if (!CROPS[seed] || !this.hasStation('garden')) return;
    if (this.level('gardening') < CROPS[seed][3]) return this.log(`You need Gardening ${CROPS[seed][3]} to grow that.`, 'warn');
    const plots = this.plots();
    const i = plots.findIndex(p => !p);
    if (i < 0) return this.log('Every plot is planted.', 'warn');
    if (!this.removeItem(seed, 1)) return;
    this.state.garden.plots[i] = { seed, planted: Date.now() };
    this.addXp('gardening', CROPS[seed][4] * PLANT_XP_SHARE);
    this.emit('action');
  },
  // Plant one seed of a kind in every empty plot.
  plantAll(seed) {
    let n = this.plots().filter(p => !p).length;
    while (n-- > 0 && this.count(seed) > 0 && this.level('gardening') >= CROPS[seed][3]) this.plant(seed);
  },
  harvest(index) {
    const plot = this.state.garden.plots[index];
    if (!this.plotReady(plot) || !this.hasStation('garden')) return;
    const [crop, qty, , , xp] = CROPS[plot.seed];
    const total = qty * (Math.random() < this.perk('double', 'gardening') ? 2 : 1);
    if (!this.addItem(crop, total)) return this.log('Your pack is full.', 'warn');
    this.state.garden.plots[index] = null;
    if (crop === 'star_rose') this.state.flags.starRoseHarvest = true;
    this.addXp('gardening', xp);
    this.log(`You harvest ${total} × ${ITEMS[crop].name}.`, 'good');
    this.emit('action');
  },
  harvestAll() {
    this.plots().forEach((p, i) => { if (this.plotReady(p)) this.harvest(i); });
  },

  // --- Your house ---
  builtRooms() {
    const h = this.state.house;
    return h ? Object.keys(h.rooms).filter(r => h.rooms[r]) : [];
  },
  atHome() {
    const h = this.state.house;
    return !!h && h.location === this.state.location;
  },
  houseStations() {
    return this.atHome() ? this.builtRooms().flatMap(r => HOUSE_ROOMS[r].stations) : [];
  },
  buildBlocker(room) {
    const h = this.state.house;
    if (room === 'house') {
      if (h) return `Your house stands in ${LOCATIONS[h.location].name}`;
      return this.here().kind === 'town' ? null : 'Only in a town';
    }
    if (!h) return 'Build your house first';
    if (!this.atHome()) return `Only at your house in ${LOCATIONS[h.location].name}`;
    return h.rooms[room] ? 'Already built' : null;
  },
  buildRoom(room) {
    if (room === 'house') this.state.house = { location: this.state.location, rooms: {} };
    this.state.house.rooms[room] = true;
    this.state.home = this.state.house.location;
    this.applyWorld();
    this.log(room === 'house' ? `Your house in ${this.here().name} is finished. This is home now.` : `The ${HOUSE_ROOMS[room].name} is finished.`, 'rare');
    this.emit('action');
    return false;
  },
  // A strongroom makes your home town a bank, wherever that is.
  applyHouse() {
    for (const [loc, base] of Object.entries(BASE_LOCATIONS_SNAPSHOT)) LOCATIONS[loc].bank = base.bank;
    const h = this.state.house;
    if (h && h.rooms.storeroom) LOCATIONS[h.location].bank = true;
  },

  // --- Beast Taming ---
  tameChance() {
    return Math.min(0.9, TAME_BASE_CHANCE + TAME_CHANCE_PER_LEVEL * (this.level('taming') - 1) + this.perk('tameChance'));
  },
  tryTame(skill, action) {
    const pets = this.state.pets;
    if (pets.owned[action.id]) return true;
    if (Math.random() >= this.tameChance()) {
      this.log(`The ${PETS[action.id].name.toLowerCase()} takes the bait, but not you. Not yet.`);
      return true;
    }
    pets.owned[action.id] = true;
    if (!pets.active) pets.active = action.id;
    this.log(`${PETS[action.id].icon} The ${PETS[action.id].name} is yours.${pets.active === action.id ? ' It follows you now.' : ' Choose it on the Beast Taming page.'}`, 'rare');
    this.emit('action');
    return false;
  },
  setPet(id) {
    const pets = this.state.pets;
    if (id && !pets.owned[id]) return;
    pets.active = id || null;
    if (id) this.log(`${PETS[id].icon} The ${PETS[id].name} follows you now.`);
    this.emit('action');
  },

  // --- Slaying ---
  // Creatures you could be sent after: known, not bosses, and not far beyond you.
  slayerCandidates() {
    const maxXp = Math.max(30, this.level('combat') * 8);
    const ids = new Set();
    for (const [loc, l] of Object.entries(LOCATIONS)) {
      if (!this.state.known[loc] || l.hidden) continue;
      for (const m of l.monsters || []) if (!MONSTERS[m].boss && MONSTERS[m].xp <= maxXp) ids.add(m);
    }
    return [...ids];
  },
  newBounty(reroll) {
    const s = this.state;
    if (this.here().kind !== 'town') return this.log('Bounties are posted on the boards in towns.', 'warn');
    if (s.slayer.task && !reroll) return;
    if (reroll) {
      if (s.gold < SLAYER_REROLL_GOLD) return this.log('You cannot afford to tear down the notice.', 'warn');
      s.gold -= SLAYER_REROLL_GOLD;
    }
    const options = this.slayerCandidates().filter(m => !s.slayer.task || m !== s.slayer.task.monster);
    if (!options.length) return this.log('The board has nothing you know how to find.', 'warn');
    const monster = options[randInt(0, options.length - 1)];
    s.slayer.task = { monster, need: randInt(10, 20), done: 0 };
    this.log(`🎯 Bounty: slay ${s.slayer.task.need} × ${MONSTERS[monster].name}.`, 'story');
    this.emit('action');
  },
  isQuarry(m) {
    const t = this.state.slayer.task;
    return !!t && MONSTERS[t.monster] === m;
  },
  slayerHit(m) {
    return this.isQuarry(m) ? Math.floor(this.level('slaying') / SLAYER_HIT_LEVELS) + 1 : 0;
  },
  slayerDmg(m) {
    return this.isQuarry(m) ? Math.floor(this.level('slaying') / SLAYER_DMG_LEVELS) + this.perk('slayDmg') : 0;
  },
  slayerKill(id, m) {
    const s = this.state;
    const t = s.slayer.task;
    if (!t || t.monster !== id) return;
    t.done++;
    this.addXp('slaying', m.xp * SLAYER_KILL_SHARE);
    if (t.done < t.need) return;
    const gold = this.goldFound(Math.round(t.need * m.xp * SLAYER_REWARD_GOLD));
    s.gold += gold;
    this.addXp('slaying', t.need * m.xp * SLAYER_REWARD_XP);
    s.slayer.done++;
    s.slayer.task = null;
    this.log(`🎯 Bounty complete: ${t.need} × ${m.name}. You collect ${gold} gold.`, 'rare');
  },

  // --- Necromancy ---
  thralls() {
    return this.state.companions.filter(c => COMPANIONS[c.id].thrall);
  },
  thrallCapacity() {
    return 1 + Math.floor(this.level('necromancy') / THRALL_LEVELS_PER_SLOT);
  },
  raiseThrall(id) {
    const def = COMPANIONS[id];
    const comp = { id, hp: 0, sanity: 0, downed: false, rage: 0, timer: 0 };
    const st = this.companionStats(comp);
    Object.assign(comp, { hp: st.hp, sanity: st.sanity, left: Math.round(def.lasts * (1 + THRALL_TIME_PER_LEVEL * (this.level('necromancy') - 1) + this.perk('thrallTime'))) });
    this.state.companions.push(comp);
    this.log(`${def.icon} The ${def.name} rises and waits for your word.`, 'veil');
    this.emit('action');
    return false;
  },
  tickThralls(dt) {
    for (const c of this.thralls()) {
      c.left -= dt;
      if (c.left > 0) continue;
      this.crumble(c, 'crumbles back into dust');
    }
  },
  crumble(comp, how) {
    this.state.companions = this.state.companions.filter(c => c !== comp);
    this.log(`${COMPANIONS[comp.id].icon} The ${COMPANIONS[comp.id].name} ${how}.`, 'veil');
    this.emit('action');
  },
});
