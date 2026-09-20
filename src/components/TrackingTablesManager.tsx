import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Trash2, 
  RotateCcw, 
  Plus, 
  Check, 
  CheckSquare, 
  Square, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  ListTodo,
  Layers,
  Sparkles,
  User,
  Calendar,
  Filter,
  Undo2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MeetingTrackingItem, MeetingMeta, FormattedMeetingData } from '../utils/excelExport';
import { OrganizationPerson } from '../data/organizationPersonnel';
import { PersonnelMultiSelect } from './PersonnelMultiSelect';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TrackingItemWithState extends MeetingTrackingItem {
  isExcluded?: boolean;
}

interface TrackingTablesManagerProps {
  meta: MeetingMeta;
  personnelList: OrganizationPerson[];
  customRecorder: string;
  setCustomRecorder: (val: string) => void;
  // Tables state
  trackingItems: TrackingItemWithState[];
  setTrackingItems: React.Dispatch<React.SetStateAction<TrackingItemWithState[]>>;
  clarificationItems: TrackingItemWithState[];
  setClarificationItems: React.Dispatch<React.SetStateAction<TrackingItemWithState[]>>;
  riskItems: TrackingItemWithState[];
  setRiskItems: React.Dispatch<React.SetStateAction<TrackingItemWithState[]>>;
  // Sheet-level inclusion
  includeTrackingTable: boolean;
  setIncludeTrackingTable: (val: boolean) => void;
  includeClarificationTable: boolean;
  setIncludeClarificationTable: (val: boolean) => void;
  includeRiskTable: boolean;
  setIncludeRiskTable: (val: boolean) => void;
  // Export trigger
  onExportExcel: () => Promise<void>;
  isExcelExporting: boolean;
  excelExported: boolean;
  // Restore all from raw AI result
  onResetToDefault?: () => void;
}

