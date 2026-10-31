# Solution: design a verifier for three tasks

| | **A. Unit conversion** | **B. Anagram** | **C. Product description** |
|---|---|---|---|
| Verifiable? | **Yes** | **Yes** | **Partly** |
| The check | Pull the number from `<answer>`, compare with 3.2 × 1000 = 3200 within a tiny tolerance. 1 if equal, else 0. | Take the word in `<answer>`, lower-case it, check (1) it uses exactly the letters of "listen", (2) it is not "listen" itself, (3) it is in an English word list. 1 if all three, else 0. | Can check: word count under 50, mentions "shoes", no banned words. Cannot check: whether it is persuasive or well written. |
| Leniency | Accept `3,200`, `3200.0` and `3200 m`: grade the number, not the decoration. | Accept any valid anagram ("silent", "enlist", "tinsel", "inlets"), not just one gold word; ignore capitals and spaces. | Accept any wording at all, since there is no gold answer. |
| Loophole | The model writes several numbers ("3.2 or 3200 or 32000") and the grader takes one that matches. **Fix:** require exactly one number inside `<answer>`, or score 0. | The model returns "listen" unchanged, which uses the right letters. **Fix:** the "not the original word" rule. Another: made-up words. **Fix:** the word list. | The model writes "Shoes." (one word) and passes every checkable rule. **Fix:** a minimum length helps, but quality still needs a person or a reward model. |

## Why these answers

- **Task A** is the cleanest case: one exact answer and an easy numeric comparison. The only real decisions are how forgiving to be about formatting and how to stop "hedging" with several numbers. This mirrors GSM8K exactly.
- **Task B** shows that "verifiable" does not mean "one right answer". There are several correct anagrams, but a program can still check any of them reliably. Many good RL tasks look like this: hard to solve, easy to check.
- **Task C** shows the limit. You can verify the *constraints* (length, keywords), and doing so is useful, but the thing you actually care about (is it a good description?) needs judgment. If you rewarded only the checkable constraints, the model would learn to satisfy them with the least effort, which is reward hacking in miniature. That is why the R1 authors used rule-based rewards for maths and code, and only brought in reward models for general writing at the very end.

**Rule of thumb for your capstone:** pick a task that is *hard to solve but easy to check*.
