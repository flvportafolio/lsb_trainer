export function describeError(error: unknown): string {
  if (error instanceof DOMException) {
    return describeDomException(error);
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const message = readStringProperty(error, 'message') ?? readStringProperty(error, 'statusText');

    if (message) {
      return message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'No se pudo leer el detalle del error.';
    }
  }

  return 'No se pudo leer el detalle del error.';
}

function describeDomException(error: DOMException): string {
  if (error.name === 'NotAllowedError') {
    return 'El navegador bloqueo el permiso de camara. Permite la camara para este sitio y recarga la pagina.';
  }

  if (error.name === 'NotFoundError') {
    return 'No se encontro una camara conectada.';
  }

  if (error.name === 'NotReadableError') {
    return 'La camara esta siendo usada por otra aplicacion o no esta disponible.';
  }

  if (error.name === 'OverconstrainedError') {
    return 'La camara no cumple con la configuracion solicitada.';
  }

  if (error.message.trim()) {
    return error.message;
  }

  return `${error.name}: no se pudo iniciar el recurso solicitado.`;
}

function readStringProperty(value: object, key: string): string | null {
  if (!(key in value)) {
    return null;
  }

  const property = (value as Record<string, unknown>)[key];

  return typeof property === 'string' && property.trim() ? property : null;
}
