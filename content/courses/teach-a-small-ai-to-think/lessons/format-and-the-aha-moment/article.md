# Format, length and the "aha" moment

Somewhere in the middle of training, DeepSeek-R1-Zero stopped halfway through a maths problem and wrote: "Wait, wait. Wait. That's an aha moment I can flag here." Then it went back and checked its own working. Nobody had shown it an example of checking. Nobody had told it to say "wait". It had only ever been given problems, a simple template and a score.

That line became one of the most quoted moments in AI in 2025. It is also a good example of why you should read the follow-up papers too, because some of the story turned out to be more ordinary than it first looked.

**In this lesson** you'll see the simple template and the two rewards that DeepSeek used to train R1-Zero, what happened to answer length and accuracy as it trained, and what the "aha moment" really was. Then we look at a 2025 critique, *Understanding R1-Zero-Like Training: A Critical Perspective* (Liu et al., the "Dr. GRPO" paper), which showed that part of the famous growth in answer length came from a small bias in how GRPO averages its loss, not from deeper thinking. By the end you'll know which knobs in your own training run control this.

## The template: a box for working, a box for the answer

R1-Zero started from a *base* model: one that has read a lot of text but was never taught to chat or follow instructions. To get it to produce something gradable, DeepSeek wrapped every problem in a short template. In plain words, it said:

> A conversation between a user and an assistant. The assistant first thinks about the reasoning, then gives the answer. The reasoning goes inside `<think> </think>` tags and the answer inside `<answer> </answer>` tags.

That's it. No examples of good reasoning, no "show your working like this". The template only says *where* the thinking goes, not *how* to think. The DeepSeek-R1 paper (DeepSeek-AI, 2025) says they kept it this minimal on purpose, so they could watch what the model would do on its own.

A reply that follows the template looks like this:

```text
<think>
17 + 25: 17 + 20 is 37, plus 5 is 42.
</think>
<answer>42</answer>
```

Think of it like an exam paper with two boxes printed on it: a big one labelled "working" and a small one labelled "final answer". The examiner only marks the small box, but they also check you used the boxes.

## Two rewards, both checked by plain code

R1-Zero was graded by two rules, nothing more:

| Reward | Question it asks | How it's checked |
|---|---|---|
| **Accuracy** | Is the final answer right? | For maths, compare the answer in the required format with the known answer. For code, run test cases. |
| **Format** | Did the reply put its thinking in the `<think>` tags? | A pattern match on the text. |

The paper explains why they did *not* use a neural "reward model" (a second AI that scores answers): at large scale, the policy learns to fool it. This is reward hacking, which you met in module 2. Rules written in code are much harder to fool, as long as they are written carefully.

Here's a format reward in the shape Hugging Face TRL expects, with a quick test. It is strict: the whole reply must be one think block followed by one answer block.

```python
import re

FORMAT_RE = re.compile(r"^\s*<think>.*?</think>\s*<answer>.*?</answer>\s*$", re.DOTALL)

def format_reward(completions, **kwargs):
    return [1.0 if FORMAT_RE.match(c) else 0.0 for c in completions]

print(format_reward([
    "<think>17 + 20 = 37, + 5 = 42</think>\n<answer>42</answer>",  # follows the template
    "The answer is 42.",                                          # no tags
    "<answer>42</answer>",                                        # skipped the thinking
]))
# [1.0, 0.0, 0.0]
```

Why reward format at all, if only the answer matters? Two reasons. It makes the answer easy to find, so the accuracy check is reliable. And it gives a weak model *something* it can get right early on, before it solves many problems.

## What happened as R1-Zero trained

DeepSeek reported two curves that moved together.

**Accuracy went up a lot.** On AIME 2024, a hard competition maths test, R1-Zero's pass@1 (the share of problems right on a single try) rose from 15.6% at the start to 71.0% by the end. With majority voting over many samples it reached 86.7%.

**Answers got longer.** The paper describes the model's "thinking time" growing steadily through training, from hundreds of reasoning tokens to thousands. Nobody rewarded length. The reward only cared about the final answer and the tags. The model simply found that longer working led to more right answers, so longer working got reinforced.

Open the interactive below to see the shape of this. The chart is **illustrative**: it shows the pattern the paper describes, not DeepSeek's exact data.

| Stage of training (illustrative) | Typical reply | Accuracy |
|---|---|---|
| Early | A few lines, often a guess | Low |
| Middle | Longer working, some re-checking | Rising |
| Late | Long working, tries another method, checks the result | High |

## The "aha moment"

The paper highlights one intermediate checkpoint where the model, mid-solution, flagged an "aha moment" in the words quoted at the top of this lesson, and then re-evaluated its first approach. DeepSeek presented this as a sign that self-reflection *emerged* from reinforcement learning: nobody programmed it, the score alone pulled it out.

It's a lovely story, and there is a lot of truth in it. The reward really did push the model toward behavior that helps: trying again, checking, changing method. But two questions are worth asking:

1. Was this behavior truly *new*, or was it already in the base model, waiting to be reinforced?
2. Is all of the length growth "deeper thinking", or could some of it come from the training method itself?

## The critique: Dr. GRPO

