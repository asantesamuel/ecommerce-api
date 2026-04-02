import { Route, Tags, Post, Request, Response, SuccessResponse, Controller } from 'tsoa';
import { Request as ExpressRequest } from 'express';
import * as crypto                   from 'crypto';
import * as dotenv                   from 'dotenv';
import { OrdersService }             from '../orders/orders.service';
dotenv.config();

@Route('payments')
@Tags('Payments')
export class PaymentsController extends Controller {
  private ordersService = new OrdersService();

  /**
   * Paystack webhook endpoint.
   * Paystack calls this automatically after every payment event.
   * Must be publicly accessible — no JWT required.
   */
  @Post('webhook')
  @SuccessResponse(200, 'OK')
  @Response(400, 'Invalid signature')
  async handleWebhook(@Request() req: ExpressRequest): Promise<void> {
    const secret    = process.env.PAYSTACK_SECRET_KEY as string;
    const signature = req.headers['x-paystack-signature'] as string;

    // Verify the webhook came from Paystack and not a third party
    // Paystack signs every webhook with your secret key using HMAC SHA512
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== signature) {
      this.setStatus(400);
      return;
    }

    // Signature verified — process the event
    await this.ordersService.handleWebhook(req.body);
    this.setStatus(200);
  }
}