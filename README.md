# 私域批量成片工作流

一个可独立部署的中文私域短视频批量策划工具。输入多条转化文案后，系统从素材库随机取材，按四种版式匹配 BGM，并导出 JSON/CSV 成片配置方案。

## 已包含

- 按空行批量拆分文案
- Fisher–Yates 随机素材选择，单批最多 4 条且不重复
- 数据对比、同城圈层、女性成长、品质社交四种竖屏版式
- 8 秒/10 秒视频规格
- 随机或固定 BGM 与试听
- 首帧 0.08 秒保护策略，避免封面抓到纯黑帧
- JSON/CSV 方案导出
- 本地演示素材
- 远程素材与 BGM 适配层，访问令牌只保留在服务端
- 媒体代理来源白名单，避免任意地址代理

本仓库默认只生成 `planned` 状态的配置方案，不调用付费渲染接口。后续可以将导出的 JSON 交给 FFmpeg、Remotion、HyperFrames 或已有的视频渲染服务。

## 本地启动

需要 Node.js 20 或更高版本，无需安装第三方依赖。

```bash
cp .env.example .env
npm start
```

打开 `http://localhost:3000`。未配置远程接口时，会自动使用 `data/assets.json` 中的四张演示素材。

Windows PowerShell：

```powershell
Copy-Item .env.example .env
npm start
```

## 接入服务器素材库

编辑 `.env`：

```dotenv
MATERIAL_API_URL=https://example.com/api/video/assets?limit=120
MATERIAL_FILE_BASE_URL=https://example.com/api/files/
MATERIAL_BEARER_TOKEN=replace-me

BGM_MANIFEST_URL=https://example.com/assets/bgm/manifest.json
BGM_FILE_BASE_URL=https://example.com/assets/bgm/
BGM_BEARER_TOKEN=replace-me-if-required
```

素材接口支持数组或 `{ "items": [...] }`，素材项支持：

```json
{
  "title": "团队交流现场",
  "video_url": "https://example.com/media/team.mp4"
}
```

BGM 接口支持数组或 `{ "tracks": [...] }`，音乐项支持：

```json
{
  "title": "积极成长",
  "url": "https://example.com/music/growth.mp3"
}
```

相对媒体路径会基于对应的 `*_FILE_BASE_URL` 解析。服务端只代理清单地址或文件基址同源的媒体，令牌不会发送到浏览器。

## 验证

```bash
npm test
node --check server.mjs
```

## Docker

```bash
docker build -t private-domain-video-workflow .
docker run --rm -p 3000:3000 --env-file .env private-domain-video-workflow
```

## 输出契约

JSON 文件包含 `version`、`created_at` 和 `items`。每个方案包含：文案、模板、时长、素材、BGM、首帧偏移和 `planned` 状态。渲染执行器应消费该契约，并自行负责鉴权、幂等、计费、失败重试和产物存储。

## 素材与音乐版权

仓库不包含参考视频中提取的商业音乐。部署时请只配置拥有合法使用权的素材与 BGM。
