const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash"];
const N = 180, $ = id => document.getElementById(id);
const J = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } };
const S = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iso = d => d.toLocaleDateString('sv');

const PH = [
    ["FONDATIONS", "Offre, niche, site vitrine, fiche GBP de démo"],
    ["PROSPECTION", "Machine de prospection locale, 10 contacts/jour"],
    ["PREMIERS CLIENTS", "Closer 2-3 clients, livrer, collecter des avis"],
    ["AUTOMATISATION", "Scripts et process pour gagner du temps"],
    ["SCALE", "Doubler les clients, installer la récurrence"],
    ["5000€/MOIS", "Optimiser les marges, upsell, stabiliser"]
];
const TPL = ["Prospection : 10 contacts", "Création site / contenu", "Suivi clients et relances", "Audit GBP et SEO local", "Automatisation / script", "Bilan hebdo et chiffres", "Repos stratégique"];

let start = localStorage.getItem('marcel_start');
if (!start) { start = iso(new Date()); localStorage.setItem('marcel_start', start); }
let plan = J('marcel_plan', {}), chat = J('marcel_chat', []), sel = 0;

const dayNum = () => Math.min(N, Math.max(1, Math.round((new Date(iso(new Date())) - new Date(start)) / 864e5) + 1));
const task = n => plan[n]?.t || TPL[(n - 1) % 7];
const done = n => !!plan[n]?.d;
const setPlan = (n, p) => { plan[n] = { ...plan[n], ...p }; S('marcel_plan', plan); };
const getMemory = () => localStorage.getItem('marcel_memory') || "Statut initial : projet lancé. Objectif 5000€/mois. Aucune action enregistrée. En attente du plan d'attaque.";

function stats() {
    const t = dayNum(); let c = 0;
    for (let i = 1; i <= N; i++) if (done(i)) c++;
    let s = 0, i = done(t) ? t : t - 1;
    while (i > 0 && done(i)) { s++; i--; }
    return { t, c, s };
}

function renderStats() {
    const { t, c, s } = stats(), p = c / N;
    $('ring').style.strokeDashoffset = 213.6 * (1 - p);
    $('pct').textContent = Math.round(p * 100) + '%';
    $('t-day').textContent = `JOUR ${t}/${N}`;
    $('t-streak').textContent = `SÉRIE ${s} JOUR${s > 1 ? 'S' : ''} · ${c} VALIDÉS`;
}

function renderPlan(anim = true) {
    const { t } = stats(); let h = '';
    for (let m = 0; m < 6; m++) {
        const a = m * 30 + 1; let d = 0;
        for (let i = a; i < a + 30; i++) if (done(i)) d++;
        h += `<div class="month" style="--i:${m}"><div class="mh"><b>M${m + 1} · ${PH[m][0]}</b><span>${d}/30</span></div><p>${PH[m][1]}</p><div class="cells">`;
        for (let i = a; i < a + 30; i++) {
            const c = done(i) ? 'ok' : i < t ? 'miss' : i == t ? 'now' : '';
            h += `<button class="cell ${c} ${i == sel ? 'sel' : ''}" style="--i:${i - a}" onclick="pick(${i})">${i}</button>`;
        }
        h += '</div></div>';
    }
    $('v-plan').classList.toggle('static', !anim);
    $('grid').innerHTML = h;
    renderDetail();
}

function renderDetail() {
    const n = sel, d = new Date(start); d.setDate(d.getDate() + n - 1);
    $('detail').innerHTML = `<div class="dh"><b>JOUR ${n}</b><span>${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
<p class="ph">M${Math.floor((n - 1) / 30) + 1} · ${PH[Math.floor((n - 1) / 30)][1]}</p>
<input type="text" id="dt" value="${esc(task(n))}">
<button class="send-btn" onclick="toggle(${n})">${done(n) ? 'ANNULER LA VALIDATION' : 'VALIDER LE JOUR ✓'}</button>`;
    $('dt').onchange = e => setPlan(n, { t: e.target.value.trim() });
}

