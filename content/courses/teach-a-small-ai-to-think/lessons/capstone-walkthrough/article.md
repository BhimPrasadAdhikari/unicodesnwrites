# Capstone walkthrough: a worked example, start to finish

The Countdown numbers game has been on British television since 1982. Contestants get a handful of numbers and a target, and 30 seconds to reach the target with plus, minus, times and divide. It's a lovely reasoning task for a small model: easy to explain, impossible to answer by memory, and every answer can be checked by a computer in a microsecond.

In this lesson we take it through the whole capstone, one milestone at a time, exactly as you'll do with your own task. Where you see output from code that runs on any computer, it's real. Where a step needs a GPU, we show you the commands, what to look for, and a sample write-up whose numbers are clearly marked **illustrative**, so you can see the shape of a good submission without being handed numbers to copy.

**In this lesson** you'll follow the worked example from setup to sharing: running the self-test, understanding the Countdown task file line by line (see the code walkthrough), taking a baseline, a pilot run, the full GRPO run with TRL, reading the curves, re-measuring honestly, and writing it up. You'll also see one real bug we found in our own checker while writing this lesson, and how a test caught it.

## M0: set up and self-test

On a free Colab T4, unzip the starter repo, install the pinned libraries and run the self-test:

```bash
!unzip -q starter-repo.zip -d . && %cd starter-repo
!pip install -q -r requirements.txt
!python selftest.py
```

The self-test needs no GPU, so you can also run it on your laptop. It checks every dataset builder and reward, and ends like this:

```text
ok  test_format_reward
ok  test_countdown
ok  test_units
ok  test_logic
ok  test_score_and_file_mode
[20, 21, 7, 18] -> 66   e.g. (((20 + 7) + 21) + 18)
[11, 17, 16, 4] -> 96   e.g. (((11 + 17) * 4) - 16)
[14, 2, 4, 5] -> 21   e.g. (((5 + 4) + 14) - 2)
All self-tests passed.
```

## M1: the task and its reward

### How puzzles are made

You don't need a list of Countdown puzzles. The builder in `tasks/countdown.py` makes them on the spot, and every one is solvable by construction. In words:

1. pick four random numbers from 1 to 25,
2. shuffle them and chain them together with random operations,
3. if the result is a whole number between 1 and 100, that's the target, and the chain is one valid solution; otherwise, try again.

Because we built the answer ourselves, we never generate an impossible puzzle. Test puzzles come from a different random seed, so they're different from the training ones.

### How answers are checked

The model replies in our usual format: thinking in `<think>` tags, then an equation in `<answer>` tags. The correctness check works like a strict referee:

| Check | Example that fails it |
|---|---|
| The answer is only whole numbers, `+ - * /` and brackets | `__import__('os')`, `2 ** 5`, `7.5 * 2` |
| Every given number is used exactly once | `20 + 21 + 18` (forgot the 7), `20 + 21 + 18 + 7 + 7` (used 7 twice) |
| No dividing by zero | `7 / (5 - 5) + 3` |
| The result equals the target | `20 + 7 + 21 - 18` |

The equation is never run with Python's `eval`. Instead, it is parsed into a tree with Python's `ast` module, and a small function walks the tree, allowing only numbers and the four operations. Anything else is rejected. Fractions are used for the arithmetic, so `7 / 2 * 2` is exactly 7, with no rounding surprises.

Two rewards are combined: a **format reward** (1.0 if the reply uses the tags correctly) with weight 0.5, and the **correctness reward** with weight 1.0. Being right counts twice as much as neat tags. Running `python tasks/countdown.py` grades four sample replies to the first puzzle:

```text
numbers [20, 21, 7, 18]  target 66  (one solution: (((20 + 7) + 21) + 18))
numbers [11, 17, 16, 4]  target 96  (one solution: (((11 + 17) * 4) - 16))
numbers [14, 2, 4, 5]  target 21  (one solution: (((5 + 4) + 14) - 2))
format 1  correct 1  total 1.5  <- <think>try adding</think><answer>(((20 + 7) + 21) + 18)</answer>
format 1  correct 0  total 0.5  <- <think>close enough</think><answer>20 + 21 + 18</answer>
format 1  correct 0  total 0.5  <- <think>use 7 twice</think><answer>20 + 21 + 18 + 7 + 7</answer>
format 0  correct 0  total 0.0  <- The answer is 20 + 7 + 21 + 18
```

### A bug our own test caught

While writing this lesson we tried one more answer: `66 = 20 + 7 + 21 + 18`. It's a perfectly valid solution, written the other way round. Our checker marked it **wrong**, because it only looked at the left side of the `=`, and `66` alone doesn't use the four numbers.

That's a *false negative*: a correct answer scored 0. It's the mirror image of reward hacking, and it's harmful in a quieter way: GRPO would push the model *away* from a correct style of answer. Digging in, we also found that a side with a leading space, like `" 20 + 7"`, makes Python's parser complain about indentation. The second fix is in the starter repo; the first is the second exercise in this lesson. The lesson for your own task: write tests with *correct* answers in unusual forms, not only with cheating ones.

## M2: the baseline

Before training, measure the base model on 200 test puzzles:

```bash
!python evaluate.py --task countdown --runs base=Qwen/Qwen2.5-0.5B-Instruct
```

