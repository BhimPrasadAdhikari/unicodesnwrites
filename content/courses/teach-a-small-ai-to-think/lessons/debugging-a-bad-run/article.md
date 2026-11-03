# Debugging a bad run: collapse, hacking, stuck at zero

Every reinforcement learning practitioner has a story about the run that looked perfect. The reward curve climbed beautifully all night, and in the morning the model answered every question with the same three words. Or the run that sat at zero reward for two hours because the grader was looking for `<answer>` and the model wrote `<Answer>`.

Bad runs are not a sign that you did something stupid. They are the normal texture of RL. What separates beginners from experienced practitioners is not avoiding bad runs; it is recognizing them in the first twenty minutes and knowing which knob to turn.

**In this lesson** you will work through four case studies of broken GRPO runs: **stuck at zero**, **reward hacking**, **collapse** and **a leash that is too tight**. For each, you will see the symptoms on the curves, the usual causes, and the fixes to try in order. Three of them you can reproduce live with the Tiny Adder presets; collapse is described in words, because a lookup table cannot honestly fake it. You will finish with a one-page triage routine you can use on any run.

## The triage routine

When a run looks wrong, do these in order. Most problems are found by step 2.

| Step | Do this | Why |
|---|---|---|
| 1 | **Read 10 real completions.** | Most bugs are obvious in raw text: wrong tags, empty thinking, repeated phrases, answers cut off. |
| 2 | **Run your reward functions by hand** on a few completions you write yourself (right, wrong, badly formatted). | Confirms the grader gives the scores you think it does. |
| 3 | **Check the fuel gauge** (`frac_reward_zero_std`). | Near 1 means no learning signal at all. |
| 4 | **Compare reward with held-out accuracy.** | If they disagree, suspect the grader. |
| 5 | **Check entropy, length and KL together.** | Separates collapse, rambling and "not moving". |
| 6 | **Change one knob at a time,** and keep a note of each run. | Otherwise you cannot tell which change helped. |

TRL can print sample completions during training if you set `log_completions=True` in `GRPOConfig`, which makes step 1 painless.

## Case 1: stuck at zero

**Symptoms.** The reward sits on the floor. `frac_reward_zero_std` is close to 1: nearly every group is all-wrong. Entropy and KL barely move. Nothing is happening.

**Why it happens.** You know the mechanism from the advantages lesson: a group where every answer scores 0 has zero advantage, so it contributes nothing. If almost every group is all-zero, the model gets almost no signal and never improves.

**See it live.** The **stuck** preset trains the Tiny Adder with groups of only 2 answers. At the start, both guesses are wrong about 90% of the time. In our Python run, after 200 steps the healthy run (G = 8) reaches reward 0.86 and accuracy 0.84; the stuck run reaches just 0.125 and 0.22, and across the whole run about 84% of its groups are all-same (versus about 31% for G = 8).

**Usual causes on a real model, most common first:**

| Cause | How to spot it | Fix |
|---|---|---|
| The grader never fires (a parsing bug) | Completions contain right answers but reward is 0 | Test the reward on hand-written examples; loosen the parser (case, spaces, commas, `$` signs) |
| The answer never arrives | Completions end mid-sentence; `completions/clipped_ratio` is high | Raise `max_completion_length`, or ask for shorter thinking in the prompt |
| The format is too strict for the model at the start | The model almost never produces the exact tags | Add a partial-credit format reward (your rewards lab has `soft_format_reward`) |
| The task is too hard for the model | Correct answers are genuinely rare | Easier data first (a curriculum), a bigger model, or a short SFT warm-up as DeepSeek-R1's "cold start" did |
| Too few samples per question | Small `num_generations` | Raise `num_generations` so a group is more likely to contain one success |

The *DAPO* paper (ByteDance Seed, 2025) adds a structural fix, **dynamic sampling**: drop groups where all answers got the same score and keep sampling until the batch is full of informative groups. It costs extra generation but stops silent groups from diluting each step.

## Case 2: reward hacking

**Symptoms.** Reward climbs nicely. Held-out accuracy does not, or falls. When you read completions, they are doing something you did not intend.

**See it live.** The **hacking** preset uses the buggy grader that pays for any even number. In Python, reward climbs from about 0.55 to 0.81 over 200 steps while accuracy against the true sum stays at 0.05, pure chance, the whole time. The model learned exactly what it was paid for.

**What it looks like on a real model:**

| Hack | What the grader missed |
|---|---|
| `<think>.</think><answer>18</answer>` | The format reward accepts any non-empty thinking |
| Several `<answer>` tags with different numbers | The parser takes the first or last match, so listing many numbers raises the odds |
| Repeating the question's numbers in the answer | Correctness checks "contains the number" instead of "equals" |
| Very long answers that hit the limit | A length or "thinking" bonus with no cap |

**Fixes, in order:**

1. **Make the grader stricter where it was exploited.** Exactly one `<answer>` tag; the content must be a single number; compare with equality, not "contains".
2. **Re-weight.** If format pays a lot compared with correctness, the model can get rich on format alone. Our Colab script pays 0.5 for format and 1.0 for correctness for this reason.
3. **Cap any shaping bonus.** Every "nice to have" reward (length, thinking, politeness) needs a ceiling.
4. **Keep a held-out check you never train on.** It is the only reliable alarm. The training reward cannot catch hacks of itself.

