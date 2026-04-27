import * as crypto from 'crypto';
import { OrdersService } from '../orders/orders.service';
import { VendorsService } from '../vendors/vendors.service';
import { PaystackWebhookDto } from './payments.dto';

export class PaymentsService {
  private ordersService = new OrdersService();
  private vendorsService = new VendorsService();

  verifyWebhookSignature(payload: unknown, signature?: string): boolean {
    if (!signature) {
      return false;
    }

    const secret = process.env.PAYSTACK_SECRET_KEY as string;
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  async processWebhook(payload: PaystackWebhookDto): Promise<void> {
    if (payload.event !== 'charge.success') {
      return;
    }

    const metadata = payload.data.metadata || {};
    const reference = payload.data.reference;

    if (metadata.type === 'vendor_onboarding_fee') {
      await this.vendorsService.confirmFeePayment(
        reference,
        String(payload.data.id ?? '')
      );
      return;
    }

    await this.ordersService.handleWebhook(payload);
  }
}
