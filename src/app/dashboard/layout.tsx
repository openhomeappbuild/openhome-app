import { NavLinks } from "./nav-links";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 bg-[#f2f4f7] text-[#1c2530]">
      <div className="flex w-[260px] flex-shrink-0 flex-col bg-[#0a0a0a] text-[#c6d2de]">
        <div className="border-b border-white/[0.08] px-4 pb-4 pt-5">
          <b className="flex items-center gap-2 text-base text-white">
            <span className="h-2 w-2 rounded-full bg-white" />
            Open Home App
          </b>
          <span className="mt-0.5 block text-[11px] tracking-wide text-[#8296ab]">
            AGENT WORKSPACE
          </span>
        </div>
        <NavLinks />
        <div className="m-2.5 flex items-center gap-2.5 rounded-[10px] bg-white/[0.06] p-3 text-xs">
          <div className="h-9 w-9 flex-shrink-0 rounded-full bg-white/20" />
          <div>
            <b className="block text-[13px] text-white">Chris Campbell</b>
            <span className="text-[#8296ab]">Bayleys Queenstown</span>
          </div>
        </div>
      </div>
      <div className="max-w-[1150px] flex-1 px-8 py-6 pb-16">{children}</div>
    </div>
  );
}
