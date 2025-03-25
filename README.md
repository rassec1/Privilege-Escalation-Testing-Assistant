# 🔒 越权测试助手 (Privilege Escalation Testing Assistant)

> 一个强大的Chrome扩展，用于自动化权限提升漏洞的测试和验证。

## 🌟 特性

- 🎯 **智能请求捕获**：自动捕获和分析所有网络请求
- 🔄 **实时同步**：主窗口与隐身窗口之间的请求实时同步
- 🎨 **优雅界面**：现代化的UI设计，直观的操作体验
- 📊 **数据分析**：强大的请求分析功能，支持多种数据格式
- 🔍 **越权检测**：自动检测潜在的权限提升漏洞
- 📥 **数据导出**：支持Excel格式导出，方便后续分析

## 🛠️ 技术栈

- Chrome Extension Manifest V3
- JavaScript (ES6+)
- Chrome WebRequest API
- Chrome Storage API
- Chrome Scripting API

## 🚀 快速开始

1. 克隆仓库
```bash
git clone https://github.com/rassec1/Privilege-Escalation-Testing-Assistant
```

2. 在Chrome浏览器中加载扩展
   - 打开 Chrome 扩展管理页面 (chrome://extensions/)
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目目录

3. 开始使用
   - 点击工具栏中的扩展图标
   - 创建测试窗口
   - 开始捕获和分析请求

## 🔧 配置说明

### 权限配置
```json
{
  "permissions": [
    "storage",
    "tabs",
    "webRequest",
    "scripting",
    "declarativeNetRequest",
    "webNavigation",
    "cookies",
    "activeTab",
    "downloads"
  ]
}
```

### 内容脚本配置
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"],
      "run_at": "document_start"
    }
  ]
}
```

## 🎮 使用指南

### 1. 窗口管理
- 创建普通窗口：用于主测试环境
- 创建隐身窗口：用于对比测试
- 实时同步：确保两个窗口的请求同步

### 2. 请求分析
- 自动捕获所有网络请求
- 支持请求过滤和搜索
- 详细显示请求和响应信息

### 3. 越权测试
- 设置目标域名
- 发送测试请求
- 分析响应差异

## 🔍 安全特性

- 沙箱隔离
- CSP策略保护
- 安全的跨域通信
- 隐私数据保护

## 📝 开发计划

- [ ] 添加更多请求分析方法
- [ ] 支持自定义测试规则
- [ ] 添加自动化测试脚本
- [ ] 优化性能和数据存储

## 🤝 贡献指南

欢迎提交 Pull Request 或创建 Issue！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 👥 作者

- 作者：yds
- 邮箱：[jeffyandi364@gmail.com
- GitHub：[[your-github-profile]](https://github.com/rassec1/)

## 🙏 致谢

感谢所有贡献者的付出！

---

<div align="center">
  <sub>Built with ❤️ for Security Testing</sub>
</div> 
