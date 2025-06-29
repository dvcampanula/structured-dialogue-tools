#!/usr/bin/env node

/**
 * IntelligentConceptExtractor - 学習データ活用による革命的概念抽出システム
 * 
 * 75概念、1.2MBの学習データベース（ANALYSIS_RESULTS_DB.json）を活用し、
 * プロトコル v1.0の完全自動適用による高精度概念抽出を実現
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import kuromoji from 'kuromoji';

// 学習データベースの型定義
interface AnalysisResultsDB {
  protocolVersion: string;
  lastUpdated: string;
  totalLogsAnalyzed: number;
  analysisHistory: Record<string, LogAnalysisResult>;
  patterns: {
    failurePatterns: FailurePattern[];
    successPatterns: SuccessPattern[];
  };
  projectCompletion: ProjectCompletion;
}

interface LogAnalysisResult {
  analysisDate: string;
  aiAnalyst: string;
  fileSize: string;
  chunkCount: string;
  dialogueType: string;
  surfaceConcepts: string[];
  deepConcepts: string[];
  timeRevolutionMarkers: string[];
  breakthroughMoments: string[];
  innovationLevel: number;
  socialImpact: string;
  keyQuotes: string[];
  foundationalConcepts?: string[];
  comparisonWithPrevious: string;
  historicalSignificance?: string;
}

// 抽出結果の型定義
export interface IntelligentExtractionResult {
  // 自動分類結果
  surfaceConcepts: ClassifiedConcept[];
  deepConcepts: ClassifiedConcept[];
  timeRevolutionMarkers: TimeRevolutionMarker[];
  
  // 予測・評価
  predictedInnovationLevel: number;
  predictedSocialImpact: 'low' | 'medium' | 'high' | 'revolutionary';
  breakthroughProbability: number;
  
  // 学習ベース分析
  similarPatterns: string[];
  dialogueTypeDetection: string;
  qualityPrediction: QualityPrediction;
  
  // メタ情報
  confidence: number;
  processingTime: number;
  appliedPatterns: string[];
}

export interface ClassifiedConcept {
  term: string;
  classification: 'surface' | 'deep';
  confidence: number;
  reasoning: string;
  matchedPatterns: string[];
}

export interface TimeRevolutionMarker {
  marker: string;
  timeExpression: string;
  efficiency: 'moderate' | 'high' | 'revolutionary';
  context: string;
  position: number;
}

export interface QualityPrediction {
  conceptDensity: number;
  innovationPotential: number;
  structuralDialogueScore: number;
  overallQuality: number;
}

/**
 * 学習データ活用による知的概念抽出システム
 */
export class IntelligentConceptExtractor {
  private learningData: AnalysisResultsDB | null = null;
  private conceptPatterns: Map<string, ConceptPattern> = new Map();
  private timePatterns: RegExp[] = [];
  private innovationIndicators: string[] = [];
  private tokenizer: any = null;

  constructor(private dbPath: string = 'docs/ANALYSIS_RESULTS_DB.json') {
    this.initializeTimePatterns();
  }

  /**
   * 学習データベースの読み込みと初期化
   */
  async initialize(): Promise<void> {
    try {
      const dbContent = await fs.readFile(this.dbPath, 'utf-8');
      this.learningData = JSON.parse(dbContent);
      
      if (!this.learningData) {
        throw new Error('学習データベースの読み込みに失敗しました');
      }

      console.log(`📚 学習データ読み込み完了: ${this.learningData.totalLogsAnalyzed}ログ`);
      
      // 形態素解析器の初期化
      await this.initializeTokenizer();
      
      // パターン学習の実行
      await this.learnConceptPatterns();
      await this.learnInnovationIndicators();
      
      console.log(`🧠 パターン学習完了: ${this.conceptPatterns.size}概念パターン`);
      
    } catch (error) {
      console.error('❌ 初期化エラー:', error);
      throw error;
    }
  }

  /**
   * kuromoji形態素解析器の初期化
   */
  private async initializeTokenizer(): Promise<void> {
    return new Promise((resolve, reject) => {
      kuromoji.builder({
        dicPath: 'node_modules/kuromoji/dict'
      }).build((err: any, tokenizer: any) => {
        if (err) {
          console.warn('⚠️ 形態素解析器の初期化に失敗。基本処理で継続:', err.message);
          resolve();
        } else {
          this.tokenizer = tokenizer;
          console.log('🔗 kuromoji形態素解析器初期化完了');
          resolve();
        }
      });
    });
  }

