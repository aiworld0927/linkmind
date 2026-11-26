import type { TreeMap } from '@/types';

/**
 * 原型 demo-mindmap.html 中 MAPS 数组的 TypeScript 版本。
 * 保持与原型完全一致的递归结构与 note 字段，供首页和脑图画布直接使用。
 */
export const PALETTE: readonly string[] = [
  '#1d4ed8',
  '#0f766e',
  '#b45309',
  '#7e22ce',
  '#b91c1c',
  '#0369a1',
  '#4d7c0f',
  '#a16207',
];

export const SEED_MAPS: TreeMap[] = [
  {
    id: 'map-ml-basic',
    title: '机器学习基础',
    desc: '算法、框架与评估体系的知识地图',
    props: [],
    nodes: [
      {
        id: 'ml-basic',
        name: '机器学习基础',
        props: [
          { label: '核心概念', note: { c: '监督学习是从标注数据中学习映射关系的机器学习方法。', t: ['算法', '基础'], r: '核心概念' } },
          { label: '聚类常用', note: { c: '无监督学习用于从未标注数据中发现模式和结构。', t: ['算法', '基础'], r: '聚类常用' } },
          { label: 'AlphaGo 使用', note: { c: '强化学习通过与环境交互获得奖励来学习最优策略。', t: ['算法', '进阶'], r: 'AlphaGo 使用' } },
          { label: '工业常用', note: { c: '半监督学习结合少量标注数据和大量未标注数据进行学习。', t: ['算法', '进阶'], r: '工业常用' } },
          { label: '深度学习必备', note: { c: '迁移学习将从一个任务中学到的知识应用到另一个相关任务。', t: ['算法', '热门'], r: '深度学习必备' } },
        ],
        children: [],
      },
      {
        id: 'ml-framework',
        name: '深度学习框架',
        props: [
          { label: '最流行', note: { c: 'TensorFlow 是 Google 开发的开源机器学习框架。', t: ['框架', 'Google'], r: '最流行' } },
          { label: '研究首选', note: { c: 'PyTorch 是 Facebook 开发的深度学习框架，支持动态计算图。', t: ['框架', 'Facebook'], r: '研究首选' } },
          { label: '科研新宠', note: { c: 'JAX 是 Google 的高性能数值计算库，支持自动微分。', t: ['框架', 'Google'], r: '科研新宠' } },
          { label: '云服务集成', note: { c: 'MXNet 是 Amazon 支持的深度学习框架，多语言支持。', t: ['框架', 'Amazon'], r: '云服务集成' } },
        ],
        children: [],
      },
      {
        id: 'ml-preprocess',
        name: '数据预处理',
        props: [
          { label: '第一步', note: { c: '数据清洗包括处理缺失值、异常值和重复数据。', t: ['数据', '基础'], r: '第一步' } },
          { label: '决定上限', note: { c: '特征工程是从原始数据中提取有意义特征的过程。', t: ['数据', '重要'], r: '决定上限' } },
          { label: '常用', note: { c: '数据标准化将特征缩放到相同尺度，加速收敛。', t: ['数据', '技巧'], r: '常用' } },
          { label: '图像必备', note: { c: '数据增强通过变换数据增加训练样本多样性。', t: ['数据', 'CV'], r: '图像必备' } },
        ],
        children: [],
      },
      {
        id: 'ml-evaluate',
        name: '模型评估',
        props: [
          { label: '基础指标', note: { c: '准确率是分类正确的样本占总样本的比例。', t: ['评估', '分类'], r: '基础指标' } },
          { label: '关注误报', note: { c: '精确率衡量预测为正的样本中有多少是真正的正样本。', t: ['评估', '分类'], r: '关注误报' } },
          { label: '关注漏报', note: { c: '召回率衡量所有正样本中有多少被正确预测。', t: ['评估', '分类'], r: '关注漏报' } },
          { label: '平衡指标', note: { c: 'F1 分数是精确率和召回率的调和平均数。', t: ['评估', '分类'], r: '平衡指标' } },
          { label: '常用', note: { c: 'AUC-ROC 曲线衡量模型在不同阈值下的分类能力。', t: ['评估', '分类'], r: '常用' } },
        ],
        children: [],
      },
      { id: 'ml-nlp', name: '自然语言处理', props: [], children: [] },
    ],
  },
  {
    id: 'map-pd-flow',
    title: '产品研发流程',
    desc: '从需求到发布的标准流程节点',
    props: [],
    nodes: [
      {
        id: 'pd-demand',
        name: '需求洞察',
        props: [
          { label: '季度输入', note: { c: '通过用户访谈和数据分析识别真实痛点，形成需求池。', t: ['调研', '需求'], r: '季度输入' } },
          { label: '评审必看', note: { c: '用价值-成本矩阵对需求排序，优先解决高价值低复杂度项。', t: ['优先级'], r: '评审必看' } },
        ],
        children: [],
      },
      {
        id: 'pd-design',
        name: '方案设计',
        props: [
          { label: '可评审', note: { c: '输出交互原型与信息架构，明确关键路径。', t: ['设计', '原型'], r: '可评审' } },
          { label: '前后端对齐', note: { c: '组织技术方案评审，同步接口契约与数据模型。', t: ['评审'], r: '前后端对齐' } },
        ],
        children: [],
      },
      {
        id: 'pd-develop',
        name: '研发交付',
        props: [
          { label: '站会', note: { c: '按迭代拆分任务，每日同步阻塞项与风险。', t: ['迭代', '协作'], r: '站会' } },
          { label: '门禁', note: { c: '提交前必须通过单元测试与静态检查。', t: ['质量'], r: '门禁' } },
        ],
        children: [],
      },
      {
        id: 'pd-test',
        name: '测试验收',
        props: [
          { label: '必跑', note: { c: '覆盖核心链路的自动化回归，保障上线质量。', t: ['测试', '自动化'], r: '必跑' } },
          { label: '签字确认', note: { c: '产品与业务共同验收，确认指标与埋点。', t: ['验收'], r: '签字确认' } },
        ],
        children: [],
      },
      {
        id: 'pd-release',
        name: '发布复盘',
        props: [{ label: '闭环', note: { c: '上线后 48 小时观察核心指标并完成复盘。', t: ['发布', '复盘'], r: '闭环' } }],
        children: [],
      },
    ],
  },
];

/** 递归深拷贝，保证 store 内部对 maps 做的 mutations 不会反向污染种子数据。 */
export function cloneMaps(maps: TreeMap[]): TreeMap[] {
  return JSON.parse(JSON.stringify(maps)) as TreeMap[];
}
