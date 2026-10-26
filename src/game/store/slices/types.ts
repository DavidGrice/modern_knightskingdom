// CLN-07 · what every slice of the game store is written against. GameState is the whole store (gameStore.ts composes
// it); a slice creator is handed the store's own set and get, so an action in one slice reads, writes and calls the
// rest exactly as it did when they were all one closure.
import type { StoreApi } from 'zustand';
import type { GameState } from '../gameStore';

export type StoreSet = StoreApi<GameState>['setState'];
export type StoreGet = StoreApi<GameState>['getState'];
export type SliceCreator<T> = (set: StoreSet, get: StoreGet) => T;
