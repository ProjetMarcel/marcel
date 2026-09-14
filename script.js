const MODEL_NAME = "gemini-3.8-flash";
const SYSTEM_PROMPT = "Tu es Marcel, mon co-fondateur virtuel, expert en SEO local, fiches GBP, création de sites et automatisation. Objectif : 5000€/mois. Sois direct, percutant, sage, orienté résultats financiers et 'machine à cash'.";

// Vérification de la clé API au chargement dans le navigateur
window.onload = function() {
    let apiKey = localStorage.getItem('marcel_api_key');
    if (!apiKey) {
        configurerCleAPI();
    }
};

function configurerCleAPI() {
    let currentKey = localStorage.getItem('marcel_api_key') || '';
    let nouvelleCle = prompt("Entre ta clé API Google AI Studio pour Marcel :", currentKey);
    if (nouvelleCle && nouvelleCle.trim() !== "") {
        localStorage.setItem('marcel_api_key', nouvelleCle.trim());
        alert("Clé enregistrée en toute sécurité dans ton navigateur !");
    }
}

async function envoyerMessage() {
    const input = document.getElementById('userInput');
    const texte = input.value.trim();
    if (!texte) return;

    ajouterMessage(texte, 'user');
    input.value = '';

    const loadingId = "loading-" + Date.now();
    ajouterMessage("Marcel analyse...", 'ai', loadingId);

    try {
        const reponseAI = await appelerGemini(texte);
        document.getElementById(loadingId).remove();
        ajouterMessage(reponseAI, 'ai');
    } catch (error) {
        document.getElementById(loadingId).remove();
        // ICI : On affiche la vraie erreur technique pour comprendre
        ajouterMessage("ERREUR TECHNIQUE : " + error.message, 'ai');
    }
}

function envoyerPromptPredefini(texte) {
    document.getElementById('userInput').value = texte;
    envoyerMessage();
}

function verifierEntree(e) {
    if (e.key === 'Enter') envoyerMessage();
}

function ajouterMessage(texte, type, id = null) {
    const container = document.getElementById('chat-container');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    if (id) div.id = id;
    div.innerText = texte;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function appelerGemini(messageUser) {
    const apiKey = localStorage.getItem('marcel_api_key');
    if (!apiKey) {
        throw new Error("Clé API manquante");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const payload = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: messageUser }] }]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error.message);
    }
    return data.candidates[0].content.parts[0].text;
}
