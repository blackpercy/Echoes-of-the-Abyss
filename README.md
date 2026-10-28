# Holdout

A turn-based zombie survival game for the browser: **State of Decay** meets **XCOM**.
Hold the old church on Grace Hill, send your people out into Marrow Creek, fight on a grid, and find and burn out the Hive before the dead overrun you.

No real time: nothing happens until you end a day or end a turn.

## Play

Open `index.html` in a browser, or host the folder on GitHub Pages. Plain HTML, CSS and JavaScript with no build step. Progress is saved in the browser.

## How it works

### The base (one day at a time)
- **Survivors** each have a specialty (Fighter, Sharpshooter, Scout, Medic, Engineer), hitpoints, aim, a gun and a melee weapon, and rise in rank with kills.
- **Resources:** food, materials, medicine, ammo and fuel. Everyone eats every day.
- **Facilities:** Bunks, Garden, Infirmary, Workshop, Watchtower, Walls and Radio Tower, built and upgraded with materials over several days. Engineers at home build faster.
- **Workshop:** make ammo, medkits, pipe bombs, flares and weapons.
- **Morale** affects aim; too low and people leave.
- **The Blood Plague:** bites can infect. Cure it at the infirmary within three days, or lose the survivor.
- **The horde** grows every day, faster with every Plague Heart in town and every noisy mission. At 100 it attacks the church.

### The region
- A map of Marrow Creek: houses, a diner, a gas station, a farm, a hardware store, a pharmacy, a school, a police station, a warehouse, a hospital and an army checkpoint.
- One mission a day: **scavenge**, **destroy a Plague Heart**, **rescue** someone who called on the radio, or **destroy the Hive** at the hospital to win.
- Missions cost fuel by distance. Places run out of supplies. Missions reveal more of the map.

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
| `js/game.js` | The strategic layer: days, the base, survivors, missions and saving |
| `js/tactics.js` | Turn-based battles: map generation, actions, hit chances, noise and enemy AI |
| `js/ui.js` | Everything on screen |
| `js/main.js` | Starts the game |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Install as an app and play offline |