  /**
   * メイン抽出関数 - プロトコル v1.0完全自動適用
   */
  async extractConcepts(logContent: string): Promise<IntelligentExtractionResult> {
    if (!this.learningData) {
      throw new Error('学習データが初期化されていません。initialize()を呼び出してください。');
    }

    const startTime = Date.now();
    
    console.log('🔬 知的概念抽出開始...');
    
    // Step 1: 基本概念抽出
    const rawConcepts = this.extractRawConcepts(logContent);
    console.log(`📝 基本概念抽出: ${rawConcepts.length}個`);
    
    // Step 2: 表面vs深層の自動分類
    const { surfaceConcepts, deepConcepts } = await this.classifyConcepts(rawConcepts, logContent);
    console.log(`🎯 分類完了: 表面${surfaceConcepts.length}個, 深層${deepConcepts.length}個`);
    
    // Step 3: 時間革命マーカーの検出
    const timeRevolutionMarkers = this.detectTimeRevolutionMarkers(logContent);
    console.log(`⚡ 時間革命マーカー: ${timeRevolutionMarkers.length}個`);
    
    // Step 4: 革新度・社会的インパクトの予測
    const innovationPrediction = this.predictInnovationLevel(deepConcepts, timeRevolutionMarkers, logContent);
    const socialImpactPrediction = this.predictSocialImpact(deepConcepts, innovationPrediction);
    
    // Step 5: 対話タイプの自動検出
    const dialogueType = this.detectDialogueType(logContent);
    
    // Step 6: 品質予測
    const qualityPrediction = this.predictQuality(surfaceConcepts, deepConcepts, timeRevolutionMarkers);
    
    // Step 7: 類似パターンの検出
    const similarPatterns = this.findSimilarPatterns(deepConcepts);
    
    const processingTime = Date.now() - startTime;
    
    const result: IntelligentExtractionResult = {
      surfaceConcepts,
      deepConcepts,
      timeRevolutionMarkers,
      predictedInnovationLevel: innovationPrediction,
      predictedSocialImpact: socialImpactPrediction,
      breakthroughProbability: this.calculateBreakthroughProbability(deepConcepts, timeRevolutionMarkers),
      similarPatterns,
      dialogueTypeDetection: dialogueType,
      qualityPrediction,
      confidence: this.calculateOverallConfidence(surfaceConcepts, deepConcepts),
      processingTime,
      appliedPatterns: Array.from(this.conceptPatterns.keys()).slice(0, 10)
    };
    
    console.log(`✅ 抽出完了 (${processingTime}ms): 革新度${innovationPrediction}/10, 信頼度${result.confidence}%`);
    
    return result;
  }

  /**
   * 学習データから概念パターンを抽出
   */
  private async learnConceptPatterns(): Promise<void> {
    if (!this.learningData) return;

    // 深層概念の学習
    Object.values(this.learningData.analysisHistory).forEach(log => {
      log.deepConcepts.forEach(concept => {
        const pattern: ConceptPattern = {
          term: concept,
          type: 'deep',
          frequency: 1,
          innovationLevel: log.innovationLevel,
          contexts: [log.dialogueType],
          associatedTimeMarkers: log.timeRevolutionMarkers,
          socialImpact: log.socialImpact
        };
        
        const existing = this.conceptPatterns.get(concept);
        if (existing) {
          existing.frequency++;
          existing.contexts.push(log.dialogueType);
        } else {
          this.conceptPatterns.set(concept, pattern);
        }
      });
      
      // 表面概念の学習
      log.surfaceConcepts.forEach(concept => {
        if (!this.conceptPatterns.has(concept)) {
          this.conceptPatterns.set(concept, {
            term: concept,
            type: 'surface',
            frequency: 1,
            innovationLevel: 0,
            contexts: [log.dialogueType],
            associatedTimeMarkers: [],
            socialImpact: 'low'
          });
        }
      });
    });
  }

