# Web3 Demo（ethers v6 + MetaMask）

这是一个**纯前端** Web3 DApp 示例：
- 连接 MetaMask（EIP-1193）
- 显示地址、网络、ChainId、ETH 余额
- 发送 ETH 交易
- 查询任意 ERC20 的余额（symbol/decimals/balanceOf）

## 目录
- `index.html`：页面
- `styles.css`：样式
- `app.js`：业务逻辑（使用 `ethers@6` 的 CDN ESM 版本）

## 运行方式（本地）
浏览器的 MetaMask 通常要求页面来自 `http://` 或 `https://`，不要用 `file://` 直接打开。

在该目录启动一个静态服务器即可：

```bash
cd /workspace/web3-demo
python3 -m http.server 5173
```

然后浏览器打开：
- `http://localhost:5173`

## 使用说明
1. 点击「连接钱包」
2. 需要测试网的话，点击「切到 Sepolia」
3. 发送 ETH：输入收款地址 + 金额（ETH），点击「发送」
4. 查询 ERC20：输入 token 合约地址（可选输入 holder 地址），点击「查询」

## 常见问题
- **没有 window.ethereum**：说明没有安装/启用 MetaMask（或浏览器不支持扩展）。
- **切换到 Sepolia 失败**：钱包可能禁用了自动添加网络；你也可以手动在钱包里添加 Sepolia。
- **ERC20 查询失败**：确认 token 地址是 ERC20 合约、当前链上存在该合约、RPC 正常。

