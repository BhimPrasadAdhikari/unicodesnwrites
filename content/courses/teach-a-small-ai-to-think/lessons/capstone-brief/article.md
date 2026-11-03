# Capstone: train your own reasoning model

You've built rewards by hand, run GRPO on a toy, trained Qwen on maths word problems, read training curves, shortened thinking and copied a bigger model's reasoning. Now it's your turn to put it all together on a problem *you* choose, and to end up with something real: a model on Hugging Face with your name on it, and a short, honest write-up of what it learned.

**In this lesson** you'll get the full capstone brief: what to build, how to pick a good task, the starter repo that does the heavy lifting, six milestones from setup to sharing, exactly what to submit, and the rubric it's graded against. The next lesson walks through a complete worked example on the Countdown numbers game, so if you'd like to see one finished before starting your own, read that first.

## The brief in one paragraph

Pick a task with answers a computer can check. Measure how well a small open model (Qwen2.5-0.5B-Instruct by default) does on it. Train it with GRPO and a reward function you understand. Measure it again on puzzles it never saw during training, looking at accuracy *and* answer length. Share the trained model on Hugging Face with a short write-up that a curious non-expert could follow.

That's it. Everything below is about doing those five things well.

## Step zero: choose a task

The task is the most important decision you'll make. A good one has four properties:

| Property | Why it matters | Quick test |
|---|---|---|
| **Checkable** | GRPO needs a reward; a reward needs a right answer that code can verify | Can you write the checker in under 20 lines? |
| **Generatable** | You need thousands of training puzzles and a separate test set | Can a short function make a new puzzle with its answer? |
| **Not too hard, not too easy** | If the base model never gets one right, every group scores 0 and GRPO learns nothing; if it's always right, there's nothing to learn | Does the base model score somewhere between about 5% and 60%? |
| **Short answers** | Long answers are slow to generate on a free GPU | Does the final answer fit in a few tokens? |

The starter repo comes with three tasks that pass all four tests:

| Task | Example | Checked by |
|---|---|---|
| **Countdown** | "Using [20, 21, 7, 18], make 66." | Evaluating the equation safely and checking each number is used once |
| **Unit conversions** | "How many minutes are in 48.3 hours?" | Comparing the number within 1% |
| **Tiny logic puzzles** | "Jai is younger than Gita. Jai is older than Asha. Who is the youngest?" | Exact match on the name |

You can use one of these as is, change one (bigger numbers, more people, harder units), or write your own. Some ideas that work well: what day of the week it is N days from now, sorting a short list, simple date arithmetic, counting letters in a word, small Sudoku-style constraints, converting between number bases. Avoid tasks where "correct" is a matter of opinion (summaries, jokes, essays): there's no honest checker for those.

> If your task is new, run the base model on 50 puzzles before anything else. A starting accuracy of 0% is the most common reason a capstone run learns nothing.

## The starter repo

Download `starter-repo.zip` from the resources. It's plain Python files, with nothing hidden:

| File | What it does |
|---|---|
| `tasks/common.py` | The system prompt (`<think>` then `<answer>`), answer parsing and the format reward |
| `tasks/countdown.py`, `units.py`, `logic.py` | One task each: a dataset builder, a correctness reward, and which rewards to train with |
| `train.py` | GRPO with TRL and LoRA for any task, with flags for steps, group size, learning rate and length cap |
| `evaluate.py` | Accuracy, format rate and average length for one or more models on the test puzzles |
| `selftest.py` | A two-second CPU check that builders and rewards behave as expected |
| `rubric.md` | The grading rubric below, plus a checklist |

Every task file has the same three parts, so adding your own is mostly copying a file and changing two functions. `tasks/__init__.py` lists the available tasks; add yours there.

The repo targets `trl==1.16.0` and runs on a free Colab T4. Training uses LoRA and float16 automatically when the GPU has no bfloat16.

## Milestones

Work through these in order. Each one ends with something you can check, so you never spend two hours of GPU time on a run that was broken from the start.

