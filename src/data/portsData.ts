import { PortConfig } from '../types/maritime';

export const PORTS_DATA: Record<'areia_branca' | 'macau', PortConfig> = {
  areia_branca: {
    id: 'areia_branca',
    name: 'Areia Branca',
    fullName: 'Porto de Areia Branca',
    state: 'RN',
    chartNumber: 'Carta DHN 703 / 701',
    dhnStation: 'DG6-63 (DHN 27 Componentes)',
    coordinates: {
      lat: -4.818417, // 4°49'06.3"S
      lng: -37.044389, // 37°02'39.8"W (Exact requested coordinates)
      dmsLat: `4°49'06.3"S`,
      dmsLng: `37°02'39.8"W`,
    },
    meanLevel: 1.88, // Nível Médio 1.88 m
    chartDatum: 0.0,
    criticalShallowDepth: 2.2, // Profundidade do banco de areia da barra no Zero Hidrográfico
    maxNormalDraft: 4.8, // Calado máximo operacional da barra interna
    timeOffsetMinutes: 0,
    heightMultiplier: 1.0,
    description: 'Entrada da Barra de Areia Branca e Porto de Areia Branca.',
    barCharacteristics: 'Barra sujeita a bancos de areia móveis na Ponta do Upanema. Marés semidiurnas com amplitudes de até 3.6m em sizígia.',
  },
  macau: {
    id: 'macau',
    name: 'Macau - RN',
    fullName: 'Barra de Macau - Foz do Rio Açu & Ponta do Tubarão / Terminal Salineiro de Macau',
    state: 'RN',
    chartNumber: 'Carta DHN 702',
    dhnStation: 'Estação Secundária Costa Branca DHN',
    coordinates: {
      lat: -5.0683,
      lng: -36.6342,
      dmsLat: `5°04'05.8"S`,
      dmsLng: `36°38'03.1"W`,
    },
    meanLevel: 1.82,
    chartDatum: 0.0,
    criticalShallowDepth: 1.8, // Profundidade rasa no banco da barra de Macau
    maxNormalDraft: 4.2,
    timeOffsetMinutes: -18, // ~18 min de antecipação/diferença de fase harmônica
    heightMultiplier: 0.96, // Pequena atenuação da amplitude de onda
    description: 'Entrada da Barra de Macau, foz do Rio Açu / Piranhas, Ponta do Tubarão e complexo salineiro.',
    barCharacteristics: 'Barra com bancos arenosos na foz do Rio Açu, canal sinalizado por boias cegas e luminosas da Capitania dos Portos.',
  },
};
