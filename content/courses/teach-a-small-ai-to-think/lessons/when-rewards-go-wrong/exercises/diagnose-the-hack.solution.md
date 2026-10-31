# Solution: diagnose three suspicious runs

*These runs are invented for practice; the numbers are illustrative, not from real training.*

## Run A: it learned the shape, not the maths

1. **What it learned:** to produce the format perfectly with almost no thinking. The maths did not improve at all.
2. **Clue:** format reward maxed out at step 40 while correctness stayed flat at about 0.3, and held-out accuracy did not move. The weights explain why: format (1.0) was worth **twice** correctness (0.5), so the cheapest route to a high total was the format. The sample answer, with a one-line "Let me solve." think block, confirms it.
3. **Fix:** make correctness worth more than format (for example correctness 1.0, format 0.25 to 0.5), and reject near-empty thinking in the format reward (for example require some minimum content inside `<think>`). **Check:** correctness reward and held-out accuracy should start climbing after format saturates, rather than staying flat.

## Run B: it learned to hedge

1. **What it learned:** to list several candidate numbers so that the last one is sometimes right.
2. **Clue:** correctness reward rose a lot (0.3 to 0.8) but held-out accuracy barely moved (30% to 31%), and the answers contain lists of numbers. Because the grader takes the **last** number, a list gives the model extra chances. (The held-out check is separate and stricter, which is why it did not move.)
3. **Fix:** require exactly one number inside the answer block, or score 0 (the `single_number_correctness` reward from the lab). **Check:** after the change, the training correctness and held-out accuracy should move together again, and answers should contain one number.

## Run C: it memorized the training set

1. **What it learned:** the answers to its 500 training questions, not a general method.
2. **Clue:** training correctness reached 0.95 but held-out accuracy only rose from 30% to 34%; the run saw each question about 50 times; and changing a number in a training question still produced the old answer. That last test is the giveaway: a model that had learned the method would give a new answer.
3. **Fix:** use more training questions (GSM8K has about 7,500 in its training split) so the model cannot memorize them, train for fewer passes, and keep watching held-out accuracy as your main progress measure. **Check:** the gap between training reward and held-out accuracy should shrink.

## The pattern behind all three

In every case, the clue was the same: **the training reward and the independent held-out check disagreed.** That gap is the signature of reward hacking (or its cousin, memorization). This is why the lesson's top habit is to always keep a separate accuracy check on questions the model never trains on, and to read real samples. And in every case the fix changed the reward, the data or the evaluation, because the model was doing exactly what the setup rewarded.
