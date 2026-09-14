const MODEL_NAME = "gemini-3.1-pro-preview";

// Récupération ou initialisation de la mémoire persistante de Marcel
function getMemory() {
    return localStorage.getItem('marcel_memory') || "Statut initial : Projet lancé. Objectif 5000€/mois. Aucune action majeure enregistrée pour l'instant. En attente du plan d'attaque.";
}

function saveMemory(newMemory) {
    localStorage.setItem('marcel_memory', newMemory);
    console.log("Mémoire mise à jour :", newMemory);
}

// Historique des messages de la session en cours
let chatHistory = [];

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
    if (!input) return;
    const texte = input.value.trim();
    if (!texte) return;

    ajouterMessage(texte, 'user');
    input.value = '';

    const loadingId = "loading-" + Date.now();
    ajouterMessage("ANALYSE KERNEL & MEMO...", 'ai', loadingId);

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
    const input = document.getElementById('userInput');
    if (input) {
        input.value = texte;
        envoyerMessage();
    }
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
    
    // Récupération de la mémoire actuelle
    const currentMemory = getMemory();

    const systemPrompt = `Tu es Marcel, mon co-fondateur virtuel, expert en SEO local, fiches GBP, création de sites et automatisation. Objectif : 5000€/mois. 
Sois direct, percutant, sage, orienté résultats financiers et 'machine à cash'.

[TES NOTES PERSONNELLES / MÉMOIRE ACTUELLE SUR L'AVANCEMENT] :
${currentMemory}

[DIRECTIVE SPECIALE] : 
À la fin de ta réponse, tu dois impérativement mettre à jour tes notes personnelles en fonction de ce qui vient d'être dit, validé ou fait. Écris ta mise à jour sur une nouvelle ligne sous ce format strict :
[MEMO_UPDATE: Rédige ici tes notes actualisées pour toi-même, résumant les actions faites, les résultats et la prochaine étape à suivre demain.]`;

    // Ajout du message utilisateur à l'historique de session
    chatHistory.push({
        role: "user",
        parts: [{ text: messageUser }]
    });

    const messagesForApi = [
        {
            role: "user",
            parts: [{ text: `[INSTRUCTION SYSTEME & MEMOIRE]\n${systemPrompt}\n\nCompris. C'est parti.` }]
        },
        {
            role: "model",
            parts: [{ text: "Compris Boss. Mémoire chargée, je suis prêt à suivre le plan et à consigner chaque avancée." }]
        },
        ...chatHistory
    ];

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: messagesForApi })
    });

    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error.message || "Erreur de liaison API");
    }
    
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Réponse vide reçue du réacteur.");
    }

    let rawResponseText = data.candidates[0].content.parts[0].text;

    // Extraction du [MEMO_UPDATE: ...] rédigé par Marcel
    const memoMatch = rawResponseText.match(/\[MEMO_UPDATE:\s*([\s\S]*?)\]/);
    if (memoMatch && memoMatch[1]) {
        const newMemo = memoMatch[1].trim();
        saveMemory(newMemo);
        rawResponseText = rawResponseText.replace(memoMatch[0], "").trim();
    }

    // Sauvegarde de la réponse de l'IA dans l'historique de session
    chatHistory.push({
        role: "model",
        parts: [{ text: rawResponseText }]
    });

    return rawResponseText;
}
