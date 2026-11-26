import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { countNodes, countProps } from '@/utils/layout';
import { PALETTE } from '@/config/maps';

/**
 * 原型 HomePage：`#home .home-inner h1 选择知识地图` + `#dsGrid .ds-card` 网格 + `.new-card`。
 */
export function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const maps = useAppStore((s) => s.maps);
  const enterMap = useAppStore((s) => s.enterMap);
  const openModal = useAppStore((s) => s.openModal);

  return (
    <div id="home">
      <div className="home-inner">
        <h1>选择知识地图</h1>
        <p className="sub">每个区块是一张脑图的根节点，点击进入</p>
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
                  <b>{countNodes(m.nodes)}</b>节点
                </span>
                <span>
                  <b>{countProps(m)}</b>属性
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
