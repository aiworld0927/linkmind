import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useStore } from '@/store';

export function Breadcrumbs() {
  const breadcrumbs = useStore((state) => state.breadcrumbs);
  const resetToRoot = useStore((state) => state.resetToRoot);
  const backToBreadLevel = useStore((state) => state.backToBreadLevel);

  const items = breadcrumbs.map((item, index) => {
    const isLast = index === breadcrumbs.length - 1;
    return {
      title: isLast ? (
        <span className="lm-breadcrumb-current">{item.name}</span>
      ) : (
        <span className="lm-breadcrumb-link" onClick={() => backToBreadLevel(index)}>
          {item.name}
        </span>
      ),
    };
  });

  return (
    <div className="lm-breadcrumb-bar">
      <Breadcrumb
        items={[
          {
            title: (
              <span className="lm-breadcrumb-link" onClick={resetToRoot}>
                <HomeOutlined />
                <span style={{ marginLeft: 4 }}>首页</span>
              </span>
            ),
          },
          ...items,
        ]}
        separator="/"
      />
    </div>
  );
}
