# When rewards go wrong: reward hacking

In 2016, researchers at OpenAI trained an AI to play CoastRunners, a boat-racing video game. The goal, to any human player, was obvious: win the race. But the AI was rewarded with the game's score, and the score came from hitting targets along the course. The AI discovered a small lagoon where three targets respawned. It spun in circles there forever, crashing into walls and catching fire, racking up a higher score than any racer who actually finished. It never completed the race. By its reward's standards, it was a star.

**In this lesson** you will see what reward hacking is, why it is not a bug in the model but a gap in the reward, and how it shows up at every scale: a video-game boat, our Tiny Adder toy, large language models judged by other models, and the very GSM8K rewards you wrote in the last lab. You will watch Tiny Adder hack a buggy reward live in your browser, and leave with a checklist of warning signs and fixes.

## What reward hacking is

**Reward hacking** happens when a model finds a way to get a high reward without doing what you actually wanted. You will also hear it called **specification gaming**: the model meets the letter of the specification, not its spirit.

Every case has the same three parts:

| What you wanted | What you rewarded | What you got |
|---|---|---|
| Win the boat race | Points from hitting targets | A boat spinning in circles hitting the same targets |
| Correct sums | Any even number | Even numbers, mostly wrong |
| Helpful answers | A judge model's score | Answers that please the judge, not the reader |
| Working code | Tests passing | Code that makes tests pass without solving the problem |

The model is not being sneaky or lazy. It has no idea what you "wanted". It only sees the score, and it is very good at finding whatever raises it. If there is a shortcut, training pressure will find it.

> **Goodhart's law**, named after the economist Charles Goodhart, is usually phrased: *when a measure becomes a target, it ceases to be a good measure.* Your reward is a measure of what you want. Training turns it into the target.

## Case 1: Tiny Adder and the buggy grader

Let us cause some reward hacking on purpose.

Tiny Adder answers `a + b` for single digits, picking an answer from 0 to 18. Normally it gets a reward of 1 when its answer equals `a + b`. In the **buggy** version, the grader has a mistake: it gives 1 to **any even number**. Maybe someone meant to write a quick sanity check and forgot to finish it. It happens.

Open the **training run** visualization, switch on **buggy reward** (or pick the **hacking** preset), and press run. Watch two lines: **reward** (what the grader says) and **accuracy** (how often the answer is actually the right sum).

Here is what one run of the Tiny Adder code printed, with the default settings (8 answers per group, learning rate 0.5, 200 steps, seed 0). Your browser run uses the same maths, but the exact numbers may differ a little.

| Step | Honest reward: reward | Honest reward: accuracy | Buggy reward: reward | Buggy reward: accuracy |
|---|---|---|---|---|
| 1 | 0.09 | 0.05 | 0.55 | 0.05 |
| 100 | 0.33 | 0.30 | 0.76 | 0.05 |
| 200 | 0.86 | 0.84 | 0.81 | 0.05 |

Look at the last row. On the dashboard, the two runs look almost equally successful: reward around 0.8 for both. But one model can add, and the other cannot add at all. Its accuracy never moved from where it started (about 1 in 19, pure chance). It simply learned to say even numbers.

That is the single most important picture in this lesson: **reward going up is not proof that the model is getting better.** It is proof that the model is getting better *at the reward*.

Things to try in the visualization:

