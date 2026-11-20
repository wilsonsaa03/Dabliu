import { HttpErrorResponse } from '@angular/common/http';
import type { Problem } from './models';

/** Convierte cualquier error HTTP en un Problem con mensaje para la persona. */
export function toProblem(error: unknown): Problem {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return { title: 'Sin conexión', detail: 'No se pudo contactar el servidor. Revisa tu conexión e inténtalo de nuevo.' };
    }
    const body = error.error;
    if (body && typeof body === 'object') {
      return { ...(body as Problem), status: error.status };
    }
    if (error.status >= 500) {
      return { status: error.status, title: 'Error del servidor', detail: 'Ocurrió un error inesperado. Inténtalo de nuevo en un momento.' };
    }
    return { status: error.status, title: 'Error', detail: 'La solicitud no se pudo completar.' };
  }
  return { title: 'Error', detail: 'Ocurrió un error inesperado.' };
}

/** Mensaje principal de un error. */
export function problemMessage(error: unknown): string {
  const p = toProblem(error);
  return p.detail ?? p.title ?? 'La solicitud no se pudo completar.';
}
