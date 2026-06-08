#!/bin/bash
set -e

# 藍綠部署腳本 - Orderly Platform
# 實現零停機時間部署策略

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置變量
PROJECT_ID="${GCP_PROJECT_ID:-orderly-472413}"
REGION="${GCP_REGION:-asia-east1}"
ENVIRONMENT="${DEPLOY_ENV:-staging}"
# Use unified '-fastapi' service naming to match staging/prod conventions
SERVICES=("api-gateway-fastapi" "user-service-fastapi" "product-service-fastapi" "acceptance-service-fastapi")

# 健康檢查超時 (秒)
HEALTH_CHECK_TIMEOUT=300
HEALTH_CHECK_INTERVAL=10

# 流量切換策略
TRAFFIC_STRATEGY="${TRAFFIC_STRATEGY:-progressive}" # 'progressive' 或 'instant'

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}${1}${NC}"
}

# 獲取當前活躍版本 (藍或綠)
get_active_version() {
    local service_name="$1"
    local active_service="orderly-${service_name}-${ENVIRONMENT}"
    
    # 檢查當前流量分配
    local traffic_info=$(gcloud run services describe "$active_service" \
        --region="$REGION" \
        --format="value(status.traffic[0].tag)" 2>/dev/null || echo "")
    
    if [[ "$traffic_info" == *"blue"* ]]; then
        echo "blue"
    elif [[ "$traffic_info" == *"green"* ]]; then
        echo "green"
    else
        echo "blue" # 預設為藍版本
    fi
}

