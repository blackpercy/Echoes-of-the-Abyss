// User interface: renders pages and the world map, updates meters every frame and handles clicks.

const fmt = n => Math.floor(n).toLocaleString('en-GB');
const secs = ms => (ms / 1000).toFixed(1) + 's';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function itemChip(id, qty, cls = '') {
  return `<span class="chip ${cls}" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${qty} × ${esc(ITEMS[id].name)}</span>`;
}

// Tabs that filter the pack and the bank. An item goes in the first category that claims it.
const HERBS = ['grave_moss', 'pale_wort', 'nightshade', 'dream_poppy', 'star_rose', 'ghost_lily', 'hops', 'kelp', 'barley'];
const CLOTH = ['linen', 'kelp_cloth', 'celephais_silk'];
const OCCULT = ['whispering_fragment', 'cultist_text', 'necronomicon_page', 'eldritch_insight', 'veil_pearl', 'dream_dust', 'cat_whisker', 'leng_onyx',
  'kadath_star', 'old_bones', 'saints_knucklebone', 'ancient_bones', 'blessed_ash', 'drowned_idol'];
const ITEM_CATEGORIES = [
  ['equipment', '⚔️', 'Equipment', it => it.type === 'equipment'],
  ['tools', '🧰', 'Tools', it => it.type === 'tool'],
  ['food', '🍖', 'Food', it => it.type === 'food' || it.id.startsWith('raw_') || it.id === 'deep_egg'],
  ['potions', '🧪', 'Potions & scrolls', it => it.type === 'potion' || it.type === 'scroll' || it.type === 'poison'],
  ['arrows', '🏹', 'Arrows', it => it.type === 'arrow'],
  ['herbs', '🌿', 'Herbs & plants', it => HERBS.includes(it.id) || it.type === 'seed'],
  ['wood', '🪵', 'Wood', it => it.id.endsWith('_logs')],
  ['metal', '⛏️', 'Ore & metal', it => /_(ore|bar)$/.test(it.id)],
  ['hides', '🟫', 'Hides & cloth', it => /_(hide|pelt)$/.test(it.id) || CLOTH.includes(it.id)],
  ['occult', '👁️', 'Occult', it => it.type === 'tome' || it.type === 'relic' || OCCULT.includes(it.id)],
  ['trade', '⚖️', 'Trade goods', it => it.type === 'trade'],
  ['other', '📦', 'Other', () => true],
];
function itemCategory(id) {
  return ITEM_CATEGORIES.find(c => c[3](ITEMS[id]))[0];
}

function bar(id, cls, pct, label = '') {
  return `<div class="bar ${cls}"><div class="fill" id="${id}" style="width:${pct}%"></div><span class="bar-label" id="${id}-label">${label}</span></div>`;
}

function statLine(item) {
  const names = { hit: 'to hit', dmg: 'damage', ac: 'AC', ward: 'to sanity saves', slots: 'pack slots' };
  const parts = item.dice ? [`${item.dice} damage`] : [];
  for (const [k, v] of Object.entries(item.stats || {})) parts.push(`${withSign(v)} ${names[k]}`);
  const mods = modsText(item);
  return parts.join(', ') + (mods ? `${parts.length ? '<br>' : ''}<span class="mods">${mods}</span>` : '');
}

