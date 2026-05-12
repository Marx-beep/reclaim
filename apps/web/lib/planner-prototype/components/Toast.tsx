interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#111827] px-4 py-3 text-[13px] font-medium text-white shadow-[0_18px_40px_rgba(15,23,42,0.3)]">
      {message}
    </div>
  );
}
