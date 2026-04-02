import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { VendorProfile } from './VendorProfile';

export enum FeeStatus {
  PENDING  = 'pending',
  PAID     = 'paid',
  REFUNDED = 'refunded',
}

@Entity('vendor_onboarding_fees')
export class VendorOnboardingFee {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => VendorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor!: VendorProfile;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  @Column({ nullable: true })
  paystackReference!: string;

  @Column({ type: 'enum', enum: FeeStatus, default: FeeStatus.PENDING })
  status!: FeeStatus;

  @Column({ nullable: true })
  paidAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}