import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, Camera, RefreshCw, Upload, CheckCircle2, AlertTriangle, 
  ExternalLink, FileText, Plus, Copy, Check, Sparkles, Zap, ZapOff,
  SwitchCamera, ScanLine, ShieldCheck
} from 'lucide-react';
import jsQR from 'jsqr';
import { db } from '../lib/db';
import { Invoice } from '../types';
import { formatCurrency } from '../lib/utils';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult?: (data: any) => void;
}

export interface ParsedQRData {
  raw: string;
  isThirdEyeInvoice: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  date?: string;
  purpose?: string;
  vendorName?: string;
  status?: string;
  sealCode?: string;
  existingInvoice?: Invoice | null;
}

// Audio chime using Web Audio API
const playSuccessChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // AudioContext may be blocked before interaction
  }
};

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedQRData | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [processingImage, setProcessingImage] = useState(false);

  const animationFrameIdRef = useRef<number | null>(null);

  // Start camera stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setParsedResult(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API is not supported in this browser. Please use the image upload option.');
      setScanMode('upload');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);

      // Check for torch capability
      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities && capabilities.torch) {
          setHasTorchSupport(true);
        } else {
          setHasTorchSupport(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser or upload a QR image.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No video camera device was detected on this system.');
      } else {
        setCameraError(`Camera initialisation failed: ${err.message || 'Unable to open camera.'}`);
      }
      setScanMode('upload');
    }
  };

  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch toggle not supported:', err);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Continuous frame scanner loop
  const scanVideoFrame = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data && code.data.trim().length > 0) {
        handleQRCodeDetected(code.data);
        return; // Pause scanning on match
      }
    }

    if (isScanning) {
      animationFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
    }
  };

  useEffect(() => {
    if (isScanning) {
      animationFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isScanning]);

  useEffect(() => {
    if (isOpen) {
      if (scanMode === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
      setParsedResult(null);
    }
    return () => stopCamera();
  }, [isOpen, facingMode, scanMode]);

  // Decode QR code content and match with DB
  const handleQRCodeDetected = async (qrText: string) => {
    setIsScanning(false);
    playSuccessChime();

    let isThirdEye = false;
    let invoiceNumber: string | undefined;
    let invoiceId: string | undefined;
    let amount: number | undefined;
    let date: string | undefined;
    let purpose: string | undefined;
    let vendorName: string | undefined;
    let status: string | undefined;
    let sealCode: string | undefined;

    // Check JSON payload
    try {
      const parsedJson = JSON.parse(qrText);
      if (parsedJson && typeof parsedJson === 'object') {
        isThirdEye = true;
        invoiceNumber = parsedJson.invoiceNumber || parsedJson.invNo || parsedJson.id;
        invoiceId = parsedJson.id;
        amount = typeof parsedJson.amount === 'number' ? parsedJson.amount : parseFloat(parsedJson.amount || '0');
        date = parsedJson.date;
        purpose = parsedJson.purpose;
        vendorName = parsedJson.vendor || parsedJson.expenseSource;
        status = parsedJson.status;
        sealCode = parsedJson.sealCode;
      }
    } catch (e) {
      // Not JSON, check if it's a URL or Invoice text format
      if (qrText.includes('/voucher/') || qrText.includes('/verify/')) {
        isThirdEye = true;
        const parts = qrText.split('/');
        const lastPart = parts[parts.length - 1];
        sealCode = lastPart;
      } else if (/^INV-WAL-MIS-\d{8}/i.test(qrText)) {
        isThirdEye = true;
        invoiceNumber = qrText.trim();
      }
    }

    // Try finding matching invoice in DB
    const allInvoices = await db.invoices.getAll();
    let matchedInvoice: Invoice | null = null;

    if (invoiceId) {
      matchedInvoice = allInvoices.find(i => i.id === invoiceId) || null;
    }
    if (!matchedInvoice && invoiceNumber) {
      matchedInvoice = allInvoices.find(i => i.invoiceNumber.toLowerCase() === invoiceNumber?.toLowerCase()) || null;
    }
    if (!matchedInvoice && sealCode) {
      matchedInvoice = allInvoices.find(i => i.sealCode === sealCode) || null;
    }

    // If matching invoice found, enrich parsed data
    if (matchedInvoice) {
      invoiceId = matchedInvoice.id;
      invoiceNumber = matchedInvoice.invoiceNumber;
      amount = matchedInvoice.amount;
      date = matchedInvoice.date;
      purpose = matchedInvoice.purpose;
      status = matchedInvoice.status;
      sealCode = matchedInvoice.sealCode;
    }

    const resultData: ParsedQRData = {
      raw: qrText,
      isThirdEyeInvoice: isThirdEye || !!matchedInvoice,
      invoiceId,
      invoiceNumber,
      amount,
      date,
      purpose,
      vendorName,
      status,
      sealCode,
      existingInvoice: matchedInvoice,
    };

    setParsedResult(resultData);
    if (onScanResult) {
      onScanResult(resultData);
    }
  };

  // Upload image file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingImage(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setProcessingImage(false);
          alert('Could not initialize canvas context.');
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        setProcessingImage(false);
        if (code && code.data) {
          handleQRCodeDetected(code.data);
        } else {
          alert('No recognizable QR code detected in this image. Please upload a clear photo.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCopyRaw = () => {
    if (!parsedResult) return;
    navigator.clipboard.writeText(parsedResult.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetScan = () => {
    setParsedResult(null);
    if (scanMode === 'camera') {
      setIsScanning(true);
    }
  };

  const handleCreateVoucherFromQR = () => {
    if (!parsedResult) return;
    onClose();
    // Navigate with pre-filled state
    navigate('/invoices/new', {
      state: {
        prefill: {
          purpose: parsedResult.purpose || `Expenditure from Scanned QR: ${parsedResult.invoiceNumber || 'Vendor Bill'}`,
          amount: parsedResult.amount || '',
          remarks: `Scanned from QR code data: ${parsedResult.raw}`,
          vendorName: parsedResult.vendorName
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-bg-panel border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-bg-base">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-300 flex items-center justify-center border border-accent-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-base flex items-center gap-2">
                QR Code Scanner
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase">
                  Live Camera
                </span>
              </h2>
              <p className="text-xs text-text-muted">Instant optical recognition for vouchers and vendor receipts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-xl transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-4 bg-bg-panel">
          <div className="flex bg-bg-base p-1 rounded-xl border border-border-subtle">
            <button
              onClick={() => { setScanMode('camera'); setParsedResult(null); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                scanMode === 'camera' 
                  ? 'bg-bg-panel text-text-base shadow-2xs' 
                  : 'text-text-muted hover:text-text-base'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera Stream</span>
            </button>

            <button
              onClick={() => { setScanMode('upload'); stopCamera(); setParsedResult(null); }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                scanMode === 'upload' 
                  ? 'bg-bg-panel text-text-base shadow-2xs' 
                  : 'text-text-muted hover:text-text-base'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="p-5 flex flex-col items-center">
          {parsedResult ? (
            /* Scanned Result Card */
            <div className="w-full space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>QR Code Successfully Captured!</span>
                </div>

                {parsedResult.existingInvoice ? (
                  /* Existing Invoice in System */
                  <div className="space-y-2 text-xs bg-white dark:bg-black/40 p-3.5 rounded-lg border border-emerald-100 dark:border-emerald-900">
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Invoice No:</span>
                      <span className="font-bold text-text-base font-mono">{parsedResult.existingInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Total Amount:</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        {formatCurrency(parsedResult.existingInvoice.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-muted">Status:</span>
                      <span className="font-semibold uppercase text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                        {parsedResult.existingInvoice.status}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border-subtle">
                      <p className="text-text-muted mb-0.5">Purpose:</p>
                      <p className="font-medium text-text-base line-clamp-2">{parsedResult.existingInvoice.purpose}</p>
                    </div>
                  </div>
                ) : (
                  /* Decoded External Data */
                  <div className="space-y-2 text-xs bg-white dark:bg-black/40 p-3.5 rounded-lg border border-emerald-100 dark:border-emerald-900">
                    {parsedResult.invoiceNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted">Extracted No:</span>
                        <span className="font-bold text-text-base font-mono">{parsedResult.invoiceNumber}</span>
                      </div>
                    )}
                    {parsedResult.amount ? (
                      <div className="flex justify-between items-center">
                        <span className="text-text-muted">Amount:</span>
                        <span className="font-bold text-text-base">{formatCurrency(parsedResult.amount)}</span>
                      </div>
                    ) : null}
                    {parsedResult.purpose && (
                      <div>
                        <span className="text-text-muted">Particulars:</span>
                        <p className="font-medium text-text-base">{parsedResult.purpose}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-text-muted block mb-1">Raw Payload:</span>
                      <pre className="p-2 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded text-[11px] font-mono break-all whitespace-pre-wrap max-h-24 overflow-y-auto">
                        {parsedResult.raw}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {parsedResult.existingInvoice ? (
                  <button
                    onClick={() => {
                      onClose();
                      navigate(`/voucher/${parsedResult.existingInvoice!.id}`);
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Open & View Full Voucher</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </button>
                ) : (
                  <button
                    onClick={handleCreateVoucherFromQR}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Auto-Fill into New Expense Voucher</span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCopyRaw}
                    className="flex items-center justify-center gap-1.5 py-2 bg-bg-base hover:bg-bg-panel border border-border-subtle text-text-base rounded-xl text-xs font-semibold transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  <button
                    onClick={handleResetScan}
                    className="flex items-center justify-center gap-1.5 py-2 bg-bg-base hover:bg-bg-panel border border-border-subtle text-text-base rounded-xl text-xs font-semibold transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Scan Another QR</span>
                  </button>
                </div>
              </div>
            </div>
          ) : scanMode === 'camera' ? (
            /* Live Camera Viewfinder */
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-900 dark:text-rose-200 text-xs space-y-2 text-center w-full">
                  <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
                  <p className="font-bold">{cameraError}</p>
                  <button
                    onClick={() => setScanMode('upload')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold hover:bg-rose-100"
                  >
                    Switch to Image Upload
                  </button>
                </div>
              ) : (
                <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden bg-black border-2 border-accent-500 shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Optical Scanner Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-accent-400/80 rounded-xl relative">
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-accent-500 rounded-tl-sm" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-accent-500 rounded-tr-sm" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-accent-500 rounded-bl-sm" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-accent-500 rounded-br-sm" />
                      
                      {/* Animated Laser Scan Line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-accent-400 to-transparent shadow-lg shadow-accent-500/50 animate-pulse absolute top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Camera Controls Overlay Bar */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-1.5 bg-black/60 backdrop-blur-xs rounded-xl text-white text-xs">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Scanning...
                    </span>

                    <div className="flex items-center gap-2">
                      {hasTorchSupport && (
                        <button
                          onClick={toggleTorch}
                          className={`p-1.5 rounded-lg transition-colors ${torchOn ? 'bg-amber-400 text-slate-900' : 'bg-white/20 hover:bg-white/30'}`}
                          title="Toggle Flashlight"
                        >
                          {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                        </button>
                      )}

                      <button
                        onClick={toggleCameraFacing}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        title="Switch Camera (Front/Back)"
                      >
                        <SwitchCamera className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-[11px] text-text-muted mt-3 text-center">
                Point your device camera directly at a Third Eye voucher or receipt QR code.
              </p>
            </div>
          ) : (
            /* Upload Image File View */
            <div className="w-full flex flex-col items-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-video max-w-[340px] border-2 border-dashed border-border-subtle hover:border-accent-500 rounded-2xl flex flex-col items-center justify-center p-6 bg-bg-base hover:bg-bg-panel cursor-pointer transition-all group text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-accent-50 dark:bg-accent-950 text-accent-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-text-base mb-1">Click or Drag QR Image Here</p>
                <p className="text-[11px] text-text-muted">Supports JPG, PNG, WEBP receipt captures</p>

                {processingImage && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-accent-600 font-semibold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing QR code...</span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