# 獲取新版本顏色
get_new_version() {
    local current_version="$1"
    if [ "$current_version" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# 部署新版本
deploy_new_version() {
    local service_name="$1"
    local new_version="$2"
    local image_url="$3"
    
    local service_full_name="orderly-${service_name}-${ENVIRONMENT}-${new_version}"
    
    log_info "部署 ${service_name} 的 ${new_version} 版本..."
    
    # 根據服務類型設定不同配置
    local port_config=""
    local memory_config="--memory=512Mi"
    local cpu_config="--cpu=1"
    local env_pairs=()
    local secret_binding=""

    build_db_env_pairs() {
        local -n _target=$1
        if [[ -n "${DATABASE_HOST:-}" ]]; then
            _target+=("DATABASE_HOST=${DATABASE_HOST}")
        fi
        if [[ -n "${DATABASE_PORT:-}" ]]; then
            _target+=("DATABASE_PORT=${DATABASE_PORT}")
        fi
        if [[ -n "${DATABASE_NAME:-}" ]]; then
            _target+=("DATABASE_NAME=${DATABASE_NAME}")
        fi
        if [[ -n "${DATABASE_USER:-}" ]]; then
            _target+=("DATABASE_USER=${DATABASE_USER}")
        fi
        if [[ -n "${POSTGRES_PASSWORD_SECRET:-}" ]]; then
            secret_binding="POSTGRES_PASSWORD=${POSTGRES_PASSWORD_SECRET}"
        elif [[ -n "${POSTGRES_PASSWORD:-}" ]]; then
            _target+=("POSTGRES_PASSWORD=${POSTGRES_PASSWORD}")
        fi
    }

    join_env_pairs() {
        local IFS=','
        echo "$*"
    }

    case $service_name in
        "api-gateway-fastapi")
            port_config="--port=8000"
            memory_config="--memory=1Gi"
            env_pairs=("NODE_ENV=${ENVIRONMENT}" "JWT_SECRET=${JWT_SECRET}")
            ;;
        "user-service-fastapi")
            port_config="--port=3001"
            env_pairs=("NODE_ENV=${ENVIRONMENT}")
            build_db_env_pairs env_pairs
            ;;
        "product-service-fastapi")
            port_config="--port=3003"
            env_pairs=("ENVIRONMENT=${ENVIRONMENT}")
            build_db_env_pairs env_pairs
            ;;
        "acceptance-service-fastapi")
            port_config="--port=3004"
            env_pairs=("NODE_ENV=${ENVIRONMENT}")
            build_db_env_pairs env_pairs
            ;;
    esac

    local env_arg=""
    if [[ ${#env_pairs[@]} -gt 0 ]]; then
        env_arg="--set-env-vars=$(join_env_pairs "${env_pairs[@]}")"
    fi

    local args=(
        --image="$image_url"
        --region="$REGION"
        --platform=managed
        --allow-unauthenticated
        $memory_config
        $cpu_config
        --max-instances=10
        --min-instances=0
        $port_config
        --tag="$new_version"
        --no-traffic
        --quiet
    )

    if [[ -n "$env_arg" ]]; then
        args+=("$env_arg")
    fi
    if [[ -n "$secret_binding" ]]; then
        args+=("--set-secrets=${secret_binding}")
    fi

    gcloud run deploy "$service_full_name" "${args[@]}"
    
    log_success "${service_name} ${new_version} 版本部署完成"
}

# 健康檢查
health_check() {
    local service_name="$1"
    local version="$2"
    
    local service_full_name="orderly-${service_name}-${ENVIRONMENT}-${version}"
    local health_url=$(gcloud run services describe "$service_full_name" \
        --region="$REGION" \
        --format="value(status.url)")
    
    log_info "執行 ${service_name} ${version} 健康檢查..."
    
    local start_time=$(date +%s)
    local success=false
    
    while [ $(($(date +%s) - start_time)) -lt $HEALTH_CHECK_TIMEOUT ]; do
        if curl -f "${health_url}/health" --silent --max-time 10 >/dev/null 2>&1; then
            success=true
            break
        fi
        
        log_info "等待服務就緒... ($(($(date +%s) - start_time))s / ${HEALTH_CHECK_TIMEOUT}s)"
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    if [ "$success" = true ]; then
        log_success "${service_name} ${version} 健康檢查通過"
        return 0
    else
        log_error "${service_name} ${version} 健康檢查失敗"
        return 1
    fi
}

# 漸進式流量切換
progressive_traffic_switch() {
    local service_name="$1"
    local old_version="$2"
    local new_version="$3"
    
    local main_service="orderly-${service_name}-${ENVIRONMENT}"
    local traffic_steps=(10 25 50 75 100)
    
    log_info "開始 ${service_name} 漸進式流量切換..."
    
    for traffic_percent in "${traffic_steps[@]}"; do
        local old_traffic=$((100 - traffic_percent))
        
        log_info "切換流量: ${new_version}=${traffic_percent}%, ${old_version}=${old_traffic}%"
        
        # 更新流量分配
        gcloud run services update-traffic "$main_service" \
            --region="$REGION" \
            --to-tags="${new_version}=${traffic_percent},${old_version}=${old_traffic}" \
            --quiet
        
        # 監控新版本健康狀態
        sleep 30
        if ! health_check "$service_name" "$new_version"; then
            log_error "新版本健康檢查失敗，回滾流量"
            rollback_traffic "$service_name" "$old_version" "$new_version"
            return 1
        fi
        
        log_success "流量切換至 ${traffic_percent}% 成功"
        
        # 在重要節點等待更長時間
        if [ "$traffic_percent" -eq 25 ] || [ "$traffic_percent" -eq 50 ]; then
            log_info "監控新版本穩定性..."
            sleep 60
        fi
    done
    
    log_success "${service_name} 流量完全切換至 ${new_version}"
}

# 即時流量切換
instant_traffic_switch() {
    local service_name="$1"
    local old_version="$2"
    local new_version="$3"
    
    local main_service="orderly-${service_name}-${ENVIRONMENT}"
    
    log_info "執行 ${service_name} 即時流量切換..."
    
    gcloud run services update-traffic "$main_service" \
        --region="$REGION" \
        --to-tags="${new_version}=100" \
        --quiet
    
    log_success "${service_name} 流量完全切換至 ${new_version}"
}

# 回滾流量
rollback_traffic() {
    local service_name="$1"
    local old_version="$2"
    local new_version="$3"
    
    local main_service="orderly-${service_name}-${ENVIRONMENT}"
    
    log_warning "回滾 ${service_name} 流量至 ${old_version}"
    
    gcloud run services update-traffic "$main_service" \
        --region="$REGION" \
        --to-tags="${old_version}=100" \
        --quiet
    
    log_success "${service_name} 流量已回滾至 ${old_version}"
}

# 清理舊版本
cleanup_old_version() {
    local service_name="$1"
    local old_version="$2"
    
    local old_service="orderly-${service_name}-${ENVIRONMENT}-${old_version}"
    
    log_info "清理 ${service_name} 舊版本 ${old_version}..."
    
    # 等待確認
    read -p "確認刪除舊版本 ${old_service}? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud run services delete "$old_service" \
            --region="$REGION" \
            --quiet
        log_success "${service_name} 舊版本已清理"
    else
        log_info "保留舊版本 ${old_service}"
    fi
}

# 主要部署流程
main_deployment() {
    local image_tag="${1:-latest}"
    
    log_header "🚀 開始藍綠部署 - Orderly Platform"
    log_info "環境: $ENVIRONMENT"
    log_info "專案: $PROJECT_ID"
    log_info "區域: $REGION"
    log_info "鏡像標籤: $image_tag"
    log_info "流量策略: $TRAFFIC_STRATEGY"
    
    # 驗證 GCP 認證
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1 >/dev/null; then
        log_error "未找到活躍的 GCP 認證"
        exit 1
    fi
    
    # 為每個服務執行藍綠部署
    for service in "${SERVICES[@]}"; do
        log_header "📦 部署服務: $service"
        
        # 獲取當前版本
        current_version=$(get_active_version "$service")
        new_version=$(get_new_version "$current_version")
        
        log_info "當前版本: $current_version"
        log_info "新版本: $new_version"
        
        # 構建鏡像 URL
        local image_url="asia-east1-docker.pkg.dev/${PROJECT_ID}/orderly/orderly-${service}:${image_tag}"
        
        # 部署新版本
        if ! deploy_new_version "$service" "$new_version" "$image_url"; then
            log_error "${service} 部署失敗"
            continue
        fi
        
        # 健康檢查
        if ! health_check "$service" "$new_version"; then
            log_error "${service} 健康檢查失敗，跳過流量切換"
            continue
        fi
        
        # 流量切換
        if [ "$TRAFFIC_STRATEGY" = "progressive" ]; then
            if ! progressive_traffic_switch "$service" "$current_version" "$new_version"; then
                log_error "${service} 漸進式切換失敗"
                continue
            fi
        else
            instant_traffic_switch "$service" "$current_version" "$new_version"
        fi
        
        # 最終健康檢查
        sleep 10
        if ! health_check "$service" "$new_version"; then
            log_error "${service} 最終健康檢查失敗，回滾"
            rollback_traffic "$service" "$current_version" "$new_version"
            continue
        fi
        
        log_success "${service} 藍綠部署完成！"
        
        # 可選：清理舊版本
        if [ "${AUTO_CLEANUP:-false}" = "true" ]; then
            cleanup_old_version "$service" "$current_version"
        fi
    done
    
    log_header "🎉 藍綠部署流程完成！"
}

# 腳本入口
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # 檢查參數
    if [ $# -eq 0 ]; then
        echo "使用方法: $0 <image-tag> [options]"
        echo ""
        echo "選項:"
        echo "  --strategy=progressive|instant  設定流量切換策略 (預設: progressive)"
        echo "  --env=staging|production        設定部署環境 (預設: staging)"
        echo "  --auto-cleanup                  自動清理舊版本"
        echo ""
        echo "環境變量:"
        echo "  GCP_PROJECT_ID     GCP 專案 ID"
        echo "  GCP_REGION         GCP 區域"
        echo "  DATABASE_HOST      Cloud SQL 連線名稱或主機"
        echo "  DATABASE_PORT      PostgreSQL 連線埠 (預設 5432)"
        echo "  DATABASE_NAME      資料庫名稱"
        echo "  DATABASE_USER      資料庫使用者"
        echo "  POSTGRES_PASSWORD  資料庫密碼（或設定 POSTGRES_PASSWORD_SECRET）"
        echo "  POSTGRES_PASSWORD_SECRET  Secret Manager 參考 (例: postgres-password:latest)"
        echo "  JWT_SECRET         JWT 密鑰"
        exit 1
    fi
    
    # 解析參數
    IMAGE_TAG="$1"
    shift
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --strategy=*)
                TRAFFIC_STRATEGY="${1#*=}"
                shift
                ;;
            --env=*)
                ENVIRONMENT="${1#*=}"
                shift
                ;;
            --auto-cleanup)
                AUTO_CLEANUP="true"
                shift
                ;;
            *)
                log_error "未知參數: $1"
                exit 1
                ;;
        esac
    done
    
    # 執行部署
    main_deployment "$IMAGE_TAG"
fi
