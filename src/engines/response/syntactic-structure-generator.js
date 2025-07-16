export class SyntacticStructureGenerator {
  constructor(learningDB, calculateDynamicWeights, getLearnedRelatedTerms, hybridProcessor, learningConfig) {
    this.learningDB = learningDB;
    this.calculateDynamicWeights = calculateDynamicWeights;
    this.getLearnedRelatedTerms = getLearnedRelatedTerms;
    this.hybridProcessor = hybridProcessor; // 追加
    this.learningConfig = learningConfig; // 追加
    console.log('🌳 SyntacticStructureGenerator初期化完了');
  }

  /**
   * Phase 2: PCFG確率的文脈自由文法による統計的文構造生成
   * 文構造生成問題の根本解決 - 統計的文法ルールによる自然な文組み立て
   */
  async generateSyntacticStructure(inputKeywords, relationshipPatterns, userId) {
    try {
      if (process.env.DEBUG_VERBOSE === 'true') {
        console.log('🔧 PCFG文構造生成開始:', inputKeywords);
      }
      
      // 0. 意味埋め込みの計算（統計学習ベース: 関係性パターンの強度を意味埋め込みとして利用）
      const semanticEmbeddings = this.calculateSemanticEmbeddings(relationshipPatterns);
      
      if (process.env.DEBUG_VERBOSE === 'true') {
        console.log('🧠 意味埋め込み計算完了:', semanticEmbeddings);
      }

      // 1. 日本語PCFG文法ルール取得
      const grammarRules = await this.getJapanesePCFGRules(userId);
      
      // 2. 入力キーワードから最適文法パターン選択
      const selectedPattern = await this.selectBestGrammarPattern(inputKeywords, relationshipPatterns, grammarRules, semanticEmbeddings);
      
      // 3. 統計的確率に基づく文構造生成
      const generatedStructure = await this.applyPCFGRules(selectedPattern, relationshipPatterns);
      
      // 4. 文構造の統計的妥当性検証
      const validatedStructure = await this.validatePCFGStructure(generatedStructure);
      
      const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
      if (validatedStructure && validatedStructure.confidence > confidenceThresholds.lowConfidence) {
        console.log('✅ PCFG文構造生成成功:', validatedStructure.structure);
        return validatedStructure;
      }
      
      // フォールバック: 従来の統計的手法
      return this.generateFallbackSyntacticStructure(relationshipPatterns);
      
    } catch (error) {
      console.warn('PCFG文構造生成エラー:', error.message);
      return this.generateFallbackSyntacticStructure(relationshipPatterns);
    }
  }

  /**
   * フォールバック統計的文構造生成
   */
  generateFallbackSyntacticStructure(relationshipPatterns) {
    if (!Array.isArray(relationshipPatterns) || relationshipPatterns.length === 0) {
      return { primaryTerm: null, supportTerms: [], confidence: 0, structure: 'minimal' };
    }
    
    const maxStrength = Math.max(...relationshipPatterns.map(p => p.strength));
    return {
      primaryTerm: relationshipPatterns.find(p => p.strength === maxStrength)?.term,
      supportTerms: relationshipPatterns.filter(p => p.strength > 0.5).map(p => p.term),
      confidence: maxStrength,
      structure: 'fallback'
    };
  }

  /**
   * 統計的確率に基づく文構造生成
   */
  async applyPCFGRules(selectedPattern, relationshipPatterns, grammarRules) { // grammarRulesを追加
    const patternString = selectedPattern.pattern.pattern || 'NP VP';
    const patternType = selectedPattern.pattern.type || 'subject_predicate';

    // 1. Select NP (Noun Phrase)
    const primaryTerm = relationshipPatterns.length > 0 ? String(relationshipPatterns[0].term) : (grammarRules.NP[0]?.pattern || "");

    // 2. Select VP (Verb Phrase)
    const verbPhrase = grammarRules.VP.length > 0 ? grammarRules.VP[0].pattern : "";

    // 3. Assemble the sentence template
    let finalSentence = patternString
      .replace('NP', primaryTerm)
      .replace('VP', verbPhrase);

    return {
      primaryTerm: primaryTerm,
      supportTerms: relationshipPatterns.length > 1 ? relationshipPatterns.slice(1, 3).map(p => String(p.term)) : [],
      confidence: selectedPattern.pattern.probability || 0.5,
      structure: patternType,
      finalResponse: finalSentence // 完成した文を返す
    };
  }

  /**
   * 文構造の統計的妥当性検証
   */
  async validatePCFGStructure(generatedStructure) {
    // Placeholder: In a real scenario, this would validate the generated structure
    // against statistical norms or grammatical rules.
    return generatedStructure;
  }

  /**
   * 最適な文法パターンを選択
   */
  async selectBestGrammarPattern(inputKeywords, relationshipPatterns, grammarRules, semanticEmbeddings) {
    let bestPattern = null;
    let maxScore = -1;

    for (const rule of grammarRules.S) {
      const patternKeywords = this.extractKeywordsFromPattern(rule.pattern);
      const semanticSimilarity = this.calculatePatternSemanticSimilarity(patternKeywords, semanticEmbeddings);
      
      // スコア計算（簡易版）
      const score = rule.probability * 0.8 + semanticSimilarity * 0.2;

      if (score > maxScore) {
        maxScore = score;
        bestPattern = { pattern: rule, score: score };
      }
    }
    
    return bestPattern || { pattern: grammarRules.S[0], score: 0 };
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
          estimated_probability: Math.min(strength / 5, 1.0) // strengthを正規化して確率に変換
        });
      } else if (strength > 1) {
        patterns.push({
          type: 'medium_relation', 
          pattern: 'NP は VP',
          keyword: keyword,
          related: term.term,
          strength: strength,
          estimated_probability: Math.min(strength / 3, 1.0) // strengthを正規化して確率に変換
        });
      } else {
        patterns.push({
          type: 'low_relation',
          pattern: 'NP が VP',
          keyword: keyword,
          related: term.term, 
          strength: strength,
          estimated_probability: Math.min(strength / 2, 1.0) // strengthを正規化して確率に変換
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
      // 現在は簡易的な抽象/具象分類（接尾辞ベース）
      // 将来的に、より高度なセマンティック分析や辞書情報（JMDictなど）を活用して拡張可能
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
    rules.VP = vpPatterns.length > 0 ? vpPatterns : this.getMinimalVerbPhrases();
    
    // 名詞句パターンは学習データから動的生成
    const npPatterns = this.generateNounPhrases(patterns.lexical);
    rules.NP = npPatterns.length > 0 ? npPatterns : this.getMinimalNounPhrases();
    
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
    // 現在はPCFGシンボル（例: "NP", "VP"）を抽出
    // 将来的に、より複雑な文法パターンから意味のあるキーワードを抽出するよう拡張可能
    return pattern.match(/\b[A-Z]+\b/g) || [];
  }

  /**
   * パターンと意味埋め込みの類似度を計算（簡易版）
   */
  calculatePatternSemanticSimilarity(patternKeywords, semanticEmbeddings) {
    if (!semanticEmbeddings || Object.keys(semanticEmbeddings).length === 0) {
        return 0;
    }
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
      // 品詞情報を使用して動詞を抽出
      if (pattern.usage_priority === 'high' && pattern.pos && pattern.pos.startsWith('動詞')) {
        const verb = pattern.term;
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
   * 動詞句生成
   */
  async generateVerbPhrase(verb, confidence) {
    const confidenceThresholds = await this.calculateDynamicWeights('confidenceThresholds');
    if (confidence > confidenceThresholds.highConfidence) {
      return `${verb}できます`;
    } else if (confidence > confidenceThresholds.mediumConfidence) {
      return `${verb}します`;
    } else {
      return `${verb}ます`;
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
      // 品詞情報を使用して名詞を抽出
      if (pattern.type === 'lexical_usage' && pattern.pos && pattern.pos.startsWith('名詞')) {
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
    return [];
  }

  /**
   * 最小動詞句
   */
  getMinimalVerbPhrases() {
    return [];
  }

  /**
   * フォールバック文法ルール
   */
  getFallbackGrammarRules() {
    return {
      S: this.learningConfig.fallbackGrammarRules.S,
      NP: this.learningConfig.fallbackGrammarRules.NP,
      VP: this.learningConfig.fallbackGrammarRules.VP,
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
    const emergencyPattern = this.learningConfig.emergencyGrammarPattern;
    return {
      pattern: emergencyPattern.template.replace('{keyword}', keyword),
      probability: emergencyPattern.probability,
      type: emergencyPattern.type,
      learned: false,
      confidence: emergencyPattern.confidence
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

  /**
   * 意味埋め込み計算（統計学習ベース）
   * @param {Object} relationshipPatterns - 関係性パターン
   * @returns {Object} 意味埋め込みベクトル
   */
  calculateSemanticEmbeddings(relationshipPatterns) {
    try {
      const embeddings = {};
      
      // 関係性パターンから語彙の共起統計を抽出
      for (const [primaryTerm, relations] of Object.entries(relationshipPatterns)) {
        if (!relations || !Array.isArray(relations) || relations.length === 0) continue;
        
        // 各語彙の意味ベクトルを関係性強度で構築
        const embedding = [];
        const maxDimensions = 10; // 簡易的な次元数
        
        for (let i = 0; i < maxDimensions; i++) {
          let dimensionValue = 0;
          
          // 関係性の強度を次元値として利用（配列であることを確認済み）
          for (const relation of relations.slice(0, 3)) { // 上位3つの関連語
            if (relation.strength) {
              // 関連語のハッシュ値を次元特徴として利用
              const hashFeature = this.simpleHash(relation.term + i) % 1000 / 1000;
              dimensionValue += relation.strength * hashFeature;
            }
          }
          
          embedding.push(dimensionValue / relations.length);
        }
        
        // ベクトル正規化
        const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
          embeddings[primaryTerm] = embedding.map(val => val / norm);
        } else {
          embeddings[primaryTerm] = new Array(maxDimensions).fill(0);
        }
      }
      
      console.log(`🧠 意味埋め込み計算完了: ${Object.keys(embeddings).length}語彙`);
      return embeddings;
      
    } catch (error) {
      console.warn('⚠️ 意味埋め込み計算エラー:', error.message);
      return {};
    }
  }
  
  /**
   * パターンの意味類似度計算
   * @param {Array} patternKeywords - パターンのキーワード
   * @param {Object} semanticEmbeddings - 意味埋め込み
   * @returns {number} 類似度スコア
   */
  calculatePatternSemanticSimilarity(patternKeywords, semanticEmbeddings) {
    try {
      if (Object.keys(semanticEmbeddings).length === 0) return 0;
      
      let totalSimilarity = 0;
      let validComparisons = 0;
      
      for (const pKeyword of patternKeywords) {
        if (semanticEmbeddings[pKeyword]) {
          // 他のキーワードとの平均類似度を計算
          for (const otherKeyword of patternKeywords) {
            if (pKeyword !== otherKeyword && semanticEmbeddings[otherKeyword]) {
              const similarity = this.cosineSimilarity(
                semanticEmbeddings[pKeyword],
                semanticEmbeddings[otherKeyword]
              );
              totalSimilarity += similarity;
              validComparisons++;
            }
          }
        }
      }
      
      return validComparisons > 0 ? totalSimilarity / validComparisons : 0;
      
    } catch (error) {
      console.warn('⚠️ パターン類似度計算エラー:', error.message);
      return 0;
    }
  }
  
  /**
   * コサイン類似度計算
   * @param {Array} vectorA - ベクトルA
   * @param {Array} vectorB - ベクトルB
   * @returns {number} コサイン類似度
   */
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    const norm = Math.sqrt(normA) * Math.sqrt(normB);
    return norm > 0 ? dotProduct / norm : 0;
  }
  
  /**
   * 簡易ハッシュ関数
   * @param {string} str - ハッシュ対象文字列
   * @returns {number} ハッシュ値
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bit整数に変換
    }
    return Math.abs(hash);
  }
}
