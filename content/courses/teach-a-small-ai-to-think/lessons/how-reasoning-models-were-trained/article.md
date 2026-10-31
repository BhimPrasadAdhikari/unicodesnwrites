# How R1-style reasoning models were trained

In January 2025, a lab in Hangzhou published a paper with an unusually bold claim: you can get a language model to reason, to write long careful working, re-check itself and fix its mistakes, without ever showing it a single example of careful working. You just give it problems with checkable answers, score its attempts, and let reinforcement learning do the rest. The paper was *DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning* (DeepSeek-AI, 2025), and it is the blueprint for this course.

**In this lesson** we walk through the paper in plain language: the two models it describes (R1-Zero and R1), the two simple rewards behind them, the "aha moment", the four-stage recipe for the final model, and the finding that matters most for anyone with a small GPU: distillation beat reinforcement learning on small models. Download the **R1 paper map** cheat sheet to keep beside you as you read.

## The paper at a glance

The paper describes two models and a family of small ones. It helps to keep them apart from the start.

| Model | One-line description |
|---|---|
| **DeepSeek-R1-Zero** | Pure reinforcement learning on a base model. No worked examples first. The proof of concept. |
| **DeepSeek-R1** | The polished model: a small warm-up on readable examples, then reinforcement learning, then more fine-tuning and a final round of RL. |
| **R1-Distill models** | Small Qwen and Llama models fine-tuned on answers written by R1. |

Both R1-Zero and R1 start from **DeepSeek-V3-Base**, a large "base" model: one that has read a huge amount of text but has not yet been taught to follow instructions or chat.

## R1-Zero: learning to reason from scores alone

### The setup

The idea is simple enough to fit in a paragraph. Take maths and coding problems whose answers a computer can check. Give the model a fixed template that says, in effect: *think first, inside `<think>` tags, then give the answer inside `<answer>` tags.* Let the model attempt each problem many times. Score every attempt. Make the high-scoring attempts more likely next time. Repeat for thousands of steps.

Notice what is missing: nobody writes example reasoning for the model to copy. The template only says *where* to think, not *how*.

### The two rewards

R1-Zero is scored with just two rules, both checked by ordinary code:

| Reward | What it checks | Example |
|---|---|---|
| **Accuracy** | Is the final answer right? | For maths, compare the final answer with the known answer; for code, run test cases |
| **Format** | Is the thinking inside `<think>…</think>`? | A pattern match on the text |

The authors deliberately did **not** use a neural reward model (another AI trained to judge answers). Their reason: at large scale, the model being trained may find ways to fool a learned judge, a problem called **reward hacking**, and retraining the judge adds cost and complexity. Rule-based rewards are cheap and hard to fool. You will write both rewards yourself in Module 2, and study reward hacking in its own lesson.

### The algorithm: GRPO in one paragraph

The reinforcement learning method is **GRPO**, Group Relative Policy Optimization, introduced a year earlier in *DeepSeekMath* (Shao et al., 2024). For each question, the model writes a **group** of several answers. Each answer is scored. Answers that beat the group's average get pushed up; answers below average get pushed down. Older methods such as PPO also train a second "critic" model to predict how good an answer will be; GRPO skips that and uses the group average instead, which saves a lot of memory. Modules 3 and 4 build this up from scratch.

| | **PPO (older)** | **GRPO** |
|---|---|---|
| How it judges "better than expected" | A separate critic model predicts it | The average score of a group of answers to the same question |
| Extra model in memory | Yes | No |
| Good fit for checkable rewards | Yes | Yes, and simpler |

### What happened

Three things stood out as R1-Zero trained.

**1. Accuracy climbed a long way.** On AIME 2024, a hard competition maths test, R1-Zero's single-answer accuracy (pass@1) rose from 15.6% to 71.0% during training, as reported in the paper. With majority voting over many answers, it reached 86.7%.

**2. Answers got longer on their own.** Nobody rewarded length. But over training, the average response length kept growing: the model learned that spending more tokens on thinking led to more right answers. Open the **length and aha** visualization in this lesson to see the shape. The chart is **illustrative**: it reproduces the pattern the paper describes, not the paper's exact data.

**3. The "aha moment".** At an intermediate checkpoint, the authors noticed the model stopping mid-solution to write something like "Wait, wait. Wait. That's an aha moment I can flag here", and then re-evaluating its approach. Re-checking was never taught. It appeared because, sometimes, re-checking led to a right answer, and right answers were rewarded.

Things to try in the **length and aha** visualization:

- Find the point where length starts rising. Does accuracy rise before, after or together with it?
- Look at the marked aha moment. Is it at the start of the run, or after the length has already begun to climb?

