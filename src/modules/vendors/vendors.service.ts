import { AppDataSource }                      from '../../config/database';
import { VendorProfile, VendorStatus }        from '../../entities/VendorProfile';
import { VendorDocument, DocumentType }       from '../../entities/VendorDocument';
import { VendorOnboardingFee, FeeStatus }     from '../../entities/VendorOnboardingFee';
import { User, UserRole }                     from '../../entities/User';
import {
  initializeTransaction,
  generateReference,
  toSmallestUnit,
} from '../../config/paystack';
import {
  getPresignedDownloadUrl,
} from '../../config/s3';
import { JwtPayload }                         from '../../utils/jwt';
import { UploadsService }                     from '../uploads/uploads.service';
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

export class VendorsService {
  private vendorRepo  = AppDataSource.getRepository(VendorProfile);
  private docRepo     = AppDataSource.getRepository(VendorDocument);
  private feeRepo     = AppDataSource.getRepository(VendorOnboardingFee);
  private userRepo    = AppDataSource.getRepository(User);
  private uploadsService = new UploadsService();

  private getReapplyDeadline(feePaidAt?: Date | null): Date | null {
    if (!feePaidAt) {
      return null;
    }

    const deadline = new Date(feePaidAt);
    deadline.setMonth(deadline.getMonth() + 3);
    return deadline;
  }

  private async getReapplyState(vendorId: string): Promise<{
    canReapplyWithoutFee: boolean;
    requiresNewFee: boolean;
    reapplyDeadline: Date | null;
  }> {
    const fee = await this.feeRepo.findOne({
      where: { vendor: { id: vendorId } },
    });

    const reapplyDeadline = this.getReapplyDeadline(fee?.paidAt || null);
    const canReapplyWithoutFee = Boolean(
      reapplyDeadline && reapplyDeadline.getTime() >= Date.now()
    );

    return {
      canReapplyWithoutFee,
      requiresNewFee: !canReapplyWithoutFee,
      reapplyDeadline,
    };
  }

  private async formatVendor(v: VendorProfile): Promise<VendorProfileResponseDto> {
    const reapplyState = v.status === VendorStatus.REJECTED
      ? await this.getReapplyState(v.id)
      : {
          canReapplyWithoutFee: false,
          requiresNewFee: false,
          reapplyDeadline: null,
        };

    return {
      id:                 v.id,
      companyName:        v.companyName,
      companyEstablishedDate: v.companyEstablishedDate,
      registrationNumber: v.registrationNumber,
      contactEmail:       v.contactEmail,
      country:            v.country,
      status:             v.status,
      rejectionReason:    v.rejectionReason || null,
      canReapplyWithoutFee: reapplyState.canReapplyWithoutFee,
      requiresNewFee: reapplyState.requiresNewFee,
      reapplyDeadline: reapplyState.reapplyDeadline,
      approvedAt:         v.approvedAt      || null,
      createdAt:          v.createdAt,
    };
  }

