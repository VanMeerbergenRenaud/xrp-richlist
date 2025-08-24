"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import React, {useEffect, useState} from "react";

export default function NavBar() {
    const pathname = usePathname();
    const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
        "checking",
    );

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname?.startsWith(href);
    };

    const getApiUrl = (path: string) => {
        const base = "/api/backend";
        if (!path) return `${base}/`;
        if (path.startsWith("/")) return `${base}${path}`;
        return `${base}/${path}`;
    };

    const checkApiStatus = async (timeoutMs: number = 5000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            // XRPSCAN (compte génesis) en premier
            const res = await fetch(
                getApiUrl("/account/rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh"),
                {
                    method: "GET",
                    headers: {Accept: "application/json"},
                    signal: controller.signal,
                    cache: "no-store",
                },
            );
            if (res.ok) setApiStatus("online");
            else {
                const rpcRes = await fetch(getApiUrl("/xrplrpc"), {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({method: "server_info", params: [{}]}),
                });
                setApiStatus(rpcRes.ok ? "online" : "offline");
            }
        } catch {
            try {
                const rpcRes = await fetch(getApiUrl("/xrplrpc"), {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({method: "server_info", params: [{}]}),
                });
                setApiStatus(rpcRes.ok ? "online" : "offline");
            } catch {
                setApiStatus("offline");
            }
        } finally {
            clearTimeout(timer);
        }
    };

    useEffect(() => {
        checkApiStatus();
        const id = setInterval(() => checkApiStatus(), 15000);
        return () => clearInterval(id);
    }, []);

    const linkClass = (href: string) =>
        `px-6 py-4 text-sm font-medium border-r border-gray-700 hover:bg-gray-800 transition-colors ${
            isActive(href) ? "bg-gray-800 text-white" : "text-gray-300"
        }`;

    return (
        <nav className="bg-gray-900 border-b border-gray-700">
            <div className="flex items-center justify-between">
                <div className="flex">
                    <Link href="/" className={linkClass("/")}>
                        Tableau de bord
                    </Link>
                    <Link href="/stats" className={linkClass("/stats")}>
                        Statistiques
                    </Link>
                    <Link href="/info" className={linkClass("/info")}>
                        Infos
                    </Link>
                </div>
                <div className="px-6 py-4 flex items-center gap-2 text-sm">
                    <span className="text-gray-400">API:</span>
                    <span
                        className={`flex items-center gap-1 ${
                            apiStatus === "online"
                                ? "text-cyan-400"
                                : apiStatus === "offline"
                                    ? "text-red-400"
                                    : "text-white"
                        }`}
                    >
            <span
                className={`w-2 h-2 rounded-full ${
                    apiStatus === "online"
                        ? "bg-cyan-400"
                        : apiStatus === "offline"
                            ? "bg-red-400"
                            : "bg-indigo-400"
                }`}
            />
                        {apiStatus === "online"
                            ? "Connecté"
                            : apiStatus === "offline"
                                ? "Déconnecté"
                                : "Vérification..."}
          </span>
                </div>
            </div>
        </nav>
    );
}
