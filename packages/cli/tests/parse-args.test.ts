import { describe, it, expect } from 'vitest'
import { parseArgs, CliParseError } from '../src/parse-args.js'

describe('parseArgs', () => {
  it('parses the dev command with no flags', () => {
    const cmd = parseArgs(['dev'])
    expect(cmd.name).toBe('dev')
    expect(cmd.flags).toEqual({})
  })

  it('parses --port <n> as a string value', () => {
    const cmd = parseArgs(['dev', '--port', '4000'])
    expect(cmd.flags['port']).toBe('4000')
  })

  it('parses --port=<n> (equals form)', () => {
    const cmd = parseArgs(['dev', '--port=4000'])
    expect(cmd.flags['port']).toBe('4000')
  })

  it('treats --flag without value as boolean true', () => {
    const cmd = parseArgs(['build', '--minify'])
    expect(cmd.flags['minify']).toBe(true)
  })

  it('parses --no-flag as boolean false', () => {
    const cmd = parseArgs(['build', '--no-minify'])
    expect(cmd.flags['minify']).toBe(false)
  })

  it('parses mixed flags', () => {
    const cmd = parseArgs(['build', '--out-dir', './out', '--no-minify', '--entry', 'app.ts'])
    expect(cmd.flags).toEqual({
      'out-dir': './out',
      minify: false,
      entry: 'app.ts',
    })
  })

  it('throws CliParseError for unknown command', () => {
    expect(() => parseArgs(['unknown'])).toThrow(CliParseError)
    try {
      parseArgs(['unknown'])
    } catch (err) {
      expect(err).toBeInstanceOf(CliParseError)
      expect((err as CliParseError).helpRequested).toBe(true)
    }
  })

  it('throws when no command given', () => {
    expect(() => parseArgs([])).toThrow(CliParseError)
  })

  it('throws on unexpected positional after command', () => {
    expect(() => parseArgs(['dev', 'leftover'])).toThrow(CliParseError)
  })

  it('accepts all three known commands', () => {
    expect(parseArgs(['dev']).name).toBe('dev')
    expect(parseArgs(['build']).name).toBe('build')
    expect(parseArgs(['start']).name).toBe('start')
  })
})
