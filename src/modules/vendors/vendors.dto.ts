// TODO: define request/response DTOs for vendors
// Use class-validator decorators for tsoa validation

export interface VendorPayFeeDto {
  /**
   * Currency to pay the onboarding fee in
   * @minLength 3 @maxLength 3 @pattern ^[A-Z]{3}$
   */
  currency?: string;

  /** URL Paystack redirects to after fee payment */
  callbackUrl?: string;
}

export interface SubmitDocumentDto {
  fileKey:      string;
  documentType: 'business_registration' | 'tax_certificate' | 'id_proof' | 'other';
}

export interface VendorProfileResponseDto {
  id:                 string;
  companyName:        string;
  companyEstablishedDate: Date | null;
  registrationNumber: string;
  contactEmail:       string;
  country:            string;
  status:             string;
  rejectionReason:    string | null;
  approvedAt:         Date   | null;
  createdAt:          Date;
}

export interface VendorDocumentResponseDto {
  id:                 string;
  documentType:       string;
  fileUrl:            string;
  verificationStatus: string;
  uploadedAt:         Date;
}

export interface VendorOnboardingResponseDto {
  vendor:     VendorProfileResponseDto;
  fee: {
    amount:    number;
    currency:  string;
    status:    string;
    paymentUrl: string; // redirect here to pay onboarding fee
    reference: string;
  };
}

export interface AdminVendorListResponseDto {
  data:       VendorProfileResponseDto[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface ReviewVendorDto {
  /** @minLength 10 @maxLength 500 */
  reason?: string; // required when rejecting
}