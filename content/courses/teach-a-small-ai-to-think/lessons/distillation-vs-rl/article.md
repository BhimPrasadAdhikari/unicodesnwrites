# Distillation vs RL: which one, when

There are two ways to learn to cook a hard dish. You can stand in the kitchen and experiment: try something, taste it, adjust, try again, hundreds of times, until it's good. Or you can borrow the recipe notebook of a great chef and copy their steps, notes and all.

The first is slow, but it can take you somewhere new. The second is fast, but you'll only ever be as good as the chef's notebook. Training a small reasoning model comes down to the same choice. Reinforcement learning (RL) is experimenting in the kitchen. **Distillation** is copying the notebook.

**In this lesson** you'll learn what distillation means for reasoning models and how it differs from the RL you've been doing. You'll see what DeepSeek found when they tried both on small models: copying beat experimenting by a wide margin. You'll also meet two 2025 papers, s1 and LIMO, which showed that a surprisingly small, carefully chosen notebook can be enough. Finally you'll get a simple guide for choosing between the two, or combining them.

## Two ways to learn

| | Reinforcement learning (GRPO) | Distillation (supervised fine-tuning on traces) |
|---|---|---|
| What the model sees | Its *own* attempts, plus a score | A *teacher's* finished answers, worked steps included |
| What it needs | Problems with checkable answers | A stronger teacher model (or its saved outputs) |
| Signal per example | One number: how good was this attempt? | Every token: this is what the next word should be |
| Can it beat the teacher? | Yes, in principle; there's no teacher | Rarely; it learns to imitate |
| Main risk | Learning nothing if it never gets an answer right | Copying the teacher's style without its understanding |

Look at the "signal per example" row. With RL, a whole 300-token attempt earns one number. The model has to work out for itself which of those 300 tokens deserved credit. With distillation, *every single token* comes with the right answer: "after 'so the total is', write '42'". That's a far richer signal, which is why distillation is so efficient.

## What "distillation" means here

The word comes from a 2015 paper by Hinton, Vinyals and Dean, *Distilling the Knowledge in a Neural Network*. Their idea was to train a small "student" to match the full **probability distribution** of a big "teacher", not just its top answer. Those probabilities are called **soft labels**.

Here's why they're useful. Suppose the question is "17 + 25?" and the teacher's probabilities look like this (**illustrative**):

| Answer | Hard label | Teacher's soft label |
|---|---|---|
| 42 | 1 | 0.82 |
| 41 | 0 | 0.11 |
| 43 | 0 | 0.07 |
| 24 | 0 | 0.01 |

The hard label only says "42 is right". The soft label says more: "41 and 43 are near-misses, 24 is way off". The student learns something about *how* answers are related, not just which one is correct.

A **temperature** setting controls how soft the labels are. Divide the teacher's scores by a temperature above 1 before turning them into probabilities, and the distribution flattens out, so the near-misses become more visible. Below 1, it sharpens toward the top answer. Use the interactive below to slide the temperature and compare the teacher's distribution with a student's.

### What reasoning-model distillation actually does

When people say a small model was "distilled from R1", they usually mean something simpler than matching probabilities. They:

1. ask the teacher to solve lots of problems, writing out its full thinking,
2. keep the traces that reach the right answer,
3. fine-tune the student on those texts with ordinary supervised fine-tuning (SFT): predict the next token, again and again.

This is sometimes called *sequence-level* distillation. The student never sees the teacher's probabilities, only its written-out answers, so it's learning from hard labels, one token at a time. That's good news for you: you don't need the teacher model running at all. A dataset of its saved traces is enough, and that's exactly what you'll use in the next lab.

## What DeepSeek found

In the DeepSeek-R1 paper (DeepSeek-AI, 2025), the team took about 800,000 training samples curated with R1 (around 600,000 reasoning traces and 200,000 general ones) and fine-tuned six smaller open models on them: Qwen models at 1.5B, 7B, 14B and 32B parameters, and Llama models at 8B and 70B. They used plain SFT, with no RL on the small models.

The results were strong, even for the smallest. Here are the Qwen models on two maths benchmarks, as reported in the paper:

| Distilled model | AIME 2024 (pass@1) | MATH-500 (pass@1) |
|---|---|---|
| R1-Distill-Qwen-1.5B | 28.9% | 83.9% |
| R1-Distill-Qwen-7B | 55.5% | 92.8% |
| R1-Distill-Qwen-14B | 69.7% | 93.9% |
| R1-Distill-Qwen-32B | 72.6% | 94.3% |

