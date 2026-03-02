import { createComponent, Show, Switch, Match } from '@liteforge/runtime';
import type { Signal } from '@liteforge/core';
import type { BenchStatus } from './bench-utils.js';

interface BenchmarkCardProps {
  title: string;
  description: string;
  status: Signal<BenchStatus>;
  children?: Node | Node[];
}

const StatusBadge = createComponent<{ status: Signal<BenchStatus> }>({
  name: 'StatusBadge',
  component({ props }) {
    return (
      <span>
        {Switch({
          children: [
            Match({
              when: () => props.status() === 'idle',
              children: () => (
                <span class="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                  idle
                </span>
              ),
            }),
            Match({
              when: () => props.status() === 'running',
              children: () => (
                <span class="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 animate-pulse">
                  running
                </span>
              ),
            }),
            Match({
              when: () => props.status() === 'complete',
              children: () => (
                <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  complete
                </span>
              ),
            }),
            Match({
              when: () => props.status() === 'error',
              children: () => (
                <span class="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  error
                </span>
              ),
            }),
          ],
        })}
      </span>
    );
  },
});

export const BenchmarkCard = createComponent<BenchmarkCardProps>({
  name: 'BenchmarkCard',
  component({ props }) {
    return (
      <div class="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden mb-6">
        {/* Header */}
        <div class="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white">{props.title}</h3>
            <p class="text-sm text-neutral-400 mt-0.5">{props.description}</p>
          </div>
          <StatusBadge status={props.status} />
        </div>
        
        {/* Content */}
        <div class="p-5">
          {props.children}
        </div>
      </div>
    );
  },
});

/**
 * Reusable config select component
 */
interface ConfigSelectProps<T extends number | string> {
  label: string;
  options: T[];
  value: Signal<T>;
  formatOption?: (opt: T) => string;
}

let selectIdCounter = 0;

export const ConfigSelect = createComponent<ConfigSelectProps<number>>({
  name: 'ConfigSelect',
  component({ props }) {
    const formatFn = props.formatOption ?? ((n: number) => n.toLocaleString());
    const selectId = `bench-select-${++selectIdCounter}`;
    
    // Note: Testing if LiteForge handles reactive value on <select>
    // If this doesn't work correctly, it's a framework bug
    return (
      <div class="flex items-center gap-2">
        <label for={selectId} class="text-xs text-neutral-500">{props.label}</label>
        <select
          id={selectId}
          class="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm text-white focus:border-indigo-500 focus:outline-none"
          value={() => String(props.value())}
          onchange={(e: Event) => {
            const val = Number((e.target as HTMLSelectElement).value);
            props.value.set(val);
          }}
        >
          {props.options.map(opt => (
            <option value={opt}>{formatFn(opt)}</option>
          ))}
        </select>
      </div>
    );
  },
});

/**
 * Run button component
 */
interface RunButtonProps {
  onclick: () => void;
  disabled?: boolean | (() => boolean);
  children?: Node | string;
}

export const RunButton = createComponent<RunButtonProps>({
  name: 'RunButton',
  component({ props }) {
    const isDisabled = typeof props.disabled === 'function' 
      ? props.disabled 
      : () => props.disabled ?? false;
    
    return (
      <button
        type="button"
        class={() => `px-4 py-2 rounded-md font-medium text-sm transition-colors ${
          isDisabled() 
            ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
        }`}
        disabled={isDisabled()}
        onclick={props.onclick}
      >
        {props.children ?? 'Run Benchmark'}
      </button>
    );
  },
});

/**
 * Results table component
 */
interface ResultsTableProps {
  headers: string[];
  rows: Signal<string[][]>;
}

export const ResultsTable = createComponent<ResultsTableProps>({
  name: 'ResultsTable',
  component({ props }) {
    return (
      <div class="mt-4 overflow-x-auto">
        {Show({
          when: () => props.rows().length > 0,
          children: () => (
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-neutral-800">
                  {props.headers.map(header => (
                    <th class="text-left px-3 py-2 text-xs text-neutral-500 font-medium uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {() => props.rows().map(row => (
                  <tr class="border-b border-neutral-800/50 last:border-0">
                    {row.map((cell, i) => (
                      <td class={`px-3 py-2 ${i === 0 ? 'text-neutral-300' : 'font-mono text-indigo-300'}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ),
          fallback: () => (
            <p class="text-sm text-neutral-500 italic">No results yet. Click "Run Benchmark" to start.</p>
          ),
        })}
      </div>
    );
  },
});
