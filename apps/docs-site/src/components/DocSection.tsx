import { createComponent } from 'liteforge';

export interface DocSectionProps {
  title: string | (() => string);
  description?: string | (() => string);
  id?: string;
  /** Constrain the title and description to ~740px for readability (default: true).
   *  Children always render at full width. */
  proseWidth?: boolean;
  children?: Node | Node[];
}

function resolve(v: string | (() => string)): string {
  return typeof v === 'function' ? v() : v;
}

export const DocSection = createComponent<DocSectionProps>({
  name: 'DocSection',
  component({ props }) {
    const narrow = props.proseWidth !== false;
    const proseStyle = narrow ? 'max-width:740px' : '';

    return (
      <section id={props.id} class="py-8 border-b border-[var(--line-default)] last:border-0">
        <div class="flex items-center gap-2 mb-2" style={proseStyle}>
          <h2 class="text-xl font-semibold text-[var(--content-primary)]">{() => resolve(props.title)}</h2>
          {props.id !== undefined
            ? <a
                href={`#${props.id}`}
                class="text-[var(--content-subtle)] hover:text-indigo-400 transition-colors text-sm"
                aria-label={() => `Link to ${resolve(props.title)}`}
              >#</a>
            : null}
        </div>
        {props.description !== undefined
          ? <p class="text-[var(--content-secondary)] text-sm leading-relaxed mb-4" style={proseStyle}>{() => resolve(props.description!)}</p>
          : null}
        {props.children}
      </section>
    );
  },
});
