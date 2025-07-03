# Windows環境での構造的対話ログ学習システム v7.0 アクセスガイド

## 🌐 WSL2 ネットワーク接続問題の解決方法

### 📊 現在の状況 (v7.0)
- **システム**: 構造的対話ログ学習システム・プロダクションレベル完成版
- **WSL IP**: `172.17.xxx.xxx` (実際のIPは `ip addr show eth0` で確認)  
- **サーバーポート**: `3000` (デフォルト)
- **リッスン設定**: `0.0.0.0` (全IPアドレス対応済み)
- **API エンドポイント**: 12+ REST API

---

## 🔧 解決方法

### 方法1: localhostアクセス（推奨）
```
http://localhost:3000
```
**注意**: WSL2のlocalhost転送が有効な場合のみ動作

### 方法2: WSL IPアドレス直接アクセス
```
http://[WSL_IP]:3000
```
**注意**: `[WSL_IP]`は実際のWSL IPアドレスに置き換えてください

### 方法3: WSL内でのテスト
WSL内では正常に動作します：
```bash
curl http://localhost:3000
```

---

## 🚨 Windows環境でアクセスできない場合の対処法

### Step 1: Windows側でポートプロキシ設定
**管理者権限のPowerShellで実行**:
```powershell
# WSL IPアドレス確認（まずこれを実行）
wsl ip addr show eth0 | grep 'inet '

# ポートフォワーディング設定（[WSL_IP]を実際のIPに置き換え）
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=[WSL_IP]

# 設定確認
netsh interface portproxy show all
```

### Step 2: Windowsファイアウォール設定
1. Windows Defender ファイアウォール → 詳細設定
2. 受信の規則 → 新しい規則
3. ポート → TCP → 特定のローカルポート: 3000
4. 接続を許可する
5. すべてのプロファイル → 名前: "WSL2 Port 3000"

### Step 3: WSL再起動
```bash
# Windows側で実行
wsl --shutdown
wsl
```

---

## 🛠️ 代替手段

### A. WSLgコマンド使用
```bash
# WSL内で実行
explorer.exe http://localhost:3000
```

### B. ポート変更
サーバーを別ポートで起動:
```bash
# 8080ポートで起動
PORT=8080 npm run start:minimal
```
アクセス: `http://localhost:8080`

### C. VSCode Port Forwarding
1. VSCode でWSLに接続
2. ポート転送タブ → ポート3000を追加
3. 自動的にlocalhost:3000が使用可能

---

## 📝 確認用コマンド

### WSL内での動作確認
```bash
# サーバー状態確認
curl -I http://localhost:3000

# WSL IP確認
ip addr show eth0 | grep 'inet '
```

### Windows側での確認
```powershell
# ポート使用状況
netstat -an | findstr :3000

# ポートプロキシ設定確認
netsh interface portproxy show all
```

---

## 🎯 トラブルシューティング

### 問題: "接続できません"
1. WSL2内でサーバーが起動しているか確認
2. Windows側でlocalhost:3000にアクセス
3. ダメな場合はWSL IP直接アクセス
4. それでもダメならポートプロキシ設定

### 問題: "タイムアウト"
1. Windowsファイアウォール設定確認
2. ウイルス対策ソフトの確認
3. ネットワークプロファイル確認（パブリック→プライベート）

### 問題: "証明書エラー"
- HTTPアクセスを使用（HTTPSではない）
- ブラウザの設定でlocalhost許可

---

## ✅ 成功確認

正常にアクセスできている場合の表示：
- ヘッダー: **🧠 構造的対話ログ学習システム v7.0**
- 説明: **プロダクションレベル個人特化AI基盤: 4,430概念DB + キメラAI構想統合**
- タブ表示: **🧠 ログ学習**・**🧹 品質改善**・**🔬 分析モード**・**😊 基本モード**
- システム機能: **4,430概念学習DB**・**多形式ログ解析**・**品質管理システム**

---

**注意**: WSL2のネットワーク設定はWindowsの再起動で変更される場合があります。毎回同じIPアドレスとは限りません。