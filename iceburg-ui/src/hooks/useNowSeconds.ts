import { useEffect, useState } from "react";

function currentSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

export function useNowSeconds(): bigint {
  const [now, setNow] = useState(currentSeconds);

  useEffect(() => {
    const id = setInterval(() => setNow(currentSeconds()), 1_000);
    return () => clearInterval(id);
  }, []);

  return now;
}
