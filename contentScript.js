// 存储状态
let windowType = null;    // 窗口类型: primary/secondary/isolated
let windowName = null;    // 窗口名称
let isCapturing = true;        // 是否正在捕获请求(默认开启)
let isSyncEnabled = true;      // 同步状态(默认开启)
let capturedRequests = [];     // 本地捕获的请求
let debugMode = true;          // 调试模式
let isIsolated = false;        // 是否是隔离会话
let isPrimaryWindow = false;

// 立即初始化
console.log("[越权测试助手] 内容脚本已加载");
initialize();

// 页面加载完成后初始化UI
document.addEventListener('DOMContentLoaded', () => {
  console.log("[越权测试助手] DOM已加载，初始化UI");
  updateSyncIndicator();
  
  if (debugMode) {
    addDebugInfo();
  }
});

// 初始化
function initialize() {
  console.log("[越权测试助手] 初始化内容脚本...");
  
  // 设置请求拦截
  interceptRequests();
  
  // 请求当前窗口类型和状态
  chrome.runtime.sendMessage({ action: 'getState' }, response => {
    if (response) {
      console.log("[越权测试助手] 收到状态响应:", response);
      
      // 无法直接使用chrome.windows API，该API不在内容脚本的权限范围内
      // 通过tab.sender.tab.windowId或等待后台脚本主动设置windowType
      console.log("[越权测试助手] 主窗口ID:", response.primaryWindowId);
      console.log("[越权测试助手] 子窗口列表:", response.secondaryWindows);
      
      // 获取捕获状态和同步状态
      isCapturing = response.isCapturing !== undefined ? response.isCapturing : true;
      isSyncEnabled = response.isSyncEnabled !== undefined ? response.isSyncEnabled : true;
      
      console.log(`[越权测试助手] 捕获状态: ${isCapturing}, 同步状态: ${isSyncEnabled}`);
      
      // 如果DOM已加载，更新同步指示器
      if (document.body) {
        updateSyncIndicator();
      }
          } else {
      console.log("[越权测试助手] 未收到状态响应");
    }
  });
  
  // 向后台发送准备就绪消息
  console.log("[越权测试助手] 发送内容脚本就绪消息");
  
  // 由于内容脚本不能直接使用chrome.windows，发送就绪消息让后台脚本识别此窗口
  try {
    chrome.runtime.sendMessage({ 
      action: 'contentScriptReady',
      windowId: -1 // 设置为-1，由后台脚本通过sender.tab.windowId自行识别
    }, response => {
      if (chrome.runtime.lastError) {
        console.error("[越权测试助手] 发送就绪消息失败:", chrome.runtime.lastError);
      } else {
        console.log("[越权测试助手] 就绪消息已发送，响应:", response);
      }
    });
  } catch (error) {
    console.error("[越权测试助手] 发送就绪消息时发生异常:", error);
  }
  
  // 检查URL是否包含隔离会话标记
  if (window.location.search.includes('isolatedSession=true')) {
    console.log('[越权测试助手] 检测到隔离会话URL标记');
    isIsolated = true;
    windowType = 'isolated';
    windowName = '隔离会话窗口';
    
    // 添加页面样式以指示这是隔离会话
    addIsolatedSessionIndicator();
  }
  
  // 监听消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[越权测试助手] 收到消息:', message);
    
    switch (message.action) {
      case 'setWindowType':
        windowType = message.windowType;
        windowName = message.windowName;
        isPrimaryWindow = windowType === 'normal';
        console.log(`[越权测试助手] 窗口类型已设置: ${windowType}, 名称: ${windowName}`);
        break;
        
      case 'navigate':
        handleNavigation(message);
        break;
        
      case 'replayRequest':
        handleRequestReplay(message.request);
        break;
        
      case 'updateCapturingState':
        // 更新捕获状态
        isCapturing = message.isCapturing;
        console.log(`[越权测试助手] 更新捕获状态为 ${isCapturing ? '开启' : '关闭'}`);
        sendResponse({ success: true });
        break;
        
      case 'updateSyncState':
        // 更新同步状态
        isSyncEnabled = message.isSyncEnabled;
        console.log(`[越权测试助手] 更新同步状态为 ${isSyncEnabled ? '开启' : '关闭'}`);
        updateSyncIndicator();
        sendResponse({ success: true });
        break;
    }
    
    return true; // 保持通道开放，允许异步响应
  });
}

