# Solution: rush vs steps

## The code change

Replace the `ask` function in the notebook with this version, then run the comparison cell.

```python
def ask(questions, instruction, max_new_tokens=400):
    prompts = [
        tokenizer.apply_chat_template(
            [{"role": "user", "content": q + "\n" + instruction}],
            tokenize=False, add_generation_prompt=True)
        for q in questions
    ]
    inputs = tokenizer(prompts, return_tensors="pt", padding=True).to("cuda")
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    new_tokens = out[:, inputs["input_ids"].shape[1]:]
    return tokenizer.batch_decode(new_tokens, skip_special_tokens=True)

batch = gsm8k.select(range(20))
golds = [gold_number(s) for s in batch["answer"]]

rush = ask(batch["question"], "Reply with only the final number.", max_new_tokens=20)
steps = ask(batch["question"], "Think step by step, then give the final number on its own line.")

rush_ok = [last_number(r) == g for r, g in zip(rush, golds)]
steps_ok = [last_number(r) == g for r, g in zip(steps, golds)]
print(f"rush: {sum(rush_ok)}/20   steps: {sum(steps_ok)}/20")

helped = [i for i in range(20) if steps_ok[i] and not rush_ok[i]]
if helped:
    i = helped[0]
    print(batch["question"][i], "\n--- rush ---\n", rush[i], "\n--- steps ---\n", steps[i])
```

## What you should expect

Exact numbers vary, so we will not quote one here. The usual pattern is:

- **Rush** scores clearly lower. With room for only a number, the model must do every step in a single token's worth of computation. It tends to grab one or two numbers from the question and combine them (for the eggs question, something like 16 × 2 = 32).
- **Steps** scores higher, but still far from perfect. The working gives it room, yet it still makes copying slips and skips steps.

## Why

This is exactly the lesson's argument. Writing steps gives the model more computation and a scratchpad, so it helps. But the help has a ceiling on a small model because it is *imitating* step-by-step writing, not using a habit that was ever rewarded for being right. Nothing has taught it to check that "9 eggs left" really follows from the question.

That gap, between "steps help" and "steps are still not enough", is the space this course works in. Reinforcement learning will reward the version of step-by-step working that actually leads to right answers.

## Common pitfalls

- **Different questions in each run.** Use the same `batch` for both, or the comparison means nothing.
- **Sampling turned on.** Keep `do_sample=False` so each run gives the same answer every time.
- **Rush answers with extra words.** If the model writes "The answer is 18 dollars", `last_number` still finds 18, which is fine.
