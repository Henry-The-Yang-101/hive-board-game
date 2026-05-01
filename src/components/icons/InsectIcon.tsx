import { PieceType } from "@/game/types";

type Props = { type: PieceType; className?: string };

export function InsectIcon({ type, className }: Props) {
  const stroke = "currentColor";
  if (type === "queen") {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth="1.8"><path d="M4 18h16l-2-8-4 4-2-6-2 6-4-4-2 8Z" /><path d="M7 20h10" /></svg>;
  }
  if (type === "ant") {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth="1.8"><circle cx="7" cy="12" r="2.5" /><circle cx="12" cy="12" r="3" /><circle cx="17" cy="12" r="2.5" /><path d="M4 9 2 7m2 8-2 2m18-8 2-2m-2 8 2 2" /></svg>;
  }
  if (type === "spider") {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth="1.8"><circle cx="12" cy="13" r="3.5" /><path d="M7 10 3 8m7-1L6 4m8 3 4-3m-1 6 4-2M8 15l-4 2m7 1-4 3m10-6 4 2m-7 1 4 3" /></svg>;
  }
  if (type === "beetle") {
    return <svg viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth="1.8"><path d="M12 5v14" /><ellipse cx="12" cy="12" rx="5.5" ry="7.5" /><path d="M8 9h8M8 15h8M9 5 7 3m8 2 2-2" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke={stroke} strokeWidth="1.8"><path d="m4 12 5-3 5 3 5-3" /><path d="m4 14 5-3 5 3 5-3" /><path d="M9 9V5m5 7V8m5 1V5" /></svg>;
}
