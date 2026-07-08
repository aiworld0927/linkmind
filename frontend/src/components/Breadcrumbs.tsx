import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useStore } from '@/store';

export function Breadcrumbs() {
  const { breadcrumbs, resetToRoot, backToBreadLevel } = useStore();

  const items = breadcrumbs.map((item, index) => ({
    title: (
      <span
        style={{ cursor: 'pointer', color: '#1890ff' }}
        onClick={() => backToBreadLevel(index)}
      >
        {item.name}
      </span>
    ),
  }));

  return (
    <Breadcrumb
      items={[
        {
          title: (
            <span
              style={{ cursor: 'pointer', color: '#1890ff' }}
              onClick={resetToRoot}
            >
              <HomeOutlined />
              <span style={{ marginLeft: '4px' }}>首页</span>
            </span>
          ),
        },
        ...items,
      ]}
      separator=">"
      style={{
        marginBottom: '0',
      }}
    />
  );
}
