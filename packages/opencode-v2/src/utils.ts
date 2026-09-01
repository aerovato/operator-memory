export type Result<Value, Error> =
  | { readonly ok: true; readonly value: Value }
  | { readonly ok: false; readonly error: Error };

export function success<Value>(value: Value): Result<Value, never> {
  return { ok: true, value };
}

export function failure<Error>(error: Error): Result<never, Error> {
  return { ok: false, error };
}
