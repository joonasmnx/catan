# Generator report

Seeds per mode: 10,000. Regenerate with `npm test && npm run report`.

## 4 players

| Check | Result |
| --- | --- |
| Hard-rule or component-count violations | 0 in 10,000 boards |
| Distinct boards | 10,000 of 10,000 |
| Optimised board worse than its own random start | 0 |
| Desert position uniform, chi-square | χ² = 25.6, df 18, p = 0.109 |
| Like values equally likely at every hex (wood/wool/grain, brick/ore, 6/8, 5/9 …), chi-square | χ² = 163.6, df 152, p = 0.246; smallest of 133 single tests p = 0.008 |
| Terrain share per hex vs tile count, largest gap | 4.4 points (4 of 19 hexes differ at p < 0.001) |
| Same test on a perfectly uniform valid sampler (reference) | 3.1 points (12 of 19 hexes differ at p < 0.001) |
| Generation time (Node, one core) | 15.5 ms per board |

| Score (lower is fairer) | Mean | Median | 95th pct | Worst |
| --- | --- | --- | --- | --- |
| Random valid board | 3,812 | 3,800 | 4,844 | 6,032 |
| Optimised board | 1,044 | 944 | 1,348 | 1,936 |

| Metric, mean | Random valid | Optimised |
| --- | --- | --- |
| Resource production gap, pips of 36 | 5.94 | 1.05 |
| First − last starting pick | 4.46 | 0.91 |
| Touching high-number pairs | 5.37 | 2.69 |
| Same resource two apart (not scored) | 13.04 | 12.70 |

## 5–6 players

| Check | Result |
| --- | --- |
| Hard-rule or component-count violations | 0 in 10,000 boards |
| Distinct boards | 10,000 of 10,000 |
| Optimised board worse than its own random start | 0 |
| Desert position uniform, chi-square | χ² = 22.2, df 29, p = 0.810 |
| Like values equally likely at every hex (wood/wool/grain, brick/ore, 6/8, 5/9 …), chi-square | χ² = 225.7, df 240, p = 0.737; smallest of 210 single tests p = 0.002 |
| Terrain share per hex vs tile count, largest gap | 1.8 points (5 of 30 hexes differ at p < 0.001) |
| Same test on a perfectly uniform valid sampler (reference) | 2.1 points (16 of 30 hexes differ at p < 0.001) |
| Generation time (Node, one core) | 26.1 ms per board |

| Score (lower is fairer) | Mean | Median | 95th pct | Worst |
| --- | --- | --- | --- | --- |
| Random valid board | 4,385 | 4,358 | 5,400 | 6,474 |
| Optimised board | 1,305 | 1,240 | 1,716 | 2,192 |

| Metric, mean | Random valid | Optimised |
| --- | --- | --- |
| Resource production gap, pips of 36 | 6.91 | 1.04 |
| First − last starting pick | 4.41 | 1.10 |
| Touching high-number pairs | 8.21 | 4.08 |
| Same resource two apart (not scored) | 24.15 | 23.66 |
