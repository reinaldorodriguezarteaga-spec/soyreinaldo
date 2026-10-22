/** Los permisos por sección del panel (sin código de servidor: lo importan
 * también los componentes de cliente). Ver lib/permisos.ts. */
export const PERMISOS = {
  analisis: "Escribir análisis",
  imagenes: "Descargador de imágenes",
} as const;
export type Permiso = keyof typeof PERMISOS;
export type Seccion = Permiso | "admin";
