// 全局变量
let primaryWindowId = null;
let secondaryWindows = [];
let isCapturing = true;
let isSyncEnabled = true;
let capturedRequests = [];
let originalResponses = new Map();
let pendingRequests = new Map(); // 用于跟踪待同步的请求

// 调试开关
const DEBUG = true;  // 调试模式
console.log('[越权测试助手] 后台脚本已加载');

// 添加更多的调试日志
function logWindowDetails(window, context) {
  if (!window) {
    console.log(`[越权测试助手] [${context}] 窗口对象为空`);
    return;
  }
  
  console.log(`[越权测试助手] [${context}] 窗口详情:
    ID: ${window.id}
    隐身模式: ${window.incognito}
    类型: ${window.type}
    状态: ${window.state}
    尺寸: ${window.width}x${window.height}
    位置: (${window.left}, ${window.top})
    标签页数: ${window.tabs ? window.tabs.length : '未知'}
  `);
}

// 监听扩展安装/更新
chrome.runtime.onInstalled.addListener(() => {
  console.log('[越权测试助手] 扩展已安装/更新');
});

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[越权测试助手] 收到消息:', message);
  
  switch (message.action) {
    case 'createPrimaryWindow':
      createPrimaryWindow().then(sendResponse);
      break;
      
    case 'createSecondaryWindow':
      createSecondaryWindow(message.name).then(sendResponse);
      break;
      
    case 'closeWindow':
      closeWindow(message.windowId).then(sendResponse);
      break;
      
    case 'getState':
      getState().then(sendResponse);
      break;
      
    case 'setSyncEnabled':
      setSyncEnabled(message.enabled).then(sendResponse);
      break;
      
    case 'toggleCapturing':
      toggleCapturing(message.enabled).then(sendResponse);
      break;
      
    case 'clearRequests':
      clearRequests().then(sendResponse);
      break;
      
    case 'sendTestRequest':
      sendTestRequest(message.request).then(sendResponse);
      break;
      
    case 'linkClicked':
    case 'urlChanged':
    case 'pageLoaded':
      handleNavigation(message, sender).then(sendResponse);
      break;
      
    case 'requestCaptured':
      handleRequestCapture(message.request, sender).then(sendResponse);
      break;
      
    case 'requestCompleted':
      handleRequestComplete(message.request, sender).then(sendResponse);
      break;
      
    default:
      console.warn('[越权测试助手] 未知消息类型:', message.action);
      sendResponse({ success: false, error: '未知消息类型' });
  }
  
  return true; // 保持消息通道开放
});

// 创建普通窗口
async function createPrimaryWindow() {
  try {
    const window = await chrome.windows.create({
      url: 'https://www.baidu.com',
      type: 'normal',
      state: 'normal',
      width: 1200,
      height: 800
    });

    if (!window || !window.id) {
      throw new Error('窗口创建失败');
    }

    primaryWindowId = window.id;
    
    // 注入内容脚本
    await injectContentScript(window.id, 'normal', '普通窗口');
    
    // 保存状态
    saveState();
    
    return { success: true, window };
  } catch (error) {
    console.error('[越权测试助手] 创建普通窗口失败:', error);
    return { success: false, error: error.message };
  }
}

// 创建隐身窗口
async function createSecondaryWindow(name = '隐身窗口') {
  try {
  const window = await chrome.windows.create({
      url: 'about:blank',
      incognito: true,
    type: 'normal',
      width: 1200,
      height: 800,
      left: 100,
      top: 100
    });

    if (!window || !window.id) {
      throw new Error('隐身窗口创建失败');
    }

    // 等待窗口创建完成
    await new Promise(resolve => setTimeout(resolve, 500));

    // 更新标签页URL
    const tabs = await chrome.tabs.query({ windowId: window.id });
    if (!tabs || tabs.length === 0) {
      throw new Error('无法获取隐身窗口标签页');
    }

    await chrome.tabs.update(tabs[0].id, {
      url: 'https://www.baidu.com'
    });

    // 添加到窗口列表
    const secondaryWindow = {
    id: window.id,
      name: name || `隐身窗口 ${secondaryWindows.length + 1}`,
      createdAt: Date.now(),
      isIncognito: true
    };
    
    secondaryWindows.push(secondaryWindow);
    
    // 注入内容脚本
    await injectContentScript(window.id, 'incognito', secondaryWindow.name);
    
    // 保存状态
    saveState();
    
    return { success: true, window: secondaryWindow };
  } catch (error) {
    console.error('[越权测试助手] 创建隐身窗口失败:', error);
    return { success: false, error: error.message };
  }
}

