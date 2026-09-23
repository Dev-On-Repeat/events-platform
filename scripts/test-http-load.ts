/**
 * Real-World HTTP Load Testing Harness
 * 
 * Simulates high-concurrency HTTP network traffic against the deployed application or local server.
 * Measures: Requests/sec (RPS), status code breakdown, socket errors, timeouts, and latency percentiles (p50, p95, p99).
 * 
 * Usage:
 *   npx tsx scripts/test-http-load.ts [targetUrl] [concurrency] [totalRequests]
 * 
 * Example:
 *   npx tsx scripts/test-http-load.ts http://localhost:3000 50 1000
 *   npx tsx scripts/test-http-load.ts https://staging.yourdomain.com 100 3000
 */

import { performance } from "perf_hooks";

const TARGET_URL = process.argv[2] || process.env.TARGET_URL || "http://localhost:3000";
const CONCURRENCY = parseInt(process.argv[3] || "50", 10);
const TOTAL_REQUESTS = parseInt(process.argv[4] || "500", 10);

interface RequestResult {
  statusCode: number;
  durationMs: number;
  error?: string;
}

function calculatePercentiles(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
  const min = sorted[0] || 0;
  const max = sorted[sorted.length - 1] || 0;
  const mean = sorted.reduce((acc, v) => acc + v, 0) / (sorted.length || 1);
  return { min, max, mean, p50, p95, p99 };
}

async function sendRequest(url: string, endpoint: string): Promise<RequestResult> {
  const target = `${url}${endpoint}`;
  const t0 = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": "HackB4-LoadTester/1.0",
        Accept: "text/html,application/json,*/*",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    // Drain body stream
    await res.arrayBuffer();

    const t1 = performance.now();
    return {
      statusCode: res.status,
      durationMs: t1 - t0,
    };
  } catch (err: any) {
    const t1 = performance.now();
    return {
      statusCode: 0,
      durationMs: t1 - t0,
      error: err.name === "AbortError" ? "TIMEOUT (10s)" : err.message || "CONN_ERROR",
    };
  }
}

async function runHttpBenchmark() {
  console.log("===============================================================================");
  console.log("⚡ REAL-WORLD HTTP LOAD TESTING BENCHMARK");
  console.log("===============================================================================");
  console.log(`Target Base URL:       ${TARGET_URL}`);
  console.log(`Concurrent Workers:    ${CONCURRENCY}`);
  console.log(`Total Requests Target: ${TOTAL_REQUESTS}`);
  console.log(`Target Endpoints:      /events, /events/hacksphere-2026, /`);
  console.log("-------------------------------------------------------------------------------\n");

  const endpoints = ["/events", "/events/hacksphere-2026", "/"];
  const results: RequestResult[] = [];
  let completed = 0;

  const tStart = performance.now();
  let nextReqIndex = 0;

  // Worker pool
  async function worker(workerId: number) {
    while (nextReqIndex < TOTAL_REQUESTS) {
      const idx = nextReqIndex++;
      const endpoint = endpoints[idx % endpoints.length];
      const result = await sendRequest(TARGET_URL, endpoint);
      results.push(result);
      completed++;

      if (completed % 100 === 0 || completed === TOTAL_REQUESTS) {
        process.stdout.write(`\r[Progress] Completed ${completed} / ${TOTAL_REQUESTS} HTTP requests...`);
      }
    }
  }

  // Launch concurrent workers
  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);

  const tEnd = performance.now();
  const totalDurationSec = (tEnd - tStart) / 1000;
  const rps = (results.length / totalDurationSec).toFixed(1);

  console.log("\n\n===============================================================================");
  console.log("📊 BENCHMARK METRICS SUMMARY");
  console.log("===============================================================================");

  const statusCounts = new Map<number, number>();
  const errorCounts = new Map<string, number>();
  const latencies = results.map((r) => r.durationMs);

  for (const r of results) {
    statusCounts.set(r.statusCode, (statusCounts.get(r.statusCode) || 0) + 1);
    if (r.error) {
      errorCounts.set(r.error, (errorCounts.get(r.error) || 0) + 1);
    }
  }

  const { min, max, mean, p50, p95, p99 } = calculatePercentiles(latencies);
  const successCount = (statusCounts.get(200) || 0) + (statusCounts.get(307) || 0) + (statusCounts.get(308) || 0);
  const successRate = ((successCount / results.length) * 100).toFixed(2);

  console.log(`Total Requests Sent:    ${results.length}`);
  console.log(`Total Time Elapsed:     ${totalDurationSec.toFixed(2)} seconds`);
  console.log(`Throughput (RPS):       ${rps} requests/sec`);
  console.log(`Success Rate:           ${successRate}% (${successCount}/${results.length})`);
  console.log("\nLatency Distribution:");
  console.log(`  - Minimum:            ${min.toFixed(2)} ms`);
  console.log(`  - Mean / Average:     ${mean.toFixed(2)} ms`);
  console.log(`  - 50th Percentile:    ${p50.toFixed(2)} ms (p50)`);
  console.log(`  - 95th Percentile:    ${p95.toFixed(2)} ms (p95)`);
  console.log(`  - 99th Percentile:    ${p99.toFixed(2)} ms (p99)`);
  console.log(`  - Maximum:            ${max.toFixed(2)} ms`);

  console.log("\nHTTP Status Breakdown:");
  for (const [code, count] of statusCounts.entries()) {
    const label = code === 0 ? "Network Error / Timeout" : `HTTP ${code}`;
    const pct = ((count / results.length) * 100).toFixed(1);
    console.log(`  - ${label.padEnd(25)}: ${count} (${pct}%)`);
  }

  if (errorCounts.size > 0) {
    console.log("\nConnection Errors / Failure Reasons:");
    for (const [err, count] of errorCounts.entries()) {
      console.log(`  - ${err.padEnd(25)}: ${count}`);
    }
  }

  console.log("\n===============================================================================");
  if (successCount === results.length) {
    console.log("✅ VERDICT: 100% OF REAL HTTP REQUESTS SERVED CLEANLY WITHOUT ERRORS");
  } else if (Number(successRate) > 95) {
    console.log("🟡 VERDICT: ACCEPTABLE INGRESS (Minor dropouts under burst saturation)");
  } else {
    console.log("🔴 VERDICT: BOTTLENECK DETECTED (High failure rate under ingress load)");
  }
  console.log("===============================================================================\n");
}

runHttpBenchmark().catch((err) => {
  console.error("Benchmark runner encountered fatal error:", err);
  process.exit(1);
});
