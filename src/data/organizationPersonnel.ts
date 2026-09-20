export interface OrganizationPerson {
  id: string;
  name: string;
  englishName?: string;
  title: string;
  department: string;
  aliases: string[];
}

export const DEFAULT_ORGANIZATION_PERSONNEL: OrganizationPerson[] = [
  {
    id: 'p-1',
    name: '歐榮年',
    englishName: 'simon',
    title: '處長',
    department: 'PGM製造處',
    aliases: ['Simon', 'simon', '賽門', '榮年', '歐處長', '歐處', '歐總', '歐處長Simon', '歐榮年處長'],
  },
  {
    id: 'p-2',
    name: '陳政傑',
    englishName: '',
    title: '經理',
    department: '光科生產部',
    aliases: ['政傑', '正傑', '證傑', '政結', '陳經理', '政傑經理', '陳正傑'],
  },
  {
    id: 'p-3',
    name: '陳文賢',
    englishName: '',
    title: '主任工程師',
    department: '光科生產部',
    aliases: ['文賢', '汶賢', '文憲', '文顯', '陳主任', '文賢主任', '陳文憲'],
  },
  {
    id: 'p-4',
    name: '陳宏毅',
    englishName: '',
    title: '資深課長',
    department: '金銀化學品課',
    aliases: ['宏毅', '弘毅', '鴻毅', '宏義', '宏益', '陳課長', '宏毅課長', '陳弘毅'],
  },
  {
    id: 'p-5',
    name: '吳俊傑',
    englishName: '',
    title: '資深課長',
    department: '金銀精煉課',
    aliases: ['俊傑', '駿傑', '俊結', '俊捷', '吳課長', '俊傑課長', '吳駿傑'],
  },
  {
    id: 'p-6',
    name: '邱詠烈',
    englishName: '',
    title: '資深課長',
    department: '金銀產品課',
    aliases: ['詠烈', '永烈', '勇烈', '詠列', '邱課長', '詠烈課長', '邱永烈'],
  },
  {
    id: 'p-7',
    name: '楊永年',
    englishName: '',
    title: '資深課長',
    department: 'PGM生物管一課',
    aliases: ['永年', '詠年', '勇年', '楊課長', '楊資深課長', '永年課長', '楊詠年'],
  },
  {
    id: 'p-8',
    name: '蕭靖夫',
    englishName: '',
    title: '資深課長',
    department: 'PGM生物管二課',
    aliases: ['靖夫', '靜夫', '敬夫', '勁夫', '蕭課長', '靖夫課長', '蕭靜夫'],
  },
  {
    id: 'p-9',
    name: '林瑋諭',
    englishName: '',
    title: '課長',
    department: 'PGM品管課',
    aliases: ['瑋諭', '偉諭', '偉裕', '韋諭', '緯諭', '林課長', '瑋諭課長', '林偉諭', '林偉裕'],
  },
  {
    id: 'p-10',
    name: '所有課長',
    englishName: '',
    title: '全體課長',
    department: '各生產/品管/生管課',
    aliases: ['所有課長', '各課長', '全體課長', '各位課長', '各課課長', '各課長們', '每位課長', '全體課長們', '各單位課長'],
  },
];

const STORAGE_KEY = 'pgmbu_organization_personnel_v1';

export function getStoredPersonnel(): OrganizationPerson[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORGANIZATION_PERSONNEL;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure '所有課長' is always present even if previously cached in localStorage
      const hasAllSectionChiefs = parsed.some((p: any) => p.name === '所有課長');
      if (!hasAllSectionChiefs) {
        const allChiefsEntry = DEFAULT_ORGANIZATION_PERSONNEL.find(p => p.name === '所有課長');
        if (allChiefsEntry) {
          const merged = [...parsed, allChiefsEntry];
          saveStoredPersonnel(merged);
          return merged;
        }
      }
      return parsed;
    }
  } catch (err) {
    console.error('讀取組織人物失敗:', err);
  }
  return DEFAULT_ORGANIZATION_PERSONNEL;
}

export function saveStoredPersonnel(list: OrganizationPerson[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('儲存組織人物失敗:', err);
  }
}

export function resetStoredPersonnel(): OrganizationPerson[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {}
  return DEFAULT_ORGANIZATION_PERSONNEL;
}

/**
 * Replace homophones or aliases in raw transcript text with standardized personnel name
 */
export function replaceHomophonesInTranscript(
  text: string,
  personnelList: OrganizationPerson[]
): { updatedText: string; replacementCount: number; replacements: { alias: string; target: string; count: number }[] } {
  if (!text) return { updatedText: text, replacementCount: 0, replacements: [] };

  let result = text;
  let totalReplaced = 0;
  const replacementsRecord: { alias: string; target: string; count: number }[] = [];

  // Sort aliases by length descending so longer phrases match first (e.g. '歐處長Simon' before 'Simon')
  const allAliases: { alias: string; person: OrganizationPerson }[] = [];
  
  personnelList.forEach((person) => {
    // Also include person's own english name if present
    const aliases = [...person.aliases];
    if (person.englishName && !aliases.includes(person.englishName)) {
      aliases.push(person.englishName);
    }
    
    aliases.forEach((alias) => {
      const trimmed = alias.trim();
      if (trimmed && trimmed !== person.name) {
        allAliases.push({ alias: trimmed, person });
      }
    });
  });

  allAliases.sort((a, b) => b.alias.length - a.alias.length);

  allAliases.forEach(({ alias, person }) => {
    // Avoid escaping errors
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // If it's English only, use word boundary or general matching
    const isLatin = /^[A-Za-z0-9\s]+$/.test(alias);
    const pattern = isLatin ? new RegExp(`\\b${escaped}\\b`, 'gi') : new RegExp(escaped, 'g');
    
    const matches = result.match(pattern);
    if (matches && matches.length > 0) {
      result = result.replace(pattern, person.name);
      totalReplaced += matches.length;
      replacementsRecord.push({
        alias,
        target: person.name,
        count: matches.length,
      });
    }
  });

  return {
    updatedText: result,
    replacementCount: totalReplaced,
    replacements: replacementsRecord,
  };
}