// 注入内容脚本
async function injectContentScript(windowId, windowType, windowName) {
  try {
    const tabs = await chrome.tabs.query({ windowId: windowId });
    if (!tabs || tabs.length === 0) {
      throw new Error('未找到目标窗口的标签页');
    }

    const tab = tabs[0];
    
    // 注入内容脚本
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['contentScript.js']
    });
    
    // 设置窗口类型
    await chrome.tabs.sendMessage(tab.id, {
      action: 'setWindowType',
      windowType: windowType,
      windowName: windowName
    });
    
    return true;
  } catch (error) {
    console.error('[越权测试助手] 内容脚本注入失败:', error);
    throw error;
  }
}

// 关闭窗口
async function closeWindow(windowId) {
  try {
    await chrome.windows.remove(windowId);
    
    // 更新窗口列表
    if (windowId === primaryWindowId) {
      primaryWindowId = null;
    } else {
      secondaryWindows = secondaryWindows.filter(w => w.id !== windowId);
    }
    
    // 保存状态
    saveState();
    
    return { success: true };
  } catch (error) {
    console.error('[越权测试助手] 关闭窗口失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取状态
async function getState() {
  return {
    success: true,
    primaryWindowId,
    windows: [
      ...(primaryWindowId ? [{
        id: primaryWindowId,
        name: '普通窗口',
        isIncognito: false
      }] : []),
      ...secondaryWindows
    ],
    isCapturing,
    isSyncEnabled,
    capturedRequests
  };
}

// 设置同步状态
async function setSyncEnabled(enabled) {
  isSyncEnabled = enabled;
  saveState();
  return { success: true };
}

// 切换捕获状态
async function toggleCapturing(enabled) {
  isCapturing = enabled;
  saveState();
  return { success: true };
}

// 清空请求
async function clearRequests() {
  capturedRequests = [];
  originalResponses.clear();
  saveState();
  return { success: true };
}

// 发送测试请求
async function sendTestRequest(request) {
  try {
    // 获取原始响应
    const originalResponse = originalResponses.get(request.url);
    
    // 发送请求
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers || {},
      body: request.body,
      credentials: 'include'
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // 比较响应
    const comparisonResult = compareResponses(originalResponse, {
      status: response.status,
      body: responseData
    });

    // 添加到捕获列表
    const capturedRequest = {
      ...request,
      timestamp: Date.now(),
      response: {
        status: response.status,
        body: responseData
      },
      comparisonResult
    };

    capturedRequests.unshift(capturedRequest);
    
    // 通知popup更新
    notifyPopup('updateRequests', { requests: capturedRequests });
    
    return { success: true, response: capturedRequest };
  } catch (error) {
    console.error('[越权测试助手] 发送测试请求失败:', error);
    return { success: false, error: error.message };
  }
}

// 比较响应
function compareResponses(original, current) {
  if (!original) return { isDifferent: null, details: '无原始响应用于比较' };
  
  const differences = [];
  
  // 比较状态码
  if (original.status !== current.status) {
    differences.push(`状态码不同: ${original.status} -> ${current.status}`);
  }
  
  // 比较响应体
  if (typeof original.body === 'object' && typeof current.body === 'object') {
    const bodyDiffs = compareObjects(original.body, current.body);
    differences.push(...bodyDiffs);
  } else if (original.body !== current.body) {
    differences.push('响应内容不同');
  }
  
  return {
    isDifferent: differences.length > 0,
    details: differences.join('\n')
  };
}

// 比较对象
function compareObjects(original, current, path = '') {
  const differences = [];
  
  // 获取所有键
  const allKeys = new Set([
    ...Object.keys(original),
    ...Object.keys(current)
  ]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (!(key in original)) {
      differences.push(`新增字段: ${currentPath}`);
      continue;
    }
    
    if (!(key in current)) {
      differences.push(`缺少字段: ${currentPath}`);
      continue;
    }
    
    if (typeof original[key] !== typeof current[key]) {
      differences.push(`类型不同: ${currentPath}`);
      continue;
    }
    
    if (typeof original[key] === 'object') {
      differences.push(...compareObjects(original[key], current[key], currentPath));
    } else if (original[key] !== current[key]) {
      differences.push(`值不同: ${currentPath}`);
    }
  }
  
  return differences;
}

// 保存状态
function saveState() {
  chrome.storage.local.set({
    primaryWindowId,
    secondaryWindows,
    isCapturing,
    isSyncEnabled,
    capturedRequests: capturedRequests.slice(0, 100) // 只保存最近100条
  });
}

// 加载状态
async function loadState() {
  const state = await chrome.storage.local.get([
    'primaryWindowId',
    'secondaryWindows',
    'isCapturing',
    'isSyncEnabled',
    'capturedRequests'
  ]);
  
  primaryWindowId = state.primaryWindowId || null;
  secondaryWindows = state.secondaryWindows || [];
  isCapturing = state.isCapturing !== undefined ? state.isCapturing : true;
  isSyncEnabled = state.isSyncEnabled !== undefined ? state.isSyncEnabled : true;
  capturedRequests = state.capturedRequests || [];
}

// 通知popup
function notifyPopup(action, data) {
  chrome.runtime.sendMessage({
    action,
    ...data
  });
}

// 监听请求
chrome.webRequest.onBeforeRequest.addListener(
  details => {
    if (!isCapturing) return;
    
    // 记录原始请求
    const request = {
              url: details.url,
              method: details.method,
      body: details.requestBody,
      timestamp: Date.now()
    };
    
    capturedRequests.unshift(request);
    
    // 通知popup
    notifyPopup('requestCaptured', { request });
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// 监听响应
chrome.webRequest.onCompleted.addListener(
  details => {
    if (!isCapturing) return;
    
    // 存储原始响应
    originalResponses.set(details.url, {
      status: details.statusCode,
      body: details.responseBody
    });
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// 处理导航事件
async function handleNavigation(message, sender) {
  try {
    // 只处理主窗口的导航事件
    if (!sender.tab || sender.tab.windowId !== primaryWindowId) {
      return { success: true };
    }

    // 同步到所有隐身窗口
    for (const window of secondaryWindows) {
      try {
        const tabs = await chrome.tabs.query({ active: true, windowId: window.id });
        if (!tabs || tabs.length === 0) continue;

        await chrome.tabs.sendMessage(tabs[0].id, {
          action: 'navigate',
          url: message.url,
          type: message.action
        });
      } catch (error) {
        console.error(`[越权测试助手] 同步导航到窗口 ${window.id} 失败:`, error);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[越权测试助手] 处理导航事件失败:', error);
    return { success: false, error: error.message };
  }
}

// 处理请求捕获
async function handleRequestCapture(request, sender) {
  try {
    // 只处理主窗口的请求
    if (!sender.tab || sender.tab.windowId !== primaryWindowId) {
      return { success: true };
    }

    // 生成请求ID
    const requestId = generateRequestId();
    request.id = requestId;
    
    // 存储请求信息
    pendingRequests.set(requestId, {
      request,
      timestamp: Date.now(),
      completed: false
    });

    // 如果同步开启，发送到所有隐身窗口
    if (isSyncEnabled) {
      for (const window of secondaryWindows) {
        try {
          const tabs = await chrome.tabs.query({ active: true, windowId: window.id });
          if (!tabs || tabs.length === 0) continue;

          await chrome.tabs.sendMessage(tabs[0].id, {
            action: 'replayRequest',
            request: request
          });
        } catch (error) {
          console.error(`[越权测试助手] 同步请求到窗口 ${window.id} 失败:`, error);
        }
      }
    }

    return { success: true, requestId };
  } catch (error) {
    console.error('[越权测试助手] 处理请求捕获失败:', error);
    return { success: false, error: error.message };
  }
}

// 处理请求完成
async function handleRequestComplete(request, sender) {
  try {
    const pendingRequest = pendingRequests.get(request.id);
    if (!pendingRequest) {
      return { success: true };
    }

    // 更新请求状态
    pendingRequest.completed = true;
    pendingRequest.response = request.response;

    // 检查是否所有窗口都完成了请求
    const allCompleted = Array.from(pendingRequests.values())
      .filter(r => r.request.id === request.id)
      .every(r => r.completed);

    if (allCompleted) {
      // 比较所有窗口的响应
      const responses = Array.from(pendingRequests.values())
        .filter(r => r.request.id === request.id)
        .map(r => r.response);

      const comparisonResult = compareMultipleResponses(responses);
      
      // 添加到捕获列表
      const capturedRequest = {
        ...pendingRequest.request,
        timestamp: Date.now(),
        responses,
        comparisonResult
      };

      capturedRequests.unshift(capturedRequest);
      
      // 通知popup更新
      notifyPopup('updateRequests', { requests: capturedRequests });
      
      // 清理已完成的请求
      pendingRequests.delete(request.id);
    }

    return { success: true };
  } catch (error) {
    console.error('[越权测试助手] 处理请求完成失败:', error);
    return { success: false, error: error.message };
  }
}

// 比较多个响应
function compareMultipleResponses(responses) {
  if (responses.length < 2) {
    return { isDifferent: false, details: '只有一个响应，无法比较' };
  }

  const differences = [];
  const baseResponse = responses[0];

  for (let i = 1; i < responses.length; i++) {
    const currentResponse = responses[i];
    const windowDiffs = compareResponses(baseResponse, currentResponse);
    
    if (windowDiffs.isDifferent) {
      differences.push(`窗口 ${i} 与主窗口的差异:\n${windowDiffs.details}`);
    }
  }

  return {
    isDifferent: differences.length > 0,
    details: differences.join('\n\n')
  };
}

// 生成请求ID
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// 初始化
loadState();