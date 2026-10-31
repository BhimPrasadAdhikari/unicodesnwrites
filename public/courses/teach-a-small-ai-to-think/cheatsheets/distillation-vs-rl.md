# Distillation vs RL

*Teach a Small AI to Think* · unicodesnwrites.tech

**In one line:** RL is learning to cook by experimenting and tasting. Distillation is copying a great chef's recipe notebook.

## How they differ

| | RL (GRPO) | Distillation (SFT on traces) |
|---|---|---|
| Learns from | Its own attempts + a score | A teacher's finished answers |
| Needs | Problems with checkable answers | A stronger teacher, or a dataset of its traces |
| Signal | One number per attempt | A target for every token |
| Can beat the teacher? | Yes, in principle | Rarely |
| Fails when | The model never gets an answer right (all advantages are 0) | It copies the style (layout, length) without the skill |

## Words to know

- **Soft labels:** the teacher's full probabilities ("42: 0.82, 41: 0.11 ..."), not just the top answer (Hinton, Vinyals & Dean, 2015).
- **Temperature:** above 1 flattens soft labels so near-misses show; below 1 sharpens them.
- **Sequence-level distillation:** fine-tune on the teacher's written traces (what "distilled from R1" usually means). No teacher at runtime.

## What the papers found (as reported)

**DeepSeek-R1 (DeepSeek-AI, 2025):** about 800k samples curated with R1 → SFT on Qwen (1.5B, 7B, 14B, 32B) and Llama (8B, 70B).

| Qwen-32B base | AIME 2024 | MATH-500 | GPQA Diamond | LiveCodeBench |
|---|---|---|---|---|
| RL directly (R1-Zero-Qwen-32B) | 47.0% | 91.6% | 55.0% | 40.2% |
| Distilled from R1 | 72.6% | 94.3% | 62.1% | 57.2% |

Even R1-Distill-Qwen-1.5B reported 28.9% on AIME 2024 and 83.9% on MATH-500.

**s1 (Muennighoff et al., 2025):** 1,000 curated examples (s1K) on Qwen2.5-32B-Instruct; "budget forcing" (append "Wait" to think longer).
**LIMO (Ye et al., 2025):** 817 curated examples in v1 (57.1% AIME, 94.8% MATH); a later version reports 63.3% AIME24, 95.6% MATH500.
**Caution:** both used 32B models and heavily filtered data.

## Which one, when?

| Situation | Choose |
|---|---|
| Small model + good teacher traces exist | **Distill** |
| No teacher, answers easy to check, model sometimes right | **RL** |
| Model scores 0% | **Distill or make the task easier, then RL** |
| Need to beat the best existing model | **RL** |
| Distilled model is accurate but too long | **Distill, then RL with a length reward** |

**Default recipe for small models:** distill first (learn the habit) → GRPO with a checkable reward (sharpen it) → watch length.

## Lab settings (TRL 1.16.0, free T4)

`SFTTrainer` + `LoraConfig(r=16, target_modules="all-linear")` · `completion_only_loss=True` · `fp16=True, bf16=False` · `max_length=1024` · data: `camel-ai/gsm8k_distilled` (MIT) · test: GSM8K test split, greedy decoding.
