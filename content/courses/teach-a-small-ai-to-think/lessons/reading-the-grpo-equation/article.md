# Reading the GRPO equation, line by line

Most people meet GRPO as one intimidating line in a paper: a big E, a fraction with a pi over another pi, a "min", a "clip", a beta and a D with a subscript. It looks like a wall. It is actually a list of five instructions you have already followed, written in a very compressed language.

You built every piece in the Tiny Adder lab. In this lesson you will open the equation from the *DeepSeekMath* paper (Shao et al., 2024) and find your own code inside it.

**In this lesson** you will learn to read the GRPO objective symbol by symbol, translate each part into plain words and into a line of `grpo_tiny_adder.py`, and understand the two places where real language models differ from our toy: answers made of many tokens, and a particular way of estimating KL. Then you will see which parts of the equation later papers (DAPO and Dr. GRPO) changed, and why. Bring the GRPO cheat sheet; it has the equation on one page.

## First, the symbols

Before the formula, here is the vocabulary. Each symbol is something you already know by another name.

| Symbol | Read it as | In Tiny Adder |
|---|---|---|
| `q` | a question (prompt) | one sum, like 7 + 5 |
| `G` | group size | `G = 8` |
| `o_i` | the i-th answer (output) in the group | one sampled `k` |
| `\|o_i\|` | length of answer i, in tokens | always 1 (an answer is one number) |
| `o_i,t` | the t-th token of answer i | the answer itself |
| `π_θ` | the model being trained ("policy", with weights θ) | the logit table `L` |
| `π_θold` | the model that sampled the answers | `p_old` in the code |
| `π_ref` | the frozen reference model | `L_ref` (all zeros) |
| `r_i` | the reward for answer i | 0 or 1 |
| `Â_i,t` | the advantage of token t of answer i | `A` |
| `ε` | clipping range | `eps = 0.2` |
| `β` | KL strength | `beta` |

Greek letters are just names. `π` (pi) is the traditional name for a policy; `θ` (theta) stands for "all the weights".

## The equation

Here is the GRPO objective as written in DeepSeekMath, in plain-text form:

```text
J(θ) = E over q, and over G answers {o_1 … o_G} sampled from π_θold(·|q), of

  (1/G) Σ_i  (1/|o_i|) Σ_t  {  min[ ratio_i,t · Â_i,t ,  clip(ratio_i,t, 1−ε, 1+ε) · Â_i,t ]
                               − β · D_KL[ π_θ ‖ π_ref ]  }

where  ratio_i,t = π_θ(o_i,t | q, o_i,<t) / π_θold(o_i,t | q, o_i,<t)
```

Training means making `J` as large as possible. Let's take it apart from the outside in.

## Line 1: "E over q and G sampled answers"

`E` means "on average over". The subscript says what we average over: questions `q` drawn from the training set, and for each one, a group of `G` answers sampled from the *old* model.

**In words:** pick questions, ask each one `G` times.

**In code:**

```python
a, b = rng.integers(0, 10, size=2)
ks = rng.choice(N_ANSWERS, size=G, p=softmax(L[a, b]))  # the group
```

The batch of 16 questions is how we approximate the average over all questions.

## Line 2: the two averages, `(1/G) Σ_i` and `(1/|o_i|) Σ_t`

`Σ` (sigma) means "add up". `(1/G) Σ_i` adds something up over the `G` answers and divides by `G`: an average over the group. `(1/|o_i|) Σ_t` does the same over the tokens of one answer: an average over tokens.

**In words:** average over the answers in the group, and within each answer, average over its tokens.

**In code:** our answers are a single token, so the token average does nothing. The group average is one line:

```python
step /= len(ks)  # average over the group
```

Hold on to that `1/|o_i|`. It looks innocent, and it is the most argued-about part of the equation. We will come back to it.

## Line 3: the ratio

```text
ratio_i,t = π_θ(o_i,t | …) / π_θold(o_i,t | …)
```

The vertical bar `|` means "given". `π_θ(o_i,t | q, o_i,<t)` is "the probability the current model gives to token t, given the question and the tokens before it". That is how a language model works: one token at a time, each conditioned on everything so far.

**In words:** how much more (or less) likely is this token now than when it was sampled?

**In code:**

```python
ratio = p_new[k] / p_old[k]  # 1.0 on the first inner step
```

## Line 4: min and clip

```text
min[ ratio · Â ,  clip(ratio, 1−ε, 1+ε) · Â ]
```

`clip(x, low, high)` squeezes `x` into the range low to high. Taking the `min` of the clipped and unclipped versions is the trick from PPO (Schulman et al., 2017) that you explored in the clipping lesson: once a token has moved more than `ε` in the direction its advantage wants, the objective goes flat and the gradient stops. If it moved the other way, the `min` keeps the unclipped value and the correction continues.

**In code:** instead of writing the `min` and then differentiating it, we write down its gradient directly:

```python
clipped = (A > 0 and ratio > 1 + eps) or (A < 0 and ratio < 1 - eps)
if not clipped:
    step += ratio * A * (onehot - p_new)
```

`ratio * A * (onehot - p_new)` is exactly the gradient of `ratio · A` with respect to our logits. Where the `min` picks the flat, clipped branch, the gradient is zero, so we skip the answer.

## Line 5: the advantage `Â_i,t`

