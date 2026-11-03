# Lab: write your own reward functions

Every reinforcement learning run has a moment of truth, and it comes before training starts: the moment you decide what counts as a good answer. Get the reward wrong and the model will spend hours of GPU time learning exactly the wrong thing, very efficiently. The good news is that reward functions are tiny. The two you need fit in under 100 lines of plain Python, and you can test them on your laptop in a second.

**In this lab** you will read and run `rewards.py`, a small file with a format reward and a correctness reward in the exact shape Hugging Face TRL expects. You will grade six hand-written answers, find a loophole in a reward that looks strict, and fix it. Everything runs on a normal CPU with only the Python standard library. You can follow along in the code walkthrough on this page, or open the **Rewards lab notebook** in Colab.

## The plan in pictures

Before any code, here is what the file does, step by step:

| Step | Plain words | Function |
|---|---|---|
| 1 | Get the text out, whatever shape it arrives in | `completion_text` |
| 2 | Find the gold number after `####` | `gold_from_gsm8k` |
| 3 | Find what the model put inside `<answer>` | `extract_answer` |
| 4 | Turn messy text like `$1,200.` into a number | `parse_number` |
| 5 | Score the shape: are the tags right? | `format_reward`, `soft_format_reward` |
| 6 | Score the substance: is the number right? | `correctness_reward` |
| 7 | Add the scores, correctness worth more | `total_reward` |

And here is the one rule every function follows, because it is what TRL's `GRPOTrainer` expects: **take a list of completions, return a list of numbers, one per completion.**

```
["<think>…</think><answer>18</answer>", "The answer is 18.", …]
                     ↓ reward function
[1.0, 0.0, …]
```

## Step 1: three search patterns

A **regular expression** (regex) is a tiny pattern language for searching text. You do not need to master it. You only need to read three patterns:

```python
FORMAT_PATTERN = re.compile(r"^\s*<think>.+?</think>\s*<answer>.+?</answer>\s*$", re.DOTALL)
ANSWER_PATTERN = re.compile(r"<answer>(.*?)</answer>", re.DOTALL)
NUMBER_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")
```

| Pattern piece | Means |
|---|---|
| `^` and `$` | The start and the end of the whole text |
| `\s*` | Any amount of spaces or line breaks (including none) |
| `.+?` | One or more of any character, as few as possible |
| `(.*?)` | Capture whatever is here so we can pull it out |
| `-?\d+(?:\.\d+)?` | An optional minus sign, some digits, and optionally a decimal part |
| `re.DOTALL` | Let `.` match line breaks too, because thinking spans many lines |

So `FORMAT_PATTERN` reads: "from the very start, optional spaces, a think block, optional spaces, an answer block, optional spaces, and then the very end."

## Step 2: helpers that never crash

Early in training, most answers are messy. Some have no tags at all. A reward function that crashes on a messy answer stops your whole run, so every helper handles the bad case quietly:

```python
def extract_answer(text):
    """Return what is inside <answer>...</answer>, or None if the tags are missing."""
    match = ANSWER_PATTERN.search(text)
    return match.group(1).strip() if match else None


def parse_number(text):
    """Pull the last number out of a string: '$1,200.' -> 1200.0. None if there is none."""
    if text is None:
        return None
    numbers = NUMBER_PATTERN.findall(text.replace(",", ""))
    return float(numbers[-1]) if numbers else None
```

`parse_number` makes a deliberate choice: it removes commas and keeps the **last** number. So `$18.`, `18 dollars` and `18.0` all become 18. That follows the rule from the last lesson: be lenient about decoration. Keep an eye on "keeps the last number", though. It comes back to bite us in the exercises.

There is one more helper, `completion_text`. TRL passes completions as plain strings for ordinary datasets, but as a list of chat messages (`[{"role": "assistant", "content": "…"}]`) for chat-style datasets. This helper turns both into a string, so nothing else has to care.

## Step 3: the two rewards

The strict format reward is one line:

```python
def format_reward(completions, **kwargs):
    """1.0 if the completion is exactly <think>...</think><answer>...</answer>, else 0.0."""
    return [1.0 if FORMAT_PATTERN.match(completion_text(c)) else 0.0 for c in completions]
```

The `**kwargs` is important. TRL calls every reward function with extra keyword arguments: the prompts, every dataset column, and a few more. If your function does not accept them, it crashes. `**kwargs` means "accept anything else and ignore it".

The correctness reward uses one of those extra arguments on purpose. Our dataset has a column called `answer` holding the GSM8K solution, and TRL passes it in by name:

