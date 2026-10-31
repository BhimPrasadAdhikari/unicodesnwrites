# Clipping and the KL leash

Picture a student who gets one tricky question right by luck, and the teacher reacts by rewriting the whole syllabus around that answer. By next week the student has forgotten how to do anything else. Overreacting to one lucky result is one of the classic ways reinforcement learning goes wrong.

GRPO has two safety brakes against this. One limits how far a single batch of answers can move the model. The other keeps the model tied, loosely, to where it started. In this lesson you will meet both.

**In this lesson** you will learn what the *probability ratio* is, how *clipping* stops an update once an answer has already moved enough, and what the *KL leash* (a penalty for drifting away from a reference model) does. You will see when each brake matters, why many modern recipes loosen or drop them, and what our Tiny Adder does when you turn each knob. Everything is explained in words and tables first.

## Why would one batch move the model too far?

Generating answers is the slowest, most expensive part of GRPO. So it is tempting to squeeze more learning out of each batch: sample the answers once, then take *several* small update steps on the same answers. PPO called these inner passes "epochs"; TRL calls the setting `num_iterations`; our Tiny Adder calls it `ppo_epochs`.

The danger: after the first step, the model has already changed. The answers were sampled from the *old* model. If you keep pushing on them, you keep pushing the same answer up and up, long after it stopped being a fair test. A big advantage like +2.64 for one lucky answer, applied four times in a row, can turn "slightly more likely" into "the only thing I ever say".

## The probability ratio: how far has this answer moved?

To know when to stop, we need a way to measure how much an answer has already moved. That measure is the **ratio**:

> ratio = (probability of this answer under the model *now*) / (probability under the model that *sampled* it)

| Old probability | New probability | Ratio | Meaning |
|---|---|---|---|
| 0.10 | 0.10 | 1.0 | not moved yet |
| 0.10 | 0.12 | 1.2 | 20% more likely than when sampled |
| 0.10 | 0.15 | 1.5 | 50% more likely |
| 0.10 | 0.07 | 0.7 | 30% less likely |

On the first inner step the ratio is always exactly 1, because the model has not changed yet. It only drifts from 1 on the second, third and fourth passes.

## Clipping: "that's enough for now"

Clipping, borrowed from PPO (Schulman et al., 2017), sets a band around 1: from `1 − ε` to `1 + ε`. With the usual `ε = 0.2`, the band is 0.8 to 1.2.

The rule, in words:

- If an answer was **good** (positive advantage) and it is already **20% more likely** than when sampled, stop pushing it up.
- If an answer was **bad** (negative advantage) and it is already **20% less likely**, stop pushing it down.
- Otherwise, keep going.

| Advantage | Ratio | Inside the band? | What happens |
|---|---|---|---|
| +1 | 1.1 | yes | keep pushing up |
| +1 | 1.3 | no, too high | **stop**: it has moved enough |
| −1 | 0.9 | yes | keep pushing down |
| −1 | 0.7 | no, too low | **stop**: it has moved enough |
| −1 | 1.5 | no, but wrong way | keep pushing down (it went the wrong way, so fix it) |

That last row is subtle and important. Clipping only stops you from going *too far in the direction you wanted*. If a bad answer somehow became more likely, the brake does not stop you from correcting it.

The formula version comes in the paper-walkthrough lesson. For now, the Tiny Adder code shows the whole rule in two lines:

```python
clipped = (A > 0 and ratio > 1 + eps) or (A < 0 and ratio < 1 - eps)
if not clipped:  # outside the trust region the gradient is zero
    step += ratio * A * (onehot - p_new)
```

"Gradient is zero" is just the formal way to say "this answer stops contributing to the update".

### Try it: the clip explorer

Drag the ratio slider and flip the advantage sign. The plot shows the clipped objective, and the shaded area shows where the gradient stops. Try making `ε` tiny (a very cautious learner) and very large (no brake at all).

## What clipping does to Tiny Adder

Here is a real experiment with `grpo_tiny_adder.py` (the file you will build in the lab). Both runs take four inner steps per batch (`ppo_epochs=4`); one uses the normal `ε = 0.2`, the other sets `ε` so large that clipping never happens.

| Step | Reward, clipped (ε = 0.2) | Reward, no clipping |
|---|---|---|
| 10 | 0.08 | 0.13 |
| 25 | 0.12 | 0.44 |
| 50 | 0.27 | 0.66 |
| 100 | 0.80 | 0.98 |
| 200 | 0.95 | 0.98 |

Clipping made the toy learn *slower*. That is the honest result, and it is worth understanding why. The Tiny Adder's reward is perfect (a right sum is always right), its "model" is a tiny table with no shared knowledge to break, and each prompt's logits are separate. Overshooting costs almost nothing here.

