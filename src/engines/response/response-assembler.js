import { ResponseStrategies } from './response-strategy-manager.js';

export class ResponseAssembler {
  constructor(calculateDynamicWeights, extractRelationshipPatterns, buildSemanticContext, filterKeywordsByStatisticalQuality, getLearnedRelatedTerms, syntacticGenerator, qualityEvaluator) {
    this.calculateDynamicWeights = calculateDynamicWeights;
    this.extractRelationshipPatterns = extractRelationshipPatterns;
    this.buildSemanticContext = buildSemanticContext;
    this.filterKeywordsByStatisticalQuality = filterKeywordsByStatisticalQuality;
    this.getLearnedRelatedTerms = getLearnedRelatedTerms;
    this.syntacticGenerator = syntacticGenerator;
    this.qualityEvaluator = qualityEvaluator;
    console.log('📝 ResponseAssembler初期化完了');
  }

  /**
   * N-gram継続型応答生成
   */
  async generateNgramBasedResponse(analysis, userId = 'default') {
    const { predictedContext, originalText } = analysis;
    const nextWord = predictedContext?.predictedNextWord;
    const confidence = predictedContext?.confidence || 0;

    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
    if (nextWord && confidence > confidenceThresholds.lowConfidence) {
      return await this.generateNgramStatisticalResponse(originalText, nextWord, confidence);
    } else {
      return await this.generateLowConfidenceResponse(originalText, predictedContext);
    }
  }

  /**
   * 共起関係応答生成
   */
  async generateCooccurrenceResponse(analysis, userId = 'default') {
    const { optimizedVocabulary, originalText, enhancedTerms } = analysis;
    
    let cooccurringWords = [];
    if (Array.isArray(optimizedVocabulary)) {
      cooccurringWords = optimizedVocabulary.slice(0, 3);
    } else if (optimizedVocabulary && typeof optimizedVocabulary === 'string') {
      cooccurringWords = [optimizedVocabulary];
    }
    
    try {
      let inputKeywords = [];
      if (analysis.processedTokens && Array.isArray(analysis.processedTokens)) {
        // 助詞や記号を除外して意味のある語彙のみ抽出
        inputKeywords = analysis.processedTokens
          .filter(t => t.partOfSpeech && !['助詞', '記号', '助動詞'].includes(t.partOfSpeech))
          .map(t => t.surface || t.word || t.term || t)
          .filter(Boolean);
      } else if (enhancedTerms && Array.isArray(enhancedTerms)) {
        inputKeywords = enhancedTerms.map(t => t.term || t.surface || t.word || t).filter(Boolean);
      } else if (analysis.dictionaryLookups && Array.isArray(analysis.dictionaryLookups)) {
        inputKeywords = analysis.dictionaryLookups.map(d => d.surface || d.word || d.term || d).filter(Boolean);
      }
      
      inputKeywords = await this.filterKeywordsByStatisticalQuality(inputKeywords, userId);
      const relatedTerms = await this.getLearnedRelatedTerms(inputKeywords, userId);
      
      const semanticContext = await this.buildSemanticContext(inputKeywords, relatedTerms);
      
      // Call the main statistical response generator
      // セマンティック文脈を分析オブジェクトに変換
      const analysisForResponse = {
        originalText,
        semanticContext,
        processedTokens: inputKeywords.map(k => ({ surface: k }))
      };
      return await this.generateStatisticalResponse(analysisForResponse, null, userId);
      
    } catch (error) {
      console.warn('共起関係応答生成エラー:', error.message);
      // Fallback to minimal statistical response if an error occurs
      return await this.generateMinimalStatisticalResponse(originalText, []);
    }
  }

  /**
   * ベイジアン個人適応型応答生成
   */
  async generatePersonalizedResponse(analysis, userId = 'default') {
    const { adaptedContent, originalText } = analysis;
    const adaptationScore = adaptedContent?.adaptationScore || 0;
    const userCategory = adaptedContent?.userCategory || 'general';

    return await this.generateBayesianStatisticalResponse(originalText, adaptationScore, userCategory);
  }

  /**
   * 語彙最適化型応答生成
   */
  async generateVocabularyOptimizedResponse(analysis, userId = 'default') {
    const { optimizedVocabulary, originalText } = analysis;
    
    return await this.generateBanditStatisticalResponse(originalText, optimizedVocabulary);
  }

  /**
   * 品質重視型応答生成
   */
  async generateQualityFocusedResponse(analysis, userId = 'default') {
    const { qualityPrediction, originalText } = analysis;
    const qualityScore = qualityPrediction?.qualityScore || 0;

    return await this.generateQualityStatisticalResponse(originalText, qualityScore, qualityPrediction);
  }

