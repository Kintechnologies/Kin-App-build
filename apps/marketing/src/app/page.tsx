import Link from "next/link";

export default function Home() {
  return (
    <main style={{ backgroundColor: "var(--background)", color: "var(--text)" }}>
      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 2rem",
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="20" r="8" fill="#7CB87A" />
            <circle cx="21.75" cy="37.9" r="9" fill="#7CB87A" />
            <circle cx="42.25" cy="37.9" r="9" fill="#7CB87A" />
          </svg>
          <span style={{ fontSize: "1.25rem", fontWeight: 600 }}>Kin</span>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/privacy">
            <span style={{ color: "var(--text2)", cursor: "pointer" }}>Privacy</span>
          </Link>
          <Link href="/terms">
            <span style={{ color: "var(--text2)", cursor: "pointer" }}>Terms</span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          padding: "6rem 2rem",
          textAlign: "center",
          backgroundColor: "var(--background)",
        }}
      >
        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 700,
            marginBottom: "1.5rem",
            lineHeight: 1.2,
          }}
        >
          Stop keeping your family schedule in your head
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "var(--text2)",
            marginBottom: "3rem",
            maxWidth: "600px",
            margin: "0 auto 3rem",
          }}
        >
          Kin is the family AI that takes care of scheduling. Never miss a pickup, appointment, or family moment again.
        </p>
        <div style={{ maxWidth: "500px", margin: "0 auto 3rem" }}>
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              minHeight: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "fadeIn 0.6s ease-in-out",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: "1rem",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              >
                💬
              </div>
              <p style={{ color: "var(--text2)", fontSize: "0.875rem" }}>
                "Your partner's meeting is running late. You're on for pickup at 3pm."
              </p>
            </div>
          </div>
        </div>
        <button
          style={{
            backgroundColor: "var(--green)",
            color: "var(--background)",
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 200ms ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Get early access
        </button>
      </section>

      {/* Relatability */}
      <section
        style={{
          padding: "4rem 2rem",
          backgroundColor: "var(--surface)",
          marginTop: "2rem",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "2rem",
              textAlign: "center",
            }}
          >
            You're keeping track of everything.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            {["pickup", "dinner", "bedtime", "your meetings", "your partner's meetings", "and everything in between"].map(
              (item) => (
                <div
                  key={item}
                  style={{
                    backgroundColor: "var(--background)",
                    padding: "1rem",
                    borderRadius: "0.375rem",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                    fontSize: "0.875rem",
                  }}
                >
                  {item}
                </div>
              )
            )}
          </div>
          <p
            style={{
              fontSize: "1.125rem",
              fontStyle: "italic",
              color: "var(--text2)",
              textAlign: "center",
              marginBottom: "1.5rem",
            }}
          >
            And somehow… it still falls through sometimes.
          </p>
          <p
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              textAlign: "center",
              color: "var(--green)",
            }}
          >
            Kin takes that off your plate.
          </p>
        </div>
      </section>

      {/* Outcome Cards */}
      <section
        style={{
          padding: "4rem 2rem",
          backgroundColor: "var(--background)",
          marginTop: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "3rem",
            textAlign: "center",
          }}
        >
          What Kin does for you
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {[
            {
              title: "Knows when things don't line up",
              description: "Your partner's meeting runs late — you've got pickup.",
            },
            {
              title: "Catches tight schedules before they break",
              description: "Back-to-back until 6, then pickup — tight stretch.",
            },
            {
              title: "Adapts when plans change",
              description: "Your 3pm cleared — you're back on for pickup.",
            },
            {
              title: "Closes the loop",
              description: "Pickup's sorted — you're clear for the evening.",
            },
          ].map((card, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "var(--surface)",
                padding: "1.5rem",
                borderRadius: "0.5rem",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                  color: "var(--green)",
                }}
              >
                {card.title}
              </h3>
              <p style={{ color: "var(--text2)", fontSize: "0.875rem" }}>
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Different */}
      <section
        style={{
          padding: "4rem 2rem",
          backgroundColor: "var(--surface)",
          marginTop: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "2rem",
            }}
          >
            Most tools show you your schedule. Kin tells you what it means.
          </h2>
          <p
            style={{
              fontSize: "1rem",
              color: "var(--text2)",
              lineHeight: 1.6,
            }}
          >
            It figures out who needs to act, what actually matters, and when you need to know. So you don't have to
            think about it.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section
        style={{
          padding: "4rem 2rem",
          backgroundColor: "var(--background)",
          marginTop: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "3rem",
            textAlign: "center",
          }}
        >
          What parents are saying
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          {[
            "It's the first time I haven't had to double check everything.",
            "I didn't realize how much I was keeping in my head.",
            "It just… tells me what I need to know.",
          ].map((quote, idx) => (
            <div
              key={idx}
              style={{
                paddingLeft: "1.5rem",
                borderLeft: "4px solid var(--green)",
                color: "var(--text2)",
                fontSize: "1rem",
                fontStyle: "italic",
              }}
            >
              "{quote}"
              <p
                style={{
                  marginTop: "0.75rem",
                  color: "var(--text3)",
                  fontStyle: "normal",
                  fontSize: "0.875rem",
                }}
              >
                — {idx === 0 ? "Parent of 2" : idx === 1 ? "Parent of 3" : "Working parent"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "4rem 2rem",
          backgroundColor: "var(--surface)",
          marginTop: "2rem",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: 600,
            marginBottom: "2rem",
          }}
        >
          One less thing to think about — every day.
        </h2>
        <form
          style={{
            display: "flex",
            gap: "0.5rem",
            maxWidth: "400px",
            margin: "0 auto",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <input
            type="email"
            placeholder="your@email.com"
            required
            style={{
              flex: "1 1 200px",
              padding: "0.75rem 1rem",
              borderRadius: "0.375rem",
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--text)",
              fontSize: "0.875rem",
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: "var(--green)",
              color: "var(--background)",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.375rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Get early access
          </button>
        </form>
      </section>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "var(--background)",
          borderTop: "1px solid var(--border)",
          padding: "2rem",
          marginTop: "4rem",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="20" r="8" fill="#7CB87A" />
              <circle cx="21.75" cy="37.9" r="9" fill="#7CB87A" />
              <circle cx="42.25" cy="37.9" r="9" fill="#7CB87A" />
            </svg>
            <span style={{ fontSize: "1.125rem", fontWeight: 600 }}>Kin</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            <Link href="/privacy">
              <span style={{ color: "var(--text2)", cursor: "pointer" }}>Privacy</span>
            </Link>
            <span style={{ color: "var(--text3)" }}>·</span>
            <Link href="/terms">
              <span style={{ color: "var(--text2)", cursor: "pointer" }}>Terms</span>
            </Link>
            <span style={{ color: "var(--text3)" }}>·</span>
            <a href="mailto:hello@kinai.family" style={{ color: "var(--text2)" }}>
              hello@kinai.family
            </a>
          </div>
        </div>
        <div
          style={{
            marginTop: "2rem",
            paddingTop: "2rem",
            borderTop: "1px solid var(--border)",
            textAlign: "center",
            color: "var(--text3)",
            fontSize: "0.875rem",
          }}
        >
          © 2026 Kin Technologies LLC
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </main>
  );
}
