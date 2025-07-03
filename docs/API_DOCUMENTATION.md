# API Documentation v7.0

**構造的対話ログ学習システム - REST API詳細仕様**

---

## 🎯 概要

構造的対話ログ学習システムが提供する12+ REST APIエンドポイントの詳細仕様です。4,430概念DB・ログ学習・品質管理・システム安定性の全機能をプログラマティックに活用できます。

**ベースURL**: `http://localhost:3000`  
**APIバージョン**: v7.0  
**認証**: なし（ローカル開発環境）

---

## 🧠 ログ学習・概念管理 API

### POST /api/learn/upload
**概要**: 個別ログファイルアップロード・学習

**リクエスト**:
```http
POST /api/learn/upload
Content-Type: multipart/form-data

logFile: (ファイル) # ChatGPT・Claude・Gemini対話ログ
```

**レスポンス**:
```json
{
  "success": true,
  "message": "学習が完了しました",
  "results": {
    "filename": "claude-dialogue-001.txt",
    "extractedConcepts": 89,
    "newConcepts": 23,
    "duplicateConcepts": 5,
    "totalConcepts": 4453,
    "processingTimeMs": 3420,
    "qualityScore": 0.87,
    "categories": {
      "AI・機械学習": 12,
      "プログラミング": 8,
      "データサイエンス": 3
    }
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": "ファイルサイズが制限を超えています（最大10MB）",
  "code": "FILE_TOO_LARGE"
}
```

### POST /api/learn/batch
**概要**: 指定ディレクトリ一括バッチ学習

**リクエスト**:
```http
POST /api/learn/batch
Content-Type: application/json

{
  "directory": "dialogue-logs/technical",  // オプション: 特定ディレクトリ
  "maxFiles": 20,                          // オプション: 最大処理ファイル数
  "qualityThreshold": 0.7                  // オプション: 品質閾値
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "バッチ学習が完了しました",
  "results": {
    "processedFiles": 11,
    "totalConcepts": 89689,
    "newConcepts": 4477,
    "duplicateConcepts": 52,
    "conceptDbSize": 4430,
    "processingTimeMs": 180000,
    "averageQuality": 0.91,
    "fileResults": [
      {
        "filename": "claude-technical-001.txt",
        "concepts": 234,
        "newConcepts": 45,
        "quality": 0.89
      }
    ]
  }
}
```

### GET /api/learn/stats
**概要**: 学習統計・概念分析取得

**リクエスト**:
```http
GET /api/learn/stats
```

**レスポンス**:
```json
{
  "success": true,
  "stats": {
    "totalConcepts": 4430,
    "conceptsByCategory": {
      "AI・機械学習": 1245,
      "プログラミング": 987,
      "データサイエンス": 654,
      "システム設計": 432,
      "UI/UX": 321,
      "プロジェクト管理": 234,
      "その他": 557
    },
    "qualityDistribution": {
      "high": 2876,    // 0.8+
      "medium": 1324,  // 0.6-0.8
      "low": 230       // <0.6
    },
    "lastUpdated": "2025-07-02T10:30:45.123Z",
    "totalLearningSessions": 15,
    "averageConceptsPerSession": 295
  }
}
```

### GET /api/learn/directories
**概要**: 利用可能ディレクトリ一覧取得

**リクエスト**:
```http
GET /api/learn/directories
```

**レスポンス**:
```json
{
  "success": true,
  "directories": [
    {
      "path": "dialogue-logs/technical",
      "fileCount": 11,
      "totalSize": "2.4MB",
      "formats": ["txt", "md", "log"]
    },
    {
      "path": "dialogue-logs/casual",
      "fileCount": 3,
      "totalSize": "456KB",
      "formats": ["txt"]
    }
  ]
}
```

---

## 🧹 品質改善・最適化 API

### POST /api/quality/improve
**概要**: 重複統合・品質フィルタ・レポート生成

