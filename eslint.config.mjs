import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.*"],
        },
      },
    },
    rules: {
      // “SmartTask” 是插件品牌名，豁免 sentence-case 检查
      "obsidianmd/ui/sentence-case": ["warn", { brands: ["SmartTask"] }],
    },
    ignores: ["main.js", "nodejs/**", "node_modules/**"],
  },
]);
