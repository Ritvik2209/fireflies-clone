"""The one function that calls the LLM provider.

Groq is used through the OpenAI SDK: Groq's API is OpenAI-compatible, so the same code works for
OpenAI itself by changing LLM_PROVIDER. The key comes from the server's environment only.
"""

from openai import OpenAI, OpenAIError, omit

from app.config import settings

# None means the SDK's own default (OpenAI).
BASE_URLS: dict[str, str | None] = {
    "groq": "https://api.groq.com/openai/v1",
    "openai": None,
}
TIMEOUT_SECONDS = 20.0
TEMPERATURE = 0.5  # Groq's advice for reasoning models is 0.5-0.7: lower can repeat itself
# Caps the cost and length of every answer. A reasoning model's thinking counts towards it.
MAX_ANSWER_TOKENS = 1_000


class LLMUnavailable(Exception):
    """No key is configured, or the provider failed or timed out. The caller falls back."""


def complete(messages: list[dict[str, str]]) -> str:
    """Sends the chat messages and returns the model's answer, or raises LLMUnavailable."""
    if not settings.llm_api_key:
        raise LLMUnavailable("no LLM_API_KEY is set")
    if settings.llm_provider not in BASE_URLS:
        raise LLMUnavailable(f"unknown LLM_PROVIDER {settings.llm_provider!r}")
    client = OpenAI(
        api_key=settings.llm_api_key,
        base_url=BASE_URLS[settings.llm_provider],
        timeout=TIMEOUT_SECONDS,
        max_retries=1,
    )
    try:
        response = client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,  # type: ignore[arg-type]  (plain dicts, the SDK's documented shape)
            temperature=TEMPERATURE,
            max_completion_tokens=MAX_ANSWER_TOKENS,
            # Reasoning models think before answering; "low" keeps that short. Others reject it.
            reasoning_effort="low" if _is_reasoning_model(settings.llm_model) else omit,
        )
    except OpenAIError as error:  # network, auth, rate limit, retired model or timeout
        raise LLMUnavailable(str(error)) from error
    answer = response.choices[0].message.content if response.choices else None
    if not answer or not answer.strip():
        raise LLMUnavailable("the model returned an empty answer")
    return answer.strip()


def _is_reasoning_model(model: str) -> bool:
    """Groq's gpt-oss models (the default) reason before they answer."""
    return "gpt-oss" in model
