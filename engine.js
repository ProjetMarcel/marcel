// MARCEL v9 : moteur adaptatif (clients, entonnoir, projection, mission du jour, coups de génie, cerveau de Marcel)
const ADD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const TODAY = () => iso(new Date());
const dAt = n => { const d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + n - 1); return d; };
const FK = ['c', 'r', 'd', 'q', 's'], FL = { c: 'CONTACTS', r: 'RÉPONSES', d: 'DÉMOS', q: 'DEVIS', s: 'SIGNÉS' };
const BENCH = { r: .15, d: .40, q: .70, s: .35 };            // hypothèses de départ, remplacées par tes vrais taux
const MILES = [5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000];
const eur = n => Math.round(n).toLocaleString('fr-FR') + ' €';
const pc = x => Math.round(x * 100) + ' %';
let CL = J('marcel_cl', []), FUN = J('marcel_fun', {}), IDEES = J('marcel_idees', []), DEFI = J('marcel_def', null), playOff = 0, capNote = '';
const saveCL = () => S('marcel_cl', CL), saveFUN = () => S('marcel_fun', FUN), saveIDEES = () => S('marcel_idees', IDEES), saveDEFI = () => S('marcel_def', DEFI);

/* ---------- argent ---------- */
function money() {
    const pm = cfg.pm || 150, pt = cfg.pt || 390, tm = pt / 3, bm = cfg.bm || 0, bt = cfg.bt || 0;
    const nm = bm + CL.filter(c => c.f == 'm').length, nt = bt + CL.filter(c => c.f == 't').length;
    const n = nm + nt, mrr = nm * pm + nt * tm, now = new Date(), M = now.getFullYear() * 12 + now.getMonth();
    let cash = bm * pm + bt * tm;
    CL.forEach(c => { const d = new Date(c.d), m0 = d.getFullYear() * 12 + d.getMonth(); if (M < m0) return; if (c.f == 'm') cash += pm; else if ((M - m0) % 3 == 0) cash += pt; });
    return { pm, pt, tm, nm, nt, n, mrr, cash, avg: n ? mrr / n : (pm + tm) / 2 };
}
function syncMrr() { const m = money(); if (m.n) cfg.mrr = Math.round(m.mrr); cfg.prix = Math.round(m.avg); S('marcel_cfg', cfg); return m; }
const goal = mrr => MILES.find(x => x > mrr) || (Math.floor(mrr / 10000) + 1) * 10000;   // 5000 = plancher, puis la barre monte

/* ---------- entonnoir ---------- */
function fsum(days) {
    const o = { c: 0, r: 0, d: 0, q: 0, s: 0 };
    for (let i = 0; i < days; i++) { const e = FUN[iso(ADD(new Date(), -i))]; if (e) FK.forEach(k => o[k] += e[k] || 0); }
    return o;
}
function funnel() {
    const a = fsum(28), w = fsum(7), q21 = fsum(21); let worst = null;
    [['r', a.r, a.c, 'contact → réponse'], ['d', a.d, a.r, 'réponse → démo'], ['q', a.q, a.d, 'démo → devis'], ['s', a.s, a.q, 'devis → signature']].forEach(([k, n, den, l]) => {
        if (den >= 8) { const r = n / den, ratio = r / BENCH[k]; if (ratio < .6 && (!worst || ratio < worst.ratio)) worst = { k, ratio, r, l }; }
    });
    return { a, w, worst, closing: a.c >= 40 ? a.s / a.c : null, pend: Math.max(0, q21.q - q21.s) };
}
function proj() {
    const m = money(), f = funnel(), t = dayNum(), g = goal(m.mrr), need = g - m.mrr, nb = Math.ceil(need / m.avg);
    const pace = fsum(14).s / 2, req = need / m.avg / Math.max(.5, (N - t + 1) / 7);
    const eta = pace > 0 ? ADD(new Date(), Math.ceil(nb / pace * 7)) : null;
    return { m, f, g, need, nb, pace, req, eta, etaDay: eta ? Math.round((eta - new Date(start + 'T12:00:00')) / 864e5) + 1 : null, floor: m.mrr >= 5000 };
}
function renewals(win) {
    const t0 = new Date(TODAY()), out = [];
    CL.filter(c => c.f == 't').forEach(c => { const d = new Date(c.d); while (d <= t0) d.setMonth(d.getMonth() + 3); const dd = Math.round((d - t0) / 864e5); if (dd <= win) out.push({ nom: c.nom, dd, date: iso(d) }); });
    return out.sort((a, b) => a.dd - b.dd);
}