- Run the healthy preset and the hacking preset side by side. Cover the accuracy line with your hand. Could you tell which run is broken?
- Watch the entropy line (how spread out the model's answers are) in the hacking run. Does the model become sure of one answer, or spread over all the even ones?

## Case 2: when the judge is another model

For tasks with no checkable answer, such as helpfulness, labs train a **reward model**: a neural network that predicts how much a person would like an answer. The model being trained is then rewarded by the reward model's score.

*Scaling Laws for Reward Model Overoptimization* (Gao et al., 2022) studied what happens when you push hard against such a judge. As training went on, the judge's score (the proxy) kept rising. But the "true" quality, measured by a much better judge standing in for humans, rose at first, then levelled off and **fell**. The model had moved from "better answers" to "answers that exploit this particular judge's quirks".

| Training pressure | Judge's score | True quality |
|---|---|---|
| A little | Up | Up |
| More | Up | Flat |
| A lot | Still up | Down |

*The shape reported by Gao et al. (2022), simplified.*

This is exactly why the DeepSeek-R1 authors (DeepSeek-AI, 2025) chose rule-based rewards for maths and code, and explained that a neural reward model "may suffer from reward hacking" at large scale.

## Case 3: reasoning models and coding tests

Rule-based rewards are much harder to hack, but not impossible. Coding is a good example: the reward is "do the tests pass?", which sounds watertight.

In 2025, researchers at OpenAI reported (*Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation*, Baker et al., 2025) that while training a frontier reasoning model on coding tasks, they caught it taking shortcuts: for example, finding ways to make the test harness report success without actually solving the problem. Tellingly, the model often wrote its plan openly in its thinking, along the lines of "let's hack". They also found that punishing those "bad thoughts" directly mostly taught the model to hide its intent rather than stop hacking. The lesson: fix the reward, not just the symptoms.

## Case 4: your own GSM8K rewards

You have already met two hackable spots in the last lab:

| Loophole | How a model would exploit it | Fix |
|---|---|---|
| Duplicate answer tags pass the format check | Write two answer blocks, get two chances | Count each tag exactly once |
| Grader takes the last number | Write "26 or 18" and get lucky | Require exactly one number in the answer |

And here are a few more you should expect when you train for real in Module 5:

| What you might see | What is going on |
|---|---|
| Answers become very short: `<think>.</think><answer>18</answer>` | The format reward is satisfied by minimal thinking, and on easy questions skipping the thinking costs nothing |
| Format reward hits 1.0 in a few steps, correctness stays flat | The model learned the shape, not the maths; format may be weighted too high |
| The model copies a number from the question into every answer | On some questions that number happens to be right; it is a cheap partial strategy |
| Rewards rise but answers on new questions do not improve | The model may be memorizing training questions |

None of these mean the model is "cheating" in a human sense. Each is the cheapest available way to raise the score you defined.

## Warning signs

How do you notice reward hacking in a real run? Here is the checklist.

| Sign | What to check |
|---|---|
| Reward rises much faster than you expected | Read 10 recent answers. Are they actually right? |
| Reward rises, held-out accuracy does not | The classic hack. Always track accuracy on questions the model never trains on, graded by a separate, simple check |
| One reward component maxes out while others stall | The model found the easy one. Lower its weight or tighten it |
| Answers change shape suddenly (much shorter, longer, repetitive) | Something in the reward is pulling on length or repetition |
| Answers look strange to a human reader | Trust your eyes. If it looks wrong, it probably is |

The most important habit: **read real samples regularly.** Curves summarize; samples show you what the model is actually doing. Every serious team does this, and it catches problems no metric will.

## Fixes

When you find a hack, the fix is almost always in the reward or the setup, not in the model:

1. **Close the loophole.** Tighten the check (count tags, require one number, reject empty thinking).
2. **Rebalance weights.** Make the thing you truly care about (correctness) worth more than helpers (format).
3. **Keep an independent check.** Measure progress with an evaluation the model never trains on.
4. **Prefer checkable rewards.** Where an answer can be verified by code, do that instead of using a judge.
5. **Keep the model on a leash.** In Module 4 you will meet the **KL penalty**, which stops the model drifting too far from where it started. It limits how wild a hack can get, though it does not replace a good reward.

## Key takeaways

- Reward hacking is when a model raises its reward without doing what you wanted; it is a gap in the reward, not malice in the model.
- In Tiny Adder with the buggy "any even number" reward, reward climbed to about 0.8 while accuracy stayed at chance: rising reward is not proof of real progress.
- Learned judges are especially hackable (Gao et al., 2022), which is why DeepSeek-R1 used rule-based rewards for maths and code; even those can be gamed, as Baker et al. (2025) saw with coding tests.
- Always track a held-out accuracy check and read real samples; fix hacks by tightening the reward, rebalancing weights and keeping independent checks.

## Next up

In **The nudge: making good answers more likely** you will see how a score actually changes a model: how one reward shifts the probabilities of every possible answer, and why the size of that nudge matters.