function pick(n) { sel = n; renderPlan(false); }
function toggle(n) { setPlan(n, { d: !done(n) }); renderPlan(false); renderStats(); }
function resetPlan() {
    if (!confirm("Repartir du jour 1 aujourd'hui ? Les tâches et validations seront effacées.")) return;
    start = iso(new Date()); localStorage.setItem('marcel_start', start);
    plan = {}; S('marcel_plan', plan); sel = dayNum() - 1; pick(dayNum()); renderStats();
}

function scrollChat() { const c = $('chat-container'); c.scrollTop = c.scrollHeight; }
function bubble(r, t, anim) {
    const d = document.createElement('div');
    d.className = 'message ' + (r == 'user' ? 'user' : 'ai');
    $('chat-container').appendChild(d);
    if (anim) {
        let i = 0;
        const k = setInterval(() => { d.textContent = t.slice(0, i += 3); scrollChat(); if (i >= t.length) clearInterval(k); }, 12);
    } else d.textContent = t;
    scrollChat();
    return d;
}
function push(r, t) { chat.push({ r, t, ts: Date.now() }); S('marcel_chat', chat); }

function configurerCleAPI() {
    const n = prompt("J.A.R.V.I.S. // Entre ta clé API Google AI Studio :", localStorage.getItem('marcel_api_key') || '');
    if (n && n.trim()) { localStorage.setItem('marcel_api_key', n.trim()); alert("Clé enregistrée dans le noyau !"); }
}

async function envoyerMessage() {
    const i = $('userInput'), txt = i.value.trim();
    if (!txt) return;
    i.value = '';
    push('user', txt); bubble('user', txt);
    const l = bubble('ai', '');
    l.classList.add('typing'); l.innerHTML = '<i></i><i></i><i></i>';
    try {
        const r = await appelerGemini();
        l.remove(); push('model', r); bubble('model', r, true);
    } catch (e) {
        l.remove(); chat.pop(); S('marcel_chat', chat);
        bubble('model', "ERREUR KERNEL : " + e.message);
    }
}
function envoyerPromptPredefini(t) { $('userInput').value = t; envoyerMessage(); }
function verifierEntree(e) { if (e.key === 'Enter') envoyerMessage(); }

// Applique les balises de Marcel (PLAN, DONE, MEMO_UPDATE) et les retire du texte affiché
function tags(x) {
    x = x.replace(/\[PLAN:\s*(\d+)\s*\|\s*([^\]]+)\]/g, (_, n, v) => { if (n >= 1 && n <= N) setPlan(+n, { t: v.trim() }); return ''; });
    x = x.replace(/\[DONE:\s*(\d+)\s*\]/g, (_, n) => { if (n >= 1 && n <= N) setPlan(+n, { d: true }); return ''; });
    const i = x.indexOf('[MEMO_UPDATE:');
    if (i > -1) {
        const j = x.lastIndexOf(']');
        if (j > i) { localStorage.setItem('marcel_memory', x.slice(i + 13, j).trim()); x = x.slice(0, i) + x.slice(j + 1); }
    }
    renderPlan(false); renderStats();
    return x.trim();
}

