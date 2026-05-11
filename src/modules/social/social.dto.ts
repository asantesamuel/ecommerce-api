// Social request/response DTOs consumed by tsoa.

export interface SendFriendRequestDto {
  addresseeId: string;
}

export interface RespondFriendRequestDto {
  action: 'accept' | 'decline' | 'block';
}

export interface ShareCartDto {
  friendId: string;
}

export interface FriendResponseDto {
  friendshipId: string;
  user: {
    id:        string;
    firstName: string;
    lastName:  string;
    email:     string;
    avatarUrl: string | null;
  };
  status:    string;
  createdAt: Date;
}

export interface SharedCartResponseDto {
  id:       string;
  sharedBy: { id: string; firstName: string; lastName: string };
  cart: {
    id:       string;
    items:    SharedCartItemDto[];
    subtotal: number;
  };
  sharedAt: Date;
}

export interface SharedCartItemDto {
  productName: string;
  quantity:    number;
  unitPrice:   number;
  lineTotal:   number;
}
