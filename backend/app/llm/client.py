"""The one function that calls the LLM provider.

Groq is used through the OpenAI SDK: Groq's API is OpenAI-compatible, so the same code works for
OpenAI itself by changing LLM_PROVIDER. The key comes from the server's environment only.
"""

from openai import OpenAI, OpenAIError

from app.config import settings

# None means the SDK's own default (OpenAI).
BASE_URLS: dict[str, str | None] = {
    "groq": "https://api.groq.com/openai/v1",
    "openai": None,
}
TIMEOUT_SECONDS = 20.0
MAX_ANSWER_TOKENS = 500  # caps the cost and length of every answer


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
            temperature=0.2,  # low: stick to the transcript
            max_completion_tokens=MAX_ANSWER_TOKENS,
        )
    except OpenAIError as error:  # network, auth, rate limit or timeout
        raise LLMUnavailable(str(error)) from error
    answer = response.choices[0].message.content if response.choices else None
    if not answer or not answer.strip():
        raise LLMUnavailable("the model returned an empty answer")
    return answer.strip()
