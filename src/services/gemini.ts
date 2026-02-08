
import { GoogleGenAI } from '@google/genai';
import type { FreshItem, FridgeSnapshotResult, RecipeDetails } from '../types';

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('请设置 .env 中的 VITE_GEMINI_API_KEY');
  return key;
}

let ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!ai) ai = new GoogleGenAI({ apiKey: getApiKey() });
  return ai;
}

// --- 与 AI Studio 完全一致的 API（想吃 / 食谱）---

export async function identifyCravingFromText(textInput: string): Promise<{ foodName: string } | null> {
  try {
    const response = await getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            text: `The user typed: "${textInput}". Identify the specific food item or dish they are craving. If they typed 'I want a burger', extract 'Burger'. Return the result in JSON format: { "foodName": "Dish Name" }.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });
    const text = response.text;
    if (!text) return null;
    const data = JSON.parse(text);
    if (data?.foodName && typeof data.foodName === 'string') return { foodName: data.foodName.trim() };
    return null;
  } catch (error) {
    console.error('Gemini Text Error:', error);
    return null;
  }
}

export async function identifyCravingFromLink(url: string): Promise<{ foodName: string } | null> {
  try {
    // Step 1: 尝试通过 API 抓取网页内容
    let pageContent = '';
    let pageTitle = '';
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${apiBase}/api/scrape-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          pageTitle = result.data.ogTitle || result.data.title || '';
          pageContent = [
            result.data.ogTitle,
            result.data.ogDescription,
            result.data.title,
            result.data.description,
            result.data.textContent, // Backend now limits to 8000 chars, no need to slice here
          ].filter(Boolean).join('\n');
        }
      }
    } catch (e) {
      console.warn('Scrape failed, falling back to URL-only analysis:', e);
    }

    // Step 2: 用 Gemini 分析内容
    const prompt = pageContent
      ? `分析以下网页内容，识别其中提到的食物或菜品名称。

网页标题: ${pageTitle}
网页内容:
${pageContent}

请从内容中识别主要的食物/菜品名称。返回 JSON 格式: { "foodName": "菜品名" }`
      : `The user provided this recipe or food link: "${url}". Identify the food item or dish name from the URL structure or likely content. Return the result in JSON format: { "foodName": "Dish Name" }.`;

    const response = await getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: { responseMimeType: 'application/json' },
    });

    const text = response.text;
    if (!text) return null;
    const data = JSON.parse(text);
    if (data?.foodName && typeof data.foodName === 'string') return { foodName: data.foodName.trim() };
    return null;
  } catch (error) {
    console.error('Gemini Link Error:', error);
    return null;
  }
}

export async function getRecipeDetails(foodName: string): Promise<RecipeDetails | null> {
  try {
    const response = await getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a recipe card for "${foodName}". Provide a short list of key ingredients (max 5) with a matching Material Symbol icon name for each. Provide 3 short, simplified cooking steps.
Return in JSON format matching this structure:
{
  "dishName": "String",
  "cuisine": "String (e.g. Thai Cuisine)",
  "cookingTime": "String (e.g. 25 mins)",
  "ingredients": [ {"name": "Ingredient Name", "icon": "icon_name"} ],
  "steps": ["Step 1...", "Step 2...", "Step 3..."]
}
`,
      config: {
        responseMimeType: 'application/json',
      },
    });
    const text = response.text;
    if (!text) return null;
    const data = JSON.parse(text);
    if (!data?.dishName || !Array.isArray(data?.ingredients) || !Array.isArray(data?.steps)) return null;
    return {
      dishName: String(data.dishName).trim(),
      cuisine: String(data.cuisine ?? '').trim(),
      cookingTime: String(data.cookingTime ?? '').trim(),
      ingredients: (data.ingredients as any[]).map((i: any) => ({
        name: String(i?.name ?? '').trim(),
        icon: i?.icon ? String(i.icon) : undefined,
      })),
      steps: (data.steps as any[]).map((s: any) => String(s ?? '').trim()),
    };
  } catch (error) {
    console.error('Gemini Recipe Error:', error);
    return null;
  }
}

