export const zerodevProjectId = import.meta.env.VITE_ZERODEV_PROJECT_ID as string | undefined;

export const isZeroDevConfigured = Boolean(zerodevProjectId);

if (!zerodevProjectId) {
  console.warn(
    "[zerodev] VITE_ZERODEV_PROJECT_ID is not set — gas-sponsored bidding will not be available. " +
      "Get a project id at https://zerodev.app and add it to iceburg-ui/.env.local."
  );
}

export function zerodevBundlerUrl(chainId: number): string {
  return `https://rpc.zerodev.app/api/v3/${zerodevProjectId}/chain/${chainId}`;
}

export function zerodevPaymasterUrl(chainId: number): string {
  return `https://rpc.zerodev.app/api/v3/${zerodevProjectId}/chain/${chainId}`;
}