// 拦截页面请求
function interceptRequests() {
  console.log("[越权测试助手] 设置请求拦截器");
  
  try {
    // 保存原始方法
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest.prototype.open;
    const originalXHRSend = window.XMLHttpRequest.prototype.send;
    
    // 拦截fetch请求
    window.fetch = async function(resource, init = {}) {
      try {
        // 只在主窗口中捕获请求
        if (windowType === 'primary') {
          const url = (typeof resource === 'string') ? resource : resource.url;
          const method = init.method || 'GET';
          
          console.log(`[越权测试助手] 捕获fetch请求: ${method} ${url}`);
          
          // 发送到后台脚本
    chrome.runtime.sendMessage({
            action: 'capturedRequest',
            request: {
              id: generateRequestId(),
              url: url,
              method: method,
              timestamp: Date.now()
            }
          }, response => {
            console.log("[越权测试助手] 请求捕获响应:", response);
          });
        }
      } catch (e) {
        console.error('[越权测试助手] 拦截fetch请求出错:', e);
      }
      
      // 调用原始方法
      return originalFetch.apply(this, arguments);
    };
    
    // 拦截XMLHttpRequest.open
    window.XMLHttpRequest.prototype.open = function(method, url, async = true, user, password) {
      this._requestMethod = method;
      this._requestUrl = url;
      
      return originalXHR.apply(this, arguments);
    };
    
    // 拦截XMLHttpRequest.send
    window.XMLHttpRequest.prototype.send = function(body) {
      try {
        // 只在主窗口中捕获请求
        if (windowType === 'primary' && this._requestUrl) {
          console.log(`[越权测试助手] 捕获XHR请求: ${this._requestMethod} ${this._requestUrl}`);
          
          // 发送到后台脚本
    chrome.runtime.sendMessage({
            action: 'capturedRequest',
            request: {
              id: generateRequestId(),
              url: this._requestUrl,
              method: this._requestMethod,
              timestamp: Date.now()
            }
          }, response => {
            console.log("[越权测试助手] 请求捕获响应:", response);
          });
        }
      } catch (e) {
        console.error('[越权测试助手] 拦截XHR请求出错:', e);
      }
      
      return originalXHRSend.apply(this, arguments);
    };
    
    console.log('[越权测试助手] 请求拦截器已成功设置');
  } catch (error) {
    console.error('[越权测试助手] 设置请求拦截器失败:', error);
  }
}

