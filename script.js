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
const TPL = ["Prospection : 10 contacts qualifiés + 3 relances", "Livraison clients : GBP / site / SEO", "Parrainage : relancer 3 ambassadeurs", "Prospection : 10 contacts + 1 RDV démo", "Preuves : avis, avant/après, cas client", "Closing : RDV, devis, signatures", "Bilan chiffres + préparer la semaine"];

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
        h += `<div class="month" style="--i:${m}"><div class="mh"><b>M${m + 1} · ${PH[m][0]}</b><span>${d}/30</span></div><p>${PH[m][1]} · cap ${OBJ[m]} €</p><div class="cells">`;
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
${ctx()}
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

/* ===== v6 : cap financier, parrainage, alertes, notifications ===== */
const OBJ = [500, 1200, 2000, 3000, 4000, 5000];
const ST = ['RECOMMANDÉ', 'CONTACTÉ', 'SIGNÉ', '1er MOIS PAYÉ'];
let cfg = J('marcel_cfg', { prix: 200, mrr: 0, conv: 10 }), ref = J('marcel_ref', { amb: [], lead: [] });
const expd = t => { const m = Math.floor((t - 1) / 30), a = m ? OBJ[m - 1] : 0; return a + (OBJ[m] - a) * (((t - 1) % 30) + 1) / 30; };
const go = v => document.querySelector(`nav button[data-v="${v}"]`).click();
const saveRef = () => S('marcel_ref', ref);

function ctx() {
    const pd = ref.lead.filter(l => l.st == 3).length;
    return `[CAP] MRR actuel ${cfg.mrr}€, prix moyen ${cfg.prix}€/mois, objectif 5000€. [PARRAINAGE] Règles : ambassadeur client = 1 mois de prestation offert quand un pro recommandé signe et paie son 1er mois ; ambassadeur proche = 50€ cash ; le nouveau client a 50€ de réduction sur son 1er mois. ${ref.amb.length} ambassadeurs, ${ref.lead.length} recommandations, ${pd} payées.`;
}

function alerts() {
    const { t, s } = stats(), a = [], h = new Date().getHours(), now = Date.now();
    if (!done(t) && h >= 17) a.push({ t: s > 2 ? `Série de ${s} jours en danger` : `Jour ${t} à valider`, v: 'plan' });
    let m = 0; for (let i = Math.max(1, t - 7); i < t; i++) if (!done(i)) m++;
    if (m >= 3) a.push({ t: `${m} jours ratés sur 7`, v: 'plan' });
    const e = expd(t); if (cfg.mrr < e * .8) a.push({ t: `MRR ${cfg.mrr}€ vs ${Math.round(e)}€ attendus`, v: 'cap' });
    if (!ref.amb.length) a.push({ t: 'Ajoute tes premiers ambassadeurs', v: 'ref' });
    ref.lead.filter(l => l.st < 2 && now - l.u > 2592e5).forEach(l => a.push({ t: `Relancer ${l.n}`, v: 'ref' }));
    const due = ref.lead.filter(l => l.st == 3 && !l.r).length;
    if (due) a.push({ t: `${due} récompense${due > 1 ? 's' : ''} à honorer`, v: 'ref' });
    return a;
}

function renderAlerts() {
    let el = $('al');
    if (!el) { el = document.createElement('div'); el.id = 'al'; document.querySelector('.hud-banner').after(el); }
    const a = alerts();
    let h = ('Notification' in window && Notification.permission != 'granted') ? '<button class="chip on" onclick="activerNotifs()">ACTIVER LES NOTIFS</button>' : '';
    h += a.map(x => `<button class="chip" onclick="go('${x.v}')">${esc(x.t)}</button>`).join('');
    el.innerHTML = h; el.style.display = h ? 'flex' : 'none';
    a.length ? navigator.setAppBadge?.(a.length) : navigator.clearAppBadge?.();
}
const _rs = renderStats; renderStats = () => { _rs(); renderAlerts(); };

async function notif(t, b) {
    if (!('Notification' in window) || Notification.permission != 'granted') return;
    const r = await navigator.serviceWorker?.getRegistration();
    r ? r.showNotification(t, { body: b, icon: 'icon.svg', badge: 'icon.svg', tag: t }) : new Notification(t, { body: b, icon: 'icon.svg' });
}
async function activerNotifs() {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.register('sw.js').catch(() => { });
    if (await Notification.requestPermission() == 'granted') notif('MARCEL', 'Alertes actives : briefing à 9h, bilan à 18h.');
    renderAlerts();
}
function tick() {
    const d = new Date(), k = iso(d), h = d.getHours();
    [[9, 'MATIN'], [18, 'SOIR']].forEach(([H, n]) => {
        const key = 'marcel_n_' + n;
        if (h >= H && h < H + 4 && localStorage.getItem(key) != k) {
            localStorage.setItem(key, k); const a = alerts().map(x => x.t).join('\n');
            notif(n == 'MATIN' ? `Jour ${dayNum()} · ${task(dayNum())}` : 'Bilan du soir', a || 'Rien en retard. Valide ta journée.');
        }
    });
}

