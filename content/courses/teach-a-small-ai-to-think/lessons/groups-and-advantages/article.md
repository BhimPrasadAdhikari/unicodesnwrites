# Groups and advantages: the heart of GRPO

Imagine a teacher who never writes a model answer. Instead, she asks the whole class the same question, collects eight answers, and then says: "These three were better than our class average, these five were worse." Nobody gets an absolute grade. Everyone learns from how they compared with their classmates on *the same* question.

That is the core idea of GRPO, the training method behind DeepSeek-R1. It sounds almost too simple to work. In this lesson you will see why it works, and why it made reinforcement learning cheap enough to run on a free GPU.

**In this lesson** you will learn what a "group" is, how GRPO turns a group of plain right/wrong scores into an *advantage* for each answer, and why dividing by the group's spread matters. You will work through a few groups by hand, see what happens when every answer in a group gets the same score (spoiler: nothing), and connect all of it back to the nudge from the last module. No new maths beyond averages.

## Where we left off: the nudge needs a baseline

In module 3 you met the nudge (the REINFORCE rule): after the model gives an answer, make that answer a bit more likely if it scored well, and a bit less likely if it scored badly.

There is a catch. Our rewards are mostly `1` (right) or `0` (wrong). If you only ever nudge *up* by the reward, then a right answer gets nudged up and a wrong answer gets... nothing. Learning is slow, and very noisy.

The fix is a **baseline**: a number that says "what score did we expect?" Then you nudge by *reward minus baseline*:

| Reward | Expected (baseline) | Reward − baseline | What the nudge does |
|---|---|---|---|
| 1 | 0.3 | +0.7 | push this answer up |
| 0 | 0.3 | −0.3 | push this answer down |
| 1 | 0.9 | +0.1 | tiny push up (we expected to be right anyway) |
| 0 | 0.9 | −0.9 | big push down (a surprising mistake) |

"Reward minus baseline" has a name: the **advantage**. It answers one question: *was this answer better or worse than usual?*

The hard part is getting a good baseline. The older method, PPO, trains a whole second neural network (a "critic" or "value model") just to predict the expected score. For a language model, that critic is usually as big as the model you are training. That doubles the memory, and the critic itself can be wrong.

## GRPO's trick: ask the same question several times

GRPO (Group Relative Policy Optimization, from the *DeepSeekMath* paper by Shao et al., 2024) throws the critic away. Instead, for every question it samples a **group** of `G` answers from the current model, grades each one, and uses the group itself as the baseline.

Here is one question, "What is 7 + 5?", asked eight times:

| Answer # | Model said | Reward |
|---|---|---|
| 1 | 12 | 1 |
| 2 | 13 | 0 |
| 3 | 12 | 1 |
| 4 | 11 | 0 |
| 5 | 2 | 0 |
| 6 | 12 | 1 |
| 7 | 75 | 0 |
| 8 | 14 | 0 |

The group's average reward is 3 / 8 = 0.375. That average *is* the baseline: it is the model's own current success rate on this exact question. No second network needed.

Answers 1, 3 and 6 beat the average, so they get a positive advantage. The other five fall below it, so they get a negative one.

> Why the same question? Because difficulty varies wildly. A score of 0.5 is great on a hard question and poor on an easy one. Comparing answers to the *same* question removes difficulty from the picture.

## Step two: divide by the spread

GRPO does one more thing. After subtracting the mean, it divides by the group's **standard deviation**, a measure of how spread out the scores are. In words: *how many "typical differences" above or below average was this answer?*

The Tiny Adder code (and the spec for this course) writes it like this:

```python
advantage = (r - r.mean()) / (r.std() + 1e-4)
```

The `1e-4` is a tiny safety number so we never divide by zero.

Let's see what the division does with real groups of eight. These numbers come straight from running that line in Python:

| Group rewards | Mean | Std | Advantage of a correct answer | Advantage of a wrong answer |
|---|---|---|---|---|
| 1 right, 7 wrong | 0.125 | 0.331 | **+2.64** | −0.38 |
| 4 right, 4 wrong | 0.5 | 0.5 | +1.00 | −1.00 |
| 7 right, 1 wrong | 0.875 | 0.331 | +0.38 | **−2.64** |
| all wrong | 0 | 0 | — | 0 |
| all right | 1 | 0 | 0 | — |

Read the rows out loud and you can hear the logic:

- **1 right out of 8.** The model rarely gets this question. The lucky right answer is a big deal, so it gets a big push (+2.64). The seven wrong answers were the norm, so each gets only a gentle push down.
- **4 out of 8.** A coin flip. Right answers go up by one unit, wrong answers go down by one unit.
- **7 out of 8.** The model mostly knows this. The rare mistake is the surprise, so it gets the big push down (−2.64).