// --- 语音识别想吃 ---

export async function identifyCravingFromAudio(audioBase64: string): Promise<{ foodName: string; rawText?: string } | null> {
  try {
    const response = await getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/webm',
              data: audioBase64,
            },
          },
          {
            text: `Listen to this audio clip. The user is saying what they want to buy or eat.

CRITICAL INSTRUCTIONS:
1. DO NOT TRANSLATE - Keep the EXACT language the user spoke (Chinese stays Chinese, English stays English)
2. PRESERVE store names like "Asda", "Tesco", "Sainsbury's", "Lidl", "Aldi", "Waitrose", etc.
3. PRESERVE location phrases like "在...买", "去...买", "at ...", "from ..."

Return in JSON format:
{
  "rawText": "EXACT transcription in original language (e.g., '在Asda买牛奶和苹果')",
  "foodName": "Just the food items for display"
}

Examples:
- Chinese: "在Asda买牛奶和苹果" → { "rawText": "在Asda买牛奶和苹果", "foodName": "牛奶和苹果" }
- English: "buy milk and eggs at Tesco" → { "rawText": "buy milk and eggs at Tesco", "foodName": "milk and eggs" }
- Mixed: "在Asda买milk" → { "rawText": "在Asda买milk", "foodName": "milk" }

If you cannot understand, return { "rawText": null, "foodName": null }.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });
    const text = response.text;
    console.log('[Gemini Audio] Raw response:', text); // Debug logging
    if (!text) return null;
    const data = JSON.parse(text);
    console.log('[Gemini Audio] Parsed data:', data); // Debug logging
    // Return raw text if available, otherwise just foodName
    if (data?.foodName && typeof data.foodName === 'string') {
      return {
        foodName: data.foodName.trim(),
        rawText: data.rawText?.trim() || undefined
      };
    }
    return null;
  } catch (error) {
    console.error('Gemini Audio Error:', error);
    return null;
  }
}

// --- 生成食物图片 ---

export async function generateFoodImage(foodName: string): Promise<string | null> {
  try {
    // 尝试使用用户指定的 Gemini 3 模型生成图片
    // 注意：Gemini 生图通常返回 Base64 (inlineData)，而不是 http URL
    const response = await getClient().models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: `Generate a high-quality, appetising photo of the dish "${foodName}". Professional food photography, cinematic lighting.` }
        ],
      },
    });

    // 检查是否有直接的图像数据返回 (Base64)
    // SDK 结构通常是: candidates[0].content.parts[0].inlineData
    // 但 @google/genai 的 generateContent 返回可能有所不同，这里做通用检查
    // 假设 response 结构包含 candidates
    const candidate = response.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part && 'inlineData' in part && part.inlineData) {
      const { mimeType, data } = part.inlineData;
      return `data:${mimeType};base64,${data}`;
    }

    // 如果没有 inlineData，检查是否有 text 并包含 url (向后兼容幻觉 URL，虽然不太可能)
    const text = response.text; // helper getter
    if (text) {
      try {
        const json = JSON.parse(text);
        if (json.imageUrl) return json.imageUrl;
      } catch { }
    }

    throw new Error('No image data found in response');
  } catch (error) {
    console.warn('Gemini 3 Pro Image Gen failed, falling back to Pollinations:', error);
    // Fallback: Pollinations
    const encodedPrompt = encodeURIComponent(`${foodName}, food photography, 8k`);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}`;
  }
}

// --- 冰箱扫描：用 SDK 发图 + 结构化 JSON prompt，保留现有 FridgeSnapshotResult ---

