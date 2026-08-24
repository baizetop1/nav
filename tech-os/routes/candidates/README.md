# Route Candidates

保存由多个 Route Seed / Signal 聚合出的候选路线。候选沿用 `kind: route-seed`，状态必须是 `candidate`，文件名与 ID 保持 `RS-XXX.md`。

T4.2 只按显式共同标签生成可编辑内存草稿。用户输入候选专属确认短语后，仍需通过 Repository 完整校验、远端比较和原子提交确认才能保存。

候选不能自动成为 Main Route，也不能修改 `state.yml`。T4.3 在 Route Engine 中提供 Save for Later、Archive 与 Not Interested；决定写回同一路径并保留原因，Archive/Not Interested 使用 `status: archived`，不会删除文件。