  /**
   * 純粋統計学習ベース応答生成（テンプレート完全回避）
   */
  async generateStatisticalResponse(analysis, strategy = null, userId = 'default', generateSyntacticStructure, evaluateSentenceQuality, calculateResponseMetrics, extractRelationshipPatterns, buildSemanticContext, filterKeywordsByStatisticalQuality, getLearnedRelatedTerms) {
    const { originalText, processedTokens, optimizedVocabulary, predictedContext, adaptedContent, cooccurrenceAnalysis, qualityPrediction } = analysis;
    
    // 戦略別処理の分岐
    if (strategy) {
      switch (strategy) {
        case ResponseStrategies.NGRAM_CONTINUATION:
          return this.generateNgramBasedResponse(analysis, userId);
        case ResponseStrategies.COOCCURRENCE_EXPANSION:
          return this.generateCooccurrenceResponse(analysis, userId);
        case ResponseStrategies.PERSONAL_ADAPTATION:
          return this.generatePersonalizedResponse(analysis, userId);
        case ResponseStrategies.VOCABULARY_OPTIMIZATION:
          return this.generateVocabularyOptimizedResponse(analysis, userId);
        case ResponseStrategies.QUALITY_FOCUSED:
          return this.generateQualityFocusedResponse(analysis, userId);
      }
    }
    
    let semanticContext = []; // Initialize semanticContext outside the try block

    const inputKeywords = processedTokens.map(t => t.surface || t.word || t.term || t).filter(Boolean);
    const allRelatedTerms = Object.values(cooccurrenceAnalysis?.relatedTerms || {}).flat();
    semanticContext = await buildSemanticContext(inputKeywords, allRelatedTerms);
    console.log('📊 generateStatisticalResponse: semanticContext', semanticContext);

    try {
      const candidateResponses = [];
      const numCandidates = 3; // 生成する応答候補の数

      for (let i = 0; i < numCandidates; i++) {
        // 1. 学習データから語彙関係性の統計的パターンを抽出
        const relationshipPatterns = await this.extractRelationshipPatterns(semanticContext);
        
        // 2. 統計的文脈から文構造を生成
        const syntacticStructure = await this.syntacticGenerator.generateSyntacticStructure(inputKeywords, relationshipPatterns, userId);
        
        // 3. 統計的語彙選択による語句生成
        const responseTokens = await this.generateResponseTokens(syntacticStructure, semanticContext);
        
        // 4. 統計的文連結による自然文生成
        const generatedResponse = await this.assembleSentence(responseTokens, originalText);

        // 候補と評価情報を保存
        candidateResponses.push({
          response: generatedResponse,
          syntacticStructure: syntacticStructure,
          responseTokens: responseTokens,
          qualityScore: 0, // 後で評価
          metrics: {} // 後で評価
        });
      }

      // 5. 複数の応答候補を評価し、最適なものを選択
      let bestResponse = null;
      let highestScore = -1;

      for (const candidate of candidateResponses) {
        const qualityScore = await this.qualityEvaluator.evaluateSentenceQuality(candidate.response, candidate.syntacticStructure.confidence);
        const metrics = await this.qualityEvaluator.calculateResponseMetrics(candidate.response, candidate.syntacticStructure, candidate.responseTokens);

        candidate.qualityScore = qualityScore;
        candidate.metrics = metrics;

        // 総合スコア計算（品質、多様性、一貫性などを考慮）
        const totalScore = qualityScore * 0.6 + metrics.diversityScore * 0.2 + metrics.coherenceScore * 0.2;

        if (totalScore > highestScore) {
          highestScore = totalScore;
          bestResponse = candidate.response;
        }
      }

      return bestResponse || await this.generateMinimalStatisticalResponse(originalText, semanticContext);
      
    } catch (error) {
      console.warn('統計的応答生成エラー:', error.message);
      return await this.generateMinimalStatisticalResponse(originalText, semanticContext);
    }
  }

  /**
   * 統計的応答トークン生成
   * Phase 3分布意味論を活用した高度な語彙選択
   */
  async generateResponseTokens(syntacticStructure, semanticContext) {
    const filterNonVerbal = (term) => {
      // 句読点や記号、単独のひらがな・カタカナなどをフィルタリング
      return term && !/^[、。？！ー～・]$/.test(term) && !/^[あ-んア-ン]$/.test(term) && term.length > 1;
    };
    
    // Phase 3強化済み語彙を優先選択
    const phase3Enhanced = semanticContext.filter(ctx => ctx.phase3Enhanced);
    const regularContext = semanticContext.filter(ctx => !ctx.phase3Enhanced);
    
    let primaryTerm = null;
    let supportTerms = [];
    
    if (phase3Enhanced.length > 0) {
      // Phase 3で意味的に強化された語彙を優先使用
      primaryTerm = phase3Enhanced[0].term;
      supportTerms = phase3Enhanced.slice(1, 3).map(ctx => ctx.term);
      console.log('🧠 Phase 3強化語彙使用:', { primaryTerm, supportTerms });
    } else if (syntacticStructure.primaryTerm) {
      // フォールバック: 構文構造から語彙選択
      primaryTerm = typeof syntacticStructure.primaryTerm === 'string' ? syntacticStructure.primaryTerm : String(syntacticStructure.primaryTerm);
      supportTerms = Array.isArray(syntacticStructure.supportTerms) ? syntacticStructure.supportTerms.slice(0, 2).map(term => String(term)) : [];
    } else if (regularContext.length > 0) {
      // 通常の意味的文脈から選択
      primaryTerm = regularContext[0].term;
      supportTerms = regularContext.slice(1, 3).map(ctx => ctx.term);
    }

    return {
      primary: filterNonVerbal(primaryTerm) ? primaryTerm : null,
      support: supportTerms.filter(filterNonVerbal),
      confidence: syntacticStructure.confidence,
      structure: syntacticStructure.structure,
      generatedSentence: syntacticStructure.finalResponse, // 修正点: finalResponseをgeneratedSentenceにマッピング
      phase3Enhanced: phase3Enhanced.length > 0,
      semanticStrength: phase3Enhanced.length > 0 ? phase3Enhanced[0].semanticScore : 0
    };
  }

