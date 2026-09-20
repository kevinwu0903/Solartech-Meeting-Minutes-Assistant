import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck,
  Building2,
  Briefcase,
  Layers,
  HelpCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  OrganizationPerson, 
  DEFAULT_ORGANIZATION_PERSONNEL 
} from '../data/organizationPersonnel';

interface PersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnelList: OrganizationPerson[];
  onSavePersonnel: (list: OrganizationPerson[]) => void;
  onResetPersonnel: () => void;
}

export function PersonnelModal({
  isOpen,
  onClose,
  personnelList,
  onSavePersonnel,
  onResetPersonnel,
}: PersonnelModalProps) {
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [aliasesText, setAliasesText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleStartAdd = () => {
    setName('');
    setEnglishName('');
    setTitle('課長');
    setDepartment('PGM製造處');
    setAliasesText('');
    setEditingPersonId(null);
    setIsAddingNew(true);
  };

  const handleStartEdit = (person: OrganizationPerson) => {
    setName(person.name);
    setEnglishName(person.englishName || '');
    setTitle(person.title);
    setDepartment(person.department);
    setAliasesText(person.aliases.join('、'));
    setEditingPersonId(person.id);
    setIsAddingNew(false);
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingPersonId(null);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('請輸入中文姓名');
      return;
    }

    const aliases = aliasesText
      .split(/[,、，\s\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (isAddingNew) {
      const newPerson: OrganizationPerson = {
        id: `p-${Date.now()}`,
        name: name.trim(),
        englishName: englishName.trim() || undefined,
        title: title.trim() || '成員',
        department: department.trim() || 'PGMBU',
        aliases: aliases.length > 0 ? aliases : [name.trim()],
      };
      const updated = [...personnelList, newPerson];
      onSavePersonnel(updated);
      showToast(`已成功新增「${newPerson.name}」至組織名冊！`);
      setIsAddingNew(false);
    } else if (editingPersonId) {
      const updated = personnelList.map((p) => {
        if (p.id === editingPersonId) {
          return {
            ...p,
            name: name.trim(),
            englishName: englishName.trim() || undefined,
            title: title.trim() || '成員',
            department: department.trim() || 'PGMBU',
            aliases: aliases.length > 0 ? aliases : [name.trim()],
          };
        }
        return p;
      });
      onSavePersonnel(updated);
      showToast(`已儲存「${name}」的組織與同音字資料！`);
      setEditingPersonId(null);
    }
  };

  const handleDeletePerson = (id: string, personName: string) => {
    if (window.confirm(`確定要將「${personName}」從組織名冊中移除嗎？`)) {
      const updated = personnelList.filter((p) => p.id !== id);
      onSavePersonnel(updated);
      showToast(`已自名冊移除「${personName}」`);
    }
  };

  const handleReset = () => {
    if (window.confirm('確定要將組織架構人物名冊還原為系統標準預設值嗎？')) {
      onResetPersonnel();
      showToast('已恢復光洋科PGMBU官方標準組織名冊（含各主管與所有課長）');
    }
  };

  // Department colors matching table archetype
  const getDeptBadgeStyle = (dept: string) => {
    if (dept.includes('PGM製造處')) {
      return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
    }
    if (dept.includes('光科生產部')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (dept.includes('金銀') || dept.includes('生物管') || dept.includes('品管')) {
      return 'bg-amber-100 text-amber-900 border-amber-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  光洋科PGMBU 組織架構人物名冊 & 同音字自動校正
                </h3>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  {personnelList.length} 位成員
                </span>
              </div>
              <p className="text-xs text-slate-500">
                會議逐字稿中如有音譯相同、口語諧音、英文名或稱呼簡稱，分析時將自動直接取代為標準中文全名
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-emerald-50 px-6 py-2.5 border-b border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-blue-600 shrink-0" />
            <span>
              <strong>同音替換機制已就緒：</strong>包含 Simon 處長、政傑經理、宏毅、文賢、俊傑、詠烈、永年、靖夫、瑋諭等語音辨識同音校正。
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAdd}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 transition-all"
            >
              <Plus size={13} />
              <span>新增成員</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
              title="還原為官方標準預設名單（含所有課長）"
            >
              <RotateCcw size={12} />
              <span>還原預設</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Add / Edit Form Card */}
          <AnimatePresence>
            {(isAddingNew || editingPersonId) && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSaveForm}
                className="overflow-hidden rounded-xl border border-blue-300 bg-blue-50/50 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-blue-200">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Edit3 size={14} className="text-blue-600" />
                    <span>{isAddingNew ? '新增組織人物' : '編輯組織人物與同音詞庫'}</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    取消
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">中文全名 *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例：陳政傑"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">英文名 / 稱呼</label>
                    <input
                      type="text"
                      value={englishName}
                      onChange={(e) => setEnglishName(e.target.value)}
                      placeholder="例：simon (可留空)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">職稱 *</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例：資深課長 / 經理 / 處長"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">單位 *</label>
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="例：金銀精煉課"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    常見同音字 / 諧音 / 口語暱稱 / 簡稱 (以逗號或頓號分隔，遇到這些詞將直接取代為正式全名)
                  </label>
                  <input
                    type="text"
                    value={aliasesText}
                    onChange={(e) => setAliasesText(e.target.value)}
                    placeholder="例：俊傑、駿傑、俊結、俊捷、吳課長、俊傑課長"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none font-sans"
                  />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                  >
                    <Check size={14} />
                    <span>儲存成員</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Official Roster Table Matching User's Image */}
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-800 font-bold divide-x divide-slate-200">
                  <th className="py-2.5 px-3 text-center w-24">中文</th>
                  <th className="py-2.5 px-3 text-center w-24">英文</th>
                  <th className="py-2.5 px-3 text-center w-28">職稱</th>
                  <th className="py-2.5 px-3 text-left w-36">單位</th>
                  <th className="py-2.5 px-3 text-left">自動取代詞庫（同音字 / 諧音 / 簡稱）</th>
                  <th className="py-2.5 px-2 text-center w-20">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                {personnelList.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50/80 transition-colors divide-x divide-slate-100">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-50/30">
                      {person.name}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                      {person.englishName || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-700">
                      {person.title}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-semibold border ${getDeptBadgeStyle(person.department)}`}>
                        {person.department}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {person.aliases.map((alias, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 font-normal border border-slate-200"
                          >
                            {alias}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(person)}
                          className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          title="編輯"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeletePerson(person.id, person.name)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="刪除"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl"
              >
                <CheckCircle2 size={16} />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Info size={14} className="text-blue-500" />
            <span>名冊資料會自動儲存於本機瀏覽器，並在點擊分析或一鍵校正時自動注入 AI 分析引擎中。</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            完成並關閉
          </button>
        </div>
      </motion.div>
    </div>
  );
}
