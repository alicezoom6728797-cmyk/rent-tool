# 🏠 租房交通助手

基于高德地图 API 的租房辅助工具，帮助你根据公共交通便利性选择租房区域。

## 功能

- 🔍 输入地址定位到地图
- 🔵 自动搜索周边地铁站（蓝色标记）
- 🟢 自动搜索周边公交站（绿色标记）
- 📋 点击站点查看经过的所有线路
- 🗺️ 在地图上绘制完整路线轨迹
- 🎨 支持同时显示多条路线（不同颜色区分）
- ⏰ 显示运营时间、站点数量等详细信息
- 📏 可调节搜索半径（500m - 2km）

## 技术栈

- React + TypeScript
- Vite
- 高德地图 JS API 2.0
- Ant Design
- Zustand

## 快速开始

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 配置

在 `src/services/amapService.ts` 中配置高德地图 API Key。

## License

MIT
