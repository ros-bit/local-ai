import json
import urllib.error
import urllib.request
from collections.abc import Iterator


class OllamaError(RuntimeError):
    pass


class OllamaClient:
    def __init__(self, base_url: str, model: str, timeout: int = 180):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def chat(
        self,
        messages: list[dict[str, str]],
        stream: bool = True,
        temperature: float = 0.2,
        max_output_tokens: int = 2048,
        context_length: int = 12000,
    ) -> Iterator[str]:
        payload = json.dumps({
            "model": self.model,
            "messages": messages,
            "stream": stream,
            "keep_alive": "10m",
            "options": {
                "temperature": temperature,
                "num_predict": max_output_tokens,
                "num_ctx": context_length,
            },
            "think": False,
        }).encode("utf-8")
        request = urllib.request.Request(
            f"{self.base_url}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            response = urllib.request.urlopen(request, timeout=self.timeout)
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise OllamaError(f"Ollama returned HTTP {exc.code}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise OllamaError(
                "Ollama is not running. Start Ollama with `ollama serve`."
            ) from exc

        with response:
            for line in response:
                if not line.strip():
                    continue
                try:
                    item = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise OllamaError("Ollama returned invalid JSON.") from exc
                if item.get("error"):
                    raise OllamaError(str(item["error"]))
                content = item.get("message", {}).get("content", "")
                if content:
                    yield content

    def health(self) -> tuple[bool, list[str]]:
        request = urllib.request.Request(f"{self.base_url}/api/tags", method="GET")
        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                data = json.loads(response.read())
            return True, [item.get("name", "") for item in data.get("models", [])]
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return False, []
