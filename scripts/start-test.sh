#!/bin/bash

echo "=== 启动 LinkMind 测试环境 ==="

cd "$(dirname "$0")/../deploy"

stop_services() {
    echo "1. 停止旧服务..."
    docker-compose down
}

build_and_start() {
    echo "2. 构建并启动服务..."
    docker-compose --env-file .env.test up -d --build
}

verify_services() {
    echo "3. 等待服务启动..."
    sleep 15
    
    echo "4. 验证服务..."
    if curl -s http://localhost:8000/api/v1/health | grep -q "healthy"; then
        echo "   ✅ 后端服务正常"
    else
        echo "   ❌ 后端服务异常"
        docker-compose logs backend
        exit 1
    fi
    
    echo ""
    echo "=== 测试环境启动完成 ==="
    echo "前端页面: http://localhost:8000/frontend"
    echo "API文档: http://localhost:8000/docs"
    echo "Neo4j控制台: http://localhost:7474"
    echo ""
}

stop_services
build_and_start
verify_services
