export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startIvrScheduler } = await import("./lib/ivr/scheduler");
    startIvrScheduler();
  }
}
