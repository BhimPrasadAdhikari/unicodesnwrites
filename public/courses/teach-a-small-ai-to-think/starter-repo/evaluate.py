"""Measure accuracy, format rate and answer length, before and after training.

Compare the base model with your trained adapter on held-out puzzles:
    python evaluate.py --task countdown --runs base=Qwen/Qwen2.5-0.5B-Instruct trained=outputs/countdown

Score answers you already saved (one JSON object with a "completion" per line,
in the same order as the test puzzles), no GPU needed:
    python evaluate.py --task countdown --completions my_answers.jsonl
"""
import argparse
import json
import statistics

from tasks import get_task
from tasks.common import format_reward, word_count


def score(task, rows, completions):
    """Pure-Python scoring: works on CPU, no model needed."""
    columns = {key: [row[key] for row in rows] for key in rows[0] if key != "prompt"}
    correct = task.correctness_reward(completions, **columns)
    formatted = format_reward(completions)
    return {
        "accuracy": statistics.fmean(correct),
        "format_rate": statistics.fmean(formatted),
        "avg_words": statistics.fmean(word_count(c) for c in completions),
    }


def load_model(name_or_path):
    """Load a full model, or a LoRA adapter on top of its base model."""
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    try:
        from peft import AutoPeftModelForCausalLM, PeftConfig

        base_name = PeftConfig.from_pretrained(name_or_path).base_model_name_or_path
        model = AutoPeftModelForCausalLM.from_pretrained(name_or_path, dtype=dtype)
        tokenizer = AutoTokenizer.from_pretrained(base_name)
    except Exception:  # not an adapter (or peft missing): load a full model
        model = AutoModelForCausalLM.from_pretrained(name_or_path, dtype=dtype)
        tokenizer = AutoTokenizer.from_pretrained(name_or_path)
    tokenizer.padding_side = "left"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    return model.to(device).eval(), tokenizer


def generate(name_or_path, rows, max_new_tokens=256, batch_size=16):
    """Greedy answers for every row, plus each answer's length in tokens."""
    import torch

    model, tokenizer = load_model(name_or_path)
    completions, token_counts = [], []
    for start in range(0, len(rows), batch_size):
        batch = rows[start:start + batch_size]
        texts = [
            tokenizer.apply_chat_template(r["prompt"], tokenize=False, add_generation_prompt=True)
            for r in batch
        ]
        inputs = tokenizer(texts, return_tensors="pt", padding=True).to(model.device)
        with torch.no_grad():
            out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
        new_tokens = out[:, inputs["input_ids"].shape[1]:]
        for seq in new_tokens:
            n = int((seq != tokenizer.pad_token_id).sum())
            token_counts.append(n)
            completions.append(tokenizer.decode(seq, skip_special_tokens=True))
    return completions, token_counts


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--task", default="countdown")
    p.add_argument("--n", type=int, default=200, help="number of test puzzles")
    p.add_argument("--seed", type=int, default=0)
    p.add_argument("--runs", nargs="*", default=[], help="label=model_or_adapter ...")
    p.add_argument("--completions", help="score a JSONL file instead of generating")
    p.add_argument("--max-new-tokens", type=int, default=256)
    args = p.parse_args()

    task = get_task(args.task)
    rows = task.build_dataset(args.n, seed=args.seed, split="test")

    results = {}
    if args.completions:
        with open(args.completions, encoding="utf-8") as f:
            completions = [json.loads(line)["completion"] for line in f if line.strip()]
        results["file"] = score(task, rows[:len(completions)], completions)
    for run in args.runs:
        label, _, path = run.partition("=")
        completions, tokens = generate(path, rows, args.max_new_tokens)
        results[label] = score(task, rows, completions)
        results[label]["avg_tokens"] = statistics.fmean(tokens)
        with open(f"samples_{label}.jsonl", "w", encoding="utf-8") as f:
            for c in completions:
                f.write(json.dumps({"completion": c}) + "\n")

    print(f"{'run':<12}{'accuracy':>10}{'format':>9}{'words':>8}{'tokens':>8}")
    for label, r in results.items():
        tokens = f"{r['avg_tokens']:.0f}" if "avg_tokens" in r else "-"
        print(f"{label:<12}{r['accuracy']:>10.1%}{r['format_rate']:>9.1%}"
              f"{r['avg_words']:>8.0f}{tokens:>8}")


if __name__ == "__main__":
    main()