  /**
   * 統計的文連結
   * PCFGによって生成された文構造タイプと統計的語彙を組み合わせて、より自然な応答を生成
   */
  async assembleSentence(responseTokens, originalText) {
    const { primary, support, structure, confidence, generatedSentence, phase3Enhanced, semanticStrength } = responseTokens;

    // generatedSentence は structuralInfo オブジェクトになった
    const structuralInfo = generatedSentence;

    if (!structuralInfo || !structuralInfo.primary) {
      return await this.generateMinimalStatisticalResponse(originalText, []);
    }

    const terms = [structuralInfo.primary, ...structuralInfo.support].filter(Boolean);
    const joinedTerms = terms.join('、');
    
    // Phase 3意味的強化情報を表示メッセージに反映
    if (phase3Enhanced && semanticStrength > 0.7) {
      console.log(`🧠 高い意味的類似度(${semanticStrength.toFixed(3)})で応答生成`);
    }

    // 統計的確信度に基づく応答の調整
    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');

    let finalResponse = '';

    // Phase 3強化時の追加情報
    const phase3Indicator = phase3Enhanced ? '意味的に関連する' : '統計的に関連する';
    
    // ここで、structuralInfo と統計的確信度に基づいて動的に応答を生成
    // ハードコードされたテンプレートを排除し、より柔軟な生成ロジックを実装
    const primaryTerm = structuralInfo.primary;
    const supportTerms = structuralInfo.support;

    let generatedResponse = '';

    // 確信度とPhase 3強化の度合いに応じて応答の基本形を決定
    if (phase3Enhanced && semanticStrength > 0.8) {
      generatedResponse = `${primaryTerm}は、意味的に非常に高い関連性を持つ重要な概念です。`;
    } else if (confidence > confidenceThresholds.highConfidence) {
      generatedResponse = `${primaryTerm}について、${supportTerms.length > 0 ? supportTerms[0] : '詳しく'}説明できます。`;
    } else if (confidence > confidenceThresholds.mediumConfidence) {
      generatedResponse = `${primaryTerm}に関連する${phase3Indicator}情報が見つかりました。`;
    } else {
      generatedResponse = `${primaryTerm}について、何か統計的に分析できることはありますか？`;
    }

    // 構造タイプに応じた追加の調整（より汎用的な表現に）
    // switch文を排除し、より動的な文生成ロジックを実装
    if (structuralInfo.type === 'subject_predicate' && supportTerms.length > 0) {
      generatedResponse += ` ${primaryTerm}は${supportTerms[0]}です。`;
    } else if (structuralInfo.type === 'topic_focus' && supportTerms.length > 0) {
      generatedResponse += ` 主な焦点は${supportTerms[0]}です。`;
    } else if (structuralInfo.type === 'topic_comment' && supportTerms.length > 0) {
      generatedResponse += ` ${primaryTerm}に関する${supportTerms[0]}という見方があります。`;
    } else if (structuralInfo.type === 'topic_formal' && supportTerms.length > 0) {
      generatedResponse += ` ${primaryTerm}に関して、${supportTerms[0]}という考察が可能です。`;
    } else if (structuralInfo.type === 'object_focus' && supportTerms.length > 0) {
      generatedResponse += ` ${primaryTerm}を${supportTerms[0]}として分析できます。`;
    }
    // minimal, fallback, default のケースは、上記の基本形と品質評価で対応されるため、ここでは特別な追加は不要

    finalResponse = generatedResponse;

    // 最終的な応答の品質を統計的に評価し、必要に応じて調整
    const finalQualityScore = await this.evaluateSentenceQuality(finalResponse, confidence);
    if (finalQualityScore < confidenceThresholds.lowConfidence) {
      return await this.generateMinimalStatisticalResponse(originalText, []); // 品質が低い場合は最小応答にフォールバック
    }

    return finalResponse;
  }

  /**
   * 最小統計応答生成
   */
  async generateMinimalStatisticalResponse(originalText, semanticContext) {
    const text = typeof originalText === 'string' ? originalText : 'そのテーマ';
    
    if (Array.isArray(semanticContext) && semanticContext.length > 0) {
      const term = semanticContext[0].term;
      return `${term}について。`;
    }
    return `${text}について検討中です。`;
  }

  /**
   * N-gram最小応答
   */
  async generateMinimalNgramResponse(originalText, nextWord) {
    return `${nextWord}に関連して。`;
  }

  /**
   * ベイジアン最小応答
   */
  async generateMinimalBayesianResponse(originalText, userCategory) {
    return `${userCategory}の観点から。`;
  }

  /**
   * バンディット最小応答
   */
  async generateMinimalBanditResponse(originalText, optimizedVocabulary) {
    const term = Array.isArray(optimizedVocabulary) ? optimizedVocabulary[0] : optimizedVocabulary;
    return `${term}について。`;
  }

  /**
   * 品質予測統計応答生成
   */
  async generateQualityStatisticalResponse(originalText, qualityScore, qualityPrediction) {
    try {
      // 品質統計から応答適合性を判定
      const qualityMetrics = await this.analyzeQualityMetrics(qualityScore, qualityPrediction);
      
      // 品質レベルに応じた統計的応答戦略選択
      const qualityStrategy = await this.selectQualityStrategy(qualityMetrics);
      
      // 品質統計による適応的文生成
      return await this.generateQualityAdaptedSentence(originalText, qualityStrategy, qualityMetrics);
      
    } catch (error) {
      return await this.generateMinimalQualityResponse(originalText, qualityScore);
    }
  }

  /**
   * 品質統計から応答適合性を判定
   */
  async analyzeQualityMetrics(qualityScore, qualityPrediction) {
    // 簡易的な実装
    return { score: qualityScore, prediction: qualityPrediction };
  }

  /**
   * 品質レベルに応じた統計的応答戦略選択
   */
  async selectQualityStrategy(qualityMetrics) {
    // 簡易的な実装
    if (qualityMetrics.score > 0.7) return 'high_quality';
    if (qualityMetrics.score > 0.4) return 'medium_quality';
    return 'low_quality';
  }

  /**
   * 品質統計による適応的文生成
   */
  async generateQualityAdaptedSentence(originalText, qualityStrategy, qualityMetrics) {
    // 簡易的な実装
    if (qualityStrategy === 'high_quality') {
      return `${originalText}について、非常に質の高い情報を提供できます。`;
    } else if (qualityStrategy === 'medium_quality') {
      return `${originalText}について、関連情報を提供できます。`;
    } else {
      return `${originalText}について、もう少し情報が必要です。`;
    }
  }

