# Setting up a real run on a free GPU

Everything so far has run on a lookup table that fits in a text message. Now we swap the table for a real language model, Qwen2.5-0.5B-Instruct: half a billion numbers, a vocabulary of over 150,000 tokens, and answers that are hundreds of tokens long. The loop stays the same. What changes is plumbing: memory, precision, batch sizes and versions.

The good news is that you do not have to write that plumbing yourself. Hugging Face's TRL library has a `GRPOTrainer` that implements the exact equation from the last lesson. Your job is to choose the knobs well for a free Colab GPU.

**In this lesson** you will walk through `train_grpo.py`, the training script used by the module 5 notebook. You will see how the GRPO symbols become config options, why we train small "LoRA" adapters instead of the whole model, how to fit everything on a free T4 GPU, and how to check the model before and after training on questions it never saw. The script targets **TRL 1.16.0** with transformers 5.20.2, peft 0.21.2 and datasets 5.1.0, all pinned in the notebook.

## What a free Colab GPU gives you

When you choose *Runtime → Change runtime type → T4 GPU* in Colab, you get an NVIDIA T4. Three facts about it shape every choice in the script:

| Fact | Why it matters |
|---|---|
| About 15 GB of usable GPU memory | The model, its gradients, optimizer state and all the generated answers must fit |
| No fast bfloat16 support | We use `fp16` mixed precision instead of the `bf16` most tutorials assume |
| Sessions time out (and free GPU time is limited) | The run must finish in roughly an hour, and should save checkpoints along the way |

A free session is not guaranteed; on a busy day Colab may not give you a GPU at all. If that happens, try again later, or use any GPU with at least 15 GB.

## The plan in one table

Here is how each idea from module 4 becomes a setting:

| Idea | Tiny Adder | Real run (`GRPOConfig`) |
|---|---|---|
| Questions | random `a + b` | GSM8K grade-school word problems |
| Group size `G` | `G=8` | `num_generations=8` |
| Grader | `k == a + b` | format reward + correctness reward |
| Learning rate | `lr=0.5` | `learning_rate=1e-5` |
| KL strength `β` | `beta` | `beta=0.04` |
| Clip range `ε` | `eps=0.2` | `epsilon=0.2`, `epsilon_high=0.28` |
| Inner steps per batch | `ppo_epochs=1` | `num_iterations=1` (the default) |
| Answer length | one token | up to `max_completion_length=256` tokens |

The data is GSM8K (Cobbe et al., 2021): about 8,500 grade-school maths word problems. Each comes with a worked solution that ends in `#### 42`, the final number. That number is all our grader needs.

## Walking through `train_grpo.py`

Open the code walkthrough beside this article. Here are the important parts.

### The prompt

We tell the model the format we want, every time:

```python
SYSTEM_PROMPT = (
    "Solve the maths problem. First think step by step inside <think> </think>, "
    "then give only the final number inside <answer> </answer>."
)
```

Each training example becomes a short chat: this system message, then the word problem as the user message. TRL applies Qwen's chat template for us.

### Two rewards, the same as your rewards lab

The rewards follow the same rules as `rewards.py` from module 2. A reward function in TRL receives the generated `completions` (plus any dataset columns as keyword arguments) and returns one number per completion:

```python
def format_reward(completions, **kwargs):
    """0.5 for the exact <think>...</think><answer>...</answer> shape."""
    return [0.5 if FORMAT_PATTERN.match(completion_text(c)) else 0.0 for c in completions]


def correctness_reward(completions, answer, **kwargs):
    """1.0 when the number in <answer> matches GSM8K's number after ####."""
    return [1.0 if is_correct(completion_text(c), a) else 0.0 for c, a in zip(completions, answer)]
```

Notice `answer` in the second function. GSM8K has a column called `answer`, so TRL passes it in by name. The `**kwargs` swallows everything else TRL sends (the prompts, the trainer state and so on). TRL adds the two rewards together, so a tidy, correct answer scores 1.5, and logs each one separately so you can watch them.

Why make format worth only half as much? Format is easy to learn and you want it, but correctness is the goal. If format paid as much as correctness, the model could earn a lot of reward by being neat and wrong.

### The config: GRPO's knobs

```python
per_device_train_batch_size=8,      # 8 completions per micro-batch...
gradient_accumulation_steps=2,      # ...x2 = 16 completions = 2 prompts x 8 per step
num_generations=8,                  # the group size G
max_completion_length=256,          # thinking budget in tokens
```

In TRL, batch sizes count *completions*, not questions. Each optimizer step here sees 16 completions: 2 questions, each with a group of 8. That is much smaller than real research runs, but it is what fits on a T4. The total must be divisible by `num_generations`, or TRL will refuse to start.

```python
beta=0.04,                          # KL leash (0.0 = off; then "kl" is not logged)
epsilon=0.2,
epsilon_high=0.28,                  # DAPO's "clip-higher"
loss_type="dapo",                   # token-level loss (TRL's default)
scale_rewards="group",              # divide by the group's std, as in GRPO
mask_truncated_completions=True,    # don't learn from cut-off answers
```

These are the equation choices from the last lesson. `loss_type="dapo"` averages over all tokens in the batch (avoiding the per-answer length bias). `scale_rewards="group"` is the original GRPO advantage; set it to `"none"` to try Dr. GRPO's version. `mask_truncated_completions=True` follows a DAPO recommendation: an answer that hit the 256-token limit was cut off mid-thought, so its reward says little about its quality, and it is left out of the loss.