export function TrackingTablesManager({
  meta,
  personnelList,
  customRecorder,
  setCustomRecorder,
  trackingItems,
  setTrackingItems,
  clarificationItems,
  setClarificationItems,
  riskItems,
  setRiskItems,
  includeTrackingTable,
  setIncludeTrackingTable,
  includeClarificationTable,
  setIncludeClarificationTable,
  includeRiskTable,
  setIncludeRiskTable,
  onExportExcel,
  isExcelExporting,
  excelExported,
  onResetToDefault,
}: TrackingTablesManagerProps) {
  const [activeTab, setActiveTab] = useState<'tracking' | 'clarification' | 'risk'>('tracking');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showExcludedRows, setShowExcludedRows] = useState(true);
  const [lastActionNotification, setLastActionNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setLastActionNotification(msg);
    setTimeout(() => setLastActionNotification(null), 3500);
  };

  // Helper getters for active table
  const getActiveTableConfig = () => {
    switch (activeTab) {
      case 'tracking':
        return {
          title: '會議記錄追蹤表',
          subTitle: '執行項目 Action Items 與決議工作追蹤',
          isIncluded: includeTrackingTable,
          setIsIncluded: setIncludeTrackingTable,
          items: trackingItems,
          setItems: setTrackingItems,
          icon: <ListTodo size={18} className="text-blue-600" />,
          color: 'blue',
          defaultSummary: '新執行工作項目',
        };
      case 'clarification':
        return {
          title: '待釐清問題追蹤',
          subTitle: '待確認事項、跨部門協商與疑問追蹤',
          isIncluded: includeClarificationTable,
          setIsIncluded: setIncludeClarificationTable,
          items: clarificationItems,
          setItems: setClarificationItems,
          icon: <HelpCircle size={18} className="text-amber-600" />,
          color: 'amber',
          defaultSummary: '【待釐清】新待釐清問題',
        };
      case 'risk':
        return {
          title: '風險與阻礙追蹤',
          subTitle: '潛在風險、瓶頸問題與因應措施追蹤',
          isIncluded: includeRiskTable,
          setIsIncluded: setIncludeRiskTable,
          items: riskItems,
          setItems: setRiskItems,
          icon: <ShieldAlert size={18} className="text-rose-600" />,
          color: 'rose',
          defaultSummary: '【風險阻礙】新風險項目',
        };
    }
  };

  const activeConfig = getActiveTableConfig();
  const currentItems = activeConfig.items;
  const activeCount = currentItems.filter(i => !i.isExcluded).length;
  const excludedCount = currentItems.filter(i => i.isExcluded).length;

  // Toggle single item's keep/delete (include/exclude) state
  const handleToggleItem = (id: number) => {
    activeConfig.setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const willExclude = !item.isExcluded;
          showNotification(willExclude ? `已將第 ${id} 項設為「刪除/排除」` : `已將第 ${id} 項設為「留下/保留」`);
          return { ...item, isExcluded: willExclude };
        }
        return item;
      })
    );
  };

  // Permanently delete a row
  const handleDeleteItemPermanently = (id: number) => {
    activeConfig.setItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      // Re-index remaining
      return filtered.map((item, idx) => ({ ...item, id: idx + 1 }));
    });
    showNotification(`已徹底移除第 ${id} 項`);
  };

  // Batch actions on current table
  const handleKeepAll = () => {
    activeConfig.setItems(prev => prev.map(item => ({ ...item, isExcluded: false })));
    activeConfig.setIsIncluded(true);
    showNotification(`已將「${activeConfig.title}」全部 ${currentItems.length} 項設為「留下」`);
  };

  const handleDeleteAll = () => {
    activeConfig.setItems(prev => prev.map(item => ({ ...item, isExcluded: true })));
    showNotification(`已將「${activeConfig.title}」所有項目設為「刪除/排除」`);
  };

  const handleAddNewRow = () => {
    const newId = currentItems.length + 1;
    const newItem: TrackingItemWithState = {
      id: newId,
      date: meta.date || new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      summary: activeConfig.defaultSummary,
      owner: personnelList[0]?.name || '負責人員',
      estimatedDate: '待確認',
      trackingStatus: '進行中',
      isCompleted: '',
      isFollowUp: 'V',
      isExcluded: false,
    };
    activeConfig.setItems(prev => [...prev, newItem]);
    activeConfig.setIsIncluded(true);
    showNotification(`已新增第 ${newId} 筆項目`);
  };

  // Update item field
  const handleUpdateItemField = (id: number, field: keyof MeetingTrackingItem, value: any) => {
    activeConfig.setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Quick stats summary
  const keptTrackingCount = trackingItems.filter(i => !i.isExcluded).length;
  const keptClarificationCount = clarificationItems.filter(i => !i.isExcluded).length;
  const keptRiskCount = riskItems.filter(i => !i.isExcluded).length;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-white shadow-md ring-1 ring-blue-500/10">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-blue-50/50 p-4 sm:p-5 border-b border-blue-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
                <FileSpreadsheet size={18} />
              </span>
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                會議追蹤表管理與 Excel 導出
              </h3>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
                支援留下/刪除自選
              </span>
            </div>
            <p className="text-xs text-slate-600 pl-10 leading-relaxed">
              點擊「<strong>留下</strong>」或「<strong>刪除</strong>」按鈕自由選擇欲保留的項目與表格，系統將精準輸出標準 8 欄光洋科 Excel 活頁簿。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onResetToDefault && (
              <button
                onClick={onResetToDefault}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-all active:scale-95"
                title="還原所有追蹤表至 AI 初次分析狀態"
              >
                <RotateCcw size={13} />
                <span>還原預設</span>
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-xs hover:bg-blue-50 transition-all active:scale-95"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{isExpanded ? '收合管理面板' : '展開管理面板'}</span>
            </button>

            <button
              onClick={onExportExcel}
              disabled={isExcelExporting}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              title="僅匯出標記為「留下」的追蹤表與項目"
            >
              {isExcelExporting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : excelExported ? (
                <Check size={16} />
              ) : (
                <Download size={16} />
              )}
              <span>{excelExported ? '已成功下載 Excel' : '匯出已選表格 (.xlsx)'}</span>
            </button>
          </div>
        </div>

        {/* Global Meta & Recorder Selection */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-blue-100 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="font-bold text-slate-900">會議主題：</span>
              <span className="rounded-md bg-white px-2 py-0.5 font-semibold text-slate-800 border border-slate-200 shadow-2xs">
                {meta.title}＋會議記錄
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="font-bold text-slate-900">會議日期：</span>
              <span className="rounded-md bg-white px-2 py-0.5 font-medium text-slate-800 border border-slate-200">
                {meta.date}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="font-bold text-slate-900">記錄人員：</span>
              <select
                value={customRecorder}
                onChange={(e) => setCustomRecorder(e.target.value)}
                className="rounded-md border border-blue-300 bg-white px-2 py-0.5 text-xs font-bold text-blue-700 shadow-2xs focus:border-blue-500 focus:outline-none"
              >
                {personnelList.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} ({p.title})
                  </option>
                ))}
                {!personnelList.some(p => p.name === customRecorder) && (
                  <option value={customRecorder}>{customRecorder}</option>
                )}
              </select>
            </div>
          </div>

          {/* Sheet Export Status Badges */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-medium text-slate-500">預計匯出分頁：</span>
            {includeTrackingTable && keptTrackingCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 font-bold text-blue-800">
                會議追蹤 ({keptTrackingCount})
              </span>
            )}
            {includeClarificationTable && keptClarificationCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                待釐清 ({keptClarificationCount})
              </span>
            )}
            {includeRiskTable && keptRiskCount > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 font-bold text-rose-800">
                風險阻礙 ({keptRiskCount})
              </span>
            )}
            {(!includeTrackingTable || keptTrackingCount === 0) &&
             (!includeClarificationTable || keptClarificationCount === 0) &&
             (!includeRiskTable || keptRiskCount === 0) && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-800">
                ⚠️ 目前未勾選任何有效項目
              </span>
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Notification Toast */}
          <AnimatePresence>
            {lastActionNotification && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-semibold text-white shadow-md"
              >
                <Sparkles size={14} className="text-amber-300 shrink-0" />
                <span className="flex-1">{lastActionNotification}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table Selector Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Tab 1: 會議記錄追蹤表 */}
              <button
                onClick={() => setActiveTab('tracking')}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 border",
                  activeTab === 'tracking'
                    ? "border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <ListTodo size={15} className={activeTab === 'tracking' ? "text-blue-600" : "text-slate-400"} />
                <span>會議記錄追蹤表</span>
                <span className={cn(
                  "rounded-full px-2 py-0.2 text-[11px] font-extrabold",
                  includeTrackingTable && keptTrackingCount > 0
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-600"
                )}>
                  留下 {keptTrackingCount} / {trackingItems.length}
                </span>
              </button>

              {/* Tab 2: 待釐清問題追蹤 */}
              <button
                onClick={() => setActiveTab('clarification')}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 border",
                  activeTab === 'clarification'
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <HelpCircle size={15} className={activeTab === 'clarification' ? "text-amber-600" : "text-slate-400"} />
                <span>待釐清問題追蹤</span>
                <span className={cn(
                  "rounded-full px-2 py-0.2 text-[11px] font-extrabold",
                  includeClarificationTable && keptClarificationCount > 0
                    ? "bg-amber-600 text-white"
                    : "bg-slate-200 text-slate-600"
                )}>
                  留下 {keptClarificationCount} / {clarificationItems.length}
                </span>
              </button>

              {/* Tab 3: 風險與阻礙追蹤 */}
              <button
                onClick={() => setActiveTab('risk')}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 border",
                  activeTab === 'risk'
                    ? "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <ShieldAlert size={15} className={activeTab === 'risk' ? "text-rose-600" : "text-slate-400"} />
                <span>風險與阻礙追蹤</span>
                <span className={cn(
                  "rounded-full px-2 py-0.2 text-[11px] font-extrabold",
                  includeRiskTable && keptRiskCount > 0
                    ? "bg-rose-600 text-white"
                    : "bg-slate-200 text-slate-600"
                )}>
                  留下 {keptRiskCount} / {riskItems.length}
                </span>
              </button>
            </div>

            {/* Switch to show/hide excluded rows */}
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={showExcludedRows}
                  onChange={(e) => setShowExcludedRows(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>顯示已刪除項目 ({excludedCount})</span>
              </label>
            </div>
          </div>

          {/* Active Table Control Bar (留下此表 vs 刪除此表 & 批次按鈕) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Table Level Keep/Delete Switch */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {activeConfig.icon}
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{activeConfig.title}</h4>
                  <p className="text-[11px] text-slate-500">{activeConfig.subTitle}</p>
                </div>
              </div>

              {/* Major Button: 留下此表 / 刪除此表 */}
              <div className="flex items-center rounded-xl bg-white p-1 border border-slate-300 shadow-2xs">
                <button
                  onClick={() => {
                    activeConfig.setIsIncluded(true);
                    showNotification(`已設定在 Excel 中「留下」${activeConfig.title}`);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    activeConfig.isIncluded
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                  title="在 Excel 匯出中包含此工作表"
                >
                  <Check size={13} />
                  <span>留下此表</span>
                </button>
                <button
                  onClick={() => {
                    activeConfig.setIsIncluded(false);
                    showNotification(`已將 ${activeConfig.title} 設為「刪除/排除」，將不匯出此分頁`);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                    !activeConfig.isIncluded
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                  title="在 Excel 匯出中排除/刪除此工作表"
                >
                  <Trash2 size={13} />
                  <span>刪除/不匯出此表</span>
                </button>
              </div>
            </div>

            {/* Row Batch Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleKeepAll}
                className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                title="將本表所有項目全數標記為留下"
              >
                <CheckSquare size={13} className="text-emerald-700" />
                <span>全選留下</span>
              </button>

              <button
                onClick={handleDeleteAll}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs"
                title="將本表所有項目全數標記為刪除"
              >
                <Trash2 size={13} className="text-rose-600" />
                <span>全部刪除</span>
              </button>

              <button
                onClick={handleAddNewRow}
                className="flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
                title="新增一筆空白追蹤項目"
              >
                <Plus size={13} className="text-blue-600" />
                <span>新增項目</span>
              </button>
            </div>
          </div>

          {!activeConfig.isIncluded && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>此表目前已設定為「<strong>刪除/不匯出</strong>」。如需重新納入 Excel 活頁簿，請點擊右側按鈕。</span>
              </div>
              <button
                onClick={() => {
                  activeConfig.setIsIncluded(true);
                  showNotification(`已恢復保留 ${activeConfig.title}`);
                }}
                className="rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 transition-colors shrink-0 ml-2"
              >
                恢復留下此表
              </button>
            </div>
          )}

          {/* Interactive Table Rendering */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-xs">
            <div className="min-w-[940px] text-xs">
              {/* Row 1: Merged Title (Corporate Header) */}
              <div className="border-b border-slate-300 py-3 text-center text-base font-extrabold text-slate-900 tracking-wide bg-white">
                {activeTab === 'tracking'
                  ? `${meta.title || '會議名稱'}＋會議記錄`
                  : activeTab === 'clarification'
                  ? `${meta.title || '會議名稱'}＋待釐清問題追蹤表`
                  : `${meta.title || '會議名稱'}＋風險與阻礙追蹤表`}
              </div>

              {/* Row 2: Attendees & Recorder */}
              <div className="grid grid-cols-12 border-b border-slate-300 bg-white py-2 px-3 items-center text-slate-800">
                <div className="col-span-8 flex items-center gap-2">
                  <span className="font-bold text-slate-900 shrink-0">出席人員:</span>
                  <span className="text-slate-700 truncate">
                    {meta.attendees || '（全員出席）'}
                  </span>
                </div>
                <div className="col-span-4 text-right font-bold text-blue-700">
                  會議紀錄 : {customRecorder || '吳俊傑'}
                </div>
              </div>

              {/* Row 3: Blue Header */}
              <div className="grid grid-cols-12 bg-[#2B6CB0] text-white font-bold text-center border-b border-slate-300 divide-x divide-blue-400/80">
                <div className="col-span-1 py-2.5 px-1">項次/操作</div>
                <div className="col-span-2 py-2.5 px-1">日期</div>
                <div className="col-span-3 py-2.5 text-left px-3">
                  {activeTab === 'tracking' ? '會議摘要 / 執行項目' : activeTab === 'clarification' ? '待釐清問題' : '風險項目'}
                </div>
                <div className="col-span-2 py-2.5 px-1">負責人員</div>
                <div className="col-span-1 py-2.5 px-1">預計完成</div>
                <div className="col-span-2 py-2.5 text-left px-2">追蹤情形 / 因應措施</div>
                <div className="col-span-1 py-2.5 px-1">留下/刪除</div>
              </div>

              {/* Table Body Rows */}
              <div className="divide-y divide-slate-200">
                {currentItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p>目前此表格尚無任何項目，可點擊上方「新增項目」手動建立。</p>
                  </div>
                ) : (
                  currentItems
                    .filter(item => showExcludedRows || !item.isExcluded)
                    .map((item) => {
                      const isDeleted = Boolean(item.isExcluded);

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "grid grid-cols-12 divide-x divide-slate-200 transition-colors items-center text-slate-800",
                            isDeleted
                              ? "bg-slate-100/80 text-slate-400 opacity-70"
                              : "bg-white hover:bg-blue-50/30"
                          )}
                        >
                          {/* Col 1: ID & Status Badge */}
                          <div className="col-span-1 py-3 px-1 text-center flex flex-col items-center justify-center gap-1">
                            <span className="font-bold text-slate-700">{item.id}</span>
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5 text-[10px] font-bold border",
                                isDeleted
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              )}
                            >
                              {isDeleted ? "已刪除" : "留下"}
                            </span>
                          </div>

                          {/* Col 2: Date */}
                          <div className="col-span-2 py-2 px-1 text-center">
                            <input
                              type="text"
                              value={item.date}
                              disabled={isDeleted}
                              onChange={(e) => handleUpdateItemField(item.id, 'date', e.target.value)}
                              className={cn(
                                "w-full rounded border px-1.5 py-1 text-center text-xs focus:outline-none",
                                isDeleted ? "bg-slate-200/50 border-transparent text-slate-400" : "bg-white border-slate-200 text-slate-800 focus:border-blue-500"
                              )}
                            />
                          </div>

                          {/* Col 3: Summary / Topic */}
                          <div className="col-span-3 py-2 px-2 text-left">
                            <textarea
                              rows={2}
                              value={item.summary}
                              disabled={isDeleted}
                              onChange={(e) => handleUpdateItemField(item.id, 'summary', e.target.value)}
                              className={cn(
                                "w-full resize-none rounded border p-1.5 text-xs focus:outline-none",
                                isDeleted 
                                  ? "bg-slate-200/50 border-transparent text-slate-400 line-through" 
                                  : "bg-white border-slate-200 font-medium text-slate-900 focus:border-blue-500"
                              )}
                              placeholder="請輸入摘要或任務說明..."
                            />
                          </div>

                          {/* Col 4: Owner (Multi-Select Personnel) */}
                          <div className="col-span-2 py-2 px-1.5 text-left relative">
                            <PersonnelMultiSelect
                              value={item.owner}
                              onChange={(newOwner) => handleUpdateItemField(item.id, 'owner', newOwner)}
                              personnelList={personnelList}
                              disabled={isDeleted}
                            />
                          </div>

                          {/* Col 5: Estimated Due Date */}
                          <div className="col-span-1 py-2 px-1 text-center">
                            <input
                              type="text"
                              value={item.estimatedDate}
                              disabled={isDeleted}
                              onChange={(e) => handleUpdateItemField(item.id, 'estimatedDate', e.target.value)}
                              className={cn(
                                "w-full rounded border px-1 py-1 text-center text-xs focus:outline-none",
                                isDeleted ? "bg-slate-200/50 border-transparent text-slate-400" : "bg-white border-slate-200 text-slate-700 focus:border-blue-500"
                              )}
                            />
                          </div>

                          {/* Col 6: Tracking Status */}
                          <div className="col-span-2 py-2 px-2 text-left">
                            <textarea
                              rows={2}
                              value={item.trackingStatus}
                              disabled={isDeleted}
                              onChange={(e) => handleUpdateItemField(item.id, 'trackingStatus', e.target.value)}
                              className={cn(
                                "w-full resize-none rounded border p-1.5 text-xs focus:outline-none",
                                isDeleted ? "bg-slate-200/50 border-transparent text-slate-400" : "bg-white border-slate-200 text-slate-600 focus:border-blue-500"
                              )}
                              placeholder="追蹤情形或注意事項..."
                            />
                          </div>

                          {/* Col 7: Action Buttons (留下 vs 刪除) */}
                          <div className="col-span-1 py-2 px-1 text-center">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              {/* Keep / Delete Toggle Button */}
                              <button
                                onClick={() => handleToggleItem(item.id)}
                                className={cn(
                                  "flex w-full items-center justify-center gap-1 rounded-lg py-1.5 px-2 text-[11px] font-bold shadow-xs active:scale-95 transition-all border",
                                  isDeleted
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                                    : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                )}
                                title={isDeleted ? "將此項目恢復為「留下」" : "將此項目標記為「刪除/排除」"}
                              >
                                {isDeleted ? (
                                  <>
                                    <Undo2 size={12} />
                                    <span>留下</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 size={12} />
                                    <span>刪除</span>
                                  </>
                                )}
                              </button>

                              {/* Hard Delete button if already excluded */}
                              {isDeleted && (
                                <button
                                  onClick={() => handleDeleteItemPermanently(item.id)}
                                  className="text-[10px] text-slate-400 hover:text-rose-600 hover:underline flex items-center gap-0.5"
                                  title="從列表中永久移除此行"
                                >
                                  <span>徹底清除</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Table Footer Status */}
              <div className="bg-slate-50 border-t border-slate-300 py-2.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{activeConfig.title} 統計：</span>
                  <span>共 {currentItems.length} 項</span>
                  <span className="text-emerald-700 font-bold">（留下 {activeCount} 項）</span>
                  {excludedCount > 0 && (
                    <span className="text-rose-600 font-medium">（已刪除 {excludedCount} 項）</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddNewRow}
                    className="flex items-center gap-1 font-bold text-blue-600 hover:underline"
                  >
                    <Plus size={13} />
                    <span>新增一列</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
