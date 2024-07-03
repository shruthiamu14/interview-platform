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
        if (socketRef.current) {
            const handleCodeChange = ({ code }) => {
                const view = viewRef.current;
                console.log('Received code change:', code);
                if (view && code !== view.state.doc.toString()) {
                    console.log('Updating editor with new code');
                    view.dispatch({
                        changes: { from: 0, to: view.state.doc.length, insert: code },
                    });
                }
            };

            socketRef.current.on(ACTIONS.CODE_CHANGE, handleCodeChange);

            return () => {
                socketRef.current.off(ACTIONS.CODE_CHANGE, handleCodeChange);
            };
        }
    }, [socketRef]);

    return <div ref={editorRef} style={{ height: "500px" }} />;
};

export default Editor;
