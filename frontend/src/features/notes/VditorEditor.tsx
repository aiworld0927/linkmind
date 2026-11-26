import { useEffect, useRef } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';

interface VditorEditorProps {
  /** 初始 Markdown 内容（仅首次挂载生效，后续用 setValue 同步） */
  initialValue: string;
  /** Typora-like mode：ir 即时渲染，sv 分屏，wysiwyg 所见即所得 */
  mode?: 'ir' | 'sv' | 'wysiwyg';
  /** 编辑器高度 */
  height?: number | string;
  /** 内容变化时回调 */
  onChange?: (value: string) => void;
  /** 暴露编辑器实例，父组件可 getValue/setValue */
  onReady?: (editor: Vditor) => void;
}

/**
 * Vditor 编辑器组件 — Typora 体验（ir 即时渲染模式）。
 * 关键约定：
 * - 只初始化一次（effect 依赖为空），避免 React StrictMode / 重渲染反复创建
 * - 资源走本地 /vditor（public/vditor），不依赖外网 CDN
 * - 卸载时 destroy 并清空容器，防止 StrictMode 二次挂载时残留 DOM 报错
 * - 外部内容变化用 setValue 同步，不重建实例
 */
export function VditorEditor({
  initialValue,
  mode = 'ir',
  height = 720,
  onChange,
  onReady,
}: VditorEditorProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<Vditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let instance: Vditor | null = null;

    try {
      instance = new Vditor(host, {
        cdn: '/vditor',
        lang: 'zh_CN',
        mode,
        height,
        placeholder: '开始书写，支持 Markdown…',
        value: initialValue,
        toolbar: [
          'emoji',
          'headings',
          'bold',
          'italic',
          'strike',
          '|',
          'line',
          'quote',
          'list',
          'ordered-list',
          'check',
          'outdent',
          'indent',
          '|',
          'code',
          'inline-code',
          'table',
          '|',
          'link',
          'undo',
          'redo',
          '|',
          'outline',
          'fullscreen',
          'edit-mode',
        ],
        toolbarConfig: { pin: true },
        cache: { enable: false },
        undoDelay: 500,
        input: (value: string) => {
          if (!disposed) onChangeRef.current?.(value);
        },
        after: () => {
          if (disposed) return;
          instanceRef.current = instance;
          if (instance) onReadyRef.current?.(instance);
        },
      });
    } catch (error) {
      console.error('[linkmind] Vditor 初始化失败:', error);
    }

    return () => {
      disposed = true;
      instanceRef.current = null;
      try {
        instance?.destroy();
      } catch (error) {
        console.warn('[linkmind] Vditor 销毁异常:', error);
      }
      // StrictMode 下会挂载两次，必须清空残留节点
      host.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部 initialValue 变化时，setValue 同步（不重建实例）
  useEffect(() => {
    const v = instanceRef.current;
    if (!v) return;
    if (v.getValue() !== initialValue) v.setValue(initialValue);
  }, [initialValue]);

  return <div ref={hostRef} className="lm-vditor-editor" />;
}

export default VditorEditor;
