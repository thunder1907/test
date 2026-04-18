def is_suspicious(text):
    """
    Detect suspicious/fake complaints based on textual heuristics.
    Catches keyword-spamming where someone repeats urgency or
    high-priority words many times to game the system.
    """
    text_lower = text.lower()
    words = text.split()
    reasons = []
    suspicious = False

    # ── 1. Repeated urgency words (spamming "urgent", "asap", etc.) ──
    urgency_words = ["urgent", "asap", "immediately", "quick", "fast", "now"]
    urgency_count = sum(text_lower.count(word) for word in urgency_words)
    if urgency_count >= 3:
        suspicious = True
        reasons.append(f"Excessive urgency keyword spam detected ({urgency_count} occurrences) — likely fake")

    # ── 2. Repeated severity/high-priority words (spamming "damage", "refund", etc.) ──
    severity_words = ["damage", "damaged", "broken", "refund", "defect", "worst", "terrible"]
    severity_count = sum(text_lower.count(word) for word in severity_words)
    if severity_count >= 4:
        suspicious = True
        reasons.append(f"Excessive severity keyword repetition ({severity_count} occurrences) — appears manipulated")

    # ── 3. High ratio of spam words to total words ──
    # If more than 50% of the words are urgency/severity keywords, it's likely fake
    all_spam_words = urgency_words + severity_words
    spam_word_count = sum(text_lower.count(word) for word in all_spam_words)
    if len(words) >= 3 and (spam_word_count / len(words)) > 0.5:
        suspicious = True
        reasons.append("Over 50% of the message consists of priority/urgency keywords — suspicious pattern")

    # ── 4. Very short complaints (less than 3 words) ──
    if len(words) < 3:
        suspicious = True
        reasons.append("Complaint is unusually short (less than 3 words)")

    # ── 5. No real issue keywords (long text but no actual problem described) ──
    issue_keywords = [
        "broken", "damaged", "defect", "wrong", "package",
        "box", "refund", "delay", "missing", "issue", "problem",
        "received", "order", "product", "delivery", "quality"
    ]
    has_issue = any(word in text_lower for word in issue_keywords)
    if not has_issue and len(words) >= 3:
        suspicious = True
        reasons.append("Lacks specific product or service issue keywords — no real complaint found")

    return suspicious, reasons
