// TODO: define request/response DTOs for categories
// Use class-validator decorators for tsoa validation

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