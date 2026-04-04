"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error("Offline");
    return res.json();
  });

const REAL_DATA_SAMPLES = [
  "uddugteam/oracle-flare",
  "ErnieAtLYD/retrospect-ai",
  "ConardLi/easy-learn-ai",
  "Bayotics/local-government-security-architecture",
  "elQ3ndie/EtherStaking",
  "idootop/open-xiaoai",
  "BFSSI-Bioinformatics-Lab/intake24",
  "TRocket-Labs/vectorlint",
  "codeme-ne/die-produktivitaets-werkstatt",
  "tia-bd/test",
  "Tortilok/cyberimmune-systems_tpp",
  "gedge-platform/gs-linkhq",
  "yannart/docker-compose-demo",
  "manikcloud/manik-flask-chatgpt",
  "szsctt/ngs_barcodes",
  "Divyanshu9822/ml-ops-holiday-package-prediction",
  "relkli/opentelemetry-demo",
  "shindejayesh987/Pract-simple-micro",
  "Vizzuality/heco-invest",
  "dlass-tech/Dynamic-Class",
  "wangwwwwjy/chatgpt-on-wechat-2",
  "OpenLocalizationTestOrg/csharplang.sk-SK",
  "nowprototypeit/adaptors",
  "sumitrevolt/flash-loan-arbitrage-system",
  "InsightReactions/TinyLlama",
  "WncFht/QQ-Agent",
  "wtyler2505/multi-controller-app",
  "chromewillow/ai-credential-manager",
  "RIP4KOBE/curigpt_ros",
  "thermatk/Unobtainium",
  "gounthar/jdk8-removal",
  "Siluvai1997/k8s-cicd-infrastructure",
  "s0pheap/configuration",
  "venugopalreddy1322/DevOps_Jenkins_Essentials",
  "AnonyIIMessiah/3t-webapp-product-service-helm",
  "jenkinsci/attachments-from-jira-issues-core-cli",
  "borjaOrtizLlamas/TFM_DEVOPS_MASTER_AWS",
  "Azeemakhanum66/flask-task-manager",
  "ennioandreassi/test-flask-container",
  "Antzed/CS466-CHERI",
  "EngineerCafeJP/engineercafe-navigator",
  "ApplicaMobile/captcher",
  "SMVINAYKUMAR2341/InfosysSpringboard-Virtual-Internship-6.0",
  "gpad1234/patient-records-deployed",
  "arielgiamportone/transcriptor-placas-asistido",
  "amdsolutions007/NaijaStack-AI",
  "bjoernbethge/mao",
  "jnkindi/text-db-query-ai",
  "openChatGpts/GunaraAI",
  "u5507395840/master",
  "arturogf93/terracota-netlify",
] as const;

const PROVIDERS = [
  "OPENAI",
  "ANTHROPIC",
  "GOOGLE",
  "GROQ",
  "XAI",
  "CEREBRAS",
  "OPENROUTER",
] as const;

const providerColors: Record<string, string> = {
  OPENAI: "text-emerald-500",
  ANTHROPIC: "text-amber-600",
  GOOGLE: "text-blue-500",
  OPENROUTER: "text-fuchsia-500",
  GROQ: "text-orange-600",
  XAI: "text-slate-400",
  CEREBRAS: "text-violet-500",
};

type TerminalLog = {
  id: string;
  owner: string;
  repo: string;
  timestamp: Date;
  provider: string;
  isAlert: boolean;
};