**リクエスト**:
```http
POST /api/quality/improve
Content-Type: application/json

{
  "enableDuplicateDetection": true,  // オプション: 重複検出有効
  "enableCategoryOptimization": true, // オプション: カテゴリ最適化
  "qualityThreshold": 0.6,           // オプション: 品質閾値
  "maxDuplicateGroups": 100          // オプション: 最大重複グループ数
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "品質改善が完了しました",
  "improvements": {
    "duplicateGroups": 51,
    "mergedConcepts": 52,
    "conceptsBefore": 4482,
    "conceptsAfter": 4430,
    "efficiencyGain": 1.2,
    "qualityImprovement": 0.05,
    "categoryDistribution": {
      "AI・機械学習": 28.1,
      "プログラミング": 22.3,
      "データサイエンス": 14.8,
      "システム設計": 9.7,
      "UI/UX": 7.2,
      "プロジェクト管理": 5.3,
      "その他": 12.6
    },
    "recommendations": [
      "カテゴリ分散が改善されました",
      "低品質概念の統合により全体品質が向上",
      "更なる最適化には技術用語の詳細分類を推奨"
    ]
  }
}
```

### GET /api/quality/stats
**概要**: 品質分析・カテゴリ分布・推奨事項

**リクエスト**:
```http
GET /api/quality/stats
```

**レスポンス**:
```json
{
  "success": true,
  "qualityStats": {
    "overall": {
      "averageQuality": 0.84,
      "highQualityConcepts": 2876,
      "mediumQualityConcepts": 1324,
      "lowQualityConcepts": 230
    },
    "byCategory": {
      "AI・機械学習": {
        "count": 1245,
        "averageQuality": 0.87,
        "topConcepts": ["強化学習", "自然言語処理", "深層学習"]
      },
      "プログラミング": {
        "count": 987,
        "averageQuality": 0.85,
        "topConcepts": ["型安全性", "非同期処理", "関数型プログラミング"]
      }
    },
    "duplicateAnalysis": {
      "potentialDuplicates": 12,
      "lastDeduplicationDate": "2025-07-02T09:15:30.456Z"
    },
    "recommendations": [
      "AI・機械学習カテゴリの細分化を検討",
      "プログラミング概念の言語別分類が有効",
      "週1回の重複検出実行を推奨"
    ]
  }
}
```

---

## 🔒 システム安定性・管理 API

### POST /api/backup/create
**概要**: 概念DBバックアップ作成

**リクエスト**:
```http
POST /api/backup/create
Content-Type: application/json

{
  "description": "Phase 6H前のバックアップ",  // オプション: バックアップ説明
  "includeStats": true                     // オプション: 統計情報含む
}
```

**レスポンス**:
```json
{
  "success": true,
  "backup": {
    "filename": "concept-db-2025-07-02-10-30-45.json",
    "path": "data/backups/concept-db-2025-07-02-10-30-45.json",
    "size": "2.4MB",
    "conceptCount": 4430,
    "timestamp": "2025-07-02T10:30:45.789Z",
    "checksum": "sha256:a1b2c3d4e5f6..."
  }
}
```

### GET /api/backup/list
**概要**: バックアップ一覧・管理

**リクエスト**:
```http
GET /api/backup/list?limit=10&sortBy=date
```

**レスポンス**:
```json
{
  "success": true,
  "backups": [
    {
      "filename": "concept-db-2025-07-02-10-30-45.json",
      "size": "2.4MB",
      "conceptCount": 4430,
      "timestamp": "2025-07-02T10:30:45.789Z",
      "description": "Phase 6H前のバックアップ"
    },
    {
      "filename": "concept-db-2025-07-01-15-22-13.json",
      "size": "2.3MB",
      "conceptCount": 4377,
      "timestamp": "2025-07-01T15:22:13.456Z",
      "description": "自動バックアップ"
    }
  ],
  "totalCount": 8,
  "totalSize": "18.7MB"
}
```

