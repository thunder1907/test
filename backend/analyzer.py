def categorize_complaint(text):
    """
    Classify complaint using keywords into predefined categories.
    """
    text = text.lower()
    
    # Keywords for different categories
    product_keywords = ["broken", "damaged", "defect", "wrong product"]
    packaging_keywords = ["package", "packaging", "box"]
    
    # Check for Product Issue
    if any(keyword in text for keyword in product_keywords):
        return "Product Issue"
        
    # Check for Packaging Issue
    elif any(keyword in text for keyword in packaging_keywords):
        return "Packaging Issue"
        
    # Otherwise
    else:
        return "Trade Issue"
