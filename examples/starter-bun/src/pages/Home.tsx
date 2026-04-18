import { defineComponent, signal } from 'liteforge'
import { createForm } from '@liteforge/form'
import { toast } from '@liteforge/toast'
import { Link } from '@liteforge/router'

export const HomePage = defineComponent({
  component() {
    const count = signal(0)

    const form = createForm({
      initial: { name: '' },
      onSubmit(values) {
        toast.show({ message: `Hello, ${values.name}!`, type: 'success' })
        form.reset()
      },
    })

    return (
      <div class="page">
        <h1>LiteForge + Bun</h1>

        <section>
          <h2>Counter</h2>
          <p>Count: {() => count()}</p>
          <button onclick={() => count.update(n => n + 1)}>+1</button>
        </section>

        <section>
          <h2>Form</h2>
          <form onsubmit={(e: Event) => { e.preventDefault(); form.submit() }}>
            <input
              type="text"
              placeholder="Your name"
              value={() => form.field('name').value()}
              oninput={(e: Event) => form.field('name').set((e.target as HTMLInputElement).value)}
            />
            <button type="submit">Say Hello</button>
          </form>
        </section>

        <nav>
          <Link to="/about">About →</Link>
        </nav>
      </div>
    )
  },
})
