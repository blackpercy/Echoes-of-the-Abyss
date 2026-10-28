# Holdout

A turn-based zombie survival game for the browser: **State of Decay** meets **XCOM**.
Hold the old church on Grace Hill, send your people out into Marrow Creek, fight on a grid, and find and burn out the Hive before the dead overrun you.

No real time: nothing happens until you end a day or end a turn.

## Play

Open `index.html` in a browser, or host the folder on GitHub Pages. Plain HTML, CSS and JavaScript with no build step. Progress is saved in the browser.

## How it works

### The base (one day at a time)
- The church and its yard are drawn in **2.5D**: the walls rise with every level, buildings grow taller as you upgrade them, scaffolding marks what is being built, and your ready survivors stand in the yard. Tap a building or an empty plot to jump to it.
- **Survivors** each have a specialty (Fighter, Sharpshooter, Scout, Medic, Engineer), hitpoints, aim, a gun and a melee weapon. They earn xp for kills and missions and rise through ten levels (see below).
- **Traits:** everyone arrives with a strength (Tough, Former Cop, Athlete, Light Step, Scrounger, Handy, Cheerful, Quick Study, Hardy, Bar Fighter) and often a flaw (Glutton, Shaky Hands, Loud, Frail, Squeamish, Gloomy, Slow Healer). Some matter in battle, some at home.
- **Resources:** food, materials, medicine, ammo and fuel. Everyone eats every day.
- **Facilities:** Bunks, Garden, Infirmary, Workshop, Watchtower, Walls and Radio Tower, built and upgraded with materials over several days. Engineers at home build faster.
- **Workshop:** make ammo, medkits, pipe bombs, flares and weapons.
- **Morale** affects aim; too low and people leave.
- **The Blood Plague:** bites can infect. Cure it at the infirmary within three days, or lose the survivor.
- **The horde** grows every day, faster with every Plague Heart in town and every noisy mission. At 100 it attacks the church.

### Levels and the skill tree
- Every level gives +3 aim and +1 hitpoint. The **★** on the Survivors tab means someone has a choice to make; tap **Choose a skill** to open their tree. Choices are permanent.
- **Level 2, the path:** 🪓 **Close Quarters** (+1 melee damage, +10 to hit in melee) or 🔫 **Firearms** (+5 aim with guns).
- **Level 3, the specialty:**
  - Close Quarters: 🛡️ **Brawler** (tough, holds the line) or 🗡️ **Slasher** (fast, many cuts).
  - Firearms: 🎯 **Marksman** (range and overwatch) or 🤠 **Gunslinger** (free reloads, volume of fire).
- **Levels 4 to 7:** one of two skills at each level, for example:
  - Brawler: Counterstrike or Cleave, then Unbreakable or Executioner.
  - Slasher: Bloodlust, Flurry, Reaper or Whirlwind.
  - Marksman: Steady Aim, Sentinel (overwatch fires twice) or Kill Zone.
  - Gunslinger: Run and Gun, Double Tap, Stopping Power or Spray and Pray.
- That makes 64 different builds.

### The region
- The region is a **map laid on a table**, tilted in 2.5D, with every known place standing up from it on a signpost.
- A map of Marrow Creek: houses, a diner, a gas station, a farm, a hardware store, a pharmacy, a school, a police station, a warehouse, a hospital and an army checkpoint.
- One mission a day: **scavenge**, **destroy a Plague Heart**, **rescue** someone who called on the radio, or **destroy the Hive** at the hospital to win.
- Missions cost fuel by distance from the church or the nearest outpost. Places run out of supplies. Missions reveal more of the map.
- **Outposts:** claim up to three places you have been to (🔩 10 each). Each sends supplies home every day (a farm food, a gas station fuel, the police station ammo, and so on), and missions can set out from it. But the dead attack outposts, more often near a Plague Heart: send a squad within two days to hold the barricades, or lose it.

### Missions (turn-based)
- An **isometric 2.5D** battlefield: a 12 × 16 grid with raised walls, cars, crates and barricades, standing figures and fog of war. Zoom in and scroll on small screens, or switch to a flat top-down view.
- Each survivor has **two actions**: move (or run with both), reload, search a crate, heal, throw, leave. **Shooting ends the turn.**
- **Cover:** cars and crates give half cover, walls full cover. It matters against raiders.
- **Noise:** gunfire wakes sleeping dead and draws more in from the edges. Melee and suppressed weapons are quiet.
- **The dead:** walkers, runners, bloaters (they burst), ferals (strike twice), juggernauts, and Plague Hearts that spawn more. **Raiders** at some sites take cover and shoot back.
- **Downed, not dead:** at zero hitpoints a survivor bleeds out in three turns unless someone gets them up. Anyone left behind is lost.
- **Overwatch:** shoot the first thing that moves into view.
- **Sieges:** when the horde comes, defend the barricades over three waves. The watchtower lookout helps.

## Files

| File | What it is |
|------|------------|
| `index.html` | The page |
| `css/style.css` | All styling |
| `js/data.js` | Survivors, weapons, enemies, facilities, crafting and the region map |
| `js/skills.js` | Levels, xp and the branching skill tree |
| `js/game.js` | The strategic layer: days, the base, survivors, missions and saving |
| `js/tactics.js` | Turn-based battles: map generation, actions, hit chances, noise and enemy AI |
| `js/ui.js` | Everything on screen |
| `js/main.js` | Starts the game |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Install as an app and play offline |
