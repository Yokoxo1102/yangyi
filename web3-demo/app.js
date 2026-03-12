import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.15.0/+esm";

const $ = (id) => document.getElementById(id);

const el = {
  connectBtn: $("connectBtn"),
  disconnectBtn: $("disconnectBtn"),
  refreshBtn: $("refreshBtn"),
  switchSepoliaBtn: $("switchSepoliaBtn"),

  providerStatus: $("providerStatus"),
  address: $("address"),
  network: $("network"),
  chainId: $("chainId"),
  ethBalance: $("ethBalance"),

  toAddress: $("toAddress"),
  amountEth: $("amountEth"),
  sendBtn: $("sendBtn"),
  sendResult: $("sendResult"),

  tokenAddress: $("tokenAddress"),
  holderAddress: $("holderAddress"),
  tokenQueryBtn: $("tokenQueryBtn"),
  tokenSymbol: $("tokenSymbol"),
  tokenDecimals: $("tokenDecimals"),
  tokenBalance: $("tokenBalance"),

  log: $("log"),
};

/**
 * 状态
 */
let browserProvider = null; // ethers.BrowserProvider
let signer = null; // ethers.Signer
let currentAddress = null;

function log(line, data) {
  const ts = new Date().toLocaleTimeString();
  const msg =
    data === undefined
      ? `[${ts}] ${line}`
      : `[${ts}] ${line} ${typeof data === "string" ? data : JSON.stringify(data, null, 2)}`;
  el.log.textContent = `${msg}\n${el.log.textContent}`.trimEnd() + "\n";
}

function setConnectedUI(connected) {
  el.connectBtn.disabled = connected;
  el.disconnectBtn.disabled = !connected;
  el.refreshBtn.disabled = !connected;
  el.switchSepoliaBtn.disabled = !connected;
  el.sendBtn.disabled = !connected;
  el.tokenQueryBtn.disabled = !connected;

  el.providerStatus.textContent = connected ? "已连接" : "未连接";
  if (!connected) {
    el.address.textContent = "-";
    el.network.textContent = "-";
    el.chainId.textContent = "-";
    el.ethBalance.textContent = "-";
    el.sendResult.textContent = " ";
    el.tokenSymbol.textContent = "-";
    el.tokenDecimals.textContent = "-";
    el.tokenBalance.textContent = "-";
  }
}

function assertWallet() {
  if (!window.ethereum) {
    throw new Error("未检测到钱包注入（window.ethereum）。请安装/启用 MetaMask。");
  }
}

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr ?? "-";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

async function refreshAccountInfo() {
  if (!browserProvider || !currentAddress) return;
  const network = await browserProvider.getNetwork();
  const balanceWei = await browserProvider.getBalance(currentAddress);
  const balanceEth = ethers.formatEther(balanceWei);

  el.address.textContent = currentAddress;
  el.network.textContent = network.name || "unknown";
  el.chainId.textContent = network.chainId.toString();
  el.ethBalance.textContent = `${balanceEth} ETH`;

  log("刷新账户信息", {
    address: currentAddress,
    network: { name: network.name, chainId: network.chainId.toString() },
    eth: balanceEth,
  });
}

async function connect() {
  assertWallet();
  try {
    browserProvider = new ethers.BrowserProvider(window.ethereum, "any");
    await browserProvider.send("eth_requestAccounts", []);
    signer = await browserProvider.getSigner();
    currentAddress = await signer.getAddress();

    setConnectedUI(true);
    log("连接成功", { address: currentAddress });
    await refreshAccountInfo();

    // 监听账户/网络变化
    window.ethereum.on?.("accountsChanged", async (accounts) => {
      log("accountsChanged", accounts);
      if (!accounts || accounts.length === 0) {
        disconnect();
        return;
      }
      currentAddress = ethers.getAddress(accounts[0]);
      signer = await browserProvider.getSigner();
      await refreshAccountInfo();
    });

    window.ethereum.on?.("chainChanged", async (chainIdHex) => {
      log("chainChanged", chainIdHex);
      // BrowserProvider 在 "any" 模式下会自动适配网络；这里刷新一下展示即可
      await refreshAccountInfo();
    });
  } catch (err) {
    log("连接失败", { message: err?.message ?? String(err) });
    alert(`连接失败：${err?.message ?? err}`);
    disconnect();
  }
}