### GET /api/system/info
**概要**: システム情報・稼働状況

**リクエスト**:
```http
GET /api/system/info
```

**レスポンス**:
```json
{
  "success": true,
  "system": {
    "version": "7.0.0",
    "uptime": "2 hours 45 minutes",
    "memory": {
      "used": "234MB",
      "total": "1024MB",
      "percentage": 22.9
    },
    "conceptDb": {
      "size": 4430,
      "lastUpdate": "2025-07-02T10:30:45.789Z",
      "backupCount": 8
    },
    "performance": {
      "averageProcessingTime": "3.2s",
      "totalProcessedLogs": 15,
      "totalExtractedConcepts": 89689
    },
    "features": {
      "logLearning": "enabled",
      "qualityManagement": "enabled",
      "autoBackup": "enabled",
      "systemMonitoring": "enabled"
    }
  }
}
```

### GET /api/settings
**概要**: 設定取得・品質閾値・学習パラメータ

**リクエスト**:
```http
GET /api/settings
```

**レスポンス**:
```json
{
  "success": true,
  "settings": {
    "learning": {
      "enableTechnicalTerms": true,
      "qualityThreshold": 0.7,
      "enableDuplicateDetection": true,
      "categoryClassification": true,
      "maxConceptsPerLog": 1000
    },
    "qualityManagement": {
      "lengthWeight": 0.2,
      "technicalWeight": 0.3,
      "relevanceWeight": 0.2,
      "frequencyWeight": 0.1,
      "noiseWeight": 0.1,
      "structureWeight": 0.1
    },
    "system": {
      "autoBackupInterval": "24h",
      "maxBackupCount": 30,
      "logRetentionDays": 90
    }
  }
}
```

---

## 🎨 基本AI・分析機能 API

### POST /api/chat
**概要**: 基本対話・フェーズ予測・概念活用

**リクエスト**:
```http
POST /api/chat
Content-Type: application/json

{
  "message": "構造的対話におけるメタ認知の重要性について教えてください",
  "mode": "simple",           // simple | enhanced
  "useConcepts": true,        // 概念DB活用
  "phaseContext": "exploration" // オプション: 対話フェーズ
}
```

**レスポンス**:
```json
{
  "success": true,
  "response": {
    "message": "構造的対話におけるメタ認知は...",
    "phaseAnalysis": {
      "currentPhase": "exploration",
      "nextPhase": "deepening",
      "confidence": 0.87
    },
    "conceptsUsed": [
      "構造的対話",
      "メタ認知",
      "知的生産性"
    ],
    "relatedConcepts": [
      "認知負荷",
      "思考の外在化",
      "対話の構造化"
    ]
  }
}
```

### POST /api/analyze
**概要**: 統合分析・異常検知・概念関係性

**リクエスト**:
```http
POST /api/analyze
Content-Type: application/json

{
  "text": "分析対象テキスト",
  "analysisType": "comprehensive", // basic | comprehensive | anomaly
  "includeVisualization": true,    // Chart.js用データ
  "conceptFilters": ["AI・機械学習", "プログラミング"]
}
```

**レスポンス**:
```json
{
  "success": true,
  "analysis": {
    "extractedConcepts": [
      {
        "concept": "型安全性",
        "relevance": 0.92,
        "category": "プログラミング",
        "quality": 0.88
      }
    ],
    "anomalyDetection": {
      "score": 0.15,
      "isAnomalous": false,
      "factors": ["概念密度正常", "品質スコア適正"]
    },
    "visualization": {
      "conceptNetwork": {
        "nodes": [...],
        "edges": [...],
        "clusters": [...]
      },
      "qualityDistribution": [...]
    }
  }
}
```

---

## 🔧 エラーハンドリング・ステータスコード

