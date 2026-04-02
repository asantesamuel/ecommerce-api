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
  buildCdnUrl,
} from '../../config/s3';
import { JwtPayload }                         from '../../utils/jwt';
import {
  VendorApplyDto,
  SubmitDocumentDto,
  VendorProfileResponseDto,
  VendorDocumentResponseDto,
  VendorOnboardingResponseDto,
  AdminVendorListResponseDto,
  ReviewVendorDto,
} from './vendors.dto';

export class VendorsService {
  private vendorRepo  = AppDataSource.getRepository(VendorProfile);
  private docRepo     = AppDataSource.getRepository(VendorDocument);
  private feeRepo     = AppDataSource.getRepository(VendorOnboardingFee);
  private userRepo    = AppDataSource.getRepository(User);

  private formatVendor(v: VendorProfile): VendorProfileResponseDto {
    return {
      id:                 v.id,
      businessName:       v.businessName,
      registrationNumber: v.registrationNumber,
      contactEmail:       v.contactEmail,
      country:            v.country,
      status:             v.status,
      rejectionReason:    v.rejectionReason || null,
      approvedAt:         v.approvedAt      || null,
      createdAt:          v.createdAt,
    };
  }

  // ── POST /vendors/apply ───────────────────────────────────────────────────
  async apply(
    dto:         VendorApplyDto,
    currentUser: JwtPayload
  ): Promise<VendorOnboardingResponseDto> {
    // Check user does not already have a vendor profile
    const existing = await this.vendorRepo.findOne({
      where: { user: { id: currentUser.sub } },
    });
    if (existing) {
      const error: any = new Error(
        'You already have a vendor profile. ' +
        `Current status: ${existing.status}`
      );
      error.status = 409;
      throw error;
    }

    const user = await this.userRepo.findOne({
      where: { id: currentUser.sub },
    });
    if (!user) {
      const error: any = new Error('User not found');
      error.status = 404;
      throw error;
    }

    // Create vendor profile with pending_payment status
    const vendor = this.vendorRepo.create({
      user,
      businessName:       dto.businessName,
      registrationNumber: dto.registrationNumber,
      contactEmail:       dto.contactEmail,
      country:            dto.country,
      status:             VendorStatus.PENDING_PAYMENT,
    });
    await this.vendorRepo.save(vendor);

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
        businessName: dto.businessName,
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
    const fee = this.feeRepo.create({
      vendor,
      amount:                feeAmount,
      currency:              dto.currency || 'GHS',
      paystackReference:     reference,
      status:                FeeStatus.PENDING,
    });
    await this.feeRepo.save(fee);

    return {
      vendor: this.formatVendor(vendor),
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
      data:       data.map(this.formatVendor),
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
}