// TODO: implement products service logic
import { AppDataSource } from '../../config/database';
import { Product, ProductApprovalStatus } from '../../entities/Product';
import { Category } from '../../entities/Category';
import { VendorProfile } from '../../entities/VendorProfile';
import { JwtPayload } from '../../utils/jwt';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductListResponseDto,
  ProductQueryDto,
} from './products.dto';

export class ProductsService {
  private productRepo  = AppDataSource.getRepository(Product);
  private categoryRepo = AppDataSource.getRepository(Category);
  private vendorRepo   = AppDataSource.getRepository(VendorProfile);

  private format(p: Product): ProductResponseDto {
    return {
      id:             p.id,
      name:           p.name,
      slug:           p.slug,
      description:    p.description,
      price:          Number(p.price),
      stockQuantity:  p.stockQuantity,
      imageUrls:      p.imageUrls || [],
      approvalStatus: p.approvalStatus,
      isActive:       p.isActive,
      category:       p.category
        ? { id: p.category.id, name: p.category.name }
        : null,
      vendor: p.vendor
        ? { id: p.vendor.id, businessName: p.vendor.businessName }
        : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async findAll(query: ProductQueryDto): Promise<ProductListResponseDto> {
    const page  = Math.max(1, query.page  || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip  = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .where('product.isActive = :isActive', { isActive: true })
      .andWhere('product.approvalStatus = :status', {
        status: ProductApprovalStatus.APPROVED,
      });

    if (query.search) {
      qb.andWhere(
        '(LOWER(product.name) LIKE :search OR LOWER(product.description) LIKE :search)',
        { search: `%${query.search.toLowerCase()}%` }
      );
    }

    if (query.categoryId) {
      qb.andWhere('category.id = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    const [data, total] = await qb
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data:       data.map(this.format),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.productRepo.findOne({
      where: { id, isActive: true },
      relations: ['category', 'vendor'],
    });
    if (!product) {
      const error: any = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return this.format(product);
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    const product = await this.productRepo.findOne({
      where: { slug, isActive: true },
      relations: ['category', 'vendor'],
    });
    if (!product) {
      const error: any = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    return this.format(product);
  }

  // Vendor: get their own products (all statuses)
  async findVendorProducts(
    vendorUser: JwtPayload,
    query: ProductQueryDto
  ): Promise<ProductListResponseDto> {
    const vendor = await this.vendorRepo.findOne({
      where: { user: { id: vendorUser.sub } },
    });
    if (!vendor) {
      const error: any = new Error('Vendor profile not found');
      error.status = 404;
      throw error;
    }

    const page  = Math.max(1, query.page  || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip  = (page - 1) * limit;

    const [data, total] = await this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .where('vendor.id = :vendorId', { vendorId: vendor.id })
      .orderBy('product.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data:       data.map(this.format),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(
    dto: CreateProductDto,
    vendorUser: JwtPayload
  ): Promise<ProductResponseDto> {
    // Confirm vendor profile exists and is approved
    const vendor = await this.vendorRepo.findOne({
      where: { user: { id: vendorUser.sub } },
    });
    if (!vendor) {
      const error: any = new Error('Vendor profile not found');
      error.status = 404;
      throw error;
    }
    if (vendor.status !== 'approved') {
      const error: any = new Error(
        'Your vendor account must be approved before listing products'
      );
      error.status = 403;
      throw error;
    }

    // Check slug uniqueness
    const existing = await this.productRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      const error: any = new Error('A product with this slug already exists');
      error.status = 409;
      throw error;
    }

    const product = this.productRepo.create({
      name:          dto.name,
      slug:          dto.slug,
      description:   dto.description,
      price:         dto.price,
      stockQuantity: dto.stockQuantity,
      imageUrls:     dto.imageUrls || [],
      vendor,
      approvalStatus: ProductApprovalStatus.PENDING,
    });

    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) {
        const error: any = new Error('Category not found');
        error.status = 404;
        throw error;
      }
      product.category = category;
    }

    await this.productRepo.save(product);
    return this.findOne(product.id);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    vendorUser: JwtPayload
  ): Promise<ProductResponseDto> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['vendor', 'vendor.user', 'category'],
    });
    if (!product) {
      const error: any = new Error('Product not found');
      error.status = 404;
      throw error;
    }

    // Ensure vendor owns this product
    if (product.vendor?.user?.id !== vendorUser.sub) {
      const error: any = new Error(
        'You do not have permission to edit this product'
      );
      error.status = 403;
      throw error;
    }

    if (dto.slug && dto.slug !== product.slug) {
      const existing = await this.productRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        const error: any = new Error('A product with this slug already exists');
        error.status = 409;
        throw error;
      }
    }

    if (dto.name          !== undefined) product.name          = dto.name;
    if (dto.slug          !== undefined) product.slug          = dto.slug;
    if (dto.description   !== undefined) product.description   = dto.description;
    if (dto.price         !== undefined) product.price         = dto.price;
    if (dto.stockQuantity !== undefined) product.stockQuantity = dto.stockQuantity;
    if (dto.imageUrls     !== undefined) product.imageUrls     = dto.imageUrls;
    if (dto.isActive      !== undefined) product.isActive      = dto.isActive;

    if (dto.categoryId !== undefined) {
      if (!dto.categoryId) {
        product.category = null;
      } else {
        const category = await this.categoryRepo.findOne({
          where: { id: dto.categoryId },
        });
        if (!category) {
          const error: any = new Error('Category not found');
          error.status = 404;
          throw error;
        }
        product.category = category;
      }
    }

    await this.productRepo.save(product);
    return this.findOne(product.id);
  }

  async remove(id: string, vendorUser: JwtPayload): Promise<void> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['vendor', 'vendor.user'],
    });
    if (!product) {
      const error: any = new Error('Product not found');
      error.status = 404;
      throw error;
    }
    if (product.vendor?.user?.id !== vendorUser.sub) {
      const error: any = new Error(
        'You do not have permission to delete this product'
      );
      error.status = 403;
      throw error;
    }

    // Soft delete — set isActive false rather than removing the row
    // so existing order history referencing this product is preserved
    product.isActive = false;
    await this.productRepo.save(product);
  }
}
