export type Response<T, E> =
  | { success: true; data: T }
  | { success: false; errors: E };