// 生成请求ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 重放请求
async function replayRequest(request) {
  console.log(`[越权测试助手] 重放请求: ${request.method} ${request.url}`);
  
  try {
    // 验证请求对象
    if (!request || !request.url) {
      throw new Error('无效的请求对象');
    }
    
    // 验证请求URL
    let url = request.url;
    if (!url.startsWith('http')) {
      // 如果URL不是以http开头，可能是相对路径，尝试转换
      if (url.startsWith('/')) {
        url = window.location.origin + url;
      } else {
        url = window.location.origin + '/' + url;
      }
      console.log(`[越权测试助手] 转换后的URL: ${url}`);
    }
    
    // 使用fetch API重放请求，使用当前窗口的认证凭据
    const response = await fetch(url, {
      method: request.method || 'GET',
      credentials: 'include',  // 包含当前窗口的cookies
      mode: 'no-cors',  // 避免CORS问题
      cache: 'no-cache'
    });
    
    console.log(`[越权测试助手] 重放请求成功，状态码: ${response.status}`);
    
    // 显示响应结果
    showResponseNotification(url, response.status);
    
    return {
      success: true,
      status: response.status
    };
  } catch (error) {
    console.error('[越权测试助手] 重放请求失败:', error);
    
    // 确保DOM已加载，然后显示错误通知
    if (document.body) {
      showResponseNotification(request?.url || '未知URL', 'ERROR', error.message);
    } else {
      console.error('[越权测试助手] 无法显示错误通知，DOM未加载');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// 显示响应通知
function showResponseNotification(url, status, errorMsg) {
  // 确保DOM已加载
  if (!document.body) {
    console.error('[越权测试助手] 无法显示通知，DOM未加载');
    return;
  }
  
  // 创建通知元素
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    background-color: ${status >= 200 && status < 400 ? '#4CAF50' : '#F44336'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 10000;
    max-width: 80%;
  `;
  
  // 截取URL
  const shortUrl = (url && url.length > 40) ? url.substring(0, 37) + '...' : (url || '未知URL');
  
  notification.innerHTML = `
    <div style="margin-bottom: 5px;"><strong>${status}</strong> ${shortUrl}</div>
    <div style="font-size: 12px; opacity: 0.9;">
      ${status >= 200 && status < 400 ? 
        '✓ 请求重放成功' : 
        '✗ 请求重放失败' + (errorMsg ? ': ' + errorMsg : '')}
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // 3秒后自动消失
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// 更新同步状态指示器
function updateSyncIndicator() {
  // 如果DOM还没有加载完成，不执行
  if (!document.body) {
    console.log("[越权测试助手] DOM尚未加载完成，无法添加同步状态指示器");
    return;
  }

  // 移除可能已存在的指示器
  const existingIndicator = document.getElementById('sync-status-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // 创建指示器元素
  const indicator = document.createElement('div');
  indicator.id = 'sync-status-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    padding: 5px 10px;
    background-color: ${isSyncEnabled ? '#4CAF50' : '#F44336'};
    color: white;
    font-family: Arial, sans-serif;
    font-size: 12px;
    z-index: 10000;
    border-bottom-left-radius: 4px;
  `;
  
  // 设置指示器内容
  indicator.textContent = isSyncEnabled ? 
    `✅ 同步已开启` : 
    `❌ 同步已关闭`;
  
  // 添加到页面
  document.body.appendChild(indicator);
  
  // 添加点击事件
  indicator.addEventListener('click', toggleSync);
}

// 切换同步状态
function toggleSync() {
  isSyncEnabled = !isSyncEnabled;
  
  chrome.runtime.sendMessage({
    action: 'toggleSync',
    enabled: isSyncEnabled
  }, response => {
    if (response && response.success) {
      updateSyncIndicator();
    }
  });
}

// 添加调试信息面板
function addDebugInfo() {
  // 如果已存在调试面板，则移除
  const existingPanel = document.getElementById('debug-panel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // 创建调试面板
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    width: 300px;
    background-color: rgba(0, 0, 0, 0.8);
    color: #fff;
    font-family: monospace;
    font-size: 12px;
    padding: 10px;
    z-index: 10000;
    max-height: 200px;
    overflow-y: auto;
    border-top-right-radius: 5px;
  `;
  
  // 添加调试信息
  panel.innerHTML = `
    <div>窗口类型: ${windowType}</div>
    <div>窗口名称: ${windowName}</div>
    <div>捕获状态: ${isCapturing ? '开启' : '关闭'}</div>
    <div>同步状态: ${isSyncEnabled ? '开启' : '关闭'}</div>
    <div>已捕获请求: ${capturedRequests.length}</div>
    <button id="toggle-debug">关闭调试</button>
    <button id="test-sync">测试同步</button>
  `;
  
  // 添加到页面
  document.body.appendChild(panel);
  
  // 添加关闭按钮事件
  document.getElementById('toggle-debug').addEventListener('click', () => {
    debugMode = false;
    panel.remove();
  });
  
  // 添加测试同步按钮事件
  document.getElementById('test-sync').addEventListener('click', () => {
    // 只有在主窗口中才发送测试请求
    if (windowType === 'primary') {
      console.log('[越权测试助手] 发送测试同步请求');
      
      // 发送到后台脚本
      chrome.runtime.sendMessage({
        action: 'capturedRequest',
        request: {
          id: generateRequestId(),
          url: window.location.href + '?test=sync',
          method: 'GET',
          timestamp: Date.now()
        }
  });
} else {
      console.log('[越权测试助手] 子窗口不能发送测试请求');
      alert('测试同步功能只能在主窗口中使用');
    }
  });
}

// 添加隔离会话指示器
function addIsolatedSessionIndicator() {
  console.log('[越权测试助手] 添加隔离会话指示器');
  
  // 添加样式到页面，微妙地标记这是隔离会话
  const style = document.createElement('style');
  style.textContent = `
    html {
      border: 2px solid #4CAF50;
      box-sizing: border-box;
    }
    
    #isolated-session-info {
      position: fixed;
      bottom: 10px;
      right: 10px;
      background-color: rgba(76, 175, 80, 0.8);
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 9999;
    }
  `;
  document.head.appendChild(style);
  
  // 添加悬浮提示，表明这是隔离会话
  const infoElement = document.createElement('div');
  infoElement.id = 'isolated-session-info';
  infoElement.textContent = '隔离会话已启用 (ID: ' + (window._isolatedSessionId || 'unknown') + ')';
  document.body.appendChild(infoElement);
  
  // 5秒后淡出提示
  setTimeout(() => {
    if (infoElement && infoElement.parentNode) {
      infoElement.style.opacity = '0.5';
    }
  }, 5000);
}

// 执行请求
async function executeRequest(request) {
  console.log('[越权测试助手] 执行请求:', request);
  
  // 目前简单实现，仅支持GET请求
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers || {},
      // 如果有body且是POST/PUT，添加body
      ...(request.body && ['POST', 'PUT'].includes(request.method.toUpperCase()) ? { body: request.body } : {})
    });
    
    const responseData = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
      timestamp: Date.now()
    };
    
    try {
      // 尝试解析为JSON
      responseData.body = await response.json();
      responseData.bodyType = 'json';
    } catch (e) {
      // 不是JSON，获取文本
      responseData.body = await response.text();
      responseData.bodyType = 'text';
    }
    
    return responseData;
  } catch (error) {
    console.error('[越权测试助手] 执行请求失败:', error);
    throw error;
  }
}

// 监听页面加载完成
window.addEventListener('load', () => {
  console.log('[越权测试助手] 页面加载完成');
  notifyBackgroundScript('pageLoaded', { url: window.location.href });
});

// 监听点击事件
document.addEventListener('click', event => {
  // 查找被点击的链接
  const link = event.target.closest('a');
  if (link && link.href) {
    console.log('[越权测试助手] 链接被点击:', link.href);
    notifyBackgroundScript('linkClicked', { url: link.href });
  }
});

// 监听表单提交
document.addEventListener('submit', event => {
  const form = event.target;
  console.log('[越权测试助手] 表单提交:', form.action);
  notifyBackgroundScript('formSubmitted', {
    url: form.action,
    method: form.method
  });
});

// 监听 URL 变化
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    console.log('[越权测试助手] URL 变化:', window.location.href);
    notifyBackgroundScript('urlChanged', { url: window.location.href });
    lastUrl = window.location.href;
  }
}).observe(document, { subtree: true, childList: true });

