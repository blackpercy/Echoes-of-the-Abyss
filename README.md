# Echoes of the Abyss

An idle exploration game for the browser, set in a world that mixes classic D&D-style fantasy with H.P. Lovecraft's cosmic horror. You wander a map of towns, wilds and dungeons, and what you can do depends on where you stand and what you carry.

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
- **9 skills, levels 1–50.**
  - Gathering: Woodcutting, Fishing, Mining, Foraging
  - Crafting: Cooking, Smithing, Alchemy, Occultism
  - Adventuring: Combat
- **Dice-based combat.** Each attack is a d20 roll plus your proficiency and gear against the enemy's armour class. Damage comes from weapon dice (`1d8`, `2d6+3`…) and a natural 20 is a critical hit. Pick an aggressive, balanced or defensive stance.
- **Sanity.** When something eldritch wounds you, you roll a sanity save against its DC. Failing it, or studying the occult, costs sanity. At zero you flee in panic. Warding amulets and Occultism levels improve your saves, potions restore sanity, and inns let you recover.
- **Madness is not the end.** Below 40 sanity you see through the Veil: hidden places appear on the map (the Lighthouse That Isn't, the Market Under the Hill), along with resources and people no one else can see. When sanity hits zero your mind breaks and you keep playing. You gain a madness level and a random *derangement* with an upside and a downside.
  - Example: *Drowned Lungs* lets you reach the Abyss without a diving helm, but costs you hitpoints.
  - Deeper madness changes how the world treats you. From *Unmoored* the Veil never closes, Saltmire's townsfolk give you a discount as kin, and the Abbey's apothecary turns you away.
- **People and quests.** NPCs say different things depending on your state of mind. Two quest lines pull in opposite directions:
  - The Silent Order requires you to stay sane.
  - The Dreamer's Keeper requires you to go mad.
  - Each line has its own ending, and the game continues after both. The Abbey's Rite of Quieting can cure madness if you change your path.
- **Skill trees.** Every skill has a tree with a choice every 5 levels: one of two perks, 10 choices per skill and 90 in all.
  - Gathering perks make you faster, give double yields, extra experience, pack slots or rare finds.
  - Crafting perks make you faster, let you keep materials or produce double. Cooking gives heartier food, smithing gives combat bonuses and alchemy gives stronger potions.
  - Occultism perks lower sanity costs, improve sanity saves, open the Veil sooner and add damage against eldritch beings.
  - Combat perks give hit, AC, hitpoints, damage, a wider critical range or healing when you slay an enemy.
  - Perks can be unlearned for gold.
- **Your character.** Choose an ancestry (human, dwarf, elf, halfling, tiefling) and a background (fisher, acolyte, soldier, scholar, smuggler). Each gives bonuses and changes how people talk to you.
- **A map you discover.** You start knowing only Saltmire. Roads out of places you have visited are visible but unexplored ("???"), and people will tell you about places further away if you ask.
- **Road events.** Bandits, a hooded pedlar, a drowned procession seen only through the Veil, and more. You make choices, some with skill checks (d20 + skill level ÷ 4 against a DC).
- **Time and tide.** One day lasts 20 minutes.
  - At night the Veil is thinner, eldritch saves are harder, and some herbs only bloom then.
  - At low tide you can wade to Devil's Reef for free.
  - Every seventh night the stars are right: eldritch xp is doubled and the Abyss stands open.
- **Gifts of madness.** Each madness level unlocks an ability, such as *Speak with the Dead*, *Walk the Dream Roads* or *Feast on Fear*.
- **Hallucinations.** From *Unmoored* onward, harmless phantoms appear: fake log lines, items that are not in your pack, enemies and places that vanish when touched.
- **A third path: your own cult.** Recruit followers in Saltmire and assign them tasks. They gather gold and resources while you are away. Leading the cult has its own quest line and ending.
- **Companions.** Hire Gorim the dwarven sellsword, Brother Tobias the healer or Mad Meg. They fight beside you and have minds of their own to lose.
- **Expeditions.** The Catacomb Depths, the Sealed Shaft and the Sunken Temple are chains of fights with no rest in between and a treasure at the end.
- **Endings change the world.** After each ending, Saltmire and the shore change: new descriptions, different enemies, new shops.
- **More people and quests** in Ironhold, the Silent Abbey, the Blackwood and the Crater.
- **Bestiary and achievements.** The bestiary reads differently to a troubled mind. There are 20 achievements.
- **Ambient sound.** Generated waves, drone and whispers (Web Audio, no files). Turn it on in the header or Settings.
- **Installable app.** A web manifest and a service worker let you install the game and play offline when it is served over http(s).
- **20 enemies**, from giant crabs on Saltmire Shore to Father Dagon in the Abyss.
- **Gear** in five metal tiers (iron → starmetal), rare drops, occult amulets and bags (up to a Bag of Holding).
- **Offline progress** for up to 24 hours (including travel), autosave, and save export/import.

## Code layout

| File | Contents |
| --- | --- |
| `js/data.js` | All game data: skills, items, actions, monsters, shops, locations, roads and lore |
| `js/story.js` | The Veil: madness stages, derangements, hidden places, NPCs, quests and endings |
| `js/content.js` | The living world: time and tide, road events, races, companions, cult, expeditions, more NPCs and quests, world changes, bestiary, achievements, hallucinations |
| `js/game.js` | Engine: state, tick loop, travel and route finding, pack and bank, combat, sanity, saving, offline simulation |
| `js/ui.js` | Page rendering, the SVG world map, meters and click handling |
| `js/mind.js` | Madness, the Veil, NPC interactions and the quest engine |
| `js/systems.js` | Logic for time, fog of war, events, companions, the cult, expeditions, world changes and achievements |
| `js/audio.js` | Generated ambient sound |
| `js/perks.js` | Skill trees: perk effects, the ten tiers per skill, choosing and unlearning perks |
| `js/main.js` | Boot, game loop and autosave |
| `css/style.css` | Styling, including the mobile layout |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support and app installation. Bump `CACHE` in `sw.js` when files change. |

New content goes in `js/data.js`:

- **New activity:** add an entry to `ACTIONS`, then list it in a location's `gather` or give it a `station`.
- **New place:** add an entry to `LOCATIONS` and at least one road to `ROADS`.
- **New person or quest:** add an entry to `NPCS` or `QUESTS` in `js/story.js`. Conditions (`veil`, `minMadness`, `maxMadness`, `quests`) decide who appears and what they offer.
