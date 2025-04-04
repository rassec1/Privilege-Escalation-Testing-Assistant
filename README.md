# Synchro - 越权测试工具

Synchro是一个Chrome浏览器扩展，用于测试网站的越权漏洞。它允许你在不同窗口登录不同账号，并将一个主窗口的所有操作同步到其他窗口，帮助发现权限控制缺陷。


![pic](https://github.com/user-attachments/assets/75378d19-71fe-4f94-a9f2-62b79cd717cd)


## 功能特点

- 创建和管理多个浏览器窗口
- 在不同窗口中登录不同账号
- 将一个窗口（主窗口）的所有操作同步到其他窗口
- 同步包括点击、表单输入、键盘操作和滚动等
- 同步HTTP请求（尽可能）
- 窗口状态指示器，显示当前窗口的同步状态

## 安装方法

### 方法1：从Chrome Web Store安装（待上架）

1. 访问Chrome Web Store（链接待添加）
2. 点击"添加到Chrome"按钮

### 方法2：开发者模式安装

1. 下载或克隆此仓库到本地
2. 打开Chrome浏览器，进入扩展管理页面 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"按钮
5. 选择本项目的文件夹

## 使用方法

1. 点击Chrome工具栏中的Synchro图标，打开控制面板
2. 点击"创建新窗口"按钮，输入要打开的URL（可选）
3. 在每个窗口中登录不同的账号
4. 在控制面板中，为每个窗口设置有意义的名称和账号标识
5. 选择一个窗口作为"主窗口"（所有操作将从此窗口同步到其他窗口）
6. 启用同步开关
7. 在主窗口中进行操作，观察其他窗口的行为
 ![image](https://github.com/user-attachments/assets/804b7f33-3f2a-42d2-bcff-f9600e9b5ac6)


## 测试场景示例

### 越权访问测试

1. 窗口A登录管理员账号
2. 窗口B登录普通用户账号
3. 在窗口A（主窗口）访问管理页面并执行操作
4. 观察窗口B是否也能执行相同操作，这可能表明存在越权漏洞

### 水平越权测试

1. 窗口A登录用户A账号
2. 窗口B登录用户B账号
3. 在窗口A（主窗口）访问用户A的个人资料或数据
4. 观察窗口B（用户B）是否能够看到或修改用户A的数据

## 注意事项

- 本工具仅用于安全测试和教育目的
- 在使用前请确保已获得测试网站的授权
- 某些网站可能使用特殊技术（如token或复杂的会话管理）导致同步不完美
- 扩展需要广泛的权限才能正常工作，请在可信环境中使用

## 隐私政策

- 此扩展不收集或传输任何用户数据
- 所有操作和数据都保留在您的浏览器内
- 没有外部服务器或分析工具

## 贡献与反馈

欢迎提交问题和建议，或通过Pull Request贡献代码。 

## Stargazers over time
[![Stargazers over time](https://starchart.cc/rassec1/Privilege-Escalation-Testing-Assistant.svg?variant=adaptive)](https://starchart.cc/rassec1/Privilege-Escalation-Testing-Assistant)
