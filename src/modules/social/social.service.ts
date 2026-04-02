import { AppDataSource }           from '../../config/database';
import { Friendship, FriendshipStatus } from '../../entities/Friendship';
import { SharedCart }              from '../../entities/SharedCart';
import { Cart }                    from '../../entities/Cart';
import { User }                    from '../../entities/User';
import { JwtPayload }              from '../../utils/jwt';
import {
  SendFriendRequestDto,
  RespondFriendRequestDto,
  ShareCartDto,
  FriendResponseDto,
  SharedCartResponseDto,
} from './social.dto';

export class SocialService {
  private friendshipRepo = AppDataSource.getRepository(Friendship);
  private sharedCartRepo = AppDataSource.getRepository(SharedCart);
  private cartRepo       = AppDataSource.getRepository(Cart);
  private userRepo       = AppDataSource.getRepository(User);

  // ── POST /social/friends/request ──────────────────────────────────────────
  async sendFriendRequest(
    dto:         SendFriendRequestDto,
    currentUser: JwtPayload
  ): Promise<FriendResponseDto> {
    if (dto.addresseeId === currentUser.sub) {
      const error: any = new Error('You cannot send a friend request to yourself');
      error.status = 400;
      throw error;
    }

    const addressee = await this.userRepo.findOne({
      where: { id: dto.addresseeId },
    });
    if (!addressee) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }

    // Check if a friendship already exists in either direction
    const existing = await this.friendshipRepo
      .createQueryBuilder('f')
      .where(
        '(f.requester_id = :me AND f.addressee_id = :them) OR ' +
        '(f.requester_id = :them AND f.addressee_id = :me)',
        { me: currentUser.sub, them: dto.addresseeId }
      )
      .getOne();

    if (existing) {
      const error: any = new Error(
        `A friendship already exists with status: ${existing.status}`
      );
      error.status = 409;
      throw error;
    }

    const requester = await this.userRepo.findOne({
      where: { id: currentUser.sub },
    });

    const friendship = this.friendshipRepo.create({
      requester: requester!,
      addressee,
      status:    FriendshipStatus.PENDING,
    });
    await this.friendshipRepo.save(friendship);

