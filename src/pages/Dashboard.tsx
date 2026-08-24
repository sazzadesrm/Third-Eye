import React, { useEffect, useState, useRef } from 'react';
import { 
  FileText, CheckCircle, Clock, TrendingUp, Mic, Square, Loader2, 
  BarChart3, PieChart as PieChartIcon, Layers, Building2, Tag, Calendar, ChevronRight,
  ArrowUpRight, DollarSign, Wallet
} from 'lucide-react';
import { 
  PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { db } from '../lib/db';
import { Invoice, ExpenseSource, PaymentType } from '../types';
import { formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { MonthlyExpenseTrendsChart } from '../components/MonthlyExpenseTrendsChart';

type DistributionMode = 'category' | 'vendor';

const COLOR_PALETTE = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', 
  '#06b6d4', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
];

export const Dashboard: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sources, setSources] = useState<ExpenseSource[]>([]);
  const [types, setTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);

  // Distribution Chart Controls
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('category');
  
  // Voice Quick Add State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      db.invoices.getAll(),
      db.expenseSources.getAll(),
      db.paymentTypes.getAll()
    ]).then(([invData, srcData, typData]) => {
      setInvoices(invData);
      setSources(srcData);
      setTypes(typData);
      setLoading(false);
    });
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Voice recording is not supported in this browser.");
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
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.warn("Microphone access:", err?.name || err?.message);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        alert("Microphone permission was blocked. Please grant microphone access in your browser settings to record voice requisitions.");
      } else {
        alert("Could not access microphone.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessingVoice(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice.webm');
      
      const response = await fetch('/api/parse-expense', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error("Failed to process voice");
      
      const data = await response.json();
      
      // Auto-fill New Invoice via session storage
      sessionStorage.setItem('newInvoiceFormData', JSON.stringify({
        purpose: data.purpose || '',
        amount: data.amount ? data.amount.toString() : '',
        expenseSourceId: '', paymentTypeId: '', accountTitleId: '',
        receivedById: '', preparedById: '', verifiedById: '', approvedById: '', remarks: ''
      }));
      
      navigate('/invoices/new');
      
    } catch (err) {
      console.error(err);
      alert("Failed to parse voice command. Check server and Gemini API Key.");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const approvedInvoices = invoices.filter(i => i.status === 'Approved' || i.status === 'Received');
  const totalApprovedAmount = approvedInvoices.reduce((acc, curr) => acc + curr.amount, 0);

  const stats = {
    totalApproved: totalApprovedAmount,
    totalPending: invoices.filter(i => i.status === 'Submitted' || i.status === 'Verified' || i.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0),
    totalInvoices: invoices.length,
    approvedCount: approvedInvoices.length,
  };

  // Compute Category Distribution Data
  const categoryTotals: Record<string, number> = {};
  const vendorTotals: Record<string, number> = {};

  approvedInvoices.forEach(inv => {
    const srcName = sources.find(s => s.id === inv.expenseSourceId)?.name || 'Direct Procurement';
    const catName = types.find(t => t.id === inv.paymentTypeId)?.name || 'General Operations';
    vendorTotals[srcName] = (vendorTotals[srcName] || 0) + inv.amount;
    categoryTotals[catName] = (categoryTotals[catName] || 0) + inv.amount;
  });

  const categoryPieData = Object.entries(categoryTotals)
    .map(([name, value], idx) => ({
      name,
      value,
      percentage: totalApprovedAmount > 0 ? ((value / totalApprovedAmount) * 100).toFixed(1) : '0',
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
    }))
    .sort((a, b) => b.value - a.value);

  const vendorPieData = Object.entries(vendorTotals)
    .map(([name, value], idx) => ({
      name,
      value,
      percentage: totalApprovedAmount > 0 ? ((value / totalApprovedAmount) * 100).toFixed(1) : '0',
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
    }))
    .sort((a, b) => b.value - a.value);

  const activeDistributionData = distributionMode === 'category' ? categoryPieData : vendorPieData;

  const topVendor = Object.entries(vendorTotals).sort((a,b) => b[1] - a[1])[0];
  const topCategory = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1])[0];

  if (loading) return <div className="p-8 text-center text-text-muted">Loading dashboard...</div>;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Dashboard Overview</h1>
          <p className="text-text-muted text-sm">Real-time financial analytics, monthly expense trends, and requisitions.</p>
        </div>
        
        {/* Quick Add Voice Feature */}
        <div className="flex items-center gap-3 bg-bg-panel p-2 rounded-xl shadow-sm border border-border-subtle w-full sm:w-auto justify-between sm:justify-start">
          <div className="px-2 text-xs font-semibold text-text-muted uppercase tracking-wider hidden sm:block">Voice Requisition</div>
          {isRecording ? (
            <button onClick={stopRecording} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium animate-pulse text-sm">
              <Square className="w-4 h-4 fill-current" /> Stop Recording
            </button>
          ) : isProcessingVoice ? (
            <button disabled className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-accent-100 text-accent-700 px-4 py-2 rounded-lg font-medium text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Processing AI...
            </button>
          ) : (
            <button onClick={startRecording} className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm">
              <Mic className="w-4 h-4" /> Start Voice Requisition
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard title="Total Approved Outgo" value={formatCurrency(stats.totalApproved)} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-100" />
        <StatCard title="Pending Verifications" value={formatCurrency(stats.totalPending)} icon={Clock} color="text-amber-600" bg="bg-amber-100" />
        <StatCard title="Total Vouchers" value={stats.totalInvoices.toString()} icon={FileText} color="text-accent-600" bg="bg-accent-100" />
        <StatCard title="Disbursed Vouchers" value={stats.approvedCount.toString()} icon={TrendingUp} color="text-indigo-600" bg="bg-indigo-100" />
      </div>

      {/* Primary Analytics Section: Monthly Trend & Category-Based Spending Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Expense Trend Visualization with Recharts Toggle */}
        <MonthlyExpenseTrendsChart 
          className="lg:col-span-2"
          invoices={invoices} 
          sources={sources} 
          paymentTypes={types} 
        />
        
        {/* Category-Based Spending Distribution Donut / Pie Widget */}
        <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle p-4 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-accent-600" />
                <h3 className="text-lg font-bold text-text-base">Spending Distribution</h3>
              </div>

              {/* Toggle Category vs Vendor */}
              <div className="flex bg-bg-base p-1 rounded-lg border border-border-subtle text-xs font-semibold">
                <button
                  onClick={() => setDistributionMode('category')}
                  className={`px-2 py-1 rounded transition-all ${
                    distributionMode === 'category' ? 'bg-bg-panel text-accent-600 shadow-2xs font-bold' : 'text-text-muted'
                  }`}
                >
                  Category
                </button>
                <button
                  onClick={() => setDistributionMode('vendor')}
                  className={`px-2 py-1 rounded transition-all ${
                    distributionMode === 'vendor' ? 'bg-bg-panel text-accent-600 shadow-2xs font-bold' : 'text-text-muted'
                  }`}
                >
                  Vendor
                </button>
              </div>
            </div>

            {activeDistributionData.length === 0 ? (
              <div className="py-12 text-center text-text-muted text-xs">
                No approved expense data available to visualize.
              </div>
            ) : (
              <>
                {/* Recharts Pie Donut Chart */}
                <div className="h-[210px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={activeDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {activeDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), 'Disbursed']}
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-semibold text-text-muted">Total</span>
                    <span className="text-sm font-bold text-text-base">৳{(totalApprovedAmount/1000).toFixed(0)}k</span>
                  </div>
                </div>

                {/* Ranked Category List */}
                <div className="space-y-2.5 mt-3 max-h-[160px] overflow-y-auto pr-1">
                  {activeDistributionData.slice(0, 5).map(item => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-text-base truncate font-medium">{item.name}</span>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <span className="font-semibold text-text-base">{formatCurrency(item.value)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-base text-text-muted font-mono font-medium">{item.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-border-subtle mt-4">
            <button
              onClick={() => navigate('/invoices')}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-accent-600 hover:text-accent-700 bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors border border-accent-200"
            >
              <span>Explore All Ledger Vouchers</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table / Activity */}
      <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-text-base">Recent Expense Vouchers</h3>
            <p className="text-xs text-text-muted">Latest requisition records and authorization states.</p>
          </div>
          <button 
            onClick={() => navigate('/invoices')} 
            className="text-xs font-semibold text-accent-600 hover:text-accent-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-bg-base border border-transparent hover:border-border-subtle transition-colors"
          >
            <span>View All Vouchers</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-border-subtle text-left text-xs">
              <thead className="bg-bg-base font-semibold text-text-muted uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Purpose & Description</th>
                  <th className="px-4 py-3 text-right">Amount (BDT)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-text-muted">No vouchers found in database.</td>
                  </tr>
                ) : (
                  invoices.slice(0, 6).map(invoice => (
                    <tr 
                      key={invoice.id} 
                      onClick={() => navigate(`/voucher/${invoice.id}`)}
                      className="hover:bg-bg-base/70 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-semibold text-text-base whitespace-nowrap font-mono">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">{new Date(invoice.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-text-base max-w-xs truncate">{invoice.purpose}</td>
                      <td className="px-4 py-3 font-bold text-text-base text-right whitespace-nowrap">{formatCurrency(invoice.amount)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          invoice.status === 'Approved' || invoice.status === 'Received' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : invoice.status === 'Pending' || invoice.status === 'Submitted'
                            ? 'bg-amber-100 text-amber-800'
                            : invoice.status === 'Rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/voucher/${invoice.id}`);
                          }}
                          className="text-accent-600 hover:text-accent-700 font-semibold text-xs"
                        >
                          View Voucher
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }: { title: string, value: string, icon: any, color: string, bg: string }) => (
  <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle p-4 sm:p-5 flex items-start justify-between">
    <div className="min-w-0 flex-1 pr-2">
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-text-muted mb-1 truncate">{title}</p>
      <h4 className="text-xl sm:text-2xl font-bold text-text-base truncate">{value}</h4>
    </div>
    <div className={`p-2.5 sm:p-3 rounded-xl ${bg} ${color} border border-current/10 shadow-2xs shrink-0`}>
      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
    </div>
  </div>
);


