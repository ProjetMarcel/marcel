// MARCEL v9 : onglet RADAR (pistes d'entreprises, apprentissage par secteur, veille) + alertes téléphone via ntfy
window.RADAR = null;
let RS = J('marcel_rad', {}), radShow = 12;
const saveRS = () => S('marcel_rad', RS);
const frd = s => { try { return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch { return s; } };

async function loadRadar() {
    try { const r = await fetch('radar.json?' + Date.now(), { cache: 'no-store' }); if (!r.ok) throw 0; window.RADAR = await r.json(); } catch { window.RADAR = null; }
    renderRadar(); if (window.renderStats) renderStats();
}

/* apprentissage : le taux de signature observé par secteur ajuste le score (borné à ±2, neutre tant qu'il n'y a pas de données) */
function secStats() {
    const o = {};
    Object.values(RS).forEach(r => { if (!r.sec) return; const x = o[r.sec] = o[r.sec] || { c: 0, s: 0 }; if (['contact', 'rdv', 'signe'].includes(r.st)) x.c++; if (r.st == 'signe') x.s++; });
    return o;
}
function adj(l) { const x = secStats()[l.sec]; return Math.max(0, Math.min(10, l.score + (x ? Math.max(-2, Math.min(2, ((x.s + .5) / (x.c + 10) - .05) * 20)) : 0))); }
window.radarHot = () => ((window.RADAR && RADAR.leads) || []).filter(l => l.new && !RS[l.id]).length;

const NXT = { new: 'contact', contact: 'rdv', rdv: 'signe' }, NXL = { new: 'CONTACTÉ', contact: 'RDV / DÉMO', rdv: 'SIGNÉ ✓' };
function radStep(id) {
    const l = RADAR.leads.find(x => x.id == id), cur = RS[id]?.st || 'new', nx = NXT[cur]; if (!nx) return;
    RS[id] = { st: nx, sec: l.sec, n: l.nom, ts: Date.now() }; saveRS();
    if (nx == 'contact') fun('c', 1);
    if (nx == 'rdv') { fun('r', 1); fun('d', 1); }
    if (nx == 'signe') { fun('q', 1); fun('s', 1); go('cap'); }
    else renderRadar();
}
function radIgnore(id) { const l = RADAR.leads.find(x => x.id == id); RS[id] = { st: 'ignore', sec: l.sec, n: l.nom, ts: Date.now() }; saveRS(); renderRadar(); if (window.renderStats) renderStats(); }
function radPitch(id) {
    const l = RADAR.leads.find(x => x.id == id); go('chat');
    envoyerPromptPredefini(`Prépare mon approche pour ce prospect : ${l.nom}, ${l.ville}, activité « ${l.sect} », créé le ${l.creation}. Éléments : ${l.why.join(' ; ')}${l.gbp ? ` ; fiche Google : ${l.gbp.found ? l.gbp.reviews + ' avis' : 'introuvable'}` : ''}. Donne : 1) l'accroche d'appel (20 s), 2) le SMS, 3) le script de la vidéo d'audit de 60 s, 4) l'objection la plus probable et la réponse. Propose le trimestre à 390 € avant le mensuel à 150 €. Reste honnête : ne prétends pas avoir vu des choses que tu ne sais pas.`);
}
function veille() {
    go('chat'); window.grounded = true;
    envoyerPromptPredefini(`Fais ma veille : cherche sur le web ce qui a changé ces 7 derniers jours et qui m'est utile (changements Google Business Profile, tendances de recherche locales, ouvertures, événements, aides ou subventions pour les commerces${cfg.zone ? ' dans ma zone : ' + cfg.zone : ''}). Donne 3 à 5 opportunités concrètes avec l'action à mener et la source.`);
}

/* canal de notifications ntfy */
function ntGen() { const a = new Uint8Array(8); crypto.getRandomValues(a); localStorage.setItem('marcel_ntfy', 'marcel-' + [...a].map(x => x.toString(16).padStart(2, '0')).join('')); renderRadar(); }
function ntSave() { localStorage.setItem('marcel_ntfy', $('nt').value.trim()); }
function ntCopy() { ntSave(); navigator.clipboard?.writeText(localStorage.getItem('marcel_ntfy') || ''); alert('Nom du canal copié. Colle-le dans le secret NTFY_TOPIC de GitHub.'); }
async function ntTest() {
    ntSave(); const t = localStorage.getItem('marcel_ntfy'); if (!t) return alert("Génère d'abord un nom de canal.");
    try {
        const r = await fetch('https://ntfy.sh/' + encodeURIComponent(t), { method: 'POST', headers: { Title: 'MARCEL', Priority: '5', Click: location.origin + location.pathname + '?call=1' }, body: "Test réussi : les alertes arrivent sur ce téléphone, appli fermée." });
        alert(r.ok ? "Test envoyé. Tu dois recevoir la notification dans l'app ntfy (abonnée à ce canal)." : 'Échec ntfy : code ' + r.status);
    } catch (e) { alert('Échec : ' + e.message); }
}

function renderRadar() {
    const el = $('v-rad'); if (!el) return;
    const keep = el.querySelector('.scroll')?.scrollTop || 0, R = window.RADAR, nt = localStorage.getItem('marcel_ntfy') || '', ss = secStats();
    let h = '<div class="scroll">';
    if (!R) h += `<div class="panel"><div class="dh"><b>RADAR</b><span>aucune donnée</span></div><p class="note">Le radar tourne chaque jour sur GitHub Actions (gratuit) et écrit radar.json dans ton dépôt. Suis GUIDE-ALERTES.md : ajoute la clé INSEE puis lance le workflow « marcel » en mode radar. Reviens ici ensuite.</p></div>`;
    else {
        const L = R.leads.filter(l => RS[l.id]?.st != 'ignore').sort((a, b) => adj(b) - adj(a));
        h += `<div class="panel"><div class="dh"><b>RADAR · ${L.length} PISTES</b><span>maj ${frd(R.generated)}</span></div>
<p class="note">Source : ${esc(R.source || '?')} · zone : ${esc(R.zone || '?')} · fiches Google vérifiées : ${R.placesChecked || 0}${R.status ? ' · ' + esc(R.status) : ''}. Le score est un a priori (secteur, fraîcheur, taille, présence Google) corrigé par TES résultats : ce n'est pas une garantie de conversion.</p>
${R.trends && R.trends.length ? `<div class="row">${R.trends.slice(0, 8).map(t => `<span class="chip on">${esc(t)}</span>`).join('')}</div>` : ''}
${R.veille ? `<p class="ph">${esc(R.veille)}</p>` : ''}
<div class="row"><button class="quick-btn" onclick="veille()">VEILLE WEB MAINTENANT</button></div></div>`;
        h += L.slice(0, radShow).map(l => {
            const st = RS[l.id]?.st || 'new', g = l.gbp;
            return `<div class="hi lead"><small>${esc(l.sect)} · ${esc(l.ville)} · créée le ${frd(l.creation)}${l.new ? ' · NOUVEAU' : ''}${st != 'new' ? ' · ' + st.toUpperCase() : ''}</small>
<b>${esc(l.nom)}</b> <span class="sc">${adj(l).toFixed(1)}/10</span>
<p class="note">${l.why.map(esc).join(' · ')}${g ? ` · Google : ${g.found ? g.reviews + ' avis' + (g.rating ? ', ' + g.rating + '★' : '') : 'aucune fiche trouvée'}` : ''}</p>
<div class="row"><button class="quick-btn" onclick="window.open('${esc(l.maps)}','_blank')">MAPS</button>${NXT[st] ? `<button class="quick-btn" onclick="radStep('${l.id}')">→ ${NXL[st]}</button>` : ''}<button class="quick-btn" onclick="radPitch('${l.id}')">PITCH</button><button class="quick-btn" onclick="radIgnore('${l.id}')">IGNORER</button></div></div>`;
        }).join('');
        if (L.length > radShow) h += `<button class="quick-btn reset" onclick="radShow+=12;renderRadar()">VOIR PLUS (${L.length - radShow})</button>`;
        const sk = Object.keys(ss);
        if (sk.length) h += `<div class="panel"><div class="dh"><b>CE QUI MARCHE POUR TOI</b><span>apprentissage</span></div>${sk.map(k => `<p class="note">${esc(k)} : ${ss[k].c} contacté(s), ${ss[k].s} signé(s)</p>`).join('')}</div>`;
    }
    h += `<div class="panel"><div class="dh"><b>ALERTES SUR LE TÉLÉPHONE</b><span>appli fermée</span></div>
<p class="note">Une appli web fermée ne peut pas se réveiller seule. Le serveur GitHub t'envoie donc un message via ntfy à 9 h et 18 h ; en le touchant, l'appli s'ouvre sur l'appel de Marcel. 1) Installe l'app ntfy. 2) Abonne-toi au canal ci-dessous. 3) Mets le même nom dans le secret NTFY_TOPIC du dépôt (voir le guide).</p>
<div class="row"><input type="text" id="nt" value="${esc(nt)}" placeholder="nom du canal (secret)" onchange="ntSave()"><button class="quick-btn" onclick="ntGen()">GÉNÉRER</button><button class="quick-btn" onclick="ntCopy()">COPIER</button><button class="quick-btn" onclick="ntTest()">TESTER</button></div></div></div>`;
    el.innerHTML = h; const s = el.querySelector('.scroll'); if (s) s.scrollTop = keep;
}

document.querySelector('nav [data-v=rad]')?.addEventListener('click', () => { renderRadar(); if (!window.RADAR || Date.now() - new Date(RADAR.generated).getTime() > 36e5) loadRadar(); });
const _ol10 = window.onload;
window.onload = () => { _ol10(); loadRadar(); };
