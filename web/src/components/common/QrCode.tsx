"use client";

import React from "react";

interface QrCodeProps {
    value: string;
    size?: number; // px
    className?: string;
    alt?: string;
    colorDark?: string; // hex string, ex: #000000
    colorLight?: string; // hex string, ex: #ffffff
}

function sanitizeHex(color?: string, fallback: string = "#000000") {
    const c = (color || fallback).trim();
    const hex = c.startsWith("#") ? c.slice(1) : c;
    // Garde uniquement 6 premiers caractères hex
    return (
        hex.replace(/[^0-9a-fA-F]/g, "").slice(0, 6) || fallback.replace("#", "")
    );
}

export default function QrCode({
                                   value,
                                   size = 128,
                                   className = "",
                                   alt = "QR code",
                                   colorDark = "#000000",
                                   colorLight = "#ffffff",
                               }: QrCodeProps) {
    if (!value) return null;

    const px = Math.max(64, Math.min(1024, Math.round(size)));
    const fg = sanitizeHex(colorDark, "#000000");
    const bg = sanitizeHex(colorLight, "#ffffff");

    // Génération via service d'image QR (pas de dépendance)
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&data=${encodeURIComponent(
        value,
    )}&color=${fg}&bgcolor=${bg}&qzone=2`;

    return (
        <img
            src={src}
            width={px}
            height={px}
            alt={alt}
            className={`rounded bg-white p-2 ${className}`}
            loading="lazy"
            decoding="async"
        />
    );
}