function disconnect() {
  // 注：EIP-1193 没有标准“断开钱包”的方法；这里只是清理本页面状态。
  browserProvider = null;
  signer = null;
  currentAddress = null;
  setConnectedUI(false);
  log("已断开（仅本页面状态）");
}

async function switchToSepolia() {
  assertWallet();
  try {
    // Sepolia: chainId 11155111 (0xaa36a7)
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xaa36a7" }],
    });
    log("已请求切换到 Sepolia");
  } catch (err) {
    // 4902: 未添加该网络
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0xaa36a7",
            chainName: "Sepolia",
            nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://rpc.sepolia.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
        ],
      });
      log("已请求添加并切换到 Sepolia");
      return;
    }
    log("切换网络失败", { message: err?.message ?? String(err), code: err?.code });
    alert(`切换网络失败：${err?.message ?? err}`);
  }
}

async function sendEth() {
  if (!signer) return;
  el.sendResult.textContent = " ";
  try {
    const to = el.toAddress.value.trim();
    const amount = el.amountEth.value.trim();
    if (!to) throw new Error("请输入收款地址");
    if (!amount) throw new Error("请输入金额（ETH）");

    const toChecksum = ethers.getAddress(to);
    const value = ethers.parseEther(amount);

    log("发起交易", { to: toChecksum, amountEth: amount });
    el.sendResult.textContent = "正在发送交易…请在钱包里确认";

    const tx = await signer.sendTransaction({ to: toChecksum, value });
    el.sendResult.textContent = `已发出：${tx.hash}`;
    log("交易已发送", { hash: tx.hash, to: toChecksum, value: value.toString() });

    el.sendResult.textContent = `等待确认：${tx.hash}`;
    const receipt = await tx.wait();
    el.sendResult.textContent = `已确认 ✅ 区块：${receipt.blockNumber}  哈希：${tx.hash}`;
    log("交易已确认", { blockNumber: receipt.blockNumber, status: receipt.status });

    await refreshAccountInfo();
  } catch (err) {
    const msg = err?.shortMessage || err?.message || String(err);
    el.sendResult.textContent = `失败：${msg}`;
    log("发送失败", { message: msg });
  }
}

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

async function queryErc20Balance() {
  if (!browserProvider) return;
  try {
    const tokenAddr = el.tokenAddress.value.trim();
    if (!tokenAddr) throw new Error("请输入 Token 合约地址");
    const token = new ethers.Contract(ethers.getAddress(tokenAddr), ERC20_ABI, browserProvider);

    const holder =
      el.holderAddress.value.trim() ||
      (currentAddress ? currentAddress : await (await browserProvider.getSigner()).getAddress());
    const holderChecksum = ethers.getAddress(holder);

    const [symbol, decimals, bal] = await Promise.all([
      token.symbol(),
      token.decimals(),
      token.balanceOf(holderChecksum),
    ]);
    const human = ethers.formatUnits(bal, decimals);

    el.tokenSymbol.textContent = symbol;
    el.tokenDecimals.textContent = decimals.toString();
    el.tokenBalance.textContent = human;

    log("ERC20 余额", { token: token.target, holder: holderChecksum, symbol, decimals, balance: human });
  } catch (err) {
    const msg = err?.shortMessage || err?.message || String(err);
    log("查询 ERC20 失败", { message: msg });
    alert(`查询失败：${msg}`);
  }
}

function init() {
  setConnectedUI(false);

  if (!window.ethereum) {
    el.providerStatus.textContent = "未检测到钱包（请安装 MetaMask）";
    log("未检测到 window.ethereum");
    return;
  }

  // 尝试读取已连接账户（不主动弹窗）
  window.ethereum
    .request({ method: "eth_accounts" })
    .then(async (accounts) => {
      if (accounts && accounts.length > 0) {
        log("检测到已授权账户", accounts.map(shortAddr));
        await connect();
      } else {
        log("尚未授权账户（需要点击连接）");
      }
    })
    .catch((err) => {
      log("读取 eth_accounts 失败", { message: err?.message ?? String(err) });
    });

  el.connectBtn.addEventListener("click", connect);
  el.disconnectBtn.addEventListener("click", disconnect);
  el.refreshBtn.addEventListener("click", refreshAccountInfo);
  el.switchSepoliaBtn.addEventListener("click", switchToSepolia);
  el.sendBtn.addEventListener("click", sendEth);
  el.tokenQueryBtn.addEventListener("click", queryErc20Balance);
}

init();
