# ⚔️ Number Knights – A Math Quest Adventure

An auto-battler for kids in grades 3–6. Solve **multi-step math word problems** to earn gold, buy gear for a team of heroes, and send them to fight monsters across seven lands. At the end, they face Count Zero, the villain who stole the kingdom's numbers.

All of the artwork (heroes, 35 monsters and bosses, pets, quest-givers, icons, gear and the seven battle backgrounds) is hand-built cartoon SVG in a chunky, outlined mobile-game style, drawn in code. There are no image files to download.

Built for tablets: it has a big on-screen number pad, works in portrait and landscape, and needs no install or account. It also runs on phones and desktops.

## How it plays

| | |
|---|---|
| 📜 **Quests** | Story problems with 2–4 steps, matched to the player's grade (3rd–6th), with some review problems from the grade below. In **guided mode**, the player solves one step at a time. **Challenge Mode** asks only for the final answer and pays +50% gold. A step answered right on the first try earns full gold. After a wrong answer, a hint 💡 appears. After 3 misses, the game shows the answer and explains it. Several perfect quests in a row build a 🔥 streak bonus. |
| 🛒 **Shop** | Each hero has a weapon, armor and charm slot. There are 8 gear tiers (Wooden → Cosmic), and each new tier unlocks when a boss is beaten. Higher tiers cost more but are much stronger. Your old item is traded in for 25% of its price. |
| 🗺️ **Adventure** | 7 lands, each with 5 battles and a boss. Each battle has 2–3 **waves** of monsters, and the boss arrives in the last wave of the boss stage. Before each fight, the game estimates your chance of winning (by simulating the battle) and suggests better gear if it's risky. Heroes earn XP and level up. |
| ⚡ **Battles** | Heroes fight on their own, but each one charges up a **super power** (Shield Wall, Arrow Rain, Meteor, Fairy Blessing, Shadow Flurry, Inferno). When a hero's card glows, tap it (or press 1–4) to unleash it. Bosses **wind up** big attacks with a warning, and a well-timed Shield Wall blocks most of the damage. Bosses get angry at half health. Win with nobody knocked out for ⭐⭐⭐. Battles can run at 1×, 2× or 3× speed and can be paused. **Auto** lets heroes use super powers by themselves. |
| 🦸 **Heroes** | There are 6 heroes, each with a special skill: Knight, Archer, Mage, Healer, Ninja and Dragon. New heroes are unlocked by beating bosses. A 4th team slot also unlocks partway through the game. |
| 🐾 **Unlockables** | 9 pets that give bonuses (unlocked by math milestones such as streaks, quest counts and Challenge Mode), 25 trophies, a monster collection book, and the **Endless Tower** after the final boss. |

### Math covered
- **Grade 3:** 2–3 step problems with addition, subtraction, multiplication facts, sharing/division, and comparisons like "more than" and "twice as many"
- **Grade 4:** making change, perimeter, area, nested groups, "times as many", and division with remainders ("how many boats do we need?")
- **Grade 5:** decimal money, fractions of a quantity, volume, averages, multi-digit multiplication, and metric conversion
- **Grade 6:** percent discounts and tips, ratios, rates and distance, unit rates, composite area, and finding a missing value for a target average

Numbers are randomized, so the problems don't repeat. Problems sometimes use the player's own name.

## For grown-ups
- **Profiles:** each child gets their own profile with its own grade, gold, heroes and progress.
- **Settings → For grown-ups:** set a 4-digit PIN so only a grown-up can change the grade level (or delete the player).
- **Settings → Stats** shows quests solved, the share of steps answered right on the first try, and results by grade.
- **Settings → Auto super powers** lets heroes use their super powers by themselves, for players who'd rather just watch.
- Progress is saved in the browser on that device (localStorage). Clearing the browser's site data erases it.
- **Tip:** in Safari or Chrome, use *Share → Add to Home Screen* to give the game its own app icon and full-screen mode.

## Hosting on GitHub Pages
1. Merge this branch into `main`.
2. In the repository on GitHub, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **`main`** and **`/ (root)`**, then click **Save**.
4. After a minute or two, the game will be live at `https://<your-username>.github.io/multistepgame/`.

## Running locally
It's a plain static site with no build step:
```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project layout
```
index.html            page shell
css/style.css         all styling and animations
fonts/                Lilita One + Nunito (SIL Open Font License, see the *-OFL.txt files)
js/data.js            heroes, gear, lands, monsters, battle waves, pets, trophies, balance numbers
js/art.js             SVG art kit + heroes, pets, portraits, icons and gear items
js/art-monsters.js    SVG monsters and bosses
js/art-scenes.js      SVG backgrounds for each land
js/math.js            multi-step word problem generator (grades 3–6)
js/battle.js          wave battle engine: super powers, boss wind-ups, stars (pure logic, also used for win-chance estimates)
js/game.js            screens, profiles, quests, shop, battle playback and effects, saving
```

Battle tuning lives in the `T` table at the top of `js/battle.js` (HP and damage multipliers, super power strength, boss wind-up timing).
To add a new problem type, add a function to the right grade list in `js/math.js`. It should return a `title`, `text` and `steps` (`{ q, a, hint, unit | money }`).