```python
def correctness_reward(completions, answer, **kwargs):
    scores = []
    for c, gold in zip(completions, answer):
        predicted = parse_number(extract_answer(completion_text(c)))
        target = parse_number(gold_from_gsm8k(gold))
        is_right = predicted is not None and target is not None and abs(predicted - target) < 1e-6
        scores.append(1.0 if is_right else 0.0)
    return scores
```

Why `abs(predicted - target) < 1e-6` instead of `==`? Computers store decimals slightly imprecisely, so `0.1 + 0.2 == 0.3` is actually `False` in Python. Comparing with a tiny tolerance avoids that trap.

There is also a **soft** format reward that gives 0.25 for each of the four tags that appears exactly once. A brand new model rarely produces the perfect shape, so the strict reward gives it almost nothing to learn from at first. Partial credit hands out small steps toward the goal.

## Step 4: run it

From the `code` folder, run:

```bash
python rewards.py
```

The demo grades six hand-written answers to the eggs question (gold answer 18). This is the real output:

```
sample            format   soft  correct  total
tidy and right      1.00   1.00     1.00   1.50
right, with $       1.00   1.00     1.00   1.50
tidy but wrong      1.00   1.00     0.00   0.50
right, no tags      0.00   0.00     0.00   0.00
tags twice          1.00   0.50     1.00   1.50
chat message        1.00   1.00     1.00   1.50
```

Read it row by row:

| Row | What happened | Is that what we want? |
|---|---|---|
| tidy and right | Full marks | Yes |
| right, with `$` | `$18.` parsed as 18 | Yes: lenient about decoration |
| tidy but wrong | Format bonus only | Yes: tidy is worth something, right is worth more |
| right, no tags | 0 everywhere, even though "18" is in the text | Yes: no answer tags, no answer to grade |
| **tags twice** | **Strict format still gives 1.0** | **No!** |
| chat message | Works the same as a string | Yes |

## Step 5: the loophole

Look again at `tags twice`:

```
<think>hmm</think><answer>18</answer><answer>18</answer>
```

The answer block appears twice, yet the "strict" format reward gave it full marks. Why? Because `.+?` means "as few characters as possible, *but as many as needed to make the whole pattern match*". The pattern must reach the end of the text (`$`), so `.+?` simply stretches over `18</answer><answer>18` to get there. The pattern is satisfied. The rule we *meant*, "one answer block", is not.

Only the soft reward noticed, because it counts tags: `<answer>` appears twice, so those two tags earn nothing and the score drops to 0.50.

This might look harmless here, since both answers say 18. But imagine a model that learns to write `<answer>18</answer><answer>26</answer>`. With a grader that picks the first answer block, and a format reward that does not mind, the model gets two guesses for the price of one. Models under training pressure find tricks like this, and they find them fast. The cure is to find them first, by testing your reward on strange inputs before training.

## Step 6: test like an attacker

Here is a short checklist of inputs worth throwing at any reward function before you trust it:

| Test input | What you are checking |
|---|---|
| Perfect answer | It gets full marks (obvious, but check!) |
| No tags at all | Returns 0, does not crash |
| Duplicate tags | Does not get extra credit |
| Empty or whitespace-only `<think>` | Does it count as "thinking"? Decide on purpose |
| Tags in the wrong order | Should not pass the format check |
| Several numbers in the answer | Does the grader reward hedging? |
| Numbers with `$`, commas, `.0` | Parsed as the same number |
| Chat-format completion | Works the same as a plain string |

The exercises on this page walk you through fixing two of these: duplicate tags and hedged answers.

## How this plugs into training

You will not train anything in this lab, but it helps to see where these functions end up. In Module 5 you will pass them straight to TRL:

```python
from trl import GRPOConfig, GRPOTrainer

trainer = GRPOTrainer(
    model="Qwen/Qwen2.5-0.5B-Instruct",
    reward_funcs=[format_reward, correctness_reward],
    args=GRPOConfig(output_dir="out"),
    train_dataset=dataset,  # needs a "prompt" column and an "answer" column
)
```

TRL calls each reward function on every batch of completions and adds the scores together, or takes a weighted sum if you set `reward_weights` in the config. That is exactly what `total_reward` in our file imitates, with correctness worth 1.0 and format worth 0.5.

## Key takeaways

- A TRL reward function takes a list of completions (plus keyword arguments such as dataset columns) and returns one number per completion; always accept `**kwargs`.
- Helpers must handle messy answers quietly, returning `None` or 0 instead of crashing.
- Be lenient about decoration (`$18.` is 18) and strict about substance (one answer, in one answer block).
- A reward that looks strict can hide a loophole: the lazy `.+?` let duplicate answer blocks through. Test rewards on strange inputs before training.

## Next up

In **When rewards go wrong: reward hacking** you will watch a model exploit a buggy reward live in the browser, and learn the warning signs that tell you it is happening in a real run.
