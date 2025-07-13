export class ResponseQualityEvaluator {
  constructor(aiProcessor, learningDB) {
    this.aiProcessor = aiProcessor;
    this.learningDB = learningDB;
    console.log('📈 ResponseQualityEvaluator初期化完了');
  }

  /**
   * 品質評価・改善
   */
  async evaluateAndImprove(response, analysis, userId) {
    try {
      // 生成応答の品質評価
      const responseAnalysis = await this.aiProcessor.processText(response);
      const qualityScore = responseAnalysis.qualityPrediction?.qualityScore || analysis.qualityPrediction?.qualityScore || 0.5;
      const confidence = responseAnalysis.qualityPrediction?.confidence || analysis.qualityPrediction?.confidence || 0.5;

      // 統計情報に基づいて品質グレードを動的に決定
      const stats = await this.learningDB.getQualityStats();
      const { average, stdDev } = stats;
      
      let grade = 'poor';
      if (qualityScore > average + stdDev) {
        grade = 'excellent';
      } else if (qualityScore > average) {
        grade = 'good';
      } else if (qualityScore > average - stdDev) {
        grade = 'acceptable';
      }

      const result = {
        qualityScore,
        confidence,
        grade,
        improvements: responseAnalysis.qualityPrediction?.improvements || analysis.qualityPrediction?.improvements || []
      };

      // 自動学習: 応答品質を品質予測モデルの訓練データとして追加
      try {
        await this.aiProcessor.qualityPredictor.learnFromResponse(
          { text: response, metadata: { userId } },
          qualityScore
        );
      } catch (learningError) {
        console.warn('⚠️ 品質予測自動学習エラー:', learningError.message);
      }

      // 品質が低い場合の改善試行
      if (grade === 'poor' || grade === 'acceptable') {
        const improvedResponse = await this.improveResponse(response, analysis);
        result.improvedResponse = improvedResponse;
      }
      
      return result;
      
    } catch (error) {
      console.warn('品質評価エラー:', error.message);
      return {
        qualityScore: 0.5,
        confidence: 0.5,
        grade: 'acceptable',
        improvements: []
      };
    }
  }

  /**
   * 応答改善
   */
  async improveResponse(response, originalAnalysis) {
    // 簡易的な改善 - より詳細な実装は今後
    const improvements = originalAnalysis.result?.qualityPrediction?.improvements || [];
    
    let improvedResponse = response;
    
    // 基本的な改善パターン
    if (response.length < 20) {
      improvedResponse += ' より詳しく説明いたします。';
    }
    
    if (!response.includes('？') && !response.includes('。')) {
      improvedResponse += 'ご質問があれば、お聞かせください。';
    }
    
    return improvedResponse;
  }

  /**
   * 生成された文の品質を統計的に評価
   */
  async evaluateSentenceQuality(sentence, confidence) {
    try {
      // ここでより高度な統計的品質評価ロジックを実装
      // 例: 語彙の多様性、文法的な正確さ、文脈との関連性などを統計的に分析
      // 現時点では、確信度をベースとした簡易的な評価
      return confidence; 
    } catch (error) {
      console.warn('文品質評価エラー:', error.message);
      return 0.1; // エラー時は低品質と判断
    }
  }

  /**
   * 応答の品質メトリクスを計算
   */
  async calculateResponseMetrics(response, syntacticStructure, responseTokens) {
    const metrics = {
      diversityScore: 0, // 語彙多様性
      syntaxDepth: 0,    // 構文深度
      coherenceScore: 0  // 対話一貫性
    };

    // 語彙多様性 (簡易版: ユニークな単語の割合)
    const words = response.split(/\s+/).filter(Boolean);
    const uniqueWords = new Set(words);
    metrics.diversityScore = words.length > 0 ? uniqueWords.size / words.length : 0;

    // 構文深度 (簡易版: 構造の複雑さ)
    // syntacticStructure.structure が 'subject_predicate' など具体的なタイプを持つ場合
    if (syntacticStructure.structure === 'subject_predicate' || syntacticStructure.structure === 'topic_comment') {
      metrics.syntaxDepth = 0.7; // ある程度の複雑さ
    } else if (syntacticStructure.structure === 'high_relation') {
      metrics.syntaxDepth = 0.9; // より複雑
    } else {
      metrics.syntaxDepth = 0.3; // 簡易的
    }

    // 対話一貫性 (簡易版: 入力キーワードとの重複度)
    const inputKeywords = responseTokens.primary ? [responseTokens.primary, ...responseTokens.support] : [];
    const commonWords = words.filter(word => inputKeywords.includes(word));
    metrics.coherenceScore = inputKeywords.length > 0 ? commonWords.length / inputKeywords.length : 0;

    return metrics;
  }
}
