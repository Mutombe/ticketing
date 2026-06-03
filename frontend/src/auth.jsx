import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { api, getToken, setToken } from "./api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api.me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  // payload is { credential } (id token) or { access_token } (popup flow)
  const handleGoogle = useCallback(async (payload) => {
    try {
      const { token, user } = await api.googleLogin(payload);
      setToken(token);
      setUser(user);
    } catch (e) {
      console.error("Google login failed:", e.message);
      alert("Sign-in failed: " + e.message);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, ready, logout, handleGoogle, clientId: GOOGLE_CLIENT_ID }}>
      {children}
    </AuthCtx.Provider>
  );
}

function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/* Our own Google button (SVG logo) — opens the OAuth popup ourselves so it
   always renders, even if GIS would refuse to draw its button. */
export function GoogleButton({ type = "standard" }) {
  const { handleGoogle, clientId } = useAuth();
  const clientRef = useRef(null);

  useEffect(() => {
    let tries = 0;
    const init = () => {
      if (!window.google?.accounts?.oauth2) {
        if (tries++ < 60) return setTimeout(init, 100);
        return;
      }
      clientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: (resp) => {
          if (resp && resp.access_token) handleGoogle({ access_token: resp.access_token });
        },
      });
    };
    init();
  }, [clientId, handleGoogle]);

  const signIn = () => {
    if (clientRef.current) clientRef.current.requestAccessToken();
    else alert("Google sign-in is still loading, try again in a second.");
  };

  if (type === "icon") {
    return (
      <button type="button" className="gbtn gbtn-icon" onClick={signIn} aria-label="Sign in with Google">
        <GoogleG size={20} />
      </button>
    );
  }
  return (
    <button type="button" className="gbtn" onClick={signIn}>
      <GoogleG /> Sign in with Google
    </button>
  );
}
