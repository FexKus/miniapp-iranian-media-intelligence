import { MediaSource, WatchlistItem } from './types';

export const INITIAL_SOURCES: MediaSource[] = [
  { id: '1', domain: 'kayhan.ir', name: 'Kayhan', leaning: 'Principlist', active: true, description: 'One of the most conservative newspapers in Iran, directly supervised by the Office of the Supreme Leader. Known for its hardline stance against the West and reformists.' },
  { id: '2', domain: 'rajanews.com', name: 'Raja News', leaning: 'Principlist', active: true, description: 'A hardline news website associated with the Front of Islamic Revolution Stability. Strongly supports the principles of the Islamic Revolution.' },
  { id: '3', domain: 'irna.ir', name: 'IRNA', leaning: 'State', active: true, description: 'The official news agency of the Islamic Republic of Iran. Controlled by the government (administration), it reflects official state policy.' },
  { id: '4', domain: 'resalat-news.com', name: 'Resalat', leaning: 'Principlist', active: true, description: 'A conservative daily newspaper associated with the Islamic Coalition Party and the bazaar merchants.' },
  { id: '5', domain: 'afkarnews.com', name: 'Afkar News', leaning: 'Principlist', active: true, description: 'A conservative news agency focusing on political and social analysis from a Principlist perspective.' },
  { id: '6', domain: 'irannewspaper.ir', name: 'Iran Newspaper', leaning: 'State', active: true, description: 'The official daily newspaper of the government, published by IRNA. It generally reflects the views of the sitting administration.' },
  { id: '7', domain: 'jamejamonline.ir', name: 'Jame Jam', leaning: 'State', active: true, description: 'Published by the IRIB (state broadcaster), focusing on social and cultural issues with a conservative, state-aligned viewpoint.' },
  { id: '8', domain: 'hamshahrionline.ir', name: 'Hamshahri', leaning: 'State', active: true, description: 'Published by the Municipality of Tehran. It is one of the most widely read dailies, often focusing on urban and social news.' },
  { id: '9', domain: 'donya-e-eqtesad.com', name: 'Donya-e-Eqtesad', leaning: 'Economic', active: true, description: 'The leading economic daily in Iran. Generally advocates for free-market policies and provides in-depth financial analysis.' },
  { id: '10', domain: 'ettelaat.com', name: 'Ettelaat', leaning: 'Moderate', active: true, description: 'One of the oldest newspapers in Iran. Traditionally conservative but now seen as moderate/centrist, often publishing diverse viewpoints.' },
  { id: '11', domain: 'etemadonline.com', name: 'Etemad', leaning: 'Reformist', active: true, description: 'A prominent reformist newspaper. Often critical of hardline policies and advocates for social and political reforms.' },
  { id: '12', domain: 'sharghdaily.com', name: 'Shargh', leaning: 'Reformist', active: true, description: 'A leading reformist daily known for its analysis and interviews with political figures. Frequently faces state censorship.' },
  { id: '13', domain: 'aftabyazdonline.ir', name: 'Aftab Yazd', leaning: 'Reformist', active: true, description: 'A reformist newspaper covering political, social, and cultural news with a critical lens.' },
  { id: '14', domain: 'nournews.ir', name: 'Nour News', leaning: 'State', active: true, description: 'Affiliated with the Supreme National Security Council (SNSC). A key source for security and defense-related news.' },
  { id: '15', domain: 'mehrnews.com', name: 'Mehr News', leaning: 'Principlist', active: true, description: 'Owned by the Islamic Ideology Dissemination Organization. Provides news with a conservative/Principlist slant.' },
  { id: '16', domain: 'armanmeli.ir', name: 'Arman Meli', leaning: 'Reformist', active: true, description: 'A reformist daily newspaper discussing social and political issues, supporting the reform movement.' },
  { id: '17', domain: 'hammihanonline.ir', name: 'Hammihan', leaning: 'Reformist', active: true, description: 'A reformist newspaper that has faced bans and reopenings. Known for its pro-reform editorial line.' },
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
