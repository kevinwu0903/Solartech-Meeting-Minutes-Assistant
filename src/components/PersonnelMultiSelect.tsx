import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  Check, 
  Plus, 
  X, 
  ChevronDown, 
  Search, 
  UserCheck, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { OrganizationPerson } from '../data/organizationPersonnel';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PersonnelMultiSelectProps {
  value: string; // e.g. "陳政傑、吳俊傑" or "所有課長"
  onChange: (newValue: string) => void;
  personnelList: OrganizationPerson[];
  disabled?: boolean;
}

// Split string into array of trimmed names
export function parseOwnerNames(str: string): string[] {
  if (!str) return [];
  return str
    .split(/[,、，/&+]|\s+和\s+|\s+及\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export function PersonnelMultiSelect({
  value,
  onChange,
  personnelList,
  disabled = false,
}: PersonnelMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customInput, setCustomInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse current selected names
  const selectedNames = React.useMemo(() => parseOwnerNames(value), [value]);

  // Adjust openUpward based on screen space
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 330 && rect.top > 330) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Toggle selection of a single name
  const handleToggleName = (name: string) => {
    if (disabled) return;
    let updated: string[];
    if (selectedNames.includes(name)) {
      updated = selectedNames.filter(n => n !== name);
    } else {
      updated = [...selectedNames, name];
    }
    onChange(updated.join('、'));
  };

  // Remove a single name directly from pill
  const handleRemoveName = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (disabled) return;
    const updated = selectedNames.filter(n => n !== name);
    onChange(updated.join('、'));
  };

  // Quick action: Select "所有課長" only or toggle it
  const handleToggleAllChiefs = () => {
    if (disabled) return;
    if (selectedNames.includes('所有課長')) {
      onChange(selectedNames.filter(n => n !== '所有課長').join('、'));
    } else {
      onChange([...selectedNames, '所有課長'].join('、'));
    }
  };

  // Quick action: Select all 6 section chiefs (宏毅, 俊傑, 詠烈, 永年, 靖夫, 瑋諭)
  const handleSelectAllIndividualChiefs = () => {
    if (disabled) return;
    const sectionChiefNames = personnelList
      .filter(p => p.title.includes('課長') && p.name !== '所有課長')
      .map(p => p.name);
    
    // Union
    const combined = Array.from(new Set([...selectedNames, ...sectionChiefNames]));
    onChange(combined.join('、'));
  };

  // Clear all selections
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange('');
  };

  // Add custom name
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selectedNames.includes(trimmed)) {
      onChange([...selectedNames, trimmed].join('、'));
    }
    setCustomInput('');
  };

  // Filtered personnel list based on search
  const filteredPersonnel = personnelList.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.englishName && p.englishName.toLowerCase().includes(q)) ||
      p.title.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.aliases.some(a => a.toLowerCase().includes(q))
    );
  });

  // Custom names currently in value that aren't in personnelList
  const customSelectedNames = selectedNames.filter(
    n => !personnelList.some(p => p.name === n)
  );

  return (
    <div className="relative text-left" ref={containerRef}>
      {/* Trigger Box / Display Pills */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        className={cn(
          "min-h-[38px] w-full rounded-lg border px-2 py-1.5 text-xs transition-all flex flex-wrap items-center gap-1.5 cursor-pointer select-none",
          disabled 
            ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed" 
            : isOpen
            ? "border-blue-500 ring-2 ring-blue-500/20 bg-white"
            : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/50"
        )}
      >
        {selectedNames.length === 0 ? (
          <span className="flex items-center gap-1.5 text-slate-400 font-normal">
            <Users size={13} className="text-slate-400" />
            <span>點擊複選負責人員...</span>
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-1 max-w-full">
            {selectedNames.map((name) => {
              const isAllChiefs = name === '所有課長';
              return (
                <span
                  key={name}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold border shadow-2xs transition-colors",
                    isAllChiefs
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-blue-50 text-blue-800 border-blue-200"
                  )}
                >
                  <span>{name}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveName(e, name)}
                      className="rounded hover:bg-black/10 p-0.5 text-slate-500 hover:text-slate-900 transition-colors"
                      title={`移除 ${name}`}
                    >
                      <X size={11} />
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 shrink-0 pl-1">
          {selectedNames.length > 0 && !disabled && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
              {selectedNames.length}
            </span>
          )}
          <ChevronDown
            size={13}
            className={cn(
              "text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180 text-blue-600"
            )}
          />
        </div>
      </div>

      {/* Dropdown Multi-Select Popover */}
      {isOpen && !disabled && (
        <div
          className={cn(
            "absolute left-0 z-50 w-[290px] sm:w-[320px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl ring-1 ring-slate-900/10",
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          )}
        >
          {/* Header & Quick Action Buttons */}
          <div className="border-b border-slate-100 pb-2 mb-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-blue-600" />
                <span>複選負責人員 (可多選)</span>
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">
                已選 {selectedNames.length} 人
              </span>
            </div>

            {/* Quick Filter Search */}
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋姓名、職稱、單位..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1 pl-7 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Fast Preset Badges */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={handleToggleAllChiefs}
                className={cn(
                  "rounded-md px-2 py-0.5 font-bold border transition-all cursor-pointer",
                  selectedNames.includes('所有課長')
                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                )}
                title="快速選取或取消「所有課長」"
              >
                ★ 所有課長
              </button>

              <button
                type="button"
                onClick={handleSelectAllIndividualChiefs}
                className="rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 font-medium border border-slate-200 transition-colors cursor-pointer"
                title="一鍵選取全部 6 位課長（宏毅、俊傑、詠烈、永年、靖夫、瑋諭）"
              >
                + 各課長全選
              </button>

              {selectedNames.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="ml-auto text-[11px] text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  清空
                </button>
              )}
            </div>
          </div>

          {/* Personnel Checklist with scroll */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs divide-y divide-slate-50">
            {/* All Section Chiefs Special Group */}
            {filteredPersonnel
              .filter(p => p.name === '所有課長')
              .map(person => {
                const isChecked = selectedNames.includes(person.name);
                return (
                  <div
                    key={person.id}
                    onClick={() => handleToggleName(person.name)}
                    className={cn(
                      "flex items-center justify-between rounded-lg p-1.5 transition-colors cursor-pointer select-none",
                      isChecked ? "bg-amber-50/80 font-bold text-amber-950" : "hover:bg-slate-50 text-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          isChecked
                            ? "bg-amber-500 border-amber-600 text-white"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-900">{person.name}</span>
                          <span className="rounded bg-amber-200/80 px-1 py-0.2 text-[10px] font-bold text-amber-900">
                            全體
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-700/80">各生產/品管/生管課長</p>
                      </div>
                    </div>
                  </div>
                );
              })}

            {/* Individual Officers List */}
            {filteredPersonnel
              .filter(p => p.name !== '所有課長')
              .map(person => {
                const isChecked = selectedNames.includes(person.name);
                return (
                  <div
                    key={person.id}
                    onClick={() => handleToggleName(person.name)}
                    className={cn(
                      "flex items-center justify-between rounded-lg p-1.5 transition-colors cursor-pointer select-none",
                      isChecked ? "bg-blue-50/70 font-bold text-blue-900" : "hover:bg-slate-50 text-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          isChecked
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isChecked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{person.name}</span>
                          {person.englishName && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({person.englishName})
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-normal">
                            {person.title}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{person.department}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

            {filteredPersonnel.length === 0 && (
              <div className="py-4 text-center text-slate-400 text-xs">
                無相符的組織人員
              </div>
            )}
          </div>

          {/* Custom Person Input */}
          <form onSubmit={handleAddCustom} className="mt-2.5 pt-2 border-t border-slate-100 flex gap-1.5">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="輸入其他自訂姓名..."
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-40 transition-colors"
            >
              + 加入
            </button>
          </form>

          {/* Confirm Button */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              複選後將自動以「、」串接
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg bg-blue-600 px-3.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