A real language model is different. Every weight is shared across millions of situations, so one overconfident push on a math answer can also change how the model writes English. Rewards are imperfect, so a big push on a "lucky" answer may be reinforcing a mistake. In that world, giving up a little speed for stability is a good trade. Clipping is insurance: on the toy you can see the premium you pay, not the crash it prevents.

### Clip-higher: a small fix from DAPO

The *DAPO* paper (ByteDance Seed, 2025) noticed a problem with the symmetric band. An answer with probability 0.01 can only rise to 0.012 before the brake hits, while an answer at 0.9 can rise to 1.0. So the rule quietly favors answers the model already likes, and rare, creative answers struggle to grow. Over a long run that can drain diversity from the model (you will see this as "entropy collapse" in module 6).

Their fix, **clip-higher**, uses a wider band on the upside: for example 0.8 to 1.28 instead of 0.8 to 1.2. TRL supports this with a separate `epsilon_high` setting, and the training script in the next module uses `epsilon=0.2, epsilon_high=0.28`.

## The KL leash: don't wander too far from home

Clipping limits how far *one batch* can move the model. It does nothing about slow drift over thousands of steps. Many tiny, individually safe steps can still carry the model far from where it started.

The second brake is the **KL penalty**. Keep a frozen copy of the starting model, called the **reference model**. At every step, measure how different the current model's answers are from what the reference would say, and subtract a penalty proportional to that difference. KL (Kullback–Leibler divergence) is just a standard way to measure "how different are two probability distributions"; it is 0 when they match and grows as they drift apart.

Think of a dog on a leash. The leash does not stop the dog from exploring; it makes far-away spots harder to reach. The strength of the pull is called **beta** (β).

| β | Feel | What it tends to do |
|---|---|---|
| 0 | no leash | free to change as much as the reward asks |
| small (e.g. 0.001 to 0.05) | loose leash | learns, but resists wild drift |
| large | tight leash | barely moves from the reference; learning crawls |

### What the leash does to Tiny Adder

In our toy the reference is the starting table: all zeros, which means "every answer equally likely". To keep the code readable, the toy uses a simple stand-in for the KL gradient: each step pulls the logits back toward the reference by `β × (L − L_ref)`. Same idea, easier to read. Real runs with defaults otherwise:

| β | Reward at step 200 | Accuracy at step 200 |
|---|---|---|
| 0 | 0.86 | 0.84 |
| 0.05 | 0.62 | 0.68 |
| 0.5 | 0.06 | 0.07 |

With β = 0.5 the leash pulls back as hard as the reward pushes forward, and the model stays stuck near "guess anything". This is the **tight leash** preset in the training-run visualization you will use in the lab.

### Why many recipes now set β to zero

In RLHF chatbots (training with human preference scores), the KL leash is vital: the reward is a learned model that is easy to fool, and staying near the reference keeps answers sane. With *verifiable* rewards, where a math answer is simply right or wrong, the case is weaker. The model is *supposed* to change a lot: it is learning a new skill, often with much longer answers.

So DAPO removed the KL term entirely for long chain-of-thought training, and Hugging Face TRL's `GRPOConfig` now defaults to `beta=0.0` (which also saves memory, because the reference model is not loaded). TRL's docs note that DeepSeek-R1 used a small β of 0.001. In our Colab run we will use a small β of 0.04 mainly so that you can *see* the KL curve; with LoRA adapters the reference model costs almost nothing extra, because it is just the base model with the adapter switched off.

## The two brakes, side by side

| | Clipping | KL leash |
|---|---|---|
| Protects against | one batch overreacting | slow drift over the whole run |
| Compares the model to | the model that sampled the answers (a moment ago) | the frozen starting model |
| Knob | `ε` (and `epsilon_high`) | `β` |
| Matters only when | taking more than one update per batch | `β > 0` |
| Typical setting today | `ε = 0.2`, clip-higher 0.28 | 0 to small |

A detail worth knowing: in TRL with the default `num_iterations=1`, there is only one update per batch, so the ratio is (almost) exactly 1 and clipping rarely triggers. You will see a `clip_ratio` metric in your training logs; it is normal for it to sit near zero in that setup.

## Key takeaways

- The **ratio** compares an answer's probability now with its probability when it was sampled. It starts at 1 and only drifts when you take several update steps per batch.
- **Clipping** stops pushing an answer once it has moved more than `ε` (typically 20%) in the direction its advantage wanted. It never blocks a correction in the other direction.
- The **KL leash** penalizes drifting away from a frozen reference model, with strength `β`. Too tight and learning stalls, as the Tiny Adder shows at β = 0.5.
- With verifiable rewards, modern recipes often loosen both: DAPO's clip-higher widens the upper band, and DAPO and TRL's default drop the KL term.

## Next up

You now have every piece: groups, advantages, the nudge, clipping and the leash. In **Lab: GRPO from scratch on Tiny Adder** you will put them together in under 100 lines of numpy and watch a model learn to add.