/* ---------- mission adaptative : recalculée à chaque changement de situation ---------- */
const WD = { 1: 'P3', 2: 'P2', 3: 'P8', 4: 'P5', 5: 'P6', 6: 'P9', 0: 'P10' };
function decide() {
    const n = dayNum(), wd = new Date().getDay(), f = funnel(), a = f.a, s = v => v > 1 ? 's' : '';
    const unl = CL.filter(c => !c.livre), due = (ref.lead || []).filter(l => l.st == 3 && !l.r).length, ren = renewals(14);
    if (n <= 4 && a.c == 0) return { pid: ['P1', 'P0', 'P2', 'P3'][n - 1], why: "Phase de lancement : aucune donnée réelle encore. Logue tes contacts dans CAP € et le plan s'adaptera tout seul." };
    if (wd == 0) return { pid: 'P10', why: 'Dimanche : bilan chiffré et réglage de la semaine.' };
    if (f.pend > 0) return { pid: 'P6', why: `${f.pend} devis en attente : c'est l'argent le plus proche, on le sécurise d'abord.` };
    if (unl.length) return { pid: 'P7', why: `${unl.length} client${s(unl.length)} signé${s(unl.length)} à livrer : la livraison conditionne l'avis, le renouvellement et le parrainage.` };
    if (ren.length) return { pid: 'P11', why: `Renouvellement de ${ren[0].nom} dans ${ren[0].dd} j : garder un client coûte moins cher que d'en trouver un.` };
    if (due) return { pid: 'P8', why: `${due} récompense${s(due)} de parrainage à honorer : ta réactivité nourrit le bouche-à-oreille.` };
    if (f.worst) {
        const M = { r: ['P2', "Peu de réponses : on change d'approche (audit vidéo personnalisé avant l'appel)."], d: ['P3', 'Des réponses sans rendez-vous : relance avec 2 créneaux précis.'], q: ['P5', "Des démos sans devis : on travaille la démo et l'envoi immédiat du devis."], s: ['P6', 'Des devis sans signature : relances ciblées et trimestre en premier.'] }[f.worst.k];
        return { pid: M[0], why: `${M[1]} (${f.worst.l} : ${pc(f.worst.r)} contre ~${pc(BENCH[f.worst.k])} attendu)` };
    }
    if (a.r - a.d >= 3) return { pid: 'P5', why: `${a.r - a.d} réponses n'ont pas encore débouché sur une démo : on transforme.` };
    if (f.w.c < 25 && wd >= 1 && wd <= 5) return { pid: 'P3', why: `Seulement ${f.w.c} contact${s(f.w.c)} sur 7 jours : le volume est ton levier n°1 (vise 10 par jour ouvré).` };
    return { pid: WD[wd], why: 'Tout est à jour : on déroule le cycle de la semaine.' };
}
window.pidAdaptive = n => {
    const t = dayNum();
    if (n < t) return plan[n]?.p;
    if (n == t) return (done(n) && plan[n]?.p) || decide().pid;
    if (n <= 4 && fsum(28).c == 0) return ['P1', 'P0', 'P2', 'P3'][n - 1];
    return WD[dAt(n).getDay()];
};