// Gear modifiers, e.g. "Mining: 20% faster".
function modsText(item) {
  return (item.mods || []).map(([effect, value, skill]) => `✦ ${skill ? `${SKILLS[skill].name}: ` : ''}${esc(PERK_EFFECTS[effect].text(value, skill))}`).join('<br>');
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
  nextGardenDraw: 0,
  dirty: true,
  lastRender: 0,

  init() {
    document.body.addEventListener('click', e => this.onClick(e));
    document.body.addEventListener('change', e => this.onChange(e));
    document.addEventListener('keydown', e => this.onKey(e));
    // "toggle" does not bubble, so listen in the capture phase for any section being folded or opened.
    document.addEventListener('toggle', e => {
      const id = e.target.dataset && e.target.dataset.section;
      if (!id) return;
      Game.state.settings.sections = Object.assign(Game.state.settings.sections || {}, { [id]: e.target.open });
      if (id.startsWith('nav-')) this.dirty = true;
    }, true);
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
    // On phones, a tap outside the open menu closes it (and does nothing else).
    if (document.body.classList.contains('nav-open') && !e.target.closest('#nav, .menu-btn')) {
      e.preventDefault();
      document.body.classList.remove('nav-open');
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
      case 'quick': Game.quickRestore(d.kind); break;
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
      case 'trade-buy': Game.tradeBuy(d.item, +d.qty); break;
      case 'plant': Game.plantAll(d.seed); break;
      case 'harvest': Game.harvest(+d.plot); break;
      case 'harvest-all': Game.harvestAll(); break;
      case 'pet': Game.setPet(d.id); break;
      case 'delve': Game.startDelve(+d.floor); break;
      case 'spell': Game.prepareSpell(d.id); break;
      case 'bounty': Game.newBounty(false); break;
      case 'bounty-reroll': if (confirm(`Give up this bounty and take another for ${SLAYER_REROLL_GOLD} gold?`)) Game.newBounty(true); break;
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
      case 'item-tab': Game.state.settings.itemTabs = Object.assign(Game.state.settings.itemTabs || {}, { [d.store]: d.tab }); break;
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
    if (e.target.id === 'skill-select') {
      this.page = 'skill-' + e.target.value;
      e.target.blur();
      this.dirty = true;
    }
  },
  // ← and → step between skill pages (not while typing or choosing in a list).
  onKey(e) {
    if (!this.page.startsWith('skill-') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName)) return;
    if (document.getElementById('modal').innerHTML) return;
    if (e.key === 'ArrowLeft') this.stepSkill(-1);
    else if (e.key === 'ArrowRight') this.stepSkill(1);
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
    // Garden plots ripen with real time, so redraw them now and then while they are on screen.
    if (now > this.nextGardenDraw && (this.page === 'skill-gardening' || (this.page === 'here' && Game.hasStation('garden')))) {
      this.nextGardenDraw = now + 1000;
      this.dirty = true;
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
    const sections = s.settings.sections || {};
    const skillsOpen = !!sections['nav-skills'];
    const navBtn = (page, icon, name, extra = '', dim = false) => {
      // While the skill list is folded away, a skill page counts as Character & Skills.
      const active = this.page === page || (page === 'character' && !skillsOpen && this.page.startsWith('skill-')) ? ' active' : '';
      const busy = (page === 'here' && s.action) || (page === 'combat' && s.combat) || (page === 'map' && s.travel)
        || (s.action && page === `skill-${s.action.skill}`) ? ' busy' : '';
      return `<button class="nav-btn${active}${busy}${dim ? ' dim' : ''}" data-act="nav" data-page="${page}"><span class="nav-icon">${icon}</span><span class="nav-name">${name}</span><span class="nav-extra">${extra}</span></button>`;
    };
    let html = `<div class="nav-group"><div class="nav-title">You are at</div>${navBtn('here', here.icon, esc(here.name))}${navBtn('map', '🗺️', 'World Map')}${navBtn('combat', '⚔️', 'Combat', '', !s.combat && !(here.monsters || []).length)}</div>`;
    html += `<div class="nav-group"><div class="nav-title">Yourself</div>${navBtn('pack', '🎒', 'Pack', `${Game.usedSlots()} / ${Game.capacity()}`)}${navBtn('character', '🧝', 'Character & Skills', Game.totalPendingPerks() ? `<span class="perk-badge">★ ${Game.totalPendingPerks()}</span>` : '')}${navBtn('quests', '📖', 'Quests', Object.values(s.quests).filter(q => q.status === 'active').length || '')}${s.cult ? navBtn('cult', '🛐', 'Your Cult', s.cult.followers) : ''}</div>`;
    html += this.navSkills(navBtn, sections);
    const services = [];
    if (here.bank) services.push(navBtn('bank', '🏦', 'Bank'));
    if (here.shop) services.push(navBtn('shop', '🛒', esc(SHOPS[here.shop].name)));
    if (services.length) html += `<div class="nav-group"><div class="nav-title">In ${esc(here.name)}</div>${services.join('')}</div>`;
    html += `<div class="nav-group"><div class="nav-title">Other</div>${navBtn('chronicle', '📜', 'Journal')}${navBtn('settings', '⚙️', 'Settings')}</div>`;
    const nav = document.getElementById('nav');
    const scroll = nav.scrollTop;
    nav.innerHTML = html;
    nav.scrollTop = scroll;
  },
  // Every skill, by group, in folds you can open in the menu. What you leave open is remembered.
  navSkills(navBtn, sections) {
    const groups = SKILL_GROUPS.map(g => {
      const id = `nav-group-${g.name}`;
      const pending = g.skills.reduce((n, sk) => n + Game.pendingPerks(sk), 0);
      const buttons = g.skills.map(sk => navBtn(`skill-${sk}`, SKILLS[sk].icon, SKILLS[sk].name,
        `${Game.pendingPerks(sk) ? '<span class="perk-badge">★</span> ' : ''}${Game.level(sk)}`)).join('');
      return `<details class="nav-fold" data-section="${id}"${sections[id] ? ' open' : ''}><summary class="nav-sub">${esc(g.name)}${pending ? ` <span class="perk-badge">★ ${pending}</span>` : ''}</summary>${buttons}</details>`;
    }).join('');
    return `<details class="nav-group nav-skills" data-section="nav-skills"${sections['nav-skills'] ? ' open' : ''}><summary class="nav-title">Skills</summary>${groups}</details>`;
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
    return `<p>🧭 ${Game.routeSeconds(route.path)}s on the road${route.cost ? ` · 💰 ${route.cost} gold` : ''}${via.length ? `<br><span class="muted small">Via ${via.map(esc).join(' → ')}</span>` : ''}</p>
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
        <text x="855" y="40" class="sea-text">The Black Sea</text>
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
    html += this.buffList();
    const people = Game.npcsHere();
    if (people.length) html += this.section('here-people', `People <span class="small muted">${people.length}</span>`, `<div class="people">${people.map(n => this.npcCard(n)).join('')}</div>`);
    const gather = Object.entries(loc.gather || {});
    if (gather.length) {
      let cards = '';
      for (const [skill, ids] of gather) {
        for (const aid of ids) {
          const a = findAction(skill, aid);
          if (!a.veil || Game.veilSight()) cards += this.actionCard(skill, a);
        }
      }
      html += this.section('here-gather', 'Gather', `<div class="cards">${cards}</div>`);
    }
    for (const st of Object.keys(STATIONS).filter(st => Game.hasStation(st))) {
      const portable = STATIONS[st].portable;
      // Where this workplace comes from when the location itself does not have one.
      const source = (loc.stations || []).includes(st) ? null : portable && Game.carries(portable) ? `your ${ITEMS[portable].name}` : 'the voices in your head';
      const skills = Object.keys(ACTIONS).filter(sk => ACTIONS[sk].some(a => a.station === st));
      let body = '';
      for (const sk of skills) {
        const known = ACTIONS[sk].filter(a => a.station === st && Game.level(sk) >= a.level);
        body += `<p class="small muted">${SKILLS[sk].icon} ${SKILLS[sk].name} ${Game.level(sk)} · <a href="#" class="loc-link" data-act="nav" data-page="skill-${sk}">all ${SKILLS[sk].name.toLowerCase()} recipes</a></p>`;
        body += known.length ? `<div class="cards">${known.map(a => this.actionCard(sk, a)).join('')}</div>` : '<p class="muted small">You know no recipes for this yet.</p>';
      }
      html += this.section(`here-station-${st}`, `${STATIONS[st].icon} ${STATIONS[st].name}${source ? ` <span class="muted small">(${source})</span>` : ''}`, body);
    }
    const services = [];
    if (loc.bank) services.push('<button class="btn" data-act="nav" data-page="bank">🏦 Visit the bank</button>');
    if (loc.shop) services.push(`<button class="btn" data-act="nav" data-page="shop">🛒 ${esc(SHOPS[loc.shop].name)}</button>`);
    if (services.length) html += this.section('here-services', 'Services', `<div class="btn-row">${services.join('')}</div>`);
    if (loc.inn) html += `<p class="small good-text">🛏️ Resting at ${esc(loc.inn)}: health and sanity recover ${INN_REGEN_MULTIPLIER}× faster here. If you fall, you wake here.</p>`;
    if ((loc.monsters || []).length) {
      html += this.section('here-enemies', `Enemies <span class="small muted">${loc.monsters.length}</span>`, `<div class="cards">${loc.monsters.map(m => this.monsterCard(m)).join('')}</div>`);
    }
    if (id === DELVE_LOCATION) html += this.section('here-delve', '🕳️ The Endless Stair', `<div class="cards">${this.delveCard()}</div>`);
    const expeditions = Object.keys(EXPEDITIONS).filter(e => EXPEDITIONS[e].location === id);
    if (expeditions.length) html += this.section('here-expeditions', 'Expeditions', `<div class="cards">${expeditions.map(e => this.expeditionCard(e)).join('')}</div>`);
    if (Game.atHome()) {
      html += this.section('here-house', '🏠 Your house', `<p class="small">${Game.builtRooms().map(r => `${HOUSE_ROOMS[r].icon} ${esc(HOUSE_ROOMS[r].name)}`).join(' · ')}</p>${Game.builtRooms().flatMap(r => HOUSE_ROOMS[r].mods).length ? `<div class="small mods">${modsText({ mods: Game.builtRooms().flatMap(r => HOUSE_ROOMS[r].mods) })}</div>` : ''}<p class="small muted"><a href="#" class="loc-link" data-act="nav" data-page="skill-construction">Build more rooms</a></p>`);
    }
    if (Game.hasStation('garden')) html += this.section('here-garden', '🌱 Your garden', this.gardenBlock());
    if (s.cult && id === CULT_SHRINE) {
      html += `<h2>🛐 Your Hidden Shrine</h2><p class="small">${s.cult.followers} followers. Their offerings: ${s.cult.gold} gold${Object.entries(s.cult.stash).map(([it, q]) => `, ${q} × ${ITEMS[it].name}`).join('')}.</p>
        <div class="btn-row"><button class="btn" data-act="collect">Collect offerings</button><button class="btn" data-act="nav" data-page="cult">Tend your flock</button></div>`;
    }
    let roads = '';
    for (const { road, to } of roadsFrom(id).filter(({ to }) => isVisible(to))) {
      const blocked = Game.roadBlocker(road);
      roads += `<div class="card"><div class="card-name">${s.known[to] ? `${LOCATIONS[to].icon} ${esc(LOCATIONS[to].name)}` : '❔ Unexplored road'}</div>
        <div class="small">🧭 ${Game.roadSeconds(road)}s${Game.roadCost(road) ? ` · 💰 ${Game.roadCost(road)} gold` : road.cost ? ' · <span class="good-text">free passage</span>' : ''}</div>
        ${blocked ? `<div class="small lack-text">🔒 ${esc(blocked)}</div>` : ''}
        <button class="btn" data-act="travel" data-loc="${to}"${blocked ? ' disabled' : ''}>Travel</button></div>`;
    }
    return html + this.section('here-roads', 'Roads', `<div class="cards">${roads}</div>`);
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
    // What a companion for hire would bring along.
    const joining = (npc.interactions || []).map(i => i.gain && i.gain.companion).find(Boolean);
    if (joining && COMPANIONS[joining].mods) html += `<div class="small mods">${modsText(COMPANIONS[joining])}</div>`;
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
    const makes = [...Object.entries(a.output).map(([id, q]) => itemChip(id, q)), a.gold ? `<span class="chip">💰 ${a.gold[0]}–${a.gold[1]} gold</span>` : '',
      a.buff ? `<span class="chip">${a.buff.icon} ${esc(a.buff.name)}: ${esc(Game.effectsText(a.buff.effects))} for ${Math.round(a.buff.ms * (1 + Game.perk('buffTime')) / 60000)} min</span>` : '',
      a.sanityGain && !Object.keys(a.output).length ? '<span class="chip">🧠 peace of mind</span>' : ''].filter(Boolean).join(' ');
    const extras = [
      a.needs ? `<span class="${a.needs.every(i => Game.carries(i)) ? 'muted' : 'lack-text'}">needs ${a.needs.map(i => esc(ITEMS[i].name)).join(', ')}</span>` : '',
      a.hpCost ? `<span class="lack-text">−${a.hpCost} hitpoints</span>` : '',
      a.tideDouble ? `<span class="${Game.isLowTide() ? 'good-text' : 'muted'}">🌊 double at low tide${Game.isLowTide() ? ' (now!)' : ''}</span>` : '',
      a.ambush ? `<span class="lack-text">${Math.round(a.ambush.chance * 100)}% chance a ${esc(MONSTERS[a.ambush.monster].name)} wakes</span>` : '',
      a.maxMadness !== undefined && Game.state.madness > a.maxMadness ? '<span class="sanity-text">the gods do not answer you</span>' : '',
      a.sanityGain ? `<span class="good-text">+${a.sanityGain + Game.perk('dreamRest', skill)} sanity</span>` : '',
      a.risk ? `<span class="lack-text">${(Game.catchChance(skill, a) * 100).toFixed(1).replace(/\.0$/, '')}% risk of being caught</span>` : '',
      a.minMadness ? `<span class="sanity-text">needs madness: ${MADNESS_STAGES[a.minMadness]}</span>` : '',
      a.anywhere && a.effect !== 'build' ? '<span class="muted">anywhere</span>' : '',
      a.goldCost ? `<span class="${Game.state.gold >= a.goldCost ? 'muted' : 'lack-text'}">costs ${fmt(a.goldCost)} gold</span>` : '',
      a.effect === 'raise' ? `<span class="sanity-text">raises a ${esc(COMPANIONS[a.id].name)} for ${Math.round(COMPANIONS[a.id].lasts / 60000)} min</span>` : '',
      a.effect === 'tame' ? (Game.state.pets.owned[a.id] ? '<span class="good-text">tamed ✓</span>' : `<span class="muted">${Math.round(Game.tameChance() * 100)}% chance to tame the ${esc(PETS[a.id].name)}</span>`) : '',
      a.effect === 'build' && Game.state.house && Game.state.house.rooms[a.room] ? '<span class="good-text">built ✓</span>' : '',
      a.effect === 'cure' ? '<span class="good-text">−1 madness</span>' : '',
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
      ${a.nightBest ? `<div class="small ${Game.isNight() ? 'good-text' : 'muted'}">${Game.isNight() ? '🌙 Night: full speed' : '☀️ Daylight: half speed'}</div>` : ''}
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

  // Every skill in menu order, for stepping through them.
  skillOrder() {
    return SKILL_GROUPS.flatMap(g => g.skills);
  },
  // Go to the previous (-1) or next (+1) skill page.
  stepSkill(dir) {
    const order = this.skillOrder();
    const cur = this.page.startsWith('skill-') ? this.page.slice(6) : null;
    if (!cur) return;
    const i = order.indexOf(cur);
    this.page = 'skill-' + order[(i + dir + order.length) % order.length];
    this.dirty = true;
  },
  // At the top of every skill page: step to the neighbours, pick any skill, or jump within this group.
  skillSwitcher(skill) {
    const order = this.skillOrder();
    const i = order.indexOf(skill);
    const prev = order[(i - 1 + order.length) % order.length];
    const next = order[(i + 1) % order.length];
    const group = SKILL_GROUPS.find(g => g.skills.includes(skill));
    const options = SKILL_GROUPS.map(g => `<optgroup label="${esc(g.name)}">${g.skills.map(sk => `<option value="${sk}"${sk === skill ? ' selected' : ''}>${SKILLS[sk].icon} ${esc(SKILLS[sk].name)} (${Game.level(sk)})${Game.pendingPerks(sk) ? ' ★' : ''}</option>`).join('')}</optgroup>`).join('');
    const strip = group.skills.map(sk => {
      const pending = Game.pendingPerks(sk);
      const busy = Game.state.action && Game.state.action.skill === sk;
      return `<button class="skill-chip${sk === skill ? ' current' : ''}${busy ? ' busy' : ''}" data-act="nav" data-page="skill-${sk}" title="${esc(SKILLS[sk].name)}"><span>${SKILLS[sk].icon}</span><span class="chip-level">${Game.level(sk)}</span>${pending ? '<span class="chip-star">★</span>' : ''}</button>`;
    }).join('');
    return `<div class="skill-switcher">
      <button class="btn small" data-act="nav" data-page="skill-${prev}" title="${esc(SKILLS[prev].name)} (←)">◀ ${SKILLS[prev].icon}</button>
      <select id="skill-select" aria-label="Go to skill">${options}</select>
      <button class="btn small" data-act="nav" data-page="skill-${next}" title="${esc(SKILLS[next].name)} (→)">${SKILLS[next].icon} ▶</button>
    </div>
    <div class="skill-strip"><span class="small muted">${esc(group.name)}</span>${strip}</div>`;
  },

  pageSkill(skill) {
    let html = this.skillSwitcher(skill) + this.skillHeader(skill);
    if (TOOLS[skill]) {
      const tier = Game.toolTier(skill);
      html += `<p class="muted small">Tool: ${tier < 0 ? `<span class="lack-text">none, so you need a ${ITEMS[TOOLS[skill][0]].name} in your pack</span>` : `<b>${ITEMS[TOOLS[skill][tier]].name}</b>${TOOL_SPEEDUP[tier] ? ` (−${TOOL_SPEEDUP[tier] * 100}% time)` : ''}`}. Better tools are sold in the shops.</p>`;
    }
    if (skill === 'archaeology') html += this.relicCollection();
    if (SKILLS[skill].type === 'weapon') {
      const lvl = Game.level(skill);
      const wielding = Game.weaponSkill() === skill;
      const traits = {
        blades: `critical hits from ${20 - BLADE_CRIT_LEVELS.filter(l => lvl >= l).length}–20 (wider at levels ${BLADE_CRIT_LEVELS.join(', ')})`,
        polearms: `ignore ${Math.floor(lvl / POLEARM_PIERCE_LEVELS)} AC (one more every ${POLEARM_PIERCE_LEVELS} levels)`,
        bows: `attack ${Math.round(BOW_SPEED_PER_LEVEL * 100 * (lvl - 1))}% faster`,
        staves: `+${Math.round(STAFF_ELDRITCH_PER_LEVEL * 100 * (lvl - 1))}% damage against eldritch beings and +${Math.floor(lvl / STAFF_WARD_LEVELS)} to sanity saves`,
        maces: `${Math.round(Math.min(MAX_STUN, MACE_STUN_PER_LEVEL * lvl) * 100)}% chance that a hit staggers the enemy, so it starts its swing over`,
        unarmed: `your fists roll ${FIST_DICE.filter(([l]) => lvl >= l).pop()[1]} (bigger dice every 10 levels) and attack every ${secs(UNARMED_SPEED)}, and sneak attacks deal +${Math.floor(lvl / UNARMED_SNEAK_LEVELS)}d6`,
      };
      const weapons = (skill === 'unarmed' ? ['👊 Your bare hands'] : []).concat(Object.values(ITEMS).filter(i => i.wtype === skill).map(i => `${i.icon} ${esc(i.name)}`)).join(', ');
      html += `<p class="small">${SKILLS[skill].icon} Trained by fighting with this weapon type (${Math.round(WEAPON_XP_SHARE * 100)}% of each kill's xp). Right now: +${Math.floor(lvl / WEAPON_LEVELS_PER_BONUS)} to hit and damage, ${traits[skill]}.${wielding ? ' <span class="good-text">You are wielding one.</span>' : ''}</p>
        <p class="small muted">Weapons: ${weapons}</p>`;
    }
    if (ATTRIBUTE_SKILLS[skill]) {
      const lvl = Game.level(skill);
      const now = ATTRIBUTE_BONUSES[skill].map(([eff, value, every]) => PERK_EFFECTS[eff].text(every ? value * Math.floor(lvl / every) : Math.round(value * (lvl - 1) * 1000) / 1000)).join(', ');
      const per = ATTRIBUTE_BONUSES[skill].map(([eff, value, every]) => `${PERK_EFFECTS[eff].text(value)} ${every ? `every ${every} levels` : 'per level'}`).join('; ');
      html += `<p class="small">${SKILLS[skill].icon} ${SKILLS[skill].name} gains ${Math.round(ATTRIBUTE_SHARE * 100)}% of the experience you earn in: ${ATTRIBUTE_SKILLS[skill].map(sk => `<a href="#" class="loc-link" data-act="nav" data-page="skill-${sk}">${SKILLS[sk].name}</a>`).join(', ')}.</p>
        <p class="small">It gives ${per}. Right now: <b>${now}</b>.</p>`;
    }
    if (skill === 'wisdom') {
      html += `<p class="small">🦉 Wisdom gains ${Math.round(WISDOM_SHARE * 100)}% of the experience you earn in every other skill. Each level gives +${(WISDOM_XP_PER_LEVEL * 100).toFixed(1)}% experience in all skills: right now <b>+${(WISDOM_XP_PER_LEVEL * 100 * (Game.level('wisdom') - 1)).toFixed(1)}%</b>${Game.perk('allXp') ? `, plus <b>+${Math.round(Game.perk('allXp') * 100)}%</b> from perks` : ''}.</p>`;
    }
    if (skill === 'stealth') {
      html += `<p class="small">🕵️ Every Stealth level above a theft's own makes you ${Math.round(RISK_CUT_PER_LEVEL * 100)}% less likely to be caught (up to ${Math.round(MAX_RISK_CUT * 100)}% with perks).</p>`;
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
        ${Game.companions().length ? this.companionBlock() : '<p class="small muted">You travel alone. Companions can be hired in Ironhold, Port Ulric, the Blackwood, the graveyard and at the Silent Abbey. Others join you once you have helped them, and some only speak to the touched.</p>'}
        <p class="small muted">Right now: +${Math.round(FELLOWSHIP_HP_PER_LEVEL * 100 * (lvl - 1))}% hitpoints, ${withSign(Math.floor(lvl / 10))} to hit, ${withSign(Math.floor(lvl / 8))} damage.</p>`;
    }
    if (skill === 'delving') {
      html += `<p class="small">🕳️ The Endless Stair goes down from ${locLink(DELVE_LOCATION)}. Each floor holds one creature, stronger than the last; every ${DELVE_CHEST_EVERY}th floor ends in a chest and every ${DELVE_CHECKPOINT}th in a warden. You can start again from any ${DELVE_CHECKPOINT}th floor you have reached. Deepest floor: <b>${Game.state.delve.deepest}</b>.</p>
        ${Game.state.location === DELVE_LOCATION || (Game.state.combat && Game.state.combat.delve) ? `<div class="cards">${this.delveCard()}</div>` : ''}`;
    }
    if (skill === 'thaumaturgy') {
      const known = Game.knownSpells();
      html += `<p class="small">✴️ Prepare one spell. In every fight it is cast for you whenever it is ready, paid for in sanity (never when it would bring you within ${SPELL_SANITY_MARGIN} of breaking). Your spells are <b>${Math.round((Game.spellPower() - 1) * 100)}% stronger</b> than a novice's.</p>
        <div class="cards">${Object.entries(SPELLS).map(([id, sp]) => {
          const ready = known.includes(id);
          const on = Game.state.spell === id;
          return `<div class="card${on ? ' active' : ''}${ready ? '' : ' locked'}"><div class="card-icon">${ready ? sp.icon : '🔒'}</div><div class="card-name">${esc(sp.name)}</div>
            <div class="small muted">${esc(sp.desc)}${sp.damage ? ` ${sp.damage} damage.` : ''}</div>
            <div class="small">${ready ? `<span class="sanity-text">−${Game.spellCost(id)} sanity</span> · every ${secs(Game.spellEvery(id))}` : `Requires level ${sp.level}`}</div>
            ${ready ? `<button class="btn small${on ? ' danger' : ''}" data-act="spell" data-id="${on ? '' : id}">${on ? 'Unprepare' : 'Prepare'}</button>` : ''}</div>`;
        }).join('')}</div>`;
    }
    if (skill === 'shieldcraft') {
      html += `<p class="small">🛡️ With a shield in your off hand, every blow that would hit you may be blocked: now <b>${Math.round(Game.blockChance() * 100)}%</b>${Game.hasShield() ? '' : ' (you carry no shield)'}. Shieldcraft grows with every block, and a little with every kill while you carry a shield. Shields are smithed in every metal; an oak buckler is carved at a workbench.</p>`;
    }
    if (skill === 'toxicology') {
      html += `<p class="small">☠️ Brew poisons in an alchemy lab, then coat your weapon from your pack or in a fight. Every hit then deals extra poison damage until the coat wears off. Your poisons are ${Math.round(POISON_POWER_PER_LEVEL * 100 * (Game.level('toxicology') - 1) + Game.perk('poisonPower') * 100)}% stronger.${Game.poisonDamage() ? ` Right now: <b>+${Game.poisonDamage()} poison damage</b>.` : ''}</p>`;
    }
    if (skill === 'investigation') {
      html += `<p class="small">🔎 Ask around in towns to learn the trade. Each case has three clues, found in different places; carry all three to where the case is solved.</p>
        <table class="stats">${Object.entries(CASES).map(([id, c]) => `<tr><td>📁 ${esc(c.name)}</td><td class="${Game.level('investigation') >= c.level ? '' : 'lack-text'}">level ${c.level}</td><td class="small">${Game.caseSolved(id) ? '<span class="good-text">solved ✓</span>' : `${Object.entries(c.clues).map(([clue, [loc, name]]) => `${Game.count(clue) ? '✓' : '·'} ${esc(name)} (${locLink(loc)})`).join(', ')} → solve at ${locLink(c.solveAt)}`}</td></tr>`).join('')}</table>`;
    }
    if (skill === 'linguistics') {
      html += `<p class="small">🗣️ Every tongue you master helps the skills that use it.</p>
        <table class="stats">${LANGUAGES.map(l => `<tr><td>${l.icon} ${esc(l.name)}</td><td class="${Game.level('linguistics') >= l.level ? 'good-text' : 'muted'}">${Game.level('linguistics') >= l.level ? 'known' : `level ${l.level}`}</td><td class="small mods">${modsText(l)}</td></tr>`).join('')}</table>`;
    }
    if (skill === 'divination') {
      html += `<p class="small">🔮 Omens bless you for a while; the tarot turns up a different card each time. Every ${DIVINATION_SCOUT_LEVELS} levels give +1 to road-event checks (now ${withSign(Math.floor(Game.level('divination') / DIVINATION_SCOUT_LEVELS))}). Scrying shows you a place you have not yet found.</p>${this.buffList()}`;
    }
    if (skill === 'meditation') {
      html += `<p class="small">🧘 Meditation restores sanity anywhere. When your mind breaks, there is a <b>${Math.round(Game.derangementResist() * 100)}%</b> chance it breaks cleanly, without a new derangement (${Math.round(MEDITATION_RESIST_PER_LEVEL * 100)}% per level, up to ${Math.round(MAX_DERANGEMENT_RESIST * 100)}%).</p>`;
    }
    if (skill === 'beekeeping') {
      html += '<p class="small">🐝 Keep bees at the apiary in Hollowfen, or build one at home. Render the comb into honey and wax, and dip the wax into candles.</p>';
    }
    if (skill === 'husbandry') {
      html += '<p class="small">🐑 Work the pastures of Dunwich, or build a barn at home. Wool goes to the loom, eggs and beef to the fire. The Whateleys keep a herd on Sentinel Hill that only the touched can tend.</p>';
    }
    if (skill === 'glassblowing') {
      html += '<p class="small">🫙 Melt sand at a forge. Shovel it on Saltmire Shore or in Port Ulric. The telescope, the stained-glass saint and the Lamp of Alhazred help just by being carried.</p>';
    }
    if (skill === 'fletching') {
      html += `<p class="small">🪶 Fletch arrows at a workbench, ${ARROWS_PER_BATCH} at a time. When you fight with a bow, the best arrows in your pack are shot first, one per shot, adding their damage (now +${Game.perk('arrowDmg')} more from Fletching). Without arrows a bow still works, just without the bonus.</p>`;
    }
    if (skill === 'gardening') {
      html += `<p class="small">🌱 Sow seeds in garden plots in Hollowfen, or in the kitchen garden of your own house. They grow in real time, even while you are away. Or <b>tend the garden</b> as an activity: it harvests, sows again and weeds, so every plot grows ${TEND_BOOST_MS / 1000}s faster each round. You have <b>${Game.gardenPlots()} plots</b> (one more every ${GARDEN_LEVELS_PER_PLOT} levels). Seeds are sold in Hollowfen and found while foraging.</p>
        ${Game.hasStation('garden') ? this.gardenBlock() : `<p class="small muted">Your plots: ${Game.plots().map(p => p ? `${ITEMS[CROPS[p.seed][0]].icon}${Game.plotReady(p) ? '✓' : ''}` : '·').join(' ')}. Travel to ${locLink('hollowfen')}${Game.state.house && Game.state.house.rooms.garden ? ` or ${locLink(Game.state.house.location)}` : ''} to tend them.</p>`}
        <table class="stats">${Object.entries(CROPS).map(([seed, [crop, qty, mins, level, xp]]) => `<tr><td>${ITEMS[crop].icon} ${esc(ITEMS[crop].name)}</td><td class="${Game.level('gardening') >= level ? '' : 'lack-text'}">level ${level}</td><td class="muted">${qty} per plot · ${Math.round(Game.growTime(seed) / 60000)} min · ${xp} xp</td></tr>`).join('')}</table>`;
    }
    if (skill === 'astronomy') {
      const lvl = Game.level('astronomy');
      const days = (STARS_RIGHT_EVERY - 1 - Game.dayIndex() % STARS_RIGHT_EVERY);
      html += `<p class="small">🔭 The sky is best read at night; by day you can still work, at half speed (${Game.isNight() ? '<b>it is night now</b>' : 'it is day now'}). Every level gives +${(ASTRONOMY_ELDRITCH_PER_LEVEL * 100).toFixed(1)}% damage against eldritch beings (now +${Math.round(ASTRONOMY_ELDRITCH_PER_LEVEL * 100 * (lvl - 1))}%).
        ${lvl >= ASTRONOMY_FORECAST_LEVEL ? `<br>🌌 ${Game.starsRight() ? '<b>The stars are right tonight.</b>' : `The stars will be right on the night of ${days === 0 ? 'today' : `day ${Game.dayIndex() + 1 + days}`}.`}` : `<br>At level ${ASTRONOMY_FORECAST_LEVEL} you will know when the stars will be right.`}</p>`;
    }
    if (skill === 'jewelcrafting') {
      html += '<p class="small">💎 Work at a jeweller\'s bench in Ironhold or Port Ulric, or anywhere with a loupe. Each piece carries its own power, like the gear from the dungeons.</p>';
    }
    if (skill === 'tinkering') {
      html += '<p class="small">⚙️ Build at a workbench. A gadget helps you just by being in your pack; one of each kind counts.</p>';
    }
    if (skill === 'construction') {
      const h = Game.state.house;
      html += `<p class="small">🏗️ Take building jobs in town to learn the trade. Then build a house in any town (500 gold and materials) and add rooms to it. Rooms give your home their workplaces and bonuses; the bonuses for a skill work only at home. Stone is quarried in Ironhold, the Deep Mines and Dunwich.</p>
        ${h ? `<p class="small">🏠 Your house stands in <b>${locLink(h.location)}</b>. Rooms: ${Game.builtRooms().map(r => `${HOUSE_ROOMS[r].icon} ${esc(HOUSE_ROOMS[r].name)}`).join(', ')}.</p>` : '<p class="small muted">You have no house yet.</p>'}`;
    }
    if (skill === 'taming') {
      const pets = Game.state.pets;
      html += `<p class="small">🐾 Leave bait where a beast can find it and wait. Each attempt has a <b>${Math.round(Game.tameChance() * 100)}%</b> chance; once tamed, keep training on it for xp. One pet travels with you at a time.</p>
        <div class="cards">${Object.entries(PETS).map(([id, p]) => `<div class="card${pets.active === id ? ' active' : ''}${pets.owned[id] ? '' : ' locked'}"><div class="card-icon">${pets.owned[id] ? p.icon : '❔'}</div><div class="card-name">${esc(p.name)}</div>
          <div class="small muted">${esc(p.desc)}</div><div class="small mods">${modsText(p)}</div>
          ${pets.owned[id] ? `<button class="btn small" data-act="pet" data-id="${pets.active === id ? '' : id}">${pets.active === id ? 'Leave at home' : 'Take along'}</button>` : '<div class="small muted">Not yet tamed</div>'}</div>`).join('')}</div>`;
    }
    if (skill === 'slaying') {
      const t = Game.state.slayer.task;
      const town = Game.here().kind === 'town';
      html += `<p class="small">🎯 Take a bounty from the board in any town and hunt down your quarry. Against it you have ${withSign(Math.floor(Game.level('slaying') / SLAYER_HIT_LEVELS) + 1)} to hit and ${withSign(Math.floor(Game.level('slaying') / SLAYER_DMG_LEVELS) + Game.perk('slayDmg'))} damage. Bounties completed: ${Game.state.slayer.done}.</p>
        ${t ? `<p>Current bounty: <b>${MONSTERS[t.monster].icon} ${esc(MONSTERS[t.monster].name)}</b> · ${t.done} / ${t.need} slain. <span class="muted small">Found at ${Object.keys(LOCATIONS).filter(l => (LOCATIONS[l].monsters || []).includes(t.monster) && Game.state.known[l]).map(locLink).join(', ')}</span></p>` : '<p class="muted">You have no bounty.</p>'}
        <div class="btn-row">${t ? `<button class="btn small" data-act="bounty-reroll"${town ? '' : ' disabled'}>Ask for another (${SLAYER_REROLL_GOLD} gold)</button>` : `<button class="btn small" data-act="bounty"${town ? '' : ' disabled'}>Take a bounty</button>`}${town ? '' : ' <span class="small muted">The boards are in towns.</span>'}</div>`;
    }
    if (skill === 'bardic') {
      html += '<p class="small">🎻 Perform on the stage of an inn in Saltmire, Ironhold, Port Ulric, Hollowfen or Dunwich, with a lute in your pack. Every song leaves a mood behind that helps you or your companions.</p>' + this.buffList();
    }
    if (skill === 'medicine') {
      html += `<p class="small">🩺 Every level makes food and potions heal ${Math.round(MEDICINE_HEAL_PER_LEVEL * 100)}% more (now +${Math.round(MEDICINE_HEAL_PER_LEVEL * 100 * (Game.level('medicine') - 1))}%). ${Game.level('medicine') >= MEDICINE_RALLY_LEVEL ? 'Your downed companions get back up after a short rest, without an inn.' : `From level ${MEDICINE_RALLY_LEVEL}, downed companions get back up after a short rest, without an inn.`} At level 30 you can treat a broken mind in a chapel.</p>`;
    }
    if (skill === 'necromancy') {
      html += `<p class="small">💀 Raise thralls in a ritual circle. They fight beside you without taking a companion's place, until they crumble or are torn apart. You can hold <b>${Game.thrallCapacity()}</b> at a time (one more every ${THRALL_LEVELS_PER_SLOT} levels), and you learn while they fight. While a thrall walks with you, Faith is closed to you.</p>
        ${Game.thralls().length ? this.companionBlock() : ''}`;
    }
    if (skill === 'gravedigging') {
      html += '<p class="small">⚰️ Every grave you open may hold an occupant who objects. If something wakes, you fight it then and there; win and you dig on. Bones feed ink, rites and the market under the hill.</p>';
    }
    if (skill === 'tidecombing') {
      html += `<p class="small">🐚 The tide turns every few minutes. While it is out, the strandline gives up twice as much, and the wreck and the black sand can be reached at all. Right now: <b>${Game.isLowTide() ? 'low tide' : 'high tide'}</b>.</p>`;
    }
    if (skill === 'tailoring') {
      html += '<p class="small">🧵 Robes and hoods protect less than metal, but turn aside madness far better. Work at a loom in town, or anywhere with a sewing kit. Linen is sold in shops; kelp-cloth comes from the shore.</p>';
    }
    if (skill === 'inscription') {
      html += `<p class="small">✒️ Scrolls are read once, from your pack or in the middle of a fight. Fire and banishing scrolls strike the enemy you are fighting; the rest heal you or bless you for a while.${Game.perk('scrollPower') ? ` Your scrolls are <b>${Math.round(Game.perk('scrollPower') * 100)}% stronger</b>.` : ''}</p>`;
    }
    if (skill === 'brewing') {
      html += '<p class="small">🍺 Brew in the cellars of inns. A drink restores sanity, and most leave you a little worse at aiming for a while. The finest have stranger effects.</p>';
    }
    if (skill === 'trading') {
      const goods = Object.entries(TRADE_GOODS).map(([id, g]) => `<tr><td>${g.icon} ${esc(g.name)}</td><td>${Game.level('trading') >= g.level ? '' : `<span class="lack-text">level ${g.level}</span> `}${esc(LOCATIONS[g.origin].name)} ${g.base}g</td><td class="muted">${Object.entries(g.prices).map(([loc, p]) => `${esc(LOCATIONS[loc].name)} ${p}g`).join(' · ')}</td></tr>`).join('');
      html += `<p class="small">⚖️ Every town makes some goods cheaply and pays well for others. Buy them at the market in the shop, carry them to a town that wants them, and sell. You earn Trading xp for every gold you make selling anything, and more for goods sold where they are wanted. Your prices are now <b>${Math.round(Game.haggle() * 100)}% better</b> in every shop.</p>
        ${this.section('trade-goods', 'Trade goods: where they are made, and what others pay', `<table class="stats">${goods}</table>`, false)}`;
    }
    if (skill === 'sailing') {
      html += `<p class="small">⛵ You learn Sailing at sea: ${SAILING_XP_PER_SEA_SECOND} xp per second on a sea road. You sail ${Math.round(SAILING_SPEED_PER_LEVEL * 100 * (Game.level('sailing') - 1))}% faster than a landlubber${Game.level('sailing') >= SAILING_FREE_PASSAGE ? ', and you work your passage on any ship for free' : `, and from level ${SAILING_FREE_PASSAGE} you work your passage for free`}. Port Ulric lies across the bay from Saltmire Shore.</p>`;
    }
    if (skill === 'faith') {
      html += `<p class="small">🕯️ Pray in a chapel, or anywhere with prayer beads. Every ${FAITH_WARD_LEVELS} Faith levels give +1 to sanity saves (now ${withSign(Math.floor(Game.level('faith') / FAITH_WARD_LEVELS))}). The gods do not answer a mind that is ${MADNESS_STAGES[FAITH_MAX_MADNESS + 1]} or worse.</p>`;
    }
    if (skill === 'lore') {
      const lvl = Game.level('lore');
      html += `<p class="small">📖 Carry a forbidden tome to a library and read it. The tome is never used up, but your sanity is, and it does not recover while you read. Every 10 levels you see through the Veil ${LORE_VEIL_PER_TEN} sanity sooner (now +${LORE_VEIL_PER_TEN * Math.floor(lvl / 10)}).
        ${lvl >= THIRD_CELLAR_LORE ? 'You know where the stair beneath the Silent Abbey leads.' : `At level ${THIRD_CELLAR_LORE} you will understand what the brothers of the Silent Abbey will not talk about.`}</p>`;
    }
    if (skill === 'ritualism') {
      html += `<p class="small">🔯 Rites repeat like any other activity, as long as you have the offerings. Each one renews its blessing, which lasts a while after you stop. Draw a circle in the graveyard, at the crater, in the grove or the lighthouse, or anywhere with ritual chalk.</p>${this.buffList()}`;
    }
    if (skill === 'occultism') {
      html += '<p class="warning">👁️ Occult study costs sanity, and your sanity does not recover while you study. Every Occultism level beyond the first grants +1% damage against beings from beyond, and every five levels add +1 to your sanity saves.</p>';
    }
    html += this.skillTree(skill);
    if (ACTIONS[skill]) html += `<h2>Activities</h2><div class="cards">${ACTIONS[skill].map(a => this.actionCard(skill, a)).join('')}</div>`;
    return html;
  },

  // One tier every five levels; pick one of two perks in each.
  skillTree(skill) {
    const lvl = Game.level(skill);
    const pending = Game.pendingPerks(skill);
    const respec = Game.respecCost(skill);
    let html = `<p class="small muted">Every ${PERK_EVERY} levels you choose one of two perks. The choice lasts until you pay to unlearn it.</p><div class="tree">`;
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
    const title = `🌳 ${SKILLS[skill].name} perks ${pending ? `<span class="perk-badge">★ ${pending} to choose</span>` : ''}`;
    return this.section(`tree-${skill}`, title, html, !ACTIONS[skill], 'skill-tree', pending > 0);
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
    const chance = chanceToHit(Game.attackBonusVs(m), Game.effectiveAc(m));
    const theirs = chanceToHit(Game.monsterHit(m), Game.armourClass());
    const foods = Object.keys(s.pack).filter(id => Game.isFood(id));
    const potions = Object.keys(s.pack).filter(id => ITEMS[id].type === 'potion' || ITEMS[id].type === 'scroll');
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
        <div class="small muted">${withSign(Game.attackBonusVs(m))} to hit (${Math.round(chance * 100)}% vs AC ${Game.effectiveAc(m)}) · ${Game.damageText()} · AC ${Game.armourClass()}${m.eldritch ? ` · ${withSign(Game.wits())} sanity saves` : ''}</div>
        <div class="small muted">${SKILLS[Game.weaponSkill()].icon} ${SKILLS[Game.weaponSkill()].name} ${Game.level(Game.weaponSkill())} · crits on ${Game.critFrom() === 20 ? '20' : `${Game.critFrom()}–20`}${Game.pierce() ? ` · ignores ${Game.pierce()} AC` : ''}${Game.stunChance() ? ` · ${Math.round(Game.stunChance() * 100)}% stagger` : ''} · attacks every ${secs(Game.playerStats().speed)}</div>
        ${this.fightExtras()}
        ${this.buffList()}
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
    if (s.combat && s.combat.delve) html += `<div class="cards">${this.delveCard()}</div>`;
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
      <p class="small muted">${esc(race.desc)}${bg ? ' ' + esc(bg.desc) : ''}</p><div class="two-col"><div>`;
    html += this.section('char-equipment', 'Equipment', `<div class="slots">${Object.entries(SLOTS).map(([slot, name]) => {
      const item = s.equipment[slot];
      return `<div class="slot"><div class="muted small">${name}</div>${item
        ? `<div>${ITEMS[item].icon} <b>${esc(ITEMS[item].name)}</b></div><div class="small">${statLine(ITEMS[item])}</div><button class="btn small" data-act="unequip" data-slot="${slot}">Unequip</button>`
        : '<div class="muted">Empty</div>'}</div>`;
    }).join('')}</div>`);
    html += this.section('char-fight', 'In a fight', `<table class="stats">
      <tr><td>Hitpoints</td><td>${fmt(s.hp)} / ${Game.maxHp()}</td></tr>
      <tr><td>Sanity</td><td>${fmt(s.sanity)} / ${Game.maxSanity()}</td></tr>
      <tr><td>Proficiency</td><td>${withSign(Game.proficiency())}</td></tr>
      <tr><td>Attack roll</td><td>d20 ${withSign(Game.attackBonus())}</td></tr>
      <tr><td>Damage</td><td>${Game.damageText()}</td></tr>
      <tr><td>Armour class</td><td>${Game.armourClass()}</td></tr>
      <tr><td>Sanity save</td><td>d20 ${withSign(Game.wits())}</td></tr>
      <tr><td>Damage vs eldritch</td><td>+${Math.round(Game.eldritchBonus() * 100)}%</td></tr>
      <tr><td>Weapon skill</td><td>${SKILLS[Game.weaponSkill()].icon} ${SKILLS[Game.weaponSkill()].name} ${Game.level(Game.weaponSkill())} · crits on ${Game.critFrom() === 20 ? '20' : `${Game.critFrom()}–20`}${Game.pierce() ? ` · ignores ${Game.pierce()} AC` : ''}${Game.stunChance() ? ` · ${Math.round(Game.stunChance() * 100)}% stagger` : ''}</td></tr>
      <tr><td>Respawn point</td><td>${esc(LOCATIONS[s.home].name)}</td></tr>
    </table>`);
    if (Object.keys(s.buffs).length) html += this.section('char-buffs', 'Blessings and effects', this.buffList());
    html += this.section('char-mind', 'Mind', `<table class="stats">
      <tr><td>State</td><td>${Game.mindState().name}${Game.veilSight() ? ' · <span class="sanity-text">sees through the Veil</span>' : ''}</td></tr>
      <tr><td>Madness</td><td>${MADNESS_STAGES[s.madness]} (${s.madness} / ${MADNESS_STAGES.length - 1})</td></tr>
    </table>`);
    if (s.madness) {
      html += this.section('char-gifts', `Gifts of madness <span class="small muted">${s.madness}</span>`,
        MADNESS_ABILITIES.slice(1, s.madness + 1).map(a => `<div class="derangement"><b>✦ ${a.name}</b><div class="small muted">${a.desc}</div></div>`).join(''), false);
    }
    html += this.section('char-derangements', `Derangements <span class="small muted">${s.derangements.length}</span>`,
      s.derangements.length ? s.derangements.map(d => `<div class="derangement"><b>${DERANGEMENTS[d].icon} ${DERANGEMENTS[d].name}</b><div class="small muted">${DERANGEMENTS[d].desc}</div></div>`).join('') : '<p class="small muted">No derangements. Yet.</p>', false);
    if (s.companions.length) {
      html += this.section('char-companions', `Companions <span class="small muted">${s.companions.length} / ${Game.companionCapacity()}</span>`, this.companionBlock(true), false);
    }
    html += '</div><div>';
    let skills = '<table class="stats">';
    for (const g of SKILL_GROUPS) {
      skills += `<tr><td colspan="3" class="muted small">${g.name}</td></tr>`;
      for (const id of g.skills) {
        const lvl = Game.level(id);
        const pct = lvl >= MAX_LEVEL ? 100 : ((s.skills[id].xp - XP_TABLE[lvl]) / (XP_TABLE[lvl + 1] - XP_TABLE[lvl])) * 100;
        const pending = Game.pendingPerks(id);
        skills += `<tr><td><a href="#" class="loc-link" data-act="nav" data-page="skill-${id}">${SKILLS[id].icon} ${SKILLS[id].name}</a>${pending ? ` <span class="perk-badge" title="Perks waiting to be chosen">★ ${pending}</span>` : ''}</td><td>${lvl}</td><td class="skill-mini"><div class="bar progress"><div class="fill" style="width:${pct}%"></div></div></td></tr>`;
      }
    }
    html += this.section('char-skills', 'Skills', skills + '</table>');
    const kills = Object.entries(s.kills);
    if (kills.length) {
      html += this.section('char-slain', `Slain <span class="small muted">${fmt(Game.totalKills())}</span>`,
        `<table class="stats">${kills.map(([id, n]) => `<tr><td>${MONSTERS[id].icon} ${MONSTERS[id].name}</td><td>${fmt(n)}</td></tr>`).join('')}</table>`, false);
    }
    return html + '</div></div>';
  },

  // Spell, shield, arrows and poison, when you have them, under your line in a fight.
  fightExtras() {
    const parts = [];
    const spell = Game.state.spell;
    if (spell) parts.push(`${SPELLS[spell].icon} ${SPELLS[spell].name} (−${Game.spellCost(spell)} sanity, every ${secs(Game.spellEvery(spell))})`);
    if (Game.hasShield()) parts.push(`🛡️ ${Math.round(Game.blockChance() * 100)}% block`);
    const arrow = Game.bestArrow();
    if (arrow) parts.push(`🏹 ${ITEMS[arrow].name} ×${fmt(Game.count(arrow))} (+${Game.arrowDamage(ITEMS[arrow], { eldritch: false })})`);
    if (Game.poisonDamage()) parts.push(`☠️ +${Game.poisonDamage()} poison`);
    return parts.length ? `<div class="small muted">${parts.join(' · ')}</div>` : '';
  },

  // The Endless Stair: the fight on your current floor, or where you can start.
  delveCard() {
    const s = Game.state;
    if (s.combat && s.combat.delve) {
      return `<div class="card eldritch active fighting"><div class="fight-head"><span class="card-icon">🕳️</span><div><div class="card-name">The Endless Stair · floor ${s.delve.floor}</div>
        <div class="small muted">Deepest: ${s.delve.deepest} · next chest on floor ${Math.ceil(s.delve.floor / DELVE_CHEST_EVERY) * DELVE_CHEST_EVERY}</div></div></div>
        ${this.fightPanel('Climb back up')}</div>`;
    }
    const here = s.location === DELVE_LOCATION;
    return `<div class="card eldritch"><div class="card-icon">🕳️</div><div class="card-name">The Endless Stair</div>
      <p class="small">A stair behind the last shelf, going down further than the hill is tall. Deepest floor reached: <b>${s.delve.deepest}</b>.</p>
      <div class="btn-row">${Game.delveCheckpoints().map(f => `<button class="btn small" data-act="delve" data-floor="${f}"${here && !s.travel ? '' : ' disabled'}>Start at floor ${f}</button>`).join('')}</div></div>`;
  },

  // Your garden plots, with what grows in them and the seeds you can sow.
  gardenBlock() {
    const plots = Game.plots();
    const seeds = Object.keys(CROPS).filter(seed => Game.count(seed) > 0);
    const empty = plots.filter(p => !p).length;
    const cells = plots.map((p, i) => {
      if (!p) return '<div class="plot empty"><div class="plot-icon">🟫</div><div class="small muted">Empty</div></div>';
      const crop = ITEMS[CROPS[p.seed][0]];
      const left = Game.growTime(p.seed) - (Date.now() - p.planted);
      return Game.plotReady(p)
        ? `<button class="plot ready" data-act="harvest" data-plot="${i}"><div class="plot-icon">${crop.icon}</div><div class="small good-text">Harvest</div></button>`
        : `<div class="plot growing"><div class="plot-icon">🌱</div><div class="small muted">${esc(crop.name)}<br>${left >= 60000 ? `${Math.ceil(left / 60000)} min` : `${Math.ceil(left / 1000)}s`}</div></div>`;
    }).join('');
    const sow = seeds.map(seed => {
      const ok = Game.level('gardening') >= CROPS[seed][3];
      return `<button class="btn small" data-act="plant" data-seed="${seed}"${ok && empty ? '' : ' disabled'} title="${ok ? '' : `Needs Gardening ${CROPS[seed][3]}`}">${ITEMS[CROPS[seed][0]].icon} Sow ${esc(ITEMS[seed].name)} (${fmt(Game.count(seed))})</button>`;
    }).join('');
    return `<div class="plots">${cells}</div>
      <div class="btn-row">${plots.some(p => Game.plotReady(p)) ? '<button class="btn small" data-act="harvest-all">Harvest everything ready</button>' : ''}${sow || '<span class="small muted">You carry no seeds.</span>'}</div>`;
  },

  // Active blessings, brews and scrolls, with the time left on each.
  buffList() {
    const buffs = Object.values(Game.state.buffs);
    if (!buffs.length) return '';
    return `<div class="buffs">${buffs.map(b => `<span class="chip buff" title="${esc(Game.effectsText(b.effects))}">${b.icon} ${esc(b.name)} <span class="muted">${b.left >= 60000 ? `${Math.ceil(b.left / 60000)} min` : `${Math.ceil(b.left / 1000)}s`}</span></span>`).join(' ')}</div>`;
  },

  // The goods this town makes, sold cheaply to traders.
  marketBlock() {
    const goods = Game.marketGoods();
    if (!goods.length) return '';
    const cards = goods.map(id => {
      const g = TRADE_GOODS[id];
      const price = Game.tradeBuyPrice(id);
      const supply = Game.tradeSupply(id);
      const locked = Game.level('trading') < g.level;
      const best = Object.entries(g.prices).sort((a, b) => b[1] - a[1])[0];
      return `<div class="card${locked ? ' locked' : ''}"><div class="card-icon">${g.icon}</div><div class="card-name">${esc(g.name)}</div>
        <div class="small">💰 ${fmt(price)} gold · ${supply} / ${Game.tradeSupplyMax()} in stock</div>
        <div class="small muted">Best price: ${esc(LOCATIONS[best[0]].name)}, ${best[1]}g${Game.carries(id) ? ` · carrying ${fmt(Game.count(id))}` : ''}</div>
        ${locked ? `<div class="small lack-text">Requires Trading ${g.level}</div>` : `<div class="btn-row"><button class="btn small" data-act="trade-buy" data-item="${id}" data-qty="1"${supply && Game.state.gold >= price ? '' : ' disabled'}>Buy 1</button><button class="btn small" data-act="trade-buy" data-item="${id}" data-qty="${supply}"${supply && Game.state.gold >= price ? '' : ' disabled'}>Buy all you can</button></div>`}</div>`;
    }).join('');
    return `<h2>⚖️ Market</h2><p class="small muted">Goods made here, cheap. Carry them to a town that wants them. Stock refills over time.</p><div class="cards">${cards}</div>`;
  },

  // A collapsible section. Whether you left it open or folded is remembered in your save.
  // forceOpen opens it regardless (e.g. a skill tree with a perk waiting).
  section(id, title, body, defaultOpen = true, cls = '', forceOpen = false) {
    const saved = Game.state.settings.sections || {};
    const open = forceOpen || (id in saved ? saved[id] : defaultOpen);
    return `<details class="section ${cls}" data-section="${id}"${open ? ' open' : ''}><summary><h2>${title}</h2></summary>${body}</details>`;
  },

  // Category tabs for a store (pack or bank), showing only categories that hold something.
  // Returns the tab buttons and the store filtered to the chosen tab.
  itemTabs(store, key) {
    const counts = {};
    for (const id of Object.keys(store)) counts[itemCategory(id)] = (counts[itemCategory(id)] || 0) + 1;
    const tabs = Game.state.settings.itemTabs || {};
    const tab = counts[tabs[key]] ? tabs[key] : 'all';
    const used = ITEM_CATEGORIES.filter(c => counts[c[0]]);
    const btn = (id, label, n) => `<button class="btn small${tab === id ? ' selected' : ''}" data-act="item-tab" data-store="${key}" data-tab="${id}">${label} <span class="muted">${n}</span></button>`;
    const html = used.length > 1 ? `<div class="btn-row tabs item-tabs">${btn('all', 'All', Object.keys(store).length)}${used.map(c => btn(c[0], `${c[1]} ${c[2]}`, counts[c[0]])).join('')}</div>` : '';
    const filtered = tab === 'all' ? store : Object.fromEntries(Object.entries(store).filter(([id]) => itemCategory(id) === tab));
    return { html, store: filtered };
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
    const tabs = this.itemTabs(s.pack, 'pack');
    html += tabs.html;
    let grid = this.itemGrid(tabs.store, 'select', this.itemPopup);
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
          ${it.type === 'poison' ? `<button class="btn" data-act="use" data-item="${sel}">Coat your weapon</button>` : ''}
          ${it.type === 'scroll' ? `<button class="btn" data-act="use" data-item="${sel}"${it.damage && !(s.combat && !s.combat.respawn) ? ' disabled title="Read it in a fight"' : ''}>Read aloud</button>` : ''}
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
    const tabs = this.itemTabs(s.bank, 'bank');
    return html + tabs.html + this.itemGrid(tabs.store, 'select-bank', sel) + '</div></div>';
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
    html += this.marketBlock();
    html += '<h2>Buy</h2><div class="cards">';
    for (const entry of shop.stock) {
      const item = entry.item;
      const price = Game.price(entry);
      const it = ITEMS[item];
      const stackable = ['food', 'potion', 'scroll', 'seed', 'resource'].includes(it.type);
      const bulk = it.type === 'seed' || it.type === 'resource' || item === 'bread';
      html += `<div class="card"><div class="card-icon">${it.icon}</div><div class="card-name">${esc(it.name)}</div>
        ${it.desc ? `<div class="muted small">${esc(it.desc)}</div>` : ''}${it.type === 'equipment' ? `<div class="small">${statLine(it)}</div>` : ''}${it.req ? `<div class="small">Requires ${reqLine(it.req)}</div>` : ''}
        <div class="small">${cur ? ITEMS[cur].icon : '💰'} ${fmt(price)} ${esc(curName)}${Game.carries(item) ? ' · <span class="good-text">carried</span>' : ''}</div>
        <div class="btn-row"><button class="btn small" data-act="buy" data-item="${item}" data-qty="1"${funds < price ? ' disabled' : ''}>Buy 1</button>${stackable ? `<button class="btn small" data-act="buy" data-item="${item}" data-qty="10"${funds < price * 10 ? ' disabled' : ''}>Buy 10</button>` : ''}${bulk ? `<button class="btn small" data-act="buy" data-item="${item}" data-qty="100"${funds < price * 100 ? ' disabled' : ''}>Buy 100</button>` : ''}${item === 'bread' ? `<button class="btn small" data-act="buy" data-item="${item}" data-qty="1000"${funds < price * 1000 ? ' disabled' : ''}>Buy 1000</button>` : ''}</div></div>`;
    }
    html += '</div>';
    if (shop.buysNothing) return html + '<p class="muted small">The stalls here buy nothing. Not with gold, anyway.</p>';
    html += '<h2>Sell from your pack</h2>';
    const ids = Object.keys(s.pack);
    if (!ids.length) return html + '<p class="muted">You carry nothing to sell.</p>';
    html += '<table class="stats sell">';
    for (const id of ids) {
      html += `<tr><td>${ITEMS[id].icon} ${esc(ITEMS[id].name)}</td><td>× ${fmt(s.pack[id])}</td><td class="muted">${Game.sellPrice(id)}g each</td>
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
    if (done.length) html += this.section('quests-done', `Completed <span class="small muted">${done.length}</span>`, `<ul>${done.map(id => `<li>${esc(QUESTS[id].name)}</li>`).join('')}</ul>`, false);
    const endings = Object.keys(s.endings);
    if (endings.length) html += this.section('quests-endings', `Endings reached <span class="small muted">${endings.length}</span>`, `<ul>${endings.map(e => `<li><b>${esc(ENDINGS[e].title)}</b></li>`).join('')}</ul>`, false);
    return html;
  },

  relicCollection() {
    const done = Object.keys(RELIC_SETS).filter(id => Game.relicSetDone(id)).length;
    let html = '<div class="bestiary">';
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
    return this.section('relics', `🏺 Your collection <span class="small muted">${done} / ${Object.keys(RELIC_SETS).length} complete</span>`, html + '</div>');
  },

  companionBlock(full) {
    return Game.companions().map(comp => {
      const def = COMPANIONS[comp.id];
      const st = Game.companionStats(comp);
      return `<div class="companion${comp.downed ? ' downed' : ''}"><b>${def.icon} ${esc(def.name)}</b>${comp.downed ? ` <span class="lack-text">(down: ${Game.perk('rally') ? 'catching their breath' : 'rest at an inn'})</span>` : ''}
        <div class="small">❤️ ${comp.hp} / ${st.hp} · 🧠 ${Math.max(0, Math.round(comp.sanity))} / ${st.sanity} · AC ${st.ac} · ${withSign(st.hit)} to hit, ${Game.companionDamageText(comp)}${st.heals ? ` · heals you ${st.heals}` : ''}${def.thrall ? ` · <span class="sanity-text">crumbles in ${Math.ceil(comp.left / 60000)} min</span>` : ''}</div>
        ${def.mods ? `<div class="small mods">${modsText(def)}</div>` : ''}
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

  // The quick buttons beside the health and sanity bars: the strongest restorer you carry.
  updateQuick(kind, full) {
    const btn = document.getElementById('q-' + kind);
    const best = Game.bestRestorer(kind);
    const key = best ? `${best.item}:${Game.count(best.item)}:${best.amount}:${full}` : `none:${full}`;
    if (btn.dataset.key === key) return;
    btn.dataset.key = key;
    btn.disabled = !best || full;
    btn.innerHTML = best ? `${ITEMS[best.item].icon}<span class="quick-qty">${fmt(Game.count(best.item))}</span>` : (kind === 'hp' ? '❤️' : '👁️');
    btn.classList.toggle('empty', !best);
    btn.title = best
      ? `${ITEMS[best.item].name}: ${kind === 'hp' ? '+' + best.amount + ' hitpoints' : '+' + best.amount + ' sanity'}${full ? ' (already full)' : ''}`
      : (kind === 'hp' ? 'Nothing in your pack heals you' : 'Nothing in your pack restores sanity');
  },

  updateMeters() {
    const s = Game.state;
    const maxHp = Game.maxHp();
    this.setBar('h-hp', (s.hp / maxHp) * 100, `❤️ ${fmt(Math.max(0, s.hp))} / ${maxHp}`);
    this.setBar('h-sanity', (s.sanity / Game.maxSanity()) * 100, `👁️ ${fmt(s.sanity)} / ${Game.maxSanity()} · ${Game.mindState().name}`);
    document.getElementById('h-gold').textContent = fmt(s.gold);
    document.body.classList.toggle('low-sanity', s.sanity < 30);
    this.updateQuick('hp', s.hp >= maxHp);
    this.updateQuick('sanity', s.sanity >= Game.maxSanity());

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
      activity = s.travel.event ? '⏸ Something on the road…' : `🧭 Travelling to ${placeName(travel.target)} (${Game.journeySeconds()}s)`;
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
    const eta = travel.paused ? '⏸ halted' : `${Game.journeySeconds()}s`;
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
