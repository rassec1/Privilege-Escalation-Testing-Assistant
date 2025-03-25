// 全局变量
let capturedRequests = [];     // 捕获的请求列表
let selectedRequest = null;    // 当前选中的请求
let isCapturing = true;        // 捕获状态（默认开启）
let primaryWindowId = null;    // 主窗口ID
let secondaryWindows = [];     // 子窗口列表
let isSyncEnabled = true;      // 同步开关（默认开启）
let originalResponses = {};    // 存储原始响应

// DOM元素加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('[越权测试助手] 弹出页面已加载');
  
  // 初始化标签页切换
  initTabs();
  
  // 初始化窗口管理
  initWindowManagement();
  
  // 初始化请求分析
  initRequestAnalysis();
  
  // 初始化越权测试
  initPrivilegeTest();
  
  // 获取初始状态
  updateState();
});

// 初始化标签页
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });
}

// 初始化窗口管理
function initWindowManagement() {
  // 快速操作按钮
  document.getElementById('quick-create-primary').addEventListener('click', createPrimaryWindow);
  document.getElementById('quick-create-incognito').addEventListener('click', createIncognitoWindow);
  
  // 常规按钮
  document.getElementById('create-primary').addEventListener('click', createPrimaryWindow);
  document.getElementById('create-secondary').addEventListener('click', createIncognitoWindow);
  
  // 同步开关
  document.getElementById('sync-toggle').addEventListener('change', event => {
    chrome.runtime.sendMessage({
      action: 'setSyncEnabled',
      enabled: event.target.checked
    });
  });
}

// 初始化请求分析
function initRequestAnalysis() {
  // 请求捕获控制
  document.getElementById('start-capture').addEventListener('click', toggleCapture);
  document.getElementById('clear-requests').addEventListener('click', clearRequests);
  
  // 请求过滤器
  document.getElementById('request-filter').addEventListener('change', filterRequests);
  
  // 请求操作按钮
  document.getElementById('copy-request').addEventListener('click', copyRequestAsCurl);
  document.getElementById('edit-request').addEventListener('click', showRequestEditor);
  document.getElementById('send-request').addEventListener('click', sendRequest);
  
  // 监听来自后台的请求捕获消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'requestCaptured') {
      addCapturedRequest(message.request);
    }
  });
}

// 初始化越权测试
function initPrivilegeTest() {
  // 水平越权测试
  document.querySelector('.test-section button:nth-child(1)').addEventListener('click', () => {
    const userId = document.getElementById('user-id').value;
    const userValue = document.getElementById('user-value').value;
    testHorizontalPrivilegeEscalation(userId, userValue);
  });
  
  // 垂直越权测试
  document.querySelector('.test-section button:nth-child(2)').addEventListener('click', () => {
    const roleId = document.getElementById('role-id').value;
    const roleValue = document.getElementById('role-value').value;
    testVerticalPrivilegeEscalation(roleId, roleValue);
  });
  
  // API测试
  document.querySelector('.test-section button.start').addEventListener('click', () => {
    const url = document.getElementById('api-url').value;
    const method = document.getElementById('http-method').value;
    const params = document.getElementById('request-params').value;
    testApiPrivilegeEscalation(url, method, params);
  });
}

// 创建普通窗口
async function createPrimaryWindow() {
  try {
    await chrome.runtime.sendMessage({ action: 'createPrimaryWindow' });
    showNotification('普通窗口创建成功', 'success');
    updateState();
  } catch (error) {
    showNotification('普通窗口创建失败: ' + error.message, 'error');
  }
}

// 创建隐身窗口
async function createIncognitoWindow() {
  try {
    await chrome.runtime.sendMessage({ action: 'createSecondaryWindow' });
    showNotification('隐身窗口创建成功', 'success');
    updateState();
  } catch (error) {
    showNotification('隐身窗口创建失败: ' + error.message, 'error');
  }
}

