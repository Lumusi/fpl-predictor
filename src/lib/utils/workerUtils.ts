'use client';

/**
 * Creates a web worker from a function
 * This allows us to offload expensive calculations to a separate thread
 * 
 * @param fn The function to run in the worker
 * @returns A function that will execute in the worker
 */
export function createWorker<T, R>(fn: (data: T) => R): (data: T) => Promise<R> {
  // Create a blob containing the worker code
  const blob = new Blob(
    [
      `self.onmessage = function(e) {
        const fn = ${fn.toString()};
        const result = fn(e.data);
        self.postMessage(result);
      }`
    ],
    { type: 'application/javascript' }
  );

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Return a function that will execute the worker
  return (data: T) => {
    return new Promise<R>((resolve, reject) => {
      // Create a new worker
      const worker = new Worker(url);
      
      // Set up message handler
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate(); // Clean up worker after use
      };
      
      // Set up error handler
      worker.onerror = (e) => {
        reject(new Error(`Worker error: ${e.message}`));
        worker.terminate(); // Clean up worker after use
      };
      
      // Send data to worker
      worker.postMessage(data);
    });
  };
}

/**
 * Cache for memoizing expensive calculations
 */
export class ComputationCache<K, V> {
  private cache = new Map<string, V>();
  private keySerializer: (key: K) => string;
  
  constructor(keySerializer: (key: K) => string = JSON.stringify) {
    this.keySerializer = keySerializer;
  }
  
  get(key: K): V | undefined {
    const serialized = this.keySerializer(key);
    return this.cache.get(serialized);
  }
  
  set(key: K, value: V): void {
    const serialized = this.keySerializer(key);
    this.cache.set(serialized, value);
  }
  
  has(key: K): boolean {
    const serialized = this.keySerializer(key);
    return this.cache.has(serialized);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

/**
 * Creates a memoized version of an expensive function that uses web workers
 * 
 * @param fn The function to memoize and run in a worker
 * @param keyFn Optional function to derive cache key from arguments
 * @returns A memoized function that runs in a worker
 */
export function createMemoizedWorker<T, R>(
  fn: (data: T) => R,
  keyFn: (data: T) => any = (data) => data
): (data: T) => Promise<R> {
  const worker = createWorker(fn);
  const cache = new ComputationCache<any, R>();
  
  return async (data: T) => {
    const key = keyFn(data);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = await worker(data);
    cache.set(key, result);
    return result;
  };
} 