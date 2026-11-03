# Write a grader that is harder to hack

The buggy grader pays for any even number and ignores the question. Write a new reward function for Tiny Adder that gives **partial credit**:

- 1.0 for the exact sum,
- 0.5 for an answer that is off by exactly one,
- 0.0 otherwise.

Plug it into the trainer without editing the file (hint: you can replace the module's `reward` function before calling `train`). Train with default settings and compare with the honest 0/1 grader at steps 50, 100 and 200.

Answer: did partial credit speed up learning of the *true* sum? Why or why not? Be careful: reward values from the two graders are not directly comparable, so compare **accuracy**.

**Done looks like:** working code, a small table of accuracy at steps 50, 100 and 200 for both graders, and a two-sentence explanation.
