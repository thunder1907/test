import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from analyzer import categorize_complaint
from priority import calculate_priority
from fake_detector import is_suspicious
from recommender import recommend_actions

app = Flask(__name__, static_folder='../web/out', static_url_path='/')
CORS(app)

# ─────────────────────────────────────────────
# Next.js Frontend served at the root route
# ─────────────────────────────────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')


def process_single_complaint(text):
    """
    Process a single complaint text through all modular logic pipelines.
    """
    # 1. Categorize
    category = categorize_complaint(text)
    
    # 2. Priority
    priority, priority_reasons = calculate_priority(text)
    
    # 3. Fake detection
    suspicious, fake_reasons = is_suspicious(text)
    status = "Suspicious" if suspicious else "Valid"
    
    # Combine reasons
    all_reasons = priority_reasons + fake_reasons
    if not all_reasons:
        all_reasons = ["Normal processing"]
        
    # 4. Recommend actions
    actions = recommend_actions(category, priority, suspicious)
    
    return {
        "complaint": text,
        "category": category,
        "priority": priority,
        "status": status,
        "reason": all_reasons,
        "actions": actions
    }

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    POST /analyze endpoint handling single or multiple complaints.
    """
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "Invalid JSON input"}), 400
        
    # Case 1: Single complaint
    if "complaint" in data and isinstance(data["complaint"], str):
        result = process_single_complaint(data["complaint"])
        return jsonify(result), 200
        
    # Case 2: Multiple complaints
    elif "complaints" in data and isinstance(data["complaints"], list):
        results = [process_single_complaint(c) for c in data["complaints"]]
        
        # Sort by priority: High (0) > Medium (1) > Low (2)
        priority_map = {"High": 0, "Medium": 1, "Low": 2}
        results.sort(key=lambda x: priority_map.get(x["priority"], 3))
        
        return jsonify(results), 200
        
    else:
        return jsonify({"error": "Missing 'complaint' string or 'complaints' array in payload"}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
