from flask import Flask, render_template, request, jsonify
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
try:
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    
    genai.configure(api_key=api_key)
    print("Gemini API configured successfully")
    
    # List available models
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Model: {m.name}")
except Exception as e:
    print(f"Error configuring Gemini API: {str(e)}")
    raise

# Initialize the model
try:
    # Using the gemini-2.0-flash model
    model = genai.GenerativeModel('gemini-2.0-flash')
    print("Gemini model initialized successfully")
except Exception as e:
    print(f"Error initializing Gemini model: {str(e)}")
    raise

app = Flask(__name__)

print("Flask app initialized")

# Load goals from file or create empty list
def load_goals():
    if os.path.exists('goals.json'):
        with open('goals.json', 'r') as f:
            return json.load(f)
    return []

# Save goals to file
def save_goals(goals):
    with open('goals.json', 'w') as f:
        json.dump(goals, f)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/goals', methods=['GET', 'POST'])
def goals():
    if request.method == 'GET':
        return jsonify(load_goals())
    elif request.method == 'POST':
        goals = load_goals()
        new_goal = request.json
        goals.append(new_goal)
        save_goals(goals)
        return jsonify({"status": "success"})

@app.route('/api/goals/<int:goal_index>', methods=['DELETE', 'PUT'])
def goal_operations(goal_index):
    try:
        goals = load_goals()
        if 0 <= goal_index < len(goals):
            if request.method == 'DELETE':
                goals.pop(goal_index)
                save_goals(goals)
                return jsonify({"status": "success"})
            elif request.method == 'PUT':
                updated_goal = request.json
                goals[goal_index] = updated_goal
                save_goals(goals)
                return jsonify({"status": "success"})
        return jsonify({"error": "Goal not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        goals = data.get('goals', [])  # Get goals data from request

        # Create context from goals
        goals_context = ""
        if goals:
            goals_context = "Here are the user's current saving goals:\n"
            for goal in goals:
                progress = (goal['currentAmount'] / goal['targetAmount']) * 100
                goals_context += f"- {goal['name']}: ${goal['currentAmount']} of ${goal['targetAmount']} ({(progress):.1f}%)\n"
                goals_context += f"  Target date: {goal['deadline']}\n"

        # Combine user message with goals context
        full_message = f"{goals_context}\n\nUser question: {message}"
        
        print("Sending message to Gemini:", full_message)  # Debug print
        response = model.generate_content(full_message)
        print("Received response from Gemini:", response.text)  # Debug print
        
        return jsonify({'response': response.text})
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")  # Debug print
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True) 