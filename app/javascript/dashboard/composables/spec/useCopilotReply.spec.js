import { ref } from 'vue';
import { useCopilotReply } from '../useCopilotReply';
import { useCaptain } from 'dashboard/composables/useCaptain';

vi.mock('dashboard/composables/useCaptain');
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: () => ({ updateUISettings: vi.fn() }),
}));
vi.mock('dashboard/composables', () => ({ useTrack: vi.fn() }));

describe('useCopilotReply', () => {
  const processEvent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    processEvent.mockResolvedValue({
      message: 'Suggested reply',
      followUpContext: { id: 'ctx' },
    });
    useCaptain.mockReturnValue({
      processEvent,
      followUp: vi.fn(),
      currentChat: ref({ id: 42 }),
    });
  });

  it('asks for instructions before generating a reply suggestion', async () => {
    const copilot = useCopilotReply();

    await copilot.execute('reply_suggestion');

    expect(processEvent).not.toHaveBeenCalled();
    expect(copilot.isAwaitingInstructions.value).toBe(true);
    expect(copilot.isActive.value).toBe(true);
    expect(copilot.isButtonDisabled.value).toBe(false);
  });

  it('generates the reply suggestion with the instructions', async () => {
    const copilot = useCopilotReply();
    await copilot.execute('reply_suggestion');

    await copilot.submitInstructions('  Decline politely  ');

    expect(processEvent).toHaveBeenCalledWith('reply_suggestion', '', {
      signal: expect.any(AbortSignal),
      instructions: 'Decline politely',
    });
    expect(copilot.isAwaitingInstructions.value).toBe(false);
    expect(copilot.generatedContent.value).toBe('Suggested reply');
    expect(copilot.followUpContext.value).toEqual({ id: 'ctx' });
  });

  it('generates without instructions when the input is empty', async () => {
    const copilot = useCopilotReply();
    await copilot.execute('reply_suggestion');

    await copilot.submitInstructions('   ');

    expect(processEvent).toHaveBeenCalledWith('reply_suggestion', '', {
      signal: expect.any(AbortSignal),
      instructions: undefined,
    });
  });

  it('ignores instructions when none were asked for', async () => {
    const copilot = useCopilotReply();

    await copilot.submitInstructions('Decline politely');

    expect(processEvent).not.toHaveBeenCalled();
  });

  it('closes the instructions input on reset', async () => {
    const copilot = useCopilotReply();
    await copilot.execute('reply_suggestion');

    copilot.reset();

    expect(copilot.isAwaitingInstructions.value).toBe(false);
    expect(copilot.isActive.value).toBe(false);
  });

  it('still generates other actions right away', async () => {
    const copilot = useCopilotReply();

    await copilot.execute('improve', 'Draft');

    expect(processEvent).toHaveBeenCalledWith('improve', 'Draft', {
      signal: expect.any(AbortSignal),
      instructions: undefined,
    });
    expect(copilot.isAwaitingInstructions.value).toBe(false);
  });
});
