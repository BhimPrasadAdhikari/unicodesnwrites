# Capstone starter repo: train your own small reasoning model

This folder is everything you need for the capstone of *Teach a Small AI to Think* on unicodesnwrites.tech. You pick a task with answers a computer can check, train a small model on it with GRPO, measure it before and after, and share it on Hugging Face.

## What's inside

| File | What it does |
|---|---|
| `tasks/common.py` | The prompt template (`<think>` then `<answer>`), answer parsing and the format reward |
| `tasks/countdown.py` | Countdown numbers game: reach a target using each number once |
| `tasks/units.py` | Unit conversions (km to m, hours to minutes, inches to cm...) |
| `tasks/logic.py` | Tiny logic puzzles: three people, two clues, one question |
| `train.py` | GRPO training with Hugging Face TRL and LoRA, for any task above |
| `evaluate.py` | Accuracy, format rate and average answer length, before and after |
| `selftest.py` | A two-second CPU check that the builders and rewards behave |
| `rubric.md` | How your submission is graded |

Every task file has the same three parts: a **dataset builder** (`build_dataset`), a **correctness reward** (`correctness_reward`) and the list of rewards to train with (`REWARD_FUNCS`, `REWARD_WEIGHTS`).

## Steps

1. **Open a free Colab notebook** and pick *Runtime → Change runtime type → T4 GPU*.
2. **Upload this folder** (or unzip `starter-repo.zip`) and move into it:
   ```bash
   !unzip -q starter-repo.zip -d . && %cd starter-repo
   ```
3. **Install the pinned libraries** (about 2 minutes):
   ```bash
   !pip install -q -r requirements.txt
   ```
4. **Run the self-test.** It needs no GPU and should end with "All self-tests passed."
   ```bash
   !python selftest.py
   ```
5. **Measure the starting point.** Write the numbers down; you need them for your write-up.
   ```bash
   !python evaluate.py --task countdown --runs base=Qwen/Qwen2.5-0.5B-Instruct
   ```
6. **Train.** 300 steps on a T4 takes roughly 1–2 hours. Keep the tab open.
   ```bash
   !python train.py --task countdown --max-steps 300
   ```
7. **Measure again**, with the same test puzzles:
   ```bash
   !python evaluate.py --task countdown --runs base=Qwen/Qwen2.5-0.5B-Instruct trained=outputs/countdown
   ```
8. **Share it.** Log in with a Hugging Face *write* token and upload the saved adapter:
   ```python
   from huggingface_hub import login, create_repo, upload_folder
   login()  # paste your write token when asked
   create_repo("your-name/qwen-countdown", exist_ok=True)
   upload_folder(repo_id="your-name/qwen-countdown", folder_path="outputs/countdown",
                 ignore_patterns=["checkpoint-*"])
   ```
   (Next time you can pass `--hub-model-id your-name/qwen-countdown` to `train.py` and it uploads at the end.)
9. **Write it up** using the checklist in `rubric.md`.

## Make it your own

To add a task, copy `tasks/logic.py`, change the question builder and the correctness check, and register it in `tasks/__init__.py`. Then add a test to `selftest.py`. Good tasks have:

- one right answer a short Python function can check,
- puzzles you can generate by the thousand,
- a starting accuracy above zero but well below 100% (if the model never gets a single one right, every reward in a group is 0 and GRPO has nothing to learn from).

## If something goes wrong

- **Out of memory:** lower `--max-completion-length` to 192, or `--num-generations` to 4.
- **Reward stuck at zero:** check a few samples (`samples_base.jsonl` from step 5). Is the model using the tags? Is your checker too strict?
- **Reward shoots up but answers look silly:** your reward has a loophole. Read ten answers before you trust a number.

Versions: written for `trl==1.16.0`. If you upgrade TRL, check the `GRPOConfig` option names in the official docs.
