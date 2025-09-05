//src\lib\llama-server-utils.ts
/**
 * Repeatedly pings the llama.cpp server's health endpoint until it's ready.
 * This is crucial for ensuring the server is fully loaded before sending requests.
 * @param timeout 
 * @param interval
 * @returns 
 */
export async function waitForLlamaServer(timeout: number = 60000, interval: number = 1000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch('http://localhost:8080/health', {
          method: 'GET',
          signal: AbortSignal.timeout(interval - 100),
      });
    
      const data = await response.json();
      if (response.ok && data.status === 'ok') {
        console.log("Llama.cpp server is healthy and ready.");
        return true;
      }

    } catch (error) {
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.error(`Llama.cpp server did not become healthy within ${timeout / 1000} seconds.`);
  return false;
}