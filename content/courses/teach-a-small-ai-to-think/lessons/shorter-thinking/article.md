# Making thinking shorter (and cheaper)

Ask a freshly trained reasoning model "what is 2 + 3?" and you may get three paragraphs: it adds, then double-checks, then considers whether you meant something else, then checks again. The answer is right. It just took two hundred tokens to say "5".

That's not only a little silly, it's expensive. Every token a model writes costs time and compute, and when a model answers millions of questions a day, thinking you don't need adds up fast. In the last lesson you saw that some of that length can even be an artifact of how GRPO averages its loss. In this one you'll learn to push back on purpose.

**In this lesson** you'll learn why length is a cost worth managing, then build three reward functions that pay the model for being right *and* concise: a simple length penalty, a token budget, and DAPO's soft overlong punishment. You'll run them on a small group of fake answers, see exactly what each one rewards, and watch how they change GRPO's advantages. Finally you'll see the TRL settings that work alongside them, and the traps to avoid.

## Why length matters

Here's a rough picture of what thinking costs. The numbers are **illustrative**, not measured on a particular model or service:

| Reply | Tokens | Relative time to generate | Relative cost |
|---|---|---|---|
| Just the answer | 5 | 1× | 1× |
| Short working | 60 | about 12× | about 12× |
| Long working with re-checks | 600 | about 120× | about 120× |

Generation time and cost grow roughly in line with the number of tokens written. A model that thinks ten times longer than it needs to is roughly ten times slower and more expensive to run.

But we don't want *no* thinking. On hard problems, working things out step by step is exactly what makes reasoning models better. The goal is a model that:

- thinks briefly on easy problems,
- thinks longer on hard ones, and
- never trades a right answer for a short one.

That third point is the one that's easiest to get wrong.

## The golden rule: never reward short and wrong

Imagine you simply subtract a little reward for every token, from every answer. A wrong answer of 5 tokens now scores better than a wrong answer of 200 tokens. Fine so far. But what about a wrong answer of 5 tokens versus a *right* answer of 300 tokens? If the penalty is big enough, the short wrong answer wins, and the model learns to guess quickly. Accuracy collapses.

So all the rewards in this lesson follow one rule: **length only matters once the answer is right**. Wrong answers get the same score however short they are. Think of it as a delivery company: it pays a bonus for fast delivery, but only for parcels that arrive at the right address.

## Three ways to say "be concise"

All three functions live in `code/length_rewards.py`, written in plain Python with the same shape as a TRL reward function: they take a list of `completions` plus dataset columns as keyword arguments, and return one number per completion. To keep things CPU-only, they count words as a stand-in for tokens.

### 1. Length penalty: "a little less for every token"

A correct answer starts at 1.0 and loses a bit for each token, up to a maximum loss of `alpha`:

| Correct? | Length | Reward (`max_len=200`, `alpha=0.5`) |
|---|---|---|
| yes | very short | close to 1.0 |
| yes | 100 tokens | 0.75 |
| yes | 200 tokens or more | 0.5 |
| no | anything | 0.0 |

In symbols, for correct answers: reward = 1 − alpha × min(length / max_len, 1). Because `alpha` is below 1, even the longest correct answer (0.5) still beats every wrong answer (0.0).

### 2. Budget: "anything under the limit is fine"

Sometimes you don't care about 40 tokens versus 60, you only care about not going way over. A budget reward gives full marks to correct answers up to `budget` tokens, then slides down in a straight line to 0 at twice the budget:

| Correct? | Length (`budget=100`) | Reward |
|---|---|---|
| yes | up to 100 | 1.0 |
| yes | 150 | 0.5 |
| yes | 200 or more | 0.0 |
| no | anything | 0.0 |

Notice a catch: at twice the budget, a correct answer scores the same as a wrong one. That's a deliberate choice here (it says "too long is as bad as wrong"), but it's a strong one. Many people keep a small floor instead.

### 3. Overlong shaping: "a soft wall before the hard wall"

In training, every reply has a hard cap, `max_completion_length`. A reply that hits the cap is cut off mid-sentence, usually before it reaches the answer. DAPO (ByteDance Seed, 2025) noticed that suddenly punishing these cut-off replies adds noise, and proposed a gentler ramp they call soft overlong punishment:

| Length (`max_len=200`, `cache=50`) | Extra reward |
|---|---|
| up to 150 | 0 (no penalty) |
| 175 | −0.5 |
| 200 | −1.0 |
| over 200 | −1.0 |

This one is different: it says nothing about being right. You **add** it to your correctness reward. It acts like a rumble strip at the edge of a road: you feel it before you hit the barrier.

## See them side by side

`length_rewards.py` has a demo: one question ("What is 17 + 25?") and a group of five answers of different lengths. Here's the real output of `python length_rewards.py`:

