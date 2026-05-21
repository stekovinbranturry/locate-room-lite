# bugs或者优化意见

## bugs
[x] 导航栏“首页”应常驻，不要在首页时隐藏
[x] 移动端保持 room 页面高度 100vh, 优化移动端显示
[x] 成员列表应使用用户输入的昵称，当前都是 guest
[ ] 地图默认能看到世界地图

## improvements
[ ] 统一组件用法，尽可能使用 shadcn，尽量通过改造 components/ui 来实现项目中的 UI, 尽量避免在业务处自定义
[ ] 项目中有大量不规范的 tailwind 使用, 应该避免 hardcode，如 border-[var(--line)] -> border-line, 查找所有不规范并改正