# Lab: copy a big model's thinking into a small one

In the last lesson you read that DeepSeek's small distilled models beat small models trained with RL alone, just by copying R1's worked answers. That sounds almost too easy. So let's try it. In this lab you'll take a half-billion-parameter model, show it about a thousand worked solutions written by a much bigger reasoning model, and measure what changes, all on a free Colab GPU in under an hour.

**In this lab** you'll pick an open dataset of reasoning traces, turn each trace into the `<think>`/`<answer>` format used throughout the course, fine-tune **Qwen2.5-0.5B-Instruct** with Hugging Face TRL's `SFTTrainer` and LoRA, and compare accuracy, format and answer length before and after on GSM8K test problems the model has never seen. The code walkthrough goes through `sft_distill.py` step by step, and the notebook runs the same steps cell by cell.

## What you'll need

| Thing | Where | Notes |
|---|---|---|
| A free Colab account | colab.research.google.com | Choose *Runtime → Change runtime type → T4 GPU* |
| The lab notebook | `08-distill-reasoning.ipynb` (resources) | Same code as `sft_distill.py`, split into short cells |
| About 45–60 minutes | | An estimate: two evaluations of about 5–10 minutes each, plus 20–30 minutes of training |
| A Hugging Face account | huggingface.co | Only if you want to share the result |

Libraries are pinned: `trl==1.16.0`, `transformers==5.20.2`, `peft==0.21.2`, `datasets==5.1.0`, `accelerate==1.15.0`.

## The data: a big model's worked answers

