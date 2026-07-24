import { NavLinks } from "./nav-links";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 bg-[#faf8f3] text-[#14130f]">
      <div className="flex w-[250px] flex-shrink-0 flex-col bg-[#14130f] text-[#cfc9ba]">
        <div className="px-5 pb-4 pt-6">
          <b className="font-display block text-[19px] font-semibold tracking-tight text-white">
            Open Home App
          </b>
          <div className="mt-3 h-px bg-white/15" />
          <div className="mt-1 h-px bg-white/10" />
          <span className="mt-3 block text-[10.5px] uppercase tracking-[0.14em] text-[#8a8371]">
            Agent workspace
          </span>
        </div>
        <NavLinks />
        <div className="m-3 flex items-center gap-3 border-t border-white/10 px-2 pt-4 text-xs">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-[13px] text-white">
            CC
          </div>
          <div>
            <b className="block text-[13px] text-white">Chris Campbell</b>
            <span className="text-[#8a8371]">Bayleys Queenstown</span>
          </div>
        </div>
      </div>
      <div className="max-w-[1150px] flex-1 px-9 py-7 pb-16">{children}</div>
    </div>
  );
}
