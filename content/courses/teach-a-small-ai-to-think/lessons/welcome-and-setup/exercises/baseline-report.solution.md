# Solution: a sample baseline report

Your numbers will differ. Scores move a little between GPUs and library versions, and different people read mistakes differently. What matters is that the report is specific. Here is what a good one looks like (the entries below are **illustrative**, written to show the format, not copied from a real run):

> **Setup:** Tesla T4, torch (Colab default), transformers 5.20.2, datasets 5.1.0, trl 1.16.0.
> **Score:** 9/20 on GSM8K test questions 0–19, greedy decoding, last-number grading.
>
> **Wrong answer 1, copying slip.** The question said 3 boxes of 12; the model wrote 3 × 21 in its working. Every step after that was done correctly on the wrong number.
>
> **Wrong answer 2, skipped a step.** It worked out the cost of the apples but forgot to add the bananas before subtracting from $20.
>
> **Wrong answer 3, grader error.** The model wrote "$70 total, which is 7 more than last week". The right answer was 70, but our last-number check grabbed 7.
>
> **Conclusion:** Most mistakes were careless, not "can't do it": each individual step was usually right. Writing every step out and re-checking numbers against the question would probably fix the copying and skipped-step errors. The grader error shows we need the model to put its final answer in a clearly marked place.

## Why this is the right shape

- **Recording versions and the GPU** makes your result reproducible. If your score changes later, you can tell whether the model changed or the setup did.
- **Bucketing mistakes** turns "it's bad at maths" into something you can act on. Copying slips and skipped steps are exactly the habits that step-by-step reasoning helps with, which is the bet this whole course makes.
- **Spotting grader errors** is an early taste of Module 2. If the grader is wrong, the score is wrong, and a model trained on that score learns the wrong lesson. That is why we will ask the model to put its answer inside `<answer>…</answer>` tags, so the grader never has to guess.

## If something went wrong

| Problem | Fix |
|---|---|
| `nvidia-smi` not found / "GPU available: False" | Runtime → Change runtime type → T4 GPU, then rerun from the top |
| Install cell asks to restart | Click restart, then continue from the cell after the install |
| Out of memory | Runtime → Restart session and run again; close other Colab tabs |
| Download is very slow | Hugging Face can be busy; wait and rerun the load cell |
| 20/20 correct | Lucky batch. Try `gsm8k.select(range(20, 40))` for a fairer picture |