    return this.formatFriendship(friendship, currentUser.sub);
  }

  // ── PUT /social/friends/:friendshipId/respond ─────────────────────────────
  async respondToRequest(
    friendshipId: string,
    dto:          RespondFriendRequestDto,
    currentUser:  JwtPayload
  ): Promise<FriendResponseDto> {
    const friendship = await this.friendshipRepo.findOne({
      where:     { id: friendshipId },
      relations: ['requester', 'addressee'],
    });

    if (!friendship) {
      const error: any = new Error('Friend request not found');
      error.status = 404;
      throw error;
    }

    // Only the addressee can respond to a request
    if (friendship.addressee.id !== currentUser.sub) {
      const error: any = new Error(
        'You can only respond to friend requests sent to you'
      );
      error.status = 403;
      throw error;
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      const error: any = new Error(
        `Cannot respond to a request with status: ${friendship.status}`
      );
      error.status = 400;
      throw error;
    }

    const statusMap: Record<string, FriendshipStatus> = {
      accept:  FriendshipStatus.ACCEPTED,
      decline: FriendshipStatus.DECLINED,
      block:   FriendshipStatus.BLOCKED,
    };

    friendship.status = statusMap[dto.action];
    await this.friendshipRepo.save(friendship);

    return this.formatFriendship(friendship, currentUser.sub);
  }

  // ── GET /social/friends ───────────────────────────────────────────────────
  async getFriends(currentUser: JwtPayload): Promise<FriendResponseDto[]> {
    const friendships = await this.friendshipRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.requester', 'requester')
      .leftJoinAndSelect('f.addressee', 'addressee')
      .where(
        '(f.requester_id = :me OR f.addressee_id = :me) AND f.status = :status',
        { me: currentUser.sub, status: FriendshipStatus.ACCEPTED }
      )
      .orderBy('f.createdAt', 'DESC')
      .getMany();

    return friendships.map(f => this.formatFriendship(f, currentUser.sub));
  }

  // ── GET /social/friends/requests ─────────────────────────────────────────
  async getPendingRequests(
    currentUser: JwtPayload
  ): Promise<FriendResponseDto[]> {
    const requests = await this.friendshipRepo.find({
      where:     { addressee: { id: currentUser.sub }, status: FriendshipStatus.PENDING },
      relations: ['requester', 'addressee'],
      order:     { createdAt: 'DESC' },
    });

    return requests.map(f => this.formatFriendship(f, currentUser.sub));
  }

  // ── POST /social/cart/share ───────────────────────────────────────────────
  async shareCart(
    dto:         ShareCartDto,
    currentUser: JwtPayload
  ): Promise<SharedCartResponseDto> {
    // Confirm they are friends
    const friendship = await this.friendshipRepo
      .createQueryBuilder('f')
      .where(
        '((f.requester_id = :me AND f.addressee_id = :friend) OR ' +
        '(f.requester_id = :friend AND f.addressee_id = :me)) AND f.status = :status',
        {
          me:     currentUser.sub,
          friend: dto.friendId,
          status: FriendshipStatus.ACCEPTED,
        }
      )
      .getOne();

    if (!friendship) {
      const error: any = new Error(
        'You can only share your cart with accepted friends'
      );
      error.status = 403;
      throw error;
    }

    // Get the user's cart
    const cart = await this.cartRepo.findOne({
      where:     { user: { id: currentUser.sub } },
      relations: ['items', 'items.product'],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      const error: any = new Error(
        'Your cart is empty. Add items before sharing.'
      );
      error.status = 400;
      throw error;
    }

    const sharedBy   = await this.userRepo.findOne({ where: { id: currentUser.sub } });
    const sharedWith = await this.userRepo.findOne({ where: { id: dto.friendId } });

    const sharedCart = this.sharedCartRepo.create({
      cart,
      sharedBy:   sharedBy!,
      sharedWith: sharedWith!,
    });
    await this.sharedCartRepo.save(sharedCart);

    return this.formatSharedCart(sharedCart, cart);
  }

  // ── GET /social/cart/shared-with-me ──────────────────────────────────────
  async getCartsSharedWithMe(
    currentUser: JwtPayload
  ): Promise<SharedCartResponseDto[]> {
    const sharedCarts = await this.sharedCartRepo.find({
      where:     { sharedWith: { id: currentUser.sub } },
      relations: [
        'cart', 'cart.items', 'cart.items.product',
        'sharedBy',
      ],
      order:     { sharedAt: 'DESC' },
    });

    return sharedCarts.map(sc =>
      this.formatSharedCart(sc, sc.cart)
    );
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  private formatFriendship(
    f:      Friendship,
    myId:   string
  ): FriendResponseDto {
    // Show the other person's details
    const other = f.requester?.id === myId ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      user: {
        id:        other?.id,
        firstName: other?.firstName,
        lastName:  other?.lastName,
        email:     other?.email,
        avatarUrl: other?.avatarUrl || null,
      },
      status:    f.status,
      createdAt: f.createdAt,
    };
  }

  private formatSharedCart(
    sc:   SharedCart,
    cart: Cart
  ): SharedCartResponseDto {
    const items = (cart.items || []).map(item => ({
      productName: item.product?.name || 'Unknown',
      quantity:    item.quantity,
      unitPrice:   Number(item.unitPrice),
      lineTotal:   Number(item.unitPrice) * item.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

    return {
      id: sc.id,
      sharedBy: {
        id:        sc.sharedBy?.id,
        firstName: sc.sharedBy?.firstName,
        lastName:  sc.sharedBy?.lastName,
      },
      cart: {
        id:       cart.id,
        items,
        subtotal: Math.round(subtotal * 100) / 100,
      },
      sharedAt: sc.sharedAt,
    };
  }
}