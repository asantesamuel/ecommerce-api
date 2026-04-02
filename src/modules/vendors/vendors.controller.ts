import {
  Controller, Route, Tags, Get, Post,
  Path, Body, Query, Security, Request,
  SuccessResponse, Response,
} from 'tsoa';
import { Request as ExpressRequest } from 'express';
import { VendorsService }            from './vendors.service';
import {
  VendorApplyDto,
  SubmitDocumentDto,
  VendorProfileResponseDto,
  VendorDocumentResponseDto,
  VendorOnboardingResponseDto,
  AdminVendorListResponseDto,
  ReviewVendorDto,
} from './vendors.dto';

@Route('vendors')
@Tags('Vendors')
@Security('jwt')
export class VendorsController extends Controller {
  private service = new VendorsService();

  /**
   * Apply to become a vendor.
   * Returns a paymentUrl — redirect the user there to pay the onboarding fee.
   * Status moves from pending_payment → pending_review after fee is confirmed.
   */
  @Post('apply')
  @SuccessResponse(201, 'Application submitted')
  @Response(409, 'Already has a vendor profile')
  async apply(
    @Request() req: ExpressRequest,
    @Body() body: VendorApplyDto
  ): Promise<VendorOnboardingResponseDto> {
    this.setStatus(201);
    return this.service.apply(body, req.user!);
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