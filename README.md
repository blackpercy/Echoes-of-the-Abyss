# Ekon från Avgrunden

Ett idle-spel i webbläsaren, inspirerat av *Melvor Idle*. Världen blandar klassisk fantasy i D&D-stil med kosmisk skräck i H.P. Lovecrafts anda.

> Kungariket Aldmark var en gång ett land av riddare, magiker och gudar som svarade när man bad. Sedan föll stjärnan.

## Spela

Inget byggsteg behövs. Öppna `index.html` i en webbläsare, eller servera mappen:

```sh
python3 -m http.server 8000
# öppna http://localhost:8000
```

Spelet fungerar också direkt på GitHub Pages (Settings → Pages → deploy from branch).

## Innehåll

- **12 färdigheter**
  - Insamling: Vedhuggning, Fiske, Gruvdrift, Örtsamling
  - Hantverk: Matlagning, Smide, Alkemi, Ockultism
  - Strid: Anfall, Styrka, Försvar, Livskraft
- **Förstånd**: en andra livsmätare. Väsen från bortom och ockulta studier tär på den. Når den noll flyr du i panik. Amuletter ger förståndsskydd och drycker återställer den.
- **5 stridsområden** med 15 fiender, från krabbor på Saltmyrs strand till Fader Dagon i Avgrunden.
- **Utrustning** i fem metallnivåer (järn → stjärnmetall), unika fynd och ockulta amuletter.
- **Handelsbod** med mat, drycker och verktygsuppgraderingar som snabbar upp insamlingen.
- **Offline-framsteg** i upp till 24 timmar, automatisk sparning samt export och import av sparfiler.

## Kodstruktur

| Fil | Innehåll |
| --- | --- |
| `js/data.js` | All speldata: färdigheter, föremål, handlingar, monster, områden, butik och berättelse |
| `js/game.js` | Spelmotorn: tillstånd, tick-loop, strid, förstånd, sparning, offline-simulering |
| `js/ui.js` | Rendering av sidor och mätare samt klickhantering |
| `js/main.js` | Start, spelloop och automatisk sparning |
| `css/style.css` | Utseende, inklusive mobillayout |

Nytt innehåll läggs till i `js/data.js`. En ny handling är en rad i `ACTIONS`, ett nytt monster en rad i `MONSTERS` plus en referens i `AREAS`.
