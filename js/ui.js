// Gränssnitt: renderar sidor, uppdaterar mätare varje bildruta och hanterar klick.

const fmt = n => Math.floor(n).toLocaleString('sv-SE');
const secs = ms => (ms / 1000).toFixed(1).replace('.', ',') + ' s';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function itemList(obj) {
  return Object.entries(obj || {})
    .map(([id, qty]) => `<span class="chip" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${qty} × ${esc(ITEMS[id].name)}</span>`)
    .join(' ');
}

function bar(id, cls, pct, label = '') {
  return `<div class="bar ${cls}"><div class="fill" id="${id}" style="width:${pct}%"></div><span class="bar-label" id="${id}-label">${label}</span></div>`;
}

function statLine(stats) {
  const names = { attack: 'Anfall', strength: 'Styrka', defence: 'Försvar' };
  const parts = [];
  for (const [k, v] of Object.entries(stats || {})) {
    if (k === 'sanityResist') parts.push(`${Math.round(v * 100)} % förståndsskydd`);
    else parts.push(`+${v} ${names[k].toLowerCase()}`);
  }
  return parts.join(', ');
}

function reqLine(req) {
  if (!req) return '';
  return Object.entries(req).map(([s, l]) => `${SKILLS[s].name} ${l}`).join(', ');
}

