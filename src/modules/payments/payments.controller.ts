import {
  Controller, Route, Tags, Post,
  Request, Response, SuccessResponse,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { PaymentsService }           from './payments.service';

@Route('payments')
@Tags('Payments')
export class PaymentsController extends Controller {
  private service = new PaymentsService();

  /**
   * Paystack webhook — handles all payment events.
   * No JWT required — Paystack calls this directly.
   */
  @Post('webhook')
  @SuccessResponse(200, 'OK')
  @Response(400, 'Invalid signature')
  async handleWebhook(@Request() req: ExpressRequest): Promise<void> {
    const signature = req.headers['x-paystack-signature'] as string;

    if (!this.service.verifyWebhookSignature(req.body, signature)) {
      this.setStatus(400);
      return;
    }

    await this.service.processWebhook(req.body);
    this.setStatus(200);
  }
}
