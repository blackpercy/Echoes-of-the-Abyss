// Madness, the Veil, people and quests. Extends the Game object from game.js.

Object.assign(Game, {
  // --- Mind ---
  madness() {
    return this.state.madness;
  },
  hasDerangement(id) {
    return this.state.derangements.includes(id);
  },
  veilSight() {
    const s = this.state;
    if (s.sanity < this.veilThreshold() || s.madness >= PERMANENT_VEIL_MADNESS) return true;
    return Object.keys(ITEMS).some(id => ITEMS[id].veilSight && this.carries(id));
  },
  mindState() {
    return MIND_STATES.find(m => this.state.sanity >= m.min) || MIND_STATES[MIND_STATES.length - 1];
  },
  // Sanity at zero breaks your mind: you gain madness and a derangement, but you keep playing.
  mindBreaks() {
    const s = this.state;
    s.combat = null;
    s.action = null;
    let gained = null;
    if (s.madness < MADNESS_STAGES.length - 1) {
      s.madness++;
      const options = Object.keys(DERANGEMENTS).filter(id => !s.derangements.includes(id));
      // A practised, quiet mind can break cleanly.
      if (options.length && Math.random() >= this.derangementResist()) {
        gained = options[randInt(0, options.length - 1)];
        s.derangements.push(gained);
      }
    }
    s.sanity = Math.min(this.maxSanity(), SANITY_AFTER_BREAK);
    s.hp = Math.min(s.hp, this.maxHp());
    this.log(`Your mind breaks. You are now ${MADNESS_STAGES[s.madness]}.`, 'bad');
    if (gained) this.log(`New derangement: ${DERANGEMENTS[gained].name}. ${DERANGEMENTS[gained].desc}`, 'rare');
    this.questEvent('madness');
    this.checkCompanionLoyalty();
    this.emit('break', { madness: s.madness, derangement: gained });
    this.emit('action');
  },
  quietMind() {
    const s = this.state;
    if (s.madness <= 0) return;
    s.madness--;
    const lost = s.derangements.pop();
    if (lost) this.log(`${DERANGEMENTS[lost].name} fades away.`, 'good');
    this.log(`You are now ${MADNESS_STAGES[s.madness]}.`, 'good');
  },

  // --- Conditions used by people, quests and interactions ---
  check(cond) {
    if (!cond) return true;
    const s = this.state;
    if (cond.veil === true && !this.veilSight()) return false;
    if (cond.veil === false && this.veilSight()) return false;
    if (cond.night !== undefined && this.isNight() !== cond.night) return false;
    if (cond.lowTide !== undefined && this.isLowTide() !== cond.lowTide) return false;
    if (cond.starsRight && !this.starsRight()) return false;
    if (cond.race && s.race !== cond.race) return false;
    if (cond.background && s.background !== cond.background) return false;
    if (cond.noCompanion && this.hasCompanion(cond.noCompanion)) return false;
    if (cond.ending && !s.endings[cond.ending]) return false;
    for (const flag of cond.flags || []) if (!s.flags[flag]) return false;
    if (cond.minMadness !== undefined && s.madness < cond.minMadness) return false;
    if (cond.maxMadness !== undefined && s.madness > cond.maxMadness) return false;
    for (const [id, want] of Object.entries(cond.quests || {})) {
      if (this.questStatus(id) !== want) return false;
    }
    return true;
  },
  // Why a condition fails, for display; null if it holds.
  checkReason(cond) {
    if (!cond) return null;
    const s = this.state;
    if (cond.veil && !this.veilSight()) return 'Only visible through the Veil';
    if (cond.minMadness !== undefined && s.madness < cond.minMadness) return `Requires madness: ${MADNESS_STAGES[cond.minMadness]}`;
    if (cond.maxMadness !== undefined && s.madness > cond.maxMadness) return 'You are too far gone';
    for (const [id, want] of Object.entries(cond.quests || {})) {
      if (this.questStatus(id) !== want) return `Requires: ${QUESTS[id].name}`;
    }
    return null;
  },

  // --- People ---
  npcsHere() {
    return Object.keys(NPCS).filter(id => NPCS[id].location === this.state.location && this.check(NPCS[id].if));
  },
  npcLine(id) {
    return NPCS[id].lines.find(l => this.check(l.if)).text;
  },
  interactionCost(inter) {
    const c = inter.cost || {};
    return {
      gold: (c.gold || 0) + (c.goldPerMadness || 0) * this.state.madness,
      sanity: c.sanity || 0,
      items: c.items || {},
    };
  },
  interact(npcId, interId) {
    const npc = NPCS[npcId];
    const inter = npc && (npc.interactions || []).find(i => i.id === interId);
    if (!inter || npc.location !== this.state.location || !this.check(npc.if) || !this.check(inter.if)) return;
    const cost = this.interactionCost(inter);
    if (inter.gain && inter.gain.companion && !this.companionRoom()) {
      return this.log(`You already lead as many companions as you can (${this.companionCapacity()}). Raise your Fellowship, or part ways with someone.`, 'warn');
    }
    if (this.state.gold < cost.gold) return this.log('You cannot afford that.', 'warn');
    if (!this.hasAll(cost.items)) return this.log('You do not have what is needed.', 'warn');
    this.state.gold -= cost.gold;
    for (const [item, qty] of Object.entries(cost.items)) this.removeItem(item, qty);
    this.log(`${npc.name}: ${inter.result}`, 'story');
    this.grant(inter.gain);
    if (cost.sanity) {
      this.state.sanity -= cost.sanity;
      if (this.state.sanity <= 0) this.mindBreaks();
    }
    this.emit('action');
  },
  grant(gain) {
    if (!gain) return;
    const s = this.state;
    if (gain.gold) s.gold += this.goldFound(gain.gold);
    for (const [item, qty] of Object.entries(gain.items || {})) {
      if (this.addItem(item, qty)) this.log(`Received ${qty} × ${ITEMS[item].name}.`, 'good');
      else {
        s.bank[item] = this.bankCount(item) + qty;
        this.log(`Your pack is full, so ${qty} × ${ITEMS[item].name} was sent to your bank vault.`, 'warn');
      }
    }
    for (const [skill, xp] of Object.entries(gain.xp || {})) this.addXp(skill, xp);
    for (const flag of gain.flags || []) s.flags[flag] = true;
    if (gain.madness && gain.madness < 0) for (let i = 0; i < -gain.madness; i++) this.quietMind();
    if (gain.sanity) this.restoreSanity(gain.sanity);
    if (gain.reveal) this.reveal(gain.reveal);
    if (gain.revealRandom) this.revealRandom();
    if (gain.companion) this.hireCompanion(gain.companion);
    if (gain.cult) this.foundCult();
  },

  // --- Quests ---
  questStatus(id) {
    const q = this.state.quests[id];
    return q ? q.status : 'none';
  },
  questsOffered(npcId) {
    return Object.keys(QUESTS).filter(id => QUESTS[id].giver === npcId && this.questStatus(id) === 'none');
  },
  acceptQuest(id) {
    const q = QUESTS[id];
    if (!q || this.questStatus(id) !== 'none' || !this.check(q.requires)) return;
    if (NPCS[q.giver].location !== this.state.location) return;
    this.state.quests[id] = { status: 'active', progress: 0 };
    this.log(`New quest: ${q.name}.`, 'story');
    // Objectives that may already be met are checked straight away.
    this.questEvent('madness');
    this.questEvent('followers');
    this.questEvent('visit', this.state.location);
    this.emit('action');
  },
  questProgressText(id) {
    const o = QUESTS[id].objective;
    const p = this.state.quests[id] ? this.state.quests[id].progress : 0;
    if (o.type === 'kill') return `Slay ${MONSTERS[o.monster].name}: ${p} / ${o.count}`;
    if (o.type === 'deliver') return 'Bring ' + Object.entries(o.items).map(([it, n]) => `${n} × ${ITEMS[it].name} (${Math.min(n, this.count(it))}/${n})`).join(', ') + ` to ${NPCS[QUESTS[id].giver].name}`;
    if (o.type === 'visit') return `Travel to ${LOCATIONS[o.location].name}${o.minMadness ? ` while at least ${MADNESS_STAGES[o.minMadness]}` : ''}`;
    if (o.type === 'expedition') return `Complete the expedition: ${EXPEDITIONS[o.expedition].name}`;
    if (o.type === 'followers') return `Gather ${o.count} followers (now ${this.state.cult ? this.state.cult.followers : 0})`;
    if (o.type === 'madness') return `Let your mind break until you are ${MADNESS_STAGES[o.count]} (now ${MADNESS_STAGES[this.state.madness]})`;
    return '';
  },
  questEvent(type, arg) {
    for (const [id, q] of Object.entries(this.state.quests)) {
      if (q.status !== 'active') continue;
      const o = QUESTS[id].objective;
      if (o.type !== type) continue;
      if (type === 'kill' && o.monster === arg) {
        q.progress++;
        if (q.progress >= o.count) this.completeQuest(id);
      } else if (type === 'visit' && o.location === arg && (o.minMadness === undefined || this.state.madness >= o.minMadness)) {
        this.completeQuest(id);
      } else if (type === 'madness' && this.state.madness >= o.count) {
        this.completeQuest(id);
      } else if (type === 'expedition' && o.expedition === arg) {
        this.completeQuest(id);
      } else if (type === 'followers' && this.state.cult && this.state.cult.followers >= o.count) {
        this.completeQuest(id);
      }
    }
  },
  canTurnIn(id) {
    const o = QUESTS[id].objective;
    return this.questStatus(id) === 'active' && o.type === 'deliver' && this.hasAll(o.items);
  },
  turnIn(id) {
    if (!this.canTurnIn(id) || NPCS[QUESTS[id].giver].location !== this.state.location) return;
    for (const [item, qty] of Object.entries(QUESTS[id].objective.items)) this.removeItem(item, qty);
    this.completeQuest(id);
  },
  completeQuest(id) {
    const q = QUESTS[id];
    this.state.quests[id].status = 'done';
    this.log(`Quest complete: ${q.name}. ${q.done}`, 'story');
    this.grant(q.reward);
    if (q.reward.ending) {
      this.state.endings[q.reward.ending] = true;
      this.applyWorld();
      this.emit('ending', { ending: q.reward.ending });
    }
    this.emit('action');
  },

  // --- Prices ---
  price(entry) {
    const shop = this.shop();
    let p = entry.price;
    if (this.hasDerangement('paranoia')) p *= 1.25;
    if (shop.kinDiscountAtMadness !== undefined && this.state.madness >= shop.kinDiscountAtMadness) p *= 0.8;
    const id = this.here().shop;
    if (id === 'smithy' && this.state.race === 'dwarf') p *= 0.8;
    if (id === 'apothecary' && this.state.background === 'acolyte') p *= 0.8;
    if (id === 'general_store' && this.state.background === 'acolyte') p *= 1.1;
    if (this.here().kin) p *= 0.7;
    if (!shop.currency) p *= 1 - this.haggle();
    return Math.max(1, Math.round(p));
  },
  currency() {
    const shop = this.shop();
    return shop && shop.currency ? shop.currency : null;
  },
  funds() {
    const cur = this.currency();
    return cur ? this.count(cur) : this.state.gold;
  },
  shopRefuses() {
    const shop = this.shop();
    return shop && shop.refuseAtMadness !== undefined && this.state.madness >= shop.refuseAtMadness;
  },
});
