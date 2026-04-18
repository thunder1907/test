"""
LLM service: classifies complaints using Groq (with Gemini fallback).
Supports both Groq and Google Gemini backends.
"""

import json
from groq import Groq
from pydantic import BaseModel, Field
from typing import List
from .prompts import SYSTEM_PROMPT

# ── Configure Groq client ─────────────────────────────────────
GROQ_API_KEY = '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'
client = Groq(api_key=GROQ_API_KEY)

# ── Pydantic model for structured LLM output ──────────────────
class LlmClassification(BaseModel):
    """Validates and structures the JSON response from the LLM."""
    category: str = Field(..., description='Complaint category')
    priority: str = Field(..., description='High, Medium, or Low')
    priority_reasons: List[str] = Field(..., description='Reasons for priority')
    is_suspicious: bool = Field(..., description='Whether complaint is fake/spam')
    suspicious_reasons: List[str] = Field(default_factory=list, description='Reasons if suspicious')
    recommended_actions: List[str] = Field(..., description='3-5 actionable steps')
    sentiment: str = Field(..., description='Positive, Neutral, or Negative')
    confidence: float = Field(..., ge=0.0, le=1.0, description='Confidence score')


def classify_complaint(text: str, channel: str = 'web') -> LlmClassification:
    """
    Send a complaint to Groq LLM and return a structured classification.

    Args:
        text: The raw complaint text from the user.
        channel: The source channel (e.g. 'web', 'email', 'phone').

    Returns:
        LlmClassification: Pydantic model with all classification fields.

    Raises:
        ValueError: If the LLM response cannot be parsed.
    """
    user_prompt = f'Channel: {channel}\n\nComplaint:\n{text}'

    response = client.chat.completions.create(
        model='llama-3.1-8b-instant',
        messages=[
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_prompt},
        ],
        temperature=0.2,
        max_tokens=400,
        response_format={'type': 'json_object'},
    )

    raw_json = response.choices[0].message.content.strip()

    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as e:
        raise ValueError(f'LLM returned invalid JSON: {e}\nRaw: {raw_json}')

    return LlmClassification(**parsed)
