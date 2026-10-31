# Lab: REINFORCE from scratch in numpy

There is a moment in every course like this when an idea stops being a diagram and starts being something you can run. This is that moment. In about 70 lines of Python, you will build a "model" that starts out with no idea what 3 + 4 is, give it nothing but scores, and watch it learn. Then you will run a small experiment that shows, with real numbers, why every serious method, including GRPO, compares each answer against a baseline.

**In this lab** you will read and run `reinforce_bandit.py`, a complete REINFORCE learner written with numpy only. You will see one update up close, train for 60 steps, and compare three setups across 20 random seeds. Everything runs on a normal CPU in a couple of seconds. Follow the code walkthrough on this page, or open the **REINFORCE lab notebook** in Colab, which adds a plot.

## The world we are building

Before code, the picture. Our "model" (in RL language, the **policy**) answers one question, *What is 3 + 4?*, by picking one of four answers. A score sheet hands out points, but the policy never sees the sheet. It only sees the score of whatever it picked.

| Answer | Score | Why |
|---|---|---|
| `7` | 1.5 | Correct (1.0) plus a 0.5 "wrote a number" bonus |
| `8` | 0.5 | Wrote a number |
| `6` | 0.5 | Wrote a number |
| `no idea` | 0.0 | Nothing |

This tiny world has a name in RL: a **bandit**, after slot machines ("one-armed bandits"). There is no sequence of moves, just one choice and one score. It is the simplest possible place to see learning from a score, which is exactly why we start here.

The score sheet deliberately mirrors the format and correctness rewards from Module 2: a small bonus for a tidy answer, a big one for a right answer.

## The loop, in words

One training step does four things:

| Step | Plain words |
|---|---|
| 1. Sample | Let the policy pick 8 answers, according to its current probabilities |
| 2. Score | Look up each answer's score |
| 3. Compare | Work out each answer's advantage: its score minus the batch average |
| 4. Nudge | Move the logits toward above-average answers and away from below-average ones |

That is the nudge from the last lesson, done for a batch of answers at once and averaged.

## The code, piece by piece

### Probabilities from logits

```python
def softmax(logits):
    """Turn raw scores (logits) into probabilities that add up to 1."""
    z = logits - logits.max()  # subtract the max so exp() never overflows
    e = np.exp(z)
    return e / e.sum()
```

The policy is just four numbers, its logits, starting at zero. `softmax` turns them into probabilities. Subtracting the maximum first does not change the answer; it only stops `np.exp` from producing numbers too big for the computer.

### One REINFORCE step

This is the heart of the file:

```python
def reinforce_step(logits, rng, batch_size=8, lr=0.5, baseline="mean", bonus=0.0):
    """Sample answers, score them, nudge the logits. Returns (new_logits, mean_reward).

    `bonus` adds the same points to every answer ("points for showing up").
    """
    probs = softmax(logits)
    picks = rng.choice(len(ANSWERS), size=batch_size, p=probs)
    rewards = REWARDS[picks] + bonus
    if baseline == "mean":
        advantages = rewards - rewards.mean()  # better or worse than this batch's average?
    else:
        advantages = rewards  # raw score: every answer with r > 0 gets pushed up
    grad = np.zeros_like(logits)
    for k, a in zip(picks, advantages):
        onehot = np.eye(len(ANSWERS))[k]
        grad += a * (onehot - probs)  # gradient of log(prob of answer k)
    return logits + lr * grad / batch_size, rewards.mean()
```

Line by line, in plain words:

- **`rng.choice(..., p=probs)`** rolls a weighted die 8 times. Likely answers come up more often, but every answer has a chance.
- **`REWARDS[picks] + bonus`** looks up the scores. `bonus` adds the same points to every answer; it is zero unless we are running the experiment below.
- **`rewards - rewards.mean()`** is the baseline. Above-average answers get a positive advantage, below-average a negative one.
- **`onehot - probs`** is the direction that makes answer `k` more likely, exactly as in the last lesson. The comment calls it the "gradient of log(prob of answer k)": that is the mathematical name for the same direction.
- **`lr * grad / batch_size`** averages the nudges over the batch and takes a step of size `lr`.

That is all of REINFORCE (Williams, 1992). Tiny Adder in Module 4 uses the same line, with one set of logits per sum and a slightly fancier baseline.

### Training and measuring

`train` starts from all-zero logits, runs the step 60 times and records the probability of `7` after each step. `average_runs` repeats training with 20 different random seeds and reports the average and the **spread** (standard deviation) across seeds. One run can be lucky. Twenty runs tell you whether a method is reliable.

## Run it

From the `code` folder:

```bash
python reinforce_bandit.py
```

This is the real output:

```
answers:      ['7', '8', '6', 'no idea']
start probs:  [0.25 0.25 0.25 0.25]
after 1 step: [0.278 0.247 0.244 0.231] (batch mean reward 0.62)

P(correct), mean over 20 seeds (spread between seeds in brackets)
 step     no baseline    no base, +10    mean base, +10
    0     0.25 (0.00)     0.25 (0.00)       0.25 (0.00)
    5     0.42 (0.06)     0.21 (0.29)       0.40 (0.03)
   10     0.62 (0.08)     0.18 (0.33)       0.59 (0.04)
   20     0.86 (0.03)     0.18 (0.32)       0.83 (0.02)
   40     0.95 (0.01)     0.16 (0.35)       0.94 (0.01)
   60     0.97 (0.00)     0.23 (0.40)       0.96 (0.00)
```

There is a lot packed into those few lines, so let us read them one piece at a time.

### One step up close

After a single step, `7` went from 25% to about 28%, and `no idea` dropped to about 23%. Small, but in the right direction. Notice it is a *gentle* change: with a learning rate of 0.5 and only 8 samples, one step is a nudge, not a leap.

### Column 1: no baseline, honest scores

The probability of `7` climbs from 0.25 to 0.97 over 60 steps. Learning works even without a baseline here, because the scores are small and the wrong answers earn less than the right one.

### Column 2: no baseline, +10 for everyone

Now every answer gets 10 extra points, "for showing up". That changes nothing about which answer is best: `7` still scores exactly 1.0 more than `8`. Yet learning falls apart. After 60 steps the average probability of `7` is only 0.23, *lower than where it started*, and the spread between seeds is huge (0.40). Some runs found `7`; many locked onto a wrong answer.

Why? With no baseline, every sampled answer has a big positive score (10 to 11.5), so every sampled answer gets pushed **up**. Whichever answer happens to be sampled a lot early on gets pushed up a lot, which makes it sampled even more, which pushes it up more. The small difference between 10.5 and 11.5 is drowned out by the shared 10.

### Column 3: mean baseline, +10 for everyone

Same +10 bonus, but now we subtract the batch average. The 10 points cancel out exactly, and the results are almost identical to a run with no bonus at all: 0.96 after 60 steps, with a tiny spread. The baseline makes the learner immune to "points for everyone".

> Keep this table in mind for Module 4. GRPO's whole idea is a baseline: the average score of a group of answers to the same question.

### A small surprise

Compare columns 1 and 3 in the early steps: without a baseline, `7` actually rises *slightly* faster (0.62 vs 0.59 at step 10). With honest scores of 0 to 1.5, the raw scores are a bit bigger than the advantages, so the steps are a bit bigger. But the spread with a baseline is about half as large (0.04 vs 0.08). That is the usual trade: a baseline mostly buys you **reliability**, and when rewards have a large shared offset, as in column 2, reliability is everything.

## Turning the knobs

Here are real results (mean over 20 seeds, spread in brackets) from changing one setting at a time with the mean baseline. You can reproduce them by calling `average_runs("mean", lr=...)` or `average_runs("mean", batch_size=...)`.

| Setting | P(`7`) at step 10 | P(`7`) at step 60 |
|---|---|---|
| Default (lr 0.5, batch 8) | 0.59 (0.04) | 0.96 (0.00) |
| Learning rate 2 | 0.94 (0.02) | 0.99 (0.00) |
| Batch of 2 | 0.43 (0.07) | 0.92 (0.02) |
| Batch of 32 | 0.64 (0.02) | 0.97 (0.00) |

What to notice:

- **A bigger learning rate learns faster here.** This bandit is very easy and the scores never lie, so big steps are safe. On real models, with noisy rewards and millions of parameters, large learning rates are a common way to break a run, and you will see that in Modules 5 and 6.
- **Smaller batches are noisier.** With only 2 samples, the batch average is a shaky estimate of "usual", so learning is slower and less consistent. Bigger batches give steadier steps, at the cost of more computation per step.

## What this toy leaves out

This bandit is honest about being small. Compared with training a real model:

| Toy bandit | Real language model |
|---|---|
| 4 possible answers | Astronomically many possible paragraphs |
| 4 logits | Hundreds of millions of parameters |
| One choice per answer | Hundreds of token choices per answer |
| Scores never lie | Rewards can have loopholes (Module 2) |
| Updates can be big safely | Big updates can wreck the model (Module 4's clipping and KL leash) |

But the core loop is the same one you will run on Qwen in Module 5: sample, score, compare with a baseline, nudge.

## Key takeaways

- REINFORCE fits in one loop: sample answers, score them, subtract a baseline to get advantages, and move the logits by learning rate × advantage × (onehot − probs).
- In the real run, the policy went from 25% to 96% on the right answer in 60 steps with a mean baseline.
- Adding +10 to every score without a baseline wrecked learning (0.23 after 60 steps, with a spread of 0.40); with a mean baseline the bonus cancelled out completely (0.96).
- Baselines mainly buy reliability; batch size and learning rate trade speed against stability.

## Next up

In **Groups and advantages: the heart of GRPO** you will take the baseline idea one step further: sample a group of answers to the same question, and judge each one against its own group.