  /**
   * 革新指標の学習
   */
  private async learnInnovationIndicators(): Promise<void> {
    if (!this.learningData) return;

    const highInnovationLogs = Object.values(this.learningData.analysisHistory)
      .filter(log => log.innovationLevel >= 8);

    highInnovationLogs.forEach(log => {
      log.deepConcepts.forEach(concept => {
        if (!this.innovationIndicators.includes(concept)) {
          this.innovationIndicators.push(concept);
        }
      });
    });
  }

  /**
   * 時間革命パターンの初期化
   */
  private initializeTimePatterns(): void {
    this.timePatterns = [
      /(\d+分|数分|短時間|瞬時|即座|一瞬)で([^。]+)/g,
      /(\d+時間|昼休み|休憩時間)で([^。]+)/g,
      /(30分|2-3時間|短期間|高速|効率的)([^。]+)/g,
      /(従来の\d+倍|劇的な効率|革命的な速度)/g,
      /(時間革命|効率革命|速度向上)/g
    ];
  }

  /**
   * 生の概念抽出（形態素解析統合）
   */
  private extractRawConcepts(content: string): string[] {
    const concepts: Set<string> = new Set();
    
    // kuromoji形態素解析（利用可能な場合）
    if (this.tokenizer) {
      try {
        const tokens = this.tokenizer.tokenize(content);
        tokens.forEach((token: any) => {
          // 名詞、動詞、形容詞、カタカナを抽出
          if (
            token.pos === '名詞' || 
            token.pos === '動詞' || 
            token.pos === '形容詞' ||
            token.reading
          ) {
            const surface = token.surface_form;
            if (surface.length >= 2 && surface.length <= 20) {
              concepts.add(surface);
            }
            
            // 基本形も抽出
            if (token.basic_form && token.basic_form !== surface) {
              concepts.add(token.basic_form);
            }
          }
        });
      } catch (error) {
        console.warn('形態素解析でエラー。基本処理で継続:', error);
      }
    }
    
    // 基本的な正規表現パターン（フォールバック・補完）
    const wordPattern = /[ァ-ヶー]+[A-Za-z]*|[一-龯]+[ァ-ヶー]*|[ぁ-ん]+[一-龯]*/g;
    const words = content.match(wordPattern) || [];
    
    words.forEach(word => {
      if (word.length >= 2 && word.length <= 20) {
        concepts.add(word);
      }
    });
    
    // 複合概念の抽出
    const compositePatterns = [
      /「([^」]+)」/g,
      /『([^』]+)』/g,
      /([一-龯]+理論|[一-龯]+手法|[一-龯]+システム)/g,
      /([ァ-ヶー]+理論|[ァ-ヶー]+システム|[ァ-ヶー]+手法)/g
    ];
    
    compositePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => concepts.add(match.replace(/[「」『』]/g, '')));
      }
    });
    
    return Array.from(concepts);
  }

  /**
   * 概念の自動分類
   */
  private async classifyConcepts(rawConcepts: string[], content: string): Promise<{
    surfaceConcepts: ClassifiedConcept[];
    deepConcepts: ClassifiedConcept[];
  }> {
    const surfaceConcepts: ClassifiedConcept[] = [];
    const deepConcepts: ClassifiedConcept[] = [];
    
    for (const concept of rawConcepts) {
      const classification = await this.classifySingleConcept(concept, content);
      
      if (classification.classification === 'deep') {
        deepConcepts.push(classification);
      } else {
        surfaceConcepts.push(classification);
      }
    }
    
    // 信頼度でソート
    deepConcepts.sort((a, b) => b.confidence - a.confidence);
    surfaceConcepts.sort((a, b) => b.confidence - a.confidence);
    
    return {
      surfaceConcepts: surfaceConcepts.slice(0, 8),
      deepConcepts: deepConcepts.slice(0, 5) // 深層概念は厳選
    };
  }

  /**
   * 単一概念の分類
   */
  private async classifySingleConcept(concept: string, content: string): Promise<ClassifiedConcept> {
    const knownPattern = this.conceptPatterns.get(concept);
    const matchedPatterns: string[] = [];
    let confidence = 0.5;
    let classification: 'surface' | 'deep' = 'surface';
    let reasoning = '基本的な概念として分類';

    // 学習済みパターンとのマッチング（優先度大幅向上）
    if (knownPattern) {
      classification = knownPattern.type as 'surface' | 'deep';
      
      // 既知概念の信頼度を大幅強化
      if (knownPattern.type === 'deep') {
        confidence = Math.min(0.95, 0.8 + (knownPattern.frequency * 0.05) + (knownPattern.innovationLevel * 0.01));
      } else {
        confidence = Math.min(0.8, 0.6 + (knownPattern.frequency * 0.05));
      }
      
      reasoning = `学習データ(確定): ${knownPattern.frequency}回出現, 革新度${knownPattern.innovationLevel}`;
      matchedPatterns.push(`learned_pattern_${knownPattern.type}_priority`);
      
      // 既知概念は追加分析をスキップ（確定扱い）
      return {
        term: concept,
        classification,
        confidence,
        reasoning,
        matchedPatterns
      };
    } else {
      // 新規概念の分析（既知概念がない場合のみ）
      const analysisResult = this.analyzeNewConcept(concept, content);
      classification = analysisResult.classification;
      confidence = analysisResult.confidence;
      reasoning = `新規: ${analysisResult.reasoning}`;
      matchedPatterns.push(...analysisResult.patterns);
    }

    return {
      term: concept,
      classification,
      confidence,
      reasoning,
      matchedPatterns
    };
  }

  /**
   * 新規概念の分析
   */
  private analyzeNewConcept(concept: string, content: string): {
    classification: 'surface' | 'deep';
    confidence: number;
    reasoning: string;
    patterns: string[];
  } {
    const patterns: string[] = [];
    let score = 0;
    let reasoning = '';

    // 革新指標との類似性
    const isInnovationRelated = this.innovationIndicators.some(indicator => 
      concept.includes(indicator) || indicator.includes(concept)
    );
    if (isInnovationRelated) {
      score += 0.4;
      patterns.push('innovation_similarity');
      reasoning += '革新概念との類似性, ';
    }

    // 文脈分析
    const contextScore = this.analyzeConceptContext(concept, content);
    score += contextScore.score;
    patterns.push(...contextScore.patterns);
    reasoning += contextScore.reasoning;

    // 複雑性分析
    if (concept.length > 6 || concept.includes('理論') || concept.includes('システム') || concept.includes('手法') || concept.includes('構造')) {
      score += 0.2;
      patterns.push('complexity');
      reasoning += '複雑性, ';
    }

    // 包括的ストップワード除外（大幅拡充）
    const stopWords = [
      // 助詞・接続詞・副詞
      'から', 'して', 'ため', 'もの', 'こと', 'ところ', 'など', 'による', 'について', 'として', 'という', 'それは', 'これは', 'そして', 'また', 'しかし', 'なので', 'だから', 'でも', 'けれど', 'つまり', 'すなわち', 'しかし', 'ただし', 'ちなみに', 'もちろん', 'たとえば', 'なお', 'さらに', 'とくに', 'いわゆる',
      // 一般動詞・形容詞（基本語彙）
      'ある', 'いる', 'する', 'なる', 'できる', 'ない', 'よい', '良い', 'きれい', '美しい', '大きい', '小さい', '新しい', '古い', '思う', '考える', '感じる', '見る', '聞く', '言う', '話す', '読む', '書く', '作る', '使う', '持つ', '取る', '行く', '来る', '帰る', '出る', '入る', '立つ', '座る', '歩く', '走る', '飛ぶ', '泳ぐ', '食べる', '飲む', '寝る', '起きる', '学ぶ', '教える', '働く', '遊ぶ', '買う', '売る', '貸す', '借りる', '送る', '受ける', '開く', '閉じる', '始める', '終わる', '続ける', '止める', '待つ', '急ぐ', '忘れる', '覚える', '知る', '分かる', '信じる', '疑う', '決める', '選ぶ', '変える', '直す', '壊す', '失う', '見つける', '探す', '呼ぶ', '答える', '聞く', '頼む', '手伝う', '助ける', '守る', '攻める', '勝つ', '負ける', '笑う', '泣く', '怒る', '喜ぶ', '驚く', '困る', '心配', '安心', '緊張', 'リラックス',
      // 代名詞・指示語
      'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ', '私', 'あなた', '彼', '彼女', '僕', '君', '自分', '他人', '皆', 'みんな', '誰', '何', 'どこ', 'いつ', 'なぜ', 'どう', 'どの', 'どちら', 'どれ',
      // 数量・時間（基本）
      '一つ', '二つ', '三つ', '今日', '昨日', '明日', '午前', '午後', '夜', '朝', '昼', '夕方', '今', '昔', '未来', '過去', '現在', '最近', '将来', '以前', '以後', '前', '後', '先', '次', '最初', '最後', '一番', '二番', '三番', '多く', '少し', '全部', '半分', '一部', '全て', '何も', '誰も', 'いつも', 'たまに', 'よく', 'あまり', 'まったく', 'とても', 'かなり', 'すごく', 'ちょっと', 'もう', 'まだ', 'すでに', 'やっと', 'ついに', 'もちろん', 'きっと', 'たぶん', 'おそらく', 'もしかして', '絶対',
      // 形式語・語尾
      'です', 'ます', 'だ', 'である', 'では', 'でしょう', 'かもしれません', 'らしい', 'ようだ', 'みたい', 'そうだ', 'はず', 'べき', 'つもり', 'ところ', 'わけ', 'もの', '場合', '時', '際', '度', '回', '番', '点', '面', '方', '側', '部', '分', '段', '章', '項', '条', '号', '款', '目', '類', '種', '品', '件', '個', '本', '枚', '台', '機', '器', '具', '品', '物', '者', '人', '方', '様', '君', '氏', '先生', '社長', '部長', '課長', '主任', '係長', '店長', '院長', '校長', '会長', '委員長', '理事長', '代表', '責任者', '担当者', '関係者', '当事者', '専門家', '研究者', '学者', '教授', '博士', '修士', '学士', '学生', '生徒', '児童', '子供', '大人', '老人', '若者', '女性', '男性', '友人', '知人', '家族', '親', '子', '兄弟', '姉妹', '夫', '妻', '恋人', '彼氏', '彼女',
      // 一般名詞（あまりに基本的）
      '問題', '課題', '目標', '目的', '理由', '原因', '結果', '影響', '効果', '成果', '結論', '意見', '考え', '気持ち', '感情', '心', '体', '頭', '手', '足', '目', '耳', '口', '鼻', '顔', '髪', '声', '言葉', '文字', '数字', '記号', '色', '形', '大きさ', '重さ', '長さ', '幅', '高さ', '深さ', '速さ', '温度', '音', '光', '匂い', '味', '感覚', '気分', '状態', '状況', '環境', '場所', '位置', '方向', '距離', '空間', '時間', '期間', '瞬間', '瞬時', '一瞬', '瞬く間', '一気', '一度', '何度', '数回', '何回', '毎回', '今回', '次回', '前回', '初回', '最終回',
      // AI・技術分野の基本語（深層概念ではない）
      'AI', 'システム', 'データ', '情報', '技術', '方法', '手法', '処理', '機能', '性能', '効率', '精度', '品質', '結果', '分析', '評価', '改善', '最適化', '自動化', 'プログラム', 'アルゴリズム', 'コード', 'ファイル', 'フォルダ', 'ディレクトリ', 'パス', 'リンク', 'ボタン', 'メニュー', '画面', 'ウィンドウ', 'ページ', 'サイト', 'ブラウザ', 'アプリ', 'ソフト', 'ハード', 'ネット', 'オンライン', 'オフライン', 'ログイン', 'ログアウト', 'ユーザー', 'アカウント', 'パスワード', 'セキュリティ', 'プライバシー', '設定', '操作', '入力', '出力', '表示', '保存', '削除', '変更', '更新', '追加', '作成', '編集', '検索', '選択', 'コピー', '貼り付け', '切り取り', '移動', '実行', '停止', '開始', '終了', '再生', '一時停止', '早送り', '巻き戻し', '音量', '画質', '解像度', 'サイズ', '容量', '速度', 'バージョン', '更新',
      // 対話・コミュニケーション基本語
      '対話', '会話', 'チャット', 'メッセージ', '返事', '回答', '質問', '相談', '議論', '討論', '発表', '報告', '説明', '紹介', '案内', 'お知らせ', '通知', '連絡', '伝達', '共有', '公開', '発信', '受信', '送信', '転送', '返信', '確認', '承認', '拒否', '承諾', '同意', '反対', '賛成', '支持', '応援', '協力', '協働', '連携', '提携', '契約', '約束', '予定', '計画', '準備', '手続き', '手順', '流れ', 'ステップ', '段階', 'フェーズ', 'プロセス', '過程', '工程', '作業', 'タスク', '仕事', '業務', '職務', '役割', '責任', '義務', '権利', '権限', '許可', '禁止', '制限', '規則', 'ルール', '法律', '条件', '要求', '要望', '希望', '期待', '予想', '予測', '見通し', '見込み', '可能性', '確率', 'チャンス', '機会', '時期', 'タイミング'
    ];
    
    if (stopWords.includes(concept) || concept.length <= 2) {
      score = -0.9; // 強制的に除外レベル
      patterns.push('stopword_excluded');
      reasoning += 'ストップワード強制除外, ';
    }
    
    // 深層概念の厳格基準追加（専門概念のみ）
    const deepConceptIndicators = [
      '理論', '法則', '原理', '定理', '公式', '方程式', '仮説', '学説', 'モデル', 'フレームワーク', 'パラダイム', 'アーキテクチャ', 'メカニズム', 'プロトコル', 'スキーマ',
      'ブレークスルー', 'イノベーション', 'パラダイムシフト',
      '哲学', '本質', '真理', '核心', '要諦'
    ];
    
    const hasDeepIndicator = deepConceptIndicators.some(indicator => 
      concept.includes(indicator) || content.includes(concept + indicator) || content.includes(indicator + concept)
    );
    
    if (hasDeepIndicator) {
      score += 0.4; // スコアを上げて深層概念にしやすく
      patterns.push('deep_concept_indicator');
      reasoning += '深層概念指標, ';
    }

    // 数学・科学分野の専門用語
    const mathScienceTerms = ['予想', '定理', '証明', '解', '関数', '軌道', '収束', '発散', '吸収', '減衰', '統一', '変換', '写像', '群', '環', '体', '空間', '次元', '位相', '測度'];
    if (mathScienceTerms.some(term => concept.includes(term) || term.includes(concept))) {
      score += 0.3;
      patterns.push('math_science_term');
      reasoning += '数学・科学専門用語, ';
    }

    // 複合語（理論、システム、手法）は深層概念候補
    if (concept.includes('理論') || concept.includes('システム') || concept.includes('手法') || concept.includes('アプローチ') || concept.includes('構造')) {
      score += 0.35;
      patterns.push('compound_deep_concept');
      reasoning += '複合深層概念, ';
    }

    // 深層概念の厳格な閾値：非常に高スコアのみ
    const classification = score > 0.75 ? 'deep' : 'surface';
    const confidence = Math.min(0.9, Math.max(0.2, score));

    return {
      classification,
      confidence,
      reasoning: reasoning.replace(/, $/, ''),
      patterns
    };
  }

  /**
   * 概念の文脈分析
   */
  private analyzeConceptContext(concept: string, content: string): {
    score: number;
    patterns: string[];
    reasoning: string;
  } {
    let score = 0;
    const patterns: string[] = [];
    let reasoning = '';

    // 重要文脈キーワードとの共起
    const importantContexts = ['発見', '革新', '突破', '理論', '新しい', '画期的', '革命的'];
    
    // 特殊文字をエスケープして正規表現を安全に作成
    const escapedConcept = concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const conceptRegex = new RegExp(`(.{0,20})${escapedConcept}(.{0,20})`, 'g');
    const contexts = content.match(conceptRegex) || [];

    contexts.forEach(context => {
      importantContexts.forEach(keyword => {
        if (context.includes(keyword)) {
          score += 0.1;
          patterns.push(`context_${keyword}`);
          reasoning += `${keyword}との共起, `;
        }
      });
    });

    return { score, patterns, reasoning };
  }

  /**
   * 時間革命マーカーの検出（重複除去・品質向上）
   */
  private detectTimeRevolutionMarkers(content: string): TimeRevolutionMarker[] {
    const markers: TimeRevolutionMarker[] = [];
    const uniqueMarkers = new Set<string>();

    this.timePatterns.forEach((pattern, index) => {
      let match;
      pattern.lastIndex = 0; // 正規表現の状態リセット
      while ((match = pattern.exec(content)) !== null) {
        const timeExpression = match[1];
        const context = match[0];
        const efficiency = this.evaluateTimeEfficiency(timeExpression, context);
        const position = match.index || 0;
        
        // 重複チェック（位置ベース）
        const uniqueKey = `${timeExpression}_${Math.floor(position / 50)}`; // 50文字範囲で同一視
        if (!uniqueMarkers.has(uniqueKey)) {
          uniqueMarkers.add(uniqueKey);
          
          markers.push({
            marker: match[0],
            timeExpression,
            efficiency,
            context: this.extractTimeContext(content, position, 80),
            position
          });
        }
      }
    });

    // 学習データからの革命的時間パターン（厳選）
    if (this.learningData) {
      const revolutionaryTimePatterns = [
        '30分で解決', '2-3時間で突破', '短時間で革新', '瞬時に発見', '一気に解決',
        '従来の数十倍の効率', '劇的な時間短縮', '効率革命', '時間革命'
      ];
      
      revolutionaryTimePatterns.forEach(pattern => {
        const position = content.indexOf(pattern);
        if (position !== -1) {
          const uniqueKey = `revolutionary_${pattern}`;
          if (!uniqueMarkers.has(uniqueKey)) {
            uniqueMarkers.add(uniqueKey);
            
            markers.push({
              marker: pattern,
              timeExpression: pattern,
              efficiency: 'revolutionary',
              context: this.extractTimeContext(content, position, 80),
              position
            });
          }
        }
      });
    }

    // 品質フィルタリング：意味のある時間革命マーカーのみ
    return markers
      .filter(marker => {
        // 単純な数字のみは除外
        if (/^[\d分時間秒]+$/.test(marker.timeExpression)) return false;
        // 文脈が革新的でないものは除外
        const context = marker.context.toLowerCase();
        const innovativeKeywords = ['革新', '革命', '突破', '発見', '解決', '効率', '高速', '劇的', '画期的'];
        return innovativeKeywords.some(keyword => context.includes(keyword));
      })
      .sort((a, b) => a.position - b.position)
      .slice(0, 5); // 最大5個まで
  }

  /**
   * 時間マーカー周辺の文脈を抽出
   */
  private extractTimeContext(content: string, position: number, length: number): string {
    const start = Math.max(0, position - length / 2);
    const end = Math.min(content.length, position + length / 2);
    return content.substring(start, end);
  }

  /**
   * 時間効率性の評価
   */
  private evaluateTimeEfficiency(timeExpression: string, context: string): 'moderate' | 'high' | 'revolutionary' {
    // 「30分」「2-3時間」等の革命的パターン
    if (timeExpression.includes('30分') || timeExpression.includes('2-3時間')) {
      return 'revolutionary';
    }

    // 短時間での成果
    if (timeExpression.includes('分') || timeExpression.includes('瞬時')) {
      return 'high';
    }

    // その他
    return 'moderate';
  }

  /**
   * 革新度の予測
   */
  private predictInnovationLevel(
    deepConcepts: ClassifiedConcept[], 
    timeMarkers: TimeRevolutionMarker[], 
    content: string
  ): number {
    let score = 5; // ベーススコア

    // 深層概念の品質と数
    const avgDeepConfidence = deepConcepts.reduce((sum, c) => sum + c.confidence, 0) / deepConcepts.length || 0;
    score += deepConcepts.length * 0.3 + avgDeepConfidence * 2;

    // 時間革命マーカー
    const revolutionaryMarkers = timeMarkers.filter(m => m.efficiency === 'revolutionary').length;
    score += revolutionaryMarkers * 1.5;

    // 革新語の存在
    const innovationWords = ['革命', '突破', '革新', '画期的', '発見', '理論'];
    innovationWords.forEach(word => {
      if (content.includes(word)) {
        score += 0.5;
      }
    });

    return Math.min(10, Math.max(1, Math.round(score)));
  }

  /**
   * 社会的インパクトの予測
   */
  private predictSocialImpact(deepConcepts: ClassifiedConcept[], innovationLevel: number): 'low' | 'medium' | 'high' | 'revolutionary' {
    if (innovationLevel >= 9) return 'revolutionary';
    if (innovationLevel >= 7) return 'high';
    if (innovationLevel >= 5) return 'medium';
    return 'low';
  }

  /**
   * 対話タイプの検出
   */
  private detectDialogueType(content: string): string {
    const patterns = {
      'human_led': /^(あなた|ユーザー|質問|教えて)/m,
      'ai_led': /^(私は|AI として|こんにちは)/m,
      'collaborative': /(一緒に|協力|共同)/,
      'mathematical': /(数学|証明|定理|予想)/,
      'ai_collaboration': /(AI同士|文通|Gemini|ChatGPT)/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        return type;
      }
    }

    return 'free_form';
  }

  /**
   * 品質予測
   */
  private predictQuality(
    surfaceConcepts: ClassifiedConcept[], 
    deepConcepts: ClassifiedConcept[], 
    timeMarkers: TimeRevolutionMarker[]
  ): QualityPrediction {
    const conceptDensity = (deepConcepts.length + surfaceConcepts.length) / 100;
    const innovationPotential = deepConcepts.reduce((sum, c) => sum + c.confidence, 0) / deepConcepts.length || 0;
    const structuralDialogueScore = timeMarkers.length * 0.2 + deepConcepts.length * 0.1;
    
    const overallQuality = (conceptDensity + innovationPotential + structuralDialogueScore) / 3;

    return {
      conceptDensity: Math.round(conceptDensity * 100),
      innovationPotential: Math.round(innovationPotential * 100),
      structuralDialogueScore: Math.round(structuralDialogueScore * 100),
      overallQuality: Math.round(overallQuality * 100)
    };
  }

  /**
   * 類似パターンの検出
   */
  private findSimilarPatterns(deepConcepts: ClassifiedConcept[]): string[] {
    if (!this.learningData) return [];

    const patterns: string[] = [];
    const conceptTerms = deepConcepts.map(c => c.term);

    Object.entries(this.learningData.analysisHistory).forEach(([logId, log]) => {
      const commonConcepts = conceptTerms.filter(term => 
        log.deepConcepts.some(logConcept => logConcept.includes(term) || term.includes(logConcept))
      );

      if (commonConcepts.length > 0) {
        patterns.push(`${logId}: ${commonConcepts.length}個の類似概念`);
      }
    });

    return patterns;
  }

  /**
   * 突破確率の計算
   */
  private calculateBreakthroughProbability(deepConcepts: ClassifiedConcept[], timeMarkers: TimeRevolutionMarker[]): number {
    const deepScore = deepConcepts.length * 10;
    const timeScore = timeMarkers.filter(m => m.efficiency === 'revolutionary').length * 20;
    const confidenceScore = deepConcepts.reduce((sum, c) => sum + c.confidence, 0);

    const totalScore = deepScore + timeScore + confidenceScore;
    return Math.min(100, Math.round(totalScore));
  }

  /**
   * 全体信頼度の計算
   */
  private calculateOverallConfidence(surfaceConcepts: ClassifiedConcept[], deepConcepts: ClassifiedConcept[]): number {
    const allConcepts = [...surfaceConcepts, ...deepConcepts];
    const avgConfidence = allConcepts.reduce((sum, c) => sum + c.confidence, 0) / allConcepts.length || 0;
    return Math.round(avgConfidence * 100);
  }
}

// 内部型定義
interface ConceptPattern {
  term: string;
  type: 'surface' | 'deep';
  frequency: number;
  innovationLevel: number;
  contexts: string[];
  associatedTimeMarkers: string[];
  socialImpact: string;
}

interface FailurePattern {
  name: string;
  description: string;
  example: string;
  solution: string;
}

interface SuccessPattern {
  name: string;
  description: string;
  example: string;
}

interface ProjectCompletion {
  status: string;
  finalAnalysisDate: string;
  totalLogsAnalyzed: number;
  cumulativeDeepConcepts: number;
  averageInnovationLevel: number;
}