// 更新窗口列表
function updateWindowList(windows) {
  const windowList = document.getElementById('window-list');
  
  if (!windows || windows.length === 0) {
    windowList.innerHTML = '<div class="no-windows-msg">暂无窗口，请先创建窗口</div>';
    return;
  }
  
  windowList.innerHTML = windows.map(window => `
    <div class="window-item ${window.isIncognito ? 'incognito' : 'primary'}">
      <div class="window-info">
        <div class="window-name">${window.name}</div>
        <div class="window-id">ID: ${window.id}</div>
        <div class="window-type">${window.isIncognito ? '隐身窗口' : '普通窗口'}</div>
      </div>
      <div class="window-actions">
        <button class="window-action focus" onclick="focusWindow(${window.id})">切换</button>
        <button class="window-action close" onclick="closeWindow(${window.id})">关闭</button>
      </div>
    </div>
  `).join('');
}

// 添加捕获的请求
function addCapturedRequest(request) {
  capturedRequests.unshift(request);
  updateRequestList();
}

// 更新请求列表
function updateRequestList() {
  const requestList = document.getElementById('request-list');
  const filter = document.getElementById('request-filter').value;
  
  const filteredRequests = filterRequestsByType(capturedRequests, filter);
  
  if (filteredRequests.length === 0) {
    requestList.innerHTML = '<div class="no-requests-msg">尚未捕获任何请求</div>';
    return;
  }
  
  requestList.innerHTML = filteredRequests.map((request, index) => `
    <div class="request-item ${selectedRequest === request ? 'selected' : ''}" onclick="selectRequest(${index})">
      <div class="request-method">${request.method}</div>
      <div class="request-url">${request.url}</div>
      <div class="request-time">${new Date(request.timestamp).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

// 根据类型过滤请求
function filterRequestsByType(requests, type) {
  if (type === 'all') return requests;
  
  return requests.filter(request => {
    switch (type) {
      case 'api':
        return request.url.includes('/api/');
      case 'form':
        return request.method === 'POST' && request.headers['content-type']?.includes('form');
      case 'get':
        return request.method === 'GET';
      case 'post':
        return request.method === 'POST';
      default:
        return true;
    }
  });
}

// 测试水平越权
async function testHorizontalPrivilegeEscalation(userId, userValue) {
  if (!selectedRequest) {
    showNotification('请先选择一个请求进行测试', 'warning');
    return;
  }
  
  try {
    const modifiedRequest = modifyRequestParams(selectedRequest, {
      [userId]: userValue
    });
    
    await sendTestRequest(modifiedRequest);
    showNotification('水平越权测试请求已发送', 'success');
  } catch (error) {
    showNotification('水平越权测试失败: ' + error.message, 'error');
  }
}

// 测试垂直越权
async function testVerticalPrivilegeEscalation(roleId, roleValue) {
  if (!selectedRequest) {
    showNotification('请先选择一个请求进行测试', 'warning');
    return;
  }
  
  try {
    const modifiedRequest = modifyRequestParams(selectedRequest, {
      [roleId]: roleValue
    });
    
    await sendTestRequest(modifiedRequest);
    showNotification('垂直越权测试请求已发送', 'success');
  } catch (error) {
    showNotification('垂直越权测试失败: ' + error.message, 'error');
  }
}

// 测试API越权
async function testApiPrivilegeEscalation(url, method, params) {
  try {
    const request = {
      url: url,
      method: method,
      body: params ? JSON.parse(params) : undefined
    };
    
    await sendTestRequest(request);
    showNotification('API越权测试请求已发送', 'success');
  } catch (error) {
    showNotification('API越权测试失败: ' + error.message, 'error');
  }
}

// 修改请求参数
function modifyRequestParams(request, params) {
  const modified = { ...request };
  
  if (request.method === 'GET') {
    const url = new URL(request.url);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    modified.url = url.toString();
  } else {
    if (typeof request.body === 'string') {
      try {
        modified.body = JSON.parse(request.body);
      } catch {
        modified.body = request.body;
      }
    }
    
    if (typeof modified.body === 'object') {
      modified.body = { ...modified.body, ...params };
    }
  }
  
  return modified;
}

// 发送测试请求
async function sendTestRequest(request) {
  return chrome.runtime.sendMessage({
    action: 'sendTestRequest',
    request: request
  });
}

// 显示通知
function showNotification(message, type = 'info') {
  const notifications = document.getElementById('notifications');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  notifications.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// 更新状态
async function updateState() {
  const state = await chrome.runtime.sendMessage({ action: 'getState' });
  
  // 更新同步开关
  document.getElementById('sync-toggle').checked = state.syncEnabled;
  
  // 更新窗口列表
  updateWindowList(state.windows);
  
  // 更新捕获状态
  document.getElementById('start-capture').textContent = 
    state.isCapturing ? '停止捕获' : '开始捕获';
  document.getElementById('start-capture').className = 
    state.isCapturing ? 'action-btn stop' : 'action-btn start';
}

// 切换同步状态
function toggleSync(enabled) {
  console.log(`[越权测试助手] 切换同步状态: ${enabled}`);
  
  chrome.runtime.sendMessage({
    action: 'toggleSync',
    enabled: enabled
  }, response => {
    if (response && response.success) {
      isSyncEnabled = enabled;
      showNotification(`已${enabled ? '开启' : '关闭'}自动同步请求`, 'info');
    }
  });
}

// 切换捕获状态
function toggleCapture() {
  console.log(`[越权测试助手] 切换捕获状态: ${!isCapturing}`);
  
  chrome.runtime.sendMessage({
    action: 'toggleCapturing',
    enabled: !isCapturing
  }, response => {
    if (response && response.success) {
      isCapturing = !isCapturing;
      updateCaptureButton();
      showNotification(`已${isCapturing ? '开始' : '停止'}捕获请求`, 'info');
    }
  });
}

// 更新捕获按钮
function updateCaptureButton() {
  console.log(`[越权测试助手] 更新捕获按钮: ${isCapturing}`);
  
  const captureButton = document.getElementById('start-capture');
  if (!captureButton) return;
  
  if (isCapturing) {
    captureButton.textContent = '停止捕获';
    captureButton.className = 'action-btn stop';
  } else {
    captureButton.textContent = '开始捕获';
    captureButton.className = 'action-btn start';
  }
}

// 清空请求
function clearRequests() {
  console.log('[越权测试助手] 清空请求');
  
  chrome.runtime.sendMessage({ action: 'clearRequests' }, response => {
    if (response && response.success) {
      capturedRequests = [];
      selectedRequest = null;
      updateRequestList();
      showNotification('已清空所有捕获的请求', 'info');
    }
  });
}

// 选择请求
function selectRequest(index) {
  console.log('[越权测试助手] 选择请求:', capturedRequests[index]);
  
  selectedRequest = capturedRequests[index];
  
  // 更新请求列表选中状态
  const requestItems = document.querySelectorAll('.request-item');
  requestItems.forEach(item => {
    if (parseInt(item.dataset.index) === index) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
  
  // 更新请求详情
  const requestDetails = document.getElementById('request-details');
  if (!requestDetails) return;
  
  requestDetails.innerHTML = formatRequestDetails(selectedRequest);
}

// 格式化请求详情
function formatRequestDetails(request) {
  console.log('[越权测试助手] 格式化请求详情:', request);
  
  if (!request) return '<div class="no-selection-msg">请选择一个请求查看详情</div>';
  
  // 格式化时间
  const time = new Date(request.timestamp).toLocaleString();
  
  // 格式化cURL命令
  const curlCommand = formatAsCurl(request);
  
  // 格式化JSON
  const jsonData = JSON.stringify(request, null, 2);
  
  return `
    <div class="details-header">
      <div class="details-method">${request.method}</div>
      <div class="details-url">${request.url}</div>
    </div>
    <div class="details-time">时间: ${time}</div>
    <div class="details-section">
      <div class="section-header">cURL 命令:</div>
      <div class="section-content curl">${curlCommand}</div>
    </div>
    <div class="details-section">
      <div class="section-header">请求数据:</div>
      <div class="section-content json">${jsonData}</div>
    </div>
  `;
}

// 格式化为cURL命令
function formatAsCurl(request) {
  console.log('[越权测试助手] 格式化为cURL命令:', request);
  
  if (!request) return '';
  
  let curl = `curl -X ${request.method} "${request.url}"`;
  
  // 添加头信息
  if (request.headers) {
    Object.entries(request.headers).forEach(([key, value]) => {
      curl += ` -H "${key}: ${value.replace(/"/g, '\\"')}"`;
    });
  }
  
  // 添加body
  if (request.body && ['POST', 'PUT'].includes(request.method)) {
    curl += ` -d '${request.body}'`;
  }
  
  return curl;
}

