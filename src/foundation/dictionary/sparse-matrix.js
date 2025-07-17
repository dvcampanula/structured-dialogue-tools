/**
 * SparseCooccurrenceMatrix - 疎行列による共起行列の実装
 *
 * 大規模な共起データを効率的に格納し、メモリ使用量を削減します。
 * 語彙を数値IDにマッピングし、MapのMap構造で非ゼロ要素のみを保持します。
 */
export class SparseCooccurrenceMatrix {
  constructor() {
    this.rows = new Map(); // Map<rowId: number, Map<colId: number, count: number>>
    this.termToId = new Map(); // Map<term: string, id: number>
    this.idToTerm = new Map(); // Map<id: number, term: string>
    this.nextId = 0;
    this.size = 0; // 非ゼロ要素の数
  }

  /**
   * 語彙を数値IDにマッピングします。
   * @param {string} term - 語彙
   * @returns {number} 語彙ID
   */
  getTermId(term) {
    if (!this.termToId.has(term)) {
      const id = this.nextId++;
      this.termToId.set(term, id);
      this.idToTerm.set(id, term);
      return id;
    }
    return this.termToId.get(term);
  }

  /**
   * 語彙IDから語彙を取得します。
   * @param {number} id - 語彙ID
   * @returns {string} 語彙
   */
  getTermById(id) {
    return this.idToTerm.get(id);
  }

  /**
   * 共起カウントを設定します。
   * @param {string} term1 - 語彙1
   * @param {string} term2 - 語彙2
   * @param {number} count - 共起カウント
   */
  set(term1, term2, count) {
    const id1 = this.getTermId(term1);
    const id2 = this.getTermId(term2);

    // 常に小さいIDをrowId、大きいIDをcolIdとする
    const rowId = Math.min(id1, id2);
    const colId = Math.max(id1, id2);

    if (!this.rows.has(rowId)) {
      this.rows.set(rowId, new Map());
    }
    const colMap = this.rows.get(rowId);

    if (!colMap.has(colId)) {
      this.size++; // 新しい非ゼロ要素が追加された
    }
    colMap.set(colId, count);
  }

  /**
   * 共起カウントを取得します。
   * @param {string} term1 - 語彙1
   * @param {string} term2 - 語彙2
   * @returns {number} 共起カウント
   */
  get(term1, term2) {
    const id1 = this.termToId.get(term1);
    const id2 = this.termToId.get(term2);

    if (id1 === undefined || id2 === undefined) {
      return 0;
    }

    const rowId = Math.min(id1, id2);
    const colId = Math.max(id1, id2);

    const colMap = this.rows.get(rowId);
    return colMap ? colMap.get(colId) || 0 : 0;
  }

  /**
   * 行（語彙ID）に紐づくすべての共起ペアを反復処理します。
   * @param {number} rowId - 行の語彙ID
   * @returns {IterableIterator<[string, number]>} [共起語彙, カウント] のイテレータ
   */
  *getCooccurrencesByRowId(rowId) {
    const colMap = this.rows.get(rowId);
    if (colMap) {
      for (const [colId, count] of colMap.entries()) {
        yield [this.getTermById(colId), count];
      }
    }
  }

  /**
   * すべての非ゼロ要素を反復処理します。
   * @returns {IterableIterator<[string, string, number]>} [語彙1, 語彙2, カウント] のイテレータ
   */
  *[Symbol.iterator]() {
    for (const [rowId, colMap] of this.rows.entries()) {
      const term1 = this.getTermById(rowId);
      for (const [colId, count] of colMap.entries()) {
        const term2 = this.getTermById(colId);
        yield [term1, term2, count];
      }
    }
  }

  /**
   * 行列をクリアします。
   */
  clear() {
    this.rows.clear();
    this.termToId.clear();
    this.idToTerm.clear();
    this.nextId = 0;
    this.size = 0;
  }

  /**
   * 行列内のユニークな語彙の数を返します。
   * @returns {number} ユニークな語彙の数
   */
  get vocabularySize() {
    return this.termToId.size;
  }
}
