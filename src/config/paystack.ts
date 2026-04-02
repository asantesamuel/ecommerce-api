import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY as string;
const BASE_URL = 'https://api.paystack.co';

// Reusable axios instance with Paystack auth header
export const paystackClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export interface InitializeTransactionPayload {
  email:      string;
  amount:     number; // in smallest currency unit (kobo, pesewas, cents)
  currency:   string; // GHS, NGN, KES, ZAR, USD
  reference:  string; // unique transaction reference you generate
  metadata?:  Record<string, any>;
  callback_url?: string;
}

export interface InitializeTransactionResponse {
  status:  boolean;
  message: string;
  data: {
    authorization_url: string; // redirect customer here to pay
    access_code:       string;
    reference:         string;
  };
}

export interface VerifyTransactionResponse {
  status:  boolean;
  message: string;
  data: {
    status:    string;    // 'success' | 'failed' | 'abandoned'
    reference: string;
    amount:    number;    // in smallest currency unit
    currency:  string;
    customer: {
      email:      string;
      first_name: string;
      last_name:  string;
    };
    metadata:    Record<string, any>;
    paid_at:     string;
  };
}

// Initialize a new transaction — returns a payment URL
export async function initializeTransaction(
  payload: InitializeTransactionPayload
): Promise<InitializeTransactionResponse> {
  const { data } = await paystackClient.post(
    '/transaction/initialize',
    payload
  );
  return data;
}

// Verify a transaction after payment
export async function verifyTransaction(
  reference: string
): Promise<VerifyTransactionResponse> {
  const { data } = await paystackClient.get(
    `/transaction/verify/${reference}`
  );
  return data;
}

// Issue a full or partial refund
export async function refundTransaction(payload: {
  transaction: string; // Paystack transaction ID or reference
  amount?:     number; // omit for full refund
  merchant_note?: string;
}): Promise<{ status: boolean; message: string }> {
  const { data } = await paystackClient.post('/refund', payload);
  return data;
}

// Generate a unique transaction reference
export function generateReference(orderId: string): string {
  const timestamp = Date.now();
  const random    = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${orderId.substring(0, 8)}-${timestamp}-${random}`;
}

// Convert major currency unit to smallest unit
// GHS 10.50 → 1050 pesewas
// NGN 500   → 50000 kobo
export function toSmallestUnit(amount: number): number {
  return Math.round(amount * 100);
}