### What went wrong

R1-Zero reasoned well but read badly. Its working was often hard for people to follow, and it mixed languages, switching between English and Chinese mid-thought. Nothing in its rewards cared about readability, so it did not get any. This is a lesson you will see again and again in the course: **the model optimizes exactly what you reward, and nothing else.**

## R1: the four-stage recipe

To keep R1-Zero's reasoning but fix its readability, the authors built a longer pipeline.

| Stage | What happens | Why |
|---|---|---|
| **1. Cold start** | Fine-tune the base model on thousands of long, readable worked solutions | Give RL a clean, readable starting style |
| **2. Reasoning RL** | GRPO on maths, code and logic, with accuracy and format rewards plus a **language consistency** reward (the share of the thinking written in the target language) | Build the reasoning skill without language mixing |
| **3. Rejection sampling + fine-tuning** | Generate many answers, keep the good ones (about 600k reasoning samples), add about 200k general samples (writing, questions, translation), fine-tune for two epochs | Lock in good behavior and add general skills |
| **4. RL for all scenarios** | Another RL round: rule-based rewards for reasoning, reward models for helpfulness and harmlessness | Polish the final assistant |

Two details are worth noticing. First, the language consistency reward slightly lowered benchmark scores in the authors' tests, but they kept it because the output was much more readable. Rewards are trade-offs. Second, by stage 4 they do use reward models, but only for general behavior, not for the maths and code where rule-based checks are available.

## Distillation: the finding for small GPUs

Here is the part of the paper that shapes this course most.

The authors took R1's answers and used them to fine-tune smaller open models: Qwen2.5-Math-1.5B and 7B, Qwen2.5-14B and 32B, Llama-3.1-8B and Llama-3.3-70B-Instruct. This is **distillation**: a big "teacher" writes answers, a small "student" learns to copy them.

Then they asked the obvious question: what if we skip the teacher and run large-scale RL directly on a small model? They trained Qwen-32B-Base with RL for over 10,000 steps and compared:

| Qwen-32B trained by… | AIME 2024 pass@1 | MATH-500 |
|---|---|---|
| RL directly (R1-Zero style) | 47.0 | 91.6 |
| Distillation from R1 | 72.6 | 94.3 |

*Numbers as reported in the paper.*

Distillation won on every benchmark they tried. Their conclusion, in short: distilling a powerful model into a small one works very well, while getting a small model to the same level with RL alone takes enormous compute and may still fall short.

So why does this course spend Modules 3 to 7 on RL? Three reasons:

1. **You do not always have a teacher.** For a new task, a niche skill or your own data, there may be no big reasoning model to copy from.
2. **RL is how the teacher was made.** Understanding distillation without understanding RL is like understanding photocopies without understanding writing.
3. **They combine.** Module 8 shows how to distill first and then polish with RL, which is roughly what R1 itself did in miniature.

## What did not work

The paper includes a short, honest section on unsuccessful attempts, which is rare and useful.

- **Process reward models** (scoring every step, not just the final answer): it is hard to define what a "step" is, hard to know if a middle step is right, and the model being trained tends to hack the step-grader.
- **Monte Carlo Tree Search** (exploring branches of reasoning like a chess engine): the number of possible next tokens is vastly larger than the number of chess moves, so the search gets out of hand.

The lesson: simple outcome rewards, checked by code, beat cleverer schemes at this scale.

## How to read the paper yourself

If you open the paper, here is a reading order that works for beginners:

1. **Abstract and introduction.** The claims in two pages.
2. **R1-Zero section.** The template, the rewards and the training curves. Look for the length chart and the aha example.
3. **R1 section.** The four stages. Skim the details; keep the table above in mind.
4. **Distillation section and discussion.** The 32B comparison and unsuccessful attempts.
5. **Benchmarks tables.** Last, and lightly. They are impressive but tell you least about *how* it works.

## Key takeaways

- DeepSeek-R1 (DeepSeek-AI, 2025) showed that R1-Zero could learn long, self-checking reasoning from pure reinforcement learning with two rule-based rewards: accuracy and format.
- GRPO (Shao et al., 2024) scores a group of answers to the same question and pushes up the ones above the group average, with no critic model.
- R1-Zero's answers grew longer on their own and showed an "aha moment", but its output was hard to read and mixed languages, so R1 added a cold start, a language consistency reward and extra stages.
- On small models, distillation from R1 beat RL directly (72.6 vs 47.0 on AIME 2024 for Qwen-32B, as reported), which is why this course covers both.

## Next up

In **Verifiable rewards: grading without a teacher** you will dig into the heart of R1-Zero: how to score an answer automatically, and why "checkable" is the magic ingredient.
