/** optimistic helper for node fetch */
export const fetchData = <T>(...params: Parameters<typeof fetch>): Promise<T> =>
  fetch(...params).then(res => res.json()) as Promise<T>;