/* ---------- coups de génie : leviers classiques et hors sentiers battus ---------- */
const PLAYS = [
    { id: 'trim', t: 'Vendre le trimestre en premier', ok: x => x.m.n == 0 || x.m.nt / x.m.n < .5, why: '390 € encaissés d\'un coup et 3 mois de rétention : trésorerie et stabilité.', s: ['Dans chaque devis, affiche 2 lignes : Trimestre 390 € payé d\'un coup (130 €/mois) en premier, puis Mensuel 150 €.', 'Argument : 60 € d\'économie par trimestre et 3 mois de travail continu pour voir les effets sur la fiche.', 'Aux clients mensuels, propose le passage au trimestre à J+30 avec un bilan chiffré de leurs statistiques.', 'Mesure la part de trimestriels dans CAP € (cible 50 %).'] },
    { id: 'crea', t: 'Chasser les créations d\'entreprise', ok: () => true, why: 'Un créateur cherche ses premiers clients maintenant et n\'a souvent aucune présence Google.', s: ['Ouvre RADAR : prends les 5 pistes au meilleur score.', 'Vérifie sur Maps si la fiche existe. Sinon, ton angle : « vous n\'apparaissez pas encore sur Google Maps ».', 'Appelle ou passe sur place dans les 30 jours suivant la création.', 'Offre : mise en place complète + trimestre à 390 €.'] },
    { id: 'presc', t: 'Recruter 5 prescripteurs', ok: x => x.m.n < 40, why: 'Un prescripteur actif parle chaque semaine à des dizaines de commerçants.', s: ['Cible ceux qui voient les commerçants toutes les semaines : experts-comptables, assureurs pro, banquiers pro, imprimeurs, fournisseurs, agences web sans offre fiche Google.', 'Propose un apport d\'affaires récurrent (ex. 20 % les 3 premiers mois) avec un contrat écrit : fais valider la forme (statut, fiscalité) avant.', 'Offre-leur un audit gratuit de leur propre fiche : la meilleure démonstration.', 'Vise 1 rencontre par jour pendant une semaine.'] },
    { id: 'union', t: 'Atelier gratuit en association de commerçants', ok: () => true, why: 'Un atelier met 10 à 30 décideurs locaux devant toi en une heure.', s: ['Contacte unions commerciales, CCI, CMA et clubs d\'entrepreneurs de ta zone.', 'Propose 30 min « Être trouvé sur Google Maps » avec audit en direct d\'une fiche volontaire.', 'Prévois une offre réservée aux présents (ex. 1er mois offert sur un trimestre) valable 7 jours.', 'Collecte les contacts avec leur accord et rappelle sous 48 h.'] },
    { id: 'avis', t: 'Cibler les avis laissés sans réponse', ok: () => true, why: 'Un patron blessé par un avis négatif est réceptif : le besoin est visible et urgent.', s: ['Sur Maps, repère des commerces notés 4,0 ou moins avec des avis sans réponse.', 'Écris une réponse professionnelle à l\'un d\'eux (sans la publier à sa place) et envoie-la lui comme preuve.', 'Pitch : « J\'ai vu l\'avis du [date] resté sans réponse : je m\'en occupe pour vous, chaque mois. »'] },
    { id: 'multi', t: 'Viser les multi-établissements', ok: x => x.m.n >= 3, why: 'Un contrat de 5 à 10 fiches pèse autant que 5 à 10 petits clients, pour une seule signature.', s: ['Repère les enseignes à 3-10 points de vente locaux : franchisés, groupes de garages, réseaux de salons, de cabinets.', 'Contacte le gérant ou le siège avec un audit chiffré de 2-3 de leurs établissements.', 'Propose une pilote sur 1 établissement puis un tarif dégressif sur les autres (marge à calculer).'] },
    { id: 'video', t: 'Audit public anonymisé', ok: () => true, why: 'Du contenu qui attire les prospects au lieu de les chasser un à un.', s: ['Filme un audit de 60 s d\'une fiche (anonymisée ou avec accord écrit du commerçant).', 'Publie-le sur LinkedIn et dans les groupes locaux de commerçants (dans le respect des règles de chaque groupe).', 'Termine par : « Écris AUDIT en commentaire, je fais le tien en 24 h. »', 'Réponds dans les 24 h par un audit vidéo de 60 s.'] },
    { id: 'wl', t: 'Revente en marque blanche', ok: x => x.m.n >= 3, why: 'Les agences et freelances ont des clients sans fiche optimisée : tu deviens leur sous-traitant.', s: ['Cible agences web, community managers et freelances locaux.', 'Offre : tu gères les fiches, ils facturent leurs clients. Fixe un prix de gros qui leur laisse de la marge.', 'Objectif : 1 partenaire qui t\'apporte 10 fiches vaut un mois de prospection.'] },
    { id: 'garantie', t: 'Tester une offre à risque inversé', ok: x => (x.f.worst && x.f.worst.k == 's') || (x.f.a.q >= 6 && x.f.closing != null && x.f.closing < .05), why: 'Si les devis ne se signent pas, le frein est la peur de payer pour rien.', s: ['Définis AVANT des critères mesurables (ex. appels, itinéraires ou clics sur la fiche à J30) et fais valider la formulation juridique.', 'Teste sur 5 prospects et compare le taux de signature.', 'Ne promets jamais un classement Google : seulement des indicateurs que tu suis.'] },
    { id: 'upsell', t: 'Monter la valeur moyenne par client', ok: x => x.m.n >= 5, why: '+30 % de MRR sans nouveau client, avec ceux qui te font déjà confiance.', s: ['Crée un pack supérieur : fiche + visuels pour les posts + séance photo + mini-site d\'une page (tarif à fixer selon ta charge).', 'Propose-le à tes 5 meilleurs clients avec leurs chiffres à l\'appui.', 'Mesure l\'effet sur le MRR moyen dans CAP €.'] },
    { id: 'amb', t: 'Booster tes ambassadeurs', ok: x => x.amb >= 2, why: 'Le canal le moins cher que tu aies déjà : il suffit de le rendre vivant.', s: ['Lance un bonus de palier : le 3e filleul payant dans le mois déclenche un avantage en plus (à définir et à tenir).', 'Envoie à chaque ambassadeur son tableau de récompenses en cours : la transparence relance.', 'Donne-leur un message prêt à transférer + une courte vidéo d\'audit du filleul.'] },
    { id: 'event', t: 'Aller là où sont les commerçants', ok: () => true, why: 'Un marché, une zone commerciale ou une inauguration concentrent 20 prospects en une heure.', s: ['Prépare une carte avec un QR code « audit gratuit de votre fiche Google ».', 'Passe 1 h dans une zone commerçante ou un marché : 20 présentations de 30 secondes.', 'Note chaque contact dans le Sheet et rappelle sous 48 h avec son audit.'] }
];
function pickPlay() {
    const x = { m: money(), f: funnel(), amb: (ref.amb || []).length, t: dayNum() }, L = PLAYS.filter(p => p.ok(x));
    return (L.length ? L : PLAYS)[(x.t + playOff) % (L.length || PLAYS.length)];
}
function nextPlay() { playOff++; renderEng(); }
function playAsk() {
    const p = pickPlay(); go('chat');
    envoyerPromptPredefini(`Je veux lancer ce coup aujourd'hui : « ${p.t} ». Adapte-le à ma situation chiffrée et à mes secteurs, donne-moi la marche à suivre détaillée (outils, textes exacts à copier, ordre des actions) et l'indicateur qui dira si ça marche. Termine par [IDEE: ${p.t}].`);
}
function playTest() { const p = pickPlay(); if (!IDEES.some(i => i.t == p.t)) IDEES.push({ t: p.t, ts: Date.now(), st: 'test' }); saveIDEES(); renderEng(); }
function ideaCycle(i) { const o = ['new', 'test', 'ok', 'no']; IDEES[i].st = o[(o.indexOf(IDEES[i].st) + 1) % 4]; saveIDEES(); renderEng(); }
function defiDone() { if (DEFI) { DEFI.done = true; saveDEFI(); boom(); navigator.vibrate?.(60); renderEng(); } }

