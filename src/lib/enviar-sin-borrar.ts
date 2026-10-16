"use client";

import { startTransition, type FormEvent } from "react";

/**
 * `onSubmit` para un formulario con `useActionState` que NO vacía los campos.
 *
 * Con `<form action={action}>`, React 19 resetea el formulario al terminar la
 * acción, también cuando vuelve con error: el usuario tenía que rellenarlo
 * todo otra vez (16-oct, queja de un tester en el registro). Enviando a mano
 * dentro de una transición, el estado de la acción funciona igual (pending,
 * mensaje de error) y lo escrito se queda donde estaba.
 *
 *   <form onSubmit={enviarSinBorrar(action)}>
 */
export function enviarSinBorrar(action: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // El botón que envió (si tiene name/value) también va en el FormData.
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(e.currentTarget, submitter);
    startTransition(() => action(formData));
  };
}
