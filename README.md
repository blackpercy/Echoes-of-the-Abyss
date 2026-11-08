# Evolve (mobile-friendly copy)

This branch is a copy of **[Evolve](https://github.com/pmotschmann/Evolve)** by Peter Motschmann (Demagorddon),
an incremental game licensed under the [Mozilla Public License 2.0](LICENSE). It was taken from the original
repository at commit `3436358` (version 1.4.10). All credit for the game goes to its author.

## What is different here

The game's own code is unchanged except for the storage settings and the Additional Dyson Sphere (below). A small layer is added on top:

| File | What it does |
|------|--------------|
| `mobile/mobile.css` | Phone layout: the page scrolls instead of each panel, buttons two to a row and big enough for a thumb, tabs scroll sideways, pop-ups and dialogs fit the screen, no double-tap zoom. |
| `mobile/mobile.js` | A bottom bar to switch between **Resources**, **Game** and **Log** (with a count of new messages), a strip of resources above the game, and touch controls: **tap** to gather, build or research; **press and hold** to see what something costs and does. |

| `mobile/yield.js` | **Yield multiplier** (×1 to ×100,000) at the top of the Settings tab: every second, each growing resource gets that many times its usual net gain, up to its storage cap. |
| `mobile/genes.js` | An **Auto** toggle next to *Assemble Gene* (A.R.P.A. → Genetics): while on, it presses Assemble Gene once a second whenever Knowledge is full, so only knowledge that would go to waste is spent. |
| `mobile/storage.js` + `src/resources.js`, `src/main.js` | **Crate & container capacity** (×1 to ×1,000,000; ×1,000,000 after a one-time update) and **Money storage** (×1, ×10, ×100), ×100 by default in the Settings tab. These change the game itself: `crateValue()`, `containerValue()` and the money cap are multiplied through `storageBoost()`, and `evolve/main.js` is rebuilt from `src` with esbuild. |
| `src/main.js` | **Fuel depot storage** (×1, ×10, ×100; ×100 by default): the Oil, Helium-3, Uranium and Deuterium storage of Fuel Depots, Propellant Depots, Gas Storage, Transfer Stations, orbital and refueling stations, oil wells, helium mines and pumpjacks is multiplied (shown in the storage breakdown). |
| `src/main.js` | **Other storage** (×1, ×10, ×100; ×100 by default): every other storage cap (wood, stone, metals, food, knowledge, alloys and the rest) is multiplied before crates and containers are added (shown in the storage breakdown). Money, the fuels, and crates/containers keep their own settings. |
| `src/main.js` | **Spire supply storage** (×1, ×10, ×100, ×1000; ×1000 by default): the Spire's supply cap (Ports and Base Camps) is multiplied. |
| `src/main.js` | **Elerium storage** (×1, ×10, ×100, ×1000; ×1000 by default): the Elerium cap is multiplied (instead of the Other storage setting). |
| `src/main.js` | **Spire progress** (×1, ×10, ×100, ×1000; ×1000 by default): the mechs' progress on the current Spire floor is multiplied (at most one floor per update, as in the game). |
| `src/main.js` | **Spire supply gain** (×1, ×10, ×100, ×1000; ×1000 by default): the supply that transports and collector mechs bring in is multiplied; the goods shipped are not. |
| `src/main.js` | **Power generation** (×1, ×10, ×100, ×1000; ×1000 by default): the power all sources make is multiplied before buildings draw from it (shown in the power breakdown). |
| `src/main.js` | **No job stress or homelessness penalty**: stress from jobs and the army is never below 0 (bonuses such as Optimistic still count), and homeless citizens no longer lower morale. |
| `src/main.js` | **Blood Stone gain** (×1, ×10, ×100; ×100 by default): the Blood Stones each cleared Spire floor gives are multiplied. |
| `src/portal.js`, `src/main.js` | **Soul Gem gain** (×1, ×10, ×100; ×100 by default): every Soul Gem found in Hell (patrols, surveyors, gun emplacements, gate turrets, the Soul Forge, the Soul Compactor) counts as this many. Refunds and the war vault prize are unchanged. |
| `src/resources.js` | **Mass Ejector by 1000**: each tap on « or » changes a resource's ejection by 1000 tons per second (still limited by the ejectors' capacity). |
| `src/space.js`, `mobile/mobile.js`, `mobile/mobile.css` | **Ascension fixes**: ascending no longer stops with an error in a game that never unlocked the Thermal Collector; on a phone the Species Generator opens in view and its genus, trait and name fields stack in one column. |
| `src/space.js` | **Unlimited genes in the Species Generator**: a species can be created with any number of genes spent (Genes Remaining may go below 0). A negative count gives no Untapped Potential bonus, as before. |
| `src/actions.js` | **Buy up to 10 per click**: a plain click on a building buys up to 10 while they can be afforded, unless it costs Soul Gems; when not even one can be afforded it goes to the build queue as before. Multiplier keys and the queue key work as in the game. |
| `mobile/mobile.css` | **Ship Yard on a phone**: the ship stats wrap instead of running off the screen, each ship's location button sits below its details, and the part pickers list their choices in two columns. |
| `mobile/multiclick.js` | A tap on the **World Collider** or the **West** and **East Towers** builds 10 segments at once (like Ctrl+click on a keyboard). |
| `src/prod.js`, `src/main.js` | **Gas production** (×1, ×10, ×100; ×100 by default) in the Settings tab: the base output of every Helium-3 and Deuterium building (Helium Mine, Gas Mining, Gas Harvester, Refueling Station, Raider) is multiplied, so building descriptions and breakdowns show it. |
| `src/prod.js`, `src/main.js` | **Ore & oil production** (×1, ×10, ×100; ×100 by default): every source of Copper, Iron, Coal, Aluminium, Titanium, Iridium, Uranium, Oil, Neutronium, Adamantite, Elerium, Bolognium, Orichalcum and Unobtainium produces that many times as much, through the per-resource multiplier each producer already applies (`psychic_boost`), so descriptions and breakdowns show it. |
| `src/prod.js`, `src/main.js` | **Food production** (×1, ×10, ×100; ×100 by default): every source of Food (farmers, hunters, foragers, compost, transmitters, biodomes and so on) produces that many times as much, the same way as ores. |
| `src/space.js`, `src/main.js`, `src/vars.js` | **Additional Dyson Sphere** in Proxima, once the Dyson Net is complete: built in segments at the Dyson Net's cost per segment, without limit. Every 100 segments is another sphere producing as much power as your best completed sphere (175 MW for the Dyson Net, more after the Dyson Sphere upgrades). |
| `mobile/market.js` | **Auto-trading**, switched on at the top of the Settings tab (on any screen size): auto-sell 1%, 10% or 25% (your choice) of every resource that is full, each second, and when money is over half its cap, auto-buy 100,000 (or else 10,000, 1,000 or 100) of the least-full resource with the money above half. It uses the game's own market buttons, so prices are exactly the game's, and turns on the game's *Preload Tab Content* so the market is there in the background. |

