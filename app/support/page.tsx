import { LegalPageShell } from "@/components/legal-page-shell";
import { getSupportEmail } from "@/lib/billing";

export default function SupportPage() {
  const supportEmail = getSupportEmail();

  return (
    <LegalPageShell
      eyebrow="Support"
      title="Support and account help"
      summary="Use this page when a member needs help with login, password reset, membership access, or media/programming issues inside Ravqen."
    >
      <div>
        <h2 className="text-lg font-semibold text-white">Member account help</h2>
        <p>
          If you cannot log in, first try the password reset option on the login page. If your
          account has not been provisioned yet, ask your admin to create your member record or send
          you a reset link.
        </p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Membership and access</h2>
        <p>
          Session availability is controlled by your membership tier, weekly allowance, session
          credits, and category access. If a workout is blocked unexpectedly, contact your admin so
          they can review your account settings.
        </p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Operator support</h2>
        <p>
          For launch, billing, media library, or scheduling support, reach out at{" "}
          <a className="font-semibold text-cyan-100" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          .
        </p>
      </div>
    </LegalPageShell>
  );
}
