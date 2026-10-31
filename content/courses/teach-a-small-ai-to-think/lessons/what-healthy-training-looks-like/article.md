# What healthy training looks like

A doctor does not judge your health from one number. Temperature, pulse and blood pressure each tell part of the story, and the combination tells the rest: a high pulse is fine after a run and worrying at rest. Training curves work the same way. A rising reward can mean your model is learning, or that it found a loophole in your grader. You can only tell by reading several curves together.

**In this lesson** you will learn the "vital signs" of a GRPO run: reward, completion length, KL, entropy, clip ratio, and the reward spread (including the fraction of groups where every answer scored the same). For each one you will learn what it measures in plain words, what a healthy shape looks like, and which other curve to check alongside it. You will use the training-run visualization to see healthy and unhealthy shapes on the Tiny Adder, and connect them to the metrics TRL logs on a real run. The next lesson covers what to do when a curve looks wrong.

## The vital signs at a glance

TRL logs dozens of numbers. These are the ones worth watching, with the names you will see in your logs:

| Vital sign | TRL name | Plain meaning |
|---|---|---|
| Reward | `reward`, `rewards/<name>/mean` | how much the graders like the answers |
| Reward spread | `reward_std` | how different the scores are from each other |
| All-same groups | `frac_reward_zero_std` | share of groups where all answers got the same score (they teach nothing) |
| Completion length | `completions/mean_length` | how long the answers are, in tokens |
| Cut-off answers | `completions/clipped_ratio` | share of answers that hit `max_completion_length` |
| KL | `kl` (only if `beta > 0`) | how far the model has drifted from where it started |
| Entropy | `entropy` | how uncertain the model is about its next token |
| Clip ratio | `clip_ratio/region_mean` and friends | share of tokens where clipping stopped the update |

Plus one number TRL cannot log for you: **held-out accuracy**, measured by you on questions the model never trains on.

## Rule zero: noise is normal

Before we look at shapes, a warning. Every point on a GRPO curve is an average over a small batch. In our Colab run that is only 2 questions per step. One easy question makes a step look brilliant; one hard question makes the next look terrible.

So:

- Look at a **rolling average** (the notebook draws one), not single points.
- Judge **trends over tens of steps**, not jumps between two steps.
- Compare **runs to runs**, not one run to your hopes.

## Reward: up, with a slope that eventually flattens

**Healthy:** the rolling average rises, quickly at first or after a slow start, then flattens as the easy gains run out. In the Tiny Adder lab you saw the classic S-shape: flat while almost every group was all wrong, then a steep climb, then a plateau.

With two rewards, look at each separately. In our Colab run the format reward usually rises first, because using the tags is much easier than doing the maths. Correctness typically follows more slowly. That ordering is healthy.

**Check alongside:** held-out accuracy. If reward rises and held-out accuracy does not, the model may be pleasing the grader rather than solving the task. You saw the extreme version with the Tiny Adder's buggy grader: reward climbed to 0.81 while true accuracy stayed at 0.05.

## Reward spread and all-same groups: the fuel gauge

Remember the key fact from the advantages lesson: a group where every answer gets the same score has zero advantage everywhere. It teaches nothing. That makes the share of all-same groups the run's **fuel gauge**.

| `frac_reward_zero_std` | Meaning |
|---|---|
| near 0 | almost every group has some disagreement: lots of learning signal |
| around 0.3 to 0.7 | some groups silent; normal for a mixed-difficulty dataset |
| near 1 | almost nothing to learn from: the questions are all too hard or all too easy for the model right now |

**Healthy:** comfortably below 1, and often drifting *up* late in training as the model solves more questions every time (all-correct groups are silent too). That late drift is a sign of success, not failure, but it does mean learning slows down.

`reward_std` tells a similar story: if it shrinks toward zero, the answers are all scoring alike.

The *DAPO* paper (ByteDance Seed, 2025) took this seriously enough to build a fix into the algorithm: **dynamic sampling**, which drops all-correct and all-wrong groups and samples more questions until the batch is full of groups that carry signal.

## Completion length: the thinking budget

**What it measures:** how many tokens the model writes. With a `<think>` block, that is mostly how long it thinks.

**Healthy shapes** depend on the task:

| Shape | When it is healthy |
|---|---|
| Rises gradually | the model is learning to reason in more steps. The *DeepSeek-R1* paper (2025) reported response length growing steadily during R1-Zero's RL training, alongside accuracy. |
| Falls, then settles | the model drops waffle or repetition it started with. Common for small instruct models on short problems. |
| Roughly flat | fine if accuracy is rising. |

