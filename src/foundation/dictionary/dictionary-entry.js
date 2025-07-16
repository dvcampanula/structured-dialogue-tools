#!/usr/bin/env node
/**
 * Dictionary Entry - 統一辞書エントリクラス
 * 
 * 🔗 DictionaryDB と DictionaryDBCore で共通使用
 * 📚 重複除去・統一インターフェース
 * ⚡ 軽量・高機能
 */

/**
 * 統一辞書エントリ構造
 */
export class DictionaryEntry {
    constructor(word, reading = null, definitions = [], synonyms = [], antonyms = [], pos = [], quality = 0, synonymQualities = []) {
        this.word = word;           // 単語
        this.reading = reading;     // 読み（ひらがな）
        this.definitions = definitions; // 定義・意味
        this.synonyms = synonyms;   // 同義語
        this.antonyms = antonyms;   // 反義語
        this.pos = pos;            // 品詞 (part of speech)
        this.frequency = 0;        // 使用頻度
        this.level = 'common';     // 語彙レベル
        this.quality = quality;    // 品質スコア
        this.synonymQualities = synonymQualities || []; // 同義語ペアの品質スコアリスト
        
        // 拡張プロパティ
        this.source = null;        // データソース
        this.lang = null;          // 言語情報
        this.synonymQuality = 0;   // 同義語全体品質スコア
    }

    /**
     * エントリの有効性チェック
     */
    isValid() {
        return this.word && this.word.length > 0;
    }

    /**
     * 品詞の一致チェック
     */
    hasCommonPOS(otherEntry) {
        if (!otherEntry || !otherEntry.pos) return false;
        return this.pos.some(pos => otherEntry.pos.includes(pos));
    }

    /**
     * エントリのJSON表現取得
     */
    toJSON() {
        return {
            word: this.word,
            reading: this.reading,
            definitions: this.definitions,
            synonyms: this.synonyms,
            antonyms: this.antonyms,
            pos: this.pos,
            frequency: this.frequency,
            level: this.level,
            quality: this.quality,
            synonymQualities: this.synonymQualities,
            source: this.source,
            lang: this.lang,
            synonymQuality: this.synonymQuality
        };
    }

    /**
     * JSONからエントリ復元
     */
    static fromJSON(json) {
        const entry = new DictionaryEntry(
            json.word,
            json.reading,
            json.definitions || [],
            json.synonyms || [],
            json.antonyms || [],
            json.pos || [],
            json.quality || 0,
            json.synonymQualities || []
        );
        
        entry.frequency = json.frequency || 0;
        entry.level = json.level || 'common';
        entry.source = json.source || null;
        entry.lang = json.lang || null;
        entry.synonymQuality = json.synonymQuality || 0;
        
        return entry;
    }

    /**
     * エントリの複製
     */
    clone() {
        return DictionaryEntry.fromJSON(this.toJSON());
    }
}

export default DictionaryEntry;