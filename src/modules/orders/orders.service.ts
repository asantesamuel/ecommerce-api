import { AppDataSource }        from '../../config/database';
import { Order, OrderStatus }   from '../../entities/Order';
import { OrderItem }            from '../../entities/OrderItem';
import { Cart }                 from '../../entities/Cart';
import { CartItem }             from '../../entities/CartItem';
import { Product }              from '../../entities/Product';
import { User }                 from '../../entities/User';
import {
  initializeTransaction,
  verifyTransaction,
  refundTransaction,
  generateReference,
  toSmallestUnit,
} from '../../config/paystack';
import { JwtPayload }           from '../../utils/jwt';
import {
  CheckoutDto,
  OrderResponseDto,
  OrderListResponseDto,
  RefundDto,
} from './orders.dto';

export class OrdersService {
  private orderRepo   = AppDataSource.getRepository(Order);
  private orderItemRepo = AppDataSource.getRepository(OrderItem);
  private cartRepo    = AppDataSource.getRepository(Cart);
  private cartItemRepo = AppDataSource.getRepository(CartItem);
  private productRepo = AppDataSource.getRepository(Product);
  private userRepo    = AppDataSource.getRepository(User);

  // ── Formatter ─────────────────────────────────────────────────────────────
  private format(order: Order): OrderResponseDto {
    return {
      id:                order.id,
      status:            order.status,
      subtotal:          Number(order.subtotal),
      tax:               Number(order.tax),
      total:             Number(order.total),
      currency:          order.currency,
      shippingAddress:   order.shippingAddress,
      paystackReference: order.paystackReference,
      paymentUrl:        order.paymentUrl,
      items: (order.items || []).map(item => ({
        id:        item.id,
        product: {
          id:   item.product?.id,
          name: item.product?.name,
          slug: item.product?.slug,
        },
        quantity:  item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.unitPrice) * item.quantity,
      })),
      placedAt:  order.placedAt,
      updatedAt: order.updatedAt,
    };
  }

  // ── POST /orders/checkout ──────────────────────────────────────────────────
  async checkout(
    dto: CheckoutDto,
    currentUser: JwtPayload
  ): Promise<OrderResponseDto> {

    // 1. Fetch the user
    const user = await this.userRepo.findOne({
      where: { id: currentUser.sub },
    });
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }

    // 2. Fetch the user's cart with all items and products
    const cart = await this.cartRepo.findOne({
      where: { user: { id: currentUser.sub } },
      relations: ['items', 'items.product'],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      const error: any = new Error(
        'Your cart is empty. Add items before checking out.'
      );
      error.status = 400;
      throw error;
    }

    // 3. Validate every item in the cart
    for (const item of cart.items) {
      const product = await this.productRepo.findOne({
        where: { id: item.product.id, isActive: true },
      });

      if (!product) {
        const error: any = new Error(
          `Product "${item.product.name}" is no longer available.`
        );
        error.status = 400;
        throw error;
      }

      if (product.stockQuantity < item.quantity) {
        const error: any = new Error(
          `Insufficient stock for "${product.name}". ` +
          `Requested: ${item.quantity}, Available: ${product.stockQuantity}.`
        );
        error.status = 400;
        throw error;
      }
    }

    // 4. Calculate totals using snapshotted cart prices
    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.quantity,
      0
    );
    const tax   = Math.round(subtotal * 0.15 * 100) / 100; // 15% VAT
    const total = Math.round((subtotal + tax) * 100) / 100;

    // 5. Create the order row
    const order = this.orderRepo.create({
      user,
      status:          OrderStatus.PENDING,
      subtotal,
      tax,
      total,
      currency:        dto.currency || 'GHS',
      shippingAddress: dto.shippingAddress,
    });
    await this.orderRepo.save(order);

    // 6. Snapshot cart items into order items
    const orderItems = cart.items.map(cartItem =>
      this.orderItemRepo.create({
        order,
        product:   cartItem.product,
        quantity:  cartItem.quantity,
        unitPrice: cartItem.unitPrice, // locked price from cart
      })
    );
    await this.orderItemRepo.save(orderItems);

    // 7. Generate unique Paystack reference and initialize transaction
    const reference = generateReference(order.id);

    const paystackResponse = await initializeTransaction({
      email:     user.email,
      amount:    toSmallestUnit(total), // convert to pesewas/kobo
      currency:  dto.currency || 'GHS',
      reference,
      callback_url: dto.callbackUrl,
      metadata: {
        orderId:      order.id,
        customerName: `${user.firstName} ${user.lastName}`,
      },
    });

    if (!paystackResponse.status) {
      // Paystack rejected the transaction — mark order as failed
      order.status = OrderStatus.FAILED;
      await this.orderRepo.save(order);
      const error: any = new Error('Payment initialization failed. Please try again.');
      error.status = 502;
      throw error;
    }

    // 8. Save Paystack reference and payment URL to order
    order.paystackReference = reference;
    order.paymentUrl        = paystackResponse.data.authorization_url;
    await this.orderRepo.save(order);

    // 9. Clear the cart after successful order creation
    await this.cartItemRepo.remove(cart.items);

    // 10. Return order with the payment URL
    return this.format({ ...order, items: orderItems });
  }

  // ── Paystack webhook handler ───────────────────────────────────────────────
  async handleWebhook(event: any): Promise<void> {
    const { event: eventType, data } = event;

    // Only handle charge success events
    if (eventType !== 'charge.success') return;

    const reference = data.reference;

    // Find the order by Paystack reference
    const order = await this.orderRepo.findOne({
      where:     { paystackReference: reference },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      console.warn(`Webhook received for unknown reference: ${reference}`);
      return;
    }

    // Avoid processing the same webhook twice
    if (order.status !== OrderStatus.PENDING) {
      console.log(`Order ${order.id} already processed. Skipping.`);
      return;
    }

    // Verify the transaction directly with Paystack API
    // Never trust webhook data alone — always verify server-side
    const verification = await verifyTransaction(reference);

    if (
      verification.status &&
      verification.data.status === 'success' &&
      Number(verification.data.amount) === toSmallestUnit(Number(order.total))
    ) {
      // Mark order as paid
      order.status = OrderStatus.PAID;
      order.paystackTransactionId = String(data.id);
      await this.orderRepo.save(order);

      // Decrement stock for each product in the order
      for (const item of order.items) {
        await this.productRepo.decrement(
          { id: item.product.id },
          'stockQuantity',
          item.quantity
        );
      }

      console.log(`Order ${order.id} confirmed and paid.`);
    } else {
      order.status = OrderStatus.FAILED;
      await this.orderRepo.save(order);
      console.warn(`Payment verification failed for order ${order.id}`);
    }
  }

  // ── GET /orders — user order history ──────────────────────────────────────
  async findUserOrders(
    currentUser: JwtPayload,
    page  = 1,
    limit = 20
  ): Promise<OrderListResponseDto> {
    const skip = (Math.max(1, page) - 1) * Math.min(100, limit);

    const [data, total] = await this.orderRepo.findAndCount({
      where:    { user: { id: currentUser.sub } },
      relations: ['items', 'items.product'],
      order:    { placedAt: 'DESC' },
      skip,
      take:     Math.min(100, limit),
    });

    return {
      data:       data.map(this.format),
      total,
      page:       Math.max(1, page),
      limit:      Math.min(100, limit),
      totalPages: Math.ceil(total / Math.min(100, limit)),
    };
  }

  // ── GET /orders/:id ────────────────────────────────────────────────────────
  async findOne(
    id:          string,
    currentUser: JwtPayload
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findOne({
      where:     { id },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      const error: any = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    // Customers can only view their own orders
    // Admins can view any order
    if (
      currentUser.role !== 'admin' &&
      order.user?.id !== currentUser.sub
    ) {
      const error: any = new Error('You do not have access to this order');
      error.status = 403;
      throw error;
    }

    return this.format(order);
  }

  // ── Admin: GET /orders — all orders ───────────────────────────────────────
  async findAllOrders(
    page  = 1,
    limit = 20,
    status?: string
  ): Promise<OrderListResponseDto> {
    const skip = (Math.max(1, page) - 1) * Math.min(100, limit);

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.placedAt', 'DESC')
      .skip(skip)
      .take(Math.min(100, limit));

    if (status) {
      qb.where('order.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data:       data.map(this.format),
      total,
      page:       Math.max(1, page),
      limit:      Math.min(100, limit),
      totalPages: Math.ceil(total / Math.min(100, limit)),
    };
  }

  // ── Admin: issue a refund ─────────────────────────────────────────────────
  async refund(
    dto:         RefundDto,
    currentUser: JwtPayload
  ): Promise<{ message: string }> {
    if (currentUser.role !== 'admin') {
      const error: any = new Error('Only admins can issue refunds');
      error.status = 403;
      throw error;
    }

    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
    });

    if (!order) {
      const error: any = new Error('Order not found');
      error.status = 404;
      throw error;
    }

    if (order.status !== OrderStatus.PAID) {
      const error: any = new Error(
        `Cannot refund an order with status "${order.status}". Only paid orders can be refunded.`
      );
      error.status = 400;
      throw error;
    }

    if (!order.paystackTransactionId) {
      const error: any = new Error(
        'No Paystack transaction ID found on this order'
      );
      error.status = 400;
      throw error;
    }

    const refundPayload: any = {
      transaction:   order.paystackTransactionId,
      merchant_note: dto.reason,
    };

    // Partial refund — convert to smallest unit
    if (dto.amount !== undefined) {
      if (dto.amount > Number(order.total)) {
        const error: any = new Error(
          `Refund amount (${dto.amount}) cannot exceed order total (${order.total})`
        );
        error.status = 400;
        throw error;
      }
      refundPayload.amount = toSmallestUnit(dto.amount);
    }

    const result = await refundTransaction(refundPayload);

    if (!result.status) {
      const error: any = new Error('Refund failed. Please try again.');
      error.status = 502;
      throw error;
    }

    // Update order status
    order.status = OrderStatus.REFUNDED;
    await this.orderRepo.save(order);

    return {
      message: dto.amount
        ? `Partial refund of ${order.currency} ${dto.amount} issued successfully`
        : 'Full refund issued successfully',
    };
  }
}