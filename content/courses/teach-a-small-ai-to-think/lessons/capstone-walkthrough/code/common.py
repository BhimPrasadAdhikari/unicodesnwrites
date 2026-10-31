"""Pieces every task shares: the prompt template, answer parsing, format reward."""
import re

SYSTEM_PROMPT = (
    "You are a careful problem solver. First think through the problem step by "
    "step inside <think> </think> tags. Then write only the final answer inside "
    "<answer> </answer> tags."
)

FORMAT_RE = re.compile(r"^\s*<think>.*?</think>\s*<answer>.*?</answer>\s*$", re.DOTALL)
ANSWER_RE = re.compile(r"<answer>(.*?)</answer>", re.DOTALL)


def make_prompt(question):
    """A conversational prompt: a system message plus the user's question."""
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]


def completion_text(completion):
    """TRL passes plain strings or a list of chat messages; return the text."""
    if isinstance(completion, str):
        return completion
    return completion[0]["content"]


def extract_answer(text):
    """The text inside the last <answer>...</answer>, or None."""
    found = ANSWER_RE.findall(text)
    return found[-1].strip() if found else None


def format_reward(completions, **kwargs):
    """1.0 if the whole reply is <think>...</think> then <answer>...</answer>."""
    return [1.0 if FORMAT_RE.match(completion_text(c)) else 0.0 for c in completions]


def word_count(text):
    """A tokenizer-free length measure, used for quick length checks."""
    return len(text.split())
