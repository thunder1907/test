import os
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from api.app.services.llm import classify_complaint

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
    Process a single complaint text through the Groq LLM pipeline.
    """
    try:
        # Call the Groq LLM Service
        res = classify_complaint(text, channel="web")
        
        reasons = res.priority_reasons + res.suspicious_reasons
        if not reasons:
            reasons = ["Normal processing"]
            
        return {
            "complaint": text,
            "category": res.category,
            "priority": res.priority,
            "status": "Suspicious" if res.is_suspicious else "Valid",
            "reason": reasons,
            "actions": res.recommended_actions
        }
    except Exception as e:
        print(f"LLM Error: {e}")
        return {
            "complaint": text,
            "category": "Error",
            "priority": "Low",
            "status": "Valid",
            "reason": [str(e)],
            "actions": ["Fallback manual review"]
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
