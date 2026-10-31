# Diagnose three runs from their vital signs

Here are summaries of three GRPO runs on GSM8K (rolling averages, start → end of training). These are **illustrative** examples written for this exercise, not measured runs.

| Vital sign | Run A | Run B | Run C |
|---|---|---|---|
| total reward | 0.3 → 1.2 | 0.3 → 1.4 | 0.05 → 0.06 |
| held-out accuracy | 0.20 → 0.31 | 0.20 → 0.18 | 0.02 → 0.02 |
| `frac_reward_zero_std` | 0.5 → 0.4 | 0.5 → 0.9 | 0.97 → 0.97 |
| mean length (tokens) | 180 → 150 | 180 → 40 | 220 → 230 |
| entropy | gentle decline | sharp drop early | flat |
| KL | slow rise | fast rise | near zero |

For each run:

1. Is it healthy? One word: healthy, suspicious or broken.
2. Which **two** vital signs gave it away?
3. In one sentence, what do you think is happening?

**Done looks like:** three short diagnoses, each pointing at specific rows of the table.
