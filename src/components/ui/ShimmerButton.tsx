import type { ReactNode } from "react";

export function ShimmerButton({ children, onClick, title }: {
  children: ReactNode; onClick?: () => void; title?: string;
}) {
  return (
    <button className="shimmer-btn" onClick={onClick} title={title}>
      <div className="spark"><div className="spark-inner"><div className="spark-rotate" /></div></div>
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
      <div className="shimmer-highlight" />
      <div className="shimmer-bg" />
    </button>
  );
}
