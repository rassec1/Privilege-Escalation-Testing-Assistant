// 创建扩展程序所需的图标文件
// 使用Node.js fs模块复制文件
const fs = require('fs');
const path = require('path');

// 图标文件映射关系
const iconMappings = [
  { source: 'ico16.png', target: 'icon16.png' },
  { source: 'icon48.png', target: 'icon32.png' }, // 复制48px图标并缩小作为32px
  { source: 'icon48.png', target: 'icon16_off.png' }, // 暂时用相同图标
  { source: 'icon48.png', target: 'icon32_off.png' }, // 暂时用相同图标
  { source: 'icon48.png', target: 'icon48_off.png' }, // 暂时用相同图标
];

// 图标目录
const iconDir = path.join(__dirname, 'images');

console.log('开始创建图标文件...');

// 确保图标目录存在
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
  console.log('创建图标目录:', iconDir);
}

// 复制图标文件
iconMappings.forEach(mapping => {
  const sourcePath = path.join(iconDir, mapping.source);
  const targetPath = path.join(iconDir, mapping.target);
  
  try {
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ 成功复制: ${mapping.source} -> ${mapping.target}`);
    } else {
      console.error(`❌ 源文件不存在: ${mapping.source}`);
    }
  } catch (error) {
    console.error(`❌ 复制失败: ${mapping.source} -> ${mapping.target}`, error.message);
  }
});

console.log('图标文件创建完成！'); 