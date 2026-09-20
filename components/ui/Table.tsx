import { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-left text-body-sm font-body-sm">{children}</table>
    </div>
  );
}
export function TableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-container-low text-on-surface-variant text-label-sm font-label-sm">{children}</thead>;
}
export function TableRow({ children, striped = false }: { children: ReactNode; striped?: boolean }) {
  return <tr className={`border-t border-outline-variant ${striped ? "even:bg-surface-container-low" : ""}`}>{children}</tr>;
}
export function TableCell({ children, header = false, className = "" }: { children: ReactNode; header?: boolean; className?: string }) {
  const Tag = header ? "th" : "td";
  return <Tag className={`px-space-md py-[10px] ${className}`}>{children}</Tag>;
}
