import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  Loader2, 
  Copy, 
  Check,
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Download,
  ClipboardList,
  Target,
  AlertTriangle,
  History,
  MessageSquare,
  Pencil,
  Eye,
  RotateCcw,
  Columns,
  Heading,
  Bold,
  List,
  Table,
  Save,
  Search,
  Replace,
  X,
  FileSpreadsheet,
  CheckSquare,
  HelpCircle,
  ShieldAlert,
  Users,
  UserCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Lock,
  ExternalLink,
  Trash2,
  ShieldCheck,
  EyeOff,
  Sparkles,
  Wand2,
  UserPlus,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { analyzeMeeting, analyzeCondensedMeeting } from './services/geminiService';
import { exportMeetingTablesToExcel, extractMeetingTables } from './utils/excelExport';
import { exportMeetingToPdf } from './utils/pdfExport';
import { 
  OrganizationPerson, 
  getStoredPersonnel, 
  saveStoredPersonnel, 
  resetStoredPersonnel,
  replaceHomophonesInTranscript
} from './data/organizationPersonnel';
import { PersonnelModal } from './components/PersonnelModal';
import { TrackingTablesManager, TrackingItemWithState } from './components/TrackingTablesManager';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [originalResult, setOriginalResult] = useState<string | null>(null);

  // Full vs. Condensed (4-dimension) Report Management
  const [reportType, setReportType] = useState<'full' | 'condensed'>('full');
  const [fullResult, setFullResult] = useState<string | null>(null);
  const [originalFullResult, setOriginalFullResult] = useState<string | null>(null);
  const [condensedResult, setCondensedResult] = useState<string | null>(null);
  const [originalCondensedResult, setOriginalCondensedResult] = useState<string | null>(null);
  const [isGeneratingCondensed, setIsGeneratingCondensed] = useState(false);

  const [viewMode, setViewMode] = useState<'preview' | 'edit' | 'split'>('preview');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Organization Personnel State
  const [personnelList, setPersonnelList] = useState<OrganizationPerson[]>(() => getStoredPersonnel());
  const [personnelModalOpen, setPersonnelModalOpen] = useState(false);
  const [homophoneFixNotification, setHomophoneFixNotification] = useState<string | null>(null);

  const handleSavePersonnel = (newList: OrganizationPerson[]) => {
    setPersonnelList(newList);
    saveStoredPersonnel(newList);
  };

  const handleResetPersonnel = () => {
    const defaultList = resetStoredPersonnel();
    setPersonnelList(defaultList);
  };

  // One-click homophone & alias transcript replacement
  const handleQuickHomophoneFix = () => {
    if (!transcript.trim()) return;
    const { updatedText, replacementCount, replacements } = replaceHomophonesInTranscript(transcript, personnelList);
    if (replacementCount === 0) {
      setHomophoneFixNotification('未在內文中偵測到需校正的組織人物同音字或口語別名。');
    } else {
      setTranscript(updatedText);
      const detailSummary = replacements
        .slice(0, 3)
        .map(r => `「${r.alias}」→「${r.target}」(${r.count}處)`)
        .join('、');
      setHomophoneFixNotification(`已完成 ${replacementCount} 處組織同音字校正！${detailSummary}${replacements.length > 3 ? '等' : ''}`);
    }
    setTimeout(() => setHomophoneFixNotification(null), 5000);
  };
  
  // Excel Export State & Custom Keep/Delete Tables State
  const [isExcelExporting, setIsExcelExporting] = useState(false);
  const [excelExported, setExcelExported] = useState(false);
  const [pdfExported, setPdfExported] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [customRecorder, setCustomRecorder] = useState<string>('吳俊傑');

  // Interactive Tables State with Keep/Delete functionality
  const [trackingItems, setTrackingItems] = useState<TrackingItemWithState[]>([]);
  const [clarificationItems, setClarificationItems] = useState<TrackingItemWithState[]>([]);
  const [riskItems, setRiskItems] = useState<TrackingItemWithState[]>([]);
  const [includeTrackingTable, setIncludeTrackingTable] = useState<boolean>(true);
  const [includeClarificationTable, setIncludeClarificationTable] = useState<boolean>(true);
  const [includeRiskTable, setIncludeRiskTable] = useState<boolean>(true);

  const parsedMeetingData = useMemo(() => {
    return result ? extractMeetingTables(result) : null;
  }, [result]);

  // Sync extracted tables to tracking state whenever a new analysis/result is loaded
  useEffect(() => {
    if (parsedMeetingData) {
      setTrackingItems(parsedMeetingData.items.map(item => ({ ...item, isExcluded: false })));
      setClarificationItems(parsedMeetingData.clarificationItems.map(item => ({ ...item, isExcluded: false })));
      setRiskItems(parsedMeetingData.riskItems.map(item => ({ ...item, isExcluded: false })));
      setIncludeTrackingTable(true);
      setIncludeClarificationTable(parsedMeetingData.clarificationItems.length > 0);
      setIncludeRiskTable(parsedMeetingData.riskItems.length > 0);
    } else {
      setTrackingItems([]);
      setClarificationItems([]);
      setRiskItems([]);
    }
  }, [parsedMeetingData]);

  const handleResetTablesToDefault = () => {
    if (parsedMeetingData) {
      setTrackingItems(parsedMeetingData.items.map(item => ({ ...item, isExcluded: false })));
      setClarificationItems(parsedMeetingData.clarificationItems.map(item => ({ ...item, isExcluded: false })));
      setRiskItems(parsedMeetingData.riskItems.map(item => ({ ...item, isExcluded: false })));
      setIncludeTrackingTable(true);
      setIncludeClarificationTable(parsedMeetingData.clarificationItems.length > 0);
      setIncludeRiskTable(parsedMeetingData.riskItems.length > 0);
    }
  };

  const handleExportExcel = async () => {
    if (!result || !parsedMeetingData) return;
    setIsExcelExporting(true);
    try {
      const activeTracking = trackingItems.filter(i => !i.isExcluded);
      const activeClarification = clarificationItems.filter(i => !i.isExcluded);
      const activeRisk = riskItems.filter(i => !i.isExcluded);

      await exportMeetingTablesToExcel(parsedMeetingData, {
        recorder: customRecorder || '吳俊傑',
        includeTrackingTable,
        includeClarificationTable,
        includeRiskTable,
        customItems: activeTracking,
        customClarificationItems: activeClarification,
        customRiskItems: activeRisk,
      });
      setExcelExported(true);
      setTimeout(() => setExcelExported(false), 3000);
    } catch (err) {
      console.error('Excel 導出失敗:', err);
      alert('導出 Excel 時發生錯誤，請稍後再試。');
    } finally {
      setIsExcelExporting(false);
    }
  };
  
  // Find & Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [replaceMessage, setReplaceMessage] = useState<string | null>(null);

  // Custom API Key (BYOK) State
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('user_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [tempApiKey, setTempApiKey] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);
  const [keySavedNotification, setKeySavedNotification] = useState<string | null>(null);
  const [apiKeyInputError, setApiKeyInputError] = useState<string | null>(null);

  // First-time startup check: Automatically trigger API key prompt if not configured
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('user_gemini_api_key');
      if (!storedKey || !storedKey.trim()) {
        setTempApiKey('');
        setApiKeyModalOpen(true);
      }
    } catch {
      setApiKeyModalOpen(true);
    }
  }, []);

  const handleOpenApiKeyModal = () => {
    setTempApiKey(customApiKey);
    setApiKeyInputError(null);
    setApiKeyModalOpen(true);
  };

  const handleSaveApiKey = () => {
    const trimmed = tempApiKey.trim();
    setApiKeyInputError(null);
    if (!trimmed) {
      setApiKeyInputError('請輸入有效的 Gemini API Key 才能啟用會議記錄分析功能。');
      return;
    }

    try {
      localStorage.setItem('user_gemini_api_key', trimmed);
      setCustomApiKey(trimmed);
      setKeySavedNotification('已成功儲存個人 API Key！系統已就緒，您可以開始分析會議記錄。');
      setError(null);
      setTimeout(() => {
        setKeySavedNotification(null);
        setApiKeyModalOpen(false);
      }, 1400);
    } catch (e) {
      console.error('儲存 API Key 失敗:', e);
      setApiKeyInputError('儲存至瀏覽器失敗，請確認未停用 LocalStorage。');
    }
  };

  const handleClearApiKey = () => {
    try {
      localStorage.removeItem('user_gemini_api_key');
      setCustomApiKey('');
      setTempApiKey('');
      setKeySavedNotification('已清除金鑰。請注意：必須設定個人 Key 才能進行分析。');
      setTimeout(() => {
        setKeySavedNotification(null);
        setApiKeyModalOpen(false);
      }, 1400);
    } catch (e) {
      console.error('清除 API Key 失敗:', e);
    }
  };

  const resultRef = useRef<HTMLDivElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync edits across full vs. condensed cache
  const updateResult = (newContent: string) => {
    setResult(newContent);
    if (reportType === 'full') {
      setFullResult(newContent);
    } else {
      setCondensedResult(newContent);
    }
  };

  const handleAnalyze = async (type: 'full' | 'condensed' = 'full') => {
    if (!transcript.trim()) return;

    if (!customApiKey.trim()) {
      setError('本系統必須由使用者自備個人 Gemini API Key 才能執行分析。請在彈出的視窗中輸入您的 API Key。');
      handleOpenApiKeyModal();
      return;
    }

    if (type === 'condensed') {
      await handleGenerateCondensed();
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeMeeting(transcript, customApiKey, personnelList);
      setFullResult(analysis);
      setOriginalFullResult(analysis);
      setResult(analysis);
      setOriginalResult(analysis);
      setReportType('full');
      setViewMode('preview');
      // Scroll to result after a short delay to allow rendering
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析過程中發生錯誤，請稍後再試。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Dedicated generator for the 4-dimension condensed brief
  const handleGenerateCondensed = async () => {
    if (!transcript.trim() && !fullResult) return;

    if (!customApiKey.trim()) {
      setError('本系統必須由使用者自備個人 Gemini API Key 才能執行分析。請在彈出的視窗中輸入您的 API Key。');
      handleOpenApiKeyModal();
      return;
    }

    setIsGeneratingCondensed(true);
    setError(null);
    try {
      // If full result already exists, pass both to produce the sharpest condensed brief
      const sourceText = fullResult
        ? `【已整理之完整專業分析】：\n${fullResult}\n\n【原始會議內容/逐字稿】：\n${transcript}`
        : transcript;
      const analysis = await analyzeCondensedMeeting(sourceText, customApiKey, personnelList);
      setCondensedResult(analysis);
      setOriginalCondensedResult(analysis);
      setResult(analysis);
      setOriginalResult(analysis);
      setReportType('condensed');
      setViewMode('preview');
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '產出簡略版時發生錯誤，請稍後再試。');
    } finally {
      setIsGeneratingCondensed(false);
    }
  };

  const handleSwitchReportType = (targetType: 'full' | 'condensed') => {
    if (targetType === reportType) return;
    setReportType(targetType);
    if (targetType === 'full') {
      setResult(fullResult);
      setOriginalResult(originalFullResult);
    } else {
      setResult(condensedResult);
      setOriginalResult(originalCondensedResult);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('複製失敗:', e);
    }
  };

  const handleReset = () => {
    if (originalResult) {
      if (window.confirm('確定要將報告內容還原為 AI 產生的原始版本嗎？此操作將覆蓋您已修改的文字。')) {
        updateResult(originalResult);
      }
    }
  };

  const insertMarkdownSnippet = (before: string, after: string = '') => {
    const textarea = editTextareaRef.current;
    if (!textarea || result === null) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = result.substring(start, end);
    const replacement = `${before}${selectedText}${after}`;

    const newResult = result.substring(0, start) + replacement + result.substring(end);
    updateResult(newResult);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const getMatchCount = (): number => {
    if (!findText || !result) return 0;
    try {
      const flags = matchCase ? 'g' : 'gi';
      const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, flags);
      const matches = result.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  };

  const handleReplaceAll = () => {
    if (!findText || !result) return;
    const count = getMatchCount();
    if (count === 0) {
      setReplaceMessage(`未找到相符的文字「${findText}」`);
      setTimeout(() => setReplaceMessage(null), 3000);
      return;
    }

    const flags = matchCase ? 'g' : 'gi';
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);
    const newResult = result.replace(regex, replaceText);
    
    updateResult(newResult);
    setReplaceMessage(`已成功一鍵取代 ${count} 處「${findText}」為「${replaceText}」`);
    setTimeout(() => setReplaceMessage(null), 4000);
  };

  const handleReplaceNext = () => {
    if (!findText || !result) return;
    const flags = matchCase ? '' : 'i';
    const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, flags);
    if (!regex.test(result)) {
      setReplaceMessage(`未找到相符的文字「${findText}」`);
      setTimeout(() => setReplaceMessage(null), 3000);
      return;
    }
    const newResult = result.replace(regex, replaceText);
    updateResult(newResult);
    setReplaceMessage(`已取代 1 處「${findText}」`);
    setTimeout(() => setReplaceMessage(null), 3000);
  };

  const exportPDF = async () => {
    if (!result) return;
    
    setIsExporting(true);
    setPdfExported(false);
    setPdfError(null);
    try {
      const isCondensed = reportType === 'condensed';
      const baseTitle = parsedMeetingData?.meta?.title || (isCondensed ? '光洋科高階簡略會議紀錄' : '光洋科會議紀錄分析報告');
      const title = isCondensed && !baseTitle.includes('簡略')
        ? `${baseTitle} (高階簡略版)`
        : baseTitle;
      const date = parsedMeetingData?.meta?.date || new Date().toISOString().slice(0, 10).replace(/-/g, '/');

      await exportMeetingToPdf(result, {
        title,
        date,
        recorder: customRecorder || '吳俊傑',
      });
      
      setPdfExported(true);
      setTimeout(() => setPdfExported(false), 4000);
    } catch (err: any) {
      console.error('PDF導出失敗:', err);
      setPdfError(err?.message || 'PDF 下載時遭遇問題');
      setTimeout(() => setPdfError(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">光洋科PGMBU會議記錄助手</h1>
              <p className="hidden text-xs font-medium text-slate-500 sm:block">Solar Applied Materials PGM BU Minutes Analyst</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Organization Roster Button */}
            <button
              onClick={() => setPersonnelModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-all active:scale-95 shadow-xs"
              title="檢視與自訂組織人物名冊，支援逐字稿同音字、英文名直接自動取代"
            >
              <Users size={15} className="text-blue-600" />
              <span className="hidden sm:inline">組織人物名冊 ({personnelList.length}人)</span>
              <span className="sm:hidden">組織名冊</span>
              <span className="hidden md:inline-flex items-center rounded-full bg-blue-200/80 px-1.5 py-0.2 text-[10px] text-blue-900">
                同音自動校正
              </span>
            </button>

            {/* API Key BYOK Button */}
            <button
              onClick={handleOpenApiKeyModal}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all shadow-xs active:scale-95 border",
                customApiKey
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 animate-pulse"
              )}
              title="設定您個人的 Google Gemini API Key（本系統需自備金鑰）"
            >
              <KeyRound size={15} className={customApiKey ? "text-emerald-600" : "text-amber-600"} />
              <span className="hidden sm:inline">
                {customApiKey ? "自備 Token：已啟用" : "⚠️ 請先設定 API Key"}
              </span>
              <span className="sm:hidden">
                {customApiKey ? "Token 就緒" : "設定 Key"}
              </span>
              {customApiKey && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors hidden lg:flex items-center gap-1"
            >
              <span>免費取得 Key</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* First-time Onboarding Welcome Banner if API Key is not configured */}
        {!customApiKey && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-200">
                  <KeyRound size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-amber-950">
                      初次啟動導引：請先設定個人 Gemini API Key
                    </h2>
                    <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">
                      初次必填
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-amber-800 leading-relaxed max-w-2xl">
                    本系統採用自備金鑰（BYOK）架構，使用您個人或組織的免費 Google Gemini API Key 進行即時會議分析與同音校正。金鑰僅儲存於您的本機瀏覽器。
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:shrink-0">
                <button
                  onClick={handleOpenApiKeyModal}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-200 hover:bg-amber-700 active:scale-95 transition-all"
                >
                  <KeyRound size={15} />
                  <span>立即輸入 API Key</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          
          {/* Input Section */}
          <section className="lg:col-span-12 xl:col-span-5">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    <h2 className="text-lg font-semibold text-slate-800">輸入會議內容</h2>
                  </div>
                  <button 
                    onClick={() => setTranscript("PGM製造處第四季產銷與品管協調會議 2026/08/28\n\n出席人員：歐處長Simon、政傑經理、陳文賢主任、宏毅課長、駿傑課長、詠烈課長、楊永年課長、蕭靜夫課長、偉諭課長\n\nSimon（處長）：大家早，今天我們針對 PGM 製造處近期金銀產線產能與貴金屬精煉品質進行跨部門協調。首先請生產部政傑報告一下進度。\n政傑（經理）：報告處長，光科生產部目前貴金屬製程運作順暢。文賢主任已經針對新機台的參數完成校正。文賢，你下週二前要把詳細的機台確效報告發給品管課。\n文賢：好的，我週二前會寄給偉諭課長審查。\nSimon：很好。金銀化學品課與精煉課的部分呢？\n宏毅（資深課長）：金銀化學品課本月的溶金製程已達標，但硝酸銀結晶純度需要品管再複驗一次。我預計下週四前完成第一批純化作業。\n俊傑（資深課長）：精煉課這邊，上週回收廢料的提煉良率提升到 99.2%。不過精煉爐耐火磚預計下個月需要例行更換，我下週三前會向政傑經理提報採購預算。\n詠烈（資深課長）：金銀產品課目前金條與銀幣加工排單全滿，預計本月底前能全數交貨給客戶。\n永年（資深課長）：生物管一課原物料庫存週轉目前控制在 14 天內，符合 KPI。\n靜夫（資深課長）：生物管二課的成品出貨排程已與業務部對齊，下週起開始執行旺季出貨備案。\n瑋諭（課長）：PGM品管課這邊，針對硝酸銀與精煉金純度檢驗，我們會在收到宏毅送樣後 24 小時內完成 ICP 檢驗報告。\nSimon：很好，請俊傑負責彙整本次會議記錄，並將行動清單列入每週製造處產銷追蹤表。")}
                    className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={13} />
                    <span>載入光洋科範例（含同音/口語）</span>
                  </button>
                </div>
                
                <div className="relative">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="請在此貼上會議逐字稿、錄音轉文字內容或口語筆記..."
                    className="min-h-[380px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 font-sans"
                  />

                  {/* Quick Action Tools on Transcript */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={handleQuickHomophoneFix}
                      disabled={!transcript.trim()}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      title="快速以組織名冊掃描逐字稿，將同音字、英文名及簡稱一鍵更正為正式全名"
                    >
                      <Wand2 size={13} className="text-blue-600" />
                      <span>一鍵同音字/人物校正</span>
                    </button>

                    <button
                      onClick={() => setPersonnelModalOpen(true)}
                      className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <Users size={12} />
                      <span>組織名冊 (共 {personnelList.length} 人)</span>
                    </button>
                  </div>

                  {/* Homophone Fix Notification Toast */}
                  <AnimatePresence>
                    {homophoneFixNotification && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-2 flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md"
                      >
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-300" />
                        <span className="flex-1">{homophoneFixNotification}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-5 space-y-3">
                  {/* Dual Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Full Professional Analysis Button */}
                    <button
                      onClick={() => handleAnalyze('full')}
                      disabled={isAnalyzing || isGeneratingCondensed || !transcript.trim()}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-xl p-3.5 text-center transition-all shadow-md active:scale-[0.98]",
                        isAnalyzing
                          ? "bg-blue-500 text-white cursor-wait"
                          : !transcript.trim()
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                      )}
                      title="生成完整專業會議分析報告，包含詳細背景、8大章節與完整追蹤總表"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        {isAnalyzing ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <FileText size={16} />
                        )}
                        <span>生成完整專業分析</span>
                      </div>
                      <span className="text-[11px] opacity-90 font-normal">
                        {isAnalyzing ? '深度分析中...' : '8大章節 + 8欄追蹤總表'}
                      </span>
                    </button>

                    {/* 4-Dimension Condensed Brief Version Button */}
                    <button
                      onClick={() => handleGenerateCondensed()}
                      disabled={isAnalyzing || isGeneratingCondensed || (!transcript.trim() && !fullResult)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-xl p-3.5 text-center transition-all shadow-md active:scale-[0.98] border",
                        isGeneratingCondensed
                          ? "bg-amber-500 text-white border-amber-600 cursor-wait"
                          : (!transcript.trim() && !fullResult)
                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                          : "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white border-amber-400/30 hover:from-amber-600 hover:to-amber-800 shadow-amber-200"
                      )}
                      title="依據「1.重要性 2.影響金額高 3.短期即可做到 4.影響範圍大」4大維度產出高階簡略版"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                        {isGeneratingCondensed ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : (
                          <Zap size={16} className="fill-white text-amber-100" />
                        )}
                        <span>產出 4 大維度簡略版</span>
                      </div>
                      <span className="text-[11px] opacity-90 font-normal">
                        {isGeneratingCondensed ? '精粹四大維度中...' : '高階主管速覽 • 決策矩陣'}
                      </span>
                    </button>
                  </div>

                  {/* Condensed Dimensions Indicator Tag Strip */}
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-2.5 text-xs text-amber-950">
                    <div className="flex items-center justify-between font-bold mb-1.5 text-[11px] text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <Zap size={13} className="text-amber-600 fill-amber-600" />
                        簡略版 4 大關鍵萃取要求：
                      </span>
                      <span className="text-[10px] text-amber-700/90 font-semibold bg-amber-100/90 px-1.5 py-0.5 rounded">去蕪存菁速覽</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        <strong>1. 重要性高</strong> (核心方針/合規)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        <strong>2. 影響金額高</strong> (大額預算/貴金屬)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <strong>3. 短期即可做到</strong> (1~2週速見效)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        <strong>4. 影響範圍大</strong> (跨部協同/全稼動)
                      </span>
                    </div>
                  </div>

                  {/* Token Source Indicator */}
                  <div className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2.5 border text-xs transition-colors",
                    customApiKey
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  )}>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-2.5 w-2.5 rounded-full shrink-0",
                        customApiKey ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                      )} />
                      <span>
                        {customApiKey ? (
                          <>金鑰狀態：<strong>已啟用個人 Token (BYOK)</strong></>
                        ) : (
                          <strong className="text-amber-800">⚠️ 尚未設定個人 API Key（需填寫才能分析）</strong>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={handleOpenApiKeyModal}
                      className={cn(
                        "font-semibold text-[11px] underline cursor-pointer",
                        customApiKey ? "text-emerald-700 hover:text-emerald-900" : "text-amber-800 hover:text-amber-950 font-bold"
                      )}
                    >
                      {customApiKey ? "變更金鑰" : "立即填寫 Key"}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs font-medium text-red-700 border border-red-200"
                  >
                    <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p>{error}</p>
                      {!customApiKey && (
                        <button
                          onClick={handleOpenApiKeyModal}
                          className="font-bold underline text-red-800 hover:text-red-950 block text-xs mt-1 cursor-pointer"
                        >
                          👉 點此立即開啟 API Key 設定視窗
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Organization Quick Roster Card */}
              <div className="rounded-xl border border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-slate-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Users size={15} className="text-blue-600" />
                    <span>已套用之組織人物同音取代庫</span>
                  </h3>
                  <button
                    onClick={() => setPersonnelModalOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    管理人物名冊
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {personnelList.map((p) => (
                    <span
                      key={p.id}
                      onClick={() => setPersonnelModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:border-blue-400 hover:text-blue-700 cursor-pointer transition-colors"
                      title={`${p.department} - ${p.title} (包含同音字: ${p.aliases.join('、')})`}
                    >
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({p.title})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Results Section */}
          <section className="lg:col-span-12 xl:col-span-7" ref={resultRef}>
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl transition-colors shadow-xs",
                        reportType === 'condensed'
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-600"
                      )}>
                        {reportType === 'condensed' ? <Zap size={22} className="fill-amber-500 text-amber-600" /> : <Target size={22} />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-800">
                            {reportType === 'condensed' ? '高階簡略版會議紀錄' : '完整專業會議報告'}
                          </h2>

                          {/* Report Type Tabs */}
                          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
                            <button
                              onClick={() => handleSwitchReportType('full')}
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer",
                                reportType === 'full'
                                  ? "bg-white text-blue-700 shadow-xs"
                                  : "text-slate-600 hover:text-slate-900"
                              )}
                              title="檢視包含8大章節與完整追蹤總表之完整報告"
                            >
                              <FileText size={13} />
                              <span>完整版</span>
                            </button>
                            <button
                              onClick={() => handleSwitchReportType('condensed')}
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition-all cursor-pointer",
                                reportType === 'condensed'
                                  ? "bg-amber-600 text-white shadow-xs font-bold"
                                  : "text-slate-600 hover:text-amber-800"
                              )}
                              title="檢視依據重要性、高額財務影響、短期可行、影響範圍大提煉之高階簡略版"
                            >
                              <Zap size={13} className={reportType === 'condensed' ? "fill-white" : "text-amber-600"} />
                              <span>4大維度簡略版</span>
                              {condensedResult && reportType !== 'condensed' && (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              )}
                            </button>
                          </div>

                          {result !== originalResult && (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              已人工編修
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {reportType === 'condensed'
                            ? '嚴格聚焦「重要性、高額財務影響、短期可行、跨部門範圍」四大維度速覽'
                            : '已自動執行組織人物與同音校正，可直接導出標準 Excel 或 PDF 報告'}
                        </p>
                      </div>
                    </div>

                    {/* View mode switcher & Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                        <button
                          onClick={() => setViewMode('preview')}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                            viewMode === 'preview'
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                          title="預覽模式"
                        >
                          <Eye size={14} />
                          <span>預覽</span>
                        </button>
                        <button
                          onClick={() => setViewMode('edit')}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                            viewMode === 'edit'
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                          title="編輯模式"
                        >
                          <Pencil size={14} />
                          <span>編輯</span>
                        </button>
                        <button
                          onClick={() => setViewMode('split')}
                          className={cn(
                            "hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                            viewMode === 'split'
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                          title="雙頁對照"
                        >
                          <Columns size={14} />
                          <span>對照</span>
                        </button>
                      </div>

                      <button
                        onClick={() => setShowFindReplace(!showFindReplace)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition-all active:scale-95",
                          showFindReplace
                            ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20 font-bold"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                        )}
                        title="尋找與全部取代文字"
                      >
                        <Replace size={14} />
                        <span>尋找取代</span>
                        {findText && getMatchCount() > 0 && (
                          <span className="ml-0.5 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                            {getMatchCount()}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all active:scale-95"
                        title="複製 Markdown 內文"
                      >
                        {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        <span>{copied ? '已複製' : '複製'}</span>
                      </button>

                      {result !== originalResult && (
                        <button
                          onClick={handleReset}
                          className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs font-semibold text-amber-700 shadow-sm hover:bg-amber-100 transition-all active:scale-95"
                          title="還原成 AI 原始輸出"
                        >
                          <RotateCcw size={14} />
                          <span>還原</span>
                        </button>
                      )}

                      <button
                        onClick={handleExportExcel}
                        disabled={isExcelExporting}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                        title="將執行項目、待釐清問題與風險與阻礙匯出為 Excel 活頁簿"
                      >
                        {isExcelExporting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : excelExported ? (
                          <Check size={14} className="text-white" />
                        ) : (
                          <FileSpreadsheet size={14} />
                        )}
                        <span>{isExcelExporting ? '生成中...' : excelExported ? '已下載 Excel' : '導出 Excel'}</span>
                      </button>

                      <button
                        onClick={exportPDF}
                        disabled={isExporting}
                        className={cn(
                          "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-md transition-all active:scale-95 disabled:opacity-50",
                          pdfExported
                            ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
                            : "bg-blue-600 shadow-blue-200 hover:bg-blue-700"
                        )}
                        title="將會議紀錄完整分析報告自動下載為 PDF 檔案"
                      >
                        {isExporting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : pdfExported ? (
                          <Check size={14} className="text-white" />
                        ) : (
                          <Download size={14} />
                        )}
                        <span>{isExporting ? '生成中...' : pdfExported ? '已下載 PDF' : '下載 PDF'}</span>
                      </button>
                    </div>
                  </div>

                  {pdfError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={15} className="text-amber-600 shrink-0" />
                        <span>{pdfError}</span>
                      </div>
                      <button 
                        onClick={() => setPdfError(null)}
                        className="text-amber-600 hover:text-amber-800 font-bold ml-2"
                      >
                        關閉
                      </button>
                    </div>
                  )}

                  {/* Condensed 4-Dimension Mode Status Banner */}
                  {reportType === 'condensed' && (
                    <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 p-3.5 text-xs text-amber-950 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-200 text-amber-900 font-bold">
                            <Zap size={14} className="fill-amber-700 text-amber-800" />
                          </span>
                          <span className="font-bold text-amber-950 text-sm">4 大核心維度精粹模式已啟用</span>
                        </div>
                        <button
                          onClick={handleGenerateCondensed}
                          disabled={isGeneratingCondensed}
                          className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer bg-white/90 px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs transition-colors"
                          title="依據最新逐字稿或完整版重新提煉四大維度"
                        >
                          {isGeneratingCondensed ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                          <span>{isGeneratingCondensed ? '正在精粹中...' : '重新提煉簡略版'}</span>
                        </button>
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-amber-200/80 text-[11px]">
                        <div className="flex items-center gap-1.5 bg-white/80 rounded-md px-2 py-1 border border-amber-200/60 shadow-2xs">
                          <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                          <span><strong>1. 重要性高</strong> (核心方針)</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/80 rounded-md px-2 py-1 border border-amber-200/60 shadow-2xs">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <span><strong>2. 影響金額高</strong> (重大損益)</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/80 rounded-md px-2 py-1 border border-amber-200/60 shadow-2xs">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span><strong>3. 短期可行</strong> (Quick Wins)</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/80 rounded-md px-2 py-1 border border-amber-200/60 shadow-2xs">
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span><strong>4. 影響範圍大</strong> (跨部協同)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Interactive Meeting Tracking Tables Manager with Keep/Delete & Excel Export */}
                  {parsedMeetingData && (
                    <TrackingTablesManager
                      meta={parsedMeetingData.meta}
                      personnelList={personnelList}
                      customRecorder={customRecorder}
                      setCustomRecorder={setCustomRecorder}
                      trackingItems={trackingItems}
                      setTrackingItems={setTrackingItems}
                      clarificationItems={clarificationItems}
                      setClarificationItems={setClarificationItems}
                      riskItems={riskItems}
                      setRiskItems={setRiskItems}
                      includeTrackingTable={includeTrackingTable}
                      setIncludeTrackingTable={setIncludeTrackingTable}
                      includeClarificationTable={includeClarificationTable}
                      setIncludeClarificationTable={setIncludeClarificationTable}
                      includeRiskTable={includeRiskTable}
                      setIncludeRiskTable={setIncludeRiskTable}
                      onExportExcel={handleExportExcel}
                      isExcelExporting={isExcelExporting}
                      excelExported={excelExported}
                      onResetToDefault={handleResetTablesToDefault}
                    />
                  )}

                  {/* Main Display Area */}
                  <div className="space-y-4">
                    {/* Standalone Find and Replace Panel */}
                    <AnimatePresence>
                      {showFindReplace && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="overflow-hidden rounded-2xl border border-blue-200 bg-white p-4 shadow-lg ring-1 ring-blue-500/10"
                        >
                          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-bold">
                                <Replace size={14} />
                              </span>
                              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                                全文尋找與批量取代
                              </h3>
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-100">
                                實時套用至文件
                              </span>
                            </div>
                            <button 
                              onClick={() => setShowFindReplace(false)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                              title="關閉尋找面板"
                            >
                              <X size={15} />
                            </button>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {/* Find Input */}
                            <div className="relative flex-1">
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">尋找文字 (Find)</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                                  <Search size={14} />
                                </div>
                                <input
                                  type="text"
                                  value={findText}
                                  onChange={(e) => setFindText(e.target.value)}
                                  placeholder="請輸入欲尋找的關鍵字..."
                                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-20 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                {findText && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-slate-200/90 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                    {getMatchCount()} 處相符
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Replace Input */}
                            <div className="relative flex-1">
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">取代為 (Replace With)</label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                                  <Replace size={14} />
                                </div>
                                <input
                                  type="text"
                                  value={replaceText}
                                  onChange={(e) => setReplaceText(e.target.value)}
                                  placeholder="取代後的新文字 (留空則刪除)"
                                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-end gap-2 pt-5 sm:pt-0">
                              <button
                                onClick={handleReplaceAll}
                                disabled={!findText.trim() || getMatchCount() === 0}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all whitespace-nowrap",
                                  !findText.trim() || getMatchCount() === 0
                                    ? "bg-slate-300 shadow-none cursor-not-allowed opacity-60"
                                    : "bg-blue-600 shadow-blue-200 hover:bg-blue-700 active:scale-95"
                                )}
                                title="一鍵將會議記錄中所有相符的文字全數替換"
                              >
                                <Replace size={13} />
                                一鍵全部取代
                              </button>

                              <button
                                onClick={handleReplaceNext}
                                disabled={!findText.trim() || getMatchCount() === 0}
                                className={cn(
                                  "rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all whitespace-nowrap shadow-xs",
                                  !findText.trim() || getMatchCount() === 0
                                    ? "border-slate-200 text-slate-300 cursor-not-allowed opacity-60"
                                    : "border-slate-300 hover:bg-slate-50 active:scale-95"
                                )}
                                title="僅取代第一個出現的目標文字"
                              >
                                取代單次
                              </button>
                            </div>
                          </div>

                          {/* Options & Feedback Message */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-[11px]">
                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none hover:text-slate-900 font-medium">
                              <input
                                type="checkbox"
                                checked={matchCase}
                                onChange={(e) => setMatchCase(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>大小寫須完全相符 (Match Case)</span>
                            </label>

                            {replaceMessage && (
                              <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs animate-pulse">
                                {replaceMessage}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Toolbar when editing */}
                    {(viewMode === 'edit' || viewMode === 'split') && (
                      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="px-2 font-semibold text-slate-500">快捷格式工具：</span>
                            <button
                              onClick={() => insertMarkdownSnippet('## ')}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            >
                              <Heading size={13} /> 標題
                            </button>
                            <button
                              onClick={() => insertMarkdownSnippet('**', '**')}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            >
                              <Bold size={13} /> 粗體
                            </button>
                            <button
                              onClick={() => insertMarkdownSnippet('- ')}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            >
                              <List size={13} /> 列表
                            </button>
                            <button
                              onClick={() => insertMarkdownSnippet('\n| 項目 | 說明 | 負責人 |\n|---|---|---|\n|  |  |  |\n')}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            >
                              <Table size={13} /> 表格
                            </button>

                            <div className="mx-1 h-4 w-px bg-slate-300" />

                            <button
                              onClick={() => setShowFindReplace(!showFindReplace)}
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium transition-all shadow-sm",
                                showFindReplace
                                  ? "border-blue-500 bg-blue-100 text-blue-700 font-semibold ring-2 ring-blue-500/20"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                              )}
                            >
                              <Search size={13} />
                              <span>尋找與取代</span>
                              {findText && getMatchCount() > 0 && (
                                <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white font-bold leading-none">
                                  {getMatchCount()}
                                </span>
                              )}
                            </button>
                          </div>
                          
                          {viewMode === 'edit' && (
                            <button
                              onClick={() => setViewMode('preview')}
                              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                            >
                              <Eye size={13} /> 完成編輯並預覽
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className={cn(
                      "grid gap-6",
                      viewMode === 'split' ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                    )}>
                      {/* Editor Column */}
                      {(viewMode === 'edit' || viewMode === 'split') && (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                            <span className="flex items-center gap-1"><Pencil size={12} /> Markdown 文字編輯器</span>
                            <span>{result.length} 字</span>
                          </div>
                          <textarea
                            ref={editTextareaRef}
                            value={result}
                            onChange={(e) => updateResult(e.target.value)}
                            placeholder="在此編輯會議紀錄 Markdown 文字..."
                            className="min-h-[550px] w-full resize-y rounded-2xl border border-slate-300 bg-slate-900 p-5 font-mono text-sm leading-relaxed text-slate-100 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                          />
                        </div>
                      )}

                      {/* Preview Column */}
                      {(viewMode === 'preview' || viewMode === 'split') && (
                        <div className="flex flex-col space-y-2">
                          {viewMode === 'split' && (
                            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                              <span className="flex items-center gap-1"><Eye size={12} /> 即時排版預覽</span>
                              <span className="text-blue-600 font-semibold">雙向同步</span>
                            </div>
                          )}
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" ref={pdfContentRef}>
                            <div className="prose prose-slate max-w-none p-8 sm:p-12 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:pb-4 prose-h2:border-b prose-h2:border-slate-100 prose-p:text-lg prose-p:leading-relaxed prose-table:border-collapse prose-li:text-slate-700">
                              <div className="markdown-body">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    table: ({ children }) => (
                                      <div className="my-6 w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                                        <table className="w-full divide-y divide-slate-200 text-left border-collapse">
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    th: ({ children }) => (
                                      <th className="bg-slate-50/90 px-3.5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700 backdrop-blur-sm border-b border-slate-200">
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children }) => (
                                      <td className="whitespace-normal px-3.5 py-2.5 text-sm text-slate-600 border-t border-slate-100">
                                        {children}
                                      </td>
                                    ),
                                  }}
                                >
                                  {result}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats/Info */}
                  <div className="flex items-center justify-between text-xs text-slate-400 px-2 pt-2 border-t border-slate-100">
                    <p>由 Gemini AI 生成與人工修訂 • 具備光洋科PGMBU同音字校正</p>
                    <p>分析完成時間: {new Date().toLocaleTimeString()}</p>
                  </div>
                </motion.div>
              ) : reportType === 'condensed' && !condensedResult ? (
                <div className="flex min-h-[550px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
                    <Zap size={32} className="fill-amber-500 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">尚未產出高階簡略版會議紀錄</h2>
                  <p className="mt-2 max-w-md text-sm text-slate-600 leading-relaxed">
                    簡略版專為高階決策速覽設計，依據您設定的四大標準自動去蕪存菁：
                  </p>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg w-full text-left">
                    <div className="rounded-xl bg-white p-3 border border-amber-200/80 shadow-xs flex items-start gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700 font-bold text-xs shrink-0 mt-0.5">1</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">重要性 (Critical Importance)</p>
                        <p className="text-[11px] text-slate-500">聚焦關鍵方針決議、客戶承諾與不可妥協底線</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-amber-200/80 shadow-xs flex items-start gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold text-xs shrink-0 mt-0.5">2</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">影響金額高 (High Financial Impact)</p>
                        <p className="text-[11px] text-slate-500">提煉高額採購、貴金屬成本與重大損益影響</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-amber-200/80 shadow-xs flex items-start gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs shrink-0 mt-0.5">3</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">短期即可做到 (Quick Wins)</p>
                        <p className="text-[11px] text-slate-500">鎖定1~2週內低阻礙、可快速推進見效的項目</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-amber-200/80 shadow-xs flex items-start gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-xs shrink-0 mt-0.5">4</span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">影響範圍大 (Wide Scope of Impact)</p>
                        <p className="text-[11px] text-slate-500">關注跨部協同、全產線稼動或關鍵客戶驗證</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={handleGenerateCondensed}
                      disabled={isGeneratingCondensed || (!transcript.trim() && !fullResult)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer",
                        isGeneratingCondensed || (!transcript.trim() && !fullResult)
                          ? "bg-slate-300 shadow-none cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-200"
                      )}
                    >
                      {isGeneratingCondensed ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>正在依 4 大維度萃取簡略版...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={15} className="fill-white" />
                          <span>⚡ 立即產出 4 大維度簡略版</span>
                        </>
                      )}
                    </button>

                    {fullResult && (
                      <button
                        onClick={() => handleSwitchReportType('full')}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
                      >
                        返回完整專業版
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-[600px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                    <History size={40} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-400">尚未產生分析報告</h2>
                  <p className="mt-2 max-w-xs text-sm text-slate-400">
                    在左側貼上內容並點擊「生成完整專業分析」或「產出 4 大維度簡略版」，這裡將即時顯示結構化成果。
                  </p>
                  
                  <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl">
                    <div className="rounded-xl bg-white p-3.5 text-left shadow-sm border border-slate-100">
                      <div className="mb-1.5 text-blue-600"><Users size={18} /></div>
                      <p className="text-xs font-bold text-slate-700">人物同音自動校正</p>
                      <p className="mt-1 text-[11px] text-slate-400 leading-normal">Simon、駿傑、政傑等自動替換為正式姓名</p>
                    </div>
                    <div className="rounded-xl bg-white p-3.5 text-left shadow-sm border border-amber-100">
                      <div className="mb-1.5 text-amber-600"><Zap size={18} className="fill-amber-500" /></div>
                      <p className="text-xs font-bold text-slate-700">4大維度高階簡略版</p>
                      <p className="mt-1 text-[11px] text-slate-400 leading-normal">重要性、金額高、短期可行、影響範圍大</p>
                    </div>
                    <div className="rounded-xl bg-white p-3.5 text-left shadow-sm border border-slate-100">
                      <div className="mb-1.5 text-emerald-600"><FileSpreadsheet size={18} /></div>
                      <p className="text-xs font-bold text-slate-700">標準 8 欄 Excel 導出</p>
                      <p className="mt-1 text-[11px] text-slate-400 leading-normal">依據官方追蹤範本產生精美活頁簿</p>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-slate-700 tracking-wide uppercase">
              凱莫智策有限公司
            </p>
            <p className="text-xs font-medium text-slate-400">
              © {new Date().getFullYear()} 光洋科PGMBU會議記錄助手 • 提升團隊協作與專案追蹤效率 
            </p>
          </div>
        </div>
      </footer>

      {/* Personnel Modal */}
      <PersonnelModal
        isOpen={personnelModalOpen}
        onClose={() => setPersonnelModalOpen(false)}
        personnelList={personnelList}
        onSavePersonnel={handleSavePersonnel}
        onResetPersonnel={handleResetPersonnel}
      />

      {/* API Key (BYOK) Settings Modal */}
      <AnimatePresence>
        {apiKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setApiKeyModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border",
                    !customApiKey ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {!customApiKey ? "初次啟動設定：請輸入個人 API Key" : "Gemini API Key 設定 (自備金鑰)"}
                      </h3>
                      {!customApiKey && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          首次必填
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {!customApiKey
                        ? "本系統需填入您個人的 Google Gemini API Key 方可啟用會議記錄分析"
                        : "金鑰僅儲存於您個人的本機瀏覽器，不會上傳伺服器"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setApiKeyModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="mt-5 space-y-4 text-xs leading-relaxed text-slate-600">
                {/* 3-step Quick Setup Guide */}
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Sparkles size={15} className="text-amber-500" />
                      3 步驟快速取得免費 Key：
                    </span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline text-[11px]"
                    >
                      <span>前往 Google AI Studio 申請</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-0.5">
                    <li>前往 Google AI Studio 並以 Google 帳號登入</li>
                    <li>點擊「<strong>Get API key</strong>」或「<strong>Create API key</strong>」複製金鑰</li>
                    <li>將金鑰貼入下方欄位並點擊「儲存」即可開始使用</li>
                  </ol>
                </div>

                <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-200/70 flex items-start gap-2 text-emerald-900">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-normal text-emerald-800">
                    <strong>安全與隱私承諾：</strong>API Key 僅存放於您個人的瀏覽器（<code>localStorage</code>），所有 AI 請求直接對接 Google 官方服務，絕不留存於第三方伺服器。
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Google Gemini API Key</span>
                    {customApiKey && (
                      <span className="text-[11px] font-normal text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        目前已配置
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showKeyText ? "text" : "password"}
                      value={tempApiKey}
                      onChange={(e) => {
                        setTempApiKey(e.target.value);
                        if (apiKeyInputError) setApiKeyInputError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveApiKey();
                        }
                      }}
                      placeholder="貼上您的 API Key (例如：AIzaSy...)"
                      className={cn(
                        "w-full rounded-xl border bg-white py-2.5 pl-3.5 pr-20 text-xs font-mono transition-all focus:outline-none focus:ring-4 placeholder:text-slate-400 placeholder:font-sans",
                        apiKeyInputError
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                      )}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowKeyText(!showKeyText)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title={showKeyText ? "隱藏金鑰" : "顯示金鑰"}
                      >
                        {showKeyText ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {apiKeyInputError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-center gap-2"
                  >
                    <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                    <span>{apiKeyInputError}</span>
                  </motion.div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                  >
                    <span>免費申請 API Key (Google AI Studio)</span>
                    <ExternalLink size={12} />
                  </a>

                  {customApiKey && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="inline-flex items-center gap-1 font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>清除金鑰</span>
                    </button>
                  )}
                </div>

                {keySavedNotification && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center text-emerald-800 font-medium flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={15} className="text-emerald-600" />
                    <span>{keySavedNotification}</span>
                  </motion.div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApiKeyModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {customApiKey ? "關閉" : "稍後設定"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  <Save size={14} />
                  <span>{!customApiKey ? "儲存並開始使用" : "儲存設定"}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
