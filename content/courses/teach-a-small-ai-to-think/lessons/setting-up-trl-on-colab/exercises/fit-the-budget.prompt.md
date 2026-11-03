# Re-plan the batch for a tighter GPU

Your run crashes with "CUDA out of memory" a few steps in. You decide to:

- keep the group size at `num_generations=8`,
- keep **the same number of completions per optimizer step** (so the learning signal per step does not change),
- halve the number of completions that are processed at once.

1. Write down the new `per_device_train_batch_size` and `gradient_accumulation_steps`.
2. How many distinct questions does each step use now?
3. You also want to try groups of 16 (`num_generations=16`) with the original settings (`per_device_train_batch_size=8`, `gradient_accumulation_steps=2`). Will TRL accept it? If not, give a setting that works and say how many questions each step would use.
4. Name one other setting from the lesson you could lower to save memory, and what it costs.

**Done looks like:** four short answers with numbers.
