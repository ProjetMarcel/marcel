// MARCEL serveur (GitHub Actions) : notifications ntfy, appel Twilio optionnel, radar d'entreprises, veille.
// Usage : node scripts/marcel-server.mjs [auto|test|radar|briefing|bilan]
import { readFileSync, writeFileSync, appendFileSync, existsSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const E = process.env;
const log = (...a) => console.log('[marcel]', ...a);
export const loadCfg = () => JSON.parse(readFileSync(new URL('marcel.config.json', ROOT), 'utf8'));

/* ---------- temps (Paris) ---------- */
export function paris(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(d).map(x => [x.type, x.value]));
    return { ymd: `${p.year}-${p.month}-${p.day}`, h: +p.hour % 24 };
}
const addDays = (ymd, n) => { const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const dayNum = (cfg, ymd) => Math.min(180, Math.max(1, Math.round((new Date(ymd + 'T12:00:00Z') - new Date(cfg.startDate + 'T12:00:00Z')) / 864e5) + 1));

/* ---------- radar : scoring ---------- */
const SECT = { '10': 'Alimentation (boulangerie…)', '41': 'Construction', '43': 'Artisans du bâtiment', '45': 'Auto / garage', '47': 'Commerce de détail', '49': 'Transport (taxi…)', '55': 'Hébergement', '56': 'Restauration', '68': 'Immobilier', '69': 'Juridique / comptable', '74': 'Services spécialisés (photo…)', '77': 'Location', '79': 'Voyage', '81': 'Entretien / paysage', '85': 'Enseignement (auto-école…)', '86': 'Santé', '87': 'Médico-social', '88': 'Action sociale', '90': 'Arts / spectacle', '93': 'Sport et loisirs', '95': 'Réparation', '96': 'Services personnels (coiffure, beauté…)' };
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// Convertit un établissement INSEE (Sirene 3.11) en piste, avec un score a priori de 0 à 10 et les raisons.
export function toLead(et, cfg, today) {
    const u = et.uniteLegale || {}, a = et.adresseEtablissement || {}, per = (et.periodesEtablissement || [])[0] || {};
    const naf = per.activitePrincipaleEtablissement || u.activitePrincipaleUniteLegale || '', sec = naf.slice(0, 2);
    const perso = [u.prenomUsuelUniteLegale, u.nomUniteLegale].filter(Boolean).join(' ');
    const nom = per.enseigne1Etablissement || per.denominationUsuelleEtablissement || u.denominationUniteLegale || perso || 'Entreprise';
    const ville = a.libelleCommuneEtablissement || '', cp = a.codePostalEtablissement || '';
    const adresse = [a.numeroVoieEtablissement, a.typeVoieEtablissement, a.libelleVoieEtablissement].filter(Boolean).join(' ');
    const age = Math.round((new Date(today + 'T12:00:00Z') - new Date(et.dateCreationEtablissement + 'T12:00:00Z')) / 864e5);
    const w = cfg.nafPoids?.[sec] ?? cfg.nafParDefaut ?? 1, why = [];
    let s = w * 1.2;                                                         // 0 à 6 selon la clientèle locale du secteur
    why.push(w >= 4 ? 'secteur à clientèle locale' : w <= 2 ? 'secteur peu dépendant de Google Maps' : 'secteur plausible');
    if (age <= 14) { s += 2; why.push(`créée il y a ${age} j`); } else if (age <= 30) { s += 1.5; why.push(`créée il y a ${age} j`); } else if (age <= 60) { s += 1; why.push(`créée il y a ${age} j`); }
    const cj = String(u.categorieJuridiqueUniteLegale || '');
    if (cj.startsWith('1')) { s += .5; why.push('entrepreneur individuel : décideur unique'); } else if (cj.startsWith('5')) { s += 1; why.push('société : budget probable'); }
    const eff = per.trancheEffectifsEtablissement || u.trancheEffectifsUniteLegale;
    if (eff && !['NN', '00'].includes(eff)) { s += 1; why.push('a des salariés'); }
    return { id: et.siret, nom, ville, cp, adresse, creation: et.dateCreationEtablissement, naf, sec: SECT[sec] || ('NAF ' + sec), sectLabel: SECT[sec] || ('NAF ' + naf), score: Math.min(10, +s.toFixed(1)), why, maps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([nom, adresse, cp, ville].filter(Boolean).join(' ')) };
}
const publicLead = l => ({ id: l.id, nom: l.nom, ville: l.ville, cp: l.cp, adresse: l.adresse, creation: l.creation, naf: l.naf, sec: l.sec, sect: l.sectLabel, score: l.score, why: l.why, maps: l.maps, gbp: l.gbp, new: l.new });

/* ---------- radar : sources ---------- */
async function insee(cfg, today) {
    if (!E.INSEE_KEY) return { status: "clé INSEE absente : le radar est inactif (voir le guide)", leads: [] };
    const since = addDays(today, -(cfg.radar.jours || 45)), out = [];
    for (const dep of cfg.radar.departements || []) {
        const q = `dateCreationEtablissement:[${since} TO ${today}] AND codePostalEtablissement:${dep}* AND etatAdministratifEtablissement:A AND statutDiffusionEtablissement:O AND etablissementSiege:true`;
        const url = 'https://api.insee.fr/api-sirene/3.11/siret?nombre=300&q=' + encodeURIComponent(q);
        try {
            const r = await fetch(url, { headers: { 'X-INSEE-Api-Key-Integration': E.INSEE_KEY, Accept: 'application/json' } });
            if (!r.ok) { return { status: `INSEE a répondu ${r.status} : ${(await r.text()).slice(0, 160)}`, leads: out }; }
            out.push(...((await r.json()).etablissements || []));
        } catch (e) { return { status: 'INSEE injoignable : ' + e.message, leads: out }; }
    }
    return { status: '', leads: out };
}

async function placesCheck(leads, cfg) {
    if (!E.PLACES_KEY) return 0;
    let n = 0;
    for (const l of leads.slice(0, cfg.radar.placesMax || 20)) {
        try {
            const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': E.PLACES_KEY, 'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount' },
                body: JSON.stringify({ textQuery: `${l.nom} ${l.ville}`, languageCode: 'fr', maxResultCount: 3 })
            });
            if (!r.ok) { log('Places', r.status); break; }
            const names = ((await r.json()).places || []);
            const key = norm(l.nom).split(' ').filter(w => w.length >= 4);
            const hit = names.find(p => { const d = norm(p.displayName?.text); return key.some(k => d.includes(k)) || d.includes(norm(l.nom)); });
            n++;
            if (!hit) { l.gbp = { found: false }; l.score = Math.min(10, +(l.score + 3).toFixed(1)); l.why.push('aucune fiche Google trouvée'); }
            else {
                l.gbp = { found: true, reviews: hit.userRatingCount || 0, rating: hit.rating || 0 };
                if ((hit.userRatingCount || 0) < 5) { l.score = Math.min(10, +(l.score + 2).toFixed(1)); l.why.push('fiche Google quasi vide'); } else l.score = Math.max(0, +(l.score - 1).toFixed(1));
            }
        } catch (e) { log('Places', e.message); break; }
    }
    return n;
}

