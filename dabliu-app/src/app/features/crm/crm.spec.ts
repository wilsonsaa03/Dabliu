import { CopPipe, SERVICES, STAGE, STAGES } from './crm.labels';

describe('CRM: textos y formato', () => {
  const cop = new CopPipe();

  it('formatea pesos colombianos sin decimales', () => {
    expect(cop.transform(18000000).replace(/\s/g, ' ')).toBe('$ 18.000.000');
    expect(cop.transform(null)).toBe('—');
    expect(cop.transform(72000000, true).replace(/\s/g, ' ')).toMatch(/^\$\s?72\s?M/);
  });

  it('tiene las 8 etapas del embudo en orden y con etiqueta', () => {
    expect(STAGES.map((s) => s.code)).toEqual([
      'NUEVO', 'CONTACTADO', 'CALIFICADO', 'REUNION_PROGRAMADA', 'PROPUESTA_ENVIADA', 'NEGOCIACION', 'GANADO', 'PERDIDO',
    ]);
    expect(STAGE.PERDIDO.label).toBe('Perdido');
  });

  it('usa códigos de servicio válidos para la API', () => {
    expect(SERVICES.length).toBe(8);
    for (const s of SERVICES) expect(s.code).toMatch(/^[A-Z_]{2,40}$/);
  });
});
