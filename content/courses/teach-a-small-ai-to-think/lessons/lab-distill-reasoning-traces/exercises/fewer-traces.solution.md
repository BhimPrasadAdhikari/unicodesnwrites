# Solution: how many traces does a small student need?

Your numbers will be your own, so this solution shows how to run the experiment cleanly and how to read the results, rather than a single "right" table.

## Running it

In the notebook, change only the settings cell and the `SFTConfig` cell:

```python
N_TRAIN = 200            # run A; then 1000 (B); then 2000 (C)
# in SFTConfig:
num_train_epochs = 2     # runs A and B; use 1 for run C
```

Rerun from section 5 (building the training set) onward. You don't need to rerun section 7 (the "before" evaluation); copy its numbers into your table once. After each run, restart the runtime (*Runtime → Restart session*) before the next one, so GPU memory starts clean.

## A results table to fill in

| Model | Traces seen | Accuracy | Format | Avg tokens |
|---|---|---|---|---|
| Base (before) | 0 | your number | your number | your number |
| A | 200 × 2 | | | |
| B | 1000 × 2 | | | |
| C | 2000 × 1 | | | |

## How to read it

**Format usually moves first.** The `<think>`/`<answer>` layout is the same in every trace, so even a few hundred examples are often enough for the student to adopt it. If format is near 100% already in run A, that's expected.

**Length moves with format.** As soon as the student copies the teacher's layout, it tends to copy its length too, so average tokens often jump already in run A.

**Accuracy is the slow one, and the honest one.** Copying a style is easy; copying the skill behind it is harder, especially for a 0.5B model. If accuracy rises from A to B but barely from B to C, the student is hitting the limit of what it can absorb at this size, which is consistent with the s1/LIMO caution that small curated datasets work best on models that already know a lot.

**B versus C.** Seeing more different examples once (C) usually generalizes at least as well as seeing fewer examples twice (B), because repetition can make a small model memorize phrasing. If B wins in your run, a likely reason is that the extra traces in C are longer or noisier; check by printing a few of them.

A good write-up states what you changed, shows the table, says which result surprised you, and names one limitation (for example: one run per setting, so small differences may be noise).
