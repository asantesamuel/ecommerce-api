import { AppDataSource } from '../../config/database';
import { Cart } from '../../entities/Cart';
import { CartItem } from '../../entities/CartItem';
import { Product } from '../../entities/Product';
import { User } from '../../entities/User';
import { JwtPayload } from '../../utils/jwt';
import {
  AddCartItemDto,
  UpdateCartItemDto,
  CartResponseDto,
} from './cart.dto';

export class CartService {
  private cartRepo     = AppDataSource.getRepository(Cart);
  private cartItemRepo = AppDataSource.getRepository(CartItem);
  private productRepo  = AppDataSource.getRepository(Product);
  private userRepo     = AppDataSource.getRepository(User);

  private format(cart: Cart): CartResponseDto {
    const items = (cart.items || []).map(item => ({
      id:       item.id,
      product: {
        id:            item.product.id,
        name:          item.product.name,
        slug:          item.product.slug,
        imageUrls:     item.product.imageUrls || [],
        stockQuantity: item.product.stockQuantity,
      },
      quantity:  item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.unitPrice) * item.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

    return {
      id:        cart.id,
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal:  Math.round(subtotal * 100) / 100,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (!user) {
        const error: any = new Error('User not found');
        error.status = 404;
        throw error;
      }
      cart = this.cartRepo.create({ user, items: [] });
      await this.cartRepo.save(cart);
    }

    return cart;
  }

  async getCart(currentUser: JwtPayload): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(currentUser.sub);
    return this.format(cart);
  }

  async addItem(
    dto: AddCartItemDto,
    currentUser: JwtPayload
  ): Promise<CartResponseDto> {
    await AppDataSource.transaction(async (manager) => {
      // 1. Pessimistic Write Lock on Product to prevent concurrent overselling
      const product = await manager.findOne(Product, {
        where: { id: dto.productId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        const error: any = new Error('Product not found or unavailable');
        error.status = 404;
        throw error;
      }

      // 2. Initial stock check
      if (product.stockQuantity < dto.quantity) {
        const error: any = new Error(
          `Insufficient stock. Only ${product.stockQuantity} unit(s) available.`
        );
        error.status = 400;
        throw error;
      }

      // 3. Fetch or Create Cart
      let cart = await manager.findOne(Cart, {
        where: { user: { id: currentUser.sub } },
        relations: ['items', 'items.product'],
      });

      if (!cart) {
        const user = await manager.findOne(User, { where: { id: currentUser.sub } });
        if (!user) {
          const error: any = new Error('User not found');
          error.status = 404;
          throw error;
        }
        cart = manager.create(Cart, { user, items: [] });
        await manager.save(cart);
      }

      // 4. Update or Add Item
      const existingItem = cart.items?.find(
        i => i.product.id === dto.productId
      );

      if (existingItem) {
        const newQty = existingItem.quantity + dto.quantity;
        if (newQty > product.stockQuantity) {
          const error: any = new Error(
            `Cannot add ${dto.quantity} more. You already have ${existingItem.quantity} in your cart and only ${product.stockQuantity} are in stock.`
          );
          error.status = 400;
          throw error;
        }
        existingItem.quantity = newQty;
        await manager.save(existingItem);
      } else {
        const cartItem = manager.create(CartItem, {
          cart,
          product,
          quantity:  dto.quantity,
          unitPrice: product.price,
        });
        await manager.save(cartItem);
      }
    });

    return this.getCart(currentUser);
  }

  async updateItem(
    itemId: string,
    dto: UpdateCartItemDto,
    currentUser: JwtPayload
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(currentUser.sub);

    const item = cart.items?.find(i => i.id === itemId);
    if (!item) {
      const error: any = new Error('Cart item not found');
      error.status = 404;
      throw error;
    }

    // Recheck stock against new quantity
    const product = await this.productRepo.findOne({
      where: { id: item.product.id },
    });
    if (!product || product.stockQuantity < dto.quantity) {
      const error: any = new Error(
        `Insufficient stock. Only ${product?.stockQuantity ?? 0} unit(s) available.`
      );
      error.status = 400;
      throw error;
    }

    item.quantity = dto.quantity;
    await this.cartItemRepo.save(item);

    return this.getCart(currentUser);
  }

  async removeItem(
    itemId: string,
    currentUser: JwtPayload
  ): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(currentUser.sub);

    const item = cart.items?.find(i => i.id === itemId);
    if (!item) {
      const error: any = new Error('Cart item not found');
      error.status = 404;
      throw error;
    }

    await this.cartItemRepo.remove(item);
    return this.getCart(currentUser);
  }

  async clearCart(currentUser: JwtPayload): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(currentUser.sub);

    if (cart.items?.length > 0) {
      await this.cartItemRepo.remove(cart.items);
    }

    return this.getCart(currentUser);
  }
}
