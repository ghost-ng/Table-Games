import { BOGGLE_WORDS } from './boggle-dictionary.generated';

// Shared offline dictionary for Word Grid's engine and all submission methods.
export const DICTIONARY: ReadonlySet<string> = new Set(BOGGLE_WORDS.split('\n'));
