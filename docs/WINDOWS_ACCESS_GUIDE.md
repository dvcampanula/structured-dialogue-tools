# Windows環境での構造的対話ツールアクセスガイド

## 🌐 WSL2 ネットワーク接続問題の解決方法

### 📊 現在の状況
- **WSL IP**: `172.17.131.92`
- **サーバーポート**: `3000`
- **リッスン設定**: `0.0.0.0` (全IPアドレス対応済み)

---

## 🔧 解決方法

### 方法1: localhostアクセス（推奨）
```
http://localhost:3000
```
**注意**: WSL2のlocalhost転送が有効な場合のみ動作

### 方法2: WSL IPアドレス直接アクセス
```
http://172.17.131.92:3000
```

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
# ポートフォワーディング設定
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.17.131.92

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
PORT=8080 npm run dev
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
- ヘッダー: **🚀 構造的対話ツール v5.0**
- 説明: **Phase 2革命的機能: 文脈重要度・動的学習・予測的概念抽出**
- 概念抽出タブ: **🚀 概念抽出 v5.0**

---

**注意**: WSL2のネットワーク設定はWindowsの再起動で変更される場合があります。毎回同じIPアドレスとは限りません。