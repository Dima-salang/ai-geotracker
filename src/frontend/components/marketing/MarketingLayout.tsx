"use client";

import { SiteFooter } from "./SiteFooter";
import { SiteNavbar } from "./SiteNavbar";
import { SignInModal } from "./SignInModal";
import { useState } from "react";

type MarketingLayoutProps = {
  children: React.ReactNode;
  /** Extra classes on the outer main wrapper (below nav) */
  mainClassName?: string;
};

export function MarketingLayout({ children, mainClassName = "" }: MarketingLayoutProps) {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <SiteNavbar onSignInClick={() => setShowSignIn(true)} />
      <div className={`pt-16 min-h-screen flex flex-col ${mainClassName}`}>{children}</div>
      <SiteFooter />
      <SignInModal open={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