```text
completion           tokens   correct   penalty    budget  overlong
short, correct           11      1.00      0.97      1.00      0.00
medium, correct          79      1.00      0.80      1.00      0.00
long, correct           169      1.00      0.58      0.31     -0.38
very long, correct      259      1.00      0.50      0.00     -1.00
short, wrong             11      0.00      0.00      0.00      0.00

GRPO advantages for the same group:
  correct    0.50   0.50   0.50   0.50  -2.00
  penalty    1.22   0.70   0.02  -0.21  -1.73
```

Read the first table column by column:

- **correct** can't tell the four right answers apart. They all get 1.0.
- **penalty** ranks them smoothly: shorter right answers score higher, and every right answer still beats the wrong one.
- **budget** doesn't care about 11 versus 79 tokens (both under 100), but drops hard past the budget.
- **overlong** only starts to bite at 150 tokens.

The second table is where it gets interesting. Remember that GRPO doesn't use rewards directly, it uses **advantages**: each reward minus the group's average, divided by the group's spread. With the plain correctness reward, all four right answers get the same +0.50 push. With the length penalty, the short right answer gets a big push (+1.22), the medium one a smaller one, and the *very long right answer actually gets a small negative advantage* (−0.21). It's still right, but it's below the group average, so GRPO makes it a little *less* likely.

That's the power and the danger of a length reward in one line. It does steer the model toward shorter correct answers. But if your group often has only long right answers (because the problem is hard), a too-strong penalty can push down the very behavior that solved it.

## Making it fair across easy and hard problems

One way around that danger is to compare lengths **within each group** instead of against a fixed `max_len`. For each prompt, the shortest correct answer gets the most reward and the longest correct answer the least. A hard problem whose only right answers are long isn't penalized at all, because there's nothing shorter to compare against. You'll build this in the first exercise.

## Settings in TRL that help

Reward functions aren't the only lever. In Hugging Face TRL's `GRPOConfig` (we used TRL 1.16.0):

| Setting | What it does for length |
|---|---|
| `max_completion_length` | The hard cap. Lower it and the model physically can't ramble past it, but too low cuts off honest working. |
| `mask_truncated_completions=True` | Replies cut off at the cap are left out of the loss, instead of being treated as failures. DAPO recommends this for stability. |
| `loss_type="dr_grpo"` or `"dapo"` | Removes the per-answer length averaging that quietly lets wrong answers grow (last lesson). |
| `reward_weights` | Sets how much each reward counts when you pass several, e.g. correctness plus a length term. |

You pass several reward functions as a list, and TRL adds them up (weighted, if you set `reward_weights`):

```python
from trl import GRPOConfig, GRPOTrainer
from length_rewards import correctness_reward, overlong_shaping

config = GRPOConfig(
    output_dir="out",
    max_completion_length=256,
    mask_truncated_completions=True,
    loss_type="dr_grpo",
    reward_weights=[1.0, 0.5],   # correctness counts double
)
trainer = GRPOTrainer(
    model="Qwen/Qwen2.5-0.5B-Instruct",
    reward_funcs=[correctness_reward, overlong_shaping],
    args=config,
    train_dataset=dataset,       # needs "prompt" and "answer" columns
)
```

Two practical notes. First, the demo counts words; in a real run, count real tokens (TRL also passes `completion_ids` to your reward function, so `len(ids)` is the true token count). Second, this snippet expects plain-text completions. If your dataset uses chat messages, take `completion[0]["content"]` first.

## Traps to avoid

1. **Penalizing wrong answers for length.** The model learns to guess quickly. Keep length terms for correct answers only (or add them only as a small extra).
2. **A penalty that's too strong.** If `alpha` gets close to 1, long correct answers score almost the same as wrong ones, and the model loses the reason to work hard problems through. Start gentle (0.1 to 0.3) and raise it only if length keeps growing.
3. **Turning it on from step one.** Many people let the model learn to be right first, then add the length term later, once accuracy has climbed.
4. **Judging by length alone.** After any change, check accuracy on a held-out set. Shorter and wrong is not progress.

## Key takeaways

- Every generated token costs time and money, so length is worth managing, but never at the cost of right answers.
- A length penalty ranks correct answers by length; a budget only cares about going over a limit; DAPO's overlong shaping is a soft ramp before the hard cap, added to a correctness reward.
- Length rewards change GRPO's advantages: a long correct answer can end up below the group average and be pushed down, so keep penalties gentle.
- Comparing lengths within each group protects hard problems whose only right answers are long.
- In TRL, combine reward functions with `reward_weights`, and use `max_completion_length`, `mask_truncated_completions` and `loss_type` alongside them.

## Next up

In **Distillation vs RL: which one, when**, we look at a completely different way to give a small model good thinking habits: let it copy a bigger model's reasoning, instead of discovering it from scores.