We use **[camel-ai/gsm8k_distilled](https://huggingface.co/datasets/camel-ai/gsm8k_distilled)**, published by CAMEL-AI under the MIT license. It contains about 7,500 GSM8K *training* problems, each with a reasoning trace produced with CAMEL-AI's DeepSeek-R1 distillation pipeline. Each row has:

| Column | What's in it |
|---|---|
| `problem` | The word problem |
| `reasoning_solution` | A `<think>` block with the teacher's working, then a written answer ending in `\boxed{...}` |
| `groud_truth_solution` | The original GSM8K solution (the column name's spelling is the dataset's) |
| `boxed_answer_success` | Whether the teacher's boxed answer was judged correct |

We picked it for three reasons: it's small enough to download in seconds, its problems match the GSM8K test set we grade on, and its traces are R1-style long thinking, complete with "wait, let me check" moments.

Before training on any dataset, read some of it. When we looked at the first 100 rows, 97 were marked as successful, and in all 97 the boxed answer matched GSM8K's own answer. The traces were long: the median `reasoning_solution` was about 3,700 characters, roughly a page of text, for problems a careful person solves in three lines. That length will matter later.

## Step 1: rewrite traces into our format

The teacher writes its answer as `\boxed{26}` inside a paragraph. Our models answer with `<answer>26</answer>`. So for each row we keep the thinking, pull out the final number and rebuild the reply. Here's the core idea on a made-up row (this runs on any computer):

```python
import re

THINK_RE = re.compile(r"<think>(.*?)</think>", re.DOTALL)
BOXED_RE = re.compile(r"\\boxed\{([^{}]*)\}")

row = {
    "problem": "Tom has 3 boxes of 12 pencils. He gives away 10. How many are left?",
    "reasoning_solution": "<think>\n3 boxes of 12 is 36. Wait, let me check: 12 + 12 + 12 = 36. "
                          "Then 36 - 10 = 26.\n</think>\nTom has 36 pencils and gives away 10, "
                          "so \\boxed{26} remain.",
}
think = THINK_RE.search(row["reasoning_solution"]).group(1).strip()
answer = BOXED_RE.findall(row["reasoning_solution"])[-1]
print(f"<think>\n{think}\n</think>\n<answer>{answer}</answer>")
```

Output:

```text
<think>
3 boxes of 12 is 36. Wait, let me check: 12 + 12 + 12 = 36. Then 36 - 10 = 26.
</think>
<answer>26</answer>
```

In the real script, each example becomes a **prompt** (our system prompt plus the problem) and a **completion** (the rebuilt reply), as chat messages. TRL calls this a *conversational prompt-completion* dataset, and `SFTTrainer` applies the model's chat template for you.

## Step 2: keep what fits

A free T4 has 16 GB of memory. Sequences of several thousand tokens would need tiny batches and long waits. So we drop traces longer than 1,024 tokens (after the chat template is added) and keep the first 1,000 of what remains.

That filter has a side effect worth noticing. By keeping only the shorter traces, we're choosing the teacher's more concise moments to copy. Distillation copies *style* as well as skill, so what you filter is what you teach.

## Step 3: measure before you train

Always measure the starting point. We grade the untouched student on the first 200 GSM8K **test** problems. The traces came from the training split, so these are genuinely new to the model.

Three numbers:

| Measure | Meaning |
|---|---|
| **accuracy** | Share of problems where the final number is right |
| **format** | Share of replies that close `</think>` and include an `<answer>` |
| **tokens** | Average reply length: the cost of thinking |

Two details keep the comparison fair. We decode **greedily** (always pick the most likely next token), so the same model gives the same answers every time. And we read the answer generously: `<answer>` first, then `\boxed{}`, then the last number in the reply, because the untrained model doesn't know our tags yet and we want to measure its maths, not its manners.

## Step 4: train

Training is ordinary supervised fine-tuning: show the model the teacher's reply and ask it to predict each next token. Three settings deserve a word:

- **LoRA.** Instead of updating all ~500 million weights, we train small add-on matrices (rank 16) on every linear layer. It fits a T4, trains fast, and the result is a few megabytes you can share.
- **Completion-only loss.** With `completion_only_loss=True`, the model is graded only on the teacher's reply, not on copying the question back. This is the default for prompt-completion datasets in TRL; we set it explicitly so you can see it.
- **fp16, not bf16.** TRL turns on bfloat16 by default, but a T4 doesn't support it, so the script checks and falls back to float16 mixed precision.

With 1,000 traces, 2 epochs and 16 traces per update, that's about 125 optimizer steps. Watch two numbers in the log: `loss` should fall, and `mean_token_accuracy` (how often the model's top guess matches the teacher's next token) should rise.

## Step 5: measure again, and read the answers

After training, we grade the same 200 problems with the same settings and print a before/after table. Your exact numbers will depend on the run, so we won't give you ours to aim at. Here is what to look for, and what each pattern means:

| If you see... | It probably means... |
|---|---|
| Format jumps close to 100% | The student learned the `<think>`/`<answer>` layout from the traces |
| Tokens jump a lot | The student copied the teacher's long thinking style |
| Accuracy rises | The copied reasoning is actually helping |
| Accuracy flat, tokens way up | It copied the *style* (long, hesitant thinking) more than the *skill* |
| Replies hit the 1,024-token limit | The student loops or rambles; try fewer epochs or shorter traces |

Then read at least three replies side by side. Does the student now write "wait, let me check"? Are its checks real (recomputing a step) or empty (repeating the same line)? Find one problem it used to get right and now gets wrong, and ask why. A 0.5B model copying a far larger model's thinking won't copy it perfectly, and seeing exactly where it slips is the most useful thing in this lab.

## Common problems

| Problem | Fix |
|---|---|
| `CUDA out of memory` | Lower `MAX_LENGTH` to 768, or `per_device_train_batch_size` to 2 and raise `gradient_accumulation_steps` to 8 |
| Error about bf16 | Make sure `bf16=False, fp16=True` on a T4 (the script does this automatically) |
| Very slow evaluation | Lower `N_EVAL` to 100 while experimenting; use 200 for your final numbers |
| Dataset download fails | Re-run the cell; Hugging Face downloads occasionally time out on Colab |

## Key takeaways

- Distillation by SFT needs no teacher model at runtime, only a dataset of its traces. We used camel-ai/gsm8k_distilled (MIT), about 7,500 R1-style traces on GSM8K training problems.
- Rewrite traces into the format you want the student to produce, and filter what you keep: the student copies style, including length, as well as skill.
- Measure before and after on the same held-out problems with greedy decoding: accuracy, format and length.
- On a T4, use LoRA, completion-only loss and fp16.
- Read real replies: the gap between copying the teacher's style and copying its skill is where small students fail.

## Next up

In **Capstone: train your own reasoning model**, you'll choose your own checkable task, train a model on it with GRPO, measure it honestly and share it on Hugging Face.
