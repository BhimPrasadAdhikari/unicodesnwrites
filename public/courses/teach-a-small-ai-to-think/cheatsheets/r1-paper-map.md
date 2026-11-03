# The DeepSeek-R1 paper, mapped

*Teach a Small AI to Think · unicodesnwrites.tech · one-page cheat sheet*

**Paper:** *DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning*, DeepSeek-AI, January 2025 (arXiv 2501.12948).
**One-line summary:** a model can learn to reason step by step from reinforcement learning with simple, automatically checkable rewards, and that reasoning can then be copied into much smaller models.

## The two models in the paper

| | **R1-Zero** | **R1** |
|---|---|---|
| Starts from | DeepSeek-V3-Base (no instruction tuning) | DeepSeek-V3-Base |
| Supervised examples first? | None. Pure reinforcement learning | A small "cold start" set of thousands of long, readable worked solutions |
| RL algorithm | GRPO | GRPO |
| Rewards | Accuracy (is the final answer right?) + format (is the thinking inside `<think>` tags?) | Same, plus a language consistency reward; later a general stage that also uses reward models |
| Strength | Shows reasoning can emerge from RL alone | Reasons well **and** reads well |
| Weakness | Hard to read, mixes languages | More stages, more engineering |

## The R1 recipe, in four stages

| Stage | What happens | Why |
|---|---|---|
| 1. Cold start | Fine-tune on thousands of long chain-of-thought examples | Gives RL a readable starting style |
| 2. Reasoning RL | GRPO on maths, code and logic with rule-based rewards + language consistency | Builds the reasoning skill |
| 3. Rejection sampling + SFT | Keep good answers from the RL model: about 600k reasoning + 200k general samples, fine-tune for two epochs | Locks in good behavior, adds general skills |
| 4. RL for all scenarios | Rule-based rewards for reasoning, reward models for helpfulness and harmlessness | Polishes the final assistant |

## Results worth remembering

| Claim | Number (as reported in the paper) |
|---|---|
| R1-Zero, AIME 2024 pass@1, during RL | 15.6% → 71.0% |
| R1-Zero with majority voting | 86.7% |
| Qwen-32B: RL directly vs distilled from R1, AIME 2024 | 47.0 vs 72.6 |
| Qwen-32B: RL directly vs distilled, MATH-500 | 91.6 vs 94.3 |

## Words the paper uses

| Term | Plain meaning |
|---|---|
| **GRPO** | Group Relative Policy Optimization (*DeepSeekMath*, Shao et al., 2024). Sample a group of answers to one question, score them, and push up the ones that beat the group average. No separate critic model. |
| **Rule-based reward** | A score computed by a simple program (compare the final number, run unit tests), not by another AI. |
| **Aha moment** | An intermediate R1-Zero checkpoint started writing things like "wait" and re-checking its own work, without being taught to. |
| **Response length growth** | During RL, R1-Zero's answers got steadily longer: it learned to spend more thinking on harder problems. |
| **Distillation** | Fine-tune a small "student" model on answers written by a big "teacher" model. |
| **Cold start** | A small supervised warm-up before RL. |

## What did not work (Section "Unsuccessful attempts")

- **Process reward models** (grading every step): hard to define a "step", easy to hack, costly to retrain.
- **Monte Carlo Tree Search** (searching over steps like a chess engine): the space of possible text is far too large.

## Why this course cares

1. Rule-based rewards are cheap and hard to fool, so **you can run this on a free GPU** with GSM8K.
2. GRPO needs no critic model, which **saves memory**.
3. The paper's own finding, that distillation beats RL on small models, is **why Module 8 exists**.

*Numbers are as reported by DeepSeek-AI (2025). They come from very large models and very large compute budgets; your small-model runs will look different.*
