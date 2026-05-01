import { APP_VERSION } from "./version";

interface Download {
  label: string;
  url: string;
}

interface Props {
  latestVersion: string;
  downloads: Download[];
}

export default function UpdateOverlay({ latestVersion, downloads }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl border border-primary/30">
        <div className="card-body items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold">Update Required</h2>

          <div className="space-y-1 text-sm text-base-content/70">
            <p>
              Your version{" "}
              <span className="font-mono font-semibold text-error">{APP_VERSION}</span>
              {" "}is out of date.
            </p>
            <p>
              Latest version:{" "}
              <span className="font-mono font-semibold text-success">{latestVersion}</span>
            </p>
          </div>

          <p className="text-sm text-base-content/50">
            Download the latest version for your distribution:
          </p>

          <div className="flex flex-col gap-2 w-full max-w-[250px]">
            {downloads.length > 0 ? (
              downloads.map((d) => (
                <a
                  key={d.label}
                  href={d.url}
                  className="btn btn-primary btn-sm"
                  target="_blank"
                  rel="noreferrer"
                >
                  {d.label}
                </a>
              ))
            ) : (
              <p className="text-xs text-base-content/40">
                Check the website for the latest version.
              </p>
            )}
          </div>

          <p className="text-xs text-base-content/30 mt-2">
            Your data will be preserved after the update.
          </p>
        </div>
      </div>
    </div>
  );
}
