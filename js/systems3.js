// Rules for the skills in expansion4.js: the Endless Stair, spells, shields, poisons, arrows, cases,
// languages, omens and a quiet mind. Extends the Game object from game.js.

// A creature for one floor of the Endless Stair: it borrows a form and grows with the depth.
function delveMonster(floor) {
  const form = MONSTERS[DELVE_FORMS[Math.floor((floor - 1) / DELVE_CHEST_EVERY) % DELVE_FORMS.length]];
  const warden = floor % DELVE_CHECKPOINT === 0;
  const m = {
    name: `${warden ? 'Warden' : form.name} of Floor ${floor}`, icon: warden ? '👁️' : form.icon, boss: warden,
    hp: Math.round((40 + floor * 18) * (warden ? 2.5 : 1)), ac: Math.min(26, 11 + Math.floor(floor / 6)), hit: 3 + Math.floor(floor / 3),
    dmg: `${1 + Math.floor(floor / 15)}d8+${Math.floor(floor / 2)}`, speed: 2600, xp: Math.round((20 + floor * 12) * (warden ? 2 : 1)),
    gold: [floor * 5, floor * 12], drops: [],
  };
  if (form.eldritch || warden) m.eldritch = { dc: 11 + Math.floor(floor / 8), loss: 2 + Math.floor(floor / 10) };
  return m;
}
MONSTERS.delve_floor = delveMonster(1);

