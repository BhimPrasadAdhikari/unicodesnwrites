# Write your baseline report

Before you can say your trained model got better, you need to know where it started.

**What to do**

1. Open the **Hello GPU notebook** in Colab with a T4 GPU and run every cell.
2. Write down your score out of 20.
3. Read at least **three** of the wrong answers in full (section 8 shows the first one; change `wrong[0]` to `wrong[1]`, `wrong[2]` and so on).
4. For each wrong answer, put the mistake into one bucket: *skipped a step*, *copying slip* (used the wrong number), *misread the question*, *arithmetic slip*, *no clear final number*, or *grader error* (the model was right but our simple last-number check marked it wrong).
5. Write two or three sentences: what is the model's most common mistake, and do you think "writing the steps out more carefully" would fix it?

**What "done" looks like**

A short note (it can live in a text cell at the bottom of the notebook) with:

- your library versions and GPU name (printed in section 2),
- your score out of 20,
- three wrong answers, each with a bucket and one line explaining why,
- your two-or-three-sentence conclusion.

Keep this note. You will compare against it at the end of Module 5.
