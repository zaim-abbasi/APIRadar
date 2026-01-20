class Node<K, V> {
  prev: Node<K, V> | null = null;
  next: Node<K, V> | null = null;
  timestamp = Date.now();
  constructor(public key: K, public value: V, public ttl: number | undefined) { }
  isExpired() { return this.ttl ? Date.now() - this.timestamp > this.ttl : false; }
}

export class LRUCache<K, V> {
  private cache = new Map<K, Node<K, V>>();
  private head: Node<K, V> | null = null;
  private tail: Node<K, V> | null = null;
  private hits = 0;
  private misses = 0;
  private janitor: NodeJS.Timeout | null = null;

  constructor(private maxSize = 10000, private defaultTTL?: number) { }

  get(key: K): V | null {
    const n = this.cache.get(key);
    if (!n) { this.misses++; return null; }
    if (n.isExpired()) { this.delete(key); this.misses++; return null; }
    this.moveToHead(n);
    this.hits++;
    return n.value;
  }

  set(key: K, value: V, ttl?: number) {
    const n = this.cache.get(key);
    if (n) {
      n.value = value; n.timestamp = Date.now();
      if (ttl !== undefined) n.ttl = ttl;
      this.moveToHead(n);
    } else {
      if (this.cache.size >= this.maxSize) this.evict();
      const node = new Node(key, value, ttl ?? this.defaultTTL);
      this.cache.set(key, node);
      this.addToHead(node);
    }
  }

  has(key: K): boolean {
    const n = this.cache.get(key);
    if (!n) return false;
    if (n.isExpired()) { this.delete(key); return false; }
    return true;
  }

  delete(key: K): boolean {
    const n = this.cache.get(key);
    if (!n) return false;
    this.remove(n);
    this.cache.delete(key);
    return true;
  }

  clear() { this.cache.clear(); this.head = this.tail = null; this.hits = this.misses = 0; }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size, maxSize: this.maxSize, hits: this.hits, misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0, utilization: (this.cache.size / this.maxSize) * 100
    };
  }

  cleanExpired(): number {
    let cleaned = 0;
    for (const [key, node] of this.cache) {
      if (node.isExpired()) { this.delete(key); cleaned++; }
    }
    return cleaned;
  }

  startJanitor(intervalMs: number) {
    this.stopJanitor();
    this.janitor = setInterval(() => this.cleanExpired(), intervalMs);
    this.janitor.unref();
  }

  stopJanitor() { if (this.janitor) { clearInterval(this.janitor); this.janitor = null; } }

  resize(newSize: number) {
    this.maxSize = newSize;
    while (this.cache.size > this.maxSize) this.evict();
  }

  private moveToHead(n: Node<K, V>) { if (n !== this.head) { this.remove(n); this.addToHead(n); } }

  private addToHead(n: Node<K, V>) {
    n.prev = null; n.next = this.head;
    if (this.head) this.head.prev = n;
    this.head = n;
    if (!this.tail) this.tail = n;
  }

  private remove(n: Node<K, V>) {
    if (n.prev) n.prev.next = n.next; else this.head = n.next;
    if (n.next) n.next.prev = n.prev; else this.tail = n.prev;
  }

  private evict() { if (this.tail) { const k = this.tail.key; this.remove(this.tail); this.cache.delete(k); } }
}
