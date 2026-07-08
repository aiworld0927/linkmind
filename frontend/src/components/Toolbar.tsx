import { useState } from 'react';
import { Input, Button, Select, message, Modal } from 'antd';
import { SearchOutlined, PlusOutlined, DashOutlined, DownloadOutlined, UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import { useStore } from '@/store';
import { NodeModal } from './NodeModal';

export function Toolbar() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const {
    searchKeyword,
    setSearchKeyword,
    globalDisplayMode,
    setGlobalDisplayMode,
    exportData,
    importData,
    initMockData,
  } = useStore();

  const handleClearLevel = () => {
    Modal.confirm({
      title: '确认重置',
      content: (
        <div>
          <p>确定要重置画布并恢复默认数据吗？</p>
          <p style={{ color: '#ef4444', marginTop: '8px', fontSize: '13px' }}>
            ⚠️ 警告：此操作将清除当前所有自定义数据，无法恢复
          </p>
        </div>
      ),
      okText: '确认重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        initMockData();
        message.success('画布已重置');
      },
    });
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const exportPayload = exportData();
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-map-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('✅ 导出成功，文件已下载');
    } catch (error) {
      console.error('Export failed:', error);
      message.error('⚠️ 导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);

      try {
        const text = await file.text();
        const payload = JSON.parse(text);

        let importDataPayload;
        if (payload.data && payload.data.currentNodes) {
          importDataPayload = payload.data;
        } else if (payload.currentNodes) {
          importDataPayload = payload;
          message.warning('检测到旧版本备份文件，正在兼容导入');
        } else {
          message.error('无效的备份文件，文件格式不正确');
          return;
        }

        const nodeCount = importDataPayload.currentNodes.length;
        const hasBreadcrumbs = importDataPayload.breadcrumbs && importDataPayload.breadcrumbs.length > 0;
        const hasHistory = importDataPayload.levelHistory && importDataPayload.levelHistory.length > 0;

        Modal.confirm({
          title: '确认导入',
          content: (
            <div>
              <p>即将导入数据，将覆盖当前所有内容，确定吗？</p>
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ fontSize: '13px', color: '#666' }}>📋 导入信息：</div>
                <div style={{ fontSize: '13px', marginTop: '8px' }}>• 节点数量：{nodeCount}</div>
                <div style={{ fontSize: '13px' }}>• 面包屑层级：{hasBreadcrumbs ? importDataPayload.breadcrumbs.length : 0}</div>
                <div style={{ fontSize: '13px' }}>• 历史记录：{hasHistory ? importDataPayload.levelHistory.length : 0}</div>
                <div style={{ fontSize: '13px', marginTop: '8px', color: '#10b981' }}>• 文件版本：{importDataPayload.version || '未知版本'}</div>
              </div>
              <p style={{ color: '#ef4444', marginTop: '12px', fontSize: '13px' }}>
                ⚠️ 警告：此操作将覆盖当前所有数据，无法撤销
              </p>
            </div>
          ),
          okText: '确认导入',
          okType: 'danger',
          cancelText: '取消',
          onOk: () => {
            importData(importDataPayload);
            message.success('✅ 导入成功，数据已更新');
          },
        });
      } catch (error) {
        console.error('Import failed:', error);
        message.error('文件解析失败，请确保是有效的JSON文件');
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  };

  return (
    <>
      <div
        style={{
          height: '64px',
          backgroundColor: '#1f1f1f',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          justifyContent: 'space-between',
          borderBottom: '1px solid #333333',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '600' }}>
            🧠 知识地图画布
          </div>
          <Input
            placeholder="搜索节点..."
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ width: '280px', backgroundColor: '#333333', borderColor: '#444444' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ color: '#999999', fontSize: '14px' }}>展示模式:</div>
          <Select
            value={globalDisplayMode}
            onChange={(value) => setGlobalDisplayMode(value)}
            style={{ width: '120px', backgroundColor: '#333333', borderColor: '#444444' }}
            options={[
              { value: 'inner', label: '内嵌' },
              { value: 'popover', label: '悬浮弹窗' },
              { value: 'drawer', label: '右侧抽屉' },
            ]}
          />

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowAddModal(true)}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            新增节点
          </Button>

          <Button
            danger
            icon={<DashOutlined />}
            onClick={handleClearLevel}
            style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
          >
            重置画布
          </Button>

          <Button
            icon={isExporting ? <LoadingOutlined /> : <DownloadOutlined />}
            onClick={handleExport}
            loading={isExporting}
            style={{ backgroundColor: '#444444', borderColor: '#444444', color: '#ffffff' }}
          >
            导出数据
          </Button>

          <Button
            icon={isImporting ? <LoadingOutlined /> : <UploadOutlined />}
            onClick={handleImport}
            loading={isImporting}
            style={{ backgroundColor: '#444444', borderColor: '#444444', color: '#ffffff' }}
          >
            导入数据
          </Button>
        </div>
      </div>

      <NodeModal
        visible={showAddModal}
        onCancel={() => setShowAddModal(false)}
      />
    </>
  );
}
