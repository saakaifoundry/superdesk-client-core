import {EditorState, Modifier, SelectionState} from 'draft-js';
import {getHighlights, highlightTypes} from '.';

/**
 * @name redrawHighlights
 * @description Resets the highlights inline styles, returning a new editor state.
 * @param {EditorState} es
 * @returns {EditorState}
 */
export function redrawHighlights(newState) {
    let editorState = newState;
    let selection = editorState.getSelection();
    let cleanContent = removeInlineStyles(editorState.getCurrentContent());
    let {contentState, activeHighlight} = applyInlineStyles(cleanContent, selection);
    let selectionFunc = selection.getHasFocus() ? 'forceSelection' : 'acceptSelection';

    editorState = EditorState.set(editorState, {allowUndo: false});
    editorState = EditorState.push(editorState, contentState, 'change-inline-style');
    editorState = EditorState[selectionFunc](editorState, selection);
    editorState = EditorState.set(editorState, {allowUndo: true});

    return {editorState, activeHighlight};
}

/**
 * @name removeInlineStyle
 * @description Returns a new content state with all the styles indicated in `styles`
 * removed.
 * @param {ContentState} content
 * @param {Array<string>} styles Styles to remove.
 * @returns {ContentState}
 */
export function removeInlineStyles(content, styles = highlightTypes) {
    let contentState = content;
    let filterFn = (c) => styles.some((s) => c.hasStyle(s));

    contentState.getBlocksAsArray().forEach((b) => {
        b.findStyleRanges(filterFn,
            (start, end) => {
                const empty = SelectionState.createEmpty(b.getKey());
                const selection = empty.merge({anchorOffset: start, focusOffset: end});

                styles.forEach((s) => {
                    contentState = Modifier.removeInlineStyle(contentState, selection, s);
                });
            });
    });

    return contentState;
}

/**
 * @name applyInlineStyles
 * @description Applies inline styling where highlights exist in the given content state.
 * Additionally, it also highlights the active 'highlight', if a user selection is supplied.
 * @param {ContentState} contentState The content state from which to read the highlight
 * data and to which we apply the inline styling
 * @param {SelectionState} cursor The current selection. If this is set and it
 * overlaps with any other highlight, it will be highlighted as the active highlight.
 * @returns {StateWithHighlight} Returns the new content state along with the active highlight,
 * if one was selected.
 */
export function applyInlineStyles(content, cursor = null) {
    const data = getHighlights(content);

    if (data.isEmpty()) {
        return {contentState: content};
    }

    let contentState = content;
    let activeHighlight = null;

    data.mapKeys((rawSelection, highlight) => {
        const selection = new SelectionState(JSON.parse(rawSelection));

        if (activeHighlight === null && selectionIn(content, cursor, selection)) {
            activeHighlight = {selection: selection, data: highlight};
        }

        contentState = Modifier.applyInlineStyle(contentState, selection, highlight.type);
    });

    if (activeHighlight) {
        const selectedType = `${activeHighlight.data.type}_SELECTED`;
        const selection = activeHighlight.selection;

        contentState = Modifier.applyInlineStyle(contentState, selection, selectedType);
    }

    return {contentState, activeHighlight};
}

/**
 * @description Returns true if a is collapsed and is inside b.
 * @param {ContentState} content
 * @param {SelectionState} a
 * @param {SelectionState} b
 * @returns {boolean}
 */
function selectionIn(content, a, b) {
    if (a === null || !a.isCollapsed()) {
        return false;
    }

    const start = b.getStartOffset();
    const startKey = b.getStartKey();
    const end = b.getEndOffset();
    const endKey = b.getEndKey();

    if (startKey === endKey) {
        return a.hasEdgeWithin(startKey, start, end);
    }

    const key = a.getStartKey();
    const offset = a.getStartOffset();

    if (key === startKey && offset > start ||
        key === endKey && offset < end) {
        return true;
    }

    let k = startKey;

    // eslint-disable-next-line no-cond-assign
    while (k = content.getKeyAfter(k)) {
        if (k === endKey) {
            break;
        }
        if (k === key) {
            return true;
        }
    }

    return false;
}
