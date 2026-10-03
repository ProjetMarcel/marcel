// MARCEL v7 : playbooks = marche à suivre précise pour chaque journée
const PB = {
    P0: { t: "Verrouiller ton offre, tes tarifs et tes liens de paiement", m: 90, o: "Offre d'une page + 2 liens de paiement testés (mensuel et trimestre)", s: [
        "Fige l'offre : gestion professionnelle de la fiche Google Business Profile = optimisation initiale + mises à jour régulières + 4 posts/mois + gestion des avis + rapport mensuel. Elle vaut pour tous les secteurs locaux.",
        "Fige les 2 tarifs : 150 €/mois, ou 390 € le trimestre payé d'un coup (soit 130 €/mois, 60 € d'économie par trimestre). Présente toujours le trimestre en premier : cash d'avance et 3 mois de rétention.",
        "Crée 2 liens de paiement (ex. Stripe Payment Link ou équivalent ; compare les frais) : abonnement mensuel 150 € et paiement trimestriel 390 €. Teste-les avec 1 €.",
        "Prépare devis et CGV dans Google Docs : durée ferme de 3 mois pour le trimestre, résiliation à 30 jours pour le mensuel, paiement d'avance. Ne promets jamais une position précise sur Google.",
        "Écris ta promesse en 1 ligne : « J'aide les [métier] de [zone] à recevoir plus d'appels depuis Google Maps »."] },
    P1: { t: "Constituer ta liste de 100 prospects qualifiés (tous métiers)", m: 150, o: "Google Sheet de 100 lignes avec score, téléphone et problème n°1", s: [
        "Cible par critères, pas par métier : un commerce ou service local que les clients cherchent sur Google Maps (« près de moi »), avec un client qui rapporte au moins ~100 € ou revient souvent, et un patron joignable. Exemples : artisans, restaurants, coiffeurs, garages, cabinets de santé, commerces. Écarte ceux qui ne dépendent pas de la recherche locale (vente 100 % en ligne, uniquement recommandations).",
        "Crée un Google Sheet « PROSPECTS » avec les colonnes : Entreprise, Métier, Ville, Téléphone, Site, Note, Nb avis, Nb photos, Lien Maps, Score (1-5), Problème n°1, Statut, Dernier contact, Prochaine action.",
        "Collecte par lots d'un métier à la fois (2 à 3 métiers pour atteindre 100) : tes recherches, tes scripts et tes exemples restent cohérents. Manuel : Google Maps « métier + ville », ouvre chaque fiche et copie les infos (~1 min/fiche). Rapide : un outil d'extraction Google Maps (ex. Outscraper ou Apify, essai gratuit possible ; vérifie leurs CGU et le RGPD avant usage commercial). Base officielle : l'API « Recherche d'entreprises » (recherche-entreprises.api.gouv.fr) filtrée par code NAF + département, puis complète le téléphone via Maps.",
        "Filtre : garde les fiches faibles (moins de 30 avis, ou pas de site, ou peu de photos, ou avis sans réponse). Données professionnelles uniquement.",
        "Note chaque ligne : Problème n°1 (« 0 réponse aux avis », « aucune photo récente », « pas de site ») et Score de 1 à 5 (+1 par critère : cherché sur Maps, client à forte valeur, fiche faible, concurrents actifs, patron joignable).",
        "Trie par score décroissant, garde les 100 meilleures lignes et marque les 10 premières : ce sont tes cibles de demain."] },
    P2: { t: "10 mini-audits + 10 vidéos de 60-90 s", m: 150, o: "10 vidéos prêtes à envoyer", s: [
        "Pour chacun des 10 prospects du haut de liste : capture sa fiche Maps et sa position sur « métier + ville » (navigation privée).",
        "Compare avec les 2 concurrents les mieux placés : nombre d'avis, note, photos, catégories, services, posts.",
        "Note 3 points faibles chiffrés et 3 actions (ex. « 12 avis contre 85 pour le n°1 → campagne d'avis »).",
        "Enregistre 60-90 s écran + voix (Loom ou l'enregistreur d'écran du téléphone) : 1) sa fiche, 2) ce qui manque, 3) ce que tu ferais, 4) invitation à un échange de 15 min. Pas de prix dans la vidéo.",
        "Colle chaque lien vidéo dans la colonne « Prochaine action » du Sheet."] },
    P3: { t: "Prospection : 10 nouveaux contacts + relances", m: 120, o: "10 contacts envoyés, relances J+3 et J+7 faites", s: [
        "Relances d'abord : ceux contactés il y a 3 jours, puis 7 jours. Message de 2 lignes : « Avez-vous pu voir ma vidéo ? »",
        "Appelle (créneaux 8h-9h ou 12h-14h, hors coup de feu du métier) : « Bonjour [prénom], je suis [nom], j'aide les [métier] du coin à recevoir plus d'appels via Google. J'ai regardé votre fiche : [problème n°1]. Je vous envoie une vidéo d'1 minute ? »",
        "Répondeur ou refus d'échange : envoie dans l'heure un SMS/email avec le lien vidéo. Email B2B : cite leur activité, ton nom et ta société, une ligne de désinscription (vérifie les règles CNIL).",
        "Mets à jour le Sheet : statut (appelé, vidéo envoyée, intéressé, refus), date, prochaine action.",
        "Dès qu'un prospect est intéressé : propose 2 créneaux de démo de 20 min (visio ou sur place).",
        "Compte à la fin : contacts, réponses, RDV obtenus. Ils alimentent le bilan du dimanche."] },
    P5: { t: "Démo de 20 min et envoi du devis", m: 90, o: "1 démo menée + devis envoyé", s: [
        "Prépare : sa fiche + 2 concurrents ouverts, son problème n°1, ton devis prêt.",
        "Déroule en 20 min : 5 min de questions (appels et clients par semaine, ce qui rapporte le plus), 10 min d'audit à l'écran, 5 min d'offre et de prix.",
        "Objection prix : ramène au coût d'un client perdu (panier moyen × clients manqués par mois).",
        "Conclus par une action datée : « Je vous envoie le devis dans l'heure, on valide jeudi ? »",
        "Envoie le devis + le lien de paiement le jour même et passe le statut à « devis envoyé ».",
        "Pas de démo aujourd'hui ? Utilise ce créneau pour 10 contacts de plus (même méthode que Prospection)."] },
    P6: { t: "Closing : relancer les devis et signer", m: 60, o: "Devis relancés, signatures encaissées", s: [
        "Liste tous les devis envoyés sans réponse.",
        "Appelle chacun (2 min) : « Avez-vous pu regarder ? Qu'est-ce qui vous retient ? » puis envoie le lien de paiement par SMS.",
        "Aux hésitants, propose le premier mois test sans engagement long.",
        "À chaque signature : mets à jour le MRR (CAP €), rattache au parrain dans PARRAINS et demande « qui d'autre pourrait en avoir besoin ? ».",
        "Envoie l'email d'accueil : accès à la fiche, infos à fournir (photos, horaires, services) et date de livraison."] },
    P7: { t: "Livraison client : optimiser une fiche Google", m: 120, o: "1 fiche client livrée", s: [
        "Demande l'accès à la fiche (propriétaire ou gestionnaire) via Google Business Profile.",
        "Renseigne catégorie principale + 2 à 4 secondaires, description (~750 caractères avec métier + ville, sans promesse excessive), horaires, zone de service, services/produits.",
        "Ajoute au moins 10 photos (façade, équipe, réalisations).",
        "Publie 1 post (réalisation + appel à l'action) et prépare-en 3 autres.",
        "Lance les avis : lien court de demande d'avis + message SMS/WhatsApp type pour ses clients ; réponds aux avis existants.",
        "Vérifie la cohérence nom/adresse/téléphone entre sa fiche, son site, Facebook et les annuaires clés (Pages Jaunes, Bing Places, Apple Plans).",
        "Capture les statistiques « Performance » du profil : ce sera ton « avant » pour le bilan mensuel."] },
    P8: { t: "Parrainage : relancer 3 ambassadeurs", m: 45, o: "3 ambassadeurs relancés, récompenses dues réglées", s: [
        "Ouvre PARRAINS : repère les ambassadeurs sans recommandation récente.",
        "Envoie à 3 d'entre eux le pitch (bouton PITCH) avec une phrase personnelle.",
        "Pose une question précise : « Quel pro autour de toi galère à avoir des clients ? »",
        "Ajoute chaque recommandation dans l'appli et contacte le pro dans les 24 h.",
        "Règle les récompenses dues (virement 50 € ou mois offert) : ta réactivité nourrit le bouche-à-oreille."] },
    P9: { t: "Preuves : avant/après et avis client", m: 60, o: "1 cas client prêt à utiliser", s: [
        "Pour 1 client : capture ses statistiques Performance (appels, itinéraires, clics) avant/après.",
        "Demande-lui un avis Google et un témoignage de 2 lignes par SMS.",
        "Crée un visuel avant/après (Canva ou équivalent).",
        "Intègre-le à ta prochaine vidéo de prospection et à ton site."] },
    P10: { t: "Bilan de la semaine et plan de la suivante", m: 30, o: "Chiffres à jour + 1 ajustement décidé", s: [
        "Compte : contacts, réponses, RDV, devis, signatures, MRR.",
        "Mets à jour le MRR dans CAP € et calcule tes vrais taux (réponse, RDV, signature).",
        "Trouve le goulot : peu de réponses = liste ou accroche ; RDV sans signature = offre ou prix ; peu de RDV = volume de contacts.",
        "Demande à Marcel le bilan CAP et 1 ajustement pour la semaine.",
        "Valide la semaine et repose-toi."] },
    P11: { t: "Renouvellements et passage au trimestre", m: 60, o: "Clients à renouveler contactés, lien 390 € envoyé", s: [
        "Ouvre CAP € : repère les trimestriels dont le renouvellement tombe dans 14 jours et les mensuels clients depuis plus de 2 mois.",
        "Pour chacun, prépare un mini-bilan chiffré (appels, itinéraires, clics, nouveaux avis) depuis les statistiques « Performance » de la fiche.",
        "Appelle (5 min) : « Voici ce que votre fiche a généré. Pour continuer, le trimestre est à 390 € au lieu de 450 € (130 €/mois). »",
        "Envoie le lien de paiement 390 € par SMS dans l'heure qui suit l'appel.",
        "Termine par : « Un confrère à qui ça servirait ? » et rappelle le parrainage.",
        "Note le résultat dans CAP € : renouvelé, passé au trimestre ou perdu (avec la raison)."] },
};
const RAMP = ['P1', 'P0', 'P2', 'P3', 'P8', 'P3', 'P10'];            // jours 1 à 7
const WK = ['P3', 'P7', 'P8', 'P5', 'P9', 'P6', 'P10'];             // ensuite, rythme hebdomadaire
const pid = n => (window.pidAdaptive && window.pidAdaptive(n)) || (n <= 7 ? RAMP[n - 1] : WK[(n - 1) % 7]);