async function trends() {
    try {   // flux public non documenté officiellement : tentative simple, échec toléré
        const r = await fetch('https://trends.google.com/trending/rss?geo=FR', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) return [];
        const t = [...(await r.text()).matchAll(/<title>(?:<!\[CDATA\[)?([^<\]]+)/g)].map(m => m[1].trim()).slice(1, 9);
        return t;
    } catch { return []; }
}

async function veille(cfg, today) {
    if (!E.GEMINI_KEY) return '';
    const prompt = `Nous sommes le ${today}. Zone : ${cfg.zone}. Je vends la gestion de fiches Google Business Profile (150 €/mois) à des professionnels locaux de tous secteurs. Utilise la recherche Google et donne 3 opportunités concrètes et récentes exploitables cette semaine (ouvertures ou événements locaux, aides, tendances de recherche, changements de Google Business Profile). 3 puces de 25 mots maximum, sans introduction, avec la source entre parenthèses. N'invente rien.`;
    for (const m of ['gemini-2.5-flash', 'gemini-3.5-flash']) {
        try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': E.GEMINI_KEY }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }) });
            const d = await r.json();
            const t = d.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim();
            if (t) return t.slice(0, 900);
        } catch { /* modèle suivant */ }
    }
    return '';
}

export async function radar(cfg, today) {
    const prev = existsSync(new URL('radar.json', ROOT)) ? JSON.parse(readFileSync(new URL('radar.json', ROOT), 'utf8')) : { leads: [] };
    const seen = new Set((prev.leads || []).map(l => l.id));
    const src = await insee(cfg, today);
    let leads = src.leads.map(et => toLead(et, cfg, today)).filter(l => l.id).sort((a, b) => b.score - a.score);
    const checked = await placesCheck(leads, cfg);
    leads = leads.sort((a, b) => b.score - a.score).slice(0, cfg.radar.max || 40).map(l => ({ ...l, new: !seen.has(l.id) }));
    const out = { generated: new Date().toISOString(), source: E.INSEE_KEY ? 'INSEE Sirene (créations récentes, diffusibles)' : 'aucune', zone: `${cfg.zone} (dép. ${(cfg.radar.departements || []).join(', ')})`, placesChecked: checked, status: src.status, trends: await trends(), veille: await veille(cfg, today), leads: leads.map(publicLead) };
    if (!out.leads.length && prev.leads?.length && src.status) { out.leads = prev.leads; out.status += ' (anciennes pistes conservées)'; }
    writeFileSync(new URL('radar.json', ROOT), JSON.stringify(out, null, 1));
    log(`radar : ${out.leads.length} pistes, ${checked} fiches Google vérifiées${src.status ? ', statut : ' + src.status : ''}`);
    return out;
}

