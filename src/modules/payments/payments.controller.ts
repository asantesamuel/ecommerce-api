import {
  Controller, Route, Tags, Post,
  Request, Response, SuccessResponse,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import * as crypto                   from 'crypto';
import * as dotenv                   from 'dotenv';
import { OrdersService }             from '../orders/orders.service';
import { VendorsService }            from '../vendors/vendors.service';
dotenv.config();

@Route('payments')
@Tags('Payments')
export class PaymentsController extends Controller {
  private ordersService  = new OrdersService();
  private vendorsService = new VendorsService();

  /**
   * Paystack webhook — handles all payment events.
   * No JWT required — Paystack calls this directly.
   */
  @Post('webhook')
  @SuccessResponse(200, 'OK')
  @Response(400, 'Invalid signature')
  async handleWebhook(@Request() req: ExpressRequest): Promise<void> {
    const secret    = process.env.PAYSTACK_SECRET_KEY as string;
    const signature = req.headers['x-paystack-signature'] as string;

    // Verify signature
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      this.setStatus(400);
      return;
    }

    const { event, data } = req.body;

    if (event !== 'charge.success') {
      this.setStatus(200);
      return;
    }

    const metadata  = data.metadata || {};
    const reference = data.reference;

    // Route to the correct handler based on payment type
    if (metadata.type === 'vendor_onboarding_fee') {
      // Vendor onboarding fee payment
      await this.vendorsService.confirmFeePayment(
        reference,
        String(data.id)
      );
    } else {
      // Regular order payment
      await this.ordersService.handleWebhook(req.body);
    }

    this.setStatus(200);
  }
}