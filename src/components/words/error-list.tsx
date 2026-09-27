export function ErrorList({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <ul className="space-y-1 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
      {messages.map((message, index) => (
        <li key={index}>{message}</li>
      ))}
    </ul>
  );
}
