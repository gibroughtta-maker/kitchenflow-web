# KitchenFlow Web 端（移动端优先）

在浏览器中实现 KitchenFlow 全部核心功能：冰箱扫描、想吃分析、购物清单、库存管理。  
**设计参照**：`stitch_fridge_scan_results` 设计稿（液态玻璃、沉浸式背景、底部 Tab、扫描结果卡片与状态标签）。

## 功能（移动 Web 布局）

- **布局**：沉浸式深色背景 + 顶部标题栏 + 底部 Tab（首页 / 扫描 / 想吃 / 购物 / 库存）
- **首页**：一句话介绍 + 上传扫描入口 + 想吃 / 购物 / 库存三宫格
- **扫描**：上传 1～5 张照片 → 选择存储位置 → AI 识别食材与新鲜度 → 扫描结果
- **扫描结果**：按新鲜度分组展示，支持「保存到库存」「加入购物清单」
- **想吃**：输入菜名 → AI 分析食材与菜谱 → 缺失食材一键加入购物清单
- **购物清单**：增删改、勾选、清除已勾选（数据存 localStorage）
- **库存**：按冰箱/冷冻/ pantry 筛选，删除（数据存 localStorage）

## 环境

1. Node 18+
2. 复制 `.env.example` 为 `.env`，填入 `VITE_GEMINI_API_KEY`（[Google AI Studio](https://aistudio.google.com/apikey) 获取）

## 运行

```bash
cd kitchenflow-web
npm install
npm run dev
```

浏览器打开终端提示的地址（如 http://localhost:5173）。

## 构建

```bash
npm run build
```

产物在 `dist/`，可部署到 Vercel、Netlify 等静态托管。