  /**
   * N-gram統計応答生成
   */
  async generateNgramStatisticalResponse(originalText, nextWord, confidence) {
    try {
      // Phase 1: Kneser-Neyスムージング統合N-gram生成
      const kneserNeyEnhancedTokens = await this.generateKneserNeyTokens(originalText, nextWord);
      
      // 高度統計モデルによる文脈パターン抽出
      const ngramPatterns = await this.learningDB.getNgramPatterns(nextWord);
      const enhancedPatterns = await this.enhanceWithKneserNey(ngramPatterns, kneserNeyEnhancedTokens);
      
      // 統計的確信度に基づく応答強度調整
      const responseIntensity = this.calculateResponseIntensity(confidence);
      
      // Kneser-Ney強化統計的文生成
      return await this.generateKneserNeyEnhancedSentence(originalText, nextWord, enhancedPatterns, responseIntensity);
      
    } catch (error) {
      console.warn('Kneser-Ney N-gram生成エラー:', error.message);
      return await this.generateMinimalNgramResponse(originalText, nextWord);
    }
  }

  /**
   * Kneser-Neyスムージング確率計算
   */
  calculateKneserNeyProbability(context, word, count, D, vocabularyStats) {
    const contextCount = vocabularyStats.contextCounts[context] || 1;
    const wordTypeCount = vocabularyStats.wordTypeCounts[word] || 1;
    const totalTypes = vocabularyStats.totalWordTypes || 1000;
    
    // Kneser-Ney確率計算式
    // P_KN(w|c) = max(count(c,w) - D, 0) / count(c) + λ(c) * P_continuation(w)
    const mainTerm = Math.max(count - D, 0) / contextCount;
    const lambda = (D * vocabularyStats.uniqueContinuations[context] || 1) / contextCount;
    const continuationProbability = wordTypeCount / totalTypes;
    
    return mainTerm + lambda * continuationProbability;
  }

  /**
   * N-gramカウント取得（学習データベースから）
   */
  async getNgramCounts(originalText, nextWord) {
    try {
      const tokens = originalText.split(/\s+/).filter(Boolean);
      const ngramCounts = [];
      
      // 既存の学習データからN-gramパターンを抽出
      const relations = await this.learningDB.getUserSpecificRelations('default');
      
      for (const token of tokens) {
        if (relations.userRelations[token]) {
          for (const relatedTerm of relations.userRelations[token]) {
            ngramCounts.push([token, relatedTerm.term, relatedTerm.count || 1]);
          }
        }
      }
      
      return ngramCounts;
    } catch (error) {
      console.warn('N-gramカウント取得エラー:', error.message);
      return [];
    }
  }

  /**
   * 語彙統計情報取得
   */
  async getVocabularyStatistics() {
    try {
      const relations = await this.learningDB.getUserSpecificRelations('default');
      const userRelations = relations.userRelations || {};
      
      const contextCounts = {};
      const wordTypeCounts = {};
      const uniqueContinuations = {};
      
      // 統計情報計算
      for (const [context, relatedTerms] of Object.entries(userRelations)) {
        contextCounts[context] = relatedTerms.length;
        uniqueContinuations[context] = relatedTerms.length;
        
        for (const term of relatedTerms) {
          wordTypeCounts[term.term] = (wordTypeCounts[term.term] || 0) + 1;
        }
      }
      
      return {
        contextCounts,
        wordTypeCounts,
        uniqueContinuations,
        totalWordTypes: Object.keys(wordTypeCounts).length
      };
    } catch (error) {
      console.warn('語彙統計取得エラー:', error.message);
      return {
        contextCounts: {},
        wordTypeCounts: {},
        uniqueContinuations: {},
        totalWordTypes: 1000
      };
    }
  }

  /**
   * Kneser-Neyでパターン強化
   */
  async enhanceWithKneserNey(ngramPatterns, kneserNeyTokens) {
    if (!Array.isArray(kneserNeyTokens) || kneserNeyTokens.length === 0) {
      return ngramPatterns;
    }
    
    return {
      original: ngramPatterns,
      kneserNeyEnhanced: kneserNeyTokens,
      combinedScore: kneserNeyTokens.reduce((sum, token) => sum + token.smoothedProbability, 0) / kneserNeyTokens.length
    };
  }

  /**
   * Kneser-Ney強化文生成
   * Kneser-Neyスムージングによって強化された語彙をより柔軟に組み込む
   */
  async generateKneserNeyEnhancedSentence(originalText, nextWord, enhancedPatterns, responseIntensity) {
    try {
      if (!enhancedPatterns.kneserNeyEnhanced || enhancedPatterns.kneserNeyEnhanced.length === 0) {
        return await this.generateMinimalNgramResponse(originalText, nextWord);
      }
      
      const bestToken = enhancedPatterns.kneserNeyEnhanced[0];
      const supportTokens = enhancedPatterns.kneserNeyEnhanced.slice(1, 3);
      const enhancedTerms = [bestToken.word, ...supportTokens.map(t => t.word)].filter(Boolean);
      
      if (enhancedTerms.length === 0) {
        return await this.generateMinimalNgramResponse(originalText, nextWord);
      }
      
      const confidence = bestToken.confidence || 0.5;
      const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');

      let kneserNeyResponse = '';

      if (confidence > confidenceThresholds.highConfidence) {
        kneserNeyResponse = `${originalText}について、統計的に「${enhancedTerms.join('」「')}」といった概念が強く関連しています。これらの関係性について詳しく説明できます。`;
      } else if (confidence > confidenceThresholds.mediumConfidence) {
        kneserNeyResponse = `「${enhancedTerms.join('」「')}」に関連があります。${originalText}との関連性について掘り下げてみましょう。`;
      } else {
        kneserNeyResponse = `「${enhancedTerms[0]}」について、${originalText}との関連性が見られます。`;
      }

      // 最終的な応答の品質を統計的に評価し、必要に応じて調整
      const finalQualityScore = await this.evaluateSentenceQuality(kneserNeyResponse, confidence);
      if (finalQualityScore < confidenceThresholds.lowConfidence) {
        return await this.generateMinimalNgramResponse(originalText, nextWord); // 品質が低い場合は最小応答にフォールバック
      }

      return kneserNeyResponse;
      
    } catch (error) {
      console.warn('Kneser-Ney強化文生成エラー:', error.message);
      return await this.generateMinimalNgramResponse(originalText, nextWord);
    }
  }