/* ---------- messages ---------- */
const DEFIS = ['Trouve un prescripteur local (comptable, assureur, imprimeur) et propose-lui un audit de sa propre fiche.', "Filme un audit de 60 s d'une fiche faible et envoie-le au patron.", 'Appelle 3 clients actuels : demande-leur 1 recommandation chacun.', 'Passe 1 h dans une zone commerçante : 20 présentations de 30 secondes.', "Repère 5 commerces avec un avis négatif sans réponse et propose d'y répondre.", 'Propose le trimestre à 390 € à chaque devis en cours.', 'Contacte une agence web ou un freelance : propose-lui la gestion de fiches en marque blanche.'];
export function compose(kind, cfg, rad, today) {
    const n = dayNum(cfg, today), L = rad?.leads || [], hot = L.filter(l => l.new).length;
    const base = (E.GITHUB_REPOSITORY ? `https://${E.GITHUB_REPOSITORY.split('/')[0]}.github.io/${E.GITHUB_REPOSITORY.split('/')[1]}/` : '');
    const click = (cfg.appUrl || base || '') + '?call=1';
    const lines = [];
    if (kind == 'briefing') {
        lines.push(`Jour ${n}/180. Ta mission adaptative est prête : ouvre Marcel (je t'appelle).`);
        if (L.length) lines.push(`Radar : ${L.length} piste${L.length > 1 ? "s" : ""}${hot ? ` dont ${hot} nouvelle${hot > 1 ? 's' : ''}` : ''}. Meilleure : ${L[0].nom} (${L[0].ville}, ${L[0].score}/10).`);
        if (rad?.veille) lines.push(rad.veille.split('\n').find(x => x.trim())?.replace(/^[-*•\s]+/, '').slice(0, 160));
        lines.push('Défi : ' + DEFIS[(n + new Date(today).getDate()) % DEFIS.length]);
    } else if (kind == 'bilan') {
        lines.push(`Bilan du jour ${n} : contacts logués ? journée validée ? Deux minutes avec Marcel.`);
        if (hot) lines.push(`${hot} piste${hot > 1 ? 's' : ''} fraîche${hot > 1 ? 's' : ''} au radar n'${hot > 1 ? 'ont' : 'a'} pas été vue${hot > 1 ? 's' : ''}.`);
    } else lines.push('Test : si tu lis ceci appli fermée, les alertes serveur fonctionnent.');
    const title = kind == 'bilan' ? `MARCEL - Bilan J${n}` : kind == 'briefing' ? `MARCEL - Jour ${n}` : 'MARCEL - Test serveur';
    return { title, message: lines.filter(Boolean).join('\n'), click };
}

