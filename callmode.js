// MARCEL v8 : mode appel vocal (Marcel t'appelle / tu appelles Marcel), conversation voix à voix
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let call = null, ac, ringT, rec, tmr;
const stc = (s, t) => { $('orb').className = 'orb ' + s; $('csub').textContent = t; };

document.head.insertAdjacentHTML('beforeend', `<style>
#call{position:fixed;inset:0;z-index:40;display:none;flex-direction:column;align-items:center;justify-content:space-between;padding:calc(48px + env(safe-area-inset-top)) 24px calc(40px + env(safe-area-inset-bottom));background:radial-gradient(circle at 50% 35%,#0b1d44,#020617 70%);text-align:center}
#call.on{display:flex;animation:in .4s both}#call [hidden]{display:none!important}
.who{font-family:Orbitron,sans-serif;font-size:1.4rem;color:var(--c);letter-spacing:4px;text-shadow:var(--gc)}.sub{font-size:.8rem;color:var(--d);margin-top:6px}
.orb{position:relative;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--c) 30%,#0a3a6e 75%);box-shadow:0 0 50px rgba(0,240,255,.5);cursor:pointer;transition:.4s}
.orb i{position:absolute;inset:0;border-radius:50%;border:2px solid var(--c);opacity:0}
.orb.listen i{animation:ripple 2s infinite}.orb.listen i:nth-child(2){animation-delay:.6s}.orb.listen i:nth-child(3){animation-delay:1.2s}
@keyframes ripple{from{opacity:.8;transform:scale(1)}to{opacity:0;transform:scale(2.2)}}
.orb.talk{background:radial-gradient(circle at 35% 30%,#fff,var(--p) 35%,#3b0a6e 78%);box-shadow:0 0 60px rgba(189,0,255,.6);animation:talk .5s ease-in-out infinite alternate}
@keyframes talk{to{transform:scale(1.12)}}
.orb.think i{opacity:1;border-style:dashed;inset:-10px;animation:spin 3s linear infinite}
.orb.ring{animation:shake .6s infinite}.orb.ring i{animation:ripple 1.2s infinite}@keyframes shake{25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}
.orb.idle{filter:grayscale(.7);opacity:.7}
.cap{min-height:90px;max-width:520px;font-size:.9rem;line-height:1.5}
.ctl{display:flex;gap:40px;justify-content:center}.ctl button{width:64px;height:64px;border-radius:50%;border:1px solid var(--c);background:rgba(0,240,255,.1);color:#fff;font-size:1.3rem;cursor:pointer}
.ctl .dec{background:#dc2626;border:0}.ctl .acc{background:#16a34a;border:0;animation:pulse 1s infinite}.ctl .off{opacity:.4}
</style>`);
document.body.insertAdjacentHTML('beforeend', `<div id="call"><div><div class="who">MARCEL</div><div class="sub" id="csub"></div><div class="sub" id="ctime">00:00</div></div>
<div class="orb" id="orb" onclick="listen(true)"><i></i><i></i><i></i></div><div class="cap" id="ccap"></div>
<div><div class="ctl" id="cring"><button class="dec" onclick="endCall()">✕</button><button class="acc" onclick="acceptCall()">✆</button></div>
<div class="ctl" id="clive" hidden><button id="cmic" onclick="toggleMic()">🎙</button><button class="dec" onclick="endCall()">⏹</button></div></div></div>`);

function ring(on) {
    clearInterval(ringT); if (!on) return;
    try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.();
        const beep = () => { [440, 480].forEach(f => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = .08; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + .8); }); navigator.vibrate?.([400, 200, 400]); };
        beep(); ringT = setInterval(beep, 3000);
    } catch { }
}

