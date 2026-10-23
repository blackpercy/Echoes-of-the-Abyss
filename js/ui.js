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
  if (!Game.state.known[id]) return '<span class="muted">a place you have not found</span>';
  return `<a href="#" class="loc-link" data-act="map-select" data-loc="${id}">${LOCATIONS[id].icon} ${esc(LOCATIONS[id].name)}</a>`;
}

const KIND_NAMES = { town: 'Settlement', wild: 'Wilderness', dungeon: 'Dungeon', hidden: 'Beyond the Veil' };

// Hidden places only appear on the map while you can see through the Veil (or stand in one).
function isVisible(loc) {
  if (Game.state.location === loc) return true;
  if (LOCATIONS[loc].hidden && !Game.veilSight()) return false;
  return Game.canReach(loc);
}

// Name of a place as the player knows it.
function placeName(loc) {
  return Game.state.known[loc] ? LOCATIONS[loc].name : 'Unexplored road';
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function costText(cost) {
  const parts = [];
  if (cost.gold) parts.push(`${cost.gold} gold`);
  if (cost.sanity) parts.push(`${cost.sanity} sanity`);
  for (const [item, qty] of Object.entries(cost.items)) parts.push(`${qty} × ${ITEMS[item].name}`);
  return parts.join(', ');
}

const UI = {
  page: 'chronicle',
  selectedItem: null,
  selectedBankItem: null,
  mapSelected: null,
  lastVeil: null,
  journalTab: 'chronicle',
  creation: { race: 'human', background: 'fisher' },
  nextHallucination: 0,
  nextSound: 0,
  dirty: true,
  lastRender: 0,

  init() {
    document.body.addEventListener('click', e => this.onClick(e));
    document.body.addEventListener('change', e => this.onChange(e));
    Game.listeners.push((type, payload) => {
      if (type === 'reset') {
        this.page = 'chronicle';
        // A fresh start needs the intro and character creation again.
        if (!Game.state.seenIntro) this.showIntro();
        else if (!Game.state.created) this.showCreation();
      }
      if (type === 'break' && !Game.silent) this.showBreak(payload);
      if (type === 'ending' && !Game.silent) this.showEnding(payload.ending);
      if (type === 'event' && !Game.silent) this.showEvent();
      if (type === 'expedition' && !Game.silent) this.showExpedition(payload);
      if (type === 'achievement' && !Game.silent) this.toast(`${payload.icon} Achievement: ${payload.name}`);
      if (type === 'perk' && !Game.silent) this.toast(`${SKILLS[payload.skill].icon} New ${SKILLS[payload.skill].name} perk to choose`);
      this.dirty = true;
    });
    this.renderAll();
  },

  // --- Clicks ---
  onClick(e) {
    // Clicking the dark backdrop around the item popup closes it.
    if (e.target.id === 'modal' && this.popupOpen()) {
      this.closeItemPopup();
      this.dirty = true;
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    e.preventDefault();
    const d = el.dataset;
    switch (d.act) {
      case 'nav':
        this.page = d.page;
        this.closeItemPopup();
        this.selectedItem = null;
        this.selectedBankItem = null;
        document.body.classList.remove('nav-open');
        break;
      case 'toggle-nav': document.body.classList.toggle('nav-open'); return;
      // On narrow screens the log is a one-line footer; tapping it opens the full log.
      case 'toggle-log': document.body.classList.toggle('log-open'); return;
      case 'action': Game.startAction(d.skill, d.id); break;
      case 'stop': Game.stop(); break;
      case 'fight': Game.startCombat(d.monster); break;
      case 'stance': Game.setStance(d.stance); break;
      case 'eat': if (!Game.eat()) Game.log('You cannot eat right now.', 'warn'); break;
      case 'use': Game.use(d.item); break;
      case 'select':
        this.itemPopup = d.item;
        this.showItemPopup();
        break;
      case 'close-popup': this.closeItemPopup(); break;
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
      case 'accept': Game.acceptQuest(d.quest); break;
      case 'turnin': Game.turnIn(d.quest); break;
      case 'interact': Game.interact(d.npc, d.inter); break;
      case 'save': Game.save(); Game.log('Game saved.', 'good'); break;
      case 'debug-gold': Game.debugGold(+d.amount); break;
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
      case 'close-modal':
        document.getElementById('modal').innerHTML = '';
        if (Game.state.travel && Game.state.travel.event) this.showEvent();
        break;
      case 'intro-done':
        Game.state.seenIntro = true;
        this.showCreation();
        break;
      case 'create-race': this.creation.race = d.race; this.showCreation(); return;
      case 'create-bg': this.creation.background = d.bg; this.showCreation(); return;
      case 'create-done':
        Game.createCharacter(this.creation.race, this.creation.background);
        document.getElementById('modal').innerHTML = '';
        this.page = 'here';
        break;
      case 'event-choice': {
        const lines = Game.resolveEvent(+d.index);
        if (lines) this.showEventResult(lines);
        break;
      }
      case 'perk': Game.choosePerk(d.skill, +d.tier, +d.index); break;
      case 'place-relic': Game.placeRelic(d.item); break;
      case 'raise-idol': Game.raiseIdol(); break;
      case 'respec': if (confirm(`Unlearn every ${SKILLS[d.skill].name} perk for ${Game.respecCost(d.skill)} gold?`)) Game.respecPerks(d.skill); break;
      case 'expedition': Game.startExpedition(d.id); this.page = 'combat'; break;
      case 'dismiss': if (confirm(`Part ways with ${COMPANIONS[d.id].name}?`)) Game.dismissCompanion(d.id); break;
      case 'recruit': Game.recruit(); break;
      case 'collect': Game.collectCult(); break;
      case 'assign': Game.assignFollower(d.from, d.to); break;
      case 'journal-tab': this.journalTab = d.tab; break;
      case 'phantom': Game.log(pick(['There is nothing there.', 'You reach for it and your hand closes on air.', 'It was never there. Was it?']), 'veil'); break;
      case 'audio':
        Game.state.settings.audio = !Game.state.settings.audio;
        if (Game.state.settings.audio) SoundScape.start();
        else SoundScape.stop();
        if (this.page === 'settings') this.renderPage();
        break;
    }
    if (this.popupOpen() && d.act !== 'select' && d.act !== 'close-popup') this.showItemPopup();
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
    if (this.popupOpen() && Game.count(this.itemPopup) !== this.popupCount) this.showItemPopup();
    this.dirty = false;
  },

  frame(now) {
    // The page is rebuilt at most four times a second; meters update every frame.
    // An open dropdown would close on rebuild, so wait until it is released.
    const selectOpen = document.activeElement && document.activeElement.tagName === 'SELECT';
    const veil = Game.veilSight();
    if (veil !== this.lastVeil) {
      if (this.lastVeil !== null) Game.log(veil ? 'The Veil grows thin. You see things that were not there before.' : 'The Veil closes. The hidden things fade from sight.', 'veil');
      this.lastVeil = veil;
      document.body.classList.toggle('veil', veil);
      this.dirty = true;
    }
    if (this.dirty && !selectOpen) {
      // Settings is drawn once when you open it, then left alone so the save text box is not wiped.
      if (this.page === 'settings' && this.renderedPage === 'settings') {
        this.renderNav();
        this.renderLog();
        this.dirty = false;
      } else if (now - this.lastRender > 250) {
        this.lastRender = now;
        this.renderAll();
      }
    }
    this.updateMeters();
    if (now > this.nextSound) {
      this.nextSound = now + 250;
      SoundScape.update();
    }
    if (Game.state.madness >= HALLUCINATIONS.minMadness && now > this.nextHallucination) {
      if (this.nextHallucination) Game.log(pick(HALLUCINATIONS.logLines), 'veil');
      this.nextHallucination = now + 45000 + Math.random() * 60000;
    }
  },

  // Harmless tricks for the deeply mad: they appear sometimes and vanish when touched.
  hallucinating() {
    return Game.state.madness >= HALLUCINATIONS.minMadness && Math.random() < 0.35;
  },

  renderNav() {
    const s = Game.state;
    const here = Game.here();
    const navBtn = (page, icon, name, extra = '', dim = false) => {
      const active = this.page === page || (page === 'character' && (SKILLS[this.page] || this.page.startsWith('skill-'))) ? ' active' : '';
      const busy = (page === 'here' && s.action) || (page === 'combat' && s.combat) || (page === 'map' && s.travel) ? ' busy' : '';
      return `<button class="nav-btn${active}${busy}${dim ? ' dim' : ''}" data-act="nav" data-page="${page}"><span class="nav-icon">${icon}</span><span class="nav-name">${name}</span><span class="nav-extra">${extra}</span></button>`;
    };
    let html = `<div class="nav-group"><div class="nav-title">You are at</div>${navBtn('here', here.icon, esc(here.name))}${navBtn('map', '🗺️', 'World Map')}${navBtn('combat', '⚔️', 'Combat', '', !s.combat && !(here.monsters || []).length)}</div>`;
    html += `<div class="nav-group"><div class="nav-title">Yourself</div>${navBtn('pack', '🎒', 'Pack', `${Game.usedSlots()} / ${Game.capacity()}`)}${navBtn('character', '🧝', 'Character & Skills', Game.totalPendingPerks() ? `<span class="perk-badge">★ ${Game.totalPendingPerks()}</span>` : '')}${navBtn('quests', '📖', 'Quests', Object.values(s.quests).filter(q => q.status === 'active').length || '')}${s.cult ? navBtn('cult', '🛐', 'Your Cult', s.cult.followers) : ''}</div>`;
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
    this.renderedPage = this.page;
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
      quests: () => this.pageQuests(),
      cult: () => this.pageCult(),
    };
    // Skill pages use "skill-<id>" so the Combat skill does not clash with the Combat page.
    const skill = this.page.startsWith('skill-') ? this.page.slice(6) : this.page;
    main.innerHTML = pages[this.page] ? pages[this.page]() : this.pageSkill(skill);
    main.scrollTop = scroll;
  },

  // --- Location summaries (used by the map panel and the "here" page) ---
  locationFeatures(id) {
    const loc = LOCATIONS[id];
    const rows = [];
    for (const [skill, actions] of Object.entries(loc.gather || {})) {
      const visible = actions.map(a => findAction(skill, a)).filter(act => !act.veil || Game.veilSight());
      if (!visible.length) continue;
      rows.push(`<div><b>${SKILLS[skill].icon} ${SKILLS[skill].name}:</b> ${visible.map(act => `${(ITEMS[Object.keys(act.output)[0]] || { icon: act.icon }).icon} ${esc(act.name)} <span class="muted">(${act.level})</span>`).join(', ')}</div>`);
    }
    if ((loc.stations || []).length) rows.push(`<div><b>Workplaces:</b> ${loc.stations.map(st => `${STATIONS[st].icon} ${STATIONS[st].name}`).join(', ')}</div>`);
    const services = [];
    if (loc.bank) services.push('🏦 Bank');
    if (loc.shop) services.push(`🛒 ${esc(SHOPS[loc.shop].name)}`);
    if (loc.inn) services.push(`🛏️ Rest at ${esc(loc.inn)}`);
    if (services.length) rows.push(`<div><b>Services:</b> ${services.join(', ')}</div>`);
    if ((loc.monsters || []).length) rows.push(`<div><b>Enemies:</b> ${loc.monsters.map(m => `${MONSTERS[m].icon} ${MONSTERS[m].name}`).join(', ')}</div>`);
    const people = Object.keys(NPCS).filter(n => NPCS[n].location === id && Game.check(NPCS[n].if));
    if (people.length) rows.push(`<div><b>People:</b> ${people.map(n => `${NPCS[n].icon} ${esc(NPCS[n].name)}`).join(', ')}</div>`);
    return rows.join('');
  },

  routeInfo(target) {
    if (target === Game.state.location) return '<p class="good-text">📍 You are here.</p>';
    const route = Game.findRoute(target);
    if (!route) {
      const blocked = roadsFrom(target).map(({ road }) => Game.roadBlocker(road)).filter(Boolean);
      return `<p class="lack-text">🔒 No route with what you carry.${blocked.length ? ' ' + esc(blocked[0]) + '.' : ''}</p>`;
    }
    const via = route.path.slice(1, -1).map(placeName);
    const travelling = Game.state.travel && Game.state.travel.path[Game.state.travel.path.length - 1] === target;
    return `<p>🧭 ${Math.round(route.time / Game.travelSpeed())}s on the road${route.cost ? ` · 💰 ${route.cost} gold` : ''}${via.length ? `<br><span class="muted small">Via ${via.map(esc).join(' → ')}</span>` : ''}</p>
      <button class="btn" data-act="travel" data-loc="${target}"${travelling ? ' disabled' : ''}>${travelling ? 'Travelling…' : 'Travel here'}</button>`;
  },

  // --- Pages ---
  pageChronicle() {
    const tabs = { chronicle: '📜 Chronicle', bestiary: '📕 Bestiary', achievements: '🏆 Achievements' };
    let html = `<div class="btn-row tabs">${Object.entries(tabs).map(([id, name]) => `<button class="btn small${this.journalTab === id ? ' selected' : ''}" data-act="journal-tab" data-tab="${id}">${name}</button>`).join('')}</div>`;
    if (this.journalTab === 'bestiary') return html + this.pageBestiary();
    if (this.journalTab === 'achievements') return html + this.pageAchievements();
    html += '<div class="lore"><h1>Echoes of the Abyss</h1>';
    html += LORE.map(p => `<p>${p}</p>`).join('');
    html += `<h2>How to play</h2><ul>
      <li>Open the <b>World Map</b> and travel between settlements and wild places. What you can do depends on <b>where you are</b>: each place has its own trees, fishing waters, ore veins, herbs, workplaces and enemies.</li>
      <li>It also depends on <b>what you carry</b>. Gathering needs the right tool in your pack. Some roads need special gear. Your pack has a limited number of slots, so leave what you do not need in a bank.</li>
      <li>Cooking needs a fire and alchemy needs a lab, unless you carry a tinderbox or alchemy kit. Smithing is only possible at a forge.</li>
      <li>Once you begin a task you keep at it until you stop, your pack is full or your materials run out, even while you are away from the game (up to 24 hours).</li>
      <li>Fights are settled with dice. You roll a d20 plus your bonus against the enemy's armour class, and damage comes from your weapon's dice. A natural 20 is a critical hit. You eat your chosen food when your health drops below 40%.</li>
      <li><b>Sanity.</b> When something from beyond wounds you, you make a sanity save. Fail it and you lose sanity. Occult study costs sanity too. Sanity recovers slowly at rest and quickly at an inn, and warding amulets help you keep it.</li>
      <li><b>The Veil.</b> Below ${VEIL_THRESHOLD} sanity you start to see what is hidden: secret places on the map, strange resources, and people no one else can see. Some of them have work for you.</li>
      <li><b>Madness is not the end.</b> When your sanity reaches zero your mind breaks. You gain a level of madness and a <b>derangement</b>, a lasting change with a gift and a curse. Madness lowers your maximum sanity, but it opens doors: from <i>${MADNESS_STAGES[PERMANENT_VEIL_MADNESS]}</i> onward the Veil never closes, Saltmire's townsfolk treat you as kin, and the Dreamer's servants will speak with you. The Silent Order wants you sane, and the Abbey can quiet your mind if you change your path.</li>
      <li><b>The map starts mostly dark.</b> You can always see the roads leading out of places you have visited. People will tell you of places further away, if you ask.</li>
      <li><b>Something may happen on the road.</b> Make a choice, and sometimes a skill check: a d20 plus a quarter of your skill level, against a difficulty.</li>
      <li><b>Time passes.</b> A day lasts twenty minutes. At night the Veil is thinner and eldritch beings are harder to resist. At low tide you can wade out to Devil's Reef. Every seventh night the stars are right…</li>
      <li><b>Expeditions</b> take you through several fights in a row with no rest in between, and end in a treasure. <b>Companions</b> fight beside you, but they have minds of their own to lose.</li>
      <li>The game saves automatically in your browser every ten seconds. You can install it as an app from your browser's menu.</li>
    </ul></div>`;
    return html;
  },

  pageMap() {
    const s = Game.state;
    const sel = this.mapSelected && isVisible(this.mapSelected) ? this.mapSelected : s.location;
    // While travelling, the road you are on is drawn as a moving trail instead of the planned route.
    const route = s.travel ? { path: s.travel.path } : sel !== s.location ? Game.findRoute(sel) : null;
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
      if (!isVisible(r.a) || !isVisible(r.b)) continue;
      const a = LOCATIONS[r.a];
      const b = LOCATIONS[r.b];
      const blocked = Game.roadBlocker(r);
      const cls = (routeEdges.has(r) ? `road route${s.travel ? ' active' : ''}` : blocked ? 'road blocked' : 'road') + (r.veil ? ' veiled' : '');
      svg += `<line class="${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (blocked) svg += `<text class="road-mark" x="${mx}" y="${my}">🔒</text>`;
      else if (r.cost) svg += `<text class="road-mark" x="${mx}" y="${my}">⛵</text>`;
      svg += `<text class="road-time" x="${mx}" y="${my + 18}">${Game.roadSeconds(r)}s</text>`;
    }
    for (const [id, loc] of Object.entries(LOCATIONS)) {
      if (!isVisible(id)) continue;
      const known = !!s.known[id];
      const cls = ['node', known ? loc.kind : 'unexplored', id === s.location ? 'current' : '', id === sel ? 'selected' : ''].join(' ');
      svg += `<g class="${cls}" data-act="map-select" data-loc="${id}">
        <circle cx="${loc.x}" cy="${loc.y}" r="24"/>
        <text class="node-icon" x="${loc.x}" y="${loc.y + 1}">${known ? loc.icon : '❔'}</text>
        <text class="node-label" x="${loc.x + (loc.labelDx || 0)}" y="${loc.y + 42}">${known ? esc(loc.name) : '???'}</text>
      </g>`;
    }
    if (this.hallucinating()) {
      const ph = pick(HALLUCINATIONS.places);
      svg += `<g class="node phantom" data-act="phantom"><circle cx="${ph.x}" cy="${ph.y}" r="24"/><text class="node-icon" x="${ph.x}" y="${ph.y + 1}">${ph.icon}</text><text class="node-label" x="${ph.x}" y="${ph.y + 42}">${esc(ph.name)}</text></g>`;
    }
    svg += `<line id="map-trail" x1="-50" y1="-50" x2="-50" y2="-50"/>
      <circle id="map-player-ring" r="8" cx="-50" cy="-50"${s.travel ? '' : ' hidden'}/>
      <circle id="map-player" r="8" cx="-50" cy="-50"/></svg>`;

    const loc = LOCATIONS[sel];
    if (!s.known[sel]) {
      return `<h1>🗺️ The Kingdom of Aldmark</h1><div class="map-layout"><div class="map-wrap">${svg}</div><div class="map-panel"><h2>❔ Unexplored</h2>
        <p class="muted">A road leads somewhere you have never been. Travel there to find out what waits at the end of it, or ask around.</p>${this.routeInfo(sel)}</div></div>`;
    }
    const panel = `<div class="map-panel">
      <h2>${loc.icon} ${esc(loc.name)}</h2>
      <div class="muted small">${KIND_NAMES[loc.kind]}${Game.state.visited[sel] ? '' : ' · not yet visited'}</div>
      <p>${esc(loc.desc)}</p>
      <div class="features small">${this.locationFeatures(sel)}</div>
      ${this.routeInfo(sel)}
      <div class="small muted">${Game.timeLabel()}</div>
      <div class="small muted roads">${roadsFrom(sel).filter(({ to }) => isVisible(to)).map(({ road, to }) => `${locLink(to)} ${Game.roadSeconds(road)}s${Game.roadCost(road) ? ` · ${Game.roadCost(road)} gold` : ''}${road.req ? ` · needs ${road.req.map(i => ITEMS[i].name).join(', ')}` : ''}`).join('<br>')}</div>
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
      return html + `<p class="warning">🧭 You are on the road to ${esc(placeName(t.target))}. ${t.paused ? 'Something has stopped you.' : `${Math.round(t.overall * 100)}% of the way there.`}</p>`;
    }
    const people = Game.npcsHere();
    if (people.length) html += `<h2>People</h2><div class="people">${people.map(n => this.npcCard(n)).join('')}</div>`;
    const gather = Object.entries(loc.gather || {});
    if (gather.length) {
      html += '<h2>Gather</h2><div class="cards">';
      for (const [skill, ids] of gather) {
        for (const aid of ids) {
          const a = findAction(skill, aid);
          if (!a.veil || Game.veilSight()) html += this.actionCard(skill, a);
        }
      }
      html += '</div>';
    }
    for (const st of Object.keys(STATIONS).filter(st => Game.hasStation(st))) {
      const portable = STATIONS[st].portable;
      // Where this workplace comes from when the location itself does not have one.
      const source = (loc.stations || []).includes(st) ? null : portable && Game.carries(portable) ? `your ${ITEMS[portable].name}` : 'the voices in your head';
      const skills = Object.keys(ACTIONS).filter(sk => ACTIONS[sk].some(a => a.station === st));
      html += `<h2>${STATIONS[st].icon} ${STATIONS[st].name}${source ? ` <span class="muted small">(${source})</span>` : ''}</h2>`;
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
    const expeditions = Object.keys(EXPEDITIONS).filter(e => EXPEDITIONS[e].location === id);
    if (expeditions.length) html += `<h2>Expeditions</h2><div class="cards">${expeditions.map(e => this.expeditionCard(e)).join('')}</div>`;
    if (s.cult && id === CULT_SHRINE) {
      html += `<h2>🛐 Your Hidden Shrine</h2><p class="small">${s.cult.followers} followers. Their offerings: ${s.cult.gold} gold${Object.entries(s.cult.stash).map(([it, q]) => `, ${q} × ${ITEMS[it].name}`).join('')}.</p>
        <div class="btn-row"><button class="btn" data-act="collect">Collect offerings</button><button class="btn" data-act="nav" data-page="cult">Tend your flock</button></div>`;
    }
    html += '<h2>Roads</h2><div class="cards">';
    for (const { road, to } of roadsFrom(id).filter(({ to }) => isVisible(to))) {
      const blocked = Game.roadBlocker(road);
      html += `<div class="card"><div class="card-name">${s.known[to] ? `${LOCATIONS[to].icon} ${esc(LOCATIONS[to].name)}` : '❔ Unexplored road'}</div>
        <div class="small">🧭 ${Game.roadSeconds(road)}s${Game.roadCost(road) ? ` · 💰 ${Game.roadCost(road)} gold` : road.cost ? ' · <span class="good-text">free passage</span>' : ''}</div>
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

  expeditionCard(id) {
    const ex = EXPEDITIONS[id];
    const c = Game.state.combat;
    // The expedition you are in shows the fight itself, with progress through the chambers.
    if (c && c.expedition && c.expedition.id === id) {
      const room = c.expedition.room;
      return `<div class="card eldritch active fighting"><div class="fight-head"><span class="card-icon">🏛️</span><div><div class="card-name">${esc(ex.name)}</div>
        <div class="small muted">Chamber ${room + 1} of ${ex.rooms.length}. No rest until you are out.</div></div></div>
        <div class="chambers">${ex.rooms.map((m, i) => `<span class="chamber${i < room ? ' cleared' : i === room ? ' current' : ''}" title="${esc(MONSTERS[m].name)}">${MONSTERS[m].icon}</span>`).join('<span class="chamber-link"></span>')}<span class="chamber-link"></span><span class="chamber">💰</span></div>
        ${this.fightPanel('Flee the depths')}</div>`;
    }
    const blocker = Game.expeditionBlocker(id);
    const done = Game.state.expeditionsDone[id] || 0;
    return `<div class="card eldritch"><div class="card-icon">🏛️</div><div class="card-name">${esc(ex.name)}</div>
      <div class="small muted">Recommended combat level ${ex.level}${done ? ` · completed ${done}×` : ''}</div>
      <p class="small">${esc(ex.desc)}</p>
      <div class="small">${ex.rooms.map(m => MONSTERS[m].icon).join(' → ')} → 💰</div>
      ${blocker ? `<div class="small lack-text">${esc(blocker)}</div>` : ''}
      <button class="btn" data-act="expedition" data-id="${id}"${blocker ? ' disabled' : ''}>Descend</button></div>`;
  },

  npcCard(id) {
    const npc = NPCS[id];
    let html = `<div class="npc${npc.if && npc.if.veil ? ' veiled' : ''}"><div class="npc-head"><span class="big-icon">${npc.icon}</span><div><b>${esc(npc.name)}</b><div class="muted small">${esc(npc.title)}</div></div></div>
      <p class="npc-line">${esc(Game.npcLine(id))}</p>`;
    for (const qid of Object.keys(QUESTS).filter(q => QUESTS[q].giver === id)) {
      const q = QUESTS[qid];
      const status = Game.questStatus(qid);
      if (status === 'none' && Game.check(q.requires)) {
        html += `<div class="quest-offer"><div><b>📖 ${esc(q.name)}</b>${q.path ? ` <span class="path ${q.path}">${q.path === 'order' ? 'Silent Order' : 'The Dreamer'}</span>` : ''}</div><p class="small">${esc(q.offer)}</p>
          <div class="small muted">${esc(Game.questProgressText(qid))}</div><button class="btn small" data-act="accept" data-quest="${qid}">Accept</button></div>`;
      } else if (status === 'active') {
        html += `<div class="quest-offer active"><div><b>📖 ${esc(q.name)}</b></div><div class="small">${esc(Game.questProgressText(qid))}</div>
          ${q.objective.type === 'deliver' ? `<button class="btn small" data-act="turnin" data-quest="${qid}"${Game.canTurnIn(qid) ? '' : ' disabled'}>Hand over</button>` : ''}</div>`;
      }
    }
    const inters = (npc.interactions || []).filter(i => Game.check(i.if));
    if (inters.length) {
      html += `<div class="btn-row">${inters.map(i => {
        const cost = Game.interactionCost(i);
        const text = costText(cost);
        return `<button class="btn small${cost.sanity ? ' veil-btn' : ''}" data-act="interact" data-npc="${id}" data-inter="${i.id}">${esc(i.label)}${text ? ` <span class="muted">(${esc(text)})</span>` : ''}</button>`;
      }).join('')}</div>`;
    }
    return html + '</div>';
  },

  actionCard(skill, a) {
    const s = Game.state;
    if (a.veil && !Game.veilSight()) {
      return '<div class="card locked veiled"><div class="card-icon">🌫️</div><div class="card-name">Something you cannot quite perceive</div><div class="muted small">Perhaps with a thinner mind…</div></div>';
    }
    if (Game.level(skill) < a.level) {
      return `<div class="card locked"><div class="card-icon">🔒</div><div class="card-name">${esc(a.name)}</div><div class="muted small">Requires level ${a.level}</div></div>`;
    }
    const active = s.action && s.action.skill === skill && s.action.id === a.id;
    const blocker = active ? null : Game.actionBlocker(skill, a);
    const outItem = ITEMS[Object.keys(a.output)[0]] || { icon: a.icon || '❔', id: null };
    const makes = [...Object.entries(a.output).map(([id, q]) => itemChip(id, q)), a.gold ? `<span class="chip">💰 ${a.gold[0]}–${a.gold[1]} gold</span>` : ''].filter(Boolean).join(' ');
    const extras = [
      a.sanityGain ? `<span class="good-text">+${a.sanityGain + Game.perk('dreamRest', skill)} sanity</span>` : '',
      a.risk ? `<span class="lack-text">${Math.round(a.risk * (1 - Math.min(0.9, Game.perk('safe', skill))) * 100)}% risk of being caught</span>` : '',
      a.minMadness ? `<span class="sanity-text">needs madness: ${MADNESS_STAGES[a.minMadness]}</span>` : '',
      a.anywhere ? '<span class="muted">anywhere</span>' : '',
    ].filter(Boolean).join(' · ');
    let where = '';
    if (!active && !Game.availableHere(skill, a)) {
      const places = Game.whereAvailable(skill, a);
      const portable = a.station && STATIONS[a.station].portable;
      where = `<div class="small muted">Found at: ${places.length ? places.map(locLink).join(', ') : 'somewhere you have not yet explored'}${portable ? ` or anywhere with a ${ITEMS[portable].name}` : ''}</div>`;
    }
    return `<div class="card${active ? ' active' : ''}${blocker ? ' blocked' : ''}">
      <div class="card-icon">${outItem.icon}</div>
      <div class="card-name">${esc(a.name)}</div>
      ${a.desc ? `<div class="muted small">${esc(a.desc)}</div>` : ''}
      ${a.when ? `<div class="small sanity-text">${a.when === 'night' ? '🌙 Only at night' : '🌊 Only at low tide'}</div>` : ''}
      <div class="small">${secs(Game.actionTime(skill, a))} · ${a.xp} xp${a.sanityCost ? ` · <span class="sanity-text">−${Game.sanityCostOf(skill, a)} sanity</span>` : ''}${a.station ? ` · ${STATIONS[a.station].icon} ${STATIONS[a.station].name}` : ''}</div>
      ${a.input ? `<div class="small">Uses: ${Object.entries(a.input).map(([id, q]) => `<span class="chip ${Game.count(id) >= q ? '' : 'lack'}">${ITEMS[id].icon} ${q} ${esc(ITEMS[id].name)} <span class="muted">(${fmt(Game.count(id))})</span></span>`).join(' ')}</div>` : ''}
      <div class="small">Makes: ${makes}${outItem.id ? ` <span class="muted">(carrying ${fmt(Game.count(outItem.id))})</span>` : ''}</div>
      ${extras ? `<div class="small">${extras}</div>` : ''}
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
    if (skill === 'archaeology') html += this.relicCollection();
    if (skill === 'stealth') {
      html += `<p class="small">🗡️ Your first blow against each enemy, if it lands, is a <b>sneak attack</b> for +${Game.sneakDice()}d6 (one die per ${SNEAK_LEVELS_PER_DIE} Stealth levels, plus perks). After an expedition you search for a hidden vault: d20 ${withSign(Math.floor(Game.level('stealth') / 4))} against DC ${VAULT_DC} doubles the treasure.</p>`;
    }
    if (skill === 'cartography') {
      html += `<p class="small">🧭 You learn Cartography on the road: ${CARTOGRAPHY_XP_PER_ROAD_SECOND} xp per second travelled and ${CARTOGRAPHY_XP_PER_DISCOVERY} xp for every new place. You now travel ${Math.round(CARTOGRAPHY_TRAVEL_PER_LEVEL * 100 * (Game.level('cartography') - 1))}% faster and have ${withSign(Math.floor(Game.level('cartography') / 10) + Game.perk('scout'))} to road-event checks. Read the maps you draw from your pack.</p>`;
    }
    if (skill === 'dreaming') {
      html += '<p class="small">🌙 You dream wherever there is a bed: at an inn, or with a bedroll in your pack. Gentle dreams restore sanity; the deepest dreams cost it, and only a broken mind can find the way to Leng and Kadath.</p>';
    }
    if (skill === 'fellowship') {
      const lvl = Game.level('fellowship');
      html += `<p class="small">🤝 Fellowship grows when a companion fights beside you (${Math.round(FELLOWSHIP_KILL_SHARE * 100)}% of each enemy's xp) and when you travel together. Each level gives your companions +${Math.round(FELLOWSHIP_HP_PER_LEVEL * 100)}% hitpoints and +1 sanity; every 10 levels +1 to hit, every 8 levels +1 damage.</p>
        <p class="small"><b>You can lead ${Game.companionCapacity()} companion${Game.companionCapacity() > 1 ? 's' : ''}</b> (one more every ${FELLOWSHIP_LEVELS_PER_COMPANION} Fellowship levels). With you now: ${Game.companions().length}.</p>
        ${Game.companions().length ? this.companionBlock() : '<p class="small muted">You travel alone. Companions can be hired in Ironhold, at the Silent Abbey and, for the touched, in Saltmire. Others may join you once you have helped them.</p>'}
        <p class="small muted">Right now: +${Math.round(FELLOWSHIP_HP_PER_LEVEL * 100 * (lvl - 1))}% hitpoints, ${withSign(Math.floor(lvl / 10))} to hit, ${withSign(Math.floor(lvl / 8))} damage.</p>`;
    }
    if (skill === 'occultism') {
      html += '<p class="warning">👁️ Occult study costs sanity, and your sanity does not recover while you study. Every Occultism level beyond the first grants +1% damage against beings from beyond, and every five levels add +1 to your sanity saves.</p>';
    }
    html += this.skillTree(skill);
    if (ACTIONS[skill]) html += `<h2>Activities</h2><div class="cards">${ACTIONS[skill].map(a => this.actionCard(skill, a)).join('')}</div>`;
    return html;
  },

  // Ten tiers, one every five levels; pick one of two perks in each.
  skillTree(skill) {
    const lvl = Game.level(skill);
    const pending = Game.pendingPerks(skill);
    const respec = Game.respecCost(skill);
    let html = `<details class="skill-tree"${pending || !ACTIONS[skill] ? ' open' : ''}><summary><h2>🌳 ${SKILLS[skill].name} perks ${pending ? `<span class="perk-badge">★ ${pending} to choose</span>` : ''}</h2></summary>
      <p class="small muted">Every ${PERK_EVERY} levels you choose one of two perks. The choice lasts until you pay to unlearn it.</p><div class="tree">`;
    for (const tierLevel of Game.perkTiers()) {
      const chosen = (Game.state.perks[skill] || {})[tierLevel];
      const open = lvl >= tierLevel && chosen === undefined;
      const state = chosen !== undefined ? 'done' : open ? 'open' : 'locked';
      const options = PERK_TREES[skill][tierLevel / PERK_EVERY - 1];
      html += `<div class="tier ${state}"><div class="tier-level">${tierLevel}</div><div class="tier-options">${options.map((p, i) => {
        const cls = chosen === undefined ? (open ? 'perk open' : 'perk locked') : chosen === i ? 'perk chosen' : 'perk passed';
        return `<button class="${cls}" data-act="perk" data-skill="${skill}" data-tier="${tierLevel}" data-index="${i}"${open ? '' : ' disabled'}><b>${chosen === i ? '✦ ' : ''}${esc(p.name)}</b><span class="small">${esc(perkText(p, skill))}</span></button>`;
      }).join('<span class="tier-or">or</span>')}</div></div>`;
    }
    html += '</div>';
    if (respec) html += `<button class="btn small danger" data-act="respec" data-skill="${skill}">Unlearn all ${SKILLS[skill].name.toLowerCase()} perks (${fmt(respec)} gold)</button>`;
    return html + '</details>';
  },

  monsterCard(id) {
    const s = Game.state;
    const m = MONSTERS[id];
    const fighting = s.combat && s.combat.monster === id && !s.combat.expedition;
    if (fighting) {
      return `<div class="card active fighting${m.eldritch ? ' eldritch' : ''}">
        <div class="fight-head"><span class="card-icon">${m.icon}</span><div><div class="card-name">${m.name}${m.boss ? ' <span class="boss">BOSS</span>' : ''}</div>
        <div class="small muted">Slain this fight: <b id="c-slain">${s.combat.slain || 0}</b> · in total: ${fmt(s.kills[id] || 0)}</div></div></div>
        ${this.fightPanel('Stop fighting')}</div>`;
    }
    return `<div class="card${m.eldritch ? ' eldritch' : ''}">
      <div class="card-icon">${m.icon}</div>
      <div class="card-name">${m.name}${m.boss ? ' <span class="boss">BOSS</span>' : ''}</div>
      <div class="small">❤️ ${m.hp} HP · 🛡️ AC ${m.ac} · ⚔️ ${withSign(m.hit)} to hit, ${m.dmg}</div>
      ${m.eldritch ? `<div class="small sanity-text">👁️ Sanity save DC ${m.eldritch.dc}, −${m.eldritch.loss} on a failure</div>` : ''}
      <div class="small muted">${m.xp} xp</div>
      <div class="small muted">Loot: ${m.drops.map(d => ITEMS[d.item].icon).join(' ')} · ${m.gold[0]}–${m.gold[1]} gold</div>
      ${s.combat && s.combat.expedition
        ? '<button class="btn" disabled>You are deep in an expedition</button>'
        : `<button class="btn" data-act="fight" data-monster="${id}"${s.travel ? ' disabled' : ''}>${s.combat ? 'Fight this instead' : 'Fight'}</button>`}
    </div>`;
  },

  // The live fight, shown inside the card of the enemy (or expedition) you are fighting.
  // Bars and the log are updated every frame by updateMeters.
  fightPanel(stopLabel) {
    const s = Game.state;
    const m = MONSTERS[s.combat.monster];
    const chance = chanceToHit(Game.attackBonusVs(m), m.ac);
    const theirs = chanceToHit(Game.monsterHit(m), Game.armourClass());
    const foods = Object.keys(s.pack).filter(id => Game.isFood(id));
    const potions = Object.keys(s.pack).filter(id => ITEMS[id].type === 'potion');
    return `<div class="fight">
      <div class="fight-side enemy">
        <div class="small"><b>${m.icon} ${m.name}</b></div>
        ${bar('c-mhp', 'hp', 0)}
        ${bar('c-matk', 'progress enemy', 0)}
        <div class="small muted">AC ${m.ac} · ${withSign(Game.monsterHit(m))} to hit (${Math.round(theirs * 100)}% vs you) · ${m.dmg}${m.eldritch ? ` · <span class="sanity-text">sanity save DC ${Game.eldritchDc(m)}</span>` : ''}</div>
      </div>
      <div class="fight-side you">
        <div class="small"><b>You</b></div>
        ${bar('c-hp', 'hp', 0)}
        ${bar('c-sanity', 'sanity', 0)}
        ${bar('c-patk', 'progress', 0)}
        <div class="small muted">${withSign(Game.attackBonusVs(m))} to hit (${Math.round(chance * 100)}% vs AC ${m.ac}) · ${Game.damageText()} · AC ${Game.armourClass()}${m.eldritch ? ` · ${withSign(Game.wits())} sanity saves` : ''}</div>
        ${this.companionBlock()}
      </div>
      <div class="combat-log" id="combat-log">${s.combat.log.map(l => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="fight-controls">
        <div class="style-row">${Object.entries(STANCES).map(([id, st]) => `<button class="btn small${s.stance === id ? ' selected' : ''}" data-act="stance" data-stance="${id}" title="${st.desc}">${st.icon} ${st.name}</button>`).join('')}</div>
        <div class="style-row">
          <select id="food-select">${foods.length ? '' : '<option>No food</option>'}${foods.map(id => `<option value="${id}"${id === s.food ? ' selected' : ''}>${ITEMS[id].name} (${fmt(s.pack[id])})</option>`).join('')}</select>
          <button class="btn small" data-act="eat">Eat${s.food && Game.isFood(s.food) ? ` (+${Game.foodHeal(s.food)})` : ''}</button>
          ${potions.map(id => `<button class="btn small" data-act="use" data-item="${id}" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${fmt(s.pack[id])}</button>`).join('')}
        </div>
        <button class="btn danger stop-fight" data-act="stop">⏹ ${stopLabel}</button>
      </div>
    </div>`;
  },

  pageCombat() {
    const s = Game.state;
    const here = Game.here();
    const pendingCombat = Game.pendingPerks('combat');
    let html = `<h1>⚔️ Combat</h1><p class="small"><a href="#" class="loc-link" data-act="nav" data-page="skill-combat">🌳 Combat level ${Game.level('combat')} · perks</a>${pendingCombat ? ` <span class="perk-badge">★ ${pendingCombat} to choose</span>` : ''}</p>`;
    if (s.combat && s.combat.expedition) {
      html += `<div class="cards">${this.expeditionCard(s.combat.expedition.id)}</div>`;
    }
    if ((here.monsters || []).length) {
      const phantom = this.hallucinating() ? pick(HALLUCINATIONS.monsters) : null;
      html += `<h2>${here.icon} Enemies at ${esc(here.name)}</h2><div class="cards">${here.monsters.map(m => this.monsterCard(m)).join('')}${phantom ? `<div class="card eldritch phantom"><div class="card-icon">${phantom.icon}</div><div class="card-name">${esc(phantom.name)}</div><div class="small muted">❤️ ?? · 🛡️ AC ?? · ⚔️ ??</div><button class="btn" data-act="phantom">Fight</button></div>` : ''}</div>`;
    } else if (!s.combat) {
      const grounds = Object.keys(LOCATIONS).filter(id => (LOCATIONS[id].monsters || []).length && s.known[id]);
      html += grounds.length ? `<p class="muted">Nothing here wants to fight you. Hunting grounds you know of:</p><ul>${grounds.map(id => `<li>${locLink(id)}: ${LOCATIONS[id].monsters.map(m => MONSTERS[m].name).join(', ')}</li>`).join('')}</ul>` : '<p class="muted">Nothing here wants to fight you, and you know of no hunting grounds yet. Explore, or ask around.</p>';
    }
    return html;
  },

  pageCharacter() {
    const s = Game.state;
    const race = RACES[s.race];
    const bg = s.background && BACKGROUNDS[s.background];
    let html = `<h1>🧝 Character & Skills</h1><p>${race.icon} <b>${race.name}</b>${bg ? ` · ${bg.icon} <b>${bg.name}</b>` : ''}</p>
      <p class="small muted">${esc(race.desc)}${bg ? ' ' + esc(bg.desc) : ''}</p>
      <div class="two-col"><div><h2>Equipment</h2><div class="slots">`;
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
    </table>
    <h2>Mind</h2><table class="stats">
      <tr><td>State</td><td>${Game.mindState().name}${Game.veilSight() ? ' · <span class="sanity-text">sees through the Veil</span>' : ''}</td></tr>
      <tr><td>Madness</td><td>${MADNESS_STAGES[s.madness]} (${s.madness} / ${MADNESS_STAGES.length - 1})</td></tr>
    </table>
    ${s.madness ? `<h2>Gifts of madness</h2>${MADNESS_ABILITIES.slice(1, s.madness + 1).map(a => `<div class="derangement"><b>✦ ${a.name}</b><div class="small muted">${a.desc}</div></div>`).join('')}` : ''}
    ${s.companions.length ? `<h2>Companions <span class="small muted">${s.companions.length} / ${Game.companionCapacity()}</span></h2>${this.companionBlock(true)}` : ''}
    ${s.derangements.length ? `<div class="derangements">${s.derangements.map(d => `<div class="derangement"><b>${DERANGEMENTS[d].icon} ${DERANGEMENTS[d].name}</b><div class="small muted">${DERANGEMENTS[d].desc}</div></div>`).join('')}</div>` : '<p class="small muted">No derangements. Yet.</p>'}
    </div><div><h2>Skills</h2><table class="stats">`;
    for (const g of SKILL_GROUPS) {
      html += `<tr><td colspan="3" class="muted small">${g.name}</td></tr>`;
      for (const id of g.skills) {
        const lvl = Game.level(id);
        const pct = lvl >= MAX_LEVEL ? 100 : ((s.skills[id].xp - XP_TABLE[lvl]) / (XP_TABLE[lvl + 1] - XP_TABLE[lvl])) * 100;
        const pending = Game.pendingPerks(id);
        html += `<tr><td><a href="#" class="loc-link" data-act="nav" data-page="skill-${id}">${SKILLS[id].icon} ${SKILLS[id].name}</a>${pending ? ` <span class="perk-badge" title="Perks waiting to be chosen">★ ${pending}</span>` : ''}</td><td>${lvl}</td><td class="skill-mini"><div class="bar progress"><div class="fill" style="width:${pct}%"></div></div></td></tr>`;
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
    let grid = this.itemGrid(s.pack, 'select', this.itemPopup);
    if (this.hallucinating()) {
      const ph = pick(HALLUCINATIONS.items);
      grid = grid.replace(/<\/div>$/, `<button class="bank-item phantom" data-act="phantom"><span class="bank-icon">${ph.icon}</span><span class="bank-qty">1</span><span class="bank-name">${esc(ph.name)}</span></button></div>`);
    }
    return html + grid;
  },

  // The item popup: details and every action for one item in your pack.
  itemPopup: null,
  popupCount: null,
  showItemPopup() {
    const s = Game.state;
    const here = Game.here();
    const sel = this.itemPopup;
    const modal = document.getElementById('modal');
    if (!sel || !s.pack[sel]) return this.closeItemPopup();
    const it = ITEMS[sel];
    this.popupCount = s.pack[sel];
    modal.innerHTML = `<div class="modal-box item-popup"><button class="popup-close" data-act="close-popup" aria-label="Close">✕</button>
      <div class="item-detail"><div class="big-icon">${it.icon}</div><div>
        <h2>${esc(it.name)} <span class="muted">× ${fmt(s.pack[sel])}</span></h2>
        <p class="muted">${esc(it.desc)}</p>
        ${it.type === 'equipment' ? `<p class="small">${statLine(it)}${it.speed ? ` · attacks every ${secs(it.speed)}` : ''}</p>` : ''}
        ${it.req ? `<p class="small ${Game.meetsReq(sel) ? '' : 'lack-text'}">Requires: ${reqLine(it.req)}</p>` : ''}
        <p class="small muted">Worth ${fmt(it.sell)} gold each${s.food === sel ? ' · your chosen food' : ''}</p>
        <div class="btn-row">
          ${it.type === 'equipment' ? `<button class="btn" data-act="equip" data-item="${sel}">Equip</button>` : ''}
          ${Game.isFood(sel) ? `<button class="btn" data-act="food" data-item="${sel}">${s.food === sel ? 'Chosen food ✓' : 'Choose as food'}</button><button class="btn" data-act="use" data-item="${sel}">Eat (+${Game.foodHeal(sel)})</button>` : ''}
          ${it.type === 'potion' ? `<button class="btn" data-act="use" data-item="${sel}">Drink</button>` : ''}
          ${it.type === 'map' ? `<button class="btn" data-act="use" data-item="${sel}">Read the map</button>` : ''}
          ${it.type === 'relic' ? (s.relics[sel] ? '<span class="small muted">Already in your collection</span>' : `<button class="btn" data-act="place-relic" data-item="${sel}">Place in collection</button>`) : ''}
          ${sel === 'shrine_idol' && s.cult ? `<button class="btn" data-act="raise-idol"${s.location === CULT_SHRINE ? '' : ' disabled'}>Raise it in your shrine</button>` : ''}
          ${here.bank ? `<button class="btn" data-act="deposit" data-item="${sel}">Deposit all</button>` : ''}
          ${here.shop && !SHOPS[here.shop].buysNothing ? `<button class="btn" data-act="sell" data-item="${sel}" data-qty="1">Sell 1 (${it.sell}g)</button><button class="btn" data-act="sell" data-item="${sel}" data-qty="all">Sell all (${fmt(it.sell * s.pack[sel])}g)</button>` : ''}
          <button class="btn danger" data-act="drop" data-item="${sel}">Drop</button>
        </div></div></div>
      <div class="btn-row popup-footer"><button class="btn" data-act="close-popup">Close</button></div></div>`;
  },
  closeItemPopup() {
    const modal = document.getElementById('modal');
    if (modal.querySelector('.item-popup')) modal.innerHTML = '';
    this.itemPopup = null;
    this.popupCount = null;
  },
  // True while the popup is the thing on screen (another modal, like a road event, may have replaced it).
  popupOpen() {
    return !!this.itemPopup && !!document.querySelector('#modal .item-popup');
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
    let html = `<h1>🛒 ${esc(shop.name)}</h1><p class="muted">${esc(shop.keeper)}</p>`;
    if (Game.shopRefuses()) return html + '<p class="warning">The brothers will not sell to you. They make the sign against evil and close the shutters.</p>';
    const cur = Game.currency();
    const funds = Game.funds();
    const curName = cur ? ITEMS[cur].name : 'gold';
    if (shop.kinDiscountAtMadness !== undefined && s.madness >= shop.kinDiscountAtMadness) html += '<p class="small sanity-text">The shopkeeper recognises something in your eyes. "Kin pays less."</p>';
    if (cur) html += `<p class="small">You carry ${fmt(funds)} × ${ITEMS[cur].icon} ${esc(curName)}.</p>`;
    html += '<h2>Buy</h2><div class="cards">';
    for (const entry of shop.stock) {
      const item = entry.item;
      const price = Game.price(entry);
      const it = ITEMS[item];
      const stackable = it.type === 'food' || it.type === 'potion';
      html += `<div class="card"><div class="card-icon">${it.icon}</div><div class="card-name">${esc(it.name)}</div>
        <div class="muted small">${esc(it.desc || statLine(it))}</div>${it.req ? `<div class="small">Requires ${reqLine(it.req)}</div>` : ''}
        <div class="small">${cur ? ITEMS[cur].icon : '💰'} ${fmt(price)} ${esc(curName)}${Game.carries(item) ? ' · <span class="good-text">carried</span>' : ''}</div>
        <div class="btn-row"><button class="btn small" data-act="buy" data-item="${item}" data-qty="1"${funds < price ? ' disabled' : ''}>Buy 1</button>${stackable ? `<button class="btn small" data-act="buy" data-item="${item}" data-qty="10"${funds < price * 10 ? ' disabled' : ''}>Buy 10</button>` : ''}</div></div>`;
    }
    html += '</div>';
    if (shop.buysNothing) return html + '<p class="muted small">The stalls here buy nothing. Not with gold, anyway.</p>';
    html += '<h2>Sell from your pack</h2>';
    const ids = Object.keys(s.pack);
    if (!ids.length) return html + '<p class="muted">You carry nothing to sell.</p>';
    html += '<table class="stats sell">';
    for (const id of ids) {
      html += `<tr><td>${ITEMS[id].icon} ${esc(ITEMS[id].name)}</td><td>× ${fmt(s.pack[id])}</td><td class="muted">${ITEMS[id].sell}g each</td>
        <td><button class="btn small" data-act="sell" data-item="${id}" data-qty="1">Sell 1</button> <button class="btn small" data-act="sell" data-item="${id}" data-qty="all">Sell all</button></td></tr>`;
    }
    return html + '</table>';
  },

  pageQuests() {
    const s = Game.state;
    const ids = Object.keys(s.quests);
    let html = '<h1>📖 Quests</h1>';
    const active = ids.filter(id => s.quests[id].status === 'active');
    const done = ids.filter(id => s.quests[id].status === 'done');
    html += '<h2>Active</h2>';
    html += active.length ? active.map(id => `<div class="quest-offer active"><b>${esc(QUESTS[id].name)}</b> <span class="muted small">from ${esc(NPCS[QUESTS[id].giver].name)} at ${locLink(NPCS[QUESTS[id].giver].location)}</span><div class="small">${esc(Game.questProgressText(id))}</div></div>`).join('') : '<p class="muted">No active quests. Talk to people on your travels, and remember that some only speak to the mad.</p>';
    if (done.length) html += `<h2>Completed</h2><ul>${done.map(id => `<li>${esc(QUESTS[id].name)}</li>`).join('')}</ul>`;
    const endings = Object.keys(s.endings);
    if (endings.length) html += `<h2>Endings reached</h2><ul>${endings.map(e => `<li><b>${esc(ENDINGS[e].title)}</b></li>`).join('')}</ul>`;
    return html;
  },

  relicCollection() {
    let html = '<h2>🏺 Your collection</h2><div class="bestiary">';
    for (const [id, set] of Object.entries(RELIC_SETS)) {
      const done = Game.relicSetDone(id);
      const [effect, value] = set.bonus;
      html += `<div class="beast${done ? ' got' : ''}"><b>${set.icon} ${esc(set.name)}</b> <span class="small ${done ? 'good-text' : 'muted'}">${done ? '✓ ' : ''}${esc(PERK_EFFECTS[effect].text(value))}</span>
        <div class="relics">${Object.entries(set.relics).map(([r, name]) => {
          const placed = Game.state.relics[r];
          const carried = !placed && Game.count(r) > 0;
          return `<div class="relic${placed ? ' placed' : ''}">${placed ? '✦' : carried ? '◇' : '·'} ${esc(name)}${carried ? ` <button class="btn small" data-act="place-relic" data-item="${r}">Place</button>` : ''}</div>`;
        }).join('')}</div></div>`;
    }
    return html + '</div>';
  },

  companionBlock(full) {
    return Game.companions().map(comp => {
      const def = COMPANIONS[comp.id];
      const st = Game.companionStats(comp);
      return `<div class="companion${comp.downed ? ' downed' : ''}"><b>${def.icon} ${esc(def.name)}</b>${comp.downed ? ` <span class="lack-text">(down: ${Game.perk('rally') ? 'catching their breath' : 'rest at an inn'})</span>` : ''}
        <div class="small">❤️ ${comp.hp} / ${st.hp} · 🧠 ${Math.max(0, Math.round(comp.sanity))} / ${st.sanity} · AC ${st.ac} · ${withSign(st.hit)} to hit, ${Game.companionDamageText(comp)}${st.heals ? ` · heals you ${st.heals}` : ''}</div>
        ${full ? `<div class="small muted">${esc(def.desc)}</div><button class="btn small danger" data-act="dismiss" data-id="${comp.id}">Part ways</button>` : ''}</div>`;
    }).join('');
  },

  pageCult() {
    const s = Game.state;
    const cult = s.cult;
    if (!cult) return '<h1>🛐 Your Cult</h1><p class="muted">You have no followers. Yet.</p>';
    const atShrine = s.location === CULT_SHRINE;
    let html = `<h1>🛐 Your Cult</h1><p class="muted">${cult.followers} of at most ${Game.cultCapacity()} followers (more Occultism lets you lead more). They work while you wander, and leave their offerings at your shrine in ${esc(LOCATIONS[CULT_SHRINE].name)}.</p>`;
    html += `<p class="small">Waiting at the shrine: ${cult.gold} gold${Object.entries(cult.stash).map(([it, q]) => `, ${q} × ${ITEMS[it].name}`).join('')}.</p>`;
    html += `<div class="btn-row"><button class="btn" data-act="collect"${atShrine ? '' : ' disabled'}>Collect offerings</button>
      <button class="btn veil-btn" data-act="recruit"${atShrine && cult.followers < Game.cultCapacity() && s.gold >= Game.recruitCost() ? '' : ' disabled'}>Recruit a follower (${Game.recruitCost()} gold, ${CULT_RECRUIT_SANITY} sanity)</button>
      <button class="btn" data-act="raise-idol"${atShrine && Game.count('shrine_idol') && (cult.idols || 0) < MAX_IDOLS ? '' : ' disabled'}>🗿 Raise a Shrine Idol (${cult.idols || 0} / ${MAX_IDOLS}, +${FOLLOWERS_PER_IDOL} followers each)</button></div>`;
    if (!atShrine) html += `<p class="small muted">Recruiting and collecting can only be done at your shrine in ${locLink(CULT_SHRINE)}.</p>`;
    html += '<h2>Tasks</h2><table class="stats">';
    const ids = Object.keys(CULT_TASKS);
    for (const id of ids) {
      const t = CULT_TASKS[id];
      const n = cult.tasks[id] || 0;
      const yields = [t.gold ? `${t.gold} gold` : '', ...Object.entries(t.items || {}).map(([it, q]) => `${q} ${ITEMS[it].name}`)].filter(Boolean).join(', ');
      const other = ids.find(o => o !== id && (cult.tasks[o] || 0) > 0);
      html += `<tr><td>${t.icon} ${t.name}<div class="small muted">${yields} every ${Math.round(t.every / 60000 * 10) / 10} min per follower</div></td><td><b>${n}</b></td>
        <td>${other ? `<button class="btn small" data-act="assign" data-from="${other}" data-to="${id}">+</button>` : ''} ${n > 0 ? `<button class="btn small" data-act="assign" data-from="${id}" data-to="${ids.find(o => o !== id)}">−</button>` : ''}</td></tr>`;
    }
    return html + '</table>';
  },

  pageBestiary() {
    const s = Game.state;
    let html = `<h1>📕 Bestiary</h1><p class="muted small">${Object.keys(s.bestiary).length} of ${Object.keys(BESTIARY).length} pages. Slay a creature to learn about it. The pages read differently to a troubled mind.</p><div class="bestiary">`;
    for (const [id, lore] of Object.entries(BESTIARY)) {
      const m = MONSTERS[id];
      if (s.bestiary[id] === undefined) {
        html += '<div class="beast unknown"><b>❔ ???</b><div class="small muted">An empty page.</div></div>';
        continue;
      }
      const mad = s.madness >= 2 || s.bestiary[id] >= 2;
      html += `<div class="beast${m.eldritch ? ' eldritch' : ''}"><b>${m.icon} ${m.name}</b> <span class="small muted">slain ${fmt(s.kills[id] || 0)}</span>
        <p class="small">${esc(lore.sane)}</p>${mad ? `<p class="small sanity-text"><i>${esc(lore.mad)}</i></p>` : ''}</div>`;
    }
    return html + '</div>';
  },

  pageAchievements() {
    const s = Game.state;
    const got = ACHIEVEMENTS.filter(a => s.achievements[a.id]).length;
    return `<h1>🏆 Achievements</h1><p class="muted small">${got} of ${ACHIEVEMENTS.length}</p><div class="bestiary">${ACHIEVEMENTS.map(a => `<div class="beast${s.achievements[a.id] ? ' got' : ' unknown'}"><b>${s.achievements[a.id] ? a.icon : '🔒'} ${a.name}</b><div class="small muted">${a.desc}</div></div>`).join('')}</div>`;
  },

  pageSettings() {
    return `<h1>⚙️ Settings</h1><p class="small muted">Version ${GAME_VERSION}</p>
      <div class="btn-row"><button class="btn" data-act="save">Save now</button><button class="btn" data-act="export">Export save</button><button class="btn" data-act="import">Import save</button></div>
      <textarea id="save-text" rows="6" placeholder="Paste a save here to import it."></textarea>
      <h2>Sound</h2><button class="btn" data-act="audio">${Game.state.settings.audio ? '🔊 Ambient sound is on' : '🔇 Ambient sound is off'}</button>
      <p class="small muted">Waves, a low drone in dark places, and whispers that grow louder as your sanity fades. Best with headphones.</p>
      <h2>🛠️ Debug</h2><p class="small muted">For testing. Changes your save.</p>
      <div class="btn-row"><button class="btn" data-act="debug-gold" data-amount="1000">+1,000 gold</button><button class="btn" data-act="debug-gold" data-amount="10000">+10,000 gold</button></div>
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
    this.setBar('h-sanity', (s.sanity / Game.maxSanity()) * 100, `👁️ ${fmt(s.sanity)} / ${Game.maxSanity()} · ${Game.mindState().name}`);
    document.getElementById('h-gold').textContent = fmt(s.gold);
    document.body.classList.toggle('low-sanity', s.sanity < 30);

    // Full time of day on wide screens, just the icons on phones.
    const clock = document.getElementById('h-clock');
    const clockText = Game.timeLabel();
    if (clock.dataset.text !== clockText) {
      clock.dataset.text = clockText;
      const icons = `${Game.isNight() ? '🌙' : '☀️'}${Game.isLowTide() ? '🌊↓' : '🌊↑'}${Game.starsRight() ? '🌌' : ''}`;
      clock.innerHTML = `<span class="long">${clockText}</span><span class="short" title="${clockText}">${icons}</span>`;
    }
    document.body.classList.toggle('night', Game.isNight());
    document.getElementById('h-audio').textContent = s.settings.audio ? '🔊' : '🔇';
    let activity = `📍 ${Game.here().name}`;
    const player = document.getElementById('map-player');
    const travel = Game.travelProgress();
    this.updateJourney(travel);
    if (travel) {
      activity = s.travel.event ? '⏸ Something on the road…' : `🧭 Travelling to ${placeName(travel.target)} (${Math.ceil(travel.remaining / 1000 / Game.travelSpeed())}s)`;
      if (player) {
        const a = LOCATIONS[travel.from];
        const b = LOCATIONS[travel.to];
        const x = a.x + (b.x - a.x) * travel.frac;
        const y = a.y + (b.y - a.y) * travel.frac;
        player.setAttribute('cx', x);
        player.setAttribute('cy', y);
        const ring = document.getElementById('map-player-ring');
        ring.setAttribute('cx', x);
        ring.setAttribute('cy', y);
        const trail = document.getElementById('map-trail');
        trail.setAttribute('x1', a.x);
        trail.setAttribute('y1', a.y);
        trail.setAttribute('x2', x);
        trail.setAttribute('y2', y);
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
        const slain = document.getElementById('c-slain');
        if (slain && slain.textContent !== String(s.combat.slain || 0)) slain.textContent = s.combat.slain || 0;
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

  // The journey strip under the header: start, destination, a road that scrolls under a walking figure.
  journeyKey: null,
  traveller(from, to) {
    const road = findRoad(from, to);
    if (to === 'the_abyss' || from === 'the_abyss') return '🫧';
    if (road.cost) return '⛵';
    if (road.veil) return '👣';
    return '🚶';
  },
  updateJourney(travel) {
    const el = document.getElementById('journey');
    if (!travel) {
      if (!el.hidden) {
        el.hidden = true;
        this.journeyKey = null;
      }
      return;
    }
    const t = Game.state.travel;
    const key = `${t.path.join('>')}|${t.leg}`;
    if (key !== this.journeyKey) {
      this.journeyKey = key;
      const start = travel.start;
      const veil = findRoad(travel.from, travel.to).veil;
      el.innerHTML = `<span class="j-end">${Game.state.known[start] ? LOCATIONS[start].icon : '❔'} <span class="j-name">${esc(placeName(start))}</span></span>
        <div class="j-track${veil ? ' veiled' : ''}">
          <div class="j-road"></div><div class="j-fill" id="j-fill"></div>
          ${travel.stops.map((f, i) => `<span class="j-stop" style="left:${f * 100}%" title="${esc(placeName(t.path[i + 1]))}"></span>`).join('')}
          <span class="j-walker" id="j-walker">${this.traveller(travel.from, travel.to)}</span>
        </div>
        <span class="j-end">${Game.state.known[travel.target] ? LOCATIONS[travel.target].icon : '❔'} <span class="j-name">${esc(placeName(travel.target))}</span></span>
        <span class="j-eta" id="j-eta"></span>`;
      el.hidden = false;
    }
    const pct = Math.min(100, travel.overall * 100);
    document.getElementById('j-fill').style.width = pct + '%';
    document.getElementById('j-walker').style.left = pct + '%';
    el.classList.toggle('paused', travel.paused);
    el.classList.toggle('night', Game.isNight());
    const eta = travel.paused ? '⏸ halted' : `${Math.ceil(travel.remaining / 1000 / Game.travelSpeed())}s`;
    const etaEl = document.getElementById('j-eta');
    if (etaEl.textContent !== eta) etaEl.textContent = eta;
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

  showBreak({ madness, derangement }) {
    const d = derangement && DERANGEMENTS[derangement];
    document.getElementById('modal').innerHTML = `<div class="modal-box break"><h2>Your mind breaks</h2>
      <p>The world tilts. For a long moment you are somewhere else, somewhere with too many angles and a sky full of eyes. Then you are back, and nothing looks quite the same.</p>
      <p>You are now <b>${MADNESS_STAGES[madness]}</b>. Your sanity can never rise above ${Game.maxSanity()} again unless your mind is quieted.</p>
      ${d ? `<div class="derangement"><b>${d.icon} ${d.name}</b><div class="small">${d.desc}</div></div>` : ''}
      <p class="small muted">Madness is not the end. Look around: some people will only speak to you now, and some places only appear to eyes like yours.</p>
      <button class="btn" data-act="close-modal">Open your eyes</button></div>`;
  },

  showEnding(id) {
    const e = ENDINGS[id];
    document.getElementById('modal').innerHTML = `<div class="modal-box ending"><h2>${esc(e.title)}</h2><p>${esc(e.text)}</p>
      <p class="small muted">Your story goes on. The world is still yours to wander, and there is another ending waiting on the other path.</p>
      <button class="btn" data-act="close-modal">Continue</button></div>`;
  },

  showCreation() {
    const c = this.creation;
    const option = (kind, id, def, selected) => `<button class="choice${selected ? ' selected' : ''}" data-act="create-${kind}" data-${kind}="${id}"><b>${def.icon} ${def.name}</b><span class="small">${esc(def.desc)}</span></button>`;
    document.getElementById('modal').innerHTML = `<div class="modal-box creation"><h2>Who are you?</h2>
      <h3>Ancestry</h3><div class="choices">${Object.entries(RACES).map(([id, r]) => option('race', id, r, c.race === id)).join('')}</div>
      <h3>Background</h3><div class="choices">${Object.entries(BACKGROUNDS).map(([id, b]) => option('bg', id, b, c.background === id)).join('')}</div>
      <button class="btn" data-act="create-done">Step ashore in Saltmire</button></div>`;
  },

  showEvent() {
    const t = Game.state.travel;
    if (!t || !t.event) return;
    const ev = ROAD_EVENTS[t.event];
    const choices = ev.choices.map((ch, i) => {
      const blocker = Game.choiceBlocker(ch);
      const check = ch.check ? ` <span class="muted">(${SKILLS[ch.check.skill].name} check, DC ${ch.check.dc}: ${Math.round(chanceToHit(Game.checkBonus(ch.check.skill), ch.check.dc) * 100)}%)</span>` : '';
      return `<button class="choice" data-act="event-choice" data-index="${i}"${blocker ? ' disabled' : ''}><b>${esc(ch.label)}</b>${check}${blocker ? ` <span class="lack-text small">${esc(blocker)}</span>` : ''}</button>`;
    }).join('');
    document.getElementById('modal').innerHTML = `<div class="modal-box event"><h2>${ev.icon} ${esc(ev.title)}</h2><p class="small muted">On the road from ${esc(placeName(t.path[t.leg]))} to ${esc(placeName(t.path[t.leg + 1]))}</p>
      <p>${esc(ev.text)}</p><div class="choices single">${choices}</div></div>`;
  },

  showEventResult(lines) {
    document.getElementById('modal').innerHTML = `<div class="modal-box event">${lines.map(l => `<p>${esc(l)}</p>`).join('')}<button class="btn" data-act="close-modal">${Game.state.travel ? 'Continue on your way' : 'Continue'}</button></div>`;
  },

  showExpedition({ id, gold, items, vault }) {
    const ex = EXPEDITIONS[id];
    document.getElementById('modal').innerHTML = `<div class="modal-box ending"><h2>🏛️ ${esc(ex.name)}: complete</h2><p>At the bottom of the dark you find what the dead left behind.${vault ? ' <b>Behind it, a hidden vault: double the treasure.</b>' : ''}</p>
      <p>💰 ${fmt(gold)} gold ${Object.entries(items).map(([it, q]) => itemChip(it, q)).join(' ')}</p><button class="btn" data-act="close-modal">Climb back to the light</button></div>`;
  },

  toast(text) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
  },

  showIntro() {
    document.getElementById('modal').innerHTML = `<div class="modal-box intro"><h2>Echoes of the Abyss</h2>${LORE.map(p => `<p>${p}</p>`).join('')}<button class="btn" data-act="intro-done">Begin</button></div>`;
  },
};
