import { MediaSource, WatchlistItem } from './types';

export const INITIAL_SOURCES: MediaSource[] = [
  { id: '1', domain: 'kayhan.ir', name: 'Kayhan', leaning: 'Principlist', active: true },
  { id: '2', domain: 'rajanews.com', name: 'Raja News', leaning: 'Principlist', active: true },
  { id: '3', domain: 'irna.ir', name: 'IRNA', leaning: 'State', active: true },
  { id: '4', domain: 'resalat-news.com', name: 'Resalat', leaning: 'Principlist', active: true },
  { id: '5', domain: 'afkarnews.com', name: 'Afkar News', leaning: 'Principlist', active: true },
  { id: '6', domain: 'irannewspaper.ir', name: 'Iran Newspaper', leaning: 'State', active: true },
  { id: '7', domain: 'jamejamonline.ir', name: 'Jame Jam', leaning: 'State', active: true },
  { id: '8', domain: 'hamshahrionline.ir', name: 'Hamshahri', leaning: 'State', active: true },
  { id: '9', domain: 'donya-e-eqtesad.com', name: 'Donya-e-Eqtesad', leaning: 'Economic', active: true },
  { id: '10', domain: 'ettelaat.com', name: 'Ettelaat', leaning: 'Moderate', active: true },
  { id: '11', domain: 'etemadonline.com', name: 'Etemad', leaning: 'Reformist', active: true },
  { id: '12', domain: 'sharghdaily.com', name: 'Shargh', leaning: 'Reformist', active: true },
  { id: '13', domain: 'aftabyazdonline.ir', name: 'Aftab Yazd', leaning: 'Reformist', active: true },
  { id: '14', domain: 'nournews.ir', name: 'Nour News', leaning: 'State', active: true },
  { id: '15', domain: 'mehrnews.com', name: 'Mehr News', leaning: 'Principlist', active: true },
  { id: '16', domain: 'armanmeli.ir', name: 'Arman Meli', leaning: 'Reformist', active: true },
  { id: '17', domain: 'hammihanonline.ir', name: 'Hammihan', leaning: 'Reformist', active: true },
];

export const INITIAL_WATCHLIST: WatchlistItem[] = [
  { id: 'w1', topic: 'Nuclear Program', description: 'Development and IAEA relations' },
  { id: 'w2', topic: 'Hijab Law', description: 'Enforcement and public reaction' },
];

export const MOCK_SUMMARY = `**Strategic Summary**

Recent coverage indicates a sharp divergence in narratives regarding the nuclear negotiations.

**Principlist Narrative (Kayhan, Raja News):**
Emphasizes resilience against Western pressure. Articles suggest that any concession to the IAEA is a sign of weakness.

**Reformist Narrative (Shargh, Etemad):**
Highlights the economic necessity of lifting sanctions and urges a return to diplomacy.

**Key Insight:**
The internal debate has intensified following the recent statement by the E3.`;
