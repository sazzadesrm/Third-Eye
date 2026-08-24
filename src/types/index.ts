export type Role = 'Super Admin' | 'Admin' | 'Pro' | 'Lite';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatar?: string;
}

export interface MasterDataBase {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ExpenseSource extends MasterDataBase {
  address: string;
}

export interface PaymentType extends MasterDataBase {}
export interface AccountTitle extends MasterDataBase {}

export interface Person extends MasterDataBase {
  officeId?: string;
  designation?: string;
  department?: string;
  phone?: string;
  email?: string;
  isReceivedBy: boolean;
  isPreparedBy: boolean;
  isVerifiedBy: boolean;
  isApprovedBy: boolean;
}

export type InvoiceStatus = 'Draft' | 'Pending' | 'Submitted' | 'Verified' | 'Approved' | 'Received' | 'Rejected' | 'Returned';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  expenseSourceId: string;
  paymentTypeId: string;
  accountTitleId: string;
  purpose: string;
  amount: number;
  amountInWords: string;
  receivedById?: string;
  remarks?: string;
  reviewRemarks?: string;
  reviewedById?: string;
  reviewedAt?: string;
  preparedById: string;
  verifiedById: string;
  approvedById: string;
  status: InvoiceStatus;
  statusTimestamps?: {
    draftAt?: string;
    pendingAt?: string;
    submittedAt?: string;
    verifiedAt?: string;
    approvedAt?: string;
    rejectedAt?: string;
    returnedAt?: string;
    receivedAt?: string;
    [key: string]: string | undefined;
  };
  approvalHistory?: Array<{
    id: string;
    status: InvoiceStatus;
    timestamp: string;
    actorId: string;
    actorName?: string;
    note?: string;
  }>;
  sealCode: string;
  referenceCode: string;
  qrPath?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attachments?: Attachment[];
}

export interface EmailLog {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  recipientEmail: string;
  recipientName?: string;
  recipientType: 'Vendor' | 'Manager' | 'Approver' | 'Accounts' | 'Other';
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  messageBody: string;
  hasPdfAttachment: boolean;
  pdfFileName?: string;
  status: 'Sent' | 'Delivered' | 'Failed';
  messageId: string;
  senderId: string;
  senderName: string;
  sentAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  module: string;
  targetId: string;
  details: string;
  timestamp: string;
  hash?: string;
  previousHash?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type BackupReminderFrequency = 'off' | 'daily' | 'weekly' | 'monthly';

export interface VoucherBrandingSettings {
  companyName: string;
  companySubtitle?: string;
  companyTagline?: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  companyTaxId?: string; // BIN / TIN / VAT
  companyWebsite?: string;
  logoUrl?: string;
  logoInitials?: string;
  themeColor: string; // Hex color or preset
  templateStyle: 'modern' | 'classic' | 'executive' | 'compact';
  showWatermark: boolean;
  showQrCode: boolean;
  showSignatures: boolean;
  showTaxBin: boolean;
  showReviewNotes: boolean;
  footerTerms?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  accentColor: string;
  invoicePrefix: string;
  invoicePadding: number;
  backupReminderFrequency: BackupReminderFrequency;
  lastBackupDate?: string;
  branding?: VoucherBrandingSettings;
  defaultEmailSubject?: string;
  defaultEmailBody?: string;
}

export type RecurringInvoiceFrequency = 'Monthly' | 'Quarterly' | 'Yearly' | 'Weekly';
export type RecurringInvoiceStatus = 'Active' | 'Paused' | 'Completed';

export interface RecurringInvoice {
  id: string;
  title: string;
  expenseSourceId: string;
  paymentTypeId: string;
  accountTitleId: string;
  purpose: string;
  amount: number;
  frequency: RecurringInvoiceFrequency;
  billingDay: number;
  startDate: string;
  endDate?: string;
  nextBillingDate: string;
  status: RecurringInvoiceStatus;
  autoGenerate: boolean;
  preparedById: string;
  verifiedById?: string;
  approvedById?: string;
  receivedById?: string;
  remarks?: string;
  lastGeneratedInvoiceId?: string;
  lastGeneratedDate?: string;
  createdBy: string;
  createdAt: string;
}
