// No imports — pure string constants

export const SIGNAL_CODE = `import { signal } from 'liteforge';

const count = signal(0);

count();            // read → 0
count.set(5);       // write → 5
count.update(n => n + 1);  // functional update → 6`;

export const COMPUTED_CODE = `import { signal, computed } from 'liteforge';

const firstName = signal('Anna');
const lastName  = signal('Müller');

// Automatically tracks firstName and lastName
const fullName = computed(() => \`\${firstName()} \${lastName()}\`);

fullName();  // → 'Anna Müller'

firstName.set('Maria');
fullName();  // → 'Maria Müller' (re-computed lazily)`;

export const EFFECT_CODE = `import { signal, effect } from 'liteforge';

const user = signal<{ name: string; role: string } | null>(null);

// Runs once immediately, then re-runs whenever user() changes
const dispose = effect(() => {
  if (user() !== null) {
    document.title = \`Welcome, \${user()?.name}\`;
  }
});

user.set({ name: 'Anna', role: 'admin' });
// → document.title = 'Welcome, Anna'

dispose(); // stop the effect`;

export const BATCH_CODE = `import { signal, effect, batch } from 'liteforge';

const firstName = signal('Anna');
const lastName  = signal('Müller');

effect(() => {
  // Without batch: this would run twice (once per set)
  console.log(firstName(), lastName());
});

// With batch: effect runs exactly once after both updates
batch(() => {
  firstName.set('Maria');
  lastName.set('Schmidt');
});
// → logs 'Maria Schmidt' once`;

export const COUNTER_CODE = `const count = signal(0);
const doubled = computed(() => count() * 2);

<button onclick={() => count.update(n => n + 1)}>Increment</button>
<span>{() => \`count = \${count()},  doubled = \${doubled()}\`}</span>`;

export const FULLNAME_CODE = `const firstName = signal('Anna');
const lastName  = signal('Müller');
const fullName  = computed(() => \`\${firstName()} \${lastName()}\`);

<input value={() => firstName()} oninput={e => firstName.set(e.target.value)} />
<input value={() => lastName()}  oninput={e => lastName.set(e.target.value)}  />
<p>{() => fullName()}</p>`;
