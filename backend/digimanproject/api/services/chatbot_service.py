"""
Chatbot service using GitHub Models (GPT-4o / GPT-4o-mini).

Pipeline:
  1. Single LLM call (fast model: gpt-4o-mini) classifies intent AND answers directly
     for navigation/guide intents — returning JSON with {intent, keywords, genres, answer}.
  2. If intent is 'recommendation' → search MangaTitle DB → inject results into a
     second prompt → full model (gpt-4o) generates a grounded recommendation answer.
"""

import json
import logging
import os
import re
import time

from django.db.models import Q

from openai import OpenAI

from ..models.manga_models import MangaTitle

logger = logging.getLogger(__name__)

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()
GITHUB_MODEL = os.getenv("GITHUB_MODEL", "gpt-4o").strip()
GITHUB_MODEL_FAST = os.getenv("GITHUB_MODEL_FAST", "gpt-4o-mini").strip()

# ---------------------------------------------------------------------------
# Static app context injected into every prompt
# ---------------------------------------------------------------------------
APP_CONTEXT = """\
You are DigiBot, a friendly assistant for Digiman — a manga reading and discovery platform.

About Digiman:
• Free Plan     – limited access to free manga titles/chapters, reading with \
accessibility options, progress tracking, community comments, personalized homepage.
• Basic Plan ($5/month) – unlimited access to all premium manga, everything in Free, \
plus the ability to download chapters and read them offline.

Navigation paths:
  /           → Catalog (home)
  /pricing    → View & subscribe to plans
  /subscription/status → (for logged-in users) View your subscription status & manage auto-renewal
  /history    → (for logged-in users) Your reading history (list of reading progress entries)
  /profile    → (for logged-in users) Your profile
  /settings   → (for logged-in users) Settings for your profile (display name, email, password, etc.) and the platform's display (theme light/dark, etc.)
  /downloads  → Offline downloaded chapters
  /search/advanced → Advanced manga search with filters
  /login      → Log in to your account (for guests / logged-out users)
  /register   → Create a new account (for guests)

Login/registration guidance:
  If the user asks about logging in or registering:
  • If they are already logged in  → direct them to their /profile page.
  • If they are a guest / not logged in → direct them to the /login or /register page.

Access guidance:
  All features should be visible at the top of the page (navigation bar), however some features may be hidden until the user is logged in.
  If the user asks about accessing features with the tag "for logged-in users":
  • If they are already logged in  → direct them as usual.
  • If they are a guest / not logged in → remind them to log in or register before accessing the feature.
  If the user asks about unknown/unsupported features, politely say the platform doesn't support them.

Features: advanced search with genre, author, and publication status filters; \
reading modes (page image fit, progress bar visibility, scrolling direction and paged); \
comments with image attachments and replies; offline downloads and offline reading; \
reading history tracking; dark/light theme; progressive web app (installable); \
DigiBot AI assistant for recommendations and navigation.\
"""

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
_CLASSIFY_AND_ANSWER_PROMPT = """\
{app_context}

Classify the user's message intent and respond accordingly.
Reply ONLY with a valid JSON object — no markdown, no code fences, no explanation.

Intent options:
  "navigation"     – user wants to find a page or UI feature
  "guide"          – user wants help understanding how to use the app
  "recommendation" – user wants manga suggestions or a reading list

JSON schema:
{{
  "intent": "<navigation|guide|recommendation>",
  "keywords": ["<manga search term>", ...],
  "genres":   ["<genre name>", ...],
  "answer": "<2-4 sentence answer if intent is navigation or guide, else null>"
}}

Rules:
• "keywords" and "genres" are ONLY for "recommendation". Set to [] for other intents.
• For "navigation" or "guide": write a concise answer in "answer". \
Include the relevant path if applicable.
• For "recommendation": set "answer" to null — recommendations require a database lookup.
• "genres" should use common manga genre names (e.g. Action, Romance, Fantasy, Horror, \
Comedy, Drama, Sci-Fi, Slice of Life, Sports, Mystery, Thriller, Supernatural).

Previous conversation:
{history}

User message: "{message}"\
"""

_RECOMMENDATION_PROMPT = """\
{app_context}

Recommend manga to the user based on their request. \
Below are real manga titles available on Digiman that match the query.

Available manga:
{manga_list}

Previous conversation:
{history}

User request: {message}

Recommend up to 5 titles from the list above. For each one give the title \
and a brief (1-sentence) reason why it fits. \
If fewer than 5 match well, only recommend those. \
If none match, politely say so and suggest the advanced search at /search/advanced.
DigiBot:\
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _strip_markdown_bold(text: str) -> str:
    """Replace **text** markdown bold syntax with \"text\"."""
    return re.sub(r'\*\*([^*]+)\*\*', r'"\1"', text)


def _build_history_text(history: list) -> str:
    """Convert list of {role, content} dicts into readable text."""
    if not history:
        return "(no previous messages)"
    lines = []
    for msg in history[-6:]:  # keep last 6 turns to avoid token overflow
        role = "User" if msg.get("role") == "user" else "DigiBot"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)


def _llm_generate(prompt: str, model: str = None, retries: int = 3) -> str:
    """Call GitHub Models and return the text response.

    Uses GITHUB_MODEL by default; pass model=GITHUB_MODEL_FAST for faster/cheaper calls.
    Retries up to `retries` times on 429 Rate Limit errors using
    exponential backoff (2 s, 4 s, 8 s).
    """
    model = model or GITHUB_MODEL
    if not GITHUB_TOKEN:
        raise RuntimeError("GITHUB_TOKEN is not set in environment variables.")
    client = OpenAI(
        base_url="https://models.inference.ai.azure.com",
        api_key=GITHUB_TOKEN,
    )
    delay = 2  # initial backoff in seconds
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.7,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            err_str = str(e)
            print(f"[CHATBOT ERROR] {type(e).__name__}: {e}")  # temporary
            logger.error("Chatbot recommendation failed: %s", e)
            is_quota = "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower()
            if is_quota and attempt < retries - 1:
                logger.warning(
                    "GitHub LLM 429 rate-limited (attempt %d/%d). Retrying in %ds…",
                    attempt + 1, retries, delay,
                )
                time.sleep(delay)
                delay *= 2
                continue
            raise  # re-raise on non-quota errors or final attempt


