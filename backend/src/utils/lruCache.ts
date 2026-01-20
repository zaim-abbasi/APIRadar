class Node<K, V> {
  prev: Node<K, V> | null = null;
  next: Node<K, V> | null = null;
  ts = Date.now();
  constructor(public k: K, public v: V, public ttl?: number) { }
}

export class LRUCache<K, V> {
  private cache = new Map<K, Node<K, V>>();
  private head: Node<K, V> | null = null;
  private tail: Node<K, V> | null = null;
  private hits = 0;
  private misses = 0;
  private janitor: NodeJS.Timeout | null = null;

  constructor(private max = 10000, private defaultTTL?: number) { }

  get(k: K): V | null {
    const n = this.cache.get(k);
    if (!n || (n.ttl && Date.now() - n.ts > n.ttl)) {
      if (n) { this.delete(k); this.misses++; } else this.misses++;
      return null;
    }
    this.refresh(n);
    this.hits++;
    return n.v;
  }

  set(k: K, v: V, ttl?: number) {
    let n = this.cache.get(k);
    if (n) { n.v = v; n.ts = Date.now(); if (ttl !== undefined) n.ttl = ttl; this.refresh(n); }
    else {
      if (this.cache.size >= this.max) this.evict();
      n = new Node(k, v, ttl ?? this.defaultTTL);
      this.cache.set(k, n);
      n.next = this.head;
      if (this.head) this.head.prev = n;
      this.head = n;
      if (!this.tail) this.tail = n;
    }
  }

  delete(k: K) {
    const n = this.cache.get(k);
    if (!n) return false;
    this.detach(n);
    this.cache.delete(k);
    return true;
  }

  has(k: K) {
    const n = this.cache.get(k);
    if (n && n.ttl && Date.now() - n.ts > n.ttl) { this.delete(k); return false; }
    return !!n;
  }

  startJanitor(ms: number) { this.stopJanitor(); this.janitor = setInterval(() => this.cleanExpired(), ms).unref(); }
  stopJanitor() { if (this.janitor) { clearInterval(this.janitor); this.janitor = null; } }
  resize(size: number) { this.max = size; while (this.cache.size > this.max) this.evict(); }

  private refresh(n: Node<K, V>) { if (n !== this.head) { this.detach(n); n.next = this.head; if (this.head) this.head.prev = n; this.head = n; n.prev = null; if (!this.tail) this.tail = n; } }

  private detach(n: Node<K, V>) {
    if (n.prev) n.prev.next = n.next; else this.head = n.next;
    if (n.next) n.next.prev = n.prev; else this.tail = n.prev;
  }

  private evict() { if (this.tail) { this.cache.delete(this.tail.k); this.detach(this.tail); } }
  cleanExpired() { let n = 0; for (const [k, v] of this.cache) if (v.ttl && Date.now() - v.ts > v.ttl) { this.delete(k); n++; } return n; }

  getStats() { return { size: this.cache.size, max: this.max, hits: this.hits, misses: this.misses }; }
}
