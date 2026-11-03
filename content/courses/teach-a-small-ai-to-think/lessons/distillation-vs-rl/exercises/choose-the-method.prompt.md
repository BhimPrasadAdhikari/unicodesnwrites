# Distill, RL, or both?

For each situation, choose **distill**, **RL (GRPO)**, or **distill then RL**, and give a one-sentence reason. Use the decision table from the lesson, but think about each case yourself.

1. You want a 0.5B model to solve school maths word problems. An open dataset of 50,000 reasoning traces from a large reasoning model already exists for exactly this kind of problem.
2. You want a 1.5B model to play the Countdown numbers game. Nobody has published traces for it, but checking an answer takes one line of Python. The base model already gets about 10% right.
3. Same as case 2, except the base model gets 0% right: every one of 8 sampled answers is always wrong.
4. Your company's best model is already the strongest available on your task, and you want something *better* than it.
5. You distilled a small model on R1-style traces. Accuracy went up nicely, but replies are now around 900 tokens long and your phone app can only afford about 200.

**Done looks like:** five answers, each with a one-sentence reason that mentions *why* the other option is weaker.
