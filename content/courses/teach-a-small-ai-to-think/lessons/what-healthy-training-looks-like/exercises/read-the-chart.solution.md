# Solution: three diagnoses

**Run A: healthy.**
*Giveaways:* reward and held-out accuracy rise together (0.20 → 0.31), and entropy declines gently with a slow KL rise.
*Story:* the model is learning. Length falling a little suggests it dropped some waffle; with accuracy rising, that is fine. The fuel gauge (0.5 → 0.4) shows plenty of groups still carry signal.

**Run B: broken (reward hacking or collapse onto a cheap pattern).**
*Giveaways:* training reward rises to 1.4 while held-out accuracy *falls* (0.20 → 0.18), and length crashes from 180 to 40 tokens with a sharp early entropy drop.
*Story:* the model found a cheap way to collect reward, for example perfect format with a near-empty `<think>` block and a guessed number, and stopped exploring. The fuel gauge rising to 0.9 fits: answers became so similar that groups score alike. The fast KL rise says it moved far from the starting model to do this.

**Run C: broken (stuck at zero).**
*Giveaways:* `frac_reward_zero_std` stays at 0.97, so almost every group is all-wrong, and reward never leaves the floor.
*Story:* the task is too hard for the model in its current form (or the reward never fires, for example because of a format mismatch), so there is no learning signal and nothing moves: entropy flat, KL near zero. This is the real-model version of the Tiny Adder's "stuck" preset.

**Why this works:** each diagnosis uses at least one curve the model is *not* trained on (held-out accuracy) or one that measures the learning signal itself (`frac_reward_zero_std`). Reward alone would have called Run B the best run of the three.
