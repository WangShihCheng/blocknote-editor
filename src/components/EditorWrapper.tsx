import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import "katex/dist/katex.min.css";
import { memo, useEffect } from "react";
import { getMathSchema, mathSlashItems } from "../math-blocks";
import { zhTW } from "../i18n/zh-TW";
import { filterSuggestionItems, countChars, uploadFile } from "../utils/helpers";

export const EditorWrapper = memo(function EditorWrapper({
  initialContent, isDark, onContentChange, onCharCount,
}: {
  initialContent: any[];
  isDark: boolean;
  onContentChange: (c: any[]) => void;
  onCharCount: (n: number) => void;
}) {
  const editor = useCreateBlockNote({ schema: getMathSchema(), initialContent, uploadFile, dictionary: zhTW } as any);
  useEffect(() => {
    onCharCount(countChars(editor.document as any));
    return editor.onChange(() => {
      onContentChange(editor.document as any);
      onCharCount(countChars(editor.document as any));
    });
  }, [editor]);
  return (
    <BlockNoteView editor={editor} theme={isDark ? "dark" : "light"} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems(
            [
              ...(getDefaultReactSlashMenuItems(editor) as any[]),
              ...mathSlashItems(editor),
            ],
            query
          ) as any
        }
      />
    </BlockNoteView>
  );
});
