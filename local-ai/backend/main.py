import json
import mimetypes
import os
import sys
import uuid
from urllib.parse import unquote, urlparse
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from models import Conversation, Message
from ollama_client import OllamaClient, OllamaError
from prompts import SYSTEM_PROMPT

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "settings.json"
CONVERSATIONS_DIR = ROOT / "data" / "conversations"
FRONTEND_DIR = ROOT / "frontend"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def settings() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def write_settings(config: dict) -> None:
    allowed = {
        "model", "system_prompt", "temperature", "max_output_tokens",
        "context_length", "theme", "font_size", "streaming", "timeout_seconds",
    }
    current = settings()
    current.update({key: value for key, value in config.items() if key in allowed})
    CONFIG_PATH.write_text(json.dumps(current, indent=2) + "\n", encoding="utf-8")


def context_messages(messages: list[Message], max_chars: int) -> list[Message]:
    selected: list[Message] = []
    used = 0
    for message in reversed(messages):
        cost = len(message.content)
        if selected and used + cost > max_chars:
            break
        selected.insert(0, message)
        used += cost
    return selected


def load_conversation(conversation_id: str) -> Conversation:
    path = CONVERSATIONS_DIR / f"{conversation_id}.json"
    if not path.is_file():
        raise KeyError(conversation_id)
    raw = json.loads(path.read_text(encoding="utf-8"))
    return Conversation(
        id=raw["id"],
        title=raw["title"],
        messages=[Message(**message) for message in raw["messages"]],
        created_at=raw["created_at"],
        updated_at=raw["updated_at"],
    )


def save_conversation(conversation: Conversation) -> None:
    CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)
    path = CONVERSATIONS_DIR / f"{conversation.id}.json"
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(conversation.to_dict(), indent=2), encoding="utf-8")
    temporary.replace(path)


def list_conversations() -> list[dict]:
    result = []
    for path in CONVERSATIONS_DIR.glob("*.json"):
        try:
            conversation = load_conversation(path.stem)
            result.append(
                {
                    "id": conversation.id,
                    "title": conversation.title,
                    "updated_at": conversation.updated_at,
                }
            )
        except (OSError, KeyError, json.JSONDecodeError):
            continue
    return sorted(result, key=lambda item: item["updated_at"], reverse=True)


