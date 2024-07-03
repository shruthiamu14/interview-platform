import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { basicSetup } from "codemirror";
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId }) => {
    const editorRef = useRef(null);
    const viewRef = useRef(null);

    useEffect(() => {
        if (editorRef.current) {
            const startState = EditorState.create({
                doc: "// Start coding...\n",
                extensions: [
                    basicSetup,
                    javascript(),
                    oneDark,
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            const code = update.state.doc.toString();
                            console.log('Code changed:', code);
                            if (socketRef.current) {
                                console.log('Emitting code change');
                                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                                    roomId,
                                    code,
                                });
                            }
                        }
                    })
                ],
            });

            const view = new EditorView({
                state: startState,
                parent: editorRef.current,
            });

            viewRef.current = view;

            return () => {
                view.destroy();
            };
        }
    }, [socketRef, roomId]);

    useEffect(() => {
        const handleCodeChange = ({ code }) => {
            const view = viewRef.current;
            if (view) {
                const currentDoc = view.state.doc.toString();
                if (code !== currentDoc) {
                    const transaction = view.state.update({
                        changes: { from: 0, to: currentDoc.length, insert: code }
                    });
                    view.update([transaction]);
                }
            }
        };
    
        const socket = socketRef.current;
        if (socket) {
            socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
            return () => socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
        }
    }, [socketRef.current]);

    return <div ref={editorRef} style={{ height: "500px" }} />;
};

export default Editor;