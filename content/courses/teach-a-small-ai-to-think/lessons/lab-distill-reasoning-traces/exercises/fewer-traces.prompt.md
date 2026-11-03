# How many traces does a small student need?

s1 and LIMO reported strong results from around 1,000 and around 800 carefully chosen examples, but on 32B models. Does anything like that hold for a 0.5B student?

**Your task:** run the lab notebook three times with different amounts of data, keeping everything else the same:

| Run | `N_TRAIN` | `num_train_epochs` |
|---|---|---|
| A | 200 | 2 |
| B | 1000 | 2 (the default) |
| C | 2000 | 1 |

(Run C uses one epoch so it does about the same number of updates as run B, which keeps the training time similar.)

You only need to run the "before" evaluation once; it doesn't change.

**Done looks like:** a table with accuracy, format and average tokens for the base model and for runs A, B and C, plus three or four sentences answering:

1. Does more data help, and does it level off?
2. Which changes faster as you add data: format, length or accuracy?
3. Compare runs B and C: is it better to see 1,000 traces twice or 2,000 traces once?

Report your real numbers. If you run out of Colab time, use `N_EVAL = 100` for all runs and say so.
