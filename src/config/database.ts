import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { Category } from '../entities/Category';
import { Friendship } from '../entities/Friendship';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';
import { RefreshToken } from '../entities/RefreshToken';
import { SharedCart } from '../entities/SharedCart';
import { User } from '../entities/User';
import { VendorDocument } from '../entities/VendorDocument';
import { VendorOnboardingFee } from '../entities/VendorOnboardingFee';
import { VendorProfile } from '../entities/VendorProfile';
dotenv.config();

const entities = [
  Cart,
  CartItem,
  Category,
  Friendship,
  Order,
  OrderItem,
  Product,
  RefreshToken,
  SharedCart,
  User,
  VendorDocument,
  VendorOnboardingFee,
  VendorProfile,
];

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.NODE_ENV === 'test' 
    ? process.env.DATABASE_URL_TEST 
    : process.env.DATABASE_URL,
  entities,
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development', // Sync automatically during tests and dev
  logging: process.env.NODE_ENV === 'development',
});
