import { GeoService } from '../../shared/geo/geo.service';
import { ChatTurnService } from './chat-turn.service';

const DJ_ROW = {
  supplierId: 6,
  companyName: 'Pro Events DJ',
  tagline: null,
  city: 'Escazú',
  province: 'CR-SJ',
  serviceProvinces: ['CR-SJ'],
  rating: null,
  reviewCount: 0,
  verifiedAt: new Date(),
  preferredAt: null,
  preferredUntil: null,
  businessPhone: '+50688887777',
  businessPhoneAlt: null,
  whatsappNumber: null,
  businessEmail: null,
  businessEmailAlt: null,
  websiteUrl: null,
  skills: ['wedding dj'],
  categories: [],
  services: [],
};

function setup(parseJson: object, ctx?: { earlier?: string[]; lastSuppliersJson?: string | null }) {
  const calls: Array<{ system?: string; cachedSystem?: string; messages: any[] }> = [];
  const chat = {
    send: jest.fn(async (req: any) => {
      calls.push(req);
      // First call of a turn is the parser (no grounding `system`).
      return req.system === undefined
        ? { content: JSON.stringify(parseJson), model: 'claude-haiku' }
        : { content: 'reply', model: 'claude-haiku' };
    }),
  };
  const conversations = {
    turnContext: jest.fn(async () => ({
      history: [],
      earlierUserMessages: ctx?.earlier ?? [],
      lastSuppliersJson: ctx?.lastSuppliersJson ?? null,
    })),
    persistTurn: jest.fn(async (_c: any, id: string | null, _m: string, replies: any[]) => ({
      conversation: { conversationId: id ?? 'new', title: 't' },
      replies: replies.map((r, i) => ({ messageId: `m${i}`, createdAt: new Date(), ...r })),
    })),
  };
  const suppliers = {
    search: jest.fn(async () => ({ province: { code: 'CR-SJ', name: 'San José', country: 'CR', source: 'text' }, suppliers: [DJ_ROW] })),
  };
  const svc = new ChatTurnService(chat as any, conversations as any, suppliers as any, new GeoService());
  return { svc, chat, calls, conversations, suppliers };
}

const caller = { deviceId: 'dev-1' };

describe('ChatTurnService', () => {
  it('searches the typed place, grounds the reply on the results and saves the cards', async () => {
    const t = setup({ intent: 'service_request', service: 'DJ', location: 'Escazú' });
    const res = await t.svc.run({ message: 'busco un DJ en Escazú', province: 'CR-H' }, caller, () => false);

    // Typed place wins over the picked zone.
    expect(t.suppliers.search).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'DJ', location: 'Escazú', province: undefined }),
      expect.anything(),
    );
    const grounding = t.calls[1].system!;
    expect(grounding).toContain('zone: San José province');
    expect(grounding).toContain('Pro Events DJ');
    expect(grounding).toContain('phone: +50688887777');
    expect(res!.replies[0].zoneName).toBe('San José');
    expect(JSON.parse(res!.replies[0].providersJson!)[0].supplierId).toBe(6);
  });

  it('uses the picked zone when no place is typed', async () => {
    const t = setup({ intent: 'service_request', service: 'DJ', location: '' });
    await t.svc.run({ message: 'necesito un DJ', province: 'CR-H', lat: 9.9, lng: -84 }, caller, () => false);
    expect(t.suppliers.search).toHaveBeenCalledWith(
      expect.objectContaining({ province: 'CR-H', lat: undefined, lng: undefined }),
      expect.anything(),
    );
  });

  it('answers follow-ups about shown cards without searching again', async () => {
    const t = setup(
      { intent: 'service_request', service: 'DJ' },
      { lastSuppliersJson: JSON.stringify([{ supplierId: 6, companyName: 'Pro Events DJ', serviceProvinceNames: [], skills: [], categories: [], services: [], reviewCount: 0 }]) },
    );
    await t.svc.run({ conversationId: 'c1', message: '¿cuál tiene mejor calificación?' }, caller, () => false);
    expect(t.suppliers.search).not.toHaveBeenCalled();
    expect(t.calls[1].system).toContain('## Known suppliers');
  });

  it('saves nothing when the user stopped the turn', async () => {
    const t = setup({ intent: 'service_request', service: 'DJ' });
    const res = await t.svc.run({ message: 'busco un DJ' }, caller, () => true);
    expect(res).toBeNull();
    expect(t.conversations.persistTurn).not.toHaveBeenCalled();
  });

  it('keeps prompts server-side: the stable prompt is sent as cachedSystem', async () => {
    const t = setup({ intent: 'chat' });
    await t.svc.run({ message: 'hola' }, caller, () => false);
    expect(t.calls[0].cachedSystem).toContain('intent parser');
    expect(t.calls[1].cachedSystem).toContain('You are Solvo');
  });
});

describe('ChatTurnService follow-ups', () => {
  const shownJson = JSON.stringify([
    { supplierId: 6, companyName: 'Pro Events DJ', serviceProvinceNames: [], skills: [], categories: [], services: [], reviewCount: 0 },
  ]);

  it('"y en Heredia?" searches again even if the parser called it chat', async () => {
    const t = setup({ intent: 'chat', service: 'DJ', location: 'Heredia' }, { lastSuppliersJson: shownJson });
    await t.svc.run({ conversationId: 'c1', message: 'y en Heredia?' }, caller, () => false);
    expect(t.suppliers.search).toHaveBeenCalledWith(expect.objectContaining({ query: 'DJ', location: 'Heredia' }), expect.anything());
  });

  it('keeps a search when the follow-up names a new place', async () => {
    const t = setup({ intent: 'service_request', service: 'DJ', location: 'Cartago' }, { lastSuppliersJson: shownJson });
    await t.svc.run({ conversationId: 'c1', message: 'Cartago también' }, caller, () => false);
    expect(t.suppliers.search).toHaveBeenCalled();
  });
});
