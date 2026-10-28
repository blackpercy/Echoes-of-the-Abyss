// Holdout: everything on screen. The base, the survivors, the region map and the battle grid.

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const stars = n => '☠'.repeat(n);

const UI = {
  tab: 'base',
  mapSel: null,
  plan: { kind: null, squad: [], gear: {} },
  sel: null,        // selected unit in battle
  mode: 'move',     // what tapping a tile does
  target: null,     // enemy picked for an attack

  init() {
    document.body.addEventListener('click', e => this.onClick(e));
    document.body.addEventListener('change', e => this.onChange(e));
    // The isometric grid is sized to the screen, so redraw it when the screen changes.
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => Game.state.battle && this.render(), 150);
    });
    Game.listeners.push(type => {
      if (type === 'reset') {
        this.tab = 'base';
        this.showIntro();
      }
      this.render();
    });
    this.render();
    if (!Game.state.seenIntro) this.showIntro();
  },

  // --- Clicks ---
  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const d = el.dataset;
    const b = Game.state.battle;
    switch (d.act) {
      case 'tab': this.tab = d.tab; break;
      case 'end-day': {
        const lines = Game.endDay();
        if (lines) this.showModal(`<h2>Day ${Game.state.day}</h2>${lines.length ? `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : '<p>A quiet night. Nobody sleeps much anyway.</p>'}${Game.hordeHere() ? '<p class="bad">The horde is here. Choose who defends the walls.</p>' : ''}`);
        break;
      }
      case 'build': Game.build(d.id); break;
      case 'craft': Game.craft(d.id); break;
      case 'cure': Game.cure(+d.id); break;
      case 'site':
        this.mapSel = d.id;
        this.plan = { kind: Game.missionKinds(d.id)[0] || null, squad: [], gear: {} };
        break;
      case 'kind': this.plan.kind = d.kind; break;
      case 'squad': {
        const id = +d.id;
        const i = this.plan.squad.indexOf(id);
        if (i >= 0) this.plan.squad.splice(i, 1);
        else if (this.plan.squad.length < SQUAD_SIZE) this.plan.squad.push(id);
        break;
      }
      case 'gear': {
        const g = d.gear;
        const n = Math.max(0, Math.min(Game.state.gear[g] || 0, (this.plan.gear[g] || 0) + +d.step));
        this.plan.gear[g] = n;
        break;
      }
      case 'launch':
        Game.startMission(this.mapSel, this.plan.kind, this.plan.squad, this.plan.gear);
        this.sel = null;
        this.target = null;
        this.mode = 'move';
        break;
      case 'defend': {
        const ids = [...document.querySelectorAll('[data-defender]:checked')].map(i => +i.dataset.defender);
        Game.startDefense(ids);
        this.closeModal();
        break;
      }
      case 'close-modal': this.closeModal(); break;
      case 'intro-done':
        Game.state.seenIntro = true;
        Game.save();
        this.closeModal();
        break;
      case 'new-game':
        if (confirm('Start over? Everything on Grace Hill will be lost.')) Game.reset();
        return;
      // --- Battle ---
      case 'tile': this.tapTile(b, +d.x, +d.y); break;
      case 'mode': this.mode = this.mode === d.mode ? 'move' : d.mode; this.target = null; break;
      case 'fire': this.act(b, () => Tactics.shoot(b, this.unit(b), this.unitById(b, this.target))); break;
      case 'strike': this.act(b, () => Tactics.melee(b, this.unit(b), this.unitById(b, this.target))); break;
      case 'reload': this.act(b, () => Tactics.reload(b, this.unit(b))); break;
      case 'overwatch': this.act(b, () => Tactics.overwatch(b, this.unit(b))); break;
      case 'search': this.act(b, () => Tactics.search(b, this.unit(b))); break;
      case 'extract': this.act(b, () => Tactics.extract(b, this.unit(b))); break;
      case 'heal-self': this.act(b, () => Tactics.heal(b, this.unit(b), this.unit(b))); break;
      case 'next': this.selectNext(b); break;
      case 'zoom':
        Game.state.zoom = Math.max(1, Math.min(2.6, Math.round((this.zoom() + 0.3 * +d.step) * 10) / 10));
        Game.save();
        this.followSel = true;
        break;
      case 'view':
        Game.state.view = Game.state.view === 'flat' ? 'iso' : 'flat';
        Game.save();
        break;
      case 'end-turn':
        Tactics.endTurn(b);
        this.target = null;
        this.mode = 'move';
        if (!this.unit(b) || this.unit(b).ap <= 0) this.selectNext(b);
        Game.save();
        break;
      case 'leave-battle': {
        const report = Game.finishMission();
        this.sel = null;
        if (report) this.showModal(`<h2>${report.won ? 'Mission accomplished' : 'Mission failed'}</h2><ul>${report.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`);
        if (Game.state.won) this.showModal('<h2>🏆 Holdout</h2><p>The Hive at St. Agnes is ash. The dead in Marrow Creek wander aimlessly now, and the people on Grace Hill can begin to rebuild.</p><p>You won. You can keep playing.</p>');
        break;
      }
    }
    this.render();
  },
  onChange(e) {
    const el = e.target;
    if (el.dataset.equip) Game.equip(+el.dataset.equip, el.dataset.slot, el.value || null);
  },

  // --- Battle helpers ---
  unit(b) {
    return b && b.units.find(u => u.id === this.sel && Tactics.onMap(u) && u.side === 'p');
  },
  unitById(b, id) {
    return b.units.find(u => u.id === id);
  },
  act(b, fn) {
    if (!this.unit(b) || b.result) return;
    fn();
    this.target = null;
    this.mode = 'move';
    const u = this.unit(b);
    if (!u || u.ap <= 0 || u.extracted) this.selectNext(b);
    Game.save();
  },
  controllable(b) {
    return Tactics.players(b).filter(u => u.hp > 0 && !u.waiting && u.ap > 0);
  },
  selectNext(b) {
    const list = this.controllable(b);
    if (!list.length) return;
    const i = list.findIndex(u => u.id === this.sel);
    this.sel = list[(i + 1) % list.length].id;
    this.mode = 'move';
    this.target = null;
  },
  tapTile(b, x, y) {
    if (!b || b.result) return;
    const here = Tactics.unitAt(b, x, y);
    const u = this.unit(b);
    if (here && here.side === 'p') {
      if (u && this.mode === 'heal' && Tactics.heal(b, u, here)) return this.act(b, () => {});
      if (u && here.downed && Tactics.manhattan(u, here) === 1) return this.act(b, () => Tactics.revive(b, u, here));
      if (here.hp > 0 && !here.waiting) {
        this.sel = here.id;
        this.mode = 'move';
        this.target = null;
      }
      return;
    }
    if (!u) return;
    if (this.mode === 'bomb') return this.act(b, () => Tactics.throwBomb(b, u, x, y));
    if (this.mode === 'flare') return this.act(b, () => Tactics.throwFlare(b, u, x, y));
    if (here && here.side === 'e') {
      if (Tactics.visible(b).has(`${x},${y}`)) this.target = here.id;
      return;
    }
    this.target = null;
    if (Tactics.moveUnit(b, u, x, y)) {
      if (u.ap <= 0) this.selectNext(b);
      Game.save();
    }
  },

  // --- Drawing ---
  render() {
    const s = Game.state;
    document.getElementById('top').innerHTML = this.topBar();
    const main = document.getElementById('main');
    const scroll = main.scrollTop;
    if (s.battle) {
      if (!this.unit(s.battle)) this.selectNext(s.battle);
      const wrap = document.getElementById('iso-wrap');
      const keep = wrap && [wrap.scrollLeft, wrap.scrollTop];
      main.innerHTML = this.battleView(s.battle);
      // Follow the survivor whose turn it is; otherwise leave the view where the player put it.
      const next = document.getElementById('iso-wrap');
      if (next && keep && this.lastSel === this.sel && !this.followSel) [next.scrollLeft, next.scrollTop] = keep;
      else this.scrollToSelected(s.battle);
      this.lastSel = this.sel;
      this.followSel = false;
    } else {
      main.innerHTML = this.tabs() + ({ base: () => this.baseView(), people: () => this.peopleView(), map: () => this.mapView(), log: () => this.logView() })[this.tab]();
      if (Game.hordeHere() && !document.querySelector('#modal .defend')) this.showDefense();
    }
    main.scrollTop = scroll;
  },
  topBar() {
    const s = Game.state;
    const res = Object.entries(RESOURCES).map(([r, def]) => `<span class="res" title="${def.name}">${def.icon} ${s.resources[r]}</span>`).join('');
    const threat = Math.min(100, Math.round(s.threat / HORDE_AT * 100));
    return `<div class="brand">Holdout <span class="muted small">day ${s.day}</span></div>
      <div class="resbar">${res}<span class="res" title="Morale (${Game.moraleAim() >= 0 ? '+' : ''}${Game.moraleAim()} aim)">${s.morale >= 60 ? '🙂' : s.morale >= 30 ? '😐' : '😟'} ${s.morale}</span></div>
      <div class="threat" title="The horde draws closer every day. At 100 it attacks."><span>🧟 Horde</span><div class="meter"><div class="fill" style="width:${threat}%"></div></div></div>
      ${s.battle ? '' : `<button class="btn primary" data-act="end-day"${Game.hordeHere() || s.lost ? ' disabled' : ''}>End day ▶</button>`}`;
  },
  tabs() {
    const tabs = { base: '⛪ Base', people: '👥 Survivors', map: '🗺️ Region', log: '📜 Log' };
    return `<nav class="tabs">${Object.entries(tabs).map(([id, name]) => `<button class="tab${this.tab === id ? ' on' : ''}" data-act="tab" data-tab="${id}">${name}</button>`).join('')}</nav>
      ${Game.state.lost ? '<div class="banner bad">Everyone on Grace Hill is gone. <button class="btn" data-act="new-game">Start again</button></div>' : ''}`;
  },

  // --- The base ---
  baseView() {
    const s = Game.state;
    const people = Game.alive();
    let html = `<section class="panel"><h2>⛪ ${BASE_SITE.name}</h2>
      <p class="small">${people.length} survivors · ${Game.beds()} beds · ${Game.ready().length} ready to go out${s.missionToday ? ' · <span class="muted">someone has already been out today</span>' : ''}</p>
      <p class="small">Morale ${s.morale}: ${Game.moraleAim() >= 0 ? '+' : ''}${Game.moraleAim()} aim. The horde grows by ${Game.threatPerDay()} each day${Game.facilityLevel('watchtower') ? `; the lookout expects it in about <b>${Game.hordeEta()} days</b>` : ''}.</p></section>`;
    // Facilities.
    const b = s.building;
    html += `<section class="panel"><h2>🏗️ Facilities <span class="muted small">${Game.usedSlots()} / ${FACILITY_SLOTS} spaces</span></h2>
      ${b ? `<p class="small">Building: <b>${FACILITIES[b.id].icon} ${FACILITIES[b.id].name}${b.level > 1 ? ` (level ${b.level})` : ''}</b>, ${b.daysLeft} day${b.daysLeft === 1 ? '' : 's'} of work left. Engineers at home speed it up.</p>` : ''}
      <div class="cards">${Object.entries(FACILITIES).map(([id, f]) => {
        const lvl = Game.facilityLevel(id);
        const next = f.levels[lvl];
        const blocker = Game.buildBlocker(id);
        return `<div class="card${lvl ? ' built' : ''}"><div class="card-head"><span class="big">${f.icon}</span><div><b>${f.name}</b><div class="small muted">${lvl ? `Level ${lvl} / ${f.levels.length}` : 'Not built'}</div></div></div>
          <p class="small">${f.desc}</p>${lvl ? `<p class="small good">${this.facilityEffect(id, f.levels[lvl - 1])}</p>` : ''}
          ${next ? `<div class="small">${lvl ? 'Upgrade' : 'Build'}: ${Game.costText(next.cost)} · ${next.days} day${next.days === 1 ? '' : 's'}${lvl ? ` → ${this.facilityEffect(id, next)}` : ''}</div>
          <button class="btn small" data-act="build" data-id="${id}"${blocker ? ` disabled title="${esc(blocker)}"` : ''}>${lvl ? 'Upgrade' : 'Build'}</button>${blocker && blocker !== 'Fully built' ? `<div class="small muted">${esc(blocker)}</div>` : ''}` : ''}</div>`;
      }).join('')}</div></section>`;
    // The workshop.
    const gear = Object.entries(GEAR).map(([g, def]) => `${def.icon} ${def.name} ×${s.gear[g] || 0}`).join(' · ');
    html += `<section class="panel"><h2>🛠️ Workshop</h2><p class="small">Gear in store: ${gear}</p>
      ${Game.facilityLevel('workshop') ? `<div class="btn-row">${Object.entries(CRAFTS).map(([id, c]) => {
        const blocker = Game.craftBlocker(id);
        return `<button class="btn small" data-act="craft" data-id="${id}"${blocker ? ` disabled title="${esc(blocker)}"` : ''}>${c.icon} ${c.name} <span class="muted">(${Game.costText(c.cost)})</span></button>`;
      }).join('')}</div>` : '<p class="small muted">Build a workshop to make ammo, medkits and bombs.</p>'}</section>`;
    // The sick.
    const sick = people.filter(sv => sv.infected);
    if (sick.length) {
      html += `<section class="panel bad-panel"><h2>🦠 Blood Plague</h2>${sick.map(sv => {
        const blocker = Game.cureBlocker(sv.id);
        return `<p>${esc(sv.name)}: ${sv.infected} day${sv.infected === 1 ? '' : 's'} left. <button class="btn small" data-act="cure" data-id="${sv.id}"${blocker ? ` disabled title="${esc(blocker)}"` : ''}>Cure (💊 ${CURE_COST})</button> ${blocker ? `<span class="small muted">${esc(blocker)}</span>` : ''}</p>`;
      }).join('')}</section>`;
    }
    return html;
  },
  facilityEffect(id, lvl) {
    const parts = [];
    if (lvl.beds) parts.push(`${lvl.beds} beds`);
    if (lvl.food) parts.push(`+${lvl.food} food a day`);
    if (lvl.heal) parts.push(`injuries heal ${lvl.heal} day${lvl.heal > 1 ? 's' : ''} faster`);
    if (lvl.craft) parts.push(lvl.craft > 1 ? 'all recipes' : 'basic recipes');
    if (lvl.reveal) parts.push(`see ${lvl.reveal} further, ${lvl.sniper} lookout shot${lvl.sniper > 1 ? 's' : ''} a turn in a siege`);
    if (lvl.barricade) parts.push(`barricades of ${lvl.barricade}, −${lvl.threat} horde a day`);
    if (lvl.contact) parts.push(`${Math.round(lvl.contact * 100)}% chance a day of a call for help`);
    return parts.join(', ');
  },

  // --- The survivors ---
  peopleView() {
    const s = Game.state;
    const armory = Object.entries(s.armory).map(([w, n]) => `${WEAPONS[w].icon} ${WEAPONS[w].name} ×${n}`).join(' · ') || 'empty';
    let html = `<section class="panel"><h2>🔫 Armory</h2><p class="small">${armory}</p></section><div class="cards">`;
    for (const sv of Game.alive()) {
      const spec = SPECIALTIES[sv.spec];
      const status = sv.infected ? `<span class="bad">🦠 Blood Plague (${sv.infected} days)</span>` : sv.injured ? `<span class="warn">🩸 Injured (${sv.injured} days)</span>` : '<span class="good">Ready</span>';
      const options = (slot, cur) => {
        const kinds = Object.keys(WEAPONS).filter(w => WEAPONS[w].type === (slot === 'gun' ? 'gun' : 'melee') && (s.armory[w] > 0 || w === cur));
        return `<select data-equip="${sv.id}" data-slot="${slot}"><option value="">${slot === 'gun' ? 'No gun' : 'Fists'}</option>${kinds.map(w => `<option value="${w}"${w === cur ? ' selected' : ''}>${WEAPONS[w].icon} ${WEAPONS[w].name}</option>`).join('')}</select>`;
      };
      const next = RANK_XP[sv.level];
      html += `<div class="card"><div class="card-head"><span class="big">${spec.icon}</span><div><b>${esc(sv.name)}</b><div class="small muted">${spec.name} · ${RANKS[sv.level - 1]}${next ? ` (${sv.xp}/${next} xp)` : ''}</div></div></div>
        <div class="small">❤️ ${sv.hp}/${Game.maxHp(sv)} · 🎯 ${Game.aim(sv)} aim · 👟 ${Game.move(sv)} move · 💀 ${sv.kills} kills · ${sv.missions} missions</div>
        <div class="small">${status}</div><div class="small muted">${spec.desc}</div>
        <div class="equip">${options('gun', sv.gun)}${options('melee', sv.melee)}</div></div>`;
    }
    html += '</div>';
    const lost = s.survivors.filter(sv => sv.status === 'dead' || sv.status === 'gone');
    if (lost.length) html += `<section class="panel"><h2>🕯️ The lost</h2><p class="small muted">${lost.map(sv => `${esc(sv.name)} (${sv.status === 'dead' ? 'dead' : 'left'})`).join(', ')}</p></section>`;
    return html;
  },

  // --- The region ---
  mapView() {
    const s = Game.state;
    let svg = '<svg class="region" viewBox="0 0 1000 700"><rect width="1000" height="700" class="ground"/><path class="road" d="M0 350 H1000 M500 0 V700 M200 230 L500 350 L880 120 M250 560 L500 350 L820 500"/>';
    svg += `<circle cx="${BASE_SITE.x}" cy="${BASE_SITE.y}" r="${START_REVEAL + (Game.facility('watchtower').reveal || 0)}" class="sight"/>`;
    for (const [id, site] of Object.entries(SITES)) {
      const st = s.sites[id];
      if (!st.known) continue;
      const type = SITE_TYPES[site.type];
      const sel = this.mapSel === id;
      svg += `<g class="site${sel ? ' sel' : ''}${st.infested ? ' infested' : ''}${!st.stock ? ' empty' : ''}" data-act="site" data-id="${id}">
        <circle cx="${site.x}" cy="${site.y}" r="30"/><text x="${site.x}" y="${site.y + 10}" class="icon">${type.icon}</text>
        ${st.infested ? `<text x="${site.x + 24}" y="${site.y - 18}" class="icon small-icon">🫀</text>` : ''}
        ${s.contacts.some(c => c.site === id) ? `<text x="${site.x - 34}" y="${site.y - 18}" class="icon small-icon">📻</text>` : ''}
        <text x="${site.x}" y="${site.y + 50}" class="label">${esc(site.name)}</text></g>`;
    }
    svg += `<g class="site base"><circle cx="${BASE_SITE.x}" cy="${BASE_SITE.y}" r="34"/><text x="${BASE_SITE.x}" y="${BASE_SITE.y + 12}" class="icon">${BASE_SITE.icon}</text><text x="${BASE_SITE.x}" y="${BASE_SITE.y + 56}" class="label">${BASE_SITE.name}</text></g></svg>`;
    return `<section class="panel"><p class="small muted">Tap a place to plan a mission. One mission a day; the further away, the more fuel it takes.</p>${svg}</section>${this.mapSel ? this.missionPlanner(this.mapSel) : ''}`;
  },
  missionPlanner(id) {
    const s = Game.state;
    const site = SITES[id];
    const st = s.sites[id];
    const type = SITE_TYPES[site.type];
    const kinds = Game.missionKinds(id);
    const names = { scavenge: '📦 Scavenge', clear: '🫀 Destroy the Plague Heart', rescue: '📻 Rescue', hive: '🔥 Destroy the Hive' };
    if (!kinds.includes(this.plan.kind)) this.plan.kind = kinds[0] || null;
    const squad = this.plan.squad.map(i => Game.survivor(i)).filter(Boolean);
    const blocker = this.plan.kind ? Game.missionBlocker(id, this.plan.kind, squad) : 'Nothing to do there';
    return `<section class="panel"><h2>${type.icon} ${esc(site.name)}</h2>
      <p class="small">${type.name} · danger <span class="bad">${stars(type.danger + (st.infested ? 1 : 0))}</span> · ${st.stock ? `${st.stock} more scavenging run${st.stock > 1 ? 's' : ''} worth of supplies` : 'picked clean'} · ⛽ ${Game.fuelCost(id)} fuel</p>
      <p class="small muted">Might hold: ${Object.keys(type.loot).map(r => RESOURCES[r].icon).join(' ')}${type.weapons.length ? ` and weapons` : ''}.${type.raiders ? ' Raiders have been seen here.' : ''}${st.infested ? ' <span class="bad">A Plague Heart has taken root here.</span>' : ''}</p>
      ${kinds.length ? `<div class="btn-row">${kinds.map(k => `<button class="btn small${this.plan.kind === k ? ' on' : ''}" data-act="kind" data-kind="${k}">${names[k]}</button>`).join('')}</div>` : '<p class="small muted">Nothing left to do here.</p>'}
      <h3>Squad <span class="muted small">${squad.length} / ${SQUAD_SIZE}</span></h3>
      <div class="pick">${Game.ready().map(sv => `<button class="chip${this.plan.squad.includes(sv.id) ? ' on' : ''}" data-act="squad" data-id="${sv.id}">${SPECIALTIES[sv.spec].icon} ${esc(sv.name.split(' ')[0])} <span class="muted">❤️${sv.hp} ${sv.gun ? WEAPONS[sv.gun].icon : ''}${WEAPONS[sv.melee] ? WEAPONS[sv.melee].icon : '✊'}</span></button>`).join('') || '<span class="small muted">Nobody is fit to go.</span>'}</div>
      <h3>Gear</h3><div class="pick">${Object.entries(GEAR).map(([g, def]) => `<span class="chip">${def.icon} ${def.name} <button class="mini" data-act="gear" data-gear="${g}" data-step="-1">−</button> ${this.plan.gear[g] || 0} / ${s.gear[g] || 0} <button class="mini" data-act="gear" data-gear="${g}" data-step="1">+</button></span>`).join('')}</div>
      <p class="small muted">The squad shares the base's ammo (${s.resources.ammo}) for reloads.</p>
      <button class="btn primary" data-act="launch"${blocker ? ' disabled' : ''}>Go</button> ${blocker ? `<span class="small muted">${esc(blocker)}</span>` : ''}</section>`;
  },
  logView() {
    return `<section class="panel"><h2>📜 Log</h2>${Game.state.log.map(l => `<div class="logline ${l.kind}"><span class="muted">Day ${l.day}</span> ${esc(l.msg)}</div>`).join('')}
      <p><button class="btn small danger" data-act="new-game">Start a new game</button> <span class="small muted">v${GAME_VERSION}</span></p></section>`;
  },

  // --- The battle ---
  battleView(b) {
    const u = this.unit(b);
    const vis = Tactics.visible(b);
    const title = b.kind === 'defend' ? `⛪ The siege of ${BASE_SITE.name}` : `${SITE_TYPES[SITES[b.siteId].type].icon} ${SITES[b.siteId].name}`;
    let reach = new Map();
    if (u && this.mode === 'move' && !b.result) reach = Tactics.reach(b, u, u.move * Math.min(2, u.ap));
    const target = this.target ? this.unitById(b, this.target) : null;
    const iso = Game.state.view !== 'flat';
    let grid = '';
    for (let y = 0; y < b.h; y++) {
      for (let x = 0; x < b.w; x++) {
        const key = `${x},${y}`;
        const t = Tactics.tile(b, x, y);
        const seen = vis.has(key);
        const cls = ['tile', { '#': 'wall', c: 'cover', x: 'exit', b: 'barricade', '.': 'floor' }[t]];
        if (!seen) cls.push('fog');
        const steps = reach.get(key);
        if (steps) cls.push(steps <= u.move ? 'reach1' : 'reach2');
        if ((this.mode === 'bomb' || this.mode === 'flare') && u && Tactics.canThrow(b, u, x, y)) cls.push('throwable');
        let inner = '';
        const crate = Tactics.crateAt(b, x, y);
        // In the isometric view, walls, cars, crates and barricades are raised blocks.
        if (iso && t === '#') inner = this.block('wall', '');
        if (iso && t === 'c') inner = this.block('car', '🚗');
        if (crate) inner = iso ? (crate.open ? this.block('crate open', '') : this.block('crate', '📦')) : `<span class="obj">${crate.open ? '▫️' : '📦'}</span>`;
        if (t === 'b') inner = iso ? this.block('barricade', `<span class="hpnum">${b.barricades[key]}</span>`) : `<span class="obj">🚧</span><span class="hpnum">${b.barricades[key]}</span>`;
        if (b.flare && b.flare.x === x && b.flare.y === y) inner += iso ? '<span class="stand"><span class="obj">🎆</span></span>' : '<span class="obj">🎆</span>';
        const unit = Tactics.unitAt(b, x, y);
        if (unit && (unit.side === 'p' || seen)) {
          const def = unit.side === 'e' ? ENEMIES[unit.type] : null;
          const ucls = ['unit', unit.side === 'p' ? 'friend' : 'foe'];
          if (unit.id === this.sel) ucls.push('selected');
          if (unit.downed) ucls.push('downed');
          if (unit.dormant) ucls.push('dormant');
          if (unit.waiting) ucls.push('waiting');
          if (target && target.id === unit.id) ucls.push('targeted');
          const chance = unit.side === 'e' && u && !b.result ? this.chanceLabel(b, u, unit) : '';
          const token = `<span class="${ucls.join(' ')}" title="${esc(unit.name)}">${unit.downed ? '🩸' : unit.icon}${unit.overwatch ? '<i class="ow">👁</i>' : ''}<span class="hpbar"><span style="width:${Math.max(0, unit.hp / unit.maxHp * 100)}%"></span></span>${chance}</span>`;
          // Standing figures face the camera; a ring on the floor marks the selected one.
          inner = iso ? `${inner}<span class="ring ${ucls.slice(1).join(' ')}"></span><span class="stand">${token}</span>` : token;
        }
        grid += `<div class="${cls.join(' ')}" role="button" data-act="tile" data-x="${x}" data-y="${y}">${inner}</div>`;
      }
    }
    const bag = Object.entries(b.bag.resources).filter(([, n]) => n).map(([r, n]) => `${RESOURCES[r].icon}${n}`).concat(b.bag.weapons.map(w => WEAPONS[w].icon)).join(' ') || '—';
    const noise = Math.round(b.noise / NOISE_PER_SPAWN * 100);
    return `<section class="battle">
      <div class="bhead"><b>${title}</b> <span class="muted small">turn ${b.turn}</span>
        <span class="view-toggle">${iso ? `<button class="btn small" data-act="zoom" data-step="-1" title="Zoom out">−</button><button class="btn small" data-act="zoom" data-step="1" title="Zoom in">＋</button> ` : ''}<button class="btn small" data-act="view" title="Switch between the isometric and the flat view">${iso ? '▦ Flat' : '🧊 Isometric'}</button></span>
        <div class="small">${esc(Tactics.objective(b))}</div>
        <div class="small">🔫 ammo ${b.ammo} · ${Object.entries(GEAR).map(([g, def]) => `${def.icon}${b.gear[g] || 0}`).join(' ')} · 🎒 ${bag} · <span title="Gunfire draws more of the dead">🔊 noise <span class="meter inline"><span class="fill" style="width:${Math.min(100, noise)}%"></span></span></span>${b.waves ? ` · 📯 ${b.waves.left} waves left` : ''}</div></div>
      ${iso ? `<div class="iso-wrap" id="iso-wrap"><div class="iso-sizer" style="${this.isoSize(b)}"><div class="grid iso" style="--cols:${b.w}">${grid}</div></div></div>` : `<div class="grid flat" style="--cols:${b.w}">${grid}</div>`}
      ${b.result ? this.resultPanel(b) : this.actionPanel(b, u, target)}
      <div class="blog">${b.log.slice(0, 8).map(l => `<div>${esc(l)}</div>`).join('')}</div></section>`;
  },
  // A raised block with a top and the two sides that face the camera.
  block(kind, top) {
    return `<span class="block ${kind}"><i class="fs"></i><i class="fw"></i><i class="top">${top}</i></span>`;
  },
  // Zoom for the isometric view: fitted to the screen at 1, bigger and scrollable above that.
  zoom() {
    return Game.state.zoom || (window.innerWidth < 600 ? 1.6 : 1);
  },
  // Tile size and room for the tilted grid.
  isoSize(b) {
    const avail = Math.min(document.getElementById('main').clientWidth || window.innerWidth, 980) - 12;
    const fit = Math.max(14, Math.min(46, Math.floor(avail / ((b.w + b.h) * Math.SQRT1_2))));
    const t = Math.round(fit * this.zoom());
    const w = Math.round((b.w + b.h) * t * Math.SQRT1_2 + t);
    const h = Math.round((b.w + b.h) * t * Math.SQRT1_2 * 0.5 + t * 1.8);
    return `--t:${t}px;--rows:${b.h};width:${w}px;height:${h}px`;
  },
  // Keep the selected survivor in view when the map is bigger than the screen.
  scrollToSelected(b) {
    const wrap = document.getElementById('iso-wrap');
    const u = this.unit(b);
    if (!wrap || !u || wrap.scrollWidth <= wrap.clientWidth + 2) return;
    const sizer = wrap.firstElementChild;
    const t = parseFloat(getComputedStyle(sizer).getPropertyValue('--t'));
    const lx = (u.x + 0.5) * t - b.w * t / 2, ly = (u.y + 0.5) * t - b.h * t / 2;
    const sx = Math.SQRT1_2 * (lx + ly), sy = Math.SQRT1_2 * (ly - lx) * 0.5 + t * 0.45;
    wrap.scrollLeft = sizer.offsetWidth / 2 + sx - wrap.clientWidth / 2;
    wrap.scrollTop = sizer.offsetHeight / 2 + sy - wrap.clientHeight / 2;
  },
  chanceLabel(b, u, e) {
    if (this.mode === 'move' || this.mode === 'shoot') {
      if (Tactics.manhattan(u, e) === 1) return `<i class="pct melee">${Tactics.meleeChance(u)}%</i>`;
      if (Tactics.canShoot(b, u, e)) return `<i class="pct">${Tactics.shotChance(b, u, e)}%</i>`;
    }
    return '';
  },
  actionPanel(b, u, target) {
    if (!u) return `<div class="actions"><p class="small">No one can act. </p><button class="btn primary" data-act="end-turn">End turn ▶</button></div>`;
    const gun = Tactics.gunOf(u);
    const btn = (act, label, ok, extra = '') => `<button class="btn small${extra}" data-act="${act}"${ok ? '' : ' disabled'}>${label}</button>`;
    const mode = (m, label, ok) => `<button class="btn small${this.mode === m ? ' on' : ''}" data-act="mode" data-mode="${m}"${ok ? '' : ' disabled'}>${label}</button>`;
    let attack = '';
    if (target && target.hp > 0) {
      attack = `<div class="attack">🎯 ${target.icon} <b>${esc(target.name)}</b> ❤️ ${target.hp}/${target.maxHp}${ENEMIES[target.type].desc ? ` <span class="muted small">${esc(ENEMIES[target.type].desc)}</span>` : ''}<br>
        ${gun ? btn('fire', `Shoot ${Tactics.canShoot(b, u, target) ? `${Tactics.shotChance(b, u, target)}%` : ''}${gun.noise ? ' 🔊' : ' 🤫'}`, Tactics.canShoot(b, u, target), ' primary') : ''}
        ${btn('strike', `Melee ${Tactics.canMelee(b, u, target) ? `${Tactics.meleeChance(u)}%` : '(get next to it)'} 🤫`, Tactics.canMelee(b, u, target))}</div>`;
    }
    const crate = Tactics.adjacentCrate(b, u);
    const downedNear = Tactics.players(b).some(p => p.downed && Tactics.manhattan(p, u) === 1);
    return `<div class="actions">
      <div class="who">${u.icon} <b>${esc(u.name)}</b> ❤️ ${u.hp}/${u.maxHp} · ${'●'.repeat(u.ap)}${'○'.repeat(2 - u.ap)} actions · ${gun ? `${gun.icon} ${gun.name} ${u.clip}/${gun.clip}` : 'no gun'} · ${Tactics.meleeOf(u).icon} ${Tactics.meleeOf(u).name}</div>
      <div class="small muted">${this.mode === 'move' ? 'Tap a blue tile to move (1 action) or a yellow one to run (2). Tap an enemy to attack it.' : this.mode === 'bomb' ? 'Tap where to throw the pipe bomb.' : this.mode === 'flare' ? 'Tap where to throw the flare.' : this.mode === 'heal' ? 'Tap yourself or someone next to you.' : ''}${downedNear ? ' Tap a downed friend next to you to get them up.' : ''}</div>
      ${attack}
      <div class="btn-row">
        ${btn('reload', '🔄 Reload', gun && u.clip < gun.clip && b.ammo > 0)}
        ${btn('overwatch', '👁 Overwatch', gun && u.clip > 0)}
        ${btn('search', '📦 Search', !!crate)}
        ${mode('heal', `🩹 Heal (${b.gear.medkit || 0})`, b.gear.medkit > 0)}
        ${mode('bomb', `💣 Bomb (${b.gear.pipe_bomb || 0})`, b.gear.pipe_bomb > 0)}
        ${mode('flare', `🎆 Flare (${b.gear.flare || 0})`, b.gear.flare > 0)}
        ${b.kind === 'defend' ? '' : btn('extract', '🚪 Leave', Tactics.canExtract(b, u))}
      </div>
      <div class="btn-row">${btn('next', '⏭ Next survivor', this.controllable(b).length > 1)}<button class="btn primary" data-act="end-turn">End turn ▶</button></div></div>`;
  },
  resultPanel(b) {
    return `<div class="actions result ${b.result}"><h2>${b.result === 'won' ? '✅ Done' : '❌ Failed'}</h2>
      <p class="small">${b.kind === 'defend' ? (b.result === 'won' ? 'The walls held.' : 'The walls fell.') : b.result === 'won' ? 'Everyone still standing is out.' : 'The objective was not met, or no one made it out.'}</p>
      <button class="btn primary" data-act="leave-battle">Back to Grace Hill</button></div>`;
  },

  // --- Pop-ups ---
  showModal(html) {
    document.getElementById('modal').innerHTML = `<div class="modal-box">${html}<div class="btn-row"><button class="btn" data-act="close-modal">OK</button></div></div>`;
  },
  closeModal() {
    document.getElementById('modal').innerHTML = '';
  },
  showIntro() {
    document.getElementById('modal').innerHTML = `<div class="modal-box"><h1>Holdout</h1>${INTRO.map(p => `<p>${esc(p)}</p>`).join('')}
      <h3>How to play</h3><ul class="small">
      <li>Each day, send up to ${SQUAD_SIZE} survivors on one mission, build at the base, then end the day.</li>
      <li>Missions are turn-based: every survivor has two actions. Moving, reloading and searching take one; shooting ends their turn.</li>
      <li>Cover (cars, crates, walls) makes you harder to hit. Gunfire is loud and draws more of the dead; melee is quiet.</li>
      <li>Everyone eats every day. Noise and plague hearts bring the horde closer. When it comes, defend the walls.</li>
      <li>Find and destroy the Hive to win.</li></ul>
      <div class="btn-row"><button class="btn primary" data-act="intro-done">Begin</button></div></div>`;
  },
  showDefense() {
    const ready = Game.alive().filter(sv => sv.status === 'ready');
    document.getElementById('modal').innerHTML = `<div class="modal-box defend"><h2>📯 The horde is here</h2><p>The dead are coming up Grace Hill. Who stands on the walls? Everyone not chosen hides in the crypt.</p>
      ${ready.map(sv => `<label class="pickrow"><input type="checkbox" data-defender="${sv.id}"${sv.injured ? '' : ' checked'}> ${SPECIALTIES[sv.spec].icon} ${esc(sv.name)} <span class="muted small">❤️ ${sv.hp}/${Game.maxHp(sv)}${sv.injured ? ' · injured' : ''}</span></label>`).join('')}
      <div class="btn-row"><button class="btn primary" data-act="defend">Man the walls</button></div></div>`;
  },
};
