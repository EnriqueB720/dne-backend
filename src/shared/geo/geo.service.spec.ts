import { GeoService } from './geo.service';

describe('GeoService', () => {
  const geo = new GeoService();

  it.each([
    ['Heredia', 'CR-H'],
    ['san jose', 'CR-SJ'],
    ['Escazú', 'CR-SJ'],
    ['cerca de Santo Domingo', 'CR-H'],
    ['San Rafael de Alajuela', 'CR-A'],
    ['Tamarindo', 'CR-G'],
    ['Puerto Viejo', 'CR-L'],
    ['Puerto Viejo de Sarapiquí', 'CR-H'],
    ['Jacó', 'CR-P'],
    ['Limón', 'CR-L'],
  ])('resolves "%s" to %s', (text, code) => {
    expect(geo.fromText(text)).toBe(code);
  });

  it('returns null for unknown places', () => {
    expect(geo.fromText('Madrid')).toBeNull();
    expect(geo.fromText('')).toBeNull();
  });

  it('maps device coordinates to the nearest province', () => {
    expect(geo.fromCoordinates(9.998, -84.117)).toBe('CR-H'); // Heredia centro
    expect(geo.fromCoordinates(9.93, -84.08)).toBe('CR-SJ'); // San José centro
    expect(geo.fromCoordinates(10.63, -85.44)).toBe('CR-G'); // Liberia
    expect(geo.fromCoordinates(40.4, -3.7)).toBeNull(); // Madrid
  });

  it('prefers a picked province, then text, then the device', () => {
    expect(geo.resolve({ province: 'CR-C', location: 'Heredia', lat: 9.93, lng: -84.08 })).toMatchObject({
      code: 'CR-C',
      source: 'explicit',
    });
    expect(geo.resolve({ location: 'Heredia', lat: 9.93, lng: -84.08 })).toMatchObject({ code: 'CR-H', source: 'text' });
    expect(geo.resolve({ lat: 9.93, lng: -84.08 })).toMatchObject({ code: 'CR-SJ', source: 'device' });
    expect(geo.resolve({})).toBeNull();
  });

  it('always keeps the home province in the served list', () => {
    expect(geo.normalizeServiceProvinces('cr-h', ['CR-SJ', 'XX', 'CR-H'])).toEqual(['CR-H', 'CR-SJ']);
  });
});
