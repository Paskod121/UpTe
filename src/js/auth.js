"use strict";

import { getSupabaseClient } from "./supabase.js";
async function getClient() { return getSupabaseClient(); }
/* ─── État courant ─── */
export const Auth = {
  user: null,
  session: null,
  _listeners: [],

  /* ── Initialisation ── */
  async init() {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    this.session = data.session;
    this.user = data.session?.user ?? null;

    sb.auth.onAuthStateChange(async (event, session) => {
      this.session = session;
      this.user = session?.user ?? null;
      this._notify(event, session);

      if (event === "SIGNED_IN") {
        await this._ensureProfile();
        await this.log("auth.login", "auth", this.user.id, {
          provider: session.user.app_metadata?.provider,
        });
      }
      if (event === "SIGNED_OUT") {
        this._redirectToAuth();
      }
    });

    return this.user;
  },

  /* ── Google OAuth ── */
  async signInWithGoogle() {
    const sb = await getClient();
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href.split('#')[0].split('?')[0],
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) throw error;
  },

  /* ── Email OTP — envoi ── */
  async sendOTP(email) {
    const sb = await getClient();
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.href.split('#')[0].split('?')[0]}`,
      },
    });
    if (error) throw error;
  },

  /* ── Email OTP — vérification ── */
  async verifyOTP(email, token) {
    const sb = await getClient();
    const { data, error } = await sb.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "email",
    });
    if (error) throw error;
    return data;
  },

  /* ── Déconnexion ── */
  async signOut() {
    await this.log("auth.logout", "auth", this.user?.id);
    const sb = await getClient();
    await sb.auth.signOut();
  },

  /* ── WebAuthn — enregistrement (optionnel) ── */
  async enrollWebAuthn() {
    if (!window.PublicKeyCredential) return false;
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "UpTe", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(this.user.id),
            name: this.user.email,
            displayName: this.user.user_metadata?.full_name || this.user.email,
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      });
      if (!credential) return false;

      // Sauvegarde l'ID du credential dans le profil
      const sb = await getClient();
      await sb
        .from("users")
        .update({
          webauthn_cred: {
            id: Array.from(new Uint8Array(credential.rawId)),
            type: credential.type,
          },
        })
        .eq("id", this.user.id);

      await this.log("auth.webauthn.enroll", "auth", this.user.id);
      return true;
    } catch {
      return false;
    }
  },

  /* ── WebAuthn — connexion ── */
  async signInWithWebAuthn() {
    if (!window.PublicKeyCredential) return false;
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          userVerification: "required",
          timeout: 60000,
        },
      });
      return !!assertion;
    } catch {
      return false;
    }
  },

  /* ── Profil — création automatique si absent ── */
  async _ensureProfile() {
    if (!this.user) return;
    const sb = await getClient();
    const { data } = await sb
      .from("users")
      .select("id")
      .eq("id", this.user.id)
      .single();
    
    this._isNewUser = true;
    if (!data) {
      await sb.from("users").insert({
        id: this.user.id,
        email: this.user.email,
        full_name: this.user.user_metadata?.full_name || "",
        avatar_url: this.user.user_metadata?.avatar_url || "",
      });
      await sb.from("settings").insert({ user_id: this.user.id });
    }
    else { this._isNewUser = false; }

    // Met à jour last_seen_at
    await sb
      .from("users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", this.user.id);
  },

  /* ── Activity log ── */
  async log(action, entityType = null, entityId = null, metadata = {}) {
    if (!this.user) return;
    try {
      const sb = await getClient();
      await sb.from("activity_logs").insert({
        user_id: this.user.id,
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        metadata,
        user_agent: navigator.userAgent,
      });
    } catch {}
  },

  /* ── Listeners ── */
  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== fn);
    };
  },

  _notify(event, session) {
    this._listeners.forEach((fn) => fn(event, session));
  },

  /* ── Helpers ── */
  isAuthenticated() {
    return !!this.user;
  },

  getDisplayName() {
    return (
      this.user?.user_metadata?.full_name ||
      this.user?.email?.split("@")[0] ||
      "Étudiant"
    );
  },

  getAvatar() {
    return this.user?.user_metadata?.avatar_url || null;
  },

  _redirectToAuth() {
    // Sera géré par main.js selon l'état
    window.dispatchEvent(new CustomEvent("upte:signedout"));
  },
};