function ics() {
    let o = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MARCEL//FR\r\n';
    for (let n = 1; n <= N; n++) {
        const d = new Date(start); d.setDate(d.getDate() + n - 1);
        const D = iso(d).replace(/-/g, '');
        o += `BEGIN:VEVENT\r\nUID:marcel-${n}@hud\r\nDTSTAMP:${D}T000000Z\r\nDTSTART:${D}T090000\r\nDTEND:${D}T093000\r\nSUMMARY:Marcel J${n} · ${task(n).replace(/[,;\n]/g, ' ')}\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Marcel J${n}\r\nTRIGGER:PT0S\r\nEND:VALARM\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Valide ta journée J${n}\r\nTRIGGER:PT9H30M\r\nEND:VALARM\r\nEND:VEVENT\r\n`;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([o + 'END:VCALENDAR'], { type: 'text/calendar' }));
    a.download = 'marcel-plan.ics'; a.click();
}

function renderCap() {
    const { t } = stats(), e = expd(t), p = Math.min(100, cfg.mrr / 50), reste = Math.max(0, 5000 - cfg.mrr);
    const mois = Math.max(1, 6 - (t - 1) / 30), pm = Math.ceil(reste / cfg.prix / mois), ct = Math.ceil(pm / (cfg.conv / 100) / 4.3);
    $('v-cap').innerHTML = `<div class="scroll"><div class="panel"><div class="dh"><b>CAP 5000 €/MOIS</b><span>attendu J${t} : ${Math.round(e)} €</span></div>
<div class="bar"><i style="width:${p}%"></i><u style="left:${Math.min(100, e / 50)}%"></u></div>
<div class="dh"><span>MRR actuel : ${cfg.mrr} €</span><span>${Math.round(p)}%</span></div></div>
<div class="tiles"><div><b>${Math.ceil(reste / cfg.prix)}</b>clients à signer</div><div><b>${pm}</b>signatures / mois</div><div><b>${ct}</b>contacts / semaine</div><div><b>${Math.ceil(5000 / cfg.prix)}</b>clients au total</div></div>
<div class="panel"><label>MRR actuel (€/mois)</label><input type="text" inputmode="numeric" id="c-m" value="${cfg.mrr}">
<label>Prix moyen d'un client (€/mois)</label><input type="text" inputmode="numeric" id="c-p" value="${cfg.prix}">
<label>Taux de closing (% de contacts qui signent)</label><input type="text" inputmode="numeric" id="c-c" value="${cfg.conv}">
<button class="send-btn" onclick="saveCfg()">ENREGISTRER</button>
<button class="quick-btn" onclick="ics()">EXPORTER LE PLAN VERS MON CALENDRIER (.ics)</button></div>
<p class="note">Le prix et le taux de closing sont des hypothèses : remplace-les par tes vrais chiffres. Caps de fin de mois : ${OBJ.join(' / ')} €.</p></div>`;
}
function saveCfg() {
    cfg = { prix: Math.max(1, +$('c-p').value || 200), mrr: Math.max(0, +$('c-m').value || 0), conv: Math.min(100, Math.max(1, +$('c-c').value || 10)) };
    S('marcel_cfg', cfg); renderCap(); renderStats();
}

