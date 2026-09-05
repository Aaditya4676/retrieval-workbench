const base = process.env.DATA_SERVICE_URL ?? "http://127.0.0.1:3301";
export async function dataRequest<T>(
  endpoint: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${base}${endpoint}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(endpoint === "/ingest" && process.env.INGEST_TOKEN
        ? { Authorization: `Bearer ${process.env.INGEST_TOKEN}` }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `Data service returned ${response.status}. Check the configured service and ingestion authorization.`,
    );
  return response.json();
}
