import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="ks-auth-page">
      <aside className="ks-auth-aside ks-auth-showcase" aria-label="Welcome">
        <div className="ks-auth-showcase-body">
          <span className="ks-auth-eyebrow">Your workspace, simplified</span>
          <h2>Your entire business, in sync.</h2>
          <p>
            Monitor stock levels, record sales fast, and grow with confidence.
            All in one place.
          </p>
        </div>
      </aside>

      <section className="ks-auth-main">
        <div className="ks-auth-inner">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
