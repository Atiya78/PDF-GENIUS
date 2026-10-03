import { Link } from "wouter";
import { ArrowRight, Code2, MousePointerClick, Upload, Download } from "lucide-react";
import { toolConfigs } from "@/lib/toolConfig";
import { homeFaq } from "@/config/homeFaq";

const linkText = "text-[#c62d27] font-medium underline-offset-2 hover:underline";

export const HowItWorksSection = (): JSX.Element => {
  const steps = [
    { icon: MousePointerClick, title: "Choose a tool", text: "Pick one from the list, or select a file above and we'll show the tools that fit it." },
    { icon: Upload, title: "Upload your file", text: "Add your file. No account is needed for the web tools." },
    { icon: Download, title: "Download the result", text: "Save the finished file to your device." },
  ];
  return (
    <section className="w-full bg-gray-50 py-14 sm:py-16" aria-labelledby="how-heading">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="how-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#d92f29] font-bold text-white" aria-hidden="true">{i + 1}</span>
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <s.icon className="h-5 w-5 text-[#c62d27]" aria-hidden="true" /> {s.title}
                </h3>
                <p className="mt-1 text-gray-600 leading-7">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

const GROUPS: { title: string; categories: string[] }[] = [
  { title: "Convert", categories: ["Convert"] },
  { title: "Organize", categories: ["Organize"] },
  { title: "Secure", categories: ["Security"] },
  { title: "Edit", categories: ["Edit"] },
  { title: "Image tools", categories: ["Image Tools", "Video Tools"] },
];

export const ToolCategoriesSection = (): JSX.Element => {
  const all = Object.values(toolConfigs);
  return (
    <section className="w-full bg-white py-14 sm:py-16" aria-labelledby="categories-heading">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="categories-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">Every tool, by what you need to do</h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => {
            const tools = all.filter((t) => g.categories.includes(t.category) && t.route);
            if (tools.length === 0) return null;
            return (
              <div key={g.title} data-testid={`group-${g.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <h3 className="border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900">{g.title}</h3>
                <ul className="mt-2">
                  {tools.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={t.route as string}
                        className="flex min-h-[44px] items-center justify-between gap-2 text-gray-700 hover:text-[#c62d27]"
                        data-testid={`link-category-${t.id}`}
                      >
                        <span>{t.title}</span>
                        {t.comingSoon && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Coming soon</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const DeveloperApiSection = (): JSX.Element => (
  <section className="w-full bg-gray-900 py-14 sm:py-16 text-white" aria-labelledby="api-heading">
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-8 lg:grid-cols-2 lg:items-center">
      <div>
        <h2 id="api-heading" className="flex items-center gap-3 text-2xl sm:text-3xl font-bold">
          <Code2 className="h-7 w-7 text-[#ff8f8a]" aria-hidden="true" /> Developer API
        </h2>
        <p className="mt-4 text-gray-200 leading-7 max-w-xl">
          Run conversions from your own software with an API key. The API is a separate paid product with its own plans. Every web tool stays free.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/pricing" className="inline-flex min-h-[44px] items-center rounded-full bg-white px-6 font-medium text-gray-900 hover:bg-gray-100" data-testid="link-api-pricing">
            See API plans
          </Link>
          <Link href="/signup" className="inline-flex min-h-[44px] items-center rounded-full border border-white/40 px-6 font-medium text-white hover:bg-white/10" data-testid="link-api-signup">
            Create an account
          </Link>
        </div>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-sm leading-6 text-gray-100" tabIndex={0} aria-label="Example API request">
{`curl -X POST "https://pdfgenius.app/api/v1/word_to_pdf" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@document.docx" \\
  -o converted.pdf`}
      </pre>
    </div>
  </section>
);

export const FaqSection = (): JSX.Element => (
  <section className="w-full bg-white py-14 sm:py-16" aria-labelledby="faq-heading">
    <div className="max-w-screen-md mx-auto px-4 sm:px-6 lg:px-8">
      <h2 id="faq-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">Frequently asked questions</h2>
      <div className="mt-6 divide-y divide-gray-200 border-y border-gray-200">
        {homeFaq.map((f, i) => (
          <details key={f.question} className="group py-1" data-testid={`faq-item-${i}`}>
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
              {f.question}
              <span className="text-xl text-[#c62d27] transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="pb-4 text-gray-600 leading-7">{f.answer}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

export const FinalCtaSection = (): JSX.Element => (
  <section className="w-full bg-[#fff5f4] py-14 sm:py-16" aria-labelledby="cta-heading">
    <div className="max-w-screen-md mx-auto px-4 text-center">
      <h2 id="cta-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">Got a file to sort out?</h2>
      <p className="mt-3 text-gray-700">Pick a tool and get started. No signup needed.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/tools" className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#d92f29] px-8 font-semibold text-white hover:opacity-90" data-testid="link-cta-tools">
          Browse all tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href="/pricing" className={`inline-flex min-h-[48px] items-center px-4 ${linkText}`} data-testid="link-cta-pricing">
          Developer API pricing
        </Link>
      </div>
    </div>
  </section>
);
