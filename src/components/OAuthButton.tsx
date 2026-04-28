"use client";

import { useTransition } from "react";
import { signInWithOAuthProvider } from "@/app/login/actions";

type Provider = "google" | "facebook";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.92h5.45c-.24 1.41-1.7 4.14-5.45 4.14-3.28 0-5.96-2.72-5.96-6.07S8.72 6.12 12 6.12c1.87 0 3.12.8 3.84 1.48l2.62-2.52C16.84 3.59 14.66 2.7 12 2.7 6.94 2.7 2.86 6.78 2.86 11.84S6.94 21 12 21c5.84 0 9.7-4.1 9.7-9.88 0-.66-.07-1.16-.16-1.66H12z"
      />
      <path
        fill="#4285F4"
        d="M21.7 12.23c0-.66-.07-1.16-.16-1.66H12v3.92h5.45c-.22 1.27-1.42 3.72-5.45 3.72v.01l3.55 2.75c2.27-2.1 3.6-5.18 3.6-8.74z"
      />
      <path
        fill="#FBBC05"
        d="M5.1 14.27a5.92 5.92 0 010-3.78L1.88 8.13A8.95 8.95 0 001 12c0 1.45.35 2.81.96 4.02l3.14-1.75z"
      />
      <path
        fill="#34A853"
        d="M12 21c2.43 0 4.47-.8 5.96-2.18l-3.55-2.75c-.97.66-2.27 1.13-2.41 1.13-3.16 0-5.85-2.13-6.9-5.06l-3.22 2.5C3.43 18.18 7.39 21 12 21z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
      />
    </svg>
  );
}

const STYLES: Record<
  Provider,
  { icon: React.ReactNode; defaultLabel: string; className: string }
> = {
  google: {
    icon: <GoogleIcon />,
    defaultLabel: "Continuar con Google",
    className:
      "border border-zinc-700 bg-white text-zinc-900 hover:bg-zinc-100",
  },
  facebook: {
    icon: <FacebookIcon />,
    defaultLabel: "Continuar con Facebook",
    className:
      "border border-[#1877F2]/30 bg-[#1877F2] text-white hover:bg-[#1465d8]",
  },
};

export default function OAuthButton({
  provider,
  redirect = "/quiniela",
  label,
}: {
  provider: Provider;
  redirect?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const cfg = STYLES[provider];

  return (
    <form
      action={(formData) => {
        startTransition(() => {
          signInWithOAuthProvider(formData);
        });
      }}
    >
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="redirect" value={redirect} />
      <button
        type="submit"
        disabled={pending}
        className={`flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${cfg.className}`}
      >
        {cfg.icon}
        {pending ? "Conectando..." : (label ?? cfg.defaultLabel)}
      </button>
    </form>
  );
}