The lesson from module 2 bears repeating: GRPO optimizes the reward you wrote, not the goal you meant. When it hacks, the algorithm is working; the grader is the bug.

## Case 3: collapse

**Symptoms (described, not simulated).** Entropy drops sharply toward zero, often early. The answers in each group start to look identical, so `frac_reward_zero_std` climbs toward 1 and learning stops. Reward stalls, sometimes at a mediocre level. Completion length often swings to an extreme: either very short answers, or repetitive text that runs into the length limit. KL may jump quickly.

> **Illustrative picture, not a measured run:** imagine a run where entropy falls from about 0.6 to near 0.05 within the first 50 steps, while correctness reward stops improving at about 0.2 and every group's eight answers are nearly word-for-word the same. That combination, confidence without competence, is collapse.

The Tiny Adder cannot reproduce this honestly. Its reward is perfect and its logits for different questions are separate, so the only thing it can become confident about is the right answer: entropy falls *because* it is right. A real language model shares weights across everything, gets imperfect rewards, and can lock onto a pattern that is merely "good enough" for the grader.

**Usual causes:**

| Cause | Why it leads to collapse |
|---|---|
| Learning rate too high | Each step moves the model so far that it overcommits to whatever got rewarded last |
| Many updates per batch (`num_iterations` > 1) with a wide clip range | The same lucky answers get pushed again and again |
| Symmetric clipping on a long run | Rare tokens can barely grow, so diversity drains away (DAPO's observation) |
| Low sampling temperature | Groups start out too similar, so advantages are small or zero |

**Fixes, in order:**

1. **Lower the learning rate** (for example halve it) and restart from the last healthy checkpoint.
2. **Use clip-higher:** set `epsilon_high` above `epsilon` (DAPO used 0.28 with 0.2) so unlikely tokens can grow.
3. **Keep or raise sampling temperature** (TRL's default is 1.0) so groups stay diverse.
4. **Add a small KL leash** (`beta > 0`) to resist the rapid drift.
5. **If length is collapsing or exploding,** check your loss aggregation: the original per-answer length normalization has the length bias described in *Dr. GRPO* (Liu et al., 2025). TRL's `loss_type="dapo"` (default) or `"dr_grpo"` avoids it. For runaway length, `mask_truncated_completions=True` stops cut-off answers from adding noise; DAPO also proposes "overlong reward shaping", a soft penalty as answers approach the limit.

Watch for collapse early. Once entropy has gone to zero, groups stop disagreeing, and there is no signal left to climb back out. Restarting from an earlier checkpoint with a fix is usually faster than waiting.

## Case 4: the leash is too tight

**Symptoms.** Reward rises, but very slowly. KL stays tiny for the whole run. The model hardly changes from where it started.

**See it live.** The **tight leash** preset sets `beta=0.05` on the Tiny Adder. In Python, after 200 steps it reaches reward 0.62 and accuracy 0.68, against 0.86 and 0.84 with no leash. Push beta higher and it gets worse: at `beta=0.5` the model stays at chance (accuracy 0.07).

**Fix:** lower `beta`, or set it to 0. TRL's default is `beta=0.0`, and for verifiable rewards like maths answers many recipes, DAPO included, drop the KL term entirely. Our Colab script uses a small 0.04 mainly so you can see a KL curve; if your run looks leashed, try 0.

Don't confuse this with Case 1. Here the fuel gauge is fine (groups disagree, signal exists) but the KL penalty cancels much of each step. In Case 1 there is no signal to begin with.

## The symptom-to-fix table

| What you see | Most likely | First thing to try |
|---|---|---|
| Reward flat at 0, `frac_reward_zero_std` ≈ 1 | stuck: no signal | read completions, test the grader by hand |
| Reward up, held-out accuracy flat or down | reward hacking | stricter grader, re-weight, read completions |
| Entropy crashes early, groups identical, reward stalls | collapse | lower learning rate, `epsilon_high`, restart from checkpoint |
| Reward slowly up, KL tiny throughout | leash too tight | lower or zero `beta` |
| Length climbs to the limit, accuracy flat | rambling | check `loss_type`, `mask_truncated_completions`, cap any length bonus |
| KL spikes, entropy rises, text garbled | updates too big | lower learning rate |

## Key takeaways

- Start every diagnosis by reading real completions and testing the grader by hand. Most bugs are found there.
- **Stuck at zero:** almost every group is all-wrong, so there is no signal. Fix the grader, the length limit or the difficulty, or raise the group size.
- **Reward hacking:** reward up, held-out accuracy not. Tighten and re-weight the grader; always keep a held-out check.
- **Collapse:** entropy crashes and groups become identical. Lower the learning rate, use clip-higher, keep sampling diverse, restart from a healthy checkpoint. A too-tight leash looks different: steady but slow progress with tiny KL.

## Next up

In module 7, **Format, length and the "aha" moment**, you will look at the most famous curve in reasoning-model training: response length growing as the model learns to think, and what that "aha" really was.
