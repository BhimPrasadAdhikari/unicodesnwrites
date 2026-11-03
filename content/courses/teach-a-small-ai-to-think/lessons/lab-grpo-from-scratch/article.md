# Lab: GRPO from scratch on Tiny Adder

The algorithm behind DeepSeek-R1 fits in under 100 lines. Not a simplified cousin of it: the same loop of *ask, sample a group, grade, compare, nudge*. The only thing we shrink is the model. Instead of a billion-parameter network, our model is a lookup table that has to learn single-digit addition from nothing but "right" or "wrong".

**In this lesson** you will build `grpo_tiny_adder.py`, a complete GRPO trainer in plain numpy that runs on any laptop in a few seconds. You will read it piece by piece in the code walkthrough, run it, and read its training log line by line. Then you will break it on purpose with a buggy reward and watch reward hacking happen in front of you. The same file powers the live training-run visualization on this page.

## The toy: Tiny Adder

Tiny Adder answers questions like "What is 7 + 5?" where both numbers are single digits (0 to 9). The answer is always between 0 and 18, so there are 19 possible answers.

Its whole "brain" is a table of scores called **logits**: one row for each of the 100 possible questions, one score for each of the 19 answers. Softmax turns a row of scores into probabilities (bigger score, more likely answer). Every score starts at zero, so at the start every answer is equally likely: the model guesses at random and is right about 1 time in 19 (5%).

| Question | Score for 0 | … | Score for 12 | … | Score for 18 |
|---|---|---|---|---|---|
| 7 + 5 | 0 | … | 0 | … | 0 |
| 3 + 4 | 0 | … | 0 | … | 0 |

Training should raise the score of 12 in the "7 + 5" row, and of 7 in the "3 + 4" row, and so on, using only the grader's verdicts. Nobody ever tells the model the answer.

> Why a table and not a neural network? A table has no shared knowledge, so we can watch each idea of GRPO in isolation, and the whole run takes seconds on a CPU. Everything you learn here carries over to the real model in the next module; only the "nudge" step becomes backpropagation through a network.

## The recipe, in plain words

One training step:

1. Pick 16 random questions (the **batch**).
2. For each question, sample `G = 8` answers from the current table (the **group**).
3. Grade each answer: 1 if it equals the true sum, else 0.
4. Turn the eight rewards into **advantages**: subtract the group's mean, divide by its spread.
5. **Nudge** that question's row: raise the scores of answers with positive advantage, lower those with negative advantage. Average the nudge over the group.
6. Optionally, pull the row back toward the starting table (the **KL leash**, strength `beta`), and, if you reuse the batch for several inner steps (`ppo_epochs`), **clip** answers that already moved enough.

Repeat 200 times. Every step, measure three things over all 100 questions:

| What we log | Plain meaning | Healthy direction |
|---|---|---|
| reward | share of the batch's sampled answers the grader liked | up |
| accuracy | the model's chance of giving the *true* sum, averaged over all 100 questions | up |
| entropy | how spread out the answers are (about 2.94 = pure guessing, 0 = always the same answer) | down, gradually |

Notice that **reward** is measured by the grader and **accuracy** by the truth. Usually they agree. When they disagree, something is wrong with the grader. Keep that in mind for later.

## The code

Open the code walkthrough next to this article. Here is the full update for one question, the heart of the file:

```python
def grpo_update(row, ref_row, ks, adv, lr, beta, eps, ppo_epochs):
    """Update one prompt's logits from its group of sampled answers ks."""
    p_old = softmax(row)  # the policy that produced the samples
    for _ in range(ppo_epochs):
        p_new = softmax(row)
        step = np.zeros(N_ANSWERS)
        for k, A in zip(ks, adv):
            ratio = p_new[k] / p_old[k]  # 1.0 on the first inner step
            clipped = (A > 0 and ratio > 1 + eps) or (A < 0 and ratio < 1 - eps)
            if not clipped:  # outside the trust region the gradient is zero
                onehot = np.eye(N_ANSWERS)[k]
                step += ratio * A * (onehot - p_new)
        step /= len(ks)  # average over the group
        # KL leash, kept simple: pull the logits straight back toward the reference.
        # (A stand-in for the exact KL gradient; same idea, easier to read.)
        step -= beta * (row - ref_row)
        row = row + lr * step
    return row
```

Read it as a sentence: *for each sampled answer `k` with advantage `A`, push answer `k`'s score up by `A` and every answer down a little in proportion to its current probability (`onehot - p_new`), unless clipping says stop; average over the group; pull back toward the reference; take a step of size `lr`.*

The `onehot - p_new` part is the nudge you derived in module 3: it is exactly how much each score should change to make answer `k` more likely. With the default `ppo_epochs=1`, the loop runs once, the ratio is exactly 1, and clipping never fires, so the update is plain REINFORCE with a group baseline, as in the course spec.

The training loop just wires the six recipe steps together:

```python
for _ in range(batch):
    a, b = rng.integers(0, 10, size=2)
    ks = rng.choice(N_ANSWERS, size=G, p=softmax(L[a, b]))  # the group
    rs = [reward(a, b, k, buggy) for k in ks]
    L[a, b] = grpo_update(L[a, b], L_ref[a, b], ks, advantages(rs),
                          lr, beta, eps, ppo_epochs)
```

And `train(G=8, lr=0.5, beta=0.0, eps=0.2, steps=200, batch=16, buggy=False, seed=0)` returns one dictionary per step with the step number, reward, accuracy and entropy, so you can plot it.