/* ---------- envoi ---------- */
const note = t => { console.log(t); if (E.GITHUB_STEP_SUMMARY) appendFileSync(E.GITHUB_STEP_SUMMARY, t + '\n\n'); };
const fail = t => { console.log('::error::' + t); if (E.GITHUB_STEP_SUMMARY) appendFileSync(E.GITHUB_STEP_SUMMARY, '❌ ' + t + '\n\n'); process.exitCode = 1; return false; };
async function ntfy(m) {
    const topic = (E.NTFY_TOPIC || '').trim();      // un espace ou un retour à la ligne collé avec le secret suffit à tout casser
    if (!topic) return fail("Le secret NTFY_TOPIC est vide ou n'existe pas pour ce dépôt. Va dans Settings → Secrets and variables → Actions → Repository secrets : le nom doit être exactement NTFY_TOPIC (majuscules).");
    if (!/^[-_A-Za-z0-9]{1,64}$/.test(topic)) return fail(`Le nom de canal contient des caractères interdits ou dépasse 64 caractères (${topic.length} caractères). Seuls lettres, chiffres, tirets et underscores sont permis.`);
    note(`Canal ntfy : ${topic.length} caractères${/^marcel-[0-9a-f]{16}$/.test(topic) ? ' (format généré par l\'appli)' : ''}.`);
    const web = /^https?:\/\//.test(m.click || '');
    const msg = { topic, title: m.title, message: m.message, priority: 5, tags: ['phone'], ...(web ? { click: m.click, actions: [{ action: 'view', label: 'Appeler Marcel', url: m.click, clear: true }] } : {}) };
    let r, body = '';
    try { r = await fetch('https://ntfy.sh/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(msg) }); body = (await r.text()).slice(0, 200); }
    catch (e) { return fail('ntfy.sh injoignable depuis GitHub : ' + e.message); }
    if (!r.ok) return fail(`ntfy a refusé le message (code ${r.status}) : ${body}`);
    note(`✅ Message accepté par ntfy (code ${r.status}). S'il n'arrive pas sur le téléphone : l'app ntfy n'est pas abonnée à CE nom exact de canal, ou ses notifications sont bloquées (permissions, économie de batterie).`);
    return true;
}
// Vérifie dans l'historique récent de ntfy si cette alerte est déjà partie (programmée par l'appli ou envoyée plus tôt)
export async function alreadySent(m) {
    const topic = (E.NTFY_TOPIC || '').trim(); if (!topic) return false;
    try {
        const r = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}/json?poll=1&since=12h`, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) { log('historique ntfy illisible', r.status); return false; }
        const msgs = (await r.text()).split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(x => x && x.event == 'message');
        return msgs.some(x => x.title === m.title);
    } catch (e) { log('vérification ntfy impossible :', e.message); return false; }     // dans le doute on envoie : mieux vaut un doublon qu'un oubli
}
async function appel(m) {
    if (!(E.TWILIO_SID && E.TWILIO_TOKEN && E.TWILIO_FROM && E.MY_PHONE)) return false;
    const x = s => s.replace(/[<>&"']/g, ' ');
    const twiml = `<Response><Say language="fr-FR" voice="alice">${x(m.message)}</Say><Pause length="1"/><Say language="fr-FR" voice="alice">Ouvre Marcel pour répondre. À tout de suite.</Say></Response>`;
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${E.TWILIO_SID}/Calls.json`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${E.TWILIO_SID}:${E.TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ To: E.MY_PHONE, From: E.TWILIO_FROM, Twiml: twiml }) });
    log('twilio', r.status, r.ok ? '' : (await r.text()).slice(0, 200)); return r.ok;
}

export async function main(mode = 'auto') {
    const cfg = loadCfg(), { ymd, h } = paris(), auto = mode == 'auto';
    const bh = cfg.heures?.briefing ?? 9, sh = cfg.heures?.bilan ?? 18;
    // GitHub lance ses tâches avec des retards pouvant dépasser une heure : on travaille sur des fenêtres de 3 h, pas sur une heure pile
    let kind = mode;
    if (auto) kind = h >= bh && h < bh + 3 ? 'briefing' : h >= sh && h < sh + 3 ? 'bilan' : null;
    log(`mode ${mode}, Paris ${ymd} ${h} h → ${kind || 'hors fenêtre, rien à faire'}`);
    if (!kind) return;
    const radF = new URL('radar.json', ROOT);
    let rad = existsSync(radF) ? JSON.parse(readFileSync(radF, 'utf8')) : null;
    const stale = !rad?.generated || paris(new Date(rad.generated)).ymd !== ymd;
    if (kind == 'radar' || (kind == 'briefing' && (!auto || stale))) rad = await radar(cfg, ymd);
    if (kind == 'radar') return;
    const m = compose(kind, cfg, kind == 'test' ? null : rad, ymd);
    if (auto && await alreadySent(m)) { note(`✅ « ${m.title} » est déjà parti aujourd'hui (programmé par l'appli ou exécution précédente) : rien à renvoyer.`); return; }
    if (auto) note(`Rattrapage : « ${m.title} » n'est pas encore parti, envoi maintenant.`);
    await ntfy(m);
    if (kind == 'briefing') await appel(m);
}
// Lancement direct : on compare les chemins RÉELS (un lien symbolique faisait échouer l'ancien test, sans aucun message)
const isMain = (() => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return /marcel-server\.mjs$/.test(process.argv[1] || ''); } })();
if (isMain) { console.log('[marcel] démarrage'); main(process.argv[2] || 'auto').catch(e => { console.error(e); process.exit(1); }); }
