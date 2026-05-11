import {
  Controller, Route, Tags, Get, Post, Put, Delete,
  Path, Body, Query, Security, Request,
  SuccessResponse, Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductResponseDto,
  ProductListResponseDto,
} from './products.dto';

@Route('products')
@Tags('Products')
export class ProductsController extends Controller {
  private service = new ProductsService();

  /**
   * Browse all active approved products with optional search and filters
   */
  @Get()
  async getAll(
    @Query() page?:       number,
    @Query() limit?:      number,
    @Query() search?:     string,
    @Query() categoryId?: string,
    @Query() minPrice?:   number,
    @Query() maxPrice?:   number
  ): Promise<ProductListResponseDto> {
    return this.service.findAll({
      page, limit, search, categoryId, minPrice, maxPrice,
    });
  }

  /**
   * Get a single product by ID
   */
  @Get('{id}')
  @Response(404, 'Product not found')
  async getOne(@Path() id: string): Promise<ProductResponseDto> {
    return this.service.findOne(id);
  }

  /**
   * Get all products belonging to the authenticated vendor
   */
  @Get('vendor/my-products')
  @Security('jwt')
  async getVendorProducts(
    @Request() req: ExpressRequest,
    @Query() page?:  number,
    @Query() limit?: number
  ): Promise<ProductListResponseDto> {
    return this.service.findVendorProducts(req.user!, { page, limit });
  }

  /**
   * Create a new product listing — vendor only
   */
  @Post()
  @Security('jwt')
  @SuccessResponse(201, 'Created')
  @Response(403, 'Vendor account not approved')
  @Response(409, 'Slug already exists')
  async create(
    @Request() req: ExpressRequest,
    @Body() body: CreateProductDto
  ): Promise<ProductResponseDto> {
    this.setStatus(201);
    return this.service.create(body, req.user!);
  }

  /**
   * Update a product — vendor only, must own the product
   */
  @Put('{id}')
  @Security('jwt')
  @Response(403, 'Not your product')
  @Response(404, 'Product not found')
  async update(
    @Path() id: string,
    @Request() req: ExpressRequest,
    @Body() body: UpdateProductDto
  ): Promise<ProductResponseDto> {
    return this.service.update(id, body, req.user!);
  }

  /**
   * Soft-delete a product — vendor only, must own the product
   */
  @Delete('{id}')
  @Security('jwt')
  @SuccessResponse(204, 'Deleted')
  @Response(403, 'Not your product')
  @Response(404, 'Product not found')
  async remove(
    @Path() id: string,
    @Request() req: ExpressRequest
  ): Promise<void> {
    await this.service.remove(id, req.user!);
    this.setStatus(204);
  }
}