### HTTPステータスコード
- **200 OK**: 正常な処理完了
- **400 Bad Request**: リクエストパラメータエラー
- **413 Payload Too Large**: ファイルサイズ制限超過
- **429 Too Many Requests**: レート制限
- **500 Internal Server Error**: サーバー内部エラー

### エラーレスポンス形式
```json
{
  "success": false,
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "details": {
    "field": "エラー詳細",
    "suggestion": "対処方法"
  },
  "timestamp": "2025-07-02T10:30:45.789Z"
}
```

### 一般的なエラーコード
- `FILE_TOO_LARGE`: ファイルサイズ制限超過（10MB）
- `INVALID_FORMAT`: 非対応ファイル形式
- `PROCESSING_FAILED`: 概念抽出処理失敗
- `DB_ERROR`: データベース操作エラー
- `INSUFFICIENT_CONCEPTS`: 抽出概念数不足
- `QUALITY_TOO_LOW`: 品質閾値未満

---

## 💡 使用例・実装パターン

### JavaScript/Node.js実装例

```javascript
// ログ学習の実行
async function learnFromLog(filePath) {
  const formData = new FormData();
  formData.append('logFile', fs.createReadStream(filePath));
  
  const response = await fetch('http://localhost:3000/api/learn/upload', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  console.log(`学習完了: ${result.results.newConcepts}個の新規概念`);
}

// 品質改善の実行
async function improveQuality() {
  const response = await fetch('http://localhost:3000/api/quality/improve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enableDuplicateDetection: true,
      qualityThreshold: 0.7
    })
  });
  
  const result = await response.json();
  console.log(`品質改善: ${result.improvements.mergedConcepts}個の概念統合`);
}

// 概念DB統計の取得
async function getConceptStats() {
  const response = await fetch('http://localhost:3000/api/learn/stats');
  const stats = await response.json();
  
  console.log(`総概念数: ${stats.stats.totalConcepts}`);
  console.log('カテゴリ分布:', stats.stats.conceptsByCategory);
}
```

### Python実装例

```python
import requests
import json

# バッチ学習の実行
def batch_learning(directory="dialogue-logs/technical"):
    url = "http://localhost:3000/api/learn/batch"
    data = {
        "directory": directory,
        "maxFiles": 20,
        "qualityThreshold": 0.7
    }
    
    response = requests.post(url, json=data)
    result = response.json()
    
    if result["success"]:
        print(f"処理ファイル数: {result['results']['processedFiles']}")
        print(f"新規概念: {result['results']['newConcepts']}")
    else:
        print(f"エラー: {result['error']}")

# システム情報の監視
def monitor_system():
    response = requests.get("http://localhost:3000/api/system/info")
    info = response.json()
    
    memory_usage = info["system"]["memory"]["percentage"]
    concept_count = info["system"]["conceptDb"]["size"]
    
    print(f"メモリ使用率: {memory_usage}%")
    print(f"概念DB規模: {concept_count}個")
    
    if memory_usage > 80:
        print("⚠️ メモリ使用率が高いです")
```

---

## 📊 パフォーマンス・制限事項

### API制限
- **ファイルサイズ**: 最大10MB
- **バッチ処理**: 最大100ファイル
- **同時接続**: 最大5接続
- **レート制限**: 60リクエスト/分

### パフォーマンス目安
- **小規模ログ（<1MB）**: 1-3秒
- **中規模ログ（1-5MB）**: 3-10秒
- **大規模ログ（5-10MB）**: 10-30秒
- **バッチ処理（10ファイル）**: 1-5分

### 推奨使用パターン
- **定期的品質改善**: 週1回の実行
- **バックアップ**: 重要な学習前後
- **統計監視**: 日次でのシステム状況確認
- **概念分析**: 必要に応じてのリアルタイム分析

---

**作成日**: 2025-07-02  
**バージョン**: 7.0.0 - 構造的対話ログ学習システム・12+ REST API完全仕様

🛠️ Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>