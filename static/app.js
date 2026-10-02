const question = document.getElementById("question");
const answer = document.getElementById("answer");
const answerBox = document.getElementById("answer-box");
const send = document.getElementById("send");
const imageInput = document.getElementById("imageInput");
const micBtn = document.getElementById("mic-btn");
const ttsBtn = document.getElementById("tts-btn");

let currentXP = 0;
const xpCounter = document.getElementById("xp-counter");
const rankBadge = document.getElementById("rank-badge");

function addXP(points) {
    currentXP += points;
    xpCounter.textContent = currentXP;
    if (currentXP >= 100) rankBadge.textContent = "Master";
    else if (currentXP >= 50) rankBadge.textContent = "Expert";
    else if (currentXP >= 20) rankBadge.textContent = "Scholar";
}

// Suggestion buttons
document.querySelectorAll("[data-question]").forEach(function(button) {
    button.addEventListener("click", function() {
        question.value = button.dataset.question;
        question.focus();
    });
});

// Mobile-Friendly Speech Recognition (via backend)
let mediaRecorder;
let audioChunks = [];

micBtn.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = e => {
            audioChunks.push(e.data);
        };
        
        mediaRecorder.onstop = async () => {
            micBtn.textContent = "⏳ Processing...";
            micBtn.style.background = "#fbbf24";
            
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];
            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');
            
            try {
                const res = await fetch("/api/transcribe", { method: "POST", body: formData });
                const data = await res.json();
                if (data.text) question.value = (question.value + " " + data.text).trim();
            } catch (err) {
                alert("Transcription failed.");
            }
            micBtn.textContent = "🎤 Dictate";
            micBtn.style.background = "#ef4444";
        };
        
        audioChunks = [];
        mediaRecorder.start();
        micBtn.textContent = "🛑 Stop";
        micBtn.style.background = "#3b82f6";
    } catch (err) {
        alert("Microphone access denied or not supported on this browser.");
    }
});

// Text to Speech
ttsBtn.addEventListener("click", () => {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        return;
    }
    const textToRead = answer.innerText;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    window.speechSynthesis.speak(utterance);
});

send.addEventListener("click", async function () {
    const text = question.value.trim();

    if (!text && imageInput.files.length === 0) {
        alert("Please type a question or upload an image first.");
        return;
    }

    answerBox.hidden = false;
    answer.innerHTML = "SparkLearn is thinking...";
    send.disabled = true;

    try {
        let imageBase64 = "";
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const reader = new FileReader();
            imageBase64 = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }

        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: text || "Please explain this image.",
                grade: document.getElementById("grade").value,
                subject: document.getElementById("subject").value,
                image: imageBase64
            })
        });

        const data = await response.json();

        if (response.ok) {
            answer.innerHTML = marked.parse(data.answer);
            addXP(10);
        } else {
            answer.innerHTML = data.error || "Server error.";
        }

    } catch (error) {
        answer.innerHTML = "Connection error: " + error.message;
    }

    send.disabled = false;
});