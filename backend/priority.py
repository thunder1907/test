def calculate_priority(text):
    """
    Determine priority using a scoring system based on weighted factors.
    """
    text = text.lower()
    score = 0
    reasons = []
    
    # Define weights for different factors
    severity_words = {"damage": 5, "refund": 4, "broken": 5, "defect": 4}
    sentiment_words = {"angry": 3, "worst": 4, "terrible": 3, "frustrated": 3}
    minor_words = {"delay": 2, "late": 2, "slow": 1}
    urgency_words = {"urgent": 1, "asap": 1, "immediately": 1}
    
    # Factor 1: Severity
    severity_score = sum(weight for word, weight in severity_words.items() if word in text)
    if severity_score > 0:
        score += severity_score
        reasons.append(f"High severity issues detected (+{severity_score} pts)")

    # Factor 2: Sentiment
    sentiment_score = sum(weight for word, weight in sentiment_words.items() if word in text)
    if sentiment_score > 0:
        score += sentiment_score
        reasons.append(f"Negative sentiment expressed (+{sentiment_score} pts)")

    # Factor 3: Minor issues
    minor_score = sum(weight for word, weight in minor_words.items() if word in text)
    if minor_score > 0:
        score += minor_score
        reasons.append(f"Minor issues mentioned (+{minor_score} pts)")

    # Factor 4: Urgency words (low weight)
    urgency_score = sum(weight for word, weight in urgency_words.items() if word in text)
    if urgency_score > 0:
        score += urgency_score
        reasons.append(f"Urgency keywords present (+{urgency_score} pts)")

    # Determine priority based on final score
    priority = "Low"
    if score >= 8:
        priority = "High"
    elif score >= 4:
        priority = "Medium"
        
    if not reasons:
        reasons.append("Routine request, no priority escalators matched")
        
    return priority, reasons
