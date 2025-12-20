class LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null = null;
  next: LRUNode<K, V> | null = null;
  timestamp: number;
  ttl: number | undefined;

  constructor(key: K, value: V, ttl?: number) {
    this.key = key;
    this.value = value;
    this.timestamp = Date.now();
    this.ttl = ttl ?? undefined;
  }

  isExpired(): boolean {
    if (!this.ttl) return false;
    return Date.now() - this.timestamp > this.ttl;
  }
}

export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly defaultTTL: number | undefined;
  private cache: Map<K, LRUNode<K, V>> = new Map();
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 10000, defaultTTL?: number) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: K): V | null {
    const node = this.cache.get(key);
    if (!node) {
      this.misses++;
      return null;
    }
    if (node.isExpired()) {
      this.delete(key);
      this.misses++;
      return null;
    }
    this.moveToHead(node);
    this.hits++;
    return node.value;
  }

  set(key: K, value: V, ttl?: number): void {
    const node = this.cache.get(key);
    if (node) {
      node.value = value;
      node.timestamp = Date.now();
      if (ttl !== undefined) node.ttl = ttl;
      this.moveToHead(node);
    } else {
      const newNode = new LRUNode(key, value, ttl ?? this.defaultTTL);
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      this.cache.set(key, newNode);
      this.addToHead(newNode);
    }
  }

  has(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;
    if (node.isExpired()) {
      this.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    hitRate: number;
    utilization: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      utilization: (this.cache.size / this.maxSize) * 100
    };
  }

  cleanExpired(): number {
    let cleaned = 0;
    const keysToDelete: K[] = [];
    for (const [key, node] of this.cache.entries()) {
      if (node.isExpired()) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => {
      this.delete(key);
      cleaned++;
    });
    return cleaned;
  }

  private moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) return;
    this.removeNode(node);
    this.addToHead(node);
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private evictLRU(): void {
    if (!this.tail) return;
    const lru = this.tail;
    this.removeNode(lru);
    this.cache.delete(lru.key);
  }
}