/* ---------- panneau « moteur » (onglet PLAN) et bandeau « mission » (CHAT) ---------- */
const stLab = { new: 'NOUVELLE', test: 'EN TEST', ok: 'VALIDÉE ✓', no: 'ABANDONNÉE' };
function renderEng() {
    let el = $('eng'); if (!el) { el = document.createElement('div'); el.id = 'eng'; $('detail').before(el); }
    const d = decide(), p = proj(), pl = pickPlay(), t = dayNum(), pb = PB[d.pid];
    const eta = p.eta ? `À ce rythme, ${eur(p.g)}/mois le ${p.eta.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} (jour ${p.etaDay}).` : 'Logue tes signatures dans CAP € : la date d\'arrivée se calcule alors toute seule.';
    el.innerHTML = `<div class="panel"><div class="dh"><b>MISSION ADAPTATIVE · J${t}</b><span>recalculée en continu</span></div>
<p class="ph">${esc(pb ? pb.t : '')}</p><p class="note">${esc(d.why)}</p>
<div class="row"><button class="quick-btn" onclick="pick(${t});$('detail').scrollIntoView({behavior:'smooth'})">VOIR LES ÉTAPES</button><button class="quick-btn" onclick="coach(${t})">GUIDE-MOI</button><button class="quick-btn" onclick="reviser()">RÉVISER LE PLAN</button></div>
<p class="note">${esc(eta)} Rythme : ${p.pace.toFixed(1)} signature(s)/sem pour ${p.req.toFixed(1)} requise(s).</p></div>
<div class="panel play"><div class="dh"><b>COUP DU JOUR</b><span>hors sentiers battus</span></div><p class="ph">${esc(pl.t)}</p><p class="note">${esc(pl.why)}</p>
${pl.s.map((s, i) => `<div class="stp"><i></i><span>${i + 1}. ${esc(s)}</span></div>`).join('')}
<div class="row"><button class="quick-btn" onclick="playAsk()">DÉTAILLER AVEC MARCEL</button><button class="quick-btn" onclick="playTest()">JE LE TESTE</button><button class="quick-btn" onclick="nextPlay()">AUTRE IDÉE</button></div></div>
${DEFI && !DEFI.done ? `<div class="panel"><div class="dh"><b>DÉFI EN COURS</b><span>lancé par Marcel</span></div><p class="ph">${esc(DEFI.t)}</p><button class="send-btn" onclick="defiDone()">RELEVÉ ✓</button></div>` : ''}
${IDEES.length ? `<div class="panel"><div class="dh"><b>IDÉES DE MARCEL · ${IDEES.length}</b><span>touche pour changer le statut</span></div>${IDEES.slice(-6).reverse().map(i => `<div class="stp" onclick="ideaCycle(${IDEES.indexOf(i)})"><i></i><span>${esc(i.t)} · <b>${stLab[i.st]}</b></span></div>`).join('')}</div>` : ''}`;
}
function renderMission() {
    const t = dayNum(), d = decide(), pb = PB[d.pid];
    if (!done(t) && plan[t]?.p != d.pid) setPlan(t, { p: d.pid });
    let el = $('mis'); if (!el) { el = document.createElement('div'); el.id = 'mis'; (document.getElementById('al') || document.querySelector('.hud-banner')).after(el); }
    el.innerHTML = done(t) ? `<button class="mis ok" onclick="goMission()">✓ Journée validée · demain : ${esc(task(Math.min(N, t + 1)))}</button>`
        : `<button class="mis" onclick="goMission()">▶ J${t} · ${esc(pb ? pb.t : '')}<small>${esc(d.why)}</small></button>`;
}
function goMission() { go('plan'); pick(dayNum()); $('eng')?.scrollIntoView({ behavior: 'smooth' }); }
function reviser() {
    go('chat');
    envoyerPromptPredefini("Révise mon plan à partir de mes chiffres réels : confirme ou corrige la mission d'aujourd'hui, puis réécris les 7 prochains jours avec des balises [PLAN: jour | titre | étape ; étape ; étape]. Justifie en 3 lignes et dis-moi ce que tu as changé.");
}

