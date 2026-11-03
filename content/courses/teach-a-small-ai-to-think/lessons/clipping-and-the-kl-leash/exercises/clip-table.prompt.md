# Fill in the clipping table

Use `ε = 0.2`. For each row, decide:

- Is the gradient **clipped** (this answer stops contributing) or does it **flow**?
- What is the clipped objective `min(ratio × A, clip(ratio, 0.8, 1.2) × A)`?

| # | Advantage A | Ratio | Clipped or flows? | Objective |
|---|---|---|---|---|
| 1 | +1 | 1.1 | | |
| 2 | +1 | 1.3 | | |
| 3 | −1 | 0.9 | | |
| 4 | −1 | 0.7 | | |
| 5 | −1 | 1.5 | | |
| 6 | +1 | 0.6 | | |

**Done looks like:** all twelve blanks filled, plus one sentence explaining the pattern behind rows 5 and 6.
