# Verifiable rewards: grading without a teacher

A maths teacher with a stack of 300 test papers does not need to understand every student's thinking to mark them. If the answer key says 18 and the student wrote 18, it gets a tick. That simple idea, *an answer you can check without a person*, turns out to be the secret ingredient of reasoning models. It is what let DeepSeek train R1-Zero on millions of attempts without a single human grader in the loop.

**In this lesson** you will learn what a reward is, what makes a reward "verifiable", the two rewards behind R1-style training (format and correctness), the design choices hiding inside each one, and what verifiable rewards cannot see. You will also grade answers yourself in an interactive grader and watch the scores change as you edit.

## What a reward is

In reinforcement learning, a **reward** is a number that says how good an attempt was. That is all the model gets. It never sees the right answer. It never gets an explanation. It just gets a score, and over many attempts it learns to do more of whatever scored well.

Think of it like a game of "hot and cold". The person hiding the object never tells you where it is. They only say "warmer" or "colder", and that is enough for you to find it, as long as their answers are honest and consistent.

A **reward function** is the small program that hands out those scores. In this course it takes the model's answer and returns a number, usually between 0 and 1.

## What makes a reward verifiable

A reward is **verifiable** when a short, reliable program can decide the score, with no human and no other AI involved. That needs two things: a clear right answer, and an easy way to compare the model's answer against it.

| Task | Verifiable? | How you would check it |
|---|---|---|
| Grade-school maths (GSM8K) | Yes | Compare the final number with the number after `####` |
| Writing code | Yes, mostly | Run the code against test cases |
| Sudoku or other puzzles | Yes | Check every row, column and box follows the rules |
| Converting units ("5 km in metres") | Yes | Compare with the exact conversion |
| Writing a poem | No | "Good" is a matter of taste |
| Giving life advice | No | No single right answer to compare with |
| Summarizing an article | Partly | You can check length and key facts, not quality |

Training with checkable rewards like these has a name: **reinforcement learning with verifiable rewards**, often shortened to RLVR. The term was popularized by the Tülu 3 report (Lambert et al., 2024), and it is the family of methods that DeepSeek-R1 (DeepSeek-AI, 2025) used for maths and code.

### Why verifiable beats "ask another AI"

The alternative is a **reward model**: a separate neural network trained to predict how much a person would like an answer. That is how chat assistants learn to be helpful. But for training reasoning, it has two big problems:

1. **It can be fooled.** The model being trained is searching hard for anything that scores well. If the judge has blind spots, it will find them. This is called **reward hacking**, and it gets its own lesson next.
2. **It is expensive.** A reward model is another big model to run on every answer.

A verifiable reward has neither problem. Code that compares two numbers has no blind spots to exploit (as long as you write it carefully) and costs almost nothing to run. That is why the R1 authors chose rule-based rewards for reasoning.

## The two rewards behind R1-style training

### 1. The format reward

We ask the model to answer in a fixed shape:

```
<think> She has 16 - 3 - 4 = 9 eggs. 9 × $2 = $18. </think>
<answer> 18 </answer>
```

The **format reward** checks that shape: is the working inside `<think>` tags, and the final answer inside `<answer>` tags?

Why bother? Three reasons:

- **The grader knows where to look.** In the hello GPU notebook, grading by "the last number in the reply" sometimes picked the wrong number. With answer tags, the grader never has to guess.
- **Thinking gets its own space.** The model is free to explore, make mistakes and correct them inside `<think>`, while the answer stays clean.
- **It is easy to learn.** A beginner model gets the format right long before it gets maths right, so the format reward gives it something to learn from on day one.

### 2. The correctness reward

The **correctness reward** checks the thing we actually care about: is the final answer right? For GSM8K that means:

1. Pull out the text inside `<answer>…</answer>`.
2. Turn it into a number (so `$18.` and `18` and `18.0` all become 18).
3. Compare it with the gold number after `####`.
4. Score 1 if they match, 0 if not.

### Putting them together

When you use several reward functions, the trainer adds their scores together. The weights matter. Here is a sensible starting point:

| Answer | Format (×0.5) | Correct (×1.0) | Total |
|---|---|---|---|
| Tidy and right | 0.5 | 1.0 | **1.5** |
| Right but no tags | 0.0 | 0.0* | **0.0** |
| Tidy but wrong | 0.5 | 0.0 | **0.5** |
| Messy and wrong | 0.0 | 0.0 | **0.0** |

\* *With our grader, no answer tags means no answer to check, so correctness is 0 too.*

Notice the order: being right always beats being tidy. If you made format worth more than correctness, the fastest way to a high score would be tidy nonsense.

## Try it: the reward grader

Open the **reward grader** in this lesson. You will see a model answer with two live scores: format and correctness. Edit the answer and watch the scores change.

Try these, and predict the scores before you look:

- Delete the closing `</answer>` tag.
- Change `18` to `$18.00`.
- Write `18 or 26` inside the answer tags.
- Remove everything inside `<think>` so it reads `<think></think>`.
- Put the answer block *before* the think block.

Some of these will surprise you. Every surprise is a decision someone has to make when writing a reward function. That is the heart of the next lesson's lab.

## The design choices hiding inside a "simple" check

Even "compare two numbers" hides decisions. Here are the main ones you will face.

| Decision | Strict choice | Lenient choice | Trade-off |
|---|---|---|---|
| Format partly right | 0 unless perfect | Partial credit per correct tag | Strict is clean but gives a beginner nothing to learn from; lenient helps learning start but opens loopholes |
| Answer has extra words ("18 dollars") | 0 | Extract the number | Lenient is usually right for maths |
| Answer has several numbers | 0 | Take the last one | Lenient can reward "18 or 26" style hedging |
| `18.0` vs `18` | Exact text match fails | Compare as numbers | Compare as numbers |
| Empty thinking | Format 0 | Format 1 | Strict stops "skip the thinking" shortcuts |

There is no universally right answer. The rule of thumb: **be lenient about decoration, strict about substance.** Accept `$18.` as 18; do not accept two answers as one.

## Why a score of zero is a problem

Here is a subtle point that matters a lot for small models. If a model gets *every* attempt at a question wrong, all its scores are 0. Nothing scored better than anything else, so there is nothing to learn from that question. Learning needs **contrast**: some attempts better than others.

| Group of 8 attempts | Scores | Anything to learn? |
|---|---|---|
| All wrong | 0 0 0 0 0 0 0 0 | No: no attempt beat another |
| Two right | 1 0 0 1 0 0 0 0 | Yes: push the two right ones up |
| All right | 1 1 1 1 1 1 1 1 | No: the question is already solved |

This is why the format reward is so useful early on. Even when the maths is all wrong, some attempts are tidier than others, so the model still has something to learn. It is also why we pick a model and dataset where the model gets *some* questions right to begin with. GSM8K and Qwen2.5-0.5B are a good match.

## What verifiable rewards cannot see

Verifiable rewards grade the *outcome*, not the *reasoning*. That has consequences:

- **Lucky guesses get full marks.** If the working is nonsense but the final number happens to be right, the score is 1.
- **Good reasoning with a slip gets zero.** Five perfect steps and a copying error in the last one score the same as no effort at all.
- **Readability is invisible.** R1-Zero's working became hard to read and mixed languages because nothing in its reward cared.

Over many thousands of questions, the lucky guesses and unlucky slips mostly wash out: the habits that *usually* lead to right answers still win. But it is worth remembering that a verifiable reward is a narrow window onto what you really want.

## Key takeaways

- A reward is just a number saying how good an attempt was; the model never sees the right answer, only the score.
- A reward is verifiable when a short program can decide it reliably, which is true for maths, code and puzzles but not for poems or advice.
- R1-style training uses two verifiable rewards: format (are the think and answer tags right?) and correctness (is the final answer right?), with correctness worth more.
- Learning needs contrast: if every attempt scores the same, there is nothing to learn, which is why format rewards and a well-matched dataset matter early on.
- Verifiable rewards grade outcomes, not reasoning, so they can reward lucky guesses and ignore readability.

## Next up

In **Lab: write your own reward functions** you will turn this lesson into about 90 lines of Python, test it on tricky sample answers, and find a loophole hiding in a reward that looks strict.
