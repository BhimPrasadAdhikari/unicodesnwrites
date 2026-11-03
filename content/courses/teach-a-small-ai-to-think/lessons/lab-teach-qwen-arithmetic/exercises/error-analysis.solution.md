# Solution: error analysis

**Code** (run in the notebook after section 8, which defines `answer`, `trained_model`, `tokenizer`, `load_gsm8k` and `is_correct`):

```python
wrong = []
test = load_gsm8k("test").select(range(100))
for row in test:
    reply = answer(trained_model, tokenizer, row["prompt"])
    if not is_correct(reply, row["answer"]):
        wrong.append((row["question"], row["answer"].split("####")[-1].strip(), reply))
    if len(wrong) == 20:
        break

for i, (question, gold, reply) in enumerate(wrong):
    print(f"#{i}  GOLD {gold}\n{question}\n---\n{reply}\n{'=' * 60}")
```

**Bucketing.** Your counts are your own; read every answer before deciding. A filled-in table looks like this (counts left blank on purpose):

| Bucket | Count | Typical sign |
|---|---|---|
| setup | | adds when it should multiply, ignores a condition |
| arithmetic | | correct plan, wrong product or division |
| format | | right number outside the tags, missing `</answer>` |
| cut off | | ends mid-sentence, no `<answer>` |
| misread | | answers "per day" when asked "per week" |
| **total** | **20** | |

**Matching fixes to buckets:**

| Biggest bucket | Change to try |
|---|---|
| format | raise the format weight a little, or use a softer partial-credit format reward early on |
| cut off | raise `max_completion_length` (costs memory and time), or add a gentle length penalty if answers ramble |
| arithmetic | more steps; a larger model (1.5B); or distillation from a stronger model (module 8) |
| setup / misread | more steps or a larger model; these are reasoning failures that a 0.5B model struggles with |

**Why it matters:** the right fix depends on the kind of error. Raising the token limit does nothing for arithmetic slips, and a stricter format reward does nothing for misread questions. Ten minutes of reading answers can save hours of blind knob-turning.
