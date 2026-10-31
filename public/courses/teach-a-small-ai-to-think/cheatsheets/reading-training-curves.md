# Reading GRPO training curves

*Teach a Small AI to Think · unicodesnwrites.tech*

Read curves like a doctor reads vital signs: **several together, as rolling averages, over tens of steps.** Single points are noisy, especially with only a few questions per step.

## The vital signs

| Vital sign | TRL name | Healthy | Worrying |
|---|---|---|---|
| Reward | `reward`, `rewards/<name>/mean` | rises, then flattens | flat at 0; or rising while held-out accuracy is not |
| Held-out accuracy | (you measure it) | rises with reward | flat or falling while reward rises |
| All-same groups | `frac_reward_zero_std` | well below 1; may creep up late as questions get solved | near 1 from the start: no signal |
| Reward spread | `reward_std` | stays above 0 | shrinks to 0 |
| Length | `completions/mean_length` | changes smoothly | slams into the limit, or crashes to a few tokens |
| Cut-off answers | `completions/clipped_ratio` | small | large or climbing |
| KL | `kl` (needs `beta > 0`) | small, smooth, slowly rising | sudden spikes; or exactly flat with no progress |
| Entropy | `entropy` | gentle decline as reward rises | sharp early drop with flat reward (collapse); steady rise (garbled text) |
| Clip ratio | `clip_ratio/region_mean` | about 0 with one update per batch; small otherwise | large or climbing |

## Four broken runs

| Pattern | Giveaway | First fixes |
|---|---|---|
| **Stuck at zero** | reward ≈ 0, `frac_reward_zero_std` ≈ 1, nothing moves | read completions; test the grader by hand; raise `max_completion_length`; partial-credit format reward; easier data; raise `num_generations` |
| **Reward hacking** | reward up, held-out accuracy flat or down | stricter grader (one `<answer>`, one number); correctness worth more than format; cap shaping bonuses |
| **Collapse** | entropy crashes early, answers in a group identical, reward stalls | lower learning rate; `epsilon_high` (clip-higher); keep temperature ≈ 1.0; small `beta`; restart from a checkpoint |
| **Leash too tight** | slow progress, KL tiny, groups still disagree | lower `beta` or set it to 0 |
| (bonus) **Rambling** | length climbs to the limit, accuracy flat | `loss_type="dapo"` or `"dr_grpo"`; `mask_truncated_completions=True`; cap any length bonus |

## Triage routine

1. **Read 10 real completions** (`log_completions=True` prints samples).
2. **Test each reward by hand** on right, wrong and messy answers you write.
3. **Check the fuel gauge**: `frac_reward_zero_std`.
4. **Compare reward with held-out accuracy.**
5. **Read entropy, length and KL together.**
6. **Change one knob at a time** and note every run.

## See it on the Tiny Adder (real Python runs, seed 0, 200 steps)

| Preset | Settings | Reward | Accuracy (true sum) |
|---|---|---|---|
| healthy | `G=8, lr=0.5, beta=0` | 0.86 | 0.84 |
| stuck | `G=2` | 0.13 | 0.22 |
| hacking | `buggy=True` | 0.81 | 0.05 |
| tight leash | `beta=0.05` | 0.62 | 0.68 |

The in-browser version uses its own random numbers, so its values differ slightly. Collapse is not simulated: a perfectly graded lookup table can only become confident about the right answer.

## Remember

- No disagreement in a group, no learning.
- Falling entropy is good only when reward is rising.
- The training reward cannot catch hacks of itself. Keep a held-out test.