`index.html` loads the files and has phone-friendly meta tags. The Google Analytics tag that reported to
the original author's account is removed from `index.html`, `wiki.html` and `save.html`.

Everything else, including the original README below, is as it was upstream.

---

# Evolve

## Play

https://pmotschmann.github.io/Evolve/

## About

An incremental game about evolving a civilization from primordial ooze into a space faring empire.
Evolve combines elements of a clicker with an idler and has lots of micromanagement.

What will you evolve into?

## Submitting Issues
If you think you have discovered a bug or have some other issue with the game then you can open an issue here on Github.
Please do not open Github issues to ask gameplay questions, use Reddit or Discord for that.
Links for both can be found in the footer of the game.

## Contributing a Language file
If you are interested in a contributing a new language for Evolve the process is fairly straight forward (although a bit tedious).

Make a copy of strings/strings.json and name the copy as strings/strings.\<locale\>.json (EX: strings.es_US.json). The locale format is the language alpha-2 code joined with the country alpha-2 code.

The strings are stored in a json format and will look like this:
```
"job_farmer_desc": "Farmers create food to feed your population. Each farmer generates %0 food per second.",
```
If you are unfamiliar with json the first part is a **key** and cannot be altered, **do not translate or modify the key in any way**. The second part is the string to be translated. Many game strings use **tokens** (**%0**, **%1**, **%2**, etc) to represent game values, as such these tokens must remain in the final translated string. Their position can be moved accordingly, the number represents a specific value and not its position in the string.

To enable your language translation in the game you must add it to the locales constant in locale.js (bottom of the file).

Once you feel your translation file is ready send a pull request with it to the Evolve main branch.


## Contributing to the game
Bug fixes, additional translations, themes, or UI improvements can simply be submitted as pull requests; once reviewed and accepted they will be merged into the main game branch. If you want to contribute a new feature it can not arbitrarily make something easier without making something else harder. If your new feature idea simply makes the game easier it will not be accepted.

All pull requests should be based off current dev branch.
The dev branch is either master or named after its version number.
Please check the current game version and what branches are available before contributing.
Pull requests should not contain the JS/CSS files generated by the build.

## CSS Changes
Evolve uses LESS to build its CSS, you can not just edit the minified CSS file. You must instead edit src/evolve.less then use the less compiler to rebuild the CSS file.

## Build Commands
Assuming you configured your build environment correctly the game can be built, deployed to GitHub Pages or launched using
```
# Builds everything on Linux
npm run build
# Builds everything on Windows
npm run build-win
# Builds the game bundle
npm run evolve
# Builds the CSS file for the game on Linux
npm run evolve-less
# Builds the CSS file for the game on Windows
npm run evolve-less-win
# Builds the wiki bundle
npm run wiki
# Builds the Wiki CSS file on Linux
npm run wiki-less
# Builds the Wiki CSS file on Windows
npm run wiki-less-win
# Launches the game server locally on localhost:4400
npm run serve
# Deploys the game to GitHub Pages on Linux (requires forking)
npm run deploy
# Deploys the game to GitHub Pages on Windows (requires forking)
npm run deploy-win
```

## Docker
If you already have a Docker environment set up and want to run an evolve server using Docker, you can execute the following command to build a Docker image for the evolve server.

```
# Build evolve server image
docker build . -t evolve

# Run evolve server. Default address: http://localhost:8080/
docker run --name evolve -p 8080:80 -d evolve
```
