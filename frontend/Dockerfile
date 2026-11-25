# ---- 前端多阶段构建 ----
# 阶段 1：Node 镜像安装依赖 + 生产构建
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制锁文件与清单，最大化 Docker 缓存命中率
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# 阶段 2：Nginx 镜像托管静态资源
FROM nginx:1.27-alpine

# 删除默认站点，使用自定义 nginx.conf 处理 SPA 回退与 /api 反代
RUN rm -rf /usr/share/nginx/html/* /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 --start-period=5s \
  CMD wget -qO- http://localhost/healthz >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
