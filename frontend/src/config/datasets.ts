import dayjs from 'dayjs';
import type { GraphDataset, ListItem, NodeItem } from '@/types';

const timeAgo = (days: number): string =>
  dayjs().subtract(days, 'day').format('YYYY-MM-DD HH:mm:ss');

const note = (
  parentNodeId: string,
  content: string,
  tagList: string[],
  remark: string,
  days: number,
): ListItem => ({
  id: `note-${parentNodeId}-${Math.random().toString(36).slice(2, 10)}`,
  content,
  tagList,
  remark,
  createTime: timeAgo(days),
  parentNodeId,
});

const node = (
  id: string,
  name: string,
  dependencies: string[],
  children: ListItem[],
  isExpanded: boolean,
  displayMode: NodeItem['displayMode'],
  days: number,
): NodeItem => ({
  id,
  name,
  dependencies,
  children,
  isExpanded,
  displayMode,
  createTime: timeAgo(days),
});

const machineLearningNodes: NodeItem[] = [
  node(
    'ml-basic',
    '机器学习基础',
    [],
    [
      note('ml-basic', '监督学习是从标注数据中学习映射关系的机器学习方法。', ['算法', '基础'], '核心概念', 7),
      note('ml-basic', '无监督学习用于从未标注数据中发现模式和结构。', ['算法', '基础'], '聚类常用', 7),
      note('ml-basic', '强化学习通过与环境交互获得奖励来学习最优策略。', ['算法', '进阶'], 'AlphaGo 使用', 7),
      note('ml-basic', '半监督学习结合少量标注数据和大量未标注数据进行学习。', ['算法', '进阶'], '工业常用', 7),
      note('ml-basic', '迁移学习将从一个任务中学到的知识应用到另一个相关任务。', ['算法', '热门'], '深度学习必备', 7),
    ],
    true,
    'inner',
    7,
  ),
  node(
    'ml-framework',
    '深度学习框架',
    ['ml-basic'],
    [
      note('ml-framework', 'TensorFlow 是 Google 开发的开源机器学习框架。', ['框架', 'Google'], '最流行', 5),
      note('ml-framework', 'PyTorch 是 Facebook 开发的深度学习框架，支持动态计算图。', ['框架', 'Facebook'], '研究首选', 5),
      note('ml-framework', 'JAX 是 Google 的高性能数值计算库，支持自动微分。', ['框架', 'Google'], '科研新宠', 5),
      note('ml-framework', 'MXNet 是 Amazon 支持的深度学习框架，多语言支持。', ['框架', 'Amazon'], '云服务集成', 5),
    ],
    false,
    'popover',
    5,
  ),
  node(
    'ml-preprocess',
    '数据预处理',
    ['ml-basic'],
    [
      note('ml-preprocess', '数据清洗包括处理缺失值、异常值和重复数据。', ['数据', '基础'], '第一步', 3),
      note('ml-preprocess', '特征工程是从原始数据中提取有意义特征的过程。', ['数据', '重要'], '决定上限', 3),
      note('ml-preprocess', '数据标准化将特征缩放到相同尺度，加速收敛。', ['数据', '技巧'], '常用', 3),
      note('ml-preprocess', '数据增强通过变换数据增加训练样本多样性。', ['数据', 'CV'], '图像必备', 3),
    ],
    true,
    'inner',
    3,
  ),
  node(
    'ml-evaluate',
    '模型评估',
    ['ml-basic', 'ml-preprocess'],
    [
      note('ml-evaluate', '准确率是分类正确的样本占总样本的比例。', ['评估', '分类'], '基础指标', 1),
      note('ml-evaluate', '精确率衡量预测为正的样本中有多少是真正的正样本。', ['评估', '分类'], '关注误报', 1),
      note('ml-evaluate', '召回率衡量所有正样本中有多少被正确预测。', ['评估', '分类'], '关注漏报', 1),
      note('ml-evaluate', 'F1 分数是精确率和召回率的调和平均数。', ['评估', '分类'], '平衡指标', 1),
      note('ml-evaluate', 'AUC-ROC 曲线衡量模型在不同阈值下的分类能力。', ['评估', '分类'], '常用', 1),
    ],
    false,
    'drawer',
    1,
  ),
  node('ml-nlp', '自然语言处理', ['ml-framework'], [], false, 'inner', 0),
];

const productFlowNodes: NodeItem[] = [
  node(
    'pd-demand',
    '需求洞察',
    [],
    [
      note('pd-demand', '通过用户访谈和数据分析识别真实痛点，形成需求池。', ['调研', '需求'], '季度输入', 12),
      note('pd-demand', '用价值-成本矩阵对需求排序，优先解决高价值低复杂度项。', ['优先级'], '评审必看', 12),
    ],
    true,
    'inner',
    12,
  ),
  node(
    'pd-design',
    '方案设计',
    ['pd-demand'],
    [
      note('pd-design', '输出交互原型与信息架构，明确关键路径。', ['设计', '原型'], '可评审', 9),
      note('pd-design', '组织技术方案评审，同步接口契约与数据模型。', ['评审'], '前后端对齐', 9),
    ],
    true,
    'inner',
    9,
  ),
  node(
    'pd-develop',
    '研发交付',
    ['pd-design'],
    [
      note('pd-develop', '按迭代拆分任务，每日同步阻塞项与风险。', ['迭代', '协作'], '站会', 6),
      note('pd-develop', '提交前必须通过单元测试与静态检查。', ['质量'], '门禁', 6),
    ],
    false,
    'popover',
    6,
  ),
  node(
    'pd-test',
    '测试验收',
    ['pd-develop'],
    [
      note('pd-test', '覆盖核心链路的自动化回归，保障上线质量。', ['测试', '自动化'], '必跑', 3),
      note('pd-test', '产品与业务共同验收，确认指标与埋点。', ['验收'], '签字确认', 3),
    ],
    false,
    'inner',
    3,
  ),
  node('pd-release', '发布复盘', ['pd-test'], [note('pd-release', '上线后 48 小时观察核心指标并完成复盘。', ['发布', '复盘'], '闭环', 0)], false, 'drawer', 0),
];

export const SEED_DATASETS: GraphDataset[] = [
  {
    id: 'dataset-ml',
    title: '机器学习基础',
    description: '算法、框架与评估体系的知识地图',
    nodes: machineLearningNodes,
  },
  {
    id: 'dataset-product',
    title: '产品研发流程',
    description: '从需求到发布的标准流程节点',
    nodes: productFlowNodes,
  },
];

/** 返回深拷贝，避免运行时修改污染配置 */
export const getSeedDatasets = (): GraphDataset[] =>
  JSON.parse(JSON.stringify(SEED_DATASETS)) as GraphDataset[];

export const getSeedDataset = (id: string): GraphDataset | undefined =>
  getSeedDatasets().find((dataset) => dataset.id === id);
