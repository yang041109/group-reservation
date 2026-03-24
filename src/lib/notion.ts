import { Client } from '@notionhq/client';
import type { NotionStoreData } from '@/types';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

/**
 * Notion 데이터베이스에서 가게 데이터를 조회하여 NotionStoreData[] 형태로 반환한다.
 */
export async function fetchStoresFromNotion(
  databaseId: string,
): Promise<NotionStoreData[]> {
  const response = await notion.dataSources.query({ data_source_id: databaseId });

  return response.results.map((page: any) => {
    const props = page.properties as Record<string, any>;

    const name = extractTitle(props['이름'] ?? props['Name'] ?? props['name']);
    const images = extractFiles(props['사진'] ?? props['Images'] ?? props['images']);
    const maxCapacity = extractNumber(props['최대수용인원'] ?? props['MaxCapacity'] ?? props['maxCapacity']);
    const availableTimes = extractMultiSelect(props['예약가능시간'] ?? props['AvailableTimes'] ?? props['availableTimes']);
    const menus = extractMenus(props['메뉴'] ?? props['Menus'] ?? props['menus']);
    const minOrderRules = extractMinOrderRules(
      props['최소주문금액규칙'] ?? props['MinOrderRules'] ?? props['minOrderRules'],
    );

    return { name, images, maxCapacity, availableTimes, menus, minOrderRules };
  });
}

function extractTitle(prop: any): string {
  if (!prop) return '';
  if (prop.type === 'title' && Array.isArray(prop.title)) {
    return prop.title.map((t: any) => t.plain_text ?? '').join('');
  }
  return String(prop ?? '');
}

function extractFiles(prop: any): string[] {
  if (!prop) return [];
  if (prop.type === 'files' && Array.isArray(prop.files)) {
    return prop.files.map((f: any) => f.file?.url ?? f.external?.url ?? '').filter(Boolean);
  }
  return [];
}

function extractNumber(prop: any): number {
  if (!prop) return 0;
  if (prop.type === 'number') return prop.number ?? 0;
  return Number(prop) || 0;
}

function extractMultiSelect(prop: any): string[] {
  if (!prop) return [];
  if (prop.type === 'multi_select' && Array.isArray(prop.multi_select)) {
    return prop.multi_select.map((s: any) => s.name);
  }
  if (prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
    const text = prop.rich_text.map((t: any) => t.plain_text ?? '').join('');
    return text ? text.split(',').map((s: string) => s.trim()) : [];
  }
  return [];
}

function extractMenus(prop: any): NotionStoreData['menus'] {
  if (!prop) return [];
  // Notion rich_text에 JSON 형태로 저장된 메뉴 파싱
  if (prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
    const text = prop.rich_text.map((t: any) => t.plain_text ?? '').join('');
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((m: any) => ({
          name: String(m.name ?? ''),
          price: Number(m.price ?? 0),
          category: m.category ? String(m.category) : undefined,
        }));
      }
    } catch {
      // JSON 파싱 실패 시 빈 배열
    }
  }
  return [];
}

function extractMinOrderRules(prop: any): NotionStoreData['minOrderRules'] {
  if (!prop) return [];
  if (prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
    const text = prop.rich_text.map((t: any) => t.plain_text ?? '').join('');
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((r: any) => ({
          minHeadcount: Number(r.minHeadcount ?? 0),
          maxHeadcount: Number(r.maxHeadcount ?? 0),
          minOrderAmount: Number(r.minOrderAmount ?? 0),
        }));
      }
    } catch {
      // JSON 파싱 실패 시 빈 배열
    }
  }
  return [];
}
