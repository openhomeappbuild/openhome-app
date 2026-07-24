export function Stat({ n, l, d }: { n: number | string; l: string; d?: string }) {
  return (
    <div className="border-t-2 border-[#14130f] pt-3">
      <div className="font-display text-[38px] leading-none tabular-nums text-[#14130f]">{n}</div>
      <div className="mt-2.5 text-[11px] uppercase tracking-[0.08em] text-[#837c6c]">{l}</div>
      {d && <div className="mt-1.5 text-[11px] font-semibold text-[#2f6f4e]">{d}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#e7e2d4] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-[16px] font-semibold text-[#14130f]">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="text-sm text-[#837c6c]">{text}</p>;
}

const PILL_TONES: Record<string, string> = {
  green: "bg-[#e7f0ea] text-[#2f6f4e]",
  grey: "bg-[#f3f1ea] text-[#837c6c]",
  slate: "bg-[#e9ede9] text-[#33403c]",
  red: "bg-[#f6e4e1] text-[#b23b2e]",
  amber: "bg-[#f6ecd9] text-[#a9761f]",
};

export function Pill({
  tone,
  children,
}: {
  tone: keyof typeof PILL_TONES;
  children: React.ReactNode;
}) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${PILL_TONES[tone]}`}>
      {children}
    </span>
  );
}