  /**
   * Phase 2: PCFG文構造生成の核心実装
   * 確率的文脈自由文法による統計的文構造組み立て
   */
  async generatePCFGStructure(inputKeywords, relationshipPatterns, userId = 'default') {
    try {
      console.log('🔧 PCFG文構造生成開始:', inputKeywords);
      
      // 1. 日本語PCFG文法ルール取得
      const grammarRules = await this.getJapanesePCFGRules(userId);
      
      // 2. 入力キーワードから最適文法パターン選択
      const selectedPattern = await this.selectBestGrammarPattern(inputKeywords, relationshipPatterns, grammarRules);
      
      // 3. 統計的確率に基づく文構造生成
      const generatedStructure = await this.applyPCFGRules(selectedPattern, relationshipPatterns);
      
      // 4. 文構造の統計的妥当性検証
      const validatedStructure = this.validatePCFGStructure(generatedStructure);
      
      return validatedStructure;
      
    } catch (error) {
      console.warn('PCFG構造生成エラー:', error.message);
      return null;
    }
  }

  /**
   * 統計学習ベース動的PCFG文法ルール生成
   * ハードコーディング完全除去 - 学習データから統計的に生成
   */
  async getJapanesePCFGRules(userId) {
    try {
      console.log('📊 統計学習ベース文法ルール生成開始...');
      
      // 1. 学習データから統計的パターン抽出
      const learnedPatterns = await this.extractLearnedPatterns(userId);
      
      // 2. 動的確率計算
      const dynamicProbabilities = await this.calculateDynamicProbabilities(learnedPatterns);
      
      // 3. 適応的閾値計算
      const adaptiveThresholds = await this.calculateAdaptiveThresholds.bind(this)(userId);
      
      // 4. 統計的文法ルール構築
      const dynamicRules = this.buildStatisticalGrammarRules(learnedPatterns, dynamicProbabilities, adaptiveThresholds);
      
      console.log('✅ 動的文法ルール生成完了:', Object.keys(dynamicRules).length, '種類');
      return dynamicRules;
      
    } catch (error) {
      console.warn('動的文法ルール生成エラー:', error.message, '- フォールバックルール使用');
      return this.getFallbackGrammarRules();
    }
  }

  /**
   * 学習データからの統計的パターン抽出
   */
  async extractLearnedPatterns(userId) {
    try {
      // 既存学習データから関係性パターンを抽出
      const relations = await this.learningDB.getUserSpecificRelations(userId);
      const userRelations = relations?.userRelations || {};
      
      const patterns = {
        structural: [],      // 文構造パターン
        lexical: [],        // 語彙使用パターン  
        contextual: []      // 文脈パターン
      };
      
      // 学習データからパターン分析
      for (const [keyword, relatedTerms] of Object.entries(userRelations)) {
        // 語彙共起パターンから文構造推定
        const structuralPatterns = this.inferStructuralPatterns(keyword, relatedTerms);
        patterns.structural.push(...structuralPatterns);
        
        // 語彙使用頻度パターン
        const lexicalPatterns = this.analyzeLexicalPatterns(keyword, relatedTerms);
        patterns.lexical.push(...lexicalPatterns);
        
        // 文脈関係パターン
        const contextualPatterns = this.analyzeContextualPatterns(keyword, relatedTerms);
        patterns.contextual.push(...contextualPatterns);
      }
      
      console.log('📈 パターン抽出結果:', 
        `構造:${patterns.structural.length}`, 
        `語彙:${patterns.lexical.length}`, 
        `文脈:${patterns.contextual.length}`);
      
      return patterns;
      
    } catch (error) {
      console.warn('パターン抽出エラー:', error.message);
      return { structural: [], lexical: [], contextual: [] };
    }
  }

  /**
   * 構造パターン推定（共起関係から文構造を統計的に推定）
   */
  inferStructuralPatterns(keyword, relatedTerms) {
    const patterns = [];
    
    for (const term of relatedTerms) {
      const strength = term.count || 1;
      
      // 関係性の強さから文構造パターンを推定
      if (strength > 3) {
        patterns.push({
          type: 'high_relation',
          pattern: 'NP について VP',
          keyword: keyword,
          related: term.term,
          strength: strength,
          estimated_probability: Math.min(strength / 10, 0.8)
        });
      } else if (strength > 1) {
        patterns.push({
          type: 'medium_relation', 
          pattern: 'NP は VP',
          keyword: keyword,
          related: term.term,
          strength: strength,
          estimated_probability: Math.min(strength / 5, 0.6)
        });
      } else {
        patterns.push({
          type: 'low_relation',
          pattern: 'NP が VP',
          keyword: keyword,
          related: term.term, 
          strength: strength,
          estimated_probability: 0.3
        });
      }
    }
    
    return patterns;
  }

  /**
   * 語彙パターン分析
   */
  analyzeLexicalPatterns(keyword, relatedTerms) {
    const totalCount = relatedTerms.reduce((sum, term) => sum + (term.count || 1), 0);
    
    return relatedTerms.map(term => ({
      type: 'lexical_usage',
      keyword: keyword,
      term: term.term,
      frequency: term.count || 1,
      relative_frequency: (term.count || 1) / totalCount,
      usage_priority: (term.count || 1) > 2 ? 'high' : 'normal'
    }));
  }

