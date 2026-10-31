# Reward functions, on one page

*Teach a Small AI to Think · unicodesnwrites.tech · one-page cheat sheet*

**A reward function** is a small program that looks at a model's answer and gives it a score. In reinforcement learning, that score is the only feedback the model gets. It never sees the "right answer", only how well it did.

## The two rewards behind R1-style training

| Reward | Question it asks | Typical score | How to check |
|---|---|---|---|
| **Format** | Is the answer shaped like `<think>…</think><answer>…</answer>`? | 1.0 or 0.0 (or partial credit) | A regular expression, plus "each tag exactly once" |
| **Correctness** | Is the final answer right? | 1.0 or 0.0 | Pull out the number, compare to the gold answer (GSM8K: the number after `####`) |

Make correctness worth more than format (for example 1.0 vs 0.5), so being right always beats being tidy.

## Verifiable vs judged rewards

| | **Verifiable (rule-based)** | **Judged (reward model / AI judge)** |
|---|---|---|
| Examples | Maths answers, unit tests, exact-match puzzles | Helpfulness, style, essays |
| Cost | Almost free | Needs another model |
| Hard to fool? | Mostly, if written carefully | Easier to game at scale |
| Used by R1 for reasoning? | Yes | No (DeepSeek-AI, 2025, cited reward hacking risk) |

## The shape TRL expects

```python
def my_reward(completions, answer, **kwargs):   # dataset columns arrive by name
    return [1.0 if ... else 0.0 for c in completions]   # one float per completion
```

- `completions` is a list of strings, or for chat datasets a list of messages: use `c[0]["content"]`.
- Always accept `**kwargs`: the trainer passes extra arguments.
- Several reward functions are **added together** (or weighted with `reward_weights`).
- Return `None` for a sample to say "this reward does not apply here".

## Checklist before you train

| Check | Why |
|---|---|
| Test on hand-written good, bad and weird answers | Find loopholes before the model does |
| Missing tags return 0, never crash | Early answers are messy |
| Numbers like `$1,200.` and `1200` both parse | Grade the number, not the decoration |
| Each tag must appear exactly once | Stops "repeat the answer block" tricks |
| Empty `<think></think>` is not rewarded (if you care) | Stops "skip the thinking" tricks |
| Format worth less than correctness | Stops "tidy nonsense" |
| Read 10 real samples every few hundred steps | Curves can look fine while answers are rubbish |

## Reward hacking: signs and fixes

| What you see | Likely cause | Fix |
|---|---|---|
| Reward climbs, real accuracy flat | The reward measures something easier than the goal | Tighten the check; add a held-out accuracy eval |
| Answers get very short | Format rewarded, thinking not needed | Lower the format weight; reward correctness more |
| Same phrase repeated | A rule rewards a keyword or tag count | Count tags exactly once; remove keyword rewards |
| Many numbers in the answer | Grader accepts "any number matches" | Grade only the last (or only) number in `<answer>` |
| Reward stuck at 0 | Reward too strict for a beginner model | Add partial credit (soft format) to get learning started |

> **Goodhart's law:** when a measure becomes a target, it ceases to be a good measure. Your reward is a measure. Training makes it the target.

*Further reading: DeepSeek-R1 (DeepSeek-AI, 2025); "Concrete Problems in AI Safety" (Amodei et al., 2016); "Scaling Laws for Reward Model Overoptimization" (Gao et al., 2022); TRL GRPOTrainer docs.*
