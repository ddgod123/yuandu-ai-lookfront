import Link from "next/link";
import SectionHeader from "@/app/admin/_components/SectionHeader";

const LINKS = [
  { href: "/admin/copyright/collections", label: "合集版权识别", desc: "按首张/5张/全量发起任务" },
  { href: "/admin/copyright/images", label: "单图版权识别", desc: "查看单图风险与证据" },
  { href: "/admin/copyright/reviews", label: "高风险待复核", desc: "提交人工复核结论" },
  { href: "/admin/copyright/tags", label: "标签管理（版权）", desc: "维护标签维度与定义" },
  { href: "/admin/copyright/tasks", label: "识别任务记录", desc: "查看任务状态与日志" },
];

export default function Page() {
  return (
    <div className="space-y-6">
      <SectionHeader title="表情包版权" description="版权风险识别 + 自动标签的一体化工作台。" />
      <div className="grid gap-4 md:grid-cols-2">
        {LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300">
            <div className="text-sm font-semibold text-slate-900">{item.label}</div>
            <div className="mt-1 text-xs text-slate-500">{item.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