Then came the experiment that matters most for this course. They also trained **Qwen-32B-Base with large-scale RL directly**, R1-Zero style, on maths, code and science data for over 10,000 steps, and compared it with the distilled 32B model:

| Same base size (32B) | AIME 2024 | MATH-500 | GPQA Diamond | LiveCodeBench |
|---|---|---|---|---|
| RL directly (R1-Zero-Qwen-32B) | 47.0% | 91.6% | 55.0% | 40.2% |
| Distilled from R1 (R1-Distill-Qwen-32B) | 72.6% | 94.3% | 62.1% | 57.2% |

Distillation won on every benchmark, and by a lot on the harder ones. The paper draws two conclusions:

1. Distilling a stronger model into a smaller one gives excellent results, while small models trained with large-scale RL need huge compute and may still not match distillation.
2. Distillation is economical, but to push past what today's best models can do, you probably still need stronger base models and larger-scale RL.

Why does RL struggle on small models? Remember how GRPO learns: it can only make good answers more likely if it *samples* some good answers in the first place. A small model rarely stumbles on a long, careful chain of reasoning by chance, so there's little for RL to reinforce. Distillation skips that search entirely: it hands the student the good chains directly.

## How many examples do you need?

800,000 samples sounds like a lot. Two 2025 papers asked whether far fewer would do, as long as they were chosen carefully.

**s1: Simple test-time scaling** (Muennighoff et al., 2025) built a dataset called **s1K**: just 1,000 questions with reasoning traces, selected for difficulty, diversity and quality. Fine-tuning Qwen2.5-32B-Instruct on it produced a model that, by the paper's report, beat OpenAI's o1-preview on competition maths questions by up to 27% (on MATH and AIME24). The paper also introduced **budget forcing**: to make the model think longer, append "Wait" when it tries to stop; to make it think shorter, cut it off. More thinking at test time gave better scores.

**LIMO: Less Is More for Reasoning** (Ye et al., 2025) went further. The first version of the paper reported 57.1% on AIME and 94.8% on MATH from just **817** carefully curated training samples; a later version reports 63.3% on AIME24 and 95.6% on MATH500. Their argument: a strong base model already *knows* a lot of maths from pre-training, and a small number of excellent examples is enough to show it how to use that knowledge in long reasoning.

Two cautions before you get excited:

- Both papers used **32B** models. A 0.5B model has much less knowledge to unlock, so tiny datasets may not go as far.
- "Carefully chosen" does real work here. These datasets were filtered hard for difficulty and quality. A thousand random traces is not the same thing.

## So which one should you use?

| Your situation | Good choice | Why |
|---|---|---|
| Small model, and good teacher traces exist for your kind of problem | **Distill first** | Fastest, cheapest, most reliable gain |
| No teacher, but answers are easy to check | **RL (GRPO)** | You only need a reward function |
| Small model scores near 0% on your task | **Distill (or simplify the task) first** | RL can't learn from groups where every answer is wrong |
| You want to beat the best available teacher | **RL** | Imitation tops out at the teacher's level |
| Teacher traces are very long and your budget is small | **Distill on short traces, then a length reward** | Students copy the teacher's habits, including rambling |

In practice the strongest recipes **combine** them. DeepSeek-R1 itself started with a small "cold start" SFT stage on readable long reasoning examples, *then* ran RL. A common pattern for small models is the same: distill to teach the habit of thinking, then run GRPO with a checkable reward to sharpen it on your exact task. The distilled student starts RL already getting some answers right, so GRPO has something to work with.

One more thing distillation passes on: **length**. A student trained on R1's traces learns to think like R1, at R1's length. If you care about cost, pick shorter traces or follow up with the length rewards from the last lesson.

## Key takeaways

- RL learns from the model's own attempts and a score; distillation learns from a teacher's finished answers, with a signal on every token.
- Classic distillation matches the teacher's soft probabilities (temperature controls how soft); reasoning-model distillation usually means SFT on the teacher's written traces.
- DeepSeek reported that distilling R1 into Qwen-32B beat running large-scale RL on Qwen-32B directly (for example 72.6% vs 47.0% on AIME 2024).
- s1 (1,000 examples) and LIMO (817 examples in its first version) showed that small, carefully chosen datasets can go a long way on strong 32B models.
- A good default for small models: distill first, then use RL with a checkable reward, and watch length.

## Next up

In **Lab: copy a big model's thinking into a small one**, you'll fine-tune Qwen2.5-0.5B-Instruct on reasoning traces from an open dataset, on a free Colab GPU, and measure what changes.
