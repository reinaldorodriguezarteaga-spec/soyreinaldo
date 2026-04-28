"use client";

import { useTransition } from "react";
import { signInWithGoogle } from "@/app/login/actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.92h5.45c-.24 1.41-1.7 4.14-5.45 4.14-3.28 0-5.96-2.72-5.96-6.07S8.72 6.12 12 6.12c1.87 0 3.12.8 3.84 1.48l2.62-2.52C16.84 3.59 14.66 2.7 12 2.7 6.94 2.7 2.86 6.78 2.86 11.84S6.94 21 12 21c5.84 0 9.7-4.1 9.7-9.88 0-.66-.07-1.16-.16-1.66H12z"
      />
      <path
        fill="#34A853"
        d="M3.88 7.34l3.22 2.36c.87-1.7 2.55-2.86 4.9-2.86 1.5 0 2.83.52 3.88 1.53l2.9-2.83C16.95 3.93 14.66 2.86 12 2.86c-3.66 0-6.8 2.1-8.36 5.16z"
        opacity="0"
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
      <path
        fill="#EA4335"
        d="M12 6.12c1.87 0 3.12.8 3.84 1.48l2.62-2.52C16.84 3.59 14.66 2.7 12 2.7c-3.85 0-7.16 2.21-8.78 5.43l3.22 2.5C7.5 8.27 9.55 6.12 12 6.12z"
        opacity="0"
      />
    </svg>
  );
}

export default function GoogleSignInButton({
  redirect = "/quiniela",
  label = "Continuar con Google",
}: {
  redirect?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(() => {
          signInWithGoogle(formData);
        });
      }}
    >
      <input type="hidden" name="redirect" value={redirect} />
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {pending ? "Conectando..." : label}
      </button>
    </form>
  );
}