For the setting DeepSeek used for R1-style training, one reward per complete answer ("outcome supervision" in the paper), the advantage is the same for every token of an answer:

```text
Â_i,t = (r_i − mean(r_1 … r_G)) / std(r_1 … r_G)
```

**In words:** how much better than its group did this answer score, measured in typical differences? Every token in the answer shares that score.

**In code:**

```python
return (r - r.mean()) / (r.std() + 1e-4)
```

The paper also describes "process supervision", where a reward model scores each reasoning step and tokens get different advantages. R1 and this course use the simpler outcome version.

## Line 6: the KL leash, `− β · D_KL[π_θ ‖ π_ref]`

The minus sign means this is a penalty: we want `J` big, so drifting from the reference makes `J` smaller. `β` sets how much it costs.

GRPO puts the KL penalty directly into the objective, per token. (Classic PPO for RLHF instead subtracted it from the reward.) And it measures KL with a specific formula, for each sampled token:

```text
D_KL ≈ π_ref/π_θ − log(π_ref/π_θ) − 1
```

Why this odd shape? It is an estimator of KL that can be computed from just the sampled token (no need to sum over the whole vocabulary of tens of thousands of tokens), it is never negative, and on average it gives the right answer. John Schulman described it in a 2020 blog post on approximating KL; it is often called "k3". A few values:

| π_ref (token) | π_θ (token) | estimate |
|---|---|---|
| 0.5 | 0.5 | 0 (no drift) |
| 0.4 | 0.5 | 0.023 |
| 0.1 | 0.5 | 0.81 |
| 0.5 | 0.1 | 2.39 |

**In code:** Tiny Adder keeps things readable with a simpler pull of the logits toward the reference, `step -= beta * (row - ref_row)`. Same purpose (stay near home), simpler arithmetic. The real TRL trainer uses the k3 estimator when `beta > 0`.

## The whole equation, as a table

| Piece of the equation | Plain words | Line of `grpo_tiny_adder.py` |
|---|---|---|
| `E over q, {o_i} ~ π_θold` | ask questions, sample G answers each | `rng.choice(N_ANSWERS, size=G, p=softmax(L[a, b]))` |
| `(1/G) Σ_i` | average over the group | `step /= len(ks)` |
| `(1/\|o_i\|) Σ_t` | average over tokens of an answer | (one token, so nothing) |
| `ratio` | how far has this answer moved? | `ratio = p_new[k] / p_old[k]` |
| `min[…, clip(…)]` | stop once it moved enough | `clipped = …; if not clipped:` |
| `Â` | group-normalized reward | `advantages(rs)` |
| `− β D_KL` | leash to the reference | `step -= beta * (row - ref_row)` |
| maximize `J` | take a step uphill | `row = row + lr * step` |

That is the whole thing. Five instructions and a step.

## What later papers changed

Now you can read the follow-up papers, because they each change one specific piece.

**The `1/|o_i|` length average.** *Dr. GRPO* ("Understanding R1-Zero-Like Training", Liu et al., 2025) points out a side effect. Dividing by the answer's length spreads its advantage thinly across long answers:

| Answer | Advantage | Length | Push per token |
|---|---|---|---|
| right, short | +1 | 50 tokens | +0.02 |
| right, long | +1 | 200 tokens | +0.005 |
| wrong, short | −1 | 50 tokens | −0.02 |
| wrong, long | −1 | 200 tokens | −0.005 |

Short right answers get a stronger push per token than long right ones, and long wrong answers get a *weaker* penalty per token than short wrong ones. So a model can soften its punishment for being wrong by rambling. Dr. GRPO argues this can inflate response length, especially for wrong answers, and replaces `1/|o_i|` with a constant. *DAPO* (2025) replaces the per-answer average with one average over all tokens in the batch ("token-level loss"). TRL offers both as `loss_type="dr_grpo"` and `loss_type="dapo"` (its current default); the original is `loss_type="grpo"`.

**The `std` in the advantage.** Dr. GRPO also drops the division by the group's standard deviation, because it gives extra weight to questions that are almost always right or almost always wrong. TRL's `scale_rewards` setting controls this.

**The clip range.** DAPO's clip-higher uses a larger upper limit (`1 + ε_high`) than lower limit, so unlikely tokens can grow. TRL's `epsilon_high`.

**The KL term.** DAPO removes it for long chain-of-thought training; TRL now defaults to `beta=0.0`.

None of these change the heart of the method: groups, relative advantages, the clipped nudge. That is why it is still called GRPO.

## Key takeaways

- The GRPO objective is five instructions: sample a group per question, compute group-relative advantages, compute each token's ratio, apply the clipped nudge, subtract a KL penalty.
- Every piece maps to a line of the Tiny Adder code; real models just have many tokens per answer instead of one.
- GRPO puts KL directly in the loss, estimated per token with the always-positive "k3" formula `π_ref/π_θ − log(π_ref/π_θ) − 1`.
- The `1/|o_i|` length average and the std division are the parts later work changed: Dr. GRPO and DAPO remove length bias, and TRL exposes the choices as `loss_type` and `scale_rewards`.

## Next up

Theory done. In **Setting up a real run on a free GPU** you will meet TRL's `GRPOTrainer`, see every one of these symbols turn into a config option, and prepare a real training run on Qwen2.5 in Colab.
