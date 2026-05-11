// Category request/response DTOs consumed by tsoa.

export interface CreateCategoryDto {
  /** @minLength 2 @maxLength 100 */
  name: string;

  /** @minLength 2 @maxLength 100 @pattern ^[a-z0-9-]+$ */
  slug: string;

  parentId?: string;
}

export interface UpdateCategoryDto {
  /** @minLength 2 @maxLength 100 */
  name?: string;

  /** @minLength 2 @maxLength 100 @pattern ^[a-z0-9-]+$ */
  slug?: string;

  parentId?: string;
}

export interface CategoryResponseDto {
  id: string;
  name: string;
  slug: string;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string }[];
}
