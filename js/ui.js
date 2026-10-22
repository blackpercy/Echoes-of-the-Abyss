// User interface: renders pages and the world map, updates meters every frame and handles clicks.

const fmt = n => Math.floor(n).toLocaleString('en-GB');
const secs = ms => (ms / 1000).toFixed(1) + 's';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function itemChip(id, qty, cls = '') {
  return `<span class="chip ${cls}" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${qty} × ${esc(ITEMS[id].name)}</span>`;
}

function bar(id, cls, pct, label = '') {
  return `<div class="bar ${cls}"><div class="fill" id="${id}" style="width:${pct}%"></div><span class="bar-label" id="${id}-label">${label}</span></div>`;
}

function statLine(item) {
  const names = { hit: 'to hit', dmg: 'damage', ac: 'AC', ward: 'to sanity saves', slots: 'pack slots' };
  const parts = item.dice ? [`${item.dice} damage`] : [];
  for (const [k, v] of Object.entries(item.stats || {})) parts.push(`${withSign(v)} ${names[k]}`);
  return parts.join(', ');
}

function reqLine(req) {
  return Object.entries(req || {}).map(([s, l]) => `${SKILLS[s].name} ${l}`).join(', ');
}

function locLink(id) {
  return `<a href="#" class="loc-link" data-act="map-select" data-loc="${id}">${LOCATIONS[id].icon} ${esc(LOCATIONS[id].name)}</a>`;
}

const KIND_NAMES = { town: 'Settlement', wild: 'Wilderness', dungeon: 'Dungeon' };

