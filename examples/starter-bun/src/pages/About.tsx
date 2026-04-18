import { defineComponent } from 'liteforge'
import { Link } from '@liteforge/router'

export const AboutPage = defineComponent({
  component() {
    return (
      <div class="page">
        <h1>About</h1>
        <p>Built with LiteForge + Bun native bundler.</p>
        <nav>
          <Link to="/">← Home</Link>
        </nav>
      </div>
    )
  },
})
