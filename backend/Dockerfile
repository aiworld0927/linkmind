FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Git 能力依赖 git CLI；推送 HTTPS/SSH 远端需要 ca-certificates / openssh-client
RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && git config --system --add safe.directory '*'

WORKDIR /app

# 先安装依赖（pyproject 已声明 packages = []，仅用于依赖安装），利用构建缓存
COPY pyproject.toml README.md ./
COPY alembic.ini ./
COPY alembic ./alembic
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir "alembic>=1.14.0" "pyjwt>=2.9.0" \
    && pip install --no-cache-dir .

COPY app ./app

# 启动前执行迁移（数据库未就绪时跳过，服务降级启动；正式部署可用 depends_on 保证顺序）
CMD ["sh", "-c", "python -m alembic upgrade head || true; uvicorn app.main:app --host 0.0.0.0 --port 8000"]
