# Database API Service

一个基于 Hono 框架构建的轻量级数据库 API 服务，支持 PostgreSQL 和 MongoDB，可部署至 Vercel、Cloudflare Workers 或本地 Node.js 环境。

## 功能特性

- ✅ 支持 PostgreSQL 和 MongoDB 数据库
- ✅ 公共 GET 接口获取随机数据
- ✅ 受保护的 POST 接口插入数据
- ✅ API Token 认证机制
- ✅ 数据结构 API Key 机制（用于创建新的数据结构）
- ✅ 可部署至 Vercel、Cloudflare Workers 或本地环境
- ✅ 支持多种数据库配置

## 技术栈

- **框架**: Hono
- **语言**: JavaScript (ES Modules)
- **数据库驱动**: pg (PostgreSQL), mongodb (MongoDB)
- **部署**: Vercel, Cloudflare Workers, Node.js
- **包管理器**: pnpm

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 文件为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加数据库连接信息和 API Token：

```env
# Database Configuration
DB_A_URL=postgresql://username:password@localhost:5432/database
DB_B_URL=mongodb://localhost:27017/another_database

# API Token for protected endpoints
# Used for inserting data via POST requests
API_TOKEN=your_secure_api_token_here

# Structure API Key for creating new data structures
# Used when inserting data into non-existent collections/tables
STRUCTURE_API_KEY=your_secure_structure_api_key_here
```

### 3. 启动服务

```bash
pnpm dev
```

服务将在 `http://localhost:3000` 运行。

## API 文档

### 基础 URL

```
http://localhost:3000
```

### 1. 获取随机数据

**GET /api/:dbAbbr**

获取指定数据库的随机数据（只读访问）。

#### 参数

| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| dbAbbr | 路径参数 | 数据库缩写（对应环境变量 DB_<ABBR>_URL） | `a` 对应 `DB_A_URL` |

#### 示例请求

```bash
curl http://localhost:3000/api/a
```

#### 示例响应

```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Example 1" },
    { "id": 2, "name": "Example 2" }
  ],
  "count": 2,
  "database": "a"
}
```

### 2. 插入数据

**POST /api/:dbAbbr**

向指定数据库插入数据（需要 API Token 认证）。

#### 参数

| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| dbAbbr | 路径参数 | 数据库缩写（对应环境变量 DB_<ABBR>_URL） | `a` 对应 `DB_A_URL` |
| Authorization | 请求头 | Bearer Token | `Bearer your_api_token` |

#### 请求体

JSON 格式的数据对象。

#### 示例请求

```bash
curl -X POST \
  http://localhost:3000/api/a \
  -H "Authorization: Bearer your_api_token" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Item", "value": 123}'
```

#### 示例响应

```json
{
  "success": true,
  "data": { "id": 3, "name": "New Item", "value": 123 },
  "message": "Data inserted successfully",
  "database": "a"
}
```

### 3. 插入数据并创建数据结构

当向不存在数据结构（MongoDB集合或PostgreSQL表）的数据库插入数据时，需要使用 `STRUCTURE_API_KEY` 进行认证。

#### 参数

| 参数名 | 类型 | 描述 | 示例 |
|--------|------|------|------|
| dbAbbr | 路径参数 | 数据库缩写（对应环境变量 DB_<ABBR>_URL） | `a` 对应 `DB_A_URL` |
| Authorization | 请求头 | Bearer Token (必须是 `STRUCTURE_API_KEY`) | `Bearer your_structure_api_key` |

#### 请求体

JSON 格式的数据对象。系统会根据数据自动推断数据结构。

#### 示例请求

```bash
curl -X POST \
  http://localhost:3000/api/a \
  -H "Authorization: Bearer your_structure_api_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Item", "value": 123, "active": true, "created_at": "2024-01-01T00:00:00Z"}'
```

#### 示例响应

```json
{
  "success": true,
  "data": { "id": 1, "name": "New Item", "value": 123, "active": true, "created_at": "2024-01-01T00:00:00Z" },
  "message": "Data structure created and data inserted successfully",
  "database": "a"
}
```

## 数据库配置

### 环境变量格式

```env
DB_<ABBR>_URL=<DATABASE_URL>
```

### 支持的数据库 URL 格式

#### PostgreSQL

```
postgresql://username:password@localhost:5432/database
postgres://username:password@localhost:5432/database
```

#### MongoDB

```
mongodb://localhost:27017/database
mongodb+srv://username:password@cluster0.example.com/database
```

### 示例配置

```env
# PostgreSQL 配置
DB_A_URL=postgresql://zanzhu:HjR5L2B4RTkc@199.68.217.243:5432/zanzhu

# MongoDB 配置  
DB_B_URL=mongodb://localhost:27017/mydatabase
```

## API Token 管理

### 生成 API Token

API Token 是一个简单的字符串，建议使用强密码生成器生成，推荐长度为16位。例如：

```
API_TOKEN=Z7e7Z9X7Y8W6V5U4
```

### 生成 Structure API Key

Structure API Key 用于创建新的数据结构，同样建议使用强密码生成器生成，推荐长度为16位。例如：

```
STRUCTURE_API_KEY=A1b2C3d4E5f6G7h8
```

### Token 认证

所有 POST 请求必须在请求头中包含有效的 API Token：

```
Authorization: Bearer your_api_token
```

当需要创建新的数据结构时，必须使用 Structure API Key：

```
Authorization: Bearer your_structure_api_key
```

## 部署选项

### 1. 本地 Node.js 环境

```bash
pnpm dev
```

### 2. Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 部署即可

### 3. Cloudflare Workers 部署

使用 Wrangler CLI 部署：

```bash
pnpm install -g wrangler
wrangler login
wrangler deploy
```

## 项目结构

```
.
├── src/
│   ├── api/
│   │   └── database.js       # 数据库 API 处理逻辑
│   ├── utils/
│   │   ├── auth.js           # 认证中间件
│   │   └── db.js             # 数据库连接管理
│   └── index.js              # 应用入口
├── .env                      # 环境变量配置
├── .env.example              # 环境变量示例
├── package.json
├── pnpm-lock.yaml
├── vercel.json               # Vercel 配置
└── wrangler.toml             # Cloudflare Workers 配置
```

## API 响应格式

### 成功响应

```json
{
  "success": true,
  "data": [...],          # 数据内容
  "count": 2,             # 数据数量（GET 请求）
  "message": "...",       # 成功消息（POST 请求）
  "database": "a"         # 数据库缩写
}
```

### 错误响应

```json
{
  "success": false,
  "error": "错误信息",     # 错误描述
  "database": "a"         # 数据库缩写
}
```

## 错误代码

| 状态码 | 描述 |
|--------|------|
| 200 | 成功 |
| 400 | 请求格式错误 |
| 401 | 无效或缺失 Token |
| 500 | 服务器内部错误 |

## 使用示例

### 获取随机数据

```javascript
// JavaScript fetch 示例
fetch('http://localhost:3000/api/a')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### 插入数据

```javascript
// JavaScript fetch 示例
const apiToken = 'your_api_token';
const data = { name: 'New Item', value: 456 };

fetch('http://localhost:3000/api/a', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiToken}`
  },
  body: JSON.stringify(data)
})
  .then(response => response.json())
  .then(result => console.log(result))
  .catch(error => console.error('Error:', error));
```

## 开发

### 运行开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

## 许可证

MIT
