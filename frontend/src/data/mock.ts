import type { NodeItem, ListItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const createListItem = (parentNodeId: string, content: string, tagList: string[], remark: string): ListItem => ({
  id: uuidv4(),
  content,
  tagList,
  remark,
  createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  parentNodeId,
});

export const mockData: NodeItem[] = [
  {
    id: 'node-1',
    name: '机器学习基础',
    dependencies: [],
    isExpanded: true,
    displayMode: 'inner',
    createTime: dayjs().subtract(7, 'day').format('YYYY-MM-DD HH:mm:ss'),
    children: [
      createListItem('node-1', '监督学习是从标注数据中学习映射关系的机器学习方法。', ['算法', '基础'], '核心概念'),
      createListItem('node-1', '无监督学习用于从未标注数据中发现模式和结构。', ['算法', '基础'], '聚类常用'),
      createListItem('node-1', '强化学习通过与环境交互获得奖励来学习最优策略。', ['算法', '进阶'], 'AlphaGo使用'),
      createListItem('node-1', '半监督学习结合少量标注数据和大量未标注数据进行学习。', ['算法', '进阶'], '工业常用'),
      createListItem('node-1', '迁移学习将从一个任务中学到的知识应用到另一个相关任务。', ['算法', '热门'], '深度学习必备'),
    ],
  },
  {
    id: 'node-2',
    name: '深度学习框架',
    dependencies: ['node-1'],
    isExpanded: false,
    displayMode: 'popover',
    createTime: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    children: [
      createListItem('node-2', 'TensorFlow是Google开发的开源机器学习框架。', ['框架', 'Google'], '最流行'),
      createListItem('node-2', 'PyTorch是Facebook开发的深度学习框架，动态计算图。', ['框架', 'Facebook'], '研究首选'),
      createListItem('node-2', 'JAX是Google的高性能数值计算库，自动微分。', ['框架', 'Google'], '科研新宠'),
      createListItem('node-2', 'MXNet是Amazon支持的深度学习框架，多语言支持。', ['框架', 'Amazon'], '云服务集成'),
    ],
  },
  {
    id: 'node-3',
    name: '数据预处理',
    dependencies: ['node-1'],
    isExpanded: true,
    displayMode: 'inner',
    createTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
    children: [
      createListItem('node-3', '数据清洗包括处理缺失值、异常值和重复数据。', ['数据', '基础'], '第一步'),
      createListItem('node-3', '特征工程是从原始数据中提取有意义特征的过程。', ['数据', '重要'], '决定上限'),
      createListItem('node-3', '数据标准化将特征缩放到相同尺度，加速收敛。', ['数据', '技巧'], '常用'),
      createListItem('node-3', '数据增强通过变换数据增加训练样本多样性。', ['数据', 'CV'], '图像必备'),
    ],
  },
  {
    id: 'node-4',
    name: '模型评估',
    dependencies: ['node-1', 'node-3'],
    isExpanded: false,
    displayMode: 'drawer',
    createTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
    children: [
      createListItem('node-4', '准确率是分类正确的样本占总样本的比例。', ['评估', '分类'], '基础指标'),
      createListItem('node-4', '精确率衡量预测为正的样本中有多少是真正的正样本。', ['评估', '分类'], '关注误报'),
      createListItem('node-4', '召回率衡量所有正样本中有多少被正确预测。', ['评估', '分类'], '关注漏报'),
      createListItem('node-4', 'F1分数是精确率和召回率的调和平均数。', ['评估', '分类'], '平衡指标'),
      createListItem('node-4', 'AUC-ROC曲线衡量模型在不同阈值下的分类能力。', ['评估', '分类'], '常用'),
    ],
  },
  {
    id: 'node-5',
    name: '自然语言处理',
    dependencies: ['node-2'],
    isExpanded: false,
    displayMode: 'inner',
    createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    children: [],
  },
];
