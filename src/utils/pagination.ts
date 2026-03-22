export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getPaginationParams(query: PaginationQuery): { skip: number; take: number } {
  const page = Math.max(1, query.page ?? 1);
  const take = Math.min(100, Math.max(1, query.limit ?? 20));
  return { skip: (page - 1) * take, take };
}
