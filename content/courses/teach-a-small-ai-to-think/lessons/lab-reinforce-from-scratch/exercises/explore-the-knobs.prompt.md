# Turn the knobs and explain what you see

Training is experimentation. Practise changing one thing at a time and explaining the result.

**What to do**

Using `average_runs` from `reinforce_bandit.py` (mean baseline, 20 seeds), run these four experiments and record the mean and spread of P(`7`) at steps 10 and 60:

1. The default settings (`lr=0.5`, `batch_size=8`).
2. `lr=2.0`.
3. `batch_size=2`.
4. `batch_size=2` with `baseline="none"` (and no bonus).

Then answer:

- **A.** Which setting learned fastest, and why is that safe on this toy but risky on a real model?
- **B.** Compare experiments 3 and 4. With only two samples per batch, what does the mean baseline do to the spread, and why might it slow learning a little at the same time?

**What "done" looks like**

A four-row table of results, and two or three sentences each for A and B.
