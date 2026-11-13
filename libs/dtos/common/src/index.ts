// Every successful response's body: `{ data: {...} }` for one object, `{ data: [...] }` for a list.
export interface DataResponse<T> {
  data: T;
}