function startCall(inc) {
    if (call) return;
    if (!SR) return alert("Reconnaissance vocale indisponible ici : utilise Chrome (Android) ou un Safari récent.");
    if (!localStorage.getItem('marcel_api_key')) return configurerCleAPI();
    call = { inc, mute: false }; window.voiceMode = true; $('call').classList.add('on');
    $('cring').hidden = !inc; $('clive').hidden = !!inc;
    if (inc) { stc('ring', 'Appel entrant…'); $('ccap').textContent = new Date().getHours() < 14 ? 'Briefing du matin' : 'Bilan du soir'; ring(true); }
    else acceptCall();
}
function acceptCall() {
    ring(false); $('cring').hidden = true; $('clive').hidden = false; const t0 = Date.now();
    tmr = setInterval(() => { const s = (Date.now() - t0) / 1e3 | 0; $('ctime').textContent = String(s / 60 | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }, 1000);
    turn(call.inc ? "📞 Appel de Marcel : fais-moi le briefing parlé (mission du jour, alertes importantes), puis demande-moi si je suis prêt à attaquer." : "📞 Je t'appelle : dis bonjour en une phrase et demande-moi ce dont j'ai besoin.");
}
async function turn(text) {
    if (!call) return;
    stc('think', 'Marcel réfléchit…'); push('user', text); bubble('user', text);
    try { const r = await appelerGemini(); if (!call) return; push('model', r); bubble('model', r); say(r); }
    catch (e) { chat.pop(); S('marcel_chat', chat); say("Je n'arrive pas à joindre le noyau. " + e.message); }
}
function say(t) {
    if (!call) return;
    const q = t.replace(/[*#_`>~]/g, '').replace(/https?:\/\/\S+/g, 'le lien').split(/(?<=[.!?:])\s+/).filter(Boolean);
    $('ccap').textContent = t.replace(/[*#_`]/g, '').slice(0, 240);
    speechSynthesis.cancel(); if (!q.length) return listen(); stc('talk', 'Marcel parle');
    const v = speechSynthesis.getVoices().find(x => x.lang.startsWith('fr'));
    q.forEach((s, i) => { const u = new SpeechSynthesisUtterance(s); u.lang = 'fr-FR'; if (v) u.voice = v; u.rate = 1.05; if (i == q.length - 1) u.onend = u.onerror = () => listen(); speechSynthesis.speak(u); });
}
function listen(force) {
    if (!call) return;
    if (call.mute && force !== true) return stc('idle', 'Micro coupé : touche le cercle pour parler');
    if (speechSynthesis.speaking) return;
    try { rec?.abort(); } catch { }
    stc('listen', "Je t'écoute…"); rec = new SR(); rec.lang = 'fr-FR'; rec.interimResults = true; let last = '';
    rec.onresult = e => { last = [...e.results].map(r => r[0].transcript).join(''); $('ccap').textContent = last; };
    rec.onerror = e => { if (/not-allowed|service-not-allowed/.test(e.error)) { call.mute = true; stc('idle', "Micro refusé : autorise-le dans le navigateur"); } };
    rec.onend = () => { if (!call) return; if (last.trim()) turn(last.trim()); else if (!call.mute) setTimeout(() => listen(), 300); };
    try { rec.start(); } catch { }
}
function toggleMic() {
    call.mute = !call.mute; $('cmic').classList.toggle('off', call.mute);
    if (call.mute) { try { rec?.abort(); } catch { } stc('idle', 'Micro coupé : touche le cercle pour parler'); } else listen();
}
function endCall() {
    const r = rec; call = null; window.voiceMode = false; ring(false); speechSynthesis.cancel(); clearInterval(tmr);
    try { r?.abort(); } catch { }
    $('call').classList.remove('on'); $('ctime').textContent = '00:00'; scrollChat();
}

// Appel automatique : matin (9h-12h) et soir (18h-21h), une fois par créneau, appli ouverte ou ouverte depuis la notification
const autoOn = () => localStorage.getItem('marcel_callauto') != 'off';
function autoCheck() {
    if (call || document.hidden || !autoOn()) return;
    const d = new Date(), h = d.getHours(), k = iso(d), slot = h >= 9 && h < 12 ? 'm' : h >= 18 && h < 21 ? 's' : null;
    if (!slot || localStorage.getItem('marcel_call_' + slot) == k) return;
    localStorage.setItem('marcel_call_' + slot, k); startCall(true);
}
(function () {
    const q = document.querySelector('.quick-actions');
    const a = document.createElement('button'); a.className = 'quick-btn'; a.textContent = 'APPELER MARCEL'; a.onclick = () => startCall(false);
    const b = document.createElement('button'); b.className = 'quick-btn';
    const lab = () => b.textContent = 'APPEL AUTO : ' + (autoOn() ? 'ON' : 'OFF');
    b.onclick = () => { localStorage.setItem('marcel_callauto', autoOn() ? 'off' : 'on'); lab(); }; lab();
    q.prepend(b); q.prepend(a);
    addEventListener('load', () => { speechSynthesis.getVoices(); if (/[?&]call=1/.test(location.search)) startCall(true); else setTimeout(autoCheck, 1500); });
    setInterval(autoCheck, 6e4); document.addEventListener('visibilitychange', () => { if (!document.hidden) autoCheck(); });
})();
