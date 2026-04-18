import requests

# The URL of our backend API
url = "http://127.0.0.1:5000/analyze"

# The complaint data we want to test
data = {
    "complaint": "The package arrived extremely late, and the product was completely broken. I am very angry and want a refund ASAP!"
}

print("Sending complaint to the backend...\n")

try:
    # Send the POST request to our API
    response = requests.post(url, json=data)
    
    # Print the API's response
    print("Backend Response:")
    print(response.json())
except requests.exceptions.ConnectionError:
    print("Error: Could not connect. Make sure your Flask server (python app.py) is running in another terminal!")
