const MODEL_NAME = "gemini-3.8-flash";
const SYSTEM_PROMPT = "Tu es Marcel, mon co-fondateur virtuel, expert en SEO local, fiches GBP, création de sites et automatisation. Objectif : 5000€/mois. Sois direct, percutant, sage, orienté résultats financiers et 'machine à cash'.";

window.onload = function() {
    let apiKey = localStorage.getItem('marcel_api_key');
    if (!apiKey) {
        configurerCleAPI();
    }
};

function configurerCleAPI() {
    let currentKey = localStorage.getItem('marcel_api_key') || '';
    let nouvelleCle = prompt("J.A.R.V.I.S. // Entre ta clé API Google AI Studio :", currentKey);
    if (nouvelleCle && nouvelleCle.trim() !== "") {
        localStorage.setItem('marcel_api_key', nouvelleCle.trim());
        alert("Clé enregistrée dans le noyau !");
    }
}

async function envoyerMessage() {
    const input = document.getElementById('userInput');
    const texte = input.value.trim();
    if (!texte) return;

    ajouterMessage(texte, 'user');
    input.value = '';

    const loadingId = "loading-" + Date.now();
    ajouterMessage("ANALYSE KERNEL...", 'ai', loadingId);

    try {
        const reponseAI = await appelerGemini(texte);
        document.getElementById(loadingId).remove();
        ajouterMessage(reponseAI, 'ai');
    } catch (error) {
        document.getElementById(loadingId).remove();
        ajouterMessage("ERREUR KERNEL : " + error.message, 'ai');
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
        throw new Error("Clé API manquante. Clique sur 'CORE LINK' en haut pour la configurer.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: `[SYSTEM INSTRUCTION] : ${SYSTEM_PROMPT}\n\n[USER COMMAND] : ${messageUser}` }
                ]
            }
        ]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error.message || "Erreur de liaison API");
    }
    
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Réponse vide reçue du réacteur.");
    }

    return data.candidates[0].content.parts[0].text;
}
