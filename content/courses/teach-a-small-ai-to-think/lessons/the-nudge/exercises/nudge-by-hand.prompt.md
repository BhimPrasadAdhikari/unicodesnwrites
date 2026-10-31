# One nudge, by hand

Doing one update with a pencil (or a calculator) is the best way to make the rule stick.

**The setup**

Our four-answer model for "What is 3 + 4?" currently has these probabilities:

| `7` | `8` | `6` | `no idea` |
|---|---|---|---|
| 0.5 | 0.2 | 0.2 | 0.1 |

The learning rate is 0.5. The update rule is:

```
change in dials = learning_rate × advantage × (onehot(k) − probs)
```

**What to do**

1. The model samples `7` and it gets advantage **+1**. Work out the **direction** `onehot(7) − probs` for all four answers, then the **change in dials**.
2. Separately, starting from the same probabilities, the model samples `no idea` and it gets advantage **−1**. Work out the direction and the change in dials.
3. Without computing softmax, say for each case which answers become more likely and which become less likely.
4. *(Optional, with Python or a calculator.)* Apply each change to the dials and run softmax to get the new probabilities. Hint: you can start from dials equal to the natural log of the probabilities, since softmax of `log(p)` gives back `p`.
5. In one sentence: in case 2, why does `7` gain more probability than `8` and `6`, even though only `no idea` was sampled?

**What "done" looks like**

Two direction rows and two change rows (four numbers each), a list of which answers go up or down in each case, and your one-sentence answer to step 5. If you did step 4, your new probabilities for `7` should be about 0.58 (case 1) and about 0.56 (case 2).
