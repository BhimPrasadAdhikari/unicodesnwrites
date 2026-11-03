# Solution: a model lab report

Your numbers will be your own; the point is the structure and honesty. Here is a template filled in with the setup values from `train_grpo.py` and **placeholders** where your measurements go. Never fill these with guesses.

1. **Setup:** Qwen2.5-0.5B-Instruct + LoRA (r = 16, alpha = 32), GRPO via TRL 1.16.0, 250 steps, 2 questions × G = 8 per step, learning rate 1e-5, beta 0.04, epsilon 0.2 / epsilon_high 0.28, loss_type "dapo", max completion length 256, rewards: format 0.5 + correctness 1.0.
2. **Before / after (200 GSM8K test questions, greedy):** accuracy `[before]` → `[after]`; format rate `[before]` → `[after]`.
3. **Curves:** total reward rose from about `[x]` to about `[y]` (rolling average), mostly from the format reward in the first `[n]` steps; mean length went from about `[a]` to `[b]` tokens and stayed under the 256 limit; `frac_reward_zero_std` fell from about `[p]` to `[q]`, so more groups carried a learning signal.
4. **Examples:** on the question about `[topic]`, the base model wrote `[short quote]` with no tags, while the trained model wrote `[short quote]` with the right number in `<answer>`. On `[topic]`, both still fail: the setup is right but `[arithmetic slip / misread]`.
5. **Next change:** `[e.g. "lower the format weight to 0.2, because format reward saturated by step 60 while correctness was still flat"]`.

**Why this structure works:** line 1 makes the run reproducible; line 2 is the result against a control; line 3 tells a reader whether the run was healthy; line 4 grounds the numbers in real behavior; line 5 turns the run into the next experiment. A good line 5 always points at evidence from lines 3 or 4.

Common mistakes to avoid: reporting only the training reward (it can rise while held-out accuracy does not), quoting a single noisy step, and leaving out disappointing results.
