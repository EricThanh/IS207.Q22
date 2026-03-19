import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [ready, setReady] = useState(false);

    async function loadMe() {
        const token = localStorage.getItem("flower_shop_token");
        if (!token) {
            setReady(true);
            return;
        }
        try {
            const res = await authApi.me();
            setUser(res.data.data);
        } catch (e) {
            console.log("me() failed", e?.response?.data || e?.message);
            setUser(null);

        }
        finally {
            setReady(true);
        }
    }

    useEffect(() => { loadMe(); }, []);

    const value = useMemo(() => ({
        user,
        ready,
        isLoggedIn: !!user,
        loginSuccess: (token, u) => {
            localStorage.setItem("flower_shop_token", token);
            setUser(u);
        },
        logout: () => {
            localStorage.removeItem("flower_shop_token");
            setUser(null);
        },
    }), [user, ready]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}