We set a small `beta` mostly so you can see a KL curve in the logs. TRL's default is `beta=0.0`.

```python
bf16=False, fp16=True,              # a T4 has no bfloat16
model_init_kwargs={"dtype": "float32"},  # full precision weights, fp16 maths
```

TRL turns on `bf16` by default, which would fail or crawl on a T4. We keep the stored weights in full 32-bit precision and let `fp16` mixed precision do the heavy maths in 16-bit.

### LoRA: train a small add-on, not the whole model

```python
lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.0, task_type="CAUSAL_LM",
                  target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                                  "gate_proj", "up_proj", "down_proj"])
```

Training all 500 million weights needs memory for the weights, their gradients and two optimizer numbers per weight. LoRA (Hu et al., 2021) freezes the original model and trains small "adapter" matrices beside some of its layers instead. Think of it as clipping a thin, trainable lens onto a camera rather than rebuilding the camera.

| | Full fine-tuning | LoRA (r = 16) |
|---|---|---|
| What is trained | every weight | small adapter matrices, about 9 million numbers (under 2% of the model) |
| Optimizer memory | large | tiny |
| Reference model for KL | a full second copy | free: the base model with the adapter switched off |
| What you save | a full model | a small adapter folder |

That last row is a nice bonus: with LoRA, TRL computes the reference probabilities by temporarily disabling the adapter, so `beta > 0` costs almost no extra memory.

Because only a small adapter is learning, we use a higher learning rate (`1e-5`) than TRL's default of `1e-6`, which is tuned for full fine-tuning. Treat it as a starting point, not a law; the next module shows how to tell from the curves whether it is too high or too low.

### The trainer

```python
trainer = GRPOTrainer(
    model=model_id,
    reward_funcs=[format_reward, correctness_reward],
    args=make_config(output_dir, max_steps),
    train_dataset=load_gsm8k("train"),
    peft_config=lora,
)
trainer.train()
```

That is the whole GRPO loop from your numpy file: sample groups, grade, normalize, clip, step. TRL handles generation, tokenization, the ratio, the KL estimator and logging.

### Evaluation on questions it never saw

The training reward tells you how the model does on questions it is learning from. The real test is the GSM8K **test** split, which training never touches. `evaluate()` asks the first 200 test questions with greedy decoding (always pick the most likely token, so results are repeatable), and reports two numbers: accuracy and how often the answer used the requested format.

You run it twice: before training, to get a baseline, and after, on the trained adapter. The difference is your result. Remember the Tiny Adder's buggy grader: this held-out check is how you catch a model that learned to please the grader rather than to do maths.

## Running it

In the notebook, the whole thing is three cells:

```bash
!pip install -q trl==1.16.0 transformers==5.20.2 peft==0.21.2 datasets==5.1.0 accelerate==1.15.0
!python train_grpo.py --eval-only            # baseline on 200 test questions
!python train_grpo.py --max-steps 250        # train, then evaluate the adapter
```

**How long will it take?** Our estimate for 250 steps on a free T4 is roughly an hour, plus a few minutes for each evaluation. That is an estimate from the batch sizes and typical T4 generation speed, not a measured benchmark; your run may be faster or slower depending on how long the answers get. Before committing an hour, do a smoke test with `--max-steps 10` to make sure everything works.

Checkpoints are saved every 50 steps (`save_steps=50`), so a timed-out session does not lose everything.

### What about Unsloth?

Unsloth is a popular library that patches models for faster, lower-memory training and has its own GRPO notebooks for free Colab GPUs. It is a good choice if you want larger models (for example 1.5B or 3B) on a T4, or faster generation. We use plain TRL in this course because it has fewer moving parts, matches the TRL documentation one-to-one, and the 0.5B model fits without tricks. Everything you learn about the knobs and the curves transfers directly.

## If something goes wrong at the start

| Error or symptom | Likely cause | Fix |
|---|---|---|
| "CUDA out of memory" | answers too long or batch too big | lower `max_completion_length` to 192, or `per_device_train_batch_size` to 4 with `gradient_accumulation_steps=4` |
| Complaint about divisibility by `num_generations` | completions per step not a multiple of G | keep `per_device_train_batch_size × gradient_accumulation_steps` a multiple of 8 |
| bf16 error | the config defaulted to bf16 | make sure `bf16=False, fp16=True` |
| No GPU found | runtime type is CPU | Runtime → Change runtime type → T4 GPU |
| Version errors on import | Colab updated a library | rerun the pinned `pip install` cell, then Runtime → Restart session |

## Key takeaways

- TRL's `GRPOTrainer` implements the GRPO loop you built; your job is choosing the knobs. Every symbol from the equation has a `GRPOConfig` option.
- A free T4 has about 15 GB and no fast bf16, so we use `fp16=True`, a 0.5B model, LoRA adapters, 256-token answers and 2 questions × 8 answers per step.
- Reward functions take `completions` plus dataset columns by name and return one float each. Correctness should pay more than format.
- Always evaluate before and after on held-out questions. The training reward alone can lie.

## Next up

In **Lab: teach Qwen to solve maths word problems** you will run the full notebook end to end, compare before and after, look at real answers, and save (and optionally share) your first reasoning model.