  // ── POST /vendors/pay-fee ───────────────────────────────────────────────────
  async payFee(
    dto:         VendorPayFeeDto,
    currentUser: JwtPayload
  ): Promise<VendorOnboardingResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: currentUser.sub },
    });
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }

    const vendor = await this.vendorRepo.findOne({
      where: { user: { id: currentUser.sub } },
    });
    if (!vendor) {
      const error: any = new Error('Vendor profile not found. Please register as a vendor first.');
      error.status = 404;
      throw error;
    }

    if (vendor.status !== VendorStatus.PENDING_PAYMENT) {
      const error: any = new Error(
        `You cannot pay the onboarding fee. Current status: ${vendor.status}`
      );
      error.status = 400;
      throw error;
    }

    // Get onboarding fee amount from env
    const feeAmount = Number(process.env.VENDOR_ONBOARDING_FEE || 5000) / 100;

    // Initialize Paystack transaction for the onboarding fee
    const reference = generateReference(vendor.id);

    const paystackResponse = await initializeTransaction({
      email:       user.email,
      amount:      toSmallestUnit(feeAmount),
      currency:    dto.currency || 'GHS',
      reference,
      callback_url: dto.callbackUrl,
      metadata: {
        vendorId:     vendor.id,
        type:         'vendor_onboarding_fee',
        companyName:  vendor.companyName,
      },
    });

    if (!paystackResponse.status) {
      // Clean up vendor profile if payment init fails
      await this.vendorRepo.remove(vendor);
      const error: any = new Error(
        'Failed to initialize fee payment. Please try again.'
      );
      error.status = 502;
      throw error;
    }

    // Save fee record
    const existingFee = await this.feeRepo.findOne({
      where: { vendor: { id: vendor.id } },
    });

    const fee = existingFee
      ? Object.assign(existingFee, {
          amount: feeAmount,
          currency: dto.currency || 'GHS',
          paystackReference: reference,
          status: FeeStatus.PENDING,
          paidAt: null,
        })
      : this.feeRepo.create({
          vendor,
          amount:                feeAmount,
          currency:              dto.currency || 'GHS',
          paystackReference:     reference,
          status:                FeeStatus.PENDING,
        });
    await this.feeRepo.save(fee);

    return {
      vendor: await this.formatVendor(vendor),
      fee: {
        amount:     feeAmount,
        currency:   dto.currency || 'GHS',
        status:     FeeStatus.PENDING,
        paymentUrl: paystackResponse.data.authorization_url,
        reference,
      },
    };
  }

  // ── Called by webhook after fee payment confirmed ─────────────────────────
  async confirmFeePayment(
    reference:           string,
    paystackTransactionId: string
  ): Promise<void> {
    const fee = await this.feeRepo.findOne({
      where:     { paystackReference: reference },
      relations: ['vendor'],
    });
    if (!fee) {
      console.warn(`Onboarding fee not found for reference: ${reference}`);
      return;
    }

    // Avoid double processing
    if (fee.status === FeeStatus.PAID) return;

    fee.status  = FeeStatus.PAID;
    fee.paidAt  = new Date();
    await this.feeRepo.save(fee);

    // Advance vendor status to pending_review
    fee.vendor.status = VendorStatus.PENDING_REVIEW;
    await this.vendorRepo.save(fee.vendor);

    console.log(
      `Vendor ${fee.vendor.id} fee paid. Status → pending_review`
    );
  }

  // ── POST /vendors/documents ───────────────────────────────────────────────
  async submitDocument(
    dto:         SubmitDocumentDto,
    currentUser: JwtPayload
  ): Promise<VendorDocumentResponseDto> {
    const vendor = await this.vendorRepo.findOne({
      where: { user: { id: currentUser.sub } },
    });
    if (!vendor) {
      const error: any = new Error('Vendor profile not found');
      error.status = 404;
      throw error;
    }

    if (vendor.status === VendorStatus.PENDING_PAYMENT) {
      const error: any = new Error(
        'Please complete your onboarding fee payment before submitting documents'
      );
      error.status = 400;
      throw error;
    }

    await this.uploadsService.assertOwnedUploadedFile(
      'documents',
      dto.fileKey,
      currentUser
    );

    // Build a time-limited signed URL for the document
    const fileUrl = await getPresignedDownloadUrl(
      process.env.S3_BUCKET_DOCUMENTS as string,
      dto.fileKey,
      3600
    );

    const doc = this.docRepo.create({
      vendor,
      documentType:       dto.documentType as DocumentType,
      fileKey:            dto.fileKey,
      fileUrl:            dto.fileKey, // store key, generate URL on demand
      verificationStatus: 'pending'   as any,
    });
    await this.docRepo.save(doc);

    return {
      id:                 doc.id,
      documentType:       doc.documentType,
      fileUrl,
      verificationStatus: doc.verificationStatus,
      uploadedAt:         doc.uploadedAt,
    };
  }

  // ── GET /vendors/me ───────────────────────────────────────────────────────
  async getMyProfile(
    currentUser: JwtPayload
  ): Promise<VendorProfileResponseDto> {
    const vendor = await this.vendorRepo.findOne({
      where: { user: { id: currentUser.sub } },
    });
    if (!vendor) {
      const error: any = new Error('Vendor profile not found');
      error.status = 404;
      throw error;
    }
    return this.formatVendor(vendor);
  }

  // ── GET /vendors/me/documents ─────────────────────────────────────────────
  async getMyDocuments(
    currentUser: JwtPayload
  ): Promise<VendorDocumentResponseDto[]> {
    const vendor = await this.vendorRepo.findOne({
      where: { user: { id: currentUser.sub } },
    });
    if (!vendor) {
      const error: any = new Error('Vendor profile not found');
      error.status = 404;
      throw error;
    }

    const docs = await this.docRepo.find({
      where: { vendor: { id: vendor.id } },
      order: { uploadedAt: 'DESC' },
    });

    // Generate fresh signed URLs for each document
    const formatted = await Promise.all(
      docs.map(async doc => ({
        id:                 doc.id,
        documentType:       doc.documentType,
        fileUrl:            await getPresignedDownloadUrl(
          process.env.S3_BUCKET_DOCUMENTS as string,
          doc.fileKey,
          3600
        ),
        verificationStatus: doc.verificationStatus,
        uploadedAt:         doc.uploadedAt,
      }))
    );

    return formatted;
  }

  // ── Admin: GET /vendors/pending ───────────────────────────────────────────
  async getPendingVendors(
    page  = 1,
    limit = 20
  ): Promise<AdminVendorListResponseDto> {
    const skip = (Math.max(1, page) - 1) * Math.min(100, limit);

    const [data, total] = await this.vendorRepo.findAndCount({
      where: { status: VendorStatus.PENDING_REVIEW },
      order: { createdAt: 'ASC' },
      skip,
      take:  Math.min(100, limit),
    });

    return {
      data:       await Promise.all(data.map(vendor => this.formatVendor(vendor))),
      total,
      page:       Math.max(1, page),
      limit:      Math.min(100, limit),
      totalPages: Math.ceil(total / Math.min(100, limit)),
    };
  }

  // ── Admin: GET /vendors/:id/documents ─────────────────────────────────────
  async getVendorDocuments(
    vendorId: string
  ): Promise<VendorDocumentResponseDto[]> {
    const docs = await this.docRepo.find({
      where: { vendor: { id: vendorId } },
      order: { uploadedAt: 'DESC' },
    });

    return Promise.all(
      docs.map(async doc => ({
        id:                 doc.id,
        documentType:       doc.documentType,
        fileUrl:            await getPresignedDownloadUrl(
          process.env.S3_BUCKET_DOCUMENTS as string,
          doc.fileKey,
          3600
        ),
        verificationStatus: doc.verificationStatus,
        uploadedAt:         doc.uploadedAt,
      }))
    );
  }

  // ── Admin: POST /vendors/:id/approve ─────────────────────────────────────
  async approveVendor(
    vendorId:    string,
    currentUser: JwtPayload
  ): Promise<VendorProfileResponseDto> {
    const vendor = await this.vendorRepo.findOne({
      where: { id: vendorId },
    });
    if (!vendor) {
      const error: any = new Error('Vendor not found');
      error.status = 404;
      throw error;
    }
    if (vendor.status !== VendorStatus.PENDING_REVIEW) {
      const error: any = new Error(
        `Cannot approve a vendor with status "${vendor.status}"`
      );
      error.status = 400;
      throw error;
    }

    const reviewingAdmin = await this.userRepo.findOne({
      where: { id: currentUser.sub },
    });

    vendor.status     = VendorStatus.APPROVED;
    vendor.approvedAt = new Date();
    vendor.reviewedBy = reviewingAdmin!;

    // Promote user role to vendor
    await this.userRepo.update(
      { id: vendor.user?.id },
      { role: UserRole.VENDOR }
    );

    await this.vendorRepo.save(vendor);
    return this.formatVendor(vendor);
  }

  // ── Admin: POST /vendors/:id/reject ──────────────────────────────────────
  async rejectVendor(
    vendorId:    string,
    dto:         ReviewVendorDto,
    currentUser: JwtPayload
  ): Promise<VendorProfileResponseDto> {
    if (!dto.reason || dto.reason.trim().length < 10) {
      const error: any = new Error(
        'A rejection reason of at least 10 characters is required'
      );
      error.status = 400;
      throw error;
    }

    const vendor = await this.vendorRepo.findOne({
      where: { id: vendorId },
    });
    if (!vendor) {
      const error: any = new Error('Vendor not found');
      error.status = 404;
      throw error;
    }
    if (vendor.status !== VendorStatus.PENDING_REVIEW) {
      const error: any = new Error(
        `Cannot reject a vendor with status "${vendor.status}"`
      );
      error.status = 400;
      throw error;
    }

    const reviewingAdmin = await this.userRepo.findOne({
      where: { id: currentUser.sub },
    });

    vendor.status          = VendorStatus.REJECTED;
    vendor.rejectionReason = dto.reason;
    vendor.reviewedBy      = reviewingAdmin!;

    await this.vendorRepo.save(vendor);
    return this.formatVendor(vendor);
  }

  // ── Admin: POST /vendors/:id/suspend ─────────────────────────────────────
  async suspendVendor(
    vendorId:    string,
    dto:         ReviewVendorDto,
    currentUser: JwtPayload
  ): Promise<VendorProfileResponseDto> {
    const vendor = await this.vendorRepo.findOne({
      where:     { id: vendorId },
      relations: ['user'],
    });
    if (!vendor) {
      const error: any = new Error('Vendor not found');
      error.status = 404;
      throw error;
    }
    if (vendor.status !== VendorStatus.APPROVED) {
      const error: any = new Error(
        `Cannot suspend a vendor with status "${vendor.status}"`
      );
      error.status = 400;
      throw error;
    }

    vendor.status          = VendorStatus.SUSPENDED;
    vendor.rejectionReason = dto.reason || null!;

    // Downgrade user role back to customer
    await this.userRepo.update(
      { id: vendor.user?.id },
      { role: UserRole.CUSTOMER }
    );

    await this.vendorRepo.save(vendor);
    return this.formatVendor(vendor);
  }

  async reapply(
    currentUser: JwtPayload
  ): Promise<VendorReapplyResponseDto> {
    const vendor = await this.vendorRepo.findOne({
      where: { user: { id: currentUser.sub } },
    });
    if (!vendor) {
      const error: any = new Error('Vendor profile not found');
      error.status = 404;
      throw error;
    }

    if (vendor.status !== VendorStatus.REJECTED) {
      const error: any = new Error('Only rejected vendor applications can be reopened');
      error.status = 400;
      throw error;
    }

    const reapplyState = await this.getReapplyState(vendor.id);

    vendor.rejectionReason = null!;
    vendor.reviewedBy = null;

    if (reapplyState.canReapplyWithoutFee) {
      vendor.status = VendorStatus.PENDING_REVIEW;
      await this.vendorRepo.save(vendor);

      return {
        vendor: await this.formatVendor(vendor),
        message: 'Your application has been reopened. You can continue with document submission and review.'
      };
    }

    vendor.status = VendorStatus.PENDING_PAYMENT;
    await this.vendorRepo.save(vendor);

    return {
      vendor: await this.formatVendor(vendor),
      message: 'Your previous onboarding payment window expired. Please pay the vendor onboarding fee again to continue.'
    };
  }
}
