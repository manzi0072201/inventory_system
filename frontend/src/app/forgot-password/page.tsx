import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Recover password",
};

export default function ForgotPasswordPage() {
  return (
    <main className="login-page login-page-single">
      <section className="login-card" aria-label="Password recovery">
        <div className="login-card-inner">
          <div className="login-card-head">
            <div className="login-logo">
              <Icon name="lock" className="w-6 h-6" strokeWidth={2.4} />
            </div>
            <h1>Recover your password</h1>
            <p className="login-card-sub">Admin-assisted password recovery</p>
          </div>

          <div className="login-recovery">
            <p>
              Password resets are managed by your system administrator. Contact
              them with the email address linked to your account and they will
              reset it for you.
            </p>
            <ul>
              <li>Use the email address you sign in with.</li>
              <li>Your administrator will share the new password with you.</li>
              <li>Sign in again once your password has been reset.</li>
            </ul>
          </div>

          <Link href="/login" className="login-submit login-back">
            <Icon name="arrowLeft" />
            Back to sign in
          </Link>

          <div className="login-card-foot">
            <span>© 2026</span>
            <span>All rights reserved</span>
          </div>
        </div>
      </section>
    </main>
  );
}
