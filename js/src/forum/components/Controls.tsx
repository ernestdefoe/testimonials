import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import Icon from 'flarum/common/components/Icon';
import classList from 'flarum/common/utils/classList';
import type Mithril from 'mithril';
import type Testimonial from '../Testimonial';
import { alertError, changed, moderate, t, tx } from '../util';
import { openShare } from '../share';

interface Attrs {
  row: Testimonial;
}

/**
 * The ⋯ menu on a card: what this viewer may do to it (feature, order, edit, decline, take down).
 *
 * Its own small menu rather than core's Dropdown: that one closes through Bootstrap and, where the
 * browser has it, a CloseWatcher, and in Safari the menu closed before a click on an item landed,
 * so nothing happened. Here an item runs on its own click, then the menu closes.
 */
export default class Controls extends Component<Attrs> {
  open = false;
  private outside = (e: Event) => {
    if (this.open && this.element && !this.element.contains(e.target as Node)) this.close();
  };
  private keys = (e: KeyboardEvent) => {
    if (this.open && e.key === 'Escape') {
      this.close();
      (this.element?.querySelector('.TestimonialControls-toggle') as HTMLElement | null)?.focus();
    }
  };

  oncreate(vnode: Mithril.VnodeDOM<Attrs, this>) {
    super.oncreate(vnode);
    document.addEventListener('pointerdown', this.outside, true);
    document.addEventListener('keydown', this.keys);
  }

  onremove(vnode: Mithril.VnodeDOM<Attrs, this>) {
    super.onremove(vnode);
    document.removeEventListener('pointerdown', this.outside, true);
    document.removeEventListener('keydown', this.keys);
  }

  close(): void {
    this.open = false;
    m.redraw();
  }

  /** Runs an item: closes the menu first, so the card can change under it without a stale menu. */
  run(fn: () => unknown): void {
    this.open = false;
    fn();
    m.redraw();
  }

  items(): Mithril.Children[] {
    const row = this.attrs.row;
    // moderate() shows the error and refreshes everything on success.
    const act =
      (action: string, extra: Record<string, unknown> = {}) =>
      () =>
        moderate(row, action, extra).catch(() => {});
    const items: Mithril.Children[] = [];
    const item = (icon: string, label: Mithril.Children, fn: () => unknown) => (
      <li role="none">
        <Button className="TestimonialControls-item" role="menuitem" icon={icon} onclick={() => this.run(fn)}>
          {label}
        </Button>
      </li>
    );

    if (row.canModerate() && row.status() === 'approved') {
      items.push(
        row.isFeatured() ? item('far fa-star', t('controls.unfeature'), act('unfeature')) : item('fas fa-star', t('controls.feature'), act('feature'))
      );
      if (row.isFeatured()) {
        items.push(item('fas fa-arrow-up', t('controls.move_up'), act('up')), item('fas fa-arrow-down', t('controls.move_down'), act('down')));
      }
    }
    if (row.canEdit() || row.canEditWording()) {
      items.push(item('fas fa-pen', row.canEdit() ? t('controls.edit') : t('controls.edit_wording'), () => openShare({ testimonial: row })));
    }
    if (row.canHide()) {
      items.push(
        item(
          row.hiddenByAuthor() ? 'fas fa-eye' : 'fas fa-eye-slash',
          row.hiddenByAuthor() ? t('controls.show_depot') : t('controls.hide_depot'),
          () =>
            (row as any)
              .save({ hiddenByAuthor: !row.hiddenByAuthor() }, { errorHandler: alertError })
              .then(() => changed())
              .catch(() => {})
              .finally(() => m.redraw())
        )
      );
    }
    if (row.canModerate() && row.status() !== 'declined' && row.status() !== 'removed') {
      items.push(
        item('fas fa-xmark', t('controls.decline'), () => {
          const reason = window.prompt(tx('controls.decline_prompt'));
          if (reason !== null) act('decline', { reason })();
        })
      );
    }
    if (row.canRemove()) {
      items.push(
        item('fas fa-trash-can', t('controls.remove'), () => {
          if (window.confirm(tx('controls.remove_confirm'))) act('remove')();
        })
      );
    }
    if (row.canRestore()) items.push(item('fas fa-rotate-left', t('controls.restore'), act('restore')));
    return items;
  }

  view() {
    const items = this.items();
    if (!items.length) return null;
    const label = tx('controls.label');
    return (
      <div className={classList('ButtonGroup Dropdown TestimonialControls', this.open && 'open')}>
        <button
          type="button"
          className="TestimonialControls-toggle Button Button--icon Button--flat"
          aria-haspopup="menu"
          aria-expanded={this.open ? 'true' : 'false'}
          aria-label={label}
          title={label}
          onclick={() => {
            this.open = !this.open;
          }}
        >
          <Icon name="fas fa-ellipsis-h" className="Button-icon" />
        </button>
        {this.open ? (
          <ul className="Dropdown-menu Dropdown-menu--right TestimonialControls-menu" role="menu">
            {items}
          </ul>
        ) : null}
      </div>
    );
  }
}
