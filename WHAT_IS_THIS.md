# What Is This?

This is a tool that creates a random game board for the board game **Catan** — and makes sure the board is *fair*.

---

## The Problem It Solves

In Catan, players build settlements and collect resources (wood, wool, grain, ore, brick). The board is made of hexagonal tiles, each producing a different resource. A dice roll determines which tiles produce on any given turn.

If you just randomly throw tiles and numbers together, you often end up with an unfair board:
- All the good numbers clumped in one corner
- The same resource repeated side by side
- One player sitting on terrible spots while another has everything

This tool fixes that by generating thousands of random boards and picking the most balanced one.

---

## What It Actually Does (Plain English)

1. You pick a game mode (4 players or 5–6 players, regular or Seafarers with water tiles)
2. You click **Generate Board**
3. Behind the scenes it tries up to **2,000 random arrangements**
4. For each arrangement it checks some basic rules:
   - The same resource (e.g. Forest) can't be right next to another Forest
   - The two most rolled numbers (6 and 8, shown in red) can't be next to each other
   - Two identical numbers can't be neighbours either
5. Every arrangement that passes those rules gets a **balance score out of 100**
6. The one with the highest score gets drawn on screen

---

## What the Balance Score Measures

The score looks at five things:

- **Are all resources equally productive?** — ideally each resource type gets roughly the same number of good dice rolls
- **Are the settlement spots good?** — every corner where 3 tiles meet should ideally have 3 different resources and decent numbers
- **Are same resources spread out?** — you don't want all the Forest tiles bunched together in one area
- **Are the 6s and 8s far apart?** — these are the most rolled numbers; spreading them gives more players access to them
- **Is the desert out of the way?** — the desert produces nothing, so it's best placed at the edge

---

## The End Result

You get a colourful hex board on screen with:
- Each tile coloured by resource type (dark green = forest, gold = fields, red-brown = hills, etc.)
- Circular number tokens on each tile showing which dice roll activates it
- Dots (pips) under each number showing how often it statistically rolls
- A score panel on the right showing how balanced the board is

If the score is low, just click Generate again — it'll try a fresh batch of 2,000.