// 监听历史记录变化
window.addEventListener('popstate', () => {
  console.log('[越权测试助手] 历史记录变化:', window.location.href);
  notifyBackgroundScript('urlChanged', { url: window.location.href });
});

// 通知后台脚本
function notifyBackgroundScript(action, data) {
  chrome.runtime.sendMessage({
    action: action,
    windowType: windowType,
    windowName: windowName,
    ...data
  }).catch(err => console.error('[越权测试助手] 发送消息失败:', err));
}

// 处理导航
async function handleNavigation(message) {
  try {
    const url = message.url;
    console.log(`[越权测试助手] 处理导航: ${url}`);
    
    // 根据导航类型执行不同的操作
    switch (message.type) {
      case 'linkClicked':
        // 模拟点击链接
        const link = document.querySelector(`a[href="${url}"]`);
        if (link) {
          link.click();
        } else {
          window.location.href = url;
        }
      break;
        
      case 'urlChanged':
      case 'pageLoaded':
        window.location.href = url;
      break;
    }
  } catch (error) {
    console.error('[越权测试助手] 导航处理失败:', error);
  }
}

// 处理请求重放
async function handleRequestReplay(request) {
  try {
    console.log(`[越权测试助手] 重放请求: ${request.method} ${request.url}`);
    
    // 准备请求选项
    const options = {
      method: request.method,
      headers: request.headers || {},
      credentials: 'include'
    };
    
    // 处理请求体
    if (request.body) {
      if (typeof request.body === 'string') {
        options.body = request.body;
      } else if (request.body.raw) {
        // 处理二进制数据
        const data = new Uint8Array(request.body.raw[0].bytes);
        options.body = data;
      } else if (request.body.formData) {
        // 处理表单数据
        const formData = new FormData();
        for (const [key, value] of Object.entries(request.body.formData)) {
          formData.append(key, value);
        }
        options.body = formData;
      }
    }
    
    // 发送请求
    const response = await fetch(request.url, options);
    const responseText = await response.text();
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }
    
    // 发送响应到background
    chrome.runtime.sendMessage({
      action: 'requestCompleted',
      request: {
        id: request.id,
        response: {
          status: response.status,
          body: responseData
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('[越权测试助手] 请求重放失败:', error);
    return false;
  }
} 