Object.assign(Game, {
  // --- Bonuses from these skills, added to perks ---
  moreBonus(effect, skill) {
    const skillBound = PERK_EFFECTS[effect].scope === 'skill';
    let total = 0;
    for (const lang of this.languages()) {
      for (const [eff, value, sk] of lang.mods) if (eff === effect && (!skillBound || sk === skill)) total += value;
    }
    if (effect === 'scout') total += Math.floor(this.level('divination') / DIVINATION_SCOUT_LEVELS);
    if (effect === 'arrowDmg') total += Math.floor(this.level('fletching') / FLETCHING_DMG_LEVELS);
    return total;
  },

  // --- Delving ---
  delveCheckpoints() {
    const cps = [1];
    for (let f = DELVE_CHECKPOINT; f <= this.state.delve.deepest; f += DELVE_CHECKPOINT) cps.push(f);
    return cps;
  },
  startDelve(floor) {
    if (this.state.travel || this.state.location !== DELVE_LOCATION || !this.delveCheckpoints().includes(floor)) return;
    this.stop(true);
    this.state.delve.floor = floor;
    MONSTERS.delve_floor = delveMonster(floor);
    this.state.combat = { monster: 'delve_floor', monsterHp: MONSTERS.delve_floor.hp, playerTimer: 0, monsterTimer: 0, respawn: 0, log: [], delve: true };
    this.log(`You start down the Endless Stair from floor ${floor}.`, 'story');
    this.emit('action');
  },
  advanceDelve(c) {
    const d = this.state.delve;
    this.addXp('delving', DELVE_XP_PER_FLOOR * d.floor);
    if (d.floor % DELVE_CHEST_EVERY === 0) this.delveChest(d.floor);
    d.floor++;
    d.deepest = Math.max(d.deepest, d.floor);
    MONSTERS.delve_floor = delveMonster(d.floor);
    c.respawn = EXPEDITION_ROOM_PAUSE_MS;
    this.combatLog(c, `You go down to floor ${d.floor}.`);
  },
  delveChest(floor) {
    const gold = this.goldFound(floor * 30);
    this.state.gold += gold;
    const pool = DELVE_LOOT.slice(0, Math.min(DELVE_LOOT.length, 3 + Math.floor(floor / 10)));
    const item = pool[randInt(0, pool.length - 1)];
    const got = this.addItem(item, 1);
    if (!got) this.state.bank[item] = this.bankCount(item) + 1;
    this.log(`A chest on floor ${floor}: ${gold} gold and ${ITEMS[item].name}${got ? '' : ' (sent to your vault)'}.`, 'rare');
  },
  // After a load, the creature on your floor is rebuilt.
  applyDelve() {
    const c = this.state.combat;
    MONSTERS.delve_floor = delveMonster(c && c.delve ? this.state.delve.floor : 1);
  },

  // --- Thaumaturgy ---
  knownSpells() {
    return Object.keys(SPELLS).filter(id => this.level('thaumaturgy') >= SPELLS[id].level);
  },
  prepareSpell(id) {
    if (id && !this.knownSpells().includes(id)) return;
    this.state.spell = id || null;
    if (id) this.log(`${SPELLS[id].icon} You prepare ${SPELLS[id].name}.`);
    this.emit('action');
  },
  spellPower() {
    return 1 + SPELL_POWER_PER_LEVEL * (this.level('thaumaturgy') - 1) + this.perk('spellPower');
  },
  spellCost(id) {
    return Math.max(1, Math.round(SPELLS[id].cost * (1 + Math.max(-0.8, this.perk('spellCost')))));
  },
  spellEvery(id) {
    return SPELLS[id].every * (1 - Math.min(0.6, this.perk('spellSpeed')));
  },
  // Called every combat tick. Returns true if the spell killed the enemy.
  tickSpell(c, m, dt) {
    const id = this.state.spell;
    if (!id) return false;
    const sp = SPELLS[id];
    // The first cast of a fight comes at once.
    c.spellTimer = (c.spellTimer === undefined ? this.spellEvery(id) : c.spellTimer) + dt;
    if (c.spellTimer < this.spellEvery(id)) return false;
    const cost = this.spellCost(id);
    if (this.state.sanity - cost < SPELL_SANITY_MARGIN) return false;
    // Some spells wait until they are needed.
    if (sp.heal && this.state.hp >= this.maxHp() * 0.6) return false;
    if (sp.ward && this.state.buffs.spell_ward) return false;
    if (sp.summon && this.hasCompanion(sp.summon)) return false;
    c.spellTimer = 0;
    this.state.sanity -= cost;
    this.addXp('thaumaturgy', cost * 5);
    const power = this.spellPower();
    if (sp.damage) {
      const dmg = Math.round(rollDice(sp.damage) * power * (m.eldritch && sp.eldritchMult ? sp.eldritchMult : 1));
      c.monsterHp -= dmg;
      if (sp.stun) c.monsterTimer = 0;
      this.combatLog(c, `${sp.icon} ${sp.name}: ${dmg} damage${sp.stun ? ', and it is held fast' : ''}.`);
    }
    if (sp.heal) {
      const heal = Math.round(sp.heal * power);
      this.heal(heal);
      this.combatLog(c, `${sp.icon} ${sp.name}: you heal ${heal}.`);
    }
    if (sp.ward) {
      this.addBuff('spell_ward', sp.ward);
      this.combatLog(c, `${sp.icon} ${sp.name} settles over you.`);
    }
    if (sp.summon) {
      this.raiseThrall(sp.summon);
      this.combatLog(c, `${sp.icon} A shade steps out of your shadow.`);
    }
    return c.monsterHp <= 0;
  },

  // --- Shieldcraft ---
  hasShield() {
    return !!this.state.equipment.offhand;
  },
  blockChance() {
    if (!this.hasShield()) return 0;
    return Math.min(MAX_BLOCK, BLOCK_BASE + BLOCK_PER_LEVEL * (this.level('shieldcraft') - 1) + this.perk('block'));
  },
  // A blow that would land may be caught on the shield. Returns true if it was.
  tryBlock(c, m) {
    if (Math.random() >= this.blockChance()) return false;
    this.combatLog(c, `You catch the ${m.name}'s blow on your shield.`);
    this.addXp('shieldcraft', 5 + m.xp * 0.2);
    if (Math.random() < this.perk('riposte')) {
      this.combatLog(c, 'Riposte!');
      this.playerAttack(c, m);
    }
    return true;
  },

  // --- Toxicology ---
  coatWeapon(item) {
    const def = ITEMS[item];
    if (!this.removeItem(item, 1)) return;
    this.addBuff('poison', def.buff);
    this.log(`${def.icon} You coat your weapon with ${def.name}.`, 'good');
  },
  poisonDamage() {
    const base = this.perk('poisonDmg');
    return base ? Math.round(base * (1 + POISON_POWER_PER_LEVEL * (this.level('toxicology') - 1) + this.perk('poisonPower'))) : 0;
  },

  // --- Fletching ---
  // The best arrow in your pack, if you shoot a bow.
  bestArrow() {
    if (this.weaponSkill() !== 'bows') return null;
    return Object.keys(this.state.pack).filter(id => ITEMS[id].type === 'arrow').sort((a, b) => ITEMS[b].arrowDmg - ITEMS[a].arrowDmg)[0] || null;
  },
  // Takes one arrow for a shot. Returns its definition, or null.
  nockArrow() {
    const id = this.bestArrow();
    if (!id) return null;
    this.removeItem(id, 1);
    this.addXp('fletching', FLETCHING_XP_PER_SHOT);
    return ITEMS[id];
  },
  arrowDamage(arrow, m) {
    return arrow ? arrow.arrowDmg + this.perk('arrowDmg') + (m.eldritch ? arrow.arrowEldritch : 0) : 0;
  },

  // --- Investigation ---
  caseSolved(id) {
    return !!this.state.flags[`case_${id}`];
  },
  solveCase(id) {
    const c = CASES[id];
    this.state.flags[`case_${id}`] = true;
    this.log(`📁 Case solved: ${c.name}. ${c.result}`, 'story');
    this.grant(c.reward);
    return false;
  },

  // --- Linguistics ---
  languages() {
    return LANGUAGES.filter(l => this.level('linguistics') >= l.level);
  },

  // --- Divination ---
  drawTarot() {
    const card = TAROT[randInt(0, TAROT.length - 1)];
    this.addBuff('tarot', { name: card.name, icon: card.icon, effects: card.effects, ms: TAROT_MS });
    this.log(`${card.icon} You turn over ${card.name}.`, 'veil');
    return true;
  },

  // --- Meditation ---
  derangementResist() {
    return Math.min(MAX_DERANGEMENT_RESIST, MEDITATION_RESIST_PER_LEVEL * (this.level('meditation') - 1));
  },
});
