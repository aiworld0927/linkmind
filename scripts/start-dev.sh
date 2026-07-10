#!/bin/bash

echo "=== 启动 LinkMind 开发环境 ==="

check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "错误: Docker 未运行，请先启动 Docker"
        exit 1
    fi
}

start_neo4j() {
    echo "1. 检查并启动 Neo4j 数据库..."
    
    if docker ps | grep -q "neo4j-dev"; then
        echo "   Neo4j 已在运行"
    elif docker ps -a | grep -q "neo4j-dev"; then
        echo "   启动已存在的 Neo4j 容器..."
        docker start neo4j-dev
    else
        echo "   创建并启动 Neo4j 容器..."
        docker run -d \
          --name neo4j-dev \
          -p 7687:7687 \
          -p 7474:7474 \
          -e NEO4J_AUTH=neo4j/password \
          -e NEO4J_dbms_memory_pagecache_size=512M \
          -e NEO4J_dbms_memory_heap_max__size=1G \
          neo4j:5.26.0
        
        echo "   等待 Neo4j 启动..."
        sleep 15
    fi
}

install_dependencies() {
    echo "2. 安装项目依赖..."
    cd "$(dirname "$0")/../backend"
    echo pwd "$(pwd -)"
    if [ ! -d ".venv" ]; then
        echo "   创建虚拟环境..."
        python -m venv .venv
    fi
    
    source .venv/bin/activate
    
    if ! pip list | grep -q "fastapi"; then
        echo "   安装依赖包..."
        pip install -e .
    else
        echo "   依赖已安装"
    fi
}

start_backend() {
    echo "3. 启动后端服务..."
    cd "$(dirname "$0")/../backend/src"
    
    source ../.venv/bin/activate
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    echo ""
    echo "=== LinkMind 开发环境启动完成 ==="
    echo "前端页面: http://${SERVER_IP}:8000/"
    echo "API文档: http://${SERVER_IP}:8000/docs"
    echo "Neo4j控制台: http://${SERVER_IP}:7474"
    echo ""
    echo "注意: 请使用服务器IP地址访问，不要使用localhost"
    echo ""
    
    python main.py
}

check_docker
start_neo4j
install_dependencies
start_backend