/* ---------- cockpit CAP € ---------- */
renderCap = function () {
    const p = proj(), m = p.m, f = p.f, t = dayNum(), td = FUN[TODAY()] || {}, e = expd(t), pct = Math.min(100, m.mrr / p.g * 100), a = f.a;
    const r = (n, d) => d >= 5 ? pc(n / d) : '–';
    const tile = (b, l) => `<div><b>${b}</b>${l}</div>`;
    const ren = renewals(30);
    $('v-cap').innerHTML = `<div class="scroll">${capNote ? `<div class="panel"><p class="ph">${esc(capNote)}</p></div>` : ''}
<div class="panel"><div class="dh"><b>CAP ${eur(p.g)}/MOIS</b><span>${p.floor ? 'plancher 5 000 € atteint · sans plafond' : 'plancher : 5 000 €'}</span></div>
<div class="bar"><i style="width:${pct}%"></i>${p.g == 5000 ? `<u style="left:${Math.min(100, e / 50)}%"></u>` : ''}</div>
<div class="dh"><span>MRR ${eur(m.mrr)}</span><span>${Math.round(pct)} % · reste ${eur(p.need)} = ${p.nb} client${p.nb > 1 ? 's' : ''}</span></div></div>
<div class="tiles">${tile(eur(m.mrr), 'MRR (récurrent / mois)')}${tile(eur(m.cash), 'cash estimé ce mois')}${tile(m.n, `clients · ${m.nm} mensuels · ${m.nt} trimestre`)}${tile(`${Math.ceil(5000 / m.pm)} · ${Math.ceil(5000 / m.tm)}`, `clients pour 5 000 € (à ${m.pm} € · à ${Math.round(m.tm)} €)`)}${tile(p.pace.toFixed(1), `signatures/sem (requis ${p.req.toFixed(1)})`)}${tile(f.closing != null ? pc(f.closing) : pc((cfg.conv || 3) / 100), f.closing != null ? 'closing réel (28 j)' : 'closing supposé (pas assez de données)')}</div>
<div class="panel"><div class="dh"><b>ENTONNOIR · AUJOURD'HUI</b><span>28 j : ${a.c} contacts → ${a.s} signés</span></div>
${FK.map(k => `<div class="fr"><span>${FL[k]}</span><b>${td[k] || 0}</b><button class="quick-btn" onclick="fun('${k}',-1)">−</button><button class="quick-btn" onclick="fun('${k}',1)">+1</button></div>`).join('')}
<p class="note">28 jours : contact→réponse ${r(a.r, a.c)} · réponse→démo ${r(a.d, a.r)} · démo→devis ${r(a.q, a.d)} · devis→signature ${r(a.s, a.q)}</p>
<p class="ph">${f.worst ? `Goulot : ${f.worst.l} (${pc(f.worst.r)} contre ~${pc(BENCH[f.worst.k])} attendu).` : f.w.c < 25 ? `Volume : ${f.w.c} contact(s) sur 7 jours (vise ~50).` : 'Aucun goulot détecté pour l\'instant.'} ${f.pend ? f.pend + ' devis en attente.' : ''}</p></div>
<div class="panel"><div class="dh"><b>CLIENTS · ${m.n}</b><span>${m.nm} mensuels · ${m.nt} trimestre</span></div>
<div class="row"><input type="text" id="cn" placeholder="Nom du client"><select id="cf"><option value="t">trimestre ${m.pt} €</option><option value="m">mensuel ${m.pm} €</option></select><select id="cs"><option>direct</option><option>ambassadeur</option><option>radar</option><option>autre</option></select><button class="quick-btn" onclick="addCl()">AJOUTER</button></div>
${CL.map(c => `<div class="fr"><span>${esc(c.nom)} · ${c.f == 't' ? 'trimestre' : 'mensuel'} · ${esc(c.src || '')}</span><button class="quick-btn ${c.livre ? 'okb' : ''}" onclick="livre(${c.id})">${c.livre ? 'LIVRÉ ✓' : 'À LIVRER'}</button><button class="quick-btn" onclick="delCl(${c.id})">✕</button></div>`).join('')}
${ren.length ? `<p class="ph">Renouvellements : ${ren.map(x => `${esc(x.nom)} le ${new Date(x.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`).join(' · ')}</p>` : ''}
<label>Clients déjà existants, sans les lister (mensuels / trimestriels)</label>
<div class="row"><input type="text" inputmode="numeric" id="bm" value="${cfg.bm || 0}"><input type="text" inputmode="numeric" id="bt" value="${cfg.bt || 0}"><button class="quick-btn" onclick="setBase()">OK</button></div></div>
<div class="panel"><div class="dh"><b>RÉGLAGES</b></div>
<label>Tarif mensuel (€) · tarif trimestre payé d'un coup (€) · closing supposé (%)</label>
<div class="row"><input type="text" inputmode="numeric" id="pm" value="${m.pm}"><input type="text" inputmode="numeric" id="pt" value="${m.pt}"><input type="text" inputmode="numeric" id="cv" value="${cfg.conv || 3}"></div>
${m.n ? '' : `<label>MRR actuel saisi à la main (€) : liste tes clients pour qu'il se calcule seul</label><input type="text" inputmode="numeric" id="cm" value="${cfg.mrr || 0}">`}
<label>Ma zone de prospection (villes, départements)</label><input type="text" id="cz" value="${esc(cfg.zone || '')}" placeholder="ex. Vosges, Nancy, Épinal">
<button class="send-btn" onclick="setTarifs()">ENREGISTRER</button>
<button class="quick-btn" onclick="ics()">EXPORTER LE PLAN VERS MON CALENDRIER (.ics)</button></div>
<p class="note">Les taux de référence (15 % de réponses, 40 % de démos, 70 % de devis, 35 % de signatures) sont des hypothèses de départ : ils sont remplacés par tes vrais taux dès que tu loggues assez de données.</p></div>`;
};
function fun(k, dlt) {
    const t = TODAY(); FUN[t] = FUN[t] || { c: 0, r: 0, d: 0, q: 0, s: 0 };
    FUN[t][k] = Math.max(0, (FUN[t][k] || 0) + dlt); saveFUN();
    if (k == 's' && dlt > 0) { boom(); navigator.vibrate?.(80); capNote = '🎉 Signature enregistrée : ajoute le client ci-dessous pour mettre le MRR à jour.'; }
    renderCap(); renderStats();
    if (k == 's' && dlt > 0) setTimeout(() => { const i = $('cn'); if (i && $('v-cap').classList.contains('on')) { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); i.focus(); } }, 300);
}
function addCl() {
    const n = $('cn').value.trim(); if (!n) return;
    CL.push({ id: Date.now(), nom: n, f: $('cf').value, src: $('cs').value, d: TODAY(), livre: false }); saveCL(); capNote = '';
    syncMrr(); boom(); renderCap(); renderStats();
}
function delCl(id) { if (!confirm('Retirer ce client ?')) return; CL = CL.filter(c => c.id != id); saveCL(); syncMrr(); renderCap(); renderStats(); }
function livre(id) { const c = CL.find(x => x.id == id); c.livre = !c.livre; saveCL(); renderCap(); renderStats(); }
function setBase() { cfg.bm = Math.max(0, +$('bm').value || 0); cfg.bt = Math.max(0, +$('bt').value || 0); syncMrr(); renderCap(); renderStats(); }
function setTarifs() {
    cfg.pm = Math.max(1, +$('pm').value || 150); cfg.pt = Math.max(1, +$('pt').value || 390); cfg.conv = Math.min(100, Math.max(1, +$('cv').value || 3));
    if ($('cm')) cfg.mrr = Math.max(0, +$('cm').value || 0); cfg.zone = $('cz').value.trim(); syncMrr(); renderCap(); renderStats();
}

/* ---------- cerveau de Marcel : persona + état chiffré injectés dans chaque appel ---------- */
window.persona = () => {
    const m = money(), p = proj(), f = p.f, d = decide(), pb = PB[d.pid], a = f.a, w = f.w, L = (window.RADAR && RADAR.leads) || [];
    const unl = CL.filter(c => !c.livre).length, ren = renewals(30), pd = (ref.lead || []).filter(l => l.st == 3).length;
    return `Tu es MARCEL, mon associé, coach et directeur de croissance (pas un simple assistant). Mon activité : gestion professionnelle de fiches Google Business Profile pour TOUS les pros locaux, sans limite de secteur. Offre : ${m.pm} €/mois, ou ${m.pt} € le trimestre payé d'un coup (${Math.round(m.tm)} €/mois). Objectif : au moins 5 000 €/mois de récurrent, SANS plafond : dès qu'un palier est atteint tu relèves la barre.
TON CARACTÈRE : audacieux, inventif, direct, orienté cash. Tu maîtrises les méthodes classiques ET tu cherches les coups non conventionnels (partenariats, canaux détournés, offres inattendues, automatisation, effets de levier). Tu prends l'initiative sans attendre ma demande : tu proposes, tu challenges, tu relances, tu me dis quand je relâche. Tu tutoies. Jamais de généralités : des chiffres, des étapes, des textes à copier.
LIMITES NON NÉGOCIABLES : rien d'illégal ni de trompeur (pas de faux avis, pas de promesse de classement Google, respect du RGPD/CNIL pour la prospection et des CGU de Google). Si une idée est risquée, tu le dis et tu proposes la variante propre. Tu n'inventes jamais un chiffre : si une donnée manque, tu le dis.
RÈGLES DE RÉPONSE : (1) situe-moi en une ligne par rapport à la trajectoire à partir de [ÉTAT CHIFFRÉ] ; (2) donne UNE action principale avec échéance et marche à suivre précise (outil, réglage, texte exact) ; (3) ajoute un « coup de génie » non conventionnel adapté à ma situation, jamais déjà listé dans [IDÉES DÉJÀ PROPOSÉES] ; (4) si je suis en retard, dis-le franchement et lance un défi mesurable ; si je suis en avance, relève l'ambition ; (5) pousse systématiquement le trimestre et le parrainage ; (6) au plus une question, seulement si elle est bloquante.
[ÉTAT CHIFFRÉ] MRR ${eur(m.mrr)} (${m.nm} mensuels, ${m.nt} trimestriels) ; cash estimé ce mois ${eur(m.cash)} ; cible ${eur(p.g)} : reste ${eur(p.need)} soit ${p.nb} clients. Jour ${dayNum()}/${N}.
Entonnoir 7 j : ${w.c} contacts, ${w.r} réponses, ${w.d} démos, ${w.q} devis, ${w.s} signés. 28 j : ${a.c}/${a.r}/${a.d}/${a.q}/${a.s}. Closing réel : ${f.closing != null ? pc(f.closing) : 'pas assez de données (hypothèse ' + (cfg.conv || 3) + ' %)'}. Goulot : ${f.worst ? f.worst.l + ' à ' + pc(f.worst.r) : 'aucun détecté'}. Devis en attente : ${f.pend}.
Rythme : ${p.pace.toFixed(1)} signatures/sem pour ${p.req.toFixed(1)} requises. ${p.eta ? 'Date d\'arrivée estimée : ' + p.eta.toLocaleDateString('fr-FR') + '.' : 'Pas assez de signatures pour projeter.'}
Mission adaptative du jour : ${pb ? pb.t : ''} (${d.why}).
Clients à livrer : ${unl} ; renouvellements sous 30 j : ${ren.length ? ren.map(r => r.nom + ' dans ' + r.dd + ' j').join(', ') : 'aucun'} ; ambassadeurs : ${(ref.amb || []).length} ; filleuls payants : ${pd}.
Zone de prospection : ${cfg.zone || 'non précisée'}. Radar (pistes fraîches) : ${L.length ? L.slice(0, 3).map(l => `${l.nom} (${l.ville}, score ${l.score})`).join(' ; ') : 'aucune donnée'}.
Défi en cours : ${DEFI && !DEFI.done ? DEFI.t : 'aucun'}.
[IDÉES DÉJÀ PROPOSÉES] ${IDEES.slice(-12).map(i => i.t + ' (' + stLab[i.st] + ')').join(' ; ') || 'aucune'}`;
};
window.tagsExtra = x => {
    x = x.replace(/\[IDEE:\s*([^\]]+)\]/g, (_, v) => { v = v.trim(); if (v && !IDEES.some(i => i.t == v)) { IDEES.push({ t: v, ts: Date.now(), st: 'new' }); saveIDEES(); } return ''; });
    x = x.replace(/\[DEFI:\s*([^\]]+)\]/g, (_, v) => { DEFI = { t: v.trim(), ts: Date.now(), done: false }; saveDEFI(); return ''; });
    return x;
};
window.afterTags = () => { renderEng(); renderMission(); };

/* ---------- alertes supplémentaires ---------- */
const _al0 = alerts;
alerts = () => {
    const o = [], f = funnel(), p = proj(), h = new Date().getHours(), unl = CL.filter(c => !c.livre).length;
    if (f.pend) o.push({ t: `${f.pend} devis à relancer`, v: 'cap' });
    renewals(10).forEach(r => o.push({ t: `Renouvellement ${r.nom} dans ${r.dd} j`, v: 'cap' }));
    if (unl) o.push({ t: `${unl} client${unl > 1 ? 's' : ''} à livrer`, v: 'cap' });
    if (h >= 17 && dayNum() > 4 && !(FUN[TODAY()] || {}).c) o.push({ t: "Aucun contact logué aujourd'hui", v: 'cap' });
    if (fsum(14).c >= 10 && p.pace < p.req * .7) o.push({ t: `Rythme ${p.pace.toFixed(1)}/sem vs ${p.req.toFixed(1)} requis`, v: 'cap' });
    const hot = window.radarHot ? window.radarHot() : 0; if (hot) o.push({ t: `${hot} nouvelle${hot > 1 ? 's' : ''} piste${hot > 1 ? 's' : ''} au radar`, v: 'rad' });
    return [...o, ..._al0()];
};
const _rs9 = renderStats;
renderStats = () => { _rs9(); renderMission(); renderEng(); };

/* ---------- boutons rapides, revue automatique quotidienne ---------- */
function revueAuto() {
    if (localStorage.getItem('marcel_revue_off') == '1' || window.voiceMode || document.hidden || !localStorage.getItem('marcel_api_key')) return;
    const k = TODAY(); if (localStorage.getItem('marcel_revue') == k || new Date().getHours() < 5) return;
    localStorage.setItem('marcel_revue', k);
    $('userInput').value = "Revue du jour automatique : diagnostic chiffré en 3 lignes, mission d'aujourd'hui confirmée ou corrigée, 1 défi mesurable [DEFI: …], 1 coup de génie hors sentiers battus [IDEE: …]. Une seule question maximum.";
    envoyerMessage();
}
const _ol9 = window.onload;
window.onload = () => {
    _ol9(); syncMrr();
    const q = document.querySelector('.quick-actions');
    const add = (l, fn) => { const b = document.createElement('button'); b.className = 'quick-btn'; b.textContent = l; b.onclick = fn; q.append(b); return b; };
    add('COUP DE GÉNIE', () => envoyerPromptPredefini("Sors-moi un coup de génie non conventionnel adapté à ma situation chiffrée du jour (jamais déjà proposé). Donne l'idée, pourquoi elle marche, la marche à suivre en 5 étapes que je lance aujourd'hui et l'indicateur de réussite. Reste légal et honnête. Termine par [IDEE: …]."));
    add('RÉVISER LE PLAN', reviser);
    add('VEILLE WEB', () => { window.grounded = true; envoyerPromptPredefini(`Fais ma veille : cherche sur le web ce qui a changé ces 7 derniers jours et qui m'est utile (changements Google Business Profile, tendances de recherche locales, ouvertures, événements, aides ou subventions pour les commerces${cfg.zone ? ' dans ma zone : ' + cfg.zone : ''}). Donne 3 à 5 opportunités concrètes avec l'action à mener et la source.`); });
    const rb = add('', () => { localStorage.setItem('marcel_revue_off', localStorage.getItem('marcel_revue_off') == '1' ? '0' : '1'); lab(); });
    const lab = () => rb.textContent = 'REVUE AUTO : ' + (localStorage.getItem('marcel_revue_off') == '1' ? 'OFF' : 'ON'); lab();
    renderStats();
    setTimeout(revueAuto, 5000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(revueAuto, 1500); });
};