async function appelerGemini() {
    const key = localStorage.getItem('marcel_api_key');
    if (!key) throw new Error("Clé API manquante. Clique sur 'CORE LINK' en haut pour la configurer.");
    const { t, c, s } = stats();
    const sys = `Tu es Marcel, mon co-fondateur virtuel, expert en SEO local, fiches GBP, création de sites et automatisation. Objectif : 5000€/mois en 6 mois. Sois direct, percutant, sage, orienté résultats financiers.
[MÉMOIRE ACTUELLE] ${getMemory()}
[PLAN] Aujourd'hui = jour ${t}/${N}, phase ${PH[Math.floor((t - 1) / 30)][0]}. Tâche du jour : ${task(t)}. Jours validés : ${c}. Série : ${s}.
[DIRECTIVES] À la fin de ta réponse, sur de nouvelles lignes :
- si tu définis ou modifies la tâche d'un jour : [PLAN: numéro_du_jour | tâche] (une balise par jour)
- si j'indique avoir terminé un jour : [DONE: numéro_du_jour]
- TOUJOURS : [MEMO_UPDATE: tes notes actualisées, actions faites, résultats, prochaine étape]`;
    let h = chat.slice(-20);
    while (h.length && h[0].r != 'user') h.shift();
    const contents = h.map(m => ({ role: m.r, parts: [{ text: m.t }] }));
    let err;
    for (const m of MODELS) {
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents })
            });
            const d = await r.json();
            if (d.error) { err = new Error(d.error.message); continue; }
            const x = d.candidates?.[0]?.content?.parts?.map(p => p.text).join('');
            if (x) return tags(x);
        } catch (e) { err = e; }
    }
    throw err || new Error("Tous les modèles sont temporairement indisponibles.");
}

function renderHist() {
    const q = $('hs').value.toLowerCase(); let day = '', h = '';
    chat.filter(m => m.t.toLowerCase().includes(q)).reverse().forEach((m, i) => {
        const d = new Date(m.ts), k = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        if (k != day) { day = k; h += `<div class="dsep">${k}</div>`; }
        h += `<div class="hi ${m.r == 'user' ? 'user' : ''}" style="--i:${Math.min(i, 15)}"><small>${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${m.r == 'user' ? 'TOI' : 'MARCEL'}</small>${esc(m.t)}</div>`;
    });
    $('hl').innerHTML = h || '<p class="empty">Aucun message pour le moment.</p>';
}
function exporter() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ chat, plan, start, memoire: getMemory() }, null, 2)], { type: 'application/json' }));
    a.download = 'marcel-export.json'; a.click();
}
function viderHist() {
    if (!confirm("Supprimer tout l'historique des messages ?")) return;
    chat = []; S('marcel_chat', chat); $('chat-container').innerHTML = ''; renderHist();
}

document.querySelectorAll('nav button').forEach((b, i) => b.onclick = () => {
    document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x == b));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id == 'v-' + b.dataset.v));
    $('ind').style.transform = `translateX(${i * 100}%)`;
    if (b.dataset.v == 'plan') renderPlan(true);
    if (b.dataset.v == 'hist') renderHist();
    if (b.dataset.v == 'chat') scrollChat();
});

// Fond animé : réseau de particules
(function () {
    const c = $('bg'), x = c.getContext('2d'); let w, h, P = [];
    const rs = () => {
        w = c.width = innerWidth; h = c.height = innerHeight;
        P = Array.from({ length: Math.min(60, w * h / 15000 | 0) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: Math.random() - .5, vy: Math.random() - .5 }));
    };
    rs(); addEventListener('resize', rs);
    (function f() {
        x.clearRect(0, 0, w, h);
        P.forEach((p, i) => {
            p.x = (p.x + p.vx * .4 + w) % w; p.y = (p.y + p.vy * .4 + h) % h;
            x.fillStyle = '#00f0ff'; x.fillRect(p.x, p.y, 2, 2);
            for (let j = i + 1; j < P.length; j++) {
                const q = P[j], d = Math.hypot(p.x - q.x, p.y - q.y);
                if (d < 110) { x.strokeStyle = `rgba(0,240,255,${.18 * (1 - d / 110)})`; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); x.stroke(); }
            }
        });
        requestAnimationFrame(f);
    })();
})();

window.onload = () => {
    if (!localStorage.getItem('marcel_api_key')) configurerCleAPI();
    sel = dayNum();
    if (chat.length) chat.forEach(m => bubble(m.r, m.t)); else bubble('model', "[SYSTEM INITIALIZED] Salut Boss. Interface J.A.R.V.I.S. activée. Prêt pour la machine à cash. Quelle est la mission ?");
    renderStats(); renderPlan(true);
};
