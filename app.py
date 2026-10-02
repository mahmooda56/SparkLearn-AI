import os

from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env
load_dotenv()

app = Flask(__name__)

# Get Groq API key
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY is missing from the .env file")

# Create Groq client
client = Groq(api_key=api_key)


# -----------------------------
# HOME PAGE
# -----------------------------
@app.route("/")
def home():
    return render_template("index.html")


# -----------------------------
# AI CHAT API
# -----------------------------
@app.route("/api/chat", methods=["POST"])
def chat():

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No data received."
            }), 400

        question = data.get("question", "").strip()
        grade = data.get("grade", "")
        subject = data.get("subject", "")

        image_data = data.get("image", "")

        if not question:
            return jsonify({
                "error": "Please enter a question."
            }), 400

        # Student-friendly instructions for the AI
        system_prompt = """
You are SparkLearnAI, a friendly AI learning assistant for students.

Your goal is to make learning very easy.

Rules:
- Explain things in simple language.
- Start with the main idea.
- Break difficult concepts into small steps.
- Give a small example when useful.
- Avoid unnecessary complicated words.
- If the student asks a programming question, explain the logic clearly.
- If the student asks for code, give simple working code and explain it.
- Be encouraging and helpful.
- If an image is provided, analyze it carefully to help the student.
- IMPORTANT: At the end of every explanation, ALWAYS give the student a quick practice question or mini-quiz to test their understanding!
"""

        user_prompt = f"""
Student grade/level: {grade}
Subject: {subject}

Student question:
{question}
"""

        messages = [{"role": "system", "content": system_prompt}]
        
        if image_data:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {"type": "image_url", "image_url": {"url": image_data}}
                ]
            })
        else:
            messages.append({
                "role": "user",
                "content": user_prompt
            })

        # Send request to Groq
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            temperature=0.5
        )

        answer = response.choices[0].message.content

        return jsonify({
            "answer": answer
        })

    except Exception as e:

        print("\n========== GROQ ERROR ==========")
        print(e)
        print("================================\n")

        return jsonify({
            "error": "SparkLearn could not answer right now. Check the terminal for the exact error."
        }), 500

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file"}), 400
    
    audio_file = request.files['audio']
    import tempfile
    temp_dir = tempfile.mkdtemp()
    filepath = os.path.join(temp_dir, 'audio.webm')
    audio_file.save(filepath)
    
    try:
        with open(filepath, "rb") as file:
            transcription = client.audio.transcriptions.create(
              file=(filepath, file.read()),
              model="whisper-large-v3",
              response_format="json",
            )
        return jsonify({"text": transcription.text})
    except Exception as e:
        print("Whisper Error:", e)
        return jsonify({"error": str(e)}), 500

# -----------------------------
# START SERVER
# -----------------------------
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)