# Lab: teach Qwen to solve maths word problems

"Natalia sold clips to 48 of her friends in April, and then she sold half as many clips in May. How many clips did Natalia sell altogether in April and May?" A ten-year-old can do it. A half-billion-parameter language model, asked politely, often gets lost: it skips steps, forgets the question, or writes a nice explanation that ends with the wrong number.

In this lab you will take that model and, with nothing but a rule that checks the final number, make it better at these problems. No worked solutions are copied into it. It learns from its own attempts, the way the Tiny Adder did, on a free GPU in about an hour.

**In this lesson** you will run the module 5 notebook end to end, as a case study of a complete GRPO project: a baseline on held-out questions, a smoke test, a full training run, curves, a second evaluation, reading real answers, and saving your model. Along the way you will learn what to look at at each stage, what results are reasonable to expect from a run this small, and how to write up what happened honestly.

## The project at a glance

| Stage | Notebook section | Time on a free T4 (estimate) | What you get |
|---|---|---|---|
| Setup | 1–3 | a few minutes | GPU check, pinned libraries, `train_grpo.py` |
| Smoke test | 4 | about 5 minutes | proof that everything runs |
| Baseline | 5 | about 5 minutes | accuracy and format rate *before* training |
| Training | 6 | roughly an hour | a LoRA adapter, checkpoints, logs |
| Curves | 7 | seconds | nine training plots |
| After + examples | 8 | a few minutes | answers side by side |
| Save / share | 9–10 | a few minutes | a merged model, optionally on the Hub |

The times are estimates from the batch sizes and typical T4 speeds, not measurements. Your run will differ, mostly because answer length changes during training, and generation time grows with it.

## Stage 1: the baseline is your control group

Scientists do not test a medicine without a control group. Your control group is the untrained model, scored on the same 200 GSM8K test questions you will use after training.

The evaluation reports two numbers:

| Number | Meaning | What it can tell you |
|---|---|---|
| `accuracy` | share of answers whose number inside `<answer>` equals GSM8K's final number | the real goal |
| `format_rate` | share of answers in the exact `<think>…</think><answer>…</answer>` shape | whether the model follows instructions |

A subtle point: our accuracy only counts an answer if the number is inside `<answer>` tags. So a model that solves the problem but ignores the format scores zero. That is deliberate (it matches the training reward), but it means the baseline partly measures "can it follow our format?" rather than pure maths ability. Keep that in mind when you compare before and after: some of the improvement may come from format alone.

Write both numbers down before you train. Do not skip this step. Without a baseline, any "after" number is meaningless.

## Stage 2: the smoke test

Ten training steps and 16 evaluation questions. The numbers mean nothing. You are checking only that the model downloads, the rewards run without errors, memory fits and an adapter is saved. Spending five minutes here can save you from an out-of-memory crash 40 minutes into the real run.

## Stage 3: the real run

TRL prints a line of metrics every 5 steps. It looks intimidating; here is how to read it on day one.

| Metric | What it is | What to hope for over the run |
|---|---|---|
| `rewards/format_reward/mean` | average format reward (max 0.5) | rises, often early and fast |
| `rewards/correctness_reward/mean` | average correctness reward (max 1.0) | drifts upward, slowly and noisily |
| `reward` | the sum of both | drifts upward |
| `completions/mean_length` | average answer length in tokens | changes; watch that it does not slam into 256 |
| `frac_reward_zero_std` | share of groups where all 8 answers scored the same | not stuck near 1.0 |
| `kl` | distance from the starting model | small and slowly rising |

Expect noise. Each step uses only 2 questions, so one easy question can make a single step look brilliant and the next look awful. Judge the trend over 20 or 30 steps, not single lines. The plotting cell draws a rolling average for exactly this reason.

### What a typical run looks like (illustrative)

We will not promise you specific numbers; they depend on the random seed, the library versions and luck with the questions sampled. But the *shape* of a healthy small run tends to follow a pattern like this:

