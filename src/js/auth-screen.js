"use strict";

import { getSupabaseClient } from "./supabase.js";
import { Auth } from "./auth.js";
import { Sync } from "./sync.js";
import { Storage } from "./storage.js";

const MESSAGES = {
  welcome: [
    "Ton espace académique t'attend.",
    "Chaque session commence ici.",
    "Prêt à avancer ? On y va.",
  ],
  emailSent: "Vérifie ta boîte mail. Code valable 10 minutes.",
  otpSuccess: "Identité confirmée. Bienvenue dans UpTe.",
  googleSuccess: (name) => `Content de te revoir, ${name}.`,
  webauthn: "Connexion instantanée au prochain démarrage ?",
};

const FILIERES = [
  "Licence Pro GL",
  "Licence Pro SRI",
  "Licence Pro IG",
  "Licence Pro RT",
  "Licence Pro GE",
  "Licence 1",
  "Licence 2",
  "Licence 3",
  "Master 1",
  "Master 2",
  "BTS Informatique",
  "Autre",
];

const SEMESTRES = [
  "Semestre 1",
  "Semestre 2",
  "Semestre 3",
  "Semestre 4",
  "Semestre 5",
  "Semestre 6",
  "Trimestre 1",
  "Trimestre 2",
  "Trimestre 3",
];

