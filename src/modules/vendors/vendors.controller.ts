import {
  Controller, Route, Tags, Get, Post,
  Path, Body, Query, Security, Request,
  SuccessResponse, Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { VendorsService }            from './vendors.service';
import {
  VendorPayFeeDto,
  SubmitDocumentDto,
  VendorProfileResponseDto,
  VendorDocumentResponseDto,
  VendorOnboardingResponseDto,
  AdminVendorListResponseDto,
  ReviewVendorDto,
  VendorReapplyResponseDto,
} from './vendors.dto';

@Route('vendors')
@Tags('Vendors')
@Security('jwt')
export class VendorsController extends Controller {
  private service = new VendorsService();

  @Post('pay-fee')
  @SuccessResponse(200, 'Fee payment initialized')
  @Response(400, 'Vendor is not in pending_payment status')
  async payFee(
    @Request() req: ExpressRequest,
    @Body() body: VendorPayFeeDto
  ): Promise<VendorOnboardingResponseDto> {
    this.setStatus(200);
    return this.service.payFee(body, req.user!);
  }

  /**
   * Get the authenticated vendor's profile and status
   */
  @Get('me')
  @Response(404, 'Vendor profile not found')
  async getMyProfile(
    @Request() req: ExpressRequest
  ): Promise<VendorProfileResponseDto> {
    return this.service.getMyProfile(req.user!);
  }

  /**
   * Submit a business document after paying the onboarding fee.
   * Use POST /uploads/presign first to upload the file to S3,
   * then pass the returned fileKey here.
   */
  @Post('documents')
  @SuccessResponse(201, 'Document submitted')
  @Response(400, 'Fee payment required first')
  async submitDocument(
    @Request() req: ExpressRequest,
    @Body() body: SubmitDocumentDto
  ): Promise<VendorDocumentResponseDto> {
    this.setStatus(201);
    return this.service.submitDocument(body, req.user!);
  }

  /**
   * Get all documents submitted by the authenticated vendor
   */
  @Get('me/documents')
  async getMyDocuments(
    @Request() req: ExpressRequest
  ): Promise<VendorDocumentResponseDto[]> {
    return this.service.getMyDocuments(req.user!);
  }

  /**
   * Reopen a rejected vendor application.
   * If the previous paid onboarding window is still within 3 months,
   * the vendor can continue without paying again.
   * Otherwise they are moved back to pending_payment.
   */
  @Post('reapply')
  @Response(400, 'Only rejected vendor applications can be reopened')
  @Response(404, 'Vendor profile not found')
  async reapply(
    @Request() req: ExpressRequest
  ): Promise<VendorReapplyResponseDto> {
    return this.service.reapply(req.user!);
  }

  /**
   * Admin: list all vendors with pending_review status
   */
  @Get('admin/pending')
  @Response(403, 'Admins only')
  async getPendingVendors(
    @Request() req: ExpressRequest,
    @Query() page?:  number,
    @Query() limit?: number
  ): Promise<AdminVendorListResponseDto> {
    return this.service.getPendingVendors(page, limit);
  }

  /**
   * Admin: view all documents submitted by a specific vendor
   */
  @Get('{vendorId}/documents')
  @Response(403, 'Admins only')
  async getVendorDocuments(
    @Path() vendorId: string
  ): Promise<VendorDocumentResponseDto[]> {
    return this.service.getVendorDocuments(vendorId);
  }

  /**
   * Admin: approve a vendor application
   */
  @Post('{vendorId}/approve')
  @Response(400, 'Invalid status transition')
  @Response(404, 'Vendor not found')
  async approveVendor(
    @Path() vendorId: string,
    @Request() req:   ExpressRequest
  ): Promise<VendorProfileResponseDto> {
    return this.service.approveVendor(vendorId, req.user!);
  }

  /**
   * Admin: reject a vendor application with a written reason
   */
  @Post('{vendorId}/reject')
  @Response(400, 'Reason required')
  @Response(404, 'Vendor not found')
  async rejectVendor(
    @Path() vendorId: string,
    @Request() req:   ExpressRequest,
    @Body() body:     ReviewVendorDto
  ): Promise<VendorProfileResponseDto> {
    return this.service.rejectVendor(vendorId, body, req.user!);
  }

  /**
   * Admin: suspend an approved vendor
   */
  @Post('{vendorId}/suspend')
  @Response(400, 'Invalid status transition')
  @Response(404, 'Vendor not found')
  async suspendVendor(
    @Path() vendorId: string,
    @Request() req:   ExpressRequest,
    @Body() body:     ReviewVendorDto
  ): Promise<VendorProfileResponseDto> {
    return this.service.suspendVendor(vendorId, body, req.user!);
  }
}
