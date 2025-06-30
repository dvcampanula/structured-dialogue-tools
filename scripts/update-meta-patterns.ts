#!/usr/bin/env node

/**
 * メタ概念パターン管理スクリプト
 * 
 * 使用方法:
 * - 表示: npm run patterns:show
 * - 新パターン追加: npm run patterns:add "category" "pattern"
 * - バックアップ: npm run patterns:backup
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const CONFIG_PATH = 'src/config/meta-concept-patterns.json';
const BACKUP_DIR = 'backups/meta-patterns';

interface MetaConceptConfig {
  metaConceptPatterns: Array<{
    category: string;
    patterns: string[];
  }>;
  revolutionaryKeywords: Array<{
    category: string;
    keywords: string[];
  }>;
  version: string;
  lastUpdated: string;
  description: string;
}

class MetaPatternManager {
  private config: MetaConceptConfig | null = null;

  async loadConfig(): Promise<void> {
    try {
      const content = await fs.readFile(CONFIG_PATH, 'utf-8');
      this.config = JSON.parse(content);
      console.log('✅ 設定ファイル読み込み完了');
    } catch (error) {
      console.error('❌ 設定ファイル読み込み失敗:', error);
      throw error;
    }
  }

  async saveConfig(): Promise<void> {
    if (!this.config) throw new Error('設定が読み込まれていません');
    
    // バージョンと更新日時を更新
    const currentVersion = this.config.version.split('.');
    currentVersion[2] = (parseInt(currentVersion[2]) + 1).toString();
    this.config.version = currentVersion.join('.');
    this.config.lastUpdated = new Date().toISOString().split('T')[0];
    
    await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
    console.log('✅ 設定ファイル保存完了');
  }

  async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(BACKUP_DIR, `meta-patterns-${timestamp}.json`);
    
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.copyFile(CONFIG_PATH, backupPath);
    
    console.log('📁 バックアップ作成:', backupPath);
  }

  showPatterns(): void {
    if (!this.config) throw new Error('設定が読み込まれていません');
    
    console.log('🎯 メタ概念パターン設定');
    console.log('========================');
    console.log('バージョン:', this.config.version);
    console.log('最終更新:', this.config.lastUpdated);
    console.log('');
    
    console.log('📝 メタ概念パターン:');
    this.config.metaConceptPatterns.forEach((category, i) => {
      console.log(`  ${i + 1}. ${category.category} (${category.patterns.length}パターン)`);
      category.patterns.slice(0, 3).forEach(pattern => {
        console.log(`     - ${pattern}`);
      });
      if (category.patterns.length > 3) {
        console.log(`     ... 他${category.patterns.length - 3}パターン`);
      }
    });
    
    console.log('');
    console.log('🔑 革新キーワード:');
    this.config.revolutionaryKeywords.forEach((category, i) => {
      console.log(`  ${i + 1}. ${category.category} (${category.keywords.length}キーワード)`);
      console.log(`     ${category.keywords.slice(0, 5).join(', ')}${category.keywords.length > 5 ? '...' : ''}`);
    });
  }

  addPattern(categoryName: string, pattern: string): void {
    if (!this.config) throw new Error('設定が読み込まれていません');
    
    const category = this.config.metaConceptPatterns.find(c => c.category === categoryName);
    if (category) {
      category.patterns.push(pattern);
      console.log(`✅ パターン追加: ${categoryName} - ${pattern}`);
    } else {
      console.log('❌ カテゴリが見つかりません:', categoryName);
      console.log('利用可能なカテゴリ:');
      this.config.metaConceptPatterns.forEach(c => console.log(`  - ${c.category}`));
    }
  }

  addKeyword(categoryName: string, keyword: string): void {
    if (!this.config) throw new Error('設定が読み込まれていません');
    
    const category = this.config.revolutionaryKeywords.find(c => c.category === categoryName);
    if (category) {
      category.keywords.push(keyword);
      console.log(`✅ キーワード追加: ${categoryName} - ${keyword}`);
    } else {
      console.log('❌ カテゴリが見つかりません:', categoryName);
      console.log('利用可能なカテゴリ:');
      this.config.revolutionaryKeywords.forEach(c => console.log(`  - ${c.category}`));
    }
  }

  validatePatterns(): boolean {
    if (!this.config) return false;
    
    let isValid = true;
    console.log('🔍 パターン検証中...');
    
    this.config.metaConceptPatterns.forEach(category => {
      category.patterns.forEach(pattern => {
        try {
          new RegExp(pattern, 'g');
        } catch (error) {
          console.error(`❌ 無効な正規表現: ${pattern} in ${category.category}`);
          isValid = false;
        }
      });
    });
    
    if (isValid) {
      console.log('✅ 全パターン有効');
    }
    
    return isValid;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const manager = new MetaPatternManager();
  
  try {
    await manager.loadConfig();
    
    switch (command) {
      case 'show':
        manager.showPatterns();
        break;
        
      case 'add-pattern':
        if (args.length < 3) {
          console.error('使用方法: add-pattern <category> <pattern>');
          process.exit(1);
        }
        await manager.createBackup();
        manager.addPattern(args[1], args[2]);
        await manager.saveConfig();
        break;
        
      case 'add-keyword':
        if (args.length < 3) {
          console.error('使用方法: add-keyword <category> <keyword>');
          process.exit(1);
        }
        await manager.createBackup();
        manager.addKeyword(args[1], args[2]);
        await manager.saveConfig();
        break;
        
      case 'backup':
        await manager.createBackup();
        break;
        
      case 'validate':
        const isValid = manager.validatePatterns();
        process.exit(isValid ? 0 : 1);
        break;
        
      default:
        console.log('📖 メタ概念パターン管理ツール');
        console.log('==============================');
        console.log('使用可能なコマンド:');
        console.log('  show          - 現在の設定を表示');
        console.log('  add-pattern   - パターンを追加');
        console.log('  add-keyword   - キーワードを追加');
        console.log('  backup        - バックアップを作成');
        console.log('  validate      - パターンの検証');
        console.log('');
        console.log('例:');
        console.log('  node scripts/update-meta-patterns.ts show');
        console.log('  node scripts/update-meta-patterns.ts add-pattern ai_self_observation "新しい.*パターン"');
        break;
    }
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

// ES Module対応
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export { MetaPatternManager };