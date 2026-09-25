/* Bilingual copy. English lives in the HTML; this file holds the Chinese
   overlay. Elements are matched by data-i18n and restored from a cache
   when switching back, so the markup stays readable. */
(function () {
  'use strict';

  var ZH = {
    'nav.features': '产品',
    'nav.how': '工作原理',
    'nav.docs': '文档',
    'nav.usecases': '应用场景',
    'nav.bench': '性能基准',
    'nav.play': '在线演示',
    'nav.cta': '试用演示',

    'hero.pill': '由 MatrixOne 提供数据库原生分支能力',
    'hero.h1a': '让 AI Agent 批量修改数百万行',
    'hero.h1b': '而不直接写入生产环境。',
    'hero.lede': '为每个 Agent 提供独立的数据分支。查看行级变更、验证结果，并在准备好后再合并已批准的改动。',
    'hero.cta1': '试用在线 SQL Playground',
    'hero.cta2': '开始构建',
    'hero.support': '数据库内置的数据 Git 工作流。基于 MatrixOne 构建。',
    'demo.eyebrow': 'DATA PULL REQUEST · 示例',
    'demo.title': '商品目录补全',
    'demo.state': '等待审核',
    'demo.agent': 'Agent 运行 <code>catalog-enrichment-07</code> · 示例数据',
    'demo.rows': '行已变更',
    'demo.fields': '个字段已更新',
    'demo.flagged': '项策略提醒',
    'demo.field': '字段',
    'demo.changes': '变更数',
    'demo.result': '审核状态',
    'demo.descField': '商品描述',
    'demo.categoryField': '商品类目',
    'demo.brandField': '品牌',
    'demo.priceField': '价格',
    'demo.descBefore': '不锈钢旅行杯',
    'demo.descAfter': '防漏 18 盎司不锈钢杯',
    'demo.categoryBefore': '厨房用品',
    'demo.categoryAfter': '饮具',
    'demo.ok': '符合策略',
    'demo.review': '需要审核',
    'demo.policy': '策略检查：此 Agent 运行不允许修改价格。',
    'demo.diffButton': '查看示例行级差异',
    'demo.validationButton': '查看示例校验结果',
    'demo.diffTitle': '示例行级差异',
    'demo.diffNote': '仅为示例值。上方的示例策略会标记价格改动。',
    'demo.validationTitle': '示例策略校验',
    'demo.validationState': '2 项待审核',
    'demo.validationPass': '描述和类目字段通过示例检查。',
    'demo.validationFail': '有 2 项价格改动需要审核，因为该 Agent 不允许修改价格。',
    'demo.validationNote': '仅为示意结果；没有运行真实数据校验。',
    'demo.cta': '体验在线 Playground',
    'demo.disclaimer': '示意界面 · 示例数值 · 并非真实 Agent 运行',
    'ins.1': '启动 MatrixOne',
    'ins.2': '用你手边任意一个 MySQL 客户端连上去',
    'ins.note': 'Apache 2.0 · 不用注册、不用账号 · 没有任何要配置的东西。安装到此为止 —— 版本控制本来就在引擎里。',
    'hero.src': '数据实测自 BranchBench —— 查看完整结果 →',
    'copy': '复制',

    'stat.1': '克隆一张 100 GB 的表',
    'stat.2': 'BranchBench 上快于 DoltDB',
    'stat.3': '并发分支的 Agent 数量',
    'stat.4': 'MySQL 协议，零改造接入',

    'prob.kick': '工作流',
    'prob.h': '给 Agent 空间去工作，让团队决定哪些变更可以发布。',
    'prob.p': '当 Agent 一次能重写数千条记录时，提示词加生产库连接并不等于审核流程。Git4Data 为每项任务创建独立分支，让变更行清晰可见，并支持团队在合并前验证结果。保留现有事实来源系统；将 MatrixOne 用作提议变更的工作区。',

    'feat.kick': '核心能力',
    'feat.h': '四个动词，其余都是工作流。',
    'feat.sub': 'Git4Data 将数据库原生快照、表分支、行级差异和合并能力带入 MatrixOne。Agent 可以使用熟悉的 SQL 操作数据，团队则可在合并前审核提议的改动。',
    'f1.h': 'Snapshot 快照',
    'f1.p': '在某一瞬间冻结一张表并给这个状态命名 —— 相当于一次 commit 或一个 tag。没有任何数据被复制，快照就是当时那份对象目录。',
    'f2.h': 'Branch 分支',
    'f2.p': '从快照克隆出一张新表，此后两者各自独立演进。任何一侧的插入、更新和删除都不再影响对方 —— 这正是一个正在推演的 Agent 所需要的隔离。',
    'f3.h': 'Diff 差异',
    'f3.p': '比较两个表版本并查看发生变化的行。先通过 diff 了解 Agent 运行产生的变更，再决定下一步操作。',
    'f4.h': 'Merge 合并',
    'f4.p': '使用显式冲突策略将分支合并回来。围绕合并操作的审核和验证由你的应用工作流负责。',
    'f5.h': '时间旅行',
    'f5.p': '引擎本身就为最近一段窗口保留了时间点历史，所以你可以直接按时间戳查询过去的状态 —— 不需要有人提前声明「这一刻很重要」。',
    'f6.h': '开分支而不复制整张表',
    'f6.p': '数据库原生分支不必为每个候选状态都物化一份完整副本。性能页列出了已公布结果的测试环境、工作负载和适用边界。',
    'feat.benchmarkLink': '100 GB 表分支 · 0.20 秒 · 314 KB —— 查看基准方法 →',
    'feat.note': 'Git4Data 提供分支和合并原语。请根据工作负载配置所需的验证规则、审批、权限、审计和回滚流程；仅有分支能力并不构成完整的安全体系。',

    'how.kick': '工作原理',
    'how.h': '给一张表提一个 Pull Request。',
    'how.sub': '记录一个版本、从它开分支、比较版本、把被接受的改动合回去。和你每天用 Git 做的四个动作完全一样 —— 只不过写成 SQL，你的 ORM、dbt 模型或者 Agent 现在就能发出来。',
    's1.h': 'Snapshot',
    's1.p': '给一个历史状态命名。它是元数据而不是字节 —— 而且引擎本来就保留着最近一段窗口，不命名也能按时间戳查询。',
    's2.h': 'Branch',
    's2.p': '从该快照克隆一张表。克隆体继承 schema 与数据，随后独立演进 —— 任何一侧的写入都不再触碰对方。',
    's3.h': 'Diff',
    's3.p': '比较两个版本并查看发生变化的行。先了解 Agent 运行产生的变更，再决定下一步操作。',
    's4.h': 'Merge',
    's4.p': '带着显式的冲突策略把被接受的行折回去 —— 或者直接删掉这个分支，当它从未发生过。',
    'how.note': '这些操作在 MatrixOne 内以 SQL 执行。如何接入数据、配置权限与校验、审批合并以及将变更导回现有系统，取决于你的部署和应用工作流。',

    'bt.kick': 'BranchBench',
    'bt.h': '最高比 DoltDB 快 18.5 倍。',
    'bt.p': 'BranchBench 四个 Agent 工作流在 scale factor 100（约 4700 万行）下的端到端墙钟时间：五个并发 Agent，各执行二十步。取 warm run。',
    'bt.cta': '查看全部结果',

    'cmp.kick': '数据库原生能力',
    'cmp.h': '在数据所在之处创建分支并合并。',
    'cmp.sub': 'Git4Data 将表快照、分支、差异和合并放在 MatrixOne 内。它可以作为提议变更的工作区，与现有系统周边的权限和治理能力配合使用。',
    'cmp.card1h': '隔离一次任务',
    'cmp.card1p': '从快照创建可写的表分支，让 Agent 在自己的候选状态中工作。',
    'cmp.card2h': '检查发生变化的行',
    'cmp.card2p': '在表版本间比较行级变更，并通过应用或审核流程查看提议的内容。',
    'cmp.card3h': '决定后续操作',
    'cmp.card3p': '使用显式冲突策略合并分支，或直接丢弃。校验和审批门槛由你掌控。',
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
    'cmp.note': '分支和差异不能替代 IAM、行级安全、审计、备份或人工审批。请根据 MatrixOne 版本和部署方式确认具体语义与数据路径。',

    'uc.kick': '优先验证的场景',
    'uc.h': '从商品目录补全开始。',
    'uc.sub': '面向正在构建 Agent、用于补齐、标准化和修复结构化商品数据的团队。其他用例是相邻假设，需要用真实工作负载进一步验证。',
    'u1.tag': '首发场景',
    'u1.h': '商品目录补全',
    'u1.p': '统一品牌与类目、补充描述和属性，并处理供应商数据差异。在变更回到目录前，审核各字段的改动。',
    'u2.tag': '待验证的相邻场景',
    'u2.h': 'CRM 与主数据清洗',
    'u2.p': '去重并规范公司、联系人或账户字段，同时保留对提议变更的审核能力。',
    'u3.tag': '待验证的相邻场景',
    'u3.h': '业务记录修复',
    'u3.p': '在团队能定义清晰校验规则和审批步骤的系统中，批量生成或修正结构化记录。',
    'uc.note': 'Git4Data 是现有事实来源系统旁的数据变更工作区。每种部署都需要验证数据同步、访问控制、导出路径和延迟要求。',

    'cta.kick': '开始构建',
    'cta.h': '试试分支，查看差异，再接入你的工作负载。',
    'cta.sub': '从在线 SQL Playground 开始，再在本地运行 MatrixOne，跟着文档体验分支、差异和合并工作流。',
    'cta.b1': '试用在线 Playground',
    'cta.b2': '在 GitHub 查看 MatrixOne',

    'foot.tag': '为 AI Agent 提供安全可审查的数据变更工作流。',
    'foot.c1': '项目',
    'foot.c2': '深入了解',
    'foot.c3': '社区',
    'foot.docs': '官方文档',
    'foot.blog': 'Git4Data 深度解析',
    'foot.paper': 'BranchBench 论文',
    'foot.cmp': '性能实测结果',
    'foot.built': '基于 MatrixOne 构建 · Apache 2.0',

    /* ── playground ── */
    'pg.kick': '在线试用',
    'pg.h': '放心搞坏它，那只是你自己的分支。',
    'pg.sub': '这是一个真实的 MatrixOne 实例。页面会为你创建含 124 条示例客户记录的独立分支。按步骤运行 SQL，体验快照、分支、修复、审核和合并；闲置分支会自动回收。',
    'pg.booting': '正在为你创建分支…',
    'pg.guide': '四个动词，按顺序来',
    'pg.hint': '请依次运行步骤。也可以对 customers 和 customers_fix 使用 SELECT * 或 DESCRIBE，或编辑示例 UPDATE 中的国家名称。公开演示不支持其他 SQL。',
    'pg.label': '要执行的 SQL',
    'pg.run': '运行',
    'pg.reset': '重置我的分支',
    'pg.idle': '结果会显示在这里。',
    'pg.gone': '你的分支已被回收。刷新页面可以拿一个新的。',
    'pg.offline': '在线沙箱当前不可用。',
    'pg.offh': '这些语句你依然可以全部跑一遍 —— 在本地，而且没有任何限制。',
    'pg.howh': '这个页面凭什么撑得住 —— 而这恰恰是重点',
    'pg.howp': '每个访客通过 <code>DATA BRANCH CREATE TABLE</code> 获得同一份 124 行示例数据的可写分支。跟随步骤完成快照、分支、修复、审查逐行差异和合并。改动只作用于你自己的会话。',
    'pg.limits': '边界说清楚：一次一条语句、5 秒超时、最多返回 200 行、每个分支 80 条语句、闲置 20 分钟后到期并定期回收。仅支持引导流程和指定的查询、国家字段更新。这些限制在你自己机器上跑 MatrixOne 时都不存在。',

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
