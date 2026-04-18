def recommend_actions(category, priority, is_suspicious):
    """
    Generate 3-5 actionable steps based on category, priority, and validity.
    Suspicious/fake complaints get immediate deletion and flagging actions.
    """
    actions = []

    # ── Handle suspicious/fake complaints — recommend deletion ──
    if is_suspicious:
        actions.append("⛔ Delete this complaint immediately — flagged as spam or manipulated")
        actions.append("Flag the sender's account for further investigation by the fraud team")
        actions.append("Do NOT process any refund, replacement, or escalation for this complaint")
        actions.append("Log the complaint in the spam/abuse tracking system for pattern analysis")
        actions.append("If repeated offender, consider restricting the sender's complaint privileges")
        return actions[:5]

    # ── Handle based on category ──
    if category == "Product Issue":
        if priority == "High":
            actions.append("Initiate immediate refund or replacement process")
            actions.append("Escalate issue to Quality Assurance team for defect tracking")
        else:
            actions.append("Offer standard product replacement")
            actions.append("Provide product troubleshooting guide if applicable")

    elif category == "Packaging Issue":
        actions.append("Report packaging damage to logistics and warehouse team")
        actions.append("Offer partial refund or credit for the damaged box")
        if priority == "High":
            actions.append("Dispatch a replacement box/packaging material if necessary")

    else:  # Trade Issue
        actions.append("Investigate seller/vendor compliance history")
        actions.append("Contact vendor to mediate the resolution")

    # ── Handle based on priority ──
    if priority == "High":
        actions.append("Assign ticket to a senior customer support agent")
        actions.append("Send immediate apology and acknowledgement email to customer")

    if priority == "Low":
        actions.append("Send standard automated response with resolution timeline")

    # Limit actions to max 5
    return actions[:5]
