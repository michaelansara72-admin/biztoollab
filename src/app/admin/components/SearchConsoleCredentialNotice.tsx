import { searchConsoleCredentialNotice } from "@/lib/googleSearchConsoleLocalRefreshInstall";

export default function SearchConsoleCredentialNotice({
  googleFlag,
}: {
  googleFlag?: string;
}) {
  const notice = searchConsoleCredentialNotice(googleFlag);

  if (!notice) {
    return null;
  }

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
        Search Console credentials
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-700">
        {notice}
      </p>
    </section>
  );
}
