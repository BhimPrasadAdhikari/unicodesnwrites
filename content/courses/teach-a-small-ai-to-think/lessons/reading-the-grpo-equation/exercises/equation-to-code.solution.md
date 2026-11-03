# Solution: equation to code

| # | Equation piece | Code | Plain English |
|---|---|---|---|
| 1 | `{o_i} ~ π_θold(·\|q)` | C | Ask the current model the question G times and keep its answers. |
| 2 | `(1/G) Σ_i` | E | Average the nudges over the answers in the group. |
| 3 | ratio | G | How much more likely is this answer now than when it was sampled? |
| 4 | `min[…, clip(…)]` | F | If the answer already moved more than ε in the direction its advantage wants, stop pushing it. |
| 5 | `Â_i` | D | Score each answer relative to its group: subtract the mean, divide by the spread. |
| 6 | `− β D_KL` | B | Pull the model back toward the reference, with strength β. |
| 7 | maximize J | A | Take a step of size `lr` uphill. |

**The missing piece: `(1/|o_i|) Σ_t`, the average over tokens.** Every Tiny Adder answer is a single number, one "token", so `|o_i| = 1` and the token average is just that one value. In a language model an answer is a sequence of tokens, the ratio and the KL are computed for every token, and how you average them (per answer, per batch of tokens, or by a constant) is exactly the choice that Dr. GRPO and DAPO argue about.

Note on piece 6: the toy uses a simple pull of the logits toward the reference instead of the paper's per-token KL estimator `π_ref/π_θ − log(π_ref/π_θ) − 1`. Both serve the same purpose; the toy's version is easier to read.

Why this exercise matters: once you can point to the code for each symbol, any new variant paper becomes a "diff". You read which symbol it changes, and you know which line of code would change.