function pbHTML(n) {
    const o = plan[n], p = o?.s?.length ? { t: o.t, m: o.m || 60, o: 'défini par Marcel', s: o.s } : (o?.t ? null : PB[pid(n)]);
    if (!p) return '';
    const c = o?.c || [], k = c.filter(Boolean).length;
    return `<div class="pb"><div class="pbh">⏱ ${p.m} min · Livrable : ${esc(p.o)} · ${k}/${p.s.length}</div>
${p.s.map((s, i) => `<div class="stp ${c[i] ? 'on' : ''}" onclick="step(${n},${i})"><i></i><span>${esc(s)}</span></div>`).join('')}
<button class="quick-btn" onclick="coach(${n})">DEMANDER À MARCEL DE ME GUIDER</button></div>`;
}
function step(n, i) {
    const c = [...(plan[n]?.c || [])]; c[i] = !c[i]; setPlan(n, { c });
    navigator.vibrate?.(20); renderPlan(false);
}
function coach(n) {
    const o = plan[n], p = o?.s?.length ? { t: o.t, s: o.s } : PB[pid(n)] || { t: task(n), s: [] };
    go('chat');
    envoyerPromptPredefini(`Guide-moi sur la mission du jour ${n} : « ${p.t} ». Étapes prévues : ${p.s.map((s, i) => `${i + 1}) ${s}`).join(' ')} Donne-moi la première action concrète à faire maintenant (outil, réglage, texte exact à copier), puis attends mon retour avant l'étape suivante.`);
}
