import { useAppStore } from '@/store';

export function LogDrawer(): JSX.Element {
  const logOpen = useAppStore((s) => s.logOpen);
  const log = useAppStore((s) => s.log);
  const toggleLog = useAppStore((s) => s.toggleLog);

  return (
    <div id="log" className={logOpen ? 'on' : ''}>
      <div className="lh">
        <b>操作记录</b>
        <button className="mini" onClick={() => toggleLog(false)}>
          关闭
        </button>
      </div>
      <div className="lb">
        {log.length ? (
          log.map((o, i) => (
            <div className="op" key={i}>
              <span className="ot">{o.t}</span>
              <span>{o.text}</span>
            </div>
          ))
        ) : (
          <div className="empty">暂无操作记录</div>
        )}
      </div>
    </div>
  );
}

export default LogDrawer;
