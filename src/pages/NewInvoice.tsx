import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { db } from '../lib/db';
import { ExpenseSource, PaymentType, AccountTitle, Person, Invoice } from '../types';
import { numberToWords, generateSealCode, generateReferenceCode, formatCurrency } from '../lib/utils';
import { useAuthStore } from '../lib/store';
import { Save, Send, ArrowLeft, Camera, Loader2, Check, Mic, MicOff, Volume2, Sparkles, AlertCircle, QrCode } from 'lucide-react';
import { QRScannerModal } from '../components/QRScannerModal';

export const NewInvoice: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [scanningReceipt, setScanningReceipt] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);

  // Voice-to-Text Dictation State
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isProcessingAudioFallback, setIsProcessingAudioFallback] = useState(false);

  const [expenseSources, setExpenseSources] = useState<ExpenseSource[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [accountTitles, setAccountTitles] = useState<AccountTitle[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const [formData, setFormData] = useState({
    expenseSourceId: '',
    paymentTypeId: '',
    accountTitleId: '',
    purpose: '',
    amount: '',
    receivedById: '',
    preparedById: '',
    verifiedById: '',
    approvedById: '',
    remarks: '',
  });

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setMicPermissionError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            currentInterim += transcript;
          }
        }

        if (finalTranscript) {
          setFormData(prev => {
            const separator = prev.purpose.trim() ? ' ' : '';
            const updatedPurpose = prev.purpose + separator + finalTranscript.trim();
            
            // Check if amount is spoken, e.g., "500 taka" or "tk 2000" or "$150"
            const numMatch = finalTranscript.match(/(?:tk|taka|bdt|\$|amount\s*(?:is|of)?)\s*(\d+(?:[.,]\d+)?)/i) || 
                             finalTranscript.match(/(\d+(?:[.,]\d+)?)\s*(?:tk|taka|bdt|dollars?)/i);
            
            let updatedAmount = prev.amount;
            if (numMatch && (!prev.amount || prev.amount === '0')) {
              updatedAmount = numMatch[1].replace(',', '');
            }

            return {
              ...prev,
              purpose: updatedPurpose,
              amount: updatedAmount
            };
          });
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (event: any) => {
        const errType = event?.error || 'unknown';
        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          setMicPermissionError('Microphone permission was denied. Please allow microphone access in your browser or address bar settings to use voice dictation.');
        } else if (errType === 'no-speech') {
          // User paused or didn't speak, do not treat as fatal error
          setMicPermissionError(null);
        } else if (errType !== 'aborted') {
          setMicPermissionError(`Voice input: ${errType}`);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const toggleVoiceDictation = async () => {
    setMicPermissionError(null);
    
    // If currently listening, stop
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    // Try starting Web Speech Recognition first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        return;
      } catch (err: any) {
        // If already active or browser requires explicit getUserMedia prompt first
        console.warn('Speech recognition start note:', err?.message || err);
      }
    }

    // Fallback: Use MediaRecorder & Server Gemini transcription
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermissionError('Voice recording is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await handleAudioFileTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('Microphone permission status:', err?.name || err?.message);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setMicPermissionError('Microphone permission is blocked. Please click the camera/microphone icon in your browser address bar to allow access.');
      } else {
        setMicPermissionError('Could not access microphone on this device.');
      }
      setIsListening(false);
    }
  };

  const handleAudioFileTranscription = async (blob: Blob) => {
    setIsProcessingAudioFallback(true);
    try {
      const form = new FormData();
      form.append('audio', blob, 'dictation.webm');

      const res = await fetch('/api/parse-expense', {
        method: 'POST',
        body: form
      });

      if (!res.ok) throw new Error('Voice parsing failed');
      const data = await res.json();

      if (data.purpose || data.amount) {
        setFormData(prev => ({
          ...prev,
          purpose: data.purpose ? (prev.purpose ? `${prev.purpose} - ${data.purpose}` : data.purpose) : prev.purpose,
          amount: data.amount ? String(data.amount) : prev.amount,
        }));
      }
    } catch (e: any) {
      console.error(e);
      setMicPermissionError('Voice processing failed. Please type description manually.');
    } finally {
      setIsProcessingAudioFallback(false);
      setIsListening(false);
    }
  };

  useEffect(() => {
    Promise.all([
      db.expenseSources.getAll(),
      db.paymentTypes.getAll(),
      db.accountTitles.getAll(),
      db.people.getAll(),
      isEditing ? db.invoices.getById(id!) : Promise.resolve(null)
    ]).then(([es, pt, at, p, inv]) => {
      setExpenseSources(es.filter(i => i.isActive));
      setPaymentTypes(pt.filter(i => i.isActive));
      setAccountTitles(at.filter(i => i.isActive));
      setPeople(p.filter(i => i.isActive));

      if (inv) {
        setExistingInvoice(inv);
        setFormData({
          expenseSourceId: inv.expenseSourceId,
          paymentTypeId: inv.paymentTypeId,
          accountTitleId: inv.accountTitleId,
          purpose: inv.purpose,
          amount: inv.amount.toString(),
          receivedById: inv.receivedById || '',
          preparedById: inv.preparedById,
          verifiedById: inv.verifiedById,
          approvedById: inv.approvedById,
          remarks: inv.remarks || '',
        });
      } else if (!isEditing) {
        const statePrefill = (location.state as any)?.prefill;
        if (statePrefill) {
          let matchedSourceId = '';
          if (statePrefill.vendorName) {
            const found = es.find(s => s.name.toLowerCase().includes(statePrefill.vendorName.toLowerCase()));
            if (found) matchedSourceId = found.id;
          }
          setFormData(prev => ({
            ...prev,
            purpose: statePrefill.purpose || prev.purpose,
            amount: statePrefill.amount ? String(statePrefill.amount) : prev.amount,
            remarks: statePrefill.remarks || prev.remarks,
            expenseSourceId: matchedSourceId || prev.expenseSourceId,
          }));
        } else {
          // Load auto-save
          const saved = sessionStorage.getItem('newInvoiceFormData');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed) setFormData(parsed);
            } catch(e) {}
          }
        }
      }
      setLoading(false);
    });
  }, [id, isEditing, location.state]);

  // Auto-save
  useEffect(() => {
    if (!loading && !isEditing) {
      sessionStorage.setItem('newInvoiceFormData', JSON.stringify(formData));
    }
  }, [formData, loading, isEditing]);

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanningReceipt(true);
    try {
      const form = new FormData();
      form.append('image', file);

      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        body: form
      });

      if (!res.ok) throw new Error('Failed to parse receipt');
      
      const data = await res.json();
      
      let matchedSourceId = formData.expenseSourceId;
      if (data.vendor) {
        const found = expenseSources.find(es => 
          es.name.toLowerCase().includes(data.vendor.toLowerCase()) || 
          data.vendor.toLowerCase().includes(es.name.toLowerCase())
        );
        if (found) matchedSourceId = found.id;
      }

      setFormData(prev => ({
        ...prev,
        amount: data.amount ? String(data.amount) : prev.amount,
        expenseSourceId: matchedSourceId,
        remarks: prev.remarks ? `${prev.remarks} (Receipt Scanned: ${data.vendor}, ${data.date})` : `Receipt Scanned: ${data.vendor}, ${data.date}`
      }));
      
      alert('Receipt scanned and fields populated successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to scan receipt. Please check the image and try again.');
    } finally {
      setScanningReceipt(false);
      // Reset input
      e.target.value = '';
    }
  };

  const amountNumber = parseFloat(formData.amount) || 0;
  const amountInWords = numberToWords(amountNumber);

  const handleSubmit = async (e: React.FormEvent, status: 'Draft' | 'Pending' | 'Approved' | 'Submitted') => {
    e.preventDefault();
    if (formData.preparedById === formData.approvedById && status !== 'Draft') {
      alert("Preparer and Approver cannot be the same person.");
      return;
    }
    
    setSubmitting(true);
    try {
      const invoiceNumber = isEditing && existingInvoice ? existingInvoice.invoiceNumber : await db.invoices.generateInvoiceNumber();
      const finalStatus = status === 'Submitted' ? 'Pending' : status;
      const newInvoice: Invoice = {
        ...(existingInvoice || {}),
        id: isEditing && existingInvoice ? existingInvoice.id : crypto.randomUUID(),
        invoiceNumber,
        date: isEditing && existingInvoice ? existingInvoice.date : new Date().toISOString(),
        ...formData,
        amount: amountNumber,
        amountInWords,
        status: finalStatus,
        sealCode: isEditing && existingInvoice ? existingInvoice.sealCode : generateSealCode(),
        referenceCode: isEditing && existingInvoice ? existingInvoice.referenceCode : generateReferenceCode(),
        createdBy: isEditing && existingInvoice ? existingInvoice.createdBy : (user?.id || 'sys'),
        createdAt: isEditing && existingInvoice ? existingInvoice.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reviewedById: finalStatus === 'Approved' ? user?.id : undefined,
        reviewedAt: finalStatus === 'Approved' ? new Date().toISOString() : undefined,
        reviewRemarks: finalStatus === 'Approved' ? 'Directly approved on creation' : undefined,
      } as Invoice;

      await db.invoices.save(newInvoice);
      await db.auditLogs.add(
        user?.id || 'sys', 
        isEditing ? 'Edit Invoice' : (finalStatus === 'Draft' ? 'Create Draft' : finalStatus === 'Approved' ? 'Create & Approve Invoice' : 'Submit for Approval'), 
        'Invoice', 
        newInvoice.id, 
        `${isEditing ? 'Edited' : 'Created'} invoice ${invoiceNumber} (Status: ${finalStatus})`
      );
      
      // Notify approver if pending
      if (finalStatus === 'Pending') {
        const targetPersonId = formData.approvedById || formData.verifiedById;
        if (targetPersonId) {
          await db.notifications.add({
            userId: targetPersonId,
            title: 'Invoice Submitted for Approval',
            message: `Invoice ${invoiceNumber} (${formatCurrency(amountNumber)}) is in the approval queue.`
          });
        }
      }

      if (!isEditing) sessionStorage.removeItem('newInvoiceFormData');
      navigate('/invoices');
    } catch (error) {
      console.error(error);
      alert("Failed to save invoice");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-text-muted">Loading form data...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-2 text-text-muted hover:bg-bg-panel rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-base">{isEditing ? 'Edit Invoice' : 'Create New Invoice'}</h1>
            <p className="text-text-muted">{isEditing ? `Editing ${existingInvoice?.invoiceNumber}` : 'Fill out the details to generate a new miscellaneous expense voucher.'}</p>
          </div>
        </div>
        
        {!isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100 rounded-lg transition-colors text-xs font-semibold shadow-2xs"
              title="Scan QR code with camera to auto-fill expense details"
            >
              <QrCode className="w-4 h-4 text-accent-600" />
              <span>Scan QR Code</span>
            </button>

            <div className="relative">
              <input 
                type="file" 
                accept="image/*" capture="environment" 
                onChange={handleReceiptScan} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={scanningReceipt}
              />
              <button 
                type="button" 
                className={`flex items-center gap-2 px-3.5 py-2 ${scanningReceipt ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'} rounded-lg transition-colors text-xs font-semibold shadow-2xs`}
              >
                {scanningReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {scanningReceipt ? 'Scanning...' : 'OCR Receipt'}
              </button>
            </div>
          </div>
        )}
      </div>

      <form className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle overflow-hidden">
        <div className="p-6 md:p-8 space-y-8">
          
          {/* Categorization */}
          <div>
            <h3 className="text-lg font-bold text-text-base mb-4 border-b border-border-subtle pb-2">Categorization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Expense Source *</label>
                <select required value={formData.expenseSourceId} onChange={e => setFormData({...formData, expenseSourceId: e.target.value})} className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all">
                  <option value="">Select Expense Source</option>
                  {expenseSources.map(es => <option key={es.id} value={es.id}>{es.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Payment Type *</label>
                <select required value={formData.paymentTypeId} onChange={e => setFormData({...formData, paymentTypeId: e.target.value})} className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all">
                  <option value="">Select Payment Type</option>
                  {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-base mb-1">Account Title *</label>
                <select required value={formData.accountTitleId} onChange={e => setFormData({...formData, accountTitleId: e.target.value})} className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all">
                  <option value="">Select Account Title</option>
                  {accountTitles.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center justify-between border-b border-border-subtle pb-2 mb-4">
              <h3 className="text-lg font-bold text-text-base">Transaction Details</h3>
              
              {/* Voice-to-Text Button Header */}
              <button
                type="button"
                onClick={toggleVoiceDictation}
                disabled={isProcessingAudioFallback}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20' 
                    : isProcessingAudioFallback
                    ? 'bg-accent-100 text-accent-700'
                    : 'bg-accent-50 text-accent-700 hover:bg-accent-100 border border-accent-200'
                }`}
                title="Dictate expense purpose using your microphone"
              >
                {isProcessingAudioFallback ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isListening ? (
                  <Mic className="w-3.5 h-3.5 fill-current animate-bounce" />
                ) : (
                  <Mic className="w-3.5 h-3.5" />
                )}
                <span>
                  {isProcessingAudioFallback 
                    ? 'Processing Voice...' 
                    : isListening 
                    ? 'Listening... Click to Stop' 
                    : 'Voice Dictate Description'}
                </span>
              </button>
            </div>

            {micPermissionError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{micPermissionError}</span>
              </div>
            )}

            {isListening && (
              <div className="mb-4 p-3.5 bg-accent-50/80 dark:bg-accent-950/40 border border-accent-200 dark:border-accent-800 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-4 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="w-2 h-6 bg-red-500 rounded-full animate-pulse delay-75"></span>
                    <span className="w-2 h-3 bg-red-500 rounded-full animate-pulse delay-150"></span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-base">
                      Microphone Active — Speak your expense details clearly
                    </p>
                    <p className="text-[11px] text-text-muted italic">
                      {interimTranscript || 'Listening for speech (e.g., "Office supplies and printer toner 2500 taka")...'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className="px-2.5 py-1 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Done
                </button>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-text-base">
                    Purpose / Particulars *
                  </label>
                  <span className="text-[11px] text-text-muted">
                    Click mic to dictate directly
                  </span>
                </div>
                <div className="relative">
                  <input 
                    required 
                    type="text" 
                    value={formData.purpose} 
                    onChange={e => setFormData({...formData, purpose: e.target.value})} 
                    placeholder="Describe the purpose of this expense (or click mic to speak)" 
                    className="w-full pl-3.5 pr-12 py-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all" 
                  />
                  <button
                    type="button"
                    onClick={toggleVoiceDictation}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                      isListening ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-text-muted hover:text-accent-600 hover:bg-bg-panel'
                    }`}
                    title="Voice-to-text input"
                  >
                    <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-text-base mb-1">Amount (TK) *</label>
                  <input required type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none font-medium transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-base mb-1">Amount In Words</label>
                  <div className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-muted text-sm italic min-h-[46px] flex items-center">
                    {amountInWords}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Remarks (Optional)</label>
                <textarea rows={2} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all" placeholder="Any additional notes..."></textarea>
              </div>
            </div>
          </div>

          {/* Signatories */}
          <div>
            <h3 className="text-lg font-bold text-text-base mb-4 border-b border-border-subtle pb-2">Signatories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Prepared By *</label>
                <select required value={formData.preparedById} onChange={e => setFormData({...formData, preparedById: e.target.value})} className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none text-sm transition-all">
                  <option value="">Select</option>
                  {people.filter(p => p.isPreparedBy).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Verified By *</label>
                <select required value={formData.verifiedById} onChange={e => setFormData({...formData, verifiedById: e.target.value})} className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none text-sm transition-all">
                  <option value="">Select</option>
                  {people.filter(p => p.isVerifiedBy).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Approved By *</label>
                <select required value={formData.approvedById} onChange={e => setFormData({...formData, approvedById: e.target.value})} className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none text-sm transition-all">
                  <option value="">Select</option>
                  {people.filter(p => p.isApprovedBy).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Received By</label>
                <select value={formData.receivedById} onChange={e => setFormData({...formData, receivedById: e.target.value})} className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none text-sm transition-all">
                  <option value="">Select (Optional)</option>
                  {people.filter(p => p.isReceivedBy).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

        </div>
        
        <div className="px-6 py-4 bg-bg-base border-t border-border-subtle flex flex-wrap items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={() => navigate('/invoices')}
            className="px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-border-subtle hover:text-text-base rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={(e) => handleSubmit(e, 'Draft')}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-bg-panel border border-border-subtle text-text-base hover:bg-bg-base rounded-lg transition-colors shadow-sm disabled:opacity-70"
          >
            <Save className="w-4 h-4" /> Save as Draft
          </button>
          
          {/* Direct Approval for Admin/Managers */}
          {(user?.role === 'Admin' || user?.role === 'Super Admin') && (
            <button 
              type="button"
              onClick={(e) => handleSubmit(e, 'Approved')}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-70"
            >
              <Check className="w-4 h-4" /> Approve Directly
            </button>
          )}

          <button 
            type="submit"
            onClick={(e) => handleSubmit(e, 'Pending')}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors shadow-sm disabled:opacity-70"
          >
            <Send className="w-4 h-4" /> {isEditing ? 'Update & Submit' : 'Submit for Approval'}
          </button>
        </div>
      </form>
      {/* QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />
    </div>
  );
};
