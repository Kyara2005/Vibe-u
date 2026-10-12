import { useEffect, useState } from "react";
import { Feed } from "../UserDashboard";
import Recommendations from "../../../components/recommendations/Recommendations";

const sanitizeQuoteText = (text = "") =>
  String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const FeedView = () => {
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    const loadQuote = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/usuarios/frase`);
        const data = await res.json();
        const cleanQuote = sanitizeQuoteText(data?.q || "");
        const cleanAuthor = sanitizeQuoteText(data?.a || "");
        if (cleanQuote) setQuote({ q: cleanQuote, a: cleanAuthor });
      } catch {
        setQuote(null);
      }
    };

    loadQuote();
  }, []);

  return (
    <section className="view__dash feed_view__dash">
      <section className="panel__dash">
        <h3>Bienvenidos</h3>
        {quote ? (
          <p className="feed_quote__dash">
            "{quote.q}" {quote.a ? `- ${quote.a}` : ""}
          </p>
        ) : null}
      </section>
      <Recommendations variant="hub" />
      <Feed />
    </section>
  );
};

export default FeedView;
