# The nudge: making good answers more likely

You now know how to score an answer. But a score is just a number on a screen. How does "that answer got 1.0" actually change the model, so that next time it is a little more likely to answer that way? The answer is one small, elegant rule, first written down by Ronald Williams in 1992, and it sits at the heart of every method in this course, from our four-answer toy all the way to DeepSeek-R1.

**In this lesson** you will see a model as a probability machine, learn what it means to "nudge" it toward a good answer, work through a nudge with real numbers, and find out why the size of the nudge (the learning rate) and the comparison point (the baseline) matter so much. You will also play with the nudge yourself in an interactive widget. No calculus needed: every step is shown in words and small tables first.

## A model is a probability machine

When a language model answers, it does not pick one fixed answer. It gives every possible next token a probability and then samples from those probabilities, like rolling a weighted die. Ask it the same question twice and you can get different answers.

Let us shrink that down to something you can hold in your head. Imagine a model answering "What is 3 + 4?" that can only choose between four answers:

| Answer | Probability |
|---|---|
| `7` | 10% |
| `8` | 60% |
| `6` | 20% |
| `no idea` | 10% |

This model has a bad habit: it says `8` most of the time. Our job is to change those probabilities so that `7` wins. That is all "training" means here: **changing the probabilities.**

## Logits: the dials behind the probabilities

The model does not store probabilities directly. It stores one raw score per answer, called a **logit**, and turns them into probabilities with a function called **softmax**.

Think of logits as volume dials, one per answer. Softmax looks at all the dials together and shares out 100% of the probability: louder dials get a bigger share. Two things follow:

- Turning up one dial gives that answer a bigger share.
- Because the shares must add up to 100%, **every other answer's share goes down a little**, even if you did not touch its dial.

| Logits (dials) | Probabilities after softmax |
|---|---|
| 0, 0, 0, 0 | 25%, 25%, 25%, 25% |
| 1, 0, 0, 0 | 48%, 17%, 17%, 17% |
| 3, 0, 0, 0 | 87%, 4%, 4%, 4% |

Training nudges the dials. Softmax takes care of the rest.

## The nudge, in words

Here is the whole rule, in plain language:

> **Sample an answer. If it scored better than usual, turn its dial up. If it scored worse than usual, turn its dial down. The surprise decides the size.**

Three pieces make that precise:

1. **Advantage.** How much better (positive) or worse (negative) than usual was this answer? "Usual" is called the **baseline**. For now, think of it as the average score.
2. **Direction.** To make answer *k* more likely, push its dial up and every other dial down a bit, in proportion to how likely each already is. In symbols that direction is `onehot(k) − probs`: +1 for the chosen answer, minus the current probability of everything.
3. **Step size.** How far to move the dials in one go. This is the **learning rate**.

Put together, the update is:

```
new dials = old dials + learning_rate × advantage × (onehot(k) − probs)
```

That is REINFORCE (Williams, 1992). The Tiny Adder toy uses exactly this rule, with one table of dials per sum, and so does GRPO, with a clever choice of baseline.

## A nudge with real numbers

Let us run the rule once on our model above, with a learning rate of 0.5. Suppose the model happened to sample `7`, and `7` scored 1 point better than usual (advantage = +1).

**Step 1: the direction.** `onehot(7)` is (1, 0, 0, 0). Subtract the current probabilities (0.1, 0.6, 0.2, 0.1):

| | `7` | `8` | `6` | `no idea` |
|---|---|---|---|---|
| onehot | 1 | 0 | 0 | 0 |
| − probs | −0.1 | −0.6 | −0.2 | −0.1 |
| = direction | **+0.9** | **−0.6** | **−0.2** | **−0.1** |

**Step 2: scale it.** Multiply by learning rate × advantage = 0.5 × 1 = 0.5. The dials move by +0.45, −0.30, −0.10, −0.05.

**Step 3: softmax again.**

| | `7` | `8` | `6` | `no idea` |
|---|---|---|---|---|
| before | 10% | 60% | 20% | 10% |
| after | **18%** | 51% | 21% | 11% |

`7` nearly doubled. Notice that `8`, the most likely wrong answer, took the biggest dial cut: the direction pushes down hardest on whatever was soaking up the most probability.

### What if the rewarded answer was already likely?

Now suppose instead the model sampled `8` and it somehow scored above usual (advantage +1). The direction for `8` is only 1 − 0.6 = +0.4, so its dial moves less:

| | `7` | `8` | `6` | `no idea` |
|---|---|---|---|---|
| before | 10% | 60% | 20% | 10% |
| after | 9% | **66%** | 16% | 9% |

The rule is naturally modest about answers the model already likes: when an answer's probability is near 100%, `1 − probability` is near zero, and the nudge almost vanishes. Rare answers that turn out well get the most noticeable boost.

### And a bad answer?

If `8` scored *worse* than usual (advantage −1), the same direction is flipped. Its dial goes down by 0.2 and the others go up, so `8` drops from 60% to 53% and the other answers share the difference. A negative advantage is just as informative as a positive one.

## Try it: the policy nudge widget

Open the **policy nudge** visualization in this lesson. You will see four candidate answers with their probabilities. Click to reward one and watch the softmax shift. Use the learning rate slider to change the step size.

Things to try:

- Reward the least likely answer, then the most likely one. Which one moves more?
- Set a tiny learning rate and click ten times. Then set a huge one and click once.
- Keep rewarding the same answer. How quickly does it reach nearly 100%? Can the other answers ever come back?

## The learning rate: how big a nudge?

The learning rate is the most important knob you will turn in this course. Here is the same single nudge (rewarding `7` from an even 25% start, advantage +1) at three learning rates:

| Learning rate | `7` after one nudge | What it feels like |
|---|---|---|
| 0.5 | 36% | A gentle, sensible step |
| 2 | 71% | A big leap from one example |
| 10 | almost 100% | Total certainty from a single lucky sample |

Too small, and learning takes forever. Too big, and the model leaps to conclusions from one sample. Worse, once an answer reaches nearly 100%, the model almost never samples anything else, so it never discovers whether the alternatives might be better. This is called **collapse**, and you will learn to spot it on training curves in Module 6.

## Why "better than usual" and not just "good"?

Why do we use advantage (score minus baseline) instead of the raw score?

Imagine a grader that gives every answer at least 10 points just for trying, plus a bit extra for good ones. Every raw score is big and positive, so every sampled answer, even a wrong one, gets its dial turned up. The right answer still gets slightly more, but the signal is buried under noise. Whichever answer happens to be sampled most early on snowballs.

Subtract the average, and the "points for trying" cancel out. Only *better than usual* gets pushed up, and *worse than usual* gets pushed down. You will measure this effect yourself in the next lab: with "+10 for everyone" and no baseline, the toy often locks onto a wrong answer; with a baseline, the +10 makes no difference at all.

| Raw scores in a batch | Average (baseline) | Advantages |
|---|---|---|
| 11.5, 10.5, 10.5, 10.0 | 10.6 | +0.9, −0.1, −0.1, −0.6 |

GRPO's key idea, coming in Module 4, is choosing the baseline cleverly: the average score of a **group** of answers to the same question.

## You cannot reward what you never try

One more consequence of the rule: an answer only gets nudged if it is **sampled**. If the model gives the right answer a 0.001% chance, it will almost never try it, never see it rewarded, and never learn it. This is why we start from a model that already gets *some* GSM8K questions right, and why we sample several answers per question: more tries, more chances to stumble on something good.

## From four answers to a whole paragraph

A real answer is not one choice but hundreds: one token after another. The probability of a whole answer is built from the probabilities of each of its tokens. When an answer scores above usual, the nudge is applied to **every token in that answer**, each one made a little more likely in its context. Over thousands of questions, tokens that tend to appear in good answers ("so", "first", "let me check") get turned up, and habits that lead to wrong answers get turned down. That is how a score at the end of a paragraph shapes the thinking that came before it.

## Key takeaways

- A model is a probability machine; training changes the probabilities by adjusting logits (dials) that softmax turns into probabilities summing to 100%.
- The nudge: sample an answer, compute its advantage (score minus baseline), and move the dials by learning rate × advantage × (onehot − probs). This is REINFORCE (Williams, 1992).
- The rule pushes rare good answers up noticeably, barely moves answers already near 100%, and pushes down below-average answers.
- The learning rate sets the step size: too small is slow, too large leaps to conclusions and can collapse.
- Using a baseline cancels "points for everyone", so only better-than-usual answers are pushed up; GRPO uses a group's average as that baseline.

## Next up

In **Lab: REINFORCE from scratch in numpy** you will write this rule in about 70 lines of Python, train the four-answer model to say `7`, and measure exactly how much the baseline matters.