| Phase | What usually happens |
|---|---|
| Early | Format reward climbs as the model learns to use the tags consistently. Correctness wobbles. |
| Middle | With the format settled, correctness reward slowly rises. Fewer groups are all-wrong. |
| Late | Gains flatten. Length settles at whatever the model finds useful within 256 tokens. |

This is illustrative, not a measurement. Module 6 shows what healthy and broken versions of each curve look like in detail.

## Stage 4: after, and reading real answers

When training ends, the script evaluates the trained adapter on the same 200 test questions. Put the numbers in your table:

| | accuracy | format rate |
|---|---|---|
| before | *your number* | *your number* |
| after 250 steps | *your number* | *your number* |

Then go to notebook section 8, which prints three test questions with the model's answer before and after. Read them slowly. Numbers tell you *how much* changed; answers tell you *what* changed. Look for:

- **Is the thinking real?** Does the `<think>` block contain steps that lead to the answer, or filler like "Let me think about this" followed by a guess?
- **Is the arithmetic right?** Small models often set up the problem correctly and then miscompute 48 / 2.
- **Did it game the format?** For example, an empty `<think></think>` block. The format reward accepts any non-empty text, so it can be satisfied with very little thinking.
- **Is it cut off?** An answer that stops mid-sentence hit the 256-token limit.

### What to make of your result

Here is how to interpret common outcomes honestly:

| What you see | Likely story |
|---|---|
| Format rate up a lot, accuracy up a little | The model learned the format; maths improved modestly. Normal for 250 steps on a 0.5B model. |
| Both up clearly | A good run. Check the examples to confirm the thinking is genuine. |
| Format up, accuracy flat or down | Format is easier to learn and may have dominated. Try more steps, or a smaller format weight. |
| Neither changed | Learning rate too low, or almost all groups were all-same. Check `frac_reward_zero_std` and the reward curves (module 6). |
| Training reward up, test accuracy down | Possible reward hacking or overfitting. Read the answers. |

Remember what the *DeepSeek-R1* paper (DeepSeek-AI, 2025) found: for small models, distilling reasoning from a much larger model beat running RL on the small model directly. So do not expect a 0.5B model to become a maths whiz in an hour. The point of this lab is to run the full GRPO pipeline yourself and learn to judge it. Module 8 covers distillation.

## Stage 5: save and share

The training run saved a **LoRA adapter**: a small folder of extra weights that only works on top of the original Qwen model. Section 9 merges the adapter into the base model and saves a standalone copy that anyone can load with two lines:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained("qwen-gsm8k-grpo-merged")
```

Section 10 can upload it to the Hugging Face Hub. You log in with your own access token (typed into the login box, never into code), and the cell creates a **private** repository by default. If you make it public, add a short model card: base model, data (GSM8K), method (GRPO with format and correctness rewards, 250 steps, LoRA), your before/after numbers, and the fact that it is a learning project. Honest model cards are a good habit.

Colab deletes files when the session ends. Upload the model or download the folder before you close the tab.

## Write it up: a five-line lab report

A good habit from research: record every run, even disappointing ones.

1. **Setup:** model, steps, group size, learning rate, beta, max length.
2. **Before / after:** accuracy and format rate on 200 test questions.
3. **Curves:** one sentence each on reward, length and the fraction of all-same groups.
4. **Examples:** one answer that improved, one that did not.
5. **Next change:** one knob you would change, and why.

You will use this exact format in the capstone.

## Key takeaways

- A complete GRPO project has stages: baseline, smoke test, training, curves, held-out evaluation, reading answers, saving. Skipping the baseline makes any result meaningless.
- Judge noisy metrics by their trend over many steps. With 2 questions per step, single values jump around.
- Our accuracy counts only answers in `<answer>` tags, so part of any improvement can be format alone; read real answers to see what changed.
- Small models gain modestly from short RL runs; report your numbers honestly, including the disappointing ones.

## Next up

Your curves are on screen, but what do they mean? In **What healthy training looks like**, you will learn to read reward, length, KL, entropy, clipping and the fraction of all-same groups like a doctor reads a chart.