| # | Milestone | Done when... | Rough time |
|---|---|---|---|
| **M0** | Set up | `python selftest.py` prints "All self-tests passed." on Colab | 15 min |
| **M1** | Choose and test your task | Your builder makes puzzles, your reward passes tests you wrote for at least 5 tricky answers (including one that tries to cheat) | 30–60 min |
| **M2** | Baseline | `evaluate.py` gives base-model accuracy, format rate and length on 200 test puzzles, and you've read 10 replies | 15 min |
| **M3** | Pilot run | A 50-step run finishes, and the reward curve is not flat at zero | 20–30 min |
| **M4** | Full run | 300+ steps; you've saved the reward and length curves | 1–2 hours |
| **M5** | Evaluate and share | Before/after table on the same test puzzles, three sample answers (one wrong), model uploaded with a model card | 45 min |

A few notes on the trickier milestones.

**M1: test your reward like an attacker.** Before trusting a reward, try to fool it. For Countdown, that means answers that use a number twice, skip a number, write only the target, or slip in Python code. A good reward gives all of those 0. Module 2 showed what happens when you skip this step.

**M3: the pilot run is cheap insurance.** Run `python train.py --task yourtask --max-steps 50`. In the log, check that `reward` moves, that `frac_reward_zero_std` (the share of groups where every answer got the same reward) isn't stuck near 1.0, and that `completions/clipped_ratio` (replies cut off at the length cap) isn't large. If any of these look wrong, fix the task or reward now.

**M4: save your curves.** You'll need them for the write-up. A screenshot of the logged table every 50 steps is fine.

## What to submit

1. **A Hugging Face model.** The LoRA adapter folder that `train.py` saves is enough. Its model card should say: the base model, your task, your rewards, the main training settings, and how to try it.
2. **A short write-up**, 300–800 words, on the model card or a page it links to. Use this outline:

| Section | What goes in it |
|---|---|
| **Task** | What the puzzles look like, and why they're checkable |
| **Reward** | What earns reward, in plain words, and a loophole you tested for |
| **Baseline** | Base-model accuracy, format rate and length on your test set, with the command |
| **Training** | Steps, group size, learning rate, length cap, and your reward and length curves |
| **Results** | Before/after table on the same test set, plus three real sample answers, one of them wrong |
| **Reflection** | What surprised you, one limitation, one next experiment |

## How it's graded

The rubric has five areas, each worth up to 4 points, for 20 in total. 14 is a pass, 18 is a distinction.

| Area | Full marks look like... |
|---|---|
| Task and reward | Checkable task, reward explained in plain words, a tested loophole described |
| Baseline | Accuracy, format rate and length on a fixed held-out set, with the command used |
| Training run | Model shared, settings listed, reward curve shown |
| Results, honestly | Before/after accuracy and length on the same held-out set, three samples including a failure, and what you think changed |
| Reflection | A surprise, a limitation and a concrete next experiment |

Three hard rules: test puzzles must not appear in training (the builders use a separate seed for the test split), every number you report must come from a run you actually did (label anything else "illustrative"), and the model card must name the base model.

Notice what's *not* in the rubric: a minimum accuracy. A run that improved from 8% to 15% and is reported honestly, with a thoughtful explanation of what limited it, scores higher than a 90% claim with no baseline and no samples.

## If you get stuck

| Symptom | Likely cause | Try |
|---|---|---|
| Reward flat at 0 | Base model never gets one right, or the checker is too strict | Easier puzzles; read 10 replies; test the checker on correct answers |
| Reward rises, accuracy doesn't | A loophole in the reward | Read replies with high reward; tighten the checker |
| Out of memory | Too long or too many completions | `--max-completion-length 192` or `--num-generations 4` |
| Replies keep getting longer | Length drift | Lower the length cap; add a gentle length reward from module 7 |
| Accuracy drops late in training | Overtraining or collapse | Use an earlier checkpoint (saved every 100 steps) |

## Key takeaways

- The capstone is five things: a checkable task, a baseline, a GRPO run, an honest re-measure, and a shared model with a write-up.
- Pick a task that's checkable, generatable, neither too hard nor too easy for the base model, and has short answers.
- Use the milestones to catch problems early: self-test, reward attack tests, baseline, a 50-step pilot, then the full run.
- Submit a Hugging Face model plus a 300–800 word write-up; it's graded on a 20-point rubric that rewards honesty over high scores.

## Next up

In **Capstone walkthrough: a worked example, start to finish**, you'll follow the whole process on the Countdown task, from the first self-test to the final write-up.