const FRIDGE_PROMPT = `# KitchenFlow - Smart Fridge Scanner
Identify TOP 5-10 CORE ingredients only. Ignore trivial items.
Focus on MAIN ingredients (vegetables, proteins, dairy, staples). IGNORE condiment bottles, sauce jars, small packets.
Output JSON only, no markdown:
{
  "items": [
    {
      "name": "Baby Spinach",
      "quantity": 1,
      "unit": "bag",
      "visualNotes": "optional"
    }
  ],
  "scanQuality": "good"
}
Analyze the image(s) now:`;

function parseFridgeResult(raw: string): FridgeSnapshotResult | null {
  try {
    let cleaned = raw.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];
    const data = JSON.parse(cleaned);
    if (!data.items || !Array.isArray(data.items)) return null;
    const items: FreshItem[] = data.items
      .filter((i: any) => i.name && (i.quantity ?? 0) > 0)
      .map((i: any) => ({
        name: String(i.name).trim(),
        quantity: Number(i.quantity ?? 1),
        unit: (i.unit || 'pcs').trim(),
        freshness: i.freshness || 'fresh',
        confidence: Number(i.confidence) || 0.7,
        visualNotes: i.visualNotes,
      }));
    return { items, scanQuality: data.scanQuality || 'medium' };
  } catch {
    return null;
  }
}

export async function scanFridge(images: { base64: string; mimeType: string }[]): Promise<FridgeSnapshotResult> {
  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 } as const,
    })),
    { text: FRIDGE_PROMPT },
  ];
  const response = await getClient().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { responseMimeType: 'application/json' },
  });
  const text = response.text;
  if (!text) throw new Error('Gemini 未返回扫描结果');
  const result = parseFridgeResult(text);
  if (!result) throw new Error('解析扫描结果失败');
  return result;
}

// --- 购物路径规划 (Google Maps Grounding) ---

export interface ShoppingRouteStep {
  instruction: string;
  distance?: string;
  duration?: string;
  location?: string;
}

export interface ShoppingRouteResult {
  overview: string;
  totalDuration: string;
  steps: ShoppingRouteStep[];
  mapLink?: string;
}

export async function getShoppingRoute(
  stores: string[],
  userLocation?: { latitude: number; longitude: number }
): Promise<ShoppingRouteResult | null> {
  try {
    const storeList = stores.join(', ');
    const locationContext = userLocation
      ? `My current location is latitude: ${userLocation.latitude}, longitude: ${userLocation.longitude}.`
      : 'My current location is unknown (assume starting from User Current Location).';

    const prompt = `
      I need to visit these stores: ${storeList}.
      ${locationContext}
      
      Please find the actual nearest locations for these stores and plan an efficient route using Google Maps.
      If current location is unknown, create a route link starting from "Current Location".
      
      CRITICAL: You must return the result as a valid JSON object within a markdown code block.
      Format:
      \`\`\`json
      {
        "overview": "Short summary of the trip (e.g. 'Trip to Tesco and Asda')",
        "totalDuration": "Estimated total driving time",
        "steps": [
          {
            "instruction": "Head to Tesco Extra on High St",
            "distance": "2.5 miles",
            "duration": "10 mins",
            "location": "Tesco, High St"
          }
        ],
        "mapLink": "https://www.google.com/maps/dir/..."
      }
      \`\`\`
    `;

    const toolConfig: any = {
      tools: [{ googleMaps: {} }],
    };

    if (userLocation) {
      // @ts-ignore - Dynamic config for Google Maps grounding with location bias
      toolConfig.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude
          }
        }
      };
    }

    const response = await getClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: toolConfig,
    });

    const text = response.text;
    console.log('[Gemini Maps] Raw response:', text);
    if (!text) return null;

    // Clean up potential markdown code blocks
    let cleaned = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleaned);

    return {
      overview: data.overview || `Trip to ${storeList}`,
      totalDuration: data.totalDuration || 'Unknown',
      steps: Array.isArray(data.steps) ? data.steps : [],
      mapLink: data.mapLink || `https://www.google.com/maps/search/${encodeURIComponent(storeList)}`
    };

  } catch (error) {
    console.error('Gemini Maps Error:', error);
    return null;
  }
}
