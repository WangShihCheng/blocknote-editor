import { zhTW as blocknoteZhTW } from "@blocknote/core/locales";

// 以官方 zhTW locale 為 base，僅覆蓋需要微調的字串
export const zhTW: typeof blocknoteZhTW = {
  ...blocknoteZhTW,
  placeholders: {
    ...blocknoteZhTW.placeholders,
    default: '輸入「/」插入內容…',
  },
  generic: {
    ctrl_shortcut: 'Ctrl',
  },
};
