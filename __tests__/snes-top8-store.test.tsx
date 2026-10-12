/** @jest-environment jsdom */
import { renderToString } from 'react-dom/server';
import { act, renderHook } from '@testing-library/react';
import { EMPTY_STATE } from '@/lib/snes/top8';
import { readTop8, resetTop8Memory, subscribeTop8, useTop8, writeTop8 } from '../app/snes/top8/store';

const state = (slots: (string | null)[]) => ({ ...EMPTY_STATE, slots: [...slots, ...Array(8 - slots.length).fill(null)] });

beforeEach(() => { localStorage.clear(); resetTop8Memory(); });

describe('readTop8', () => {
  it('is EMPTY_STATE with nothing or junk stored', () => {
    expect(readTop8()).toEqual(EMPTY_STATE);
    localStorage.setItem('snes-top8', '{nope');
    expect(readTop8()).toEqual(EMPTY_STATE);
  });
  it('validates slots, theme, name and denied', () => {
    localStorage.setItem('snes-top8', JSON.stringify({ slots: ['a', 'a', 5, 'b'], theme: 'bogus', name: 'Wes<>', denied: ['x', 3] }));
    expect(readTop8()).toEqual({ slots: ['a', null, null, 'b', null, null, null, null], theme: 'myspace', name: 'Wes', denied: ['x'] });
  });
});

describe('write and subscribe', () => {
  it('write stores, fires the event and subscribers see the new state', () => {
    const seen: unknown[] = [];
    const off = subscribeTop8(() => seen.push(readTop8()));
    writeTop8(state(['a']));
    expect(seen).toHaveLength(1);
    expect((seen[0] as { slots: unknown[] }).slots[0]).toBe('a');
    off();
    writeTop8(state(['b']));
    expect(seen).toHaveLength(1);
  });
  it('a storage event for our key from another tab notifies; other keys do not', () => {
    const cb = jest.fn();
    const off = subscribeTop8(cb);
    window.dispatchEvent(new StorageEvent('storage', { key: 'other' }));
    expect(cb).not.toHaveBeenCalled();
    window.dispatchEvent(new StorageEvent('storage', { key: 'snes-top8' }));
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });
  it('blocked storage reads EMPTY_STATE and never throws', () => {
    const get = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const set = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readTop8()).toEqual(EMPTY_STATE);
    expect(() => writeTop8(state(['a']))).not.toThrow();
    get.mockRestore();
    set.mockRestore();
  });
});

describe('useTop8 with storage blocked', () => {
  it('keeps edits in memory, notifies subscribers and keeps a stable snapshot between writes', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const cb = jest.fn();
    const off = subscribeTop8(cb);
    const { result, rerender } = renderHook(() => useTop8());
    expect(result.current[0]).toEqual(EMPTY_STATE);
    act(() => result.current[1]((s) => ({ ...s, slots: ['a', ...s.slots.slice(1)] })));
    expect(cb).toHaveBeenCalled();
    expect(result.current[0]?.slots[0]).toBe('a');
    expect(readTop8().slots[0]).toBe('a');
    const snap = result.current[0];
    rerender();
    expect(result.current[0]).toBe(snap);
    act(() => result.current[1]((s) => ({ ...s, slots: [s.slots[0], 'b', ...s.slots.slice(2)] })));
    expect(result.current[0]?.slots.slice(0, 2)).toEqual(['a', 'b']);
    off();
    jest.restoreAllMocks();
  });
});

describe('useTop8', () => {
  it('server render sees null', () => {
    function C() {
      const [s] = useTop8();
      return <p>{s === null ? 'null-branch' : 'ready'}</p>;
    }
    expect(renderToString(<C />)).toContain('null-branch');
  });
  it('gives a stable snapshot until something changes, and updates through the setter', () => {
    const { result, rerender } = renderHook(() => useTop8());
    const first = result.current[0];
    expect(first).toEqual(EMPTY_STATE);
    rerender();
    expect(result.current[0]).toBe(first);
    act(() => result.current[1]((s) => ({ ...s, slots: ['a', ...s.slots.slice(1)] })));
    expect(result.current[0]?.slots[0]).toBe('a');
    expect(JSON.parse(localStorage.getItem('snes-top8')!).slots[0]).toBe('a');
    const second = result.current[0];
    rerender();
    expect(result.current[0]).toBe(second);
  });
});
