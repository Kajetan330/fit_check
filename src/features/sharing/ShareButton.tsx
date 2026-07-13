import { Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({ title, text, url }: { title: string; text: string; url: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const share = async () => {
    setStatus("idle");
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Native share can be cancelled by the user; fall back only when copy is explicitly requested below.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className="share-control">
      <button className="button light small" type="button" onClick={share}>
        <Share2 size={16} />
        Share
      </button>
      {status === "copied" ? <span>Link copied</span> : null}
      {status === "failed" ? (
        <label>
          Copy link
          <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
        </label>
      ) : null}
    </div>
  );
}
