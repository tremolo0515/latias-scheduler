import nextConfig from "eslint-config-next"

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".claude/worktrees/**"],
  },
  {
    // React Compiler非採用のため、Compiler前提の厳格ルールは適用しない。
    // set-state-in-effect: localStorageからの初期値復元など、正当な同期パターンまで誤検知するため無効化
    // purity: shadcn生成コード（sidebar.tsx）のMath.random使用を許容
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
]

export default eslintConfig
