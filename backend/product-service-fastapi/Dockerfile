# 多階段構建 - FastAPI服務標準模板
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 依賴安裝階段
FROM base AS deps

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

COPY product-service-fastapi/requirements.txt ./
RUN pip install --user --no-warn-script-location -r requirements.txt

# 運行階段
FROM base AS runtime

RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# 複製依賴
COPY --from=deps /root/.local /root/.local

# 複製共享庫
COPY libs ./libs

# 複製應用程式
COPY product-service-fastapi/app ./app
COPY product-service-fastapi/alembic.ini ./alembic.ini
COPY product-service-fastapi/alembic ./alembic

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app/libs

# 動態端口配置 - Cloud Run 兼容 (預設8080)
ARG DEFAULT_PORT=8080
EXPOSE 8080

# 健康檢查 - 使用動態端口
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# 啟動命令 - 支援動態端口
CMD ["sh", "-c", "alembic upgrade head 2>/dev/null || true && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]