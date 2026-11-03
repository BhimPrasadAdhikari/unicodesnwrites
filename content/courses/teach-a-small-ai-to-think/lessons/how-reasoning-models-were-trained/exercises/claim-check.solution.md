# Solution: checking claims about R1

| # | Verdict | Correction or reason |
|---|---|---|
| 1 | **False** | That describes **R1-Zero**. R1 used a cold-start fine-tune on thousands of readable examples, then RL, then fine-tuning on about 800k rejection-sampled and general samples, then a final RL stage. |
| 2 | **True** | Accuracy was checked against known answers (or test cases for code) and format with a pattern match. The authors avoided neural reward models for this. |
| 3 | **False** | Length was **never rewarded**. Answers grew because longer thinking led to more correct answers, and correct answers were rewarded. |
| 4 | **False** | GRPO **drops** the critic. It uses the average (and spread) of rewards within a group of answers to the same question as the baseline (Shao et al., 2024). |
| 5 | **True** | That is the main weakness the full R1 recipe was built to fix. |
| 6 | **False** | The opposite. Distillation won on every benchmark tried, for example 72.6 vs 47.0 on AIME 2024 pass@1 (as reported). |
| 7 | **True** | The authors accepted a small drop in scores for much more readable output. Rewards are trade-offs. |
| 8 | **False** | Both are listed under **unsuccessful attempts**. Simple outcome rewards checked by code worked best at their scale. |

## Why these mix-ups happen

- **Claims 1 and 3** come from blending R1-Zero and R1 into one story. "R1 learned to reason from pure RL" is a catchy headline, but only R1-Zero did that, and the final R1 relied on supervised data too.
- **Claim 3** is a natural guess: if answers got longer, surely something rewarded length? The more surprising truth, that length emerged from rewarding correctness alone, is the central result of the paper. Keep it in mind for Module 7, where we *do* add length-aware rewards, deliberately and carefully.
- **Claim 4** comes from knowing PPO, which does use a critic. GRPO's whole point is replacing it with a group average.
- **Claim 6** is what most people expect: more RL should help. The paper's finding that copying a strong teacher beats RL on small models is counterintuitive, and it is why Module 8 exists.
