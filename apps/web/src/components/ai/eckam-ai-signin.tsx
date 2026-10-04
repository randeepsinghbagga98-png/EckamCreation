import Link from 'next/link';

type EckamAiSignInProps = {
  nextPath: string;
};

export function EckamAiSignIn({ nextPath }: EckamAiSignInProps) {
  const href = `/account/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="eckam-ai-signin">
      <p>Sign in to continue with Eckam AI.</p>
      <Link href={href} className="eckam-ai-signin-link">
        Sign in
      </Link>
    </div>
  );
}
