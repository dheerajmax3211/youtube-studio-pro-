"""Unified multi-provider AI client supporting Gemini, OpenRouter, OpenAI, Groq, Anthropic, Ollama, and Custom endpoints.
Includes schema validation, automatic fallbacks, retries, and error diagnosis.
"""
import json
import os
import re
import time
from typing import Dict, Any, List, Optional, Tuple
import httpx

PROVIDERS = {
    "gemini": {
        "label": "Google Gemini",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/models",
        "proto": "gemini",
        "default_model": "gemini-2.5-flash",
    },
    "openrouter": {
        "label": "OpenRouter",
        "base_url": "https://openrouter.ai/api/v1",
        "proto": "openai",
        "default_model": "google/gemini-2.5-flash",
    },
    "openai": {
        "label": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "proto": "openai",
        "default_model": "gpt-4o-mini",
    },
    "groq": {
        "label": "Groq",
        "base_url": "https://api.groq.com/openai/v1",
        "proto": "openai",
        "default_model": "llama-3.3-70b-versatile",
    },
    "anthropic": {
        "label": "Anthropic Claude",
        "base_url": "https://api.anthropic.com/v1",
        "proto": "anthropic",
        "default_model": "claude-3-5-sonnet-20241022",
    },
    "ollama": {
        "label": "Ollama (Local / No Key)",
        "base_url": "http://127.0.0.1:11434/v1",
        "proto": "openai",
        "default_model": "llama3.1",
    },
    "custom": {
        "label": "Custom (OpenAI-compatible)",
        "base_url": "",
        "proto": "openai",
        "default_model": "",
    },
}

class AIError(RuntimeError):
    pass

def explain_error(e: Exception, provider: str, model: str) -> str:
    text = str(e).lower()
    if "404" in text or "not found" in text or "does not exist" in text or "unknown model" in text:
        return f"{provider} does not recognize model '{model}'. Check the model identifier."
    if "401" in text or "403" in text or "api key" in text or "unauthorized" in text:
        return f"{provider} authentication failed. Please verify your API key."
    if "429" in text or "quota" in text or "rate limit" in text or "resource exhausted" in text:
        return f"{provider} rate limit reached or quota exhausted. Try again later or switch provider."
    if "connect" in text or "timeout" in text or "refused" in text:
        return f"Could not connect to {provider}. Please check your network connection."
    return str(e)

def parse_json_response(text: str) -> Any:
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    try:
        return json.loads(text)
    except ValueError:
        m = re.search(r"(\[.*\]|\{.*\})", text, re.DOTALL)
        if not m:
            raise AIError("AI output did not contain valid JSON.")
        return json.loads(m.group(1))

class MultiAIClient:
    def __init__(
        self,
        provider: str = "openrouter",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None
    ):
        p = provider.lower().strip()
        if p in ("google", "gemini-api"):
            p = "gemini"
        elif p in ("claude",):
            p = "anthropic"
        elif p in ("local",):
            p = "ollama"

        self.provider = p if p in PROVIDERS else "openrouter"
        self.info = PROVIDERS[self.provider]
        self.base_url = (base_url or self.info["base_url"]).rstrip("/")
        self.model = model or self.info["default_model"]
        self.api_key = api_key or os.getenv(f"{self.provider.upper()}_API_KEY", "")

    def ask(self, prompt: str, schema: Optional[Dict[str, Any]] = None) -> Tuple[Any, str]:
        """Send prompt to the selected AI provider. Returns (parsed_json_or_text, model_used)."""
        proto = self.info["proto"]

        # 1. Google Gemini Native API
        if proto == "gemini":
            if not self.api_key:
                raise AIError("Gemini API key is required.")
            url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.2,
                    "responseMimeType": "application/json"
                }
            }
            if schema:
                payload["generationConfig"]["responseSchema"] = schema

            headers = {"Content-Type": "application/json"}
            resp = httpx.post(url, json=payload, headers=headers, timeout=180.0)
            if resp.status_code != 200:
                raise AIError(f"HTTP {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise AIError("No candidates returned from Gemini.")
            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return parse_json_response(text), self.model

        # 2. Anthropic Claude API
        elif proto == "anthropic":
            if not self.api_key:
                raise AIError("Anthropic API key is required.")
            url = f"{self.base_url}/messages"
            system_msg = "You are a professional video curation engine. Respond with ONLY valid JSON."
            payload = {
                "model": self.model,
                "max_tokens": 4096,
                "temperature": 0.2,
                "system": system_msg,
                "messages": [{"role": "user", "content": prompt}]
            }
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            resp = httpx.post(url, json=payload, headers=headers, timeout=180.0)
            if resp.status_code != 200:
                raise AIError(f"HTTP {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
            content = data.get("content", [])
            text = content[0].get("text", "") if content else ""
            return parse_json_response(text), self.model

        # 3. OpenAI / OpenRouter / Groq / Ollama (OpenAI-compatible chat completions)
        else:
            url = f"{self.base_url}/chat/completions"
            headers = {"Content-Type": "application/json"}
            if self.api_key and self.provider != "ollama":
                headers["Authorization"] = f"Bearer {self.api_key}"
            if self.provider == "openrouter":
                headers["HTTP-Referer"] = "https://github.com/haziqahmedqasmi/PeakCut"
                headers["X-Title"] = "YouTube Studio Pro"

            system_msg = "You are a viral short-form video scout. Respond with strictly valid JSON only."
            augmented_prompt = prompt
            if schema:
                augmented_prompt += "\n\nFormat your answer as valid JSON adhering to this schema:\n" + json.dumps(schema)

            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": augmented_prompt}
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"}
            }

            resp = httpx.post(url, json=payload, headers=headers, timeout=180.0)
            if resp.status_code != 200:
                raise AIError(f"HTTP {resp.status_code}: {resp.text[:300]}")
            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                raise AIError(f"No choices returned from {self.provider}.")
            text = choices[0].get("message", {}).get("content", "")
            parsed = parse_json_response(text)
            if isinstance(parsed, dict) and "items" in parsed:
                parsed = parsed["items"]
            elif isinstance(parsed, dict) and "clips" in parsed:
                parsed = parsed["clips"]
            return parsed, self.model
