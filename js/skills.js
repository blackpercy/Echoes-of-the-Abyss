// Holdout: levels and the skill tree. At level 2 a survivor picks a path (close quarters or firearms),
// at level 3 a specialty within it, and from level 4 to 7 one of two abilities at each level.
// fx: what a choice does, summed up across everything a survivor has chosen and read by the battle rules.

const LEVEL_XP = [0, 8, 20, 36, 56, 80, 110, 145, 185, 230];
const LEVEL_NAMES = ['Rookie', 'Survivor', 'Scrapper', 'Veteran', 'Hardened', 'Elite', 'Hero', 'Legend', 'Myth', 'Last Light'];
const LEVEL_AIM = 3;          // every level after the first
const LEVEL_HP = 1;
const PATH_LEVEL = 2;         // choose close quarters or firearms
const BRANCH_LEVEL = 3;       // choose a specialty within it
const TIER_LEVELS = [4, 5, 6, 7];

const PATHS = {
  melee: {
    name: 'Close Quarters', icon: '🪓', desc: 'Quiet and brutal. +1 melee damage and +10 to hit in melee.', fx: { meleeDmg: 1, meleeHit: 10 },
    branches: {
      brawler: {
        name: 'Brawler', icon: '🛡️', desc: 'Holds the line and takes the hits. +3 hitpoints.', fx: { hp: 3 },
        tiers: [
          [{ id: 'thick_skin', name: 'Thick Skin', desc: '+4 hitpoints.', fx: { hp: 4 } },
           { id: 'guard', name: 'Guard', desc: 'The dead hit you 15% less often.', fx: { guard: 15 } }],
          [{ id: 'counter', name: 'Counterstrike', desc: 'When a zombie misses you, you hit it back for free.', fx: { counter: 1 } },
           { id: 'cleave', name: 'Cleave', desc: 'A melee hit also cuts another enemy next to you, for half damage.', fx: { cleave: 0.5 } }],
          [{ id: 'second_wind', name: 'Second Wind', desc: 'The first time you go down in a mission, you get straight back up with 5 hitpoints.', fx: { secondWind: 1 } },
           { id: 'heavy_hands', name: 'Heavy Hands', desc: '+2 melee damage.', fx: { meleeDmg: 2 } }],
          [{ id: 'unbreakable', name: 'Unbreakable', desc: '+6 hitpoints, and bites never give you the Blood Plague.', fx: { hp: 6, immune: 1 } },
           { id: 'executioner', name: 'Executioner', desc: 'Melee hits on enemies below half health deal double damage.', fx: { execute: 1 } }],
        ],
      },
      slasher: {
        name: 'Slasher', icon: '🗡️', desc: 'Fast and slippery, many cuts. +1 movement.', fx: { move: 1 },
        tiers: [
          [{ id: 'bloodlust', name: 'Bloodlust', desc: 'Killing in melee gives you back an action, once a turn.', fx: { bloodlust: 1 } },
           { id: 'quick_feet', name: 'Quick Feet', desc: '+1 movement.', fx: { move: 1 } }],
          [{ id: 'flurry', name: 'Flurry', desc: '25% chance a melee attack strikes twice.', fx: { flurry: 0.25 } },
           { id: 'sidestep', name: 'Sidestep', desc: 'Everything hits you 10% less often.', fx: { guard: 10, dodge: 10 } }],
          [{ id: 'reaper', name: 'Reaper', desc: 'Every melee kill gives you back an action, as often as you can manage it.', fx: { bloodlust: 1, reaper: 1 } },
           { id: 'precision', name: 'Precision', desc: '+15 to hit and +1 damage in melee.', fx: { meleeHit: 15, meleeDmg: 1 } }],
          [{ id: 'whirlwind', name: 'Whirlwind', desc: 'A melee hit strikes every enemy next to you.', fx: { cleave: 1 } },
           { id: 'ghost', name: 'Ghost', desc: 'The dead notice you 2 tiles later.', fx: { stealth: 2 } }],
        ],
      },
    },
  },
  ranged: {
    name: 'Firearms', icon: '🔫', desc: 'Kill them before they reach you. +5 aim with guns.', fx: { aim: 5 },
    branches: {
      marksman: {
        name: 'Marksman', icon: '🎯', desc: 'One shot, one kill. +2 range with every gun.', fx: { range: 2 },
        tiers: [
          [{ id: 'steady_aim', name: 'Steady Aim', desc: '+15 aim if you have not moved this turn.', fx: { steady: 15 } },
           { id: 'deadeye', name: 'Deadeye', desc: '+10% chance of a critical hit.', fx: { crit: 0.1 } }],
          [{ id: 'long_shot', name: 'Long Shot', desc: '+3 range: no aim lost for 3 more tiles.', fx: { range: 3 } },
           { id: 'hollow_point', name: 'Hollow Points', desc: '+1 damage with guns.', fx: { gunDmg: 1 } }],
          [{ id: 'sentinel', name: 'Sentinel', desc: 'Overwatch has no aim penalty and fires twice.', fx: { sentinel: 1 } },
           { id: 'headhunter', name: 'Headhunter', desc: 'Critical hits deal double damage instead of one and a half.', fx: { headhunter: 1 } }],
          [{ id: 'silent_death', name: 'Silent Death', desc: 'Your shots make half the noise.', fx: { quiet: 0.5 } },
           { id: 'kill_zone', name: 'Kill Zone', desc: 'Overwatch fires at every enemy that moves in sight, until the gun is empty.', fx: { killZone: 1 } }],
        ],
      },
      gunslinger: {
        name: 'Gunslinger', icon: '🤠', desc: 'Fast hands and plenty of lead. Reloading is free.', fx: { freeReload: 1 },
        tiers: [
          [{ id: 'run_and_gun', name: 'Run and Gun', desc: 'Shooting costs one action instead of ending your turn.', fx: { snapshot: 1 } },
           { id: 'thrifty', name: 'Thrifty', desc: '30% chance a shot uses no ammo.', fx: { thrifty: 0.3 } }],
          [{ id: 'double_tap', name: 'Double Tap', desc: 'Once a turn, a free second shot at the same target.', fx: { doubleTap: 1 } },
           { id: 'stopping_power', name: 'Stopping Power', desc: 'Your hits stagger: the enemy loses its next turn.', fx: { stun: 1 } }],
          [{ id: 'lightning', name: 'Lightning Reflexes', desc: '+1 movement and +5 aim.', fx: { move: 1, aim: 5 } },
           { id: 'spray', name: 'Spray and Pray', desc: 'Every trigger pull fires one extra shot.', fx: { burst: 1 } }],
          [{ id: 'lucky', name: 'Lucky', desc: 'Everything hits you 10% less often.', fx: { guard: 10, dodge: 10 } },
           { id: 'last_stand', name: 'Last Stand', desc: 'The first time you go down in a mission, you get straight back up with 5 hitpoints.', fx: { secondWind: 1 } }],
        ],
      },
    },
  },
};
