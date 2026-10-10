(() => {
  const levels = [
    ["", "未评分"],
    ["easy", "简单"],
    ["medium", "中等"],
    ["hard", "困难"],
  ];
  const guidance = {
    "": "尚未加入学习队列",
    easy: "直接跳过学习",
    medium: "精讲重点 + 最小练习",
    hard: "原理 + 实现 + 排错 + 取舍",
  };
  const codes = { easy: "E", medium: "M", hard: "H" };
  const levelsByCode = { E: "easy", M: "medium", H: "hard" };
  const hashRatings = new Map(
    (new URLSearchParams(location.hash.slice(1)).get("ratings") || document.body.dataset.ratings || "")
      .split(",")
      .map((item) => item.split(":"))
      .filter(([id, code]) => id && levelsByCode[code])
      .map(([id, code]) => [id, levelsByCode[code]])
  );
  let storageAvailable = true;

  const key = (id) => `fullstack:difficulty:${id}`;
  const load = (id) => {
    if (hashRatings.has(id)) return hashRatings.get(id);
    try {
      const value = localStorage.getItem(key(id)) || "";
      return levels.some(([level]) => level === value) ? value : "";
    } catch {
      storageAvailable = false;
      return "";
    }
  };

  const syncHash = () => {
    const ratings = questions
      .map((question) => {
        const value = question.querySelector("select").value;
        return value ? `${question.id}:${codes[value]}` : "";
      })
      .filter(Boolean)
      .join(",");
    try {
      history.replaceState(null, "", ratings ? `#ratings=${ratings}` : `${location.pathname}${location.search}`);
    } catch {
      // The visible summary remains the fallback when a browser blocks file URL updates.
    }
    return ratings;
  };
  const save = (id, value) => {
    try {
      localStorage.setItem(key(id), value);
    } catch {
      storageAvailable = false;
    }
  };

  const questions = [...document.querySelectorAll(".question")];
  if (!questions.length) return;

  const summary = document.createElement("section");
  summary.className = "difficulty-summary notice";
  summary.innerHTML = '<strong>难度自评：</strong><span data-summary></span><p class="meta" data-queue></p><p class="meta" data-storage></p><details><summary>发送评分给 Agent</summary><textarea data-export readonly aria-label="评分结果"></textarea><p><button type="button" data-copy>复制评分结果</button> <span class="meta" data-copy-status></span></p></details>';
  document.querySelector(".questions").before(summary);

  const exportBox = summary.querySelector("[data-export]");
  summary.querySelector("[data-copy]").addEventListener("click", async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(exportBox.value);
      copied = true;
    } catch {
      exportBox.select();
      copied = document.execCommand("copy");
    }
    summary.querySelector("[data-copy-status]").textContent = copied ? "已复制，请粘贴到对话中。" : "复制失败，请手动复制上方文本。";
  });

  const update = () => {
    const counts = { easy: 0, medium: 0, hard: 0 };
    const queue = { medium: [], hard: [] };
    questions.forEach((question) => {
      const select = question.querySelector("select");
      const value = select.value;
      question.dataset.difficulty = value || "unrated";
      question.querySelector("[data-guidance]").textContent = guidance[value];
      if (value) counts[value] += 1;
      if (value === "medium" || value === "hard") {
        queue[value].push(`${question.id.toUpperCase()}（${value === "medium" ? "中等" : "困难"}）`);
      }
    });
    const learningQueue = [...queue.medium, ...queue.hard];
    const rated = counts.easy + counts.medium + counts.hard;
    summary.querySelector("[data-summary]").textContent = `已评分 ${rated}/${questions.length} · 简单 ${counts.easy}（跳过）· 中等 ${counts.medium} · 困难 ${counts.hard}`;
    summary.querySelector("[data-queue]").textContent = `学习队列：${learningQueue.length ? learningQueue.join("、") : "暂无；请先评分中等或困难内容。"}`;
    summary.querySelector("[data-storage]").textContent = storageAvailable ? "评分自动保存，并同步到当前页面地址供 Agent 读取。" : "当前浏览器未允许保存；请保持页面打开并把学习队列发给 Agent。";
    const ratings = syncHash();
    exportBox.value = `${questions[0].id.slice(0, 3).toUpperCase()} 评分完成 | ratings=${ratings || "none"} | 学习队列=${learningQueue.join(",") || "none"}`;
  };

  questions.forEach((question) => {
    const label = document.createElement("label");
    const select = document.createElement("select");
    const result = document.createElement("span");
    select.id = `difficulty-${question.id}`;
    select.dataset.question = question.id.toUpperCase();
    levels.forEach(([value, text]) => select.add(new Option(text, value)));
    select.value = load(question.id);
    if (hashRatings.has(question.id)) save(question.id, select.value);
    label.className = "difficulty-control";
    label.htmlFor = select.id;
    label.append("难度：", select, result);
    result.dataset.guidance = "";
    result.className = "difficulty-guidance";
    select.addEventListener("change", () => {
      save(question.id, select.value);
      update();
    });
    question.append(label);
  });

  console.assert(guidance.easy === "直接跳过学习" && levels.length === 4 && levelsByCode.E === "easy", "难度规则配置错误");
  update();
})();