function renderRef() {
    const A = ref.amb, L = ref.lead, am = id => A.find(a => a.id == id) || { nom: '?', type: 'client' }, cl = l => am(l.a).type == 'client';
    const pd = L.filter(l => l.st == 3), cred = pd.filter(l => !l.r && cl(l)).length, cash = pd.filter(l => !l.r && !cl(l)).length * 50;
    const cost = pd.length * 50 + pd.filter(cl).length * cfg.prix + pd.filter(l => !cl(l)).length * 50;
    $('v-ref').innerHTML = `<div class="scroll"><div class="tiles"><div><b>${cred}</b>mois à offrir</div><div><b>${cash} €</b>à virer</div><div><b>${pd.length * cfg.prix} €</b>MRR apporté</div><div><b>${cost} €</b>coût du programme</div></div>
<div class="panel"><div class="dh"><b>AMBASSADEURS · ${A.length}</b></div><div class="row"><input type="text" id="an" placeholder="Nom"><select id="at"><option value="client">client</option><option value="proche">proche</option></select><button class="quick-btn" onclick="addAmb()">AJOUTER</button></div>
<div class="row"><button class="quick-btn" onclick="pitch('client')">PITCH CLIENT</button><button class="quick-btn" onclick="pitch('proche')">PITCH PROCHE</button></div></div>
<div class="panel"><div class="dh"><b>RECOMMANDATIONS · ${L.length}</b></div>${A.length ? `<div class="row"><input type="text" id="ln" placeholder="Pro recommandé"><select id="la">${A.map(a => `<option value="${a.id}">${esc(a.nom)}</option>`).join('')}</select><button class="quick-btn" onclick="addLead()">AJOUTER</button></div>` : '<p class="ph">Ajoute d\'abord un ambassadeur.</p>'}</div>
${L.map(l => `<div class="hi lead"><small>via ${esc(am(l.a).nom)} · ${am(l.a).type}</small><b>${esc(l.n)}</b><div class="steps">${ST.map((s, i) => `<i class="${i <= l.st ? 'on' : ''}"></i>`).join('')}</div><div class="row"><button class="quick-btn" onclick="adv(${l.id})">${ST[l.st]}${l.st < 3 ? ' → ' + ST[l.st + 1] : ''}</button>${l.st == 3 ? `<button class="quick-btn" onclick="rw(${l.id})">${l.r ? 'RÉCOMPENSE FAITE ✓' : cl(l) ? 'MOIS OFFERT À ACCORDER' : 'VIREMENT 50 € À FAIRE'}</button>` : ''}</div></div>`).join('')}</div>`;
}
function addAmb() { const n = $('an').value.trim(); if (!n) return; ref.amb.push({ id: Date.now(), nom: n, type: $('at').value }); saveRef(); renderRef(); renderStats(); }
function addLead() { const n = $('ln').value.trim(); if (!n) return; ref.lead.push({ id: Date.now(), n, a: +$('la').value, st: 0, u: Date.now() }); saveRef(); renderRef(); renderStats(); }
function adv(id) {
    const l = ref.lead.find(x => x.id == id); if (l.st >= 3) return;
    l.st++; l.u = Date.now(); saveRef();
    if (l.st == 3) { boom(); navigator.vibrate?.(80); }
    renderRef(); renderStats();
}
function rw(id) { const l = ref.lead.find(x => x.id == id); l.r = !l.r; saveRef(); renderRef(); renderStats(); }
function pitch(type) {
    const t = type == 'client'
        ? "Salut ! Tu connais un pro (commerçant, artisan…) qui voudrait plus de clients grâce à Google ? Présente-le moi : dès qu'il s'abonne, ton mois de prestation est offert, et lui profite de 50 € de réduction sur son 1er mois."
        : "Salut ! Si tu connais un pro qui veut plus de clients grâce à Google, présente-le moi : dès qu'il signe et paie son 1er mois, je te vire 50 € et lui a 50 € de réduction.";
    navigator.clipboard?.writeText(t);
    window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank');
}

function boom() {
    const c = document.createElement('canvas'); c.style.cssText = 'position:fixed;inset:0;z-index:30;pointer-events:none';
    c.width = innerWidth; c.height = innerHeight; document.body.append(c);
    const x = c.getContext('2d'), P = Array.from({ length: 70 }, () => ({ x: c.width / 2, y: c.height * .6, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, col: Math.random() < .5 ? '#00f0ff' : '#bd00ff', l: 60 }));
    (function f() {
        x.clearRect(0, 0, c.width, c.height); let a = 0;
        P.forEach(p => { if (p.l-- > 0) { a = 1; p.x += p.vx; p.y += p.vy; p.vy += .45; x.globalAlpha = p.l / 60; x.fillStyle = p.col; x.fillRect(p.x, p.y, 5, 5); } });
        a ? requestAnimationFrame(f) : c.remove();
    })();
}
const _tg = toggle; toggle = n => { const was = done(n); _tg(n); if (!was) { boom(); navigator.vibrate?.(60); } };

document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.v == 'cap') renderCap();
    if (b.dataset.v == 'ref') renderRef();
}));

const _ol = window.onload;
window.onload = () => {
    _ol();
    const q = document.querySelector('.quick-actions');
    [['SCRIPT PARRAINAGE', "Écris-moi 3 messages courts et naturels pour proposer mon programme de parrainage à mes clients actuels, selon leur profil."],
     ['BILAN CAP', "Analyse mon MRR, mon retard ou mon avance sur la trajectoire, et dis-moi les 3 actions les plus rentables cette semaine."]]
        .forEach(([l, p]) => { const b = document.createElement('button'); b.className = 'quick-btn'; b.textContent = l; b.onclick = () => envoyerPromptPredefini(p); q.append(b); });
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
        const m = document.createElement('button'); m.className = 'quick-btn mic'; m.textContent = 'VOIX';
        m.onclick = () => { const r = new SR(); r.lang = 'fr-FR'; m.classList.add('rec'); r.onresult = e => { $('userInput').value = e.results[0][0].transcript; }; r.onend = () => m.classList.remove('rec'); r.start(); };
        $('userInput').after(m);
    }
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });
    renderAlerts(); tick(); setInterval(tick, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderAlerts(); tick(); } });
};