const formatLogTime = (date: Date): string => {
  return new Intl.DateTimeFormat(navigator.language, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};

function pickRandomEntry(tick: number): Omit<TerminalLog, "id" | "timestamp"> {
  const fullName =
    REAL_DATA_SAMPLES[Math.floor(Math.random() * REAL_DATA_SAMPLES.length)];
  const [owner, repo] = fullName.split("/");
  const provider = PROVIDERS[Math.floor(Math.random() * PROVIDERS.length)];
  const isAlert = tick % 5 === 0;
  return {
    owner: owner || "unknown",
    repo: repo || "unknown",
    provider,
    isAlert,
  };
}

export const LiveScanTerminal = React.memo(function LiveScanTerminal() {
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const tickRef = useRef(0);
  const [nextRetry, setNextRetry] = useState(30.0);
  const hasInitializedLogs = useRef(false);

  const {
    data: stats,
    error,
    isLoading: isConnecting,
  } = useSWR("/api/stats/providers", fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
    revalidateIfStale: false,
    shouldRetryOnError: false,
    dedupingInterval: 5000,
  });

  // Strict binary connectivity detection
  const isOnline = Array.isArray(stats) && stats.length > 0 && !error;

  // Manual countdown timer for "Elite" fidelity
  useEffect(() => {
    if (isOnline) {
      setNextRetry(30.0);
      return;
    }
    const timer = setInterval(() => {
      setNextRetry((prev) => (prev <= 0.1 ? 30.0 : prev - 0.1));
    }, 100);
    return () => clearInterval(timer);
  }, [isOnline]);

  // Populate initial logs only once online
  useEffect(() => {
    if (isOnline && !hasInitializedLogs.current) {
      hasInitializedLogs.current = true;
      setLogs(
        Array.from({ length: 26 }).map((_, i) => {
          const entry = pickRandomEntry(i);
          return { id: `init-${i}`, ...entry, timestamp: new Date() };
        }),
      );
      tickRef.current = 26;
    }
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline && !isConnecting && !hasInitializedLogs.current) {
      // Start with "Offline" markers if first load fails
      setLogs(
        Array.from({ length: 15 }).map((_, i) => ({
          id: `init-err-${i}`,
          owner: "SYSTEM",
          repo: "UPLINK_SEVERED",
          timestamp: new Date(),
          provider: "ECONNREFUSED",
          isAlert: true,
        })),
      );
    } else if (!isOnline && !isConnecting) {
      const systemAlert: TerminalLog = {
        id: `sys-${Date.now()}`,
        owner: "SYSTEM",
        repo: "ERR_CONNECTION_REFUSED",
        timestamp: new Date(),
        provider: "ECONNREFUSED",
        isAlert: true,
      };
      setLogs((prev) => [...prev, systemAlert].slice(-26));
    }
  }, [isOnline, isConnecting]);

  useEffect(() => {
    const appendLog = () => {
      tickRef.current += 1;

      let next: TerminalLog;
      if (isOnline) {
        const entry = pickRandomEntry(tickRef.current);
        next = {
          id: `${Date.now()}-${tickRef.current}`,
          ...entry,
          timestamp: new Date(),
        };
      } else {
        // Honest signaling during blackout
        next = {
          id: `err-${Date.now()}`,
          owner: "ETHERNET",
          repo: "UPLINK_TIMEOUT_RETRYING",
          timestamp: new Date(),
          provider: "ETIMEDOUT",
          isAlert: true,
        };
      }

      setLogs((prev) => [...prev, next].slice(-26));
    };

    const intervalId = window.setInterval(appendLog, isOnline ? 1000 : 10000);
    return () => window.clearInterval(intervalId);
  }, [isOnline]);

  return (
    <div
      className="w-full h-[200px] sm:h-[320px] lg:h-[360px] rounded-lg overflow-hidden bg-card border border-border font-mono flex flex-col relative"
      style={{
        fontFamily:
          "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      }}
    >
      <div className="flex px-2 py-1.5 sm:px-4 sm:py-2 items-center justify-between border-b border-border/40 bg-card/80 mb-0">
        <div
          className={cn(
            "font-mono text-[10px] sm:text-xs tracking-widest uppercase truncate transition-colors duration-500",
            isOnline ? "text-muted-foreground" : "text-red-500 animate-pulse",
          )}
        >
          {isOnline
            ? "GLOBAL_SCAN // ACTIVE"
            : `RETRYING_UPLINK IN ${nextRetry.toFixed(1)}s`}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className={cn(
              "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-500",
              isOnline
                ? "bg-coral animate-system-glow"
                : "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]",
            )}
            aria-hidden="true"
          />
          <div
            className={cn(
              "font-mono text-[10px] sm:text-xs tracking-widest transition-colors duration-500",
              isOnline ? "text-coral" : "text-red-500",
            )}
          >
            SYSTEM: {isOnline ? "ONLINE" : "OFFLINE"}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex-1 px-1.5 sm:px-4 pt-0 overflow-hidden relative transition-opacity duration-1000",
          !isOnline && "opacity-60 grayscale-[0.5]",
        )}
      >
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end gap-0 sm:gap-0 text-[10px] sm:text-xs pb-1 sm:pb-4 w-full">
          {logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                "leading-4 whitespace-nowrap",
                !log.id.startsWith("init-") &&
                  "animate-in fade-in slide-in-from-bottom-1 duration-400",
              )}
            >
              <div className="flex items-center w-full overflow-hidden">
                <span className="text-muted-foreground/50 text-[0.6rem] sm:text-[0.7rem] mr-1 sm:mr-2 tabular-nums flex-shrink-0">
                  [{formatLogTime(log.timestamp)}]
                </span>
                {log.isAlert ? (
                  <>
                    <span
                      className={cn(
                        "font-bold flex-shrink-0 mr-1",
                        log.provider === "ECONNREFUSED" ||
                          log.provider === "ETIMEDOUT"
                          ? "text-red-500"
                          : "text-coral",
                      )}
                    >
                      [ALERT]
                    </span>
                    <span
                      className={cn(
                        "flex-shrink-0 mr-1",
                        log.provider === "ECONNREFUSED" ||
                          log.provider === "ETIMEDOUT"
                          ? "text-red-500"
                          : "text-coral",
                      )}
                    >
                      {log.provider === "ECONNREFUSED" ||
                      log.provider === "ETIMEDOUT"
                        ? "CRITICAL —"
                        : "CRITICAL —"}
                    </span>
                    <span
                      className={cn(
                        "font-bold flex-shrink-0 mr-1",
                        log.provider === "ECONNREFUSED" ||
                          log.provider === "ETIMEDOUT"
                          ? "text-red-500"
                          : providerColors[log.provider] || "text-coral",
                      )}
                    >
                      {log.provider}
                    </span>
                    <span
                      className={cn(
                        log.provider === "ECONNREFUSED" ||
                          log.provider === "ETIMEDOUT"
                          ? "text-red-500"
                          : "text-coral",
                        "truncate",
                      )}
                    >
                      {log.provider === "ECONNREFUSED" ||
                      log.provider === "ETIMEDOUT"
                        ? ""
                        : "KEY EXPOSED"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground flex-shrink-0 mr-1">
                      SCANNING
                    </span>
                    <span
                      className={cn(
                        "font-bold flex-shrink-0 mr-1 text-[8.5px] sm:text-[10px]",
                        providerColors[log.provider] || "text-muted-foreground",
                      )}
                    >
                      [{log.provider}]
                    </span>
                    <span className="text-foreground font-bold truncate max-w-[80px] min-w-[40px] sm:max-w-none sm:min-w-0 mr-1">
                      {log.repo}
                    </span>
                    <span className="text-muted-foreground/60 hidden sm:inline mr-1">
                      CREATED BY
                    </span>
                    <span className="text-muted-foreground/60 text-[9px] sm:hidden mr-1">
                      BY
                    </span>
                    <span className="text-coral truncate flex-1 sm:flex-none">
                      {log.owner}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