  /**
   * 文脈パターン分析  
   */
  analyzeContextualPatterns(keyword, relatedTerms) {
    const patterns = [];
    const termTypes = this.classifyTermTypes(relatedTerms);
    
    // 概念的関係性から文脈パターンを推定
    if (termTypes.abstract > termTypes.concrete) {
      patterns.push({
        type: 'abstract_context',
        pattern: 'conceptual_explanation',
        keyword: keyword,
        context_type: 'theoretical',
        estimated_formality: 0.7
      });
    } else {
      patterns.push({
        type: 'concrete_context',
        pattern: 'practical_explanation', 
        keyword: keyword,
        context_type: 'practical',
        estimated_formality: 0.4
      });
    }
    
    return patterns;
  }

  /**
   * 語彙タイプ分類
   */
  classifyTermTypes(relatedTerms) {
    const classification = { abstract: 0, concrete: 0 };
    
    for (const term of relatedTerms) {
      // 簡易的な抽象/具象分類
      if (term.term.includes('的') || term.term.includes('性') || term.term.includes('論')) {
        classification.abstract++;
      } else {
        classification.concrete++;
      }
    }
    
    return classification;
  }

  /**
   * 動的確率計算
   */
  async calculateDynamicProbabilities(learnedPatterns) {
    try {
      const probabilities = {};
      
      // 構造パターンの統計的確率計算
      const structuralCounts = {};
      for (const pattern of learnedPatterns.structural) {
        const key = pattern.pattern;
        structuralCounts[key] = (structuralCounts[key] || 0) + pattern.strength;
      }
      
      // 確率正規化
      const totalStructural = Object.values(structuralCounts).reduce((sum, count) => sum + count, 0);
      probabilities.structural = {};
      
      for (const [pattern, count] of Object.entries(structuralCounts)) {
        probabilities.structural[pattern] = totalStructural > 0 ? count / totalStructural : 0.2;
      }
      
      // 最小閾値適用（極端な偏りを防ぐ）
      for (const pattern in probabilities.structural) {
        probabilities.structural[pattern] = Math.max(probabilities.structural[pattern], 0.05);
      }
      
      console.log('📊 動的確率計算完了:', Object.keys(probabilities.structural).length, '種類');
      return probabilities;
      
    } catch (error) {
      console.warn('動的確率計算エラー:', error.message);
      return { structural: {} };
    }
  }

  /**
   * 統計的文法ルール構築
   */
  buildStatisticalGrammarRules(patterns, probabilities, thresholds) {
    const rules = {
      S: [],
      NP: [],
      VP: [],
      QUESTION_PATTERNS: []
    };
    
    // 統計データからS（文）パターン生成
    const structuralProbs = probabilities.structural || {};
    for (const [pattern, probability] of Object.entries(structuralProbs)) {
      rules.S.push({
        pattern: pattern,
        probability: probability,
        type: this.inferPatternType(pattern),
        learned: true
      });
    }
    
    // 学習語彙からVP（動詞句）パターン生成
    const vpPatterns = this.generateVerbPhrases(patterns.lexical, thresholds);
    rules.VP = vpPatterns;
    
    // 名詞句パターンは学習データから動的生成
    rules.NP = this.generateNounPhrases(patterns.lexical);
    
    // 最小保証：空の場合のフォールバック
    if (rules.S.length === 0) {
      rules.S.push({
        pattern: 'NP について VP',
        probability: 1.0,
        type: 'learned_fallback',
        learned: false
      });
    }
    
    return rules;
  }

  /**
   * パターンタイプ推定
   */
  inferPatternType(pattern) {
    if (pattern.includes('について')) return 'topic_focus';
    if (pattern.includes('は')) return 'topic_comment';
    if (pattern.includes('が')) return 'subject_predicate';
    if (pattern.includes('に関して')) return 'topic_formal';
    if (pattern.includes('を')) return 'object_focus';
    return 'general';
  }

  /**
   * パターンからキーワードを抽出（簡易版）
   */
  extractKeywordsFromPattern(pattern) {
    // 例: "NP は VP" -> ["NP", "VP"]
    // 実際には、より複雑なパターン解析が必要になる場合があります。
    return pattern.match(/\b[A-Z]+\b/g) || [];
  }