In 2025, Liu and colleagues published *Understanding R1-Zero-Like Training: A Critical Perspective*. They looked closely at both questions.

**On the aha moment:** they report that base models, including DeepSeek-V3-Base itself, already show "aha"-style self-reflection *before* any reinforcement learning. So RL didn't invent the behavior. It found it among the many things the base model could already say, and made it more common. That is still useful, but it is a different story from "reasoning emerged from nothing".

**On length:** they found an optimization bias in GRPO that artificially makes responses longer, especially *wrong* ones. It comes from one small detail: how the loss is averaged.

### Where the bias comes from, in words first

In the original GRPO loss, each sampled answer's total push is **divided by its own length**. Every token in a reply shares that reply's advantage, and the reply's contribution is averaged over its tokens.

Now think about what that does:

- A **correct** answer has a positive advantage. Divide it across fewer tokens and each token gets a bigger push. So among correct answers, *short ones are favored*.
- A **wrong** answer has a negative advantage. Spread that penalty across more tokens and each token is punished less. So among wrong answers, *long ones get off lighter*.

Here's a tiny **illustrative** table. Every answer has the same size of advantage, only the length differs:

| Answer | Advantage | Length (tokens) | Push per token after dividing by length |
|---|---|---|---|
| Correct, short | +1.0 | 10 | +0.100 |
| Correct, long | +1.0 | 100 | +0.010 |
| Wrong, short | −1.0 | 10 | −0.100 |
| Wrong, long | −1.0 | 100 | −0.010 |

The wrong-and-long answer is punished ten times more gently per token than the wrong-and-short one. Over thousands of steps, the model drifts toward rambling when it's unsure. Some of the "growing thinking" is this drift, not better reasoning.

The same paper points to a second, smaller bias: dividing advantages by the group's standard deviation gives extra weight to questions that are very easy or very hard (where nearly all answers agree, so the standard deviation is tiny).

### The fix

Dr. GRPO ("GRPO done right") removes both:

- Instead of dividing each answer by its own length, divide by a **fixed constant** (for example the maximum completion length), so a token counts the same whether it sits in a short or a long reply.
- **Don't divide** advantages by the group standard deviation; just subtract the group mean.

With these changes, the authors report better token efficiency (fewer wasted tokens, especially on wrong answers) while keeping reasoning performance. Their minimal recipe reached 43.3% on AIME 2024 with a 7B base model.

DAPO (ByteDance Seed, 2025) attacked the same length problem slightly differently, averaging over *all* tokens in the batch instead of per answer.

## What this means for your training runs

You don't need to rewrite GRPO. Hugging Face TRL exposes these choices as options in `GRPOConfig`. In TRL 1.16:

| Option | Values | What it controls |
|---|---|---|
| `loss_type` | `"grpo"`, `"dapo"` (default), `"dr_grpo"`, and others | How token losses are averaged. `"grpo"` is the original per-answer average; TRL's own docs warn that it has the length bias described above. |
| `scale_rewards` | `"group"` (default), `"batch"`, `"none"` | Whether advantages are divided by a standard deviation, and which one. `"none"` follows Dr. GRPO. |
| `max_completion_length` | a number of tokens | The hard cap on reply length. |

A Dr. GRPO-style setup looks like this:

```python
from trl import GRPOConfig

config = GRPOConfig(
    output_dir="out",
    loss_type="dr_grpo",     # divide by a constant, not by each answer's length
    scale_rewards="none",    # subtract the group mean only
    max_completion_length=512,
)
```

Three habits to take away:

1. **Track length and accuracy together.** Rising length with flat accuracy is a warning sign, not an aha moment. TRL logs `completions/mean_length` and `completions/mean_terminated_length` for you.
2. **Look at the length of wrong answers separately.** If wrong answers grow much faster than right ones, suspect the bias.
3. **Read the replies.** A real re-check ("let me verify: 37 + 5 = 42") looks different from filler that repeats itself.

None of this means long thinking is bad. On hard problems, more working really does help, and that's the whole idea behind reasoning models. The point is that length is a *cost*, and you want to pay it only when it buys accuracy. The next lesson shows how to make the model think shorter on purpose.

## Key takeaways

- R1-Zero used a minimal template (`<think>` then `<answer>`) and two rule-based rewards: accuracy and format. No neural reward model, to avoid reward hacking.
- DeepSeek reported accuracy rising sharply (AIME 2024 pass@1 from 15.6% to 71.0%) while answers grew from hundreds to thousands of tokens, plus an "aha moment" of self-reflection.
- The Dr. GRPO paper (Liu et al., 2025) found that base models already show aha-style reflection, and that GRPO's per-answer length normalization artificially lengthens answers, especially wrong ones.
- In TRL you choose the averaging with `loss_type` (`"dr_grpo"`, `"dapo"`, or the original `"grpo"`) and the standard-deviation scaling with `scale_rewards`.
- Always watch length next to accuracy, and read real replies before you celebrate.

## Next up

In **Making thinking shorter (and cheaper)** you'll write reward functions that pay the model for being right *and* concise: a length penalty, a token budget, and DAPO's soft overlong punishment.
