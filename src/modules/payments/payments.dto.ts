export interface PaystackWebhookDataDto {
  id?: string | number;
  reference: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PaystackWebhookDto {
  event: string;
  data: PaystackWebhookDataDto;
}
