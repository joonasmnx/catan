# Catan Balanced Map Generator — Code Overview

## What It Does

A single-page web app that generates randomised Catan board layouts and scores them for balance using a custom metric called the **CIBI Index** (Catan Intersection Balance Index). It supports four modes:

| Mode | Land tiles | Numbers |
|------|-----------|---------|
| Standard 4-player | 19 | 18 tokens |
| Standard 5–6 player | 30 | 28 tokens |
| Seafarers 4-player | 19 + water ring | 18 tokens |
| Seafarers 5–6 player | 30 + water ring | 28 tokens |

---

## Hex Grid System

All tile positions are stored in **axial coordinates** (`q`, `r`) — a standard system for hexagonal grids. The board uses **flat-top** hexagons.

- `q` runs along the horizontal axis
- `r` runs diagonally
- The third implicit coordinate is `s = -q - r`
- Distance between two hexes: `(|Δq| + |Δr| + |Δs|) / 2`

### Board Shapes

- **4-player:** a radius-2 disk of hexes — yields exactly 19 tiles (1 center + 6 ring-1 + 12 ring-2)
- **5–6 player:** a radius-3 disk minus the 7 sharp corner hexes (where two of |q|, |r|, |s| equal 3) — yields exactly 30 tiles
- **Seafarers:** adds a water ring of all hexes adjacent to the land area but not part of it

---

## Generation Logic

The generator runs up to **2,000 attempts** and keeps the best-scoring board.

### Each Attempt

1. **Shuffle resource tiles** randomly across all land positions
2. **Hard check — no adjacent same resource:** two Forest tiles must not touch, etc. (Desert is exempt)
3. **Assign number tokens** randomly to all non-desert tiles
4. **Hard check — no adjacent red numbers:** tiles with 6 or 8 must not be neighbours
5. **Hard check — no adjacent identical numbers:** e.g., two 5s cannot touch
6. If all three hard checks pass → **compute the CIBI score**
7. If this board's CIBI beats the current best → store it as the new best

After all attempts, the best board is rendered.

---

## CIBI Balance Score (0–100)

The CIBI index combines five sub-scores, each on a 0–100 scale.

### 1. Pip Balance (weight 30%)

Each number token has a pip count representing its probability:

| Number | Pips |
|--------|------|
| 2, 12  | 1    |
| 3, 11  | 2    |
| 4, 10  | 3    |
| 5, 9   | 4    |
| 6, 8   | 5    |

For each resource type (Forest, Pasture, Fields, Mountains, Hills) the average pips-per-tile is computed. A low standard deviation across the five resources = high score. The maximum expected std-dev is 4.0; score = `(1 - stdDev / 4.0) × 100`.

### 2. Intersection Quality (weight 30%)

Every vertex where exactly 3 land tiles meet is a potential settlement spot. Each such triplet is scored on:

- **Diversity:** 3 different resources = 50 pts, 2 = 33 pts, 1 = 17 pts
- **Pip total:** ideal range 5–14 pips; penalised for extremes

The final score is the average across all intersections.

### 3. Resource Clustering (weight 20%)

For each resource type, the minimum hex-distance from every tile to its nearest same-resource neighbour is measured. A higher average minimum distance means better geographic spread of resources across the board. Score maps: distance 1 → 0, distance 4+ → 100.

### 4. Red Number Spread (weight 10%)

The average hex distance between all pairs of "red" tiles (those bearing 6 or 8, the most productive numbers) is computed. Greater spread = higher score. Score maps: avg distance 0 → 0, avg distance 5+ → 100.

### 5. Desert Placement (weight 10%)

Deserts produce no resources and have no number token, so they are best placed away from the center where settlement spots are most valuable. Score = average distance of desert(s) from the center hex `(0,0)`, normalised over a max of 3 hexes.

### Final Score

```
CIBI = 0.30 × PipBalance
     + 0.30 × IntersectionQuality
     + 0.20 × ResourceClustering
     + 0.10 × RedNumberSpread
     + 0.10 × DesertPlacement
```

Interpretation: **≥ 70** = excellent, **45–69** = moderate, **< 45** = low (try again).

---

## Rendering

Tiles are drawn onto an HTML5 `<canvas>` element using flat-top hex geometry. Each tile uses a radial gradient fill derived from the resource colour palette. Number tokens are drawn as circular wooden-looking chips with their pip dots. Seafarers water tiles are drawn first (behind land), and port badges are placed on water hexes adjacent to land.

---

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Everything — HTML structure, CSS styling, and all JavaScript in one file |