// 复制请求详情
function copyRequestAsCurl() {
  console.log('[越权测试助手] 复制请求详情');
  
  if (!selectedRequest) {
    showNotification('请先选择一个请求', 'warning');
    return;
  }
  
  // 复制cURL命令
  const curlCommand = formatAsCurl(selectedRequest);
  
  navigator.clipboard.writeText(curlCommand)
    .then(() => {
      showNotification('已复制为cURL命令', 'success');
    })
    .catch(err => {
      console.error('[越权测试助手] 复制失败:', err);
      showNotification('复制失败: ' + err.message, 'error');
    });
}

// 发送请求
function sendRequest() {
  console.log('[越权测试助手] 发送请求');
  
  if (!selectedRequest) {
    showNotification('请先选择一个请求', 'warning');
    return;
  }
  
  // 获取目标
  const replayTarget = document.getElementById('replay-target');
  const targetValue = replayTarget ? replayTarget.value : '';
  
  if (targetValue === 'manual') {
    // 手动执行
    executeRequest(selectedRequest)
      .then(response => {
        console.log('[越权测试助手] 请求执行成功:', response);
        showNotification('请求已在当前窗口执行', 'success');
      })
      .catch(error => {
        console.error('[越权测试助手] 请求执行失败:', error);
        showNotification('请求执行失败: ' + error.message, 'error');
      });
  } else if (targetValue === '') {
    // 发送到所有子窗口
    if (secondaryWindows.length === 0) {
      showNotification('没有可用的子窗口，请先创建', 'warning');
      return;
    }
    
    chrome.runtime.sendMessage({
      action: 'replayRequest',
      request: selectedRequest,
      targetWindowId: null
    }, response => {
      if (response && response.success) {
        showNotification('请求已发送到所有子窗口', 'success');
      }
    });
  } else {
    // 发送到指定窗口
    const targetWindowId = parseInt(targetValue);
    
    chrome.runtime.sendMessage({
      action: 'replayRequest',
      request: selectedRequest,
      targetWindowId: targetWindowId
    }, response => {
      if (response && response.success) {
        showNotification('请求已发送到指定窗口', 'success');
      }
    });
  }
}

// 执行请求
async function executeRequest(request) {
  console.log('[越权测试助手] 执行请求:', request);
  
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers || {},
      // 如果有body且是POST/PUT，添加body
      ...(request.body && ['POST', 'PUT'].includes(request.method.toUpperCase()) ? { body: request.body } : {})
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
      body: responseData,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[越权测试助手] 执行请求失败:', error);
    throw error;
  }
}

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[越权测试助手] 收到消息:', message);
  
  if (message.action === 'updateRequests') {
    // 更新请求列表
    capturedRequests = message.requests;
    updateRequestList();
    sendResponse({ success: true });
  } else if (message.action === 'showNotification') {
    // 显示通知
    showNotification(message.message, message.type);
    sendResponse({ success: true });
  }
  
  return true; // 保持通道开放，允许异步响应
}); 