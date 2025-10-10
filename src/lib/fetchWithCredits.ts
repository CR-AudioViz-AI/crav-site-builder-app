/**
 * Fetch wrapper that handles credit-related errors (402)
 * and dispatches events to open the credits modal
 */
export async function fetchWithCredits(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);

  // Handle insufficient credits (402 Payment Required)
  if (response.status === 402) {
    let offers: any[] = [];
    try {
      const jsonData = await response.clone().json();
      offers = jsonData?.offers || [];
    } catch (e) {
      console.error('Failed to parse 402 response:', e);
    }

    // Dispatch event to open credits modal with offers
    window.dispatchEvent(new CustomEvent('open-credits-modal', {
      detail: {
        url: input.toString(),
        status: 402,
        offers,
      },
    }));

    throw new Error('credits_insufficient');
  }

  return response;
}

/**
 * Hook to listen for credit modal events
 */
export function useCreditsModal(onOpen: () => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener('open-credits-modal', onOpen);
    return () => window.removeEventListener('open-credits-modal', onOpen);
  }
  return () => {};
}
