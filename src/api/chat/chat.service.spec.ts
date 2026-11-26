import { ChatService } from './chat.service';
import { ChatProvider } from './providers';

function provider(key: 'claude-haiku' | 'gemini-flash', impl: () => Promise<string>, configured = true): ChatProvider {
  return {
    key,
    isConfigured: () => configured,
    send: jest.fn(async () => ({ content: await impl(), model: key })),
  };
}

const usageLog = { log: jest.fn() } as any;
const req = { messages: [{ role: 'user' as const, content: 'hola' }] };

describe('ChatService provider chain', () => {
  it('answers with Claude when Claude works', async () => {
    const claude = provider('claude-haiku', async () => 'from claude');
    const gemini = provider('gemini-flash', async () => 'from gemini');
    const svc = new ChatService(claude as any, gemini as any, usageLog);

    await expect(svc.send(req)).resolves.toMatchObject({ content: 'from claude', model: 'claude-haiku' });
    expect(gemini.send).not.toHaveBeenCalled();
  });

  it('falls back to Gemini after Claude fails twice', async () => {
    const claude = provider('claude-haiku', async () => {
      throw new Error('overloaded');
    });
    const gemini = provider('gemini-flash', async () => 'from gemini');
    const svc = new ChatService(claude as any, gemini as any, usageLog);

    await expect(svc.send(req)).resolves.toMatchObject({ model: 'gemini-flash' });
    expect(claude.send).toHaveBeenCalledTimes(2);
  });

  it('skips Claude when its key is not configured', async () => {
    const claude = provider('claude-haiku', async () => 'x', false);
    const gemini = provider('gemini-flash', async () => 'from gemini');
    const svc = new ChatService(claude as any, gemini as any, usageLog);

    await expect(svc.send(req)).resolves.toMatchObject({ model: 'gemini-flash' });
    expect(claude.send).not.toHaveBeenCalled();
  });

  it('throws a friendly error when every provider fails', async () => {
    const fail = async () => {
      throw new Error('down');
    };
    const svc = new ChatService(provider('claude-haiku', fail) as any, provider('gemini-flash', fail) as any, usageLog);
    await expect(svc.send(req)).rejects.toThrow('The assistant is unavailable right now');
  });
});
