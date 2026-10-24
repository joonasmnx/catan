# Generator report

Seeds per mode: 10,000. Regenerate with `npm test && npm run report`.

## 4 players

| Check | Result |
| --- | --- |
| Hard-rule or component-count violations | 0 in 10,000 boards |
| Distinct boards | 10,000 of 10,000 |
| Optimised board worse than its own random start | 0 |
| Desert position uniform, chi-square | χ² = 25.6, df 18, p = 0.109 |
| Like values equally likely at every hex (wood/wool/grain, brick/ore, 6/8, 5/9 …), chi-square | χ² = 149.6, df 152, p = 0.540; smallest of 133 single tests p = 0.009 |
| Terrain share per hex vs tile count, largest gap | 3.2 points (8 of 19 hexes differ at p < 0.001) |
| Same test on a perfectly uniform valid sampler (reference) | 3.3 points (12 of 19 hexes differ at p < 0.001) |
| Generation time (Node, one core) | 15.5 ms per board |

| Score (lower is fairer) | Mean | Median | 95th pct | Worst |
| --- | --- | --- | --- | --- |
| Random valid board | 3,841 | 3,842 | 4,856 | 6,088 |
| Optimised board | 976 | 906 | 1,310 | 1,856 |

| Metric, mean | Random valid | Optimised |
| --- | --- | --- |
| Resource production gap, pips of 36 | 7.64 | 1.03 |
| First − last starting pick | 4.40 | 0.83 |
| Touching high-number pairs | 5.56 | 2.74 |
| Same resource two apart (not scored) | 13.04 | 12.66 |

## 5–6 players

| Check | Result |
| --- | --- |
| Hard-rule or component-count violations | 0 in 10,000 boards |
| Distinct boards | 10,000 of 10,000 |
| Optimised board worse than its own random start | 0 |
| Desert position uniform, chi-square | χ² = 22.2, df 29, p = 0.810 |
| Like values equally likely at every hex (wood/wool/grain, brick/ore, 6/8, 5/9 …), chi-square | χ² = 241.4, df 240, p = 0.462; smallest of 210 single tests p = 0.001 |
| Terrain share per hex vs tile count, largest gap | 1.6 points (3 of 30 hexes differ at p < 0.001) |
| Same test on a perfectly uniform valid sampler (reference) | 2.2 points (12 of 30 hexes differ at p < 0.001) |
| Generation time (Node, one core) | 25.6 ms per board |

| Score (lower is fairer) | Mean | Median | 95th pct | Worst |
| --- | --- | --- | --- | --- |
| Random valid board | 4,347 | 4,352 | 5,332 | 6,582 |
| Optimised board | 1,211 | 1,188 | 1,670 | 2,270 |

| Metric, mean | Random valid | Optimised |
| --- | --- | --- |
| Resource production gap, pips of 36 | 9.26 | 1.02 |
| First − last starting pick | 4.36 | 1.01 |
| Touching high-number pairs | 8.44 | 4.12 |
| Same resource two apart (not scored) | 24.15 | 23.65 |
