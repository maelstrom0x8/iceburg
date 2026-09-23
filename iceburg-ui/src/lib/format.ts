const SECONDS_PER_DAY = 86_400n;
const SECONDS_PER_HOUR = 3_600n;
const SECONDS_PER_MINUTE = 60n;

export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatCountdown(deadline: bigint | number): string {
  const deadlineSeconds = typeof deadline === "bigint" ? deadline : BigInt(Math.trunc(deadline));
  const nowSeconds = BigInt(Math.floor(Date.now() / 1000));

  if (deadlineSeconds <= nowSeconds) return "Ended";

  let remaining = deadlineSeconds - nowSeconds;

  const days = remaining / SECONDS_PER_DAY;
  remaining %= SECONDS_PER_DAY;
  const hours = remaining / SECONDS_PER_HOUR;
  remaining %= SECONDS_PER_HOUR;
  const minutes = remaining / SECONDS_PER_MINUTE;
  const seconds = remaining % SECONDS_PER_MINUTE;

  if (days > 0n) return `${days}d ${hours}h`;
  if (hours > 0n) return `${hours}h ${minutes}m`;
  if (minutes > 0n) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export interface FormatAmountOptions {
  suffix?: string;
}

export function formatAmount(value: bigint, opts: FormatAmountOptions = {}): string {
  const grouped = value.toLocaleString("en-US");
  return opts.suffix ? `${grouped} ${opts.suffix}` : grouped;
}

export function formatPrice(value: bigint, decimals: number): string {
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new RangeError(`decimals must be a non-negative integer, got ${decimals}`);
  }

  const negative = value < 0n;
  const absValue = negative ? -value : value;
  const sign = negative ? "-" : "";

  if (decimals === 0) {
    return `${sign}${absValue.toLocaleString("en-US")}`;
  }

  const divisor = 10n ** BigInt(decimals);
  const whole = absValue / divisor;
  const fraction = absValue % divisor;

  const wholeStr = whole.toLocaleString("en-US");
  const fractionStr = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");

  return fractionStr.length > 0 ? `${sign}${wholeStr}.${fractionStr}` : `${sign}${wholeStr}`;
}

export function formatTimestamp(seconds: bigint | number): string {
  const secs = typeof seconds === "bigint" ? Number(seconds) : seconds;
  return new Date(secs * 1000).toLocaleString();
}
