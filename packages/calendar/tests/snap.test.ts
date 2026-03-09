import { describe, it, expect } from 'vitest'
import { snapToSlot } from '../src/utils/snap.js'

// slotHeight = Math.round((slotDuration / 30) * 40)
// pixelsPerMinute = slotHeight / slotDuration
// For slotDuration=30: slotHeight=40, ppm=40/30≈1.333
// For slotDuration=15: slotHeight=20, ppm=20/15≈1.333
// For slotDuration=60: slotHeight=80, ppm=80/60≈1.333
// Note: ppm is always 40/30 = 4/3 regardless of slotDuration

const ppm = (slotDuration: number) => {
  const slotHeight = Math.round((slotDuration / 30) * 40)
  return slotHeight / slotDuration
}

describe('snapToSlot', () => {
  describe('15-minute interval', () => {
    const snap = 15
    const dayStart = 8 * 60   // 480
    const dayEnd   = 20 * 60  // 1200
    const pp = ppm(snap)

    it('snaps deltaY=0 to dayStart', () => {
      const r = snapToSlot(0, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(dayStart)
      expect(r.time).toBe('08:00')
    })

    it('snaps exactly one slot down', () => {
      // deltaY = 1 slot = slotHeight pixels
      const slotHeight = Math.round((snap / 30) * 40)
      const r = snapToSlot(slotHeight, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(dayStart + snap) // 480 + 15 = 495
      expect(r.time).toBe('08:15')
    })

    it('rounds to nearest slot (midpoint rounds up)', () => {
      // 7.5 minutes worth of pixels → should snap to 15
      const halfSlot = Math.round((snap / 30) * 40) / 2
      const r = snapToSlot(halfSlot, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(dayStart + snap) // rounds up at midpoint
    })

    it('rounds down when below midpoint', () => {
      // 7.4 minutes of pixels → should snap to 0 (stay at dayStart)
      const justBelowHalf = (Math.round((snap / 30) * 40) / 2) - 1
      const r = snapToSlot(justBelowHalf, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(dayStart)
    })

    it('returns correct HH:MM time string', () => {
      // 2 hours (8 slots of 15min) from dayStart=08:00 → 10:00
      const slotHeight = Math.round((snap / 30) * 40)
      const r = snapToSlot(slotHeight * 8, pp, snap, dayStart, dayEnd)
      expect(r.time).toBe('10:00')
    })

    it('pads hours and minutes with leading zero', () => {
      // 1 slot from dayStart → 08:15
      const slotHeight = Math.round((snap / 30) * 40)
      const r = snapToSlot(slotHeight, pp, snap, dayStart, dayEnd)
      expect(r.time).toBe('08:15')
    })
  })

  describe('30-minute interval (default)', () => {
    const snap = 30
    const dayStart = 0
    const dayEnd   = 24 * 60
    const pp = ppm(snap)

    it('snaps to 30-minute boundaries', () => {
      const slotHeight = Math.round((snap / 30) * 40) // 40px
      const r = snapToSlot(slotHeight, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(30)
      expect(r.time).toBe('00:30')
    })

    it('snaps to 3 slots = 90 minutes = 01:30', () => {
      const slotHeight = Math.round((snap / 30) * 40)
      const r = snapToSlot(slotHeight * 3, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(90)
      expect(r.time).toBe('01:30')
    })
  })

  describe('60-minute interval', () => {
    const snap = 60
    const dayStart = 9 * 60
    const dayEnd   = 18 * 60
    const pp = ppm(snap)

    it('snaps to 1-hour boundaries', () => {
      const slotHeight = Math.round((snap / 30) * 40) // 80px
      const r = snapToSlot(slotHeight, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(dayStart + 60)
      expect(r.time).toBe('10:00')
    })
  })

  describe('boundary clamping', () => {
    const snap = 15
    const dayStart = 8 * 60
    const dayEnd   = 20 * 60
    const pp = ppm(snap)

    it('clamps negative deltaY to dayStart', () => {
      const r = snapToSlot(-999, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(dayStart)
      expect(r.time).toBe('08:00')
    })

    it('clamps large deltaY to dayEnd', () => {
      const r = snapToSlot(99999, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(dayEnd)
      expect(r.time).toBe('20:00')
    })

    it('clamps exactly at dayEnd', () => {
      const totalMinutes = dayEnd - dayStart
      const totalPixels = totalMinutes * pp
      const r = snapToSlot(totalPixels, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(dayEnd)
    })
  })

  describe('midnight-spanning day (dayStart=0, dayEnd=24*60)', () => {
    const snap = 30
    const dayStart = 0
    const dayEnd = 24 * 60
    const pp = ppm(snap)

    it('returns 00:00 for deltaY=0', () => {
      const r = snapToSlot(0, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(0)
      expect(r.time).toBe('00:00')
    })

    it('returns 23:30 for last slot', () => {
      const slotHeight = Math.round((snap / 30) * 40)
      // 23:30 = 1410 minutes, slot 47 from midnight
      const r = snapToSlot(slotHeight * 47, pp, snap, dayStart, dayEnd)
      expect(r.minutes).toBe(1410)
      expect(r.time).toBe('23:30')
    })
  })
})
