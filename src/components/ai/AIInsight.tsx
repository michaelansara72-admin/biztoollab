type AIInsightProps = {
  label: string;
  text: string;
};

export default function AIInsight({
  label,
  text,
}: AIInsightProps) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900">
        {label}
      </h4>

      <p className="mt-1 text-sm leading-6 text-slate-600">
        {text}
      </p>
    </div>
  );
}