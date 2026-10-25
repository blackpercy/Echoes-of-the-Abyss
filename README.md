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
- **33 skills, levels 1–100.**
  - Weapons: Blades, Polearms, Bows, Staves, Maces, Unarmed. Fighting with a weapon trains its type (50% of each kill's xp). Every 10 levels give +1 to hit and damage, and each type has its own trait:
    - **Blades:** a wider critical range at levels 25, 50, 75 and 100 (critical hits never start below 15).
    - **Polearms:** ignore 1 enemy AC per 15 levels.
    - **Bows:** attack 0.6% faster per level.
    - **Staves:** +1% damage against eldritch beings per level and +1 to sanity saves per 10 levels.
    - **Maces:** +0.5% chance per level that a hit staggers the enemy, so it starts its swing over.
    - **Unarmed:** your fists roll bigger dice every 10 levels (1d3 up to 4d8) and attack quickly; sneak attacks deal +1d6 per 15 levels. Knuckles keep your fists' dice and add their own bonuses.

    Each type also has its own perk tree, with second strikes, life-steal and armour piercing. Halberds can be smithed in every metal, and staves are carved at the workbench.
  - General: Wisdom, which gains 10% of the xp from every other skill. Each level gives +0.2% xp in all skills, and every perk choice is between learning faster and something else: gold, pack slots, hitpoints, sanity saves, travel, activity speed or crits.
  - Gathering: Woodcutting, Fishing, Mining, Foraging, Hunting, Archaeology, Dreaming, Grave Digging, Tidecombing
  - Crafting: Cooking, Smithing, Alchemy, Occultism, Carpentry, Tailoring, Inscription, Brewing
  - Adventuring: Combat, Fellowship, Stealth, Cartography, Trading, Sailing
  - Mind and Spirit: Faith, Forbidden Lore, Ritualism
- **Dreaming.** Sleep at an inn or on a bedroll and descend into the Dreamlands: Ulthar, the Enchanted Wood, Celephaïs, Dylath-Leen. Gentle dreams restore sanity. Leng and Kadath can only be reached by a broken mind.
- **Hunting.** Hunt game in the wild and tan the hides into light armour. Light armour gives less AC than metal but +1–2 to hit. Venison is cooked into food.
- **Archaeology.** Dig at five sites for relics. Complete a collection to earn a permanent bonus: +1 AC, +2 pack slots, +1 to sanity saves, +15 hitpoints or +5% damage against eldritch beings. Professor Peaslee digs 15% faster.
- **Carpentry.** Work wood into:
  - Bows (fast, accurate weapons) and spears.
  - An oak frame pack.
  - Shrine idols that give your cult room for more followers.
  - A **rowboat**: no ferry fee, and the only way to the new **Drowned Isle**.
- **Stealth.** Pick pockets and burgle for gold, at the risk of being caught and fined. Your first blow on each enemy is a sneak attack (+1d6 per 10 levels). After an expedition you may find a hidden vault that doubles the treasure. Some road events now have stealthy choices.
- **Grave Digging.** Dig graves with a spade for bones, grave goods, a saint's knucklebone and stranger bones. Whatever you disturb may wake, and you fight it there and then.
- **Tidecombing.** Comb the shore for kelp, sea glass, deep-spawn eggs and ambergris. Low tide doubles the haul, and the wreck and the black sand can only be reached at low tide.
- **Tailoring.** Sew robes and hoods at a loom. They give less AC than metal but far better sanity saves. Also a sailcloth sack.
- **Inscription.** Make ink and parchment and write scrolls: mending, flame and banishing to read in a fight, and warding, haste, true sight, fortune and the Elder Glyph to bless you for a while. Bind ten Necronomicon pages into the whole book.
- **Brewing.** Brew in inn cellars. Drink restores sanity, and most drinks leave you a little worse at aiming for a while.
- **Trading.** Each town makes goods cheaply and pays well for other towns' goods. Markets hold a limited stock that refills over time. Every Trading level gives better prices in every shop, and selling anything trains the skill.
- **Faith.** Pray, keep vigils, bless holy water and silver icons, and lay the dead to rest. Every 10 levels give +1 to sanity saves. The gods stop answering once you are Dream-Kissed.
- **Sailing.** Learned on sea roads, which it makes faster. From level 15 you work your passage for free. A trading ketch sails from Saltmire Shore to the new free port of **Port Ulric**.
- **Forbidden Lore.** Read forbidden tomes at a library for eldritch insight. Reading costs sanity but never uses up the book. Every 10 levels you see through the Veil sooner, and at level 20 you find the stair to **the Third Cellar** beneath the Silent Abbey.
- **Ritualism.** Perform rites in a ritual circle, each with an offering, for a blessing that lasts 10–15 minutes: wards, extra damage, gold, travel speed or experience.
- **Cartography.** You learn it by travelling and discovering places. It makes travel faster and improves road-event checks. Draw maps that reveal unexplored places, and treasure maps that lead to buried gold.
- **Dice-based combat.** Each attack is a d20 roll plus your proficiency and gear against the enemy's armour class. Damage comes from weapon dice (`1d8`, `2d6+3`…) and a natural 20 is a critical hit. Pick an aggressive, balanced or defensive stance.
- **Sanity.** When something eldritch wounds you, you roll a sanity save against its DC. Failing it, or studying the occult, costs sanity. At zero you flee in panic. Warding amulets and Occultism levels improve your saves, potions restore sanity, and inns let you recover.
- **Madness is not the end.** Below 40 sanity you see through the Veil: hidden places appear on the map (the Lighthouse That Isn't, the Market Under the Hill), along with resources and people no one else can see. When sanity hits zero your mind breaks and you keep playing. You gain a madness level and a random *derangement* with an upside and a downside.
  - Example: *Drowned Lungs* lets you reach the Abyss without a diving helm, but costs you hitpoints.
  - Deeper madness changes how the world treats you. From *Unmoored* the Veil never closes, Saltmire's townsfolk give you a discount as kin, and the Abbey's apothecary turns you away.
- **People and quests.** NPCs say different things depending on your state of mind. Two quest lines pull in opposite directions:
  - The Silent Order requires you to stay sane.
  - The Dreamer's Keeper requires you to go mad.
  - Each line has its own ending, and the game continues after both. The Abbey's Rite of Quieting can cure madness if you change your path.
- **Skill trees.** Every skill has a tree with a choice every 5 levels: one of two perks, 20 choices per skill and 660 in all. Levels 55–100 offer the same ten choices again as second ranks ("… II"), so a perk can be taken twice.
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
- **Companions.** Six companions can fight beside you, each with a mind of their own to lose:
  - Gorim, the dwarven sellsword.
  - Brother Tobias, the healer.
  - Mad Meg.
  - Ysolde the Hunter, after *Wolf Season*.
  - Old Gnaw, who cannot go mad and feeds on the fallen. For the touched, after *Hungry Company*.
  - Professor Peaslee, who gives you +2 to sanity saves, after *Samples from the Star*.

  You can lead one companion, plus one more for every 5 Fellowship levels. Each extra companion draws more of the enemy's attacks away from you, up to 75% in total.
- **Fellowship.** A skill trained by fighting and travelling with a companion.
  - Each level makes your companions tougher: more hitpoints and sanity, and better to-hit and damage. Every 5 levels let you lead one more companion.
  - Its perk tree adds companion bonuses, healing, a bodyguard stance and *Never Leave a Friend* (a downed companion gets back up without an inn).
  - Some Fellowship perks make travel up to 25% faster.
- **Expeditions.** The Catacomb Depths, the Sealed Shaft and the Sunken Temple are chains of fights with no rest in between and a treasure at the end.
- **Endings change the world.** After each ending, Saltmire and the shore change: new descriptions, different enemies, new shops.
- **More people and quests** in Ironhold, the Silent Abbey, the Blackwood and the Crater.
- **Bestiary and achievements.** The bestiary reads differently to a troubled mind. There are 20 achievements.
- **Ambient sound.** Generated waves, drone and whispers (Web Audio, no files). Turn it on in the header or Settings.
- **Installable app.** A web manifest and a service worker let you install the game and play offline when it is served over http(s).
- **20 enemies**, from giant crabs on Saltmire Shore to Father Dagon in the Abyss.
- **Gear** in five metal tiers (iron → starmetal), rare drops, occult amulets and bags (up to a Bag of Holding).
- **Dungeon gear with modifiers.** Gloves, rings, crowns and necklaces dropped by the creatures of the dungeons and expeditions (the Catacombs, the Sealed Shaft, the Third Cellar, the Abyss). Besides armour and wards they carry skill modifiers that work like perks while worn, such as "Mining: 20% faster", "Fishing: 10% chance of a double yield" or "+5% experience in every skill". Two new slots hold them: Hands and Ring. Work gloves and a silver ring can be made.
- **Offline progress** for up to 24 hours (including travel), autosave, and save export/import.

## Code layout

| File | Contents |
| --- | --- |
| `js/data.js` | All game data: skills, items, actions, monsters, shops, locations, roads and lore |
| `js/story.js` | The Veil: madness stages, derangements, hidden places, NPCs, quests and endings |
| `js/content.js` | The living world: time and tide, road events, races, companions, cult, expeditions, more NPCs and quests, world changes, bestiary, achievements, hallucinations |
| `js/expansion.js` | Dreaming, Hunting, Archaeology, Carpentry, Stealth and Cartography: their items, activities, workplaces, relic sets, the Drowned Isle and new road-event choices |
| `js/expansion2.js` | Grave Digging, Tidecombing, Tailoring, Inscription, Brewing, Trading, Faith, Sailing, Forbidden Lore, Ritualism, Maces and Unarmed: their items, activities, workplaces, trade goods, Port Ulric and the Third Cellar |
| `js/game.js` | Engine: state, tick loop, travel and route finding, pack and bank, combat, sanity, saving, offline simulation |
| `js/ui.js` | Page rendering, the SVG world map, meters and click handling |
| `js/mind.js` | Madness, the Veil, NPC interactions and the quest engine |
| `js/systems.js` | Logic for time, fog of war, events, companions, the cult, expeditions, world changes and achievements |
| `js/audio.js` | Generated ambient sound |
| `js/perks.js` | Skill trees: perk effects, the twenty tiers per skill, choosing and unlearning perks |
| `js/main.js` | Boot, game loop and autosave |
| `css/style.css` | Styling, including the mobile layout |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline support and app installation. Bump `CACHE` in `sw.js` when files change. |

New content goes in `js/data.js`:

- **New activity:** add an entry to `ACTIONS`, then list it in a location's `gather` or give it a `station`.
- **New place:** add an entry to `LOCATIONS` and at least one road to `ROADS`.
- **New person or quest:** add an entry to `NPCS` or `QUESTS` in `js/story.js`. Conditions (`veil`, `minMadness`, `maxMadness`, `quests`) decide who appears and what they offer.
