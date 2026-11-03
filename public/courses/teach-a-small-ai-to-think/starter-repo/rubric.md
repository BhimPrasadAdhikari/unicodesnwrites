# Capstone rubric

Your submission is a **Hugging Face model** (a LoRA adapter is fine) plus a **short write-up** (300–800 words, on the model card or a linked page). It is graded out of 20 points. 14 or more is a pass; 18 or more is a distinction.

| Area | 0 points | 2 points | 4 points |
|---|---|---|---|
| **1. Task and reward** | No clear task, or answers can't be checked | Task is checkable, reward explained briefly | Task is checkable, reward explained in plain words, and at least one loophole you tested for is described |
| **2. Baseline** | No "before" numbers | Base-model accuracy reported | Accuracy, format rate and average length reported on a fixed held-out set, with the command used |
| **3. Training run** | Model did not train or isn't shared | Model trained and shared on Hugging Face | Shared, with the settings (steps, group size, learning rate, length cap) and a screenshot or table of the reward curve |
| **4. Results, honestly** | No "after" numbers, or numbers from the training set | Before/after accuracy on the same held-out set | Before/after accuracy **and** length, at least three real sample answers (one failure), and what you think changed |
| **5. Reflection** | Missing | One thing you'd do differently | What surprised you, one limitation of your model, and one next experiment (e.g. a length penalty, a bigger model, distillation first) |

## Hard rules (a submission that breaks one is returned for fixing)

- Test puzzles must not be in the training data (the builders use a separate seed for `split="test"`).
- Numbers you report must come from runs you did. Say "illustrative" for anything you didn't measure.
- The model card says which base model you started from and links this course.

## Quick self-check before you submit

- [ ] `python selftest.py` passes (including any test you added for your own task)
- [ ] Before/after table pasted into the write-up
- [ ] Three sample answers, one of them wrong
- [ ] Model card has base model, task, reward, steps, and how to try it
