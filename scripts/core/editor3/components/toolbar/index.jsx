import React, {Component} from 'react';
import PropTypes from 'prop-types';
import BlockStyleButtons from './BlockStyleButtons';
import InlineStyleButtons from './InlineStyleButtons';
import TableControls from './TableControls';
import {SelectionButton} from './SelectionButton';
import {IconButton} from './IconButton';
import {LinkInput} from '../links';
import {EmbedButton} from '../embeds';
import {connect} from 'react-redux';
import {LinkToolbar} from '../links';
import {CommentInput} from '../comments';
import classNames from 'classnames';
import * as actions from '../../actions';

/**
 * @ngdoc React
 * @module superdesk.core.editor3
 * @name Toolbar
 * @param {boolean} disabled Disables clicking on the toolbar, if true.
 * @description Holds the editor's toolbar.
 */
class ToolbarComponent extends Component {
    constructor(props) {
        super(props);

        this.scrollContainer = $(props.scrollContainer || window);

        this.onScroll = this.onScroll.bind(this);
        this.showLinkInput = this.showLinkInput.bind(this);
        this.hideLinkInput = this.hideLinkInput.bind(this);
        this.showCommentInput = this.showCommentInput.bind(this);
        this.hideCommentInput = this.hideCommentInput.bind(this);

        this.state = {
            // If non-null, it contains the link that is currently being edited
            // (or empty for a new link) and the popup is shown.
            editedLink: null,

            // If non-null, contains a DraftJS SelectionState where a comment
            // needs to be added (the popup is displayed).
            selectionForComment: null,

            // When true, the toolbar is floating at the top of the item. This
            // helps the toolbar continue to be visible when it goes out of view
            // because of scrolling.
            floating: false
        };
    }

    /**
     * @ngdoc method
     * @name Toolbar#onScroll
     * @description Triggered when the authoring page is scrolled. It adjusts toolbar
     * style, based on the location of the editor within the scroll container.
     */
    onScroll(e) {
        const editorRect = this.props.editorNode.getBoundingClientRect();
        const pageRect = this.scrollContainer[0].getBoundingClientRect();

        if (!editorRect || !pageRect) {
            return;
        }

        const isToolbarOut = editorRect.top < pageRect.top + 50;
        const isBottomOut = editorRect.bottom < pageRect.top + 60;
        const floating = isToolbarOut && !isBottomOut;

        if (floating !== this.state.floating) {
            this.setState({floating});
        }
    }

    /**
     * @ngdoc method
     * @name Toolbar#hideLinkInput
     * @description Hides the link input.
     */
    hideLinkInput() {
        this.setState({editedLink: null});
    }

    /**
     * @ngdoc method
     * @name Toolbar#showLinkInput
     * @param {Event} e
     * @param {Object} link object to edit
     * existing link.
     * @description Shows the link input box.
     */
    showLinkInput(link) {
        const isNewLink = !link;
        const isCollapsed = this.props.editorState.getSelection().isCollapsed();

        // only add new links if there is a selection
        if (isNewLink && isCollapsed) {
            return;
        }

        this.setState({editedLink: link});
    }

    showCommentInput(selection) {
        this.setState({selectionForComment: selection});
    }

    hideCommentInput() {
        this.setState({selectionForComment: null});
    }

    componentDidMount() {
        this.scrollContainer.on('scroll', this.onScroll);
    }

    componentWillUnmount() {
        this.scrollContainer.off('scroll', this.onScroll);
    }

    render() {
        const {floating} = this.state;
        const {
            disabled,
            editorFormat,
            activeCell,
            applyLink,
            editorState,
            applyComment,
            addTable,
            insertImages,
            allowsHighlights,
        } = this.props;

        const {editedLink, selectionForComment} = this.state;
        const has = (opt) => editorFormat.indexOf(opt) > -1;

        const cx = classNames({
            'Editor3-controls': true,
            'floating-toolbar': floating,
            disabled: disabled
        });

        return activeCell !== null ? <TableControls /> :
            <div className={cx}>
                <BlockStyleButtons />
                <InlineStyleButtons />

                {has('anchor') &&
                    <SelectionButton
                        onClick={this.showLinkInput}
                        iconName="link"
                        tooltip={gettext('Link')}
                    />}

                {editedLink !== null &&
                    <LinkInput
                        editorState={editorState}
                        onSubmit={applyLink}
                        onCancel={this.hideLinkInput}
                        value={editedLink} />}

                {has('embed') && <EmbedButton />}
                {has('picture') &&
                    <IconButton
                        onClick={insertImages}
                        tooltip={gettext('Image')}
                        iconName="picture"
                    />
                }
                {has('table') &&
                    <IconButton
                        onClick={addTable}
                        tooltip={gettext('Table')}
                        iconName="table"
                    />
                }

                {allowsHighlights && [
                    <SelectionButton
                        onClick={this.showCommentInput}
                        key="comment-button"
                        iconName="comment"
                        tooltip={gettext('Add comment')}
                    />,
                    <SelectionButton
                        onClick={this.showCommentInput}
                        key="annotation-button"
                        iconName="pencil"
                        tooltip={gettext('Add annotation')}
                    />
                ]}

                {selectionForComment !== null &&
                    <CommentInput
                        onSubmit={(msg) => applyComment(selectionForComment, msg)}
                        onCancel={this.hideCommentInput} />}

                {/* LinkToolbar must be the last node. */}
                <LinkToolbar onEdit={this.showLinkInput} />
            </div>;
    }
}

ToolbarComponent.propTypes = {
    disabled: PropTypes.bool,
    allowsHighlights: PropTypes.bool,
    editorFormat: PropTypes.array,
    activeCell: PropTypes.any,
    applyLink: PropTypes.func,
    addTable: PropTypes.func,
    insertImages: PropTypes.func,
    applyComment: PropTypes.func,
    editorState: PropTypes.object,
    editorNode: PropTypes.object,
    scrollContainer: PropTypes.string
};

const mapStateToProps = ({editorFormat, editorState, activeCell, allowsHighlights}) => ({
    editorFormat, editorState, activeCell, allowsHighlights
});

const mapDispatchToProps = (dispatch) => ({
    applyLink: (link, entity = null) => dispatch(actions.applyLink({link, entity})),
    applyComment: (sel, msg) => dispatch(actions.applyComment(sel, msg)),
    insertImages: () => dispatch(actions.insertImages()),
    addTable: () => dispatch(actions.addTable(1, 2))
});

const Toolbar = connect(mapStateToProps, mapDispatchToProps)(ToolbarComponent);

export default Toolbar;
