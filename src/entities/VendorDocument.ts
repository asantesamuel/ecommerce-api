import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { VendorProfile } from './VendorProfile';

export enum DocumentType {
  BUSINESS_REGISTRATION = 'business_registration',
  TAX_CERTIFICATE       = 'tax_certificate',
  ID_PROOF              = 'id_proof',
  OTHER                 = 'other',
}

export enum DocumentVerificationStatus {
  PENDING  = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('vendor_documents')
export class VendorDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => VendorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor!: VendorProfile;

  @Column({ type: 'enum', enum: DocumentType })
  documentType!: DocumentType;

  @Column()
  fileKey!: string;

  @Column()
  fileUrl!: string;

  @Column({
    type: 'enum',
    enum: DocumentVerificationStatus,
    default: DocumentVerificationStatus.PENDING,
  })
  verificationStatus!: DocumentVerificationStatus;

  @CreateDateColumn()
  uploadedAt!: Date;
}