Notice something neat: the advantages in a group always add up to zero. GRPO never makes the model "more confident in general". It only moves probability *from* the worse answers *to* the better ones.

## The silent groups: when everyone scores the same

Look at the last two rows. If all eight answers are wrong, every advantage is exactly zero. If all eight are right, also zero. **Those groups teach the model nothing at all.**

That is not a bug; it is honest. If every answer is wrong, the group has no idea which direction is "better". If every answer is right, there is nothing left to improve on this question.

But it has big practical consequences:

| Situation | What you see | Why |
|---|---|---|
| Questions far too hard for the model | Training is stuck at zero reward | Almost every group is all-wrong, so almost every advantage is 0 |
| Questions far too easy | Reward is high but nothing changes | Almost every group is all-right |
| Group size too small | Slow, jumpy learning | With 2 answers per group, both are wrong very often |

Our Tiny Adder starts out guessing uniformly among 19 possible answers (0 to 18), so each guess is right with probability 1/19. A small calculation shows how often a whole group misses:

| Group size `G` | Chance a group is all wrong at the start |
|---|---|
| 2 | about 90% |
| 8 | about 65% |
| 16 | about 42% |

(That is just (18/19) multiplied by itself `G` times.) With `G = 2`, nine out of ten groups at the start carry no signal at all. You will watch exactly this happen in the "stuck" preset of the training lab later in this module.

Real training libraries track this directly. Hugging Face TRL logs a number called `frac_reward_zero_std`: the fraction of groups where every answer got the same reward. You will learn to read it in module 6. The *DAPO* paper (ByteDance Seed, 2025) even proposes "dynamic sampling": throw those silent groups away and sample more questions until the batch is full of groups that actually teach something.

## Putting it together with the nudge

Now combine the group advantage with the nudge from module 3. For each answer in the group:

1. Look up its advantage `A`.
2. Make that answer more likely in proportion to `A` (or less likely, if `A` is negative).

For the Tiny Adder, whose "brain" is just a table of scores (logits) for each possible answer, the update is:

```python
L[a][b] += lr * A_i * (onehot(k_i) - softmax(L[a][b]))
```

In words: "for question `a + b`, raise the score of answer `k_i` by an amount proportional to its advantage, and lower everything else a little to make room." In our code we average this over the eight answers in the group. You will build the full loop in the lab.

Here is the whole GRPO step as a picture you can keep in your head:

| Step | What happens | Tiny Adder version |
|---|---|---|
| 1. Ask | Pick a batch of questions | 16 random sums like 7 + 5 |
| 2. Sample | Get `G` answers per question from the current model | 8 guesses per sum |
| 3. Grade | Score each answer with a rule | 1 if the guess equals the sum, else 0 |
| 4. Compare | Advantage = (reward − group mean) / group spread | e.g. +2.64 for a lone right answer |
| 5. Nudge | Shift probability toward positive-advantage answers | update the logit table |

Then repeat, hundreds of times.

## Try it: the group-advantage explorer

The interactive below shows a group of eight sampled answers. Click any answer to flip it between correct and incorrect, and watch the mean, the spread and every advantage update.

Things to try:

- Make exactly one answer correct. Note its advantage. Now make it seven correct. Where did the big number move to?
- Make all eight wrong, then all eight right. What happens to every advantage?
- Check the sum of all eight advantages each time.

## What GRPO gives up

Nothing is free. Using the group mean as the baseline means you need several answers per question, and for a language model each answer means generating maybe hundreds of tokens. Sampling is usually the slowest part of a GRPO run. That is why group size is one of the main knobs you will tune: bigger groups give better baselines and fewer silent groups, but cost more time per step.

The division by standard deviation has also been questioned. The *Dr. GRPO* paper ("Understanding R1-Zero-Like Training", Liu et al., 2025) argues that dividing by the spread gives extra weight to questions that are nearly always right or nearly always wrong (look at the ±2.64 in the table above), a "difficulty bias". Their fix is simply not to divide. TRL exposes this as a setting (`scale_rewards`), which you will meet in module 5. For now, keep the original version: it is what DeepSeek used, and it works well on our toy.

## Key takeaways

- An **advantage** says how much better or worse an answer was than expected. GRPO nudges answers by their advantage, not their raw reward.
- GRPO gets its baseline for free by sampling a **group** of answers to the same question and using the group's mean reward. No critic network.
- Dividing by the group's spread makes a rare success (or rare failure) count for more. Advantages in a group always sum to zero.
- Groups where every answer scores the same have zero advantage and teach nothing. Too-hard data or too-small groups means training gets stuck.

## Next up

Nudging hard on a lucky answer is risky: one big step can wreck what the model already knew. In **Clipping and the KL leash** you will see the two safety brakes GRPO borrows from PPO, and when each one kicks in.
