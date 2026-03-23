import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-purple/5 blur-[100px] pointer-events-none" />

      <h1 className="font-serif italic text-6xl md:text-8xl text-primary mb-4 float">
        Kin
      </h1>
      <p className="text-warm-white/60 text-lg md:text-xl text-center max-w-md mb-10 float-delayed">
        Your AI-powered family operating system
      </p>
      <div className="flex gap-4 mb-6">
        <Link
          href="/signup"
          className="bg-primary text-background px-8 py-4 rounded-2xl font-medium hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          Get Started Free
        </Link>
        <Link
          href="/signin"
          className="border border-warm-white/15 text-warm-white px-8 py-4 rounded-2xl font-medium hover:border-warm-white/30 hover:shadow-md hover:shadow-black/20 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          Sign In
        </Link>
      </div>
      <Link
        href="/pricing"
        className="text-warm-white/30 text-sm hover:text-warm-white/50 transition-colors"
      >
        View pricing
      </Link>
    </main>
  );
}
