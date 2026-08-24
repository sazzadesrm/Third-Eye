import React, { useState, useRef } from 'react';
import { 
  Camera, UploadCloud, Loader2, CheckCircle2, AlertCircle, 
  Sparkles, RefreshCw, X, FileText, Calendar, Building2, Tag, DollarSign, Eye
} from 'lucide-react';
import { ExpenseSource, PaymentType } from '../types';
import { formatCurrency } from '../lib/utils';

export interface ExtractedReceiptData {
  merchant?: string;
  vendor?: string;
  date?: string;
  amount?: number;
  purpose?: string;
  category?: string;
  invoiceNumber?: string;
  rawText?: string;
}

interface ReceiptOCRSectionProps {
  expenseSources: ExpenseSource[];
  paymentTypes: PaymentType[];
  onApplyData: (data: {
    merchantId?: string;
    categoryId?: string;
    amount?: number;
    purpose?: string;
    date?: string;
    receiptImage?: string;
    remarks?: string;
  }) => void;
}

export const ReceiptOCRSection: React.FC<ReceiptOCRSectionProps> = ({
  expenseSources = [],
  paymentTypes = [],
  onApplyData
}) => {
  const safeSources = expenseSources || [];
  const safeTypes = paymentTypes || [];
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setError(null);
    setIsScanning(true);
    setExtractedData(null);

    // Read image as base64 for local thumbnail preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/parse-receipt', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process receipt image.');
      }

      const data: ExtractedReceiptData = await response.json();
      setExtractedData(data);

      // Automatically find matching Expense Source / Vendor
      let matchedSourceId = '';
      const vendorName = data.merchant || data.vendor;
      if (vendorName) {
        const found = safeSources.find(es => 
          es?.name?.toLowerCase().includes(vendorName.toLowerCase()) || 
          vendorName.toLowerCase().includes(es?.name?.toLowerCase() || '')
        );
        if (found) matchedSourceId = found.id;
      }

      // Automatically find matching Payment Type / Category
      let matchedTypeId = '';
      if (data.category) {
        const foundCat = safeTypes.find(pt => 
          pt?.name?.toLowerCase().includes(data.category!.toLowerCase()) || 
          data.category!.toLowerCase().includes(pt?.name?.toLowerCase() || '')
        );
        if (foundCat) matchedTypeId = foundCat.id;
      }

      // Trigger automatic fill callback
      onApplyData({
        merchantId: matchedSourceId,
        categoryId: matchedTypeId,
        amount: data.amount,
        purpose: data.purpose,
        date: data.date,
        receiptImage: reader.result as string || undefined,
        remarks: vendorName ? `Scanned Receipt: ${vendorName}${data.invoiceNumber ? ` (#${data.invoiceNumber})` : ''}` : undefined
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error parsing receipt image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearScan = () => {
    setReceiptImage(null);
    setExtractedData(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-xl shadow-xs overflow-hidden">
      {/* Header Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-gradient-to-r from-accent-50/60 to-transparent dark:from-accent-950/20 flex items-center justify-between cursor-pointer select-none hover:bg-bg-base/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-600 text-white rounded-lg shadow-2xs">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-base">Smart OCR Receipt & Invoice Scanner</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-300 border border-accent-200">
                <Sparkles className="w-3 h-3" /> Auto-Extract
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Upload or snap a photo of any receipt to automatically extract merchant, date, amount & items.
            </p>
          </div>
        </div>

        <button 
          type="button"
          className="px-3 py-1.5 text-xs font-semibold text-accent-600 hover:text-accent-700 bg-bg-panel border border-border-subtle rounded-lg shadow-2xs transition-colors"
        >
          {isOpen ? 'Minimize Scanner' : 'Open OCR Scanner'}
        </button>
      </div>

      {/* Expanded Scanner Body */}
      {isOpen && (
        <div className="p-5 border-t border-border-subtle bg-bg-base/30 space-y-4 animate-in fade-in duration-150">
          {!receiptImage && !isScanning ? (
            /* Upload Dropzone */
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                isDragging 
                  ? 'border-accent-500 bg-accent-50/50 dark:bg-accent-950/20' 
                  : 'border-border-subtle hover:border-accent-400 bg-bg-panel/70 hover:bg-bg-panel'
              }`}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                capture="environment"
                onChange={handleFileChange}
                className="hidden" 
              />
              <div className="p-3 bg-accent-50 dark:bg-accent-950/60 text-accent-600 rounded-full">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-base">
                  Click to browse receipt photo or drag & drop here
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  Supports Camera photos, PNG, JPG, JPEG, WEBP receipts
                </p>
              </div>
            </div>
          ) : isScanning ? (
            /* Scanning in Progress Indicator */
            <div className="p-8 text-center bg-bg-panel rounded-xl border border-border-subtle flex flex-col items-center justify-center gap-3 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-accent-600" />
              <div>
                <p className="text-sm font-bold text-text-base">Analyzing Receipt with OCR Vision Intelligence...</p>
                <p className="text-xs text-text-muted mt-0.5">Extracting merchant name, transaction date, items, and total amount...</p>
              </div>
            </div>
          ) : (
            /* Scanned Result Banner */
            <div className="p-4 bg-bg-panel rounded-xl border border-emerald-200 dark:border-emerald-900 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OCR Extraction Complete & Form Populated</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-text-muted hover:text-text-base bg-bg-base rounded-md border border-border-subtle transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Re-scan
                  </button>
                  <button
                    type="button"
                    onClick={clearScan}
                    className="p-1 text-text-muted hover:text-red-500 rounded-md hover:bg-bg-base transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {/* Receipt Image Thumbnail */}
                {receiptImage && (
                  <div className="relative rounded-lg overflow-hidden border border-border-subtle bg-black/5 aspect-[4/3] max-h-36 group">
                    <img 
                      src={receiptImage} 
                      alt="Scanned Receipt" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold pointer-events-none">
                      <Eye className="w-4 h-4 mr-1" /> Scanned Photo
                    </div>
                  </div>
                )}

                {/* Extracted Key Fields Grid */}
                <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 bg-bg-base/70 rounded-lg border border-border-subtle">
                    <span className="text-[10px] uppercase font-bold text-text-muted block flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Merchant / Vendor
                    </span>
                    <span className="font-semibold text-text-base truncate block mt-0.5">
                      {extractedData?.merchant || extractedData?.vendor || 'Unknown'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-bg-base/70 rounded-lg border border-border-subtle">
                    <span className="text-[10px] uppercase font-bold text-text-muted block flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Total Amount
                    </span>
                    <span className="font-bold text-emerald-600 block mt-0.5 text-sm">
                      {extractedData?.amount ? formatCurrency(extractedData.amount) : '0.00'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-bg-base/70 rounded-lg border border-border-subtle">
                    <span className="text-[10px] uppercase font-bold text-text-muted block flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Date
                    </span>
                    <span className="font-semibold text-text-base block mt-0.5">
                      {extractedData?.date || 'Today'}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-3 p-2.5 bg-bg-base/70 rounded-lg border border-border-subtle">
                    <span className="text-[10px] uppercase font-bold text-text-muted block flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Extracted Purpose / Items
                    </span>
                    <span className="font-medium text-text-base block mt-0.5 truncate">
                      {extractedData?.purpose || 'General expense'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