const UI = {
  page: 'chronicle',
  selectedItem: null,
  selectedBankItem: null,
  mapSelected: null,
  dirty: true,
  lastRender: 0,

  init() {
    document.body.addEventListener('click', e => this.onClick(e));
    document.body.addEventListener('change', e => this.onChange(e));
    Game.listeners.push(type => {
      if (type === 'reset') this.page = 'chronicle';
      this.dirty = true;
    });
    this.renderAll();
  },

  // --- Clicks ---
  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    e.preventDefault();
    const d = el.dataset;
    switch (d.act) {
      case 'nav':
        this.page = d.page;
        this.selectedItem = null;
        this.selectedBankItem = null;
        document.body.classList.remove('nav-open');
        break;
      case 'toggle-nav': document.body.classList.toggle('nav-open'); return;
      case 'action': Game.startAction(d.skill, d.id); break;
      case 'stop': Game.stop(); break;
      case 'fight': Game.startCombat(d.monster); break;
      case 'stance': Game.setStance(d.stance); break;
      case 'eat': if (!Game.eat()) Game.log('You cannot eat right now.', 'warn'); break;
      case 'use': Game.use(d.item); break;
      case 'select': this.selectedItem = d.item; break;
      case 'select-bank': this.selectedBankItem = d.item; break;
      case 'sell': Game.sell(d.item, d.qty === 'all' ? Game.count(d.item) : +d.qty); break;
      case 'equip': Game.equip(d.item); break;
      case 'unequip': Game.unequip(d.slot); break;
      case 'food': Game.setFood(d.item); break;
      case 'drop': if (confirm(`Leave all your ${ITEMS[d.item].name} behind?`)) Game.drop(d.item); break;
      case 'deposit': Game.deposit(d.item); break;
      case 'deposit-all': Game.depositAll(); break;
      case 'withdraw': Game.withdraw(d.item, d.qty === 'all' ? Game.bankCount(d.item) : +d.qty); break;
      case 'buy': Game.buy(d.item, +d.qty); break;
      case 'map-select':
        this.mapSelected = d.loc;
        this.page = 'map';
        document.body.classList.remove('nav-open');
        break;
      case 'travel': Game.travelTo(d.loc); break;
      case 'save': Game.save(); Game.log('Game saved.', 'good'); break;
      case 'export': {
        const box = document.getElementById('save-text');
        box.value = Game.exportSave();
        box.select();
        break;
      }
      case 'import':
        try {
          Game.importSave(document.getElementById('save-text').value);
          Game.log('Save imported.', 'good');
        } catch (err) {
          Game.log('That save could not be read.', 'bad');
        }
        break;
      case 'reset':
        if (confirm('Erase everything and start over? This cannot be undone.')) Game.reset();
        break;
      case 'close-modal': document.getElementById('modal').innerHTML = ''; break;
      case 'intro-done':
        Game.state.seenIntro = true;
        document.getElementById('modal').innerHTML = '';
        this.page = 'here';
        break;
    }
    this.dirty = true;
  },
  onChange(e) {
    if (e.target.id === 'food-select') {
      Game.setFood(e.target.value);
      e.target.blur();
    }
  },

  // --- Rendering ---
  renderAll() {
    this.renderNav();
    this.renderPage();
    this.renderLog();
    this.dirty = false;
  },

  frame(now) {
    // The page is rebuilt at most four times a second; meters update every frame.
    // An open dropdown would close on rebuild, so wait until it is released.
    const selectOpen = document.activeElement && document.activeElement.tagName === 'SELECT';
    if (this.dirty && !selectOpen) {
      if (this.page === 'settings') {
        this.renderNav();
        this.renderLog();
        this.dirty = false;
      } else if (now - this.lastRender > 250) {
        this.lastRender = now;
        this.renderAll();
      }
    }
    this.updateMeters();
  },

  renderNav() {
    const s = Game.state;
    const here = Game.here();
    const navBtn = (page, icon, name, extra = '', dim = false) => {
      const active = this.page === page || (page === 'character' && SKILLS[this.page]) ? ' active' : '';
      const busy = (page === 'here' && s.action) || (page === 'combat' && s.combat) || (page === 'map' && s.travel) ? ' busy' : '';
      return `<button class="nav-btn${active}${busy}${dim ? ' dim' : ''}" data-act="nav" data-page="${page}"><span class="nav-icon">${icon}</span><span class="nav-name">${name}</span><span class="nav-extra">${extra}</span></button>`;
    };
    let html = `<div class="nav-group"><div class="nav-title">You are at</div>${navBtn('here', here.icon, esc(here.name))}${navBtn('map', '🗺️', 'World Map')}${navBtn('combat', '⚔️', 'Combat', '', !s.combat && !(here.monsters || []).length)}</div>`;
    html += `<div class="nav-group"><div class="nav-title">Yourself</div>${navBtn('pack', '🎒', 'Pack', `${Game.usedSlots()} / ${Game.capacity()}`)}${navBtn('character', '🧝', 'Character & Skills')}</div>`;
    const services = [];
    if (here.bank) services.push(navBtn('bank', '🏦', 'Bank'));
    if (here.shop) services.push(navBtn('shop', '🛒', esc(SHOPS[here.shop].name)));
    if (services.length) html += `<div class="nav-group"><div class="nav-title">In ${esc(here.name)}</div>${services.join('')}</div>`;
    html += `<div class="nav-group"><div class="nav-title">Other</div>${navBtn('chronicle', '📜', 'Journal')}${navBtn('settings', '⚙️', 'Settings')}</div>`;
    document.getElementById('nav').innerHTML = html;
  },

  renderLog() {
    document.getElementById('log').innerHTML = Game.state.log
      .slice(0, 30)
      .map(l => `<div class="log-line ${l.kind}">${esc(l.msg)}</div>`)
      .join('');
  },

  renderPage() {
    const main = document.getElementById('page');
    const scroll = main.scrollTop;
    const pages = {
      chronicle: () => this.pageChronicle(),
      map: () => this.pageMap(),
      here: () => this.pageHere(),
      combat: () => this.pageCombat(),
      character: () => this.pageCharacter(),
      pack: () => this.pagePack(),
      bank: () => this.pageBank(),
      shop: () => this.pageShop(),
      settings: () => this.pageSettings(),
    };
    main.innerHTML = pages[this.page] ? pages[this.page]() : this.pageSkill(this.page);
    main.scrollTop = scroll;
  },

  // --- Location summaries (used by the map panel and the "here" page) ---
  locationFeatures(id) {
    const loc = LOCATIONS[id];
    const rows = [];
    for (const [skill, actions] of Object.entries(loc.gather || {})) {
      rows.push(`<div><b>${SKILLS[skill].icon} ${SKILLS[skill].name}:</b> ${actions.map(a => {
        const act = findAction(skill, a);
        return `${ITEMS[Object.keys(act.output)[0]].icon} ${esc(act.name)} <span class="muted">(${act.level})</span>`;
      }).join(', ')}</div>`);
    }
    if ((loc.stations || []).length) rows.push(`<div><b>Workplaces:</b> ${loc.stations.map(st => `${STATIONS[st].icon} ${STATIONS[st].name}`).join(', ')}</div>`);
    const services = [];
    if (loc.bank) services.push('🏦 Bank');
    if (loc.shop) services.push(`🛒 ${esc(SHOPS[loc.shop].name)}`);
    if (loc.inn) services.push(`🛏️ Rest at ${esc(loc.inn)}`);
    if (services.length) rows.push(`<div><b>Services:</b> ${services.join(', ')}</div>`);
    if ((loc.monsters || []).length) rows.push(`<div><b>Enemies:</b> ${loc.monsters.map(m => `${MONSTERS[m].icon} ${MONSTERS[m].name}`).join(', ')}</div>`);
    return rows.join('');
  },

  routeInfo(target) {
    if (target === Game.state.location) return '<p class="good-text">📍 You are here.</p>';
    const route = Game.findRoute(target);
    if (!route) {
      const blocked = roadsFrom(target).map(({ road }) => Game.roadBlocker(road)).filter(Boolean);
      return `<p class="lack-text">🔒 No route with what you carry.${blocked.length ? ' ' + esc(blocked[0]) + '.' : ''}</p>`;
    }
    const via = route.path.slice(1, -1).map(l => LOCATIONS[l].name);
    const travelling = Game.state.travel && Game.state.travel.path[Game.state.travel.path.length - 1] === target;
    return `<p>🧭 ${route.time}s on the road${route.cost ? ` · 💰 ${route.cost} gold` : ''}${via.length ? `<br><span class="muted small">Via ${via.map(esc).join(' → ')}</span>` : ''}</p>
      <button class="btn" data-act="travel" data-loc="${target}"${travelling ? ' disabled' : ''}>${travelling ? 'Travelling…' : 'Travel here'}</button>`;
  },

  // --- Pages ---
  pageChronicle() {
    let html = '<div class="lore"><h1>Echoes of the Abyss</h1>';
    html += LORE.map(p => `<p>${p}</p>`).join('');
    html += `<h2>How to play</h2><ul>
      <li>Open the <b>World Map</b> and travel between settlements and wild places. What you can do depends on <b>where you are</b>: each place has its own trees, fishing waters, ore veins, herbs, workplaces and enemies.</li>
      <li>It also depends on <b>what you carry</b>. Gathering needs the right tool in your pack. Some roads need special gear. Your pack has a limited number of slots, so leave what you do not need in a bank.</li>
      <li>Cooking needs a fire and alchemy needs a lab, unless you carry a tinderbox or alchemy kit. Smithing is only possible at a forge.</li>
      <li>Once you begin a task you keep at it until you stop, your pack is full or your materials run out, even while you are away from the game (up to 24 hours).</li>
      <li>Fights are settled with dice. You roll a d20 plus your bonus against the enemy's armour class, and damage comes from your weapon's dice. A natural 20 is a critical hit. You eat your chosen food when your health drops below 40%.</li>
      <li><b>Sanity.</b> When something from beyond wounds you, you make a sanity save. Fail it and you lose sanity. Occult study costs sanity too. At zero you flee in panic. Sanity recovers slowly at rest and quickly at an inn. Warding amulets help you keep it.</li>
      <li>The game saves automatically in your browser every ten seconds.</li>
    </ul></div>`;
    return html;
  },

  pageMap() {
    const s = Game.state;
    const sel = this.mapSelected || s.location;
    const route = sel !== s.location ? Game.findRoute(sel) : null;
    const routeEdges = new Set();
    if (route) for (let i = 0; i < route.path.length - 1; i++) routeEdges.add(findRoad(route.path[i], route.path[i + 1]));

    let svg = `<svg class="map" viewBox="0 0 1000 700" role="img" aria-label="World map">
      <defs>
        <radialGradient id="sea" cx="85%" cy="85%" r="60%"><stop offset="0%" stop-color="#05080d"/><stop offset="100%" stop-color="#0c1a22"/></radialGradient>
        <linearGradient id="land" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1d2421"/><stop offset="100%" stop-color="#161b18"/></linearGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#sea)"/>
      <path d="M0,0 L830,0 C810,120 760,260 760,360 C760,420 805,470 785,520 C765,580 705,620 690,700 L0,700 Z" fill="url(#land)" stroke="#2b3a36" stroke-width="3"/>
      <circle cx="860" cy="625" r="70" fill="#1a0f26" opacity=".6"/>
      <circle cx="220" cy="120" r="55" fill="#2a2338" opacity=".5"/>
      <g class="deco">
        <text x="120" y="470">▲</text><text x="180" y="430">▲</text><text x="240" y="390">▲</text><text x="90" y="520">▲</text><text x="330" y="560">▲</text><text x="60" y="420">▲</text>
        <text x="430" y="300">🌲</text><text x="510" y="290">🌲</text><text x="410" y="380">🌲</text><text x="520" y="380">🌲</text><text x="330" y="270">🌲</text><text x="40" y="230">🌳</text><text x="130" y="320">🌳</text>
        <text x="905" y="300" class="sea-text" transform="rotate(90 905 300)">The Black Sea</text>
      </g>`;
    for (const r of ROADS) {
      const a = LOCATIONS[r.a];
      const b = LOCATIONS[r.b];
      const blocked = Game.roadBlocker(r);
      const cls = routeEdges.has(r) ? 'road route' : blocked ? 'road blocked' : 'road';
      svg += `<line class="${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (blocked) svg += `<text class="road-mark" x="${mx}" y="${my}">🔒</text>`;
      else if (r.cost) svg += `<text class="road-mark" x="${mx}" y="${my}">⛵</text>`;
      svg += `<text class="road-time" x="${mx}" y="${my + 18}">${r.time}s</text>`;
    }
    for (const [id, loc] of Object.entries(LOCATIONS)) {
      const cls = ['node', loc.kind, id === s.location ? 'current' : '', id === sel ? 'selected' : ''].join(' ');
      svg += `<g class="${cls}" data-act="map-select" data-loc="${id}">
        <circle cx="${loc.x}" cy="${loc.y}" r="24"/>
        <text class="node-icon" x="${loc.x}" y="${loc.y + 1}">${loc.icon}</text>
        <text class="node-label" x="${loc.x}" y="${loc.y + 42}">${esc(loc.name)}</text>
      </g>`;
    }
    svg += '<circle id="map-player" r="8" cx="-50" cy="-50"/></svg>';

    const loc = LOCATIONS[sel];
    const panel = `<div class="map-panel">
      <h2>${loc.icon} ${esc(loc.name)}</h2>
      <div class="muted small">${KIND_NAMES[loc.kind]}${Game.state.visited[sel] ? '' : ' · not yet visited'}</div>
      <p>${esc(loc.desc)}</p>
      <div class="features small">${this.locationFeatures(sel)}</div>
      ${this.routeInfo(sel)}
      <div class="small muted roads">${roadsFrom(sel).map(({ road, to }) => `${locLink(to)} ${road.time}s${road.cost ? ` · ${road.cost} gold` : ''}${road.req ? ` · needs ${road.req.map(i => ITEMS[i].name).join(', ')}` : ''}`).join('<br>')}</div>
    </div>`;
    return `<h1>🗺️ The Kingdom of Aldmark</h1><div class="map-layout"><div class="map-wrap">${svg}</div>${panel}</div>`;
  },

  pageHere() {
    const s = Game.state;
    const id = s.location;
    const loc = LOCATIONS[id];
    let html = `<div class="skill-title"><span class="big-icon">${loc.icon}</span><div><h1>${esc(loc.name)}</h1><p class="muted">${KIND_NAMES[loc.kind]}</p></div></div><p>${esc(loc.desc)}</p>`;
    if (s.travel) {
      const t = Game.travelProgress();
      return html + `<p class="warning">🧭 You are on the road to ${esc(LOCATIONS[t.target].name)}.</p>`;
    }
    const gather = Object.entries(loc.gather || {});
    if (gather.length) {
      html += '<h2>Gather</h2><div class="cards">';
      for (const [skill, ids] of gather) for (const aid of ids) html += this.actionCard(skill, findAction(skill, aid));
      html += '</div>';
    }
    for (const st of Object.keys(STATIONS).filter(st => Game.hasStation(st))) {
      const portable = !(loc.stations || []).includes(st);
      const skills = Object.keys(ACTIONS).filter(sk => ACTIONS[sk].some(a => a.station === st));
      html += `<h2>${STATIONS[st].icon} ${STATIONS[st].name}${portable ? ` <span class="muted small">(your ${ITEMS[STATIONS[st].portable].name})</span>` : ''}</h2>`;
      for (const sk of skills) {
        const known = ACTIONS[sk].filter(a => a.station === st && Game.level(sk) >= a.level);
        html += `<p class="small muted">${SKILLS[sk].icon} ${SKILLS[sk].name} ${Game.level(sk)} · <a href="#" class="loc-link" data-act="nav" data-page="${sk}">all ${SKILLS[sk].name.toLowerCase()} recipes</a></p>`;
        html += known.length ? `<div class="cards">${known.map(a => this.actionCard(sk, a)).join('')}</div>` : '<p class="muted small">You know no recipes for this yet.</p>';
      }
    }
    const services = [];
    if (loc.bank) services.push('<button class="btn" data-act="nav" data-page="bank">🏦 Visit the bank</button>');
    if (loc.shop) services.push(`<button class="btn" data-act="nav" data-page="shop">🛒 ${esc(SHOPS[loc.shop].name)}</button>`);
    if (services.length) html += `<h2>Services</h2><div class="btn-row">${services.join('')}</div>`;
    if (loc.inn) html += `<p class="small good-text">🛏️ Resting at ${esc(loc.inn)}: health and sanity recover ${INN_REGEN_MULTIPLIER}× faster here. If you fall, you wake here.</p>`;
    if ((loc.monsters || []).length) {
      html += `<h2>Enemies</h2><div class="cards">${loc.monsters.map(m => this.monsterCard(m)).join('')}</div>`;
    }
    html += '<h2>Roads</h2><div class="cards">';
    for (const { road, to } of roadsFrom(id)) {
      const blocked = Game.roadBlocker(road);
      html += `<div class="card"><div class="card-name">${LOCATIONS[to].icon} ${esc(LOCATIONS[to].name)}</div>
        <div class="small">🧭 ${road.time}s${road.cost ? ` · 💰 ${road.cost} gold` : ''}</div>
        ${blocked ? `<div class="small lack-text">🔒 ${esc(blocked)}</div>` : ''}
        <button class="btn" data-act="travel" data-loc="${to}"${blocked ? ' disabled' : ''}>Travel</button></div>`;
    }
    return html + '</div>';
  },

  skillHeader(skill) {
    const xp = Game.state.skills[skill].xp;
    const lvl = Game.level(skill);
    const cur = XP_TABLE[lvl];
    const next = XP_TABLE[lvl + 1];
    const pct = lvl >= MAX_LEVEL ? 100 : ((xp - cur) / (next - cur)) * 100;
    const label = lvl >= MAX_LEVEL ? `${fmt(xp)} xp` : `${fmt(xp)} / ${fmt(next)} xp`;
    return `<div class="skill-header">
      <div class="skill-title"><span class="big-icon">${SKILLS[skill].icon}</span><div><h1>${SKILLS[skill].name}</h1><p class="muted">${SKILLS[skill].desc}</p></div></div>
      <div class="skill-level">Level <b>${lvl}</b> / ${MAX_LEVEL}</div>
      ${bar('xp-' + skill, 'xp', pct, label)}
    </div>`;
  },

  actionCard(skill, a) {
    const s = Game.state;
    if (Game.level(skill) < a.level) {
      return `<div class="card locked"><div class="card-icon">🔒</div><div class="card-name">${esc(a.name)}</div><div class="muted small">Requires level ${a.level}</div></div>`;
    }
    const active = s.action && s.action.skill === skill && s.action.id === a.id;
    const blocker = active ? null : Game.actionBlocker(skill, a);
    const outItem = ITEMS[Object.keys(a.output)[0]];
    let where = '';
    if (!active && !Game.availableHere(skill, a)) {
      const places = Game.whereAvailable(skill, a);
      const portable = a.station && STATIONS[a.station].portable;
      where = `<div class="small muted">Found at: ${places.map(locLink).join(', ')}${portable ? ` or anywhere with a ${ITEMS[portable].name}` : ''}</div>`;
    }
    return `<div class="card${active ? ' active' : ''}${blocker ? ' blocked' : ''}">
      <div class="card-icon">${outItem.icon}</div>
      <div class="card-name">${esc(a.name)}</div>
      ${a.desc ? `<div class="muted small">${esc(a.desc)}</div>` : ''}
      <div class="small">${secs(Game.actionTime(skill, a))} · ${a.xp} xp${a.sanityCost ? ` · <span class="sanity-text">−${a.sanityCost} sanity</span>` : ''}${a.station ? ` · ${STATIONS[a.station].icon} ${STATIONS[a.station].name}` : ''}</div>
      ${a.input ? `<div class="small">Uses: ${Object.entries(a.input).map(([id, q]) => `<span class="chip ${Game.count(id) >= q ? '' : 'lack'}">${ITEMS[id].icon} ${q} ${esc(ITEMS[id].name)} <span class="muted">(${fmt(Game.count(id))})</span></span>`).join(' ')}</div>` : ''}
      <div class="small">Makes: ${Object.entries(a.output).map(([id, q]) => itemChip(id, q)).join(' ')} <span class="muted">(carrying ${fmt(Game.count(outItem.id))})</span></div>
      ${where}
      ${blocker ? `<div class="small lack-text">${esc(blocker)}</div>` : ''}
      ${bar(`prog-${skill}-${a.id}`, 'progress', 0)}
      <button class="btn${active ? ' danger' : ''}" data-act="action" data-skill="${skill}" data-id="${a.id}"${blocker ? ' disabled' : ''}>${active ? 'Stop' : 'Start'}</button>
    </div>`;
  },

  pageSkill(skill) {
    let html = this.skillHeader(skill);
    if (TOOLS[skill]) {
      const tier = Game.toolTier(skill);
      html += `<p class="muted small">Tool: ${tier < 0 ? `<span class="lack-text">none, so you need a ${ITEMS[TOOLS[skill][0]].name} in your pack</span>` : `<b>${ITEMS[TOOLS[skill][tier]].name}</b>${TOOL_SPEEDUP[tier] ? ` (−${TOOL_SPEEDUP[tier] * 100}% time)` : ''}`}. Better tools are sold in the shops.</p>`;
    }
    if (skill === 'occultism') {
      html += '<p class="warning">👁️ Occult study costs sanity, and your sanity does not recover while you study. Every Occultism level beyond the first grants +1% damage against beings from beyond, and every five levels add +1 to your sanity saves.</p>';
    }
    html += `<div class="cards">${ACTIONS[skill].map(a => this.actionCard(skill, a)).join('')}</div>`;
    return html;
  },

  monsterCard(id) {
    const s = Game.state;
    const m = MONSTERS[id];
    const fighting = s.combat && s.combat.monster === id;
    return `<div class="card${fighting ? ' active' : ''}${m.eldritch ? ' eldritch' : ''}">
      <div class="card-icon">${m.icon}</div>
      <div class="card-name">${m.name}${m.boss ? ' <span class="boss">BOSS</span>' : ''}</div>
      <div class="small">❤️ ${m.hp} HP · 🛡️ AC ${m.ac} · ⚔️ ${withSign(m.hit)} to hit, ${m.dmg}</div>
      ${m.eldritch ? `<div class="small sanity-text">👁️ Sanity save DC ${m.eldritch.dc}, −${m.eldritch.loss} on a failure</div>` : ''}
      <div class="small muted">${m.xp} xp</div>
      <div class="small muted">Loot: ${m.drops.map(d => ITEMS[d.item].icon).join(' ')} · ${m.gold[0]}–${m.gold[1]} gold</div>
      <button class="btn" data-act="fight" data-monster="${id}"${fighting || s.travel ? ' disabled' : ''}>${fighting ? 'Fighting…' : 'Fight'}</button>
    </div>`;
  },

  pageCombat() {
    const s = Game.state;
    const here = Game.here();
    let html = '<h1>⚔️ Combat</h1>';
    if (s.combat) {
      const m = MONSTERS[s.combat.monster];
      const chance = chanceToHit(Game.attackBonus(), m.ac);
      const theirs = chanceToHit(m.hit, Game.armourClass());
      const food = s.food && ITEMS[s.food];
      const foods = Object.keys(s.pack).filter(id => ITEMS[id].type === 'food');
      const potions = Object.keys(s.pack).filter(id => ITEMS[id].type === 'potion');
      html += `<div class="combat">
        <div class="fighter">
          <h2>You</h2>
          ${bar('c-hp', 'hp', 0)}
          ${bar('c-sanity', 'sanity', 0)}
          ${bar('c-patk', 'progress', 0)}
          <div class="small">⚔️ ${withSign(Game.attackBonus())} to hit (<b>${Math.round(chance * 100)}%</b> vs AC ${m.ac}) · ${Game.damageText()} damage${m.eldritch && Game.eldritchBonus() ? ` <span class="sanity-text">+${Math.round(Game.eldritchBonus() * 100)}% vs eldritch</span>` : ''} · every ${secs(Game.playerStats().speed)}</div>
          <div class="small">🛡️ AC ${Game.armourClass()}${m.eldritch ? ` · 👁️ ${withSign(Game.wits())} to sanity saves` : ''}</div>
          <div class="style-row">Stance:
            ${Object.entries(STANCES).map(([id, st]) => `<button class="btn small${s.stance === id ? ' selected' : ''}" data-act="stance" data-stance="${id}" title="${st.desc}">${st.icon} ${st.name}</button>`).join('')}
          </div>
          <div class="style-row">Food:
            <select id="food-select">${foods.length ? '' : '<option>No food</option>'}${foods.map(id => `<option value="${id}"${id === s.food ? ' selected' : ''}>${ITEMS[id].name} (${fmt(s.pack[id])})</option>`).join('')}</select>
            <button class="btn small" data-act="eat">Eat${food ? ` (+${food.heal})` : ''}</button>
          </div>
          ${potions.length ? `<div class="style-row">Potions: ${potions.map(id => `<button class="btn small" data-act="use" data-item="${id}" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${esc(ITEMS[id].name)} (${fmt(s.pack[id])})</button>`).join('')}</div>` : ''}
          <button class="btn danger" data-act="stop">Flee</button>
        </div>
        <div class="fighter monster${m.eldritch ? ' eldritch' : ''}">
          <h2>${m.icon} ${m.name}${m.boss ? ' <span class="boss">BOSS</span>' : ''}</h2>
          ${bar('c-mhp', 'hp', 0)}
          ${bar('c-matk', 'progress enemy', 0)}
          <div class="small">🛡️ AC ${m.ac} · ⚔️ ${withSign(m.hit)} to hit (<b>${Math.round(theirs * 100)}%</b> vs you) · ${m.dmg} damage · every ${secs(m.speed)}</div>
          ${m.eldritch ? `<div class="small sanity-text">Each wound forces a sanity save (DC ${m.eldritch.dc}); failure costs ${m.eldritch.loss} sanity</div>` : ''}
          <div class="small muted">Slain: ${fmt(s.kills[s.combat.monster] || 0)}</div>
          <div class="combat-log" id="combat-log">${s.combat.log.map(l => `<div>${esc(l)}</div>`).join('')}</div>
        </div>
      </div>`;
    }
    if ((here.monsters || []).length) {
      html += `<h2>${here.icon} Enemies at ${esc(here.name)}</h2><div class="cards">${here.monsters.map(m => this.monsterCard(m)).join('')}</div>`;
    } else {
      const grounds = Object.keys(LOCATIONS).filter(id => (LOCATIONS[id].monsters || []).length);
      html += `<p class="muted">Nothing here wants to fight you. Hunting grounds:</p><ul>${grounds.map(id => `<li>${locLink(id)}: ${LOCATIONS[id].monsters.map(m => MONSTERS[m].name).join(', ')}</li>`).join('')}</ul>`;
    }
    return html;
  },

  pageCharacter() {
    const s = Game.state;
    let html = '<h1>🧝 Character & Skills</h1><div class="two-col"><div><h2>Equipment</h2><div class="slots">';
    for (const [slot, name] of Object.entries(SLOTS)) {
      const item = s.equipment[slot];
      html += `<div class="slot"><div class="muted small">${name}</div>${item
        ? `<div>${ITEMS[item].icon} <b>${esc(ITEMS[item].name)}</b></div><div class="small">${statLine(ITEMS[item])}</div><button class="btn small" data-act="unequip" data-slot="${slot}">Unequip</button>`
        : '<div class="muted">Empty</div>'}</div>`;
    }
    html += `</div><h2>In a fight</h2><table class="stats">
      <tr><td>Hitpoints</td><td>${fmt(s.hp)} / ${Game.maxHp()}</td></tr>
      <tr><td>Sanity</td><td>${fmt(s.sanity)} / ${Game.maxSanity()}</td></tr>
      <tr><td>Proficiency</td><td>${withSign(Game.proficiency())}</td></tr>
      <tr><td>Attack roll</td><td>d20 ${withSign(Game.attackBonus())}</td></tr>
      <tr><td>Damage</td><td>${Game.damageText()}</td></tr>
      <tr><td>Armour class</td><td>${Game.armourClass()}</td></tr>
      <tr><td>Sanity save</td><td>d20 ${withSign(Game.wits())}</td></tr>
      <tr><td>Damage vs eldritch</td><td>+${Math.round(Game.eldritchBonus() * 100)}%</td></tr>
      <tr><td>Respawn point</td><td>${esc(LOCATIONS[s.home].name)}</td></tr>
    </table></div><div><h2>Skills</h2><table class="stats">`;
    for (const g of SKILL_GROUPS) {
      html += `<tr><td colspan="3" class="muted small">${g.name}</td></tr>`;
      for (const id of g.skills) {
        const lvl = Game.level(id);
        const pct = lvl >= MAX_LEVEL ? 100 : ((s.skills[id].xp - XP_TABLE[lvl]) / (XP_TABLE[lvl + 1] - XP_TABLE[lvl])) * 100;
        html += `<tr><td>${id === 'combat' ? `${SKILLS[id].icon} ${SKILLS[id].name}` : `<a href="#" class="loc-link" data-act="nav" data-page="${id}">${SKILLS[id].icon} ${SKILLS[id].name}</a>`}</td><td>${lvl}</td><td class="skill-mini"><div class="bar progress"><div class="fill" style="width:${pct}%"></div></div></td></tr>`;
      }
    }
    html += '</table>';
    const kills = Object.entries(s.kills);
    if (kills.length) {
      html += '<h2>Slain</h2><table class="stats">';
      for (const [id, n] of kills) html += `<tr><td>${MONSTERS[id].icon} ${MONSTERS[id].name}</td><td>${fmt(n)}</td></tr>`;
      html += '</table>';
    }
    return html + '</div></div>';
  },

  itemGrid(store, act, selected) {
    const ids = Object.keys(store);
    if (!ids.length) return '<p class="muted">Empty.</p>';
    return `<div class="bank-grid">${ids.map(id => `<button class="bank-item${id === selected ? ' selected' : ''}${id === Game.state.food ? ' food' : ''}" data-act="${act}" data-item="${id}" title="${esc(ITEMS[id].name)}"><span class="bank-icon">${ITEMS[id].icon}</span><span class="bank-qty">${fmt(store[id])}</span><span class="bank-name">${esc(ITEMS[id].name)}</span></button>`).join('')}</div>`;
  },

  pagePack() {
    const s = Game.state;
    const here = Game.here();
    const used = Game.usedSlots();
    const cap = Game.capacity();
    let html = `<h1>🎒 Pack</h1>${bar('pack-cap', 'xp', (used / cap) * 100, `${used} / ${cap} slots`)}
      <p class="muted small">Each kind of item takes one slot, however many you carry. A bag on your back adds slots.</p>`;
    const sel = this.selectedItem && s.pack[this.selectedItem] ? this.selectedItem : null;
    if (sel) {
      const it = ITEMS[sel];
      html += `<div class="item-detail"><div class="big-icon">${it.icon}</div><div>
        <h2>${esc(it.name)} <span class="muted">× ${fmt(s.pack[sel])}</span></h2>
        <p class="muted">${esc(it.desc)}</p>
        ${it.type === 'equipment' ? `<p class="small">${statLine(it)}${it.speed ? ` · attacks every ${secs(it.speed)}` : ''}</p>` : ''}
        ${it.req ? `<p class="small ${Game.meetsReq(sel) ? '' : 'lack-text'}">Requires: ${reqLine(it.req)}</p>` : ''}
        <div class="btn-row">
          ${it.type === 'equipment' ? `<button class="btn" data-act="equip" data-item="${sel}">Equip</button>` : ''}
          ${it.type === 'food' ? `<button class="btn" data-act="food" data-item="${sel}">${s.food === sel ? 'Chosen food ✓' : 'Choose as food'}</button><button class="btn" data-act="use" data-item="${sel}">Eat</button>` : ''}
          ${it.type === 'potion' ? `<button class="btn" data-act="use" data-item="${sel}">Drink</button>` : ''}
          ${here.bank ? `<button class="btn" data-act="deposit" data-item="${sel}">Deposit all</button>` : ''}
          ${here.shop ? `<button class="btn" data-act="sell" data-item="${sel}" data-qty="1">Sell 1 (${it.sell}g)</button><button class="btn" data-act="sell" data-item="${sel}" data-qty="all">Sell all (${fmt(it.sell * s.pack[sel])}g)</button>` : ''}
          <button class="btn danger" data-act="drop" data-item="${sel}">Drop</button>
        </div></div></div>`;
    }
    return html + this.itemGrid(s.pack, 'select', sel);
  },

  pageBank() {
    const s = Game.state;
    const here = Game.here();
    const banks = Object.keys(LOCATIONS).filter(id => LOCATIONS[id].bank);
    if (!here.bank) {
      return `<h1>🏦 Bank</h1><p class="muted">There is no bank at ${esc(here.name)}. Banks: ${banks.map(locLink).join(', ')}.</p>
        <h2>Stored items</h2>${this.itemGrid(s.bank, 'none', null)}`;
    }
    const sel = this.selectedBankItem && s.bank[this.selectedBankItem] ? this.selectedBankItem : null;
    let html = `<h1>🏦 Bank of ${esc(here.name)}</h1><p class="muted small">The banks of Aldmark share their vaults, so whatever you store can be withdrawn from any of them. Click an item in your pack to deposit it.</p>
      <div class="btn-row"><button class="btn" data-act="deposit-all">Deposit everything except tools and chosen food</button></div>
      <div class="two-col"><div><h2>Pack (${Game.usedSlots()} / ${Game.capacity()})</h2>${this.itemGrid(s.pack, 'deposit', null)}</div><div><h2>Vault</h2>`;
    if (sel) {
      html += `<div class="item-detail"><div class="big-icon">${ITEMS[sel].icon}</div><div><h2>${esc(ITEMS[sel].name)} <span class="muted">× ${fmt(s.bank[sel])}</span></h2>
        <div class="btn-row">${[1, 10, 100].map(q => `<button class="btn small" data-act="withdraw" data-item="${sel}" data-qty="${q}">Withdraw ${q}</button>`).join('')}<button class="btn small" data-act="withdraw" data-item="${sel}" data-qty="all">Withdraw all</button></div></div></div>`;
    }
    return html + this.itemGrid(s.bank, 'select-bank', sel) + '</div></div>';
  },

  pageShop() {
    const s = Game.state;
    const shop = Game.shop();
    if (!shop) {
      const shops = Object.keys(LOCATIONS).filter(id => LOCATIONS[id].shop);
      return `<h1>🛒 Shop</h1><p class="muted">There is no merchant at ${esc(Game.here().name)}.</p><ul>${shops.map(id => `<li>${locLink(id)}: ${esc(SHOPS[LOCATIONS[id].shop].name)}</li>`).join('')}</ul>`;
    }
    let html = `<h1>🛒 ${esc(shop.name)}</h1><p class="muted">${esc(shop.keeper)}</p><h2>Buy</h2><div class="cards">`;
    for (const { item, price } of shop.stock) {
      const it = ITEMS[item];
      const stackable = it.type === 'food' || it.type === 'potion';
      html += `<div class="card"><div class="card-icon">${it.icon}</div><div class="card-name">${esc(it.name)}</div>
        <div class="muted small">${esc(it.desc || statLine(it))}</div>${it.req ? `<div class="small">Requires ${reqLine(it.req)}</div>` : ''}
        <div class="small">💰 ${fmt(price)} gold${Game.carries(item) ? ' · <span class="good-text">carried</span>' : ''}</div>
        <div class="btn-row"><button class="btn small" data-act="buy" data-item="${item}" data-qty="1"${s.gold < price ? ' disabled' : ''}>Buy 1</button>${stackable ? `<button class="btn small" data-act="buy" data-item="${item}" data-qty="10"${s.gold < price * 10 ? ' disabled' : ''}>Buy 10</button>` : ''}</div></div>`;
    }
    html += '</div><h2>Sell from your pack</h2>';
    const ids = Object.keys(s.pack);
    if (!ids.length) return html + '<p class="muted">You carry nothing to sell.</p>';
    html += '<table class="stats sell">';
    for (const id of ids) {
      html += `<tr><td>${ITEMS[id].icon} ${esc(ITEMS[id].name)}</td><td>× ${fmt(s.pack[id])}</td><td class="muted">${ITEMS[id].sell}g each</td>
        <td><button class="btn small" data-act="sell" data-item="${id}" data-qty="1">Sell 1</button> <button class="btn small" data-act="sell" data-item="${id}" data-qty="all">Sell all</button></td></tr>`;
    }
    return html + '</table>';
  },

  pageSettings() {
    return `<h1>⚙️ Settings</h1>
      <div class="btn-row"><button class="btn" data-act="save">Save now</button><button class="btn" data-act="export">Export save</button><button class="btn" data-act="import">Import save</button></div>
      <textarea id="save-text" rows="6" placeholder="Paste a save here to import it."></textarea>
      <h2>Danger zone</h2><button class="btn danger" data-act="reset">Erase everything and start over</button>`;
  },

  // --- Meters updated every frame ---
  setBar(id, pct, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = Math.max(0, Math.min(100, pct)) + '%';
    if (label !== undefined) {
      const l = document.getElementById(id + '-label');
      if (l) l.textContent = label;
    }
  },

  updateMeters() {
    const s = Game.state;
    const maxHp = Game.maxHp();
    this.setBar('h-hp', (s.hp / maxHp) * 100, `❤️ ${fmt(Math.max(0, s.hp))} / ${maxHp}`);
    this.setBar('h-sanity', (s.sanity / Game.maxSanity()) * 100, `👁️ ${fmt(s.sanity)} / ${Game.maxSanity()}`);
    document.getElementById('h-gold').textContent = fmt(s.gold);
    document.body.classList.toggle('low-sanity', s.sanity < 30);

    let activity = `📍 ${Game.here().name}`;
    const player = document.getElementById('map-player');
    const travel = Game.travelProgress();
    if (travel) {
      activity = `🧭 Travelling to ${LOCATIONS[travel.target].name} (${Math.ceil(travel.remaining / 1000)}s)`;
      if (player) {
        const a = LOCATIONS[travel.from];
        const b = LOCATIONS[travel.to];
        player.setAttribute('cx', a.x + (b.x - a.x) * travel.frac);
        player.setAttribute('cy', a.y + (b.y - a.y) * travel.frac);
      }
    } else {
      if (player) {
        player.setAttribute('cx', Game.here().x);
        player.setAttribute('cy', Game.here().y - 30);
      }
      if (s.action) {
        const a = findAction(s.action.skill, s.action.id);
        const time = Game.actionTime(s.action.skill, a);
        activity += ` · ${SKILLS[s.action.skill].icon} ${a.name}`;
        this.setBar(`prog-${s.action.skill}-${s.action.id}`, (s.action.progress / time) * 100);
      } else if (s.combat) {
        const m = MONSTERS[s.combat.monster];
        activity += ` · ⚔️ Fighting the ${m.name}`;
        this.setBar('c-hp', (s.hp / maxHp) * 100, `❤️ ${fmt(Math.max(0, s.hp))} / ${maxHp}`);
        this.setBar('c-sanity', (s.sanity / Game.maxSanity()) * 100, `👁️ ${fmt(s.sanity)} / ${Game.maxSanity()}`);
        this.setBar('c-patk', (s.combat.playerTimer / Game.playerStats().speed) * 100);
        const log = document.getElementById('combat-log');
        const html = s.combat.log.map(l => `<div>${esc(l)}</div>`).join('');
        if (log && log.innerHTML !== html) log.innerHTML = html;
        if (s.combat.respawn > 0) {
          this.setBar('c-mhp', 0, 'Another approaches…');
          this.setBar('c-matk', 0);
        } else {
          this.setBar('c-mhp', (s.combat.monsterHp / m.hp) * 100, `${fmt(s.combat.monsterHp)} / ${m.hp}`);
          this.setBar('c-matk', (s.combat.monsterTimer / m.speed) * 100);
        }
      }
    }
    const act = document.getElementById('h-activity');
    if (act.textContent !== activity) act.textContent = activity;
  },

  showOffline(diff) {
    const hours = Math.floor(diff.ms / 3600000);
    const mins = Math.floor((diff.ms % 3600000) / 60000);
    const items = Object.entries(diff.items);
    const xp = Object.entries(diff.xp);
    if (!items.length && !xp.length && !diff.gold && !diff.moved) return;
    let html = `<div class="modal-box"><h2>While you were away…</h2><p class="muted">You were gone for ${hours}h ${mins}m${diff.ms > MAX_OFFLINE_MS ? ' (at most 24h counts)' : ''}.</p>`;
    if (diff.moved) html += `<p>📍 You are now at ${esc(LOCATIONS[diff.moved].name)}.</p>`;
    if (diff.gold) html += `<p>💰 ${diff.gold > 0 ? '+' : ''}${fmt(diff.gold)} gold</p>`;
    if (xp.length) html += `<p>${xp.map(([id, v]) => `<span class="chip">${SKILLS[id].icon} +${fmt(v)} xp</span>`).join(' ')}</p>`;
    if (items.length) html += `<p>${items.map(([id, q]) => `<span class="chip ${q < 0 ? 'lack' : ''}">${ITEMS[id].icon} ${q > 0 ? '+' : ''}${fmt(q)} ${esc(ITEMS[id].name)}</span>`).join(' ')}</p>`;
    html += '<button class="btn" data-act="close-modal">Continue</button></div>';
    document.getElementById('modal').innerHTML = html;
  },

  showIntro() {
    document.getElementById('modal').innerHTML = `<div class="modal-box intro"><h2>Echoes of the Abyss</h2>${LORE.map(p => `<p>${p}</p>`).join('')}<button class="btn" data-act="intro-done">Step ashore in Saltmire</button></div>`;
  },
};
