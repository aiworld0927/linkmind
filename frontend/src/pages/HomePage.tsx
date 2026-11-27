import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { countNodes, countProps } from '@/utils/layout';
import { PALETTE } from '@/config/maps';

/**
 * HomePage：从后端 C-1 拉取地图列表，网格展示；新增/编辑/删除全部走后端。
 */
export function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const maps = useAppStore((s) => s.maps);
  const mapsLoading = useAppStore((s) => s.mapsLoading);
  const mapsError = useAppStore((s) => s.mapsError);
  const enterMap = useAppStore((s) => s.enterMap);
  const openModal = useAppStore((s) => s.openModal);

  return (
    <div id="home">
      <div className="home-inner">
        <h1>选择知识地图</h1>
        <p className="sub">每个区块是一张脑图的根节点，点击进入</p>
        {mapsError && (
          <div className="empty-state" role="alert" style={{ color: '#b91c1c' }}>
            加载失败：{mapsError}
          </div>
        )}
        {mapsLoading && maps.length === 0 && (
          <div className="empty-state">加载知识地图…</div>
        )}
        <div id="dsGrid">
          {maps.map((m, i) => (
            <div
              key={m.id}
              className="ds-card"
              style={{ ['--c' as unknown as string]: PALETTE[i % PALETTE.length] }}
              onClick={() => {
                enterMap(m.id);
                navigate(`/map/${m.id}`);
              }}
            >
              <div className="accent" />
              <h3>{m.title}</h3>
              <p>{m.desc || ''}</p>
              <div className="stats">
                <span>
                  <b>{m.loaded ? countNodes(m.nodes) : m.node_count ?? 0}</b>节点
                </span>
                <span>
                  <b>{m.loaded ? countProps(m) : m.prop_count ?? 0}</b>属性
                </span>
              </div>
              {m.repo?.name && <div className="repo-tag">仓库：{m.repo.name}</div>}
              <span className="arrow">进入 →</span>
              <div className="card-act">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = maps.findIndex((x) => x.id === m.id);
                    openModal({ kind: 'map', mode: 'edit', index: idx });
                  }}
                >
                  编辑
                </button>
                <button
                  className="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal({ kind: 'map', mode: 'delete', index: maps.findIndex((x) => x.id === m.id) });
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}

          <div
            className="new-card"
            onClick={() => openModal({ kind: 'map', mode: 'create', index: -1 })}
          >
            <div className="plus">＋</div>
            <span>新建知识地图</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
