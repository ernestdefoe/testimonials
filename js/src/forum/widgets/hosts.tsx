import app from 'flarum/forum/app';
import { fof, hasFofWidgets, placed } from '../../common/fofWidgets';
import TestimonialsWidget, { type Kind } from './Widget';
import { bespokeSchema } from './settings';

/*
 * Offers the four widgets to every widget host that is present: fof/forum-widgets-core, Bespoke
 * and Page Builder. None is a build-time import; each is found at runtime, so the bundle is the
 * same with all three installed or none. Registering is not placing: the stock spots stand down
 * only for a mounted copy (placement.ts).
 */

export const EXT = 'ernestdefoe-testimonials';

export const WIDGETS: Array<{ kind: Kind; key: string; icon: string; zones: string[] }> = [
  { kind: 'carousel', key: 'testimonialsCarousel', icon: 'fas fa-quote-left', zones: ['hero', 'top', 'above-list', 'below-list', 'footer'] },
  { kind: 'wall', key: 'testimonialsWall', icon: 'fas fa-table-cells-large', zones: ['top', 'above-list', 'below-list', 'footer'] },
  { kind: 'spotlight', key: 'testimonialsSpotlight', icon: 'fas fa-star', zones: ['hero', 'top', 'sidebar', 'footer'] },
  { kind: 'rating', key: 'testimonialsRating', icon: 'fas fa-chart-simple', zones: ['sidebar', 'above-list', 'footer'] },
];

const titleKey = (kind: Kind) => `${EXT}.lib.widget.${kind}_title`;

export function registerHosts(): void {
  for (const register of [registerFof, registerBespoke, registerPageBuilder]) {
    try {
      register();
    } catch (e) {
      // A host whose internals moved must not take the forum's JS down with it.
      console.warn('[testimonials] widget host registration failed', e);
    }
  }
}

function registerFof(): void {
  if (!hasFofWidgets()) return;
  const Widgets = fof('common/extend/Widgets');
  const WidgetBase = fof('common/components/Widget');
  if (!Widgets || !WidgetBase || !(app as any).widgets) return;

  const add = new Widgets();
  WIDGETS.forEach(({ kind, key, icon }, position) => {
    class FofTestimonials extends WidgetBase {
      className() {
        return `TestimonialsFofWidget TestimonialsFofWidget--${kind}`;
      }
      icon() {
        return icon;
      }
      title() {
        return app.translator.trans(titleKey(kind));
      }
      content() {
        return <TestimonialsWidget kind={kind} host="fof" bare />;
      }
    }
    add.add({
      key,
      component: FofTestimonials,
      // 🚨 Opt-in: shown only where the admin placed it in FoF's layout editor.
      isDisabled: () => !placed(app, EXT, key),
      isUnique: true,
      placement: kind === 'rating' || kind === 'spotlight' ? 'end' : 'top',
      position,
    });
  });
  add.extend(app, EXT);
}

function registerBespoke(): void {
  const flarum = (globalThis as any).flarum;
  if (!flarum?.extensions || !('ernestdefoe-bespoke' in flarum.extensions)) return;

  // The queue is drained on every registry lookup, so initializer order doesn't matter.
  // Labels are keys, never trans() output (Bespoke calls string methods on them).
  const queue = ((globalThis as any).BespokeWidgetQueue = (globalThis as any).BespokeWidgetQueue || []);
  WIDGETS.forEach(({ kind, icon, zones }) =>
    queue.push({
      type: `testimonials-${kind}`,
      label: titleKey(kind),
      icon,
      zones,
      schema: bespokeSchema(kind),
      component: { view: (vnode: any) => <TestimonialsWidget kind={kind} host="bespoke" settings={vnode.attrs?.settings || {}} /> },
    })
  );
}

function registerPageBuilder(): void {
  const pb = (app as any).pageBuilder;
  if (!pb?.registerBlock) return;

  // Match Widget\*Block::type().
  WIDGETS.forEach(({ kind }) =>
    pb.registerBlock(`testimonials-${kind}`, {
      view: (vnode: any) => <TestimonialsWidget kind={kind} host="page-builder" settings={vnode.attrs?.settings || {}} />,
    })
  );
}