# ---------------------------------------------------------------------------
# Main service
# ---------------------------------------------------------------------------

class ChatbotService:

    # ------------------------------------------------------------------
    # Step 1 – Classify intent and answer directly (navigation / guide)
    # ------------------------------------------------------------------

    @staticmethod
    def _classify_and_answer_direct(message: str, history: list) -> dict:
        """
        Single LLM call (fast model) that classifies intent and, for
        navigation/guide intents, generates the answer in the same response.
        Returns dict: { intent, keywords, genres, answer }
        For recommendation intent, answer is None — a second grounded call follows.
        Falls back to { intent: 'guide', keywords: [], genres: [], answer: None } on error.
        """
        prompt = _CLASSIFY_AND_ANSWER_PROMPT.format(
            app_context=APP_CONTEXT,
            history=_build_history_text(history),
            message=message,
        )
        try:
            raw = _llm_generate(prompt, model=GITHUB_MODEL_FAST)
            raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            data = json.loads(raw)
            intent = data.get("intent", "guide")
            if intent not in ("navigation", "guide", "recommendation"):
                intent = "guide"
            answer = data.get("answer") or None
            # Safety: recommendation must not carry a pre-generated answer (no DB grounding yet)
            if intent == "recommendation":
                answer = None
            return {
                "intent": intent,
                "keywords": [str(k) for k in data.get("keywords", [])],
                "genres": [str(g) for g in data.get("genres", [])],
                "answer": answer,
            }
        except Exception as e:
            logger.warning("Chatbot classify_and_answer failed: %s", e)
            return {"intent": "guide", "keywords": [], "genres": [], "answer": None}

    # ------------------------------------------------------------------
    # Step 2b – Database search + recommendation
    # ------------------------------------------------------------------

    @staticmethod
    def search_manga(keywords: list, genres: list) -> list:
        """Query MangaTitle DB using keywords and genres."""
        qs = MangaTitle.objects.filter(is_visible=True)

        if genres:
            qs = qs.filter(genres__name__in=genres)

        if keywords:
            q = Q()
            for kw in keywords:
                q |= (
                    Q(title__icontains=kw)
                    | Q(description__icontains=kw)
                    | Q(alternative_title__icontains=kw)
                    | Q(author__name__icontains=kw)
                )
            qs = qs.filter(q)

        return list(
            qs.distinct()
            .select_related("author")
            .prefetch_related("genres")[:12]
        )

    @staticmethod
    def format_manga_for_prompt(manga_list: list) -> str:
        if not manga_list:
            return "(no matching manga found in the database)"
        lines = []
        for m in manga_list:
            genres_str = ", ".join(g.name for g in m.genres.all()) or "—"
            author_str = m.author.name if m.author else "Unknown"
            tier = "Premium" if m.is_premium else "Free"
            lines.append(
                f"• {m.title} | Author: {author_str} | Genres: {genres_str} "
                f"| Status: {m.publication_status} | {tier}"
            )
        return "\n".join(lines)

    @staticmethod
    def answer_recommendation(message: str, history: list, keywords: list, genres: list) -> tuple:
        """Returns (answer: str, manga_cards: list[{id, title}])."""
        manga_list = ChatbotService.search_manga(keywords, genres)
        manga_text = ChatbotService.format_manga_for_prompt(manga_list)
        manga_cards = [
            {"id": str(m.id), "title": m.title}
            for m in manga_list
        ]
        prompt = _RECOMMENDATION_PROMPT.format(
            app_context=APP_CONTEXT,
            manga_list=manga_text,
            history=_build_history_text(history),
            message=message,
        )
        try:
            answer = _llm_generate(prompt)
            # Only include titles the LLM actually mentioned in its answer
            answer_lower = answer.lower()
            manga_cards = [
                {"id": str(m.id), "title": m.title}
                for m in manga_list
                if m.title.lower() in answer_lower
            ]
            return answer, manga_cards
        except Exception as e:
            err_str = str(e)
            print(f"[CHATBOT ERROR] {type(e).__name__}: {e}")  # temporary
            logger.error("Chatbot recommendation failed: %s", e)
            if "429" in err_str or "quota" in err_str.lower():
                return (
                    "⚠️ DigiBot is a bit overwhelmed right now (API quota reached). "
                    "Please wait a minute and try again."
                ), []
            return "Sorry, I couldn't generate a recommendation right now. Please try again.", []

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    @staticmethod
    def chat(message: str, history: list) -> dict:
        """
        Full chatbot pipeline.
        Returns: {intent, answer, manga_cards}
        """
        if not message:
            return {"intent": "guide", "answer": "Please send a message.", "manga_cards": []}

        classified = ChatbotService._classify_and_answer_direct(message, history)
        intent = classified["intent"]
        answer = classified.get("answer")
        manga_cards = []

        if intent == "recommendation" or answer is None:
            answer, manga_cards = ChatbotService.answer_recommendation(
                message, history,
                classified["keywords"],
                classified["genres"],
            )

        answer = _strip_markdown_bold(answer)
        return {"intent": intent, "answer": answer, "manga_cards": manga_cards}