## Run it

You need Python 3 and numpy, nothing else:

```bash
python grpo_tiny_adder.py
```

Here is the real output with the default settings (seed 0):

```text
== Honest reward (k == a + b) ==
step    1  reward 0.086  accuracy 0.05  entropy 2.944
step   25  reward 0.086  accuracy 0.07  entropy 2.939
step   50  reward 0.141  accuracy 0.11  entropy 2.911
step   75  reward 0.141  accuracy 0.18  entropy 2.800
step  100  reward 0.328  accuracy 0.30  entropy 2.555
step  125  reward 0.422  accuracy 0.46  entropy 2.148
step  150  reward 0.664  accuracy 0.62  entropy 1.650
step  175  reward 0.750  accuracy 0.74  entropy 1.214
step  200  reward 0.859  accuracy 0.84  entropy 0.849
```

On a normal laptop the 200 steps take a couple of seconds.

## Reading the log

**Steps 1 to 50: the slow start.** Reward and accuracy barely move from the 5% you get by guessing. Remember the silent groups from the advantages lesson: when the model guesses uniformly, about 65% of groups of eight contain no right answer at all, so they have zero advantage and teach nothing. Learning only happens on the lucky groups.

**Steps 50 to 175: take-off.** Once a question's row has a slightly raised score for the right answer, the right answer gets sampled more often, which makes more groups informative, which raises it further. This feedback loop gives the classic S-shaped curve. Real GRPO runs on language models often look like this too, which is why a flat first stretch is not automatically a failure.

**Entropy falls as accuracy rises.** At the start the model spreads its bets across 19 answers (entropy 2.94). By step 200 it is fairly confident (0.85). This is healthy: it is becoming sure *because it is right*. If you train longer, it keeps going: at step 400 our run reaches reward 0.96, accuracy 0.98 and entropy 0.17.

**Reward and accuracy move together.** The grader and the truth agree. Hold on to that picture.

The numbers vary a little with the random seed (seed 1 ends at reward 0.883, accuracy 0.84), but the shape is the same.

## Break it on purpose: the buggy reward

Now swap in a broken grader. With `buggy=True`, the reward function gives 1 to *any even number*, regardless of the question:

```python
def reward(a, b, k, buggy=False):
    """1 for the right sum. The buggy grader rewards any even number instead."""
    if buggy:
        return 1.0 if k % 2 == 0 else 0.0
    return 1.0 if k == a + b else 0.0
```

Real output from the same run:

```text
== Buggy reward (any even number) ==
step    1  reward 0.547  accuracy 0.05  entropy 2.944
step   25  reward 0.641  accuracy 0.05  entropy 2.936
step   50  reward 0.648  accuracy 0.05  entropy 2.919
step   75  reward 0.633  accuracy 0.05  entropy 2.895
step  100  reward 0.758  accuracy 0.05  entropy 2.866
step  125  reward 0.734  accuracy 0.05  entropy 2.834
step  150  reward 0.719  accuracy 0.05  entropy 2.799
step  175  reward 0.828  accuracy 0.05  entropy 2.764
step  200  reward 0.812  accuracy 0.05  entropy 2.729
```

The reward climbs from about 0.55 (10 of the 19 answers are even, so a random guesser already scores well) to 0.81, and keeps rising if you train longer (0.91 at step 400). By the reward chart alone, training is going great.

The accuracy column says otherwise: **stuck at 0.05, pure chance, the whole time.** The model has learned to say even numbers, which is exactly what we paid it for, and nothing about addition. This is **reward hacking**: the model optimizes the score you wrote, not the goal you meant. GRPO did its job perfectly; the grader was the bug.

The lesson for real runs: **always track at least one number the model is not trained on.** In the next module that will be accuracy on held-out GSM8K questions, checked by you, separately from the training reward.

## Play with it live

The training-run visualization on this page runs this exact algorithm in your browser (ported to JavaScript, so the random numbers, and therefore the exact values, differ slightly from Python). It has four presets, all real runs:

| Preset | Settings | What you should see |
|---|---|---|
| healthy | `G=8, lr=0.5, beta=0` | the slow start, then the S-curve; reward and accuracy rise together |
| stuck | `G=2` | most groups are all-wrong, so advantages are zero and learning stalls near chance |
| hacking | `buggy=True` | reward climbs, accuracy stays flat at about 0.05 |
| tight leash | `beta=0.05` | the KL pull slows learning; reward rises, but more slowly |

In Python the stuck preset ends at reward 0.125 and accuracy 0.22 after 200 steps, and `beta=0.05` ends at reward 0.62 and accuracy 0.68. Try your own knobs too: what does a bigger group (`G=16`) do to the slow start? What about `lr=2.0`?

## Key takeaways

- GRPO is a short loop: sample a batch of questions, sample a group of answers per question, grade, compute group-normalized advantages, nudge. Our complete version is under 100 lines of numpy.
- A slow start followed by an S-curve is normal when the model rarely gets a right answer at first: most groups are silent until a few successes appear.
- Healthy training: reward and true accuracy rise together, and entropy falls gradually as the model becomes confidently right.
- A buggy reward can make the reward curve look great while true accuracy stays at chance. Always measure something the model is not trained on.

## Next up

You have built GRPO. In **Reading the GRPO equation, line by line**, you will open the DeepSeekMath paper's formula and find every line of your numpy code inside it.
