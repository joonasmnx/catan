# Fair board for Catan

One static web page. Pick **4 players** or **5–6 players**, press **Generate**, get a fair board.
Every board has a code in the link (`?b=4-7K2QM9X`); anyone who opens the link sees the exact
same board, on any device, even offline. No server, no database, no login.

## How a board is made

1. **The board is a graph.** Hexes in axial coordinates (rows 3-4-5-4-3, or 3-4-5-6-5-4-3),
   edges between touching hexes, vertices where hexes meet (54 / 80), the coast and harbours.
2. **Official pieces.** 4 players: 19 hexes (4 forest, 4 pasture, 4 fields, 3 hills, 3 mountains,
   1 desert), 18 numbers, 9 harbours. 5–6 players: 30 hexes (6, 6, 6, 5, 5, 2 deserts), 28 numbers
   (two each of 2 and 12, three of the rest), 11 harbours. Source: the 5–6 Player Extension
   rulebook's component list (the extension adds 11 hexes and 2 harbours to the base game).
3. **Hard rules, valid by construction.** A seeded PRNG (xoshiro128\*\*) drives randomised
   backtracking: deserts are placed uniformly at random, then terrain and numbers are placed hex by
   hex, never breaking: no touching same resource, no touching 6/8, no touching equal numbers.
4. **Balance by maths.** `pips(n) = 6 − |7 − n|`, `P(n) = pips/36`. The score (lower is fairer):
   - **start spots, 40%:** simulate the setup draft (each pick takes the best free corner under the
     distance rule; a corner's value is its pips plus one per different resource) and take
     first pick − last pick;
   - **production, 35%:** most − least produced resource, in pips;
   - **high numbers, 25%:** touching pairs of 5, 6, 8, 9.

   Each term is divided by its standard deviation on random valid boards, so the shares mean what
   they say. Then 12,000 (or 16,000) swaps of tiles and numbers are tried with threshold accepting,
   a simulated-annealing variant with no `Math.exp`: all arithmetic is integer, so a code gives the
   same board in every browser.
5. **Proven by tests.** See `reports/REPORT.md`: 10,000 seeds per mode, zero violations, zero
   repeats, chi-square tests on randomness, score distributions.

## Why "same resource two apart" is not in the score

Any weight on it (tested down to 2%) pushed brick and ore into the inner ring on up to 39% of boards
against 32% expected, because four-tile resources spread out most easily along the coast. Randomness
of position won; the no-touching rule already keeps same resources apart, and the page shows the count.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run test:unit` | Fast unit tests |
| `npm test` | Unit tests plus the 10,000-seed property tests (about 5 minutes) |
| `npm run test:e2e` | Playwright at 320, 390, 768 and 1440 px |
| `npm run report` | Rewrite `reports/REPORT.md` from the last property run |
| `npm run lint` | ESLint and TypeScript |

## Files

| Path | Purpose |
| --- | --- |
| `src/lib/` | All logic, pure functions: `geometry`, `components`, `prng`, `solver`, `rules`, `score`, `optimise`, `board` |
| `src/ui/board-svg.ts` | Draws a board as SVG |
| `src/main.ts` | The page: URL codes, share, save image, print |
| `vite.config.ts` | Build, plus the generated offline service worker |
| `tests/` | Unit, property and e2e tests |

## Changing the algorithm

A board code is a seed. If the solver, score or budget changes, old links show different boards.
The snapshot test in `tests/unit/board.test.ts` fails when that happens; if the change is
intentional, add a version letter to new codes rather than silently breaking old links.