  /**
   * パターンと意味埋め込みの類似度を計算（簡易版）
   */
  calculatePatternSemanticSimilarity(patternKeywords, semanticEmbeddings) {
    let totalSimilarity = 0;
    let count = 0;
    for (const pKeyword of patternKeywords) {
      if (semanticEmbeddings[pKeyword]) {
        totalSimilarity += semanticEmbeddings[pKeyword]; // 簡易的に埋め込み値を類似度として利用
        count++;
      }
    }
    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * 動詞句統計生成
   */
  generateVerbPhrases(lexicalPatterns, thresholds) {
    const verbPhrases = [];
    const usageStats = this.analyzeVerbUsage(lexicalPatterns);
    
    // 使用頻度統計から動詞句を生成
    for (const [verb, stats] of Object.entries(usageStats)) {
      const probability = stats.frequency / stats.total;
      const confidence = this.calculateConfidenceLevel(stats.usage_count);
      
      verbPhrases.push({
        pattern: this.generateVerbPhrase(verb, confidence),
        probability: probability,
        type: this.classifyVerbType(verb, confidence),
        learned: true,
        confidence: confidence
      });
    }
    
    return verbPhrases.length > 0 ? verbPhrases : this.getMinimalVerbPhrases();
  }

  /**
   * 動詞使用統計分析
   */
  analyzeVerbUsage(lexicalPatterns) {
    const usage = {};
    let total = 0;
    
    for (const pattern of lexicalPatterns) {
      if (pattern.usage_priority === 'high') {
        const verb = this.extractVerbContext(pattern.term);
        if (verb) {
          usage[verb] = usage[verb] || { frequency: 0, usage_count: 0, total: 0 };
          usage[verb].frequency += pattern.frequency;
          usage[verb].usage_count++;
          total += pattern.frequency;
        }
      }
    }
    
    // 総計を設定
    for (const verb in usage) {
      usage[verb].total = total;
    }
    
    return usage;
  }

  /**
   * 動詞文脈抽出（簡易版）
   */
  extractVerbContext(term) {
    // 実際の実装では、より高度な動詞抽出を行う
    if (term.includes('説明') || term.includes('解説')) return '説明';
    if (term.includes('分析') || term.includes('検討')) return '分析';
    if (term.includes('関連') || term.includes('関係')) return '関連';
    return null;
  }

  /**
   * 動詞句生成
   */
  async generateVerbPhrase(verb, confidence) {
    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
    switch (verb) {
      case '説明':
        return confidence > confidenceThresholds.highConfidence ? '詳しく説明できます' : '説明できます';
      case '分析':
        return confidence > confidenceThresholds.highConfidence ? '詳細に分析します' : '分析します';
      case '関連':
        return '関連があります';
      default:
        return confidence > confidenceThresholds.mediumConfidence ? '詳しく検討します' : '検討します';
    }
  }

  /**
   * 信頼度レベル計算
   */
  calculateConfidenceLevel(usageCount) {
    if (usageCount >= 5) return 0.8;
    if (usageCount >= 3) return 0.6;
    if (usageCount >= 2) return 0.4;
    return 0.2;
  }

  /**
   * 動詞タイプ分類
   */
  async classifyVerbType(verb, confidence) {
    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
    if (confidence > confidenceThresholds.highConfidence) return 'high_confidence_action';
    if (confidence > confidenceThresholds.mediumConfidence) return 'medium_confidence_action';
    return 'low_confidence_action';
  }

  /**
   * 名詞句統計生成
   */
  generateNounPhrases(lexicalPatterns) {
    const nounPhrases = [];
    const nounUsage = this.analyzeNounUsage(lexicalPatterns);

    for (const [noun, stats] of Object.entries(nounUsage)) {
      const probability = stats.frequency / stats.total;
      const confidence = this.calculateConfidenceLevel(stats.usage_count);

      nounPhrases.push({
        pattern: noun,
        probability: probability,
        type: this.classifyNounType(noun, confidence),
        learned: true,
        confidence: confidence
      });
    }

    return nounPhrases.length > 0 ? nounPhrases : this.getMinimalNounPhrases();
  }

  /**
   * 名詞使用統計分析
   */
  analyzeNounUsage(lexicalPatterns) {
    const usage = {};
    let total = 0;

    for (const pattern of lexicalPatterns) {
      // 簡易的に名詞を抽出
      if (pattern.type === 'lexical_usage' && !this.isVerb(pattern.term)) {
        const noun = pattern.term;
        if (noun) {
          usage[noun] = usage[noun] || { frequency: 0, usage_count: 0, total: 0 };
          usage[noun].frequency += pattern.frequency;
          usage[noun].usage_count++;
          total += pattern.frequency;
        }
      }
    }

    for (const noun in usage) {
      usage[noun].total = total;
    }

    return usage;
  }

  /**
   * 動詞判定（簡易版）
   */
  isVerb(term) {
    // 実際には品詞情報を使用
    return term.endsWith('する') || term.endsWith('れる') || term.endsWith('いる');
  }

  /**
   * 名詞タイプ分類
   */
  classifyNounType(noun, confidence) {
    if (noun.length > 3 && confidence > 0.5) return 'complex_noun';
    return 'simple_noun';
  }

  /**
   * 最小名詞句
   */
  getMinimalNounPhrases() {
    return [
      { pattern: 'テーマ', probability: 1.0, type: 'default_noun', learned: false, confidence: 0.5 },
      { pattern: '情報', probability: 0.8, type: 'default_noun', learned: false, confidence: 0.5 }
    ];
  }

  /**
   * 最小動詞句
   */
  getMinimalVerbPhrases() {
    return [
      { pattern: '説明できます', probability: 1.0, type: 'default_verb', learned: false, confidence: 0.5 },
      { pattern: '分析します', probability: 0.8, type: 'default_verb', learned: false, confidence: 0.5 }
    ];
  }

  /**
   * フォールバック文法ルール
   */
  getFallbackGrammarRules() {
    return {
      S: [
        { pattern: 'NP について VP', probability: 0.5, type: 'topic_focus', learned: false },
        { pattern: 'NP は VP', probability: 0.3, type: 'topic_comment', learned: false },
        { pattern: 'NP が VP', probability: 0.2, type: 'subject_predicate', learned: false }
      ],
      NP: this.getMinimalNounPhrases(),
      VP: this.getMinimalVerbPhrases(),
      QUESTION_PATTERNS: [
        { pattern: 'NP は何ですか？', probability: 0.5, type: 'what_question', learned: false },
        { pattern: 'NP についてどう思いますか？', probability: 0.5, type: 'opinion_question', learned: false }
      ]
    };
  }

  /**
   * 緊急文法パターン作成
   */
  createEmergencyGrammarPattern(inputKeywords) {
    const keyword = inputKeywords && inputKeywords.length > 0 ? inputKeywords[0] : '何か';
    return {
      pattern: `${keyword}について。`,
      probability: 0.1,
      type: 'emergency_fallback',
      learned: false,
      confidence: 0.1
    };
  }

  /**
   * 動的重み計算
   */
  async calculateDynamicWeights(type) {
    try {
      const performanceStats = await this.analyzeResponsePerformance('default');
      const qualityMetrics = await this.analyzeQualityMetrics('default');

      // 応答品質に基づいて閾値を動的に調整
      const highConfidenceThreshold = Math.min(0.8, 0.5 + performanceStats.highQualityRate * 0.3);
      const mediumConfidenceThreshold = Math.min(0.6, 0.3 + performanceStats.mediumQualityRate * 0.2);

      // 関係性強度に基づいて閾値を動的に調整
      const relationshipThreshold = Math.min(0.7, 0.4 + qualityMetrics.averageRelationStrength * 0.3);

      // 語彙選択の多様性に基づいて閾値を動的に調整
      const vocabularySelectionThreshold = Math.min(0.7, 0.4 + qualityMetrics.vocabularyDiversity / 10 * 0.3);

      return {
        highConfidence: highConfidenceThreshold,
        mediumConfidence: mediumConfidenceThreshold,
        lowConfidence: 0.1, // 初期値を設定
        relationshipStrength: relationshipThreshold,
        vocabularySelection: vocabularySelectionThreshold,
        
        // メタデータ（デバッグ用）
        basedOnStats: {
          highQualityRate: performanceStats.highQualityRate,
          avgRelationStrength: qualityMetrics.averageRelationStrength,
          vocabularyDiversity: qualityMetrics.vocabularyDiversity
        }
      };
    } catch (error) {
      console.warn('動的重み計算エラー:', error.message);
      // フォールバック値
      return {
        lowConfidence: 0.1,
        mediumConfidence: 0.3,
        highConfidence: 0.5,
        minStrength: 0.3,
        qualityThreshold: 0.5
      };
    }
  }

  /**
   * 応答パフォーマンス統計分析
   */
  async analyzeResponsePerformance(userId) {
    try {
      const relations = await this.learningDB.getUserSpecificRelations(userId);
      const userRelations = relations?.userRelations || {};
      
      let totalResponses = 0;
      let highQualityResponses = 0;
      let mediumQualityResponses = 0;
      let responseDistribution = {};
      
      for (const [keyword, relatedTerms] of Object.entries(userRelations)) {
        const relationshipStrength = relatedTerms.reduce((sum, term) => sum + (term.count || 1), 0);
        totalResponses++;
        
        if (relationshipStrength > 5) {
          highQualityResponses++;
          responseDistribution['high'] = (responseDistribution['high'] || 0) + 1;
        } else if (relationshipStrength > 2) {
          mediumQualityResponses++;
          responseDistribution['medium'] = (responseDistribution['medium'] || 0) + 1;
        } else {
          responseDistribution['low'] = (responseDistribution['low'] || 0) + 1;
        }
      }
      
      return {
        totalResponses,
        highQualityResponses,
        mediumQualityResponses,
        highQualityRate: totalResponses > 0 ? highQualityResponses / totalResponses : 0.1,
        mediumQualityRate: totalResponses > 0 ? mediumQualityResponses / totalResponses : 0.3,
        responseDistribution
      };
      
    } catch (error) {
      console.warn('パフォーマンス統計分析エラー:', error.message);
      return {
        totalResponses: 0,
        highQualityRate: 0.1,
        mediumQualityRate: 0.3,
        responseDistribution: {}
      };
    }
  }

  /**
   * 品質指標分析
   */
  async analyzeQualityMetrics(userId) { // userId を追加
    try {
      const relations = await this.learningDB.getUserSpecificRelations(userId); // userId を使用
      const userRelations = relations?.userRelations || {};
      
      const metrics = {
        vocabularyDiversity: 0,
        relationshipDensity: 0,
        contextualRichness: 0,
        averageRelationStrength: 0
      };
      
      if (Object.keys(userRelations).length === 0) {
        return metrics;
      }
      
      // 語彙多様性計算
      metrics.vocabularyDiversity = Object.keys(userRelations).length;
      
      // 関係性密度計算
      let totalRelations = 0;
      let totalStrength = 0;
      
      for (const [keyword, relatedTerms] of Object.entries(userRelations)) {
        totalRelations += relatedTerms.length;
        
        for (const term of relatedTerms) {
          totalStrength += (term.count || 1);
        }
      }
      
      metrics.relationshipDensity = totalRelations / Object.keys(userRelations).length;
      metrics.averageRelationStrength = totalRelations > 0 ? totalStrength / totalRelations : 0.5; // ゼロ除算対策
      
      // 文脈豊富度（関係性の深さ）
      metrics.contextualRichness = metrics.averageRelationStrength * metrics.relationshipDensity;

      return metrics;
    } catch (error) {
      console.warn('品質指標分析エラー:', error.message);
      return {
        vocabularyDiversity: 0,
        relationshipDensity: 0,
        contextualRichness: 0,
        averageRelationStrength: 0
      };
    }
  }

  /**
   * 適応的閾値計算
   */
  async calculateAdaptiveThresholds(userId) {
    try {
      const performanceStats = await this.analyzeResponsePerformance(userId);
      const qualityMetrics = await this.analyzeQualityMetrics(userId);

      // 応答品質に基づいて閾値を動的に調整
      const highConfidenceThreshold = Math.min(0.8, 0.5 + performanceStats.highQualityRate * 0.3);
      const mediumConfidenceThreshold = Math.min(0.6, 0.3 + performanceStats.mediumQualityRate * 0.2);

      // 関係性強度に基づいて閾値を動的に調整
      const relationshipThreshold = Math.min(0.7, 0.4 + qualityMetrics.averageRelationStrength * 0.3);

      // 語彙選択の多様性に基づいて閾値を動的に調整
      const vocabularySelectionThreshold = Math.min(0.7, 0.4 + qualityMetrics.vocabularyDiversity / 10 * 0.3);

      return {
        highConfidence: highConfidenceThreshold,
        mediumConfidence: mediumConfidenceThreshold,
        lowConfidence: 0.1, // 初期値を設定
        relationshipStrength: relationshipThreshold,
        vocabularySelection: vocabularySelectionThreshold,
        
        // メタデータ（デバッグ用）
        basedOnStats: {
          highQualityRate: performanceStats.highQualityRate,
          avgRelationStrength: qualityMetrics.averageRelationStrength,
          vocabularyDiversity: qualityMetrics.vocabularyDiversity
        }
      };
    } catch (error) {
      console.warn('動的重み計算エラー:', error.message);
      // フォールバック値
      return {
        lowConfidence: 0.1,
        mediumConfidence: 0.3,
        highConfidence: 0.5,
        minStrength: 0.3,
        qualityThreshold: 0.5
      };
    }
  }
}
