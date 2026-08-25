# 私域批量成片工作流

一个可独立部署的中文私域短视频批量策划工具。输入多条转化文案后，系统从素材库随机取材，按四种版式匹配 BGM，并导出 JSON/CSV 成片配置方案。

## 已包含

- 按空行批量拆分文案
- Fisher–Yates 随机素材选择，单批最多 4 条且不重复
- 数据对比、同城圈层、女性成长、品质社交四种竖屏版式
- 8 秒/10 秒视频规格
- BGM 只从测试服务器素材库随机抽取；批量数量足够时不重复
- 每条默认 2 张图片 + 1 段视频，第一张图片从第 0 帧显示，避免黑屏
- 自动提取 1-3 个关键词、数字或 CTA 并放大到正文的 1.18-1.35 倍
- JSON/CSV 方案导出
- 本地演示素材
- 测试服务器文件系统素材库只读扫描与 Range 播放
- 远程画面素材适配层，访问令牌只保留在服务端
- 媒体代理来源白名单，避免任意地址代理

本仓库默认只生成 `planned` 状态的配置方案，不调用付费渲染接口。后续可以将导出的 JSON 交给 FFmpeg、Remotion、HyperFrames 或已有的视频渲染服务。

仓库内的 `codex-skill/private-domain-short-video/` 是可安装的 Codex Skill 正本。它会在没有用户素材时先只读查询黄雀测试服务器素材库，并只把最终选中的文件暂存到当前任务工作区；SSH 凭据不进入仓库。

## 本地启动

需要 Node.js 20 或更高版本，无需安装第三方依赖。

```bash
cp .env.example .env
npm start
```

打开 `http://localhost:3000`。服务端优先只读扫描 `MATERIAL_LIBRARY_ROOT`：图片/视频进入画面素材池，MP3/M4A/WAV/AAC/FLAC/OGG 进入 BGM 池。该目录不存在时才使用本地演示数据；没有足够 BGM 时批量方案会停止，不会生成替代音乐。

Windows PowerShell：

```powershell
Copy-Item .env.example .env
npm start
```

## 接入服务器素材库

部署到黄雀测试服务器时使用固定只读目录（生产服务器不在本工作流范围内）：

```dotenv
MATERIAL_LIBRARY_ROOT=/home/ubuntu/material-libraries/huangque-media
MATERIAL_LIBRARY_LIMIT=500
```

服务端递归读取 MP4/MOV/M4V/WebM/JPG/PNG/WebP 和 MP3/M4A/WAV/AAC/FLAC/OGG，忽略符号链接，通过受控 `/api/library-media` 路由提供媒体并支持 HTTP Range。浏览器不会获得服务器绝对路径，工作流不会写入、移动或删除素材库文件。

服务默认仅监听 `127.0.0.1`，不要直接把素材路由暴露到公网。需要远程访问时，应通过已有认证层或受控反向代理转发；不要把 `HOST` 改为公网监听地址来绕过鉴权。

若已有专用 HTTP 素材接口，可用以下配置覆盖文件系统模式：

编辑 `.env`：

```dotenv
MATERIAL_API_URL=https://example.com/api/video/assets?limit=120
MATERIAL_FILE_BASE_URL=https://example.com/api/files/
MATERIAL_BEARER_TOKEN=replace-me
```

素材接口支持数组或 `{ "items": [...] }`，素材项支持：

```json
{
  "title": "团队交流现场",
  "video_url": "https://example.com/media/team.mp4"
}
```

`/api/bgm` 只返回 `MATERIAL_LIBRARY_ROOT` 内的音频文件，并使用同一个只读媒体路由提供试听。远程画面素材的相对路径会基于 `MATERIAL_FILE_BASE_URL` 解析，令牌不会发送到浏览器。

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

JSON 文件包含 `version`、`created_at` 和 `items`。每个方案包含：文案、模板、时长、2 图 1 视频素材、测试库 BGM、关键词放大配置、`image-from-frame-zero` 首帧策略和 `planned` 状态。渲染执行器应消费该契约，并自行负责鉴权、幂等、计费、失败重试和产物存储。

## 素材与音乐版权

仓库不包含参考视频中提取的商业音乐。部署时请只配置拥有合法使用权的素材与 BGM。
