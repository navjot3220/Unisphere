import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("unisphere_token");
    if (!token) return setLoading(false);
    api
      .get("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem("unisphere_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const d = await api.post("/auth/login", { email, password });
    localStorage.setItem("unisphere_token", d.token);
    setUser(d.user);
    return d.user;
  };

  const signup = async (payload) => {
    const d = await api.post("/auth/signup", payload);
    localStorage.setItem("unisphere_token", d.token);
    setUser(d.user);
    return d.user;
  };

  const logout = () => {
    localStorage.removeItem("unisphere_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
