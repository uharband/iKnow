"use client";

import { useEffect, useState } from "react";
import { LangToggle } from "@/components/ui";
import { getSession, resetSession, useSettings } from "@/lib/store";

const L = {
  he: {
    title: "כניסה",
    sub: "התמונות והשמות של המשפחה שמורים כאן, ולכן הכניסה היא בסיסמה. במכשיר הזה צריך להקליד אותה פעם אחת בלבד.",
    password: "סיסמה",
    enter: "כניסה",
    wrong: "הסיסמה לא נכונה. אפשר לנסות שוב.",
    notSet: "עדיין לא הוגדרה סיסמה לאתר (המשתנה ADMIN_PASSWORD ב-Vercel).",
  },
  en: {
    title: "Sign in",
    sub: "The family's photos and names are kept here, so a password is needed. On this device you only type it once.",
    password: "Password",
    enter: "Sign in",
    wrong: "That password is not right. Please try again.",
    notSet: "No password has been set for the site yet (the ADMIN_PASSWORD variable in Vercel).",
  },
};

export default function Login() {
  const { settings, update } = useSettings();
  const l = L[settings.lang];
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notSet, setNotSet] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      if (s.mode === "local" || s.authed) location.replace("/");
      else setNotSet(!s.passwordSet);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) {
      resetSession();
      location.replace("/");
      return;
    }
    setBusy(false);
    setError(l.wrong);
  };

  return (
    <main className="login">
      <header className="topbar">
        <span className="wordmark">iKnow</span>
        <LangToggle lang={settings.lang} onChange={(lang) => update({ lang })} />
      </header>
      <form className="loginbox" onSubmit={submit}>
        <h1>{l.title}</h1>
        <div className="rule" />
        <p className="lead">{l.sub}</p>
        {notSet && <p className="notice">{l.notSet}</p>}
        <label className="field">
          <span>{l.password}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </label>
        {error && <p className="msg">{error}</p>}
        <button className="btn primary" disabled={busy || !password}>
          {l.enter}
        </button>
      </form>
    </main>
  );
}
