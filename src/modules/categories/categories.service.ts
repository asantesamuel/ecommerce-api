// TODO: implement categories service logic
import { AppDataSource } from '../../config/database';
import { Category } from '../../entities/Category';
import { CreateCategoryDto, UpdateCategoryDto, CategoryResponseDto } from './categories.dto';

export class CategoriesService {
  private categoryRepo = AppDataSource.getRepository(Category);

  private format(c: Category): CategoryResponseDto {
    return {
      id:       c.id,
      name:     c.name,
      slug:     c.slug,
      parent:   c.parent ? { id: c.parent.id, name: c.parent.name } : null,
      children: (c.children || []).map(ch => ({ id: ch.id, name: ch.name })),
    };
  }

  async findAll(): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepo.find({
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });
    return categories.map(this.format);
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!category) {
      const error: any = new Error('Category not found');
      error.status = 404;
      throw error;
    }
    return this.format(category);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Check slug uniqueness
    const existing = await this.categoryRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      const error: any = new Error('A category with this slug already exists');
      error.status = 409;
      throw error;
    }

    const category = this.categoryRepo.create({
      name: dto.name,
      slug: dto.slug,
    });

    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) {
        const error: any = new Error('Parent category not found');
        error.status = 404;
        throw error;
      }
      category.parent = parent;
    }

    await this.categoryRepo.save(category);
    return this.findOne(category.id);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
    if (!category) {
      const error: any = new Error('Category not found');
      error.status = 404;
      throw error;
    }

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        const error: any = new Error('A category with this slug already exists');
        error.status = 409;
        throw error;
      }
    }

    if (dto.name)     category.name = dto.name;
    if (dto.slug)     category.slug = dto.slug;

    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        category.parent = null;
      } else {
        const parent = await this.categoryRepo.findOne({
          where: { id: dto.parentId },
        });
        if (!parent) {
          const error: any = new Error('Parent category not found');
          error.status = 404;
          throw error;
        }
        // Prevent category from being its own parent
        if (parent.id === id) {
          const error: any = new Error('A category cannot be its own parent');
          error.status = 400;
          throw error;
        }
        category.parent = parent;
      }
    }

    await this.categoryRepo.save(category);
    return this.findOne(category.id);
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['children'],
    });
    if (!category) {
      const error: any = new Error('Category not found');
      error.status = 404;
      throw error;
    }
    if (category.children?.length > 0) {
      const error: any = new Error(
        'Cannot delete a category that has subcategories. Remove subcategories first.'
      );
      error.status = 400;
      throw error;
    }
    await this.categoryRepo.remove(category);
  }
}
