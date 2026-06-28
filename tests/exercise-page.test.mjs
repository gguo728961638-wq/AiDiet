import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../ios/AiDiet/Resources/index.html", import.meta.url), "utf8");

console.log("=== 运动页面全面测试 ===\n");

// 1. 基础结构测试
console.log("1. 基础结构测试");
assert.match(html, /data-route="exercise"/, "运动入口存在");
assert.match(html, /exercise-shell/, "运动页面外壳存在");
assert.match(html, /function renderExerciseDetail\(/, "运动详情渲染函数存在");
assert.match(html, /function exerciseTotals\(/, "运动统计函数存在");
assert.match(html, /力量训练/, "包含力量训练标题");
assert.match(html, /onclick.*history\.back/, "返回按钮存在（使用 history.back）");
console.log("   ✓ 基础结构完整\n");

// 2. 每日计划功能测试
console.log("2. 每日计划功能测试");
assert.match(html, /每日计划/, "每日计划标题存在");
assert.match(html, /function getTodayPlan\(/, "获取今日计划函数存在");
assert.match(html, /function getBeijingDayOfWeek\(/, "获取北京时间星期函数存在");
assert.match(html, /data-action="exercise-toggle-plan"/, "切换计划完成状态功能存在");
assert.match(html, /data-action="exercise-edit-plan"/, "编辑计划按钮存在");
console.log("   ✓ 每日计划功能完整\n");

// 3. 每周计划编辑器测试
console.log("3. 每周计划编辑器测试");
assert.match(html, /function renderWeeklyPlanEditor\(/, "每周计划编辑器渲染函数存在");
assert.match(html, /weeklyPlan:/, "每周计划数据结构存在");
assert.match(html, /data-action="select-plan-day"/, "选择日期功能存在");
assert.match(html, /data-action="add-plan-item"/, "添加计划项功能存在");
assert.match(html, /data-action="remove-plan-item"/, "删除计划项功能存在");
assert.match(html, /exercise-calendar/, "运动日历路由存在");
console.log("   ✓ 每周计划编辑器完整\n");

// 4. 训练进度页面测试
console.log("4. 训练进度页面测试");
assert.match(html, /function renderExerciseSetDetail\(/, "训练进度页面渲染函数存在");
assert.match(html, /exercise-set-tap/, "点击圆环完成功能存在");
assert.match(html, /exercise-set-dot-circle/, "组数进度点存在");
assert.match(html, /exercise-set-ring/, "中间圆环存在");
assert.match(html, /exercise-set-info-card/, "底部信息卡片存在");
console.log("   ✓ 训练进度页面完整\n");

// 5. 力量训练同步测试
console.log("5. 力量训练同步测试");
assert.match(html, /function syncPlanToMoves\(/, "计划同步到力量训练函数存在");
assert.match(html, /function addExerciseMove\(/, "添加动作函数存在");
assert.match(html, /function deleteExerciseMove\(/, "删除动作函数存在");
assert.match(html, /function setupExerciseSwipeRows\(/, "滑动删除初始化函数存在");
assert.match(html, /data-action="delete-exercise-move"/, "删除动作按钮存在");
assert.match(html, /data-action="exercise-add-move"/, "添加动作按钮存在");
console.log("   ✓ 力量训练同步功能完整\n");

// 6. 北京时间刷新测试
console.log("6. 北京时间刷新测试");
assert.match(html, /function getBeijingDate\(/, "获取北京时间函数存在");
assert.match(html, /function scheduleExerciseDailyRefresh\(/, "每日刷新函数存在");
assert.match(html, /getBeijingDate\(\)/, "使用北京时间计算");
assert.match(html, /tomorrow\.setHours\(0, 0, 0, 0\)/, "设置为午夜0点");
console.log("   ✓ 北京时间刷新功能完整\n");

// 7. 数据结构测试
console.log("7. 数据结构测试");
assert.match(html, /exercise:\s*\{/, "运动数据结构存在");
assert.match(html, /targetMinutes:/, "目标分钟数字段存在");
assert.match(html, /weeklyPlan:/, "每周计划字段存在");
assert.match(html, /moves:/, "动作列表字段存在");
assert.match(html, /records:/, "记录列表字段存在");
assert.match(html, /completedSets:/, "完成组数字段存在");
assert.match(html, /targetSets:/, "目标组数字段存在");
console.log("   ✓ 数据结构完整\n");

// 8. UI组件测试
console.log("8. UI组件测试");
assert.match(html, /exercise-card/, "运动卡片组件存在");
assert.match(html, /exercise-pill/, "药丸按钮组件存在");
assert.match(html, /exercise-add-small/, "添加小组件存在");
assert.match(html, /exercise-strength-row/, "力量训练行组件存在");
assert.match(html, /exercise-plan-list/, "计划列表组件存在");
console.log("   ✓ UI组件完整\n");

// 9. 动画效果测试
console.log("9. 动画效果测试");
assert.match(html, /@keyframes/, "动画关键帧存在");
assert.match(html, /transition/, "过渡动画存在");
assert.match(html, /cubic-bezier/, "缓动函数存在");
console.log("   ✓ 动画效果完整\n");

// 10. 数据同步机制测试
console.log("10. 数据同步机制测试");
assert.match(html, /saveState\(\)/, "保存状态函数存在");
assert.match(html, /renderDetailPage\(/, "渲染详情页函数存在");
assert.match(html, /haptic\(/, "触觉反馈函数存在");
assert.match(html, /showToast\(/, "提示消息函数存在");
console.log("   ✓ 数据同步机制完整\n");

console.log("=== 全部测试通过！运动页面功能完整 ===");