**Check alongside:** `completions/clipped_ratio`. If many answers are hitting the length limit, they are being cut off mid-thought. Healthy is a small share. A rising share means the model wants more room than you gave it, or it has started rambling.

Length deserves suspicion when it grows *without* accuracy growing. The *Dr. GRPO* paper (Liu et al., 2025) showed that the original GRPO loss, which divides each answer's loss by its length, penalizes long wrong answers less per token than short ones, which can inflate length for no benefit. That is why TRL's default `loss_type="dapo"` and the option `"dr_grpo"` normalize differently.

## KL: how far from home

**What it measures:** the distance between the current model and the frozen reference (the model you started from). Only logged when `beta > 0`.

**Healthy:** starts at zero (the models are identical) and rises slowly and smoothly. Some drift is the whole point; the model is supposed to change.

**Unhealthy:** sudden spikes, or a curve that shoots up steeply. That usually means updates are too large (learning rate too high), and the model is changing faster than the reward can justify. If KL stays at almost exactly zero for the whole run while reward is flat, the model is barely moving at all.

On the Tiny Adder, the **tight leash** preset shows the opposite failure: the KL pull is so strong that the model cannot leave home, and reward rises only slowly.

## Entropy: how sure the model is

**What it measures:** how spread out the model's probabilities are for the next token. High entropy: many tokens are plausible, the model is exploring. Low entropy: it is confident, nearly always picking the same token.

**Healthy:** a gentle decline. As the model learns, it becomes more confident, which lowers entropy. In the Tiny Adder lab, entropy fell from 2.94 (pure guessing) to 0.85 as accuracy rose to 0.84. That is confidence earned by being right.

**Two unhealthy shapes:**

- **Collapse:** entropy drops sharply toward zero, early, while reward stalls. The model has stopped exploring: every answer in a group looks the same, so groups become all-same and learning stops. The DAPO paper describes this "entropy collapse" and introduced clip-higher (a larger upper clip bound, `epsilon_high` in TRL) partly to fight it.
- **Explosion:** entropy rises steadily. The model is becoming *less* sure of everything, which often shows up as garbled or random text. A common cause is a learning rate that is too high.

**Check alongside:** reward. Falling entropy with rising reward is learning. Falling entropy with flat reward is collapse.

## Clip ratio: is the brake working too hard?

**What it measures:** the share of tokens where clipping stopped the update because the token had already moved more than `ε`.

**Healthy:** with TRL's default of one update per batch (`num_iterations=1`), the ratio is essentially 1 and the clip ratio sits near zero. That is expected, not a bug. If you raise `num_iterations`, a small clip ratio is normal.

**Unhealthy:** a large or climbing clip ratio means the brake is constantly engaged: each batch is trying to move the model further than the trust region allows. Usually the learning rate is too high.

## Reading them together: the healthy picture

Here is the combination that says "this run is fine":

| Vital sign | Healthy pattern |
|---|---|
| Reward (rolling) | rises, then flattens |
| Held-out accuracy | rises with it |
| `frac_reward_zero_std` | well below 1; may creep up late as questions get solved |
| Completion length | changes smoothly; few answers cut off |
| KL | small, smooth, slowly rising |
| Entropy | gentle decline |
| Clip ratio | near zero (one update per batch) or small |

No single row proves health. A run where all of them agree is very likely healthy.

## See it on the Tiny Adder

The training-run visualization on this page runs the Tiny Adder in your browser and shows three of these vital signs live: reward, accuracy (against the true sum) and entropy. Start with the **healthy** preset and look for:

- the flat start while almost every group is all wrong (a full fuel gauge of silent groups),
- reward and accuracy climbing together,
- entropy falling as accuracy rises.

Then flip to **hacking** and see reward and accuracy split apart. Try **stuck** (groups of 2) and **tight leash** (a strong KL pull) to see what "not learning" looks like. In the next lesson you will diagnose each of these properly.

## Key takeaways

- Read GRPO runs like a doctor reads vital signs: several curves together, as rolling averages, over tens of steps.
- Healthy: reward and held-out accuracy rise together, entropy declines gently, KL rises slowly, length changes smoothly with few cut-offs, and clip ratio is small.
- `frac_reward_zero_std` is the fuel gauge: all-same groups teach nothing, so a value near 1 means training has run out of signal.
- Falling entropy is healthy only when reward is rising; with flat reward it signals collapse.

## Next up

Now that you know healthy, it is time to meet the patients. **Debugging a bad run** walks through collapse, reward hacking and runs stuck at zero: how to recognize each, and what to change.