`evaluate.py` prints a table with accuracy, format rate, and average length in words and tokens, and saves every reply to `samples_base.jsonl`. **Read at least ten of those replies.** For Countdown, look for: does the model use the tags? Does it use every number? Does it do the arithmetic right but break the rules, or break the arithmetic?

You can also score replies without a GPU. `evaluate.py --completions` grades a file of saved answers against the test puzzles. With four handwritten answers to the first four test puzzles (two correct, one rule-breaking, one with no tags), it prints:

```text
run           accuracy   format   words  tokens
file             50.0%    75.0%      12       -
```

That's handy for checking your grader before spending any GPU time.

## M3: a 50-step pilot

```bash
!python train.py --task countdown --max-steps 50
```

TRL logs a table every 5 steps. In the pilot, you only want to know whether learning *can* happen:

| Log column | Healthy sign in a pilot | Worry if... |
|---|---|---|
| `reward` | Wobbly but drifting up | Flat at 0 or flat at the maximum |
| `frac_reward_zero_std` | Clearly below 1.0 | Near 1.0: almost every group scored all the same, so no signal |
| `completions/mean_length` | Stable or changing slowly | Shooting up toward the cap |
| `completions/clipped_ratio` | Small | Large: many replies hit `max_completion_length` and get cut off |

If the reward is stuck at zero, the usual cause for Countdown is that the base model ignores the "use each number exactly once" rule. Options: make puzzles easier (three numbers instead of four, by changing `n_numbers`), or check a few replies to make sure the tags are being produced.

## M4: the full run

```bash
!python train.py --task countdown --max-steps 300
```

The key settings in `train.py`, explained in the code walkthrough:

| Setting | Value | Why |
|---|---|---|
| Group size `num_generations` | 8 | Enough answers per puzzle for a meaningful group average |
| Completions per update | 16 (8 per device × 2 accumulation steps) | Two puzzles per update, each with a group of 8 |
| `learning_rate` | 1e-5 | Gentle, since GRPO with LoRA can overshoot |
| `max_completion_length` | 256 tokens | Plenty for a Countdown answer; keeps the T4 fast |
| `beta` | 0.0 | No KL leash, as in recent recipes (TRL's default) |
| `loss_type` | `"dapo"` | TRL's default; avoids GRPO's per-answer length bias |
| `mask_truncated_completions` | True | Cut-off replies don't count as ordinary failures |
| LoRA | rank 16, all linear layers | Fits a T4 and saves a small adapter |

On a T4, 300 steps takes roughly one to two hours (an estimate; it depends mostly on how long the replies are). Checkpoints are saved every 100 steps, so if the curve dips late, you can evaluate an earlier one.

## M5: re-measure and share

Same test puzzles, same settings, both models side by side:

```bash
!python evaluate.py --task countdown --runs base=Qwen/Qwen2.5-0.5B-Instruct trained=outputs/countdown
```

Then upload the adapter with the snippet in the starter repo's README and write the model card.

## A sample write-up (illustrative)

Here's the shape of a strong submission. **Every number below is illustrative**, invented to show the format. Your numbers will be different, and only yours belong in your write-up.

> **Task.** Countdown with four numbers (1–25) and a target from 1 to 100. Answers are equations checked by a safe parser: each number used exactly once, only `+ - * /`, result equal to the target.
>
> **Reward.** 0.5 × format (think and answer tags) + 1.0 × correctness. I tested the checker on 10 cheating answers (reused numbers, missing numbers, just the target, Python code) and all scored 0. I also found that `66 = …` (target first) was wrongly rejected, and fixed it.
>
> **Baseline and results** (200 held-out puzzles, greedy decoding; *illustrative numbers*):
>
> | Model | Accuracy | Format | Avg tokens |
> |---|---|---|---|
> | Qwen2.5-0.5B-Instruct | 6% | 41% | 180 |
> | + GRPO, 300 steps | 24% | 97% | 140 |
>
> **What changed.** Format improved within the first 50 steps; accuracy rose slowly after that. Replies got shorter as the model stopped writing long explanations outside the tags. Sample failure: for target 4 from [22, 12, 7, 23], it wrote `23 - 22 + 12 - 7`, which is 6: right idea, wrong arithmetic.
>
> **Reflection.** I was surprised how fast the format was learned compared with accuracy. Limitation: one run, one seed. Next: try three-number puzzles first as a curriculum, then four.

Notice what makes it strong: a clear task, a tested reward, before *and* after on the same held-out set, length as well as accuracy, a real failure explained, and an honest limitation.

## Key takeaways

- A task that is solvable by construction (build the solution, then the puzzle) never produces impossible training examples.
- Check answers with a safe parser, not `eval`, and test the checker with both cheating answers and correct answers in unusual forms.
- Run the self-test, a baseline and a 50-step pilot before the full run; read replies at every stage.
- Watch `reward`, `frac_reward_zero_std`, `completions/mean_length` and `completions/clipped_ratio` to judge whether a run is healthy.
- A strong write-up reports before/after accuracy and length on the same held-out set, with real samples, including a failure.

## Next up

That's the end of the course material. Your turn: pick your task, work through the milestones, and share your model. We'd love to see what you build.
