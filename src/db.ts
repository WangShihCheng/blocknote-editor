import Dexie, { type Table } from 'dexie'

export interface Doc {
  id: string
  title: string
  content: any[]   // BlockNote blocks 陣列（不序列化成 JSON string）
  createdAt: Date
  updatedAt: Date
  order: number    // 拖曳排序依據
}

export class AppDB extends Dexie {
  documents!: Table<Doc>

  constructor() {
    super('blocknote-db')
    this.version(1).stores({
      documents: 'id, updatedAt, order', // id = 主鍵（字串，非自增）
    })
  }
}

export const db = new AppDB()
