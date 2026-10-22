# Echoes of the Abyss

A browser idle game inspired by *Melvor Idle*, set in a world that mixes classic D&D-style fantasy with H.P. Lovecraft's cosmic horror.

> The Kingdom of Aldmark was once a land of knights and wizards, and of gods who answered when you prayed. Then the star fell.

## Play

No build step is needed. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

The game also runs as-is on GitHub Pages (Settings → Pages → deploy from branch).

## Features

- **World map.** Travel along roads between 12 settlements, wild places and dungeons. Journeys take time, and some roads have requirements: a lantern for the Drowned Catacombs, a ferryman's fee for Devil's Reef, a diving helm for the Abyss.
- **Where you are matters.** Each location has its own trees, fishing waters, ore veins, herbs, workplaces (fire, forge, star forge, alchemy lab, forbidden library, elder altar), enemies and services (bank, shop, inn).
- **What you carry matters.**
  - Your pack has limited slots, and banks only exist in some towns.
  - Gathering needs the right tool in your pack, and better tools work faster.
  - A tinderbox or an alchemy kit lets you cook or brew anywhere.
- **12 skills.**
  - Gathering: Woodcutting, Fishing, Mining, Foraging
  - Crafting: Cooking, Smithing, Alchemy, Occultism
  - Combat: Attack, Strength, Defence, Hitpoints
- **Sanity.** A second health bar that eldritch enemies and occult study wear down. If it reaches zero you flee in panic. Amulets ward it, potions restore it, and inns let you recover.
- **16 enemies**, from giant crabs on Saltmire Shore to Father Dagon in the Abyss.
- **Gear** in five metal tiers (iron → starmetal), rare drops, occult amulets and bags (up to a Bag of Holding).
- **Offline progress** for up to 24 hours (including travel), autosave, and save export/import.

## Code layout

| File | Contents |
| --- | --- |
| `js/data.js` | All game data: skills, items, actions, monsters, shops, locations, roads and lore |
| `js/game.js` | Engine: state, tick loop, travel and route finding, pack and bank, combat, sanity, saving, offline simulation |
| `js/ui.js` | Page rendering, the SVG world map, meters and click handling |
| `js/main.js` | Boot, game loop and autosave |
| `css/style.css` | Styling, including the mobile layout |

New content goes in `js/data.js`:

- **New activity:** add an entry to `ACTIONS`, then list it in a location's `gather` or give it a `station`.
- **New place:** add an entry to `LOCATIONS` and at least one road to `ROADS`.
