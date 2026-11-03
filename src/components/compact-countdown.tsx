import { useEffect, useState } from "react";
import { usePlanning } from "../app/context.tsx";
import { countdown, formatDate } from "../domain/planning.ts";
import { Icon } from "./ui.tsx";
export function CompactCountdown() {
  const { plan } = usePlanning();
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const count = countdown(plan.settings, clock);
  return (
    <span
      className="compact-countdown"
      aria-label={`Contagem regressiva: ${count.days} dias para ${formatDate(plan.settings.weddingDate, true)}`}
    >
      <Icon name="heart" />
      <b>{count.days} dias</b>
      <span>para o nosso sim</span>
      <small>{formatDate(plan.settings.weddingDate, true)}</small>
    </span>
  );
}
