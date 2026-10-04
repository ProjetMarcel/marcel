// MARCEL v10 : alertes programmées directement chez ntfy, à l'heure exacte, sans dépendre des horaires de GitHub.
// Principe : à chaque ouverture, l'appli dépose chez ntfy les alertes des 3 prochains jours (limite de ntfy).
const NT_H = { b: 9, s: 18 }, NT_URL = 'https://ntfy.sh/';
const NT_ON = () => localStorage.getItem('marcel_nt_off') != '1';
const ntTopic = () => (localStorage.getItem('marcel_ntfy') || '').trim();
const ntOK = t => /^[-_A-Za-z0-9]{1,64}$/.test(t);
let NS = J('marcel_nt_sched', {}), ntStatus = localStorage.getItem('marcel_nt_status') || '', ntBusy = false;
const saveNS = () => S('marcel_nt_sched', NS);
const d8 = t => { const d = new Date(t); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
const ntClick = () => location.origin + location.pathname + '?call=1';
function ntSet(t) { ntStatus = t; try { localStorage.setItem('marcel_nt_status', t); } catch { } const e = document.getElementById('ntst'); if (e) e.textContent = t; }
function ntDayNum(t) { return Math.min(N, Math.max(1, Math.round((new Date(iso(new Date(t)) + 'T12:00:00') - new Date(start + 'T12:00:00')) / 864e5) + 1)); }

// Créneaux à programmer : de maintenant à +71 h (ntfy refuse au-delà de 3 jours)
function ntSlots() {
    const now = Date.now(), out = [];
    for (let k = 0; k <= 3; k++) {
        const d = new Date(); d.setDate(d.getDate() + k);
        [['b', NT_H.b], ['s', NT_H.s]].forEach(([kind, hr]) => {
            const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hr, 0, 0).getTime();
            if (ts > now + 60e3 && ts < now + 71 * 36e5) out.push({ id: `m-${d8(ts)}-${kind}`, kind, ts });
        });
    }
    return out;
}
// Contenu volontairement STABLE : il est écrit jusqu'à 3 jours avant l'envoi, donc aucun chiffre qui pourrait devenir faux.
function ntContent(s) {
    const n = ntDayNum(s.ts);
    if (s.kind == 'b') {
        const p = typeof PLAYS !== 'undefined' && PLAYS.length ? PLAYS[n % PLAYS.length].t : '';
        return { title: `MARCEL - Jour ${n}`, body: `Jour ${n}/${N}. Ta mission du jour est prête, recalculée avec tes derniers chiffres. Touche pour que Marcel t'appelle.${p ? '\nCoup du jour : ' + p : ''}` };
    }
    return { title: `MARCEL - Bilan J${n}`, body: `Bilan du jour ${n} : contacts logués ? journée validée ? Deux minutes avec Marcel pour préparer demain. Touche pour l'appeler.` };
}
// Les en-têtes HTTP restent en ASCII ; seul le corps du message contient des accents.
async function ntSend(headers, body) {
    let r;
    try { r = await fetch(NT_URL + encodeURIComponent(ntTopic()), { method: 'POST', headers, body }); } catch (e) { return 'réseau : ' + e.message; }
    if (r.ok) return true;
    let t = ''; try { t = (await r.text()).slice(0, 120); } catch { }
    return `ntfy a répondu ${r.status} ${t}`.trim();
}
const ntHead = (title, ts, id) => ({ Title: title, Priority: '5', Tags: 'phone', Click: ntClick(), Actions: 'view, Appeler Marcel, ' + ntClick() + ', clear=true', Delay: String(Math.floor(ts / 1000)), ...(id ? { 'X-Sequence-ID': id } : {}) });

async function ntArm(force) {
    const topic = ntTopic();
    if (ntBusy || !topic || !NT_ON()) return;
    if (!ntOK(topic)) return ntSet('Nom de canal invalide : lettres, chiffres, - et _ uniquement (64 caractères max).');
    if (!force && Date.now() - (+localStorage.getItem('marcel_nt_last') || 0) < 30 * 60e3) return;
    ntBusy = true; localStorage.setItem('marcel_nt_last', String(Date.now()));
    const now = Date.now(); Object.keys(NS).forEach(k => { if (NS[k].ts < now - 864e5) delete NS[k]; });
    let ok = 0, err = '';
    try {
        for (const s of ntSlots()) {
            if (NS[s.id]) continue;                                   // déjà programmé : jamais en double
            const c = ntContent(s), r = await ntSend(ntHead(c.title, s.ts, s.id), c.body);
            if (r === true) { NS[s.id] = { ts: s.ts }; ok++; } else { err = r; break; }
        }
    } finally { saveNS(); ntBusy = false; }
    const up = Object.values(NS).filter(v => v.ts > Date.now()).map(v => v.ts).sort((a, b) => a - b);
    const last = up.length ? new Date(up[up.length - 1]) : null;
    ntSet(err ? `Programmation interrompue : ${err}. ${up.length} alerte(s) déjà en place.`
        : up.length ? `${up.length} alerte(s) programmée(s) chez ntfy, jusqu'au ${last.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${last.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${ok ? ` (+${ok} nouvelle${ok > 1 ? 's' : ''})` : ''}. Elles se renouvellent à chaque ouverture de l'appli.` : 'Aucune alerte à programmer pour le moment.');
}
async function ntCancelAll() {
    const topic = ntTopic(), now = Date.now(); let n = 0, ok = 0;
    for (const [id, v] of Object.entries(NS)) {
        if (v.ts <= now) continue; n++;
        try { const r = await fetch(NT_URL + encodeURIComponent(topic) + '/' + id, { method: 'DELETE' }); if (r.ok) ok++; } catch { }
    }
    NS = {}; saveNS(); return { n, ok };
}
async function ntToggle() {
    if (NT_ON()) {
        localStorage.setItem('marcel_nt_off', '1'); const r = await ntCancelAll();
        ntSet('Alertes coupées.' + (r.n ? ` ${r.ok}/${r.n} annulations confirmées par ntfy${r.ok < r.n ? " (les autres peuvent encore arriver, pendant 3 jours au plus)" : ''}.` : ''));
    } else { localStorage.removeItem('marcel_nt_off'); await ntArm(true); }
    if (typeof renderRadar == 'function') renderRadar();
}
// Test de bout en bout : envoyé par la voie programmée, pour vérifier que ça arrive appli fermée
async function ntTestLater() {
    const topic = ntTopic();
    if (!ntOK(topic)) return alert("Génère d'abord un nom de canal valide (bouton GÉNÉRER).");
    const ts = Date.now() + 30e3, r = await ntSend(ntHead('MARCEL - Test programme', ts), 'Test de programmation reçu : les alertes programmées de 9 h et 18 h fonctionneront aussi.');
    const hm = new Date(ts).toLocaleTimeString('fr-FR');
    ntSet(r === true ? `Test programmé pour ${hm}. Ferme l'appli maintenant : la notification doit arriver toute seule.` : 'Échec du test : ' + r);
    if (r === true) alert(`Test programmé pour ${hm}. Ferme l'appli et attends 30 secondes.`);
}

const _ol11 = window.onload;
window.onload = () => { _ol11(); setTimeout(() => ntArm(), 2500); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) ntArm(); });
setInterval(() => ntArm(), 2 * 36e5);
