from flask import Flask, request, jsonify
from analyzer import categorize_complaint
from priority import calculate_priority
from fake_detector import is_suspicious
from recommender import recommend_actions

app = Flask(__name__)

# ─────────────────────────────────────────────
# Frontend UI served at the root route
# ─────────────────────────────────────────────
@app.route('/', methods=['GET'])
def home():
    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Complaint Intelligence & Resolution System</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', sans-serif;
    background: #f8f9fc;
    color: #1e293b;
    min-height: 100vh;
    padding: 2rem 1rem;
  }
  .container { max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 2.5rem; }
  .header h1 {
    font-size: 2rem; font-weight: 800;
    background: linear-gradient(135deg, #7c3aed, #2563eb);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin-bottom: 0.5rem;
  }
  .header p { color: #64748b; font-size: 0.95rem; }
  .card {
    background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;
    padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  textarea {
    width: 100%; min-height: 130px; background: #f8f9fc;
    border: 1px solid #cbd5e1; border-radius: 12px; color: #1e293b;
    font-family: 'Inter', sans-serif; font-size: 0.95rem;
    padding: 1rem; resize: vertical; transition: border-color 0.2s;
  }
  textarea:focus { outline: none; border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
  textarea::placeholder { color: #94a3b8; }
  .btn {
    display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 1rem;
    padding: 0.75rem 2rem; background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.2s;
  }
  .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(124,58,237,0.3); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .spinner { display: none; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .result-card {
    background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;
    padding: 1.5rem 2rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    animation: fadeIn 0.4s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .result-card .complaint-text {
    font-style: italic; color: #64748b; margin-bottom: 1rem;
    padding-bottom: 1rem; border-bottom: 1px solid #e2e8f0;
  }
  .tags { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 1rem; }
  .tag { padding: 0.35rem 0.9rem; border-radius: 20px; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.02em; }
  .tag-category { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
  .tag-high { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .tag-medium { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
  .tag-low { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .tag-valid { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .tag-suspicious { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  .section-title { font-size: 0.8rem; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.08em; margin: 1rem 0 0.5rem; }
  .reason-list, .action-list { list-style: none; padding: 0; }
  .reason-list li, .action-list li { padding: 0.5rem 0.75rem; margin-bottom: 0.35rem; border-radius: 8px; font-size: 0.88rem; }
  .reason-list li { background: #fffbeb; color: #92400e; }
  .action-list li { background: #f0f9ff; color: #0c4a6e; }
  .action-list li::before { content: "-> "; font-weight: 700; color: #2563eb; }
  .error-msg { color: #dc2626; background: #fef2f2; padding: 1rem; border-radius: 10px; margin-top: 1rem; display: none; border: 1px solid #fecaca; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>AI Complaint Intelligence</h1>
    <p>Type a complaint below and get instant AI-powered analysis</p>
  </div>
  <div class="card">
    <textarea id="complaintInput" placeholder="Example: The product I received was completely broken and the packaging was torn apart. I want a refund immediately!"></textarea>
    <br>
    <button class="btn" id="analyzeBtn" onclick="analyzeComplaint()">
      <span class="spinner" id="spinner"></span>
      Analyze Complaint
    </button>
    <div class="error-msg" id="errorMsg"></div>
  </div>
  <div id="results"></div>
</div>
<script>
async function analyzeComplaint() {
  const text = document.getElementById('complaintInput').value.trim();
  const btn = document.getElementById('analyzeBtn');
  const spinner = document.getElementById('spinner');
  const errorMsg = document.getElementById('errorMsg');
  const resultsDiv = document.getElementById('results');
  errorMsg.style.display = 'none';
  if (!text) { errorMsg.textContent = 'Please enter a complaint first.'; errorMsg.style.display = 'block'; return; }
  btn.disabled = true;
  spinner.style.display = 'inline-block';
  try {
    const resp = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complaint: text })
    });
    const data = await resp.json();
    if (resp.ok) {
      resultsDiv.innerHTML = renderResult(data);
    } else {
      errorMsg.textContent = data.error || 'Something went wrong.';
      errorMsg.style.display = 'block';
    }
  } catch (err) {
    errorMsg.textContent = 'Could not connect to server.';
    errorMsg.style.display = 'block';
  } finally {
    btn.disabled = false;
    spinner.style.display = 'none';
  }
}
function renderResult(d) {
  const prioClass = d.priority === 'High' ? 'tag-high' : d.priority === 'Medium' ? 'tag-medium' : 'tag-low';
  const statusClass = d.status === 'Valid' ? 'tag-valid' : 'tag-suspicious';
  return '<div class="result-card">' +
    '<div class="complaint-text">"' + d.complaint + '"</div>' +
    '<div class="tags">' +
      '<span class="tag tag-category">' + d.category + '</span>' +
      '<span class="tag ' + prioClass + '">Priority: ' + d.priority + '</span>' +
      '<span class="tag ' + statusClass + '">Status: ' + d.status + '</span>' +
    '</div>' +
    '<div class="section-title">Reasons</div>' +
    '<ul class="reason-list">' + d.reason.map(function(r) { return '<li>' + r + '</li>'; }).join('') + '</ul>' +
    '<div class="section-title">Recommended Actions</div>' +
    '<ul class="action-list">' + d.actions.map(function(a) { return '<li>' + a + '</li>'; }).join('') + '</ul>' +
  '</div>';
}
</script>
</body>
</html>'''


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
    app.run(debug=True, port=5000)
