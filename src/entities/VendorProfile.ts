import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

export enum VendorStatus {
  PENDING_PAYMENT  = 'pending_payment',
  PENDING_REVIEW   = 'pending_review',
  APPROVED         = 'approved',
  REJECTED         = 'rejected',
  SUSPENDED        = 'suspended',
}

@Entity('vendor_profiles')
export class VendorProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  businessName!: string;

  @Column({ nullable: true })
  registrationNumber!: string;

  @Column()
  contactEmail!: string;

  @Column({ length: 2 })
  country!: string;

  @Column({
    type: 'enum',
    enum: VendorStatus,
    default: VendorStatus.PENDING_PAYMENT,
  })
  status!: VendorStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy!: User | null;

  @Column({ nullable: true })
  approvedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}