#!/bin/bash

echo "=== 启动 LinkMind 生产环境 ==="

cd "$(dirname "$0")/../deploy"

stop_services() {
    echo "1. 停止旧服务..."
    docker-compose down
}

build_and_start() {
    echo "2. 构建并启动服务..."
    docker-compose --env-file .env.prod up -d --build
}

verify_services() {
    echo "3. 等待服务启动..."
    sleep 20
    
    echo "4. 验证服务..."
    if curl -s http://localhost:8000/api/v1/health | grep -q "healthy"; then
        echo "   ✅ 后端服务正常"
    else
        echo "   ❌ 后端服务异常"
        docker-compose logs backend
        exit 1
    fi
    
    echo ""
    echo "=== 生产环境启动完成 ==="
    echo ""
}

stop_services
build_and_start
verify_services