const UI = {
  page: 'krönika',
  selectedItem: null,
  dirty: true,
  lastRender: 0,

  init() {
    document.body.addEventListener('click', e => this.onClick(e));
    document.body.addEventListener('change', e => this.onChange(e));
    Game.listeners.push(type => {
      if (type === 'reset') this.page = 'krönika';
      this.dirty = true;
    });
    this.renderAll();
  },

  // --- Klick ---
  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const d = el.dataset;
    switch (d.act) {
      case 'nav':
        this.page = d.page;
        this.selectedItem = null;
        document.body.classList.remove('nav-open');
        break;
      case 'toggle-nav': document.body.classList.toggle('nav-open'); return;
      case 'action': Game.startAction(d.skill, d.id); break;
      case 'stop': Game.stop(); break;
      case 'fight': Game.startCombat(d.monster); break;
      case 'style': Game.setStyle(d.style); break;
      case 'eat': if (!Game.eat()) Game.log('Du kan inte äta just nu.', 'warn'); break;
      case 'use': Game.use(d.item); break;
      case 'select': this.selectedItem = d.item; break;
      case 'sell': Game.sell(d.item, d.qty === 'all' ? Game.count(d.item) : +d.qty); break;
      case 'equip': Game.equip(d.item); break;
      case 'unequip': Game.unequip(d.slot); break;
      case 'food': Game.setFood(d.item); break;
      case 'buy': Game.buy(d.item, +d.price, +d.qty); break;
      case 'tool': Game.buyTool(d.skill); break;
      case 'save': Game.save(); Game.log('Spelet sparat.', 'good'); break;
      case 'export': {
        const box = document.getElementById('save-text');
        box.value = Game.exportSave();
        box.select();
        break;
      }
      case 'import':
        try {
          Game.importSave(document.getElementById('save-text').value);
          Game.log('Sparfil importerad.', 'good');
        } catch (err) {
          Game.log('Sparfilen gick inte att läsa.', 'bad');
        }
        break;
      case 'reset':
        if (confirm('Radera allt och börja om? Detta går inte att ångra.')) Game.reset();
        break;
      case 'close-modal': document.getElementById('modal').innerHTML = ''; break;
      case 'intro-done':
        Game.state.seenIntro = true;
        document.getElementById('modal').innerHTML = '';
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
    // Sidan byggs om högst fyra gånger per sekund; mätare uppdateras varje bildruta.
    // En öppen rullgardinsmeny skulle stängas av en omritning, så vänta tills den släpps.
    const selectOpen = document.activeElement && document.activeElement.tagName === 'SELECT';
    if (this.dirty && selectOpen) {
      // vänta
    } else if (this.dirty && now - this.lastRender > 250 && this.page !== 'inställningar') {
      this.lastRender = now;
      this.renderAll();
    } else if (this.dirty && this.page === 'inställningar') {
      this.renderNav();
      this.renderLog();
      this.dirty = false;
    }
    this.updateMeters();
  },

  renderNav() {
    const s = Game.state;
    const navBtn = (page, icon, name, extra = '') => {
      const active = this.page === page ? ' active' : '';
      const busy = (s.action && s.action.skill === page) || (page === 'strid' && s.combat) ? ' busy' : '';
      return `<button class="nav-btn${active}${busy}" data-act="nav" data-page="${page}"><span class="nav-icon">${icon}</span><span class="nav-name">${name}</span><span class="nav-extra">${extra}</span></button>`;
    };
    let html = `<div class="nav-group">${navBtn('krönika', '📜', 'Krönika')}</div>`;
    html += `<div class="nav-group"><div class="nav-title">Strid</div>${navBtn('strid', '⚔️', 'Strid')}${navBtn('karaktär', '🧝', 'Karaktär')}</div>`;
    for (const g of SKILL_GROUPS) {
      html += `<div class="nav-group"><div class="nav-title">${g.name}</div>`;
      for (const id of g.skills) html += navBtn(id, SKILLS[id].icon, SKILLS[id].name, `${Game.level(id)} / ${MAX_LEVEL}`);
      html += '</div>';
    }
    html += `<div class="nav-group"><div class="nav-title">Övrigt</div>${navBtn('bank', '🏦', 'Bank', Object.keys(s.bank).length)}${navBtn('handelsbod', '🛒', 'Handelsbod')}${navBtn('inställningar', '⚙️', 'Inställningar')}</div>`;
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
    const p = this.page;
    let html;
    if (p === 'krönika') html = this.pageLore();
    else if (p === 'strid') html = this.pageCombat();
    else if (p === 'karaktär') html = this.pageCharacter();
    else if (p === 'bank') html = this.pageBank();
    else if (p === 'handelsbod') html = this.pageShop();
    else if (p === 'inställningar') html = this.pageSettings();
    else if (SKILLS[p]) html = this.pageSkill(p);
    main.innerHTML = html;
    main.scrollTop = scroll;
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
      <div class="skill-level">Nivå <b>${lvl}</b> / ${MAX_LEVEL}</div>
      ${bar('xp-' + skill, 'xp', pct, label)}
    </div>`;
  },

  pageSkill(skill) {
    const s = Game.state;
    let html = this.skillHeader(skill);
    const tool = TOOL_UPGRADES[skill];
    if (tool) {
      const lvl = s.tools[skill];
      html += `<p class="muted small">Verktyg: <b>${lvl ? tool.tiers[lvl - 1] : 'Enkelt ' + tool.name.toLowerCase()}</b> (−${lvl * 10} % tid). Bättre verktyg finns i handelsboden.</p>`;
    }
    if (skill === 'ockultism') {
      html += `<p class="warning">👁️ Ockulta studier kostar förstånd, och förståndet återhämtar sig inte medan du studerar. Varje nivå i Ockultism ger +1 % skada mot väsen från bortom.</p>`;
    }
    html += '<div class="cards">';
    for (const a of ACTIONS[skill]) {
      const locked = Game.level(skill) < a.level;
      const active = s.action && s.action.skill === skill && s.action.id === a.id;
      const missing = !locked && !Game.hasAll(a.input);
      const outItem = ITEMS[Object.keys(a.output)[0]];
      if (locked) {
        html += `<div class="card locked"><div class="card-icon">🔒</div><div class="card-name">${esc(a.name)}</div><div class="muted small">Kräver nivå ${a.level}</div></div>`;
        continue;
      }
      html += `<div class="card${active ? ' active' : ''}${missing ? ' missing' : ''}">
        <div class="card-icon">${outItem.icon}</div>
        <div class="card-name">${esc(a.name)}</div>
        ${a.desc ? `<div class="muted small">${esc(a.desc)}</div>` : ''}
        <div class="small">${secs(Game.actionTime(skill, a))} · ${a.xp} xp${a.sanityCost ? ` · <span class="sanity-text">−${a.sanityCost} förstånd</span>` : ''}</div>
        ${a.input ? `<div class="small">Kräver: ${Object.entries(a.input).map(([id, q]) => `<span class="chip ${Game.count(id) >= q ? '' : 'lack'}">${ITEMS[id].icon} ${q} ${esc(ITEMS[id].name)} <span class="muted">(${fmt(Game.count(id))})</span></span>`).join(' ')}</div>` : ''}
        <div class="small">Ger: ${itemList(a.output)} <span class="muted">(har ${fmt(Game.count(outItem.id))})</span></div>
        ${bar(`prog-${skill}-${a.id}`, 'progress', 0)}
        <button class="btn${active ? ' danger' : ''}" data-act="action" data-skill="${skill}" data-id="${a.id}">${active ? 'Avbryt' : 'Börja'}</button>
      </div>`;
    }
    return html + '</div>';
  },

  pageLore() {
    let html = '<div class="lore"><h1>Ekon från Avgrunden</h1>';
    html += LORE.map(p => `<p>${p}</p>`).join('');
    html += '<h2>Platser i Aldmark</h2><div class="cards">';
    for (const a of AREAS) html += `<div class="card"><div class="card-icon">${a.icon}</div><div class="card-name">${a.name}</div><div class="muted small">Rekommenderad nivå ${a.level}</div><p class="small">${a.desc}</p></div>`;
    html += `</div><h2>Hur man spelar</h2><ul>
      <li>Välj en färdighet i menyn och klicka <b>Börja</b>. Du fortsätter tills du avbryter, även när fliken är stängd (upp till 24 timmar).</li>
      <li>Du kan bara göra en sak åt gången: samla, tillverka eller slåss.</li>
      <li>I strid äter du automatiskt din valda mat när livet sjunker under 40 %.</li>
      <li><b>Förstånd</b> sjunker när väsen från bortom träffar dig och när du studerar ockultism. Når det noll flyr du i panik. Det återhämtar sig långsamt när du vilar eller samlar, snabbare med lugnande drycker. Amuletter ger förståndsskydd.</li>
      <li>Spelet sparas automatiskt i webbläsaren var tionde sekund.</li>
    </ul></div>`;
    return html;
  },

  pageCombat() {
    const s = Game.state;
    let html = '<h1>⚔️ Strid</h1>';
    if (s.combat) {
      const m = MONSTERS[s.combat.monster];
      const chance = Game.hitChance(Game.accuracy(), (m.defence + 9) * 64);
      const theirs = Game.hitChance((m.attack + 9) * 64, Game.evasion());
      const food = s.food && ITEMS[s.food];
      const foods = Object.keys(s.bank).filter(id => ITEMS[id].type === 'food');
      const potions = Object.keys(s.bank).filter(id => ITEMS[id].type === 'potion');
      html += `<div class="combat">
        <div class="fighter">
          <h2>Du</h2>
          ${bar('c-hp', 'hp', 0)}
          ${bar('c-sanity', 'sanity', 0)}
          ${bar('c-patk', 'progress', 0)}
          <div class="small">Maxskada <b>${Game.maxHit()}</b>${m.eldritch ? ` <span class="sanity-text">(+${Math.round(Game.eldritchBonus() * 100)} % mot väsen)</span>` : ''} · Träffchans <b>${Math.round(chance * 100)} %</b> · Attackhastighet ${secs(Game.playerStats().speed)}</div>
          <div class="style-row">Stil:
            ${['anfall', 'styrka', 'forsvar'].map(st => `<button class="btn small${s.combatStyle === st ? ' selected' : ''}" data-act="style" data-style="${st}">${SKILLS[st].icon} ${SKILLS[st].name}</button>`).join('')}
          </div>
          <div class="style-row">Mat:
            <select id="food-select">${foods.length ? '' : '<option>Ingen mat</option>'}${foods.map(id => `<option value="${id}"${id === s.food ? ' selected' : ''}>${ITEMS[id].name} (${fmt(s.bank[id])})</option>`).join('')}</select>
            <button class="btn small" data-act="eat">Ät${food ? ` (+${food.heal})` : ''}</button>
          </div>
          ${potions.length ? `<div class="style-row">Drycker: ${potions.map(id => `<button class="btn small" data-act="use" data-item="${id}" title="${esc(ITEMS[id].desc)}">${ITEMS[id].icon} ${esc(ITEMS[id].name)} (${fmt(s.bank[id])})</button>`).join('')}</div>` : ''}
          <button class="btn danger" data-act="stop">Fly</button>
        </div>
        <div class="fighter monster${m.eldritch ? ' eldritch' : ''}">
          <h2>${m.icon} ${m.name}${m.boss ? ' <span class="boss">BOSS</span>' : ''}</h2>
          ${bar('c-mhp', 'hp', 0)}
          ${bar('c-matk', 'progress enemy', 0)}
          <div class="small">Maxskada <b>${m.maxHit}</b> · Träffar dig <b>${Math.round(theirs * 100)} %</b> · ${secs(m.speed)}</div>
          ${m.sanityDmg ? `<div class="small sanity-text">Varje träff kostar ${(m.sanityDmg * (1 - Game.playerStats().sanityResist)).toFixed(1).replace('.', ',')} förstånd</div>` : ''}
          <div class="small muted">Dödade: ${fmt(s.kills[s.combat.monster] || 0)}</div>
        </div>
      </div>`;
    }
    for (const area of AREAS) {
      html += `<div class="area"><h2>${area.icon} ${area.name} <span class="muted small">(rek. nivå ${area.level})</span></h2><p class="muted small">${area.desc}</p><div class="cards">`;
      for (const id of area.monsters) {
        const m = MONSTERS[id];
        const fighting = s.combat && s.combat.monster === id;
        html += `<div class="card${fighting ? ' active' : ''}${m.eldritch ? ' eldritch' : ''}">
          <div class="card-icon">${m.icon}</div>
          <div class="card-name">${m.name}${m.boss ? ' <span class="boss">BOSS</span>' : ''}</div>
          <div class="small">❤️ ${m.hp} · ⚔️ ${m.attack} · 🛡️ ${m.defence} · max ${m.maxHit}</div>
          ${m.sanityDmg ? `<div class="small sanity-text">👁️ −${m.sanityDmg} förstånd per träff</div>` : ''}
          <div class="small muted">Byte: ${m.drops.map(d => ITEMS[d.item].icon).join(' ')} · ${m.gold[0]}–${m.gold[1]} guld</div>
          <button class="btn" data-act="fight" data-monster="${id}"${fighting ? ' disabled' : ''}>${fighting ? 'Strider…' : 'Strid'}</button>
        </div>`;
      }
      html += '</div></div>';
    }
    return html;
  },

  pageCharacter() {
    const s = Game.state;
    const st = Game.playerStats();
    let html = '<h1>🧝 Karaktär</h1><div class="two-col"><div><h2>Utrustning</h2><div class="slots">';
    for (const [slot, name] of Object.entries(SLOTS)) {
      const item = s.equipment[slot];
      html += `<div class="slot"><div class="muted small">${name}</div>${item
        ? `<div>${ITEMS[item].icon} <b>${esc(ITEMS[item].name)}</b></div><div class="small">${statLine(ITEMS[item].stats)}</div><button class="btn small" data-act="unequip" data-slot="${slot}">Ta av</button>`
        : '<div class="muted">Tomt</div>'}</div>`;
    }
    html += `</div><h2>Stridsvärden</h2><table class="stats">
      <tr><td>Livspoäng</td><td>${fmt(s.hp)} / ${Game.maxHp()}</td></tr>
      <tr><td>Förstånd</td><td>${fmt(s.sanity)} / ${Game.maxSanity()}</td></tr>
      <tr><td>Anfallsbonus</td><td>+${st.attack}</td></tr>
      <tr><td>Styrkebonus</td><td>+${st.strength}</td></tr>
      <tr><td>Försvarsbonus</td><td>+${st.defence}</td></tr>
      <tr><td>Förståndsskydd</td><td>${Math.round(st.sanityResist * 100)} %</td></tr>
      <tr><td>Maxskada</td><td>${Game.maxHit()}</td></tr>
      <tr><td>Skada mot väsen</td><td>+${Math.round(Game.eldritchBonus() * 100)} %</td></tr>
    </table></div><div><h2>Färdigheter</h2><table class="stats">`;
    let total = 0;
    for (const id in SKILLS) {
      total += Game.level(id);
      html += `<tr><td>${SKILLS[id].icon} ${SKILLS[id].name}</td><td>${Game.level(id)}</td><td class="muted">${fmt(s.skills[id].xp)} xp</td></tr>`;
    }
    html += `<tr><td><b>Totalt</b></td><td><b>${total}</b></td><td></td></tr></table>`;
    const kills = Object.entries(s.kills);
    if (kills.length) {
      html += '<h2>Besegrade fiender</h2><table class="stats">';
      for (const [id, n] of kills) html += `<tr><td>${MONSTERS[id].icon} ${MONSTERS[id].name}</td><td>${fmt(n)}</td></tr>`;
      html += '</table>';
    }
    return html + '</div></div>';
  },

  pageBank() {
    const s = Game.state;
    const ids = Object.keys(s.bank);
    let html = `<h1>🏦 Bank</h1><p class="muted">${ids.length} sorters föremål · Värde ${fmt(ids.reduce((sum, id) => sum + ITEMS[id].sell * s.bank[id], 0))} guld</p>`;
    const sel = this.selectedItem && s.bank[this.selectedItem] ? this.selectedItem : null;
    if (sel) {
      const it = ITEMS[sel];
      html += `<div class="item-detail"><div class="big-icon">${it.icon}</div><div>
        <h2>${esc(it.name)} <span class="muted">× ${fmt(s.bank[sel])}</span></h2>
        <p class="muted">${esc(it.desc)}</p>
        ${it.stats ? `<p class="small">${statLine(it.stats)}${it.speed ? ` · ${secs(it.speed)}` : ''}</p>` : ''}
        ${it.req ? `<p class="small ${Game.meetsReq(sel) ? '' : 'lack-text'}">Kräver: ${reqLine(it.req)}</p>` : ''}
        <div class="btn-row">
          ${it.type === 'equipment' ? `<button class="btn" data-act="equip" data-item="${sel}">Utrusta</button>` : ''}
          ${it.type === 'food' ? `<button class="btn" data-act="food" data-item="${sel}">${s.food === sel ? 'Vald som mat ✓' : 'Välj som mat'}</button><button class="btn" data-act="use" data-item="${sel}">Ät</button>` : ''}
          ${it.type === 'potion' ? `<button class="btn" data-act="use" data-item="${sel}">Drick</button>` : ''}
          <button class="btn" data-act="sell" data-item="${sel}" data-qty="1">Sälj 1 (${it.sell} g)</button>
          <button class="btn" data-act="sell" data-item="${sel}" data-qty="all">Sälj alla (${fmt(it.sell * s.bank[sel])} g)</button>
        </div></div></div>`;
    }
    html += '<div class="bank-grid">';
    for (const id of ids) {
      html += `<button class="bank-item${id === sel ? ' selected' : ''}" data-act="select" data-item="${id}" title="${esc(ITEMS[id].name)}"><span class="bank-icon">${ITEMS[id].icon}</span><span class="bank-qty">${fmt(s.bank[id])}</span><span class="bank-name">${esc(ITEMS[id].name)}</span></button>`;
    }
    if (!ids.length) html += '<p class="muted">Banken är tom.</p>';
    return html + '</div>';
  },

  pageShop() {
    const s = Game.state;
    let html = '<h1>🛒 Handelsbod</h1><p class="muted">Den gamla handlaren Obed tittar aldrig upp. Hans händer har simhud mellan fingrarna.</p><h2>Varor</h2><div class="cards">';
    for (const { item, price } of SHOP) {
      const it = ITEMS[item];
      html += `<div class="card"><div class="card-icon">${it.icon}</div><div class="card-name">${esc(it.name)}</div>
        <div class="muted small">${esc(it.desc || statLine(it.stats))}</div>${it.req ? `<div class="small">Kräver ${reqLine(it.req)}</div>` : ''}
        <div class="small">💰 ${fmt(price)} guld</div>
        <div class="btn-row"><button class="btn small" data-act="buy" data-item="${item}" data-price="${price}" data-qty="1">Köp 1</button>${it.type !== 'equipment' ? `<button class="btn small" data-act="buy" data-item="${item}" data-price="${price}" data-qty="10">Köp 10</button>` : ''}</div></div>`;
    }
    html += '</div><h2>Verktyg</h2><div class="cards">';
    for (const [skill, tool] of Object.entries(TOOL_UPGRADES)) {
      const lvl = s.tools[skill];
      const maxed = lvl >= TOOL_COSTS.length;
      html += `<div class="card"><div class="card-icon">${SKILLS[skill].icon}</div><div class="card-name">${maxed ? tool.tiers[lvl - 1] : tool.tiers[lvl]}</div>
        <div class="muted small">${SKILLS[skill].name}: ${maxed ? 'bästa verktyget' : `−${(lvl + 1) * 10} % tid totalt`}</div>
        ${maxed ? '<div class="small">✓ Ägs</div>' : `<div class="small">💰 ${fmt(TOOL_COSTS[lvl])} guld</div><button class="btn small" data-act="tool" data-skill="${skill}">Köp</button>`}</div>`;
    }
    return html + '</div>';
  },

  pageSettings() {
    return `<h1>⚙️ Inställningar</h1>
      <div class="btn-row"><button class="btn" data-act="save">Spara nu</button><button class="btn" data-act="export">Exportera sparfil</button><button class="btn" data-act="import">Importera sparfil</button></div>
      <textarea id="save-text" rows="6" placeholder="Klistra in en sparfil här för att importera den."></textarea>
      <h2>Farozon</h2><button class="btn danger" data-act="reset">Radera allt och börja om</button>`;
  },

  // --- Mätare som uppdateras varje bildruta ---
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

    let activity = 'Vilar i Saltmyr';
    if (s.action) {
      const a = findAction(s.action.skill, s.action.id);
      const time = Game.actionTime(s.action.skill, a);
      activity = `${SKILLS[s.action.skill].icon} ${a.name}`;
      this.setBar(`prog-${s.action.skill}-${s.action.id}`, (s.action.progress / time) * 100);
    } else if (s.combat) {
      const m = MONSTERS[s.combat.monster];
      activity = `⚔️ Strider mot ${m.name.toLowerCase()}`;
      this.setBar('c-hp', (s.hp / maxHp) * 100, `❤️ ${fmt(Math.max(0, s.hp))} / ${maxHp}`);
      this.setBar('c-sanity', (s.sanity / Game.maxSanity()) * 100, `👁️ ${fmt(s.sanity)} / ${Game.maxSanity()}`);
      this.setBar('c-patk', (s.combat.playerTimer / Game.playerStats().speed) * 100);
      if (s.combat.respawn > 0) {
        this.setBar('c-mhp', 0, 'Nästa fiende närmar sig…');
        this.setBar('c-matk', 0);
      } else {
        this.setBar('c-mhp', (s.combat.monsterHp / m.hp) * 100, `${fmt(s.combat.monsterHp)} / ${m.hp}`);
        this.setBar('c-matk', (s.combat.monsterTimer / m.speed) * 100);
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
    if (!items.length && !xp.length && !diff.gold) return;
    let html = `<div class="modal-box"><h2>Medan du var borta…</h2><p class="muted">Du var borta i ${hours} h ${mins} min${diff.ms > MAX_OFFLINE_MS ? ' (max 24 h räknas)' : ''}.</p>`;
    if (diff.gold) html += `<p>💰 ${diff.gold > 0 ? '+' : ''}${fmt(diff.gold)} guld</p>`;
    if (xp.length) html += `<p>${xp.map(([id, v]) => `<span class="chip">${SKILLS[id].icon} +${fmt(v)} xp</span>`).join(' ')}</p>`;
    if (items.length) html += `<p>${items.map(([id, q]) => `<span class="chip ${q < 0 ? 'lack' : ''}">${ITEMS[id].icon} ${q > 0 ? '+' : ''}${fmt(q)} ${esc(ITEMS[id].name)}</span>`).join(' ')}</p>`;
    html += '<button class="btn" data-act="close-modal">Fortsätt</button></div>';
    document.getElementById('modal').innerHTML = html;
  },

  showIntro() {
    document.getElementById('modal').innerHTML = `<div class="modal-box intro"><h2>Ekon från Avgrunden</h2>${LORE.map(p => `<p>${p}</p>`).join('')}<button class="btn" data-act="intro-done">Gå i land i Saltmyr</button></div>`;
  },
};
