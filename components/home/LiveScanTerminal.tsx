"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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

type TerminalLog = { id: string; owner: string; repo: string; timestamp: Date };

const formatLogTime = (date: Date): string => {
  return new Intl.DateTimeFormat(navigator.language, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
};

function pickRandomSample(): { owner: string; repo: string } {
  const fullName = REAL_DATA_SAMPLES[Math.floor(Math.random() * REAL_DATA_SAMPLES.length)];
  const [owner, repo] = fullName.split("/");
  return { owner: owner || "unknown", repo: repo || "unknown" };
}

export const LiveScanTerminal = React.memo(function LiveScanTerminal() {
  const [logs, setLogs] = useState<TerminalLog[]>(() => {
    const initialCount = 26;
    return Array.from({ length: initialCount }).map((_, i) => {
      const { owner, repo } = pickRandomSample();
      return { id: `init-${i}`, owner, repo, timestamp: new Date() };
    });
  });
  const tickRef = useRef(26);


  useEffect(() => {
    const appendLog = () => {
      tickRef.current += 1;

      const { owner, repo } = pickRandomSample();
      const next: TerminalLog = { 
        id: `${Date.now()}-${tickRef.current}`, 
        owner, 
        repo, 
        timestamp: new Date() 
      };

      setLogs((prev) => {
        const nextLogs = [...prev, next];
        const MAX_LOGS = 26;
        return nextLogs.slice(-MAX_LOGS);
      });
    };

    appendLog();
    const intervalId = window.setInterval(appendLog, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className="w-full h-[150px] sm:h-[320px] lg:h-[360px] rounded-lg overflow-hidden bg-card border border-border font-mono flex flex-col relative"
      style={{
        fontFamily:
          "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      }}
    >
      <div className="hidden lg:flex px-4 py-2 items-center justify-between border-b border-border/40 bg-card/80 mb-0">
        <div className="font-mono text-[10px] sm:text-xs text-muted-foreground tracking-widest uppercase truncate">
          GLOBAL_SCAN // ACTIVE
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-coral shadow-[0_0_8px_hsl(var(--coral)/0.6)]" aria-hidden="true" />
          <div className="text-coral text-xs font-mono tracking-wider">
            SYSTEM: ONLINE
          </div>
        </div>
      </div>

      <div className="flex-1 px-2 sm:px-4 pt-0 overflow-hidden relative">
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end gap-0.5 sm:gap-0 text-[10px] sm:text-xs pb-2 sm:pb-4 w-full">
          {logs.map((log) => (
            <div
              key={log.id}
              className={cn(
                "leading-4 whitespace-nowrap",
                !log.id.startsWith("init-") && "animate-in fade-in slide-in-from-bottom-1 duration-400",
              )}
            >
              <div className="flex items-center w-full overflow-hidden">
                <span className="text-muted-foreground/50 text-[0.65rem] sm:text-[0.7rem] mr-1.5 sm:mr-2 tabular-nums flex-shrink-0">
                  [{formatLogTime(log.timestamp)}]
                </span>
                <span className="text-muted-foreground flex-shrink-0 mr-1">SCANNING</span>
                <span className="text-foreground font-bold truncate max-w-[80px] min-w-[40px] sm:max-w-none sm:min-w-0 mr-1">{log.repo}</span>
                <span className="text-muted-foreground/60 hidden sm:inline mr-1">CREATED BY</span>
                <span className="text-muted-foreground/60 text-[9px] sm:hidden mr-1">BY</span>
                <span className="text-coral truncate flex-1 sm:flex-none">{log.owner}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});