function randomMsg(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const AuthScreen = {
  _el: null,
  _step: "welcome",
  _email: "",
  _cameraStream: null,
  _onboardingData: {},

  /* ════════════════════════════════
     MODALE CONTEXTUELLE
     Déclenchée après X actions
  ════════════════════════════════ */
  showContextualPrompt(reason = "general") {
    if (Auth.isAuthenticated()) return;
    if (document.getElementById("authContextModal")) return;

    const REASONS = {
      pomodoro: {
        icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
        title: "Sauvegarde ta progression",
        text: "Tu as complété plusieurs sessions Pomodoro. Connecte-toi pour ne jamais perdre ta progression et accéder depuis n'importe quel appareil.",
        cta: "Sauvegarder ma progression",
      },
      share: {
        icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
        title: "Partage ton EDT",
        text: "Pour partager ton emploi du temps avec tes camarades, tu dois créer un compte. C'est gratuit et prend 30 secondes.",
        cta: "Créer mon compte",
      },
      promo: {
        icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        title: "Rejoins ta promo",
        text: "Révise avec les autres étudiants de ta filière. Partage des sujets corrigés, organise des révisions en live.",
        cta: "Rejoindre ma promo",
      },
      general: {
        icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        title: "Passe au niveau supérieur",
        text: "Synchronise tes données, rejoins ta promo et accède aux révisions en groupe. Tout ça en un clic.",
        cta: "Créer mon compte gratuitement",
      },
    };

    const r = REASONS[reason] || REASONS.general;

    const isMobile = window.innerWidth <= 768;
    const modal = document.createElement("div");
    modal.id = "authContextModal";
    modal.style.cssText = `
  position:fixed;inset:0;z-index:8000;
  display:flex;
  align-items:${isMobile ? "flex-end" : "center"};
  justify-content:center;
  padding:0;
  animation:fadeIn .2s ease;
`;
    modal.innerHTML = `
      <div style="
        position:absolute;inset:0;background:rgba(0,0,0,0.5);
        backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
      " onclick=""></div>
      <div style="
        position:relative;z-index:1;
        width:${isMobile ? "100%" : "420px"};
        max-width:${isMobile ? "480px" : "420px"};
        background:var(--surface);
        border-radius:${isMobile ? "24px 24px 0 0" : "20px"};
        padding:32px 28px ${isMobile ? "48px" : "32px"};
        box-shadow:${isMobile ? "0 -8px 40px rgba(0,0,0,0.2)" : "0 8px 40px rgba(0,0,0,0.2)"};
        animation:${isMobile ? "slideUp" : "pageEnter"} .3s cubic-bezier(.16,1,.3,1);
      ">
        <!-- Handle -->
        <div style="
          width:40px;height:4px;border-radius:99px;
          background:var(--border);
          margin:0 auto 24px;
        "></div>

        <!-- Icon -->
        <div style="
          width:60px;height:60px;border-radius:18px;
          background:var(--green-dim);border:1px solid var(--green3);
          display:flex;align-items:center;justify-content:center;
          color:var(--green);margin:0 auto 20px;
        ">${r.icon}</div>

        <!-- Text -->
        <div style="text-align:center;margin-bottom:28px">
          <div style="
            font-family:'Syne',sans-serif;font-weight:800;font-size:20px;
            color:var(--text);margin-bottom:10px;
          ">${r.title}</div>
          <div style="font-size:14px;color:var(--muted);line-height:1.6;max-width:320px;margin:0 auto">
            ${r.text}
          </div>
        </div>

        <!-- CTA -->
        <div style="display:flex;flex-direction:column;gap:10px">
          <button onclick="AuthScreen._closeContextual();AuthScreen.show()" style="
            width:100%;padding:15px;
            background:var(--green3);border:none;border-radius:14px;
            font-family:'Syne',sans-serif;font-weight:700;font-size:15px;
            color:#fff;cursor:pointer;transition:opacity .2s;
          " onmouseenter="this.style.opacity='.9'" onmouseleave="this.style.opacity='1'">
            ${r.cta}
          </button>
          <button onclick="AuthScreen._closeContextual()" style="
            width:100%;padding:12px;
            background:none;border:none;
            font-size:14px;color:var(--muted);cursor:pointer;
          ">
            Continuer sans compte
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Injecte l'animation slideUp si pas encore présente
    if (!document.getElementById("authSlideUpStyle")) {
      const s = document.createElement("style");
      s.id = "authSlideUpStyle";
      s.textContent = `@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`;
      document.head.appendChild(s);
    }
  },

  _closeContextual() {
    const m = document.getElementById("authContextModal");
    if (!m) return;
    m.style.animation = "toast-out .2s ease forwards";
    setTimeout(() => m.remove(), 200);
  },

  /* ════════════════════════════════
     ÉCRAN PRINCIPAL
  ════════════════════════════════ */
  show() {
    if (document.getElementById("authScreen")) return;

    const el = document.createElement("div");
    el.id = "authScreen";
    el.style.cssText = `
      position:fixed;inset:0;z-index:9000;
      background:var(--bg);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      padding:24px;
      overflow:hidden;
      animation:fadeIn .25s ease;
    `;
    document.body.appendChild(el);
    this._el = el;
    this._renderWelcome();
  },

  hide() {
    const el = document.getElementById("authScreen");
    if (!el) return;
    el.style.animation = "toast-out .3s ease forwards";
    setTimeout(() => {
      el.remove();
      this._stopCamera();
    }, 300);
  },

  /* ════════════════════════════════
     ÉTAPE 1 — ACCUEIL
  ════════════════════════════════ */
  _renderWelcome() {
    this._step = "welcome";
    this._el.innerHTML = `
      <!-- Caméra RA en fond -->
      <div id="authCameraWrap" style="
        position:fixed;inset:0;z-index:0;
        overflow:hidden;opacity:0;
        transition:opacity .6s ease;pointer-events:none;
      ">
        <video id="authCamera" autoplay muted playsinline style="
          width:100%;height:100%;object-fit:cover;
          filter:blur(20px) brightness(0.25) saturate(0.5);
        "></video>
      </div>

      <!-- Contenu principal -->
      <div style="
        position:relative;z-index:1;
        width:100%;max-width:400px;
        display:flex;flex-direction:column;
        align-items:center;gap:36px;
      ">
        <!-- Logo + titre -->
        <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px">
          <div style="
            background:linear-gradient(135deg,var(--green3),var(--accent-logo-end));
            border-radius:24px;padding:18px;
            box-shadow:0 12px 40px var(--green-glow);
          ">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="white" stroke-width="2.5" stroke-linecap="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div style="
            font-family:'Syne',sans-serif;font-weight:800;font-size:32px;
            color:var(--text);letter-spacing:-0.5px;
          ">Up&#x25CF;Te</div>
          <div style="font-size:14px;color:var(--muted);line-height:1.5;max-width:280px">
            ${randomMsg(MESSAGES.welcome)}
          </div>
        </div>

        <!-- Actions -->
        <div style="width:100%;display:flex;flex-direction:column;gap:12px">

          <!-- Google -->
          <button id="authGoogleBtn" style="
            width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
            background:var(--surface);border:1.5px solid var(--border);
            border-radius:14px;padding:15px 20px;
            font-family:'Syne',sans-serif;font-weight:600;font-size:14px;
            color:var(--text);cursor:pointer;
            transition:all .2s ease;
          "
            onmouseenter="this.style.borderColor='var(--green3)';this.style.transform='translateY(-1px)'"
            onmouseleave="this.style.borderColor='var(--border)';this.style.transform='translateY(0)'">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <!-- Séparateur -->
          <div style="display:flex;align-items:center;gap:12px;color:var(--muted2);font-size:12px">
            <div style="flex:1;height:1px;background:var(--border)"></div>
            ou avec ton email
            <div style="flex:1;height:1px;background:var(--border)"></div>
          </div>

          <!-- Email -->
          <input id="authEmailInput" type="email" placeholder="ton.email@exemple.com"
            style="
              width:100%;padding:15px 16px;
              background:var(--surface);border:1.5px solid var(--border);
              border-radius:14px;
              font-family:'DM Sans',sans-serif;font-size:14px;
              color:var(--text);outline:none;box-sizing:border-box;
              transition:border-color .2s;
            "
            onfocus="this.style.borderColor='var(--green3)'"
            onblur="this.style.borderColor='var(--border)'"
            onkeydown="if(event.key==='Enter')document.getElementById('authOtpBtn').click()"
          />
          <div id="authEmailError" style="
            font-size:12px;color:var(--red);display:none;padding:0 4px;margin-top:-4px;
          "></div>

          <button id="authOtpBtn" style="
            width:100%;padding:15px 20px;
            background:var(--green-dim);border:1.5px solid var(--green3);
            border-radius:14px;
            font-family:'Syne',sans-serif;font-weight:700;font-size:14px;
            color:var(--green);cursor:pointer;
            transition:all .2s ease;
          "
            onmouseenter="this.style.background='var(--green3)';this.style.color='#fff'"
            onmouseleave="this.style.background='var(--green-dim)';this.style.color='var(--green)'">
            Recevoir un code
          </button>
        </div>

        <!-- Footer -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;width:100%">
          <button onclick="window.AuthScreen._skipAuth()" style="
            background:none;border:none;cursor:pointer;
            font-size:13px;color:var(--muted);
            text-decoration:underline;text-underline-offset:3px;
          ">
            Continuer sans compte
          </button>
          <button id="authCameraToggle" style="
            background:none;border:none;cursor:pointer;
            color:var(--muted2);font-size:11px;
            display:flex;align-items:center;gap:6px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            Activer l'ambiance RA
          </button>
        </div>

      </div>
    `;

    document.getElementById("authGoogleBtn").onclick = () =>
      this._handleGoogle();
    document.getElementById("authOtpBtn").onclick = () => this._handleSendOTP();
    document.getElementById("authCameraToggle").onclick = () =>
      this._toggleCamera();
  },

  /* ════════════════════════════════
     ÉTAPE 2 — OTP
  ════════════════════════════════ */
  _renderOTP(email) {
    this._step = "otp";
    this._email = email;
    this._el.innerHTML = `
      <div style="
        position:relative;z-index:1;
        width:100%;max-width:400px;
        display:flex;flex-direction:column;
        align-items:center;gap:32px;
      ">
        <button onclick="window.AuthScreen._renderWelcome()" style="
          align-self:flex-start;background:none;border:none;cursor:pointer;
          color:var(--muted);display:flex;align-items:center;gap:6px;font-size:13px;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour
        </button>

        <div style="text-align:center">
          <div style="
            width:60px;height:60px;border-radius:18px;
            background:var(--green-dim);border:1.5px solid var(--green3);
            display:flex;align-items:center;justify-content:center;
            margin:0 auto 16px;color:var(--green);
          ">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <div style="
            font-family:'Syne',sans-serif;font-weight:800;font-size:22px;
            color:var(--text);margin-bottom:8px;
          ">Vérifie ta boîte mail</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.6">
            ${MESSAGES.emailSent}<br/>
            <strong style="color:var(--text)">${email}</strong>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;width:100%">
          <!-- 6 cases OTP -->
          <div style="display:flex;gap:8px;justify-content:center">
            ${Array(6)
              .fill(0)
              .map(
                (_, i) => `
              <input id="otp-${i}" type="text" maxlength="1" inputmode="numeric"
                style="
                  width:46px;height:54px;text-align:center;
                  background:var(--surface);border:2px solid var(--border);
                  border-radius:12px;
                  font-family:'Syne',sans-serif;font-weight:700;font-size:22px;
                  color:var(--text);outline:none;
                  transition:border-color .15s,transform .1s;
                  box-sizing:border-box;
                "
                onfocus="this.style.borderColor='var(--green3)';this.style.transform='scale(1.05)'"
                onblur="this.style.borderColor='var(--border)';this.style.transform='scale(1)'"
                oninput="window.AuthScreen._handleOTPInput(${i}, this)"
                onkeydown="window.AuthScreen._handleOTPKey(${i}, event)"
              />`,
              )
              .join("")}
          </div>

          <div id="otpError" style="font-size:12px;color:var(--red);display:none;text-align:center"></div>

          <button id="otpVerifyBtn" style="
            width:100%;padding:15px 20px;
            background:var(--green3);border:none;border-radius:14px;
            font-family:'Syne',sans-serif;font-weight:700;font-size:14px;
            color:#fff;cursor:pointer;opacity:0.4;
            transition:opacity .2s;
          " disabled>
            Confirmer le code
          </button>

          <button onclick="window.AuthScreen._handleSendOTP(true)" style="
            background:none;border:none;cursor:pointer;
            color:var(--muted);font-size:12px;text-decoration:underline;
          ">
            Renvoyer le code
          </button>
        </div>

        <div style="font-size:11px;color:var(--muted2);text-align:center">
          Expire dans <span id="otpCountdown" style="font-weight:600;color:var(--text)">10:00</span>
        </div>
      </div>
    `;

    document.getElementById("otp-0")?.focus();
    document.getElementById("otpVerifyBtn").onclick = () =>
      this._handleVerifyOTP();
    this._startOTPTimer();
  },

  /* ════════════════════════════════
     ÉTAPE 3 — ONBOARDING
  ════════════════════════════════ */
  _renderOnboarding(name) {
    this._step = "onboarding";
    this._onboardingData = {};
    if (!this._el) {
      this.show();
    }

    this._el.innerHTML = `
      <div style="
        position:relative;z-index:1;
        width:100%;max-width:420px;
        display:flex;flex-direction:column;gap:28px;
      ">
        <!-- Header -->
        <div style="text-align:center">
          <div style="
            font-size:32px;margin-bottom:8px;
          ">👋</div>
          <div style="
            font-family:'Syne',sans-serif;font-weight:800;font-size:22px;
            color:var(--text);margin-bottom:8px;
          ">Bienvenue, ${name} !</div>
          <div style="font-size:13px;color:var(--muted)">
            Dis-nous en plus pour personnaliser ton expérience.
          </div>
        </div>

        <!-- Progression -->
        <div style="display:flex;gap:6px;justify-content:center">
          ${[0, 1, 2]
            .map(
              (i) => `
            <div id="obStep-${i}" style="
              height:4px;border-radius:99px;
              background:${i === 0 ? "var(--green3)" : "var(--border)"};
              flex:1;transition:background .3s;
            "></div>
          `,
            )
            .join("")}
        </div>

        <!-- Étape 1 — Filière -->
        <div id="ob-step-1" style="display:flex;flex-direction:column;gap:16px">
          <div style="
            font-family:'Syne',sans-serif;font-weight:700;font-size:16px;
            color:var(--text);
          ">Ta filière</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${FILIERES.slice(0, 10)
              .map(
                (f) => `
              <button onclick="window.AuthScreen._selectFiliere('${f}', this)" style="
                padding:10px 14px;text-align:left;
                background:var(--surface);border:1.5px solid var(--border);
                border-radius:10px;cursor:pointer;
                font-family:'DM Sans',sans-serif;font-size:13px;
                color:var(--text);transition:all .15s;
              "
                onmouseenter="if(!this.classList.contains('selected')){this.style.borderColor='var(--green3)'}"
                onmouseleave="if(!this.classList.contains('selected')){this.style.borderColor='var(--border)'}">
                ${f}
              </button>
            `,
              )
              .join("")}
          </div>
          <button id="ob-next-1" onclick="window.AuthScreen._obNext(1)" disabled style="
            width:100%;padding:14px;
            background:var(--green3);border:none;border-radius:12px;
            font-family:'Syne',sans-serif;font-weight:700;font-size:14px;
            color:#fff;cursor:pointer;opacity:0.4;transition:opacity .2s;
          ">Suivant →</button>
        </div>

        <!-- Étape 2 — Semestre (caché) -->
        <div id="ob-step-2" style="display:none;flex-direction:column;gap:16px">
          <div style="
            font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:var(--text);
          ">Ton semestre actuel</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            ${SEMESTRES.map(
              (s) => `
              <button onclick="window.AuthScreen._selectSemestre('${s}', this)" style="
                padding:10px;text-align:center;
                background:var(--surface);border:1.5px solid var(--border);
                border-radius:10px;cursor:pointer;
                font-size:13px;color:var(--text);transition:all .15s;
              "
                onmouseenter="if(!this.classList.contains('selected')){this.style.borderColor='var(--green3)'}"
                onmouseleave="if(!this.classList.contains('selected')){this.style.borderColor='var(--border)'}">
                ${s}
              </button>
            `,
            ).join("")}
          </div>
          <button id="ob-next-2" onclick="window.AuthScreen._obNext(2)" disabled style="
            width:100%;padding:14px;
            background:var(--green3);border:none;border-radius:12px;
            font-family:'Syne',sans-serif;font-weight:700;font-size:14px;
            color:#fff;cursor:pointer;opacity:0.4;transition:opacity .2s;
          ">Suivant →</button>
        </div>

        <!-- Étape 3 — Université (caché) -->
        <div id="ob-step-3" style="display:none;flex-direction:column;gap:16px">
          <div style="
            font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:var(--text);
          ">Ton université</div>
          <input id="ob-universite" type="text" placeholder="Ex: Université de Lomé"
            value="${Storage.getSettings().universite || ""}"
            style="
              width:100%;padding:14px 16px;
              background:var(--surface);border:1.5px solid var(--border);
              border-radius:12px;font-size:14px;color:var(--text);
              outline:none;box-sizing:border-box;transition:border-color .2s;
            "
            onfocus="this.style.borderColor='var(--green3)'"
            onblur="this.style.borderColor='var(--border)'"
            oninput="window.AuthScreen._checkObStep3()"
          />
          <input id="ob-ecole" type="text" placeholder="Ex: EPL, FSS, FASEG..."
            value="${Storage.getSettings().ecole || ""}"
            style="
              width:100%;padding:14px 16px;
              background:var(--surface);border:1.5px solid var(--border);
              border-radius:12px;font-size:14px;color:var(--text);
              outline:none;box-sizing:border-box;transition:border-color .2s;
            "
            onfocus="this.style.borderColor='var(--green3)'"
            onblur="this.style.borderColor='var(--border)'"
            oninput="window.AuthScreen._checkObStep3()"
          />
          <button id="ob-finish" onclick="window.AuthScreen._obFinish()" disabled style="
            width:100%;padding:14px;
            background:var(--green3);border:none;border-radius:12px;
            font-family:'Syne',sans-serif;font-weight:700;font-size:14px;
            color:#fff;cursor:pointer;opacity:0.4;transition:opacity .2s;
          ">Créer mon espace ✓</button>
        </div>

      </div>
    `;
  },

  /* ════════════════════════════════
     ÉTAPE 4 — WEBAUTHN
  ════════════════════════════════ */
  _renderWebAuthn(name) {
    this._step = "webauthn";

    // Si WebAuthn non supporté → finalise directement
    if (!window.PublicKeyCredential) {
      this._finalize(name);
      return;
    }

    this._el.innerHTML = `
      <div style="
        position:relative;z-index:1;
        width:100%;max-width:380px;
        display:flex;flex-direction:column;
        align-items:center;gap:28px;text-align:center;
      ">
        <div style="
          width:72px;height:72px;border-radius:22px;
          background:var(--green-dim);border:1.5px solid var(--green3);
          display:flex;align-items:center;justify-content:center;color:var(--green);
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </div>

        <div>
          <div style="
            font-family:'Syne',sans-serif;font-weight:800;font-size:20px;
            color:var(--text);margin-bottom:8px;
          ">Connexion instantanée</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.6;max-width:280px;margin:0 auto">
            ${MESSAGES.webauthn}<br/>
            <span style="font-size:11px;color:var(--muted2)">Face ID, Touch ID ou Windows Hello</span>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;width:100%">
          <button onclick="window.AuthScreen._enrollAndFinalize('${name}')" style="
            width:100%;padding:14px;
            background:var(--green3);border:none;border-radius:12px;
            font-family:'Syne',sans-serif;font-weight:700;font-size:14px;
            color:#fff;cursor:pointer;transition:opacity .2s;
          " onmouseenter="this.style.opacity='.9'" onmouseleave="this.style.opacity='1'">
            Activer la biométrie
          </button>
          <button onclick="window.AuthScreen._finalize('${name}')" style="
            width:100%;padding:12px;
            background:none;border:1.5px solid var(--border);
            border-radius:12px;font-size:14px;
            color:var(--muted);cursor:pointer;
          ">
            Plus tard
          </button>
        </div>

        <div style="font-size:11px;color:var(--muted2)">
          Stocké sur cet appareil uniquement — jamais envoyé à nos serveurs.
        </div>
      </div>
    `;
  },

  /* ════════════════════════════════
     ONBOARDING HELPERS
  ════════════════════════════════ */
  _selectFiliere(filiere, btn) {
    document
      .querySelectorAll("#ob-step-1 button:not(#ob-next-1)")
      .forEach((b) => {
        b.classList.remove("selected");
        b.style.borderColor = "var(--border)";
        b.style.background = "var(--surface)";
        b.style.color = "var(--text)";
      });
    btn.classList.add("selected");
    btn.style.borderColor = "var(--green3)";
    btn.style.background = "var(--green-dim)";
    btn.style.color = "var(--green)";
    this._onboardingData.parcours = filiere;
    const next = document.getElementById("ob-next-1");
    if (next) {
      next.disabled = false;
      next.style.opacity = "1";
    }
  },

  _selectSemestre(semestre, btn) {
    document
      .querySelectorAll("#ob-step-2 button:not(#ob-next-2)")
      .forEach((b) => {
        b.classList.remove("selected");
        b.style.borderColor = "var(--border)";
        b.style.background = "var(--surface)";
        b.style.color = "var(--text)";
      });
    btn.classList.add("selected");
    btn.style.borderColor = "var(--green3)";
    btn.style.background = "var(--green-dim)";
    btn.style.color = "var(--green)";
    this._onboardingData.semestre = semestre;
    const next = document.getElementById("ob-next-2");
    if (next) {
      next.disabled = false;
      next.style.opacity = "1";
    }
  },

  _checkObStep3() {
    const u = document.getElementById("ob-universite")?.value.trim();
    const e = document.getElementById("ob-ecole")?.value.trim();
    const btn = document.getElementById("ob-finish");
    if (btn) {
      btn.disabled = !(u && e);
      btn.style.opacity = u && e ? "1" : "0.4";
    }
  },

  _obNext(step) {
    const current = document.getElementById(`ob-step-${step}`);
    const next = document.getElementById(`ob-step-${step + 1}`);
    const bar = document.getElementById(`obStep-${step - 1}`);
    const nextBar = document.getElementById(`obStep-${step}`);
    if (current) current.style.display = "none";
    if (next) {
      next.style.display = "flex";
    }
    if (nextBar) nextBar.style.background = "var(--green3)";
  },

  async _obFinish() {
    const universite = document.getElementById("ob-universite")?.value.trim();
    const ecole = document.getElementById("ob-ecole")?.value.trim();

    const settings = {
      ...Storage.getSettings(),
      parcours: this._onboardingData.parcours || Storage.getSettings().parcours,
      semestre: this._onboardingData.semestre || Storage.getSettings().semestre,
      universite: universite || Storage.getSettings().universite,
      ecole: ecole || Storage.getSettings().ecole,
    };

    Storage.saveSettings(settings);
    window.App?.applySettings();
    window.App?._renderProfileCard?.();

    // Met à jour le profil Supabase
    if (Auth.isAuthenticated()) {
      try {
        const sb = await getSupabaseClient();
        await sb
          .from("users")
          .update({
            etablissement: ecole,
            universite,
            parcours: settings.parcours,
            semestre: settings.semestre,
          })
          .eq("id", Auth.user.id);
      } catch {}
    }

    const name = Auth.getDisplayName();
    this._renderWebAuthn(name);
  },

  /* ════════════════════════════════
     HANDLERS
  ════════════════════════════════ */
  async _handleGoogle() {
    const btn = document.getElementById("authGoogleBtn");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
          style="animation:spin .7s linear infinite">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Connexion en cours…`;
    }
    try {
      await Auth.signInWithGoogle();
    } catch {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg> Continuer avec Google`;
      }
      window.UI?.toast("Erreur de connexion Google.", "error");
    }
  },

  async _handleSendOTP(resend = false) {
    const emailInput = document.getElementById("authEmailInput");
    const email = emailInput?.value?.trim() || this._email;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const errEl = document.getElementById("authEmailError");
      if (errEl) {
        errEl.textContent = "Adresse email invalide.";
        errEl.style.display = "block";
      }
      return;
    }

    const btn = document.getElementById("authOtpBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Envoi en cours…";
    }

    try {
      await Auth.sendOTP(email);
      if (resend) {
        window.UI?.toast("Nouveau code envoyé.", "success");
        this._startOTPTimer();
      } else {
        this._renderOTP(email);
      }
    } catch {
      window.UI?.toast("Erreur lors de l'envoi. Réessaie.", "error");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Recevoir un code";
      }
    }
  },

  async _handleVerifyOTP() {
    const code = Array.from(
      { length: 6 },
      (_, i) => document.getElementById(`otp-${i}`)?.value || "",
    ).join("");

    if (code.length !== 6) return;

    const btn = document.getElementById("otpVerifyBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Vérification…";
    }

    try {
      await Auth.verifyOTP(this._email, code);
    } catch {
      const errEl = document.getElementById("otpError");
      if (errEl) {
        errEl.textContent = "Code invalide ou expiré.";
        errEl.style.display = "block";
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Confirmer le code";
      }
      Array.from({ length: 6 }, (_, i) => {
        const el = document.getElementById(`otp-${i}`);
        if (el) {
          el.value = "";
          el.style.borderColor = "var(--red)";
        }
      });
      document.getElementById("otp-0")?.focus();
    }
  },

  _handleOTPInput(index, el) {
    el.value = el.value.replace(/\D/g, "");
    if (el.value && index < 5)
      document.getElementById(`otp-${index + 1}`)?.focus();
    const full =
      Array.from(
        { length: 6 },
        (_, i) => document.getElementById(`otp-${i}`)?.value || "",
      ).join("").length === 6;
    const btn = document.getElementById("otpVerifyBtn");
    if (btn) {
      btn.disabled = !full;
      btn.style.opacity = full ? "1" : "0.4";
    }
  },

  _handleOTPKey(index, e) {
    if (e.key === "Backspace") {
      const el = document.getElementById(`otp-${index}`);
      if (el && !el.value && index > 0)
        document.getElementById(`otp-${index - 1}`)?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus();
    if (e.key === "ArrowRight" && index < 5)
      document.getElementById(`otp-${index + 1}`)?.focus();
  },

  _otpTimer: null,
  _startOTPTimer() {
    clearInterval(this._otpTimer);
    let seconds = 600;
    this._otpTimer = setInterval(() => {
      seconds--;
      const el = document.getElementById("otpCountdown");
      if (!el) {
        clearInterval(this._otpTimer);
        return;
      }
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      el.textContent = `${m}:${String(s).padStart(2, "0")}`;
      if (seconds <= 0) {
        clearInterval(this._otpTimer);
        el.textContent = "Expiré";
        el.style.color = "var(--red)";
      }
    }, 1000);
  },

  async _toggleCamera() {
    const wrap = document.getElementById("authCameraWrap");
    const video = document.getElementById("authCamera");
    if (!wrap || !video) return;
    if (this._cameraStream) {
      this._stopCamera();
      wrap.style.opacity = "0";
      return;
    }
    try {
      this._cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      video.srcObject = this._cameraStream;
      wrap.style.opacity = "1";
    } catch {
      window.UI?.toast("Caméra non disponible.", "info");
    }
  },

  _stopCamera() {
    if (this._cameraStream) {
      this._cameraStream.getTracks().forEach((t) => t.stop());
      this._cameraStream = null;
    }
  },

  _skipAuth() {
    this.hide();
  },

  async _enrollAndFinalize(name) {
    await Auth.enrollWebAuthn();
    this._finalize(name);
  },

  /* ════════════════════════════════
     FINALISATION
     Migration + sync + launch app
  ════════════════════════════════ */
  async _finalize(name) {
    clearInterval(this._otpTimer);
    this._stopCamera();

    // Toast de bienvenue
    const tc = document.getElementById("toastContainer");
    if (tc) {
      const el = document.createElement("div");
      el.className = "toast success toast-settings";
      el.style.cssText =
        "min-width:260px;display:flex;align-items:center;gap:12px";
      el.innerHTML = `
        <div style="
          width:34px;height:34px;border-radius:10px;flex-shrink:0;
          background:var(--green-dim);border:1px solid var(--green3);
          display:flex;align-items:center;justify-content:center;color:var(--green)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style="flex:1">
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:12px;
            color:var(--text);margin-bottom:2px">
            ${name ? MESSAGES.googleSuccess(name) : MESSAGES.otpSuccess}
          </div>
          <div style="font-size:11px;color:var(--muted)">Synchronisation en cours…</div>
        </div>`;
      tc.appendChild(el);
      setTimeout(() => {
        el.style.animation = "toast-out .3s ease forwards";
        setTimeout(() => el.remove(), 300);
      }, 3000);
    }

    this.hide();

    /* ── Migration localStorage → Supabase ── */
    await window.Sync?.migrateFromLocal();

    /* ── Pull données depuis Supabase ── */
    await window.Sync?.syncFromSupabase();

    if (window._appLaunched) {
      window.App?.renderDashboard();
      window.App?.renderCourseList();
      window.App?.applySettings();
    }

    /* ── Lance l'app complète ── */
    if (window.App && !window._appLaunched) {
      window._appLaunched = true;
      window.App.init();
      window.Learn?.init();
      window.Notes?.init();
      window.Combo?.init();
      window.NotifCenter?.init();
      window.Sync?.syncToSupabase();

      // Met à jour la sidebar avec les infos du compte
      const card = document.getElementById("sidebarUserCard");
      const nameEl = document.getElementById("sidebarUserName");
      const email = document.getElementById("sidebarUserEmail");
      const avatar = document.getElementById("sidebarAvatar");
      const initials = document.getElementById("sidebarAvatarInitials");

      if (card) card.style.display = "flex";
      if (nameEl) nameEl.textContent = window.Auth?.getDisplayName() || "";
      if (email) email.textContent = window.Auth?.user?.email || "";

      const avatarUrl = window.Auth?.getAvatar();
      if (avatarUrl && avatar) {
        avatar.src = avatarUrl;
        avatar.style.display = "block";
        if (initials) initials.style.display = "none";
      } else if (initials) {
        initials.textContent = (window.Auth?.getDisplayName() || "?")
          .charAt(0)
          .toUpperCase();
      }

      // Cache le bouton Se connecter
      document.getElementById("sidebarAuthBtn")?.remove();
    }
  },
};

window.AuthScreen = AuthScreen;
