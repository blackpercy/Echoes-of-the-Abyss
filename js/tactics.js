// Holdout: turn-based missions on a grid. Your survivors act, then the dead (and the raiders) do.
// A battle is plain data so it can be saved in the middle of a fight.

const MAP_W = 12;
const MAP_H = 16;
const SIGHT = 8;                 // how far your survivors see
const NOISE_PER_SPAWN = 8;       // every this much noise draws another zombie in from the edge
const WAKE_RADIUS = 8;           // a gunshot wakes sleeping dead this close
const AMBIENT_EVERY = 4;         // one more zombie wanders in every this many turns
const DOWNED_TURNS = 3;          // turns a downed survivor lasts before they die
const COVER_HALF = 20;
const COVER_FULL = 40;
const RANGE_FALLOFF = 8;         // aim lost per tile beyond a gun's best range
const CRIT_CHANCE = 0.1;
const OVERWATCH_PENALTY = 10;
const MAX_MAP_ENEMIES = 18;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const Tactics = {
  // --- Building a battle ---
  create({ kind, siteId, squad, gear }) {
    const b = {
      kind, siteId, w: MAP_W, h: MAP_H, tiles: [], crates: [], barricades: {}, units: [], nextUnit: 1,
      turn: 1, log: [], bag: { resources: {}, weapons: [] }, gear: gear || {}, ammo: Game.state.resources.ammo,
      noise: 0, noiseMade: 0, kills: 0, result: null, heartKilled: false, lootTaken: false, flare: null, waves: null,
    };
    if (this.siege(b)) this.makeBase(b);
    else this.makeSite(b);
    // Your people start at the bottom, where you came in.
    const starts = this.startTiles(b, squad.length);
    squad.forEach((sv, i) => {
      const gun = sv.gun ? WEAPONS[sv.gun] : null;
      b.units.push({
        id: b.nextUnit++, side: 'p', svId: sv.id, name: sv.name, icon: SPECIALTIES[sv.spec].icon, spec: sv.spec,
        x: starts[i].x, y: starts[i].y, hp: sv.hp, maxHp: Game.maxHp(sv), ap: 2, aim: Game.aim(sv), move: Game.move(sv),
        gun: sv.gun, melee: sv.melee, clip: gun ? gun.clip : 0, kills: 0, xp: 0, fx: Game.fx(sv),
      });
    });
    this.addLog(b, this.siege(b) ? 'They are coming. Hold the barricades.' : this.objective(b));
    this.updateAwareness(b);
    return b;
  },
  objective(b) {
    return {
      scavenge: 'Search the crates (📦) and get out the way you came (the green tiles).',
      clear: 'Destroy the Plague Heart (🫀), then get out.',
      hive: 'Destroy the Hive (🫀) at the heart of the hospital.',
      rescue: 'Reach the survivor and get them out with you.',
      defend: 'Hold out until every wave is beaten.',
      hold: 'Hold the outpost until every wave is beaten.',
    }[b.kind];
  },
  // Sieges: the church, or an outpost under attack. Waves come from the top; nobody leaves.
  siege(b) {
    return b.kind === 'defend' || b.kind === 'hold';
  },
  tile(b, x, y) {
    return x < 0 || y < 0 || x >= b.w || y >= b.h ? '#' : b.tiles[y][x];
  },
  setTile(b, x, y, t) {
    const row = b.tiles[y];
    b.tiles[y] = row.slice(0, x) + t + row.slice(x + 1);
  },
  crateAt(b, x, y) {
    return b.crates.find(c => c.x === x && c.y === y);
  },
  unitAt(b, x, y) {
    return b.units.find(u => u.x === x && u.y === y && this.onMap(u));
  },
  onMap(u) {
    return u.hp > 0 || u.downed > 0 ? !u.extracted : false;
  },
  // Can something stand here?
  open(b, x, y) {
    const t = this.tile(b, x, y);
    return (t === '.' || t === 'x') && !this.crateAt(b, x, y) && !this.unitAt(b, x, y);
  },

  // A town block: buildings with doors, cars and crates in the street, and a way out at the bottom.
  makeSite(b) {
    const type = SITE_TYPES[SITES[b.siteId].type];
    const danger = type.danger + (b.kind === 'hive' ? 2 : 0) + (Game.state.sites[b.siteId].infested ? 1 : 0);
    for (let y = 0; y < b.h; y++) b.tiles.push((y >= b.h - 2 ? 'x' : '.').repeat(b.w));
    const rooms = [];
    for (let tries = 0; tries < 60 && rooms.length < 3; tries++) {
      const w = randInt(4, 6), h = randInt(4, 5);
      const x = randInt(0, b.w - w), y = randInt(0, b.h - 5 - h);
      if (rooms.some(r => x < r.x + r.w + 1 && r.x < x + w + 1 && y < r.y + r.h + 1 && r.y < y + h + 1)) continue;
      rooms.push({ x, y, w, h });
    }
    for (const r of rooms) {
      for (let x = r.x; x < r.x + r.w; x++) {
        this.setTile(b, x, r.y, '#');
        this.setTile(b, x, r.y + r.h - 1, '#');
      }
      for (let y = r.y; y < r.y + r.h; y++) {
        this.setTile(b, r.x, y, '#');
        this.setTile(b, r.x + r.w - 1, y, '#');
      }
      // Two doors.
      const doors = [[randInt(r.x + 1, r.x + r.w - 2), r.y + r.h - 1], [randInt(r.x + 1, r.x + r.w - 2), r.y], [r.x, randInt(r.y + 1, r.y + r.h - 2)], [r.x + r.w - 1, randInt(r.y + 1, r.y + r.h - 2)]];
      for (const [dx, dy] of [doors[0], pick(doors.slice(1))]) this.setTile(b, dx, dy, '.');
    }
    // Cars, crates and junk in the streets: half cover.
    for (let i = 0; i < 9; i++) {
      const x = randInt(0, b.w - 1), y = randInt(1, b.h - 4);
      if (this.tile(b, x, y) === '.' && !rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)) this.setTile(b, x, y, 'c');
    }
    // Loot, mostly indoors.
    const crates = b.kind === 'scavenge' ? type.crates : Math.max(1, Math.floor(type.crates / 2));
    const inside = [];
    for (const r of rooms) for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) inside.push({ x, y });
    for (let i = 0; i < crates; i++) {
      const spot = inside.length && Math.random() < 0.8 ? inside.splice(randInt(0, inside.length - 1), 1)[0] : this.randomFloor(b, 0, b.h - 5);
      if (spot && this.open(b, spot.x, spot.y)) b.crates.push({ x: spot.x, y: spot.y, open: false });
    }
    this.ensureReachable(b);
    // The objective.
    if (b.kind === 'clear' || b.kind === 'hive') {
      const spot = this.randomFloor(b, 0, 5);
      const heart = this.spawn(b, 'heart', spot.x, spot.y);
      if (b.kind === 'hive') {
        heart.name = 'The Hive';
        heart.hp = heart.maxHp = 60;
      }
    }
    if (b.kind === 'rescue') {
      const free = inside.filter(p => this.open(b, p.x, p.y));
      const spot = free.length ? pick(free) : this.randomFloor(b, 0, 6);
      const spec = pick(Object.keys(SPECIALTIES));
      const name = Game.makeSurvivor(spec).name;
      b.units.push({ id: b.nextUnit++, side: 'p', npc: true, name, icon: '🙋', spec, x: spot.x, y: spot.y, hp: 6, maxHp: 9, ap: 0, aim: 50, move: 5, gun: null, melee: null, clip: 0, kills: 0, xp: 0, waiting: true });
    }
    // The dead, in clusters, asleep until they notice you.
    const pool = ['walker', 'walker', 'walker'];
    if (danger >= 2) pool.push('runner', 'bloater');
    if (danger >= 3) pool.push('feral', 'runner');
    if (danger >= 4) pool.push('feral', 'juggernaut');
    const count = 3 + danger * 2;
    for (let i = 0; i < count; i++) {
      const spot = this.randomFloor(b, 0, b.h - 6);
      if (spot) this.spawn(b, pick(pool), spot.x, spot.y, true);
    }
    if (b.kind === 'hive') for (let i = 0; i < 2; i++) {
      const spot = this.randomFloor(b, 0, 7);
      if (spot) this.spawn(b, 'juggernaut', spot.x, spot.y, true);
    }
    // Some places are held by raiders who would rather shoot you than share.
    if (type.raiders && Math.random() < 0.6) {
      for (let i = 0; i < 1 + Math.floor(danger / 2); i++) {
        const spot = this.randomFloor(b, 0, b.h - 7);
        if (spot) this.spawn(b, i === 0 && danger >= 3 ? 'raider_boss' : 'raider', spot.x, spot.y, true);
      }
      this.addLog(b, 'You hear voices. Living ones. Armed.');
    }
  },
  // The church on Grace Hill (or an outpost): walls with barricaded gaps across the middle, the dead coming from the top.
  makeBase(b) {
    const outpost = b.kind === 'hold';
    for (let y = 0; y < b.h; y++) b.tiles.push('.'.repeat(b.w));
    const wallY = 6;
    const hp = outpost ? 4 : Game.facility('walls').barricade || 6;
    for (let x = 0; x < b.w; x++) {
      if (x % 4 === 1 || x % 4 === 2) {
        this.setTile(b, x, wallY, 'b');
        b.barricades[`${x},${wallY}`] = hp;
      } else {
        this.setTile(b, x, wallY, '#');
      }
    }
    // The church itself, at the bottom; an outpost is just a few cars and some junk behind its barricades.
    if (!outpost) {
      for (let x = 2; x < b.w - 2; x++) this.setTile(b, x, b.h - 3, '#');
      this.setTile(b, Math.floor(b.w / 2), b.h - 3, '.');
    }
    for (const [x, y] of [[1, 8], [4, 9], [7, 8], [10, 9], [3, 11], [8, 11]]) this.setTile(b, x, y, 'c');
    b.waves = outpost ? { left: 2, nextTurn: 1, size: 2 + Math.floor(Game.state.day / 6) } : { left: 3, nextTurn: 1, size: 3 + Math.floor(Game.state.day / 5) };
  },
  startTiles(b, n) {
    const tiles = [];
    const rows = this.siege(b) ? [9, 10, 11] : [b.h - 1, b.h - 2];
    for (const y of rows) for (let x = 0; x < b.w; x++) if (this.open(b, x, y)) tiles.push({ x, y });
    tiles.sort((a, c) => Math.abs(a.x - b.w / 2) - Math.abs(c.x - b.w / 2));
    return tiles.slice(0, n);
  },
  randomFloor(b, minY, maxY) {
    for (let i = 0; i < 200; i++) {
      const x = randInt(0, b.w - 1), y = randInt(minY, maxY);
      if (this.tile(b, x, y) === '.' && this.open(b, x, y)) return { x, y };
    }
    return null;
  },
  // Every floor tile, and a side of every crate, must be reachable on foot from where the squad comes in.
  // Where something is shut in, dig the cheapest way out: through cars and walls, and through a crate
  // only if nothing else works (that crate is then gone).
  ensureReachable(b) {
    const walk = (x, y) => {
      const t = this.tile(b, x, y);
      return (t === '.' || t === 'x') && !this.crateAt(b, x, y);
    };
    for (let guard = 0; guard < 60; guard++) {
      const seen = this.flood(b, Math.floor(b.w / 2), b.h - 1, true, true);
      const touches = o => DIRS.some(([dx, dy]) => seen.has(`${o.x + dx},${o.y + dy}`));
      let stuck = b.crates.find(c => !touches(c));
      if (!stuck) {
        for (let y = 0; y < b.h && !stuck; y++) for (let x = 0; x < b.w && !stuck; x++) {
          if (walk(x, y) && !seen.has(`${x},${y}`)) stuck = { x, y };
        }
      }
      if (!stuck) return;
      this.digOut(b, stuck, seen);
    }
  },
  // Cheapest path from a shut-in spot to the reachable area; clears whatever is in the way.
  digOut(b, from, seen) {
    const costOf = (x, y) => {
      if (this.crateAt(b, x, y)) return 8;
      const t = this.tile(b, x, y);
      return t === '#' || t === 'c' ? 2 : 1;
    };
    const key = (x, y) => `${x},${y}`;
    const dist = new Map([[key(from.x, from.y), 0]]);
    const prev = new Map();
    const open = [[0, from.x, from.y]];
    let end = null;
    while (open.length) {
      open.sort((a, c) => a[0] - c[0]);
      const [d, x, y] = open.shift();
      if (d > dist.get(key(x, y))) continue;
      if (seen.has(key(x, y))) { end = [x, y]; break; }
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= b.w || ny >= b.h) continue;
        const nd = d + costOf(nx, ny);
        if (nd < (dist.get(key(nx, ny)) ?? Infinity)) {
          dist.set(key(nx, ny), nd);
          prev.set(key(nx, ny), [x, y]);
          open.push([nd, nx, ny]);
        }
      }
    }
    for (let p = end && prev.get(key(...end)); p && !(p[0] === from.x && p[1] === from.y); p = prev.get(key(...p))) {
      const [x, y] = p;
      if (this.tile(b, x, y) === '#' || this.tile(b, x, y) === 'c') this.setTile(b, x, y, '.');
      b.crates = b.crates.filter(c => c.x !== x || c.y !== y);
    }
  },
  flood(b, sx, sy, ignoreUnits, crates) {
    const seen = new Set([`${sx},${sy}`]);
    const queue = [[sx, sy]];
    while (queue.length) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        const t = this.tile(b, nx, ny);
        if (seen.has(key) || t === '#' || t === 'c' || t === 'b') continue;
        if (!ignoreUnits && this.unitAt(b, nx, ny)) continue;
        if (crates && this.crateAt(b, nx, ny)) continue;
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
    return seen;
  },
  spawn(b, type, x, y, dormant = false) {
    const e = ENEMIES[type];
    const u = { id: b.nextUnit++, side: 'e', type, name: e.name, icon: e.icon, x, y, hp: e.hp, maxHp: e.hp, dormant: dormant && !e.heart, human: !!e.human };
    if (e.human) {
      u.clip = 6;
      u.dormant = dormant;
    }
    b.units.push(u);
    return u;
  },
  addLog(b, msg) {
    b.log.unshift(msg);
    if (b.log.length > 40) b.log.length = 40;
  },

  // --- Who is where ---
  players(b) {
    return b.units.filter(u => u.side === 'p' && this.onMap(u));
  },
  standing(b) {
    return this.players(b).filter(u => u.hp > 0 && !u.waiting);
  },
  enemies(b) {
    return b.units.filter(u => u.side === 'e' && u.hp > 0);
  },
  manhattan(a, c) {
    return Math.abs(a.x - c.x) + Math.abs(a.y - c.y);
  },
  // Line of sight: walls block it; cover does not.
  los(b, a, c) {
    let x0 = a.x, y0 = a.y;
    const x1 = c.x, y1 = c.y;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (!(x0 === x1 && y0 === y1)) {
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
      if (x0 === x1 && y0 === y1) break;
      if (this.tile(b, x0, y0) === '#') return false;
    }
    return true;
  },
  // The cover a target has against a shot from a given place: 0, half or full.
  cover(b, target, from) {
    let best = 0;
    const sx = Math.sign(from.x - target.x), sy = Math.sign(from.y - target.y);
    for (const [dx, dy] of [[sx, 0], [0, sy]]) {
      if (!dx && !dy) continue;
      const x = target.x + dx, y = target.y + dy;
      const t = this.tile(b, x, y);
      if (t === '#') best = Math.max(best, COVER_FULL);
      else if (t === 'c' || t === 'b' || this.crateAt(b, x, y)) best = Math.max(best, COVER_HALF);
    }
    return best;
  },
  // Tiles your survivors can see. Enemies outside them are hidden.
  visible(b) {
    const seen = new Set();
    for (const u of this.standing(b).concat(this.players(b).filter(p => p.npc))) {
      for (let y = Math.max(0, u.y - SIGHT); y <= Math.min(b.h - 1, u.y + SIGHT); y++) {
        for (let x = Math.max(0, u.x - SIGHT); x <= Math.min(b.w - 1, u.x + SIGHT); x++) {
          if (Math.hypot(x - u.x, y - u.y) <= SIGHT + 0.5 && this.los(b, u, { x, y })) seen.add(`${x},${y}`);
        }
      }
    }
    return seen;
  },

  // --- Moving ---
  // Every tile a unit could reach, with the steps it takes. You can walk past your own side, not stop on them.
  reach(b, u, maxSteps) {
    const out = new Map();
    const queue = [[u.x, u.y, 0]];
    const seen = new Set([`${u.x},${u.y}`]);
    while (queue.length) {
      const [x, y, d] = queue.shift();
      if (d >= maxSteps) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        const t = this.tile(b, nx, ny);
        if (seen.has(key) || (t !== '.' && t !== 'x') || this.crateAt(b, nx, ny)) continue;
        const other = this.unitAt(b, nx, ny);
        if (other && other.side !== u.side) continue;
        seen.add(key);
        if (!other) out.set(key, d + 1);
        queue.push([nx, ny, d + 1]);
      }
    }
    return out;
  },
  // Move costs 1 action for up to `move` tiles, or both actions for up to twice that.
  moveCost(b, u, x, y) {
    const steps = this.reach(b, u, u.move * Math.min(2, u.ap)).get(`${x},${y}`);
    if (!steps) return null;
    return steps <= u.move ? 1 : 2;
  },
  moveUnit(b, u, x, y) {
    const cost = this.moveCost(b, u, x, y);
    if (!cost || u.ap < cost) return false;
    u.x = x;
    u.y = y;
    u.ap -= cost;
    u.moved = true;
    u.overwatch = false;
    this.updateAwareness(b);
    this.checkEnd(b);
    return true;
  },

  // --- Attacking ---
  gunOf(u) {
    return u.gun ? WEAPONS[u.gun] : null;
  },
  meleeOf(u) {
    return u.melee ? WEAPONS[u.melee] : FISTS;
  },
  // A survivor's skill-tree effects (enemies have none).
  fx(u, key) {
    return (u.fx && u.fx[key]) || 0;
  },
  gunRange(u) {
    const gun = this.gunOf(u);
    return gun ? gun.range + this.fx(u, 'range') : 0;
  },
  shotChance(b, u, target, penalty = 0) {
    const gun = this.gunOf(u);
    if (!gun) return 0;
    const d = Math.hypot(u.x - target.x, u.y - target.y);
    const best = this.gunRange(u);
    const range = d > best ? (d - best) * RANGE_FALLOFF : 0;
    const cover = target.side === 'e' && !ENEMIES[target.type].human ? 0 : this.cover(b, target, u);
    const steady = u.moved ? 0 : this.fx(u, 'steady');
    return Math.max(5, Math.min(95, Math.round(u.aim + gun.aim + steady - range - cover - penalty)));
  },
  meleeChance(u) {
    return Math.max(5, Math.min(95, 70 + this.meleeOf(u).aim + Math.round((u.aim - 60) / 2) + this.fx(u, 'meleeHit')));
  },
  canShoot(b, u, target) {
    return !!this.gunOf(u) && u.ap > 0 && u.clip > 0 && target.hp > 0 && this.los(b, u, target);
  },
  canMelee(b, u, target) {
    return u.ap > 0 && target.hp > 0 && this.manhattan(u, target) === 1;
  },
  shoot(b, u, target, overwatch = false) {
    const gun = this.gunOf(u);
    const shots = (gun.burst || 1) + this.fx(u, 'burst');
    const penalty = overwatch && !this.fx(u, 'sentinel') ? OVERWATCH_PENALTY : 0;
    let fired = 0;
    for (let i = 0; i < shots && target.hp > 0 && u.clip > 0; i++) {
      fired++;
      if (!(Math.random() < this.fx(u, 'thrifty'))) u.clip--;
      const chance = this.shotChance(b, u, target, penalty);
      if (Math.random() * 100 < chance) {
        const crit = Math.random() < CRIT_CHANCE + this.fx(u, 'crit');
        const dmg = Math.round((randInt(gun.dmg[0], gun.dmg[1]) + this.fx(u, 'gunDmg')) * (crit ? (this.fx(u, 'headhunter') ? 2 : 1.5) : 1));
        this.addLog(b, `${u.name.split(' ')[0]} ${overwatch ? '(overwatch) ' : ''}shoots the ${target.name}: ${crit ? 'critical! ' : ''}${dmg} damage (${chance}%).`);
        this.damage(b, target, dmg, u);
        if (this.fx(u, 'stun') && target.hp > 0 && !ENEMIES[target.type].heart) {
          target.stunned = true;
          this.addLog(b, `The ${target.name} reels.`);
        }
      } else {
        this.addLog(b, `${u.name.split(' ')[0]} ${overwatch ? '(overwatch) ' : ''}shoots at the ${target.name} and misses (${chance}%).`);
      }
    }
    this.makeNoise(b, u, Math.round(gun.noise * fired * (1 - this.fx(u, 'quiet'))));
    if (!overwatch) {
      // Double Tap: once a turn, a free second shot.
      if (this.fx(u, 'doubleTap') && !u.tapped && target.hp > 0 && u.clip > 0) {
        u.tapped = true;
        this.addLog(b, 'Double tap!');
        const ap = u.ap;
        this.shoot(b, u, target, true);
        u.ap = ap;
      }
      // A shot ends your turn, unless you have learned to run and gun.
      if (this.fx(u, 'snapshot')) u.ap--;
      else u.ap = 0;
    }
    this.checkEnd(b);
  },
  melee(b, u, target, free = false) {
    if (!free) u.ap--;
    u.overwatch = false;
    const swings = Math.random() < this.fx(u, 'flurry') ? 2 : 1;
    for (let i = 0; i < swings && target.hp > 0; i++) {
      if (i) this.addLog(b, 'Flurry!');
      this.strike(b, u, target);
    }
    this.checkEnd(b);
  },
  // One melee blow, with everything the skill tree adds to it.
  strike(b, u, target) {
    const w = this.meleeOf(u);
    const chance = this.meleeChance(u);
    if (Math.random() * 100 >= chance) {
      this.addLog(b, `${u.name.split(' ')[0]} swings at the ${target.name} and misses (${chance}%).`);
      return;
    }
    let dmg = randInt(w.dmg[0], w.dmg[1]) + (SPECIALTIES[u.spec] ? SPECIALTIES[u.spec].meleeDmg || 0 : 0) + this.fx(u, 'meleeDmg');
    if (this.fx(u, 'execute') && target.hp < target.maxHp / 2) dmg *= 2;
    this.addLog(b, `${u.name.split(' ')[0]} hits the ${target.name} with ${w === FISTS ? 'bare fists' : `the ${w.name.toLowerCase()}`} for ${dmg} (${chance}%).`);
    this.damage(b, target, dmg, u);
    // Cleave and Whirlwind: the swing carries on into others.
    const cleave = this.fx(u, 'cleave');
    if (cleave) {
      const others = this.enemies(b).filter(e => e !== target && this.manhattan(u, e) === 1);
      for (const e of cleave >= 1 ? others : others.slice(0, 1)) {
        const extra = Math.max(1, Math.round(dmg * Math.min(1, cleave)));
        this.addLog(b, `The swing carries into the ${e.name} (${extra}).`);
        this.damage(b, e, extra, u);
      }
    }
    // Bloodlust: a kill gives back an action (once a turn, or every time with Reaper).
    if (target.hp <= 0 && this.fx(u, 'bloodlust') && (!u.bled || this.fx(u, 'reaper'))) {
      u.bled = true;
      u.ap = Math.min(2, u.ap + 1);
      this.addLog(b, `${u.name.split(' ')[0]} is already looking for the next one.`);
    }
  },
  damage(b, target, dmg, by) {
    if (target.side === 'p') return this.hurt(b, target, dmg, by);
    target.hp -= dmg;
    target.dormant = false;
    if (target.hp > 0) return;
    const e = ENEMIES[target.type];
    b.kills++;
    this.addLog(b, `The ${target.name} goes down.`);
    if (by && by.side === 'p') {
      by.kills = (by.kills || 0) + 1;
      by.xp = (by.xp || 0) + e.xp;
    }
    if (e.heart) {
      b.heartKilled = true;
      this.addLog(b, `🔥 ${target.name} bursts and burns. Get out!`);
    }
    if (e.burst) {
      this.addLog(b, 'It bursts in a cloud of rot.');
      for (const u of b.units.filter(v => this.onMap(v) && v.hp > 0 && Math.max(Math.abs(v.x - target.x), Math.abs(v.y - target.y)) <= 1)) this.damage(b, u, e.burst, null);
    }
    if (e.human && Math.random() < 0.5) {
      const ammo = randInt(2, 5);
      b.bag.resources.ammo = (b.bag.resources.ammo || 0) + ammo;
      this.addLog(b, `You take ${ammo} ammo off the body.`);
    }
  },
  // A survivor is hit. At zero they go down, and bleed out unless someone gets them up.
  hurt(b, u, dmg, by) {
    // A downed survivor who is attacked bleeds out faster.
    if (u.downed) {
      u.downed--;
      this.addLog(b, u.downed ? `🩸 ${u.name} is mauled where they lie. ${u.downed} turn${u.downed > 1 ? 's' : ''} left.` : `💀 ${u.name} is torn apart where they lie.`);
      return;
    }
    u.hp -= dmg;
    if (by && ENEMIES[by.type] && !this.fx(u, 'immune') && Math.random() < ENEMIES[by.type].infect && !(Math.random() < this.fx(u, 'resist'))) {
      u.infected = true;
      this.addLog(b, `🦠 ${u.name.split(' ')[0]} is bitten. The wound looks wrong.`);
    }
    if (u.hp <= 0 && this.fx(u, 'secondWind') && !u.rose) {
      u.rose = true;
      u.hp = 5;
      this.addLog(b, `${u.name.split(' ')[0]} staggers, and does not go down.`);
      return;
    }
    if (u.hp <= 0) {
      u.hp = 0;
      u.downed = DOWNED_TURNS;
      u.overwatch = false;
      u.ap = 0;
      this.addLog(b, `🩸 ${u.name} is down! They will bleed out in ${DOWNED_TURNS} turns unless someone helps them up.`);
    }
  },
  makeNoise(b, u, amount) {
    if (!amount) return;
    b.noise += amount;
    b.noiseMade += amount;
    for (const e of this.enemies(b)) if (e.dormant && Math.hypot(e.x - u.x, e.y - u.y) <= WAKE_RADIUS) e.dormant = false;
  },

  // --- Other actions ---
  reload(b, u) {
    const gun = this.gunOf(u);
    const free = this.fx(u, 'freeReload');
    if (!gun || (u.ap < 1 && !free) || u.clip >= gun.clip) return false;
    if (b.ammo <= 0) {
      this.addLog(b, 'There is no ammo left to reload with.');
      return false;
    }
    const need = gun.clip - u.clip;
    const take = Math.min(need, b.ammo);
    b.ammo -= take;
    u.clip += take;
    if (!free) u.ap--;
    this.addLog(b, `${u.name.split(' ')[0]} reloads.`);
    return true;
  },
  overwatch(b, u) {
    if (!this.gunOf(u) || u.clip <= 0 || u.ap < 1) return false;
    u.overwatch = true;
    u.ap = 0;
    this.addLog(b, `${u.name.split(' ')[0]} watches the approach.`);
    return true;
  },
  adjacentCrate(b, u) {
    return b.crates.find(c => !c.open && this.manhattan(u, c) === 1);
  },
  search(b, u) {
    const crate = this.adjacentCrate(b, u);
    if (!crate || u.ap < 1) return false;
    crate.open = true;
    u.ap--;
    b.lootTaken = true;
    const type = b.siteId === 'base' ? null : SITE_TYPES[SITES[b.siteId].type];
    const found = [];
    // A scrounger turns up one more of something.
    const extra = type && this.fx(u, 'loot') ? pick(Object.keys(type.loot)) : null;
    for (const [res, [min, max]] of Object.entries(type ? type.loot : {})) {
      let n = randInt(min, max) + (res === extra ? this.fx(u, 'loot') : 0);
      if (res === 'materials' && SPECIALTIES[u.spec].builder) n += 1;
      if (n > 0) {
        b.bag.resources[res] = (b.bag.resources[res] || 0) + n;
        found.push(`${RESOURCES[res].icon} ${n}`);
      }
    }
    if (type && type.weapons.length && Math.random() < 0.2) {
      const w = pick(type.weapons);
      b.bag.weapons.push(w);
      found.push(`${WEAPONS[w].icon} ${WEAPONS[w].name}`);
    }
    if (Math.random() < 0.15) {
      const g = pick(['medkit', 'pipe_bomb']);
      b.gear[g] = (b.gear[g] || 0) + 1;
      found.push(`${GEAR[g].icon} ${GEAR[g].name}`);
    }
    this.addLog(b, `${u.name.split(' ')[0]} searches the crate: ${found.join(', ') || 'nothing worth taking'}.`);
    return true;
  },
  // Heal yourself or someone next to you with a medkit.
  heal(b, u, target) {
    if (u.ap < 1 || !(b.gear.medkit > 0) || this.manhattan(u, target) > 1 || target.downed || target.hp >= target.maxHp) return false;
    const amount = GEAR.medkit.heal * (SPECIALTIES[u.spec].healBonus ? 2 : 1);
    target.hp = Math.min(target.maxHp, target.hp + amount);
    b.gear.medkit--;
    u.ap--;
    this.addLog(b, `${u.name.split(' ')[0]} patches up ${target === u ? 'their own wounds' : target.name.split(' ')[0]} (+${amount}).`);
    return true;
  },
  revive(b, u, target) {
    if (u.ap < 1 || !target.downed || this.manhattan(u, target) > 1) return false;
    target.downed = 0;
    target.hp = Math.max(1, Math.floor(target.maxHp / 4));
    target.ap = 0;
    u.ap--;
    this.addLog(b, `${u.name.split(' ')[0]} gets ${target.name.split(' ')[0]} back on their feet.`);
    return true;
  },
  // Throw something at a tile within 6.
  canThrow(b, u, x, y) {
    return u.ap > 0 && Math.hypot(u.x - x, u.y - y) <= 6 && this.los(b, u, { x, y });
  },
  // Pipe bombs, molotovs and grenades: damage everything within the radius (friends too).
  throwBomb(b, u, x, y, kind = 'pipe_bomb') {
    const def = GEAR[kind];
    if (!def || !def.blast || !(b.gear[kind] > 0) || !this.canThrow(b, u, x, y)) return false;
    b.gear[kind]--;
    u.ap = 0;
    this.addLog(b, `${u.name.split(' ')[0]} throws a ${def.name.toLowerCase()}. ${def.burn ? 'WHOOMPH.' : 'BOOM.'}`);
    const hit = b.units.filter(v => this.onMap(v) && v.hp > 0 && Math.max(Math.abs(v.x - x), Math.abs(v.y - y)) <= def.radius);
    for (const v of hit) {
      this.damage(b, v, def.dmg, u);
      if (def.burn && v.side === 'e' && v.hp > 0) {
        v.burning = def.burn;
        v.burnBy = u.id;
      }
    }
    for (const key of Object.keys(b.barricades)) {
      const [bx, by] = key.split(',').map(Number);
      if (Math.max(Math.abs(bx - x), Math.abs(by - y)) <= def.radius) this.damageBarricade(b, bx, by, def.dmg);
    }
    this.makeNoise(b, u, def.noise);
    this.checkEnd(b);
    return true;
  },
  throwFlare(b, u, x, y) {
    if (!(b.gear.flare > 0) || !this.canThrow(b, u, x, y)) return false;
    b.gear.flare--;
    u.ap--;
    b.flare = { x, y, turns: GEAR.flare.lure };
    this.addLog(b, `${u.name.split(' ')[0]} lights a flare. Red light floods the street.`);
    return true;
  },
  // Leave the map from the green tiles where you came in.
  canExtract(b, u) {
    return !this.siege(b) && u.ap > 0 && this.tile(b, u.x, u.y) === 'x';
  },
  extract(b, u) {
    if (!this.canExtract(b, u)) return false;
    u.extracted = true;
    this.addLog(b, `${u.name.split(' ')[0]} gets out.`);
    this.checkEnd(b);
    return true;
  },

  // --- The enemy turn ---
  endTurn(b) {
    if (b.result) return;
    // Survivors waiting to be rescued wake up and follow once someone reaches them.
    for (const p of this.players(b).filter(p => p.waiting)) {
      if (this.standing(b).some(u => this.manhattan(u, p) <= 1)) {
        p.waiting = false;
        this.addLog(b, `"Thank God. I'm right behind you." ${p.name} joins the squad.`);
      }
    }
    this.enemyPhase(b);
    if (b.result) return;
    b.turn++;
    // Bleeding out.
    for (const u of b.units.filter(u => u.side === 'p' && u.downed > 0 && !u.extracted)) {
      u.downed--;
      if (u.downed <= 0) this.addLog(b, `💀 ${u.name} has bled out.`);
    }
    for (const u of this.standing(b)) Object.assign(u, { ap: 2, moved: false, tapped: false, bled: false });
    for (const p of this.players(b).filter(p => p.npc && !p.waiting && p.hp > 0)) p.ap = 2;
    if (b.flare && --b.flare.turns <= 0) b.flare = null;
    this.updateAwareness(b);
    this.checkEnd(b);
  },
  enemyPhase(b) {
    // The watchtower lookout picks off what it can.
    if (b.kind === 'defend') this.lookout(b);
    // Noise and time bring more of the dead (in a siege, they are all coming anyway).
    let spawns = this.siege(b) ? 0 : Math.floor(b.noise / NOISE_PER_SPAWN);
    if (!this.siege(b)) b.noise -= spawns * NOISE_PER_SPAWN;
    if (!this.siege(b) && b.turn % AMBIENT_EVERY === 0) spawns++;
    for (let i = 0; i < spawns && this.enemies(b).length < MAX_MAP_ENEMIES; i++) this.spawnAtEdge(b, pick(['walker', 'walker', 'runner']), 'Drawn by the noise, ');
    if (b.waves) this.nextWave(b);
    for (const e of this.enemies(b)) {
      if (b.result) return;
      if (e.hp <= 0) continue;
      if (e.burning) {
        e.burning--;
        this.addLog(b, `🔥 The ${e.name} burns (2).`);
        this.damage(b, e, 2, b.units.find(v => v.id === e.burnBy && v.hp > 0) || null);
        this.checkEnd(b);
        if (e.hp <= 0) continue;
      }
      if (ENEMIES[e.type].heart) this.heartTurn(b, e);
      else if (e.human) this.raiderTurn(b, e);
      else this.zombieTurn(b, e);
      this.checkEnd(b);
    }
  },
  lookout(b) {
    const shots = Game.facility('watchtower').sniper || 0;
    for (let i = 0; i < shots; i++) {
      const targets = this.enemies(b).filter(e => e.y < 6);
      if (!targets.length) return;
      const t = pick(targets);
      if (Math.random() < 0.6) {
        this.addLog(b, `🗼 The lookout shoots the ${t.name} (4).`);
        this.damage(b, t, 4, null);
      } else {
        this.addLog(b, '🗼 The lookout fires and misses.');
      }
    }
  },
  nextWave(b) {
    const w = b.waves;
    if (!w.left || b.turn < w.nextTurn) return;
    w.left--;
    w.nextTurn = b.turn + 3;
    const pool = ['walker', 'walker', 'runner', 'bloater'];
    if (Game.state.day >= 8) pool.push('feral');
    if (Game.state.day >= 14) pool.push('juggernaut');
    for (let i = 0; i < w.size; i++) this.spawnAtEdge(b, pick(pool), null, true);
    this.addLog(b, `📯 A wave of ${w.size} comes ${b.kind === 'hold' ? 'at the barricades' : 'up the hill'}.${w.left ? ` ${w.left} more to come.` : ' The last of them.'}`);
  },
  spawnAtEdge(b, type, why, topOnly = false) {
    for (let i = 0; i < 40; i++) {
      const side = topOnly ? 0 : randInt(0, 2);
      const x = side === 1 ? 0 : side === 2 ? b.w - 1 : randInt(0, b.w - 1);
      const y = side === 0 ? randInt(0, 1) : randInt(0, b.h - 6);
      if (this.tile(b, x, y) === '.' && this.open(b, x, y)) {
        const u = this.spawn(b, type, x, y);
        if (why) this.addLog(b, `${why}a ${u.name.toLowerCase()} shambles in.`);
        return u;
      }
    }
    return null;
  },
  // A heart pushes out more of the dead every other turn.
  heartTurn(b, e) {
    if (b.turn % 2) return;
    const n = b.kind === 'hive' ? 2 : 1;
    for (let i = 0; i < n && this.enemies(b).length < MAX_MAP_ENEMIES; i++) {
      const spots = DIRS.map(([dx, dy]) => ({ x: e.x + dx, y: e.y + dy })).filter(p => this.open(b, p.x, p.y));
      if (!spots.length) return;
      const s = pick(spots);
      this.spawn(b, pick(['walker', 'walker', 'runner']), s.x, s.y);
      this.addLog(b, `🫀 The ${e.name} pulses, and something crawls out of it.`);
    }
  },
  // Sleeping dead wake when they see you; awake ones close in and bite.
  updateAwareness(b) {
    for (const e of this.enemies(b)) {
      if (!e.dormant) continue;
      const sight = ENEMIES[e.type].sight;
      for (const u of this.standing(b)) {
        const s = sight - (SPECIALTIES[u.spec] && SPECIALTIES[u.spec].stealth ? 2 : 0) - this.fx(u, 'stealth');
        if (Math.hypot(u.x - e.x, u.y - e.y) <= s && this.los(b, e, u)) {
          e.dormant = false;
          break;
        }
      }
    }
  },
  zombieTurn(b, e) {
    if (e.dormant) return;
    if (e.stunned) {
      e.stunned = false;
      return;
    }
    const def = ENEMIES[e.type];
    // A flare draws every zombie that can see it.
    const goal = b.flare && this.los(b, e, b.flare) ? b.flare : null;
    const targets = goal ? [] : this.players(b);
    const path = this.pathTo(b, e, goal ? [goal] : targets);
    let steps = def.move;
    while (path && path.length && steps > 0) {
      const next = path[0];
      if (targets.some(t => t.x === next.x && t.y === next.y)) break;
      if (this.tile(b, next.x, next.y) === 'b') {
        this.attackBarricade(b, e, next.x, next.y);
        return;
      }
      if (!this.open(b, next.x, next.y)) break;
      e.x = next.x;
      e.y = next.y;
      path.shift();
      steps--;
      this.triggerOverwatch(b, e);
      if (e.hp <= 0) return;
    }
    if (goal) return;
    const victims = this.players(b).filter(u => this.manhattan(u, e) === 1);
    if (!victims.length) return;
    // Finish the downed first: the dead are not fussy.
    const victim = victims.find(v => v.downed) || pick(victims);
    for (let i = 0; i < (def.attacks || 1) && this.onMap(victim) && (victim.hp > 0 || victim.downed); i++) {
      const cover = this.cover(b, victim, e) ? 15 : 0;
      const chance = def.aim - cover - this.fx(victim, 'guard');
      if (victim.downed || Math.random() * 100 < chance) {
        const dmg = randInt(def.dmg[0], def.dmg[1]);
        this.addLog(b, `The ${e.name} ${victim.downed ? 'falls on' : 'bites'} ${victim.name.split(' ')[0]} (${dmg}).`);
        this.hurt(b, victim, dmg, e);
      } else {
        this.addLog(b, `The ${e.name} lunges at ${victim.name.split(' ')[0]} and misses.`);
        // Counterstrike: a miss is an opening.
        if (this.fx(victim, 'counter') && victim.hp > 0) {
          this.addLog(b, `${victim.name.split(' ')[0]} hits back!`);
          this.strike(b, victim, e);
          if (e.hp <= 0) return;
        }
      }
    }
  },
  attackBarricade(b, e, x, y) {
    const dmg = randInt(ENEMIES[e.type].dmg[0], ENEMIES[e.type].dmg[1]);
    this.addLog(b, `The ${e.name} claws at the barricade.`);
    this.damageBarricade(b, x, y, dmg);
  },
  damageBarricade(b, x, y, dmg) {
    const key = `${x},${y}`;
    if (!(key in b.barricades)) return;
    b.barricades[key] -= dmg;
    if (b.barricades[key] <= 0) {
      delete b.barricades[key];
      this.setTile(b, x, y, '.');
      this.addLog(b, '🧱 A barricade gives way!');
    }
  },
  // Overwatch: the first enemy that moves where a watcher can see it takes a shot.
  // Sentinel fires twice; Kill Zone keeps watching until the gun is empty.
  triggerOverwatch(b, e) {
    for (const u of this.standing(b).filter(u => u.overwatch)) {
      const gun = this.gunOf(u);
      if (!gun || u.clip <= 0 || Math.hypot(u.x - e.x, u.y - e.y) > this.gunRange(u) + 2 || !this.los(b, u, e)) continue;
      if (!this.fx(u, 'killZone')) u.overwatch = false;
      for (let i = 0; i < (this.fx(u, 'sentinel') ? 2 : 1) && e.hp > 0 && u.clip > 0; i++) this.shoot(b, u, e, true);
      if (u.clip <= 0) u.overwatch = false;
      if (e.hp <= 0) return;
    }
  },
  // Raiders move to cover near you and shoot.
  raiderTurn(b, e) {
    const def = ENEMIES[e.type];
    if (e.dormant) {
      if (this.standing(b).some(u => Math.hypot(u.x - e.x, u.y - e.y) <= def.sight && this.los(b, e, u))) e.dormant = false;
      else return;
    }
    const targets = this.standing(b);
    if (!targets.length) return;
    const inSight = targets.filter(t => this.los(b, e, t) && Math.hypot(t.x - e.x, t.y - e.y) <= def.range);
    if (!inSight.length || this.cover(b, e, inSight[0]) === 0) {
      // Find a covered spot within reach that sees a target.
      const reach = this.reach(b, e, def.move);
      let best = null;
      for (const key of reach.keys()) {
        const [x, y] = key.split(',').map(Number);
        const spot = { x, y };
        const t = targets.find(t => this.los(b, spot, t) && Math.hypot(t.x - x, t.y - y) <= def.range);
        const score = (t ? 50 : 0) + (t ? this.cover(b, spot, t) : 0) - Math.min(...targets.map(t => this.manhattan(spot, t)));
        if (!best || score > best.score) best = { x, y, score };
      }
      if (best) {
        e.x = best.x;
        e.y = best.y;
        this.triggerOverwatch(b, e);
        if (e.hp <= 0) return;
      }
    }
    const shootable = targets.filter(t => this.los(b, e, t) && Math.hypot(t.x - e.x, t.y - e.y) <= def.range && t.hp > 0);
    if (!shootable.length) return;
    const t = shootable.sort((a, c) => this.cover(b, a, e) - this.cover(b, c, e))[0];
    const chance = Math.max(5, Math.min(90, def.aim - this.cover(b, t, e) - this.fx(t, 'dodge')));
    if (Math.random() * 100 < chance) {
      const dmg = randInt(def.dmg[0], def.dmg[1]);
      this.addLog(b, `The ${e.name} shoots ${t.name.split(' ')[0]} (${dmg}, ${chance}%).`);
      this.hurt(b, t, dmg, e);
    } else {
      this.addLog(b, `The ${e.name} shoots at ${t.name.split(' ')[0]} and misses (${chance}%).`);
    }
    this.makeNoise(b, e, 2);
  },
  // Shortest walk to stand next to any of the targets (barricades count as passable, to be broken).
  pathTo(b, e, targets) {
    if (!targets.length) return null;
    const goals = new Set(targets.map(t => `${t.x},${t.y}`));
    const prev = new Map([[`${e.x},${e.y}`, null]]);
    const queue = [[e.x, e.y]];
    let end = null;
    while (queue.length && !end) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (prev.has(key)) continue;
        const t = this.tile(b, nx, ny);
        if (goals.has(key)) {
          prev.set(key, `${x},${y}`);
          end = key;
          break;
        }
        if (t === '#' || t === 'c' || this.crateAt(b, nx, ny)) continue;
        const occupant = this.unitAt(b, nx, ny);
        if (occupant && occupant.side === 'e') continue;
        prev.set(key, `${x},${y}`);
        queue.push([nx, ny]);
      }
    }
    if (!end) return null;
    const path = [];
    for (let k = end; k && k !== `${e.x},${e.y}`; k = prev.get(k)) {
      const [x, y] = k.split(',').map(Number);
      path.unshift({ x, y });
    }
    return path;
  },

  // --- Is it over? ---
  checkEnd(b) {
    if (b.result) return;
    const active = b.units.filter(u => u.side === 'p' && !u.npc && this.onMap(u));
    if (this.siege(b)) {
      if (!active.some(u => u.hp > 0)) {
        b.result = 'lost';
        this.addLog(b, 'The last defender falls.');
      } else if (!b.waves.left && !this.enemies(b).length) {
        b.result = 'won';
        this.addLog(b, 'The last of them falls against the walls.');
      }
      return;
    }
    if (active.length) return;
    const home = b.units.some(u => u.side === 'p' && !u.npc && u.extracted);
    const goalMet = b.kind === 'scavenge' ? b.lootTaken : b.kind === 'rescue' ? b.units.some(u => u.npc && u.extracted) : b.heartKilled;
    b.result = home && goalMet ? 'won' : 'lost';
  },
};
