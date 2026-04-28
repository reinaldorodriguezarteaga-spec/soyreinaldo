"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createLeague, type CreateLeagueState } from "./actions";

const initialState: CreateLeagueState = { status: "idle" };

function suggestCode(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

export default function CreateLeagueForm() {
  const [state, action, pending] = useActionState(createLeague, initialState);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Sugerir código a partir del nombre mientras el usuario no lo edita manualmente
  useEffect(() => {
    if (!codeTouched) setCode(suggestCode(name));
  }, [name, codeTouched]);

  // Reset on success
  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setName("");
      setCode("");
      setCodeTouched(false);
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre de la liga"
          name="name"
          placeholder="Familiar"
          value={name}
          onChange={setName}
          disabled={pending}
        />
        <Field
          label="Código de acceso"
          name="code"
          placeholder="REINALDO-FAM"
          value={code}
          onChange={(v) => {
            setCode(v);
            setCodeTouched(true);
          }}
          disabled={pending}
          mono
        />
      </div>
      <Field
        label="Descripción (opcional)"
        name="description"
        placeholder="Pa la familia y nadie más"
        disabled={pending}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Creando..." : "Crear liga"}
        </button>
        {state.status === "error" && state.message && (
          <span className="text-sm text-red-300">{state.message}</span>
        )}
        {state.status === "success" && state.message && (
          <span className="text-sm text-emerald-300">{state.message}</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  value,
  onChange,
  disabled,
  mono,
}: {
  label: string;
  name: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        className={`block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 ${mono ? "font-mono uppercase" : ""}`}
      />
    </label>
  );
}
