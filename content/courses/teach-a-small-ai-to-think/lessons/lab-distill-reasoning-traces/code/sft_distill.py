"""Copy a big model's thinking into a small one: SFT on reasoning traces.

Teacher traces: camel-ai/gsm8k_distilled (MIT license), about 7.5k GSM8K
training problems with DeepSeek-R1-style <think> traces and a boxed answer.
Student: Qwen2.5-0.5B-Instruct, trained with LoRA on a free Colab T4.
We measure GSM8K test accuracy and answer length before and after.

    pip install trl==1.16.0 transformers==5.20.2 peft==0.21.2 datasets==5.1.0 accelerate==1.15.0
    python sft_distill.py

Needs a GPU. Roughly 45-60 minutes end to end on a T4 (estimate).
"""
import re
import statistics

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTConfig, SFTTrainer

MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
TRACES = "camel-ai/gsm8k_distilled"
N_TRAIN = 1000      # traces to learn from
MAX_LENGTH = 1024   # tokens; longer traces are skipped so they fit a T4
N_EVAL = 200        # GSM8K test problems for the before/after check
HUB_MODEL_ID = None  # e.g. "your-name/qwen-0.5b-distilled" to upload

SYSTEM_PROMPT = (
    "You are a careful problem solver. First think through the problem step by "
    "step inside <think> </think> tags. Then write only the final answer inside "
    "<answer> </answer> tags."
)
THINK_RE = re.compile(r"<think>(.*?)</think>", re.DOTALL)
BOXED_RE = re.compile(r"\\boxed\{([^{}]*)\}")
ANSWER_RE = re.compile(r"<answer>(.*?)</answer>", re.DOTALL)
NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?")


def to_number(text):
    """The last number in a piece of text (commas and $ removed), or None."""
    found = NUMBER_RE.findall((text or "").replace(",", "").replace("$", ""))
    return float(found[-1]) if found else None


def make_prompt(question):
    return [{"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question}]


def to_example(row):
    """Rewrite one teacher trace into our <think>/<answer> chat format."""
    think = THINK_RE.search(row["reasoning_solution"])
    boxed = BOXED_RE.findall(row["reasoning_solution"])
    answer = to_number(boxed[-1]) if boxed else None
    ok = bool(row["boxed_answer_success"]) and think is not None and answer is not None
    text = ""
    if ok:
        shown = int(answer) if answer == int(answer) else answer  # 18.0 -> 18
        text = f"<think>\n{think.group(1).strip()}\n</think>\n<answer>{shown}</answer>"
    return {
        "prompt": make_prompt(row["problem"]),
        "completion": [{"role": "assistant", "content": text}],
        "keep": ok,
    }


def build_train_set(tokenizer):
    raw = load_dataset(TRACES, split="train").shuffle(seed=0)
    data = raw.map(to_example, remove_columns=raw.column_names)
    data = data.filter(lambda ex: ex["keep"])

    def fits(ex):
        text = tokenizer.apply_chat_template(ex["prompt"] + ex["completion"], tokenize=False)
        return len(tokenizer(text)["input_ids"]) <= MAX_LENGTH

    data = data.filter(fits)
    print(f"{len(data)} traces fit in {MAX_LENGTH} tokens; using {min(N_TRAIN, len(data))}")
    return data.select(range(min(N_TRAIN, len(data)))).remove_columns("keep")


def predicted_number(text):
    """Prefer <answer>, then \\boxed{}, then the last number anywhere."""
    for pattern in (ANSWER_RE, BOXED_RE):
        found = pattern.findall(text)
        if found and to_number(found[-1]) is not None:
            return to_number(found[-1])
    return to_number(text)


@torch.no_grad()
def evaluate(model, tokenizer, problems, golds, max_new_tokens=1024, batch_size=16):
    """Greedy answers on GSM8K test problems: accuracy, format rate, length."""
    model.eval()
    tokenizer.padding_side = "left"
    correct, formatted, lengths, samples = [], [], [], []
    for i in range(0, len(problems), batch_size):
        texts = [tokenizer.apply_chat_template(make_prompt(q), tokenize=False,
                                               add_generation_prompt=True)
                 for q in problems[i:i + batch_size]]
        inputs = tokenizer(texts, return_tensors="pt", padding=True).to(model.device)
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
        for seq, gold in zip(out[:, inputs["input_ids"].shape[1]:], golds[i:i + batch_size]):
            reply = tokenizer.decode(seq, skip_special_tokens=True)
            lengths.append(int((seq != tokenizer.pad_token_id).sum()))
            correct.append(predicted_number(reply) == gold)
            formatted.append("</think>" in reply and ANSWER_RE.search(reply) is not None)
            samples.append(reply)
    return {"accuracy": statistics.fmean(correct), "format": statistics.fmean(formatted),
            "avg_tokens": statistics.fmean(lengths), "sample": samples[0]}


def main():
    tokenizer = AutoTokenizer.from_pretrained(MODEL)
    bf16 = torch.cuda.is_bf16_supported()  # False on a T4, so we use fp16 there

    test = load_dataset("openai/gsm8k", "main", split="test").select(range(N_EVAL))
    problems = test["question"]
    golds = [to_number(a.split("####")[-1]) for a in test["answer"]]

    # 1. Before: the student on its own.
    student = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float16).to("cuda")
    before = evaluate(student, tokenizer, problems, golds)
    del student
    torch.cuda.empty_cache()

    # 2. Train: plain next-token prediction on the teacher's traces.
    train_set = build_train_set(tokenizer)
    tokenizer.padding_side = "right"  # evaluate() switched it to left for generation
    config = SFTConfig(
        output_dir="qwen-0.5b-distilled",
        num_train_epochs=2,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,   # 16 traces per optimizer step
        learning_rate=2e-4,              # LoRA likes a higher rate than full fine-tuning
        lr_scheduler_type="cosine",
        warmup_steps=5,
        max_length=MAX_LENGTH,
        completion_only_loss=True,       # learn the answer, not the question
        gradient_checkpointing=True,
        bf16=bf16,
        fp16=not bf16,
        logging_steps=10,
        save_strategy="no",
        report_to="none",
        seed=0,
    )
    peft_config = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                             target_modules="all-linear", task_type="CAUSAL_LM")
    trainer = SFTTrainer(model=MODEL, args=config, train_dataset=train_set,
                         processing_class=tokenizer, peft_config=peft_config)
    trainer.train()

    # 3. After: same problems, same settings.
    after = evaluate(trainer.model, tokenizer, problems, golds)

    print(f"\n{'':8}{'accuracy':>10}{'format':>9}{'tokens':>8}")
    for name, r in (("before", before), ("after", after)):
        print(f"{name:8}{r['accuracy']:>10.1%}{r['format']:>9.1%}{r['avg_tokens']:>8.0f}")
    print("\nFirst test answer after training:\n", after["sample"][:1500])

    trainer.save_model("qwen-0.5b-distilled")
    if HUB_MODEL_ID:
        trainer.model.push_to_hub(HUB_MODEL_ID)
        tokenizer.push_to_hub(HUB_MODEL_ID)


if __name__ == "__main__":
    main()
