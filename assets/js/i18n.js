/* Bilingual copy. English lives in the HTML; this file holds the Chinese
   overlay. Elements are matched by data-i18n and restored from a cache
   when switching back, so the markup stays readable. */
(function () {
  'use strict';

  var ZH = {
    'nav.features': '核心能力',
    'nav.how': '工作原理',
    'nav.compare': '横向对比',
    'nav.usecases': '应用场景',
    'nav.bench': '性能基准',
    'nav.cta': '快速开始',

    'hero.pill': '由 MatrixOne 内核驱动',
    'hero.h1a': '给你的数据',
    'hero.h1b': '装上 Git',
    'hero.lede': '像管理代码一样对数据表打快照、开分支、看 diff、合并与回滚 —— <b>行级</b>粒度、<b>毫秒级</b>响应、<b>零拷贝</b>，全部用标准 SQL 完成。',
    'hero.cta1': '60 秒跑起来',
    'hero.cta2': '看看 SQL',
    'hero.src': '数据实测自 BranchBench —— 查看完整结果 →',
    'copy': '复制',

    'stat.1': '克隆一张 100 GB 的表',
    'stat.2': 'BranchBench 上快于 DoltDB',
    'stat.3': '并发分支的 Agent 数量',
    'stat.4': 'MySQL 协议，零改造接入',

    'prob.kick': '为什么是现在',
    'prob.h': '一个工程师只面对一个快照，一支 Agent 集群面对成百上千个。',
    'prob.p': 'LLM Agent 正在开始扮演数据工程师的角色：读取关系数据、提出变换方案、评估 SQL，然后不断迭代。每个 Agent 在动手推演之前都必须先 fork 一份数据，检查行级 diff，只合并被验证过的部分，并回滚失败的路径 —— 而且<b>不能拷贝基表</b>。当并发的候选状态从 1 个变成 1000 个的那一刻，版本控制就不再是一件锦上添花的事了。',

    'feat.kick': '核心能力',
    'feat.h': '四个动词，其余都是工作流。',
    'feat.sub': 'Git4Data 把 Git 的词汇映射到关系引擎上：数据库是仓库，每张表是一个被版本化的对象。由于底层存储只追加写入并由 MVCC 管理，一个版本不过是一份轻量元数据 —— 因此每个操作的代价只与改动量成正比，而与数据规模无关。',
    'f1.h': 'Snapshot 快照',
    'f1.p': '在某一瞬间冻结一张表并给这个状态命名 —— 相当于一次 commit 或一个 tag。没有任何数据被复制，快照就是当时那份对象目录。',
    'f2.h': 'Branch 分支',
    'f2.p': '从快照克隆出一张新表，此后两者各自独立演进。任何一侧的插入、更新和删除都不再影响对方 —— 这正是一个正在推演的 Agent 所需要的隔离。',
    'f3.h': 'Diff 差异',
    'f3.p': '报告两个版本之间存在分歧的行。每个版本都是一个无序的记录多重集，因此 diff 只读取分叉之后写入的增量，永远不碰基表。',
    'f4.h': 'Merge 合并',
    'f4.p': '把被接受的改动折回主表。Git4Data 会推断出共同基版本并执行真正的三方合并，因此来自多个 Agent 的互不重叠的工作会被保留，而不是被覆盖掉。',
    'f5.h': '时间旅行',
    'f5.p': '引擎本身就为最近一段窗口保留了时间点历史，所以你可以直接按时间戳查询过去的状态 —— 不需要有人提前声明「这一刻很重要」。',
    'f6.h': '代价取决于改动量，而不是表的大小',
    'f6.p': '不可变对象意味着两个版本的差别只在于分叉之后各自写了什么。克隆一张 100 GB 的表耗时 0.20 秒、314 KB 元数据；而把它物化出来要 114.6 秒、34 GB。',
    'feat.note': '冲突判定目前在行粒度：只有当两个分支各自独立修改了同一个主键时才算真冲突。<code>WHEN CONFLICT</code> 子句决定此时怎么办 —— <code>FAIL</code> 中止合并，<code>SKIP</code> 保留目标端的行，<code>ACCEPT</code> 保留来源端的行。',

    'how.kick': '工作原理',
    'how.h': '给一张表提一个 Pull Request。',
    'how.sub': '记录一个版本、从它开分支、比较版本、把被接受的改动合回去。和你每天用 Git 做的四个动作完全一样 —— 只不过写成 SQL，你的 ORM、dbt 模型或者 Agent 现在就能发出来。',
    's1.h': 'Snapshot',
    's1.p': '给一个历史状态命名。它是元数据而不是字节 —— 而且引擎本来就保留着最近一段窗口，不命名也能按时间戳查询。',
    's2.h': 'Branch',
    's2.p': '从该快照克隆一张表。克隆体继承 schema 与数据，随后独立演进 —— 任何一侧的写入都不再触碰对方。',
    's3.h': 'Diff',
    's3.p': '报告两个版本存在分歧的行。由于只扫描增量，它比等价的手写 SQL 快上几个数量级。',
    's4.h': 'Merge',
    's4.p': '带着显式的冲突策略把被接受的行折回去 —— 或者直接删掉这个分支，当它从未发生过。',
    'how.note': '上面每一条都作为事务在数据库内部执行，走的是 MySQL 协议。版本控制因此直接继承了你已经在依赖的事务、认证与访问控制 —— 不需要旁路服务，不需要挂载对象存储，也不需要再维护第二套元数据目录。',

    'bt.kick': 'BranchBench',
    'bt.h': '最高比 DoltDB 快 18.5 倍。',
    'bt.p': 'BranchBench 四个 Agent 工作流在 scale factor 100（约 4700 万行）下的端到端墙钟时间：五个并发 Agent，各执行二十步。取 warm run。',
    'bt.cta': '查看全部结果',

    'cmp.kick': '生态位置',
    'cmp.h': '人人都有分支，几乎没人有 merge。',
    'cmp.sub': '零拷贝克隆早已不稀奇。别的系统真正缺的是「回来的路」：在行级比较两个版本，并把其中一个重新并入另一个。在多数系统里，分叉是单向的。',
    'cmp.cap': '能力',
    'cmp.r1': 'diff 的身份单位', 'cmp.r1a': '行', 'cmp.r1b': '行', 'cmp.r1c': '页 / 分支', 'cmp.r1d': '对象或表', 'cmp.r1e': '文件',
    'cmp.r2': '能单独分支的最小单元', 'cmp.r2a': '单张表', 'cmp.r2b': '单张表', 'cmp.r2c': '整个数据库', 'cmp.r2d': '一个命名空间', 'cmp.r2e': '一棵文件树',
    'cmp.r3': '零拷贝分支',
    'cmp.r4': '比较两个活跃分支',
    'cmp.r5': '把分支合并回去', 'cmp.r5a': '行级三方合并',
    'cmp.r6': '显式冲突策略',
    'cmp.r7': '运行在 OLTP 引擎内部',
    'cmp.r8': '接入协议', 'cmp.r8d': 'S3 API', 'cmp.r8e': '命令行',
    'cmp.obj': '对象级', 'cmp.obj2': '对象级', 'cmp.oneway': '单向', 'cmp.partial': '部分支持', 'cmp.storage': '存储层',
    'cmp.note': '定位分析依据 Git4Data 论文的相关工作章节。第三方项目迭代很快，在做技术选型前请以其官方文档为准。',

    'uc.kick': '收益最明显的地方',
    'uc.h': 'Agent 干活时真正呈现的四种形态。',
    'uc.sub': '这正是 BranchBench 建模的四类工作流 —— 而它之所以这样建模，是因为 Agent 对数据库做的就是这些事。',
    'u1.h': '带彩排的 schema 变更',
    'u1.p': 'Agent 修改 schema 和代码、回填数据，并在每次尝试后重跑测试。彩排和上线是同一条语句。',
    'u2.h': '二分定位坏改动',
    'u2.p': '在事务日志里二分查找究竟是哪一步弄坏了东西。每一次探测都需要一份可写的状态，而不是只读副本。',
    'u3.h': '互相竞争的修复策略',
    'u3.p': '规范化、模糊去重、语义修复各自修好了不同的子集。没有哪个分支能全面胜出，所以你合并的是被接受的增量，而不是从中挑一个。',
    'u4.h': '在数据方案上做搜索',
    'u4.p': '树搜索展开的是又深又窄的前沿 —— 每个节点一个分支，其中大多数最终被丢弃。开分支必须近乎免费，否则搜索永远深不下去。',

    'cta.kick': '快速开始',
    'cta.h': '拉个镜像，故意搞坏点东西。',
    'cta.sub': 'MatrixOne 以 Apache 2.0 协议开源。用你手边任意一个 MySQL 客户端就行。',
    'cta.b1': 'GitHub 开源仓库',
    'cta.b2': '阅读文档',

    'foot.tag': '把版本控制做进数据库里。',
    'foot.c1': '项目',
    'foot.c2': '深入了解',
    'foot.c3': '社区',
    'foot.docs': '官方文档',
    'foot.blog': 'Git4Data 深度解析',
    'foot.paper': '研究论文',
    'foot.cmp': '横向对比',
    'foot.built': '基于 MatrixOne 构建 · Apache 2.0',

    /* ── benchmark page ── */
    'bb.kick': '性能基准',
    'bb.h': 'BranchBench —— Agent 集群下的数据库分支',
    'bb.sub': 'BranchBench 用 Agent 真实的方式压数据库：fork、修改、评估、合并或丢弃，反复数百次。以下是 Git4Data 的实测结果，逐个数字誊自已发表论文的表格。',
    'bb.key': '关键结论',
    'bb.keyh': '这些跑分到底说明了什么。',
    'bb.method': '方法论',
    'bb.methodh': '上面每个数字背后的实验设置。',
    'bb.repro': '复现',
    'bb.reproh': '可以自己重跑一遍的数字。',
    'bb.reprop': 'BranchBench 开放且可扩展，MatrixOne 采用 Apache 2.0 协议。要修正某个值或加入新系统，改一个 JSON 文件、提一个 PR 就够了。',
    'bb.b1': '运行 MatrixOne',
    'bb.b2': '编辑数据集',
    'bb.detail': '详细对比',
    'bb.detailh': '选一组实验，看柱条。',
    'bb.suite': '实验组',
    'bb.run': '运行方式',
    'bb.mode': '显示方式',
    'bb.rel': '相对值',
    'bb.abs': '绝对值',
    'bb.systems': '对比列',
    'bb.lower': '越低越好',
    'bb.higher': '越高越好',
    'bb.unit': '单位',
    'bb.gap': '差距',
    'bb.src': '数据来源',
    'bb.source': '文献来源',
    'bb.workflow': '工作流',
    'bb.cap': '能力矩阵',
    'bb.caph': '不是每个引擎都能表达每种工作流。',
    'bb.capsub': '在谈性能之前，先问一个更基本的问题：这个系统能不能把这套流程跑完？',
    'bb.m1': '硬件环境',
    'bb.m2': '负载形态',
    'bb.m3': '本页对数字的处理原则',
    'bb.m3a': '所有数值均来自各实验组标注的论文表格 —— 绝不从图上读数。',
    'bb.m3b': '第三方能力数据出自 BranchBench 论文，Git4Data 的结果出自 CIDR \'27 论文。',
    'bb.m3c': '相对模式以该行最优值为基准，因此 1.00× 永远是这一行的赢家。',
    'bb.back': '返回首页'
  };

  var cache = new WeakMap();

  function apply(lang) {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!cache.has(el)) cache.set(el, el.innerHTML);
      if (lang === 'zh' && ZH[key] != null) el.innerHTML = ZH[key];
      else el.innerHTML = cache.get(el);
    });
    document.querySelectorAll('.lang').forEach(function (btn) {
      var on = btn.querySelector('.lang-on'), off = btn.querySelector('.lang-off');
      if (!on || !off) return;
      on.textContent = lang === 'zh' ? '中文' : 'EN';
      off.textContent = lang === 'zh' ? 'EN' : '中文';
    });
    try { localStorage.setItem('g4d-lang', lang); } catch (e) {}
    window.G4D_LANG = lang;
    document.dispatchEvent(new CustomEvent('g4d:lang', { detail: lang }));
  }

  var saved;
  try { saved = localStorage.getItem('g4d-lang'); } catch (e) {}
  if (!saved) saved = /^zh\b/i.test(navigator.language || '') ? 'zh' : 'en';

  window.G4D_LANG = saved;
  window.g4dT = function (key, fallback) {
    return (window.G4D_LANG === 'zh' && ZH[key] != null) ? ZH[key] : fallback;
  };

  function boot() {
    apply(saved);
    document.querySelectorAll('.lang').forEach(function (btn) {
      btn.addEventListener('click', function () {
        apply(window.G4D_LANG === 'zh' ? 'en' : 'zh');
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