class Handler(BaseHTTPRequestHandler):
    server_version = "LocalAI/1.0"

    def log_message(self, format: str, *args) -> None:
        sys.stderr.write(f"{self.address_string()} - {format % args}\n")

    def send_json(self, data: dict, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self) -> None:
        route = urlparse(self.path).path
        if route == "/api/config":
            config = settings()
            self.send_json({key: config[key] for key in (
                "model", "ollama_url", "system_prompt", "temperature",
                "max_output_tokens", "context_length", "theme", "font_size", "streaming",
            )})
            return
        if route == "/api/settings":
            self.send_json(settings())
            return
        if route == "/api/health":
            config = settings()
            client = OllamaClient(config["ollama_url"], config["model"], 5)
            running, models = client.health()
            model_available = config["model"] in models
            self.send_json({
                "ollama_running": running,
                "model": config["model"],
                "model_available": model_available,
                "models": models,
                "error": None if running and model_available else (
                    "The selected model is not installed." if running
                    else "Ollama is not running."
                ),
            })
            return
        if route == "/api/conversations":
            self.send_json({"conversations": list_conversations()})
            return
        if route.startswith("/api/conversations/"):
            try:
                conversation = load_conversation(unquote(route.rsplit("/", 1)[-1]))
            except KeyError:
                self.send_json({"error": "Conversation not found."}, HTTPStatus.NOT_FOUND)
                return
            self.send_json(conversation.to_dict())
            return
        self.serve_frontend()

    def do_DELETE(self) -> None:
        route = urlparse(self.path).path
        if not route.startswith("/api/conversations/"):
            self.send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)
            return
        path = CONVERSATIONS_DIR / f"{unquote(route.rsplit('/', 1)[-1])}.json"
        if not path.is_file():
            self.send_json({"error": "Conversation not found."}, HTTPStatus.NOT_FOUND)
            return
        path.unlink()
        self.send_json({"ok": True})

    def do_POST(self) -> None:
        if urlparse(self.path).path == "/api/chat":
            self.chat()
            return
        self.send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)

    def do_PUT(self) -> None:
        route = urlparse(self.path).path
        if route == "/api/settings":
            try:
                payload = self.read_json()
                write_settings(payload)
                self.send_json(settings())
            except (ValueError, json.JSONDecodeError, OSError) as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return
        if route.startswith("/api/conversations/"):
            try:
                conversation = load_conversation(unquote(route.rsplit("/", 1)[-1]))
                payload = self.read_json()
                title = str(payload.get("title", "")).strip()[:80]
                if not title:
                    raise ValueError("Title cannot be empty.")
                conversation.title = title
                conversation.updated_at = now()
                save_conversation(conversation)
                self.send_json(conversation.to_dict())
            except (KeyError, ValueError, json.JSONDecodeError) as exc:
                self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
            return
        self.send_json({"error": "Not found."}, HTTPStatus.NOT_FOUND)

    def chat(self) -> None:
        try:
            request = self.read_json()
            user_text = str(request.get("message", "")).strip()
            if not user_text:
                raise ValueError("Message cannot be empty.")
            conversation_id = str(request.get("conversation_id") or uuid.uuid4().hex)
            try:
                conversation = load_conversation(conversation_id)
            except KeyError:
                timestamp = now()
                conversation = Conversation(
                    conversation_id, user_text[:60], [], timestamp, timestamp
                )
            config = settings()
            regenerating = bool(request.get("regenerate"))
            if regenerating and conversation.messages and conversation.messages[-1].role == "assistant":
                conversation.messages.pop()
            if not regenerating or not conversation.messages or conversation.messages[-1].role != "user":
                conversation.messages.append(Message("user", user_text))
            client = OllamaClient(config["ollama_url"], config["model"], config["timeout_seconds"])
            prompt_messages = [{"role": "system", "content": config.get("system_prompt", SYSTEM_PROMPT)}]
            prompt_messages += [message.to_dict() for message in context_messages(
                conversation.messages, int(config.get("context_length", 12000)) * 4
            )]
            chunks = client.chat(
                prompt_messages,
                stream=bool(config.get("streaming", True)),
                temperature=float(config.get("temperature", 0.2)),
                max_output_tokens=int(config.get("max_output_tokens", 2048)),
                context_length=int(config.get("context_length", 12000)),
            )
            try:
                first_chunk = next(chunks)
            except StopIteration:
                first_chunk = ""
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/x-ndjson; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "close")
            self.end_headers()
            answer_parts: list[str] = []
            for chunk in ([first_chunk] if first_chunk else []):
                answer_parts.append(chunk)
                self.wfile.write((json.dumps({"delta": chunk}) + "\n").encode("utf-8"))
                self.wfile.flush()
            for chunk in chunks:
                answer_parts.append(chunk)
                self.wfile.write((json.dumps({"delta": chunk}) + "\n").encode("utf-8"))
                self.wfile.flush()
            answer = "".join(answer_parts)
            conversation.messages.append(Message("assistant", answer))
            conversation.updated_at = now()
            save_conversation(conversation)
            self.wfile.write((json.dumps({"done": True, "conversation": conversation.to_dict()}) + "\n").encode("utf-8"))
            self.wfile.flush()
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except OllamaError as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_GATEWAY)

    def serve_frontend(self) -> None:
        relative = self.path.lstrip("/") or "index.html"
        requested = (FRONTEND_DIR / relative).resolve()
        if FRONTEND_DIR not in requested.parents or not requested.is_file():
            requested = FRONTEND_DIR / "index.html"
        content_type = mimetypes.guess_type(requested.name)[0] or "application/octet-stream"
        body = requested.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run() -> None:
    config = settings()
    host, port = config["host"], int(os.environ.get("PORT", config["port"]))
    CONVERSATIONS_DIR.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Local AI running at http://127.0.0.1:{port}")

    server.serve_forever()


if __name__ == "__main__":
    run()
